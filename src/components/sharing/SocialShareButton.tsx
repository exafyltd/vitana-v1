import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMessages } from "@/hooks/useMessages";
import { useNavigate } from "react-router-dom";
import { useChannels } from "@/hooks/useChannels";
import { getChannelIcon, getChannelColor } from "@/utils/channelHelpers";
import { 
  Share2, 
  MessageCircle, 
  Copy, 
  Send,
  Info,
  Loader2
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
  const { sendMessage } = useMessages(undefined, false);
  const navigate = useNavigate();
  const { connectedChannels, isLoading } = useChannels();

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
          
        case 'vitana_messenger':
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

  // Build share options dynamically from connected channels
  const shareOptions = useMemo(() => {
    const options: Array<{
      id: string;
      icon: React.ComponentType<any>;
      label: string;
      color: string;
    }> = [
      {
        id: 'vitana_messenger',
        icon: MessageCircle,
        label: 'Vitana Messenger',
        color: 'text-blue-600'
      }
    ];

    // Add connected distribution channels
    const distributionOptions = (connectedChannels || [])
      .filter((c) => c.is_connected && c.is_active)
      .map((channel) => ({
        id: channel.channel_type,
        icon: getChannelIcon(channel.channel_type) as React.ComponentType<any>,
        label: channel.channel_name,
        color: getChannelColor(channel.channel_type)
      }));

    options.push(...distributionOptions);

    return options;
  }, [connectedChannels]);

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
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : shareOptions.length === 1 ? (
              <Alert className="border-blue-200 bg-blue-50/50 dark:border-blue-800/30 dark:bg-blue-950/20">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-sm">
                  <p className="mb-2">No distribution channels connected yet.</p>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-blue-600 dark:text-blue-400"
                    onClick={() => {
                      setIsOpen(false);
                      navigate("/sharing/integrations");
                    }}
                  >
                    Connect channels now →
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
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
            )}

            {/* Single Copy Link Action */}
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