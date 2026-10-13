/**
 * VTID-05186 (N3, plan change 20 / Interfaces I-N2) — the ONE door to the N2
 * UI kit. Until N2 (VTID-05176) merges, the primitives come from the
 * branch-only `./ui.stub`; the swap is this file only (adapting N2's export
 * names to the I-N2 names where they differ), never a shell file.
 */
export {
  UIProvider,
  useUITheme,
  Text,
  Icon,
  IconButton,
  PressableRow,
  Avatar,
  CountBadge,
  TextInput,
  Spinner,
  DelayedLoader,
  BottomSheet,
  SideSheet,
  RadioGroup,
  notify,
  notifyError,
  __toastsForTests,
  __clearToastsForTests,
} from './ui.stub';
export type { RadioOption } from './ui.stub';
