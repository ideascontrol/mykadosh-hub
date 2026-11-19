/* =====================================================================
   APP-106 · Programación — carga masiva de actividades desde Excel
   1) Descargar plantilla (hojas Actividades, Listas e Instrucciones)
   2) Subir el archivo diligenciado: se revisa fila por fila, se muestra
      la vista previa con errores y conflictos, y se programan las válidas.
   Bloquean la fila: fecha o tipo vacíos/no válidos, responsable o estado
   desconocidos, fecha festiva. Los conflictos de política (fin de semana,
   habilidad, doble asignación…) se pueden importar marcados con ⚠, igual
   que en el formulario.
   ===================================================================== */
(function () {
  const U = IC.ui, esc = U.esc;
  const MAX_FILAS = 300;
  const COLS = ['Fecha *', 'Responsable', 'Tipo *', 'Cliente (contrata y paga)', 'Sitio / cliente final', 'Sede (código)', 'Ciudad', 'Equipos', 'Hora inicio', 'Ticket / OS', 'Estado', 'Observaciones'];

  function cargarXLSX() {
    if (window.XLSX) return Promise.resolve();
    return new Promise((ok, mal) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar el lector de Excel. Revise la conexión.'));
      document.head.appendChild(s);
    });
  }

  // ---------- Plantilla ----------
  async function descargarPlantilla(btn) {
    const txt = btn.textContent; btn.disabled = true; btn.textContent = 'Generando…';
    try {
      await cargarXLSX();
      await Ope.catalogosFrescos(60);
      const empresas = await Ope.empresas().catch(() => []);
      const sedes = await Ope.sedes().catch(() => []);
      const wb = XLSX.utils.book_new();

      const ws = XLSX.utils.aoa_to_sheet([COLS]);
      ws['!cols'] = [12, 24, 10, 28, 28, 14, 14, 9, 11, 14, 13, 40].map((w) => ({ wch: w }));
      ws['!autofilter'] = { ref: 'A1:L1' };
      XLSX.utils.book_append_sheet(wb, ws, 'Actividades');

      const tecs = Ope.D.personal.filter((t) => t.estado !== 'INACTIVO').map((t) => t.nombre).sort((a, b) => a.localeCompare(b, 'es'));
      const tipos = Ope.D.tipos.filter((t) => t.estado !== 'INACTIVO').map((t) => [t.Title, t.nombre]);
      const clis = empresas.map((e) => e.razon_social).filter(Boolean).sort((a, b) => a.localeCompare(b, 'es'));
      const n = Math.max(tecs.length, tipos.length, clis.length, sedes.length, 2);
      const listas = [['Responsable', '', 'Tipo (código)', 'Tipo (nombre)', '', 'Estado', '', 'Cliente (app Comercial)', '', 'Sede (código)', 'Sede (cliente · ciudad · dirección)']];
      for (let i = 0; i < n; i++) {
        const sd = sedes[i];
        listas.push([tecs[i] || '', '', (tipos[i] || [])[0] || '', (tipos[i] || [])[1] || '', '', ['Programado', 'Confirmado'][i] || '', '', clis[i] || '', '',
          sd ? sd.Title : '', sd ? [sd.cliente_principal || sd.sitio || '', sd.ciudad || '', sd.direccion || ''].filter(Boolean).join(' · ') : '']);
      }
      const wl = XLSX.utils.aoa_to_sheet(listas);
      wl['!cols'] = [26, 2, 14, 30, 2, 13, 2, 34, 2, 14, 50].map((w) => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, wl, 'Listas');

      const ins = [
        ['Carga masiva de actividades · Programación de Operaciones · Ideas Control'], [''],
        ['1', 'Diligencie la hoja «Actividades»: una fila por actividad, desde la fila 2. No cambie los títulos de las columnas.'],
        ['2', 'Obligatorios: Fecha (dd/mm/aaaa) y Tipo (código o nombre de la hoja Listas).'],
        ['3', 'Responsable: el nombre tal como aparece en la hoja Listas. Vacío = sin asignar (se marca con ⚠).'],
        ['4', 'Cliente: quien contrata y paga. Si está en la app Comercial, escríbalo igual que en la hoja Listas para que quede enlazado.'],
        ['5', 'Sitio / cliente final: dónde se presta el servicio, si es distinto del cliente. Sede: código de la hoja Listas (opcional).'],
        ['6', 'Hora inicio en formato 24 h (08:00). Equipos: número. Estado: Programado (por defecto) o Confirmado.'],
        ['7', 'No se programan actividades en festivos. Fin de semana, habilidades del técnico o doble asignación se muestran como conflicto ⚠ y usted decide si las carga.'],
        ['8', 'En la app: Actividades › Carga masiva › Subir archivo. Antes de grabar se ve la revisión fila por fila. Máximo ' + MAX_FILAS + ' filas por archivo.']
      ];
      const wi = XLSX.utils.aoa_to_sheet(ins);
      wi['!cols'] = [{ wch: 4 }, { wch: 120 }];
      XLSX.utils.book_append_sheet(wb, wi, 'Instrucciones');

      XLSX.writeFile(wb, 'Plantilla_Programacion_IC.xlsx');
    } catch (e) { U.aviso(U.mensajeError(e), 'err', 7000); }
    finally { btn.disabled = false; btn.textContent = txt; }
  }

  // ---------- Lectura y revisión ----------
  const pad = (n) => String(n).padStart(2, '0');
  function leerFecha(v) {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'number') { const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
    const s = String(v).trim();
    let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s); if (m) return m[1] + '-' + pad(m[2]) + '-' + pad(m[3]);
    m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(s); if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return y + '-' + pad(m[2]) + '-' + pad(m[1]); }
    return null;
  }
  function valida(iso) { if (!iso) return false; const [y, m, d] = iso.split('-').map(Number); const x = new Date(y, m - 1, d); return x.getFullYear() === y && x.getMonth() === m - 1 && x.getDate() === d; }
  function leerHora(v) {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'number') { const min = Math.round((v % 1) * 1440); return pad(Math.floor(min / 60)) + ':' + pad(min % 60); }
    const m = /^(\d{1,2})[:.h](\d{2})\s*(a\.?\s*m\.?|p\.?\s*m\.?)?$/i.exec(String(v).trim());
    if (!m) return null;
    let h = Number(m[1]); const pm = m[3] && /p/i.test(m[3]); if (pm && h < 12) h += 12; if (m[3] && !pm && h === 12) h = 0;
    return h < 24 && Number(m[2]) < 60 ? pad(h) + ':' + m[2] : null;
  }

  async function revisar(file) {
    await cargarXLSX();
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const hoja = wb.Sheets['Actividades'] || wb.Sheets[wb.SheetNames[0]];
    const a = XLSX.utils.sheet_to_json(hoja, { header: 1, raw: true, defval: '' });
    const cab = (a[0] || []).map((x) => U.norm(String(x).replace('*', '')));
    const col = (nombre) => cab.indexOf(U.norm(nombre.replace('*', '')));
    const idx = {}; COLS.forEach((c) => { idx[c] = col(c); });
    if (idx['Fecha *'] < 0 || idx['Tipo *'] < 0) throw new Error('No encontré las columnas «Fecha» y «Tipo» en la primera fila. Use la plantilla de la app.');
    const filas = a.slice(1).map((r, i) => ({ n: i + 2, r })).filter((x) => x.r.some((v) => String(v).trim() !== ''));
    if (!filas.length) throw new Error('El archivo no tiene actividades (la hoja «Actividades» está vacía).');
    if (filas.length > MAX_FILAS) throw new Error('El archivo tiene ' + filas.length + ' filas; el máximo es ' + MAX_FILAS + '. Divídalo en varios archivos.');

    await Ope.catalogosFrescos(5);
    const empresas = await Ope.empresas().catch(() => []);
    const sedes = await Ope.sedes().catch(() => []);
    const v = (x, c) => (idx[c] >= 0 ? x.r[idx[c]] : '');
    const t = (x, c) => String(v(x, c) === null || v(x, c) === undefined ? '' : v(x, c)).trim();

    const out = filas.map((x) => {
      const err = [], p = { estado: 'PROGRAMADO', origen: 'CARGA_MASIVA' };
      const f = leerFecha(v(x, 'Fecha *'));
      if (!f) err.push(f === '' ? 'Falta la fecha' : 'Fecha no válida (use dd/mm/aaaa)'); else if (!valida(f)) err.push('Fecha no válida'); else p.fecha = f;
      const tx = U.norm(t(x, 'Tipo *'));
      const tp = Ope.D.tipos.find((y) => U.norm(y.Title) === tx || U.norm(y.nombre) === tx);
      if (!tx) err.push('Falta el tipo'); else if (!tp) err.push('Tipo «' + t(x, 'Tipo *') + '» no existe'); else p.tipo = tp.Title;
      const rx = U.norm(t(x, 'Responsable'));
      if (rx) { const tc = Ope.D.personal.find((y) => U.norm(y.nombre) === rx || U.norm(y.Title) === rx); if (!tc) err.push('Responsable «' + t(x, 'Responsable') + '» no existe'); else p.tecnico_id = tc.Title; }
      const cli = t(x, 'Cliente (contrata y paga)');
      if (cli) { const e = empresas.find((y) => U.norm(y.razon_social) === U.norm(cli)); p.cliente = e ? e.razon_social : cli; p.empresa_id = e ? e.Title : ''; p._enlazada = !!e; }
      const sit = t(x, 'Sitio / cliente final'); if (sit) p.sitio = sit;
      const sd = t(x, 'Sede (código)');
      if (sd) { const s = sedes.find((y) => U.norm(y.Title) === U.norm(sd)); if (!s) err.push('Sede «' + sd + '» no existe'); else p.sede = s.Title; }
      p.ciudad = t(x, 'Ciudad');
      const eq = t(x, 'Equipos');
      if (eq !== '') { const ne = Number(eq.replace(',', '.')); if (!Number.isInteger(ne) || ne < 0) err.push('Equipos debe ser un número entero'); else p.equipos = ne; } else p.equipos = '';
      const h = leerHora(v(x, 'Hora inicio')); if (h === null) err.push('Hora no válida (use 08:00)'); else if (h) p.hora_inicio = h;
      const tk = t(x, 'Ticket / OS'); if (tk) p.ticket_os = tk;
      const es = U.norm(t(x, 'Estado'));
      if (es) { const e = Ope.ESTADOS.find((y) => (y[0] === 'PROGRAMADO' || y[0] === 'CONFIRMADO') && (U.norm(y[0]) === es || U.norm(y[1]) === es)); if (!e) err.push('Estado: solo Programado o Confirmado'); else p.estado = e[0]; }
      const ob = t(x, 'Observaciones'); if (ob) p.observaciones = ob;
      if (p.fecha && Ope.esFestivo(p.fecha)) err.push('Festivo (' + Ope.D.festivos[p.fecha] + '): no se programa');
      return { n: x.n, p, err, conf: [], avisos: [] };
    });

    // Conflictos de política con lo ya programado y con las demás filas del archivo
    const fechas = out.filter((o) => o.p.fecha).map((o) => o.p.fecha).sort();
    if (fechas.length) await Ope.cargarRango(fechas[0], fechas[fechas.length - 1]);
    out.forEach((o, i) => {
      if (o.err.length || !o.p.fecha) return;
      o.p.Title = '(fila ' + o.n + ')';
      const previas = out.slice(0, i).filter((y) => !y.err.length && y.p.fecha === o.p.fecha).map((y) => y.p);
      const r = Ope.validar(o.p, Ope.delDia(o.p.fecha).concat(previas));
      o.conf = r.errores; o.avisos = r.avisos;
    });
    return out;
  }

  function vistaPrevia(out, alCambiar) {
    const ok = out.filter((o) => !o.err.length && !o.conf.length), conf = out.filter((o) => !o.err.length && o.conf.length), mal = out.filter((o) => o.err.length);
    const fila = (o) => '<tr class="' + (o.err.length ? 'ope-fila-err' : '') + '" style="cursor:default"><td>' + o.n + '</td><td>' + esc(o.p.fecha ? Ope.textoFecha(o.p.fecha) : '—') + '</td><td>' + esc(o.p.tecnico_id ? Ope.nombreTec(o.p.tecnico_id) : '—') + '</td><td>' + esc(o.p.tipo || '—') + '</td>' +
      '<td>' + esc(o.p.sitio || o.p.cliente || '') + (o.p.sitio && o.p.cliente ? '<span class="sec">Cliente: ' + esc(o.p.cliente) + '</span>' : '') + '</td>' +
      '<td class="ope-col-val">' + (o.err.length ? '<span class="ope-val err">✖ ' + esc(o.err.join('; ')) + '</span>' : o.conf.length ? '<span class="ope-val warn">⚠ ' + esc(o.conf.join('; ')) + '</span>' : '<span class="ope-val ok">✔ OK</span>') +
      (o.avisos.length && !o.err.length ? '<span class="sec">ℹ ' + esc(o.avisos.join('; ')) + '</span>' : '') + '</td></tr>';
    U.modal('Revisión de la carga masiva', '<div class="ic-form">' +
      '<p style="margin-top:0"><b>' + out.length + '</b> filas · <span class="ope-val ok">✔ ' + ok.length + ' listas</span> · <span class="ope-val warn">⚠ ' + conf.length + ' con conflictos</span> · <span class="ope-val err">✖ ' + mal.length + ' con errores (no se cargan)</span></p>' +
      '<div class="ic-tabla-caja" style="max-height:420px;overflow:auto"><table class="ic-tabla"><thead><tr><th>Fila</th><th>Fecha</th><th>Responsable</th><th>Tipo</th><th>Sitio / cliente</th><th>Revisión</th></tr></thead><tbody>' + out.map(fila).join('') + '</tbody></table></div>' +
      (conf.length ? '<label class="ic-check" style="margin-top:10px"><input type="checkbox" id="cmConf"> <span>Cargar también ' + (conf.length === 1 ? 'la que tiene' : 'las ' + conf.length + ' que tienen') + ' conflictos (quedan marcadas con ⚠ hasta que se corrijan)</span></label>' : '') +
      (mal.length ? '<p class="ope-nota">Las filas con ✖ no se cargan. Corríjalas y súbalas en un archivo aparte que tenga solo esas filas, para no duplicar las que ya se programaron.</p>' : '') +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="cmNo">Cancelar</button><button type="button" class="ic-btn" id="cmOk"' + (ok.length ? '' : ' disabled') + '>Programar ' + ok.length + ' actividades</button></div></div>', (m) => {
      const b = m.querySelector('#cmOk'), cc = m.querySelector('#cmConf');
      const cuantas = () => ok.length + (cc && cc.checked ? conf.length : 0);
      if (cc) cc.onchange = () => { b.textContent = 'Programar ' + cuantas() + ' actividades'; b.disabled = !cuantas(); };
      m.querySelector('#cmNo').onclick = U.cerrarModal;
      b.onclick = async () => {
        const lista = ok.concat(cc && cc.checked ? conf : []).sort((x, y) => x.n - y.n);
        b.disabled = true; m.querySelector('#cmNo').disabled = true;
        let hechas = 0; const fallos = [];
        for (const o of lista) {
          b.textContent = 'Programando ' + (hechas + fallos.length + 1) + ' de ' + lista.length + '…';
          const p = Object.assign({}, o.p); delete p.Title; delete p._enlazada;
          if (!p.empresa_id) delete p.empresa_id;
          try { await Ope.crearActividad(p); hechas++; } catch (e) { fallos.push('Fila ' + o.n + ': ' + U.mensajeError(e)); }
        }
        U.cerrarModal();
        if (fallos.length) U.modal('Carga masiva', '<div class="ic-form"><p style="margin-top:0">Se programaron <b>' + hechas + '</b> actividades. No se pudieron grabar:</p><ul>' + fallos.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul><div class="ic-acciones"><button class="ic-btn" id="cmF">Entendido</button></div></div>', (m2) => { m2.querySelector('#cmF').onclick = U.cerrarModal; });
        else U.aviso(hechas + ' actividades programadas', 'ok', 6000);
        if (alCambiar) alCambiar();
      };
    });
  }

  // ---------- Ventana de entrada ----------
  App.cargaMasiva = function (alCambiar) {
    U.modal('Carga masiva de actividades', '<div class="ic-form">' +
      '<p style="margin-top:0">Para programar muchas actividades a la vez (por ejemplo, un plan de instalaciones o mantenimientos).</p>' +
      '<ol style="margin:0 0 12px;padding-left:20px;line-height:1.6"><li>Descargue la plantilla. Trae las listas vigentes de responsables, tipos, clientes y sedes.</li>' +
      '<li>Diligencie la hoja «Actividades», una fila por actividad.</li>' +
      '<li>Súbala aquí: verá la revisión fila por fila antes de grabar.</li></ol>' +
      '<div class="ic-acciones" style="justify-content:flex-start"><button type="button" class="ic-btn sec" id="cmPl">⬇ Descargar plantilla</button>' +
      '<button type="button" class="ic-btn" id="cmSu">⬆ Subir archivo diligenciado</button><input type="file" id="cmArch" accept=".xlsx,.xls" hidden></div></div>', (m) => {
      m.querySelector('#cmPl').onclick = () => descargarPlantilla(m.querySelector('#cmPl'));
      const inp = m.querySelector('#cmArch'), bs = m.querySelector('#cmSu');
      bs.onclick = () => inp.click();
      inp.onchange = async () => {
        const f = inp.files[0]; if (!f) return;
        bs.disabled = true; bs.textContent = 'Revisando…';
        try { const out = await revisar(f); vistaPrevia(out, alCambiar); }
        catch (e) { U.aviso(U.mensajeError(e), 'err', 9000); bs.disabled = false; bs.textContent = '⬆ Subir archivo diligenciado'; inp.value = ''; }
      };
    });
  };
})();
