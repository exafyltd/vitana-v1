interface LanguageFlagProps {
  languageCode: string | null;
  className?: string;
}

const languageMap: Record<string, string> = {
  'de-DE': '🇩🇪',
  'en-US': '🇺🇸',
  'en-GB': '🇬🇧',
  'sr-RS': '🇷🇸',
  'es-ES': '🇪🇸',
  'ar-XA': '🇸🇦',
  'ru-RU': '🇷🇺',
  'zh-CN': '🇨🇳',
  'fr-FR': '🇫🇷',
  'pt-PT': '🇵🇹',
  'pl-PL': '🇵🇱'
};

export function LanguageFlag({ languageCode, className = "" }: LanguageFlagProps) {
  // Default to world flag if no language or unsupported language
  const flag = languageCode && languageMap[languageCode] ? languageMap[languageCode] : '🌐';

  return (
    <div className={`flex items-center justify-center w-10 h-10 rounded-full bg-background shadow-sm ${className}`}>
      <span className="text-2xl">{flag}</span>
    </div>
  );
}
