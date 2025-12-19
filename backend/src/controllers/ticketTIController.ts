import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/auth';

export class TicketTIController {
  static async createTicketTI(req: AuthRequest, res: Response) {
    try {
      const { title, description, priority = 'MEDIA', assignedToId } = req.body;
      const userId = req.user?.Id_Ejecutivo;

      if (!title?.trim() || !description?.trim()) {
        return res.status(400).json({ error: 'Título y descripción son requeridos' });
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

      // Verificar si tiene permisos para asignar
      const userRole = user.ticketData?.role || 'USER';
      
      if (assignedToId && userRole === 'USER') {
        return res.status(403).json({ error: 'No tienes permisos para asignar tickets de TI' });
      }

      // Verificar usuario asignado si se especificó
      let assignedUser = null;
      if (assignedToId) {
        assignedUser = await prisma.usuarios.findUnique({
          where: { 
            Id_Ejecutivo: parseInt(assignedToId),
            activo: 1 
          }
        });

        if (!assignedUser) {
          return res.status(404).json({ error: 'Usuario asignado no encontrado' });
        }
      }

      const ticketTI = await prisma.tK_tickets_ti.create({
        data: {
          title: title.trim(),
          description: description.trim(),
          priority,
          creatorId: userId,
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
          }
        }
      });

      // Registrar en el historial
      await prisma.tK_ticket_history.create({
        data: {
          ticketId: ticketTI.id,
          action: 'TICKET_TI_CREATED',
          userId: userId,
          details: `Ticket TI "${title}" creado con prioridad ${priority}`,
          newValue: JSON.stringify({
            title: ticketTI.title,
            priority: ticketTI.priority,
            status: ticketTI.status,
            assignedTo: assignedToId ? `Usuario ID: ${assignedToId}` : 'Sin asignar',
            area: 'TI'
          })
        }
      });

      console.log(`📝 Ticket TI creado - ID: ${ticketTI.id}, Título: "${ticketTI.title}", Creado por: ${user.Nombre} (Área: ${user.area?.nombre_area || 'Sin área'})`);

      res.status(201).json(ticketTI);

    } catch (error: unknown) {
      console.error('Error creando ticket TI:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ 
        error: 'Error al crear ticket TI',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  static async getTicketsTI(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.Id_Ejecutivo;
      const userRole = req.user?.role;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      // Parámetros de consulta
      const { showClosed = 'false', status, priority, minimal } = req.query;
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
      const isSuperAdmin = effectiveUserRole === 'SUPERADMIN';
      const isTIUser = user.area?.nombre_area === 'TI'; // Verificar si el usuario pertenece al área TI

      let whereClause: any = {};

      // Lógica de permisos y visibilidad de tickets cerrados
      if (isSuperAdmin || isTIUser) {
        // SUPERADMIN y usuarios de TI ven todos los tickets, con opción de filtrar cerrados
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

      // Aplicar filtros adicionales
      if (status && status !== 'all') {
        whereClause.status = status;
      }

      if (priority) {
        whereClause.priority = priority;
      }

      const useMinimal = minimal === 'true';
      
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
        }
      };

      const fullIncludes = {
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
        }
      };

      const ticketsTI = await prisma.tK_tickets_ti.findMany({
        where: whereClause,
        include: useMinimal ? basicIncludes : fullIncludes,
        orderBy: { updatedAt: 'desc' }
      });

      // Agregar metadata sobre tickets cerrados
      let totalWhereClause: any = {};
      if (isSuperAdmin || isTIUser) {
        totalWhereClause = {};
      } else {
        totalWhereClause = { creatorId: userId };
      }

      const totalTickets = await prisma.tK_tickets_ti.count({
        where: totalWhereClause
      });

      const closedTickets = await prisma.tK_tickets_ti.count({
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
          hasClosedTickets: closedTickets > 0,
          isTIUser: isTIUser,
          isSuperAdmin: isSuperAdmin
        }
      });

    } catch (error: unknown) {
      console.error('Error obteniendo tickets TI:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ 
        error: 'Error al obtener tickets TI',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  static async getTicketTIById(req: AuthRequest, res: Response) {
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

      const ticketTI = await prisma.tK_tickets_ti.findUnique({
        where: { id: ticketId },
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
          }
        }
      });

      if (!ticketTI) {
        return res.status(404).json({ error: 'Ticket TI no encontrado' });
      }

      // Verificar permisos: solo el creador, asignado, o usuarios de TI/SUPERADMIN pueden ver el ticket
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

      const effectiveUserRole = user.ticketData?.role || 'USER';
      const isSuperAdmin = effectiveUserRole === 'SUPERADMIN';
      const isTIUser = user.area?.nombre_area === 'TI';
      
      const canView = ticketTI.creatorId === userId || 
                     ticketTI.assignedToId === userId || 
                     isSuperAdmin || 
                     isTIUser;
      
      if (!canView) {
        return res.status(403).json({ error: 'No tienes permisos para ver este ticket TI' });
      }

      res.json(ticketTI);

    } catch (error: unknown) {
      console.error('Error obteniendo ticket TI:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ 
        error: 'Error al obtener ticket TI',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  static async addCommentTI(req: AuthRequest, res: Response) {
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

      const ticketTI = await prisma.tK_tickets_ti.findUnique({
        where: { id: ticketId }
      });

      if (!ticketTI) {
        return res.status(404).json({ error: 'Ticket TI no encontrado' });
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

      const effectiveUserRole = user.ticketData?.role || 'USER';
      const isSuperAdmin = effectiveUserRole === 'SUPERADMIN';
      const isTIUser = user.area?.nombre_area === 'TI';
      
      // Verificar permisos: creador, asignado, o usuarios de TI/SUPERADMIN pueden comentar
      const canComment = ticketTI.creatorId === userId || 
                        ticketTI.assignedToId === userId || 
                        isSuperAdmin || 
                        isTIUser;
      
      if (!canComment) {
        return res.status(403).json({ error: 'No tienes permisos para comentar en este ticket TI' });
      }

      // Crear el comentario usando la relación correcta
      const comment = await prisma.tK_comments.create({
        data: {
          content: content.trim(),
          userId: userId,
          ticketTIId: ticketId
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

      // Actualizar lastActivityAt del ticket
      const updatedTicketTI = await prisma.tK_tickets_ti.update({
        where: { id: ticketId },
        data: {
          lastActivityAt: new Date(),
          status: ticketTI.status === 'ABIERTO' ? 'EN_PROGRESO' : ticketTI.status
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
          }
        }
      });

      // Registrar en historial
      await prisma.tK_ticket_history.create({
        data: {
          ticketId: ticketId,
          action: 'COMMENT_ADDED_TI',
          userId: userId,
          details: `Comentario agregado por ${user.Nombre || user.Login} en ticket TI`,
          newValue: JSON.stringify({
            commentId: comment.id,
            contentPreview: content.length > 50 ? content.substring(0, 50) + '...' : content
          })
        }
      });

      res.json(updatedTicketTI);

    } catch (error: unknown) {
      console.error('Error agregando comentario TI:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ 
        error: 'Error al agregar comentario',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  static async assignTicketTI(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { assignedToId } = req.body;
      const userId = req.user?.Id_Ejecutivo;

      console.log('🎯 DEBUG - Iniciando asignación TI:', { 
        ticketId: id, 
        assignedToId, 
        currentUserId: userId
      });

      if (!assignedToId) {
        return res.status(400).json({ error: 'ID de usuario asignado es requerido' });
      }

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const ticketId = parseInt(id);
      if (isNaN(ticketId)) {
        return res.status(400).json({ error: 'ID de ticket inválido' });
      }

      const ticketTI = await prisma.tK_tickets_ti.findUnique({
        where: { id: ticketId }
      });

      if (!ticketTI) {
        return res.status(404).json({ error: 'Ticket TI no encontrado' });
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

      const effectiveUserRole = user.ticketData?.role || 'USER';
      const isSuperAdmin = effectiveUserRole === 'SUPERADMIN';
      const isTIUser = user.area?.nombre_area === 'TI';

      console.log('🎯 DEBUG - Usuario actual:', {
        id: user.Id_Ejecutivo,
        nombre: user.Nombre,
        role: effectiveUserRole,
        area: user.area?.nombre_area || 'Sin área',
        isTIUser: isTIUser,
        isSuperAdmin: isSuperAdmin
      });

      // Lógica de permisos mejorada: SUPERADMIN o usuarios de TI pueden asignar
      const canAssign = isSuperAdmin || isTIUser;
      
      if (!canAssign) {
        return res.status(403).json({ 
          error: 'No tienes permisos para asignar tickets TI. Solo personal de TI puede asignar.' 
        });
      }

      // Verificar que el usuario asignado existe
      const assignedUser = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: parseInt(assignedToId) },
        include: { area: true }
      });

      if (!assignedUser) {
        return res.status(404).json({ error: 'Usuario asignado no encontrado' });
      }

      console.log('🎯 DEBUG - Usuario a asignar:', {
        id: assignedUser.Id_Ejecutivo,
        nombre: assignedUser.Nombre,
        area: assignedUser.area?.nombre_area || 'Sin área'
      });

      // Solo se puede asignar a usuarios del área TI (para mantener consistencia)
      const assignedUserIsTI = assignedUser.area?.nombre_area === 'TI';
      
      if (!assignedUserIsTI && !isSuperAdmin) {
        return res.status(400).json({ 
          error: 'Solo puedes asignar tickets TI a usuarios del área TI' 
        });
      }

      // Actualizar el ticket
      const updatedTicketTI = await prisma.tK_tickets_ti.update({
        where: { id: ticketId },
        data: {
          assignedToId: parseInt(assignedToId),
          status: ticketTI.status === 'ABIERTO' ? 'EN_PROGRESO' : ticketTI.status,
          lastActivityAt: new Date(),
          updatedAt: new Date()
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
          }
        }
      });

      // Registrar en historial
      await prisma.tK_ticket_history.create({
        data: {
          ticketId: ticketId,
          action: 'TICKET_TI_ASIGNADO',
          userId: userId,
          oldValue: ticketTI.assignedToId ? `Usuario ID: ${ticketTI.assignedToId}` : 'No asignado',
          newValue: `Usuario ID: ${assignedToId} (${assignedUser.Nombre})`,
          details: `Ticket TI asignado a ${assignedUser.Nombre} por ${user.Nombre || user.Login}`
        }
      });

      console.log(`📝 Ticket TI asignado - ID: ${updatedTicketTI.id}, Asignado a: ${assignedUser.Nombre}, Por: ${user.Nombre}`);

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

      const ticketTI = await prisma.tK_tickets_ti.findUnique({
        where: { id: ticketId }
      });

      if (!ticketTI) {
        return res.status(404).json({ error: 'Ticket TI no encontrado' });
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

      const effectiveUserRole = user.ticketData?.role || 'USER';
      const isSuperAdmin = effectiveUserRole === 'SUPERADMIN';
      const isTIUser = user.area?.nombre_area === 'TI';

      // Verificar permisos: creador, asignado, o usuarios de TI/SUPERADMIN pueden cambiar estado
      const canUpdate = ticketTI.creatorId === userId || 
                       ticketTI.assignedToId === userId || 
                       isSuperAdmin || 
                       isTIUser;

      if (!canUpdate) {
        return res.status(403).json({ error: 'No tienes permisos para actualizar este ticket TI' });
      }

      const oldStatus = ticketTI.status;
      const updatedTicketTI = await prisma.tK_tickets_ti.update({
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
          }
        }
      });

      // Registrar en historial
      await prisma.tK_ticket_history.create({
        data: {
          ticketId: ticketId,
          action: 'STATUS_CHANGED_TI',
          userId: userId,
          oldValue: oldStatus,
          newValue: status,
          details: `Estado cambiado de ${oldStatus} a ${status} por ${user.Nombre || user.Login}`
        }
      });

      res.json(updatedTicketTI);

    } catch (error: unknown) {
      console.error('Error actualizando estado TI:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ 
        error: 'Error al actualizar estado',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  static async closeTicketTI(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.Id_Ejecutivo;

      console.log('🔒 Cerrando ticket TI:', { id, userId });

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const ticketId = parseInt(id);
      if (isNaN(ticketId)) {
        return res.status(400).json({ error: 'ID de ticket inválido' });
      }

      const ticketTI = await prisma.tK_tickets_ti.findUnique({
        where: { id: ticketId },
        include: { 
          creator: {
            select: { 
              Id_Ejecutivo: true, 
              Nombre: true, 
              Correo: true,
              Login: true 
            }
          }
        }
      });

      if (!ticketTI) {
        return res.status(404).json({ error: 'Ticket TI no encontrado' });
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

      const effectiveUserRole = user.ticketData?.role || 'USER';
      const isSuperAdmin = effectiveUserRole === 'SUPERADMIN';
      const isTIUser = user.area?.nombre_area === 'TI';

      // Solo el creador, asignado, o usuarios de TI/SUPERADMIN pueden cerrar el ticket
      const canClose = ticketTI.creatorId === userId || 
                      ticketTI.assignedToId === userId || 
                      isSuperAdmin || 
                      isTIUser;

      if (!canClose) {
        return res.status(403).json({ 
          error: 'No tienes permisos para cerrar este ticket TI' 
        });
      }

      // Usar transacción
      const result = await prisma.$transaction(async (tx) => {
        // 1. Actualizar ticket TI
        const updatedTicketTI = await tx.tK_tickets_ti.update({
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
            }
          }
        });

        // 2. Solo incrementar contador si el usuario que cierra es el creador
        if (ticketTI.creatorId === userId) {
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

        // 3. Registrar en ticketHistory para métricas
        await tx.tK_ticket_history.create({
          data: {
            ticketId: updatedTicketTI.id,
            action: 'TICKET_TI_CERRADO',
            userId: userId,
            details: `Ticket TI cerrado por ${user.Nombre || user.Login}`,
            newValue: JSON.stringify({
              action: 'Ticket TI cerrado',
              closedBy: user.Nombre,
              wasCreator: ticketTI.creatorId === userId,
              ticketId: updatedTicketTI.id
            })
          }
        });

        // 4. Log en consola para tickets TI
        console.log(`📝 Ticket TI cerrado - ID: ${updatedTicketTI.id}, Cerrado por: ${user.Nombre}, Era creador: ${ticketTI.creatorId === userId}`);

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

  // MÉTODO NUEVO: Obtener tickets TI asignados al usuario
  static async getAssignedTicketsTI(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.Id_Ejecutivo;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const { showClosed = 'false' } = req.query;
      const includeClosed = showClosed === 'true';

      let whereClause: any = {
        assignedToId: userId
      };

      if (!includeClosed) {
        whereClause.status = { not: 'CERRADO' };
      }

      const assignedTickets = await prisma.tK_tickets_ti.findMany({
        where: whereClause,
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
          }
        },
        orderBy: { updatedAt: 'desc' }
      });

      res.json({
        tickets: assignedTickets,
        metadata: {
          total: assignedTickets.length,
          showingClosed: includeClosed
        }
      });

    } catch (error: unknown) {
      console.error('Error obteniendo tickets TI asignados:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ 
        error: 'Error al obtener tickets TI asignados',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }
}