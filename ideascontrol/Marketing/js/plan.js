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
        // La confirmación usa la misma ventana: se abre una nueva solo para el avance
        U.modal('Reemplazando el plan', '<div class="ic-form"><div id="rpRes"><p><b>Empezando…</b></p></div></div>', (m2) => { aplicar(plan, borrar, m2, alTerminar); });
      };
    });
  }

  // ---------- Envío por lotes ($batch de Graph: 20 operaciones por llamada) ----------
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const limpiar = (o) => { const r = {}; Object.keys(o).forEach((k) => { let v = o[k]; if (v === '' || v == null) return; if (k !== 'Title' && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) v += 'T12:00:00Z'; r[k] = v; }); return r; };
  async function lotes(ops, avance) {   // ops: [{ method, url, body, nombre }]
    const err = []; let hechos = 0;
    for (let i = 0; i < ops.length; i += 20) {
      let pend = ops.slice(i, i + 20).map((o, k) => Object.assign({ id: String(i + k) }, o));
      for (let intento = 1; pend.length && intento <= 6; intento++) {
        const r = await G.llamar('POST', '/$batch', { requests: pend.map((o) => { const q = { id: o.id, method: o.method, url: o.url }; if (o.body) { q.body = o.body; q.headers = { 'Content-Type': 'application/json' }; } return q; }) });
        const reintentar = []; let pausa = 0;
        (r.responses || []).forEach((x) => {
          const o = pend.find((y) => y.id === x.id);
          if (x.status >= 200 && x.status < 300 || (o.method === 'DELETE' && x.status === 404)) hechos++;
          else if (x.status === 429 || x.status === 503 || x.status === 504) { reintentar.push(o); pausa = Math.max(pausa, Number((x.headers || {})['Retry-After'] || intento * 2)); }
          else err.push(o.nombre + ': ' + ((x.body && x.body.error && x.body.error.message) || ('error ' + x.status)));
        });
        pend = reintentar;
        if (pend.length) await espera(pausa * 1000);
      }
      pend.forEach((o) => err.push(o.nombre + ': SharePoint no respondió (intente de nuevo)'));
      avance(Math.min(ops.length, i + 20), ops.length);
    }
    return { hechos, err };
  }

  async function aplicar(plan, borrar, m, alTerminar) {
    const res = m.querySelector('#rpRes'); m.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    const paso = (t, n, tot) => { res.innerHTML = '<p><b>' + esc(t) + '</b></p>' + (tot ? '<div class="ic-barra-prog"><div style="width:' + Math.round(100 * n / tot) + '%"></div></div>' : '') + '<p class="sec">No cierre ni recargue esta pestaña hasta que termine. Si se interrumpe, vuelva a ejecutarlo: continúa donde quedó.</p>'; };
    const noSalir = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', noSalir);
    let err = [], nTemas = 0, nPubs = 0;
    try {
      const sid = await G.sitio(CFG.sitio.host, CFG.sitio.ruta), lT = await G.listaId(L.temas), lP = await G.listaId(L.pubs);
      const urlT = '/sites/' + sid + '/lists/' + lT + '/items', urlP = '/sites/' + sid + '/lists/' + lP + '/items';
      paso('Borrando el plan anterior…', 0, 1);
      let r = await lotes(borrar.pubs.map((p) => ({ method: 'DELETE', url: urlP + '/' + p._id, nombre: p.Title })), (n, t) => paso('Borrando publicaciones: ' + n + ' de ' + t, n, t));
      err = err.concat(r.err);
      r = await lotes(borrar.temas.map((t) => ({ method: 'DELETE', url: urlT + '/' + t._id, nombre: t.Title })), (n, t) => paso('Borrando temas: ' + n + ' de ' + t, n, t));
      err = err.concat(r.err);
      const [colT, colP] = await Promise.all([columnas(L.temas), columnas(L.pubs)]);
      const solo = (o, cols) => { const x = {}; Object.keys(o).forEach((k) => { if (!cols || k === 'Title' || cols.indexOf(k) >= 0) x[k] = o[k]; }); return limpiar(x); };
      const faltan = colT ? ['publico', 'recurso_visual', 'etapa_embudo', 'control_previo'].filter((k) => colT.indexOf(k) < 0) : [];
      paso('Reservando la numeración…', 0, 1);
      let nT = await G.reservar('TEM', plan.temas.length);
      const totP = plan.temas.reduce((a, t) => a + t.pubs.length, 0);
      let nP = totP ? await G.reservar('PUB', totP) : 0;
      const opsT = [], opsP = [];
      plan.temas.forEach((t) => {
        const id = 'TEM-' + M().pad(nT++, 4), campos = { Title: id, estado: 'ACTIVO', orden: nT };
        CAMPOS_T.forEach((k) => { campos[k] = t[k]; });
        if (t.semana_inicio) campos.semana_inicio = t.semana_inicio;
        opsT.push({ method: 'POST', url: urlT, body: { fields: solo(campos, colT) }, nombre: id });
        t.pubs.forEach((p) => {
          const pid = 'PUB-' + M().pad(nP++, 5);
          opsP.push({ method: 'POST', url: urlP, body: { fields: solo({ Title: pid, tema_id: id, fecha: p.fecha, fecha_semana: t.semana_inicio || M().lunesDe(p.fecha), canal: p.canal, formato: p.formato, titulo: p.titulo, estado: 'Planeada', origen_id: p.origen_id }, colP) }, nombre: pid });
        });
      });
      r = await lotes(opsT, (n, t) => paso('Cargando temas: ' + n + ' de ' + t, n, t)); err = err.concat(r.err); nTemas = r.hechos;
      r = await lotes(opsP, (n, t) => paso('Cargando publicaciones: ' + n + ' de ' + t, n, t)); err = err.concat(r.err); nPubs = r.hechos;
      U.cerrarModal();
      if (faltan.length) U.aviso('Plan cargado sin «' + faltan.join('», «') + '»: falta actualizar la lista de temas (Instalador IC Apps › Crear estructura).', 'warn', 12000);
      U.aviso('Plan reemplazado: ' + borrar.temas.length + ' tema(s) y ' + borrar.pubs.length + ' publicación(es) borrados; ' + nTemas + ' tema(s) y ' + nPubs + ' publicación(es) cargados.' + (err.length ? ' Con ' + err.length + ' error(es): ' + err.slice(0, 3).join(' · ') : ''), err.length ? 'warn' : 'ok', 15000);
    } catch (e) { console.error(e); U.cerrarModal(); U.aviso('Se detuvo el reemplazo: ' + U.mensajeError(e) + '. Vuelva a ejecutarlo: continúa donde quedó.' + (err.length ? ' · ' + err.slice(0, 3).join(' · ') : ''), 'err', 15000); }
    finally { window.removeEventListener('beforeunload', noSalir); }
    alTerminar && alTerminar();
  }

  return { dialogo, puede, leerExcel, armar };
})();
