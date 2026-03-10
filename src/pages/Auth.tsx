import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import SEO from '@/components/SEO';
import { getEmailRedirectUrl, CONFIRMATION_PATHS } from '@/utils/redirectUrls';
import { z } from 'zod';
import { useTranslation } from '@/hooks/useTranslation';
import { ResendConfirmationButton } from '@/components/auth/ResendConfirmationButton';

// Input validation schemas
const emailSchema = z.string()
  .trim()
  .email({ message: "Please enter a valid email address" })
  .max(255, { message: "Email must be less than 255 characters" });

const passwordSchema = z.string()
  .min(6, { message: "Password must be at least 6 characters" })
  .max(72, { message: "Password must be less than 72 characters" });

const fullNameSchema = z.string()
  .trim()
  .min(2, { message: "Name must be at least 2 characters" })
  .max(100, { message: "Name must be less than 100 characters" });

// Friendly error message mapping
const getAuthErrorMessage = (error: any): string => {
  const errorMsg = error?.message || '';
  
  console.error('[Auth] Error:', errorMsg);
  
  // Network errors
  if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
    return 'Network error. Please check your internet connection and try again.';
  }
  
  // Rate limiting
  if (errorMsg.includes('rate limit') || errorMsg.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  
  // Sign up errors
  if (errorMsg.includes('User already registered')) {
    return 'This email is already registered. Please sign in instead.';
  }
  
  if (errorMsg.includes('Password should be at least')) {
    return 'Password must be at least 6 characters long.';
  }
  
  // Sign in errors
  if (errorMsg.includes('Invalid login credentials') || errorMsg.includes('Invalid email or password')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  
  if (errorMsg.includes('Email not confirmed')) {
    return 'Please verify your email address before signing in. Check your inbox for a confirmation link.';
  }
  
  // General errors
  if (errorMsg.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }
  
  // Default fallback
  return errorMsg || 'An unexpected error occurred. Please try again.';
};

export default function Auth() {
  const navigate = useNavigate();
  const { translate } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [signupEmail, setSignupEmail] = useState<string | null>(null);
  const [signInEmailNotConfirmed, setSignInEmailNotConfirmed] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/home');
      }
    };
    checkAuth();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate inputs
      const emailValidation = emailSchema.safeParse(email);
      if (!emailValidation.success) {
        throw new Error(emailValidation.error.errors[0].message);
      }

      const passwordValidation = passwordSchema.safeParse(password);
      if (!passwordValidation.success) {
        throw new Error(passwordValidation.error.errors[0].message);
      }

      const nameValidation = fullNameSchema.safeParse(fullName);
      if (!nameValidation.success) {
        throw new Error(nameValidation.error.errors[0].message);
      }

      console.log('[Auth] Attempting sign up for:', email);

      const { error: signUpError } = await supabase.auth.signUp({
        email: emailValidation.data,
        password: passwordValidation.data,
        options: {
          emailRedirectTo: getEmailRedirectUrl(CONFIRMATION_PATHS.auth),
          data: {
            full_name: nameValidation.data,
          },
        },
      });

      if (signUpError) {
        console.error('[Auth] Sign up error:', signUpError);
        throw signUpError;
      }

      console.log('[Auth] Sign up successful');

      // Track email for resend button
      setSignupEmail(emailValidation.data);
      
      // Show success message for email verification
      setError('✅ Registration successful! Please check your email for a confirmation link to activate your account.');
      
      // Clear form fields
      setEmail('');
      setPassword('');
      setFullName('');
      
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate inputs
      const emailValidation = emailSchema.safeParse(email);
      if (!emailValidation.success) {
        throw new Error(emailValidation.error.errors[0].message);
      }

      const passwordValidation = passwordSchema.safeParse(password);
      if (!passwordValidation.success) {
        throw new Error(passwordValidation.error.errors[0].message);
      }

      console.log('[Auth] Attempting sign in for:', email);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: emailValidation.data,
        password: passwordValidation.data,
      });

      if (signInError) {
        console.error('[Auth] Sign in error:', signInError);
        if (signInError.message?.includes('Email not confirmed')) {
          setSignInEmailNotConfirmed(true);
          setSignupEmail(emailValidation.data);
        }
        throw signInError;
      }

      setSignInEmailNotConfirmed(false);
      console.log('[Auth] Sign in successful');
      navigate('/home');
      
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getEmailRedirectUrl('/home'),
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('OAuth error:', err);
      setError(getAuthErrorMessage(err));
    }
  };

  return (
    <>
      <SEO 
        title="Sign In - VITANA Health Platform"
        description="Access your VITANA health dashboard. Sign in or create an account to track your wellness journey, view lab results, and discover personalized health insights."
      />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {translate('authPage.welcomeTitle', 'Welcome to VITANA')}
            </CardTitle>
            <CardDescription>
              {translate('authPage.subtitle', 'Your personalized health intelligence platform')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{translate('authPage.signIn', 'Sign In')}</TabsTrigger>
                <TabsTrigger value="signup">{translate('authPage.signUp', 'Sign Up')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{translate('authPage.email', 'Email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={translate('authPage.enterEmail', 'Enter your email')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">{translate('authPage.password', 'Password')}</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={translate('authPage.enterPassword', 'Enter your password')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {error && (
                    <Alert variant={error.startsWith('✅') ? 'default' : error.includes('check your email') ? 'default' : 'destructive'} 
                           className={error.startsWith('✅') ? 'border-green-500 bg-green-50 text-green-700' : ''}>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  {signInEmailNotConfirmed && signupEmail && (
                    <ResendConfirmationButton email={signupEmail} redirectUrl={getEmailRedirectUrl(CONFIRMATION_PATHS.auth)} />
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {translate('authPage.signIn', 'Sign In')}
                  </Button>
                  
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">{translate('authPage.orContinueWith', 'Or continue with')}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSocialLogin('google')}
                      disabled={isLoading}
                      className="w-full"
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M21.35 11.1h-9.17v2.98h5.44c-.24 1.38-1.65 4.04-5.44 4.04-3.28 0-5.96-2.71-5.96-6.05s2.68-6.05 5.96-6.05c1.87 0 3.12.79 3.84 1.47l2.62-2.53C17.51 3.26 15.35 2.4 13 2.4 7.98 2.4 3.94 6.46 3.94 11.5S7.98 20.6 13 20.6c7.47 0 8.94-6.05 8.34-9.5z"
                        />
                      </svg>
                      Google
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSocialLogin('apple')}
                      disabled={isLoading}
                      className="w-full"
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M16.365 1.43c0 1.14-.42 2.13-1.26 2.97-.96.96-2.06 1.52-3.3 1.47-.06-1.17.42-2.19 1.26-3.03.9-.9 2.1-1.47 3.3-1.41zm5.22 16.29c-.6 1.47-1.38 2.73-2.28 3.69-1.02 1.08-2.16 1.65-3.42 1.68-1.02.03-1.71-.3-2.49-.66-.6-.3-1.23-.6-2.04-.6-.84 0-1.47.3-2.1.6-.78.36-1.53.72-2.55.69-1.29-.03-2.4-.57-3.42-1.65-1.14-1.2-2.07-2.76-2.82-4.74-.96-2.49-1.44-4.89-1.44-7.17 0-2.1.48-3.93 1.47-5.46C1.965 3.9 3.315 3 4.845 2.97c.96-.03 1.86.33 2.67.78.6.33 1.17.63 1.77.63.57 0 1.11-.3 1.74-.63.84-.45 1.77-.93 2.94-.81 1.89.18 3.24 1.02 4.17 2.52-1.65 1.02-2.49 2.46-2.46 4.32.03 1.77.96 3.27 2.43 4.11.72.42 1.53.66 2.43.69-.21.66-.45 1.29-.78 1.95z"
                        />
                      </svg>
                      Apple
                    </Button>
                  </div>

                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">{translate('authPage.fullName', 'Full Name')}</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder={translate('authPage.enterFullName', 'Enter your full name')}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signupEmail">{translate('authPage.email', 'Email')}</Label>
                    <Input
                      id="signupEmail"
                      type="email"
                      placeholder={translate('authPage.enterEmail', 'Enter your email')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signupPassword">{translate('authPage.password', 'Password')}</Label>
                    <div className="relative">
                      <Input
                        id="signupPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={translate('authPage.createPassword', 'Create a password')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                   {error && (
                    <Alert variant={error.startsWith('✅') ? 'default' : error.includes('check your email') ? 'default' : 'destructive'}
                           className={error.startsWith('✅') ? 'border-green-500 bg-green-50 text-green-700' : ''}>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  {signupEmail && error?.startsWith('✅') && (
                    <ResendConfirmationButton email={signupEmail} redirectUrl={getEmailRedirectUrl(CONFIRMATION_PATHS.auth)} />
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {translate('authPage.createAccount', 'Create Account')}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
}