import { Request, Response } from 'express';

import { getTraceId } from '@/app/configs/requestContext.configs';
import {
  createInterest,
  deleteOneInterest,
  getInterest,
  searchInterest,
  updateInterest,
} from '@/app/modules/interest/interest.services';
import { asyncHandler } from '@/app/utils/system.utils';

export const createInterestController = asyncHandler(
  async (req: Request, res: Response) => {
    const traceId = getTraceId();
    const { interestName } = req.body;
    const files = req.file as Express.Multer.File;
    const fileName = files.filename;
    const data = await createInterest({
      interestName,
      interestFileName: fileName,
    });
    res
      .status(200)
      .json({ success: true, message: 'Interest created', data, traceId });
    return;
  }
);

export const updateInterestController = asyncHandler(
  async (req: Request, res: Response) => {
    const traceId = getTraceId();
    const { interestName } = req.body;
    const interest = req.interest;
    const file = req.file;
    const fileName = file?.filename;
    const data = await updateInterest({
      interestName,
      interestFileName: fileName,
      interest,
    });
    res
      .status(200)
      .json({ success: true, message: 'Interest updated', data, traceId });
    return;
  }
);

export const deleteOneInterestController = asyncHandler(
  async (req: Request, res: Response) => {
    const traceId = getTraceId();
    const interest = req.interest;
    await deleteOneInterest({ interest });
    res
      .status(200)
      .json({ success: true, message: 'Interest deleted', traceId });
    return;
  }
);

export const getInterestController = asyncHandler(
  async (_req: Request, res: Response) => {
    const traceId = getTraceId();
    const data = await getInterest();
    res.status(200).json({
      success: true,
      message: 'Interest retrieve successful',
      data,
      traceId,
    });
    return;
  }
);

export const searchInterestController = asyncHandler(
  async (req: Request, res: Response) => {
    const traceId = getTraceId();
    const { interest } = req.query;
    const data = await searchInterest({ interestName: interest as string });
    res.status(200).json({
      success: true,
      message: 'Interest search successful',
      data,
      traceId,
    });
    return;
  }
);
