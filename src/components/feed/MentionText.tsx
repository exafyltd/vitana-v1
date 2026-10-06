/**
 * Renders a post or comment body with inline @mentions turned into clickable
 * profile links.
 *
 * The record stores the raw text (e.g. "Great session with @Anna Schmidt!")
 * plus a structured `mentions` list. Matching is shared with group chat
 * (`splitMentionSegments`, VTID-04926): longest name first, and a name never
 * matches inside a longer word. Clicks stop propagation so a tagged name
 * inside a feed card never triggers the card's own navigation.
 */
import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { splitMentionSegments, type Mention } from "@/lib/mentions";

export function renderMentions(content: string, mentions: Mention[] | null | undefined): ReactNode {
  if (!content) return null;
  const segments = splitMentionSegments(content, mentions);
  if (segments.length === 1 && segments[0].type === "text") return content;
  return segments.map((seg, i) =>
    seg.type === "text" ? (
      <Fragment key={`t-${i}`}>{seg.text}</Fragment>
    ) : (
      <Link
        key={`m-${i}`}
        to={`/u/${seg.mention.user_id}`}
        onClick={(e) => e.stopPropagation()}
        className="font-semibold text-primary hover:underline"
      >
        {seg.text}
      </Link>
    ),
  );
}
