/* =====================================================================
   APP-112 · Marketing — Reemplazar el plan desde una semana (Banco de temas › «Reemplazar plan desde una semana»)
   Lee la hoja «Temas» del Excel Plan_Marketing_IdeasControl (fila de títulos con «ID» y «Fecha»):
   - Borra de esa semana en adelante los temas y publicaciones del plan anterior. Nunca borra lo Programado, lo Publicado
     ni lo que tiene métricas (el historial se conserva); un tema con algo así se queda.
   - Carga desde el Excel: un tema por «Tema / título de trabajo» y una publicación por fila con fecha.
     Las filas sin fecha quedan como temas del banco, sin publicaciones.
   - Canales: «Facebook / Instagram» se separa (Facebook ese día; Instagram el día siguiente si cae lunes, porque
     Instagram va de martes a viernes); «TikTok / Youtube» → TikTok (y YouTube si se marca); «LinkedIn» → LinkedIn Copy
     (LinkedIn Pg IC si es jueves).
   La hoja «Agenda-Estado» no se usa: lo nuevo entra como Planeada.
   Solo la Dirección de Operaciones.
   ===================================================================== */
window.MKT_PLAN = (function () {
  const U = IC.ui, esc = U.esc, G = IC.graph, L = CFG.listas, M = () => window.MKT;
  const ADMIN = 'operaciones@ideascontrol.com';
  const puede = () => App.usuario && App.usuario.email === ADMIN;
  // Columnas del Excel → campos del tema (se buscan por el título de la fila 4, sin importar tildes)
  const COLS = [['id', /^id$/], ['fecha', /^fecha$/], ['canal', /^canal/], ['formato', /^formato/], ['categoria', /^categ/], ['tema', /^tema/], ['hook', /^hook/],
    ['problema', /^problema/], ['autoridad', /^autoridad/], ['solucion', /^soluc/], ['cta', /^cta$/], ['valor', /^valor/], ['seo', /^seo/], ['objetivo', /^objetivo/],
    ['enfoque', /^enfoque/], ['proposito', /^proposito/], ['promesa', /^promesa/], ['kpis', /^kpi/], ['microapp', /^microapp/], ['cta_microapp', /^cta sugerido/],
    ['hashtags', /^hashtag/], ['palabras', /^palabras/], ['publico', /^publico/], ['recurso_visual', /^recurso/], ['etapa_embudo', /^etapa/], ['control_previo', /^control previo/]];
  const CAMPOS_T = ['tema', 'categoria', 'hook', 'problema', 'autoridad', 'solucion', 'cta', 'valor', 'seo', 'objetivo', 'enfoque', 'proposito', 'promesa', 'kpis', 'microapp',
    'cta_microapp', 'hashtags', 'palabras', 'publico', 'recurso_visual', 'etapa_embudo', 'control_previo'];
  const txt = (v) => (v == null ? '' : String(v).trim());
  const clave = (t) => U.norm(txt(t)).replace(/[¿?¡!."“”]/g, '').trim();
  const iso = (d) => d.getFullYear() + '-' + M().pad(d.getMonth() + 1, 2) + '-' + M().pad(d.getDate(), 2);
  function fechaDe(v) {
    if (v instanceof Date && !isNaN(v)) return iso(v);
    if (typeof v === 'number') return iso(new Date(Math.round((v - 25569) * 864e5) + new Date().getTimezoneOffset() * 6e4));
    const m = txt(v).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[0] : '';
  }
  const diaSemana = (f) => new Date(f + 'T12:00:00').getDay();   // 0 domingo … 4 jueves

  function cargarXLSX() {
    if (window.XLSX) return Promise.resolve();
    return new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar la librería de Excel.')); document.head.appendChild(s); });
  }
  async function leerExcel(file) {
    await cargarXLSX();
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    const nom = wb.SheetNames.find((n) => U.norm(n) === 'temas');
    if (!nom) throw new Error('El archivo no tiene la hoja «Temas».');
    const filas = XLSX.utils.sheet_to_json(wb.Sheets[nom], { header: 1, raw: true, defval: null });
    const h = filas.findIndex((r) => r && r.some((c) => U.norm(txt(c)) === 'id') && r.some((c) => U.norm(txt(c)) === 'fecha'));
    if (h < 0) throw new Error('En la hoja «Temas» no se encontró la fila de títulos (ID, Fecha, Canal, …).');
    const idx = {}; filas[h].forEach((c, i) => { const n = U.norm(txt(c)); const k = COLS.find((x) => x[1].test(n) && idx[x[0]] == null); if (k) idx[k[0]] = i; });
    ['id', 'fecha', 'canal', 'tema'].forEach((k) => { if (idx[k] == null) throw new Error('Falta la columna «' + k + '» en la hoja «Temas».'); });
    return filas.slice(h + 1).filter((r) => r && txt(r[idx.id]) && txt(r[idx.tema])).map((r) => {
      const o = {}; Object.keys(idx).forEach((k) => { o[k] = k === 'fecha' ? fechaDe(r[idx.fecha]) : txt(r[idx[k]]); }); return o;
    });
  }

  // Publicaciones que salen de una fila, según el canal
  function pubsDeFila(r, op) {
    const c = U.norm(r.canal), out = [];
    const p = (canal, fecha) => out.push({ canal, fecha: fecha || r.fecha, formato: r.formato, titulo: r.tema, origen_id: Number(r.id) || null });
    if (/facebook/.test(c) && /instagram/.test(c)) {
      if (op.separar) { p('Facebook'); p('Instagram', diaSemana(r.fecha) === 1 ? M().sumarDias(r.fecha, 1) : r.fecha); } else p('Facebook');
    } else if (/tiktok/.test(c)) { p('TikTok'); if (/youtube/.test(c) && op.youtube) p('YouTube'); }
    else if (/newsletter/.test(c)) p('LinkedIn Newsletter');
    else if (/linkedin/.test(c)) p(/pg ic|pagina/.test(c) ? 'LinkedIn Pg IC' : /copy/.test(c) ? 'LinkedIn Copy' : diaSemana(r.fecha) === 4 ? 'LinkedIn Pg IC' : 'LinkedIn Copy');
    else if (/youtube/.test(c)) p('YouTube');
    else if (/instagram/.test(c)) p('Instagram');
    else if (/facebook/.test(c)) p('Facebook');
    else p(r.canal || 'Facebook');
    return out;
  }
  // Arma lo nuevo desde las filas del Excel (desde la semana elegida y las sin fecha)
  function armar(filas, desde, op) {
    const usar = filas.filter((r) => !r.fecha || r.fecha >= desde), grupos = new Map();
    usar.forEach((r) => { const k = clave(r.tema); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(r); });
    const temas = [];
    grupos.forEach((rs) => {
      const base = rs.slice().sort((a, b) => (/facebook/i.test(a.canal) ? 0 : 1) - (/facebook/i.test(b.canal) ? 0 : 1))[0];
      const fechas = rs.map((r) => r.fecha).filter(Boolean).sort();
      const t = { semana_inicio: fechas.length ? M().lunesDe(fechas[0]) : '', pubs: [] };
      CAMPOS_T.forEach((k) => { t[k] = base[k] || ''; });
      rs.filter((r) => r.fecha).forEach((r) => pubsDeFila(r, op).forEach((p) => t.pubs.push(p)));
      temas.push(t);
    });
    temas.sort((a, b) => (a.semana_inicio || '9999').localeCompare(b.semana_inicio || '9999'));
    return { temas, ignoradas: filas.length - usar.length };
  }
  // Lo que se borra del plan actual
  function aBorrar(desde, op) {
    const conMet = new Set(App.mets.map((m) => m.publicacion_id)), sem = (p) => M().semanaDe(p);
    const protegida = (p) => ['Programada', 'Publicada'].indexOf(p.estado) >= 0 || conMet.has(p.Title);
    const pubsDesde = App.pubs.filter((p) => sem(p) >= desde);
    const pubs = pubsDesde.filter((p) => !protegida(p)), quedan = pubsDesde.filter(protegida);
    const sinSemana = (t) => !M().dia(t.semana_inicio);
    const temas = App.temas.filter((t) => {
      const desdeT = M().dia(t.semana_inicio) && M().lunesDe(M().dia(t.semana_inicio)) >= desde;
      if (!desdeT && !(op.banco && sinSemana(t))) return false;
      const suyas = App.pubs.filter((p) => p.tema_id === t.Title);
      return !suyas.some((p) => pubs.indexOf(p) < 0);   // solo si todas sus publicaciones se borran (o no tiene)
    });
    return { pubs, quedan, temas, temasQuedan: App.temas.filter((t) => M().dia(t.semana_inicio) && M().lunesDe(M().dia(t.semana_inicio)) >= desde && temas.indexOf(t) < 0) };
  }

  async function columnas(lista) {
    try { const r = await G.llamar('GET', '/sites/' + await G.sitio(CFG.sitio.host, CFG.sitio.ruta) + '/lists/' + await G.listaId(lista) + '/columns?$select=name&$top=200'); return (r.value || []).map((c) => c.name); }
    catch (e) { return null; }
  }

  function dialogo(alTerminar) {
    if (!puede()) { U.aviso('Solo la Dirección de Operaciones puede reemplazar el plan.', 'err'); return; }
    const lunesSig = M().lunesDe(M().sumarDias(M().hoyISO(), 7));
    let filas = null;
    U.modal('Reemplazar el plan desde una semana', '<div class="ic-form"><div class="ic-campos">' +
      '<div class="ic-campo c4"><label for="rpDesde">Desde la semana del (lunes)</label><input type="date" id="rpDesde" value="' + lunesSig + '"></div>' +
      '<div class="ic-campo c8"><label for="rpArch">Plan de marketing (Excel, hoja «Temas»)</label><input type="file" id="rpArch" accept=".xlsx,.xls"></div>' +
      '<div class="ic-campo c12"><label class="sec" style="display:flex;gap:6px;align-items:center;font-weight:400"><input type="checkbox" id="rpSep" checked> Separar «Facebook / Instagram» en dos publicaciones (Instagram el martes si la fila es del lunes)</label>' +
      '<label class="sec" style="display:flex;gap:6px;align-items:center;font-weight:400"><input type="checkbox" id="rpYt"> Crear también la publicación de YouTube cuando la fila dice «TikTok / Youtube»</label>' +
      '<label class="sec" style="display:flex;gap:6px;align-items:center;font-weight:400"><input type="checkbox" id="rpBanco"> Borrar también los temas sin semana (banco) que no tienen publicaciones</label></div></div>' +
      '<div id="rpRes"><p class="sec">Elija la semana y el archivo: antes de cambiar nada se muestra qué se borra y qué se carga.</p></div>' +
      '<div class="ic-acciones"><span class="espacio"></span><button class="ic-btn sec" id="rpNo">Cancelar</button><button class="ic-btn" id="rpOk" disabled>Reemplazar</button></div></div>', (m) => {
      const $ = (s) => m.querySelector(s), res = $('#rpRes'), ok = $('#rpOk');
      $('#rpNo').onclick = U.cerrarModal;
      const op = () => ({ separar: $('#rpSep').checked, youtube: $('#rpYt').checked, banco: $('#rpBanco').checked });
      let plan = null, borrar = null;
      const resumen = () => {
        const desde = M().lunesDe($('#rpDesde').value || lunesSig);
        if (!filas) return;
        plan = armar(filas, desde, op()); borrar = aBorrar(desde, op());
        const nPubs = plan.temas.reduce((n, t) => n + t.pubs.length, 0), banco = plan.temas.filter((t) => !t.semana_inicio).length;
        const porCanal = {}; plan.temas.forEach((t) => t.pubs.forEach((p) => { porCanal[p.canal] = (porCanal[p.canal] || 0) + 1; }));
        const ultima = plan.temas.map((t) => t.semana_inicio).filter(Boolean).pop();
        res.innerHTML = '<h3 class="img-dia">Se borra (desde el ' + esc(M().fLarga(desde)) + ')</h3><p>' + borrar.temas.length + ' tema(s) y ' + borrar.pubs.length + ' publicación(es) del plan actual, con lo que se les haya trabajado (copys, imágenes, aprobaciones).</p>' +
          (borrar.quedan.length ? '<p class="sec">No se tocan ' + borrar.quedan.length + ' publicación(es) programadas, publicadas o con métricas' + (borrar.temasQuedan.length ? ' ni sus ' + borrar.temasQuedan.length + ' tema(s)' : '') + ': ' + borrar.quedan.slice(0, 8).map((p) => esc(p.Title + ' (' + p.estado + ')')).join(', ') + (borrar.quedan.length > 8 ? '…' : '') + '</p>' : '') +
          '<h3 class="img-dia">Se carga del Excel</h3><p>' + plan.temas.length + ' tema(s): ' + (plan.temas.length - banco) + ' con semana (hasta la del ' + esc(M().fLarga(ultima || desde)) + ') y ' + banco + ' sin fecha, al banco.<br>' +
          nPubs + ' publicación(es), todas Planeadas: ' + Object.keys(porCanal).sort((a, b) => M().ordenRed(a) - M().ordenRed(b)).map((k) => esc(k) + ' ' + porCanal[k]).join(' · ') + '.</p>' +
          (plan.ignoradas ? '<p class="sec">' + plan.ignoradas + ' fila(s) del Excel con fecha anterior al ' + esc(M().fCorta(desde)) + ' no se cargan.</p>' : '') +
          '<div class="ic-alerta chica">Esto no se puede deshacer. Si quiere respaldo, descargue antes el Excel del plan actual: botón «Excel» en Publicaciones.</div>';
        ok.disabled = !plan.temas.length;
      };
      $('#rpArch').onchange = async (e) => {
        const f = e.target.files[0]; if (!f) return;
        res.innerHTML = '<p class="sec">Leyendo el archivo…</p>'; ok.disabled = true;
        try { filas = await leerExcel(f); resumen(); } catch (x) { filas = null; res.innerHTML = '<div class="ic-alerta">' + esc(U.mensajeError(x)) + '</div>'; }
      };
      ['#rpDesde', '#rpSep', '#rpYt', '#rpBanco'].forEach((s) => { $(s).onchange = resumen; });
      ok.onclick = async () => {
        if (!plan) return;
        if (!(await U.confirmar('Reemplazar el plan', 'Se borrarán ' + borrar.temas.length + ' tema(s) y ' + borrar.pubs.length + ' publicación(es), y se cargarán ' + plan.temas.length + ' tema(s) y ' + plan.temas.reduce((n, t) => n + t.pubs.length, 0) + ' publicación(es) del Excel.\n\nNo se puede deshacer.', 'Reemplazar'))) return;
        await aplicar(plan, borrar, m, alTerminar);
      };
    });
  }

  async function aplicar(plan, borrar, m, alTerminar) {
    const res = m.querySelector('#rpRes'), botones = m.querySelectorAll('button'); botones.forEach((b) => { b.disabled = true; });
    const paso = (t) => { res.innerHTML = '<p><b>' + esc(t) + '</b></p><p class="sec">No cierre esta ventana.</p>'; };
    const err = [];
    try {
      let n = 0;
      for (const p of borrar.pubs) { if (++n % 10 === 0) paso('Borrando publicaciones: ' + n + ' de ' + borrar.pubs.length + '…'); try { await G.eliminar(L.pubs, p._id); } catch (e) { err.push(p.Title + ': ' + U.mensajeError(e)); } }
      n = 0;
      for (const t of borrar.temas) { if (++n % 10 === 0) paso('Borrando temas: ' + n + ' de ' + borrar.temas.length + '…'); try { await G.eliminar(L.temas, t._id); } catch (e) { err.push(t.Title + ': ' + U.mensajeError(e)); } }
      const [colT, colP] = await Promise.all([columnas(L.temas), columnas(L.pubs)]);
      const solo = (o, cols) => { const r = {}; Object.keys(o).forEach((k) => { if (o[k] !== '' && o[k] != null && (!cols || k === 'Title' || cols.indexOf(k) >= 0)) r[k] = o[k]; }); return r; };
      const faltan = colT ? ['publico', 'recurso_visual', 'etapa_embudo', 'control_previo'].filter((k) => colT.indexOf(k) < 0) : [];
      let nT = await G.reservar('TEM', plan.temas.length);
      const totP = plan.temas.reduce((a, t) => a + t.pubs.length, 0);
      let nP = totP ? await G.reservar('PUB', totP) : 0, hechos = 0;
      for (const [i, t] of plan.temas.entries()) {
        if (i % 5 === 0) paso('Cargando temas y publicaciones: ' + i + ' de ' + plan.temas.length + ' temas…');
        const id = 'TEM-' + M().pad(nT++, 4), campos = { Title: id, estado: 'ACTIVO', orden: nT };
        CAMPOS_T.forEach((k) => { campos[k] = t[k]; });
        if (t.semana_inicio) campos.semana_inicio = t.semana_inicio;
        try { await G.crear(L.temas, solo(campos, colT)); } catch (e) { err.push(id + ': ' + U.mensajeError(e)); continue; }
        for (const p of t.pubs) {
          const pid = 'PUB-' + M().pad(nP++, 5);
          const f = { Title: pid, tema_id: id, fecha: p.fecha, fecha_semana: t.semana_inicio || M().lunesDe(p.fecha), canal: p.canal, formato: p.formato, titulo: p.titulo, estado: 'Planeada', origen_id: p.origen_id };
          try { await G.crear(L.pubs, solo(f, colP)); hechos++; } catch (e) { err.push(pid + ': ' + U.mensajeError(e)); }
        }
      }
      U.cerrarModal();
      if (faltan.length) U.aviso('Plan cargado sin «' + faltan.join('», «') + '»: falta actualizar la lista de temas (Instalador IC Apps › Crear estructura).', 'warn', 12000);
      U.aviso('Plan reemplazado: ' + borrar.temas.length + ' tema(s) y ' + borrar.pubs.length + ' publicación(es) borrados; ' + plan.temas.length + ' tema(s) y ' + hechos + ' publicación(es) cargados.' + (err.length ? ' Con ' + err.length + ' error(es): ' + err.slice(0, 3).join(' · ') : ''), err.length ? 'warn' : 'ok', 14000);
    } catch (e) { U.aviso('Se detuvo el reemplazo: ' + U.mensajeError(e) + (err.length ? ' · ' + err.slice(0, 3).join(' · ') : ''), 'err', 14000); U.cerrarModal(); }
    alTerminar && alTerminar();
  }

  return { dialogo, puede, leerExcel, armar };
})();
