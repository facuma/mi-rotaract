export const SHARED_TYPES_VERSION = '0.0.1';

export type Role = 'PARTICIPANT' | 'SECRETARY' | 'PRESIDENT';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}
