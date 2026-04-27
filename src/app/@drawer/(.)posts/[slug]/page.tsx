import { notFound } from 'next/navigation';
import { getPostBySlug } from '@/lib/posts';
import { PostDrawer } from '@/components/PostDrawer';
import { ArticleHeader } from '@/components/ArticleHeader';
import { ArticleBody } from '@/components/ArticleBody';
import { ArticleFooter } from '@/components/ArticleFooter';
import { RelatedPosts } from '@/components/RelatedPosts';
import { CommentList } from '@/components/CommentList';
import { CommentForm } from '@/components/CommentForm';

export const dynamic = 'force-dynamic';

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
        <RelatedPosts post={post} />
        <CommentList slug={post.slug} />
        <CommentForm slug={post.slug} />
      </article>
    </PostDrawer>
  );
}
