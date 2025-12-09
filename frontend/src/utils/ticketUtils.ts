// src/utils/ticketUtils.ts

// Función para obtener el color basado en la inactividad
export const getInactivityColor = (lastUpdated: string): string => {
  const lastUpdate = new Date(lastUpdated);
  const now = new Date();
  const diffInHours = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
  
  if (diffInHours > 72) { // Más de 3 días
    return '#ff4d4f'; // Rojo
  } else if (diffInHours > 24) { // Más de 1 día
    return '#faad14'; // Amarillo/naranja
  } else {
    return '#52c41a'; // Verde
  }
};

// Función para obtener la clase CSS del estado
export const getStatusClass = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    'open': 'status-open',
    'pending': 'status-pending',
    'resolved': 'status-resolved',
    'closed': 'status-closed',
    'in-progress': 'status-in-progress'
  };
  return statusMap[status.toLowerCase()] || 'status-default';
};

// Función para obtener la clase CSS de la prioridad
export const getPriorityClass = (priority: string): string => {
  const priorityMap: { [key: string]: string } = {
    'low': 'priority-low',
    'medium': 'priority-medium',
    'high': 'priority-high',
    'urgent': 'priority-urgent'
  };
  return priorityMap[priority.toLowerCase()] || 'priority-default';
};

// Función para formatear fechas
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};