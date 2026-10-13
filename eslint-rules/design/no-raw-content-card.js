// VTID-05107 design/no-raw-content-card — SR-09: content items render through
// VCard. Member pages may not import the raw shadcn Card; operator workspace
// pages (admin, backoffice, dev, professional, staff) keep it for panels.
import { filenameOf, isPageFile, OPERATOR_PAGES_RX, reportUnlessAllowed } from './_shared.js';

export default {
  meta: { type: 'problem', docs: { description: 'Member pages render content through VCard, not the raw Card' }, schema: [] },
  create(context) {
    const f = filenameOf(context);
    if (!isPageFile(f) || OPERATOR_PAGES_RX.test(f)) return {};
    return {
      ImportDeclaration(node) {
        if (node.source.value === '@/components/ui/card') {
          reportUnlessAllowed(context, node, { message: 'Raw Card on a member page — render content items through VCard (@/components/ui/vcard) (SR-09).' });
        }
      },
    };
  },
};
