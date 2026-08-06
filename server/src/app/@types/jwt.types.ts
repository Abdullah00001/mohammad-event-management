import { Role, User } from '@prisma/client';
import { JwtPayload } from 'jsonwebtoken';
import { Socket } from 'socket.io';

export interface ITokenPayload extends JwtPayload {
  sub: string;
  rememberMe?: boolean;
  role: Role;
  isVerified: boolean;
  accountStatus: string;
}

export interface AuthenticatedSocket extends Socket {
  user?: User;
  traceId?: string;
}
