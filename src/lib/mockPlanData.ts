export interface MockPlan {
  id: string;
  plan_type: string;
  adherence_score: number;
  ai_generated: boolean;
  is_ai_generated: boolean;
  last_updated: string;
  plan_data: any;
}

export function getMockPlan(type: string): MockPlan {
  const mockPlans: Record<string, { adherence_score: number; hoursAgo: number }> = {
    nutrition: {
      adherence_score: 78,
      hoursAgo: 2
    },
    exercise: {
      adherence_score: 65,
      hoursAgo: 1
    },
    hydration: {
      adherence_score: 72,
      hoursAgo: 3
    },
    sleep: {
      adherence_score: 86,
      hoursAgo: 1.5
    },
    mental: {
      adherence_score: 74,
      hoursAgo: 4
    },
    supplement: {
      adherence_score: 90,
      hoursAgo: 2.5
    }
  };

  const mockData = mockPlans[type] || { adherence_score: 0, hoursAgo: 0 };
  const lastUpdated = new Date(Date.now() - mockData.hoursAgo * 60 * 60 * 1000).toISOString();

  return {
    id: `mock-${type}`,
    plan_type: type,
    adherence_score: mockData.adherence_score,
    ai_generated: true,
    is_ai_generated: true,
    last_updated: lastUpdated,
    plan_data: {}
  };
}
