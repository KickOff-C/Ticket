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
  entrada?: string;
  ejecutiva?: string;
  prioridad?: string;
  fechaInicio?: string;
  estado?: string;
  parcela?: string;
  proyecto?: string;
  propietario?: string;
  motivo?: string;
  comentario?: string;
  asignadoA?: string;
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
  ticket?: Ticket;
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
  entrada: string;
  ejecutiva: string;
  prioridad: string;
  estado: string;
  area: string;
  parcela: string;
  proyecto: string;
  propietario: string;
  motivo: string;
  comentario: string;
  asignadoA?: string;
  assignedToId?: number;
  fechaInicio?: string;
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