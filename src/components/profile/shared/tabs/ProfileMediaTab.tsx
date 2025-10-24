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
        {/* Category filters - Floating glass segmented control */}
        <div className="flex justify-center">
          <div className="inline-flex gap-1 p-1 bg-white/70 backdrop-blur-xl border border-white/30 rounded-full shadow-sm">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300",
                  activeCategory === cat.id
                    ? "bg-gradient-to-r from-violet-500 to-blue-400 text-white shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                    : "text-gray-700 dark:text-gray-300 hover:bg-white/50"
                )}
              >
                <cat.icon className="h-4 w-4" />
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Empty state with elegant glass shimmer */}
        <div className="flex flex-col items-center justify-center py-20 space-y-6">
          <div className="w-24 h-24 bg-gradient-to-br from-violet-100/50 to-sky-100/50 dark:from-white/5 dark:to-white/10 rounded-3xl backdrop-blur-xl flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
            <Music className="h-12 w-12 text-violet-400/60 dark:text-violet-300/40" />
          </div>
          <div className="text-center space-y-3">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              No {activeCategory === 'all' ? 'media' : categories.find(c => c.id === activeCategory)?.label.toLowerCase()} yet
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm leading-relaxed">
              Upload your first track and start sharing your creative content with the world
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fadeInUp">
      {/* Category filters - Floating glass segmented control */}
      <div className="flex justify-center">
        <div className="inline-flex gap-1 p-1 bg-white/70 backdrop-blur-xl border border-white/30 rounded-full shadow-sm">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300",
                activeCategory === cat.id
                  ? "bg-gradient-to-r from-violet-500 to-blue-400 text-white shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                  : "text-gray-700 dark:text-gray-300 hover:bg-white/50"
              )}
            >
              <cat.icon className="h-4 w-4" />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section title with gradient underline */}
      <div className="flex items-center gap-3">
        <h2 className="relative text-xl font-semibold text-gray-800 dark:text-gray-100">
          {getSectionTitle(activeCategory)}
          <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-400 via-sky-400 to-transparent opacity-60" />
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
              "bg-white/60 backdrop-blur-xl rounded-2xl",
              "border border-transparent bg-gradient-to-br from-violet-300/40 to-sky-200/40 bg-clip-padding",
              "shadow-[0_4px_10px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_22px_rgba(0,0,0,0.1)]",
              "hover:scale-[1.015]",
              getCardHeight(item.size)
            )}
            style={{
              animationDelay: `${index * 50}ms`
            }}
          >
            <div className="relative h-full w-full overflow-hidden rounded-2xl">
              {/* Thumbnail with zoom on hover */}
              <img 
                src={item.thumbnail} 
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              
              {/* Bottom gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
              
              {/* Play button overlay on hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform">
                  <Play className="h-8 w-8 text-white ml-1" />
                </div>
              </div>
              
              {/* Duration badge */}
              <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs rounded-full px-2 py-1 backdrop-blur-sm font-medium">
                {item.duration}
              </div>

              {/* Content info */}
              <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg text-white">
                    {getMediaIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-white line-clamp-2 drop-shadow-lg">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-white/80">
                      <div className="flex items-center gap-1">
                        {getMetricIcon(item.type)}
                        <span className="drop-shadow">{getMetricCount(item).toLocaleString()}</span>
                      </div>
                      <span className="drop-shadow opacity-80">{item.date}</span>
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