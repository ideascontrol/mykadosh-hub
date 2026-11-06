/* =====================================================================
   APP-110 · Calculadora de costos y precios — configuración
   Versión web de «IC_Calculadora_Costos_Precios_simple.xlsx».
   Cada cálculo se usa una vez y se guarda como registro histórico (CAL_Costeos).
   ===================================================================== */
window.CFG = {
  app: { id: 'APP-110', nombre: 'Calculadora de costos y precios', version: '0.1.1' },
  auth: {
    clientId: 'bfe1678b-5690-4aa5-8ce8-6c2522b2a7d0',
    tenantId: 'f947955a-8748-4cc4-a54b-61ad1d4b0ba7',
    // El inicio de sesión se hace en el Portal (dirección ya registrada en Entra ID) y vuelve aquí
    redirectPath: '/ideascontrol/Portal/',
    scopes: ['User.Read', 'Sites.ReadWrite.All']
  },
  sitio: { host: 'ideascontrolsas.sharepoint.com', ruta: '/sites/ICApps' },
  logo: '/ideascontrol/assets/ideascontrol.webp',
  lista: 'CAL_Costeos',
  // Quién puede usar la app (Gerencia General, Dirección Comercial y Dirección de Operaciones)
  usuarios: ['operaciones@ideascontrol.com', 'patricia@ideascontrol.com', 'margarita@ideascontrol.com'],
  // Quién puede borrar un registro del historial (solo para corregir errores)
  puedenBorrar: ['operaciones@ideascontrol.com'],

  // Valores por defecto (los mismos del Excel). Prestaciones y margen mínimo: confirmar con contabilidad.
  prestaciones: 0.44,     // sobre las líneas de familia «Personal» (nómina). Contratistas y terceros van en otra familia.
  margenMinimo: 0.25,     // debajo de este margen el resultado sale en rojo
  margenDefecto: 0.35,
  iva: 0.19,

  categorias: ['Hardware', 'Consumibles', 'Logística', 'Personal', 'Formación', 'Software', 'Desarrollo', 'Soporte', 'Servicios técnicos', 'Proyectos', 'Otros'],
  unidades: ['Unidad', 'Lote', 'Envío', 'Hora', 'Día', 'Jornada', 'Usuario / mes', 'Usuario / año', 'Mes', 'Año', 'Proyecto', 'Servicio', 'Kilómetro', 'Kilogramo', 'Metro'],
  familias: ['Adquisición', 'Logística', 'Importación', 'Materiales', 'Personal', 'Contratistas / terceros', 'Viáticos', 'Operación', 'Garantía', 'Software',
    'Tecnología', 'Soporte', 'Financiero', 'Administración', 'Otros'],
  familiaPersonal: 'Personal'
};
