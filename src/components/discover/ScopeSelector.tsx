/**
 * VTID-02000: Scope selector dropdown — local / regional / friendly / international.
 * Persists user choice to /api/v1/user/limitations PATCH.
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";

const SCOPES = [
  { value: "local", label: "Local (my country)", description: "Same-country products only" },
  { value: "regional", label: "My region (e.g. EU)", description: "Same region — fast delivery, no customs" },
  { value: "friendly", label: "Trusted regions", description: "Your region + allies — excludes far-origin" },
  { value: "international", label: "Global", description: "Show everything including China, APAC" },
] as const;

interface ScopeSelectorProps {
  value: string;
  onChange: (scope: string) => void;
  className?: string;
}

export function ScopeSelector({ value, onChange, className }: ScopeSelectorProps) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[200px] h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SCOPES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              <div>
                <div className="font-medium">{s.label}</div>
                <div className="text-xs text-muted-foreground">{s.description}</div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
