/* =====================================================================
   APP-100 · Portal de microapps de Ideas Control — configuración y menú
   Para agregar una microapp: sume una entrada en APPS. Si la dirección
   está en la lista SYS_Microapps (columna url), esa tiene prioridad.
   ===================================================================== */
window.CFG = {
  app: { id: 'APP-100', nombre: 'Portal de microapps', version: '0.1.20' },
  auth: {
    clientId: 'bfe1678b-5690-4aa5-8ce8-6c2522b2a7d0',
    tenantId: 'f947955a-8748-4cc4-a54b-61ad1d4b0ba7',
    redirectPath: '/ideascontrol/Portal/',             // debe estar registrada en Entra ID (con y sin www)
    scopes: ['User.Read', 'Sites.ReadWrite.All']
  },
  sitio: { host: 'ideascontrolsas.sharepoint.com', ruta: '/sites/ICApps' },
  logo: '/ideascontrol/assets/ideascontrol.webp',
  // Quién ve la sección «Sitios de SharePoint» del Portal
  verSitios: ['operaciones@ideascontrol.com'],
  sitios: [
    { nombre: 'Ideas Control (documentos)', url: 'https://ideascontrolsas.sharepoint.com/sites/IdeasControl', texto: 'Bibliotecas de documentos: clientes, comercial, administración y documentación maestra.' },
    { nombre: 'IC Apps (datos de las microapps)', url: 'https://ideascontrolsas.sharepoint.com/sites/ICApps', texto: 'Listas de SharePoint donde guardan su información las microapps internas.' },
    { nombre: 'Instalador IC Apps', url: '/ideascontrol/Programacion/Instalador/', texto: 'Crea o completa las listas de SharePoint de las microapps (Programación, Novedades, Talento, Clientes, Costos, Marketing, Checklist) y aplica permisos.' },
    { nombre: 'De Dios para el camino · Lectura diaria', url: '/ideascontrol/Lectura/', texto: 'Personal: 3 versículos por día con Claude, elegir uno, documentar el Word, prompt de la imagen y texto para Facebook.' },
    { nombre: 'Marketing GPA · Growth Path Academy', url: '/ideascontrol/MarketingGPA/', texto: 'Personal: plan de contenido GPA (288 publicaciones), mejorar la semana con Claude, copys, prompts de imagen, Word, métricas, leads y pauta.' }
  ]
};

// datos: SHAREPOINT | GITHUB | POWERAPPS · acceso: cómo se verifica el permiso del usuario
// soloOficina: no se muestra a los técnicos (quienes solo tienen acceso como Técnico a la Programación)
window.APPS = [
  { grupo: 'Operaciones', id: 'APP-106', nombre: 'Programación de Operaciones', icono: 'agenda', color: '',
    texto: 'Agenda de técnicos: instalaciones, mantenimientos, soporte, rotación de oficina y programación semanal.',
    url: '/ideascontrol/Programacion/', datos: 'SHAREPOINT', acceso: 'APP106' },
  { grupo: 'Operaciones', id: 'APP-107', nombre: 'Novedades del personal', icono: 'novedad', color: 'teal',
    texto: 'Permisos, vacaciones, licencias, incapacidades y cambios de horario. Se tramitan solo con la Dirección de Operaciones.',
    url: '/ideascontrol/Novedades/', datos: 'SHAREPOINT', acceso: 'APP107' },
  { grupo: 'Desarrollo de Talento', id: 'APP-108', nombre: 'Desarrollo de Talento', icono: 'talento', color: 'dorado',
    texto: 'Una idea práctica para aplicar hoy: piezas de los programas de formación del personal de IC.',
    url: '/ideascontrol/Talento/', datos: 'SHAREPOINT', acceso: 'APP108' },
  { grupo: 'Operaciones', id: 'APP-109', nombre: 'Gestión de Clientes', icono: 'tareas', color: 'teal',
    texto: 'Tareas y pendientes de cada cliente: plan de trabajo, semáforo de vencimientos y resumen de estados.',
    url: '/ideascontrol/Tareas/', datos: 'SHAREPOINT', solo: ['operaciones@ideascontrol.com'] },
  { grupo: 'Operaciones', id: 'APP-102', nombre: 'Soporte técnico (tickets)', icono: 'ticket', color: '',
    texto: 'Centro de tiquetes: registre y siga sus casos de soporte, implementaciones y seguimiento de recursos. Se abre en una pestaña nueva.',
    url: 'https://mesadeayuda.timevisionbi.com/', datos: 'EXTERNA', fija: true },   // activa para todo el personal; externa = pestaña nueva
  { grupo: 'Operaciones', id: 'APP-111', nombre: 'TimeVision BI', icono: 'bi', color: 'dorado',
    texto: 'Tableros de análisis de tiempo y asistencia con los datos de Myintelli. Se abre en una pestaña nueva.',
    url: 'https://timevisionbi.com/', datos: 'EXTERNA', fija: true },   // activa para todo el personal; externa = pestaña nueva
  { grupo: 'Comercial', id: 'APP-101', nombre: 'Comercial', icono: 'comercial', color: 'teal',
    texto: 'Empresas y contactos, productos y precios, cotizaciones con PDF, interacciones y tablero comercial.',
    url: '/ideascontrol/Comercial/', datos: 'SHAREPOINT', acceso: 'APP101' },
  { grupo: 'Comercial', id: 'APP-110', nombre: 'Calculadora de costos y precios', icono: 'calc', color: 'dorado',
    texto: 'Precio sugerido a partir de los costos directos de un producto o servicio. Cada cálculo queda guardado en el historial.',
    url: '/ideascontrol/Costeo/', datos: 'SHAREPOINT', solo: ['operaciones@ideascontrol.com', 'patricia@ideascontrol.com', 'margarita@ideascontrol.com'] },
  { grupo: 'Comercial', id: 'APP-112', nombre: 'Marketing', icono: 'mkt', color: 'teal',
    texto: 'Plan de contenidos de redes: temas, publicaciones por red, aprobación (mínimo 2), métricas y resumen para gerencia.',
    url: '/ideascontrol/Marketing/', datos: 'SHAREPOINT', solo: ['operaciones@ideascontrol.com', 'patricia@ideascontrol.com', 'margarita@ideascontrol.com'] },
  { grupo: 'Documentación', id: 'APP-105', nombre: 'Gestión documental', icono: 'docs', color: 'dorado',
    texto: 'Manuales, procedimientos, instructivos, formatos y políticas vigentes de Ideas Control.',
    url: '/ideascontrol/Documentacion/', datos: 'SHAREPOINT', fija: true },
  { grupo: 'Documentación', id: 'APP-113', nombre: 'Checklist de Operaciones', icono: 'checklist', color: 'teal',
    texto: 'Lo que tiene y lo que le falta al área: estructura, políticas, procesos, formatos, indicadores y gobierno, con avance y acceso directo a cada manual.',
    url: '/ideascontrol/Checklist/', datos: 'SHAREPOINT', solo: ['operaciones@ideascontrol.com'] },
  { grupo: 'Próximamente', id: 'APP-104', nombre: 'Encuestas CSAT / NPS', icono: 'encuesta', color: '',
    texto: 'CSAT después de cada servicio; NPS cada 3 o 6 meses.', url: '', datos: 'SHAREPOINT', pronto: true, soloOficina: true }
];

// Herramientas públicas para clientes (no piden inicio de sesión)
window.PUBLICAS = [
  { nombre: 'Diagnóstico de madurez en T&A', url: '/ideascontrol/DiagnosticoMadurezTyA/' },
  { nombre: 'Piloto de Tiempo & Asistencia', url: '/ideascontrol/PilotoTyA/' },
  { nombre: 'Costo de la hora ausente', url: '/ideascontrol/CostoHoraAusente/' },
  { nombre: 'TimeVision', url: '/ideascontrol/TimeVision/' }
];
