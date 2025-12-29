import { api } from './api';
import { AuthResponse, LoginData, User } from '../types';
import { mapUserFromBackend } from './mappers';

export const authService = {
  async login(credentials: LoginData): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials);
    const user = mapUserFromBackend(response.data.user);

    return {
      user,
      token: response.data.tokens?.accessToken,
      refreshToken: response.data.tokens?.refreshToken
    };
  },

  async getProfile(): Promise<User> {
    const response = await api.get('/auth/profile');
    return mapUserFromBackend(response.data.profile);
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await api.put('/auth/change-password', { oldPassword, newPassword });
  },

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken(): string | null {
    return localStorage.getItem('token');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
};