/* =====================================================================
   APP-109 · Seguimiento por cliente — configuración
   Tareas, pendientes y planes de trabajo de cada cliente (antes, un Excel
   por cliente como «Plan de Trabajo - Papeles Nacionales»).
   ===================================================================== */
window.CFG = {
  app: { id: 'APP-109', nombre: 'Seguimiento por cliente', version: '0.1.0' },
  auth: {
    clientId: 'bfe1678b-5690-4aa5-8ce8-6c2522b2a7d0',
    tenantId: 'f947955a-8748-4cc4-a54b-61ad1d4b0ba7',
    // El inicio de sesión se hace en el Portal (dirección ya registrada en Entra ID) y vuelve aquí
    redirectPath: '/ideascontrol/Portal/',
    scopes: ['User.Read', 'Sites.ReadWrite.All']
  },
  sitio: { host: 'ideascontrolsas.sharepoint.com', ruta: '/sites/ICApps' },
  logo: '/ideascontrol/assets/ideascontrol.webp',
  // Por ahora solo la Dirección de Operaciones usa esta app
  usuarios: ['operaciones@ideascontrol.com'],
  // Estados: los cerrados no cuentan como pendientes ni generan alarma
  estados: ['Pendiente OC', 'Abierto', 'En Progreso', 'Esperando Cliente', 'Esperando Proveedor', 'Cancelada', 'Resuelto', 'Cerrado'],
  cerrados: ['Cancelada', 'Resuelto', 'Cerrado'],
  prioridades: ['Alta', 'Media', 'Baja'],
  categorias: ['Instalación', 'Inspección', 'Incidente', 'Software', 'Mejora', 'Desarrollo', 'Facturación', 'Cotización', 'Aprobación', 'Informe'],
  diasAviso: 3          // «Próxima a vencer» = vence en 3 días o menos
};
