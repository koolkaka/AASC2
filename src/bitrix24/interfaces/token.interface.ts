export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  domain: string;
  member_id: string;
  expires_at: number; // timestamp when token expires
  created_at: number; // timestamp when token was created
}

export interface InstallRequest {
  code: string;
  domain: string;
  member_id: string;
  scope: string;
}

export interface BitrixApiResponse<T = any> {
  result: T;
  total?: number;
  next?: number;
  time: {
    start: number;
    finish: number;
    duration: number;
  };
}
