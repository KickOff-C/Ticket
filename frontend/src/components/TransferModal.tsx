import React, { useState, useEffect } from 'react';
import { Ticket, Area } from '../types';
import { api } from '../services/api';
import './TransferModal.css';

interface TransferModalProps {
  ticket: Ticket;
  onClose: () => void;
  onSuccess: () => void;
}

const TransferModal: React.FC<TransferModalProps> = ({ ticket, onClose, onSuccess }) => {
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAreas();
  }, []);

  const loadAreas = async () => {
    try {
      // Intentar cargar áreas desde el backend
      try {
        const response = await api.get('/api/areas');
        const allAreas = response.data;
        
        // Filtrar para excluir el área actual del ticket
        const availableAreas = allAreas.filter((area: Area) => area.id !== ticket.areaId);
        setAreas(availableAreas);
      } catch (apiError) {
        // Si falla el endpoint, usar áreas hardcodeadas
        console.log('Usando áreas hardcodeadas');
        const hardcodedAreas: Area[] = [
          { id: 1, name: 'Atención Propietarios', createdAt: new Date().toISOString() },
          { id: 2, name: 'Cobranzas', createdAt: new Date().toISOString() },
          { id: 3, name: 'TI', createdAt: new Date().toISOString() }
        ];
        
        // Filtrar para excluir el área actual del ticket
        const availableAreas = hardcodedAreas.filter(area => area.id !== ticket.areaId);
        setAreas(availableAreas);
      }
    } catch (error) {
      console.error('Error loading areas:', error);
      // Fallback final a áreas hardcodeadas
      const fallbackAreas: Area[] = [
        { id: 1, name: 'Atención Propietarios', createdAt: new Date().toISOString() },
        { id: 2, name: 'Cobranzas', createdAt: new Date().toISOString() },
        { id: 3, name: 'TI', createdAt: new Date().toISOString() }
      ].filter(area => area.id !== ticket.areaId);
      setAreas(fallbackAreas);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAreaId) {
      setError('Por favor selecciona un área destino');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/transfers/request', {
        ticketId: ticket.id,
        toAreaId: selectedAreaId
      });

      console.log('RESPUESTA COMPLETA:', response);
      console.log('DATA:', response.data);
      console.log('STATUS:', response.status);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error completo:', err);
      console.error('Response:', err.response);

      const errorMessage = err.response?.data?.error || 
                        err.message || 
                        'Error al solicitar transferencia';
      setError(errorMessage);
    } finally {
      setLoading(false);
  }

    /*} catch (err: any) {
      setError(err.response?.data?.error || 'Error al solicitar transferencia');
    } finally {
      setLoading(false);
    }*/
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ABIERTO': return '🟡';
      case 'EN_PROGRESO': return '🔵';
      case 'CERRADO': return '🟢';
      default: return '⚪';
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content transfer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔄 Transferir Ticket</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {/* Información del Ticket */}
        <div className="ticket-info">
          <h3 className="ticket-title">{ticket.title}</h3>
          <div className="ticket-details-grid">
            <div className="detail-item">
              <span className="detail-label">Área actual:</span>
              <span className="detail-value">{ticket.area?.name}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Creado por:</span>
              <span className="detail-value">{ticket.creator.name}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Estado:</span>
              <span className={`status status-${ticket.status.toLowerCase()}`}>
                {getStatusIcon(ticket.status)} {ticket.status}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Prioridad:</span>
              <span className={`priority priority-${ticket.priority.toLowerCase()}`}>
                {getPriorityIcon(ticket.priority)} {ticket.priority}
              </span>
            </div>
          </div>
        </div>

        {/* Formulario de Transferencia */}
        <form onSubmit={handleSubmit} className="transfer-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="area">Seleccionar Área Destino:</label>
            <select
              id="area"
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(Number(e.target.value))}
              disabled={loading}
            >
              <option value={0}>Selecciona un área...</option>
              {areas.map(area => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
            {areas.length === 0 && (
              <div className="help-text">
                No hay otras áreas disponibles para transferencia
              </div>
            )}
          </div>

          {/* Información de la Transferencia */}
          <div className="transfer-info">
            <h4>💡 Información sobre la transferencia:</h4>
            <ul>
              <li>La transferencia debe ser aprobada por un manager/admin del área destino</li>
              <li>El ticket será desasignado al cambiar de área</li>
              <li>El área actual podrá ver el estado pero no intervenir</li>
              <li>Se notificará a los usuarios correspondientes</li>
            </ul>
          </div>

          {/* Acciones */}
          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !selectedAreaId || areas.length === 0}
            >
              {loading ? '🔄 Enviando...' : '📤 Solicitar Transferencia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransferModal;