/* =====================================================================
   PER-03 · Reflexiones Estratégicas — aplicación
   Rutas: #  panel · #biblioteca · #nueva · #r/<código>[/texto|/distribucion|/historial] · #calendario · #prompt · #web · #admin
   Roles (RE_Accesos + permisos reales en SharePoint): Administrador, Editor, Revisor, Lector.
   ===================================================================== */
const App = { vistas: {}, filtro: { libro: '', dim: '', comp: '', estado: '', anio: '', pub: '', q: '', pag: 0 }, editor: null, guardarTexto: null, textos: null };

(function () {
  const U = IC.ui, esc = U.esc, D = RE.D;
  const param = (i) => decodeURIComponent((location.hash.slice(1).split('/')[i] || ''));
  const chip = (e) => '<span class="re-est e-' + String(e || '').toLowerCase() + '">' + esc(RE.nombreEstado(e)) + '</span>';
  const porCodigo = (c) => D.refl.find((r) => r.codigo === c);
  const titulo = (r) => r.titulo_editorial || r.titulo || '(sin título)';
  const lunes = (iso) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
  const sumarDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const fechaPlan = (r) => r.estado === 'PUBLICADA' ? (r.fecha_publicacion || r.fecha_prevista) : r.fecha_prevista;
  const visibles = () => D.rol === 'LECTOR' ? D.refl.filter((r) => r.estado === 'PUBLICADA') : D.refl;
  const opsComp = () => D.dims.map((d) => D.comps.filter((c) => c.dimension === d.id && c.activo).map((c) => [c.nombre, c.nombre, d.nombre])).flat();

  // ---------- Encabezado ----------
  function nav() {
    const n = [['', 'Panel'], ['biblioteca', 'Biblioteca'], ['calendario', 'Calendario']];
    if (RE.puede.editar()) n.push(['prompt', 'Prompt maestro']);
    if (RE.puede.admin()) n.push(['admin', 'Administración']);
    return n;
  }
  function pintarEncabezado() {
    const u = D.usuario;
    const h = document.getElementById('encabezado');
    h.innerHTML = '<a href="#" class="re-marca"><img src="' + CFG.icono + '" alt="GPA"></a><div class="app-nombre"><b>' + esc(CFG.app.nombre) + '</b><span>Growth Path Academy · v' + CFG.app.version + '</span></div><div class="espacio"></div>' +
      '<nav class="re-nav">' + nav().map((x) => '<a href="#' + x[0] + '" data-r="' + x[0] + '">' + x[1] + '</a>').join('') + '</nav>' +
      '<div class="ic-user">' + IC.portal.boton() + '<div class="datos"><b>' + esc(u.nombre) + '</b><span>' + esc(RE.nombreRol(D.rol)) + '</span></div><div class="ic-avatar">' + esc(u.iniciales) + '</div><button class="ic-btn sec chico" id="btnSalir">Salir</button></div>';
    h.hidden = false;
    h.querySelector('#btnSalir').onclick = () => { try { IC.portal.avisarSalida(); } catch (e) { /* opcional */ } IC.auth.salir(); };
  }
  const marcarNav = (r) => document.querySelectorAll('.re-nav a').forEach((a) => a.classList.toggle('on', a.dataset.r === (r === 'r' || r === 'nueva' ? 'biblioteca' : r)));

  // =====================================================================
  // PANEL
  // =====================================================================
  App.vistas[''] = function (c) {
    const L = visibles(), cnt = (f) => L.filter(f).length, h = RE.hoy();
    const k = [['Reflexiones registradas', L.length, ''], ['En desarrollo', cnt((r) => r.estado === 'DESARROLLO'), 'DESARROLLO'], ['Pendientes de revisión', cnt((r) => r.estado === 'REV_BIBLICA' || r.estado === 'REV_EDITORIAL'), 'REVISION'],
      ['Aprobadas', cnt((r) => r.estado === 'APROBADA'), 'APROBADA'], ['Programadas', cnt((r) => r.estado === 'PROGRAMADA'), 'PROGRAMADA'], ['Publicadas', cnt((r) => r.estado === 'PUBLICADA'), 'PUBLICADA']];
    const ult = L.slice().sort((a, b) => String(b._modificado).localeCompare(String(a._modificado))).slice(0, 8);
    const prox = L.filter((r) => r.fecha_prevista && r.fecha_prevista >= h && ['PUBLICADA', 'ARCHIVADA'].indexOf(r.estado) < 0).sort((a, b) => a.fecha_prevista.localeCompare(b.fecha_prevista)).slice(0, 6);
    const sem = []; for (let i = 0; i < 8; i++) { const l = sumarDias(lunes(h), 7 * i); sem.push([l, L.filter((r) => r.estado !== 'ARCHIVADA' && fechaPlan(r) && lunes(fechaPlan(r)) === l)]); }
    c.innerHTML = '<div class="re-hero"><div><span class="re-eyebrow">Growth Path Academy</span><h1>Reflexiones Estratégicas</h1><p>Sabiduría bíblica para comprender la vida, desarrollar nuestro carácter y tomar mejores decisiones.</p></div>' +
      (RE.puede.editar() ? '<a class="ic-btn oro" href="#nueva">+ Nueva reflexión</a>' : '') + '</div>' +
      '<div class="re-kpis">' + k.map((x) => '<a href="#biblioteca" data-est="' + x[2] + '"><b>' + x[1].toLocaleString('es-CO') + '</b><span>' + x[0] + '</span></a>').join('') + '</div>' +
      '<div class="re-cols"><section class="ic-bloque"><div class="cab"><h2>Calendario editorial</h2><span class="espacio"></span><a class="ic-btn sec chico" href="#calendario">Ver calendario</a></div><div class="cuerpo">' +
      '<p class="re-nota">' + esc(CFG.frecuencia) + '. Próximas 8 semanas:</p><div class="re-semanas">' + sem.map(([l, rs]) => '<div class="' + (rs.length ? 'ok' : 'vacia') + '"><b>' + esc(RE.textoFecha(l, true)) + '</b>' +
        (rs.length ? rs.map((r) => '<a href="#r/' + esc(r.codigo) + '">' + chip(r.estado) + ' ' + esc(titulo(r)) + '</a>').join('') : '<span>Sin reflexión</span>') + '</div>').join('') + '</div></div></section>' +
      '<section class="ic-bloque"><div class="cab"><h2>Próximas publicaciones</h2></div><div class="cuerpo">' + (prox.length ? '<div class="re-lista">' + prox.map((r) => '<a href="#r/' + esc(r.codigo) + '"><span class="re-fecha">' + esc(RE.textoFecha(r.fecha_prevista, true)) + '</span><span><b>' + esc(titulo(r)) + '</b><small>' + esc(r.codigo + ' · ' + RE.referencia(r)) + '</small></span>' + chip(r.estado) + '</a>').join('') + '</div>' : '<div class="ic-vacio">No hay publicaciones con fecha prevista.</div>') + '</div></section></div>' +
      '<section class="ic-bloque"><div class="cab"><h2>Últimas reflexiones modificadas</h2></div><div class="cuerpo">' + (ult.length ? '<div class="re-lista">' + ult.map((r) => '<a href="#r/' + esc(r.codigo) + '"><span class="re-fecha">' + esc(r._modificado ? new Date(r._modificado).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : '') + '</span><span><b>' + esc(titulo(r)) + '</b><small>' + esc(r.codigo + ' · ' + RE.referencia(r) + (r._editor ? ' · ' + r._editor : '')) + '</small></span>' + chip(r.estado) + '</a>').join('') + '</div>' : '<div class="ic-vacio">Todavía no hay reflexiones.' + (RE.puede.editar() ? ' Cree la primera.' : '') + '</div>') + '</div></section>';
    c.querySelectorAll('[data-est]').forEach((a) => { a.onclick = () => { Object.assign(App.filtro, { estado: a.dataset.est, pag: 0 }); }; });
  };

  // =====================================================================
  // BIBLIOTECA EDITORIAL
  // =====================================================================
  let textosCargados = false;
  async function cargarTextos() {
    if (textosCargados) return;
    const con = D.refl.filter((r) => r.tiene_texto && r.contenido === undefined);
    for (let i = 0; i < con.length; i += 6) await Promise.all(con.slice(i, i + 6).map((r) => RE.leer(r).catch(() => null)));
    textosCargados = true;
  }
  App.vistas.biblioteca = function (c) {
    const F = App.filtro, L = visibles();
    const anios = Array.from(new Set(L.map((r) => (fechaPlan(r) || '').slice(0, 4)).filter(Boolean))).sort().reverse();
    const libros = D.libros.filter((l) => L.some((r) => r.libro === l.codigo));
    c.innerHTML = '<div class="re-titulo-fila"><h1 class="ic-titulo">Biblioteca editorial</h1>' + (RE.puede.editar() ? '<a class="ic-btn" href="#nueva">+ Nueva reflexión</a>' : '') + '</div>' +
      '<div class="re-filtros"><input id="fQ" placeholder="Buscar por título, código o palabras del texto" value="' + esc(F.q) + '">' +
      '<select id="fLib"><option value="">Todos los libros</option>' + libros.map((l) => '<option value="' + l.codigo + '"' + (F.libro === l.codigo ? ' selected' : '') + '>' + esc(l.nombre) + '</option>').join('') + '</select>' +
      '<select id="fDim"><option value="">Todas las dimensiones</option>' + D.dims.map((d) => '<option value="' + d.id + '"' + (F.dim === d.id ? ' selected' : '') + '>' + esc(d.nombre) + '</option>').join('') + '</select>' +
      '<select id="fComp"><option value="">Todas las competencias</option>' + U.opcionesHTML(opsComp(), F.comp) + '</select>' +
      (D.rol === 'LECTOR' ? '' : '<select id="fEst"><option value="">Todos los estados</option><option value="REVISION"' + (F.estado === 'REVISION' ? ' selected' : '') + '>Pendientes de revisión</option>' + CFG.estados.map((e) => '<option value="' + e[0] + '"' + (F.estado === e[0] ? ' selected' : '') + '>' + e[1] + '</option>').join('') + '</select>' +
        '<select id="fPub"><option value="">Publicadas y no publicadas</option><option value="SI"' + (F.pub === 'SI' ? ' selected' : '') + '>Publicadas</option><option value="NO"' + (F.pub === 'NO' ? ' selected' : '') + '>No publicadas</option></select>') +
      '<select id="fAnio"><option value="">Todos los años</option>' + anios.map((a) => '<option' + (F.anio === a ? ' selected' : '') + '>' + a + '</option>').join('') + '</select>' +
      '<button class="ic-btn sec chico" id="fLimpiar">Limpiar</button></div><div id="lst"></div>';
    const lst = c.querySelector('#lst');
    async function pintar() {
      const q = U.norm(F.q);
      if (q.length >= 3 && !textosCargados) { lst.innerHTML = '<div class="ic-vacio">Buscando también en los textos…</div>'; await cargarTextos(); }
      const v = L.filter((r) => (!F.libro || r.libro === F.libro) && (!F.dim || r.dimension === F.dim) && (!F.comp || r.competencia === F.comp || RE.lista(r.competencias_sec).indexOf(F.comp) >= 0) &&
        (!F.estado || (F.estado === 'REVISION' ? (r.estado === 'REV_BIBLICA' || r.estado === 'REV_EDITORIAL') : r.estado === F.estado)) &&
        (!F.pub || (F.pub === 'SI') === (r.estado === 'PUBLICADA')) && (!F.anio || (fechaPlan(r) || '').slice(0, 4) === F.anio) &&
        (!q || U.norm([r.codigo, r.titulo, r.titulo_editorial, r.personajes, r.resumen, r.contenido ? RE_WEB.textoPlano(r.contenido) : ''].join(' ')).indexOf(q) >= 0));
      const POR = 50, pags = Math.max(1, Math.ceil(v.length / POR)); if (F.pag >= pags) F.pag = 0;
      const pg = v.slice(F.pag * POR, F.pag * POR + POR);
      lst.innerHTML = '<p class="re-nota">' + v.length.toLocaleString('es-CO') + ' reflexiones' + (v.length !== L.length ? ' de ' + L.length.toLocaleString('es-CO') : '') + '</p>' +
        (pg.length ? '<div class="ic-tabla-caja"><table class="ic-tabla re-tabla"><thead><tr><th>Código</th><th>Título</th><th>Referencia</th><th>Dimensión</th><th>Competencia</th><th>Estado</th><th>Publicación</th></tr></thead><tbody>' +
          pg.map((r) => '<tr data-c="' + esc(r.codigo) + '"><td class="re-cod">' + esc(r.codigo) + '</td><td><b>' + esc(titulo(r)) + '</b>' + (r.titulo_editorial && r.titulo && r.titulo !== r.titulo_editorial ? '<span class="sec">' + esc(r.titulo) + '</span>' : '') + '</td>' +
            '<td>' + esc(RE.referencia(r)) + '</td><td>' + esc(RE.nombreDim(r.dimension)) + '</td><td>' + esc(r.competencia || '') + (!r.competencia && r.etiquetas_origen ? '<span class="sec">Por clasificar</span>' : '') + '</td><td>' + chip(r.estado) + '</td>' +
            '<td>' + esc(r.estado === 'PUBLICADA' ? RE.textoFecha(r.fecha_publicacion) : r.fecha_prevista ? 'Prevista ' + RE.textoFecha(r.fecha_prevista) : '') + '</td></tr>').join('') + '</tbody></table></div>' +
          (pags > 1 ? '<div class="re-pag"><button class="ic-btn sec chico" id="pA"' + (F.pag ? '' : ' disabled') + '>← Anterior</button><span>Página ' + (F.pag + 1) + ' de ' + pags + '</span><button class="ic-btn sec chico" id="pS"' + (F.pag < pags - 1 ? '' : ' disabled') + '>Siguiente →</button></div>' : '')
          : '<div class="ic-vacio">No hay reflexiones con estos filtros.</div>');
      lst.querySelectorAll('tr[data-c]').forEach((tr) => { tr.onclick = () => { location.hash = 'r/' + tr.dataset.c; }; });
      const pa = lst.querySelector('#pA'), ps = lst.querySelector('#pS');
      if (pa) pa.onclick = () => { F.pag--; pintar(); window.scrollTo(0, 0); };
      if (ps) ps.onclick = () => { F.pag++; pintar(); window.scrollTo(0, 0); };
    }
    const set = (id, k) => { const el = c.querySelector(id); if (el) el.onchange = () => { F[k] = el.value; F.pag = 0; pintar(); }; };
    set('#fLib', 'libro'); set('#fDim', 'dim'); set('#fComp', 'comp'); set('#fEst', 'estado'); set('#fPub', 'pub'); set('#fAnio', 'anio');
    let t; c.querySelector('#fQ').oninput = (e) => { clearTimeout(t); t = setTimeout(() => { F.q = e.target.value.trim(); F.pag = 0; pintar(); }, 300); };
    c.querySelector('#fLimpiar').onclick = () => { Object.assign(F, { libro: '', dim: '', comp: '', estado: '', anio: '', pub: '', q: '', pag: 0 }); App.vistas.biblioteca(c); };
    pintar();
  };

  // =====================================================================
  // NUEVA REFLEXIÓN
  // =====================================================================
  App.vistas.nueva = function (c) {
    if (!RE.puede.editar()) { location.hash = 'biblioteca'; return; }
    c.innerHTML = '<a class="ic-volver" href="#biblioteca">← Biblioteca</a><h1 class="ic-titulo">Nueva reflexión</h1>' +
      '<p class="ic-subtitulo">El código RE-XXX-NNN se asigna al crear, según el libro. Lo demás se completa después: puede guardar avances sin llenar todo.</p>' +
      '<form class="ic-form ic-bloque" id="fN" style="padding:18px" novalidate><div class="ic-campos">' +
      U.campo({ name: 'libro', label: 'Libro bíblico', t: 'select', op: D.libros.filter((l) => l.activo).map((l) => [l.codigo, l.nombre + ' (' + l.codigo + ')', l.testamento === 'AT' ? 'Antiguo Testamento' : 'Nuevo Testamento']), req: true, c: 'c4' }) +
      U.campo({ name: 'capitulo', label: 'Capítulo', modo: 'numeric', c: 'c2' }) + U.campo({ name: 'vers_ini', label: 'Versículo inicial', modo: 'numeric', c: 'c2' }) +
      U.campo({ name: 'vers_fin', label: 'Versículo final', modo: 'numeric', c: 'c2' }) + U.campo({ name: 'version_biblica', label: 'Versión', t: 'select', op: CFG.versiones.map((v) => [v, v]), valor: 'RVR1960', c: 'c2' }) +
      U.campo({ name: 'titulo', label: 'Título (de trabajo)', c: 'c8', ph: 'Puede ser provisional' }) + U.campo({ name: 'personajes', label: 'Personaje(s)', c: 'c4' }) +
      '</div><p class="re-nota" id="nCod"></p><div class="ic-acciones"><a class="ic-btn sec" href="#biblioteca">Cancelar</a><button class="ic-btn">Crear y abrir</button></div></form>';
    const f = c.querySelector('#fN');
    f.libro.onchange = () => { const n = D.refl.filter((r) => r.libro === f.libro.value).length; c.querySelector('#nCod').textContent = f.libro.value ? 'Se asignará el siguiente código de ' + RE.nombreLibro(f.libro.value) + ' (hoy hay ' + n + ' registradas en ese libro).' : ''; };
    f.onsubmit = async (e) => {
      e.preventDefault();
      const v = U.leerForm(f);
      if (!U.marcarErrores(f, v.libro ? {} : { libro: 'Elija el libro para asignar el código' })) return;
      try {
        let r; await U.conCarga(f.querySelector('button.ic-btn:not(.sec)'), async () => { r = await RE.crear(v); });
        U.aviso('Reflexión ' + r.codigo + ' creada', 'ok'); location.hash = 'r/' + r.codigo;
      } catch (er) { U.aviso(U.mensajeError(er), 'err', 8000); }
    };
  };

  // =====================================================================
  // FICHA DE LA REFLEXIÓN
  // =====================================================================
  const TABS = [['', 'Ficha'], ['texto', 'Texto'], ['distribucion', 'Distribución'], ['historial', 'Historial']];
  App.vistas.r = async function (c) {
    const r = porCodigo(param(1)), tab = param(2);
    if (!r || (D.rol === 'LECTOR' && r.estado !== 'PUBLICADA')) { c.innerHTML = '<a class="ic-volver" href="#biblioteca">← Biblioteca</a><div class="ic-vacio">No se encontró la reflexión ' + esc(param(1)) + '.</div>'; return; }
    c.innerHTML = '<div class="ic-vacio">Cargando…</div>';
    try { await RE.leer(r); } catch (e) { c.innerHTML = '<div class="ic-alerta">' + esc(U.mensajeError(e)) + '</div>'; return; }
    const lector = !RE.puede.editar();
    c.innerHTML = '<a class="ic-volver" href="#biblioteca">← Biblioteca</a>' +
      '<div class="re-ficha-cab"><div><span class="re-cod grande">' + esc(r.codigo) + '</span> ' + chip(r.estado) + (RE.aprobadaEditorial(r) && ['APROBADA', 'PROGRAMADA', 'PUBLICADA'].indexOf(r.estado) >= 0 ? ' <span class="re-sello">✔ Aprobación editorial</span>' : '') +
      '<h1>' + esc(titulo(r)) + '</h1><p>' + esc(RE.referenciaCompleta(r) || 'Sin referencia') + (r.fecha_prevista && r.estado !== 'PUBLICADA' ? ' · Prevista ' + esc(RE.textoFecha(r.fecha_prevista)) : '') + (r.estado === 'PUBLICADA' ? ' · Publicada ' + esc(RE.textoFecha(r.fecha_publicacion)) : '') + '</p></div>' +
      '<div class="re-acciones" id="acc"></div></div>' +
      (lector ? '' : '<nav class="re-tabs">' + TABS.map((t) => '<a href="#r/' + esc(r.codigo) + (t[0] ? '/' + t[0] : '') + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + '</a>').join('') + '</nav>') +
      '<div id="tabC"></div>';
    pintarAcciones(c.querySelector('#acc'), r, c);
    const t = c.querySelector('#tabC');
    if (lector) return lectura(t, r);
    if (tab === 'texto') return tabTexto(t, r);
    if (tab === 'distribucion') return tabDistribucion(t, r);
    if (tab === 'historial') return tabHistorial(t, r);
    return tabFicha(t, r);
  };
  async function lectura(t, r) {
    const img = r.portada ? await RE.urlPortada(r.portada) : '';
    t.innerHTML = '<article class="re-preview">' + (img ? '<img src="' + img + '" alt="">' : '') + '<h2>' + esc(titulo(r)) + '</h2><p class="ref">' + esc(RE.referenciaCompleta(r)) + '</p><div class="re-lectura">' + RE_EDITOR.limpiar(r.contenido || '') + '</div>' +
      (r.pregunta ? '<div class="re-preg"><span>Una pregunta para llevarse</span><p>' + esc(r.pregunta) + '</p></div>' : '') + '</article>';
  }

  // ---------- Acciones de estado ----------
  async function cambiarEstado(r, nuevo, extra, detalle) {
    const antes = r.estado;
    await RE.guardar(r, Object.assign({ estado: nuevo }, extra || {}), 'Estado: ' + RE.nombreEstado(antes) + ' → ' + RE.nombreEstado(nuevo), detalle || '');
  }
  function pintarAcciones(z, r, c) {
    const b = []; const ed = RE.puede.editar(), ap = RE.puede.aprobar(), h = RE.hoy();
    if (ed) {
      if (r.estado === 'IDEA') b.push(['dev', 'Empezar desarrollo', '']);
      if (r.estado === 'DESARROLLO') b.push(['rev', 'Enviar a revisión bíblica', '']);
      if (r.estado === 'APROBADA') b.push(['prog', 'Programar fecha', '']);
      if (r.estado === 'PROGRAMADA') b.push(['prog', 'Cambiar fecha', 'sec'], ['desprog', 'Quitar programación', 'sec']);
      if ((r.estado === 'APROBADA' || r.estado === 'PROGRAMADA') && (!r.fecha_prevista || r.fecha_prevista <= h)) b.push(['pub', 'Publicar en Colecciones de lectura', 'oro']);
      if (r.estado === 'PUBLICADA') b.push(['tal', 'Actualizar en Colecciones de lectura', 'sec']);
      if (['APROBADA', 'PROGRAMADA', 'PUBLICADA'].indexOf(r.estado) >= 0) b.push(['reab', 'Reabrir para editar', 'sec']);
    }
    if (ap && r.estado === 'REV_BIBLICA') b.push(['apb', 'Aprobar revisión bíblica', ''], ['dvb', 'Devolver', 'sec']);
    if (ap && r.estado === 'REV_EDITORIAL') b.push(['ape', 'Aprobar para publicar', ''], ['dve', 'Devolver', 'sec']);
    if (!ap && ed && (r.estado === 'REV_BIBLICA' || r.estado === 'REV_EDITORIAL')) b.push(['x', 'En revisión: la aprueba un revisor', 'nada']);
    if (ed) {
      b.push(['dup', 'Duplicar como borrador', 'sec']);
      if (r.estado !== 'ARCHIVADA') b.push(['arch', 'Archivar', 'sec']); else b.push(['rest', 'Restaurar', 'sec']);
    }
    if (RE.puede.admin()) b.push(['del', 'Eliminar', 'peligro']);
    if (r.tiene_texto) b.unshift(['pdf', '⬇ PDF', 'sec']);
    z.innerHTML = b.map((x) => x[2] === 'nada' ? '<span class="re-nota">' + x[1] + '</span>' : '<button class="ic-btn chico ' + x[2] + '" data-a="' + x[0] + '">' + x[1] + '</button>').join('');
    const recargar = () => App.vistas.r(c);
    const hacer = async (fn, ok) => { try { await fn(); if (ok) U.aviso(ok, 'ok'); recargar(); } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); } };
    const A = {
      dev: () => hacer(() => cambiarEstado(r, 'DESARROLLO'), 'En desarrollo'),
      rev: async () => {
        if (App.guardarTexto) await App.guardarTexto();
        const f = RE.faltantes(r);
        if (f.length) { U.aviso('Para enviarla a revisión falta: ' + f.join(', ') + '.', 'warn', 8000); return; }
        hacer(() => cambiarEstado(r, 'REV_BIBLICA'), 'Enviada a revisión bíblica');
      },
      apb: () => decision(r, 'BIBLICA', true, recargar), dvb: () => decision(r, 'BIBLICA', false, recargar),
      ape: () => decision(r, 'EDITORIAL', true, recargar), dve: () => decision(r, 'EDITORIAL', false, recargar),
      prog: () => programar(r, recargar),
      desprog: () => hacer(() => cambiarEstado(r, 'APROBADA'), 'Programación retirada'),
      pub: async () => {
        if (!RE.aprobadaEditorial(r)) { U.aviso('No tiene aprobación editorial registrada.', 'err'); return; }
        if (!(await U.confirmar('Publicar en Colecciones de lectura', r.codigo + ' aparecerá en la colección «' + CFG.coleccion.nombre + '» de Colecciones de lectura, visible para todo el personal de IC, con fecha ' + RE.textoFecha(h) + '.\n\nNo se envían correos ni avisos: quien navegue la colección la encontrará.', 'Publicar'))) return;
        hacer(async () => { r.fecha_publicacion = h; await RE.publicarTalento(r); await cambiarEstado(r, 'PUBLICADA', { fecha_publicacion: h }, 'Publicada en Colecciones de lectura'); }, 'Publicada en Colecciones de lectura');
      },
      tal: () => hacer(async () => { await RE.publicarTalento(r); await RE.registrar(r, 'Actualizada en Colecciones de lectura'); }, 'Actualizada en Colecciones de lectura'),
      pdf: async (ev) => { const bt = ev.currentTarget; bt.disabled = true; bt.textContent = 'Generando…'; try { await RE.leer(r); const n = await RE_PDF.generar(r); await RE.registrar(r, 'PDF descargado', n); } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); } bt.disabled = false; bt.textContent = '⬇ PDF'; },
      reab: async () => {
        if (!(await U.confirmar('Reabrir para editar', 'Vuelve a «En desarrollo» y necesitará una nueva aprobación para publicarse.' + (r.estado === 'PUBLICADA' ? '\n\nMientras tanto sale de Colecciones de lectura.' : ''), 'Reabrir'))) return;
        hacer(async () => { if (r.estado === 'PUBLICADA') await RE.retirarTalento(r); await RE.aprobar(r, 'EDITORIAL', 'REABIERTA', 'Reabierta por ' + D.usuario.nombre); await cambiarEstado(r, 'DESARROLLO'); }, 'Reabierta');
      },
      dup: async () => {
        if (!(await U.confirmar('Duplicar como borrador', 'Se crea una reflexión nueva con código propio de ' + RE.nombreLibro(r.libro) + ', en estado «En desarrollo», con los mismos datos y texto. Sin fechas ni aprobaciones.', 'Duplicar'))) return;
        try {
          const f = {}; ['libro', 'capitulo', 'vers_ini', 'vers_fin', 'version_biblica', 'titulo', 'titulo_editorial', 'personajes', 'resumen', 'intro', 'contenido', 'pregunta', 'refs_complementarias', 'principio', 'dimension', 'competencia', 'competencias_sec', 'areas', 'observaciones'].forEach((k) => { if (r[k]) f[k] = r[k]; });
          f.titulo = (r.titulo || r.titulo_editorial || '') + ' (copia)'; f.estado = 'DESARROLLO'; f.tiene_texto = !!r.tiene_texto; f._origen = 'Duplicada de ' + r.codigo;
          const n = await RE.crear(f); U.aviso('Copia creada: ' + n.codigo, 'ok'); location.hash = 'r/' + n.codigo;
        } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); }
      },
      arch: async () => { if (await U.confirmar('Archivar ' + r.codigo, 'Sale del calendario' + (r.estado === 'PUBLICADA' ? ' y de Colecciones de lectura' : '') + '. No se borra y el código no se reutiliza. Se puede restaurar.', 'Archivar')) hacer(async () => { if (r.estado === 'PUBLICADA') await RE.retirarTalento(r); await cambiarEstado(r, 'ARCHIVADA'); }, 'Archivada'); },
      rest: () => hacer(() => cambiarEstado(r, 'DESARROLLO'), 'Restaurada a «En desarrollo»'),
      del: () => eliminar(r)
    };
    z.querySelectorAll('[data-a]').forEach((x) => { x.onclick = A[x.dataset.a]; });
  }
  function decision(r, etapa, aprueba, alFin) {
    const nom = etapa === 'BIBLICA' ? 'revisión bíblica' : 'revisión editorial';
    U.modal((aprueba ? 'Aprobar ' : 'Devolver · ') + nom, '<form class="ic-form" id="fD"><p style="margin-top:0">' + (aprueba ? (etapa === 'BIBLICA' ? 'Pasa a revisión editorial.' : 'Queda aprobada: se puede programar y publicar.') : 'Vuelve a «En desarrollo» con su comentario.') + '</p>' +
      U.campo({ name: 'com', label: aprueba ? 'Comentarios (opcional)' : 'Qué hay que ajustar', t: 'textarea', filas: 4, req: !aprueba }) +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="dNo">Cancelar</button><button class="ic-btn ' + (aprueba ? '' : 'peligro') + '" id="dOk">' + (aprueba ? 'Aprobar' : 'Devolver') + '</button></div></form>', (m) => {
      m.querySelector('#dNo').onclick = U.cerrarModal;
      m.querySelector('#fD').onsubmit = async (e) => {
        e.preventDefault(); const com = m.querySelector('[name=com]').value.trim();
        if (!aprueba && !U.marcarErrores(e.target, com ? {} : { com: 'Escriba qué hay que ajustar' })) return;
        try {
          await U.conCarga(m.querySelector('#dOk'), async () => {
            await RE.aprobar(r, etapa, aprueba ? 'APROBADO' : 'DEVUELTO', com);
            await cambiarEstado(r, aprueba ? (etapa === 'BIBLICA' ? 'REV_EDITORIAL' : 'APROBADA') : 'DESARROLLO', null, (aprueba ? 'Aprobada ' : 'Devuelta en ') + nom + (com ? ': ' + com : ''));
          });
          U.cerrarModal(); U.aviso(aprueba ? 'Aprobada' : 'Devuelta', 'ok'); alFin();
        } catch (er) { U.aviso(U.mensajeError(er), 'err', 8000); }
      };
    });
  }
  function programar(r, alFin) {
    U.modal('Programar ' + r.codigo, '<form class="ic-form" id="fP">' + U.campo({ name: 'fecha', label: 'Fecha de publicación', t: 'date', valor: r.fecha_prevista && r.fecha_prevista >= RE.hoy() ? r.fecha_prevista : '', req: true }) +
      '<p class="re-nota" id="pSem"></p><p class="re-nota">Programar no publica: el día indicado, la reflexión queda lista y alguien la publica en Colecciones de lectura.</p>' +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="pNo">Cancelar</button><button class="ic-btn" id="pOk">Programar</button></div></form>', (m) => {
      const inp = m.querySelector('[name=fecha]'), info = m.querySelector('#pSem');
      inp.oninput = () => { const l = inp.value ? lunes(inp.value) : ''; const otras = l ? D.refl.filter((x) => x !== r && x.estado !== 'ARCHIVADA' && fechaPlan(x) && lunes(fechaPlan(x)) === l) : []; info.textContent = otras.length ? '⚠ Esa semana ya tiene: ' + otras.map((x) => x.codigo).join(', ') + ' (la frecuencia es una por semana).' : ''; };
      m.querySelector('#pNo').onclick = U.cerrarModal;
      m.querySelector('#fP').onsubmit = async (e) => {
        e.preventDefault(); const f = inp.value;
        if (!U.marcarErrores(e.target, !f ? { fecha: 'Elija la fecha' } : f < RE.hoy() ? { fecha: 'La fecha ya pasó' } : {})) return;
        try { await U.conCarga(m.querySelector('#pOk'), () => (r.estado === 'PROGRAMADA' ? RE.guardar(r, { fecha_prevista: f }, 'Fecha cambiada', RE.textoFecha(f)) : cambiarEstado(r, 'PROGRAMADA', { fecha_prevista: f }, 'Para el ' + RE.textoFecha(f)))); U.cerrarModal(); U.aviso('Programada para el ' + RE.textoFecha(f), 'ok'); alFin(); }
        catch (er) { U.aviso(U.mensajeError(er), 'err', 8000); }
      };
    });
  }
  async function eliminar(r) {
    U.modal('Eliminar ' + r.codigo, '<form class="ic-form" id="fE"><p style="margin-top:0">Se borra la reflexión de forma permanente (el historial queda). El código <b>' + esc(r.codigo) + '</b> no se reutiliza.<br>Si solo quiere sacarla de circulación, use <b>Archivar</b>.</p>' +
      U.campo({ name: 'conf', label: 'Para confirmar, escriba el código ' + r.codigo }) +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="eNo">Cancelar</button><button class="ic-btn peligro" id="eOk">Eliminar definitivamente</button></div></form>', (m) => {
      m.querySelector('#eNo').onclick = U.cerrarModal;
      m.querySelector('#fE').onsubmit = async (e) => {
        e.preventDefault();
        if (!U.marcarErrores(e.target, m.querySelector('[name=conf]').value.trim().toUpperCase() === r.codigo ? {} : { conf: 'El código no coincide' })) return;
        try { await U.conCarga(m.querySelector('#eOk'), async () => { if (r.estado === 'PUBLICADA') await RE.retirarTalento(r); await RE.eliminar(r); }); U.cerrarModal(); U.aviso(r.codigo + ' eliminada', 'ok'); location.hash = 'biblioteca'; }
        catch (er) { U.aviso(U.mensajeError(er), 'err', 8000); }
      };
    });
  }

  // ---------- Pestaña Ficha ----------
  async function tabFicha(t, r) {
    const ed = RE.puede.editar(), sec = RE.lista(r.competencias_sec), areas = RE.lista(r.areas);
    const compOps = opsComp();
    // Competencia guardada que no está en el catálogo: se muestra para no perderla
    const conActual = (v) => v && !compOps.some((o) => o[0] === v) ? compOps.concat([[v, v + ' (fuera del catálogo)', 'Otras']]) : compOps;
    t.innerHTML = '<form class="ic-form" id="fF" novalidate>' +
      '<section class="ic-bloque"><div class="cab"><h2>Identificación</h2></div><div class="cuerpo"><div class="ic-campos">' +
      '<div class="ic-campo c3"><label>Código</label><input value="' + esc(r.codigo) + '" readonly></div>' +
      '<div class="ic-campo c3"><label>Libro bíblico</label><input value="' + esc(RE.nombreLibro(r.libro)) + '" readonly title="El libro define el código y no se cambia. Si se equivocó de libro, duplique la reflexión en el libro correcto."></div>' +
      U.campo({ name: 'capitulo', label: 'Capítulo', valor: r.capitulo, c: 'c2', modo: 'numeric' }) + U.campo({ name: 'vers_ini', label: 'Vers. inicial', valor: r.vers_ini, c: 'c2' }) + U.campo({ name: 'vers_fin', label: 'Vers. final', valor: r.vers_fin, c: 'c2' }) +
      U.campo({ name: 'version_biblica', label: 'Versión bíblica', t: 'select', op: CFG.versiones.concat(r.version_biblica && CFG.versiones.indexOf(r.version_biblica) < 0 ? [r.version_biblica] : []).map((v) => [v, v]), valor: r.version_biblica, c: 'c3' }) +
      U.campo({ name: 'titulo', label: 'Título (de trabajo)', valor: r.titulo, c: 'c6' }) + U.campo({ name: 'personajes', label: 'Personaje(s)', valor: r.personajes, c: 'c3' }) +
      '<div class="ic-campo c3"><label>Fecha de creación</label><input value="' + esc(RE.textoFecha(r.fecha_creacion)) + '" readonly></div>' +
      (r.resumen || r.etiquetas_origen ? '<div class="ic-campo c12"><label>Del plan inicial (hoja BD)</label><div class="re-origen">' + esc(r.resumen || '') + (r.etiquetas_origen ? '<br><small>Clasificación original: ' + esc(r.etiquetas_origen) + '</small>' : '') + '</div></div>' : '') +
      '</div></div></section>' +
      '<section class="ic-bloque"><div class="cab"><h2>Clasificación</h2></div><div class="cuerpo"><div class="ic-campos">' +
      U.campo({ name: 'dimension', label: 'Dimensión principal', t: 'select', op: D.dims.map((d) => [d.id, d.nombre]), valor: r.dimension, c: 'c4' }) +
      U.campo({ name: 'competencia', label: 'Competencia principal', t: 'select', op: conActual(r.competencia), valor: r.competencia, c: 'c4' }) +
      U.campo({ name: 'sec1', label: 'Competencia secundaria 1', t: 'select', op: conActual(sec[0]), valor: sec[0], vacio: '— Ninguna —', c: 'c2' }) +
      U.campo({ name: 'sec2', label: 'Competencia secundaria 2', t: 'select', op: conActual(sec[1]), valor: sec[1], vacio: '— Ninguna —', c: 'c2' }) +
      '<div class="ic-campo c12"><label>Áreas de aplicación</label><div class="re-checks">' + CFG.areas.map((a) => '<label class="ic-check"><input type="checkbox" data-area="' + esc(a) + '"' + (areas.indexOf(a) >= 0 ? ' checked' : '') + '> <span>' + esc(a) + '</span></label>').join('') + '</div></div>' +
      '</div><p class="re-nota" id="dimAyuda"></p></div></section>' +
      '<section class="ic-bloque"><div class="cab"><h2>Contenido</h2><span class="espacio"></span><a class="ic-btn sec chico" href="#r/' + esc(r.codigo) + '/texto">Abrir el editor del texto →</a></div><div class="cuerpo"><div class="ic-campos">' +
      U.campo({ name: 'titulo_editorial', label: 'Título editorial (el que verá el lector)', valor: r.titulo_editorial, c: 'c8' }) +
      '<div class="ic-campo c4"><label>Referencia bíblica</label><input id="refAuto" value="' + esc(RE.referenciaCompleta(r)) + '" readonly></div>' +
      U.campo({ name: 'pregunta', label: 'Pregunta final para el lector', t: 'textarea', filas: 2, valor: r.pregunta, c: 'c12' }) +
      U.campo({ name: 'principio', label: 'Principio estratégico central (ficha interna)', t: 'textarea', filas: 2, valor: r.principio, c: 'c6' }) +
      U.campo({ name: 'refs_complementarias', label: 'Referencias bíblicas complementarias', t: 'textarea', filas: 2, valor: r.refs_complementarias, c: 'c6' }) +
      U.campo({ name: 'intro', label: 'Breve introducción (tarjeta de la biblioteca web, máx. 220 caracteres)', t: 'textarea', filas: 2, valor: r.intro, c: 'c8' }) +
      '<div class="ic-campo c4"><label>Imagen de portada</label><div class="re-portada" id="port">' + (r.portada ? '<span class="re-nota">Cargando…</span>' : '<span class="re-nota">Sin imagen</span>') + '</div>' + (ed ? '<input type="file" id="fPort" accept="image/*" hidden><button type="button" class="ic-btn sec chico" id="bPort">' + (r.portada ? 'Cambiar imagen' : 'Subir imagen') + '</button>' : '') + '</div>' +
      '</div></div></section>' +
      '<section class="ic-bloque"><div class="cab"><h2>Gestión</h2></div><div class="cuerpo"><div class="ic-campos">' +
      '<div class="ic-campo c3"><label>Estado editorial</label><div style="padding-top:6px">' + chip(r.estado) + '</div><span class="ayuda">Se cambia con los botones de arriba.</span></div>' +
      U.campo({ name: 'fecha_prevista', label: 'Fecha prevista de publicación', t: 'date', valor: r.fecha_prevista, c: 'c3' }) +
      '<div class="ic-campo c3"><label>Fecha real de publicación</label><input value="' + esc(RE.textoFecha(r.fecha_publicacion)) + '" readonly></div>' +
      '<div class="ic-campo c3"><label>Autor</label><input value="' + esc(r.autor || '') + '" readonly></div>' +
      U.campo({ name: 'observaciones', label: 'Observaciones internas (no se publican)', t: 'textarea', filas: 3, valor: r.observaciones, c: 'c12' }) +
      '</div></div></section>' +
      (ed ? '<div class="re-guardar"><span class="re-nota" id="gEst"></span><button class="ic-btn" id="bG">Guardar</button></div>' : '') + '</form>';
    const f = t.querySelector('#fF');
    if (!ed) f.querySelectorAll('input,select,textarea').forEach((x) => { x.disabled = true; });
    const ayudaDim = () => { const d = RE.dim(f.dimension.value); t.querySelector('#dimAyuda').textContent = d ? d.nombre + ': ' + d.descripcion : ''; };
    f.dimension.onchange = ayudaDim; ayudaDim();
    f.competencia.onchange = () => { const cc = D.comps.find((x) => x.nombre === f.competencia.value); if (cc && !f.dimension.value) { f.dimension.value = cc.dimension; ayudaDim(); } };
    const actRef = () => { t.querySelector('#refAuto').value = RE.referenciaCompleta(Object.assign({}, r, { capitulo: f.capitulo.value.trim(), vers_ini: f.vers_ini.value.trim(), vers_fin: f.vers_fin.value.trim(), version_biblica: f.version_biblica.value })); };
    ['capitulo', 'vers_ini', 'vers_fin', 'version_biblica'].forEach((k) => { f[k].addEventListener('input', actRef); f[k].addEventListener('change', actRef); });
    if (r.portada) RE.urlPortada(r.portada).then((u) => { t.querySelector('#port').innerHTML = u ? '<img src="' + u + '" alt="">' : '<span class="re-nota">No se pudo cargar</span>'; });
    if (!ed) return;
    t.querySelector('#bPort').onclick = () => t.querySelector('#fPort').click();
    t.querySelector('#fPort').onchange = async (e) => {
      let a = e.target.files[0]; if (!a) return;
      try {
        if (typeof IC.comprimir === 'function') a = await IC.comprimir(a, { formato: 'jpg', calidad: 0.85, maxAncho: 1600, maxAlto: 1600 }).then((x) => x.file).catch(() => a);
        if (a.size > 3.9 * 1024 * 1024) { U.aviso('La imagen pesa más de 4 MB. Redúzcala e intente de nuevo.', 'warn'); return; }
        t.querySelector('#port').innerHTML = '<span class="re-nota">Subiendo…</span>';
        const ruta = await RE.subirPortada(r, a);
        await RE.guardar(r, { portada: ruta }, 'Imagen de portada', ruta);
        U.aviso('Imagen guardada', 'ok'); tabFicha(t, r);
      } catch (er) { U.aviso(U.mensajeError(er), 'err', 8000); }
    };
    f.onsubmit = async (e) => {
      e.preventDefault();
      const v = U.leerForm(f), err = {};
      if (v.sec1 && v.sec1 === v.competencia) err.sec1 = 'Ya es la competencia principal';
      if (v.sec2 && (v.sec2 === v.competencia || v.sec2 === v.sec1)) err.sec2 = 'Repetida';
      if (v.intro.length > 220) err.intro = 'Máximo 220 caracteres (' + v.intro.length + ')';
      if (v.vers_ini && v.vers_fin && Number(v.vers_fin) < Number(v.vers_ini)) err.vers_fin = 'Menor que el inicial';
      if (!U.marcarErrores(f, err)) return;
      const campos = { capitulo: v.capitulo, vers_ini: v.vers_ini, vers_fin: v.vers_fin, version_biblica: v.version_biblica, titulo: v.titulo, personajes: v.personajes, dimension: v.dimension, competencia: v.competencia,
        competencias_sec: [v.sec1, v.sec2].filter(Boolean).join(';'), areas: Array.from(f.querySelectorAll('[data-area]')).filter((x) => x.checked).map((x) => x.dataset.area).join(';'),
        titulo_editorial: v.titulo_editorial, pregunta: v.pregunta, principio: v.principio, refs_complementarias: v.refs_complementarias, intro: v.intro, fecha_prevista: v.fecha_prevista, observaciones: v.observaciones };
      const cambios = Object.keys(campos).filter((k) => String(campos[k] || '') !== String(r[k] || ''));
      if (!cambios.length) { U.aviso('Sin cambios', 'ok'); return; }
      if ('fecha_prevista' in campos && r.estado === 'PROGRAMADA' && campos.fecha_prevista !== r.fecha_prevista && (!campos.fecha_prevista || campos.fecha_prevista < RE.hoy())) { U.marcarErrores(f, { fecha_prevista: 'Programada: elija una fecha futura (o quite la programación)' }); return; }
      const sub = {}; cambios.forEach((k) => { sub[k] = campos[k]; });
      try { await U.conCarga(t.querySelector('#bG'), () => RE.guardar(r, sub, 'Ficha actualizada', cambios.join(', '))); U.aviso('Guardado', 'ok'); App.vistas.r(document.getElementById('contenido')); }
      catch (er) { U.aviso(U.mensajeError(er), 'err', 8000); }
    };
  }

  // ---------- Pestaña Texto (editor narrativo) ----------
  function textoParaClaude(r) {
    const p = RE.promptVigente('PROMPT_MAESTRO'), base = p ? p.texto : RE_PROMPTS.maestro;
    const datos = { 'Código': r.codigo, 'Pasaje bíblico': RE.referencia(r) || '[INDICAR]', 'Versión bíblica': r.version_biblica || '[INDICAR]', 'Título provisional (opcional)': r.titulo_editorial || r.titulo || '',
      'Documento o material de referencia (si existe)': [r.personajes ? 'Personajes: ' + r.personajes : '', r.resumen ? 'Resumen del relato: ' + r.resumen : '', r.dimension ? 'Dimensión sugerida: ' + RE.nombreDim(r.dimension) : '', r.competencia ? 'Competencia sugerida: ' + r.competencia : '', r.etiquetas_origen ? 'Clasificación del plan inicial: ' + r.etiquetas_origen : '', r.principio ? 'Principio a explorar: ' + r.principio : ''].filter(Boolean).join(' · ') || 'No hay' };
    let s = base, usados = 0;
    Object.keys(datos).forEach((k) => { const re = new RegExp('(' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':\\s*)\\[[^\\]]*\\]'); if (re.test(s)) { s = s.replace(re, '$1' + datos[k]); usados++; } });
    if (!usados) s += '\n\nDATOS DE LA NUEVA REFLEXIÓN\n' + Object.keys(datos).map((k) => '• ' + k + ': ' + datos[k]).join('\n');
    return s + '\n\nFORMATO DE ENTREGA (para cargarla en la app sin copiar campo por campo):\n' +
      '1. Escribe la línea === TEXTO === y debajo solo la historia narrada con la reflexión integrada, en Markdown (## para subtítulos solo si ayudan a la lectura, **negrita**, *cursiva*, > para una cita destacada). Sin título, sin referencia, sin pregunta final y sin la ficha.\n' +
      '2. Escribe la línea === FIN TEXTO ===\n' +
      '3. Luego la ficha editorial como un bloque JSON con estas claves exactas: {"titulo_editorial": "", "pregunta": "", "dimension": "una de las seis dimensiones", "competencia": "", "competencias_secundarias": ["", ""], "areas": ["solo de: ' + CFG.areas.join(', ') + '"], "principio": "", "referencias_complementarias": "", "intro": "máximo 220 caracteres, para la tarjeta de la biblioteca web"}.\n' +
      'Competencias del catálogo: ' + D.comps.filter((c) => c.activo).map((c) => c.nombre).join(', ') + '.';
  }
  async function copiar(texto, ok) {
    try { await navigator.clipboard.writeText(texto); U.aviso(ok || 'Copiado', 'ok'); }
    catch (e) { U.modal('Copiar', '<div class="ic-form"><textarea style="width:100%;height:50vh">' + esc(texto) + '</textarea><p class="re-nota">Seleccione todo (Ctrl+A) y copie (Ctrl+C).</p></div>'); }
  }
  App.copiar = copiar;
  // Lee la respuesta completa de Claude: texto entre === TEXTO === y === FIN TEXTO === + ficha en JSON. Llena texto, pregunta, título y la ficha.
  function leerRespuesta(txt) {
    const out = { avisos: [] };
    const m = /={2,}\s*TEXTO\s*={2,}([\s\S]*?)={2,}\s*FIN TEXTO\s*={2,}/i.exec(txt);
    if (m) out.texto = m[1].trim();
    const ji = txt.indexOf('{', m ? m.index + m[0].length : 0), jf = txt.lastIndexOf('}');
    if (ji >= 0 && jf > ji) { try { out.ficha = JSON.parse(txt.slice(ji, jf + 1)); } catch (e) { out.avisos.push('La ficha (JSON) no se pudo leer; complétela a mano.'); } }
    if (!m && !out.ficha) { out.texto = txt.trim(); out.avisos.push('No vi las marcas === TEXTO ===: se pegó todo como texto. Revise y quite lo que no sea la historia.'); }
    return out;
  }
  function aplicarFicha(f, r) {
    const c = {}, av = [], N = (x) => U.norm(String(x || '').trim());
    const dimx = D.dims.find((d) => N(d.nombre) === N(f.dimension)); if (dimx) c.dimension = dimx.id; else if (f.dimension) av.push('Dimensión «' + f.dimension + '» no está en el catálogo');
    const comp = (x) => (D.comps.find((y) => N(y.nombre) === N(x)) || {}).nombre;
    if (f.competencia) { if (comp(f.competencia)) c.competencia = comp(f.competencia); else av.push('Competencia «' + f.competencia + '» no está en el catálogo'); }
    const secs = [].concat(f.competencias_secundarias || []).map((x) => { const v = comp(x); if (!v && x) av.push('Secundaria «' + x + '» no está en el catálogo'); return v; }).filter((x) => x && x !== c.competencia).slice(0, 2);
    if (secs.length) c.competencias_sec = secs.join(';');
    const areas = [].concat(f.areas || []).map((x) => CFG.areas.find((a) => N(a) === N(x))).filter(Boolean);
    if (areas.length) c.areas = areas.join(';');
    if (f.principio) c.principio = String(f.principio);
    if (f.referencias_complementarias) c.refs_complementarias = Array.isArray(f.referencias_complementarias) ? f.referencias_complementarias.join('\n') : String(f.referencias_complementarias);
    if (f.intro) c.intro = String(f.intro).slice(0, 220);
    return { campos: c, avisos: av };
  }
  function pegarRespuesta(r, edi, preg, tit, marcar) {
    U.modal('Pegar respuesta de Claude · ' + r.codigo, '<div class="ic-form"><p style="margin-top:0" class="re-nota">Use el botón <b>Copiar</b> de la respuesta de Claude y péguela completa aquí. La app pone la historia en el editor, la pregunta y el título a la derecha, y la ficha (clasificación, áreas, principio, referencias e introducción) en la pestaña Ficha.</p>' +
      '<textarea id="rT" style="width:100%;height:45vh;font:13px/1.5 Consolas,monospace"></textarea>' +
      (edi.html() && RE_EDITOR.palabras(edi.html()) > 20 ? '<p class="re-nota">⚠ El editor ya tiene texto: será reemplazado (queda la versión anterior en el historial).</p>' : '') +
      '<div class="ic-acciones"><button class="ic-btn sec" id="rNo">Cancelar</button><button class="ic-btn" id="rOk">Cargar</button></div></div>', (m) => {
      document.querySelector('.ic-modal').classList.add('re-modal-ancho');
      m.querySelector('#rNo').onclick = U.cerrarModal;
      m.querySelector('#rOk').onclick = async () => {
        const txt = m.querySelector('#rT').value; if (!txt.trim()) return;
        const R = leerRespuesta(txt), av = R.avisos.slice();
        if (R.texto) edi.poner(RE_EDITOR.desdeTexto(R.texto));
        let campos = {};
        if (R.ficha) {
          if (R.ficha.pregunta) preg.value = String(R.ficha.pregunta);
          if (R.ficha.titulo_editorial) tit.value = String(R.ficha.titulo_editorial);
          const A = aplicarFicha(R.ficha, r); campos = A.campos; av.push(...A.avisos);
        }
        marcar();
        const b = m.querySelector('#rOk'); b.disabled = true; b.textContent = 'Guardando…';
        try {
          if (App.guardarTexto) await App.guardarTexto();
          if (Object.keys(campos).length) await RE.guardar(r, campos, 'Ficha desde la respuesta de Claude', Object.keys(campos).join(', '));
          U.cerrarModal();
          U.aviso('Respuesta cargada y guardada' + (av.length ? '. Revise: ' + av.join(' · ') : ''), av.length ? 'warn' : 'ok', av.length ? 12000 : 5000);
        } catch (e) { U.aviso(U.mensajeError(e), 'err', 9000); b.disabled = false; b.textContent = 'Cargar'; }
      };
    });
  }
  function tabTexto(t, r) {
    const ed = RE.puede.editar() && RE.editableTexto(r);
    t.innerHTML = '<div class="re-texto-cab"><div class="re-nota">' + (ed ? 'Tres elementos visibles: título y referencia (en la ficha), la historia narrada con la reflexión integrada (aquí) y una pregunta para llevarse. Pegue desde Word, Claude o ChatGPT: el formato se limpia solo.' : 'El texto no se puede editar en estado «' + esc(RE.nombreEstado(r.estado)) + '». ' + (RE.puede.editar() ? 'Use «Reabrir para editar».' : '')) + '</div>' +
      '<div class="re-texto-bot">' + (RE.puede.editar() ? '<button class="ic-btn sec chico" id="bPrompt">Copiar prompt para Claude</button>' + (ed ? '<button class="ic-btn chico" id="bResp">Pegar respuesta de Claude</button>' : '') : '') + '<button class="ic-btn sec chico" id="bVista">Vista previa de lectura</button></div></div>' +
      '<div class="re-texto"><div id="ed"></div><aside class="re-lado"><label>Pregunta para llevarse</label><textarea id="tPreg" rows="4"' + (ed ? '' : ' disabled') + '>' + esc(r.pregunta || '') + '</textarea>' +
      '<label>Título editorial</label><input id="tTit" value="' + esc(r.titulo_editorial || '') + '"' + (ed ? '' : ' disabled') + '><p class="re-nota">' + esc(RE.referenciaCompleta(r)) + '</p>' +
      (ed ? '<button class="ic-btn" id="bGT">Guardar texto</button><p class="re-nota" id="gInfo">' + (r._modificado ? 'Última modificación: ' + esc(new Date(r._modificado).toLocaleString('es-CO')) : '') + '</p><p class="re-nota">Se guarda solo cada 2 minutos y al salir. Cada guardado queda en el historial de versiones.</p>' : '') + '</aside></div>';
    const edi = RE_EDITOR.montar(t.querySelector('#ed'), { html: r.contenido || '', soloLectura: !ed });
    App.editor = edi;
    const preg = t.querySelector('#tPreg'), tit = t.querySelector('#tTit');
    let extraSucio = false; [preg, tit].forEach((x) => x.addEventListener('input', () => { extraSucio = true; }));
    const br = t.querySelector('#bResp'); if (br) br.onclick = () => pegarRespuesta(r, edi, preg, tit, () => { extraSucio = true; });
    const bp = t.querySelector('#bPrompt'); if (bp) bp.onclick = () => copiar(textoParaClaude(r), 'Prompt maestro con los datos de ' + r.codigo + ' copiado. Péguelo en Claude y luego pegue aquí la respuesta.');
    t.querySelector('#bVista').onclick = () => {
      const html = edi.html();
      U.modal('Vista previa · ' + r.codigo, '<article class="re-preview"><h2>' + esc(tit.value || titulo(r)) + '</h2><p class="ref">' + esc(RE.referenciaCompleta(r)) + '</p><div class="re-lectura">' + html + '</div>' +
        (preg.value.trim() ? '<div class="re-preg"><span>Una pregunta para llevarse</span><p>' + esc(preg.value.trim()) + '</p></div>' : '') + '<p class="re-nota">' + RE_EDITOR.palabras(html).toLocaleString('es-CO') + ' palabras</p></article>');
      document.querySelector('.ic-modal').classList.add('re-modal-ancho');
    };
    if (!ed) { App.guardarTexto = null; return; }
    async function guardarTexto(auto) {
      if (!edi.sucio() && !extraSucio) return;
      const html = edi.html();
      const campos = { contenido: html };
      if (preg.value.trim() !== String(r.pregunta || '')) campos.pregunta = preg.value.trim();
      if (tit.value.trim() !== String(r.titulo_editorial || '')) campos.titulo_editorial = tit.value.trim();
      try {
        await RE.guardar(r, campos, auto ? 'Texto guardado (automático)' : 'Texto guardado', RE_EDITOR.palabras(html) + ' palabras');
        edi.limpio(); extraSucio = false;
        const gi = document.getElementById('gInfo'); if (gi) gi.textContent = 'Guardado ' + new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
        if (!auto) U.aviso('Texto guardado', 'ok');
      } catch (e) { U.aviso((auto ? 'No se pudo guardar automáticamente: ' : '') + U.mensajeError(e), 'err', 9000); throw e; }
    }
    App.guardarTexto = () => guardarTexto(true);
    t.querySelector('#bGT').onclick = async (e) => { const b = e.currentTarget; b.disabled = true; try { await guardarTexto(false); } catch (x) { /* avisado */ } b.disabled = false; };
  }
  setInterval(() => { if (App.guardarTexto && location.hash.indexOf('/texto') > 0) App.guardarTexto().catch(() => {}); }, 120000);
  window.addEventListener('beforeunload', (e) => { if (App.editor && App.editor.sucio && App.editor.sucio()) { e.preventDefault(); e.returnValue = ''; } });

  // ---------- Pestaña Distribución ----------
  async function tabDistribucion(t, r) {
    t.innerHTML = '<div class="ic-vacio">Cargando…</div>';
    let ex; try { ex = await RE.distribucion(r); } catch (e) { t.innerHTML = '<div class="ic-alerta">' + esc(U.mensajeError(e)) + '</div>'; return; }
    const ap = ['APROBADA', 'PROGRAMADA', 'PUBLICADA'].indexOf(r.estado) >= 0;
    const pieza = (k) => (ex.find((x) => x.tipo === 'PIEZA' && x.clave === k) || {}).texto || (k === 'COMPLETA' ? '' : '');
    const canal = (k) => ex.find((x) => x.tipo === 'CANAL' && x.clave === k) || {};
    t.innerHTML = (ap ? '' : '<div class="ic-alerta chica">Puede preparar los textos desde ya, pero solo una reflexión aprobada se debe programar o publicar en los canales.</div>') +
      '<div class="re-texto-cab"><div class="re-nota">La app no publica en redes (no hay integraciones autorizadas): prepare, copie y marque cada canal. Para generar las adaptaciones con IA: copie el prompt, péguelo en Claude y pegue aquí el JSON que responde.</div>' +
      '<div class="re-texto-bot"><button class="ic-btn sec chico" id="bPA">Copiar prompt de adaptaciones</button><button class="ic-btn sec chico" id="bJSON">Pegar respuesta de Claude (JSON)</button></div></div>' +
      '<section class="ic-bloque"><div class="cab"><h2>Canales</h2></div><div class="cuerpo"><div class="ic-tabla-caja"><table class="ic-tabla"><thead><tr><th>Canal</th><th>Pieza que usa</th><th>Estado</th><th>Fecha</th><th></th></tr></thead><tbody>' +
      CFG.canales.map((k) => { const cn = canal(k[0]); return '<tr><td><b>' + esc(k[1]) + '</b></td><td>' + esc((CFG.piezas.find((p) => p[0] === k[2]) || [0, ''])[1]) + '</td>' +
        '<td><select data-ce="' + k[0] + '">' + U.opcionesHTML(CFG.estadosCanal, cn.estado || 'PENDIENTE') + '</select></td><td><input type="date" data-cf="' + k[0] + '" value="' + esc(RE.dia(cn.fecha)) + '"></td>' +
        '<td><button class="ic-btn sec chico" data-cg="' + k[0] + '">Guardar</button>' + (cn.actualizado_por ? '<span class="sec">' + esc(cn.actualizado_por) + '</span>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div></div></section>' +
      '<div class="re-piezas">' + CFG.piezas.map((p) => p[0] === 'COMPLETA' ? '<section class="ic-bloque re-pieza"><div class="cab"><h2>' + esc(p[1]) + '</h2></div><div class="cuerpo"><p class="re-nota">Es el texto de la pestaña «Texto»: título, referencia, historia y pregunta.</p><button class="ic-btn sec chico" id="cpComp">Copiar publicación completa</button></div></section>' :
        '<section class="ic-bloque re-pieza"><div class="cab"><h2>' + esc(p[1]) + '</h2><span class="espacio"></span><span class="re-nota" data-n="' + p[0] + '"></span></div><div class="cuerpo"><textarea data-p="' + p[0] + '" rows="' + (p[0] === 'FRASE' || p[0] === 'PREGUNTA' ? 3 : 8) + '">' + esc(pieza(p[0])) + '</textarea>' +
        '<div class="re-pieza-bot"><button class="ic-btn sec chico" data-cp="' + p[0] + '">Copiar</button><button class="ic-btn chico" data-gp="' + p[0] + '">Guardar</button></div></div></section>').join('') + '</div>';
    const cuenta = (ta) => { const n = t.querySelector('[data-n="' + ta.dataset.p + '"]'); if (n) n.textContent = ta.value.length.toLocaleString('es-CO') + ' caracteres'; };
    t.querySelectorAll('[data-p]').forEach((ta) => { cuenta(ta); ta.oninput = () => cuenta(ta); });
    t.querySelectorAll('[data-cp]').forEach((b) => { b.onclick = () => copiar(t.querySelector('[data-p="' + b.dataset.cp + '"]').value); });
    t.querySelectorAll('[data-gp]').forEach((b) => { b.onclick = async () => {
      const k = b.dataset.gp; try { await U.conCarga(b, () => RE.guardarDist(r, ex, 'PIEZA', k, { texto: t.querySelector('[data-p="' + k + '"]').value, estado: 'PREPARADO' })); await RE.registrar(r, 'Distribución', 'Pieza «' + (CFG.piezas.find((p) => p[0] === k) || [])[1] + '» guardada'); U.aviso('Guardado', 'ok'); }
      catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); } }; });
    t.querySelectorAll('[data-cg]').forEach((b) => { b.onclick = async () => {
      const k = b.dataset.cg, est = t.querySelector('[data-ce="' + k + '"]').value, f = t.querySelector('[data-cf="' + k + '"]').value;
      if (!ap && (est === 'PROGRAMADO' || est === 'PUBLICADO')) { U.aviso('Primero debe estar aprobada (aprobación editorial).', 'warn'); return; }
      try { await U.conCarga(b, () => RE.guardarDist(r, ex, 'CANAL', k, { estado: est, fecha: f })); await RE.registrar(r, 'Distribución', (CFG.canales.find((x) => x[0] === k) || [])[1] + ': ' + (CFG.estadosCanal.find((x) => x[0] === est) || [])[1] + (f ? ' · ' + RE.textoFecha(f) : '')); U.aviso('Canal actualizado', 'ok'); }
      catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); } }; });
    t.querySelector('#cpComp').onclick = () => copiar((r.titulo_editorial || r.titulo || '') + '\n' + RE.referenciaCompleta(r) + '\n\n' + RE_WEB.textoPlano(String(r.contenido || '').replace(/<\/(p|h2|h3|blockquote)>/g, '\n\n').replace(/<br>/g, '\n')).replace(/ ?\n ?/g, '\n') + (r.pregunta ? '\n\n' + r.pregunta : ''));
    t.querySelector('#bPA').onclick = () => {
      const p = RE.promptVigente('PROMPT_ADAPTACIONES'), base = p ? p.texto : RE_PROMPTS.adaptaciones;
      copiar(base + '\nTítulo: ' + (r.titulo_editorial || r.titulo || '') + '\nReferencia: ' + RE.referenciaCompleta(r) + '\n\n' + RE_WEB.textoPlano(String(r.contenido || '').replace(/<\/(p|h2|h3|blockquote)>/g, '\n\n')) + '\n\nPregunta final: ' + (r.pregunta || ''), 'Prompt de adaptaciones copiado');
    };
    t.querySelector('#bJSON').onclick = () => U.modal('Pegar respuesta de Claude', '<div class="ic-form"><textarea id="jT" style="width:100%;height:40vh" placeholder="{ &quot;LINKEDIN&quot;: &quot;…&quot;, … }"></textarea><div class="ic-acciones"><button class="ic-btn sec" id="jNo">Cancelar</button><button class="ic-btn" id="jOk">Llenar las piezas</button></div></div>', (m) => {
      m.querySelector('#jNo').onclick = U.cerrarModal;
      m.querySelector('#jOk').onclick = () => {
        let o; const s = m.querySelector('#jT').value; try { o = JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1)); } catch (e) { U.aviso('No es un JSON válido. Copie solo el bloque { … } que respondió Claude.', 'err', 7000); return; }
        let n = 0; Object.keys(o).forEach((k) => { const ta = t.querySelector('[data-p="' + k.toUpperCase() + '"]'); if (ta && o[k]) { ta.value = String(o[k]); cuenta(ta); n++; } });
        U.cerrarModal();
        if (o.INTRO && !r.intro) RE.guardar(r, { intro: String(o.INTRO).slice(0, 220) }, 'Introducción web desde adaptaciones').catch(() => {});
        U.aviso(n + ' piezas llenadas. Revíselas y guarde cada una.', 'ok', 6000);
      };
    });
  }

  // ---------- Pestaña Historial ----------
  async function tabHistorial(t, r) {
    t.innerHTML = '<div class="ic-vacio">Cargando…</div>';
    let h = [], v = [];
    try { [h, v] = await Promise.all([RE.historial(r), RE.versiones(r).catch(() => [])]); } catch (e) { t.innerHTML = '<div class="ic-alerta">' + esc(U.mensajeError(e)) + '</div>'; return; }
    const ap = RE.aprobacionesDe(r);
    const DEC = { APROBADO: 'Aprobó', DEVUELTO: 'Devolvió', REABIERTA: 'Reabierta' };
    t.innerHTML = '<div class="re-cols"><section class="ic-bloque"><div class="cab"><h2>Historial editorial</h2></div><div class="cuerpo">' + (h.length ? '<div class="re-hist">' + h.map((x) => '<div><span>' + esc(new Date(x.fecha_hora).toLocaleString('es-CO')) + '</span><b>' + esc(x.accion) + '</b>' + (x.detalle ? '<small>' + esc(x.detalle) + '</small>' : '') + '<em>' + esc(x.usuario || '') + '</em></div>').join('') + '</div>' : '<div class="ic-vacio">Sin movimientos.</div>') + '</div></section>' +
      '<div><section class="ic-bloque"><div class="cab"><h2>Aprobaciones</h2></div><div class="cuerpo">' + (ap.length ? '<div class="re-hist">' + ap.map((x) => '<div><span>' + esc(new Date(x.fecha_hora).toLocaleString('es-CO')) + '</span><b>' + esc((DEC[x.decision] || x.decision) + ' · ' + (x.etapa === 'BIBLICA' ? 'revisión bíblica' : 'revisión editorial')) + '</b>' + (x.comentarios ? '<small>' + esc(x.comentarios) + '</small>' : '') + '<em>' + esc(x.aprobador) + '</em></div>').join('') + '</div>' : '<div class="ic-vacio">Sin aprobaciones todavía.</div>') + '</div></section>' +
      '<section class="ic-bloque"><div class="cab"><h2>Versiones del texto</h2></div><div class="cuerpo">' + (v.length ? '<div class="re-hist">' + v.map((x) => '<div><span>' + esc(new Date(x.fecha).toLocaleString('es-CO')) + '</span><b>Versión ' + esc(x.id) + '</b><em>' + esc(x.por) + '</em><button class="ic-btn sec chico" data-v="' + esc(x.id) + '">Ver</button></div>').join('') + '</div>' : '<div class="ic-vacio">SharePoint aún no tiene versiones de este registro (se activan al proteger las listas).</div>') + '</div></section></div></div>';
    t.querySelectorAll('[data-v]').forEach((b) => { b.onclick = async () => {
      try {
        const f = await RE.version(r, b.dataset.v);
        const puedeRest = RE.puede.editar() && RE.editableTexto(r) && f.contenido;
        U.modal('Versión ' + b.dataset.v + ' · ' + r.codigo, '<article class="re-preview"><h2>' + esc(f.titulo_editorial || f.titulo || '') + '</h2><div class="re-lectura">' + RE_EDITOR.limpiar(f.contenido || '<p><em>Sin texto en esta versión.</em></p>') + '</div>' + (f.pregunta ? '<div class="re-preg"><span>Pregunta</span><p>' + esc(f.pregunta) + '</p></div>' : '') + '</article>' +
          (puedeRest ? '<div class="ic-acciones"><button class="ic-btn" id="vRest">Restaurar este texto</button></div>' : ''), (m) => {
          const br = m.querySelector('#vRest');
          if (br) br.onclick = async () => { try { await U.conCarga(br, () => RE.guardar(r, { contenido: f.contenido, pregunta: f.pregunta || r.pregunta }, 'Texto restaurado', 'Desde la versión ' + b.dataset.v)); U.cerrarModal(); U.aviso('Texto restaurado', 'ok'); tabHistorial(t, r); } catch (e) { U.aviso(U.mensajeError(e), 'err'); } };
        });
        document.querySelector('.ic-modal').classList.add('re-modal-ancho');
      } catch (e) { U.aviso(U.mensajeError(e), 'err'); }
    }; });
  }

  // =====================================================================
  // CALENDARIO EDITORIAL
  // =====================================================================
  let calModo = 'semana', calBase = null;
  App.vistas.calendario = function (c) {
    const h = RE.hoy(); if (!calBase) calBase = h.slice(0, 7) + '-01';
    const L = visibles().filter((r) => r.estado !== 'ARCHIVADA' && fechaPlan(r));
    const en = (d0, d1) => L.filter((r) => fechaPlan(r) >= d0 && fechaPlan(r) <= d1).sort((a, b) => fechaPlan(a).localeCompare(fechaPlan(b)));
    const item = (r) => '<a class="re-cal-it e-' + r.estado.toLowerCase() + '" data-c="' + esc(r.codigo) + '"><b>' + esc(r.codigo) + '</b> ' + esc(titulo(r)) + '</a>';
    const mes = new Date(calBase + 'T12:00:00'), nomMes = mes.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
    let cuerpo = '';
    if (calModo === 'semana') {
      let l = lunes(calBase); const fin = sumarDias(lunes(sumarDias(calBase, 95)), 6);
      const filas = []; while (l <= fin) { const rs = en(l, sumarDias(l, 6)); filas.push('<div class="re-sem ' + (rs.length ? '' : 'vacia') + (l === lunes(h) ? ' actual' : '') + '"><div class="lbl">' + esc(RE.textoFecha(l, true) + ' – ' + RE.textoFecha(sumarDias(l, 6), true)) + (l === lunes(h) ? '<small>Esta semana</small>' : '') + '</div><div class="its">' + (rs.length ? rs.map((r) => '<span class="re-dia">' + esc(new Date(fechaPlan(r) + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' })) + '</span>' + item(r)).join('') : '<span class="re-sin">Semana sin reflexión</span>' + (RE.puede.editar() ? ' <button class="ic-btn sec chico" data-asig="' + l + '">Asignar</button>' : '')) + '</div></div>'); l = sumarDias(l, 7); }
      cuerpo = '<div class="re-semanas-cal">' + filas.join('') + '</div>';
    } else {
      const ini = lunes(calBase), finMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).toISOString().slice(0, 10);
      let d = ini; const celdas = [];
      while (d <= finMes || celdas.length % 7) { const rs = en(d, d); celdas.push('<div class="' + (d.slice(0, 7) === calBase.slice(0, 7) ? '' : 'fuera') + (d === h ? ' hoy' : '') + '"><span>' + Number(d.slice(8)) + '</span>' + rs.map(item).join('') + '</div>'); d = sumarDias(d, 1); }
      cuerpo = '<div class="re-mes"><div class="dias">' + ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((x) => '<b>' + x + '</b>').join('') + '</div><div class="grid">' + celdas.join('') + '</div></div>';
    }
    c.innerHTML = '<div class="re-titulo-fila"><h1 class="ic-titulo">Calendario editorial</h1><div class="re-seg"><button data-m="semana" class="' + (calModo === 'semana' ? 'on' : '') + '">Semanal</button><button data-m="mes" class="' + (calModo === 'mes' ? 'on' : '') + '">Mensual</button></div></div>' +
      '<p class="ic-subtitulo">' + esc(CFG.frecuencia) + '. Programar no publica: nada aparece en Colecciones de lectura ni en redes sin aprobación editorial y sin que alguien la publique.</p>' +
      '<div class="re-cal-nav"><button class="ic-btn sec chico" id="cA">←</button><b>' + esc(calModo === 'semana' ? 'Desde ' + nomMes : nomMes) + '</b><button class="ic-btn sec chico" id="cS">→</button><button class="ic-btn sec chico" id="cH">Hoy</button>' +
      '<span class="re-leyenda">' + ['DESARROLLO', 'REV_EDITORIAL', 'APROBADA', 'PROGRAMADA', 'PUBLICADA'].map(chip).join(' ') + '</span></div>' + cuerpo;
    const mover = (n) => { const d = new Date(calBase + 'T12:00:00'); d.setMonth(d.getMonth() + n); calBase = d.toISOString().slice(0, 7) + '-01'; App.vistas.calendario(c); };
    c.querySelector('#cA').onclick = () => mover(-1); c.querySelector('#cS').onclick = () => mover(1); c.querySelector('#cH').onclick = () => { calBase = null; App.vistas.calendario(c); };
    c.querySelectorAll('[data-m]').forEach((b) => { b.onclick = () => { calModo = b.dataset.m; App.vistas.calendario(c); }; });
    c.querySelectorAll('.re-cal-it').forEach((a) => { a.onclick = () => detalleCal(porCodigo(a.dataset.c), c); });
    c.querySelectorAll('[data-asig]').forEach((b) => { b.onclick = () => asignarSemana(b.dataset.asig, c); });
  };
  function detalleCal(r, c) {
    const ed = RE.puede.editar() && r.estado !== 'PUBLICADA';
    U.modal(r.codigo + ' · ' + titulo(r), '<form class="ic-form" id="fC"><p style="margin-top:0">' + chip(r.estado) + ' ' + esc(RE.referenciaCompleta(r)) + '</p>' +
      (ed ? U.campo({ name: 'fecha', label: r.estado === 'PROGRAMADA' ? 'Fecha programada' : 'Fecha prevista', t: 'date', valor: r.fecha_prevista }) : '<p>Publicada el ' + esc(RE.textoFecha(r.fecha_publicacion)) + '</p>') +
      '<div class="ic-acciones"><a class="ic-btn sec" href="#r/' + esc(r.codigo) + '">Abrir</a>' + (ed ? '<button class="ic-btn" id="cOk">Cambiar fecha</button>' : '') + '</div></form>', (m) => {
      const f = m.querySelector('#fC');
      m.querySelector('a').onclick = U.cerrarModal;
      if (!ed) return;
      f.onsubmit = async (e) => {
        e.preventDefault(); const v = f.fecha.value;
        if (r.estado === 'PROGRAMADA' && (!v || v < RE.hoy())) { U.marcarErrores(f, { fecha: 'Programada: debe ser hoy o una fecha futura' }); return; }
        try { await U.conCarga(m.querySelector('#cOk'), () => RE.guardar(r, { fecha_prevista: v }, 'Fecha cambiada desde el calendario', v ? RE.textoFecha(v) : 'sin fecha')); U.cerrarModal(); U.aviso('Fecha actualizada', 'ok'); App.vistas.calendario(c); }
        catch (er) { U.aviso(U.mensajeError(er), 'err', 8000); }
      };
    });
  }
  function asignarSemana(l, c) {
    const cand = D.refl.filter((r) => !r.fecha_prevista && ['DESARROLLO', 'REV_BIBLICA', 'REV_EDITORIAL', 'APROBADA'].indexOf(r.estado) >= 0);
    U.modal('Semana del ' + RE.textoFecha(l), cand.length ? '<form class="ic-form" id="fA">' + U.campo({ name: 'cod', label: 'Reflexión (sin fecha, en desarrollo, revisión o aprobada)', t: 'select', op: cand.map((r) => [r.codigo, r.codigo + ' · ' + titulo(r) + ' · ' + RE.nombreEstado(r.estado)]), req: true }) +
      U.campo({ name: 'fecha', label: 'Fecha', t: 'date', valor: l < RE.hoy() ? RE.hoy() : l }) + '<div class="ic-acciones"><button class="ic-btn" id="aOk">Asignar</button></div></form>' : '<div class="ic-vacio">No hay reflexiones sin fecha en desarrollo, revisión o aprobadas.</div>', (m) => {
      const f = m.querySelector('#fA'); if (!f) return;
      f.onsubmit = async (e) => {
        e.preventDefault(); const v = U.leerForm(f); if (!U.marcarErrores(f, v.cod ? {} : { cod: 'Elija una' })) return;
        const r = porCodigo(v.cod);
        try { await U.conCarga(m.querySelector('#aOk'), () => RE.guardar(r, { fecha_prevista: v.fecha }, 'Fecha prevista asignada', RE.textoFecha(v.fecha))); U.cerrarModal(); U.aviso('Asignada', 'ok'); App.vistas.calendario(c); }
        catch (er) { U.aviso(U.mensajeError(er), 'err', 8000); }
      };
    });
  }

  // =====================================================================
  // PROMPT MAESTRO
  // =====================================================================
  App.vistas.prompt = function (c) {
    if (!RE.puede.editar()) { location.hash = ''; return; }
    const P = [['PROMPT_MAESTRO', 'Prompt Maestro oficial', RE_PROMPTS.maestro], ['PROMPT_ADAPTACIONES', 'Prompt de adaptaciones para redes', RE_PROMPTS.adaptaciones]];
    const sel = param(1) || 'PROMPT_MAESTRO', p = P.find((x) => x[0] === sel) || P[0], vig = RE.promptVigente(p[0]), vers = D.prompts[p[0]] || [];
    c.innerHTML = '<h1 class="ic-titulo">Prompt maestro</h1><p class="ic-subtitulo">La app no se conecta a una IA (no hay integración autorizada ni claves). Se copia el prompt con los datos de la reflexión, se trabaja en Claude o ChatGPT y se pega el resultado en el editor.</p>' +
      '<nav class="re-tabs">' + P.map((x) => '<a href="#prompt/' + x[0] + '" class="' + (x[0] === p[0] ? 'on' : '') + '">' + x[1] + '</a>').join('') + '</nav>' +
      '<section class="ic-bloque"><div class="cab"><h2>' + esc(p[1]) + (vig ? ' · versión ' + vig.version : ' · versión inicial') + '</h2><span class="espacio"></span><button class="ic-btn sec chico" id="pCop">Copiar</button><button class="ic-btn chico" id="pEd">Editar</button></div>' +
      '<div class="cuerpo"><pre class="re-pre">' + esc(vig ? vig.texto : p[2]) + '</pre>' + (vig ? '<p class="re-nota">Vigente desde ' + esc(new Date(vig.fecha_hora).toLocaleString('es-CO')) + ' · ' + esc(vig.autor) + (vig.nota ? ' · «' + esc(vig.nota) + '»' : '') + '</p>' : '<p class="re-nota">Aún no se ha guardado en SharePoint: es el texto inicial. Al editarlo se crea la versión 1.</p>') + '</div></section>' +
      '<section class="ic-bloque"><div class="cab"><h2>Control de cambios</h2></div><div class="cuerpo">' + (vers.length ? '<div class="re-hist">' + vers.map((x) => '<div><span>' + esc(new Date(x.fecha_hora).toLocaleString('es-CO')) + '</span><b>Versión ' + x.version + (x.vigente ? ' · vigente' : '') + '</b>' + (x.nota ? '<small>' + esc(x.nota) + '</small>' : '') + '<em>' + esc(x.autor) + '</em><button class="ic-btn sec chico" data-ver="' + x.version + '">Ver</button></div>').join('') + '</div>' : '<div class="ic-vacio">Sin versiones guardadas.</div>') + '</div></section>';
    c.querySelector('#pCop').onclick = () => copiar(vig ? vig.texto : p[2], 'Prompt copiado');
    c.querySelector('#pEd').onclick = () => U.modal('Editar · ' + p[1], '<form class="ic-form" id="fPr"><textarea name="texto" style="width:100%;height:55vh;font:13px/1.5 Consolas,monospace">' + esc(vig ? vig.texto : p[2]) + '</textarea>' +
      U.campo({ name: 'nota', label: 'Qué cambió (queda en el control de cambios)', req: true }) + '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="prNo">Cancelar</button><button class="ic-btn" id="prOk">Guardar nueva versión</button></div></form>', (m) => {
      document.querySelector('.ic-modal').classList.add('re-modal-ancho');
      m.querySelector('#prNo').onclick = U.cerrarModal;
      m.querySelector('#fPr').onsubmit = async (e) => {
        e.preventDefault(); const v = U.leerForm(e.target);
        if (!U.marcarErrores(e.target, !v.texto ? { texto: 'Vacío' } : !v.nota ? { nota: 'Describa el cambio' } : {})) return;
        if (vig && v.texto === vig.texto) { U.aviso('El texto no cambió', 'warn'); return; }
        try { await U.conCarga(m.querySelector('#prOk'), () => RE.guardarPrompt(p[0], m.querySelector('[name=texto]').value, v.nota)); U.cerrarModal(); U.aviso('Nueva versión guardada', 'ok'); App.vistas.prompt(c); }
        catch (er) { U.aviso(U.mensajeError(er), 'err', 8000); }
      };
    });
    c.querySelectorAll('[data-ver]').forEach((b) => { b.onclick = () => { const x = vers.find((y) => String(y.version) === b.dataset.ver);
      U.modal('Versión ' + x.version, '<pre class="re-pre">' + esc(x.texto) + '</pre>' + (!x.vigente ? '<div class="ic-acciones"><button class="ic-btn" id="vR">Volver a esta versión</button></div>' : ''), (m) => {
        document.querySelector('.ic-modal').classList.add('re-modal-ancho');
        const br = m.querySelector('#vR'); if (br) br.onclick = async () => { try { await U.conCarga(br, () => RE.guardarPrompt(p[0], x.texto, 'Se restauró la versión ' + x.version)); U.cerrarModal(); App.vistas.prompt(c); } catch (e) { U.aviso(U.mensajeError(e), 'err'); } };
      }); }; });
  };

  // =====================================================================
  // WEB PÚBLICA
  // =====================================================================
  App.vistas.web = function (c) {
    if (!RE.puede.editar()) { location.hash = ''; return; }
    const pub = D.refl.filter(RE.publica).sort((a, b) => String(b.fecha_publicacion).localeCompare(String(a.fecha_publicacion)));
    const listas = D.refl.filter((r) => (r.estado === 'APROBADA' || r.estado === 'PROGRAMADA') && r.fecha_prevista && r.fecha_prevista <= RE.hoy());
    const sinAprob = D.refl.filter((r) => r.estado === 'PUBLICADA' && !RE.aprobadaEditorial(r));
    c.innerHTML = '<h1 class="ic-titulo">Biblioteca pública (web de GPA)</h1>' +
      '<p class="ic-subtitulo">La web de GPA es estática: aquí se generan los archivos y usted los sube al repositorio de la web (sin tokens ni publicación automática). Solo entran las reflexiones publicadas, con aprobación editorial y con fecha cumplida; nada programado sale antes de tiempo.</p>' +
      (listas.length ? '<div class="ic-alerta chica">Listas para publicar hoy (fecha cumplida): ' + listas.map((r) => '<a href="#r/' + esc(r.codigo) + '">' + esc(r.codigo) + '</a>').join(', ') + '. Ábralas y use «Marcar publicada».</div>' : '') +
      (sinAprob.length ? '<div class="ic-alerta chica">No se incluyen por no tener aprobación editorial vigente: ' + sinAprob.map((r) => esc(r.codigo)).join(', ') + '.</div>' : '') +
      '<section class="ic-bloque"><div class="cab"><h2>1. Índice de la biblioteca</h2><span class="espacio"></span><button class="ic-btn chico" id="bIdx"' + (pub.length ? '' : ' disabled') + '>Descargar reflexiones.html</button></div><div class="cuerpo"><p class="re-nota">' + pub.length + ' reflexiones publicadas. Vuelva a descargarlo cada vez que publique una nueva. Va en la raíz del sitio.</p></div></section>' +
      '<section class="ic-bloque"><div class="cab"><h2>2. Página e imagen de cada reflexión</h2></div><div class="cuerpo">' + (pub.length ? '<div class="ic-tabla-caja"><table class="ic-tabla"><thead><tr><th>Código</th><th>Título</th><th>Publicada</th><th>Dirección</th><th></th></tr></thead><tbody>' +
        pub.map((r) => '<tr><td class="re-cod">' + esc(r.codigo) + '</td><td>' + esc(titulo(r)) + '</td><td>' + esc(RE.textoFecha(r.fecha_publicacion)) + '</td><td class="re-url">' + esc(CFG.web.base + '/' + RE.slug(r) + '.html') + '</td>' +
          '<td style="white-space:nowrap"><button class="ic-btn sec chico" data-pg="' + esc(r.codigo) + '">Página</button> ' + (r.portada ? '<button class="ic-btn sec chico" data-img="' + esc(r.codigo) + '">Imagen</button>' : '<span class="sec">Sin imagen</span>') + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="ic-vacio">Aún no hay reflexiones publicadas.</div>') + '</div></section>' +
      '<details class="re-det"><summary>Cómo subirlos a la web de GPA (GitHub)</summary><ol>' +
      '<li>Entre a github.com › repositorio <b>growthpathacademy/bpo2bpo</b> (rama main).</li>' +
      '<li><b>reflexiones.html</b> y cada <b>reflexion-re-xxx-nnn.html</b>: en la raíz, «Add file › Upload files», arrastre los archivos y «Commit changes». Si ya existen, se reemplazan.</li>' +
      '<li><b>Imágenes</b>: entre a la carpeta <b>assets/img/reflexiones/</b> (si no existe, al subir escriba ese nombre de carpeta antes del archivo) y suba la imagen con el nombre que trae.</li>' +
      '<li>En 1 a 2 minutos queda en ' + esc(CFG.web.base) + '/reflexiones.html. Las páginas no muestran botones de compartir.</li>' +
      '<li>Opcional: para que aparezca en el menú de todo el sitio, agregue el enlace «Reflexiones Estratégicas» en el menú Recursos de las demás páginas (las generadas aquí ya lo traen).</li></ol></details>';
    const B = c.querySelector('#bIdx');
    if (B) B.onclick = async () => { B.disabled = true; try { for (const r of pub) if (r.contenido === undefined) await RE.leer(r); RE_WEB.bajar(CFG.web.indice, await RE_WEB.indice(pub)); } catch (e) { U.aviso(U.mensajeError(e), 'err'); } B.disabled = false; };
    c.querySelectorAll('[data-pg]').forEach((b) => { b.onclick = async () => {
      const r = porCodigo(b.dataset.pg); b.disabled = true;
      try { await RE.leer(r); const otras = pub.filter((x) => x !== r).slice(0, 3); RE_WEB.bajar(RE.slug(r) + '.html', await RE_WEB.pagina(r, otras)); await RE.registrar(r, 'Página web generada', RE.slug(r) + '.html'); }
      catch (e) { U.aviso(U.mensajeError(e), 'err'); } b.disabled = false; }; });
    c.querySelectorAll('[data-img]').forEach((b) => { b.onclick = async () => {
      const r = porCodigo(b.dataset.img); b.disabled = true;
      try { RE_WEB.bajar(RE.slug(r) + '.' + RE_WEB.extension(r), await RE.blobPortada(r.portada)); } catch (e) { U.aviso(U.mensajeError(e), 'err'); } b.disabled = false; }; });
  };

  // =====================================================================
  // ARRANQUE
  // =====================================================================
  function sinAcceso(raiz, texto) {
    U.pantalla(raiz, { logo: CFG.logo, titulo: 'Sin autorización', texto: texto || 'Su cuenta no tiene acceso a Reflexiones Estratégicas. Solicítelo a ' + CFG.contactoAcceso + '.', boton: 'Volver al portal', alClic: () => IC.portal.volver() });
  }
  async function arrancar() {
    const raiz = document.getElementById('contenido');
    U.pantalla(raiz, { logo: CFG.logo, cargando: true, titulo: 'Cargando…', texto: 'Conectando con Microsoft 365' });
    try { sessionStorage.setItem('ic_volver_url', location.href); } catch (e) { /* sin almacenamiento */ }
    try {
      const cuenta = await IC.auth.iniciar(CFG.auth);
      if (!cuenta) { U.pantalla(raiz, { logo: CFG.logo, titulo: CFG.app.nombre, texto: 'Ingrese con su cuenta de Microsoft de Ideas Control.', boton: 'Iniciar sesión', alClic: () => IC.auth.entrar() }); return; }
      try { sessionStorage.removeItem('ic_volver_url'); } catch (e) { /* sin almacenamiento */ }
      const email = String(cuenta.username || '').toLowerCase();
      if (!email.endsWith(CFG.dominio)) { sinAcceso(raiz, 'Esta app es solo para cuentas ' + CFG.dominio + '.'); return; }
      D.usuario = { nombre: cuenta.name || email, email, iniciales: U.fmt.iniciales(cuenta.name || email) };
      await IC.graph.sitio(CFG.sitio.host, CFG.sitio.ruta);
      // 1) Registro de accesos. Si SharePoint niega la lista, la persona no tiene permiso real.
      try { await RE.cargarAccesos(); }
      catch (e) {
        if (/No existe la lista RE_/.test(e.message)) {
          U.pantalla(raiz, { logo: CFG.logo, titulo: 'Falta instalar la app', texto: CFG.admins.indexOf(email) >= 0 ? 'Las listas RE_* aún no existen. Abra el instalador de IC Apps (Programacion/Instalador/), clic en «Crear estructura» y vuelva.' : 'La app aún no está instalada. Avise a ' + CFG.contactoAcceso + '.', boton: 'Reintentar', alClic: () => location.reload() });
          return;
        }
        if (e.status === 403 || e.status === 401 || e.status === 404) { sinAcceso(raiz); return; }
        throw e;
      }
      const reg = D.accesos.find((a) => a.Title === email && a.estado === 'ACTIVO');
      D.rol = CFG.admins.indexOf(email) >= 0 ? 'ADMIN' : reg ? reg.rol : null;
      if (!D.rol) { sinAcceso(raiz); return; }
      // 2) Datos
      await RE.cargarCatalogos();
      if ((!D.libros.length || !D.dims.length) && RE.puede.admin()) {
        U.pantalla(raiz, { logo: CFG.logo, cargando: true, titulo: 'Preparando catálogos…', texto: '66 libros y modelo de dimensiones y competencias' });
        await RE.sembrarCatalogos();
      }
      await Promise.all([RE.cargarReflexiones(), RE.cargarAprobaciones(), RE.cargarPrompts()]);
      pintarEncabezado();
      const rutas = {}; ['', 'biblioteca', 'nueva', 'r', 'calendario', 'prompt', 'web', 'admin'].forEach((k) => { rutas[k] = () => {
        if (App.guardarTexto && !(k === 'r' && location.hash.indexOf('/texto') > 0)) { const g = App.guardarTexto; App.guardarTexto = null; g().catch(() => {}); }
        if (k !== 'r') App.editor = null;
        (App.vistas[k] || App.vistas[''])(raiz);
      }; });
      U.enrutar(rutas, marcarNav);
    } catch (e) {
      console.error(e);
      if (e.status === 403) { sinAcceso(raiz); return; }
      U.pantalla(raiz, { logo: CFG.logo, titulo: 'No se pudo cargar la app', texto: U.mensajeError(e), boton: 'Reintentar', alClic: () => location.reload() });
    }
  }
  window.addEventListener('DOMContentLoaded', arrancar);
})();
