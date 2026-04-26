/**
 * VTID-01976: Dispute modal (P2-C).
 *
 * Triggered from IntentMatchCard. Lets either party of a match raise a
 * dispute by category + detail. Server enforces is-party check.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { raiseDispute, type DisputeReasonCategory } from "@/lib/intentApi";

interface DisputeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  onRaised?: () => void;
}

const CATEGORIES: { value: DisputeReasonCategory; label: string; hint: string }[] = [
  { value: "no_show", label: "No-show", hint: "Counterparty agreed but didn't show up." },
  { value: "misrepresented", label: "Misrepresented", hint: "Service or product wasn't as described." },
  { value: "safety", label: "Safety", hint: "Threatening behavior or harassment." },
  { value: "payment", label: "Payment issue", hint: "Payment dispute or non-payment." },
  { value: "other", label: "Other", hint: "Something else worth flagging." },
];

export function DisputeModal({ open, onOpenChange, matchId, onRaised }: DisputeModalProps) {
  const { toast } = useToast();
  const [category, setCategory] = useState<DisputeReasonCategory>("no_show");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (detail.trim().length < 10) {
      toast({ title: "More detail needed", description: "Minimum 10 characters.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await raiseDispute(matchId, category, detail.trim());
      toast({ title: "Dispute raised", description: "Our support team will review and follow up." });
      setDetail("");
      onRaised?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Could not raise dispute", description: err?.message ?? "", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report an issue</DialogTitle>
          <DialogDescription>
            Raise a dispute on this match. Vitana support will review and follow up. Both parties' identities are recorded for the audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Category</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DisputeReasonCategory)}
              className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {CATEGORIES.find((c) => c.value === category)?.hint}
            </p>
          </div>

          <div>
            <Label htmlFor="dispute-detail" className="text-xs uppercase tracking-wider text-muted-foreground">
              What happened? (10–2000 chars)
            </Label>
            <Textarea
              id="dispute-detail"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Describe the issue clearly. Include dates, amounts, and any context that helps support investigate."
              rows={5}
              maxLength={2000}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Raise dispute"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
