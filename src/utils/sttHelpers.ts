/**
 * Shared STT helpers extracted from VoiceDiaryRecorder and FeedbackRecorder
 * to avoid duplication in the unified capture card.
 */

export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const normalizeWords = (value: string): string[] =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);

/**
 * Merge a new final transcript chunk into the existing text,
 * detecting and removing word-level overlap (Android cumulative chunks).
 */
export const mergeFinalTranscript = (existing: string, incoming: string): string => {
  const existingTrimmed = existing.trim();
  const incomingTrimmed = incoming.trim();

  if (!incomingTrimmed) return existingTrimmed;
  if (!existingTrimmed) return incomingTrimmed;

  const existingNormalized = normalizeWords(existingTrimmed).join(' ');
  const incomingNormalized = normalizeWords(incomingTrimmed).join(' ');

  if (!incomingNormalized) return existingTrimmed;
  if (
    existingNormalized === incomingNormalized ||
    existingNormalized.includes(incomingNormalized)
  ) {
    return existingTrimmed;
  }

  const existingWords = existingTrimmed.split(/\s+/);
  const incomingWords = incomingTrimmed.split(/\s+/);
  const existingWordsNorm = existingWords.map((word) => normalizeWords(word).join(''));
  const incomingWordsNorm = incomingWords.map((word) => normalizeWords(word).join(''));

  let overlap = 0;
  const maxOverlap = Math.min(existingWordsNorm.length, incomingWordsNorm.length);

  for (let size = maxOverlap; size > 0; size--) {
    const existingSuffix = existingWordsNorm.slice(-size).join(' ');
    const incomingPrefix = incomingWordsNorm.slice(0, size).join(' ');
    if (existingSuffix && existingSuffix === incomingPrefix) {
      overlap = size;
      break;
    }
  }

  const tailWords = incomingWords.slice(overlap).join(' ').trim();
  if (!tailWords) return existingTrimmed;

  return `${existingTrimmed} ${tailWords}`.trim();
};
