// src/utils/jwt.ts - VERSIÓN CORREGIDA Y GARANTIZADA
const jwt = require('jsonwebtoken');

// Función para generar token de acceso
export function generateToken(payload: { id: number; username: string; role?: string }): string {
  const secret = process.env.JWT_SECRET || 'default_dev_secret_123_change_in_production';
  return jwt.sign(payload, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
}

// Función para generar refresh token
export function generateRefreshToken(payload: { id: number }): string {
  const secret = process.env.JWT_REFRESH_SECRET || 'default_dev_refresh_secret_456_change_in_production';
  return jwt.sign(payload, secret, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
}

// Función para verificar token
export function verifyToken(token: string): any {
  try {
    const secret = process.env.JWT_SECRET || 'default_dev_secret_123_change_in_production';
    return jwt.verify(token, secret);
  } catch (error) {
    console.error('❌ Error verificando token:', error);
    return null;
  }
}