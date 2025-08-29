import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Globe, Users, Lock } from "lucide-react";
import { Visibility } from "@/types/profile";

interface LinkItem {
  id: string;
  label: string;
  url: string;
  visibility: Visibility;
}

export function AboutForm() {
  const [bio, setBio] = useState("");
  const [bioVisibility, setBioVisibility] = useState<Visibility>("public");
  const [location, setLocation] = useState("");
  const [locationVisibility, setLocationVisibility] = useState<Visibility>("public");
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);

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

  const getVisibilityIcon = (visibility: Visibility) => {
    switch (visibility) {
      case "public": return <Globe className="w-3 h-3" />;
      case "followers": return <Users className="w-3 h-3" />;
      case "private": return <Lock className="w-3 h-3" />;
    }
  };

  const getVisibilityLabel = (visibility: Visibility) => {
    switch (visibility) {
      case "public": return "Public";
      case "followers": return "Followers";
      case "private": return "Private";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">About</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Share more about yourself. You can control who sees each field.
        </p>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="bio">Bio</Label>
          <Select value={bioVisibility} onValueChange={(value: Visibility) => setBioVisibility(value)}>
            <SelectTrigger className="w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">
                <div className="flex items-center gap-2">
                  <Globe className="w-3 h-3" />
                  Public
                </div>
              </SelectItem>
              <SelectItem value="followers">
                <div className="flex items-center gap-2">
                  <Users className="w-3 h-3" />
                  Followers
                </div>
              </SelectItem>
              <SelectItem value="private">
                <div className="flex items-center gap-2">
                  <Lock className="w-3 h-3" />
                  Private
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell people about yourself..."
          rows={4}
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground">
          {bio.length}/500 characters
        </p>
      </div>

      {/* Location */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="location">Location</Label>
          <Select value={locationVisibility} onValueChange={(value: Visibility) => setLocationVisibility(value)}>
            <SelectTrigger className="w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">
                <div className="flex items-center gap-2">
                  <Globe className="w-3 h-3" />
                  Public
                </div>
              </SelectItem>
              <SelectItem value="followers">
                <div className="flex items-center gap-2">
                  <Users className="w-3 h-3" />
                  Followers
                </div>
              </SelectItem>
              <SelectItem value="private">
                <div className="flex items-center gap-2">
                  <Lock className="w-3 h-3" />
                  Private
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="City, Country"
        />
      </div>

      {/* Links */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Links</Label>
          <Button variant="outline" size="sm" onClick={addLink}>
            <Plus className="w-4 h-4 mr-2" />
            Add Link
          </Button>
        </div>
        
        {links.map((link) => (
          <Card key={link.id} className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Input
                  placeholder="Label (e.g., Website)"
                  value={link.label}
                  onChange={(e) => updateLink(link.id, "label", e.target.value)}
                  className="flex-1 mr-2"
                />
                <Button variant="ghost" size="sm" onClick={() => removeLink(link.id)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <Input
                placeholder="https://..."
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
                      Public
                    </div>
                  </SelectItem>
                  <SelectItem value="followers">
                    <div className="flex items-center gap-2">
                      <Users className="w-3 h-3" />
                      Followers
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3 h-3" />
                      Private
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
        <Label>Languages</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {languages.map((language) => (
            <Badge key={language} variant="secondary" className="gap-1">
              {language}
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
            <SelectValue placeholder="Add a language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="English">English</SelectItem>
            <SelectItem value="Spanish">Spanish</SelectItem>
            <SelectItem value="French">French</SelectItem>
            <SelectItem value="German">German</SelectItem>
            <SelectItem value="Italian">Italian</SelectItem>
            <SelectItem value="Portuguese">Portuguese</SelectItem>
            <SelectItem value="Russian">Russian</SelectItem>
            <SelectItem value="Arabic">Arabic</SelectItem>
            <SelectItem value="Chinese">Chinese</SelectItem>
            <SelectItem value="Japanese">Japanese</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="pt-4 border-t">
        <Button className="w-full">Save Changes</Button>
      </div>
    </div>
  );
}