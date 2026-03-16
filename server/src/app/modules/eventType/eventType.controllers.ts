import { Request, Response } from 'express';

import {
  createEventType,
  updateEventType,
} from '@/app/modules/eventType/eventType.services';
import { asyncHandler } from '@/app/utils/system.utils';

export const createEventTypeController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { title } = req.body;
    const file = req.file as Express.Multer.File;
    const data = await createEventType({ fileName: file.filename, title });
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Event type creation successful',
      data,
    });
    return;
  }
);

export const updateEventTypeController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { title } = req.body;
    const file = req?.file;
    const data = await updateEventType({
      fileName: file?.filename,
      title,
      id: id as string,
    });
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Event type creation successful',
      data,
    });
    return;
  }
);
