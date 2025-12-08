import { useState, useRef, useEffect, useCallback } from 'react';

interface Face {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

interface FaceDetectionResult {
  face_count: number;
  faces: Face[];
  status: 'ok' | 'no_face' | 'multiple_faces';
  warning: string | null;
}

const API_URL = 'http://localhost:5000/detect-faces';

export const useFaceDetection = () => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [faceCount, setFaceCount] = useState(0);
  const [status, setStatus] = useState<'ok' | 'no_face' | 'multiple_faces'>('ok');
  const [warning, setWarning] = useState<string | null>(null);
  const [faces, setFaces] = useState<Face[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRunningRef = useRef<boolean>(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const captureFrame = useCallback(async (): Promise<string | null> => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to base64
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  const detectFaces = useCallback(async (imageData: string) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageData }),
      });

      if (!response.ok) {
        throw new Error('Face detection failed');
      }

      const result: FaceDetectionResult = await response.json();
      setFaceCount(result.face_count);
      setStatus(result.status);
      setWarning(result.warning);
      setFaces(result.faces);
      return result;
    } catch (error) {
      console.error('Face detection error:', error);
      setWarning('Failed to detect faces. Please check if the backend server is running.');
      return null;
    }
  }, []);

  const startVideo = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setWarning('Failed to access camera. Please grant camera permissions.');
    }
  }, []);

  const stopVideo = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsDetecting(false);
  }, []);

  const startDetection = useCallback(() => {
    if (!videoRef.current || isRunningRef.current) return;

    setIsDetecting(true);
    isRunningRef.current = true;

    const detect = async () => {
      if (!isRunningRef.current) return;

      if (videoRef.current?.readyState === 4) {
        const imageData = await captureFrame();
        if (imageData) {
          await detectFaces(imageData);
        }
      }

      if (isRunningRef.current) {
        // Process every ~200ms (5 FPS) to reduce load
        timeoutRef.current = setTimeout(() => {
          if (isRunningRef.current) {
            animationFrameRef.current = requestAnimationFrame(detect);
          }
        }, 200);
      }
    };

    // Start detection loop
    detect();
  }, [captureFrame, detectFaces]);

  const stopDetection = useCallback(() => {
    setIsDetecting(false);
    isRunningRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Auto-start detection when video is ready
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isDetecting) return;

    const handleCanPlay = () => {
      if (!isDetecting && video.readyState >= 2) {
        startDetection();
      }
    };

    if (video.readyState >= 2) {
      // Video is already ready
      startDetection();
    } else {
      video.addEventListener('canplay', handleCanPlay);
      return () => {
        video.removeEventListener('canplay', handleCanPlay);
      };
    }
  }, [isDetecting, startDetection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVideo();
    };
  }, [stopVideo]);

  return {
    videoRef,
    canvasRef,
    isDetecting,
    faceCount,
    status,
    warning,
    faces,
    startVideo,
    stopVideo,
    startDetection,
    stopDetection,
  };
};

