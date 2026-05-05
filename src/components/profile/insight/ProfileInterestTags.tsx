import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface ProfileInterestTagsProps {
  interests?: string[];
  className?: string;
}

const defaultInterests = [
  'Yoga', 
  'Meditation', 
  'Fitness', 
  'Nutrition', 
  'Mental Health',
  'Mindfulness',
  'Wellness Coaching',
  'Plant-Based Living'
];

const getInterestColor = (interest: string) => {
  const lowerInterest = interest.toLowerCase();
  
  if (lowerInterest.includes('yoga') || lowerInterest.includes('fitness') || lowerInterest.includes('exercise')) {
    return 'bg-gradient-to-r from-[hsl(var(--pill-physical-accent))] to-[hsl(var(--pill-physical-accent)/0.7)] text-white border-0';
  }
  if (lowerInterest.includes('meditat') || lowerInterest.includes('mental') || lowerInterest.includes('mindful')) {
    return 'bg-gradient-to-r from-[hsl(var(--pill-mental-accent))] to-[hsl(var(--pill-mental-accent)/0.7)] text-white border-0';
  }
  if (lowerInterest.includes('nutrition') || lowerInterest.includes('food') || lowerInterest.includes('plant')) {
    return 'bg-gradient-to-r from-[hsl(var(--pill-nutrition-accent))] to-[hsl(var(--pill-nutrition-accent)/0.7)] text-white border-0';
  }
  if (lowerInterest.includes('coach') || lowerInterest.includes('profession')) {
    return 'bg-gradient-to-r from-[hsl(var(--util-profile-accent))] to-[hsl(var(--util-profile-accent)/0.7)] text-white border-0';
  }
  
  return 'bg-gradient-to-r from-[hsl(var(--domain-community-accent))] to-[hsl(var(--domain-community-accent)/0.7)] text-white border-0';
};

export function ProfileInterestTags({ interests, className }: ProfileInterestTagsProps) {
  const displayInterests = interests && interests.length > 0 ? interests : defaultInterests;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Sparkles className="h-4 w-4" />
        <span>{t('screens.profile.interestsExpertise')}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {displayInterests.map((interest, index) => (
          <Badge 
            key={index}
            className={`px-3 py-1 text-sm font-medium ${getInterestColor(interest)} hover:scale-105 transition-transform cursor-default`}
          >
            {interest}
          </Badge>
        ))}
      </div>
    </div>
  );
}
