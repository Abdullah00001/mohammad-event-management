import { Request, Response } from 'express';

import { getTraceId } from '@/app/configs/requestContext.configs';
import {
  createEventType,
  deleteEventType,
  getEventTypes,
  updateEventType,
} from '@/app/modules/eventType/eventType.services';
import { asyncHandler } from '@/app/utils/system.utils';

export const createEventTypeController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { title } = req.body;
    const traceId = getTraceId();
    const file = req.file as Express.Multer.File;
    const data = await createEventType({ fileName: file.filename, title });
    res.status(201).json({
      success: true,
      status: 201,
      message: 'Event type creation successful',
      data,
      traceId,
    });
    return;
  }
);

export const updateEventTypeController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const traceId = getTraceId();
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
      message: 'Event type update successful',
      data,
      traceId,
    });
    return;
  }
);

export const deleteEventTypeController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const { id } = req.params;
    await deleteEventType({ id: id as string });
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Event type deletion successful',
      traceId,
    });
    return;
  }
);

export const getSingleEventTypeController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const data = req.eventType;
    const traceId = getTraceId();
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Event type retrieve successful',
      data,
      traceId,
    });
    return;
  }
);

export const getManyEventTypesController = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const data = await getEventTypes();
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Event type retrieve successful',
      data,
      traceId,
    });
    return;
  }
);
