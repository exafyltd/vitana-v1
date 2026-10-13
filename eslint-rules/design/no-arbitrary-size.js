// VTID-05107 design/no-arbitrary-size — SR-12 / SR-14: no fixed pixel sizes on
// cards and layout. Use the width tokens (max-w-stage / max-w-form / max-w-wide),
// VCard sizes and the spacing scale instead of `h-[138px]`, `w-[…]`, `min-h-[…]`.
import { classStringVisitors, classTokens, reportUnlessAllowed } from './_shared.js';

const RX = /^-?(h|w|min-h|max-h|min-w|max-w|size)-\[[^\]]+\]$/;

export default {
  meta: { type: 'problem', docs: { description: 'Disallow arbitrary size utilities (h-[…], w-[…], min-h-[…], max-w-[…])' }, schema: [] },
  create(context) {
    return classStringVisitors((node, value) => {
      const bad = classTokens(value).filter((t) => RX.test(t));
      if (bad.length) reportUnlessAllowed(context, node, { message: `Arbitrary size ${bad.join(', ')} — use Spotlight width tokens, VCard sizes or the spacing scale (SR-12, SR-14).` });
    });
  },
};
