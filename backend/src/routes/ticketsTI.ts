// src/routes/ticketsTI.ts
import { Router } from 'express';
import { TicketTIController } from '../controllers/ticketTIController';
import { 
  authenticateToken, 
  requireUser, 
  requireAdmin,
  requireOwnershipOrRole 
} from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas de tickets TI
router.post('/', requireUser, TicketTIController.createTicketTI);
router.get('/', requireUser, TicketTIController.getTicketsTI);
router.get('/assigned', requireUser, TicketTIController.getAssignedTicketsTI);
router.get('/:id', requireUser, requireOwnershipOrRole(['ADMIN', 'SUPERADMIN']), TicketTIController.getTicketTIById);
router.post('/:id/comments', requireUser, requireOwnershipOrRole(['ADMIN', 'SUPERADMIN']), TicketTIController.addCommentTI);
router.put('/:id/assign', requireAdmin, TicketTIController.assignTicketTI);
router.put('/:id/status', requireAdmin, TicketTIController.updateStatusTI);
router.put('/:id/close', requireUser, requireOwnershipOrRole(['ADMIN', 'SUPERADMIN']), TicketTIController.closeTicketTI);

export default router;