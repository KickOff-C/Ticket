import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../app';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    role: string;
    areaId: number;
    email: string;
  };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;
    
    // Para SUPERADMIN, asegurar que tenga un areaId válido
    let areaId = decoded.areaId;
    
    // Si no tiene areaId, buscar el usuario para obtenerlo
    if (!areaId && decoded.userId) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { areaId: true }
      });
      areaId = user?.areaId;
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      areaId: areaId || 0, // Siempre tendrá un valor
      email: decoded.email
    };

    console.log('🔐 Auth - Usuario autenticado:', {
      userId: decoded.userId,
      role: decoded.role,
      areaId: areaId,
      email: decoded.email
    });

    next();
  } catch (error) {
    console.error('❌ Error de autenticación:', error);
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }

    next();
  };
};