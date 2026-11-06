/* =====================================================================
   APP-112 · Marketing — Revisión de la semana  (#revision[/TEM-0001])
   La gerencia revisa EN LÍNEA todas las publicaciones del tema de la semana (incluido el newsletter):
   copy, Versión B, diseño y video; aprueba o pide cambios con comentario, pieza por pieza o todas a la vez.
   Usa la misma aprobación de cada publicación (mínimo CFG.minAprobaciones; pedir cambios la devuelve a
   «En producción»). «Avisar a gerencia» abre un correo de Outlook con el enlace a esta página.
   ===================================================================== */
window.MKT_REV = (function () {
  'use strict';
  const U = IC.ui, esc = U.esc, G = IC.graph, L = CFG.listas, GC = CFG.generador;
  const M = () => window.MKT;
  const ST = { temaId: '' };
  const MARCA = '── Generado con Claude ──';
  const ordRed = (c) => { const n = U.norm(c || ''); const i = CFG.redes.findIndex((r) => n.indexOf(U.norm(r)) >= 0); return /newsletter/.test(n) ? 50 : i < 0 ? 99 : i; };
  const evento = (tipo, comentario) => ({ tipo, email: App.usuario.email, nombre: App.usuario.nombre, fecha: new Date().toISOString(), comentario: comentario || '' });
  const lunesTema = (t) => M().lunesDe(M().dia(t.semana_inicio) || M().hoyISO());

  function pubsDe(t) {
    return App.pubs.filter((p) => p.tema_id === t.Title && p.estado !== 'Cancelada')
      .sort((a, b) => M().dia(a.fecha).localeCompare(M().dia(b.fecha)) || ordRed(a.canal) - ordRed(b.canal) || String(a.Title).localeCompare(String(b.Title)));
  }
  function ultimosCambios(p) {
    const ev = M().eventos(p).filter((e) => e.tipo === 'CAMBIOS');
    return ev.length ? ev[ev.length - 1] : null;
  }

  // ---------- acciones (mismas reglas que la ficha de la publicación) ----------
  async function fresca(p) {
    const f = (await G.items(L.pubs, { filtro: "fields/Title eq '" + p.Title + "'" }))[0];
    if (f) Object.assign(p, { aprobaciones: f.aprobaciones, estado: f.estado, _etag: f._etag });
    return p;
  }
  async function enviar(p) {
    await fresca(p);
    if (['Planeada', 'En producción'].indexOf(p.estado) < 0) return false;
    await M().guardarPub(p, { estado: 'En aprobación', aprobaciones: JSON.stringify(M().eventos(p).concat([evento('ENVIO')])) });
    return true;
  }
  async function decidir(p, tipo, com) {
    await fresca(p);
    if (p.estado !== 'En aprobación') return { ok: false, msg: p.Title + ' cambió de estado: ' + p.estado };
    if (M().miDecision(p)) return { ok: false, msg: 'Usted ya respondió ' + p.Title };
    const nuevos = M().eventos(p).concat([evento(tipo, com)]);
    let estado = p.estado;
    if (tipo === 'CAMBIOS') estado = 'En producción';
    else if (M().aprobadores(Object.assign({}, p, { aprobaciones: JSON.stringify(nuevos) })).length >= CFG.minAprobaciones) estado = 'Aprobada';
    await M().guardarPub(p, { aprobaciones: JSON.stringify(nuevos), estado });
    return { ok: true, estado };
  }

  // ---------- Word de la semana en SharePoint ----------
  async function hijos(carpeta) {
    try { const sid = await G.sitio(CFG.sitio.host, CFG.sitio.ruta); return (await G.llamar('GET', '/sites/' + sid + '/drive/root:/' + M().rutaUrl(carpeta) + ':/children?$top=100')).value || []; }
    catch (e) { return []; }
  }
  async function pintarWords(el, t, ps) {
    const news = ps.find((p) => /newsletter/i.test(p.canal || ''));
    const [hs, hn] = await Promise.all([hijos(GC.carpetaSemanas + '/' + lunesTema(t)), news ? hijos(CFG.carpetaPiezas + '/' + news.Title) : Promise.resolve([])]);
    const w = hs.concat(hn).filter((x) => /\.docx$/i.test(x.name));
    if (!el.isConnected) return;
    el.innerHTML = w.length ? 'Documentos: ' + w.map((x) => '<a href="' + esc(x.webUrl) + '" target="_blank" rel="noopener">' + esc(x.name) + ' ↗</a>').join(' · ') : '';
  }

  // =====================================================================
  // VISTA
  // =====================================================================
  function vista(raiz) {
    const id = decodeURIComponent(location.hash.slice(1).split('/')[1] || '');
    if (id) ST.temaId = id;
    if (!ST.temaId || !M().temaDe(ST.temaId)) {
      // por defecto: la semana más próxima que tenga publicaciones en aprobación, o la de esta semana
      const enAp = App.pubs.filter((p) => p.estado === 'En aprobación').map((p) => p.tema_id);
      const l = M().lunesDe(M().hoyISO());
      const t0 = App.temas.find((t) => enAp.indexOf(t.Title) >= 0) || App.temas.find((t) => M().dia(t.semana_inicio) && lunesTema(t) === l) || App.temas.find((t) => M().dia(t.semana_inicio) && lunesTema(t) > l);
      ST.temaId = t0 ? t0.Title : '';
    }
    pintar(raiz);
  }
  function pintar(raiz) {
    const t = M().temaDe(ST.temaId);
    // Semanas: «Esta semana y próximas» en orden de calendario; «Anteriores» de la más reciente hacia atrás. Con año.
    const lunesHoy = M().lunesDe(M().hoyISO());
    const opc = (x) => { const n = App.pubs.filter((p) => p.tema_id === x.Title && p.estado === 'En aprobación').length, f = new Date(M().dia(x.semana_inicio) + 'T12:00:00');
      return '<option value="' + esc(x.Title) + '"' + (t && x.Title === t.Title ? ' selected' : '') + '>Semana del ' + esc(f.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })) + ' · ' + esc(x.tema) + (n ? ' · ' + n + ' por aprobar' : '') + '</option>'; };
    const conFecha = App.temas.filter((x) => M().dia(x.semana_inicio));
    const prox = conFecha.filter((x) => lunesTema(x) >= lunesHoy).sort((a, b) => M().dia(a.semana_inicio).localeCompare(M().dia(b.semana_inicio)));
    const ant = conFecha.filter((x) => lunesTema(x) < lunesHoy).sort((a, b) => M().dia(b.semana_inicio).localeCompare(M().dia(a.semana_inicio)));
    const opTemas = (prox.length ? '<optgroup label="Esta semana y próximas">' + prox.map(opc).join('') + '</optgroup>' : '') + (ant.length ? '<optgroup label="Semanas anteriores">' + ant.map(opc).join('') + '</optgroup>' : '');
    if (!t) { raiz.innerHTML = '<h1 class="ic-titulo">Revisión de la semana</h1><div class="ic-tabla-caja"><p class="ic-vacio">No hay temas con semana asignada.</p></div>'; return; }
    const ps = pubsDe(t), yo = App.usuario.email, aprobador = M().soyAprobador();
    const cuenta = (e) => ps.filter((p) => p.estado === e).length;
    const faltanMias = ps.filter((p) => p.estado === 'En aprobación' && !M().miDecision(p));
    const listas = ps.filter((p) => ['Planeada', 'En producción'].indexOf(p.estado) >= 0 && String(p.copy || '').trim());
    const aprobadas = ps.filter((p) => ['Aprobada', 'Programada', 'Publicada'].indexOf(p.estado) >= 0).length;
    raiz.innerHTML = '<div class="ic-barra"><div><h1 class="ic-titulo">Revisión de la semana</h1><p class="ic-subtitulo" style="margin:0">Revise cada publicación, apruebe o pida cambios. Cada una necesita ' + CFG.minAprobaciones + ' aprobaciones.</p></div></div>' +
      '<div class="rev-cab"><select id="rTema" aria-label="Semana">' + opTemas + '</select>' +
        '<div class="rev-prog"><div class="rev-barra"><i style="width:' + (ps.length ? Math.round(100 * aprobadas / ps.length) : 0) + '%"></i></div><span><b>' + aprobadas + ' de ' + ps.length + '</b> aprobadas · ' + cuenta('En aprobación') + ' en aprobación · ' + (cuenta('En producción') + cuenta('Planeada')) + ' en producción</span></div>' +
        '<div class="gen-acc">' + (listas.length ? '<button class="ic-btn" id="rEnviar">Enviar a aprobación (' + listas.length + ')</button>' : '') +
          (aprobador && faltanMias.length ? '<button class="ic-btn" id="rTodas">Aprobar todas las que me faltan (' + faltanMias.length + ')</button>' : '') +
          '<button class="ic-btn sec" id="rAvisar">Avisar a gerencia ✉</button><a class="ic-btn sec" href="#tema/' + esc(t.Title) + '">Ver el tema</a></div>' +
        '<p class="sec" id="rWords" style="margin:0"></p></div>' +
      (ps.length ? '<div class="rev-lista">' + ps.map((p) => tarjeta(p, yo, aprobador)).join('') + '</div>' : '<div class="ic-tabla-caja"><p class="ic-vacio">Esta semana no tiene publicaciones. Genérelas en <a href="#generar/' + esc(t.Title) + '/contenido">Generar</a>.</p></div>');
    pintarWords(raiz.querySelector('#rWords'), t, ps);
    raiz.querySelector('#rTema').onchange = (e) => { ST.temaId = e.target.value; history.replaceState(null, '', '#revision/' + ST.temaId); pintar(raiz); };
    // Enviar a aprobación las que tienen copy
    const be = raiz.querySelector('#rEnviar');
    if (be) be.onclick = async () => {
      if (!(await U.confirmar('Enviar a aprobación', 'Se enviarán ' + listas.length + ' publicaciones con copy (' + listas.map((p) => p.Title).join(', ') + ').', 'Enviar'))) return;
      await U.conCarga(be, async () => { let n = 0; try { for (const p of listas) if (await enviar(p)) n++; U.aviso(n + ' publicación(es) enviadas a aprobación', 'ok'); } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); } M().pintarEncabezado(); pintar(raiz); });
    };
    // Aprobar en bloque
    const bt = raiz.querySelector('#rTodas');
    if (bt) bt.onclick = async () => {
      if (!(await U.confirmar('Aprobar todas', 'Registrará su aprobación en ' + faltanMias.length + ' publicaciones que aún no ha revisado. Si alguna necesita cambios, mejor revísela una por una.', 'Aprobar todas'))) return;
      await U.conCarga(bt, async () => {
        let ok = 0; const avisos = [];
        try { for (const p of faltanMias) { const r = await decidir(p, 'APROBADA', 'Aprobada en la revisión de la semana'); if (r.ok) ok++; else avisos.push(r.msg); } } catch (e) { avisos.push(U.mensajeError(e)); }
        U.aviso(ok + ' aprobación(es) registradas' + (avisos.length ? ' · ' + avisos.join(' · ') : ''), avisos.length ? 'warn' : 'ok', 7000); M().pintarEncabezado(); pintar(raiz);
      });
    };
    // Correo a gerencia (Outlook) con el enlace
    raiz.querySelector('#rAvisar').onclick = () => {
      const para = Object.keys(CFG.usuarios).filter((e) => e !== yo);
      const url = location.origin + '/ideascontrol/Marketing/#revision/' + t.Title;
      const cuerpo = 'Hola,\n\nYa está lista para revisión la semana del ' + M().fLarga(t.semana_inicio) + ': «' + t.tema + '».\n\n' + cuenta('En aprobación') + ' publicaciones esperan aprobación (cada una necesita ' + CFG.minAprobaciones + ' aprobaciones).\n\nRevísela aquí (con su cuenta de Ideas Control):\n' + url + '\n\nPueden aprobar cada pieza o pedir cambios con un comentario.\n\nGracias,\n' + App.usuario.nombre;
      location.href = 'mailto:' + para.join(';') + '?subject=' + encodeURIComponent('Revisión de contenido · semana del ' + M().fCorta(t.semana_inicio) + ' · ' + t.tema) + '&body=' + encodeURIComponent(cuerpo);
    };
    // Acciones por publicación
    raiz.querySelectorAll('[data-acc]').forEach((b) => {
      b.onclick = async () => {
        const p = App.pubs.find((x) => x.Title === b.dataset.id), acc = b.dataset.acc, card = b.closest('.rev-card');
        const com = card.querySelector('textarea') ? card.querySelector('textarea').value.trim() : '';
        if (acc === 'CAMBIOS' && !com) { U.aviso('Escriba qué hay que cambiar', 'warn'); card.querySelector('textarea').focus(); return; }
        await U.conCarga(b, async () => {
          try {
            if (acc === 'ENVIAR') { await enviar(p); U.aviso(p.Title + ' enviada a aprobación', 'ok'); }
            else { const r = await decidir(p, acc, com); U.aviso(r.ok ? (acc === 'CAMBIOS' ? 'Se pidieron cambios en ' + p.Title : r.estado === 'Aprobada' ? '¡' + p.Title + ' aprobada!' : 'Aprobación registrada') : r.msg, r.ok ? 'ok' : 'warn'); }
          } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); }
          M().pintarEncabezado(); pintar(raiz);
        });
      };
    });
  }

  function tarjeta(p, yo, aprobador) {
    const ap = M().aprobadores(p), mia = M().miDecision(p), cambios = ultimosCambios(p);
    const notas = String(p.notas || ''), i = notas.indexOf(MARCA);
    const detalle = i >= 0 ? notas.slice(i + MARCA.length).replace(/^\s*[\d/]+\s*/, '').replace(/\n*El Word de la semana tiene el detalle con formato\.\s*$/, '').trim() : '';
    const manual = (i >= 0 ? notas.slice(0, i) : notas).trim();
    const personas = Object.keys(CFG.usuarios).map((email) => {
      const d = M().ronda(p).filter((e) => e.email === email && (e.tipo === 'APROBADA' || e.tipo === 'CAMBIOS')).pop();
      const cls = p.estado === 'En aprobación' || p.estado === 'Aprobada' ? (d ? (d.tipo === 'APROBADA' ? 'ok' : 'no') : 'pend') : 'na';
      return '<span class="rev-per ' + cls + '" title="' + esc(CFG.usuarios[email] + (d && d.comentario ? ': ' + d.comentario : '')) + '">' + esc(String(CFG.usuarios[email]).replace(/^Dirección (de )?/, '').replace('Gerencia General', 'Gerencia')) + (cls === 'ok' ? ' ✔' : cls === 'no' ? ' ✖' : '') + '</span>';
    }).join('');
    let acc = '';
    if (p.estado === 'Planeada' || p.estado === 'En producción') acc = String(p.copy || '').trim() ? '<button class="ic-btn chico" data-acc="ENVIAR" data-id="' + esc(p.Title) + '">Enviar a aprobación</button>' : '<span class="sec">Aún sin copy.</span>';
    else if (p.estado === 'En aprobación' && aprobador) acc = mia ? '<span class="sec">Usted ' + (mia.tipo === 'APROBADA' ? 'aprobó ✔' : 'pidió cambios') + '.</span>' :
      '<textarea rows="2" placeholder="Comentario (obligatorio si pide cambios)"></textarea><div class="gen-acc" style="margin-top:6px"><button class="ic-btn chico" data-acc="APROBADA" data-id="' + esc(p.Title) + '">Aprobar</button><button class="ic-btn sec chico" data-acc="CAMBIOS" data-id="' + esc(p.Title) + '">Pedir cambios</button></div>';
    else if (p.estado === 'Aprobada') acc = '<span class="rev-listo">✔ Aprobada por ' + esc(ap.map((a) => a.nombre).join(' y ')) + '</span>';
    else if (p.estado === 'Programada' || p.estado === 'Publicada') acc = '<span class="rev-listo">✔ ' + esc(p.estado) + '</span>';
    return '<article class="rev-card e-' + esc(U.norm(p.estado || '').replace(/\s+/g, '-')) + '">' +
      '<header>' + M().chipCanal(p.canal) + '<span class="rev-fecha">' + esc(M().fLarga(p.fecha)) + '</span>' + (p.formato ? '<span class="sec">' + esc(p.formato) + '</span>' : '') + '<span class="espacio"></span>' + M().chipEstado(p.estado) + '</header>' +
      '<h3>' + esc(p.titulo || p.Title) + ' <a class="sec" href="#pub/' + esc(p.Title) + '">' + esc(p.Title) + ' ›</a></h3>' +
      (cambios && p.estado === 'En producción' ? '<div class="rev-cambios"><b>Cambios pedidos por ' + esc(cambios.nombre) + ':</b> ' + esc(cambios.comentario) + '</div>' : '') +
      (p.copy ? '<div class="rev-copy">' + esc(p.copy) + '</div>' : '<p class="sec">Sin copy todavía.</p>') +
      (detalle ? '<details class="rev-det"><summary>Versión B, diseño y video</summary><div class="rev-copy chico">' + esc(detalle) + '</div></details>' : '') +
      (manual ? '<p class="sec" style="margin:6px 0 0">Notas: ' + esc(manual.slice(0, 300)) + '</p>' : '') +
      (p.utm_url ? '<p class="sec rev-enl">🔗 Enlace: <a href="' + esc(p.utm_url) + '" target="_blank" rel="noopener">' + esc(String(p.utm_url).replace(/^https?:\/\/(www\.)?/, '').split('?')[0]) + '</a></p>' : '') +
      '<footer><div class="rev-pers">' + personas + '<span class="sec">' + ap.length + ' de ' + CFG.minAprobaciones + '</span></div><div class="rev-acc">' + acc + '</div></footer></article>';
  }

  return { vista };
})();
