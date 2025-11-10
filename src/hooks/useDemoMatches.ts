export interface DemoPerson {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  compatibility_score: number;
  match_reason: string;
  shared_interests: string[];
  distance_km: number;
}

export interface DemoGroup {
  id: string;
  name: string;
  description: string;
  category: string;
  member_count: number;
  compatibility_score: number;
  match_reason: string;
  next_time_iso?: string;
  location?: string;
  cover_img?: string;
  image_url?: string;
  tags: string[];
}

export interface DemoCoach {
  id: string;
  user_id?: string;
  handle?: string;
  name: string;
  avatar: string;
  specialty: string;
  availability: string;
  rating: number;
  sessions_from: number;
  tagline: string;
}

export interface DemoEvent {
  id: string;
  title: string;
  start_time: string;
  location: string;
  participant_count: number;
  event_type: string;
  match_score: number;
  match_reasons: string[];
  tags: string[];
  image_url?: string;
}

export interface DemoInsight {
  compatibility_overall_pct: number;
  top_factors: string[];
  shared_interests: string[];
  suggestion_text: string;
  week_delta_pct: number;
}

const generateAvatar = (seed: number) => 
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

export function useDemoMatches() {
  const demoEnabled = true;

  const people: DemoPerson[] = [
    {
      id: "demo-1",
      user_id: "demo-user-1",
      display_name: "Dragan Alexander",
      avatar_url: generateAvatar(1),
      bio: "Morning routine & yoga enthusiast",
      compatibility_score: 80,
      match_reason: "Morning routine & yoga match",
      shared_interests: ["Yoga", "Early Riser", "Mindfulness"],
      distance_km: 2
    },
    {
      id: "demo-2",
      user_id: "demo-user-2",
      display_name: "Patrick Merel",
      avatar_url: generateAvatar(2),
      bio: "Nutrition & walking goals",
      compatibility_score: 75,
      match_reason: "Nutrition & walking goals align",
      shared_interests: ["Healthy Eating", "Walk 10k", "Focus Music"],
      distance_km: 4
    },
    {
      id: "demo-3",
      user_id: "demo-user-3",
      display_name: "Jovana Admin",
      avatar_url: generateAvatar(3),
      bio: "Weekend fitness & dance lover",
      compatibility_score: 70,
      match_reason: "Weekend fitness & dance",
      shared_interests: ["Dance", "HIIT", "Hydration"],
      distance_km: 1
    },
    {
      id: "demo-4",
      user_id: "demo-user-4",
      display_name: "Sarah Luna",
      avatar_url: generateAvatar(4),
      bio: "Sleep rhythm & calm evenings",
      compatibility_score: 78,
      match_reason: "Sleep rhythm & calm evenings",
      shared_interests: ["Sleep Hygiene", "Breathwork"],
      distance_km: 3
    },
    {
      id: "demo-5",
      user_id: "demo-user-5",
      display_name: "Marcus Lee",
      avatar_url: generateAvatar(5),
      bio: "Strength + mobility balance",
      compatibility_score: 72,
      match_reason: "Strength + mobility balance",
      shared_interests: ["Strength", "Mobility"],
      distance_km: 5
    },
    {
      id: "demo-6",
      user_id: "demo-user-6",
      display_name: "Lisa Chen",
      avatar_url: generateAvatar(6),
      bio: "Mindful mornings & yoga",
      compatibility_score: 77,
      match_reason: "Mindful mornings & yoga",
      shared_interests: ["Yoga", "Meditation"],
      distance_km: 2
    }
  ];

  const getTodayTime = (hour: number, minute: number) => {
    const today = new Date();
    today.setHours(hour, minute, 0, 0);
    return today.toISOString();
  };

  const getTomorrowTime = (hour: number, minute: number) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(hour, minute, 0, 0);
    return tomorrow.toISOString();
  };

  const getSaturdayTime = (hour: number, minute: number) => {
    const saturday = new Date();
    const daysUntilSaturday = (6 - saturday.getDay() + 7) % 7;
    saturday.setDate(saturday.getDate() + daysUntilSaturday);
    saturday.setHours(hour, minute, 0, 0);
    return saturday.toISOString();
  };

  const getThursdayTime = (hour: number, minute: number) => {
    const thursday = new Date();
    const daysUntilThursday = (4 - thursday.getDay() + 7) % 7;
    thursday.setDate(thursday.getDate() + daysUntilThursday);
    thursday.setHours(hour, minute, 0, 0);
    return thursday.toISOString();
  };

  const getFridayTime = (hour: number, minute: number) => {
    const friday = new Date();
    const daysUntilFriday = (5 - friday.getDay() + 7) % 7;
    friday.setDate(friday.getDate() + daysUntilFriday);
    friday.setHours(hour, minute, 0, 0);
    return friday.toISOString();
  };

  const getSundayTime = (hour: number, minute: number) => {
    const sunday = new Date();
    const daysUntilSunday = (7 - sunday.getDay()) % 7;
    sunday.setDate(sunday.getDate() + daysUntilSunday);
    sunday.setHours(hour, minute, 0, 0);
    return sunday.toISOString();
  };

  const groups: DemoGroup[] = [
    {
      id: "demo-group-1",
      name: "Sunrise Yoga by the Sea",
      description: "Start your day with peaceful yoga on the beach",
      category: "Wellness",
      member_count: 128,
      compatibility_score: 92,
      match_reason: "Perfect for morning routines & mindfulness",
      next_time_iso: getTodayTime(7, 30),
      location: "Cala Major Beach",
      image_url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop",
      tags: ["Yoga", "Outdoors"]
    },
    {
      id: "demo-group-2",
      name: "Mindful Walk & Talk",
      description: "Walking meditation with great conversations",
      category: "Community",
      member_count: 54,
      compatibility_score: 85,
      match_reason: "Aligns with your walking & mental health goals",
      next_time_iso: getTodayTime(18, 0),
      location: "City Park",
      image_url: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=600&fit=crop",
      tags: ["Walking", "Mental"]
    },
    {
      id: "demo-group-3",
      name: "Nutrition Workshop: 15-min Meals",
      description: "Quick healthy meal prep techniques",
      category: "Nutrition",
      member_count: 36,
      compatibility_score: 88,
      match_reason: "Matches your healthy eating interests",
      next_time_iso: getTomorrowTime(14, 0),
      location: "Kitchen Lab",
      image_url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&h=600&fit=crop",
      tags: ["Healthy Eating"]
    },
    {
      id: "demo-group-4",
      name: "Community Fitness Challenge",
      description: "Weekly fitness goals with supportive group",
      category: "Exercise",
      member_count: 92,
      compatibility_score: 83,
      match_reason: "Great for strength & cardio goals",
      next_time_iso: getSaturdayTime(10, 0),
      location: "Fitness Center",
      image_url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
      tags: ["Strength", "Cardio"]
    },
    {
      id: "demo-group-5",
      name: "Evening Breathwork Reset",
      description: "Calm your nervous system before bed",
      category: "Mental",
      member_count: 41,
      compatibility_score: 90,
      match_reason: "Perfect for sleep & relaxation",
      next_time_iso: getTodayTime(20, 30),
      location: "Studio A",
      image_url: "https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&h=600&fit=crop",
      tags: ["Breathwork", "Relax"]
    },
    {
      id: "demo-group-6",
      name: "Pilates & Posture",
      description: "Core strength and body alignment",
      category: "Exercise",
      member_count: 65,
      compatibility_score: 81,
      match_reason: "Complements your mobility work",
      next_time_iso: getThursdayTime(17, 0),
      location: "Studio B",
      image_url: "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=800&h=600&fit=crop",
      tags: ["Pilates"]
    },
    {
      id: "demo-group-7",
      name: "Sunday Meal Prep Crew",
      description: "Batch cook healthy meals for the week",
      category: "Nutrition",
      member_count: 29,
      compatibility_score: 86,
      match_reason: "Supports your nutrition goals",
      next_time_iso: getSundayTime(12, 0),
      location: "Community Hub",
      image_url: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop",
      tags: ["Meal Prep"]
    },
    {
      id: "demo-group-8",
      name: "Beginner Dance Social",
      description: "Fun, judgment-free dance for all levels",
      category: "Social",
      member_count: 73,
      compatibility_score: 79,
      match_reason: "Great way to move and connect",
      next_time_iso: getFridayTime(19, 0),
      location: "Studio C",
      image_url: "https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800&h=600&fit=crop",
      tags: ["Dance", "Social"]
    }
  ];

  // Image URLs for demo events
  const eventImages: Record<string, string> = {
    "demo-group-1": "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop", // Yoga beach
    "demo-group-2": "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=600&fit=crop", // Walking nature
    "demo-group-3": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&h=600&fit=crop", // Nutrition
    "demo-group-4": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop", // Fitness group
    "demo-group-5": "https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&h=600&fit=crop", // Meditation
    "demo-group-6": "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=800&h=600&fit=crop", // Pilates
    "demo-group-7": "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop", // Meal prep
    "demo-group-8": "https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800&h=600&fit=crop", // Dance
  };

  const events: DemoEvent[] = groups.map(group => ({
    id: group.id,
    title: group.name,
    start_time: group.next_time_iso!,
    location: group.location!,
    participant_count: group.member_count,
    event_type: group.category,
    match_score: group.compatibility_score / 100,
    match_reasons: [group.match_reason],
    tags: group.tags,
    image_url: eventImages[group.id],
  }));

  const coaches: DemoCoach[] = [
    {
      id: "demo-coach-1",
      user_id: "demo-user-coach-1",
      handle: "demo-mia-torres",
      name: "Mia Torres",
      avatar: generateAvatar(11),
      specialty: "Yoga & Mobility",
      availability: "Available",
      rating: 4.9,
      sessions_from: 35,
      tagline: "Gentle balance for busy days"
    },
    {
      id: "demo-coach-2",
      user_id: "demo-user-coach-2",
      handle: "demo-eric-novak",
      name: "Eric Novak",
      avatar: generateAvatar(12),
      specialty: "Nutrition",
      availability: "Tomorrow",
      rating: 4.8,
      sessions_from: 40,
      tagline: "Small changes, big energy"
    },
    {
      id: "demo-coach-3",
      user_id: "demo-user-coach-3",
      handle: "demo-anya-petrov",
      name: "Anya Petrov",
      avatar: generateAvatar(13),
      specialty: "Mindfulness",
      availability: "Available",
      rating: 4.7,
      sessions_from: 30,
      tagline: "Calm mind, clear goals"
    },
    {
      id: "demo-coach-4",
      user_id: "demo-user-coach-4",
      handle: "demo-leo-park",
      name: "Leo Park",
      avatar: generateAvatar(14),
      specialty: "Strength & Rehab",
      availability: "Next week",
      rating: 4.9,
      sessions_from: 45,
      tagline: "Smart progress without injuries"
    }
  ];

  const insights: DemoInsight = {
    compatibility_overall_pct: 89,
    top_factors: ["Wellness Goals", "Activity Level", "Schedule Flexibility"],
    shared_interests: ["Yoga", "Healthy Eating", "Mindfulness"],
    suggestion_text: "Join a nutrition workshop + a short yoga session this week.",
    week_delta_pct: 6
  };

  return {
    demoEnabled,
    people,
    groups,
    events,
    coaches,
    insights
  };
}
