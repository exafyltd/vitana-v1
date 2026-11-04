/**
 * VTID-05193 — the safe Markdown subset for Vitana's chat replies.
 */
import { describe, it, expect } from 'vitest';
import { parseChatMarkdown, parseChatInline, type MdInline, type MdBlock } from './chatMarkdown';

const text = (t: string): MdInline => ({ type: 'text', text: t });

function flatText(nodes: MdInline[]): string {
  return nodes
    .map((n) => (n.type === 'text' || n.type === 'code' ? n.text : flatText(n.children)))
    .join('');
}

function paragraph(blocks: MdBlock[]): MdInline[] {
  expect(blocks).toHaveLength(1);
  expect(blocks[0].type).toBe('paragraph');
  return (blocks[0] as Extract<MdBlock, { type: 'paragraph' }>).children;
}

describe('parseChatInline — emphasis and code', () => {
  it('parses **bold** and __bold__', () => {
    expect(parseChatInline('a **b** c')).toEqual([text('a '), { type: 'strong', children: [text('b')] }, text(' c')]);
    expect(parseChatInline('__b__')).toEqual([{ type: 'strong', children: [text('b')] }]);
  });

  it('parses *italic* and _italic_', () => {
    expect(parseChatInline('an *x* y')).toEqual([text('an '), { type: 'em', children: [text('x')] }, text(' y')]);
    expect(parseChatInline('_x_')).toEqual([{ type: 'em', children: [text('x')] }]);
  });

  it('parses `code` literally (no emphasis inside)', () => {
    expect(parseChatInline('run `a **b** c` now')).toEqual([
      text('run '),
      { type: 'code', text: 'a **b** c' },
      text(' now'),
    ]);
  });

  it('supports one level of nesting both ways', () => {
    expect(parseChatInline('**bold *it* bold**')).toEqual([
      { type: 'strong', children: [text('bold '), { type: 'em', children: [text('it')] }, text(' bold')] },
    ]);
    expect(parseChatInline('*it **b** it*')).toEqual([
      { type: 'em', children: [text('it '), { type: 'strong', children: [text('b')] }, text(' it')] },
    ]);
  });

  it('deeper nesting stays literal', () => {
    const nodes = parseChatInline('**a *b __c__ b* a**');
    const strong = nodes[0] as Extract<MdInline, { type: 'strong' }>;
    const em = strong.children[1] as Extract<MdInline, { type: 'em' }>;
    expect(em.type).toBe('em');
    expect(em.children).toEqual([text('b __c__ b')]);
  });

  it('the screenshot text renders bold, no literal markers', () => {
    const nodes = parseChatInline('**"Did You Know"**');
    expect(nodes).toEqual([{ type: 'strong', children: [text('"Did You Know"')] }]);
  });

  it('unbalanced ** stays literal', () => {
    expect(flatText(parseChatInline('a **b c'))).toBe('a **b c');
    expect(parseChatInline('a **b c').every((n) => n.type === 'text')).toBe(true);
  });

  it('snake_case_word and 2*3*4 stay literal', () => {
    expect(parseChatInline('use snake_case_word here')).toEqual([text('use snake_case_word here')]);
    expect(parseChatInline('2*3*4 = 24')).toEqual([text('2*3*4 = 24')]);
  });

  it('*** and markers next to spaces stay literal', () => {
    expect(parseChatInline('***x***')).toEqual([text('***x***')]);
    expect(parseChatInline('a * b * c')).toEqual([text('a * b * c')]);
  });

  it('<script> stays text — never HTML', () => {
    const nodes = parseChatInline('<script>alert(1)</script>');
    expect(nodes).toEqual([text('<script>alert(1)</script>')]);
  });

  it('empty input', () => {
    expect(parseChatInline('')).toEqual([]);
    expect(parseChatMarkdown('')).toEqual([]);
    expect(parseChatMarkdown(undefined)).toEqual([]);
    expect(parseChatMarkdown(null)).toEqual([]);
  });
});

describe('parseChatInline — URLs are atomic (R3)', () => {
  it('a URL inside bold is one whole leaf inside the strong node', () => {
    expect(parseChatInline('**see https://example.com/a**')).toEqual([
      { type: 'strong', children: [text('see '), text('https://example.com/a')] },
    ]);
  });

  it('a URL wrapped directly in bold keeps the markers out of the URL', () => {
    expect(parseChatInline('**https://example.com**')).toEqual([
      { type: 'strong', children: [text('https://example.com')] },
    ]);
  });

  it.each(['https://example.com/__preview__', 'https://example.com/*draft*', 'https://example.com/a_b_c'])(
    '%s stays one whole leaf',
    (url) => {
      expect(parseChatInline(`open ${url} now`)).toEqual([text('open '), text(url), text(' now')]);
    },
  );
});

describe('parseChatMarkdown — blocks', () => {
  it('plain text is a single paragraph with the text unchanged', () => {
    const t = 'Hello there.\nSecond line, nothing special.';
    const children = paragraph(parseChatMarkdown(t));
    expect(flatText(children)).toBe(t);
    expect(children.every((n) => n.type === 'text')).toBe(true);
  });

  it('bullets (-, *, •) become one unordered list', () => {
    const blocks = parseChatMarkdown('Try:\n- Say **"Show me"** → open\n* two\n• three');
    expect(blocks.map((b) => b.type)).toEqual(['paragraph', 'list']);
    const list = blocks[1] as Extract<MdBlock, { type: 'list' }>;
    expect(list.ordered).toBe(false);
    expect(list.items).toHaveLength(3);
    expect(list.items[0]).toEqual([
      text('Say '),
      { type: 'strong', children: [text('"Show me"')] },
      text(' → open'),
    ]);
  });

  it('numbered items become an ordered list with its start number', () => {
    const blocks = parseChatMarkdown('3. a\n4. b');
    expect(blocks).toEqual([{ type: 'list', ordered: true, start: 3, items: [[text('a')], [text('b')]] }]);
  });

  it('# to ### are headings; #### stays literal', () => {
    const blocks = parseChatMarkdown('# One\n## Two\n### Three\n#### Four');
    expect(blocks.slice(0, 3).map((b) => (b.type === 'heading' ? b.level : 0))).toEqual([1, 2, 3]);
    expect(flatText(paragraph(blocks.slice(3)))).toBe('#### Four');
  });

  it('mixed text with a URL keeps the URL leaf whole', () => {
    const children = paragraph(parseChatMarkdown('Read **this**: https://example.com/x_y.'));
    expect(children).toContainEqual(text('https://example.com/x_y.'));
  });
});
