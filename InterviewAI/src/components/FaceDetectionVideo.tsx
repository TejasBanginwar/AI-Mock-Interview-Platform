import { useEffect, useRef, useState } from 'react';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Users, Eye, Monitor } from 'lucide-react';
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
    gaze,
    emotion,
    startVideo,
    stopVideo,
    startDetection,
    stopDetection,
  } = useFaceDetection();

  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const suspiciousStartRef = useRef<number | null>(null);
  const centerStartRef = useRef<number | null>(null);
  const warningCooldownUntilRef = useRef<number>(0);
  const lastEmotionSampleAtRef = useRef<number>(0);
  const [gazeWarning, setGazeWarning] = useState<string | null>(null);
  const emotionEntries = Object.entries(emotion?.probabilities ?? {}).sort((a, b) => b[1] - a[1]);

  const mapEmotionToBucket = (label: string): "positivity" | "uncomfortable" | "happy" => {
    const k = label.toLowerCase();
    if (k === "happy") return "happy";
    if (["angry", "contempt", "disgust", "fear", "sad"].includes(k)) return "uncomfortable";
    return "positivity";
  };

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

  // Sticky gaze warning similar to tab-switch warning UX:
  // - trigger when suspicious gaze persists > 1.2s
  // - clear only after stable center gaze for > 1.2s
  useEffect(() => {
    const now = Date.now();
    const okForGaze = status === 'ok' && faceCount === 1;
    const suspiciousDir: 'left' | 'right' | 'unknown' | null =
      gaze === 'left' || gaze === 'right' ? gaze : gaze === null ? 'unknown' : null;

    if (!okForGaze) {
      suspiciousStartRef.current = null;
      centerStartRef.current = null;
      setGazeWarning(null);
      return;
    }

    if (suspiciousDir) {
      centerStartRef.current = null;
      if (suspiciousStartRef.current === null) {
        suspiciousStartRef.current = now;
      }
      if (now - suspiciousStartRef.current >= 1200 && now >= warningCooldownUntilRef.current) {
        warningCooldownUntilRef.current = now + 2000;
        if (suspiciousDir === 'left') {
          setGazeWarning('Please keep your eyes on the screen. Looking left for too long.');
        } else if (suspiciousDir === 'right') {
          setGazeWarning('Please keep your eyes on the screen. Looking right for too long.');
        } else {
          setGazeWarning('Please keep your full eyes visible and focused on screen.');
        }
      }
      return;
    }

    // Center gaze: clear warning only after a stable center period.
    suspiciousStartRef.current = null;
    if (centerStartRef.current === null) {
      centerStartRef.current = now;
    }
    if (gazeWarning && now - centerStartRef.current >= 1200) {
      setGazeWarning(null);
    }
  }, [gaze, status, faceCount]);

  // Auto-hide warning after 2 seconds (requested behavior).
  useEffect(() => {
    if (!gazeWarning) return;
    const timer = setTimeout(() => {
      setGazeWarning(null);
    }, 2000);
    return () => clearTimeout(timer);
  }, [gazeWarning]);

  // Persist interview emotion counts (sampled) for final pie chart report.
  useEffect(() => {
    if (status !== "ok" || faceCount !== 1 || !emotion?.label) return;
    const now = Date.now();
    if (now - lastEmotionSampleAtRef.current < 1000) return; // sample at 1 Hz
    lastEmotionSampleAtRef.current = now;

    const sessionId = localStorage.getItem("interviewSessionId");
    if (!sessionId) return;
    const key = `emotionSummary:${sessionId}`;

    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : {};
      const byLabel = typeof parsed?.byLabel === "object" && parsed.byLabel ? parsed.byLabel : {};
      const byBucket = typeof parsed?.byBucket === "object" && parsed.byBucket ? parsed.byBucket : {};

      const label = emotion.label.toLowerCase();
      const bucket = mapEmotionToBucket(label);

      byLabel[label] = (Number(byLabel[label]) || 0) + 1;
      byBucket[bucket] = (Number(byBucket[bucket]) || 0) + 1;
      const totalSamples = (Number(parsed?.totalSamples) || 0) + 1;

      localStorage.setItem(
        key,
        JSON.stringify({
          totalSamples,
          byLabel,
          byBucket,
          updatedAt: new Date().toISOString(),
        }),
      );
    } catch {
      // ignore localStorage parse/write errors
    }
  }, [emotion, status, faceCount]);

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
        {status === 'ok' && faceCount === 1 && (
          <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/70 rounded-lg backdrop-blur-sm space-y-1">
            <div className="text-white text-xs font-medium">
              Gaze: {gaze ?? 'unknown'}
            </div>
            <div className="text-white text-xs font-medium">
              Emotion: {emotion?.label ?? 'unknown'}
              {typeof emotion?.confidence === 'number' ? ` (${Math.round(emotion.confidence * 100)}%)` : ''}
            </div>
          </div>
        )}
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

      {gazeWarning && (
        <>
          <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 shadow-lg animate-in slide-in-from-top">
            <div className="container mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Monitor className="h-5 w-5 animate-pulse" />
                <div>
                  <p className="font-bold">⚠️ Eye Movement Detected!</p>
                  <p className="text-sm text-red-100">{gazeWarning}</p>
                </div>
              </div>
            </div>
          </div>
          <Alert variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-950 animate-in slide-in-from-top-5 shadow-lg">
          <Eye className="h-5 w-5 text-red-600 dark:text-red-400" />
          <AlertTitle>⚠️ Eye tracking warning</AlertTitle>
          <AlertDescription>{gazeWarning}</AlertDescription>
        </Alert>
        </>
      )}

      {!warning && status === 'ok' && faceCount === 1 && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <AlertTitle>Face Detection Active</AlertTitle>
          <AlertDescription>
            Your face is being detected correctly. Current emotion: <strong>{emotion?.label ?? 'unknown'}</strong>.
          </AlertDescription>
        </Alert>
      )}

      {status === 'ok' && faceCount === 1 && emotionEntries.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="text-sm font-semibold text-card-foreground mb-3">Emotion probabilities (debug)</h4>
          <div className="space-y-2">
            {emotionEntries.map(([label, prob]) => (
              <div key={label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground">{Math.round(prob * 100)}%</span>
                </div>
                <div className="h-2 w-full rounded bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, prob * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

