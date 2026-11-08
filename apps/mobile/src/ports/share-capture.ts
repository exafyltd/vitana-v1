/**
 * VTID-05646 (native-wave2-sharing-business-r3/sharing) — the one door to the share-card image
 * capture. The web Instagram share modal draws its card to a canvas with a DOM canvas library
 * (`src/components/sharing/InstagramShareModal.tsx`). Native renders the card as a view and
 * captures that view with `react-native-view-shot`'s `captureRef` (design R1-C), then hands the
 * image file to the system share sheet.
 *
 * `react-native-view-shot` is not a dependency of `apps/mobile` yet: adding it is a change to
 * `apps/mobile/package.json` and the lockfile, which are outside this lane's paths. This build
 * registers no engine, so the share card shares the link only (the same fallback the web uses
 * when the browser cannot share files). When the dependency lands, the app registers
 * `{ captureRef }` here at start-up and nothing else changes. Unit tests register a fake.
 */
export interface CaptureOptions {
  format: 'png' | 'jpg';
  quality?: number;
  /** `tmpfile`: the engine writes the image to a temporary file and answers its URI. */
  result: 'tmpfile';
}

export interface ShareCaptureEngine {
  /** Renders the view behind `target` (a ref or a node handle) to an image file and answers its URI. */
  captureRef(target: unknown, options: CaptureOptions): Promise<string>;
}

let engine: ShareCaptureEngine | null = null;

export function getShareCapture(): ShareCaptureEngine | null {
  return engine;
}

/** Replaces the engine. `null` restores the build default (no engine). */
export function registerShareCapture(next: ShareCaptureEngine | null): void {
  engine = next;
}
