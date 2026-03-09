import { Interest, Profile, User } from '@prisma/client';
import { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      fileLimit?: number;
      fieldName?: string;
      requireAtLeastOne?: boolean;
      allOptional?: boolean;
      fieldConfig?: FieldConfig[];
      fileRequired: boolean;
      files?: { [fieldname: string]: Express.Multer.File[] };
      user: JwtPayload | User;
      profile:Profile
      validatedQuery?: unknown;
      interest: Interest;
    }
  }
}
