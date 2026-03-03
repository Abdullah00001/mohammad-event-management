import { BaseDTO } from '@/app/core/dto.base';
import {IUser} from '@/app/modules/user/user.types'

export class SignupResponseDTO extends BaseDTO<IUser> {
  public id: string;
  public email: string;
  public role: string;
  public isVerified: boolean;
  public accountStatus: string;
  constructor(user: IUser) {
    super(user);
    this.id = String(user.id);
    this.accountStatus = user.accountStatus;
    this.email = user.email;
    this.role = user.role;
    this.isVerified = user.isVerified;
  }
}
