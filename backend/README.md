# Face Detection Backend

Python backend for real-time face detection using MediaPipe and OpenCV.

## Setup

1. Activate your virtual environment:
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the server:
```bash
python app.py
```

The server will start on `http://localhost:5000`

## API Endpoints

### POST /detect-faces
Detects faces in a video frame.

**Request Body:**
```json
{
  "image": "base64_encoded_image_string"
}
```

**Response:**
```json
{
  "face_count": 1,
  "faces": [
    {
      "x": 100,
      "y": 150,
      "width": 200,
      "height": 250,
      "confidence": 0.95
    }
  ],
  "status": "ok",
  "warning": null
}
```

**Status values:**
- `ok`: One face detected
- `no_face`: No face detected
- `multiple_faces`: Multiple faces detected

### GET /health
Health check endpoint.

