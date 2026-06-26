/**
 * Renders a post body with inline @mentions turned into clickable profile links.
 *
 * The post stores the raw text (e.g. "Great session with @Anna Schmidt!") plus a
 * structured `mentions` list. At render time we walk the text and replace every
 * `@DisplayName` that matches a known mention with a link to that member's
 * profile. Clicks stop propagation so a tagged name inside a feed card never
 * triggers the card's own navigation.
 */
import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { PostMention } from "@/lib/news-feed-ranker";

export function renderMentions(content: string, mentions: PostMention[] | null | undefined): ReactNode {
  if (!content) return null;
  const valid = (mentions ?? []).filter((m) => m && m.display_name && m.user_id);
  if (valid.length === 0) return content;

  // Longest display name first so "@Anna Maria" wins over "@Anna".
  const sorted = [...valid].sort((a, b) => b.display_name.length - a.display_name.length);

  const nodes: ReactNode[] = [];
  let buf = "";
  let key = 0;
  let i = 0;

  const flush = () => {
    if (buf) {
      nodes.push(<Fragment key={`t-${key++}`}>{buf}</Fragment>);
      buf = "";
    }
  };

  while (i < content.length) {
    if (content[i] === "@") {
      const match = sorted.find((m) => content.startsWith(`@${m.display_name}`, i));
      if (match) {
        flush();
        nodes.push(
          <Link
            key={`m-${key++}`}
            to={`/u/${match.user_id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-primary hover:underline"
          >
            {`@${match.display_name}`}
          </Link>,
        );
        i += 1 + match.display_name.length;
        continue;
      }
    }
    buf += content[i];
    i += 1;
  }
  flush();
  return nodes;
}
