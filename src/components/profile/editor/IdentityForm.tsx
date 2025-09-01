import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface IdentityFormProps {
  onDataChange?: (data: {
    displayName: string;
    handle: string;
    avatarUrl: string;
    coverUrl: string;
  }) => void;
}

export function IdentityForm({ onDataChange }: IdentityFormProps) {
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  // Load current profile data
  useEffect(() => {
    loadProfile();
  }, []);

  // Notify parent of data changes
  useEffect(() => {
    if (onDataChange) {
      onDataChange({ displayName, handle, avatarUrl, coverUrl });
    }
  }, [displayName, handle, avatarUrl, coverUrl, onDataChange]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, handle, avatar_url, cover_url')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setDisplayName(profile.display_name || "");
        setHandle(profile.handle || "");
        setAvatarUrl(profile.avatar_url || "");
        setCoverUrl(profile.cover_url || "");
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const uploadFile = async (file: File, bucket: string, folder: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${folder}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleAvatarUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setUploading(true);
      const url = await uploadFile(file, 'avatars', 'avatar');
      if (url) {
        setAvatarUrl(url);
        toast({
          title: "Avatar uploaded",
          description: "Your profile picture has been updated.",
        });
      }
      setUploading(false);
    };
    input.click();
  };

  const handleCoverUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setUploading(true);
      const url = await uploadFile(file, 'covers', 'cover');
      if (url) {
        setCoverUrl(url);
        toast({
          title: "Cover photo uploaded",
          description: "Your cover photo has been updated.",
        });
      }
      setUploading(false);
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Identity</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Manage your display name, handle, and profile images.
        </p>
      </div>

      {/* Cover Photo */}
      <div className="space-y-2">
        <Label>Cover Photo</Label>
        <Card className="relative h-32 border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
          {coverUrl ? (
            <div className="relative h-full">
              <img 
                src={coverUrl} 
                alt="Cover" 
                className="w-full h-full object-cover rounded-md"
              />
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2"
                onClick={() => setCoverUrl("")}
                disabled={uploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full h-full flex flex-col gap-2"
              onClick={handleCoverUpload}
              disabled={uploading}
            >
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {uploading ? "Uploading..." : "Upload cover photo"}
              </span>
            </Button>
          )}
        </Card>
      </div>

      {/* Avatar */}
      <div className="space-y-2">
        <Label>Profile Picture</Label>
        <div className="flex items-center gap-4">
          <Avatar className="w-20 h-20">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="text-lg">
              {displayName.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAvatarUpload}
              disabled={uploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? "Uploading..." : "Upload"}
            </Button>
            {avatarUrl && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setAvatarUrl("")}
                disabled={uploading}
              >
                <X className="w-4 h-4 mr-2" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Display Name */}
      <div className="space-y-2">
        <Label htmlFor="display-name">Display Name</Label>
        <Input
          id="display-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your display name"
        />
      </div>

      {/* Handle */}
      <div className="space-y-2">
        <Label htmlFor="handle">Handle</Label>
        <div className="flex items-center">
          <span className="text-muted-foreground mr-2">@</span>
          <Input
            id="handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="yourhandle"
            className="flex-1"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Your handle will be used in your public profile URL: /u/@{handle}
        </p>
      </div>
    </div>
  );
}