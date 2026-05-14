import { AsyncResource } from 'async_hooks';
import crypto from 'crypto';
import { unlink } from 'fs/promises';

import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodType } from 'zod';

import {
  TFirebaseCredentials,
  TMailOption,
  TSendNotificationPayload,
} from '@/app/@types/system.types';
import logger from '@/app/configs/logger.configs';
import { getTraceId } from '@/app/configs/requestContext.configs';
import { NOMINATIM_URL } from '@/const';
import { env } from '@/env';

dayjs.extend(utc);
dayjs.extend(timezone);

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
    Promise.resolve(AsyncResource.bind(handler)(req, res, next)).catch(next);
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

const ALLOWED_WRITE_METHODS = ['POST', 'PUT', 'PATCH'] as const;

export const validateReqBody =
  <T>(schema: ZodType<T>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const traceId = getTraceId();
    if (!ALLOWED_WRITE_METHODS.includes(req.method as any)) {
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
        traceId,
      });
      return;
    }
    req.body = result.data;

    next();
  };

const ALLOWED_METHODS = ['GET'] as const;

export const validateReqQuery =
  <T>(schema: ZodType<T>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (
        !ALLOWED_METHODS.includes(
          req.method as (typeof ALLOWED_METHODS)[number]
        )
      ) {
        return next();
      }

      // Convert null prototype object to regular object
      const queryObj = { ...req.query };
      const result = schema.safeParse(queryObj);

      if (!result.success) {
        const errors = result.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'query',
          message: issue.message,
        }));
        res.status(422).json({
          success: false,
          message: 'Request query validation failed',
          errors,
        });
        return;
      }
      // Assign validated data to req.query
      req.validatedQuery = result.data;
      next();
    } catch (error) {
      logger.error('CAUGHT ERROR in validateReqQuery middleware:', error);
      logger.error(
        'Error stack:',
        error instanceof Error ? error.stack : 'No stack'
      );
      next(error);
    }
  };

export async function getCountryFromCoords(
  lat: number,
  lng: number
): Promise<string | null> {
  const url = `${NOMINATIM_URL}?lat=${lat}&lon=${lng}&format=json`;

  const res = await fetch(url, {
    headers: {
      // Nominatim policy requires a User-Agent identifying your app
      'User-Agent': 'YourAppName/1.0 (your@email.com)',
    },
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    address?: { country_code?: string };
  };

  return data.address?.country_code?.toUpperCase() ?? null; // "BD", "US" …
}

export function getFirebaseCredentials(): TFirebaseCredentials {
  return {
    type: env.FIREBASE_ACCOUNT_TYPE,
    project_id: env.FIREBASE_PROJECT_ID,
    private_key_id: env.FIREBASE_PRIVATE_KEY_ID,
    private_key: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Handle escaped newlines
    client_id: env.FIREBASE_CLIENT_ID,
    auth_uri: env.FIREBASE_AUTH_URI,
    token_uri: env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: env.FIREBASE_CLIENT_X509_CERT_URL,
    universe_domain: env.FIREBASE_UNIVERSE_DOMAIN,
    client_email: env.FIREBASE_CLIENT_EMAIL,
  };
}

export async function sendNotification({
  data,
  fcmToken,
  userId,
}: TSendNotificationPayload) {
  try {
    // const user=await
  } catch (error) {
    if (error instanceof Error)
      logger.error(`Error sending notification to user ${userId}:`, error);
    else
      logger.error(
        `Unknown error sending notification to user ${userId}:`,
        error
      );
  }
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}
