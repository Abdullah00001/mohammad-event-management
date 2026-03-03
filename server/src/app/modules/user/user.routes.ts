import { Router } from 'express';

import { signupController } from '@/app/modules/user/user.controllers';
import { findUserWithEmail } from '@/app/modules/user/user.middlewares';
import { signupSchema } from '@/app/modules/user/user.schemas';
import { validateReqBody } from '@/app/utils/system.utils';

const router = Router();

router
  .route('/auth/signup')
  .post(validateReqBody(signupSchema), findUserWithEmail, signupController);

export default router;
