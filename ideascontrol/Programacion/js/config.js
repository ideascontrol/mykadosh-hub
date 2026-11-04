/* =====================================================================
   APP-106 · Programación de Operaciones — configuración
   Reemplaza el Excel 2506-MAN-OPE_Programador_de_Operaciones.xlsx
   ===================================================================== */
window.CFG = {
  app: { id: 'APP-106', nombre: 'Programación de Operaciones', version: '0.1.4 · Etapa 1' },
  auth: {
    clientId: 'bfe1678b-5690-4aa5-8ce8-6c2522b2a7d0',
    tenantId: 'f947955a-8748-4cc4-a54b-61ad1d4b0ba7',
    redirectPath: '/ideascontrol/Programacion/',        // debe estar registrada en Entra ID (con y sin www)
    scopes: ['User.Read', 'Sites.ReadWrite.All']
  },
  sitio: { host: 'ideascontrolsas.sharepoint.com', ruta: '/sites/ICApps' },
  logo: '/ideascontrol/assets/ideascontrol.webp',
  portal: '/ideascontrol/Portal/',
  manual: '2506-MAN-OPE'
};
