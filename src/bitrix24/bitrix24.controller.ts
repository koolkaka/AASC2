import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  Logger,
  HttpException,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { Bitrix24Service } from './bitrix24.service';
import { TokenService } from './token.service';
import { InstallDto } from './dto/install.dto';

@Controller('bitrix24')
@ApiTags('Bitrix24')
export class Bitrix24Controller {
  private readonly logger = new Logger(Bitrix24Controller.name);

  constructor(
    private readonly bitrix24Service: Bitrix24Service,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Debug endpoint to see what Bitrix24 actually sends
   */
  @Post('install')
  async install(@Body() body: any, @Query() query: any, @Req() req: any) {
    this.logger.log('=== INSTALL REQUEST DEBUG ===');
    this.logger.log('Method:', req.method);
    this.logger.log('Headers:', JSON.stringify(req.headers, null, 2));
    this.logger.log('Query params:', JSON.stringify(query, null, 2));
    this.logger.log('Body:', JSON.stringify(body, null, 2));
    this.logger.log('Raw URL:', req.url);
    this.logger.log('=== END DEBUG ===');

    // Handle different Bitrix24 data formats
    let installData: any = {};

    // Format 1: ONAPPINSTALL event with auth object
    if (body.event === 'ONAPPINSTALL' && body.auth) {
      this.logger.log('🎯 Detected ONAPPINSTALL event format');
      installData = {
        access_token: body.auth.access_token,
        refresh_token: body.auth.refresh_token,
        domain: body.auth.domain,
        member_id: body.auth.member_id,
        expires_in: body.auth.expires_in || 3600,
        scope: body.auth.scope || 'user',
        token_type: 'Bearer',
        client_endpoint: body.auth.client_endpoint,
        server_endpoint: body.auth.server_endpoint,
      };
    }
    // Format 2: Application interface with AUTH_ID (hybrid body+query)
    else if ((body.AUTH_ID || query.AUTH_ID) && (body.DOMAIN || query.DOMAIN)) {
      this.logger.log('🎯 Detected application interface format (hybrid)');
      installData = {
        access_token: body.AUTH_ID || query.AUTH_ID,
        refresh_token: body.REFRESH_ID || query.REFRESH_ID,
        domain: body.DOMAIN || query.DOMAIN,
        member_id: body.member_id || query.member_id,
        expires_in: parseInt(body.AUTH_EXPIRES || query.AUTH_EXPIRES) || 3600,
        scope: 'user', // Default scope
        token_type: 'Bearer',
        placement: body.PLACEMENT || query.PLACEMENT,
        lang: body.LANG || query.LANG,
        protocol: body.PROTOCOL || query.PROTOCOL,
      };
    }
    // Format 3: OAuth code exchange (original format)
    else if (body.code || query.code) {
      this.logger.log('🎯 Detected OAuth code format');
      installData = {
        code: body.code || query.code,
        domain: body.domain || query.domain,
        member_id: body.member_id || query.member_id,
        scope: body.scope || query.scope,
      };
    }

    this.logger.log('Processed install data:', installData);
    
    try {
      // Check if we have direct tokens or need OAuth exchange
      if (installData.access_token && installData.domain) {
        this.logger.log('🚀 Direct token received, saving...');
        
        // Save token directly without OAuth exchange
        const tokenData = {
          access_token: installData.access_token,
          refresh_token: installData.refresh_token,
          expires_in: installData.expires_in,
          token_type: installData.token_type,
          scope: installData.scope,
          domain: installData.domain,
          member_id: installData.member_id,
          expires_at: Math.floor(Date.now() / 1000) + installData.expires_in,
          created_at: Math.floor(Date.now() / 1000),
        };
        
        await this.tokenService.saveToken(tokenData);
        this.logger.log(`✅ Token saved directly for domain: ${installData.domain}`);
        
      } else if (installData.code && installData.domain) {
        this.logger.log('🔄 OAuth code received, exchanging...');
        // Handle OAuth exchange (existing logic)
        const tokenData = await this.bitrix24Service.handleInstall(installData);
        
      } else {
        this.logger.error('Missing required parameters:', installData);
        return {
          success: false,
          message: 'Missing required parameters',
          received: { body, query, installData },
          timestamp: new Date().toISOString(),
        };
      }

      // Test API call to verify installation
      try {
        const contacts = await this.bitrix24Service.getContacts(installData.domain, 0, 5);
        this.logger.log(`✅ Installation successful! Retrieved ${contacts.result?.length || 0} test contacts`);
      } catch (testError) {
        this.logger.warn('Installation completed but API test failed:', testError.message);
      }

      return {
        success: true,
        message: 'Application installed successfully',
        domain: installData.domain,
        member_id: installData.member_id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('❌ Installation failed:', error);
      throw new HttpException(
        {
          success: false,
          message: 'Installation failed',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Alternative GET endpoint for install (some Bitrix24 configurations use GET)
   */
  @Get('install')
  async installGet(@Query() query: any, @Req() req: any) {
    this.logger.log('=== GET INSTALL REQUEST DEBUG ===');
    this.logger.log('Method:', req.method);
    this.logger.log('Query params:', JSON.stringify(query, null, 2));
    this.logger.log('Raw URL:', req.url);
    this.logger.log('=== END GET DEBUG ===');

    try {
      // Validate required parameters
      if (!query.code || !query.domain) {
        this.logger.error('Missing required GET parameters:', query);
        return {
          success: false,
          message: 'Missing required parameters: code and domain',
          received: query,
          timestamp: new Date().toISOString(),
        };
      }

      const installData = {
        code: query.code,
        domain: query.domain,
        member_id: query.member_id || 'unknown',
        scope: query.scope || 'user',
      };

      this.logger.log(`📦 GET Install request received for domain: ${installData.domain}`);

      // Handle the installation
      const tokenData = await this.bitrix24Service.handleInstall(installData);

      // Test API call to verify installation
      try {
        const contacts = await this.bitrix24Service.getContacts(installData.domain, 0, 5);
        this.logger.log(`✅ GET Installation successful! Retrieved ${contacts.result?.length || 0} test contacts`);
      } catch (testError) {
        this.logger.warn('GET Installation completed but API test failed:', testError.message);
      }

      return {
        success: true,
        message: 'Application installed successfully via GET',
        domain: installData.domain,
        member_id: installData.member_id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('GET install failed:', error);
      throw new HttpException(
        'Installation failed via GET method',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Test endpoint to verify API functionality
   */
  @Get('test/:domain')
  async testAPI(@Param('domain') domain: string) {
    try {
      this.logger.log(`🧪 Testing API for domain: ${domain}`);

      // Check if authenticated
      const isAuth = await this.bitrix24Service.isAuthenticated(domain);
      if (!isAuth) {
        throw new HttpException(
          'Domain not authenticated. Please install the app first.',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Test multiple API calls
      const [contacts, appInfo] = await Promise.all([
        this.bitrix24Service.getContacts(domain, 0, 10),
        this.bitrix24Service.getAppInfo(domain),
      ]);

      return {
        success: true,
        domain,
        tests: {
          contacts: {
            total: contacts.total || 0,
            retrieved: contacts.result?.length || 0,
            sample: contacts.result?.slice(0, 3) || [],
          },
          appInfo: {
            status: appInfo ? 'success' : 'failed',
            data: appInfo?.result || null,
          },
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`❌ API test failed for ${domain}:`, error);
      throw new HttpException(
        {
          success: false,
          domain,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get contacts endpoint
   */
  @Get('bitrix/contacts/:domain')
  async getContacts(
    @Param('domain') domain: string,
    @Query('start') start: string = '0',
    @Query('limit') limit: string = '50',
  ) {
    try {
      const startNum = parseInt(start, 10) || 0;
      const limitNum = parseInt(limit, 10) || 50;

      const result = await this.bitrix24Service.getContacts(domain, startNum, limitNum);
      
      return {
        success: true,
        domain,
        pagination: {
          start: startNum,
          limit: limitNum,
          total: result.total || 0,
        },
        data: result.result || [],
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error getting contacts for ${domain}:`, error);
      throw new HttpException(
        {
          success: false,
          domain,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generic API endpoint
   */
  @Post('api/:domain/:method')
  async callAPI(
    @Param('domain') domain: string,
    @Param('method') method: string,
    @Body() payload: any = {},
  ) {
    try {
      this.logger.log(`🔄 API call: ${method} for domain: ${domain}`);

      const result = await this.bitrix24Service.callBitrixAPI(domain, method, payload);
      
      return {
        success: true,
        domain,
        method,
        result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`API call failed - ${method} for ${domain}:`, error);
      throw new HttpException(
        {
          success: false,
          domain,
          method,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Token refresh endpoint
   */
  @Post('refresh/:domain')
  async refreshToken(@Param('domain') domain: string) {
    try {
      this.logger.log(`🔄 Manual token refresh for domain: ${domain}`);

      const newToken = await this.bitrix24Service.refreshToken(domain);
      
      return {
        success: true,
        domain,
        message: 'Token refreshed successfully',
        expires_at: new Date(newToken.expires_at * 1000).toISOString(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Token refresh failed for ${domain}:`, error);
      throw new HttpException(
        {
          success: false,
          domain,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  async healthCheck() {
    return {
      status: 'OK',
      service: 'Bitrix24 OAuth Integration',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  /**
   * Test creating custom field for requisites
   */
  @Post('test-custom-field')
  @ApiOperation({ summary: 'Test creating custom field for requisites' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fieldName: { type: 'string', example: 'UF_CRM_BANK' },
        label: { type: 'string', example: 'Tên ngân hàng' },
        type: { type: 'string', example: 'string' },
      }
    }
  })
  async testCreateCustomField(@Body() body: any) {
    try {
      this.logger.log(`Testing custom field creation:`, body);
      
      const fieldData = {
        ENTITY_ID: 'CRM_REQUISITE',
        FIELD_NAME: body.fieldName,
        USER_TYPE_ID: body.type || 'string',
        SORT: 100,
        MULTIPLE: 'N',
        MANDATORY: 'N',
        SHOW_FILTER: 'E',
        SHOW_IN_LIST: 'Y',
        EDIT_IN_LIST: 'Y',
        IS_SEARCHABLE: 'Y',
        EDIT_FORM_LABEL: body.label,
        LIST_COLUMN_LABEL: body.label,
        LIST_FILTER_LABEL: body.label,
      };

      this.logger.log(`Sending to Bitrix24:`, fieldData);

      const result = await this.bitrix24Service.callBitrixAPI(
        'vietquan.bitrix24.vn', // Default domain for testing
        'crm.requisite.userfield.add',
        { fields: fieldData },
      );

      return {
        success: true,
        message: `Custom field ${body.fieldName} created successfully`,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Error creating custom field:`, error);
      return {
        success: false,
        message: `Error creating custom field: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * List all custom fields for requisites
   */
  @Get('list-custom-fields')
  @ApiOperation({ summary: 'List all custom fields for requisites' })
  async listCustomFields() {
    try {
      this.logger.log(`Getting custom fields list`);
      
      const result = await this.bitrix24Service.callBitrixAPI(
        'vietquan.bitrix24.vn', // Default domain for testing
        'crm.requisite.userfield.list',
        {},
      );

      return {
        success: true,
        message: 'Custom fields retrieved successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error(`Error getting custom fields:`, error);
      return {
        success: false,
        message: `Error getting custom fields: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Test getting requisites for a contact
   */
  @Post('test-get-requisites')
  @ApiOperation({ summary: 'Test getting requisites for a contact' })
  async testGetRequisites(@Body() body: any) {
    try {
      this.logger.log(`Getting requisites for contact:`, body.contactId);
      
      const result = await this.bitrix24Service.callBitrixAPI(
        'vietquan.bitrix24.vn',
        'crm.requisite.list',
        {
          filter: {
            ENTITY_TYPE_ID: 3, // Contact entity type
            ENTITY_ID: body.contactId,
          },
          select: ['*'], // Get all fields
        },
      );

      return {
        success: true,
        message: `Requisites for contact ${body.contactId}`,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Error getting requisites:`, error);
      return {
        success: false,
        message: `Error getting requisites: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * List all authenticated domains
   */
  @Get('domains')
  async listDomains() {
    try {
      const tokens = await this.tokenService.getAllTokens();
      
      return {
        success: true,
        count: tokens.length,
        domains: tokens.map(token => ({
          domain: token.domain,
          member_id: token.member_id,
          created_at: new Date(token.created_at * 1000).toISOString(),
          expires_at: new Date(token.expires_at * 1000).toISOString(),
          is_expired: token.expires_at < Math.floor(Date.now() / 1000),
        })),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error listing domains:', error);
      throw new HttpException(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
