import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Globe, Users, Lock } from "lucide-react";
import { Visibility } from "@/types/profile";
import { AutopilotSuggestions } from "../AutopilotSuggestions";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";

interface LinkItem {
  id: string;
  label: string;
  url: string;
  visibility: Visibility;
}

interface AboutFormProps {
  onDataChange?: (data: {
    bio: string;
    location: string;
    links: Array<{ label: string; url: string }>;
    languages: string[];
  }) => void;
  // Fired once loadProfile() settles: true only if the profile row was
  // actually read successfully (no Supabase error). The parent drawer uses
  // this to refuse a save that would otherwise overwrite real profile data
  // with blank state from a failed load.
  onLoadStatusChange?: (loadedSuccessfully: boolean) => void;
}

export function AboutForm({ onDataChange, onLoadStatusChange }: AboutFormProps) {
  const [bio, setBio] = useState("");
  const [bioVisibility, setBioVisibility] = useState<Visibility>("public");
  const [location, setLocation] = useState("");
  const [locationVisibility, setLocationVisibility] = useState<Visibility>("public");
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  // Mirrors IdentityForm's `loaded` gate: onDataChange must not fire before
  // the initial load has actually settled, or a slow/failed load blanks the
  // form data the parent drawer is tracking.
  const [loaded, setLoaded] = useState(false);
  const { toast } = useToast();
  const { translate } = useTranslation();

  // Language options with their translation keys
  const languageOptions = [
    { key: "english", value: "English" },
    { key: "german", value: "German" },
    { key: "spanish", value: "Spanish" },
    { key: "french", value: "French" },
    { key: "italian", value: "Italian" },
    { key: "portuguese", value: "Portuguese" },
    { key: "russian", value: "Russian" },
    { key: "arabic", value: "Arabic" },
    { key: "chinese", value: "Chinese" },
    { key: "japanese", value: "Japanese" },
  ];

  // Load current profile data
  useEffect(() => {
    loadProfile();
  }, []);

  // Notify parent of data changes only after the initial load has settled
  // (loaded gate) — otherwise a slow/failed load reports blank data before
  // the real values ever arrive, matching IdentityForm's existing pattern.
  useEffect(() => {
    if (loaded && onDataChange) {
      onDataChange({
        bio,
        location,
        links: links.map(l => ({ label: l.label, url: l.url })),
        languages
      });
    }
  }, [bio, location, links, languages, onDataChange, loaded]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles' as any)
        .select('bio, location, links, languages')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[AboutForm] Error loading profile:', error);
        setLoaded(true);
        onLoadStatusChange?.(false);
        return;
      }

      if (profile) {
        const p: any = profile;
        setBio(p.bio || "");
        setLocation(p.location || "");
        if (p.links) {
          setLinks(p.links.map((l: any, i: number) => ({
            id: Date.now().toString() + i,
            label: l.label || '',
            url: l.url || '',
            visibility: 'public' as Visibility
          })));
        }
        setLanguages(p.languages || []);
      }
      setLoaded(true);
      onLoadStatusChange?.(true);
    } catch (error) {
      console.error('Error loading profile:', error);
      setLoaded(true);
      onLoadStatusChange?.(false);
    }
  };

  const addLink = () => {
    const newLink: LinkItem = {
      id: Date.now().toString(),
      label: "",
      url: "",
      visibility: "public"
    };
    setLinks([...links, newLink]);
  };

  const updateLink = (id: string, field: keyof LinkItem, value: string) => {
    setLinks(links.map(link => 
      link.id === id ? { ...link, [field]: value } : link
    ));
  };

  const removeLink = (id: string) => {
    setLinks(links.filter(link => link.id !== id));
  };

  const addLanguage = (language: string) => {
    if (language && !languages.includes(language)) {
      setLanguages([...languages, language]);
    }
  };

  const removeLanguage = (language: string) => {
    setLanguages(languages.filter(l => l !== language));
  };

  const getVisibilityLabel = (visibility: Visibility) => {
    return translate(`profileEditor.visibility.${visibility}`);
  };

  // Get translated language name for display
  const getLanguageDisplayName = (langValue: string) => {
    const option = languageOptions.find(opt => opt.value === langValue);
    if (option) {
      return translate(`profileEditor.languageOptions.${option.key}`);
    }
    return langValue;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">{translate('profileEditor.aboutTitle')}</h3>
        <p className="text-sm text-muted-foreground mb-6">
          {translate('profileEditor.aboutDescription')}
        </p>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="bio">{translate('profileEditor.bio')}</Label>
          <Select value={bioVisibility} onValueChange={(value: Visibility) => setBioVisibility(value)}>
            <SelectTrigger className="w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">
                <div className="flex items-center gap-2">
                  <Globe className="w-3 h-3" />
                  {translate('profileEditor.visibility.public')}
                </div>
              </SelectItem>
              <SelectItem value="followers">
                <div className="flex items-center gap-2">
                  <Users className="w-3 h-3" />
                  {translate('profileEditor.visibility.followers')}
                </div>
              </SelectItem>
              <SelectItem value="private">
                <div className="flex items-center gap-2">
                  <Lock className="w-3 h-3" />
                  {translate('profileEditor.visibility.private')}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder={translate('profileEditor.bioPlaceholder')}
          rows={4}
          maxLength={500}
        />
        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            {bio.length}/500 {translate('profileEditor.characters')} • {Math.ceil(bio.split(' ').length)} {translate('profileEditor.words')}
          </p>
          {bio.length > 250 && (
            <Badge variant="outline" className="text-xs">
              {bio.length > 400 ? translate('profileEditor.almostFull') : translate('profileEditor.goodLength')}
            </Badge>
          )}
        </div>
        
        <AutopilotSuggestions 
          type="bio" 
          onSuggestionClick={(suggestion) => {
            toast({
              title: translate('profileEditor.autopilot.suggestion'),
              description: suggestion
            });
            // TODO: Implement actual AI suggestions
          }} 
        />
      </div>

      {/* Location */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="location">{translate('profileEditor.location')}</Label>
          <Select value={locationVisibility} onValueChange={(value: Visibility) => setLocationVisibility(value)}>
            <SelectTrigger className="w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">
                <div className="flex items-center gap-2">
                  <Globe className="w-3 h-3" />
                  {translate('profileEditor.visibility.public')}
                </div>
              </SelectItem>
              <SelectItem value="followers">
                <div className="flex items-center gap-2">
                  <Users className="w-3 h-3" />
                  {translate('profileEditor.visibility.followers')}
                </div>
              </SelectItem>
              <SelectItem value="private">
                <div className="flex items-center gap-2">
                  <Lock className="w-3 h-3" />
                  {translate('profileEditor.visibility.private')}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={translate('profileEditor.locationPlaceholder')}
        />
      </div>

      {/* Links */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>{translate('profileEditor.links')}</Label>
          <Button variant="outline" size="sm" onClick={addLink}>
            <Plus className="w-4 h-4 mr-2" />
            {translate('profileEditor.addLink')}
          </Button>
        </div>
        
        {links.map((link) => (
          <Card key={link.id} className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Input
                  placeholder={translate('profileEditor.linkLabelPlaceholder')}
                  value={link.label}
                  onChange={(e) => updateLink(link.id, "label", e.target.value)}
                  className="flex-1 mr-2"
                />
                <Button variant="ghost" size="sm" onClick={() => removeLink(link.id)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <Input
                placeholder={translate('profileEditor.linkUrlPlaceholder')}
                value={link.url}
                onChange={(e) => updateLink(link.id, "url", e.target.value)}
              />
              <Select 
                value={link.visibility} 
                onValueChange={(value: Visibility) => updateLink(link.id, "visibility", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Globe className="w-3 h-3" />
                      {translate('profileEditor.visibility.public')}
                    </div>
                  </SelectItem>
                  <SelectItem value="followers">
                    <div className="flex items-center gap-2">
                      <Users className="w-3 h-3" />
                      {translate('profileEditor.visibility.followers')}
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3 h-3" />
                      {translate('profileEditor.visibility.private')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>
        ))}
      </div>

      {/* Languages */}
      <div className="space-y-2">
        <Label>{translate('profileEditor.languages')}</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {languages.map((language) => (
            <Badge key={language} variant="secondary" className="gap-1">
              {getLanguageDisplayName(language)}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-1"
                onClick={() => removeLanguage(language)}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
        </div>
        <Select onValueChange={addLanguage}>
          <SelectTrigger>
            <SelectValue placeholder={translate('profileEditor.addLanguage')} />
          </SelectTrigger>
          <SelectContent>
            {languageOptions.map((lang) => (
              <SelectItem key={lang.key} value={lang.value}>
                {translate(`profileEditor.languageOptions.${lang.key}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

    </div>
  );
}
