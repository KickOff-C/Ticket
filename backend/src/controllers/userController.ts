// src/controllers/userController.ts
import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/auth';
import { UserService } from '../services/userService'; // Asumiremos que creamos este service

export class UserController {
  // Métodos existentes que ya tenemos
  static async getAreaUsers(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.Id_Ejecutivo;
      const userAreaId = req.user?.areaId;
      const userRole = req.user?.role;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const result = await UserService.getAreaUsers(userId, userAreaId, userRole);
      res.json(result);
    } catch (error) {
      console.error('Error obteniendo usuarios del área:', error);
      res.status(500).json({ 
        error: 'Error al obtener usuarios',
        message: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async getUsersByArea(req: AuthRequest, res: Response) {
    try {
      const { areaId } = req.params;
      const userId = req.user?.Id_Ejecutivo;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const result = await UserService.getUsersByArea(parseInt(areaId), userId);
      res.json(result);
    } catch (error) {
      console.error('Error obteniendo usuarios por área:', error);
      res.status(500).json({ 
        error: 'Error al obtener usuarios',
        message: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async getAllUsers(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.Id_Ejecutivo;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const result = await UserService.getAllUsers(userId);
      res.json(result);
    } catch (error) {
      console.error('Error obteniendo todos los usuarios:', error);
      res.status(500).json({ 
        error: 'Error al obtener usuarios',
        message: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async getUsersForTIAssignment(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.Id_Ejecutivo;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const result = await UserService.getUsersForTIAssignment(userId);
      res.json(result);
    } catch (error) {
      console.error('Error obteniendo usuarios para asignación TI:', error);
      res.status(500).json({ 
        error: 'Error al obtener usuarios',
        message: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async getUserById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.Id_Ejecutivo;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const result = await UserService.getUserById(parseInt(id), userId);
      res.json(result);
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      res.status(500).json({ 
        error: 'Error al obtener usuario',
        message: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async getUsersByRole(req: AuthRequest, res: Response) {
    try {
      const { role } = req.params;
      const userId = req.user?.Id_Ejecutivo;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const result = await UserService.getUsersByRole(role, userId);
      res.json(result);
    } catch (error) {
      console.error('Error obteniendo usuarios por rol:', error);
      res.status(500).json({ 
        error: 'Error al obtener usuarios',
        message: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // ========== NUEVOS MÉTODOS ==========

  static async getProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.Id_Ejecutivo;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const result = await UserService.getUserProfile(userId);
      res.json(result);
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      res.status(500).json({ 
        error: 'Error al obtener perfil',
        message: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async changePassword(req: AuthRequest, res: Response) {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.user?.Id_Ejecutivo;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const result = await UserService.changePassword(userId, oldPassword, newPassword);
      res.json(result);
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      const status = error instanceof Error && error.message.includes('incorrecta') ? 400 : 500;
      res.status(status).json({ 
        error: 'Error al cambiar contraseña',
        message: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async updateProfile(req: AuthRequest, res: Response) {
    try {
      const profileData = req.body;
      const userId = req.user?.Id_Ejecutivo;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const result = await UserService.updateProfile(userId, profileData);
      res.json(result);
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      res.status(500).json({ 
        error: 'Error al actualizar perfil',
        message: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async createUser(req: AuthRequest, res: Response) {
    try {
      const userData = req.body;
      const createdById = req.user?.Id_Ejecutivo;

      if (!createdById) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const result = await UserService.createUser(userData, createdById);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error creando usuario:', error);
      res.status(400).json({ 
        error: 'Error al crear usuario',
        message: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async updateUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userData = req.body;
      const updatedById = req.user?.Id_Ejecutivo;

      if (!updatedById) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const result = await UserService.updateUser(parseInt(id), userData, updatedById);
      res.json(result);
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      res.status(400).json({ 
        error: 'Error al actualizar usuario',
        message: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async toggleUserStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { active } = req.body;
      const updatedById = req.user?.Id_Ejecutivo;

      if (!updatedById) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const result = await UserService.toggleUserStatus(parseInt(id), active, updatedById);
      res.json(result);
    } catch (error) {
      console.error('Error cambiando estado de usuario:', error);
      res.status(400).json({ 
        error: 'Error al cambiar estado',
        message: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async updateUserRole(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const updatedById = req.user?.Id_Ejecutivo;

      if (!updatedById) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const result = await UserService.updateUserRole(parseInt(id), role, updatedById);
      res.json(result);
    } catch (error) {
      console.error('Error actualizando rol de usuario:', error);
      res.status(400).json({ 
        error: 'Error al actualizar rol',
        message: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async resetUserPassword(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      const resetById = req.user?.Id_Ejecutivo;

      if (!resetById) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const result = await UserService.resetUserPassword(parseInt(id), newPassword, resetById);
      res.json(result);
    } catch (error) {
      console.error('Error restableciendo contraseña:', error);
      res.status(400).json({ 
        error: 'Error al restablecer contraseña',
        message: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async getUserStats(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.Id_Ejecutivo;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const result = await UserService.getUserStats(userId);
      res.json(result);
    } catch (error) {
      console.error('Error obteniendo estadísticas de usuarios:', error);
      res.status(500).json({ 
        error: 'Error al obtener estadísticas',
        message: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async getUserActivity(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.Id_Ejecutivo;
      const { days = 30 } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const result = await UserService.getUserActivity(userId, parseInt(days as string));
      res.json(result);
    } catch (error) {
      console.error('Error obteniendo actividad de usuarios:', error);
      res.status(500).json({ 
        error: 'Error al obtener actividad',
        message: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async getMyAreaUsers(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.Id_Ejecutivo;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const result = await UserService.getMyAreaUsers(userId);
      res.json(result);
    } catch (error) {
      console.error('Error obteniendo usuarios de mi área:', error);
      res.status(500).json({ 
        error: 'Error al obtener usuarios',
        message: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
}