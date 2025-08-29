import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Upload, X } from "lucide-react";

export function IdentityForm() {
  const [displayName, setDisplayName] = useState("Mariia Maxina");
  const [handle, setHandle] = useState("maxina");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  const handleAvatarUpload = () => {
    // TODO: Implement file upload
    console.log("Avatar upload");
  };

  const handleCoverUpload = () => {
    // TODO: Implement file upload
    console.log("Cover upload");
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
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full h-full flex flex-col gap-2"
              onClick={handleCoverUpload}
            >
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Upload cover photo</span>
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
            <AvatarFallback className="text-lg">MM</AvatarFallback>
          </Avatar>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleAvatarUpload}>
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
            {avatarUrl && (
              <Button variant="outline" size="sm" onClick={() => setAvatarUrl("")}>
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

      <div className="pt-4 border-t">
        <Button className="w-full">Save Changes</Button>
      </div>
    </div>
  );
}