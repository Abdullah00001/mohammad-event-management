import { Request, Response } from 'express';

import { getTraceId } from '@/app/configs/requestContext.configs';
import {
  deleteAttachmentFromS3Service,
  uploadAttachmentToS3Service,
} from '@/app/modules/attachment/attachment.services';
import { asyncHandler } from '@/app/utils/system.utils';

export const uploadAttachmentController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const files = req.files as Express.Multer.File[];

    const results = await uploadAttachmentToS3Service(files);

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Attachments uploaded successfully',
      data: results,
      traceId,
    });
    return;
  }
);

export const deleteAttachmentController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const { key } = req.body;

    const result = await deleteAttachmentFromS3Service(key);

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Attachment deleted successfully',
      data: result,
      traceId,
    });
    return;
  }
);