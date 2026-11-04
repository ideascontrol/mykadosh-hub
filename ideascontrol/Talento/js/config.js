/* =====================================================================
   APP-108 · Desarrollo de Talento — configuración
   Programas de microaprendizaje para el personal interno de Ideas Control.
   ===================================================================== */
window.CFG = {
  app: { id: 'APP-108', nombre: 'Desarrollo de Talento', version: '0.1.1 · Etapa 1' },
  auth: {
    clientId: 'bfe1678b-5690-4aa5-8ce8-6c2522b2a7d0',
    tenantId: 'f947955a-8748-4cc4-a54b-61ad1d4b0ba7',
    redirectPath: '/ideascontrol/Talento/',             // debe estar registrada en Entra ID (con y sin www)
    scopes: ['User.Read', 'Sites.ReadWrite.All']
  },
  sitio: { host: 'ideascontrolsas.sharepoint.com', ruta: '/sites/ICApps' },
  logo: '/ideascontrol/assets/ideascontrol.webp',
  // Horas de publicación por defecto (hora de Colombia)
  horaPieza: '08:10',
  horaResumen: '16:00'
};
