import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, UserCheck, Heart, Users } from 'lucide-react';
import { withCardId } from '@/lib/withCardId';
import { analytics } from '@/lib/analytics';
import { t } from '@/lib/i18n-toast';

interface IntentChip {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  path: string;
  keywords: string[];
}

const intentChips: IntentChip[] = [
  {
    id: 'doctors-coaches',
    title: 'Doctors & Coaches',
    description: 'Find longevity specialists, health coaches, and medical experts',
    icon: UserCheck,
    color: 'bg-blue-500',
    path: '/discover/providers',
    keywords: ['doctor', 'coach', 'physician', 'specialist', 'medical', 'health coach', 'longevity doctor']
  },
  {
    id: 'wellness-services',
    title: 'Wellness Services',
    description: 'Discover yoga, massage, dance, therapy, and recovery services',
    icon: Heart,
    color: 'bg-green-500',
    path: '/discover/categories',
    keywords: ['yoga', 'massage', 'dance', 'therapy', 'wellness', 'spa', 'recovery', 'meditation', 'fitness']
  },
  {
    id: 'community-groups',
    title: 'Community Groups',
    description: 'Join meetups, groups, and connect with like-minded people',
    icon: Users,
    color: 'bg-purple-500',
    path: '/comm/groups',
    keywords: ['meetup', 'group', 'community', 'friends', 'social', 'connect', 'network', 'events']
  }
];

function IntentRouterBase() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const detectIntent = (query: string): IntentChip | null => {
    const lowerQuery = query.toLowerCase();
    
    for (const chip of intentChips) {
      if (chip.keywords.some(keyword => lowerQuery.includes(keyword))) {
        return chip;
      }
    }
    return null;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Track intent selection
    analytics.trackClick('discover-intent-router', '1.0', 'search', undefined, undefined, searchQuery.trim());

    const detectedIntent = detectIntent(searchQuery);
    
    if (detectedIntent) {
      // Track successful intent detection
      analytics.trackClick('discover-intent-router', '1.0', 'intent-detected', undefined, undefined, detectedIntent.id);
      
      navigate(detectedIntent.path + `?q=${encodeURIComponent(searchQuery)}`);
    } else {
      // Default search behavior - go to browse all
      navigate('/discover/browse' + `?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleChipClick = (chip: IntentChip) => {
    // Track chip selection
    analytics.trackClick('discover-intent-router', '1.0', 'chip-click', undefined, undefined, chip.id);

    navigate(chip.path);
  };

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('screens.discover.whatYouLookingForEG')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 pr-4 py-6 text-lg rounded-xl border-2 focus:border-primary bg-background"
          />
        </form>
      </div>

      {/* Intent Chips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {intentChips.map((chip) => {
          const IconComponent = chip.icon;
          return (
            <Card 
              key={chip.id}
              className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20"
              onClick={() => handleChipClick(chip)}
            >
              <CardContent className="p-6 text-center space-y-4">
                <div className={`w-16 h-16 rounded-full ${chip.color} flex items-center justify-center mx-auto group-hover:scale-110 transition-transform`}>
                  <IconComponent className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                    {chip.title}
                  </h3>
                  <p className="text-muted-foreground mt-2 leading-relaxed">
                    {chip.description}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                >{t('screens.discover.exploreTitle', { title: chip.title })}</Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-center">
        <div className="p-4">
          <div className="text-2xl font-bold text-primary">150+</div>
          <div className="text-sm text-muted-foreground">{t('screens.discover.verifiedProviders')}</div>
        </div>
        <div className="p-4">
          <div className="text-2xl font-bold text-primary">50+</div>
          <div className="text-sm text-muted-foreground">{t('screens.discover.serviceCategories')}</div>
        </div>
        <div className="p-4">
          <div className="text-2xl font-bold text-primary">1000+</div>
          <div className="text-sm text-muted-foreground">{t('screens.discover.communityMembers')}</div>
        </div>
      </div>
    </div>
  );
}

export const IntentRouter = withCardId(IntentRouterBase, "CT-DIS-001", "C-001");