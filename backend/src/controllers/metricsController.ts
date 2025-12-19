// src/controllers/metricsController.ts
import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/auth';

export class MetricsController {
  // Métodos existentes que ya tenemos
   static async getDashboardMetrics(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      
      // Métricas básicas
      const totalTickets = await prisma.tK_tickets.count();
      const openTickets = await prisma.tK_tickets.count({
        where: { status: 'ABIERTO' }
      });
      
      const totalTicketsTI = await prisma.tK_tickets_ti.count();
      const openTicketsTI = await prisma.tK_tickets_ti.count({
        where: { status: 'ABIERTO' }
      });
      
      const totalUsers = await prisma.usuarios.count({
        where: { activo: 1 }
      });
      
      const totalAreas = await prisma.area.count();
      
      res.status(200).json({
        success: true,
        metrics: {
          tickets: {
            total: totalTickets,
            open: openTickets,
            closed: totalTickets - openTickets
          },
          ticketsTI: {
            total: totalTicketsTI,
            open: openTicketsTI,
            closed: totalTicketsTI - openTicketsTI
          },
          users: {
            total: totalUsers
          },
          areas: {
            total: totalAreas
          }
        }
      });
    } catch (error) {
      console.error('Error obteniendo métricas del dashboard:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async getTicketsTrend(req: AuthRequest, res: Response) {
    try {
      const { days = 30 } = req.query;
      const userRole = req.user?.role;
      const userAreaId = req.user?.areaId;
      const userId = req.user?.Id_Ejecutivo;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days as string));

      // Obtener usuario para determinar rol real
      const user = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId },
        include: { ticketData: true }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const effectiveUserRole = user.ticketData?.role || userRole || 'USER';
      const isSuperAdmin = effectiveUserRole === 'SUPERADMIN';

      // Obtener tickets generales agrupados por día
      const ticketsByDay = await prisma.tK_tickets.groupBy({
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
      const ticketsTIByDay = await prisma.tK_tickets_ti.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: { gte: startDate },
          ...(isSuperAdmin ? {} : { 
            OR: [
              { creatorId: userId },
              { assignedToId: userId }
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

      // Combinar y formatear datos
      const allTicketsByDay = [...ticketsByDay, ...ticketsTIByDay].reduce((acc, day) => {
        const date = day.createdAt!.toISOString().split('T')[0];
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

  static async getAreaMetrics(req: AuthRequest, res: Response) {
    try {
      const { areaId } = req.params;
      const userId = req.user?.Id_Ejecutivo;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const areaIdNum = parseInt(areaId);
      if (isNaN(areaIdNum)) {
        return res.status(400).json({ error: 'ID de área inválido' });
      }

      // Verificar que el área existe
      const area = await prisma.area.findUnique({
        where: { id_area: areaIdNum },
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

      if (!area) {
        return res.status(404).json({ error: 'Área no encontrada' });
      }

      // Verificar permisos
      const user = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId },
        include: { ticketData: true }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const userRole = user.ticketData?.role || 'USER';
      const canAccess = 
        userRole === 'SUPERADMIN' ||
        userRole === 'ADMIN' ||
        (userRole === 'MANAGER' && user.id_area === areaIdNum);

      if (!canAccess) {
        return res.status(403).json({ 
          error: 'No tienes permisos para ver métricas de esta área' 
        });
      }

      // Obtener métricas del área
      const [
        totalUsers,
        activeUsers,
        totalTickets,
        openTickets,
        inProgressTickets,
        closedTickets,
        pendingTransfers
      ] = await Promise.all([
        prisma.usuarios.count({ where: { id_area: areaIdNum } }),
        prisma.usuarios.count({ 
          where: { 
            id_area: areaIdNum,
            activo: 1 
          }
        }),
        prisma.tK_tickets.count({ where: { areaId: areaIdNum } }),
        prisma.tK_tickets.count({ 
          where: { 
            areaId: areaIdNum,
            status: 'ABIERTO'
          }
        }),
        prisma.tK_tickets.count({ 
          where: { 
            areaId: areaIdNum,
            status: 'EN_PROGRESO'
          }
        }),
        prisma.tK_tickets.count({ 
          where: { 
            areaId: areaIdNum,
            status: 'CERRADO'
          }
        }),
        prisma.tK_transfer_requests.count({
          where: { 
            fromAreaId: areaIdNum,
            status: 'PENDIENTE'
          }
        })
      ]);

      // Tickets recientes (últimos 7 días)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentTickets = await prisma.tK_tickets.count({
        where: {
          areaId: areaIdNum,
          createdAt: { gte: sevenDaysAgo }
        }
      });

      const metrics = {
        area: {
          id: area.id_area,
          nombre: area.nombre_area,
          manager: area.manager
        },
        usuarios: {
          total: totalUsers,
          activos: activeUsers,
          inactivos: totalUsers - activeUsers
        },
        tickets: {
          total: totalTickets,
          abiertos: openTickets,
          enProgreso: inProgressTickets,
          cerrados: closedTickets,
          recientes: recentTickets
        },
        eficiencia: {
          tasaCierre: totalTickets > 0 ? parseFloat((closedTickets / totalTickets * 100).toFixed(1)) : 0,
          ticketsPorUsuario: activeUsers > 0 ? parseFloat((totalTickets / activeUsers).toFixed(1)) : 0
        },
        transferencias: {
          pendientes: pendingTransfers
        }
      };

      res.json(metrics);

    } catch (error: unknown) {
      console.error('Error obteniendo métricas del área:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ 
        error: 'Error al obtener métricas del área',
        details: errorMessage 
      });
    }
  }

  // ========== NUEVOS MÉTODOS SIMPLIFICADOS ==========

  static async getMyStatistics(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.Id_Ejecutivo;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const user = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId },
        include: {
          area: true,
          ticketData: true,
          _count: {
            select: {
              createdTickets: true,
              assignedTickets: true,
              createdTicketsTI: true,
              assignedTicketsTI: true,
              comments: true
            }
          }
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Tickets asignados activos
      const assignedActiveTickets = await prisma.tK_tickets.count({
        where: {
          assignedToId: userId,
          status: { in: ['ABIERTO', 'EN_PROGRESO'] }
        }
      });

      const assignedActiveTicketsTI = await prisma.tK_tickets_ti.count({
        where: {
          assignedToId: userId,
          status: { in: ['ABIERTO', 'EN_PROGRESO'] }
        }
      });

      const stats = {
        usuario: {
          id: user.Id_Ejecutivo,
          nombre: user.Nombre,
          area: user.area?.nombre_area || 'Sin área',
          rol: user.ticketData?.role || 'USER'
        },
        tickets: {
          creados: user._count.createdTickets,
          asignados: user._count.assignedTickets,
          creadosTI: user._count.createdTicketsTI,
          asignadosTI: user._count.assignedTicketsTI,
          asignadosActivos: assignedActiveTickets + assignedActiveTicketsTI,
          cerrados: user.ticketData?.ticketsClosed || 0
        },
        actividad: {
          comentarios: user._count.comments,
          ultimaSesion: user.ultima_sesion
        }
      };

      res.json(stats);

    } catch (error: unknown) {
      console.error('Error obteniendo estadísticas personales:', error);
      res.status(500).json({ 
        error: 'Error al obtener estadísticas',
        message: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async getMyAreaMetrics(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.Id_Ejecutivo;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      // Obtener área del usuario
      const user = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId },
        include: { 
          area: true,
          ticketData: true 
        }
      });

      if (!user || !user.area) {
        return res.status(404).json({ error: 'Usuario o área no encontrados' });
      }

      const userRole = user.ticketData?.role || 'USER';
      
      // Verificar que sea manager del área
      if (userRole !== 'MANAGER' && userRole !== 'ADMIN' && userRole !== 'SUPERADMIN') {
        if (user.area.TK_managerId !== userId) {
          return res.status(403).json({ 
            error: 'No eres manager de esta área' 
          });
        }
      }

      // Usar el método getAreaMetrics pero con el área del usuario
      return this.getAreaMetrics(
        { ...req, params: { areaId: user.area.id_area.toString() } } as any,
        res
      );

    } catch (error: unknown) {
      console.error('Error obteniendo métricas de mi área:', error);
      res.status(500).json({ 
        error: 'Error al obtener métricas del área',
        message: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  static async getAllAreasMetrics(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.Id_Ejecutivo;
      const { compare = 'false' } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      // Verificar que sea admin
      const user = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId },
        include: { ticketData: true }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const userRole = user.ticketData?.role || 'USER';
      
      if (userRole !== 'ADMIN' && userRole !== 'SUPERADMIN') {
        return res.status(403).json({ 
          error: 'No tienes permisos para ver todas las áreas' 
        });
      }

      const areas = await prisma.area.findMany({
        include: {
          manager: {
            select: {
              Id_Ejecutivo: true,
              Nombre: true
            }
          },
          _count: {
            select: {
              users: {
                where: { activo: 1 }
              },
              tickets: true
            }
          }
        },
        orderBy: { nombre_area: 'asc' }
      });

      const areasMetrics = await Promise.all(
        areas.map(async (area) => {
          const [
            openTickets,
            inProgressTickets,
            closedTickets,
            recentTickets
          ] = await Promise.all([
            prisma.tK_tickets.count({
              where: { areaId: area.id_area, status: 'ABIERTO' }
            }),
            prisma.tK_tickets.count({
              where: { areaId: area.id_area, status: 'EN_PROGRESO' }
            }),
            prisma.tK_tickets.count({
              where: { areaId: area.id_area, status: 'CERRADO' }
            }),
            prisma.tK_tickets.count({
              where: {
                areaId: area.id_area,
                createdAt: {
                  gte: new Date(new Date().setDate(new Date().getDate() - 7))
                }
              }
            })
          ]);

          const totalTickets = area._count.tickets;
          
          return {
            id: area.id_area,
            nombre: area.nombre_area,
            manager: area.manager,
            usuariosActivos: area._count.users,
            tickets: {
              total: totalTickets,
              abiertos: openTickets,
              enProgreso: inProgressTickets,
              cerrados: closedTickets,
              recientes: recentTickets
            },
            eficiencia: {
              tasaCierre: totalTickets > 0 ? parseFloat((closedTickets / totalTickets * 100).toFixed(1)) : 0,
              ticketsPorUsuario: area._count.users > 0 ? parseFloat((totalTickets / area._count.users).toFixed(1)) : 0
            }
          };
        })
      );

      res.json({
        areas: areasMetrics,
        totalAreas: areas.length,
        compareMode: compare === 'true'
      });

    } catch (error: unknown) {
      console.error('Error obteniendo métricas de todas las áreas:', error);
      res.status(500).json({ 
        error: 'Error al obtener métricas',
        message: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Métodos restantes que no implementaremos por ahora (para simplificar)
  static async getUsersActivityMetrics(req: AuthRequest, res: Response) {
    res.status(501).json({ 
      error: 'No implementado',
      message: 'Esta funcionalidad estará disponible próximamente' 
    });
  }

  static async getTransfersMetrics(req: AuthRequest, res: Response) {
    res.status(501).json({ 
      error: 'No implementado',
      message: 'Esta funcionalidad estará disponible próximamente' 
    });
  }

  static async getSystemMetrics(req: AuthRequest, res: Response) {
    res.status(501).json({ 
      error: 'No implementado',
      message: 'Esta funcionalidad estará disponible próximamente' 
    });
  }

  static async getAuditMetrics(req: AuthRequest, res: Response) {
    res.status(501).json({ 
      error: 'No implementado',
      message: 'Esta funcionalidad estará disponible próximamente' 
    });
  }

  static async getTicketsMetrics(req: AuthRequest, res: Response) {
    res.status(501).json({ 
      error: 'No implementado',
      message: 'Esta funcionalidad estará disponible próximamente' 
    });
  }

  static async getCommentsMetrics(req: AuthRequest, res: Response) {
    res.status(501).json({ 
      error: 'No implementado',
      message: 'Esta funcionalidad estará disponible próximamente' 
    });
  }

  static async getRealtimeMetrics(req: AuthRequest, res: Response) {
    res.status(501).json({ 
      error: 'No implementado',
      message: 'Esta funcionalidad estará disponible próximamente' 
    });
  }
}