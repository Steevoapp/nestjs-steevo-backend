import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AuthCredentialsDto {
  @ApiProperty({ example: '+61912345678' })
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'phoneNumber must be a valid phone number',
  })
  phoneNumber: string;
}
