import { Router } from 'express';
import { TransferController } from '../controllers/transferController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post('/request', TransferController.requestTransfer);
router.get('/pending', TransferController.getPendingTransfers);
router.put('/:id/process', TransferController.processTransfer);

export default router;