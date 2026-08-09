/**
 * Horizontal swatch row for choosing a text-post background, mirroring the
 * Facebook/Instagram "text style" picker. The first chip clears the background
 * (plain card); the rest each apply a preset from `post-backgrounds.ts`.
 */
import { Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n-toast";
import { POST_BACKGROUNDS } from "@/lib/post-backgrounds";

interface PostBackgroundPickerProps {
  value: string | null;
  onChange: (id: string | null) => void;
  className?: string;
}

export function PostBackgroundPicker({ value, onChange, className }: PostBackgroundPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label={t("profilePosts.background")}
      className={cn("flex items-center gap-2 overflow-x-auto py-1", className)}
    >
      <button
        type="button"
        role="radio"
        aria-checked={value === null}
        aria-label={t("profilePosts.noBackground")}
        onClick={() => onChange(null)}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground transition-all",
          value === null ? "ring-2 ring-primary ring-offset-2" : "hover:bg-accent",
        )}
      >
        <Ban className="h-4 w-4" />
      </button>
      {POST_BACKGROUNDS.map((bg) => (
        <button
          key={bg.id}
          type="button"
          role="radio"
          aria-checked={value === bg.id}
          aria-label={bg.id}
          onClick={() => onChange(value === bg.id ? null : bg.id)}
          className={cn(
            "h-9 w-9 shrink-0 rounded-full transition-all",
            bg.fillClass,
            value === bg.id ? "ring-2 ring-primary ring-offset-2" : "hover:scale-105",
          )}
        />
      ))}
    </div>
  );
}
