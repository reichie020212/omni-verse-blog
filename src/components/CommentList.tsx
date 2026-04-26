import { auth } from '@/lib/auth';
import { listComments } from '@/lib/comments-actions';
import { fmtRelative } from '@/lib/format';
import { MarkdownSubset } from './MarkdownSubset';
import { DeleteCommentButton } from './DeleteCommentButton';

export async function CommentList({ slug }: { slug: string }) {
  const [session, items] = await Promise.all([auth(), listComments(slug)]);
  if (items.length === 0) return null;
  const me = session?.user?.id;
  return (
    <section className="comments" aria-label="Comments">
      <h2 className="comments-heading">Comments</h2>
      <ul className="comment-list">
        {items.map((c) => {
          const isoDay = new Date(c.createdAt).toISOString().slice(0, 10);
          return (
            <li key={c.id} className="comment">
              <header className="comment-header">
                {!c.deletedAt && c.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.user.image} alt="" className="comment-avatar" />
                ) : (
                  <span
                    className="comment-avatar comment-avatar-fallback"
                    aria-hidden="true"
                  >
                    {(c.user.name?.[0] ?? '?').toUpperCase()}
                  </span>
                )}
                <span className="comment-author">
                  {c.deletedAt ? '[deleted]' : (c.user.name ?? 'Anonymous')}
                </span>
                <time
                  className="comment-date"
                  dateTime={new Date(c.createdAt).toISOString()}
                >
                  {fmtRelative(isoDay)}
                </time>
                {!c.deletedAt && me === c.userId && (
                  <DeleteCommentButton id={c.id} slug={slug} />
                )}
              </header>
              <div className="comment-body">
                {c.deletedAt ? '[deleted]' : <MarkdownSubset source={c.body} />}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
