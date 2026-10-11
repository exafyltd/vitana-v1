/**
 * VTID-05066 — AvatarImage draws DiceBear 9.x auto-avatars on the device and
 * passes every other src through untouched.
 *
 * Radix's Avatar.Image only mounts its <img> after the browser reports a load,
 * which jsdom never does, so the primitive is replaced by plain elements here
 * to observe the src AvatarImage hands it.
 */
import * as React from 'react';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@radix-ui/react-avatar', () => {
  const Root = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>((p, ref) => <span ref={ref} {...p} />);
  type ImgProps = React.ImgHTMLAttributes<HTMLImageElement> & { onLoadingStatusChange?: (s: string) => void };
  // A test can make the primitive report a load error, as Radix does when the image fails.
  const Image = React.forwardRef<HTMLImageElement, ImgProps>((p, ref) => (
    <img
      ref={ref}
      data-testid="avatar-img"
      data-src={p.src ?? ''}
      alt={p.alt}
      className={p.className}
      onError={() => p.onLoadingStatusChange?.('error')}
    />
  ));
  const Fallback = (p: React.HTMLAttributes<HTMLSpanElement>) => <span {...p} />;
  return { Root, Image, Fallback };
});

import { Avatar, AvatarImage } from './avatar';
import { __clearLocalAvatarMemo } from '@/lib/localAvatar';

const DICEBEAR = 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=A&backgroundType=gradientLinear&backgroundColor=ffd5dc&radius=50';

afterEach(() => {
  cleanup();
  __clearLocalAvatarMemo();
});

describe('AvatarImage (VTID-05066)', () => {
  it('passes a non-storage photo through unchanged, with the usual classes', () => {
    const photo = 'https://images.example.com/u1.jpg';
    render(<Avatar><AvatarImage src={photo} alt="" className="extra" /></Avatar>);
    const img = screen.getByTestId('avatar-img');
    expect(img.getAttribute('data-src')).toBe(photo);
    expect(img.className).toContain('aspect-square');
    expect(img.className).toContain('extra');
  });

  it('serves an uploaded storage photo through the resize CDN at 384 px (amendment A1)', () => {
    const photo = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/storage/v1/object/public/avatars/u1/avatar.jpeg';
    render(<Avatar><AvatarImage src={photo} alt="" className="extra" /></Avatar>);
    const img = screen.getByTestId('avatar-img');
    expect(img.getAttribute('data-src')).toBe(
      'https://inmkhvwdcuyhnxkgfvsb.supabase.co/storage/v1/render/image/public/avatars/u1/avatar.jpeg?width=384&quality=75&resize=contain',
    );
    expect(img.className).toContain('extra');
  });

  it('falls back once to the original storage photo when the resize fails', () => {
    const photo = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/storage/v1/object/public/avatars/u1/avatar.jpeg';
    render(<Avatar><AvatarImage src={photo} alt="" /></Avatar>);
    fireEvent.error(screen.getByTestId('avatar-img'));
    expect(screen.getByTestId('avatar-img').getAttribute('data-src')).toBe(photo);
    fireEvent.error(screen.getByTestId('avatar-img'));
    expect(screen.getByTestId('avatar-img').getAttribute('data-src')).toBe(photo);
  });

  it('leaves data: and blob: URLs untouched', () => {
    for (const url of ['data:image/png;base64,AAAA', 'blob:https://vitanaland.com/1234']) {
      const r = render(<Avatar><AvatarImage src={url} alt="" /></Avatar>);
      expect(screen.getByTestId('avatar-img').getAttribute('data-src')).toBe(url);
      r.unmount();
    }
  });

  it('draws a DiceBear 9.x avatar locally as a data URI (no request to api.dicebear.com)', async () => {
    render(<Avatar><AvatarImage src={DICEBEAR} alt="" /></Avatar>);
    // While drawing, no src: the fallback shows instead of the third-party URL.
    expect(screen.getByTestId('avatar-img').getAttribute('data-src')).toBe('');
    await waitFor(() => expect(screen.getByTestId('avatar-img').getAttribute('data-src')).toMatch(/^data:image\/svg\+xml/));
  });

  it('paints a remembered avatar on the first render of a remount', async () => {
    const first = render(<Avatar><AvatarImage src={DICEBEAR} alt="" /></Avatar>);
    await waitFor(() => expect(screen.getByTestId('avatar-img').getAttribute('data-src')).toMatch(/^data:/));
    first.unmount();
    render(<Avatar><AvatarImage src={DICEBEAR} alt="" /></Avatar>);
    expect(screen.getByTestId('avatar-img').getAttribute('data-src')).toMatch(/^data:/);
  });

  it('keeps a DiceBear URL it cannot draw (older version) as is', () => {
    const old = 'https://api.dicebear.com/7.x/avataaars/svg?seed=11';
    render(<Avatar><AvatarImage src={old} alt="" /></Avatar>);
    expect(screen.getByTestId('avatar-img').getAttribute('data-src')).toBe(old);
  });

  it('falls back to the URL for a 9.x URL it does not fully understand', async () => {
    const odd = 'https://api.dicebear.com/9.x/lorelei/svg?seed=1&flip=true';
    render(<Avatar><AvatarImage src={odd} alt="" /></Avatar>);
    await waitFor(() => expect(screen.getByTestId('avatar-img').getAttribute('data-src')).toBe(odd));
  });
});
