import { Router } from 'express';
import { MetricsController } from '../controllers/metricsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/dashboard', MetricsController.getDashboardMetrics);
router.get('/trend', MetricsController.getTicketsTrend);

export default router;