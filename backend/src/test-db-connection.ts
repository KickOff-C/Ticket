// src/test-db-connection.ts
import { prisma } from './app';

async function testDatabaseConnection() {
  try {
    console.log('🔍 Probando conexión a la base de datos...');
    
    // 1. Verificar conexión básica
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Conexión a MySQL establecida');
    
    // 2. Contar tablas
    const tables = await prisma.$queryRaw`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
    `;
    console.log(`✅ Tablas encontradas: ${(tables as any[]).length}`);
    
    // 3. Verificar tablas específicas
    const requiredTables = [
      'usuarios',
      'area', 
      'TK_tickets',
      'TK_tickets_ti',
      'TK_comments',
      'TK_transfer_requests',
      'TK_ticket_history',
      'TK_user_ticket_data'
    ];
    
    for (const table of requiredTables) {
      try {
        const result = await prisma.$queryRaw`
          SELECT COUNT(*) as count FROM ${table}
        `;
        console.log(`✅ Tabla "${table}" existe`);
      } catch (error) {
        console.log(`❌ Tabla "${table}" no existe o tiene error`);
      }
    }
    
    // 4. Contar registros en tablas principales
    const userCount = await prisma.usuarios.count();
    console.log(`👤 Usuarios en la base de datos: ${userCount}`);
    
    const areaCount = await prisma.area.count();
    console.log(`🏢 Áreas en la base de datos: ${areaCount}`);
    
    if (userCount === 0) {
      console.log('⚠️  No hay usuarios en la base de datos. Necesitas crear al menos uno.');
    }
    
    // 5. Crear usuario de prueba si no existe
    if (userCount === 0) {
      console.log('👤 Creando usuario de prueba...');
      
      // Primero crear un área si no existe
      const area = await prisma.area.create({
        data: {
          nombre_area: 'TI - Tecnologías de la Información'
        }
      });
      
      // Crear usuario
      const user = await prisma.usuarios.create({
        data: {
          Nombre: 'Admin de Prueba',
          Login: 'admin',
          password: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // SHA256 de "admin"
          Correo: 'admin@empresa.com',
          activo: 1,
          id_area: area.id_area
        }
      });
      
      // Crear datos de tickets para el usuario
      await prisma.tK_user_ticket_data.create({
        data: {
          userId: user.Id_Ejecutivo,
          role: 'SUPERADMIN'
        }
      });
      
      console.log('✅ Usuario de prueba creado:');
      console.log('   Usuario: admin');
      console.log('   Contraseña: admin');
      console.log('   Rol: SUPERADMIN');
    }
    
    console.log('🎉 Prueba de conexión completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en la conexión a la base de datos:', error);
    process.exit(1);
  } finally