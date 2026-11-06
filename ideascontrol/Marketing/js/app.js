/* =====================================================================
   APP-112 · Marketing
   Vistas: #  calendario semanal · #lista · #pub/PUB-00001 · #temas · #tema/TEM-0001
           #aprobar · #metricas · #importar (js/importar.js) · #resumen · #generar[/TEM-0001[/contenido|newsletter]] (js/generador.js)
   Aprobación: mínimo CFG.minAprobaciones de las personas de CFG.usuarios. Cambiar el copy o la pieza
   de una publicación en aprobación o aprobada la devuelve a «En producción» (hay que volver a enviarla).
   ===================================================================== */
const App = { usuario: null, temas: [], pubs: [], mets: [], semana: null, filtro: { q: '', canal: '', estado: '', mes: '' }, mf: { desde: '', hasta: '', red: '' } };

(function () {
  const U = IC.ui, esc = U.esc, G = IC.graph, L = CFG.listas;
  const pad = (n, l) => String(n).padStart(l, '0');
  const dia = (iso) => String(iso || '').slice(0, 10);
  const hoyISO = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2); };
  const sumarDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2); };
  const lunesDe = (iso) => { const d = new Date(iso + 'T12:00:00'); const w = (d.getDay() + 6) % 7; return sumarDias(iso, -w); };
  const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const fCorta = (iso) => iso ? new Date(dia(iso) + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : '';
  const fLarga = (iso) => iso ? new Date(dia(iso) + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const n0 = (v) => Number(v || 0);
  const num = (v) => Math.round(n0(v)).toLocaleString('es-CO');
  const pct = (v) => (v === null || !isFinite(v)) ? '—' : (Math.round(v * 1000) / 10).toLocaleString('es-CO') + ' %';
  const ESTADOS = CFG.estados.map((e) => e[0]);
  const claseEstado = (e) => 'mkt-e' + Math.max(0, ESTADOS.indexOf(e));
  const chipEstado = (e) => '<span class="mkt-estado ' + claseEstado(e) + '">' + esc(e || 'Planeada') + '</span>';
  const icoCanal = (c) => { const n = U.norm(c); return n.indexOf('linkedin') >= 0 ? 'li' : n.indexOf('tiktok') >= 0 || n.indexOf('youtube') >= 0 ? 'tt' : n.indexOf('instagram') >= 0 && n.indexOf('facebook') < 0 ? 'ig' : 'fb'; };
  const chipCanal = (c) => '<span class="mkt-canal ' + icoCanal(c) + '">' + esc(c || '—') + '</span>';
  const opciones = (lista, sel, vacio) => (vacio !== undefined ? '<option value="">' + esc(vacio) + '</option>' : '') +
    lista.concat(sel && lista.indexOf(sel) < 0 ? [sel] : []).map((x) => '<option' + (x === sel ? ' selected' : '') + '>' + esc(x) + '</option>').join('');
  const temaDe = (id) => App.temas.find((t) => t.Title === id);
  const pubDe = (id) => App.pubs.find((p) => p.Title === id);
  const interacciones = (m) => n0(m.reacciones) + n0(m.comentarios) + n0(m.compartidos) + n0(m.guardados) + n0(m.clics);
  const soyAprobador = () => !!CFG.usuarios[App.usuario.email];

  // ---------- Aprobaciones ----------
  function eventos(p) { try { const a = JSON.parse(p.aprobaciones || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function ronda(p) {
    const ev = eventos(p); let i = -1;
    ev.forEach((e, k) => { if (e.tipo === 'ENVIO') i = k; });
    return i < 0 ? [] : ev.slice(i + 1);
  }
  function aprobadores(p) {
    const r = ronda(p), ok = {};
    r.forEach((e) => { if (e.tipo === 'APROBADA') ok[e.email] = e; if (e.tipo === 'CAMBIOS') delete ok[e.email]; });
    return Object.keys(ok).map((k) => ok[k]);
  }
  const miDecision = (p) => { const r = ronda(p).filter((e) => e.email === App.usuario.email && (e.tipo === 'APROBADA' || e.tipo === 'CAMBIOS')); return r.length ? r[r.length - 1] : null; };
  const pendientesMias = () => App.pubs.filter((p) => p.estado === 'En aprobación' && !miDecision(p));

  // ---------- Carga ----------
  async function cargar() {
    const [t, p, m] = await Promise.all([G.items(L.temas, { top: 5000 }), G.items(L.pubs, { top: 5000 }), G.items(L.mets, { top: 5000 })]);
    App.temas = t.sort((a, b) => String(a.Title).localeCompare(String(b.Title)));
    App.pubs = p.sort((a, b) => dia(a.fecha).localeCompare(dia(b.fecha)) || String(a.Title).localeCompare(String(b.Title)));
    App.mets = m.sort((a, b) => dia(b.fecha_publicacion).localeCompare(dia(a.fecha_publicacion)));
    // Columnas de MKT_Metricas (las nuevas —fecha_corte, enlace_post, post_id— llegan con el instalador)
    try { const r = await G.llamar('GET', '/sites/' + await G.sitio(CFG.sitio.host, CFG.sitio.ruta) + '/lists/' + await G.listaId(L.mets) + '/columns?$select=name&$top=200'); App.colsMet = (r.value || []).map((c) => c.name); }
    catch (e) { App.colsMet = null; }
  }
  const tieneCol = (c) => !App.colsMet || App.colsMet.indexOf(c) >= 0;
  // Parecido entre dos textos (0 a 1): palabras de más de 3 letras en común
  function parecido(a, b) {
    const pal = (t) => U.norm(String(t || '').replace(/\*\*/g, '')).replace(/[^a-z0-9ñ ]+/g, ' ').split(' ').filter((w) => w.length > 3).slice(0, 40);
    const A = pal(a), B = pal(b); if (!A.length || !B.length) return 0;
    const sb = {}; B.forEach((w) => { sb[w] = 1; });
    return A.filter((w) => sb[w]).length / Math.min(A.length, B.length);
  }
  const metVacia = (m) => CAMPOS_MET.every((c) => !n0(m[c[0]]));
  // Filas vacías (sin números ni enlace) que tienen una gemela con datos: misma red, tipo, fecha de publicación y nombre parecido
  function vaciasRepetidas() {
    return App.mets.filter((m) => metVacia(m) && !m.enlace_post && !m.post_id && App.mets.some((x) => x !== m && !metVacia(x) && x.red === m.red &&
      (x.tipo || 'Orgánico') === (m.tipo || 'Orgánico') && dia(x.fecha_publicacion) === dia(m.fecha_publicacion) && parecido(x.nombre, m.nombre) >= 0.5));
  }
  // Nombre corto de una métrica: primera frase del post, sin emojis al inicio ni hashtags (máx. ~90 caracteres)
  function nombreCorto(s) {
    let t = String(s || '').split(/\n/).map((x) => x.trim()).find((x) => x && !/^#/.test(x)) || String(s || '');
    t = t.replace(/#\S+/g, '').replace(/^[^\p{L}\p{N}¿¡"«]+/u, '').replace(/\s+/g, ' ').trim();
    const f = t.match(/^(.{20,}?[.?!])(\s|$)/); if (f && f[1].length <= 90) t = f[1];
    return t.length > 90 ? t.slice(0, 87).replace(/\s+\S*$/, '') + '…' : t;
  }
  async function guardarPub(p, campos) {
    await G.actualizar(L.pubs, p._id, campos);
    Object.assign(p, campos);
  }

  // ---------- Encabezado ----------
  function pintarEncabezado() {
    const u = App.usuario, n = pendientesMias().length;
    document.getElementById('encabezado').innerHTML =
      '<a href="#"><img class="logo" src="' + CFG.logo + '" alt="Ideas Control"></a>' +
      '<div class="app-nombre"><b>' + esc(CFG.app.nombre) + '</b><span>' + CFG.app.id + ' · v' + CFG.app.version + '</span></div><div class="espacio"></div>' +
      '<nav class="mkt-nav"><a href="#" data-r="">Calendario</a><a href="#lista" data-r="lista">Publicaciones</a><a href="#temas" data-r="temas">Temas</a><a href="#generar" data-r="generar">Generar</a>' +
      '<a href="#aprobar" data-r="aprobar">Por aprobar' + (n ? '<span class="mkt-badge">' + n + '</span>' : '') + '</a><a href="#metricas" data-r="metricas">Métricas</a><a href="#resumen" data-r="resumen">Resumen</a></nav>' +
      '<div class="ic-user">' + IC.portal.boton() + '<div class="datos"><b>' + esc(u.nombre) + '</b><span>' + esc(CFG.usuarios[u.email] || '') + '</span></div>' +
      '<div class="ic-avatar" title="' + esc(u.email) + '">' + esc(u.iniciales) + '</div><button class="ic-btn sec chico" id="btnSalir">Salir</button></div>';
    document.getElementById('encabezado').hidden = false;
    document.getElementById('btnSalir').onclick = () => IC.auth.salir();
    marcarNav((location.hash || '#').slice(1).split('/')[0]);
  }
  function marcarNav(r) {
    const alias = { pub: 'lista', tema: 'temas', importar: 'metricas' };
    document.querySelectorAll('.mkt-nav a').forEach((a) => a.classList.toggle('on', a.dataset.r === (alias[r] || r)));
  }

  // =====================================================================
  // CALENDARIO SEMANAL
  // =====================================================================
  function vistaCalendario(raiz) {
    if (!App.semana) App.semana = lunesDe(hoyISO());
    const ini = App.semana, fin = sumarDias(ini, 6), F = App.filtro;
    const semana = App.pubs.filter((p) => dia(p.fecha) >= ini && dia(p.fecha) <= fin && (!F.canal || p.canal === F.canal) && (!F.estado || p.estado === F.estado));
    const temasSem = Array.from(new Set(semana.map((p) => p.tema_id))).map(temaDe).filter(Boolean);
    raiz.innerHTML = '<div class="ic-barra"><div><h1 class="ic-titulo">Calendario</h1><p class="ic-subtitulo" style="margin:0">Semana del ' + esc(fLarga(ini)) + ' al ' + esc(fLarga(fin)) + '</p></div><span class="espacio"></span>' +
      '<div class="mkt-semnav"><button class="ic-btn sec chico" id="sAnt">‹ Anterior</button><button class="ic-btn sec chico" id="sHoy">Esta semana</button><button class="ic-btn sec chico" id="sSig">Siguiente ›</button></div>' +
      '<button class="ic-btn" id="bNueva">+ Publicación</button></div>' +
      '<div class="ic-filtros"><select id="fCanal">' + opciones(CFG.canales, F.canal, 'Todas las redes') + '</select><select id="fEstado">' + opciones(ESTADOS, F.estado, 'Todos los estados') + '</select></div>' +
      (temasSem.length ? '<div class="mkt-temasem">' + temasSem.map((t) => '<a href="#tema/' + esc(t.Title) + '"><span>Tema de la semana</span><b>' + esc(t.tema) + '</b></a>').join('') + '</div>' : '') +
      '<div class="mkt-semana">' + DIAS.map((d, i) => {
        const f = sumarDias(ini, i), del = semana.filter((p) => dia(p.fecha) === f);
        return '<div class="mkt-dia' + (f === hoyISO() ? ' hoy' : '') + '"><div class="cab"><b>' + d + '</b> ' + esc(fCorta(f)) + '</div>' +
          (del.map(tarjeta).join('') || '<p class="mkt-libre">—</p>') + '</div>';
      }).join('') + '</div>';
    raiz.querySelector('#sAnt').onclick = () => { App.semana = sumarDias(App.semana, -7); vistaCalendario(raiz); };
    raiz.querySelector('#sSig').onclick = () => { App.semana = sumarDias(App.semana, 7); vistaCalendario(raiz); };
    raiz.querySelector('#sHoy').onclick = () => { App.semana = lunesDe(hoyISO()); vistaCalendario(raiz); };
    raiz.querySelector('#fCanal').onchange = (e) => { F.canal = e.target.value; vistaCalendario(raiz); };
    raiz.querySelector('#fEstado').onchange = (e) => { F.estado = e.target.value; vistaCalendario(raiz); };
    raiz.querySelector('#bNueva').onclick = () => nuevaPublicacion({ fecha: ini });
  }
  function tarjeta(p) {
    const ap = p.estado === 'En aprobación' ? '<span class="mkt-ap">' + aprobadores(p).length + '/' + CFG.minAprobaciones + ' aprob.</span>' : '';
    return '<a class="mkt-tarjeta ' + claseEstado(p.estado) + '" href="#pub/' + esc(p.Title) + '">' + chipCanal(p.canal) +
      '<b>' + esc(p.titulo || (temaDe(p.tema_id) || {}).tema || p.Title) + '</b><span class="pie">' + chipEstado(p.estado) + (p.formato ? '<i>' + esc(p.formato) + '</i>' : '') + ap + '</span></a>';
  }

  // =====================================================================
  // LISTA DE PUBLICACIONES
  // =====================================================================
  function vistaLista(raiz) {
    const F = App.filtro;
    if (!F.mes) F.mes = hoyISO().slice(0, 7);
    const meses = Array.from(new Set(App.pubs.map((p) => dia(p.fecha).slice(0, 7)))).sort();
    raiz.innerHTML = '<div class="ic-barra"><div><h1 class="ic-titulo">Publicaciones</h1><p class="ic-subtitulo" style="margin:0">Todas las publicaciones por red y fecha.</p></div><span class="espacio"></span>' +
      '<button class="ic-btn sec" id="bExcel">Descargar Excel</button><button class="ic-btn" id="bNueva">+ Publicación</button></div>' +
      '<div class="ic-filtros"><div class="ic-buscar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input id="fq" placeholder="Buscar tema, copy, notas…" value="' + esc(F.q) + '" autocomplete="off"></div>' +
      '<select id="fMes"><option value="*">Todos los meses</option>' + meses.map((m) => '<option value="' + m + '"' + (m === F.mes ? ' selected' : '') + '>' + esc(new Date(m + '-15T12:00:00').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })) + '</option>').join('') + '</select>' +
      '<select id="fCanal">' + opciones(CFG.canales, F.canal, 'Todas las redes') + '</select><select id="fEstado">' + opciones(ESTADOS, F.estado, 'Todos los estados') + '</select></div><div id="tabla"></div>';
    const pintar = () => {
      const t = U.norm(F.q).split(/\s+/).filter(Boolean);
      const lista = App.pubs.filter((p) => (F.mes === '*' || dia(p.fecha).slice(0, 7) === F.mes) && (!F.canal || p.canal === F.canal) && (!F.estado || p.estado === F.estado) &&
        t.every((x) => U.norm([p.Title, p.titulo, p.copy, p.notas, (temaDe(p.tema_id) || {}).tema].join(' ')).indexOf(x) >= 0));
      raiz.querySelector('#tabla').innerHTML = '<p class="ic-conteo">' + lista.length + ' publicaciones</p><div class="ic-tabla-caja mkt-scroll"><table class="ic-tabla"><thead><tr><th>Fecha</th><th>Red</th><th>Publicación</th><th>Formato</th><th>Estado</th><th>Link</th></tr></thead><tbody>' +
        (lista.map((p) => '<tr data-id="' + esc(p.Title) + '"><td class="nw">' + esc(fLarga(p.fecha)) + '</td><td>' + chipCanal(p.canal) + '</td><td><b>' + esc(p.titulo || (temaDe(p.tema_id) || {}).tema || '') + '</b><span class="sec">' + esc(p.Title) + '</span></td>' +
          '<td>' + esc(p.formato || '—') + '</td><td>' + chipEstado(p.estado) + (p.estado === 'En aprobación' ? '<span class="sec">' + aprobadores(p).length + '/' + CFG.minAprobaciones + '</span>' : '') + '</td><td>' + (p.link ? '<a href="' + esc(p.link) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">Ver</a>' : '') + '</td></tr>').join('') ||
          '<tr><td colspan="6" class="ic-vacio">Sin publicaciones con ese filtro.</td></tr>') + '</tbody></table></div>';
      raiz.querySelectorAll('tr[data-id]').forEach((tr) => { tr.onclick = () => { location.hash = 'pub/' + tr.dataset.id; }; });
    };
    raiz.querySelector('#fq').addEventListener('input', (e) => { F.q = e.target.value; pintar(); });
    raiz.querySelector('#fMes').onchange = (e) => { F.mes = e.target.value; pintar(); };
    raiz.querySelector('#fCanal').onchange = (e) => { F.canal = e.target.value; pintar(); };
    raiz.querySelector('#fEstado').onchange = (e) => { F.estado = e.target.value; pintar(); };
    raiz.querySelector('#bNueva').onclick = () => nuevaPublicacion({});
    raiz.querySelector('#bExcel').onclick = () => exportar().catch((e) => U.aviso(U.mensajeError(e), 'err'));
    pintar();
  }

  // ---------- Nueva publicación ----------
  function nuevaPublicacion(o) {
    const temasOp = App.temas.filter((t) => t.estado !== 'INACTIVO').slice().sort((a, b) => dia(b.semana_inicio).localeCompare(dia(a.semana_inicio)));
    U.modal('Nueva publicación', '<form class="ic-form" id="fNueva"><div class="ic-campos">' +
      '<div class="ic-campo c12"><label for="n_tema">Tema <span class="req">*</span></label><select id="n_tema" name="tema_id">' + (o.tema_id ? '' : '<option value="">Seleccione…</option>') +
        temasOp.map((t) => '<option value="' + esc(t.Title) + '"' + (t.Title === o.tema_id ? ' selected' : '') + '>' + esc(t.tema) + ' · ' + esc(fCorta(t.semana_inicio)) + '</option>').join('') + '</select></div>' +
      U.campo({ name: 'fecha', label: 'Fecha', t: 'date', valor: o.fecha || hoyISO(), req: true, c: 'c4' }) +
      '<div class="ic-campo c4"><label for="n_canal">Red <span class="req">*</span></label><select id="n_canal" name="canal">' + opciones(CFG.canales, o.canal || '', 'Seleccione…') + '</select></div>' +
      '<div class="ic-campo c4"><label for="n_formato">Formato</label><select id="n_formato" name="formato">' + opciones(CFG.formatos, '', 'Seleccione…') + '</select></div>' +
      '</div><div class="ic-acciones"><button type="button" class="ic-btn sec" id="nCancel">Cancelar</button><button class="ic-btn" id="nOk">Crear</button></div></form>', (c) => {
      c.querySelector('#nCancel').onclick = U.cerrarModal;
      const f = c.querySelector('#fNueva');
      f.onsubmit = async (ev) => {
        ev.preventDefault();
        const v = U.leerForm(f), err = {};
        ['tema_id', 'fecha', 'canal'].forEach((k) => { if (!v[k]) err[k] = 'Obligatorio'; });
        if (!U.marcarErrores(f, err)) return;
        await U.conCarga(c.querySelector('#nOk'), async () => {
          try {
            const id = 'PUB-' + pad(await G.siguiente('PUB'), 5);
            const t = temaDe(v.tema_id);
            const p = await G.crear(L.pubs, { Title: id, tema_id: v.tema_id, fecha: v.fecha, canal: v.canal, formato: v.formato, titulo: t ? t.tema : '', estado: 'Planeada', responsable: App.usuario.nombre });
            App.pubs.push(p); App.pubs.sort((a, b) => dia(a.fecha).localeCompare(dia(b.fecha)));
            U.cerrarModal(); U.aviso('Publicación ' + id + ' creada', 'ok'); location.hash = 'pub/' + id;
          } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); }
        });
      };
    });
  }

  // =====================================================================
  // FICHA DE PUBLICACIÓN
  // =====================================================================
  function vistaPub(raiz) {
    const id = decodeURIComponent(location.hash.split('/')[1] || ''), p = pubDe(id);
    if (!p) { raiz.innerHTML = '<div class="ic-tabla-caja"><p class="ic-vacio">No se encontró ' + esc(id) + '. <a href="#lista">Volver</a></p></div>'; return; }
    const t = temaDe(p.tema_id) || {}, ap = aprobadores(p), mia = miDecision(p);
    const estadosPermitidos = ESTADOS.filter((e) => {
      if (e === p.estado) return true;
      if (e === 'Aprobada' || e === 'En aprobación') return false;   // solo por el flujo de aprobación
      if (e === 'Programada' || e === 'Publicada') return ['Aprobada', 'Programada', 'Publicada'].indexOf(p.estado) >= 0;
      return true;
    });
    const met = App.mets.filter((m) => m.publicacion_id === p.Title);
    const tf = (k, l) => t[k] ? '<dt>' + l + '</dt><dd>' + esc(t[k]) + '</dd>' : '';
    raiz.innerHTML = '<a class="ic-volver" href="#lista">← Publicaciones</a>' +
      '<div class="ic-ficha-cab"><div class="principal"><span class="ic-tag" style="background:#E6F0FA;color:#0A5A90">' + esc(p.Title) + '</span>' +
        '<h1>' + esc(p.titulo || t.tema || '') + '</h1><div class="meta">' + chipCanal(p.canal) + '<span>' + esc(fLarga(p.fecha)) + '</span>' + chipEstado(p.estado) + (p.formato ? '<span>' + esc(p.formato) + '</span>' : '') + '</div></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="ic-btn sec" id="bBrief">Copiar brief para la pieza</button><button class="ic-btn peligro" id="bDel">Eliminar</button></div></div>' +
      '<div class="mkt-ficha"><div class="mkt-col">' +
        '<section class="ic-bloque"><div class="cab"><h2>Contenido</h2></div><div class="cuerpo"><form class="ic-form" id="fPub"><div class="ic-campos">' +
          U.campo({ name: 'fecha', label: 'Fecha', t: 'date', valor: dia(p.fecha), req: true, c: 'c4' }) +
          '<div class="ic-campo c4"><label for="p_canal">Red</label><select id="p_canal" name="canal">' + opciones(CFG.canales, p.canal) + '</select></div>' +
          '<div class="ic-campo c4"><label for="p_formato">Formato</label><select id="p_formato" name="formato">' + opciones(CFG.formatos, p.formato || '', 'Sin definir') + '</select></div>' +
          U.campo({ name: 'titulo', label: 'Título de trabajo', valor: p.titulo || t.tema || '', c: 'c12', max: 250 }) +
          '<div class="ic-campo c12"><label for="p_copy">Copy final</label><textarea id="p_copy" name="copy" rows="10" placeholder="Pegue aquí el copy aprobado para esta red (desde el Word de la semana o desde Claude).">' + esc(p.copy || '') + '</textarea><span class="ayuda" id="cuenta"></span></div>' +
          '<div class="ic-campo c6"><label for="p_estado">Estado</label><select id="p_estado" name="estado">' + opciones(estadosPermitidos, p.estado || 'Planeada') + '</select><span class="ayuda">Aprobada solo llega con ' + CFG.minAprobaciones + ' aprobaciones. Programada y Publicada, después de aprobar.</span></div>' +
          U.campo({ name: 'link', label: 'Link publicado', valor: p.link || '', c: 'c6', ph: 'https://…' }) +
          U.campo({ name: 'notas', label: 'Notas', t: 'textarea', valor: p.notas || '', c: 'c12', filas: 2 }) +
        '</div><div class="ic-acciones"><button class="ic-btn" id="bGuardar">Guardar</button></div></form></div></section>' +
        '<section class="ic-bloque"><div class="cab"><h2>Pieza</h2><span class="sec">Imagen, carrusel o video final</span></div><div class="cuerpo"><div id="piezas" class="mkt-piezas"><div class="ic-spinner"></div></div>' +
          '<label class="ic-btn sec chico mkt-subir">Subir archivo(s)<input type="file" id="archivo" multiple accept="image/*,video/*,.pdf,.docx" hidden></label></div></section>' +
        '<section class="ic-bloque"><div class="cab"><h2>Enlace con UTM</h2><span class="sec">Para saber qué publicación trae cada lead</span></div><div class="cuerpo"><div class="ic-form"><div class="ic-campos">' +
          '<div class="ic-campo c6"><label for="u_dest">Destino</label><select id="u_dest">' + CFG.destinos.map((d) => '<option value="' + esc(d[1]) + '">' + esc(d[0]) + '</option>').join('') + '</select></div>' +
          '<div class="ic-campo c3"><label for="u_med">Tipo</label><select id="u_med"><option value="organico">Orgánico</option><option value="pago">Pago</option></select></div>' +
          '<div class="ic-campo c3" style="align-self:end"><button class="ic-btn sec" id="bUtm" type="button">Generar</button></div>' +
          '<div class="ic-campo c12"><input id="u_url" readonly value="' + esc(p.utm_url || '') + '" placeholder="Genere el enlace y péguelo en el post o en el primer comentario"></div>' +
        '</div></div></div></section>' +
      '</div><div class="mkt-col">' +
        '<section class="ic-bloque mkt-aprob"><div class="cab"><h2>Aprobación</h2><span class="sec">' + ap.length + ' de ' + CFG.minAprobaciones + ' necesarias</span></div><div class="cuerpo" id="aprob"></div></section>' +
        '<section class="ic-bloque"><div class="cab"><h2>Tema</h2>' + (t.Title ? '<a class="sec" href="#tema/' + esc(t.Title) + '">Abrir tema</a>' : '') + '</div><div class="cuerpo"><dl class="mkt-dl">' +
          tf('hook', 'Hook / guion') + tf('problema', 'Problema') + tf('autoridad', 'Autoridad') + tf('solucion', 'Solución') + tf('cta', 'CTA') + tf('valor', 'Valor agregado') +
          tf('promesa', 'Promesa') + tf('microapp', 'Microapp sugerida') + tf('cta_microapp', 'CTA con microapp') + tf('hashtags', 'Hashtags') + tf('seo', 'SEO') + '</dl></div></section>' +
        '<section class="ic-bloque"><div class="cab"><h2>Métricas</h2><button class="ic-btn sec chico" id="bMet">+ Registrar</button></div><div class="cuerpo">' +
          (met.length ? '<table class="ic-tabla mkt-mini"><thead><tr><th>Corte</th><th>Red</th><th class="n">Alcance</th><th class="n">Interac.</th><th class="n">Clics</th></tr></thead><tbody>' +
            met.map((m) => '<tr data-m="' + esc(m.Title) + '"><td>' + esc(fCorta(m.fecha_corte || m.fecha_campana || m.fecha_publicacion)) + '</td><td>' + esc(m.red) + '</td><td class="n">' + num(m.alcance) + '</td><td class="n">' + num(interacciones(m)) + '</td><td class="n">' + num(m.clics) + '</td></tr>').join('') + '</tbody></table>'
            : '<p class="ic-vacio" style="padding:8px 0">Aún sin métricas.</p>') + '</div></section>' +
      '</div></div>';

    const f = raiz.querySelector('#fPub'), copy = raiz.querySelector('#p_copy'), cuenta = raiz.querySelector('#cuenta');
    const contar = () => { cuenta.textContent = copy.value.length.toLocaleString('es-CO') + ' caracteres'; };
    copy.addEventListener('input', contar); contar();
    f.onsubmit = async (ev) => {
      ev.preventDefault();
      const v = U.leerForm(f);
      if (!v.fecha) { U.marcarErrores(f, { fecha: 'Obligatorio' }); return; }
      if (v.estado === 'Publicada' && !v.link && !(await U.confirmar('Sin link publicado', '¿Marcar como Publicada sin el link? Lo puede agregar después.', 'Sí, marcar'))) return;
      const campos = { fecha: v.fecha, canal: v.canal, formato: v.formato, titulo: v.titulo, copy: v.copy, estado: v.estado, link: v.link, notas: v.notas };
      if (v.copy !== (p.copy || '') && ['En aprobación', 'Aprobada'].indexOf(p.estado) >= 0) {
        if (!(await U.confirmar('Cambió el copy', 'La publicación está «' + p.estado + '». Al cambiar el copy vuelve a «En producción» y hay que enviarla otra vez a aprobación.', 'Guardar cambios'))) return;
        campos.estado = 'En producción';
        campos.aprobaciones = JSON.stringify(eventos(p).concat([{ tipo: 'EDICION', email: App.usuario.email, nombre: App.usuario.nombre, fecha: new Date().toISOString(), comentario: 'Cambió el copy' }]));
      }
      await U.conCarga(raiz.querySelector('#bGuardar'), async () => {
        try { await guardarPub(p, campos); U.aviso('Publicación guardada', 'ok'); vistaPub(raiz); pintarEncabezado(); } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); }
      });
    };
    raiz.querySelector('#bBrief').onclick = () => copiar(brief(p, t), 'Brief copiado: péguelo en ChatGPT o Canva');
    raiz.querySelector('#bDel').onclick = async () => {
      if (!(await U.confirmar('Eliminar ' + p.Title, 'Se borra la publicación (sus métricas y archivos se conservan).', 'Eliminar', true))) return;
      try { await G.eliminar(L.pubs, p._id); App.pubs = App.pubs.filter((x) => x !== p); U.aviso('Publicación eliminada', 'ok'); location.hash = 'lista'; } catch (e) { U.aviso(U.mensajeError(e), 'err'); }
    };
    raiz.querySelector('#bUtm').onclick = async () => {
      const url = utm(p, raiz.querySelector('#u_dest').value, raiz.querySelector('#u_med').value);
      raiz.querySelector('#u_url').value = url;
      try { await guardarPub(p, { utm_url: url }); } catch (e) { /* se guarda la próxima vez */ }
      copiar(url, 'Enlace copiado');
    };
    raiz.querySelector('#bMet').onclick = () => formMetrica({ publicacion_id: p.Title, tema_id: p.tema_id, nombre: p.titulo || t.tema, red: redDeCanal(p.canal), fecha_publicacion: dia(p.fecha) }, () => vistaPub(raiz));
    raiz.querySelectorAll('tr[data-m]').forEach((tr) => { tr.onclick = () => formMetrica(App.mets.find((m) => m.Title === tr.dataset.m), () => vistaPub(raiz)); });
    pintarAprobacion(raiz, p);
    pintarPiezas(raiz, p);
    raiz.querySelector('#archivo').onchange = (e) => subirPiezas(raiz, p, Array.from(e.target.files || []));
  }

  function pintarAprobacion(raiz, p) {
    const c = raiz.querySelector('#aprob'), ap = aprobadores(p), mia = miDecision(p), ev = eventos(p).slice().reverse();
    const personas = Object.keys(CFG.usuarios).map((email) => {
      const d = ronda(p).filter((e) => e.email === email && (e.tipo === 'APROBADA' || e.tipo === 'CAMBIOS')).pop();
      const est = p.estado === 'En aprobación' || p.estado === 'Aprobada' ? (d ? (d.tipo === 'APROBADA' ? '<span class="mkt-ok">✔ Aprobó</span>' : '<span class="mkt-no">Pidió cambios</span>') : '<span class="sec">Pendiente</span>') : '<span class="sec">—</span>';
      return '<li><b>' + esc(CFG.usuarios[email]) + '</b>' + est + '</li>';
    }).join('');
    let acciones = '';
    if (p.estado === 'Planeada' || p.estado === 'En producción') acciones = '<button class="ic-btn" id="aEnviar">Enviar a aprobación</button>';
    else if (p.estado === 'En aprobación' && soyAprobador()) acciones = mia ? '<p class="sec" style="margin:0">Usted ya respondió (' + (mia.tipo === 'APROBADA' ? 'aprobó' : 'pidió cambios') + ').</p>' :
      '<textarea id="aCom" rows="2" placeholder="Comentario (obligatorio si pide cambios)"></textarea><div style="display:flex;gap:8px;margin-top:8px"><button class="ic-btn" id="aSi">Aprobar</button><button class="ic-btn sec" id="aNo">Pedir cambios</button></div>';
    c.innerHTML = '<ul class="mkt-personas">' + personas + '</ul>' + (p.estado === 'Aprobada' ? '<div class="mkt-listo">✔ Aprobada por ' + esc(ap.map((a) => a.nombre).join(' y ')) + '</div>' : '') +
      '<div class="mkt-acc">' + acciones + '</div>' +
      (ev.length ? '<details class="mkt-hist"><summary>Historial (' + ev.length + ')</summary><ul>' + ev.map((e) => '<li><b>' + esc({ ENVIO: 'Envió a aprobación', APROBADA: 'Aprobó', CAMBIOS: 'Pidió cambios', EDICION: 'Editó' }[e.tipo] || e.tipo) + '</b> · ' + esc(e.nombre) + ' · ' +
        esc(new Date(e.fecha).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) + (e.comentario ? '<span>' + esc(e.comentario) + '</span>' : '') + '</li>').join('') + '</ul></details>' : '');
    const evento = (tipo, comentario) => ({ tipo, email: App.usuario.email, nombre: App.usuario.nombre, fecha: new Date().toISOString(), comentario: comentario || '' });
    const b1 = c.querySelector('#aEnviar');
    if (b1) b1.onclick = async () => {
      if (!String(p.copy || '').trim() && !(await U.confirmar('Sin copy', 'La publicación no tiene copy final. ¿Enviarla igual a aprobación?', 'Enviar'))) return;
      await U.conCarga(b1, async () => {
        try { await guardarPub(p, { estado: 'En aprobación', aprobaciones: JSON.stringify(eventos(p).concat([evento('ENVIO')])) }); U.aviso('Enviada a aprobación', 'ok'); vistaPub(raiz); pintarEncabezado(); } catch (e) { U.aviso(U.mensajeError(e), 'err'); }
      });
    };
    const decidir = async (tipo, btn) => {
      const com = (c.querySelector('#aCom').value || '').trim();
      if (tipo === 'CAMBIOS' && !com) { U.aviso('Escriba qué hay que cambiar', 'warn'); c.querySelector('#aCom').focus(); return; }
      await U.conCarga(btn, async () => {
        try {
          // Relee la publicación para no pisar la decisión de otra persona
          const fresca = (await G.items(L.pubs, { filtro: "fields/Title eq '" + p.Title + "'" }))[0] || p;
          Object.assign(p, { aprobaciones: fresca.aprobaciones, estado: fresca.estado, _etag: fresca._etag });
          if (p.estado !== 'En aprobación') { U.aviso('La publicación cambió de estado: ' + p.estado, 'warn'); vistaPub(raiz); return; }
          const nuevos = eventos(p).concat([evento(tipo, com)]);
          const tmp = Object.assign({}, p, { aprobaciones: JSON.stringify(nuevos) });
          let estado = p.estado;
          if (tipo === 'CAMBIOS') estado = 'En producción';
          else if (aprobadores(tmp).length >= CFG.minAprobaciones) estado = 'Aprobada';
          await guardarPub(p, { aprobaciones: JSON.stringify(nuevos), estado });
          U.aviso(tipo === 'CAMBIOS' ? 'Se pidieron cambios' : estado === 'Aprobada' ? '¡Aprobada! Ya se puede programar' : 'Aprobación registrada', 'ok');
          vistaPub(raiz); pintarEncabezado();
        } catch (e) { U.aviso(U.mensajeError(e), 'err'); }
      });
    };
    const si = c.querySelector('#aSi'), no = c.querySelector('#aNo');
    if (si) si.onclick = () => decidir('APROBADA', si);
    if (no) no.onclick = () => decidir('CAMBIOS', no);
  }

  // ---------- Piezas (archivos en Documentos/Marketing/Piezas/<PUB>/) ----------
  const carpeta = (p) => CFG.carpetaPiezas + '/' + p.Title;
  const rutaUrl = (r) => r.split('/').map(encodeURIComponent).join('/');
  async function pintarPiezas(raiz, p) {
    const c = raiz.querySelector('#piezas');
    let hijos = [];
    try { hijos = (await G.llamar('GET', '/sites/' + await G.sitio(CFG.sitio.host, CFG.sitio.ruta) + '/drive/root:/' + rutaUrl(carpeta(p)) + ':/children?$top=50')).value || []; }
    catch (e) { if (e.status !== 404) { c.innerHTML = '<p class="sec">' + esc(U.mensajeError(e)) + '</p>'; return; } }
    if (!c.isConnected) return;
    c.innerHTML = hijos.length ? hijos.map((h) => {
      const u = h['@microsoft.graph.downloadUrl'], img = /^image\//.test((h.file || {}).mimeType || ''), vid = /^video\//.test((h.file || {}).mimeType || '');
      return '<figure>' + (img ? '<img src="' + esc(u) + '" alt="">' : vid ? '<video src="' + esc(u) + '" controls preload="metadata"></video>' : '<div class="doc">' + esc((h.name.split('.').pop() || '').toUpperCase()) + '</div>') +
        '<figcaption><a href="' + esc(h.webUrl) + '" target="_blank" rel="noopener">' + esc(h.name) + '</a><span>' + Math.max(1, Math.round(n0(h.size) / 1024)).toLocaleString('es-CO') + ' KB</span><button class="cal-x" data-del="' + esc(h.id) + '" title="Quitar">×</button></figcaption></figure>';
    }).join('') : '<p class="ic-vacio" style="padding:8px 0">Aún no hay archivos. Suba la pieza final (de ChatGPT, Canva o CapCut).</p>';
    c.querySelectorAll('[data-del]').forEach((b) => { b.onclick = async () => {
      if (!(await U.confirmar('Quitar archivo', 'Se envía a la papelera de SharePoint (se puede recuperar).', 'Quitar', true))) return;
      try { await G.llamar('DELETE', '/sites/' + await G.sitio(CFG.sitio.host, CFG.sitio.ruta) + '/drive/items/' + b.dataset.del); await marcarCambioPieza(p); pintarPiezas(raiz, p); } catch (e) { U.aviso(U.mensajeError(e), 'err'); }
    }; });
  }
  async function subirGrande(ruta, archivo) {
    const sid = await G.sitio(CFG.sitio.host, CFG.sitio.ruta);
    const s = await G.llamar('POST', '/sites/' + sid + '/drive/root:/' + rutaUrl(ruta) + ':/createUploadSession', { item: { '@microsoft.graph.conflictBehavior': 'replace' } });
    const PARTE = 10 * 327680;
    for (let ini = 0; ini < archivo.size; ini += PARTE) {
      const fin = Math.min(ini + PARTE, archivo.size);
      const r = await fetch(s.uploadUrl, { method: 'PUT', headers: { 'Content-Range': 'bytes ' + ini + '-' + (fin - 1) + '/' + archivo.size }, body: archivo.slice(ini, fin) });
      if (!r.ok && r.status !== 202) throw new Error('No se pudo subir ' + archivo.name + ' (' + r.status + ')');
    }
  }
  async function subirPiezas(raiz, p, archivos) {
    if (!archivos.length) return;
    const c = raiz.querySelector('#piezas');
    c.insertAdjacentHTML('afterbegin', '<p class="sec" id="subiendo">Subiendo ' + archivos.length + ' archivo(s)…</p>');
    try {
      for (const a of archivos) {
        const limpio = a.name.replace(/[^\w.\-áéíóúñÁÉÍÓÚÑ ]+/g, '_');
        const ruta = carpeta(p) + '/' + limpio;
        if (a.size > 3.5 * 1024 * 1024) await subirGrande(ruta, a); else await G.subirArchivo(ruta, a);
      }
      if (!p.pieza_ruta) await guardarPub(p, { pieza_ruta: carpeta(p) });
      await marcarCambioPieza(p);
      U.aviso('Archivo(s) guardado(s) en SharePoint', 'ok');
    } catch (e) { U.aviso(U.mensajeError(e), 'err', 9000); }
    pintarPiezas(raiz, p);
  }
  async function marcarCambioPieza(p) {
    if (['En aprobación', 'Aprobada'].indexOf(p.estado) < 0) return;
    await guardarPub(p, { estado: 'En producción', aprobaciones: JSON.stringify(eventos(p).concat([{ tipo: 'EDICION', email: App.usuario.email, nombre: App.usuario.nombre, fecha: new Date().toISOString(), comentario: 'Cambió la pieza' }])) });
    U.aviso('Cambió la pieza: la publicación volvió a «En producción». Envíela otra vez a aprobación.', 'warn', 7000);
  }

  // ---------- UTM, brief y copiar ----------
  function redDeCanal(c) { const n = U.norm(c); return n.indexOf('linkedin') >= 0 ? 'LinkedIn' : n.indexOf('tiktok') >= 0 ? 'TikTok' : n.indexOf('youtube') >= 0 ? 'YouTube' : n.indexOf('instagram') >= 0 && n.indexOf('facebook') < 0 ? 'Instagram' : 'Facebook'; }
  function utm(p, destino, medio) {
    const src = redDeCanal(p.canal).toLowerCase(), sem = 'sem-' + lunesDe(dia(p.fecha));
    const u = new URL(destino);
    u.searchParams.set('utm_source', src); u.searchParams.set('utm_medium', medio); u.searchParams.set('utm_campaign', sem); u.searchParams.set('utm_content', p.Title);
    return u.toString();
  }
  function brief(p, t) {
    const L2 = (k, l) => t[k] ? l + ': ' + t[k] + '\n' : '';
    return 'Diseña una pieza para ' + p.canal + ' (' + (p.formato || 'formato a definir') + ') de Ideas Control Equipos y Soluciones S.A.S. (biometría y control de tiempo y asistencia, Colombia).\n\n' +
      'Tema: ' + (p.titulo || t.tema || '') + '\n' + L2('hook', 'Gancho') + L2('problema', 'Problema') + L2('solucion', 'Solución') + L2('cta', 'Llamado a la acción') + L2('promesa', 'Promesa') +
      (p.copy ? '\nCopy de la publicación (no lo copies entero en la imagen; usa solo el gancho y 1-3 ideas):\n' + p.copy + '\n' : '') + '\n' + CFG.marca;
  }
  async function copiar(txt, msg) {
    try { await navigator.clipboard.writeText(txt); U.aviso(msg, 'ok'); }
    catch (e) { U.modal('Copiar', '<div class="ic-form"><textarea rows="12" style="width:100%">' + esc(txt) + '</textarea><p class="sec">Selecciónelo y cópielo con Ctrl+C.</p></div>'); }
  }

  // =====================================================================
  // TEMAS
  // =====================================================================
  function vistaTemas(raiz) {
    const F = App.filtro;
    raiz.innerHTML = '<div class="ic-barra"><div><h1 class="ic-titulo">Banco de temas</h1><p class="ic-subtitulo" style="margin:0">Cada tema alimenta las publicaciones de la semana en todas las redes.</p></div><span class="espacio"></span><button class="ic-btn" id="bNuevo">+ Tema</button></div>' +
      '<div class="ic-filtros"><div class="ic-buscar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input id="fq" placeholder="Buscar tema, hook, problema, SEO…" value="' + esc(F.q) + '" autocomplete="off"></div></div><div id="tabla"></div>';
    const pintar = () => {
      const t = U.norm(F.q).split(/\s+/).filter(Boolean);
      const lista = App.temas.filter((x) => t.every((q) => U.norm([x.Title, x.tema, x.hook, x.problema, x.seo, x.categoria].join(' ')).indexOf(q) >= 0));
      raiz.querySelector('#tabla').innerHTML = '<p class="ic-conteo">' + lista.length + ' temas</p><div class="ic-tabla-caja mkt-scroll"><table class="ic-tabla"><thead><tr><th>Semana</th><th>Tema</th><th>Publicaciones</th></tr></thead><tbody>' +
        lista.map((x) => {
          const ps = App.pubs.filter((p) => p.tema_id === x.Title), pub = ps.filter((p) => p.estado === 'Publicada').length;
          return '<tr data-id="' + esc(x.Title) + '"><td class="nw">' + esc(fLarga(x.semana_inicio)) + '<span class="sec">' + esc(x.Title) + '</span></td><td><b>' + esc(x.tema) + '</b><span class="sec">' + esc(x.hook || '') + '</span></td><td class="nw">' + ps.length + (ps.length ? ' · ' + pub + ' publicadas' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      raiz.querySelectorAll('tr[data-id]').forEach((tr) => { tr.onclick = () => { location.hash = 'tema/' + tr.dataset.id; }; });
    };
    raiz.querySelector('#fq').addEventListener('input', (e) => { F.q = e.target.value; pintar(); });
    raiz.querySelector('#bNuevo').onclick = () => { location.hash = 'tema/nuevo'; };
    pintar();
  }
  const CAMPOS_TEMA = [['tema', 'Tema / título de trabajo', 't'], ['semana_inicio', 'Semana (lunes)', 'date'], ['categoria', 'Categoría', 't'], ['hook', 'Hook / guion', 'm'], ['problema', 'Problema', 'm'],
    ['autoridad', 'Autoridad', 'm'], ['solucion', 'Solución', 'm'], ['cta', 'CTA', 'm'], ['valor', 'Valor agregado', 'm'], ['seo', 'SEO', 't'], ['objetivo', 'Objetivo', 'm'], ['enfoque', 'Enfoque', 'm'],
    ['proposito', 'Propósito', 'm'], ['promesa', 'Promesa', 'm'], ['kpis', 'KPIs', 'm'], ['microapp', 'Microapp sugerida', 't'], ['cta_microapp', 'CTA sugerido con microapp', 'm'], ['hashtags', 'Hashtags', 'm'], ['palabras', 'Palabras clave', 'm']];
  function vistaTema(raiz) {
    const id = decodeURIComponent(location.hash.split('/')[1] || ''), nuevo = id === 'nuevo';
    const t = nuevo ? { semana_inicio: lunesDe(hoyISO()) } : temaDe(id);
    if (!t) { raiz.innerHTML = '<div class="ic-tabla-caja"><p class="ic-vacio">No se encontró ' + esc(id) + '. <a href="#temas">Volver</a></p></div>'; return; }
    const ps = nuevo ? [] : App.pubs.filter((p) => p.tema_id === t.Title);
    raiz.innerHTML = '<a class="ic-volver" href="#temas">← Temas</a><div class="ic-ficha-cab"><div class="principal">' + (nuevo ? '' : '<span class="ic-tag" style="background:#E6F0FA;color:#0A5A90">' + esc(t.Title) + '</span>') +
      '<h1>' + esc(nuevo ? 'Nuevo tema' : t.tema) + '</h1></div>' + (nuevo ? '' : '<div class="gen-acc"><a class="ic-btn" href="#generar/' + esc(t.Title) + '/contenido">✨ Generar contenido</a><a class="ic-btn sec" href="#generar/' + esc(t.Title) + '/newsletter">Generar newsletter</a><button class="ic-btn sec" id="bPub">+ Publicación</button></div>') + '</div>' +
      '<div class="mkt-ficha"><div class="mkt-col"><section class="ic-bloque"><div class="cab"><h2>Definición</h2></div><div class="cuerpo"><form class="ic-form" id="fTema"><div class="ic-campos">' +
        CAMPOS_TEMA.map((c) => U.campo({ name: c[0], label: c[1], t: c[2] === 'm' ? 'textarea' : c[2] === 'date' ? 'date' : 'text', valor: c[2] === 'date' ? dia(t[c[0]]) : (t[c[0]] || ''), c: c[2] === 'm' || c[0] === 'tema' ? 'c12' : 'c4', filas: 2, req: c[0] === 'tema', max: c[2] === 't' ? 250 : undefined })).join('') +
      '</div><div class="ic-acciones"><button class="ic-btn" id="bGuardar">Guardar</button></div></form></div></section></div>' +
      '<div class="mkt-col"><section class="ic-bloque"><div class="cab"><h2>Publicaciones</h2></div><div class="cuerpo">' +
        (ps.length ? ps.map((p) => '<a class="ic-item" href="#pub/' + esc(p.Title) + '"><div><div class="titulo">' + esc(fLarga(p.fecha)) + ' · ' + esc(p.canal) + '</div><div class="sec">' + esc(p.formato || 'Formato sin definir') + '</div></div>' + chipEstado(p.estado) + '</a>').join('') : '<p class="ic-vacio" style="padding:8px 0">Sin publicaciones.</p>') +
      '</div></section></div></div>';
    const f = raiz.querySelector('#fTema');
    f.onsubmit = async (ev) => {
      ev.preventDefault();
      const v = U.leerForm(f);
      if (!v.tema) { U.marcarErrores(f, { tema: 'Obligatorio' }); return; }
      await U.conCarga(raiz.querySelector('#bGuardar'), async () => {
        try {
          if (nuevo) {
            const nid = 'TEM-' + pad(await G.siguiente('TEM'), 4);
            const it = await G.crear(L.temas, Object.assign({ Title: nid, estado: 'ACTIVO' }, v));
            App.temas.push(it); U.aviso('Tema ' + nid + ' creado', 'ok'); location.hash = 'tema/' + nid;
          } else { await G.actualizar(L.temas, t._id, v); Object.assign(t, v); U.aviso('Tema guardado', 'ok'); vistaTema(raiz); }
        } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); }
      });
    };
    const bp = raiz.querySelector('#bPub'); if (bp) bp.onclick = () => nuevaPublicacion({ tema_id: t.Title, fecha: dia(t.semana_inicio) || hoyISO() });
  }

  // =====================================================================
  // POR APROBAR
  // =====================================================================
  function vistaAprobar(raiz) {
    const mias = pendientesMias(), todas = App.pubs.filter((p) => p.estado === 'En aprobación');
    const fila = (p) => '<a class="ic-item" href="#pub/' + esc(p.Title) + '"><div><div class="titulo">' + esc(p.titulo || (temaDe(p.tema_id) || {}).tema || p.Title) + '</div><div class="sec">' + esc(fLarga(p.fecha)) + ' · ' + esc(p.canal) +
      ' · ' + aprobadores(p).length + ' de ' + CFG.minAprobaciones + ' aprobaciones</div></div>' + chipCanal(p.canal) + '</a>';
    raiz.innerHTML = '<h1 class="ic-titulo">Por aprobar</h1><p class="ic-subtitulo">Cada publicación necesita ' + CFG.minAprobaciones + ' aprobaciones de Gerencia General, Dirección Comercial o Dirección de Operaciones.</p>' +
      '<section class="ic-bloque"><div class="cab"><h2>Esperan su respuesta (' + mias.length + ')</h2></div><div class="cuerpo">' + (mias.map(fila).join('') || '<p class="ic-vacio" style="padding:8px 0">Nada pendiente para usted. 🎉</p>') + '</div></section>' +
      '<section class="ic-bloque" style="margin-top:16px"><div class="cab"><h2>Todas en aprobación (' + todas.length + ')</h2></div><div class="cuerpo">' + (todas.map(fila).join('') || '<p class="ic-vacio" style="padding:8px 0">Ninguna.</p>') + '</div></section>';
  }

  // =====================================================================
  // MÉTRICAS
  // =====================================================================
  const CAMPOS_MET = [['alcance', 'Alcance'], ['alcance_colombia', 'Alcance en Colombia'], ['impresiones', 'Impresiones / reproducciones'], ['reacciones', 'Me gusta / reacciones'], ['comentarios', 'Comentarios'],
    ['compartidos', 'Compartidos'], ['guardados', 'Guardados'], ['clics', 'Clics al enlace / CTA'], ['vistas_perfil', 'Vistas del perfil'], ['nuevos_seguidores', 'Nuevos seguidores'],
    ['reproducciones', 'Reproducciones de video'], ['visualizaciones', 'Visualizaciones del video'], ['tiempo_prom', 'Tiempo prom. de visualización (seg)'], ['video_completo', 'Vieron el video completo'],
    ['inversion', 'Inversión ($)'], ['resultados', 'Resultados (leads/mensajes/ventas)'], ['leads', 'Leads en landings']];
  function periodoDefecto() { const l = lunesDe(hoyISO()); return [sumarDias(l, -7), sumarDias(l, -1)]; }
  function vistaMetricas(raiz) {
    const M = App.mf; if (!M.desde) { const p = periodoDefecto(); M.desde = sumarDias(p[0], -21); M.hasta = p[1]; }
    raiz.innerHTML = '<div class="ic-barra"><div><h1 class="ic-titulo">Métricas</h1><p class="ic-subtitulo" style="margin:0">Una fila por publicación o campaña. El periodo filtra por semana de campaña (lunes).</p></div><span class="espacio"></span><a class="ic-btn" href="#importar">Importar estadísticas</a><button class="ic-btn sec" id="bNueva">+ Registrar a mano</button></div>' +
      '<div class="ic-filtros"><label class="mkt-fecha">Desde <input type="date" id="mD" value="' + M.desde + '"></label><label class="mkt-fecha">Hasta <input type="date" id="mH" value="' + M.hasta + '"></label><select id="mR">' + opciones(CFG.redes, M.red, 'Todas las redes') + '</select></div><div id="tabla"></div>';
    const pintar = () => {
      const lista = App.mets.filter((m) => { const f = dia(m.fecha_campana || m.fecha_publicacion); return f >= M.desde && f <= M.hasta && (!M.red || m.red === M.red); });
      const rep = vaciasRepetidas();
      raiz.querySelector('#tabla').innerHTML = (rep.length ? '<div class="gen-aviso" style="margin:0 0 10px;display:flex;flex-wrap:wrap;gap:10px;align-items:center"><span>⚠️ Hay ' + rep.length + ' fila(s) vacía(s) repetida(s): son registros sin números (por ejemplo, los del Excel de reporte) que ya tienen su gemela importada con datos.</span><button class="ic-btn chico" id="bRep">Quitar las vacías</button></div>' : '') +
        '<p class="ic-conteo">' + lista.length + ' registros</p><div class="ic-tabla-caja mkt-scroll"><table class="ic-tabla"><thead><tr><th>Campaña</th><th>Publicado</th><th>Corte</th><th>Red</th><th>Publicación / campaña</th><th>Tipo</th><th class="n">Alcance</th><th class="n">Impresiones</th><th class="n">Interacciones</th><th class="n">Tasa</th><th class="n">Clics</th><th class="n">Inversión</th></tr></thead><tbody>' +
        (lista.map((m) => { const i = interacciones(m); return '<tr data-m="' + esc(m.Title) + '"><td class="nw">' + esc(m.fecha_campana ? 'sem ' + fCorta(m.fecha_campana) : '—') + '</td><td class="nw">' + esc(fCorta(m.fecha_publicacion) || '—') + '</td><td class="nw">' + esc(fCorta(m.fecha_corte) || '—') + '</td><td>' + esc(m.red || '—') + '</td><td class="mkt-nomcel"><b class="mkt-nom" title="' + esc(m.nombre || '') + '">' + esc(nombreCorto(m.nombre || m.publicacion_id || '')) + '</b>' + (m.publicacion_id ? '<span class="sec">' + esc(m.publicacion_id) + '</span>' : '') + '</td><td>' + esc(m.tipo || '') + '</td>' +
          '<td class="n">' + num(m.alcance) + '</td><td class="n">' + num(m.impresiones) + '</td><td class="n">' + num(i) + '</td><td class="n">' + (n0(m.alcance) ? pct(i / n0(m.alcance)) : '—') + '</td><td class="n">' + num(m.clics) + '</td><td class="n">' + (n0(m.inversion) ? U.fmt.cop(m.inversion) : '—') + '</td></tr>'; }).join('') ||
          '<tr><td colspan="12" class="ic-vacio">Sin métricas en el periodo.</td></tr>') + '</tbody></table></div>';
      raiz.querySelectorAll('tr[data-m]').forEach((tr) => { tr.onclick = () => formMetrica(App.mets.find((m) => m.Title === tr.dataset.m), pintar); });
      const br = raiz.querySelector('#bRep');
      if (br) br.onclick = async () => {
        if (!(await U.confirmar('Quitar filas vacías repetidas', 'Se quitarán ' + rep.length + ' registro(s) sin números que ya tienen su gemela con datos (' + rep.map((m) => m.Title).join(', ') + '). Quedan en la papelera de SharePoint.', 'Quitar', true))) return;
        await U.conCarga(br, async () => {
          try { for (const m of rep) { await G.eliminar(L.mets, m._id); App.mets = App.mets.filter((x) => x !== m); } U.aviso(rep.length + ' fila(s) quitada(s)', 'ok'); pintar(); }
          catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); pintar(); }
        });
      };
    };
    raiz.querySelector('#mD').onchange = (e) => { M.desde = e.target.value; pintar(); };
    raiz.querySelector('#mH').onchange = (e) => { M.hasta = e.target.value; pintar(); };
    raiz.querySelector('#mR').onchange = (e) => { M.red = e.target.value; pintar(); };
    raiz.querySelector('#bNueva').onclick = () => formMetrica({}, pintar);
    pintar();
  }
  function formMetrica(m, alGuardar) {
    const nueva = !m.Title;
    const pubsOp = App.pubs.filter((p) => ['Publicada', 'Programada'].indexOf(p.estado) >= 0 || p.Title === m.publicacion_id).slice().reverse().slice(0, 200);
    U.modal(nueva ? 'Registrar métricas' : 'Métricas ' + m.Title, '<form class="ic-form" id="fMet"><div class="ic-campos">' +
      '<div class="ic-campo c12"><label for="m_pub">Publicación</label><select id="m_pub" name="publicacion_id"><option value="">— Sin vincular (campaña o registro antiguo) —</option>' +
        pubsOp.map((p) => '<option value="' + esc(p.Title) + '"' + (p.Title === m.publicacion_id ? ' selected' : '') + '>' + esc(fCorta(p.fecha) + ' · ' + p.canal + ' · ' + (p.titulo || '')) + '</option>').join('') + '</select></div>' +
      U.campo({ name: 'nombre', label: 'Nombre de la publicación / campaña', valor: m.nombre || '', c: 'c12', req: true, max: 250 }) +
      '<div class="ic-campo c3"><label for="m_red">Red</label><select id="m_red" name="red">' + opciones(CFG.redes, m.red || '', 'Seleccione…') + '</select></div>' +
      '<div class="ic-campo c3"><label for="m_tipo">Tipo</label><select id="m_tipo" name="tipo">' + opciones(CFG.tipos, m.tipo || 'Orgánico') + '</select></div>' +
      '<div class="ic-campo c3"><label for="m_obj">Objetivo</label><select id="m_obj" name="objetivo">' + opciones(CFG.objetivos, m.objetivo || '', '—') + '</select></div>' +
      U.campo({ name: 'fecha_publicacion', label: 'Fecha de publicación', t: 'date', valor: dia(m.fecha_publicacion) || hoyISO(), c: 'c3', ayuda: 'El día en que salió el post.' }) +
      U.campo({ name: 'fecha_campana', label: 'Semana de campaña (lunes)', t: 'date', valor: dia(m.fecha_campana) || lunesDe(dia(m.fecha_publicacion) || hoyISO()), c: 'c3', ayuda: 'El lunes de la semana del tema (igual al UTM sem-…).' }) +
      (tieneCol('fecha_corte') ? U.campo({ name: 'fecha_corte', label: 'Números con corte al', t: 'date', valor: dia(m.fecha_corte) || hoyISO(), c: 'c3', ayuda: 'Hasta qué día van estos números.' }) : '') +
      CAMPOS_MET.map((c) => U.campo({ name: c[0], label: c[1], valor: m[c[0]] === undefined || m[c[0]] === null ? '' : m[c[0]], c: 'c3', modo: 'decimal' })).join('') +
      U.campo({ name: 'notas', label: 'Notas / análisis', t: 'textarea', valor: m.notas || '', c: 'c12', filas: 3, ayuda: 'Ej.: «61 % del alcance fue en Venezuela», costo por resultado alto, etc.' }) +
      '</div><div class="ic-acciones">' + (nueva ? '' : '<button type="button" class="ic-btn peligro" id="mDel" style="margin-right:auto">Eliminar</button>') + '<button type="button" class="ic-btn sec" id="mCan">Cancelar</button><button class="ic-btn" id="mOk">Guardar</button></div></form>', (c) => {
      c.querySelector('#mCan').onclick = U.cerrarModal;
      const f = c.querySelector('#fMet'), sp = c.querySelector('#m_pub');
      sp.onchange = () => { const p = pubDe(sp.value); if (!p) return; f.nombre.value = p.titulo || f.nombre.value; f.red.value = redDeCanal(p.canal); f.fecha_publicacion.value = dia(p.fecha); f.fecha_campana.value = lunesDe(dia(p.fecha)); };
      f.fecha_publicacion.addEventListener('change', () => { if (f.fecha_publicacion.value) f.fecha_campana.value = lunesDe(f.fecha_publicacion.value); });
      const del = c.querySelector('#mDel');
      if (del) del.onclick = async () => {
        if (!(await U.confirmar('Eliminar ' + m.Title, 'Se borra este registro de métricas.', 'Eliminar', true))) return;
        try { await G.eliminar(L.mets, m._id); App.mets = App.mets.filter((x) => x !== m); U.aviso('Registro eliminado', 'ok'); alGuardar && alGuardar(); } catch (e) { U.aviso(U.mensajeError(e), 'err'); }
      };
      f.onsubmit = async (ev) => {
        ev.preventDefault();
        const v = U.leerForm(f), err = {};
        if (!v.nombre) err.nombre = 'Obligatorio';
        if (!v.red) err.red = 'Obligatorio';
        const campos = { publicacion_id: v.publicacion_id, tema_id: (pubDe(v.publicacion_id) || {}).tema_id || m.tema_id || '', nombre: v.nombre, red: v.red, tipo: v.tipo, objetivo: v.objetivo, fecha_publicacion: v.fecha_publicacion, fecha_campana: v.fecha_campana ? lunesDe(v.fecha_campana) : (v.fecha_publicacion ? lunesDe(v.fecha_publicacion) : null), notas: v.notas };
        if (tieneCol('fecha_corte')) campos.fecha_corte = v.fecha_corte || null;
        CAMPOS_MET.forEach((k) => {
          let s = String(v[k[0]] || '').replace(/[\s$%]/g, '');
          if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '');   // 31.069 o 1.234,5 (miles con punto)
          s = s.replace(',', '.');
          if (s === '') { campos[k[0]] = nueva ? '' : null; return; }
          const n = Number(s); if (!isFinite(n) || n < 0) err[k[0]] = 'Número no válido'; else campos[k[0]] = n;
        });
        if (!U.marcarErrores(f, err)) return;
        await U.conCarga(c.querySelector('#mOk'), async () => {
          try {
            if (nueva) {
              const id = 'MET-' + pad(await G.siguiente('MET'), 5);
              const it = await G.crear(L.mets, Object.assign({ Title: id, registrado_por: App.usuario.nombre }, campos));
              App.mets.unshift(it);
            } else { await G.actualizar(L.mets, m._id, campos); Object.keys(campos).forEach((k) => { m[k] = campos[k] === null ? '' : campos[k]; }); }
            U.cerrarModal(); U.aviso('Métricas guardadas', 'ok'); alGuardar && alGuardar();
          } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); }
        });
      };
    });
  }

  // =====================================================================
  // RESUMEN PARA GERENCIA
  // =====================================================================
  function vistaResumen(raiz) {
    const M = App.mf; if (!M.rd) { const p = periodoDefecto(); M.rd = p[0]; M.rh = p[1]; }
    const ms = App.mets.filter((m) => { const f = dia(m.fecha_campana || m.fecha_publicacion); return f >= M.rd && f <= M.rh; });
    const S = (k, arr) => (arr || ms).reduce((s, m) => s + n0(m[k]), 0), SI = (arr) => (arr || ms).reduce((s, m) => s + interacciones(m), 0);
    const pl = App.pubs.filter((p) => dia(p.fecha) >= M.rd && dia(p.fecha) <= M.rh && p.estado !== 'Cancelada'), plPub = pl.filter((p) => p.estado === 'Publicada').length;
    const inv = S('inversion'), res = S('resultados'), alc = S('alcance'), it = SI();
    const kpi = (v, l, s) => '<div class="ic-kpi"><div class="valor">' + v + '</div><div class="etiqueta">' + l + '</div>' + (s ? '<div class="mkt-sub">' + s + '</div>' : '') + '</div>';
    const meta = (v, mt, l) => '<div class="mkt-meta"><div class="t"><b>' + l + '</b><span>' + num(v) + ' de ' + num(mt) + '</span></div><div class="barra"><i style="width:' + Math.min(100, Math.round(100 * v / (mt || 1))) + '%"></i></div></div>';
    const redes = CFG.redes.map((r) => { const a = ms.filter((m) => m.red === r); return [r, a]; }).filter((x) => x[1].length);
    const top = ms.slice().sort((a, b) => interacciones(b) - interacciones(a)).slice(0, 5);
    raiz.innerHTML = '<div class="ic-barra"><div><h1 class="ic-titulo">Resumen para gerencia</h1><p class="ic-subtitulo" style="margin:0">Ideas Control · ' + esc(fLarga(M.rd)) + ' al ' + esc(fLarga(M.rh)) + '</p></div><span class="espacio"></span>' +
      '<label class="mkt-fecha mkt-noimp">Desde <input type="date" id="rD" value="' + M.rd + '"></label><label class="mkt-fecha mkt-noimp">Hasta <input type="date" id="rH" value="' + M.rh + '"></label>' +
      '<button class="ic-btn sec mkt-noimp" id="bImp">Imprimir / PDF</button><button class="ic-btn sec mkt-noimp" id="bExcel">Excel</button></div>' +
      '<div class="ic-kpis">' + kpi(num(alc), 'Alcance', 'Impresiones: ' + num(S('impresiones'))) + kpi(num(it), 'Interacciones', 'Tasa: ' + (alc ? pct(it / alc) : '—')) +
        kpi(num(S('clics')), 'Clics al enlace', 'Nuevos seguidores: ' + num(S('nuevos_seguidores'))) + kpi(plPub + ' / ' + pl.length, 'Plan cumplido', 'Publicadas / planeadas en el periodo') + '</div>' +
      '<div class="ic-kpis" style="margin-top:14px">' + kpi(ms.length, 'Registros de métricas', 'Orgánicos ' + ms.filter((m) => m.tipo !== 'Pago').length + ' · Pagos ' + ms.filter((m) => m.tipo === 'Pago').length) +
        kpi(num(S('reproducciones')), 'Reproducciones de video') + kpi(inv ? U.fmt.cop(inv) : '$ 0', 'Inversión') + kpi(num(res) + (inv && res ? ' · ' + U.fmt.cop(inv / res) : ''), 'Resultados · costo por resultado') + '</div>' +
      '<div class="mkt-res2"><section class="ic-bloque"><div class="cab"><h2>Por red</h2></div><div class="cuerpo mkt-scroll"><table class="ic-tabla"><thead><tr><th>Red</th><th class="n">Registros</th><th class="n">Alcance</th><th class="n">Impresiones</th><th class="n">Interacciones</th><th class="n">Clics</th><th class="n">Seguidores</th><th class="n">Inversión</th><th class="n">Costo x clic</th></tr></thead><tbody>' +
        (redes.map(([r, a]) => '<tr><td><b>' + esc(r) + '</b></td><td class="n">' + a.length + '</td><td class="n">' + num(S('alcance', a)) + '</td><td class="n">' + num(S('impresiones', a)) + '</td><td class="n">' + num(SI(a)) + '</td><td class="n">' + num(S('clics', a)) + '</td><td class="n">' + num(S('nuevos_seguidores', a)) +
          '</td><td class="n">' + (S('inversion', a) ? U.fmt.cop(S('inversion', a)) : '—') + '</td><td class="n">' + (S('inversion', a) && S('clics', a) ? U.fmt.cop(S('inversion', a) / S('clics', a)) : '—') + '</td></tr>').join('') || '<tr><td colspan="9" class="ic-vacio">Sin métricas en el periodo.</td></tr>') +
        '</tbody></table></div></section>' +
      '<section class="ic-bloque"><div class="cab"><h2>Embudo vs. metas</h2><span class="sec">Definición de KPIs</span></div><div class="cuerpo">' +
        meta(alc, CFG.metas.alcance, 'Alcance') + meta(it, CFG.metas.interacciones, 'Interacciones') + meta(S('clics'), CFG.metas.clics, 'Tráfico (clics)') + meta(S('leads') || res, CFG.metas.leads, 'Leads') + '</div></section></div>' +
      '<section class="ic-bloque" style="margin-top:16px"><div class="cab"><h2>Contenido destacado del periodo</h2></div><div class="cuerpo">' +
        (top.map((m) => '<div class="ic-item"><div><div class="titulo mkt-nom" title="' + esc(m.nombre || '') + '">' + esc(nombreCorto(m.nombre || m.publicacion_id)) + '</div><div class="sec">' + esc(m.red) + ' · ' + esc(m.tipo || '') + ' · alcance ' + num(m.alcance) + '</div>' + (m.notas ? '<div class="sec">' + esc(m.notas) + '</div>' : '') + '</div><b>' + num(interacciones(m)) + ' interac.</b></div>').join('') || '<p class="ic-vacio" style="padding:8px 0">—</p>') + '</div></section>';
    raiz.querySelector('#rD').onchange = (e) => { M.rd = e.target.value; vistaResumen(raiz); };
    raiz.querySelector('#rH').onchange = (e) => { M.rh = e.target.value; vistaResumen(raiz); };
    raiz.querySelector('#bImp').onclick = () => window.print();
    raiz.querySelector('#bExcel').onclick = () => exportar().catch((e) => U.aviso(U.mensajeError(e), 'err'));
  }

  // ---------- Excel ----------
  function cargarXLSX() {
    if (window.XLSX) return Promise.resolve();
    return new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar la librería de Excel.')); document.head.appendChild(s); });
  }
  async function exportar() {
    await cargarXLSX();
    const fe = (v) => v ? new Date(dia(v) + 'T12:00:00') : '';
    const ws1 = XLSX.utils.json_to_sheet(App.temas.map((t) => Object.assign({ ID: t.Title, Semana: fe(t.semana_inicio) }, ...CAMPOS_TEMA.filter((c) => c[0] !== 'semana_inicio').map((c) => ({ [c[1]]: t[c[0]] || '' })))), { cellDates: true });
    const ws2 = XLSX.utils.json_to_sheet(App.pubs.map((p) => ({ ID: p.Title, Fecha: fe(p.fecha), Red: p.canal, Formato: p.formato || '', Tema: (temaDe(p.tema_id) || {}).tema || '', 'Título': p.titulo || '', Estado: p.estado || '',
      Aprobaciones: aprobadores(p).map((a) => a.nombre).join(', '), 'Link publicado': p.link || '', 'Enlace UTM': p.utm_url || '', Copy: p.copy || '', Notas: p.notas || '' })), { cellDates: true });
    const ws3 = XLSX.utils.json_to_sheet(App.mets.map((m) => Object.assign({ ID: m.Title, 'Fecha de corte': fe(m.fecha_campana), 'Fecha publicación': fe(m.fecha_publicacion), Red: m.red || '', Tipo: m.tipo || '', 'Publicación / campaña': m.nombre || '', Objetivo: m.objetivo || '', 'Publicación ID': m.publicacion_id || '' },
      ...CAMPOS_MET.map((c) => ({ [c[1]]: m[c[0]] === undefined || m[c[0]] === '' ? '' : Number(m[c[0]]) })), { 'Interacciones totales': interacciones(m), Notas: m.notas || '' })), { cellDates: true });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws2, 'Publicaciones'); XLSX.utils.book_append_sheet(wb, ws1, 'Temas'); XLSX.utils.book_append_sheet(wb, ws3, 'Métricas');
    XLSX.writeFile(wb, 'Marketing_IC_' + hoyISO() + '.xlsx');
  }

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
      if (!CFG.usuarios[email]) { U.pantalla(raiz, { logo: CFG.logo, titulo: 'Sin acceso', texto: 'Esta app es solo para Gerencia General, Dirección Comercial y Dirección de Operaciones.', boton: 'Volver al portal', alClic: () => IC.portal.volver() }); return; }
      App.usuario = { nombre: cuenta.name || email, email, iniciales: U.fmt.iniciales(cuenta.name || email) };
      U.pantalla(raiz, { logo: CFG.logo, cargando: true, titulo: 'Cargando el plan…', texto: 'Temas, publicaciones y métricas' });
      await G.sitio(CFG.sitio.host, CFG.sitio.ruta);
      await cargar();
      pintarEncabezado();
      U.enrutar({ '': () => vistaCalendario(raiz), lista: () => vistaLista(raiz), pub: () => vistaPub(raiz), temas: () => vistaTemas(raiz), tema: () => vistaTema(raiz),
        aprobar: () => vistaAprobar(raiz), metricas: () => vistaMetricas(raiz), resumen: () => vistaResumen(raiz), generar: () => MKT_GEN.vista(raiz), importar: () => MKT_IMP.vista(raiz) }, marcarNav);
    } catch (e) {
      console.error(e);
      const falta = /No existe la lista MKT_/.test(e.message);
      U.pantalla(raiz, { logo: CFG.logo, titulo: falta ? 'Falta instalar la app' : 'No se pudo cargar la app',
        texto: falta ? 'Las listas de Marketing aún no existen en IC Apps. Abra el instalador (Programacion/Instalador/) y haga clic en «Crear estructura».' : U.mensajeError(e), boton: 'Reintentar', alClic: () => location.reload() });
    }
  }
  // Funciones que usa el generador (js/generador.js)
  window.MKT = { dia, hoyISO, sumarDias, lunesDe, fLarga, fCorta, pad, temaDe, utm, redDeCanal, copiar, rutaUrl, chipCanal, chipEstado, opciones, nombreCorto, parecido, metVacia };
  window.addEventListener('DOMContentLoaded', arrancar);
})();
