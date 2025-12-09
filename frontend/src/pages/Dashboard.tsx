import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Ticket, TicketTI } from '../types';
import { ticketService } from '../services/ticketService';
import { ticketTIService } from '../services/ticketTIService';
import TicketCard from '../components/TicketCard';
import CreateTicketModal from '../components/CreateTicketModal';
import CreateTicketTIModal from '../components/CreateTicketTIModal';
import TicketDetailModal from '../components/TicketDetailModal';
import TransferModal from '../components/TransferModal';
import TransfersPanel from '../components/TransfersPanel';
import MetricsDashboard from '../components/MetricsDashboard';
import './Dashboard.css';

// Tipos para los filtros
type PriorityFilter = 'TODAS' | 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAJA';
type StatusFilter = 'TODOS' | 'ABIERTO' | 'EN_PROGRESO' | 'CERRADO';
type AreaFilter = 'TODAS' | string; // string será el ID del área

interface FiltersState {
  priority: PriorityFilter;
  status: StatusFilter;
  area: AreaFilter;
}

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [tiTickets, setTiTickets] = useState<TicketTI[]>([]);
  const [loading, setLoading] = useState(true);
  const [tiLoading, setTiLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateTIModal, setShowCreateTIModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showTransfersPanel, setShowTransfersPanel] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedTITicket, setSelectedTITicket] = useState<TicketTI | null>(null);
  const [transferTicket, setTransferTicket] = useState<Ticket | null>(null);
  const [activeSection, setActiveSection] = useState<'general' | 'ti' | 'metrics'>('general');
  const [error, setError] = useState('');
  const [areas, setAreas] = useState<Array<{ id: string; name: string }>>([]);
  
  // Estados para filtros
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FiltersState>({
    priority: 'TODAS',
    status: 'TODOS',
    area: 'TODAS'
  });
  
  const [ticketsMetadata, setTicketsMetadata] = useState({ 
    total: 0, 
    closed: 0, 
    showingClosed: false, 
    hasClosedTickets: false 
  });
  const [tiTicketsMetadata, setTiTicketsMetadata] = useState({ 
    total: 0, 
    closed: 0, 
    showingClosed: false, 
    hasClosedTickets: false 
  });

  const ticketsGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTickets();
    // En un caso real, cargarías las áreas desde tu API
    // loadAreas();
  }, []);

  useEffect(() => {
    if (activeSection === 'ti') {
      loadTicketsTI();
    }
  }, [activeSection]);

  const loadTickets = async () => {
    try {
      setError('');
      const response = await ticketService.getTickets();
      setTickets(response.tickets);
      setTicketsMetadata(response.metadata);
    } catch (error: any) {
      console.error('Error loading tickets:', error);
      setError('Error al cargar tickets generales');
    } finally {
      setLoading(false);
    }
  };

  const loadTicketsTI = async () => {
    setTiLoading(true);
    setError('');
    try {
      const response = await ticketTIService.getTicketsTI();
      setTiTickets(response.tickets);
      setTiTicketsMetadata(response.metadata);
    } catch (error: any) {
      console.error('Error loading TI tickets:', error);
      setError('Error al cargar tickets TI');
    } finally {
      setTiLoading(false);
    }
  };

  // Función para cargar áreas (ejemplo)
  const loadAreas = async () => {
    try {
      // Aquí iría tu llamada a la API para obtener las áreas
      // const areasData = await areaService.getAreas();
      // setAreas(areasData);
      
      // Datos de ejemplo
      const exampleAreas = [
        { id: '1', name: 'Ventas' },
        { id: '2', name: 'Soporte' },
        { id: '3', name: 'Desarrollo' },
        { id: '4', name: 'TI' },
      ];
      setAreas(exampleAreas);
    } catch (error) {
      console.error('Error loading areas:', error);
    }
  };

  const handleCreateTicket = async (ticketData: any) => {
    try {
      setError('');
      const newTicket = await ticketService.createTicket(ticketData);
      setTickets(prev => [newTicket, ...prev]);
      setShowCreateModal(false);
      
      setTicketsMetadata(prev => ({
        ...prev,
        total: prev.total + 1
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Error al crear ticket';
      setError(errorMessage);
      throw error;
    }
  };

  const handleCreateTicketTI = async (ticketData: any) => {
    try {
      setError('');
      const newTicket = await ticketTIService.createTicketTI(ticketData);
      setTiTickets(prev => [newTicket, ...prev]);
      setShowCreateTIModal(false);
      
      setTiTicketsMetadata(prev => ({
        ...prev,
        total: prev.total + 1
      }));
      
      if (activeSection === 'general') {
        setActiveSection('ti');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Error al crear ticket TI';
      setError(errorMessage);
      throw error;
    }
  };

  const handleLogout = () => {
    logout();
  };

  const openTicketDetail = (ticket: Ticket | TicketTI) => {
    if (activeSection === 'general') {
      setSelectedTicket(ticket as Ticket);
      setSelectedTITicket(null);
    } else {
      setSelectedTITicket(ticket as TicketTI);
      setSelectedTicket(null);
    }
  };

  const closeTicketDetail = () => {
    setSelectedTicket(null);
    setSelectedTITicket(null);
  };

  const handleTicketUpdate = (updatedTicket?: Ticket | TicketTI) => {
    if (updatedTicket) {
      if (activeSection === 'general') {
        setTickets(prev => prev.map(t => 
          t.id === updatedTicket.id ? updatedTicket as Ticket : t
        ));
      } else if (activeSection === 'ti') {
        setTiTickets(prev => prev.map(t => 
          t.id === updatedTicket.id ? updatedTicket as TicketTI : t
        ));
      }
    } else {
      if (activeSection === 'general') {
        loadTickets();
      } else if (activeSection === 'ti') {
        loadTicketsTI();
      }
    }
  };

  const openTransferModal = (ticket: Ticket) => {
    setTransferTicket(ticket);
    setShowTransferModal(true);
  };

  const closeTransferModal = () => {
    setTransferTicket(null);
    setShowTransferModal(false);
  };

  const handleTransferSuccess = () => {
    loadTickets();
    setShowTransferModal(false);
  };

  // Funciones para scroll horizontal
  const scrollLeft = () => {
    if (ticketsGridRef.current) {
      ticketsGridRef.current.scrollBy({ left: -400, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (ticketsGridRef.current) {
      ticketsGridRef.current.scrollBy({ left: 400, behavior: 'smooth' });
    }
  };

  // Función para manejar cambios en filtros
  const handleFilterChange = (filterType: keyof FiltersState, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Función para resetear todos los filtros
  const resetFilters = () => {
    setFilters({
      priority: 'TODAS',
      status: 'TODOS',
      area: 'TODAS'
    });
  };

  // Función para aplicar filtros
  const applyFilters = (tickets: Ticket[] | TicketTI[]) => {
    return tickets.filter(ticket => {
      // Filtro por prioridad
      if (filters.priority !== 'TODAS' && ticket.priority !== filters.priority) {
        return false;
      }
      
      // Filtro por estado
      if (filters.status !== 'TODOS' && ticket.status !== filters.status) {
        return false;
      }
      
      // Filtro por área (solo para tickets generales)
      if (activeSection === 'general' && filters.area !== 'TODAS') {
        const areaTicket = ticket as Ticket;
        if (areaTicket.area?.id !== filters.area) {
          return false;
        }
      }
      
      return true;
    });
  };

  const canManageTransfers = user?.role === 'MANAGER' || user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
  const isTIUser = user?.area?.name === 'TI' || user?.role === 'SUPERADMIN';

  const currentMetadata = activeSection === 'general' ? ticketsMetadata : 
                         activeSection === 'ti' ? tiTicketsMetadata : 
                         { total: 0, closed: 0, showingClosed: false, hasClosedTickets: false };

  const currentTickets = activeSection === 'general' ? tickets : 
                        activeSection === 'ti' ? tiTickets : [];

  const currentLoading = activeSection === 'general' ? loading : 
                        activeSection === 'ti' ? tiLoading : false;

  // Aplicar todos los filtros
  const filteredTickets = applyFilters(currentTickets.filter(ticket => {
    // Filtrar por permisos para sección TI
    if (activeSection === 'ti') {
      return isTIUser || ticket.creatorId === user?.id;
    }
    return true;
  }));

  // Calcular estadísticas
  const statsGeneral = {
    total: ticketsMetadata.total,
    abiertos: tickets.filter(t => t.status === 'ABIERTO').length,
    enProgreso: tickets.filter(t => t.status === 'EN_PROGRESO').length,
    cerrados: ticketsMetadata.closed,
  };

  const statsTI = {
    total: tiTicketsMetadata.total,
    abiertos: tiTickets.filter(t => t.status === 'ABIERTO').length,
    enProgreso: tiTickets.filter(t => t.status === 'EN_PROGRESO').length,
    cerrados: tiTicketsMetadata.closed,
  };

  const currentStats = activeSection === 'general' ? statsGeneral : 
                     activeSection === 'ti' ? statsTI : 
                     { total: 0, abiertos: 0, enProgreso: 0, cerrados: 0 };

  // Calcular conteos para filtros
  const priorityCounts = {
    TODAS: currentTickets.length,
    URGENTE: currentTickets.filter(t => t.priority === 'URGENTE').length,
    ALTA: currentTickets.filter(t => t.priority === 'ALTA').length,
    MEDIA: currentTickets.filter(t => t.priority === 'MEDIA').length,
    BAJA: currentTickets.filter(t => t.priority === 'BAJA').length,
  };

  const statusCounts = {
    TODOS: currentTickets.length,
    ABIERTO: currentTickets.filter(t => t.status === 'ABIERTO').length,
    EN_PROGRESO: currentTickets.filter(t => t.status === 'EN_PROGRESO').length,
    CERRADO: currentTickets.filter(t => t.status === 'CERRADO').length,
  };

  // Función para renderizar filtros desplegables
  const renderFiltersSection = () => {
    if (activeSection === 'metrics') return null;

    const priorityOptions = [
      { value: 'TODAS' as PriorityFilter, label: 'Todas las prioridades', icon: '📋', color: '#667eea' },
      { value: 'URGENTE' as PriorityFilter, label: 'Urgente', icon: '🔥', color: '#dc2626' },
      { value: 'ALTA' as PriorityFilter, label: 'Alta', icon: '🔴', color: '#ea580c' },
      { value: 'MEDIA' as PriorityFilter, label: 'Media', icon: '🟡', color: '#ca8a04' },
      { value: 'BAJA' as PriorityFilter, label: 'Baja', icon: '🔵', color: '#16a34a' },
    ];

    const statusOptions = [
      { value: 'TODOS' as StatusFilter, label: 'Todos los estados', icon: '📊', color: '#667eea' },
      { value: 'ABIERTO' as StatusFilter, label: 'Abierto', icon: '🟡', color: '#d97706' },
      { value: 'EN_PROGRESO' as StatusFilter, label: 'En Progreso', icon: '🔵', color: '#2563eb' },
      { value: 'CERRADO' as StatusFilter, label: 'Cerrado', icon: '🟢', color: '#059669' },
    ];

    const hasActiveFilters = filters.priority !== 'TODAS' || filters.status !== 'TODOS' || filters.area !== 'TODAS';

    return (
      <div className="filters-section">
        <div className="filters-header" onClick={() => setShowFilters(!showFilters)}>
          <div className="filters-title">
            <span className="filters-icon">🎯</span>
            <span>Filtros</span>
            {hasActiveFilters && <span className="active-filters-badge">Activos</span>}
          </div>
          <div className="filters-toggle">
            <span className={`toggle-arrow ${showFilters ? 'open' : ''}`}>▼</span>
          </div>
        </div>
        
        <div className={`filters-content ${showFilters ? 'open' : ''}`}>
          {/* Filtro de Prioridad */}
          <div className="filter-group">
            <div className="filter-group-header">
              <span className="filter-group-title">Prioridad</span>
              <span className="filter-count">({priorityCounts[filters.priority]})</span>
            </div>
            <div className="filter-options">
              {priorityOptions.map((option) => (
                <button
                  key={option.value}
                  className={`filter-option ${filters.priority === option.value ? 'active' : ''}`}
                  onClick={() => handleFilterChange('priority', option.value)}
                  style={{ '--option-color': option.color } as React.CSSProperties}
                  title={option.label}
                >
                  <span className="option-icon">{option.icon}</span>
                  <span className="option-label">{option.label}</span>
                  <span className="option-count">{priorityCounts[option.value]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Filtro de Estado */}
          <div className="filter-group">
            <div className="filter-group-header">
              <span className="filter-group-title">Estado</span>
              <span className="filter-count">({statusCounts[filters.status]})</span>
            </div>
            <div className="filter-options">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  className={`filter-option ${filters.status === option.value ? 'active' : ''}`}
                  onClick={() => handleFilterChange('status', option.value)}
                  style={{ '--option-color': option.color } as React.CSSProperties}
                  title={option.label}
                >
                  <span className="option-icon">{option.icon}</span>
                  <span className="option-label">{option.label}</span>
                  <span className="option-count">{statusCounts[option.value]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Filtro de Área (solo para tickets generales) */}
          {activeSection === 'general' && areas.length > 0 && (
            <div className="filter-group">
              <div className="filter-group-header">
                <span className="filter-group-title">Área</span>
              </div>
              <div className="filter-options">
                <button
                  className={`filter-option ${filters.area === 'TODAS' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('area', 'TODAS')}
                  style={{ '--option-color': '#667eea' } as React.CSSProperties}
                >
                  <span className="option-icon">🏢</span>
                  <span className="option-label">Todas las áreas</span>
                </button>
                {areas.map((area) => (
                  <button
                    key={area.id}
                    className={`filter-option ${filters.area === area.id ? 'active' : ''}`}
                    onClick={() => handleFilterChange('area', area.id)}
                    style={{ '--option-color': '#8b5cf6' } as React.CSSProperties}
                  >
                    <span className="option-icon">👥</span>
                    <span className="option-label">{area.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Botón para resetear filtros */}
          {hasActiveFilters && (
            <div className="filter-actions">
              <button className="btn-reset-filters" onClick={resetFilters}>
                🗑️ Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Función para mostrar información de filtros activos
  const renderActiveFiltersInfo = () => {
    const activeFilters = [];
    
    if (filters.priority !== 'TODAS') {
      const priorityLabels = {
        'URGENTE': 'Urgente 🔥',
        'ALTA': 'Alta 🔴',
        'MEDIA': 'Media 🟡',
        'BAJA': 'Baja 🔵'
      };
      activeFilters.push(`Prioridad: ${priorityLabels[filters.priority]}`);
    }
    
    if (filters.status !== 'TODOS') {
      const statusLabels = {
        'ABIERTO': 'Abierto 🟡',
        'EN_PROGRESO': 'En Progreso 🔵',
        'CERRADO': 'Cerrado 🟢'
      };
      activeFilters.push(`Estado: ${statusLabels[filters.status]}`);
    }
    
    if (filters.area !== 'TODAS' && activeSection === 'general') {
      const area = areas.find(a => a.id === filters.area);
      activeFilters.push(`Área: ${area?.name || filters.area}`);
    }

    if (activeFilters.length === 0) return null;

    return (
      <div className="active-filters-info">
        <div className="active-filters-header">
          <span className="active-filters-icon">🎯</span>
          <span>Filtros aplicados:</span>
        </div>
        <div className="active-filters-list">
          {activeFilters.map((filter, index) => (
            <span key={index} className="active-filter-tag">
              {filter}
              <button 
                className="remove-filter"
                onClick={() => {
                  if (filter.includes('Prioridad:')) setFilters(prev => ({...prev, priority: 'TODAS'}));
                  if (filter.includes('Estado:')) setFilters(prev => ({...prev, status: 'TODOS'}));
                  if (filter.includes('Área:')) setFilters(prev => ({...prev, area: 'TODAS'}));
                }}
              >
                ×
              </button>
            </span>
          ))}
          <button className="clear-all-filters" onClick={resetFilters}>
            Limpiar todos
          </button>
        </div>
      </div>
    );
  };

  const renderSectionContent = () => {
    if (activeSection === 'metrics') {
      return <MetricsDashboard />;
    }

    return (
      <>
        {/* Statistics */}
        <section className="stats-section">
          <div className="stats-grid">
            <div className="stat-card total">
              <div className="stat-icon">📊</div>
              <div className="stat-info">
                <h3>Total</h3>
                <span className="stat-number">{currentStats.total}</span>
              </div>
            </div>
            <div className="stat-card abiertos">
              <div className="stat-icon">🟡</div>
              <div className="stat-info">
                <h3>Abiertos</h3>
                <span className="stat-number">{currentStats.abiertos}</span>
              </div>
            </div>
            <div className="stat-card en-progreso">
              <div className="stat-icon">🔵</div>
              <div className="stat-info">
                <h3>En Progreso</h3>
                <span className="stat-number">{currentStats.enProgreso}</span>
              </div>
            </div>
            <div className="stat-card cerrados">
              <div className="stat-icon">🟢</div>
              <div className="stat-info">
                <h3>Cerrados</h3>
                <span className="stat-number">{currentStats.cerrados}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Tickets Section con Layout Horizontal */}
        <section className="tickets-section">
          <div className="section-header">
            <h2>
              {activeSection === 'general' ? '🎫 Tickets Generales' : '🖥️ Tickets de Soporte TI'}
              <span className="ticket-count">({filteredTickets.length})</span>
            </h2>
            <div className="section-actions">
              {activeSection === 'general' ? (
                <>
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="btn btn-primary"
                  >
                    ➕ Crear Ticket
                  </button>
                  <button 
                    onClick={() => setShowCreateTIModal(true)}
                    className="btn btn-warning"
                  >
                    🖥️ Ticket TI
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setShowCreateTIModal(true)}
                  className="btn btn-warning"
                >
                  🖥️ Nuevo Ticket TI
                </button>
              )}
            </div>
          </div>

          {/* Sección de Filtros Desplegables */}
          {renderFiltersSection()}

          {/* Información de filtros activos */}
          {renderActiveFiltersInfo()}

          {/* Tickets Container con Scroll Horizontal */}
          <div className="tickets-container">
            {currentLoading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Cargando tickets...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  {activeSection === 'general' ? '📭' : '🖥️'}
                </div>
                <h3>
                  No hay tickets que coincidan con los filtros
                </h3>
                <p>
                  {currentTickets.length === 0 
                    ? activeSection === 'general' 
                      ? 'Crea tu primer ticket para comenzar'
                      : isTIUser 
                        ? 'No hay tickets de soporte técnico pendientes'
                        : 'Crea un ticket de soporte técnico'
                    : 'Intenta cambiar los filtros o eliminar algunos para ver más resultados'
                  }
                </p>
                <div className="empty-state-actions">
                  {(filters.priority !== 'TODAS' || filters.status !== 'TODOS' || filters.area !== 'TODAS') && (
                    <button 
                      className="btn btn-outline"
                      onClick={resetFilters}
                    >
                      📋 Ver todos los tickets
                    </button>
                  )}
                  {currentTickets.length === 0 && activeSection === 'ti' && !isTIUser && (
                    <button 
                      className="btn btn-warning"
                      onClick={() => setShowCreateTIModal(true)}
                    >
                      🖥️ Crear Ticket TI
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="tickets-grid" ref={ticketsGridRef}>
                  {filteredTickets.map(ticket => (
                    <TicketCard
                      key={activeSection === 'general' ? `g-${ticket.id}` : `ti-${ticket.id}`}
                      ticket={ticket}
                      onClick={openTicketDetail}
                      onTransfer={activeSection === 'general' ? openTransferModal : undefined}
                      canTransfer={
                        activeSection === 'general' && 
                        (user?.areaId === (ticket as Ticket).areaId || user?.role === 'SUPERADMIN') &&
                        ticket.status !== 'CERRADO'
                      }
                      isTITicket={activeSection === 'ti'}
                    />
                  ))}
                </div>
                
                {/* Controles de Scroll Horizontal */}
                {filteredTickets.length > 2 && (
                  <div className="scroll-controls">
                    <button className="scroll-btn" onClick={scrollLeft}>
                      ← Anterior
                    </button>
                    <button className="scroll-btn" onClick={scrollRight}>
                      Siguiente →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </>
    );
  };

  if (loading && activeSection === 'general') {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner-large"></div>
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-title">
            <h1>🚀 Sistema de Tickets</h1>
            <div className="user-info">
              <span className="welcome">Bienvenido, <strong>{user?.name}</strong></span>
              <span className="role">{user?.role} • {user?.area?.name}</span>
            </div>
          </div>
          
          <div className="header-actions">
            {canManageTransfers && activeSection !== 'metrics' && (
              <button 
                onClick={() => setShowTransfersPanel(true)}
                className="btn btn-secondary"
              >
                🔄 Transferencias
              </button>
            )}
            <button onClick={handleLogout} className="btn btn-danger">
              🚪 Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="section-nav">
          <button 
            className={`nav-tab ${activeSection === 'general' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('general');
              resetFilters();
            }}
          >
            🎫 Tickets Generales
            <span className="tab-count">{statsGeneral.total}</span>
          </button>
          <button 
            className={`nav-tab ${activeSection === 'ti' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('ti');
              resetFilters();
            }}
          >
            🖥️ Tickets TI
            <span className="tab-count">{statsTI.total}</span>
          </button>
          <button 
            className={`nav-tab ${activeSection === 'metrics' ? 'active' : ''}`}
            onClick={() => setActiveSection('metrics')}
          >
            📊 Métricas
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')} className="close-btn">×</button>
          </div>
        )}

        {renderSectionContent()}
      </main>

      {/* Modals */}
      {showCreateModal && (
        <CreateTicketModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTicket}
        />
      )}

      {showCreateTIModal && (
        <CreateTicketTIModal
          onClose={() => setShowCreateTIModal(false)}
          onSubmit={handleCreateTicketTI}
        />
      )}

      {(selectedTicket || selectedTITicket) && (
        <TicketDetailModal
          ticket={selectedTicket || selectedTITicket}
          onClose={closeTicketDetail}
          onUpdate={handleTicketUpdate}
          isTITicket={!!selectedTITicket}
          user={user}
        />
      )}

      {showTransferModal && transferTicket && (
        <TransferModal
          ticket={transferTicket}
          onClose={closeTransferModal}
          onSuccess={handleTransferSuccess}
        />
      )}

      {showTransfersPanel && canManageTransfers && (
        <TransfersPanel
          onClose={() => setShowTransfersPanel(false)}
          onUpdate={loadTickets}
        />
      )}
    </div>
  );
};

export default Dashboard;