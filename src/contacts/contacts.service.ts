import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Bitrix24Service } from '../bitrix24/bitrix24.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactQueryDto } from './dto/contact-query.dto';
import {
  ContactResponse,
  ContactListResponse,
  BitrixContact,
  BitrixRequisite,
  BitrixContactListResponse,
  BitrixRequisiteListResponse,
} from './interfaces/contact.interface';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);
  private readonly defaultDomain = 'vietquan.bitrix24.vn'; // TODO: Make this configurable

  constructor(private readonly bitrix24Service: Bitrix24Service) {}

  /**
   * Lấy danh sách contacts với phân trang và tìm kiếm
   */
  async getContacts(query: ContactQueryDto): Promise<ContactListResponse> {
    try {
      const { page = 1, limit = 20, search, email, phone, orderBy = 'ID', order = 'DESC' } = query;
      const start = (page - 1) * limit;

      // Build filter object
      const filter: any = {};
      
      if (search) {
        filter['%NAME'] = search; // Search in name field
      }
      
      if (email) {
        filter['%EMAIL'] = email;
      }
      
      if (phone) {
        filter['%PHONE'] = phone;
      }

      // Build order object
      const orderObj: any = {};
      orderObj[orderBy] = order;

      this.logger.debug(`Getting contacts with filter:`, filter);

      const response = await this.bitrix24Service.callBitrixAPI<BitrixContact[]>(
        this.defaultDomain,
        'crm.contact.list',
        {
          start,
          order: orderObj,
          filter,
          select: [
            'ID',
            'NAME',
            'LAST_NAME',
            'SECOND_NAME',
            'EMAIL',
            'PHONE',
            'WEB',
            'ADDRESS',
            'ADDRESS_CITY',
            'ADDRESS_REGION',
            'ADDRESS_PROVINCE',
            'COMMENTS',
            'DATE_CREATE',
            'DATE_MODIFY',
            'ASSIGNED_BY_ID',
          ],
        },
      );

      const contacts = response.result.map(this.transformBitrixContact);
      const total = response.total || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        contacts,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error('Error getting contacts:', error);
      throw error;
    }
  }

  /**
   * Lấy thông tin chi tiết một contact theo ID
   */
  async getContactById(id: string): Promise<ContactResponse | null> {
    try {
      this.logger.debug(`Getting contact by ID: ${id}`);

      const response = await this.bitrix24Service.callBitrixAPI<BitrixContact>(
        this.defaultDomain,
        'crm.contact.get',
        { id },
      );

      if (!response.result) {
        return null;
      }

      const contact = this.transformBitrixContact(response.result);

      // Get bank info (requisites) for this contact
      try {
        const bankInfo = await this.getContactBankInfo(id);
        if (bankInfo) {
          contact.bankInfo = bankInfo;
        }
      } catch (bankError) {
        this.logger.warn(`Could not get bank info for contact ${id}:`, bankError.message);
      }

      return contact;
    } catch (error) {
      this.logger.error(`Error getting contact ${id}:`, error);
      throw error;
    }
  }

  /**
   * Tạo contact mới
   */
  async createContact(createContactDto: CreateContactDto): Promise<{ id: string; contact: ContactResponse }> {
    try {
      this.logger.debug('Creating contact:', createContactDto.name);

      // Prepare BASIC contact data for Bitrix24 (NO bank info)
      const contactData = this.prepareBitrixContactData(createContactDto, false);
      
      this.logger.debug('Sending contact data to Bitrix24:', contactData);

      const response = await this.bitrix24Service.callBitrixAPI(
        this.defaultDomain,
        'crm.contact.add',
        { fields: contactData },
      );

      this.logger.debug('Bitrix24 contact response:', response);
      const contactId = response.result;
      this.logger.log(`✅ Contact created with ID: ${contactId}`);

      // Add bank info if provided
      if (createContactDto.bankInfo) {
        try {
          await this.createContactBankInfo(contactId, createContactDto.bankInfo);
          this.logger.log(`Bank info added for contact ${contactId}`);
        } catch (bankError) {
          this.logger.warn(`Could not add bank info for contact ${contactId}:`, bankError.message);
        }
      }

      // Get the created contact to return
      const createdContact = await this.getContactById(contactId);

      return {
        id: contactId,
        contact: createdContact,
      };
    } catch (error) {
      this.logger.error('Error creating contact:', error);
      throw error;
    }
  }

  /**
   * Cập nhật contact
   */
  async updateContact(id: string, updateContactDto: UpdateContactDto): Promise<{ contact: ContactResponse }> {
    try {
      this.logger.debug(`Updating contact ${id}`);

      // Check if contact exists
      const existingContact = await this.getContactById(id);
      if (!existingContact) {
        throw new NotFoundException('Contact not found');
      }

      // Prepare update data
      const updateData = this.prepareBitrixContactData(updateContactDto);

      if (Object.keys(updateData).length > 0) {
        await this.bitrix24Service.callBitrixAPI(
          this.defaultDomain,
          'crm.contact.update',
          { 
            id,
            fields: updateData 
          },
        );
        this.logger.log(`Contact ${id} updated`);
      }

      // Update bank info if provided
      if (updateContactDto.bankInfo) {
        try {
          await this.updateContactBankInfo(id, updateContactDto.bankInfo);
          this.logger.log(`Bank info updated for contact ${id}`);
        } catch (bankError) {
          this.logger.warn(`Could not update bank info for contact ${id}:`, bankError.message);
        }
      }

      // Get the updated contact to return
      const updatedContact = await this.getContactById(id);

      return {
        contact: updatedContact,
      };
    } catch (error) {
      this.logger.error(`Error updating contact ${id}:`, error);
      throw error;
    }
  }

  /**
   * Xóa contact
   */
  async deleteContact(id: string): Promise<void> {
    try {
      this.logger.debug(`Deleting contact ${id}`);

      // Check if contact exists
      const existingContact = await this.getContactById(id);
      if (!existingContact) {
        throw new NotFoundException('Contact not found');
      }

      // Delete bank info first
      try {
        await this.deleteContactBankInfo(id);
        this.logger.log(`Bank info deleted for contact ${id}`);
      } catch (bankError) {
        this.logger.warn(`Could not delete bank info for contact ${id}:`, bankError.message);
      }

      // Delete the contact
      await this.bitrix24Service.callBitrixAPI(
        this.defaultDomain,
        'crm.contact.delete',
        { id },
      );

      this.logger.log(`Contact ${id} deleted`);
    } catch (error) {
      this.logger.error(`Error deleting contact ${id}:`, error);
      throw error;
    }
  }

  /**
   * Transform Bitrix24 contact data to our format
   */
  private transformBitrixContact(bitrixContact: BitrixContact): ContactResponse {
    // Extract first email and phone
    const email = bitrixContact.EMAIL?.[0]?.VALUE;
    const phone = bitrixContact.PHONE?.[0]?.VALUE;
    const website = bitrixContact.WEB?.[0]?.VALUE;

    // Build address object
    const address = {
      street: bitrixContact.ADDRESS,
      ward: undefined, // Bitrix24 doesn't have ward field by default
      district: bitrixContact.ADDRESS_2,
      city: bitrixContact.ADDRESS_CITY,
      full: [
        bitrixContact.ADDRESS,
        bitrixContact.ADDRESS_2,
        bitrixContact.ADDRESS_CITY,
        bitrixContact.ADDRESS_REGION,
        bitrixContact.ADDRESS_PROVINCE,
      ].filter(Boolean).join(', '),
    };

    return {
      id: bitrixContact.ID,
      name: bitrixContact.NAME,
      lastName: bitrixContact.LAST_NAME,
      phone,
      email,
      website,
      address: address.full ? address : undefined,
      comments: bitrixContact.COMMENTS,
      dateCreate: bitrixContact.DATE_CREATE,
      dateModify: bitrixContact.DATE_MODIFY,
      assignedBy: bitrixContact.ASSIGNED_BY_ID,
    };
  }

  /**
   * Prepare contact data for Bitrix24 API
   * @param contactDto Contact data
   * @param includeBankInfo Whether to include bank info (should be false for contact creation)
   */
  private prepareBitrixContactData(contactDto: CreateContactDto | UpdateContactDto, includeBankInfo: boolean = true): any {
    const data: any = {};

    if (contactDto.name) data.NAME = contactDto.name;
    if (contactDto.lastName) data.LAST_NAME = contactDto.lastName;
    if (contactDto.comments) data.COMMENTS = contactDto.comments;

    // Handle email
    if (contactDto.email) {
      data.EMAIL = [{ VALUE: contactDto.email, VALUE_TYPE: 'WORK' }];
    }

    // Handle phone
    if (contactDto.phone) {
      data.PHONE = [{ VALUE: contactDto.phone, VALUE_TYPE: 'WORK' }];
    }

    // Handle website
    if (contactDto.website) {
      data.WEB = [{ VALUE: contactDto.website, VALUE_TYPE: 'WORK' }];
    }

    // Handle address
    if (contactDto.address) {
      const addr = contactDto.address;
      if (addr.street) data.ADDRESS = addr.street;
      if (addr.district) data.ADDRESS_2 = addr.district;
      if (addr.city) data.ADDRESS_CITY = addr.city;
      if (addr.ward) data.ADDRESS_REGION = addr.ward;
    }

    return data;
  }

  /**
   * Get bank info from Bank Details API
   */
  private async getContactBankInfo(contactId: string): Promise<any | null> {
    try {
      // Step 1: Get requisites for the contact
      const requisiteResponse = await this.bitrix24Service.callBitrixAPI<BitrixRequisite[]>(
        this.defaultDomain,
        'crm.requisite.list',
        {
          filter: {
            ENTITY_TYPE_ID: 3, // Contact entity type
            ENTITY_ID: contactId,
          },
          select: ['ID', 'NAME', 'RQ_NAME'],
        },
      );

      const requisites = requisiteResponse.result;
      if (!requisites || requisites.length === 0) {
        return null;
      }

      const requisiteId = requisites[0].ID;

      // Step 2: Get bank details for the requisite
      const bankDetailResponse = await this.bitrix24Service.callBitrixAPI(
        this.defaultDomain,
        'crm.requisite.bankdetail.list',
        {
          filter: {
            ENTITY_ID: requisiteId,
          },
          select: ['ID', 'NAME', 'RQ_BANK_NAME', 'RQ_ACC_NUM', 'RQ_ACC_NAME'],
        },
      );

      const bankDetails = bankDetailResponse.result;
      if (bankDetails && bankDetails.length > 0) {
        const bankDetail = bankDetails[0];
        return {
          bankName: bankDetail.RQ_BANK_NAME,
          accountNumber: bankDetail.RQ_ACC_NUM,
          accountHolder: bankDetail.RQ_ACC_NAME || requisites[0].RQ_NAME,
        };
      }

      return null;
    } catch (error) {
      this.logger.warn(`Error getting bank info for contact ${contactId}:`, error.message);
      return null;
    }
  }

  /**
   * Create bank info using proper Bitrix24 Bank Details API
   */
  private async createContactBankInfo(contactId: string, bankInfo: any): Promise<void> {
    this.logger.debug(`Adding bank info to contact ${contactId}:`, bankInfo);
    
    try {
      // Step 1: Create requisite for the contact
      const requisiteData = {
        ENTITY_TYPE_ID: 3, // Contact entity type  
        ENTITY_ID: contactId,
        PRESET_ID: 1, // Default preset for individual
        NAME: 'Thông tin chi tiết',
        RQ_NAME: bankInfo.accountHolder || bankInfo.bankName,
      };

      this.logger.debug('Creating requisite:', requisiteData);

      const requisiteResponse = await this.bitrix24Service.callBitrixAPI(
        this.defaultDomain,
        'crm.requisite.add',
        { fields: requisiteData },
      );

      const requisiteId = requisiteResponse.result;
      this.logger.log(`✅ Requisite created with ID: ${requisiteId}`);

      // Step 2: Create bank detail linked to requisite
      const bankDetailData = {
        ENTITY_ID: requisiteId, // Link to requisite
        NAME: 'Thông tin ngân hàng',
        RQ_BANK_NAME: bankInfo.bankName,
        RQ_ACC_NUM: bankInfo.accountNumber,
        RQ_ACC_NAME: bankInfo.accountHolder || bankInfo.bankName,
        ACTIVE: 'Y',
        SORT: 100,
      };

      this.logger.debug('Creating bank detail:', bankDetailData);

      const bankDetailResponse = await this.bitrix24Service.callBitrixAPI(
        this.defaultDomain,
        'crm.requisite.bankdetail.add',
        { fields: bankDetailData },
      );

      this.logger.log(`✅ Bank detail created with ID: ${bankDetailResponse.result}`);
      this.logger.log(`✅ Bank info added to contact ${contactId} via requisite ${requisiteId}`);

    } catch (error) {
      this.logger.error(`Error creating bank info for contact ${contactId}:`, error.message);
      throw error;
    }
  }

  /**
   * Ensure bank custom fields exist in Bitrix24 CONTACT
   */
  private async ensureBankCustomFields(): Promise<void> {
    try {
      // Field names must be ≤ 13 chars after UF_CRM_ prefix
      await this.createBankCustomFieldIfNotExists('UF_CRM_BANK', 'Tên ngân hàng', 'string', 'CRM_CONTACT');
      await this.createBankCustomFieldIfNotExists('UF_CRM_ACCOUNT', 'Số tài khoản', 'string', 'CRM_CONTACT');
    } catch (error) {
      this.logger.warn('Error ensuring bank custom fields:', error.message);
      // Continue execution even if custom field creation fails
    }
  }

  /**
   * Create a custom field for contact if it doesn't exist
   */
  private async createBankCustomFieldIfNotExists(
    fieldName: string,
    label: string,
    type: string,
    entityId: string = 'CRM_CONTACT',
  ): Promise<void> {
    try {
      const fieldData = {
        ENTITY_ID: entityId,
        FIELD_NAME: fieldName,
        USER_TYPE_ID: type,
        SORT: 100,
        MULTIPLE: 'N',
        MANDATORY: 'N',
        SHOW_FILTER: 'E',
        SHOW_IN_LIST: 'Y',
        EDIT_IN_LIST: 'Y',
        IS_SEARCHABLE: 'Y',
        EDIT_FORM_LABEL: label,
        LIST_COLUMN_LABEL: label,
        LIST_FILTER_LABEL: label,
      };

      const apiMethod = entityId === 'CRM_CONTACT' ? 'crm.contact.userfield.add' : 'crm.requisite.userfield.add';
      
      await this.bitrix24Service.callBitrixAPI(
        this.defaultDomain,
        apiMethod,
        { fields: fieldData },
      );

      this.logger.log(`✅ Custom field created: ${fieldName} for ${entityId}`);
    } catch (error) {
      // Field might already exist, which is fine
      if (error.message?.includes('already exists') || error.message?.includes('đã tồn tại')) {
        this.logger.debug(`Custom field ${fieldName} already exists for ${entityId}`);
      } else {
        this.logger.warn(`Error creating custom field ${fieldName}:`, error.message);
      }
    }
  }

  /**
   * Update bank info (requisite) for a contact
   */
  private async updateContactBankInfo(contactId: string, bankInfo: any): Promise<void> {
    // Get existing requisite
    const response = await this.bitrix24Service.callBitrixAPI<BitrixRequisite[]>(
      this.defaultDomain,
      'crm.requisite.list',
      {
        filter: {
          ENTITY_TYPE_ID: 3,
          ENTITY_ID: contactId,
        },
        select: ['ID'],
      },
    );

    if (response.result && response.result.length > 0) {
      // Update existing requisite
      const requisiteId = response.result[0].ID;
      const updateData = {
        RQ_NAME: bankInfo.accountHolder || '',
        UF_CRM_BANK: bankInfo.bankName,
        UF_CRM_ACCOUNT: bankInfo.accountNumber,
      };

      await this.bitrix24Service.callBitrixAPI(
        this.defaultDomain,
        'crm.requisite.update',
        { 
          id: requisiteId,
          fields: updateData 
        },
      );
    } else {
      // Create new requisite
      await this.createContactBankInfo(contactId, bankInfo);
    }
  }

  /**
   * Delete bank info (requisites) for a contact
   */
  private async deleteContactBankInfo(contactId: string): Promise<void> {
    const response = await this.bitrix24Service.callBitrixAPI<BitrixRequisite[]>(
      this.defaultDomain,
      'crm.requisite.list',
      {
        filter: {
          ENTITY_TYPE_ID: 3,
          ENTITY_ID: contactId,
        },
        select: ['ID'],
      },
    );

    if (response.result && response.result.length > 0) {
      for (const requisite of response.result) {
        await this.bitrix24Service.callBitrixAPI(
          this.defaultDomain,
          'crm.requisite.delete',
          { id: requisite.ID },
        );
      }
    }
  }
}
