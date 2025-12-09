import { Request, Response } from 'express';
import { prisma } from '../app';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { identifier, password } = req.body;

      if (!identifier || !password) {
        return res.status(400).json({ error: 'Usuario/email y contraseña son requeridos' });
      }

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: identifier },
            { username: identifier }
          ],
          isActive: true
        },
        include: {
          area: true
        }
      });

      if (!user) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      const isValid = passwordHash === user.password;

      if (!isValid) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const token = jwt.sign(
        { 
          userId: user.id, 
          role: user.role,
          areaId: user.areaId 
        },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: '24h' }
      );

      const { password: _, ...userWithoutPassword } = user;
      
      res.json({
        user: userWithoutPassword,
        token
      });

    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async getProfile(req: AuthRequest, res: Response) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user?.userId },
        include: {
          area: true
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);

    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async changePassword(req: AuthRequest, res: Response) {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.user?.userId;

      if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'Contraseña actual y nueva contraseña son requeridas' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const oldPasswordHash = crypto.createHash('sha256').update(oldPassword).digest('hex');
      if (oldPasswordHash !== user.password) {
        return res.status(400).json({ error: 'Contraseña actual incorrecta' });
      }

      const newPasswordHash = crypto.createHash('sha256').update(newPassword).digest('hex');
      
      await prisma.user.update({
        where: { id: userId },
        data: { password: newPasswordHash }
      });

      res.json({ message: 'Contraseña actualizada exitosamente' });

    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}