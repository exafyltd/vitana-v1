import { Globe } from 'lucide-react';
import deFlagImg from '@/assets/flags/de.png';
import usFlagImg from '@/assets/flags/us.png';
import gbFlagImg from '@/assets/flags/gb.png';
import rsFlagImg from '@/assets/flags/rs.png';
import esFlagImg from '@/assets/flags/es.png';
import saFlagImg from '@/assets/flags/sa.png';
import ruFlagImg from '@/assets/flags/ru.png';
import cnFlagImg from '@/assets/flags/cn.png';
import frFlagImg from '@/assets/flags/fr.png';
import ptFlagImg from '@/assets/flags/pt.png';
import plFlagImg from '@/assets/flags/pl.png';

interface LanguageFlagProps {
  languageCode: string | null;
  className?: string;
  'aria-label'?: string;
}

const languageMap: Record<string, string> = {
  'de-DE': 'DE',
  'en-US': 'US',
  'en-GB': 'GB',
  'sr-RS': 'RS',
  'es-ES': 'ES',
  'ar-XA': 'SA',
  'ru-RU': 'RU',
  'zh-CN': 'CN',
  'fr-FR': 'FR',
  'pt-BR': 'BR',
  'pl-PL': 'PL'
};

const countryFlagImages: Record<string, string> = {
  'DE': deFlagImg,
  'US': usFlagImg,
  'GB': gbFlagImg,
  'RS': rsFlagImg,
  'ES': esFlagImg,
  'SA': saFlagImg,
  'RU': ruFlagImg,
  'CN': cnFlagImg,
  'FR': frFlagImg,
  'PT': ptFlagImg,
  'PL': plFlagImg
};

export function LanguageFlag({ 
  languageCode, 
  className = "w-10 h-10",
  'aria-label': ariaLabel 
}: LanguageFlagProps) {
  const countryCode = languageCode && languageMap[languageCode] ? languageMap[languageCode] : null;
  const flagImg = countryCode && countryFlagImages[countryCode] ? countryFlagImages[countryCode] : null;

  return (
    <div 
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden ${className}`}
      aria-label={ariaLabel}
      role="img"
    >
      {/* Circuit-friendly design with gradient background and glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-background/80 via-muted/60 to-background/80 ring-2 ring-border/40 shadow-lg" />
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/5 to-transparent" />
      
      {flagImg ? (
        <img 
          src={flagImg} 
          alt={countryCode || ''} 
          className="relative w-full h-full object-cover rounded-full z-10"
        />
      ) : (
        <div className="relative z-10 flex items-center justify-center w-full h-full">
          <Globe className="w-3/5 h-3/5 text-muted-foreground" />
        </div>
      )}
      
      {/* Tech glow effect */}
      <div className="absolute inset-0 rounded-full shadow-[0_0_12px_rgba(var(--primary-rgb),0.15)]" />
    </div>
  );
}
