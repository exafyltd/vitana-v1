/**
 * VTID-03587 — render the actionable tool calls attached to a Vitana DM reply.
 *
 * THE BUG THIS CLOSES
 * -------------------
 * The gateway's text-DM bridge produced tool calls (e.g. "open the News Feed")
 * alongside the assistant's narration, but wrote only the narration into
 * `chat_messages`. So Vitana would say "Hier sind die neuesten Nachrichten aus
 * der Longevity-Community:" and nothing would open; the user replies "dann zeig
 * mir doch" and gets the same sentence again, forever.
 *
 * The gateway now persists a normalised `actions` array into the message
 * metadata (services/chat/dm-tool-actions.ts in vitana-platform). This is the
 * client half that makes them do something.
 *
 * WHY A BUTTON AND NOT AUTO-NAVIGATION
 * ------------------------------------
 * Auto-navigating when the message arrives would yank the user out of the
 * conversation without consent, and — worse — message lists re-render and
 * re-mount as history loads or the user scrolls, so an effect-driven navigation
 * would re-fire on old messages. An explicit control is idempotent: it can sit
 * in scrollback for a week and still do exactly one thing when pressed.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface VitanaDmAction {
  kind?: string;
  screen_id?: string;
  route?: string;
  title?: string;
  event?: string;
  section?: string;
  field?: string;
}

/** Read the actions off a message's content_data, defensively. */
export function readVitanaActions(contentData: unknown): VitanaDmAction[] {
  if (!contentData || typeof contentData !== 'object') return [];
  const actions = (contentData as { actions?: unknown }).actions;
  if (!Array.isArray(actions)) return [];
  return actions.filter(
    (a): a is VitanaDmAction => !!a && typeof a === 'object' && !Array.isArray(a),
  );
}

interface Props {
  contentData: unknown;
}

export const VitanaMessageActions: React.FC<Props> = ({ contentData }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const actions = readVitanaActions(contentData);

  if (actions.length === 0) return null;

  const handle = (action: VitanaDmAction) => {
    if (action.kind === 'navigate' && action.route) {
      navigate(action.route);
      return;
    }
    if (action.kind === 'redirect_event' && action.event) {
      // Mirrors the existing identity-redirect contract: the gateway names the
      // event, the app listens for it (e.g. vitana:open-life-compass).
      window.dispatchEvent(
        new CustomEvent(action.event, {
          detail: { section: action.section, field: action.field },
        }),
      );
    }
  };

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {actions.map((action, i) => {
        // A navigate action with no route cannot be actioned — the gateway
        // already declines to emit those, but never render a dead control.
        if (action.kind === 'navigate' && !action.route) return null;
        if (action.kind === 'redirect_event' && !action.event) return null;

        // `title` is backend-supplied screen naming (already localised by the
        // navigator catalog), so it is shown verbatim; the generic fallback
        // comes from the i18n catalog per the repo's i18n hard rule.
        const label = action.title?.trim() || t('screens.messages.vitanaOpenScreen');

        return (
          <Button
            key={`${action.kind}-${action.screen_id ?? action.event ?? i}`}
            size="sm"
            variant="secondary"
            className="h-8 gap-1.5 text-xs"
            onClick={() => handle(action)}
          >
            {label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        );
      })}
    </div>
  );
};
