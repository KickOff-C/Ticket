import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/auth';

export class TicketController {
  static async createTicket(req: AuthRequest, res: Response) {
    try {
      const { title, description, priority = 'MEDIA', assignedToId } = req.body;
      const userId = req.user?.userId;

      if (!title?.trim() || !description?.trim()) {
        return res.status(400).json({ 
          error: 'Título y descripción son requeridos' 
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { area: true }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      if (assignedToId) {
        if (user.role === 'USER') {
          return res.status(403).json({ error: 'No tienes permisos para asignar tickets' });
        }

        const assignedUser = await prisma.user.findUnique({
          where: { id: assignedToId, isActive: true }
        });

        if (!assignedUser || assignedUser.areaId !== user.areaId) {
          return res.status(400).json({ 
            error: 'No puedes asignar tickets a usuarios de otras áreas' 
          });
        }
      }

      const ticket = await prisma.ticket.create({
        data: {
          title: title.trim(),
          description: description.trim(),
          priority,
          creatorId: userId!,
          areaId: user.areaId,
          assignedToId: assignedToId || null,
          lastActivityAt: new Date()
        },
        include: {
          creator: {
            select: { id: true, name: true, email: true }
          },
          assignedTo: {
            select: { id: true, name: true, email: true }
          },
          area: {
            select: { id: true, name: true }
          }
        }
      });

      await prisma.ticketHistory.create({
        data: {
          ticketId: ticket.id,
          action: 'TICKET_CREATED',
          userId: userId!,
          details: `Ticket "${title}" creado con prioridad ${priority}`,
          newValue: JSON.stringify({
            title: ticket.title,
            priority: ticket.priority,
            status: ticket.status,
            assignedTo: assignedToId ? `Usuario ID: ${assignedToId}` : 'Sin asignar',
            area: user.area.name
          })
        }
      });

      res.status(201).json(ticket);
    } catch (error: unknown) {
      console.error('Error creando ticket:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ 
        error: 'Error al crear ticket',
        ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
      });
    }
  }

  static async getTickets(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      const userAreaId = req.user?.areaId;

      // Parámetros de consulta
      const { status, priority, minimal, showClosed = 'false' } = req.query;
      const includeClosed = showClosed === 'true';

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { area: true }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      let whereClause: any = {};

      // Lógica de permisos mejorada con manejo de tickets cerrados
      switch (userRole) {
        case 'USER':
          whereClause = {
            OR: [
              { creatorId: userId },
              { assignedToId: userId }
            ],
            ...(!includeClosed && { status: { not: 'CERRADO' } })
          };
          break;
        case 'MANAGER':
          whereClause = {
            areaId: userAreaId,
            ...(!includeClosed && { status: { not: 'CERRADO' } })
          };
          break;
        case 'ADMIN':
          whereClause = {
            areaId: userAreaId,
            ...(!includeClosed && { status: { not: 'CERRADO' } })
          };
          break;
        case 'SUPERADMIN':
          // SUPERADMIN puede elegir ver tickets cerrados
          if (!includeClosed) {
            whereClause.status = { not: 'CERRADO' };
          }
          break;
        default:
          whereClause = {
            creatorId: userId,
            ...(!includeClosed && { status: { not: 'CERRADO' } })
          };
      }

      // Aplicar filtros adicionales
      if (status && status !== 'all') {
        whereClause.status = status;
      }

      if (priority) {
        whereClause.priority = priority;
      }

      const useMinimal = minimal === 'true';
      
      // Includes básicos para listados
      const basicIncludes = {
        creator: {
          select: { id: true, name: true, email: true }
        },
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        area: {
          select: { id: true, name: true }
        }
      };

      // Includes completos para detalle
      const fullIncludes = {
        creator: {
          select: { id: true, name: true, email: true, role: true }
        },
        assignedTo: {
          select: { id: true, name: true, email: true, role: true }
        },
        area: {
          select: { id: true, name: true }
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        transfers: {
          include: {
            fromArea: {
              select: { id: true, name: true }
            },
            toArea: {
              select: { id: true, name: true }
            },
            requestedBy: {
              select: { id: true, name: true, email: true }
            },
            approvedBy: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        history: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      };

      const tickets = await prisma.ticket.findMany({
        where: whereClause,
        include: useMinimal ? basicIncludes : fullIncludes,
        orderBy: { updatedAt: 'desc' }
      });

      // Agregar metadata para el frontend
      let totalWhereClause: any = {};
      switch (userRole) {
        case 'USER':
          totalWhereClause = {
            OR: [
              { creatorId: userId },
              { assignedToId: userId }
            ]
          };
          break;
        case 'MANAGER':
        case 'ADMIN':
          totalWhereClause = { areaId: userAreaId };
          break;
        case 'SUPERADMIN':
          totalWhereClause = {};
          break;
        default:
          totalWhereClause = { creatorId: userId };
      }

      const totalTickets = await prisma.ticket.count({
        where: totalWhereClause
      });

      const closedTickets = await prisma.ticket.count({
        where: {
          ...totalWhereClause,
          status: 'CERRADO'
        }
      });

      res.json({
        tickets,
        metadata: {
          total: totalTickets,
          closed: closedTickets,
          showingClosed: includeClosed,
          hasClosedTickets: closedTickets > 0
        }
      });

    } catch (error: unknown) {
      console.error('Error obteniendo tickets:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ 
        error: 'Error al obtener tickets',
        ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
      });
    }
  }

  static async getTicketById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      const userAreaId = req.user?.areaId;

      const ticketId = parseInt(id);
      if (isNaN(ticketId)) {
        return res.status(400).json({ error: 'ID de ticket inválido' });
      }

      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          creator: {
            select: { id: true, name: true, email: true, role: true }
          },
          assignedTo: {
            select: { id: true, name: true, email: true, role: true }
          },
          area: {
            select: { id: true, name: true }
          },
          comments: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          },
          transfers: {
            include: {
              fromArea: {
                select: { id: true, name: true }
              },
              toArea: {
                select: { id: true, name: true }
              },
              requestedBy: {
                select: { id: true, name: true, email: true }
              },
              approvedBy: {
                select: { id: true, name: true, email: true }
              }
            }
          },
          history: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket no encontrado' });
      }

      const canView = await TicketController.canViewTicket(userId!, userRole!, userAreaId!, ticket);
      if (!canView) {
        return res.status(403).json({ error: 'No tienes permisos para ver este ticket' });
      }

      res.json(ticket);
    } catch (error: unknown) {
      console.error('Error obteniendo ticket:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ 
        error: 'Error al obtener ticket',
        ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
      });
    }
  }

  static async addComment(req: AuthRequest, res: Response) {
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

      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket no encontrado' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const canComment = await TicketController.canViewTicket(userId!, user.role, user.areaId, ticket);
      if (!canComment) {
        return res.status(403).json({ error: 'No tienes permisos para comentar en este ticket' });
      }

      const result = await prisma.$transaction(async (tx) => {
        const comment = await tx.comment.create({
          data: {
            content: content.trim(),
            userId: userId!,
            ticketId: ticketId
          },
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        });

        const updatedTicket = await tx.ticket.update({
          where: { id: ticketId },
          data: {
            lastActivityAt: new Date(),
            status: ticket.status === 'ABIERTO' ? 'EN_PROGRESO' : ticket.status
          },
          include: {
            creator: {
              select: { id: true, name: true, email: true, role: true }
            },
            assignedTo: {
              select: { id: true, name: true, email: true, role: true }
            },
            area: {
              select: { id: true, name: true }
            },
            comments: {
              include: {
                user: {
                  select: { id: true, name: true, email: true }
                }
              },
              orderBy: { createdAt: 'asc' }
            },
            transfers: {
              include: {
                fromArea: {
                  select: { id: true, name: true }
                },
                toArea: {
                  select: { id: true, name: true }
                },
                requestedBy: {
                  select: { id: true, name: true, email: true }
                },
                approvedBy: {
                  select: { id: true, name: true, email: true }
                }
              }
            },
            history: {
              include: {
                user: {
                  select: { id: true, name: true, email: true }
                }
              },
              orderBy: { createdAt: 'asc' }
            }
          }
        });

        await tx.ticketHistory.create({
          data: {
            ticketId: ticketId,
            action: 'COMMENT_ADDED',
            userId: userId!,
            details: `Comentario agregado por ${user.name}`,
            newValue: JSON.stringify({
              commentId: comment.id,
              contentPreview: content.length > 50 ? content.substring(0, 50) + '...' : content
            })
          }
        });

        return { ticket: updatedTicket, comment };
      });

      res.json(result.ticket);
    } catch (error: unknown) {
      console.error('Error agregando comentario:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ 
        error: 'Error al agregar comentario',
        ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
      });
    }
  }

  static async closeTicket(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const ticketId = parseInt(id);
      if (isNaN(ticketId)) {
        return res.status(400).json({ error: 'ID de ticket inválido' });
      }

      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: { creator: true }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket no encontrado' });
      }

      if (ticket.creatorId !== userId) {
        return res.status(403).json({ 
          error: 'Solo el creador del ticket puede cerrarlo' 
        });
      }

      if (ticket.status === 'CERRADO') {
        return res.status(400).json({ error: 'El ticket ya está cerrado' });
      }

      const result = await prisma.$transaction(async (tx) => {
        const updatedTicket = await tx.ticket.update({
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
            area: {
              select: { id: true, name: true }
            }
          }
        });

        await tx.user.update({
          where: { id: userId! },
          data: {
            ticketsClosed: {
              increment: 1
            }
          }
        });

        await tx.ticketHistory.create({
          data: {
            ticketId: ticketId,
            action: 'TICKET_CERRADO',
            userId: userId!,
            details: `Ticket cerrado por el creador`,
            oldValue: ticket.status,
            newValue: 'CERRADO'
          }
        });

        return updatedTicket;
      });

      res.json({
        ticket: result,
        message: 'Ticket cerrado exitosamente'
      });

    } catch (error: unknown) {
      console.error('Error cerrando ticket:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ 
        error: 'Error interno del servidor al cerrar ticket',
        ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
      });
    }
  }

  static async updateStatus(req: AuthRequest, res: Response) {
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

      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket no encontrado' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const canUpdate = await TicketController.canUpdateTicket(userId!, user.role, user.areaId, ticket);
      if (!canUpdate) {
        return res.status(403).json({ error: 'No tienes permisos para actualizar este ticket' });
      }

      const oldStatus = ticket.status;
      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status,
          lastActivityAt: new Date(),
          ...(status === 'CERRADO' && { closedAt: new Date() })
        },
        include: {
          creator: {
            select: { id: true, name: true, email: true, role: true }
          },
          assignedTo: {
            select: { id: true, name: true, email: true, role: true }
          },
          area: {
            select: { id: true, name: true }
          },
          comments: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          },
          transfers: {
            include: {
              fromArea: {
                select: { id: true, name: true }
              },
              toArea: {
                select: { id: true, name: true }
              },
              requestedBy: {
                select: { id: true, name: true, email: true }
              },
              approvedBy: {
                select: { id: true, name: true, email: true }
              }
            }
          },
          history: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      await prisma.ticketHistory.create({
        data: {
          ticketId: ticket.id,
          action: 'STATUS_CHANGED',
          userId: userId!,
          oldValue: oldStatus,
          newValue: status,
          details: `Estado cambiado de ${oldStatus} a ${status} por ${user.name}`
        }
      });

      res.json(updatedTicket);
    } catch (error: unknown) {
      console.error('Error actualizando estado:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ error: errorMessage });
    }
  }

  static async assignToUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { userId: userToAssignId } = req.body;
      const currentUserId = req.user?.userId;

      if (!userToAssignId) {
        return res.status(400).json({ error: 'ID de usuario es requerido' });
      }

      const ticketId = parseInt(id);
      if (isNaN(ticketId)) {
        return res.status(400).json({ error: 'ID de ticket inválido' });
      }

      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          area: true,
          assignedTo: true,
          creator: true
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket no encontrado' });
      }

      const userToAssign = await prisma.user.findUnique({
        where: { id: parseInt(userToAssignId) },
        include: { area: true }
      });

      if (!userToAssign) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      if (userToAssign.areaId !== ticket.areaId) {
        return res.status(400).json({ 
          error: 'El usuario no pertenece al área de este ticket' 
        });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: currentUserId },
        include: { area: true }
      });

      if (!currentUser) {
        return res.status(404).json({ error: 'Usuario actual no encontrado' });
      }

      const canAssign = 
        currentUser.role === 'SUPERADMIN' ||
        currentUser.role === 'ADMIN' ||
        (currentUser.role === 'MANAGER' && currentUser.areaId === ticket.areaId);

      if (!canAssign) {
        return res.status(403).json({ 
          error: 'No tienes permisos para asignar este ticket' 
        });
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          assignedToId: parseInt(userToAssignId),
          lastActivityAt: new Date(),
          status: ticket.status === 'ABIERTO' ? 'EN_PROGRESO' : ticket.status
        },
        include: {
          creator: {
            select: { id: true, name: true, email: true, role: true }
          },
          assignedTo: {
            select: { id: true, name: true, email: true, role: true }
          },
          area: {
            select: { id: true, name: true }
          },
          comments: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          },
          transfers: {
            include: {
              fromArea: {
                select: { id: true, name: true }
              },
              toArea: {
                select: { id: true, name: true }
              },
              requestedBy: {
                select: { id: true, name: true, email: true }
              },
              approvedBy: {
                select: { id: true, name: true, email: true }
              }
            }
          },
          history: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      await prisma.ticketHistory.create({
        data: {
          ticketId: ticketId,
          action: 'TICKET_ASIGNADO',
          userId: currentUserId!,
          oldValue: ticket.assignedTo ? ticket.assignedTo.name : 'No asignado',
          newValue: userToAssign.name,
          details: `Ticket asignado a ${userToAssign.name} por ${currentUser.name}`
        }
      });

      res.json(updatedTicket);

    } catch (error: unknown) {
      console.error('Error asignando ticket:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ error: errorMessage });
    }
  }

  // Helper methods
  static async canViewTicket(userId: number, userRole: string, userAreaId: number, ticket: any): Promise<boolean> {
    if (userRole === 'SUPERADMIN') return true;
    if (userRole === 'ADMIN' && ticket.areaId === userAreaId) return true;
    if (userRole === 'MANAGER' && ticket.areaId === userAreaId) return true;
    if (ticket.creatorId === userId) return true;
    if (ticket.assignedToId === userId) return true;
    
    const transfer = await prisma.transferRequest.findFirst({
      where: {
        ticketId: ticket.id,
        OR: [
          { fromAreaId: userAreaId },
          { toAreaId: userAreaId }
        ],
        status: 'APROBADA'
      }
    });

    return !!transfer;
  }

  static async canUpdateTicket(userId: number, userRole: string, userAreaId: number, ticket: any): Promise<boolean> {
    if (userRole === 'SUPERADMIN') return true;
    if (userRole === 'ADMIN' && ticket.areaId === userAreaId) return true;
    if (userRole === 'MANAGER' && ticket.areaId === userAreaId) return true;
    
    if (userRole === 'USER') {
      return ticket.creatorId === userId || ticket.assignedToId === userId;
    }

    return false;
  }
}