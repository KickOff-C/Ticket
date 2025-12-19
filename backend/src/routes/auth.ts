// src/routes/auth.ts
import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken, requireUser } from '../middleware/auth';

const router = Router();

// Ruta pública: login
router.post('/login', AuthController.login);

// Ruta pública: verificar token
router.post('/verify', AuthController.verifyToken);

// Ruta pública: verificar si usuario existe
router.get('/check/:username', AuthController.checkUserExists);

// Todas las rutas siguientes requieren autenticación
router.use(authenticateToken);

// Rutas protegidas
router.get('/profile', AuthController.getProfile);
router.put('/change-password', AuthController.changePassword);
router.post('/refresh', AuthController.refreshToken);
router.put('/profile', AuthController.updateProfile);
router.post('/logout', AuthController.logout);
router.post('/initialize-ticket-data', AuthController.initializeUserTicketData);
router.put('/update-session', AuthController.updateLastSession);
router.get('/stats', requireUser, AuthController.getAuthStats);

export default router;