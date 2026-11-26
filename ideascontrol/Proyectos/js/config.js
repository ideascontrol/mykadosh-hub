/* =====================================================================
   APP-114 · Proyectos — configuración
   Proyectos de implementación de Ideas Control (manual 2600-MAN-OPE):
   T&A, TimeVision (reportes y análisis de T&A, no WFM), biometría, puertas, torniquetes, migración de plataformas
   y terminación de contratos T&A (offboarding de cliente, GNT-007).
   Datos en IC Apps (listas PRY_*). Clientes: MAE_Empresas / MAE_Contactos (Comercial).
   ===================================================================== */
window.CFG = {
  app: { id: 'APP-114', nombre: 'Proyectos', version: '0.2.0 · Etapa 3' },
  auth: {
    clientId: 'bfe1678b-5690-4aa5-8ce8-6c2522b2a7d0',
    tenantId: 'f947955a-8748-4cc4-a54b-61ad1d4b0ba7',
    // El inicio de sesión se hace en el Portal (dirección ya registrada en Entra ID) y vuelve aquí
    redirectPath: '/ideascontrol/Portal/',
    scopes: ['User.Read', 'Sites.ReadWrite.All']
  },
  sitio: { host: 'ideascontrolsas.sharepoint.com', ruta: '/sites/ICApps' },
  logo: '/ideascontrol/assets/ideascontrol.webp',
  // Carpeta de cada proyecto: sitio Ideas Control › 01_CLIENTES › [cliente] › 02_Proyectos › [PRY-0001 Nombre] (se crea sola al crear el proyecto)
  docs: { host: 'ideascontrolsas.sharepoint.com', ruta: '/sites/IdeasControl', biblioteca: '01_CLIENTES', subcarpeta: '02_Proyectos' },
  manual: '2600-MAN-OPE',
  urlDoc: '/ideascontrol/Documentacion/#/doc/',
  // Administración de la app (además de quien tenga rol ADMIN en SYS_Accesos para APP-114)
  admins: ['operaciones@ideascontrol.com'],
  // Aprobación de línea base, cambios, documentos y excepciones: basta UNO de ellos
  aprobadores: [
    { nombre: 'Martín Molina', cargo: 'Director de Operaciones', email: 'operaciones@ideascontrol.com' },
    { nombre: 'Patricia Ramírez', cargo: 'Gerente General', email: 'patricia@ideascontrol.com' }
  ],
  estadosProyecto: ['Planeación', 'En ejecución', 'En pausa', 'Cerrado', 'Cancelado'],
  estadosTarea: ['No iniciada', 'En curso', 'En revisión', 'Completada', 'No aplica', 'Cancelada'],
  salud: ['Normal', 'En riesgo', 'Bloqueada'],
  organizaciones: ['IC', 'Cliente', 'IC + Cliente', 'Fabricante', 'Tercero'],
  tipos: ['Fase', 'Tarea', 'Hito', 'Decisión'],
  // Escenarios del portafolio (hoja 02_Seleccion de la Biblioteca Maestra)
  escenarios: [
    { id: 'TA', nombre: 'T&A nuevo', plantillas: ['GNT-001'] },
    { id: 'TA_TV', nombre: 'T&A nuevo con TimeVision', plantillas: ['GNT-001', 'GNT-002'] },
    { id: 'TV', nombre: 'TimeVision sobre T&A existente', plantillas: ['GNT-002'] },
    { id: 'BIO', nombre: 'Instalación biométrica', plantillas: ['GNT-003'] },
    { id: 'PUE', nombre: 'Puerta / control de acceso', plantillas: ['GNT-004'] },
    { id: 'TOR', nombre: 'Torniquete', plantillas: ['GNT-005'] },
    { id: 'MIG', nombre: 'Migración de plataformas', plantillas: ['GNT-006'] },
    { id: 'TERM', nombre: 'Terminación de contrato T&A', plantillas: ['GNT-007'] },
    { id: 'COMB', nombre: 'Proyecto combinado', plantillas: [] }
  ],
  // Tareas comunes: al combinar plantillas se dejan una sola vez (la primera plantilla manda)
  comunes: [
    { clave: 'OS', nombre: 'Firma de la Orden de Servicio', re: /orden de servicio/i },
    { clave: 'KICKOFF', nombre: 'Kickoff / reunión de inicio', re: /kick ?off|reuni[oó]n de inicio/i },
    { clave: 'RESPONSABLES', nombre: 'Designación de responsables', re: /designaci[oó]n de responsables|matriz de (contactos?|responsab)/i },
    { clave: 'CRONOGRAMA', nombre: 'Aprobación del cronograma', re: /aprobaci[oó]n del cronograma|cronograma aprobado/i },
    { clave: 'ACTA_INICIO', nombre: 'Acta de inicio', re: /acta de inicio/i },
    { clave: 'CIERRE', nombre: 'Acta de cierre y entrega', re: /acta de cierre|cierre y entrega/i }
  ],
  // ---------- Seguimiento: reuniones, compromisos, riesgos y documentos ----------
  tiposReunion: ['Comité de seguimiento', 'Reunión de trabajo', 'Reunión técnica', 'Otra'],
  // Compromiso, decisión y visita técnica salen en «Decisiones y acuerdos» del 2610; riesgo y problema en «Riesgos y problemas»
  tiposPendiente: ['Compromiso', 'Decisión', 'Visita técnica', 'Riesgo', 'Problema'],
  estadosPendiente: ['Abierto', 'En seguimiento', 'Cerrado'],
  estadosDocumento: ['Borrador', 'Generado', 'Enviado al cliente', 'Aceptado'],
  // Formatos de la serie 2600 (2600-MAN-OPE)
  formatos: [['2601-FOR-OPE', 'Cronograma de implementación (Gantt)'], ['2602-FOR-OPE', 'Acta de inicio'], ['2603-FOR-OPE', 'Levantamiento de información'],
    ['2604-FOR-OPE', 'Documento de diseño de la solución'], ['2605-FOR-OPE', 'Carga masiva de empleados'], ['2606-FOR-OPE', 'Guion de pruebas y acta de UAT'],
    ['2607-FOR-OPE', 'Acta de salida en vivo'], ['2608-FOR-OPE', 'Ficha de traspaso a soporte'], ['2609-FOR-OPE', 'Acta de cierre y entrega'],
    ['2610-FOR-OPE', 'Acta de comité e informe de estado'], ['2611-FOR-OPE', 'Solicitud de control de cambios'], ['OTRO', 'Otro documento']],
  // 2609-FOR-OPE v1.0: filas fijas del formato
  cierre: {
    alcance: ['Empleados', 'Sedes', 'Equipos biométricos (modelo y cantidad)', 'Módulos de software', 'Integraciones o desarrollos', 'Capacitaciones (audiencias y sesiones)', 'Acompañamiento (hypercare)'],
    entregables: [['Acta de inicio (2602-FOR-OPE)', '2602-FOR-OPE'], ['Documento de diseño aprobado (2604-FOR-OPE)', '2604-FOR-OPE'], ['Acta de instalación de equipos', ''], ['Reporte de enrolados validado', ''],
      ['Evidencia de pruebas de integración', ''], ['Acta de UAT (2606-FOR-OPE)', '2606-FOR-OPE'], ['Listas de asistencia de capacitación', ''], ['Manuales y material entregados', ''],
      ['Acta de salida en vivo (2607-FOR-OPE)', '2607-FOR-OPE'], ['Informe del primer cierre de periodo', ''], ['Ficha de traspaso a soporte (2608-FOR-OPE)', '2608-FOR-OPE']],
    metas: { hitos: 85, desviacion: 5, csat: 90 },
    timevision: ['Indicadores y reportes contratados vs. entregados', 'Pruebas y conciliación aprobadas', 'Usuarios capacitados', 'Documentación y transferencia entregadas', 'Pendientes aceptados y responsables'],
    // Variante de terminación de contrato T&A: controles del «Checklist obligatorio de offboarding T&A» (Offboarding_Cliente_TA.xlsx)
    controlesTerminacion: [["Comercial y contractual", "Terminación formal registrada"], ["Comercial y contractual", "Contrato y preaviso revisados"], ["Comercial y contractual", "Fecha efectiva confirmada"], ["Comercial y contractual", "Obligaciones contractuales identificadas"], ["Comercial y contractual", "Renovaciones o compromisos futuros cancelados"], ["Operaciones", "Plan de salida aprobado"], ["Operaciones", "Cliente informado del cronograma"], ["Operaciones", "Tickets pendientes revisados"], ["Operaciones", "Proyectos pendientes revisados"], ["Operaciones", "Responsables asignados"], ["Información y datos", "Información del cliente identificada"], ["Información y datos", "Exportación o entrega acordada preparada"], ["Información y datos", "Formato de entrega validado"], ["Información y datos", "Entrega confirmada por el cliente"], ["Información y datos", "Tratamiento posterior de datos definido"], ["Información y datos", "Retención/eliminación documentada según corresponda"], ["Tecnología", "Usuarios y accesos identificados"], ["Tecnología", "Integraciones identificadas"], ["Tecnología", "Licencias identificadas"], ["Tecnología", "Servicios y ambientes identificados"], ["Tecnología", "Integraciones retiradas"], ["Tecnología", "Accesos desactivados"], ["Tecnología", "Plataforma o servicio desactivado"], ["Tecnología", "Evidencia de desactivación guardada"], ["Equipos", "Equipos propiedad de IC identificados"], ["Equipos", "Equipos propiedad del cliente identificados"], ["Equipos", "Equipos devueltos, cuando aplique"], ["Equipos", "Equipos revisados"], ["Equipos", "Acta de entrega/devolución firmada"], ["Finanzas", "Facturas pendientes identificadas"], ["Finanzas", "Cartera revisada"], ["Finanzas", "Facturación final gestionada"], ["Finanzas", "Servicios recurrentes cancelados"], ["Finanzas", "Estado financiero final documentado"], ["Cierre", "Obligaciones de IC cumplidas"], ["Cierre", "Acta de terminación elaborada"], ["Cierre", "Expediente completo"], ["Cierre", "Aprobación final de Operaciones/Gerencia"]]
  },
  // Filtros rápidos del cronograma (días calendario desde hoy)
  ventanas: [['vencidas', 'Vencidas'], ['hoy', 'Hoy'], ['3', 'Próx. 3 días'], ['7', 'Próx. 7'], ['15', 'Próx. 15'], ['30', 'Próx. 30']]
};
