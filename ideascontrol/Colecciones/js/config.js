/* =====================================================================
   APP-116 · Colecciones de lectura — configuración
   Contenidos de lectura libre para todo el personal de Ideas Control (p. ej. «Reflexiones Estratégicas»
   de Growth Path Academy). Antes era una pestaña de Desarrollo de Talento.
   Lectura para todos; control total solo para los administradores (retirar, volver a publicar, ver lo programado).
   ===================================================================== */
window.CFG = {
  app: { id: 'APP-116', nombre: 'Colecciones de lectura', version: '0.1.0' },
  auth: {
    clientId: 'bfe1678b-5690-4aa5-8ce8-6c2522b2a7d0',
    tenantId: 'f947955a-8748-4cc4-a54b-61ad1d4b0ba7',
    redirectPath: '/ideascontrol/Portal/',
    scopes: ['User.Read', 'Sites.ReadWrite.All']
  },
  sitio: { host: 'ideascontrolsas.sharepoint.com', ruta: '/sites/ICApps' },
  logo: '/ideascontrol/assets/ideascontrol.webp',
  admins: ['operaciones@ideascontrol.com']
};
