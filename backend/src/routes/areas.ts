// src/routes/areaRoutes.ts
import { Router } from 'express';
import { AreaController } from '../controllers/areaController';
import { authenticateToken,requireAdmin, requireSuperAdmin, requireManager} from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// ========== RUTAS PÚBLICAS (para usuarios autenticados) ==========

// GET /api/areas - Obtener todas las áreas
router.get('/', AreaController.getAreas);

// GET /api/areas/:id - Obtener área específica con usuarios
router.get('/:id', AreaController.getAreaWithUsers);

// GET /api/areas/:id/metrics - Métricas de un área específica
router.get('/:id/metrics', AreaController.getAreaMetrics);

// ========== RUTAS PARA MANAGERS Y ADMINS ==========

// GET /api/areas/my-area/users - Obtener usuarios de mi área (para managers)
router.get('/my-area/users', requireManager, AreaController.getMyAreaUsers);

// ========== RUTAS PARA SUPERADMIN ==========

// POST /api/areas - Crear nueva área (solo superadmin)
router.post('/', requireSuperAdmin, AreaController.createArea);

// PUT /api/areas/:id - Actualizar área (solo superadmin)
router.put('/:id', requireSuperAdmin, AreaController.updateArea);

// DELETE /api/areas/:id - Eliminar área (solo superadmin)
router.delete('/:id', requireSuperAdmin, AreaController.deleteArea);

// ========== RUTAS PARA ADMIN Y SUPERADMIN ==========

// POST /api/areas/:id/manager - Actualizar manager del área
router.post('/:id/manager', requireAdmin, AreaController.updateAreaManager);

export default router;