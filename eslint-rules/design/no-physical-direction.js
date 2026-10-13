// VTID-05107 design/no-physical-direction — SR-19: logical properties only, so
// every screen mirrors in RTL (Arabic). ml-/mr- → ms-/me-, pl-/pr- → ps-/pe-,
// left-/right- → start-/end-, text-left/right → text-start/end,
// rounded-l/r → rounded-s/e, border-l/r → border-s/e.
import { classStringVisitors, classTokens, reportUnlessAllowed } from './_shared.js';

const RX = /^-?(ml|mr|pl|pr|left|right|scroll-ml|scroll-mr|scroll-pl|scroll-pr)-\S+$|^(text-left|text-right|float-left|float-right|clear-left|clear-right)$|^(rounded-(l|r|tl|tr|bl|br)|border-(l|r))(-\S+)?$/;

export default {
  meta: { type: 'problem', docs: { description: 'Disallow physical left/right utilities; use logical start/end' }, schema: [] },
  create(context) {
    return classStringVisitors((node, value) => {
      const bad = classTokens(value).filter((t) => RX.test(t));
      if (bad.length) reportUnlessAllowed(context, node, { message: `Physical direction ${bad.join(', ')} — use logical start/end utilities (ms-/me-, ps-/pe-, start-/end-, text-start/end, rounded-s/e) so RTL mirrors (SR-19).` });
    });
  },
};
