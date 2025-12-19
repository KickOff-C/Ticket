// src/routes/userRoutes.ts
import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { 
  authenticateToken, 
  requireAdmin, 
  requireSuperAdmin,
  requireManager,
  requireUser,
  requireOwnershipOrRole 
} from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// ========== RUTAS PÚBLICAS (para usuarios autenticados) ==========

// Obtener perfil del usuario actual
router.get('/profile', UserController.getProfile);

// Cambiar contraseña del usuario actual
router.post('/change-password', UserController.changePassword);

// Actualizar perfil del usuario actual
router.put('/profile', UserController.updateProfile);

// Obtener usuarios del área del usuario actual
router.get('/area-users', UserController.getAreaUsers);

// ========== RUTAS PARA MANAGERS Y ADMINS ==========

// Obtener usuarios de un área específica
router.get('/area/:areaId', requireAdmin, UserController.getUsersByArea);

// Obtener usuarios para asignación de tickets TI (TI y superadmins)
router.get('/ti-assignment', UserController.getUsersForTIAssignment);

// Obtener usuarios de mi área (solo para managers)
router.get('/my-area/users', requireManager, UserController.getMyAreaUsers);

// ========== RUTAS PARA SUPERADMIN ==========

// Obtener todos los usuarios (solo superadmin)
router.get('/', requireSuperAdmin, UserController.getAllUsers);

// Obtener usuario por ID (con permisos)
router.get('/:id', requireOwnershipOrRole(['ADMIN', 'SUPERADMIN']), UserController.getUserById);

// Obtener usuarios por rol (solo superadmin)
router.get('/role/:role', requireSuperAdmin, UserController.getUsersByRole);

// Crear nuevo usuario (solo superadmin)
router.post('/', requireSuperAdmin, UserController.createUser);

// Actualizar usuario (solo superadmin o el propio usuario)
router.put('/:id', requireOwnershipOrRole(['ADMIN', 'SUPERADMIN']), UserController.updateUser);

// Desactivar/activar usuario (solo superadmin)
router.patch('/:id/status', requireSuperAdmin, UserController.toggleUserStatus);

// Asignar/remover rol de usuario (solo superadmin)
router.patch('/:id/role', requireSuperAdmin, UserController.updateUserRole);

// Restablecer contraseña de usuario (admin/superadmin)
router.post('/:id/reset-password', requireAdmin, UserController.resetUserPassword);

// ========== RUTAS PARA ESTADÍSTICAS ==========

// Obtener estadísticas de usuarios (admin y superadmin)
router.get('/stats/overview', requireAdmin, UserController.getUserStats);

// Obtener actividad de usuarios (solo superadmin)
router.get('/stats/activity', requireSuperAdmin, UserController.getUserActivity);

export default router;