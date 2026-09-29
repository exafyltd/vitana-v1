/**
 * VTID-04501: the Memory Garden never shows "0 memories" while it is loading,
 * and its category cards come from the i18n catalog, not English literals.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'fs';
import { Heart } from 'lucide-react';
import { MemoryCategoryCard } from './MemoryCategoryCard';
import { gardenCategoryKey } from '@/lib/memory-api';
import de from '@/i18n/de/screens.json';
import en from '@/i18n/en/screens.json';

type Garden = { categories: Record<string, { title: string; insight: string }> } & Record<string, unknown>;
const garden = (cat: unknown): Garden => (cat as { screens: { memory: { garden: Garden } } }).screens.memory.garden;

const UI_IDS = [
  'personal-identity', 'health-wellness', 'lifestyle-routines', 'business-projects',
  'network-relationships', 'learning-knowledge', 'finance-assets', 'location-environment',
  'digital-footprint', 'values-aspirations', 'autopilot-settings', 'future-plans', 'general',
];

describe('Memory Garden i18n', () => {
  it('maps UI ids to catalog keys', () => {
    expect(gardenCategoryKey('personal-identity')).toBe('personalIdentity');
    expect(gardenCategoryKey('general')).toBe('general');
  });

  it.each([['de', de], ['en', en]])('%s has a title and insight for every category', (_l, cat) => {
    const g = garden(cat);
    for (const id of UI_IDS) {
      const c = g.categories[gardenCategoryKey(id)];
      expect(c?.title, id).toBeTruthy();
      expect(c?.insight, id).toBeTruthy();
    }
    for (const k of ['lastUpdated', 'cardCountOne', 'cardCountOther', 'loading', 'countOne', 'countOther', 'loadFailed']) {
      expect(g[k], k).toBeTruthy();
      // The catalog interpolates single-brace {name}; {{name}} renders as "{0}".
      expect(g[k], k).not.toMatch(/\{\{/);
    }
  });

  it('German titles are German, not the English literals', () => {
    const g = garden(de);
    expect(g.categories.personalIdentity.title).not.toBe('Personal Identity');
    expect(g.cardCountOther).toContain('Erinnerungen');
  });

  it('the grid and dialog render no English category literal', () => {
    const grid = readFileSync('src/components/memory/MemoryCategoryGrid.tsx', 'utf8');
    expect(grid).not.toMatch(/title=\{category\.title\}/);
    expect(grid).not.toMatch(/:\s*category\.defaultInsight/);
    expect(grid).not.toMatch(/`Last updated /);
    const card = readFileSync('src/components/memory/MemoryCategoryCard.tsx', 'utf8');
    expect(card).not.toMatch(/"memories"/);
    const dlg = readFileSync('src/components/memory/CategoryDetailDialog.tsx', 'utf8');
    expect(dlg).not.toMatch(/\{category\.title\}/);
    expect(dlg).not.toMatch(/"memories"/);
  });
});

describe('MemoryCategoryCard', () => {
  it('shows the loading text, not a zero count, while loading', () => {
    render(<MemoryCategoryCard title="X" icon={Heart} progress={0} memoryCount={0} insight="i" gradient="" onClick={() => {}} loading />);
    expect(screen.queryByText(/^0 /)).toBeNull();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('shows the failure text, not a zero count, when loading failed', () => {
    render(<MemoryCategoryCard title="X" icon={Heart} progress={0} memoryCount={0} insight="i" gradient="" onClick={() => {}} loading failed />);
    expect(screen.queryByText(/^0 /)).toBeNull();
  });

  it('interpolates the count', async () => {
    const { lookup } = await import('@/lib/i18n-toast');
    expect(lookup('screens.memory.garden.countOther', { count: 3 })).toMatch(/^3 /);
    expect(lookup('screens.memory.garden.cardCountOther', { count: 3, progress: 30 })).not.toContain('{');
  });

  it('shows the count once loaded', () => {
    render(<MemoryCategoryCard title="X" icon={Heart} progress={20} memoryCount={2} insight="i" gradient="" onClick={() => {}} />);
    expect(screen.getByText(/2/)).toBeTruthy();
  });
});
