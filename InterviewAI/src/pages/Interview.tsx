import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, SkipForward, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { FaceDetectionVideo } from "@/components/FaceDetectionVideo";
import { TabSwitchWarning } from "@/components/TabSwitchWarning";

const Interview = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answer, setAnswer] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("interviewQuestions");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuestions(parsed);
        }
      }
    } catch {
      // ignore parse errors and fall back to defaults
    }
  }, []);

  const progress = questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;

  // Keep answers array in sync with questions length
  useEffect(() => {
    if (questions.length === 0) return;
    setAnswers((prev) => {
      const next = [...prev];
      if (next.length < questions.length) {
        for (let i = next.length; i < questions.length; i++) {
          next[i] = next[i] ?? "";
        }
      }
      return next.slice(0, questions.length);
    });
  }, [questions]);

  // Persist answers so Results page can read them
  useEffect(() => {
    if (answers.length > 0) {
      localStorage.setItem("interviewAnswers", JSON.stringify(answers));
    }
  }, [answers]);

  const updateCurrentAnswer = (text: string) => {
    setAnswer(text);
    setAnswers((prev) => {
      const next = [...prev];
      next[currentQuestion] = text;
      return next;
    });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setAnswer(answers[currentQuestion + 1] || "");
      setIsRecording(false);
      setFeedbackError(null);
    }
  };

  const handleToggleRecording = async () => {
    if (!questions.length) return;

    // Stop recording
    if (isRecording && mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      return;
    }

    // Start recording
    try {
      setFeedbackError(null);
      setAnswer("");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        await sendAudioForEvaluation(blob);
      };

      setMediaRecorder(recorder);
      setIsRecording(true);
      recorder.start();
    } catch (err) {
      console.error("Failed to start recording", err);
      setFeedbackError("Failed to access microphone. Please check browser permissions.");
    }
  };

  const sendAudioForEvaluation = async (blob: Blob) => {
    if (!questions.length) return;
    setIsProcessingAudio(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob, "answer.webm");
      formData.append("question", questions[currentQuestion]);

      const res = await fetch("http://localhost:5000/api/evaluate-answer-audio", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedbackError(data?.error || "Failed to transcribe answer.");
        if (data?.transcript) {
          updateCurrentAnswer(data.transcript);
        }
        return;
      }
      if (data?.transcript) {
        updateCurrentAnswer(data.transcript);
      }
    } catch (err: any) {
      setFeedbackError(err?.message || "Failed to send audio for evaluation.");
    } finally {
      setIsProcessingAudio(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Tab Switch Warning */}
          <div className="mb-4">
            <TabSwitchWarning maxWarnings={5} />
          </div>

          {questions.length === 0 ? (
            <Card className="p-8 border border-border">
              <p className="text-muted-foreground mb-4">
                No interview questions yet. Upload your resume on the Practice page to generate questions (from Gemini or fallback).
              </p>
              <Link to="/practice">
                <Button variant="hero">Go to Practice</Button>
              </Link>
            </Card>
          ) : (
          <>
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-foreground">
                Mock Interview Session
              </h2>
              <span className="text-muted-foreground">
                Question {currentQuestion + 1} of {questions.length}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Face Detection Video */}
          <Card className="p-6 mb-6 border border-border">
            <h3 className="text-lg font-semibold mb-4">Camera Feed</h3>
            <FaceDetectionVideo />
          </Card>

          <Card className="p-8 mb-6 border border-border">
            <div className="mb-6">
              <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                Behavioral Question
              </div>
              <h3 className="text-2xl font-semibold text-card-foreground mb-4">
                {questions[currentQuestion]}
              </h3>
              <p className="text-muted-foreground">
                Take your time to think about your answer. You can type or use voice recording.
              </p>
            </div>

            <div className="space-y-4">
              <Textarea
                placeholder="Type your answer here or click the microphone to record..."
                value={answer}
                onChange={(e) => updateCurrentAnswer(e.target.value)}
                className="min-h-[200px] resize-none"
              />

              <div className="flex items-center gap-4">
                <Button
                  variant={isRecording ? "destructive" : "outline"}
                  size="lg"
                  onClick={handleToggleRecording}
                  className="flex-1"
                  disabled={isProcessingAudio}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-5 h-5 mr-2" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5 mr-2" />
                      {isProcessingAudio ? "Processing..." : "Start Recording"}
                    </>
                  )}
                </Button>
              </div>

              {isProcessingAudio && (
                <p className="text-sm text-muted-foreground">
                  Transcribing your answer and generating feedback…
                </p>
              )}

              {feedbackError && (
                <p className="text-sm text-red-500">
                  {feedbackError}
                </p>
              )}
            </div>
          </Card>

          <div className="flex items-center gap-4">
            {currentQuestion < questions.length - 1 ? (
              <>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleNext}
                  className="flex-1"
                >
                  Skip Question
                  <SkipForward className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  variant="hero"
                  size="lg"
                  onClick={handleNext}
                  className="flex-1"
                  disabled={!answer && !isRecording}
                >
                  Next Question
                </Button>
              </>
            ) : (
              <Link to="/results" className="w-full">
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full"
                  disabled={!answer && !isRecording}
                >
                  <Check className="w-5 h-5 mr-2" />
                  Complete Interview
                </Button>
              </Link>
            )}
          </div>

          <div className="mt-8 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold text-card-foreground mb-2">💡 Tips for a great answer:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Use the STAR method (Situation, Task, Action, Result)</li>
              <li>• Be specific with examples and numbers</li>
              <li>• Keep your answer between 1-2 minutes</li>
              <li>• Show enthusiasm and confidence</li>
            </ul>
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Interview;
