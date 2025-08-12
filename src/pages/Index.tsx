import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";

const Index = () => {
  return (
    <>
      <SEO title="VITANA – Digital Solutions" description="Welcome to VITANA. Experience innovation and excellence with our cutting-edge platform." canonical={window.location.href} />
      <header className="w-full border-b bg-background">
        <div className="mx-auto max-w-6xl flex items-center justify-between h-14 px-4">
          <Link to="/" className="text-lg font-semibold tracking-wide">VITANA</Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="outline"><Link to="/dashboard">Login</Link></Button>
            <Button asChild><Link to="/register">Register</Link></Button>
          </nav>
        </div>
      </header>

      <main className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-background">
        <section className="text-center px-6">
          <h1 className="text-6xl font-extrabold tracking-tight mb-4">VITANA</h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">Welcome to the future of digital solutions. Experience innovation and excellence with our cutting-edge platform.</p>
          <div className="flex items-center justify-center gap-3">
            <Button asChild size="lg"><Link to="/login">Get Started</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/login">Learn More</Link></Button>
          </div>
        </section>
      </main>
    </>
  );
};

export default Index;
