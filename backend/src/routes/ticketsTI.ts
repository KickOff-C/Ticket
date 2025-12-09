import { Router } from 'express';
import { TicketTIController } from '../controllers/ticketTIController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas de tickets TI
router.post('/', TicketTIController.createTicketTI);
router.get('/', TicketTIController.getTicketsTI);
router.get('/:id', TicketTIController.getTicketTIById);
router.post('/:id/comments', TicketTIController.addCommentTI);
router.put('/:id/assign', TicketTIController.assignTicketTI);
router.put('/:id/status', TicketTIController.updateStatusTI);
router.put('/:id/close', TicketTIController.closeTicketTI);

export default router;