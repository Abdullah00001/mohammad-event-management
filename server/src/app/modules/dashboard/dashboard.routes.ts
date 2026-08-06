import { Router } from 'express';
import {
  getStatsController,
  getUserActivityController,
  getEarningsController,
} from '@/app/modules/dashboard/dashboard.controllers';
import { checkAdminAccessToken } from '@/app/modules/user/user.middlewares';

const router = Router();

router.route('/admin/dashboard/stats').get(checkAdminAccessToken, getStatsController);
router.route('/admin/dashboard/user-activity').get(checkAdminAccessToken, getUserActivityController);
router.route('/admin/dashboard/earnings').get(checkAdminAccessToken, getEarningsController);

export default router;
