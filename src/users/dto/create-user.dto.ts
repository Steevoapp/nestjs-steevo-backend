import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be a valid E.164 format',
  })
  phoneNumber: string;
}
