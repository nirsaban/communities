/* eslint-disable no-console */
import { connectDB, disconnectDB } from '../src/config/db';
import { Community } from '../src/models/Community';
import { EventModel } from '../src/models/Event';
import { EventRSVP } from '../src/models/EventRSVP';
import { Payment } from '../src/models/Payment';
import { Subscription } from '../src/models/Subscription';
import { User } from '../src/models/User';

const DEMO_EMAIL = 'bob@example.com';

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

    const Membership = (await import('../src/models/Membership')).Membership;
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
