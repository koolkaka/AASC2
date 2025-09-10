import { IsString, IsEmail, IsOptional, IsNotEmpty, ValidateNested, IsPhoneNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddressDto {
  @ApiPropertyOptional({ description: 'Phường/Xã' })
  @IsOptional()
  @IsString()
  ward?: string;

  @ApiPropertyOptional({ description: 'Quận/Huyện' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ description: 'Tỉnh/Thành phố' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Địa chỉ chi tiết' })
  @IsOptional()
  @IsString()
  street?: string;
}

export class BankInfoDto {
  @ApiProperty({ description: 'Tên ngân hàng', example: 'Vietcombank' })
  @IsNotEmpty({ message: 'Tên ngân hàng không được để trống' })
  @IsString()
  bankName: string;

  @ApiProperty({ description: 'Số tài khoản', example: '1234567890' })
  @IsNotEmpty({ message: 'Số tài khoản không được để trống' })
  @IsString()
  accountNumber: string;

  @ApiPropertyOptional({ description: 'Tên chủ tài khoản' })
  @IsOptional()
  @IsString()
  accountHolder?: string;
}

export class CreateContactDto {
  @ApiProperty({ description: 'Tên contact', example: 'Nguyễn Văn A' })
  @IsNotEmpty({ message: 'Tên không được để trống' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Họ', example: 'Nguyễn' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại', example: '+84901234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Email', example: 'example@email.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email?: string;

  @ApiPropertyOptional({ description: 'Website', example: 'https://example.com' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ description: 'Địa chỉ', type: AddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiPropertyOptional({ description: 'Thông tin ngân hàng', type: BankInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BankInfoDto)
  bankInfo?: BankInfoDto;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  comments?: string;
}
