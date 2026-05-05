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
import { useSupabaseOAuthSignIn, type SupportedOAuthProvider } from "@/hooks/useSupabaseOAuthSignIn";
import { friendlyOAuthError } from "@/lib/oauthErrors";
import { toast } from "sonner";
import { t } from '@/lib/i18n-toast';


const providers = [
  {
    name: "Google",
    icon: (
      <svg aria-hidden className="h-5 w-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
  },
  {
    name: "Apple",
    icon: (
      <svg aria-hidden className="h-5 w-5" viewBox="0 0 24 24">
        <path fill="currentColor" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11"/>
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
  const oauthSignIn = useSupabaseOAuthSignIn();

  useEffect(() => {
    // SEO handled by component below
  }, []);

  const handleProvider = async (provider: string) => {
    const normalized = provider.toLowerCase();
    const supported: SupportedOAuthProvider[] = ["apple", "google", "facebook", "azure"];
    if (!supported.includes(normalized as SupportedOAuthProvider)) {
      toast.error(`Sign-in with ${provider} isn't supported yet.`);
      return;
    }
    try {
      await oauthSignIn.mutateAsync({
        provider: normalized as SupportedOAuthProvider,
        redirectTo: getEmailRedirectUrl('/dashboard'),
      });
    } catch (err: any) {
      toast.error(friendlyOAuthError(err, provider));
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
            <span className="text-xs text-muted-foreground">{t('screens.authpages.text')}</span>
            <div className="h-px bg-border flex-1" />
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            {isRegister && (
              <div className="grid gap-2">
                <Label htmlFor="name">{t('screens.authpages.fullName')}</Label>
                <Input id="name" name="name" placeholder={t('screens.authpages.yourFullName')} />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email">{t('screens.authpages.yourEmailAddress')}</Label>
              <Input id="email" name="email" type="email" placeholder={t('screens.authpages.yourEmailAddress')} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">{t('screens.authpages.password')}</Label>
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
                  {t('screens.authpages.login')}
                </Link>
              </span>
            ) : (
              <span>
                Don&apos;t have an account? {" "}
                <Link className="text-primary underline-offset-4 hover:underline" to="/register">
                  {t('screens.authpages.signUp')}
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
