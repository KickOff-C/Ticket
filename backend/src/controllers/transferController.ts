// src/controllers/TransferController.ts
import { Request, Response } from 'express';
import { prisma } from '../app';

export class TransferController {
  
  // ✅ Solicitar transferencia de ticket
  static async requestTransfer(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { ticketId, toAreaId, reason } = req.body;
      
      if (!ticketId || !toAreaId || !reason) {
        return res.status(400).json({ 
          error: 'ticketId, toAreaId y reason son requeridos' 
        });
      }
      
      // Verificar que el ticket existe
      const ticket = await prisma.tK_tickets.findUnique({
        where: { id: ticketId },
        include: { area: true }
      });
      
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket no encontrado' });
      }
      
      // Verificar que el usuario tiene permiso para transferir este ticket
      const user = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId },
        include: { ticketData: true }
      });
      
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      const userRole = user.ticketData?.role || 'USER';
      
      // Solo managers, admins y superadmins pueden transferir tickets
      if (!['MANAGER', 'ADMIN', 'SUPERADMIN'].includes(userRole)) {
        return res.status(403).json({ 
          error: 'No tiene permisos para transferir tickets' 
        });
      }
      
      // Verificar que el área destino existe
      const toArea = await prisma.area.findUnique({
        where: { id_area: toAreaId }
      });
      
      if (!toArea) {
        return res.status(404).json({ error: 'Área destino no encontrada' });
      }
      
      // Verificar que no sea transferencia al mismo área
      if (ticket.areaId === toAreaId) {
        return res.status(400).json({ 
          error: 'No se puede transferir a la misma área' 
        });
      }
      
      // Crear solicitud de transferencia
      const transferRequest = await prisma.tK_transfer_requests.create({
        data: {
          ticketId,
          fromAreaId: ticket.areaId,
          toAreaId,
          requestedById: userId,
          status: 'PENDIENTE'
        },
        include: {
          ticket: {
            select: {
              id: true,
              title: true,
              status: true
            }
          },
          fromArea: {
            select: {
              id_area: true,
              nombre_area: true
            }
          },
          toArea: {
            select: {
              id_area: true,
              nombre_area: true
            }
          },
          requestedBy: {
            select: {
              Id_Ejecutivo: true,
              Nombre: true,
              Login: true
            }
          }
        }
      });
      
      // Crear historial
      await prisma.tK_ticket_history.create({
        data: {
          ticketId,
          action: 'SOLICITUD_TRANSFERENCIA',
          details: `Solicitada transferencia de área ${ticket.area.nombre_area} a ${toArea.nombre_area}. Razón: ${reason}`,
          userId
        }
      });
      
      res.status(201).json({
        success: true,
        message: 'Solicitud de transferencia creada',
        transfer: transferRequest
      });
      
    } catch (error: any) {
      console.error('Error solicitando transferencia:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
  
  // ✅ Obtener transferencias pendientes
  static async getPendingTransfers(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      
      // Obtener rol del usuario
      const user = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId },
        include: { ticketData: true }
      });
      
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      const userRole = user.ticketData?.role || 'USER';
      
      let pendingTransfers;
      
      if (['ADMIN', 'SUPERADMIN'].includes(userRole)) {
        // Admins y SuperAdmins ven todas las transferencias pendientes
        pendingTransfers = await prisma.tK_transfer_requests.findMany({
          where: { status: 'PENDIENTE' },
          include: {
            ticket: {
              select: {
                id: true,
                title: true,
                status: true,
                priority: true
              }
            },
            fromArea: {
              select: {
                id_area: true,
                nombre_area: true
              }
            },
            toArea: {
              select: {
                id_area: true,
                nombre_area: true
              }
            },
            requestedBy: {
              select: {
                Id_Ejecutivo: true,
                Nombre: true,
                Login: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
      } else if (userRole === 'MANAGER') {
        // Managers ven solo transferencias pendientes de su área
        pendingTransfers = await prisma.tK_transfer_requests.findMany({
          where: { 
            status: 'PENDIENTE',
            toAreaId: user.id_area // Transferencias dirigidas a su área
          },
          include: {
            ticket: {
              select: {
                id: true,
                title: true,
                status: true,
                priority: true
              }
            },
            fromArea: {
              select: {
                id_area: true,
                nombre_area: true
              }
            },
            toArea: {
              select: {
                id_area: true,
                nombre_area: true
              }
            },
            requestedBy: {
              select: {
                Id_Ejecutivo: true,
                Nombre: true,
                Login: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
      } else {
        return res.status(403).json({ 
          error: 'No tiene permisos para ver transferencias pendientes' 
        });
      }
      
      res.status(200).json({
        success: true,
        transfers: pendingTransfers,
        count: pendingTransfers.length
      });
      
    } catch (error: any) {
      console.error('Error obteniendo transferencias pendientes:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
  
  // ✅ Procesar transferencia (aprobar/rechazar)
  static async processTransfer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { action, reason } = req.body; // action: 'APPROVE' o 'REJECT'
      const userId = (req as any).user.id;
      const transferId = parseInt(id);
      
      if (!action || !['APPROVE', 'REJECT'].includes(action)) {
        return res.status(400).json({ 
          error: 'Acción inválida. Use APPROVE o REJECT' 
        });
      }
      
      // Obtener la transferencia
      const transfer = await prisma.tK_transfer_requests.findUnique({
        where: { id: transferId },
        include: {
          ticket: true,
          fromArea: true,
          toArea: true
        }
      });
      
      if (!transfer) {
        return res.status(404).json({ error: 'Transferencia no encontrada' });
      }
      
      if (transfer.status !== 'PENDIENTE') {
        return res.status(400).json({ 
          error: 'La transferencia ya ha sido procesada' 
        });
      }
      
      // Verificar permisos del usuario
      const user = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId },
        include: { ticketData: true }
      });
      
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      const userRole = user.ticketData?.role || 'USER';
      
      // Solo managers del área destino, admins y superadmins pueden procesar
      if (['ADMIN', 'SUPERADMIN'].includes(userRole)) {
        // Admins y SuperAdmins pueden procesar cualquier transferencia
      } else if (userRole === 'MANAGER') {
        // Managers solo pueden procesar transferencias a su área
        const isManagerOfToArea = await prisma.area.findFirst({
          where: {
            id_area: transfer.toAreaId,
            TK_managerId: userId
          }
        });
        
        if (!isManagerOfToArea) {
          return res.status(403).json({ 
            error: 'Solo el manager del área destino puede procesar esta transferencia' 
          });
        }
      } else {
        return res.status(403).json({ 
          error: 'No tiene permisos para procesar transferencias' 
        });
      }
      
      let updatedTransfer;
      let ticketUpdateData: any = {};
      
      if (action === 'APPROVE') {
        // Aprobar transferencia
        updatedTransfer = await prisma.tK_transfer_requests.update({
          where: { id: transferId },
          data: {
            status: 'APROBADA',
            approvedById: userId
          },
          include: {
            ticket: true,
            fromArea: true,
            toArea: true,
            requestedBy: true,
            approvedBy: {
              select: {
                Id_Ejecutivo: true,
                Nombre: true,
                Login: true
              }
            }
          }
        });
        
        // Actualizar el ticket con la nueva área
        ticketUpdateData.areaId = transfer.toAreaId;
        ticketUpdateData.assignedToId = null; // Desasignar al cambiar de área
        
      } else if (action === 'REJECT') {
        // Rechazar transferencia
        updatedTransfer = await prisma.tK_transfer_requests.update({
          where: { id: transferId },
          data: {
            status: 'RECHAZADA',
            approvedById: userId
          },
          include: {
            ticket: true,
            fromArea: true,
            toArea: true,
            requestedBy: true,
            approvedBy: {
              select: {
                Id_Ejecutivo: true,
                Nombre: true,
                Login: true
              }
            }
          }
        });
      }
      
      // Actualizar ticket si fue aprobado
      if (action === 'APPROVE' && transfer.ticket) {
        await prisma.tK_tickets.update({
          where: { id: transfer.ticketId },
          data: ticketUpdateData
        });
      }
      
      // Crear historial
      const actionText = action === 'APPROVE' ? 'TRANSFERENCIA_APROBADA' : 'TRANSFERENCIA_RECHAZADA';
      const details = action === 'APPROVE' 
        ? `Transferencia aprobada. Ticket movido de ${transfer.fromArea.nombre_area} a ${transfer.toArea.nombre_area}`
        : `Transferencia rechazada. Razón: ${reason || 'No especificada'}`;
      
      await prisma.tK_ticket_history.create({
        data: {
          ticketId: transfer.ticketId,
          action: actionText,
          details,
          userId
        }
      });
      
      res.status(200).json({
        success: true,
        message: `Transferencia ${action === 'APPROVE' ? 'aprobada' : 'rechazada'} exitosamente`,
        transfer: updatedTransfer
      });
      
    } catch (error: any) {
      console.error('Error procesando transferencia:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
  
  // ✅ Obtener historial de transferencias
  static async getTransferHistory(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { status, areaId, startDate, endDate } = req.query;
      
      // Construir filtros
      const filters: any = {};
      
      if (status) filters.status = status;
      if (areaId) {
        const areaIdNum = parseInt(areaId as string);
        filters.OR = [
          { fromAreaId: areaIdNum },
          { toAreaId: areaIdNum }
        ];
      }
      
      if (startDate || endDate) {
        filters.createdAt = {};
        if (startDate) filters.createdAt.gte = new Date(startDate as string);
        if (endDate) filters.createdAt.lte = new Date(endDate as string);
      }
      
      // Obtener historial
      const transfers = await prisma.tK_transfer_requests.findMany({
        where: filters,
        include: {
          ticket: {
            select: {
              id: true,
              title: true,
              status: true
            }
          },
          fromArea: {
            select: {
              id_area: true,
              nombre_area: true
            }
          },
          toArea: {
            select: {
              id_area: true,
              nombre_area: true
            }
          },
          requestedBy: {
            select: {
              Id_Ejecutivo: true,
              Nombre: true,
              Login: true
            }
          },
          approvedBy: {
            select: {
              Id_Ejecutivo: true,
              Nombre: true,
              Login: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50 // Limitar resultados
      });
      
      res.status(200).json({
        success: true,
        transfers,
        count: transfers.length
      });
      
    } catch (error: any) {
      console.error('Error obteniendo historial de transferencias:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
  
  // ✅ Obtener transferencia por ID
  static async getTransferById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const transferId = parseInt(id);
      
      const transfer = await prisma.tK_transfer_requests.findUnique({
        where: { id: transferId },
        include: {
          ticket: {
            include: {
              creator: {
                select: {
                  Id_Ejecutivo: true,
                  Nombre: true,
                  Login: true
                }
              },
              assignedTo: {
                select: {
                  Id_Ejecutivo: true,
                  Nombre: true,
                  Login: true
                }
              },
              area: true
            }
          },
          fromArea: true,
          toArea: true,
          requestedBy: {
            select: {
              Id_Ejecutivo: true,
              Nombre: true,
              Login: true,
              Correo: true
            }
          },
          approvedBy: {
            select: {
              Id_Ejecutivo: true,
              Nombre: true,
              Login: true,
              Correo: true
            }
          }
        }
      });
      
      if (!transfer) {
        return res.status(404).json({ error: 'Transferencia no encontrada' });
      }
      
      res.status(200).json({
        success: true,
        transfer
      });
      
    } catch (error: any) {
      console.error('Error obteniendo transferencia:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
  
  // ✅ Cancelar transferencia
  static async cancelTransfer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = (req as any).user.id;
      const transferId = parseInt(id);
      
      // Obtener la transferencia
      const transfer = await prisma.tK_transfer_requests.findUnique({
        where: { id: transferId },
        include: {
          ticket: true,
          requestedBy: true
        }
      });
      
      if (!transfer) {
        return res.status(404).json({ error: 'Transferencia no encontrada' });
      }
      
      if (transfer.status !== 'PENDIENTE') {
        return res.status(400).json({ 
          error: 'Solo se pueden cancelar transferencias pendientes' 
        });
      }
      
      // Verificar que el usuario es quien solicitó la transferencia o es admin/superadmin
      const user = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId },
        include: { ticketData: true }
      });
      
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      const userRole = user.ticketData?.role || 'USER';
      
      if (transfer.requestedById !== userId && !['ADMIN', 'SUPERADMIN'].includes(userRole)) {
        return res.status(403).json({ 
          error: 'Solo el solicitante o un administrador puede cancelar esta transferencia' 
        });
      }
      
      // Cancelar transferencia
      const updatedTransfer = await prisma.tK_transfer_requests.update({
        where: { id: transferId },
        data: { status: 'CANCELADA' },
        include: {
          ticket: true,
          fromArea: true,
          toArea: true,
          requestedBy: true
        }
      });
      
      // Crear historial
      await prisma.tK_ticket_history.create({
        data: {
          ticketId: transfer.ticketId,
          action: 'TRANSFERENCIA_CANCELADA',
          details: `Transferencia cancelada por el solicitante. Razón: ${reason || 'No especificada'}`,
          userId
        }
      });
      
      res.status(200).json({
        success: true,
        message: 'Transferencia cancelada exitosamente',
        transfer: updatedTransfer
      });
      
    } catch (error: any) {
      console.error('Error cancelando transferencia:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}