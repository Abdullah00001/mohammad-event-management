import { JwtPayload } from 'jsonwebtoken';


export enum Role {
  ADMIN = 'admin',
  USER = 'user',
}

export interface ITokenPayload extends JwtPayload {
  sub: string;
  rememberMe?: boolean;
  role: Role;
  isVerified: boolean;
}
