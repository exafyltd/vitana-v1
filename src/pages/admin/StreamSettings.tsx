import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminLiveStreamNavigation } from "@/config/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { notify } from '@/lib/i18n-toast';

export default function StreamSettings() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    notify('toasts.admin.settingsSaved', 'toasts.admin.streamSettingsHaveUpdatedSuccessfully');
  };

  return (
    <AppLayout>
      <SEO 
        title="Stream Settings | Admin | VITANA" 
        description="Configure global streaming settings" 
        canonical={window.location.href} 
      />
      <SubNavigation items={adminLiveStreamNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title="Stream Settings"
            description="Configure global settings for all streaming features"
            emoji="⚙️"
          />

          <Tabs defaultValue="vertex" className="space-y-4">
            <TabsList>
              <TabsTrigger value="vertex">Vertex AI</TabsTrigger>
              <TabsTrigger value="community">Community Rooms</TabsTrigger>
              <TabsTrigger value="telemedicine">Telemedicine</TabsTrigger>
              <TabsTrigger value="global">Global Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="vertex" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Vertex AI Configuration</CardTitle>
                  <CardDescription>Settings for Google Vertex AI streaming</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="vertex-model">Model</Label>
                    <Select defaultValue="gemini-2.0-flash">
                      <SelectTrigger id="vertex-model">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash (Recommended)</SelectItem>
                        <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vertex-voice">Voice</Label>
                    <Select defaultValue="Puck">
                      <SelectTrigger id="vertex-voice">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Puck">Puck</SelectItem>
                        <SelectItem value="Charon">Charon</SelectItem>
                        <SelectItem value="Kore">Kore</SelectItem>
                        <SelectItem value="Fenrir">Fenrir</SelectItem>
                        <SelectItem value="Aoede">Aoede</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="system-prompt">System Prompt</Label>
                    <Textarea
                      id="system-prompt"
                      placeholder="You are a helpful AI assistant..."
                      className="min-h-[100px]"
                      defaultValue="You are VITANA's AI assistant. Be helpful, concise, and friendly."
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Voice Activity Detection</Label>
                      <p className="text-sm text-muted-foreground">Automatically detect when user stops speaking</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="community" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Community Room Defaults</CardTitle>
                  <CardDescription>Default settings for new community live rooms</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="max-participants">Max Participants</Label>
                    <Input id="max-participants" type="number" defaultValue="50" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-Record Sessions</Label>
                      <p className="text-sm text-muted-foreground">Automatically record all community rooms</p>
                    </div>
                    <Switch />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Public by Default</Label>
                      <p className="text-sm text-muted-foreground">New rooms are publicly visible</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="moderation-level">Moderation Level</Label>
                    <Select defaultValue="moderate">
                      <SelectTrigger id="moderation-level">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="relaxed">Relaxed</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="strict">Strict</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="telemedicine" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Telemedicine Defaults</CardTitle>
                  <CardDescription>Settings for healthcare video consultations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="session-duration">Default Session Duration (minutes)</Label>
                    <Input id="session-duration" type="number" defaultValue="30" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Recording Consent</Label>
                      <p className="text-sm text-muted-foreground">Patients must consent to recording</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-End Inactive Sessions</Label>
                      <p className="text-sm text-muted-foreground">End sessions after 10 minutes of inactivity</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="global" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Global Stream Settings</CardTitle>
                  <CardDescription>Settings that apply to all streaming features</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="max-concurrent">Max Concurrent Streams</Label>
                    <Input id="max-concurrent" type="number" defaultValue="100" />
                    <p className="text-xs text-muted-foreground">Per tenant limit</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bandwidth-limit">Bandwidth Limit (Mbps)</Label>
                    <Input id="bandwidth-limit" type="number" defaultValue="1000" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="analytics-retention">Analytics Retention (days)</Label>
                    <Input id="analytics-retention" type="number" defaultValue="90" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable CDN</Label>
                      <p className="text-sm text-muted-foreground">Use content delivery network for streaming</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
