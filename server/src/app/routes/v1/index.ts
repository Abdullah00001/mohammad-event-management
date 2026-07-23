import { Router } from 'express';

import EventRoutes from '@/app/modules/event/event.routes';
import EventTypes from '@/app/modules/eventType/eventType.routes';
import InterestRoutes from '@/app/modules/interest/interest.routes';
import ProfileRoutes from '@/app/modules/profile/profile.routes';
import RecoverRoutes from '@/app/modules/recover/recover.routes';
import UserTraits from '@/app/modules/survey/survey.routes';
import UserRoutes from '@/app/modules/user/user.routes';
import NotificationRoutes from '@/app/modules/notification/notification.routes';
import ConnectionRoute from '@/app/modules/connection/connection.routes';
import AttachmentRoutes from '@/app/modules/attachment/attachment.routes';
import Conversations from '@/app/modules/conversations/conversations.routes';
import LegalContentRoutes from '@/app/modules/legalContent/legalContent.routes';

import DashboardRoutes from '@/app/modules/dashboard/dashboard.routes';
import SubscriptionRoutes from '@/app/modules/subscription/subscription.routes';

const routes: Router[] = [
  UserRoutes,
  ProfileRoutes,
  InterestRoutes,
  UserTraits,
  RecoverRoutes,
  EventTypes,
  EventRoutes,
  NotificationRoutes,
  ConnectionRoute,
  AttachmentRoutes,
  Conversations,
  LegalContentRoutes,
  DashboardRoutes,
  SubscriptionRoutes,
];

const v1Routes = Router();

routes.forEach((route) => v1Routes.use(route));

export default v1Routes;
