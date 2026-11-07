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
    if (c.indexOf('tiktok') >= 0) return MD.TikTok;
    if (c.indexOf('youtube') >= 0) return MD.YouTube;
    if (c.indexOf('instagram') >= 0 && c.indexOf('facebook') < 0) return MD.Instagram;
    return MD.Facebook;
  }
  const esVideo = (p) => /reel|video/i.test(p.formato || '') || /tiktok|youtube/i.test(p.canal || '');
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

  // ---------- el prompt de una publicación ----------
  function prompt(p, base) {
    const t = M().temaDe(p.tema_id) || {}, d = diseno(p), md = medidas(p);
    const L = ['', '═══════════════════════════════', 'INFORMACIÓN DE ESTA PIEZA',
      'Red: ' + (p.canal || ''),
      'Medidas: ' + md,
      'Formato: ' + (p.formato || 'Imagen') + (esVideo(p) ? ' → genera la PORTADA / MINIATURA del video' : esCarrusel(p) ? ' → genera UNA IMAGEN POR LÁMINA, todas con la misma línea visual' : ''),
      'Fecha de publicación: ' + M().fLarga(p.fecha),
      'Tema: ' + limpio(p.titulo || t.tema || '')];
    L.push('Qué se ve: ' + (d.descripcion || 'propón una escena que represente el tema con personas reales en un contexto laboral colombiano'));
    L.push('Texto en la imagen (exacto): ' + (d.texto || limpio(t.hook) || 'propón un titular corto (máximo 8 palabras) a partir del tema'));
    if (d.laminas.length) { L.push('Láminas:'); d.laminas.forEach((x) => L.push('• ' + x)); }
    const i = idea(p); if (i) L.push('Contexto del post (NO lo copies en la imagen): ' + i);
    return (base || PR.imagen).trim() + '\n' + L.join('\n');
  }
  async function promptDe(p) { return prompt(p, (await plantilla()).texto); }

  // ---------- sección en la ficha de la publicación ----------
  function seccion(p) {
    return '<section class="ic-bloque"><div class="cab"><h2>🖼️ Prompt para la imagen</h2><span class="sec">' + esc(medidas(p)) + '</span></div><div class="cuerpo">' +
      '<p class="sec" style="margin:0 0 8px">Cópielo y péguelo en la IA de imágenes (ChatGPT, Gemini, Canva…). Toma el diseño que propuso Claude para esta pieza' + (diseno(p).descripcion ? '' : ' (esta no lo tiene: la IA propondrá la escena)') + '.</p>' +
      '<div class="gen-acc"><button class="ic-btn" type="button" data-img-copiar>Copiar prompt</button><button class="ic-btn sec" type="button" data-img-ver>Ver</button><button class="ic-btn sec" type="button" data-img-editar>Editar plantilla</button></div>' +
      '<p class="sec" style="margin:12px 0 6px">La IA deja libre la esquina para el logo. Cuando tenga la imagen, póngale el logo aquí:</p>' +
      '<button class="ic-btn sec" type="button" data-img-logo>🏷️ Poner el logo</button></div></section>';
  }
  function enlazar(raiz, p) {
    const c = raiz.querySelector('[data-img-copiar]'); if (!c) return;
    c.onclick = async () => M().copiar(await promptDe(p), 'Prompt de la imagen copiado');
    raiz.querySelector('[data-img-ver]').onclick = async () => verUno(p);
    raiz.querySelector('[data-img-editar]').onclick = async () => { await plantilla(); editar(); };
    raiz.querySelector('[data-img-logo]').onclick = () => logo({ p, raiz });
  }
  async function verUno(p) {
    const txt = await promptDe(p);
    U.modal('Prompt de la imagen · ' + p.Title, '<div class="ic-form"><p class="sec" style="margin-top:0">' + esc(p.canal) + ' · ' + esc(medidas(p)) + '</p><pre class="mkt-pre">' + esc(txt) + '</pre>' +
      '<div class="ic-acciones"><span class="espacio"></span><button class="ic-btn" id="imC">Copiar</button></div></div>', (c) => { c.querySelector('#imC').onclick = () => M().copiar(txt, 'Prompt de la imagen copiado'); });
  }

  // ---------- todos los de una semana, por día y red ----------
  const ORDEN = ['facebook / instagram', 'facebook', 'instagram', 'linkedin', 'linkedin newsletter', 'tiktok / youtube', 'tiktok', 'youtube'];
  async function semana(lunes) {
    const base = (await plantilla()).texto, fin = M().sumarDias(lunes, 6);
    const pubs = App.pubs.filter((p) => M().dia(p.fecha) >= lunes && M().dia(p.fecha) <= fin && p.estado !== 'Cancelada' && !/^texto$/i.test(p.formato || ''))
      .sort((a, b) => M().dia(a.fecha).localeCompare(M().dia(b.fecha)) || ORDEN.indexOf(U.norm(a.canal || '')) - ORDEN.indexOf(U.norm(b.canal || '')));
    const dias = Array.from(new Set(pubs.map((p) => M().dia(p.fecha))));
    U.modal('🖼️ Prompts de imágenes · semana del ' + M().fLarga(lunes), '<div class="ic-form">' +
      (pubs.length ? '<p class="sec" style="margin-top:0">Uno por publicación. Copie el de cada pieza y péguelo en la IA de imágenes. Medidas: Facebook e Instagram ' + esc(CFG.medidasImagen.Facebook) + ' · LinkedIn ' + esc(CFG.medidasImagen.LinkedIn) + '.</p>' +
        dias.map((f) => '<h3 class="img-dia">' + esc(M().fLarga(f)) + '</h3>' + pubs.filter((p) => M().dia(p.fecha) === f).map((p) =>
          '<div class="img-fila">' + M().chipCanal(p.canal) + '<div class="img-txt"><b>' + esc(limpio(p.titulo) || p.Title) + '</b><span class="sec">' + esc((p.formato || 'Imagen') + ' · ' + medidas(p)) + (diseno(p).descripcion ? '' : ' · sin diseño de Claude') + '</span></div>' +
          '<button class="ic-btn sec chico" data-ver="' + esc(p.Title) + '">Ver</button><button class="ic-btn chico" data-cop="' + esc(p.Title) + '">Copiar</button></div>').join('')).join('')
        : '<p class="ic-vacio">No hay publicaciones con imagen esta semana. Genere primero el contenido de la semana.</p>') +
      '<div class="ic-acciones"><button class="ic-btn sec" id="imEd">Editar plantilla</button><button class="ic-btn sec" id="imLogo">🏷️ Poner el logo a imágenes</button><span class="espacio"></span><button class="ic-btn sec" id="imCerrar">Cerrar</button></div></div>', (c) => {
      const pub = (id) => pubs.find((x) => x.Title === id);
      c.querySelectorAll('[data-cop]').forEach((b) => { b.onclick = () => { M().copiar(prompt(pub(b.dataset.cop), base), 'Copiado: ' + b.dataset.cop); b.textContent = 'Copiado ✔'; }; });
      c.querySelectorAll('[data-ver]').forEach((b) => { b.onclick = () => verUno(pub(b.dataset.ver)); });
      c.querySelector('#imEd').onclick = () => editar(() => semana(lunes));
      c.querySelector('#imCerrar').onclick = U.cerrarModal;
      c.querySelector('#imLogo').onclick = () => logo();
    });
  }

  // =====================================================================
  // PONER EL LOGO: la IA no reproduce bien el logo, así que se pone aquí sobre la imagen generada
  // =====================================================================
  let logoImg = null;
  function cargarLogo() {
    if (logoImg) return Promise.resolve(logoImg);
    return new Promise((ok, mal) => { const i = new Image(); i.onload = () => { logoImg = i; ok(i); }; i.onerror = () => mal(new Error('No se pudo cargar el logo.')); i.src = CFG.logo; });
  }
  const leerImagen = (file) => new Promise((ok, mal) => { const u = URL.createObjectURL(file), i = new Image(); i.onload = () => ok(i); i.onerror = () => mal(new Error('No se pudo abrir ' + file.name)); i.src = u; });
  // Brillo promedio de la zona donde va el logo (0 oscuro … 1 claro)
  function brillo(img, x, y, w, h) {
    const c = document.createElement('canvas'); c.width = 40; c.height = 20; const g = c.getContext('2d');
    g.drawImage(img, x, y, w, h, 0, 0, 40, 20); const d = g.getImageData(0, 0, 40, 20).data; let s = 0;
    for (let k = 0; k < d.length; k += 4) s += (0.299 * d[k] + 0.587 * d[k + 1] + 0.114 * d[k + 2]) / 255;
    return s / (d.length / 4);
  }
  function componer(img, o) {
    const W = img.naturalWidth, H = img.naturalHeight, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const lw = Math.round(W * o.tam / 100), lh = Math.round(lw * logoImg.naturalHeight / logoImg.naturalWidth), m = Math.round(Math.min(W, H) * 0.045);
    const x = /der/.test(o.pos) ? W - m - lw : /centro/.test(o.pos) ? Math.round((W - lw) / 2) : m;
    const y = /inf/.test(o.pos) ? H - m - lh : m;
    let estilo = o.estilo;
    if (estilo === 'auto') estilo = brillo(img, x, y, lw, lh) < 0.45 ? 'placa' : 'color';
    if (estilo === 'placa') {   // placa blanca redondeada detrás del logo
      const pd = Math.round(lh * 0.22), r = Math.round(lh * 0.25);
      g.fillStyle = 'rgba(255,255,255,0.94)'; g.beginPath();
      if (g.roundRect) g.roundRect(x - pd, y - pd, lw + 2 * pd, lh + 2 * pd, r); else g.rect(x - pd, y - pd, lw + 2 * pd, lh + 2 * pd);
      g.fill();
    }
    if (estilo === 'blanco') {  // logo todo en blanco (para fondos oscuros)
      const t = document.createElement('canvas'); t.width = lw; t.height = lh; const tg = t.getContext('2d');
      tg.drawImage(logoImg, 0, 0, lw, lh); tg.globalCompositeOperation = 'source-in'; tg.fillStyle = '#fff'; tg.fillRect(0, 0, lw, lh);
      g.drawImage(t, x, y);
    } else g.drawImage(logoImg, x, y, lw, lh);
    return c;
  }
  const aBlob = (c) => new Promise((ok) => c.toBlob(ok, 'image/png'));
  const nombreConLogo = (n) => n.replace(/\.[^.]+$/, '') + '_logo.png';
  async function logo(opc) {
    opc = opc || {};
    try { await cargarLogo(); } catch (e) { U.aviso(e.message, 'err'); return; }
    const o = { pos: 'sup-izq', tam: 24, estilo: 'auto' }; let fotos = [];
    U.modal('Poner el logo de Ideas Control', '<div class="ic-form">' +
      '<p class="sec" style="margin-top:0">Suba la(s) imagen(es) que generó la IA. El logo se pone aquí, nítido y sin deformar' + (opc.p ? ', y se guarda en la pieza de ' + esc(opc.p.Title) : '') + '.</p>' +
      '<label class="ic-btn sec mkt-subir">Elegir imagen(es)<input type="file" id="lgF" accept="image/png,image/jpeg,image/webp" multiple hidden></label>' +
      '<div class="ic-campos" style="margin-top:10px"><div class="ic-campo c4"><label for="lgP">Posición</label><select id="lgP"><option value="sup-izq">Arriba a la izquierda</option><option value="sup-der">Arriba a la derecha</option><option value="inf-izq">Abajo a la izquierda</option><option value="inf-der">Abajo a la derecha</option><option value="inf-centro">Abajo al centro</option></select></div>' +
      '<div class="ic-campo c4"><label for="lgE">Estilo</label><select id="lgE"><option value="auto">Automático según el fondo</option><option value="color">A color</option><option value="placa">A color sobre placa blanca</option><option value="blanco">Todo blanco (fondos oscuros)</option></select></div>' +
      '<div class="ic-campo c4"><label for="lgT">Tamaño: <b id="lgTv">24</b>% del ancho</label><input type="range" id="lgT" min="12" max="45" value="24"></div></div>' +
      '<div id="lgPrev" class="img-prev"><p class="sec">La vista previa aparece aquí.</p></div>' +
      '<div class="ic-acciones"><span class="espacio"></span><button class="ic-btn sec" id="lgDesc" disabled>Descargar</button>' + (opc.p ? '<button class="ic-btn" id="lgGuardar" disabled>Guardar en la publicación</button>' : '') + '</div></div>', (m) => {
      const prev = m.querySelector('#lgPrev');
      const pintar = () => {
        if (!fotos.length) return;
        prev.innerHTML = ''; fotos.forEach((f) => { const c = componer(f.img, o); c.className = 'img-lienzo'; c.title = f.file.name; f.canvas = c; prev.appendChild(c); });
        m.querySelector('#lgDesc').disabled = false; const bg = m.querySelector('#lgGuardar'); if (bg) bg.disabled = false;
      };
      m.querySelector('#lgF').onchange = async (e) => {
        try { fotos = await Promise.all(Array.from(e.target.files || []).map(async (file) => ({ file, img: await leerImagen(file) }))); pintar(); }
        catch (er) { U.aviso(er.message, 'err'); }
      };
      m.querySelector('#lgP').onchange = (e) => { o.pos = e.target.value; pintar(); };
      m.querySelector('#lgE').onchange = (e) => { o.estilo = e.target.value; pintar(); };
      m.querySelector('#lgT').oninput = (e) => { o.tam = +e.target.value; m.querySelector('#lgTv').textContent = o.tam; pintar(); };
      m.querySelector('#lgDesc').onclick = async () => {
        for (const f of fotos) { const a = document.createElement('a'); a.href = URL.createObjectURL(await aBlob(f.canvas)); a.download = nombreConLogo(f.file.name); document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
      };
      const bg = m.querySelector('#lgGuardar');
      if (bg) bg.onclick = () => U.conCarga(bg, async () => {
        const archivos = []; for (const f of fotos) archivos.push(new File([await aBlob(f.canvas)], nombreConLogo(f.file.name), { type: 'image/png' }));
        U.cerrarModal(); await M().subirPiezas(opc.raiz, opc.p, archivos);
      });
    });
  }

  return { logo, medidas, diseno, prompt, promptDe, seccion, enlazar, semana, plantilla, editar };
})();
