import { useMemo } from 'react';

interface MotivationalMessage {
  text: string;
  emoji: string;
}

const MOTIVATIONAL_MESSAGES: MotivationalMessage[] = [
  { text: "let's make today special!", emoji: "✨" },
  { text: "your wellness journey starts!", emoji: "🌟" },
  { text: "new health opportunities await!", emoji: "🌅" },
  { text: "every step counts!", emoji: "🎯" },
  { text: "let's create something amazing!", emoji: "💪" },
  { text: "health is your greatest asset!", emoji: "💎" },
  { text: "embrace wellness today!", emoji: "🌱" },
  { text: "progress happens now!", emoji: "⚡" },
  { text: "you're stronger than you think!", emoji: "🦋" },
  { text: "wellness is a journey!", emoji: "🗺️" },
  { text: "fuel your body and mind!", emoji: "🔥" },
  { text: "small actions create change!", emoji: "🌊" },
  { text: "your future self will thank you!", emoji: "🙏" },
  { text: "today is perfect for progress!", emoji: "☀️" },
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