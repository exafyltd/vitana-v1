interface LanguageFlagProps {
  languageCode: string | null;
  className?: string;
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
  'pt-PT': 'PT',
  'pl-PL': 'PL'
};

const countryFlags: Record<string, string> = {
  'DE': '🇩🇪',
  'US': '🇺🇸',
  'GB': '🇬🇧',
  'RS': '🇷🇸',
  'ES': '🇪🇸',
  'SA': '🇸🇦',
  'RU': '🇷🇺',
  'CN': '🇨🇳',
  'FR': '🇫🇷',
  'PT': '🇵🇹',
  'PL': '🇵🇱'
};

export function LanguageFlag({ languageCode, className = "" }: LanguageFlagProps) {
  const countryCode = languageCode && languageMap[languageCode] ? languageMap[languageCode] : null;
  const flag = countryCode && countryFlags[countryCode] ? countryFlags[countryCode] : '🌐';

  return (
    <div className={`flex items-center justify-center w-10 h-10 rounded-full bg-background shadow-sm ${className}`}>
      <span className="text-2xl" style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>
        {flag}
      </span>
    </div>
  );
}
