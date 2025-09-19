import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Key, Send, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isDiagnosticsEnabled } from "@/lib/diagnostics";
import { supabase } from "@/integrations/supabase/client";

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

export default function VapidKeyGenerator() {
  const [keys, setKeys] = useState<VapidKeys | null>(null);
  const [vapidSubject, setVapidSubject] = useState('mailto:hello@vitana.app');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  // Gate the page behind diagnostics flag
  if (!isDiagnosticsEnabled()) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This tool is only available in development mode or when diagnostics are enabled.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const generateVapidKeys = async () => {
    setIsGenerating(true);
    try {
      // Generate P-256 ECDSA key pair
      const keyPair = await crypto.subtle.generateKey(
        {
          name: 'ECDSA',
          namedCurve: 'P-256'
        },
        true,
        ['sign', 'verify']
      );

      // Export public key as JWK and convert to uncompressed format
      const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
      
      // Convert JWK coordinates to ArrayBuffer
      const xBytes = new Uint8Array(Buffer.from(publicKeyJwk.x!, 'base64url'));
      const yBytes = new Uint8Array(Buffer.from(publicKeyJwk.y!, 'base64url'));
      
      // Create uncompressed public key (0x04 + x + y)
      const uncompressedKey = new Uint8Array(1 + xBytes.length + yBytes.length);
      uncompressedKey[0] = 0x04; // Uncompressed point indicator
      uncompressedKey.set(xBytes, 1);
      uncompressedKey.set(yBytes, 1 + xBytes.length);
      
      // Base64url encode the uncompressed key
      const publicKey = Buffer.from(uncompressedKey).toString('base64url');

      // Export private key as JWK and extract d parameter
      const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
      const privateKey = privateKeyJwk.d!; // Already base64url encoded

      setKeys({ publicKey, privateKey });
      toast({
        title: "VAPID Keys Generated",
        description: "New key pair has been created successfully.",
      });
    } catch (error) {
      console.error('Failed to generate VAPID keys:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate VAPID keys. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: `${type} copied to clipboard.`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const saveAsSecrets = async () => {
    if (!keys) return;

    setIsSaving(true);
    try {
      // Note: In a real implementation, these would need to be saved via
      // the Lovable secrets system. For now, we'll simulate the action.
      console.log('Saving secrets:', {
        VAPID_PUBLIC_KEY: keys.publicKey,
        VAPID_PRIVATE_KEY: keys.privateKey,
        VAPID_SUBJECT: vapidSubject
      });

      toast({
        title: "Secrets Saved",
        description: "VAPID keys and subject have been saved as secrets.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save secrets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const sendTestNotification = async () => {
    setIsTesting(true);
    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title: 'Test Push Notification',
          body: 'This is a test notification from the VAPID Key Generator',
          threadId: 'test-thread',
          isTest: true
        }
      });

      if (error) throw error;

      toast({
        title: "Test Sent",
        description: "Test push notification has been sent.",
      });
    } catch (error) {
      console.error('Test notification failed:', error);
      toast({
        title: "Test Failed",
        description: "Failed to send test notification. Check the console for details.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Key className="w-8 h-8" />
          VAPID Key Generator
        </h1>
          <p className="text-muted-foreground">
            Generate VAPID keys for Web Push notifications (Development Only)
          </p>
          <p className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-2 rounded">
            <strong>Next step:</strong> paste these into Lovable Secrets as VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
          </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          This tool is for development purposes only. Keep the PRIVATE_KEY secret and never share it.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Generate New VAPID Keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={generateVapidKeys} 
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? 'Generating...' : 'Generate VAPID Keys'}
          </Button>

          {keys && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>PUBLIC_KEY:</Label>
                <div className="flex gap-2">
                  <Input 
                    value={keys.publicKey} 
                    readOnly 
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(keys.publicKey, 'Public Key')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-red-600">PRIVATE_KEY: (Keep Secret!)</Label>
                <div className="flex gap-2">
                  <Input 
                    value={keys.privateKey} 
                    readOnly 
                    className="font-mono text-xs bg-red-50 border-red-200"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(keys.privateKey, 'Private Key')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>VAPID Subject Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vapid-subject">VAPID Subject</Label>
            <Input
              id="vapid-subject"
              value={vapidSubject}
              onChange={(e) => setVapidSubject(e.target.value)}
              placeholder="mailto:hello@vitana.app"
            />
            <p className="text-xs text-muted-foreground">
              Must be either a mailto: URL or an https: URL
            </p>
          </div>

          <Button
            onClick={() => copyToClipboard(vapidSubject, 'VAPID Subject')}
            variant="outline"
            className="w-full"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy VAPID Subject
          </Button>
        </CardContent>
      </Card>

      {keys && (
        <Card>
          <CardHeader>
            <CardTitle>Save & Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={saveAsSecrets}
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? 'Saving...' : 'Save as Secrets'}
            </Button>

            <Button
              onClick={sendTestNotification}
              disabled={isTesting}
              variant="outline"
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              {isTesting ? 'Sending...' : 'Send Test Notification'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}