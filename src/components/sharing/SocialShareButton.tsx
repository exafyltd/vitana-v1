import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMessages } from "@/hooks/useMessages";
import { 
  Share2, 
  MessageCircle, 
  Copy, 
  Facebook, 
  Twitter, 
  Linkedin,
  Mail,
  Send
} from "lucide-react";

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
  const { sendMessage } = useMessages();

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
          // Share via internal messenger
          await sendMessage(
            `Sharing ${type}: ${data.title}`,
            undefined, // Let user select recipient
            'share',
            {
              type,
              title: data.title,
              description: data.description,
              link: shareLink,
              shareText
            }
          );
          toast({
            title: "Shared via Messenger! 💬",
            description: "Your share has been sent"
          });
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
          
        case 'email':
          window.open(`mailto:?subject=${encodeURIComponent(data.title)}&body=${encodeURIComponent(shareText + '\n\n' + shareLink)}`, '_blank');
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

  const shareOptions = [
    { id: 'messenger', icon: MessageCircle, label: 'Vitana Messenger', color: 'text-blue-600' },
    { id: 'copy', icon: Copy, label: 'Copy Link', color: 'text-gray-600' },
    { id: 'facebook', icon: Facebook, label: 'Facebook', color: 'text-blue-700' },
    { id: 'twitter', icon: Twitter, label: 'Twitter', color: 'text-sky-500' },
    { id: 'linkedin', icon: Linkedin, label: 'LinkedIn', color: 'text-blue-800' },
    { id: 'email', icon: Mail, label: 'Email', color: 'text-gray-600' }
  ];

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
                    <Badge variant="outline" className="capitalize">
                      {type}
                    </Badge>
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
                    <Badge variant="secondary" className="text-xs">
                      Code: {data.referralCode}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Share Options */}
            <div className="grid grid-cols-2 gap-3">
              {shareOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <Button
                    key={option.id}
                    variant="outline"
                    className="flex items-center gap-2 h-12 justify-start"
                    onClick={() => handleShare(option.id)}
                  >
                    <IconComponent className={`w-4 h-4 ${option.color}`} />
                    <span className="text-sm">{option.label}</span>
                  </Button>
                );
              })}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 pt-2 border-t">
              <Button 
                size="sm" 
                className="flex-1"
                onClick={() => handleShare('messenger')}
              >
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="flex-1"
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