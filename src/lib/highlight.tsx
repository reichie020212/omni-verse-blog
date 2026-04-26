import { Fragment, type ReactNode } from 'react';

export type Range = readonly [number, number];

export function highlight(text: string, ranges: ReadonlyArray<Range>): ReactNode {
  if (ranges.length === 0) return text;
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const out: ReactNode[] = [];
  let cursor = 0;
  sorted.forEach(([start, end], i) => {
    if (start > cursor) {
      out.push(<Fragment key={`t${i}`}>{text.slice(cursor, start)}</Fragment>);
    }
    out.push(<mark key={`m${i}`}>{text.slice(start, end + 1)}</mark>);
    cursor = end + 1;
  });
  if (cursor < text.length) {
    out.push(<Fragment key="tail">{text.slice(cursor)}</Fragment>);
  }
  return <>{out}</>;
}
