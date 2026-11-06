/* =====================================================================
   APP-106 · Programación — Resumen ejecutivo de instalaciones  (#resumen)
   Para Dirección (ADMIN), programadores (EDITOR) y consulta (CONSULTA); los técnicos no lo ven.
   - Indicadores del periodo vs. el periodo anterior de igual duración.
   - Instalaciones (tipo INS) por técnico, cliente, ciudad y semana; motivos de reprogramación y cancelación.
   - Resto de la operación (mantenimiento, soporte, implementación…), sin oficina ni ausencias.
   - Alertas: instalaciones con fecha pasada sin cerrar (siguen Programadas o Confirmadas).
   - Análisis con Claude: copiar prompt, pegar la respuesta; queda guardado en SharePoint
     (Documentos/Operaciones/Informes/Analisis_Operaciones_<desde>_<hasta>.json).
   ===================================================================== */
(function () {
  const U = IC.ui, esc = U.esc, G = IC.graph;
  const INS = 'INS', FUERA = ['OFI', 'AUS'];
  const ST = { desde: '', hasta: '', analisis: {} };
  const num = (v) => Math.round(Number(v) || 0).toLocaleString('es-CO');
  const pct = (v) => (v === null || v === undefined || !isFinite(v)) ? '—' : Math.round(v * 100).toLocaleString('es-CO') + ' %';
  const eq = (a) => Number(a.equipos) || 0;
  const RUTA = (d, h) => 'Operaciones/Informes/Analisis_Operaciones_' + d + '_' + h + '.json';
  const rutaUrl = (r) => r.split('/').map(encodeURIComponent).join('/');

  function presets() {
    const h = Ope.hoy(), [y, m] = h.split('-').map(Number), p = Ope.pad;
    const mesAnt = m === 1 ? [y - 1, 12] : [y, m - 1];
    const q0 = Math.floor((m - 1) / 3) * 3 + 1;
    return [
      ['Este mes', y + '-' + p(m) + '-01', Ope.finDeMes(y, m)],
      ['Mes anterior', mesAnt[0] + '-' + p(mesAnt[1]) + '-01', Ope.finDeMes(mesAnt[0], mesAnt[1])],
      ['Este trimestre', y + '-' + p(q0) + '-01', Ope.finDeMes(y, q0 + 2)],
      ['Este año', y + '-01-01', y + '-12-31']
    ];
  }

  // ---------- cálculos ----------
  function medir(acts, hoy) {
    const ins = acts.filter((a) => a.tipo === INS);
    const vig = ins.filter(Ope.activa);                                   // sin canceladas ni reprogramadas
    const vencidas = vig.filter((a) => a.fecha <= hoy);                   // ya debieron hacerse
    const ejec = vig.filter((a) => a.estado === 'EJECUTADO');
    const sinCierre = vencidas.filter((a) => a.estado !== 'EJECUTADO' && a.fecha < hoy);
    return {
      ins, vig, ejec, sinCierre,
      programadas: vig.length, vencidas: vencidas.length, ejecutadas: ejec.length, proximas: vig.filter((a) => a.fecha > hoy).length,
      cumplimiento: vencidas.length ? ejec.length / vencidas.length : null,
      equiposProg: vig.reduce((s, a) => s + eq(a), 0), equiposEjec: ejec.reduce((s, a) => s + eq(a), 0),
      reprogramadas: ins.filter((a) => a.estado === 'REPROGRAMADO').length, canceladas: ins.filter((a) => a.estado === 'CANCELADO').length,
      clientes: new Set(vig.map((a) => String(a.cliente || '').trim().toUpperCase()).filter(Boolean)).size,
      ciudades: new Set(vig.map((a) => String(a.ciudad || '').trim().toUpperCase()).filter(Boolean)).size
    };
  }
  function agrupar(lista, clave) {
    const g = {};
    lista.forEach((a) => { const k = clave(a) || '—'; (g[k] = g[k] || []).push(a); });
    return Object.keys(g).map((k) => ({ k, a: g[k] }));
  }
  function datos(acts, actsAnt, hoy) {
    const R = medir(acts, hoy), A = medir(actsAnt, hoy);
    const porTec = agrupar(R.vig, (a) => a.tecnico_id).map((x) => {
      const ej = x.a.filter((a) => a.estado === 'EJECUTADO'), ven = x.a.filter((a) => a.fecha <= hoy);
      return { nombre: Ope.nombreTec(x.k), n: x.a.length, ejec: ej.length, equipos: x.a.reduce((s, a) => s + eq(a), 0), cumpl: ven.length ? ej.length / ven.length : null,
        repro: R.ins.filter((a) => a.tecnico_id === x.k && a.estado === 'REPROGRAMADO').length };
    }).sort((a, b) => b.n - a.n);
    const porCli = agrupar(R.vig, (a) => String(a.cliente || '').trim().toUpperCase()).map((x) => ({ nombre: x.k, n: x.a.length, equipos: x.a.reduce((s, a) => s + eq(a), 0),
      ciudades: Array.from(new Set(x.a.map((a) => a.ciudad).filter(Boolean))).join(', '), ejec: x.a.filter((a) => a.estado === 'EJECUTADO').length })).sort((a, b) => b.equipos - a.equipos || b.n - a.n);
    const porCiu = agrupar(R.vig, (a) => String(a.ciudad || '').trim()).map((x) => ({ nombre: x.k, n: x.a.length, equipos: x.a.reduce((s, a) => s + eq(a), 0) })).sort((a, b) => b.n - a.n);
    const porSem = agrupar(R.vig, (a) => Ope.lunesDe(a.fecha)).map((x) => ({ semana: x.k, n: x.a.length, equipos: x.a.reduce((s, a) => s + eq(a), 0), ejec: x.a.filter((a) => a.estado === 'EJECUTADO').length })).sort((a, b) => a.semana.localeCompare(b.semana));
    const motivos = agrupar(R.ins.filter((a) => a.estado === 'REPROGRAMADO' || a.estado === 'CANCELADO'), (a) => String(a.motivo_cambio || '').trim() || 'Sin motivo registrado')
      .map((x) => ({ motivo: x.k, repro: x.a.filter((a) => a.estado === 'REPROGRAMADO').length, canc: x.a.filter((a) => a.estado === 'CANCELADO').length })).sort((a, b) => (b.repro + b.canc) - (a.repro + a.canc));
    const otras = acts.filter((a) => a.tipo !== INS && FUERA.indexOf(a.tipo) < 0);
    const mezcla = agrupar(otras.filter(Ope.activa), (a) => a.tipo).map((x) => ({ tipo: x.k, nombre: Ope.nombreTipo(x.k), n: x.a.length, ejec: x.a.filter((a) => a.estado === 'EJECUTADO').length,
      equipos: Ope.usaEquipos(x.k) ? x.a.reduce((s, a) => s + eq(a), 0) : null })).sort((a, b) => b.n - a.n);
    return { R, A, porTec, porCli, porCiu, porSem, motivos, mezcla };
  }

  // ---------- vista ----------
  App.vistas.resumen = async function (c) {
    if (App.usuario.rol === 'TECNICO') { location.hash = ''; return; }
    if (!ST.desde) { const p = presets()[0]; ST.desde = p[1]; ST.hasta = p[2]; }
    c.innerHTML = '<a class="ic-volver ope-noimp" href="#">← Menú principal</a>' +
      '<div class="ope-res-cab"><div><h1 class="ic-titulo">Resumen ejecutivo de instalaciones</h1><p class="ic-subtitulo" id="rsPer"></p></div>' +
      '<div class="ope-res-ctl ope-noimp"><div class="ope-res-pre">' + presets().map((p, i) => '<button class="ic-btn sec chico" data-pre="' + i + '">' + esc(p[0]) + '</button>').join('') + '</div>' +
      '<label>Desde <input type="date" id="rsD" value="' + ST.desde + '"></label><label>Hasta <input type="date" id="rsH" value="' + ST.hasta + '"></label>' +
      '<button class="ic-btn sec chico" id="rsImp">Imprimir / PDF</button></div></div><div id="rsCuerpo"><div class="ic-vacio">Cargando…</div></div>';
    c.querySelectorAll('[data-pre]').forEach((b) => { b.onclick = () => { const p = presets()[+b.dataset.pre]; ST.desde = p[1]; ST.hasta = p[2]; c.querySelector('#rsD').value = ST.desde; c.querySelector('#rsH').value = ST.hasta; pintar(); }; });
    c.querySelector('#rsD').onchange = (e) => { if (e.target.value) { ST.desde = e.target.value; pintar(); } };
    c.querySelector('#rsH').onchange = (e) => { if (e.target.value) { ST.hasta = e.target.value; pintar(); } };
    c.querySelector('#rsImp').onclick = () => window.print();

    async function pintar() {
      const cu = c.querySelector('#rsCuerpo');
      if (ST.hasta < ST.desde) { cu.innerHTML = '<div class="ic-alerta">La fecha «Hasta» es anterior a «Desde».</div>'; return; }
      const dias = Math.round((Ope.aFecha(ST.hasta) - Ope.aFecha(ST.desde)) / 864e5) + 1;
      const aD = Ope.sumar(ST.desde, -dias), aH = Ope.sumar(ST.desde, -1), hoy = Ope.hoy();
      c.querySelector('#rsPer').textContent = 'Ideas Control · ' + Ope.textoFecha(ST.desde) + ' al ' + Ope.textoFecha(ST.hasta) + ' · comparado con ' + Ope.textoFecha(aD) + ' al ' + Ope.textoFecha(aH);
      cu.innerHTML = '<div class="ic-vacio">Cargando…</div>';
      try { await Ope.cargarRango(aD, ST.hasta); } catch (e) { cu.innerHTML = '<div class="ic-alerta">No se pudo leer la programación: ' + esc(U.mensajeError(e)) + '</div>'; return; }
      const d = datos(Ope.delRango(ST.desde, ST.hasta), Ope.delRango(aD, aH), hoy);
      ST.d = Object.assign({ desde: ST.desde, hasta: ST.hasta, aD, aH, hoy }, d);
      const R = d.R, A = d.A;
      const vari = (x, y) => { if (!y) return x ? '<span class="ope-var">nuevo</span>' : ''; const v = (x - y) / y; return '<span class="ope-var ' + (v >= 0 ? 'sube' : 'baja') + '">' + (v >= 0 ? '▲ ' : '▼ ') + Math.abs(Math.round(v * 100)) + ' %</span>'; };
      const kpi = (v, l, s, cmp) => '<div class="ic-kpi"><div class="valor">' + v + '</div><div class="etiqueta">' + l + '</div>' + (s ? '<div class="ope-sub">' + s + '</div>' : '') + (cmp !== undefined ? '<div class="ope-sub">' + cmp + '</div>' : '') + '</div>';
      const barra = (v, max, txt) => '<div class="ope-barra"><i style="width:' + Math.max(2, Math.round(100 * v / (max || 1))) + '%"></i><span>' + txt + '</span></div>';
      const maxSem = Math.max(1, ...d.porSem.map((s) => s.equipos || s.n));
      if (!R.ins.length && !d.mezcla.length) { cu.innerHTML = '<div class="ic-tabla-caja"><div class="ic-vacio">No hay actividades registradas en el periodo.</div></div>'; return; }
      cu.innerHTML =
        '<div class="ic-kpis">' +
          kpi(num(R.programadas), 'Instalaciones programadas', R.proximas ? num(R.proximas) + ' todavía por venir' : 'Todas con fecha cumplida', vari(R.programadas, A.programadas) + ' vs. ' + num(A.programadas)) +
          kpi(num(R.ejecutadas), 'Instalaciones ejecutadas', 'Cumplimiento: ' + pct(R.cumplimiento) + ' de las ' + num(R.vencidas) + ' con fecha cumplida', vari(R.ejecutadas, A.ejecutadas) + ' vs. ' + num(A.ejecutadas)) +
          kpi(num(R.equiposEjec) + ' <small>/ ' + num(R.equiposProg) + '</small>', 'Equipos instalados / programados', R.programadas ? 'Promedio ' + (Math.round(R.equiposProg / R.programadas * 10) / 10).toLocaleString('es-CO') + ' equipos por visita' : '', vari(R.equiposProg, A.equiposProg) + ' vs. ' + num(A.equiposProg) + ' programados') +
          kpi(num(R.clientes), 'Clientes atendidos', num(R.ciudades) + ' ciudad(es)', vari(R.clientes, A.clientes) + ' vs. ' + num(A.clientes)) +
        '</div><div class="ic-kpis" style="margin-top:14px">' +
          kpi(num(R.reprogramadas), 'Reprogramaciones', R.ins.length ? 'Tasa: ' + pct(R.reprogramadas / R.ins.length) + ' de las instalaciones' : '', vari(R.reprogramadas, A.reprogramadas) + ' vs. ' + num(A.reprogramadas)) +
          kpi(num(R.canceladas), 'Cancelaciones', '', vari(R.canceladas, A.canceladas) + ' vs. ' + num(A.canceladas)) +
          kpi('<span class="' + (R.sinCierre.length ? 'ope-rojo' : '') + '">' + num(R.sinCierre.length) + '</span>', 'Sin cierre', 'Fecha pasada y siguen Programadas o Confirmadas') +
          kpi(num(d.mezcla.reduce((s, x) => s + x.n, 0)), 'Otras actividades', 'Mantenimiento, soporte, implementación… (sin oficina ni ausencias)') +
        '</div>' +
        (R.sinCierre.length ? '<div class="ope-res-alerta">⚠️ <b>' + R.sinCierre.length + ' instalación(es) ya pasaron y no están marcadas como Ejecutadas.</b> Hasta que se cierren, el cumplimiento se ve más bajo de lo real. Pida a los técnicos registrar lo ejecutado en «Mi agenda» o corríjalas en Actividades.</div>' : '') +
        '<div class="ope-res2">' +
          bloque('Por técnico', d.porTec.length ? tabla(['Técnico', 'Instal.', 'Ejecut.', 'Equipos', 'Cumplim.', 'Reprog.'], d.porTec.map((t) => ['<b>' + esc(t.nombre) + '</b>', num(t.n), num(t.ejec), num(t.equipos), pct(t.cumpl), num(t.repro)]), [0, 1, 1, 1, 1, 1]) : vacio()) +
          bloque('Por semana', d.porSem.length ? d.porSem.map((s) => '<div class="ope-sem"><span>Sem. ' + esc(Ope.textoFecha(s.semana).replace(/ \d{4}$/, '')) + '</span>' + barra(s.equipos || s.n, maxSem, num(s.n) + ' instal. · ' + num(s.equipos) + ' equipos · ' + num(s.ejec) + ' ejecut.') + '</div>').join('') : vacio()) +
        '</div><div class="ope-res2">' +
          bloque('Clientes', d.porCli.length ? tabla(['Cliente', 'Instal.', 'Equipos', 'Ejecut.', 'Ciudad'], d.porCli.slice(0, 15).map((x) => ['<b>' + esc(x.nombre) + '</b>', num(x.n), num(x.equipos), num(x.ejec), esc(x.ciudades || '—')]), [0, 1, 1, 1, 0]) + (d.porCli.length > 15 ? '<p class="ope-nota">y ' + (d.porCli.length - 15) + ' cliente(s) más.</p>' : '') : vacio()) +
          bloque('Ciudades', d.porCiu.length ? tabla(['Ciudad', 'Instal.', 'Equipos'], d.porCiu.map((x) => ['<b>' + esc(x.nombre) + '</b>', num(x.n), num(x.equipos)]), [0, 1, 1]) : vacio()) +
        '</div><div class="ope-res2">' +
          bloque('Motivos de reprogramación y cancelación', d.motivos.length ? tabla(['Motivo', 'Reprog.', 'Cancel.'], d.motivos.map((x) => [esc(x.motivo), num(x.repro), num(x.canc)]), [0, 1, 1]) : '<p class="ope-nota">Sin reprogramaciones ni cancelaciones en el periodo. 👍</p>') +
          bloque('Resto de la operación', d.mezcla.length ? tabla(['Tipo', 'Actividades', 'Ejecut.', 'Equipos'], d.mezcla.map((x) => [App.chipTipo(x.tipo) + ' ' + esc(x.nombre), num(x.n), num(x.ejec), x.equipos === null ? '—' : num(x.equipos)]), [0, 1, 1, 1]) : vacio()) +
        '</div>' +
        (R.sinCierre.length ? bloque('Instalaciones sin cierre', tabla(['Fecha', 'Técnico', 'Cliente', 'Ciudad', 'Equipos', 'Estado'], R.sinCierre.slice().sort((a, b) => a.fecha.localeCompare(b.fecha)).map((a) => [esc(Ope.textoFecha(a.fecha)), esc(Ope.nombreTec(a.tecnico_id)), esc(a.cliente || '—'), esc(a.ciudad || '—'), num(eq(a)), esc(Ope.nombreEstado(a.estado))]), [0, 0, 0, 0, 1, 0]), true) : '') +
        '<div id="rsAn"></div>';
      pintarAnalisis(c.querySelector('#rsAn'));
    }
    pintar();
  };
  const vacio = () => '<p class="ope-nota">Sin datos en el periodo.</p>';
  const bloque = (t, html, ancho) => '<section class="ic-bloque' + (ancho ? ' ope-ancho' : '') + '"><div class="cab"><h2>' + esc(t) + '</h2></div><div class="cuerpo ope-scroll">' + html + '</div></section>';
  function tabla(cab, filas, numericas) {
    return '<table class="ic-tabla ope-rtab"><thead><tr>' + cab.map((h, i) => '<th' + (numericas[i] ? ' class="num"' : '') + '>' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' +
      filas.map((f) => '<tr>' + f.map((v, i) => '<td' + (numericas[i] ? ' class="num"' : '') + '>' + v + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
  }

  // =====================================================================
  // ANÁLISIS CON CLAUDE
  // =====================================================================
  function prompt() {
    const d = ST.d, R = d.R, A = d.A, L = [];
    const T = (x) => 'programadas ' + x.programadas + ' · con fecha cumplida ' + x.vencidas + ' · ejecutadas ' + x.ejecutadas + ' · cumplimiento ' + pct(x.cumplimiento) + ' · equipos programados ' + x.equiposProg +
      ' · equipos instalados ' + x.equiposEjec + ' · reprogramadas ' + x.reprogramadas + ' · canceladas ' + x.canceladas + ' · clientes ' + x.clientes + ' · ciudades ' + x.ciudades + ' · sin cierre ' + x.sinCierre.length;
    L.push('Actúa como gerente de operaciones de servicios técnicos. Analiza la operación de instalaciones de equipos biométricos de Ideas Control Equipos y Soluciones S.A.S. (Colombia) para un resumen ejecutivo a la Gerencia.');
    L.push('', 'Reglas:', '- Usa SOLO los datos de abajo. No inventes cifras ni causas. Si algo no se puede concluir, dilo en "nota_datos".',
      '- Ojo con el cierre: las instalaciones con fecha pasada que siguen «Programadas» o «Confirmadas» pueden estar hechas pero sin registrar; eso baja el cumplimiento. Distingue un problema de ejecución de un problema de registro.',
      '- Compara con el periodo anterior (si tiene pocos datos, la comparación es débil; dilo).',
      '- Política de programación (manual 2506-MAN-OPE): instalaciones preferiblemente lunes, miércoles y viernes; máximo 3 equipos por técnico-día según la distancia.',
      '- Recomendaciones concretas y priorizadas para el próximo periodo. Tono claro, directo, profesional, en español de Colombia.');
    L.push('', '═══ PERIODO: ' + Ope.textoFecha(d.desde) + ' al ' + Ope.textoFecha(d.hasta) + ' (hoy: ' + Ope.textoFecha(d.hoy) + ')');
    L.push('Instalaciones: ' + T(R));
    L.push('Periodo anterior (' + Ope.textoFecha(d.aD) + ' al ' + Ope.textoFecha(d.aH) + '): ' + T(A));
    L.push('', 'Por técnico:', d.porTec.map((t) => '- ' + t.nombre + ': ' + t.n + ' instalaciones · ' + t.ejec + ' ejecutadas · ' + t.equipos + ' equipos · cumplimiento ' + pct(t.cumpl) + ' · reprogramadas ' + t.repro).join('\n') || '- (sin datos)');
    L.push('', 'Por semana:', d.porSem.map((s) => '- semana del ' + s.semana + ': ' + s.n + ' instalaciones · ' + s.equipos + ' equipos · ' + s.ejec + ' ejecutadas').join('\n') || '- (sin datos)');
    L.push('', 'Clientes (por equipos):', d.porCli.slice(0, 25).map((x) => '- ' + x.nombre + ': ' + x.n + ' visitas · ' + x.equipos + ' equipos · ' + x.ejec + ' ejecutadas · ' + (x.ciudades || '—')).join('\n') || '- (sin datos)');
    L.push('', 'Ciudades:', d.porCiu.map((x) => '- ' + x.nombre + ': ' + x.n + ' instalaciones · ' + x.equipos + ' equipos').join('\n') || '- (sin datos)');
    L.push('', 'Motivos de reprogramación/cancelación:', d.motivos.map((x) => '- ' + x.motivo + ': ' + x.repro + ' reprogramadas · ' + x.canc + ' canceladas').join('\n') || '- (ninguno)');
    L.push('', 'Resto de la operación:', d.mezcla.map((x) => '- ' + x.nombre + ': ' + x.n + ' actividades · ' + x.ejec + ' ejecutadas' + (x.equipos !== null ? ' · ' + x.equipos + ' equipos' : '')).join('\n') || '- (sin datos)');
    L.push('', 'Distribución por día de la semana (instalaciones vigentes):', ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((n, i) => n + ' ' + R.vig.filter((a) => Ope.dow(a.fecha) === i + 1).length).join(' · '));
    L.push('', '═══ FORMATO DE RESPUESTA (obligatorio)', 'Responde ÚNICAMENTE con un bloque de código JSON válido, sin texto antes ni después:', '```json', '{',
      '  "tipo": "analisis_operaciones",', '  "titular": "una frase que resuma el periodo",', '  "resumen": ["párrafo 1 con las cifras clave", "párrafo 2: comparación y cierre"],',
      '  "destacados": [ { "titulo": "", "detalle": "" } ],', '  "alertas": [ { "titulo": "", "detalle": "" } ],',
      '  "recomendaciones": [ { "accion": "", "por_que": "", "responsable": "Programación | Técnicos | Comercial | Dirección", "prioridad": "Alta | Media | Baja" } ],',
      '  "nota_datos": "limitaciones de los datos"', '}', '```', 'Escapa las comillas dobles dentro del texto como \\".');
    return L.join('\n');
  }
  async function leerGuardado(d, h) {
    const k = d + '_' + h; if (k in ST.analisis) return ST.analisis[k];
    try {
      const sid = await G.sitio(CFG.sitio.host, CFG.sitio.ruta);
      const meta = await G.llamar('GET', '/sites/' + sid + '/drive/root:/' + rutaUrl(RUTA(d, h)));
      const r = await fetch(meta['@microsoft.graph.downloadUrl']); if (!r.ok) throw new Error('descarga');
      ST.analisis[k] = await r.json();
    } catch (e) { ST.analisis[k] = null; }
    return ST.analisis[k];
  }
  function extraer(txt) {
    let s = String(txt || '').trim();
    const f = s.match(/```(?:json)?\s*([\s\S]*?)```/i); if (f) s = f[1].trim();
    const a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a < 0 || b <= a) throw new Error('No encontré el bloque JSON. Copie la respuesta completa de Claude (botón «Copiar» del bloque de código).');
    let d; try { d = JSON.parse(s.slice(a, b + 1)); } catch (e) { try { d = JSON.parse(s.slice(a, b + 1).replace(/[“”]/g, '"').replace(/,\s*([}\]])/g, '$1')); } catch (e2) { throw new Error('La respuesta no es un JSON válido. Pídale a Claude: «Devuélvelo de nuevo solo como JSON válido».'); } }
    if (!d.titular && !(d.resumen || []).length) throw new Error('La respuesta no trae "titular" ni "resumen".');
    return d;
  }
  async function copiar(txt) {
    try { await navigator.clipboard.writeText(txt); U.aviso('Prompt copiado. Péguelo en Claude.', 'ok'); }
    catch (e) { U.modal('Copiar', '<div class="ic-form"><textarea rows="14" style="width:100%">' + esc(txt) + '</textarea><p class="sec">Selecciónelo y cópielo con Ctrl+C.</p></div>'); }
  }
  function tarjeta(a) {
    const L = (arr, f) => (arr || []).filter(Boolean).map(f).join('');
    const prio = (p) => '<span class="ope-prio ' + esc(U.norm(p || 'media').split(' ')[0]) + '">' + esc(p || 'Media') + '</span>';
    return '<p class="ope-an-meta">Análisis de Claude' + (a._meta ? ' · ' + esc(new Date(a._meta.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })) + (a._meta.por ? ' · pegado por ' + esc(a._meta.por) : '') : '') + '</p>' +
      (a.titular ? '<h3 class="ope-an-tit">' + esc(a.titular) + '</h3>' : '') + L(a.resumen, (p) => '<p>' + esc(p) + '</p>') +
      '<div class="ope-an2"><div class="ope-an-caja ok"><h4>✅ Lo que funcionó</h4>' + (L(a.destacados, (x) => '<p><b>' + esc(x.titulo || '') + '.</b> ' + esc(x.detalle || '') + '</p>') || '<p>—</p>') + '</div>' +
        '<div class="ope-an-caja alerta"><h4>⚠️ Para revisar</h4>' + (L(a.alertas, (x) => '<p><b>' + esc(x.titulo || '') + '.</b> ' + esc(x.detalle || '') + '</p>') || '<p>—</p>') + '</div></div>' +
      ((a.recomendaciones || []).length ? '<h4 class="ope-an-h4">Recomendaciones</h4><ol class="ope-an-recs">' + L(a.recomendaciones, (r) => '<li>' + prio(r.prioridad) + ' <b>' + esc(r.accion || '') + '</b>' + (r.responsable ? ' <span class="sec">(' + esc(r.responsable) + ')</span>' : '') + (r.por_que ? '<br><span class="sec">' + esc(r.por_que) + '</span>' : '') + '</li>') + '</ol>' : '') +
      (a.nota_datos ? '<p class="ope-an-nota">Sobre los datos: ' + esc(a.nota_datos) + '</p>' : '');
  }
  async function pintarAnalisis(cont) {
    const d = ST.desde, h = ST.hasta;
    cont.innerHTML = '<section class="ic-bloque ope-ancho"><div class="cab"><h2>✨ Análisis con Claude</h2></div><div class="cuerpo" id="anC"><p class="ope-nota">Buscando un análisis guardado de este periodo…</p></div></section>';
    const a = await leerGuardado(d, h), c = cont.querySelector('#anC'); if (!c || ST.desde !== d || ST.hasta !== h) return;
    c.innerHTML = (a ? tarjeta(a) : '') +
      '<div class="ope-noimp">' + (a ? '<details><summary class="ope-an-sum">Volver a analizar este periodo</summary>' : '') +
      '<p class="ope-nota">1) Copie el prompt (lleva los números de este resumen). 2) Péguelo en un chat nuevo de Claude. 3) Pegue aquí la respuesta y guárdela.</p>' +
      '<div class="ope-an-acc"><button class="ic-btn" id="anCop">Copiar prompt</button><a class="ic-btn sec" href="https://claude.ai/new" target="_blank" rel="noopener">Abrir Claude ↗</a></div>' +
      '<textarea id="anTxt" rows="5" placeholder="Pegue aquí la respuesta de Claude (el bloque JSON)…" style="width:100%;margin-top:10px;font-family:ui-monospace,Consolas,monospace;font-size:12.5px"></textarea>' +
      '<div class="ope-an-acc" style="margin-top:8px"><button class="ic-btn" id="anOk">Guardar análisis</button></div><div id="anMsg"></div>' + (a ? '</details>' : '') + '</div>';
    c.querySelector('#anCop').onclick = () => copiar(prompt());
    const ok = c.querySelector('#anOk');
    ok.onclick = () => U.conCarga(ok, async () => {
      try {
        const an = extraer(c.querySelector('#anTxt').value);
        an._meta = { fecha: new Date().toISOString(), por: App.usuario.nombre, desde: d, hasta: h };
        await G.subirArchivo(RUTA(d, h), new Blob([JSON.stringify(an, null, 2)], { type: 'application/json' }));
        ST.analisis[d + '_' + h] = an; U.aviso('Análisis guardado', 'ok'); pintarAnalisis(cont);
      } catch (e) { console.error(e); c.querySelector('#anMsg').innerHTML = '<div class="ic-alerta">' + esc(U.mensajeError(e)) + '</div>'; }
    });
  }
})();
