import { Queue } from 'bullmq';

import { createQueueOptions } from '@/app/configs/queue.configs';
import {
  ESubscriptionWebhookJobName,
  TSubscriptionWebhookJobData,
} from '@/app/@types/queue.types';

let _pushNotificationQueue: Queue | null = null;
let _emailQueue: Queue | null = null;

export const getPushNotificationQueue = (): Queue => {
  if (!_pushNotificationQueue) {
    _pushNotificationQueue = new Queue('push-notification-queue', createQueueOptions());
  }
  return _pushNotificationQueue;
};

let _subscriptionWebhookQueue: Queue<
  TSubscriptionWebhookJobData,
  void,
  ESubscriptionWebhookJobName
> | null = null;

export const getSubscriptionWebhookQueue = () => {
  if (!_subscriptionWebhookQueue) {
    _subscriptionWebhookQueue = new Queue<
      TSubscriptionWebhookJobData,
      void,
      ESubscriptionWebhookJobName
    >('subscription-webhook-queue', createQueueOptions());
  }
  return _subscriptionWebhookQueue;
};

export const getEmailQueue = (): Queue => {
  if (!_emailQueue) {
    _emailQueue = new Queue('email-queue', createQueueOptions());
  }
  return _emailQueue;
};
