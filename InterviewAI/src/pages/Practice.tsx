import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Briefcase, Code, LineChart, Users } from "lucide-react";
import { Link } from "react-router-dom";
import ResumeUpload from "@/components/ResumeUpload";

const Practice = () => {
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [generateStatus, setGenerateStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateWarning, setGenerateWarning] = useState<string | null>(null);

  const handleResumeParsed = async (resumeText: string) => {
    if (!resumeText) return;
    setGenerateStatus("loading");
    setGenerateError(null);
    setGenerateWarning(null);
    try {
      const res = await fetch("http://localhost:5000/api/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resume_text: resumeText }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || "Failed to generate questions";
        setGenerateStatus("error");
        setGenerateError(msg);
        return;
      }
      const questions = Array.isArray(data?.questions) ? data.questions : [];
      if (questions.length > 0) {
        localStorage.setItem("interviewQuestions", JSON.stringify(questions));
        setGenerateStatus("success");
        if (typeof data?.warning === "string" && data.warning) {
          setGenerateWarning(data.warning);
        }
      } else {
        setGenerateStatus("error");
        setGenerateError("No questions returned from API.");
      }
    } catch (err: unknown) {
      setGenerateStatus("error");
      setGenerateError(err instanceof Error ? err.message : "Failed to generate questions");
    }
  };

  const interviewTypes = [
    {
      icon: Briefcase,
      title: "General Interview",
      description: "Common behavioral and situational questions",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Code,
      title: "Technical Interview",
      description: "Coding challenges and technical questions",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: LineChart,
      title: "Product Management",
      description: "Product strategy and case studies",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: Users,
      title: "Leadership Interview",
      description: "Management and team leadership scenarios",
      color: "from-orange-500 to-red-500",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Choose Your Interview Type
            </h1>
            <p className="text-xl text-muted-foreground">
              Select the type of interview you want to practice
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {interviewTypes.map((type, index) => (
              <Card
                key={index}
                className="p-6 hover:shadow-[var(--card-shadow-hover)] transition-all duration-300 cursor-pointer border border-border group"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center mb-4`}>
                  <type.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-card-foreground mb-2">
                  {type.title}
                </h3>
                <p className="text-muted-foreground mb-4">{type.description}</p>
                <Link to="/interview">
                  <Button variant="ghost" className="group-hover:text-primary">
                    Start Practice
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </Card>
            ))}
          </div>

          <Card className="p-8 border border-border mb-8">
            <h2 className="text-2xl font-bold text-card-foreground mb-6">
              Upload Your Resume (Beta)
            </h2>
            <ResumeUpload onParsed={handleResumeParsed} />
            {generateStatus === "loading" && (
              <p className="mt-4 text-sm text-muted-foreground">Generating questions from your resume…</p>
            )}
            {generateStatus === "success" && (
              <p className="mt-4 text-sm text-green-600 dark:text-green-400">
                Questions generated. Go to the Interview page to start.
              </p>
            )}
            {generateStatus === "success" && generateWarning && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                Using fallback questions: {generateWarning}
              </p>
            )}
            {generateStatus === "error" && generateError && (
              <p className="mt-4 text-sm text-red-500">{generateError}</p>
            )}
          </Card>

          <Card className="p-8 border border-border">
            <h2 className="text-2xl font-bold text-card-foreground mb-6">
              Customize Your Interview
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <Label htmlFor="role">Target Role</Label>
                <Input
                  id="role"
                  placeholder="e.g., Software Engineer, Product Manager"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="level">Experience Level</Label>
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger id="level">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                    <SelectItem value="mid">Mid Level (3-5 years)</SelectItem>
                    <SelectItem value="senior">Senior Level (6-10 years)</SelectItem>
                    <SelectItem value="lead">Lead/Principal (10+ years)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <Label htmlFor="company">Target Company (Optional)</Label>
              <Input
                id="company"
                placeholder="e.g., Google, Microsoft, Amazon"
              />
            </div>

            <Link to="/interview">
              <Button variant="hero" size="lg" className="w-full">
                Start Custom Interview
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Practice;
