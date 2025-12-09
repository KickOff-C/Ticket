import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Definimos las constantes para los tipos que antes eran enums
const Role = {
  USER: 'USER',
  MANAGER: 'MANAGER',
  ADMIN: 'ADMIN',
  SUPERADMIN: 'SUPERADMIN'
} as const;

const TicketStatus = {
  ABIERTO: 'ABIERTO',
  EN_PROGRESO: 'EN_PROGRESO',
  CERRADO: 'CERRADO'
} as const;

const Priority = {
  BAJA: 'BAJA',
  MEDIA: 'MEDIA',
  ALTA: 'ALTA',
  URGENTE: 'URGENTE'
} as const;

const TransferStatus = {
  PENDIENTE: 'PENDIENTE',
  APROBADA: 'APROBADA',
  RECHAZADA: 'RECHAZADA'
} as const;

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Limpiar la base de datos primero
  await prisma.transferRequest.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.ticketHistory.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.ticketTI.deleteMany();
  await prisma.user.deleteMany();
  await prisma.area.deleteMany();

  // Crear áreas
  const atencionPropietarios = await prisma.area.create({
    data: { name: 'Atención Propietarios' }
  });

  const cobranzas = await prisma.area.create({
    data: { name: 'Cobranzas' }
  });

  const ti = await prisma.area.create({
    data: { name: 'TI' }
  });

  console.log('✅ Áreas creadas');

  // Crear usuarios para Atención Propietarios
  const managerAP = await prisma.user.create({
    data: {
      email: 'manager.ap@empresa.com',
      username: 'manager_ap',
      password: hashPassword('password123'),
      name: 'Manager AP',
      role: Role.MANAGER,
      areaId: atencionPropietarios.id
    }
  });

  await prisma.area.update({
    where: { id: atencionPropietarios.id },
    data: { managerId: managerAP.id }
  });

  // Crear 4 usuarios normales para AP
  for (let i = 1; i <= 4; i++) {
    await prisma.user.create({
      data: {
        email: `user${i}.ap@empresa.com`,
        username: `user${i}_ap`,
        password: hashPassword('password123'),
        name: `Usuario ${i} AP`,
        role: Role.USER,
        areaId: atencionPropietarios.id
      }
    });
  }

  // Admin para AP
  await prisma.user.create({
    data: {
      email: 'admin.ap@empresa.com',
      username: 'admin_ap',
      password: hashPassword('password123'),
      name: 'Admin AP',
      role: Role.ADMIN,
      areaId: atencionPropietarios.id
    }
  });

  console.log('✅ Usuarios de Atención Propietarios creados');

  // Crear usuarios para Cobranzas
  for (let i = 1; i <= 4; i++) {
    await prisma.user.create({
      data: {
        email: `user${i}.cobranzas@empresa.com`,
        username: `user${i}_cobranzas`,
        password: hashPassword('password123'),
        name: `Usuario ${i} Cobranzas`,
        role: Role.USER,
        areaId: cobranzas.id
      }
    });
  }

  // Admin para Cobranzas
  await prisma.user.create({
    data: {
      email: 'admin.cobranzas@empresa.com',
      username: 'admin_cobranzas',
      password: hashPassword('password123'),
      name: 'Admin Cobranzas',
      role: Role.ADMIN,
      areaId: cobranzas.id
    }
  });

  console.log('✅ Usuarios de Cobranzas creados');

  // Crear 3 Superadmins para TI
  for (let i = 1; i <= 3; i++) {
    await prisma.user.create({
      data: {
        email: `superadmin${i}.ti@empresa.com`,
        username: `superadmin${i}_ti`,
        password: hashPassword('password123'),
        name: `Superadmin ${i} TI`,
        role: Role.SUPERADMIN,
        areaId: ti.id
      }
    });
  }

  console.log('✅ Superadmins de TI creados');

  // Crear algunos tickets de ejemplo
  const user1 = await prisma.user.findFirst({
    where: { username: 'user1_ap' }
  });

  if (user1) {
    await prisma.ticket.create({
      data: {
        title: 'Problema con el sistema de facturación',
        description: 'No puedo generar facturas para los clientes nuevos',
        creatorId: user1.id,
        areaId: atencionPropietarios.id,
        priority: Priority.ALTA
      }
    });

    await prisma.ticket.create({
      data: {
        title: 'Error en reporte mensual',
        description: 'El reporte de cierre mensual muestra datos incorrectos',
        creatorId: user1.id,
        areaId: atencionPropietarios.id,
        priority: Priority.MEDIA
      }
    });
  }

  console.log('✅ Tickets de ejemplo creados');
  console.log('🎉 Seed completado exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });