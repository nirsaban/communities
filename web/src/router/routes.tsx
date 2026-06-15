import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { communityContext } from '../lib/community-context';
import { useEvent, useMyCommunities, type MembershipRole } from '../lib/queries';
import { Screen } from '../components/AppBar';
import { LoadingDots } from '../components/LoadingDots';
import { SplashScreen } from '../features/auth/SplashScreen';
import { LoginScreen } from '../features/auth/LoginScreen';
import { RegisterScreen } from '../features/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../features/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../features/auth/ResetPasswordScreen';
import { EmailVerificationScreen } from '../features/auth/EmailVerificationScreen';
import { InvitationAcceptScreen } from '../features/auth/InvitationAcceptScreen';
import { GoogleCallbackScreen } from '../features/auth/GoogleCallbackScreen';
import { OnboardingCarouselScreen } from '../features/onboarding/OnboardingCarouselScreen';
import { ProfileSetupScreen } from '../features/onboarding/ProfileSetupScreen';
import { InterestsSelectorScreen } from '../features/onboarding/InterestsSelectorScreen';
import { HomeShell } from '../features/home/HomeShell';
import { HomeFeedScreen } from '../features/home/HomeFeedScreen';
import { DiscoverScreen } from '../features/home/DiscoverScreen';
import { ProfileScreen } from '../features/home/ProfileScreen';
import { CommunityDetailScreen } from '../features/communities/CommunityDetailScreen';
import { CommunityWelcomeScreen } from '../features/communities/CommunityWelcomeScreen';
import { CommunityRulesScreen } from '../features/communities/CommunityRulesScreen';
import { EventsListScreen } from '../features/events/EventsListScreen';
import { EventDetailScreen } from '../features/events/EventDetailScreen';
import { RsvpConfirmationScreen } from '../features/events/RsvpConfirmationScreen';
import { WaitlistJoinedScreen } from '../features/events/WaitlistJoinedScreen';
import { MaterialsScreen } from '../features/events/MaterialsScreen';
import { EventQAScreen } from '../features/events/EventQAScreen';
import { PostEventSummaryScreen } from '../features/events/PostEventSummaryScreen';
import { MyRsvpsScreen } from '../features/events/MyRsvpsScreen';
import { CheckoutScreen } from '../features/payments/CheckoutScreen';
import {
  PaymentCancelScreen,
  PaymentSuccessScreen,
} from '../features/payments/PaymentSuccessScreen';
import { SubscriptionPlansScreen } from '../features/payments/SubscriptionPlansScreen';
import { ManageSubscriptionScreen } from '../features/payments/ManageSubscriptionScreen';
import { CancelSubscriptionScreen } from '../features/payments/CancelSubscriptionScreen';
import { IssueRefundScreen } from '../features/payments/IssueRefundScreen';
import { RefundReceivedScreen } from '../features/payments/RefundReceivedScreen';
import { PostsScreen } from '../features/posts/PostsScreen';
import { PostDetailScreen } from '../features/posts/PostDetailScreen';
import { InitiativesScreen } from '../features/initiatives/InitiativesScreen';
import { InitiativeDetailScreen } from '../features/initiatives/InitiativeDetailScreen';
import { NewInitiativeScreen } from '../features/initiatives/NewInitiativeScreen';
import { InboxScreen } from '../features/notifications/InboxScreen';
import { NotificationPrefsScreen } from '../features/notifications/NotificationPrefsScreen';
import { EditProfileScreen } from '../features/profile/EditProfileScreen';
import { SettingsScreen } from '../features/profile/SettingsScreen';
import { AccountDeletionScreen } from '../features/profile/AccountDeletionScreen';
import { PrivacySettingsScreen } from '../features/profile/PrivacySettingsScreen';
import { EventManagerHomeScreen } from '../features/eventManager/EventManagerHomeScreen';
import { EventCommandCenterScreen } from '../features/eventManager/EventCommandCenterScreen';
import { AttendeeListScreen } from '../features/eventManager/AttendeeListScreen';
import { BroadcastScreen } from '../features/eventManager/BroadcastScreen';
import { MaterialsUploadScreen } from '../features/eventManager/MaterialsUploadScreen';
import { PublishRecapScreen } from '../features/eventManager/PublishRecapScreen';
import { AdminDashboardScreen } from '../features/admin/AdminDashboardScreen';
import { MemberListScreen } from '../features/admin/MemberListScreen';
import { InviteMemberScreen } from '../features/admin/InviteMemberScreen';
import { MemberDetailScreen } from '../features/admin/MemberDetailScreen';
import { FinancialDashboardScreen } from '../features/admin/FinancialDashboardScreen';
import { AdminEventListScreen } from '../features/admin/AdminEventListScreen';
import { CreateEventScreen } from '../features/admin/CreateEventScreen';
import { EditEventScreen } from '../features/admin/EditEventScreen';
import { EditPricingScreen } from '../features/admin/EditPricingScreen';
import { AssignManagersScreen } from '../features/admin/AssignManagersScreen';
import { ApprovalQueueScreen } from '../features/admin/ApprovalQueueScreen';
import { ContentModerationScreen } from '../features/admin/ContentModerationScreen';
import { InitiativeModerationScreen } from '../features/admin/InitiativeModerationScreen';
import { SubAdminAnalyticsScreen } from '../features/admin/SubAdminAnalyticsScreen';
import { CommunitySettingsScreen } from '../features/admin/CommunitySettingsScreen';
import { BrandingCustomizerScreen } from '../features/admin/BrandingCustomizerScreen';
import { RoleManagementScreen } from '../features/admin/RoleManagementScreen';
import { SubscriptionManagementScreen } from '../features/admin/SubscriptionManagementScreen';
import { CreateCommunityScreen } from '../features/super/CreateCommunityScreen';
import { SuperCommunityDetailScreen } from '../features/super/SuperCommunityDetailScreen';
import { SuperUserDetailScreen } from '../features/super/SuperUserDetailScreen';
import { AdminWizardScreen } from '../features/admin/AdminWizardScreen';
import { NotFoundScreen } from '../features/edge/NotFoundScreen';
import { UnauthorizedScreen } from '../features/edge/UnauthorizedScreen';
import { OfflineScreen } from '../features/edge/OfflineScreen';
import { SuperDashboardScreen } from '../features/super/SuperDashboardScreen';
import { SuperCommunitiesListScreen } from '../features/super/SuperCommunitiesListScreen';
import { SuperUsersListScreen } from '../features/super/SuperUsersListScreen';
import { PlatformSettingsScreen } from '../features/super/PlatformSettingsScreen';
import { SuperAuditScreen } from '../features/super/SuperAuditScreen';
import { RoleShell } from '../components/RoleShell';

function CommunitySubrouteFallback() {
  const { cid } = useParams<{ cid: string }>();
  return <Navigate to={cid ? `/c/${cid}` : '/home'} replace />;
}

function Protected({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  if (!auth.accessToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// PRD 10 §2.2 — first-login users must finish /onboard/profile (and then
// /onboard/interests) before any authenticated surface renders. A protected
// route wrapped in this gate redirects unfinished users out instead of
// letting them deep-link past the onboarding flow.
function OnboardingGate({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  if (!auth.accessToken) return <Navigate to="/login" replace />;
  const u = auth.user;
  const profileDone = !!u?.onboarding?.profileCompletedAt || !!u?.name;
  if (!profileDone) return <Navigate to="/onboard/profile" replace />;
  const interestsDone =
    !!u?.onboarding?.interestsCompletedAt || (u?.interests?.length ?? 0) >= 3;
  if (!interestsDone && u?.globalRole !== 'superadmin') {
    return <Navigate to="/onboard/interests" replace />;
  }
  return <>{children}</>;
}

function SuperGate({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  if (!auth.accessToken) return <Navigate to="/login" replace />;
  if (auth.user && auth.user.globalRole !== 'superadmin') {
    return <Navigate to="/403" replace />;
  }
  return <>{children}</>;
}

function CommunityRoleGate({
  roles,
  children,
}: {
  roles: MembershipRole[];
  children: React.ReactNode;
}) {
  const auth = useAuth();
  const ctx = communityContext();
  const { data: mine, isLoading } = useMyCommunities();
  if (!auth.accessToken) return <Navigate to="/login" replace />;
  if (isLoading) {
    return (
      <Screen>
        <div className="flex flex-1 items-center justify-center">
          <LoadingDots />
        </div>
      </Screen>
    );
  }
  // Prefer the ctx-selected community, but if that community isn't one this
  // user is a member of (e.g. stale ctx from a prior account), fall back to
  // the user's first membership so a freshly-accepted admin doesn't 403.
  const active =
    mine?.find((m) => m.community.id === ctx.currentCommunityId) ?? mine?.[0];
  const role = active?.membership.role;
  if (!role || !roles.includes(role)) return <Navigate to="/403" replace />;
  return <>{children}</>;
}

function EventManagerGate({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const { eid } = useParams<{ eid: string }>();
  const { data: event, isLoading } = useEvent(eid);
  if (!auth.accessToken) return <Navigate to="/login" replace />;
  // Super admin override mirrors the backend.
  if (auth.user?.globalRole === 'superadmin') return <>{children}</>;
  if (isLoading || !event) {
    return (
      <Screen>
        <div className="flex flex-1 items-center justify-center">
          <LoadingDots />
        </div>
      </Screen>
    );
  }
  if (!event.isManager) return <Navigate to="/403" replace />;
  return <>{children}</>;
}

const wrap = (el: React.ReactNode): React.ReactElement => <Protected>{el}</Protected>;
const wrapSuper = (el: React.ReactNode): React.ReactElement => <SuperGate>{el}</SuperGate>;
const wrapEM = (el: React.ReactNode): React.ReactElement => (
  <EventManagerGate>{el}</EventManagerGate>
);
const wrapAdmin = (el: React.ReactNode): React.ReactElement => (
  <CommunityRoleGate roles={['admin', 'subadmin']}>{el}</CommunityRoleGate>
);
const wrapAdminOnly = (el: React.ReactNode): React.ReactElement => (
  <CommunityRoleGate roles={['admin']}>{el}</CommunityRoleGate>
);

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<SplashScreen />} />
      <Route path="/welcome" element={<OnboardingCarouselScreen />} />
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/signup" element={<RegisterScreen />} />
      <Route path="/forgot" element={<ForgotPasswordScreen />} />
      <Route path="/reset" element={<ResetPasswordScreen />} />
      <Route path="/verify" element={<EmailVerificationScreen />} />
      <Route path="/invite/:token" element={<InvitationAcceptScreen />} />
      <Route path="/auth/google/callback" element={<GoogleCallbackScreen />} />

      <Route path="/onboard/profile" element={wrap(<ProfileSetupScreen />)} />
      <Route path="/onboard/interests" element={wrap(<InterestsSelectorScreen />)} />

      <Route path="/c/:cid" element={wrap(<CommunityDetailScreen />)} />
      <Route path="/c/:cid/welcome" element={wrap(<CommunityWelcomeScreen />)} />
      <Route path="/c/:cid/rules" element={wrap(<CommunityRulesScreen />)} />
      {/* Defensive: any unknown /c/:cid/* path (including the historical
          /c/:cid/undefined navigation bug) falls back to the community
          overview rather than the global 404. Keep this AFTER all known
          /c/:cid/* routes so it only catches the leftovers. */}
      <Route path="/c/:cid/*" element={<CommunitySubrouteFallback />} />

      <Route path="/events/:eid" element={wrap(<EventDetailScreen />)} />
      <Route path="/events/:eid/confirmed" element={wrap(<RsvpConfirmationScreen />)} />
      <Route path="/events/:eid/waitlist" element={wrap(<WaitlistJoinedScreen />)} />
      <Route path="/events/:eid/materials" element={wrap(<MaterialsScreen />)} />
      <Route path="/events/:eid/qa" element={wrap(<EventQAScreen />)} />
      <Route path="/events/:eid/recap" element={wrap(<PostEventSummaryScreen />)} />
      <Route path="/events/:eid/checkout" element={wrap(<CheckoutScreen />)} />
      <Route path="/events/:eid/command" element={wrapEM(<EventCommandCenterScreen />)} />
      <Route path="/events/:eid/attendees" element={wrapEM(<AttendeeListScreen />)} />
      <Route path="/events/:eid/broadcast" element={wrapEM(<BroadcastScreen />)} />
      <Route path="/events/:eid/materials/upload" element={wrapEM(<MaterialsUploadScreen />)} />
      <Route path="/events/:eid/recap/publish" element={wrapEM(<PublishRecapScreen />)} />

      <Route path="/payments/success" element={wrap(<PaymentSuccessScreen />)} />
      <Route path="/payments/cancel" element={wrap(<PaymentCancelScreen />)} />
      <Route path="/payments/refunded" element={wrap(<RefundReceivedScreen />)} />
      <Route path="/admin/payments/:pid/refund" element={wrapAdminOnly(<IssueRefundScreen />)} />
      <Route path="/c/:cid/subscribe" element={wrap(<SubscriptionPlansScreen />)} />
      <Route path="/me/subscriptions" element={wrap(<ManageSubscriptionScreen />)} />
      <Route path="/me/subscriptions/:sid/cancel" element={wrap(<CancelSubscriptionScreen />)} />

      <Route path="/me/rsvps" element={wrap(<MyRsvpsScreen />)} />
      <Route path="/me/notifications" element={wrap(<InboxScreen />)} />
      <Route path="/me/notifications/prefs" element={wrap(<NotificationPrefsScreen />)} />

      <Route path="/posts/:pid" element={wrap(<PostDetailScreen />)} />
      <Route path="/initiatives/:iid" element={wrap(<InitiativeDetailScreen />)} />
      <Route path="/initiatives/new" element={wrap(<NewInitiativeScreen />)} />

      <Route path="/profile/edit" element={wrap(<EditProfileScreen />)} />
      <Route path="/profile/settings" element={wrap(<SettingsScreen />)} />
      <Route path="/profile/delete" element={wrap(<AccountDeletionScreen />)} />
      <Route path="/profile/privacy" element={wrap(<PrivacySettingsScreen />)} />

      {/* Event Manager, Admin and Super routes are wrapped in RoleShell so the
          role-aware BottomNav (with Profile/Sign-out access) renders at the
          bottom of every page. Gate components still apply per route. */}
      <Route element={<RoleShell />}>
        <Route path="/manage/events" element={wrap(<EventManagerHomeScreen />)} />

        <Route path="/admin" element={wrapAdmin(<AdminDashboardScreen />)} />
        <Route path="/admin/members" element={wrapAdmin(<MemberListScreen />)} />
        <Route path="/admin/members/invite" element={wrapAdmin(<InviteMemberScreen />)} />
        <Route path="/admin/members/:uid" element={wrapAdmin(<MemberDetailScreen />)} />
        <Route path="/admin/finances" element={wrapAdminOnly(<FinancialDashboardScreen />)} />
        <Route path="/admin/subscriptions" element={wrapAdminOnly(<SubscriptionManagementScreen />)} />
        <Route path="/admin/events" element={wrapAdmin(<AdminEventListScreen />)} />
        <Route path="/admin/events/new" element={wrapAdmin(<CreateEventScreen />)} />
        <Route path="/admin/events/:eid/edit" element={wrapAdmin(<EditEventScreen />)} />
        <Route path="/admin/events/:eid/pricing" element={wrapAdminOnly(<EditPricingScreen />)} />
        <Route path="/admin/events/:eid/managers" element={wrapAdmin(<AssignManagersScreen />)} />
        <Route path="/admin/members/pending" element={wrapAdmin(<ApprovalQueueScreen />)} />
        <Route path="/admin/moderation" element={wrapAdmin(<ContentModerationScreen />)} />
        <Route path="/admin/initiatives/moderation" element={wrapAdmin(<InitiativeModerationScreen />)} />
        <Route path="/admin/analytics" element={wrapAdmin(<SubAdminAnalyticsScreen />)} />
        <Route path="/admin/settings" element={wrapAdminOnly(<CommunitySettingsScreen />)} />
        <Route path="/admin/branding" element={wrapAdminOnly(<BrandingCustomizerScreen />)} />
        <Route path="/admin/members/roles" element={wrapAdminOnly(<RoleManagementScreen />)} />
        <Route path="/admin/wizard" element={wrapAdminOnly(<AdminWizardScreen />)} />

        <Route path="/super" element={wrapSuper(<SuperDashboardScreen />)} />
        <Route path="/super/communities" element={wrapSuper(<SuperCommunitiesListScreen />)} />
        <Route path="/super/users" element={wrapSuper(<SuperUsersListScreen />)} />
        <Route path="/super/settings" element={wrapSuper(<PlatformSettingsScreen />)} />
        <Route path="/super/audit" element={wrapSuper(<SuperAuditScreen />)} />
        <Route path="/super/communities/new" element={wrapSuper(<CreateCommunityScreen />)} />
        <Route path="/super/communities/:cid" element={wrapSuper(<SuperCommunityDetailScreen />)} />
        <Route path="/super/users/:uid" element={wrapSuper(<SuperUserDetailScreen />)} />
      </Route>

      <Route element={<OnboardingGate><HomeShell /></OnboardingGate>}>
        <Route path="/home" element={<HomeFeedScreen />} />
        <Route path="/discover" element={<DiscoverScreen />} />
        <Route path="/events" element={<EventsListScreen />} />
        <Route path="/posts" element={<PostsScreen />} />
        <Route path="/initiatives" element={<InitiativesScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
      </Route>

      <Route path="/403" element={<UnauthorizedScreen />} />
      <Route path="/offline" element={<OfflineScreen />} />
      <Route path="*" element={<NotFoundScreen />} />
    </Routes>
  );
}
