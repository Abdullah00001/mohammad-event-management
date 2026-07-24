import { Queue } from 'bullmq';

import { createQueueOptions } from '@/app/configs/queue.configs';
import {
  EPushNotificationJobName,
  TPushNotificationJobData,
  ESubscriptionWebhookJobName,
  TSubscriptionWebhookJobData,
  EEventLifecycleJobName,
  TEventLifecycleJobData,
} from '@/app/@types/queue.types';

let _emailQueue: Queue | null = null;
let systemQueue: Queue | null = null;
let _pushNotificationQueue: Queue<
  TPushNotificationJobData,
  void,
  EPushNotificationJobName
> | null = null;

export const getEmailQueue = () => {
  if (!_emailQueue) {
    _emailQueue = new Queue('email-queue', createQueueOptions());
  }
  return _emailQueue;
};

export const getSystemQueue = () => {
  if (!systemQueue) {
    systemQueue = new Queue('system-queue', createQueueOptions());
  }
  return systemQueue;
};

export const getPushNotificationQueue = () => {
  if (!_pushNotificationQueue) {
    _pushNotificationQueue = new Queue<
      TPushNotificationJobData,
      void,
      EPushNotificationJobName
    >('push-notification-queue', createQueueOptions());
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

let _eventLifecycleQueue: Queue<
  TEventLifecycleJobData,
  void,
  EEventLifecycleJobName
> | null = null;

export const getEventLifecycleQueue = () => {
  if (!_eventLifecycleQueue) {
    _eventLifecycleQueue = new Queue<
      TEventLifecycleJobData,
      void,
      EEventLifecycleJobName
    >('event-lifecycle-queue', createQueueOptions());
  }
  return _eventLifecycleQueue;
};
