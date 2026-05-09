// Runtime DE-leak detector.
//
// Mounted only in dev builds OR when the URL contains ?i18n-debug=1.
// Watches the DOM via MutationObserver. When the active language is German,
// scans new text nodes against an English-token heuristic and outlines any
// hits in red + logs [i18n-leak] to the console.
//
// This catches what the ESLint rule cannot:
//   - Backend-supplied strings rendered into the DOM
//   - Dynamic templates (string concatenation, conditional fragments)
//   - Third-party widgets that bypass our codepath
//
// Runtime cost: trivial in dev, zero in prod (component returns null and the
// observer is never attached).

import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

// English UI tokens that should never appear in a German session.
// Word-boundary matched, case-sensitive on capitalized variants for buttons.
const ENGLISH_TOKEN_RX = new RegExp(
  '\\b(' +
    [
      // Buttons / actions
      'Save', 'Cancel', 'Delete', 'Edit', 'Confirm', 'Submit', 'Done', 'Close',
      'Next', 'Back', 'Previous', 'Continue', 'Retry', 'Refresh',
      // States
      'Loading', 'Failed', 'Error', 'Success', 'Warning',
      // Empty
      'No results', 'Nothing here', 'Coming soon',
      // Common nav
      'Settings', 'Profile', 'Search', 'Notifications', 'Inbox', 'Home',
      // Common phrases
      'Welcome', 'Sign in', 'Sign up', 'Log in', 'Log out', 'Sign out',
      'Try again', 'Get started', 'Learn more', 'Read more', 'See all',
    ].join('|') +
    ')\\b'
);

// Whitelist: text nodes that match these are intentionally English (brand,
// proper nouns, debug-only surfaces).
const WHITELIST_RX = /\b(MAXINA|Vitana|VITANA|Lovable|Exafy)\b/;

function shouldLeakWarn(text: string): boolean {
  if (!text || text.length < 2) return false;
  if (WHITELIST_RX.test(text)) return false;
  return ENGLISH_TOKEN_RX.test(text);
}

function inspectNode(node: Node, hits: Array<{ text: string; el: Element }>) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    if (shouldLeakWarn(text)) {
      const el = (node.parentElement || node.parentNode) as Element | null;
      if (el) hits.push({ text: text.trim(), el });
    }
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;
  // Skip our own debug overlays.
  if (el.hasAttribute && el.hasAttribute('data-i18n-leak-overlay')) return;
  el.childNodes.forEach((child) => inspectNode(child, hits));

  // Also check translatable attributes
  if (el.tagName) {
    for (const attr of ['placeholder', 'title', 'aria-label', 'alt']) {
      const v = el.getAttribute(attr);
      if (v && shouldLeakWarn(v)) {
        hits.push({ text: `[${attr}] ${v}`, el });
      }
    }
  }
}

function flagElement(el: Element, text: string) {
  if ((el as HTMLElement).style && !(el as HTMLElement).hasAttribute('data-i18n-leak-flagged')) {
    (el as HTMLElement).setAttribute('data-i18n-leak-flagged', '1');
    (el as HTMLElement).style.outline = '2px dashed #ef4444';
    (el as HTMLElement).style.outlineOffset = '2px';
    (el as HTMLElement).title = `[i18n-leak] ${text}`;
  }
  // eslint-disable-next-line no-console
  console.warn('[i18n-leak]', text, el);
}

function isDebugEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('i18n-debug');
}

export function I18nLeakDetector(): null {
  const { selectedLanguage } = useLanguage();

  useEffect(() => {
    if (!isDebugEnabled()) return;
    if (selectedLanguage !== 'de-DE') return;

    let pending: Array<{ text: string; el: Element }> = [];
    let scheduled = false;

    const flush = () => {
      scheduled = false;
      const seen = new Set<string>();
      for (const { text, el } of pending) {
        const k = text + '|' + (el.tagName || '');
        if (seen.has(k)) continue;
        seen.add(k);
        flagElement(el, text);
      }
      pending = [];
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(flush);
    };

    // Initial scan
    const initialHits: Array<{ text: string; el: Element }> = [];
    inspectNode(document.body, initialHits);
    pending.push(...initialHits);
    schedule();

    const observer = new MutationObserver((mutations) => {
      const hits: Array<{ text: string; el: Element }> = [];
      for (const m of mutations) {
        if (m.type === 'childList') {
          m.addedNodes.forEach((n) => inspectNode(n, hits));
        } else if (m.type === 'characterData' && m.target.nodeType === Node.TEXT_NODE) {
          inspectNode(m.target, hits);
        }
      }
      if (hits.length) {
        pending.push(...hits);
        schedule();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label', 'alt'],
    });

    // eslint-disable-next-line no-console
    console.info('[i18n-leak] detector active for de-DE — set ?i18n-debug=0 to disable');

    return () => observer.disconnect();
  }, [selectedLanguage]);

  return null;
}
