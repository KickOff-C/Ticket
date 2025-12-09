import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/auth';

export class UserController {
  static async getAreaUsers(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const userAreaId = req.user?.areaId;
      const userRole = req.user?.role;

      console.log('🔍 Obteniendo usuarios para área del usuario:', userAreaId, 'Rol:', userRole);

      // Para SUPERADMIN, obtener usuarios de todas las áreas de TI
      let areaIdToUse = userAreaId;

      // Si es SUPERADMIN y no tiene área específica, buscar el área TI
      if (userRole === 'SUPERADMIN' && !userAreaId) {
        const tiArea = await prisma.area.findFirst({
          where: { name: 'TI' }
        });
        areaIdToUse = tiArea?.id;
      }

      if (!areaIdToUse && userRole !== 'SUPERADMIN') {
        return res.status(400).json({ 
          error: 'No se pudo determinar el área del usuario' 
        });
      }

      // Construir where clause basado en permisos
      let whereClause: any = {
        isActive: true,
        id: { not: userId } // Excluir al usuario actual
      };

      // Si no es SUPERADMIN, filtrar por área del usuario
      if (userRole !== 'SUPERADMIN') {
        whereClause.areaId = areaIdToUse;
      } else {
        // SUPERADMIN puede ver usuarios de TI y otros SUPERADMINS
        whereClause.OR = [
          { area: { name: 'TI' } },
          { role: 'SUPERADMIN' }
        ];
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          role: true,
          isActive: true,
          createdAt: true,
          area: {
            select: {
              id: true,
              name: true
            }
          },
          ticketsClosed: true
        },
        orderBy: { name: 'asc' }
      });

      console.log(`✅ Usuarios encontrados: ${users.length}`);
      res.json(users);

    } catch (error: unknown) {
      console.error('Error obteniendo usuarios del área:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ 
        error: 'Error al obtener usuarios',
        ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
      });
    }
  }

  static async getUsersByArea(req: AuthRequest, res: Response) {
    try {
      const { areaId } = req.params;
      const userRole = req.user?.role;
      const userAreaId = req.user?.areaId;

      console.log('🔍 Solicitando usuarios para área:', areaId, 'Usuario área:', userAreaId, 'Rol:', userRole);

      // CORREGIDO: Para SUPERADMIN, permitir ver usuarios sin área específica
      let targetAreaId: number | undefined;

      if (areaId) {
        targetAreaId = parseInt(areaId);
        if (isNaN(targetAreaId)) {
          return res.status(400).json({ error: 'ID de área inválido' });
        }
      } else if (userRole === 'SUPERADMIN') {
        // SUPERADMIN puede ver usuarios de todas las áreas de TI
        const tiArea = await prisma.area.findFirst({
          where: { name: 'TI' }
        });
        targetAreaId = tiArea?.id;
      } else {
        targetAreaId = userAreaId;
      }

      if (!targetAreaId) {
        return res.status(400).json({ error: 'No se pudo determinar el área' });
      }

      // Verificar permisos - SUPERADMIN puede ver cualquier área
      const canViewUsers = 
        userRole === 'SUPERADMIN' ||
        userRole === 'ADMIN' || 
        userRole === 'MANAGER' ||
        (userRole === 'USER' && userAreaId === targetAreaId);

      if (!canViewUsers) {
        return res.status(403).json({ 
          error: 'No tienes permisos para ver usuarios de esta área' 
        });
      }

      const users = await prisma.user.findMany({
        where: {
          areaId: targetAreaId,
          isActive: true,
          role: {
            not: 'SUPERADMIN'
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          role: true,
          isActive: true,
          createdAt: true,
          area: {
            select: {
              id: true,
              name: true
            }
          },
          ticketsClosed: true
        },
        orderBy: { name: 'asc' }
      });

      console.log(`✅ Usuarios encontrados para área ${targetAreaId}:`, users.length);
      res.json(users);

    } catch (error: unknown) {
      console.error('❌ Error obteniendo usuarios por área:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ 
        error: 'Error al obtener usuarios',
        ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
      });
    }
  }

  static async getAllUsers(req: AuthRequest, res: Response) {
    try {
      const userRole = req.user?.role;

      // Solo SUPERADMIN puede ver todos los usuarios
      if (userRole !== 'SUPERADMIN') {
        return res.status(403).json({ 
          error: 'No tienes permisos para ver todos los usuarios' 
        });
      }

      const users = await prisma.user.findMany({
        where: {
          isActive: true
        },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          area: {
            select: {
              id: true,
              name: true
            }
          },
          ticketsClosed: true
        },
        orderBy: { name: 'asc' }
      });

      res.json(users);

    } catch (error: unknown) {
      console.error('Error obteniendo usuarios:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ 
        error: 'Error al obtener usuarios',
        ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
      });
    }
  }

  // NUEVO MÉTODO: Específico para asignación de tickets TI
  static async getUsersForTIAssignment(req: AuthRequest, res: Response) {
    try {
      const userRole = req.user?.role;
      const userAreaId = req.user?.areaId;

      console.log('🔍 Obteniendo usuarios para asignación TI - Rol:', userRole, 'Área:', userAreaId);

      // Solo SUPERADMIN y usuarios de TI pueden asignar tickets TI
      const canAssignTI = userRole === 'SUPERADMIN' || userAreaId === 3; // 3 = área TI

      if (!canAssignTI) {
        return res.status(403).json({ 
          error: 'No tienes permisos para asignar tickets TI' 
        });
      }

      // Obtener usuarios de TI y SUPERADMINS
      const users = await prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { area: { name: 'TI' } },
            { role: 'SUPERADMIN' }
          ]
        },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          role: true,
          area: {
            select: {
              id: true,
              name: true
            }
          },
          ticketsClosed: true
        },
        orderBy: { name: 'asc' }
      });

      console.log(`✅ Usuarios disponibles para asignación TI: ${users.length}`);
      res.json(users);

    } catch (error: unknown) {
      console.error('❌ Error obteniendo usuarios para asignación TI:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ 
        error: 'Error al obtener usuarios para asignación',
        ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
      });
    }
  }
}