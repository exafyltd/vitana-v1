/**
 * VTID-05138 — full-screen viewer for the pictures in one chat message.
 *
 * Pinch, double-tap/double-click and the mouse wheel zoom; one finger or the
 * mouse pans a zoomed picture; at normal size a swipe (or the arrow keys)
 * moves between the message's pictures. Esc, the close button and the
 * browser/phone back gesture close it. Toolbar: Download, Copy, Share (only
 * where the device can share files) and Forward.
 *
 * The overlay is chrome-free and always dark: it scopes the `.dark` theme so
 * `bg-background` / `text-foreground` come from the tokens. Pointer events
 * only — no gesture library.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Copy, Download, Forward, Share2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { t, useI18nLocale } from '@/lib/i18n-toast';
import {
  canShareImageFiles,
  copyImageAndNotify,
  downloadChatFile,
  shareImageAndNotify,
} from '@/lib/chatImageActions';

export interface ChatViewerImage {
  url: string;
  filename: string;
}

interface ChatImageViewerProps {
  open: boolean;
  images: ChatViewerImage[];
  initialIndex?: number;
  onClose: () => void;
  /** Shown only when the message can be forwarded. */
  onForward?: () => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const SWIPE_PX = 60;
const DOUBLE_TAP_MS = 300;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function isRtl(): boolean {
  return typeof document !== 'undefined' && document.documentElement.getAttribute('dir') === 'rtl';
}

interface Point {
  x: number;
  y: number;
}

export function ChatImageViewer({ open, images, initialIndex = 0, onClose, onForward }: ChatImageViewerProps) {
  useI18nLocale();
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const stageRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{
    start: Point;
    startOffset: Point;
    startScale: number;
    startDist: number;
    moved: boolean;
    pinched: boolean;
  } | null>(null);
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null);
  const canShare = useMemo(() => (open ? canShareImageFiles() : false), [open]);

  const count = images.length;
  const current = images[clamp(index, 0, Math.max(0, count - 1))];

  const resetZoom = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  // Each opening starts on the picture that was tapped, at normal size.
  useEffect(() => {
    if (!open) return;
    setIndex(clamp(initialIndex, 0, Math.max(0, count - 1)));
    resetZoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialIndex]);

  const go = useCallback(
    (delta: number) => {
      if (count < 2) return;
      setIndex((i) => clamp(i + delta, 0, count - 1));
      resetZoom();
    },
    [count, resetZoom],
  );

  // Esc and arrow keys (arrows follow the reading direction).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.stopImmediatePropagation();
        ev.preventDefault();
        onCloseRef.current();
      } else if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
        ev.preventDefault();
        const forward = ev.key === 'ArrowRight' ? 1 : -1;
        go(isRtl() ? -forward : forward);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, go]);

  // The phone's back gesture closes the viewer instead of leaving the chat.
  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const marker = { vitanaChatImageViewer: true };
    let poppedByBack = false;
    window.history.pushState({ ...(window.history.state || {}), ...marker }, '');
    const onPop = () => {
      // Still on the viewer's own entry (e.g. a hash change) — not a back.
      if ((window.history.state as Record<string, unknown> | null)?.vitanaChatImageViewer) return;
      poppedByBack = true;
      onCloseRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (!poppedByBack && (window.history.state as Record<string, unknown> | null)?.vitanaChatImageViewer) {
        window.history.back();
      }
    };
  }, [open]);

  // Wheel zoom needs a non-passive listener to keep the page from scrolling.
  useEffect(() => {
    const el = stageRef.current;
    if (!open || !el) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      setScale((s) => {
        const next = clamp(s * Math.exp(-ev.deltaY * 0.002), MIN_SCALE, MAX_SCALE);
        if (next === MIN_SCALE) setOffset({ x: 0, y: 0 });
        return next;
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [open]);

  const toggleZoomAt = useCallback(() => {
    if (scale > 1) resetZoom();
    else setScale(DOUBLE_TAP_SCALE);
  }, [scale, resetZoom]);

  const distance = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };

  const onPointerDown = (ev: React.PointerEvent<HTMLDivElement>) => {
    if ((ev.target as HTMLElement).closest('button')) return;
    ev.currentTarget.setPointerCapture?.(ev.pointerId);
    pointers.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    const pinching = pointers.current.size >= 2;
    gesture.current = {
      start: { x: ev.clientX, y: ev.clientY },
      startOffset: offset,
      startScale: scale,
      startDist: pinching ? distance() : 0,
      moved: false,
      pinched: pinching || !!gesture.current?.pinched,
    };
  };

  const onPointerMove = (ev: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(ev.pointerId) || !gesture.current) return;
    pointers.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    const g = gesture.current;
    if (pointers.current.size >= 2 && g.startDist > 0) {
      const next = clamp((g.startScale * distance()) / g.startDist, MIN_SCALE, MAX_SCALE);
      setScale(next);
      if (next === MIN_SCALE) setOffset({ x: 0, y: 0 });
      g.moved = true;
      return;
    }
    const dx = ev.clientX - g.start.x;
    const dy = ev.clientY - g.start.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) g.moved = true;
    if (scale > 1) setOffset({ x: g.startOffset.x + dx, y: g.startOffset.y + dy });
  };

  const onPointerUp = (ev: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(ev.pointerId)) return;
    pointers.current.delete(ev.pointerId);
    const g = gesture.current;
    if (pointers.current.size > 0 || !g) return;
    gesture.current = null;

    const dx = ev.clientX - g.start.x;
    const dy = ev.clientY - g.start.y;

    // Swipe between pictures — only at normal size and never after a pinch.
    if (!g.pinched && scale <= 1 && Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
      const forward = dx < 0 ? 1 : -1;
      go(isRtl() ? -forward : forward);
      return;
    }

    // Double tap (touch / pen; the mouse uses onDoubleClick).
    if (ev.pointerType !== 'mouse' && !g.moved && !g.pinched) {
      const now = Date.now();
      const prev = lastTap.current;
      if (prev && now - prev.time < DOUBLE_TAP_MS && Math.hypot(prev.x - ev.clientX, prev.y - ev.clientY) < 30) {
        lastTap.current = null;
        toggleZoomAt();
      } else {
        lastTap.current = { time: now, x: ev.clientX, y: ev.clientY };
      }
    }
  };

  const onPointerCancel = (ev: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(ev.pointerId);
    if (pointers.current.size === 0) gesture.current = null;
  };

  if (!open || count === 0 || typeof document === 'undefined') return null;

  const iconButton = 'h-11 w-11 rounded-full text-foreground hover:bg-muted';

  return createPortal(
    <div
      className="dark fixed inset-0 z-[140] flex flex-col bg-background text-foreground"
      role="dialog"
      aria-modal="true"
      aria-label={t('screens.messages.imageViewer')}
      data-testid="chat-image-viewer"
    >
      <div className="flex shrink-0 items-center gap-1 px-2 pb-2" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
        <Button variant="ghost" size="icon" className={iconButton} onClick={onClose} aria-label={t('screens.messages.close')} data-testid="chat-image-viewer-close">
          <X className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1 px-2">
          <p className="m-0 truncate text-sm font-medium">{current?.filename}</p>
          {count > 1 && (
            <p className="m-0 text-xs text-muted-foreground" data-testid="chat-image-viewer-counter">
              {t('screens.messages.imageCounter', { current: index + 1, total: count })}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={iconButton}
          onClick={() => current && downloadChatFile(current.url, current.filename)}
          aria-label={t('screens.messages.downloadImage')}
          data-testid="chat-image-viewer-download"
        >
          <Download className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={iconButton}
          onClick={() => current && copyImageAndNotify(current.url)}
          aria-label={t('screens.messages.copyImage')}
          data-testid="chat-image-viewer-copy"
        >
          <Copy className="h-5 w-5" />
        </Button>
        {canShare && (
          <Button
            variant="ghost"
            size="icon"
            className={iconButton}
            onClick={() => current && shareImageAndNotify(current.url, current.filename)}
            aria-label={t('screens.messages.shareImage')}
            data-testid="chat-image-viewer-share"
          >
            <Share2 className="h-5 w-5" />
          </Button>
        )}
        {onForward && (
          <Button
            variant="ghost"
            size="icon"
            className={iconButton}
            onClick={onForward}
            aria-label={t('screens.messages.forward')}
            data-testid="chat-image-viewer-forward"
          >
            <Forward className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div
        ref={stageRef}
        className="relative flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onDoubleClick={toggleZoomAt}
        data-testid="chat-image-viewer-stage"
      >
        {current?.url ? (
          <img
            key={current.url}
            src={current.url}
            alt={current.filename}
            draggable={false}
            className="max-h-full max-w-full object-contain"
            style={{
              transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
              transition: gesture.current ? 'none' : 'transform 150ms ease-out',
            }}
            data-testid="chat-image-viewer-image"
            data-scale={scale}
          />
        ) : (
          <div
            className="h-64 w-64 max-w-full animate-pulse rounded-lg bg-muted"
            role="status"
            aria-label={t('screens.messages.imageLoading')}
          />
        )}

        {count > 1 && index > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(iconButton, 'absolute start-2 top-1/2 hidden -translate-y-1/2 md:inline-flex')}
            onClick={() => go(-1)}
            aria-label={t('screens.messages.previousImage')}
            data-testid="chat-image-viewer-prev"
          >
            <ChevronLeft className="h-6 w-6 rtl:rotate-180" />
          </Button>
        )}
        {count > 1 && index < count - 1 && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(iconButton, 'absolute end-2 top-1/2 hidden -translate-y-1/2 md:inline-flex')}
            onClick={() => go(1)}
            aria-label={t('screens.messages.nextImage')}
            data-testid="chat-image-viewer-next"
          >
            <ChevronRight className="h-6 w-6 rtl:rotate-180" />
          </Button>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default ChatImageViewer;
