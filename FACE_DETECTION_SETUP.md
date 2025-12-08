# Face Detection Setup Guide

This guide will help you set up and run the face detection feature for the InterviewAI application.

## Features

- ✅ Real-time face detection using MediaPipe and OpenCV
- ✅ Continuous monitoring to ensure face is always visible
- ✅ Multiple face detection warning
- ✅ Visual feedback with bounding boxes and status indicators
- ✅ Automatic camera access and video streaming

## Prerequisites

- Python 3.8 or higher
- Node.js and npm (for frontend)
- Webcam/camera access

## Backend Setup (Python)

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Activate your Python virtual environment:**
   ```bash
   # Windows
   ..\venv\Scripts\activate
   
   # Linux/Mac
   source ../venv/bin/activate
   ```

3. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the Flask server:**
   ```bash
   # Windows
   python app.py
   # or
   run.bat
   
   # Linux/Mac
   python app.py
   # or
   chmod +x run.sh
   ./run.sh
   ```

   The server will start on `http://localhost:5000`

## Frontend Setup

The frontend is already configured. The face detection component is integrated into the Interview page.

1. **Navigate to the InterviewAI directory:**
   ```bash
   cd InterviewAI
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

   The frontend will start on `http://localhost:8080` (or the port specified in vite.config.ts)

## Usage

1. **Start both servers:**
   - Backend: `http://localhost:5000`
   - Frontend: `http://localhost:8080`

2. **Navigate to the Interview page** in your browser

3. **Grant camera permissions** when prompted

4. **The face detection will automatically start:**
   - Green box: One face detected (good)
   - Red box: Multiple faces detected (warning shown)
   - Yellow alert: No face detected (warning shown)

## API Endpoints

### POST /detect-faces
Detects faces in a video frame.

**Request:**
```json
{
  "image": "data:image/jpeg;base64,..."
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

## Troubleshooting

### Camera not working
- Ensure you've granted camera permissions in your browser
- Check if another application is using the camera
- Try refreshing the page

### Backend connection error
- Ensure the Flask server is running on port 5000
- Check if the API URL in `useFaceDetection.ts` matches your backend URL
- Check browser console for CORS errors

### Face detection not working
- Ensure MediaPipe and OpenCV are properly installed
- Check backend logs for errors
- Verify the image is being sent correctly (check Network tab in browser DevTools)

### Multiple faces warning
- Ensure only one person is in the camera frame
- Move away from mirrors or reflective surfaces
- Remove photos or images of faces from the background

## Configuration

### Change detection frequency
Edit `InterviewAI/src/hooks/useFaceDetection.ts`:
```typescript
// Change the delay (in milliseconds) between detections
setTimeout(() => {
  animationFrameRef.current = requestAnimationFrame(detect);
}, 200); // Change 200 to your desired delay
```

### Change backend URL
Edit `InterviewAI/src/hooks/useFaceDetection.ts`:
```typescript
const API_URL = 'http://localhost:5000/detect-faces'; // Change this
```

### Adjust detection confidence
Edit `backend/app.py`:
```python
face_detection = mp_face_detection.FaceDetection(
    model_selection=0,
    min_detection_confidence=0.5  # Change this (0.0 to 1.0)
)
```

## Notes

- Face detection runs at approximately 5 FPS to reduce server load
- The video feed is processed in real-time
- Detection results are displayed with visual overlays
- Warnings are shown when face detection issues occur


