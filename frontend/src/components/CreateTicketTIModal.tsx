import React, { useState } from 'react';
import { CreateTicketTIData } from '../types';
import './CreateTicketTIModal.css';

interface CreateTicketTIModalProps {
  onClose: () => void;
  onSubmit: (data: CreateTicketTIData) => Promise<void>;
}

const CreateTicketTIModal: React.FC<CreateTicketTIModalProps> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState<CreateTicketTIData>({
    title: '',
    description: '',
    priority: 'MEDIA'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Título y descripción son requeridos');
      setLoading(false);
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear el ticket TI');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ticket-ti-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🖥️ Nuevo Ticket TI</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="ti-info">
          <div className="ti-icon">🔧</div>
          <div className="ti-text">
            <h3>Soporte Técnico Especializado</h3>
            <p>Este ticket será atendido exclusivamente por el área de Tecnologías de la Información</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="ticket-ti-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="title">Título del Problema *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              maxLength={100}
              placeholder="Describe brevemente el problema técnico..."
            />
            <div className="character-count">{formData.title.length}/100</div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Descripción Detallada *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={6}
              placeholder="Proporciona todos los detalles técnicos del problema:
• Sistema/Software afectado
• Mensajes de error específicos
• Pasos para reproducir el problema
• Impacto en el trabajo
• Cualquier información técnica relevante..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="priority">Nivel de Urgencia</label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
            >
              <option value="BAJA">Baja - No afecta el trabajo normal</option>
              <option value="MEDIA">Media - Afecta algunas funciones</option>
              <option value="ALTA">Alta - Impide trabajo importante</option>
              <option value="URGENTE">Urgente - Sistema crítico caído</option>
            </select>
          </div>

          <div className="ti-guidelines">
            <h4>📋 Para una mejor atención:</h4>
            <ul>
              <li>Incluye capturas de pantalla si es posible</li>
              <li>Especifica el equipo y sistema operativo</li>
              <li>Menciona si el problema es recurrente</li>
              <li>Proporciona horarios en que ocurre el problema</li>
            </ul>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="cancel-button"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading ? 'Creando...' : '🖥️ Crear Ticket TI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicketTIModal;