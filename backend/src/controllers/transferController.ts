import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/auth';

export class TransferController {
  static async requestTransfer(req: AuthRequest, res: Response) {
    try {
      const { ticketId, toAreaId } = req.body;
      const userId = req.user?.userId;

      console.log('Solicitando transferencia:', { ticketId, toAreaId, userId });

      if (!ticketId || !toAreaId) {
        return res.status(400).json({ 
          error: 'Ticket ID y Área destino son requeridos' 
        });
      }

      // Verificar que el ticket existe
      const ticket = await prisma.ticket.findUnique({
        where: { id: parseInt(ticketId) },
        include: { 
          area: true, 
          creator: true,
          assignedTo: true 
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket no encontrado' });
      }

      // Verificar permisos del usuario
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { area: true }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Solo el creador, usuarios del área, o superadmin pueden transferir
      const canTransfer = user.id === ticket.creatorId || 
                         user.areaId === ticket.areaId || 
                         user.role === 'SUPERADMIN';

      if (!canTransfer) {
        return res.status(403).json({ 
          error: 'No tienes permisos para transferir este ticket' 
        });
      }

      // Verificar que el área destino existe
      const toArea = await prisma.area.findUnique({
        where: { id: parseInt(toAreaId) }
      });

      if (!toArea) {
        return res.status(404).json({ error: 'Área destino no encontrada' });
      }

      // No permitir transferencia a la misma área
      if (ticket.areaId === parseInt(toAreaId)) {
        return res.status(400).json({ 
          error: 'No puedes transferir el ticket a la misma área' 
        });
      }

      // Crear la solicitud de transferencia
      const transferRequest = await prisma.transferRequest.create({
        data: {
          ticketId: parseInt(ticketId),
          fromAreaId: ticket.areaId,
          toAreaId: parseInt(toAreaId),
          requestedById: userId!,
          status: 'PENDIENTE'
        },
        include: {
          ticket: {
            include: {
              creator: true,
              assignedTo: true,
              area: true
            }
          },
          fromArea: true,
          toArea: true,
          requestedBy: true
        }
      });

      // Agregar al historial del ticket
      await prisma.ticketHistory.create({
        data: {
          ticketId: parseInt(ticketId),
          action: 'SOLICITUD_TRANSFERENCIA',
          userId: userId!,
          oldValue: ticket.area.name,
          newValue: toArea.name,
          details: 'Solicitud de transferencia a ${toArea.name} por ${user.name}. Esperando aprobación del manager.'
        }
      });

      console.log('Transferencia solicitada exitosamente:', transferRequest.id);

      res.status(201).json({
        message: 'Solicitud de transferencia creada exitosamente',
        transfer: transferRequest
      });

    } catch (error) {
      console.error('Error solicitando transferencia:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor al procesar la transferencia' 
      });
    }
  }

  static async getPendingTransfers(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      const userAreaId = req.user?.areaId;

      let whereCondition: any = { status: 'PENDIENTE' };

      // Managers y Admins ven transferencias pendientes de su área
      if (userRole === 'MANAGER' || userRole === 'ADMIN') {
        whereCondition.fromAreaId = userAreaId;
      }
      // SUPERADMIN ve todas las transferencias pendientes

      const transfers = await prisma.transferRequest.findMany({
        where: whereCondition,
        include: {
          ticket: {
            include: {
              creator: true,
              assignedTo: true,
              area: true,
              comments: {
                include: {
                  user: true
                },
                orderBy: { createdAt: 'asc' }
              }
            }
          },
          fromArea: true,
          toArea: true,
          requestedBy: true,
          approvedBy: true
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json(transfers);

    } catch (error) {
      console.error('Error obteniendo transferencias pendientes:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async processTransfer(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { action } = req.body; // 'approve' o 'reject'
      const userId = req.user?.userId;

      console.log('Procesando transferencia:', { id, action, userId });

      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Acción inválida. Use "approve" o "reject"' });
      }

      const transfer = await prisma.transferRequest.findUnique({
        where: { id: parseInt(id) },
        include: {
          ticket: true,
          fromArea: true,
          toArea: true,
          requestedBy: true
        }
      });

      if (!transfer) {
        return res.status(404).json({ error: 'Solicitud de transferencia no encontrada' });
      }

      // Verificar permisos para aprobar/rechazar
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { area: true }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const canProcess = user.role === 'SUPERADMIN' || 
                         user.role === 'ADMIN' || 
                         (user.role === 'MANAGER' && user.areaId === transfer.fromAreaId);

      if (!canProcess) {
        return res.status(403).json({ 
          error: 'No tienes permisos para procesar esta transferencia' 
        });
      }

      if (transfer.status !== 'PENDIENTE') {
        return res.status(400).json({ 
          error: 'Esta transferencia ya fue procesada' 
        });
      }

      if (action === 'approve') {
        // Aprobar transferencia y actualizar ticket
        const [updatedTransfer, updatedTicket] = await prisma.$transaction([
          prisma.transferRequest.update({
            where: { id: parseInt(id) },
            data: {
              status: 'APROBADA',
              approvedById: userId
            },
            include: {
              ticket: true,
              fromArea: true,
              toArea: true,
              requestedBy: true,
              approvedBy: true
            }
          }),
          prisma.ticket.update({
            where: { id: transfer.ticketId },
            data: {
              areaId: transfer.toAreaId,
              assignedToId: null // Desasignar al cambiar de área
            },
            include: {
              creator: true,
              assignedTo: true,
              area: true,
              comments: {
                include: {
                  user: true
                },
                orderBy: { createdAt: 'asc' }
              }
            }
          })
        ]);
        

        // Agregar al historial
        await prisma.ticketHistory.create({
          data: {
            ticketId: transfer.ticketId,
            action: 'TRANSFERENCIA_APROBADA',
            userId: userId!,
            oldValue: transfer.fromArea.name,
            newValue: transfer.toArea.name,
            details: `Transferencia aprobada por ${user.name}. Ticket movido de ${transfer.fromArea.name} a ${transfer.toArea.name}`
          }
        });
        await prisma.ticketHistory.create({
          data: {
            ticketId: transfer.ticketId,
            action: 'AREA_CAMBIADA',
            userId: userId!,
            oldValue: transfer.fromArea.name,
            newValue: transfer.toArea.name,
            details: `Área cambiada debido a transferencia aprobada`
          }
        });

        res.json({
          message: 'Transferencia aprobada exitosamente',
          transfer: updatedTransfer,
          ticket: updatedTicket
        });

      } else {
        // Rechazar transferencia
        const updatedTransfer = await prisma.transferRequest.update({
          where: { id: parseInt(id) },
          data: {
            status: 'RECHAZADA',
            approvedById: userId
          },
          include: {
            ticket: true,
            fromArea: true,
            toArea: true,
            requestedBy: true,
            approvedBy: true
          }
        });

        // Agregar al historial
        await prisma.ticketHistory.create({
          data: {
            ticketId: transfer.ticketId,
            action: 'TRANSFERENCIA_RECHAZADA',
            userId: userId!,
            details: `Transferencia rechazada por ${user.name}. Solicitada por ${transfer.requestedBy.name} para mover a ${transfer.toArea.name}`
          }
        });

        res.json({
          message: 'Transferencia rechazada',
          transfer: updatedTransfer
        });
      }

    } catch (error) {
      console.error('Error procesando transferencia:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}