import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Calendar as CalendarIcon,
  Save,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Mail,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Coins,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Channel {
  id: string;
  name: string;
  icon: any;
  status: "connected" | "expired" | "disconnected";
}

const CHANNELS: Channel[] = [
  { id: "messenger", name: "Vitana Messenger", icon: MessageSquare, status: "connected" },
  { id: "email", name: "Email", icon: Mail, status: "connected" },
  { id: "instagram", name: "Instagram", icon: Instagram, status: "disconnected" },
  { id: "facebook", name: "Facebook", icon: Facebook, status: "disconnected" },
  { id: "linkedin", name: "LinkedIn", icon: Linkedin, status: "disconnected" },
  { id: "x", name: "X (Twitter)", icon: Twitter, status: "disconnected" },
];

export function BlastCenter() {
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set(["messenger"]));
  const [entityType, setEntityType] = useState<string>("event");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const toggleChannel = (channelId: string) => {
    const channel = CHANNELS.find((c) => c.id === channelId);
    if (channel?.status !== "connected") {
      toast({
        title: "Channel not connected",
        description: `Please connect your ${channel?.name} account first.`,
        variant: "destructive",
      });
      return;
    }

    setSelectedChannels((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(channelId)) {
        newSet.delete(channelId);
      } else {
        newSet.add(channelId);
      }
      return newSet;
    });
  };

  const handleBlastNow = () => {
    if (selectedChannels.size === 0) {
      toast({
        title: "No channels selected",
        description: "Please select at least one channel to distribute.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Distribution started!",
      description: `Sharing to ${selectedChannels.size} ${
        selectedChannels.size === 1 ? "channel" : "channels"
      }.`,
    });
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Blast Center
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Share your content across multiple channels instantly
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Entity Type Selector */}
        <div className="space-y-2">
          <Label>What are you sharing?</Label>
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="event">Event</SelectItem>
              <SelectItem value="meetup">Meetup</SelectItem>
              <SelectItem value="group">Group</SelectItem>
              <SelectItem value="live-room">Live Room</SelectItem>
              <SelectItem value="profile">Profile</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content Editor */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="Enter a compelling title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Write your message..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        {/* Channel Selector */}
        <div className="space-y-3">
          <Label>Select Channels</Label>
          <div className="grid grid-cols-2 gap-2">
            {CHANNELS.map((channel) => {
              const Icon = channel.icon;
              const isSelected = selectedChannels.has(channel.id);
              const isConnected = channel.status === "connected";

              return (
                <button
                  key={channel.id}
                  onClick={() => toggleChannel(channel.id)}
                  className={`
                    flex items-center gap-2 p-3 rounded-lg border transition-all
                    ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : isConnected
                        ? "bg-card hover:bg-accent"
                        : "bg-muted/50 opacity-60"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium flex-1 text-left">{channel.name}</span>
                  {isConnected ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Earn Credits Badge */}
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
          <Coins className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-800 dark:text-green-200">
            Post now, earn +5 credits
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-4 border-t">
          <Button onClick={handleBlastNow} className="flex-1" size="lg">
            <Send className="w-4 h-4 mr-2" />
            Blast Now
          </Button>
          <Button variant="outline" size="lg">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Schedule
          </Button>
          <Button variant="outline" size="lg">
            <Save className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
