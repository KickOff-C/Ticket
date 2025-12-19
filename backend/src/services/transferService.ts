// src/services/transferService.ts
import { prisma } from '../app';

export class TransferService {
  /**
   * Solicitar transferencia de un ticket
   */
  static async requestTransfer(data: {
    ticketId: number;
    toAreaId: number;
    requestedById: number;
  }) {
    try {
      // Verificar que el ticket existe
      const ticket = await prisma.tK_tickets.findUnique({
        where: { id: data.ticketId },
        include: { 
          area: true,
          creator: true,
          assignedTo: true 
        }
      });

      if (!ticket) {
        throw new Error('Ticket no encontrado');
      }

      // Verificar que el usuario solicitante existe
      const requestedBy = await prisma.usuarios.findUnique({
        where: { 
          Id_Ejecutivo: data.requestedById,
          activo: 1 
        },
        include: { ticketData: true }
      });

      if (!requestedBy) {
        throw new Error('Usuario solicitante no encontrado o inactivo');
      }

      const requesterRole = requestedBy.ticketData?.role || 'USER';

      // Verificar permisos del solicitante
      const canTransfer = 
        data.requestedById === ticket.creatorId ||
        (requestedBy.id_area === ticket.areaId && 
         (requesterRole === 'MANAGER' || requesterRole === 'ADMIN')) ||
        requesterRole === 'SUPERADMIN';

      if (!canTransfer) {
        throw new Error('No tienes permisos para transferir este ticket');
      }

      // Verificar que el área destino existe
      const toArea = await prisma.area.findUnique({
        where: { id_area: data.toAreaId }
      });

      if (!toArea) {
        throw new Error('Área destino no encontrada');
      }

      // No permitir transferencia a la misma área
      if (ticket.areaId === data.toAreaId) {
        throw new Error('No puedes transferir el ticket a la misma área');
      }

      // Crear la solicitud de transferencia
      const transferRequest = await prisma.tK_transfer_requests.create({
        data: {
          ticketId: data.ticketId,
          fromAreaId: ticket.areaId,
          toAreaId: data.toAreaId,
          requestedById: data.requestedById,
          status: 'PENDIENTE'
        },
        include: {
          ticket: {
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
              Login: true,
              Correo: true
            }
          }
        }
      });

      // Registrar en el historial del ticket
      await prisma.tK_ticket_history.create({
        data: {
          ticketId: data.ticketId,
          action: 'SOLICITUD_TRANSFERENCIA',
          userId: data.requestedById,
          oldValue: ticket.area.nombre_area,
          newValue: toArea.nombre_area,
          details: `Solicitud de transferencia a ${toArea.nombre_area} por ${requestedBy.Nombre || requestedBy.Login}. Esperando aprobación del manager.`
        }
      });

      console.log(`🔄 Transferencia solicitada - ID: ${transferRequest.id}, Ticket: ${ticket.title}, De: ${ticket.area.nombre_area}, Para: ${toArea.nombre_area}`);

      return {
        message: 'Solicitud de transferencia creada exitosamente',
        transfer: transferRequest
      };

    } catch (error) {
      console.error('Error en servicio de solicitud de transferencia:', error);
      throw error;
    }
  }

  /**
   * Obtener transferencias pendientes
   */
  static async getPendingTransfers(userId: number, userRole: string, userAreaId: number | null) {
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
      const userArea = user.id_area;

      let whereCondition: any = { status: 'PENDIENTE' };

      // Filtrar según permisos
      if (effectiveUserRole === 'MANAGER' || effectiveUserRole === 'ADMIN') {
        // Managers y Admins ven transferencias pendientes de su área
        whereCondition.fromAreaId = userArea;
      }
      // SUPERADMIN ve todas las transferencias pendientes

      const transfers = await prisma.tK_transfer_requests.findMany({
        where: whereCondition,
        include: {
          ticket: {
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
                orderBy: { createdAt: 'asc' },
                take: 5 // Limitar comentarios para no sobrecargar
              }
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
        },
        orderBy: { createdAt: 'desc' }
      });

      // Obtener estadísticas
      const stats = await prisma.tK_transfer_requests.groupBy({
        by: ['status'],
        where: effectiveUserRole === 'SUPERADMIN' ? {} : { fromAreaId: userArea },
        _count: { id: true }
      });

      const statusCounts = stats.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>);

      return {
        transfers,
        metadata: {
          totalPending: statusCounts['PENDIENTE'] || 0,
          totalApproved: statusCounts['APROBADA'] || 0,
          totalRejected: statusCounts['RECHAZADA'] || 0,
          userRole: effectiveUserRole,
          userAreaId: userArea
        }
      };

    } catch (error) {
      console.error('Error obteniendo transferencias pendientes:', error);
      throw error;
    }
  }

  /**
   * Procesar transferencia (aprobar o rechazar)
   */
  static async processTransfer(transferId: number, action: 'approve' | 'reject', processedById: number) {
    try {
      if (!['approve', 'reject'].includes(action)) {
        throw new Error('Acción inválida. Use "approve" o "reject"');
      }

      const transfer = await prisma.tK_transfer_requests.findUnique({
        where: { id: transferId },
        include: {
          ticket: {
            include: {
              creator: true,
              assignedTo: true
            }
          },
          fromArea: true,
          toArea: true,
          requestedBy: true
        }
      });

      if (!transfer) {
        throw new Error('Solicitud de transferencia no encontrada');
      }

      // Verificar que la transferencia esté pendiente
      if (transfer.status !== 'PENDIENTE') {
        throw new Error('Esta transferencia ya fue procesada');
      }

      // Verificar permisos del usuario que procesa
      const processedByUser = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: processedById },
        include: { 
          area: true,
          ticketData: true 
        }
      });

      if (!processedByUser) {
        throw new Error('Usuario no encontrado');
      }

      const processedByRole = processedByUser.ticketData?.role || 'USER';

      const canProcess = 
        processedByRole === 'SUPERADMIN' ||
        processedByRole === 'ADMIN' ||
        (processedByRole === 'MANAGER' && processedByUser.id_area === transfer.fromAreaId);

      if (!canProcess) {
        throw new Error('No tienes permisos para procesar esta transferencia');
      }

      if (action === 'approve') {
        return await this.approveTransfer(transfer, processedById, processedByUser);
      } else {
        return await this.rejectTransfer(transfer, processedById, processedByUser);
      }

    } catch (error) {
      console.error('Error procesando transferencia:', error);
      throw error;
    }
  }

  /**
   * Aprobar transferencia
   */
  private static async approveTransfer(
    transfer: any,
    approvedById: number,
    approvedByUser: any
  ) {
    try {
      // Usar transacción para asegurar consistencia
      const result = await prisma.$transaction(async (tx) => {
        // 1. Actualizar estado de la transferencia
        const updatedTransfer = await tx.tK_transfer_requests.update({
          where: { id: transfer.id },
          data: {
            status: 'APROBADA',
            approvedById
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

        // 2. Actualizar el ticket (cambiar área y desasignar)
        const updatedTicket = await tx.tK_tickets.update({
          where: { id: transfer.ticketId },
          data: {
            areaId: transfer.toAreaId,
            assignedToId: null, // Desasignar al cambiar de área
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

        // 3. Registrar en historial del ticket
        await tx.tK_ticket_history.create({
          data: {
            ticketId: transfer.ticketId,
            action: 'TRANSFERENCIA_APROBADA',
            userId: approvedById,
            oldValue: transfer.fromArea?.nombre_area || '',
            newValue: transfer.toArea?.nombre_area || '',
            details: `Transferencia aprobada por ${approvedByUser.Nombre || approvedByUser.Login}. Ticket movido de ${transfer.fromArea?.nombre_area} a ${transfer.toArea?.nombre_area}`
          }
        });

        await tx.tK_ticket_history.create({
          data: {
            ticketId: transfer.ticketId,
            action: 'AREA_CAMBIADA',
            userId: approvedById,
            oldValue: transfer.fromArea?.nombre_area || '',
            newValue: transfer.toArea?.nombre_area || '',
            details: `Área cambiada debido a transferencia aprobada`
          }
        });

        return { transfer: updatedTransfer, ticket: updatedTicket };
      });

      console.log(`✅ Transferencia aprobada - ID: ${transfer.id}, Ticket: ${transfer.ticket.title}, Por: ${approvedByUser.Nombre}`);

      return {
        message: 'Transferencia aprobada exitosamente',
        transfer: result.transfer,
        ticket: result.ticket
      };

    } catch (error) {
      console.error('Error aprobando transferencia:', error);
      throw error;
    }
  }

  /**
   * Rechazar transferencia
   */
  private static async rejectTransfer(
    transfer: any,
    rejectedById: number,
    rejectedByUser: any
  ) {
    try {
      const updatedTransfer = await prisma.tK_transfer_requests.update({
        where: { id: transfer.id },
        data: {
          status: 'RECHAZADA',
          approvedById: rejectedById
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

      // Registrar en historial del ticket
      await prisma.tK_ticket_history.create({
        data: {
          ticketId: transfer.ticketId,
          action: 'TRANSFERENCIA_RECHAZADA',
          userId: rejectedById,
          details: `Transferencia rechazada por ${rejectedByUser.Nombre || rejectedByUser.Login}. Solicitada por ${transfer.requestedBy?.Nombre || transfer.requestedBy?.Login} para mover a ${transfer.toArea?.nombre_area}`
        }
      });

      console.log(`❌ Transferencia rechazada - ID: ${transfer.id}, Ticket: ${transfer.ticket.title}, Por: ${rejectedByUser.Nombre}`);

      return {
        message: 'Transferencia rechazada',
        transfer: updatedTransfer
      };

    } catch (error) {
      console.error('Error rechazando transferencia:', error);
      throw error;
    }
  }

  /**
   * Obtener historial de transferencias
   */
  static async getTransferHistory(userId: number, userRole: string, userAreaId: number | null, filters: {
    status?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
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
      const userArea = user.id_area;

      let whereCondition: any = {};

      // Filtrar según rol del usuario
      switch (effectiveUserRole) {
        case 'SUPERADMIN':
          // SUPERADMIN ve todo
          break;
        case 'ADMIN':
        case 'MANAGER':
          // ADMIN y MANAGER ven transferencias de su área
          whereCondition = {
            OR: [
              { fromAreaId: userArea },
              { toAreaId: userArea }
            ]
          };
          break;
        default:
          // USER solo ve transferencias que él solicitó
          whereCondition = { requestedById: userId };
      }

      // Aplicar filtros adicionales
      if (filters.status) {
        whereCondition.status = filters.status;
      }

      if (filters.fromDate || filters.toDate) {
        whereCondition.createdAt = {};
        if (filters.fromDate) {
          whereCondition.createdAt.gte = filters.fromDate;
        }
        if (filters.toDate) {
          whereCondition.createdAt.lte = filters.toDate;
        }
      }

      const transfers = await prisma.tK_transfer_requests.findMany({
        where: whereCondition,
        include: {
          ticket: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              creator: {
                select: {
                  Id_Ejecutivo: true,
                  Nombre: true,
                  Login: true
                }
              }
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
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50
      });

      // Obtener estadísticas
      const stats = await prisma.tK_transfer_requests.groupBy({
        by: ['status'],
        where: whereCondition,
        _count: { id: true }
      });

      const statusCounts = stats.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>);

      return {
        transfers,
        metadata: {
          total: transfers.length,
          pending: statusCounts['PENDIENTE'] || 0,
          approved: statusCounts['APROBADA'] || 0,
          rejected: statusCounts['RECHAZADA'] || 0,
          userRole: effectiveUserRole,
          userAreaId: userArea
        }
      };

    } catch (error) {
      console.error('Error obteniendo historial de transferencias:', error);
      throw error;
    }
  }

  /**
   * Obtener transferencia por ID
   */
  static async getTransferById(transferId: number, userId: number) {
    try {
      const transfer = await prisma.tK_transfer_requests.findUnique({
        where: { id: transferId },
        include: {
          ticket: {
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
        throw new Error('Transferencia no encontrada');
      }

      // Verificar permisos para ver esta transferencia
      const user = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId },
        include: { ticketData: true }
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      const userRole = user.ticketData?.role || 'USER';
      const canView = 
        userRole === 'SUPERADMIN' ||
        transfer.requestedById === userId ||
        (userRole === 'ADMIN' && (transfer.fromAreaId === user.id_area || transfer.toAreaId === user.id_area)) ||
        (userRole === 'MANAGER' && (transfer.fromAreaId === user.id_area || transfer.toAreaId === user.id_area));

      if (!canView) {
        throw new Error('No tienes permisos para ver esta transferencia');
      }

      return transfer;

    } catch (error) {
      console.error('Error obteniendo transferencia:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de transferencias
   */
  static async getTransferStats(areaId?: number) {
    try {
      const whereClause = areaId ? { 
        OR: [
          { fromAreaId: areaId },
          { toAreaId: areaId }
        ]
      } : {};

      const [
        totalTransfers,
        pendingTransfers,
        approvedTransfers,
        rejectedTransfers,
        transfersByMonth,
        topRequestedAreas
      ] = await Promise.all([
        // Total de transferencias
        prisma.tK_transfer_requests.count({ where: whereClause }),
        // Transferencias pendientes
        prisma.tK_transfer_requests.count({ 
          where: { ...whereClause, status: 'PENDIENTE' } 
        }),
        // Transferencias aprobadas
        prisma.tK_transfer_requests.count({ 
          where: { ...whereClause, status: 'APROBADA' } 
        }),
        // Transferencias rechazadas
        prisma.tK_transfer_requests.count({ 
          where: { ...whereClause, status: 'RECHAZADA' } 
        }),
        // Transferencias por mes (últimos 6 meses)
        this.getTransfersByMonth(whereClause),
        // Áreas más solicitadas como destino
        this.getTopRequestedAreas(whereClause)
      ]);

      return {
        total: totalTransfers,
        byStatus: {
          pendientes: pendingTransfers,
          aprobadas: approvedTransfers,
          rechazadas: rejectedTransfers
        },
        byMonth: transfersByMonth,
        topRequestedAreas,
        approvalRate: totalTransfers > 0 ? 
          parseFloat((approvedTransfers / totalTransfers * 100).toFixed(1)) : 0,
        rejectionRate: totalTransfers > 0 ? 
          parseFloat((rejectedTransfers / totalTransfers * 100).toFixed(1)) : 0
      };

    } catch (error) {
      console.error('Error obteniendo estadísticas de transferencias:', error);
      throw error;
    }
  }

  /**
   * Obtener transferencias agrupadas por mes
   */
  private static async getTransfersByMonth(whereClause: any) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const transfers = await prisma.tK_transfer_requests.findMany({
      where: {
        ...whereClause,
        createdAt: { gte: sixMonthsAgo }
      },
      select: {
        createdAt: true,
        status: true
      }
    });

    // Agrupar por mes
    const months: Record<string, { total: number, approved: number, rejected: number, pending: number }> = {};
    
    transfers.forEach(transfer => {
      const date = new Date(transfer.createdAt!);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!months[monthKey]) {
        months[monthKey] = { total: 0, approved: 0, rejected: 0, pending: 0 };
      }
      
      months[monthKey].total++;
      
      if (transfer.status === 'APROBADA') months[monthKey].approved++;
      else if (transfer.status === 'RECHAZADA') months[monthKey].rejected++;
      else if (transfer.status === 'PENDIENTE') months[monthKey].pending++;
    });

    // Convertir a array y ordenar
    return Object.entries(months)
      .map(([month, stats]) => ({ month, ...stats }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Obtener áreas más solicitadas como destino
   */
  private static async getTopRequestedAreas(whereClause: any) {
    const transfersByArea = await prisma.tK_transfer_requests.groupBy({
      by: ['toAreaId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    });

    // Obtener nombres de las áreas
    const areas = await prisma.area.findMany({
      where: {
        id_area: { in: transfersByArea.map(t => t.toAreaId) }
      },
      select: {
        id_area: true,
        nombre_area: true
      }
    });

    return transfersByArea.map(transfer => {
      const area = areas.find(a => a.id_area === transfer.toAreaId);
      return {
        areaId: transfer.toAreaId,
        areaName: area?.nombre_area || 'Área desconocida',
        count: transfer._count.id
      };
    });
  }

  /**
   * Cancelar transferencia pendiente (solo el solicitante o admin)
   */
  static async cancelTransfer(transferId: number, userId: number) {
    try {
      const transfer = await prisma.tK_transfer_requests.findUnique({
        where: { id: transferId },
        include: {
          ticket: true,
          requestedBy: true
        }
      });

      if (!transfer) {
        throw new Error('Transferencia no encontrada');
      }

      if (transfer.status !== 'PENDIENTE') {
        throw new Error('Solo se pueden cancelar transferencias pendientes');
      }

      // Verificar permisos
      const user = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId },
        include: { ticketData: true }
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      const userRole = user.ticketData?.role || 'USER';
      
      const canCancel = 
        transfer.requestedById === userId ||
        userRole === 'SUPERADMIN' ||
        userRole === 'ADMIN' ||
        (userRole === 'MANAGER' && user.id_area === transfer.fromAreaId);

      if (!canCancel) {
        throw new Error('No tienes permisos para cancelar esta transferencia');
      }

      const updatedTransfer = await prisma.tK_transfer_requests.update({
        where: { id: transferId },
        data: {
          status: 'CANCELADA',
          approvedById: userId
        },
        include: {
          ticket: {
            select: {
              id: true,
              title: true
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
        }
      });

      // Registrar en historial del ticket
      await prisma.tK_ticket_history.create({
        data: {
          ticketId: transfer.ticketId,
          action: 'TRANSFERENCIA_CANCELADA',
          userId,
          details: `Transferencia cancelada por ${user.Nombre || user.Login}`
        }
      });

      console.log(`🚫 Transferencia cancelada - ID: ${transferId}, Por: ${user.Nombre}`);

      return {
        message: 'Transferencia cancelada exitosamente',
        transfer: updatedTransfer
      };

    } catch (error) {
      console.error('Error cancelando transferencia:', error);
      throw error;
    }
  }
}