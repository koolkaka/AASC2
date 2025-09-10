import { IsString, IsNotEmpty } from 'class-validator';

export class InstallDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  domain: string;

  @IsString()
  @IsNotEmpty()
  member_id: string;

  @IsString()
  @IsNotEmpty()
  scope: string;
}
