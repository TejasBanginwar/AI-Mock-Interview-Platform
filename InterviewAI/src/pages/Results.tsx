import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Award, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Results = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      try {
        const storedQuestions = localStorage.getItem("interviewQuestions");
        const storedAnswers = localStorage.getItem("interviewAnswers");
        const questions: string[] = storedQuestions ? JSON.parse(storedQuestions) : [];
        const answers: string[] = storedAnswers ? JSON.parse(storedAnswers) : [];

        if (!Array.isArray(questions) || questions.length === 0) {
          setError("No questions found. Please complete an interview first.");
          setLoading(false);
          return;
        }

        const qa = questions.map((q, idx) => ({
          question: q,
          answer: (answers[idx] || "").trim(),
        })).filter(item => item.answer);

        if (qa.length === 0) {
          setError("No recorded answers were found for this interview.");
          setLoading(false);
          return;
        }

        const res = await fetch("http://localhost:5000/api/evaluate-interview-report", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ qa }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || "Failed to generate interview report.");
          setLoading(false);
          return;
        }
        setReport((data.report || "").trim());
      } catch (err: any) {
        setError(err?.message || "Unexpected error while loading results.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary mb-4">
              <Award className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Interview Complete!
            </h1>
            <p className="text-xl text-muted-foreground">
              Here’s your consolidated feedback report.
            </p>
          </div>

          <Card className="p-8 mb-8 border border-border">
            {loading && (
              <p className="text-muted-foreground">
                Generating your report from all answers…
              </p>
            )}
            {!loading && error && (
              <p className="text-sm text-red-500">
                {error}
              </p>
            )}
            {!loading && !error && (
              <div className="whitespace-pre-wrap text-sm text-card-foreground">
                {report}
              </div>
            )}
          </Card>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/practice" className="flex-1">
              <Button variant="hero" size="lg" className="w-full">
                Practice Again
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;
