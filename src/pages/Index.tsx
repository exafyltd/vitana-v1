import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <SEO title="VITANA – Digital Solutions" description="Welcome to VITANA. Experience innovation and excellence with our cutting-edge platform." canonical={window.location.href} />
      
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-6xl font-bold text-foreground mb-4">VITANA</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Digital Solutions for Your Wellness Journey
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12">
            Experience innovation and excellence with our cutting-edge platform designed to transform your health and wellness experience.
          </p>
          
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
              <Link to="/home">Enter Platform</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
