/**
 * VTID-DANCE-D10: Intent post share sheet.
 *
 * Mirrors ProfileShareSheet pattern but for intent posts. Three channels:
 *   - In-app DM to up to N Vitana members (multi-select textarea of @vitana_ids)
 *   - Copy link → /p/<intent_id>?ref=<my_vitana_id>
 *   - Native / WhatsApp / Email share via useNativeShare()
 *
 * Backend lives at POST /api/v1/intents/:id/share (VTID-DANCE-D10).
 * Idempotent server-side: re-sharing to the same recipient is a no-op.
 */

import { useState, useMemo } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthProvider";
import { useProfile } from "@/context/ProfileProvider";
import { useNativeShare } from "@/hooks/useNativeShare";
import { Copy, Check, Share2, MessageCircle, Mail, Loader2 } from "lucide-react";
import { notify, notifyError } from '@/lib/i18n-toast';

const GATEWAY_URL =
  (import.meta.env.VITE_GATEWAY_URL as string | undefined) ||
  "https://gateway-q74ibpv6ia-uc.a.run.app/api/v1";

const PUBLIC_ORIGIN =
  (import.meta.env.VITE_PUBLIC_ORIGIN as string | undefined) ||
  "https://gateway-86804897789.us-central1.run.app";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intentId: string;
  intentTitle?: string | null;
  intentScopeExcerpt?: string | null;
  /** Max recipients per batch (varies by tier; default 20 = community). */
  maxRecipients?: number;
}

const VITANA_ID_BARE_REGEX = /^[a-z][a-z0-9]{3,15}$/;

export function IntentShareSheet({
  open,
  onOpenChange,
  intentId,
  intentTitle,
  intentScopeExcerpt,
  maxRecipients = 20,
}: Props) {
  const { session } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();

  const [recipientText, setRecipientText] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Public link with ref attribution.
  const publicLink = useMemo(() => {
    const ref = profile.vitanaId ? `?ref=${encodeURIComponent(profile.vitanaId)}` : "";
    return `${PUBLIC_ORIGIN}/p/${intentId}${ref}`;
  }, [intentId, profile.vitanaId]);

  const { isAvailable: nativeShareAvailable, share: nativeShareFn } = useNativeShare({
    contentId: intentId,
    contentType: "intent_post",
  });

  // Parse recipient input — accept @-prefixed, comma/space/newline separated.
  const recipients = useMemo(() => {
    return recipientText
      .split(/[\s,]+/)
      .map((s) => s.trim().replace(/^@/, "").toLowerCase())
      .filter((s) => s && VITANA_ID_BARE_REGEX.test(s));
  }, [recipientText]);

  const recipientsExceeded = recipients.length > maxRecipients;

  const handleSendInApp = async () => {
    if (!session?.access_token) return;
    if (recipients.length === 0) {
      notifyError('toasts.intents.addAtLeastOneVitanaid');
      return;
    }
    if (recipientsExceeded) {
      toast({
        title: `Too many recipients (${recipients.length})`,
        description: `Free tier allows up to ${maxRecipients}. Upgrade to Pro for 50.`,
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${GATEWAY_URL}/intents/${intentId}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          recipient_vitana_ids: recipients,
          note: note.trim() || undefined,
          channel: "in_app",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title:
            data.error === "BATCH_TOO_LARGE"
              ? "Too many recipients"
              : data.error === "SHARE_QUOTA_EXCEEDED"
                ? "Share limit reached"
                : data.error === "CANNOT_SHARE_PRIVATE_POST"
                  ? "Can't share this post"
                  : "Share failed",
          description: data.message || data.error || "Try again.",
          variant: "destructive",
        });
        return;
      }
      const created = data.matches_created ?? 0;
      const skipped = data.recipients_already_shared ?? 0;
      toast({
        title:
          created === 0
            ? "Already shared with everyone"
            : `Shared with ${created} ${created === 1 ? "friend" : "friends"}`,
        description:
          skipped > 0
            ? `${skipped} already had this post in their inbox.`
            : "They'll see your post in their chat.",
      });
      setRecipientText("");
      setNote("");
      onOpenChange(false);
    } catch (err: any) {
      notifyError('toasts.intents.networkError');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      notify('toasts.intents.linkCopied');
    } catch {
      notifyError('toasts.intents.couldNotCopy');
    }
  };

  const handleNativeShare = async () => {
    const result = await nativeShareFn({
      title: intentTitle || "A Vitana post",
      text: intentScopeExcerpt || "Check this out on Vitana",
      url: publicLink,
    });
    if (result === "shared") onOpenChange(false);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`${intentTitle ? intentTitle + "\n" : ""}${publicLink}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(intentTitle || "From Vitana");
    const body = encodeURIComponent(`${intentScopeExcerpt || ""}\n\n${publicLink}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" /> Share this post
          </DrawerTitle>
          <DrawerDescription>
            Send a direct invite to friends, or copy the link to share anywhere.
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-5">
          {/* In-app DM */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Direct invite to Vitana friends
            </p>
            <Textarea
              placeholder="@dragan1 @maria3 @daniel4 (paste or type up to 20)"
              value={recipientText}
              onChange={(e) => setRecipientText(e.target.value)}
              className="min-h-[60px] font-mono text-sm"
              aria-label="Recipient vitana_ids"
            />
            <Input
              placeholder="Add a short note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={280}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {recipients.length} valid {recipients.length === 1 ? "recipient" : "recipients"}
                {recipientsExceeded && (
                  <span className="text-destructive ml-2">over the {maxRecipients} cap</span>
                )}
              </span>
              <Button
                size="sm"
                onClick={handleSendInApp}
                disabled={submitting || recipients.length === 0 || recipientsExceeded}
              >
                {submitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Send
              </Button>
            </div>
          </div>

          {/* Public link */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Public link
            </p>
            <div className="flex gap-2">
              <Input value={publicLink} readOnly className="flex-1 font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={handleCopyLink} aria-label="Copy link">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Tracks who clicked from your share. Public posts open to anyone; private posts ask viewers to sign in.
            </p>
          </div>

          {/* External channels */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Share elsewhere
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" onClick={handleWhatsApp} className="flex-col h-auto py-3">
                <MessageCircle className="h-4 w-4 mb-1" />
                <span className="text-xs">WhatsApp</span>
              </Button>
              <Button variant="outline" onClick={handleEmail} className="flex-col h-auto py-3">
                <Mail className="h-4 w-4 mb-1" />
                <span className="text-xs">Email</span>
              </Button>
              {nativeShareAvailable && (
                <Button variant="outline" onClick={handleNativeShare} className="flex-col h-auto py-3">
                  <Share2 className="h-4 w-4 mb-1" />
                  <span className="text-xs">More…</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        <DrawerFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
