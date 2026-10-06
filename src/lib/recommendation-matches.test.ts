/**
 * VTID-04889 — generate-enhanced-recommendations runs on Claude through the
 * gateway's Bedrock bridge only, and whatever the model answers is validated
 * before it can reach event_recommendations / group_recommendations.
 *
 * Two parts:
 *  - the pure helper `_shared/recommendation-matches.ts` (imported directly,
 *    like bedrock-bridge-client.test.ts does);
 *  - a static contract on the edge function's source: no Google client, key or
 *    provider switch, the model pinned, both answer paths through the helper,
 *    and the uncalled Gemini-only `generate-recommendations` retired.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  rawMatchesFromResponse,
  normalizeRecommendationMatches,
  MIN_RECOMMENDATION_SCORE,
} from '../../supabase/functions/_shared/recommendation-matches.ts';

const candidates = [
  { id: 'e1', type: 'event' as const },
  { id: 'e2', type: 'event' as const },
  { id: 'g1', type: 'group' as const },
];

describe('rawMatchesFromResponse', () => {
  it('takes the tool call when the model called the tool', () => {
    const fc = { name: 'score_recommendations', args: { matches: [{ id: 'e1' }] } };
    expect(rawMatchesFromResponse(fc, 'ignored [1,2]')).toEqual([{ id: 'e1' }]);
  });

  it('falls back to the JSON array in the text when there is no tool call', () => {
    const text = 'Here you go:\n[{"id":"e1","type":"event","score":0.8,"reasons":["yoga"]}]\nThanks';
    expect(rawMatchesFromResponse(null, text)).toEqual([{ id: 'e1', type: 'event', score: 0.8, reasons: ['yoga'] }]);
  });

  it('falls back to the text when the tool call has no matches array', () => {
    expect(rawMatchesFromResponse({ name: 'x', args: {} }, '[{"id":"g1"}]')).toEqual([{ id: 'g1' }]);
  });

  it('returns null when neither path yields an array', () => {
    expect(rawMatchesFromResponse(null, '')).toBeNull();
    expect(rawMatchesFromResponse(null, 'no json here')).toBeNull();
    expect(rawMatchesFromResponse(null, '[not json]')).toBeNull();
    expect(rawMatchesFromResponse(null, '] backwards [')).toBeNull();
  });
});

describe('normalizeRecommendationMatches', () => {
  it('keeps valid matches for known candidates', () => {
    const out = normalizeRecommendationMatches(
      [
        { id: 'e1', type: 'event', score: 0.85, reasons: ['matches interest: yoga'] },
        { id: 'g1', type: 'group', score: 0.5, reasons: [] },
      ],
      candidates,
    );
    expect(out).toEqual([
      { id: 'e1', type: 'event', score: 0.85, reasons: ['matches interest: yoga'] },
      { id: 'g1', type: 'group', score: 0.5, reasons: [] },
    ]);
  });

  it('drops ids the request never read, and type mismatches', () => {
    const out = normalizeRecommendationMatches(
      [
        { id: 'hallucinated', type: 'event', score: 0.9, reasons: [] },
        { id: 'g1', type: 'event', score: 0.9, reasons: [] },
        { id: 'e2', type: 'group', score: 0.9, reasons: [] },
      ],
      candidates,
    );
    expect(out).toEqual([]);
  });

  it('clamps the score and applies the threshold', () => {
    const out = normalizeRecommendationMatches(
      [
        { id: 'e1', type: 'event', score: 7, reasons: [] },
        { id: 'e2', type: 'event', score: MIN_RECOMMENDATION_SCORE - 0.01, reasons: [] },
        { id: 'g1', type: 'group', score: '0.4', reasons: [] },
      ],
      candidates,
    );
    expect(out.map((m) => [m.id, m.score])).toEqual([['e1', 1], ['g1', 0.4]]);
  });

  it('drops non-numeric scores, malformed items and duplicates', () => {
    const out = normalizeRecommendationMatches(
      [null, 'x', { id: 'e1', type: 'event', score: 'high' }, { id: 'e2', type: 'event', score: 0.6 }, { id: 'e2', type: 'event', score: 0.9 }],
      candidates,
    );
    expect(out).toEqual([{ id: 'e2', type: 'event', score: 0.6, reasons: [] }]);
  });

  it('keeps at most 3 non-empty string reasons of at most 200 characters', () => {
    const long = 'x'.repeat(500);
    const out = normalizeRecommendationMatches(
      [{ id: 'e1', type: 'event', score: 0.8, reasons: ['a', 7, '', long, 'b', 'c'] }],
      candidates,
    );
    expect(out[0].reasons).toEqual(['a', 'x'.repeat(200), 'b']);
  });
});

describe('generate-enhanced-recommendations source contract', () => {
  const fnDir = resolve(__dirname, '../../supabase/functions');
  const src = readFileSync(resolve(fnDir, 'generate-enhanced-recommendations/index.ts'), 'utf8');

  it('uses only the Bedrock bridge client — no Google path, key or provider switch', () => {
    expect(src).toContain("from '../_shared/bedrock-bridge-client.ts'");
    expect(src).not.toMatch(/gemini-client/);
    expect(src).not.toMatch(/GOOGLE_GEMINI_API_KEY/);
    expect(src).not.toMatch(/generativelanguage/);
    expect(src).not.toMatch(/AI_BRIDGE_PROVIDER/);
  });

  it('pins a verified Bedrock model', () => {
    expect(src).toContain("const RECOMMENDATION_MODEL = 'eu.anthropic.claude-sonnet-4-6';");
    expect(src).toContain('model: RECOMMENDATION_MODEL');
  });

  it('sends both answer paths through the validator before any upsert', () => {
    const raw = src.indexOf('rawMatchesFromResponse(extractFunctionCall(aiResponse), extractTextFromResponse(aiResponse))');
    const norm = src.indexOf('normalizeRecommendationMatches(');
    const upsert = src.indexOf(".from('event_recommendations').upsert(");
    expect(raw).toBeGreaterThan(0);
    expect(norm).toBeGreaterThan(raw);
    expect(upsert).toBeGreaterThan(norm);
    expect(src).not.toMatch(/functionCall\.args\.matches/);
  });

  it('still localises the prompt for the member', () => {
    expect(src).toContain('buildLocalizedSystemPrompt(');
    expect(src).toContain('getUserLocale(supabaseClient, user.id)');
  });

  it('retires the uncalled Gemini-only generate-recommendations function', () => {
    expect(existsSync(resolve(fnDir, 'generate-recommendations'))).toBe(false);
    const config = readFileSync(resolve(fnDir, '../config.toml'), 'utf8');
    expect(config).not.toContain('[functions.generate-recommendations]');
  });
});
