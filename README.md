# InterviewAI - AI-Powered Interview Practice Platform

A full-stack application for practicing mock interviews with AI-powered feedback, real-time face detection, and tab-switch monitoring.

## Features

- 🎤 **AI-Powered Mock Interviews** - Practice with realistic interview questions
- 📹 **Real-time Face Detection** - MediaPipe and OpenCV integration for face monitoring
- ⚠️ **Tab Switch Detection** - Monitors and warns when users switch tabs or applications
- 🎯 **Interview Analytics** - Track your performance and get feedback
- 💬 **Voice & Text Input** - Answer questions via typing or voice recording

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **Python** (v3.8 - v3.12) - [Download](https://www.python.org/downloads/)
- **Git** - [Download](https://git-scm.com/downloads)
- **Webcam** - For face detection feature
- **npm** or **yarn** - Comes with Node.js

## Getting Started

> 💡 **New to the project?** Check out [QUICK_START.md](./QUICK_START.md) for a faster setup guide!

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd BE_Project
```

### 2. Backend Setup (Python/Flask)

#### Step 1: Create and Activate Virtual Environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Linux/Mac:**
```bash
python3 -m venv venv
source venv/bin/activate
```

#### Step 2: Install Python Dependencies

```bash
cd backend
pip install --upgrade pip
pip install -r requirements.txt
```

**Note:** If you encounter issues with MediaPipe installation:
- Make sure you're using Python 3.8-3.12
- Try installing protobuf first: `pip install protobuf>=4.25.3`
- Then install MediaPipe: `pip install mediapipe==0.10.21`

#### Step 3: Verify Backend Installation

```bash
python -c "import mediapipe; import flask; print('All dependencies installed successfully!')"
```

### 3. Frontend Setup (React/TypeScript)

#### Step 1: Navigate to Frontend Directory

```bash
cd InterviewAI
```

#### Step 2: Install Node Dependencies

```bash
npm install
```

**Alternative with yarn:**
```bash
yarn install
```

#### Step 3: Verify Frontend Installation

```bash
npm run build
```

## Running the Application

### Start the Backend Server

1. **Activate your virtual environment** (if not already activated):
   ```bash
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

2. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

3. **Start the Flask server:**
   ```bash
   python app.py
   ```

   The backend will start on `http://localhost:5000`

### Start the Frontend Server

1. **Open a new terminal window/tab**

2. **Navigate to frontend directory:**
   ```bash
   cd InterviewAI
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

   The frontend will start on `http://localhost:8080` (or the port specified in vite.config.ts)

### Access the Application

Open your browser and navigate to:
```
http://localhost:8080
```

## Project Structure

```
BE_Project/
├── backend/                 # Python Flask backend
│   ├── app.py              # Main Flask application
│   ├── requirements.txt    # Python dependencies
│   └── README.md          # Backend-specific documentation
│
├── InterviewAI/            # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── pages/         # Page components
│   │   └── ...
│   ├── package.json       # Node.js dependencies
│   └── vite.config.ts     # Vite configuration
│
├── venv/                   # Python virtual environment (gitignored)
├── .gitignore              # Git ignore rules
└── README.md              # This file
```

## API Endpoints

### Backend API (Port 5000)

- `GET /health` - Health check endpoint
- `POST /detect-faces` - Face detection endpoint
  ```json
  {
    "image": "base64_encoded_image_string"
  }
  ```

## Configuration

### Backend Configuration

The backend runs on `http://localhost:5000` by default. To change this, edit `backend/app.py`:

```python
app.run(host='0.0.0.0', port=5000, debug=True)
```

### Frontend Configuration

The frontend runs on `http://localhost:8080` by default. To change this, edit `InterviewAI/vite.config.ts`:

```typescript
server: {
  host: "::",
  port: 8080,
}
```

### API URL Configuration

If your backend runs on a different URL, update `InterviewAI/src/hooks/useFaceDetection.ts`:

```typescript
const API_URL = 'http://localhost:5000/detect-faces';
```

## Troubleshooting

### Backend Issues

**MediaPipe not installing:**
- Ensure Python version is 3.8-3.12
- Install protobuf first: `pip install protobuf>=4.25.3`
- Then install MediaPipe: `pip install mediapipe==0.10.21`

**Port already in use:**
- Change the port in `backend/app.py`
- Or kill the process using port 5000

**Import errors:**
- Make sure virtual environment is activated
- Reinstall dependencies: `pip install -r requirements.txt`

### Frontend Issues

**Node modules not installing:**
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again

**Port already in use:**
- Change the port in `InterviewAI/vite.config.ts`
- Or kill the process using the port

**CORS errors:**
- Ensure backend is running
- Check that backend CORS is enabled in `backend/app.py`

**Face detection not working:**
- Ensure backend server is running on port 5000
- Check browser console for errors
- Verify camera permissions are granted

### Camera Issues

**Camera not accessible:**
- Grant camera permissions in browser
- Check if another application is using the camera
- Try refreshing the page

## Development

### Running in Development Mode

Both servers support hot-reload:
- **Backend:** Set `debug=True` in `app.py` (already set)
- **Frontend:** Vite automatically supports hot-reload

### Building for Production

**Frontend:**
```bash
cd InterviewAI
npm run build
```

The built files will be in `InterviewAI/dist/`

**Backend:**
The backend doesn't require building. For production, consider using:
- Gunicorn (Linux/Mac)
- Waitress (Windows)
- Docker containerization

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

[Add your license here]

## Support

For issues and questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review backend and frontend specific READMEs
- Open an issue on GitHub

## Acknowledgments

- MediaPipe for face detection
- OpenCV for image processing
- React and Vite for frontend framework
- Flask for backend framework

