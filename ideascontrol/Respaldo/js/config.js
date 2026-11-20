/* =====================================================================
   APP-117 · Respaldo de IC Apps — configuración
   Descarga a su computador una copia completa del sitio IC Apps: todas las listas (datos y columnas),
   permisos y grupos, y los archivos de sus bibliotecas. Solo la Dirección de Operaciones.
   Nada se guarda en este repositorio (es público): el respaldo queda solo en el equipo de quien lo descarga.
   ===================================================================== */
window.CFG = {
  app: { id: 'APP-117', nombre: 'Respaldo de IC Apps', version: '0.1.0' },
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
  // Columnas internas de SharePoint que no son datos del negocio (no se copian)
  omitir: ['ContentType', 'Attachments', 'Edit', 'LinkTitleNoMenu', 'LinkTitle', 'DocIcon', 'ItemChildCount', 'FolderChildCount', '_UIVersionString',
    '_ComplianceFlags', '_ComplianceTag', '_ComplianceTagWrittenTime', '_ComplianceTagUserId', 'AppAuthorLookupId', 'AppEditorLookupId', '@odata.etag']
};
