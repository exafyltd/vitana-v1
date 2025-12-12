// Mock data for Sell & Earn → Sales UI preview
// Enable via VITE_MOCK_RESELLER_SALES=true or ?mockSales=1 query param

export interface MockTransaction {
  id: string;
  saleAmount: number;
  commissionAmount: number;
  createdAt: string;
  ticketQuantity: number;
}

// MockEventSale is defined below MockResellerSales interface

export interface MockEventSale {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventImageUrl?: string | null;
  ticketsSold: number;
  saleAmount: number;
  commissionAmount: number;
  commissionRate: number;
  lastSaleAt: string;
  isClientEvent: boolean;
  clientName: string | null;
}

export interface MockResellerSales {
  totalTicketsSold: number;
  totalSaleAmount: number;
  totalCommissionEarned: number;
  eventSales: MockEventSale[];
}

// Helper to get date X days ago
const daysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

// 4 varied mock events for testing filters
export const mockResellerSales: MockResellerSales = {
  totalTicketsSold: 47,
  totalSaleAmount: 2350,
  totalCommissionEarned: 282,
  eventSales: [
    {
      eventId: "mock-event-1",
      eventTitle: "Sunrise Yoga & Meditation Retreat",
      eventDate: daysAgo(-14), // Future event
      eventImageUrl: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=400&h=400&fit=crop",
      ticketsSold: 12,
      saleAmount: 600,
      commissionAmount: 60,
      commissionRate: 10,
      lastSaleAt: daysAgo(2), // 2 days ago - within 7 days
      isClientEvent: false,
      clientName: null,
    },
    {
      eventId: "mock-event-2",
      eventTitle: "Holistic Wellness Workshop",
      eventDate: daysAgo(-7), // Future event
      eventImageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop",
      ticketsSold: 8,
      saleAmount: 400,
      commissionAmount: 20,
      commissionRate: 5,
      lastSaleAt: daysAgo(5), // 5 days ago - within 7 days
      isClientEvent: false,
      clientName: null,
    },
    {
      eventId: "mock-event-3",
      eventTitle: "Corporate Mindfulness Day",
      eventDate: daysAgo(-21), // Future event
      eventImageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=400&fit=crop",
      ticketsSold: 15,
      saleAmount: 750,
      commissionAmount: 112.5,
      commissionRate: 15,
      lastSaleAt: daysAgo(18), // 18 days ago - within 30 days, outside 7 days
      isClientEvent: true,
      clientName: "TechCorp Inc.",
    },
    {
      eventId: "mock-event-4",
      eventTitle: "Annual Health Summit 2024",
      eventDate: daysAgo(-45), // Future event
      eventImageUrl: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=400&h=400&fit=crop",
      ticketsSold: 12,
      saleAmount: 600,
      commissionAmount: 120,
      commissionRate: 20,
      lastSaleAt: daysAgo(40), // 40 days ago - outside 30 days
      isClientEvent: true,
      clientName: "Wellness Foundation",
    },
  ],
};

// Mock transactions for each event (for detail drawer)
export const mockTransactionsByEventId: Record<string, MockTransaction[]> = {
  "mock-event-1": [
    { id: "tx-1a", saleAmount: 50, commissionAmount: 5, createdAt: daysAgo(2), ticketQuantity: 1 },
    { id: "tx-1b", saleAmount: 100, commissionAmount: 10, createdAt: daysAgo(3), ticketQuantity: 2 },
    { id: "tx-1c", saleAmount: 150, commissionAmount: 15, createdAt: daysAgo(4), ticketQuantity: 3 },
    { id: "tx-1d", saleAmount: 200, commissionAmount: 20, createdAt: daysAgo(5), ticketQuantity: 4 },
    { id: "tx-1e", saleAmount: 100, commissionAmount: 10, createdAt: daysAgo(6), ticketQuantity: 2 },
  ],
  "mock-event-2": [
    { id: "tx-2a", saleAmount: 50, commissionAmount: 2.5, createdAt: daysAgo(5), ticketQuantity: 1 },
    { id: "tx-2b", saleAmount: 150, commissionAmount: 7.5, createdAt: daysAgo(6), ticketQuantity: 3 },
    { id: "tx-2c", saleAmount: 200, commissionAmount: 10, createdAt: daysAgo(7), ticketQuantity: 4 },
  ],
  "mock-event-3": [
    { id: "tx-3a", saleAmount: 150, commissionAmount: 22.5, createdAt: daysAgo(18), ticketQuantity: 3 },
    { id: "tx-3b", saleAmount: 250, commissionAmount: 37.5, createdAt: daysAgo(20), ticketQuantity: 5 },
    { id: "tx-3c", saleAmount: 200, commissionAmount: 30, createdAt: daysAgo(22), ticketQuantity: 4 },
    { id: "tx-3d", saleAmount: 150, commissionAmount: 22.5, createdAt: daysAgo(25), ticketQuantity: 3 },
  ],
  "mock-event-4": [
    { id: "tx-4a", saleAmount: 100, commissionAmount: 20, createdAt: daysAgo(40), ticketQuantity: 2 },
    { id: "tx-4b", saleAmount: 150, commissionAmount: 30, createdAt: daysAgo(42), ticketQuantity: 3 },
    { id: "tx-4c", saleAmount: 200, commissionAmount: 40, createdAt: daysAgo(44), ticketQuantity: 4 },
    { id: "tx-4d", saleAmount: 150, commissionAmount: 30, createdAt: daysAgo(45), ticketQuantity: 3 },
  ],
};

// Check if mock mode is enabled
export function isMockResellerSalesEnabled(): boolean {
  // Check env var first (primary)
  if (import.meta.env.VITE_MOCK_RESELLER_SALES === "true") {
    return true;
  }
  
  // Check query param (dev fallback)
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mockSales") === "1") {
      return true;
    }
  }
  
  return false;
}
