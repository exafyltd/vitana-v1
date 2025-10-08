import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Share2,
  Copy,
  MessageCircle,
  Info,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSocialPlatforms } from "@/hooks/useSocialPlatforms";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";

interface SocialShareButtonProps {
  type: 'service' | 'event' | 'referral';
  data: {
    title: string;
    description: string;
    price?: number;
    currency?: string;
    link?: string;
    referralCode?: string;
  };
  variant?: 'button' | 'icon';
  size?: 'sm' | 'default' | 'lg';
}

export default function SocialShareButton({ 
  type, 
  data, 
  variant = 'button',
  size = 'default'
}: SocialShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { connectedPlatforms, loading } = useSocialPlatforms();
  const navigate = useNavigate();

  const getShareText = () => {
    switch (type) {
      case 'service':
        return `🌟 Check out this service: ${data.title}\n${data.description}\n${data.price ? `Only ${data.currency === 'credits' ? data.price + ' credits' : '$' + data.price}` : ''}`;
      case 'event':
        return `🎉 Join me at: ${data.title}\n${data.description}\n${data.price ? `Registration: ${data.currency === 'credits' ? data.price + ' credits' : '$' + data.price}` : 'Free event!'}`;
      case 'referral':
        return `💎 Join Vitana and get started with wellness!\nUse my referral code: ${data.referralCode}\n${data.description}`;
      default:
        return `Check this out: ${data.title}`;
    }
  };

  const getShareLink = () => {
    return data.link || `https://vitana.app/share/${type}/${data.title.toLowerCase().replace(/ /g, '-')}${data.referralCode ? '?ref=' + data.referralCode : ''}`;
  };

  const handleShare = async (platform: string) => {
    const shareText = getShareText();
    const shareLink = getShareLink();
    
    try {
      switch (platform) {
        case 'copy':
          await navigator.clipboard.writeText(`${shareText}\n\n${shareLink}`);
          toast({
            title: "Copied to Clipboard! 📋",
            description: "Share text and link copied successfully"
          });
          break;
          
        case 'messenger':
          toast({
            title: "Opening Messenger...",
            description: "Share via Vitana Messenger"
          });
          navigate('/messenger');
          break;
          
        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}&quote=${encodeURIComponent(shareText)}`, '_blank');
          break;
          
        case 'twitter':
          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareLink)}`, '_blank');
          break;
          
        case 'linkedin':
          window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareLink)}`, '_blank');
          break;
          
        case 'instagram':
          toast({
            title: "Instagram",
            description: "Link copied! Open Instagram to share"
          });
          await navigator.clipboard.writeText(shareLink);
          break;

        case 'youtube':
          toast({
            title: "YouTube",
            description: "Link copied! Share on YouTube"
          });
          await navigator.clipboard.writeText(shareLink);
          break;

        case 'tiktok':
          toast({
            title: "TikTok",
            description: "Link copied! Share on TikTok"
          });
          await navigator.clipboard.writeText(shareLink);
          break;
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('Share error:', error);
      toast({
        title: "Share Failed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  // Build share options dynamically from connected social platforms
  const shareOptions = useMemo(() => {
    const baseOptions = [
      {
        id: "messenger",
        icon: MessageCircle,
        label: "Vitana Messenger",
        color: "text-blue-600",
      },
    ];

    const socialOptions = connectedPlatforms.map((platform) => ({
      id: platform.id,
      icon: platform.icon,
      label: platform.name,
      color: platform.color,
    }));

    return [...baseOptions, ...socialOptions];
  }, [connectedPlatforms]);

  return (
    <>
      <Button
        variant={variant === 'icon' ? 'ghost' : 'outline'}
        size={size}
        onClick={() => setIsOpen(true)}
        className={variant === 'icon' ? 'p-2' : ''}
      >
        <Share2 className="w-4 h-4" />
        {variant === 'button' && <span className="ml-2">Share</span>}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-blue-600" />
              Share {type.charAt(0).toUpperCase() + type.slice(1)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Preview Card */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">{data.title}</h4>
                    <span className="text-xs capitalize text-muted-foreground">{type}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {data.description}
                  </p>
                  {data.price && (
                    <div className="text-sm font-medium text-primary">
                      {data.currency === 'credits' ? `${data.price} credits` : `$${data.price}`}
                    </div>
                  )}
                  {data.referralCode && (
                    <div className="text-xs text-muted-foreground">
                      Code: {data.referralCode}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Share Options */}
            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : shareOptions.length === 1 ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    No social accounts connected yet.{" "}
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0"
                      onClick={() => {
                        setIsOpen(false);
                        navigate(`/profile/${user?.id}#social-connections`);
                      }}
                    >
                      Connect on your profile →
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {shareOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <Button
                        key={option.id}
                        variant="outline"
                        className="flex flex-col items-center gap-2 h-auto py-4"
                        onClick={() => handleShare(option.id)}
                      >
                        <Icon className="h-6 w-6" />
                        <span className="text-xs">{option.label}</span>
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Copy Link Action */}
            <div className="pt-2 border-t">
              <Button 
                variant="outline"
                className="w-full"
                onClick={() => handleShare('copy')}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
