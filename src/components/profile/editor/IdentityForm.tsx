import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, X, Move } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { AvatarPositioner } from "./AvatarPositioner";
import { avatarPositionStyle } from "@/lib/avatarPosition";

interface IdentityFormProps {
  onDataChange?: (data: {
    displayName: string;
    handle: string;
    avatarUrl: string;
    avatarOffsetX: number;
    avatarOffsetY: number;
    longevityArchetype: string;
  }) => void;
}

export function IdentityForm({ onDataChange }: IdentityFormProps) {
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarOffsetX, setAvatarOffsetX] = useState(50);
  const [avatarOffsetY, setAvatarOffsetY] = useState(50);
  const [longevityArchetype, setLongevityArchetype] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showPositioner, setShowPositioner] = useState(false);
  const { toast } = useToast();
  const { translate } = useTranslation();

  // Load current profile data
  useEffect(() => {
    loadProfile();
  }, []);

  // Notify parent of data changes only after initial load
  useEffect(() => {
    if (loaded && onDataChange) {
      onDataChange({ displayName, handle, avatarUrl, avatarOffsetX, avatarOffsetY, longevityArchetype });
    }
  }, [displayName, handle, avatarUrl, avatarOffsetX, avatarOffsetY, longevityArchetype, onDataChange, loaded]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, handle, avatar_url, avatar_offset_x, avatar_offset_y, longevity_archetype')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setDisplayName(profile.display_name || "");
        setHandle(profile.handle || "");
        setAvatarUrl(profile.avatar_url || "");
        setAvatarOffsetX(profile.avatar_offset_x ?? 50);
        setAvatarOffsetY(profile.avatar_offset_y ?? 50);
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

      // Materialize file into memory for mobile reliability
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: file.type });

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, blob, { upsert: true, contentType: file.type });

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';

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
      setAvatarOffsetX(50);
      setAvatarOffsetY(50);
      toast({
        title: translate('profileEditor.identity.avatarUploaded'),
        description: translate('profileEditor.identity.avatarUploadedDesc'),
      });
      setShowPositioner(true);
    }
    setUploading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">{translate('profileEditor.identity.title')}</h3>
        <p className="text-sm text-muted-foreground mb-6">
          {translate('profileEditor.identity.description')}
        </p>
      </div>

      {/* Hidden file input for iOS Safari reliability */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Avatar */}
      <div className="space-y-2">
        <Label>{translate('profileEditor.identity.profilePicture')}</Label>
        <div className="flex items-center gap-4">
          <Avatar className="w-20 h-20">
            <AvatarImage src={avatarUrl} style={avatarPositionStyle(avatarOffsetX, avatarOffsetY)} />
            <AvatarFallback className="text-lg">
              {displayName.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex gap-2 flex-wrap">
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
                onClick={() => setShowPositioner(true)}
                disabled={uploading}
              >
                <Move className="w-4 h-4 mr-2" />
                {translate('profileEditor.identity.reposition', 'Reposition')}
              </Button>
            )}
            {avatarUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setAvatarUrl(""); setAvatarOffsetX(50); setAvatarOffsetY(50); }}
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

      {/* Avatar Positioner Dialog */}
      {avatarUrl && (
        <AvatarPositioner
          open={showPositioner}
          onOpenChange={setShowPositioner}
          imageUrl={avatarUrl}
          initialOffsetX={avatarOffsetX}
          initialOffsetY={avatarOffsetY}
          onConfirm={(x, y) => {
            setAvatarOffsetX(x);
            setAvatarOffsetY(y);
          }}
        />
      )}
    </div>
  );
}
