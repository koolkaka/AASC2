import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { Bitrix24Controller } from './bitrix24.controller';
import { Bitrix24Service } from './bitrix24.service';
import { TokenService } from './token.service';

@Module({
  imports: [HttpModule],
  controllers: [Bitrix24Controller],
  providers: [Bitrix24Service, TokenService],
  exports: [Bitrix24Service],
})
export class Bitrix24Module {}
