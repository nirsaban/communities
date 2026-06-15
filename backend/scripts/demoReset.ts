/* eslint-disable no-console */
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../src/config/db';
import { Community } from '../src/models/Community';
import { EventModel } from '../src/models/Event';
import { EventRSVP } from '../src/models/EventRSVP';
import { Payment } from '../src/models/Payment';
import { Subscription } from '../src/models/Subscription';
import { User } from '../src/models/User';
import { Membership, type CommunityRole } from '../src/models/Membership';

const DEMO_EMAIL = 'bob@example.com';
const ROLE_USER_PASSWORD = 'RolePass123!';
const ROLE_USERS: Array<{ email: string; name: string; role: CommunityRole }> = [
  { email: 'alice-admin@example.com', name: 'Alice Admin', role: 'admin' },
  { email: 'sam-subadmin@example.com', name: 'Sam Subadmin', role: 'subadmin' },
  // Per PRD 06 §4: Event Manager is NOT a community-wide role. Eve is a plain
  // member whose manager powers come solely from Event.managers[] (assigned to
  // one upcoming event below). Seeding her as `member` keeps the per-event
  // grant the only thing that unlocks her command center — exactly what the EM
  // scoping walk must verify.
  { email: 'eve-em@example.com', name: 'Eve Manager', role: 'member' },
  { email: 'mike-member@example.com', name: 'Mike Member', role: 'member' },
];

interface Args {
  email: string;
  rsvps: boolean;
  dry: boolean;
}

function parseArgs(): Args {
  const args: Args = { email: DEMO_EMAIL, rsvps: false, dry: false };
  for (const arg of process.argv.slice(2)) {
    if (arg === '--rsvps') args.rsvps = true;
    else if (arg === '--dry') args.dry = true;
    else if (arg === '--help' || arg === '-h') {
      console.log(
        [
          'demoReset — bring the local demo database back to a known-good state.',
          '',
          'Usage:  tsx scripts/demoReset.ts [--rsvps] [--dry] [--email=foo@bar]',
          '',
          'What it does by default:',
          '  • Sets every Community to status=active (un-suspends any test casualties).',
          '  • Sets every Membership to status=active (clears banned/pending leftovers).',
          '  • Sets every Event to status=published (clears cancelled/draft leftovers).',
          '  • Recomputes EventModel.metrics from actual RSVPs (fixes rsvpCount/paidCount drift).',
          '  • Ensures the demo user is active, superadmin, and not scheduled for deletion.',
          '',
          'Optional flags:',
          '  --rsvps   Also delete the demo user\'s RSVPs, Payments, and Subscriptions',
          '            so the paid-checkout flow can be walked end-to-end again.',
          '  --dry     Print what would change without writing.',
          '  --email   Target a different demo user (default bob@example.com).',
        ].join('\n'),
      );
      process.exit(0);
    } else {
      const m = /^--([^=]+)=(.*)$/.exec(arg);
      if (m?.[1] === 'email') args.email = m[2];
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs();
  await connectDB();
  console.log(`demoReset → demo user: ${args.email}${args.dry ? '  (dry run)' : ''}`);

  try {
    const user = await User.findOne({ email: args.email.toLowerCase() });
    if (!user) {
      console.error(`✖ user ${args.email} not found in the demo DB.`);
      console.error('  Seed one first via: pnpm create:superadmin --email=... --password=...');
      process.exitCode = 1;
      return;
    }

    if (args.dry) {
      console.log('— dry run, no writes will happen —');
    }

    const communitiesRestored = args.dry
      ? await Community.countDocuments({ status: { $ne: 'active' } })
      : (await Community.updateMany({ status: { $ne: 'active' } }, { $set: { status: 'active' } }))
          .modifiedCount;
    console.log(`✓ Community.status → active   (${communitiesRestored} fixed)`);

    // Seed default subscription tiers on every community (₪40/month, ₪400/year)
    // so SubscriptionPlansScreen has real data to render.
    if (!args.dry) {
      const subResult = await Community.updateMany(
        { 'subscriptionPlans.enabled': { $ne: true } },
        {
          $set: {
            'subscriptionPlans.enabled': true,
            'subscriptionPlans.monthlyPriceCents': 4000,
            'subscriptionPlans.annualPriceCents': 40000,
            'subscriptionPlans.currency': 'ILS',
            'subscriptionPlans.perks': [
              'גישה לכל האירועים בתשלום',
              'תוכן בלעדי לחברי מנוי',
              'עדיפות בהרשמה',
            ],
          },
        },
      );
      console.log(`✓ Community.subscriptionPlans seeded (${subResult.modifiedCount} fixed)`);

      // Mark all communities as "wizard completed" — demo communities are
      // already running. New communities created via /super/communities/new
      // will start with onboarding.wizardCompletedAt = null and route the
      // admin to /admin/wizard until they finish.
      const wizResult = await Community.updateMany(
        { 'onboarding.wizardCompletedAt': { $exists: false } },
        { $set: { 'onboarding.wizardCompletedAt': new Date() } },
      );
      if (wizResult.modifiedCount > 0) {
        console.log(`✓ Community.onboarding.wizardCompletedAt → now (${wizResult.modifiedCount} fixed)`);
      }
    }

    const membershipsFixed = args.dry
      ? await Membership.countDocuments({ status: { $ne: 'active' } })
      : (await Membership.updateMany({ status: { $ne: 'active' } }, { $set: { status: 'active' } }))
          .modifiedCount;
    console.log(`✓ Membership.status → active  (${membershipsFixed} fixed)`);

    const eventsPublished = args.dry
      ? await EventModel.countDocuments({ status: { $ne: 'published' } })
      : (await EventModel.updateMany({ status: { $ne: 'published' } }, { $set: { status: 'published' } }))
          .modifiedCount;
    console.log(`✓ Event.status → published    (${eventsPublished} fixed)`);

    // Recompute per-event metrics from actual RSVPs so the rsvpCount/paidCount drift
    // (documented after the C3 settle-path walk) self-heals on every reset.
    const events = await EventModel.find({}, { _id: 1 }).lean();
    let metricsTouched = 0;
    for (const ev of events) {
      const rsvps = await EventRSVP.find({ eventId: ev._id }).lean();
      const rsvpCount = rsvps.filter((r) => r.status === 'going').length;
      const paidCount = rsvps.filter((r) => r.status === 'going' && r.paymentStatus === 'paid').length;
      const waitlistCount = rsvps.filter((r) => r.status === 'waitlist').length;
      if (!args.dry) {
        await EventModel.updateOne(
          { _id: ev._id },
          { $set: { 'metrics.rsvpCount': rsvpCount, 'metrics.paidCount': paidCount, 'metrics.waitlistCount': waitlistCount } },
        );
      }
      metricsTouched++;
    }
    console.log(`✓ Event.metrics recomputed    (${metricsTouched} events)`);

    const userUpdates: Record<string, unknown> = {};
    if (user.status !== 'active') userUpdates.status = 'active';
    if (user.globalRole !== 'superadmin') userUpdates.globalRole = 'superadmin';
    if (user.scheduledDeletionAt) userUpdates.scheduledDeletionAt = null;
    if (Object.keys(userUpdates).length > 0) {
      if (!args.dry) await User.updateOne({ _id: user._id }, { $set: userUpdates });
      console.log(`✓ User ${args.email} → ${Object.keys(userUpdates).join(', ')}`);
    } else {
      console.log(`✓ User ${args.email}            (already clean)`);
    }

    // Seed one user per community-scoped role so the 5-role smoke walk has a
    // login for each. Anchored to the demo user's first community.
    const anchor = await Membership.findOne({ userId: user._id }).lean();
    if (!anchor) {
      console.warn(`! ${args.email} has no membership yet — skipping role-user seed.`);
    } else {
      const passwordHash = await bcrypt.hash(ROLE_USER_PASSWORD, 12);
      for (const spec of ROLE_USERS) {
        const email = spec.email.toLowerCase();
        let u = await User.findOne({ email });
        if (!u) {
          if (!args.dry) {
            u = await User.create({
              email,
              name: spec.name,
              passwordHash,
              emailVerifiedAt: new Date(),
            });
          }
          console.log(`✓ user ${email} created`);
        }
        if (!u) continue; // dry-run path with no existing user
        const existing = await Membership.findOne({ userId: u._id, communityId: anchor.communityId });
        if (!existing) {
          if (!args.dry) {
            await Membership.create({
              userId: u._id,
              communityId: anchor.communityId,
              role: spec.role,
              status: 'active',
            });
          }
          console.log(`✓ ${email} ← ${spec.role} in ${anchor.communityId}`);
        } else if (existing.role !== spec.role || existing.status !== 'active') {
          if (!args.dry) {
            existing.role = spec.role;
            existing.status = 'active';
            await existing.save();
          }
          console.log(`✓ ${email} role reset → ${spec.role}`);
        }
      }
      console.log(`  (role users login with password "${ROLE_USER_PASSWORD}")`);

      // Assign Eve as event manager of the next upcoming event so the EM smoke
      // walk shows real data. Per PRD 06 §4, manager powers come from
      // Event.managers[] alone — we no longer flip Membership.role.
      const eve = await User.findOne({ email: 'eve-em@example.com' });
      if (eve) {
        const upcoming = await EventModel.findOne({
          communityId: anchor.communityId,
          status: 'published',
          endAt: { $gte: new Date() },
        }).sort({ startAt: 1 });
        if (upcoming) {
          if (!upcoming.managers.some((m) => String(m) === String(eve._id))) {
            if (!args.dry) {
              upcoming.managers.push(eve._id);
              await upcoming.save();
            }
            console.log(`✓ Eve assigned manager of "${upcoming.title}"`);
          }
        } else {
          console.warn('! no upcoming event found to assign Eve to');
        }
      }

      // Flip the first paid event to subscriptionIncluded so Mike (subscriber)
      // can see the "כלול במנוי" perk in EventDetail.
      const paid = await EventModel.findOne({
        communityId: anchor.communityId,
        'pricing.type': 'paid',
      });
      if (paid && !paid.pricing.subscriptionIncluded) {
        if (!args.dry) {
          paid.pricing.subscriptionIncluded = true;
          await paid.save();
        }
        console.log(`✓ "${paid.title}" → subscriptionIncluded:true`);
      }

      // Auto-subscribe Mike so the subscriber-side walk has real state.
      const mike = await User.findOne({ email: 'mike-member@example.com' });
      if (mike) {
        // Stamp onboarding so the OnboardingGate doesn't bounce a returning,
        // already-active member back into /onboard/interests on every login.
        // The interests step is a first-login nicety; Mike completed it long
        // ago in demo terms. Without this the entire member walk is blocked.
        const onboardingPatch: Record<string, Date> = {};
        if (!mike.onboarding?.profileCompletedAt) {
          onboardingPatch['onboarding.profileCompletedAt'] = new Date();
        }
        if (!mike.onboarding?.interestsCompletedAt) {
          onboardingPatch['onboarding.interestsCompletedAt'] = new Date();
        }
        if (Object.keys(onboardingPatch).length > 0 && !args.dry) {
          await User.updateOne({ _id: mike._id }, { $set: onboardingPatch });
          console.log(`✓ Mike onboarding stamped (${Object.keys(onboardingPatch).join(', ')})`);
        }
        const existingSub = await Subscription.findOne({
          userId: mike._id,
          communityId: anchor.communityId,
        });
        if (!existingSub) {
          if (!args.dry) {
            await Subscription.create({
              userId: mike._id,
              communityId: anchor.communityId,
              gateway: 'payplus',
              plan: 'monthly',
              status: 'active',
              cancelAtPeriodEnd: false,
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              gatewaySubscriptionId: `sub_demo_mike_${Date.now()}`,
            });
          }
          console.log('✓ Mike auto-subscribed (monthly, active)');
        }
      }
    }

    if (args.rsvps) {
      const rsvpCount = await EventRSVP.countDocuments({ userId: user._id });
      const paymentCount = await Payment.countDocuments({ userId: user._id });
      const subCount = await Subscription.countDocuments({ userId: user._id });
      if (!args.dry) {
        await EventRSVP.deleteMany({ userId: user._id });
        await Payment.deleteMany({ userId: user._id });
        await Subscription.deleteMany({ userId: user._id });
        // Re-run metrics now that user's RSVPs are gone.
        for (const ev of events) {
          const rsvps = await EventRSVP.find({ eventId: ev._id }).lean();
          await EventModel.updateOne(
            { _id: ev._id },
            {
              $set: {
                'metrics.rsvpCount': rsvps.filter((r) => r.status === 'going').length,
                'metrics.paidCount': rsvps.filter((r) => r.status === 'going' && r.paymentStatus === 'paid').length,
                'metrics.waitlistCount': rsvps.filter((r) => r.status === 'waitlist').length,
              },
            },
          );
        }
      }
      console.log(`✓ RSVPs/Payments/Subs wiped   (${rsvpCount} rsvps, ${paymentCount} payments, ${subCount} subs)`);
    }

    console.log('done.');
  } finally {
    await disconnectDB();
  }
}

main().catch((err) => {
  console.error('demoReset failed:', err);
  process.exit(1);
});
