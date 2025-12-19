require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔌 Probando conexión a MySQL...');
    console.log('Base de datos: prueba');
    
    // Conectar
    await prisma.$connect();
    console.log('✅ Conexión exitosa!');
    
    // Contar usuarios
    const userCount = await prisma.usuarios.count();
    console.log(`👥 Usuarios encontrados: ${userCount}`);
    
    // Mostrar algunos usuarios
    const usuarios = await prisma.usuarios.findMany({
      take: 3,
      select: {
        Id_Ejecutivo: true,
        Nombre: true,
        Login: true,
        activo: true
      }
    });
    console.log('📋 Primeros usuarios:', usuarios);
    
    // Ver tablas TK_ creadas
    const tables = await prisma.$queryRaw`
      SHOW TABLES LIKE 'TK_%'
    `;
    console.log(`📊 Tablas TK_ creadas: ${tables.length}`);
    
    // Ver estructura de área actualizada
    const areaColumns = await prisma.$queryRaw`
      SHOW COLUMNS FROM area
    `;
    console.log(`🏢 Columnas en tabla 'area': ${areaColumns.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Errores comunes y soluciones
    switch (error.code) {
      case 'P1000':
        console.log('🔧 Solución: Verifica usuario/contraseña');
        break;
      case 'P1001':
        console.log('🔧 Solución: MySQL no está corriendo o puerto incorrecto');
        console.log('   Ejecuta: sudo service mysql start');
        break;
      case 'P1002':
        console.log('🔧 Solución: Timeout de conexión');
        break;
      case 'P1003':
        console.log('🔧 Solución: Base de datos "prueba" no existe');
        console.log('   Crea la BD: CREATE DATABASE prueba;');
        break;
      case 'P1017':
        console.log('🔧 Solución: El servidor cerró la conexión');
        break;
      default:
        console.log('🔧 Verifica:');
        console.log('   1. MySQL está corriendo');
        console.log('   2. Usuario: root');
        console.log('   3. Contraseña correcta');
        console.log('   4. Base de datos: prueba existe');
    }
    
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();