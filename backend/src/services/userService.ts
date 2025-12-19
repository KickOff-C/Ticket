// src/services/userService.ts
import { prisma } from '../app';
import crypto from 'crypto';

export class UserService {
  /**
   * Obtener perfil del usuario
   */
  static async getUserProfile(userId: number) {
    try {
      const user = await prisma.usuarios.findUnique({
        where: { 
          Id_Ejecutivo: userId,
          activo: 1 
        },
        include: {
          area: {
            select: {
              id_area: true,
              nombre_area: true,
              TK_managerId: true
            }
          },
          ticketData: {
            select: {
              role: true,
              ticketsClosed: true,
              createdAt: true,
              updatedAt: true
            }
          },
          supervisorRel: {
            select: {
              Id_Ejecutivo: true,
              Nombre: true,
              Login: true,
              Correo: true
            }
          },
          subordinates: {
            where: { activo: 1 },
            select: {
              Id_Ejecutivo: true,
              Nombre: true,
              Login: true,
              Correo: true
            }
          },
          _count: {
            select: {
              createdTickets: {
                where: { status: { not: 'CERRADO' } }
              },
              assignedTickets: {
                where: { status: { not: 'CERRADO' } }
              },
              createdTicketsTI: {
                where: { status: { not: 'CERRADO' } }
              },
              assignedTicketsTI: {
                where: { status: { not: 'CERRADO' } }
              },
              comments: true
            }
          }
        }
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      return {
        id: user.Id_Ejecutivo,
        nombre: user.Nombre,
        login: user.Login,
        correo: user.Correo,
        areaId: user.id_area,
        area: user.area,
        supervisorId: user.Supervisor,
        supervisor: user.supervisorRel,
        role: user.ticketData?.role || 'USER',
        ticketsClosed: user.ticketData?.ticketsClosed || 0,
        anexo: user.Anexo,
        telefono: user.telefono,
        fecha_ingreso: user.fecha_ingreso,
        ultima_sesion: user.ultima_sesion,
        puede_agendar: user.puede_agendar,
        atiende_visitas: user.atiende_visitas,
        tiene_personal_a_cargo: user.tiene_personal_a_cargo,
        subordinados: user.subordinates,
        estadisticas: {
          ticketsCreadosActivos: user._count.createdTickets,
          ticketsAsignadosActivos: user._count.assignedTickets,
          ticketsTICreadosActivos: user._count.createdTicketsTI,
          ticketsTIAsignadosActivos: user._count.assignedTicketsTI,
          totalComentarios: user._count.comments
        }
      };

    } catch (error) {
      console.error('Error obteniendo perfil de usuario:', error);
      throw error;
    }
  }

  /**
   * Cambiar contraseña del usuario
   */
  static async changePassword(userId: number, oldPassword: string, newPassword: string) {
    try {
      const user = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId }
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      if (!user.password) {
        throw new Error('El usuario no tiene contraseña configurada');
      }

      // Verificar contraseña actual
      const oldPasswordHash = crypto.createHash('sha256').update(oldPassword).digest('hex');
      if (oldPasswordHash !== user.password) {
        throw new Error('Contraseña actual incorrecta');
      }

      // Validar nueva contraseña
      if (newPassword.length < 6) {
        throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
      }

      // Verificar que sea diferente
      const newPasswordHash = crypto.createHash('sha256').update(newPassword).digest('hex');
      if (newPasswordHash === user.password) {
        throw new Error('La nueva contraseña debe ser diferente a la actual');
      }

      await prisma.usuarios.update({
        where: { Id_Ejecutivo: userId },
        data: { 
          password: newPasswordHash,
          ultima_sesion: new Date()
        }
      });

      return {
        success: true,
        message: 'Contraseña actualizada exitosamente'
      };

    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      throw error;
    }
  }

  /**
   * Actualizar perfil del usuario
   */
  static async updateProfile(userId: number, profileData: any) {
    try {
      const user = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId }
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Validar y limpiar datos
      const allowedFields = ['telefono', 'Anexo', 'fecha_nacimiento', 'sexo'];
      const updateData: any = {};

      allowedFields.forEach(field => {
        if (profileData[field] !== undefined) {
          updateData[field] = profileData[field];
        }
      });

      if (Object.keys(updateData).length === 0) {
        throw new Error('No se proporcionaron datos válidos para actualizar');
      }

      const updatedUser = await prisma.usuarios.update({
        where: { Id_Ejecutivo: userId },
        data: updateData,
        select: {
          Id_Ejecutivo: true,
          Nombre: true,
          Login: true,
          Correo: true,
          telefono: true,
          Anexo: true,
          fecha_nacimiento: true,
          sexo: true,
          ultima_sesion: true
        }
      });

      return {
        success: true,
        message: 'Perfil actualizado exitosamente',
        user: updatedUser
      };

    } catch (error) {
      console.error('Error actualizando perfil:', error);
      throw error;
    }
  }

  /**
   * Obtener usuarios del área del usuario actual
   */
  static async getAreaUsers(userId: number, userAreaId: number | null, userRole: string | null) {
    try {
      // Obtener usuario actual con datos de tickets
      const currentUser = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId },
        include: { 
          area: true,
          ticketData: true 
        }
      });

      if (!currentUser) {
        throw new Error('Usuario no encontrado');
      }

      const effectiveUserRole = currentUser.ticketData?.role || userRole || 'USER';

      // Para SUPERADMIN, obtener usuarios de todas las áreas de TI
      let areaIdToUse = userAreaId;

      if (effectiveUserRole === 'SUPERADMIN' && !userAreaId) {
        const tiArea = await prisma.area.findFirst({
          where: { nombre_area: 'TI' }
        });
        areaIdToUse = tiArea?.id_area;
      }

      if (!areaIdToUse && effectiveUserRole !== 'SUPERADMIN') {
        throw new Error('No se pudo determinar el área del usuario');
      }

      // Construir where clause
      let whereClause: any = {
        activo: 1,
        Id_Ejecutivo: { not: userId }
      };

      if (effectiveUserRole !== 'SUPERADMIN') {
        whereClause.id_area = areaIdToUse;
      } else {
        whereClause.OR = [
          { area: { nombre_area: 'TI' } },
          { ticketData: { role: 'SUPERADMIN' } }
        ];
      }

      const users = await prisma.usuarios.findMany({
        where: whereClause,
        select: {
          Id_Ejecutivo: true,
          Nombre: true,
          Correo: true,
          Login: true,
          activo: true,
          fecha_ingreso: true,
          id_area: true,
          Supervisor: true,
          area: {
            select: {
              id_area: true,
              nombre_area: true
            }
          },
          ticketData: {
            select: {
              role: true,
              ticketsClosed: true
            }
          },
          supervisorRel: {
            select: {
              Id_Ejecutivo: true,
              Nombre: true,
              Login: true
            }
          },
          _count: {
            select: {
              createdTickets: {
                where: { status: { not: 'CERRADO' } }
              },
              assignedTickets: {
                where: { status: { not: 'CERRADO' } }
              }
            }
          }
        },
        orderBy: { Nombre: 'asc' }
      });

      // Formatear respuesta
      return users.map(user => ({
        id: user.Id_Ejecutivo,
        nombre: user.Nombre,
        correo: user.Correo,
        login: user.Login,
        activo: user.activo,
        fecha_ingreso: user.fecha_ingreso,
        areaId: user.id_area,
        area: user.area,
        supervisorId: user.Supervisor,
        supervisor: user.supervisorRel,
        role: user.ticketData?.role || 'USER',
        ticketsClosed: user.ticketData?.ticketsClosed || 0,
        estadisticas: {
          ticketsCreadosActivos: user._count.createdTickets,
          ticketsAsignadosActivos: user._count.assignedTickets
        }
      }));

    } catch (error) {
      console.error('Error obteniendo usuarios del área:', error);
      throw error;
    }
  }

  /**
   * Obtener usuarios por área específica
   */
  static async getUsersByArea(areaId: number, userId: number) {
    try {
      // Obtener usuario actual
      const currentUser = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId },
        include: { 
          area: true,
          ticketData: true 
        }
      });

      if (!currentUser) {
        throw new Error('Usuario no encontrado');
      }

      const effectiveUserRole = currentUser.ticketData?.role || 'USER';
      const userAreaId = currentUser.id_area;

      // Verificar permisos
      const canViewUsers = 
        effectiveUserRole === 'SUPERADMIN' ||
        effectiveUserRole === 'ADMIN' || 
        effectiveUserRole === 'MANAGER' ||
        (effectiveUserRole === 'USER' && userAreaId === areaId);

      if (!canViewUsers) {
        throw new Error('No tienes permisos para ver usuarios de esta área');
      }

      const users = await prisma.usuarios.findMany({
        where: {
          id_area: areaId,
          activo: 1
        },
        select: {
          Id_Ejecutivo: true,
          Nombre: true,
          Correo: true,
          Login: true,
          activo: true,
          fecha_ingreso: true,
          Supervisor: true,
          telefono: true,
          area: {
            select: {
              id_area: true,
              nombre_area: true
            }
          },
          ticketData: {
            select: {
              role: true,
              ticketsClosed: true
            }
          },
          supervisorRel: {
            select: {
              Id_Ejecutivo: true,
              Nombre: true,
              Login: true
            }
          },
          _count: {
            select: {
              createdTickets: {
                where: { status: { not: 'CERRADO' } }
              },
              assignedTickets: {
                where: { status: { not: 'CERRADO' } }
              }
            }
          }
        },
        orderBy: { Nombre: 'asc' }
      });

      // Formatear respuesta
      return users.map(user => ({
        id: user.Id_Ejecutivo,
        nombre: user.Nombre,
        correo: user.Correo,
        login: user.Login,
        activo: user.activo,
        fecha_ingreso: user.fecha_ingreso,
        supervisorId: user.Supervisor,
        supervisor: user.supervisorRel,
        telefono: user.telefono,
        area: user.area,
        role: user.ticketData?.role || 'USER',
        ticketsClosed: user.ticketData?.ticketsClosed || 0,
        estadisticas: {
          ticketsCreadosActivos: user._count.createdTickets,
          ticketsAsignadosActivos: user._count.assignedTickets
        }
      }));

    } catch (error) {
      console.error('Error obteniendo usuarios por área:', error);
      throw error;
    }
  }

  /**
   * Obtener todos los usuarios (solo superadmin)
   */
  static async getAllUsers(userId: number) {
    try {
      // Verificar que el usuario sea SUPERADMIN
      const currentUser = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId },
        include: { ticketData: true }
      });

      if (!currentUser) {
        throw new Error('Usuario no encontrado');
      }

      const effectiveUserRole = currentUser.ticketData?.role || 'USER';

      if (effectiveUserRole !== 'SUPERADMIN') {
        throw new Error('No tienes permisos para ver todos los usuarios');
      }

      const users = await prisma.usuarios.findMany({
        where: {
          activo: 1
        },
        select: {
          Id_Ejecutivo: true,
          Nombre: true,
          Correo: true,
          Login: true,
          activo: true,
          fecha_ingreso: true,
          ultima_sesion: true,
          id_area: true,
          Supervisor: true,
          telefono: true,
          puede_agendar: true,
          atiende_visitas: true,
          tiene_personal_a_cargo: true,
          area: {
            select: {
              id_area: true,
              nombre_area: true
            }
          },
          ticketData: {
            select: {
              role: true,
              ticketsClosed: true,
              createdAt: true,
              updatedAt: true
            }
          },
          supervisorRel: {
            select: {
              Id_Ejecutivo: true,
              Nombre: true,
              Login: true
            }
          },
          _count: {
            select: {
              createdTickets: true,
              assignedTickets: true,
              createdTicketsTI: true,
              assignedTicketsTI: true,
              comments: true,
              subordinates: {
                where: { activo: 1 }
              }
            }
          }
        },
        orderBy: { Nombre: 'asc' }
      });

      // Formatear respuesta
      return users.map(user => ({
        id: user.Id_Ejecutivo,
        nombre: user.Nombre,
        correo: user.Correo,
        login: user.Login,
        activo: user.activo,
        fecha_ingreso: user.fecha_ingreso,
        ultima_sesion: user.ultima_sesion,
        areaId: user.id_area,
        area: user.area,
        supervisorId: user.Supervisor,
        supervisor: user.supervisorRel,
        telefono: user.telefono,
        puede_agendar: user.puede_agendar,
        atiende_visitas: user.atiende_visitas,
        tiene_personal_a_cargo: user.tiene_personal_a_cargo,
        role: user.ticketData?.role || 'USER',
        ticketsClosed: user.ticketData?.ticketsClosed || 0,
        estadisticas: {
          ticketsCreados: user._count.createdTickets,
          ticketsAsignados: user._count.assignedTickets,
          ticketsTICreados: user._count.createdTicketsTI,
          ticketsTIAsignados: user._count.assignedTicketsTI,
          comentarios: user._count.comments,
          subordinados: user._count.subordinates
        }
      }));

    } catch (error) {
      console.error('Error obteniendo todos los usuarios:', error);
      throw error;
    }
  }

  /**
   * Obtener usuarios para asignación de tickets TI
   */
  static async getUsersForTIAssignment(userId: number) {
    try {
      const currentUser = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId },
        include: { 
          area: true,
          ticketData: true 
        }
      });

      if (!currentUser) {
        throw new Error('Usuario no encontrado');
      }

      const effectiveUserRole = currentUser.ticketData?.role || 'USER';
      const isTIUser = currentUser.area?.nombre_area === 'TI';
      const canAssignTI = effectiveUserRole === 'SUPERADMIN' || isTIUser;

      if (!canAssignTI) {
        throw new Error('No tienes permisos para asignar tickets TI');
      }

      const users = await prisma.usuarios.findMany({
        where: {
          activo: 1,
          OR: [
            { area: { nombre_area: 'TI' } },
            { ticketData: { role: 'SUPERADMIN' } }
          ]
        },
        select: {
          Id_Ejecutivo: true,
          Nombre: true,
          Correo: true,
          Login: true,
          activo: true,
          area: {
            select: {
              id_area: true,
              nombre_area: true
            }
          },
          ticketData: {
            select: {
              role: true,
              ticketsClosed: true
            }
          },
          _count: {
            select: {
              assignedTicketsTI: {
                where: { status: { not: 'CERRADO' } }
              },
              comments: {
                where: {
                  ticketTIId: { not: null }
                }
              }
            }
          }
        },
        orderBy: { Nombre: 'asc' }
      });

      // Formatear respuesta
      return users.map(user => ({
        id: user.Id_Ejecutivo,
        nombre: user.Nombre,
        correo: user.Correo,
        login: user.Login,
        activo: user.activo,
        area: user.area,
        role: user.ticketData?.role || 'USER',
        ticketsClosed: user.ticketData?.ticketsClosed || 0,
        estadisticasTI: {
          ticketsTIAsignadosActivos: user._count.assignedTicketsTI,
          comentariosTI: user._count.comments
        }
      }));

    } catch (error) {
      console.error('Error obteniendo usuarios para asignación TI:', error);
      throw error;
    }
  }

  /**
   * Obtener usuario por ID
   */
  static async getUserById(targetUserId: number, currentUserId: number) {
    try {
      // Obtener usuario actual
      const currentUser = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: currentUserId },
        include: { ticketData: true }
      });

      if (!currentUser) {
        throw new Error('Usuario actual no encontrado');
      }

      const effectiveUserRole = currentUser.ticketData?.role || 'USER';

      // Verificar permisos
      const canViewUser = 
        effectiveUserRole === 'SUPERADMIN' ||
        targetUserId === currentUserId ||
        (effectiveUserRole === 'ADMIN' && currentUser.id_area) ||
        (effectiveUserRole === 'MANAGER' && currentUser.id_area);

      if (!canViewUser) {
        throw new Error('No tienes permisos para ver este usuario');
      }

      const user = await prisma.usuarios.findUnique({
        where: { 
          Id_Ejecutivo: targetUserId,
          activo: 1 
        },
        select: {
          Id_Ejecutivo: true,
          Nombre: true,
          Correo: true,
          Login: true,
          activo: true,
          fecha_ingreso: true,
          ultima_sesion: true,
          id_area: true,
          Supervisor: true,
          telefono: true,
          Anexo: true,
          puede_agendar: true,
          atiende_visitas: true,
          tiene_personal_a_cargo: true,
          area: {
            select: {
              id_area: true,
              nombre_area: true
            }
          },
          ticketData: {
            select: {
              role: true,
              ticketsClosed: true,
              createdAt: true,
              updatedAt: true
            }
          },
          supervisorRel: {
            select: {
              Id_Ejecutivo: true,
              Nombre: true,
              Login: true,
              Correo: true
            }
          },
          subordinates: {
            where: { activo: 1 },
            select: {
              Id_Ejecutivo: true,
              Nombre: true,
              Login: true,
              Correo: true
            }
          },
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
        throw new Error('Usuario no encontrado');
      }

      // Formatear respuesta
      return {
        id: user.Id_Ejecutivo,
        nombre: user.Nombre,
        correo: user.Correo,
        login: user.Login,
        activo: user.activo,
        fecha_ingreso: user.fecha_ingreso,
        ultima_sesion: user.ultima_sesion,
        areaId: user.id_area,
        area: user.area,
        supervisorId: user.Supervisor,
        supervisor: user.supervisorRel,
        telefono: user.telefono,
        anexo: user.Anexo,
        puede_agendar: user.puede_agendar,
        atiende_visitas: user.atiende_visitas,
        tiene_personal_a_cargo: user.tiene_personal_a_cargo,
        role: user.ticketData?.role || 'USER',
        ticketsClosed: user.ticketData?.ticketsClosed || 0,
        subordinados: user.subordinates,
        estadisticas: {
          ticketsCreados: user._count.createdTickets,
          ticketsAsignados: user._count.assignedTickets,
          ticketsTICreados: user._count.createdTicketsTI,
          ticketsTIAsignados: user._count.assignedTicketsTI,
          comentarios: user._count.comments
        }
      };

    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      throw error;
    }
  }

  /**
   * Obtener usuarios por rol
   */
  static async getUsersByRole(role: string, currentUserId: number) {
    try {
      // Verificar que el usuario sea SUPERADMIN
      const currentUser = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: currentUserId },
        include: { ticketData: true }
      });

      if (!currentUser) {
        throw new Error('Usuario no encontrado');
      }

      const effectiveUserRole = currentUser.ticketData?.role || 'USER';

      if (effectiveUserRole !== 'SUPERADMIN') {
        throw new Error('No tienes permisos para filtrar usuarios por rol');
      }

      const users = await prisma.usuarios.findMany({
        where: {
          activo: 1,
          ticketData: {
            role: role
          }
        },
        select: {
          Id_Ejecutivo: true,
          Nombre: true,
          Correo: true,
          Login: true,
          activo: true,
          area: {
            select: {
              id_area: true,
              nombre_area: true
            }
          },
          ticketData: {
            select: {
              role: true,
              ticketsClosed: true
            }
          }
        },
        orderBy: { Nombre: 'asc' }
      });

      // Formatear respuesta
      return users.map(user => ({
        id: user.Id_Ejecutivo,
        nombre: user.Nombre,
        correo: user.Correo,
        login: user.Login,
        activo: user.activo,
        area: user.area,
        role: user.ticketData?.role,
        ticketsClosed: user.ticketData?.ticketsClosed || 0
      }));

    } catch (error) {
      console.error('Error obteniendo usuarios por rol:', error);
      throw error;
    }
  }

  /**
   * Crear nuevo usuario
   */
  static async createUser(userData: any, createdById: number) {
    try {
      // Validar datos requeridos
      if (!userData.Nombre || !userData.Login) {
        throw new Error('Nombre y Login son requeridos');
      }

      // Verificar que el Login no exista
      const existingUser = await prisma.usuarios.findUnique({
        where: { Login: userData.Login }
      });

      if (existingUser) {
        throw new Error('El Login ya está en uso');
      }

      // Si se proporciona Correo, verificar que no exista
      if (userData.Correo) {
        const existingEmail = await prisma.usuarios.findFirst({
          where: { Correo: userData.Correo }
        });

        if (existingEmail) {
          throw new Error('El Correo ya está en uso');
        }
      }

      // Si se proporciona contraseña, hashearla
      if (userData.password) {
        userData.password = crypto.createHash('sha256').update(userData.password).digest('hex');
      }

      // Crear usuario
      const newUser = await prisma.usuarios.create({
        data: {
          Nombre: userData.Nombre,
          Login: userData.Login,
          Correo: userData.Correo || null,
          password: userData.password || null,
          activo: userData.activo !== undefined ? userData.activo : 1,
          id_area: userData.areaId || null,
          Supervisor: userData.Supervisor || null,
          telefono: userData.telefono || null,
          Anexo: userData.Anexo || null,
          fecha_ingreso: userData.fecha_ingreso || new Date(),
          puede_agendar: userData.puede_agendar || 0,
          atiende_visitas: userData.atiende_visitas || 0,
          tiene_personal_a_cargo: userData.tiene_personal_a_cargo || 0
        },
        select: {
          Id_Ejecutivo: true,
          Nombre: true,
          Login: true,
          Correo: true,
          activo: true,
          fecha_ingreso: true
        }
      });

      // Crear datos de tickets con rol por defecto
      await prisma.tK_user_ticket_data.create({
        data: {
          userId: newUser.Id_Ejecutivo,
          role: userData.role || 'USER',
          ticketsClosed: 0
        }
      });

      return {
        success: true,
        message: 'Usuario creado exitosamente',
        user: newUser
      };

    } catch (error) {
      console.error('Error creando usuario:', error);
      throw error;
    }
  }

  /**
   * Actualizar usuario
   */
  static async updateUser(userId: number, userData: any, updatedById: number) {
    try {
      // Verificar que el usuario existe
      const user = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId }
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Validar y preparar datos de actualización
      const updateData: any = {};

      const allowedFields = [
        'Nombre', 'Correo', 'telefono', 'Anexo', 'id_area', 'Supervisor',
        'puede_agendar', 'atiende_visitas', 'tiene_personal_a_cargo'
      ];

      allowedFields.forEach(field => {
        if (userData[field] !== undefined) {
          updateData[field] = userData[field];
        }
      });

      // Si se cambia el Login, verificar que no exista
      if (userData.Login && userData.Login !== user.Login) {
        const existingLogin = await prisma.usuarios.findUnique({
          where: { Login: userData.Login }
        });

        if (existingLogin) {
          throw new Error('El Login ya está en uso');
        }
        updateData.Login = userData.Login;
      }

      // Si se cambia el Correo, verificar que no exista
      if (userData.Correo && userData.Correo !== user.Correo) {
        const existingEmail = await prisma.usuarios.findFirst({
          where: { Correo: userData.Correo }
        });

        if (existingEmail) {
          throw new Error('El Correo ya está en uso');
        }
        updateData.Correo = userData.Correo;
      }

      // Actualizar usuario
      const updatedUser = await prisma.usuarios.update({
        where: { Id_Ejecutivo: userId },
        data: updateData,
        select: {
          Id_Ejecutivo: true,
          Nombre: true,
          Login: true,
          Correo: true,
          activo: true,
          fecha_ingreso: true,
          id_area: true,
          Supervisor: true,
          telefono: true,
          Anexo: true
        }
      });

      // Si se especifica rol, actualizar en TK_user_ticket_data
      if (userData.role) {
        await prisma.tK_user_ticket_data.upsert({
          where: { userId },
          update: { role: userData.role },
          create: {
            userId,
            role: userData.role,
            ticketsClosed: 0
          }
        });
      }

      return {
        success: true,
        message: 'Usuario actualizado exitosamente',
        user: updatedUser
      };

    } catch (error) {
      console.error('Error actualizando usuario:', error);
      throw error;
    }
  }

  /**
   * Activar/desactivar usuario
   */
  static async toggleUserStatus(userId: number, active: boolean, updatedById: number) {
    try {
      const user = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId }
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // No permitir desactivarse a sí mismo
      if (userId === updatedById) {
        throw new Error('No puedes desactivar tu propia cuenta');
      }

      await prisma.usuarios.update({
        where: { Id_Ejecutivo: userId },
        data: { activo: active ? 1 : 0 }
      });

      return {
        success: true,
        message: `Usuario ${active ? 'activado' : 'desactivado'} exitosamente`
      };

    } catch (error) {
      console.error('Error cambiando estado de usuario:', error);
      throw error;
    }
  }

  /**
   * Actualizar rol de usuario
   */
  static async updateUserRole(userId: number, role: string, updatedById: number) {
    try {
      const user = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId }
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Validar rol
      const validRoles = ['USER', 'MANAGER', 'ADMIN', 'SUPERADMIN'];
      if (!validRoles.includes(role)) {
        throw new Error('Rol inválido');
      }

      // No permitir cambiar rol de sí mismo
      if (userId === updatedById) {
        throw new Error('No puedes cambiar tu propio rol');
      }

      await prisma.tK_user_ticket_data.upsert({
        where: { userId },
        update: { role },
        create: {
          userId,
          role,
          ticketsClosed: 0
        }
      });

      return {
        success: true,
        message: `Rol actualizado a ${role} exitosamente`
      };

    } catch (error) {
      console.error('Error actualizando rol de usuario:', error);
      throw error;
    }
  }

  /**
   * Restablecer contraseña de usuario
   */
  static async resetUserPassword(userId: number, newPassword: string, resetById: number) {
    try {
      const user = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId }
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Validar nueva contraseña
      if (newPassword.length < 6) {
        throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
      }

      // Hashear nueva contraseña
      const newPasswordHash = crypto.createHash('sha256').update(newPassword).digest('hex');
      
      await prisma.usuarios.update({
        where: { Id_Ejecutivo: userId },
        data: { 
          password: newPasswordHash,
          ultima_sesion: new Date()
        }
      });

      // Registrar quién restableció la contraseña
      const resetByUser = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: resetById }
      });

      console.log(`Contraseña restablecida para usuario: ${user.Login} (ID: ${userId}) por: ${resetByUser?.Nombre || resetById}`);

      return {
        success: true,
        message: 'Contraseña restablecida exitosamente'
      };

    } catch (error) {
      console.error('Error restableciendo contraseña:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de usuarios
   */
  static async getUserStats(currentUserId: number) {
    try {
      // Verificar permisos
      const currentUser = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: currentUserId },
        include: { ticketData: true }
      });

      if (!currentUser) {
        throw new Error('Usuario no encontrado');
      }

      const effectiveUserRole = currentUser.ticketData?.role || 'USER';

      if (!['ADMIN', 'SUPERADMIN'].includes(effectiveUserRole)) {
        throw new Error('No tienes permisos para ver estadísticas');
      }

      const [
        totalUsers,
        activeUsers,
        usersByArea,
        usersByRole,
        newUsersThisMonth,
        avgTicketsPerUser
      ] = await Promise.all([
        // Total de usuarios
        prisma.usuarios.count(),
        // Usuarios activos
        prisma.usuarios.count({
          where: { activo: 1 }
        }),
        // Usuarios por área
        prisma.usuarios.groupBy({
          by: ['id_area'],
          where: { activo: 1 },
          _count: { Id_Ejecutivo: true }
        }),
        // Usuarios por rol
        prisma.tK_user_ticket_data.groupBy({
          by: ['role'],
          _count: { userId: true }
        }),
        // Nuevos usuarios este mes
        prisma.usuarios.count({
          where: {
            fecha_ingreso: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        }),
        // Promedio de tickets por usuario
        this.calculateAvgTicketsPerUser()
      ]);

      // Obtener nombres de áreas
      const areaIds = usersByArea.map(u => u.id_area).filter(id => id !== null) as number[];
      const areas = await prisma.area.findMany({
        where: { id_area: { in: areaIds } },
        select: { id_area: true, nombre_area: true }
      });

      const usersByAreaFormatted = usersByArea.map(item => {
        const area = areas.find(a => a.id_area === item.id_area);
        return {
          areaId: item.id_area,
          areaName: area?.nombre_area || 'Sin área',
          count: item._count.Id_Ejecutivo
        };
      });

      const usersByRoleFormatted = usersByRole.map(item => ({
        role: item.role,
        count: item._count.userId
      }));

      return {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        activationRate: totalUsers > 0 ? parseFloat((activeUsers / totalUsers * 100).toFixed(1)) : 0,
        byArea: usersByAreaFormatted,
        byRole: usersByRoleFormatted,
        newUsersThisMonth,
        avgTicketsPerUser
      };

    } catch (error) {
      console.error('Error obteniendo estadísticas de usuarios:', error);
      throw error;
    }
  }

  /**
   * Calcular promedio de tickets por usuario
   */
  private static async calculateAvgTicketsPerUser() {
    const [
      totalUsers,
      totalTickets,
      totalTicketsTI
    ] = await Promise.all([
      prisma.usuarios.count({ where: { activo: 1 } }),
      prisma.tK_tickets.count(),
      prisma.tK_tickets_ti.count()
    ]);

    const totalTicketsAll = totalTickets + totalTicketsTI;
    return totalUsers > 0 ? parseFloat((totalTicketsAll / totalUsers).toFixed(1)) : 0;
  }

  /**
   * Obtener actividad de usuarios
   */
  static async getUserActivity(currentUserId: number, days: number = 30) {
    try {
      // Verificar que sea SUPERADMIN
      const currentUser = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: currentUserId },
        include: { ticketData: true }
      });

      if (!currentUser) {
        throw new Error('Usuario no encontrado');
      }

      const effectiveUserRole = currentUser.ticketData?.role || 'USER';

      if (effectiveUserRole !== 'SUPERADMIN') {
        throw new Error('No tienes permisos para ver actividad de usuarios');
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [
        recentLogins,
        ticketActivity,
        commentActivity
      ] = await Promise.all([
        // Usuarios que han iniciado sesión recientemente
        prisma.usuarios.findMany({
          where: {
            ultima_sesion: { gte: startDate },
            activo: 1
          },
          select: {
            Id_Ejecutivo: true,
            Nombre: true,
            Login: true,
            ultima_sesion: true,
            area: {
              select: {
                nombre_area: true
              }
            }
          },
          orderBy: { ultima_sesion: 'desc' },
          take: 20
        }),
        // Actividad de tickets (creados)
        prisma.tK_tickets.groupBy({
          by: ['creatorId'],
          where: {
            createdAt: { gte: startDate }
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10
        }),
        // Actividad de comentarios
        prisma.tK_comments.groupBy({
          by: ['userId'],
          where: {
            createdAt: { gte: startDate }
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10
        })
      ]);

      // Obtener información de usuarios para las actividades
      const userIds = [
        ...ticketActivity.map(t => t.creatorId),
        ...commentActivity.map(c => c.userId)
      ].filter((v, i, a) => a.indexOf(v) === i);

      const activeUsers = await prisma.usuarios.findMany({
        where: { Id_Ejecutivo: { in: userIds } },
        select: {
          Id_Ejecutivo: true,
          Nombre: true,
          Login: true,
          area: {
            select: {
              nombre_area: true
            }
          }
        }
      });

      const ticketActivityFormatted = ticketActivity.map(item => {
        const user = activeUsers.find(u => u.Id_Ejecutivo === item.creatorId);
        return {
          userId: item.creatorId,
          userName: user?.Nombre || 'Usuario desconocido',
          userLogin: user?.Login || '',
          userArea: user?.area?.nombre_area || 'Sin área',
          ticketsCreated: item._count.id
        };
      });

      const commentActivityFormatted = commentActivity.map(item => {
        const user = activeUsers.find(u => u.Id_Ejecutivo === item.userId);
        return {
          userId: item.userId,
          userName: user?.Nombre || 'Usuario desconocido',
          userLogin: user?.Login || '',
          userArea: user?.area?.nombre_area || 'Sin área',
          commentsCount: item._count.id
        };
      });

      return {
        recentLogins: recentLogins.map(user => ({
          id: user.Id_Ejecutivo,
          nombre: user.Nombre,
          login: user.Login,
          ultima_sesion: user.ultima_sesion,
          area: user.area?.nombre_area || 'Sin área'
        })),
        topTicketCreators: ticketActivityFormatted,
        topCommenters: commentActivityFormatted,
        period: `${days} días`
      };

    } catch (error) {
      console.error('Error obteniendo actividad de usuarios:', error);
      throw error;
    }
  }

  /**
   * Obtener usuarios de mi área (para managers)
   */
  static async getMyAreaUsers(managerId: number) {
    try {
      const manager = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: managerId },
        include: { 
          area: true,
          ticketData: true 
        }
      });

      if (!manager || !manager.area) {
        throw new Error('Manager o área no encontrada');
      }

      // Verificar que el usuario sea manager del área
      if (manager.area.TK_managerId !== managerId) {
        throw new Error('No eres el manager de esta área');
      }

      const users = await prisma.usuarios.findMany({
        where: {
          id_area: manager.area.id_area,
          activo: 1,
          Id_Ejecutivo: { not: managerId } // Excluir al manager
        },
        select: {
          Id_Ejecutivo: true,
          Nombre: true,
          Correo: true,
          Login: true,
          activo: true,
          fecha_ingreso: true,
          Supervisor: true,
          telefono: true,
          area: {
            select: {
              id_area: true,
              nombre_area: true
            }
          },
          ticketData: {
            select: {
              role: true,
              ticketsClosed: true
            }
          },
          supervisorRel: {
            select: {
              Id_Ejecutivo: true,
              Nombre: true,
              Login: true
            }
          },
          _count: {
            select: {
              assignedTickets: {
                where: { status: { in: ['ABIERTO', 'EN_PROGRESO'] } }
              }
            }
          }
        },
        orderBy: { Nombre: 'asc' }
      });

      // Formatear respuesta
      const formattedUsers = users.map(user => ({
        id: user.Id_Ejecutivo,
        nombre: user.Nombre,
        correo: user.Correo,
        login: user.Login,
        activo: user.activo,
        fecha_ingreso: user.fecha_ingreso,
        supervisorId: user.Supervisor,
        supervisor: user.supervisorRel,
        telefono: user.telefono,
        area: user.area,
        role: user.ticketData?.role || 'USER',
        ticketsClosed: user.ticketData?.ticketsClosed || 0,
        ticketsActivosAsignados: user._count.assignedTickets
      }));

      return {
        area: {
          id: manager.area.id_area,
          nombre: manager.area.nombre_area,
          managerId: manager.area.TK_managerId
        },
        users: formattedUsers,
        total: formattedUsers.length
      };

    } catch (error) {
      console.error('Error obteniendo usuarios de mi área:', error);
      throw error;
    }
  }
}