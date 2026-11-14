import { describe, it, expect } from 'vitest';
import { isHeicFile } from './heic-convert';

describe('isHeicFile', () => {
  it('detects HEIC/HEIF by MIME type', () => {
    expect(isHeicFile({ name: 'x.bin', type: 'image/heic' })).toBe(true);
    expect(isHeicFile({ name: 'x.bin', type: 'image/heif' })).toBe(true);
  });

  it('detects HEIC by extension when the picker reports an empty type', () => {
    expect(isHeicFile({ name: 'IMG_0001.HEIC', type: '' })).toBe(true);
    expect(isHeicFile({ name: 'photo.heif', type: '' })).toBe(true);
  });

  it('leaves JPEG, PNG, WebP and videos alone', () => {
    expect(isHeicFile({ name: 'a.jpg', type: 'image/jpeg' })).toBe(false);
    expect(isHeicFile({ name: 'a.png', type: 'image/png' })).toBe(false);
    expect(isHeicFile({ name: 'a.webp', type: 'image/webp' })).toBe(false);
    expect(isHeicFile({ name: 'clip.mp4', type: 'video/mp4' })).toBe(false);
  });
});
