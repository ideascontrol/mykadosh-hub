/* =====================================================================
   APP-113 · Checklist de Operaciones — configuración
   Reemplaza el Excel «Checklist_Operaciones_IC.xlsx» (hojas Checklist,
   Resumen y Tipos y Areas). Datos en IC Apps: CHK_Items y CHK_Catalogo.
   ===================================================================== */
window.CFG = {
  app: { id: 'APP-113', nombre: 'Checklist de Operaciones', version: '0.1.0' },
  auth: {
    clientId: 'bfe1678b-5690-4aa5-8ce8-6c2522b2a7d0',
    tenantId: 'f947955a-8748-4cc4-a54b-61ad1d4b0ba7',
    // El inicio de sesión se hace en el Portal (dirección ya registrada en Entra ID) y vuelve aquí
    redirectPath: '/ideascontrol/Portal/',
    scopes: ['User.Read', 'Sites.ReadWrite.All']
  },
  sitio: { host: 'ideascontrolsas.sharepoint.com', ruta: '/sites/ICApps' },
  // Biblioteca de Gestión documental: para saber qué códigos ya están publicados y abrirlos
  docs: { host: 'ideascontrolsas.sharepoint.com', ruta: '/sites/IdeasControl', biblioteca: '00_Documentacion_Maestra' },
  urlDoc: '/ideascontrol/Documentacion/#/doc/',
  logo: '/ideascontrol/assets/ideascontrol.webp',
  // Solo la Dirección de Operaciones usa esta app
  usuarios: ['operaciones@ideascontrol.com'],
  estados: ['Pendiente', 'En curso', 'Completado', 'No aplica'],
  prioridades: ['Alta', 'Media', 'Baja'],
  // Código de documento IC: 4 dígitos - tipo - área (p. ej. 2506-MAN-OPE)
  patronCodigo: /\b\d{4}-[A-Z]{3}-[A-Z]{2,3}\b/g,
  // Catálogo inicial (hojas Resumen y Tipos y Areas del Excel). Se guarda en CHK_Catalogo la primera vez y desde ahí se edita en la app.
  catalogo: {
    CATEGORIA: [['1. Estructura del área'], ['2. Políticas'], ['3. Procesos'], ['4. Instructivos y formatos'], ['5. Indicadores'], ['6. Gobierno y herramientas']],
    TIPO: [['Estructura'], ['Política'], ['Proceso'], ['Instructivo'], ['Formato'], ['Registro'], ['KPI'], ['Herramienta'], ['Gobierno'],
      ['Proceso Ger'], ['Proceso Ope'], ['Proceso Com'], ['Proceso Tec'], ['Proceso Inv'], ['Proceso Thu'], ['Proceso Fin']],
    TIPODOC: [['MAN', 'Manual', 'Documento marco, varios capítulos'], ['PRO', 'Procedimiento', 'Un proceso específico, más corto que un manual'],
      ['INS', 'Instructivo', 'Paso a paso operativo muy puntual'], ['FOR', 'Formato / Checklist', 'Plantilla en blanco, diligenciable'],
      ['GUI', 'Guía rápida', 'Para usuario final, una página'], ['POL', 'Política', 'Lineamiento (seguridad, datos biométricos, etc.)'],
      ['ACU', 'Acuerdo', 'NDA, tratamiento de datos, SLA con cliente/aliado'], ['MAT', 'Matriz', 'Matriz de riesgos, de compatibilidad, etc.'],
      ['REG', 'Registro', 'Formato ya diligenciado (evidencia real, no plantilla)'], ['FIC', 'Ficha', 'Ficha técnica del equipo'], ['CAT', 'Catálogo', ''], ['VID', 'Video', 'Video']],
    AREA: [['GER', 'Gerencia General / Dirección Estratégica'], ['COM', 'Comercial y Experiencia del Cliente'], ['OPE', 'Operaciones (Soporte e Implementación)'],
      ['TEC', 'Información y Tecnología'], ['INV', 'Gestión de Inventario y Activos'], ['THU', 'Talento Humano'], ['FIN', 'Administración y Finanzas']],
    SERIE: [['1100', 'Gerencia'], ['2100', 'Biométrico'], ['2200', 'WFM'], ['2300', 'Soporte'], ['2400', 'Mantenimiento'], ['2500', 'Operaciones'], ['2600', 'Proyectos / Implementaciones'],
      ['3100', 'Comercial'], ['3300', 'Marketing'], ['3500', 'Contratos'], ['4100', 'Tecnología'], ['5100', 'Inventario'], ['6100', 'Talento Humano'], ['7100', 'Finanzas']]
  },
  grupos: {
    CATEGORIA: { nombre: 'Categorías', campo: 'categoria', ayuda: 'Agrupan los elementos del checklist (columna Categoría). El número inicial define el orden.' },
    TIPO: { nombre: 'Tipos de elemento', campo: 'tipo', ayuda: 'Clasificación de cada elemento (columna Tipo).' },
    TIPODOC: { nombre: 'Tipos de documento', ayuda: 'Segunda parte del código (MAN, PRO, INS…).', conCodigo: true },
    AREA: { nombre: 'Áreas', ayuda: 'Tercera parte del código (GER, OPE, FIN…).', conCodigo: true },
    SERIE: { nombre: 'Series', ayuda: 'Primera parte del código: bloque de numeración del proceso.', conCodigo: true }
  }
};
