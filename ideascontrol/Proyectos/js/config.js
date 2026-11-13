/* =====================================================================
   APP-114 · Proyectos — configuración
   Proyectos de implementación de Ideas Control (manual 2600-MAN-OPE):
   T&A, TimeVision (reportes y análisis de T&A, no WFM), biometría, puertas y torniquetes.
   Datos en IC Apps (listas PRY_*). Clientes: MAE_Empresas / MAE_Contactos (Comercial).
   ===================================================================== */
window.CFG = {
  app: { id: 'APP-114', nombre: 'Proyectos', version: '0.1.2 · Etapa 2' },
  auth: {
    clientId: 'bfe1678b-5690-4aa5-8ce8-6c2522b2a7d0',
    tenantId: 'f947955a-8748-4cc4-a54b-61ad1d4b0ba7',
    // El inicio de sesión se hace en el Portal (dirección ya registrada en Entra ID) y vuelve aquí
    redirectPath: '/ideascontrol/Portal/',
    scopes: ['User.Read', 'Sites.ReadWrite.All']
  },
  sitio: { host: 'ideascontrolsas.sharepoint.com', ruta: '/sites/ICApps' },
  logo: '/ideascontrol/assets/ideascontrol.webp',
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
  // Filtros rápidos del cronograma (días calendario desde hoy)
  ventanas: [['vencidas', 'Vencidas'], ['hoy', 'Hoy'], ['3', 'Próx. 3 días'], ['7', 'Próx. 7'], ['15', 'Próx. 15'], ['30', 'Próx. 30']]
};
