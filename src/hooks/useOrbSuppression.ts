import { useEffect } from "react";

let dialogCount = 0;

function increment() {
  dialogCount++;
  if (dialogCount === 1) {
    document.body.dataset.dialogOpen = "true";
  }
}

function decrement() {
  dialogCount = Math.max(0, dialogCount - 1);
  if (dialogCount === 0) {
    delete document.body.dataset.dialogOpen;
  }
}

/**
 * Suppresses the floating Orb widget while this component is mounted.
 * Uses a reference counter so nested/simultaneous dialogs work correctly.
 */
export function useOrbSuppression() {
  useEffect(() => {
    increment();
    return () => decrement();
  }, []);
}
