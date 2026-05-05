/**
 * VTID-02000: Transparency footer — shows how many products were hidden
 * from the current feed/search view and why, with a deep-link to adjust
 * the relevant limitations field.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from '@/lib/i18n-toast';

export interface HiddenBreakdown {
  allergies: number;
  contraindications: number;
  medications: number;
  dietary: number;
  budget: number;
  sensitivities: number;
  geo: number;
  excluded_region: number;
  past_purchases?: number;
}

const REASON_LABELS: Record<keyof HiddenBreakdown, { text: string; href: string }> = {
  allergies: { text: "contain an allergen you listed", href: "/settings/limitations#allergies" },
  contraindications: { text: "contraindicated with a health condition you listed", href: "/settings/limitations#medications" },
  medications: { text: "may interact with a medication you take", href: "/settings/limitations#medications" },
  dietary: { text: "don't match your dietary preferences", href: "/settings/limitations#dietary" },
  budget: { text: "are above your per-product budget ceiling", href: "/settings/limitations#budget" },
  sensitivities: { text: "contain an ingredient you're sensitive to", href: "/settings/limitations" },
  geo: { text: "don't ship to your region", href: "/settings/limitations" },
  excluded_region: { text: "are regionally restricted", href: "/settings/limitations" },
  past_purchases: { text: "you recently purchased", href: "/settings/limitations" },
};

export function HiddenByLimitationsFooter({ breakdown }: { breakdown?: HiddenBreakdown | null }) {
  const [expanded, setExpanded] = useState(false);
  if (!breakdown) return null;
  const total = Object.values(breakdown).reduce((a, b) => a + (b ?? 0), 0);
  if (total === 0) return null;

  const rows = Object.entries(breakdown)
    .filter(([, v]) => (v ?? 0) > 0)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0));

  return (
    <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 text-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-emerald-900"
      >
        <span className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-700" />
          <span><strong>{total}</strong> {total === 1 ? "product" : "products"} hidden by your preferences</span>
        </span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {expanded && (
        <ul className="mt-3 space-y-1.5 pl-6 text-emerald-900/80">
          {rows.map(([key, count]) => {
            const label = REASON_LABELS[key as keyof HiddenBreakdown];
            if (!label) return null;
            return (
              <li key={key} className="flex items-center justify-between gap-3">
                <span>
                  <strong>{count}</strong> {label.text}
                </span>
                <Button variant="ghost" size="sm" asChild>
                  <Link to={label.href}>{t('screens.discover.adjust')}</Link>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
