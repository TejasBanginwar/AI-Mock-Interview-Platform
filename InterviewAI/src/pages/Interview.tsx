import { useEffect, useRef, useState } from "react";
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
  /** Short upload to /api/save-answer-audio (no Whisper during interview). */
  const [isSavingAudio, setIsSavingAudio] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  /** One voice capture per question; after stop, mic stays off until next question. */
  const [recordingLocked, setRecordingLocked] = useState<boolean[]>([]);
  const questionIndexWhenRecordingStarted = useRef(0);
  const [interviewTypeLabel, setInterviewTypeLabel] = useState<string | null>(null);

  const getInterviewSessionId = (): string => {
    let id = localStorage.getItem("interviewSessionId");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("interviewSessionId", id);
    }
    return id;
  };

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
    setInterviewTypeLabel(localStorage.getItem("interviewTypeLabel"));
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

  useEffect(() => {
    if (questions.length === 0) return;
    setRecordingLocked((prev) => {
      const next = [...prev];
      for (let i = next.length; i < questions.length; i++) {
        next[i] = false;
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
    if (recordingLocked[currentQuestion]) return;

    // Stop recording
    if (isRecording && mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      return;
    }

    // Start recording
    try {
      setFeedbackError(null);
      questionIndexWhenRecordingStarted.current = currentQuestion;

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
        const qIdx = questionIndexWhenRecordingStarted.current;
        setRecordingLocked((prev) => {
          const next = [...prev];
          while (next.length <= qIdx) next.push(false);
          next[qIdx] = true;
          return next;
        });
        await saveAnswerAudio(blob, qIdx);
      };

      setMediaRecorder(recorder);
      setIsRecording(true);
      recorder.start();
    } catch (err) {
      console.error("Failed to start recording", err);
      setFeedbackError("Failed to access microphone. Please check browser permissions.");
    }
  };

  const saveAnswerAudio = async (blob: Blob, questionIndex: number) => {
    if (!questions.length) return;
    setIsSavingAudio(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob, "answer.webm");
      formData.append("session_id", getInterviewSessionId());
      formData.append("question_index", String(questionIndex));

      const res = await fetch("http://localhost:5000/api/save-answer-audio", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedbackError(data?.error || "Failed to save recording.");
        return;
      }
      setFeedbackError(null);
    } catch (err: unknown) {
      setFeedbackError(err instanceof Error ? err.message : "Failed to save recording.");
    } finally {
      setIsSavingAudio(false);
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  Mock Interview Session
                </h2>
                {interviewTypeLabel && (
                  <p className="text-sm text-muted-foreground mt-1">{interviewTypeLabel}</p>
                )}
              </div>
              <span className="text-muted-foreground shrink-0">
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
                Type your answer and/or record voice. Recordings are saved immediately; speech-to-text runs after you finish the interview.
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
                  disabled={isSavingAudio || (!!recordingLocked[currentQuestion] && !isRecording)}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-5 h-5 mr-2" />
                      Stop Recording
                    </>
                  ) : recordingLocked[currentQuestion] ? (
                    <>
                      <Mic className="w-5 h-5 mr-2" />
                      Voice answer saved
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5 mr-2" />
                      {isSavingAudio ? "Saving…" : "Start Recording"}
                    </>
                  )}
                </Button>
              </div>

              {isSavingAudio && (
                <p className="text-sm text-muted-foreground">
                  Uploading recording…
                </p>
              )}

              {recordingLocked[currentQuestion] && !isRecording && !isSavingAudio && (
                <p className="text-sm text-muted-foreground">
                  Recording stored. It will be transcribed with Whisper when you complete the interview.
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
                  disabled={!answer.trim() && !recordingLocked[currentQuestion] && !isRecording}
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
                  disabled={!answer.trim() && !recordingLocked[currentQuestion] && !isRecording}
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
