import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import FeatureCard from "@/components/FeatureCard";
import { ArrowRight, Brain, Video, BarChart3, Target, Clock, Award } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-interview.jpg";

const Home = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                AI-Powered Interview Practice
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Master Your Next Interview with AI
              </h1>
              <p className="text-xl text-muted-foreground">
                Practice with realistic AI-powered mock interviews. Get instant feedback, improve your skills, and land your dream job.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/practice">
                  <Button variant="hero" size="lg" className="group">
                    Start Practicing
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Button variant="outline" size="lg">
                  Watch Demo
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-3xl blur-3xl"></div>
              <img
                src={heroImage}
                alt="Professional interview preparation"
                className="relative rounded-3xl shadow-[var(--card-shadow-hover)] w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Why Choose InterviewAI?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to ace your interviews, powered by advanced AI technology
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={Brain}
              title="AI-Powered Questions"
              description="Get realistic interview questions tailored to your role and industry, powered by advanced AI."
            />
            <FeatureCard
              icon={Video}
              title="Real-time Feedback"
              description="Receive instant analysis of your responses, including tone, confidence, and content quality."
            />
            <FeatureCard
              icon={BarChart3}
              title="Performance Analytics"
              description="Track your progress with detailed analytics and insights to identify areas for improvement."
            />
            <FeatureCard
              icon={Target}
              title="Custom Practice Plans"
              description="Personalized interview scenarios based on your target companies and positions."
            />
            <FeatureCard
              icon={Clock}
              title="Flexible Scheduling"
              description="Practice anytime, anywhere. No scheduling conflicts or time zone hassles."
            />
            <FeatureCard
              icon={Award}
              title="Proven Results"
              description="Join thousands of successful candidates who improved their interview skills with us."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="bg-gradient-to-r from-primary to-secondary rounded-3xl p-12 text-center text-primary-foreground">
            <h2 className="text-4xl font-bold mb-4">
              Ready to Transform Your Interview Skills?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Start practicing today and see the difference AI-powered coaching can make.
            </p>
            <Link to="/practice">
              <Button variant="secondary" size="lg" className="bg-white text-primary hover:bg-white/90">
                Get Started Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2025 InterviewAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
