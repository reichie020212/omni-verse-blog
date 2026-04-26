import { notFound } from 'next/navigation';
import { getAllPosts, getPostBySlug } from '@/lib/posts';
import { ArticleHeader } from '@/components/ArticleHeader';
import { ArticleBody } from '@/components/ArticleBody';
import { ArticleFooter } from '@/components/ArticleFooter';
import { RelatedPosts } from '@/components/RelatedPosts';
import { CommentList } from '@/components/CommentList';
import { CommentForm } from '@/components/CommentForm';

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      type: 'article' as const,
      title: post.title,
      description: post.excerpt,
      publishedTime: post.date,
      authors: ['Red'],
      tags: post.tags,
      images: [`/og/${post.slug}.png`],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: post.title,
      description: post.excerpt,
      images: [`/og/${post.slug}.png`],
    },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  return (
    <article className="article">
      <ArticleHeader post={post} />
      <ArticleBody source={post.body} />
      <ArticleFooter post={post} />
      <RelatedPosts post={post} />
      <CommentList slug={post.slug} />
      <CommentForm slug={post.slug} />
    </article>
  );
}
