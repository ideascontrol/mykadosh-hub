/* =====================================================================
   IDEAS CONTROL · Matriz de permisos y accesos (catálogo y lectura)
   shared/js/permisos.js — requiere graph.js.
   - OPCIONES: cada opción del portal que se puede dar o quitar (id = CÓDIGO.clave).
   - Lista SharePoint SYS_Permisos: una fila por persona (Title = correo,
     permisos = ids separados por coma) y una fila «__CONFIG__» (permisos = ACTIVA).
   - Mientras la matriz NO esté activa, cada app sigue con sus reglas anteriores.
   - La Dirección de Operaciones (SIEMPRE) tiene todo, siempre.
   Inventario: Matriz_Permisos_Accesos_Portal_IC (28 nov 2026).
   ===================================================================== */
window.IC = window.IC || {};
IC.permisos = (function () {
  'use strict';
  const SIEMPRE = 'operaciones@ideascontrol.com';
  const LISTA = 'SYS_Permisos', CONFIG = '__CONFIG__';
  const OPCIONES = [{"id": "APP-106.abrir","area": "Gestión Operativa","app": "Programación de Operaciones","cod": "APP-106","op": "Abrir la app","tipo": "Entrar","desc": "Ver la tarjeta en el portal y entrar."},
    {"id": "APP-106.mia","area": "Gestión Operativa","app": "Programación de Operaciones","cod": "APP-106","op": "Mi agenda","tipo": "Ver","desc": "Actividades propias de los próximos días y registro de lo ejecutado."},
    {"id": "APP-106.agenda","area": "Gestión Operativa","app": "Programación de Operaciones","cod": "APP-106","op": "Agenda","tipo": "Ver","desc": "Sábana-calendario del mes por técnico y tipo."},
    {"id": "APP-106.actividades","area": "Gestión Operativa","app": "Programación de Operaciones","cod": "APP-106","op": "Actividades · consultar","tipo": "Ver","desc": "Lista de instalaciones, mantenimientos, soporte y turnos."},
    {"id": "APP-106.programar","area": "Gestión Operativa","app": "Programación de Operaciones","cod": "APP-106","op": "Actividades · programar","tipo": "Crear / editar","desc": "Registrar, reprogramar o cancelar actividades."},
    {"id": "APP-106.semana","area": "Gestión Operativa","app": "Programación de Operaciones","cod": "APP-106","op": "Programación semanal","tipo": "Ver","desc": "Semana lista para publicar: imprimir o copiar."},
    {"id": "APP-106.resumen","area": "Gestión Operativa","app": "Programación de Operaciones","cod": "APP-106","op": "Resumen ejecutivo","tipo": "Ver","desc": "Cumplimiento, equipos, clientes, técnicos y análisis con Claude."},
    {"id": "APP-106.rotacion","area": "Gestión Operativa","app": "Programación de Operaciones","cod": "APP-106","op": "Rotación de oficina","tipo": "Ver","desc": "Quién cubre la oficina cada día y quién está sin asignar."},
    {"id": "APP-106.carga","area": "Gestión Operativa","app": "Programación de Operaciones","cod": "APP-106","op": "Carga por técnico","tipo": "Ver","desc": "Actividades de cada técnico en el mes, por tipo."},
    {"id": "APP-106.sitios","area": "Gestión Operativa","app": "Programación de Operaciones","cod": "APP-106","op": "Clientes y sitios","tipo": "Ver","desc": "Sitios de cada cliente principal con su estado."},
    {"id": "APP-106.acta","area": "Gestión Operativa","app": "Programación de Operaciones","cod": "APP-106","op": "Acta de equipos instalados","tipo": "Ver / imprimir","desc": "Listado tipo acta de las instalaciones de un periodo y cliente."},
    {"id": "APP-106.conflictos","area": "Gestión Operativa","app": "Programación de Operaciones","cod": "APP-106","op": "Conflictos","tipo": "Ver","desc": "Actividades con alertas que deben corregirse antes de publicar."},
    {"id": "APP-106.vendors","area": "Gestión Operativa","app": "Programación de Operaciones","cod": "APP-106","op": "Proveedores (Vendors)","tipo": "Crear / editar","desc": "Instaladores y aliados fuera de Bogotá: datos, servicios, cobertura y contactos."},
    {"id": "APP-106.politicas","area": "Gestión Operativa","app": "Programación de Operaciones","cod": "APP-106","op": "Políticas y ayuda","tipo": "Ver","desc": "Políticas del manual de programación y uso de la app."},
    {"id": "APP-106.admin","area": "Gestión Operativa","app": "Programación de Operaciones","cod": "APP-106","op": "Administración","tipo": "Administrar","desc": "Técnicos y habilidades, tipos de actividad, accesos y festivos."},
    {"id": "APP-114.abrir","area": "Gestión Operativa","app": "Proyectos","cod": "APP-114","op": "Abrir la app","tipo": "Entrar","desc": "Ver la tarjeta en el portal y entrar."},
    {"id": "APP-114.todos","area": "Gestión Operativa","app": "Proyectos","cod": "APP-114","op": "Portafolio · todos los proyectos","tipo": "Ver","desc": "Lista de todos los proyectos con avance y semáforo."},
    {"id": "APP-114.mios","area": "Gestión Operativa","app": "Proyectos","cod": "APP-114","op": "Portafolio · solo mis proyectos","tipo": "Ver","desc": "Solo los proyectos donde la persona tiene tareas."},
    {"id": "APP-114.nuevo","area": "Gestión Operativa","app": "Proyectos","cod": "APP-114","op": "Nuevo proyecto","tipo": "Crear","desc": "Crear un proyecto de implementación y su carpeta en SharePoint."},
    {"id": "APP-114.resumen","area": "Gestión Operativa","app": "Proyectos","cod": "APP-114","op": "Resumen del proyecto","tipo": "Ver","desc": "Estado general, avance y atraso."},
    {"id": "APP-114.cronograma","area": "Gestión Operativa","app": "Proyectos","cod": "APP-114","op": "Cronograma y tareas","tipo": "Crear / editar","desc": "Fases, tareas, responsables y fechas."},
    {"id": "APP-114.linea","area": "Gestión Operativa","app": "Proyectos","cod": "APP-114","op": "Línea base y versiones","tipo": "Crear / editar","desc": "Guardar y comparar líneas base."},
    {"id": "APP-114.bitacora","area": "Gestión Operativa","app": "Proyectos","cod": "APP-114","op": "Bitácora","tipo": "Crear / editar","desc": "Registro de lo que pasa en el proyecto."},
    {"id": "APP-114.reuniones","area": "Gestión Operativa","app": "Proyectos","cod": "APP-114","op": "Reuniones y compromisos","tipo": "Crear / editar","desc": "Actas de reunión (2610/2609) y compromisos."},
    {"id": "APP-114.riesgos","area": "Gestión Operativa","app": "Proyectos","cod": "APP-114","op": "Riesgos y problemas","tipo": "Crear / editar","desc": "Riesgos, problemas y acciones."},
    {"id": "APP-114.documentos","area": "Gestión Operativa","app": "Proyectos","cod": "APP-114","op": "Documentos","tipo": "Ver / subir","desc": "Carpeta del proyecto en SharePoint (01_CLIENTES)."},
    {"id": "APP-114.cierre","area": "Gestión Operativa","app": "Proyectos","cod": "APP-114","op": "Cierre","tipo": "Crear / editar","desc": "Controles de terminación y acta de cierre."},
    {"id": "APP-114.admin","area": "Gestión Operativa","app": "Proyectos","cod": "APP-114","op": "Administración","tipo": "Administrar","desc": "Biblioteca maestra y parámetros."},
    {"id": "APP-114.ayuda","area": "Gestión Operativa","app": "Proyectos","cod": "APP-114","op": "Ayuda","tipo": "Ver","desc": "Guía de uso."},
    {"id": "APP-109.abrir","area": "Gestión Operativa","app": "Gestión de Clientes (tareas por cliente)","cod": "APP-109","op": "Abrir la app","tipo": "Entrar","desc": "Ver la tarjeta en el portal y entrar."},
    {"id": "APP-109.resumen","area": "Gestión Operativa","app": "Gestión de Clientes (tareas por cliente)","cod": "APP-109","op": "Resumen","tipo": "Ver","desc": "Semáforo de vencimientos y estados por cliente."},
    {"id": "APP-109.tareas","area": "Gestión Operativa","app": "Gestión de Clientes (tareas por cliente)","cod": "APP-109","op": "Tareas","tipo": "Crear / editar","desc": "Plan de trabajo y tareas de cada cliente."},
    {"id": "APP-109.pendientes","area": "Gestión Operativa","app": "Gestión de Clientes (tareas por cliente)","cod": "APP-109","op": "Pendientes","tipo": "Ver","desc": "Vencidas, hoy y próximos días."},
    {"id": "APP-109.reportes","area": "Gestión Operativa","app": "Gestión de Clientes (tareas por cliente)","cod": "APP-109","op": "Reportes detallados","tipo": "Ver / descargar","desc": "Reportes por cliente, persona y estado."},
    {"id": "APP-109.importar","area": "Gestión Operativa","app": "Gestión de Clientes (tareas por cliente)","cod": "APP-109","op": "Importar","tipo": "Crear","desc": "Carga de tareas desde Excel."},
    {"id": "APP-109.categorias","area": "Gestión Operativa","app": "Gestión de Clientes (tareas por cliente)","cod": "APP-109","op": "Categorías","tipo": "Administrar","desc": "Crear, editar, ordenar y desactivar categorías de tareas."},
    {"id": "APP-102.abrir","area": "Gestión Operativa","app": "Soporte técnico (tickets)","cod": "APP-102","op": "Abrir Mesa de Ayuda","tipo": "Entrar","desc": "Enlace a mesadeayuda.timevisionbi.com (usuarios propios de esa plataforma)."},
    {"id": "APP-111.abrir","area": "Gestión Operativa","app": "TimeVision BI","cod": "APP-111","op": "Abrir TimeVision BI","tipo": "Entrar","desc": "Enlace a timevisionbi.com (usuarios propios de esa plataforma)."},
    {"id": "APP-101.abrir","area": "Gestión Comercial","app": "Cotizaciones","cod": "APP-101","op": "Abrir la app","tipo": "Entrar","desc": "Ver la tarjeta en el portal y entrar."},
    {"id": "APP-101.cotizar","area": "Gestión Comercial","app": "Cotizaciones","cod": "APP-101","op": "Nueva cotización","tipo": "Crear","desc": "Armar una propuesta con productos, descuentos, condiciones y PDF."},
    {"id": "APP-101.cotizaciones","area": "Gestión Comercial","app": "Cotizaciones","cod": "APP-101","op": "Cotizaciones","tipo": "Ver / editar","desc": "Consultar, editar, revisar y cambiar el estado."},
    {"id": "APP-101.precio_manual","area": "Gestión Comercial","app": "Cotizaciones","cod": "APP-101","op": "Cambiar precio solo en la cotización","tipo": "Editar","desc": "Precio manual en esa cotización sin tocar el precio de lista."},
    {"id": "APP-101.agenda","area": "Gestión Comercial","app": "Cotizaciones","cod": "APP-101","op": "Mis pendientes","tipo": "Ver","desc": "Llamadas, correos y visitas agendadas."},
    {"id": "APP-101.contenido","area": "Gestión Comercial","app": "Cotizaciones","cod": "APP-101","op": "Contenido para compartir","tipo": "Ver","desc": "Artículos del Centro de conocimiento con mensaje para WhatsApp o correo."},
    {"id": "APP-101.tablero","area": "Gestión Comercial","app": "Cotizaciones","cod": "APP-101","op": "Tablero comercial","tipo": "Ver","desc": "Cotizado, ganado, embudo y motivos de pérdida."},
    {"id": "APP-101.actividad","area": "Gestión Comercial","app": "Cotizaciones","cod": "APP-101","op": "Actividad reciente","tipo": "Ver","desc": "Quién creó o modificó información y cuándo."},
    {"id": "APP-101.ayuda","area": "Gestión Comercial","app": "Cotizaciones","cod": "APP-101","op": "Ayuda","tipo": "Ver","desc": "Guías paso a paso y preguntas frecuentes."},
    {"id": "APP-101.carga","area": "Gestión Comercial","app": "Cotizaciones","cod": "APP-101","op": "Carga masiva","tipo": "Crear","desc": "Plantillas de Excel para cargar empresas y productos."},
    {"id": "APP-101.admin","area": "Gestión Comercial","app": "Cotizaciones","cod": "APP-101","op": "Administración","tipo": "Administrar","desc": "Usuarios, condiciones comerciales y parámetros de la cotización."},
    {"id": "APP-115.abrir","area": "Gestión Comercial","app": "Clientes","cod": "APP-115","op": "Abrir la app","tipo": "Entrar","desc": "Ver la tarjeta en el portal y entrar."},
    {"id": "APP-115.empresas","area": "Gestión Comercial","app": "Clientes","cod": "APP-115","op": "Empresas y contactos","tipo": "Crear / editar","desc": "Prospectos y clientes, sedes y personas de contacto."},
    {"id": "APP-101-PRD.abrir","area": "Gestión Comercial","app": "Productos","cod": "APP-101-PRD","op": "Ver catálogo","tipo": "Ver","desc": "Productos con foto, ficha técnica, precios e inventario."},
    {"id": "APP-101-PRD.editar","area": "Gestión Comercial","app": "Productos","cod": "APP-101-PRD","op": "Crear y editar productos y precios","tipo": "Crear / editar","desc": "Productos, categorías, precios de lista e inventario."},
    {"id": "APP-110.abrir","area": "Gestión Comercial","app": "Calculadora de costos y precios","cod": "APP-110","op": "Abrir la app","tipo": "Entrar","desc": "Ver la tarjeta en el portal y entrar."},
    {"id": "APP-110.nuevo","area": "Gestión Comercial","app": "Calculadora de costos y precios","cod": "APP-110","op": "Nuevo cálculo","tipo": "Crear","desc": "Precio de venta desde costos directos (redondeo a $1.000)."},
    {"id": "APP-110.historial","area": "Gestión Comercial","app": "Calculadora de costos y precios","cod": "APP-110","op": "Historial","tipo": "Ver","desc": "Cálculos guardados como registro histórico."},
    {"id": "APP-110.eliminar","area": "Gestión Comercial","app": "Calculadora de costos y precios","cod": "APP-110","op": "Eliminar del historial","tipo": "Eliminar","desc": "Borrar un cálculo del historial."},
    {"id": "APP-112.abrir","area": "Gestión Comercial","app": "Marketing","cod": "APP-112","op": "Abrir la app","tipo": "Entrar","desc": "Ver la tarjeta en el portal y entrar."},
    {"id": "APP-112.calendario","area": "Gestión Comercial","app": "Marketing","cod": "APP-112","op": "Calendario","tipo": "Ver","desc": "Calendario semanal de publicaciones."},
    {"id": "APP-112.lista","area": "Gestión Comercial","app": "Marketing","cod": "APP-112","op": "Publicaciones","tipo": "Crear / editar","desc": "Piezas por red, fecha y estado."},
    {"id": "APP-112.temas","area": "Gestión Comercial","app": "Marketing","cod": "APP-112","op": "Banco de temas","tipo": "Crear / editar","desc": "Temas que alimentan las publicaciones."},
    {"id": "APP-112.plan","area": "Gestión Comercial","app": "Marketing","cod": "APP-112","op": "Reemplazar plan desde Excel","tipo": "Administrar","desc": "Borrar el plan desde una semana y cargar uno nuevo."},
    {"id": "APP-112.generar","area": "Gestión Comercial","app": "Marketing","cod": "APP-112","op": "Generar","tipo": "Crear","desc": "Generar piezas y textos de la semana."},
    {"id": "APP-112.revision","area": "Gestión Comercial","app": "Marketing","cod": "APP-112","op": "Revisión","tipo": "Editar","desc": "Revisar piezas antes de aprobar."},
    {"id": "APP-112.aprobar","area": "Gestión Comercial","app": "Marketing","cod": "APP-112","op": "Por aprobar","tipo": "Aprobar","desc": "Aprobar publicaciones (mínimo 2 aprobaciones)."},
    {"id": "APP-112.metricas","area": "Gestión Comercial","app": "Marketing","cod": "APP-112","op": "Métricas","tipo": "Ver / importar","desc": "Estadísticas por publicación e importación desde Excel."},
    {"id": "APP-112.resumen","area": "Gestión Comercial","app": "Marketing","cod": "APP-112","op": "Resumen","tipo": "Ver","desc": "Resumen del periodo."},
    {"id": "APP-108.abrir","area": "Gestión Humana y Administrativa","app": "Desarrollo de Talento","cod": "APP-108","op": "Abrir la app","tipo": "Entrar","desc": "Ver la tarjeta en el portal y entrar."},
    {"id": "APP-108.muro","area": "Gestión Humana y Administrativa","app": "Desarrollo de Talento","cod": "APP-108","op": "Muro","tipo": "Ver","desc": "Leer, marcar «Entendido» y descargar piezas."},
    {"id": "APP-108.piezas","area": "Gestión Humana y Administrativa","app": "Desarrollo de Talento","cod": "APP-108","op": "Piezas","tipo": "Crear / editar","desc": "Crear, editar y programar piezas."},
    {"id": "APP-108.lecturas","area": "Gestión Humana y Administrativa","app": "Desarrollo de Talento","cod": "APP-108","op": "Lecturas","tipo": "Ver","desc": "Quién leyó cada pieza."},
    {"id": "APP-108.programas","area": "Gestión Humana y Administrativa","app": "Desarrollo de Talento","cod": "APP-108","op": "Programas","tipo": "Crear / editar","desc": "Programas y campañas de formación."},
    {"id": "APP-116.abrir","area": "Gestión Humana y Administrativa","app": "Colecciones de lectura","cod": "APP-116","op": "Leer colecciones","tipo": "Ver","desc": "Colecciones publicadas (p. ej. Reflexiones Estratégicas)."},
    {"id": "APP-107.abrir","area": "Gestión Humana y Administrativa","app": "Novedades del personal","cod": "APP-107","op": "Abrir la app","tipo": "Entrar","desc": "Ver la tarjeta en el portal y entrar."},
    {"id": "APP-107.nueva","area": "Gestión Humana y Administrativa","app": "Novedades del personal","cod": "APP-107","op": "Nueva solicitud","tipo": "Crear","desc": "Permisos, vacaciones, licencias, incapacidades y cambios de horario."},
    {"id": "APP-107.mias","area": "Gestión Humana y Administrativa","app": "Novedades del personal","cod": "APP-107","op": "Mis solicitudes","tipo": "Ver / editar","desc": "Las propias; se pueden modificar hasta 3 días antes del inicio."},
    {"id": "APP-107.mireporte","area": "Gestión Humana y Administrativa","app": "Novedades del personal","cod": "APP-107","op": "Mi reporte de novedades","tipo": "Ver / PDF","desc": "Reporte de las propias novedades."},
    {"id": "APP-107.bandeja","area": "Gestión Humana y Administrativa","app": "Novedades del personal","cod": "APP-107","op": "Bandeja de aprobación","tipo": "Aprobar","desc": "Aprobar o rechazar solicitudes."},
    {"id": "APP-107.todas","area": "Gestión Humana y Administrativa","app": "Novedades del personal","cod": "APP-107","op": "Solicitudes (todas)","tipo": "Ver","desc": "Todas las solicitudes con filtros."},
    {"id": "APP-107.reporte","area": "Gestión Humana y Administrativa","app": "Novedades del personal","cod": "APP-107","op": "Reporte de novedades","tipo": "Ver / PDF / correo","desc": "Reporte de todo el personal."},
    {"id": "APP-107.calendario","area": "Gestión Humana y Administrativa","app": "Novedades del personal","cod": "APP-107","op": "Calendario de ausencias","tipo": "Ver","desc": "Ausencias aprobadas en calendario."},
    {"id": "APP-107.registrar","area": "Gestión Humana y Administrativa","app": "Novedades del personal","cod": "APP-107","op": "Registrar novedad","tipo": "Crear","desc": "Registrar una novedad a nombre de otra persona."},
    {"id": "APP-107.personal","area": "Gestión Humana y Administrativa","app": "Novedades del personal","cod": "APP-107","op": "Personal","tipo": "Administrar","desc": "Personal administrativo y su acceso en Novedades."},
    {"id": "APP-107.faltas","area": "Gestión Humana y Administrativa","app": "Novedades del personal","cod": "APP-107","op": "Faltas","tipo": "Crear / ver","desc": "Faltas del personal (confidencial)."},
    {"id": "APP-105.abrir","area": "Gestión Documental","app": "Manuales y Procedimientos","cod": "APP-105","op": "Consultar documentos y plantillas","tipo": "Ver","desc": "Manuales, procedimientos, formatos y plantillas vigentes."},
    {"id": "APP-113.abrir","area": "Gestión Documental","app": "Checklist de Operaciones","cod": "APP-113","op": "Abrir la app","tipo": "Entrar","desc": "Ver la tarjeta en el portal y entrar."},
    {"id": "APP-113.resumen","area": "Gestión Documental","app": "Checklist de Operaciones","cod": "APP-113","op": "Resumen","tipo": "Ver","desc": "Avance del área por categoría."},
    {"id": "APP-113.checklist","area": "Gestión Documental","app": "Checklist de Operaciones","cod": "APP-113","op": "Checklist","tipo": "Crear / editar","desc": "Agregar, editar, eliminar y reclasificar ítems; abrir el manual."},
    {"id": "APP-113.catalogos","area": "Gestión Documental","app": "Checklist de Operaciones","cod": "APP-113","op": "Tipos y áreas","tipo": "Administrar","desc": "Catálogos del checklist."},
    {"id": "APP-113.excel","area": "Gestión Documental","app": "Checklist de Operaciones","cod": "APP-113","op": "Excel","tipo": "Descargar","desc": "Exportar el checklist."},
    {"id": "PORTAL.otros","area": "Otros Procesos","app": "Sección «Otros Procesos» del portal","cod": "PORTAL","op": "Ver la sección","tipo": "Ver","desc": "Acceso a Administrativos, Auditoría y apps personales/GPA."},
    {"id": "APP-118.instaladores","area": "Otros Procesos","app": "Administrativos","cod": "APP-118","op": "Instaladores (IC Apps y Comercial)","tipo": "Administrar","desc": "Crear/completar listas y aplicar permisos de SharePoint."},
    {"id": "APP-118.respaldos","area": "Otros Procesos","app": "Administrativos","cod": "APP-118","op": "Respaldos (respaldar y restaurar)","tipo": "Administrar","desc": "Copia completa de IC Apps y simulacro de restauración."},
    {"id": "APP-118.datos","area": "Otros Procesos","app": "Administrativos","cod": "APP-118","op": "Datos de las microapps (sitios SharePoint)","tipo": "Ver","desc": "Enlaces a IC Apps y a Ideas Control (documentos)."},
    {"id": "APP-118.comercial","area": "Otros Procesos","app": "Administrativos","cod": "APP-118","op": "Comercial · Administración","tipo": "Administrar","desc": "Usuarios de Comercial, «Gestiona productos», condiciones y parámetros."},
    {"id": "APP-118.accesos","area": "Otros Procesos","app": "Administrativos","cod": "APP-118","op": "Matriz de permisos y accesos","tipo": "Administrar","desc": "Esta matriz: dar y quitar accesos con un clic."},
    {"id": "APP-118.tablas","area": "Otros Procesos","app": "Administrativos","cod": "APP-118","op": "Tablas maestras","tipo": "Administrar","desc": "Técnicos y personal, tipos de actividad, festivos, categorías de tareas, productos."},
    {"id": "APP-119.abrir","area": "Otros Procesos","app": "Auditoría de registros","cod": "APP-119","op": "Consultar auditoría","tipo": "Ver / descargar","desc": "Quién creó, modificó o eliminó cada registro y qué cambió."},
    {"id": "PERS-LEC.abrir","area": "Otros Procesos","app": "De Dios para el camino · Lectura diaria","cod": "PERS-LEC","op": "Abrir","tipo": "Entrar","desc": "App personal de Martín."},
    {"id": "GPA-REF.abrir","area": "Otros Procesos","app": "Reflexiones Estratégicas · GPA","cod": "GPA-REF","op": "Abrir","tipo": "Entrar","desc": "Biblioteca, editor, calendario y publicación (GPA)."},
    {"id": "GPA-MKT.abrir","area": "Otros Procesos","app": "Marketing GPA","cod": "GPA-MKT","op": "Abrir","tipo": "Entrar","desc": "Plan de contenido GPA (personal)."}];
  let estado = null;   // { activa, email, set }

  /* Lee la matriz (una sola vez por página). Si la lista no existe o no se puede leer: inactiva. */
  async function cargar(email) {
    email = String(email || '').toLowerCase();
    if (estado && estado.email === email) return estado;
    let filas = [];
    try { filas = await IC.graph.items(LISTA, { top: 999 }); } catch (e) { filas = null; }
    const cfg = filas && filas.find((f) => f.Title === CONFIG);
    const activa = !!(cfg && String(cfg.permisos || '').trim() === 'ACTIVA');
    const mia = filas && filas.find((f) => String(f.Title || '').toLowerCase() === email && f.estado !== 'INACTIVO');
    const set = new Set(email === SIEMPRE ? OPCIONES.map((o) => o.id) : String((mia && mia.permisos) || '').split(',').map((s) => s.trim()).filter(Boolean));
    estado = { activa, email, set, filas: filas || [] };
    return estado;
  }
  /* true / false si la matriz está activa; null si no (la app usa sus reglas anteriores). */
  function puede(id) {
    if (!estado || !estado.activa) return null;
    if (estado.email === SIEMPRE) return true;
    return estado.set.has(id);
  }
  /* ¿Tiene alguna opción de la app? (para mostrar la tarjeta en el portal) */
  function algunaDe(codigo) {
    if (!estado || !estado.activa) return null;
    if (estado.email === SIEMPRE) return true;
    const p = codigo + '.';
    for (const id of estado.set) if (id.indexOf(p) === 0) return true;
    return false;
  }
  const activa = () => !!(estado && estado.activa);
  return { OPCIONES, SIEMPRE, LISTA, CONFIG, cargar, puede, algunaDe, activa };
})();
