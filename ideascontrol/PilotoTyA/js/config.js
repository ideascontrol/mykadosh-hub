/* ==========================================================================
   CONFIGURACIÓN DE LA LANDING — Soluciones de Tiempo y Asistencia · Ideas Control
   Este es el ÚNICO archivo que Ideas Control debe editar antes de publicar.
   Aquí NO van credenciales ni secretos: la URL del Web App de Apps Script
   es pública por diseño (el backend valida y protege la escritura).
   ========================================================================== */
window.IC_CONFIG = {
  /* URL del Web App de Google Apps Script (termina en /exec).
     Mientras esté vacía, el formulario NO simula éxito: muestra un error de configuración. */
  ENDPOINT_URL: 'https://script.google.com/macros/s/AKfycbxMID0E_3kETKsThgDScSXgM2aRPD-wQL0ashg5quTaeFnvD3HR-c_SwAnWMjDMR-Imww/exec',

  /* Versión vigente de las políticas. DEBE coincidir con la propiedad
     POLICY_VERSION del backend; si no coincide, el backend rechaza el registro. */
  POLICY_VERSION: 'TYA-LEAD-2026-10-v2',

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

  /* Parámetros UTM: se capturan pero NO se envían, porque la hoja LEADS no
     tiene columna "origen". Activar solo si se aprueba ampliar la BD. */
  SEND_UTM: false,

  /* Tiempo máximo de espera de la respuesta del backend (ms). */
  REQUEST_TIMEOUT_MS: 20000
};
