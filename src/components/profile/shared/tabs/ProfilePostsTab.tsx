import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageSquare, Share } from "lucide-react";
import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";

interface ProfilePostsTabProps {
  profile: UserProfile;
  scope: Scope;
  editMode?: boolean;
  onEditAbout?: () => void;
  onEditShowcase?: () => void;
}

export function ProfilePostsTab({ profile, scope, editMode, onEditAbout, onEditShowcase }: ProfilePostsTabProps) {
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
    <div className="space-y-4">
      {mockPosts.map((post) => (
        <Card key={post.id} className="p-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile.avatarUrl} alt={profile.name} />
                <AvatarFallback>{profile.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{profile.name}</span>
                  <span className="text-muted-foreground text-sm">@{profile.handle}</span>
                  <span className="text-muted-foreground text-sm">•</span>
                  <span className="text-muted-foreground text-sm">{post.date}</span>
                </div>
                <p className="mt-2 text-foreground/90">{post.content}</p>
                {post.image && (
                  <div className="mt-3 rounded-lg overflow-hidden">
                    <img src={post.image} alt="Post image" className="w-full h-48 object-cover" />
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-6 pt-2 border-t">
              <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                <Heart className="h-4 w-4" />
                <span className="text-sm">{post.likes}</span>
              </button>
              <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm">{post.comments}</span>
              </button>
              <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                <Share className="h-4 w-4" />
                <span className="text-sm">{post.shares}</span>
              </button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}