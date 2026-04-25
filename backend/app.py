from typing import Optional, Tuple

from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
from PIL import Image
import io
import sys
import os
from dotenv import load_dotenv
import tempfile
import re
import json
import subprocess
import uuid
import shutil
import docx
import pdfplumber
import requests

try:
    import librosa
    LIBROSA_AVAILABLE = True
except Exception as e:
    print("WARNING: librosa is not available; audio metrics will be skipped.")
    print(f"librosa error: {e}")
    librosa = None
    LIBROSA_AVAILABLE = False

try:
    import whisper
    WHISPER_MODEL_NAME = os.environ.get("WHISPER_MODEL", "small")
    print(f"Loading Whisper model: {WHISPER_MODEL_NAME}")
    whisper_model = whisper.load_model(WHISPER_MODEL_NAME)
    WHISPER_AVAILABLE = True
except Exception as e:
    print("WARNING: Whisper speech-to-text is not available or failed to load.")
    print(f"Whisper error: {e}")
    WHISPER_AVAILABLE = False
    whisper_model = None

# Load .env from project root (parent of backend/) when running from backend/
_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")
load_dotenv(_env_path)
load_dotenv()  # also allow cwd .env

# Try to import MediaPipe with error handling
try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError as e:
    print(f"ERROR: MediaPipe not installed. Please run: pip install mediapipe")
    print(f"Import error: {e}")
    MEDIAPIPE_AVAILABLE = False
    mp = None

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

# Per-interview answer audio (WAV for librosa: PCM 16-bit mono, 22050 Hz)
ANSWER_AUDIO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "answer_audio")


def _ensure_safe_session_id(raw: Optional[str]) -> Optional[str]:
    if not raw or not isinstance(raw, str):
        return None
    try:
        u = uuid.UUID(raw.strip())
        return str(u)
    except (ValueError, AttributeError):
        return None


def _webm_to_wav_librosa_friendly(webm_path: str, wav_path: str) -> bool:
    """Convert browser WebM/Opus to WAV suitable for librosa.load (pcm_s16le, mono, 22050 Hz)."""
    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                webm_path,
                "-acodec",
                "pcm_s16le",
                "-ar",
                "22050",
                "-ac",
                "1",
                wav_path,
            ],
            check=True,
            capture_output=True,
            timeout=120,
        )
        return os.path.isfile(wav_path) and os.path.getsize(wav_path) > 0
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired, OSError):
        return False


def _save_answer_audio_wav(webm_bytes: bytes, session_id: str, question_index: int) -> Tuple[Optional[str], Optional[str]]:
    """Write WebM to temp, convert to WAV, return (relative_path_from_backend_dir, error_message)."""
    os.makedirs(ANSWER_AUDIO_DIR, exist_ok=True)
    session_dir = os.path.join(ANSWER_AUDIO_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)
    safe_idx = max(0, int(question_index))
    wav_name = f"question_{safe_idx:03d}.wav"
    wav_path = os.path.join(session_dir, wav_name)

    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        tmp.write(webm_bytes)
        webm_path = tmp.name

    try:
        if _webm_to_wav_librosa_friendly(webm_path, wav_path):
            rel = os.path.join("answer_audio", session_id, wav_name)
            return rel.replace("\\", "/"), None
        # Fallback: keep original container if ffmpeg missing (less ideal for librosa)
        fallback_name = f"question_{safe_idx:03d}.webm"
        fallback_path = os.path.join(session_dir, fallback_name)
        shutil.copy2(webm_path, fallback_path)
        rel = os.path.join("answer_audio", session_id, fallback_name)
        return rel.replace("\\", "/"), "ffmpeg unavailable or conversion failed; stored as WebM (install ffmpeg for WAV)."
    finally:
        try:
            os.remove(webm_path)
        except OSError:
            pass


def _answer_audio_path_for_index(session_id: str, question_index: int) -> Optional[str]:
    """Return path to WAV or WebM if saved for this question."""
    session_dir = os.path.join(ANSWER_AUDIO_DIR, session_id)
    for ext in (".wav", ".webm"):
        p = os.path.join(session_dir, f"question_{question_index:03d}{ext}")
        if os.path.isfile(p) and os.path.getsize(p) > 0:
            return p
    return None


def _analyze_answer_audio(path: str) -> Tuple[Optional[dict], Optional[str]]:
    """Compute librosa-based metrics for one answer audio file."""
    if not LIBROSA_AVAILABLE or librosa is None:
        return None, "librosa is not installed on the server."
    try:
        y, sr = librosa.load(path, sr=None, mono=True)
        if y is None or len(y) == 0:
            return None, "Empty audio."

        # Basic energy
        rms = librosa.feature.rms(y=y)[0]
        mean_rms = float(rms.mean()) if rms.size else 0.0

        # Pause count: split into non-silent intervals then count gaps.
        intervals = librosa.effects.split(y, top_db=30)
        pause_count = max(0, len(intervals) - 1)

        # Speech consistency: stability of energy across speech segments.
        # Use coefficient of variation of RMS inside "speech" intervals.
        if len(intervals) > 0 and rms.size:
            frame_len = 2048
            hop_len = 512
            speech_rms_vals = []
            for s, e in intervals:
                f0 = int(max(0, (s - frame_len) // hop_len))
                f1 = int(min(len(rms), (e // hop_len) + 1))
                if f1 > f0:
                    speech_rms_vals.extend(rms[f0:f1].tolist())
            if speech_rms_vals:
                arr = np.array(speech_rms_vals, dtype=np.float32)
                mu = float(arr.mean())
                sigma = float(arr.std())
                consistency = float(1.0 - (sigma / (mu + 1e-8)))
            else:
                consistency = 0.0
        else:
            consistency = 0.0

        # Normalize to a 0-100 confidence score with simple heuristics.
        # - Consistency: higher is better (cap [0, 1])
        # - Pauses: fewer is better (soft penalty)
        # - Energy: moderate energy is better; too low suggests quiet/unclear speech.
        cons01 = max(0.0, min(1.0, consistency))
        pause_penalty = min(1.0, pause_count / 8.0)  # ~8+ pauses → max penalty
        energy_score = max(0.0, min(1.0, mean_rms / 0.08))  # heuristic for normalized waveform
        confidence = (0.55 * cons01 + 0.30 * energy_score + 0.15 * (1.0 - pause_penalty)) * 100.0

        return {
            "speech_consistency": cons01,
            "pause_count": int(pause_count),
            "mean_energy": mean_rms,
            "confidence_score": float(max(0.0, min(100.0, confidence))),
            "duration_sec": float(len(y) / float(sr)) if sr else 0.0,
        }, None
    except Exception as e:
        return None, f"Failed to analyze audio: {e}"


def _average_audio_metrics(session_id: Optional[str], n_questions: int) -> Tuple[Optional[dict], Optional[str]]:
    """Average metrics across all recorded answers in a session."""
    if not session_id:
        return None, None
    metrics = []
    for i in range(n_questions):
        p = _answer_audio_path_for_index(session_id, i)
        if not p:
            continue
        m, err = _analyze_answer_audio(p)
        if err:
            return None, err
        if m:
            metrics.append(m)

    if not metrics:
        return None, None

    avg = {
        "answers_analyzed": len(metrics),
        "avg_speech_consistency": float(np.mean([m["speech_consistency"] for m in metrics])),
        "avg_pause_count": float(np.mean([m["pause_count"] for m in metrics])),
        "avg_mean_energy": float(np.mean([m["mean_energy"] for m in metrics])),
        "avg_confidence_score": float(np.mean([m["confidence_score"] for m in metrics])),
        "total_audio_sec": float(np.sum([m["duration_sec"] for m in metrics])),
    }
    return avg, None


def _merge_answers_with_session_audio(
    session_id: Optional[str],
    questions: list,
    typed_answers: list,
) -> Tuple[list, Optional[str]]:
    """For each question index: if audio file exists, Whisper transcribe; else use typed answer."""
    n = len(questions)
    typed = list(typed_answers) if isinstance(typed_answers, list) else []
    while len(typed) < n:
        typed.append("")
    merged = []
    for i in range(n):
        audio_path = None
        if session_id:
            audio_path = _answer_audio_path_for_index(session_id, i)
        if audio_path:
            if not WHISPER_AVAILABLE or whisper_model is None:
                return [], "Speech-to-text (Whisper) is required for recorded answers but is not available on the server."
            try:
                stt_result = whisper_model.transcribe(audio_path, language="en", fp16=True)
                text = (stt_result.get("text") or "").strip()
            except Exception as e:
                return [], f"Failed to transcribe audio for question {i + 1}: {e}"
            merged.append(text if text else (typed[i] or "").strip())
        else:
            merged.append((typed[i] or "").strip())
    return merged, None


def _make_report_from_qa(qa_list):
    """Build Gemini report from list of {question, answer}. Returns (report, None) or (None, (msg, code))."""
    if not isinstance(qa_list, list) or not qa_list:
        return None, ("No questions/answers provided", 400)

    if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_GEMINI_API_KEY":
        return None, ("Gemini API key not configured.", 500)

    numbered_sections = []
    index = 1
    for item in qa_list:
        q = (item.get("question") or "").strip()
        a = (item.get("answer") or "").strip()
        if not q or not a:
            continue
        section = f"{index}. Question: {q}\nAnswer: {a}\n"
        numbered_sections.append(section)
        index += 1

    if not numbered_sections:
        return None, ("No valid question/answer pairs provided.", 400)

    qa_block = "\n\n".join(numbered_sections)

    prompt = (
        "You are an experienced interview coach. Below are numbered interview questions and the candidate's answers.\n"
        "For EACH numbered question/answer, write about five lines of feedback explaining how the answer was and what can be improved.\n"
        "Structure your response as numbered sections matching the questions (1., 2., etc.). Plain text only, no JSON or bullet lists.\n\n"
        f"{qa_block}\n"
    )

    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }

    headers = {"x-goog-api-key": GEMINI_API_KEY}
    try:
        resp = requests.post(GEMINI_API_URL, headers=headers, json=payload, timeout=90)
        data = resp.json()
        if not resp.ok:
            err_msg = data.get("error", {}).get("message", data.get("error", resp.text))
            return None, (f"Gemini API error: {err_msg}", resp.status_code)

        text = _extract_gemini_text(data)
        if not text:
            return None, ("Empty response from Gemini.", 500)

        return text.strip(), None
    except Exception as e:
        return None, (f"Failed to generate interview report: {e}", 500)


# Initialize MediaPipe Face Detection
face_detection = None
face_mesh = None
if MEDIAPIPE_AVAILABLE:
    try:
        mp_face_detection = mp.solutions.face_detection
        mp_drawing = mp.solutions.drawing_utils
        face_detection = mp_face_detection.FaceDetection(
            model_selection=0,  # 0 for short-range, 1 for full-range
            min_detection_confidence=0.5
        )
        # FaceMesh is used for gaze estimation (iris landmarks).
        mp_face_mesh = mp.solutions.face_mesh
        face_mesh = mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,  # enables iris landmarks (468-477)
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        print("MediaPipe Face Detection initialized successfully")
    except Exception as e:
        print(f"ERROR: Failed to initialize MediaPipe Face Detection: {e}")
        MEDIAPIPE_AVAILABLE = False
else:
    print("WARNING: MediaPipe is not available. Face detection will not work.")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY")
# Default to gemini-2.5-flash, which is the model your quota screenshot shows as having free tier limits.
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
# Gemini API v1 endpoint; model is configurable via GEMINI_MODEL
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1/models/{GEMINI_MODEL}:generateContent"

def decode_base64_image(base64_string):
    """Decode base64 image string to numpy array"""
    # Remove data URL prefix if present
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    
    image_data = base64.b64decode(base64_string)
    image = Image.open(io.BytesIO(image_data))
    # Convert PIL image to RGB numpy array
    image_array = np.array(image.convert('RGB'))
    return image_array

def process_frame(image_array):
    """Process a single frame and detect faces."""
    if not MEDIAPIPE_AVAILABLE or face_detection is None:
        raise Exception("MediaPipe is not available. Please install it: pip install mediapipe")
    
    # Convert RGB to BGR for OpenCV
    image_bgr = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
    
    # Convert BGR to RGB for MediaPipe
    image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    
    # Process the image
    results = face_detection.process(image_rgb)
    
    faces = []
    if results.detections:
        for detection in results.detections:
            # Get bounding box
            bbox = detection.location_data.relative_bounding_box
            h, w, _ = image_rgb.shape
            
            face_info = {
                'x': int(bbox.xmin * w),
                'y': int(bbox.ymin * h),
                'width': int(bbox.width * w),
                'height': int(bbox.height * h),
                'confidence': detection.score[0]
            }
            faces.append(face_info)
    
    return faces


def _gaze_from_facemesh(face_landmarks, image_w: int, image_h: int):
    """
    Estimate gaze direction using iris centers relative to eye corners.
    Returns "left" | "right" | "center" | None.
    """
    if not face_landmarks:
        return None
    lm = face_landmarks.landmark
    try:
        # Eye corner landmarks (FaceMesh)
        left_eye = (33, 133)
        right_eye = (362, 263)

        # Iris landmarks (FaceMesh, when refine_landmarks=True)
        left_iris_idx = [468, 469, 470, 471, 472]
        right_iris_idx = [473, 474, 475, 476, 477]

        def _px(i):
            return float(lm[i].x) * image_w, float(lm[i].y) * image_h

        def _iris_center(idxs):
            pts = [_px(i) for i in idxs]
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            return float(sum(xs) / len(xs)), float(sum(ys) / len(ys))

        def _norm_x(eye_pair, iris_center_x):
            (x1, _), (x2, _) = _px(eye_pair[0]), _px(eye_pair[1])
            x_min = min(x1, x2)
            x_max = max(x1, x2)
            denom = (x_max - x_min)
            if denom <= 1e-6:
                return None
            return (iris_center_x - x_min) / denom

        lcx, _ = _iris_center(left_iris_idx)
        rcx, _ = _iris_center(right_iris_idx)

        lpos = _norm_x(left_eye, lcx)
        rpos = _norm_x(right_eye, rcx)

        vals = [v for v in (lpos, rpos) if v is not None]
        if not vals:
            return None
        pos = float(sum(vals) / len(vals))

        # Stricter thresholds: narrow "center" band to trigger warnings sooner.
        if pos < 0.47:
            return "left"
        if pos > 0.53:
            return "right"
        return "center"
    except Exception:
        return None

def extract_text_from_pdf(file_stream):
    with pdfplumber.open(file_stream) as pdf:
        text = "\n".join(page.extract_text() or "" for page in pdf.pages)
    return text

def extract_text_from_docx(file_stream):
    doc = docx.Document(file_stream)
    return "\n".join([p.text for p in doc.paragraphs])

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok'}), 200

@app.route('/detect-faces', methods=['POST'])
def detect_faces():
    """Endpoint to detect faces in a video frame"""
    try:
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400
        
        # Decode base64 image
        image_array = decode_base64_image(data['image'])
        
        # Process frame
        faces = process_frame(image_array)

        gaze = None
        try:
            if MEDIAPIPE_AVAILABLE and face_mesh is not None and len(faces) == 1:
                # Run FaceMesh on same frame for gaze estimation.
                image_bgr = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
                image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
                mesh_res = face_mesh.process(image_rgb)
                if mesh_res and mesh_res.multi_face_landmarks:
                    h, w, _ = image_rgb.shape
                    gaze = _gaze_from_facemesh(mesh_res.multi_face_landmarks[0], w, h)
        except Exception:
            gaze = None
        
        # Determine status
        face_count = len(faces)
        status = 'ok'
        warning = None
        
        if face_count == 0:
            status = 'no_face'
            warning = 'No face detected. Please ensure your face is visible in the camera.'
        elif face_count > 1:
            status = 'multiple_faces'
            warning = f'Multiple faces detected ({face_count}). Please ensure only one person is in the frame.'
        else:
            status = 'ok'
        
        response = {
            'face_count': face_count,
            'faces': faces,
            'status': status,
            'warning': warning,
            'gaze': gaze,
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/parse-resume', methods=['POST'])
def parse_resume():
    if 'resume' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    file = request.files['resume']
    filename = file.filename.lower()
    text = ""
    try:
        if filename.endswith('.pdf'):
            text = extract_text_from_pdf(file.stream)
        elif filename.endswith('.docx'):
            text = extract_text_from_docx(file.stream)
        else:
            return jsonify({'error': 'Unsupported file type'}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to parse resume: {str(e)}'}), 500
    # For demo, just return the extracted text
    return jsonify({'text': text})

def _extract_gemini_text(result):
    """Extract generated text from Gemini API response (handles different shapes)."""
    try:
        candidates = result.get("candidates") or []
        if not candidates:
            return None
        parts = (candidates[0].get("content") or {}).get("parts") or []
        if not parts:
            return None
        return (parts[0].get("text") or "").strip()
    except (KeyError, IndexError, TypeError):
        return None


def _fallback_questions(resume_text: str, interview_type: str = "general"):
    """Generate basic fallback questions if Gemini API is unavailable."""
    it = (interview_type or "general").lower().strip()
    common_tail = [
        "Tell me about a time you received critical feedback and how you responded.",
        "Describe a situation where you had to learn something quickly to complete a task.",
        "How do you prioritize your tasks when you have multiple deadlines?",
        "What kind of role or responsibilities are you looking for next?",
        "Why do you think you would be a good fit for this position?",
    ]
    if it == "technical":
        head = [
            "Walk me through a system or module you built that you are most proud of.",
            "How do you approach debugging a complex production issue?",
            "Describe your experience with code review and maintaining quality at scale.",
            "Explain a trade-off you made between performance and maintainability.",
            "How do you stay current with tools, languages, or frameworks relevant to your stack?",
        ]
        return head + common_tail
    if it == "product_management":
        head = [
            "How do you prioritize features when stakeholders disagree?",
            "Describe a product decision you made using data and user research.",
            "Tell me about a product that failed or underperformed and what you learned.",
            "How do you align engineering and design on roadmap and scope?",
            "What metrics do you track to measure product success?",
        ]
        return head + common_tail
    if it == "leadership":
        head = [
            "Describe how you build psychological safety on a team you lead or influenced.",
            "Tell me about a difficult personnel situation and how you handled it.",
            "How do you delegate while still owning outcomes?",
            "Describe a time you had to drive alignment across multiple teams or departments.",
            "How do you develop junior team members?",
        ]
        return head + common_tail
    if it == "custom":
        head = [
            "Based on your stated target role, what is the biggest gap you are working to close?",
            "How does your recent experience prepare you for the responsibilities you want next?",
            "What would you accomplish in the first 90 days if you joined your target company?",
            "Describe a project that best demonstrates fit for your target role.",
            "What constraints (team size, budget, timeline) have shaped your biggest wins?",
        ]
        return head + common_tail
    # general (default)
    base = [
        "Can you walk me through the key highlights of your resume?",
        "What project are you most proud of from your recent experience, and why?",
        "Tell me about a challenging problem you solved and how you approached it.",
        "Describe a time you had to collaborate with others to achieve a goal.",
        "What technical or domain skills do you use most frequently in your work?",
    ]
    return base + common_tail


def _interview_type_prompt_block(interview_type: str, target_role: str, experience_level: str, target_company: str) -> str:
    """Human-readable instructions for Gemini based on interview type."""
    it = (interview_type or "general").lower().strip()
    blocks = {
        "general": (
            "Interview type: General / behavioral interview. Focus on situational and behavioral questions "
            "that fit the candidate's background (STAR-style scenarios, teamwork, conflict, ownership)."
        ),
        "technical": (
            "Interview type: Technical interview. Include coding-adjacent and engineering depth questions "
            "(algorithms trade-offs, system design at an appropriate level, debugging, testing, performance) "
            "aligned with skills implied by the resume."
        ),
        "product_management": (
            "Interview type: Product management. Include strategy, prioritization, metrics, stakeholder management, "
            "and product sense questions tailored to the candidate's experience."
        ),
        "leadership": (
            "Interview type: Leadership / management. Include people leadership, cross-functional influence, "
            "coaching, conflict resolution, and org-level scenarios appropriate to the resume."
        ),
        "custom": (
            "Interview type: Custom role-focused interview. Tailor all questions to the candidate's stated "
            "target role, experience level, and (if provided) target company, using the resume as context."
        ),
    }
    base = blocks.get(it, blocks["general"])
    if it == "custom":
        extra = (
            f"\nCandidate target role: {target_role or 'Not specified'}\n"
            f"Experience level: {experience_level or 'Not specified'}\n"
            f"Target company (optional): {target_company or 'Not specified'}\n"
        )
        return base + extra
    return base


def _build_generate_questions_prompt(
    resume_text: str,
    interview_type: str,
    target_role: str,
    experience_level: str,
    target_company: str,
) -> str:
    type_block = _interview_type_prompt_block(interview_type, target_role, experience_level, target_company)
    return (
        "You are an expert interviewer. " + type_block + "\n\n"
        "Based on the following resume, generate exactly 10 diverse and challenging interview questions that match "
        "this interview type and the candidate's background. "
        "Return only the questions as a numbered list (e.g. 1. First question). No other text.\n\n"
        "Resume:\n" + resume_text
    )


def _evaluate_answer_with_gemini(question: str, answer_text: str):
    """Call Gemini to get plain-text feedback (about 5 lines) on an interview answer."""
    if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_GEMINI_API_KEY":
        return None, "Gemini API key not configured."

    prompt = (
        "You are an experienced interview coach. You will receive a question and a candidate's answer.\n"
        "Give brief feedback in plain text (about 5 lines). Describe how the answer was, and what can be improved.\n"
        "No JSON, no bullets—just a short paragraph or a few lines of prose.\n\n"
        f"Question: {question}\n\n"
        f"Answer: {answer_text}\n"
    )

    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }

    headers = {"x-goog-api-key": GEMINI_API_KEY}
    try:
        resp = requests.post(GEMINI_API_URL, headers=headers, json=payload, timeout=60)
        data = resp.json()
        if not resp.ok:
            err_msg = data.get("error", {}).get("message", data.get("error", resp.text))
            return None, f"Gemini API error: {err_msg}"

        text = _extract_gemini_text(data)
        if not text:
            return None, "Empty response from Gemini."

        # Return plain text directly (not JSON)
        return text.strip(), None
    except Exception as e:
        return None, f"Failed to call Gemini: {e}"


@app.route('/api/save-answer-audio', methods=['POST'])
def save_answer_audio():
    """Save recorded WebM as WAV (or WebM fallback) per session/question. No Whisper — fast.

    Form: audio (file), session_id (UUID), question_index (int).
    """
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file uploaded'}), 400

    audio_file = request.files['audio']
    raw_bytes = audio_file.read()

    session_id = _ensure_safe_session_id(request.form.get("session_id"))
    question_index_raw = request.form.get("question_index")
    question_index: Optional[int] = None
    if question_index_raw is not None and str(question_index_raw).strip() != "":
        try:
            question_index = int(question_index_raw)
        except ValueError:
            question_index = None

    if session_id is None or question_index is None:
        return jsonify({'error': 'Valid session_id (UUID) and question_index are required.'}), 400

    saved_audio_path, storage_warning = _save_answer_audio_wav(raw_bytes, session_id, question_index)
    if not saved_audio_path:
        return jsonify({'error': 'Failed to save audio.'}), 500

    out = {'saved': True, 'saved_audio_path': saved_audio_path}
    if storage_warning:
        out['storage_warning'] = storage_warning
    return jsonify(out)


@app.route('/api/interview-report-transcribe', methods=['POST'])
def interview_report_transcribe():
    """After interview: Whisper transcribe all saved answer audio, merge with typed answers, return Gemini report.

    JSON: session_id (optional UUID), questions (list of str), typed_answers (list of str, same length).
    """
    data = request.get_json() or {}
    questions = data.get("questions")
    typed_answers = data.get("typed_answers") or []
    session_id = _ensure_safe_session_id(data.get("session_id"))

    if not isinstance(questions, list) or not questions:
        return jsonify({'error': 'No questions provided.'}), 400

    merged, merge_err = _merge_answers_with_session_audio(session_id, questions, typed_answers)
    if merge_err:
        return jsonify({'error': merge_err}), 500

    qa_list = []
    for i, q in enumerate(questions):
        qs = (q or "").strip()
        if not qs:
            continue
        ans = merged[i] if i < len(merged) else ""
        if not (ans or "").strip():
            continue
        qa_list.append({"question": qs, "answer": ans.strip()})

    if not qa_list:
        return jsonify({'error': 'No answers to report (add typed text or record voice for at least one question).'}), 400

    audio_avg, audio_err = _average_audio_metrics(session_id, len(questions))
    if audio_err:
        return jsonify({'error': audio_err}), 500

    report, err = _make_report_from_qa(qa_list)
    if err:
        return jsonify({'error': err[0]}), err[1]

    if audio_avg:
        summary = (
            "Audio Analysis Summary (averaged across all recorded answers)\n"
            f"- Answers analyzed: {audio_avg['answers_analyzed']}\n"
            f"- Confidence score: {audio_avg['avg_confidence_score']:.1f}/100\n"
            f"- Speech consistency: {audio_avg['avg_speech_consistency']:.3f}\n"
            f"- Pause count: {audio_avg['avg_pause_count']:.2f}\n"
            f"- Energy (mean RMS): {audio_avg['avg_mean_energy']:.5f}\n"
        ).strip()
        report = summary + "\n\n" + report

    return jsonify({"report": report, "answers_used": merged, "audio_metrics_avg": audio_avg})


@app.route('/api/evaluate-interview-report', methods=['POST'])
def evaluate_interview_report():
    """Generate a consolidated feedback report for all questions and answers (pre-built qa list)."""
    data = request.get_json() or {}
    qa_list = data.get('qa', [])

    report, err = _make_report_from_qa(qa_list)
    if err:
        return jsonify({'error': err[0]}), err[1]

    return jsonify({'report': report})


@app.route('/api/generate-questions', methods=['POST'])
def generate_questions():
    data = request.get_json() or {}
    resume_text = data.get('resume_text', '')
    if not resume_text:
        return jsonify({'error': 'No resume text provided'}), 400
    interview_type = (data.get('interview_type') or 'general').strip().lower()
    allowed_types = {'general', 'technical', 'product_management', 'leadership', 'custom'}
    if interview_type not in allowed_types:
        interview_type = 'general'
    target_role = (data.get('target_role') or '').strip()
    experience_level = (data.get('experience_level') or '').strip()
    target_company = (data.get('target_company') or '').strip()

    if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_GEMINI_API_KEY":
        return jsonify({'error': 'Gemini API key not configured. Add GEMINI_API_KEY to .env in the project root.'}), 500
    prompt = _build_generate_questions_prompt(
        resume_text, interview_type, target_role, experience_level, target_company
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    try:
        # Gemini API v1: pass API key via x-goog-api-key header
        headers = {"x-goog-api-key": GEMINI_API_KEY}
        response = requests.post(GEMINI_API_URL, headers=headers, json=payload, timeout=60)
        result = response.json()

        if not response.ok:
            # If the model isn't found or API is misconfigured, fall back to local questions
            err_msg = result.get("error", {}).get("message", result.get("error", response.text))
            questions = _fallback_questions(resume_text, interview_type)
            return jsonify({'questions': questions, 'warning': f'Gemini API error (fallback used): {err_msg}'}), 200

        questions_text = _extract_gemini_text(result)
        if not questions_text:
            questions = _fallback_questions(resume_text, interview_type)
            return jsonify({'questions': questions, 'warning': 'Gemini API returned no text (fallback used).'}), 200

        # Split by newlines and strip numbering like "1. " or "1)"
        raw = [q.strip() for q in questions_text.split('\n') if q.strip()]
        questions = []
        for q in raw:
            # Remove leading "N. " or "N) "
            q = re.sub(r'^\s*\d+[.)]\s*', '', q).strip()
            if q:
                questions.append(q)
        if not questions:
            questions = _fallback_questions(resume_text, interview_type)
            return jsonify({'questions': questions, 'warning': 'Could not parse Gemini response (fallback used).'}), 200
        return jsonify({'questions': questions, 'interview_type': interview_type})
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Request to Gemini timed out.'}), 504
    except Exception as e:
        return jsonify({'error': f'Failed to generate questions: {str(e)}'}), 500

if __name__ == '__main__':
    print("Starting Flask server for face detection...")
    print("Server will run on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)

