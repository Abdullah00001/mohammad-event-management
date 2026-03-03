import { Router } from 'express';

import ProfileRoutes from "@/app/modules/profile/profile.routes";
import UserRoutes from "@/app/modules/user/user.routes";

const routes: Router[] = [UserRoutes,ProfileRoutes];

const v1Routes = Router();

routes.forEach((route) => v1Routes.use(route));

export default v1Routes;
