/**
 * VTID-05013 — returning to the News feed re-painted every photo from the
 * phone's full-size original (grey half-frames) and every frame jumped from
 * the default 4:5 height to its real one.
 *
 * FeedMedia now serves Supabase storage photos through the storage image CDN
 * (width 1200, original as a one-shot onError fallback) and remembers each
 * frame's clamped aspect ratio for the session, so a remount paints at its
 * final size.
 */
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/lib/i18n-toast', () => ({ t: (key: string) => key }));

import { FeedMedia } from './FeedMedia';

const STORAGE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/storage/v1/object/public/media-uploads/u1/photo.jpg';
const RESIZED = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/storage/v1/render/image/public/media-uploads/u1/photo.jpg?width=1200&quality=75&resize=contain';

function setNaturalSize(img: HTMLImageElement, width: number, height: number) {
  Object.defineProperty(img, 'naturalWidth', { value: width, configurable: true });
  Object.defineProperty(img, 'naturalHeight', { value: height, configurable: true });
}

// jsdom normalises `aspect-ratio: 0.8` to "0.8 / 1"; compare the number.
function frameRatio(): number {
  const [w, h = '1'] = screen.getByTestId('feed-media').style.aspectRatio.split('/');
  return Number(w) / Number(h);
}

afterEach(cleanup);

describe('FeedMedia photos (VTID-05013)', () => {
  it('serves a Supabase storage photo through the CDN resize at width 1200', () => {
    render(<FeedMedia imageUrl={STORAGE} />);
    expect(screen.getByTestId('feed-media-image').getAttribute('src')).toBe(RESIZED);
  });

  it('leaves a non-Supabase photo untouched', () => {
    const external = 'https://images.unsplash.com/photo-1?w=800';
    render(<FeedMedia imageUrl={external} />);
    expect(screen.getByTestId('feed-media-image').getAttribute('src')).toBe(external);
  });

  it('falls back to the original once when the resize fails, and does not loop', () => {
    render(<FeedMedia imageUrl={STORAGE} />);
    const img = screen.getByTestId('feed-media-image');
    fireEvent.error(img);
    expect(img.getAttribute('src')).toBe(STORAGE);
    fireEvent.error(img);
    expect(img.getAttribute('src')).toBe(STORAGE);
  });

  it('keeps the full-resolution original in the fullscreen overlay', () => {
    render(<FeedMedia imageUrl={STORAGE} />);
    fireEvent.click(screen.getByLabelText('screens.home.enterFullscreen'));
    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('img')?.getAttribute('src')).toBe(STORAGE);
  });

  it('resizes only the thumbnail leg of a video poster', () => {
    const { container } = render(
      <FeedMedia imageUrl={STORAGE} videoUrl="https://inmkhvwdcuyhnxkgfvsb.supabase.co/storage/v1/object/public/media-uploads/u1/clip.mp4" />,
    );
    expect(container.querySelector('video')?.getAttribute('poster')).toBe(RESIZED);
  });

  it('remounts at the remembered aspect ratio before the image loads again', () => {
    const url = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/storage/v1/object/public/media-uploads/u1/landscape.jpg';
    const first = render(<FeedMedia imageUrl={url} />);
    expect(frameRatio()).toBeCloseTo(0.8);
    const img = screen.getByTestId('feed-media-image') as HTMLImageElement;
    setNaturalSize(img, 1200, 800);
    fireEvent.load(img);
    expect(frameRatio()).toBeCloseTo(1.5);
    first.unmount();

    // A fresh mount of the same photo (what returning to the feed does) starts
    // at its real shape — no load event has fired for this element yet.
    render(<FeedMedia imageUrl={url} />);
    expect(frameRatio()).toBeCloseTo(1.5);
  });
});
