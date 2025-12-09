import { api } from './api';
import { User } from '../types';

export const userService = {
  async getUsers(): Promise<User[]> {
    try {
      const response = await api.get<User[]>('/users');
      return response.data;
    } catch (error: any) {
      console.error('Error en getUsers:', error);
      throw error;
    }
  },

  async getUsersByArea(areaId: number): Promise<User[]> {
    try {
      console.log('🎯 Buscando usuarios para área:', areaId);
      const response = await api.get<User[]>(`/users/area/${areaId}`);
      console.log('✅ Usuarios encontrados:', response.data.length);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error en getUsersByArea:', error);
      console.error('📊 Response error:', error.response?.data);
      throw error;
    }
  },

  async getAreaUsers(): Promise<User[]> {
    try {
      const response = await api.get<User[]>('/users/area-users');
      return response.data;
    } catch (error: any) {
      console.error('Error en getAreaUsers:', error);
      throw error;
    }
  },

  // NUEVO MÉTODO: Específico para asignación de tickets TI
  async getUsersForTIAssignment(): Promise<User[]> {
    try {
      console.log('🎯 Buscando usuarios para asignación TI...');
      const response = await api.get<User[]>('/users/ti-assignment');
      console.log('✅ Usuarios encontrados para TI:', response.data.length);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error en getUsersForTIAssignment:', error);
      console.error('📊 Response error:', error.response?.data);
      throw error;
    }
  }
};