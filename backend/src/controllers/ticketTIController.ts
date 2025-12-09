import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/auth';

export class TicketTIController {
  static async createTicketTI(req: AuthRequest, res: Response) {
    try {
      const { title, description, priority = 'MEDIA' } = req.body;
      const userId = req.user?.userId;

      if (!title || !description) {
        return res.status(400).json({ error: 'Título y descripción son requeridos' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { area: true }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Cualquier usuario puede crear tickets TI, sin importar su área
      const ticketTI = await prisma.ticketTI.create({
        data: {
          title,
          description,
          priority,
          creatorId: userId!,
          lastActivityAt: new Date()
        },
        include: {
          creator: {
            select: { id: true, name: true, email: true }
          },
          assignedTo: {
            select: { id: true, name: true, email: true }
          },
          comments: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      console.log(`📝 Ticket TI creado - ID: ${ticketTI.id}, Título: "${ticketTI.title}", Creado por: ${user.name} (Área: ${user.area?.name || 'Sin área'})`);

      res.status(201).json(ticketTI);

    } catch (error: unknown) {
      console.error('Error creando ticket TI:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ error: errorMessage });
    }
  }

  static async getTicketsTI(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      const userAreaId = req.user?.areaId;

      // Parámetro para mostrar tickets cerrados
      const { showClosed = 'false' } = req.query;
      const includeClosed = showClosed === 'true';

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { area: true }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      let whereClause: any = {};

      // Lógica de permisos y visibilidad de tickets cerrados
      if (user.role === 'SUPERADMIN' || user.area?.name === 'TI') {
        // SUPERADMIN y TI ven todos los tickets, con opción de filtrar cerrados
        if (!includeClosed) {
          whereClause.status = { not: 'CERRADO' };
        }
      } else {
        // Usuarios normales solo ven sus tickets no cerrados
        whereClause = {
          creatorId: userId,
          ...(!includeClosed && { status: { not: 'CERRADO' } })
        };
      }

      const ticketsTI = await prisma.ticketTI.findMany({
        where: whereClause,
        include: {
          creator: {
            select: { id: true, name: true, email: true }
          },
          assignedTo: {
            select: { id: true, name: true, email: true }
          },
          comments: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });

      // Agregar metadata sobre tickets cerrados
      let totalWhereClause: any = {};
      if (user.role === 'SUPERADMIN' || user.area?.name === 'TI') {
        totalWhereClause = {};
      } else {
        totalWhereClause = { creatorId: userId };
      }

      const totalTickets = await prisma.ticketTI.count({
        where: totalWhereClause
      });

      const closedTickets = await prisma.ticketTI.count({
        where: {
          ...totalWhereClause,
          status: 'CERRADO'
        }
      });

      res.json({
        tickets: ticketsTI,
        metadata: {
          total: totalTickets,
          closed: closedTickets,
          showingClosed: includeClosed,
          hasClosedTickets: closedTickets > 0
        }
      });

    } catch (error: unknown) {
      console.error('Error obteniendo tickets TI:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ error: errorMessage });
    }
  }

  static async getTicketTIById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const ticketId = parseInt(id);
      if (isNaN(ticketId)) {
        return res.status(400).json({ error: 'ID de ticket inválido' });
      }

      const ticketTI = await prisma.ticketTI.findUnique({
        where: { id: ticketId },
        include: {
          creator: {
            select: { id: true, name: true, email: true }
          },
          assignedTo: {
            select: { id: true, name: true, email: true }
          },
          comments: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (!ticketTI) {
        return res.status(404).json({ error: 'Ticket TI no encontrado' });
      }

      // Verificar permisos: solo el creador o usuarios de TI/SUPERADMIN pueden ver el ticket
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { area: true }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const canView = ticketTI.creatorId === userId || 
                     user.role === 'SUPERADMIN' || 
                     user.area?.name === 'TI';
      
      if (!canView) {
        return res.status(403).json({ error: 'No tienes permisos para ver este ticket TI' });
      }

      res.json(ticketTI);

    } catch (error: unknown) {
      console.error('Error obteniendo ticket TI:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ error: errorMessage });
    }
  }

  static async addCommentTI(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const userId = req.user?.userId;

      if (!content?.trim()) {
        return res.status(400).json({ error: 'El contenido del comentario es requerido' });
      }

      const ticketId = parseInt(id);
      if (isNaN(ticketId)) {
        return res.status(400).json({ error: 'ID de ticket inválido' });
      }

      const ticketTI = await prisma.ticketTI.findUnique({
        where: { id: ticketId }
      });

      if (!ticketTI) {
        return res.status(404).json({ error: 'Ticket TI no encontrado' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { area: true }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Verificar permisos: solo el creador o usuarios de TI/SUPERADMIN pueden comentar
      const canComment = ticketTI.creatorId === userId || 
                        user.role === 'SUPERADMIN' || 
                        user.area?.name === 'TI';
      
      if (!canComment) {
        return res.status(403).json({ error: 'No tienes permisos para comentar en este ticket TI' });
      }

      // Crear el comentario
      const comment = await prisma.comment.create({
        data: {
          content: content.trim(),
          userId: userId!,
          ticketTIId: ticketId
        },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      // Actualizar lastActivityAt del ticket
      const updatedTicketTI = await prisma.ticketTI.update({
        where: { id: ticketId },
        data: {
          lastActivityAt: new Date(),
          status: ticketTI.status === 'ABIERTO' ? 'EN_PROGRESO' : ticketTI.status
        },
        include: {
          creator: {
            select: { id: true, name: true, email: true }
          },
          assignedTo: {
            select: { id: true, name: true, email: true }
          },
          comments: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      res.json(updatedTicketTI);

    } catch (error: unknown) {
      console.error('Error agregando comentario TI:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ error: errorMessage });
    }
  }

  static async assignTicketTI(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { assignedToId } = req.body;
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      console.log('🎯 DEBUG - Iniciando asignación TI:', { 
        ticketId: id, 
        assignedToId, 
        currentUserId: userId,
        userRole: userRole
      });

      if (!assignedToId) {
        return res.status(400).json({ error: 'ID de usuario asignado es requerido' });
      }

      const ticketId = parseInt(id);
      if (isNaN(ticketId)) {
        return res.status(400).json({ error: 'ID de ticket inválido' });
      }

      const ticketTI = await prisma.ticketTI.findUnique({
        where: { id: ticketId }
      });

      if (!ticketTI) {
        return res.status(404).json({ error: 'Ticket TI no encontrado' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { area: true }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      console.log('🎯 DEBUG - Usuario actual:', {
        id: user.id,
        name: user.name,
        role: user.role,
        area: user.area?.name || 'Sin área'
      });

      // CORREGIDO: Lógica de permisos mejorada para SUPERADMIN
      const canAssign = user.role === 'SUPERADMIN' || (user.area && user.area.name === 'TI');
      
      if (!canAssign) {
        return res.status(403).json({ 
          error: 'No tienes permisos para asignar tickets TI. Solo personal de TI puede asignar.' 
        });
      }

      // Verificar que el usuario asignado existe
      const assignedUser = await prisma.user.findUnique({
        where: { id: parseInt(assignedToId) },
        include: { area: true }
      });

      if (!assignedUser) {
        return res.status(404).json({ error: 'Usuario asignado no encontrado' });
      }

      console.log('🎯 DEBUG - Usuario a asignar:', {
        id: assignedUser.id,
        name: assignedUser.name,
        role: assignedUser.role,
        area: assignedUser.area?.name || 'Sin área'
      });

      // CORREGIDO: Lógica de validación de área mejorada
      const canAssignToUser = assignedUser.role === 'SUPERADMIN' || 
                             (assignedUser.area && assignedUser.area.name === 'TI');

      if (!canAssignToUser) {
        return res.status(400).json({ 
          error: 'Solo puedes asignar tickets TI a usuarios del área TI o SUPERADMIN' 
        });
      }

      // Actualizar el ticket
      const updatedTicketTI = await prisma.ticketTI.update({
        where: { id: ticketId },
        data: {
          assignedToId: parseInt(assignedToId),
          status: ticketTI.status === 'ABIERTO' ? 'EN_PROGRESO' : ticketTI.status,
          lastActivityAt: new Date(),
          updatedAt: new Date()
        },
        include: {
          creator: {
            select: { id: true, name: true, email: true }
          },
          assignedTo: {
            select: { id: true, name: true, email: true }
          },
          comments: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      console.log(`📝 Ticket TI asignado - ID: ${updatedTicketTI.id}, Asignado a: ${assignedUser.name}, Por: ${user.name}`);

      console.log('✅ DEBUG - Asignación completada exitosamente');
      res.json(updatedTicketTI);

    } catch (error: unknown) {
      console.error('❌ DEBUG - Error en asignación TI:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ 
        error: 'Error interno del servidor al asignar ticket TI',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  static async updateStatusTI(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user?.userId;

      if (!['ABIERTO', 'EN_PROGRESO', 'CERRADO'].includes(status)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }

      const ticketId = parseInt(id);
      if (isNaN(ticketId)) {
        return res.status(400).json({ error: 'ID de ticket inválido' });
      }

      const ticketTI = await prisma.ticketTI.findUnique({
        where: { id: ticketId }
      });

      if (!ticketTI) {
        return res.status(404).json({ error: 'Ticket TI no encontrado' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { area: true }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Verificar permisos: creador, asignado, o usuarios de TI/SUPERADMIN pueden cambiar estado
      const canUpdate = ticketTI.creatorId === userId || 
                       ticketTI.assignedToId === userId || 
                       user.role === 'SUPERADMIN' || 
                       user.area?.name === 'TI';

      if (!canUpdate) {
        return res.status(403).json({ error: 'No tienes permisos para actualizar este ticket TI' });
      }

      const updatedTicketTI = await prisma.ticketTI.update({
        where: { id: ticketId },
        data: {
          status,
          lastActivityAt: new Date(),
          ...(status === 'CERRADO' && { closedAt: new Date() })
        },
        include: {
          creator: {
            select: { id: true, name: true, email: true }
          },
          assignedTo: {
            select: { id: true, name: true, email: true }
          },
          comments: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      res.json(updatedTicketTI);

    } catch (error: unknown) {
      console.error('Error actualizando estado TI:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ error: errorMessage });
    }
  }

  static async closeTicketTI(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      console.log('🔒 Cerrando ticket TI:', { id, userId });

      const ticketId = parseInt(id);
      if (isNaN(ticketId)) {
        return res.status(400).json({ error: 'ID de ticket inválido' });
      }

      const ticketTI = await prisma.ticketTI.findUnique({
        where: { id: ticketId },
        include: { 
          creator: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      if (!ticketTI) {
        return res.status(404).json({ error: 'Ticket TI no encontrado' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { area: true }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Solo el creador o usuarios de TI/SUPERADMIN pueden cerrar el ticket
      const canClose = ticketTI.creatorId === userId || 
                      user.role === 'SUPERADMIN' || 
                      user.area?.name === 'TI';

      if (!canClose) {
        return res.status(403).json({ 
          error: 'No tienes permisos para cerrar este ticket TI' 
        });
      }

      // Usar transacción
      const result = await prisma.$transaction(async (tx) => {
        // 1. Actualizar ticket TI
        const updatedTicketTI = await tx.ticketTI.update({
          where: { id: ticketId },
          data: {
            status: 'CERRADO',
            closedAt: new Date(),
            lastActivityAt: new Date()
          },
          include: {
            creator: {
              select: { id: true, name: true, email: true }
            },
            assignedTo: {
              select: { id: true, name: true, email: true }
            },
            comments: {
              include: {
                user: {
                  select: { id: true, name: true, email: true }
                }
              },
              orderBy: { createdAt: 'asc' }
            }
          }
        });

        // 2. Solo incrementar contador si el usuario que cierra es el creador
        if (ticketTI.creatorId === userId) {
          await tx.user.update({
            where: { id: userId! },
            data: {
              ticketsClosed: {
                increment: 1
              }
            }
          });
        }

        // 3. Registrar en ticketHistory para métricas
        await tx.ticketHistory.create({
          data: {
            ticketId: updatedTicketTI.id,
            action: 'TICKET_TI_CERRADO',
            userId: userId!,
            details: `Ticket TI cerrado por ${user.name}`,
            newValue: JSON.stringify({
              action: 'Ticket TI cerrado',
              closedBy: user.name,
              wasCreator: ticketTI.creatorId === userId,
              ticketId: updatedTicketTI.id
            })
          }
        });

        // 4. Log en consola para tickets TI
        console.log(`📝 Ticket TI cerrado - ID: ${updatedTicketTI.id}, Cerrado por: ${user.name}, Era creador: ${ticketTI.creatorId === userId}`);

        return updatedTicketTI;
      });

      console.log('✅ Ticket TI cerrado exitosamente. Usuario:', userId);
      res.json(result);

    } catch (error: unknown) {
      console.error('❌ Error cerrando ticket TI:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ 
        error: 'Error interno del servidor al cerrar ticket TI',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }
}