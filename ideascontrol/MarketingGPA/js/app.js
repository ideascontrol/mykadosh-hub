/* =====================================================================
   Marketing GPA (uso personal, solo operaciones@)
   Vistas:  #             Semana: piezas por día y red, estrategia, copy, prompts de imagen, piezas
            #lista        Publicaciones (filtro por semana, red y estado) · orden Semana › Red › Fecha
            #pub/ID       Ficha: copy final, estado, enlace UTM, prompts de imagen por lámina/tramo, piezas, métricas
            #mejorar      Mejorar la semana con Claude (prompt -> JSON -> se guarda en el Excel)
            #metricas     Importar estadísticas (Meta, LinkedIn, TikTok) y ver resultados
            #leads        Leads, leads calificados y reuniones
            #pauta        Campaña paga (Talento 360™): resultados por gancho A/B
            #resumen      Resumen del periodo + análisis con Claude + informe Word
            #plan         Plan por mes, estrategia semanal, recursos y líneas GPA (del Excel)
            #archivos     Excel, carpetas y plantillas de los prompts
   Base de datos: el Excel del plan en SharePoint (API de Excel). Archivos: Personal/Marketing GPA/…
   ===================================================================== */
const App = { usuario: null, pubs: [], semanas: [], estrategia: {}, planMes: [], recursos: [], lineas: [], campana: [], met: [], leads: [], pauta: [], plant: {} };

(function () {
  const U = IC.ui, esc = U.esc, G = IC.graph, X = GPA_XL, PR = GPA_PROMPTS;
  const pad = (n) => String(n).padStart(2, '0');
  const hoy = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const sumar = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const lunesDe = X.lunesDe;
  const fd = (iso, o) => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', o) : '';
  const fLarga = (iso) => fd(iso, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const fCorta = (iso) => fd(iso, { day: 'numeric', month: 'short' });
  const fDia = (iso) => { const t = fd(iso, { weekday: 'long', day: 'numeric', month: 'long' }); return t.charAt(0).toUpperCase() + t.slice(1); };
  const semanaActual = () => { const d = new Date().getDay(); return lunesDe(d === 6 || d === 0 ? sumar(hoy(), 2) : hoy()); };
  const rangoSem = (l) => fCorta(l) + ' – ' + fCorta(sumar(l, 6)) + ' ' + l.slice(0, 4);
  const num = (v) => { const n = Number(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; };
  const fmtN = (n) => Math.round(n || 0).toLocaleString('es-CO');
  const ruta = (r) => r.split('/').map(encodeURIComponent).join('/');
  const itemDe = (r) => '/sites/' + X.sitio() + '/drive/root:/' + ruta(r);

  async function copiar(txt, msg) {
    try { await navigator.clipboard.writeText(txt); U.aviso(msg || 'Copiado', 'ok'); }
    catch (e) { U.modal('Copiar', '<div class="ic-form"><textarea rows="14" style="width:100%">' + esc(txt) + '</textarea><p class="sec">Selecciónelo y cópielo con Ctrl+C.</p></div>'); }
  }
  function errorArchivo(e) {
    if (e && (e.status === 423 || /locked|bloquead/i.test(e.message || ''))) return 'El Excel está abierto en edición o bloqueado. Ciérrelo (también en el navegador) y vuelva a intentar.';
    if (e && e.status === 404) return 'No encontré el archivo en SharePoint. Revise «Archivos».';
    return U.mensajeError(e);
  }

  // =====================================================================
  // REDES, PIEZAS Y TEXTOS
  // =====================================================================
  const ordenRed = (c) => { const i = CFG.redes.findIndex((r) => U.norm(c).indexOf(U.norm(r)) === 0); return i < 0 ? 9 : i; };
  const ordenar = (a, b) => a.fecha.localeCompare(b.fecha) || ordenRed(a.canal) - ordenRed(b.canal) || a.id.localeCompare(b.id);
  const claseRed = (c) => { const n = U.norm(c); return /linkedin/.test(n) ? 'li' : /instagram/.test(n) ? 'ig' : /facebook/.test(n) ? 'fb' : /tiktok/.test(n) ? 'tt' : 'otro'; };
  const chipRed = (c) => '<span class="g-red ' + claseRed(c) + '">' + esc(c) + '</span>';
  const chipEstado = (e) => '<span class="g-est e-' + U.norm(e || 'planeada').replace(/\s+/g, '-') + '">' + esc(e || 'Planeada') + '</span>';
  const pubDe = (id) => App.pubs.find((p) => p.id === id);
  const fuenteUtm = (c) => { const n = U.norm(c); return /linkedin/.test(n) ? 'linkedin' : /instagram/.test(n) ? 'instagram' : /facebook/.test(n) ? 'facebook' : /tiktok/.test(n) ? 'tiktok' : 'otro'; };
  const destino = (p) => p.enlaceRecurso || p.enlacePagina || '';
  function utm(p, url) {
    url = url || destino(p); if (!url) return '';
    try { const u = new URL(url); u.searchParams.set('utm_source', fuenteUtm(p.canal)); u.searchParams.set('utm_medium', CFG.utm.medio); u.searchParams.set('utm_campaign', CFG.utm.campana + p.semana); u.searchParams.set('utm_content', p.id); return u.toString(); }
    catch (e) { return url; }
  }
  const dis = (p) => p.diseno || {};
  const esVideo = (p) => /reel|video/i.test(p.formato);
  const esCarrusel = (p) => /carrusel/i.test(p.formato);
  const esGuion = (t) => /^\s*\[[^\]\n]*\]\s*$/m.test(t || '');
  const ganchoDe = (p) => dis(p).gancho || p.gancho;
  const ctaDe = (p) => dis(p).cta || p.cta;
  const hashtagsDe = (p) => dis(p).hashtags || CFG.hashtags[p.canal] || CFG.hashtags[Object.keys(CFG.hashtags).find((k) => U.norm(p.canal).indexOf(U.norm(k)) === 0)] || '';
  function laminasTexto(t) { const out = []; String(t || '').split(/\n/).forEach((l) => { const m = l.trim().match(/^L[aá]mina\s*\d+\s*[:.\-–]\s*(.+)$/i); if (m) out.push(l.trim()); }); return out; }
  // Tramos del guion: «[0–3 s | Texto en pantalla]» + contenido; o los que devolvió Claude
  function tramos(p) {
    const v = dis(p).video;
    if (v && v.tramos && v.tramos.length) return v.tramos.map((x) => (x.nombre || 'Tramo') + (x.tiempo ? ' ' + x.tiempo : '') + ': pantalla «' + (x.pantalla || '') + '»' + (x.voz ? ' · voz «' + x.voz + '»' : '') + (x.escena ? ' — escena: ' + x.escena : ''));
    if (!esGuion(p.texto)) return [];
    const out = []; let cur = null;
    String(p.texto).split(/\n/).forEach((l) => {
      const m = l.trim().match(/^\[([^\]]+)\]$/);
      if (m) { cur = { cab: m[1], t: [] }; out.push(cur); } else if (cur && l.trim()) cur.t.push(l.trim());
    });
    return out.map((x) => x.cab + ': ' + x.t.join(' '));
  }
  function partes(p) {
    if (esVideo(p)) return tramos(p);
    const l = (dis(p).laminas && dis(p).laminas.length) ? dis(p).laminas : laminasTexto(p.copyFinal || p.texto);
    return esCarrusel(p) || l.length > 1 ? l : [];
  }
  const etq = (p) => esVideo(p) ? 'Tramo' : 'Lámina';
  function medidas(p) {
    const n = U.norm(p.canal), f = U.norm(p.formato);
    if (/historia/.test(f)) return CFG.medidas.historia;
    if (/linkedin/.test(n)) return CFG.medidas.LinkedIn;
    if (/tiktok/.test(n) || (esVideo(p) && !/linkedin/.test(n))) return CFG.medidas.TikTok + (esVideo(p) ? ' — portada' : '');
    return /instagram/.test(n) ? CFG.medidas.Instagram : CFG.medidas.Facebook;
  }
  // Texto del post (sin CTA, enlace ni hashtags)
  function cuerpo(p) {
    if (p.copyFinal) return p.copyFinal;
    if (esGuion(p.texto)) return ganchoDe(p);                // en videos el texto del Excel es el guion: el post lleva el gancho
    if (laminasTexto(p.texto).length > 1) {                    // en carruseles el texto son las láminas: el post lleva lo que no es lámina, o el gancho
      const resto = String(p.texto).split(/\n/).filter((l) => l.trim() && !/^L[aá]mina\s*\d+/i.test(l.trim())).join('\n\n').trim();
      return resto || ganchoDe(p);
    }
    return p.texto;
  }
  // Copy listo para pegar en la red
  function copyPublicar(p) {
    const b = cuerpo(p), c = ctaDe(p), red = U.norm(p.canal), url = utm(p);
    const partesT = [b];
    if (c && U.norm(b).indexOf(U.norm(c).slice(0, 30)) < 0) partesT.push(c);
    if (url) {
      if (/instagram|tiktok/.test(red)) partesT.push('🔗 Enlace en la bio');
      else if (/linkedin personal/.test(red)) { /* en LinkedIn personal el enlace va en el primer comentario */ }
      else partesT.push('👉 ' + url);
    }
    const h = hashtagsDe(p); if (h) partesT.push(h);
    return partesT.filter(Boolean).join('\n\n');
  }
  const notaEnlace = (p) => { const r = U.norm(p.canal); return /instagram|tiktok/.test(r) ? 'Póngalo en la bio o en una historia con enlace.' : /linkedin personal/.test(r) ? 'Póngalo en el primer comentario (LinkedIn muestra menos los posts con enlace).' : 'Ya va dentro del copy.'; };
  function guion(p) {
    if (esGuion(p.texto)) return p.texto;
    const v = dis(p).video; if (v && v.tramos && v.tramos.length) return v.tramos.map((x) => '[' + (x.tiempo || '') + ' | ' + (x.nombre || '') + ']\nPantalla: ' + (x.pantalla || '') + '\nVoz: ' + (x.voz || '') + (x.escena ? '\nEscena: ' + x.escena : '')).join('\n\n');
    return '';
  }
  const limpio = (s) => String(s || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  // Prompt de la imagen (k = lámina o tramo; sin k = la pieza o la portada del video)
  function promptImagen(p, k) {
    const ps = partes(p), N = ps.length, lam = k && N, vid = esVideo(p), e = App.estrategia[p.semana] || {};
    const md = lam ? medidas(p).replace(' — portada', '') : medidas(p);
    const L = ['', '═══════════════════════════════', 'INFORMACIÓN DE ESTA PIEZA', 'Red: ' + p.canal, 'Medidas: ' + md,
      'Formato: ' + p.formato + (vid && lam ? ' → imagen para el TRAMO ' + k + ' de ' + N + ' del video (clip para CapCut)' : vid ? ' → PORTADA del video' : lam ? ' → lámina ' + k + ' de ' + N : esCarrusel(p) ? ' → una imagen por lámina' : ''),
      'Fecha de publicación: ' + fLarga(p.fecha), 'Tema de la semana: ' + (e.tema || ''), 'Etapa del embudo: ' + (p.etapa || '')];
    L.push('Qué se ve: ' + (dis(p).descripcion || p.direccion || 'propón una escena que represente el mensaje'));
    L.push('Texto en la imagen (exacto): ' + (dis(p).texto_en_imagen || (lam ? '' : limpio(ganchoDe(p)))));
    if (lam) {
      L.push(vid ? 'Tramos del video:' : 'Láminas:'); ps.forEach((x, n) => L.push((n + 1 === k ? '→ ' : '• ') + x));
      L.push('', 'ESTA IMAGEN: ' + (vid ? 'TRAMO ' : 'LÁMINA ') + k + ' DE ' + N + ' → ' + ps[k - 1],
        k === 1 ? 'Es la primera: usa el logo adjunto y define la línea visual de las siguientes.' : 'Mantén exactamente la misma línea visual de las anteriores de esta conversación (colores, tipografía, fotografía y ubicación del logo).');
    }
    const ctx = limpio(cuerpo(p)); if (ctx) L.push('Contexto del post (NO lo copies en la imagen): ' + (ctx.length > 420 ? ctx.slice(0, 420).replace(/\s\S*$/, '') + '…' : ctx));
    return (App.plant.imagen || PR.imagen).trim() + '\n' + L.join('\n');
  }
  function botonesPrompt(p, attr) {
    const ps = partes(p);
    if (!ps.length) return '<button class="ic-btn chico" ' + attr + '="' + esc(p.id) + '">Prompt imagen</button>';
    return (esVideo(p) ? '<button class="ic-btn chico" ' + attr + '="' + esc(p.id) + '">Portada</button>' : '') +
      ps.map((x, n) => '<button class="ic-btn ' + (n || esVideo(p) ? 'sec ' : '') + 'chico" ' + attr + '="' + esc(p.id) + '" data-k="' + (n + 1) + '" title="' + esc(x) + '">' + (esVideo(p) ? 'Tr. ' : 'Lám. ') + (n + 1) + '</button>').join('');
  }
  function enlazarPrompts(raiz, attr) {
    raiz.querySelectorAll('[' + attr + ']').forEach((b) => {
      b.onclick = (ev) => { ev.stopPropagation(); const p = pubDe(b.getAttribute(attr)), k = +b.dataset.k || 0; copiar(promptImagen(p, k), 'Prompt copiado' + (k ? ' · ' + etq(p).toLowerCase() + ' ' + k : '')); b.textContent = b.textContent.replace(/ ✔$/, '') + ' ✔'; };
    });
  }

  // =====================================================================
  // ARCHIVOS DE LA PIEZA (SharePoint: Personal/Marketing GPA/Piezas/ID)
  // =====================================================================
  const carpetaPieza = (p) => CFG.carpeta + '/Piezas/' + p.id;
  async function hijos(r) { try { return (await G.llamar('GET', itemDe(r) + ':/children?$top=100')).value || []; } catch (e) { if (e.status === 404) return []; throw e; } }
  async function subir(r, archivo) {
    if (archivo.size < 3.5 * 1048576) return G.subirArchivo(r, archivo);
    const s = await G.llamar('POST', itemDe(r) + ':/createUploadSession', { item: { '@microsoft.graph.conflictBehavior': 'replace' } });
    const PARTE = 10 * 327680;
    for (let ini = 0; ini < archivo.size; ini += PARTE) {
      const fin = Math.min(ini + PARTE, archivo.size);
      const res = await fetch(s.uploadUrl, { method: 'PUT', headers: { 'Content-Range': 'bytes ' + ini + '-' + (fin - 1) + '/' + archivo.size }, body: archivo.slice(ini, fin) });
      if (!res.ok && res.status !== 202) throw new Error('No se pudo subir ' + archivo.name + ' (' + res.status + ')');
    }
  }
  async function optimizar(fs, p) {
    const m = (medidas(p).match(/(\d+)\s*×\s*(\d+)/) || []).slice(1).map(Number), out = []; let a = 0, d = 0;
    for (const f of fs) {
      if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { out.push(f); continue; }
      try { const r = await IC.comprimir(f, { formato: 'auto', calidad: 0.82, maxAncho: m[0] || 0, maxAlto: m[1] || 0 }); out.push(r.file); a += r.antes; d += r.despues; } catch (e) { out.push(f); }
    }
    if (a) U.aviso('Imágenes optimizadas: ' + IC.comprimir.kb(a) + ' → ' + IC.comprimir.kb(d), 'ok', 4000);
    return out;
  }
  function bajar(hs) {
    hs.filter((h) => h['@microsoft.graph.downloadUrl']).sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true })).forEach((h, i) => setTimeout(() => {
      const a = document.createElement('a'); a.href = h['@microsoft.graph.downloadUrl']; a.download = h.name; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 1000);
    }, i * 700));
  }
  async function bajarPieza(p) {
    const hs = (await hijos(carpetaPieza(p))).filter((h) => h.file);
    if (!hs.length) { U.aviso('Todavía no hay pieza subida en ' + p.id + '. Súbala en su ficha.', 'warn', 6000); return; }
    bajar(hs); U.aviso('Descargando ' + hs.length + ' archivo(s)', 'ok');
  }
  const optimizarSiempre = () => { try { return localStorage.getItem('gpa_optimizar') !== '0'; } catch (e) { return true; } };

  // =====================================================================
  // PLANTILLAS (SharePoint)
  // =====================================================================
  async function leerTexto(r) { const m = await G.llamar('GET', itemDe(r)); const res = await fetch(m['@microsoft.graph.downloadUrl']); if (!res.ok) throw new Error('descarga'); return (await res.text()).replace(/^﻿/, ''); }
  async function leerPlantillas() { await Promise.all(Object.keys(PR.archivos).map(async (k) => { try { App.plant[k] = await leerTexto(PR.archivos[k]); } catch (e) { /* la original */ } })); }
  function editarPlantilla(k, titulo) {
    U.modal(titulo, '<div class="ic-form"><p class="sec" style="margin-top:0">Se guarda en SharePoint (' + esc(PR.archivos[k]) + ').' + (k === 'imagen' ? ' La app agrega al final los datos de cada pieza.' : k === 'mejorar' ? ' La app agrega el contexto de la semana, las piezas y el formato de respuesta.' : ' La app agrega los datos del periodo.') + '</p>' +
      '<textarea id="plT" rows="20" style="width:100%;font-family:ui-monospace,Consolas,monospace;font-size:12.5px">' + esc(App.plant[k] || PR[k]) + '</textarea>' +
      '<div class="ic-acciones"><button class="ic-btn sec" id="plO">Restaurar el original</button><span class="espacio"></span><button class="ic-btn" id="plG">Guardar en SharePoint</button></div></div>', (m) => {
      m.querySelector('#plO').onclick = () => { m.querySelector('#plT').value = PR[k]; };
      m.querySelector('#plG').onclick = () => U.conCarga(m.querySelector('#plG'), async () => {
        const t = m.querySelector('#plT').value.trim(); if (t.length < 40) { U.aviso('La plantilla está casi vacía', 'warn'); return; }
        try { await G.subirArchivo(PR.archivos[k], new Blob([t], { type: 'text/plain;charset=utf-8' })); App.plant[k] = t; U.cerrarModal(); U.aviso('Plantilla guardada', 'ok'); } catch (e) { U.aviso(errorArchivo(e), 'err', 8000); }
      });
    });
  }

  // =====================================================================
  // ENCABEZADO
  // =====================================================================
  const NAV = [['', 'Semana'], ['lista', 'Publicaciones'], ['mejorar', 'Mejorar'], ['metricas', 'Métricas'], ['leads', 'Leads'], ['pauta', 'Pauta'], ['resumen', 'Resumen'], ['plan', 'Plan'], ['archivos', 'Archivos']];
  function pintarEncabezado() {
    const u = App.usuario;
    document.getElementById('encabezado').innerHTML = '<a href="#" class="g-marca"><img class="g-logo-img" src="' + CFG.icono + '" alt="GPA"></a>' +
      '<div class="app-nombre"><b>' + esc(CFG.app.nombre) + '</b><span>Growth Path Academy · v' + CFG.app.version + '</span></div><div class="espacio"></div>' +
      '<nav class="g-nav">' + NAV.map((n) => '<a href="#' + n[0] + '" data-r="' + n[0] + '">' + n[1] + '</a>').join('') + '</nav>' +
      '<div class="ic-user">' + IC.portal.boton() + '<div class="datos"><b>' + esc(u.nombre) + '</b><span>Uso personal</span></div><div class="ic-avatar">' + esc(u.iniciales) + '</div><button class="ic-btn sec chico" id="btnSalir">Salir</button></div>';
    document.getElementById('encabezado').hidden = false;
    document.getElementById('btnSalir').onclick = () => IC.auth.salir();
  }
  const marcarNav = (r) => document.querySelectorAll('.g-nav a').forEach((a) => a.classList.toggle('on', a.dataset.r === r));
  const param = (i) => decodeURIComponent((location.hash.slice(1).split('/')[i] || ''));
  const selSemana = (id, sel) => '<select id="' + id + '">' + App.semanas.map((l) => '<option value="' + l + '"' + (l === sel ? ' selected' : '') + '>' + (App.estrategia[l] ? 'S' + App.estrategia[l].n + ' · ' : '') + esc(rangoSem(l)) + (l === semanaActual() ? ' (esta)' : '') + '</option>').join('') + '</select>';
  const semanaInicial = () => { const a = semanaActual(); return App.semanas.indexOf(a) >= 0 ? a : (App.semanas.find((l) => l >= a) || App.semanas[App.semanas.length - 1]); };
  function cajaEstrategia(l) {
    const e = App.estrategia[l]; if (!e) return '';
    const ciclo = App.planMes[Math.floor((e.n - 1) / 4)] || {};
    return '<div class="g-estr"><div><span class="g-kick">' + esc(ciclo.ciclo || e.ciclo) + ' · ' + esc(e.semana) + '</span><h2>' + esc(e.tema) + '</h2><p>' + esc(e.objetivo) + '</p></div>' +
      '<div class="g-estr-d">' + (ciclo.oferta ? '<span><b>Oferta:</b> ' + esc(ciclo.oferta) + '</span>' : '') + (e.cta ? '<span><b>CTA:</b> ' + esc(e.cta) + '</span>' : '') + (ciclo.audiencia ? '<span><b>Audiencia:</b> ' + esc(ciclo.audiencia) + '</span>' : '') + '</div></div>';
  }

  // =====================================================================
  // VISTA: SEMANA
  // =====================================================================
  function vistaSemana(raiz) {
    if (!App.verSem) App.verSem = semanaInicial();
    const l = App.verSem, ps = App.pubs.filter((p) => p.semana === l).sort(ordenar);
    const cuenta = {}; ps.forEach((p) => { cuenta[p.estado] = (cuenta[p.estado] || 0) + 1; });
    let dias = '';
    for (let i = 0; i < 7; i++) {
      const f = sumar(l, i), del = ps.filter((p) => p.fecha === f);
      if (!del.length && i > 4) continue;
      dias += '<section class="g-dia"><h3>' + esc(fDia(f)) + (f === hoy() ? ' <span class="g-hoy">hoy</span>' : '') + '</h3>' + (del.map((p) =>
        '<article class="g-card" data-id="' + esc(p.id) + '"><div class="g-card-top">' + chipRed(p.canal) + '<span class="sec">' + esc(p.formato) + '</span>' + chipEstado(p.estado) + (p.copyFinal ? '<span class="g-mej" title="Mejorado con Claude">✨</span>' : '') + '</div>' +
        '<b class="g-gancho">' + esc(ganchoDe(p)) + '</b><span class="sec">' + esc(p.id) + ' · ' + esc(p.etapa) + '</span>' +
        '<div class="g-btns"><button class="ic-btn sec chico" data-copy="' + esc(p.id) + '">Copy</button>' + botonesPrompt(p, 'data-pi') + '<button class="ic-btn sec chico" data-bajar="' + esc(p.id) + '">⬇ Pieza</button></div></article>').join('') || '<p class="sec">Sin publicaciones.</p>') + '</section>';
    }
    raiz.innerHTML = '<div class="g-cab"><div><h1 class="ic-titulo">Semana</h1><div class="g-sel"><button class="ic-btn sec chico" id="sAnt">‹</button>' + selSemana('sSem', l) + '<button class="ic-btn sec chico" id="sSig">›</button><button class="ic-btn sec chico" id="sHoy">Esta semana</button></div></div>' +
      '<div class="g-acc"><a class="ic-btn" href="#mejorar/' + l + '">✨ Mejorar con Claude</a><button class="ic-btn sec" id="sWord">📄 Word de la semana</button><a class="ic-btn sec" href="/ideascontrol/Imagenes/" target="_blank" rel="noopener">🗜️ Optimizar imágenes</a><a class="ic-btn sec" href="' + CFG.logo + '" download="Logo_GPA.png" title="Para adjuntarlo en la IA de imágenes">⬇ Logo GPA</a></div></div>' +
      cajaEstrategia(l) +
      '<p class="g-cuenta">' + ps.length + ' publicaciones · ' + CFG.estados.filter((e) => cuenta[e]).map((e) => chipEstado(e) + ' ' + cuenta[e]).join(' ') + '</p>' +
      '<div class="g-dias">' + dias + '</div>';
    const ir = (x) => { if (x) { App.verSem = x; vistaSemana(raiz); } };
    const i = App.semanas.indexOf(l);
    raiz.querySelector('#sAnt').onclick = () => ir(App.semanas[i - 1]);
    raiz.querySelector('#sSig').onclick = () => ir(App.semanas[i + 1]);
    raiz.querySelector('#sHoy').onclick = () => ir(semanaInicial());
    raiz.querySelector('#sSem').onchange = (e) => ir(e.target.value);
    raiz.querySelector('#sWord').onclick = (e) => U.conCarga(e.currentTarget, () => wordSemana(l));
    raiz.querySelectorAll('.g-card').forEach((c) => { c.onclick = (e) => { if (!e.target.closest('button')) location.hash = 'pub/' + c.dataset.id; }; });
    raiz.querySelectorAll('[data-copy]').forEach((b) => { b.onclick = (e) => { e.stopPropagation(); copiar(copyPublicar(pubDe(b.dataset.copy)), 'Copy copiado: ' + b.dataset.copy); b.textContent = 'Copy ✔'; }; });
    raiz.querySelectorAll('[data-bajar]').forEach((b) => { b.onclick = (e) => { e.stopPropagation(); U.conCarga(b, () => bajarPieza(pubDe(b.dataset.bajar)).catch((er) => U.aviso(errorArchivo(er), 'err'))); }; });
    enlazarPrompts(raiz, 'data-pi');
  }

  let logoBuf = null;
  async function logoDoc() { if (logoBuf) return logoBuf; try { const r = await fetch(CFG.logo); if (r.ok) logoBuf = await r.arrayBuffer(); } catch (e) { /* sin logo */ } return logoBuf; }
  // Word de la semana (se guarda en SharePoint y se descarga)
  async function wordSemana(l) {
    try {
      const ps = App.pubs.filter((p) => p.semana === l && p.estado !== 'Cancelada').sort(ordenar);
      const blob = await GPA_DOC.semana({ logo: await logoDoc(), fechaTxt: fd(l, { day: 'numeric', month: 'long', year: 'numeric' }), estrategia: App.estrategia[l], piezas: ps.map((p) => ({
        pub: p, diaTxt: fDia(p.fecha), copy: copyPublicar(p), enlace: utm(p), guion: guion(p), diseno: dis(p).descripcion || p.direccion, textoImg: dis(p).texto_en_imagen || '', partes: partes(p), medidas: medidas(p) })) });
      const nombre = 'GPA_Semana_' + l.slice(8, 10) + l.slice(5, 7) + l.slice(0, 4) + '.docx';
      let web = '';
      try { const r = await G.subirArchivo(CFG.carpeta + '/Semanas/' + l + '/' + nombre, blob); web = r.webUrl || ''; } catch (e) { U.aviso('No se guardó en SharePoint: ' + errorArchivo(e), 'warn', 7000); }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      U.aviso('Word listo' + (web ? ' y guardado en SharePoint (Semanas/' + l + ')' : ''), 'ok', 6000);
    } catch (e) { console.error(e); U.aviso('No se pudo crear el Word: ' + U.mensajeError(e), 'err', 9000); }
  }

  // =====================================================================
  // VISTA: PUBLICACIONES
  // =====================================================================
  const F = { sem: '', red: '', est: '', q: '' };
  function vistaLista(raiz) {
    if (!F.sem) F.sem = semanaInicial();
    const redes = CFG.redes.filter((r) => App.pubs.some((p) => p.canal === r)).concat(Array.from(new Set(App.pubs.map((p) => p.canal))).filter((c) => CFG.redes.indexOf(c) < 0));
    raiz.innerHTML = '<div class="g-cab"><h1 class="ic-titulo">Publicaciones</h1></div>' +
      '<div class="ic-filtros">' + selSemana('fSem', F.sem).replace('<select id="fSem">', '<select id="fSem"><option value="*">Todas las semanas</option>') +
      '<select id="fRed"><option value="">Todas las redes</option>' + redes.map((r) => '<option' + (r === F.red ? ' selected' : '') + '>' + esc(r) + '</option>').join('') + '</select>' +
      '<select id="fEst"><option value="">Todos los estados</option>' + CFG.estados.map((e) => '<option' + (e === F.est ? ' selected' : '') + '>' + e + '</option>').join('') + '</select>' +
      '<input id="fQ" placeholder="Buscar en gancho o texto…" value="' + esc(F.q) + '"></div><div id="tabla"></div>';
    if (F.sem === '*') raiz.querySelector('#fSem').value = '*';
    const pintar = () => {
      const q = U.norm(F.q);
      const lista = App.pubs.filter((p) => (F.sem === '*' || p.semana === F.sem) && (!F.red || p.canal === F.red) && (!F.est || p.estado === F.est) && (!q || U.norm(p.gancho + ' ' + p.texto + ' ' + p.copyFinal + ' ' + p.id).indexOf(q) >= 0))
        .sort((a, b) => a.semana.localeCompare(b.semana) || ordenRed(a.canal) - ordenRed(b.canal) || a.fecha.localeCompare(b.fecha));
      raiz.querySelector('#tabla').innerHTML = '<p class="ic-conteo">' + lista.length + ' publicaciones</p><div class="ic-tabla-caja"><table class="ic-tabla"><thead><tr><th>Semana</th><th>Red</th><th>Fecha de publicación</th><th>Publicación</th><th>Formato</th><th>Etapa</th><th>Estado</th><th>Link</th></tr></thead><tbody>' +
        (lista.map((p) => '<tr data-id="' + esc(p.id) + '"><td class="nw">' + esc(fCorta(p.semana)) + '</td><td>' + chipRed(p.canal) + '</td><td class="nw">' + esc(fLarga(p.fecha)) + '</td><td><b>' + esc(ganchoDe(p)) + '</b><br><span class="sec">' + esc(p.id) + (p.copyFinal ? ' · ✨ mejorado' : '') + '</span></td><td>' + esc(p.formato) + '</td><td>' + esc(p.etapa) + '</td><td>' + chipEstado(p.estado) + '</td><td>' + (p.link ? '<a href="' + esc(p.link) + '" target="_blank" rel="noopener">Ver ↗</a>' : '') + '</td></tr>').join('') ||
          '<tr><td colspan="8" class="ic-vacio">Sin publicaciones con ese filtro.</td></tr>') + '</tbody></table></div>';
      raiz.querySelectorAll('tr[data-id]').forEach((tr) => { tr.onclick = (e) => { if (!e.target.closest('a')) location.hash = 'pub/' + tr.dataset.id; }; });
    };
    raiz.querySelector('#fSem').onchange = (e) => { F.sem = e.target.value; pintar(); };
    raiz.querySelector('#fRed').onchange = (e) => { F.red = e.target.value; pintar(); };
    raiz.querySelector('#fEst').onchange = (e) => { F.est = e.target.value; pintar(); };
    raiz.querySelector('#fQ').oninput = (e) => { F.q = e.target.value; pintar(); };
    pintar();
  }

  // =====================================================================
  // VISTA: FICHA DE LA PUBLICACIÓN
  // =====================================================================
  function metricasDe(id) {
    const ms = App.met.filter((m) => String(m['ID']) === id);
    if (!ms.length) return null;
    return ms.slice().sort((a, b) => num(b['Fecha corte']) - num(a['Fecha corte']))[0];
  }
  const interacciones = (m) => ['Reacciones', 'Comentarios', 'Compartidos', 'Guardados'].reduce((s, k) => s + num(m[k]), 0);
  function vistaPub(raiz) {
    const p = pubDe(param(1));
    if (!p) { raiz.innerHTML = '<p class="ic-vacio">No encontré la publicación ' + esc(param(1)) + '. <a href="#lista">Volver</a></p>'; return; }
    const semana = App.pubs.filter((x) => x.semana === p.semana).sort(ordenar), i = semana.indexOf(p), ant = semana[i - 1], sig = semana[i + 1];
    const ps = partes(p), m = metricasDe(p.id), leads = App.leads.filter((x) => String(x['Publicación']) === p.id);
    raiz.innerHTML = '<div class="g-cab"><div><a class="sec" href="#">← Semana del ' + esc(fCorta(p.semana)) + '</a><h1 class="ic-titulo">' + chipRed(p.canal) + ' ' + esc(ganchoDe(p)) + '</h1>' +
        '<p class="ic-subtitulo">' + esc(p.id) + ' · ' + esc(fDia(p.fecha)) + ' · ' + esc(p.formato) + ' · Etapa: ' + esc(p.etapa) + ' · ' + chipEstado(p.estado) + '</p></div>' +
        '<div class="g-acc">' + (ant ? '<a class="ic-btn sec chico" href="#pub/' + esc(ant.id) + '">‹ ' + esc(ant.canal) + '</a>' : '') + (sig ? '<a class="ic-btn sec chico" href="#pub/' + esc(sig.id) + '">' + esc(sig.canal) + ' ›</a>' : '') + '</div></div>' +
      '<div class="g-ficha"><div class="g-col">' +
        '<section class="ic-bloque"><div class="cab"><h2>📣 Para publicar</h2><button class="ic-btn chico" id="pCopiar">Copiar copy</button></div><div class="cuerpo"><pre class="g-pre" id="pCopy">' + esc(copyPublicar(p)) + '</pre>' +
          (destino(p) ? '<div class="g-enlace"><b>Enlace con UTM</b><code>' + esc(utm(p)) + '</code><div class="g-btns"><button class="ic-btn sec chico" id="pUtm">Copiar enlace</button><a class="ic-btn sec chico" href="' + esc(utm(p)) + '" target="_blank" rel="noopener">Probar ↗</a></div><span class="sec">' + esc(notaEnlace(p)) + '</span></div>' : '') +
          (guion(p) ? '<details class="g-det" open><summary>🎬 Guion del video</summary><pre class="g-pre">' + esc(guion(p)) + '</pre><button class="ic-btn sec chico" id="pGuion">Copiar guion</button></details>' : '') + '</div></section>' +
        '<section class="ic-bloque"><div class="cab"><h2>🖼️ Prompt para la imagen</h2><span class="sec">' + esc(medidas(p)) + '</span></div><div class="cuerpo">' +
          '<p class="sec" style="margin:0 0 8px">' + (ps.length ? (esVideo(p) ? 'Video de ' + ps.length + ' tramos: portada y un prompt por tramo.' : ps.length + ' láminas: un prompt por lámina.') + ' Péguelos en orden en la misma conversación y adjunte el logo en el primero.' : 'Copie el prompt, péguelo en la IA de imágenes y adjunte el logo de GPA.') + '</p>' +
          '<div class="g-btns">' + botonesPrompt(p, 'data-pi') + '<button class="ic-btn sec chico" id="pVer">Ver</button><button class="ic-btn sec chico" id="pPlant">Editar plantilla</button><a class="ic-btn sec chico" href="' + CFG.logo + '" download="Logo_GPA.png">⬇ Logo GPA</a></div>' +
          '<p class="sec" style="margin:10px 0 0"><b>Qué se ve:</b> ' + esc(dis(p).descripcion || p.direccion || '—') + '</p></div></section>' +
        '<section class="ic-bloque"><div class="cab"><h2>Pieza</h2></div><div class="cuerpo"><div id="pArch" class="g-arch"><p class="sec">Cargando archivos…</p></div>' +
          '<div class="g-btns" style="align-items:center;margin-top:8px"><label class="ic-btn sec chico">Subir archivo(s)<input type="file" id="pSubir" multiple accept="image/*,video/*,.pdf" hidden></label>' +
          '<label class="sec" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="pOpt"' + (optimizarSiempre() ? ' checked' : '') + '> Optimizar imágenes al subir</label></div></div></section>' +
      '</div><div class="g-col">' +
        '<section class="ic-bloque"><div class="cab"><h2>Contenido</h2></div><div class="cuerpo"><form id="pForm" class="ic-form" novalidate><div class="ic-campos">' +
          U.campo({ name: 'estado', label: 'Estado', t: 'select', valor: p.estado, vacio: false, op: CFG.estados.map((e) => [e, e]), c: 'c6' }) +
          U.campo({ name: 'fecha', label: 'Fecha de publicación', t: 'date', valor: p.fecha, c: 'c6' }) +
          U.campo({ name: 'link', label: 'Link del post publicado', valor: p.link, ph: 'https://…', c: 'c12' }) +
          U.campo({ name: 'copyFinal', label: 'Copy final (vacío = usa el texto del plan)', t: 'textarea', valor: p.copyFinal, filas: 10, ph: cuerpo(p), c: 'c12' }) +
          U.campo({ name: 'notas', label: 'Notas', t: 'textarea', valor: p.notas, filas: 2, c: 'c12' }) +
          '</div><div class="ic-acciones"><span class="espacio"></span><button class="ic-btn" type="submit">Guardar en el Excel</button></div></form>' +
          '<dl class="g-dl"><dt>Gancho</dt><dd>' + esc(ganchoDe(p)) + '</dd><dt>CTA</dt><dd>' + esc(ctaDe(p)) + '</dd><dt>Indicador</dt><dd>' + esc(p.indicador) + '</dd>' +
          '<dt>Recurso</dt><dd>' + esc(p.recurso || '—') + (p.enlaceRecurso ? ' · <a href="' + esc(p.enlaceRecurso) + '" target="_blank" rel="noopener">abrir ↗</a>' : '') + '</dd>' +
          '<dt>Página</dt><dd>' + esc(p.pagina || '—') + (p.enlacePagina ? ' · <a href="' + esc(p.enlacePagina) + '" target="_blank" rel="noopener">abrir ↗</a>' : '') + '</dd>' +
          (dis(p).cambios ? '<dt>Mejora de Claude</dt><dd>' + esc(dis(p).cambios) + '</dd>' : '') + '</dl>' +
          '<details class="g-det"><summary>Texto original del plan</summary><pre class="g-pre">' + esc(p.texto) + '</pre></details></div></section>' +
        '<section class="ic-bloque"><div class="cab"><h2>Resultados</h2><button class="ic-btn sec chico" id="pMet">+ Métricas a mano</button></div><div class="cuerpo">' +
          (m ? '<div class="g-kpis">' + [['Alcance', m['Alcance']], ['Impresiones', m['Impresiones']], ['Interacciones', interacciones(m)], ['Clics', m['Clics']], ['Reproducciones', m['Reproducciones']]].map((k) => '<div><b>' + fmtN(num(k[1])) + '</b><span>' + k[0] + '</span></div>').join('') + '</div><p class="sec">Corte: ' + esc(X.serialAIso(m['Fecha corte']) || '') + '</p>' : '<p class="sec">Sin métricas todavía. Impórtelas en «Métricas».</p>') +
          '<p class="sec" style="margin:8px 0 0">Leads de esta publicación: <b>' + leads.length + '</b> · <a href="#leads">registrar lead</a></p></div></section>' +
      '</div></div>';
    raiz.querySelector('#pCopiar').onclick = () => copiar(copyPublicar(p), 'Copy copiado');
    const bu = raiz.querySelector('#pUtm'); if (bu) bu.onclick = () => copiar(utm(p), 'Enlace copiado');
    const bg = raiz.querySelector('#pGuion'); if (bg) bg.onclick = () => copiar(guion(p), 'Guion copiado');
    enlazarPrompts(raiz, 'data-pi');
    raiz.querySelector('#pVer').onclick = () => { const t = promptImagen(p, ps.length && !esVideo(p) ? 1 : 0); U.modal('Prompt de la imagen · ' + p.id, '<div class="ic-form"><pre class="g-pre" style="max-height:60vh">' + esc(t) + '</pre><div class="ic-acciones"><span class="espacio"></span><button class="ic-btn" id="vC">Copiar</button></div></div>', (mm) => { mm.querySelector('#vC').onclick = () => copiar(t); }); };
    raiz.querySelector('#pPlant').onclick = () => editarPlantilla('imagen', 'Plantilla del prompt de imágenes');
    raiz.querySelector('#pMet').onclick = () => metricaManual(p, () => vistaPub(raiz));
    const f = raiz.querySelector('#pForm');
    f.onsubmit = (e) => {
      e.preventDefault(); const v = U.leerForm(f), b = f.querySelector('[type=submit]');
      U.conCarga(b, async () => {
        const campos = {}; ['estado', 'link', 'copyFinal', 'notas', 'fecha'].forEach((k) => { if (String(v[k] || '') !== String(p[k] || '')) campos[k] = v[k] || ''; });
        if (!Object.keys(campos).length) { U.aviso('Sin cambios', 'warn'); return; }
        if (campos.estado === 'Publicada' && !(v.link || p.link)) U.aviso('Tip: pegue el link del post para cruzar las métricas', 'warn', 5000);
        try { await X.guardarPub(p, campos); U.aviso('Guardado en el Excel', 'ok'); vistaPub(raiz); } catch (er) { U.aviso(errorArchivo(er), 'err', 9000); }
      });
    };
    // Archivos de la pieza
    const pintarArch = async () => {
      const c = raiz.querySelector('#pArch'); let hs = [];
      try { hs = (await hijos(carpetaPieza(p))).filter((h) => h.file); } catch (e) { c.innerHTML = '<p class="sec">' + esc(errorArchivo(e)) + '</p>'; return; }
      if (!c.isConnected) return;
      c.innerHTML = hs.length ? hs.map((h) => '<div class="g-file">' + (/^image\//.test((h.file || {}).mimeType || '') && h['@microsoft.graph.downloadUrl'] ? '<img src="' + esc(h['@microsoft.graph.downloadUrl']) + '" alt="">' : '<span class="g-ico">📄</span>') +
        '<a href="' + esc(h.webUrl) + '" target="_blank" rel="noopener">' + esc(h.name) + '</a><span class="sec">' + Math.max(1, Math.round((h.size || 0) / 1024)) + ' KB</span><a class="g-bajar" href="' + esc(h['@microsoft.graph.downloadUrl'] || '#') + '" download="' + esc(h.name) + '">⬇</a></div>').join('') +
        (hs.length > 1 ? '<button class="ic-btn sec chico" id="pTodos">⬇ Descargar todos (' + hs.length + ')</button>' : '') : '<p class="sec">Aún no hay archivos. Suba aquí la imagen o el video generado.</p>';
      const t = c.querySelector('#pTodos'); if (t) t.onclick = () => bajar(hs);
    };
    pintarArch();
    raiz.querySelector('#pOpt').onchange = (e) => { try { localStorage.setItem('gpa_optimizar', e.target.checked ? '1' : '0'); } catch (er) { /* sin almacenamiento */ } };
    raiz.querySelector('#pSubir').onchange = async (e) => {
      let fs = Array.from(e.target.files || []); if (!fs.length) return;
      if (raiz.querySelector('#pOpt').checked) fs = await optimizar(fs, p);
      try { for (const fl of fs) await subir(carpetaPieza(p) + '/' + fl.name, fl); U.aviso(fs.length + ' archivo(s) subido(s)', 'ok'); if (p.estado === 'Planeada') await X.guardarPub(p, { estado: 'En producción' }); }
      catch (er) { U.aviso(errorArchivo(er), 'err', 8000); }
      pintarArch();
    };
  }

  // =====================================================================
  // VISTA: MEJORAR LA SEMANA CON CLAUDE
  // =====================================================================
  function promptMejorar(l) {
    const e = App.estrategia[l] || {}, ciclo = App.planMes[Math.floor(((e.n || 1) - 1) / 4)] || {};
    const ps = App.pubs.filter((p) => p.semana === l && p.estado !== 'Cancelada').sort(ordenar);
    const L = [(App.plant.mejorar || PR.mejorar).trim(), '', '═══ CONTEXTO DE LA SEMANA ═══',
      'Semana: ' + rangoSem(l) + (e.semana ? ' (' + (ciclo.ciclo || e.ciclo) + ' · ' + e.semana + ')' : ''),
      'Tema de la semana: ' + (e.tema || ''), 'Objetivo de comunicación: ' + (e.objetivo || ''), 'Ángulos sugeridos: ' + (e.angulos || ''), 'CTA recomendado: ' + (e.cta || ''),
      'Tema central del ciclo: ' + (ciclo.tema || ''), 'Objetivo estratégico del ciclo: ' + (ciclo.objetivo || ''), 'Oferta prioritaria: ' + (ciclo.oferta || ''), 'Audiencia: ' + (ciclo.audiencia || ''), 'Enfoque de conversión: ' + (ciclo.conversion || ''),
      '', '═══ RECURSOS Y PRECAUCIONES ═══'];
    App.recursos.forEach((r) => L.push('• ' + r.recurso + ' (' + r.enlace + '): ' + r.tipo + ' Cuándo: ' + r.cuando + '. Precaución: ' + r.precaucion));
    L.push('', '═══ PIEZAS DE LA SEMANA (' + ps.length + ') ═══');
    ps.forEach((p) => {
      L.push('', '--- ' + p.id + ' · ' + p.canal + ' · ' + fDia(p.fecha) + ' · ' + p.formato + ' · Etapa: ' + p.etapa,
        'Gancho: ' + ganchoDe(p), 'Texto actual:\n' + (p.copyFinal || p.texto), 'CTA: ' + ctaDe(p), 'Dirección creativa: ' + p.direccion,
        'Recurso: ' + (p.recurso || '—') + (p.enlaceRecurso ? ' (' + p.enlaceRecurso + ')' : '') + ' · Destino: ' + (p.pagina || '—') + ' · Indicador: ' + p.indicador);
    });
    L.push('', PR.formatoMejorar);
    return L.join('\n');
  }
  function leerJson(t) {
    t = String(t || '').trim(); const m = t.match(/```(?:json)?\s*([\s\S]*?)```/); if (m) t = m[1];
    const a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a < 0 || b < a) throw new Error('No encontré el JSON en la respuesta. Pegue la respuesta completa de Claude.');
    try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { throw new Error('El JSON no se pudo leer (' + e.message + '). Pídale a Claude que lo devuelva completo en un solo bloque.'); }
  }
  function vistaMejorar(raiz) {
    const l = App.semanas.indexOf(param(1)) >= 0 ? param(1) : (App.verSem || semanaInicial());
    const ps = App.pubs.filter((p) => p.semana === l && p.estado !== 'Cancelada');
    raiz.innerHTML = '<div class="g-cab"><div><h1 class="ic-titulo">Mejorar la semana con Claude</h1><div class="g-sel">' + selSemana('mSem', l) + '</div></div></div>' + cajaEstrategia(l) +
      '<ol class="g-pasos"><li><b>Copie el prompt</b> (' + ps.length + ' piezas de la semana con su estrategia, recursos y precauciones) y péguelo en Claude.</li><li><b>Pegue aquí</b> la respuesta completa de Claude (el bloque JSON).</li><li><b>Revise</b> pieza por pieza y aplique las que quiera: se guardan en el Excel (columnas «Copy final» y «Diseño»), sin borrar el texto original del plan.</li></ol>' +
      '<div class="g-btns"><button class="ic-btn" id="mCopiar">1. Copiar prompt</button><button class="ic-btn sec" id="mVer">Ver prompt</button><button class="ic-btn sec" id="mPlant">Editar plantilla</button></div>' +
      '<textarea id="mResp" rows="8" style="width:100%;margin-top:12px" placeholder="2. Pegue aquí la respuesta de Claude…"></textarea><div class="g-btns"><button class="ic-btn" id="mLeer">Leer respuesta</button></div><div id="mPrev"></div>';
    raiz.querySelector('#mSem').onchange = (e) => { location.hash = 'mejorar/' + e.target.value; };
    raiz.querySelector('#mCopiar').onclick = () => copiar(promptMejorar(l), 'Prompt copiado: péguelo en Claude');
    raiz.querySelector('#mVer').onclick = () => U.modal('Prompt · semana ' + rangoSem(l), '<pre class="g-pre" style="max-height:70vh">' + esc(promptMejorar(l)) + '</pre>');
    raiz.querySelector('#mPlant').onclick = () => editarPlantilla('mejorar', 'Plantilla: mejorar la semana');
    raiz.querySelector('#mLeer').onclick = () => {
      let d; try { d = leerJson(raiz.querySelector('#mResp').value); } catch (e) { U.aviso(e.message, 'err', 9000); return; }
      const lista = (d.piezas || []).map((x) => ({ x, p: pubDe(String(x.id || '').trim()) })).filter((y) => y.p);
      const sin = (d.piezas || []).length - lista.length;
      raiz.querySelector('#mPrev').innerHTML = '<h2 class="g-h2">Vista previa · ' + lista.length + ' piezas' + (sin ? ' <span class="sec">(' + sin + ' sin ID reconocido)</span>' : '') + '</h2>' +
        (d.notas_semana ? '<div class="g-nota">💡 ' + esc(d.notas_semana) + '</div>' : '') +
        lista.sort((a, b) => ordenar(a.p, b.p)).map(({ x, p }) => '<div class="g-prev"><label class="g-prev-cab"><input type="checkbox" data-ap="' + esc(p.id) + '" checked> ' + chipRed(p.canal) + ' <b>' + esc(fDia(p.fecha)) + '</b> · ' + esc(p.formato) + ' · ' + esc(p.id) + '</label>' +
          '<div class="g-prev-g"><div><span class="sec">Antes</span><b>' + esc(ganchoDe(p)) + '</b><pre class="g-pre chico">' + esc(p.copyFinal || p.texto) + '</pre></div><div><span class="sec">Después</span><b>' + esc(x.gancho || '') + '</b><pre class="g-pre chico">' + esc(x.copy || '') + (x.cta ? '\n\n' + x.cta : '') + '</pre>' +
          ((x.diseno && x.diseno.laminas && x.diseno.laminas.length) ? '<span class="sec">' + x.diseno.laminas.length + ' láminas</span> ' : '') + ((x.video && x.video.tramos && x.video.tramos.length) ? '<span class="sec">' + x.video.tramos.length + ' tramos de video</span>' : '') + '</div></div>' +
          (x.cambios ? '<p class="sec" style="margin:6px 0 0">✨ ' + esc(x.cambios) + '</p>' : '') + '</div>').join('') +
        (lista.length ? '<div class="g-btns"><button class="ic-btn" id="mAplicar">Aplicar las marcadas en el Excel</button></div>' : '');
      const ba = raiz.querySelector('#mAplicar');
      if (ba) ba.onclick = () => U.conCarga(ba, async () => {
        let n = 0; const err = [];
        for (const { x, p } of lista) {
          if (!raiz.querySelector('[data-ap="' + p.id + '"]').checked) continue;
          const di = Object.assign({}, x.diseno || {}, { gancho: x.gancho || '', cta: x.cta || '', hashtags: x.hashtags || '', video: x.video || null, cambios: x.cambios || '' });
          const campos = { copyFinal: String(x.copy || '').trim(), diseno: di }; if (p.estado === 'Planeada') campos.estado = 'En producción';
          try { await X.guardarPub(p, campos); n++; } catch (e) { err.push(p.id + ': ' + errorArchivo(e)); if (e.status === 423) break; }
        }
        try { await G.subirArchivo(CFG.carpeta + '/Semanas/' + l + '/Mejora_' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.json', new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' })); } catch (e) { /* respaldo opcional */ }
        U.aviso(n + ' pieza(s) guardadas en el Excel' + (err.length ? ' · ' + err.join(' · ') : ''), err.length ? 'warn' : 'ok', 8000);
        if (n) { App.verSem = l; location.hash = ''; }
      });
    };
  }

  // =====================================================================
  // VISTA: MÉTRICAS
  // =====================================================================
  const CAB_MET = ['ID', 'Red', 'Fecha publicación', 'Fecha corte', 'Alcance', 'Impresiones', 'Reacciones', 'Comentarios', 'Compartidos', 'Guardados', 'Clics', 'Reproducciones', 'Nuevos seguidores', 'Enlace', 'Fuente'];
  const MAP_MET = { alcance: 'Alcance', impresiones: 'Impresiones', reacciones: 'Reacciones', comentarios: 'Comentarios', compartidos: 'Compartidos', guardados: 'Guardados', clics: 'Clics', reproducciones: 'Reproducciones', nuevos_seguidores: 'Nuevos seguidores' };
  function vistaMetricas(raiz) {
    if (!F.msem) F.msem = '*';
    raiz.innerHTML = '<div class="g-cab"><h1 class="ic-titulo">Métricas</h1></div>' +
      '<section class="ic-bloque"><div class="cab"><h2>Importar estadísticas</h2></div><div class="cuerpo"><p class="sec" style="margin-top:0">Exportación de Meta Business Suite (Facebook / Instagram), LinkedIn (página o perfil) o TikTok Studio, en .csv o .xlsx. La app propone a qué publicación del plan corresponde cada fila (red, fecha y texto); usted confirma.</p>' +
        '<div class="ic-campos"><div class="ic-campo c6"><label for="iA">Archivo</label><input type="file" id="iA" accept=".csv,.xlsx,.xls"></div><div class="ic-campo c3"><label for="iC">Fecha de corte</label><input type="date" id="iC" value="' + hoy() + '"></div>' +
        '<div class="ic-campo c3"><label for="iR">Red (si el archivo no la dice)</label><select id="iR"><option value="">Automática</option><option>Facebook</option><option>Instagram</option><option>LinkedIn personal</option><option>LinkedIn empresa</option><option>TikTok</option></select></div></div>' +
        '<div id="iPrev"></div></div></section>' +
      '<section class="ic-bloque" style="margin-top:14px"><div class="cab"><h2>Resultados por publicación</h2>' + selSemana('mfSem', F.msem).replace('<select id="mfSem">', '<select id="mfSem"><option value="*">Todas las semanas</option>') + '</div><div class="cuerpo" id="mTabla"></div></section>';
    if (F.msem === '*') raiz.querySelector('#mfSem').value = '*';
    const pintarTabla = () => {
      const ps = App.pubs.filter((p) => (F.msem === '*' || p.semana === F.msem) && metricasDe(p.id)).sort(ordenar);
      raiz.querySelector('#mTabla').innerHTML = ps.length ? '<div class="ic-tabla-caja"><table class="ic-tabla"><thead><tr><th>Red</th><th>Fecha</th><th>Publicación</th><th>Alcance</th><th>Impresiones</th><th>Interacciones</th><th>Clics</th><th>Reprod.</th><th>Corte</th></tr></thead><tbody>' +
        ps.map((p) => { const m = metricasDe(p.id); return '<tr data-id="' + esc(p.id) + '"><td>' + chipRed(p.canal) + '</td><td class="nw">' + esc(fCorta(p.fecha)) + '</td><td>' + esc(ganchoDe(p)).slice(0, 90) + '</td><td>' + fmtN(num(m['Alcance'])) + '</td><td>' + fmtN(num(m['Impresiones'])) + '</td><td>' + fmtN(interacciones(m)) + '</td><td>' + fmtN(num(m['Clics'])) + '</td><td>' + fmtN(num(m['Reproducciones'])) + '</td><td class="nw">' + esc(fCorta(X.serialAIso(m['Fecha corte']))) + '</td></tr>'; }).join('') +
        '</tbody></table></div>' : '<p class="sec">Sin métricas para esa semana.</p>';
      raiz.querySelectorAll('#mTabla tr[data-id]').forEach((tr) => { tr.onclick = () => { location.hash = 'pub/' + tr.dataset.id; }; });
    };
    raiz.querySelector('#mfSem').onchange = (e) => { F.msem = e.target.value; pintarTabla(); };
    pintarTabla();
    raiz.querySelector('#iA').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return; const prev = raiz.querySelector('#iPrev'); prev.innerHTML = '<p class="sec">Leyendo…</p>';
      let d; try { d = await GPA_IMP.leerArchivo(f); } catch (er) { prev.innerHTML = '<p class="g-err">' + esc(er.message) + '</p>'; return; }
      const corte = raiz.querySelector('#iC').value || hoy(), redF = raiz.querySelector('#iR').value;
      let filas = GPA_IMP.emparejar(d, corte);
      if (redF) filas = filas.map((x) => { x.r.red = redF; const c = App.pubs.filter((p) => p.canal === redF && Math.abs(new Date(p.fecha) - new Date(x.r.fecha)) <= 864e5 * 1.5); if (!c.some((p) => p.id === x.pub)) x.pub = (c[0] || {}).id || ''; x.cands = c.map((p) => p.id); return x; });
      const opts = (x) => '<option value="">— no guardar —</option>' + Array.from(new Set(x.cands.concat(x.pub ? [x.pub] : []))).map((id) => { const p = pubDe(id); return '<option value="' + esc(id) + '"' + (id === x.pub ? ' selected' : '') + '>' + esc(id + ' · ' + p.canal + ' · ' + fCorta(p.fecha) + ' · ' + ganchoDe(p).slice(0, 50)) + '</option>'; }).join('');
      prev.innerHTML = '<p class="sec">' + esc(GPA_IMP.NOMBRE[d.fuente]) + ' · ' + filas.length + ' filas · ' + filas.filter((x) => x.pub).length + ' con publicación propuesta</p><div class="ic-tabla-caja"><table class="ic-tabla"><thead><tr><th>Fecha</th><th>Red</th><th>Texto del archivo</th><th>Alcance / Impr.</th><th>Publicación del plan</th></tr></thead><tbody>' +
        filas.map((x, i) => '<tr><td class="nw">' + esc(fCorta(x.r.fecha)) + '</td><td>' + esc(x.r.red || '?') + '</td><td>' + esc(String(x.r.texto || '').slice(0, 80)) + '</td><td>' + fmtN(x.n.alcance) + ' / ' + fmtN(x.n.impresiones || x.n.reproducciones) + '</td><td><select data-fila="' + i + '">' + opts(x) + '</select></td></tr>').join('') +
        '</tbody></table></div><div class="g-btns"><button class="ic-btn" id="iG">Guardar en «Métricas»</button></div>';
      prev.querySelector('#iG').onclick = () => U.conCarga(prev.querySelector('#iG'), async () => {
        const nuevos = [];
        prev.querySelectorAll('[data-fila]').forEach((s) => { if (!s.value) return; const x = filas[+s.dataset.fila], p = pubDe(s.value); const o = { 'ID': p.id, 'Red': p.canal, 'Fecha publicación': p.fecha, 'Fecha corte': corte, 'Enlace': x.r.enlace || '', 'Fuente': GPA_IMP.NOMBRE[d.fuente] }; Object.keys(MAP_MET).forEach((k) => { o[MAP_MET[k]] = x.n[k] == null ? '' : x.n[k]; }); nuevos.push(o); });
        if (!nuevos.length) { U.aviso('No hay filas con publicación elegida', 'warn'); return; }
        try {
          const r = await X.agregarVarias(CFG.hojas.metricas, CAB_MET, nuevos);
          r.forEach((o) => { o['Fecha corte'] = X.isoASerial(corte); App.met.push(o); });
          for (const o of nuevos) { const p = pubDe(o['ID']); const c = {}; if (o['Enlace'] && !p.link) c.link = o['Enlace']; if (['Publicada', 'Cancelada'].indexOf(p.estado) < 0) c.estado = 'Publicada'; if (Object.keys(c).length) await X.guardarPub(p, c); }
          U.aviso(nuevos.length + ' fila(s) guardadas en «Métricas»', 'ok'); prev.innerHTML = ''; pintarTabla();
        } catch (er) { U.aviso(errorArchivo(er), 'err', 9000); }
      });
    };
  }
  function metricaManual(p, despues) {
    U.modal('Métricas · ' + p.id, '<form class="ic-form" id="mmF"><div class="ic-campos">' + U.campo({ name: 'corte', label: 'Fecha de corte', t: 'date', valor: hoy(), c: 'c4' }) +
      Object.values(MAP_MET).map((k) => U.campo({ name: k, label: k, t: 'number', c: 'c4' })).join('') + U.campo({ name: 'enlace', label: 'Enlace del post', valor: p.link, c: 'c12' }) +
      '</div><div class="ic-acciones"><span class="espacio"></span><button class="ic-btn" type="submit">Guardar</button></div></form>', (m) => {
      const f = m.querySelector('#mmF'); f.onsubmit = (e) => { e.preventDefault(); const v = U.leerForm(f); U.conCarga(f.querySelector('[type=submit]'), async () => {
        const o = { 'ID': p.id, 'Red': p.canal, 'Fecha publicación': p.fecha, 'Fecha corte': v.corte || hoy(), 'Enlace': v.enlace || '', 'Fuente': 'Manual' }; Object.values(MAP_MET).forEach((k) => { o[k] = v[k] === '' || v[k] == null ? '' : num(v[k]); });
        try { const r = await X.agregar(CFG.hojas.metricas, CAB_MET, o); r['Fecha corte'] = X.isoASerial(o['Fecha corte']); App.met.push(r); U.cerrarModal(); U.aviso('Métricas guardadas', 'ok'); if (despues) despues(); } catch (er) { U.aviso(errorArchivo(er), 'err', 8000); }
      }); };
    });
  }

  // =====================================================================
  // VISTA: LEADS
  // =====================================================================
  const CAB_LEAD = ['Fecha', 'Nombre', 'Empresa', 'Cargo', 'Contacto', 'Publicación', 'Red', 'Necesidad', 'Calificado', 'Reunión', 'Estado', 'Próximo paso', 'Notas'];
  const EST_LEAD = ['Nuevo', 'Contactado', 'Calificado', 'Reunión agendada', 'Reunión realizada', 'Propuesta', 'Ganado', 'Perdido'];
  const esCalif = (x) => /^s[ií]/i.test(String(x['Calificado'] || ''));
  const conReunion = (x) => !!X.serialAIso(x['Reunión']) || /reuni/i.test(String(x['Estado'] || ''));
  function vistaLeads(raiz) {
    const L = App.leads.slice().sort((a, b) => num(b['Fecha']) - num(a['Fecha']));
    raiz.innerHTML = '<div class="g-cab"><h1 class="ic-titulo">Leads</h1><div class="g-acc"><button class="ic-btn" id="lN">+ Registrar lead</button></div></div>' +
      '<div class="g-kpis grande"><div><b>' + L.length + '</b><span>Leads</span></div><div><b>' + L.filter(esCalif).length + '</b><span>Calificados</span></div><div><b>' + L.filter(conReunion).length + '</b><span>Reuniones</span></div><div><b>' + L.filter((x) => /ganado/i.test(x['Estado'] || '')).length + '</b><span>Ganados</span></div></div>' +
      '<div class="ic-tabla-caja"><table class="ic-tabla"><thead><tr><th>Fecha</th><th>Nombre / empresa</th><th>Fuente</th><th>Necesidad</th><th>Calificado</th><th>Reunión</th><th>Estado</th><th>Próximo paso</th></tr></thead><tbody>' +
      (L.map((x, i) => '<tr data-i="' + i + '"><td class="nw">' + esc(fCorta(X.serialAIso(x['Fecha']))) + '</td><td><b>' + esc(x['Nombre'] || '') + '</b><br><span class="sec">' + esc([x['Empresa'], x['Cargo']].filter(Boolean).join(' · ')) + '</span></td><td>' + esc(x['Red'] || '') + '<br><span class="sec">' + esc(x['Publicación'] || '') + '</span></td><td>' + esc(x['Necesidad'] || '') + '</td><td>' + esc(x['Calificado'] || '') + '</td><td class="nw">' + esc(fCorta(X.serialAIso(x['Reunión']))) + '</td><td>' + esc(x['Estado'] || '') + '</td><td>' + esc(x['Próximo paso'] || '') + '</td></tr>').join('') ||
        '<tr><td colspan="8" class="ic-vacio">Todavía no hay leads. Regístrelos el mismo día hábil, con la publicación que los trajo.</td></tr>') + '</tbody></table></div>';
    raiz.querySelector('#lN').onclick = () => editarLead(null, () => vistaLeads(raiz));
    raiz.querySelectorAll('tr[data-i]').forEach((tr) => { tr.onclick = () => editarLead(L[+tr.dataset.i], () => vistaLeads(raiz)); });
  }
  function editarLead(x, despues) {
    const v = x || { 'Fecha': X.isoASerial(hoy()), 'Estado': 'Nuevo', 'Calificado': '' };
    const pubs = App.pubs.filter((p) => p.fecha <= sumar(hoy(), 14) && p.fecha >= sumar(hoy(), -90)).sort((a, b) => b.fecha.localeCompare(a.fecha));
    U.modal(x ? 'Lead · ' + (x['Nombre'] || '') : 'Nuevo lead', '<form class="ic-form" id="lF"><div class="ic-campos">' +
      U.campo({ name: 'Fecha', label: 'Fecha', t: 'date', valor: X.serialAIso(v['Fecha']) || hoy(), c: 'c4' }) + U.campo({ name: 'Nombre', label: 'Nombre', valor: v['Nombre'], req: true, c: 'c8' }) +
      U.campo({ name: 'Empresa', label: 'Empresa', valor: v['Empresa'], c: 'c6' }) + U.campo({ name: 'Cargo', label: 'Cargo', valor: v['Cargo'], c: 'c6' }) + U.campo({ name: 'Contacto', label: 'Contacto (correo / teléfono)', valor: v['Contacto'], c: 'c12' }) +
      U.campo({ name: 'Publicación', label: 'Publicación que lo trajo', t: 'select', valor: v['Publicación'], vacio: 'No sé / otra fuente', op: pubs.map((p) => [p.id, p.id + ' · ' + p.canal + ' · ' + fCorta(p.fecha) + ' · ' + ganchoDe(p).slice(0, 40)]), c: 'c8' }) +
      U.campo({ name: 'Red', label: 'Red / fuente', valor: v['Red'], ph: 'Se llena con la publicación', c: 'c4' }) +
      U.campo({ name: 'Necesidad', label: 'Necesidad', t: 'textarea', valor: v['Necesidad'], filas: 2, c: 'c12' }) +
      U.campo({ name: 'Calificado', label: 'Calificado', t: 'select', valor: v['Calificado'], vacio: 'Por definir', op: [['Sí', 'Sí'], ['No', 'No']], c: 'c4' }) +
      U.campo({ name: 'Reunión', label: 'Fecha de reunión', t: 'date', valor: X.serialAIso(v['Reunión']), c: 'c4' }) +
      U.campo({ name: 'Estado', label: 'Estado', t: 'select', valor: v['Estado'], vacio: false, op: EST_LEAD.map((e) => [e, e]), c: 'c4' }) +
      U.campo({ name: 'Próximo paso', label: 'Próximo paso', valor: v['Próximo paso'], c: 'c12' }) + U.campo({ name: 'Notas', label: 'Notas', t: 'textarea', valor: v['Notas'], filas: 2, c: 'c12' }) +
      '</div><div class="ic-acciones">' + (x ? '<button type="button" class="ic-btn peligro" id="lB">Borrar</button>' : '') + '<span class="espacio"></span><button class="ic-btn" type="submit">Guardar</button></div></form>', (m) => {
      const f = m.querySelector('#lF'), sp = f.querySelector('[name="Publicación"]');
      sp.onchange = () => { const p = pubDe(sp.value); if (p) f.querySelector('[name="Red"]').value = p.canal; };
      f.onsubmit = (e) => { e.preventDefault(); const d = U.leerForm(f); if (!String(d['Nombre'] || '').trim()) { U.aviso('Escriba el nombre', 'warn'); return; }
        U.conCarga(f.querySelector('[type=submit]'), async () => {
          try {
            if (x) await X.actualizarFila(CFG.hojas.leads, CAB_LEAD, x, Object.assign({}, d, { 'Fecha': d['Fecha'], 'Reunión': d['Reunión'] || '' }));
            else { const r = await X.agregar(CFG.hojas.leads, CAB_LEAD, d); r['Fecha'] = X.isoASerial(d['Fecha'] || hoy()); if (d['Reunión']) r['Reunión'] = X.isoASerial(d['Reunión']); App.leads.push(r); }
            if (x) { x['Fecha'] = X.isoASerial(d['Fecha'] || hoy()); x['Reunión'] = d['Reunión'] ? X.isoASerial(d['Reunión']) : ''; }
            U.cerrarModal(); U.aviso('Lead guardado', 'ok'); despues();
          } catch (er) { U.aviso(errorArchivo(er), 'err', 8000); }
        }); };
      const b = m.querySelector('#lB');
      if (b) b.onclick = async () => { if (!(await U.confirmar('Borrar lead', '¿Borrar a ' + (x['Nombre'] || '') + ' de la hoja «Leads»?', 'Borrar', true))) return; try { await X.borrarFila(CFG.hojas.leads, x); App.leads = App.leads.filter((y) => y !== x); App.leads.forEach((y) => { if (y._fila > x._fila) y._fila--; }); U.cerrarModal(); despues(); } catch (er) { U.aviso(errorArchivo(er), 'err'); } };
    });
  }

  // =====================================================================
  // VISTA: PAUTA (campaña paga)
  // =====================================================================
  const CAB_PAUTA = ['Fecha', 'Campaña', 'Gancho', 'Inversión', 'Impresiones', 'Alcance', 'Clics', 'Leads', 'Leads calificados', 'Reuniones', 'Notas'];
  function vistaPauta(raiz) {
    const P = App.pauta, porG = {};
    P.forEach((x) => { const g = String(x['Gancho'] || 'Sin gancho'); const a = porG[g] = porG[g] || { inv: 0, imp: 0, cli: 0, lea: 0, cal: 0, reu: 0 }; a.inv += num(x['Inversión']); a.imp += num(x['Impresiones']); a.cli += num(x['Clics']); a.lea += num(x['Leads']); a.cal += num(x['Leads calificados']); a.reu += num(x['Reuniones']); });
    const ganchos = App.campana.filter((c) => /^gancho/i.test(c.k));
    raiz.innerHTML = '<div class="g-cab"><h1 class="ic-titulo">Pauta</h1><div class="g-acc"><button class="ic-btn" id="pN">+ Registrar resultados</button></div></div>' +
      '<section class="ic-bloque"><div class="cab"><h2>Campaña recomendada en el plan</h2></div><div class="cuerpo"><dl class="g-dl">' + App.campana.map((c) => '<dt>' + esc(c.k) + '</dt><dd>' + (/^https?:/.test(c.v) ? '<a href="' + esc(c.v) + '" target="_blank" rel="noopener">' + esc(c.v) + '</a>' : esc(c.v)) + '</dd>').join('') + '</dl></div></section>' +
      '<section class="ic-bloque" style="margin-top:14px"><div class="cab"><h2>Comparación por gancho</h2></div><div class="cuerpo">' +
        (Object.keys(porG).length ? '<div class="ic-tabla-caja"><table class="ic-tabla"><thead><tr><th>Gancho</th><th>Inversión</th><th>Impresiones</th><th>Clics</th><th>CTR</th><th>Leads</th><th>Costo por lead</th><th>Calificados</th><th>Reuniones</th></tr></thead><tbody>' +
          Object.keys(porG).map((g) => { const a = porG[g]; return '<tr><td><b>' + esc(g) + '</b></td><td>' + U.fmt.cop(a.inv) + '</td><td>' + fmtN(a.imp) + '</td><td>' + fmtN(a.cli) + '</td><td>' + (a.imp ? (100 * a.cli / a.imp).toFixed(2).replace('.', ',') + ' %' : '—') + '</td><td>' + fmtN(a.lea) + '</td><td>' + (a.lea ? U.fmt.cop(a.inv / a.lea) : '—') + '</td><td>' + fmtN(a.cal) + '</td><td>' + fmtN(a.reu) + '</td></tr>'; }).join('') + '</tbody></table></div>'
          : '<p class="sec">Registre los resultados del administrador de anuncios por gancho (' + esc(ganchos.map((g) => g.k).join(' / ') || 'A / B') + ') para compararlos.</p>') + '</div></section>' +
      (P.length ? '<section class="ic-bloque" style="margin-top:14px"><div class="cab"><h2>Registros</h2></div><div class="cuerpo"><div class="ic-tabla-caja"><table class="ic-tabla"><thead><tr><th>Fecha</th><th>Campaña</th><th>Gancho</th><th>Inversión</th><th>Impr.</th><th>Clics</th><th>Leads</th><th>Notas</th></tr></thead><tbody>' +
        P.map((x) => '<tr><td class="nw">' + esc(fCorta(X.serialAIso(x['Fecha']))) + '</td><td>' + esc(x['Campaña'] || '') + '</td><td>' + esc(x['Gancho'] || '') + '</td><td>' + U.fmt.cop(num(x['Inversión'])) + '</td><td>' + fmtN(num(x['Impresiones'])) + '</td><td>' + fmtN(num(x['Clics'])) + '</td><td>' + fmtN(num(x['Leads'])) + '</td><td>' + esc(x['Notas'] || '') + '</td></tr>').join('') + '</tbody></table></div></div></section>' : '');
    raiz.querySelector('#pN').onclick = () => {
      const camp = (App.campana.find((c) => /campa/i.test(c.k)) || {}).v || 'Talento 360™';
      U.modal('Resultados de pauta', '<form class="ic-form" id="paF"><div class="ic-campos">' + U.campo({ name: 'Fecha', label: 'Fecha (corte)', t: 'date', valor: hoy(), c: 'c4' }) + U.campo({ name: 'Campaña', label: 'Campaña', valor: camp, c: 'c8' }) +
        U.campo({ name: 'Gancho', label: 'Gancho', t: 'select', vacio: false, op: (ganchos.length ? ganchos.map((g) => [g.k, g.k + ' · ' + g.v.slice(0, 50)]) : [['Gancho A', 'Gancho A'], ['Gancho B', 'Gancho B']]).concat([['Otro', 'Otro']]), c: 'c12' }) +
        ['Inversión', 'Impresiones', 'Alcance', 'Clics', 'Leads', 'Leads calificados', 'Reuniones'].map((k) => U.campo({ name: k, label: k, t: 'number', c: 'c4' })).join('') + U.campo({ name: 'Notas', label: 'Notas', t: 'textarea', filas: 2, c: 'c12' }) +
        '</div><div class="ic-acciones"><span class="espacio"></span><button class="ic-btn" type="submit">Guardar</button></div></form>', (m) => {
        const f = m.querySelector('#paF'); f.onsubmit = (e) => { e.preventDefault(); const v = U.leerForm(f); U.conCarga(f.querySelector('[type=submit]'), async () => {
          ['Inversión', 'Impresiones', 'Alcance', 'Clics', 'Leads', 'Leads calificados', 'Reuniones'].forEach((k) => { v[k] = v[k] === '' ? '' : num(v[k]); });
          try { const r = await X.agregar(CFG.hojas.pauta, CAB_PAUTA, v); r['Fecha'] = X.isoASerial(v['Fecha'] || hoy()); App.pauta.push(r); U.cerrarModal(); U.aviso('Guardado en «Pauta»', 'ok'); vistaPauta(raiz); } catch (er) { U.aviso(errorArchivo(er), 'err', 8000); }
        }); };
      });
    };
  }

  // =====================================================================
  // VISTA: RESUMEN + ANÁLISIS CON CLAUDE
  // =====================================================================
  function datosPeriodo(d, h) {
    const enR = (iso) => iso && iso >= d && iso <= h;
    const ps = App.pubs.filter((p) => enR(p.fecha) && p.estado !== 'Cancelada').sort(ordenar);
    const filas = ps.map((p) => ({ p, m: metricasDe(p.id) }));
    const s = (k) => filas.reduce((a, x) => a + (x.m ? (k === 'int' ? interacciones(x.m) : num(x.m[k])) : 0), 0);
    const leads = App.leads.filter((x) => enR(X.serialAIso(x['Fecha']))), pauta = App.pauta.filter((x) => enR(X.serialAIso(x['Fecha'])));
    const k = {
      plan: ps.length, pub: ps.filter((p) => p.estado === 'Publicada').length, alcance: s('Alcance'), impresiones: s('Impresiones'), int: s('int'), clics: s('Clics'), reprod: s('Reproducciones'),
      leads: leads.length, calif: leads.filter(esCalif).length, reun: leads.filter(conReunion).length, inv: pauta.reduce((a, x) => a + num(x['Inversión']), 0), leadsPauta: pauta.reduce((a, x) => a + num(x['Leads']), 0)
    };
    const porRed = {}; filas.forEach(({ p, m }) => { const r = porRed[p.canal] = porRed[p.canal] || { n: 0, pub: 0, alc: 0, int: 0, cli: 0 }; r.n++; if (p.estado === 'Publicada') r.pub++; if (m) { r.alc += num(m['Alcance']) || num(m['Impresiones']) || num(m['Reproducciones']); r.int += interacciones(m); r.cli += num(m['Clics']); } });
    return { ps, filas, leads, pauta, k, porRed };
  }
  function vistaResumen(raiz) {
    if (!F.rd) { F.rh = hoy(); F.rd = sumar(F.rh, -27); }
    const D = datosPeriodo(F.rd, F.rh), k = D.k;
    const top = D.filas.filter((x) => x.m).sort((a, b) => interacciones(b.m) - interacciones(a.m)).slice(0, 5);
    raiz.innerHTML = '<div class="g-cab"><h1 class="ic-titulo">Resumen</h1><div class="g-sel"><label>Desde <input type="date" id="rD" value="' + F.rd + '"></label><label>Hasta <input type="date" id="rH" value="' + F.rh + '"></label>' +
        '<button class="ic-btn sec chico" data-r="7">7 días</button><button class="ic-btn sec chico" data-r="28">28 días</button><button class="ic-btn sec chico" data-r="ciclo">Ciclo actual</button></div></div>' +
      '<div class="g-kpis grande">' + [['Publicadas', k.pub + ' / ' + k.plan], ['Cumplimiento', k.plan ? Math.round(100 * k.pub / k.plan) + ' %' : '—'], ['Alcance', fmtN(k.alcance)], ['Impresiones', fmtN(k.impresiones)], ['Interacciones', fmtN(k.int)], ['Clics', fmtN(k.clics)],
        ['Leads', k.leads], ['Calificados', k.calif], ['Reuniones', k.reun], ['Inversión pauta', U.fmt.cop(k.inv)], ['Costo por lead (pauta)', k.leadsPauta ? U.fmt.cop(k.inv / k.leadsPauta) : '—']].map((x) => '<div><b>' + esc(String(x[1])) + '</b><span>' + x[0] + '</span></div>').join('') + '</div>' +
      '<div class="g-ficha"><div class="g-col"><section class="ic-bloque"><div class="cab"><h2>Por red</h2></div><div class="cuerpo"><table class="ic-tabla"><thead><tr><th>Red</th><th>Publicadas</th><th>Alcance</th><th>Interacciones</th><th>Clics</th></tr></thead><tbody>' +
        Object.keys(D.porRed).sort((a, b) => ordenRed(a) - ordenRed(b)).map((r) => { const x = D.porRed[r]; return '<tr><td>' + chipRed(r) + '</td><td>' + x.pub + ' / ' + x.n + '</td><td>' + fmtN(x.alc) + '</td><td>' + fmtN(x.int) + '</td><td>' + fmtN(x.cli) + '</td></tr>'; }).join('') + '</tbody></table></div></section></div>' +
      '<div class="g-col"><section class="ic-bloque"><div class="cab"><h2>Top 5 por interacciones</h2></div><div class="cuerpo">' + (top.length ? top.map((x) => '<p class="g-top"><a href="#pub/' + esc(x.p.id) + '">' + chipRed(x.p.canal) + ' ' + esc(ganchoDe(x.p)) + '</a><span class="sec">' + fmtN(interacciones(x.m)) + ' interacciones · ' + fmtN(num(x.m['Alcance']) || num(x.m['Impresiones'])) + ' alcance</span></p>').join('') : '<p class="sec">Sin métricas en el periodo.</p>') + '</div></section></div></div>' +
      '<section class="ic-bloque" style="margin-top:14px"><div class="cab"><h2>✨ Análisis con Claude</h2><button class="ic-btn sec chico" id="aPl">Editar plantilla</button></div><div class="cuerpo">' +
        '<div class="g-btns"><button class="ic-btn" id="aCopiar">1. Copiar prompt con los datos</button></div><textarea id="aResp" rows="8" style="width:100%;margin-top:10px" placeholder="2. Pegue aquí la respuesta de Claude…"></textarea>' +
        '<div class="g-btns"><button class="ic-btn" id="aWord">3. Guardar informe Word</button></div><div id="aLista" class="sec" style="margin-top:10px"></div></div></section>';
    const ir = (d, h) => { F.rd = d; F.rh = h; vistaResumen(raiz); };
    raiz.querySelector('#rD').onchange = (e) => ir(e.target.value, F.rh);
    raiz.querySelector('#rH').onchange = (e) => ir(F.rd, e.target.value);
    raiz.querySelectorAll('[data-r]').forEach((b) => { b.onclick = () => {
      if (b.dataset.r === 'ciclo') { const l = semanaActual(), e = App.estrategia[l] || App.estrategia[semanaInicial()] || { n: 1 }, i0 = Math.floor((e.n - 1) / 4) * 4, ini = App.semanas[i0] || App.semanas[0]; ir(ini, sumar(App.semanas[Math.min(i0 + 3, App.semanas.length - 1)], 6)); }
      else ir(sumar(hoy(), -(+b.dataset.r) + 1), hoy());
    }; });
    raiz.querySelector('#aPl').onclick = () => editarPlantilla('analisis', 'Plantilla: análisis de resultados');
    raiz.querySelector('#aCopiar').onclick = () => {
      const datos = { periodo: F.rd + ' a ' + F.rh, totales: k, por_red: D.porRed,
        publicaciones: D.filas.map(({ p, m }) => ({ id: p.id, fecha: p.fecha, red: p.canal, formato: p.formato, etapa: p.etapa, gancho: ganchoDe(p), estado: p.estado, alcance: m ? num(m['Alcance']) : null, impresiones: m ? num(m['Impresiones']) : null, interacciones: m ? interacciones(m) : null, clics: m ? num(m['Clics']) : null, reproducciones: m ? num(m['Reproducciones']) : null })),
        leads: D.leads.map((x) => ({ fecha: X.serialAIso(x['Fecha']), publicacion: x['Publicación'], red: x['Red'], calificado: x['Calificado'], reunion: X.serialAIso(x['Reunión']), estado: x['Estado'], necesidad: x['Necesidad'] })),
        pauta: D.pauta.map((x) => ({ fecha: X.serialAIso(x['Fecha']), gancho: x['Gancho'], inversion: num(x['Inversión']), impresiones: num(x['Impresiones']), clics: num(x['Clics']), leads: num(x['Leads']) })) };
      copiar((App.plant.analisis || PR.analisis).trim() + '\n\nDATOS (JSON):\n```json\n' + JSON.stringify(datos, null, 1) + '\n```', 'Prompt copiado: péguelo en Claude');
    };
    raiz.querySelector('#aWord').onclick = (e) => U.conCarga(e.currentTarget, async () => {
      const t = raiz.querySelector('#aResp').value.trim(); if (t.length < 40) { U.aviso('Pegue primero la respuesta de Claude', 'warn'); return; }
      try {
        const blob = await GPA_DOC.informe({ logo: await logoDoc(), titulo: 'Informe de resultados', periodo: 'Del ' + fLarga(F.rd) + ' al ' + fLarga(F.rh), texto: t,
          kpis: [['Publicadas / planeadas', k.pub + ' / ' + k.plan], ['Alcance', fmtN(k.alcance)], ['Interacciones', fmtN(k.int)], ['Clics', fmtN(k.clics)], ['Leads / calificados / reuniones', k.leads + ' / ' + k.calif + ' / ' + k.reun], ['Inversión pauta', U.fmt.cop(k.inv)]] });
        const nombre = 'Informe_GPA_' + F.rd + '_a_' + F.rh + '.docx';
        await G.subirArchivo(CFG.carpeta + '/Informes/' + nombre, blob);
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
        U.aviso('Informe guardado en SharePoint (Informes) y descargado', 'ok', 6000); listaInformes();
      } catch (er) { U.aviso(errorArchivo(er), 'err', 9000); }
    });
    const listaInformes = async () => { const hs = (await hijos(CFG.carpeta + '/Informes')).filter((h) => h.file).sort((a, b) => String(b.lastModifiedDateTime).localeCompare(String(a.lastModifiedDateTime))); const el = raiz.querySelector('#aLista'); if (el && hs.length) el.innerHTML = '<b>Informes guardados:</b> ' + hs.slice(0, 8).map((h) => '<a href="' + esc(h.webUrl) + '" target="_blank" rel="noopener">' + esc(h.name) + '</a>').join(' · '); };
    listaInformes().catch(() => {});
  }

  // =====================================================================
  // VISTA: PLAN (referencia del Excel)
  // =====================================================================
  function vistaPlan(raiz) {
    const t = (cab, filas) => '<div class="ic-tabla-caja"><table class="ic-tabla"><thead><tr>' + cab.map((c) => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' + filas.map((f) => '<tr>' + f.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
    const link = (u) => u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(u.replace(/^https?:\/\//, '').slice(0, 50)) + '</a>' : '';
    raiz.innerHTML = '<h1 class="ic-titulo">Plan GPA · 6 ciclos</h1><p class="ic-subtitulo">Tomado del Excel (hojas del plan). Para cambiarlo, edite el Excel en SharePoint.</p>' +
      '<section class="ic-bloque"><div class="cab"><h2>Ciclos</h2></div><div class="cuerpo">' + t(['Ciclo', 'Periodo', 'Tema central', 'Objetivo', 'Oferta', 'Audiencia'], App.planMes.map((c) => [esc(c.ciclo), esc(c.periodo), esc(c.tema), esc(c.objetivo), esc(c.oferta), esc(c.audiencia)])) + '</div></section>' +
      '<section class="ic-bloque" style="margin-top:14px"><div class="cab"><h2>Estrategia semanal</h2></div><div class="cuerpo">' + t(['Semana', 'Ciclo', 'Tema', 'Objetivo', 'CTA', ''], App.semanas.map((l) => { const e = App.estrategia[l] || {}; return [esc(rangoSem(l)), esc((e.ciclo || '') + ' · ' + (e.semana || '')), '<b>' + esc(e.tema || '') + '</b>', esc(e.objetivo || ''), esc(e.cta || ''), '<a href="#mejorar/' + l + '">Mejorar</a>']; })) + '</div></section>' +
      '<section class="ic-bloque" style="margin-top:14px"><div class="cab"><h2>Recursos y enlaces</h2></div><div class="cuerpo">' + t(['Recurso', 'Uso', 'Enlace', 'Cuándo', 'Precaución'], App.recursos.map((r) => [esc(r.recurso), esc(r.tipo), link(r.enlace), esc(r.cuando), esc(r.precaucion)])) + '</div></section>' +
      (App.lineas.length ? '<section class="ic-bloque" style="margin-top:14px"><div class="cab"><h2>Mapa de líneas GPA</h2></div><div class="cuerpo">' + t(Object.keys(App.lineas[0]).filter((x) => x !== '_fila'), App.lineas.map((x) => Object.keys(x).filter((y) => y !== '_fila').map((y) => /^https?:/.test(String(x[y])) ? link(String(x[y])) : esc(x[y])))) + '</div></section>' : '');
  }

  // =====================================================================
  // VISTA: ARCHIVOS
  // =====================================================================
  function vistaArchivos(raiz, sinExcel) {
    raiz.innerHTML = '<h1 class="ic-titulo">Archivos</h1><p class="ic-subtitulo">Todo vive en SharePoint › IC Apps › Documentos › <b>' + esc(CFG.carpeta) + '</b>. Solo usted tiene acceso si dejó la carpeta con permisos exclusivos.</p>' +
      (sinExcel ? '<div class="g-nota warn">No encontré el Excel del plan. Súbalo aquí (queda como ' + esc(CFG.excel.split('/').pop()) + ').</div>' : '') +
      '<section class="ic-bloque"><div class="cab"><h2>Excel del plan (base de datos)</h2></div><div class="cuerpo"><p id="aX" class="sec">Buscando…</p>' +
        '<label class="ic-btn sec chico">' + (sinExcel ? 'Subir el Excel' : 'Reemplazar el Excel') + '<input type="file" id="aSubir" accept=".xlsx" hidden></label>' +
        '<p class="sec">La app agrega al final de «' + esc(CFG.hojas.calendario) + '» las columnas ID, Estado, Copy final, Diseño (JSON), Link publicado y Notas, y crea las hojas «Métricas», «Leads» y «Pauta» cuando se usan. Cierre el Excel en el navegador antes de guardar desde la app.</p></div></section>' +
      '<section class="ic-bloque" style="margin-top:14px"><div class="cab"><h2>Carpetas</h2></div><div class="cuerpo" id="aC"><p class="sec">Piezas (una carpeta por publicación), Semanas (Word y respaldos de Claude) e Informes.</p></div></section>' +
      '<section class="ic-bloque" style="margin-top:14px"><div class="cab"><h2>Plantillas de los prompts</h2></div><div class="cuerpo"><div class="g-btns"><button class="ic-btn sec" data-pl="imagen">Imágenes</button><button class="ic-btn sec" data-pl="mejorar">Mejorar la semana</button><button class="ic-btn sec" data-pl="analisis">Análisis de resultados</button></div></div></section>';
    G.llamar('GET', itemDe(CFG.excel)).then((m) => { raiz.querySelector('#aX').innerHTML = '<a href="' + esc(m.webUrl) + '" target="_blank" rel="noopener">' + esc(m.name) + ' ↗</a> · modificado ' + esc(U.fmt.fechaHora(m.lastModifiedDateTime)); }).catch(() => { raiz.querySelector('#aX').textContent = 'No está todavía en SharePoint.'; });
    Promise.all(['Piezas', 'Semanas', 'Informes'].map((c) => G.llamar('GET', itemDe(CFG.carpeta + '/' + c)).then((m) => '<a href="' + esc(m.webUrl) + '" target="_blank" rel="noopener">' + c + ' ↗</a>').catch(() => c + ' (aún vacía)')))
      .then((x) => { raiz.querySelector('#aC').insertAdjacentHTML('beforeend', '<p>' + x.join(' · ') + '</p>'); });
    raiz.querySelectorAll('[data-pl]').forEach((b) => { b.onclick = () => editarPlantilla(b.dataset.pl, 'Plantilla: ' + b.textContent); });
    raiz.querySelector('#aSubir').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (!sinExcel && !(await U.confirmar('Reemplazar el Excel', 'Se reemplaza ' + CFG.excel.split('/').pop() + ' en SharePoint (la versión anterior queda en el historial de versiones). ¿Continuar?', 'Reemplazar'))) return;
      try { await G.subirArchivo(CFG.excel, f); U.aviso('Excel guardado. Cargando…', 'ok'); setTimeout(() => location.reload(), 800); } catch (er) { U.aviso(errorArchivo(er), 'err', 9000); }
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
      if (!cuenta) { U.pantalla(raiz, { logo: CFG.logo, titulo: CFG.app.nombre, texto: 'Ingrese con su cuenta de Microsoft.', boton: 'Iniciar sesión', alClic: () => IC.auth.entrar() }); return; }
      try { sessionStorage.removeItem('ic_volver_url'); } catch (e) { /* sin almacenamiento */ }
      const email = String(cuenta.username || '').toLowerCase();
      if (CFG.usuarios.indexOf(email) < 0) { U.pantalla(raiz, { logo: CFG.logo, titulo: 'Sin acceso', texto: 'Esta es una app personal.', boton: 'Volver al portal', alClic: () => IC.portal.volver() }); return; }
      App.usuario = { nombre: cuenta.name || email, email, iniciales: U.fmt.iniciales(cuenta.name || email) };
      pintarEncabezado();
      U.pantalla(raiz, { logo: CFG.logo, cargando: true, titulo: 'Abriendo el plan…', texto: 'Leyendo el Excel en SharePoint' });
      let sinExcel = false;
      try { await X.cargar(); } catch (e) { console.error(e); if (e.status === 404 || /No encontré/.test(e.message || '')) sinExcel = true; else throw e; }
      leerPlantillas().catch(() => { /* originales */ });
      if (sinExcel) { await G.sitio(CFG.sitio.host, CFG.sitio.ruta); marcarNav('archivos'); vistaArchivos(raiz, true); return; }
      U.enrutar({ '': () => vistaSemana(raiz), lista: () => vistaLista(raiz), pub: () => vistaPub(raiz), mejorar: () => vistaMejorar(raiz), metricas: () => vistaMetricas(raiz), leads: () => vistaLeads(raiz),
        pauta: () => vistaPauta(raiz), resumen: () => vistaResumen(raiz), plan: () => vistaPlan(raiz), archivos: () => vistaArchivos(raiz) }, marcarNav);
    } catch (e) {
      console.error(e);
      U.pantalla(raiz, { logo: CFG.logo, titulo: 'No se pudo cargar la app', texto: errorArchivo(e), boton: 'Reintentar', alClic: () => location.reload() });
    }
  }
  window.addEventListener('DOMContentLoaded', arrancar);
  window.GPA = { copyPublicar, promptImagen, partes, utm, promptMejorar, medidas };   // para pruebas
})();
