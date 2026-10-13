// VTID-05107 — ESLint plugin `design`: the mechanical half of the Spotlight
// Design Contract (docs/design-system/SPOTLIGHT_RULES.md §C). All rules run at
// error level; existing violations are carried by the per-file ESLint ratchet
// and the base-branch `ratchet-design` PR-GATE check, so new files must be clean.
import noArbitrarySize from './no-arbitrary-size.js';
import noRawPalette from './no-raw-palette.js';
import noPhysicalDirection from './no-physical-direction.js';
import noPageSpinner from './no-page-spinner.js';
import requireScreenFrame from './require-screen-frame.js';
import noRawContentCard from './no-raw-content-card.js';

export default {
  rules: {
    'no-arbitrary-size': noArbitrarySize,
    'no-raw-palette': noRawPalette,
    'no-physical-direction': noPhysicalDirection,
    'no-page-spinner': noPageSpinner,
    'require-screen-frame': requireScreenFrame,
    'no-raw-content-card': noRawContentCard,
  },
};
