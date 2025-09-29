import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useSearchParams } from "react-router-dom";

export function useEmailConfirmation() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for confirmation-related URL parameters
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (errorParam) {
      if (errorParam === 'access_denied') {
        setError('Email confirmation was cancelled or the link has expired.');
      } else if (errorDescription?.includes('Email link is invalid or has expired')) {
        setError('The confirmation link has expired. Please request a new one.');
      } else {
        setError(errorDescription || 'An error occurred during email confirmation.');
      }
      setIsLoading(false);
      return;
    }

    // Wait for auth to load
    if (!authLoading) {
      if (!user) {
        setError('Please sign in to continue.');
      }
      setIsLoading(false);
    }
  }, [user, authLoading, searchParams]);

  return {
    user,
    isLoading: isLoading || authLoading,
    error
  };
}