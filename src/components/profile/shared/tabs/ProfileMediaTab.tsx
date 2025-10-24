import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, Headphones, Music, Play, Eye, Users, Sparkles } from "lucide-react";
import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";
import { cn } from "@/lib/utils";

interface ProfileMediaTabProps {
  profile: UserProfile;
  scope: Scope;
  editMode?: boolean;
}

type MediaCategory = 'all' | 'video' | 'music' | 'podcast' | 'guided';

export function ProfileMediaTab({ profile, scope, editMode }: ProfileMediaTabProps) {
  const [activeCategory, setActiveCategory] = useState<MediaCategory>('all');

  // Diverse mock media content
  const mockMedia = [
    {
      id: '1',
      type: 'video',
      category: 'video' as MediaCategory,
      title: '15-Minute Morning Flow',
      thumbnail: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?w=800',
      duration: '15:23',
      views: 2300,
      date: '2 days ago',
      size: 'large'
    },
    {
      id: '2',
      type: 'podcast',
      category: 'podcast' as MediaCategory,
      title: 'Finding Inner Peace Through Daily Practice',
      thumbnail: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800',
      duration: '32:15',
      plays: 890,
      date: '1 week ago',
      size: 'medium'
    },
    {
      id: '3',
      type: 'music',
      category: 'music' as MediaCategory,
      title: 'Meditation Sounds',
      thumbnail: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800',
      duration: '8:45',
      plays: 1456,
      date: '2 weeks ago',
      size: 'small'
    },
    {
      id: '4',
      type: 'video',
      category: 'video' as MediaCategory,
      title: 'Sunset Yoga Session',
      thumbnail: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800',
      duration: '22:10',
      views: 3420,
      date: '3 days ago',
      size: 'medium'
    },
    {
      id: '5',
      type: 'guided',
      category: 'guided' as MediaCategory,
      title: 'Guided Breathwork Journey',
      thumbnail: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=800',
      duration: '12:30',
      plays: 678,
      date: '5 days ago',
      size: 'large'
    },
    {
      id: '6',
      type: 'music',
      category: 'music' as MediaCategory,
      title: 'Deep Focus Ambient Mix',
      thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
      duration: '45:00',
      plays: 2890,
      date: '1 week ago',
      size: 'small'
    },
    {
      id: '7',
      type: 'podcast',
      category: 'podcast' as MediaCategory,
      title: 'The Science of Mindfulness',
      thumbnail: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800',
      duration: '28:45',
      plays: 1234,
      date: '4 days ago',
      size: 'medium'
    },
    {
      id: '8',
      type: 'video',
      category: 'video' as MediaCategory,
      title: 'Evening Wind Down Routine',
      thumbnail: 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=800',
      duration: '18:55',
      views: 1890,
      date: '6 days ago',
      size: 'large'
    }
  ];

  const categories = [
    { id: 'all' as MediaCategory, label: 'All', icon: Sparkles },
    { id: 'video' as MediaCategory, label: 'Videos', icon: Video },
    { id: 'music' as MediaCategory, label: 'Music', icon: Music },
    { id: 'podcast' as MediaCategory, label: 'Podcasts', icon: Headphones },
    { id: 'guided' as MediaCategory, label: 'Guided Sessions', icon: Play },
  ];

  const filteredMedia = activeCategory === 'all' 
    ? mockMedia 
    : mockMedia.filter(item => item.category === activeCategory);

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'podcast': return <Headphones className="h-4 w-4" />;
      case 'music': return <Music className="h-4 w-4" />;
      case 'guided': return <Sparkles className="h-4 w-4" />;
      default: return <Play className="h-4 w-4" />;
    }
  };

  const getMetricIcon = (type: string) => {
    return type === 'video' ? <Eye className="h-3 w-3" /> : <Users className="h-3 w-3" />;
  };

  const getMetricCount = (item: any) => {
    return item.views || item.plays || 0;
  };

  const getSectionTitle = (category: MediaCategory) => {
    switch (category) {
      case 'video': return '🎥 Latest Videos';
      case 'music': return '🎧 Favorite Sounds';
      case 'podcast': return '🎙️ Featured Podcasts';
      case 'guided': return '✨ Guided Sessions';
      default: return '📚 All Media';
    }
  };

  const getCardHeight = (size: string) => {
    switch (size) {
      case 'large': return 'row-span-2';
      case 'medium': return 'row-span-1';
      case 'small': return 'row-span-1';
      default: return 'row-span-1';
    }
  };

  if (filteredMedia.length === 0) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-6 animate-fadeInUp">
        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                "border-2 backdrop-blur-sm",
                activeCategory === cat.id
                  ? "bg-gradient-to-r from-violet-500 to-blue-400 text-white border-transparent shadow-lg"
                  : "bg-white/40 border-white/50 text-gray-700 dark:text-gray-200 hover:bg-white/60"
              )}
            >
              <cat.icon className="h-4 w-4" />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Empty state */}
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-20 h-20 bg-gradient-to-br from-violet-100/50 to-sky-100/50 dark:from-white/5 dark:to-white/10 rounded-2xl backdrop-blur-xl flex items-center justify-center animate-pulse">
            <Music className="h-10 w-10 text-gray-400" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">
              No {activeCategory === 'all' ? 'media' : categories.find(c => c.id === activeCategory)?.label.toLowerCase()} yet
            </h3>
            <p className="text-sm text-muted-foreground">
              Upload your first track and start sharing your content
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fadeInUp">
      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
              "border-2 backdrop-blur-sm",
              activeCategory === cat.id
                ? "bg-gradient-to-r from-violet-500 to-blue-400 text-white border-transparent shadow-lg"
                : "bg-white/40 border-white/50 text-gray-700 dark:text-gray-200 hover:bg-white/60"
            )}
          >
            <cat.icon className="h-4 w-4" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Section title */}
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          {getSectionTitle(activeCategory)}
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent dark:from-white/20" />
      </div>

      {/* Masonry grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[200px]">
        {filteredMedia.map((item, index) => (
          <Card 
            key={item.id} 
            className={cn(
              "group cursor-pointer transition-all duration-300 ease-out overflow-hidden",
              "bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl",
              "shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)]",
              "hover:-translate-y-1",
              getCardHeight(item.size)
            )}
            style={{
              animationDelay: `${index * 50}ms`
            }}
          >
            <div className="relative h-full w-full">
              {/* Thumbnail with gradient overlay */}
              <img 
                src={item.thumbnail} 
                alt={item.title}
                className="w-full h-full object-cover"
              />
              
              {/* Bottom gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              
              {/* Play button overlay on hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform">
                  <Play className="h-8 w-8 text-white ml-1" />
                </div>
              </div>
              
              {/* Duration badge */}
              <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs rounded-full px-2 py-1 backdrop-blur-sm">
                {item.duration}
              </div>

              {/* Content info */}
              <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg">
                    {getMediaIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-white line-clamp-2 drop-shadow-lg">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-white/90">
                      <div className="flex items-center gap-1">
                        {getMetricIcon(item.type)}
                        <span className="drop-shadow">{getMetricCount(item).toLocaleString()}</span>
                      </div>
                      <span className="drop-shadow">{item.date}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}