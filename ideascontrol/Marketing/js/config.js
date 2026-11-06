/* =====================================================================
   APP-112 · Marketing — configuración
   Un tema -> varias publicaciones (una por red y fecha) -> sus métricas.
   Datos: MKT_Temas, MKT_Publicaciones, MKT_Metricas (IC Apps). Piezas: Documentos/Marketing/Piezas/<PUB>/
   ===================================================================== */
window.CFG = {
  app: { id: 'APP-112', nombre: 'Marketing', version: '0.1.1' },
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

  // Destinos para los enlaces con UTM (Centro de herramientas y landings)
  destinos: [
    ['Centro de herramientas', 'https://www.mykadosh.com/ideascontrol/Herramientas/'],
    ['Centro de conocimiento (artículos)', 'https://www.mykadosh.com/ideascontrol/Recursos/'],
    ['Diagnóstico de Madurez', 'https://www.mykadosh.com/ideascontrol/DiagnosticoMadurezTyA/'],
    ['Costo del Ausentismo', 'https://www.mykadosh.com/ideascontrol/CostoHoraAusente/'],
    ['Piloto de Tiempo y Asistencia', 'https://www.mykadosh.com/ideascontrol/PilotoTyA/'],
    ['TimeVision', 'https://www.mykadosh.com/ideascontrol/TimeVision/'],
    ['Sitio web ideascontrol.com', 'https://www.ideascontrol.com/']
  ],
  // Guía de marca para el brief de las piezas (ChatGPT / Canva / CapCut)
  marca: 'Marca Ideas Control: azul #0E76BC, teal #159090, dorado #C9A227, azul oscuro #0B2945; logo de huella (azul/verde/dorado) arriba a la izquierda; tipografía sans-serif (Inter/Montserrat); estilo limpio, profesional, B2B, Colombia. Formato 1080×1350 para feed, 1080×1920 para historia/Reel. Pocas palabras en la imagen; el mensaje largo va en el copy.'
};
