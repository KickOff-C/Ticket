import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/auth';

export class MetricsController {
  static async getDashboardMetrics(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      const userAreaId = req.user?.areaId;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { area: true }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Fechas para filtros (últimos 30 días)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Determinar permisos
      const isSuperAdmin = user.role === 'SUPERADMIN';
      const isAdmin = user.role === 'ADMIN' || isSuperAdmin;
      const isManager = user.role === 'MANAGER';

      // 1. MÉTRICAS GENERALES - CORREGIDO PARA SUPERADMIN
      const totalTickets = await prisma.ticket.count({
        where: isSuperAdmin ? {} : { areaId: userAreaId }
      });

      const openTickets = await prisma.ticket.count({
        where: { 
          status: 'ABIERTO',
          ...(isSuperAdmin ? {} : { areaId: userAreaId })
        }
      });

      const inProgressTickets = await prisma.ticket.count({
        where: { 
          status: 'EN_PROGRESO',
          ...(isSuperAdmin ? {} : { areaId: userAreaId })
        }
      });

      const closedTickets = await prisma.ticket.count({
        where: { 
          status: 'CERRADO',
          ...(isSuperAdmin ? {} : { areaId: userAreaId })
        }
      });

      // 2. MÉTRICAS TI - CORREGIDO PARA SUPERADMIN
      const totalTicketsTI = await prisma.ticketTI.count({
        where: isSuperAdmin ? {} : { 
          OR: [
            { creatorId: userId },
            { assignedToId: userId }
          ]
        }
      });

      const openTicketsTI = await prisma.ticketTI.count({
        where: { 
          status: 'ABIERTO',
          ...(isSuperAdmin ? {} : { 
            OR: [
              { creatorId: userId },
              { assignedToId: userId }
            ]
          })
        }
      });

      const inProgressTicketsTI = await prisma.ticketTI.count({
        where: { 
          status: 'EN_PROGRESO',
          ...(isSuperAdmin ? {} : { 
            OR: [
              { creatorId: userId },
              { assignedToId: userId }
            ]
          })
        }
      });

      const closedTicketsTI = await prisma.ticketTI.count({
        where: { 
          status: 'CERRADO',
          ...(isSuperAdmin ? {} : { 
            OR: [
              { creatorId: userId },
              { assignedToId: userId }
            ]
          })
        }
      });

      // 3. TIEMPOS DE RESOLUCIÓN - CORREGIDO PARA SUPERADMIN
      const closedTicketsWithTime = await prisma.ticket.findMany({
        where: { 
          status: 'CERRADO',
          closedAt: { not: null },
          ...(isSuperAdmin ? {} : { areaId: userAreaId })
        },
        select: {
          createdAt: true,
          closedAt: true
        }
      });

      const resolutionTimes = closedTicketsWithTime.map(ticket => {
        const created = new Date(ticket.createdAt).getTime();
        const closed = new Date(ticket.closedAt!).getTime();
        return (closed - created) / (1000 * 60 * 60 * 24); // Días
      });

      const avgResolutionTime = resolutionTimes.length > 0 
        ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length 
        : 0;

      // 4. TICKETS POR ÁREA (solo para admins/superadmin)
      let ticketsByArea: any[] = [];
      if (isAdmin) {
        ticketsByArea = await prisma.area.findMany({
          include: {
            _count: {
              select: {
                tickets: {
                  where: isSuperAdmin ? {} : { areaId: userAreaId }
                }
              }
            }
          }
        });
      }

      // 5. ACTIVIDAD RECIENTE (últimos 30 días) - CORREGIDO PARA SUPERADMIN
      const recentTickets = await prisma.ticket.count({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          ...(isSuperAdmin ? {} : { areaId: userAreaId })
        }
      });

      const recentComments = await prisma.comment.count({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          ...(isSuperAdmin ? {} : { 
            OR: [
              { ticket: { areaId: userAreaId } },
              { ticketTI: { 
                OR: [
                  { creatorId: userId },
                  { assignedToId: userId }
                ]
              }}
            ]
          })
        }
      });

      // 6. USUARIOS MÁS ACTIVOS (solo para superadmin)
      let topUsers: any[] = [];
      if (isSuperAdmin) {
        topUsers = await prisma.user.findMany({
          where: { isActive: true },
          include: {
            _count: {
              select: {
                createdTickets: true,
                comments: true
              }
            }
          },
          orderBy: {
            createdTickets: { _count: 'desc' }
          },
          take: 5
        });
      }

      // 7. TRANSFERENCIAS PENDIENTES - CORREGIDO PARA SUPERADMIN
      const pendingTransfers = await prisma.transferRequest.count({
        where: { 
          status: 'PENDIENTE',
          ...(isSuperAdmin ? {} : { toAreaId: userAreaId })
        }
      });

      // 8. TICKETS CERRADOS POR EL USUARIO - CORREGIDO PARA SUPERADMIN
      // Para SUPERADMIN, contar todos los tickets cerrados que cerró
      let userClosedTickets = 0;
      let userClosedTicketsTI = 0;

      if (isSuperAdmin) {
        // SUPERADMIN: contar tickets donde él cerró (basado en ticketHistory)
        const userClosedTicketHistory = await prisma.ticketHistory.count({
          where: {
            userId: userId,
            action: 'TICKET_CERRADO'
          }
        });

        const userClosedTicketTIHistory = await prisma.ticketHistory.count({
          where: {
            userId: userId,
            action: 'TICKET_TI_CERRADO'
          }
        });

        userClosedTickets = userClosedTicketHistory;
        userClosedTicketsTI = userClosedTicketTIHistory;
      } else {
        // Usuarios normales: contar tickets donde son creadores
        userClosedTickets = await prisma.ticket.count({
          where: {
            status: 'CERRADO',
            creatorId: userId
          }
        });

        userClosedTicketsTI = await prisma.ticketTI.count({
          where: {
            status: 'CERRADO',
            creatorId: userId
          }
        });
      }

      const totalUserClosedTickets = userClosedTickets + userClosedTicketsTI;

      // 9. MÉTRICAS COMBINADAS (General + TI)
      const totalAllTickets = totalTickets + totalTicketsTI;
      const openAllTickets = openTickets + openTicketsTI;
      const inProgressAllTickets = inProgressTickets + inProgressTicketsTI;
      const closedAllTickets = closedTickets + closedTicketsTI;

      const metrics = {
        // Métricas básicas
        general: {
          total: totalTickets,
          abiertos: openTickets,
          enProgreso: inProgressTickets,
          cerrados: closedTickets
        },
        
        // Métricas TI
        ti: {
          total: totalTicketsTI,
          abiertos: openTicketsTI,
          enProgreso: inProgressTicketsTI,
          cerrados: closedTicketsTI
        },

        // Métricas combinadas
        combined: {
          total: totalAllTickets,
          abiertos: openAllTickets,
          enProgreso: inProgressAllTickets,
          cerrados: closedAllTickets
        },

        // Tiempos y eficiencia
        efficiency: {
          tiempoResolucionPromedio: parseFloat(avgResolutionTime.toFixed(1)),
          ticketsRecientes: recentTickets,
          comentariosRecientes: recentComments,
          transferenciasPendientes: pendingTransfers
        },

        // Datos para gráficos (solo admins/superadmin)
        charts: isAdmin ? {
          ticketsPorArea: ticketsByArea.map(area => ({
            area: area.name,
            cantidad: area._count.tickets
          })),
          usuariosActivos: topUsers.map(user => ({
            usuario: user.name,
            ticketsCreados: user._count.createdTickets,
            comentarios: user._count.comments,
            ticketsCerrados: user.ticketsClosed || 0
          }))
        } : null,

        // Información del usuario
        userStats: {
          ticketsCerrados: totalUserClosedTickets,
          rol: user.role,
          area: user.area?.name || 'Sin área'
        },

        // Metadata adicional
        metadata: {
          isSuperAdmin,
          isAdmin,
          isManager,
          userId
        }
      };

      console.log(`📊 Métricas generadas para usuario ${userId} (${user.role}):`, {
        ticketsGenerales: totalTickets,
        ticketsTI: totalTicketsTI,
        cerradosPorUsuario: totalUserClosedTickets
      });

      res.json(metrics);

    } catch (error: unknown) {
      console.error('Error obteniendo métricas:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ 
        error: 'Error al obtener métricas',
        ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
      });
    }
  }

  static async getTicketsTrend(req: AuthRequest, res: Response) {
    try {
      const { days = 30 } = req.query;
      const userRole = req.user?.role;
      const userAreaId = req.user?.areaId;

      const isSuperAdmin = userRole === 'SUPERADMIN';
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days as string));

      // Obtener tickets generales agrupados por día
      const ticketsByDay = await prisma.ticket.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: { gte: startDate },
          ...(isSuperAdmin ? {} : { areaId: userAreaId })
        },
        _count: {
          id: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      // Obtener tickets TI agrupados por día
      const ticketsTIByDay = await prisma.ticketTI.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: { gte: startDate },
          ...(isSuperAdmin ? {} : { 
            OR: [
              { creatorId: req.user?.userId },
              { assignedToId: req.user?.userId }
            ]
          })
        },
        _count: {
          id: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      // Combinar y formatear datos para el gráfico
      const allTicketsByDay = [...ticketsByDay, ...ticketsTIByDay].reduce((acc, day) => {
        const date = day.createdAt.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = 0;
        }
        acc[date] += day._count.id;
        return acc;
      }, {} as Record<string, number>);

      const trendData = Object.entries(allTicketsByDay).map(([fecha, cantidad]) => ({
        fecha,
        cantidad
      })).sort((a, b) => a.fecha.localeCompare(b.fecha));

      res.json(trendData);

    } catch (error: unknown) {
      console.error('Error obteniendo tendencia:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ error: errorMessage });
    }
  }
}