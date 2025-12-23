// src/server.ts - VERSIÓN LIMPIA
import app from './app';
import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno desde la raíz del proyecto
const envPath = path.resolve(process.cwd(), '.env');
console.log('📁 Cargando variables de .env:', envPath);

const result = config({ path: envPath });

if (result.error) {
  console.warn('⚠️  No se pudo cargar .env:', result.error.message);
  console.log('ℹ️  Asegúrate de que el archivo .env existe en la raíz del proyecto');
} else {
  console.log('✅ Variables de entorno cargadas');
}

// Verificación de variables críticas
console.log('\n🔍 Verificación de variables:');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? `✅ (${process.env.JWT_SECRET?.length || 0} chars)` : '❌ NO DEFINIDA');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅' : '❌ NO DEFINIDA');
console.log('PORT:', process.env.PORT || '3000 (usando default)');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development (usando default)');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Verificar variables críticas pero NO salir si faltan
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('\n⚠️  ADVERTENCIA: Variables críticas faltantes:');
  missingEnvVars.forEach(envVar => {
    console.error(`   - ${envVar}`);
  });
  
  // En desarrollo, usar valores por defecto
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n🔧 Modo desarrollo: Usando valores por defecto para continuar...');
    
    // Solo setear JWT_SECRET si no existe
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = 'dev_jwt_secret_fallback_' + Date.now();
      console.log(`   JWT_SECRET seteado a: ${process.env.JWT_SECRET.substring(0, 20)}...`);
    }
    
    if (!process.env.JWT_REFRESH_SECRET) {
      process.env.JWT_REFRESH_SECRET = 'dev_refresh_secret_fallback_' + Date.now();
    }
  } else {
    console.error('\n❌ EN PRODUCCIÓN: Variables críticas faltantes');
    console.error('   Por favor, configura las variables en el archivo .env');
    // En producción, sí salir
    process.exit(1);
  }
}

// Iniciar servidor
const server = app.listen(PORT as number, HOST, () => {
  console.log(`
  🚀 Servidor iniciado correctamente
  📍 URL: http://${HOST}:${PORT}
  ⏰ Hora: ${new Date().toLocaleString()}
  📊 Entorno: ${process.env.NODE_ENV || 'development'}
  🗄️  Base de datos: ${process.env.DATABASE_URL ? 'Conectada' : 'No configurada'}
  🔐 JWT: ${process.env.JWT_SECRET ? 'Configurado' : 'Usando fallback'}
  `);
  
  console.log('\n📋 Endpoints principales:');
  console.log('   GET  /api/health          - Estado del sistema');
  console.log('   POST /api/auth/login      - Autenticación');
  console.log('   GET  /api/areas           - Áreas (requiere auth)');
  console.log('   POST /api/tickets         - Crear ticket (requiere auth)');
});

// Manejo de errores no capturados
process.on('unhandledRejection', (reason: Error, promise: Promise<any>) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason.message);
  // En desarrollo, no salir; solo loguear
  if (process.env.NODE_ENV === 'production') {
    server.close(() => process.exit(1));
  }
});

process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught Exception:', error.message);
  if (process.env.NODE_ENV === 'production') {
    server.close(() => process.exit(1));
  }
});

// Manejo de señales de terminación
process.on('SIGINT', () => {
  console.log('\n👋 Recibida señal SIGINT. Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n👋 Recibida señal SIGTERM. Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

export default server;