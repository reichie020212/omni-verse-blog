import { MDXRemote } from 'next-mdx-remote/rsc';
import rehypeSlug from 'rehype-slug';
import rehypePrettyCode, { type Options as PrettyCodeOptions } from 'rehype-pretty-code';
import { mdxComponents } from '@/lib/mdx-components';

const prettyCodeOptions: PrettyCodeOptions = {
  theme: { light: 'github-light', dark: 'github-dark' },
  keepBackground: false,
};

export function ArticleBody({ source }: { source: string }) {
  return (
    <div className="article-body">
      <MDXRemote
        source={source}
        components={mdxComponents}
        options={{
          mdxOptions: {
            rehypePlugins: [rehypeSlug, [rehypePrettyCode, prettyCodeOptions]],
          },
        }}
      />
    </div>
  );
}
