import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

export const users = sqliteTable('user', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: integer('emailVerified', { mode: 'timestamp_ms' }),
  image: text('image'),
  username: text('username').unique(),
  passwordHash: text('password_hash'),
  role: text('role', { enum: ['admin', 'user'] }).notNull().default('user'),
});

export const accounts = sqliteTable(
  'account',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (t) => ({ pk: primaryKey({ columns: [t.provider, t.providerAccountId] }) }),
);

export const sessions = sqliteTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
});

export const verificationTokens = sqliteTable(
  'verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.identifier, t.token] }) }),
);

export const likes = sqliteTable(
  'likes',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postSlug: text('post_slug')
      .notNull()
      .references(() => posts.slug, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.postSlug] }) }),
);

export const bookmarks = sqliteTable(
  'bookmarks',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postSlug: text('post_slug')
      .notNull()
      .references(() => posts.slug, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.postSlug] }) }),
);

export const comments = sqliteTable(
  'comments',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postSlug: text('post_slug')
      .notNull()
      .references(() => posts.slug, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  },
  (t) => ({ bySlug: index('comments_by_slug_idx').on(t.postSlug, t.createdAt) }),
);

export const posts = sqliteTable(
  'posts',
  {
    slug: text('slug').primaryKey(),
    id: text('id').notNull().unique(),
    title: text('title').notNull(),
    excerpt: text('excerpt').notNull(),
    body: text('body').notNull(),
    category: text('category').notNull(),
    tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default([]),
    date: text('date').notNull(),
    readTime: integer('read_time').notNull(),
    size: text('size', { enum: ['hero', 'wide', 'medium', 'small'] }).notNull(),
    cover: text('cover').notNull(),
    featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
    draft: integer('draft', { mode: 'boolean' }).notNull().default(false),
    authorId: text('author_id')
      .notNull()
      .references(() => users.id),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    draftIdx: index('posts_draft_idx').on(t.draft),
    dateIdx: index('posts_date_idx').on(t.date),
    categoryIdx: index('posts_category_idx').on(t.category),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  likes: many(likes),
  bookmarks: many(bookmarks),
  comments: many(comments),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  post: one(posts, { fields: [likes.postSlug], references: [posts.slug] }),
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  post: one(posts, { fields: [bookmarks.postSlug], references: [posts.slug] }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, { fields: [comments.userId], references: [users.id] }),
  post: one(posts, { fields: [comments.postSlug], references: [posts.slug] }),
}));
