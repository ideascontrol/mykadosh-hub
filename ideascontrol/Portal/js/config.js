/* =====================================================================
   APP-100 · Portal de Ideas Control de Ideas Control — configuración y menú
   Para agregar una microapp: sume una entrada en APPS. Si la dirección
   está en la lista SYS_Microapps (columna url), esa tiene prioridad.
   ===================================================================== */
window.CFG = {
  app: { id: 'APP-100', nombre: 'Portal de Ideas Control', version: '0.2.2' },
  auth: {
    clientId: 'bfe1678b-5690-4aa5-8ce8-6c2522b2a7d0',
    tenantId: 'f947955a-8748-4cc4-a54b-61ad1d4b0ba7',
    redirectPath: '/ideascontrol/Portal/',             // debe estar registrada en Entra ID (con y sin www)
    scopes: ['User.Read', 'Sites.ReadWrite.All']
  },
  sitio: { host: 'ideascontrolsas.sharepoint.com', ruta: '/sites/ICApps' },
  logo: '/ideascontrol/assets/ideascontrol.webp',
  // Quién ve la sección «Otros Procesos» del Portal (antes «Sitios de SharePoint»)
  verSitios: ['operaciones@ideascontrol.com'],
  sitios: [
    { nombre: 'Administrativos', url: '/ideascontrol/Administrativos/', interna: true, texto: 'Instaladores, respaldos, datos de las microapps, administración, matriz de accesos y tablas maestras, en un solo lugar.' },
    { nombre: 'De Dios para el camino · Lectura diaria', url: '/ideascontrol/Lectura/', interna: true, texto: 'Personal: 3 versículos por día con Claude, elegir uno, documentar el Word, prompt de la imagen, texto para Facebook y PNG → WebP.' },
    { nombre: 'Reflexiones Estratégicas · Growth Path Academy', url: '/ideascontrol/Reflexiones/', texto: 'Colección editorial de GPA: biblioteca, editor, calendario y publicación en Colecciones de lectura.' },
    { nombre: 'Marketing GPA · Growth Path Academy', url: '/ideascontrol/MarketingGPA/', interna: true, texto: 'Personal: plan de contenido GPA, mejorar la semana con Claude, copys, prompts de imagen, Word, métricas, leads y pauta.' }
  ]
};

// datos: SHAREPOINT | GITHUB | POWERAPPS · acceso: cómo se verifica el permiso del usuario
// soloOficina: no se muestra a los técnicos (quienes solo tienen acceso como Técnico a la Programación)
window.APPS = [
  // ---------- Gestión de Operaciones ----------
  { grupo: 'Gestión de Operaciones', id: 'APP-106', nombre: 'Programación de Operaciones', icono: 'agenda', color: '',
    texto: 'Agenda de técnicos: instalaciones, mantenimientos, soporte, rotación de oficina y programación semanal.',
    url: '/ideascontrol/Programacion/', datos: 'SHAREPOINT', acceso: 'APP106' },
  { grupo: 'Gestión de Operaciones', id: 'APP-114', nombre: 'Proyectos', icono: 'tareas', color: 'dorado',
    texto: 'Implementaciones de T&A, TimeVision, biometría, puertas y torniquetes: cronograma desde plantillas, línea base, avance y bitácora.',
    url: '/ideascontrol/Proyectos/', datos: 'SHAREPOINT', acceso: 'APP114' },
  { grupo: 'Gestión de Operaciones', id: 'APP-109', nombre: 'Gestión de Clientes', icono: 'tareas', color: 'teal',
    texto: 'Tareas y pendientes de cada cliente: plan de trabajo, semáforo de vencimientos y resumen de estados.',
    url: '/ideascontrol/Tareas/', datos: 'SHAREPOINT', fija: true },   // todo el personal de IC ve y actualiza las tareas
  { grupo: 'Gestión de Operaciones', id: 'APP-102', nombre: 'Soporte técnico (tickets)', icono: 'ticket', color: '',
    texto: 'Centro de tiquetes: registre y siga sus casos de soporte, implementaciones y seguimiento de recursos. Se abre en una pestaña nueva.',
    url: 'https://mesadeayuda.timevisionbi.com/', datos: 'EXTERNA', fija: true },   // activa para todo el personal; externa = pestaña nueva
  { grupo: 'Gestión de Operaciones', id: 'APP-111', nombre: 'TimeVision BI', icono: 'bi', color: 'dorado',
    texto: 'Tableros de análisis de tiempo y asistencia con los datos de Myintelli. Se abre en una pestaña nueva.',
    url: 'https://timevisionbi.com/', datos: 'EXTERNA', fija: true },
  // ---------- Gestión Humana y Administrativa (antes «Desarrollo de Talento») ----------
  { grupo: 'Gestión Humana y Administrativa', id: 'APP-108', nombre: 'Desarrollo de Talento', icono: 'talento', color: 'dorado',
    texto: 'Una idea práctica para aplicar hoy: piezas de formación del personal de IC en el Muro.',
    url: '/ideascontrol/Talento/', datos: 'SHAREPOINT', acceso: 'APP108' },
  { grupo: 'Gestión Humana y Administrativa', id: 'APP-116', nombre: 'Colecciones de lectura', icono: 'libro', color: 'teal',
    texto: 'Lecturas para todo el personal, como Reflexiones Estratégicas de Growth Path Academy. Solo lectura.',
    url: '/ideascontrol/Colecciones/', datos: 'SHAREPOINT', fija: true },   // lectura para todos; control total solo operaciones@ (CFG.admins de la app)
  { grupo: 'Gestión Humana y Administrativa', id: 'APP-107', nombre: 'Novedades del personal', icono: 'novedad', color: '',
    texto: 'Permisos, vacaciones, licencias, incapacidades y cambios de horario. Se tramitan solo con la Dirección de Operaciones.',
    url: '/ideascontrol/Novedades/', datos: 'SHAREPOINT', acceso: 'APP107' },
  // ---------- Gestión Comercial ----------
  { grupo: 'Gestión Comercial', id: 'APP-101', nombre: 'Cotizaciones', icono: 'comercial', color: 'teal',
    texto: 'Nueva cotización, cotizaciones con PDF, pendientes de seguimiento, contenido para compartir y tablero comercial.',
    url: '/ideascontrol/Comercial/', datos: 'SHAREPOINT', acceso: 'APP101' },
  { grupo: 'Gestión Comercial', id: 'APP-115', nombre: 'Clientes', icono: 'comercial', color: 'dorado',
    texto: 'Empresas y contactos: prospectos y clientes, sus sedes y personas de contacto.',
    url: '/ideascontrol/Clientes/', datos: 'SHAREPOINT', acceso: 'APP101' },
  { grupo: 'Gestión Comercial', id: 'APP-101-PRD', nombre: 'Productos', icono: 'calc', color: '',
    texto: 'Catálogo con foto, ficha técnica, precios (también por volumen) e inventario.',
    url: '/ideascontrol/Comercial/#productos', datos: 'SHAREPOINT', fija: true, acceso: 'APP101' },
  { grupo: 'Gestión Comercial', id: 'APP-110', nombre: 'Calculadora de costos y precios', icono: 'calc', color: 'dorado',
    texto: 'Precio sugerido a partir de los costos directos de un producto o servicio. Cada cálculo queda guardado en el historial.',
    url: '/ideascontrol/Costeo/', datos: 'SHAREPOINT', acceso: 'APP110' },   // Comercial: administrador o «Gestiona productos»
  { grupo: 'Gestión Comercial', id: 'APP-112', nombre: 'Marketing', icono: 'mkt', color: 'teal',
    texto: 'Plan de contenidos de redes: temas, publicaciones por red, aprobación (mínimo 2), métricas y resumen para gerencia.',
    url: '/ideascontrol/Marketing/', datos: 'SHAREPOINT', solo: ['operaciones@ideascontrol.com', 'patricia@ideascontrol.com', 'margarita@ideascontrol.com'] },
  // ---------- Gestión Documental ----------
  { grupo: 'Gestión Documental', id: 'APP-105', nombre: 'Manuales y Procedimientos', icono: 'docs', color: 'dorado',
    texto: 'Manuales, procedimientos, instructivos, formatos y políticas vigentes de Ideas Control.',
    url: '/ideascontrol/Documentacion/', datos: 'SHAREPOINT', fija: true },
  { grupo: 'Gestión Documental', id: 'APP-113', nombre: 'Checklist de Operaciones', icono: 'checklist', color: 'teal',
    texto: 'Lo que tiene y lo que le falta al área: estructura, políticas, procesos, formatos, indicadores y gobierno, con avance y acceso directo a cada manual.',
    url: '/ideascontrol/Checklist/', datos: 'SHAREPOINT', solo: ['operaciones@ideascontrol.com'] }
];

// Herramientas públicas para clientes (no piden inicio de sesión)
window.PUBLICAS = [
  { nombre: 'Diagnóstico de madurez en T&A', url: '/ideascontrol/DiagnosticoMadurezTyA/' },
  { nombre: 'Piloto de Tiempo & Asistencia', url: '/ideascontrol/PilotoTyA/' },
  { nombre: 'Costo de la hora ausente', url: '/ideascontrol/CostoHoraAusente/' },
  { nombre: 'TimeVision', url: '/ideascontrol/TimeVision/' }
];
