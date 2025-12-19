// src/services/AuthService.ts
import { prisma } from '../app';
import * as crypto from 'crypto';
import { generateToken, generateRefreshToken, verifyToken as verifyJWT } from '../utils/jwt';

// ✅ Definir interfaces FUERA de la clase para que sean accesibles
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  message: string;
  user?: any;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResult {
  success: boolean;
  message: string;
}

export interface UpdateProfileRequest {
  nombre?: string;
  correo?: string;
  telefono?: number;
}

export interface UpdateProfileResult {
  success: boolean;
  message: string;
  user?: any;
}

export interface RefreshTokenResult {
  success: boolean;
  message: string;
  accessToken?: string;
  newRefreshToken?: string;
}

export interface VerifyTokenResult {
  valid: boolean;
  message?: string;
  user?: any;
}

export interface CheckUserExistsResult {
  exists: boolean;
  username?: string;
  userId?: number;
  active?: boolean;
  message: string;
}

export interface InitializeUserTicketDataResult {
  success: boolean;
  message: string;
  data?: any;
}

export class AuthService {
  
  // ✅ Login
  static async login(credentials: LoginCredentials): Promise<LoginResult> {
    try {
      const { username, password } = credentials;
      
      // Buscar usuario por login
      const user = await prisma.usuarios.findUnique({
        where: { Login: username },
        include: { 
          area: true,
          ticketData: true 
        }
      });
      
      if (!user) {
        return { success: false, message: 'Usuario no encontrado' };
      }
      
      // Verificar si está activo
      if (user.activo !== 1) {
        return { success: false, message: 'Usuario inactivo' };
      }
      
      // Verificar contraseña (hash SHA256)
      const passwordHash = crypto
        .createHash('sha256')
        .update(password)
        .digest('hex');
      
      if (user.password !== passwordHash) {
        return { success: false, message: 'Contraseña incorrecta' };
      }
      
      return { 
        success: true, 
        user,
        message: 'Autenticación exitosa' 
      };
      
    } catch (error) {
      console.error('Error en AuthService.login:', error);
      throw error;
    }
  }
  
  // ✅ Obtener perfil
  static async getProfile(userId: number) {
    try {
      const user = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId },
        include: { 
          area: true,
          ticketData: true,
          supervisorRel: {
            select: {
              Id_Ejecutivo: true,
              Nombre: true,
              Login: true
            }
          }
        }
      });
      
      if (!user) {
        return null;
      }
      
      // Formatear respuesta con valores por defecto
      return {
        id: user.Id_Ejecutivo,
        nombre: user.Nombre ? user.Nombre : '',
        rut: user.RUT ? user.RUT : '',
        login: user.Login ? user.Login : '',
        correo: user.Correo ? user.Correo : '',
        anexo: user.Anexo ? user.Anexo : '',
        supervisor: user.Supervisor,
        supervisorInfo: user.supervisorRel,
        activo: user.activo,
        id_cargo: user.id_cargo,
        fecha_ingreso: user.fecha_ingreso,
        ultima_sesion: user.ultima_sesion,
        fecha_nacimiento: user.fecha_nacimiento,
        telefono: user.telefono,
        software: user.software ? user.software : '',
        pantalla_bienvenida: user.pantalla_bienvenida ? user.pantalla_bienvenida : '',
        area: user.area,
        role: user.ticketData?.role || 'USER',
        ticketsClosed: user.ticketData?.ticketsClosed || 0
      };
      
    } catch (error) {
      console.error('Error en AuthService.getProfile:', error);
      throw error;
    }
  }
  
  // ✅ Cambiar contraseña
  static async changePassword(userId: number, passwords: ChangePasswordRequest): Promise<ChangePasswordResult> {
    try {
      const { currentPassword, newPassword } = passwords;
      
      const user = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: userId }
      });
      
      if (!user) {
        return { success: false, message: 'Usuario no encontrado' };
      }
      
      // Verificar contraseña actual
      const currentHash = crypto
        .createHash('sha256')
        .update(currentPassword)
        .digest('hex');
      
      if (user.password !== currentHash) {
        return { success: false, message: 'Contraseña actual incorrecta' };
      }
      
      // Generar nuevo hash
      const newHash = crypto
        .createHash('sha256')
        .update(newPassword)
        .digest('hex');
      
      // Actualizar contraseña
      await prisma.usuarios.update({
        where: { Id_Ejecutivo: userId },
        data: { password: newHash }
      });
      
      return { success: true, message: 'Contraseña cambiada exitosamente' };
      
    } catch (error) {
      console.error('Error en AuthService.changePassword:', error);
      throw error;
    }
  }
  
  // ✅ Refrescar token
  static async refreshToken(refreshToken: string): Promise<RefreshTokenResult> {
    try {
      // Verificar refresh token
      const payload = verifyJWT(refreshToken, process.env.JWT_REFRESH_SECRET!);
      
      if (!payload || typeof payload !== 'object' || !('id' in payload)) {
        return { success: false, message: 'Refresh token inválido' };
      }
      
      // Generar nuevo access token
      const user = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: (payload as any).id },
        include: { ticketData: true }
      });
      
      if (!user) {
        return { success: false, message: 'Usuario no encontrado' };
      }
      
      // ✅ CORREGIDO: Asegurar que username sea string
      const username = user.Login ? user.Login : '';
      
      const newAccessToken = generateToken({ 
        id: user.Id_Ejecutivo, 
        username: username,
        role: user.ticketData?.role || 'USER'
      });
      
      // Opcional: generar nuevo refresh token
      const newRefreshToken = generateRefreshToken({ 
        id: user.Id_Ejecutivo 
      });
      
      return { 
        success: true, 
        accessToken: newAccessToken,
        newRefreshToken: newRefreshToken,
        message: 'Token refrescado exitosamente' 
      };
      
    } catch (error) {
      console.error('Error en AuthService.refreshToken:', error);
      return { success: false, message: 'Error al refrescar token' };
    }
  }
  
  // ✅ Verificar token
  static async verifyToken(token: string): Promise<VerifyTokenResult> {
    try {
      const payload = verifyJWT(token, process.env.JWT_SECRET!);
      
      if (!payload) {
        return { valid: false, message: 'Token inválido' };
      }
      
      const user = await prisma.usuarios.findUnique({
        where: { Id_Ejecutivo: (payload as any).id },
        select: {
          Id_Ejecutivo: true,
          Nombre: true,
          Login: true,
          Correo: true,
          id_area: true,
          ticketData: {
            select: { role: true }
          }
        }
      });
      
      if (!user) {
        return { valid: false, message: 'Usuario no encontrado' };
      }
      
      // ✅ CORREGIDO: Asegurar valores string
      return {
        valid: true,
        user: {
          id: user.Id_Ejecutivo,
          name: user.Nombre ? user.Nombre : '',
          username: user.Login ? user.Login : '',
          email: user.Correo ? user.Correo : '',
          areaId: user.id_area,
          role: user.ticketData?.role || 'USER'
        }
      };
      
    } catch (error) {
      console.error('Error en AuthService.verifyToken:', error);
      return { valid: false, message: 'Error verificando token' };
    }
  }
  
  // ✅ Verificar si usuario existe
  static async checkUserExists(username: string): Promise<CheckUserExistsResult> {
    try {
      const user = await prisma.usuarios.findUnique({
        where: { Login: username },
        select: { Id_Ejecutivo: true, Login: true, activo: true }
      });
      
      if (!user) {
        return { 
          exists: false, 
          username,
          message: 'Usuario no encontrado' 
        };
      }
      
      return {
        exists: true,
        username: user.Login ? user.Login : '',
        userId: user.Id_Ejecutivo,
        active: user.activo === 1,
        message: 'Usuario encontrado'
      };
      
    } catch (error) {
      console.error('Error en AuthService.checkUserExists:', error);
      throw error;
    }
  }
  
  // ✅ Actualizar perfil
  static async updateProfile(userId: number, profileData: UpdateProfileRequest): Promise<UpdateProfileResult> {
    try {
      const updateData: any = {};
      
      if (profileData.nombre) updateData.Nombre = profileData.nombre;
      if (profileData.correo) updateData.Correo = profileData.correo;
      if (profileData.telefono !== undefined) updateData.telefono = profileData.telefono;
      
      const updatedUser = await prisma.usuarios.update({
        where: { Id_Ejecutivo: userId },
        data: updateData,
        include: { area: true, ticketData: true }
      });
      
      return {
        success: true,
        message: 'Perfil actualizado exitosamente',
        user: {
          id: updatedUser.Id_Ejecutivo,
          nombre: updatedUser.Nombre ? updatedUser.Nombre : '',
          correo: updatedUser.Correo ? updatedUser.Correo : '',
          telefono: updatedUser.telefono,
          area: updatedUser.area,
          role: updatedUser.ticketData?.role || 'USER'
        }
      };
      
    } catch (error) {
      console.error('Error en AuthService.updateProfile:', error);
      throw error;
    }
  }
  
  // ✅ Cerrar sesión
  static async logout(userId: number, token: string) {
    try {
      // Aquí podrías implementar blacklist de tokens si es necesario
      console.log(`Usuario ${userId} cerró sesión. Token: ${token.substring(0, 20)}...`);
      
      return { success: true, message: 'Sesión cerrada' };
      
    } catch (error) {
      console.error('Error en AuthService.logout:', error);
      throw error;
    }
  }
  
  // ✅ Inicializar datos de tickets para usuario
  static async initializeUserTicketData(userId: number): Promise<InitializeUserTicketDataResult> {
    try {
      // Verificar si ya existe
      const existingData = await prisma.tK_user_ticket_data.findUnique({
        where: { userId }
      });
      
      if (existingData) {
        return { 
          success: false, 
          message: 'Los datos de tickets ya están inicializados' 
        };
      }
      
      // Crear datos iniciales
      const userData = await prisma.tK_user_ticket_data.create({
        data: {
          userId,
          role: 'USER',
          ticketsClosed: 0
        }
      });
      
      return {
        success: true,
        message: 'Datos de tickets inicializados',
        data: userData
      };
      
    } catch (error) {
      console.error('Error en AuthService.initializeUserTicketData:', error);
      throw error;
    }
  }
  
  // ✅ Actualizar última sesión
  static async updateLastSession(userId: number) {
    try {
      await prisma.usuarios.update({
        where: { Id_Ejecutivo: userId },
        data: { ultima_sesion: new Date() }
      });
      
      return { success: true, message: 'Última sesión actualizada' };
      
    } catch (error) {
      console.error('Error en AuthService.updateLastSession:', error);
      throw error;
    }
  }
  
  // ✅ Obtener estadísticas de autenticación
  static async getAuthStats() {
    try {
      const totalUsers = await prisma.usuarios.count();
      const activeUsers = await prisma.usuarios.count({
        where: { activo: 1 }
      });
      
      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);
      
      const recentSessions = await prisma.usuarios.count({
        where: {
          ultima_sesion: {
            gte: last24Hours
          }
        }
      });
      
      const usersWithTicketData = await prisma.tK_user_ticket_data.count();
      
      return {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        recentSessions,
        usersWithTicketData,
        usersWithoutTicketData: totalUsers - usersWithTicketData,
        lastUpdated: new Date()
      };
      
    } catch (error) {
      console.error('Error en AuthService.getAuthStats:', error);
      throw error;
    }
  }
}
