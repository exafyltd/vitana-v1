/**
 * VTID-04937 — put the reader back where they were in the News feed.
 *
 * A single scrollTo right after the feed remounts is not enough deep in the
 * feed: posts' media size themselves only once they load (FeedMedia sets its
 * aspect ratio from onLoad), so the document can still be shorter than the
 * saved offset and the browser clamps the scroll — the reader lands far above
 * the post they opened. This re-applies the offset whenever the page grows,
 * until it is reached, the reader takes over, or the time cap runs out.
 */

/** Any of these means the reader is scrolling themselves — stop fighting them. */
const USER_INPUT_EVENTS = ["touchstart", "wheel", "keydown", "pointerdown"] as const;

export interface RestoreScrollOptions {
  /** Give up after this long, even if the target was never reachable. */
  timeoutMs?: number;
  /** How close scrollY must get to count as restored. */
  tolerancePx?: number;
  /** Called exactly once when restoring ends, for whatever reason. */
  onSettled?: () => void;
}

/** Restores window scroll to `target`; returns a cancel function. */
export function restoreWindowScroll(
  target: number,
  { timeoutMs = 2000, tolerancePx = 2, onSettled }: RestoreScrollOptions = {},
): () => void {
  let done = false;
  let raf1 = 0;
  let raf2 = 0;
  let timer = 0;
  let observer: ResizeObserver | null = null;

  const finish = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf1);
    cancelAnimationFrame(raf2);
    window.clearTimeout(timer);
    observer?.disconnect();
    for (const ev of USER_INPUT_EVENTS) window.removeEventListener(ev, finish);
    onSettled?.();
  };

  const apply = () => {
    if (done) return;
    window.scrollTo(0, target);
    if (Math.abs(window.scrollY - target) <= tolerancePx) finish();
  };

  for (const ev of USER_INPUT_EVENTS) window.addEventListener(ev, finish, { passive: true });
  timer = window.setTimeout(finish, timeoutMs);

  // Two frames: the first lets the restored feed commit, the second lets the
  // browser lay it out. After that, only re-apply when the page actually grows.
  raf1 = requestAnimationFrame(() => {
    raf2 = requestAnimationFrame(() => {
      apply();
      if (!done && typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(apply);
        observer.observe(document.body);
      }
    });
  });

  return finish;
}
