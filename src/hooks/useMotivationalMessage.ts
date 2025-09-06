import { useMemo } from 'react';

interface MotivationalMessage {
  text: string;
  emoji: string;
}

const MOTIVATIONAL_MESSAGES: MotivationalMessage[] = [
  { text: "let's make today a very special day!", emoji: "✨" },
  { text: "your wellness journey starts now!", emoji: "🌟" },
  { text: "today brings new health opportunities!", emoji: "🌅" },
  { text: "every small step counts toward your goals!", emoji: "🎯" },
  { text: "let's create something amazing together!", emoji: "💪" },
  { text: "your health is your greatest investment!", emoji: "💎" },
  { text: "embrace today's wellness possibilities!", emoji: "🌱" },
  { text: "progress happens one choice at a time!", emoji: "⚡" },
  { text: "you're stronger than you think!", emoji: "🦋" },
  { text: "wellness is a journey, not a destination!", emoji: "🗺️" },
  { text: "let's fuel your body and mind today!", emoji: "🔥" },
  { text: "small actions create lasting changes!", emoji: "🌊" },
  { text: "your future self will thank you!", emoji: "🙏" },
  { text: "today is perfect for progress!", emoji: "☀️" },
  { text: "wellness starts with self-compassion!", emoji: "💝" },
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
    const truncatedGreeting = greeting.length > 40 
      ? `Hi ${name}, ${message.text.substring(0, 37 - name.length)}`
      : greeting;
    
    return {
      greeting: truncatedGreeting,
      emoji: message.emoji
    };
  }, [firstName]);
}