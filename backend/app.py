from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
from PIL import Image
import io
import sys

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

if __name__ == '__main__':
    print("Starting Flask server for face detection...")
    print("Server will run on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)

