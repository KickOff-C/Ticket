// src/types/index.ts

// Enums que simulamos para TypeScript
export enum Role {
  USER = 'USER',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
  SUPERADMIN = 'SUPERADMIN'
}

export enum TicketStatus {
  ABIERTO = 'ABIERTO',
  EN_PROGRESO = 'EN_PROGRESO',
  CERRADO = 'CERRADO'
}

export enum Priority {
  BAJA = 'BAJA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
  URGENTE = 'URGENTE'
}

export enum TransferStatus {
  PENDIENTE = 'PENDIENTE',
  APROBADA = 'APROBADA',
  RECHAZADA = 'RECHAZADA'
}

// Tipos para las respuestas de la API
export interface User {
  id: number;
  email: string;
  username: string;
  name: string;
  role: Role;
  areaId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Area {
  id: number;
  name: string;
  managerId?: number;
  createdAt: string;
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  closedAt?: string;
  creatorId: number;
  assignedToId?: number;
  areaId: number;
}

export interface TicketCreateData {
  title: string;
  description: string;
  priority?: string;
  assignedToId?: string;
  entrada?: 'LLAMADA' | 'VISITA' | 'MONDAY' | 'EMAIL';
  motivo?: string; // Usar el enum de motivos
  parcelaId?: string;
  propietarioId?: string;
}

export interface Parcela {
  id_parcela: number;
  codigo_parcela: string;
  nombre_legal: string;
  proyecto: string;
  propietarios: Propietario[];
}

export interface Propietario {
  id: number;
  nombre: string;
  rut: string;
  parcela: string;
  tipo_deudor: string;
  mail?: string;
  fono?: string;
}