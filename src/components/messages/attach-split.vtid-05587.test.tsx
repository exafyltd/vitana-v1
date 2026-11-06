/**
 * VTID-05587 — attach split (messenger-polish-r2/attach-split).
 * Photos/videos and files are picked separately, each with multi-select.
 * Source guards: the inputs, the menu entries and the labels are wired.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(__dirname, p), 'utf8');
const input = read('./MessageInput.tsx');
const menu = read('./AttachmentMenu.tsx');

describe('attach split: two hidden inputs (VTID-05587)', () => {
  it('photo input accepts only images and videos and allows several files', () => {
    expect(input).toMatch(/ref=\{photoInputRef\}[\s\S]*?multiple[\s\S]*?accept="image\/\*,video\/\*"/);
  });

  it('file input no longer accepts images or videos', () => {
    const fileInput = input.match(/ref=\{fileInputRef\}[\s\S]*?\/>/)?.[0] ?? '';
    expect(fileInput).toMatch(/multiple/);
    expect(fileInput).not.toMatch(/image\/\*/);
    expect(fileInput).not.toMatch(/video\/\*/);
  });

  it('the menu receives the photo opener', () => {
    expect(input).toMatch(/onPhotoAttach=\{\(\) => photoInputRef\.current\?\.click\(\)\}/);
  });
});

describe('attach split: menu entries (VTID-05587)', () => {
  it('shows a photo entry only when a photo opener is passed', () => {
    expect(menu).toMatch(/onPhotoAttach\?: \(\) => void/);
    expect(menu).toMatch(/\{onPhotoAttach && \(/);
  });

  it('keeps the existing file entry', () => {
    expect(menu).toMatch(/t\('screens\.messages\.attachFile'\)/);
  });
});

describe('attach split: labels (VTID-05587)', () => {
  const locales = ['de', 'en', 'ar', 'es', 'fr', 'pl', 'pt', 'ru', 'sr', 'tr', 'zh'];
  it.each(locales)('%s has attachPhotos', (locale) => {
    const shard = JSON.parse(read(`../../i18n/${locale}/screens.json`));
    expect(shard.screens.messages.attachPhotos).toEqual(expect.any(String));
  });
});
