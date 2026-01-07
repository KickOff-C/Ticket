// src/components/ChangePasswordModal.tsx
import React, { useState } from 'react';
import { authService, ChangePasswordData } from '../services/authService';
import '../pages/Dashboard.css'

interface ChangePasswordModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState<ChangePasswordData & { confirmPassword: string }>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.currentPassword.trim()) {
      newErrors.currentPassword = 'La contraseña actual es requerida';
    }

    if (!formData.newPassword.trim()) {
      newErrors.newPassword = 'La nueva contraseña es requerida';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Confirma tu nueva contraseña';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = 'La nueva contraseña debe ser diferente a la actual';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpiar error cuando el usuario empieza a escribir
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    // Limpiar mensajes
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { confirmPassword, ...changePasswordData } = formData;
      const result = await authService.changePassword(changePasswordData);

      if (result.success) {
        setSuccessMessage(result.message);
        // Limpiar formulario
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setErrors({});

        // Llamar callback de éxito después de 2 segundos
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 2000);
      } else {
        setErrorMessage(result.message);
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Error al cambiar contraseña');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="change-password-modal" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <h2>🔒 Cambiar Contraseña</h2>
          <button className="close-btn" onClick={handleClose}>
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Mensajes de éxito/error */}
          {successMessage && (
            <div className="message-banner success">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="message-banner error">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="change-password-form">
            {/* Contraseña Actual */}
            <div className="form-group">
              <label htmlFor="currentPassword">
                Contraseña Actual *
              </label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                className={errors.currentPassword ? 'error' : ''}
                disabled={loading || !!successMessage}
                placeholder="Ingresa tu contraseña actual"
                autoComplete="current-password"
              />
              {errors.currentPassword && (
                <span className="error-message">{errors.currentPassword}</span>
              )}
            </div>

            {/* Nueva Contraseña */}
            <div className="form-group">
              <label htmlFor="newPassword">
                Nueva Contraseña *
              </label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className={errors.newPassword ? 'error' : ''}
                disabled={loading || !!successMessage}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
              {errors.newPassword && (
                <span className="error-message">{errors.newPassword}</span>
              )}
              <span className="password-hint">
                💡 Usa una combinación de letras, números y símbolos
              </span>
            </div>

            {/* Confirmar Nueva Contraseña */}
            <div className="form-group">
              <label htmlFor="confirmPassword">
                Confirmar Nueva Contraseña *
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={errors.confirmPassword ? 'error' : ''}
                disabled={loading || !!successMessage}
                placeholder="Repite tu nueva contraseña"
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <span className="error-message">{errors.confirmPassword}</span>
              )}
            </div>

            {/* Tips de Seguridad */}
            <div className="password-tips">
              <h4>🔐 Recomendaciones de Seguridad</h4>
              <ul>
                <li>Usa al menos 8 caracteres</li>
                <li>Combina mayúsculas, minúsculas y números</li>
                <li>Incluye símbolos especiales (@, #, $, etc.)</li>
                <li>Evita información personal fácil de adivinar</li>
              </ul>
            </div>

            {/* Botones de acción */}
            <div className="form-actions">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !!successMessage}
                className="btn btn-primary"
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Cambiando...
                  </>
                ) : successMessage ? (
                  '¡Listo!'
                ) : (
                  'Cambiar Contraseña'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;