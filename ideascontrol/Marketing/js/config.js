/* =====================================================================
   APP-112 · Marketing — configuración
   Un tema -> varias publicaciones (una por red y fecha) -> sus métricas.
   Datos: MKT_Temas, MKT_Publicaciones, MKT_Metricas (IC Apps). Piezas: Documentos/Marketing/Piezas/<PUB>/
   ===================================================================== */
window.CFG = {
  app: { id: 'APP-112', nombre: 'Marketing', version: '0.3.0' },
  auth: {
    clientId: 'bfe1678b-5690-4aa5-8ce8-6c2522b2a7d0',
    tenantId: 'f947955a-8748-4cc4-a54b-61ad1d4b0ba7',
    redirectPath: '/ideascontrol/Portal/',
    scopes: ['User.Read', 'Sites.ReadWrite.All']
  },
  sitio: { host: 'ideascontrolsas.sharepoint.com', ruta: '/sites/ICApps' },
  logo: '/ideascontrol/assets/ideascontrol.webp',
  listas: { temas: 'MKT_Temas', pubs: 'MKT_Publicaciones', mets: 'MKT_Metricas' },
  carpetaPiezas: 'Marketing/Piezas',

  // Quién usa la app y aprueba. Se necesitan mínimo 2 aprobaciones de estas personas.
  usuarios: {
    'patricia@ideascontrol.com': 'Gerencia General',
    'margarita@ideascontrol.com': 'Dirección Comercial',
    'operaciones@ideascontrol.com': 'Dirección de Operaciones'
  },
  minAprobaciones: 2,

  estados: [
    ['Planeada', 'Está en el plan; todavía no se produce.'],
    ['En producción', 'Se está escribiendo el copy o diseñando la pieza (o se pidieron cambios).'],
    ['En aprobación', 'Lista para revisar. Necesita ' + 2 + ' aprobaciones.'],
    ['Aprobada', 'Tiene las aprobaciones necesarias. Se puede programar.'],
    ['Programada', 'Programada en Meta Business Suite / la red.'],
    ['Publicada', 'Ya salió. Registre el link publicado.'],
    ['Cancelada', 'No se publicará.']
  ],
  canales: ['Facebook / Instagram', 'Facebook', 'Instagram', 'LinkedIn Newsletter', 'LinkedIn', 'TikTok / Youtube', 'TikTok', 'YouTube'],
  redes: ['Facebook', 'Instagram', 'LinkedIn', 'TikTok', 'YouTube'],
  formatos: ['Imagen', 'Carrusel', 'Reel / video corto', 'Historia', 'Artículo / Newsletter', 'Texto', 'Video largo'],
  tipos: ['Orgánico', 'Pago'],
  objetivos: ['Reconocimiento', 'Interacción', 'Tráfico', 'Leads', 'Mensajes', 'Ventas'],

  // Metas del embudo (hoja «Definicion KPIs» del Plan de Marketing). Se comparan con el periodo del resumen.
  metas: { alcance: 2000, interacciones: 200, clics: 80, microapps: 40, leads: 12 },

  // Destinos para los enlaces con UTM: [nombre, URL, palabra clave que se muestra en vez del enlace]
  destinos: [
    ['Centro de herramientas', 'https://www.mykadosh.com/ideascontrol/Herramientas/', 'Herramientas gratuitas'],
    ['Centro de conocimiento (artículos)', 'https://www.mykadosh.com/ideascontrol/Recursos/', 'Artículos de Ideas Control'],
    ['Diagnóstico de Madurez', 'https://www.mykadosh.com/ideascontrol/DiagnosticoMadurezTyA/', 'Diagnóstico de madurez gratuito'],
    ['Costo del Ausentismo', 'https://www.mykadosh.com/ideascontrol/CostoHoraAusente/', 'Calculadora del costo del ausentismo'],
    ['Piloto de Tiempo y Asistencia', 'https://www.mykadosh.com/ideascontrol/PilotoTyA/', 'Piloto de 15 días'],
    ['TimeVision', 'https://www.mykadosh.com/ideascontrol/TimeVision/', 'TimeVision'],
    ['Sitio web ideascontrol.com', 'https://www.ideascontrol.com/', 'ideascontrol.com']
  ],
  // Generador de contenido con Claude (#generar)
  generador: {
    carpetaSemanas: 'Marketing/Semanas',          // Word y respaldo JSON del contenido de cada semana
    carpetaNewsletters: 'Marketing/Newsletters',  // respaldo JSON de cada newsletter (el Word queda en las piezas de la publicación)
    // Hashtags aprobados por red: la app los agrega a cada copy (Claude no los cambia)
    hashtags: {
      linkedinPersonal: '#WFM #RRHH #RecursosHumanos #Nomina #WorkforceManagement #GestionDeAsistencia #ControlDeAsistencia #TiempoYAsistencia #IdeasControl',
      linkedinIC: '#GestionHumana #GestionDeAsistencia #ControlDeAsistencia #TiempoYAsistencia #NovedadesDeNomina',
      facebook: '#IdeasControl #WFM #RRHH #RecursosHumanos #Nomina #GestionDeAsistencia #ControlDeAsistencia #TiempoYAsistencia #productividad',
      instagram: '#ideascontrol #wfm #rrhh #recursoshumanos #nomina #gestiondeasistencia #controldeasistencia #tiempoyasistencia',
      tiktok: '#WFM #RRHH #RecursosHumanos #Nomina #WorkforceManagement #GestionDeAsistencia #ControlDeAsistencia #TiempoYAsistencia #IdeasControl'
    },
    // Estructura estándar de la semana (como el Word «Contenido Sem ddmmaaaa IC»). dia: 0 = lunes … 4 = viernes.
    // principal: pieza principal de la red (ahí cae la publicación del plan de Excel de esa red).
    semana: [
      { grupo: 'LinkedIn Personal', canal: 'LinkedIn', dia: 2, principal: true, seccion: 'Copy para el Newsletter', hashtags: 'linkedinPersonal',
        nota: 'Post personal de opinión dirigido a gerentes que acompaña el newsletter. En "variantes" incluye «Variante estilo Isra Bravo» (frases muy cortas, storytelling) y «Formato Frogmatter» (el mismo mensaje con diseño para LinkedIn: separadores y un emoji por línea).' },
      { grupo: 'LinkedIn Ideas Control', canal: 'LinkedIn', dia: 2, seccion: 'Share with comments', hashtags: 'linkedinIC', nota: 'Desde la página de Ideas Control: compartir el newsletter o el post con un comentario de la empresa.' },
      { grupo: 'Facebook', canal: 'Facebook', dia: 0, principal: true, seccion: 'FB Copy', hashtags: 'facebook', nota: 'Post principal de Facebook de la semana (también sirve como anuncio de pauta).' },
      { grupo: 'Facebook', canal: 'Facebook', dia: 0, hashtags: 'facebook' },
      { grupo: 'Facebook', canal: 'Facebook', dia: 1, hashtags: 'facebook' },
      { grupo: 'Facebook', canal: 'Facebook', dia: 2, hashtags: 'facebook' },
      { grupo: 'Facebook', canal: 'Facebook', dia: 3, hashtags: 'facebook' },
      { grupo: 'Instagram', canal: 'Instagram', dia: 0, principal: true, seccion: 'Ins Copy', hashtags: 'instagram', nota: 'Post principal de Instagram de la semana.' },
      { grupo: 'Instagram', canal: 'Instagram', dia: 1, hashtags: 'instagram' },
      { grupo: 'Instagram', canal: 'Instagram', dia: 2, hashtags: 'instagram' },
      { grupo: 'Instagram', canal: 'Instagram', dia: 3, hashtags: 'instagram' },
      { grupo: 'Instagram', canal: 'Instagram', dia: 4, hashtags: 'instagram' },
      { grupo: 'TikTok', canal: 'TikTok', dia: 4, principal: true, seccion: 'TT Copy y video 30 segundos', hashtags: 'tiktok', formato: 'Reel / video corto' }
    ],
    // Bloque de contacto (Facebook y TikTok, como en el formato semanal)
    contacto: '📍 Conócenos aquí:\n📲 +57 321 318 4853\n📧 info@ideascontrol.com\n🌐 www.ideascontrol.com',
    contactoLinea: '+57 321 318 4853  •  info@ideascontrol.com'
  },
  // Guía de marca para el brief de las piezas (ChatGPT / Canva / CapCut)
  marca: 'Marca Ideas Control: azul #0E76BC, teal #159090, dorado #C9A227, azul oscuro #0B2945; logo de huella (azul/verde/dorado) arriba a la izquierda; tipografía sans-serif (Inter/Montserrat); estilo limpio, profesional, B2B, Colombia. Formato 1080×1350 para feed, 1080×1920 para historia/Reel. Pocas palabras en la imagen; el mensaje largo va en el copy.'
};
