/**
 * VTID-05510 — the static catalogue src/pages/discover/WellnessServices.tsx
 * renders (`categoryServicesData`, :91-162, and `categories`, :170-277),
 * copied verbatim. The category names / descriptions / featured lines are the
 * web's own `screens.discover.ws*` catalog keys; the service rows are the
 * web's hard-coded English sample data, shown unchanged in every locale on the
 * web, so they are data here too (parity, not UI chrome).
 */
import type { DiscoverTone } from '../../ports/discover';

export interface WellnessService {
  id: string;
  title: string;
  description: string;
  duration: string;
  price: number;
  vitanaImpact: number;
  badge?: string;
  icon: string;
  provider: string;
  rating: number;
}

export interface WellnessCategory {
  id: number;
  nameKey: string;
  descKey: string;
  icon: string;
  tone: DiscoverTone;
  count: number;
  featuredKeys: string[];
}

const ws = (k: string) => `screens.discover.${k}`;

export const WELLNESS_CATEGORIES: readonly WellnessCategory[] = [
  { id: 1, nameKey: ws('wsCategory_longevity_name'), descKey: ws('wsCategory_longevity_desc'), icon: 'Stethoscope', tone: 'domain-health-accent', count: 234, featuredKeys: ['wsFeatured_healthAssessments', 'wsFeatured_ivTherapy', 'wsFeatured_hormoneOptimization', 'wsFeatured_biomarkerAnalysis'].map(ws) },
  { id: 2, nameKey: ws('wsCategory_fitness_name'), descKey: ws('wsCategory_fitness_desc'), icon: 'Dumbbell', tone: 'pill-exercise-accent', count: 156, featuredKeys: ['wsFeatured_functionalFitness', 'wsFeatured_mobilityTraining', 'wsFeatured_strengthBuilding', 'wsFeatured_flexibilityPrograms'].map(ws) },
  { id: 3, nameKey: ws('wsCategory_mental_name'), descKey: ws('wsCategory_mental_desc'), icon: 'Brain', tone: 'pill-mental-accent', count: 189, featuredKeys: ['wsFeatured_meditation', 'wsFeatured_stressManagement', 'wsFeatured_cognitiveTraining', 'wsFeatured_therapySessions'].map(ws) },
  { id: 4, nameKey: ws('wsCategory_recovery_name'), descKey: ws('wsCategory_recovery_desc'), icon: 'Sparkles', tone: 'sys-vitana-accent', count: 123, featuredKeys: ['wsFeatured_massageTherapy', 'wsFeatured_coldPlunge', 'wsFeatured_infraredSauna', 'wsFeatured_redLightTherapy'].map(ws) },
  { id: 5, nameKey: ws('wsCategory_nutrition_name'), descKey: ws('wsCategory_nutrition_desc'), icon: 'Leaf', tone: 'pill-nutrition-accent', count: 267, featuredKeys: ['wsFeatured_mealPlanning', 'wsFeatured_nutritionalCounseling', 'wsFeatured_supplementPlans', 'wsFeatured_dietaryAnalysis'].map(ws) },
  { id: 6, nameKey: ws('wsCategory_sleep_name'), descKey: ws('wsCategory_sleep_desc'), icon: 'Coffee', tone: 'pill-sleep-accent', count: 89, featuredKeys: ['wsFeatured_sleepStudies', 'wsFeatured_sleepCoaching', 'wsFeatured_circadianRhythm', 'wsFeatured_sleepEnvironment'].map(ws) },
  { id: 7, nameKey: ws('wsCategory_biohacking_name'), descKey: ws('wsCategory_biohacking_desc'), icon: 'Zap', tone: 'sys-ai-accent', count: 145, featuredKeys: ['wsFeatured_wearableTech', 'wsFeatured_performanceTesting', 'wsFeatured_optimizationPlans', 'wsFeatured_trackingSystems'].map(ws) },
  { id: 8, nameKey: ws('wsCategory_hospitality_name'), descKey: ws('wsCategory_hospitality_desc'), icon: 'Heart', tone: 'domain-community-accent', count: 67, featuredKeys: ['wsFeatured_wellnessRetreats', 'wsFeatured_spaExperiences', 'wsFeatured_destinationWellness', 'wsFeatured_immersivePrograms'].map(ws) },
];

export const CATEGORY_SERVICES: Record<number, WellnessService[]> = {
  1: [
    { id: 'WS-101', title: 'Advanced Health Assessment', description: 'Comprehensive biomarker analysis and health evaluation', duration: '2 hours', price: 399, vitanaImpact: 25, badge: 'Popular', icon: 'Stethoscope', provider: 'Dr. Sarah Chen', rating: 4.9 },
    { id: 'WS-102', title: 'IV Vitamin Therapy', description: 'Customized vitamin infusions for optimal wellness', duration: '45 mins', price: 150, vitanaImpact: 15, badge: 'Trending', icon: 'Heart', provider: 'Wellness Center', rating: 4.8 },
    { id: 'WS-103', title: 'Hormone Optimization Consultation', description: 'Expert guidance on hormone balance', duration: '60 mins', price: 250, vitanaImpact: 20, badge: 'New', icon: 'Sparkles', provider: 'Dr. Michael Ross', rating: 4.9 },
    { id: 'WS-104', title: 'Biomarker Analysis & Report', description: 'In-depth blood work and biomarker tracking', duration: '1 hour', price: 299, vitanaImpact: 22, icon: 'Stethoscope', provider: 'Lab Partners', rating: 4.7 },
    { id: 'WS-105', title: 'Peptide Therapy Session', description: 'Advanced peptide treatments for longevity', duration: '90 mins', price: 450, vitanaImpact: 30, badge: 'Premium', icon: 'Zap', provider: 'Longevity Clinic', rating: 5.0 },
    { id: 'WS-106', title: 'Longevity Clinic Visit', description: 'Full consultation with longevity specialist', duration: '2 hours', price: 500, vitanaImpact: 35, icon: 'Heart', provider: 'Dr. James Liu', rating: 4.9 },
  ],
  2: [
    { id: 'WS-201', title: 'Functional Fitness Class', description: 'Full-body functional training session', duration: '60 mins', price: 45, vitanaImpact: 10, badge: 'Popular', icon: 'Dumbbell', provider: 'FitLife Studio', rating: 4.8 },
    { id: 'WS-202', title: 'Mobility Training Session', description: 'Improve flexibility and range of motion', duration: '45 mins', price: 60, vitanaImpact: 8, icon: 'Sparkles', provider: 'Movement Lab', rating: 4.7 },
    { id: 'WS-203', title: 'Strength Building Program', description: '12-week progressive strength training', duration: '8 weeks', price: 599, vitanaImpact: 50, badge: 'Trending', icon: 'Dumbbell', provider: 'PowerHouse Gym', rating: 4.9 },
    { id: 'WS-204', title: 'Flexibility Workshop', description: 'Advanced stretching and flexibility techniques', duration: '90 mins', price: 75, vitanaImpact: 12, icon: 'Heart', provider: 'Yoga Haven', rating: 4.6 },
    { id: 'WS-205', title: 'Personal Training Package', description: '10 one-on-one training sessions', duration: '10 sessions', price: 850, vitanaImpact: 45, badge: 'Premium', icon: 'Dumbbell', provider: 'Elite Trainers', rating: 5.0 },
    { id: 'WS-206', title: 'Group Fitness Membership', description: 'Unlimited group classes monthly', duration: '30 days', price: 199, vitanaImpact: 40, icon: 'Heart', provider: 'Community Fit', rating: 4.8 },
  ],
  3: [
    { id: 'WS-301', title: 'Guided Meditation Session', description: 'Mindfulness and relaxation practice', duration: '30 mins', price: 35, vitanaImpact: 8, badge: 'Popular', icon: 'Brain', provider: 'Mindful Path', rating: 4.9 },
    { id: 'WS-302', title: 'Stress Management Workshop', description: 'Learn effective stress reduction techniques', duration: '2 hours', price: 125, vitanaImpact: 15, icon: 'Sparkles', provider: 'Wellness Institute', rating: 4.7 },
    { id: 'WS-303', title: 'Cognitive Training Program', description: 'Brain fitness and memory enhancement', duration: '8 weeks', price: 399, vitanaImpact: 35, badge: 'Trending', icon: 'Brain', provider: 'Neuro Wellness', rating: 4.8 },
    { id: 'WS-304', title: 'Therapy Session (Individual)', description: 'One-on-one mental health counseling', duration: '50 mins', price: 150, vitanaImpact: 20, icon: 'Heart', provider: 'Dr. Emily Stone', rating: 5.0 },
    { id: 'WS-305', title: 'Mindfulness Class Series', description: '6-week mindfulness training program', duration: '6 weeks', price: 299, vitanaImpact: 30, icon: 'Brain', provider: 'Zen Center', rating: 4.8 },
    { id: 'WS-306', title: 'Mental Health Coaching', description: 'Life coaching focused on mental wellness', duration: '60 mins', price: 175, vitanaImpact: 22, badge: 'New', icon: 'Sparkles', provider: 'Coach Maria', rating: 4.9 },
  ],
  4: [
    { id: 'WS-401', title: 'Deep Tissue Massage', description: 'Therapeutic massage for muscle recovery', duration: '90 mins', price: 140, vitanaImpact: 18, badge: 'Popular', icon: 'Heart', provider: 'Healing Hands', rating: 4.9 },
    { id: 'WS-402', title: 'Cold Plunge Session', description: 'Cryotherapy for recovery and vitality', duration: '15 mins', price: 45, vitanaImpact: 10, badge: 'Trending', icon: 'Sparkles', provider: 'Recovery Lab', rating: 4.8 },
    { id: 'WS-403', title: 'Infrared Sauna Session', description: 'Detox and relaxation sauna experience', duration: '45 mins', price: 65, vitanaImpact: 12, icon: 'Heart', provider: 'Wellness Spa', rating: 4.7 },
    { id: 'WS-404', title: 'Red Light Therapy', description: 'Cellular recovery and skin health', duration: '30 mins', price: 55, vitanaImpact: 10, icon: 'Zap', provider: 'Biohack Center', rating: 4.8 },
    { id: 'WS-405', title: 'Cryotherapy Package', description: '10 whole-body cryotherapy sessions', duration: '10 sessions', price: 399, vitanaImpact: 40, badge: 'Premium', icon: 'Sparkles', provider: 'Ice House', rating: 4.9 },
    { id: 'WS-406', title: 'Float Therapy Session', description: 'Sensory deprivation tank experience', duration: '60 mins', price: 85, vitanaImpact: 15, icon: 'Heart', provider: 'Float Studio', rating: 4.8 },
  ],
  5: [
    { id: 'WS-501', title: 'Nutrition Consultation', description: 'Personalized meal planning and guidance', duration: '60 mins', price: 120, vitanaImpact: 15, badge: 'Popular', icon: 'Leaf', provider: 'Nutritionist Lisa', rating: 4.9 },
    { id: 'WS-502', title: 'Custom Supplement Plan', description: 'Tailored supplement recommendations', duration: '45 mins', price: 95, vitanaImpact: 12, icon: 'Sparkles', provider: 'Supplement Lab', rating: 4.7 },
    { id: 'WS-503', title: 'Dietary Analysis Package', description: 'Comprehensive nutrition assessment', duration: '90 mins', price: 225, vitanaImpact: 20, badge: 'Trending', icon: 'Leaf', provider: 'Nutrition Pro', rating: 4.8 },
    { id: 'WS-504', title: 'Meal Prep Service', description: 'Weekly prepared healthy meals', duration: '7 days', price: 299, vitanaImpact: 25, icon: 'Heart', provider: 'Clean Eats', rating: 4.6 },
    { id: 'WS-505', title: 'Nutrition Workshop', description: 'Learn healthy eating principles', duration: '3 hours', price: 85, vitanaImpact: 10, icon: 'Leaf', provider: 'Food Academy', rating: 4.7 },
    { id: 'WS-506', title: 'Premium Supplement Box', description: 'Monthly curated supplement delivery', duration: '30 days', price: 199, vitanaImpact: 20, badge: 'Premium', icon: 'Sparkles', provider: 'Vitality Box', rating: 4.9 },
  ],
  6: [
    { id: 'WS-601', title: 'Sleep Study & Analysis', description: 'Comprehensive sleep assessment', duration: '1 night', price: 499, vitanaImpact: 30, badge: 'Popular', icon: 'Coffee', provider: 'Sleep Center', rating: 4.8 },
    { id: 'WS-602', title: 'Sleep Coaching Session', description: 'Expert guidance for better sleep', duration: '60 mins', price: 125, vitanaImpact: 15, icon: 'Brain', provider: 'Sleep Doctor', rating: 4.9 },
    { id: 'WS-603', title: 'Circadian Rhythm Reset', description: '4-week program to optimize your sleep cycle', duration: '4 weeks', price: 299, vitanaImpact: 25, badge: 'Trending', icon: 'Coffee', provider: 'Rhythm Lab', rating: 4.7 },
    { id: 'WS-604', title: 'Sleep Environment Consultation', description: 'Optimize your bedroom for better sleep', duration: '90 mins', price: 175, vitanaImpact: 18, icon: 'Heart', provider: 'Sleep Design', rating: 4.8 },
    { id: 'WS-605', title: 'Sleep Tracking Setup', description: 'Professional wearable setup and analysis', duration: '45 mins', price: 85, vitanaImpact: 10, icon: 'Zap', provider: 'Tech Sleep', rating: 4.6 },
    { id: 'WS-606', title: 'Insomnia Treatment Program', description: 'CBT-I therapy for chronic insomnia', duration: '8 weeks', price: 899, vitanaImpact: 50, badge: 'Premium', icon: 'Brain', provider: 'Dr. Sleep', rating: 5.0 },
  ],
  7: [
    { id: 'WS-701', title: 'Wearable Tech Consultation', description: 'Optimize your health tracking devices', duration: '60 mins', price: 150, vitanaImpact: 15, badge: 'Popular', icon: 'Zap', provider: 'Biohack Pro', rating: 4.8 },
    { id: 'WS-702', title: 'Performance Testing', description: 'VO2 max and metabolic analysis', duration: '90 mins', price: 275, vitanaImpact: 22, badge: 'Trending', icon: 'Dumbbell', provider: 'Performance Lab', rating: 4.9 },
    { id: 'WS-703', title: 'Optimization Protocol', description: 'Personalized biohacking roadmap', duration: '2 hours', price: 399, vitanaImpact: 30, icon: 'Sparkles', provider: 'Optimize Me', rating: 4.8 },
    { id: 'WS-704', title: 'Biometric Analysis', description: 'Advanced body composition and health metrics', duration: '60 mins', price: 225, vitanaImpact: 20, icon: 'Stethoscope', provider: 'Body Lab', rating: 4.7 },
    { id: 'WS-705', title: 'Tracking System Setup', description: 'Complete health data integration', duration: '90 mins', price: 199, vitanaImpact: 18, icon: 'Zap', provider: 'Data Health', rating: 4.8 },
    { id: 'WS-706', title: 'Elite Biohacking Package', description: '12-month comprehensive optimization', duration: '12 months', price: 2999, vitanaImpact: 150, badge: 'Premium', icon: 'Star', provider: 'Elite Health', rating: 5.0 },
  ],
  8: [
    { id: 'WS-801', title: 'Weekend Wellness Retreat', description: '3-day rejuvenation experience', duration: '3 days', price: 1299, vitanaImpact: 60, badge: 'Popular', icon: 'Heart', provider: 'Serenity Resort', rating: 4.9 },
    { id: 'WS-802', title: 'Luxury Spa Day', description: 'Full day of pampering and treatments', duration: '8 hours', price: 499, vitanaImpact: 35, badge: 'Trending', icon: 'Sparkles', provider: 'Grand Spa', rating: 4.8 },
    { id: 'WS-803', title: 'Destination Wellness Trip', description: '7-day immersive wellness vacation', duration: '7 days', price: 3999, vitanaImpact: 100, badge: 'Premium', icon: 'Plane', provider: 'Wellness Travel', rating: 5.0 },
    { id: 'WS-804', title: 'Wellness Immersion Program', description: '14-day transformation experience', duration: '14 days', price: 6999, vitanaImpact: 150, icon: 'Heart', provider: 'Transform Center', rating: 4.9 },
    { id: 'WS-805', title: 'Recovery Weekend', description: '2-day focused recovery retreat', duration: '2 days', price: 899, vitanaImpact: 45, icon: 'Sparkles', provider: 'Recovery Lodge', rating: 4.8 },
    { id: 'WS-806', title: 'Couples Wellness Package', description: 'Shared wellness experience for two', duration: '2 days', price: 1799, vitanaImpact: 70, icon: 'Heart', provider: 'Couples Retreat', rating: 4.9 },
  ],
};
