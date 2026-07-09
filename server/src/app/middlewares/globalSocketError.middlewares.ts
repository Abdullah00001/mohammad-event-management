import logger from '@/app/configs/logger.configs';
import { getTraceId } from '@/app/configs/requestContext.configs';
import { AuthenticatedSocket } from '@/app/@types/jwt.types';

export const globalSocketErrorMiddleware = (
  err: Error,
  socket: AuthenticatedSocket
) => {
  const traceId = getTraceId() || socket.traceId;

  if (err instanceof Error) {
    logger.error({
      traceId,
      message: err.message,
      stack: err.stack,
    });

    socket.emit('error', {
      success: false,
      message: err.message || 'Internal Server Error',
      traceId,
    });
    return;
  }

  logger.error({
    traceId,
    message: 'Unexpected Socket Error Occurred',
  });

  socket.emit('error', {
    success: false,
    message: 'Internal Server Error',
    traceId,
  });
};
