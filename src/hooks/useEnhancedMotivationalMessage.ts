import { useMemo } from 'react';

interface MotivationalMessage {
  text: string;
  emoji: string;
  category: 'health' | 'success' | 'guidance' | 'achievement';
}

const MOTIVATIONAL_MESSAGES: MotivationalMessage[] = [
  // Health & Wellness
  { text: "Your wellness journey is inspiring", emoji: "💪", category: 'health' },
  { text: "Every healthy choice you make matters", emoji: "🌱", category: 'health' },
  { text: "Your body and mind are getting stronger", emoji: "🧠", category: 'health' },
  { text: "You're glowing with health and vitality", emoji: "✨", category: 'health' },
  
  // Success & Achievement
  { text: "Success flows to you naturally", emoji: "🚀", category: 'success' },
  { text: "Your positive energy attracts abundance", emoji: "💎", category: 'success' },
  { text: "Today holds amazing opportunities for you", emoji: "🌟", category: 'success' },
  { text: "You're creating an incredible life", emoji: "🏆", category: 'success' },
  
  // Guidance & Partnership
  { text: "I'm here to support your growth", emoji: "🤝", category: 'guidance' },
  { text: "Let's make today extraordinarily productive", emoji: "💫", category: 'guidance' },
  { text: "Together we'll unlock your full potential", emoji: "🔑", category: 'guidance' },
  { text: "Your success is my priority", emoji: "🎯", category: 'guidance' },
  
  // Achievement Recognition
  { text: "Your consistency is truly remarkable", emoji: "🏅", category: 'achievement' },
  { text: "You're becoming the best version of yourself", emoji: "🦋", category: 'achievement' },
  { text: "Your progress inspires everyone around you", emoji: "👑", category: 'achievement' },
  { text: "You're building something amazing", emoji: "🔥", category: 'achievement' }
];

export function useEnhancedMotivationalMessage(firstName?: string) {
  return useMemo(() => {
    // Rotate messages based on hour and category for variety
    const currentHour = new Date().getHours();
    const categoryIndex = Math.floor(currentHour / 6) % 4; // Changes every 6 hours
    const categories: MotivationalMessage['category'][] = ['health', 'success', 'guidance', 'achievement'];
    const selectedCategory = categories[categoryIndex];
    
    // Filter messages by category
    const categoryMessages = MOTIVATIONAL_MESSAGES.filter(msg => msg.category === selectedCategory);
    const messageIndex = Math.floor(currentHour / 3) % categoryMessages.length; // Changes every 3 hours
    const selectedMessage = categoryMessages[messageIndex];
    
    // Create personalized greeting
    let greeting = selectedMessage.text;
    if (firstName) {
      // Add personalization without being too long
      const personalizedGreetings = [
        `${greeting}, ${firstName}`,
        `${firstName}, ${greeting.toLowerCase()}`,
        `Hey ${firstName}! ${greeting}`,
        `${greeting}, dear ${firstName}`
      ];
      
      const greetingIndex = Math.floor(currentHour / 2) % personalizedGreetings.length;
      greeting = personalizedGreetings[greetingIndex];
    }
    
    // Ensure the greeting stays reasonable in length (under 45 characters for mobile)
    if (greeting.length > 45) {
      const words = greeting.split(' ');
      let truncated = '';
      for (const word of words) {
        if ((truncated + ' ' + word).length <= 42) {
          truncated = truncated ? `${truncated} ${word}` : word;
        } else {
          break;
        }
      }
      greeting = truncated + '...';
    }
    
    return {
      greeting,
      emoji: selectedMessage.emoji,
      category: selectedMessage.category
    };
  }, [firstName]);
}