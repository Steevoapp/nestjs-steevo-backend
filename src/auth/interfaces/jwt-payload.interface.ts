import { UserRole } from '../../users/entities/user.entity';

export interface JwtPayload {
  phoneNumber: string;
  username: string;
  sub: string;
  role: UserRole;
}
