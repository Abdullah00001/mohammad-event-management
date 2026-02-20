import { JwtPayload } from 'jsonwebtoken';


declare global {
  namespace Express {
    interface Request {
      fileLimit?: number;
      fieldName?: string;
      requireAtLeastOne?: boolean;
      allOptional?: boolean;
      fieldConfig?: FieldConfig[];
      files?: { [fieldname: string]: Express.Multer.File[] };
      user: JwtPayload;
      validatedQuery?: unknown;
    }
  }
}
