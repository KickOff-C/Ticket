// src/services/ticketService.ts
import { prisma } from '../app';
import { TicketHelpers } from '../helpers/ticketHelpers';

export class TicketService {
  // ==================== MÉTODOS DE CREACIÓN ====================

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
    entrada?: string;
    motivo?: string;
    parcelaId?: number | null;
    propietarioId?: number | null;
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

      // Validar entrada si se proporciona
      if (data.entrada && !['LLAMADA', 'VISITA', 'MONDAY', 'EMAIL'].includes(data.entrada)) {
        throw new Error('Tipo de entrada inválido');
      }

      // Validar parcela si se proporciona
      if (data.parcelaId) {
        const parcela = await prisma.sys_parcelas.findUnique({
          where: { id_parcela: data.parcelaId }
        });
        if (!parcela) {
          throw new Error('Parcela no encontrada');
        }
      }

      // Validar propietario si se proporciona
      if (data.propietarioId) {
        const propietario = await prisma.deudores.findUnique({
          where: { id: data.propietarioId }
        });
        if (!propietario) {
          throw new Error('Propietario no encontrado');
        }

        // Verificar que el propietario pertenece a la parcela seleccionada
        if (data.parcelaId && propietario.parcela) {
          const parcelaPropietario = await prisma.sys_parcelas.findUnique({
            where: { codigo_parcela: propietario.parcela }
          });
          if (parcelaPropietario?.id_parcela !== data.parcelaId) {
            console.warn('El propietario seleccionado no pertenece a la parcela indicada');
          }
        }
      }

      const ticket = await prisma.tK_tickets.create({
        data: {
          title: data.title.trim(),
          description: data.description.trim(),
          priority: data.priority || 'MEDIA',
          entrada: data.entrada,
          motivo: data.motivo,
          creatorId: data.creatorId,
          areaId: data.areaId,
          assignedToId: data.assignedToId || null,
          parcelaId: data.parcelaId || null,
          propietarioId: data.propietarioId || null,
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
          parcela: {
            select: {
              id_parcela: true,
              codigo_parcela: true,
              nombre_legal: true,
              proyecto: true
            }
          },
          propietario: {
            select: {
              id: true,
              nombre: true,
              rut: true,
              mail: true
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
          details: `Ticket "${data.title}" creado`,
          newValue: JSON.stringify({
            title: ticket.title,
            priority: ticket.priority,
            status: ticket.status,
            entrada: data.entrada || 'No especificado',
            motivo: data.motivo || 'No especificado',
            parcela: ticket.parcela?.codigo_parcela || 'No especificada',
            propietario: ticket.propietario?.nombre || 'No especificado',
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

  // ==================== MÉTODOS DE CONSULTA ====================

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

      // Definir includes base
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
        },
        // Nuevas relaciones
        parcela: {
          select: {
            id_parcela: true,
            codigo_parcela: true,
            nombre_legal: true,
            proyecto: true
          }
        },
        propietario: {
          select: {
            id: true,
            nombre: true,
            rut: true
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

      // Transformar tickets para frontend
      const ticketsTransformados = tickets.map(ticket => ({
        ...ticket,
        entradaFormatted: TicketHelpers.formatEntrada(ticket.entrada),
        motivoFormatted: TicketHelpers.formatMotivo(ticket.motivo),
        parcelaInfo: ticket.parcela ? 
          `${ticket.parcela.codigo_parcela} - ${ticket.parcela.nombre_legal}` : 
          null,
        propietarioInfo: ticket.propietario ? 
          `${ticket.propietario.nombre} (${ticket.propietario.rut})` : 
          null,
        displayInfo: {
          parcela: ticket.parcela ? 
            `${ticket.parcela.codigo_parcela} - ${ticket.parcela.nombre_legal}` : 
            'No especificada',
          propietario: ticket.propietario ? 
            `${ticket.propietario.nombre} (${ticket.propietario.rut})` : 
            'No especificado',
          proyecto: ticket.parcela?.proyecto || 'No especificado',
          entrada: TicketHelpers.formatEntrada(ticket.entrada),
          motivo: TicketHelpers.formatMotivo(ticket.motivo)
        }
      }));

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
        tickets: ticketsTransformados,
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
   * Obtener ticket por ID con todas las relaciones
   */
  static async getTicketById(ticketId: number) {
    try {
      const ticket = await prisma.tK_tickets.findUnique({
        where: { id: ticketId },
        include: {
          creator: {
            select: {
              Id_Ejecutivo: true,
              Nombre: true,
              Login: true,
              Correo: true,
              ticketData: true
            }
          },
          assignedTo: {
            select: {
              Id_Ejecutivo: true,
              Nombre: true,
              Login: true,
              Correo: true,
              ticketData: true
            }
          },
          area: {
            select: {
              id_area: true,
              nombre_area: true
            }
          },
          parcela: {
            select: {
              id_parcela: true,
              codigo_parcela: true,
              nombre_legal: true,
              proyecto: true,
              sector: true,
              rol: true,
              superficie_total: true,
              superficie_util: true
            }
          },
          propietario: {
            select: {
              id: true,
              nombre: true,
              rut: true,
              tipo_deudor: true,
              mail: true,
              fono: true
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
        }
      });

      if (!ticket) {
        return null;
      }

      // Transformar ticket para frontend
      const ticketTransformado = {
        ...ticket,
        entradaFormatted: TicketHelpers.formatEntrada(ticket.entrada),
        motivoFormatted: TicketHelpers.formatMotivo(ticket.motivo),
        displayInfo: {
          parcela: ticket.parcela ? 
            `${ticket.parcela.codigo_parcela} - ${ticket.parcela.nombre_legal}` : 
            'No especificada',
          propietario: ticket.propietario ? 
            `${ticket.propietario.nombre} (${ticket.propietario.rut})` : 
            'No especificado',
          proyecto: ticket.parcela?.proyecto || 'No especificado',
          entrada: TicketHelpers.formatEntrada(ticket.entrada),
          motivo: TicketHelpers.formatMotivo(ticket.motivo)
        }
      };

      return ticketTransformado;
    } catch (error) {
      console.error('Error obteniendo ticket por ID:', error);
      throw error;
    }
  }

  // ==================== NUEVOS MÉTODOS DE BÚSQUEDA ====================

  /**
   * Obtener parcelas para búsqueda
   */
  static async getParcelas(search?: string) {
    try {
      const whereClause: any = {
        seleccionable: 1,
        existe: 1
      };

      if (search) {
        whereClause.OR = [
          { codigo_parcela: { contains: search } },
          { nombre_legal: { contains: search } },
          { rol: { contains: search } }
        ];
      }

      const parcelas = await prisma.sys_parcelas.findMany({
        where: whereClause,
        select: {
          id_parcela: true,
          codigo_parcela: true,
          nombre_legal: true,
          proyecto: true,
          sector: true,
          rol: true,
          superficie_total: true,
          superficie_util: true,
          estado_general: true,
          propietarios: {
            where: { activo: 1 },
            select: {
              id: true,
              nombre: true,
              rut: true,
              tipo_deudor: true
            }
          }
        },
        orderBy: { codigo_parcela: 'asc' },
        take: 50
      });

      return parcelas;
    } catch (error) {
      console.error('Error obteniendo parcelas:', error);
      throw error;
    }
  }

  /**
   * Obtener propietarios de una parcela específica
   */
  static async getPropietariosByParcela(parcelaId: number) {
    try {
      const parcela = await prisma.sys_parcelas.findUnique({
        where: { id_parcela: parcelaId },
        include: {
          propietarios: {
            where: { activo: 1 },
            select: {
              id: true,
              nombre: true,
              rut: true,
              tipo_deudor: true,
              mail: true,
              fono: true
            }
          }
        }
      });

      if (!parcela) {
        throw new Error('Parcela no encontrada');
      }

      return {
        parcela: {
          id_parcela: parcela.id_parcela,
          codigo_parcela: parcela.codigo_parcela,
          nombre_legal: parcela.nombre_legal,
          proyecto: parcela.proyecto
        },
        propietarios: parcela.propietarios
      };
    } catch (error) {
      console.error('Error obteniendo propietarios por parcela:', error);
      throw error;
    }
  }

  /**
   * Buscar propietarios
   */
  static async searchPropietarios(search?: string) {
    try {
      const whereClause: any = { activo: 1 };

      if (search) {
        whereClause.OR = [
          { nombre: { contains: search } },
          { rut: { contains: search } },
          { parcela: { contains: search } }
        ];
      }

      const propietarios = await prisma.deudores.findMany({
        where: whereClause,
        select: {
          id: true,
          nombre: true,
          rut: true,
          parcela: true,
          tipo_deudor: true,
          mail: true,
          fono: true,
          parcelaRel: {
            select: {
              id_parcela: true,
              codigo_parcela: true,
              nombre_legal: true
            }
          }
        },
        orderBy: { nombre: 'asc' },
        take: 50
      });

      return propietarios;
    } catch (error) {
      console.error('Error buscando propietarios:', error);
      throw error;
    }
  }

  /**
   * Obtener opciones de entrada y motivo
   */
  static async getTicketTypes() {
    try {
      const tiposEntrada = [
        { value: 'LLAMADA', label: 'Llamada' },
        { value: 'VISITA', label: 'Visita' },
        { value: 'MONDAY', label: 'Monday' },
        { value: 'EMAIL', label: 'Email' }
      ];

      const motivosTicket = [
        { value: 'ENTREGA_FORMAL_PARCELA', label: 'Entrega Formal de Parcela' },
        { value: 'INSTALACION_EMPALMES', label: 'Instalación de Empalmes' },
        { value: 'PROYECTO_CONSTRUCCION', label: 'Proyecto de Construcción' },
        { value: 'CERTIFICADOS_VARIOS', label: 'Certificados Varios' },
        { value: 'CONSULTAS_GENERALES', label: 'Consultas Generales' },
        { value: 'SOLICITUD_REUNION', label: 'Solicitud de Reunión' },
        { value: 'SOLICITUD_CAMBIO_PARCELA', label: 'Solicitud Cambio de Parcela' },
        { value: 'SOLICITUD_DEVOLUCION', label: 'Solicitud Devolución de Dinero o Parcela' },
        { value: 'REQUERIMIENTOS_VARIOS', label: 'Requerimientos Varios' },
        { value: 'VENTAS_TERCEROS', label: 'Ventas entre Terceros' },
        { value: 'CESION_DERECHOS', label: 'Cesión de Derechos' },
        { value: 'RECLAMOS', label: 'Reclamos' },
        { value: 'ENVIO_COMUNICADO', label: 'Envío Comunicado' },
        { value: 'INFORME_FORESTAL', label: 'Informe Forestal' },
        { value: 'ESTADO_ESCRITURACION', label: 'Estado Escrituración' },
        { value: 'NO_ADHIERE_REGLAMENTO', label: 'No Adhiere al Reglamento' },
        { value: 'RECADOS', label: 'Recados' },
        { value: 'REQUERIMIENTOS_COBRANZA', label: 'Requerimientos Cobranza' },
        { value: 'SUGERENCIAS', label: 'Sugerencias' },
        { value: 'FELICITACIONES', label: 'Felicitaciones' }
      ];

      return { tiposEntrada, motivosTicket };
    } catch (error) {
      console.error('Error obteniendo tipos de ticket:', error);
      throw error;
    }
  }

  // ==================== MÉTODOS DE ACTUALIZACIÓN ====================

  /**
   * Agregar comentario a un ticket regular
   */
  static async addComment(ticketId: number, userId: number, content: string) {
    try {
      // Verificar que el ticket existe
      const ticket = await prisma.tK_tickets.findUnique({
        where: { id: ticketId },
        include: {
          parcela: true,
          propietario: true
        }
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
            parcela: {
              select: {
                id_parcela: true,
                codigo_parcela: true,
                nombre_legal: true,
                proyecto: true
              }
            },
            propietario: {
              select: {
                id: true,
                nombre: true,
                rut: true
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
              contentPreview: content.length > 50 ? content.substring(0, 50) + '...' : content,
              ticketInfo: {
                entrada: ticket.entrada ? TicketHelpers.formatEntrada(ticket.entrada) : 'No especificado',
                motivo: ticket.motivo ? TicketHelpers.formatMotivo(ticket.motivo) : 'No especificado',
                parcela: ticket.parcela?.codigo_parcela || 'No especificada',
                propietario: ticket.propietario?.nombre || 'No especificado'
              }
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
   * Cerrar un ticket
   */
  static async closeTicket(ticketId: number, userId: number) {
    try {
      const ticket = await prisma.tK_tickets.findUnique({
        where: { id: ticketId },
        include: { 
          creator: true,
          parcela: true,
          propietario: true 
        }
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
            },
            parcela: {
              select: {
                id_parcela: true,
                codigo_parcela: true,
                nombre_legal: true,
                proyecto: true
              }
            },
            propietario: {
              select: {
                id: true,
                nombre: true,
                rut: true
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
            newValue: 'CERRADO',
            newValueDetails: JSON.stringify({
              entrada: ticket.entrada ? TicketHelpers.formatEntrada(ticket.entrada) : 'No especificado',
              motivo: ticket.motivo ? TicketHelpers.formatMotivo(ticket.motivo) : 'No especificado',
              parcela: ticket.parcela?.codigo_parcela || 'No especificada',
              propietario: ticket.propietario?.nombre || 'No especificado'
            })
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
            },
            parcela: {
              select: {
                id_parcela: true,
                codigo_parcela: true,
                nombre_legal: true,
                proyecto: true
              }
            },
            propietario: {
              select: {
                id: true,
                nombre: true,
                rut: true
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
          creator: true,
          parcela: true,
          propietario: true
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
            },
            parcela: {
              select: {
                id_parcela: true,
                codigo_parcela: true,
                nombre_legal: true,
                proyecto: true
              }
            },
            propietario: {
              select: {
                id: true,
                nombre: true,
                rut: true
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
            details: `Ticket asignado a ${assignedUser.Nombre} por ${currentUser.Nombre || currentUser.Login}`,
            newValueDetails: JSON.stringify({
              ticketInfo: {
                entrada: ticket.entrada ? TicketHelpers.formatEntrada(ticket.entrada) : 'No especificado',
                motivo: ticket.motivo ? TicketHelpers.formatMotivo(ticket.motivo) : 'No especificado',
                parcela: ticket.parcela?.codigo_parcela || 'No especificada',
                propietario: ticket.propietario?.nombre || 'No especificado'
              }
            })
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

  // ==================== MÉTODOS AUXILIARES ====================

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
          areaId: true,
          entrada: true,
          motivo: true
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
              lastActivity: ticket.lastActivityAt,
              ticketInfo: {
                entrada: ticket.entrada ? TicketHelpers.formatEntrada(ticket.entrada) : 'No especificado',
                motivo: ticket.motivo ? TicketHelpers.formatMotivo(ticket.motivo) : 'No especificado'
              }
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
              lastActivity: ticket.lastActivityAt,
              ticketInfo: {
                entrada: ticket.entrada ? TicketHelpers.formatEntrada(ticket.entrada) : 'No especificado',
                motivo: ticket.motivo ? TicketHelpers.formatMotivo(ticket.motivo) : 'No especificado'
              }
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

  /**
   * Transformar ticket para frontend (método público para reutilizar)
   */
  static transformTicketForFrontend(ticket: any) {
    return {
      ...ticket,
      entradaFormatted: TicketHelpers.formatEntrada(ticket.entrada),
      motivoFormatted: TicketHelpers.formatMotivo(ticket.motivo),
      parcelaInfo: ticket.parcela ? 
        `${ticket.parcela.codigo_parcela} - ${ticket.parcela.nombre_legal}` : 
        null,
      propietarioInfo: ticket.propietario ? 
        `${ticket.propietario.nombre} (${ticket.propietario.rut})` : 
        null,
      displayInfo: {
        parcela: ticket.parcela ? 
          `${ticket.parcela.codigo_parcela} - ${ticket.parcela.nombre_legal}` : 
          'No especificada',
        propietario: ticket.propietario ? 
          `${ticket.propietario.nombre} (${ticket.propietario.rut})` : 
          'No especificado',
        proyecto: ticket.parcela?.proyecto || 'No especificado',
        entrada: TicketHelpers.formatEntrada(ticket.entrada),
        motivo: TicketHelpers.formatMotivo(ticket.motivo)
      }
    };
  }
}