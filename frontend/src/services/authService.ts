// src/services/authService.ts
import { api } from './api';
import { AuthResponse, LoginData, User } from '../types';
import { mapUserFromBackend } from './mappers';

// ✅ Agregar interfaz para changePassword
export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

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

  // ✅ Método para cambiar contraseña
  async changePassword(data: ChangePasswordData): Promise<ChangePasswordResponse> {
    try {
      const response = await api.put('/auth/change-password', data);
      return response.data;
    } catch (error: any) {
      console.error('Error en changePassword:', error);
      throw new Error(error.response?.data?.message || 'Error al cambiar contraseña');
    }
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