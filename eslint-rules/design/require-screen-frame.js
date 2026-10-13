// VTID-05107 design/require-screen-frame — SR-03: a page composes its in-screen
// chrome only through <ScreenFrame archetype="…">. A page file that renders
// <AppLayout> but no <ScreenFrame> is reported once.
import { filenameOf, isPageFile, reportUnlessAllowed } from './_shared.js';

export default {
  meta: { type: 'problem', docs: { description: 'Pages that render AppLayout must render ScreenFrame' }, schema: [] },
  create(context) {
    if (!isPageFile(filenameOf(context))) return {};
    let firstLayout = null;
    let hasFrame = false;
    return {
      JSXOpeningElement(node) {
        const n = node.name?.type === 'JSXIdentifier' ? node.name.name : '';
        if (n === 'AppLayout' && !firstLayout) firstLayout = node;
        if (n === 'ScreenFrame') hasFrame = true;
      },
      'Program:exit'() {
        if (firstLayout && !hasFrame) {
          reportUnlessAllowed(context, firstLayout, { message: 'Page renders AppLayout without ScreenFrame — compose the screen through <ScreenFrame archetype="…"> (SR-03).' });
        }
      },
    };
  },
};
