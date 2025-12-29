import { api } from './api';
import { authService } from './authService';

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
    const response = await api.get('/metrics/dashboard');
    const currentUser = authService.getStoredUser();
    const metrics = response.data.metrics;

    return {
      general: {
        total: metrics?.tickets?.total ?? 0,
        abiertos: metrics?.tickets?.open ?? 0,
        enProgreso: 0,
        cerrados: metrics?.tickets?.closed ?? 0,
      },
      ti: {
        total: metrics?.ticketsTI?.total ?? 0,
        abiertos: metrics?.ticketsTI?.open ?? 0,
      },
      efficiency: {
        tiempoResolucionPromedio: 0,
        ticketsRecientes: metrics?.tickets?.open ?? 0,
        comentariosRecientes: 0,
        transferenciasPendientes: 0,
      },
      charts: {
        ticketsPorArea: [],
        usuariosActivos: [],
      },
      userStats: {
        ticketsCerrados: (metrics?.tickets?.closed ?? 0) + (metrics?.ticketsTI?.closed ?? 0),
        rol: currentUser?.role || 'N/A',
        area: currentUser?.area?.name || 'N/A',
      },
    };
  },

  async getTicketsTrend(days: number = 30): Promise<TrendData[]> {
    const response = await api.get<TrendData[]>(`/metrics/trend?days=${days}`);
    return response.data;
  }
};