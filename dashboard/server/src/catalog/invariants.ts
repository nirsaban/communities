// Pulled straight from CLAUDE.md §"Architectural invariants to preserve".
// These are static — they describe what every change must respect.
export type Invariant = {
  id: string;
  title: string;
  body: string;
  enforcedBy: string[];
};

export const INVARIANTS: Invariant[] = [
  {
    id: 'tenant-isolation',
    title: 'Tenant isolation by communityId',
    body: 'Every community-scoped collection carries communityId; every compound index leads with it; the JWT contains userId only; loadMembership middleware verifies the user is a member of the target community.',
    enforcedBy: ['middleware/role.ts (loadMembership)', 'every Mongoose schema with communityId'],
  },
  {
    id: 'role-hierarchy',
    title: 'Role hierarchy (5 roles)',
    body: 'Super Admin → Community Admin → Sub Admin → Event Manager → Member. Sub Admin is blocked from financial endpoints.',
    enforcedBy: [
      'middleware/role.ts (requireGlobalRole, requireCommunityRole)',
      'blockSubAdminFromFinancial',
    ],
  },
  {
    id: 'layered-backend',
    title: 'Layered backend (routes → controllers → services → models)',
    body: 'Business logic lives in services, not controllers. Validators (Zod) are separate from controllers.',
    enforcedBy: ['folder structure under backend/src/'],
  },
  {
    id: 'stateless-jwt',
    title: 'Stateless JWT auth (15m / 30d, rotated)',
    body: 'Access token 15 min, refresh 30 days, hashed in refreshTokens collection, rotated on use, revocable.',
    enforcedBy: ['middleware/auth.ts (verifyToken)', 'models/RefreshToken.ts', 'services/token.service.ts'],
  },
  {
    id: 'versioned-routes',
    title: 'Versioned routes under /api/v1',
    body: 'Everything under /api/v1/... — no exceptions.',
    enforcedBy: ['app.ts (app.use("/api/v1", apiV1))'],
  },
  {
    id: 'response-envelope',
    title: 'Standard envelope { data, meta } / { error }',
    body: 'Success: { data, meta }. Failure: { error: { code, message, details } } — error codes are an enum.',
    enforcedBy: ['middleware/errorHandler.ts', 'utils/AppError.ts'],
  },
  {
    id: 'money-cents',
    title: 'Currency stored as integer cents',
    body: 'Never floats. Field names: amountCents, priceCents, totalRevenueCents.',
    enforcedBy: ['Payment / Subscription / Event schemas'],
  },
];
