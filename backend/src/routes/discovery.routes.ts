import { Router } from 'express';
import * as discoveryCtl from '../controllers/discovery.controller';
import { verifyToken } from '../middleware/auth';
import { readLimiter, writeLimiter } from '../middleware/rateLimiter';

const router = Router();
router.use(verifyToken);

router.get('/communities', readLimiter, discoveryCtl.listCommunities);
router.post('/communities/:cid/join', writeLimiter, discoveryCtl.joinCommunity);
router.post('/communities/:cid/request', writeLimiter, discoveryCtl.requestJoinCommunity);

export default router;
