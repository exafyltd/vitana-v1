export interface ExternalContact {
  name: string;
  email?: string;
  phone?: string;
  whatsapp_number?: string;
}

export interface AudienceData {
  // Vitana Contacts
  vitanaContacts?: {
    enabled: boolean;
    contactIds: string[];
  };
  
  // Community Segments
  segments?: {
    enabled: boolean;
    segmentIds: string[];
  };
  
  // Event-Based: Your Followers
  yourFollowers?: {
    enabled: boolean;
  };
  
  // Event-Based: Past Event Attendees
  eventAttendees?: {
    enabled: boolean;
    eventIds: string[];
  };
  
  // External Contacts (CSV)
  csvUpload?: {
    enabled: boolean;
    data: ExternalContact[];
  };
  
  // Manual Entry
  manualContacts?: {
    enabled: boolean;
    data: ExternalContact[];
  };
  
  // Eligibility counts (calculated)
  eligibility?: {
    email: number;
    sms: number;
    whatsapp: number;
    total: number;
  };
  
  // Event context (for event-based targeting)
  eventContext?: {
    eventId: string;
    creatorId: string;
    location?: string;
    eventType?: string;
  };
}

export interface CsvValidationResult {
  valid: ExternalContact[];
  invalid: Array<{ row: number; data: any; errors: string[] }>;
  totalRows: number;
}
