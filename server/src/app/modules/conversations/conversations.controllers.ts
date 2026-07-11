import { Request, Response } from 'express';
import { User } from '@prisma/client';
import { getTraceId } from '@/app/configs/requestContext.configs';
import { asyncHandler } from '@/app/utils/system.utils';
import {
  TGetConversationQuery,
} from '@/app/modules/conversations/conversations.schemas';
import {
  deleteSingleConversationService,
  getConversationsService,
  getSingleConversationService,
} from '@/app/modules/conversations/conversations.services';

export const getConversationsController = asyncHandler(
  async (req: Request, res: Response) => {
    const traceId = getTraceId();
    const user = req.user as User;
    const query = req.validatedQuery as TGetConversationQuery;
    const data = await getConversationsService({ user, query });
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Retrieve my conversations list successful',
      data,
      traceId,
    });
    return;
  }
);

export const getSingleConversationController = asyncHandler(
  async (req: Request, res: Response) => {
    const traceId = getTraceId();
    const user = req.user as User;
    const { id } = req.params as { id: string };
    const data = await getSingleConversationService({ user, id });
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Retrieve single conversation successful',
      data,
      traceId,
    });
    return;
  }
);

export const deleteSingleConversationController = asyncHandler(
  async (req: Request, res: Response) => {
    const traceId = getTraceId();
    const user = req.user as User;
    const { id } = req.params as { id: string };
    await deleteSingleConversationService({ user, id });
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Delete conversation successful',
      traceId,
    });
    return;
  }
);
