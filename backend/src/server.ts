// src/server.ts
import app from './app';
import { config } from 'dotenv';

// Cargar variables de entorno
config();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Verificar variables de entorno críticas
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ ERROR: Variables de entorno faltantes:');
  missingEnvVars.forEach(envVar => {
    console.error(`   - ${envVar}`);
  });
  console.error('Por favor, configúralas en el archivo .env');
  process.exit(1);
}

// Iniciar servidor
const server = app.listen(PORT as number, HOST, () => {
  console.log(`
  🚀 Servidor iniciado correctamente
  📍 URL: http://${HOST}:${PORT}
  ⏰ Hora: ${new Date().toLocaleString()}
  📊 Entorno: ${process.env.NODE_ENV || 'development'}
  🗄️  Base de datos: ${process.env.DATABASE_URL ? 'Conectada' : 'No configurada'}
  `);
  
  // Mostrar rutas disponibles
  console.log('\n📋 Rutas disponibles:');
  console.log('   GET  /api/health          - Verificar estado del API');
  console.log('   POST /api/auth/login      - Iniciar sesión');
  console.log('   GET  /api/routes          - Lista de rutas disponibles');
  console.log('   GET  /api/system          - Información del sistema (SuperAdmin)');
});

// Manejo de errores no capturados
process.on('unhandledRejection', (reason: Error, promise: Promise<any>) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Cerrar servidor y salir
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught Exception:', error);
  // Cerrar servidor y salir
  server.close(() => process.exit(1));
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