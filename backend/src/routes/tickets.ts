import { Router } from 'express';
import { TicketController } from '../controllers/ticketController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas de tickets
router.post('/', TicketController.createTicket);
router.get('/', TicketController.getTickets);
router.get('/:id', TicketController.getTicketById);
router.post('/:id/comments', TicketController.addComment);
router.put('/:id/close', TicketController.closeTicket);
router.put('/:id/status', TicketController.updateStatus);
router.put('/:id/assign', TicketController.assignToUser); // ✅ SOLO UNA RUTA

export default router;