/* eslint-disable no-console */
/**
 * One-shot data migration: Stripe → PayPlus field renames.
 *
 * Idempotent — re-running on a fully-migrated DB is a no-op. Safe to run on an
 * empty database. Run via `npm run migrate:stripe-to-payplus` (alias defined in
 * backend/package.json).
 *
 * What it does (per the spec, Step 6):
 *   • Payment.stripePaymentIntentId     → gatewayTransactionId  (sets gateway='payplus')
 *   • Payment.stripeCheckoutSessionId   → gatewayPaymentPageId
 *   • Subscription.stripeSubscriptionId → gatewaySubscriptionId
 *   • Drop Subscription.stripeCustomerId, Community.stripeAccountId.
 *   • Payment.currency 'USD' → 'ILS'
 *   • Payment.installments default to 1 where missing.
 *   • Event.pricing.maxInstallments default to 1 where missing; currency 'USD' → 'ILS'.
 *
 * No model imports — we operate at the collection level via the native driver
 * so this script remains correct even after the Mongoose schemas have moved on.
 */
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db';

interface Args {
  dry: boolean;
}

function parseArgs(): Args {
  const args: Args = { dry: false };
  for (const arg of process.argv.slice(2)) {
    if (arg === '--dry') args.dry = true;
    if (arg === '--help' || arg === '-h') {
      console.log(
        [
          'migrateStripeToPayplus — rename legacy Stripe fields to gateway-agnostic ones.',
          '',
          'Usage:  tsx scripts/migrateStripeToPayplus.ts [--dry]',
          '',
          'Run AFTER deploying the PayPlus code (so writers stop adding new stripe* fields)',
          'and BEFORE the first PayPlus webhook lands.',
          '',
          'Idempotent: re-running on a migrated DB does nothing.',
        ].join('\n'),
      );
      process.exit(0);
    }
  }
  return args;
}

async function run(): Promise<void> {
  const args = parseArgs();
  console.log(`migrateStripeToPayplus  ${args.dry ? '(dry run)' : ''}`);

  await connectDB();
  try {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection is not initialized');
    }
    const payments = db.collection('payments');
    const subscriptions = db.collection('subscriptions');
    const communities = db.collection('communities');
    const events = db.collection('events');

    if (args.dry) {
      console.log('— dry run, no writes will happen —');
    }

    // ── Payment ────────────────────────────────────────────────────────────
    const renamePaymentIntents = await payments.countDocuments({
      stripePaymentIntentId: { $exists: true },
    });
    if (!args.dry && renamePaymentIntents > 0) {
      await payments.updateMany(
        { stripePaymentIntentId: { $exists: true } },
        // Cast to satisfy strict driver typings on the $rename op.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ $rename: { stripePaymentIntentId: 'gatewayTransactionId' } } as any),
      );
    }
    console.log(`✓ Payment.stripePaymentIntentId → gatewayTransactionId  (${renamePaymentIntents})`);

    const renameSessions = await payments.countDocuments({
      stripeCheckoutSessionId: { $exists: true },
    });
    if (!args.dry && renameSessions > 0) {
      await payments.updateMany(
        { stripeCheckoutSessionId: { $exists: true } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ $rename: { stripeCheckoutSessionId: 'gatewayPaymentPageId' } } as any),
      );
    }
    console.log(`✓ Payment.stripeCheckoutSessionId → gatewayPaymentPageId  (${renameSessions})`);

    const setGateway = await payments.countDocuments({ gateway: { $exists: false } });
    if (!args.dry && setGateway > 0) {
      await payments.updateMany({ gateway: { $exists: false } }, { $set: { gateway: 'payplus' } });
    }
    console.log(`✓ Payment.gateway = 'payplus' on legacy rows  (${setGateway})`);

    const setInstallments = await payments.countDocuments({ installments: { $exists: false } });
    if (!args.dry && setInstallments > 0) {
      await payments.updateMany(
        { installments: { $exists: false } },
        { $set: { installments: 1 } },
      );
    }
    console.log(`✓ Payment.installments = 1 on legacy rows  (${setInstallments})`);

    const usdPayments = await payments.countDocuments({ currency: 'USD' });
    if (!args.dry && usdPayments > 0) {
      await payments.updateMany({ currency: 'USD' }, { $set: { currency: 'ILS' } });
    }
    console.log(`✓ Payment.currency 'USD' → 'ILS'  (${usdPayments})`);

    // ── Subscription ───────────────────────────────────────────────────────
    const renameSubs = await subscriptions.countDocuments({
      stripeSubscriptionId: { $exists: true },
    });
    if (!args.dry && renameSubs > 0) {
      await subscriptions.updateMany(
        { stripeSubscriptionId: { $exists: true } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ $rename: { stripeSubscriptionId: 'gatewaySubscriptionId' } } as any),
      );
    }
    console.log(`✓ Subscription.stripeSubscriptionId → gatewaySubscriptionId  (${renameSubs})`);

    const dropCustomer = await subscriptions.countDocuments({
      stripeCustomerId: { $exists: true },
    });
    if (!args.dry && dropCustomer > 0) {
      await subscriptions.updateMany(
        { stripeCustomerId: { $exists: true } },
        { $unset: { stripeCustomerId: '' } },
      );
    }
    console.log(`✓ Subscription.stripeCustomerId unset  (${dropCustomer})`);

    const setSubGateway = await subscriptions.countDocuments({ gateway: { $exists: false } });
    if (!args.dry && setSubGateway > 0) {
      await subscriptions.updateMany(
        { gateway: { $exists: false } },
        { $set: { gateway: 'payplus' } },
      );
    }
    console.log(`✓ Subscription.gateway = 'payplus' on legacy rows  (${setSubGateway})`);

    const setFailedAttempts = await subscriptions.countDocuments({
      failedAttempts: { $exists: false },
    });
    if (!args.dry && setFailedAttempts > 0) {
      await subscriptions.updateMany(
        { failedAttempts: { $exists: false } },
        { $set: { failedAttempts: 0 } },
      );
    }
    console.log(`✓ Subscription.failedAttempts = 0 on legacy rows  (${setFailedAttempts})`);

    // ── Community ──────────────────────────────────────────────────────────
    const dropConnect = await communities.countDocuments({ stripeAccountId: { $exists: true } });
    if (!args.dry && dropConnect > 0) {
      await communities.updateMany(
        { stripeAccountId: { $exists: true } },
        { $unset: { stripeAccountId: '' } },
      );
    }
    console.log(`✓ Community.stripeAccountId unset  (${dropConnect})`);

    // ── Event.pricing ──────────────────────────────────────────────────────
    const usdEvents = await events.countDocuments({ 'pricing.currency': 'USD' });
    if (!args.dry && usdEvents > 0) {
      await events.updateMany(
        { 'pricing.currency': 'USD' },
        { $set: { 'pricing.currency': 'ILS' } },
      );
    }
    console.log(`✓ Event.pricing.currency 'USD' → 'ILS'  (${usdEvents})`);

    const setMaxInstallments = await events.countDocuments({
      'pricing.maxInstallments': { $exists: false },
    });
    if (!args.dry && setMaxInstallments > 0) {
      await events.updateMany(
        { 'pricing.maxInstallments': { $exists: false } },
        { $set: { 'pricing.maxInstallments': 1 } },
      );
    }
    console.log(`✓ Event.pricing.maxInstallments = 1 on legacy rows  (${setMaxInstallments})`);

    console.log('done.');
  } finally {
    await disconnectDB();
  }
}

run().catch((err) => {
  console.error('migrateStripeToPayplus failed:', err);
  process.exit(1);
});
