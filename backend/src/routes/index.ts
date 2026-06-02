import { Router } from 'express';
import authRoutes from './auth.routes';
import healthRoutes from './health.routes';
import superRoutes from './super.routes';
import communityRoutes from './community.routes';
import invitationRoutes from './invitation.routes';
import { communityEventsRouter, eventsRouter } from './event.routes';
import {
  eventCheckoutRouter,
  communityPaymentRouter,
  meSubscriptionsRouter,
  paymentRouter,
} from './payment.routes';
import { communityInitiativesRouter, initiativesRouter } from './initiative.routes';
import { communityPostsRouter, postsRouter } from './post.routes';
import { meNotificationsRouter } from './notification.routes';
import { meAggregatesRouter } from './me.routes';
import { communityAdminRouter } from './admin.routes';
import discoveryRoutes from './discovery.routes';

const apiV1 = Router();

apiV1.use('/', healthRoutes);
apiV1.use('/auth', authRoutes);
apiV1.use('/super', superRoutes);
apiV1.use('/communities', communityRoutes);
apiV1.use('/communities', communityEventsRouter);
apiV1.use('/communities', communityPaymentRouter);
apiV1.use('/communities', communityInitiativesRouter);
apiV1.use('/communities', communityPostsRouter);
apiV1.use('/communities', communityAdminRouter);
apiV1.use('/events', eventsRouter);
apiV1.use('/events', eventCheckoutRouter);
apiV1.use('/initiatives', initiativesRouter);
apiV1.use('/posts', postsRouter);
apiV1.use('/invitations', invitationRoutes);
apiV1.use('/me', meSubscriptionsRouter);
apiV1.use('/me', meNotificationsRouter);
apiV1.use('/me', meAggregatesRouter);
apiV1.use('/discovery', discoveryRoutes);
apiV1.use('/payments', paymentRouter);

export default apiV1;
