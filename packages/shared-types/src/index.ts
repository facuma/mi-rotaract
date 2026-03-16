export const SHARED_TYPES_VERSION = '0.0.1';

export type Role = 'PARTICIPANT' | 'SECRETARY' | 'PRESIDENT';

export interface AuthMembership {
  clubId: string;
  clubName: string;
  clubCode: string;
  title: string | null;
  isPresident: boolean;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  memberships?: AuthMembership[];
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}
