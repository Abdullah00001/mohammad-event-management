import { Request, Response } from 'express';

import { asyncHandler } from '@/app/utils/system.utils';
import { getTraceId } from '@/app/configs/requestContext.configs';
import {
  blockOneConnectionService,
  getMyConnectionRequestsService,
  getMyConnectionService,
  getMySingleConnectionService,
  manageMyConnectionRequestService,
  sendFriendRequestService,
} from '@/app/modules/connection/connection.services';
import { User } from '@prisma/client';
import { TSendFriendRequestPayload } from '@/app/modules/connection/connection.schemas';

export const getMyConnectionController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;
    const { limit, page, search } = req.query as {
      page: string | undefined;
      limit: string | undefined;
      search: string | undefined;
    };
    const data = await getMyConnectionService({
      user,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
    res.status(200).json({
      success: true,
      status: 200,
      message: 'All connection retrieve successful',
      data,
      traceId,
    });
    return;
  }
);

export const getMySingleConnectionController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const { id } = req.params as { id: string };
    const data = await getMySingleConnectionService({ id });
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Single connection retrieve successful',
      data,
      traceId,
    });
    return;
  }
);

export const getMyConnectionRequestsController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;
    const { limit, page } = req.query as {
      page: string | undefined;
      limit: string | undefined;
    };
    const data = await getMyConnectionRequestsService({
      user,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.status(200).json({
      success: true,
      status: 200,
      message: 'All connection retrieve successful',
      data,
      traceId,
    });
    return;
  }
);

export const manageMyConnectionRequestsController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;
    const { requestStatus, requestId } = req.body;
    await manageMyConnectionRequestService({ user, requestStatus, requestId });
    res.status(200).json({
      success: true,
      status: 200,
      message: `Connection request ${requestStatus} successful`,
      traceId,
    });
    return;
  }
);

export const blockOneConnectionController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;
    const { id } = req.params as { id: string };
    const { blockStatus } = req.body;
    await blockOneConnectionService({ user, id, blockStatus });
    res.status(200).json({
      success: true,
      status: 200,
      message: `Connection blocking successful`,
      traceId,
    });
    return;
  }
);

export const sendFriendRequestController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;
    const payload = req.body as TSendFriendRequestPayload;
    const data = await sendFriendRequestService({ payload, user });
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Request send successful',
      data,
      traceId,
    });
    return;
  }
);
