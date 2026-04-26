import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { highlight } from './highlight';

function render(text: string, ranges: ReadonlyArray<readonly [number, number]>): string {
  return renderToStaticMarkup(<>{highlight(text, ranges)}</>);
}

describe('highlight', () => {
  it('returns the text unchanged when there are no ranges', () => {
    expect(render('hello world', [])).toBe('hello world');
  });

  it('wraps a single range in <mark>', () => {
    expect(render('hello world', [[0, 4]])).toBe('<mark>hello</mark> world');
  });

  it('handles multiple non-overlapping ranges', () => {
    expect(render('hello world!', [[0, 4], [6, 10]])).toBe(
      '<mark>hello</mark> <mark>world</mark>!',
    );
  });

  it('handles a range at the very end of the string', () => {
    expect(render('say hi', [[4, 5]])).toBe('say <mark>hi</mark>');
  });

  it('handles a full-string match', () => {
    expect(render('omg', [[0, 2]])).toBe('<mark>omg</mark>');
  });

  it('sorts unsorted ranges before rendering', () => {
    expect(render('abc def', [[4, 6], [0, 2]])).toBe(
      '<mark>abc</mark> <mark>def</mark>',
    );
  });
});
