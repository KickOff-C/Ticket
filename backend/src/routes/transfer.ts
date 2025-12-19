// src/routes/transfer.ts
import { Router } from 'express';
import { TransferController } from '../controllers/transferController'; // ← Asegúrate que este import es correcto
import { 
  authenticateToken, 
  requireUser, 
  requireManager,
  requireAdmin
} from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas de transferencias
router.post('/', requireUser, TransferController.requestTransfer);
router.get('/pending', requireManager, TransferController.getPendingTransfers);
router.put('/:id/process', requireManager, TransferController.processTransfer); // ← Línea 22
router.get('/history', requireUser, TransferController.getTransferHistory);
router.get('/:id', requireUser, TransferController.getTransferById);
router.put('/:id/cancel', requireUser, TransferController.cancelTransfer);

export default router;