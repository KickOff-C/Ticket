import React, { useState, useEffect } from 'react';
import { metricsService, DashboardMetrics, TrendData } from '../services/metricsService';
import { useAuth } from '../contexts/AuthContext';
import './MetricsDashboard.css';

const MetricsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const [metricsData, trendData] = await Promise.all([
        metricsService.getDashboardMetrics(),
        metricsService.getTicketsTrend(7) // Últimos 7 días
      ]);
      
      setMetrics(metricsData);
      setTrendData(trendData);
    } catch (err: any) {
      setError('Error al cargar las métricas');
      console.error('Error loading metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

  if (loading) {
    return (
      <div className="metrics-loading">
        <div className="loading-spinner"></div>
        <p>Cargando métricas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="metrics-error">
        <p>❌ {error}</p>
        <button onClick={loadMetrics}>Reintentar</button>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="metrics-dashboard">
      {/* Header */}
      <div className="metrics-header">
        <h2>📊 Dashboard de Métricas</h2>
        <div className="user-stats">
          <span className="user-role">{metrics.userStats.rol}</span>
          <span className="user-area">{metrics.userStats.area}</span>
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="metrics-grid">
        {/* Tickets Generales */}
        <div className="metric-card general">
          <div className="metric-header">
            <h3>🎫 Tickets Generales</h3>
            <span className="metric-total">{metrics.general.total}</span>
          </div>
          <div className="metric-details">
            <div className="metric-item">
              <span className="label">Abiertos</span>
              <span className="value open">{metrics.general.abiertos}</span>
            </div>
            <div className="metric-item">
              <span className="label">En Progreso</span>
              <span className="value progress">{metrics.general.enProgreso}</span>
            </div>
            <div className="metric-item">
              <span className="label">Cerrados</span>
              <span className="value closed">{metrics.general.cerrados}</span>
            </div>
          </div>
        </div>

        {/* Tickets TI */}
        <div className="metric-card ti">
          <div className="metric-header">
            <h3>🖥️ Tickets TI</h3>
            <span className="metric-total">{metrics.ti.total}</span>
          </div>
          <div className="metric-details">
            <div className="metric-item">
              <span className="label">Abiertos</span>
              <span className="value open">{metrics.ti.abiertos}</span>
            </div>
            <div className="metric-item">
              <span className="label">Porcentaje</span>
              <span className="value">
                {metrics.ti.total > 0 
                  ? `${((metrics.ti.abiertos / metrics.ti.total) * 100).toFixed(1)}%`
                  : '0%'
                }
              </span>
            </div>
          </div>
        </div>

        {/* Eficiencia */}
        <div className="metric-card efficiency">
          <div className="metric-header">
            <h3>⚡ Eficiencia</h3>
            <span className="metric-icon">📈</span>
          </div>
          <div className="metric-details">
            <div className="metric-item">
              <span className="label">Tiempo Resolución</span>
              <span className="value">{metrics.efficiency.tiempoResolucionPromedio}d</span>
            </div>
            <div className="metric-item">
              <span className="label">Tickets Recientes</span>
              <span className="value">{metrics.efficiency.ticketsRecientes}</span>
            </div>
            <div className="metric-item">
              <span className="label">Comentarios</span>
              <span className="value">{metrics.efficiency.comentariosRecientes}</span>
            </div>
          </div>
        </div>

        {/* Transferencias */}
        <div className="metric-card transfers">
          <div className="metric-header">
            <h3>🔄 Transferencias</h3>
            <span className="metric-total">{metrics.efficiency.transferenciasPendientes}</span>
          </div>
          <div className="metric-details">
            <div className="metric-item">
              <span className="label">Pendientes</span>
              <span className="value pending">{metrics.efficiency.transferenciasPendientes}</span>
            </div>
          </div>
        </div>

        {/* Stats Personales */}
        <div className="metric-card personal">
          <div className="metric-header">
            <h3>👤 Tus Estadísticas</h3>
            <span className="metric-icon">🏆</span>
          </div>
          <div className="metric-details">
            <div className="metric-item">
              <span className="label">Tickets Cerrados</span>
              <span className="value personal-count">{metrics.userStats.ticketsCerrados}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos para Admins */}
      {isAdmin && metrics.charts && (
        <div className="charts-section">
          <h3>📈 Vista de Administrador</h3>
          
          {/* Tickets por Área */}
          <div className="chart-card">
            <h4>Tickets por Área</h4>
            <div className="chart-content">
              {metrics.charts.ticketsPorArea.map((item, index) => (
                <div key={index} className="chart-item">
                  <span className="area-name">{item.area}</span>
                  <div className="chart-bar">
                    <div 
                      className="bar-fill"
                      style={{ width: `${(item.cantidad / metrics.general.total) * 100}%` }}
                    ></div>
                  </div>
                  <span className="area-count">{item.cantidad}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Usuarios Más Activos */}
          <div className="chart-card">
            <h4>Usuarios Más Activos</h4>
            <div className="chart-content">
              {metrics.charts.usuariosActivos.map((user, index) => (
                <div key={index} className="chart-item">
                  <span className="user-name">{user.usuario}</span>
                  <div className="user-stats">
                    <span className="stat">🎫 {user.ticketsCreados}</span>
                    <span className="stat">💬 {user.comentarios}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Botón de actualizar */}
      <div className="metrics-actions">
        <button onClick={loadMetrics} className="refresh-button">
          🔄 Actualizar Métricas
        </button>
      </div>
    </div>
  );
};

export default MetricsDashboard;