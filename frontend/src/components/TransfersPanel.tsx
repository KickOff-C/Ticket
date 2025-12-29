import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { mapTransferFromBackend } from '../services/mappers';
import './TransfersPanel.css';

interface Transfer {
  id: number;
  ticketId: number;
  fromAreaId: number;
  toAreaId: number;
  requestedById: number;
  status: string;
  approvedById?: number;
  createdAt: string;
  updatedAt: string;
  ticket: {
    id: number;
    title: string;
    status: string;
    priority: string;
    creator: {
      id: number;
      name: string;
    };
    area: {
      id: number;
      name: string;
    };
    assignedTo?: {
      id: number;
      name: string;
    };
    // AGREGAR ESTOS CAMPOS QUE VIENEN DEL BACKEND
    creatorId: number;
    areaId: number;
    assignedToId?: number;
    comments?: any[];
  };
  fromArea: {
    id: number;
    name: string;
  };
  toArea: {
    id: number;
    name: string;
  };
  requestedBy: {
    id: number;
    name: string;
    email?: string;
    username?: string;
  };
  approvedBy?: {
    id: number;
    name: string;
  };
}

interface TransfersPanelProps {
  onClose: () => void;
  onUpdate: () => void;
}

const TransfersPanel: React.FC<TransfersPanelProps> = ({ onClose, onUpdate }) => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTransfers();
  }, []);

  const loadTransfers = async () => {
    try {
      const response = await api.get('/transfers/pending');
      console.log('✅ Respuesta del backend:', response.data);
      setTransfers(response.data.map(mapTransferFromBackend));
    } catch (err: any) {
      console.error('❌ Error completo:', err); // ← AGREGAR ESTO
    console.error('❌ Response error:', err.response); // ← AGREGAR ESTO
      setError(err.response?.data?.error || 'Error al cargar transferencias');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessTransfer = async (transferId: number, action: 'approve' | 'reject') => {
    setProcessing(transferId);
    setError('');

    try {
      await api.put(`/transfers/${transferId}/process`, { action });
      await loadTransfers(); // Recargar la lista
      onUpdate(); // Notificar al dashboard para actualizar tickets
    } catch (err: any) {
      setError(err.response?.data?.error || `Error al ${action === 'approve' ? 'aprobar' : 'rechazar'} transferencia`);
    } finally {
      setProcessing(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDIENTE': return '#f39c12';
      case 'APROBADA': return '#27ae60';
      case 'RECHAZADA': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENTE': return '#e74c3c';
      case 'ALTA': return '#e67e22';
      case 'MEDIA': return '#f1c40f';
      case 'BAJA': return '#2ecc71';
      default: return '#95a5a6';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const pendingTransfers = transfers.filter(t => t.status === 'PENDIENTE');
  const processedTransfers = transfers.filter(t => t.status !== 'PENDIENTE');

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content transfers-panel" onClick={(e) => e.stopPropagation()}>
          <div className="loading">🔄 Cargando transferencias...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content transfers-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2>🔄 Panel de Transferencias</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Transferencias Pendientes */}
        <div className="transfers-section">
          <h3>⏳ Transferencias Pendientes ({pendingTransfers.length})</h3>
          
          {pendingTransfers.length === 0 ? (
            <p className="no-data">No hay transferencias pendientes</p>
          ) : (
            <div className="transfers-list">
              {pendingTransfers.map(transfer => (
                <div key={transfer.id} className="transfer-card pending">
                  <div className="transfer-header">
                    <h4>{transfer.ticket.title}</h4>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(transfer.status) }}
                    >
                      {transfer.status}
                    </span>
                  </div>

                  <div className="transfer-info">
                    <div className="info-row">
                      <span><strong>📋 Ticket:</strong> {transfer.ticket.title}</span>
                      <span 
                        className="priority-badge"
                        style={{ backgroundColor: getPriorityColor(transfer.ticket.priority) }}
                      >
                        {transfer.ticket.priority}
                      </span>
                    </div>
                    <div className="info-row">
                      <span><strong>👤 Creado por:</strong> {transfer.ticket.creator.name}</span>
                    </div>
                    <div className="info-row">
                      <span><strong>🏢 De:</strong> {transfer.fromArea.name}</span>
                      <span>→</span>
                      <span><strong>🏢 A:</strong> {transfer.toArea.name}</span>
                    </div>
                    <div className="info-row">
                      <span><strong>🙋 Solicitado por:</strong> {transfer.requestedBy.name}</span>
                    </div>
                    <div className="info-row">
                      <span><strong>📅 Fecha solicitud:</strong> {formatDate(transfer.createdAt)}</span>
                    </div>
                  </div>

                  <div className="transfer-actions">
                    <button
                      onClick={() => handleProcessTransfer(transfer.id, 'approve')}
                      disabled={processing === transfer.id}
                      className="approve-button"
                    >
                      {processing === transfer.id ? '🔄' : '✅'} Aprobar
                    </button>
                    <button
                      onClick={() => handleProcessTransfer(transfer.id, 'reject')}
                      disabled={processing === transfer.id}
                      className="reject-button"
                    >
                      {processing === transfer.id ? '🔄' : '❌'} Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transferencias Procesadas */}
        <div className="transfers-section">
          <h3>📋 Historial de Transferencias ({processedTransfers.length})</h3>
          
          {processedTransfers.length === 0 ? (
            <p className="no-data">No hay transferencias procesadas</p>
          ) : (
            <div className="transfers-list">
              {processedTransfers.map(transfer => (
                <div key={transfer.id} className={`transfer-card ${transfer.status.toLowerCase()}`}>
                  <div className="transfer-header">
                    <h4>{transfer.ticket.title}</h4>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(transfer.status) }}
                    >
                      {transfer.status}
                    </span>
                  </div>

                  <div className="transfer-info">
                    <div className="info-row">
                      <span><strong>📋 Ticket:</strong> {transfer.ticket.title}</span>
                    </div>
                    <div className="info-row">
                      <span><strong>🏢 De:</strong> {transfer.fromArea.name}</span>
                      <span>→</span>
                      <span><strong>🏢 A:</strong> {transfer.toArea.name}</span>
                    </div>
                    <div className="info-row">
                      <span><strong>🙋 Solicitado por:</strong> {transfer.requestedBy.name}</span>
                    </div>
                    {transfer.approvedBy && (
                      <div className="info-row">
                        <span><strong>👤 Procesado por:</strong> {transfer.approvedBy.name}</span>
                      </div>
                    )}
                    <div className="info-row">
                      <span><strong>📅 Fecha:</strong> {formatDate(transfer.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransfersPanel;