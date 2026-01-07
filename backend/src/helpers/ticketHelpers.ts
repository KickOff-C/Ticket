// src/helpers/ticketHelpers.ts
export class TicketHelpers {
  static formatEntrada(entrada: string | null): string {
    if (!entrada) return 'No especificado';
    
    const formatMap: Record<string, string> = {
      'LLAMADA': 'Llamada',
      'VISITA': 'Visita', 
      'MONDAY': 'Monday',
      'EMAIL': 'Email'
    };
    
    return formatMap[entrada] || entrada;
  }

  static formatMotivo(motivo: string | null): string {
    if (!motivo) return 'No especificado';
    
    const formatMap: Record<string, string> = {
      'ENTREGA_FORMAL_PARCELA': 'Entrega Formal de Parcela',
      'INSTALACION_EMPALMES': 'Instalación de Empalmes',
      'PROYECTO_CONSTRUCCION': 'Proyecto de Construcción',
      'CERTIFICADOS_VARIOS': 'Certificados Varios',
      'CONSULTAS_GENERALES': 'Consultas Generales',
      'SOLICITUD_REUNION': 'Solicitud de Reunión',
      'SOLICITUD_CAMBIO_PARCELA': 'Solicitud Cambio de Parcela',
      'SOLICITUD_DEVOLUCION': 'Solicitud Devolución de Dinero o Parcela',
      'REQUERIMIENTOS_VARIOS': 'Requerimientos Varios',
      'VENTAS_TERCEROS': 'Ventas entre Terceros',
      'CESION_DERECHOS': 'Cesión de Derechos',
      'RECLAMOS': 'Reclamos',
      'ENVIO_COMUNICADO': 'Envío Comunicado',
      'INFORME_FORESTAL': 'Informe Forestal',
      'ESTADO_ESCRITURACION': 'Estado Escrituración',
      'NO_ADHIERE_REGLAMENTO': 'No Adhiere al Reglamento',
      'RECADOS': 'Recados',
      'REQUERIMIENTOS_COBRANZA': 'Requerimientos Cobranza',
      'SUGERENCIAS': 'Sugerencias',
      'FELICITACIONES': 'Felicitaciones'
    };
    
    return formatMap[motivo] || motivo;
  }

  static getEntradaOptions() {
    return [
      { value: 'LLAMADA', label: 'Llamada' },
      { value: 'VISITA', label: 'Visita' },
      { value: 'MONDAY', label: 'Monday' },
      { value: 'EMAIL', label: 'Email' }
    ];
  }

  static getMotivoOptions() {
    return [
      { value: 'ENTREGA_FORMAL_PARCELA', label: 'Entrega Formal de Parcela' },
      { value: 'INSTALACION_EMPALMES', label: 'Instalación de Empalmes' },
      { value: 'PROYECTO_CONSTRUCCION', label: 'Proyecto de Construcción' },
      { value: 'CERTIFICADOS_VARIOS', label: 'Certificados Varios' },
      { value: 'CONSULTAS_GENERALES', label: 'Consultas Generales' },
      { value: 'SOLICITUD_REUNION', label: 'Solicitud de Reunión' },
      { value: 'SOLICITUD_CAMBIO_PARCELA', label: 'Solicitud Cambio de Parcela' },
      { value: 'SOLICITUD_DEVOLUCION', label: 'Solicitud Devolución de Dinero o Parcela' },
      { value: 'REQUERIMIENTOS_VARIOS', label: 'Requerimientos Varios' },
      { value: 'VENTAS_TERCEROS', label: 'Ventas entre Terceros' },
      { value: 'CESION_DERECHOS', label: 'Cesión de Derechos' },
      { value: 'RECLAMOS', label: 'Reclamos' },
      { value: 'ENVIO_COMUNICADO', label: 'Envío Comunicado' },
      { value: 'INFORME_FORESTAL', label: 'Informe Forestal' },
      { value: 'ESTADO_ESCRITURACION', label: 'Estado Escrituración' },
      { value: 'NO_ADHIERE_REGLAMENTO', label: 'No Adhiere al Reglamento' },
      { value: 'RECADOS', label: 'Recados' },
      { value: 'REQUERIMIENTOS_COBRANZA', label: 'Requerimientos Cobranza' },
      { value: 'SUGERENCIAS', label: 'Sugerencias' },
      { value: 'FELICITACIONES', label: 'Felicitaciones' }
    ];
  }

  static isValidEntrada(entrada: string): boolean {
    return ['LLAMADA', 'VISITA', 'MONDAY', 'EMAIL'].includes(entrada);
  }

  static isValidMotivo(motivo: string): boolean {
    const motivosValidos = [
      'ENTREGA_FORMAL_PARCELA',
      'INSTALACION_EMPALMES',
      'PROYECTO_CONSTRUCCION',
      'CERTIFICADOS_VARIOS',
      'CONSULTAS_GENERALES',
      'SOLICITUD_REUNION',
      'SOLICITUD_CAMBIO_PARCELA',
      'SOLICITUD_DEVOLUCION',
      'REQUERIMIENTOS_VARIOS',
      'VENTAS_TERCEROS',
      'CESION_DERECHOS',
      'RECLAMOS',
      'ENVIO_COMUNICADO',
      'INFORME_FORESTAL',
      'ESTADO_ESCRITURACION',
      'NO_ADHIERE_REGLAMENTO',
      'RECADOS',
      'REQUERIMIENTOS_COBRANZA',
      'SUGERENCIAS',
      'FELICITACIONES'
    ];
    return motivosValidos.includes(motivo);
  }
}