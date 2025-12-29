// src/services/ticketService.ts
import { api } from './api';
import { Ticket, CreateTicketData, AddCommentData } from '../types';
import { mapTicketFromBackend } from './mappers';

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
    const response = await api.post('/tickets', data);
    return mapTicketFromBackend(response.data);
  },

  async getTickets(showClosed: boolean = false): Promise<TicketsResponse> {
    try {
      const response = await api.get(`/tickets?showClosed=${showClosed}`);
      return {
        tickets: response.data.tickets.map(mapTicketFromBackend),
        metadata: response.data.metadata
      };
    } catch (error: any) {
      console.error('Error en getTickets:', error);
      throw error;
    }
  },

  async getTicketById(id: number): Promise<Ticket> {
    const response = await api.get(`/tickets/${id}`);
    return mapTicketFromBackend(response.data);
  },

  async addComment(ticketId: number, data: AddCommentData): Promise<Ticket> {
    const response = await api.post(`/tickets/${ticketId}/comments`, data);
    return mapTicketFromBackend(response.data);
  },

  async closeTicket(ticketId: number): Promise<Ticket> {
    const response = await api.put(`/tickets/${ticketId}/close`);
    return mapTicketFromBackend(response.data);
  },

  async updateStatus(ticketId: number, status: string): Promise<Ticket> {
    const response = await api.put(`/tickets/${ticketId}/status`, { status });
    return mapTicketFromBackend(response.data);
  },

  async assignToUser(ticketId: number, userId: number): Promise<Ticket> {
    const response = await api.put(`/tickets/${ticketId}/assign`, { userId });
    return mapTicketFromBackend(response.data);
  }
};