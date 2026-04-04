import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Briefcase, Check, Code, LineChart, Users } from "lucide-react";
import { Link } from "react-router-dom";
import ResumeUpload from "@/components/ResumeUpload";
import { cn } from "@/lib/utils";

type InterviewTemplateId =
  | "general"
  | "technical"
  | "product_management"
  | "leadership";

const TEMPLATE_META: {
  id: InterviewTemplateId;
  title: string;
  description: string;
  icon: typeof Briefcase;
  color: string;
}[] = [
  {
    id: "general",
    icon: Briefcase,
    title: "General Interview",
    description: "Behavioral and situational questions",
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "technical",
    icon: Code,
    title: "Technical Interview",
    description: "Engineering depth, systems, and problem solving",
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "product_management",
    icon: LineChart,
    title: "Product Management",
    description: "Strategy, roadmaps, metrics, and stakeholders",
    color: "from-green-500 to-emerald-500",
  },
  {
    id: "leadership",
    icon: Users,
    title: "Leadership Interview",
    description: "People leadership and cross-functional influence",
    color: "from-orange-500 to-red-500",
  },
];

const templateLabel = (id: InterviewTemplateId) =>
  TEMPLATE_META.find((t) => t.id === id)?.title ?? id;

const Practice = () => {
  const [tab, setTab] = useState<"template" | "custom">("template");
  const [selectedTemplate, setSelectedTemplate] = useState<InterviewTemplateId | null>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [generateStatus, setGenerateStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateWarning, setGenerateWarning] = useState<string | null>(null);

  const resumeUploadAllowed =
    tab === "custom" || (tab === "template" && selectedTemplate !== null);

  const handleResumeParsed = async (resumeText: string) => {
    if (!resumeText) return;
    if (!resumeUploadAllowed) return;

    setGenerateStatus("loading");
    setGenerateError(null);
    setGenerateWarning(null);

    const body: Record<string, string> = {
      resume_text: resumeText,
    };

    if (tab === "template" && selectedTemplate) {
      body.interview_type = selectedTemplate;
      localStorage.setItem("interviewTypeKey", selectedTemplate);
      localStorage.setItem("interviewTypeLabel", templateLabel(selectedTemplate));
    } else {
      body.interview_type = "custom";
      body.target_role = selectedRole.trim();
      body.experience_level = selectedLevel.trim();
      body.target_company = targetCompany.trim();
      localStorage.setItem("interviewTypeKey", "custom");
      localStorage.setItem(
        "interviewTypeLabel",
        selectedRole.trim()
          ? `Custom — ${selectedRole.trim()}`
          : "Custom interview",
      );
    }

    try {
      const res = await fetch("http://localhost:5000/api/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
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
        localStorage.setItem("interviewSessionId", crypto.randomUUID());
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Choose Your Interview
            </h1>
            <p className="text-xl text-muted-foreground">
              Pick a template or a custom interview — only one mode at a time — then upload your resume to
              generate questions.
            </p>
          </div>

          <Tabs
            value={tab}
            onValueChange={(v) => {
              const next = v as "template" | "custom";
              setTab(next);
              setGenerateStatus("idle");
              setGenerateError(null);
              setGenerateWarning(null);
              if (next === "custom") {
                setSelectedTemplate(null);
              }
            }}
            className="mb-10"
          >
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 h-11">
              <TabsTrigger value="template" className="text-sm sm:text-base">
                Template interview
              </TabsTrigger>
              <TabsTrigger value="custom" className="text-sm sm:text-base">
                Custom interview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="template" className="mt-6 outline-none">
              <div className="grid md:grid-cols-2 gap-6">
                {TEMPLATE_META.map((type) => {
                  const selected = selectedTemplate === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        setSelectedTemplate(type.id);
                        setGenerateStatus("idle");
                        setGenerateError(null);
                        setGenerateWarning(null);
                      }}
                      className={cn(
                        "text-left rounded-xl border transition-all p-6",
                        "hover:shadow-[var(--card-shadow-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selected
                          ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                          : "border-border bg-card",
                      )}
                    >
                      <div
                        className={`w-12 h-12 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center mb-4`}
                      >
                        <type.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-xl font-semibold text-card-foreground mb-2">{type.title}</h3>
                        {selected && (
                          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-primary">
                            <Check className="w-4 h-4" /> Selected
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground text-sm">{type.description}</p>
                    </button>
                  );
                })}
              </div>
              {!selectedTemplate && (
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Select one template above, then upload your resume to generate questions.
                </p>
              )}
            </TabsContent>

            <TabsContent value="custom" className="mt-6 outline-none">
              <Card className="p-8 border border-border max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold text-card-foreground mb-2">Customize your interview</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Questions will be tailored to your resume and the role details below.
                </p>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <Label htmlFor="role">Target role</Label>
                    <Input
                      id="role"
                      placeholder="e.g., Software Engineer, Product Manager"
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="level">Experience level</Label>
                    <Select value={selectedLevel || undefined} onValueChange={setSelectedLevel}>
                      <SelectTrigger id="level">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entry">Entry level (0–2 years)</SelectItem>
                        <SelectItem value="mid">Mid level (3–5 years)</SelectItem>
                        <SelectItem value="senior">Senior (6–10 years)</SelectItem>
                        <SelectItem value="lead">Lead / Principal (10+ years)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 mb-2">
                  <Label htmlFor="company">Target company (optional)</Label>
                  <Input
                    id="company"
                    placeholder="e.g., Google, Microsoft"
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                  />
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <Card className="p-8 border border-border mb-8 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-card-foreground mb-2">Upload your resume</h2>
            <p className="text-sm text-muted-foreground mb-6">
              {tab === "template" && !selectedTemplate && (
                <>Choose a template first, then upload your resume.</>
              )}
              {tab === "template" && selectedTemplate && (
                <>
                  Generating <strong>{templateLabel(selectedTemplate)}</strong> questions from your resume.
                </>
              )}
              {tab === "custom" && <>Generating custom role-focused questions from your resume and details.</>}
            </p>
            <ResumeUpload onParsed={handleResumeParsed} disabled={!resumeUploadAllowed} />
            {!resumeUploadAllowed && (
              <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                Resume upload is disabled until you complete the step above.
              </p>
            )}
            {generateStatus === "loading" && (
              <p className="mt-4 text-sm text-muted-foreground">Generating questions…</p>
            )}
            {generateStatus === "success" && (
              <p className="mt-4 text-sm text-green-600 dark:text-green-400">
                Questions generated. Open the Interview page to start.
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
            {generateStatus === "success" && (
              <div className="mt-6">
                <Link to="/interview">
                  <Button variant="hero" size="lg" className="w-full sm:w-auto">
                    Start interview
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Practice;
