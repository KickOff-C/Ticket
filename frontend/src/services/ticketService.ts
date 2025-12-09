// src/services/ticketService.ts
import { api } from './api';
import { Ticket, CreateTicketData, AddCommentData } from '../types';

export interface TicketsResponse {
  tickets: Ticket[];
  metadata: {
    total: number;
    closed: number;
    showingClosed: boolean;
    hasClosedTickets: boolean;
  };
}

export const ticketService = {
  async createTicket(data: CreateTicketData): Promise<Ticket> {
    const response = await api.post<Ticket>('/tickets', data);
    return response.data;
  },

  async getTickets(showClosed: boolean = false): Promise<TicketsResponse> {
    try {
      const response = await api.get<TicketsResponse>(`/tickets?showClosed=${showClosed}`);
      return response.data;
    } catch (error: any) {
      console.error('Error en getTickets:', error);
      throw error;
    }
  },

  async getTicketById(id: number): Promise<Ticket> {
    const response = await api.get<Ticket>(`/tickets/${id}`);
    return response.data;
  },

  async addComment(ticketId: number, data: AddCommentData): Promise<Ticket> {
    const response = await api.post<Ticket>(`/tickets/${ticketId}/comments`, data);
    return response.data;
  },

  async closeTicket(ticketId: number): Promise<Ticket> {
    const response = await api.put<Ticket>(`/tickets/${ticketId}/close`);
    return response.data;
  },

  async updateStatus(ticketId: number, status: string): Promise<Ticket> {
    const response = await api.put<Ticket>(`/tickets/${ticketId}/status`, { status });
    return response.data;
  },

  async assignToUser(ticketId: number, userId: number): Promise<Ticket> {
    const response = await api.put<Ticket>(`/tickets/${ticketId}/assign`, { userId });
    return response.data;
  }
};