/* =====================================================================
   Marketing GPA (Growth Path Academy) — configuración (uso personal, solo operaciones@)
   La base es TU Excel del plan en SharePoint (sitio IC Apps › Documentos › Personal/Marketing GPA).
   La app lee y escribe con la API de Excel de Microsoft 365: conserva formato y SharePoint guarda el historial.
   Para que nadie más lo vea: en SharePoint, carpeta «Marketing GPA» › Administrar acceso › Configuración avanzada ›
   Dejar de heredar permisos y dejar solo tu cuenta.
   ===================================================================== */
window.CFG = {
  app: { id: 'PER-02', nombre: 'Marketing GPA', version: '0.1.10' },
  auth: {
    clientId: 'bfe1678b-5690-4aa5-8ce8-6c2522b2a7d0',
    tenantId: 'f947955a-8748-4cc4-a54b-61ad1d4b0ba7',
    redirectPath: '/ideascontrol/Portal/',
    scopes: ['User.Read', 'Sites.ReadWrite.All']
  },
  sitio: { host: 'ideascontrolsas.sharepoint.com', ruta: '/sites/ICApps' },
  logo: '/ideascontrol/MarketingGPA/img/gpa-logo.png',
  icono: '/ideascontrol/MarketingGPA/img/gpa-icono.png',
  usuarios: ['operaciones@ideascontrol.com'],           // solo tú

  carpeta: 'Personal/Marketing GPA',
  excel: 'Personal/Marketing GPA/Plan_GPA_6_Meses.xlsx',
  hojas: {
    calendario: 'Calendario 6 meses', plan: 'Plan por mes', estrategia: 'Estrategia semanal', recursos: 'Recursos y enlaces',
    campana: 'Campaña paga', medicion: 'Medición y optimización', produccion: 'Producción y control', instrucciones: 'Instrucciones', lineas: 'Mapa de líneas GPA',
    // hojas que crea la app (si no existen)
    metricas: 'Métricas', leads: 'Leads', pauta: 'Pauta', newsletter: 'Newsletter'
  },
  // Columnas del calendario (se buscan por el nombre del encabezado; las de la app se agregan al final si faltan)
  colsPlan: {
    semana: 'Semana (lunes de inicio)', semanaPlan: 'Semana del plan', fecha: 'Fecha de publicación', dia: 'Día de publicación', canal: 'Canal', formato: 'Formato',
    etapa: 'Etapa del embudo', gancho: 'Gancho', texto: 'Texto completo / guion', cta: 'CTA', direccion: 'Dirección creativa', recurso: 'Microapp / recurso GPA sugerido',
    enlaceRecurso: 'Enlace microapp / recurso', pagina: 'Página comercial / destino', enlacePagina: 'Enlace página comercial', indicador: 'Indicador principal'
  },
  colsApp: { id: 'ID', estado: 'Estado', copyFinal: 'Copy final', diseno: 'Diseño (JSON)', link: 'Link publicado', notas: 'Notas', enlace: 'Enlace destino (editado)' },
  prefijoId: 'GPA-',
  formatoFecha: 'dd/mm/yyyy',

  estados: ['Planeada', 'En producción', 'Lista', 'Programada', 'Publicada', 'Cancelada'],
  // Orden de las redes en todas las vistas
  redes: ['LinkedIn personal', 'LinkedIn empresa', 'Facebook', 'Instagram', 'TikTok'],
  // Día fijo de publicación por red (1 = lunes). Se aplica desde «Plan › Días de publicación»
  diaFijo: { 'LinkedIn personal': 1 },
  medidas: {
    Facebook: '1080 × 1350 px (vertical 4:5)', Instagram: '1080 × 1350 px (vertical 4:5)', LinkedIn: '1200 × 627 px (horizontal)',
    TikTok: '1080 × 1920 px (vertical 9:16)', historia: '1080 × 1920 px (vertical 9:16)'
  },
  hashtags: {
    Facebook: '#GrowthPathAcademy #Liderazgo #TalentoHumano #DesarrolloOrganizacional',
    Instagram: '#GrowthPathAcademy #Liderazgo #TalentoHumano #GestionDelTalento #LiderazgoConProposito #MenosTeoriaMasPiso',
    'LinkedIn personal': '#Liderazgo #TalentoHumano #DesarrolloOrganizacional',
    'LinkedIn empresa': '#GrowthPathAcademy #Liderazgo #TalentoHumano',
    TikTok: '#liderazgo #talentohumano #jefes #trabajo #GPA'
  },
  utm: { medio: 'organico', campana: 'gpa-sem-' },
  marca: {
    nombre: 'Growth Path Academy (GPA)', lema: 'Menos teoría. Más piso.',
    colores: { navy: '#1B3A6B', teal: '#007A78', oro: '#C5A028' }, fuente: 'Outfit'
  },
  contacto: 'growthpathacademy.com.co',
  // Newsletter de LinkedIn (Biblioteca BPO)
  newsletter: { serie: 'Biblioteca BPO', firma: 'Martín Molina', sitio: 'growthpathacademy.com.co', enlace: 'https://growthpathacademy.com.co/newsletter.html', utmCampana: 'biblioteca-bpo', portada: '1920 × 1080 px (horizontal 16:9) — portada del artículo de LinkedIn',
    // Web de GPA (GitHub Pages): sección GPA Insights. Colecciones = filtros de newsletter.html
    web: {
      repo: 'growthpathacademy/bpo2bpo', rama: 'main',
      colecciones: [
        { clave: 'decisiones', nombre: 'El dueño de tus decisiones', emoji: '🧠', ebook: 'El Dueño de tus Decisiones', ebookUrl: 'https://go.hotmart.com/N106441726P' },
        { clave: 'talento', nombre: 'Líderes que despiertan talento', emoji: '🌱', ebook: 'Líderes que despiertan talento', ebookUrl: 'https://go.hotmart.com/M107178772S' },
        { clave: 'todo-resuelto', nombre: 'Aprender a vivir sin tener todo resuelto', emoji: '🕊️', ebook: 'Aprender a Vivir Sin Tener Todo Resuelto', ebookUrl: 'https://growthpathacademy.com.co/landing/todo-resuelto/index.html' }
      ]
    }
  }
};
