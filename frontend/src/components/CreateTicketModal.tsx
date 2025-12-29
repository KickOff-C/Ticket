import React, { useState, useEffect } from 'react';
import { User, CreateTicketData } from '../types';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './CreateTicketModal.css';

interface CreateTicketModalProps {
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

const CreateTicketModal: React.FC<CreateTicketModalProps> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState<CreateTicketData>({
    entrada: '',
    ejecutiva: '',
    prioridad: 'MEDIA',
    estado: 'ABIERTO',
    area: '',
    parcela: '',
    proyecto: '',
    propietario: '',
    motivo: '',
    comentario: '',
    asignadoA: '',
    assignedToId: undefined,
    fechaInicio: new Date().toISOString()
  });
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState('');
  const { user: currentUser } = useAuth();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (currentUser?.name) {
      setFormData(prev => ({ ...prev, ejecutiva: prev.ejecutiva || currentUser.name || '' }));
    }
  }, [currentUser]);

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

    if (!formData.motivo.trim() || !formData.comentario.trim()) {
      setError('Motivo y comentario son requeridos');
      setLoading(false);
      return;
    }

    try {
      await onSubmit({
        ...formData,
        fechaInicio: formData.fechaInicio ?? new Date().toISOString(),
      });
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

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="entrada">Entrada *</label>
              <input
                type="text"
                id="entrada"
                name="entrada"
                value={formData.entrada}
                onChange={handleChange}
                required
                placeholder="Número o referencia de entrada"
              />
            </div>

            <div className="form-group">
              <label htmlFor="ejecutiva">Ejecutiva *</label>
              <input
                type="text"
                id="ejecutiva"
                name="ejecutiva"
                value={formData.ejecutiva}
                onChange={handleChange}
                required
                placeholder="Nombre de la ejecutiva"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="prioridad">Prioridad</label>
              <select
                id="prioridad"
                name="prioridad"
                value={formData.prioridad}
                onChange={handleChange}
              >
                <option value="BAJA">Baja</option>
                <option value="MEDIA">Media</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="estado">Estado</label>
              <select
                id="estado"
                name="estado"
                value={formData.estado}
                onChange={handleChange}
              >
                <option value="ABIERTO">Abierto</option>
                <option value="EN_PROGRESO">En progreso</option>
                <option value="CERRADO">Cerrado</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="fechaInicio">Fecha Inicio</label>
              <input
                type="datetime-local"
                id="fechaInicio"
                name="fechaInicio"
                value={formData.fechaInicio?.slice(0, 16)}
                onChange={handleChange}
                disabled
              />
              <div className="help-text">Se establece automáticamente al crear</div>
            </div>

            <div className="form-group">
              <label htmlFor="area">Área</label>
              <input
                type="text"
                id="area"
                name="area"
                value={formData.area}
                onChange={handleChange}
                placeholder="Área responsable"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="parcela">Parcela</label>
              <input
                type="text"
                id="parcela"
                name="parcela"
                value={formData.parcela}
                onChange={handleChange}
                placeholder="Identificador de parcela"
              />
            </div>

            <div className="form-group">
              <label htmlFor="proyecto">Proyecto</label>
              <input
                type="text"
                id="proyecto"
                name="proyecto"
                value={formData.proyecto}
                onChange={handleChange}
                placeholder="Proyecto asociado"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="propietario">Propietario</label>
              <input
                type="text"
                id="propietario"
                name="propietario"
                value={formData.propietario}
                onChange={handleChange}
                placeholder="Nombre del propietario"
              />
            </div>

            <div className="form-group">
              <label htmlFor="motivo">Motivo *</label>
              <input
                type="text"
                id="motivo"
                name="motivo"
                value={formData.motivo}
                onChange={handleChange}
                required
                maxLength={150}
                placeholder="Razón principal del ticket"
              />
              <div className="character-count">{formData.motivo.length}/150</div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="comentario">Comentario *</label>
            <textarea
              id="comentario"
              name="comentario"
              value={formData.comentario}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Detalle o comentario del ticket"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="asignadoA">Asignado a (texto)</label>
              <input
                type="text"
                id="asignadoA"
                name="asignadoA"
                value={formData.asignadoA ?? ''}
                onChange={handleChange}
                placeholder="Nombre o usuario asignado"
              />
              <div className="help-text">Se enviará junto a la asignación por lista si corresponde</div>
            </div>

            {canAssignTickets && (
              <div className="form-group">
                <label htmlFor="assignedToId">Asignado a (usuarios del área)</label>
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
                  Solo managers y admins pueden asignar tickets desde la lista
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