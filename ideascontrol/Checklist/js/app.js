/* =====================================================================
   APP-113 · Checklist de Operaciones — lo que tiene y lo que le falta al área
   Vistas: #  resumen · #checklist  elementos (editar, agregar, borrar, reclasificar)
           #catalogos  tipos, áreas, series y calculadora de consecutivo
           #excel  importar / exportar el Excel con sus tres hojas
   Datos: CHK_Items y CHK_Catalogo (IC Apps). Los códigos de documento se
   cruzan con la biblioteca de Gestión documental para abrir el manual.
   ===================================================================== */
const App = { usuario: null, items: [], cat: [], docs: {}, docsOk: false, sel: new Set(),
  filtro: { categoria: '', tipo: '', estado: '', prioridad: '', responsable: '', doc: '', q: '' } };

(function () {
  const U = IC.ui, esc = U.esc, G = IC.graph;
  const pad = (n, l) => String(n).padStart(l || 4, '0');
  const hoy = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2); };
  const dia = (v) => (v ? String(v).slice(0, 10) : '');
  const textoFecha = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const resumir = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  const cerrado = (it) => it.estado === 'Completado' || it.estado === 'No aplica';
  const vencido = (it) => !cerrado(it) && it.fecha_objetivo && it.fecha_objetivo < hoy();
  const pct = (c, t, na) => (t - na) > 0 ? Math.round(c * 100 / (t - na)) : 0;

  // ---------- Códigos de documento ----------
  function codigos(txt) { return String(txt || '').toUpperCase().match(CFG.patronCodigo) || []; }
  function docsDe(it) { return Array.from(new Set(codigos(it.codigo_doc).concat(codigos(it.observaciones)))); }
  function chipDoc(c) {
    const d = App.docs[c];
    if (d || !App.docsOk) return '<a class="chk-doc' + (d ? ' pub' : '') + '" href="' + esc(CFG.urlDoc + encodeURIComponent(c)) + '" target="ic_APP-105" title="' + esc(d ? 'Abrir para leer: ' + d.titulo : 'Abrir en Gestión documental') + '">' + ICO_LEER + esc(c) + '</a>';
    return '<span class="chk-doc no" title="Aún no está publicado en Gestión documental">' + esc(c) + '</span>';
  }
  const ICO_LEER = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';

  // ---------- Datos ----------
  function normal(it) { it.fecha_objetivo = dia(it.fecha_objetivo); it.fecha_completado = dia(it.fecha_completado); it.orden = Number(it.orden) || 0; return it; }
  async function cargar() {
    App.items = (await G.items('CHK_Items', { top: 5000 })).map(normal);
    ordenar();
  }
  function ordenar() {
    const oc = ordenCat();
    App.items.sort((a, b) => (oc[a.categoria] ?? 999) - (oc[b.categoria] ?? 999) || String(a.categoria).localeCompare(String(b.categoria)) || a.orden - b.orden || String(a.Title).localeCompare(b.Title));
  }
  async function cargarCatalogo() {
    App.cat = (await G.items('CHK_Catalogo', { top: 2000 })).map((c) => Object.assign(c, { orden: Number(c.orden) || 0 }));
    if (!App.cat.length) await sembrarCatalogo();
  }
  async function sembrarCatalogo() {
    const filas = [];
    Object.keys(CFG.catalogo).forEach((g) => CFG.catalogo[g].forEach((x, i) => {
      const con = CFG.grupos[g].conCodigo;
      filas.push({ grupo: g, codigo: con ? x[0] : '', nombre: con ? x[1] : x[0], descripcion: con ? (x[2] || '') : '', orden: i + 1 });
    }));
    let n = await G.reservar('CHKC', filas.length);
    for (const f of filas) { f.Title = 'CAT-' + pad(n++); if (!f.codigo) delete f.codigo; if (!f.descripcion) delete f.descripcion; await G.crear('CHK_Catalogo', f); }
    App.cat = (await G.items('CHK_Catalogo', { top: 2000 })).map((c) => Object.assign(c, { orden: Number(c.orden) || 0 }));
  }
  const delGrupo = (g) => App.cat.filter((c) => c.grupo === g).sort((a, b) => a.orden - b.orden || String(a.codigo || a.nombre).localeCompare(String(b.codigo || b.nombre)));
  function ordenCat() { const o = {}; delGrupo('CATEGORIA').forEach((c, i) => { o[c.nombre] = i; }); return o; }
  // Valores del catálogo + los que ya traen los elementos (por si se escribió uno fuera del catálogo)
  function valores(g) {
    const s = delGrupo(g).map((c) => c.nombre), campo = CFG.grupos[g].campo;
    if (campo) App.items.forEach((it) => { if (it[campo] && s.indexOf(it[campo]) < 0) s.push(it[campo]); });
    return s;
  }
  const responsables = () => Array.from(new Set(App.items.map((i) => i.responsable).filter(Boolean).concat(['Martin Molina']))).sort();

  // Documentos publicados en Gestión documental (código → título). Si falla, los códigos igual se pueden abrir.
  async function cargarDocs() {
    try {
      const s = await G.llamar('GET', '/sites/' + CFG.docs.host + ':' + CFG.docs.ruta + '?$select=id');
      const clave = (x) => U.norm(x).replace(/[^a-z0-9]/g, ''), obj = clave(CFG.docs.biblioteca);
      const drives = await G.todas('/sites/' + s.id + '/drives?$select=id,name,webUrl');
      const d = drives.find((x) => clave(x.name) === obj || clave(decodeURIComponent(String(x.webUrl || '').split('/').pop())) === obj);
      if (!d) return;
      const lista = await G.llamar('GET', '/drives/' + d.id + '/list?$select=id');
      const items = await G.todas('/sites/' + s.id + '/lists/' + lista.id + '/items?$expand=fields,driveItem($select=name,file)&$top=500');
      const docs = {};
      items.forEach((it) => {
        const f = it.fields || {}, di = it.driveItem || {};
        if (!di.file) return;
        const nombre = di.name || f.FileLeafRef || '';
        const c = String(f.Codigo || (nombre.match(/^\d{4}-[A-Z]{3}-[A-Z]{2,3}/) || [''])[0]).trim().toUpperCase();
        if (!c || /obsolet/i.test(f.Estado_documento || '')) return;
        const pdf = /\.pdf$/i.test(nombre);
        if (!docs[c] || pdf) docs[c] = { titulo: (pdf || !docs[c] ? (f.Title || nombre.replace(/^\d{4}-[A-Z]{3}-[A-Z]{2,3}\s*-\s*/, '').replace(/\.\w+$/, '')) : docs[c].titulo), pdf: pdf || (docs[c] && docs[c].pdf) };
      });
      App.docs = docs; App.docsOk = true;
    } catch (e) { console.warn('Gestión documental no disponible', e); App.docsOk = false; }
  }

  // ---------- Encabezado ----------
  function pintarEncabezado() {
    const u = App.usuario;
    document.getElementById('encabezado').innerHTML =
      '<a href="#"><img class="logo" src="' + CFG.logo + '" alt="Ideas Control"></a>' +
      '<div class="app-nombre"><b>' + esc(CFG.app.nombre) + '</b><span>' + CFG.app.id + ' · v' + CFG.app.version + '</span></div><div class="espacio"></div>' +
      '<nav class="chk-nav"><a href="#" data-r="">Resumen</a><a href="#checklist" data-r="checklist">Checklist</a><a href="#catalogos" data-r="catalogos">Tipos y áreas</a><a href="#excel" data-r="excel">Excel</a></nav>' +
      '<div class="ic-user">' + IC.portal.boton() + '<div class="datos"><b>' + esc(u.nombre) + '</b><span>Dirección de Operaciones</span></div>' +
      '<div class="ic-avatar" title="' + esc(u.email) + '">' + esc(u.iniciales) + '</div><button class="ic-btn sec chico" id="btnSalir">Salir</button></div>';
    document.getElementById('encabezado').hidden = false;
    document.getElementById('btnSalir').onclick = () => IC.auth.salir();
  }
  const marcarNav = (r) => document.querySelectorAll('.chk-nav a').forEach((a) => a.classList.toggle('on', a.dataset.r === r));
  const chipEstado = (e) => '<span class="chk-est e-' + U.norm(e || '').replace(/[^a-z]/g, '') + '">' + esc(e || '—') + '</span>';
  const barra = (v) => '<div class="chk-barra"><i style="width:' + Math.max(0, Math.min(100, v)) + '%"></i></div>';

  // =====================================================================
  // RESUMEN (hoja «Resumen» del Excel)
  // =====================================================================
  function conteo(lista) {
    const n = (e) => lista.filter((i) => i.estado === e).length;
    const r = { total: lista.length, com: n('Completado'), cur: n('En curso'), pen: n('Pendiente'), na: n('No aplica') };
    r.otro = r.total - r.com - r.cur - r.pen - r.na; r.pct = pct(r.com, r.total, r.na);
    return r;
  }
  function tablaAvance(titulo, campo, vals) {
    const filas = vals.map((v) => [v, conteo(App.items.filter((i) => (i[campo] || '') === v))]).filter((x) => x[1].total);
    const sin = App.items.filter((i) => !i[campo]); if (sin.length) filas.push(['', conteo(sin)]);
    const tot = conteo(App.items);
    const td = (x, k, est) => '<td class="num">' + (x[k] ? '<a href="#checklist" data-f="' + campo + '" data-v="' + esc(est.v) + '" data-e="' + esc(est.e) + '">' + x[k] + '</a>' : '0') + '</td>';
    return '<section class="ic-bloque"><div class="cab"><h2>' + esc(titulo) + '</h2></div><div class="cuerpo chk-scroll"><table class="ic-tabla chk-res"><thead><tr><th>' + (campo === 'categoria' ? 'Categoría' : 'Tipo') +
      '</th><th class="num">Total</th><th class="num">Completado</th><th class="num">En curso</th><th class="num">Pendiente</th><th class="num">No aplica</th><th>% avance</th></tr></thead><tbody>' +
      filas.map(([v, x]) => '<tr><td><a href="#checklist" data-f="' + campo + '" data-v="' + esc(v) + '" data-e=""><b>' + esc(v || 'Sin definir') + '</b></a></td>' + td(x, 'total', { v, e: '' }) +
        td(x, 'com', { v, e: 'Completado' }) + td(x, 'cur', { v, e: 'En curso' }) + td(x, 'pen', { v, e: 'Pendiente' }) + td(x, 'na', { v, e: 'No aplica' }) +
        '<td class="chk-pct">' + barra(x.pct) + '<small>' + x.pct + ' %</small></td></tr>').join('') +
      '<tr class="tot"><td><b>TOTAL</b></td><td class="num">' + tot.total + '</td><td class="num">' + tot.com + '</td><td class="num">' + tot.cur + '</td><td class="num">' + tot.pen + '</td><td class="num">' + tot.na + '</td><td class="chk-pct">' + barra(tot.pct) + '<small>' + tot.pct + ' %</small></td></tr>' +
      '</tbody></table></div></section>';
  }
  function vistaResumen(c) {
    const t = conteo(App.items);
    const kpi = (v, e, cls, est) => '<a class="ic-kpi chk-kpi ' + (cls || '') + '" href="#checklist" data-f="estado" data-v="' + (est || '') + '"><div class="valor">' + v + '</div><div class="etiqueta">' + e + '</div></a>';
    const altas = App.items.filter((i) => !cerrado(i) && i.prioridad === 'Alta');
    const venc = App.items.filter(vencido).sort((a, b) => a.fecha_objetivo.localeCompare(b.fecha_objetivo));
    const lista = (L, vacio) => L.length ? L.slice(0, 14).map((i) => '<div class="chk-urg" data-id="' + esc(i.Title) + '">' + chipEstado(i.estado) + '<div><b>' + esc(resumir(i.elemento, 100)) + '</b><span class="sec">' + esc(i.categoria || '') + (i.fecha_objetivo ? ' · ' + esc(textoFecha(i.fecha_objetivo)) : '') + (i.responsable ? ' · ' + esc(i.responsable) : '') + '</span></div></div>').join('') + (L.length > 14 ? '<p class="ic-conteo">y ' + (L.length - 14) + ' más…</p>' : '') : '<p class="ic-conteo">' + vacio + '</p>';
    c.innerHTML = '<div class="ic-barra"><div><h1 class="ic-titulo">Resumen</h1><p class="ic-subtitulo" style="margin:0">Avance del área de Operaciones al ' + esc(textoFecha(hoy())) + '. % avance = Completado / (Total − No aplica).</p></div><span class="espacio"></span><button class="ic-btn" id="bNuevo">+ Nuevo elemento</button></div>' +
      (App.items.length ? '' : '<div class="ic-alerta chica">El checklist está vacío. Vaya a <a href="#excel">Excel</a> e importe <b>Checklist_Operaciones_IC.xlsx</b>, o cree los elementos con «+ Nuevo elemento».</div>') +
      '<div class="ic-kpis chk-kpis">' + kpi(t.total, 'Elementos', '', '') + kpi(t.com, 'Completados', 'verde', 'Completado') + kpi(t.cur, 'En curso', 'azul', 'En curso') + kpi(t.pen, 'Pendientes', 'amarillo', 'Pendiente') +
        kpi(t.na, 'No aplica', 'gris', 'No aplica') + '<div class="ic-kpi chk-kpi"><div class="valor">' + t.pct + ' %</div><div class="etiqueta">Avance</div>' + barra(t.pct) + '</div></div>' +
      tablaAvance('Avance por categoría', 'categoria', valores('CATEGORIA')) +
      '<div class="chk-dos">' + tablaAvance('Avance por tipo', 'tipo', valores('TIPO')) +
      '<div class="chk-col"><section class="ic-bloque"><div class="cab"><h2>Prioridad alta sin terminar (' + altas.length + ')</h2></div><div class="cuerpo">' + lista(altas, '✔ Nada de prioridad alta pendiente.') + '</div></section>' +
      '<section class="ic-bloque"><div class="cab"><h2>Con fecha objetivo vencida (' + venc.length + ')</h2></div><div class="cuerpo">' + lista(venc, '✔ Nada vencido.') + '</div></section></div></div>';
    c.querySelector('#bNuevo').onclick = () => formItem(null, () => vistaResumen(c));
    c.querySelectorAll('a[data-f]').forEach((a) => { a.onclick = () => { limpiarFiltro(); App.filtro[a.dataset.f] = a.dataset.v; if (a.dataset.e) App.filtro.estado = a.dataset.e; }; });
    c.querySelectorAll('.chk-urg').forEach((d) => { d.onclick = () => formItem(App.items.find((i) => i.Title === d.dataset.id), () => vistaResumen(c)); });
  }
  function limpiarFiltro() { Object.keys(App.filtro).forEach((k) => { App.filtro[k] = ''; }); }

  // =====================================================================
  // CHECKLIST (hoja «Checklist»): filtros, edición rápida y reclasificación en bloque
  // =====================================================================
  function filtrados() {
    const f = App.filtro, q = U.norm(f.q);
    return App.items.filter((i) => (!f.categoria || (i.categoria || '') === f.categoria) && (!f.tipo || (i.tipo || '') === f.tipo) &&
      (!f.estado || (f.estado === 'ABIERTOS' ? !cerrado(i) : f.estado === 'VENCIDOS' ? vencido(i) : i.estado === f.estado)) &&
      (!f.prioridad || i.prioridad === f.prioridad) && (!f.responsable || (f.responsable === '-' ? !i.responsable : i.responsable === f.responsable)) &&
      (!f.doc || (f.doc === 'CON' ? docsDe(i).length : f.doc === 'SIN' ? !docsDe(i).length : docsDe(i).some((x) => App.docs[x]))) &&
      (!q || U.norm([i.elemento, i.observaciones, i.codigo_doc, i.responsable, i.tipo, i.categoria].join(' ')).indexOf(q) >= 0));
  }
  const sel = (id, op, v) => '<select id="' + id + '">' + op.map((o) => '<option value="' + esc(o[0]) + '"' + (o[0] === v ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
  function vistaChecklist(c) {
    const f = App.filtro;
    c.innerHTML = '<div class="ic-barra"><div><h1 class="ic-titulo">Checklist</h1><p class="ic-subtitulo" style="margin:0">Cambie el estado directo en la lista o haga clic en un elemento para editarlo. Marque varios para reclasificarlos juntos. Los códigos en azul abren el documento para leerlo.</p></div><span class="espacio"></span>' +
      '<button class="ic-btn sec" id="bExcel">⬇ Excel</button><button class="ic-btn" id="bNuevo">+ Nuevo elemento</button></div>' +
      '<div class="ic-filtros">' + sel('fCat', [['', 'Todas las categorías']].concat(valores('CATEGORIA').map((x) => [x, x])), f.categoria) +
        sel('fTip', [['', 'Todo tipo']].concat(valores('TIPO').map((x) => [x, x])), f.tipo) +
        sel('fEst', [['', 'Todo estado'], ['ABIERTOS', 'Sin terminar'], ['VENCIDOS', 'Fecha vencida']].concat(CFG.estados.map((x) => [x, x])), f.estado) +
        sel('fPri', [['', 'Toda prioridad']].concat(CFG.prioridades.map((x) => [x, x])), f.prioridad) +
        sel('fRes', [['', 'Todo responsable'], ['-', 'Sin responsable']].concat(responsables().map((x) => [x, x])), f.responsable) +
        sel('fDoc', [['', 'Con o sin documento'], ['CON', 'Con código de documento'], ['PUB', 'Con documento publicado'], ['SIN', 'Sin código']], f.doc) +
        '<input type="search" id="fQ" placeholder="Buscar…" value="' + esc(f.q) + '" style="flex:1;min-width:160px"><button class="ic-btn sec chico" id="bLimpiar">Limpiar</button></div>' +
      '<div id="masivo"></div><div id="lista"></div>';
    const pintar = () => {
      const L = filtrados(), ids = new Set(L.map((i) => i.Title));
      Array.from(App.sel).forEach((id) => { if (!ids.has(id)) App.sel.delete(id); });
      let html = '<p class="ic-conteo">' + L.length + ' elemento' + (L.length === 1 ? '' : 's') + (L.length !== App.items.length ? ' de ' + App.items.length : '') + '</p>';
      if (!L.length) html += '<div class="ic-vacio">' + (App.items.length ? 'No hay elementos con estos filtros.' : 'El checklist está vacío. Importe el Excel en la pestaña <a href="#excel">Excel</a>.') + '</div>';
      else {
        html += '<div class="ic-tabla-caja chk-scroll"><table class="ic-tabla chk-tabla"><thead><tr><th class="chk-c"><input type="checkbox" id="selTodo" title="Marcar todos los visibles"' + (L.every((i) => App.sel.has(i.Title)) ? ' checked' : '') + '></th><th>#</th><th>Elemento</th><th>Tipo</th><th>Prioridad</th><th>Estado</th><th>Responsable</th><th>Fecha objetivo</th><th>Documento</th></tr></thead><tbody>';
        let grupo = null;
        L.forEach((i) => {
          if (i.categoria !== grupo) {
            grupo = i.categoria; const g = conteo(L.filter((x) => x.categoria === grupo));
            html += '<tr class="chk-grupo"><td colspan="9"><b>' + esc(grupo || 'Sin categoría') + '</b><span>' + g.total + ' · ' + g.com + ' completado' + (g.com === 1 ? '' : 's') + ' · ' + g.pct + ' %</span></td></tr>';
          }
          const d = docsDe(i);
          html += '<tr data-id="' + esc(i.Title) + '"' + (cerrado(i) ? ' class="cerrado"' : '') + '><td class="chk-c"><input type="checkbox" class="selF"' + (App.sel.has(i.Title) ? ' checked' : '') + '></td><td class="nw sec2">' + (i.orden || '') + '</td>' +
            '<td><b>' + esc(i.elemento) + '</b>' + (i.observaciones ? '<span class="sec">' + esc(resumir(i.observaciones, 140)) + '</span>' : '') + '</td><td class="nw">' + esc(i.tipo || '') + '</td>' +
            '<td>' + (i.prioridad ? '<span class="chk-pri p-' + U.norm(i.prioridad) + '">' + esc(i.prioridad) + '</span>' : '') + '</td>' +
            '<td><select class="chk-rapido e-' + U.norm(i.estado || '').replace(/[^a-z]/g, '') + '" title="Cambiar el estado">' + CFG.estados.concat(i.estado && CFG.estados.indexOf(i.estado) < 0 ? [i.estado] : []).map((e) => '<option' + (e === i.estado ? ' selected' : '') + '>' + esc(e) + '</option>').join('') + '</select></td>' +
            '<td>' + esc(i.responsable || '') + '</td><td class="nw' + (vencido(i) ? ' venc' : '') + '">' + esc(textoFecha(i.fecha_objetivo)) + '</td><td><div class="chk-docs">' + d.map(chipDoc).join('') + '</div></td></tr>';
        });
        html += '</tbody></table></div>';
      }
      c.querySelector('#lista').innerHTML = html;
      pintarMasivo();
      c.querySelectorAll('tr[data-id]').forEach((tr) => {
        const it = App.items.find((i) => i.Title === tr.dataset.id);
        tr.onclick = (e) => { if (e.target.closest('input,select,a')) return; formItem(it, pintar); };
        tr.querySelector('.selF').onchange = (e) => { if (e.target.checked) App.sel.add(it.Title); else App.sel.delete(it.Title); pintarMasivo(); };
        tr.querySelector('.chk-rapido').onchange = async (e) => {
          const est = e.target.value; e.target.disabled = true;
          try { await G.actualizar('CHK_Items', it._id, camposEstado(it, est)); Object.assign(it, camposEstado(it, est)); U.aviso('«' + resumir(it.elemento, 40) + '» → ' + est, 'ok', 2500); }
          catch (er) { U.aviso(U.mensajeError(er), 'err', 8000); }
          pintar();
        };
      });
      const st = c.querySelector('#selTodo');
      if (st) st.onchange = () => { L.forEach((i) => { if (st.checked) App.sel.add(i.Title); else App.sel.delete(i.Title); }); pintar(); };
    };
    const pintarMasivo = () => {
      const m = c.querySelector('#masivo'), n = App.sel.size;
      if (!n) { m.innerHTML = ''; return; }
      m.innerHTML = '<div class="chk-masivo"><b>' + n + ' marcado' + (n === 1 ? '' : 's') + '</b>' +
        sel('mCat', [['', 'Categoría…']].concat(valores('CATEGORIA').map((x) => [x, x])), '') + sel('mTip', [['', 'Tipo…']].concat(valores('TIPO').map((x) => [x, x])), '') +
        sel('mEst', [['', 'Estado…']].concat(CFG.estados.map((x) => [x, x])), '') + sel('mPri', [['', 'Prioridad…']].concat(CFG.prioridades.map((x) => [x, x])), '') +
        '<input id="mRes" list="dlResM" placeholder="Responsable…" style="width:160px"><datalist id="dlResM">' + responsables().map((r) => '<option value="' + esc(r) + '">').join('') + '</datalist>' +
        '<button class="ic-btn chico" id="mOk">Reclasificar</button><button class="ic-btn peligro chico" id="mDel">Eliminar</button><button class="ic-btn sec chico" id="mNo">Quitar marcas</button></div>';
      m.querySelector('#mNo').onclick = () => { App.sel.clear(); pintar(); };
      m.querySelector('#mOk').onclick = async () => {
        const cambio = {}; [['mCat', 'categoria'], ['mTip', 'tipo'], ['mPri', 'prioridad'], ['mRes', 'responsable']].forEach(([id, k]) => { const v = m.querySelector('#' + id).value.trim(); if (v) cambio[k] = v; });
        const est = m.querySelector('#mEst').value;
        if (!Object.keys(cambio).length && !est) { U.aviso('Elija qué cambiar: categoría, tipo, estado, prioridad o responsable', 'warn'); return; }
        const L = App.items.filter((i) => App.sel.has(i.Title)), b = m.querySelector('#mOk');
        try {
          await U.conCarga(b, async () => {
            let k = 0;
            for (const it of L) { const cc = Object.assign({}, cambio, est ? camposEstado(it, est) : {}); await G.actualizar('CHK_Items', it._id, cc); Object.assign(it, cc); b.textContent = (++k) + ' de ' + L.length + '…'; }
          });
          U.aviso(L.length + ' elementos reclasificados', 'ok'); App.sel.clear(); await cargar(); pintar();
        } catch (er) { U.aviso(U.mensajeError(er), 'err', 8000); await cargar(); pintar(); }
      };
      m.querySelector('#mDel').onclick = async () => {
        const L = App.items.filter((i) => App.sel.has(i.Title));
        if (!(await U.confirmar('Eliminar ' + L.length + ' elemento' + (L.length === 1 ? '' : 's'), 'Se eliminarán definitivamente del checklist. No se puede deshacer.', 'Eliminar', true))) return;
        try { for (const it of L) await G.eliminar('CHK_Items', it._id); U.aviso(L.length + ' eliminados', 'ok'); } catch (er) { U.aviso(U.mensajeError(er), 'err', 8000); }
        App.sel.clear(); await cargar(); pintar();
      };
    };
    [['fCat', 'categoria'], ['fTip', 'tipo'], ['fEst', 'estado'], ['fPri', 'prioridad'], ['fRes', 'responsable'], ['fDoc', 'doc']].forEach(([id, k]) => { c.querySelector('#' + id).onchange = (e) => { f[k] = e.target.value; pintar(); }; });
    c.querySelector('#fQ').oninput = (e) => { f.q = e.target.value; pintar(); };
    c.querySelector('#bLimpiar').onclick = () => { limpiarFiltro(); vistaChecklist(c); };
    c.querySelector('#bNuevo').onclick = () => formItem(null, pintar);
    c.querySelector('#bExcel').onclick = () => exportar().catch((e) => U.aviso(e.message, 'err'));
    pintar();
  }
  // Al completar se guarda la fecha; si vuelve a abrirse, se borra
  function camposEstado(it, est) {
    const c = { estado: est };
    if (est === 'Completado' && !it.fecha_completado) c.fecha_completado = hoy();
    if (est !== 'Completado' && it.fecha_completado) c.fecha_completado = '';
    return c;
  }

  // =====================================================================
  // FORMULARIO DE ELEMENTO
  // =====================================================================
  function formItem(it, alGuardar) {
    const nuevo = !it, v0 = it || { categoria: App.filtro.categoria || '', tipo: App.filtro.tipo || '', estado: 'Pendiente', prioridad: 'Media', orden: siguienteOrden() };
    const opc = (vals, v) => vals.concat(v && vals.indexOf(v) < 0 ? [v] : []).map((x) => [x, x]);
    const pub = Object.keys(App.docs).sort();
    U.modal(nuevo ? 'Nuevo elemento' : 'Elemento #' + (v0.orden || '') + ' · ' + v0.Title, '<form class="ic-form" id="fIt" autocomplete="off"><div class="ic-campos">' +
      U.campo({ name: 'elemento', label: 'Elemento', t: 'textarea', valor: v0.elemento, req: true, filas: 2, c: 'c12' }) +
      U.campo({ name: 'categoria', label: 'Categoría', t: 'select', op: opc(valores('CATEGORIA'), v0.categoria), valor: v0.categoria, req: true, c: 'c6' }) +
      U.campo({ name: 'tipo', label: 'Tipo', t: 'select', op: opc(valores('TIPO'), v0.tipo), valor: v0.tipo, c: 'c4' }) +
      U.campo({ name: 'orden', label: '#', t: 'number', valor: v0.orden, c: 'c2' }) +
      U.campo({ name: 'prioridad', label: 'Prioridad', t: 'select', op: CFG.prioridades.map((p) => [p, p]), valor: v0.prioridad, c: 'c3' }) +
      U.campo({ name: 'estado', label: 'Estado', t: 'select', op: opc(CFG.estados, v0.estado), valor: v0.estado, vacio: false, c: 'c3' }) +
      '<div class="ic-campo c3"><label for="f_responsable">Responsable</label><input id="f_responsable" name="responsable" list="dlRes" value="' + esc(v0.responsable || '') + '"><datalist id="dlRes">' + responsables().map((r) => '<option value="' + esc(r) + '">').join('') + '</datalist></div>' +
      U.campo({ name: 'fecha_objetivo', label: 'Fecha objetivo', t: 'date', valor: v0.fecha_objetivo, c: 'c3' }) +
      '<div class="ic-campo c12"><label for="f_codigo_doc">Código documento</label><input id="f_codigo_doc" name="codigo_doc" list="dlDoc" value="' + esc(v0.codigo_doc || '') + '" placeholder="Ej.: 2506-MAN-OPE (varios separados por coma)"><datalist id="dlDoc">' +
        pub.map((k) => '<option value="' + esc(k) + '">' + esc(App.docs[k].titulo) + '</option>').join('') + '</datalist><span class="ayuda" id="ayDoc"></span></div>' +
      U.campo({ name: 'observaciones', label: 'Observaciones', t: 'textarea', valor: v0.observaciones, filas: 3, c: 'c12' }) +
      '</div>' + (nuevo ? '' : '<p class="chk-meta">' + (v0.fecha_completado ? 'Completado el ' + esc(textoFecha(v0.fecha_completado)) + ' · ' : '') + 'Modificado ' + esc(U.fmt.fechaHora(v0._modificado)) + (v0._editor ? ' por ' + esc(v0._editor) : '') + '</p>') +
      '<div class="ic-acciones">' + (nuevo ? '' : '<button type="button" class="ic-btn peligro" id="iDel" style="margin-right:auto">Eliminar</button>') +
      '<button type="button" class="ic-btn sec" id="iNo">Cancelar</button><button class="ic-btn" id="iOk">Guardar</button></div></form>', (cu) => {
      const f = cu.querySelector('#fIt');
      const verDoc = () => {
        const cs = docsDe({ codigo_doc: f.codigo_doc.value, observaciones: f.observaciones.value });
        cu.querySelector('#ayDoc').innerHTML = cs.length ? cs.map((x) => chipDoc(x) + (App.docs[x] ? ' <small>' + esc(App.docs[x].titulo) + '</small>' : '')).join(' &nbsp; ') : 'Escriba el código para poder abrir el manual desde el checklist.';
      };
      f.codigo_doc.addEventListener('input', verDoc); f.observaciones.addEventListener('input', verDoc); verDoc();
      cu.querySelector('#iNo').onclick = U.cerrarModal;
      const bDel = cu.querySelector('#iDel');
      if (bDel) bDel.onclick = async () => {
        U.cerrarModal();
        if (!(await U.confirmar('Eliminar elemento', '«' + resumir(it.elemento, 90) + '» se eliminará definitivamente. No se puede deshacer.', 'Eliminar', true))) { formItem(it, alGuardar); return; }
        try { await G.eliminar('CHK_Items', it._id); U.aviso('Elemento eliminado', 'ok'); } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); }
        await cargar(); alGuardar();
      };
      f.onsubmit = async (e) => {
        e.preventDefault();
        const v = U.leerForm(f), err = {};
        if (!v.elemento) err.elemento = 'Escriba el elemento'; if (!v.categoria) err.categoria = 'Elija la categoría';
        if (Object.keys(err).length) { U.marcarErrores(f, err); return; }
        const campos = Object.assign({ elemento: v.elemento, categoria: v.categoria, tipo: v.tipo, orden: Number(v.orden) || siguienteOrden(), prioridad: v.prioridad, responsable: v.responsable,
          fecha_objetivo: v.fecha_objetivo, codigo_doc: codigos(v.codigo_doc).join(', ') || v.codigo_doc.toUpperCase(), observaciones: v.observaciones }, camposEstado(v0, v.estado));
        try {
          await U.conCarga(cu.querySelector('#iOk'), async () => {
            if (nuevo) {
              campos.Title = 'CHK-' + pad(await G.siguiente('CHK'));
              Object.keys(campos).forEach((k) => { if (campos[k] === '' || campos[k] === null) delete campos[k]; });
              await G.crear('CHK_Items', campos);
            } else await G.actualizar('CHK_Items', it._id, campos, it._etag);
          });
          U.cerrarModal(); U.aviso(nuevo ? 'Elemento agregado' : 'Elemento actualizado', 'ok');
          await cargar(); alGuardar();
        } catch (er) { U.aviso(U.mensajeError(er), 'err', 8000); }
      };
    });
  }
  const siguienteOrden = () => App.items.reduce((m, i) => Math.max(m, i.orden || 0), 0) + 1;

  // =====================================================================
  // TIPOS Y ÁREAS (hoja «Tipos y Areas»): catálogos editables + calculadora
  // =====================================================================
  function vistaCatalogos(c) {
    const bloque = (g) => {
      const G0 = CFG.grupos[g], L = delGrupo(g), campo = G0.campo;
      const uso = (n) => campo ? App.items.filter((i) => i[campo] === n).length : todosLosCodigos().filter((x) => x.split('-')[g === 'TIPODOC' ? 1 : g === 'AREA' ? 2 : 9] === n).length;
      return '<section class="ic-bloque chk-catb"><div class="cab"><h2>' + esc(G0.nombre) + ' <small>' + L.length + '</small></h2><button class="ic-btn sec chico" data-nuevo="' + g + '">+ Agregar</button></div><div class="cuerpo">' +
        '<p class="ic-conteo">' + esc(G0.ayuda) + '</p><table class="ic-tabla chk-cat"><thead><tr>' + (G0.conCodigo ? '<th>Código</th>' : '') + '<th>Nombre</th>' + (g === 'TIPODOC' ? '<th>Uso</th>' : '') + '<th class="num">' + (campo ? 'Elementos' : g === 'SERIE' ? '' : 'Docs') + '</th></tr></thead><tbody>' +
        L.map((x) => '<tr data-cat="' + esc(x.Title) + '">' + (G0.conCodigo ? '<td class="nw"><b>' + esc(x.codigo) + '</b></td>' : '') + '<td>' + (G0.conCodigo ? esc(x.nombre) : '<b>' + esc(x.nombre) + '</b>') + '</td>' +
          (g === 'TIPODOC' ? '<td class="sec2">' + esc(x.descripcion || '') + '</td>' : '') + '<td class="num">' + (g === 'SERIE' ? '' : uso(G0.conCodigo ? x.codigo : x.nombre)) + '</td></tr>').join('') +
        '</tbody></table></div></section>';
    };
    c.innerHTML = '<h1 class="ic-titulo">Tipos y áreas</h1><p class="ic-subtitulo">Catálogos del checklist y del sistema de codificación documental. Haga clic en una fila para editarla. Si renombra o elimina una categoría o un tipo, los elementos que la usan se reclasifican.</p>' +
      '<section class="ic-bloque chk-calc"><div class="cab"><h2>Calculadora de siguiente consecutivo</h2></div><div class="cuerpo"><div class="chk-calc-f">' +
        '<label>Serie' + sel('cSer', delGrupo('SERIE').map((x) => [x.codigo, x.codigo + ' ' + x.nombre]), '2100') + '</label>' +
        '<label>Tipo' + sel('cTip', delGrupo('TIPODOC').map((x) => [x.codigo, x.codigo + ' · ' + x.nombre]), 'FOR') + '</label>' +
        '<label>Área' + sel('cAre', delGrupo('AREA').map((x) => [x.codigo, x.codigo + ' · ' + x.nombre]), 'OPE') + '</label></div><div id="cRes"></div></div></section>' +
      '<div class="chk-cats">' + ['CATEGORIA', 'TIPO'].map(bloque).join('') + '</div><div class="chk-cats tres">' + ['TIPODOC', 'AREA', 'SERIE'].map(bloque).join('') + '</div>';
    const calc = () => calcular(c.querySelector('#cSer').value, c.querySelector('#cTip').value, c.querySelector('#cAre').value, c.querySelector('#cRes'));
    ['cSer', 'cTip', 'cAre'].forEach((id) => { c.querySelector('#' + id).onchange = calc; }); calc();
    c.querySelectorAll('[data-nuevo]').forEach((b) => { b.onclick = () => formCat(b.dataset.nuevo, null, () => vistaCatalogos(c)); });
    c.querySelectorAll('tr[data-cat]').forEach((tr) => { tr.onclick = () => { const x = App.cat.find((k) => k.Title === tr.dataset.cat); formCat(x.grupo, x, () => vistaCatalogos(c)); }; });
  }
  // Todos los códigos conocidos: publicados en Gestión documental + escritos en el checklist
  function todosLosCodigos() { const s = new Set(Object.keys(App.docs)); App.items.forEach((i) => docsDe(i).forEach((x) => s.add(x))); return Array.from(s).sort(); }
  function calcular(serie, tipo, area, caja) {
    const base = Number(serie) || 0, todos = todosLosCodigos();
    const enSerie = todos.filter((x) => { const n = Number(x.slice(0, 4)); return n >= base && n < base + 100; });
    const mismaArea = enSerie.filter((x) => x.split('-')[2] === area), mismo = todos.filter((x) => x.split('-')[1] === tipo && x.split('-')[2] === area);
    const max = mismaArea.reduce((m, x) => Math.max(m, Number(x.slice(0, 4))), base);
    const sug = pad(Math.min(max + 1, base + 99)) + '-' + tipo + '-' + area;
    caja.innerHTML = '<div class="chk-sug"><div><small>Código sugerido</small><b id="cSug">' + esc(sug) + '</b></div><button class="ic-btn sec chico" id="cCopiar">Copiar</button></div>' +
      '<p class="ic-conteo">Siguiente número libre de la serie ' + esc(serie) + ' para el área ' + esc(area) + ' (' + mismaArea.length + ' código' + (mismaArea.length === 1 ? '' : 's') + ' ya usados en la serie). Documentos existentes ' + esc(tipo) + '-' + esc(area) + ': <b>' + mismo.length + '</b>.' +
      (App.docsOk ? '' : ' <em>No se pudo leer Gestión documental: solo se cuentan los códigos del checklist.</em>') + '</p>' +
      (enSerie.length ? '<div class="chk-docs">' + enSerie.map(chipDoc).join('') + '</div>' : '<p class="ic-conteo">Aún no hay documentos en esta serie.</p>');
    caja.querySelector('#cCopiar').onclick = () => { try { navigator.clipboard.writeText(sug); U.aviso('Copiado: ' + sug, 'ok', 2000); } catch (e) { U.aviso(sug, 'info'); } };
  }
  function formCat(g, x, alGuardar) {
    const G0 = CFG.grupos[g], nuevo = !x, v0 = x || { orden: delGrupo(g).reduce((m, k) => Math.max(m, k.orden), 0) + 1 };
    const campo = G0.campo, usados = !nuevo && campo ? App.items.filter((i) => i[campo] === x.nombre) : [];
    U.modal((nuevo ? 'Agregar · ' : 'Editar · ') + G0.nombre, '<form class="ic-form" id="fCat" autocomplete="off"><div class="ic-campos">' +
      (G0.conCodigo ? U.campo({ name: 'codigo', label: 'Código', valor: v0.codigo, req: true, c: 'c4', max: g === 'SERIE' ? 4 : 3 }) : '') +
      U.campo({ name: 'nombre', label: 'Nombre', valor: v0.nombre, req: true, c: G0.conCodigo ? 'c6' : 'c10' }) + U.campo({ name: 'orden', label: 'Orden', t: 'number', valor: v0.orden, c: 'c2' }) +
      (G0.conCodigo && g !== 'SERIE' ? U.campo({ name: 'descripcion', label: 'Uso / descripción', valor: v0.descripcion, c: 'c12' }) : '') +
      '</div>' + (usados.length ? '<p class="chk-meta">Lo usan ' + usados.length + ' elemento' + (usados.length === 1 ? '' : 's') + ': si cambia el nombre, se actualizan.</p>' : '') +
      '<div class="ic-acciones">' + (nuevo ? '' : '<button type="button" class="ic-btn peligro" id="kDel" style="margin-right:auto">Eliminar</button>') +
      '<button type="button" class="ic-btn sec" id="kNo">Cancelar</button><button class="ic-btn" id="kOk">Guardar</button></div></form>', (cu) => {
      const f = cu.querySelector('#fCat');
      cu.querySelector('#kNo').onclick = U.cerrarModal;
      if (f.codigo) f.codigo.addEventListener('input', () => { f.codigo.value = f.codigo.value.toUpperCase().replace(g === 'SERIE' ? /\D/g : /[^A-Z]/g, ''); });
      const bDel = cu.querySelector('#kDel');
      if (bDel) bDel.onclick = () => borrarCat(g, x, usados, alGuardar);
      f.onsubmit = async (e) => {
        e.preventDefault();
        const v = U.leerForm(f), err = {};
        if (!v.nombre) err.nombre = 'Escriba el nombre';
        if (G0.conCodigo && !v.codigo) err.codigo = 'Escriba el código';
        const rep = delGrupo(g).find((k) => k !== x && (G0.conCodigo ? k.codigo === v.codigo : U.norm(k.nombre) === U.norm(v.nombre)));
        if (rep) err[G0.conCodigo ? 'codigo' : 'nombre'] = 'Ya existe';
        if (Object.keys(err).length) { U.marcarErrores(f, err); return; }
        const campos = { grupo: g, nombre: v.nombre, orden: Number(v.orden) || 0 };
        if (G0.conCodigo) campos.codigo = v.codigo; if (f.descripcion) campos.descripcion = v.descripcion;
        const b = cu.querySelector('#kOk');
        try {
          await U.conCarga(b, async () => {
            if (nuevo) { campos.Title = 'CAT-' + pad(await G.siguiente('CHKC')); Object.keys(campos).forEach((k) => { if (campos[k] === '') delete campos[k]; }); await G.crear('CHK_Catalogo', campos); }
            else {
              await G.actualizar('CHK_Catalogo', x._id, campos, x._etag);
              if (campo && x.nombre !== v.nombre) { let k = 0; for (const it of usados) { await G.actualizar('CHK_Items', it._id, { [campo]: v.nombre }); b.textContent = 'Elementos ' + (++k) + ' de ' + usados.length + '…'; } }
            }
          });
          U.cerrarModal(); U.aviso('Guardado' + (usados.length && x.nombre !== v.nombre ? ' · ' + usados.length + ' elementos reclasificados' : ''), 'ok');
          await Promise.all([cargarCatalogo(), cargar()]); alGuardar();
        } catch (er) { U.aviso(U.mensajeError(er), 'err', 8000); }
      };
    });
  }
  function borrarCat(g, x, usados, alGuardar) {
    const campo = CFG.grupos[g].campo, otros = delGrupo(g).filter((k) => k !== x).map((k) => [k.nombre, k.nombre]);
    U.modal('Eliminar «' + (x.codigo ? x.codigo + ' · ' : '') + x.nombre + '»', '<form class="ic-form" id="fDel">' +
      (usados.length ? '<p>Lo usan <b>' + usados.length + '</b> elemento' + (usados.length === 1 ? '' : 's') + '. Elija a dónde pasan:</p><div class="ic-campos">' + U.campo({ name: 'destino', label: 'Reclasificar en', t: 'select', op: otros, req: true, c: 'c12', vacio: campo === 'tipo' ? 'Dejar sin tipo' : 'Seleccione…' }) + '</div>' : '<p>Se elimina del catálogo. No se puede deshacer.</p>') +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="dNo">Cancelar</button><button class="ic-btn peligro" id="dOk">Eliminar</button></div></form>', (cu) => {
      const f = cu.querySelector('#fDel');
      cu.querySelector('#dNo').onclick = U.cerrarModal;
      f.onsubmit = async (e) => {
        e.preventDefault();
        const dest = f.destino ? f.destino.value : '';
        if (usados.length && !dest && campo === 'categoria') { U.marcarErrores(f, { destino: 'Elija la categoría destino' }); return; }
        const b = cu.querySelector('#dOk');
        try {
          await U.conCarga(b, async () => {
            let k = 0; for (const it of usados) { await G.actualizar('CHK_Items', it._id, { [campo]: dest }); b.textContent = (++k) + ' de ' + usados.length + '…'; }
            await G.eliminar('CHK_Catalogo', x._id);
          });
          U.cerrarModal(); U.aviso('Eliminado' + (usados.length ? ' · ' + usados.length + ' elementos reclasificados' : ''), 'ok');
          await Promise.all([cargarCatalogo(), cargar()]); alGuardar();
        } catch (er) { U.aviso(U.mensajeError(er), 'err', 8000); }
      };
    });
  }

  // =====================================================================
  // EXCEL: importar (las tres hojas) y exportar con el mismo formato
  // =====================================================================
  function cargarXLSX() {
    if (window.XLSX) return Promise.resolve();
    return new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar la librería de Excel.')); document.head.appendChild(s); });
  }
  function fechaExcel(v) {
    if (v === '' || v === null || v === undefined) return '';
    if (typeof v === 'number') { const d = new Date(Math.round((v - 25569) * 864e5)); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1, 2) + '-' + pad(d.getUTCDate(), 2); }
    const s = String(v).trim(), m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/), m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m2) return m2[0]; if (m) return (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + pad(m[2], 2) + '-' + pad(m[1], 2);
    return '';
  }
  const serial = (d) => d ? Math.round((new Date(d + 'T00:00:00Z') - Date.UTC(1899, 11, 30)) / 864e5) : '';
  const claveItem = (cat, el) => U.norm(cat) + '|' + U.norm(el).replace(/\s+/g, ' ').trim();

  function leerLibro(wb) {
    const hoja = (re) => wb.Sheets[wb.SheetNames.find((n) => re.test(U.norm(n)))];
    const filas = (ws) => ws ? XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true }) : [];
    // Hoja Checklist
    const m = filas(hoja(/checklist/) || wb.Sheets[wb.SheetNames[0]]);
    const iCab = m.findIndex((r) => r.some((x) => U.norm(x) === 'elemento'));
    if (iCab < 0) throw new Error('No se encontró la fila de encabezados de la hoja Checklist (con la columna «Elemento»).');
    const cab = m[iCab].map((x) => U.norm(String(x)).replace(/[^a-z#]/g, ''));
    const col = (...n) => { for (const k of n) { const i = cab.indexOf(k); if (i >= 0) return i; } return -1; };
    const C = { n: col('#'), cat: col('categoria'), tip: col('tipo'), el: col('elemento'), pri: col('prioridad'), est: col('estado', 'completado'), res: col('responsable'), fo: col('fechaobjetivo'), cod: col('codigodocumento', 'codigo'), obs: col('observaciones') };
    const val = (r, i) => (i >= 0 && r[i] !== undefined ? r[i] : '');
    const items = []; let k = 0;
    m.slice(iCab + 1).forEach((r) => {
      const el = String(val(r, C.el)).trim(); if (!el || U.norm(el) === 'elemento') return;
      k++;
      const obs = String(val(r, C.obs)).trim(), cod = String(val(r, C.cod)).trim();
      const est = CFG.estados.find((e) => U.norm(e) === U.norm(val(r, C.est))) || 'Pendiente';
      items.push({ orden: Number(val(r, C.n)) || k, categoria: String(val(r, C.cat)).trim(), tipo: String(val(r, C.tip)).trim(), elemento: el,
        prioridad: CFG.prioridades.find((p) => U.norm(p) === U.norm(val(r, C.pri))) || '', estado: est, responsable: String(val(r, C.res)).trim(),
        fecha_objetivo: fechaExcel(val(r, C.fo)), codigo_doc: codigos(cod).concat(codigos(obs)).filter((x, i, a) => a.indexOf(x) === i).join(', ') || cod, observaciones: obs });
    });
    // Hoja Resumen: orden de categorías y tipos
    const cats = [], tipos = [];
    let modo = '';
    filas(hoja(/resumen/)).forEach((r) => {
      const a = String(r[0] || '').trim(), na = U.norm(a);
      if (na === 'categoria') { modo = 'C'; return; } if (na === 'tipo') { modo = 'T'; return; } if (na === 'total' || !a) { modo = na === 'total' ? '' : modo; return; }
      if (modo === 'C') cats.push(a); else if (modo === 'T') tipos.push(a);
    });
    // Hoja Tipos y Areas: tipos de documento (A:C) y áreas (E:F)
    const tdoc = [], areas = [];
    let enT = false;
    filas(hoja(/tipos/)).forEach((r) => {
      if (U.norm(r[0]) === 'codigo') { enT = true; return; }
      if (!enT) return;
      if (/^[A-Z]{3}$/.test(String(r[0]).trim()) && r[1]) tdoc.push([String(r[0]).trim(), String(r[1]).trim(), String(r[2] || '').trim()]);
      if (/^[A-Z]{3}$/.test(String(r[4]).trim()) && r[5]) areas.push([String(r[4]).trim(), String(r[5]).trim()]);
      if (/calculadora/i.test(String(r[0]))) enT = false;
    });
    items.forEach((i) => { if (i.categoria && cats.indexOf(i.categoria) < 0) cats.push(i.categoria); if (i.tipo && tipos.indexOf(i.tipo) < 0) tipos.push(i.tipo); });
    return { items, cat: { CATEGORIA: cats.map((x) => [x]), TIPO: tipos.map((x) => [x]), TIPODOC: tdoc, AREA: areas } };
  }

  function vistaExcel(c) {
    c.innerHTML = '<h1 class="ic-titulo">Excel</h1><p class="ic-subtitulo">Importe <b>Checklist_Operaciones_IC.xlsx</b> con sus tres hojas o descargue el checklist actual en el mismo formato.</p>' +
      '<div class="chk-dos"><form class="ic-form" id="fImp"><h2 class="chk-h2">Importar</h2><p class="ic-conteo">Hoja <b>Checklist</b>: cada fila es un elemento (los códigos que aparezcan en Observaciones pasan también a Código documento). Hojas <b>Resumen</b> y <b>Tipos y Areas</b>: se agregan al catálogo las categorías, tipos, tipos de documento y áreas que falten. El Resumen se calcula solo en la app.</p>' +
        '<div class="ic-campos"><div class="ic-campo c12"><label for="fArch">Archivo de Excel</label><input type="file" id="fArch" accept=".xlsx,.xlsm,.xls"></div>' +
        U.campo({ name: 'actualizar', label: 'Actualizar los elementos que ya existen con los datos del Excel (estado, prioridad, responsable, fechas, código y observaciones)', t: 'checkbox', c: 'c12' }) + '</div>' +
        '<div id="prev"></div><div class="ic-acciones"><button type="button" class="ic-btn" id="bImp" disabled>Importar</button></div></form>' +
      '<section class="ic-form"><h2 class="chk-h2">Exportar</h2><p class="ic-conteo">Descarga un Excel con las hojas <b>Checklist</b>, <b>Resumen</b> (avance por categoría y por tipo) y <b>Tipos y Areas</b> con los datos de hoy.</p>' +
        '<div class="ic-acciones"><button class="ic-btn" id="bExp">⬇ Descargar Excel</button></div></section></div>';
    let datos = null;
    const f = c.querySelector('#fImp');
    const analizar = () => {
      if (!datos) return;
      const ya = {}; App.items.forEach((i) => { ya[claveItem(i.categoria, i.elemento)] = i; });
      const nuevos = datos.items.filter((x) => !ya[claveItem(x.categoria, x.elemento)]), exist = datos.items.length - nuevos.length;
      const faltan = Object.keys(datos.cat).reduce((s, g) => s + datos.cat[g].filter((x) => !catExiste(g, x)).length, 0);
      const t = conteo(datos.items);
      c.querySelector('#prev').innerHTML = '<div class="ic-alerta chica"><b>' + datos.items.length + '</b> elementos en el Excel (' + t.com + ' completados, ' + t.cur + ' en curso, ' + t.pen + ' pendientes) · <b>' + nuevos.length + '</b> nuevos' +
        (exist ? ' · ' + exist + ' ya existen' + (f.actualizar.checked ? ' y se actualizarán' : ' y se omiten') : '') + (faltan ? ' · ' + faltan + ' entradas nuevas de catálogo' : '') + '.</div>' +
        '<div class="ic-tabla-caja chk-scroll" style="max-height:300px;overflow:auto"><table class="ic-tabla"><thead><tr><th>#</th><th>Categoría</th><th>Elemento</th><th>Estado</th><th>Documento</th></tr></thead><tbody>' +
        datos.items.map((x) => { const e = ya[claveItem(x.categoria, x.elemento)]; return '<tr' + (e && !f.actualizar.checked ? ' style="opacity:.45"' : '') + '><td>' + x.orden + '</td><td class="nw">' + esc(resumir(x.categoria, 26)) + '</td><td>' + esc(resumir(x.elemento, 90)) + (e ? ' <small>(ya existe)</small>' : '') + '</td><td>' + esc(x.estado) + '</td><td>' + esc(x.codigo_doc) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      c.querySelector('#bImp').disabled = !(nuevos.length || faltan || (exist && f.actualizar.checked));
    };
    c.querySelector('#fArch').onchange = async () => {
      const file = c.querySelector('#fArch').files[0]; datos = null; c.querySelector('#bImp').disabled = true; c.querySelector('#prev').innerHTML = '';
      if (!file) return;
      try { await cargarXLSX(); datos = leerLibro(XLSX.read(await file.arrayBuffer(), { type: 'array' })); analizar(); }
      catch (e) { c.querySelector('#prev').innerHTML = '<p style="color:var(--ic-err)">No se pudo leer el archivo: ' + esc(e.message) + '</p>'; }
    };
    f.actualizar.onchange = analizar;
    c.querySelector('#bImp').onclick = async () => {
      const b = c.querySelector('#bImp');
      try {
        let res = { cat: 0, nuevos: 0, act: 0 };
        await U.conCarga(b, async () => { res = await importar(datos, f.actualizar.checked, (t) => { b.textContent = t; }); });
        U.aviso('Importado: ' + res.nuevos + ' nuevos' + (res.act ? ', ' + res.act + ' actualizados' : '') + (res.cat ? ', ' + res.cat + ' de catálogo' : ''), 'ok', 7000);
        await Promise.all([cargarCatalogo(), cargar()]); limpiarFiltro(); location.hash = '';
      } catch (e) { U.aviso(U.mensajeError(e), 'err', 9000); await Promise.all([cargarCatalogo(), cargar()]); analizar(); }
    };
    c.querySelector('#bExp').onclick = () => exportar().catch((e) => U.aviso(e.message, 'err'));
  }
  const catExiste = (g, x) => delGrupo(g).some((k) => CFG.grupos[g].conCodigo ? k.codigo === x[0] : U.norm(k.nombre) === U.norm(x[0]));
  async function importar(d, actualizar, avance) {
    const res = { cat: 0, nuevos: 0, act: 0 };
    // Catálogo primero
    for (const g of Object.keys(d.cat)) {
      const faltan = d.cat[g].filter((x) => !catExiste(g, x)); if (!faltan.length) continue;
      let ord = delGrupo(g).reduce((m, k) => Math.max(m, k.orden), 0), n = await G.reservar('CHKC', faltan.length);
      for (const x of faltan) {
        const con = CFG.grupos[g].conCodigo, campos = { Title: 'CAT-' + pad(n++), grupo: g, nombre: con ? x[1] : x[0], orden: ++ord };
        if (con) campos.codigo = x[0]; if (con && x[2]) campos.descripcion = x[2];
        await G.crear('CHK_Catalogo', campos); res.cat++;
      }
    }
    const ya = {}; App.items.forEach((i) => { ya[claveItem(i.categoria, i.elemento)] = i; });
    const nuevos = d.items.filter((x) => !ya[claveItem(x.categoria, x.elemento)]);
    let n = nuevos.length ? await G.reservar('CHK', nuevos.length) : 0;
    for (const x of nuevos) {
      const campos = Object.assign({ Title: 'CHK-' + pad(n++) }, x, x.estado === 'Completado' ? { fecha_completado: hoy() } : {});
      Object.keys(campos).forEach((k) => { if (campos[k] === '' || campos[k] === null) delete campos[k]; });
      await G.crear('CHK_Items', campos); res.nuevos++; avance('Elemento ' + res.nuevos + ' de ' + nuevos.length + '…');
    }
    if (actualizar) {
      const L = d.items.filter((x) => ya[claveItem(x.categoria, x.elemento)]);
      for (const x of L) {
        const it = ya[claveItem(x.categoria, x.elemento)];
        const cc = Object.assign({ orden: x.orden, tipo: x.tipo, prioridad: x.prioridad, responsable: x.responsable, fecha_objetivo: x.fecha_objetivo, codigo_doc: x.codigo_doc, observaciones: x.observaciones }, camposEstado(it, x.estado));
        await G.actualizar('CHK_Items', it._id, cc); res.act++; avance('Actualizando ' + res.act + ' de ' + L.length + '…');
      }
    }
    return res;
  }
  async function exportar() {
    await cargarXLSX();
    const filas = App.items.map((i) => ({ '#': i.orden, 'Categoría': i.categoria || '', Tipo: i.tipo || '', Elemento: i.elemento, Prioridad: i.prioridad || '', Estado: i.estado || '',
      Responsable: i.responsable || '', 'Fecha objetivo': serial(i.fecha_objetivo), 'Código documento': i.codigo_doc || '', Observaciones: i.observaciones || '', 'Fecha completado': serial(i.fecha_completado) }));
    const ws = XLSX.utils.json_to_sheet(filas);
    const r = XLSX.utils.decode_range(ws['!ref']);
    for (let k = 1; k <= r.e.r; k++) ['H', 'K'].forEach((cl) => { const cel = ws[cl + (k + 1)]; if (cel && cel.v !== '') { cel.t = 'n'; cel.z = 'dd/mm/yyyy'; } });
    ws['!cols'] = [5, 26, 14, 70, 9, 12, 18, 12, 22, 50, 12].map((w) => ({ wch: w }));
    ws['!autofilter'] = { ref: ws['!ref'] };
    const tabla = (campo, vals) => {
      const out = [[campo === 'categoria' ? 'Categoría' : 'Tipo', 'Total', 'Completado', 'En curso', 'Pendiente', 'No aplica', '% avance']];
      vals.forEach((v) => { const x = conteo(App.items.filter((i) => (i[campo] || '') === v)); if (x.total) out.push([v, x.total, x.com, x.cur, x.pen, x.na, x.pct / 100]); });
      const t = conteo(App.items); out.push(['TOTAL', t.total, t.com, t.cur, t.pen, t.na, t.pct / 100]); return out;
    };
    const t1 = tabla('categoria', valores('CATEGORIA')), t2 = tabla('tipo', valores('TIPO'));
    const ws2 = XLSX.utils.aoa_to_sheet([['Avance por categoría']].concat(t1, [['% avance = Completado / (Total − No aplica). Generado ' + textoFecha(hoy()) + ' desde la app.'], []], t2));
    for (const cel in ws2) if (/^G\d+$/.test(cel) && typeof ws2[cel].v === 'number') ws2[cel].z = '0%';
    ws2['!cols'] = [{ wch: 30 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
    const td = delGrupo('TIPODOC'), ar = delGrupo('AREA'), se = delGrupo('SERIE'), n = Math.max(td.length, ar.length, se.length);
    const aoa3 = [['TIPOS DE DOCUMENTO, ÁREAS Y SERIES'], [], ['Código', 'Nombre', 'Uso', '', 'Código', 'Área', '', 'Serie', 'Nombre']];
    for (let k = 0; k < n; k++) aoa3.push([(td[k] || {}).codigo || '', (td[k] || {}).nombre || '', (td[k] || {}).descripcion || '', '', (ar[k] || {}).codigo || '', (ar[k] || {}).nombre || '', '', (se[k] || {}).codigo || '', (se[k] || {}).nombre || '']);
    const ws3 = XLSX.utils.aoa_to_sheet(aoa3);
    ws3['!cols'] = [8, 22, 50, 3, 8, 42, 3, 8, 28].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Checklist'); XLSX.utils.book_append_sheet(wb, ws2, 'Resumen'); XLSX.utils.book_append_sheet(wb, ws3, 'Tipos y Areas');
    XLSX.writeFile(wb, 'Checklist_Operaciones_IC_' + hoy() + '.xlsx');
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
      if (CFG.usuarios.indexOf(email) < 0) { U.pantalla(raiz, { logo: CFG.logo, titulo: 'Sin acceso', texto: 'Esta app es solo de la Dirección de Operaciones.', boton: 'Volver al portal', alClic: () => IC.portal.volver() }); return; }
      App.usuario = { nombre: cuenta.name || email, email, iniciales: U.fmt.iniciales(cuenta.name || email) };
      await G.sitio(CFG.sitio.host, CFG.sitio.ruta);
      await Promise.all([cargarCatalogo().then(cargar), cargarDocs()]);
      pintarEncabezado();
      U.enrutar({ '': () => vistaResumen(raiz), checklist: () => vistaChecklist(raiz), catalogos: () => vistaCatalogos(raiz), excel: () => vistaExcel(raiz) }, marcarNav);
    } catch (e) {
      console.error(e);
      const falta = /No existe la lista CHK_/.test(e.message);
      U.pantalla(raiz, { logo: CFG.logo, titulo: falta ? 'Falta instalar la app' : 'No se pudo cargar la app',
        texto: falta ? 'Las listas CHK_Items y CHK_Catalogo aún no existen en IC Apps. Abra el instalador (Programacion/Instalador/) y haga clic en «Crear estructura».' : U.mensajeError(e), boton: falta ? 'Abrir el instalador' : 'Reintentar', alClic: () => { if (falta) window.open('/ideascontrol/Programacion/Instalador/', '_blank'); else location.reload(); } });
    }
  }
  window.addEventListener('DOMContentLoaded', arrancar);
})();
