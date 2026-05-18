import { Job, Worker } from 'bullmq';

import logger from '@/app/configs/logger.configs';
import { getRedisClient } from '@/app/configs/redis.configs';
import { requestContext } from '@/app/configs/requestContext.configs';
import  prisma  from '@/app/configs/db.configs';
import { getCountryFromGps } from '@/app/utils/geocoder.utils';
import {Redis} from 'ioredis';

export const createSystemWorker = (): Worker => {
  const SystemWorker = new Worker(
    'system-queue',
    async (job: Job) => {
      const { id, name, data } = job;
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
