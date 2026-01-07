// src/routes/metrics.ts
import { Router } from 'express';
import { MetricsController } from '../controllers/metricsController';
import { 
  authenticateToken, 
  requireAdmin, 
  requireManager
} from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// ========== RUTAS IMPLEMENTADAS ==========

// GET /api/metrics/dashboard - Métricas del dashboard principal
router.get('/dashboard', MetricsController.getDashboardMetrics);

// GET /api/metrics/trend - Tendencia de tickets en el tiempo
router.get('/trend', MetricsController.getTicketsTrend);

// GET /api/metrics/my-stats - Estadísticas personales del usuario
router.get('/my-stats', MetricsController.getMyStatistics);

// ========== RUTAS POR ÁREA ==========

// GET /api/metrics/area/:areaId - Métricas específicas de un área
router.get('/area/:areaId', requireManager, MetricsController.getAreaMetrics);

// GET /api/metrics/my-area - Métricas del área del usuario actual (manager)
router.get('/my-area', requireManager, MetricsController.getMyAreaMetrics);

// ========== RUTAS PARA ADMINISTRADORES ==========

// GET /api/metrics/all-areas - Métricas de todas las áreas (solo admin)
router.get('/all-areas', requireAdmin, MetricsController.getAllAreasMetrics);

// ========== RUTAS NO IMPLEMENTADAS (para futuras versiones) ==========

// Las siguientes rutas están definidas pero retornan 501 (No implementado)
router.get('/users', requireAdmin, MetricsController.getUsersActivityMetrics);
router.get('/transfers', requireAdmin, MetricsController.getTransfersMetrics);
router.get('/system', MetricsController.getSystemMetrics);
router.get('/audit', MetricsController.getAuditMetrics);
router.get('/tickets', MetricsController.getTicketsMetrics);
router.get('/comments', requireManager, MetricsController.getCommentsMetrics);
router.get('/realtime', MetricsController.getRealtimeMetrics);

export default router;