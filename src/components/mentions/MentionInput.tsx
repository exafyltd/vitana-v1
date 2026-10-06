/**
 * VTID-04926: single-line text input with @mention autocomplete — the comment
 * box under feed and profile posts. Same engine as the post composer and group
 * chat. The suggestion list renders in the normal flow right under the field
 * (feed cards clip overflow, so a floating list would be cut off).
 *
 * Enter picks a highlighted suggestion while the list is open and only calls
 * `onSubmit` when it is closed.
 */
import { forwardRef, useImperativeHandle, useRef } from "react";
import { MentionSuggestions } from "@/components/mentions/MentionSuggestions";
import { useMentionComposer } from "@/hooks/useMentionComposer";
import type { Mention } from "@/lib/mentions";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  mentions: Mention[];
  onMentionsChange: (mentions: Mention[]) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const MentionInput = forwardRef<HTMLInputElement, MentionInputProps>(function MentionInput(
  { value, onChange, mentions, onMentionsChange, onSubmit, placeholder, disabled, className },
  forwardedRef,
) {
  const ref = useRef<HTMLInputElement>(null);
  useImperativeHandle(forwardedRef, () => ref.current as HTMLInputElement);
  const mc = useMentionComposer({ value, onChange, inputRef: ref, mentions, onMentionsChange });

  return (
    <div className="flex-1 min-w-0">
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          mc.sync();
        }}
        onKeyDown={(e) => {
          if (mc.onKeyDown(e)) return;
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
          }
        }}
        onKeyUp={mc.sync}
        onClick={mc.sync}
        onBlur={mc.closeSoon}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
      />
      <MentionSuggestions {...mc.suggestionProps} className="relative inset-x-0 mt-1" />
    </div>
  );
});
