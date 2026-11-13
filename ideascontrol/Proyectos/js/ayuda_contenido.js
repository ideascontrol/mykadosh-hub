/* =====================================================================
   APP-114 · Proyectos — Contenido de la Ayuda (manual de usuario dentro de la app)
   Cada artículo: { id, cat, titulo, resumen, claves, admin?, html }
   - id: dirección del artículo (#ayuda/id) y enlaces entre artículos.
   - claves: palabras que la gente busca aunque no estén en el texto.
   - admin: true = solo lo ven los administradores.
   Clases: .pasos (lista numerada), .tip (consejo), .ojo (atención), <b class="bt"> (botón).
   Describe solo lo que la app hace hoy (Etapa 2). Cada cambio de pantalla actualiza este archivo.
   ===================================================================== */
window.IC_AYUDA = {
  version: '0.1.2',
  actualizado: '2026-11-12',
  CATEGORIAS: [
    ['inicio', 'Primeros pasos'],
    ['proyectos', 'Crear y administrar proyectos'],
    ['cronograma', 'Cronograma y tareas'],
    ['linea', 'Línea base, avance y atraso'],
    ['bitacora', 'Bitácora'],
    ['admin', 'Administración'],
    ['problemas', 'Preguntas frecuentes']
  ],
  // Artículo que abre el botón Ayuda según la pantalla
  CONTEXTO: [
    ['', 'portafolio'],
    ['nuevo', 'crear'],
    ['p/*', 'resumen'],
    ['p/*/resumen', 'resumen'],
    ['p/*/cronograma', 'cronograma'],
    ['p/*/linea', 'linea-base'],
    ['p/*/bitacora', 'bitacora'],
    ['admin', 'adm-resumen']
  ],
  DESTACADOS: ['crear', 'tarea-actualizar', 'programar', 'planear', 'linea-base', 'faq'],

  ARTICULOS: [
  // ===================================================================
  // PRIMEROS PASOS
  // ===================================================================
  { id: 'ayuda', cat: 'inicio', titulo: 'Cómo usar esta ayuda', resumen: 'El botón Ayuda muestra la explicación de la pantalla en la que está.',
    claves: 'ayuda manual usuario instrucciones como se usa buscar f1',
    html: `
<ul>
<li>El botón <b class="bt">? Ayuda</b> (arriba a la derecha, o la tecla <kbd>F1</kbd>) abre un panel con la explicación de <b>la pantalla en la que está</b>. Lo que estaba haciendo no se pierde.</li>
<li>En el panel puede <b>buscar</b> con sus palabras: «línea base», «no aplica», «predecesora».</li>
<li><b class="bt">Ver toda la ayuda</b> abre el manual completo, organizado por temas. Cada artículo tiene su propia dirección para compartirla.</li>
<li>La tecla <kbd>Esc</kbd> cierra el panel.</li>
</ul>
<div class="tip">El proceso completo está en Gestión Documental › Infografías de procesos › <b>2600 · Proceso de proyectos</b> y en el manual 2600-MAN-OPE.</div>` },

  { id: 'que-es', cat: 'inicio', titulo: 'Qué es Proyectos y quién ve qué', resumen: 'Para qué sirve la app y qué puede hacer cada rol.',
    claves: 'que es proyectos roles permisos acceso lider consulta tecnico administrador quien',
    html: `
<p>Proyectos es el registro de cada implementación de IC (T&amp;A, TimeVision, biometría, puertas y torniquetes): cliente, alcance, cronograma, responsables, estado, salud, línea base y bitácora. Se entra desde el <b>Portal › Operaciones › Proyectos</b>, con la cuenta de Microsoft de IC.</p>
<table class="ic-ayuda-tabla"><thead><tr><th>Rol</th><th>Qué puede hacer</th></tr></thead><tbody>
<tr><td>Administrador</td><td>Todo: crear y editar cualquier proyecto, la biblioteca de plantillas y los accesos.</td></tr>
<tr><td>Líder de proyecto</td><td>Crear proyectos y planear y editar los suyos (los que tienen su nombre como líder).</td></tr>
<tr><td>Consulta</td><td>Ver todos los proyectos sin editar.</td></tr>
<tr><td>Responsable de tareas</td><td>Ver solo los proyectos donde tiene tareas y actualizar el avance de <b>sus</b> tareas.</td></tr>
</tbody></table>
<p>Martín Molina y Patricia Ramírez pueden registrar la aprobación de la línea base de cualquier proyecto. Los roles se asignan en <a href="#ayuda/adm-accesos">Administración › Accesos</a>.</p>
<div class="ojo">Un proyecto en estado <b>Cerrado</b> o <b>Cancelado</b> ya no se edita.</div>` },

  { id: 'etapas', cat: 'inicio', titulo: 'Qué hay hoy y qué viene', resumen: 'Lo que funciona en esta versión y las pestañas grises.',
    claves: 'version etapa novedades proximamente gris reuniones riesgos cambios documentos cierre',
    html: `
<p><b>Disponible (Etapa 2):</b> portafolio, crear proyectos desde las plantillas GNT, cronograma con fases y Gantt, actualización de tareas, tareas propias, línea base y versiones del plan, bitácora y <a href="#ayuda/programar">enlace con la Programación de Operaciones</a> (programar tareas a los técnicos y completarlas al ejecutarse).</p>
<p><b>Próximas etapas</b> (pestañas en gris dentro del proyecto): reuniones y compromisos, riesgos y problemas, control de cambios, documentos y actas, y cierre. Mientras llegan, esos registros se llevan como indica el manual 2600-MAN-OPE.</p>` },

  { id: 'portafolio', cat: 'inicio', titulo: 'El portafolio', resumen: 'Indicadores, filtros y la lista de proyectos.',
    claves: 'portafolio inicio lista proyectos indicadores filtros buscar activos vencidas lider',
    html: `
<p>Es la pantalla de inicio. El avance de cada proyecto se calcula con sus tareas, así que incluye al momento lo completado desde la Programación. Arriba están los <b>indicadores</b>: proyectos activos, en planeación, en ejecución y en pausa, en riesgo, bloqueados y el total de tareas vencidas.</p>
<ul>
<li>Por defecto muestra los <b>activos</b> (sin cerrados ni cancelados). Cambie el filtro de estado para ver todos.</li>
<li>Filtre por <b>salud</b> y por <b>líder</b>, o busque por nombre, código, cliente u Orden de Servicio.</li>
<li>La columna <b>Vencidas</b> cuenta las tareas atrasadas de cada proyecto.</li>
<li>Haga clic en una fila para abrir el proyecto.</li>
</ul>
<p>El responsable de tareas solo ve los proyectos donde tiene tareas asignadas.</p>` },

  // ===================================================================
  // PROYECTOS
  // ===================================================================
  { id: 'crear', cat: 'proyectos', titulo: 'Crear un proyecto', resumen: 'Cliente, escenario, plantillas y tareas que aplican, en una sola pantalla.',
    claves: 'nuevo crear proyecto abrir cliente orden de servicio os escenario plantilla',
    html: `
<p>Menú › <b>Nuevo proyecto</b> (administradores y líderes de proyecto).</p>
<ol class="pasos">
<li><b>Cliente</b>: escriba y elija la empresa de la lista. La lista es la base de Comercial: si el cliente no aparece, créelo primero en la app Comercial (aquí no se crean clientes).</li>
<li>Escriba el <b>nombre del proyecto</b> y, si la tiene, la <b>Orden de Servicio</b> y su fecha.</li>
<li><b>Fecha de inicio</b>: viene el siguiente día hábil; cámbiela si se acordó otra. Elija el <b>líder IC</b> y el <b>contacto</b> del cliente.</li>
<li>Pegue el enlace de la <b>carpeta del proyecto</b> en SharePoint y la descripción del alcance contratado.</li>
<li><b>Escenario</b>: al elegirlo se marcan solas las plantillas que le corresponden. <a href="#ayuda/escenarios">Ver escenarios</a>.</li>
<li><b>Tareas que aplican</b>: revise la lista. Lo que no está en el alcance se <b>desmarca</b> y se escribe el motivo. <a href="#ayuda/no-aplica">Más sobre «No aplica»</a>.</li>
<li>Presione <b class="bt">Crear proyecto</b>. La app le asigna el código (PRY-0001…), calcula las fechas y abre el cronograma.</li>
</ol>
<div class="tip">Las duraciones de la plantilla son referencias. Ajústelas, asigne responsables y revise las dependencias antes de <a href="#ayuda/linea-base">aprobar la línea base</a>.</div>` },

  { id: 'escenarios', cat: 'proyectos', titulo: 'Escenarios y plantillas GNT', resumen: 'Qué plantillas usa cada tipo de proyecto y qué pasa al combinarlas.',
    claves: 'escenario plantilla gnt combinar combinado timevision biometrico puerta torniquete comunes duplicadas',
    html: `
<table class="ic-ayuda-tabla"><thead><tr><th>Escenario</th><th>Plantillas</th></tr></thead><tbody>
<tr><td>T&amp;A nuevo</td><td>GNT-001</td></tr>
<tr><td>T&amp;A nuevo con TimeVision</td><td>GNT-001 + GNT-002</td></tr>
<tr><td>TimeVision sobre T&amp;A existente</td><td>GNT-002</td></tr>
<tr><td>Instalación biométrica</td><td>GNT-003</td></tr>
<tr><td>Puerta / control de acceso</td><td>GNT-004</td></tr>
<tr><td>Torniquete</td><td>GNT-005</td></tr>
<tr><td>Proyecto combinado</td><td>Las que usted marque</td></tr>
</tbody></table>
<ul>
<li>Puede marcar o desmarcar plantillas aunque el escenario ya haya marcado algunas.</li>
<li>Al combinar plantillas, las <b>tareas comunes</b> (Orden de Servicio, kickoff, responsables, aprobación del cronograma, acta de inicio y cierre) quedan <b>una sola vez</b>. La app le muestra cuáles unificó.</li>
<li>Se usa la versión vigente de cada plantilla: la publicada o, si aún no hay, la que está en validación.</li>
</ul>
<p>TimeVision es el módulo de reportes y análisis de T&amp;A.</p>` },

  { id: 'resumen', cat: 'proyectos', titulo: 'La ficha del proyecto (Resumen)', resumen: 'Indicadores, datos del proyecto, vencidas y lo que vence en 7 días.',
    claves: 'ficha resumen proyecto datos indicadores cierre estimado vencen avance real planeado',
    html: `
<p>Arriba están el estado, la salud y dos barras: <b>avance real</b> y <b>avance planeado</b> a hoy. <a href="#ayuda/indicadores">Cómo se calculan</a>.</p>
<p>La pestaña <b>Resumen</b> muestra:</p>
<ul>
<li>Tareas completadas, vencidas, que vencen en 7 días, bloqueadas y en riesgo.</li>
<li>El <b>cierre estimado</b> del plan y, si ya hay línea base, su fecha de cierre para comparar.</li>
<li>Los datos del proyecto: cliente, contacto, líder, OS, escenario, plantillas, carpeta, alcance, exclusiones, supuestos, entregables y participantes.</li>
<li>Las listas de <b>vencidas</b> y de lo que <b>vence en 7 días</b>. Clic en una tarea para abrirla.</li>
</ul>
<p>Para cambiar datos use <a href="#ayuda/editar-proyecto">Editar</a>.</p>` },

  { id: 'editar-proyecto', cat: 'proyectos', titulo: 'Editar el proyecto: estado, salud y alcance', resumen: 'Qué se puede cambiar y cómo queda registrado.',
    claves: 'editar proyecto estado salud explicacion lider alcance exclusiones supuestos entregables participantes carpeta pausa cerrar cancelar',
    html: `
<ol class="pasos">
<li>En Resumen, presione <b class="bt">Editar</b> (líder del proyecto o administrador).</li>
<li>Cambie lo necesario: nombre, estado, salud y su explicación, líder, Orden de Servicio, carpeta, alcance, exclusiones, supuestos, entregables o participantes.</li>
<li>Escriba un <b>comentario para la bitácora</b> si ayuda a entender el cambio.</li>
<li>Presione <b class="bt">Guardar</b>. Cada campo cambiado queda en la <a href="#ayuda/bitacora">bitácora</a> con el valor anterior y el nuevo.</li>
</ol>
<table class="ic-ayuda-tabla"><thead><tr><th>Estado</th><th>Significado</th></tr></thead><tbody>
<tr><td>Planeación</td><td>Recién creado; se ajusta el cronograma.</td></tr>
<tr><td>En ejecución</td><td>Pasa solo a este estado al aprobar la línea base.</td></tr>
<tr><td>En pausa</td><td>Detenido temporalmente.</td></tr>
<tr><td>Cerrado / Cancelado</td><td>Terminado o cancelado: ya no se edita.</td></tr>
</tbody></table>
<p><b>Salud</b>: Normal, En riesgo o Bloqueada. Es independiente del estado: un proyecto puede estar en ejecución y en riesgo.</p>` },

  // ===================================================================
  // CRONOGRAMA
  // ===================================================================
  { id: 'cronograma', cat: 'cronograma', titulo: 'Leer el cronograma', resumen: 'Fases plegables, columnas y colores del Gantt.',
    claves: 'cronograma gantt fases plegar desplegar barras colores hoy linea base columnas',
    html: `
<p>Las tareas se agrupan por <b>fase</b>. Clic en una fase la pliega o despliega; <b class="bt">Plegar / desplegar fases</b> lo hace con todas.</p>
<p>Columnas: ID, actividad, responsable y organización, días, inicio y fin del plan, % de avance, estado (y salud si no es Normal) y <b>atraso</b> en días hábiles.</p>
<table class="ic-ayuda-tabla"><thead><tr><th>En el Gantt</th><th>Significa</th></tr></thead><tbody>
<tr><td>Barra gris claro (abajo)</td><td>Fechas de la línea base</td></tr>
<tr><td>Barra azul</td><td>Plan vigente, sin novedad</td></tr>
<tr><td>Barra roja</td><td>Vencida o bloqueada</td></tr>
<tr><td>Barra dorada</td><td>En riesgo</td></tr>
<tr><td>Barra verde</td><td>Completada</td></tr>
<tr><td>Rombo dorado</td><td>Hito</td></tr>
<tr><td>Línea azul vertical</td><td>Hoy</td></tr>
</tbody></table>
<p>La etiqueta <b>estimada</b> bajo los días indica que la duración viene de la plantilla como referencia. Clic en una tarea para <a href="#ayuda/tarea-actualizar">actualizarla</a>.</p>` },

  { id: 'filtros', cat: 'cronograma', titulo: 'Filtrar: vencidas, hoy y próximos días', resumen: 'Ventanas de tiempo, responsable, organización, fase, estado y salud.',
    claves: 'filtrar filtro vencidas hoy proximos 3 7 15 30 dias responsable sin responsable organizacion fase estado salud buscar',
    html: `
<ul>
<li><b>Ventanas</b> (botones de arriba): Vencidas, Hoy, Próx. 3, 7, 15 y 30 días. Muestran las tareas abiertas que empiezan o terminan en ese periodo.</li>
<li><b>Responsable</b>: incluye la opción «Sin responsable» para encontrar lo que falta asignar.</li>
<li><b>Organización</b>: IC, Cliente, IC + Cliente, Fabricante o Tercero. Útil para revisar en el comité las tareas del cliente.</li>
<li><b>Fase</b>, <b>estado</b> y <b>salud</b>, y el buscador por ID, actividad o descripción.</li>
<li><b>Ocultar «No aplica»</b> viene activo; desactívelo para ver lo que quedó fuera del alcance.</li>
</ul>
<div class="tip">Con un filtro activo, las fases se despliegan solas y solo aparecen las que tienen tareas que cumplen.</div>` },

  { id: 'tarea-actualizar', cat: 'cronograma', titulo: 'Actualizar una tarea', resumen: 'Estado, avance, salud, fechas reales y evidencia; todo queda en la bitácora.',
    claves: 'actualizar tarea avance porcentaje estado completada en curso fechas reales evidencia observaciones comentario responsable',
    html: `
<p>Clic en la tarea en el cronograma o en el Resumen. La actualizan su <b>responsable</b>, el <b>líder</b> del proyecto y los administradores; los demás la ven en solo lectura.</p>
<ol class="pasos">
<li>Elija el <b>estado</b>. Al poner «En curso» la app propone hoy como inicio real; al poner «Completada» pone 100 % y hoy como fin real.</li>
<li>Escriba el <b>% de avance</b> (0 a 100).</li>
<li>Si hay un problema, cambie la <b>salud</b> a En riesgo o Bloqueada y explique por qué.</li>
<li>Revise las <b>fechas reales</b>: el fin real no puede ser antes del inicio real ni una fecha futura.</li>
<li>Registre la <b>evidencia</b> (enlace o referencia: acta, correo de aceptación) y las observaciones.</li>
<li>Escriba un <b>comentario para la bitácora</b> y presione <b class="bt">Guardar</b>.</li>
</ol>
<p>La ficha de la tarea muestra su descripción, el criterio de cumplimiento, las predecesoras y sus fechas de línea base. <b class="bt">Historial</b> abre la bitácora de esa tarea.</p>` },

  { id: 'estados-tarea', cat: 'cronograma', titulo: 'Estados y salud de una tarea', resumen: 'Qué significa cada uno y cuáles cuentan en el avance.',
    claves: 'estado tarea no iniciada en curso en revision completada no aplica cancelada salud normal riesgo bloqueada',
    html: `
<table class="ic-ayuda-tabla"><thead><tr><th>Estado</th><th>Significa</th></tr></thead><tbody>
<tr><td>No iniciada</td><td>Aún no empieza.</td></tr>
<tr><td>En curso</td><td>Se está ejecutando.</td></tr>
<tr><td>En revisión</td><td>Terminada por quien la ejecuta; falta validarla.</td></tr>
<tr><td>Completada</td><td>Cumplida: cuenta como 100 %.</td></tr>
<tr><td>No aplica</td><td>Fuera del alcance; exige motivo. No cuenta en el avance.</td></tr>
<tr><td>Cancelada</td><td>Ya no se hará; exige motivo. No cuenta en el avance.</td></tr>
</tbody></table>
<p>La <b>salud</b> (Normal, En riesgo, Bloqueada) se maneja aparte del estado: una tarea puede estar en curso y bloqueada.</p>` },

  { id: 'no-aplica', cat: 'cronograma', titulo: '«No aplica»: nada se borra', resumen: 'Cómo dejar por fuera una tarea sin perder su historia.',
    claves: 'no aplica borrar eliminar quitar tarea motivo alcance cancelada',
    html: `
<p>En Proyectos <b>no se borran tareas</b>. Lo que no hace parte del alcance se marca <b>No aplica</b> con su motivo:</p>
<ul>
<li>Al crear el proyecto: desmarque la tarea y escriba el motivo.</li>
<li>Después: abra la tarea, cambie el estado a «No aplica» (o «Cancelada») y escriba el motivo.</li>
</ul>
<p>La tarea sigue en el cronograma (en gris, o escondida con «Ocultar No aplica»), no cuenta en el avance y el cambio queda en la bitácora. Si vuelve a aplicar, cámbiele el estado.</p>` },

  { id: 'planear', cat: 'cronograma', titulo: 'Planear: responsable, duración y predecesoras', resumen: 'Lo que ajusta el líder antes de la línea base y cómo se recalculan las fechas.',
    claves: 'planear responsable asignar duracion dias predecesoras dependencias ciclo inicio plan organizacion lider',
    html: `
<p>En la ficha de la tarea, el líder del proyecto ve además el bloque <b>Planeación</b>:</p>
<ul>
<li><b>Responsable</b> y <b>organización</b> (IC, Cliente, IC + Cliente, Fabricante, Tercero).</li>
<li><b>Duración</b> en días hábiles.</li>
<li><b>Predecesoras</b>: los ID de las tareas que deben terminar antes, separados por punto y coma (ej. <code>TA-1-1;TA-1-2</code>).</li>
<li><b>Inicio plan</b>: solo se fija a mano si la tarea no tiene predecesoras; si las tiene, lo definen ellas.</li>
</ul>
<p>Al guardar, la app <b>recalcula las fechas</b> de las tareas que dependen de ella. <a href="#ayuda/recalcular">Cómo se calculan</a>.</p>
<div class="ojo">La app no deja guardar una predecesora que no existe, una fase como predecesora ni un <b>ciclo</b> (A depende de B y B de A). El mensaje dice dónde está el problema.</div>` },

  { id: 'recalcular', cat: 'cronograma', titulo: 'Cómo se calculan las fechas', resumen: 'Días hábiles, festivos, predecesoras y fases.',
    claves: 'calcular fechas recalcular dias habiles festivos sabados domingos predecesora fase inicio fin',
    html: `
<ul>
<li>Se cuentan <b>días hábiles</b>: sin sábados, domingos ni los festivos registrados en IC Apps.</li>
<li>Una tarea empieza el <b>día hábil siguiente</b> al fin de su predecesora más tardía.</li>
<li>Sin predecesoras, empieza el día de inicio del proyecto (o la fecha que usted le haya fijado, si es posterior).</li>
<li>El fin es el inicio más la duración menos un día hábil. Un hito (duración 0) dura un día en el calendario.</li>
<li>Cada <b>fase</b> va del primer inicio al último fin de sus tareas.</li>
</ul>
<p><b class="bt">Recalcular fechas</b> (en el cronograma) vuelve a calcular todo desde el inicio del proyecto. Las tareas que cambian quedan resumidas en la bitácora.</p>` },

  { id: 'programar', cat: 'cronograma', titulo: 'Programar una tarea en Operaciones', resumen: 'Agendar a un técnico desde la tarea; al ejecutarse, la tarea se completa sola.',
    claves: 'programar programacion agendar tecnico visita instalacion pruebas operaciones agenda ejecutada completada sincronizar',
    html: `
<p>Las tareas que hace un técnico en sitio (visita técnica, pruebas, instalación…) se agendan en la Programación de Operaciones sin salir de Proyectos. Lo hace el <b>líder del proyecto</b>.</p>
<ol class="pasos">
<li>Abra la tarea y, en el bloque <b>Programación de Operaciones</b>, presione <b class="bt">Programar en Operaciones</b>.</li>
<li>Elija el <b>tipo de actividad</b> y el <b>técnico</b> (viene el responsable de la tarea, si es técnico).</li>
<li>Revise la <b>fecha</b> (viene el inicio del plan), la hora, la ciudad, los equipos y las observaciones para el técnico.</li>
<li>La app revisa la agenda del técnico ese día: ausencias, otras actividades, días no hábiles y si tiene la habilidad. Son avisos: puede programar de todas formas.</li>
<li>Presione <b class="bt">Programar</b>. La actividad queda en la Programación como «Programado», con el cliente, la OS y el enlace a la tarea.</li>
</ol>
<ul>
<li>En el cronograma, la tarea muestra una etiqueta con el estado de su actividad: programada, confirmada, reprogramada o ejecutada, con la fecha y el técnico.</li>
<li>Confirmar, reprogramar o cancelar se hace en la Programación, como cualquier actividad. Una reprogramación sigue enlazada a la tarea.</li>
<li>Cuando la actividad queda <b>Ejecutada</b> en la Programación, la tarea se marca <b>Completada</b> (100 %, fin real = fecha de la visita) y las notas del técnico pasan a sus observaciones y a la bitácora.</li>
</ul>
<div class="tip">Si la Programación no alcanzó a actualizar la tarea (por ejemplo, sin conexión), se completa sola la próxima vez que el líder o el responsable abran el proyecto.</div>` },

  { id: 'tarea-propia', cat: 'cronograma', titulo: 'Agregar una tarea propia', resumen: 'Tareas que no vienen en la plantilla.',
    claves: 'agregar nueva tarea propia adicional extra pro-001',
    html: `
<ol class="pasos">
<li>En el cronograma, presione <b class="bt">+ Tarea propia</b> (líder o administrador).</li>
<li>Elija la <b>fase</b>, el tipo (tarea, hito o decisión) y la duración.</li>
<li>Escriba la actividad, la descripción, el responsable, la organización, las predecesoras y el criterio de cumplimiento.</li>
<li>Explique <b>por qué se agrega</b> (obligatorio) y presione <b class="bt">Agregar</b>.</li>
</ol>
<p>La tarea recibe un código PRO-001, PRO-002… y queda al final de su fase con la etiqueta «propia». Las fechas se recalculan solas.</p>` },

  // ===================================================================
  // LÍNEA BASE
  // ===================================================================
  { id: 'linea-base', cat: 'linea', titulo: 'Aprobar la línea base', resumen: 'Congelar el plan: quién aprueba, qué se revisa y qué cambia.',
    claves: 'linea base aprobar aprobacion congelar plan v0 martin patricia evidencia en ejecucion',
    html: `
<p>La línea base es la foto del plan aprobado (versión 0). Contra ella se mide el atraso de cada tarea.</p>
<ol class="pasos">
<li>Revise el cronograma: responsables, duraciones y predecesoras.</li>
<li>Vaya a la pestaña <b>Línea base y versiones</b>. La app verifica que las dependencias no tengan errores y que todas las tareas que aplican tengan fechas; también avisa si hay tareas de IC sin responsable.</li>
<li>Presione <b class="bt">Aprobar línea base</b> y elija quién aprobó: <b>Martín Molina</b> o <b>Patricia Ramírez</b> (basta uno).</li>
<li>Si aprobó otra persona distinta de quien registra, escriba la <b>evidencia</b> (correo o acta).</li>
<li>Presione <b class="bt">Aprobar</b>.</li>
</ol>
<p>El proyecto pasa a <b>En ejecución</b> y la aprobación queda registrada con fecha y hora.</p>
<div class="ojo">La línea base <b>no se modifica</b>. Los cambios aprobados se registran como <a href="#ayuda/versiones">nuevas versiones del plan</a>.</div>` },

  { id: 'versiones', cat: 'linea', titulo: 'Nuevas versiones del plan', resumen: 'Registrar un cambio aprobado sin tocar la línea base.',
    claves: 'version plan v1 v2 cambio replanear reprogramar aprobado motivo',
    html: `
<p>Cuando un cambio aprobado mueve el cronograma, ajuste las tareas y luego, en <b>Línea base y versiones</b>, presione <b class="bt">Registrar nueva versión del plan</b>.</p>
<ul>
<li>Se pide quién aprobó, la evidencia si aplica y el <b>motivo del cambio</b> (obligatorio).</li>
<li>Se guarda como v1, v2… con la foto de las fechas de ese momento.</li>
<li>La línea base (v0) sigue igual: el atraso se sigue midiendo contra ella.</li>
</ul>
<p>La tabla de versiones muestra cada versión con su fecha, quién la aprobó, el motivo y su fecha de fin.</p>` },

  { id: 'indicadores', cat: 'linea', titulo: 'Avance real, avance planeado y atraso', resumen: 'Cómo se calculan los números del proyecto.',
    claves: 'avance real planeado porcentaje ponderado duracion atraso vencida dias habiles calculo',
    html: `
<table class="ic-ayuda-tabla"><thead><tr><th>Indicador</th><th>Cómo se calcula</th></tr></thead><tbody>
<tr><td>Avance real</td><td>Promedio del % de las tareas, <b>ponderado por su duración</b>. No cuentan las fases ni las tareas No aplica o Canceladas. Una completada cuenta 100 %.</td></tr>
<tr><td>Avance planeado</td><td>Lo que debería llevar hoy según las fechas y duraciones de la línea base (o del plan, si aún no hay línea base).</td></tr>
<tr><td>Atraso</td><td>Días hábiles entre el fin de la línea base y hoy (o el fin real, si ya terminó tarde).</td></tr>
<tr><td>Vencida</td><td>Tarea abierta (no completada, no aplica ni cancelada) con atraso.</td></tr>
</tbody></table>
<p>Sin línea base aprobada, el atraso se mide contra el plan vigente.</p>` },

  // ===================================================================
  // BITÁCORA
  // ===================================================================
  { id: 'bitacora', cat: 'bitacora', titulo: 'La bitácora del proyecto', resumen: 'Quién cambió qué, cuándo, el valor anterior y el nuevo.',
    claves: 'bitacora historial cambios auditoria quien cuando registro comentario evidencia',
    html: `
<p>La pestaña <b>Bitácora</b> guarda cada cambio del proyecto y de sus tareas: fecha y hora, usuario, tarea, campo, valor anterior, valor nuevo, comentario y evidencia.</p>
<ul>
<li>Filtre por una tarea, por «Solo cambios del proyecto», o busque una palabra.</li>
<li>Desde una tarea, <b class="bt">Historial</b> abre la bitácora filtrada por ella.</li>
<li>También quedan la creación del proyecto, las tareas agregadas, los recálculos de fechas y las aprobaciones.</li>
</ul>
<div class="ojo">La bitácora no se edita ni se borra.</div>` },

  // ===================================================================
  // ADMINISTRACIÓN
  // ===================================================================
  { id: 'adm-resumen', cat: 'admin', admin: true, titulo: 'Administración', resumen: 'Biblioteca de plantillas y accesos a la app.',
    claves: 'administracion admin configuracion biblioteca accesos',
    html: `
<p>Menú › <b>Administración</b> tiene dos secciones:</p>
<ul>
<li><b>Biblioteca de plantillas</b>: <a href="#ayuda/adm-biblioteca">importar</a>, ver, <a href="#ayuda/adm-publicar">publicar y retirar</a> las plantillas GNT.</li>
<li><b>Accesos</b>: <a href="#ayuda/adm-accesos">quién entra y con qué rol</a>.</li>
</ul>
<p>Cambiar la biblioteca no altera los proyectos ya creados: cada proyecto guarda su propia copia de las tareas.</p>` },

  { id: 'adm-biblioteca', cat: 'admin', admin: true, titulo: 'Importar la Biblioteca Maestra', resumen: 'Cargar el Excel de plantillas GNT y qué corrige la app al importar.',
    claves: 'importar biblioteca maestra excel plantillas gnt cargar actualizar version',
    html: `
<ol class="pasos">
<li>Administración › <b class="bt">Importar Biblioteca Maestra (Excel)</b> y elija el archivo.</li>
<li>Revise la vista previa: cada plantilla con su versión, registros, las correcciones que hizo la app y la validación de dependencias.</li>
<li>Deje marcadas las que quiere importar y presione <b class="bt">Importar</b>.</li>
</ol>
<p>Al importar, la app corrige sin tocar el Excel: convierte las predecesoras de la numeración del Planeador, descarta encabezados repetidos, crea las fases que falten, unifica la forma de escribir la organización y marca las tareas comunes.</p>
<ul>
<li>Las plantillas entran <b>En validación</b>: ya se pueden usar en proyectos.</li>
<li>Si la misma versión ya existe, se reemplaza.</li>
</ul>` },

  { id: 'adm-publicar', cat: 'admin', admin: true, titulo: 'Publicar o retirar una plantilla', resumen: 'Registrar la aprobación de una versión o dejar de ofrecerla.',
    claves: 'publicar aprobar plantilla retirar version validacion',
    html: `
<ul>
<li><b class="bt">Publicar</b>: elija quién aprobó (Martín Molina o Patricia Ramírez) y, si fue otra persona, la evidencia. La aprobación queda registrada. Solo hay una versión publicada por código: la anterior vuelve a «En validación».</li>
<li><b class="bt">Retirar</b>: la plantilla deja de ofrecerse al crear proyectos. Los proyectos que ya la usan no cambian.</li>
<li><b class="bt">Ver</b>: muestra los registros de la plantilla con sus días, predecesoras, organización y si es tarea común.</li>
</ul>` },

  { id: 'adm-accesos', cat: 'admin', admin: true, titulo: 'Dar acceso a Proyectos', resumen: 'Administrador, Líder de proyecto o Consulta.',
    claves: 'acceso usuario permiso rol dar quitar inactivo lider consulta administrador',
    html: `
<ol class="pasos">
<li>Administración › <b class="bt">+ Dar acceso</b>.</li>
<li>Elija la persona, el rol y el estado, y presione <b class="bt">Guardar</b>.</li>
</ol>
<p>Para cambiar el rol o quitar el acceso, haga clic en la persona y póngala <b>Inactiva</b>.</p>
<p>Los técnicos no necesitan acceso: ven los proyectos donde tienen tareas asignadas. La persona también debe ser miembro del sitio IC Apps en SharePoint.</p>` },

  { id: 'adm-instalar', cat: 'admin', admin: true, titulo: 'Instalación de la app', resumen: 'Qué hacer si aparece «Falta instalar la app».',
    claves: 'instalar instalador listas sharepoint crear estructura permisos pry',
    html: `
<p>La app guarda sus datos en listas de IC Apps que empiezan por <b>PRY_</b>. Si no existen, aparece «Falta instalar la app».</p>
<ol class="pasos">
<li>Abra el instalador de la Programación (Programacion/Instalador/) con la cuenta de la Dirección de Operaciones.</li>
<li>Presione <b class="bt">Crear estructura</b> y luego <b class="bt">Aplicar permisos</b>. «Crear estructura» también agrega las columnas nuevas cuando la app se actualiza (por ejemplo, el enlace con la Programación); no borra nada.</li>
<li>Entre a Proyectos › Administración e importe la Biblioteca Maestra.</li>
</ol>` },

  // ===================================================================
  // PREGUNTAS FRECUENTES
  // ===================================================================
  { id: 'faq', cat: 'problemas', titulo: 'Preguntas frecuentes', resumen: 'Cliente que no aparece, botones que no salen, cambios que no se ven.',
    claves: 'pregunta frecuente problema no aparece no puedo editar no veo error recargar',
    html: `
<dl class="ic-ayuda-faq">
<dt>El cliente no aparece al crear el proyecto.</dt><dd>La lista sale de la base de Comercial. Créelo allá (o pida que lo creen) y vuelva a abrir Nuevo proyecto.</dd>
<dt>No me deja editar una tarea o el proyecto.</dt><dd>Revise su rol (<a href="#ayuda/que-es">quién ve qué</a>) y el estado del proyecto: Cerrado y Cancelado no se editan. Una tarea la actualizan su responsable, el líder y los administradores.</dd>
<dt>¿Puedo borrar una tarea?</dt><dd>No. Márquela <a href="#ayuda/no-aplica">No aplica</a> o Cancelada con su motivo.</dd>
<dt>Cambié la duración y se movieron muchas fechas.</dt><dd>Es lo esperado: las tareas que dependen de ella se recalculan. El resumen queda en la bitácora.</dd>
<dt>Una tarea del cliente aparece sin responsable.</dt><dd>Es normal: el responsable de la lista es personal de IC. La organización (Cliente, Fabricante) indica de quién depende.</dd>
<dt>Al programar en Operaciones sale un error de acceso.</dt><dd>Para programar hay que tener permiso de edición sobre las actividades de la Programación en SharePoint. Pídalo a la Dirección de Operaciones.</dd>
<dt>Al programar dice que faltan columnas o que hay que actualizar las listas.</dt><dd>Falta correr «Crear estructura» en el instalador. Vea <a href="#ayuda/adm-instalar">Instalación de la app</a>.</dd>
<dt>La actividad ya está ejecutada pero la tarea sigue abierta.</dt><dd>Se completa sola cuando el líder o el responsable abren el proyecto. Si no, revise en la Programación que la actividad sea la enlazada a esa tarea (su ficha dice de qué proyecto viene).</dd>
<dt>No veo un cambio reciente de la app.</dt><dd>Recargue con <kbd>Ctrl</kbd> + <kbd>F5</kbd>.</dd>
<dt>Aparece «Falta instalar la app».</dt><dd>Vea <a href="#ayuda/adm-instalar">Instalación de la app</a> o avise a la Dirección de Operaciones.</dd>
</dl>` }
  ]
};
