import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

export const REFERRAL_OPEN_EVENT = "referral:open";

/**
 * Phase 2 stub for the friend-invite flow. Wired to the `referral:open`
 * event so any milestone CTA (tier-up, streak_7+) can request it without
 * prop-drilling. Phase 3 will replace the placeholder link with a real
 * tracked referral once the backend lands per-user invite codes.
 */
export function InviteSheet() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(REFERRAL_OPEN_EVENT, handler);
    return () => window.removeEventListener(REFERRAL_OPEN_EVENT, handler);
  }, []);

  const placeholderUrl = "https://maxina.app/join?invite=preview";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(placeholderUrl);
      setCopied(true);
      toast.success("Invite link copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — please copy the link manually");
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold">Bring a friend along</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            The journey is better together. Share your invite link — they get a
            head start, you get the company.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="rounded-xl border ring-1 ring-border/60 p-3 bg-muted/40">
            <p className="text-xs text-muted-foreground mb-1">Your invite link</p>
            <p className="text-sm font-mono break-all">{placeholderUrl}</p>
          </div>

          <Button onClick={handleCopy} className="w-full">
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy invite link
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Per-friend invite codes and rewards land soon — this preview link
            works for sharing in the meantime.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default InviteSheet;
