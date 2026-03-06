import { Request, Response } from 'express';

import { createInterest } from './interest.services';

import { getTraceId } from '@/app/configs/requestContext.configs';
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
