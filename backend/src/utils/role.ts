import { z } from 'zod';
import type { CommunityRole } from '../models/Membership';

// Per CLAUDE.md "JSON keys: camelCase (no snake_case anywhere in API payloads)" —
// the database stores 'event_manager' but the wire format must be 'eventManager'.
// These helpers translate at the API boundary.

export type WireRole = 'member' | 'eventManager' | 'subadmin' | 'admin';

export function toClientRole(role: CommunityRole): WireRole {
  return role === 'event_manager' ? 'eventManager' : role;
}

export function toServerRole(wire: WireRole): CommunityRole {
  return wire === 'eventManager' ? 'event_manager' : wire;
}

// Zod schema that accepts the wire format and outputs the DB enum.
export const wireRoleSchema = z
  .enum(['member', 'eventManager', 'subadmin', 'admin'])
  .transform(toServerRole);
