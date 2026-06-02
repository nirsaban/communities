import type { IUser } from '../models/User';
import type { IMembership } from '../models/Membership';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      // Set by loadMembership middleware on community-scoped routes.
      membership?: IMembership;
      // Convenience flag for super-admin bypass.
      isSuperAdmin?: boolean;
    }
  }
}

export {};
