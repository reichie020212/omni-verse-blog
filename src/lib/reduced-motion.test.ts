import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const CSS = readFileSync(
  path.join(process.cwd(), 'src', 'styles', 'globals.css'),
  'utf8',
);

function withinReducedMotion(): string[] {
  const blocks: string[] = [];
  const re = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/g;
  let match;
  while ((match = re.exec(CSS)) !== null) {
    let depth = 1;
    let i = match.index + match[0].length;
    const start = i;
    while (i < CSS.length && depth > 0) {
      if (CSS[i] === '{') depth++;
      else if (CSS[i] === '}') depth--;
      i++;
    }
    blocks.push(CSS.slice(start, i - 1));
  }
  return blocks;
}

describe('reduced motion CSS', () => {
  const blocks = withinReducedMotion();
  const all = blocks.join('\n');

  it('exists at all', () => {
    expect(blocks.length).toBeGreaterThan(0);
  });

  it('disables blinking topbar cursor', () => {
    expect(all).toMatch(/\.brand-cursor[\s\S]*?animation:\s*none/);
  });

  it('overrides smooth scroll on html', () => {
    expect(all).toMatch(/html[\s\S]*?scroll-behavior:\s*auto/);
  });

  it('removes hover lifts on cards', () => {
    expect(all).toMatch(/\.card:hover[\s\S]*?transform:\s*none/);
  });

  it('removes hover lifts on related-post cards', () => {
    expect(all).toMatch(/\.related-card:hover[\s\S]*?transform:\s*none/);
  });

  it('keeps the existing drawer-fade override', () => {
    expect(all).toMatch(/\.post-drawer[\s\S]*?transform:\s*none/);
  });
});
