import { api } from './api';

export interface DashboardMetrics {
  general: {
    total: number;
    abiertos: number;
    enProgreso: number;
    cerrados: number;
  };
  ti: {
    total: number;
    abiertos: number;
  };
  efficiency: {
    tiempoResolucionPromedio: number;
    ticketsRecientes: number;
    comentariosRecientes: number;
    transferenciasPendientes: number;
  };
  charts?: {
    ticketsPorArea: Array<{ area: string; cantidad: number }>;
    usuariosActivos: Array<{ usuario: string; ticketsCreados: number; comentarios: number }>;
  };
  userStats: {
    ticketsCerrados: number;
    rol: string;
    area: string;
  };
}

export interface TrendData {
  fecha: string;
  cantidad: number;
}

export const metricsService = {
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const response = await api.get<DashboardMetrics>('/metrics/dashboard');
    return response.data;
  },

  async getTicketsTrend(days: number = 30): Promise<TrendData[]> {
    const response = await api.get<TrendData[]>(`/metrics/trend?days=${days}`);
    return response.data;
  }
};