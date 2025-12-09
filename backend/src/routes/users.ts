// src/routes/userRoutes.ts
import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Ruta existente - usuarios del área del usuario logueado
router.get('/area-users', UserController.getAreaUsers);

// Nueva ruta - usuarios de un área específica (para asignación de tickets)
router.get('/area/:areaId', UserController.getUsersByArea);

// Obtener todos los usuarios (solo superadmin)
router.get('/', UserController.getAllUsers);

router.get('/ti-assignment', UserController.getUsersForTIAssignment);

export default router;