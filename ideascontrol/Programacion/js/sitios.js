/* =====================================================================
   APP-106 · Programación — Clientes y sitios  (#sitios)
   Listado de los sitios / clientes finales de un cliente principal (p. ej. los clientes de Casa Limpia),
   armado con las actividades programadas: estado de cada sitio, instalaciones, equipos, última y próxima actividad.
   Clic en un sitio: todas sus actividades. Descarga en Excel.
   ===================================================================== */
(function () {
  const U = IC.ui, esc = U.esc;
  const INICIO = '2026-10-26';
  const ST = { cliente: '', desde: '', hasta: '', q: '', estado: '' };
  const n = (s) => U.norm(String(s || '')).replace(/\s+/g, ' ').trim();
  const eq = (a) => Number(a.equipos) || 0;
  const ESTADOS_SITIO = [
    ['INSTALADO', 'Instalado', 'verde'], ['INS_PROG', 'Instalación programada', 'azul'], ['VISITA', 'En visita / costeo', 'dorado'],
    ['MANT', 'Con mantenimiento', 'teal'], ['OTRO', 'Con actividades', 'gris'], ['REPROG', 'Por reprogramar', 'dorado'], ['CANCELADO', 'Stand By', 'rojo'], ['SIN_PROG', 'Sin programar', 'gris']
  ];
  // Estado registrado en la lista de sedes (texto libre del Excel) -> clave
  const estDeTexto = (t) => { t = n(t); return !t ? '' : /stand/.test(t) ? 'CANCELADO' : /instalad/.test(t) ? 'INSTALADO' : /reprogram/.test(t) ? 'REPROG' : /program/.test(t) ? 'INS_PROG' : /visita|costeo/.test(t) ? 'VISITA' : 'OTRO'; };
  const estNom = (k) => (ESTADOS_SITIO.find((x) => x[0] === k) || [k, k, 'gris']);

  // Resumen de un grupo de actividades (un sitio o una sede)
  function resumen(acts) {
    const hoy = Ope.hoy();
    const v = acts.filter(Ope.activa).sort((x, y) => x.fecha.localeCompare(y.fecha));
    const ins = v.filter((a) => a.tipo === 'INS'), insEj = ins.filter((a) => a.estado === 'EJECUTADO'), insPend = ins.filter((a) => a.estado !== 'EJECUTADO');
    const mto = v.filter((a) => a.tipo === 'MTO');
    const pasadas = v.filter((a) => a.fecha <= hoy), futuras = v.filter((a) => a.fecha > hoy || (a.fecha === hoy && a.estado !== 'EJECUTADO'));
    let estado = 'OTRO';
    if (!acts.length) estado = 'SIN_PROG';
    else if (!v.length) estado = 'CANCELADO';
    else if (insEj.length) estado = 'INSTALADO';
    else if (insPend.length) estado = 'INS_PROG';
    else if (v.some((a) => /VT|VIS/.test(a.tipo))) estado = 'VISITA';
    else if (mto.length) estado = 'MANT';
    const pend = v.filter((a) => a.estado !== 'EJECUTADO');
    return {
      estado, vigentes: v.length, insEj: insEj.length, insPend: insPend.length, mto: mto.length,
      equiposInst: insEj.reduce((t, a) => t + eq(a), 0), equiposProg: insPend.reduce((t, a) => t + eq(a), 0),
      ultima: pasadas[pasadas.length - 1] || null, proxima: futuras.find((a) => a.estado !== 'EJECUTADO') || null,
      fechaProg: (insPend[0] || pend[0] || {}).fecha || '', fechaInst: (insEj[insEj.length - 1] || {}).fecha || ''
    };
  }

  // ---------- Sedes registradas (OPE_Sedes) y su cruce con la programación ----------
  const parecido = (a, b) => { a = n(a); b = n(b); return !!a && !!b && (a === b || a.indexOf(b) === 0 || b.indexOf(a) === 0); };
  // Sedes candidatas para una actividad (por nombre de la empresa y, si hay varias, por ciudad)
  function candidatas(a, lista) {
    const nom = a.sitio || a.cliente; if (!nom) return [];
    let c = lista.filter((x) => parecido(x.sitio, nom));
    if (c.length > 1 && a.ciudad) { const cc = c.filter((x) => n(x.ciudad) === n(a.ciudad)); if (cc.length) c = cc; }
    return c;
  }
  // Une cada sede con sus actividades: por la columna «sede» o, si la empresa tiene una sola sede posible, por nombre
  function cruzar(listaSedes, acts) {
    const por = {}, ambiguas = [];
    listaSedes.forEach((x) => { por[x.Title] = []; });
    acts.forEach((a) => {
      if (a.sede && por[a.sede]) { por[a.sede].push(a); return; }
      const c = candidatas(a, listaSedes);
      if (c.length === 1) por[c[0].Title].push(a);
      else if (c.length > 1) ambiguas.push({ a, c });
    });
    return { filas: listaSedes.map((x) => Object.assign({ sede: x, acts: por[x.Title] }, resumen(por[x.Title]))), ambiguas };
  }
  App.sedesCandidatas = (a) => candidatas(a, Ope.D.sedes || []);

  // Agrupa las actividades del cliente por sitio
  function sitios(acts) {
    const m = {}, hoy = Ope.hoy();
    acts.forEach((a) => {
      const nombre = String(a.sitio || '').trim() || String(a.cliente || '').trim() || '(sin cliente)';
      const k = n(nombre);
      const s = m[k] || (m[k] = { sitio: nombre, ciudades: new Set(), acts: [], tickets: new Set() });
      s.acts.push(a); if (a.ciudad) s.ciudades.add(a.ciudad); if (a.ticket_os) s.tickets.add(String(a.ticket_os).trim());
    });
    return Object.values(m).map((s) => {
      const v = s.acts.filter(Ope.activa).sort((x, y) => x.fecha.localeCompare(y.fecha));
      const ins = v.filter((a) => a.tipo === 'INS'), insEj = ins.filter((a) => a.estado === 'EJECUTADO'), insPend = ins.filter((a) => a.estado !== 'EJECUTADO');
      const mto = v.filter((a) => a.tipo === 'MTO');
      const pasadas = v.filter((a) => a.fecha <= hoy), futuras = v.filter((a) => a.fecha > hoy || (a.fecha === hoy && a.estado !== 'EJECUTADO'));
      let estado = 'OTRO';
      if (!v.length) estado = 'CANCELADO';
      else if (insEj.length) estado = 'INSTALADO';
      else if (insPend.length) estado = 'INS_PROG';
      else if (v.some((a) => /VT|VIS/.test(a.tipo))) estado = 'VISITA';
      else if (mto.length) estado = 'MANT';
      return Object.assign(s, {
        estado, vigentes: v.length, insEj: insEj.length, insPend: insPend.length, mto: mto.length,
        equiposInst: insEj.reduce((t, a) => t + eq(a), 0), equiposProg: insPend.reduce((t, a) => t + eq(a), 0),
        ultima: pasadas[pasadas.length - 1] || null, proxima: futuras.find((a) => a.estado !== 'EJECUTADO') || null,
        ciudad: Array.from(s.ciudades).join(', '), ticket: Array.from(s.tickets).join(', ')
      });
    }).sort((a, b) => a.sitio.localeCompare(b.sitio));
  }
  const actTxt = (a) => a ? Ope.textoFecha(a.fecha) + ' · ' + a.tipo + ' · ' + Ope.nombreEstado(a.estado) + (a.tecnico_id ? ' · ' + Ope.nombreTec(a.tecnico_id) : '') : '—';

  // Clientes principales que tienen sitios (los que más sitios tienen primero)
  function clientes(acts) {
    const m = {};
    acts.forEach((a) => { if (!a.cliente || !a.sitio) return; const k = n(a.cliente); (m[k] = m[k] || { nombre: a.cliente, s: new Set() }).s.add(n(a.sitio)); });
    return Object.values(m).sort((a, b) => b.s.size - a.s.size || a.nombre.localeCompare(b.nombre));
  }

  App.vistas.sitios = async function (c) {
    if (App.usuario.rol === 'TECNICO') { location.hash = ''; return; }
    // Desde el inicio de la programación en la app (26 oct 2026)
    if (!ST.desde) { ST.desde = INICIO; ST.hasta = Ope.sumar(Ope.hoy(), 120); }
    c.innerHTML = '<a class="ic-volver" href="#">← Menú principal</a><h1 class="ic-titulo">Clientes y sitios</h1>' +
      '<p class="ic-subtitulo">Los sitios (clientes finales) de un cliente principal, por ejemplo los clientes de Casa Limpia, con su estado según la programación. Clic en un sitio para ver todas sus actividades.</p>' +
      '<div class="ic-filtros"><select id="sCli"><option value="">Cargando clientes…</option></select>' +
      '<label class="ope-lbl">Desde <input type="date" id="sD" value="' + ST.desde + '"></label><label class="ope-lbl">Hasta <input type="date" id="sH" value="' + ST.hasta + '"></label>' +
      '<select id="sEst"><option value="">Todos los estados</option>' + ESTADOS_SITIO.map((e) => '<option value="' + e[0] + '">' + esc(e[1]) + '</option>').join('') + '</select>' +
      '<input type="search" id="sQ" placeholder="Buscar sitio, sede, ciudad, dirección, ticket…" value="' + esc(ST.q) + '"><button class="ic-btn sec" id="sXls">Descargar Excel</button>' +
      (App.usuario.rol === 'TECNICO' || App.usuario.rol === 'CONSULTA' ? '' : '<button class="ic-btn sec" id="sImp">Importar sedes (Excel)</button><input type="file" id="sArch" accept=".xlsx,.xls" hidden>') + '</div>' +
      '<div id="sRes"><div class="ic-vacio">Cargando la programación…</div></div>';
    let todo = [], listaSedes = [];
    const principales = () => { const m = {}; listaSedes.forEach((x) => { const k = n(x.cliente_principal || '(sin cliente principal)'); (m[k] = m[k] || { nombre: x.cliente_principal || '(sin cliente principal)', n: 0 }).n++; }); return Object.keys(m).map((k) => Object.assign({ k }, m[k])); };
    async function cargar() {
      try { await Promise.all([Ope.cargarRango(ST.desde, ST.hasta), Ope.sedes(true).then((x) => { listaSedes = x; })]); } catch (e) { c.querySelector('#sRes').innerHTML = '<div class="ic-alerta">' + esc(U.mensajeError(e)) + '</div>'; return; }
      todo = Ope.delRango(ST.desde, ST.hasta).filter((a) => a.tipo !== 'OFI' && a.tipo !== 'AUS');
      const cl = clientes(todo), pr = principales();
      if (!ST.cliente) { const ps = pr.find((x) => /casa limpia/.test(x.k)) || pr[0]; const cas = cl.find((x) => /casa limpia/.test(n(x.nombre)));
        ST.cliente = ps ? 'sedes:' + ps.k : cas ? n(cas.nombre) : (cl[0] ? n(cl[0].nombre) : ''); }
      const nDir = new Set(directas().map((a) => n(a.cliente))).size;
      c.querySelector('#sCli').innerHTML = pr.map((x) => '<option value="sedes:' + esc(x.k) + '">' + esc(x.nombre) + ' · ' + x.n + ' sedes registradas</option>').join('') +
        cl.map((x) => '<option value="' + esc(n(x.nombre)) + '">' + esc(x.nombre) + ' (' + x.s.size + ' sitios en la programación)</option>').join('') +
        '<option value="__directos">Empresas sin cliente principal (' + nDir + ')</option>';
      if (!cl.length && !pr.length && ST.cliente !== '__directos') ST.cliente = '__directos';
      c.querySelector('#sCli').value = ST.cliente;
      dibujar();
    }
    // Actividades donde la empresa quedó como «Cliente» sin cliente principal (p. ej. importadas del Excel)
    const nomCli = () => (todo.find((a) => n(a.cliente) === ST.cliente) || {}).cliente || ST.cliente;
    const directas = () => todo.filter((a) => a.cliente && !a.sitio);
    const delCliente = () => ST.cliente === '__directos' ? directas() : todo.filter((a) => n(a.cliente) === ST.cliente);
    function lista() {
      const q = n(ST.q);
      return sitios(delCliente())
        .filter((s) => (!ST.estado || s.estado === ST.estado) && (!q || n(s.sitio + ' ' + s.ciudad + ' ' + s.ticket).indexOf(q) >= 0));
    }
    // ===== Modo «sedes registradas»: la lista de sedes cruzada con la programación =====
    const esSedes = () => String(ST.cliente).indexOf('sedes:') === 0;
    const sedesDel = () => listaSedes.filter((x) => n(x.cliente_principal || '(sin cliente principal)') === ST.cliente.slice(6));
    function filasSedes() {
      const cr = cruzar(sedesDel(), todo), q = n(ST.q);
      cr.filas.forEach((f) => { f.registrado = estDeTexto(f.sede.estado); f.final = f.acts.length && f.estado !== 'CANCELADO' ? f.estado : (f.registrado || f.estado); });
      cr.lista = cr.filas.filter((f) => (!ST.estado || f.final === ST.estado) &&
        (!q || n([f.sede.sitio, f.sede.Title, f.sede.ciudad, f.sede.direccion, f.sede.cod_cliente, f.sede.notas].join(' ')).indexOf(q) >= 0))
        .sort((a, b) => String(a.sede.sitio).localeCompare(b.sede.sitio) || String(a.sede.Title).localeCompare(b.sede.Title));
      return cr;
    }
    const fechaCorta = (f) => f ? Ope.textoFecha(f) : '';
    function dibujarSedes() {
      const cr = filasSedes(), l = cr.lista, cont = {};
      cr.filas.forEach((f) => { cont[f.final] = (cont[f.final] || 0) + 1; });
      c.querySelector('#sRes').innerHTML =
        '<div class="ope-sit-resumen"><button class="ope-sit-k azul' + (!ST.estado ? ' on' : '') + '" data-est=""><b>' + cr.filas.length + '</b>Total de sedes</button>' +
          ESTADOS_SITIO.filter((e) => cont[e[0]]).map((e) => '<button class="ope-sit-k ' + e[2] + (ST.estado === e[0] ? ' on' : '') + '" data-est="' + e[0] + '"><b>' + cont[e[0]] + '</b>' + esc(e[1]) + '</button>').join('') + '</div>' +
        (cr.ambiguas.length ? '<div class="ic-alerta chica" style="margin-bottom:10px"><b>' + cr.ambiguas.length + ' actividad(es) de empresas con varias sedes sin sede asignada.</b> Elija la sede de cada una para que cuente en el estado correcto:' +
          '<div class="ope-sede-amb">' + cr.ambiguas.map((x, i) => '<div class="ope-sede-fila"><span>' + esc(Ope.textoFecha(x.a.fecha) + ' · ' + x.a.tipo + ' · ' + (x.a.sitio || x.a.cliente) + (x.a.ciudad ? ' · ' + x.a.ciudad : '') + ' · ' + Ope.nombreEstado(x.a.estado)) + '</span>' +
            '<select data-amb="' + i + '"><option value="">Elegir sede…</option>' + x.c.map((sd) => '<option value="' + esc(sd.Title) + '">' + esc(sd.Title + ' · ' + sd.ciudad + ' · ' + sd.direccion) + '</option>').join('') + '</select></div>').join('') + '</div></div>' : '') +
        (l.length ? '<div class="ic-tabla-caja ope-scroll"><table class="ic-tabla"><thead><tr><th>Sitio / cliente final</th><th>Cód. sede</th><th>Ciudad · dirección</th><th>Estado</th><th>Estado registrado</th><th>Fecha programada</th><th>Fecha instalación</th><th style="text-align:center">Equipos</th><th>Última / próxima actividad</th><th>Notas</th></tr></thead><tbody>' +
          l.map((f, i) => { const e = estNom(f.final), r = f.sede.estado ? estNom(f.registrado) : null;
            return '<tr data-s="' + i + '"><td><b>' + esc(f.sede.sitio) + '</b><span class="sec">Cód. cliente ' + esc(f.sede.cod_cliente || '—') + '</span></td><td>' + esc(f.sede.Title) + '</td><td>' + esc(f.sede.ciudad || '') + '<span class="sec">' + esc(f.sede.direccion || '') + '</span></td>' +
              '<td><span class="ope-sit-tag ' + e[2] + '">' + esc(e[1]) + '</span></td><td>' + (r ? '<span class="sec">' + esc(f.sede.estado) + '</span>' : '') + '</td>' +
              '<td>' + esc(fechaCorta(f.fechaProg)) + '</td><td>' + esc(fechaCorta(f.fechaInst)) + '</td><td style="text-align:center">' + (f.equiposInst || '') + (f.equiposProg ? ' <span class="sec">+' + f.equiposProg + ' prog.</span>' : '') + '</td>' +
              '<td>' + esc(actTxt(f.ultima)) + (f.proxima ? '<span class="sec">Próxima: ' + esc(actTxt(f.proxima)) + '</span>' : '') + '</td><td>' + esc(f.sede.notas || '') + '</td></tr>'; }).join('') +
          '</tbody></table></div><p class="ope-nota">' + l.length + ' de ' + cr.filas.length + ' sede(s). El estado sale de la programación (desde ' + esc(Ope.textoFecha(ST.desde)) + '); si la sede no tiene actividades vigentes se usa el estado registrado en la lista. «Stand By» = solo tiene actividades canceladas o así quedó registrada. Clic en una sede para ver sus actividades y editar su estado o notas.</p>'
          : '<div class="ic-tabla-caja"><div class="ic-vacio">' + (cr.filas.length ? 'No hay sedes con estos filtros.' : 'No hay sedes registradas.') + '</div></div>');
      c.querySelectorAll('[data-est]').forEach((b) => { b.onclick = () => { ST.estado = b.dataset.est === ST.estado ? '' : b.dataset.est; c.querySelector('#sEst').value = ST.estado; dibujar(); }; });
      c.querySelectorAll('tr[data-s]').forEach((tr) => { tr.onclick = () => detalleSede(l[+tr.dataset.s]); });
      c.querySelectorAll('[data-amb]').forEach((sel) => { sel.onchange = async () => {
        const x = cr.ambiguas[+sel.dataset.amb]; if (!sel.value) return; sel.disabled = true;
        try { await Ope.actualizarActividad(x.a, { sede: sel.value }); U.aviso('Actividad asignada a la sede ' + sel.value, 'ok'); dibujar(); }
        catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); sel.disabled = false; }
      }; });
    }
    function detalleSede(f) {
      const sd = f.sede, acts = f.acts.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)), edita = App.usuario.rol !== 'CONSULTA';
      U.modal(sd.sitio + ' · sede ' + sd.Title, '<div class="ic-form"><p style="margin-top:0">' + esc([sd.ciudad, sd.direccion].filter(Boolean).join(' · ')) + ' · Estado: <b>' + esc(estNom(f.final)[1]) + '</b> · ' + acts.length + ' actividad(es)</p>' +
        (edita ? '<div class="ic-campos">' + U.campo({ name: 'estado', label: 'Estado registrado', valor: sd.estado, c: 'c4', ph: 'Stand By, Instalada…' }) + U.campo({ name: 'notas', label: 'Notas', valor: sd.notas, c: 'c8' }) + '</div>' : '') +
        '<div id="sDet" style="margin-top:10px"></div><div class="ic-acciones"><button type="button" class="ic-btn sec" id="sCerrar">Cerrar</button>' + (edita ? '<button type="button" class="ic-btn" id="sGuardar">Guardar estado y notas</button>' : '') + '</div></div>', (cu) => {
        cu.querySelector('#sDet').innerHTML = acts.length ? App.tablaActividades(acts) : '<div class="ic-vacio">Esta sede no tiene actividades en la programación (desde ' + esc(Ope.textoFecha(ST.desde)) + ').</div>';
        if (acts.length) App.conectarTabla(cu.querySelector('#sDet'), () => cargar());
        cu.querySelector('#sCerrar').onclick = U.cerrarModal;
        const g = cu.querySelector('#sGuardar');
        if (g) g.onclick = () => U.conCarga(g, async () => {
          try { await IC.graph.actualizar('OPE_Sedes', sd._id, { estado: cu.querySelector('[name=estado]').value.trim(), notas: cu.querySelector('[name=notas]').value.trim() }, sd._etag); U.aviso('Sede actualizada', 'ok'); U.cerrarModal(); cargar(); }
          catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); }
        });
      });
    }

    function dibujar() {
      if (esSedes()) { dibujarSedes(); return; }
      const l = lista(), cont = {};
      const dir = ST.cliente === '__directos';
      sitios(delCliente()).forEach((s) => { cont[s.estado] = (cont[s.estado] || 0) + 1; });
      c.querySelector('#sRes').innerHTML =
        '<div class="ope-sit-resumen">' + ESTADOS_SITIO.filter((e) => cont[e[0]]).map((e) => '<button class="ope-sit-k ' + e[2] + (ST.estado === e[0] ? ' on' : '') + '" data-est="' + e[0] + '"><b>' + cont[e[0]] + '</b>' + esc(e[1]) + '</button>').join('') + '</div>' +
        (dir && l.length ? '<div class="ic-alerta chica" style="margin-bottom:10px"><b>Estas empresas están como «Cliente» sin cliente principal.</b> Si son clientes de Casa Limpia (u otro), márquelas y páselas: el cliente queda como cliente principal y la empresa pasa a «Sitio / cliente final» en todas sus actividades.' +
          '<div class="ic-barra" style="margin-top:8px;gap:8px;flex-wrap:wrap"><label class="ic-check"><input type="checkbox" id="sTodas"> <span>Marcar todas</span></label><span style="flex:1"></span>' +
          '<input id="sPrin" list="dlPrin" placeholder="Cliente principal (p. ej. CASA LIMPIA)" style="min-width:260px"><datalist id="dlPrin"></datalist><button class="ic-btn" id="sPasar">Pasar las marcadas</button></div></div>' : '') +
        (!dir && l.length ? '<div class="ic-alerta chica" style="margin-bottom:10px"><b>Quitar el cliente principal:</b> marque los sitios y la empresa vuelve a quedar como «Cliente» (sin cliente principal) en todas sus actividades. ' + esc(nomCli()) + ' no se borra de la base de Comercial.' +
          '<div class="ic-barra" style="margin-top:8px;gap:8px"><label class="ic-check"><input type="checkbox" id="sTodas"> <span>Marcar todas</span></label><span style="flex:1"></span><button class="ic-btn" id="sQuitar">Quitar cliente principal a las marcadas</button></div></div>' : '') +
        (l.length ? '<div class="ic-tabla-caja ope-scroll"><table class="ic-tabla"><thead><tr><th style="width:30px"></th><th>' + (dir ? 'Empresa' : 'Sitio / cliente final') + '</th><th>Estado</th><th>Ciudad</th><th style="text-align:center">Instalaciones</th><th style="text-align:center">Equipos instalados</th><th style="text-align:center">Mantenimientos</th><th>Última actividad</th><th>Próxima actividad</th><th>Ticket / OS</th></tr></thead><tbody>' +
          l.map((s, i) => { const e = estNom(s.estado);
            return '<tr data-i="' + i + '"><td><input type="checkbox" class="sMarca" data-i="' + i + '" aria-label="Marcar"></td>' + '<td><b>' + esc(s.sitio) + '</b></td><td><span class="ope-sit-tag ' + e[2] + '">' + esc(e[1]) + '</span></td><td>' + esc(s.ciudad) + '</td>' +
              '<td style="text-align:center">' + s.insEj + (s.insPend ? ' <span class="sec">+' + s.insPend + ' prog.</span>' : '') + '</td><td style="text-align:center">' + (s.equiposInst || '') + (s.equiposProg ? ' <span class="sec">+' + s.equiposProg + ' prog.</span>' : '') + '</td>' +
              '<td style="text-align:center">' + (s.mto || '') + '</td><td>' + esc(actTxt(s.ultima)) + '</td><td>' + esc(actTxt(s.proxima)) + '</td><td>' + esc(s.ticket) + '</td></tr>'; }).join('') +
          '</tbody></table></div><p class="ope-nota">' + l.length + ' sitio(s). El estado sale de la programación: «Instalado» = tiene al menos una instalación ejecutada; «Instalación programada» = tiene instalación pendiente; canceladas y reprogramadas no cuentan.</p>'
          : '<div class="ic-tabla-caja"><div class="ic-vacio">No hay sitios con estos filtros.</div></div>');
      c.querySelectorAll('[data-est]').forEach((b) => { b.onclick = () => { ST.estado = ST.estado === b.dataset.est ? '' : b.dataset.est; c.querySelector('#sEst').value = ST.estado; dibujar(); }; });
      c.querySelectorAll('tr[data-i]').forEach((tr) => { tr.onclick = (e) => { if (e.target.classList.contains('sMarca')) return; detalle(l[+tr.dataset.i]); }; });
      const marcadas = () => Array.from(c.querySelectorAll('.sMarca')).filter((x) => x.checked).map((x) => l[+x.dataset.i]);
      if (c.querySelector('#sTodas')) c.querySelector('#sTodas').onchange = (e) => c.querySelectorAll('.sMarca').forEach((x) => { x.checked = e.target.checked; });
      if (!dir && l.length) c.querySelector('#sQuitar').onclick = async (ev) => {
        const b = ev.currentTarget, m = marcadas(); if (!m.length) { U.aviso('Marque los sitios a los que se les quita el cliente principal.', 'warn'); return; }
        b.disabled = true; let k = 0;
        const emp = await Ope.empresas(), acts = [].concat.apply([], m.map((x) => x.acts)).filter((a) => a.sitio);
        try {
          for (const a of acts) {
            b.textContent = 'Actualizando ' + (++k) + ' de ' + acts.length + '…';
            const e = emp.find((x) => n(x.razon_social) === n(a.sitio));
            await Ope.actualizarActividad(a, { cliente: e ? e.razon_social : a.sitio, empresa_id: e ? e.Title : '', sitio: '' });
          }
          U.aviso(m.length + ' sitio(s) quedaron sin cliente principal (' + acts.length + ' actividades).', 'ok', 7000);
          ST.cliente = '__directos'; await cargar();
        } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); b.disabled = false; b.textContent = 'Reintentar'; await cargar(); }
      };
      if (dir && l.length) {
        Ope.empresas().then((emp) => { const dl = c.querySelector('#dlPrin'); if (dl) dl.innerHTML = emp.map((e) => '<option value="' + esc(e.razon_social) + '">').join(''); });
        const cas = clientes(todo).find((x) => /casa limpia/.test(n(x.nombre))); if (cas) c.querySelector('#sPrin').value = cas.nombre;
        c.querySelector('#sPasar').onclick = async (ev) => {
          const boton = ev.currentTarget, marcadas2 = marcadas();
          const prin = c.querySelector('#sPrin').value.trim().toUpperCase();
          if (!marcadas2.length) { U.aviso('Marque las empresas que pasan al cliente principal.', 'warn'); return; }
          if (!prin) { U.aviso('Escriba el cliente principal.', 'warn'); c.querySelector('#sPrin').focus(); return; }
          const emp = (await Ope.empresas()).find((x) => n(x.razon_social) === n(prin));
          const acts = [].concat.apply([], marcadas2.map((s) => s.acts));
          const b = boton; b.disabled = true; let k = 0;
          try {
            for (const a of acts) { b.textContent = 'Actualizando ' + (++k) + ' de ' + acts.length + '…'; await Ope.actualizarActividad(a, { sitio: a.cliente, cliente: emp ? emp.razon_social : prin, empresa_id: emp ? emp.Title : '' }); }
            U.aviso(marcadas2.length + ' empresa(s) pasadas a ' + prin + ' (' + acts.length + ' actividades).', 'ok', 7000);
            ST.cliente = n(emp ? emp.razon_social : prin); await cargar();
          } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); b.disabled = false; b.textContent = 'Reintentar'; await cargar(); }
        };
      }
    }
    function detalle(s) {
      const acts = s.acts.slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
      U.modal(s.sitio, '<div class="ic-form"><p style="margin-top:0">' + esc(estNom(s.estado)[1]) + (s.ciudad ? ' · ' + esc(s.ciudad) : '') + ' · ' + acts.length + ' actividad(es). Clic en una para abrirla.</p><div id="sDet"></div>' +
        '<div class="ic-acciones"><button type="button" class="ic-btn" id="sCerrar">Cerrar</button></div></div>', (cu) => {
        cu.querySelector('#sDet').innerHTML = App.tablaActividades(acts);
        App.conectarTabla(cu.querySelector('#sDet'), () => cargar());
        cu.querySelector('#sCerrar').onclick = U.cerrarModal;
      });
    }
    c.querySelector('#sCli').onchange = (e) => { ST.cliente = e.target.value; ST.estado = ''; c.querySelector('#sEst').value = ''; dibujar(); };
    c.querySelector('#sEst').onchange = (e) => { ST.estado = e.target.value; dibujar(); };
    c.querySelector('#sQ').oninput = (e) => { ST.q = e.target.value; dibujar(); };
    c.querySelector('#sD').onchange = (e) => { if (e.target.value) { ST.desde = e.target.value; cargar(); } };
    c.querySelector('#sH').onchange = (e) => { if (e.target.value) { ST.hasta = e.target.value; cargar(); } };
    const cargarXLSX = () => window.XLSX ? Promise.resolve() : new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar la librería de Excel.')); document.head.appendChild(s); });
    c.querySelector('#sXls').onclick = async (ev) => {
      const b = ev.currentTarget;
      if (esSedes()) {
        const cr = filasSedes(), l = cr.lista; if (!l.length) { U.aviso('No hay sedes para descargar', 'warn'); return; }
        b.disabled = true;
        try {
          await cargarXLSX();
          const iso = (f) => f ? new Date(f + 'T12:00:00') : '';
          const ws = XLSX.utils.json_to_sheet(l.map((f) => ({ 'Cód. Cliente': f.sede.cod_cliente || '', 'Cliente (contrata y paga)': f.sede.cliente_principal || '', 'Sitio / cliente final (dónde se instala)': f.sede.sitio,
            'Biométrico': f.sede.biometrico || '', 'Cód. Sede': f.sede.Title, 'Ciudad': f.sede.ciudad || '', 'Dirección': f.sede.direccion || '', 'Estado': estNom(f.final)[1],
            'Fecha programada': iso(f.fechaProg), 'Fecha Instalacion': iso(f.fechaInst), 'Notas': f.sede.notas || '',
            'Estado registrado': f.sede.estado || '', 'Equipos instalados': f.equiposInst || '', 'Equipos programados': f.equiposProg || '', 'Última actividad': actTxt(f.ultima), 'Próxima actividad': actTxt(f.proxima) })), { cellDates: true });
          Object.keys(ws).forEach((k) => { if (/^[IJ]\d+$/.test(k) && ws[k].t === 'd') ws[k].z = 'dd/mm/yyyy'; });
          ws['!cols'] = [11, 22, 48, 10, 10, 14, 34, 22, 14, 14, 30, 16, 10, 10, 46, 46].map((w) => ({ wch: w })); ws['!autofilter'] = { ref: ws['!ref'] };
          const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Sedes');
          const pr = (l[0].sede.cliente_principal || 'Sedes').replace(/[^\w]+/g, '_');
          XLSX.writeFile(wb, 'Lista_de_Clientes_' + pr + '_' + Ope.hoy() + '.xlsx', { cellDates: true });
          U.aviso('Excel descargado: ' + l.length + ' sedes con su estado.', 'ok');
        } catch (e) { U.aviso(U.mensajeError(e), 'err', 7000); } finally { b.disabled = false; }
        return;
      }
      const l = lista(); if (!l.length) { U.aviso('No hay sitios para descargar', 'warn'); return; }
      b.disabled = true;
      try {
        await cargarXLSX();
        const cliNom = ST.cliente === '__directos' ? 'Sin cliente principal' : (todo.find((a) => n(a.cliente) === ST.cliente) || {}).cliente || ST.cliente;
        const ws = XLSX.utils.json_to_sheet(l.map((s) => ({ 'Cliente principal': cliNom, 'Sitio / cliente final': s.sitio, 'Estado': estNom(s.estado)[1], 'Ciudad': s.ciudad,
          'Instalaciones ejecutadas': s.insEj, 'Instalaciones programadas': s.insPend, 'Equipos instalados': s.equiposInst, 'Equipos programados': s.equiposProg, 'Mantenimientos': s.mto,
          'Última actividad': actTxt(s.ultima), 'Próxima actividad': actTxt(s.proxima), 'Ticket / OS': s.ticket })));
        ws['!cols'] = [22, 40, 22, 16, 12, 12, 12, 12, 12, 46, 46, 16].map((w) => ({ wch: w })); ws['!autofilter'] = { ref: ws['!ref'] };
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Sitios');
        XLSX.writeFile(wb, 'Sitios_' + String(cliNom).replace(/[^\w]+/g, '_') + '_' + Ope.hoy() + '.xlsx');
      } catch (e) { U.aviso(U.mensajeError(e), 'err', 7000); } finally { b.disabled = false; }
    };
    // ===== Importar la lista de sedes desde el Excel (Lista de Clientes) =====
    const bImp = c.querySelector('#sImp');
    if (bImp) {
      const arch = c.querySelector('#sArch');
      bImp.onclick = () => arch.click();
      arch.onchange = async () => {
        const file = arch.files[0]; arch.value = ''; if (!file) return;
        try {
          await cargarXLSX();
          const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
          const a = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' });
          const iCab = a.findIndex((r) => r.some((x) => /c[oó]d\.?\s*sede/i.test(x)));
          if (iCab < 0) throw new Error('No encontré la columna «Cód. Sede». Use la plantilla «Lista de Clientes».');
          const cab = a[iCab].map((x) => n(x)), col = (re) => cab.findIndex((x) => re.test(x));
          const C = { cod_cliente: col(/^cod\.? cliente/), cliente_principal: col(/^cliente/), sitio: col(/^sitio/), biometrico: col(/biometrico/), sede: col(/^cod\.?\s*sede/), ciudad: col(/^ciudad/), direccion: col(/^direccion/), estado: col(/^estado/), notas: col(/^notas/) };
          const filas = a.slice(iCab + 1).map((r) => { const o = {}; Object.keys(C).forEach((k) => { o[k] = C[k] >= 0 ? String(r[C[k]] == null ? '' : r[C[k]]).trim() : ''; }); return o; })
            .filter((o) => o.sede && o.sitio);
          if (!filas.length) throw new Error('El archivo no tiene filas con «Cód. Sede» y «Sitio».');
          const ya = {}; (await Ope.sedes(true)).forEach((x) => { ya[x.Title] = x; });
          const nuevas = filas.filter((o) => !ya[o.sede]).length;
          const ok = await U.confirmar('Importar sedes', filas.length + ' sedes en el archivo: ' + nuevas + ' nuevas y ' + (filas.length - nuevas) + ' que se actualizan (dirección, ciudad, estado, notas). ¿Continuar?', 'Importar');
          if (!ok) return;
          let k = 0; bImp.disabled = true;
          for (const o of filas) {
            bImp.textContent = 'Importando ' + (++k) + ' de ' + filas.length + '…';
            const campos = { cod_cliente: o.cod_cliente, cliente_principal: o.cliente_principal.toUpperCase(), sitio: o.sitio.toUpperCase(), biometrico: o.biometrico, ciudad: o.ciudad, direccion: o.direccion, estado: o.estado, notas: o.notas, estado_fila: 'ACTIVO' };
            if (ya[o.sede]) await IC.graph.actualizar('OPE_Sedes', ya[o.sede]._id, campos); else await IC.graph.crear('OPE_Sedes', Object.assign({ Title: o.sede }, campos));
          }
          await Ope.auditar('SEDES', 'IMPORTAR', 'IMPORTAR', null, { archivo: file.name, sedes: filas.length, nuevas });
          U.aviso(filas.length + ' sedes importadas (' + nuevas + ' nuevas).', 'ok', 7000);
          ST.cliente = ''; await cargar();
        } catch (e) { U.aviso(/OPE_Sedes|404|not found/i.test(String(e.message)) ? 'Falta crear la lista de sedes: abra el instalador y dé clic en «Crear estructura».' : U.mensajeError(e), 'err', 9000); }
        finally { bImp.disabled = false; bImp.textContent = 'Importar sedes (Excel)'; }
      };
    }
    cargar();
  };
})();
