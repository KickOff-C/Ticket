// src/utils/jwt.ts - VERSIÓN COMPATIBLE
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'a26c69461158acfcf8c080626873582d12e1e30ab78f1f460eb78e47321ac647';

export function generateToken(payload: any): string {
  console.log('🔐 Generando token:', payload);
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: process.env.JWT_EXPIRES_IN || '24h' 
  });
}

export function generateRefreshToken(payload: any): string {
  const secret = process.env.JWT_REFRESH_SECRET || 'f34714a3d643935e7f7067e72aa20ef24102aa3aad5ed25691bcc0eac6cf22c2';
  return jwt.sign(payload, secret, { 
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' 
  });
}

export function verifyToken(token: string): any {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Normalizar: convertir 'id' a 'Id_Ejecutivo' si es necesario
    if (decoded && typeof decoded === 'object') {
      if (decoded.id && !decoded.Id_Ejecutivo) {
        decoded.Id_Ejecutivo = decoded.id;
      }
      if (decoded.username && !decoded.Login) {
        decoded.Login = decoded.username;
      }
    }
    
    return decoded;
  } catch (error: any) {
    console.error('❌ Error verificando token:', error.message);
    return null;
  }
}