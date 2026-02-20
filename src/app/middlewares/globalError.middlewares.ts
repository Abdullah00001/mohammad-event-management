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
  if (err instanceof Error) logger.error(err);
  logger.error('Unknown error occurred');
  res.status(500).json({
    status: 500,
    success:false,
    message: 'Internal server error',
    traceId,
    errors: [
      'The server failed to respond. Please try again later.',
      'The server may be experiencing temporary issues or may have become unresponsive.',
      'If the problem persists, it could indicate a more serious backend issue that requires attention.',
    ],
  });
  return;
};
