/* =====================================================================
   APP-105 · Gestión documental (SharePoint) — configuración
   Misma vista del portal de manuales, pero los documentos se leen de la
   biblioteca 00_Documentacion_Maestra del sitio Ideas Control con la
   cuenta de Microsoft de cada persona (sin claves compartidas).
   ===================================================================== */
window.CFG = {
  app: { id: 'APP-105', nombre: 'Gestión documental', version: '1.0.5' },
  auth: {
    clientId: 'bfe1678b-5690-4aa5-8ce8-6c2522b2a7d0',
    tenantId: 'f947955a-8748-4cc4-a54b-61ad1d4b0ba7',
    // El inicio de sesión se hace en el Portal (dirección ya registrada en Entra ID) y vuelve aquí
    redirectPath: '/ideascontrol/Portal/',
    scopes: ['User.Read', 'Sites.ReadWrite.All']
  },
  docs: { host: 'ideascontrolsas.sharepoint.com', ruta: '/sites/IdeasControl', biblioteca: '00_Documentacion_Maestra' },
  logo: '/ideascontrol/assets/ideascontrol.webp',
  // Herramientas interactivas que siguen en el portal de manuales anterior
  herramientasBase: '/ideascontrol/ICManuales/gestion-documental/',
  empresa: 'Ideas Control Equipos y Soluciones S.A.S.',
  // Áreas y procesos (la serie del proceso = primeros 2 dígitos del código del documento)
  areas: [
    { id: 'comercial', nombre: 'Gestión Comercial', icono: 'comercial', descripcion: 'Relación con clientes, experiencia, fidelización y marketing.', bloque: '3',
      grupos: [{ id: 'comercial-clientes', nombre: 'Comercial y Relación con Clientes' }, { id: 'experiencia', nombre: 'Experiencia y Fidelización del Cliente' }, { id: 'marketing', nombre: 'Marketing' }] },
    { id: 'gerencia', nombre: 'Gerencia', icono: 'gerencia', descripcion: 'Direccionamiento estratégico, sistema normativo interno y políticas corporativas.', bloque: '1',
      grupos: [{ id: 'gestion-gerencial', serie: '1100', nombre: 'Gestión Gerencial', descripcion: 'Sistema normativo interno: reglamentos, código de ética y políticas corporativas.' }] },
    { id: 'operativa', nombre: 'Gestión Operativa', icono: 'operativa', descripcion: 'Instalación, configuración y mantenimiento de soluciones biométricas y de tiempos y asistencia.', bloque: '2', serie: '2000 · Operaciones Técnicas',
      herramientas: [
        { titulo: 'Ruta del técnico en una instalación', resumen: 'Flujograma del proceso: qué consultar, qué documento generar, qué diligenciar en sitio y cómo archivarlo.', pagina: 'ruta-tecnico.html', icono: 'ruta' },
        { titulo: 'Estructura de carpetas del servidor', resumen: 'Las seis carpetas raíz de IC, su contenido y cómo se nombran clientes, actividades y archivos.', pagina: 'estructura-carpetas.html', icono: 'carpeta' },
        { titulo: 'Diligenciar mantenimiento', resumen: 'Desde el celular: checklist, pruebas e informe por equipo y acta; entrega los Word 2401, 2402, 2403 y 2408 diligenciados.', pagina: 'mantenimiento.html', icono: 'movil' },
        { titulo: 'Generar documentos de trabajo', resumen: 'Plantillas prediligenciadas de instalación (2100) y mantenimiento (2400), con nombre definido y organizadas en la estructura del servidor.', pagina: 'generador.html', icono: 'generar' },
        { titulo: 'Evaluación de conocimientos', resumen: '10 preguntas de instalación, mantenimiento y seguridad de la información. Se aprueba con 80 %.', pagina: 'evaluacion.html', icono: 'evaluar' }
      ],
      grupos: [
        { id: 'instalacion', serie: '2100', nombre: 'Instalación Biométrico Hardware', descripcion: 'Instalación, configuración, integración y puesta en marcha de equipos biométricos.' },
        { id: 'software-tya', nombre: 'Configuración Software Gestión de Tiempos y Asistencia', descripcion: 'Parametrización e integración del software de tiempos y asistencia.' },
        { id: 'soporte', serie: '2300', nombre: 'Soporte Técnico', descripcion: 'Atención de tickets de los equipos biométricos y de la plataforma.' },
        { id: 'mantenimiento', serie: '2400', nombre: 'Gestión de Mantenimiento de Equipos Biométricos', descripcion: 'Mantenimiento preventivo, correctivo y extraordinario con trazabilidad.' },
        { id: 'operaciones', nombre: 'Operaciones y Procesos', descripcion: 'Procedimientos transversales de la operación.' }
      ] },
    { id: 'financiera', nombre: 'Gestión Financiera', icono: 'financiera', descripcion: 'Procesos financieros, contables y de control.', bloque: '7', grupos: [{ id: 'financiera', serie: '7100', nombre: 'Administración y Finanzas', descripcion: 'Políticas y controles para el manejo del efectivo, los gastos y los recursos financieros.' }] },
    { id: 'inventario', nombre: 'Gestión de Inventario', icono: 'inventario', descripcion: 'Control de equipos, repuestos y accesorios.', bloque: '5', grupos: [{ id: 'inventario', nombre: 'Gestión de Inventario' }] },
    { id: 'talento', nombre: 'Gestión del Talento Humano', icono: 'talento', descripcion: 'Selección, vinculación, formación y bienestar del equipo.', bloque: '6', grupos: [{ id: 'talento', nombre: 'Gestión del Talento Humano' }] },
    { id: 'tecnologia', nombre: 'Gestión de la Información y Tecnología', icono: 'tecnologia', descripcion: 'Infraestructura, información y recursos tecnológicos.', bloque: '4',
      grupos: [{ id: 'ti', serie: '4100', nombre: 'Seguridad y Protección de la Información', descripcion: 'Políticas y reglas para proteger la información, los equipos y los datos.' }] }
  ]
};
