import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';
import { useTranslation } from '@/hooks/useTranslation';
import { markOnboardingComplete } from '@/hooks/useOnboardingStatus';

interface OnboardingNameFormProps {
  onComplete: () => void;
}

type HandleStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const HANDLE_PATTERN = /^[a-zA-Z0-9_]+$/;
const HANDLE_MIN = 3;
const HANDLE_MAX = 30;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, HANDLE_MAX);
}

export function OnboardingNameForm({ onComplete }: OnboardingNameFormProps) {
  const { translate } = useTranslation();
  const { user } = useAuth();
  // Pre-fill display name from auth metadata if available (email signup captures full_name)
  const metaName = user?.user_metadata?.full_name || user?.user_metadata?.name || '';
  const [displayName, setDisplayName] = useState(metaName);
  const [handle, setHandle] = useState(metaName ? slugify(metaName) : '');
  const [handleStatus, setHandleStatus] = useState<HandleStatus>('idle');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-suggest handle from display name (only if user hasn't typed a handle)
  const handleAutoSuggested = useRef(!metaName); // don't auto-suggest if pre-filled
  useEffect(() => {
    if (handleAutoSuggested.current && displayName) {
      setHandle(slugify(displayName));
    }
  }, [displayName]);

  const checkHandleAvailability = useCallback(async (value: string) => {
    if (!value || value.length < HANDLE_MIN) {
      setHandleStatus('idle');
      return;
    }
    if (!HANDLE_PATTERN.test(value)) {
      setHandleStatus('invalid');
      return;
    }

    setHandleStatus('checking');
    try {
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('handle', value.toLowerCase())
        .maybeSingle();

      if (queryError) {
        console.warn('[Onboarding] Handle check failed:', queryError.message);
        setHandleStatus('idle');
        return;
      }

      // Available if no row found, or if it's the current user's own handle
      if (!data || data.user_id === user?.id) {
        setHandleStatus('available');
      } else {
        setHandleStatus('taken');
      }
    } catch {
      setHandleStatus('idle');
    }
  }, [user?.id]);

  // Debounced handle validation
  useEffect(() => {
    if (checkTimer.current) clearTimeout(checkTimer.current);
    if (!handle || handle.length < HANDLE_MIN) {
      setHandleStatus('idle');
      return;
    }
    if (!HANDLE_PATTERN.test(handle)) {
      setHandleStatus('invalid');
      return;
    }
    checkTimer.current = setTimeout(() => checkHandleAvailability(handle), 400);
    return () => {
      if (checkTimer.current) clearTimeout(checkTimer.current);
    };
  }, [handle, checkHandleAvailability]);

  const handleHandleChange = (value: string) => {
    handleAutoSuggested.current = false;
    // Strip spaces and special chars on the fly
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, HANDLE_MAX);
    setHandle(cleaned);
  };

  const canSubmit =
    displayName.trim().length >= 2 &&
    handle.length >= HANDLE_MIN &&
    HANDLE_PATTERN.test(handle) &&
    handleStatus !== 'taken' &&
    handleStatus !== 'checking' &&
    !saving;

  const handleSubmit = async () => {
    if (!canSubmit || !user) return;
    setError('');
    setSaving(true);

    try {
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(
          {
            user_id: user.id,
            display_name: displayName.trim(),
            handle: handle.toLowerCase(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (upsertError) {
        // Handle unique constraint on handle
        if (upsertError.code === '23505' && upsertError.message?.includes('handle')) {
          setHandleStatus('taken');
          setError('This username is already taken. Please choose another.');
          setSaving(false);
          return;
        }
        throw upsertError;
      }

      // Also update app_users display_name for gateway compatibility
      await supabase
        .from('app_users')
        .update({
          display_name: displayName.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) console.warn('[Onboarding] app_users update failed:', error.message);
        });

      markOnboardingComplete(user.id);
      onComplete();
    } catch (err: any) {
      console.error('[Onboarding] Save failed:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full max-w-md mx-auto px-4"
    >
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-[#FF7BAC] to-[#C084FC] flex items-center justify-center shadow-md">
            <span className="text-white text-lg font-bold">V</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            {translate('onboarding.nameForm.title', "Let's get to know you")}
          </h2>
          <p className="text-sm text-gray-500">
            {translate('onboarding.nameForm.subtitle', 'This is how others will see you in the community')}
          </p>
        </div>

        {/* Display Name */}
        <div className="space-y-2">
          <Label htmlFor="onb-display-name" className="text-sm font-medium text-gray-700">
            {translate('onboarding.nameForm.displayNameLabel', 'What should I call you?')}
          </Label>
          <Input
            id="onb-display-name"
            placeholder={translate('onboarding.nameForm.displayNamePlaceholder', 'Your name')}
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            maxLength={100}
            className="rounded-xl border-gray-200 focus:border-[#FF7BAC] focus:ring-[#FF7BAC]/20"
            autoFocus
          />
        </div>

        {/* Handle / Username */}
        <div className="space-y-2">
          <Label htmlFor="onb-handle" className="text-sm font-medium text-gray-700">
            {translate('onboarding.nameForm.handleLabel', 'Choose your Vitanaland username')}
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
            <Input
              id="onb-handle"
              placeholder={translate('onboarding.nameForm.handlePlaceholder', 'your_username')}
              value={handle}
              onChange={e => handleHandleChange(e.target.value)}
              maxLength={HANDLE_MAX}
              className="pl-8 rounded-xl border-gray-200 focus:border-[#FF7BAC] focus:ring-[#FF7BAC]/20"
            />
            {/* Status icon */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {handleStatus === 'checking' && (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              )}
              {handleStatus === 'available' && (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              )}
              {(handleStatus === 'taken' || handleStatus === 'invalid') && (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
            </div>
          </div>
          {/* Status messages */}
          {handleStatus === 'taken' && (
            <p className="text-xs text-red-500">
              {translate('onboarding.nameForm.handleTaken', 'This username is already taken')}
            </p>
          )}
          {handleStatus === 'invalid' && (
            <p className="text-xs text-red-500">
              {translate('onboarding.nameForm.handleInvalid', 'Only letters, numbers, and underscores allowed')}
            </p>
          )}
          {handleStatus === 'available' && (
            <p className="text-xs text-green-600">
              {translate('onboarding.nameForm.handleAvailable', 'Username is available!')}
            </p>
          )}
          {handle.length > 0 && handle.length < HANDLE_MIN && (
            <p className="text-xs text-gray-400">
              {translate('onboarding.nameForm.handleMinLength', 'At least 3 characters')}
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full rounded-xl bg-gradient-to-r from-[#FF6FB3] to-[#FF4FA0] hover:from-[#FF85BE] hover:to-[#FF5FAB] text-white font-medium py-3 h-auto transition-all duration-200"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              {translate('onboarding.nameForm.saving', 'Setting up...')}
            </>
          ) : (
            translate('onboarding.nameForm.submit', "Let's get started!")
          )}
        </Button>
      </div>
    </motion.div>
  );
}
