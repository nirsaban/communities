import mongoose, { Types } from 'mongoose';
import { Post, IPost } from '../models/Post';
import { Comment, IComment } from '../models/Comment';
import { Membership } from '../models/Membership';
import { AppError } from '../utils/AppError';
import { cursorFilter, nextCursorFor, parsePagination } from '../utils/pagination';
import {
  CreatePostInput,
  UpdatePostInput,
  CreatePostCommentInput,
} from '../validators/post.validator';
import type { IUser } from '../models/User';

export interface ListPostsOpts {
  limit?: number;
  cursor?: string;
  type?: IPost['type'];
}

export async function listPosts(
  communityId: Types.ObjectId,
  opts: ListPostsOpts,
): Promise<{ items: Record<string, unknown>[]; nextCursor: string | null }> {
  const { limit, cursor } = parsePagination({ limit: opts.limit, cursor: opts.cursor });
  const filter: Record<string, unknown> = { communityId };
  if (opts.type) filter.type = opts.type;
  Object.assign(filter, cursorFilter(cursor));
  const rows = await Post.find(filter)
    .sort({ isPinned: -1, createdAt: -1, _id: -1 })
    .limit(limit + 1);
  const items = rows.slice(0, limit);
  const next =
    rows.length > limit
      ? nextCursorFor(items as unknown as { createdAt: Date; _id: Types.ObjectId }[])
      : null;
  return { items: items.map((r) => r.toClientJSON()), nextCursor: next };
}

export async function createPost(
  community: { _id: Types.ObjectId },
  actor: IUser,
  input: CreatePostInput,
): Promise<IPost> {
  // Only staff can publish announcements.
  if (input.type === 'announcement') {
    if (actor.globalRole !== 'superadmin') {
      const m = await Membership.findOne({ userId: actor._id, communityId: community._id });
      if (!m || (m.role !== 'admin' && m.role !== 'subadmin')) {
        throw AppError.unauthorized('Only community staff can post announcements');
      }
    }
  }
  return Post.create({ ...input, communityId: community._id, authorId: actor._id });
}

export async function getPost(pid: string, viewer: IUser): Promise<IPost> {
  if (!Types.ObjectId.isValid(pid)) throw AppError.notFound('Post not found');
  const post = await Post.findById(pid);
  if (!post) throw AppError.notFound('Post not found');
  await ensureCommunityAccess(viewer, post.communityId);
  return post;
}

export async function updatePost(
  pid: string,
  actor: IUser,
  patch: UpdatePostInput,
): Promise<IPost> {
  const post = await getPost(pid, actor);
  await ensureAuthorOrStaff(post, actor);
  Object.assign(post, patch);
  await post.save();
  return post;
}

export async function pinPost(pid: string, actor: IUser, pinned: boolean): Promise<IPost> {
  const post = await getPost(pid, actor);
  // Pinning is staff-only.
  if (actor.globalRole !== 'superadmin') {
    const m = await Membership.findOne({ userId: actor._id, communityId: post.communityId });
    if (!m || (m.role !== 'admin' && m.role !== 'subadmin')) {
      throw AppError.unauthorized('Only community staff can pin posts');
    }
  }
  post.isPinned = pinned;
  await post.save();
  return post;
}

export async function deletePost(pid: string, actor: IUser): Promise<void> {
  const post = await getPost(pid, actor);
  await ensureAuthorOrStaff(post, actor);
  await Comment.deleteMany({ parentType: 'post', parentId: post._id });
  await post.deleteOne();
}

export async function listPostComments(pid: string, viewer: IUser): Promise<IComment[]> {
  const post = await getPost(pid, viewer);
  return Comment.find({
    parentType: 'post',
    parentId: post._id,
    isHidden: false,
  }).sort({ createdAt: 1 });
}

export async function addPostComment(
  pid: string,
  actor: IUser,
  input: CreatePostCommentInput,
): Promise<IComment> {
  const post = await getPost(pid, actor);
  if (post.isLocked) throw AppError.invalidInput('Post is locked for comments');
  const session = await mongoose.startSession();
  let created: IComment | null = null;
  try {
    await session.withTransaction(async () => {
      const [c] = await Comment.create(
        [
          {
            parentType: 'post',
            parentId: post._id,
            communityId: post.communityId,
            authorId: actor._id,
            replyToId: input.replyToId ? new Types.ObjectId(input.replyToId) : undefined,
            body: input.body,
          },
        ],
        { session },
      );
      created = c;
      await Post.updateOne({ _id: post._id }, { $inc: { commentCount: 1 } }, { session });
    });
  } finally {
    session.endSession();
  }
  return created!;
}

async function ensureCommunityAccess(viewer: IUser, communityId: Types.ObjectId): Promise<void> {
  if (viewer.globalRole === 'superadmin') return;
  const m = await Membership.findOne({ userId: viewer._id, communityId, status: 'active' });
  if (!m) throw AppError.notFound('Post not found');
}

async function ensureAuthorOrStaff(post: IPost, actor: IUser): Promise<void> {
  if (String(post.authorId) === String(actor._id)) return;
  if (actor.globalRole === 'superadmin') return;
  const m = await Membership.findOne({ userId: actor._id, communityId: post.communityId });
  if (!m || (m.role !== 'admin' && m.role !== 'subadmin')) {
    throw AppError.unauthorized('Only the author or community staff can modify this post');
  }
}
