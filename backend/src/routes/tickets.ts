// src/routes/tickets.ts
import { Router } from 'express';
import { TicketController } from '../controllers/ticketController';
import { 
  authenticateToken, 
  requireUser, 
  requireManager,
  requireAdmin,
  requireOwnershipOrRole,
  requireAreaAccess
} from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas de tickets generales
router.post('/', requireUser, TicketController.createTicket);
router.get('/', requireUser, TicketController.getTickets);
router.get('/:id', requireUser, requireOwnershipOrRole(['MANAGER', 'ADMIN', 'SUPERADMIN']), TicketController.getTicketById);
router.post('/:id/comments', requireUser, requireOwnershipOrRole(['MANAGER', 'ADMIN', 'SUPERADMIN']), TicketController.addComment);
router.put('/:id/close', requireUser, requireOwnershipOrRole(['MANAGER', 'ADMIN', 'SUPERADMIN']), TicketController.closeTicket);
router.put('/:id/status', requireManager, requireAreaAccess, TicketController.updateStatus);
router.put('/:id/assign', requireManager, requireAreaAccess, TicketController.assignToUser);

export default router;