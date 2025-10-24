import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Heart, MessageSquare, Share, Edit3, MapPin, ExternalLink, Star } from "lucide-react";
import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";

interface ProfilePostsTabProps {
  profile: UserProfile;
  scope: Scope;
  editMode?: boolean;
  onEditAbout?: () => void;
}

export function ProfilePostsTab({ profile, scope, editMode, onEditAbout }: ProfilePostsTabProps) {
  // Mock posts data - replace with real data
  const mockPosts = [
    {
      id: '1',
      content: 'Starting the day with gratitude and gentle movement. Remember, progress over perfection! 🧘‍♀️',
      likes: 87,
      comments: 12,
      shares: 5,
      date: '3 hours ago',
      type: 'text'
    },
    {
      id: '2',
      content: 'Just finished teaching an amazing sunrise yoga session. The energy was incredible! 🌅',
      image: profile.avatarUrl,
      likes: 156,
      comments: 23,
      shares: 11,
      date: '1 day ago',
      type: 'image'
    }
  ];

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
      {mockPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-6">
          <div className="w-24 h-24 bg-gradient-to-br from-violet-100/50 to-sky-100/50 dark:from-white/5 dark:to-white/10 rounded-3xl backdrop-blur-xl flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
            <MessageSquare className="h-12 w-12 text-violet-400/60 dark:text-violet-300/40" />
          </div>
          <div className="text-center space-y-3">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              Your community is quiet today ☕
            </h3>
            <p className="text-sm text-muted-foreground/80 max-w-sm leading-[1.75] tracking-wide">
              Start the conversation and share your wellness journey
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* About Section */}
          {profile.bio && (
            <Card className="rounded-2xl bg-white/70 dark:bg-black/30 backdrop-blur-xl border border-white/30 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_22px_rgba(0,0,0,0.08)] transition-all px-5 py-4 md:px-6 md:py-5">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold">About</h3>
                {editMode && onEditAbout && (
                  <Button variant="soft" size="xs" onClick={onEditAbout}>
                    <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                    Edit About
                  </Button>
                )}
              </div>
              <p className="text-gray-800 dark:text-gray-100 mb-4 leading-[1.75] tracking-wide">{profile.bio}</p>
          
          {/* Location */}
          {profile.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <MapPin className="h-4 w-4" />
              {profile.location}
            </div>
          )}
          
              {/* Links */}
              {profile.links && profile.links.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {profile.links.map((link, index) => (
                    <Button key={index} variant="link" size="sm" className="h-auto p-0">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      {link.label}
                    </Button>
                  ))}
                </div>
              )}
              
              {/* Languages */}
              {profile.languages && profile.languages.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {profile.languages.map((language, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {language}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Posts */}
          <TooltipProvider>
            {mockPosts.map((post, index) => (
              <Card 
                key={post.id} 
                className="rounded-2xl bg-white/70 dark:bg-black/30 backdrop-blur-xl border border-white/30 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_22px_rgba(0,0,0,0.08)] hover:translate-y-[-2px] transition-all duration-300 ease-out animate-fade-in-up overflow-hidden motion-reduce:hover:translate-y-0"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Aurora gradient bar */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-200/10 via-violet-300/20 to-transparent" />
                
                <div className="space-y-4 relative px-5 py-4 md:px-6 md:py-5">
                  <div className="flex items-start gap-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar className="h-11 w-11 ring-1 ring-violet-200/50 dark:ring-violet-400/20 hover:ring-2 hover:ring-violet-300/70 dark:hover:ring-violet-400/50 hover:outline hover:outline-1 hover:outline-violet-200/50 dark:hover:outline-violet-400/30 transition-all duration-300 cursor-pointer motion-reduce:hover:scale-100">
                          <AvatarImage src={profile.avatarUrl} alt={profile.name} />
                          <AvatarFallback>{profile.name[0]}</AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1">
                          <p className="font-medium">{profile.name}</p>
                          {profile.bio && <p className="text-xs text-muted-foreground">{profile.bio.slice(0, 50)}...</p>}
                          <p className="text-xs text-violet-600 dark:text-violet-400">Community Member</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-base tracking-wide text-gray-800 dark:text-gray-100">{profile.name}</span>
                        <span className="text-muted-foreground/70 text-sm">@{profile.handle} • {post.date}</span>
                      </div>
                      <p className="mt-2.5 text-gray-800 dark:text-gray-100 leading-[1.75] tracking-wide">
                        {post.content.split(' ').map((word, i) => {
                          if (word.startsWith('#') || word.startsWith('@')) {
                            return (
                              <span key={i} className="bg-gradient-to-r from-violet-500 to-blue-400 bg-clip-text text-transparent font-semibold">
                                {word}{' '}
                              </span>
                            );
                          }
                          return word + ' ';
                        })}
                      </p>
                      {post.image && (
                        <div className="mt-4 rounded-xl overflow-hidden shadow-md">
                          <img src={post.image} alt="Post image" className="w-full h-48 object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="border-t border-white/20 my-3" />
                  
                  <div className="flex items-center gap-6 px-3 py-2 rounded-full bg-gradient-to-r from-violet-50/70 to-sky-50/70 dark:from-white/5 dark:to-white/10">
                    <button 
                      className="flex items-center gap-2 text-muted-foreground hover:text-pink-500 transition-all duration-200 group motion-reduce:hover:scale-100"
                      aria-label="Like post"
                      title="Like"
                    >
                      <Heart className="h-4 w-4 group-hover:fill-current motion-reduce:group-hover:scale-100 group-hover:scale-[1.05] transition-all" />
                      <span className="text-sm font-medium motion-reduce:group-hover:scale-100 group-hover:scale-[1.08] transition-transform">{post.likes}</span>
                    </button>
                    <button 
                      className="flex items-center gap-2 text-muted-foreground hover:text-blue-500 transition-all duration-200 group motion-reduce:hover:scale-100"
                      aria-label="Comment on post"
                      title="Comment"
                    >
                      <MessageSquare className="h-4 w-4 group-hover:fill-current motion-reduce:group-hover:scale-100 group-hover:scale-[1.05] transition-all" />
                      <span className="text-sm font-medium motion-reduce:group-hover:scale-100 group-hover:scale-[1.08] transition-transform">{post.comments}</span>
                    </button>
                    <button 
                      className="flex items-center gap-2 text-muted-foreground hover:text-violet-500 transition-all duration-200 group motion-reduce:hover:scale-100"
                      aria-label="Share post"
                      title="Share"
                    >
                      <Share className="h-4 w-4 group-hover:fill-current motion-reduce:group-hover:scale-100 group-hover:scale-[1.05] transition-all" />
                      <span className="text-sm font-medium motion-reduce:group-hover:scale-100 group-hover:scale-[1.08] transition-transform">{post.shares}</span>
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </TooltipProvider>
        </>
      )}
    </div>
  );
}