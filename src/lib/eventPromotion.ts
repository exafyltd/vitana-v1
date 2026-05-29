import { formatDate } from '@/lib/locale-format';
export interface EventPromotionData {
  eventId: string;
  eventName: string;
  eventDescription: string;
  eventImageUrl?: string;
  eventLink: string;
  eventDate: string;
  eventLocation?: string;
  creatorId: string;
  suggestedAudiences: {
    organizerFollowers?: boolean;
    eventAttendees?: boolean;
  };
  messageTemplates: {
    email?: { subject: string; body: string };
    sms?: { body: string };
    whatsapp?: { body: string };
  };
}

/**
 * Generate trackable event URL with UTM parameters
 */
export function generateEventLink(
  eventId: string,
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
  }
): string {
  const baseUrl = `${window.location.origin}/comm/events-meetups?event=${encodeURIComponent(eventId)}`;
  
  if (!utmParams) return baseUrl;
  
  const params = new URLSearchParams();
  if (utmParams.source) params.set('utm_source', utmParams.source);
  if (utmParams.medium) params.set('utm_medium', utmParams.medium);
  if (utmParams.campaign) params.set('utm_campaign', utmParams.campaign);
  
  return `${baseUrl}&${params.toString()}`;
}

/**
 * Generate email template for event promotion
 */
export function generateEmailTemplate(event: any): { subject: string; body: string } {
  const eventDate = formatDate(new Date(event.start_time), "MMMM d, yyyy 'at' h:mm a");
  const location = event.location || (event.virtual_link ? "Virtual Event" : "Location TBA");
  
  return {
    subject: `You're invited: ${event.title}`,
    body: `Hi {name},

Join us for an exciting event!

📅 **${event.title}**

${event.description || ""}

**Event Details:**
📍 Location: ${location}
📅 Date & Time: ${eventDate}
👥 Join ${event.participant_count || 0} others who are attending

Don't miss this opportunity to connect and engage with our community!

👉 RSVP Now: {event_link}

Looking forward to seeing you there!

Best regards,
${event.creator_display_name || "The Event Team"}`.trim(),
  };
}

/**
 * Generate SMS template for event promotion
 */
export function generateSmsTemplate(event: any): { body: string } {
  const eventDate = formatDate(new Date(event.start_time), "MMM d, h:mm a");
  const location = event.location || "Virtual";
  
  const body = `🎉 ${event.title}
📅 ${eventDate}
📍 ${location}
RSVP: {event_link}`;
  
  return { body };
}

/**
 * Generate WhatsApp template for event promotion
 */
export function generateWhatsAppTemplate(event: any): { body: string } {
  const eventDate = formatDate(new Date(event.start_time), "MMMM d, yyyy 'at' h:mm a");
  const location = event.location || (event.virtual_link ? "Virtual Event" : "Location TBA");
  
  const body = `🌟 *${event.title}*

${event.description || "Join us for this exciting event!"}

📅 ${eventDate}
📍 ${location}
👥 ${event.participant_count || 0} people are attending

Don't miss out! RSVP now:
{event_link}`;
  
  return { body };
}

/**
 * Transform event data into campaign pre-fill format
 */
export function generateEventCampaignData(event: any): EventPromotionData {
  const eventLink = generateEventLink(event.id, {
    source: 'campaign',
    medium: 'email',
    campaign: event.id,
  });
  
  return {
    eventId: event.id,
    eventName: event.title,
    eventDescription: event.description || "",
    eventImageUrl: event.image_url,
    eventLink,
    eventDate: event.start_time,
    eventLocation: event.location,
    creatorId: event.created_by,
    suggestedAudiences: {
      organizerFollowers: true,
      eventAttendees: false,
    },
    messageTemplates: {
      email: generateEmailTemplate(event),
      sms: generateSmsTemplate(event),
      whatsapp: generateWhatsAppTemplate(event),
    },
  };
}
