import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/providers/auth_providers.dart';
import '../../features/auth/presentation/screens/email_verification_screen.dart';
import '../../features/auth/presentation/screens/forgot_password_screen.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/register_screen.dart';
import '../../features/auth/presentation/screens/reset_password_screen.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/discussions/presentation/screens/discussions_screen.dart';
import '../../features/edge/presentation/screens/app_update_required_screen.dart';
import '../../features/edge/presentation/screens/generic_error_screen.dart';
import '../../features/edge/presentation/screens/not_found_screen.dart';
import '../../features/edge/presentation/screens/offline_screen.dart';
import '../../features/edge/presentation/screens/privacy_settings_screen.dart';
import '../../features/edge/presentation/screens/unauthorized_screen.dart';
import '../../features/events/presentation/screens/attendee_list_screen.dart';
import '../../features/events/presentation/screens/create_event_screen.dart';
import '../../features/events/presentation/screens/edit_event_screen.dart';
import '../../features/events/presentation/screens/edit_pricing_screen.dart';
import '../../features/events/presentation/screens/event_command_center_screen.dart';
import '../../features/events/presentation/screens/event_detail_screen.dart';
import '../../features/events/presentation/screens/event_materials_screen.dart';
import '../../features/events/presentation/screens/event_qa_screen.dart';
import '../../features/events/presentation/screens/events_list_screen.dart';
import '../../features/events/presentation/screens/materials_upload_screen.dart';
import '../../features/events/presentation/screens/my_events_screen.dart';
import '../../features/events/presentation/screens/post_event_summary_screen.dart';
import '../../features/events/presentation/screens/publish_recap_screen.dart';
import '../../features/events/presentation/screens/qa_management_screen.dart';
import '../../features/events/presentation/screens/rsvp_confirmation_screen.dart';
import '../../features/events/presentation/screens/waitlist_joined_screen.dart';
import '../../features/home/presentation/screens/home_screen.dart';
import '../../features/admin/presentation/screens/admin_event_detail_screen.dart';
import '../../features/admin/presentation/screens/admin_event_list_screen.dart';
import '../../features/admin/presentation/screens/admin_wizard_screen.dart';
import '../../features/admin/presentation/screens/approval_queue_screen.dart';
import '../../features/admin/presentation/screens/assign_event_manager_screen.dart';
import '../../features/admin/presentation/screens/branding_customizer_screen.dart';
import '../../features/admin/presentation/screens/broadcast_composer_screen.dart';
import '../../features/admin/presentation/screens/community_settings_screen.dart';
import '../../features/admin/presentation/screens/content_moderation_screen.dart';
import '../../features/admin/presentation/screens/create_community_screen.dart';
import '../../features/admin/presentation/screens/financial_dashboard_screen.dart';
import '../../features/admin/presentation/screens/initiative_moderation_screen.dart';
import '../../features/admin/presentation/screens/invite_member_screen.dart';
import '../../features/admin/presentation/screens/issue_refund_screen.dart';
import '../../features/admin/presentation/screens/member_detail_screen.dart';
import '../../features/admin/presentation/screens/member_list_screen.dart';
import '../../features/admin/presentation/screens/role_management_screen.dart';
import '../../features/admin/presentation/screens/sub_admin_analytics_screen.dart';
import '../../features/admin/presentation/screens/sub_admin_dashboard_screen.dart';
import '../../features/admin/presentation/screens/subscription_management_screen.dart';
import '../../features/super/presentation/screens/community_detail_super_screen.dart';
import '../../features/super/presentation/screens/global_user_list_screen.dart';
import '../../features/super/presentation/screens/platform_settings_screen.dart';
import '../../features/super/presentation/screens/super_admin_dashboard_screen.dart';
import '../../features/super/presentation/screens/super_communities_list_screen.dart';
import '../../features/super/presentation/screens/suspend_community_screen.dart';
import '../../features/super/presentation/screens/suspended_community_screen.dart';
import '../../features/super/presentation/screens/user_detail_super_screen.dart';
import '../../features/communities/presentation/screens/community_discovery_screen.dart';
import '../../features/communities/presentation/screens/community_rules_screen.dart';
import '../../features/communities/presentation/screens/community_switcher_sheet.dart';
import '../../features/communities/presentation/screens/community_welcome_screen.dart';
import '../../features/initiatives/presentation/screens/initiative_detail_screen.dart';
import '../../features/initiatives/presentation/screens/initiatives_screen.dart';
import '../../features/initiatives/presentation/screens/new_initiative_screen.dart';
import '../../features/notifications/presentation/screens/inbox_screen.dart';
import '../../features/notifications/presentation/screens/notification_preferences_screen.dart';
import '../../features/onboarding/presentation/screens/interests_selector_screen.dart';
import '../../features/onboarding/presentation/screens/onboarding_carousel_screen.dart';
import '../../features/onboarding/presentation/screens/profile_setup_screen.dart';
import '../../features/payments/presentation/screens/cancel_subscription_screen.dart';
import '../../features/payments/presentation/screens/checkout_screen.dart';
import '../../features/payments/presentation/screens/finances_screen.dart';
import '../../features/payments/presentation/screens/manage_subscription_screen.dart';
import '../../features/payments/presentation/screens/my_subscriptions_screen.dart';
import '../../features/payments/presentation/screens/payment_failure_screen.dart';
import '../../features/payments/presentation/screens/payment_success_screen.dart';
import '../../features/payments/presentation/screens/refund_received_screen.dart';
import '../../features/payments/presentation/screens/subscription_plans_screen.dart';
import '../../features/profile/presentation/screens/account_deletion_screen.dart';
import '../../features/profile/presentation/screens/edit_profile_screen.dart';
import '../../features/profile/presentation/screens/member_profile_screen.dart';
import '../../features/profile/presentation/screens/my_rsvps_screen.dart';

final goRouterProvider = Provider<GoRouter>((ref) {
  final notifier = _AuthStateListenable(ref);
  return GoRouter(
    initialLocation: '/',
    refreshListenable: notifier,
    debugLogDiagnostics: kDebugMode,
    errorBuilder: (_, state) =>
        NotFoundScreen(attemptedPath: state.matchedLocation),
    routes: [
      // Auth routes match the design-spec paths verbatim.
      GoRoute(path: '/', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/signup', builder: (_, __) => const RegisterScreen()),
      GoRoute(path: '/forgot', builder: (_, __) => const ForgotPasswordScreen()),
      GoRoute(
        path: '/reset',
        builder: (_, state) =>
            ResetPasswordScreen(initialToken: state.uri.queryParameters['token']),
      ),
      GoRoute(
        path: '/verify',
        builder: (_, state) => EmailVerificationScreen(
          email: state.uri.queryParameters['email'] ?? '',
        ),
      ),

      // Onboarding
      GoRoute(path: '/welcome', builder: (_, __) => const OnboardingCarouselScreen()),
      GoRoute(path: '/onboard/profile', builder: (_, __) => const ProfileSetupScreen()),
      GoRoute(path: '/onboard/interests', builder: (_, __) => const InterestsSelectorScreen()),

      // Member core (C1).
      GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
      GoRoute(
        path: '/events',
        // EventsCalendar shares this route via `?view=calendar`.
        builder: (_, state) => EventsListScreen(
          initialView: state.uri.queryParameters['view'] == 'calendar' ? 'calendar' : 'list',
        ),
      ),
      GoRoute(
        path: '/events/:id',
        builder: (_, state) => EventDetailScreen(eventId: state.pathParameters['id']!),
        routes: [
          GoRoute(
            path: 'rsvp',
            builder: (_, state) =>
                RsvpConfirmationScreen(eventId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: 'waitlist',
            builder: (_, state) =>
                WaitlistJoinedScreen(eventId: state.pathParameters['id']!),
          ),
        ],
      ),
      // Member identity (C2a).
      GoRoute(path: '/me', builder: (_, __) => const MemberProfileScreen()),
      GoRoute(path: '/me/edit', builder: (_, __) => const EditProfileScreen()),
      GoRoute(path: '/inbox', builder: (_, __) => const InboxScreen()),
      GoRoute(
        path: '/settings/notifications',
        builder: (_, __) => const NotificationPreferencesScreen(),
      ),
      // C2b — communities & me-aggregates.
      GoRoute(path: '/communities', builder: (_, __) => const CommunitySwitcherSheet()),
      GoRoute(path: '/discover', builder: (_, __) => const CommunityDiscoveryScreen()),
      GoRoute(
        path: '/c/:id/welcome',
        builder: (_, state) => CommunityWelcomeScreen(communityId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/c/:id/rules',
        builder: (_, state) => CommunityRulesScreen(communityId: state.pathParameters['id']!),
      ),
      GoRoute(path: '/me/rsvps', builder: (_, __) => const MyRsvpsScreen()),
      GoRoute(path: '/settings/delete', builder: (_, __) => const AccountDeletionScreen()),
      // C4 — Event Manager.
      GoRoute(path: '/manage/events', builder: (_, __) => const MyEventsScreen()),
      GoRoute(
        path: '/manage/events/:id',
        builder: (_, state) => EventCommandCenterScreen(eventId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/manage/events/:id/attendees',
        builder: (_, state) => AttendeeListScreen(eventId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/manage/events/:id/materials/new',
        builder: (_, state) => MaterialsUploadScreen(eventId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/manage/events/:id/qa',
        builder: (_, state) => QaManagementScreen(eventId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/manage/events/:id/recap',
        builder: (_, state) => PublishRecapScreen(eventId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/events/:id/materials',
        builder: (_, state) => EventMaterialsScreen(eventId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/events/:id/qa',
        builder: (_, state) => EventQaScreen(eventId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/events/:id/recap',
        builder: (_, state) => PostEventSummaryScreen(eventId: state.pathParameters['id']!),
      ),
      GoRoute(path: '/admin/events/new', builder: (_, __) => const CreateEventScreen()),
      GoRoute(
        path: '/admin/events/:id/edit',
        builder: (_, state) => EditEventScreen(eventId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/admin/events/:id/pricing',
        builder: (_, state) => EditPricingScreen(eventId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/manage/events/:id/broadcast',
        builder: (_, state) => BroadcastComposerScreen(eventId: state.pathParameters['id']!),
      ),
      // C5 — Sub-admin / admin.
      GoRoute(path: '/admin/overview', builder: (_, __) => const SubAdminDashboardScreen()),
      GoRoute(path: '/admin/analytics', builder: (_, __) => const SubAdminAnalyticsScreen()),
      GoRoute(
        path: '/admin/analytics/growth',
        builder: (_, __) => const SubAdminAnalyticsScreen(initialTab: 'growth'),
      ),
      GoRoute(
        path: '/admin/analytics/attendance',
        builder: (_, __) => const SubAdminAnalyticsScreen(initialTab: 'attendance'),
      ),
      GoRoute(
        path: '/admin/analytics/members',
        builder: (_, __) => const SubAdminAnalyticsScreen(initialTab: 'members'),
      ),
      GoRoute(path: '/admin/members', builder: (_, __) => const MemberListScreen()),
      GoRoute(path: '/admin/members/applications', builder: (_, __) => const ApprovalQueueScreen()),
      GoRoute(
        path: '/admin/members/:id',
        builder: (_, state) => MemberDetailScreen(userId: state.pathParameters['id']!),
      ),
      GoRoute(path: '/admin/moderation', builder: (_, __) => const ContentModerationScreen()),
      GoRoute(path: '/admin/initiatives/pending', builder: (_, __) => const InitiativeModerationScreen()),
      // C6 — admin.
      GoRoute(path: '/admin/members/invite', builder: (_, __) => const InviteMemberScreen()),
      GoRoute(path: '/admin/settings', builder: (_, __) => const CommunitySettingsScreen()),
      GoRoute(path: '/admin/settings/branding', builder: (_, __) => const BrandingCustomizerScreen()),
      GoRoute(path: '/admin/settings/roles', builder: (_, __) => const RoleManagementScreen()),
      GoRoute(path: '/admin/events', builder: (_, __) => const AdminEventListScreen()),
      GoRoute(
        path: '/admin/events/:id',
        builder: (_, state) => AdminEventDetailScreen(eventId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/admin/events/:id/assign',
        builder: (_, state) => AssignEventManagerScreen(eventId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/admin/events/:id/refund',
        builder: (_, state) => IssueRefundScreen(eventId: state.pathParameters['id']!),
      ),
      GoRoute(path: '/admin/finances', builder: (_, __) => const FinancialDashboardScreen()),
      GoRoute(path: '/admin/finances/subscriptions', builder: (_, __) => const SubscriptionManagementScreen()),
      GoRoute(path: '/super/communities/new', builder: (_, __) => const CreateCommunityScreen()),
      // C7 — Super admin.
      GoRoute(path: '/super', builder: (_, __) => const SuperAdminDashboardScreen()),
      GoRoute(path: '/super/settings', builder: (_, __) => const PlatformSettingsScreen()),
      GoRoute(path: '/super/users', builder: (_, __) => const GlobalUserListScreen()),
      GoRoute(
        path: '/super/users/:id',
        builder: (_, state) => UserDetailSuperScreen(uid: state.pathParameters['id']!),
      ),
      GoRoute(path: '/super/communities', builder: (_, __) => const SuperCommunitiesListScreen()),
      GoRoute(
        path: '/super/communities/:id',
        builder: (_, state) => CommunityDetailSuperScreen(cid: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/super/communities/:id/suspend',
        builder: (_, state) => SuspendCommunityScreen(cid: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/c/:id/suspended',
        builder: (_, state) => SuspendedCommunityScreen(communityId: state.pathParameters['id']),
      ),
      GoRoute(
        path: '/admin/setup/:step',
        builder: (_, state) => AdminWizardScreen(
          step: int.tryParse(state.pathParameters['step'] ?? '1') ?? 1,
        ),
      ),
      GoRoute(
        path: '/me/subscriptions',
        // Deprecated route — kept for back-compat; serves the same screen.
        builder: (_, __) => const MySubscriptionsScreen(),
      ),
      // C3 — payments & subscriptions.
      GoRoute(
        path: '/subscribe',
        builder: (_, state) => SubscriptionPlansScreen(
          communityId: state.uri.queryParameters['communityId'],
        ),
      ),
      GoRoute(
        path: '/events/:id/checkout',
        builder: (_, state) => CheckoutScreen(eventId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/pay/success',
        builder: (_, state) => PaymentSuccessScreen(
          eventId: state.uri.queryParameters['eventId'],
        ),
      ),
      GoRoute(
        path: '/pay/failed',
        builder: (_, state) => PaymentFailureScreen(
          eventId: state.uri.queryParameters['eventId'],
          reason: state.uri.queryParameters['reason'],
        ),
      ),
      GoRoute(
        path: '/pay/refund',
        builder: (_, state) {
          final qp = state.uri.queryParameters;
          return RefundReceivedScreen(
            amountCents: int.tryParse(qp['amountCents'] ?? '0') ?? 0,
            currency: qp['currency'] ?? 'ILS',
            last4: qp['last4'],
            reference: qp['ref'],
          );
        },
      ),
      GoRoute(
        path: '/me/membership',
        builder: (_, __) => const ManageSubscriptionScreen(),
      ),
      GoRoute(
        path: '/me/membership/cancel',
        builder: (_, state) => CancelSubscriptionScreen(
          subscriptionId: state.uri.queryParameters['sid'] ?? '',
        ),
      ),
      GoRoute(
        path: '/admin/communities/:cid/finances',
        builder: (_, state) => FinancesScreen(communityId: state.pathParameters['cid']!),
      ),
      GoRoute(
        path: '/communities/:cid/initiatives',
        builder: (_, state) => InitiativesScreen(communityId: state.pathParameters['cid']!),
      ),
      GoRoute(
        path: '/communities/:cid/initiatives/new',
        builder: (_, state) => NewInitiativeScreen(communityId: state.pathParameters['cid']!),
      ),
      GoRoute(
        path: '/initiatives/:iid',
        builder: (_, state) => InitiativeDetailScreen(iid: state.pathParameters['iid']!),
      ),
      GoRoute(
        path: '/communities/:cid/discussions',
        builder: (_, state) => DiscussionsScreen(communityId: state.pathParameters['cid']!),
      ),
      // C8 — edge states.
      GoRoute(
        path: '/404',
        builder: (_, state) => NotFoundScreen(
          attemptedPath: state.uri.queryParameters['path'],
        ),
      ),
      GoRoute(
        path: '/403',
        builder: (_, state) => UnauthorizedScreen(
          requiredRole: state.uri.queryParameters['role'],
        ),
      ),
      GoRoute(
        path: '/error',
        builder: (_, state) => GenericErrorScreen(
          errorIdValue: state.uri.queryParameters['id'],
        ),
      ),
      GoRoute(path: '/offline', builder: (_, __) => const OfflineScreen()),
      GoRoute(
        path: '/force-update',
        builder: (_, state) => AppUpdateRequiredScreen(
          currentVersion: state.uri.queryParameters['v'] ?? '1.0.0',
        ),
      ),
      GoRoute(path: '/settings/privacy', builder: (_, __) => const PrivacySettingsScreen()),
    ],
    redirect: (ctx, state) {
      final authState = ref.read(authNotifierProvider);
      final location = state.matchedLocation;
      final isSplash = location == '/';
      // Routes reachable without a logged-in user. /onboard/* is first-run flow
      // that runs BEFORE auth completes per the spec.
      const publicRoutes = {
        '/login',
        '/signup',
        '/forgot',
        '/reset',
        '/verify',
        '/welcome',
        '/onboard/profile',
        '/onboard/interests',
      };
      final isPublic = publicRoutes.contains(location);
      // Edge-state routes (C8) bypass auth — they exist precisely to handle
      // states where normal routing breaks (404/403/offline/force-update).
      const edgeRoutes = {
        '/404',
        '/403',
        '/error',
        '/offline',
        '/force-update',
      };
      final isEdge = edgeRoutes.contains(location);
      // The onboarding ladder — authenticated users walking it shouldn't be
      // bounced to /home mid-flow.
      const onboardingFlow = {
        '/welcome',
        '/signup',
        '/verify',
        '/onboard/profile',
        '/onboard/interests',
      };
      final isOnboarding = onboardingFlow.contains(location);

      if (isEdge) return null;
      if (authState is AuthInitial || authState is AuthLoading) {
        return isSplash ? null : '/';
      }
      if (authState is AuthAuthenticated) {
        if (isSplash) return '/home';
        if (isPublic && !isOnboarding) return '/home';
        // Admin-only guard for /admin/communities/:cid/finances (PRD 05 §6).
        const financesPrefix = '/admin/communities/';
        if (location.startsWith(financesPrefix) && location.endsWith('/finances')) {
          final cid = location.substring(financesPrefix.length).split('/').first;
          final isAdmin = authState.memberships.any(
            (m) => m.communityId == cid && m.role == 'admin',
          );
          if (!isAdmin) return '/home';
        }
        return null;
      }
      // Unauthenticated — first-run users start at the welcome carousel.
      if (isSplash) return '/welcome';
      if (isPublic) return null;
      return '/login';
    },
  );
});

class _AuthStateListenable extends ChangeNotifier {
  _AuthStateListenable(Ref ref) {
    ref.listen<AuthState>(authNotifierProvider, (_, __) => notifyListeners());
  }
}
