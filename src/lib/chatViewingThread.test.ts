import { describe, expect, it } from 'vitest';
import { isViewingThread } from './chatViewingThread';

describe('isViewingThread (VTID-05200)', () => {
  it('is true only for the open thread while the app is focused', () => {
    expect(isViewingThread({ isForeground: true, activeThreadId: 'a', threadId: 'a' })).toBe(true);
  });
  it('is false for a different thread', () => {
    expect(isViewingThread({ isForeground: true, activeThreadId: 'a', threadId: 'b' })).toBe(false);
  });
  it('is false when the app is backgrounded even if the thread is open', () => {
    expect(isViewingThread({ isForeground: false, activeThreadId: 'a', threadId: 'a' })).toBe(false);
  });
  it('is false when no thread is open', () => {
    expect(isViewingThread({ isForeground: true, activeThreadId: null, threadId: 'a' })).toBe(false);
    expect(isViewingThread({ isForeground: true, activeThreadId: undefined, threadId: 'a' })).toBe(false);
  });
});
