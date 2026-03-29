import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import SEO from "@/components/SEO";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEmailRedirectUrl, CONFIRMATION_PATHS } from '@/utils/redirectUrls';


const providers = [
  {
    name: "Google",
    icon: (
      <svg aria-hidden className="h-5 w-5" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M21.35 11.1h-9.17v2.98h5.44c-.24 1.38-1.65 4.04-5.44 4.04-3.28 0-5.96-2.71-5.96-6.05s2.68-6.05 5.96-6.05c1.87 0 3.12.79 3.84 1.47l2.62-2.53C17.51 3.26 15.35 2.4 13 2.4 7.98 2.4 3.94 6.46 3.94 11.5S7.98 20.6 13 20.6c7.47 0 8.94-6.05 8.34-9.5z"
        />
      </svg>
    ),
  },
  {
    name: "Apple",
    icon: (
      <svg aria-hidden className="h-5 w-5" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M16.365 1.43c0 1.14-.42 2.13-1.26 2.97-.96.96-2.06 1.52-3.3 1.47-.06-1.17.42-2.19 1.26-3.03.9-.9 2.1-1.47 3.3-1.41zm5.22 16.29c-.6 1.47-1.38 2.73-2.28 3.69-1.02 1.08-2.16 1.65-3.42 1.68-1.02.03-1.71-.3-2.49-.66-.6-.3-1.23-.6-2.04-.6-.84 0-1.47.3-2.1.6-.78.36-1.53.72-2.55.69-1.29-.03-2.4-.57-3.42-1.65-1.14-1.2-2.07-2.76-2.82-4.74-.96-2.49-1.44-4.89-1.44-7.17 0-2.1.48-3.93 1.47-5.46C1.965 3.9 3.315 3 4.845 2.97c.96-.03 1.86.33 2.67.78.6.33 1.17.63 1.77.63.57 0 1.11-.3 1.74-.63.84-.45 1.77-.93 2.94-.81 1.89.18 3.24 1.02 4.17 2.52-1.65 1.02-2.49 2.46-2.46 4.32.03 1.77.96 3.27 2.43 4.11.72.42 1.53.66 2.43.69-.21.66-.45 1.29-.78 1.95z"
        />
      </svg>
    ),
  },
  {
    name: "X",
    icon: (
      <svg aria-hidden className="h-5 w-5" viewBox="0 0 24 24" fill="none">
        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
];

const AuthPage = ({ mode }: { mode: "login" | "register" }) => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const isRegister = mode === "register";

  useEffect(() => {
    // SEO handled by component below
  }, []);

  const handleProvider = async (provider: string) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider.toLowerCase() as any,
        options: {
          redirectTo: getEmailRedirectUrl('/dashboard')
        }
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('OAuth error:', error.message);
      // TODO: Add proper error handling UI
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;

    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
            emailRedirectTo: getEmailRedirectUrl(CONFIRMATION_PATHS.auth)
          }
        });
        if (error) throw error;
        // TODO: Show success message for email confirmation
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error('Auth error:', error.message);
      // TODO: Add proper error handling UI
    }
  };

  const title = isRegister ? "Register | VITANA" : "Login | VITANA";
  const description = isRegister ? "Create your VITANA account" : "Login to VITANA";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 pb-32 md:pb-0">
      <SEO title={title} description={description} canonical={window.location.href} />
      <main className="w-full max-w-lg">
      
        <article className="w-full rounded-3xl border bg-card p-8 md:p-10 shadow-sm">
          <header className="text-center space-y-2 mb-6">
            <div className="mx-auto flex items-center justify-center gap-2">
              <div aria-hidden className="h-3 w-6 rounded-t-full bg-primary" />
              <span className="text-sm font-semibold tracking-wide">VITANA</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">
              {isRegister ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isRegister ? "Please enter your details to sign up" : "Please enter your details to sign in"}
            </p>
          </header>

          <section className="flex items-center justify-center gap-4 mb-6">
            {providers.map((p) => (
              <Button
                key={p.name}
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={() => handleProvider(p.name)}
                aria-label={`Continue with ${p.name}`}
              >
                {p.icon}
              </Button>
            ))}
          </section>

          <div className="flex items-center gap-4 mb-6">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="h-px bg-border flex-1" />
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            {isRegister && (
              <div className="grid gap-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" name="name" placeholder="Your full name" />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email">Your Email Address</Label>
              <Input id="email" name="email" type="email" placeholder="Your Email Address" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="************"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox 
                  id="keep-logged-in" 
                  checked={keepLoggedIn}
                  onCheckedChange={(checked) => setKeepLoggedIn(checked as boolean)}
                />
                <span className="text-muted-foreground cursor-pointer">
                  {isRegister ? "I agree to the terms" : "Keep me logged in"}
                </span>
              </label>
              <Link to="/dashboard" className="text-sm text-primary underline-offset-4 hover:underline">
                {isRegister ? "Need help?" : "Forgot password?"}
              </Link>
            </div>

            <Button type="submit" className="h-11 rounded-xl bg-foreground text-background hover:bg-foreground/90">
              {isRegister ? "Create account" : "Sign in"}
            </Button>
          </form>


          <footer className="mt-4 text-center text-sm text-muted-foreground">
            {isRegister ? (
              <span>
                Already have an account? {" "}
                <Link className="text-primary underline-offset-4 hover:underline" to="/login">
                  Login
                </Link>
              </span>
            ) : (
              <span>
                Don&apos;t have an account? {" "}
                <Link className="text-primary underline-offset-4 hover:underline" to="/register">
                  Sign up
                </Link>
              </span>
            )}
          </footer>
        </article>
      </main>
    </div>
  );
};

export const Login = () => <AuthPage mode="login" />;
export const Register = () => <AuthPage mode="register" />;
