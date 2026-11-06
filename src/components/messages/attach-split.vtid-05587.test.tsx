/**
 * VTID-05587 — attach split (messenger-polish-r2/attach-split).
 * Photos/videos and files are picked separately in direct chats, each with
 * multi-select. Group chats have no menu, so their paperclip keeps photos
 * and videos. Source guards: the inputs, the menu entries and the labels are wired.
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

  it('document accept list has no images or videos', () => {
    const doc = input.match(/const DOCUMENT_ACCEPT = '([^']*)'/)?.[1] ?? '';
    expect(doc).not.toMatch(/image\/\*/);
    expect(doc).not.toMatch(/video\/\*/);
  });

  it('group chats get photos and videos back on the file input (no menu there)', () => {
    expect(input).toMatch(/accept=\{conversationType === 'group' \? GROUP_FILE_ACCEPT : DOCUMENT_ACCEPT\}/);
    expect(input).toMatch(/const GROUP_FILE_ACCEPT = `image\/\*,video\/\*,\$\{DOCUMENT_ACCEPT\}`/);
  });

  it('the menu receives the photo opener', () => {
    expect(input).toMatch(/onPhotoAttach=\{\(\) => photoInputRef\.current\?\.click\(\)\}/);
  });

  it('the input that fired is reset, so the same file can be picked again', () => {
    expect(input).toMatch(/const input = e\.target;[\s\S]*?input\.value = '';/);
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
