import { NextFunction, Request, Response } from 'express';
import { User, KycAttemptStatus } from '@prisma/client';
import prisma from '@/app/configs/db.configs';
import { getTraceId } from '@/app/configs/requestContext.configs';
import { asyncHandler } from '@/app/utils/system.utils';
import { env } from '@/env';
import crypto from 'crypto';

export const checkActiveKycAttemptMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const traceId = getTraceId();
    const user = req.user as User;

    // We check if there's any attempt that is PENDING or REVIEW.
    // If a user has an APPROVED attempt, we allow them to re-verify if needed.
    const activeAttempt = await prisma.kycAttempt.findFirst({
      where: {
        userId: user.id,
        status: {
          in: [KycAttemptStatus.PENDING, KycAttemptStatus.REVIEW],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (activeAttempt) {
      res.status(400).json({
        success: false,
        status: 400,
        message:
          'You already have an active KYC verification in progress. Please wait for the outcome.',
        traceId,
      });
      return;
    }

    next();
  }
);

export const checkKycAttemptExistsMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const traceId = getTraceId();
    const user = req.user as User;
    const { sessionId } = req.body;

    if (!sessionId) {
      res.status(400).json({
        success: false,
        status: 400,
        message: 'sessionId is required',
        traceId,
      });
      return;
    }

    const attempt = await prisma.kycAttempt.findFirst({
      where: {
        sessionId,
        userId: user.id,
      },
    });

    if (!attempt) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'Session not found',
        traceId,
      });
      return;
    }

    req.kycAttempt = attempt;
    next();
  }
);

function verifySignature(
  rawPayload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedHex = crypto
      .createHmac('sha256', secret)
      .update(rawPayload)
      .digest('hex');
    
    let incomingHex = signature;
    if (incomingHex.startsWith('sha256=')) {
      incomingHex = incomingHex.slice(7);
    }

    if (incomingHex.length !== expectedHex.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(incomingHex),
      Buffer.from(expectedHex)
    );
  } catch {
    return false;
  }
}

export const verifyKycWebhookSignature = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const sigHeaders = [
      req.headers['x-signature-v2'] as string,
      req.headers['x-signature'] as string,
      req.headers['x-signature-simple'] as string,
      req.headers['x-didit-signature'] as string
    ].filter(Boolean);

    const timestamp = req.headers['x-timestamp'] as string;

    if (sigHeaders.length === 0) {
      console.log('[DEBUG_MISSING_SIGNATURE]', JSON.stringify(req.headers));
      res.status(401).json({ error: 'Missing signature' });
      return;
    }

    // Since we used raw({ type: 'application/json' }), req.body is a Buffer
    if (!Buffer.isBuffer(req.body)) {
      res.status(400).json({ error: 'Invalid request body format' });
      return;
    }

    let rawPayload = req.body.toString('utf8');
    
    const payloadsToTest = [
      rawPayload,
      rawPayload.trim(),
      (() => { try { return JSON.stringify(JSON.parse(rawPayload)); } catch { return null; } })(),
      timestamp ? `${timestamp}.${rawPayload}` : null,
      timestamp ? `${timestamp}${rawPayload}` : null,
      timestamp ? `${timestamp}.${rawPayload.trim()}` : null,
      timestamp ? `${timestamp}${rawPayload.trim()}` : null,
    ].filter(Boolean) as string[];

    let isValid = false;
    let matchedSig = '';

    for (const sig of sigHeaders) {
      for (const payload of payloadsToTest) {
        if (verifySignature(payload, sig, env.DIDIT_WEBHOOK_SECRET)) {
          isValid = true;
          matchedSig = sig;
          break;
        }
      }
      if (isValid) break;
    }

    console.log('[DEBUG_WEBHOOK]', {
      sigHeaders,
      rawPayloadLength: rawPayload.length,
      timestamp,
      isValid,
      matchedSig
    });

    if (!isValid) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    // Attach the parsed payload to the request for later use
    try {
      req.kycWebhookPayload = JSON.parse(rawPayload);
    } catch (error) {
      res.status(400).json({ error: 'Invalid JSON payload' });
      return;
    }
    
    next();
  }
);
