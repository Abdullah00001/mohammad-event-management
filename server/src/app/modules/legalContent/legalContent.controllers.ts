import { Request, Response } from 'express';

import { getTraceId } from '@/app/configs/requestContext.configs';
import {
  getAboutUsService,
  getContactAndSupportService,
  getPrivacyPolicyService,
  getSubscriptionAndRefundPolicyService,
  getTermsAndConditionService,
  updateAboutUsService,
  updateContactAndSupportService,
  updatePrivacyPolicyService,
  updateSubscriptionAndRefundPolicyService,
  updateTermsAndConditionService,
} from '@/app/modules/legalContent/legalContent.services';
import { asyncHandler } from '@/app/utils/system.utils';

// ── GET CONTROLLERS ──

export const getPrivacyPolicyController = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const data = await getPrivacyPolicyService();
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Privacy policy retrieved successfully',
      data,
      traceId,
    });
    return;
  }
);

export const getTermsAndConditionController = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const data = await getTermsAndConditionService();
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Terms and condition retrieved successfully',
      data,
      traceId,
    });
    return;
  }
);

export const getAboutUsController = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const data = await getAboutUsService();
    res.status(200).json({
      success: true,
      status: 200,
      message: 'About us retrieved successfully',
      data,
      traceId,
    });
    return;
  }
);

export const getSubscriptionAndRefundPolicyController = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const data = await getSubscriptionAndRefundPolicyService();
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Subscription and refund policy retrieved successfully',
      data,
      traceId,
    });
    return;
  }
);

export const getContactAndSupportController = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const data = await getContactAndSupportService();
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Contact and support retrieved successfully',
      data,
      traceId,
    });
    return;
  }
);

// ── PATCH CONTROLLERS ──

export const updatePrivacyPolicyController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const { content } = req.body;
    const data = await updatePrivacyPolicyService(content);
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Privacy policy updated successfully',
      data,
      traceId,
    });
    return;
  }
);

export const updateTermsAndConditionController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const { content } = req.body;
    const data = await updateTermsAndConditionService(content);
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Terms and condition updated successfully',
      data,
      traceId,
    });
    return;
  }
);

export const updateAboutUsController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const { content } = req.body;
    const data = await updateAboutUsService(content);
    res.status(200).json({
      success: true,
      status: 200,
      message: 'About us updated successfully',
      data,
      traceId,
    });
    return;
  }
);

export const updateSubscriptionAndRefundPolicyController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const { content } = req.body;
    const data = await updateSubscriptionAndRefundPolicyService(content);
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Subscription and refund policy updated successfully',
      data,
      traceId,
    });
    return;
  }
);

export const updateContactAndSupportController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const { content } = req.body;
    const data = await updateContactAndSupportService(content);
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Contact and support updated successfully',
      data,
      traceId,
    });
    return;
  }
);