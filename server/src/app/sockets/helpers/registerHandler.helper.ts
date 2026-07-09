import { globalSocketErrorMiddleware } from '@/app/middlewares/globalSocketError.middlewares';
import { TRegisterHandler } from '@/app/sockets/types/helper.types';
import { AuthenticatedSocket } from '@/app/@types/jwt.types';

const registerHandler = ({ events, socket }: TRegisterHandler) => {
  events.forEach(({ eventName, handler }) => {
    socket.on(eventName, async (data) => {
      try {
        await handler(socket, data);
      } catch (error) {
        globalSocketErrorMiddleware(
          error as Error,
          socket as AuthenticatedSocket
        );
      }
    });
  });
};

export default registerHandler;
