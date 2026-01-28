import { ArrowLeft } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";

const DeleteAccount = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Delete Your Account | Maxina"
        description="Learn how to request deletion of your Maxina account and associated personal data."
        canonical="https://vitanaland.com/delete-account"
      />
      
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Delete Account</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
            Delete Your Maxina Account
          </h1>

          <p className="text-foreground/90 leading-relaxed mb-8">
            Users of the Maxina mobile application may request deletion of their account and associated personal data at any time.
          </p>

          {/* How to Request */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            How to Request Account Deletion
          </h2>
          <p className="text-foreground/90 leading-relaxed mb-4">
            To request deletion of your Maxina account and related data, please contact us by email:
          </p>
          <p className="text-foreground/90 leading-relaxed mb-4">
            <a 
              href="mailto:support@exafy.io" 
              className="text-primary hover:underline font-medium"
            >
              support@exafy.io
            </a>
          </p>
          <p className="text-foreground/90 leading-relaxed mb-4">
            Please include the following information in your request:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/90 mb-6">
            <li>The email address used to register your Maxina account</li>
            <li>The subject line: <strong>"Account Deletion Request – Maxina"</strong></li>
          </ul>

          {/* What Happens Next */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            What Happens Next
          </h2>
          <p className="text-foreground/90 leading-relaxed mb-4">
            After receiving your request, we will verify your identity and process the deletion of your account and associated personal data.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            Some information may be retained if required by law or for legitimate business purposes (such as billing or security), in accordance with our{" "}
            <Link to="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>.
          </p>

          {/* Processing Time */}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mt-10 mb-4">
            Processing Time
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Account deletion requests are typically processed within 30 days.
          </p>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground">
              For more information about how we collect, use, and protect personal data, please refer to our{" "}
              <Link to="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>.
            </p>
          </div>
        </article>
      </main>
    </div>
  );
};

export default DeleteAccount;