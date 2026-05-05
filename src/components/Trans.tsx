// Renders a translated string that contains nested JSX elements.
//
// Use when the JSX you want to translate has child elements interleaved with
// text — something a plain `{t('key')}` call can't express:
//
//   <Trans i18nKey="greeting" values={{ name: user.name }}>
//     Hello <strong>{user.name}</strong>!
//   </Trans>
//
// The catalog entry uses positional `<N>` markers to indicate where each
// direct child should land. The N is the zero-based index of the child as
// passed to <Trans>.
//
//   en: "Hello <0>{name}</0>!"
//   de: "Hallo <0>{name}</0>!"
//
// At render time the marker is replaced with the matching child element,
// and that element's children are replaced with the inner text from the
// catalog template. So the catalog can re-order or re-style elements per
// language while preserving their props (className, onClick, etc.).
//
// Param interpolation (`{name}`, `{count}`, etc.) goes through `lookup()`
// from i18n-toast.ts — same singleton that powers `t()` and `notify()`.
//
// For text without nested elements, prefer `{t('key', params)}` — it's
// cheaper at render time.

import React from 'react';
import { lookup } from '@/lib/i18n-toast';

interface TransProps {
  i18nKey: string;
  values?: Record<string, string | number>;
  children: React.ReactNode;
}

const TAG_RX = /<(\d+)>([^<]*)<\/\1>/g;

export function Trans({ i18nKey, values, children }: TransProps): React.ReactElement {
  const template = lookup(i18nKey, values);
  const childArray = React.Children.toArray(children);

  const segments: React.ReactNode[] = [];
  let lastEnd = 0;
  let match: RegExpExecArray | null;
  TAG_RX.lastIndex = 0;
  while ((match = TAG_RX.exec(template)) !== null) {
    if (match.index > lastEnd) segments.push(template.slice(lastEnd, match.index));
    const childIdx = parseInt(match[1], 10);
    const innerText = match[2];
    const child = childArray[childIdx];
    if (React.isValidElement(child)) {
      segments.push(React.cloneElement(child, { key: `t${childIdx}` }, innerText));
    } else {
      segments.push(innerText);
    }
    lastEnd = match.index + match[0].length;
  }
  if (lastEnd < template.length) segments.push(template.slice(lastEnd));

  return React.createElement(React.Fragment, null, ...segments);
}
