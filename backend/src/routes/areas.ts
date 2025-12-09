import { Router } from 'express';
import { AreaController } from '../controllers/areaController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.get('/', AreaController.getAreas);

export default router;