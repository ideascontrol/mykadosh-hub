/* =====================================================================
   PER-03 · Reflexiones Estratégicas — Growth Path Academy (en el ecosistema de Ideas Control)
   Colección editorial: historias y análisis a partir de relatos bíblicos.
   Datos: listas RE_* en SharePoint (IC Apps). Las listas tienen permisos únicos:
   solo entran las personas con acceso (lo administra la propia app, con efecto real en SharePoint).
   Catálogos semilla (66 libros y modelo de dimensiones/competencias del Excel «Reflexiones Estratégicas»);
   después se administran en la app (Configuración).
   ===================================================================== */
window.CFG = {
  app: { id: 'PER-03', nombre: 'Reflexiones Estratégicas', version: '0.2.0' },
  auth: {
    clientId: 'bfe1678b-5690-4aa5-8ce8-6c2522b2a7d0',
    tenantId: 'f947955a-8748-4cc4-a54b-61ad1d4b0ba7',
    redirectPath: '/ideascontrol/Portal/',
    scopes: ['User.Read', 'Sites.ReadWrite.All']
  },
  sitio: { host: 'ideascontrolsas.sharepoint.com', ruta: '/sites/ICApps' },
  spWeb: 'https://ideascontrolsas.sharepoint.com/sites/ICApps',
  spScopes: ['https://ideascontrolsas.sharepoint.com/AllSites.FullControl'],
  dominio: '@ideascontrol.com',
  // Dueño de la app: administra accesos y configuración. A quién pedir acceso.
  admins: ['operaciones@ideascontrol.com'],
  contactoAcceso: 'Martín Molina (operaciones@ideascontrol.com)',
  logo: '/ideascontrol/MarketingGPA/img/gpa-logo.png',
  icono: '/ideascontrol/MarketingGPA/img/gpa-icono.png',
  carpetaPortadas: 'Reflexiones Estrategicas/Portadas',
  // Se publica como colección en Desarrollo de Talento (APP-108): visible para todo el personal, sin avisos ni correos
  coleccion: { id: 'REFLEXIONES', nombre: 'Reflexiones Estratégicas' },
  carpetaTalento: 'Talento/Colecciones/Reflexiones',
  web: { base: 'https://growthpathacademy.com.co', carpeta: 'reflexiones', indice: 'reflexiones.html', marca: 'Growth Path Academy' },
  frecuencia: 'Una reflexión nueva por semana',
  versiones: ['RVR1960', 'NVI', 'NTV', 'LBLA', 'DHH', 'RVC', 'TLA'],

  // Listas y el permiso que da cada rol en SharePoint (2 = leer, 3 = contribuir, 5 = control total: puede administrar los accesos de estas listas)
  listas: ['RE_Reflexiones', 'RE_Historial', 'RE_Distribucion', 'RE_Aprobaciones', 'RE_Libros', 'RE_Competencias', 'RE_Config', 'RE_Accesos'],
  permisos: {
    LECTOR:  { RE_Reflexiones: 2, RE_Historial: 2, RE_Distribucion: 2, RE_Aprobaciones: 2, RE_Libros: 2, RE_Competencias: 2, RE_Config: 2, RE_Accesos: 2 },
    EDITOR:  { RE_Reflexiones: 3, RE_Historial: 3, RE_Distribucion: 3, RE_Aprobaciones: 2, RE_Libros: 2, RE_Competencias: 2, RE_Config: 3, RE_Accesos: 2 },
    REVISOR: { RE_Reflexiones: 3, RE_Historial: 3, RE_Distribucion: 3, RE_Aprobaciones: 3, RE_Libros: 2, RE_Competencias: 2, RE_Config: 3, RE_Accesos: 2 },
    ADMIN:   { RE_Reflexiones: 5, RE_Historial: 5, RE_Distribucion: 5, RE_Aprobaciones: 5, RE_Libros: 5, RE_Competencias: 5, RE_Config: 5, RE_Accesos: 5 }
  },
  roles: [['ADMIN', 'Administrador', 'Administra accesos, configuración y contenido'], ['EDITOR', 'Editor', 'Crea, modifica, clasifica y programa reflexiones'],
    ['REVISOR', 'Revisor', 'Además aprueba (revisión bíblica y editorial)'], ['LECTOR', 'Lector', 'Solo consulta las reflexiones publicadas']],

  // Flujo editorial
  estados: [['IDEA', 'Idea'], ['DESARROLLO', 'En desarrollo'], ['REV_BIBLICA', 'Revisión bíblica'], ['REV_EDITORIAL', 'Revisión editorial'],
    ['APROBADA', 'Aprobada'], ['PROGRAMADA', 'Programada'], ['PUBLICADA', 'Publicada'], ['ARCHIVADA', 'Archivada']],

  // Distribución: piezas (formatos) y canales
  piezas: [['COMPLETA', 'Publicación completa (web)'], ['LINKEDIN', 'Resumen para LinkedIn'], ['FACEBOOK', 'Texto para Facebook'], ['INSTAGRAM', 'Texto para Instagram'],
    ['FRASE', 'Frase destacada'], ['PREGUNTA', 'Pregunta para generar interacción'], ['VIDEO', 'Guion para video corto'], ['CARRUSEL', 'Propuesta de carrusel']],
  canales: [['WEB', 'Desarrollo de Talento (IC)', 'COMPLETA'], ['LI_PERSONAL', 'LinkedIn personal', 'LINKEDIN'], ['LI_GPA', 'LinkedIn empresarial de GPA', 'LINKEDIN'],
    ['FACEBOOK', 'Facebook', 'FACEBOOK'], ['INSTAGRAM', 'Instagram', 'INSTAGRAM'], ['NEWSLETTER', 'Newsletter de GPA', 'LINKEDIN']],
  estadosCanal: [['PENDIENTE', 'Pendiente'], ['PREPARADO', 'Preparado'], ['PROGRAMADO', 'Programado'], ['PUBLICADO', 'Publicado']],
  areas: ['Liderazgo', 'Toma de decisiones', 'Desarrollo personal', 'Relaciones humanas', 'Vida familiar', 'Vida profesional', 'Negocios y emprendimiento', 'Fe y propósito'],

  // Semillas de catálogos: [código, nombre, orden canónico, testamento]
  libros: [
    ['GEN', 'Génesis', 1, 'AT'],
    ['EXO', 'Éxodo', 2, 'AT'],
    ['LEV', 'Levítico', 3, 'AT'],
    ['NUM', 'Números', 4, 'AT'],
    ['DEU', 'Deuteronomio', 5, 'AT'],
    ['JOS', 'Josué', 6, 'AT'],
    ['JUE', 'Jueces', 7, 'AT'],
    ['RUT', 'Rut', 8, 'AT'],
    ['1SA', '1 Samuel', 9, 'AT'],
    ['2SA', '2 Samuel', 10, 'AT'],
    ['1RE', '1 Reyes', 11, 'AT'],
    ['2RE', '2 Reyes', 12, 'AT'],
    ['1CR', '1 Crónicas', 13, 'AT'],
    ['2CR', '2 Crónicas', 14, 'AT'],
    ['ESD', 'Esdras', 15, 'AT'],
    ['NEH', 'Nehemías', 16, 'AT'],
    ['EST', 'Ester', 17, 'AT'],
    ['JOB', 'Job', 18, 'AT'],
    ['PSA', 'Salmos', 19, 'AT'],
    ['PRO', 'Proverbios', 20, 'AT'],
    ['ECL', 'Eclesiastés', 21, 'AT'],
    ['CNT', 'Cantares', 22, 'AT'],
    ['ISA', 'Isaías', 23, 'AT'],
    ['JER', 'Jeremías', 24, 'AT'],
    ['LAM', 'Lamentaciones', 25, 'AT'],
    ['EZE', 'Ezequiel', 26, 'AT'],
    ['DAN', 'Daniel', 27, 'AT'],
    ['OSE', 'Oseas', 28, 'AT'],
    ['JOE', 'Joel', 29, 'AT'],
    ['AMO', 'Amós', 30, 'AT'],
    ['ABD', 'Abdías', 31, 'AT'],
    ['JON', 'Jonás', 32, 'AT'],
    ['MIQ', 'Miqueas', 33, 'AT'],
    ['NAH', 'Nahúm', 34, 'AT'],
    ['HAB', 'Habacuc', 35, 'AT'],
    ['SOF', 'Sofonías', 36, 'AT'],
    ['HAG', 'Hageo', 37, 'AT'],
    ['ZAC', 'Zacarías', 38, 'AT'],
    ['MAL', 'Malaquías', 39, 'AT'],
    ['MAT', 'Mateo', 40, 'NT'],
    ['MAR', 'Marcos', 41, 'NT'],
    ['LUC', 'Lucas', 42, 'NT'],
    ['JUA', 'Juan', 43, 'NT'],
    ['HCH', 'Hechos', 44, 'NT'],
    ['ROM', 'Romanos', 45, 'NT'],
    ['1CO', '1 Corintios', 46, 'NT'],
    ['2CO', '2 Corintios', 47, 'NT'],
    ['GAL', 'Gálatas', 48, 'NT'],
    ['EFE', 'Efesios', 49, 'NT'],
    ['FIL', 'Filipenses', 50, 'NT'],
    ['COL', 'Colosenses', 51, 'NT'],
    ['1TS', '1 Tesalonicenses', 52, 'NT'],
    ['2TS', '2 Tesalonicenses', 53, 'NT'],
    ['1TI', '1 Timoteo', 54, 'NT'],
    ['2TI', '2 Timoteo', 55, 'NT'],
    ['TIT', 'Tito', 56, 'NT'],
    ['FLM', 'Filemón', 57, 'NT'],
    ['HEB', 'Hebreos', 58, 'NT'],
    ['STG', 'Santiago', 59, 'NT'],
    ['1PE', '1 Pedro', 60, 'NT'],
    ['2PE', '2 Pedro', 61, 'NT'],
    ['1JN', '1 Juan', 62, 'NT'],
    ['2JN', '2 Juan', 63, 'NT'],
    ['3JN', '3 Juan', 64, 'NT'],
    ['JUD', 'Judas', 65, 'NT'],
    ['APO', 'Apocalipsis', 66, 'NT']
  ],
  dimensiones: [
    { id: 'D1', nombre: "Liderazgo personal", descripcion: "La capacidad de gobernarse a sí mismo antes de influir en otros.", competencias: [
      ["Identidad", "Conocer quién soy, reconocer mi valor y comprender el propósito que orienta mi vida."],
      ["Carácter", "Actuar de manera coherente con principios y convicciones, incluso bajo presión."],
      ["Integridad", "Mantener la honestidad y la coherencia entre lo que pienso, digo y hago."],
      ["Disciplina", "Sostener hábitos, compromisos y acciones consistentes en el tiempo."],
      ["Humildad", "Reconocer límites, aceptar corrección y mantener disposición para aprender."],
      ["Autocontrol", "Regular impulsos, emociones y reacciones para responder con criterio."]] },
    { id: 'D2', nombre: "Relaciones humanas", descripcion: "La capacidad de construir relaciones sanas, comprender a otros y gestionar las diferencias.", competencias: [
      ["Comunicación", "Escuchar con atención y expresar ideas, necesidades y límites con claridad y respeto."],
      ["Empatía", "Comprender las circunstancias, emociones y perspectivas de otras personas."],
      ["Inteligencia emocional", "Reconocer y gestionar las propias emociones y responder prudentemente ante las de otros."],
      ["Perdón", "Renunciar al resentimiento y afrontar las ofensas sin negar el daño ocurrido."],
      ["Reconciliación", "Buscar la restauración de relaciones cuando existen condiciones para reconstruir el vínculo."],
      ["Resolución de conflictos", "Abordar desacuerdos con justicia, diálogo y búsqueda de soluciones."]] },
    { id: 'D3', nombre: "Liderazgo e influencia", descripcion: "La capacidad de movilizar, desarrollar y servir a otras personas con el ejemplo.", competencias: [
      ["Liderazgo", "Influir y orientar a otros mediante el ejemplo, el servicio y la responsabilidad."],
      ["Servicio", "Poner las capacidades propias al servicio de las necesidades legítimas de otros."],
      ["Desarrollo de personas", "Acompañar a otros para que aprendan, maduren y desarrollen sus capacidades."],
      ["Trabajo en equipo", "Cooperar con otros, construir acuerdos y contribuir a un propósito compartido."],
      ["Delegación", "Confiar responsabilidades con claridad, acompañamiento y autonomía."],
      ["Autoridad", "Ejercer la responsabilidad y la influencia de manera legítima, justa y responsable."]] },
    { id: 'D4', nombre: "Pensamiento estratégico", descripcion: "La capacidad de comprender escenarios, administrar recursos y tomar decisiones con sabiduría.", competencias: [
      ["Visión", "Reconocer posibilidades futuras y orientar las acciones hacia un propósito definido."],
      ["Planeación", "Anticipar necesidades, ordenar acciones y preparar los recursos para alcanzar objetivos."],
      ["Toma de decisiones", "Evaluar alternativas y elegir responsablemente, incluso con información limitada."],
      ["Administración de recursos", "Gestionar de manera responsable el tiempo, los talentos, el dinero y las oportunidades."],
      ["Priorización", "Distinguir lo importante y ordenar esfuerzos según su valor y urgencia."],
      ["Mayordomía", "Administrar fielmente los recursos y responsabilidades que han sido confiados."],
      ["Gestión del riesgo", "Reconocer amenazas e incertidumbres y actuar para reducir sus posibles consecuencias."]] },
    { id: 'D5', nombre: "Fortaleza en la adversidad", descripcion: "La capacidad de enfrentar dificultades sin perder la esperanza ni abandonar el propósito.", competencias: [
      ["Resiliencia", "Recuperarse y reconstruirse después de experiencias difíciles."],
      ["Perseverancia", "Mantener el esfuerzo y la fidelidad a lo importante a pesar de los obstáculos."],
      ["Esperanza", "Conservar la confianza en el futuro aun cuando las circunstancias sean inciertas."],
      ["Manejo de crisis", "Responder ante situaciones críticas con serenidad, discernimiento y responsabilidad."],
      ["Paciencia", "Saber esperar y actuar en el momento oportuno sin precipitarse."],
      ["Adaptabilidad", "Ajustarse a circunstancias cambiantes sin renunciar a los principios esenciales."]] },
    { id: 'D6', nombre: "Vida con propósito", descripcion: "La capacidad de orientar la vida conforme a la fe, los principios y las convicciones trascendentes.", competencias: [
      ["Fe", "Confiar en Dios y mantener la confianza aun cuando no se comprende el camino."],
      ["Obediencia", "Responder con acciones a los principios y enseñanzas de Dios."],
      ["Sabiduría", "Discernir y aplicar correctamente el conocimiento en las decisiones de la vida."],
      ["Propósito", "Orientar las decisiones y acciones hacia una razón de vida que trasciende el éxito personal."],
      ["Responsabilidad", "Asumir las consecuencias de las decisiones y cumplir los compromisos propios."],
      ["Legado", "Vivir y actuar considerando la huella y la influencia que permanecerán en otros."]] }
  ]
};
