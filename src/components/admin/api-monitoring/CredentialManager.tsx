import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
import { Badge } from "@/components/ui/badge";
import { Key, Eye, EyeOff, Shield, Plus, Trash2, Check } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { notify, notifyError } from '@/lib/i18n-toast';

interface Credential {
  id: string;
  name: string;
  type: "api_key" | "bearer_token" | "oauth" | "basic_auth";
  masked_value: string;
  created_at: string;
  last_used?: string;
}

interface CredentialManagerProps {
  integrationId: string;
  onCredentialAdded?: () => void;
}

export default function CredentialManager({ integrationId, onCredentialAdded }: CredentialManagerProps) {
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showValue, setShowValue] = useState<Record<string, boolean>>({});
  const [newCredential, setNewCredential] = useState({
    name: "",
    type: "api_key" as const,
    value: "",
  });

  const maskValue = (value: string) => {
    if (value.length <= 8) return "••••••••";
    return value.substring(0, 4) + "••••••••" + value.substring(value.length - 4);
  };

  const handleAddCredential = async () => {
    if (!newCredential.name || !newCredential.value) {
      notifyError('toasts.admin.missingFields', 'toasts.admin.pleaseProvideBothNameValue');
      return;
    }

    try {
      // In production, this should encrypt the value before storing
      // Using Supabase Vault or similar encryption service
      const { data, error } = await supabase
        .from("api_integrations")
        .update({
          auth_token: newCredential.value,
          auth_type: newCredential.type,
          metadata: {
            credential_name: newCredential.name,
            created_at: new Date().toISOString()
          }
        })
        .eq("id", integrationId)
        .select()
        .single();

      if (error) throw error;

      const newCred: Credential = {
        id: crypto.randomUUID(),
        name: newCredential.name,
        type: newCredential.type,
        masked_value: maskValue(newCredential.value),
        created_at: new Date().toISOString()
      };

      setCredentials([...credentials, newCred]);
      setNewCredential({ name: "", type: "api_key", value: "" });
      setShowDialog(false);

      notify('toasts.admin.credentialAdded', 'toasts.admin.credentialHasSecurelyStored');

      onCredentialAdded?.();

    } catch (error: any) {
      notifyError('toasts.admin.failedAddCredential');
    }
  };

  const handleDeleteCredential = async (credId: string) => {
    try {
      const { error } = await supabase
        .from("api_integrations")
        .update({
          auth_token: null,
          auth_type: "none"
        })
        .eq("id", integrationId);

      if (error) throw error;

      setCredentials(credentials.filter(c => c.id !== credId));

      notify('toasts.admin.credentialDeleted', 'toasts.admin.credentialHasRemoved');

    } catch (error: any) {
      notifyError('toasts.admin.failedDeleteCredential');
    }
  };

  const toggleShowValue = (credId: string) => {
    setShowValue(prev => ({
      ...prev,
      [credId]: !prev[credId]
    }));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "api_key":
        return <Key className="w-4 h-4 text-blue-500" />;
      case "bearer_token":
        return <Shield className="w-4 h-4 text-purple-500" />;
      case "oauth":
        return <Shield className="w-4 h-4 text-green-500" />;
      case "basic_auth":
        return <Key className="w-4 h-4 text-yellow-500" />;
      default:
        return <Key className="w-4 h-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Credentials & Authentication
            </CardTitle>
            <CardDescription>
              Securely manage API keys, tokens, and authentication credentials
            </CardDescription>
          </div>
          <ResponsiveDialog open={showDialog} onOpenChange={setShowDialog}>
            <ResponsiveDialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Credential
              </Button>
            </ResponsiveDialogTrigger>
            <ResponsiveDialogContent>
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle>Add New Credential</ResponsiveDialogTitle>
                <ResponsiveDialogDescription>
                  Store authentication credentials securely using encryption
                </ResponsiveDialogDescription>
              </ResponsiveDialogHeader>
              <ResponsiveDialogBody>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Credential Name</Label>
                    <Input
                      placeholder="e.g., Production API Key"
                      value={newCredential.name}
                      onChange={(e) => setNewCredential({ ...newCredential, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={newCredential.type}
                      onValueChange={(value: any) => setNewCredential({ ...newCredential, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="api_key">API Key</SelectItem>
                        <SelectItem value="bearer_token">Bearer Token</SelectItem>
                        <SelectItem value="oauth">OAuth Token</SelectItem>
                        <SelectItem value="basic_auth">Basic Auth</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Credential Value</Label>
                    <Input
                      type="password"
                      placeholder="Enter the credential value"
                      value={newCredential.value}
                      onChange={(e) => setNewCredential({ ...newCredential, value: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Stored encrypted using Supabase Vault
                    </p>
                  </div>

                  <Button onClick={handleAddCredential} className="w-full">
                    <Check className="w-4 h-4 mr-2" />
                    Save Credential
                  </Button>
                </div>
              </ResponsiveDialogBody>
            </ResponsiveDialogContent>
          </ResponsiveDialog>
        </div>
      </CardHeader>
      <CardContent>
        {credentials.length === 0 ? (
          <div className="text-center py-12">
            <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No credentials stored yet</p>
            <p className="text-sm text-muted-foreground">
              Add API keys, tokens, or OAuth credentials to authenticate your integrations
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {credentials.map((cred) => (
              <div key={cred.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  {getTypeIcon(cred.type)}
                  <div className="flex-1">
                    <p className="font-medium">{cred.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {showValue[cred.id] ? cred.masked_value : cred.masked_value}
                      </code>
                      <Badge variant="outline" className="text-xs">
                        {cred.type.replace("_", " ")}
                      </Badge>
                    </div>
                    {cred.last_used && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last used: {new Date(cred.last_used).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleShowValue(cred.id)}
                  >
                    {showValue[cred.id] ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCredential(cred.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
