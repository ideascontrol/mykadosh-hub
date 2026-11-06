/* =====================================================================
   APP-110 · Calculadora de costos y precios
   Vistas: #  nuevo cálculo · #historial  cálculos guardados · #ver/COS-0001  detalle
   Datos: CAL_Costeos (IC Apps). Cada cálculo guardado queda como registro histórico (no se edita).
   Cálculo (igual que el Excel simple):
     línea «Por unidad» = cantidad × costo × cantidad a calcular · línea «Total» = cantidad × costo (se reparte)
     prestaciones = % × líneas de familia Personal · costo unitario = total ÷ cantidad a calcular
     precio = costo unitario ÷ (1 − margen − comisión − otros) · IVA aparte
   ===================================================================== */
const App = { usuario: null, c: null, base: null, hist: null, filtro: { q: '', categoria: '' } };

(function () {
  const U = IC.ui, esc = U.esc, G = IC.graph;
  const BORRADOR = 'ic_cal_borrador';
  const ROLES = { 'operaciones@ideascontrol.com': 'Dirección de Operaciones', 'patricia@ideascontrol.com': 'Gerencia General', 'margarita@ideascontrol.com': 'Dirección Comercial' };
  const pad = (n, l) => String(n).padStart(l || 4, '0');

  // ---------- Números ----------
  // Acepta 3000000 · 3.000.000 · 3.000.000,50 · 12,5 · $ 1.200
  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    let s = String(v === null || v === undefined ? '' : v).replace(/[$\s%]/g, '');
    if (!s) return 0;
    if (s.indexOf(',') >= 0 && s.indexOf('.') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.indexOf(',') >= 0) s = s.replace(',', '.');
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    const n = Number(s); return isFinite(n) ? n : 0;
  }
  const verNum = (n) => (n || n === 0) && n !== '' ? Number(n).toLocaleString('es-CO', { maximumFractionDigits: 2 }) : '';
  const cop = (n) => '$ ' + Math.round(Number(n || 0)).toLocaleString('es-CO');
  const pct = (f) => (Math.round(Number(f || 0) * 1000) / 10).toLocaleString('es-CO') + ' %';
  const verPct = (f) => verNum(Math.round(Number(f || 0) * 10000) / 100);

  // ---------- Modelo ----------
  const linea = (o) => Object.assign({ familia: '', concepto: '', tipo: 'Por unidad', cant: 1, costo: 0, moneda: 'COP', obs: '' }, o || {});
  function nuevo() {
    return { producto: '', codigo: '', categoria: '', unidad: 'Unidad', cantidad: 1, notas: '', tasa: 0, margen: CFG.margenDefecto, comision: 0, otros: 0,
      iva: CFG.iva, prestaciones: CFG.prestaciones, lineas: [linea(), linea(), linea()] };
  }
  function calcular(c) {
    const q = num(c.cantidad), tasa = num(c.tasa);
    let faltaTasa = false;
    const tot = c.lineas.map((l) => {
      const usd = l.moneda === 'USD';
      if (usd && num(l.costo) && tasa <= 1) faltaTasa = true;
      const base = num(l.cant) * num(l.costo) * (usd ? tasa : 1);
      return l.tipo === 'Total' ? base : base * q;
    });
    const personal = c.lineas.reduce((s, l, i) => s + (l.familia === CFG.familiaPersonal ? tot[i] : 0), 0);
    const prest = personal * num(c.prestaciones);
    const total = tot.reduce((s, x) => s + x, 0) + prest;
    const costoU = q > 0 ? total / q : 0;
    const resto = 1 - num(c.margen) - num(c.comision) - num(c.otros);
    const precio = resto > 0 ? costoU / resto : null;
    const precioIva = precio === null ? null : precio * (1 + num(c.iva));
    const utilidad = precio === null ? null : precio * (1 - num(c.comision) - num(c.otros)) - costoU;
    const margenReal = precio ? utilidad / precio : null;
    return { q, tot, prest, total, costoU, resto, precio, precioIva, utilidad, margenReal, faltaTasa, personal,
      precioTotal: precio === null ? null : precio * q, precioIvaTotal: precioIva === null ? null : precioIva * q, utilidadTotal: utilidad === null ? null : utilidad * q };
  }
  // Cada «Nuevo cálculo» empieza limpio: no se conserva borrador (solo se borra el de versiones anteriores)
  function borrarBorrador() { try { localStorage.removeItem(BORRADOR); } catch (e) { /* nada */ } }

  // ---------- Encabezado ----------
  function pintarEncabezado() {
    const u = App.usuario;
    document.getElementById('encabezado').innerHTML =
      '<a href="#"><img class="logo" src="' + CFG.logo + '" alt="Ideas Control"></a>' +
      '<div class="app-nombre"><b>' + esc(CFG.app.nombre) + '</b><span>' + CFG.app.id + ' · v' + CFG.app.version + '</span></div><div class="espacio"></div>' +
      '<nav class="cal-nav"><a href="#" data-r="">Nuevo cálculo</a><a href="#historial" data-r="historial">Historial</a></nav>' +
      '<div class="ic-user">' + IC.portal.boton() + '<div class="datos"><b>' + esc(u.nombre) + '</b><span>' + esc(ROLES[u.email] || '') + '</span></div>' +
      '<div class="ic-avatar" title="' + esc(u.email) + '">' + esc(u.iniciales) + '</div><button class="ic-btn sec chico" id="btnSalir">Salir</button></div>';
    document.getElementById('encabezado').hidden = false;
    document.getElementById('btnSalir').onclick = () => IC.auth.salir();
  }
  const marcarNav = (r) => document.querySelectorAll('.cal-nav a').forEach((a) => a.classList.toggle('on', a.dataset.r === r || (r === 'ver' && a.dataset.r === 'historial')));
  const opciones = (lista, sel, vacio) => (vacio !== undefined ? '<option value="">' + esc(vacio) + '</option>' : '') +
    lista.concat(sel && lista.indexOf(sel) < 0 ? [sel] : []).map((x) => '<option' + (x === sel ? ' selected' : '') + '>' + esc(x) + '</option>').join('');

  // =====================================================================
  // NUEVO CÁLCULO
  // =====================================================================
  function vistaCalc(raiz) {
    const c = App.c;
    raiz.innerHTML =
      '<div class="ic-barra"><div><h1 class="ic-titulo">Nuevo cálculo</h1><p class="ic-subtitulo" style="margin:0">Registra los costos que le aplican al producto o servicio. El precio se calcula solo.</p></div>' +
      '<span class="espacio"></span><button class="ic-btn sec" id="bLimpiar">Empezar de cero</button></div>' +
      '<div class="cal-layout">' +
      // 1. Datos
      '<section class="ic-form cal-sec"><fieldset><legend>1. Datos</legend><div class="ic-campos">' +
        '<div class="ic-campo c8"><label for="d_producto">Producto o servicio <span class="req">*</span></label><input id="d_producto" data-c="producto" value="' + esc(c.producto) + '" placeholder="Ej. Biométrico facial con instalación" autocomplete="off"></div>' +
        '<div class="ic-campo c4"><label for="d_codigo">Código / referencia</label><input id="d_codigo" data-c="codigo" value="' + esc(c.codigo) + '" autocomplete="off"></div>' +
        '<div class="ic-campo c4"><label for="d_categoria">Categoría</label><select id="d_categoria" data-c="categoria">' + opciones(CFG.categorias, c.categoria, 'Seleccione…') + '</select></div>' +
        '<div class="ic-campo c4"><label for="d_unidad">Unidad de cálculo</label><select id="d_unidad" data-c="unidad">' + opciones(CFG.unidades, c.unidad) + '</select></div>' +
        '<div class="ic-campo c4"><label for="d_cantidad">Cantidad a calcular <span class="req">*</span></label><input id="d_cantidad" data-c="cantidad" data-n="1" inputmode="decimal" value="' + esc(verNum(c.cantidad)) + '"><span class="ayuda">Cuántas unidades vas a costear (ej. 20 días, 10 equipos).</span></div>' +
      '</div></fieldset></section>' +
      // 3. Precio (columna derecha)
      '<aside class="cal-der"><section class="ic-form cal-sec cal-precio"><fieldset style="margin:0"><legend>3. Precio</legend>' +
        '<div class="cal-params">' +
          campoPct('margen', 'Margen deseado', c.margen) + campoPct('comision', 'Comisión de venta', c.comision) +
          campoPct('otros', 'Otros costos sobre la venta', c.otros) + campoPct('iva', 'IVA', c.iva, '0 si es exento o excluido') +
        '</div><div id="resultado"></div>' +
        '<button class="ic-btn cal-guardar" id="bGuardar">Guardar en el historial</button>' +
        '<p class="cal-nota">Al guardar, el cálculo queda como registro histórico con fecha y autor. No se modifica después.</p>' +
      '</fieldset></section></aside>' +

      // 2. Costos
      '<section class="ic-form cal-sec cal-ancho"><fieldset><legend>2. Costos</legend>' +
        '<p class="cal-ayuda"><b>Por unidad:</b> se repite en cada unidad (el equipo, los accesorios, 1 día de técnico por día). <b>Total:</b> valor completo que se reparte entre la cantidad (salario del mes, flete del lote, licencia anual).</p>' +
        '<div class="cal-tabla-caja"><table class="cal-tabla"><thead><tr><th>Familia</th><th>Concepto</th><th>¿Por unidad o total?</th><th class="n">Cantidad</th><th>Moneda</th><th class="n">Costo unitario</th><th class="n">Total</th><th>Observación</th><th></th></tr></thead>' +
        '<tbody id="lineas"></tbody><tfoot>' +
          '<tr class="cal-prest"><td colspan="6"><span id="tPrestTxt"></span></td><td class="n" id="tPrest"></td><td colspan="2" class="sec">Automático. Contratistas y terceros: usar otra familia.</td></tr>' +
          '<tr class="cal-total"><td colspan="6">Total costos</td><td class="n" id="tTotal"></td><td colspan="2"></td></tr></tfoot></table></div>' +
        '<div class="cal-bajo"><button class="ic-btn sec chico" id="bLinea">+ Agregar línea</button><span class="cal-mini" id="mini"></span>' +
        '<label class="cal-tasa" id="cajaTasa">Tasa de cambio USD → COP <input data-c="tasa" data-n="1" inputmode="decimal" value="' + esc(c.tasa ? verNum(c.tasa) : '') + '" placeholder="Ej. 4.000"></label></div>' +
      '</fieldset>' +
      '<fieldset style="margin-bottom:0"><legend>Notas</legend><textarea data-c="notas" rows="2" placeholder="Supuestos, proveedor, cotización de referencia, cliente…">' + esc(c.notas) + '</textarea></fieldset></section>' +
      '</div>';
    pintarLineas(raiz);
    raiz.querySelectorAll('[data-c]').forEach((el) => {
      el.addEventListener('input', () => { const k = el.dataset.c; c[k] = el.dataset.p ? num(el.value) / 100 : el.dataset.n ? num(el.value) : el.value; refrescar(raiz); });
      if (el.dataset.n && !el.dataset.p) el.addEventListener('blur', () => { if (el.value) el.value = verNum(num(el.value)); });
    });
    raiz.querySelector('#bLinea').onclick = () => { c.lineas.push(linea()); pintarLineas(raiz); const f = raiz.querySelectorAll('#lineas tr'); f[f.length - 1].querySelector('select').focus(); };
    raiz.querySelector('#bLimpiar').onclick = async () => {
      if (!(await U.confirmar('Empezar de cero', 'Se borra lo que lleva escrito en este cálculo (no afecta el historial).', 'Borrar y empezar'))) return;
      App.c = nuevo(); vistaCalc(raiz);
    };
    raiz.querySelector('#bGuardar').onclick = () => guardar(raiz);
    refrescar(raiz);
  }
  function campoPct(k, label, v, ayuda) {
    return '<div class="ic-campo"><label for="p_' + k + '">' + esc(label) + '</label><div class="cal-pct"><input id="p_' + k + '" data-c="' + k + '" data-n="1" data-p="1" inputmode="decimal" value="' + esc(verPct(v)) + '"><span>%</span></div>' +
      (ayuda ? '<span class="ayuda">' + esc(ayuda) + '</span>' : '') + '</div>';
  }
  function pintarLineas(raiz) {
    const c = App.c, tb = raiz.querySelector('#lineas');
    tb.innerHTML = c.lineas.map((l, i) =>
      '<tr data-i="' + i + '"><td><select data-k="familia" aria-label="Familia">' + opciones(CFG.familias, l.familia, '—') + '</select></td>' +
      '<td><input data-k="concepto" value="' + esc(l.concepto) + '" placeholder="Ej. Compra del equipo" aria-label="Concepto" list="cal-conceptos"></td>' +
      '<td><select data-k="tipo" aria-label="Por unidad o total">' + opciones(['Por unidad', 'Total'], l.tipo) + '</select></td>' +
      '<td class="n"><input data-k="cant" data-n="1" inputmode="decimal" value="' + esc(verNum(l.cant)) + '" aria-label="Cantidad"></td>' +
      '<td><select data-k="moneda" aria-label="Moneda">' + opciones(['COP', 'USD'], l.moneda) + '</select></td>' +
      '<td class="n"><input data-k="costo" data-n="1" inputmode="decimal" value="' + esc(l.costo ? verNum(l.costo) : '') + '" placeholder="0" aria-label="Costo unitario"></td>' +
      '<td class="n tot" data-t="' + i + '"></td>' +
      '<td><input data-k="obs" value="' + esc(l.obs) + '" aria-label="Observación"></td>' +
      '<td><button class="cal-x" data-del="' + i + '" title="Quitar línea" aria-label="Quitar línea">×</button></td></tr>').join('');
    tb.querySelectorAll('[data-k]').forEach((el) => {
      const i = Number(el.closest('tr').dataset.i), k = el.dataset.k;
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { c.lineas[i][k] = el.dataset.n ? num(el.value) : el.value; refrescar(raiz); });
      if (el.dataset.n) el.addEventListener('blur', () => { if (el.value) el.value = verNum(num(el.value)); });
    });
    tb.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => { c.lineas.splice(Number(b.dataset.del), 1); if (!c.lineas.length) c.lineas.push(linea()); pintarLineas(raiz); refrescar(raiz); }; });
    // Sugerencias de concepto: los ya usados en el historial
    let dl = document.getElementById('cal-conceptos');
    if (!dl) { dl = document.createElement('datalist'); dl.id = 'cal-conceptos'; document.body.appendChild(dl); }
    const vistos = new Set();
    (App.hist || []).forEach((h) => (h._lineas || []).forEach((l) => l.concepto && vistos.add(l.concepto)));
    dl.innerHTML = Array.from(vistos).sort().slice(0, 200).map((x) => '<option value="' + esc(x) + '">').join('');
  }
  function refrescar(raiz) {
    const c = App.c, r = calcular(c);
    r.tot.forEach((t, i) => { const td = raiz.querySelector('[data-t="' + i + '"]'); if (td) td.textContent = cop(t); });
    raiz.querySelector('#tPrestTxt').textContent = 'Prestaciones del personal (' + pct(c.prestaciones) + ' sobre las líneas de familia Personal)';
    raiz.querySelector('#tPrest').textContent = cop(r.prest);
    raiz.querySelector('#tTotal').textContent = cop(r.total);
    raiz.querySelector('#cajaTasa').classList.toggle('falta', r.faltaTasa);
    raiz.querySelector('#cajaTasa').hidden = !c.lineas.some((l) => l.moneda === 'USD') && !num(c.tasa);
    raiz.querySelector('#resultado').innerHTML = resultadoHtml(c, r);
    raiz.querySelector('#mini').innerHTML = 'Costo unitario <b>' + cop(r.costoU) + '</b> · Precio sugerido <b>' + (r.precio === null ? '—' : cop(r.precio)) + '</b>';
  }
  function aviso(c, r) {
    if (r.faltaTasa) return ['mal', '⚠ Falta la tasa de cambio para las líneas en USD'];
    if (!(r.q > 0)) return ['mal', '⚠ Indique la cantidad a calcular'];
    if (r.precio === null) return ['mal', '⚠ Margen + comisión + otros suman 100 % o más'];
    if (!r.total) return ['gris', 'Registre al menos un costo'];
    return r.margenReal >= CFG.margenMinimo ? ['bien', '✔ Margen OK (mínimo ' + pct(CFG.margenMinimo) + ')'] : ['mal', '⚠ Margen por debajo del mínimo (' + pct(CFG.margenMinimo) + ')'];
  }
  function resultadoHtml(c, r) {
    const v = (x) => x === null ? '—' : cop(x), a = aviso(c, r);
    return '<table class="cal-res"><thead><tr><th></th><th>Por unidad</th><th>Total (' + esc(verNum(r.q)) + ')</th></tr></thead><tbody>' +
      '<tr><td>Costo</td><td>' + cop(r.costoU) + '</td><td>' + cop(r.total) + '</td></tr>' +
      '<tr class="grande"><td>Precio sugerido<span>antes de IVA</span></td><td>' + v(r.precio) + '</td><td>' + v(r.precioTotal) + '</td></tr>' +
      '<tr><td>Precio con IVA</td><td><b>' + v(r.precioIva) + '</b></td><td><b>' + v(r.precioIvaTotal) + '</b></td></tr>' +
      '<tr><td>Utilidad</td><td>' + v(r.utilidad) + '</td><td>' + v(r.utilidadTotal) + '</td></tr>' +
      '<tr><td>Margen real</td><td><b>' + (r.margenReal === null ? '—' : pct(r.margenReal)) + '</b></td><td></td></tr></tbody></table>' +
      '<div class="cal-aviso ' + a[0] + '">' + esc(a[1]) + '</div>';
  }

  async function guardar(raiz) {
    const c = App.c, r = calcular(c);
    const f = raiz.querySelector('#d_producto');
    if (!String(c.producto).trim()) { U.aviso('Escriba el producto o servicio', 'warn'); f.focus(); return; }
    if (!(r.q > 0)) { U.aviso('Indique la cantidad a calcular', 'warn'); raiz.querySelector('#d_cantidad').focus(); return; }
    if (r.faltaTasa) { U.aviso('Falta la tasa de cambio para las líneas en USD', 'warn'); return; }
    if (!r.total) { U.aviso('Registre al menos un costo', 'warn'); return; }
    if (r.precio === null) { U.aviso('Margen + comisión + otros suman 100 % o más', 'warn'); return; }
    if (r.margenReal < CFG.margenMinimo && !(await U.confirmar('Margen bajo', 'El margen real (' + pct(r.margenReal) + ') está por debajo del mínimo (' + pct(CFG.margenMinimo) + ').\n¿Guardar de todas formas?', 'Guardar'))) return;
    const lineas = c.lineas.map((l, i) => ({ familia: l.familia, concepto: String(l.concepto).trim(), tipo: l.tipo, cant: num(l.cant), moneda: l.moneda, costo: num(l.costo), total: Math.round(r.tot[i] * 100) / 100, obs: String(l.obs).trim() }))
      .filter((l) => l.concepto || l.costo || l.familia);
    const b = raiz.querySelector('#bGuardar');
    try {
      let id;
      await U.conCarga(b, async () => {
        const n = await G.siguiente('CAL');
        id = 'COS-' + pad(n);
        const r2 = (x) => Math.round(x * 100) / 100;
        await G.crear(CFG.lista, {
          Title: id, fecha: new Date().toISOString(), producto: String(c.producto).trim(), codigo: String(c.codigo).trim(), categoria: c.categoria, unidad: c.unidad,
          cantidad: r.q, costo_total: r2(r.total), costo_unitario: r2(r.costoU), prestaciones_pct: num(c.prestaciones), prestaciones_valor: r2(r.prest),
          tasa_usd: num(c.tasa) || null, margen: num(c.margen), comision: num(c.comision), otros: num(c.otros), iva: num(c.iva),
          precio_unitario: r2(r.precio), precio_iva: r2(r.precioIva), utilidad_unitaria: r2(r.utilidad), margen_real: Math.round(r.margenReal * 10000) / 10000,
          precio_total: r2(r.precioTotal), precio_iva_total: r2(r.precioIvaTotal), lineas: JSON.stringify(lineas), notas: String(c.notas).trim(),
          autor_email: App.usuario.email, autor_nombre: App.usuario.nombre
        });
      });
      U.aviso('Cálculo ' + id + ' guardado en el historial', 'ok', 6000);
      App.c = nuevo(); App.hist = null;
      location.hash = 'ver/' + id;
    } catch (e) { console.error(e); U.aviso(U.mensajeError(e), 'err', 9000); }
  }

  // =====================================================================
  // HISTORIAL
  // =====================================================================
  async function cargarHist(forzar) {
    if (App.hist && !forzar) return;
    App.hist = (await G.items(CFG.lista, { top: 5000 })).map((h) => { try { h._lineas = JSON.parse(h.lineas || '[]'); } catch (e) { h._lineas = []; } return h; })
      .sort((a, b) => String(b.Title).localeCompare(String(a.Title)));
  }
  const fechaCorta = (iso) => iso ? new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  async function vistaHistorial(raiz) {
    raiz.innerHTML = '<div class="ic-centro" style="min-height:200px"><div class="ic-spinner"></div></div>';
    try { await cargarHist(true); } catch (e) { raiz.innerHTML = '<p class="ic-vacio">' + esc(U.mensajeError(e)) + '</p>'; return; }
    const F = App.filtro;
    raiz.innerHTML = '<div class="ic-barra"><div><h1 class="ic-titulo">Historial</h1><p class="ic-subtitulo" style="margin:0">Cálculos guardados. Cada uno conserva sus costos, supuestos y precio del momento.</p></div>' +
      '<span class="espacio"></span><button class="ic-btn sec" id="bExcel">Descargar Excel</button><a class="ic-btn" href="#">+ Nuevo cálculo</a></div>' +
      '<div class="ic-filtros"><div class="ic-buscar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
      '<input id="fq" placeholder="Buscar producto, código, concepto, autor…" value="' + esc(F.q) + '" autocomplete="off"></div>' +
      '<select id="fcat">' + opciones(CFG.categorias, F.categoria, 'Todas las categorías') + '</select></div><div id="tabla"></div>';
    const pintar = () => {
      const t = U.norm(F.q).split(/\s+/).filter(Boolean);
      const lista = App.hist.filter((h) => (!F.categoria || h.categoria === F.categoria) &&
        t.every((x) => U.norm([h.Title, h.producto, h.codigo, h.categoria, h.autor_nombre, h.notas].concat(h._lineas.map((l) => l.concepto)).join(' ')).indexOf(x) >= 0));
      raiz.querySelector('#tabla').innerHTML = !App.hist.length ? '<div class="ic-tabla-caja"><p class="ic-vacio">Aún no hay cálculos guardados.</p></div>' :
        '<p class="ic-conteo">' + lista.length + ' de ' + App.hist.length + ' cálculos</p><div class="ic-tabla-caja cal-scroll"><table class="ic-tabla"><thead><tr><th>Cálculo</th><th>Producto o servicio</th><th>Cantidad</th><th class="n">Costo unitario</th><th class="n">Precio (antes de IVA)</th><th class="n">Margen real</th><th>Elaboró</th></tr></thead><tbody>' +
        (lista.map((h) => '<tr data-id="' + esc(h.Title) + '"><td class="nw"><b>' + esc(h.Title) + '</b><span class="sec">' + esc(fechaCorta(h.fecha)) + '</span></td>' +
          '<td><b>' + esc(h.producto) + '</b><span class="sec">' + esc([h.codigo, h.categoria].filter(Boolean).join(' · ')) + '</span></td>' +
          '<td class="nw">' + esc(verNum(h.cantidad)) + ' ' + esc(String(h.unidad || '').toLowerCase()) + '</td><td class="n">' + cop(h.costo_unitario) + '</td><td class="n"><b>' + cop(h.precio_unitario) + '</b></td>' +
          '<td class="n"><span class="cal-chip ' + (Number(h.margen_real) >= CFG.margenMinimo ? 'bien' : 'mal') + '">' + pct(h.margen_real) + '</span></td><td>' + esc(h.autor_nombre || '') + '</td></tr>').join('') ||
          '<tr><td colspan="7" class="ic-vacio">Ningún cálculo coincide con el filtro.</td></tr>') + '</tbody></table></div>';
      raiz.querySelectorAll('tr[data-id]').forEach((tr) => { tr.onclick = () => { location.hash = 'ver/' + tr.dataset.id; }; });
    };
    raiz.querySelector('#fq').addEventListener('input', (e) => { F.q = e.target.value; pintar(); });
    raiz.querySelector('#fcat').onchange = (e) => { F.categoria = e.target.value; pintar(); };
    raiz.querySelector('#bExcel').onclick = () => exportar().catch((e) => U.aviso(U.mensajeError(e), 'err'));
    pintar();
  }
  function cargarXLSX() {
    if (window.XLSX) return Promise.resolve();
    return new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar la librería de Excel.')); document.head.appendChild(s); });
  }
  async function exportar() {
    await cargarXLSX();
    const H = App.hist;
    const ws1 = XLSX.utils.json_to_sheet(H.map((h) => ({ 'Cálculo': h.Title, 'Fecha': h.fecha ? new Date(h.fecha) : '', 'Producto o servicio': h.producto, 'Código': h.codigo || '', 'Categoría': h.categoria || '',
      'Unidad': h.unidad || '', 'Cantidad': Number(h.cantidad) || 0, 'Costo total': Number(h.costo_total) || 0, 'Costo unitario': Number(h.costo_unitario) || 0,
      'Margen deseado': Number(h.margen) || 0, 'Comisión': Number(h.comision) || 0, 'Otros': Number(h.otros) || 0, 'IVA': Number(h.iva) || 0,
      'Precio unitario': Number(h.precio_unitario) || 0, 'Precio con IVA': Number(h.precio_iva) || 0, 'Utilidad unitaria': Number(h.utilidad_unitaria) || 0,
      'Margen real': Number(h.margen_real) || 0, 'Precio total': Number(h.precio_total) || 0, 'Prestaciones %': Number(h.prestaciones_pct) || 0,
      'Tasa USD': Number(h.tasa_usd) || '', 'Notas': h.notas || '', 'Elaboró': h.autor_nombre || '' })), { cellDates: true });
    const filas = [];
    H.forEach((h) => h._lineas.forEach((l) => filas.push({ 'Cálculo': h.Title, 'Producto o servicio': h.producto, 'Familia': l.familia, 'Concepto': l.concepto, 'Tipo': l.tipo,
      'Cantidad': l.cant, 'Moneda': l.moneda, 'Costo unitario': l.costo, 'Total (COP)': l.total, 'Observación': l.obs })));
    const ws2 = XLSX.utils.json_to_sheet(filas);
    ws1['!cols'] = [10, 12, 36, 14, 16, 12, 10, 14, 14, 10, 10, 10, 8, 14, 14, 14, 10, 14, 10, 10, 40, 22].map((w) => ({ wch: w }));
    ws2['!cols'] = [10, 36, 18, 32, 12, 10, 8, 14, 14, 30].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Cálculos'); XLSX.utils.book_append_sheet(wb, ws2, 'Líneas de costo');
    const d = new Date();
    XLSX.writeFile(wb, 'Historial_costeos_IC_' + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + '.xlsx');
  }

  // =====================================================================
  // DETALLE (solo lectura)
  // =====================================================================
  async function vistaDetalle(raiz) {
    const id = decodeURIComponent((location.hash.split('/')[1] || ''));
    raiz.innerHTML = '<div class="ic-centro" style="min-height:200px"><div class="ic-spinner"></div></div>';
    try { await cargarHist(!App.hist || !App.hist.some((h) => h.Title === id)); } catch (e) { raiz.innerHTML = '<p class="ic-vacio">' + esc(U.mensajeError(e)) + '</p>'; return; }
    const h = App.hist.find((x) => x.Title === id);
    if (!h) { raiz.innerHTML = '<div class="ic-tabla-caja"><p class="ic-vacio">No se encontró el cálculo ' + esc(id) + '. <a href="#historial">Volver al historial</a></p></div>'; return; }
    const ok = Number(h.margen_real) >= CFG.margenMinimo;
    const dato = (k, v) => v || v === 0 ? '<dt>' + esc(k) + '</dt><dd>' + v + '</dd>' : '';
    raiz.innerHTML = '<a class="ic-volver cal-noimp" href="#historial">← Historial</a>' +
      '<div class="ic-ficha-cab"><div class="principal"><span class="ic-tag" style="background:#E6F0FA;color:#0A5A90">' + esc(h.Title) + '</span>' +
        '<h1>' + esc(h.producto) + '</h1><div class="meta"><span>' + esc(fechaCorta(h.fecha)) + '</span><span>Elaboró: ' + esc(h.autor_nombre || h.autor_email || '') + '</span>' +
        (h.categoria ? '<span>' + esc(h.categoria) + '</span>' : '') + (h.codigo ? '<span>Código ' + esc(h.codigo) + '</span>' : '') + '</div></div>' +
        '<div class="cal-noimp" style="display:flex;gap:8px;flex-wrap:wrap"><button class="ic-btn" id="bBase">Usar como base</button><button class="ic-btn sec" id="bImp">Imprimir / PDF</button>' +
        (CFG.puedenBorrar.indexOf(App.usuario.email) >= 0 ? '<button class="ic-btn peligro" id="bDel">Eliminar</button>' : '') + '</div></div>' +
      '<div class="cal-det"><section class="ic-bloque"><div class="cab"><h2>Costos</h2><span class="sec">Cantidad calculada: ' + esc(verNum(h.cantidad)) + ' ' + esc(String(h.unidad || '').toLowerCase()) + '</span></div><div class="cuerpo cal-scroll">' +
        '<table class="ic-tabla cal-tdet"><thead><tr><th>Familia</th><th>Concepto</th><th>Tipo</th><th class="n">Cant.</th><th class="n">Costo unitario</th><th class="n">Total</th></tr></thead><tbody>' +
        h._lineas.map((l) => '<tr><td>' + esc(l.familia || '—') + '</td><td>' + esc(l.concepto) + (l.obs ? '<span class="sec">' + esc(l.obs) + '</span>' : '') + '</td><td>' + esc(l.tipo) + '</td>' +
          '<td class="n">' + esc(verNum(l.cant)) + '</td><td class="n">' + (l.moneda === 'USD' ? 'US$ ' + esc(verNum(l.costo)) : cop(l.costo)) + '</td><td class="n">' + cop(l.total) + '</td></tr>').join('') +
        (Number(h.prestaciones_valor) ? '<tr><td colspan="5"><i>Prestaciones del personal (' + pct(h.prestaciones_pct) + ')</i></td><td class="n">' + cop(h.prestaciones_valor) + '</td></tr>' : '') +
        '<tr class="cal-total"><td colspan="5">Total costos</td><td class="n">' + cop(h.costo_total) + '</td></tr></tbody></table>' +
        (h.notas ? '<p class="cal-notas"><b>Notas:</b> ' + esc(h.notas) + '</p>' : '') + '</div></section>' +
      '<section class="ic-bloque"><div class="cab"><h2>Precio</h2></div><div class="cuerpo">' +
        '<table class="cal-res"><thead><tr><th></th><th>Por unidad</th><th>Total</th></tr></thead><tbody>' +
        '<tr><td>Costo</td><td>' + cop(h.costo_unitario) + '</td><td>' + cop(h.costo_total) + '</td></tr>' +
        '<tr class="grande"><td>Precio sugerido<span>antes de IVA</span></td><td>' + cop(h.precio_unitario) + '</td><td>' + cop(h.precio_total) + '</td></tr>' +
        '<tr><td>Precio con IVA (' + pct(h.iva) + ')</td><td><b>' + cop(h.precio_iva) + '</b></td><td><b>' + cop(h.precio_iva_total) + '</b></td></tr>' +
        '<tr><td>Utilidad</td><td>' + cop(h.utilidad_unitaria) + '</td><td>' + cop(Number(h.utilidad_unitaria) * Number(h.cantidad)) + '</td></tr></tbody></table>' +
        '<div class="cal-aviso ' + (ok ? 'bien' : 'mal') + '">' + (ok ? '✔' : '⚠') + ' Margen real ' + pct(h.margen_real) + '</div>' +
        '<dl class="cal-dl">' + dato('Margen deseado', pct(h.margen)) + dato('Comisión', pct(h.comision)) + dato('Otros sobre la venta', pct(h.otros)) +
          (Number(h.tasa_usd) ? dato('Tasa USD → COP', esc(verNum(h.tasa_usd))) : '') + '</dl></div></section></div>';
    raiz.querySelector('#bImp').onclick = () => window.print();
    raiz.querySelector('#bBase').onclick = async () => {
      App.base = Object.assign(nuevo(), { producto: h.producto || '', codigo: h.codigo || '', categoria: h.categoria || '', unidad: h.unidad || 'Unidad', cantidad: Number(h.cantidad) || 1,
        notas: (h.notas ? h.notas + '\n' : '') + 'Basado en ' + h.Title + '.', tasa: Number(h.tasa_usd) || 0, margen: Number(h.margen) || 0, comision: Number(h.comision) || 0,
        otros: Number(h.otros) || 0, iva: h.iva === null || h.iva === undefined ? CFG.iva : Number(h.iva),
        lineas: h._lineas.length ? h._lineas.map((l) => linea({ familia: l.familia, concepto: l.concepto, tipo: l.tipo, cant: l.cant, moneda: l.moneda, costo: l.costo, obs: l.obs })) : [linea()] });
      location.hash = '';
    };
    const del = raiz.querySelector('#bDel');
    if (del) del.onclick = async () => {
      if (!(await U.confirmar('Eliminar ' + h.Title, 'El cálculo se borra del historial. Úselo solo para corregir un registro equivocado.', 'Eliminar', true))) return;
      try { await G.eliminar(CFG.lista, h._id); App.hist = null; U.aviso(h.Title + ' eliminado', 'ok'); location.hash = 'historial'; } catch (e) { U.aviso(U.mensajeError(e), 'err', 9000); }
    };
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
      if (CFG.usuarios.indexOf(email) < 0) { U.pantalla(raiz, { logo: CFG.logo, titulo: 'Sin acceso', texto: 'Esta app es solo para Gerencia General, Dirección Comercial y Dirección de Operaciones.', boton: 'Volver al portal', alClic: () => IC.portal.volver() }); return; }
      App.usuario = { nombre: cuenta.name || email, email, iniciales: U.fmt.iniciales(cuenta.name || email) };
      await G.sitio(CFG.sitio.host, CFG.sitio.ruta);
      await G.listaId(CFG.lista);   // comprueba que la lista exista
      borrarBorrador(); App.c = nuevo();
      cargarHist().catch(() => { /* sugerencias opcionales */ });
      pintarEncabezado();
      // «Nuevo cálculo» siempre limpio; «Usar como base» llega con la copia en App.base
      const calc = () => { App.c = App.base || nuevo(); App.base = null; vistaCalc(raiz); };
      document.addEventListener('click', (e) => {
        const a = e.target.closest && e.target.closest('a[href="#"]');
        if (a && (location.hash === '' || location.hash === '#')) { e.preventDefault(); calc(); window.scrollTo(0, 0); }
      });
      U.enrutar({ '': calc, historial: () => vistaHistorial(raiz), ver: () => vistaDetalle(raiz) }, marcarNav);
    } catch (e) {
      console.error(e);
      const falta = /No existe la lista CAL_/.test(e.message);
      U.pantalla(raiz, { logo: CFG.logo, titulo: falta ? 'Falta instalar la app' : 'No se pudo cargar la app',
        texto: falta ? 'La lista CAL_Costeos aún no existe en IC Apps. Abra el instalador (Programacion/Instalador/) y haga clic en «Crear estructura».' : U.mensajeError(e), boton: 'Reintentar', alClic: () => location.reload() });
    }
  }
  window.addEventListener('DOMContentLoaded', arrancar);
})();
