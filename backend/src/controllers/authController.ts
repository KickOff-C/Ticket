// src/controllers/authController.ts
import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { generateToken, generateRefreshToken } from '../utils/jwt';

export class AuthController {
  
  // ✅ Método login - Autenticación de usuario
  static async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
      }
      
      const result = await AuthService.login({ username, password });
      
      if (!result.success) {
        return res.status(401).json({ error: result.message });
      }
      
      // ✅ VERIFICAR que user existe
      if (!result.user) {
        return res.status(401).json({ error: 'Usuario no encontrado' });
      }
      
      // ✅ Obtener username seguro
      const userLogin = result.user.Login || '';
      
      // Generar tokens
      const accessToken = generateToken({ 
        Id_Ejecutivo: result.user.Id_Ejecutivo, 
        username: userLogin,
        role: result.user.ticketData?.role || 'USER'
      });
      
      const refreshToken = generateRefreshToken({ 
        Id_Ejecutivo: result.user.Id_Ejecutivo 
      });
      
      // Actualizar última sesión
      await AuthService.updateLastSession(result.user.Id_Ejecutivo);
      
      res.status(200).json({
        success: true,
        message: 'Login exitoso',
        user: {
          id: result.user.Id_Ejecutivo,
          name: result.user.Nombre || '',
          email: result.user.Correo || '',
          username: userLogin,
          role: result.user.ticketData?.role || 'USER',
          areaId: result.user.id_area || null
        },
        tokens: {
          accessToken,
          refreshToken
        }
      });
      
    } catch (error: any) {
      console.error('Error en login:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
  
  // ✅ Método getProfile - Obtener perfil del usuario autenticado
  static async getProfile(req: Request, res: Response) {
    try {
      // El usuario ya está autenticado por el middleware
      const userId = (req as any).user?.Id_Ejecutivo;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }
      
      const profile = await AuthService.getProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      res.status(200).json({
        success: true,
        profile
      });
      
    } catch (error: any) {
      console.error('Error obteniendo perfil:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
  
  // ✅ Método changePassword - Cambiar contraseña
  static async changePassword(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.Id_Ejecutivo;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }
      
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Contraseña actual y nueva contraseña son requeridas' });
      }
      
      const result = await AuthService.changePassword(userId, {
        currentPassword,
        newPassword
      });
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      res.status(200).json({
        success: true,
        message: 'Contraseña cambiada exitosamente'
      });
      
    } catch (error: any) {
      console.error('Error cambiando contraseña:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
  
  // ✅ Método refreshToken - Refrescar token de acceso
  static async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token es requerido' });
      }
      
      const result = await AuthService.refreshToken(refreshToken);
      
      if (!result.success) {
        return res.status(401).json({ error: result.message });
      }
      
      res.status(200).json({
        success: true,
        accessToken: result.accessToken,
        refreshToken: result.newRefreshToken || refreshToken
      });
      
    } catch (error: any) {
      console.error('Error refrescando token:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
  
  // ✅ Método verifyToken - Verificar token de acceso
  static async verifyToken(req: Request, res: Response) {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ error: 'Token es requerido' });
      }
      
      const result = await AuthService.verifyToken(token);
      
      if (!result.valid) {
        return res.status(401).json({ 
          valid: false, 
          error: 'Token inválido o expirado' 
        });
      }
      
      res.status(200).json({
        valid: true,
        user: result.user
      });
      
    } catch (error: any) {
      console.error('Error verificando token:', error);
      res.status(500).json({ valid: false, error: 'Error interno del servidor' });
    }
  }
  
  // ✅ Método checkUserExists - Verificar si usuario existe
  static async checkUserExists(req: Request, res: Response) {
    try {
      const { username } = req.params;
      
      if (!username) {
        return res.status(400).json({ error: 'Nombre de usuario es requerido' });
      }
      
      const result = await AuthService.checkUserExists(username);
      
      res.status(200).json({
        exists: result.exists,
        username: result.username,
        message: result.message
      });
      
    } catch (error: any) {
      console.error('Error verificando usuario:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
  
  // ✅ Método updateProfile - Actualizar perfil
  static async updateProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.Id_Ejecutivo;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }
      
      const profileData = req.body;
      
      const result = await AuthService.updateProfile(userId, profileData);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      res.status(200).json({
        success: true,
        message: 'Perfil actualizado exitosamente',
        user: result.user
      });
      
    } catch (error: any) {
      console.error('Error actualizando perfil:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
  
  // ✅ Método logout - Cerrar sesión
  static async logout(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }
      
      const token = req.headers.authorization?.split(' ')[1] || '';
      
      await AuthService.logout(userId, token);
      
      res.status(200).json({
        success: true,
        message: 'Sesión cerrada exitosamente'
      });
      
    } catch (error: any) {
      console.error('Error en logout:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
  
  // ✅ Método initializeUserTicketData - Inicializar datos de tickets para usuario
  static async initializeUserTicketData(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.Id_Ejecutivo;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }
      
      const result = await AuthService.initializeUserTicketData(userId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      res.status(200).json({
        success: true,
        message: 'Datos de tickets inicializados exitosamente',
        data: result.data
      });
      
    } catch (error: any) {
      console.error('Error inicializando datos de tickets:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
  
  // ✅ Método updateLastSession - Actualizar última sesión (puede ser automático)
  static async updateLastSession(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.Id_Ejecutivo;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }
      
      await AuthService.updateLastSession(userId);
      
      res.status(200).json({
        success: true,
        message: 'Última sesión actualizada'
      });
      
    } catch (error: any) {
      console.error('Error actualizando sesión:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
  
  // ✅ Método getAuthStats - Obtener estadísticas de autenticación
  static async getAuthStats(req: Request, res: Response) {
    try {
      const stats = await AuthService.getAuthStats();
      
      res.status(200).json({
        success: true,
        stats
      });
      
    } catch (error: any) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}