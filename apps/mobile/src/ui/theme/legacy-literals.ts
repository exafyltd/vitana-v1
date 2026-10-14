/**
 * VTID-05176 — raw colours the WEB primitives still use instead of tokens.
 *
 * Mirroring them keeps the phone UI identical to today's web build
 * (SPOTLIGHT_RULES.md:118 exempts src/components/ui/** from the design lint).
 * This is the ONLY file in src/ui/** that may hold a
 * colour literal (tests/ui/guards.test.ts). N1 turns each entry into a named
 * token later; the web source line is next to every value.
 */
export const legacy = {
  /** button.tsx:21 `solid` — bg-[#111827] text-white */
  buttonSolidBg: '#111827',
  buttonSolidText: '#ffffff',
  /** button.tsx:22 `soft` — bg-violet-50 text-violet-700, dark:bg-violet-950/50 dark:text-violet-300 */
  buttonSoftBg: { light: '#f5f3ff', dark: 'rgba(46, 16, 101, 0.5)' },
  buttonSoftText: { light: '#6d28d9', dark: '#c4b5fd' },
  /** button.tsx:23 `pill` — hover:bg-black/5, dark:hover:bg-white/10 (the native pressed state) */
  buttonPillPressed: { light: 'rgba(0, 0, 0, 0.05)', dark: 'rgba(255, 255, 255, 0.1)' },
  /** badge.tsx:17-18 `success` — bg-green-500 text-white */
  badgeSuccessBg: '#22c55e',
  badgeSuccessText: '#ffffff',
  /** select.tsx:20 trigger — border-white/20 bg-white/60 dark:bg-gray-900/40, focus:border-violet-300/40 */
  selectTriggerBorder: 'rgba(255, 255, 255, 0.2)',
  selectTriggerBg: { light: 'rgba(255, 255, 255, 0.6)', dark: 'rgba(17, 24, 39, 0.4)' },
  selectTriggerFocusBorder: 'rgba(196, 181, 253, 0.4)',
  /** progress.tsx:19 — bg-gradient-to-r from-rose-300 via-orange-300 to-teal-300 opacity-80 */
  progressGradient: ['#fda4af', '#fdba74', '#5eead4'] as const,
  progressOpacity: 0.8,
  /** dialog.tsx:41 / alert-dialog overlay — bg-black/80 */
  overlayDialog: 'rgba(0, 0, 0, 0.8)',
  /** sheet.tsx:26, drawer.tsx:32 — bg-black/20 */
  overlaySheet: 'rgba(0, 0, 0, 0.2)',
  /** responsive-dialog.tsx:38, responsive-popover.tsx:106, responsive-confirm-dialog.tsx:24 — bg-black/60 */
  overlayResponsive: 'rgba(0, 0, 0, 0.6)',
  /** shadcn default: transparent surfaces (ghost/link buttons, outline badges) */
  transparent: 'transparent',
} as const;
