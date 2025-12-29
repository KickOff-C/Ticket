import { Area, User, Ticket, TicketTI, Comment, TransferRequest } from '../types';

export const mapAreaFromBackend = (area: any): Area => ({
  id: area?.id_area ?? area?.id ?? 0,
  name: area?.nombre_area ?? area?.name ?? 'Área sin nombre',
  managerId: area?.TK_managerId ?? area?.managerId ?? null,
  createdAt: area?.TK_createdAt ?? area?.createdAt,
});

export const mapUserFromBackend = (user: any): User => ({
  id: user?.Id_Ejecutivo ?? user?.id ?? 0,
  name: user?.Nombre ?? user?.name ?? user?.nombre ?? '',
  email: user?.Correo ?? user?.email ?? user?.correo,
  username: user?.Login ?? user?.username ?? user?.login,
  role: user?.role ?? user?.ticketData?.role ?? user?.rol,
  areaId: user?.id_area ?? user?.areaId ?? user?.area?.id_area ?? null,
  isActive: user?.activo ? user?.activo === 1 : user?.isActive,
  area: user?.area ? mapAreaFromBackend(user.area) : undefined,
  createdAt: user?.createdAt,
  updatedAt: user?.updatedAt,
});

export const mapCommentFromBackend = (comment: any): Comment => ({
  id: comment?.id,
  content: comment?.content ?? comment?.comentario ?? '',
  createdAt: comment?.createdAt ?? new Date().toISOString(),
  userId: comment?.userId ?? comment?.Id_Ejecutivo,
  user: comment?.user ? mapUserFromBackend(comment.user) : { id: comment?.userId ?? 0 },
});

export const mapTicketFromBackend = (ticket: any): Ticket => ({
  id: ticket?.id,
  title: ticket?.title ?? ticket?.titulo ?? ticket?.motivo ?? ticket?.Motivo ?? '',
  description: ticket?.description ?? ticket?.descripcion ?? ticket?.comentario ?? ticket?.Comentario ?? '',
  status: ticket?.status ?? ticket?.estado ?? ticket?.Estado ?? 'ABIERTO',
  priority: ticket?.priority ?? ticket?.prioridad ?? ticket?.Prioridad ?? 'MEDIA',
  createdAt: ticket?.createdAt ?? new Date().toISOString(),
  updatedAt: ticket?.updatedAt ?? ticket?.createdAt ?? new Date().toISOString(),
  lastActivityAt: ticket?.lastActivityAt ?? ticket?.updatedAt ?? ticket?.createdAt ?? new Date().toISOString(),
  closedAt: ticket?.closedAt,
  creatorId: ticket?.creatorId,
  assignedToId: ticket?.assignedToId ?? undefined,
  areaId: ticket?.areaId ?? ticket?.area?.id_area,
  entrada: ticket?.entrada ?? ticket?.Entrada ?? '',
  ejecutiva: ticket?.ejecutiva ?? ticket?.Ejecutiva ?? ticket?.creator?.name,
  prioridad: ticket?.prioridad ?? ticket?.Prioridad ?? ticket?.priority ?? 'MEDIA',
  fechaInicio: ticket?.fechaInicio ?? ticket?.FechaInicio ?? ticket?.createdAt,
  estado: ticket?.estado ?? ticket?.Estado ?? ticket?.status ?? 'ABIERTO',
  parcela: ticket?.parcela ?? ticket?.Parcela ?? '',
  proyecto: ticket?.proyecto ?? ticket?.Proyecto ?? '',
  propietario: ticket?.propietario ?? ticket?.Propietario ?? '',
  motivo: ticket?.motivo ?? ticket?.Motivo ?? ticket?.title ?? '',
  comentario: ticket?.comentario ?? ticket?.Comentario ?? ticket?.description ?? '',
  asignadoA: ticket?.asignadoA ?? ticket?.AsignadoA ?? ticket?.assignedTo?.name,
  creator: ticket?.creator ? mapUserFromBackend(ticket.creator) : { id: ticket?.creatorId ?? 0 },
  assignedTo: ticket?.assignedTo ? mapUserFromBackend(ticket.assignedTo) : undefined,
  area: ticket?.area ? mapAreaFromBackend(ticket.area) : { id: ticket?.areaId ?? 0, name: 'Área desconocida' },
  comments: Array.isArray(ticket?.comments) ? ticket.comments.map(mapCommentFromBackend) : [],
  transfers: ticket?.transfers?.map(mapTransferFromBackend) ?? [],
  history: ticket?.history ?? [],
});

export const mapTicketTIFromBackend = (ticket: any): TicketTI => ({
  id: ticket?.id,
  title: ticket?.title ?? ticket?.titulo ?? '',
  description: ticket?.description ?? ticket?.descripcion ?? '',
  status: ticket?.status ?? 'ABIERTO',
  priority: ticket?.priority ?? 'MEDIA',
  createdAt: ticket?.createdAt ?? new Date().toISOString(),
  updatedAt: ticket?.updatedAt ?? ticket?.createdAt ?? new Date().toISOString(),
  lastActivityAt: ticket?.lastActivityAt ?? ticket?.updatedAt ?? ticket?.createdAt ?? new Date().toISOString(),
  closedAt: ticket?.closedAt,
  creatorId: ticket?.creatorId,
  assignedToId: ticket?.assignedToId ?? undefined,
  area: ticket?.area ?? 'TI',
  creator: ticket?.creator ? mapUserFromBackend(ticket.creator) : { id: ticket?.creatorId ?? 0 },
  assignedTo: ticket?.assignedTo ? mapUserFromBackend(ticket.assignedTo) : undefined,
  comments: Array.isArray(ticket?.comments) ? ticket.comments.map(mapCommentFromBackend) : [],
});

export const mapTransferFromBackend = (transfer: any): TransferRequest => ({
  id: transfer?.id,
  ticketId: transfer?.ticketId,
  fromAreaId: transfer?.fromAreaId,
  toAreaId: transfer?.toAreaId,
  requestedById: transfer?.requestedById,
  status: transfer?.status ?? '',
  approvedById: transfer?.approvedById,
  createdAt: transfer?.createdAt ?? new Date().toISOString(),
  updatedAt: transfer?.updatedAt ?? new Date().toISOString(),
  fromArea: transfer?.fromArea ? mapAreaFromBackend(transfer.fromArea) : { id: transfer?.fromAreaId ?? 0, name: 'Área desconocida' },
  toArea: transfer?.toArea ? mapAreaFromBackend(transfer.toArea) : { id: transfer?.toAreaId ?? 0, name: 'Área desconocida' },
  requestedBy: transfer?.requestedBy ? mapUserFromBackend(transfer.requestedBy) : { id: transfer?.requestedById ?? 0 },
  approvedBy: transfer?.approvedBy ? mapUserFromBackend(transfer.approvedBy) : undefined,
  ticket: transfer?.ticket ? mapTicketFromBackend(transfer.ticket) : undefined,
});
