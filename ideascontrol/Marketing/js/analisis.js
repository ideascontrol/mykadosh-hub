/* =====================================================================
   APP-112 · Marketing — Análisis del periodo con Claude (en #resumen)
   1. La app arma el prompt con los números del periodo: totales vs. metas, periodo anterior, por red,
      por semana de campaña, cada post y los temas.
   2. Se pega en Claude; la respuesta (JSON) se pega de vuelta.
   3. Se guarda en SharePoint (Documentos/Marketing/Informes/Analisis_<desde>_<hasta>.json), se muestra en el
      Resumen y se genera el informe en Word (Informe_Marketing_<desde>_<hasta>.docx).
   ===================================================================== */
window.MKT_AN = (function () {
  'use strict';
  const U = IC.ui, esc = U.esc, G = IC.graph;
  const M = () => window.MKT;
  const CARPETA = 'Marketing/Informes';
  const cache = {};   // análisis leídos por periodo

  const ruta = (rd, rh, ext) => CARPETA + '/' + (ext === 'docx' ? 'Informe_Marketing_' : 'Analisis_') + rd + '_' + rh + '.' + ext;
  const n0 = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
  const num = (v) => Math.round(n0(v)).toLocaleString('es-CO');
  const pct = (v) => (v === null || !isFinite(v)) ? '—' : (Math.round(v * 1000) / 10).toLocaleString('es-CO') + ' %';
  const inter = (m) => n0(m.reacciones) + n0(m.comentarios) + n0(m.compartidos) + n0(m.guardados) + n0(m.clics);
  const ordRed = (r) => { const i = CFG.redes.indexOf(r); return i < 0 ? 99 : i; };
  const porFechaRed = (a, b) => String(a.fecha || '').localeCompare(String(b.fecha || '')) || ordRed(a.red) - ordRed(b.red) || String(a.nombre || '').localeCompare(String(b.nombre || ''));
  // Ordena lo que devuelve Claude por fecha y red (si trae esos datos); por_red siempre en el orden de las redes
  function ordenar(a) {
    if (!a) return a;
    ['destacados', 'alertas', 'recomendaciones'].forEach((k) => { if (Array.isArray(a[k])) a[k] = a[k].map((x, i) => Object.assign({ _i: i }, x)).sort((x, y) => (x.fecha && y.fecha ? String(x.fecha).localeCompare(String(y.fecha)) : 0) || ((x.red && y.red) ? ordRed(x.red) - ordRed(y.red) : 0) || x._i - y._i); });
    if (Array.isArray(a.por_red)) a.por_red = a.por_red.slice().sort((x, y) => ordRed(x.red) - ordRed(y.red));
    return a;
  }
  const dentro = (m, a, b) => { const f = M().dia(m.fecha_campana || m.fecha_publicacion); return f >= a && f <= b; };

  // ---------- datos del periodo ----------
  function totales(ms) {
    const S = (k) => ms.reduce((s, m) => s + n0(m[k]), 0);
    const t = { registros: ms.length, alcance: S('alcance'), impresiones: S('impresiones'), interacciones: ms.reduce((s, m) => s + inter(m), 0), clics: S('clics'),
      nuevos_seguidores: S('nuevos_seguidores'), reproducciones: S('reproducciones'), inversion: S('inversion'), resultados: S('resultados'), leads: S('leads') };
    t.tasa = t.alcance ? t.interacciones / t.alcance : null;
    t.costo_resultado = t.inversion && t.resultados ? t.inversion / t.resultados : null;
    t.costo_clic = t.inversion && t.clics ? t.inversion / t.clics : null;
    return t;
  }
  function datos(rd, rh) {
    const ms = App.mets.filter((m) => dentro(m, rd, rh));
    const dias = Math.round((new Date(rh) - new Date(rd)) / 864e5) + 1;
    const ard = M().sumarDias(rd, -dias), arh = M().sumarDias(rd, -1);
    const pl = App.pubs.filter((p) => M().dia(p.fecha) >= rd && M().dia(p.fecha) <= rh && p.estado !== 'Cancelada');
    const redes = CFG.redes.map((r) => ({ red: r, t: totales(ms.filter((m) => m.red === r)) })).filter((x) => x.t.registros);
    const semanas = {};
    ms.forEach((m) => { const s = M().dia(m.fecha_campana) || M().lunesDe(M().dia(m.fecha_publicacion)); (semanas[s] = semanas[s] || []).push(m); });
    const temas = App.temas.filter((t) => { const l = M().dia(t.semana_inicio); return l && l >= M().lunesDe(rd) && l <= rh; }).sort((a, b) => M().dia(a.semana_inicio).localeCompare(M().dia(b.semana_inicio)));
    const siguiente = App.temas.filter((t) => M().dia(t.semana_inicio) > rh).sort((a, b) => M().dia(a.semana_inicio).localeCompare(M().dia(b.semana_inicio)))[0] || null;
    const posts = ms.slice().map((m) => {
      const p = m.publicacion_id ? App.pubs.find((x) => x.Title === m.publicacion_id) : null;
      return { id: m.Title, pub: m.publicacion_id || '', red: m.red || '', tipo: m.tipo || '', formato: p ? (p.formato || '') : '', fecha: M().dia(m.fecha_publicacion), nombre: M().nombreCorto(m.nombre || ''),
        alcance: n0(m.alcance), impresiones: n0(m.impresiones), interacciones: inter(m), clics: n0(m.clics), reproducciones: n0(m.reproducciones), inversion: n0(m.inversion), resultados: n0(m.resultados), notas: String(m.notas || '').replace(/^Importado de[^\n]*/i, '').trim().slice(0, 200) };
    }).sort(porFechaRed);
    return { rd, rh, dias, total: totales(ms), anterior: { rd: ard, rh: arh, t: totales(App.mets.filter((m) => dentro(m, ard, arh))) }, redes,
      semanas: Object.keys(semanas).sort().map((s) => ({ semana: s, t: totales(semanas[s]), tema: (App.temas.find((t) => M().dia(t.semana_inicio) === s) || {}).tema || '' })),
      plan: { planeadas: pl.length, publicadas: pl.filter((p) => p.estado === 'Publicada').length }, temas, siguiente, posts, metas: CFG.metas };
  }

  // ---------- prompt ----------
  function prompt(d) {
    const T = (t) => 'alcance ' + num(t.alcance) + ' · impresiones ' + num(t.impresiones) + ' · interacciones ' + num(t.interacciones) + ' · tasa ' + pct(t.tasa) + ' · clics ' + num(t.clics) +
      ' · nuevos seguidores ' + num(t.nuevos_seguidores) + ' · reproducciones ' + num(t.reproducciones) + (t.inversion ? ' · inversión $' + num(t.inversion) + ' · resultados ' + num(t.resultados) + (t.costo_resultado ? ' · costo por resultado $' + num(t.costo_resultado) : '') : '') + ' · registros ' + t.registros;
    const L = [];
    L.push('Actúa como analista senior de marketing digital B2B. Analiza los resultados de redes sociales de Ideas Control Equipos y Soluciones S.A.S. (biometría, control de tiempo y asistencia y WFM en Colombia) para el informe a gerencia.');
    L.push('', 'Reglas:', '- Usa SOLO los datos de abajo. No inventes cifras, causas ni resultados. Si un dato falta o es poco confiable, dilo en "nota_datos".',
      '- Compara contra las metas del periodo y contra el periodo anterior (variación en %). Ojo: si el periodo anterior tiene pocos registros, la comparación es débil; dilo.',
      '- Explica qué funcionó y qué no por red, formato, tipo (orgánico o pago) y ángulo del contenido (usa los nombres de los posts).',
      '- ORDEN: presenta todo en orden de fecha (de la más antigua a la más reciente) y, dentro de cada fecha, por red en este orden: ' + CFG.redes.join(', ') + '. En "destacados", "alertas" y "recomendaciones" indica "fecha" (AAAA-MM-DD del post o la semana a la que se refiere) y "red" (o "Todas"). En "por_red" usa ese mismo orden de redes.',
      '- Las recomendaciones deben ser concretas y accionables para la próxima semana (qué hacer, en qué red, con qué formato), priorizadas.',
      '- Tono: claro, directo, profesional, en español de Colombia, para gerentes que no son expertos en redes. Frases cortas. No uses la expresión «cualquier industria».');
    L.push('', '═══ PERIODO: ' + M().fLarga(d.rd) + ' al ' + M().fLarga(d.rh) + ' (' + d.dias + ' días; las métricas se agrupan por semana de campaña = lunes)');
    L.push('Totales: ' + T(d.total));
    L.push('Periodo anterior (' + M().fLarga(d.anterior.rd) + ' al ' + M().fLarga(d.anterior.rh) + '): ' + T(d.anterior.t));
    L.push('Metas del periodo: alcance ' + num(d.metas.alcance) + ' · interacciones ' + num(d.metas.interacciones) + ' · clics ' + num(d.metas.clics) + ' · uso de microapps ' + num(d.metas.microapps) + ' · leads ' + num(d.metas.leads));
    L.push('Plan: ' + d.plan.publicadas + ' publicadas de ' + d.plan.planeadas + ' planeadas en el portal.');
    if (d.temas.length) L.push('', 'Temas de las semanas:', d.temas.map((t) => '- Semana ' + M().dia(t.semana_inicio) + ': «' + t.tema + '» · objetivo: ' + (t.objetivo || '—') + ' · CTA: ' + (t.cta || '—') + ' · microapp: ' + (t.microapp || '—')).join('\n'));
    if (d.siguiente) L.push('', 'Tema de la próxima semana (' + M().dia(d.siguiente.semana_inicio) + '): «' + d.siguiente.tema + '» · hook: ' + (d.siguiente.hook || '—') + ' · objetivo: ' + (d.siguiente.objetivo || '—'));
    L.push('', 'Por red:', d.redes.map((r) => '- ' + r.red + ': ' + T(r.t)).join('\n') || '- (sin datos)');
    L.push('', 'Por semana de campaña:', d.semanas.map((s) => '- ' + s.semana + (s.tema ? ' «' + s.tema + '»' : '') + ': ' + T(s.t)).join('\n') || '- (sin datos)');
    L.push('', 'Posts del periodo (ordenados por fecha y red; máximo 60):');
    d.posts.slice(0, 60).forEach((p) => L.push('- ' + [p.fecha, p.red, p.tipo, p.formato, '«' + p.nombre + '»', 'alcance ' + num(p.alcance), 'impr. ' + num(p.impresiones), 'interac. ' + num(p.interacciones), 'clics ' + num(p.clics),
      p.reproducciones ? 'reprod. ' + num(p.reproducciones) : '', p.inversion ? 'inversión $' + num(p.inversion) + ' · resultados ' + num(p.resultados) : '', p.notas ? 'nota: ' + p.notas : ''].filter(Boolean).join(' · ')));
    L.push('', '═══ FORMATO DE RESPUESTA (obligatorio)', 'Responde ÚNICAMENTE con un bloque de código JSON válido, sin texto antes ni después:', '```json', '{',
      '  "tipo": "analisis_marketing",',
      '  "titular": "una frase que resuma el periodo",',
      '  "resumen": ["párrafo 1 (qué pasó, con cifras clave)", "párrafo 2 (contra metas y periodo anterior)"],',
      '  "destacados": [ { "fecha": "AAAA-MM-DD", "red": "", "titulo": "lo que funcionó", "detalle": "con cifras y por qué" } ],',
      '  "alertas": [ { "fecha": "AAAA-MM-DD", "red": "", "titulo": "lo que preocupa o no funcionó", "detalle": "" } ],',
      '  "por_red": [ { "red": "Facebook", "lectura": "", "recomendacion": "" } ],',
      '  "aprendizajes": ["aprendizaje sobre formatos, ángulos u horarios"],',
      '  "recomendaciones": [ { "fecha": "AAAA-MM-DD (cuándo aplicarla)", "accion": "", "por_que": "", "red": "", "prioridad": "Alta | Media | Baja" } ],',
      '  "proxima_semana": { "enfoque": "cómo aplicar lo aprendido al tema de la próxima semana", "ideas": ["", ""] },',
      '  "nota_datos": "limitaciones de los datos (vacíos, redes sin importar, comparaciones débiles)"',
      '}', '```', 'Escapa las comillas dobles dentro del texto como \\".');
    return L.join('\n');
  }

  // ---------- leer / guardar ----------
  function extraer(txt) {
    let s = String(txt || '').trim();
    const f = s.match(/```(?:json)?\s*([\s\S]*?)```/i); if (f) s = f[1].trim();
    const a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a < 0 || b <= a) throw new Error('No encontré el bloque JSON. Copie la respuesta completa de Claude (botón «Copiar» del bloque de código).');
    let d;
    try { d = JSON.parse(s.slice(a, b + 1)); } catch (e) { try { d = JSON.parse(s.slice(a, b + 1).replace(/[“”]/g, '"').replace(/,\s*([}\]])/g, '$1')); } catch (e2) { throw new Error('La respuesta no es un JSON válido. Pídale a Claude: «Devuélvelo de nuevo solo como JSON válido».'); } }
    if (!d.titular && !(d.resumen || []).length) throw new Error('La respuesta no trae "titular" ni "resumen". ¿Es la respuesta del análisis?');
    return d;
  }
  async function leerGuardado(rd, rh) {
    const k = rd + '_' + rh;
    if (k in cache) return cache[k];
    try {
      const sid = await G.sitio(CFG.sitio.host, CFG.sitio.ruta);
      const meta = await G.llamar('GET', '/sites/' + sid + '/drive/root:/' + M().rutaUrl(ruta(rd, rh, 'json')));
      const r = await fetch(meta['@microsoft.graph.downloadUrl']); if (!r.ok) throw new Error('descarga');
      cache[k] = ordenar(await r.json());
    } catch (e) { cache[k] = null; }
    return cache[k];
  }

  // ---------- logo para el Word ----------
  async function logo() {
    try {
      const b = await (await fetch(CFG.logo)).blob(), img = await createImageBitmap(b);
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; cv.getContext('2d').drawImage(img, 0, 0);
      const png = await new Promise((ok) => cv.toBlob(ok, 'image/png'));
      return { data: await png.arrayBuffer(), alto: Math.round(150 * img.height / img.width) };
    } catch (e) { return null; }
  }
  async function word(d, a) {
    return IC_DOCX.informe(d, a, { logo: await logo(), periodo: M().fLarga(d.rd) + ' al ' + M().fLarga(d.rh) });
  }
  function descargar(blob, nombre) {
    const el = document.createElement('a'); el.href = URL.createObjectURL(blob); el.download = nombre; document.body.appendChild(el); el.click();
    setTimeout(() => { URL.revokeObjectURL(el.href); el.remove(); }, 1500);
  }

  // =====================================================================
  // SECCIÓN EN EL RESUMEN
  // =====================================================================
  function tarjeta(a) {
    const lista = (arr, f) => (arr || []).filter(Boolean).map(f).join('');
    const prio = (p) => '<span class="an-prio ' + esc(U.norm(p || 'media').split(' ')[0]) + '">' + esc(p || 'Media') + '</span>';
    const etq = (x) => (x.fecha || x.red) ? '<span class="an-etq">' + esc([x.fecha && /^\d{4}-\d{2}-\d{2}/.test(x.fecha) ? M().fCorta(x.fecha) : x.fecha, x.red].filter(Boolean).join(' · ')) + '</span> ' : '';
    return '<div class="an-card">' +
      '<p class="an-meta">Análisis de Claude · ' + esc(a._meta ? new Date(a._meta.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) + (a._meta.por ? ' · pegado por ' + a._meta.por : '') : '') + '</p>' +
      (a.titular ? '<h3 class="an-tit">' + esc(a.titular) + '</h3>' : '') +
      lista(a.resumen, (p) => '<p>' + esc(p) + '</p>') +
      ((a.destacados || []).length || (a.alertas || []).length ? '<div class="an-2">' +
        '<div class="an-caja ok"><h4>✅ Lo que funcionó</h4>' + lista(a.destacados, (x) => '<p>' + etq(x) + '<b>' + esc(x.titulo || '') + '.</b> ' + esc(x.detalle || '') + '</p>') + '</div>' +
        '<div class="an-caja alerta"><h4>⚠️ Para revisar</h4>' + (lista(a.alertas, (x) => '<p>' + etq(x) + '<b>' + esc(x.titulo || '') + '.</b> ' + esc(x.detalle || '') + '</p>') || '<p>—</p>') + '</div></div>' : '') +
      ((a.por_red || []).length ? '<h4 class="an-h4">Por red</h4><div class="an-redes">' + lista(a.por_red, (r) => '<div><b>' + esc(r.red || '') + '</b><p>' + esc(r.lectura || '') + '</p>' + (r.recomendacion ? '<p class="an-rec">→ ' + esc(r.recomendacion) + '</p>' : '') + '</div>') + '</div>' : '') +
      ((a.recomendaciones || []).length ? '<h4 class="an-h4">Recomendaciones</h4><ol class="an-recs">' + lista(a.recomendaciones, (r) => '<li>' + prio(r.prioridad) + ' <b>' + esc(r.accion || '') + '</b>' + (r.red || r.fecha ? ' <span class="sec">(' + esc([r.red, r.fecha && /^\d{4}-\d{2}-\d{2}/.test(r.fecha) ? M().fCorta(r.fecha) : r.fecha].filter(Boolean).join(' · ')) + ')</span>' : '') + (r.por_que ? '<br><span class="sec">' + esc(r.por_que) + '</span>' : '') + '</li>') + '</ol>' : '') +
      ((a.aprendizajes || []).length ? '<h4 class="an-h4">Aprendizajes</h4><ul>' + lista(a.aprendizajes, (x) => '<li>' + esc(x) + '</li>') + '</ul>' : '') +
      (a.proxima_semana && (a.proxima_semana.enfoque || (a.proxima_semana.ideas || []).length) ? '<h4 class="an-h4">Para la próxima semana</h4>' + (a.proxima_semana.enfoque ? '<p>' + esc(a.proxima_semana.enfoque) + '</p>' : '') + '<ul>' + lista(a.proxima_semana.ideas, (x) => '<li>' + esc(x) + '</li>') + '</ul>' : '') +
      (a.nota_datos ? '<p class="an-nota">Sobre los datos: ' + esc(a.nota_datos) + '</p>' : '') + '</div>';
  }

  // Busca el Word del periodo en SharePoint (no depende de lo anotado al guardar)
  async function wordGuardado(rd, rh) {
    try { const sid = await G.sitio(CFG.sitio.host, CFG.sitio.ruta); const m = await G.llamar('GET', '/sites/' + sid + '/drive/root:/' + M().rutaUrl(ruta(rd, rh, 'docx'))); return m && m.webUrl ? m.webUrl : ''; }
    catch (e) { return ''; }
  }
  // Todos los periodos con análisis guardado (archivos Analisis_AAAA-MM-DD_AAAA-MM-DD.json de la carpeta Informes)
  async function guardados() {
    try {
      const sid = await G.sitio(CFG.sitio.host, CFG.sitio.ruta);
      const r = await G.llamar('GET', '/sites/' + sid + '/drive/root:/' + M().rutaUrl(CARPETA) + ':/children?$top=200&$select=name,webUrl,lastModifiedDateTime');
      const hijos = r.value || [], words = {};
      hijos.forEach((h) => { const m = String(h.name).match(/^Informe_Marketing_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})\.docx$/); if (m) words[m[1] + '_' + m[2]] = h.webUrl; });
      return hijos.map((h) => { const m = String(h.name).match(/^Analisis_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})\.json$/); return m ? { rd: m[1], rh: m[2], fecha: h.lastModifiedDateTime, word: words[m[1] + '_' + m[2]] || '' } : null; })
        .filter(Boolean).sort((a, b) => b.rd.localeCompare(a.rd) || b.rh.localeCompare(a.rh));
    } catch (e) { return []; }
  }
  async function pintarGuardados(cont, rd, rh, alElegir) {
    const el = cont.querySelector('#anLista'); if (!el) return;
    const l = await guardados();
    if (!el.isConnected) return;
    el.innerHTML = l.length ? '<h4 class="an-h4">Informes guardados</h4><div class="an-lista">' + l.map((x) => '<div class="an-li' + (x.rd === rd && x.rh === rh ? ' on' : '') + '"><a href="#" data-p="' + x.rd + '_' + x.rh + '">' + esc(M().fCorta(x.rd) + ' – ' + M().fLarga(x.rh)) + '</a>' +
      (x.word ? '<a class="sec" href="' + esc(x.word) + '" target="_blank" rel="noopener">Word ↗</a>' : '') + '</div>').join('') + '</div>' : '';
    el.querySelectorAll('[data-p]').forEach((a) => { a.onclick = (ev) => { ev.preventDefault(); const [d, h] = a.dataset.p.split('_'); if (alElegir) alElegir(d, h); }; });
  }

  // ---------- Comentarios de gerencia sobre el informe (se guardan dentro del mismo análisis) ----------
  function pintarComentarios(c, rd, rh, a, repintar) {
    const el = c.querySelector('#anComent'); if (!el) return;
    const cs = (a._comentarios || []).slice();
    const vistos = Object.keys(CFG.usuarios).map((email) => { const v = cs.filter((x) => x.email === email).pop(); return '<span class="rev-per ' + (v ? 'ok' : 'pend') + '" title="' + esc(v ? 'Visto el ' + new Date(v.fecha).toLocaleString('es-CO') : 'Aún no lo ha visto') + '">' + esc(String(CFG.usuarios[email]).replace(/^Dirección (de )?/, '').replace('Gerencia General', 'Gerencia')) + (v ? ' ✔' : '') + '</span>'; }).join('');
    const yaVi = cs.some((x) => x.email === App.usuario.email);
    el.innerHTML = '<section class="an-coment"><h4 class="an-h4" style="margin-top:0">Comentarios de gerencia</h4><div class="rev-pers" style="margin-bottom:8px">' + vistos + '</div>' +
      (cs.filter((x) => x.texto).map((x) => '<div class="an-com"><b>' + esc(x.nombre) + '</b> <span class="sec">' + esc(new Date(x.fecha).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })) + '</span><p>' + esc(x.texto) + '</p></div>').join('') || '<p class="sec">Todavía no hay comentarios.</p>') +
      '<div class="mkt-noimp"><textarea id="anComTxt" rows="2" placeholder="Escriba un comentario sobre el informe…" style="width:100%;margin-top:8px"></textarea>' +
      '<div class="gen-acc" style="margin-top:6px"><button class="ic-btn chico" id="anComOk">Comentar</button>' + (yaVi ? '' : '<button class="ic-btn sec chico" id="anVisto">Marcar como visto</button>') +
      '<button class="ic-btn sec chico" id="anAvisar">Avisar a gerencia ✉</button></div></div></section>';
    const guardar = (texto) => async () => {
      try {
        delete cache[rd + '_' + rh];
        const actual = (await leerGuardado(rd, rh)) || a;   // relee para no pisar comentarios de otra persona
        actual._comentarios = (actual._comentarios || []).concat([{ email: App.usuario.email, nombre: App.usuario.nombre, fecha: new Date().toISOString(), texto: texto || '' }]);
        await G.subirArchivo(ruta(rd, rh, 'json'), new Blob([JSON.stringify(actual, null, 2)], { type: 'application/json' }));
        cache[rd + '_' + rh] = actual; U.aviso(texto ? 'Comentario guardado' : 'Marcado como visto', 'ok'); repintar();
      } catch (e) { console.error(e); U.aviso(U.mensajeError(e), 'err', 8000); }
    };
    const bc = el.querySelector('#anComOk');
    if (bc) bc.onclick = () => { const t = el.querySelector('#anComTxt').value.trim(); if (!t) { U.aviso('Escriba el comentario', 'warn'); return; } U.conCarga(bc, guardar(t)); };
    const bv = el.querySelector('#anVisto'); if (bv) bv.onclick = () => U.conCarga(bv, guardar(''));
    el.querySelector('#anAvisar').onclick = () => {
      const para = Object.keys(CFG.usuarios).filter((e) => e !== App.usuario.email);
      const url = location.origin + '/ideascontrol/Marketing/#resumen/' + rd + '/' + rh;
      const cuerpo = 'Hola,\n\nYa está el informe de marketing del ' + M().fLarga(rd) + ' al ' + M().fLarga(rh) + (a.titular ? ':\n«' + a.titular + '»' : '.') + '\n\nLo pueden ver y comentar aquí (con su cuenta de Ideas Control):\n' + url + '\n\nGracias,\n' + App.usuario.nombre;
      location.href = 'mailto:' + para.join(';') + '?subject=' + encodeURIComponent('Informe de marketing · ' + M().fCorta(rd) + ' al ' + M().fCorta(rh)) + '&body=' + encodeURIComponent(cuerpo);
    };
  }

  async function pintar(cont, rd, rh, alElegir) {
    cont.innerHTML = '<section class="ic-bloque" style="margin-top:16px"><div class="cab"><h2>✨ Análisis con Claude</h2><span class="sec mkt-noimp">' + esc(M().fLarga(rd)) + ' al ' + esc(M().fLarga(rh)) + '</span></div><div class="cuerpo" id="anCuerpo"><p class="sec">Buscando un análisis guardado de este periodo…</p></div></section>';
    const a = await leerGuardado(rd, rh);
    const c = cont.querySelector('#anCuerpo'); if (!c) return;
    const d = datos(rd, rh);
    const pasos = '<div class="an-pasos mkt-noimp">' + (a ? '<details><summary>Volver a analizar este periodo</summary>' : '') +
      '<p class="sec" style="margin-top:' + (a ? '8px' : '0') + '">' + (d.total.registros ? '1) Copie el prompt (lleva los ' + d.total.registros + ' registros del periodo, las metas y el periodo anterior). 2) Péguelo en un chat nuevo de Claude. 3) Pegue aquí la respuesta.' : 'No hay métricas en este periodo. Importe las estadísticas primero (Métricas › Importar estadísticas).') + '</p>' +
      (d.total.registros ? '<div class="gen-acc"><button class="ic-btn" id="anCopiar">Copiar prompt</button><a class="ic-btn sec" href="https://claude.ai/new" target="_blank" rel="noopener">Abrir Claude ↗</a><button class="ic-btn sec" id="anVer">Ver prompt</button></div>' +
        '<textarea id="anResp" rows="5" placeholder="Pegue aquí la respuesta de Claude (el bloque JSON)…" style="width:100%;margin-top:10px;font-family:ui-monospace,Consolas,monospace;font-size:12.5px"></textarea>' +
        '<div class="gen-acc" style="margin-top:8px"><button class="ic-btn" id="anGuardar">Guardar análisis</button></div><div id="anMsg"></div>' : '') + (a ? '</details>' : '') + '</div>';
    const web = a ? await wordGuardado(rd, rh) : '';
    if (!c.isConnected) return;
    c.innerHTML = (a ? tarjeta(a) + '<div class="gen-acc mkt-noimp" style="margin:14px 0">' + (web ? '<a class="ic-btn" href="' + esc(web) + '" target="_blank" rel="noopener">Abrir en SharePoint ↗</a>' : '') +
      '<button class="ic-btn' + (web ? ' sec' : '') + '" id="anSubir">' + (web ? 'Actualizar Word en SharePoint' : 'Guardar Word en SharePoint') + '</button><button class="ic-btn sec" id="anWord">Descargar copia</button></div>' +
      '<p class="sec mkt-noimp" style="margin:-6px 0 12px">Word en SharePoint: Documentos › Marketing › Informes › ' + esc('Informe_Marketing_' + rd + '_' + rh + '.docx') + (web ? '' : ' (aún no existe)') + '</p>' : '') + (a ? '<div id="anComent"></div>' : '') + pasos + '<div class="mkt-noimp" id="anLista"></div>';
    pintarGuardados(c, rd, rh, alElegir);
    if (a) pintarComentarios(c, rd, rh, a, () => pintar(cont, rd, rh, alElegir));
    const bs = c.querySelector('#anSubir');
    if (bs) bs.onclick = () => U.conCarga(bs, async () => {
      try { await G.subirArchivo(ruta(rd, rh, 'docx'), await word(d, a)); U.aviso('Word guardado en SharePoint con los números de hoy', 'ok'); pintar(cont, rd, rh, alElegir); }
      catch (e) { console.error(e); U.aviso(U.mensajeError(e), 'err', 9000); }
    });
    const txt = () => prompt(d);
    const bc = c.querySelector('#anCopiar'); if (bc) bc.onclick = () => M().copiar(txt(), 'Prompt copiado. Péguelo en Claude.');
    const bv = c.querySelector('#anVer'); if (bv) bv.onclick = () => { const t = txt(); U.modal('Prompt del análisis', '<div class="ic-form"><textarea rows="22" readonly style="width:100%;font-family:ui-monospace,Consolas,monospace;font-size:12px">' + esc(t) + '</textarea><div class="ic-acciones"><span class="sec">' + t.length.toLocaleString('es-CO') + ' caracteres</span><span class="espacio"></span><button class="ic-btn" id="anC2">Copiar</button></div></div>', (m) => { m.querySelector('#anC2').onclick = () => M().copiar(t, 'Prompt copiado.'); }); };
    const bw = c.querySelector('#anWord');
    if (bw) bw.onclick = () => U.conCarga(bw, async () => { try { descargar(await word(d, a), 'Informe_Marketing_' + rd + '_' + rh + '.docx'); } catch (e) { console.error(e); U.aviso(U.mensajeError(e), 'err', 8000); } });
    const bg = c.querySelector('#anGuardar');
    if (bg) bg.onclick = () => U.conCarga(bg, async () => {
      const msg = c.querySelector('#anMsg');
      try {
        const an = ordenar(extraer(c.querySelector('#anResp').value));
        msg.innerHTML = '<p class="sec">Creando el informe en Word…</p>';
        an._meta = { fecha: new Date().toISOString(), por: App.usuario.nombre, desde: rd, hasta: rh, registros: d.total.registros };
        let web = '';
        try { const r = await G.subirArchivo(ruta(rd, rh, 'docx'), await word(d, an)); web = (r && r.webUrl) || ''; } catch (e) { console.error(e); }
        an._meta.word = web;
        msg.innerHTML = '<p class="sec">Guardando en SharePoint…</p>';
        await G.subirArchivo(ruta(rd, rh, 'json'), new Blob([JSON.stringify(an, null, 2)], { type: 'application/json' }));
        cache[rd + '_' + rh] = an;
        U.aviso('Análisis guardado', 'ok');
        pintar(cont, rd, rh, alElegir);
      } catch (e) { console.error(e); msg.innerHTML = '<div class="gen-error">' + esc(U.mensajeError(e)) + '</div>'; }
    });
  }

  return { pintar, _datos: datos, _prompt: prompt };
})();
