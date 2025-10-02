import { CalendarEvent } from "@/hooks/useCalendarEvents";

export function parseCalendarNL(input: string): Partial<CalendarEvent> {
  const result: Partial<CalendarEvent> = {
    status: 'confirmed',
    priority: 'medium',
    is_recurring: false,
    attendees_count: 0,
    has_rewards: false,
    source_type: 'manual',
  };

  // Extract title (everything before time/date indicators or first comma)
  const titleMatch = input.match(/^([^,@]+?)(?=\s+(tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|at|@|\d+:\d+|\d+-\d+|,))/i);
  if (titleMatch) {
    result.title = titleMatch[1].trim();
  } else {
    // Fallback: take first part before comma or @
    const parts = input.split(/[,@]/);
    result.title = parts[0].trim();
  }

  // Extract date/time
  const now = new Date();
  
  // Check for "tomorrow"
  if (/tomorrow/i.test(input)) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    result.start_time = tomorrow.toISOString();
  }
  // Check for "today"
  else if (/today/i.test(input)) {
    result.start_time = now.toISOString();
  }
  // Check for day of week
  else {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayMatch = input.match(new RegExp(`\\b(${days.join('|')})\\b`, 'i'));
    if (dayMatch) {
      const targetDay = days.indexOf(dayMatch[1].toLowerCase());
      const currentDay = now.getDay();
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;
      
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + daysToAdd);
      result.start_time = targetDate.toISOString();
    }
  }

  // Extract time (e.g., "1pm", "1-2pm", "13:00")
  const timeMatch = input.match(/(\d{1,2})(?::(\d{2}))?\s*([ap]m)?(?:\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*([ap]m)?)?/i);
  if (timeMatch && result.start_time) {
    const startDate = new Date(result.start_time);
    let startHour = parseInt(timeMatch[1]);
    const startMin = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const startMeridiem = timeMatch[3]?.toLowerCase();

    // Convert to 24-hour format
    if (startMeridiem === 'pm' && startHour !== 12) startHour += 12;
    if (startMeridiem === 'am' && startHour === 12) startHour = 0;

    startDate.setHours(startHour, startMin, 0, 0);
    result.start_time = startDate.toISOString();

    // If there's an end time
    if (timeMatch[4]) {
      const endDate = new Date(startDate);
      let endHour = parseInt(timeMatch[4]);
      const endMin = timeMatch[5] ? parseInt(timeMatch[5]) : 0;
      const endMeridiem = timeMatch[6]?.toLowerCase() || startMeridiem;

      if (endMeridiem === 'pm' && endHour !== 12) endHour += 12;
      if (endMeridiem === 'am' && endHour === 12) endHour = 0;

      endDate.setHours(endHour, endMin, 0, 0);
      result.end_time = endDate.toISOString();
    } else {
      // Default 1 hour duration
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      result.end_time = endDate.toISOString();
    }
  } else if (result.start_time) {
    // Default time if not specified: 9am
    const startDate = new Date(result.start_time);
    startDate.setHours(9, 0, 0, 0);
    result.start_time = startDate.toISOString();
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    result.end_time = endDate.toISOString();
  }

  // Extract location (after @ symbol)
  const locationMatch = input.match(/@\s*([^,]+)/);
  if (locationMatch) {
    result.location = locationMatch[1].trim();
  }

  // Extract tags/category
  const tagMatch = input.match(/tag:\s*(\w+)/i);
  if (tagMatch) {
    const tag = tagMatch[1].toLowerCase();
    // Map tags to event types
    if (['work', 'professional', 'business'].includes(tag)) {
      result.event_type = 'professional';
    } else if (['health', 'medical', 'doctor'].includes(tag)) {
      result.event_type = 'health';
    } else if (['workout', 'gym', 'exercise'].includes(tag)) {
      result.event_type = 'workout';
    } else if (['community', 'social', 'group'].includes(tag)) {
      result.event_type = 'community';
    } else {
      result.event_type = 'personal';
    }
  } else {
    result.event_type = 'personal';
  }

  // Extract reminder (e.g., "remind 30m", "alert 1h")
  const reminderMatch = input.match(/(?:remind|alert)\s+(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)/i);
  if (reminderMatch) {
    // Store reminder info (would need to add this field to CalendarEvent type)
    // For now, we can add it as metadata or description
    const value = parseInt(reminderMatch[1]);
    const unit = reminderMatch[2].toLowerCase();
    const reminderText = unit.startsWith('h') ? `${value} hour(s) before` : `${value} minute(s) before`;
    result.description = result.description 
      ? `${result.description}\nReminder: ${reminderText}`
      : `Reminder: ${reminderText}`;
  }

  return result;
}
