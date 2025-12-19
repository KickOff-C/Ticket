// src/controllers/AreaController.ts
import { Request, Response } from 'express';
import { prisma } from '../app';

export class AreaController {
  
  // ✅ Método para obtener todas las áreas
  static async getAreas(req: Request, res: Response) {
    try {
      const areas = await prisma.area.findMany({
        orderBy: { nombre_area: 'asc' },
        include: {
          manager: {
            select: {
              Id_Ejecutivo: true,
              Nombre: true,
              Login: true
            }
          },
          _count: {
            select: { users: true }
          }
        }
      });
      
      res.status(200).json({
        success: true,
        areas
      });
    } catch (error) {
      console.error('Error obteniendo áreas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
  
  // ✅ Método para obtener área con usuarios
  static async getAreaWithUsers(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const areaId = parseInt(id);
      
      const area = await prisma.area.findUnique({
        where: { id_area: areaId },
        include: {
          manager: {
            select: {
              Id_Ejecutivo: true,
              Nombre: true,
              Login: true,
              Correo: true
            }
          },
          users: {
            select: {
              Id_Ejecutivo: true,
              Nombre: true,
              Login: true,
              Correo: true,
              activo: true,
              ticketData: {
                select: { role: true }
              }
            }
          }
        }
      });
      
      if (!area) {
        return res.status(404).json({ error: 'Área no encontrada' });
      }
      
      res.status(200).json({
        success: true,
        area
      });
    } catch (error) {
      console.error('Error obteniendo área con usuarios:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
  
  // ✅ Método para obtener métricas del área
  static async getAreaMetrics(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const areaId = parseInt(id);
      
      // Verificar que el área existe
      const area = await prisma.area.findUnique({
        where: { id_area: areaId }
      });
      
      if (!area) {
        return res.status(404).json({ error: 'Área no encontrada' });
      }
      
      // Obtener estadísticas
      const usersCount = await prisma.usuarios.count({
        where: { id_area: areaId }
      });
      
      const activeUsersCount = await prisma.usuarios.count({
        where: { 
          id_area: areaId,
          activo: 1
        }
      });
      
      const ticketsCount = await prisma.tK_tickets.count({
        where: { areaId: areaId }
      });
      
      const openTicketsCount = await prisma.tK_tickets.count({
        where: { 
          areaId: areaId,
          status: 'ABIERTO'
        }
      });
      
      res.status(200).json({
        success: true,
        metrics: {
          areaId,
          areaName: area.nombre_area,
          users: {
            total: usersCount,
            active: activeUsersCount,
            inactive: usersCount - activeUsersCount
          },
          tickets: {
            total: ticketsCount,
            open: openTicketsCount,
            closed: ticketsCount - openTicketsCount
          }
        }
      });
    } catch (error) {
      console.error('Error obteniendo métricas del área:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
  
  // ✅ Método para actualizar manager del área
  static async updateAreaManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { managerId } = req.body;
      const areaId = parseInt(id);
      
      if (!managerId) {
        return res.status(400).json({ error: 'ID del manager es requerido' });
      }
      
      // Verificar que el área existe
      const area = await prisma.area.findUnique({
        where: { id_area: areaId }
      });
      
      if (!area) {
        return res.status(404).json({ error: 'Área no encontrada' });
      }
      
      // Verificar que el usuario existe y está activo
      const user = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: managerId },
        include: { ticketData: true }
      });
      
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      if (user.activo !== 1) {
        return res.status(400).json({ error: 'El usuario no está activo' });
      }
      
      // Actualizar manager del área
      const updatedArea = await prisma.area.update({
        where: { id_area: areaId },
        data: { TK_managerId: managerId },
        include: {
          manager: {
            select: {
              Id_Ejecutivo: true,
              Nombre: true,
              Login: true
            }
          }
        }
      });
      
      res.status(200).json({
        success: true,
        message: 'Manager del área actualizado exitosamente',
        area: updatedArea
      });
    } catch (error) {
      console.error('Error actualizando manager del área:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
  
  // ✅ Método para crear área (solo SuperAdmin)
  static async createArea(req: Request, res: Response) {
    try {
      const { nombre_area, managerId } = req.body;
      
      if (!nombre_area) {
        return res.status(400).json({ error: 'Nombre del área es requerido' });
      }
      
      // Verificar si el área ya existe
      const existingArea = await prisma.area.findFirst({
        where: { nombre_area }
      });
      
      if (existingArea) {
        return res.status(400).json({ error: 'Ya existe un área con ese nombre' });
      }
      
      // Crear el área
      const areaData: any = {
        nombre_area
      };
      
      if (managerId) {
        // Verificar que el manager existe
        const manager = await prisma.usuarios.findUnique({
          where: { Id_Ejecutivo: managerId }
        });
        
        if (!manager) {
          return res.status(404).json({ error: 'Manager no encontrado' });
        }
        
        areaData.TK_managerId = managerId;
      }
      
      const newArea = await prisma.area.create({
        data: areaData,
        include: {
          manager: {
            select: {
              Id_Ejecutivo: true,
              Nombre: true,
              Login: true
            }
          }
        }
      });
      
      res.status(201).json({
        success: true,
        message: 'Área creada exitosamente',
        area: newArea
      });
    } catch (error) {
      console.error('Error creando área:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
  
  // ✅ Método para actualizar área (solo SuperAdmin)
  static async updateArea(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { nombre_area, managerId } = req.body;
      const areaId = parseInt(id);
      
      if (!nombre_area) {
        return res.status(400).json({ error: 'Nombre del área es requerido' });
      }
      
      // Verificar que el área existe
      const area = await prisma.area.findUnique({
        where: { id_area: areaId }
      });
      
      if (!area) {
        return res.status(404).json({ error: 'Área no encontrada' });
      }
      
      // Verificar si el nuevo nombre ya existe (si es diferente)
      if (nombre_area !== area.nombre_area) {
        const existingArea = await prisma.area.findFirst({
          where: { nombre_area }
        });
        
        if (existingArea) {
          return res.status(400).json({ error: 'Ya existe un área con ese nombre' });
        }
      }
      
      // Actualizar datos
      const updateData: any = {
        nombre_area
      };
      
      if (managerId !== undefined) {
        if (managerId === null) {
          updateData.TK_managerId = null;
        } else {
          // Verificar que el manager existe
          const manager = await prisma.usuarios.findUnique({
            where: { Id_Ejecutivo: managerId }
          });
          
          if (!manager) {
            return res.status(404).json({ error: 'Manager no encontrado' });
          }
          
          updateData.TK_managerId = managerId;
        }
      }
      
      const updatedArea = await prisma.area.update({
        where: { id_area: areaId },
        data: updateData,
        include: {
          manager: {
            select: {
              Id_Ejecutivo: true,
              Nombre: true,
              Login: true
            }
          }
        }
      });
      
      res.status(200).json({
        success: true,
        message: 'Área actualizada exitosamente',
        area: updatedArea
      });
    } catch (error) {
      console.error('Error actualizando área:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
  
  // ✅ Método para eliminar área (solo SuperAdmin)
  static async deleteArea(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const areaId = parseInt(id);
      
      // Verificar que el área existe
      const area = await prisma.area.findUnique({
        where: { id_area: areaId }
      });
      
      if (!area) {
        return res.status(404).json({ error: 'Área no encontrada' });
      }
      
      // Verificar que no hay usuarios en el área
      const usersInArea = await prisma.usuarios.count({
        where: { id_area: areaId }
      });
      
      if (usersInArea > 0) {
        return res.status(400).json({ 
          error: 'No se puede eliminar el área porque tiene usuarios asignados',
          usersCount: usersInArea
        });
      }
      
      // Eliminar el área
      await prisma.area.delete({
        where: { id_area: areaId }
      });
      
      res.status(200).json({
        success: true,
        message: 'Área eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error eliminando área:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
  
  // ✅ Método para obtener usuarios de mi área (para managers)
  static async getMyAreaUsers(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      
      // Obtener el área del usuario
      const user = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId },
        select: { id_area: true }
      });
      
      if (!user || !user.id_area) {
        return res.status(404).json({ error: 'Usuario no tiene área asignada' });
      }
      
      // Obtener usuarios del área
      const users = await prisma.usuarios.findMany({
        where: { 
          id_area: user.id_area,
          activo: 1
        },
        select: {
          Id_Ejecutivo: true,
          Nombre: true,
          Login: true,
          Correo: true,
          Anexo: true,
          Supervisor: true,
          fecha_ingreso: true,
          telefono: true,
          ticketData: {
            select: { role: true }
          }
        },
        orderBy: { Nombre: 'asc' }
      });
      
      res.status(200).json({
        success: true,
        areaId: user.id_area,
        users,
        count: users.length
      });
    } catch (error) {
      console.error('Error obteniendo usuarios de mi área:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}