import { Request, Response } from 'express';
import { asyncHandler } from '@/app/utils/system.utils';
import { getTraceId } from '@/app/configs/requestContext.configs';
import { KycAttempt, User } from '@prisma/client';
import {
  diditCreateSessionService,
  diditSubmitKycService,
  getKycStatusService,
  processKycWebhookService,
} from '@/app/modules/kyc/kyc.services';
import { DiditWebhookPayload } from '@/app/modules/kyc/kyc.types';

export const createKycSessionController = asyncHandler(
  async (req: Request, res: Response) => {
    const traceId = getTraceId();
    const user = req.user as User;
    const data = await diditCreateSessionService({ user });
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Kyc session created successfully',
      data,
      traceId,
    });
    return;
  }
);

export const submitKycController = asyncHandler(
  async (req: Request, res: Response) => {
    const traceId = getTraceId();
    const user = req.user as User;
    const attempt = req.kycAttempt as KycAttempt;

    await diditSubmitKycService({ user, attempt });

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Verification submitted, awaiting review.',
      traceId,
    });
  }
);

export const handleKycWebhookController = async (req: Request, res: Response) => {
  try {
    const payload = req.kycWebhookPayload as DiditWebhookPayload;
    await processKycWebhookService({ payload });
  } catch (error) {
    // Log the error internally but do not throw
    console.error('Webhook processing failed:', error);
  }
  // Always return 200 to acknowledge receipt (even if processing fails internally)
  res.status(200).json({ received: true });
};

export const getKycStatusController = asyncHandler(
  async (req: Request, res: Response) => {
    const traceId = getTraceId();
    const user = req.user as User;
    const data = await getKycStatusService({ userId: user.id });
    res.status(200).json({
      success: true,
      status: 200,
      message: 'KYC status retrieved successfully',
      data,
      traceId,
    });
  }
);
