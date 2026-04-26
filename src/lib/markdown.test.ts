import { describe, it, expect } from 'vitest';
import { renderMarkdownSubset } from './markdown';

describe('renderMarkdownSubset', () => {
  it('returns escaped plain text unchanged', () => {
    expect(renderMarkdownSubset('hello world')).toBe('hello world');
  });

  it('escapes HTML entities in plain text', () => {
    expect(renderMarkdownSubset('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    );
  });

  it('renders bold', () => {
    expect(renderMarkdownSubset('**bold**')).toBe('<strong>bold</strong>');
  });

  it('renders italic', () => {
    expect(renderMarkdownSubset('*italic*')).toBe('<em>italic</em>');
  });

  it('renders code', () => {
    expect(renderMarkdownSubset('`code`')).toBe('<code>code</code>');
  });

  // Nested markers (e.g. **bold *italic***) are intentionally NOT supported by
  // this regex-based parser. Authors who need nesting can use one marker per
  // segment.

  it('renders an http link', () => {
    expect(renderMarkdownSubset('[hi](https://example.com)')).toBe(
      '<a href="https://example.com" target="_blank" rel="noreferrer">hi</a>',
    );
  });

  it('renders a mailto link', () => {
    expect(renderMarkdownSubset('[mail](mailto:a@b.c)')).toBe(
      '<a href="mailto:a@b.c" target="_blank" rel="noreferrer">mail</a>',
    );
  });

  it('blocks javascript: URLs and renders the literal', () => {
    expect(renderMarkdownSubset('[x](javascript:alert(1))')).toBe(
      '[x](javascript:alert(1))',
    );
  });

  it('renders unclosed bold marker as literal', () => {
    expect(renderMarkdownSubset('**oops')).toBe('**oops');
  });

  it('escapes inside a code span', () => {
    expect(renderMarkdownSubset('`<script>`')).toBe('<code>&lt;script&gt;</code>');
  });

  it('converts newlines to <br />', () => {
    expect(renderMarkdownSubset('line1\nline2')).toBe('line1<br />line2');
  });

  it('returns empty string for empty input', () => {
    expect(renderMarkdownSubset('')).toBe('');
  });
});
