// VTID-05107 design/no-page-spinner — SR-20: a page never shows a spinner or a
// blank panel while loading; it shows the skeleton of its archetype
// (ArchetypeSkeleton / VCardSkeleton). A spinner inside a button (a pending
// action) is fine.
import { filenameOf, isPageFile, reportUnlessAllowed } from './_shared.js';

function jsxName(n) {
  const name = n?.openingElement?.name;
  if (!name) return '';
  return name.type === 'JSXIdentifier' ? name.name : name.type === 'JSXMemberExpression' ? name.property.name : '';
}

function insideButton(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (p.type === 'JSXElement' && /^(Button|button)$/.test(jsxName(p))) return true;
  }
  return false;
}

function hasSpinClass(el) {
  return el.openingElement.attributes.some(
    (a) => a.type === 'JSXAttribute' && a.name?.name === 'className' && a.value?.type === 'Literal' && /\banimate-spin\b/.test(String(a.value.value)),
  );
}

export default {
  meta: { type: 'problem', docs: { description: 'Disallow page-level spinners; use archetype skeletons' }, schema: [] },
  create(context) {
    if (!isPageFile(filenameOf(context))) return {};
    return {
      JSXElement(node) {
        if ((jsxName(node) === 'Loader2' || hasSpinClass(node)) && !insideButton(node)) {
          reportUnlessAllowed(context, node, { message: 'Page-level spinner — show the archetype skeleton (ArchetypeSkeleton / VCardSkeleton) instead (SR-20).' });
        }
      },
    };
  },
};
