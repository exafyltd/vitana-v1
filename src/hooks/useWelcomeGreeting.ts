import { useMemo } from 'react';

export function useWelcomeGreeting(firstName?: string) {
  return useMemo(() => {
    const hour = new Date().getHours();
    
    let timeGreeting: string;
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    
    if (hour >= 5 && hour < 12) {
      timeGreeting = "Good morning";
      timeOfDay = 'morning';
    } else if (hour >= 12 && hour < 18) {
      timeGreeting = "Good afternoon";
      timeOfDay = 'afternoon';
    } else if (hour >= 18 && hour < 22) {
      timeGreeting = "Good evening";
      timeOfDay = 'evening';
    } else {
      timeGreeting = "Hello";
      timeOfDay = 'night';
    }
    
    const name = firstName?.trim() || "";
    const greeting = name 
      ? `${timeGreeting} ${name}` 
      : timeGreeting;
    
    return {
      greeting,
      timeOfDay,
      fullMessage: greeting,
    };
  }, [firstName]);
}
