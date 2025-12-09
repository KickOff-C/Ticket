// src/services/authService.ts
import { prisma } from '../app';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export class AuthService {
  static async login(identifier: string, password: string) {
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
      throw new Error('Usuario no encontrado');
    }

    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    const isValid = passwordHash === user.password;

    if (!isValid) {
      throw new Error('Credenciales inválidas');
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
    return { user: userWithoutPassword, token };
  }

  static async changePassword(userId: number, oldPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const oldPasswordHash = crypto.createHash('sha256').update(oldPassword).digest('hex');
    if (oldPasswordHash !== user.password) {
      throw new Error('Contraseña actual incorrecta');
    }

    const newPasswordHash = crypto.createHash('sha256').update(newPassword).digest('hex');
    
    await prisma.user.update({
      where: { id: userId },
      data: { password: newPasswordHash }
    });
  }
}