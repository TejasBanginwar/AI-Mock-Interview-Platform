@echo off
echo Installing Python dependencies for Face Detection Backend...
echo.
echo This may take a few minutes, especially for MediaPipe...
echo.

REM Activate virtual environment
call ..\venv\Scripts\activate.bat

REM Upgrade pip first
python -m pip install --upgrade pip

REM Install protobuf first (MediaPipe dependency)
echo Installing protobuf...
pip install protobuf==3.20.3

REM Install other dependencies
echo Installing other dependencies...
pip install numpy==1.24.3
pip install pillow==10.1.0
pip install opencv-python==4.8.1.78
pip install flask==3.0.0
pip install flask-cors==4.0.0

REM Install MediaPipe last (it has many dependencies)
echo Installing MediaPipe (this may take a while)...
pip install mediapipe==0.10.7

echo.
echo Installation complete!
echo.
pause


