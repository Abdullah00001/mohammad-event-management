import crypto from 'crypto';
import { unlink } from 'fs/promises';
import { Server } from 'node:http';

import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodType } from 'zod';

import { TMailOption } from '@/app/@types/system.types';
import { disconnectDatabase } from '@/app/configs/db.configs';
import logger from '@/app/configs/logger.configs';
import { disconnectRedis } from '@/app/configs/redis.config';

dayjs.extend(utc);
dayjs.extend(timezone);

type TShutdown = {
  reason: string;
  server: Server;
  error?: unknown;
};

let isShuttingDown = false;

export const shutdown = async ({
  reason,
  server,
  error,
}: TShutdown): Promise<void> => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.warn(`Shutdown started: ${reason}`);

  if (error) {
    logger.error(error);
  }

  /**
   * Force exit after timeout (Docker / K8s safety)
   */
  const forceExitTimer = setTimeout(() => {
    logger.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 30_000);

  try {
    /**
     * Stop accepting new connections
     */
    await new Promise<void>((resolve) => {
      server.close(() => {
        logger.info('HTTP server closed');
        resolve();
      });
    });
    // Close DB, Redis, queues here
    await disconnectRedis();
    await disconnectDatabase();
  } catch (err) {
    logger.error('Error during shutdown', err);
  } finally {
    clearTimeout(forceExitTimer);

    /**
     * Exit code matters:
     * - 0 = graceful (SIGTERM, SIGINT)
     * - 1 = crash (exceptions)
     */
    const exitCode = reason === 'SIGINT' || reason === 'SIGTERM' ? 0 : 1;

    process.exit(exitCode);
  }
};

/**
 * Wraps an async Express route handler and forwards
 * any thrown error or rejected promise to `next()`.
 *
 * This enables centralized error handling and avoids
 * repetitive try/catch blocks in controllers.
 *
 * @example
 * router.get(
 *   '/users',
 *   asyncHandler(controller.getUsers)
 * );
 */
export const asyncHandler =
  (handler: RequestHandler): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

/* ------------------------------------------------------------------
 * TIME & CALCULATION
 * ------------------------------------------------------------------ */

export function calculateMilliseconds(value: number, unit: string): number {
  switch (unit.toLowerCase()) {
    case 'millisecond':
    case 'milliseconds':
      return value;
    case 'second':
    case 'seconds':
      return value * 1000;
    case 'minute':
    case 'minutes':
      return value * 60 * 1000;
    case 'hour':
    case 'hours':
      return value * 60 * 60 * 1000;
    case 'day':
    case 'days':
      return value * 24 * 60 * 60 * 1000;
    default:
      return NaN;
  }
}

export function stringToNumber(value: string): number {
  return Number(value.slice(0, -1));
}

export function expiresInTimeUnitToMs(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) throw new Error('Invalid expiresIn format');

  const value = Number(match[1]);
  const unit = match[2];

  const map: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * map[unit];
}

/* ------------------------------------------------------------------
 * ETAG
 * ------------------------------------------------------------------ */

export function generateEtag(data: unknown): string {
  try {
    const dataString = JSON.stringify(data);
    return crypto.createHash('md5').update(dataString).digest('hex');
  } catch (error) {
    throw new Error(
      `Failed to generate ETag: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/* ------------------------------------------------------------------
 * DATE
 * ------------------------------------------------------------------ */

export function formatDate(isoDateString: string): string {
  const date = new Date(isoDateString);
  if (isNaN(date.getTime())) throw new Error('Invalid date string');

  return dayjs(date).format('D MMMM YYYY');
}

export function formatDateTime(
  isoString: string,
  timeZone = 'Asia/Dhaka'
): string {
  return dayjs(isoString).tz(timeZone).format('MMMM D, YYYY [at] hh:mm A (z)');
}

export function calculateFutureDate(duration: string): string {
  const ms = expiresInTimeUnitToMs(duration);
  return new Date(Date.now() + ms).toISOString();
}

export function compareDate(oldDate: Date, duration: string): boolean {
  const ms = expiresInTimeUnitToMs(duration);
  return Date.now() - new Date(oldDate).getTime() >= ms;
}

/* ------------------------------------------------------------------
 * FILE OPERATIONS
 * ------------------------------------------------------------------ */

export async function unlinkFile({
  filePath,
}: {
  filePath: string;
}): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown Error Occurred In File Unlink Utility');
  }
}

export function extractS3KeyFromUrl(url: string): string {
  // Extract key from URL: https://bucket.s3.region.amazonaws.com/avatars/userId/timestamp.png
  const urlParts = url.split('.amazonaws.com/');
  return urlParts[1];
}

export function mailOption(
  to: string,
  subject: string,
  html: string
): TMailOption {
  const option: TMailOption = {
    from: process.env.SMTP_USER as string,
    to,
    subject,
    html,
  };
  return option;
}

const ALLOWED_METHODS = ['POST', 'PUT', 'PATCH'] as const;

export const validateReqBody =
  <T>(schema: ZodType<T>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    if (!ALLOWED_METHODS.includes(req.method as any)) {
      return next();
    }

    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      }));
      res.status(422).json({
        success: false,
        message: 'Request body validation failed',
        errors,
      });
      return;
    }
    req.body = result.data;

    next();
  };
