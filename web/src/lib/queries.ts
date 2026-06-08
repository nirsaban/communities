import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

// ===== Types — match the backend controller response shape exactly. =====

export type SubscriptionPlans = {
  enabled: boolean;
  monthlyPriceCents?: number;
  annualPriceCents?: number;
  currency: string;
  perks: string[];
};

export type CommunityCard = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category?: string;
  logoUrl?: string;
  coverUrl?: string;
  privacy: 'public' | 'application' | 'private' | 'invite_only';
  status?: 'active' | 'suspended' | 'deleted';
  memberCount: number;
  eventCount: number;
  subscriptionPlans?: SubscriptionPlans;
};

export type MembershipRole = 'admin' | 'subadmin' | 'eventManager' | 'member';
export type MyCommunity = {
  community: CommunityCard & { onboarding?: { wizardCompletedAt: string | null } };
  membership: { id: string; role: MembershipRole; status: 'active' | 'pending'; joinedAt: string };
};

// Raw event coming back from the API — we normalize before passing into UI.
// Backend toClientJSON uses coverImageUrl. Detail endpoint adds viewer: { isAttending, isManager }.
type RawEvent = {
  id?: string;
  _id?: string;
  communityId: string;
  title: string;
  description?: string;
  startAt: string;
  endAt?: string;
  location?: { type?: string; address?: string; name?: string };
  capacity?: number;
  pricing?: {
    type: 'free' | 'paid' | 'subscription_only' | 'subscription';
    priceCents?: number;
    currency?: string;
    subscriptionIncluded?: boolean;
  };
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  metrics?: { rsvpCount?: number; paidCount?: number; waitlistCount?: number; totalRevenueCents?: number };
  viewer?: { isAttending?: boolean; isManager?: boolean };
  coverImageUrl?: string;
  coverUrl?: string;
};

export type EventCard = {
  id: string;
  communityId: string;
  title: string;
  description?: string;
  startAt: string;
  endAt?: string;
  location?: { name?: string; address?: string };
  coverUrl?: string;
  priceCents: number;
  pricingType?: 'free' | 'paid' | 'subscription_only' | 'subscription';
  subscriptionIncluded?: boolean;
  capacity?: number;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  rsvpStats: { going: number; waitlist: number; remaining?: number };
  myRsvp?: { status: 'going' | 'waitlist' | 'cancelled' } | null;
  isManager?: boolean;
};

function normalizeEvent(raw: RawEvent): EventCard {
  const going = raw.metrics?.rsvpCount ?? 0;
  const waitlist = raw.metrics?.waitlistCount ?? 0;
  const remaining = raw.capacity != null ? Math.max(0, raw.capacity - going) : undefined;
  const myRsvp = raw.viewer?.isAttending ? { status: 'going' as const } : null;
  return {
    id: String(raw.id ?? raw._id),
    communityId: raw.communityId,
    title: raw.title,
    description: raw.description,
    startAt: raw.startAt,
    endAt: raw.endAt,
    coverUrl: raw.coverImageUrl ?? raw.coverUrl,
    location: raw.location
      ? { name: raw.location.name ?? raw.location.address, address: raw.location.address }
      : undefined,
    priceCents: raw.pricing?.priceCents ?? 0,
    pricingType: raw.pricing?.type,
    subscriptionIncluded: raw.pricing?.subscriptionIncluded ?? false,
    capacity: raw.capacity,
    status: raw.status,
    rsvpStats: { going, waitlist, remaining },
    myRsvp,
    isManager: raw.viewer?.isManager,
  };
}

export type MyRsvp = {
  id: string;
  status: 'going' | 'waitlist' | 'cancelled';
  event: EventCard;
  createdAt: string;
};

// ===== Discovery =====

export function useDiscoverCommunities(q?: string) {
  return useQuery({
    queryKey: ['discovery', q ?? ''],
    queryFn: async (): Promise<CommunityCard[]> => {
      const r = await api.get('/discovery/communities', { params: q ? { q } : undefined });
      return r.data?.data ?? [];
    },
  });
}

export function useJoinCommunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cid: string) => api.post(`/discovery/communities/${cid}/join`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['discovery'] });
      qc.invalidateQueries({ queryKey: ['my-communities'] });
    },
  });
}

export function useRequestJoin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cid: string) => api.post(`/discovery/communities/${cid}/request`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['discovery'] }),
  });
}

// ===== Me =====

export function useMyCommunities() {
  return useQuery({
    queryKey: ['my-communities'],
    queryFn: async (): Promise<MyCommunity[]> => {
      const r = await api.get('/me/communities');
      return r.data?.data ?? [];
    },
  });
}

export function useMyRsvps() {
  return useQuery({
    queryKey: ['my-rsvps'],
    queryFn: async (): Promise<MyRsvp[]> => {
      const r = await api.get('/me/rsvps');
      const rows: Array<{ id: string; status: MyRsvp['status']; event: RawEvent; createdAt: string }> =
        r.data?.data ?? [];
      return rows.map((row) => ({
        id: row.id,
        status: row.status,
        createdAt: row.createdAt,
        event: normalizeEvent(row.event),
      }));
    },
  });
}

// ===== Communities =====

export function useCommunity(cid: string | undefined) {
  return useQuery({
    queryKey: ['community', cid],
    enabled: !!cid,
    queryFn: async (): Promise<CommunityCard> => {
      const r = await api.get(`/communities/${cid}`);
      const c = r.data?.data ?? {};
      return {
        id: String(c.id ?? c._id),
        name: c.name,
        slug: c.slug,
        description: c.description,
        category: c.category,
        logoUrl: c.logoUrl,
        coverUrl: c.coverUrl,
        privacy: c.privacy,
        status: c.status,
        memberCount: c.metrics?.memberCount ?? 0,
        eventCount: c.metrics?.eventCount ?? 0,
        subscriptionPlans: c.subscriptionPlans
          ? {
              enabled: !!c.subscriptionPlans.enabled,
              monthlyPriceCents: c.subscriptionPlans.monthlyPriceCents,
              annualPriceCents: c.subscriptionPlans.annualPriceCents,
              currency: c.subscriptionPlans.currency ?? 'ILS',
              perks: c.subscriptionPlans.perks ?? [],
            }
          : undefined,
      };
    },
  });
}

export function useCommunityEvents(cid: string | undefined, status?: string) {
  return useQuery({
    queryKey: ['community-events', cid, status ?? 'all'],
    enabled: !!cid,
    queryFn: async (): Promise<EventCard[]> => {
      const r = await api.get(`/communities/${cid}/events`, {
        params: status ? { status } : undefined,
      });
      const rows: RawEvent[] = r.data?.data ?? [];
      return rows.map(normalizeEvent);
    },
  });
}

// ===== Events =====

export function useEvent(eid: string | undefined) {
  return useQuery({
    queryKey: ['event', eid],
    enabled: !!eid,
    queryFn: async (): Promise<EventCard> => {
      const r = await api.get(`/events/${eid}`);
      return normalizeEvent(r.data?.data ?? {});
    },
  });
}

export function useRsvp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eid: string) => api.post(`/events/${eid}/rsvp`, { status: 'going' }),
    onSuccess: (_, eid) => {
      qc.invalidateQueries({ queryKey: ['event', eid] });
      qc.invalidateQueries({ queryKey: ['my-rsvps'] });
      qc.invalidateQueries({ queryKey: ['community-events'] });
    },
  });
}

export function useCancelRsvp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eid: string) => api.delete(`/events/${eid}/rsvp`),
    onSuccess: (_, eid) => {
      qc.invalidateQueries({ queryKey: ['event', eid] });
      qc.invalidateQueries({ queryKey: ['my-rsvps'] });
      qc.invalidateQueries({ queryKey: ['community-events'] });
    },
  });
}

// ===== Event CRUD (admin / sub-admin / superadmin) =====

export type EventDraft = {
  title: string;
  description?: string;
  category?: string;
  coverImageUrl?: string;
  startAt: string;
  endAt: string;
  timezone?: string;
  location?: { type: 'physical' | 'online' | 'hybrid'; address?: string; url?: string };
  capacity?: number | null;
  pricing?: {
    type: 'free' | 'paid' | 'subscription_only' | 'external';
    priceCents?: number;
    currency?: string;
    externalUrl?: string;
  };
  visibility?: 'community' | 'invite';
  status?: 'draft' | 'published';
};

export function useCreateEvent(cid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: EventDraft) => {
      const r = await api.post(`/communities/${cid}/events`, body);
      return r.data?.data as Record<string, unknown>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community-events', cid] });
      qc.invalidateQueries({ queryKey: ['my-managed-events'] });
    },
  });
}

export function useUpdateEvent(eid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<EventDraft>) => {
      const r = await api.patch(`/events/${eid}`, body);
      return r.data?.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event', eid] });
      qc.invalidateQueries({ queryKey: ['community-events'] });
      qc.invalidateQueries({ queryKey: ['my-managed-events'] });
    },
  });
}

export function useCancelEvent(eid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reason?: string) => api.post(`/events/${eid}/cancel`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event', eid] });
      qc.invalidateQueries({ queryKey: ['community-events'] });
    },
  });
}

export function useAssignManager(eid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => api.post(`/events/${eid}/managers`, { userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event', eid] });
      qc.invalidateQueries({ queryKey: ['my-managed-events'] });
    },
  });
}

export function usePublishRecap(eid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { body: string; photoUrls?: string[]; notify?: boolean }) => {
      const r = await api.post(`/events/${eid}/recap`, body);
      return r.data?.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event', eid] });
    },
  });
}

export function useRemoveManager(eid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => api.delete(`/events/${eid}/managers/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event', eid] }),
  });
}

// ===== Checkout (paid events) =====

export type CheckoutResponse = { sessionUrl: string; paymentId: string };

export function useCheckout() {
  return useMutation({
    mutationFn: async (eid: string): Promise<CheckoutResponse> => {
      const r = await api.post(`/events/${eid}/checkout`);
      return r.data?.data;
    },
  });
}

// ===== Materials =====
// Backend uses type (not kind), fileUrl (not url), fileSizeBytes (not sizeBytes).
// Enum: pdf | video | audio | image | slides | other.

export type MaterialType = 'pdf' | 'video' | 'audio' | 'image' | 'slides' | 'other';

export type Material = {
  id: string;
  type: MaterialType;
  title: string;
  description?: string;
  fileUrl: string;
  fileSizeBytes?: number;
  durationSeconds?: number;
  createdAt: string;
};

export function useEventMaterials(eid: string | undefined) {
  return useQuery({
    queryKey: ['event-materials', eid],
    enabled: !!eid,
    queryFn: async (): Promise<Material[]> => {
      const r = await api.get(`/events/${eid}/materials`);
      const rows: Array<Record<string, unknown>> = r.data?.data ?? [];
      return rows.map((m) => ({
        id: String(m.id ?? m._id),
        type: (m.type as MaterialType) ?? 'other',
        title: String(m.title ?? 'Untitled'),
        description: m.description as string | undefined,
        fileUrl: String(m.fileUrl ?? ''),
        fileSizeBytes: m.fileSizeBytes as number | undefined,
        durationSeconds: m.durationSeconds as number | undefined,
        createdAt: String(m.createdAt ?? ''),
      }));
    },
  });
}

export function useUploadMaterial(eid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { title: string; type: MaterialType; description?: string; file: File }) => {
      const form = new FormData();
      form.append('title', body.title);
      form.append('type', body.type);
      if (body.description) form.append('description', body.description);
      form.append('file', body.file);
      const r = await api.post(`/events/${eid}/materials`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return r.data?.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event-materials', eid] }),
  });
}

// ===== Q&A =====

// Q&A model uses: upvoted (bool), pinned (bool), resolved (bool), answer.body, answer.answeredByUserId.
// The list endpoint does not join author/answerer names — we display generic Hebrew labels.

export type QAItem = {
  id: string;
  question: string;
  upvoteCount: number;
  upvoted: boolean;
  pinned: boolean;
  resolved: boolean;
  answer?: { body: string; answeredByUserId: string; answeredAt: string };
  authorId: string;
  createdAt: string;
};

export function useEventQA(eid: string | undefined) {
  return useQuery({
    queryKey: ['event-qa', eid],
    enabled: !!eid,
    queryFn: async (): Promise<QAItem[]> => {
      const r = await api.get(`/events/${eid}/qa`);
      const rows: Array<Record<string, unknown>> = r.data?.data ?? [];
      return rows.map((q) => {
        const answer = q.answer as Record<string, unknown> | undefined;
        return {
          id: String(q.id ?? q._id),
          question: String(q.question ?? ''),
          upvoteCount: Number(q.upvoteCount ?? 0),
          upvoted: Boolean(q.upvoted ?? false),
          pinned: Boolean(q.pinned ?? false),
          resolved: Boolean(q.resolved ?? false),
          answer: answer
            ? {
                body: String(answer.body ?? ''),
                answeredByUserId: String(answer.answeredByUserId ?? ''),
                answeredAt: String(answer.answeredAt ?? ''),
              }
            : undefined,
          authorId: String(q.userId ?? ''),
          createdAt: String(q.createdAt ?? ''),
        };
      });
    },
  });
}

export function useAskQuestion(eid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (question: string) => api.post(`/events/${eid}/qa`, { question }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event-qa', eid] }),
  });
}

export function useUpvoteQA(eid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (qid: string) => api.post(`/events/${eid}/qa/${qid}/upvote`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event-qa', eid] }),
  });
}

// Organizer-side Q&A actions.
export function useAnswerQA(eid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ qid, body }: { qid: string; body: string }) =>
      api.post(`/events/${eid}/qa/${qid}/answer`, { body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event-qa', eid] }),
  });
}

export function usePinQA(eid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (qid: string) => api.post(`/events/${eid}/qa/${qid}/pin`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event-qa', eid] }),
  });
}

export function useResolveQA(eid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (qid: string) => api.post(`/events/${eid}/qa/${qid}/resolve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event-qa', eid] }),
  });
}

// ===== Posts =====

export type Post = {
  id: string;
  communityId: string;
  body: string;
  author: { id: string; name: string };
  pinned: boolean;
  likeCount: number;
  commentCount: number;
  createdAt: string;
};

function normalizePost(p: Record<string, unknown>): Post {
  const author = (p.author as Record<string, unknown>) ?? {};
  const reactions = (p.reactions as Record<string, number>) ?? {};
  return {
    id: String(p.id ?? p._id),
    communityId: String(p.communityId ?? ''),
    body: String(p.body ?? p.content ?? ''),
    author: { id: String(author.id ?? author._id ?? ''), name: String(author.name ?? 'Member') },
    pinned: Boolean(p.pinned ?? false),
    likeCount: Number(p.likeCount ?? reactions.like ?? 0),
    commentCount: Number(p.commentCount ?? 0),
    createdAt: String(p.createdAt ?? ''),
  };
}

export function useCommunityPosts(cid: string | undefined) {
  return useQuery({
    queryKey: ['community-posts', cid],
    enabled: !!cid,
    queryFn: async (): Promise<Post[]> => {
      const r = await api.get(`/communities/${cid}/posts`);
      return (r.data?.data ?? []).map(normalizePost);
    },
  });
}

export function usePost(pid: string | undefined) {
  return useQuery({
    queryKey: ['post', pid],
    enabled: !!pid,
    queryFn: async (): Promise<Post> => {
      const r = await api.get(`/posts/${pid}`);
      return normalizePost(r.data?.data ?? {});
    },
  });
}

export function useCreatePost(cid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => api.post(`/communities/${cid}/posts`, { body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community-posts', cid] }),
  });
}

export type PostComment = {
  id: string;
  body: string;
  author: { id: string; name: string };
  createdAt: string;
};

export function usePostComments(pid: string | undefined) {
  return useQuery({
    queryKey: ['post-comments', pid],
    enabled: !!pid,
    queryFn: async (): Promise<PostComment[]> => {
      const r = await api.get(`/posts/${pid}/comments`);
      return r.data?.data ?? [];
    },
  });
}

export function useCommentOnPost(pid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => api.post(`/posts/${pid}/comments`, { body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['post-comments', pid] }),
  });
}

// ===== Initiatives =====

export type Initiative = {
  id: string;
  communityId: string;
  title: string;
  description: string;
  category?: string;
  status: 'draft' | 'submitted' | 'active' | 'completed' | 'rejected';
  supporterCount: number;
  iSupport: boolean;
  goal?: number;
  progress?: number;
  commentCount: number;
  author: { id: string; name: string };
  coverUrl?: string;
  createdAt: string;
};

function normalizeInitiative(i: Record<string, unknown>): Initiative {
  const author = (i.author as Record<string, unknown>) ?? {};
  const metrics = (i.metrics as Record<string, unknown>) ?? {};
  return {
    id: String(i.id ?? i._id),
    communityId: String(i.communityId ?? ''),
    title: String(i.title ?? ''),
    description: String(i.description ?? ''),
    category: i.category as string | undefined,
    status: (i.status as Initiative['status']) ?? 'submitted',
    supporterCount: Number(i.supporterCount ?? metrics.supporterCount ?? 0),
    iSupport: Boolean(i.iSupport ?? false),
    goal: i.goal as number | undefined,
    progress: i.progress as number | undefined,
    commentCount: Number(i.commentCount ?? metrics.commentCount ?? 0),
    author: { id: String(author.id ?? author._id ?? ''), name: String(author.name ?? 'Member') },
    coverUrl: i.coverUrl as string | undefined,
    createdAt: String(i.createdAt ?? ''),
  };
}

export function useCommunityInitiatives(cid: string | undefined) {
  return useQuery({
    queryKey: ['community-initiatives', cid],
    enabled: !!cid,
    queryFn: async (): Promise<Initiative[]> => {
      const r = await api.get(`/communities/${cid}/initiatives`);
      return (r.data?.data ?? []).map(normalizeInitiative);
    },
  });
}

export function useInitiative(iid: string | undefined) {
  return useQuery({
    queryKey: ['initiative', iid],
    enabled: !!iid,
    queryFn: async (): Promise<Initiative> => {
      const r = await api.get(`/initiatives/${iid}`);
      return normalizeInitiative(r.data?.data ?? {});
    },
  });
}

export function useCreateInitiative(cid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { title: string; description: string; category?: string }) =>
      api.post(`/communities/${cid}/initiatives`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community-initiatives', cid] }),
  });
}

export function useSupportInitiative() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ iid, support }: { iid: string; support: boolean }) =>
      support ? api.post(`/initiatives/${iid}/support`) : api.delete(`/initiatives/${iid}/support`),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['initiative', vars.iid] });
      qc.invalidateQueries({ queryKey: ['community-initiatives'] });
    },
  });
}

export function useInitiativeComments(iid: string | undefined) {
  return useQuery({
    queryKey: ['initiative-comments', iid],
    enabled: !!iid,
    queryFn: async (): Promise<PostComment[]> => {
      const r = await api.get(`/initiatives/${iid}/comments`);
      return r.data?.data ?? [];
    },
  });
}

export function useCommentOnInitiative(iid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => api.post(`/initiatives/${iid}/comments`, { body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['initiative-comments', iid] }),
  });
}

// ===== Notifications =====

export type Notification = {
  id: string;
  type: string;
  title: string;
  body?: string;
  read: boolean;
  createdAt: string;
};

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async (): Promise<Notification[]> => {
      const r = await api.get('/me/notifications');
      return (r.data?.data ?? []).map((n: Record<string, unknown>) => ({
        id: String(n.id ?? n._id),
        type: String(n.type ?? 'info'),
        title: String(n.title ?? ''),
        body: n.body as string | undefined,
        read: Boolean(n.read ?? n.readAt != null),
        createdAt: String(n.createdAt ?? ''),
      }));
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nid: string) => api.patch(`/me/notifications/${nid}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => api.patch('/me/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

// Backend pref keys: events | rsvp | initiatives | posts | system.
// Response/request shape is { preferences: { [key]: { push, email } } }.
export type NotificationPrefKey = 'events' | 'rsvp' | 'initiatives' | 'posts' | 'system';
export type NotificationPrefs = Partial<Record<NotificationPrefKey, { push?: boolean; email?: boolean }>>;

export function useNotificationPrefs() {
  return useQuery({
    queryKey: ['notif-prefs'],
    queryFn: async (): Promise<NotificationPrefs> => {
      const r = await api.get('/me/notification-preferences');
      return (r.data?.data?.preferences ?? {}) as NotificationPrefs;
    },
  });
}

export function useUpdateNotificationPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prefs: NotificationPrefs) =>
      api.patch('/me/notification-preferences', { preferences: prefs }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notif-prefs'] }),
  });
}

export function useMyManagedEvents(bucket: 'upcoming' | 'past' = 'upcoming') {
  return useQuery({
    queryKey: ['my-managed-events', bucket],
    queryFn: async (): Promise<EventCard[]> => {
      const r = await api.get('/me/managed-events', { params: { bucket } });
      return (r.data?.data ?? []).map(normalizeEvent);
    },
  });
}

// ===== Event Manager — attendees, check-in, broadcast =====

export type Attendee = {
  id: string;
  userId: string;
  name: string;
  email: string;
  photoUrl?: string;
  status: 'going' | 'waitlist' | 'cancelled' | 'maybe' | 'not_going';
  attendedAt: string | null;
  waitlistPosition?: number;
  createdAt: string;
};

export function useEventAttendees(eid: string | undefined) {
  return useQuery({
    queryKey: ['event-attendees', eid],
    enabled: !!eid,
    queryFn: async (): Promise<Attendee[]> => {
      const r = await api.get(`/events/${eid}/rsvps`);
      const rows: Array<Record<string, unknown>> = r.data?.data ?? [];
      return rows.map((row) => ({
        id: String(row.id ?? row._id),
        userId: String(row.userId ?? ''),
        name: String(row.name ?? 'Member'),
        email: String(row.email ?? ''),
        photoUrl: (row.photoUrl as string | undefined) ?? undefined,
        status: (row.status as Attendee['status']) ?? 'going',
        attendedAt: (row.attendedAt as string | null | undefined) ?? null,
        waitlistPosition: row.waitlistPosition as number | undefined,
        createdAt: String(row.createdAt ?? ''),
      }));
    },
  });
}

export function useCheckInRsvp(eid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rid: string) => api.post(`/events/${eid}/rsvps/${rid}/check-in`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event-attendees', eid] }),
  });
}

export function useCheckInAll(eid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => api.post(`/events/${eid}/check-in-all`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event-attendees', eid] }),
  });
}

export type BroadcastChannel = 'push' | 'inApp' | 'email';

export function useEventBroadcast(eid: string | undefined) {
  return useMutation({
    mutationFn: async (input: {
      message: string;
      channels?: BroadcastChannel[];
      scheduleAt?: string;
    }) => {
      const r = await api.post(`/events/${eid}/broadcast`, input);
      return r.data?.data as { delivered: number; channels: string[]; scheduledFor: string | null };
    },
  });
}

export type ProfileVisibility = 'public' | 'members_only' | 'private';

export type PrivacyPrefs = {
  profileVisibility: ProfileVisibility;
  showAttendedEvents: boolean;
  showInitiativesSupported: boolean;
  allowMentions: boolean;
};

export function usePrivacy() {
  return useQuery({
    queryKey: ['me-privacy'],
    queryFn: async (): Promise<PrivacyPrefs> => {
      const r = await api.get('/me/privacy');
      return r.data?.data?.privacy as PrivacyPrefs;
    },
  });
}

export function useUpdatePrivacy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<PrivacyPrefs>): Promise<PrivacyPrefs> => {
      const r = await api.patch('/me/privacy', patch);
      return r.data?.data?.privacy as PrivacyPrefs;
    },
    onSuccess: (data) => qc.setQueryData(['me-privacy'], data),
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: async (input: { email: string; code: string }) => {
      const r = await api.post('/auth/verify', input);
      return r.data?.data as { user: { id: string; email: string; emailVerifiedAt?: string } };
    },
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: async (email: string) => api.post('/auth/verify/resend', { email }),
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      patch: Partial<{ name: string; bio: string; photoUrl: string; interests: string[] }>,
    ) => api.patch('/auth/me', patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
}

export function useDeleteMe() {
  return useMutation({
    mutationFn: async () => api.delete('/auth/me'),
  });
}

// ===== Admin: members + applications + finances =====

export type MemberRow = {
  id: string;
  user: { id: string; name: string; email: string };
  role: MembershipRole;
  status: 'active' | 'pending' | 'removed';
  joinedAt: string;
};

export function useCommunityMembers(cid: string | undefined) {
  return useQuery({
    queryKey: ['members', cid],
    enabled: !!cid,
    queryFn: async (): Promise<MemberRow[]> => {
      const r = await api.get(`/communities/${cid}/members`);
      return (r.data?.data ?? []).map((m: Record<string, unknown>) => ({
        id: String(m.id ?? m._id),
        user: m.user as MemberRow['user'],
        role: m.role as MembershipRole,
        status: (m.status as MemberRow['status']) ?? 'active',
        joinedAt: String(m.joinedAt ?? ''),
      }));
    },
  });
}

export function useInviteMember(cid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { email: string; role?: MembershipRole }) =>
      api.post(`/communities/${cid}/members/invite`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members', cid] }),
  });
}

export function useChangeMemberRole(cid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ uid, role }: { uid: string; role: MembershipRole }) =>
      api.patch(`/communities/${cid}/members/${uid}`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members', cid] }),
  });
}

export function useRemoveMember(cid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uid: string) =>
      api.delete(`/communities/${cid}/members/${uid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members', cid] }),
  });
}

// ===== Admin overview + analytics + moderation =====

export type AdminOverview = {
  kpis: { members: number; upcoming: number; pending: number; flagged: number };
  revenueAvailable: boolean;
};

export function useAdminOverview(cid: string | undefined) {
  return useQuery({
    queryKey: ['admin-overview', cid],
    enabled: !!cid,
    queryFn: async (): Promise<AdminOverview> => {
      const r = await api.get(`/communities/${cid}/admin/overview`);
      return r.data?.data as AdminOverview;
    },
  });
}

export type PendingMember = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  photoUrl?: string | null;
  bio?: string | null;
  requestedAt: string;
};

export function usePendingMembers(cid: string | undefined) {
  return useQuery({
    queryKey: ['pending-members', cid],
    enabled: !!cid,
    queryFn: async (): Promise<PendingMember[]> => {
      const r = await api.get(`/communities/${cid}/admin/members/pending`);
      return (r.data?.data ?? []) as PendingMember[];
    },
  });
}

export function useApproveMember(cid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uid: string) =>
      api.post(`/communities/${cid}/admin/members/${uid}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-members', cid] });
      qc.invalidateQueries({ queryKey: ['members', cid] });
      qc.invalidateQueries({ queryKey: ['admin-overview', cid] });
    },
  });
}

export function useRejectMember(cid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uid: string) =>
      api.post(`/communities/${cid}/admin/members/${uid}/reject`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-members', cid] });
      qc.invalidateQueries({ queryKey: ['admin-overview', cid] });
    },
  });
}

export type ModerationPost = {
  id: string;
  authorId: string;
  author?: { id: string; name: string; email?: string | null; photoUrl?: string | null } | null;
  type: string;
  title?: string;
  body: string;
  hidden: boolean;
  createdAt: string;
};

export function useModerationQueue(cid: string | undefined) {
  return useQuery({
    queryKey: ['moderation-queue', cid],
    enabled: !!cid,
    queryFn: async (): Promise<ModerationPost[]> => {
      const r = await api.get(`/communities/${cid}/admin/moderation`);
      return (r.data?.data ?? []) as ModerationPost[];
    },
  });
}

export function useModeratePost(cid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ pid, action }: { pid: string; action: 'keep' | 'warn' | 'remove' }) =>
      api.post(`/posts/${pid}/moderate`, { action }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['moderation-queue', cid] }),
  });
}

export function useApproveInitiative() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (iid: string) => api.post(`/initiatives/${iid}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community-initiatives'] });
      qc.invalidateQueries({ queryKey: ['initiative'] });
    },
  });
}

export function useRejectInitiative() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ iid, reason }: { iid: string; reason?: string }) =>
      api.post(`/initiatives/${iid}/reject`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community-initiatives'] });
      qc.invalidateQueries({ queryKey: ['initiative'] });
    },
  });
}

export type AttendanceAnalytics = {
  attendanceRate: number;
  totalRsvp: number;
  totalAttended: number;
  perEvent: Array<{ eventId: string; title: string; startAt: string; rsvped: number; attended: number }>;
  bestTurnout: Array<{ eventId: string; title: string; rsvped: number; attended: number }>;
  worstTurnout: Array<{ eventId: string; title: string; rsvped: number; attended: number }>;
};

export function useAttendanceAnalytics(cid: string | undefined) {
  return useQuery({
    queryKey: ['analytics-attendance', cid],
    enabled: !!cid,
    queryFn: async (): Promise<AttendanceAnalytics> => {
      const r = await api.get(`/communities/${cid}/admin/analytics/attendance`);
      return r.data?.data as AttendanceAnalytics;
    },
  });
}

export type GrowthAnalytics = {
  total: number;
  joined90d: number;
  left90d: number;
  net90d: number;
  series: Array<{ date: string; joined: number; total: number }>;
};

export function useGrowthAnalytics(cid: string | undefined) {
  return useQuery({
    queryKey: ['analytics-growth', cid],
    enabled: !!cid,
    queryFn: async (): Promise<GrowthAnalytics> => {
      const r = await api.get(`/communities/${cid}/admin/analytics/growth`);
      return r.data?.data as GrowthAnalytics;
    },
  });
}

export type MostActiveMember = {
  rank: number;
  userId: string;
  name: string;
  email: string;
  photoUrl?: string | null;
  attended: number;
  rsvped: number;
};

export function useMostActive(cid: string | undefined) {
  return useQuery({
    queryKey: ['analytics-most-active', cid],
    enabled: !!cid,
    queryFn: async (): Promise<MostActiveMember[]> => {
      const r = await api.get(`/communities/${cid}/admin/analytics/most-active`);
      return (r.data?.data ?? []) as MostActiveMember[];
    },
  });
}

// ===== Subscriptions + refunds =====

export type MySubscription = {
  id: string;
  communityId: string;
  plan: 'monthly' | 'annual';
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing';
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
};

export function useMySubscriptions() {
  return useQuery({
    queryKey: ['my-subscriptions'],
    queryFn: async (): Promise<MySubscription[]> => {
      const r = await api.get('/me/subscriptions');
      return (r.data?.data ?? []) as MySubscription[];
    },
  });
}

export function useSubscribeToCommunity(cid: string | undefined) {
  return useMutation({
    mutationFn: async (plan: 'monthly' | 'annual') => {
      const r = await api.post(`/communities/${cid}/subscribe`, { plan });
      return r.data?.data as { sessionUrl: string };
    },
  });
}

export function useCancelMySubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sid: string) => api.post(`/me/subscriptions/${sid}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-subscriptions'] }),
  });
}

export type PaymentDetail = {
  id: string;
  amountCents: number;
  refundedAmountCents: number;
  currency: string;
  status: string;
  createdAt: string;
  payer?: { id: string; name?: string; email?: string } | null;
  eventId?: string | null;
  eventTitle?: string | null;
};

export function usePayment(pid: string | undefined) {
  return useQuery({
    queryKey: ['payment', pid],
    enabled: !!pid,
    queryFn: async (): Promise<PaymentDetail> => {
      const r = await api.get(`/payments/${pid}`);
      return r.data?.data as PaymentDetail;
    },
  });
}

export function useRefundPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      pid,
      amountCents,
      reason,
    }: {
      pid: string;
      amountCents?: number;
      reason?: 'requested_by_customer' | 'duplicate' | 'fraudulent';
    }) => {
      const r = await api.post(`/payments/${pid}/refund`, { amountCents, reason });
      return r.data?.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finances'] });
      qc.invalidateQueries({ queryKey: ['event-payments'] });
    },
  });
}

export type CommunitySubscription = {
  id: string;
  userId: string;
  name: string;
  email: string;
  photoUrl: string | null;
  plan: 'monthly' | 'annual';
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing';
  cancelAtPeriodEnd: boolean;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
};

export function useCommunitySubscriptions(cid: string | undefined) {
  return useQuery({
    queryKey: ['community-subscriptions', cid],
    enabled: !!cid,
    queryFn: async (): Promise<CommunitySubscription[]> => {
      const r = await api.get(`/communities/${cid}/admin/subscriptions`);
      return (r.data?.data ?? []) as CommunitySubscription[];
    },
  });
}

export type FinancialSnapshot = {
  totalRevenueCents: number;
  revenueThisMonth: number;
  revenueThisWeek: number;
  last30RevenueCents: number;
  upcomingRevenueCents: number;
  activeSubscriptions: number;
  mrrCents: number;
  subscriptionRevenueCents: number;
  monthlySeries: Array<{ month: string; revenueCents: number }>;
  revenueByEvent: Array<{
    eventId: string;
    title: string;
    revenueCents: number;
    paidCount: number;
  }>;
  recentPayments: Array<{
    id: string;
    amountCents: number;
    status: string;
    createdAt: string;
    payer?: { id: string; name?: string; email?: string } | null;
    eventId?: string | null;
    eventTitle?: string | null;
  }>;
};

export function useFinances(cid: string | undefined) {
  return useQuery({
    queryKey: ['finances', cid],
    enabled: !!cid,
    queryFn: async (): Promise<FinancialSnapshot> => {
      const r = await api.get(`/communities/${cid}/finances`);
      return r.data?.data as FinancialSnapshot;
    },
  });
}

// ===== Super admin =====

export type SuperCommunityRow = {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'deleted';
  memberCount?: number;
  eventCount?: number;
  logoUrl?: string;
};

export function useSuperCommunities() {
  return useQuery({
    queryKey: ['super-communities'],
    queryFn: async (): Promise<SuperCommunityRow[]> => {
      const r = await api.get('/super/communities');
      const rows: Array<Record<string, unknown>> = r.data?.data ?? [];
      return rows.map((c) => {
        const metrics = (c.metrics as { memberCount?: number; eventCount?: number }) ?? {};
        return {
          id: String(c.id ?? c._id),
          name: String(c.name ?? ''),
          slug: String(c.slug ?? ''),
          status: (c.status as SuperCommunityRow['status']) ?? 'active',
          memberCount: metrics.memberCount,
          eventCount: metrics.eventCount,
          logoUrl: c.logoUrl as string | undefined,
        };
      });
    },
  });
}

export type SuperStats = {
  kpis: {
    communities: number;
    users: number;
    mrrCents: number;
    activeUsersMtd: number;
    activeSubs: number;
  };
  activeUsersSeries: Array<{ date: string; active: number }>;
};

export function useSuperStats() {
  return useQuery({
    queryKey: ['super-stats'],
    queryFn: async (): Promise<SuperStats> => {
      const r = await api.get('/super/stats');
      const d = r.data?.data ?? {};
      return {
        kpis: {
          communities: Number(d.kpis?.communities ?? 0),
          users: Number(d.kpis?.users ?? 0),
          mrrCents: Number(d.kpis?.mrrCents ?? 0),
          activeUsersMtd: Number(d.kpis?.activeUsersMtd ?? 0),
          activeSubs: Number(d.kpis?.activeSubs ?? 0),
        },
        activeUsersSeries: (d.activeUsersSeries ?? []) as Array<{ date: string; active: number }>,
      };
    },
  });
}

export type SuperUserRow = {
  id: string;
  email: string;
  name: string;
  globalRole: string;
  status: string;
  photoUrl?: string | null;
  membershipCount?: number;
  topRole?: string;
};

export function useSuperUsers() {
  return useQuery({
    queryKey: ['super-users'],
    queryFn: async (): Promise<SuperUserRow[]> => {
      const r = await api.get('/super/users');
      return (r.data?.data ?? []) as SuperUserRow[];
    },
  });
}

export type UpdateCommunityInput = {
  name?: string;
  description?: string;
  category?: 'religious' | 'educational' | 'professional' | 'hobby' | 'other';
  privacy?: 'public' | 'invite_only' | 'application';
  logoUrl?: string;
  coverUrl?: string;
  settings?: {
    branding?: { primaryColor?: string; accentColor?: string };
    welcomeMessage?: string;
    rules?: string;
  };
};

export function useUpdateCommunity(cid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateCommunityInput) => {
      const r = await api.patch(`/communities/${cid}`, body);
      return r.data?.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community', cid] });
      qc.invalidateQueries({ queryKey: ['my-communities'] });
    },
  });
}

export function useOnboardCommunity(cid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name?: string;
      description?: string;
      category?: string;
      privacy?: 'public' | 'invite_only' | 'application';
      logoUrl?: string;
      coverUrl?: string;
      welcomeMessage?: string;
      completedStep?: 'basics' | 'branding' | 'privacy' | 'experience' | 'firstEvent' | 'firstInvites';
    }) => {
      const r = await api.post(`/communities/${cid}/onboard`, body);
      return r.data?.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community', cid] }),
  });
}

export type CreateCommunityInput = {
  name: string;
  description?: string;
  category?: 'religious' | 'educational' | 'professional' | 'hobby' | 'other';
  slug?: string;
  privacy?: 'public' | 'invite_only' | 'application';
  initialAdminEmail: string;
};

export function useSuperCreateCommunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateCommunityInput) => {
      const r = await api.post('/super/communities', body);
      return r.data?.data as {
        community: { id: string; name: string; slug: string };
        invitation: { id: string; email: string; token?: string };
      };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['super-communities'] }),
  });
}

export function useSuperCommunityDetail(cid: string | undefined) {
  return useQuery({
    queryKey: ['super-community-detail', cid],
    enabled: !!cid,
    queryFn: async () => {
      const r = await api.get(`/super/communities/${cid}`);
      return r.data?.data as Record<string, unknown>;
    },
  });
}

export function useSuperUpdateCommunity(cid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateCommunityInput) => {
      const r = await api.patch(`/super/communities/${cid}`, body);
      return r.data?.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['super-community-detail', cid] });
      qc.invalidateQueries({ queryKey: ['super-communities'] });
    },
  });
}

export function useSuperDeleteCommunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cid: string) => api.delete(`/super/communities/${cid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['super-communities'] }),
  });
}

export type SuperUserDetail = {
  user: {
    id: string;
    email: string;
    name: string;
    photoUrl?: string | null;
    bio?: string | null;
    status: string;
    globalRole: string;
    lastLoginAt?: string | null;
    scheduledDeletionAt?: string | null;
    createdAt: string;
  };
  memberships: Array<{
    membershipId: string;
    communityId: string;
    role: string;
    status: string;
    joinedAt: string;
    community: { id: string; name: string; slug: string; logoUrl?: string | null; status: string } | null;
  }>;
};

export function useSuperUserDetail(uid: string | undefined) {
  return useQuery({
    queryKey: ['super-user-detail', uid],
    enabled: !!uid,
    queryFn: async (): Promise<SuperUserDetail> => {
      const r = await api.get(`/super/users/${uid}`);
      return r.data?.data as SuperUserDetail;
    },
  });
}

export function useSuperDisableUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uid: string) => api.post(`/super/users/${uid}/disable`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['super-users'] });
      qc.invalidateQueries({ queryKey: ['super-user-detail'] });
    },
  });
}

export function useSuperEnableUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uid: string) => api.post(`/super/users/${uid}/enable`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['super-users'] });
      qc.invalidateQueries({ queryKey: ['super-user-detail'] });
    },
  });
}

export function useSuperForcePasswordReset() {
  return useMutation({
    mutationFn: async (uid: string) => {
      const r = await api.post(`/super/users/${uid}/reset-password`);
      return r.data?.data;
    },
  });
}

export function useSuperPromoteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uid: string) => api.post(`/super/users/${uid}/promote`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['super-users'] });
      qc.invalidateQueries({ queryKey: ['super-user-detail'] });
    },
  });
}

export type AuditEntry = {
  id: string;
  action: string;
  actor: { id: string; name: string; email: string } | null;
  actorRole: string | null;
  communityId: string | null;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
};

export function useSuperAudit(limit = 50) {
  return useQuery({
    queryKey: ['super-audit', limit],
    queryFn: async (): Promise<AuditEntry[]> => {
      const r = await api.get(`/super/audit?limit=${limit}`);
      return (r.data?.data ?? []) as AuditEntry[];
    },
  });
}

export function useSuperSuspendCommunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cid: string) => api.post(`/super/communities/${cid}/suspend`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['super-communities'] }),
  });
}

export function useSuperRestoreCommunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cid: string) => api.post(`/super/communities/${cid}/restore`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['super-communities'] }),
  });
}
