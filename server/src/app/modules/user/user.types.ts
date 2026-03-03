import { AccountStatus, Provider, Role } from "@prisma/client";

export interface IUser {
  id: string;
  email: string;
  password: string;
  isVerified: boolean;
  accountStatus: AccountStatus;
  role: Role;
  provider: Provider;
  providerId: string | null;
  strikeCount: number;
  penaltyEndDate: Date | null;
  lastEventAttendedDate: Date | null;
  isPremium: boolean;
  createdAt: Date;
  updatedAt: Date;
}




