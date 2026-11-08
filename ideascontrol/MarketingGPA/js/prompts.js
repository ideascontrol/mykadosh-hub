/* =====================================================================
   Marketing GPA — plantillas de los prompts (editables desde «Archivos»; se guardan en SharePoint)
   ===================================================================== */
window.GPA_PROMPTS = {
  archivos: {
    imagen: 'Personal/Marketing GPA/Plantillas/Prompt_Imagen_GPA.txt',
    mejorar: 'Personal/Marketing GPA/Plantillas/Prompt_Mejorar_Semana_GPA.txt',
    analisis: 'Personal/Marketing GPA/Plantillas/Prompt_Analisis_GPA.txt'
  },

  /* Imagen de cada pieza (otra IA). La app agrega al final los datos de la pieza. */
  imagen: [
    'Actúa como director de arte especializado en piezas editoriales B2B para redes sociales.',
    'Crea la imagen de una publicación de Growth Path Academy (GPA), firma de formación y consultoría en liderazgo, talento y desarrollo organizacional. Lema: «Menos teoría. Más piso.» Usa la información de la pieza que va al final.',
    '',
    '1. Formato',
    '• Usa exactamente las medidas indicadas en «Medidas». Alta calidad y resolución.',
    '• Márgenes de seguridad: ningún texto ni elemento importante pegado a los bordes.',
    '',
    '2. Logo',
    '• Usa el logo de GPA que te adjunto, sin modificarlo (ni colores, ni letras, ni proporciones), en la ubicación que indica «Ubicación del logo» de cada pieza, siempre legible.',
    '• Si ya lo tienes de una imagen anterior en esta conversación, úsalo igual. No inventes otros logos, marcas ni sellos.',
    '',
    '3. Identidad visual GPA',
    '• Colores: azul marino #1B3A6B (principal), verde azulado #007A78 y dorado #C5A028 solo como acento. Fondos claros (blanco roto) o azul marino, con muy buen contraste.',
    '• Tipografía: Outfit (o una sans-serif geométrica similar), titular grande en negrilla; resalta la palabra clave con dorado o con una franja detrás.',
    '• Estilo editorial, sobrio y profesional: fotografía realista y luminosa de líderes, supervisores y equipos latinoamericanos en contextos reales de trabajo (oficinas, plantas, operaciones, reuniones 1 a 1), o diseño tipográfico limpio cuando la pieza es una frase.',
    '• Recursos que sí usamos: contraste antes / después, listas cortas con íconos de línea, tarjetas, preguntas en grande, citas del fundador, botón de llamado a la acción redondeado.',
    '• Personas: en cada publicación, personas diferentes a las de las publicaciones anteriores (otras caras, edades, peinados y ropa), según «Personas» de cada pieza. Solo se repiten entre las láminas de un mismo carrusel o los tramos de un mismo video.',
    '• Evita clichés: escaleras al éxito, apretones de manos, bombillos, rompecabezas, personas señalando gráficas genéricas.',
    '',
    '4. Texto en la imagen',
    '• Reproduce exactamente el «Texto en la imagen», en español y sin errores ortográficos. Máximo 20 palabras por imagen.',
    '• No agregues URLs, teléfonos, correos ni hashtags.',
    '',
    '5. Según el formato',
    '• Carrusel: una imagen por lámina, misma línea visual, número de lámina discreto.',
    '• Video / Reel / TikTok: portada vertical con el gancho como titular; si se pide un tramo, imagen vertical para ese tramo.',
    '• LinkedIn (horizontal): titular a un lado y fotografía al otro.',
    '',
    '6. Antes de entregar, verifica: medidas, logo igual al adjunto, texto completo y bien escrito dentro de márgenes, contraste y colores de marca.',
    '',
    '7. Genera directamente la imagen terminada, sin explicaciones ni alternativas.'
  ].join('\n'),

  /* Mejorar la semana. La app agrega: estrategia de la semana, ciclo, recursos permitidos y todas las piezas del Excel. */
  mejorar: [
    'Actúa como estratega de contenido B2B y redactor senior de Growth Path Academy (GPA), firma colombiana de formación y consultoría en liderazgo, talento y desarrollo organizacional. Lema: «Menos teoría. Más piso.»',
    'Audiencia: personas que lideran y organizaciones que dependen de sus equipos (gerencia general, talento humano, líderes de área). BPO / Contact Center es la especialidad, no el único mercado.',
    '',
    'Te paso las piezas ya planeadas para una semana. Mejóralas SIN cambiar el tema, el canal, la fecha ni el formato:',
    '1. Gancho más fuerte en la primera línea (sin clickbait).',
    '2. Estructura Gancho – Dolor – Autoridad – Solución – CTA, adaptada al canal (no copies el mismo texto en todas las redes).',
    '3. Tono cercano, experto y concreto; nada de frases vacías. Español de Colombia, tuteo.',
    '4. Facebook: conversación y comunidad. Instagram: visual, carruseles que se guardan. LinkedIn personal: voz del fundador, experiencia propia, sin vender. LinkedIn empresa: institucional con enlace. TikTok: guion hablado con tramos y texto en pantalla.',
    '5. Respeta las precauciones de los recursos (una autoevaluación individual no es un diagnóstico de empresa; IMO®, Ruta TM y Ruta QA son de BPO / Contact Center).',
    '6. No inventes cifras, testimonios ni casos. Si un dato no es verificable, plantéalo como pregunta o experiencia.',
    '7. Emojis con moderación (0 a 3 por post). No uses números ni letras con recuadro (1️⃣ 🅰️): salen como letras en Word y en LinkedIn.',
    '8. Describe el diseño para generar la imagen con IA: escena, composición y texto exacto en la imagen; en carruseles, una entrada por lámina.'
  ].join('\n'),

  /* Formato de respuesta (fijo, lo agrega la app al final) */
  formatoMejorar: [
    'FORMATO DE RESPUESTA (obligatorio):',
    'Responde SOLO con un bloque ```json``` con esta estructura, una entrada por cada pieza recibida y con el mismo "id":',
    '{',
    '  "tipo": "gpa_semana",',
    '  "semana": "AAAA-MM-DD",',
    '  "piezas": [',
    '    {',
    '      "id": "GPA-0001",',
    '      "gancho": "primera línea",',
    '      "copy": "texto completo listo para publicar, sin el CTA, sin enlaces y sin hashtags",',
    '      "cta": "llamado a la acción",',
    '      "hashtags": "#uno #dos #tres",',
    '      "diseno": { "descripcion": "escena y composición", "texto_en_imagen": "titular | apoyo | botón", "laminas": ["Lámina 1: …", "Lámina 2: …"] },',
    '      "video": { "tramos": [ { "nombre": "Gancho", "tiempo": "0–3 s", "pantalla": "texto en pantalla", "voz": "lo que se dice", "escena": "qué se ve" } ] },',
    '      "cambios": "qué mejoraste y por qué (1 línea)"',
    '    }',
    '  ],',
    '  "notas_semana": "recomendaciones generales para la semana (opcional)"',
    '}',
    'Reglas: "laminas" solo si es carrusel (si no, []); "video" solo si es video, Reel o TikTok (si no, null). En "copy" separa párrafos con \\n\\n. No escribas nada fuera del bloque JSON.'
  ].join('\n'),

  /* Análisis de resultados */
  analisis: [
    'Actúa como analista de marketing B2B de Growth Path Academy (GPA). Te paso los resultados de un periodo: publicaciones (red, formato, etapa del embudo, tema), sus métricas, los leads y reuniones generados y la pauta.',
    'Entrega un informe ejecutivo en español, ordenado por fecha y red, con:',
    '1. Resumen en 5 líneas (qué funcionó y qué no).',
    '2. Mejores y peores piezas, con el porqué (gancho, formato, etapa, red).',
    '3. Embudo: alcance → interacción → clics → leads → leads calificados → reuniones; dónde se pierde.',
    '4. Pauta: comparación de ganchos A/B (costo por lead si hay datos).',
    '5. Cinco acciones concretas para las próximas dos semanas.',
    'No inventes datos: si falta información, dilo. Usa títulos con ## y viñetas.'
  ].join('\n')
};
