import { useState } from "react";
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

  const questions = [
    "Tell me about yourself and your professional background.",
    "What are your greatest strengths and how do they apply to this role?",
    "Describe a challenging project you worked on and how you overcame obstacles.",
    "Where do you see yourself in 5 years?",
    "Why are you interested in this position and our company?",
  ];

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setAnswer("");
      setIsRecording(false);
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
                onChange={(e) => setAnswer(e.target.value)}
                className="min-h-[200px] resize-none"
              />

              <div className="flex items-center gap-4">
                <Button
                  variant={isRecording ? "destructive" : "outline"}
                  size="lg"
                  onClick={() => setIsRecording(!isRecording)}
                  className="flex-1"
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-5 h-5 mr-2" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5 mr-2" />
                      Start Recording
                    </>
                  )}
                </Button>
              </div>
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
        </div>
      </div>
    </div>
  );
};

export default Interview;
