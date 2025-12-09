import React, { useState, useEffect } from 'react';
import { Ticket, TicketTI, User, Comment } from '../types';
import { ticketService } from '../services/ticketService';
import { ticketTIService } from '../services/ticketTIService';
import { userService } from '../services/userService';
import './TicketDetailModal.css';

interface TicketDetailModalProps {
  ticket: Ticket | TicketTI | null;
  onClose: () => void;
  onUpdate: (updatedTicket?: Ticket | TicketTI) => void;
  isTITicket?: boolean;
  user?: User | null;
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket,
  onClose,
  onUpdate,
  isTITicket = false,
  user
}) => {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'history'>('details');
  const [currentTicket, setCurrentTicket] = useState<Ticket | TicketTI | null>(ticket);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);

  useEffect(() => {
    if (ticket) {
      setCurrentTicket(ticket);
      loadComments();
    }
  }, [ticket]);

  useEffect(() => {
    if (showAssignModal) {
      loadUsers();
    }
  }, [showAssignModal]);

  const loadComments = async () => {
    if (!currentTicket) return;
    
    try {
      if (currentTicket.comments) {
        setComments(currentTicket.comments);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const loadUsers = async () => {
    if (!currentTicket || !user) {
      console.log('❌ No hay ticket o usuario');
      return;
    }
    
    try {
      console.log('🔍 DEBUG - Usuario logueado:', {
        id: user.id,
        name: user.name,
        role: user.role,
        areaId: user.areaId
      });

      console.log('🔍 DEBUG - Ticket actual:', currentTicket);
      
      // CORREGIDO: Lógica mejorada para cargar usuarios según tipo de ticket
      if (isTITicket) {
        console.log('🎯 Cargando usuarios para asignación TI...');
        const tiUsers = await userService.getUsersForTIAssignment();
        console.log('✅ Usuarios TI encontrados:', tiUsers);
        setUsers(tiUsers);
      } else {
        // Para tickets normales, cargar usuarios del área del ticket
        if ('area' in currentTicket && currentTicket.area) {
          console.log('🎯 Cargando usuarios para área:', currentTicket.area.id, currentTicket.area.name);
          const areaUsers = await userService.getUsersByArea(currentTicket.area.id);
          console.log('✅ Usuarios encontrados:', areaUsers);
          
          // Filtrar usuarios (excluir managers y superadmins para asignación)
          const filteredUsers = areaUsers.filter(u => 
            u.role !== 'MANAGER' && u.role !== 'SUPERADMIN'
          );
          
          console.log('👥 Usuarios filtrados para asignación:', filteredUsers);
          setUsers(filteredUsers);
        } else {
          console.log('❌ El ticket no tiene área definida');
          setUsers([]);
          setError('El ticket no tiene un área asignada');
        }
      }
    } catch (error: any) {
      console.error('❌ Error cargando usuarios:', error);
      console.error('📊 Response error:', error.response?.data);
      setError(error.response?.data?.error || 'Error al cargar usuarios disponibles');
      setUsers([]);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !currentTicket) return;

    setLoading(true);
    setError('');

    try {
      let updatedTicket;
      
      if (isTITicket) {
        updatedTicket = await ticketTIService.addComment(currentTicket.id, { content: comment });
      } else {
        updatedTicket = await ticketService.addComment(currentTicket.id, { content: comment });
      }
      
      setComment('');
      
      // Actualizar el estado local con el ticket actualizado
      if (updatedTicket) {
        setCurrentTicket(updatedTicket);
        setComments(updatedTicket.comments || []);
        onUpdate(updatedTicket);
      } else {
        await loadComments();
        onUpdate();
      }
      
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al agregar comentario');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!currentTicket) return;

    setLoading(true);
    try {
      let updatedTicket;
      if (isTITicket) {
        updatedTicket = await ticketTIService.updateStatus(currentTicket.id, newStatus);
      } else {
        updatedTicket = await ticketService.updateStatus(currentTicket.id, newStatus);
      }
      
      // Actualizar el estado local
      if (updatedTicket) {
        setCurrentTicket(updatedTicket);
        onUpdate(updatedTicket);
      } else {
        onUpdate();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al actualizar estado');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!currentTicket) return;

    if (!window.confirm('¿Estás seguro de que quieres cerrar este ticket?')) {
      return;
    }

    setLoading(true);
    try {
      let updatedTicket;
      if (isTITicket) {
        updatedTicket = await ticketTIService.closeTicket(currentTicket.id);
      } else {
        updatedTicket = await ticketService.closeTicket(currentTicket.id);
      }
      
      // Actualizar el estado local
      if (updatedTicket) {
        setCurrentTicket(updatedTicket);
        onUpdate(updatedTicket);
      } else {
        onUpdate();
      }
      
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cerrar ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToUser = async (userId: number) => {
    if (!currentTicket) return;

    setAssignLoading(true);
    try {
      let updatedTicket;
      if (isTITicket) {
        // CORREGIDO: Usar assignTicket en lugar de assignToUser
        updatedTicket = await ticketTIService.assignTicket(currentTicket.id, userId);
      } else {
        updatedTicket = await ticketService.assignToUser(currentTicket.id, userId);
      }
      
      if (updatedTicket) {
        setCurrentTicket(updatedTicket);
        onUpdate(updatedTicket);
        setShowAssignModal(false);
      } else {
        onUpdate();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al asignar ticket');
    } finally {
      setAssignLoading(false);
    }
  };

  const getHistoryIcon = (action: string) => {
    switch (action) {
      case 'SOLICITUD_TRANSFERENCIA': return '🔄';
      case 'TRANSFERENCIA_APROBADA': return '✅';
      case 'TRANSFERENCIA_RECHAZADA': return '❌';
      case 'AREA_CAMBIADA': return '🏢';
      case 'COMMENT_ADDED': return '💬';
      case 'TICKET_CREATED': return '🎫';
      case 'STATUS_CHANGED': return '📊';
      case 'TICKET_CLOSED': return '🔒';
      case 'TICKET_ASIGNADO': return '👤';
      case 'TICKET_TI_ASIGNADO': return '🖥️';
      case 'TICKET_TI_CERRADO': return '🔒';
      case 'TICKET_TI_CREATED': return '🎫';
      default: return '📝';
    }
  };

  const getHistoryActionText = (action: string) => {
    switch (action) {
      case 'SOLICITUD_TRANSFERENCIA': return 'Solicitud de Transferencia';
      case 'TRANSFERENCIA_APROBADA': return 'Transferencia Aprobada';
      case 'TRANSFERENCIA_RECHAZADA': return 'Transferencia Rechazada';
      case 'AREA_CAMBIADA': return 'Área Cambiada';
      case 'COMMENT_ADDED': return 'Comentario Agregado';
      case 'TICKET_CREATED': return 'Ticket Creado';
      case 'STATUS_CHANGED': return 'Estado Cambiado';
      case 'TICKET_CLOSED': return 'Ticket Cerrado';
      case 'TICKET_ASIGNADO': return 'Ticket Asignado';
      case 'TICKET_TI_ASIGNADO': return 'Ticket TI Asignado';
      case 'TICKET_TI_CERRADO': return 'Ticket TI Cerrado';
      case 'TICKET_TI_CREATED': return 'Ticket TI Creado';
      default: return action;
    }
  };

  if (!currentTicket) return null;

  const canComment = user && (
    isTITicket 
      ? currentTicket.creatorId === user.id || user.area?.name === 'TI' || user.role === 'SUPERADMIN'
      : true
  );

  const canChangeStatus = user && (
    isTITicket
      ? currentTicket.creatorId === user.id || currentTicket.assignedToId === user.id || user.area?.name === 'TI' || user.role === 'SUPERADMIN'
      : currentTicket.creatorId === user.id || currentTicket.assignedToId === user.id || user.role === 'MANAGER' || user.role === 'ADMIN' || user.role === 'SUPERADMIN'
  );

  const canClose = user && (
    isTITicket
      ? currentTicket.creatorId === user.id || user.area?.name === 'TI' || user.role === 'SUPERADMIN'
      : currentTicket.creatorId === user.id
  );

  const canAssign = user && (
    isTITicket
      ? user.area?.name === 'TI' || user.role === 'SUPERADMIN'
      : (user.role === 'MANAGER' && user.areaId === (currentTicket as Ticket).areaId) || 
        user.role === 'ADMIN' || 
        user.role === 'SUPERADMIN'
  );

  // Combinar y ordenar historial y transferencias
  const allHistory = [
    ...('history' in currentTicket && currentTicket.history ? 
      currentTicket.history.map((item: any) => ({ ...item, type: 'history' })) : []),
    ...('transfers' in currentTicket && currentTicket.transfers ? 
      currentTicket.transfers.map((item: any) => ({ ...item, type: 'transfer' })) : [])
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ticket-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <h2>
              {isTITicket ? '🖥️ ' : '🎫 '}
              {currentTicket.title}
            </h2>
            <div className="ticket-meta">
              <span className={`status-badge status-${currentTicket.status.toLowerCase()}`}>
                {currentTicket.status}
              </span>
              <span className={`priority-badge priority-${currentTicket.priority.toLowerCase()}`}>
                {currentTicket.priority}
              </span>
              {isTITicket && <span className="type-badge">TI</span>}
            </div>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Tabs */}
          <div className="modal-tabs">
            <button 
              className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              📋 Detalles
            </button>
            <button 
              className={`tab-button ${activeTab === 'comments' ? 'active' : ''}`}
              onClick={() => setActiveTab('comments')}
            >
              💬 Comentarios ({comments.length})
            </button>
            <button 
              className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              📊 Historial ({allHistory.length})
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          {/* Detalles del Ticket */}
          {activeTab === 'details' && (
            <div className="details-content">
              <div className="detail-section">
                <h3>Descripción</h3>
                <p className="description">{currentTicket.description}</p>
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <label>Creado por:</label>
                  <span>{'creator' in currentTicket ? currentTicket.creator.name : 'Usuario'}</span>
                </div>
                
                {'area' in currentTicket && currentTicket.area && (
                  <div className="detail-item">
                    <label>Área:</label>
                    <span>{currentTicket.area.name}</span>
                  </div>
                )}

                <div className="detail-item">
                  <label>Fecha creación:</label>
                  <span>{new Date(currentTicket.createdAt).toLocaleString()}</span>
                </div>

                <div className="detail-item">
                  <label>Última actividad:</label>
                  <span>{new Date(currentTicket.lastActivityAt).toLocaleString()}</span>
                </div>

                {currentTicket.assignedTo ? (
                  <div className="detail-item">
                    <label>Asignado a:</label>
                    <span>{currentTicket.assignedTo.name}</span>
                  </div>
                ) : (
                  <div className="detail-item">
                    <label>Asignado a:</label>
                    <span className="no-assigned">No asignado</span>
                  </div>
                )}

                {currentTicket.closedAt && (
                  <div className="detail-item">
                    <label>Cerrado en:</label>
                    <span>{new Date(currentTicket.closedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div className="actions-section">
                <h3>Acciones</h3>
                <div className="action-buttons">
                  {canAssign && currentTicket.status !== 'CERRADO' && (
                    currentTicket.assignedTo ? (
                      <button
                        onClick={() => setShowAssignModal(true)}
                        disabled={loading}
                        className="btn btn-outline"
                      >
                        🔄 Reasignar
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowAssignModal(true)}
                        disabled={loading}
                        className="btn btn-info"
                      >
                        👤 Asignar Ticket
                      </button>
                    )
                  )}
                  
                  {canChangeStatus && currentTicket.status !== 'CERRADO' && (
                    <>
                      {currentTicket.status !== 'EN_PROGRESO' && (
                        <button
                          onClick={() => handleStatusChange('EN_PROGRESO')}
                          disabled={loading}
                          className="btn btn-warning"
                        >
                          ▶️ Iniciar Progreso
                        </button>
                      )}
                      {currentTicket.status !== 'ABIERTO' && (
                        <button
                          onClick={() => handleStatusChange('ABIERTO')}
                          disabled={loading}
                          className="btn btn-secondary"
                        >
                          ⏸️ Pausar
                        </button>
                      )}
                    </>
                  )}
                  
                  {canClose && currentTicket.status !== 'CERRADO' && (
                    <button
                      onClick={handleCloseTicket}
                      disabled={loading}
                      className="btn btn-danger"
                    >
                      ✅ Cerrar Ticket
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Comentarios */}
          {activeTab === 'comments' && (
            <div className="comments-content">
              <div className="comments-list">
                {comments.length === 0 ? (
                  <div className="empty-comments">
                    <p>No hay comentarios aún</p>
                  </div>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="comment-item">
                      <div className="comment-header">
                        <strong>{comment.user.name}</strong>
                        <span className="comment-date">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="comment-content">
                        {comment.content}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {canComment && currentTicket.status !== 'CERRADO' && (
                <form onSubmit={handleAddComment} className="comment-form">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Escribe tu comentario..."
                    rows={4}
                    disabled={loading}
                  />
                  <button 
                    type="submit" 
                    disabled={!comment.trim() || loading}
                    className="btn btn-primary"
                  >
                    {loading ? 'Enviando...' : '💬 Enviar Comentario'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Historial */}
          {activeTab === 'history' && (
            <div className="history-content">
              <div className="history-list">
                {allHistory.length === 0 ? (
                  <div className="empty-history">
                    <p>No hay historial disponible</p>
                  </div>
                ) : (
                  allHistory.map((item: any) => (
                    <div key={`${item.type}-${item.id}`} className="history-item">
                      <div className="history-icon">
                        {item.type === 'transfer' ? 
                          (item.status === 'PENDIENTE' ? '⏳' : 
                           item.status === 'APROBADA' ? '✅' : '❌') :
                          getHistoryIcon(item.action)}
                      </div>
                      <div className="history-details">
                        <strong>
                          {item.type === 'transfer' ? 
                            (item.status === 'PENDIENTE' ? 'Transferencia Pendiente' : 
                             item.status === 'APROBADA' ? 'Transferencia Aprobada' : 'Transferencia Rechazada') :
                            getHistoryActionText(item.action)}
                        </strong>
                        
                        {item.type === 'transfer' ? (
                          <>
                            <span>De: {item.fromArea.name} → A: {item.toArea.name}</span>
                            <span>Solicitado por: {item.requestedBy.name}</span>
                            {item.approvedBy && <span>Aprobado por: {item.approvedBy.name}</span>}
                          </>
                        ) : (
                          <>
                            <span>por {item.user?.name || 'Sistema'}</span>
                            {item.oldValue && item.newValue && (
                              <span className="change-details">
                                De: <strong>{item.oldValue}</strong> → A: <strong>{item.newValue}</strong>
                              </span>
                            )}
                            {item.details && <span className="history-details-text">{item.details}</span>}
                          </>
                        )}
                        
                        <small className="history-date">
                          {new Date(item.createdAt).toLocaleString('es-ES')}
                        </small>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Asignación */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content assign-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👤 {currentTicket.assignedTo ? 'Reasignar' : 'Asignar'} Ticket {isTITicket ? 'TI' : ''}</h3>
              <button 
                className="close-button" 
                onClick={() => setShowAssignModal(false)}
                disabled={assignLoading}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <p>Selecciona un usuario para asignar este ticket{isTITicket ? ' TI' : ''}:</p>
              
              <div className="users-list">
                {users.length === 0 ? (
                  <div className="no-users">
                    <p>No hay usuarios disponibles {isTITicket ? 'para asignación TI' : 'en esta área'}</p>
                    <p className="no-users-sub">Contacta al administrador para agregar usuarios.</p>
                  </div>
                ) : (
                  users.map(userItem => (
                    <div 
                      key={userItem.id} 
                      className={`user-item ${userItem.id === currentTicket.assignedToId ? 'selected' : ''}`}
                      onClick={() => !assignLoading && handleAssignToUser(userItem.id)}
                    >
                      <div className="user-avatar">
                        {userItem.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-info">
                        <strong>{userItem.name}</strong>
                        <span>{userItem.email} • {userItem.role} {userItem.area && `• ${userItem.area.name}`}</span>
                      </div>
                      {assignLoading && (
                        <div className="assign-loading">🔄</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDetailModal;