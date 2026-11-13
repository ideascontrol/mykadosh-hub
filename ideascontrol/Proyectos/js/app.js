/* =====================================================================
   APP-114 · Proyectos — arranque, permisos, portafolio y nuevo proyecto
   Vistas: #  portafolio · #nuevo  crear proyecto · #p/PRY-0001[/pestaña]  proyecto (proyecto.js) · #admin (admin.js)
   ===================================================================== */
const App = { usuario: null, rol: '', proyectos: [], tareasTodas: [], vistas: {}, filtro: { q: '', estado: 'ACTIVOS', salud: '', lider: '' } };

(function () {
  const U = IC.ui, G = IC.graph, esc = U.esc;

  // ---------- Permisos ----------
  App.esAdmin = () => App.rol === 'ADMIN';
  App.puedeCrear = () => App.rol === 'ADMIN' || App.rol === 'EDITOR';
  App.puedeEditar = (p) => App.rol === 'ADMIN' || (App.rol === 'EDITOR' && (!p || String(p.lider_email || '').toLowerCase() === App.usuario.email));
  App.aprobador = () => CFG.aprobadores.find((a) => a.email === App.usuario.email) || null;
  async function resolverRol(email) {
    const acc = await G.items('SYS_Accesos').catch(() => []);
    const a = acc.find((x) => String(x.email || '').toLowerCase() === email && x.app_id === CFG.app.id && x.estado !== 'INACTIVO');
    if (a) return a.rol;
    if (CFG.admins.indexOf(email) >= 0) return 'ADMIN';
    if (CFG.aprobadores.some((x) => x.email === email)) return 'CONSULTA';
    if (PRY.persona(email) && PRY.persona(email).tecnico) return 'TECNICO';
    if (PRY.persona(email)) return 'TECNICO';     // personal de IC: ve los proyectos donde tiene tareas
    return '';
  }
  const nombreRol = (r) => ({ ADMIN: 'Administrador', EDITOR: 'Líder de proyecto', CONSULTA: 'Consulta', TECNICO: 'Responsable de tareas' }[r] || r);

  // ---------- Datos ----------
  App.cargarProyectos = async function () {
    App.proyectos = (await G.items('PRY_Proyectos', { top: 2000 })).map((p) => Object.assign(p, { avance: Number(p.avance) || 0, inicio: PRY.dia(p.inicio), cierre_estimado: PRY.dia(p.cierre_estimado) }));
    if (App.rol === 'TECNICO') {
      const mias = await G.items('PRY_Tareas', { filtro: "fields/responsable_email eq '" + App.usuario.email + "'", top: 2000 });
      const ids = new Set(mias.map((t) => t.proyecto_id));
      App.proyectos = App.proyectos.filter((p) => ids.has(p.Title));
      App.tareasTodas = mias.map(PRY.normal);
    } else {
      App.tareasTodas = (await G.items('PRY_Tareas', { top: 5000 })).map(PRY.normal);
    }
    App.proyectos.sort((a, b) => String(b.Title).localeCompare(a.Title));
  };
  App.proyecto = (id) => App.proyectos.find((p) => p.Title === id) || null;
  App.tagEstado = (e) => '<span class="pry-tag ' + ({ 'Planeación': 'azul', 'En ejecución': 'teal', 'En pausa': 'dorado', 'Cerrado': 'verde', 'Cancelado': 'gris' }[e] || 'gris') + '">' + esc(e || '—') + '</span>';
  App.tagSalud = (s) => '<span class="pry-salud ' + ({ 'Normal': 'ok', 'En riesgo': 'warn', 'Bloqueada': 'err' }[s] || 'ok') + '">' + esc(s || 'Normal') + '</span>';
  App.barra = (v) => '<span class="pry-barra"><i style="width:' + Math.max(0, Math.min(100, v)) + '%"></i></span><small>' + v + ' %</small>';

  // ---------- Encabezado ----------
  function encabezado() {
    const u = App.usuario;
    document.getElementById('encabezado').innerHTML =
      '<a href="#"><img class="logo" src="' + CFG.logo + '" alt="Ideas Control"></a>' +
      '<div class="app-nombre"><b>' + esc(CFG.app.nombre) + '</b><span>' + CFG.app.id + ' · v' + CFG.app.version + '</span></div><div class="espacio"></div>' +
      '<nav class="pry-nav"><a href="#" data-r="">Portafolio</a>' + (App.puedeCrear() ? '<a href="#nuevo" data-r="nuevo">Nuevo proyecto</a>' : '') + (App.esAdmin() ? '<a href="#admin" data-r="admin">Administración</a>' : '') + '<a href="' + CFG.infografia + '" target="_blank" rel="noopener" title="Infografía del proceso (2600-MAN-OPE)">Proceso ↗</a></nav>' +
      '<div class="ic-user">' + IC.portal.boton() + '<div class="datos"><b>' + esc(u.nombre) + '</b><span>' + esc(nombreRol(App.rol)) + '</span></div>' +
      '<div class="ic-avatar" title="' + esc(u.email) + '">' + esc(u.iniciales) + '</div><button class="ic-btn sec chico" id="btnSalir">Salir</button></div>';
    document.getElementById('encabezado').hidden = false;
    document.getElementById('btnSalir').onclick = () => IC.auth.salir();
  }
  const marcarNav = (r) => document.querySelectorAll('.pry-nav a').forEach((a) => a.classList.toggle('on', a.dataset.r === r));

  // =====================================================================
  // PORTAFOLIO
  // =====================================================================
  App.vistas.portafolio = async function (c) {
    const F = App.filtro;
    c.innerHTML = '<div class="ic-barra"><div style="flex:1"><h1 class="ic-titulo">Portafolio de proyectos</h1><p class="ic-subtitulo" style="margin:0">Implementaciones de T&A, TimeVision, biometría, puertas y torniquetes (manual ' + CFG.manual + ').</p></div>' +
      '<a class="ic-btn sec" href="' + CFG.infografia + '" target="_blank" rel="noopener">Ver el proceso (infografía)</a>' + (App.puedeCrear() ? '<a class="ic-btn" href="#nuevo">+ Nuevo proyecto</a>' : '') + '</div><div id="pfK"></div>' +
      '<div class="ic-filtros"><div class="ic-buscar"><input type="search" id="fq" placeholder="Buscar proyecto, cliente, OS…" value="' + esc(F.q) + '"></div>' +
      '<select id="fe"><option value="ACTIVOS">Activos (sin cerrados ni cancelados)</option><option value="">Todos los estados</option>' + CFG.estadosProyecto.map((e) => '<option>' + esc(e) + '</option>').join('') + '</select>' +
      '<select id="fs"><option value="">Toda salud</option>' + CFG.salud.map((e) => '<option>' + esc(e) + '</option>').join('') + '</select>' +
      '<select id="fl"><option value="">Todos los líderes</option></select></div><div id="pfL"><div class="ic-vacio">Cargando…</div></div>';
    c.querySelector('#fe').value = F.estado; c.querySelector('#fs').value = F.salud;
    try { await App.cargarProyectos(); } catch (e) { c.querySelector('#pfL').innerHTML = '<div class="ic-alerta">' + esc(U.mensajeError(e)) + '</div>'; return; }
    const lideres = Array.from(new Set(App.proyectos.map((p) => p.lider).filter(Boolean))).sort();
    c.querySelector('#fl').innerHTML = '<option value="">Todos los líderes</option>' + lideres.map((l) => '<option>' + esc(l) + '</option>').join('');
    c.querySelector('#fl').value = F.lider;
    const venc = {}; App.tareasTodas.forEach((t) => { if (PRY.vencida(t)) venc[t.proyecto_id] = (venc[t.proyecto_id] || 0) + 1; });
    function pintar() {
      const q = U.norm(F.q);
      const L = App.proyectos.filter((p) => (F.estado === 'ACTIVOS' ? ['Cerrado', 'Cancelado'].indexOf(p.estado) < 0 : !F.estado || p.estado === F.estado) &&
        (!F.salud || (p.salud || 'Normal') === F.salud) && (!F.lider || p.lider === F.lider) &&
        (!q || U.norm([p.Title, p.nombre, p.cliente, p.os_numero, p.escenario, p.plantillas].join(' ')).indexOf(q) >= 0));
      const act = App.proyectos.filter((p) => ['Cerrado', 'Cancelado'].indexOf(p.estado) < 0);
      const k = (v, e, cls) => '<div class="ic-kpi pry-kpi ' + (cls || '') + '"><div class="valor">' + v + '</div><div class="etiqueta">' + e + '</div></div>';
      c.querySelector('#pfK').innerHTML = '<div class="ic-kpis">' + k(act.length, 'Proyectos activos') +
        CFG.estadosProyecto.slice(0, 3).map((e) => k(App.proyectos.filter((p) => p.estado === e).length, e)).join('') +
        k(act.filter((p) => p.salud === 'En riesgo').length, 'En riesgo', 'warn') + k(act.filter((p) => p.salud === 'Bloqueada').length, 'Bloqueados', 'err') +
        k(Object.keys(venc).filter((id) => act.some((p) => p.Title === id)).reduce((s, id) => s + venc[id], 0), 'Tareas vencidas', 'err') + '</div>';
      c.querySelector('#pfL').innerHTML = L.length ? '<div class="ic-tabla-caja pry-scroll"><table class="ic-tabla"><thead><tr><th>Proyecto</th><th>Cliente</th><th>Líder</th><th>Componentes</th><th>Avance</th><th>Estado</th><th>Salud</th><th>Inicio</th><th>Cierre estimado</th><th class="num">Vencidas</th></tr></thead><tbody>' +
        L.map((p) => '<tr data-id="' + esc(p.Title) + '"><td><b>' + esc(p.nombre) + '</b><span class="sec">' + esc(p.Title + (p.os_numero ? ' · OS ' + p.os_numero : '')) + '</span></td><td>' + esc(p.cliente) + '</td><td>' + esc(p.lider || '') + '</td>' +
          '<td>' + esc(p.escenario || '') + '<span class="sec">' + esc(p.plantillas || '') + '</span></td><td class="pry-av">' + App.barra(p.avance) + '</td><td>' + App.tagEstado(p.estado) + '</td><td>' + App.tagSalud(p.salud) + '</td>' +
          '<td>' + esc(PRY.textoFecha(p.inicio, true)) + '</td><td>' + esc(PRY.textoFecha(p.cierre_estimado, true)) + '</td><td class="num">' + (venc[p.Title] ? '<b class="err">' + venc[p.Title] + '</b>' : '') + '</td></tr>').join('') + '</tbody></table></div>'
        : '<div class="ic-tabla-caja"><div class="ic-vacio">' + (App.proyectos.length ? 'No hay proyectos con estos filtros.' : App.rol === 'TECNICO' ? 'No tiene tareas asignadas en ningún proyecto.' : 'Aún no hay proyectos. Cree el primero con «+ Nuevo proyecto».') + '</div></div>';
      c.querySelectorAll('tr[data-id]').forEach((tr) => { tr.onclick = () => { location.hash = '#p/' + tr.dataset.id; }; });
    }
    c.querySelector('#fq').oninput = (e) => { F.q = e.target.value; pintar(); };
    c.querySelector('#fe').onchange = (e) => { F.estado = e.target.value; pintar(); };
    c.querySelector('#fs').onchange = (e) => { F.salud = e.target.value; pintar(); };
    c.querySelector('#fl').onchange = (e) => { F.lider = e.target.value; pintar(); };
    pintar();
  };

  // =====================================================================
  // NUEVO PROYECTO
  // =====================================================================
  // Copia las plantillas elegidas en una sola lista de tareas, sin duplicar las tareas comunes
  App.combinar = function (plantillas, registrosPorCodigo) {
    const visto = {}, cambio = {}, tareas = [], unificadas = [];
    plantillas.forEach((pl, ip) => {
      registrosPorCodigo[pl.codigo].forEach((r) => {
        if (r.comun && visto[r.comun] && visto[r.comun].plantilla !== pl.codigo) { cambio[r.id_registro] = visto[r.comun].tarea_id; unificadas.push({ queda: visto[r.comun], sale: r, plantilla: pl.codigo }); return; }
        const t = { tarea_id: r.id_registro, plantilla: pl.codigo, plantilla_version: pl.version, id_padre: r.id_padre || '', fase: r.fase || '', actividad: r.actividad, tipo: r.tipo || 'Tarea',
          descripcion: r.descripcion || '', organizacion: r.organizacion || '', rol: r.rol || '', duracion: r.duracion === '' || r.duracion == null ? null : Number(r.duracion), estimada: r.estimada || 'No',
          predecesoras: r.predecesoras || '', criterio: r.criterio || '', obligatoria: r.obligatoria || 'No', comun: r.comun || '', orden: (ip + 1) * 1000 + (Number(r.orden) || 0),
          aplica: r.aplica !== 'No', condicion: r.condicion || '', estado: 'No iniciada', salud: 'Normal', porcentaje: 0, propia: 'No', visibilidad: 'Compartida' };
        if (r.comun && !visto[r.comun]) visto[r.comun] = t;
        tareas.push(t);
      });
    });
    tareas.forEach((t) => { t.predecesoras = Array.from(new Set(PRY.listaPred(t).map((p) => cambio[p] || p).filter((p) => p !== t.tarea_id))).join(';'); });
    return { tareas, unificadas };
  };

  App.vistas.nuevo = async function (c) {
    if (!App.puedeCrear()) { location.hash = ''; return; }
    c.innerHTML = '<a class="ic-volver" href="#">← Portafolio</a><h1 class="ic-titulo">Nuevo proyecto</h1><div id="nv"><div class="ic-vacio">Cargando clientes y plantillas…</div></div>';
    let emp = [];
    try { [emp] = await Promise.all([PRY.empresas(), PRY.cargarPlantillas()]); } catch (e) { c.querySelector('#nv').innerHTML = '<div class="ic-alerta">' + esc(U.mensajeError(e)) + '</div>'; return; }
    const codigos = Array.from(new Set(PRY.D.plantillas.map((p) => p.codigo))).sort();
    if (!codigos.length) { c.querySelector('#nv').innerHTML = '<div class="ic-alerta">La biblioteca de plantillas está vacía. ' + (App.esAdmin() ? '<a href="#admin">Importe la Biblioteca Maestra</a>.' : 'Pida al administrador que importe la Biblioteca Maestra.') + '</div>'; return; }
    const lider = PRY.D.personas.find((p) => p.email === App.usuario.email);
    c.querySelector('#nv').innerHTML = '<form class="ic-form pry-nuevo" id="fN">' +
      '<fieldset><legend>1. Cliente y datos generales</legend><div class="ic-campos">' +
      '<div class="ic-campo c6"><label for="f_cliente">Cliente <span class="req">*</span></label><input id="f_cliente" name="cliente" list="dlEmp" autocomplete="off" placeholder="Escriba para buscar en la base de Comercial"><datalist id="dlEmp">' +
        emp.map((e) => '<option value="' + esc(e.razon_social) + '">' + esc((e.nit ? 'NIT ' + e.nit : '') + (e.estado_comercial ? ' · ' + e.estado_comercial : '')) + '</option>').join('') + '</datalist>' +
        '<span class="ayuda">Si el cliente no existe, créelo primero en <a href="/ideascontrol/Comercial/" target="_blank">Comercial</a>: aquí no se crean clientes.</span></div>' +
      U.campo({ name: 'nombre', label: 'Nombre del proyecto', req: true, c: 'c6', ph: 'Ej.: Implementación T&A sede principal' }) +
      U.campo({ name: 'os_numero', label: 'N° Orden de Servicio', c: 'c3' }) + U.campo({ name: 'os_fecha', label: 'Fecha de la OS', t: 'date', c: 'c3' }) +
      U.campo({ name: 'inicio', label: 'Fecha de inicio', t: 'date', req: true, valor: PRY.sigHabil(PRY.hoy()), c: 'c3' }) +
      U.campo({ name: 'lider_email', label: 'Líder IC', t: 'select', op: PRY.D.personas.map((p) => [p.email, p.nombre]), valor: lider ? lider.email : '', req: true, c: 'c3' }) +
      '<div class="ic-campo c6"><label for="f_contacto_id">Contacto del cliente</label><select id="f_contacto_id" name="contacto_id"><option value="">Elija primero el cliente</option></select></div>' +
      U.campo({ name: 'carpeta', label: 'Enlace a la carpeta del proyecto (SharePoint)', c: 'c6', ph: 'Ideas Control › 01_Clientes › cliente › 02_Proyectos' }) +
      U.campo({ name: 'descripcion', label: 'Descripción / alcance contratado', t: 'textarea', filas: 2, c: 'c12' }) + '</div></fieldset>' +
      '<fieldset><legend>2. Escenario y plantillas</legend><div class="ic-campos">' +
      U.campo({ name: 'escenario', label: 'Escenario', t: 'select', op: CFG.escenarios.map((e) => [e.id, e.nombre]), req: true, c: 'c6' }) + '</div>' +
      '<div class="pry-pls">' + codigos.map((cod) => { const v = PRY.vigente(cod);
        return '<label class="ic-check pry-pl"><input type="checkbox" name="pl_' + cod + '" data-pl="' + cod + '"> <span><b>' + esc(cod) + '</b> ' + esc(v.nombre) + ' <small>v' + esc(v.version) + ' · ' + esc(v.estado === 'PUBLICADA' ? 'publicada' : 'en validación') + '</small></span></label>'; }).join('') + '</div>' +
      '<p class="pry-nota">TimeVision es el módulo de reportes y análisis de T&A (no WFM). Al combinar plantillas, las tareas comunes (OS, kickoff, responsables, cronograma, acta de inicio, cierre) quedan una sola vez.</p></fieldset>' +
      '<fieldset><legend>3. Tareas que aplican</legend><div id="nvT"><p class="pry-nota">Elija las plantillas para ver sus tareas.</p></div></fieldset>' +
      '<div class="ic-acciones"><span id="nvE" class="pry-nota" style="margin-right:auto"></span><a class="ic-btn sec" href="#">Cancelar</a><button class="ic-btn" id="nvOk">Crear proyecto</button></div></form>';
    const f = c.querySelector('#fN');
    let empresa = null, comb = null, regs = {};
    f.querySelector('#f_cliente').onchange = async (e) => {
      empresa = emp.find((x) => U.norm(x.razon_social) === U.norm(e.target.value)) || null;
      const sel = f.querySelector('#f_contacto_id');
      if (!empresa) { sel.innerHTML = '<option value="">Elija primero el cliente</option>'; return; }
      const cs = await PRY.contactos(empresa.Title);
      sel.innerHTML = '<option value="">' + (cs.length ? 'Seleccione…' : 'El cliente no tiene contactos en Comercial') + '</option>' + cs.map((x) => '<option value="' + esc(x.Title) + '">' + esc([x.nombres, x.apellidos].filter(Boolean).join(' ') + (x.cargo ? ' · ' + x.cargo : '')) + '</option>').join('');
    };
    const marcadas = () => codigos.filter((cod) => f.querySelector('[data-pl="' + cod + '"]').checked);
    f.querySelector('[name=escenario]').onchange = (e) => {
      const esc0 = CFG.escenarios.find((x) => x.id === e.target.value);
      if (esc0 && esc0.plantillas.length) codigos.forEach((cod) => { f.querySelector('[data-pl="' + cod + '"]').checked = esc0.plantillas.indexOf(cod) >= 0; });
      verTareas();
    };
    f.querySelectorAll('[data-pl]').forEach((x) => { x.onchange = verTareas; });
    async function verTareas() {
      const cods = marcadas(), caja = f.querySelector('#nvT');
      if (!cods.length) { comb = null; caja.innerHTML = '<p class="pry-nota">Elija las plantillas para ver sus tareas.</p>'; return; }
      caja.innerHTML = '<div class="ic-vacio">Cargando tareas…</div>';
      const pls = cods.map((cod) => PRY.vigente(cod));
      for (const p of pls) if (!regs[p.Title]) regs[p.Title] = await PRY.registrosDe(p.codigo, p.version);
      const porCod = {}; pls.forEach((p) => { porCod[p.codigo] = regs[p.Title]; });
      comb = App.combinar(pls, porCod);
      const fases = comb.tareas.filter(PRY.esFase);
      caja.innerHTML = (comb.unificadas.length ? '<div class="ic-alerta chica" style="margin-bottom:10px">Tareas comunes unificadas: ' + comb.unificadas.map((u) => esc(u.sale.actividad + ' (' + u.plantilla + ') → ' + u.queda.tarea_id)).join(' · ') + '</div>' : '') +
        '<p class="pry-nota">Desmarque lo que no está en el alcance: la tarea queda como «No aplica» con el motivo (no se borra). Las duraciones son referencias; el líder las ajusta antes de aprobar la línea base.</p>' +
        '<div class="pry-scroll" style="max-height:420px"><table class="ic-tabla pry-mini"><thead><tr><th></th><th>ID</th><th>Actividad</th><th>Tipo</th><th class="num">Días</th><th>Organización</th></tr></thead><tbody>' +
        comb.tareas.map((t, i) => PRY.esFase(t) ? '<tr class="pry-fase"><td></td><td>' + esc(t.tarea_id) + '</td><td colspan="4"><b>' + esc(t.actividad) + '</b> <span class="sec">' + esc(t.plantilla) + '</span></td></tr>'
          : '<tr><td><input type="checkbox" data-t="' + i + '"' + (t.aplica ? ' checked' : '') + '></td><td>' + esc(t.tarea_id) + '</td><td>' + esc(t.actividad) + (t.obligatoria === 'Sí' ? ' <span class="pry-tag dorado">obligatoria</span>' : '') + (t.condicion ? '<span class="sec">' + esc(t.condicion) + '</span>' : '') +
            '<input class="pry-motivo" data-m="' + i + '" placeholder="Motivo de «No aplica»" ' + (t.aplica ? 'hidden' : '') + ' value="' + (t.aplica ? '' : 'No incluido por defecto en la plantilla') + '"></td><td>' + esc(t.tipo) + '</td><td class="num">' + esc(t.duracion == null ? '—' : t.duracion) + '</td><td>' + esc(t.organizacion) + '</td></tr>').join('') +
        '</tbody></table></div><p class="pry-nota">' + comb.tareas.filter((t) => !PRY.esFase(t)).length + ' tareas en ' + fases.length + ' fases.</p>';
      caja.querySelectorAll('[data-t]').forEach((x) => { x.onchange = () => { const t = comb.tareas[+x.dataset.t]; t.aplica = x.checked; const m = caja.querySelector('[data-m="' + x.dataset.t + '"]'); m.hidden = x.checked; if (!x.checked && !m.value) m.focus(); }; });
      caja.querySelectorAll('[data-m]').forEach((x) => { x.oninput = () => { comb.tareas[+x.dataset.m].motivo = x.value.trim(); }; x.oninput(); });
    }
    f.onsubmit = async (e) => {
      e.preventDefault();
      const v = U.leerForm(f), err = {};
      if (!empresa) err.cliente = 'Elija un cliente de la lista (base de Comercial)';
      if (!v.nombre) err.nombre = 'Obligatorio';
      if (!v.inicio) err.inicio = 'Obligatorio';
      if (!v.lider_email) err.lider_email = 'Elija el líder';
      if (!v.escenario) err.escenario = 'Elija el escenario';
      if (!U.marcarErrores(f, err)) return;
      if (!comb || !comb.tareas.length) { U.aviso('Elija al menos una plantilla.', 'warn'); return; }
      const sinMotivo = comb.tareas.filter((t) => !PRY.esFase(t) && !t.aplica && !t.motivo);
      if (sinMotivo.length) { U.aviso('Escriba el motivo de «No aplica» de ' + sinMotivo.length + ' tarea(s).', 'warn'); return; }
      const tareas = comb.tareas.map((t) => Object.assign({}, t, t.aplica || PRY.esFase(t) ? {} : { estado: 'No aplica', motivo_no_aplica: t.motivo }));
      const errDep = PRY.validarDependencias(tareas);
      if (errDep.length) { U.aviso('Revise las dependencias: ' + errDep.slice(0, 2).join('; '), 'err', 9000); return; }
      PRY.programar(tareas, v.inicio);
      const lid = PRY.persona(v.lider_email), cont = v.contacto_id ? (await PRY.contactos(empresa.Title)).find((x) => x.Title === v.contacto_id) : null;
      const est = f.querySelector('#nvE'), b = f.querySelector('#nvOk'); b.disabled = true;
      try {
        const n = await G.reservar('PRY', 1), id = 'PRY-' + PRY.pad(n, 4);
        const pls = marcadas().map((cod) => PRY.vigente(cod));
        const fin = tareas.filter((t) => !PRY.esNA(t) && t.fin_plan).map((t) => t.fin_plan).sort().pop() || '';
        const proyecto = { Title: id, empresa_id: empresa.Title, cliente: empresa.razon_social, nombre: v.nombre, descripcion: v.descripcion, os_numero: v.os_numero, os_fecha: v.os_fecha,
          escenario: (CFG.escenarios.find((x) => x.id === v.escenario) || {}).nombre || '', plantillas: pls.map((p) => p.codigo + ' v' + p.version).join(', '),
          lider_email: v.lider_email, lider: lid ? lid.nombre : v.lider_email, contacto_id: cont ? cont.Title : '', contacto: cont ? [cont.nombres, cont.apellidos].filter(Boolean).join(' ') : '',
          inicio: PRY.sigHabil(v.inicio), cierre_estimado: fin, estado: 'Planeación', salud: 'Normal', avance: 0, alcance: v.descripcion, carpeta: v.carpeta, creado_por: App.usuario.nombre };
        Object.keys(proyecto).forEach((k) => { if (proyecto[k] === '' || proyecto[k] == null) delete proyecto[k]; });
        est.textContent = 'Creando el proyecto…';
        await G.crear('PRY_Proyectos', proyecto);
        await PRY.enParalelo(tareas, 4, (t) => G.crear('PRY_Tareas', App.filaTarea(id, t)), (h, tot) => { est.textContent = 'Copiando tareas: ' + h + ' de ' + tot + '…'; });
        await PRY.bitacora(id, '', [{ campo: 'Proyecto creado', antes: '', despues: proyecto.plantillas + ' · ' + tareas.length + ' registros' }], 'Escenario: ' + proyecto.escenario, '', App.usuario.nombre);
        U.aviso('Proyecto ' + id + ' creado. Revise duraciones y dependencias y apruebe la línea base.', 'ok', 8000);
        location.hash = '#p/' + id + '/cronograma';
      } catch (e2) {
        b.disabled = false; est.textContent = '';
        U.aviso(/PRY_/.test(e2.message) ? 'Faltan las listas de Proyectos: abra el instalador (Programacion/Instalador/) y dé clic en «Crear estructura». ' + U.mensajeError(e2) : U.mensajeError(e2), 'err', 10000);
      }
    };
  };

  // Campos de una tarea para SharePoint (sin vacíos)
  App.filaTarea = function (proyectoId, t) {
    const f = { Title: proyectoId + '#' + t.tarea_id, proyecto_id: proyectoId };
    ['tarea_id', 'plantilla', 'plantilla_version', 'id_padre', 'fase', 'actividad', 'tipo', 'descripcion', 'organizacion', 'responsable_email', 'responsable', 'rol', 'estimada', 'predecesoras',
      'inicio_plan', 'fin_plan', 'inicio_real', 'fin_real', 'estado', 'salud', 'explicacion_salud', 'criterio', 'evidencia', 'observaciones', 'motivo_no_aplica', 'obligatoria', 'comun', 'propia', 'visibilidad']
      .forEach((k) => { if (t[k] !== '' && t[k] != null) f[k] = String(t[k]).slice(0, ['descripcion', 'criterio', 'evidencia', 'observaciones', 'motivo_no_aplica', 'explicacion_salud'].indexOf(k) >= 0 ? 8000 : 255); });
    if (t.duracion != null) f.duracion = Number(t.duracion);
    f.porcentaje = Number(t.porcentaje) || 0; f.orden = Number(t.orden) || 0;
    return f;
  };

  // =====================================================================
  // ARRANQUE
  // =====================================================================
  async function arrancar() {
    const raiz = document.getElementById('contenido');
    U.pantalla(raiz, { logo: CFG.logo, cargando: true, titulo: 'Cargando…', texto: 'Conectando con Microsoft 365' });
    try { sessionStorage.setItem('ic_volver_url', location.href); } catch (e) { /* sin almacenamiento */ }
    try {
      const cuenta = await IC.auth.iniciar(CFG.auth);
      if (!cuenta) { U.pantalla(raiz, { logo: CFG.logo, titulo: CFG.app.nombre, texto: 'Ingrese con su cuenta de Microsoft de Ideas Control.', boton: 'Iniciar sesión', alClic: () => IC.auth.entrar() }); return; }
      try { sessionStorage.removeItem('ic_volver_url'); } catch (e) { /* sin almacenamiento */ }
      const email = String(cuenta.username || '').toLowerCase();
      App.usuario = { nombre: cuenta.name || email, email, iniciales: U.fmt.iniciales(cuenta.name || email) };
      await G.sitio(CFG.sitio.host, CFG.sitio.ruta);
      await Promise.all([PRY.cargarPersonas(), PRY.cargarFestivos()]);
      App.rol = await resolverRol(email);
      if (!App.rol) { U.pantalla(raiz, { logo: CFG.logo, titulo: 'Sin acceso', texto: 'Su cuenta no tiene acceso a Proyectos. Pida acceso a la Dirección de Operaciones.', boton: 'Volver al portal', alClic: () => IC.portal.volver() }); return; }
      try { await G.listaId('PRY_Proyectos'); } catch (e) {
        U.pantalla(raiz, { logo: CFG.logo, titulo: 'Falta instalar la app', texto: 'Las listas de Proyectos (PRY_*) aún no existen en IC Apps. Abra el instalador de la Programación y haga clic en «Crear estructura» y luego en «Aplicar permisos».', boton: 'Abrir el instalador', alClic: () => { location.href = '/ideascontrol/Programacion/Instalador/'; } });
        return;
      }
      encabezado();
      U.enrutar({ '': () => App.vistas.portafolio(raiz), nuevo: () => App.vistas.nuevo(raiz), p: () => App.vistas.proyecto(raiz), admin: () => App.vistas.admin(raiz) }, marcarNav);
    } catch (e) {
      console.error(e);
      U.pantalla(raiz, { logo: CFG.logo, titulo: 'No se pudo cargar la app', texto: U.mensajeError(e), boton: 'Reintentar', alClic: () => location.reload() });
    }
  }
  window.addEventListener('DOMContentLoaded', arrancar);
})();
