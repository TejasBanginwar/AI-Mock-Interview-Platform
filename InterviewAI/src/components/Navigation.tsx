import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Mic, Menu, X } from "lucide-react";
import { useState } from "react";

const Navigation = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Mic className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">InterviewAI</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-foreground/80 hover:text-foreground transition-colors">
              Home
            </Link>
            <Link to="/practice" className="text-foreground/80 hover:text-foreground transition-colors">
              Practice
            </Link>
            <Link to="/results" className="text-foreground/80 hover:text-foreground transition-colors">
              My Results
            </Link>
            <Button variant="hero" size="sm">
              Start Interview
            </Button>
          </div>

          <button
            className="md:hidden text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 flex flex-col gap-4">
            <Link to="/" className="text-foreground/80 hover:text-foreground transition-colors">
              Home
            </Link>
            <Link to="/practice" className="text-foreground/80 hover:text-foreground transition-colors">
              Practice
            </Link>
            <Link to="/results" className="text-foreground/80 hover:text-foreground transition-colors">
              My Results
            </Link>
            <Button variant="hero" size="sm" className="w-full">
              Start Interview
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
