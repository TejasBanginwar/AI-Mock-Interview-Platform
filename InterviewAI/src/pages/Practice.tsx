import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Briefcase, Code, LineChart, Users } from "lucide-react";
import { Link } from "react-router-dom";

const Practice = () => {
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");

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
