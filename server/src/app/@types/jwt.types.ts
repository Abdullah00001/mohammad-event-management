import { Role } from '@prisma/client';
import { JwtPayload } from 'jsonwebtoken';



export interface ITokenPayload extends JwtPayload {
  sub: string;
  rememberMe?: boolean;
  role: Role;
  isVerified: boolean;
}
