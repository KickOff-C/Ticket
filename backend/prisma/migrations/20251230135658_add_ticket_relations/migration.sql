-- CreateTable
CREATE TABLE `usuarios` (
    `Id_Ejecutivo` INTEGER NOT NULL AUTO_INCREMENT,
    `Nombre` VARCHAR(191) NULL,
    `RUT` VARCHAR(191) NULL,
    `Login` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `login_sw` VARCHAR(191) NULL,
    `Correo` VARCHAR(191) NULL,
    `Anexo` VARCHAR(191) NULL,
    `Supervisor` INTEGER NULL,
    `activo` INTEGER NULL,
    `puede_agendar` INTEGER NULL,
    `id_cargo` INTEGER NULL,
    `atiende_visitas` INTEGER NULL,
    `tiene_personal_a_cargo` INTEGER NULL,
    `fecha_ingreso` DATE NULL,
    `ultima_sesion` DATETIME(3) NULL,
    `fecha_nacimiento` DATE NULL,
    `sexo` INTEGER NULL,
    `telefono` INTEGER NULL,
    `fecha_desactivado` DATE NULL,
    `software` VARCHAR(191) NULL,
    `pantalla_bienvenida` VARCHAR(191) NULL,
    `id_area` INTEGER NULL,

    UNIQUE INDEX `usuarios_Login_key`(`Login`),
    PRIMARY KEY (`Id_Ejecutivo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TK_user_ticket_data` (
    `userId` INTEGER NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'USER',
    `ticketsClosed` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `area` (
    `id_area` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_area` VARCHAR(191) NOT NULL,
    `TK_managerId` INTEGER NULL,
    `TK_createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `area_TK_managerId_key`(`TK_managerId`),
    PRIMARY KEY (`id_area`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TK_tickets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `status` VARCHAR(191) NULL DEFAULT 'ABIERTO',
    `priority` VARCHAR(191) NULL DEFAULT 'MEDIA',
    `entrada` VARCHAR(191) NULL,
    `motivo` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,
    `lastActivityAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closedAt` DATETIME(3) NULL,
    `creatorId` INTEGER NOT NULL,
    `assignedToId` INTEGER NULL,
    `areaId` INTEGER NOT NULL,
    `parcelaId` INTEGER NULL,
    `propietarioId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TK_tickets_ti` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `status` VARCHAR(191) NULL DEFAULT 'ABIERTO',
    `priority` VARCHAR(191) NULL DEFAULT 'MEDIA',
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,
    `lastActivityAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closedAt` DATETIME(3) NULL,
    `creatorId` INTEGER NOT NULL,
    `assignedToId` INTEGER NULL,
    `area` VARCHAR(191) NULL DEFAULT 'TI',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TK_comments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,
    `ticketId` INTEGER NULL,
    `ticketTIId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TK_transfer_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticketId` INTEGER NOT NULL,
    `fromAreaId` INTEGER NOT NULL,
    `toAreaId` INTEGER NOT NULL,
    `requestedById` INTEGER NOT NULL,
    `status` VARCHAR(191) NULL DEFAULT 'PENDIENTE',
    `approvedById` INTEGER NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TK_ticket_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticketId` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `oldValue` TEXT NULL,
    `newValue` TEXT NULL,
    `details` TEXT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_parcelas` (
    `id_parcela` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo_parcela` VARCHAR(191) NULL,
    `nombre_legal` VARCHAR(191) NULL,
    `dominio` VARCHAR(191) NULL,
    `proyecto` VARCHAR(191) NULL,
    `sector` VARCHAR(191) NULL,
    `rol` VARCHAR(191) NULL,
    `superficie_total` DOUBLE NULL,
    `superficie_servidumbre` DOUBLE NULL,
    `superficie_util` DOUBLE NULL,
    `existe` INTEGER NULL,
    `id_proyecto` INTEGER NULL,
    `revisada` INTEGER NULL,
    `precio_lista` DOUBLE NULL,
    `stock` INTEGER NULL,
    `estado_general` VARCHAR(191) NULL,
    `seleccionable` INTEGER NULL,
    `tipo_parcela` VARCHAR(191) NULL,
    `id_empresa_agua` INTEGER NULL,
    `co_num_parcela` VARCHAR(191) NULL,

    UNIQUE INDEX `sys_parcelas_codigo_parcela_key`(`codigo_parcela`),
    PRIMARY KEY (`id_parcela`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deudores` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `parcela` VARCHAR(191) NULL,
    `rut` VARCHAR(191) NULL,
    `nombre` VARCHAR(191) NULL,
    `tipo_deudor` VARCHAR(191) NULL,
    `activo` INTEGER NULL,
    `fono` VARCHAR(191) NULL,
    `mail` VARCHAR(191) NULL,
    `fecha_ingreso` DATETIME(3) NULL,
    `ingresado_por` VARCHAR(191) NULL,
    `id_pagare` INTEGER NULL,
    `direccion` VARCHAR(191) NULL,
    `comuna` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_id_area_fkey` FOREIGN KEY (`id_area`) REFERENCES `area`(`id_area`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_Supervisor_fkey` FOREIGN KEY (`Supervisor`) REFERENCES `usuarios`(`Id_Ejecutivo`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TK_user_ticket_data` ADD CONSTRAINT `TK_user_ticket_data_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `usuarios`(`Id_Ejecutivo`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `area` ADD CONSTRAINT `area_TK_managerId_fkey` FOREIGN KEY (`TK_managerId`) REFERENCES `usuarios`(`Id_Ejecutivo`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TK_tickets` ADD CONSTRAINT `TK_tickets_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `usuarios`(`Id_Ejecutivo`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TK_tickets` ADD CONSTRAINT `TK_tickets_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `usuarios`(`Id_Ejecutivo`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TK_tickets` ADD CONSTRAINT `TK_tickets_areaId_fkey` FOREIGN KEY (`areaId`) REFERENCES `area`(`id_area`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TK_tickets` ADD CONSTRAINT `TK_tickets_parcelaId_fkey` FOREIGN KEY (`parcelaId`) REFERENCES `sys_parcelas`(`id_parcela`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TK_tickets` ADD CONSTRAINT `TK_tickets_propietarioId_fkey` FOREIGN KEY (`propietarioId`) REFERENCES `deudores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TK_tickets_ti` ADD CONSTRAINT `TK_tickets_ti_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `usuarios`(`Id_Ejecutivo`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TK_tickets_ti` ADD CONSTRAINT `TK_tickets_ti_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `usuarios`(`Id_Ejecutivo`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TK_comments` ADD CONSTRAINT `TK_comments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `usuarios`(`Id_Ejecutivo`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TK_comments` ADD CONSTRAINT `TK_comments_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `TK_tickets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TK_comments` ADD CONSTRAINT `TK_comments_ticketTIId_fkey` FOREIGN KEY (`ticketTIId`) REFERENCES `TK_tickets_ti`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TK_transfer_requests` ADD CONSTRAINT `TK_transfer_requests_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `TK_tickets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TK_transfer_requests` ADD CONSTRAINT `TK_transfer_requests_fromAreaId_fkey` FOREIGN KEY (`fromAreaId`) REFERENCES `area`(`id_area`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TK_transfer_requests` ADD CONSTRAINT `TK_transfer_requests_toAreaId_fkey` FOREIGN KEY (`toAreaId`) REFERENCES `area`(`id_area`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TK_transfer_requests` ADD CONSTRAINT `TK_transfer_requests_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `usuarios`(`Id_Ejecutivo`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TK_transfer_requests` ADD CONSTRAINT `TK_transfer_requests_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `usuarios`(`Id_Ejecutivo`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TK_ticket_history` ADD CONSTRAINT `TK_ticket_history_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `TK_tickets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TK_ticket_history` ADD CONSTRAINT `TK_ticket_history_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `usuarios`(`Id_Ejecutivo`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deudores` ADD CONSTRAINT `deudores_parcela_fkey` FOREIGN KEY (`parcela`) REFERENCES `sys_parcelas`(`codigo_parcela`) ON DELETE SET NULL ON UPDATE CASCADE;
