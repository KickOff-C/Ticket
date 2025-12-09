import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './CreateTicketModal.css';

interface CreateTicketModalProps {
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

interface CreateTicketData {
  title: string;
  description: string;
  priority: string;
  assignedToId?: number;
}

const CreateTicketModal: React.FC<CreateTicketModalProps> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState<CreateTicketData>({
    title: '',
    description: '',
    priority: 'MEDIA',
    assignedToId: undefined
  });
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState('');
  const { user: currentUser } = useAuth();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      // Solo cargar usuarios si el usuario actual puede asignar tickets
      if (currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERADMIN') {
        const response = await api.get('/users/area-users');
        setUsers(response.data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

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
      setError(err.response?.data?.error || 'Error al crear el ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'assignedToId' ? (value ? parseInt(value) : undefined) : value
    }));
  };

  const canAssignTickets = currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERADMIN';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Crear Nuevo Ticket</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="ticket-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="title">Título *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              maxLength={100}
              placeholder="Resumen breve del problema..."
            />
            <div className="character-count">{formData.title.length}/100</div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Descripción *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={5}
              placeholder="Describe detalladamente el problema o solicitud..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="priority">Prioridad</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="BAJA">Baja</option>
                <option value="MEDIA">Media</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>

            {canAssignTickets && (
              <div className="form-group">
                <label htmlFor="assignedToId">Asignar a</label>
                <select
                  id="assignedToId"
                  name="assignedToId"
                  value={formData.assignedToId || ''}
                  onChange={handleChange}
                  disabled={loadingUsers}
                >
                  <option value="">No asignar</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </option>
                  ))}
                </select>
                {loadingUsers && (
                  <div className="help-text">Cargando usuarios...</div>
                )}
                <div className="help-text">
                  Solo managers y admins pueden asignar tickets
                </div>
              </div>
            )}
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
              {loading ? 'Creando...' : 'Crear Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicketModal;