/* =====================================================================
   APP-101 · Comercial — Tablero comercial (reportes de la primera tanda)
   Ruta: #tablero
   1. Indicadores del periodo   2. Embudo   3. Seguimiento pendiente (hoy)
   4. Motivos de pérdida        5. Comerciales
   Reglas:
   - Solo lee COT_Cotizaciones (valores congelados): si mañana cambia un precio,
     los reportes de meses anteriores no cambian.
   - No cuentan las Reemplazadas (cuenta su última revisión) ni las Anuladas.
     «Cotizado» no cuenta borradores.
   - Valores antes de IVA (subtotal neto). USD se pasa a pesos con la TRM de la
     cotización; si no tiene TRM no suma en pesos y se avisa.
   - Cotizado = fecha de la cotización en el periodo. Ganado / perdido = fecha de cierre en el periodo.
   - Un comercial ve solo lo suyo; el administrador ve todo y puede filtrar por comercial.
   ===================================================================== */
(function () {
  const U = IC.ui, esc = U.esc;
  const pad = (n, w) => String(n).padStart(w, '0');
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2);
  const hoy = () => iso(new Date());
  // Fecha local (las fechas con hora vienen en UTC: 7 p. m. en Colombia ya es otro día en UTC)
  const fl = (v) => { if (!v) return ''; const s = String(v); return s.length > 10 ? iso(new Date(s)) : s.slice(0, 10); };
  const C = () => App.cotizaciones, D = () => App.cotizaciones.datos;
  const ABIERTOS = ['PENDIENTE_APROBACION', 'LISTA_PARA_ENVIO', 'ENVIADA', 'EN_NEGOCIACION'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  const filtro = { periodo: 'mes', desde: '', hasta: '', comercial: '', linea: '', grupo: 'sinrespuesta' };

  // ---------- Formatos ----------
  const cop = (n) => '$ ' + Math.round(Number(n || 0)).toLocaleString('es-CO');
  const corto = (n) => { n = Number(n || 0); const a = Math.abs(n);
    return a >= 1e9 ? '$ ' + (n / 1e9).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + ' mil M' : a >= 1e6 ? '$ ' + (n / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + ' M' : cop(n); };
  const pct = (a, b) => (b ? Math.round(a / b * 100) + ' %' : '—');
  const fechaC = (s) => (s ? U.fmt.fecha(s + 'T12:00:00') : '—');
  const nombreUsuario = (id) => { const u = (App.usuarios || []).find((x) => x.Title === id); return u ? u.nombre : (id || '—'); };
  const inicialesUsuario = (id) => { const u = (App.usuarios || []).find((x) => x.Title === id); return u ? u.iniciales : ''; };

  // Valor en pesos, antes de IVA. null = USD sin TRM.
  function valor(c) {
    const v = Number(c.subtotal_neto !== undefined && c.subtotal_neto !== null ? c.subtotal_neto : c.total) || 0;
    if ((c.moneda || 'COP') === 'COP') return v;
    return Number(c.trm_referencia) > 0 ? v * Number(c.trm_referencia) : null;
  }
  const suma = (xs) => xs.reduce((s, c) => s + (valor(c) || 0), 0);

  // Días hábiles entre dos fechas (sin contar la inicial), sin sábados, domingos ni festivos
  function habiles(desde, hasta) {
    if (!desde || !hasta || hasta <= desde) return 0;
    const fest = D().festivos; let n = 0; const d = new Date(desde + 'T12:00:00'), fin = new Date(hasta + 'T12:00:00');
    while (d < fin) { d.setDate(d.getDate() + 1); const w = d.getDay(), s = iso(d); if (w !== 0 && w !== 6 && !fest.has(s)) n++; }
    return n;
  }
  const dias = (a, b) => Math.max(0, Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000));

  // ---------- Periodo ----------
  function rango() {
    const h = new Date(), y = h.getFullYear(), m = h.getMonth();
    if (filtro.periodo === 'mes') return [iso(new Date(y, m, 1)), hoy(), MESES[m] + ' ' + y];
    if (filtro.periodo === 'mesant') { const a = new Date(y, m - 1, 1); return [iso(a), iso(new Date(y, m, 0)), MESES[a.getMonth()] + ' ' + a.getFullYear()]; }
    if (filtro.periodo === 'trim') { const a = new Date(y, m - 2, 1); return [iso(a), hoy(), 'últimos 3 meses']; }
    if (filtro.periodo === 'anio') return [y + '-01-01', hoy(), 'año ' + y];
    const d = filtro.desde || iso(new Date(y, m, 1)), x = filtro.hasta || hoy();
    return [d <= x ? d : x, d <= x ? x : d, fechaC(d <= x ? d : x) + ' a ' + fechaC(d <= x ? x : d)];
  }

  // ---------- Universo visible ----------
  function universo() {
    const yo = App.usuario.usuario_id, adm = App.usuario.es_admin;
    return D().cotizaciones.filter((c) => c.estado !== 'REEMPLAZADA' && c.estado !== 'ANULADA' &&
      (adm ? (!filtro.comercial || c.comercial_id === filtro.comercial) : c.comercial_id === yo) &&
      (!filtro.linea || c.linea_negocio === filtro.linea));
  }

  // ---------- Cálculos (también los usa la exportación a Excel) ----------
  function calcular() {
    const [d, h, etiqueta] = rango(), ev = C().estadoVisible, P = D().params;
    const todas = universo();
    const enP = (s) => s && s >= d && s <= h;
    const emitidas = todas.filter((c) => c.estado !== 'BORRADOR' && enP(fl(c.fecha)));
    const ganadas = todas.filter((c) => c.estado === 'GANADA' && enP(fl(c.fecha_cierre)));
    const perdidas = todas.filter((c) => c.estado === 'PERDIDA' && enP(fl(c.fecha_cierre)));
    const abiertas = todas.filter((c) => ABIERTOS.indexOf(c.estado) >= 0 && ev(c) !== 'VENCIDA');
    const sinTrm = todas.filter((c) => valor(c) === null && (emitidas.indexOf(c) >= 0 || ganadas.indexOf(c) >= 0 || abiertas.indexOf(c) >= 0));
    const diasCierre = (xs) => { const v = xs.map((c) => dias(fl(c.fecha_envio) || fl(c.fecha), fl(c.fecha_cierre))); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
    const k = {
      cotizado: suma(emitidas), nEmitidas: emitidas.length,
      ganado: suma(ganadas), nGanadas: ganadas.length,
      perdido: suma(perdidas), nPerdidas: perdidas.length,
      abierto: suma(abiertas), nAbiertas: abiertas.length,
      tasa: pct(ganadas.length, ganadas.length + perdidas.length), tasaValor: pct(suma(ganadas), suma(ganadas) + suma(perdidas)),
      ticket: ganadas.length ? suma(ganadas) / ganadas.length : null, diasCierre: diasCierre(ganadas)
    };
    // Embudo: cotizaciones emitidas en el periodo, según su estado de hoy
    const ETAPAS = [['LISTA_PARA_ENVIO', 'Lista para enviar'], ['ENVIADA', 'Enviada'], ['EN_NEGOCIACION', 'En negociación'], ['VENCIDA', 'Vencida sin cerrar'], ['GANADA', 'Ganada'], ['PERDIDA', 'Perdida']];
    const embudo = ETAPAS.map(([e, n]) => { const xs = emitidas.filter((c) => (ev(c) === 'PENDIENTE_APROBACION' ? 'LISTA_PARA_ENVIO' : ev(c)) === e); return { estado: e, nombre: n, n: xs.length, valor: suma(xs) }; });
    // Seguimiento (hoy)
    const t = hoy(), dSeg = Number(P.DIAS_SEGUIMIENTO) || 5, dVen = Number(P.DIAS_ALERTA_VENCIMIENTO) || 3;
    const fila = (c, txt, n) => ({ c, txt, n });
    const seg = {
      sinrespuesta: todas.filter((c) => ['ENVIADA', 'EN_NEGOCIACION'].indexOf(c.estado) >= 0 && ev(c) !== 'VENCIDA')
        .map((c) => fila(c, 'días hábiles desde el envío', habiles(fl(c.fecha_envio) || fl(c.fecha), t))).filter((x) => x.n >= dSeg),
      vencen: todas.filter((c) => ABIERTOS.indexOf(c.estado) >= 0 && ev(c) !== 'VENCIDA')
        .map((c) => fila(c, 'días hábiles para vencer', habiles(t, fl(c.fecha_vencimiento)))).filter((x) => x.n <= dVen),
      vencidas: todas.filter((c) => ev(c) === 'VENCIDA').map((c) => fila(c, 'días vencida', dias(fl(c.fecha_vencimiento), t))),
      sinenviar: todas.filter((c) => c.estado === 'LISTA_PARA_ENVIO' && ev(c) !== 'VENCIDA').map((c) => fila(c, 'días desde el PDF', dias(fl(c.fecha), t))),
      borradores: todas.filter((c) => c.estado === 'BORRADOR').map((c) => fila(c, 'días en borrador', dias(fl(c.fecha), t)))
    };
    Object.keys(seg).forEach((g) => seg[g].sort((a, b) => (g === 'vencen' ? a.n - b.n : b.n - a.n)));
    // Motivos de pérdida
    const porMotivo = {};
    perdidas.forEach((c) => { const n = C().nombreMotivo(c) || 'Sin motivo'; (porMotivo[n] = porMotivo[n] || []).push(c); });
    const motivos = Object.keys(porMotivo).map((n) => ({ nombre: n, n: porMotivo[n].length, valor: suma(porMotivo[n]) })).sort((a, b) => b.valor - a.valor || b.n - a.n);
    const comentarios = perdidas.map((c) => ({ c, motivo: C().nombreMotivo(c) || 'Sin motivo', comentario: c.comentario_perdida || ((String(c.observaciones_internas || '').match(/Perdida: ([^\n]*?)(?: \([A-Z]{2,4}, \d{4}-\d{2}-\d{2}\))?$/m) || [])[1] || '') }))
      .sort((a, b) => fl(b.c.fecha_cierre).localeCompare(fl(a.c.fecha_cierre)));
    // Comerciales
    const ids = Array.from(new Set(todas.map((c) => c.comercial_id)));
    const comerciales = ids.map((id) => {
      const de = (xs) => xs.filter((c) => c.comercial_id === id);
      const g = de(ganadas), p = de(perdidas), e = de(emitidas), a = de(abiertas);
      return { id, nombre: nombreUsuario(id), ini: inicialesUsuario(id), nE: e.length, vE: suma(e), nG: g.length, vG: suma(g), nP: p.length,
        tasa: pct(g.length, g.length + p.length), ticket: g.length ? suma(g) / g.length : null, diasCierre: diasCierre(g), vA: suma(a), nA: a.length };
    }).filter((x) => x.nE || x.nG || x.nP || x.nA).sort((a, b) => b.vG - a.vG || b.vE - a.vE);
    return { d, h, etiqueta, k, embudo, seg, dSeg, dVen, motivos, comentarios, comerciales, sinTrm, sinLinea: filtro.linea ? 0 : todas.filter((c) => !c.linea_negocio && c.estado !== 'BORRADOR').length };
  }

  // =====================================================================
  // VISTA
  // =====================================================================
  App.vistas['tablero'] = async function (c) {
    c.innerHTML = '<div class="ic-form" style="text-align:center"><div class="ic-spinner"></div>Cargando el tablero…</div>';
    try { await C().cargar(); } catch (e) {
      c.innerHTML = '<a href="#" class="ic-volver">← Menú principal</a><div class="ic-form"><b>No se pudo cargar la información.</b><p>' + esc(U.mensajeError(e)) + '</p><button class="ic-btn" onclick="location.reload()">Reintentar</button></div>'; return;
    }
    const adm = App.usuario.es_admin;
    const comerciales = (App.usuarios || []).filter((u) => D().cotizaciones.some((x) => x.comercial_id === u.Title)).sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
    c.innerHTML = '<a href="#" class="ic-volver">← Menú principal</a>' +
      '<div class="ic-tab-cab"><div><h1 class="ic-titulo">Tablero comercial</h1><p class="ic-subtitulo" id="tSub"></p></div><button class="ic-btn sec" id="btnXls">Exportar a Excel</button></div>' +
      '<div class="ic-filtros">' +
        '<div class="ic-chips" id="fPer">' + [['mes', 'Este mes'], ['mesant', 'Mes anterior'], ['trim', 'Últimos 3 meses'], ['anio', 'Este año'], ['rango', 'Otro rango']].map((p) => '<button data-p="' + p[0] + '">' + p[1] + '</button>').join('') + '</div>' +
        '<span id="fRango" hidden><input type="date" id="fDesde"> a <input type="date" id="fHasta"></span>' +
        (adm ? '<select id="fCom"><option value="">Todos los comerciales</option>' + comerciales.map((u) => '<option value="' + esc(u.Title) + '">' + esc(u.nombre) + '</option>').join('') + '</select>' : '') +
        '<select id="fLin"><option value="">Todas las líneas de negocio</option>' + C().LINEAS.map((l) => '<option value="' + l[0] + '">' + esc(l[1]) + '</option>').join('') + '</select>' +
      '</div><div id="tCuerpo"></div>';
    const marcar = () => { c.querySelectorAll('#fPer button').forEach((b) => b.classList.toggle('activo', b.dataset.p === filtro.periodo)); U.$('#fRango', c).hidden = filtro.periodo !== 'rango'; };
    c.querySelectorAll('#fPer button').forEach((b) => { b.onclick = () => { filtro.periodo = b.dataset.p; marcar(); pintar(c); }; });
    const [d0, h0] = rango(); U.$('#fDesde', c).value = filtro.desde || d0; U.$('#fHasta', c).value = filtro.hasta || h0;
    U.$('#fDesde', c).onchange = (e) => { filtro.desde = e.target.value; pintar(c); };
    U.$('#fHasta', c).onchange = (e) => { filtro.hasta = e.target.value; pintar(c); };
    if (adm) { U.$('#fCom', c).value = filtro.comercial; U.$('#fCom', c).onchange = (e) => { filtro.comercial = e.target.value; pintar(c); }; }
    U.$('#fLin', c).value = filtro.linea; U.$('#fLin', c).onchange = (e) => { filtro.linea = e.target.value; pintar(c); };
    U.$('#btnXls', c).onclick = (ev) => exportar(ev.target);
    marcar(); pintar(c);
  };

  // Barra horizontal (un solo color: la longitud es el dato; el número va escrito al lado)
  const barra = (v, max, tip) => '<div class="ic-hbar" title="' + esc(tip) + '"><span style="width:' + (max > 0 ? Math.max(v > 0 ? 2 : 0, Math.round(v / max * 100)) : 0) + '%"></span></div>';
  const enlace = (c) => '<a href="#cotizaciones/' + esc(c.Title) + '"><b>' + esc(c.numero_visible) + '</b></a>';

  function pintar(c) {
    const R = calcular(), k = R.k, adm = App.usuario.es_admin;
    U.$('#tSub', c).textContent = (adm ? (filtro.comercial ? nombreUsuario(filtro.comercial) : 'Todo el equipo') : 'Sus cotizaciones') + ' · ' + R.etiqueta + ' · valores antes de IVA';
    const avisos = [];
    if (R.sinTrm.length) avisos.push(R.sinTrm.length + ' cotización(es) en dólares sin TRM no suman en pesos: ' + R.sinTrm.slice(0, 5).map((x) => x.numero_visible).join(', ') + '.');
    if (R.sinLinea && !filtro.linea) avisos.push(R.sinLinea + ' cotización(es) no tienen línea de negocio guardada (son anteriores a esta versión): no aparecen al filtrar por línea.');
    const kpi = (v, et, sub) => '<div class="ic-kpi"><div class="valor">' + v + '</div><div class="etiqueta">' + et + '</div>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>';
    const maxE = Math.max.apply(null, R.embudo.map((x) => x.valor).concat([0]));
    const maxM = Math.max.apply(null, R.motivos.map((x) => x.valor).concat([0]));
    const GRUPOS = [['sinrespuesta', 'Sin respuesta', 'Enviadas o en negociación con ' + R.dSeg + ' o más días hábiles desde el envío. Llame o escriba al cliente.'],
      ['vencen', 'Vencen pronto', 'Abiertas que vencen en ' + R.dVen + ' días hábiles o menos.'],
      ['vencidas', 'Vencidas', 'Pasó la fecha de validez sin cierre. Márquela como ganada o perdida, o haga una revisión con fechas nuevas.'],
      ['sinenviar', 'Listas sin enviar', 'Tienen PDF pero no se han marcado como enviadas.'],
      ['borradores', 'Borradores', 'Cotizaciones sin terminar.']];
    const g = GRUPOS.find((x) => x[0] === filtro.grupo) || GRUPOS[0], filas = R.seg[g[0]];

    U.$('#tCuerpo', c).innerHTML =
      (avisos.length ? '<div class="ic-alerta chica" style="margin-bottom:12px">' + avisos.map(esc).join('<br>') + '</div>' : '') +
      // 1. Indicadores
      '<div class="ic-kpis ic-kpis-6">' +
        kpi(corto(k.cotizado), 'Cotizado', k.nEmitidas + ' cotizaciones') +
        kpi(corto(k.ganado), 'Ganado', k.nGanadas + (k.nGanadas === 1 ? ' ganada' : ' ganadas')) +
        kpi(k.tasa, 'Tasa de cierre', k.nGanadas + ' de ' + (k.nGanadas + k.nPerdidas) + ' cerradas · ' + k.tasaValor + ' en valor') +
        kpi(corto(k.abierto), 'Abierto hoy', k.nAbiertas + ' en curso') +
        kpi(k.ticket === null ? '—' : corto(k.ticket), 'Ticket promedio', 'de las ganadas') +
        kpi(k.diasCierre === null ? '—' : k.diasCierre + ' días', 'Tiempo de cierre', 'del envío a ganada') +
      '</div>' +
      '<div class="ic-tab-grid">' +
      // 2. Embudo
      '<div class="ic-bloque"><div class="cab"><h2>Embudo del periodo</h2><span class="ic-conteo">' + k.nEmitidas + ' emitidas · estado de hoy</span></div><div class="cuerpo">' +
        (!k.nEmitidas ? '<div class="ic-vacio">No hay cotizaciones emitidas en el periodo.</div>' :
        '<table class="ic-tabla ic-tabla-barras"><thead><tr><th>Estado</th><th style="text-align:right">Cant.</th><th style="width:40%"></th><th style="text-align:right">Valor</th></tr></thead><tbody>' +
        R.embudo.map((x) => '<tr style="cursor:default"><td>' + esc(x.nombre) + '</td><td style="text-align:right">' + x.n + '</td><td>' + barra(x.valor, maxE, x.nombre + ': ' + x.n + ' · ' + cop(x.valor)) + '</td><td style="text-align:right;white-space:nowrap">' + corto(x.valor) + '</td></tr>').join('') +
        '</tbody></table>') + '</div></div>' +
      // 4. Motivos
      '<div class="ic-bloque"><div class="cab"><h2>Motivos de pérdida</h2><span class="ic-conteo">' + k.nPerdidas + ' perdidas · ' + corto(k.perdido) + '</span></div><div class="cuerpo">' +
        (!R.motivos.length ? '<div class="ic-vacio">No hay cotizaciones perdidas en el periodo.</div>' :
        '<table class="ic-tabla ic-tabla-barras"><thead><tr><th>Motivo</th><th style="text-align:right">Cant.</th><th style="width:40%"></th><th style="text-align:right">Valor</th></tr></thead><tbody>' +
        R.motivos.map((x) => '<tr style="cursor:default"><td>' + esc(x.nombre) + '</td><td style="text-align:right;white-space:nowrap">' + x.n + ' <span class="sec" style="display:inline">(' + pct(x.n, k.nPerdidas) + ')</span></td><td>' + barra(x.valor, maxM, x.nombre + ': ' + x.n + ' · ' + cop(x.valor)) + '</td><td style="text-align:right;white-space:nowrap">' + corto(x.valor) + '</td></tr>').join('') +
        '</tbody></table>' +
        (R.comentarios.some((x) => x.comentario) ? '<details class="ic-comentarios"><summary>Ver comentarios (' + R.comentarios.filter((x) => x.comentario).length + ')</summary>' +
          R.comentarios.filter((x) => x.comentario).map((x) => '<p>' + enlace(x.c) + ' · ' + esc(x.c.cliente_razon_social) + ' · <b>' + esc(x.motivo) + '</b><br><span>' + esc(x.comentario) + '</span></p>').join('') + '</details>' : '')) +
      '</div></div></div>' +
      // 3. Seguimiento
      '<div class="ic-bloque" style="margin-top:16px"><div class="cab"><h2>Seguimiento pendiente · hoy</h2><span class="ic-conteo">No depende del periodo</span></div><div class="cuerpo">' +
        '<div class="ic-chips ic-chips-seg" id="fGrupo">' + GRUPOS.map((x) => '<button data-g="' + x[0] + '" class="' + (x[0] === g[0] ? 'activo' : '') + '">' + x[1] + ' <b class="ic-num' + (R.seg[x[0]].length ? '' : ' cero') + '">' + R.seg[x[0]].length + '</b></button>').join('') + '</div>' +
        '<p class="ic-conteo" style="margin:10px 0">' + esc(g[2]) + '</p>' +
        (!filas.length ? '<div class="ic-vacio">Nada pendiente aquí.</div>' :
        '<div class="ic-tabla-caja"><table class="ic-tabla"><thead><tr><th>Número</th><th>Cliente</th>' + (adm ? '<th class="ocultar-movil">Comercial</th>' : '') + '<th class="ocultar-movil">Vence</th><th style="text-align:right">Valor</th><th style="text-align:right">' + esc(filas[0].txt.charAt(0).toUpperCase() + filas[0].txt.slice(1)) + '</th></tr></thead><tbody>' +
        filas.map((x) => '<tr data-id="' + esc(x.c.Title) + '"><td>' + enlace(x.c) + '<span class="sec">' + esc((C().ESTADOS[C().estadoVisible(x.c)] || [x.c.estado])[0]) + '</span></td><td>' + esc(x.c.cliente_razon_social) + '<span class="sec">' + esc(x.c.contacto_nombre || '') + (x.c.contacto_telefono ? ' · ' + esc(x.c.contacto_telefono) : '') + '</span></td>' +
          (adm ? '<td class="ocultar-movil">' + esc(inicialesUsuario(x.c.comercial_id) || nombreUsuario(x.c.comercial_id)) + '</td>' : '') + '<td class="ocultar-movil">' + fechaC(fl(x.c.fecha_vencimiento)) + '</td>' +
          '<td style="text-align:right;white-space:nowrap">' + (valor(x.c) === null ? 'US$ sin TRM' : corto(valor(x.c))) + '</td><td style="text-align:right"><b>' + x.n + '</b></td></tr>').join('') + '</tbody></table></div>') +
      '</div></div>' +
      // 5. Comerciales
      '<div class="ic-bloque" style="margin-top:16px"><div class="cab"><h2>' + (adm ? 'Comerciales' : 'Su resumen') + '</h2><span class="ic-conteo">' + esc(R.etiqueta) + '</span></div><div class="cuerpo" style="padding:0;overflow-x:auto">' +
        (!R.comerciales.length ? '<div class="ic-vacio" style="margin:14px">Sin movimiento.</div>' :
        '<table class="ic-tabla"><thead><tr><th>Comercial</th><th style="text-align:right">Cotizado</th><th style="text-align:right">Ganado</th><th style="text-align:right">Perdidas</th><th style="text-align:right">Tasa de cierre</th><th style="text-align:right" class="ocultar-movil">Ticket prom.</th><th style="text-align:right" class="ocultar-movil">Días de cierre</th><th style="text-align:right">Abierto hoy</th></tr></thead><tbody>' +
        R.comerciales.map((x) => '<tr style="cursor:default"><td><b>' + esc(x.nombre) + '</b><span class="sec">' + esc(x.ini || '') + '</span></td>' +
          '<td style="text-align:right">' + corto(x.vE) + '<span class="sec">' + x.nE + '</span></td><td style="text-align:right">' + corto(x.vG) + '<span class="sec">' + x.nG + '</span></td>' +
          '<td style="text-align:right">' + x.nP + '</td><td style="text-align:right"><b>' + x.tasa + '</b></td><td style="text-align:right" class="ocultar-movil">' + (x.ticket === null ? '—' : corto(x.ticket)) + '</td>' +
          '<td style="text-align:right" class="ocultar-movil">' + (x.diasCierre === null ? '—' : x.diasCierre) + '</td><td style="text-align:right">' + corto(x.vA) + '<span class="sec">' + x.nA + '</span></td></tr>').join('') +
        (R.comerciales.length > 1 ? '<tr class="total" style="cursor:default"><td><b>Total</b></td><td style="text-align:right"><b>' + corto(k.cotizado) + '</b></td><td style="text-align:right"><b>' + corto(k.ganado) + '</b></td><td style="text-align:right"><b>' + k.nPerdidas + '</b></td><td style="text-align:right"><b>' + k.tasa + '</b></td><td class="ocultar-movil" style="text-align:right">' + (k.ticket === null ? '—' : corto(k.ticket)) + '</td><td class="ocultar-movil" style="text-align:right">' + (k.diasCierre === null ? '—' : k.diasCierre) + '</td><td style="text-align:right"><b>' + corto(k.abierto) + '</b></td></tr>' : '') +
        '</tbody></table>') + '</div></div>' +
      '<p class="ic-conteo" style="margin-top:12px">Cotizado: cotizaciones con PDF cuya fecha cae en el periodo. Ganado y perdido: según la fecha de cierre. Tasa de cierre = ganadas ÷ (ganadas + perdidas). No cuentan borradores, anuladas ni versiones reemplazadas por una revisión. Valores antes de IVA; las cotizaciones en dólares se pasan a pesos con su TRM.</p>';

    c.querySelectorAll('#fGrupo button').forEach((b) => { b.onclick = () => { filtro.grupo = b.dataset.g; pintar(c); }; });
    c.querySelectorAll('#tCuerpo tr[data-id]').forEach((tr) => { tr.onclick = (e) => { if (e.target.closest('a')) return; location.hash = '#cotizaciones/' + tr.dataset.id; }; });
  }

  // =====================================================================
  // EXPORTAR A EXCEL (una hoja por reporte)
  // =====================================================================
  async function exportar(boton) {
    const txt = boton.textContent; boton.disabled = true; boton.textContent = 'Generando…';
    try {
      if (!window.ExcelJS) await new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js'; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar el generador de Excel. Revise su conexión.')); document.head.appendChild(s); });
      const R = calcular(), k = R.k, adm = App.usuario.es_admin;
      const wb = new ExcelJS.Workbook(); wb.creator = 'Microapp Comercial · Ideas Control'; wb.created = new Date();
      const AZUL = 'FF0E76BC', MON = '"$" #,##0';
      const hoja = (nombre, titulo, cols) => {
        const ws = wb.addWorksheet(nombre, { views: [{ state: 'frozen', ySplit: 4 }], pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 1 } });
        ws.getCell('A1').value = titulo; ws.getCell('A1').font = { bold: true, size: 14, color: { argb: AZUL } };
        ws.getCell('A2').value = (adm ? (filtro.comercial ? nombreUsuario(filtro.comercial) : 'Todo el equipo') : nombreUsuario(App.usuario.usuario_id)) + ' · ' + R.etiqueta + (filtro.linea ? ' · ' + (C().LINEAS.find((l) => l[0] === filtro.linea) || [0, filtro.linea])[1] : '') + ' · valores antes de IVA · generado ' + U.fmt.fecha(new Date().toISOString());
        ws.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FF5B6770' } };
        ws.columns = cols.map((x) => ({ key: x[0], width: x[2] || 14, style: x[3] ? { numFmt: x[3] } : {} }));
        const r = ws.getRow(4); cols.forEach((x, i) => { const cl = r.getCell(i + 1); cl.value = x[1]; cl.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } }; cl.alignment = { vertical: 'middle', wrapText: true }; });
        r.height = 20; ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: cols.length } };
        return ws;
      };
      const agregar = (ws, filas) => filas.forEach((f) => ws.addRow(f));
      // Resumen
      const r1 = hoja('Resumen', 'Tablero comercial · Resumen', [['i', 'Indicador', 28], ['v', 'Valor', 18], ['n', 'Detalle', 46]]);
      agregar(r1, [{ i: 'Cotizado', v: k.cotizado, n: k.nEmitidas + ' cotizaciones' }, { i: 'Ganado', v: k.ganado, n: k.nGanadas + ' ganadas' }, { i: 'Perdido', v: k.perdido, n: k.nPerdidas + ' perdidas' },
        { i: 'Tasa de cierre', v: k.tasa, n: 'Ganadas ÷ (ganadas + perdidas) · ' + k.tasaValor + ' en valor' }, { i: 'Abierto hoy', v: k.abierto, n: k.nAbiertas + ' en curso' },
        { i: 'Ticket promedio', v: k.ticket, n: 'De las ganadas' }, { i: 'Tiempo de cierre (días)', v: k.diasCierre, n: 'Del envío a ganada' }]);
      [5, 6, 7, 9, 10].forEach((n) => { r1.getCell('B' + n).numFmt = MON; });
      // Embudo
      const r2 = hoja('Embudo', 'Embudo del periodo (estado de hoy)', [['e', 'Estado', 24], ['n', 'Cantidad', 12], ['v', 'Valor', 18, MON]]);
      agregar(r2, R.embudo.map((x) => ({ e: x.nombre, n: x.n, v: x.valor })));
      // Seguimiento
      const NOMBRES = { sinrespuesta: 'Sin respuesta', vencen: 'Vence pronto', vencidas: 'Vencida', sinenviar: 'Lista sin enviar', borradores: 'Borrador' };
      const r3 = hoja('Seguimiento', 'Seguimiento pendiente (hoy)', [['g', 'Alerta', 16], ['num', 'Número', 18], ['cli', 'Cliente', 34], ['con', 'Contacto', 24], ['tel', 'Teléfono', 18], ['com', 'Comercial', 20], ['ven', 'Vence', 12], ['v', 'Valor', 16, MON], ['d', 'Días', 8], ['que', 'Qué cuentan los días', 28]]);
      Object.keys(R.seg).forEach((g) => agregar(r3, R.seg[g].map((x) => ({ g: NOMBRES[g], num: x.c.numero_visible, cli: x.c.cliente_razon_social, con: x.c.contacto_nombre, tel: x.c.contacto_telefono, com: nombreUsuario(x.c.comercial_id), ven: fl(x.c.fecha_vencimiento) ? new Date(fl(x.c.fecha_vencimiento) + 'T12:00:00') : null, v: valor(x.c), d: x.n, que: x.txt }))));
      r3.getColumn('ven').numFmt = 'dd/mm/yyyy';
      // Motivos
      const r4 = hoja('Motivos de pérdida', 'Motivos de pérdida', [['m', 'Motivo', 30], ['n', 'Cantidad', 12], ['v', 'Valor', 18, MON], ['num', 'Número', 18], ['cli', 'Cliente', 32], ['f', 'Cierre', 12], ['com', 'Comentario', 60]]);
      agregar(r4, R.motivos.map((x) => ({ m: x.nombre, n: x.n, v: x.valor })));
      r4.addRow({}); const rr = r4.addRow({ m: 'Detalle' }); rr.font = { bold: true };
      agregar(r4, R.comentarios.map((x) => ({ m: x.motivo, v: valor(x.c), num: x.c.numero_visible, cli: x.c.cliente_razon_social, f: new Date(fl(x.c.fecha_cierre) + 'T12:00:00'), com: x.comentario })));
      r4.getColumn('f').numFmt = 'dd/mm/yyyy'; r4.getColumn('com').alignment = { wrapText: true, vertical: 'top' };
      // Comerciales
      const r5 = hoja('Comerciales', 'Resumen por comercial', [['c', 'Comercial', 26], ['nE', 'Cotizaciones', 12], ['vE', 'Cotizado', 16, MON], ['nG', 'Ganadas', 10], ['vG', 'Ganado', 16, MON], ['nP', 'Perdidas', 10], ['t', 'Tasa de cierre', 12], ['tk', 'Ticket prom.', 16, MON], ['dc', 'Días de cierre', 12], ['nA', 'Abiertas', 10], ['vA', 'Abierto hoy', 16, MON]]);
      agregar(r5, R.comerciales.map((x) => ({ c: x.nombre, nE: x.nE, vE: x.vE, nG: x.nG, vG: x.vG, nP: x.nP, t: x.tasa, tk: x.ticket, dc: x.diasCierre, nA: x.nA, vA: x.vA })));
      const buf = await wb.xlsx.writeBuffer();
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      a.download = 'Tablero_Comercial_' + R.d + '_a_' + R.h + '.xlsx'; document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); }
    finally { boton.disabled = false; boton.textContent = txt; }
  }

  App.reportes = { calcular, filtro, habiles };   // para pruebas
})();
