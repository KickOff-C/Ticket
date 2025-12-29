import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginData } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  login: (credentials: LoginData) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Limpiar errores
  const clearError = () => setError(null);

  // Verificar y renovar token periódicamente
  useEffect(() => {
    const initAuth = async () => {
      const token = authService.getToken();
      const storedUser = authService.getStoredUser();

      if (token && storedUser) {
        try {
          // Verificar que el token sea válido
          const userProfile = await authService.getProfile();
          setUser(userProfile);
          
          // Actualizar storage con datos frescos
          localStorage.setItem('user', JSON.stringify(userProfile));
          setError(null);
        } catch (error) {
          console.error('Error verificando autenticación:', error);
          // Token inválido o expirado, limpiar todo
          authService.logout();
          setUser(null);
          setError('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
        }
      } else {
        // Limpiar estado si no hay token válido
        if (token || storedUser) {
          authService.logout();
        }
      }
      
      setLoading(false);
    };

    initAuth();
  }, []);

  // Efecto para limpiar errores cuando el usuario cambia
  useEffect(() => {
    if (user) {
      setError(null);
    }
  }, [user]);

  const login = async (credentials: LoginData) => {
    try {
      setLoading(true);
      setError(null);
      
      // Validaciones básicas del frontend
      if (!credentials.username?.trim() || !credentials.password) {
        throw new Error('Usuario y contraseña son requeridos');
      }

      const response = await authService.login(credentials);
      
      // Validar respuesta
      if (!response.user || !response.token) {
        throw new Error('Respuesta de autenticación inválida');
      }

      setUser(response.user);
      if (response.token) {
        localStorage.setItem('token', response.token);
      }
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken);
      }
      localStorage.setItem('user', JSON.stringify(response.user));
      
    } catch (error: any) {
      console.error('Error en login:', error);
      
      // Limpiar estado en caso de error
      setUser(null);
      authService.logout();
      
      // Manejar diferentes tipos de errores
      const errorMessage = error.response?.data?.error || 
                          error.message || 
                          'Error de conexión. Por favor intenta nuevamente.';
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setError(null);
    authService.logout();
    
    // Opcional: Redirigir a login page
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  };

  // Efecto para verificar autenticación periódicamente (cada 5 minutos)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      try {
        await authService.getProfile(); // Solo para verificar que el token sigue válido
      } catch (error) {
        console.warn('Token expirado, cerrando sesión...');
        logout();
      }
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, [user]);

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
    error,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};