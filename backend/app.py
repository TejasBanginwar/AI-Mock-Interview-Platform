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
import docx
import pdfplumber
import requests

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

# Initialize MediaPipe Face Detection
face_detection = None
if MEDIAPIPE_AVAILABLE:
    try:
        mp_face_detection = mp.solutions.face_detection
        mp_drawing = mp.solutions.drawing_utils
        face_detection = mp_face_detection.FaceDetection(
            model_selection=0,  # 0 for short-range, 1 for full-range
            min_detection_confidence=0.5
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
    """Process a single frame and detect faces"""
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
            'warning': warning
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


def _fallback_questions(resume_text: str):
    """Generate basic fallback questions if Gemini API is unavailable."""
    # Keep it simple and generic but still reasonable
    base = [
        "Can you walk me through the key highlights of your resume?",
        "What project are you most proud of from your recent experience, and why?",
        "Tell me about a challenging problem you solved and how you approached it.",
        "Describe a time you had to collaborate with others to achieve a goal.",
        "What technical or domain skills do you use most frequently in your work?",
        "Tell me about a time you received critical feedback and how you responded.",
        "Describe a situation where you had to learn something quickly to complete a task.",
        "How do you prioritize your tasks when you have multiple deadlines?",
        "What kind of role or responsibilities are you looking for next?",
        "Why do you think you would be a good fit for this position?",
    ]
    return base


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


@app.route('/api/evaluate-answer-audio', methods=['POST'])
def evaluate_answer_audio():
    """Accepts an audio recording and question, transcribes it, and returns only the transcript.

    Gemini feedback is generated later in a single report for all answers.
    """
    if not WHISPER_AVAILABLE or whisper_model is None:
        return jsonify({'error': 'Whisper speech-to-text is not available on the server.'}), 500

    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file uploaded'}), 400

    # Question is optional here; we just transcribe the audio
    audio_file = request.files['audio']
    # Save to a temporary file for Whisper/ffmpeg to read
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        tmp.write(audio_file.read())
        tmp_path = tmp.name

    try:
        # fp16=False for CPU-only environments
        stt_result = whisper_model.transcribe(tmp_path, language="en", fp16=True)
    except Exception as e:
        os.remove(tmp_path)
        return jsonify({'error': f'Failed to transcribe audio with Whisper: {e}'}), 500
    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass

    transcript = (stt_result.get("text") or "").strip()

    if not transcript:
        return jsonify({'error': 'Could not transcribe audio to text.'}), 500

    # Only return transcript; feedback is generated later in a single report
    return jsonify({'transcript': transcript})


@app.route('/api/evaluate-interview-report', methods=['POST'])
def evaluate_interview_report():
    """Generate a consolidated feedback report for all questions and answers."""
    data = request.get_json() or {}
    qa_list = data.get('qa', [])

    if not isinstance(qa_list, list) or not qa_list:
        return jsonify({'error': 'No questions/answers provided'}), 400

    if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_GEMINI_API_KEY":
        return jsonify({'error': 'Gemini API key not configured.'}), 500

    numbered_sections = []
    index = 1
    for item in qa_list:
        q = (item.get('question') or '').strip()
        a = (item.get('answer') or '').strip()
        if not q or not a:
            continue
        section = f"{index}. Question: {q}\nAnswer: {a}\n"
        numbered_sections.append(section)
        index += 1

    if not numbered_sections:
        return jsonify({'error': 'No valid question/answer pairs provided.'}), 400

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
            return jsonify({'error': f'Gemini API error: {err_msg}'}), resp.status_code

        text = _extract_gemini_text(data)
        if not text:
            return jsonify({'error': 'Empty response from Gemini.'}), 500

        return jsonify({'report': text.strip()})
    except Exception as e:
        return jsonify({'error': f'Failed to generate interview report: {e}'}), 500


@app.route('/api/generate-questions', methods=['POST'])
def generate_questions():
    data = request.get_json() or {}
    resume_text = data.get('resume_text', '')
    if not resume_text:
        return jsonify({'error': 'No resume text provided'}), 400
    if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_GEMINI_API_KEY":
        return jsonify({'error': 'Gemini API key not configured. Add GEMINI_API_KEY to .env in the project root.'}), 500
    prompt = (
        "You are an expert interviewer. Based on the following resume, generate 10 diverse and challenging interview questions. "
        "Return only the questions as a numbered list (e.g. 1. First question). No other text.\n\nResume:\n" + resume_text
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
            questions = _fallback_questions(resume_text)
            return jsonify({'questions': questions, 'warning': f'Gemini API error (fallback used): {err_msg}'}), 200

        questions_text = _extract_gemini_text(result)
        if not questions_text:
            questions = _fallback_questions(resume_text)
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
            questions = _fallback_questions(resume_text)
            return jsonify({'questions': questions, 'warning': 'Could not parse Gemini response (fallback used).'}), 200
        return jsonify({'questions': questions})
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Request to Gemini timed out.'}), 504
    except Exception as e:
        return jsonify({'error': f'Failed to generate questions: {str(e)}'}), 500

if __name__ == '__main__':
    print("Starting Flask server for face detection...")
    print("Server will run on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)

