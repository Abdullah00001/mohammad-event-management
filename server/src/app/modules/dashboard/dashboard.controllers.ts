import { Request, Response } from 'express';
import { getTraceId } from '@/app/configs/requestContext.configs';
import { asyncHandler } from '@/app/utils/system.utils';
import {
  getStatsService,
  getUserActivityService,
  getEarningsService,
} from '@/app/modules/dashboard/dashboard.services';

export const getStatsController = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const data = await getStatsService();
    res.status(200).json({
      success: true,
      message: 'Stats retrieved successfully',
      data,
      traceId,
    });
  }
);

export const getUserActivityController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const { year } = req.query as { year?: string };
    const data = await getUserActivityService({ year: year ? parseInt(year, 10) : new Date().getFullYear() });
    res.status(200).json({
      success: true,
      message: 'User activity retrieved successfully',
      data,
      traceId,
    });
  }
);

export const getEarningsController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const { year } = req.query as { year?: string };
    const data = await getEarningsService({ year: year ? parseInt(year, 10) : new Date().getFullYear() });
    res.status(200).json({
      success: true,
      message: 'Earnings retrieved successfully',
      data,
      traceId,
    });
  }
);
