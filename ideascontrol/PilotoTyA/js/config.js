/* ==========================================================================
   CONFIGURACIÓN DE LA LANDING — Soluciones de Tiempo y Asistencia · Ideas Control
   Este es el ÚNICO archivo que Ideas Control debe editar antes de publicar.
   Aquí NO van credenciales ni secretos: la URL del Web App de Apps Script
   es pública por diseño (el backend valida y protege la escritura).
   ========================================================================== */
window.IC_CONFIG = {
  /* URL del Web App de Google Apps Script (termina en /exec).
     Mientras esté vacía, el formulario NO simula éxito: muestra un error de configuración. */
  ENDPOINT_URL: 'https://script.google.com/macros/s/AKfycbwGt0M2Uk2DiwVphpiPgTutLdjUGhw2N7yvQ6nc9s2IrbxQY1qCDLrAn3-i5WXm3R1u/exec',

  /* Identificación en la Base_Maestra_Microapps_Ideas_Control (pestañas Landings y Microapps). */
  LANDING_ID: 'LAN-001',
  MICROAPP_ID: 'APP-006',
  FUENTE: 'Piloto T&A',

  /* Versión de la Política de Tratamiento de Datos (1106-MAN-GER) que acepta la persona.
     Igual que en las demás landings; se guarda en la hoja Consentimientos. */
  POLICY_VERSION: '1.1',

  /* Dominios de correo personal que se rechazan (lista explícita y editable).
     Mantenerla IGUAL a la propiedad BLOCKED_DOMAINS del backend. */
  BLOCKED_EMAIL_DOMAINS: [
    'gmail.com', 'googlemail.com',
    'hotmail.com', 'hotmail.es', 'hotmail.co',
    'outlook.com', 'outlook.es',
    'live.com', 'live.com.mx', 'msn.com',
    'yahoo.com', 'yahoo.es', 'yahoo.com.co', 'yahoo.com.mx', 'ymail.com',
    'icloud.com', 'me.com', 'aol.com', 'protonmail.com', 'proton.me'
  ],

  /* País preseleccionado en "País" y "Código de país". */
  DEFAULT_COUNTRY: 'CO',

  /* Cierre de la landing después de un registro exitoso:
     se intenta cerrar la pestaña; los navegadores solo lo permiten si la abrió
     un script, así que como respaldo se redirige a CLOSE_REDIRECT_URL.
     Poner CLOSE_AFTER_SECONDS en 0 para no cerrar automáticamente. */
  CLOSE_AFTER_SECONDS: 12,
  CLOSE_REDIRECT_URL: 'https://www.ideascontrol.com',

  /* Parámetros UTM (origen del lead): se guardan en las columnas utm_ de Leads. */
  SEND_UTM: true,

  /* Tiempo máximo de espera de la respuesta del backend (ms). */
  REQUEST_TIMEOUT_MS: 20000
};
