import { NextFunction, Request, Response } from 'express';

import logger from '@/app/configs/logger.configs';
import { getTraceId } from '@/app/configs/requestContext.configs';

export const globalErrorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const traceId = getTraceId();
  if (err instanceof Error) {
    logger.error({
      traceId: traceId,
      message: err.message,
      stack: err.stack,
    });

    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      traceId: traceId,
    });
    return;
  }

  logger.error({
    traceId,
    message: 'Unexpected Error Occurred In Somewhere',
  });

  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    traceId,
  });

  return;
};
