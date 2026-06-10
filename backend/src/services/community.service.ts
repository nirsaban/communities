import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import mongoose, { Types } from 'mongoose';
import { Community, ICommunity } from '../models/Community';
import { Membership, CommunityRole, IMembership } from '../models/Membership';
import { Invitation, IInvitation } from '../models/Invitation';
import { User, IUser } from '../models/User';
import { AppError } from '../utils/AppError';
import { toClientRole } from '../utils/role';
import { getMailService } from './mail.service';
import {
  CreateCommunityInput,
  UpdateCommunityInput,
  OnboardCommunityInput,
  InviteMemberInput,
  ChangeMemberRoleInput,
  AcceptInvitationInput,
} from '../validators/community.validator';
import { cursorFilter, nextCursorFor, parsePagination } from '../utils/pagination';
import env from '../config/env';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface ListOpts {
  limit?: number;
  cursor?: string;
  search?: string;
  status?: 'active' | 'suspended' | 'deleted';
}

export async function listCommunitiesForSuper(opts: ListOpts): Promise<{
  items: Record<string, unknown>[];
  nextCursor: string | null;
}> {
  const { limit, cursor } = parsePagination({ limit: opts.limit, cursor: opts.cursor });
  const filter: Record<string, unknown> = { deletedAt: null };
  if (opts.status) filter.status = opts.status;
  if (opts.search) filter.name = { $regex: escapeRegex(opts.search), $options: 'i' };
  Object.assign(filter, cursorFilter(cursor));
  const rows = await Community.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1);
  const items = rows.slice(0, limit);
  const next = rows.length > limit ? nextCursorFor(items as unknown as { createdAt: Date; _id: Types.ObjectId }[]) : null;
  return { items: items.map((c) => c.toClientJSON()), nextCursor: next };
}

export async function createCommunity(
  actor: IUser,
  input: CreateCommunityInput,
): Promise<{ community: ICommunity; invitation: IInvitation }> {
  if (input.slug) {
    const existingSlug = await Community.findOne({ slug: input.slug });
    if (existingSlug) throw AppError.conflict('Slug already taken');
  }
  const community = await Community.create({
    name: input.name,
    description: input.description,
    category: input.category,
    privacy: input.privacy,
    slug: input.slug,
    createdBy: actor._id,
  });

  const invitation = await issueInvitation({
    community,
    invitedBy: actor,
    email: input.initialAdminEmail,
    role: 'admin',
  });
  community.initialAdminId = invitation.acceptedByUserId;
  await community.save();
  return { community, invitation };
}

export async function getCommunity(community: ICommunity): Promise<Record<string, unknown>> {
  return community.toClientJSON();
}

export async function updateCommunity(
  community: ICommunity,
  patch: UpdateCommunityInput,
): Promise<ICommunity> {
  if (patch.name !== undefined) community.name = patch.name;
  if (patch.description !== undefined) community.description = patch.description;
  if (patch.category !== undefined) community.category = patch.category;
  if (patch.privacy !== undefined) community.privacy = patch.privacy;
  if (patch.logoUrl !== undefined) community.logoUrl = patch.logoUrl;
  if (patch.coverUrl !== undefined) community.coverUrl = patch.coverUrl;
  if (patch.settings) {
    // Assign sub-fields individually — reassigning `community.settings` to a
    // spread of a Mongoose subdoc loses the nested `branding` subdoc and
    // triggers `Cast to Object failed for value "undefined" at path
    // "settings.branding"` on .save().
    if (patch.settings.branding) {
      community.settings.branding = {
        ...(community.settings.branding ?? {}),
        ...patch.settings.branding,
      };
    }
    if (patch.settings.welcomeMessage !== undefined) {
      community.settings.welcomeMessage = patch.settings.welcomeMessage;
    }
    if (patch.settings.rules !== undefined) {
      community.settings.rules = patch.settings.rules;
    }
  }
  await community.save();
  return community;
}

export async function suspendCommunity(community: ICommunity): Promise<ICommunity> {
  community.status = 'suspended';
  await community.save();
  return community;
}

export async function restoreCommunity(community: ICommunity): Promise<ICommunity> {
  community.status = 'active';
  await community.save();
  return community;
}

export async function softDeleteCommunity(community: ICommunity): Promise<ICommunity> {
  community.status = 'deleted';
  community.deletedAt = new Date();
  await community.save();
  return community;
}

export async function submitOnboarding(
  community: ICommunity,
  input: OnboardCommunityInput,
): Promise<ICommunity> {
  if (input.name !== undefined) community.name = input.name;
  if (input.description !== undefined) community.description = input.description;
  if (input.category !== undefined) community.category = input.category;
  if (input.privacy !== undefined) community.privacy = input.privacy;
  if (input.logoUrl !== undefined) community.logoUrl = input.logoUrl;
  if (input.coverUrl !== undefined) community.coverUrl = input.coverUrl;
  if (input.welcomeMessage !== undefined) {
    community.settings.welcomeMessage = input.welcomeMessage;
  }
  if (input.completedStep) {
    community.onboarding = community.onboarding || {
      steps: {
        basics: false,
        branding: false,
        privacy: false,
        experience: false,
        firstEvent: false,
        firstInvites: false,
      },
    };
    community.onboarding.steps[input.completedStep] = true;
    const allDone = Object.values(community.onboarding.steps).every(Boolean);
    if (allDone) {
      community.onboarding.wizardCompletedAt = new Date();
    }
  }
  await community.save();
  return community;
}

export async function listMembers(
  community: ICommunity,
  opts: ListOpts & { role?: CommunityRole },
): Promise<{ items: Record<string, unknown>[]; nextCursor: string | null }> {
  const { limit, cursor } = parsePagination({ limit: opts.limit, cursor: opts.cursor });
  const filter: Record<string, unknown> = { communityId: community._id };
  if (opts.role) filter.role = opts.role;
  Object.assign(filter, cursorFilter(cursor));
  const rows = await Membership.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .populate<{ userId: IUser }>('userId', 'email name photoUrl status');
  const items = rows.slice(0, limit);
  const next =
    rows.length > limit
      ? nextCursorFor(items as unknown as { createdAt: Date; _id: Types.ObjectId }[])
      : null;
  return {
    items: items.map((m) => {
      const user = m.userId as unknown as IUser & { _id: Types.ObjectId };
      return {
        membershipId: String(m._id),
        userId: String(user._id),
        email: user.email,
        name: user.name,
        photoUrl: user.photoUrl,
        role: toClientRole(m.role),
        status: m.status,
        joinedAt: m.joinedAt,
      };
    }),
    nextCursor: next,
  };
}

interface IssueInvitationOpts {
  community: ICommunity;
  invitedBy: IUser;
  email: string;
  role: CommunityRole;
}

export async function issueInvitation(opts: IssueInvitationOpts): Promise<IInvitation> {
  const email = opts.email.toLowerCase().trim();
  // If the user already exists and is already a member, short-circuit.
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const existingMembership = await Membership.findOne({
      userId: existingUser._id,
      communityId: opts.community._id,
    });
    if (existingMembership && existingMembership.status !== 'banned') {
      throw AppError.conflict('User is already a member of this community');
    }
  }
  const token = crypto.randomBytes(24).toString('hex');
  const invitation = await Invitation.create({
    communityId: opts.community._id,
    invitedBy: opts.invitedBy._id,
    email,
    role: opts.role,
    token,
    expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
  });

  await getMailService().send({
    to: email,
    subject: `You're invited to join ${opts.community.name}`,
    text:
      `You have been invited to join ${opts.community.name} as ${opts.role}.\n\n` +
      `Accept the invitation: ${env.WEB_BASE_URL}/invite/${token}\n` +
      `(Or use the token in the mobile app: ${token})`,
    template: 'community-invitation',
    data: {
      communityName: opts.community.name,
      role: opts.role,
      token,
      acceptUrl: `${env.WEB_BASE_URL}/invite/${token}`,
      expiresAt: invitation.expiresAt.toISOString(),
    },
  });

  return invitation;
}

export async function inviteMember(
  community: ICommunity,
  actor: IUser,
  input: InviteMemberInput,
): Promise<IInvitation> {
  return issueInvitation({
    community,
    invitedBy: actor,
    email: input.email,
    role: input.role,
  });
}

export async function changeMemberRole(
  community: ICommunity,
  uid: string,
  input: ChangeMemberRoleInput,
  actor: IUser,
): Promise<IMembership> {
  if (!Types.ObjectId.isValid(uid)) throw AppError.notFound('Member not found');
  const membership = await Membership.findOne({
    communityId: community._id,
    userId: uid,
  });
  if (!membership) throw AppError.notFound('Member not found');

  // Sub Admin restriction: cannot promote to admin/subadmin (PRD 02 §3.3).
  const actorRole = actor.globalRole === 'superadmin' ? 'admin' : await getActorRole(community, actor);
  if (actorRole === 'subadmin') {
    if (input.role === 'admin' || input.role === 'subadmin') {
      throw AppError.unauthorized('Sub Admins cannot assign admin or subadmin roles');
    }
  }
  membership.role = input.role;
  await membership.save();
  return membership;
}

export async function removeMember(
  community: ICommunity,
  uid: string,
): Promise<void> {
  if (!Types.ObjectId.isValid(uid)) throw AppError.notFound('Member not found');
  const res = await Membership.deleteOne({ communityId: community._id, userId: uid });
  if (res.deletedCount === 0) throw AppError.notFound('Member not found');
  await Community.updateOne(
    { _id: community._id, 'metrics.memberCount': { $gt: 0 } },
    { $inc: { 'metrics.memberCount': -1 } },
  );
}

export async function acceptInvitation(
  token: string,
  acceptingUser: IUser | null,
  input: AcceptInvitationInput,
): Promise<{ membership: IMembership; user: IUser; createdAccount: boolean }> {
  const invitation = await Invitation.findOne({ token });
  if (!invitation) throw AppError.notFound('Invitation not found');
  if (invitation.acceptedAt) throw AppError.conflict('Invitation already used');
  if (invitation.expiresAt < new Date()) throw AppError.invalidInput('Invitation expired');

  let user = acceptingUser;
  let createdAccount = false;

  if (!user) {
    // Anonymous accept is only allowed for brand-new accounts (inline signup).
    // If an account already exists for this email, we must NOT issue a session
    // based on email alone — that would let anyone with the invite token log
    // in as the existing user. The web client routes them through /login,
    // then re-enters /invite/<token> authenticated.
    const existing = await User.findOne({ email: invitation.email });
    if (existing) {
      throw AppError.unauthorized(
        'Sign in as ' + invitation.email + ' to accept this invitation',
      );
    }
    if (!input.password) {
      throw AppError.invalidInput('Password required to accept invitation as a new user');
    }
    const passwordHash = await bcrypt.hash(input.password, 12);
    user = await User.create({
      email: invitation.email,
      passwordHash,
      name: input.name || '',
    });
    createdAccount = true;
  } else {
    // If logged in but invitation is addressed to a different email, only allow same email.
    if (user.email !== invitation.email) {
      throw AppError.unauthorized('Invitation does not match the current account');
    }
  }

  // Atomic upsert membership.
  const session = await mongoose.startSession();
  try {
    const newMembership = await session.withTransaction(async () => {
      const existing = await Membership.findOne({
        userId: user!._id,
        communityId: invitation.communityId,
      }).session(session);
      if (existing && existing.status === 'banned') {
        throw AppError.unauthorized('You have been banned from this community');
      }
      if (existing) {
        existing.role = invitation.role;
        existing.status = 'active';
        await existing.save({ session });
        return existing;
      }
      const [created] = await Membership.create(
        [
          {
            userId: user!._id,
            communityId: invitation.communityId,
            role: invitation.role,
            status: 'active',
            invitedBy: invitation.invitedBy,
            joinedAt: new Date(),
          },
        ],
        { session },
      );
      await Community.updateOne(
        { _id: invitation.communityId },
        { $inc: { 'metrics.memberCount': 1 } },
        { session },
      );
      // If this is the initial admin acceptance, record on the community.
      if (invitation.role === 'admin') {
        await Community.updateOne(
          { _id: invitation.communityId, initialAdminId: { $exists: false } },
          { $set: { initialAdminId: user!._id } },
          { session },
        );
      }
      return created;
    });

    invitation.acceptedAt = new Date();
    invitation.acceptedByUserId = user._id;
    await invitation.save();

    return { membership: newMembership!, user, createdAccount };
  } finally {
    session.endSession();
  }
}

// Peek at an invitation without consuming it. Used by the web /invite/:token page
// to display community name, role, and whether the recipient already has an account.
export async function peekInvitation(token: string): Promise<{
  email: string;
  role: CommunityRole;
  community: { id: string; name: string; logoUrl?: string };
  expiresAt: Date;
  acceptedAt: Date | null;
  isNewUser: boolean;
}> {
  const invitation = await Invitation.findOne({ token });
  if (!invitation) throw AppError.notFound('Invitation not found');
  const community = await Community.findById(invitation.communityId);
  if (!community) throw AppError.notFound('Community not found');
  const existingUser = await User.findOne({ email: invitation.email });
  return {
    email: invitation.email,
    role: invitation.role,
    community: {
      id: String(community._id),
      name: community.name,
      logoUrl: community.logoUrl,
    },
    expiresAt: invitation.expiresAt,
    acceptedAt: invitation.acceptedAt ?? null,
    isNewUser: !existingUser,
  };
}

async function getActorRole(community: ICommunity, actor: IUser): Promise<CommunityRole | 'super'> {
  if (actor.globalRole === 'superadmin') return 'super';
  const m = await Membership.findOne({ userId: actor._id, communityId: community._id });
  if (!m) throw AppError.unauthorized('Not a member of this community');
  return m.role;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
