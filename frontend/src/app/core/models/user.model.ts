export type UserRole = 'admin' | 'editor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface UserPayload {
  name: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
  password?: string;
}
