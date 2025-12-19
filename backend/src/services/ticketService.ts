// src/services/ticketService.ts
import { prisma } from '../app';

export class TicketService {
  /**
   * Crear un nuevo ticket regular
   */
  static async createTicket(data: {
    title: string;
    description: string;
    priority?: string;
    creatorId: number;
    areaId: number;
    assignedToId?: number | null;
  }) {
    try {
      // Verificar que el creador existe y está activo
      const creator = await prisma.usuarios.findUnique({
        where: { 
          Id_Ejecutivo: data.creatorId,
          activo: 1 
        }
      });

      if (!creator) {
        throw new Error('Creador no encontrado o inactivo');
      }

      // Verificar que el área existe
      const area = await prisma.area.findUnique({
        where: { id_area: data.areaId }
      });

      if (!area) {
        throw new Error('Área no encontrada');
      }

      // Si se asigna a un usuario, verificar que existe y pertenece al área
      if (data.assignedToId) {
        const assignedUser = await prisma.usuarios.findUnique({
          where: { 
            Id_Ejecutivo: data.assignedToId,
            activo: 1
          }
        });

        if (!assignedUser) {
          throw new Error('Usuario asignado no encontrado o inactivo');
        }

        if (assignedUser.id_area !== data.areaId) {
          throw new Error('El usuario asignado no pertenece al área del ticket');
        }
      }

      const ticket = await prisma.tK_tickets.create({
        data: {
          title: data.title.trim(),
          description: data.description.trim(),
          priority: data.priority || 'MEDIA',
          creatorId: data.creatorId,
          areaId: data.areaId,
          assignedToId: data.assignedToId || null,
          lastActivityAt: new Date()
        },
        include: {
          creator: {
            select: {
              Id_Ejecutivo: true,
              Nombre: true,
              Login: true,
              Correo: true
            }
          },
          assignedTo: {
            select: {
              Id_Ejecutivo: true,
              Nombre: true,
              Login: true,
              Correo: true
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

      // Registrar en historial
      await prisma.tK_ticket_history.create({
        data: {
          ticketId: ticket.id,
          action: 'TICKET_CREATED',
          userId: data.creatorId,
          details: `Ticket "${data.title}" creado con prioridad ${data.priority || 'MEDIA'}`,
          newValue: JSON.stringify({
            title: ticket.title,
            priority: ticket.priority,
            status: ticket.status,
            assignedTo: data.assignedToId ? `Usuario ID: ${data.assignedToId}` : 'Sin asignar',
            areaId: data.areaId
          })
        }
      });

      // Log de creación
      console.log(`🎫 Ticket creado - ID: ${ticket.id}, Título: "${ticket.title}", Creador: ${creator.Nombre}`);

      return ticket;

    } catch (error) {
      console.error('Error en servicio de creación de ticket:', error);
      throw error;
    }
  }

  /**
   * Crear un nuevo ticket de TI
   */
  static async createTicketTI(data: {
    title: string;
    description: string;
    priority?: string;
    creatorId: number;
    assignedToId?: number | null;
  }) {
    try {
      // Verificar que el creador existe y está activo
      const creator = await prisma.usuarios.findUnique({
        where: { 
          Id_Ejecutivo: data.creatorId,
          activo: 1 
        }
      });

      if (!creator) {
        throw new Error('Creador no encontrado o inactivo');
      }

      // Si se asigna a un usuario, verificar que existe y está activo
      if (data.assignedToId) {
        const assignedUser = await prisma.usuarios.findUnique({
          where: { 
            Id_Ejecutivo: data.assignedToId,
            activo: 1
          }
        });

        if (!assignedUser) {
          throw new Error('Usuario asignado no encontrado o inactivo');
        }

        // Opcional: Verificar que el usuario asignado pertenezca al área TI
        const userArea = await prisma.area.findUnique({
          where: { id_area: assignedUser.id_area || 0 }
        });

        if (userArea?.nombre_area !== 'TI') {
          console.warn(`Usuario asignado a ticket TI no pertenece al área TI: ${assignedUser.Nombre}`);
        }
      }

      const ticketTI = await prisma.tK_tickets_ti.create({
        data: {
          title: data.title.trim(),
          description: data.description.trim(),
          priority: data.priority || 'MEDIA',
          creatorId: data.creatorId,
          assignedToId: data.assignedToId || null,
          lastActivityAt: new Date()
        },
        include: {
          creator: {
            select: {
              Id_Ejecutivo: true,
              Nombre: true,
              Login: true,
              Correo: true
            }
          },
          assignedTo: {
            select: {
              Id_Ejecutivo: true,
              Nombre: true,
              Login: true,
              Correo: true
            }
          }
        }
      });

      // Registrar en historial
      await prisma.tK_ticket_history.create({
        data: {
          ticketId: ticketTI.id,
          action: 'TICKET_TI_CREATED',
          userId: data.creatorId,
          details: `Ticket TI "${data.title}" creado con prioridad ${data.priority || 'MEDIA'}`,
          newValue: JSON.stringify({
            title: ticketTI.title,
            priority: ticketTI.priority,
            status: ticketTI.status,
            assignedTo: data.assignedToId ? `Usuario ID: ${data.assignedToId}` : 'Sin asignar',
            area: 'TI'
          })
        }
      });

      console.log(`🎫 Ticket TI creado - ID: ${ticketTI.id}, Título: "${ticketTI.title}", Creador: ${creator.Nombre}`);

      return ticketTI;

    } catch (error) {
      console.error('Error en servicio de creación de ticket TI:', error);
      throw error;
    }
  }

  /**
   * Agregar comentario a un ticket regular
   */
  static async addComment(ticketId: number, userId: number, content: string) {
    try {
      // Verificar que el ticket existe
      const ticket = await prisma.tK_tickets.findUnique({
        where: { id: ticketId }
      });

      if (!ticket) {
        throw new Error('Ticket no encontrado');
      }

      // Verificar que el usuario existe y está activo
      const user = await prisma.usuarios.findUnique({
        where: { 
          Id_Ejecutivo: userId,
          activo: 1 
        }
      });

      if (!user) {
        throw new Error('Usuario no encontrado o inactivo');
      }

      // Crear el comentario y actualizar el ticket
      const result = await prisma.$transaction(async (tx) => {
        const comment = await tx.tK_comments.create({
          data: {
            content: content.trim(),
            userId,
            ticketId
          },
          include: {
            user: {
              select: {
                Id_Ejecutivo: true,
                Nombre: true,
                Login: true,
                Correo: true
              }
            }
          }
        });

        // Actualizar ticket
        const updatedTicket = await tx.tK_tickets.update({
          where: { id: ticketId },
          data: {
            lastActivityAt: new Date(),
            status: ticket.status === 'ABIERTO' ? 'EN_PROGRESO' : ticket.status,
            updatedAt: new Date()
          },
          include: {
            creator: {
              select: {
                Id_Ejecutivo: true,
                Nombre: true,
                Login: true,
                Correo: true
              }
            },
            assignedTo: {
              select: {
                Id_Ejecutivo: true,
                Nombre: true,
                Login: true,
                Correo: true
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
                    Login: true,
                    Correo: true
                  }
                }
              },
              orderBy: { createdAt: 'asc' }
            }
          }
        });

        // Registrar en historial
        await tx.tK_ticket_history.create({
          data: {
            ticketId,
            action: 'COMMENT_ADDED',
            userId,
            details: `Comentario agregado por ${user.Nombre || user.Login}`,
            newValue: JSON.stringify({
              commentId: comment.id,
              contentPreview: content.length > 50 ? content.substring(0, 50) + '...' : content
            })
          }
        });

        return { ticket: updatedTicket, comment };
      });

      // Verificar inactividad después del comentario
      await this.checkInactivityAlerts(ticketId).catch(error => {
        console.error('Error verificando inactividad:', error);
      });

      return result.ticket;

    } catch (error) {
      console.error('Error en servicio de agregar comentario:', error);
      throw error;
    }
  }

  /**
   * Agregar comentario a un ticket TI
   */
  static async addCommentTI(ticketId: number, userId: number, content: string) {
    try {
      // Verificar que el ticket TI existe
      const ticketTI = await prisma.tK_tickets_ti.findUnique({
        where: { id: ticketId }
      });

      if (!ticketTI) {
        throw new Error('Ticket TI no encontrado');
      }

      // Verificar que el usuario existe y está activo
      const user = await prisma.usuarios.findUnique({
        where: { 
          Id_Ejecutivo: userId,
          activo: 1 
        }
      });

      if (!user) {
        throw new Error('Usuario no encontrado o inactivo');
      }

      const result = await prisma.$transaction(async (tx) => {
        const comment = await tx.tK_comments.create({
          data: {
            content: content.trim(),
            userId,
            ticketTIId: ticketId
          },
          include: {
            user: {
              select: {
                Id_Ejecutivo: true,
                Nombre: true,
                Login: true,
                Correo: true
              }
            }
          }
        });

        // Actualizar ticket TI
        const updatedTicketTI = await tx.tK_tickets_ti.update({
          where: { id: ticketId },
          data: {
            lastActivityAt: new Date(),
            status: ticketTI.status === 'ABIERTO' ? 'EN_PROGRESO' : ticketTI.status,
            updatedAt: new Date()
          },
          include: {
            creator: {
              select: {
                Id_Ejecutivo: true,
                Nombre: true,
                Login: true,
                Correo: true
              }
            },
            assignedTo: {
              select: {
                Id_Ejecutivo: true,
                Nombre: true,
                Login: true,
                Correo: true
              }
            },
            comments: {
              include: {
                user: {
                  select: {
                    Id_Ejecutivo: true,
                    Nombre: true,
                    Login: true,
                    Correo: true
                  }
                }
              },
              orderBy: { createdAt: 'asc' }
            }
          }
        });

        // Registrar en historial
        await tx.tK_ticket_history.create({
          data: {
            ticketId,
            action: 'COMMENT_ADDED_TI',
            userId,
            details: `Comentario agregado por ${user.Nombre || user.Login} en ticket TI`,
            newValue: JSON.stringify({
              commentId: comment.id,
              contentPreview: content.length > 50 ? content.substring(0, 50) + '...' : content
            })
          }
        });

        return { ticketTI: updatedTicketTI, comment };
      });

      return result.ticketTI;

    } catch (error) {
      console.error('Error en servicio de agregar comentario TI:', error);
      throw error;
    }
  }

  /**
   * Verificar alertas por inactividad de tickets
   */
  static async checkInactivityAlerts(ticketId: number) {
    try {
      const ticket = await prisma.tK_tickets.findUnique({
        where: { id: ticketId },
        select: {
          id: true,
          title: true,
          status: true,
          lastActivityAt: true,
          creatorId: true,
          assignedToId: true,
          areaId: true
        }
      });

      if (!ticket || !ticket.lastActivityAt) {
        return;
      }

      const now = new Date();
      const lastActivity = new Date(ticket.lastActivityAt);
      const daysInactive = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

      if (daysInactive >= 3 && daysInactive < 6) {
        // Alerta amarilla - registrar en historial
        await prisma.tK_ticket_history.create({
          data: {
            ticketId,
            action: 'INACTIVITY_ALERT_YELLOW',
            userId: 0, // 0 para alertas del sistema
            details: `Ticket inactivo por ${daysInactive} días - Alerta amarilla`,
            newValue: JSON.stringify({
              daysInactive,
              alertType: 'yellow',
              lastActivity: ticket.lastActivityAt
            })
          }
        });

        console.log(`⚠️ Alerta amarilla - Ticket ${ticketId} inactivo por ${daysInactive} días`);

      } else if (daysInactive >= 6) {
        // Alerta roja - registrar en historial
        await prisma.tK_ticket_history.create({
          data: {
            ticketId,
            action: 'INACTIVITY_ALERT_RED',
            userId: 0, // 0 para alertas del sistema
            details: `Ticket inactivo por ${daysInactive} días - Alerta roja`,
            newValue: JSON.stringify({
              daysInactive,
              alertType: 'red',
              lastActivity: ticket.lastActivityAt
            })
          }
        });

        console.log(`🔴 Alerta roja - Ticket ${ticketId} inactivo por ${daysInactive} días`);

        // Opcional: Aquí podrías agregar notificaciones por email o sistema de mensajes
      }

    } catch (error) {
      console.error('Error verificando inactividad:', error);
      // No lanzar error para no afectar el flujo principal
    }
  }

  /**
   * Obtener tickets para un usuario según su rol
   */
  static async getTicketsForUser(userId: number, userRole: string, userAreaId: number | null, filters: {
    status?: string;
    priority?: string;
    showClosed?: boolean;
    minimal?: boolean;
  } = {}) {
    try {
      // Obtener información completa del usuario
      const user = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId },
        include: { ticketData: true }
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      const effectiveUserRole = user.ticketData?.role || userRole || 'USER';

      // Construir where clause según rol y filtros
      let whereClause: any = {};

      switch (effectiveUserRole) {
        case 'USER':
          whereClause = {
            OR: [
              { creatorId: userId },
              { assignedToId: userId }
            ]
          };
          break;
        case 'MANAGER':
          whereClause = { areaId: userAreaId };
          break;
        case 'ADMIN':
          whereClause = { areaId: userAreaId };
          break;
        case 'SUPERADMIN':
          // SUPERADMIN ve todos los tickets
          break;
        default:
          whereClause = { creatorId: userId };
      }

      // Aplicar filtros de estado
      if (filters.status && filters.status !== 'all') {
        whereClause.status = filters.status;
      } else if (!filters.showClosed) {
        whereClause.status = { not: 'CERRADO' };
      }

      // Aplicar filtro de prioridad
      if (filters.priority) {
        whereClause.priority = filters.priority;
      }

      // Definir includes según si es minimal o completo
      const baseInclude = {
        creator: {
          select: {
            Id_Ejecutivo: true,
            Nombre: true,
            Login: true,
            Correo: true
          }
        },
        assignedTo: {
          select: {
            Id_Ejecutivo: true,
            Nombre: true,
            Login: true,
            Correo: true
          }
        },
        area: {
          select: {
            id_area: true,
            nombre_area: true
          }
        }
      };

      const fullInclude = {
        ...baseInclude,
        comments: {
          include: {
            user: {
              select: {
                Id_Ejecutivo: true,
                Nombre: true,
                Login: true,
                Correo: true
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
        },
        history: {
          include: {
            user: {
              select: {
                Id_Ejecutivo: true,
                Nombre: true,
                Login: true,
                Correo: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      };

      const tickets = await prisma.tK_tickets.findMany({
        where: whereClause,
        include: filters.minimal ? baseInclude : fullInclude,
        orderBy: { updatedAt: 'desc' }
      });

      // Obtener estadísticas para metadata
      const statsWhereClause = { ...whereClause };
      if (statsWhereClause.status) {
        delete statsWhereClause.status;
      }

      const [totalTickets, closedTickets] = await Promise.all([
        prisma.tK_tickets.count({ where: statsWhereClause }),
        prisma.tK_tickets.count({ 
          where: { ...statsWhereClause, status: 'CERRADO' } 
        })
      ]);

      return {
        tickets,
        metadata: {
          total: totalTickets,
          closed: closedTickets,
          showingClosed: filters.showClosed || false,
          hasClosedTickets: closedTickets > 0,
          userRole: effectiveUserRole,
          userAreaId
        }
      };

    } catch (error) {
      console.error('Error obteniendo tickets para usuario:', error);
      throw error;
    }
  }

  /**
   * Cerrar un ticket
   */
  static async closeTicket(ticketId: number, userId: number) {
    try {
      const ticket = await prisma.tK_tickets.findUnique({
        where: { id: ticketId },
        include: { creator: true }
      });

      if (!ticket) {
        throw new Error('Ticket no encontrado');
      }

      if (ticket.creatorId !== userId) {
        throw new Error('Solo el creador del ticket puede cerrarlo');
      }

      if (ticket.status === 'CERRADO') {
        throw new Error('El ticket ya está cerrado');
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
                Login: true,
                Correo: true
              }
            },
            assignedTo: {
              select: {
                Id_Ejecutivo: true,
                Nombre: true,
                Login: true,
                Correo: true
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

        // Actualizar contador de tickets cerrados
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

        // Registrar en historial
        await tx.tK_ticket_history.create({
          data: {
            ticketId,
            action: 'TICKET_CERRADO',
            userId,
            details: `Ticket cerrado por el creador`,
            oldValue: ticket.status,
            newValue: 'CERRADO'
          }
        });

        return updatedTicket;
      });

      console.log(`✅ Ticket cerrado - ID: ${ticketId}, Cerrado por: ${ticket.creator.Nombre}`);

      return {
        ticket: result,
        message: 'Ticket cerrado exitosamente'
      };

    } catch (error) {
      console.error('Error cerrando ticket:', error);
      throw error;
    }
  }

  /**
   * Actualizar estado de un ticket
   */
  static async updateStatus(ticketId: number, status: string, userId: number) {
    try {
      if (!['ABIERTO', 'EN_PROGRESO', 'CERRADO'].includes(status)) {
        throw new Error('Estado inválido');
      }

      const ticket = await prisma.tK_tickets.findUnique({
        where: { id: ticketId }
      });

      if (!ticket) {
        throw new Error('Ticket no encontrado');
      }

      const user = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId },
        include: { ticketData: true }
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      const userRole = user.ticketData?.role || 'USER';

      // Verificar permisos
      const canUpdate = 
        userRole === 'SUPERADMIN' ||
        userRole === 'ADMIN' ||
        (userRole === 'MANAGER' && user.id_area === ticket.areaId) ||
        ticket.creatorId === userId ||
        ticket.assignedToId === userId;

      if (!canUpdate) {
        throw new Error('No tienes permisos para actualizar este ticket');
      }

      const oldStatus = ticket.status;
      const result = await prisma.$transaction(async (tx) => {
        const updatedTicket = await tx.tK_tickets.update({
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
                Login: true,
                Correo: true
              }
            },
            assignedTo: {
              select: {
                Id_Ejecutivo: true,
                Nombre: true,
                Login: true,
                Correo: true
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

        // Si se cierra el ticket y el usuario es el creador, incrementar contador
        if (status === 'CERRADO' && ticket.creatorId === userId) {
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
        }

        // Registrar en historial
        await tx.tK_ticket_history.create({
          data: {
            ticketId,
            action: 'STATUS_CHANGED',
            userId,
            oldValue: oldStatus,
            newValue: status,
            details: `Estado cambiado de ${oldStatus} a ${status} por ${user.Nombre || user.Login}`
          }
        });

        return updatedTicket;
      });

      console.log(`📝 Estado actualizado - Ticket ${ticketId}: ${oldStatus} → ${status}`);

      return result;

    } catch (error) {
      console.error('Error actualizando estado:', error);
      throw error;
    }
  }

  /**
   * Asignar ticket a usuario
   */
  static async assignToUser(ticketId: number, assignedToId: number, currentUserId: number) {
    try {
      const ticket = await prisma.tK_tickets.findUnique({
        where: { id: ticketId },
        include: {
          area: true,
          assignedTo: true,
          creator: true
        }
      });

      if (!ticket) {
        throw new Error('Ticket no encontrado');
      }

      const assignedUser = await prisma.usuarios.findUnique({
        where: { 
          Id_Ejecutivo: assignedToId,
          activo: 1 
        },
        include: { area: true }
      });

      if (!assignedUser) {
        throw new Error('Usuario asignado no encontrado o inactivo');
      }

      // Verificar que el usuario asignado pertenezca al área del ticket
      if (assignedUser.id_area !== ticket.areaId) {
        throw new Error('El usuario no pertenece al área de este ticket');
      }

      const currentUser = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: currentUserId },
        include: { 
          area: true,
          ticketData: true 
        }
      });

      if (!currentUser) {
        throw new Error('Usuario actual no encontrado');
      }

      const currentUserRole = currentUser.ticketData?.role || 'USER';
      
      // Verificar permisos para asignar
      const canAssign = 
        currentUserRole === 'SUPERADMIN' ||
        currentUserRole === 'ADMIN' ||
        (currentUserRole === 'MANAGER' && currentUser.id_area === ticket.areaId);

      if (!canAssign) {
        throw new Error('No tienes permisos para asignar este ticket');
      }

      const result = await prisma.$transaction(async (tx) => {
        const updatedTicket = await tx.tK_tickets.update({
          where: { id: ticketId },
          data: {
            assignedToId,
            lastActivityAt: new Date(),
            status: ticket.status === 'ABIERTO' ? 'EN_PROGRESO' : ticket.status
          },
          include: {
            creator: {
              select: {
                Id_Ejecutivo: true,
                Nombre: true,
                Login: true,
                Correo: true
              }
            },
            assignedTo: {
              select: {
                Id_Ejecutivo: true,
                Nombre: true,
                Login: true,
                Correo: true
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

        // Registrar en historial
        await tx.tK_ticket_history.create({
          data: {
            ticketId,
            action: 'TICKET_ASIGNADO',
            userId: currentUserId,
            oldValue: ticket.assignedTo ? ticket.assignedTo.Nombre : 'No asignado',
            newValue: assignedUser.Nombre,
            details: `Ticket asignado a ${assignedUser.Nombre} por ${currentUser.Nombre || currentUser.Login}`
          }
        });

        return updatedTicket;
      });

      console.log(`👤 Ticket asignado - ID: ${ticketId}, Asignado a: ${assignedUser.Nombre}`);

      return result;

    } catch (error) {
      console.error('Error asignando ticket:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de tickets
   */
  static async getTicketStats(areaId?: number) {
    try {
      const whereClause = areaId ? { areaId } : {};

      const [
        totalTickets,
        openTickets,
        inProgressTickets,
        closedTickets,
        ticketsByPriority,
        recentTickets
      ] = await Promise.all([
        // Total de tickets
        prisma.tK_tickets.count({ where: whereClause }),
        // Tickets abiertos
        prisma.tK_tickets.count({ 
          where: { ...whereClause, status: 'ABIERTO' } 
        }),
        // Tickets en progreso
        prisma.tK_tickets.count({ 
          where: { ...whereClause, status: 'EN_PROGRESO' } 
        }),
        // Tickets cerrados
        prisma.tK_tickets.count({ 
          where: { ...whereClause, status: 'CERRADO' } 
        }),
        // Tickets por prioridad
        prisma.tK_tickets.groupBy({
          by: ['priority'],
          where: whereClause,
          _count: { id: true }
        }),
        // Tickets recientes (últimos 7 días)
        prisma.tK_tickets.count({
          where: {
            ...whereClause,
            createdAt: {
              gte: new Date(new Date().setDate(new Date().getDate() - 7))
            }
          }
        })
      ]);

      return {
        total: totalTickets,
        byStatus: {
          abiertos: openTickets,
          enProgreso: inProgressTickets,
          cerrados: closedTickets
        },
        byPriority: ticketsByPriority.reduce((acc, item) => {
          acc[item.priority || 'SIN_PRIORIDAD'] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        recent: recentTickets,
        resolutionRate: totalTickets > 0 ? 
          parseFloat((closedTickets / totalTickets * 100).toFixed(1)) : 0
      };

    } catch (error) {
      console.error('Error obteniendo estadísticas de tickets:', error);
      throw error;
    }
  }
}