/* =====================================================================
   De Dios para el camino · Lectura diaria — configuración (uso personal)
   Trabaja sobre TU Excel y TU Word en SharePoint (sitio IC Apps, biblioteca Documentos).
   Para que nadie más los vea: en SharePoint, carpeta «Personal» › Gestionar acceso ›
   Dejar de heredar permisos y dejar solo tu cuenta.
   ===================================================================== */
window.CFG = {
  app: { id: 'PER-01', nombre: 'De Dios para el camino', version: '0.2.3' },
  auth: {
    clientId: 'bfe1678b-5690-4aa5-8ce8-6c2522b2a7d0',
    tenantId: 'f947955a-8748-4cc4-a54b-61ad1d4b0ba7',
    redirectPath: '/ideascontrol/Portal/',
    scopes: ['User.Read', 'Sites.ReadWrite.All']
  },
  sitio: { host: 'ideascontrolsas.sharepoint.com', ruta: '/sites/ICApps' },
  logo: '/ideascontrol/assets/ideascontrol.webp',
  usuarios: ['operaciones@ideascontrol.com'],           // solo tú

  carpeta: 'Personal/Lectura diaria',
  excel: 'Personal/Lectura diaria/Lectura_Diaria_2026.xlsx',
  word: 'Personal/Lectura diaria/Lectura_Diaria_2026.docx',
  config: 'Personal/Lectura diaria/Lectura_Config.json',      // semana a publicar y hashtags por semana
  hojas: { plan: 'Plan Lectura', contenido: 'Contenido' },
  // Columnas de la hoja Contenido (igual a tu Excel)
  col: { publicado: 'B', prompt: 'C', fecha: 'D', ref: 'E', texto: 'F', categoria: 'G', idea: 'H', recuerda: 'I', aplicacion: 'J', imagen: 'K' },
  formatoFecha: 'dd\\-mm\\-yy',

  // Entrada del Word y publicación de Facebook
  cierre: 'Dios te bendiga',
  hashtags: '#Devocional #Reflexion #Fe #MensajeBiblico #Biblia #Propósito',   // los de siempre (se pueden cambiar por semana); van solo en Facebook
  relleno: 'Miqueas 4:3',                                 // entradas antiguas de relleno: cuentan como «Pendiente»
  facebook: 'https://www.facebook.com/bendicionesencamino',
  // Biblia digital para copiar el texto de cada versículo ({ref} y {ver} se reemplazan)
  biblia: { nombre: 'Bible Gateway', url: 'https://www.biblegateway.com/passage/?search={ref}&version={ver}', versiones: ['NTV', 'RVR1960', 'NVI', 'LBLA', 'DHH', 'RVA-2015'], defecto: 'NTV' },
  categorias: ['Promesas de Dios', 'Confianza', 'Sabiduría', 'Fortaleza', 'Liderazgo', 'Consuelo']
};
