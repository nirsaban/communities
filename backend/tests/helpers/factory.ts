import bcrypt from 'bcryptjs';
import { User, IUser } from '../../src/models/User';
import { Community, ICommunity } from '../../src/models/Community';
import { Membership, IMembership, CommunityRole } from '../../src/models/Membership';
import { signAccessToken } from '../../src/services/token.service';

let counter = 0;

export async function makeUser(
  overrides: Partial<{ email: string; password: string; name: string; globalRole: 'user' | 'superadmin' }> = {},
): Promise<{ user: IUser; accessToken: string; password: string }> {
  counter += 1;
  const password = overrides.password || 'Password1!';
  const passwordHash = await bcrypt.hash(password, 4); // low cost for speed in tests
  const user = await User.create({
    email: overrides.email || `user${counter}-${Date.now()}@example.com`,
    passwordHash,
    name: overrides.name || `User ${counter}`,
    globalRole: overrides.globalRole || 'user',
  });
  return { user, accessToken: signAccessToken(user), password };
}

export async function makeSuperAdmin(): Promise<{ user: IUser; accessToken: string }> {
  const { user, accessToken } = await makeUser({ globalRole: 'superadmin' });
  return { user, accessToken };
}

export async function makeCommunity(
  overrides: Partial<{ name: string; createdBy: IUser['_id'] }> = {},
): Promise<ICommunity> {
  counter += 1;
  return Community.create({
    name: overrides.name || `Community ${counter}`,
    description: 'Test community',
    category: 'other',
    privacy: 'invite_only',
    createdBy: overrides.createdBy,
  });
}

export async function makeMember(
  user: IUser,
  community: ICommunity,
  role: CommunityRole = 'member',
): Promise<IMembership> {
  return Membership.create({
    userId: user._id,
    communityId: community._id,
    role,
    status: 'active',
    joinedAt: new Date(),
  });
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
