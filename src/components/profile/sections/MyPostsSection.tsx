/**
 * E1 / E2 — MyPostsSection.
 *
 * Renders the owner's open user_intents on their own profile page.
 * Owner-only by default; non-owners only see this when the section's
 * account_visibility tier opens it (default 'public', subject to
 * myPosts.commercial sub-toggle for commercial_* posts).
 *
 * `partner_seek` posts are NEVER surfaced here regardless of toggle —
 * they follow the mutual-reveal protocol (hardcoded in the gateway).
 *
 * For the initial cut, we render owner-only. Cross-user cross-section
 * via the gateway lands when /api/v1/profiles/:vitana_id/posts ships
 * (next phase, follow-up to E5).
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { listMyIntents, type UserIntent } from "@/lib/intentApi";
import { FileText } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface MyPostsSectionProps {
  userId: string;
}

const KIND_LABEL: Record<string, string> = {
  commercial_buy: "I'm buying",
  commercial_sell: "I'm selling",
  activity_seek: "Activity partner",
  social_seek: "Social",
  mutual_aid: "Mutual aid",
  learning_seek: "Looking to learn",
  mentor_seek: "Offering to teach",
  // partner_seek — explicitly excluded
};

export function MyPostsSection({ userId }: MyPostsSectionProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<UserIntent[] | null>(null);

  const isOwner = !!user?.id && user.id === userId;

  useEffect(() => {
    if (!isOwner) {
      setPosts(null);
      return;
    }
    listMyIntents({ status: "open" })
      .then((rows) => {
        // Strip partner_seek — privacy guarantee.
        const filtered = rows.filter((r) => r.intent_kind !== "partner_seek");
        setPosts(filtered);
      })
      .catch(() => setPosts([]));
  }, [isOwner]);

  if (!isOwner || !posts || posts.length === 0) return null;

  return (
    <section id="my-posts" className="rounded-xl border border-border bg-card p-4 space-y-3">
      <header className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t('screens.profile.myPosts')}
        </h3>
      </header>

      <div className="space-y-2">
        {posts.map((p) => (
          <Link
            key={p.intent_id}
            to={`/intents/match/${p.intent_id}`}
            className="block border border-border rounded-lg p-3 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {KIND_LABEL[p.intent_kind] ?? p.intent_kind}
                  </span>
                  {p.category && (
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {p.category}
                    </span>
                  )}
                </div>
                <div className="font-medium truncate">{p.title}</div>
                {p.scope && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{p.scope}</p>
                )}
              </div>
              {p.match_count > 0 && (
                <span className="shrink-0 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {p.match_count} {p.match_count === 1 ? "match" : "matches"}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
