import { Job, Worker } from 'bullmq';
import { compile } from 'handlebars';

import logger from '@/app/configs/logger.configs';
import mailTransporter from '@/app/configs/nodemailer.config';
import { getRedisClient } from '@/app/configs/redis.configs';
import { requestContext } from '@/app/configs/requestContext.configs';
import { signupSuccessfulEmailTemplate } from '@/app/templates/signupSuccessfulEmail.template';
import { signupUserVerifyOtpEmailTemplate } from '@/app/templates/signupUserVerifyOtpEmail.template';
import { mailOption } from '@/app/utils/system.utils';
import { otpExpireAt } from '@/const';

export const createEmailWorker = (): Worker => {
  const EmailWorker = new Worker(
    'email-queue',
    async (job: Job) => {
      const { id, name, data } = job;
      const traceId = (job.data as any)?.traceId ?? 'NO_TRACE_ID';
      return requestContext.run({ traceId }, async () => {
        try {
          switch (name) {
            case 'send-signup-user-verify-otp-email': {
              const { email, otp } = data as {
                email: string;
                otp: string;
              };
              const template = compile(signupUserVerifyOtpEmailTemplate);
              const personalizedTemplate = template({
                email,
                otp,
                otpExpireAt,
              });
              await mailTransporter.sendMail(
                mailOption(
                  email,
                  'Action Required: Verify Your Email Address',
                  personalizedTemplate
                )
              );
              return;
            }
            case 'send-signup-success-email': {
              const { email } = data as { email: string };
              const template = compile(signupSuccessfulEmailTemplate);
              const personalizedTemplate = template({ email });
              await mailTransporter.sendMail(
                mailOption(
                  email,
                  `Welcome to NowOr! We're glad you're here.`,
                  personalizedTemplate
                )
              );
              return;
            }
            default:
              throw new Error(`Unhandled email job: ${name}`);
          }
        } catch (error) {
          logger.error('Worker job failed', {
            jobName: name,
            jobId: id,
            error,
          });
          throw error;
        }
      });
    },
    { connection: getRedisClient() as any }
  );

  EmailWorker.on('completed', (job: Job) => {
    const traceId = (job.data as any)?.traceId ?? 'NO_TRACE_ID';
    requestContext.run({ traceId }, () => {
      logger.info(`Job Name : ${job.name} Job Id : ${job.id} Completed`);
    });
  });

  EmailWorker.on('failed', (job: Job | undefined, error: Error) => {
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
  return EmailWorker;
};
