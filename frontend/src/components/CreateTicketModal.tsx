import React, { useState, useEffect } from 'react';
import { User, Parcela, Propietario } from '../types';
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
  entrada?: string;
  motivo?: string;
  parcelaId?: number;
  propietarioId?: number;
}

interface TicketTypes {
  tiposEntrada: Array<{ value: string; label: string }>;
  motivosTicket: Array<{ value: string; label: string }>;
}

const CreateTicketModal: React.FC<CreateTicketModalProps> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState<CreateTicketData>({
    title: '',
    description: '',
    priority: 'MEDIA',
    assignedToId: undefined,
    entrada: '',
    motivo: '',
    parcelaId: undefined,
    propietarioId: undefined
  });

  const [users, setUsers] = useState<User[]>([]);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [propietarios, setPropietarios] = useState<Propietario[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketTypes>({ tiposEntrada: [], motivosTicket: [] });
  
  const [searchParcela, setSearchParcela] = useState('');
  const [searchPropietario, setSearchPropietario] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingParcelas, setLoadingParcelas] = useState(false);
  const [loadingPropietarios, setLoadingPropietarios] = useState(false);
  
  const [error, setError] = useState('');
  const { user: currentUser } = useAuth();

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData();
  }, []);

  // Buscar parcelas cuando cambia el término de búsqueda
  useEffect(() => {
    if (searchParcela.trim().length >= 2) {
      const timer = setTimeout(() => {
        searchParcelas();
      }, 500);
      return () => clearTimeout(timer);
    } else if (searchParcela.trim() === '') {
      setParcelas([]);
    }
  }, [searchParcela]);

  // Buscar propietarios cuando cambia el término de búsqueda
  useEffect(() => {
    if (searchPropietario.trim().length >= 2) {
      const timer = setTimeout(() => {
        searchPropietarios();
      }, 500);
      return () => clearTimeout(timer);
    } else if (searchPropietario.trim() === '') {
      setPropietarios([]);
    }
  }, [searchPropietario]);

  const loadInitialData = async () => {
    try {
      // Cargar usuarios (si tiene permisos)
      if (canAssignTickets) {
        const usersResponse = await api.get('/users/area-users');
        setUsers(usersResponse.data);
      }

      // Cargar tipos de ticket
      const typesResponse = await api.get('/tickets/types');
      setTicketTypes(typesResponse.data);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoadingUsers(false);
      setLoadingTypes(false);
    }
  };

  const searchParcelas = async () => {
    try {
      setLoadingParcelas(true);
      const response = await api.get('/tickets/parcelas', {
        params: { search: searchParcela }
      });
      setParcelas(response.data);
    } catch (error) {
      console.error('Error searching parcelas:', error);
    } finally {
      setLoadingParcelas(false);
    }
  };

  const searchPropietarios = async () => {
    try {
      setLoadingPropietarios(true);
      const response = await api.get('/tickets/search-propietarios', {
        params: { search: searchPropietario }
      });
      setPropietarios(response.data);
    } catch (error) {
      console.error('Error searching propietarios:', error);
    } finally {
      setLoadingPropietarios(false);
    }
  };

  const loadPropietariosByParcela = async (parcelaId: number) => {
    try {
      setLoadingPropietarios(true);
      const response = await api.get(`/tickets/parcelas/${parcelaId}/propietarios`);
      setPropietarios(response.data.propietarios);
      // Limpiar propietario seleccionado si ya no está en la lista
      if (formData.propietarioId && !response.data.propietarios.some((p: Propietario) => p.id === formData.propietarioId)) {
        setFormData(prev => ({ ...prev, propietarioId: undefined }));
      }
    } catch (error) {
      console.error('Error loading propietarios:', error);
    } finally {
      setLoadingPropietarios(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validaciones básicas
    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Título y descripción son requeridos');
      setLoading(false);
      return;
    }

    try {
      // Preparar datos para enviar
      const submitData = {
        ...formData,
        // Asegurar que solo envíe valores definidos
        assignedToId: formData.assignedToId || undefined,
        parcelaId: formData.parcelaId || undefined,
        propietarioId: formData.propietarioId || undefined,
        entrada: formData.entrada || undefined,
        motivo: formData.motivo || undefined
      };

      await onSubmit(submitData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear el ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Manejo especial para campos numéricos
    if (name === 'assignedToId' || name === 'parcelaId' || name === 'propietarioId') {
      const numValue = value ? parseInt(value) : undefined;
      
      // Si seleccionamos una parcela, cargar sus propietarios
      if (name === 'parcelaId' && numValue) {
        loadPropietariosByParcela(numValue);
        // Limpiar búsqueda de propietarios
        setSearchPropietario('');
      }
      
      setFormData(prev => ({ ...prev, [name]: numValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const canAssignTickets = currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERADMIN';

  const handleParcelaSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParcela(e.target.value);
    // Si se limpia la búsqueda, también limpiar la parcela seleccionada
    if (e.target.value === '' && formData.parcelaId) {
      setFormData(prev => ({ ...prev, parcelaId: undefined }));
      setPropietarios([]);
    }
  };

  const handlePropietarioSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchPropietario(e.target.value);
    // Si se limpia la búsqueda, también limpiar el propietario seleccionado
    if (e.target.value === '' && formData.propietarioId) {
      setFormData(prev => ({ ...prev, propietarioId: undefined }));
    }
  };

  const selectParcela = (parcela: Parcela) => {
    setFormData(prev => ({ ...prev, parcelaId: parcela.id_parcela }));
    setSearchParcela(`${parcela.codigo_parcela} - ${parcela.nombre_legal}`);
    setParcelas([]);
    loadPropietariosByParcela(parcela.id_parcela);
  };

  const selectPropietario = (propietario: Propietario) => {
    setFormData(prev => ({ ...prev, propietarioId: propietario.id }));
    setSearchPropietario(`${propietario.nombre} - ${propietario.rut}`);
    setPropietarios([]);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-ticket-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Crear Nuevo Ticket</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="ticket-form">
          {error && <div className="error-message">{error}</div>}

          {/* Sección: Información básica del ticket */}
          <div className="form-section">
            <h3>Información del Ticket</h3>
            
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

              {loadingTypes ? (
                <div className="form-group">
                  <label>Cargando tipos...</label>
                  <div className="skeleton-input"></div>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label htmlFor="entrada">Tipo de Entrada</label>
                    <select
                      id="entrada"
                      name="entrada"
                      value={formData.entrada || ''}
                      onChange={handleChange}
                    >
                      <option value="">Seleccionar tipo</option>
                      {ticketTypes.tiposEntrada.map(tipo => (
                        <option key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="motivo">Motivo</label>
                    <select
                      id="motivo"
                      name="motivo"
                      value={formData.motivo || ''}
                      onChange={handleChange}
                    >
                      <option value="">Seleccionar motivo</option>
                      {ticketTypes.motivosTicket.map(motivo => (
                        <option key={motivo.value} value={motivo.value}>
                          {motivo.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sección: Parcela y Propietario */}
          <div className="form-section">
            <h3>Información de Parcela</h3>
            
            <div className="form-row">
              <div className="form-group search-group">
                <label htmlFor="parcelaSearch">Buscar Parcela</label>
                <input
                  type="text"
                  id="parcelaSearch"
                  value={searchParcela}
                  onChange={handleParcelaSearchChange}
                  placeholder="Código o nombre de parcela..."
                />
                {loadingParcelas && (
                  <div className="search-loading">Buscando...</div>
                )}
                {parcelas.length > 0 && (
                  <div className="search-results">
                    {parcelas.map(parcela => (
                      <div 
                        key={parcela.id_parcela}
                        className="search-result-item"
                        onClick={() => selectParcela(parcela)}
                      >
                        <strong>{parcela.codigo_parcela}</strong> - {parcela.nombre_legal}
                        <div className="result-subtitle">
                          {parcela.proyecto} • {parcela.sector}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {formData.parcelaId && (
                  <div className="selected-info">
                    Parcela seleccionada
                  </div>
                )}
              </div>

              <div className="form-group search-group">
                <label htmlFor="propietarioSearch">Buscar Propietario</label>
                <input
                  type="text"
                  id="propietarioSearch"
                  value={searchPropietario}
                  onChange={handlePropietarioSearchChange}
                  placeholder="Nombre o RUT del propietario..."
                  disabled={!!formData.parcelaId}
                />
                {formData.parcelaId && (
                  <div className="help-text">
                    Mostrando propietarios de la parcela seleccionada
                  </div>
                )}
                {loadingPropietarios && (
                  <div className="search-loading">Buscando...</div>
                )}
                {propietarios.length > 0 && (
                  <div className="search-results">
                    {propietarios.map(propietario => (
                      <div 
                        key={propietario.id}
                        className="search-result-item"
                        onClick={() => selectPropietario(propietario)}
                      >
                        <strong>{propietario.nombre}</strong> - {propietario.rut}
                        <div className="result-subtitle">
                          {propietario.mail} • {propietario.fono}
                          {propietario.parcelaRel && (
                            <span> • Parcela: {propietario.parcelaRel.codigo_parcela}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {formData.propietarioId && (
                  <div className="selected-info">
                    Propietario seleccionado
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sección: Asignación */}
          {canAssignTickets && (
            <div className="form-section">
              <h3>Asignación del Ticket</h3>
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
            </div>
          )}

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