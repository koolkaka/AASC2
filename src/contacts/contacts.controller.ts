import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactQueryDto } from './dto/contact-query.dto';
import { ContactResponse, ContactListResponse } from './interfaces/contact.interface';

@ApiTags('Contacts')
@Controller('contacts')
export class ContactsController {
  private readonly logger = new Logger(ContactsController.name);

  constructor(private readonly contactsService: ContactsService) {}

  /**
   * Lấy danh sách contacts từ Bitrix24
   */
  @Get()
  @ApiOperation({ 
    summary: 'Lấy danh sách contacts',
    description: 'Lấy danh sách contacts từ Bitrix24 với phân trang và tìm kiếm'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Danh sách contacts được trả về thành công',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            contacts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: '123' },
                  name: { type: 'string', example: 'Nguyễn Văn A' },
                  lastName: { type: 'string', example: 'Nguyễn' },
                  phone: { type: 'string', example: '+84901234567' },
                  email: { type: 'string', example: 'example@email.com' },
                  website: { type: 'string', example: 'https://example.com' },
                }
              }
            },
            total: { type: 'number', example: 100 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 20 },
            totalPages: { type: 'number', example: 5 }
          }
        },
        timestamp: { type: 'string', example: '2025-09-10T10:30:00.000Z' }
      }
    }
  })
  @ApiResponse({ status: 500, description: 'Lỗi server' })
  async getContacts(@Query() query: ContactQueryDto) {
    try {
      this.logger.log(`📋 Getting contacts with query:`, query);
      
      const result = await this.contactsService.getContacts(query);
      
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error getting contacts:', error);
      throw new HttpException(
        {
          success: false,
          message: 'Không thể lấy danh sách contacts',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Lấy thông tin chi tiết một contact
   */
  @Get(':id')
  @ApiOperation({ 
    summary: 'Lấy thông tin contact theo ID',
    description: 'Lấy thông tin chi tiết của một contact bao gồm cả thông tin ngân hàng'
  })
  @ApiParam({ name: 'id', description: 'ID của contact', example: '123' })
  @ApiResponse({ 
    status: 200, 
    description: 'Thông tin contact được trả về thành công' 
  })
  @ApiResponse({ status: 404, description: 'Contact không tồn tại' })
  @ApiResponse({ status: 500, description: 'Lỗi server' })
  async getContactById(@Param('id') id: string) {
    try {
      this.logger.log(`👤 Getting contact by ID: ${id}`);
      
      const contact = await this.contactsService.getContactById(id);
      
      if (!contact) {
        throw new HttpException(
          {
            success: false,
            message: 'Contact không tồn tại',
            timestamp: new Date().toISOString(),
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: contact,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error getting contact ${id}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          message: 'Không thể lấy thông tin contact',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Thêm contact mới
   */
  @Post()
  @ApiOperation({ 
    summary: 'Thêm contact mới',
    description: 'Tạo contact mới trong Bitrix24 với thông tin cơ bản và ngân hàng'
  })
  @ApiBody({ type: CreateContactDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Contact được tạo thành công',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '123' },
            message: { type: 'string', example: 'Contact được tạo thành công' }
          }
        },
        timestamp: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu đầu vào không hợp lệ' })
  @ApiResponse({ status: 500, description: 'Lỗi server' })
  async createContact(@Body() createContactDto: CreateContactDto) {
    try {
      this.logger.log(`➕ Creating new contact:`, createContactDto.name);
      
      const result = await this.contactsService.createContact(createContactDto);
      
      this.logger.log(`✅ Contact created successfully with ID: ${result.id}`);
      
      return {
        success: true,
        data: {
          id: result.id,
          message: 'Contact được tạo thành công',
          contact: result.contact,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error creating contact:', error);
      throw new HttpException(
        {
          success: false,
          message: 'Không thể tạo contact',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Cập nhật contact
   */
  @Put(':id')
  @ApiOperation({ 
    summary: 'Cập nhật contact',
    description: 'Cập nhật thông tin contact và thông tin ngân hàng trong Bitrix24'
  })
  @ApiParam({ name: 'id', description: 'ID của contact cần cập nhật', example: '123' })
  @ApiBody({ type: UpdateContactDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Contact được cập nhật thành công' 
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu đầu vào không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Contact không tồn tại' })
  @ApiResponse({ status: 500, description: 'Lỗi server' })
  async updateContact(
    @Param('id') id: string,
    @Body() updateContactDto: UpdateContactDto,
  ) {
    try {
      this.logger.log(`✏️ Updating contact ${id}:`, Object.keys(updateContactDto));
      
      const result = await this.contactsService.updateContact(id, updateContactDto);
      
      this.logger.log(`✅ Contact ${id} updated successfully`);
      
      return {
        success: true,
        data: {
          id: id,
          message: 'Contact được cập nhật thành công',
          contact: result.contact,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error updating contact ${id}:`, error);
      
      if (error.message.includes('Contact not found')) {
        throw new HttpException(
          {
            success: false,
            message: 'Contact không tồn tại',
            timestamp: new Date().toISOString(),
          },
          HttpStatus.NOT_FOUND,
        );
      }
      
      throw new HttpException(
        {
          success: false,
          message: 'Không thể cập nhật contact',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Xóa contact
   */
  @Delete(':id')
  @ApiOperation({ 
    summary: 'Xóa contact',
    description: 'Xóa contact và tất cả thông tin liên quan khỏi Bitrix24'
  })
  @ApiParam({ name: 'id', description: 'ID của contact cần xóa', example: '123' })
  @ApiResponse({ 
    status: 200, 
    description: 'Contact được xóa thành công' 
  })
  @ApiResponse({ status: 404, description: 'Contact không tồn tại' })
  @ApiResponse({ status: 500, description: 'Lỗi server' })
  async deleteContact(@Param('id') id: string) {
    try {
      this.logger.log(`🗑️ Deleting contact ${id}`);
      
      await this.contactsService.deleteContact(id);
      
      this.logger.log(`✅ Contact ${id} deleted successfully`);
      
      return {
        success: true,
        data: {
          id: id,
          message: 'Contact được xóa thành công',
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error deleting contact ${id}:`, error);
      
      if (error.message.includes('Contact not found')) {
        throw new HttpException(
          {
            success: false,
            message: 'Contact không tồn tại',
            timestamp: new Date().toISOString(),
          },
          HttpStatus.NOT_FOUND,
        );
      }
      
      throw new HttpException(
        {
          success: false,
          message: 'Không thể xóa contact',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
