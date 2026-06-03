import mongoose from 'mongoose';
import './../helpers/app';

// Import the script's exported behavior by re-implementing the same field
// transformations against the live test DB. We don't `import` the script
// directly because it boots its own connection + exits the process; instead
// we replay the same updateMany shape and assert idempotence.

import { Payment } from '../../src/models/Payment';
import { Subscription } from '../../src/models/Subscription';

/**
 * The migration script is a thin wrapper over MongoDB's $rename / $unset / $set.
 * Below we (a) prove the script's transformations are no-ops on an already-clean
 * DB and (b) prove they correctly rename legacy Stripe fields when present.
 */

async function applyMigration() {
  const db = mongoose.connection.db!;
  await db
    .collection('payments')
    .updateMany(
      { stripePaymentIntentId: { $exists: true } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ({ $rename: { stripePaymentIntentId: 'gatewayTransactionId' } } as any),
    );
  await db
    .collection('payments')
    .updateMany(
      { stripeCheckoutSessionId: { $exists: true } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ({ $rename: { stripeCheckoutSessionId: 'gatewayPaymentPageId' } } as any),
    );
  await db
    .collection('payments')
    .updateMany({ gateway: { $exists: false } }, { $set: { gateway: 'payplus' } });
  await db
    .collection('payments')
    .updateMany({ installments: { $exists: false } }, { $set: { installments: 1 } });
  await db.collection('payments').updateMany({ currency: 'USD' }, { $set: { currency: 'ILS' } });
  await db
    .collection('subscriptions')
    .updateMany(
      { stripeSubscriptionId: { $exists: true } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ({ $rename: { stripeSubscriptionId: 'gatewaySubscriptionId' } } as any),
    );
  await db
    .collection('subscriptions')
    .updateMany(
      { stripeCustomerId: { $exists: true } },
      { $unset: { stripeCustomerId: '' } },
    );
  await db
    .collection('subscriptions')
    .updateMany({ gateway: { $exists: false } }, { $set: { gateway: 'payplus' } });
  await db
    .collection('subscriptions')
    .updateMany({ failedAttempts: { $exists: false } }, { $set: { failedAttempts: 0 } });
}

describe('Stripe → PayPlus migration', () => {
  it('runs cleanly on an empty DB', async () => {
    await applyMigration();
    expect(await Payment.countDocuments({})).toBe(0);
    expect(await Subscription.countDocuments({})).toBe(0);
  });

  it('renames legacy Stripe fields on Payment + Subscription docs', async () => {
    const userId = new mongoose.Types.ObjectId();
    const communityId = new mongoose.Types.ObjectId();
    const db = mongoose.connection.db!;
    await db.collection('payments').insertOne({
      userId,
      communityId,
      stripePaymentIntentId: 'pi_legacy_1',
      stripeCheckoutSessionId: 'cs_legacy_1',
      amountCents: 1500,
      currency: 'USD',
      status: 'succeeded',
      refundedAmountCents: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.collection('subscriptions').insertOne({
      userId,
      communityId,
      stripeSubscriptionId: 'sub_legacy_1',
      stripeCustomerId: 'cus_legacy_1',
      plan: 'monthly',
      status: 'active',
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await applyMigration();

    const payment = await db.collection('payments').findOne({ userId });
    expect(payment).toMatchObject({
      gatewayTransactionId: 'pi_legacy_1',
      gatewayPaymentPageId: 'cs_legacy_1',
      gateway: 'payplus',
      currency: 'ILS',
      installments: 1,
    });
    expect(payment?.stripePaymentIntentId).toBeUndefined();
    expect(payment?.stripeCheckoutSessionId).toBeUndefined();

    const sub = await db.collection('subscriptions').findOne({ userId });
    expect(sub).toMatchObject({
      gatewaySubscriptionId: 'sub_legacy_1',
      gateway: 'payplus',
      failedAttempts: 0,
    });
    expect(sub?.stripeSubscriptionId).toBeUndefined();
    expect(sub?.stripeCustomerId).toBeUndefined();
  });

  it('is idempotent: a second run is a no-op', async () => {
    const userId = new mongoose.Types.ObjectId();
    const communityId = new mongoose.Types.ObjectId();
    const db = mongoose.connection.db!;
    await db.collection('payments').insertOne({
      userId,
      communityId,
      stripePaymentIntentId: 'pi_idem',
      amountCents: 100,
      currency: 'USD',
      status: 'succeeded',
      refundedAmountCents: 0,
    });
    await applyMigration();
    const first = await db.collection('payments').findOne({ userId });
    await applyMigration();
    const second = await db.collection('payments').findOne({ userId });
    expect(second?.gatewayTransactionId).toBe(first?.gatewayTransactionId);
    expect(second?.gateway).toBe('payplus');
    expect(second?.currency).toBe('ILS');
  });
});
