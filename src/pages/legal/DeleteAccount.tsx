import { useState } from "react";
import { ArrowLeft, Trash2, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import SEO from "@/components/SEO";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

type Step = "info" | "confirm" | "deleting" | "done" | "error";

const DeleteAccount = () => {
  const navigate = useNavigate();
  const { user, session, signOut, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>("info");
  const [confirmText, setConfirmText] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isConfirmValid = confirmText.trim().toUpperCase() === "DELETE";

  const handleDeleteRequest = async () => {
    setShowDialog(false);
    setStep("deleting");

    try {
      const { data, error } = await supabase.functions.invoke("request-account-deletion", {
        body: {},
      });

      if (error) {
        throw new Error(error.message || "Request failed");
      }

      if (!data?.ok) {
        throw new Error(data?.error || "Deletion failed");
      }

      // Sign out locally after successful deletion
      try {
        await signOut();
      } catch {
        // User is already deleted server-side, local sign-out may fail — that's ok
      }

      setStep("done");
    } catch (err: any) {
      console.error("[DeleteAccount] Error:", err);
      setErrorMsg(err.message || "Something went wrong. Please try again.");
      setStep("error");
    }
  };

  // Not logged in state
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-background">
        <SEO
          title="Delete Your Account | Maxina"
          description="Delete your Maxina account and associated personal data."
          canonical="https://vitanaland.com/delete-account"
        />
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Delete Account</h1>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-16 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Sign in required</h2>
          <p className="text-muted-foreground mb-6">
            You need to sign in to your account before you can request deletion.
          </p>
          <Button onClick={() => navigate("/maxina")} className="w-full max-w-xs">
            Sign In
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Delete Your Account | Maxina"
        description="Delete your Maxina account and associated personal data."
        canonical="https://vitanaland.com/delete-account"
      />

      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Delete Account</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 md:py-12">
        {/* Step: Info */}
        {step === "info" && (
          <Card className="border-destructive/20">
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 className="h-7 w-7 text-destructive" />
              </div>
              <CardTitle className="text-xl">Delete Your Account</CardTitle>
              <CardDescription className="text-sm">
                This action is permanent and cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-destructive/5 p-4 space-y-2 text-sm text-foreground/80">
                <p className="font-medium text-foreground">When you delete your account:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Your profile and personal data will be permanently removed</li>
                  <li>Your chat history and conversations will be deleted</li>
                  <li>Any active subscriptions will be cancelled</li>
                  <li>You will lose access to all community features</li>
                  <li>This cannot be reversed</li>
                </ul>
              </div>

              <p className="text-xs text-muted-foreground">
                Some information may be retained if required by law, in accordance with our{" "}
                <Link to="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>.
              </p>

              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setStep("confirm")}
              >
                Delete My Account
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && (
          <Card className="border-destructive/20">
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-7 w-7 text-destructive" />
              </div>
              <CardTitle className="text-xl">Are you sure?</CardTitle>
              <CardDescription className="text-sm">
                Type <span className="font-mono font-bold text-destructive">DELETE</span> below to confirm account deletion.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder='Type "DELETE" to confirm'
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="text-center font-mono text-lg tracking-widest"
                autoFocus
              />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setConfirmText("");
                    setStep("info");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={!isConfirmValid}
                  onClick={() => setShowDialog(true)}
                >
                  Permanently Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Deleting */}
        {step === "deleting" && (
          <div className="text-center py-16 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-destructive mx-auto" />
            <p className="text-foreground font-medium">Deleting your account...</p>
            <p className="text-sm text-muted-foreground">Please do not close this page.</p>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <Card>
            <CardContent className="text-center py-10 space-y-4">
              <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
              <h2 className="text-xl font-semibold text-foreground">Account Deleted</h2>
              <p className="text-muted-foreground text-sm">
                Your account and associated data have been permanently deleted.
              </p>
              <Button variant="outline" onClick={() => navigate("/")} className="mt-4">
                Return to Home
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Error */}
        {step === "error" && (
          <Card className="border-destructive/20">
            <CardContent className="text-center py-10 space-y-4">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
              <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
              <p className="text-muted-foreground text-sm">{errorMsg}</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => setStep("info")}>
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => navigate(-1)}>
                  Go Back
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Final confirmation dialog */}
      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Final Confirmation</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRequest}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Delete My Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeleteAccount;
