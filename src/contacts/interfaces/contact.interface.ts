export interface BitrixContact {
  ID?: string;
  NAME?: string;
  LAST_NAME?: string;
  SECOND_NAME?: string;
  EMAIL?: { VALUE: string; VALUE_TYPE: string }[];
  PHONE?: { VALUE: string; VALUE_TYPE: string }[];
  WEB?: { VALUE: string; VALUE_TYPE: string }[];
  ADDRESS?: string;
  ADDRESS_2?: string;
  ADDRESS_CITY?: string;
  ADDRESS_REGION?: string;
  ADDRESS_PROVINCE?: string;
  ADDRESS_POSTAL_CODE?: string;
  ADDRESS_COUNTRY?: string;
  COMMENTS?: string;
  DATE_CREATE?: string;
  DATE_MODIFY?: string;
  CREATED_BY_ID?: string;
  MODIFY_BY_ID?: string;
  ASSIGNED_BY_ID?: string;
  SOURCE_ID?: string;
  SOURCE_DESCRIPTION?: string;
  TYPE_ID?: string;
}

export interface BitrixRequisite {
  ID?: string;
  ENTITY_TYPE_ID?: number;
  ENTITY_ID?: string;
  PRESET_ID?: string;
  NAME?: string;
  CODE?: string;
  XML_ID?: string;
  ACTIVE?: 'Y' | 'N';
  SORT?: number;
  RQ_NAME?: string;
  RQ_FIRST_NAME?: string;
  RQ_LAST_NAME?: string;
  RQ_SECOND_NAME?: string;
  RQ_COMPANY_NAME?: string;
  RQ_COMPANY_FULL_NAME?: string;
  RQ_COMPANY_REG_DATE?: string;
  RQ_DIRECTOR?: string;
  RQ_ACCOUNTANT?: string;
  RQ_CEO_NAME?: string;
  RQ_CEO_WORK_POS?: string;
  RQ_CONTACT?: string;
  RQ_EMAIL?: string;
  RQ_PHONE?: string;
  RQ_FAX?: string;
  RQ_IDENT_TYPE?: string;
  RQ_IDENT_DOC?: string;
  RQ_IDENT_DOC_SER?: string;
  RQ_IDENT_DOC_NUM?: string;
  RQ_IDENT_DOC_PERS_NUM?: string;
  RQ_IDENT_DOC_DATE?: string;
  RQ_IDENT_DOC_ISSUED_BY?: string;
  RQ_IDENT_DOC_DEP_CODE?: string;
  RQ_INN?: string;
  RQ_KPP?: string;
  RQ_USRLE?: string;
  RQ_IFNS?: string;
  RQ_OGRN?: string;
  RQ_OGRNIP?: string;
  RQ_OKPO?: string;
  RQ_OKTMO?: string;
  RQ_OKVED?: string;
  RQ_EDRPOU?: string;
  RQ_DRFO?: string;
  // Bank account fields
  RQ_BANK_NAME?: string;
  RQ_BANK_ADDR?: string;
  RQ_BANK_ROUTE_NUM?: string;
  RQ_BIK?: string;
  RQ_BANK_ACCOUNT_NUM?: string;
  RQ_BANK_ACCOUNT_TYPE?: string;
  RQ_CORRESPONDENT_ACCOUNT?: string;
  RQ_SWIFT?: string;
  RQ_IBAN?: string;
  // Custom fields for bank information (≤13 chars after UF_CRM_)
  UF_CRM_BANK?: string;
  UF_CRM_ACCOUNT?: string;
}


export interface ContactResponse {
  id: string;
  name: string;
  lastName?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: {
    street?: string;
    ward?: string;
    district?: string;
    city?: string;
    full?: string;
  };
  bankInfo?: {
    bankName?: string;
    accountNumber?: string;
    accountHolder?: string;
  };
  comments?: string;
  dateCreate?: string;
  dateModify?: string;
  assignedBy?: string;
}

export interface ContactListResponse {
  contacts: ContactResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BitrixContactListResponse {
  result: BitrixContact[];
  total?: number;
  next?: number;
  time: {
    start: number;
    finish: number;
    duration: number;
  };
}

export interface BitrixRequisiteListResponse {
  result: BitrixRequisite[];
  total?: number;
  next?: number;
  time: {
    start: number;
    finish: number;
    duration: number;
  };
}
