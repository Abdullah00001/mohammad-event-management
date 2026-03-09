import { Router } from 'express';

import InterestRoutes from '@/app/modules/interest/interest.routes';
import ProfileRoutes from '@/app/modules/profile/profile.routes';
import RecoverRoutes from '@/app/modules/recover/recover.routes';
import UserTraits from '@/app/modules/survey/survey.routes';
import UserRoutes from '@/app/modules/user/user.routes';

const routes: Router[] = [
  UserRoutes,
  ProfileRoutes,
  InterestRoutes,
  UserTraits,
  RecoverRoutes,
];

const v1Routes = Router();

routes.forEach((route) => v1Routes.use(route));

export default v1Routes;
