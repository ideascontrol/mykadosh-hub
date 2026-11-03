/* =====================================================================
   APP-100 · Portal de microapps de Ideas Control — configuración y menú
   Para agregar una microapp: sume una entrada en APPS. Si la dirección
   está en la lista SYS_Microapps (columna url), esa tiene prioridad.
   ===================================================================== */
window.CFG = {
  app: { id: 'APP-100', nombre: 'Portal de microapps', version: '0.1.0' },
  auth: {
    clientId: 'bfe1678b-5690-4aa5-8ce8-6c2522b2a7d0',
    tenantId: 'f947955a-8748-4cc4-a54b-61ad1d4b0ba7',
    redirectPath: '/ideascontrol/Portal/',             // debe estar registrada en Entra ID (con y sin www)
    scopes: ['User.Read', 'Sites.ReadWrite.All']
  },
  sitio: { host: 'ideascontrolsas.sharepoint.com', ruta: '/sites/ICApps' },
  logo: '/ideascontrol/assets/ideascontrol.webp',
  sitios: [
    { nombre: 'Ideas Control (documentos)', url: 'https://ideascontrolsas.sharepoint.com/sites/IdeasControl', texto: 'Bibliotecas de documentos: clientes, comercial, administración y documentación maestra.' },
    { nombre: 'IC Apps (datos de las microapps)', url: 'https://ideascontrolsas.sharepoint.com/sites/ICApps', texto: 'Listas de SharePoint donde guardan su información las microapps internas.' }
  ]
};

// datos: SHAREPOINT | GITHUB | POWERAPPS · acceso: como se verifica el permiso del usuario
window.APPS = [
  { grupo: 'Operaciones', id: 'APP-106', nombre: 'Programación de Operaciones', icono: 'agenda', color: '',
    texto: 'Agenda de técnicos: instalaciones, mantenimientos, soporte, rotación de oficina y programación semanal.',
    url: '/ideascontrol/Programacion/', datos: 'SHAREPOINT', acceso: 'APP106' },
  { grupo: 'Operaciones', id: 'APP-102', nombre: 'Soporte técnico (tickets)', icono: 'ticket', color: '',
    texto: 'Gestión de tickets de soporte, implementaciones y seguimiento de recursos.',
    url: '', datos: 'POWERAPPS', nota: 'Registre su dirección en SYS_Microapps (APP-102 › url) para activarla aquí.' },
  { grupo: 'Comercial', id: 'APP-101', nombre: 'Comercial', icono: 'comercial', color: 'teal',
    texto: 'Empresas y contactos, productos y precios, cotizaciones con PDF, interacciones y tablero comercial.',
    url: '/ideascontrol/Comercial/', datos: 'SHAREPOINT', acceso: 'APP101' },
  { grupo: 'Documentación', id: 'APP-105', nombre: 'Gestión documental', icono: 'docs', color: 'dorado',
    texto: 'Manuales, procedimientos, instructivos, formatos y políticas vigentes de Ideas Control.',
    url: '/ideascontrol/ICManuales/gestion-documental/index.html', datos: 'GITHUB', nota: 'Hoy se publica en GitHub (público). Pasará a SharePoint.' },
  { grupo: 'Próximamente', id: 'APP-104', nombre: 'Encuestas CSAT / NPS', icono: 'encuesta', color: '',
    texto: 'CSAT después de cada servicio; NPS cada 3 o 6 meses.', url: '', datos: 'SHAREPOINT', pronto: true }
];

// Herramientas públicas para clientes (no piden inicio de sesión)
window.PUBLICAS = [
  { nombre: 'Diagnóstico de madurez en T&A', url: '/ideascontrol/DiagnosticoMadurezTyA/' },
  { nombre: 'Piloto de Tiempo & Asistencia', url: '/ideascontrol/PilotoTyA/' },
  { nombre: 'Calculadora de ROI', url: '/ideascontrol/CalculadoraROI/' },
  { nombre: 'Costo de la hora ausente', url: '/ideascontrol/CostoHoraAusente/' },
  { nombre: 'Diagnóstico de políticas de asistencia', url: '/ideascontrol/DiagnosticoPoliticasAsistencia/' },
  { nombre: 'Confiabilidad y trazabilidad', url: '/ideascontrol/Confiabilidad-Trazabilidad/' },
  { nombre: 'TimeVision', url: '/ideascontrol/TimeVision/' }
];
