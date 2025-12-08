# Quick Start Guide

Get the project up and running in 5 minutes!

## Prerequisites Check

Make sure you have:
- ✅ Node.js (v18+) - Check: `node --version`
- ✅ Python (v3.8-3.12) - Check: `python --version`
- ✅ Git - Check: `git --version`

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd BE_Project
```

### 2. Backend Setup (Terminal 1)

```bash
# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
cd backend
pip install --upgrade pip
pip install -r requirements.txt

# Start the server
python app.py
```

✅ Backend should now be running on `http://localhost:5000`

### 3. Frontend Setup (Terminal 2)

Open a **new terminal window** and run:

```bash
cd InterviewAI
npm install
npm run dev
```

✅ Frontend should now be running on `http://localhost:8080`

### 4. Open in Browser

Navigate to: **http://localhost:8080**

## Common First-Time Issues

### "MediaPipe not found"
```bash
pip install protobuf>=4.25.3
pip install mediapipe==0.10.21
```

### "Port already in use"
- Backend: Change port in `backend/app.py` (line 111)
- Frontend: Change port in `InterviewAI/vite.config.ts` (line 10)

### "npm install fails"
```bash
# Delete and reinstall
rm -rf node_modules package-lock.json  # Linux/Mac
# OR
rmdir /s node_modules & del package-lock.json  # Windows
npm install
```

## Verify Everything Works

1. ✅ Backend running: Visit `http://localhost:5000/health` - should return `{"status":"ok"}`
2. ✅ Frontend running: Visit `http://localhost:8080` - should show the app
3. ✅ Face detection: Go to Interview page and grant camera access

## Need Help?

Check the main [README.md](./README.md) for detailed troubleshooting.

