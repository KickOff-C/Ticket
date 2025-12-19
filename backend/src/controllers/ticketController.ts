import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/auth';

export class TicketController {
  static async createTicket(req: AuthRequest, res: Response) {
    try {
      const { title, description, priority = 'MEDIA', assignedToId } = req.body;
      const userId = req.user?.Id_Ejecutivo;

      if (!title?.trim() || !description?.trim()) {
        return res.status(400).json({ 
          error: 'Título y descripción son requeridos' 
        });
      }

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const user = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId },
        include: { 
          area: true,
          ticketData: true 
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      if (!user.id_area) {
        return res.status(400).json({ error: 'El usuario no tiene un área asignada' });
      }

      // Verificar permisos para asignar
      const userRole = user.ticketData?.role || 'USER';
      
      if (assignedToId) {
        if (userRole === 'USER') {
          return res.status(403).json({ error: 'No tienes permisos para asignar tickets' });
        }

        const assignedUser = await prisma.usuarios.findUnique({
          where: { 
            Id_Ejecutivo: parseInt(assignedToId),
            activo: 1 
          }
        });

        if (!assignedUser || assignedUser.id_area !== user.id_area) {
          return res.status(400).json({ 
            error: 'No puedes asignar tickets a usuarios de otras áreas' 
          });
        }
      }

      const ticket = await prisma.tK_tickets.create({
        data: {
          title: title.trim(),
          description: description.trim(),
          priority,
          creatorId: userId,
          areaId: user.id_area,
          assignedToId: assignedToId ? parseInt(assignedToId) : null,
          lastActivityAt: new Date()
        },
        include: {
          creator: {
            select: { 
              Id_Ejecutivo: true, 
              Nombre: true, 
              Correo: true,
              Login: true 
            }
          },
          assignedTo: {
            select: { 
              Id_Ejecutivo: true, 
              Nombre: true, 
              Correo: true,
              Login: true 
            }
          },
          area: {
            select: { 
              id_area: true, 
              nombre_area: true 
            }
          }
        }
      });

      await prisma.tK_ticket_history.create({
        data: {
          ticketId: ticket.id,
          action: 'TICKET_CREATED',
          userId: userId,
          details: `Ticket "${title}" creado con prioridad ${priority}`,
          newValue: JSON.stringify({
            title: ticket.title,
            priority: ticket.priority,
            status: ticket.status,
            assignedTo: assignedToId ? `Usuario ID: ${assignedToId}` : 'Sin asignar',
            area: user.area?.nombre_area
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
      const userId = req.user?.Id_Ejecutivo;
      const userRole = req.user?.role;
      const userAreaId = req.user?.areaId;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      // Parámetros de consulta
      const { status, priority, minimal, showClosed = 'false' } = req.query;
      const includeClosed = showClosed === 'true';

      const user = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId },
        include: { 
          area: true,
          ticketData: true 
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const effectiveUserRole = user.ticketData?.role || userRole || 'USER';

      let whereClause: any = {};

      // Lógica de permisos mejorada con manejo de tickets cerrados
      switch (effectiveUserRole) {
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
          select: { 
            Id_Ejecutivo: true, 
            Nombre: true, 
            Correo: true,
            Login: true 
          }
        },
        assignedTo: {
          select: { 
            Id_Ejecutivo: true, 
            Nombre: true, 
            Correo: true,
            Login: true 
          }
        },
        area: {
          select: { 
            id_area: true, 
            nombre_area: true 
          }
        }
      };

      // Includes completos para detalle
      const fullIncludes = {
        creator: {
          select: { 
            Id_Ejecutivo: true, 
            Nombre: true, 
            Correo: true,
            Login: true,
            ticketData: true 
          }
        },
        assignedTo: {
          select: { 
            Id_Ejecutivo: true, 
            Nombre: true, 
            Correo: true,
            Login: true,
            ticketData: true 
          }
        },
        area: {
          select: { 
            id_area: true, 
            nombre_area: true 
          }
        },
        comments: {
          include: {
            user: {
              select: { 
                Id_Ejecutivo: true, 
                Nombre: true, 
                Correo: true,
                Login: true 
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        transfers: {
          include: {
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
                Correo: true,
                Login: true 
              }
            },
            approvedBy: {
              select: { 
                Id_Ejecutivo: true, 
                Nombre: true, 
                Correo: true,
                Login: true 
              }
            }
          }
        },
        history: {
          include: {
            user: {
              select: { 
                Id_Ejecutivo: true, 
                Nombre: true, 
                Correo: true,
                Login: true 
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      };

      const tickets = await prisma.tK_tickets.findMany({
        where: whereClause,
        include: useMinimal ? basicIncludes : fullIncludes,
        orderBy: { updatedAt: 'desc' }
      });

      // Agregar metadata para el frontend
      let totalWhereClause: any = {};
      switch (effectiveUserRole) {
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

      const totalTickets = await prisma.tK_tickets.count({
        where: totalWhereClause
      });

      const closedTickets = await prisma.tK_tickets.count({
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
      const userId = req.user?.Id_Ejecutivo;
      const userRole = req.user?.role;
      const userAreaId = req.user?.areaId;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const ticketId = parseInt(id);
      if (isNaN(ticketId)) {
        return res.status(400).json({ error: 'ID de ticket inválido' });
      }

      const ticket = await prisma.tK_tickets.findUnique({
        where: { id: ticketId },
        include: {
          creator: {
            select: { 
              Id_Ejecutivo: true, 
              Nombre: true, 
              Correo: true,
              Login: true,
              ticketData: true 
            }
          },
          assignedTo: {
            select: { 
              Id_Ejecutivo: true, 
              Nombre: true, 
              Correo: true,
              Login: true,
              ticketData: true 
            }
          },
          area: {
            select: { 
              id_area: true, 
              nombre_area: true 
            }
          },
          comments: {
            include: {
              user: {
                select: { 
                  Id_Ejecutivo: true, 
                  Nombre: true, 
                  Correo: true,
                  Login: true 
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          },
          transfers: {
            include: {
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
                  Correo: true,
                  Login: true 
                }
              },
              approvedBy: {
                select: { 
                  Id_Ejecutivo: true, 
                  Nombre: true, 
                  Correo: true,
                  Login: true 
                }
              }
            }
          },
          history: {
            include: {
              user: {
                select: { 
                  Id_Ejecutivo: true, 
                  Nombre: true, 
                  Correo: true,
                  Login: true 
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket no encontrado' });
      }

      const canView = await TicketController.canViewTicket(userId, userRole!, userAreaId!, ticket);
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
      const userId = req.user?.Id_Ejecutivo;

      if (!content?.trim()) {
        return res.status(400).json({ error: 'El contenido del comentario es requerido' });
      }

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const ticketId = parseInt(id);
      if (isNaN(ticketId)) {
        return res.status(400).json({ error: 'ID de ticket inválido' });
      }

      const ticket = await prisma.tK_tickets.findUnique({
        where: { id: ticketId }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket no encontrado' });
      }

      const user = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId },
        include: { ticketData: true }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const userRole = user.ticketData?.role || 'USER';
      const canComment = await TicketController.canViewTicket(userId, userRole, user.id_area || 0, ticket);
      if (!canComment) {
        return res.status(403).json({ error: 'No tienes permisos para comentar en este ticket' });
      }

      const result = await prisma.$transaction(async (tx) => {
        const comment = await tx.tK_comments.create({
          data: {
            content: content.trim(),
            userId: userId,
            ticketId: ticketId
          },
          include: {
            user: { 
              select: { 
                Id_Ejecutivo: true, 
                Nombre: true, 
                Correo: true,
                Login: true 
              } 
            }
          }
        });

        const updatedTicket = await tx.tK_tickets.update({
          where: { id: ticketId },
          data: {
            lastActivityAt: new Date(),
            status: ticket.status === 'ABIERTO' ? 'EN_PROGRESO' : ticket.status
          },
          include: {
            creator: {
              select: { 
                Id_Ejecutivo: true, 
                Nombre: true, 
                Correo: true,
                Login: true 
              }
            },
            assignedTo: {
              select: { 
                Id_Ejecutivo: true, 
                Nombre: true, 
                Correo: true,
                Login: true 
              }
            },
            area: {
              select: { 
                id_area: true, 
                nombre_area: true 
              }
            },
            comments: {
              include: {
                user: {
                  select: { 
                    Id_Ejecutivo: true, 
                    Nombre: true, 
                    Correo: true,
                    Login: true 
                  }
                }
              },
              orderBy: { createdAt: 'asc' }
            },
            transfers: {
              include: {
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
                    Correo: true,
                    Login: true 
                  }
                },
                approvedBy: {
                  select: { 
                    Id_Ejecutivo: true, 
                    Nombre: true, 
                    Correo: true,
                    Login: true 
                  }
                }
              }
            },
            history: {
              include: {
                user: {
                  select: { 
                    Id_Ejecutivo: true, 
                    Nombre: true, 
                    Correo: true,
                    Login: true 
                  }
                }
              },
              orderBy: { createdAt: 'asc' }
            }
          }
        });

        await tx.tK_ticket_history.create({
          data: {
            ticketId: ticketId,
            action: 'COMMENT_ADDED',
            userId: userId,
            details: `Comentario agregado por ${user.Nombre || user.Login}`,
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
      const userId = req.user?.Id_Ejecutivo;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const ticketId = parseInt(id);
      if (isNaN(ticketId)) {
        return res.status(400).json({ error: 'ID de ticket inválido' });
      }

      const ticket = await prisma.tK_tickets.findUnique({
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
        const updatedTicket = await tx.tK_tickets.update({
          where: { id: ticketId },
          data: {
            status: 'CERRADO',
            closedAt: new Date(),
            lastActivityAt: new Date()
          },
          include: {
            creator: {
              select: { 
                Id_Ejecutivo: true, 
                Nombre: true, 
                Correo: true,
                Login: true 
              }
            },
            assignedTo: {
              select: { 
                Id_Ejecutivo: true, 
                Nombre: true, 
                Correo: true,
                Login: true 
              }
            },
            area: {
              select: { 
                id_area: true, 
                nombre_area: true 
              }
            }
          }
        });

        // Actualizar contador de tickets cerrados en TK_user_ticket_data
        await tx.tK_user_ticket_data.upsert({
          where: { userId },
          update: {
            ticketsClosed: {
              increment: 1
            }
          },
          create: {
            userId,
            ticketsClosed: 1
          }
        });

        await tx.tK_ticket_history.create({
          data: {
            ticketId: ticketId,
            action: 'TICKET_CERRADO',
            userId: userId,
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
      const userId = req.user?.Id_Ejecutivo;

      if (!['ABIERTO', 'EN_PROGRESO', 'CERRADO'].includes(status)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const ticketId = parseInt(id);
      if (isNaN(ticketId)) {
        return res.status(400).json({ error: 'ID de ticket inválido' });
      }

      const ticket = await prisma.tK_tickets.findUnique({
        where: { id: ticketId }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket no encontrado' });
      }

      const user = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId },
        include: { ticketData: true }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const userRole = user.ticketData?.role || 'USER';
      const canUpdate = await TicketController.canUpdateTicket(userId, userRole, user.id_area || 0, ticket);
      if (!canUpdate) {
        return res.status(403).json({ error: 'No tienes permisos para actualizar este ticket' });
      }

      const oldStatus = ticket.status;
      const updatedTicket = await prisma.tK_tickets.update({
        where: { id: ticketId },
        data: {
          status,
          lastActivityAt: new Date(),
          ...(status === 'CERRADO' && { closedAt: new Date() })
        },
        include: {
          creator: {
            select: { 
              Id_Ejecutivo: true, 
              Nombre: true, 
              Correo: true,
              Login: true 
            }
          },
          assignedTo: {
            select: { 
              Id_Ejecutivo: true, 
              Nombre: true, 
              Correo: true,
              Login: true 
            }
          },
          area: {
            select: { 
              id_area: true, 
              nombre_area: true 
            }
          },
          comments: {
            include: {
              user: {
                select: { 
                  Id_Ejecutivo: true, 
                  Nombre: true, 
                  Correo: true,
                  Login: true 
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          },
          transfers: {
            include: {
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
                  Correo: true,
                  Login: true 
                }
              },
              approvedBy: {
                select: { 
                  Id_Ejecutivo: true, 
                  Nombre: true, 
                  Correo: true,
                  Login: true 
                }
              }
            }
          },
          history: {
            include: {
              user: {
                select: { 
                  Id_Ejecutivo: true, 
                  Nombre: true, 
                  Correo: true,
                  Login: true 
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      await prisma.tK_ticket_history.create({
        data: {
          ticketId: ticket.id,
          action: 'STATUS_CHANGED',
          userId: userId,
          oldValue: oldStatus,
          newValue: status,
          details: `Estado cambiado de ${oldStatus} a ${status} por ${user.Nombre || user.Login}`
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
      const currentUserId = req.user?.Id_Ejecutivo;

      if (!userToAssignId) {
        return res.status(400).json({ error: 'ID de usuario es requerido' });
      }

      if (!currentUserId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const ticketId = parseInt(id);
      if (isNaN(ticketId)) {
        return res.status(400).json({ error: 'ID de ticket inválido' });
      }

      const ticket = await prisma.tK_tickets.findUnique({
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

      const userToAssign = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: parseInt(userToAssignId) },
        include: { area: true }
      });

      if (!userToAssign) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      if (userToAssign.id_area !== ticket.areaId) {
        return res.status(400).json({ 
          error: 'El usuario no pertenece al área de este ticket' 
        });
      }

      const currentUser = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: currentUserId },
        include: { 
          area: true,
          ticketData: true 
        }
      });

      if (!currentUser) {
        return res.status(404).json({ error: 'Usuario actual no encontrado' });
      }

      const currentUserRole = currentUser.ticketData?.role || 'USER';
      
      const canAssign = 
        currentUserRole === 'SUPERADMIN' ||
        currentUserRole === 'ADMIN' ||
        (currentUserRole === 'MANAGER' && currentUser.id_area === ticket.areaId);

      if (!canAssign) {
        return res.status(403).json({ 
          error: 'No tienes permisos para asignar este ticket' 
        });
      }

      const updatedTicket = await prisma.tK_tickets.update({
        where: { id: ticketId },
        data: {
          assignedToId: parseInt(userToAssignId),
          lastActivityAt: new Date(),
          status: ticket.status === 'ABIERTO' ? 'EN_PROGRESO' : ticket.status
        },
        include: {
          creator: {
            select: { 
              Id_Ejecutivo: true, 
              Nombre: true, 
              Correo: true,
              Login: true 
            }
          },
          assignedTo: {
            select: { 
              Id_Ejecutivo: true, 
              Nombre: true, 
              Correo: true,
              Login: true 
            }
          },
          area: {
            select: { 
              id_area: true, 
              nombre_area: true 
            }
          },
          comments: {
            include: {
              user: {
                select: { 
                  Id_Ejecutivo: true, 
                  Nombre: true, 
                  Correo: true,
                  Login: true 
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          },
          transfers: {
            include: {
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
                  Correo: true,
                  Login: true 
                }
              },
              approvedBy: {
                select: { 
                  Id_Ejecutivo: true, 
                  Nombre: true, 
                  Correo: true,
                  Login: true 
                }
              }
            }
          },
          history: {
            include: {
              user: {
                select: { 
                  Id_Ejecutivo: true, 
                  Nombre: true, 
                  Correo: true,
                  Login: true 
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      await prisma.tK_ticket_history.create({
        data: {
          ticketId: ticketId,
          action: 'TICKET_ASIGNADO',
          userId: currentUserId,
          oldValue: ticket.assignedTo ? ticket.assignedTo.Nombre : 'No asignado',
          newValue: userToAssign.Nombre,
          details: `Ticket asignado a ${userToAssign.Nombre} por ${currentUser.Nombre || currentUser.Login}`
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
    
    const transfer = await prisma.tK_transfer_requests.findFirst({
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