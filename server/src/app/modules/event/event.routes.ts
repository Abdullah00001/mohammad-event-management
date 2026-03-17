import { Router } from 'express';

import { EventCreateSchema } from '@/app/modules/event/event.schemas';
import { checkAccessToken } from '@/app/modules/user/user.middlewares';
import { validateReqBody } from '@/app/utils/system.utils';

const router = Router();

/**
 * ==================================
 * ---------- USER ROUTES -----------
 * ==================================
 */

router
  .route('/event')
  .post(checkAccessToken, validateReqBody(EventCreateSchema));

export default router;
