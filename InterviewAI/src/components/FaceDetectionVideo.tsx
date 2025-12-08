import { useEffect, useRef } from 'react';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FaceDetectionVideoProps {
  className?: string;
  autoStart?: boolean;
}

export const FaceDetectionVideo = ({ className, autoStart = true }: FaceDetectionVideoProps) => {
  const {
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
  } = useFaceDetection();

  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  // Draw face detection overlay
  useEffect(() => {
    if (!overlayCanvasRef.current || !videoRef.current || faces.length === 0) {
      if (overlayCanvasRef.current) {
        const ctx = overlayCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
        }
      }
      return;
    }

    const overlayCanvas = overlayCanvasRef.current;
    const video = videoRef.current;
    const ctx = overlayCanvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size to match video
    overlayCanvas.width = video.videoWidth;
    overlayCanvas.height = video.videoHeight;

    // Clear previous drawings
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // Draw bounding boxes for each face
    faces.forEach((face) => {
      const color = status === 'ok' ? '#10b981' : '#ef4444'; // green for ok, red for issues
      const lineWidth = 3;

      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(face.x, face.y, face.width, face.height);

      // Draw label
      ctx.fillStyle = color;
      ctx.font = '16px Arial';
      ctx.fillText(
        `Face ${Math.round(face.confidence * 100)}%`,
        face.x,
        face.y - 10
      );
    });
  }, [faces, status, videoRef]);

  // Start video on mount
  useEffect(() => {
    if (autoStart) {
      startVideo();
      return () => {
        stopVideo();
        stopDetection();
      };
    }
  }, [autoStart, startVideo, stopVideo, stopDetection]);

  const getStatusIcon = () => {
    switch (status) {
      case 'ok':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'no_face':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'multiple_faces':
        return <Users className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'ok':
        return 'border-green-500 bg-green-50 dark:bg-green-950';
      case 'no_face':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950';
      case 'multiple_faces':
        return 'border-red-500 bg-red-50 dark:bg-red-950';
      default:
        return '';
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="relative w-full max-w-2xl mx-auto bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-auto"
        />
        <canvas
          ref={overlayCanvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ objectFit: 'contain' }}
        />
        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Status indicator overlay */}
        <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-black/70 rounded-lg backdrop-blur-sm">
          {getStatusIcon()}
          <span className="text-white text-sm font-medium">
            {status === 'ok' ? 'Face Detected' : status === 'no_face' ? 'No Face' : 'Multiple Faces'}
          </span>
        </div>
      </div>

      {/* Warning/Status Alert */}
      {warning && (
        <Alert variant={status === 'ok' ? 'default' : 'destructive'} className={getStatusColor()}>
          {getStatusIcon()}
          <AlertTitle>
            {status === 'ok' ? 'Status' : status === 'no_face' ? 'No Face Detected' : 'Multiple Faces Detected'}
          </AlertTitle>
          <AlertDescription>{warning}</AlertDescription>
        </Alert>
      )}

      {!warning && status === 'ok' && faceCount === 1 && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <AlertTitle>Face Detection Active</AlertTitle>
          <AlertDescription>
            Your face is being detected correctly. You can proceed with the interview.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

