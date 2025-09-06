import { useMemo } from 'react';

interface MotivationalMessage {
  text: string;
  emoji: string;
}

const MOTIVATIONAL_MESSAGES: MotivationalMessage[] = [
  { text: "let's make today special!", emoji: "✨" },
  { text: "your wellness starts now!", emoji: "🌟" },
  { text: "new opportunities await!", emoji: "🌅" },
  { text: "every step counts!", emoji: "🎯" },
  { text: "let's create amazing!", emoji: "💪" },
  { text: "health is your asset!", emoji: "💎" },
  { text: "embrace wellness today!", emoji: "🌱" },
  { text: "progress happens now!", emoji: "⚡" },
  { text: "you're stronger!", emoji: "🦋" },
  { text: "wellness is a journey!", emoji: "🗺️" },
  { text: "fuel your energy!", emoji: "🔥" },
  { text: "small actions matter!", emoji: "🌊" },
  { text: "your future thanks you!", emoji: "🙏" },
  { text: "today brings progress!", emoji: "☀️" },
  { text: "wellness starts with you!", emoji: "💝" },
];

export function useMotivationalMessage(firstName?: string) {
  return useMemo(() => {
    // Use time-based rotation (changes every 6 hours)
    const hourIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 6));
    const messageIndex = hourIndex % MOTIVATIONAL_MESSAGES.length;
    const message = MOTIVATIONAL_MESSAGES[messageIndex];
    
    const name = firstName || 'there';
    const greeting = `Hi ${name}, ${message.text}`;
    
    // Ensure message fits in one line with emoji (max 40 characters)
    let truncatedGreeting = greeting;
    if (greeting.length > 40) {
      const maxLength = 37 - name.length;
      const truncatedText = message.text.substring(0, maxLength);
      // Find the last space to avoid cutting words in half
      const lastSpaceIndex = truncatedText.lastIndexOf(' ');
      const finalText = lastSpaceIndex > 0 ? truncatedText.substring(0, lastSpaceIndex) : truncatedText;
      truncatedGreeting = `Hi ${name}, ${finalText}`;
    }
    
    return {
      greeting: truncatedGreeting,
      emoji: message.emoji
    };
  }, [firstName]);
}