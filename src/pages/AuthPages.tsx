import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";

const providers = [
  { name: "Google", icon: (
      <svg aria-hidden className="h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.17v2.98h5.44c-.24 1.38-1.65 4.04-5.44 4.04-3.28 0-5.96-2.71-5.96-6.05s2.68-6.05 5.96-6.05c1.87 0 3.12.79 3.84 1.47l2.62-2.53C17.51 3.26 15.35 2.4 13 2.4 7.98 2.4 3.94 6.46 3.94 11.5S7.98 20.6 13 20.6c7.47 0 8.94-6.05 8.34-9.5z"/></svg>
    ) },
  { name: "Apple", icon: (
      <svg aria-hidden className="h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M16.365 1.43c0 1.14-.42 2.13-1.26 2.97-.96.96-2.06 1.52-3.3 1.47-.06-1.17.42-2.19 1.26-3.03.9-.9 2.1-1.47 3.3-1.41zm5.22 16.29c-.6 1.47-1.38 2.73-2.28 3.69-1.02 1.08-2.16 1.65-3.42 1.68-1.02.03-1.71-.3-2.49-.66-.6-.3-1.23-.6-2.04-.6-.84 0-1.47.3-2.1.6-.78.36-1.53.72-2.55.69-1.29-.03-2.4-.57-3.42-1.65-1.14-1.2-2.07-2.76-2.82-4.74-.96-2.49-1.44-4.89-1.44-7.17 0-2.1.48-3.93 1.47-5.46C1.965 3.9 3.315 3 4.845 2.97c.96-.03 1.86.33 2.67.78.6.33 1.17.63 1.77.63.57 0 1.11-.3 1.74-.63.84-.45 1.77-.93 2.94-.81 1.89.18 3.24 1.02 4.17 2.52-1.65 1.02-2.49 2.46-2.46 4.32.03 1.77.96 3.27 2.43 4.11.72.42 1.53.66 2.43.69-.21.66-.45 1.29-.78 1.95z"/></svg>
    ) },
  { name: "Microsoft", icon: (
      <svg aria-hidden className="h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M11 11H3V3h8v8zm10 0h-8V3h8v8zM11 21H3v-8h8v8zm10 0h-8v-8h8v8z"/></svg>
    ) },
];

const AuthPage = ({ mode }: { mode: "login" | "register" }) => {
  const navigate = useNavigate();

  useEffect(() => {
    // SEO
    // handled by component below
  }, []);

  const handleProvider = (provider: string) => {
    // Mock navigation to dashboard
    navigate("/dashboard");
  };

  const title = mode === "login" ? "Login | VITANA" : "Register | VITANA";
  const description = mode === "login" ? "Login to VITANA" : "Create your VITANA account";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <SEO title={title} description={description} canonical={window.location.href} />
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-center mb-2">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">Continue with a provider</p>

        <div className="grid gap-3">
          {providers.map((p) => (
            <Button key={p.name} variant="outline" className="w-full justify-center" onClick={() => handleProvider(p.name)}>
              {p.icon}
              <span>Continue with {p.name}</span>
            </Button>
          ))}
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <span>
              Don&apos;t have an account? <Link className="text-primary underline-offset-4 hover:underline" to="/register">Register</Link>
            </span>
          ) : (
            <span>
              Already have an account? <Link className="text-primary underline-offset-4 hover:underline" to="/login">Login</Link>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const Login = () => <AuthPage mode="login" />;
export const Register = () => <AuthPage mode="register" />;
