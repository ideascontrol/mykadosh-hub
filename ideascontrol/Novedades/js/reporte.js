/* =====================================================================
   APP-107 · Novedades — Reporte de novedades del personal entre fechas
   Listado para enviar por correo: Excel, PDF (imprimir) o copiar como tabla para pegar en Outlook.
   Una novedad entra si alguno de sus días cae en el rango; los días hábiles se cuentan solo dentro del rango.
   ===================================================================== */
(function () {
  const U = IC.ui, esc = U.esc;
  const ESTADOS_REP = [['VIGENTES', 'Aprobadas y pendientes'], ['APROBADA', 'Solo aprobadas'], ['SOLICITADA', 'Solo pendientes'], ['', 'Todas (incluye rechazadas y anuladas)']];
  const F = { desde: null, hasta: null, tec: '', tipo: '', estado: 'VIGENTES', motivo: true };
  const nombreEstado = (e) => (ESTADOS_NOV.find((x) => x[0] === e) || [e, e])[1];
  const max = (a, b) => (a > b ? a : b), min = (a, b) => (a < b ? a : b);
  const minutos = (h) => { const m = String(h || '').match(/^(\d{1,2}):(\d{2})/); return m ? +m[1] * 60 + +m[2] : null; };

  function lista() {
    return App.solicitudes.filter((s) => s.fecha_inicio <= F.hasta && (s.fecha_fin || s.fecha_inicio) >= F.desde &&
      (!F.tec || s.tecnico_id === F.tec) && (!F.tipo || s.tipo === F.tipo) &&
      (F.estado === 'VIGENTES' ? s.estado === 'APROBADA' || s.estado === 'SOLICITADA' : !F.estado || s.estado === F.estado))
      .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio) || Ope.nombreTec(a.tecnico_id).localeCompare(Ope.nombreTec(b.tecnico_id)));
  }
  // Duración dentro del rango del reporte
  function enRango(s) {
    if (s.modalidad === 'HORAS') {
      const a = minutos(s.hora_inicio), b = minutos(s.hora_fin), h = a != null && b != null && b > a ? (b - a) / 60 : null;
      return { dias: 0, horas: h, txt: (s.hora_inicio || '') + '–' + (s.hora_fin || '') + (h ? ' (' + String(Math.round(h * 10) / 10).replace('.', ',') + ' h)' : '') };
    }
    const d = App.diasHabiles(max(s.fecha_inicio, F.desde), min(s.fecha_fin || s.fecha_inicio, F.hasta)).length;
    return { dias: d, horas: 0, txt: d + ' día' + (d === 1 ? '' : 's') + ' hábil' + (d === 1 ? '' : 'es') + (Number(s.dias_habiles) > d ? ' de ' + s.dias_habiles : '') };
  }
  const tipoTxt = (s) => App.tipoNov(s.tipo).nombre + (s.subtipo ? ' · ' + s.subtipo : '');
  const fechasTxt = (s) => s.fecha_inicio === (s.fecha_fin || s.fecha_inicio) ? Ope.textoFecha(s.fecha_inicio, true) : Ope.textoFecha(s.fecha_inicio) + ' al ' + Ope.textoFecha(s.fecha_fin);
  const titulo = () => 'Novedades del personal · ' + Ope.textoFecha(F.desde) + ' al ' + Ope.textoFecha(F.hasta);
  const filtrosTxt = () => [F.tec ? 'Técnico: ' + Ope.nombreTec(F.tec) : '', F.tipo ? 'Tipo: ' + App.tipoNov(F.tipo).nombre : '', 'Estado: ' + ESTADOS_REP.find((x) => x[0] === F.estado)[1]].filter(Boolean).join(' · ');

  // Resumen por técnico
  function resumen(l) {
    const r = {};
    l.forEach((s) => {
      const x = r[s.tecnico_id] || (r[s.tecnico_id] = { nombre: Ope.nombreTec(s.tecnico_id), n: 0, dias: 0, horas: 0, tipos: {} });
      const d = enRango(s); x.n++; x.dias += d.dias; x.horas += d.horas || 0;
      const t = App.tipoNov(s.tipo).nombre; x.tipos[t] = (x.tipos[t] || 0) + 1;
    });
    return Object.values(r).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
  const horasTxt = (h) => h ? String(Math.round(h * 10) / 10).replace('.', ',') + ' h' : '';

  // ---------- Tabla (la misma para pantalla, PDF y correo) ----------
  const ST = {
    th: 'background:#EEF4F9;color:#0A5A90;text-align:left;font-size:11px;text-transform:uppercase;padding:6px;border-bottom:1px solid #C9D6E2;font-family:Arial,sans-serif',
    td: 'padding:6px;border-bottom:1px solid #E6ECF1;vertical-align:top;font-size:12px;font-family:Arial,sans-serif;color:#1D2B36'
  };
  function tablaHtml(l, conMotivo) {
    const th = (t) => '<th style="' + ST.th + '">' + t + '</th>', td = (t, extra) => '<td style="' + ST.td + (extra || '') + '">' + t + '</td>';
    return '<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%"><thead><tr>' +
      th('Técnico') + th('Novedad') + th('Fechas') + th('Duración en el rango') + th('Estado') + (conMotivo ? th('Motivo') : '') + th('Respuesta de la Dirección') + th('N°') + '</tr></thead><tbody>' +
      l.map((s) => '<tr>' + td('<b>' + esc(Ope.nombreTec(s.tecnico_id)) + '</b>') + td(esc(tipoTxt(s))) + td(esc(fechasTxt(s)), ';white-space:nowrap') + td(esc(enRango(s).txt)) +
        td(esc(nombreEstado(s.estado))) + (conMotivo ? td(esc(s.motivo || '')) : '') + td(esc(s.respuesta || '')) + td(esc(s.Title), ';white-space:nowrap;color:#5B6770') + '</tr>').join('') + '</tbody></table>';
  }
  function resumenHtml(l) {
    const r = resumen(l); if (!r.length) return '';
    const th = (t, n) => '<th style="' + ST.th + (n ? ';text-align:center' : '') + '">' + t + '</th>', td = (t, n) => '<td style="' + ST.td + (n ? ';text-align:center' : '') + '">' + t + '</td>';
    return '<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:720px;margin-bottom:14px"><thead><tr>' + th('Técnico') + th('Novedades', 1) + th('Días hábiles', 1) + th('Horas', 1) + th('Detalle') + '</tr></thead><tbody>' +
      r.map((x) => '<tr>' + td('<b>' + esc(x.nombre) + '</b>') + td(x.n, 1) + td(x.dias || '', 1) + td(horasTxt(x.horas), 1) + td(esc(Object.keys(x.tipos).map((k) => k + ' (' + x.tipos[k] + ')').join(', '))) + '</tr>').join('') +
      '<tr>' + td('<b>Total</b>') + td('<b>' + l.length + '</b>', 1) + td('<b>' + r.reduce((s, x) => s + x.dias, 0) + '</b>', 1) + td('<b>' + horasTxt(r.reduce((s, x) => s + x.horas, 0)) + '</b>', 1) + td('') + '</tr></tbody></table>';
  }

  // ---------- Vista ----------
  App.vistas.reporte = async function (c) {
    if (App.esTecnico()) { location.hash = ''; return; }
    if (!F.desde) { const k = Ope.ym(Ope.hoy()), [y, m] = k.split('-').map(Number); F.desde = k + '-01'; F.hasta = Ope.finDeMes(y, m); }
    c.innerHTML = '<a class="ic-volver" href="#">← Menú principal</a><div class="ic-barra"><div style="flex:1"><h1 class="ic-titulo">Reporte de novedades</h1>' +
      '<p class="ic-subtitulo" style="margin:0">Novedades con algún día dentro del rango. Descárguelo en Excel o PDF, o cópielo y péguelo directamente en el correo.</p></div></div>' +
      '<div class="ic-filtros">' +
      '<label class="nov-lbl">Desde <input type="date" id="rD" value="' + F.desde + '"></label><label class="nov-lbl">Hasta <input type="date" id="rH" value="' + F.hasta + '"></label>' +
      '<select id="rT"><option value="">Todos los técnicos</option>' + Ope.D.tecnicos.map((t) => '<option value="' + esc(t.Title) + '">' + esc(t.nombre) + '</option>').join('') + '</select>' +
      '<select id="rTi"><option value="">Todos los tipos</option>' + TIPOS_NOV.map((t) => '<option value="' + t.id + '">' + esc(t.nombre) + '</option>').join('') + '</select>' +
      '<select id="rE">' + ESTADOS_REP.map((e) => '<option value="' + e[0] + '">' + esc(e[1]) + '</option>').join('') + '</select>' +
      '<label class="ic-check"><input type="checkbox" id="rM"' + (F.motivo ? ' checked' : '') + '> <span>Incluir motivo</span></label></div>' +
      '<div class="ic-acciones" style="border:0;padding-top:0;justify-content:flex-start;flex-wrap:wrap">' +
      '<button class="ic-btn" id="rCopiar">Copiar para el correo</button><button class="ic-btn sec" id="rXls">Descargar Excel</button><button class="ic-btn sec" id="rPdf">PDF / Imprimir</button></div>' +
      '<div id="rRes"><div class="ic-vacio">Cargando…</div></div>';
    c.querySelector('#rT').value = F.tec; c.querySelector('#rTi').value = F.tipo; c.querySelector('#rE').value = F.estado;
    const leer = () => {
      F.desde = c.querySelector('#rD').value; F.hasta = c.querySelector('#rH').value; F.tec = c.querySelector('#rT').value;
      F.tipo = c.querySelector('#rTi').value; F.estado = c.querySelector('#rE').value; F.motivo = c.querySelector('#rM').checked;
      return F.desde && F.hasta && F.hasta >= F.desde;
    };
    function dibujar() {
      if (!leer()) { c.querySelector('#rRes').innerHTML = '<div class="ic-alerta">Revise las fechas: «Hasta» no puede ser anterior a «Desde».</div>'; return; }
      const l = lista();
      c.querySelector('#rRes').innerHTML = '<p class="ope-nota" style="margin:4px 0 10px"><b>' + l.length + ' novedad' + (l.length === 1 ? '' : 'es') + '</b> · ' + esc(filtrosTxt()) + '</p>' +
        (l.length ? '<div class="ic-tabla-caja" style="padding:12px;overflow-x:auto">' + resumenHtml(l) + tablaHtml(l, F.motivo) + '</div>' : '<div class="ic-tabla-caja"><div class="ic-vacio">No hay novedades en ese rango con estos filtros.</div></div>');
    }
    c.querySelectorAll('.ic-filtros input, .ic-filtros select').forEach((el) => { el.onchange = dibujar; });
    const conLista = (fn) => () => { if (!leer()) { dibujar(); return; } const l = lista(); if (!l.length) { U.aviso('No hay novedades para el reporte con estos filtros.', 'warn'); return; } fn(l); };
    c.querySelector('#rCopiar').onclick = conLista(copiar);
    c.querySelector('#rXls').onclick = conLista((l) => excel(l, c.querySelector('#rXls')));
    c.querySelector('#rPdf').onclick = conLista(imprimir);
    try { await App.cargarSolicitudes(); dibujar(); } catch (e) { c.querySelector('#rRes').innerHTML = '<div class="ic-alerta">' + esc(U.mensajeError(e)) + '</div>'; }
  };

  // ---------- Copiar como tabla (se pega con formato en Outlook / Gmail) ----------
  async function copiar(l) {
    const html = '<div style="font-family:Arial,sans-serif;color:#1D2B36"><p style="font-size:14px;margin:0 0 4px"><b>' + esc(titulo()) + '</b></p>' +
      '<p style="font-size:12px;color:#5B6770;margin:0 0 10px">' + esc(filtrosTxt()) + ' · ' + l.length + ' novedad' + (l.length === 1 ? '' : 'es') + '</p>' + resumenHtml(l) + tablaHtml(l, F.motivo) + '</div>';
    const texto = titulo() + '\n' + filtrosTxt() + '\n\n' + l.map((s) => [Ope.nombreTec(s.tecnico_id), tipoTxt(s), fechasTxt(s), enRango(s).txt, nombreEstado(s.estado), F.motivo ? s.motivo || '' : null, s.respuesta || ''].filter((x) => x !== null).join(' | ')).join('\n');
    try {
      if (window.ClipboardItem) await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([texto], { type: 'text/plain' }) })]);
      else await navigator.clipboard.writeText(texto);
      U.aviso('Reporte copiado: abra un correo nuevo y péguelo (Ctrl + V).', 'ok', 6000);
    } catch (e) { U.aviso('No se pudo copiar. Use «Descargar Excel» o «PDF» y adjúntelo.', 'warn', 7000); }
  }

  // ---------- PDF (ventana de impresión) ----------
  function imprimir(l) {
    const html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Novedades ' + esc(F.desde) + ' a ' + esc(F.hasta) + '</title><style>' +
      '@page{size:A4 landscape;margin:12mm 10mm}body{font-family:Arial,sans-serif;color:#1D2B36;margin:0}' +
      '.cab{display:flex;align-items:center;gap:16px;border-bottom:3px solid #C9A227;padding-bottom:10px;margin-bottom:12px}.cab img{height:40px}.cab h1{font-size:18px;margin:0;color:#0E76BC}.cab p{margin:2px 0 0;color:#5B6770;font-size:12px}' +
      'h2{font-size:14px;color:#0E76BC;margin:14px 0 6px}thead{display:table-header-group}tr{break-inside:avoid}td,th{font-size:10.5px!important}' +
      '.pie{margin-top:14px;color:#8A96A0;font-size:10px}.barra{position:fixed;top:0;right:0;padding:10px}.barra button{font:inherit;font-weight:600;padding:8px 14px;border:0;border-radius:8px;background:#0E76BC;color:#fff;cursor:pointer}' +
      '@media print{.barra{display:none}}</style></head><body><div class="barra"><button onclick="window.print()">Imprimir / Guardar PDF</button></div>' +
      '<div class="cab"><img src="' + location.origin + CFG.logo + '" alt="Ideas Control"><div><h1>' + esc(titulo()) + '</h1><p>Dirección de Operaciones · ' + esc(filtrosTxt()) + ' · ' + l.length + ' novedad' + (l.length === 1 ? '' : 'es') + '</p></div></div>' +
      '<h2>Resumen por técnico</h2>' + resumenHtml(l) + '<h2>Detalle</h2>' + tablaHtml(l, F.motivo) +
      '<p class="pie">Ideas Control Equipos y Soluciones S.A.S. · Generado ' + esc(new Date().toLocaleString('es-CO')) + ' por ' + esc(App.usuario.nombre) + '</p>' +
      '<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},400)})<\/script></body></html>';
    const w = window.open('', '_blank');
    if (!w) { U.aviso('El navegador bloqueó la ventana. Permita ventanas emergentes para mykadosh.com.', 'warn', 8000); return; }
    w.document.open(); w.document.write(html); w.document.close();
  }

  // ---------- Excel ----------
  function cargarXLSX() {
    if (window.XLSX) return Promise.resolve();
    return new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar la librería de Excel. Revise la conexión.')); document.head.appendChild(s); });
  }
  const serial = (s) => { if (!s) return ''; const [y, m, d] = s.split('-').map(Number); return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 864e5; };
  async function excel(l, boton) {
    await U.conCarga(boton, async () => {
      try {
        await cargarXLSX();
        const filas = l.map((s) => { const d = enRango(s); const o = {
          'N°': s.Title, 'Técnico': Ope.nombreTec(s.tecnico_id), 'Tipo': App.tipoNov(s.tipo).nombre, 'Detalle': s.subtipo || '', 'Modalidad': s.modalidad === 'HORAS' ? 'Por horas' : 'Días completos',
          'Desde': serial(s.fecha_inicio), 'Hasta': serial(s.fecha_fin || s.fecha_inicio), 'Hora inicio': s.hora_inicio || '', 'Hora fin': s.hora_fin || '',
          'Días hábiles en el rango': s.modalidad === 'HORAS' ? '' : d.dias, 'Días hábiles totales': s.modalidad === 'HORAS' ? '' : Number(s.dias_habiles) || '', 'Horas': d.horas ? Math.round(d.horas * 100) / 100 : '',
          'Estado': nombreEstado(s.estado) };
          if (F.motivo) o['Motivo'] = s.motivo || '';
          o['Respuesta de la Dirección'] = s.respuesta || ''; o['Resuelta por'] = s.resuelto_por || ''; o['Registrada por'] = s.registrado_por || '';
          return o; });
        const wb = XLSX.utils.book_new(), ws = XLSX.utils.json_to_sheet(filas);
        ws['!cols'] = [12, 22, 16, 18, 14, 11, 11, 9, 9, 12, 12, 8, 11].concat(F.motivo ? [40] : []).concat([36, 18, 18]).map((w) => ({ wch: w }));
        Object.keys(ws).forEach((k) => { if (/^[FG]\d+$/.test(k) && !/^[FG]1$/.test(k) && typeof ws[k].v === 'number') ws[k].z = 'dd/mm/yyyy'; });
        ws['!autofilter'] = { ref: ws['!ref'] };
        XLSX.utils.book_append_sheet(wb, ws, 'Novedades');
        const r = resumen(l);
        const ws2 = XLSX.utils.json_to_sheet(r.map((x) => ({ 'Técnico': x.nombre, 'Novedades': x.n, 'Días hábiles': x.dias, 'Horas': x.horas ? Math.round(x.horas * 100) / 100 : '', 'Detalle': Object.keys(x.tipos).map((k) => k + ' (' + x.tipos[k] + ')').join(', ') }))
          .concat([{ 'Técnico': 'Total', 'Novedades': l.length, 'Días hábiles': r.reduce((s, x) => s + x.dias, 0), 'Horas': Math.round(r.reduce((s, x) => s + x.horas, 0) * 100) / 100 || '', 'Detalle': '' }]));
        ws2['!cols'] = [24, 11, 12, 8, 50].map((w) => ({ wch: w }));
        XLSX.utils.book_append_sheet(wb, ws2, 'Resumen por técnico');
        const ws3 = XLSX.utils.aoa_to_sheet([['Novedades del personal · Ideas Control Equipos y Soluciones S.A.S.'], ['Rango', Ope.textoFecha(F.desde) + ' al ' + Ope.textoFecha(F.hasta)],
          ['Filtros', filtrosTxt()], ['Novedades', l.length], ['Nota', 'Los días hábiles se cuentan solo dentro del rango (sin fines de semana ni festivos).'], ['Generado', new Date().toLocaleString('es-CO') + ' por ' + App.usuario.nombre]]);
        ws3['!cols'] = [{ wch: 12 }, { wch: 80 }];
        XLSX.utils.book_append_sheet(wb, ws3, 'Filtros');
        XLSX.writeFile(wb, 'Novedades_IC_' + F.desde + '_a_' + F.hasta + '.xlsx');
        U.aviso('Excel descargado (' + l.length + ' novedades). Adjúntelo al correo.', 'ok', 6000);
      } catch (e) { U.aviso(U.mensajeError(e), 'err', 7000); }
    });
  }
})();
