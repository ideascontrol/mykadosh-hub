/* =====================================================================
   APP-101 · Comercial — Contenido de la Ayuda (centro de ayuda dentro de la app)
   Cada artículo: { id, cat, titulo, resumen, claves, admin?, html }
   - id: se usa en la dirección (#ayuda/id) y en los enlaces entre artículos.
   - cat: categoría (ver CATEGORIAS).
   - claves: palabras que la gente busca aunque no estén en el texto.
   - admin: true = solo lo ven los administradores.
   - html: texto del artículo. Clases: .pasos (lista numerada), .tip (consejo),
     .ojo (atención), <kbd> (tecla), <b class="bt"> (nombre de un botón).
   Se mantiene junto con el Manual de usuario: cada módulo nuevo o cambio de
   pantalla actualiza los dos.
   ===================================================================== */
window.IC_AYUDA = {
  version: '0.4.0',
  actualizado: '2026-10-18',
  CATEGORIAS: [
    ['inicio', 'Primeros pasos'],
    ['cotizaciones', 'Cotizaciones'],
    ['gestion', 'Interacciones y pendientes'],
    ['tablero', 'Tablero comercial'],
    ['empresas', 'Empresas y contactos'],
    ['productos', 'Productos y precios'],
    ['carga', 'Carga masiva'],
    ['admin', 'Administración'],
    ['problemas', 'Problemas y contingencia']
  ],
  // Qué artículo se abre con el botón Ayuda según la pantalla en la que está la persona.
  // Se busca el patrón más largo que coincida con el inicio de la ruta (#...).
  CONTEXTO: [
    ['', 'menu'],
    ['cotizaciones/nueva', 'cot-crear'],
    ['cotizaciones/*/editar', 'cot-crear'],
    ['cotizaciones/*', 'cot-ficha'],
    ['cotizaciones', 'cot-lista'],
    ['tablero', 'tab-leer'],
    ['agenda', 'int-agenda'],
    ['admin/tipificaciones', 'adm-tipificaciones'],
    ['empresas/nueva', 'emp-crear'],
    ['empresas/*', 'emp-ficha'],
    ['empresas', 'emp-buscar'],
    ['productos/nuevo', 'prd-crear'],
    ['productos/*/editar', 'prd-crear'],
    ['productos/*', 'prd-ficha'],
    ['productos', 'prd-catalogo'],
    ['carga', 'carga-pasos'],
    ['admin/usuarios', 'adm-usuarios'],
    ['admin/condiciones', 'adm-condiciones'],
    ['admin/parametros', 'adm-parametros'],
    ['admin/motivos', 'adm-motivos'],
    ['admin/delegaciones', 'adm-delegaciones'],
    ['admin/distribuidores', 'adm-otras'],
    ['admin/festivos', 'adm-otras'],
    ['admin/consecutivos', 'adm-otras'],
    ['admin/registro', 'adm-otras'],
    ['admin', 'adm-resumen']
  ],
  // Artículos que se sugieren cuando la persona abre la Ayuda
  DESTACADOS: ['int-registrar', 'int-agenda', 'cot-crear', 'cot-editar', 'cot-estados', 'tab-seguimiento', 'emp-crear', 'faq'],

  ARTICULOS: [
  // ===================================================================
  // PRIMEROS PASOS
  // ===================================================================
  { id: 'novedades', cat: 'inicio', titulo: 'Novedades de la versión 0.4.0', resumen: 'Nuevo: registrar llamadas, correos y visitas, y la agenda Mis pendientes.',
    claves: 'nuevo cambios version actualizacion que hay de nuevo',
    html: `
<p><b>Versión 0.4.0 · octubre de 2026</b></p>
<ul>
<li><b>Registrar interacciones</b>: cada llamada, correo, WhatsApp, Teams o visita queda en la ficha de la empresa. <a href="#ayuda/int-registrar">Ver cómo</a>.</li>
<li><b>Mis pendientes</b>: la agenda del día con lo vencido, lo de hoy y lo próximo. <a href="#ayuda/int-agenda">Ver cómo</a>.</li>
<li><b>Actividad</b> en la ficha de la empresa: interacciones y cotizaciones en orden. <a href="#ayuda/int-linea">Ver más</a>.</li>
<li>«Pide cotización» abre la cotización con el cliente ya cargado.</li>
<li>«No volver a contactar» marca al contacto y cancela sus pendientes.</li>
<li>El tablero muestra la <b>actividad comercial</b> y el cumplimiento de la agenda.</li>
</ul>
<p><b>Versión 0.3.x</b>: tablero comercial, motivos de pérdida, editar cotizaciones con PDF, ayuda dentro de la app.</p>` },

  { id: 'ayuda', cat: 'inicio', titulo: 'Cómo usar esta ayuda', resumen: 'El botón Ayuda muestra la explicación de la pantalla en la que está.',
    claves: 'ayuda manual instrucciones como se usa buscar',
    html: `
<p>La ayuda está dentro de la app: no hay que descargar nada.</p>
<ul>
<li>El botón <b class="bt">? Ayuda</b> (arriba a la derecha) abre un panel con la explicación de <b>la pantalla en la que está</b>. Por ejemplo, si está creando una cotización, se abre «Crear una cotización».</li>
<li>En el panel puede <b>buscar</b>: escriba lo que necesita con sus palabras («cambiar precio», «perdida», «dólares»).</li>
<li><b class="bt">Ver toda la ayuda</b> abre el centro de ayuda completo, organizado por temas.</li>
<li>La tecla <kbd>Esc</kbd> cierra el panel. Lo que estaba haciendo no se pierde.</li>
</ul>
<div class="tip">Cada artículo tiene su propia dirección. Puede copiarla y enviarla a un compañero para mostrarle cómo se hace algo.</div>` },

  { id: 'entrar', cat: 'inicio', titulo: 'Entrar y salir de la app', resumen: 'Se entra con la misma cuenta de Microsoft de Outlook y Teams.',
    claves: 'login iniciar sesion contraseña clave acceso cuenta microsoft salir cerrar celular',
    html: `
<ol class="pasos">
<li>Abra en el navegador (computador o celular): <b>mykadosh.com/ideascontrol/Comercial/</b></li>
<li>Presione <b class="bt">Iniciar sesión</b> y entre con su cuenta de Microsoft de Ideas Control (la misma de Outlook y Teams).</li>
<li>La primera vez, Microsoft puede pedirle confirmar el inicio de sesión. Después la app recuerda su sesión.</li>
</ol>
<p>Para salir use <b class="bt">Salir</b>, arriba a la derecha. Hágalo siempre en computadores compartidos.</p>
<div class="tip">Guarde la dirección en favoritos o agréguela a la pantalla de inicio del celular.</div>
<p><b>Quién ve qué</b></p>
<ul>
<li><b>Comercial</b>: cotizaciones, tablero (solo lo suyo), empresas y contactos, y consulta del catálogo.</li>
<li><b>Administrador</b>: todo lo anterior, más productos y precios, carga masiva y Administración.</li>
</ul>
<p>Si al entrar ve un mensaje de error, revise <a href="#ayuda/mensajes">Mensajes al entrar</a>.</p>` },

  { id: 'menu', cat: 'inicio', titulo: 'El menú principal', resumen: 'Indicadores, tarjetas de cada módulo y cómo volver.',
    claves: 'inicio menu tarjetas indicadores volver atras encabezado',
    html: `
<p>Arriba están los <b>indicadores</b>: empresas registradas, clientes, productos activos y cotizaciones. Debajo, las <b>tarjetas</b> de los módulos. Cada persona ve las tarjetas de su rol.</p>
<ul>
<li><b>Comercial</b>: Nueva cotización, Cotizaciones, Mis pendientes y Tablero comercial.</li>
<li><b>Datos maestros</b>: Empresas y contactos, Productos y precios.</li>
<li><b>Herramientas</b>: Actividad reciente, Carga masiva y Administración (las dos últimas, solo administradores).</li>
</ul>
<p>Las tarjetas grises con la etiqueta <b>Próximamente</b> aún no se pueden abrir.</p>
<p><b>Cómo volver</b>: el logo lleva al menú desde cualquier pantalla. Arriba a la izquierda de cada pantalla está el enlace para volver (← Menú principal o ← la sección anterior). También sirve el botón Atrás del navegador.</p>` },

  { id: 'mensajes', cat: 'inicio', titulo: 'Mensajes al entrar', resumen: '«Usuario no habilitado», errores de permisos y qué hacer.',
    claves: 'error usuario no habilitado permisos acceso denegado no carga',
    html: `
<table class="ic-ayuda-tabla"><thead><tr><th>Mensaje</th><th>Qué significa</th><th>Qué hacer</th></tr></thead><tbody>
<tr><td>Usuario no habilitado</td><td>Su correo no está registrado como usuario activo</td><td>Pida al administrador que lo cree en Administración › Usuarios</td></tr>
<tr><td>Error de permisos / acceso denegado</td><td>Está en la app pero no tiene acceso al sitio IC Apps de SharePoint</td><td>El administrador debe darle acceso como Miembro al sitio IC Apps</td></tr>
<tr><td>No se pudo cargar la app</td><td>Falla de conexión o de Microsoft 365</td><td>Presione Reintentar. Si sigue, vea <a href="#ayuda/contingencia">Si algo falla</a></td></tr>
</tbody></table>` },

  // ===================================================================
  // COTIZACIONES
  // ===================================================================
  { id: 'cot-crear', cat: 'cotizaciones', titulo: 'Crear una cotización', resumen: 'Cliente, datos de la propuesta, productos, condiciones y PDF en una sola pantalla.',
    claves: 'nueva cotizacion propuesta oferta cotizar cliente crear hacer armar',
    html: `
<p>Menú › <b>Nueva cotización</b>. Todo se arma en una sola pantalla, de arriba hacia abajo.</p>
<ol class="pasos">
<li><b>Cliente</b>: escriba el nombre, NIT o código y elija la empresa. Escoja la sede y el contacto (Att.). Si la empresa no existe, créela primero en <a href="#ayuda/emp-crear">Empresas y contactos</a>.</li>
<li><b>Datos de la propuesta</b>: la fecha y la validez se calculan solas en días hábiles (sin sábados, domingos ni festivos). Elija la moneda, la <b>línea de negocio</b> (define las condiciones que vienen marcadas) y el título. La introducción se propone según si el cliente es nuevo o recurrente; puede ajustarla.</li>
<li><b>Productos</b>: en la última fila de la tabla escriba el código o el nombre y elija el producto. Ajuste cantidad, descuento % y ciudad o sede. Repita para cada producto. <a href="#ayuda/cot-productos">Más sobre productos y descuentos</a>.</li>
<li><b>Condiciones</b>: las de la línea de negocio vienen marcadas; marque o desmarque las que apliquen.</li>
<li><b>Notas internas</b>: solo para IC. No salen en el PDF.</li>
<li>En la barra de abajo: <b class="bt">Vista previa</b> para revisar, <b class="bt">Guardar borrador</b> para seguir después, o <b class="bt">Guardar y generar PDF</b>.</li>
</ol>
<div class="tip">La barra de abajo siempre muestra el total. Si algo falta (por ejemplo, un precio en 0), la app se lo dice al guardar e indica la línea.</div>` },

  { id: 'cot-productos', cat: 'cotizaciones', titulo: 'Productos, precios y descuentos en la cotización', resumen: 'El precio viene del catálogo; cuándo se escribe a mano; descuentos y orden de las líneas.',
    claves: 'precio descuento linea producto viaticos cantidad orden subir bajar quitar descripcion editable tope trm dolares',
    html: `
<ul>
<li><b>El precio viene del catálogo</b> y no se cambia en la cotización. Solo se escribe a mano cuando en el catálogo está en 0 (por ejemplo, viáticos).</li>
<li><b>Descuento %</b> por línea. Si supera el tope de Parámetros, se permite, pero la cotización queda marcada <b>«Descuento sobre el tope»</b>.</li>
<li><b>Descripción</b>: se puede editar solo en los productos marcados como editables (servicios, viáticos). Úsela para precisar fechas, ciudad o alcance.</li>
<li><b>Orden</b>: con ▲ y ▼ sube o baja una línea; con ✕ la quita.</li>
<li><b>Ciudad o sede</b>: se llena con la sede elegida; puede cambiarla en cada línea.</li>
<li><b>Otra moneda</b>: si un producto tiene precio en dólares y la cotización es en pesos (o al revés), la app pide la <b>TRM de referencia</b> y convierte.</li>
</ul>
<div class="ojo">Si un precio del catálogo está mal, no lo corrija en la cotización: pida al administrador que registre el precio correcto en Productos.</div>` },

  { id: 'cot-borrador', cat: 'cotizaciones', titulo: 'Guardar borrador y vista previa', resumen: 'Dejar una cotización a medias y revisar el PDF sin guardar nada.',
    claves: 'borrador guardar despues continuar vista previa revisar ver pdf antes',
    html: `
<ul>
<li><b class="bt">Guardar borrador</b>: guarda todo y le asigna su número. Queda en Cotizaciones con estado <b>Borrador</b>; la retoma con <b class="bt">Editar</b>.</li>
<li><b class="bt">Vista previa</b>: abre el PDF tal como saldría, con la marca <b>VISTA PREVIA</b>, sin guardar nada. Está en la barra de abajo mientras edita y en la ficha de un borrador.</li>
</ul>
<div class="tip">Si el navegador no abre la vista previa, revise que no esté bloqueando ventanas emergentes para la app.</div>` },

  { id: 'cot-pdf', cat: 'cotizaciones', titulo: 'Generar el PDF y dónde queda', resumen: 'El PDF se archiva solo en el sitio documental Ideas Control.',
    claves: 'pdf generar archivar sharepoint carpeta donde queda descargar abrir enviar cliente',
    html: `
<p>Con <b class="bt">Guardar y generar PDF</b> (o <b class="bt">Generar PDF</b> en la ficha de un borrador) la app arma el PDF y lo guarda en el sitio documental <b>Ideas Control</b>. La cotización pasa a <b>Lista para enviar</b>.</p>
<ul>
<li><b>Cliente</b>: 01_Clientes › [código] [razón social] › Cotizaciones › [número].pdf</li>
<li><b>Prospecto</b>: 02_Comercial › 01_PROSPECTOS › [NIT] [razón social] › [número].pdf</li>
</ul>
<p>Desde la ficha: <b class="bt">Abrir PDF en SharePoint</b> o <b class="bt">Descargar PDF</b> para adjuntarlo al correo. Después de enviarlo, use <b class="bt">Marcar como enviada</b>.</p>
<div class="ojo">Si la app no puede guardar en SharePoint (por ejemplo, por permisos), descarga el PDF en su equipo y la cotización sigue en borrador hasta que se pueda archivar. Avise al administrador.</div>` },

  { id: 'cot-estados', cat: 'cotizaciones', titulo: 'Estados de una cotización', resumen: 'Qué significa cada estado y qué se puede hacer en cada uno.',
    claves: 'estado borrador lista enviada negociacion ganada perdida vencida reemplazada anulada',
    html: `
<table class="ic-ayuda-tabla"><thead><tr><th>Estado</th><th>Qué significa</th><th>Qué se puede hacer</th></tr></thead><tbody>
<tr><td><span class="ic-tag e-borrador">Borrador</span></td><td>En preparación</td><td>Editar, Vista previa, Generar PDF, Anular</td></tr>
<tr><td><span class="ic-tag e-lista">Lista para enviar</span></td><td>PDF generado y archivado</td><td>Editar (mismo número), Descargar, Marcar como enviada, Ganada, Perdida, Anular</td></tr>
<tr><td><span class="ic-tag e-enviada">Enviada</span></td><td>El cliente ya la tiene</td><td>Editar (nueva revisión), En negociación, Ganada, Perdida, Anular</td></tr>
<tr><td><span class="ic-tag e-negociacion">En negociación</span></td><td>El cliente pidió ajustes o está decidiendo</td><td>Editar (nueva revisión), Ganada, Perdida, Anular</td></tr>
<tr><td><span class="ic-tag e-vencida">Vencida</span></td><td>Pasó la fecha de validez sin cierre (se marca sola)</td><td>Editar, Ganada, Perdida</td></tr>
<tr><td><span class="ic-tag e-ganada">Ganada</span></td><td>El cliente aceptó. Si era prospecto, pasa a Cliente</td><td>Consultar</td></tr>
<tr><td><span class="ic-tag e-perdida">Perdida</span></td><td>Se registró el motivo y el comentario</td><td>Nueva revisión (si el cliente la retoma)</td></tr>
<tr><td><span class="ic-tag e-cerrada">Reemplazada</span></td><td>Tiene una revisión más nueva</td><td>Consultar</td></tr>
<tr><td><span class="ic-tag e-cerrada">Anulada</span></td><td>Cancelada con motivo</td><td>Consultar</td></tr>
</tbody></table>
<p>Solo el comercial que la creó o un administrador pueden editarla o cambiar su estado. Todos pueden consultarla.</p>` },

  { id: 'cot-editar', cat: 'cotizaciones', titulo: 'Editar una cotización que ya tiene PDF', resumen: 'Si no la ha enviado se corrige con el mismo número; si ya la envió, se hace una revisión.',
    claves: 'editar corregir cambiar modificar cotizacion pdf error equivoque revision',
    html: `
<p>Use el botón <b class="bt">Editar</b> de la ficha. Lo que pasa depende de si el cliente ya la recibió:</p>
<ul>
<li><b>Aún no la marcó como enviada</b> (Lista para enviar): vuelve a <b>Borrador</b> con el <b>mismo número</b> y la fecha de hoy. Al generar el PDF otra vez, reemplaza al anterior en SharePoint.</li>
<li><b>Ya la envió o está en negociación</b>: el botón dice <b class="bt">Editar (nueva revisión)</b>. Como el cliente ya tiene ese número, la app crea la revisión <b>-R1</b> (luego -R2…) y la anterior queda como Reemplazada. <a href="#ayuda/cot-revision">Más sobre revisiones</a>.</li>
<li><b>Ganada, perdida o anulada</b>: no se editan.</li>
</ul>
<div class="tip">Por eso conviene marcar <b>Enviada</b> justo después de mandar el PDF: así la app sabe que el cliente ya tiene ese número.</div>` },

  { id: 'cot-revision', cat: 'cotizaciones', titulo: 'Revisiones (-R1, -R2…)', resumen: 'Qué copia una revisión y qué pasa con la versión anterior.',
    claves: 'revision r1 r2 nueva version cambio cliente pidio ajuste',
    html: `
<p>Una revisión es una cotización nueva con el <b>mismo número</b> y el sufijo -R1, -R2…</p>
<ul>
<li>Copia el cliente, las líneas y las condiciones, pero toma los <b>precios y parámetros vigentes hoy</b> (vigencia, datos bancarios, IVA).</li>
<li>Se abre en edición para que haga los cambios.</li>
<li>La versión anterior queda como <b>Reemplazada</b>, se conserva y se ve en la ficha («Otras versiones»).</li>
<li>En el tablero cuenta solo la última versión.</li>
</ul>` },

  { id: 'cot-seguimiento', cat: 'cotizaciones', titulo: 'Marcar enviada, en negociación o ganada', resumen: 'Cómo avanzar una cotización y qué pasa al ganarla.',
    claves: 'enviada negociacion ganada aprobada orden de compra oc cliente acepto cerrar',
    html: `
<ol class="pasos">
<li>Después de mandar el PDF al cliente: <b class="bt">Marcar como enviada</b>.</li>
<li>Si el cliente pide ajustes o está decidiendo: <b class="bt">En negociación</b>.</li>
<li>Si acepta: <b class="bt">Ganada</b>. Si la empresa era prospecto, pasa a <b>Cliente</b> y recibe su código de cliente.</li>
</ol>
<p>Si no la acepta, vea <a href="#ayuda/cot-perdida">Marcar como perdida</a>.</p>
<div class="tip">El tablero le recuerda las cotizaciones enviadas sin respuesta. Vea <a href="#ayuda/tab-seguimiento">Seguimiento pendiente</a>.</div>` },

  { id: 'cot-perdida', cat: 'cotizaciones', titulo: 'Marcar como perdida', resumen: 'Elegir el motivo y escribir un comentario útil.',
    claves: 'perdida perdi motivo comentario competencia precio no compro rechazo',
    html: `
<ol class="pasos">
<li>En la ficha, presione <b class="bt">Perdida</b>.</li>
<li>Elija el <b>motivo</b> de la lista.</li>
<li>Escriba un <b>comentario</b>: qué pasó, a quién le compraron y a qué precio, cuándo volver a llamar. Algunos motivos (como «Otro» o «Eligió a la competencia») lo exigen.</li>
<li>Presione <b class="bt">Marcar perdida</b>.</li>
</ol>
<p>Los motivos y comentarios alimentan el reporte <b>Motivos de pérdida</b> del tablero.</p>
<div class="tip">Si el cliente la retoma después, use <b class="bt">Nueva revisión</b> en la ficha de la perdida.</div>` },

  { id: 'cot-anular', cat: 'cotizaciones', titulo: 'Anular una cotización', resumen: 'Para cotizaciones hechas por error; no es lo mismo que perdida.',
    claves: 'anular borrar eliminar cancelar error duplicada',
    html: `
<p>Use <b class="bt">Anular</b> solo si la cotización se hizo por error (duplicada, cliente equivocado). Si el cliente no compró, márquela como <a href="#ayuda/cot-perdida">perdida</a>.</p>
<ul>
<li>Se pide el motivo.</li>
<li>Una anulada no se puede reactivar y su número no se vuelve a usar.</li>
<li>Las anuladas no cuentan en el tablero.</li>
</ul>` },

  { id: 'cot-excel', cat: 'cotizaciones', titulo: 'Exportar una cotización a Excel', resumen: 'Una copia de trabajo con fórmulas para ajustar.',
    claves: 'excel exportar xlsx copia trabajar formulas',
    html: `
<p>En la ficha, <b class="bt">Exportar a Excel</b> descarga la cotización con el logo, las líneas, fórmulas de totales y las condiciones.</p>
<div class="ojo">Es una <b>copia de trabajo</b>: lo que cambie en Excel no vuelve a la app. La cotización oficial es el PDF archivado. Si cambia precios o productos, hágalo en la app (editar o revisión).</div>` },

  { id: 'cot-lista', cat: 'cotizaciones', titulo: 'Lista de cotizaciones', resumen: 'Buscar, filtrar y ver los indicadores de las cotizaciones.',
    claves: 'lista buscar filtrar cotizaciones abiertas año comercial',
    html: `
<ul>
<li>Por defecto muestra las <b>abiertas</b>. Filtre por estado, comercial y año, o busque por número o cliente.</li>
<li>Arriba ve cuántas hay abiertas, su valor, las ganadas y la tasa de cierre.</li>
<li>Haga clic en una fila para abrir la ficha.</li>
</ul>
<p>Para el análisis completo use el <a href="#ayuda/tab-leer">Tablero comercial</a>.</p>` },

  { id: 'cot-ficha', cat: 'cotizaciones', titulo: 'La ficha de la cotización', resumen: 'Botones de acción, productos, cliente, seguimiento y condiciones.',
    claves: 'ficha detalle botones acciones cotizacion ver',
    html: `
<p>Arriba están el estado, el número, el cliente y el total con IVA, y los <b>botones de acción</b>. Solo aparecen los que aplican al estado actual (vea <a href="#ayuda/cot-estados">Estados</a>).</p>
<ul>
<li><b>Productos y servicios</b>: las líneas tal como quedaron guardadas.</li>
<li><b>Cliente</b>: los datos copiados al momento de cotizar.</li>
<li><b>Seguimiento</b>: fechas de envío y cierre, motivo y comentario de pérdida, línea de negocio, otras versiones y notas internas.</li>
<li><b>Introducción y condiciones</b>: el texto exacto que sale en el PDF.</li>
</ul>
<p>Acciones frecuentes: <a href="#ayuda/cot-editar">Editar</a> · <a href="#ayuda/cot-seguimiento">Marcar enviada o ganada</a> · <a href="#ayuda/cot-perdida">Perdida</a> · <a href="#ayuda/cot-excel">Exportar a Excel</a>.</p>` },

  { id: 'cot-numero', cat: 'cotizaciones', titulo: 'Número de la cotización', resumen: 'Iniciales + año + consecutivo único de IC.',
    claves: 'numero consecutivo iniciales codigo cotizacion',
    html: `
<p>El número es <b>INICIALES + AÑO + consecutivo</b>, por ejemplo <b>MEM20260100</b>.</p>
<ul>
<li>El consecutivo es <b>uno solo para toda IC</b>.</li>
<li>Se asigna al guardar por primera vez (también en borrador) y nunca se reutiliza, ni siquiera si se anula.</li>
<li>Las revisiones agregan -R1, -R2…</li>
</ul>` },

  { id: 'cot-condiciones', cat: 'cotizaciones', titulo: 'Condiciones comerciales en la cotización', resumen: 'Por qué vienen marcadas y de dónde salen la vigencia, la garantía y los datos bancarios.',
    claves: 'condiciones pago garantia soporte generales vigencia datos bancarios',
    html: `
<ul>
<li>Las condiciones predeterminadas de la <b>línea de negocio</b> vienen marcadas. Marque o desmarque las que apliquen.</li>
<li>La vigencia, los datos bancarios, el IVA y la garantía de cada producto se llenan solos con los valores actuales.</li>
<li>Al guardar, el texto queda fijo en la cotización: si después cambia un parámetro, las cotizaciones anteriores no cambian.</li>
<li>Los textos los mantiene el administrador en Administración › Condiciones comerciales.</li>
</ul>` },

  // ===================================================================
  // INTERACCIONES Y PENDIENTES
  // ===================================================================
  { id: 'int-registrar', cat: 'gestion', titulo: 'Registrar una interacción', resumen: 'Anotar una llamada, correo, WhatsApp, Teams o visita y agendar el siguiente paso.',
    claves: 'registrar llamada correo whatsapp chat visita teams interaccion actividad gestion contacto seguimiento anotar',
    html: `
<p>Use <b class="bt">+ Registrar interacción</b> en la ficha de la empresa, en la ficha de una cotización o en Mis pendientes.</p>
<ol class="pasos">
<li><b>Contacto</b>: elija con quién habló. Debajo aparecen sus enlaces para llamar, escribir por WhatsApp o enviar correo.</li>
<li><b>Canal</b>: llamada, correo, WhatsApp / chat, Teams o visita. <b>Quién inició</b>: nosotros (saliente) o el cliente (entrante).</li>
<li><b>Fecha y hora</b>: viene con la hora actual; cámbiela si registra algo que pasó antes. En llamadas, Teams y visitas puede anotar la <b>duración</b>.</li>
<li><b>¿Logró hablar o tener respuesta?</b> Sí con quien decide, sí con otra persona, o no hubo contacto.</li>
<li><b>Resultado</b> (y detalle si aplica). <a href="#ayuda/int-tipificacion">Cómo elegirlo</a>.</li>
<li><b>Notas</b>: qué se habló, qué pidió, qué se comprometió.</li>
<li><b>Próxima acción</b>: qué hay que hacer, cuándo y quién. Es obligatoria cuando el resultado lo pide (por ejemplo, «Volver a llamar»).</li>
</ol>
<div class="tip">Registre apenas cuelga: toma menos de un minuto y nada se olvida.</div>` },

  { id: 'int-tipificacion', cat: 'gestion', titulo: 'Cómo elegir el resultado', resumen: 'Los tres niveles y qué pasa con cada resultado.',
    claves: 'resultado tipificacion detalle volver a llamar no contesta pide cotizacion final no le interesa',
    html: `
<p>Se elige en tres niveles:</p>
<ol class="pasos">
<li><b>¿Hubo contacto?</b> Según la respuesta, la app muestra los resultados con contacto o sin contacto.</li>
<li><b>Resultado</b>: lo que pasó.</li>
<li><b>Detalle</b> (opcional): solo en algunos resultados, por ejemplo «No le interesa › Sin presupuesto».</li>
</ol>
<table class="ic-ayuda-tabla"><thead><tr><th>Tipo de resultado</th><th>Ejemplos</th><th>Qué pasa</th></tr></thead><tbody>
<tr><td>Sigue el seguimiento</td><td>Interesado, Pide visita, Volver a llamar, Seguimiento a cotización, No contesta, Buzón</td><td>Debe agendar la próxima acción</td></tr>
<tr><td>Pide cotización</td><td>Pide cotización</td><td>Al guardar le ofrece crear la cotización con el cliente cargado; queda enlazada</td></tr>
<tr><td>Cierra el seguimiento</td><td>Aprobó, Ya tiene proveedor, No le interesa, Dato errado</td><td>La próxima acción es opcional</td></tr>
<tr><td>No volver a contactar</td><td>No volver a contactar</td><td>Marca al contacto y cancela sus pendientes. <a href="#ayuda/int-nocontactar">Ver más</a></td></tr>
</tbody></table>
<p>La lista la mantiene el administrador en Administración › Tipificaciones.</p>` },

  { id: 'int-agenda', cat: 'gestion', titulo: 'Mis pendientes', resumen: 'La agenda del día: registrar el resultado, reprogramar o cancelar.',
    claves: 'agenda pendientes tareas hoy vencidos recordatorio reprogramar cancelar seguimiento',
    html: `
<p>Menú › <b>Mis pendientes</b>. Muestra las próximas acciones que usted agendó (o que le asignaron), en cuatro pestañas: <b>Vencidos</b>, <b>Hoy</b>, <b>Próximos 7 días</b> y <b>Más adelante</b>. La tarjeta del menú muestra en rojo cuántos tiene para hoy o vencidos.</p>
<p>Cada pendiente trae la empresa, el contacto con sus enlaces para llamar o escribir, y lo que pasó la última vez.</p>
<ul>
<li><b class="bt">Registrar resultado</b>: cuando ya lo hizo. Registra la nueva interacción y el pendiente queda <b>hecho</b>.</li>
<li><b class="bt">Reprogramar</b>: cambia la fecha (queda anotado en las notas).</li>
<li><b class="bt">Cancelar</b>: si ya no aplica; pide el motivo.</li>
</ul>
<p>El administrador puede ver la agenda de cada comercial o de todo el equipo.</p>
<div class="tip">Empiece el día por la pestaña Vencidos. El tablero mide qué tanto de la agenda se cumple a tiempo.</div>` },

  { id: 'int-linea', cat: 'gestion', titulo: 'La actividad de una empresa', resumen: 'Línea de tiempo con interacciones y cotizaciones en la ficha de la empresa.',
    claves: 'actividad historial linea de tiempo empresa ficha historia cliente',
    html: `
<p>En la ficha de cada empresa, el bloque <b>Actividad</b> muestra todo lo que ha pasado con ella, del más reciente al más antiguo:</p>
<ul>
<li>Los <b>pendientes</b> abiertos arriba, con el botón para registrar el resultado.</li>
<li>Cada <b>interacción</b>: canal, contacto, quién la hizo, resultado, notas y su próxima acción.</li>
<li>Las <b>cotizaciones</b>: creada, enviada, ganada o perdida.</li>
</ul>
<p>Filtre con <b>Todo</b>, <b>Interacciones</b> o <b>Cotizaciones</b>. En la ficha de una cotización también aparecen las interacciones registradas para ella.</p>` },

  { id: 'int-nocontactar', cat: 'gestion', titulo: 'No volver a contactar', resumen: 'Qué pasa cuando un contacto pide no ser llamado.',
    claves: 'no contactar no llamar habeas datos bloqueo exclusion',
    html: `
<p>Si una persona pide no ser contactada, registre la interacción con el resultado <b>No volver a contactar</b> y escriba en las notas lo que dijo.</p>
<ul>
<li>El contacto queda marcado con la etiqueta <span class="ic-tag e-perdida">No contactar</span> en la ficha de la empresa.</li>
<li>Sus pendientes abiertos se cancelan.</li>
<li>Al elegirlo de nuevo en una interacción, la app avisa. Registre solo si fue esa persona quien se comunicó.</li>
</ul>
<div class="ojo">Respete esta decisión: hace parte de la protección de datos personales.</div>` },

  // ===================================================================
  // TABLERO
  // ===================================================================
  { id: 'tab-leer', cat: 'tablero', titulo: 'Leer el tablero comercial', resumen: 'Indicadores, embudo, motivos de pérdida y resumen por comercial.',
    claves: 'tablero reportes indicadores dashboard como vamos ventas metas embudo',
    html: `
<p>Menú › <b>Tablero comercial</b>. Cada comercial ve solo lo suyo; el administrador ve todo el equipo.</p>
<p><b>Filtros</b>: periodo (este mes, mes anterior, últimos 3 meses, este año u otro rango), comercial (solo administradores) y línea de negocio.</p>
<table class="ic-ayuda-tabla"><thead><tr><th>Indicador</th><th>Qué es</th></tr></thead><tbody>
<tr><td>Cotizado</td><td>Valor de las cotizaciones con PDF del periodo</td></tr>
<tr><td>Ganado</td><td>Valor de las ganadas en el periodo (por fecha de cierre)</td></tr>
<tr><td>Tasa de cierre</td><td>Ganadas ÷ (ganadas + perdidas)</td></tr>
<tr><td>Abierto hoy</td><td>Lo que está en curso hoy: listas, enviadas y en negociación</td></tr>
<tr><td>Ticket promedio</td><td>Valor promedio de las ganadas</td></tr>
<tr><td>Tiempo de cierre</td><td>Días promedio del envío a ganada</td></tr>
</tbody></table>
<ul>
<li><b>Embudo</b>: en qué estado están hoy las cotizaciones del periodo.</li>
<li><b>Motivos de pérdida</b>: cuántas y cuánto se perdió por cada motivo. <b>Ver comentarios</b> muestra lo que escribió cada comercial.</li>
<li><b>Comerciales</b>: el resumen de cada uno.</li>
</ul>
<p><b class="bt">Exportar a Excel</b> descarga todo, con una hoja por reporte. Vea también <a href="#ayuda/tab-calculo">Cómo se calcula</a>.</p>` },

  { id: 'tab-seguimiento', cat: 'tablero', titulo: 'Seguimiento pendiente', resumen: 'Su lista de tareas de hoy: sin respuesta, vencen pronto, vencidas, sin enviar y borradores.',
    claves: 'seguimiento pendientes llamar cliente sin respuesta vencen vencidas recordatorio tareas',
    html: `
<p>En el tablero, el bloque <b>Seguimiento pendiente · hoy</b> muestra lo que requiere acción. No depende del periodo elegido.</p>
<table class="ic-ayuda-tabla"><thead><tr><th>Pestaña</th><th>Qué muestra</th><th>Qué hacer</th></tr></thead><tbody>
<tr><td>Sin respuesta</td><td>Enviadas o en negociación con 5 o más días hábiles desde el envío</td><td>Llamar o escribir al cliente</td></tr>
<tr><td>Vencen pronto</td><td>Abiertas que vencen en 3 días hábiles o menos</td><td>Insistir antes de que venza</td></tr>
<tr><td>Vencidas</td><td>Pasó la fecha de validez sin cierre</td><td>Marcarla ganada o perdida, o hacer una revisión</td></tr>
<tr><td>Listas sin enviar</td><td>Tienen PDF pero no se marcaron como enviadas</td><td>Enviar y marcar como enviada</td></tr>
<tr><td>Borradores</td><td>Cotizaciones sin terminar</td><td>Terminarlas o anularlas</td></tr>
</tbody></table>
<p>Haga clic en una fila para abrir la cotización. Los días (5 y 3) los ajusta el administrador en Parámetros.</p>
<div class="tip">Revíselo cada mañana: es la forma más rápida de que ninguna cotización se quede sin seguimiento.</div>` },

  { id: 'tab-actividad', cat: 'tablero', titulo: 'Actividad comercial en el tablero', resumen: 'Interacciones por canal y comercial, contacto logrado y cumplimiento de la agenda.',
    claves: 'actividad llamadas por dia productividad agenda cumplimiento contacto logrado',
    html: `
<p>El bloque <b>Actividad comercial</b> del tablero usa el mismo periodo y comercial elegidos arriba.</p>
<ul>
<li><b>Interacciones</b>: cuántas se registraron, por canal y por comercial.</li>
<li><b>Contacto logrado</b>: porcentaje en que sí se habló o hubo respuesta.</li>
<li><b>Agenda a tiempo</b>: de las próximas acciones con fecha en el periodo (hasta hoy), cuántas se hicieron ese día o antes.</li>
<li><b>Vencidos</b>: pendientes con fecha pasada que siguen sin hacer.</li>
</ul>
<p>Exportar a Excel incluye la hoja <b>Actividad</b>.</p>` },

  { id: 'tab-calculo', cat: 'tablero', titulo: 'Cómo se calcula el tablero', resumen: 'Qué cuenta, qué no cuenta y por qué un número puede no cuadrar.',
    claves: 'calculo formula no cuadra numeros iva dolares trm reemplazada',
    html: `
<ul>
<li><b>Cotizado</b>: cotizaciones con PDF cuya fecha cae en el periodo. <b>Ganado y perdido</b>: según la fecha en que se cerraron.</li>
<li>No cuentan borradores, anuladas ni versiones reemplazadas por una revisión (cuenta la última).</li>
<li>Valores <b>antes de IVA</b>.</li>
<li>Las cotizaciones en dólares se pasan a pesos con su TRM. Si no tienen TRM, el tablero lo avisa y no las suma.</li>
<li>Se usan los valores guardados en cada cotización: si cambia un precio, los meses anteriores no cambian.</li>
<li>El filtro por línea de negocio incluye solo cotizaciones guardadas desde la versión 0.3.0.</li>
</ul>` },

  // ===================================================================
  // EMPRESAS
  // ===================================================================
  { id: 'emp-buscar', cat: 'empresas', titulo: 'Buscar una empresa', resumen: 'Por nombre, NIT, ciudad, contacto o teléfono.',
    claves: 'buscar empresa cliente prospecto nit filtro lista',
    html: `
<ul>
<li>Escriba en el buscador parte del nombre, el NIT, la ciudad, un contacto o un teléfono. La lista se filtra mientras escribe.</li>
<li>Use los filtros de Tipo (prospecto o cliente), Estado (activas o inactivas) y Comercial asignado.</li>
<li>Haga clic en una empresa para abrir su ficha.</li>
</ul>` },

  { id: 'emp-crear', cat: 'empresas', titulo: 'Crear una empresa', resumen: 'NIT sin dígito de verificación, datos obligatorios y relación nuevo/recurrente.',
    claves: 'crear empresa nueva cliente prospecto registrar nit dv',
    html: `
<ol class="pasos">
<li>En Empresas y contactos, presione <b class="bt">+ Nueva empresa</b>.</li>
<li>Elija el tipo de identificación y escriba el número <b>sin puntos, guiones ni dígito de verificación</b>. Para NIT, la app calcula el DV.</li>
<li>Escriba la razón social, el país, la ciudad y el teléfono (obligatorios).</li>
<li>En Gestión comercial elija la <b>Relación</b> (Nuevo o Recurrente: define el saludo del PDF) y el comercial asignado.</li>
<li>Presione <b class="bt">Crear empresa</b>.</li>
</ol>
<p>Toda empresa nueva entra como <b>Prospecto</b> y pasa a <b>Cliente</b> al ganar una cotización. La app no deja crear dos empresas con el mismo NIT.</p>
<p>Después agregue sus sedes y contactos: <a href="#ayuda/emp-ficha">La ficha de la empresa</a>.</p>` },

  { id: 'emp-ficha', cat: 'empresas', titulo: 'La ficha de la empresa: sedes y contactos', resumen: 'Agregar sedes y personas de contacto; autorización de datos.',
    claves: 'sede sucursal contacto persona telefono correo cumpleaños autorizacion datos editar desactivar',
    html: `
<ul>
<li><b>Datos generales</b>: todos los datos y quién la creó y modificó. Botón <b class="bt">Editar</b>.</li>
<li><b>Sedes</b>: nombre, ciudad, dirección y teléfonos. Cada sede recibe un código NIT-001, NIT-002…</li>
<li><b>Contactos</b>: nombres, apellidos, cargo, área, sede, celular, teléfono con extensión y correo. Registre al menos un medio de contacto.</li>
</ul>
<div class="ojo">Marque la autorización de tratamiento de datos (Ley 1581 de 2012) solo si el contacto la dio. El cumpleaños solo se guarda con esa autorización.</div>
<p>Nada se borra: sedes y contactos se desactivan y reactivan, y así las cotizaciones anteriores conservan sus datos.</p>` },

  // ===================================================================
  // PRODUCTOS
  // ===================================================================
  { id: 'prd-catalogo', cat: 'productos', titulo: 'Consultar el catálogo', resumen: 'Buscar productos, ver precio vigente e inventario.',
    claves: 'catalogo producto buscar precio inventario stock existencias',
    html: `
<ul>
<li>Busque por código, nombre, categoría o código anterior; filtre por tipo y estado.</li>
<li>La columna <b>Inventario</b> muestra la cantidad del último corte. En rojo: por debajo del mínimo. «No aplica»: no maneja inventario.</li>
<li>Los precios son <b>antes de IVA</b>.</li>
</ul>` },

  { id: 'prd-ficha', cat: 'productos', titulo: 'La ficha del producto', resumen: 'Foto, cómo sale en la cotización, historial de precios e inventario.',
    claves: 'ficha producto foto historial precios inventario compras margen',
    html: `
<ul>
<li><b>Encabezado</b>: foto, tipo, nombre, código y precio vigente con su fecha.</li>
<li><b>Así se verá en la cotización</b>: la línea tal como sale en el PDF.</li>
<li><b>Datos del producto</b>: unidad, inventario, IVA, garantía y stock mínimo.</li>
<li><b>Historial de precios</b> e <b>Inventario</b> por cortes.</li>
<li><b>Compras a distribuidores</b> y margen: solo administradores.</li>
</ul>` },

  { id: 'prd-crear', cat: 'productos', admin: true, titulo: 'Crear o editar un producto', resumen: 'Código, descripción, ficha técnica y condiciones.',
    claves: 'crear producto nuevo codigo servicio viaticos licencia ficha tecnica garantia',
    html: `
<ul>
<li><b>Código</b>: la referencia del fabricante tal cual, o un código propio con prefijo: SRV- servicios, VIA- viáticos, LIC- licencias, ACC- accesorios. No se puede repetir.</li>
<li><b>Nombre, tipo y descripción corta</b> son obligatorios. La descripción corta es la primera línea del PDF.</li>
<li><b>Ficha técnica</b>: una característica por línea; cada línea sale como viñeta.</li>
<li><b>Condiciones</b>: unidad, inventario, IVA, descripción editable al cotizar, garantía en meses y stock mínimo. Licencias, servicios y viáticos nunca manejan inventario.</li>
<li>Al crear: precio de venta inicial, moneda y fecha de vigencia.</li>
</ul>
<div class="tip">La garantía en meses de cada producto es la que aparece sola en la condición de Garantía de la cotización.</div>` },

  { id: 'prd-precio', cat: 'productos', admin: true, titulo: 'Cambiar un precio, registrar inventario o una compra', resumen: 'Historial de precios, cortes de los días 1 y 15 y margen.',
    claves: 'cambiar precio nuevo precio inventario corte compra distribuidor costo margen',
    html: `
<ul>
<li><b>Cambiar un precio</b>: <b class="bt">+ Nuevo precio</b> en la ficha. El anterior se cierra solo y queda en el historial. Las cotizaciones hechas conservan su precio.</li>
<li><b>Inventario</b>: <b class="bt">+ Registrar corte</b> los días 01 y 15 de cada mes.</li>
<li><b>Compra</b>: <b class="bt">+ Registrar compra</b>, elija el distribuidor (o cree uno), precio, moneda y fecha. La ficha muestra el margen.</li>
</ul>` },

  { id: 'prd-fotos', cat: 'productos', admin: true, titulo: 'Fotos de los productos', resumen: 'Una a una o varias a la vez; cómo nombrar los archivos.',
    claves: 'foto imagen subir cargar nombre archivo webp',
    html: `
<ul>
<li>Una foto principal por producto. JPG, PNG o WebP; la app la reduce y la guarda en WebP.</li>
<li><b>Una a una</b>: en la ficha, <b class="bt">Subir foto</b>.</li>
<li><b>Varias</b>: en el catálogo, <b class="bt">Cargar fotos</b>. Cada archivo se llama como el código, con espacios y «/» cambiados por guion. Ej.: AC-2100 PLUS RF/SC → AC-2100-PLUS-RF-SC.jpg</li>
<li>Antes de subir, la app muestra cuáles coinciden con un producto y cuáles no.</li>
</ul>` },

  // ===================================================================
  // CARGA MASIVA
  // ===================================================================
  { id: 'carga-pasos', cat: 'carga', admin: true, titulo: 'Carga masiva paso a paso', resumen: 'Descargar plantilla, llenarla, validar e importar.',
    claves: 'carga masiva excel plantilla importar subir muchos',
    html: `
<ol class="pasos">
<li>Elija la opción (Empresas o Productos) y presione <b class="bt">Descargar plantilla</b>.</li>
<li>Llénela. Borre las filas de ejemplo (fondo amarillo) y no cambie encabezados ni nombres de hojas.</li>
<li><b class="bt">Seleccionar archivo .xlsx</b> (máximo 4 MB). La app valida cada fila sin guardar nada.</li>
<li>Revise: <b>verde</b> se crea, <b>amarillo</b> se actualiza, <b>gris</b> sin cambios, <b>rojo</b> error (la columna Detalle dice por qué).</li>
<li>Si hay errores, <b class="bt">Descargar filas con error</b>, corrija y súbalas después.</li>
<li><b class="bt">Importar</b> y confirme.</li>
</ol>
<ul>
<li>Una celda vacía no borra el dato que ya existe.</li>
<li>Si la importación se interrumpe, vuelva a subir el mismo archivo: lo ya cargado sale como «Sin cambios».</li>
</ul>` },

  // ===================================================================
  // ADMINISTRACIÓN
  // ===================================================================
  { id: 'adm-resumen', cat: 'admin', admin: true, titulo: 'Secciones de Administración', resumen: 'Qué se configura en cada una de las 10 secciones.',
    claves: 'administracion configuracion secciones admin',
    html: `
<table class="ic-ayuda-tabla"><thead><tr><th>Sección</th><th>Para qué sirve</th></tr></thead><tbody>
<tr><td><a href="#ayuda/adm-usuarios">Usuarios</a></td><td>Crear y editar comerciales, iniciales, rol y estado</td></tr>
<tr><td><a href="#ayuda/adm-condiciones">Condiciones comerciales</a></td><td>Textos de pago, garantía, soporte y generales</td></tr>
<tr><td><a href="#ayuda/adm-parametros">Parámetros</a></td><td>IVA, descuento máximo, vigencia, días de alerta y textos del PDF</td></tr>
<tr><td><a href="#ayuda/adm-motivos">Motivos de pérdida</a></td><td>Opciones al marcar una cotización como perdida</td></tr>
<tr><td><a href="#ayuda/adm-tipificaciones">Tipificaciones</a></td><td>Resultados al registrar una interacción</td></tr>
<tr><td><a href="#ayuda/adm-delegaciones">Delegaciones</a></td><td>Permisos de administrador por unos días</td></tr>
<tr><td><a href="#ayuda/adm-otras">Distribuidores, festivos, consecutivos y registro</a></td><td>Proveedores, días hábiles, numeración y quién cambió qué</td></tr>
</tbody></table>
<p>Cada cambio queda en el Registro de actividad con el valor anterior y el nuevo.</p>` },

  { id: 'adm-usuarios', cat: 'admin', admin: true, titulo: 'Usuarios: crear un comercial', resumen: 'Dos pasos: en la app y en SharePoint.',
    claves: 'usuario nuevo comercial crear iniciales rol administrador permiso',
    html: `
<ol class="pasos">
<li>En Administración › Usuarios, <b class="bt">+ Nuevo usuario</b> con su correo de Microsoft de IC, nombre, iniciales (2 a 4 letras, únicas: van en el número de la cotización), cargo y celular (salen en la firma del PDF).</li>
<li>En SharePoint, déle acceso como <b>Miembro</b> al sitio IC Apps y como <b>Integrante</b> al sitio Ideas Control (para archivar los PDF).</li>
</ol>
<div class="ojo">Nadie puede quitarse su propio rol de administrador ni desactivarse, y siempre queda al menos un administrador activo.</div>` },

  { id: 'adm-condiciones', cat: 'admin', admin: true, titulo: 'Condiciones comerciales y datos automáticos', resumen: 'Cada dato vive en un solo lugar; se inserta con botones.',
    claves: 'condiciones textos datos automaticos vigencia datos bancarios iva garantia predeterminada linea negocio',
    html: `
<ul>
<li>Cada condición tiene tipo (pago, garantía, soporte, generales), línea de negocio y si es <b>predeterminada</b> (viene marcada en las cotizaciones nuevas).</li>
<li>Los datos que ya existen en la app (vigencia, datos bancarios, IVA, sitio web, fecha de vencimiento, garantía de los productos) se insertan con los botones <b class="bt">+ Vigencia</b>, <b class="bt">+ Datos bancarios</b>… y aparecen como recuadros de color.</li>
<li>Si alguien escribe a mano uno de esos datos, la app no deja guardar y ofrece <b class="bt">Usar datos automáticos</b>.</li>
<li>Al crear una cotización, el texto queda fijo con los valores de ese día: si después cambia un dato, las cotizaciones anteriores no cambian.</li>
</ul>` },

  { id: 'adm-parametros', cat: 'admin', admin: true, titulo: 'Parámetros', resumen: 'IVA, descuento máximo, vigencia, alertas, textos del PDF y ubicación de documentos.',
    claves: 'parametros iva descuento tope vigencia alerta seguimiento dias textos pdf sitio documental',
    html: `
<ul>
<li>Los porcentajes se escriben como 19, no 0,19.</li>
<li><b>Vigencia</b>: días hábiles de validez de la cotización.</li>
<li><b>Alerta antes del vencimiento</b> y <b>Seguimiento sin respuesta</b>: los días que usa el tablero.</li>
<li>Antes de guardar se muestra qué cambia. Un parámetro usado en una condición no puede quedar vacío.</li>
<li>Aplican a las cotizaciones nuevas; las emitidas no cambian.</li>
</ul>` },

  { id: 'adm-tipificaciones', cat: 'admin', admin: true, titulo: 'Tipificaciones', resumen: 'Resultados y detalles que se eligen al registrar una interacción.',
    claves: 'tipificaciones resultados detalles interacciones configurar accion',
    html: `
<ul>
<li>El primer nivel (¿hubo contacto?) es fijo.</li>
<li><b class="bt">+ Nuevo resultado</b>: nombre, si se muestra con o sin contacto, orden y <b>qué pasa al elegirlo</b>: exige próxima acción, ofrece crear la cotización, cierra el seguimiento, marca «no volver a contactar» o sin acción.</li>
<li><b>+ detalle</b> en cada resultado agrega opciones del tercer nivel.</li>
<li>No se borran: se desactivan. Las interacciones anteriores conservan su resultado; si cambia un nombre, se ve con el nombre nuevo.</li>
</ul>` },

  { id: 'adm-motivos', cat: 'admin', admin: true, titulo: 'Motivos de pérdida', resumen: 'Crear, ordenar y desactivar motivos; comentario obligatorio.',
    claves: 'motivos perdida opciones comentario obligatorio',
    html: `
<ul>
<li><b class="bt">+ Nuevo motivo</b>: nombre (lo que ve el comercial), orden y aclaración opcional.</li>
<li><b>Pedir comentario obligatorio</b>: actívelo en motivos como «Otro» o «Competencia», para que el comercial explique.</li>
<li>Los motivos no se borran: se desactivan. Las cotizaciones perdidas conservan su motivo.</li>
<li>Si cambia el nombre de un motivo, el tablero lo muestra con el nombre nuevo.</li>
</ul>` },

  { id: 'adm-delegaciones', cat: 'admin', admin: true, titulo: 'Delegaciones', resumen: 'Dar permisos de administrador a un comercial por unos días.',
    claves: 'delegacion vacaciones permiso temporal administrador reemplazo',
    html: `
<ul>
<li>Máximo 90 días, con motivo. No se cruzan dos delegaciones del mismo comercial.</li>
<li>Al vencer, vuelve solo a su rol. Se puede terminar o cancelar antes.</li>
<li>El comercial debe recargar la app (<kbd>F5</kbd>) para ver las opciones de administrador.</li>
</ul>` },

  { id: 'adm-otras', cat: 'admin', admin: true, titulo: 'Distribuidores, festivos, consecutivos y registro', resumen: 'Proveedores, días hábiles, numeración y auditoría.',
    claves: 'distribuidores proveedores festivos dias habiles consecutivos numeracion registro actividad auditoria',
    html: `
<ul>
<li><b>Distribuidores</b>: proveedores, sin nombres ni NIT repetidos. Desactivar no afecta las compras registradas.</li>
<li><b>Festivos</b>: <b class="bt">Cargar festivos de [año]</b> los calcula solos (Semana Santa y Ley Emiliani). Agregue los días que decrete el Gobierno.</li>
<li><b>Consecutivos</b>: en qué número va cada numeración. <b class="bt">Revisar</b> detecta atrasos y <b class="bt">Ajustar</b> los corrige; nunca se baja un número.</li>
<li><b>Registro de actividad</b>: quién cambió qué y cuándo. Nadie lo puede editar.</li>
</ul>` },

  // ===================================================================
  // PROBLEMAS
  // ===================================================================
  { id: 'faq', cat: 'problemas', titulo: 'Preguntas frecuentes', resumen: 'Celular, cambios que no se ven, borrar registros, fotos y más.',
    claves: 'preguntas frecuentes faq problema no veo no aparece celular borrar',
    html: `
<dl class="ic-ayuda-faq">
<dt>¿Puedo usar la app en el celular?</dt><dd>Sí. Funciona en cualquier navegador con internet.</dd>
<dt>Hice un cambio y no lo veo</dt><dd>Presione <kbd>F5</kbd>. Si otra persona cambió el mismo registro al mismo tiempo, la app le avisa y no sobrescribe: recargue y repita.</dd>
<dt>No veo Carga masiva ni Administración</dt><dd>Son solo para administradores. Si necesita el permiso por unos días, pida una delegación.</dd>
<dt>¿Puedo borrar una empresa, un contacto o un producto?</dt><dd>No se borran: se desactivan, para que las cotizaciones anteriores muestren la información correcta.</dd>
<dt>Me equivoqué en una cotización que ya generé</dt><dd>Vea <a href="#ayuda/cot-editar">Editar una cotización que ya tiene PDF</a>.</dd>
<dt>El precio de un producto está mal</dt><dd>Pida al administrador que registre el precio correcto con + Nuevo precio. No se corrige en la cotización.</dd>
<dt>La vista previa no abre</dt><dd>Permita las ventanas emergentes para la app en su navegador.</dd>
<dt>La foto no aparece</dt><dd>El archivo debe llamarse como el código, con guiones. Las fotos tardan unos segundos en cargar.</dd>
<dt>¿Quién cambió este dato?</dt><dd>La ficha muestra quién creó y modificó. Los cambios de configuración están en Administración › Registro de actividad.</dd>
<dt>¿Mis datos quedan en mi computador?</dt><dd>No. Todo queda en el SharePoint de IC.</dd>
</dl>` },

  { id: 'contingencia', cat: 'problemas', titulo: 'Si algo falla', resumen: 'Qué revisar si la app no carga y qué hacer mientras vuelve.',
    claves: 'falla caida no carga error sistema caido contingencia internet microsoft',
    html: `
<ol class="pasos">
<li>Revise su internet: abra otra página. Si no carga, use los datos del celular.</li>
<li>Recargue con <kbd>F5</kbd> o <b class="bt">Reintentar</b>.</li>
<li>Si Outlook o Teams tampoco funcionan, el problema es de Microsoft 365: consulte status.cloud.microsoft y espere.</li>
<li>Si Microsoft funciona y la app no abre, avise al administrador.</li>
</ol>
<p><b>Mientras no esté disponible</b>: anote cliente, productos, cantidades y precios, y regístrelos en la app cuando vuelva. No haga cotizaciones en hojas sueltas sin avisar.</p>
<p>Los datos están a salvo en SharePoint; un dato borrado o dañado se recupera desde el historial de versiones (93 días).</p>
<p><b>Administrador de la app</b>: Martín Molina (MEM).</p>` }
  ]
};
