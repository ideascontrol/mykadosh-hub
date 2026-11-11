/* =====================================================================
   APP-107 · Novedades del personal — configuración
   Permisos, vacaciones, licencias, incapacidades, cambios de horario y faltas
   del personal de Operaciones. Se tramitan solo con la Dirección de Operaciones.
   ===================================================================== */
window.CFG = {
  app: { id: 'APP-107', nombre: 'Novedades del personal', version: '0.1.5 · Etapa 1' },
  auth: {
    clientId: 'bfe1678b-5690-4aa5-8ce8-6c2522b2a7d0',
    tenantId: 'f947955a-8748-4cc4-a54b-61ad1d4b0ba7',
    redirectPath: '/ideascontrol/Novedades/',           // debe estar registrada en Entra ID (con y sin www)
    scopes: ['User.Read', 'Sites.ReadWrite.All']
  },
  sitio: { host: 'ideascontrolsas.sharepoint.com', ruta: '/sites/ICApps' },
  logo: '/ideascontrol/assets/ideascontrol.webp',
  manual: '1103-MAN-GER',
  politica: 'Las solicitudes de permisos, vacaciones, licencias, cambios de horario y demás novedades del personal se tramitan y agendan exclusivamente a través de la Dirección de Operaciones. La Dirección validará su impacto en la programación de servicios y proyectos antes de su aprobación; ninguna ausencia se entenderá autorizada sin este trámite previo.'
};

// Tipos de solicitud. ausencia: al aprobar, si es técnico queda en Ausencia en la Programación (días hábiles). El personal administrativo no se programa.
window.TIPOS_NOV = [
  { id: 'PERMISO', nombre: 'Permiso', ausencia: true, horas: true, subtipos: ['Personal', 'Cita médica', 'Estudio', 'Trámite', 'Otro'] },
  { id: 'VACACIONES', nombre: 'Vacaciones', ausencia: true, subtipos: [] },
  { id: 'LICENCIA', nombre: 'Licencia', ausencia: true, subtipos: ['Luto', 'Calamidad doméstica', 'Maternidad', 'Paternidad', 'Matrimonio', 'No remunerada', 'Otra'] },
  { id: 'INCAPACIDAD', nombre: 'Incapacidad', ausencia: true, subtipos: ['Enfermedad general', 'Accidente de trabajo', 'Otra'], nota: 'Entregue el soporte de la incapacidad a la Dirección de Operaciones (por correo o en físico).' },
  { id: 'CAMBIO_HORARIO', nombre: 'Cambio de horario', ausencia: false, horas: true, subtipos: ['Un día', 'Temporal', 'Permanente'], nota: 'Indique el horario que solicita (entrada y salida). No bloquea la programación: la Dirección la ajusta si hace falta.' }
];
window.ESTADOS_NOV = [['SOLICITADA', 'Solicitada'], ['APROBADA', 'Aprobada'], ['RECHAZADA', 'Rechazada'], ['ANULADA', 'Anulada']];

// Faltas (solo Dirección). Referencia: Reglamento Interno de Trabajo 1103-MAN-GER.
window.FALTAS = {
  tipos: [['RETARDO', 'Retardo'], ['INASISTENCIA', 'Inasistencia injustificada'], ['AUSENCIA_SIN_TRAMITE', 'Ausencia sin trámite con la Dirección'],
    ['PROCEDIMIENTO', 'Incumplimiento de procedimiento o documentación (tickets, actas, formatos)'], ['PROGRAMACION', 'Incumplimiento de la programación'],
    ['RECURSOS', 'Uso indebido de recursos o herramientas'], ['TRATO', 'Trato inadecuado a clientes o compañeros'], ['OTRA', 'Otra']],
  gravedad: [['LEVE', 'Leve'], ['GRAVE', 'Grave'], ['GRAVISIMA', 'Gravísima']],
  acciones: [['REGISTRO', 'Solo registro'], ['LLAMADO_VERBAL', 'Llamado de atención verbal'], ['LLAMADO_ESCRITO', 'Llamado de atención escrito'], ['DESCARGOS', 'Citación a descargos'], ['SANCION', 'Sanción']],
  estados: [['ABIERTA', 'Abierta'], ['CERRADA', 'Cerrada']]
};
