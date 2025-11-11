export interface DemoPerson {
  id: string;
  user_id: string;
  display_name: string;
  age: number;
  avatar_url: string;
  bio: string;
  location: string;
  professional_headline: string;
  vitana_index: number;
  vitana_percentile: number;
  longevity_archetype?: string;
  activity_time_preference: 'morning' | 'afternoon' | 'evening' | 'flexible';
  wellness_journey_stage: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  top_3_interests: string[];
  certification_badges?: string[];
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

const generateAvatar = (seed: number, style: 'avataaars' | 'adventurer' | 'lorelei' | 'micah' = 'avataaars') => 
  `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

export function useDemoMatches() {
  const demoEnabled = true;

  const people: DemoPerson[] = [
    // THE MORNING OPTIMIZERS (3 profiles)
    {
      id: "demo-1",
      user_id: "demo-user-1",
      display_name: "Sarah Chen",
      age: 34,
      avatar_url: generateAvatar(101, 'adventurer'),
      bio: "Former tech PM turned wellness coach. Helping busy professionals build sustainable health habits. 5AM club member 🌅 | Plant-based nutrition advocate",
      location: "San Francisco, CA",
      professional_headline: "Wellness Coach & Habit Designer",
      vitana_index: 721,
      vitana_percentile: 15,
      longevity_archetype: "The Mindful Optimizer",
      activity_time_preference: 'morning',
      wellness_journey_stage: 'advanced',
      top_3_interests: ["Yoga", "Plant-Based Nutrition", "Habit Design"],
      certification_badges: ["Certified Wellness Coach", "200hr YTT"],
      compatibility_score: 92,
      match_reason: "You both wake at 5AM and practice morning yoga 🧘‍♀️",
      shared_interests: ["Yoga", "Morning Routine", "Plant-Based", "Meditation", "Journaling"],
      distance_km: 2.3
    },
    {
      id: "demo-2",
      user_id: "demo-user-2",
      display_name: "Marcus Rodriguez",
      age: 29,
      avatar_url: generateAvatar(102, 'micah'),
      bio: "Software engineer optimizing code and biology. Cold showers, fasted workouts, and bulletproof coffee are my morning rituals ☕❄️",
      location: "Austin, TX",
      professional_headline: "Tech Lead & Biohacker",
      vitana_index: 687,
      vitana_percentile: 22,
      longevity_archetype: "The Disciplined Performer",
      activity_time_preference: 'morning',
      wellness_journey_stage: 'advanced',
      top_3_interests: ["HIIT", "Intermittent Fasting", "Cold Exposure"],
      compatibility_score: 88,
      match_reason: "You're both early risers who love optimizing performance 🚀",
      shared_interests: ["Morning Routine", "HIIT", "Productivity", "Cold Showers", "Journaling"],
      distance_km: 1.8
    },
    {
      id: "demo-3",
      user_id: "demo-user-3",
      display_name: "Emma Taylor",
      age: 41,
      avatar_url: generateAvatar(103, 'lorelei'),
      bio: "Sunrise yoga teacher and meditation guide. Creating calm in the chaos, one breath at a time. Let's flow together! 🧘‍♀️✨",
      location: "Portland, OR",
      professional_headline: "Yoga Teacher (500hr RYT)",
      vitana_index: 758,
      vitana_percentile: 10,
      longevity_archetype: "The Zen Warrior",
      activity_time_preference: 'morning',
      wellness_journey_stage: 'professional',
      top_3_interests: ["Yoga", "Meditation", "Breathwork"],
      certification_badges: ["500hr RYT", "Meditation Teacher"],
      compatibility_score: 90,
      match_reason: "You both practice sunrise yoga and track sleep quality 🌅",
      shared_interests: ["Yoga", "Meditation", "Breathwork", "Mindfulness", "Morning Routine"],
      distance_km: 3.1
    },

    // THE BIOHACKERS (2 profiles)
    {
      id: "demo-4",
      user_id: "demo-user-4",
      display_name: "Dr. Alex Kim",
      age: 38,
      avatar_url: generateAvatar(104, 'avataaars'),
      bio: "Longevity researcher exploring cold therapy, fasting, and metabolic health. Always looking for workout partners who push limits! ❄️💪",
      location: "San Francisco, CA",
      professional_headline: "Longevity Researcher & MD",
      vitana_index: 812,
      vitana_percentile: 5,
      longevity_archetype: "The Data-Driven Optimizer",
      activity_time_preference: 'flexible',
      wellness_journey_stage: 'professional',
      top_3_interests: ["Biohacking", "HRV Tracking", "Zone 2 Training"],
      certification_badges: ["MD", "ACSM Certified"],
      compatibility_score: 87,
      match_reason: "Shared interest in biohacking + similar Vitana Index 📊",
      shared_interests: ["Biohacking", "Cold Therapy", "Fasting", "HRV", "VO2 Max"],
      distance_km: 2.9
    },
    {
      id: "demo-5",
      user_id: "demo-user-5",
      display_name: "Nina Patel",
      age: 32,
      avatar_url: generateAvatar(105, 'lorelei'),
      bio: "Quantified self enthusiast. CGM wearer, sleep optimizer, and supplement experimenter. Let's swap protocols! 📈🔬",
      location: "NYC, NY",
      professional_headline: "Biohacker & Health Optimizer",
      vitana_index: 695,
      vitana_percentile: 20,
      longevity_archetype: "The Experimenter",
      activity_time_preference: 'evening',
      wellness_journey_stage: 'advanced',
      top_3_interests: ["CGM Tracking", "Supplements", "Sleep Optimization"],
      compatibility_score: 85,
      match_reason: "You both track HRV and optimize for recovery 💤",
      shared_interests: ["Biohacking", "Sleep Tracking", "Supplements", "Red Light Therapy", "Nootropics"],
      distance_km: 4.2
    },

    // THE WELLNESS PROFESSIONALS (3 profiles)
    {
      id: "demo-6",
      user_id: "demo-user-6",
      display_name: "Jordan Williams",
      age: 36,
      avatar_url: generateAvatar(106, 'micah'),
      bio: "Personal trainer specializing in functional fitness for longevity. Helping people move better at any age. Strength is health! 💪",
      location: "Los Angeles, CA",
      professional_headline: "Functional Fitness Coach",
      vitana_index: 743,
      vitana_percentile: 12,
      longevity_archetype: "The Movement Master",
      activity_time_preference: 'morning',
      wellness_journey_stage: 'professional',
      top_3_interests: ["Strength Training", "Mobility Work", "Functional Fitness"],
      certification_badges: ["NASM-CPT", "FMS Certified"],
      compatibility_score: 83,
      match_reason: "You're both in the top 20% for cardiovascular health 💚",
      shared_interests: ["Strength Training", "Mobility", "HIIT", "Zone 2", "Recovery"],
      distance_km: 5.1
    },
    {
      id: "demo-7",
      user_id: "demo-user-7",
      display_name: "Maya Jensen",
      age: 44,
      avatar_url: generateAvatar(107, 'lorelei'),
      bio: "Holistic nutritionist helping clients heal their gut and balance hormones. Food is medicine. Let's talk fermented foods! 🥗🦠",
      location: "Miami, FL",
      professional_headline: "Holistic Nutritionist",
      vitana_index: 776,
      vitana_percentile: 8,
      longevity_archetype: "The Gut Health Guru",
      activity_time_preference: 'afternoon',
      wellness_journey_stage: 'professional',
      top_3_interests: ["Gut Health", "Plant-Based Nutrition", "Fermented Foods"],
      certification_badges: ["Certified Nutritionist", "Gut Health Specialist"],
      compatibility_score: 89,
      match_reason: "Shared passion for nutrition and whole foods 🥗",
      shared_interests: ["Nutrition", "Gut Health", "Plant-Based", "Meal Prep", "Cooking"],
      distance_km: 3.7
    },
    {
      id: "demo-8",
      user_id: "demo-user-8",
      display_name: "Chris Martinez",
      age: 39,
      avatar_url: generateAvatar(108, 'adventurer'),
      bio: "Breathwork facilitator and cold exposure coach. Teaching people to master their nervous system. Wim Hof certified! 🧊🫁",
      location: "Denver, CO",
      professional_headline: "Breathwork & Cold Exposure Coach",
      vitana_index: 729,
      vitana_percentile: 14,
      longevity_archetype: "The Resilience Builder",
      activity_time_preference: 'morning',
      wellness_journey_stage: 'professional',
      top_3_interests: ["Breathwork", "Cold Exposure", "Stress Management"],
      certification_badges: ["Wim Hof Certified", "Oxygen Advantage"],
      compatibility_score: 86,
      match_reason: "You both practice breathwork and cold therapy ❄️",
      shared_interests: ["Breathwork", "Cold Therapy", "Meditation", "Ice Baths", "Sauna"],
      distance_km: 2.4
    },

    // THE BALANCED EXPLORERS (3 profiles)
    {
      id: "demo-9",
      user_id: "demo-user-9",
      display_name: "Olivia Park",
      age: 27,
      avatar_url: generateAvatar(109, 'lorelei'),
      bio: "Wellness explorer trying everything! This month: aerial yoga and fermented foods. Next month: who knows? Life's an experiment! ✨🎪",
      location: "San Francisco, CA",
      professional_headline: "Content Creator & Wellness Explorer",
      vitana_index: 642,
      vitana_percentile: 32,
      longevity_archetype: "The Curious Adventurer",
      activity_time_preference: 'flexible',
      wellness_journey_stage: 'intermediate',
      top_3_interests: ["Yoga", "Cooking", "Wellness Retreats"],
      compatibility_score: 78,
      match_reason: "You both love trying new wellness activities 🌈",
      shared_interests: ["Yoga", "Cooking", "Dance", "Hiking", "Workshops"],
      distance_km: 1.5
    },
    {
      id: "demo-10",
      user_id: "demo-user-10",
      display_name: "Ryan Thompson",
      age: 31,
      avatar_url: generateAvatar(110, 'micah'),
      bio: "Weekend warrior balancing desk job with outdoor adventures. Trail running, rock climbing, and campfire conversations 🏔️🏃‍♂️",
      location: "Seattle, WA",
      professional_headline: "Product Designer & Outdoor Enthusiast",
      vitana_index: 658,
      vitana_percentile: 28,
      longevity_archetype: "The Active Explorer",
      activity_time_preference: 'afternoon',
      wellness_journey_stage: 'intermediate',
      top_3_interests: ["Trail Running", "Rock Climbing", "Hiking"],
      compatibility_score: 80,
      match_reason: "You both love outdoor cardio activities 🏃‍♂️",
      shared_interests: ["Running", "Hiking", "Climbing", "Nature", "Adventure"],
      distance_km: 6.2
    },
    {
      id: "demo-11",
      user_id: "demo-user-11",
      display_name: "Priya Sharma",
      age: 35,
      avatar_url: generateAvatar(111, 'lorelei'),
      bio: "Yoga, Pilates, barre — I love it all! Always seeking the next great wellness workshop. Community over competition! 💫",
      location: "Austin, TX",
      professional_headline: "Marketing Manager & Fitness Lover",
      vitana_index: 671,
      vitana_percentile: 25,
      longevity_archetype: "The Social Mover",
      activity_time_preference: 'evening',
      wellness_journey_stage: 'intermediate',
      top_3_interests: ["Pilates", "Barre", "Group Fitness"],
      compatibility_score: 81,
      match_reason: "You both enjoy group fitness classes 🎉",
      shared_interests: ["Pilates", "Yoga", "Barre", "Group Classes", "Stretching"],
      distance_km: 4.8
    },

    // THE MINDFULNESS SEEKERS (2 profiles)
    {
      id: "demo-12",
      user_id: "demo-user-12",
      display_name: "Daniel Lee",
      age: 43,
      avatar_url: generateAvatar(112, 'avataaars'),
      bio: "Meditation practitioner for 10+ years. Exploring the intersection of mindfulness and daily life. Peace begins within 🧘‍♂️☮️",
      location: "Boulder, CO",
      professional_headline: "Mindfulness Consultant",
      vitana_index: 704,
      vitana_percentile: 18,
      longevity_archetype: "The Present Moment Seeker",
      activity_time_preference: 'morning',
      wellness_journey_stage: 'advanced',
      top_3_interests: ["Meditation", "Mindfulness", "Nature Walks"],
      compatibility_score: 84,
      match_reason: "You both meditate daily and value mental health 🧘‍♂️",
      shared_interests: ["Meditation", "Breathwork", "Journaling", "Reading", "Nature"],
      distance_km: 3.3
    },
    {
      id: "demo-13",
      user_id: "demo-user-13",
      display_name: "Sofia Ramirez",
      age: 37,
      avatar_url: generateAvatar(113, 'lorelei'),
      bio: "Finding calm in chaos through breathwork and journaling. Former burnout survivor now helping others prevent it. Self-care is healthcare 💆‍♀️📔",
      location: "San Diego, CA",
      professional_headline: "Burnout Recovery Coach",
      vitana_index: 689,
      vitana_percentile: 21,
      longevity_archetype: "The Balanced Healer",
      activity_time_preference: 'evening',
      wellness_journey_stage: 'advanced',
      top_3_interests: ["Breathwork", "Journaling", "Therapy"],
      certification_badges: ["Life Coach Certified"],
      compatibility_score: 82,
      match_reason: "Similar focus on mental health and stress management 🌿",
      shared_interests: ["Breathwork", "Journaling", "Meditation", "Therapy", "Self-Care"],
      distance_km: 5.7
    },

    // THE FITNESS ENTHUSIASTS (2 profiles)
    {
      id: "demo-14",
      user_id: "demo-user-14",
      display_name: "Jake Morrison",
      age: 28,
      avatar_url: generateAvatar(114, 'micah'),
      bio: "CrossFit athlete and nutrition nerd. PRs, protein shakes, and pushing limits. Let's get after it! 💪🔥",
      location: "Phoenix, AZ",
      professional_headline: "CrossFit Athlete & Personal Trainer",
      vitana_index: 725,
      vitana_percentile: 13,
      longevity_archetype: "The Strength Seeker",
      activity_time_preference: 'morning',
      wellness_journey_stage: 'advanced',
      top_3_interests: ["CrossFit", "Strength Training", "High-Protein Diet"],
      certification_badges: ["CrossFit L2", "NASM-CPT"],
      compatibility_score: 79,
      match_reason: "You both love high-intensity workouts 3x/week 🏋️",
      shared_interests: ["CrossFit", "HIIT", "Strength", "Protein", "Gains"],
      distance_km: 4.1
    },
    {
      id: "demo-15",
      user_id: "demo-user-15",
      display_name: "Mia Lopez",
      age: 26,
      avatar_url: generateAvatar(115, 'lorelei'),
      bio: "Marathon runner and endurance junkie. If it's a long distance race, I'm in! Training for my 5th marathon this fall 🏃‍♀️💨",
      location: "Chicago, IL",
      professional_headline: "Accountant & Marathon Runner",
      vitana_index: 698,
      vitana_percentile: 19,
      longevity_archetype: "The Endurance Athlete",
      activity_time_preference: 'morning',
      wellness_journey_stage: 'advanced',
      top_3_interests: ["Running", "Zone 2 Training", "Endurance Sports"],
      compatibility_score: 77,
      match_reason: "Both training for long-distance running events 🏃‍♀️",
      shared_interests: ["Running", "Cardio", "Zone 2", "Endurance", "Race Training"],
      distance_km: 7.3
    },

    // THE NUTRITION NERDS (2 profiles)
    {
      id: "demo-16",
      user_id: "demo-user-16",
      display_name: "Tom Anderson",
      age: 40,
      avatar_url: generateAvatar(116, 'adventurer'),
      bio: "Home chef obsessed with whole foods and meal prep. Sunday is for batch cooking! Plant-based recipes are my passion 🥗👨‍🍳",
      location: "Portland, OR",
      professional_headline: "Software Developer & Home Chef",
      vitana_index: 668,
      vitana_percentile: 26,
      longevity_archetype: "The Culinary Optimizer",
      activity_time_preference: 'flexible',
      wellness_journey_stage: 'intermediate',
      top_3_interests: ["Cooking", "Meal Prep", "Plant-Based Nutrition"],
      compatibility_score: 86,
      match_reason: "Shared love for meal prep and plant-based eating 🌱",
      shared_interests: ["Cooking", "Meal Prep", "Plant-Based", "Nutrition", "Recipes"],
      distance_km: 2.7
    },
    {
      id: "demo-17",
      user_id: "demo-user-17",
      display_name: "Isabella Costa",
      age: 33,
      avatar_url: generateAvatar(117, 'lorelei'),
      bio: "Gut health advocate recovering from IBS. Experimenting with elimination diets and fermented foods. Let's talk microbiome! 🦠🥗",
      location: "San Francisco, CA",
      professional_headline: "UX Designer & Gut Health Advocate",
      vitana_index: 652,
      vitana_percentile: 30,
      longevity_archetype: "The Gut Health Explorer",
      activity_time_preference: 'afternoon',
      wellness_journey_stage: 'intermediate',
      top_3_interests: ["Gut Health", "Fermented Foods", "Elimination Diet"],
      compatibility_score: 84,
      match_reason: "Both exploring gut health and nutrition 🦠",
      shared_interests: ["Gut Health", "Nutrition", "Fermented Foods", "Cooking", "Probiotics"],
      distance_km: 1.9
    },

    // THE LONGEVITY ADVOCATES (2 profiles)
    {
      id: "demo-18",
      user_id: "demo-user-18",
      display_name: "Dr. Steven Walsh",
      age: 52,
      avatar_url: generateAvatar(118, 'avataaars'),
      bio: "Physician focused on healthspan, not just lifespan. Zone 2 cardio, strength training, and smart supplementation. Aging optimally! 🧬⏳",
      location: "Boston, MA",
      professional_headline: "Longevity Medicine Doctor",
      vitana_index: 789,
      vitana_percentile: 7,
      longevity_archetype: "The Longevity Scientist",
      activity_time_preference: 'morning',
      wellness_journey_stage: 'professional',
      top_3_interests: ["Zone 2 Training", "VO2 Max", "Longevity Research"],
      certification_badges: ["MD", "Board Certified"],
      compatibility_score: 91,
      match_reason: "Similar longevity goals: optimize healthspan 🧬",
      shared_interests: ["Zone 2", "VO2 Max", "Supplements", "Research", "Anti-Aging"],
      distance_km: 8.4
    },
    {
      id: "demo-19",
      user_id: "demo-user-19",
      display_name: "Grace Nguyen",
      age: 48,
      avatar_url: generateAvatar(119, 'lorelei'),
      bio: "Anti-aging enthusiast exploring NAD+, peptides, and red light therapy. Biohacking my way to 100! Science-backed longevity only 🔬✨",
      location: "San Francisco, CA",
      professional_headline: "Entrepreneur & Longevity Advocate",
      vitana_index: 747,
      vitana_percentile: 11,
      longevity_archetype: "The Age-Defying Pioneer",
      activity_time_preference: 'flexible',
      wellness_journey_stage: 'advanced',
      top_3_interests: ["Anti-Aging", "Red Light Therapy", "Peptides"],
      compatibility_score: 88,
      match_reason: "Both optimizing for longevity and healthspan 🧬",
      shared_interests: ["Anti-Aging", "Supplements", "Red Light", "NAD+", "Research"],
      distance_km: 3.2
    },

    // THE COMMUNITY BUILDERS (2 profiles)
    {
      id: "demo-20",
      user_id: "demo-user-20",
      display_name: "Liam Foster",
      age: 30,
      avatar_url: generateAvatar(120, 'micah'),
      bio: "Group fitness instructor who thrives on community energy. Leading sunrise bootcamps and organizing wellness retreats. Together we're stronger! 💪🤝",
      location: "Los Angeles, CA",
      professional_headline: "Group Fitness Instructor",
      vitana_index: 713,
      vitana_percentile: 16,
      longevity_archetype: "The Community Catalyst",
      activity_time_preference: 'morning',
      wellness_journey_stage: 'professional',
      top_3_interests: ["Group Fitness", "Bootcamp", "Community Building"],
      certification_badges: ["ACE Group Fitness"],
      compatibility_score: 80,
      match_reason: "You both love the energy of group workouts 🎉",
      shared_interests: ["Group Fitness", "HIIT", "Community", "Bootcamp", "Events"],
      distance_km: 5.9
    },
    {
      id: "demo-21",
      user_id: "demo-user-21",
      display_name: "Zoe Mitchell",
      age: 29,
      avatar_url: generateAvatar(121, 'lorelei'),
      bio: "Wellness event organizer bringing people together for hikes, potlucks, and sound baths. Connection is the ultimate wellness practice 🌟🫶",
      location: "Austin, TX",
      professional_headline: "Wellness Event Organizer",
      vitana_index: 679,
      vitana_percentile: 24,
      longevity_archetype: "The Social Connector",
      activity_time_preference: 'flexible',
      wellness_journey_stage: 'advanced',
      top_3_interests: ["Community Events", "Hiking", "Sound Healing"],
      compatibility_score: 83,
      match_reason: "You both value wellness community and connection 🤝",
      shared_interests: ["Community", "Hiking", "Events", "Sound Healing", "Volunteering"],
      distance_km: 4.3
    },

    // THE RECOVERY EXPERT (1 profile)
    {
      id: "demo-22",
      user_id: "demo-user-22",
      display_name: "Kai Robinson",
      age: 36,
      avatar_url: generateAvatar(122, 'adventurer'),
      bio: "Sleep coach and recovery specialist. Teaching people that rest is training. 8-hour sleep streak champion! 😴💤",
      location: "San Diego, CA",
      professional_headline: "Sleep Coach & Recovery Specialist",
      vitana_index: 732,
      vitana_percentile: 13,
      longevity_archetype: "The Restoration Master",
      activity_time_preference: 'evening',
      wellness_journey_stage: 'professional',
      top_3_interests: ["Sleep Optimization", "Recovery", "Sauna"],
      certification_badges: ["Sleep Science Coach"],
      compatibility_score: 85,
      match_reason: "You both prioritize sleep and recovery 😴",
      shared_interests: ["Sleep", "Recovery", "Sauna", "Massage", "Rest Days"],
      distance_km: 3.6
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
