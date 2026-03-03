import { JwtPayload } from 'jsonwebtoken';

import {IUser} from "@/app/modules/user/user.types"


declare global {
  namespace Express {
    interface Request {
      fileLimit?: number;
      fieldName?: string;
      requireAtLeastOne?: boolean;
      allOptional?: boolean;
      fieldConfig?: FieldConfig[];
      files?: { [fieldname: string]: Express.Multer.File[] };
      user: JwtPayload | IUser;
      validatedQuery?: unknown;
    }
  }
}
