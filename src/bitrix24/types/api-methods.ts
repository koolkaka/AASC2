/**
 * Common Bitrix24 API methods
 * Tham khảo: https://training.bitrix24.com/rest_help/
 */

// CRM Methods
export const CRM_METHODS = {
  // Contacts
  CONTACT_LIST: 'crm.contact.list',
  CONTACT_GET: 'crm.contact.get',
  CONTACT_ADD: 'crm.contact.add',
  CONTACT_UPDATE: 'crm.contact.update',
  CONTACT_DELETE: 'crm.contact.delete',

  // Companies
  COMPANY_LIST: 'crm.company.list',
  COMPANY_GET: 'crm.company.get',
  COMPANY_ADD: 'crm.company.add',
  COMPANY_UPDATE: 'crm.company.update',

  // Deals
  DEAL_LIST: 'crm.deal.list',
  DEAL_GET: 'crm.deal.get',
  DEAL_ADD: 'crm.deal.add',
  DEAL_UPDATE: 'crm.deal.update',

  // Leads
  LEAD_LIST: 'crm.lead.list',
  LEAD_GET: 'crm.lead.get',
  LEAD_ADD: 'crm.lead.add',
  LEAD_UPDATE: 'crm.lead.update',
} as const;

// User Methods
export const USER_METHODS = {
  CURRENT: 'user.current',
  GET: 'user.get',
  SEARCH: 'user.search',
} as const;

// App Methods
export const APP_METHODS = {
  INFO: 'app.info',
  OPTION_GET: 'app.option.get',
  OPTION_SET: 'app.option.set',
} as const;

// Task Methods
export const TASK_METHODS = {
  LIST: 'tasks.task.list',
  GET: 'tasks.task.get',
  ADD: 'tasks.task.add',
  UPDATE: 'tasks.task.update',
  DELETE: 'tasks.task.delete',
} as const;

// Calendar Methods
export const CALENDAR_METHODS = {
  EVENT_GET: 'calendar.event.get',
  EVENT_ADD: 'calendar.event.add',
  EVENT_UPDATE: 'calendar.event.update',
  EVENT_DELETE: 'calendar.event.delete',
} as const;

export type BitrixMethod = 
  | typeof CRM_METHODS[keyof typeof CRM_METHODS]
  | typeof USER_METHODS[keyof typeof USER_METHODS]
  | typeof APP_METHODS[keyof typeof APP_METHODS]
  | typeof TASK_METHODS[keyof typeof TASK_METHODS]
  | typeof CALENDAR_METHODS[keyof typeof CALENDAR_METHODS];
