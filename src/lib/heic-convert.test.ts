import { describe, it, expect, vi } from 'vitest';
import { isHeicFile, convertHeicToJpeg, type HeicDecoder } from './heic-convert';

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

describe('convertHeicToJpeg', () => {
  const heicFile = () => new File([new Uint8Array([9])], 'IMG_0001.HEIC', { type: 'image/heic', lastModified: 1234 });

  it('converts to a JPEG File named *.jpg and keeps the timestamp', async () => {
    const decode = vi.fn<HeicDecoder>().mockResolvedValue(
      new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }),
    );
    const src = heicFile();

    const out = await convertHeicToJpeg(src, decode);

    expect(decode).toHaveBeenCalledWith(expect.objectContaining({ blob: src, toType: 'image/jpeg' }));
    expect(out.name).toBe('IMG_0001.jpg');
    expect(out.type).toBe('image/jpeg');
    expect(out.size).toBe(3);
    expect(out.lastModified).toBe(1234);
  });

  it('uses the first frame when the decoder returns several images', async () => {
    const decode: HeicDecoder = async () => [
      new Blob([new Uint8Array([1])], { type: 'image/jpeg' }),
      new Blob([new Uint8Array([2, 2])], { type: 'image/jpeg' }),
    ];
    const out = await convertHeicToJpeg(heicFile(), decode);
    expect(out.size).toBe(1);
  });

  it('propagates a decoder failure', async () => {
    const decode: HeicDecoder = async () => {
      throw new Error('unsupported');
    };
    await expect(convertHeicToJpeg(heicFile(), decode)).rejects.toThrow('unsupported');
  });

  it('rejects an empty result', async () => {
    const decode: HeicDecoder = async () => new Blob([], { type: 'image/jpeg' });
    await expect(convertHeicToJpeg(heicFile(), decode)).rejects.toThrow('empty image');
  });
});
