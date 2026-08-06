import { randomUUID } from 'crypto';
import { Job, Worker } from 'bullmq';

import logger from '@/app/configs/logger.configs';
import { getRedisClient } from '@/app/configs/redis.config';
import { requestContext } from '@/app/configs/requestContext.configs';
import prisma from '@/app/configs/db.configs';
import { EventStatus, NotificationType } from '@prisma/client';
import { getPushNotificationQueue } from '@/app/queues/queues';
import { getCountryFromGps } from '@/app/utils/geocoder.utils';

async function processNotification(params: {
  targetUserIds: string[];
  title: string;
  body: string;
  type: NotificationType;
  metadata?: any;
  traceId: string;
}) {
  const { targetUserIds, title, body, type, metadata, traceId } = params;
  if (targetUserIds.length === 0) return;

  const targetUsers = await prisma.user.findMany({
    where: { id: { in: targetUserIds } },
    include: { userPreference: true, devices: { select: { fcmToken: true } } }
  });

  const inAppTargets: string[] = [];
  const pushTokens: string[] = [];

  targetUsers.forEach(u => {
    const pref = u.userPreference;
    if (pref?.inAppNotifications ?? true) inAppTargets.push(u.id);
    if (pref?.pushNotifications ?? true) {
      u.devices.forEach(d => {
        if (d.fcmToken) pushTokens.push(d.fcmToken);
      });
    }
  });

  // 1. In-App Notification (Database)
  if (inAppTargets.length > 0) {
    const now = new Date();
    const notificationsData = inAppTargets.map((userId) => ({
      id: randomUUID(),
      userId,
      notificationTitle: title,
      notificationDescription: body,
      type,
      ...(metadata && { metadata }),
      isRead: false,
      createdAt: now,
      updatedAt: now,
    }));

    await prisma.notification.createMany({
      data: notificationsData,
    });

    const redis = getRedisClient();
    await redis.publish(
      'socket:notification',
      JSON.stringify({
        type: 'NEW_NOTIFICATION',
        notifications: notificationsData,
      })
    );
  }

  // 2. Push Notification
  if (pushTokens.length > 0) {
    const pushQueue = getPushNotificationQueue();
    await pushQueue.add('send-multicast', {
      jobName: 'send-multicast',
      tokens: pushTokens,
      payload: {
        title,
        body,
        data: { type, ...(metadata && { metadata: JSON.stringify(metadata) }) },
      },
      traceId,
    });
  }
}

export const createSystemWorker = (): Worker => {
  const SystemWorker = new Worker(
    'system-queue',
    async (job: Job) => {
      const { name, data } = job;
      const traceId = (job.data as any)?.traceId ?? 'NO_TRACE_ID';
      return requestContext.run({ traceId }, async () => {
        try {
          switch (name) {
            case 'update-user-visited-country': {
              const { userLocation, userId } = data as {
                userId: string;
                userLocation: {
                  lng: any;
                  lat: any;
                };
              };
              const { lat, lng } = userLocation;
              const userProfile=await prisma.profile.findUnique({where:{userId}});
              if(!userProfile){
                logger.warn(`User profile not found for userId: ${userId}`);
                return;
              }
              const visitedCountries =userProfile.countryVisited || [];
              const countryInfo = await getCountryFromGps(lat, lng);
              if (!countryInfo.countryCode && !countryInfo.countryName) {
                logger.warn(
                  `Could not determine country code for lat: ${lat}, lng: ${lng}`
                );
                return;
              }
              if (!visitedCountries.includes(countryInfo.countryCode)) {
                visitedCountries.push(countryInfo.countryCode);
                await prisma.profile.update({
                  where: { userId },
                  data: { countryVisited: visitedCountries },
                });
                logger.info(
                  `Updated visited countries for userId: ${userId}, added: ${countryInfo.countryCode}`
                );
              } else {
                logger.info(
                  `Country code ${countryInfo.countryCode} already in visited list for userId: ${userId}`
                );
              }
              return;
            }
            case 'reset-user-strikes': {
              const { userId, previousStrikeCount } = data as {
                userId: string;
                previousStrikeCount: number;
              };

              await prisma.user.update({
                where: { id: userId },
                data: {
                  strikeCount: 0,
                  penaltyEndDate: null,
                  lastStrikeDate: null,
                },
              });

              logger.info(
                `Reset strikes for userId: ${userId} (was ${previousStrikeCount})`
              );
              return;
            }
            case 'update-event-status': {
              const { eventId, targetStatus } = data as {
                eventId: string;
                targetStatus: EventStatus;
              };

              const event = await prisma.event.update({
                where: { id: eventId },
                data: { eventStatus: targetStatus },
                select: { id: true, lat: true, lng: true, eventName: true },
              });

              logger.info(
                `Updated event status to ${targetStatus} for eventId: ${eventId}`
              );

              const participants = await prisma.eventParticipants.findMany({
                where: {
                  eventId,
                  role: { not: 'HOST' },
                  leftAt: null,
                },
                select: { id: true, participantId: true, user: { select: { strikeCount: true } } },
              });

              if (targetStatus === 'ONGOING' && participants.length > 0) {
                const targetUserIds = participants.map((p) => p.participantId);
                await processNotification({
                  targetUserIds,
                  title: 'Event Started!',
                  body: `The event "${event.eventName}" has just started.`,
                  type: 'EVENT_STARTED',
                  metadata: { eventId },
                  traceId,
                });
              }

              // ── Automated No-Show Evaluation ───────────────────────
              if (targetStatus === 'COMPLETED') {
                logger.info(`Evaluating no-shows for completed event ${eventId}`);
                
                if (participants.length > 0) {
                  const targetUserIds = participants.map((p) => p.participantId);
                  await processNotification({
                    targetUserIds,
                    title: 'Event Completed!',
                    body: `The event "${event.eventName}" has ended. Hope you had a great time!`,
                    type: 'EVENT_COMPLETED',
                    metadata: { eventId },
                    traceId,
                  });
                }
              }
              return;
            }
            case 'notify-chat-message': {
              const { targetUserIds, senderName, conversationId, messageContent } = data as {
                targetUserIds: string[];
                senderName: string;
                conversationId: string;
                messageContent: string;
              };
              await processNotification({
                targetUserIds,
                title: `New Message from ${senderName}`,
                body: messageContent,
                type: 'CHAT_MESSAGE',
                metadata: { conversationId },
                traceId,
              });
              return;
            }
            case 'notify-friend-request': {
              const { targetUserId, requesterName } = data as {
                targetUserId: string;
                requesterName: string;
              };
              await processNotification({
                targetUserIds: [targetUserId],
                title: 'New Friend Request',
                body: `${requesterName} sent you a friend request.`,
                type: 'FRIEND_REQUEST',
                metadata: {},
                traceId,
              });
              return;
            }
            case 'notify-friend-accept': {
              const { targetUserId, accepterName } = data as {
                targetUserId: string;
                accepterName: string;
              };
              await processNotification({
                targetUserIds: [targetUserId],
                title: 'Friend Request Accepted',
                body: `${accepterName} accepted your friend request.`,
                type: 'FRIEND_ACCEPTED',
                metadata: {},
                traceId,
              });
              return;
            }
            case 'notify-event-join': {
              const { targetUserIds, memberName, eventName, eventId } = data as {
                targetUserIds: string[];
                memberName: string;
                eventName: string;
                eventId: string;
              };
              await processNotification({
                targetUserIds,
                title: 'New Event Member',
                body: `${memberName} has joined "${eventName}".`,
                type: 'EVENT_JOIN',
                metadata: { eventId },
                traceId,
              });
              return;
            }
            case 'notify-nearby-users': {
              const { eventId, eventName, lat, lng, hostId } = data as {
                eventId: string;
                eventName: string;
                lat: number;
                lng: number;
                hostId: string;
              };

              const redis = getRedisClient();
              const nearbyUserIds = await redis.georadius(
                'users:locations',
                lng,
                lat,
                50,
                'km'
              );

              const targetUserIds = (nearbyUserIds as string[]).filter(
                (id) => id !== hostId
              );

              if (targetUserIds.length === 0) {
                logger.info(`No nearby users found for event ${eventId}`);
                return;
              }

              // 1. Save In-App Notifications to DB
              const targetUsers = await prisma.user.findMany({
                where: { id: { in: targetUserIds } },
                include: { userPreference: true, devices: { select: { fcmToken: true } }, profile: { select: { name: true } } }
              });

              const inAppTargets: string[] = [];
              const pushTokens: string[] = [];
              const emailTargets: { email: string, name: string }[] = [];

              targetUsers.forEach(u => {
                const pref = u.userPreference;
                if (pref?.inAppNotifications ?? true) inAppTargets.push(u.id);
                if (pref?.pushNotifications ?? true) {
                  u.devices.forEach(d => {
                    if (d.fcmToken) pushTokens.push(d.fcmToken);
                  });
                }
                if ((pref?.emailNotification ?? true) && u.email) {
                  emailTargets.push({ email: u.email, name: u.profile?.name || 'User' });
                }
              });

              // 1. In-App Notification (Database)
              if (inAppTargets.length > 0) {
                const now = new Date();
                const notificationsData = inAppTargets.map((userId) => ({
                  id: randomUUID(),
                  userId,
                  notificationTitle: 'New Event Nearby!',
                  notificationDescription: `An event "${eventName}" was just created near you.`,
                  type: 'EVENT_NEARBY' as const,
                  metadata: { eventId },
                  isRead: false,
                  createdAt: now,
                  updatedAt: now,
                }));

                await prisma.notification.createMany({
                  data: notificationsData,
                });

                // Socket Notification
                await redis.publish(
                  'socket:notification',
                  JSON.stringify({
                    type: 'NEW_NOTIFICATION',
                    notifications: notificationsData,
                  })
                );
              }

              // 2. Push Notification
              if (pushTokens.length > 0) {
                const pushQueue = getPushNotificationQueue();
                await pushQueue.add('send-multicast', {
                  jobName: 'send-multicast',
                  tokens: pushTokens,
                  payload: {
                    title: 'New Event Nearby!',
                    body: `An event "${eventName}" was just created near you.`,
                    data: {
                      eventId,
                      type: 'NEW_NEARBY_EVENT',
                    },
                  },
                  traceId: `nearby-event-${eventId}-${Date.now()}`,
                });
                logger.info(`Enqueued push notification for ${pushTokens.length} devices near event ${eventId}`);
              }

              // 3. Email Notification
              if (emailTargets.length > 0) {
                const emailQueue = require('@/app/queues/queues').getEmailQueue();
                const emailJobs = emailTargets.map(u => 
                  emailQueue.add('send-nearby-event-email', {
                    email: u.email,
                    eventName,
                    traceId: `nearby-email-${eventId}-${Date.now()}`
                  })
                );
                await Promise.all(emailJobs);
                logger.info(`Enqueued email notification for ${emailTargets.length} users near event ${eventId}`);
              }

              return;
            }
            default:
              logger.warn(`Unknown job name: ${name}`);
              return;
          }
        } catch (error) {
          logger.error(
            `Error processing job ${name}: ${(error as Error).message}`
          );
          throw error;
        }
      });
    },
    {
      connection: getRedisClient() as any,
    }
  );

  SystemWorker.on('completed', (job: Job) => {
    const traceId = (job.data as any)?.traceId ?? 'NO_TRACE_ID';
    requestContext.run({ traceId }, () => {
      logger.info(`Job Name : ${job.name} Job Id : ${job.id} Completed`);
    });
  });

  SystemWorker.on('failed', (job: Job | undefined, error: Error) => {
    if (!job) {
      logger.error(
        `A job failed but the job data is undefined.\nError:\n${error}`
      );
      return;
    }
    const traceId = (job.data as any)?.traceId ?? 'NO_TRACE_ID';
    requestContext.run({ traceId }, () => {
      logger.error(
        `Job Name : ${job.name} Job Id : ${job.id} Failed\nError:\n${error}`
      );
    });
  });

  return SystemWorker;
};
