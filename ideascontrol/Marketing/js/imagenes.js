/* =====================================================================
   APP-112 · Marketing — prompt para generar la imagen de cada publicación (en otra IA)
   Prompt = plantilla (editable, en SharePoint) + datos de la pieza: red, medidas, formato,
   qué se ve, texto en la imagen y láminas (del diseño que entregó Claude al generar la semana).
   ===================================================================== */
window.MKT_IMG = (function () {
  const U = IC.ui, esc = U.esc, G = IC.graph, PR = window.MKT_PROMPTS;
  const M = () => window.MKT;
  const ST = { plantilla: null };

  // ---------- medidas por red y formato ----------
  function medidas(p) {
    const c = U.norm(p.canal || ''), f = U.norm(p.formato || ''), MD = CFG.medidasImagen;
    if (/historia/.test(f)) return MD.historia;
    if (c.indexOf('linkedin') >= 0) return MD.LinkedIn;
    if (c.indexOf('tiktok') >= 0) return MD.TikTok + (esVideo(p) ? ' — portada del video' : '');
    if (c.indexOf('youtube') >= 0) return esVideo(p) ? MD.YouTube : MD.TikTok;
    if (c.indexOf('instagram') >= 0 && c.indexOf('facebook') < 0) return MD.Instagram;
    return MD.Facebook;
  }
  const esVideo = (p) => /reel|video/i.test(p.formato || '');   // TikTok también puede ser imagen o carrusel
  const esCarrusel = (p) => /carrusel/i.test(p.formato || '');

  // ---------- diseño guardado en las notas al generar la semana ----------
  function diseno(p) {
    const L = String(p.notas || '').split(/\r?\n/), d = { descripcion: '', texto: '', laminas: [] };
    const i = L.findIndex((x) => /^DISEÑO\b/.test(x));
    if (i < 0) return d;
    d.descripcion = L[i].replace(/^DISEÑO\s*(\([^)]*\))?\s*:\s*/, '').trim();
    for (let k = i + 1; k < L.length && L[k].trim(); k++) {
      const x = L[k].trim();
      if (/^Texto en la imagen:/i.test(x)) d.texto = x.replace(/^Texto en la imagen:\s*/i, '');
      else if (/^•/.test(x)) d.laminas.push(x.replace(/^•\s*/, ''));
    }
    return d;
  }
  const limpio = (s) => String(s || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  function idea(p) {   // contexto del post: gancho y primeras ideas (no va en la imagen)
    const c = limpio(p.copy); return c.length > 420 ? c.slice(0, 420).replace(/\s\S*$/, '') + '…' : c;
  }

  // ---------- plantilla (SharePoint, editable) ----------
  async function plantilla() {
    if (ST.plantilla) return ST.plantilla;
    try {
      const sid = await G.sitio(CFG.sitio.host, CFG.sitio.ruta);
      const meta = await G.llamar('GET', '/sites/' + sid + '/drive/root:/' + M().rutaUrl(PR.archivos.imagen));
      const r = await fetch(meta['@microsoft.graph.downloadUrl']); if (!r.ok) throw new Error('descarga');
      ST.plantilla = { texto: await r.text(), origen: 'sharepoint' };
    } catch (e) { ST.plantilla = { texto: PR.imagen, origen: 'original' }; }
    return ST.plantilla;
  }
  function editar(alGuardar) {
    const p = ST.plantilla || { texto: PR.imagen };
    U.modal('Plantilla del prompt de imágenes', '<div class="ic-form"><p class="sec" style="margin-top:0">Se guarda en SharePoint (Documentos/' + esc(PR.archivos.imagen) + ') y la usan las tres personas de la app. ' +
      'La app agrega siempre al final los datos de cada pieza: red, medidas, formato, qué se ve, texto en la imagen y láminas.</p>' +
      '<textarea id="imTexto" rows="20" style="width:100%;font-family:ui-monospace,Consolas,monospace;font-size:12.5px">' + esc(p.texto) + '</textarea>' +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="imOrig">Restaurar el original</button><span class="espacio"></span><button type="button" class="ic-btn" id="imOk">Guardar en SharePoint</button></div></div>', (c) => {
      c.querySelector('#imOrig').onclick = () => { c.querySelector('#imTexto').value = PR.imagen; };
      c.querySelector('#imOk').onclick = () => U.conCarga(c.querySelector('#imOk'), async () => {
        const texto = c.querySelector('#imTexto').value.trim();
        if (texto.length < 40) { U.aviso('La plantilla está casi vacía.', 'warn'); return; }
        try {
          await G.subirArchivo(PR.archivos.imagen, new Blob([texto], { type: 'text/plain;charset=utf-8' }));
          ST.plantilla = { texto, origen: 'sharepoint' }; U.cerrarModal(); U.aviso('Plantilla guardada en SharePoint', 'ok'); if (alGuardar) alGuardar();
        } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); }
      });
    });
  }

  // ---------- el prompt de una publicación (o de una lámina del carrusel: k = 1…N) ----------
  const laminasDe = (p) => esCarrusel(p) ? diseno(p).laminas : [];
  function prompt(p, base, k) {
    const t = M().temaDe(p.tema_id) || {}, d = diseno(p), md = medidas(p), N = d.laminas.length;
    const lam = esCarrusel(p) && k && N;
    const L = ['', '═══════════════════════════════', 'INFORMACIÓN DE ESTA PIEZA',
      'Red: ' + (p.canal || ''),
      'Medidas: ' + md,
      'Formato: ' + (p.formato || 'Imagen') + (esVideo(p) ? ' → genera la PORTADA del video' : lam ? ' → lámina ' + k + ' de ' + N : esCarrusel(p) ? ' → genera UNA IMAGEN POR LÁMINA, todas con la misma línea visual' : ''),
      'Fecha de publicación: ' + M().fLarga(p.fecha),
      'Tema: ' + limpio(p.titulo || t.tema || '')];
    L.push('Qué se ve' + (lam ? ' (línea visual de todo el carrusel)' : '') + ': ' + (d.descripcion || 'propón una escena que represente el tema con personas reales en un contexto laboral colombiano'));
    if (lam) {
      if (d.texto) L.push('Textos generales del carrusel: ' + d.texto);
      L.push('Láminas del carrusel:'); d.laminas.forEach((x, n) => L.push((n + 1 === k ? '→ ' : '• ') + x));
      L.push('', 'ESTA IMAGEN: LÁMINA ' + k + ' DE ' + N + ' → ' + d.laminas[k - 1],
        k === 1 ? 'Es la primera lámina (portada del carrusel): usa el logo adjunto y define la línea visual que seguirán las demás.'
          : 'Mantén exactamente la misma línea visual de las láminas anteriores de esta conversación: colores, tipografía, estilo de fotografía, ubicación del logo y número de lámina.');
    } else {
      L.push('Texto en la imagen (exacto): ' + (d.texto || limpio(t.hook) || 'propón un titular corto (máximo 8 palabras) a partir del tema'));
      if (N) { L.push('Láminas:'); d.laminas.forEach((x) => L.push('• ' + x)); }
    }
    const i = idea(p); if (i) L.push('Contexto del post (NO lo copies en la imagen): ' + i);
    return (base || PR.imagen).trim() + '\n' + L.join('\n');
  }
  async function promptDe(p, k) { return prompt(p, (await plantilla()).texto, k); }

  // ---------- sección en la ficha de la publicación ----------
  function seccion(p) {
    return '<section class="ic-bloque"><div class="cab"><h2>🖼️ Prompt para la imagen</h2><span class="sec">' + esc(medidas(p)) + '</span></div><div class="cuerpo">' +
      '<p class="sec" style="margin:0 0 8px">Cópielo y péguelo en la IA de imágenes (ChatGPT, Gemini, Canva…). Toma el diseño que propuso Claude para esta pieza' + (diseno(p).descripcion ? '' : ' (esta no lo tiene: la IA propondrá la escena)') + '.</p>' +
      (laminasDe(p).length ? '<p class="sec" style="margin:0 0 8px">Carrusel de ' + laminasDe(p).length + ' láminas: un prompt por lámina. Péguelos en orden en la misma conversación.</p><div class="gen-acc">' +
        laminasDe(p).map((x, n) => '<button class="ic-btn' + (n ? ' sec' : '') + ' chico" type="button" data-img-lam="' + (n + 1) + '" title="' + esc(x) + '">Lámina ' + (n + 1) + '</button>').join('') + '</div>' : '') +
      '<div class="gen-acc"' + (laminasDe(p).length ? ' style="margin-top:8px"' : '') + '>' + (laminasDe(p).length ? '' : '<button class="ic-btn" type="button" data-img-copiar>Copiar prompt</button>') +
        '<button class="ic-btn sec" type="button" data-img-ver>Ver</button><button class="ic-btn sec" type="button" data-img-editar>Editar plantilla</button></div></div></section>';
  }
  function enlazar(raiz, p) {
    if (!raiz.querySelector('[data-img-ver]')) return;
    const c = raiz.querySelector('[data-img-copiar]'); if (c) c.onclick = async () => M().copiar(await promptDe(p), 'Prompt de la imagen copiado');
    raiz.querySelectorAll('[data-img-lam]').forEach((b) => { b.onclick = async () => { M().copiar(await promptDe(p, +b.dataset.imgLam), 'Prompt de la lámina ' + b.dataset.imgLam + ' copiado'); b.textContent = 'Lámina ' + b.dataset.imgLam + ' ✔'; }; });
    raiz.querySelector('[data-img-ver]').onclick = async () => verUno(p);
    raiz.querySelector('[data-img-editar]').onclick = async () => { await plantilla(); editar(); };
  }
  async function verUno(p, k) {
    if (!k && laminasDe(p).length) k = 1;
    const txt = await promptDe(p, k);
    U.modal('Prompt de la imagen · ' + p.Title + (k ? ' · lámina ' + k + ' de ' + laminasDe(p).length : ''), '<div class="ic-form"><p class="sec" style="margin-top:0">' + esc(p.canal) + ' · ' + esc(medidas(p)) + '</p><pre class="mkt-pre">' + esc(txt) + '</pre>' +
      '<div class="ic-acciones"><span class="espacio"></span><button class="ic-btn" id="imC">Copiar</button></div></div>', (c) => { c.querySelector('#imC').onclick = () => M().copiar(txt, 'Prompt de la imagen copiado'); });
  }

  // ---------- la semana, día por día: copy y prompt(s) de imagen de cada publicación ----------
  const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  async function semana(lunes) {
    const base = (await plantilla()).texto, fin = M().sumarDias(lunes, 6);
    const pubs = App.pubs.filter((p) => M().dia(p.fecha) >= lunes && M().dia(p.fecha) <= fin && p.estado !== 'Cancelada')
      .sort((a, b) => M().dia(a.fecha).localeCompare(M().dia(b.fecha)) || M().ordenRed(a.canal) - M().ordenRed(b.canal));
    const conImagen = (p) => !/^texto$|newsletter/i.test(p.formato || '') && !/newsletter/i.test(p.canal || '');
    const fila = (p) => {
      const L = laminasDe(p), img = conImagen(p);
      return '<div class="img-fila">' + M().chipCanal(p.canal) + '<div class="img-txt"><a href="#pub/' + esc(p.Title) + '"><b>' + esc(limpio(p.titulo) || p.Title) + '</b></a><span class="sec">' +
          esc((p.formato || 'Imagen') + (img ? ' · ' + medidas(p) : '')) + (img && !diseno(p).descripcion ? ' · sin diseño de Claude' : '') + (p.copy ? '' : ' · sin copy') + '</span></div>' +
        '<div class="img-btns">' + (p.copy ? '<button class="ic-btn sec chico" data-copy="' + esc(p.Title) + '">Copy</button>' : '') + '<button class="ic-btn sec chico" data-bajar="' + esc(p.Title) + '" title="Descargar la pieza subida (imagen o video) para publicarla">⬇ Pieza</button>' +
          (!img ? '' : L.length ? L.map((x, n) => '<button class="ic-btn chico" data-cop="' + esc(p.Title) + '" data-k="' + (n + 1) + '" title="' + esc(x) + '">Lám. ' + (n + 1) + '</button>').join('')
            : '<button class="ic-btn chico" data-cop="' + esc(p.Title) + '">Prompt imagen</button>') +
          (img ? '<button class="ic-btn sec chico" data-ver="' + esc(p.Title) + '" title="Ver el prompt">👁</button>' : '') + '</div></div>';
    };
    let html = '';
    for (let i = 0; i < 7; i++) {
      const f = M().sumarDias(lunes, i), del = pubs.filter((p) => M().dia(p.fecha) === f);
      if (!del.length && i > 4) continue;
      html += '<h3 class="img-dia">' + DIAS[i] + ' ' + esc(M().fCorta(f)) + '</h3>' + (del.map(fila).join('') || '<p class="sec" style="margin:0 0 6px">Sin publicaciones este día.</p>');
    }
    U.modal('📅 Copys y prompts de imágenes · semana del ' + M().fLarga(lunes), '<div class="ic-form">' +
      (pubs.length ? '<p class="sec" style="margin-top:0">Por cada publicación: <b>Copy</b> copia el texto para la red y <b>Prompt imagen</b> el prompt para la IA (en carruseles, uno por lámina: péguelos en orden en la misma conversación). ' +
          'Medidas: Facebook e Instagram ' + esc(CFG.medidasImagen.Facebook) + ' · LinkedIn ' + esc(CFG.medidasImagen.LinkedIn) + ' · TikTok ' + esc(CFG.medidasImagen.TikTok) + '.</p>' + html
        : '<p class="ic-vacio">No hay publicaciones esta semana. Genere primero el contenido de la semana en «Generar».</p>') +
      '<div class="ic-acciones"><button class="ic-btn sec" id="imEd">Editar plantilla de imágenes</button><a class="ic-btn sec" href="/ideascontrol/Imagenes/" target="_blank" rel="noopener">🗜️ Optimizar imágenes ↗</a><span class="espacio"></span><button class="ic-btn sec" id="imCerrar">Cerrar</button></div></div>', (c) => {
      const pub = (id) => pubs.find((x) => x.Title === id);
      c.querySelectorAll('[data-copy]').forEach((b) => { b.onclick = () => { M().copiar(pub(b.dataset.copy).copy, 'Copy copiado: ' + b.dataset.copy); b.textContent = 'Copy ✔'; }; });
      c.querySelectorAll('[data-cop]').forEach((b) => { b.onclick = () => { const k = +b.dataset.k || 0; M().copiar(prompt(pub(b.dataset.cop), base, k), 'Prompt copiado: ' + b.dataset.cop + (k ? ' · lámina ' + k : '')); b.textContent = (k ? 'Lám. ' + k : 'Prompt') + ' ✔'; }; });
      c.querySelectorAll('[data-ver]').forEach((b) => { b.onclick = () => verUno(pub(b.dataset.ver)); });
      c.querySelectorAll('[data-bajar]').forEach((b) => { b.onclick = () => U.conCarga(b, async () => {
        try { const hs = await M().archivosDe(pub(b.dataset.bajar)); if (!hs.length) { U.aviso('Todavía no hay pieza subida en ' + b.dataset.bajar + '. Súbala en su ficha.', 'warn', 6000); return; } M().bajarArchivos(hs); U.aviso('Descargando ' + hs.length + ' archivo(s)', 'ok'); }
        catch (e) { U.aviso(U.mensajeError(e), 'err'); }
      }); });
      c.querySelectorAll('.img-txt a').forEach((x) => { x.onclick = () => U.cerrarModal(); });
      c.querySelector('#imEd').onclick = () => editar(() => semana(lunes));
      c.querySelector('#imCerrar').onclick = U.cerrarModal;
    });
  }

  return { medidas, diseno, prompt, promptDe, seccion, enlazar, semana, plantilla, editar };
})();
