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
router.get('/tipos/list', requireUser, TicketController.getTicketTypes);

// Rutas para parcelas (acceso para usuarios - todos pueden buscar parcelas)
router.get('/parcelas/list', requireUser, TicketController.getParcelas);
router.get('/parcelas/:parcelaId/propietarios', requireUser, TicketController.getPropietariosByParcela);

// Rutas para propietarios (acceso para usuarios)
router.get('/propietarios/search', requireUser, TicketController.searchPropietarios);
export default router;