export interface User {
  id: number;
  email?: string;
  username?: string;
  name?: string;
  role?: string;
  areaId?: number | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  area?: Area;
}

export interface Parcela {
  id_parcela: number;
  codigo_parcela: string;
  nombre_legal: string;
  proyecto: string;
  sector?: string;
  seleccionable: number;
  existe: number;
  propietarios?: Propietario[];
}

export interface Propietario {
  id: number;
  nombre: string;
  rut: string;
  parcela?: string;
  tipo_deudor?: string;
  mail?: string;
  fono?: string;
  direccion?: string;
  comuna?: string;
  parcelaRel?: {
    id_parcela: number;
    codigo_parcela: string;
    nombre_legal: string;
    proyecto: string;
  };
}
export interface Area {
  id: number;
  name: string;
  managerId?: number | null;
  createdAt?: string;
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  closedAt?: string;
  creatorId: number;
  assignedToId?: number;
  areaId: number;
  creator: User;
  assignedTo?: User;
  area: Area;
  comments: Comment[];
  transfers: TransferRequest[];
  history: TicketHistory[];
}

export interface Comment {
  id: number;
  content: string;
  createdAt: string;
  userId: number;
  user: User;
  ticketId?: number;
  ticketTIId?: number;
}

export interface TransferRequest {
  id: number;
  ticketId: number;
  fromAreaId: number;
  toAreaId: number;
  requestedById: number;
  status: string;
  approvedById?: number;
  createdAt: string;
  updatedAt: string;
  fromArea: Area;
  toArea: Area;
  requestedBy: User;
  approvedBy?: User;
}

export interface TicketHistory {
  id: number;
  ticketId: number;
  action: string;
  oldValue?: string;
  newValue?: string;
  userId: number;
  createdAt: string;
  user: User;
}

export interface CreateTicketData {
  title: string;
  description: string;
  priority?: string;
  assignedToId?: number;
}

export interface AddCommentData {
  content: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface TicketTI {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  closedAt?: string;
  creatorId: number;
  assignedToId?: number;
  area: string;
  creator: User;
  assignedTo?: User;
  comments: Comment[];
}

export interface CreateTicketTIData {
  title: string;
  description: string;
  priority: 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';
}

export interface TicketsMetadata {
  total: number;
  closed: number;
  showingClosed: boolean;
  hasClosedTickets: boolean;
}

export interface TicketsResponse {
  tickets: Ticket[];
  metadata: TicketsMetadata;
}

export interface TicketsTIResponse {
  tickets: TicketTI[];
  metadata: TicketsMetadata;
}