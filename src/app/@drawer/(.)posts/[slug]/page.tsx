import { notFound } from 'next/navigation';
import { getPostBySlug } from '@/lib/posts';
import { PostDrawer } from '@/components/PostDrawer';
import { ArticleHeader } from '@/components/ArticleHeader';
import { ArticleBody } from '@/components/ArticleBody';
import { ArticleFooter } from '@/components/ArticleFooter';

export default async function InterceptedPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();
  return (
    <PostDrawer slug={post.slug}>
      <article className="article">
        <ArticleHeader post={post} />
        <ArticleBody source={post.body} />
        <ArticleFooter post={post} />
      </article>
    </PostDrawer>
  );
}
