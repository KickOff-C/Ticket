import React from 'react';
import { Ticket, TicketTI } from '../types';
import './TicketCard.css';

interface TicketCardProps {
  ticket: Ticket | TicketTI;
  onClick: (ticket: Ticket | TicketTI) => void;
  onTransfer?: (ticket: Ticket) => void;
  canTransfer?: boolean;
  isTITicket?: boolean;
}

const TicketCard: React.FC<TicketCardProps> = ({ 
  ticket, 
  onClick, 
  onTransfer, 
  canTransfer = false,
  isTITicket = false 
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ABIERTO': return '●';
      case 'EN_PROGRESO': return '⟳';
      case 'CERRADO': return '✓';
      default: return '○';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'URGENTE': return '🔥';
      case 'ALTA': return '🔴';
      case 'MEDIA': return '🟡';
      case 'BAJA': return '🔵';
      default: return '⚪';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getInactivityColor = (ticket: Ticket | TicketTI) => {
    const lastActivity = new Date(ticket.lastActivityAt);
    const now = new Date();
    const daysInactive = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysInactive >= 6) return '#e74c3c';
    if (daysInactive >= 3) return '#f39c12';
    return 'transparent';
  };

  const handleTransferClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTransfer && !isTITicket) {
      onTransfer(ticket as Ticket);
    }
  };

  // Para tickets TI, el área siempre es "TI"
  const areaName = isTITicket ? 'TI' : (ticket as Ticket).area?.name;

  return (
    <div 
      className={`ticket-card ${isTITicket ? 'ti-ticket' : ''}`}
      onClick={() => onClick(ticket)}
      style={{ 
        borderLeftColor: getInactivityColor(ticket)
      }}
    >
      {/* Header con título y tipo */}
      <div className="ticket-header">
        <div className="ticket-type">
          {isTITicket ? '🖥️ TI' : '🎫 GENERAL'}
        </div>
        <div className="ticket-status">
          <span className={`status status-${ticket.status.toLowerCase()}`}>
            {getStatusIcon(ticket.status)} {ticket.status}
          </span>
        </div>
      </div>

      {/* Título y descripción */}
      <div className="ticket-content">
        <h3 className="ticket-title">{ticket.title}</h3>
        <p className="ticket-description">{ticket.description}</p>
      </div>

      {/* Información principal en grid */}
      <div className="ticket-info-main">
        <div className="info-row">
          <div className="info-group">
            <span className="info-label">CREADO POR</span>
            <span className="info-value">{ticket.creator.name}</span>
          </div>
          <div className="info-group">
            <span className="info-label">ÁREA</span>
            <span className="info-value">{areaName}</span>
          </div>
        </div>

        <div className="info-row">
          <div className="info-group">
            <span className="info-label">ASIGNADO A</span>
            <span className="info-value assigned-to">
              {ticket.assignedTo ? ticket.assignedTo.name : 'Sin asignar'}
            </span>
          </div>
          <div className="info-group">
            <span className="info-label">CREADO</span>
            <span className="info-value">{formatDate(ticket.createdAt)}</span>
          </div>
        </div>

        <div className="info-row">
          <div className="info-group">
            <span className="info-label">ACTIVIDAD</span>
            <span className="info-value">{formatDate(ticket.lastActivityAt)}</span>
          </div>
          <div className="info-group">
            <span className="info-label">COMENTARIOS</span>
            <span className="info-value comments-count">
              {ticket.comments?.length || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Footer con prioridad y acciones */}
      <div className="ticket-footer">
        <div className="priority-section">
          <span className={`priority priority-${ticket.priority.toLowerCase()}`}>
            {getPriorityIcon(ticket.priority)} {ticket.priority}
          </span>
        </div>
        
        <div className="ticket-actions">
          <span className="ticket-id">#{ticket.id}</span>
          {canTransfer && !isTITicket && ticket.status !== 'CERRADO' && (
            <button 
              className="transfer-button"
              onClick={handleTransferClick}
              title="Transferir ticket"
            >
              Transferir
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketCard;