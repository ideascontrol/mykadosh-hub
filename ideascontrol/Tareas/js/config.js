/* =====================================================================
   APP-109 · Seguimiento por cliente — configuración
   Tareas, pendientes y planes de trabajo de cada cliente (antes, un Excel
   por cliente como «Plan de Trabajo - Papeles Nacionales»).
   ===================================================================== */
window.CFG = {
  app: { id: 'APP-109', nombre: 'Seguimiento por cliente', version: '0.1.3' },
  auth: {
    clientId: 'bfe1678b-5690-4aa5-8ce8-6c2522b2a7d0',
    tenantId: 'f947955a-8748-4cc4-a54b-61ad1d4b0ba7',
    // El inicio de sesión se hace en el Portal (dirección ya registrada en Entra ID) y vuelve aquí
    redirectPath: '/ideascontrol/Portal/',
    scopes: ['User.Read', 'Sites.ReadWrite.All']
  },
  sitio: { host: 'ideascontrolsas.sharepoint.com', ruta: '/sites/ICApps' },
  logo: '/ideascontrol/assets/ideascontrol.webp',
  // Por ahora solo la Dirección de Operaciones usa esta app
  usuarios: ['operaciones@ideascontrol.com'],
  // Estados: los cerrados no cuentan como pendientes ni generan alarma
  estados: ['Abierta', 'En proceso', 'En espera del cliente', 'En espera de tercero', 'En espera interna', 'Programada', 'En revisión', 'Finalizada', 'Cancelada'],
  ayudaEstados: {
    'Abierta': 'Tarea creada, pendiente de iniciar.',
    'En proceso': 'Ya se está trabajando en ella.',
    'En espera del cliente': 'Depende de una respuesta o acción del cliente.',
    'En espera de tercero': 'Depende de un proveedor u otra entidad.',
    'En espera interna': 'Depende de otra persona o área de Ideas Control.',
    'Programada': 'Tiene una fecha definida para su ejecución.',
    'En revisión': 'Se realizó el trabajo y está pendiente de validación.',
    'Finalizada': 'Actividad completada y compromiso cumplido.',
    'Cancelada': 'Actividad que ya no requiere ejecución.'
  },
  cerrados: ['Finalizada', 'Cancelada'],
  // Estados anteriores (Excel del plan de trabajo) → estado nuevo. Se convierten solos al abrir la app y al importar.
  equivEstados: { 'Pendiente OC': 'En espera del cliente', 'Abierto': 'Abierta', 'En Progreso': 'En proceso', 'Esperando Cliente': 'En espera del cliente',
    'Esperando Proveedor': 'En espera de tercero', 'Resuelto': 'Finalizada', 'Cerrado': 'Finalizada' },
  prioridades: ['Alta', 'Media', 'Baja'],
  // Categorías con su definición (se muestra como ayuda al crear o editar una tarea)
  categorias: [
    ['Comercial', 'Oportunidades, propuestas, cotizaciones y nuevos negocios.'],
    ['Seguimiento al cliente', 'Llamadas, correos, compromisos y pendientes con clientes.'],
    ['Atención al cliente', 'Solicitudes, consultas, requerimientos y acompañamiento.'],
    ['Soporte técnico', 'Problemas técnicos que requieren diagnóstico o solución.'],
    ['Incidente', 'Fallas, interrupciones o situaciones que afectan el servicio.'],
    ['Instalación', 'Instalación de dispositivos biométricos o infraestructura.'],
    ['Implementación', 'Puesta en marcha de soluciones de software o hardware.'],
    ['Mantenimiento', 'Mantenimientos preventivos y correctivos.'],
    ['Inspección / Visita técnica', 'Revisiones presenciales, verificaciones y diagnósticos.'],
    ['Software / Configuración', 'Parámetros, ajustes, usuarios, permisos y configuraciones.'],
    ['Desarrollo / Mejoras', 'Nuevas funcionalidades, ajustes de aplicaciones y personalizaciones.'],
    ['Capacitación', 'Formación a clientes, usuarios y administradores.'],
    ['Integración', 'Conexiones con otros sistemas, plataformas o aplicaciones.'],
    ['Calidad / Servicio', 'Evaluaciones, satisfacción, inconformidades y compromisos de mejora.'],
    ['Facturación / Cartera', 'Facturas, pagos, saldos y asuntos administrativos comerciales.'],
    ['Renovación / Contrato', 'Renovaciones, vencimientos, condiciones y acuerdos contractuales.'],
    ['Documentación', 'Manuales, actas, informes, procedimientos y entregables.'],
    ['Gestión interna', 'Actividades administrativas o coordinaciones internas relacionadas con el cliente.']
  ],
  // Categorías anteriores (Excel del plan de trabajo) → categoría nueva más cercana. Se convierten solas al abrir la app y al importar.
  equivalencias: { 'Instalación': 'Instalación', 'Inspección': 'Inspección / Visita técnica', 'Incidente': 'Incidente', 'Software': 'Software / Configuración',
    'Mejora': 'Desarrollo / Mejoras', 'Desarrollo': 'Desarrollo / Mejoras', 'Facturación': 'Facturación / Cartera', 'Cotización': 'Comercial',
    'Aprobación': 'Seguimiento al cliente', 'Informe': 'Documentación' },
  diasAviso: 3          // «Próxima a vencer» = vence en 3 días o menos
};
