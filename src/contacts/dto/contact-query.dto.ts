import { IsOptional, IsString, IsNumberString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ContactQueryDto {
  @ApiPropertyOptional({ description: 'Số trang', example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: 'Số trang phải lớn hơn 0' })
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số lượng item per page', example: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: 'Limit phải lớn hơn 0' })
  @Max(100, { message: 'Limit không được vượt quá 100' })
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên', example: 'Nguyễn' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo email', example: 'example@email.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo số điện thoại', example: '0901234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ 
    description: 'Sắp xếp theo field', 
    example: 'ID',
    enum: ['ID', 'NAME', 'LAST_NAME', 'DATE_CREATE', 'DATE_MODIFY']
  })
  @IsOptional()
  @IsString()
  orderBy?: string = 'ID';

  @ApiPropertyOptional({ 
    description: 'Thứ tự sắp xếp', 
    example: 'DESC',
    enum: ['ASC', 'DESC']
  })
  @IsOptional()
  @IsString()
  order?: 'ASC' | 'DESC' = 'DESC';
}
