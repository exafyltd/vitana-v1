import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";

interface IdentityFormProps {
  onDataChange?: (data: {
    displayName: string;
    handle: string;
    avatarUrl: string;
    longevityArchetype: string;
  }) => void;
}

export function IdentityForm({ onDataChange }: IdentityFormProps) {
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [longevityArchetype, setLongevityArchetype] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { toast } = useToast();
  const { translate } = useTranslation();

  // Load current profile data
  useEffect(() => {
    loadProfile();
  }, []);

  // Notify parent of data changes only after initial load
  useEffect(() => {
    if (loaded && onDataChange) {
      onDataChange({ displayName, handle, avatarUrl, longevityArchetype });
    }
  }, [displayName, handle, avatarUrl, longevityArchetype, onDataChange, loaded]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, handle, avatar_url, longevity_archetype')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setDisplayName(profile.display_name || "");
        setHandle(profile.handle || "");
        setAvatarUrl(profile.avatar_url || "");
        setLongevityArchetype(profile.longevity_archetype || "");
      }
      setLoaded(true);
    } catch (error) {
      console.error('Error loading profile:', error);
      setLoaded(true);
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
        title: translate('profileEditor.identity.uploadFailed'),
        description: translate('profileEditor.identity.uploadFailedDesc'),
        variant: "destructive",
      });
      return null;
    }
  };

  const handleAvatarUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Validate file format - reject HEIC/HEIF and unsupported types
      const fileName = file.name.toLowerCase();
      const fileExt = fileName.split('.').pop() || '';
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
      const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || fileExt === 'heic' || fileExt === 'heif';

      if (isHeic) {
        toast({
          title: translate('profileEditor.identity.uploadFailed'),
          description: 'HEIC/HEIF format is not supported by browsers. Please convert to JPG or PNG first.',
          variant: "destructive",
        });
        return;
      }

      if (!file.type.startsWith('image/') || !allowedExtensions.includes(fileExt)) {
        if (!allowedExtensions.includes(fileExt)) {
          toast({
            title: translate('profileEditor.identity.uploadFailed'),
            description: `Unsupported image format (.${fileExt}). Please use JPG, PNG, GIF, or WebP.`,
            variant: "destructive",
          });
          return;
        }
      }

      setUploading(true);
      const url = await uploadFile(file, 'avatars', 'avatar');
      if (url) {
        setAvatarUrl(url);
        toast({
          title: translate('profileEditor.identity.avatarUploaded'),
          description: translate('profileEditor.identity.avatarUploadedDesc'),
        });
      }
      setUploading(false);
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">{translate('profileEditor.identity.title')}</h3>
        <p className="text-sm text-muted-foreground mb-6">
          {translate('profileEditor.identity.description')}
        </p>
      </div>

      {/* Avatar */}
      <div className="space-y-2">
        <Label>{translate('profileEditor.identity.profilePicture')}</Label>
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
              {uploading ? translate('profileEditor.identity.uploading') : translate('profileEditor.identity.upload')}
            </Button>
            {avatarUrl && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setAvatarUrl("")}
                disabled={uploading}
              >
                <X className="w-4 h-4 mr-2" />
                {translate('profileEditor.identity.remove')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Display Name */}
      <div className="space-y-2">
        <Label htmlFor="display-name">{translate('profileEditor.identity.displayName')}</Label>
        <Input
          id="display-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={translate('profileEditor.identity.displayNamePlaceholder')}
        />
      </div>

      {/* Handle */}
      <div className="space-y-2">
        <Label htmlFor="handle">{translate('profileEditor.identity.handle')}</Label>
        <div className="flex items-center">
          <span className="text-muted-foreground mr-2">@</span>
          <Input
            id="handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder={translate('profileEditor.identity.handlePlaceholder')}
            className="flex-1"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {translate('profileEditor.identity.handleDescription').replace('{handle}', handle || translate('profileEditor.identity.handlePlaceholder'))}
        </p>
      </div>

      {/* Personality Descriptor */}
      <div className="space-y-2">
        <Label htmlFor="personality-descriptor">{translate('profileEditor.identity.personalityDescriptor')}</Label>
        <Input
          id="personality-descriptor"
          value={longevityArchetype}
          onChange={(e) => setLongevityArchetype(e.target.value)}
          placeholder={translate('profileEditor.identity.personalityDescriptorPlaceholder')}
        />
        <p className="text-xs text-muted-foreground">
          {translate('profileEditor.identity.personalityDescriptorDescription')}
        </p>
      </div>
    </div>
  );
}
