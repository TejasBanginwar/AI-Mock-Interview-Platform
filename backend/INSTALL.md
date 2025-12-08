# Installation Guide for Face Detection Backend

## Quick Install (Recommended)

Run the installation script:
```bash
# Windows
install_dependencies.bat

# Linux/Mac
chmod +x install_dependencies.sh
./install_dependencies.sh
```

## Manual Installation

1. **Activate your virtual environment:**
   ```bash
   # Windows
   ..\venv\Scripts\activate
   
   # Linux/Mac
   source ../venv/bin/activate
   ```

2. **Upgrade pip:**
   ```bash
   python -m pip install --upgrade pip
   ```

3. **Install dependencies in order (important for MediaPipe):**
   ```bash
   # Install protobuf first (MediaPipe requires specific version)
   pip install protobuf==3.20.3
   
   # Install other dependencies
   pip install numpy==1.24.3
   pip install pillow==10.1.0
   pip install opencv-python==4.8.1.78
   pip install flask==3.0.0
   pip install flask-cors==4.0.0
   
   # Install MediaPipe last
   pip install mediapipe==0.10.7
   ```

   OR install all at once:
   ```bash
   pip install -r requirements.txt
   ```

## Common Issues and Solutions

### Issue: "ModuleNotFoundError: No module named 'mediapipe'"
**Solution:** Make sure you've activated your virtual environment and installed MediaPipe:
```bash
pip install mediapipe==0.10.7
```

### Issue: "protobuf version conflict"
**Solution:** Uninstall conflicting protobuf and install the correct version:
```bash
pip uninstall protobuf
pip install protobuf==3.20.3
```

### Issue: "MediaPipe installation fails on Windows"
**Solution:** 
1. Make sure you have Visual C++ Redistributable installed
2. Try installing a specific version: `pip install mediapipe==0.10.7`
3. If still failing, try: `pip install mediapipe --no-cache-dir`

### Issue: "ImportError: DLL load failed"
**Solution:** This is usually a Windows-specific issue. Try:
1. Install/update Visual C++ Redistributable
2. Reinstall MediaPipe: `pip uninstall mediapipe && pip install mediapipe==0.10.7`

### Issue: Python version compatibility
**Solution:** MediaPipe works best with Python 3.8-3.11. If you're using Python 3.12+, you may need to use a newer MediaPipe version:
```bash
pip install mediapipe
```

## Verify Installation

Test if MediaPipe is installed correctly:
```bash
python -c "import mediapipe as mp; print('MediaPipe version:', mp.__version__)"
```

If you see the version number, installation was successful!

## Running the Server

After installation, start the server:
```bash
python app.py
```

The server will start on `http://localhost:5000`


