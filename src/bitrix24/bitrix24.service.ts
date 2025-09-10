import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service';
import { TokenData, InstallRequest, BitrixApiResponse } from './interfaces/token.interface';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

@Injectable()
export class Bitrix24Service {
  private readonly logger = new Logger(Bitrix24Service.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Handle app installation - exchange code for tokens
   */
  async handleInstall(installRequest: InstallRequest): Promise<TokenData> {
    try {
      this.logger.log(`Handling install for domain: ${installRequest.domain}`);

      const tokenData = await this.exchangeCodeForToken(installRequest);
      await this.tokenService.saveToken(tokenData);

      this.logger.log(`Installation completed for domain: ${installRequest.domain}`);
      return tokenData;
    } catch (error) {
      this.logger.error('Error during installation:', error);
      throw new HttpException(
        `Installation failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Exchange authorization code for access token
   */
  private async exchangeCodeForToken(installRequest: InstallRequest): Promise<TokenData> {
    const clientId = this.configService.get<string>('CLIENT_ID');
    const clientSecret = this.configService.get<string>('CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('CLIENT_ID and CLIENT_SECRET must be configured');
    }

    const tokenUrl = `https://${installRequest.domain}/oauth/token/`;
    const payload = {
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code: installRequest.code,
      scope: installRequest.scope,
    };

    try {
      this.logger.debug(`Exchanging code for token: ${tokenUrl}`);
      
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(tokenUrl, payload, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 30000,
        }),
      );

      const tokenData: TokenData = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in || 3600,
        token_type: response.data.token_type || 'Bearer',
        scope: response.data.scope || installRequest.scope || 'user',
        domain: installRequest.domain,
        member_id: installRequest.member_id,
        expires_at: Math.floor(Date.now() / 1000) + (response.data.expires_in || 3600),
        created_at: Math.floor(Date.now() / 1000),
      };

      this.logger.log('Token exchange successful');
      return tokenData;
    } catch (error) {
      this.logger.error('Token exchange failed:', error.response?.data || error.message);
      throw new Error(`Token exchange failed: ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(domain: string): Promise<TokenData> {
    const existingToken = await this.tokenService.getToken(domain);
    if (!existingToken) {
      throw new Error(`No token found for domain: ${domain}`);
    }

    const clientId = this.configService.get<string>('CLIENT_ID');
    const clientSecret = this.configService.get<string>('CLIENT_SECRET');

    const refreshUrl = `https://${domain}/oauth/token/`;
    const payload = {
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: existingToken.refresh_token,
    };

    try {
      this.logger.debug(`Refreshing token for domain: ${domain}`);

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(refreshUrl, payload, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 30000,
        }),
      );

      const tokenData: TokenData = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in || 3600,
        token_type: response.data.token_type || 'Bearer',
        scope: response.data.scope || existingToken.scope || 'user',
        domain: domain,
        member_id: existingToken.member_id,
        expires_at: Math.floor(Date.now() / 1000) + (response.data.expires_in || 3600),
        created_at: Math.floor(Date.now() / 1000),
      };

      await this.tokenService.saveToken(tokenData);
      this.logger.log(`Token refreshed successfully for domain: ${domain}`);
      
      return tokenData;
    } catch (error) {
      this.logger.error('Token refresh failed:', error.response?.data || error.message);
      throw new Error(`Token refresh failed: ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getValidAccessToken(domain: string): Promise<string> {
    const isExpired = await this.tokenService.isTokenExpired(domain);
    
    if (isExpired) {
      this.logger.debug(`Token expired for ${domain}, refreshing...`);
      const newToken = await this.refreshToken(domain);
      return newToken.access_token;
    }

    const token = await this.tokenService.getToken(domain);
    if (!token) {
      throw new Error(`No token found for domain: ${domain}`);
    }

    return token.access_token;
  }

  /**
   * Generic method to call Bitrix24 API
   */
  async callBitrixAPI<T = any>(
    domain: string,
    method: string,
    payload: Record<string, any> = {},
    usePost: boolean = true,
  ): Promise<BitrixApiResponse<T>> {
    try {
      const accessToken = await this.getValidAccessToken(domain);
      const apiUrl = `https://${domain}/rest/${method}`;

      const params = {
        ...payload,
        auth: accessToken,
      };

      this.logger.debug(`Calling Bitrix24 API: ${method} for domain: ${domain}`);

      let response: AxiosResponse;

      if (usePost) {
        response = await firstValueFrom(
          this.httpService.post(apiUrl, params, {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          }),
        );
      } else {
        response = await firstValueFrom(
          this.httpService.get(apiUrl, {
            params,
            timeout: 30000,
          }),
        );
      }

      if (response.data.error) {
        throw new Error(`Bitrix24 API Error: ${response.data.error_description}`);
      }

      this.logger.debug(`API call successful: ${method}`);
      return response.data;
    } catch (error) {
      this.logger.error(`API call failed for ${method}:`, error.response?.data || error.message);
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        // Token might be invalid, try to refresh
        try {
          this.logger.debug('Attempting token refresh due to 401 error');
          await this.refreshToken(domain);
          // Retry the API call once
          return this.callBitrixAPI(domain, method, payload, usePost);
        } catch (refreshError) {
          this.logger.error('Token refresh failed:', refreshError);
          throw new HttpException(
            'Authentication failed and token refresh unsuccessful',
            HttpStatus.UNAUTHORIZED,
          );
        }
      }

      // Handle timeout errors
      if (error.code === 'ECONNABORTED') {
        throw new HttpException(
          'Request timeout - Bitrix24 API is not responding',
          HttpStatus.REQUEST_TIMEOUT,
        );
      }

      // Handle network errors
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new HttpException(
          'Network error - Unable to connect to Bitrix24',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new HttpException(
        `Bitrix24 API Error: ${error.response?.data?.error_description || error.message}`,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Test API call - Get CRM contacts
   */
  async getContacts(domain: string, start: number = 0, limit: number = 50): Promise<any> {
    try {
      const result = await this.callBitrixAPI(
        domain,
        'crm.contact.list',
        {
          start,
          select: ['ID', 'NAME', 'LAST_NAME', 'EMAIL', 'PHONE'],
          order: { ID: 'DESC' },
          filter: {},
        },
      );

      this.logger.log(`Retrieved ${result.result?.length || 0} contacts from domain: ${domain}`);
      return result;
    } catch (error) {
      this.logger.error('Error getting contacts:', error);
      throw error;
    }
  }

  /**
   * Get application info
   */
  async getAppInfo(domain: string): Promise<any> {
    try {
      const result = await this.callBitrixAPI(domain, 'app.info');
      return result;
    } catch (error) {
      this.logger.error('Error getting app info:', error);
      throw error;
    }
  }

  /**
   * Check if domain has valid token
   */
  async isAuthenticated(domain: string): Promise<boolean> {
    try {
      const token = await this.tokenService.getToken(domain);
      return !!token;
    } catch (error) {
      this.logger.error('Error checking authentication:', error);
      return false;
    }
  }
}
