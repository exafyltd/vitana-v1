import { useMemo } from 'react';
import { UserProfile } from '@/types/profile';

interface ProfileProgressSection {
  id: string;
  name: string;
  completed: boolean;
  weight: number;
  description: string;
}

export function useProfileProgress(profile: UserProfile) {
  const sections = useMemo((): ProfileProgressSection[] => [
    {
      id: 'identity',
      name: 'Basic Information',
      completed: !!(profile.name && profile.handle),
      weight: 20,
      description: 'Name and handle'
    },
    {
      id: 'avatar',
      name: 'Profile Photo',
      completed: !!profile.avatarUrl,
      weight: 15,
      description: 'Upload a profile picture'
    },
    {
      id: 'about',
      name: 'About Section',
      completed: !!(profile.bio && profile.bio.length > 50),
      weight: 20,
      description: 'Tell others about yourself (50+ characters)'
    },
    {
      id: 'location',
      name: 'Location',
      completed: !!profile.location,
      weight: 10,
      description: 'Add your location'
    },
    {
      id: 'links',
      name: 'Links',
      completed: !!(profile.links?.length),
      weight: 10,
      description: 'Add social links or website'
    },
    {
      id: 'cover',
      name: 'Cover Photo',
      completed: !!profile.coverUrl,
      weight: 15,
      description: 'Add a cover image to your profile'
    },
    {
      id: 'languages',
      name: 'Languages',
      completed: !!(profile.languages?.length),
      weight: 5,
      description: 'List languages you speak'
    },
    {
      id: 'services',
      name: 'Service Offerings',
      completed: !!(profile.offerings?.some(o => o.status === 'published')),
      weight: 5,
      description: 'Create service offerings (if professional)'
    }
  ], [profile]);

  const completedSections = sections.filter(section => section.completed);
  const incompleteSections = sections.filter(section => !section.completed);
  
  const completionPercentage = Math.round(
    completedSections.reduce((sum, section) => sum + section.weight, 0)
  );

  const nextSuggestion = incompleteSections
    .sort((a, b) => b.weight - a.weight)[0];

  return {
    sections,
    completedSections,
    incompleteSections,
    completionPercentage,
    nextSuggestion,
    isComplete: completionPercentage === 100
  };
}