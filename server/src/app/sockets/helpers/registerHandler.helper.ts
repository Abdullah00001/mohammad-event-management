import logger from '@/app/configs/logger.configs';
import { TRegisterHandler } from '@/app/sockets/types/helper.types';

const registerHandler = ({ events, socket }: TRegisterHandler) => {
  events.forEach(({ eventName, handler }) => {
    socket.on(eventName, async (data) => {
      try {
        await handler(socket, data);
      } catch (error) {
        logger.error(`Error in event handler for ${eventName}: ${error}`);
        socket.emit('error', {
          message: `Error in event handler for ${eventName}`,
        });
      }
    });
  });
};

export default registerHandler;
