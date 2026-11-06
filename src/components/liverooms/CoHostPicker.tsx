/**
 * VTID-05561 (live-room-edit-cohost / v1-session-form) — co-host picker.
 *
 * A search box over community members (useMentionCandidates, tenant-scoped
 * RPC). Chosen members show as chips with a remove button. Max 5. Keyboard:
 * arrows move, Enter chooses, Escape closes. The creator is never offered
 * (the RPC excludes the caller).
 */
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMentionCandidates, type MentionCandidate } from "@/hooks/useMentionCandidates";

export const MAX_CO_HOSTS = 5;

export interface CoHost {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

interface CoHostPickerProps {
  value: CoHost[];
  onChange: (next: CoHost[]) => void;
  max?: number;
}

export function CoHostPicker({ value, onChange, max = MAX_CO_HOSTS }: CoHostPickerProps) {
  const { t } = useTranslation();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const full = value.length >= max;
  const { data, isLoading, isError } = useMentionCandidates(query, open && !full);
  const chosen = new Set(value.map((v) => v.user_id));
  const options = (data ?? []).filter((c) => !chosen.has(c.user_id));

  const add = (c: MentionCandidate) => {
    if (full || chosen.has(c.user_id)) return;
    onChange([...value, { user_id: c.user_id, display_name: c.display_name, avatar_url: c.avatar_url }]);
    setQuery("");
    setActive(0);
  };

  const remove = (id: string) => onChange(value.filter((v) => v.user_id !== id));

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, options.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && options[active]) { e.preventDefault(); add(options[active]); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  const showList = open && query.trim().length > 0 && !full;

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={t("liveRooms.cohost.chosen", "Chosen co-hosts")}>
          {value.map((v) => (
            <li key={v.user_id} className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-sm">
              <span className="truncate max-w-[12rem]">{v.display_name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                aria-label={t("liveRooms.cohost.remove", "Remove {{name}}", { name: v.display_name })}
                onClick={() => remove(v.user_id)}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <Input
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && options[active] ? `${listId}-${active}` : undefined}
          aria-disabled={full || undefined}
          disabled={full}
          value={query}
          placeholder={
            full
              ? t("liveRooms.cohost.maxReached", "You can add up to {{max}} co-hosts", { max })
              : t("liveRooms.cohost.placeholder", "Search members")
          }
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />

        {showList && (
          <ul id={listId} role="listbox" className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow">
            {isLoading && <li className="px-2 py-1 text-sm text-muted-foreground">{t("liveRooms.cohost.loading", "Searching…")}</li>}
            {!isLoading && (isError || options.length === 0) && (
              <li className="px-2 py-1 text-sm text-muted-foreground">{t("liveRooms.cohost.none", "No members found")}</li>
            )}
            {options.map((c, i) => (
              <li
                key={c.user_id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={`cursor-pointer rounded px-2 py-1 text-sm ${i === active ? "bg-accent" : ""}`}
                onMouseDown={(e) => { e.preventDefault(); add(c); }}
                onMouseEnter={() => setActive(i)}
              >
                <span className="truncate">{c.display_name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
