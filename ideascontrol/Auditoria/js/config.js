/* =====================================================================
   APP-119 · Auditoría de registros — configuración
   Quién creó, modificó o eliminó cada registro de las microapps, leído del historial de SharePoint (IC Apps).
   SharePoint lo anota solo con la cuenta de Microsoft de quien hace el cambio: las apps no preguntan nada
   y nadie lo puede editar desde las apps. Solo la Dirección de Operaciones abre esta app.
   ===================================================================== */
window.CFG = {
  app: { id: 'APP-119', nombre: 'Auditoría de registros', version: '0.2.1' },
  auth: {
    clientId: 'bfe1678b-5690-4aa5-8ce8-6c2522b2a7d0',
    tenantId: 'f947955a-8748-4cc4-a54b-61ad1d4b0ba7',
    redirectPath: '/ideascontrol/Portal/',
    scopes: ['User.Read', 'Sites.ReadWrite.All']
  },
  sitio: { host: 'ideascontrolsas.sharepoint.com', ruta: '/sites/ICApps' },
  spWeb: 'https://ideascontrolsas.sharepoint.com/sites/ICApps',
  spScopes: ['https://ideascontrolsas.sharepoint.com/AllSites.FullControl'],
  logo: '/ideascontrol/assets/ideascontrol.webp',
  admins: ['operaciones@ideascontrol.com'],
  diasPorDefecto: 7,
  versionesAGuardar: 100,      // al activar el historial en una lista
  // Listas técnicas que no se muestran: contadores de consecutivos y la bitácora interna de eventos (repetiría lo mismo)
  ignorar: ['SYS_Secuencias', 'SYS_Auditoria'],
  // Listas que se muestran (quién y cuándo) pero sin consultar el detalle campo por campo
  sinDetalle: [],
  // A qué app pertenece cada lista (por prefijo; gana el primero que coincida)
  apps: [
    ['COT_', 'Cotizaciones'], ['COM_', 'Agenda comercial'],
    ['MAE_Empresas', 'Clientes'], ['MAE_Contactos', 'Clientes'], ['MAE_Sucursales', 'Clientes'],
    ['MAE_', 'Productos'], ['CAL_', 'Calculadora de costos'],
    ['OPE_Proveedor', 'Proveedores'], ['OPE_', 'Programación'], ['PRY_', 'Proyectos'], ['TAR_', 'Gestión de Clientes'],
    ['NOV_', 'Novedades'], ['TAL_', 'Talento y Colecciones'], ['MKT_', 'Marketing'], ['CHK_', 'Checklist'],
    ['RE_', 'Reflexiones'], ['SYS_', 'Sistema y accesos']
  ]
};
