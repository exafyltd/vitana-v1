/**
 * VTID-04425 (Plan v1 WS-3.3) — the screen and a small app state the ORB widget
 * forwards to a live voice session when the route changes.
 *
 * The gateway validates everything again (route shape, at most 12 state keys,
 * primitive values, bounded lengths) and keeps it in session memory only, so
 * this stays deliberately small: the page title and the few URL facts that
 * say which view of a screen the user is looking at. Never user content.
 */

export interface OrbScreenContext {
  screen_title?: string;
  app_state: Record<string, string>;
}

/** URL search params that select a view within a screen, never free text. */
const VIEW_PARAMS = ["tab", "view", "section", "step", "mode"] as const;
const VALUE_RE = /^[A-Za-z0-9_-]{1,40}$/;

export function buildOrbScreenContext(
  search: string,
  documentTitle: string | undefined,
  documentLang: string | undefined,
): OrbScreenContext {
  const app_state: Record<string, string> = {};
  const params = new URLSearchParams(search || "");
  for (const key of VIEW_PARAMS) {
    const v = params.get(key);
    if (v && VALUE_RE.test(v)) app_state[key] = v;
  }
  if (documentLang && /^[a-z]{2}(-[A-Za-z]{2})?$/.test(documentLang)) {
    app_state.ui_lang = documentLang;
  }
  const title = (documentTitle || "").replace(/\s+/g, " ").trim().slice(0, 120);
  return title ? { screen_title: title, app_state } : { app_state };
}
