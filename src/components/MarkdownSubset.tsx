import { renderMarkdownSubset } from '@/lib/markdown';

export function MarkdownSubset({ source }: { source: string }) {
  const html = renderMarkdownSubset(source);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
