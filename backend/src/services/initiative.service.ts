import mongoose, { Types } from 'mongoose';
import { Initiative, IInitiative } from '../models/Initiative';
import { Comment, IComment } from '../models/Comment';
import { Membership } from '../models/Membership';
import { AppError } from '../utils/AppError';
import { getNotificationService } from './notification.service';
import { cursorFilter, nextCursorFor, parsePagination } from '../utils/pagination';
import {
  CreateInitiativeInput,
  UpdateInitiativeInput,
  CreateCommentInput,
} from '../validators/initiative.validator';
import type { IUser } from '../models/User';
import type { CommunityRole } from '../models/Membership';

export interface ListInitiativesOpts {
  limit?: number;
  cursor?: string;
  status?: IInitiative['status'];
  category?: IInitiative['category'];
  filter?: 'mine' | 'supporting' | 'all';
  viewerId: Types.ObjectId;
  viewerRole: CommunityRole | 'super';
}

export async function listInitiatives(
  communityId: Types.ObjectId,
  opts: ListInitiativesOpts,
): Promise<{ items: Record<string, unknown>[]; nextCursor: string | null }> {
  const { limit, cursor } = parsePagination({ limit: opts.limit, cursor: opts.cursor });
  const filter: Record<string, unknown> = { communityId };

  // Visibility: drafts + rejected are visible only to author + admins.
  const isStaff =
    opts.viewerRole === 'admin' || opts.viewerRole === 'subadmin' || opts.viewerRole === 'super';
  if (!isStaff) {
    filter.$or = [
      { status: { $in: ['approved', 'active', 'completed'] } },
      { authorId: opts.viewerId },
    ];
  }
  if (opts.status) filter.status = opts.status;
  if (opts.category) filter.category = opts.category;
  if (opts.filter === 'mine') filter.authorId = opts.viewerId;
  if (opts.filter === 'supporting') filter.supporters = opts.viewerId;
  Object.assign(filter, cursorFilter(cursor));

  const rows = await Initiative.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1);
  const items = rows.slice(0, limit);
  const next =
    rows.length > limit
      ? nextCursorFor(items as unknown as { createdAt: Date; _id: Types.ObjectId }[])
      : null;
  return {
    items: items.map((r) => r.toClientJSON(String(opts.viewerId))),
    nextCursor: next,
  };
}

export async function getInitiative(iid: string, viewer: IUser): Promise<IInitiative> {
  if (!Types.ObjectId.isValid(iid)) throw AppError.notFound('Initiative not found');
  const i = await Initiative.findById(iid);
  if (!i) throw AppError.notFound('Initiative not found');
  await ensureCommunityAccess(viewer, i.communityId);
  // Visibility for drafts / rejected: only author or staff.
  if (['draft', 'rejected', 'submitted', 'under_review'].includes(i.status)) {
    if (String(i.authorId) !== String(viewer._id)) {
      const m = await Membership.findOne({ userId: viewer._id, communityId: i.communityId });
      const role = m?.role;
      const isStaff = viewer.globalRole === 'superadmin' || role === 'admin' || role === 'subadmin';
      if (!isStaff) throw AppError.notFound('Initiative not found');
    }
  }
  return i;
}

export async function createInitiative(
  community: { _id: Types.ObjectId },
  author: IUser,
  input: CreateInitiativeInput,
): Promise<IInitiative> {
  return Initiative.create({
    ...input,
    communityId: community._id,
    authorId: author._id,
    status: 'draft',
  });
}

export async function updateInitiative(
  iid: string,
  actor: IUser,
  patch: UpdateInitiativeInput,
): Promise<IInitiative> {
  const i = await getInitiative(iid, actor);
  await ensureAuthorOrStaff(i, actor);
  // Once approved, only admins can rename / edit.
  if (i.status === 'approved' || i.status === 'active' || i.status === 'completed') {
    await ensureStaff(actor, i.communityId);
  }
  Object.assign(i, patch);
  await i.save();
  return i;
}

export async function deleteInitiative(iid: string, actor: IUser): Promise<void> {
  const i = await getInitiative(iid, actor);
  await ensureAuthorOrStaff(i, actor);
  await Comment.deleteMany({ parentType: 'initiative', parentId: i._id });
  await i.deleteOne();
}

export async function submitInitiative(iid: string, actor: IUser): Promise<IInitiative> {
  const i = await getInitiative(iid, actor);
  if (String(i.authorId) !== String(actor._id)) {
    throw AppError.unauthorized('Only the author can submit an initiative');
  }
  if (i.status !== 'draft') throw AppError.invalidInput(`Cannot submit from status ${i.status}`);
  i.status = 'submitted';
  await i.save();
  return i;
}

export async function approveInitiative(
  iid: string,
  actor: IUser,
): Promise<IInitiative> {
  const i = await getInitiative(iid, actor);
  await ensureStaff(actor, i.communityId);
  if (i.status === 'approved' || i.status === 'active') return i;
  if (!['submitted', 'under_review', 'rejected'].includes(i.status)) {
    throw AppError.invalidInput(`Cannot approve from status ${i.status}`);
  }
  i.status = 'approved';
  i.reviewedBy = actor._id;
  i.reviewedAt = new Date();
  i.rejectionReason = undefined;
  await i.save();
  await getNotificationService().send({
    userId: i.authorId,
    communityId: i.communityId,
    type: 'initiative.approved',
    title: 'Your initiative was approved',
    body: i.title,
    payload: { initiativeId: String(i._id) },
  });
  return i;
}

export async function rejectInitiative(
  iid: string,
  actor: IUser,
  reason?: string,
): Promise<IInitiative> {
  const i = await getInitiative(iid, actor);
  await ensureStaff(actor, i.communityId);
  if (i.status === 'rejected') return i;
  if (!['submitted', 'under_review', 'approved'].includes(i.status)) {
    throw AppError.invalidInput(`Cannot reject from status ${i.status}`);
  }
  i.status = 'rejected';
  i.reviewedBy = actor._id;
  i.reviewedAt = new Date();
  i.rejectionReason = reason;
  await i.save();
  await getNotificationService().send({
    userId: i.authorId,
    communityId: i.communityId,
    type: 'initiative.rejected',
    title: 'Your initiative was declined',
    body: reason || i.title,
    payload: { initiativeId: String(i._id), reason },
  });
  return i;
}

export async function addSupport(iid: string, actor: IUser): Promise<IInitiative> {
  const i = await getInitiative(iid, actor);
  if (!['approved', 'active'].includes(i.status)) {
    throw AppError.invalidInput('Initiative is not open for support');
  }
  if (i.supporters.some((s) => String(s) === String(actor._id))) return i;
  i.supporters.push(actor._id);
  i.supporterCount = i.supporters.length;
  // Promote to 'active' on first supporter.
  if (i.status === 'approved') i.status = 'active';
  await i.save();
  // Inbox-only notification to author (per PRD 15: initiative.new_supporter is inbox).
  await getNotificationService().send({
    userId: i.authorId,
    communityId: i.communityId,
    type: 'initiative.new_supporter',
    title: 'New supporter',
    body: i.title,
    payload: { initiativeId: String(i._id), supporterId: String(actor._id) },
  });
  return i;
}

export async function removeSupport(iid: string, actor: IUser): Promise<IInitiative> {
  const i = await getInitiative(iid, actor);
  const before = i.supporters.length;
  i.supporters = i.supporters.filter((s) => String(s) !== String(actor._id));
  if (i.supporters.length === before) return i;
  i.supporterCount = i.supporters.length;
  await i.save();
  return i;
}

export async function addContributor(
  iid: string,
  actor: IUser,
  contributorUserId: string,
): Promise<IInitiative> {
  const i = await getInitiative(iid, actor);
  if (String(i.authorId) !== String(actor._id) && actor.globalRole !== 'superadmin') {
    const m = await Membership.findOne({ userId: actor._id, communityId: i.communityId });
    if (!m || (m.role !== 'admin' && m.role !== 'subadmin')) {
      throw AppError.unauthorized('Only the author or community staff can add contributors');
    }
  }
  if (!Types.ObjectId.isValid(contributorUserId)) {
    throw AppError.invalidInput('Invalid userId');
  }
  const uid = new Types.ObjectId(contributorUserId);
  // Contributors must be members of the community.
  const member = await Membership.findOne({
    userId: uid,
    communityId: i.communityId,
    status: 'active',
  });
  if (!member) throw AppError.invalidInput('User is not a member of this community');
  if (!i.contributors.some((c) => String(c) === contributorUserId)) {
    i.contributors.push(uid);
    await i.save();
  }
  return i;
}

export async function completeInitiative(
  iid: string,
  actor: IUser,
  summary?: string,
): Promise<IInitiative> {
  const i = await getInitiative(iid, actor);
  if (String(i.authorId) !== String(actor._id)) {
    await ensureStaff(actor, i.communityId);
  }
  if (i.status === 'completed') return i;
  if (!['approved', 'active'].includes(i.status)) {
    throw AppError.invalidInput(`Cannot complete from status ${i.status}`);
  }
  i.status = 'completed';
  i.completedAt = new Date();
  if (summary) i.completionSummary = summary;
  await i.save();
  return i;
}

export async function listComments(
  iid: string,
  viewer: IUser,
): Promise<IComment[]> {
  const i = await getInitiative(iid, viewer);
  return Comment.find({
    parentType: 'initiative',
    parentId: i._id,
    isHidden: false,
  }).sort({ createdAt: 1 });
}

export async function addComment(
  iid: string,
  actor: IUser,
  input: CreateCommentInput,
): Promise<IComment> {
  const i = await getInitiative(iid, actor);
  if (!['approved', 'active', 'completed'].includes(i.status)) {
    throw AppError.invalidInput('Comments are not open on this initiative');
  }
  const session = await mongoose.startSession();
  let createdComment: IComment | null = null;
  try {
    await session.withTransaction(async () => {
      const [created] = await Comment.create(
        [
          {
            parentType: 'initiative',
            parentId: i._id,
            communityId: i.communityId,
            authorId: actor._id,
            replyToId: input.replyToId ? new Types.ObjectId(input.replyToId) : undefined,
            body: input.body,
          },
        ],
        { session },
      );
      createdComment = created;
      await Initiative.updateOne(
        { _id: i._id },
        { $inc: { commentCount: 1 } },
        { session },
      );
    });
  } finally {
    session.endSession();
  }
  return createdComment!;
}

// ---- helpers ----

async function ensureCommunityAccess(viewer: IUser, communityId: Types.ObjectId): Promise<void> {
  if (viewer.globalRole === 'superadmin') return;
  const m = await Membership.findOne({
    userId: viewer._id,
    communityId,
    status: 'active',
  });
  if (!m) throw AppError.notFound('Initiative not found');
}

async function ensureAuthorOrStaff(i: IInitiative, actor: IUser): Promise<void> {
  if (String(i.authorId) === String(actor._id)) return;
  await ensureStaff(actor, i.communityId);
}

async function ensureStaff(actor: IUser, communityId: Types.ObjectId): Promise<void> {
  if (actor.globalRole === 'superadmin') return;
  const m = await Membership.findOne({ userId: actor._id, communityId });
  if (!m || (m.role !== 'admin' && m.role !== 'subadmin')) {
    throw AppError.unauthorized('Community staff role required');
  }
}
