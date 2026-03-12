

# Harden iOS Detection in `src/lib/appilix.ts`

## Change

Replace the current `isIAPRestricted()` with the user's exact `isIOSApp()` + `isIAPRestricted()` pair.

### `src/lib/appilix.ts` — lines 114–121

**Remove:**
```ts
/**
 * iOS App Store Guideline 3.1.1 compliance gate.
 * Returns true when digital purchases must be hidden.
 * Will remain true on iOS until a compliant IAP solution is implemented.
 */
export function isIAPRestricted(): boolean {
  return isAppilix();
}
```

**Replace with:**
```ts
/**
 * Returns true when running inside the Appilix shell on an iOS device.
 * Handles modern iPads that report "MacIntel" with desktop-class UA strings
 * by also checking maxTouchPoints.
 */
export function isIOSApp(): boolean {
  if (!isAppilix()) return false;
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const isiPhoneLike = /iPhone|iPad|iPod/i.test(ua);
  const isiPadLikeDesktopUA = platform === 'MacIntel' && maxTouchPoints > 1;
  return isiPhoneLike || isiPadLikeDesktopUA;
}

/**
 * iOS App Store Guideline 3.1.1 compliance gate.
 * Returns true when digital purchases must be hidden.
 * Will remain true on iOS until a compliant IAP solution is implemented.
 */
export function isIAPRestricted(): boolean {
  return isIOSApp();
}
```

## Scope

**1 file**, **1 function added**, **1 function body changed**. No other files need changes — all consumers already call `isIAPRestricted()`.

## Detection matrix after fix

| Platform | `isAppilix()` | `isIOSApp()` | `isIAPRestricted()` | Purchase UI |
|----------|---------------|--------------|---------------------|-------------|
| Web/desktop | false | false | false | Full |
| Android Appilix | true | false | false | Full |
| iPhone Appilix | true | true | true | Hidden |
| iPad Appilix (mobile UA) | true | true | true | Hidden |
| iPad Appilix (desktop UA, MacIntel) | true | true | true | Hidden |

