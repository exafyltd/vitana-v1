import { useLanguage } from '@/contexts/LanguageContext';
import gbFlag from '@/assets/flags/gb.png';
import deFlag from '@/assets/flags/de.png';
import { cn } from '@/lib/utils';

interface LanguageToggleButtonProps {
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Language toggle button for DE <-> EN switching.
 * Shows the OPPOSITE flag (what you'll switch TO).
 * - When German is active → shows British flag (click to switch to English)
 * - When English is active → shows German flag (click to switch to German)
 */
export function LanguageToggleButton({ className, size = 'md' }: LanguageToggleButtonProps) {
  const { selectedLanguage, setSelectedLanguage } = useLanguage();
  
  const isGerman = selectedLanguage === 'de-DE';
  const targetLanguage = isGerman ? 'en-US' : 'de-DE';
  const flagToShow = isGerman ? deFlag : gbFlag;
  const ariaLabel = isGerman ? 'Switch to English' : 'Auf Deutsch wechseln';
  
  const sizeClasses = size === 'sm' 
    ? 'w-9 h-9' 
    : 'w-11 h-11';
  
  const flagSizeClasses = size === 'sm'
    ? 'w-5 h-5'
    : 'w-6 h-6';

  return (
    <button
      type="button"
      onClick={() => setSelectedLanguage(targetLanguage)}
      className={cn(
        // Base circular button
        "flex-shrink-0 rounded-full flex items-center justify-center",
        // Glass effect matching Play Welcome button style
        "bg-white/10 backdrop-blur-xl border border-white/30",
        // Hover states
        "hover:bg-white/20 hover:border-white/40",
        // Shadow matching the premium glass style
        "shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]",
        "hover:shadow-[0_6px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]",
        // Transition
        "transition-all duration-300",
        // Focus ring
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        sizeClasses,
        className
      )}
      aria-label={ariaLabel}
    >
      <img 
        src={flagToShow} 
        alt="" 
        className={cn(
          "rounded-full object-cover",
          flagSizeClasses
        )}
      />
    </button>
  );
}
