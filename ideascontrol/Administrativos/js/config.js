/* =====================================================================
   APP-118 · Administrativos — un solo lugar para lo que administra la Dirección de Operaciones:
   instaladores, respaldos, datos de las microapps, administración, matriz de accesos y tablas maestras.
   Solo operaciones@ideascontrol.com.
   ===================================================================== */
window.CFG = {
  app: { id: 'APP-118', nombre: 'Administrativos', version: '0.1.0' },
  auth: {
    clientId: 'bfe1678b-5690-4aa5-8ce8-6c2522b2a7d0',
    tenantId: 'f947955a-8748-4cc4-a54b-61ad1d4b0ba7',
    redirectPath: '/ideascontrol/Portal/',
    scopes: ['User.Read', 'Sites.ReadWrite.All']
  },
  sitio: { host: 'ideascontrolsas.sharepoint.com', ruta: '/sites/ICApps' },
  logo: '/ideascontrol/assets/ideascontrol.webp',
  admins: ['operaciones@ideascontrol.com'],
  verSitios: ['operaciones@ideascontrol.com'],   // lo usa la matriz de accesos
  // grupo, nombre, texto, url, ico (letras), color, externa (pestaña nueva)
  secciones: [
    ['Instaladores', [
      ['Instalador IC Apps', 'Crea o completa las listas de las microapps (Programación, Novedades, Talento, Clientes, Costos, Marketing, Checklist, Proyectos) y aplica permisos del personal.', '/ideascontrol/Programacion/Instalador/', 'IN', ''],
      ['Instalador de Comercial', 'Crea o completa las listas de Comercial: empresas, productos, precios, cotizaciones e interacciones. Se puede repetir sin duplicar.', '/ideascontrol/Comercial/Instalador/', 'IN', '']
    ]],
    ['Respaldos', [
      ['Respaldar IC Apps', 'Descarga una copia completa: datos de todas las listas, columnas, permisos, grupos y archivos. Guárdela en un disco externo y en su OneDrive.', '/ideascontrol/Respaldo/', 'RS', 'teal'],
      ['Restaurar / simulacro', 'Devuelve un respaldo al sitio de prueba (o, en una emergencia, al real) sin borrar ni cambiar nada existente.', '/ideascontrol/Respaldo/#restaurar', 'RT', 'teal']
    ]],
    ['Datos de las microapps', [
      ['IC Apps (SharePoint)', 'Listas donde guardan su información las microapps internas. Papelera de reciclaje y permisos del sitio.', 'https://ideascontrolsas.sharepoint.com/sites/ICApps', 'SP', '', true],
      ['Ideas Control · documentos (SharePoint)', 'Bibliotecas de documentos: clientes, comercial, administración y documentación maestra.', 'https://ideascontrolsas.sharepoint.com/sites/IdeasControl', 'SP', '', true]
    ]],
    ['Administración', [
      ['Comercial · Administración', 'Usuarios de Comercial (rol y «Gestiona productos»), condiciones comerciales y parámetros de la cotización.', '/ideascontrol/Comercial/#admin', 'AD', 'dorado'],
      ['Programación · Accesos', 'Quién entra a la Programación, Novedades, Proyectos y Talento, y con qué rol.', '/ideascontrol/Programacion/#admin/accesos', 'AD', 'dorado'],
      ['Matriz de accesos (Excel)', 'Qué apps y módulos ve cada usuario de IC y con qué rol. Se arma con los datos actuales.', '#matriz', 'MX', 'dorado']
    ]],
    ['Tablas maestras', [
      ['Técnicos y personal', 'Personal de IC (Ideas Control, Administrativo, Técnicos de campo): correo, vinculación y matriz de habilidades. Es la lista de «Responsables» de todas las apps.', '/ideascontrol/Programacion/#admin/tecnicos', 'TM', 'teal'],
      ['Tipos de actividad', 'Categorías de actividad de la Programación (instalación, mantenimiento, soporte, oficina, ausencia…).', '/ideascontrol/Programacion/#admin/tipos', 'TM', 'teal'],
      ['Festivos', 'Días festivos que usan la Programación y Novedades para contar días hábiles.', '/ideascontrol/Programacion/#admin/festivos', 'TM', 'teal'],
      ['Productos y categorías', 'Catálogo de Comercial: productos, categorías, precios e inventario.', '/ideascontrol/Comercial/#productos', 'TM', 'teal']
    ]]
  ]
};
