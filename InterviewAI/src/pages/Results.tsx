import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Award, TrendingUp, Target, Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Results = () => {
  const overallScore = 85;
  
  const metrics = [
    { name: "Content Quality", score: 88, color: "text-green-500" },
    { name: "Communication", score: 90, color: "text-blue-500" },
    { name: "Confidence", score: 82, color: "text-purple-500" },
    { name: "Clarity", score: 85, color: "text-orange-500" },
  ];

  const feedback = [
    {
      question: "Tell me about yourself and your professional background.",
      strengths: [
        "Clear and structured response using chronological order",
        "Highlighted relevant achievements with specific metrics",
        "Confident tone and professional delivery",
      ],
      improvements: [
        "Could add more passion about current role",
        "Consider mentioning long-term career goals",
      ],
      score: 88,
    },
    {
      question: "What are your greatest strengths and how do they apply to this role?",
      strengths: [
        "Provided concrete examples for each strength",
        "Directly linked strengths to job requirements",
        "Used the STAR method effectively",
      ],
      improvements: [
        "Could be more concise in the introduction",
        "Add more quantifiable results",
      ],
      score: 85,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary mb-4">
              <Award className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Interview Complete!
            </h1>
            <p className="text-xl text-muted-foreground">
              Here's your detailed performance analysis
            </p>
          </div>

          {/* Overall Score */}
          <Card className="p-8 mb-8 border border-border text-center">
            <h2 className="text-2xl font-bold text-card-foreground mb-4">
              Overall Performance
            </h2>
            <div className="text-6xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4">
              {overallScore}%
            </div>
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
              Excellent Performance
            </Badge>
          </Card>

          {/* Detailed Metrics */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {metrics.map((metric, index) => (
              <Card key={index} className="p-6 border border-border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-card-foreground">{metric.name}</h3>
                  <span className={`text-xl font-bold ${metric.color}`}>
                    {metric.score}%
                  </span>
                </div>
                <Progress value={metric.score} className="h-2" />
              </Card>
            ))}
          </div>

          {/* Key Insights */}
          <Card className="p-8 mb-8 border border-border">
            <h2 className="text-2xl font-bold text-card-foreground mb-6">
              Key Insights
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-card-foreground mb-1">Strong Areas</h4>
                  <p className="text-sm text-muted-foreground">
                    Communication and content quality are your top strengths
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                  <Target className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <h4 className="font-semibold text-card-foreground mb-1">Focus Areas</h4>
                  <p className="text-sm text-muted-foreground">
                    Work on building more confidence in your delivery
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h4 className="font-semibold text-card-foreground mb-1">Timing</h4>
                  <p className="text-sm text-muted-foreground">
                    Your responses were well-paced and concise
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Detailed Feedback */}
          <div className="space-y-6 mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              Question-by-Question Analysis
            </h2>
            {feedback.map((item, index) => (
              <Card key={index} className="p-6 border border-border">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-card-foreground flex-1">
                    {item.question}
                  </h3>
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    {item.score}%
                  </Badge>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-green-600 mb-2">✓ Strengths</h4>
                    <ul className="space-y-1">
                      {item.strengths.map((strength, i) => (
                        <li key={i} className="text-sm text-muted-foreground pl-4">
                          • {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-orange-600 mb-2">→ Areas for Improvement</h4>
                    <ul className="space-y-1">
                      {item.improvements.map((improvement, i) => (
                        <li key={i} className="text-sm text-muted-foreground pl-4">
                          • {improvement}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/practice" className="flex-1">
              <Button variant="hero" size="lg" className="w-full">
                Practice Again
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="flex-1">
              Download Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;
