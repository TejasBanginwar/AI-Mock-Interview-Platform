import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Award, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { buildApiUrl } from "@/lib/api";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

type EmotionSlice = {
  name: "positivity" | "uncomfortable" | "happy";
  value: number;
};

const PIE_COLORS: Record<EmotionSlice["name"], string> = {
  positivity: "#22c55e",
  uncomfortable: "#ef4444",
  happy: "#eab308",
};

const Results = () => {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<string>("");
  const [emotionData, setEmotionData] = useState<EmotionSlice[]>([
    { name: "positivity", value: 0 },
    { name: "uncomfortable", value: 0 },
    { name: "happy", value: 0 },
  ]);
  const [emotionSamples, setEmotionSamples] = useState(0);

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

        const sessionId = localStorage.getItem("interviewSessionId");
        if (sessionId) {
          const key = `emotionSummary:${sessionId}`;
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              const bucket = parsed?.byBucket || {};
              const positivity = Number(bucket.positivity) || 0;
              const uncomfortable = Number(bucket.uncomfortable) || 0;
              const happy = Number(bucket.happy) || 0;
              setEmotionData([
                { name: "positivity", value: positivity },
                { name: "uncomfortable", value: uncomfortable },
                { name: "happy", value: happy },
              ]);
              setEmotionSamples(Number(parsed?.totalSamples) || (positivity + uncomfortable + happy));
            } catch {
              // ignore malformed emotion summary
            }
          }
        }

        const token = await getToken();
        const res = await fetch(buildApiUrl("/api/interview-report-transcribe"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            session_id: sessionId || undefined,
            questions,
            typed_answers: answers,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || "Failed to generate interview report.");
          setLoading(false);
          return;
        }
        setReport((data.report || "").trim());
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unexpected error while loading results.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [getToken]);

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
                Transcribing recordings with Whisper (if any) and generating your report… This may take a few minutes.
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

          <Card className="p-8 mb-8 border border-border">
            <h2 className="text-xl font-semibold text-card-foreground mb-2">Emotion analysis (entire interview)</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Pie chart split into positivity, uncomfortable, and happy from webcam emotion samples.
              {emotionSamples > 0 ? ` Total samples: ${emotionSamples}.` : " No samples captured yet."}
            </p>
            <div className="w-full h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={emotionData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    label={({ name, percent }) => `${name}: ${Math.round((percent || 0) * 100)}%`}
                  >
                    {emotionData.map((entry) => (
                      <Cell key={entry.name} fill={PIE_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value} samples`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
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
