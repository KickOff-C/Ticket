// src/routes/index.ts
import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import areaRoutes from './areas';
import ticketRoutes from './tickets';
import ticketTIRoutes from './ticketsTI';
import transferRoutes from './transfer';
import metricsRoutes from './metrics';

const router = Router();

// ========== RUTAS PÚBLICAS ==========
router.use('/auth', authRoutes);

// ========== RUTAS PROTEGIDAS ==========
router.use('/users', userRoutes);
router.use('/areas', areaRoutes);
router.use('/tickets', ticketRoutes);
router.use('/tickets-ti', ticketTIRoutes);
router.use('/transfers', transferRoutes);
router.use('/metrics', metricsRoutes);

// ========== RUTA DE SALUD ==========
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Ticket System API',
    version: '1.0.0'
  });
});

router.get('/routes', (req, res) => {
  const routes = {
    message: 'Rutas disponibles en la API',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: {
        path: '/api/auth',
        methods: {
          'POST /login': 'Iniciar sesión',
          'GET /profile': 'Obtener perfil (requiere token)',
          'PUT /change-password': 'Cambiar contraseña (requiere token)',
          'POST /refresh': 'Refrescar token',
          'POST /verify': 'Verificar token',
          'GET /check/:username': 'Verificar si usuario existe',
          'PUT /profile': 'Actualizar perfil (requiere token)',
          'POST /logout': 'Cerrar sesión (requiere token)',
          'POST /initialize-ticket-data': 'Inicializar datos tickets (requiere token)',
          'PUT /update-session': 'Actualizar última sesión (requiere token)',
          'GET /stats': 'Estadísticas de autenticación (requiere token)'
        }
      },
      users: {
        path: '/api/users',
        methods: {
          'GET /area': 'Usuarios de mi área (requiere token)',
          'GET /area/:areaId': 'Usuarios por área específica (requiere token)',
          'GET /': 'Todos los usuarios (requiere SuperAdmin)',
          'GET /ti-assignable': 'Usuarios para asignación TI (requiere token)',
          'GET /:id': 'Usuario específico (requiere token)',
          'GET /role/:role': 'Usuarios por rol (requiere SuperAdmin)',
          'GET /profile/:id': 'Perfil de usuario (requiere token)',
          'POST /': 'Crear usuario (requiere SuperAdmin)',
          'PUT /:id': 'Actualizar usuario (requiere token/SuperAdmin)',
          'PUT /:id/toggle-status': 'Activar/desactivar usuario (requiere SuperAdmin)',
          'PUT /:id/role': 'Cambiar rol de usuario (requiere SuperAdmin)',
          'POST /:id/reset-password': 'Restablecer contraseña (requiere SuperAdmin)',
          'GET /stats': 'Estadísticas de usuarios (requiere token)',
          'GET /activity': 'Actividad de usuarios (requiere token)'
        }
      },
      areas: {
        path: '/api/areas',
        methods: {
          'GET /': 'Listar todas las áreas (requiere token)',
          'GET /:id/with-users': 'Área con usuarios (requiere token)',
          'GET /:id/metrics': 'Métricas por área (requiere token)',
          'PUT /:id/manager': 'Actualizar manager del área (requiere Manager/Admin)',
          'POST /': 'Crear área (requiere SuperAdmin)',
          'PUT /:id': 'Actualizar área (requiere SuperAdmin)',
          'DELETE /:id': 'Eliminar área (requiere SuperAdmin)',
          'GET /my/users': 'Usuarios de mi área (para managers)'
        }
      },
      tickets: {
        path: '/api/tickets',
        methods: {
          'POST /': 'Crear ticket general (requiere token)',
          'GET /': 'Listar tickets (requiere token)',
          'GET /:id': 'Obtener ticket específico (requiere token)',
          'POST /:id/comments': 'Agregar comentario (requiere token)',
          'PUT /:id/close': 'Cerrar ticket (requiere token)',
          'PUT /:id/status': 'Actualizar estado (requiere Manager/Admin)',
          'PUT /:id/assign': 'Asignar ticket a usuario (requiere Manager/Admin)'
        }
      },
      ticketsTI: {
        path: '/api/tickets-ti',
        methods: {
          'POST /': 'Crear ticket TI (requiere token)',
          'GET /': 'Listar tickets TI (requiere token)',
          'GET /assigned': 'Tickets TI asignados a mí (requiere token)',
          'GET /:id': 'Obtener ticket TI específico (requiere token)',
          'POST /:id/comments': 'Agregar comentario TI (requiere token)',
          'PUT /:id/assign': 'Asignar ticket TI (requiere Admin/SuperAdmin)',
          'PUT /:id/status': 'Actualizar estado TI (requiere Admin/SuperAdmin)',
          'PUT /:id/close': 'Cerrar ticket TI (requiere token)'
        }
      },
      transfers: {
        path: '/api/transfers',
        methods: {
          'POST /': 'Solicitar transferencia (requiere token)',
          'GET /pending': 'Transferencias pendientes (requiere Manager/Admin)',
          'PUT /:id/process': 'Procesar transferencia (requiere Manager/Admin)',
          'GET /history': 'Historial de transferencias (requiere token)',
          'GET /:id': 'Obtener transferencia específica (requiere token)',
          'PUT /:id/cancel': 'Cancelar transferencia (requiere token)'
        }
      },
      metrics: {
        path: '/api/metrics',
        methods: {
          'GET /dashboard': 'Métricas del dashboard (requiere token)',
          'GET /tickets-trend': 'Tendencia de tickets (requiere token)',
          'GET /area/:id': 'Métricas por área (requiere token)',
          'GET /my-stats': 'Mis estadísticas (requiere token)',
          'GET /my-area': 'Métricas de mi área (requiere token)',
          'GET /all-areas': 'Todas las áreas (requiere Admin/SuperAdmin)',
          'GET /users-activity': 'Actividad de usuarios (requiere Admin/SuperAdmin)',
          'GET /transfers': 'Métricas transferencias (requiere Admin/SuperAdmin)',
          'GET /system': 'Sistema completo (requiere SuperAdmin)',
          'GET /audit': 'Auditoría (requiere SuperAdmin)',
          'GET /tickets': 'Métricas tickets filtradas (requiere token)',
          'GET /comments': 'Métricas comentarios (requiere token)',
          'GET /realtime': 'Métricas tiempo real (requiere token)'
        }
      }
    },
    system: {
      'GET /health': 'Verificar estado del sistema',
      'GET /routes': 'Lista de rutas disponibles (esta ruta)',
      'GET /system': 'Información del sistema (requiere SuperAdmin)'
    }
  };
  
  res.status(200).json(routes);
});
// ========== MANEJO DE RUTAS NO ENCONTRADAS ==========
router.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

export default router;