// VTID-05107 design/no-raw-palette — SR-17 / SR-18: colours only from tokens.
// Flags Tailwind palette scales (`text-green-600`, `from-purple-50`) and hex /
// rgb / hsl literals in className or style. Never flags token classes
// (text-status-success, bg-severity-high, text-primary, bg-pill-sleep-tint …).
import { classStringVisitors, classTokens, reportUnlessAllowed } from './_shared.js';

const PALETTE = '(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)';
const PROPS = '(bg|text|border|border-[trblxyse]|ring|ring-offset|from|via|to|fill|stroke|outline|divide|shadow|decoration|accent|caret|placeholder)';
const PALETTE_RX = new RegExp(`^${PROPS}-${PALETTE}-\\d{2,3}(\\/\\d+)?$`);
const LITERAL_COLOUR_RX = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(\s*\d/;
const ARBITRARY_COLOUR_RX = /^[a-z-]+-\[(#|rgb|hsl)/;

export default {
  meta: { type: 'problem', docs: { description: 'Disallow raw Tailwind palette colours and hex/rgb/hsl literals' }, schema: [] },
  create(context) {
    const visitors = classStringVisitors((node, value) => {
      const bad = classTokens(value).filter((t) => PALETTE_RX.test(t) || ARBITRARY_COLOUR_RX.test(t));
      if (bad.length) reportUnlessAllowed(context, node, { message: `Raw colour ${bad.join(', ')} — use a semantic token (status-*, severity-*, category-*, surface-*, primary, muted …), see SPOTLIGHT_RULES.md (SR-17).` });
    });
    return {
      ...visitors,
      JSXAttribute(node) {
        if (node.name?.name !== 'style' || node.value?.type !== 'JSXExpressionContainer') return;
        const expr = node.value.expression;
        if (expr?.type !== 'ObjectExpression') return;
        for (const prop of expr.properties) {
          const v = prop.value;
          const text = v?.type === 'Literal' && typeof v.value === 'string' ? v.value : v?.type === 'TemplateLiteral' ? v.quasis.map((q) => q.value.raw).join('') : null;
          if (text && LITERAL_COLOUR_RX.test(text) && !/var\(--/.test(text)) {
            reportUnlessAllowed(context, prop, { message: `Literal colour "${text}" in style — use hsl(var(--token)) from src/index.css (SR-17).` });
          }
        }
      },
    };
  },
};
