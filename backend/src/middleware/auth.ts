import type { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { verifyAccessToken } from '../services/token.service';

export async function verifyToken(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.get('authorization') || req.get('Authorization') || '';
    const match = /^Bearer\s+(.+)$/.exec(header);
    if (!match) {
      throw AppError.unauthenticated('Missing bearer token');
    }
    const payload = verifyAccessToken(match[1]);
    const user = await User.findById(payload.userId);
    if (!user) throw AppError.unauthenticated('User not found');
    if (user.status === 'disabled') throw AppError.unauthorized('Account disabled');
    req.user = user;
    req.isSuperAdmin = user.globalRole === 'superadmin';
    next();
  } catch (err) {
    next(err);
  }
}
