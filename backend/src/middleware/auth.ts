// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../app';

export interface AuthRequest extends Request {
  user?: {
    Id_Ejecutivo: number;
    Login: string | null;
    Nombre: string | null;
    role: string;              // Role de TK_user_ticket_data
    areaId: number | null;
    areaNombre?: string | null;
    email?: string | null;     // Agregado: Correo del usuario
    // Campos adicionales útiles para logs y auditoría
    userData?: {
      Correo: string | null;
      telefono: number | null;
      Supervisor: number | null;
      fecha_ingreso: Date | null;
    };
  };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Token de acceso requerido',
        message: 'No se proporcionó token de autenticación'
      });
    }

    // Verificar y decodificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;
    
    // Validar estructura básica del token
    if (!decoded.Id_Ejecutivo || !decoded.role) {
      return res.status(403).json({ 
        error: 'Token inválido',
        message: 'Token no contiene la información requerida'
      });
    }

    // Obtener datos actualizados del usuario desde la BD
    const user = await prisma.usuarios.findUnique({
      where: { 
        Id_Ejecutivo: decoded.Id_Ejecutivo
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
            Login: true
          }
        }
      }
    });

    // Verificar que el usuario existe
    if (!user) {
      return res.status(401).json({ 
        error: 'Usuario no encontrado',
        message: 'El usuario asociado al token no existe'
      });
    }

    // Verificar que el usuario está activo (activo = 1)
    if (user.activo !== 1) {
      return res.status(401).json({ 
        error: 'Usuario inactivo',
        message: 'Tu cuenta está desactivada. Contacta al administrador.'
      });
    }

    // Obtener role de TK_user_ticket_data (o default 'USER')
    const userRole = user.ticketData?.role || 'USER';

    // Actualizar última sesión del usuario (de manera asíncrona, no bloqueante)
    updateLastSession(user.Id_Ejecutivo).catch(error => {
      console.error('Error actualizando última sesión:', error);
    });

    req.user = {
      Id_Ejecutivo: user.Id_Ejecutivo,
      Login: user.Login,
      Nombre: user.Nombre,
      role: userRole,
      areaId: user.id_area,
      areaNombre: user.area?.nombre_area,
      email: user.Correo,
      userData: {
        Correo: user.Correo,
        telefono: user.telefono,
        Supervisor: user.Supervisor,
        fecha_ingreso: user.fecha_ingreso
      }
    };

    // Agregar información de usuario a los logs de la petición
    req.userInfo = {
      userId: user.Id_Ejecutivo,
      userName: user.Nombre || user.Login || 'Sin nombre',
      userRole: userRole,
      userArea: user.area?.nombre_area || 'Sin área'
    };

    console.log('🔐 Auth - Usuario autenticado:', {
      Id_Ejecutivo: user.Id_Ejecutivo,
      Login: user.Login,
      Nombre: user.Nombre,
      role: userRole,
      areaId: user.id_area,
      areaNombre: user.area?.nombre_area,
      timestamp: new Date().toISOString(),
      endpoint: req.originalUrl,
      method: req.method
    });

    next();
  } catch (error) {
    console.error('❌ Error de autenticación:', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString(),
      endpoint: req.originalUrl,
      method: req.method
    });
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(403).json({ 
        error: 'Token expirado',
        message: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
      });
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({ 
        error: 'Token inválido',
        message: 'El token de autenticación es inválido.'
      });
    }
    
    return res.status(403).json({ 
      error: 'Error de autenticación',
      message: 'No se pudo verificar tu identidad.'
    });
  }
};

// Función auxiliar para actualizar última sesión
async function updateLastSession(userId: number): Promise<void> {
  try {
    await prisma.usuarios.update({
      where: { Id_Ejecutivo: userId },
      data: { ultima_sesion: new Date() }
    });
  } catch (error) {
    // No lanzar error, solo loggear
    console.error(`Error actualizando última sesión para usuario ${userId}:`, error);
  }
}

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'No autenticado',
        message: 'Se requiere autenticación para acceder a este recurso'
      });
    }

    // Verificar si el usuario tiene uno de los roles requeridos
    if (!roles.includes(req.user.role)) {
      console.warn('❌ Acceso denegado por rol insuficiente:', {
        userId: req.user.Id_Ejecutivo,
        userRole: req.user.role,
        requiredRoles: roles,
        endpoint: req.originalUrl,
        method: req.method
      });

      return res.status(403).json({ 
        error: 'Permisos insuficientes',
        message: 'No tienes los permisos necesarios para realizar esta acción',
        requiredRoles: roles,
        userRole: req.user.role
      });
    }

    console.log('✅ Permisos de rol verificados:', {
      userId: req.user.Id_Ejecutivo,
      userRole: req.user.role,
      requiredRoles: roles,
      endpoint: req.originalUrl
    });

    next();
  };
};

// Middleware específico para cada tipo de usuario
export const requireAdmin = requireRole(['ADMIN', 'SUPERADMIN']);
export const requireSuperAdmin = requireRole(['SUPERADMIN']);
export const requireManager = requireRole(['MANAGER', 'ADMIN', 'SUPERADMIN']);
export const requireSupervisor = requireRole(['SUPERVISOR', 'MANAGER', 'ADMIN', 'SUPERADMIN']);
export const requireUser = requireRole(['USER', 'SUPERVISOR', 'MANAGER', 'ADMIN', 'SUPERADMIN']);

// Middleware para verificar si el usuario pertenece a un área específica
export const requireAreaAccess = (allowedAreaIds: number[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Si es SUPERADMIN, puede acceder a todas las áreas
    if (req.user.role === 'SUPERADMIN') {
      return next();
    }

    // Verificar si el usuario tiene área asignada
    if (!req.user.areaId) {
      return res.status(403).json({ 
        error: 'Acceso denegado',
        message: 'No tienes un área asignada',
        userAreaId: req.user.areaId,
        requiredAreaIds: allowedAreaIds
      });
    }

    // Verificar si el usuario tiene acceso al área
    if (!allowedAreaIds.includes(req.user.areaId)) {
      console.warn('❌ Acceso denegado por área:', {
        userId: req.user.Id_Ejecutivo,
        userAreaId: req.user.areaId,
        userAreaNombre: req.user.areaNombre,
        requiredAreaIds: allowedAreaIds,
        endpoint: req.originalUrl
      });

      return res.status(403).json({ 
        error: 'Acceso denegado al área',
        message: 'No tienes acceso a esta área',
        userAreaId: req.user.areaId,
        userAreaNombre: req.user.areaNombre,
        requiredAreaIds: allowedAreaIds
      });
    }

    console.log('✅ Acceso al área verificado:', {
      userId: req.user.Id_Ejecutivo,
      userAreaId: req.user.areaId,
      userAreaNombre: req.user.areaNombre,
      requiredAreaIds: allowedAreaIds
    });

    next();
  };
};

// Middleware para verificar si el usuario es el creador del recurso
export const requireOwnershipOrRole = (allowedRoles: string[] = ['ADMIN', 'SUPERADMIN', 'MANAGER']) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Si tiene un rol permitido, puede continuar
    if (allowedRoles.includes(req.user.role)) {
      console.log('✅ Acceso permitido por rol:', {
        userId: req.user.Id_Ejecutivo,
        userRole: req.user.role,
        allowedRoles: allowedRoles,
        resourceId: req.params.id
      });
      return next();
    }

    // Para otros roles, verificar propiedad
    try {
      const resourceId = parseInt(req.params.id);
      
      if (isNaN(resourceId)) {
        return res.status(400).json({ 
          error: 'ID de recurso inválido',
          message: 'El ID proporcionado no es válido'
        });
      }

      // Intentar obtener ticket general primero
      let ticket = await prisma.tK_tickets.findUnique({
        where: { id: resourceId },
        select: { 
          creatorId: true, 
          assignedToId: true,
          areaId: true 
        }
      });

      // Si no es ticket general, intentar con ticket TI
      if (!ticket) {
        const ticketTI = await prisma.tK_tickets_ti.findUnique({
          where: { id: resourceId },
          select: { 
            creatorId: true, 
            assignedToId: true 
          }
        });

        if (!ticketTI) {
          return res.status(404).json({ 
            error: 'Recurso no encontrado',
            message: 'El recurso solicitado no existe'
          });
        }

        // Verificar si el usuario es el creador o asignado del ticket TI
        const isOwner = ticketTI.creatorId === req.user.Id_Ejecutivo;
        const isAssigned = ticketTI.assignedToId === req.user.Id_Ejecutivo;

        if (!isOwner && !isAssigned) {
          console.warn('❌ Acceso denegado a ticket TI:', {
            userId: req.user.Id_Ejecutivo,
            resourceId: resourceId,
            ticketCreatorId: ticketTI.creatorId,
            ticketAssignedToId: ticketTI.assignedToId,
            endpoint: req.originalUrl
          });

          return res.status(403).json({ 
            error: 'Permisos insuficientes',
            message: 'No eres el propietario ni estás asignado a este ticket TI'
          });
        }

        console.log('✅ Acceso a ticket TI verificado:', {
          userId: req.user.Id_Ejecutivo,
          resourceId: resourceId,
          isOwner: isOwner,
          isAssigned: isAssigned
        });

        return next();
      }

      // Verificar si el usuario es el creador o asignado del ticket general
      const isOwner = ticket.creatorId === req.user.Id_Ejecutivo;
      const isAssigned = ticket.assignedToId === req.user.Id_Ejecutivo;

      // Si no es ni creador ni asignado, verificar si es manager del área
      if (!isOwner && !isAssigned) {
        const isManagerOfArea = req.user.role === 'MANAGER' && 
                                req.user.areaId === ticket.areaId;
        
        if (!isManagerOfArea) {
          console.warn('❌ Acceso denegado a ticket:', {
            userId: req.user.Id_Ejecutivo,
            resourceId: resourceId,
            ticketCreatorId: ticket.creatorId,
            ticketAssignedToId: ticket.assignedToId,
            ticketAreaId: ticket.areaId,
            userAreaId: req.user.areaId,
            userRole: req.user.role,
            endpoint: req.originalUrl
          });

          return res.status(403).json({ 
            error: 'Permisos insuficientes',
            message: 'No eres el propietario, asignado, ni manager del área de este ticket'
          });
        }

        console.log('✅ Acceso a ticket verificado como manager de área:', {
          userId: req.user.Id_Ejecutivo,
          resourceId: resourceId,
          ticketAreaId: ticket.areaId,
          userAreaId: req.user.areaId
        });
      } else {
        console.log('✅ Acceso a ticket verificado:', {
          userId: req.user.Id_Ejecutivo,
          resourceId: resourceId,
          isOwner: isOwner,
          isAssigned: isAssigned
        });
      }

      next();
    } catch (error) {
      console.error('❌ Error verificando propiedad:', error);
      return res.status(500).json({ 
        error: 'Error interno del servidor',
        message: 'No se pudo verificar los permisos sobre el recurso'
      });
    }
  };
};

// Middleware para logging de peticiones
export const requestLogger = (req: AuthRequest, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Capturar la respuesta original
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - start;
    
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.Id_Ejecutivo || 'no-authenticated',
      userRole: req.user?.role || 'no-role',
      userArea: req.user?.areaNombre || 'no-area',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };

    console.log('📝 Request Log:', logData);
    
    return originalSend.call(this, body);
  };
  
  next();
};

// Extender la interfaz Request para agregar información de usuario en logs
declare global {
  namespace Express {
    interface Request {
      userInfo?: {
        userId: number;
        userName: string;
        userRole: string;
        userArea: string;
      };
    }
  }
}