import { User } from '@prisma/client';

import { BaseDTO } from '@/app/core/dto.base';

export class SignupResponseDTO extends BaseDTO<User> {
  public id: string;
  public email: string;
  public role: string;
  public isVerified: boolean;
  public accountStatus: string;
  constructor(user: User) {
    super(user);
    this.id = String(user.id);
    this.accountStatus = user.accountStatus;
    this.email = user.email;
    this.role = user.role;
    this.isVerified = user.isVerified;
  }
}
