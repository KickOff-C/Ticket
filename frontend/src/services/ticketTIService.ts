// src/services/ticketTIService.ts
import { api } from './api';
import { TicketTI, CreateTicketTIData } from '../types';

export interface TicketsTIResponse {
  tickets: TicketTI[];
  metadata: {
    total: number;
    closed: number;
    showingClosed: boolean;
    hasClosedTickets: boolean;
  };
}

export const ticketTIService = {
  async createTicketTI(data: CreateTicketTIData): Promise<TicketTI> {
    try {
      console.log('Enviando datos al backend:', data);
      const response = await api.post<TicketTI>('/tickets-ti', data);
      console.log('Respuesta del backend:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error en createTicketTI:', error);
      throw error;
    }
  },

  async getTicketsTI(showClosed: boolean = false): Promise<TicketsTIResponse> {
    try {
      const response = await api.get<TicketsTIResponse>(`/tickets-ti?showClosed=${showClosed}`);
      return response.data;
    } catch (error: any) {
      console.error('Error en getTicketsTI:', error);
      throw error;
    }
  },

  async getTicketTIById(id: number): Promise<TicketTI> {
    try {
      const response = await api.get<TicketTI>(`/tickets-ti/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error en getTicketTIById:', error);
      throw error;
    }
  },

  async addComment(ticketId: number, data: {content: string}): Promise<TicketTI> {
    try {
      const response = await api.post<TicketTI>(`/tickets-ti/${ticketId}/comments`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error en addComment:', error);
      throw error;
    }
  },

  async assignTicket(ticketId: number, assignedToId: number): Promise<TicketTI> {
    try {
      console.log('🎯 Asignando ticket TI:', { ticketId, assignedToId });
      const response = await api.put<TicketTI>(`/tickets-ti/${ticketId}/assign`, { assignedToId });
      console.log('✅ Ticket TI asignado exitosamente');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error en assignTicket:', error);
      console.error('📊 Response error:', error.response?.data);
      throw error;
    }
  },

  async updateStatus(ticketId: number, status: string): Promise<TicketTI> {
    try {
      const response = await api.put<TicketTI>(`/tickets-ti/${ticketId}/status`, { status });
      return response.data;
    } catch (error: any) {
      console.error('Error en updateStatus:', error);
      throw error;
    }
  },

  async closeTicket(ticketId: number): Promise<TicketTI> {
    try {
      const response = await api.put<TicketTI>(`/tickets-ti/${ticketId}/close`);
      return response.data;
    } catch (error: any) {
      console.error('Error en closeTicket:', error);
      throw error;
    }
  }
};