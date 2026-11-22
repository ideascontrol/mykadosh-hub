/* =====================================================================
   De Dios para el camino — PNG → WebP (conversión masiva en el navegador)
   Las imágenes no salen de su computador: se convierten aquí mismo.
   • Sin pérdida (por defecto): WebP lossless con el codificador oficial libwebp (WebAssembly, @jsquash/webp).
     Cada píxel queda igual al PNG; el archivo suele quedar entre 20 % y 40 % más liviano.
   • Alta calidad: WebP con pérdida mínima (calidad 92): visualmente igual y mucho más liviano.
   Resultado: guardar cada una o todas en la carpeta de su computador que usted elija (Chrome / Edge),
   descargarlas en un ZIP, o guardarlas en SharePoint (carpeta de la Lectura diaria).
   ===================================================================== */
window.LD_WEBP = (function () {
  const U = IC.ui, esc = U.esc;
  const COD = 'https://cdn.jsdelivr.net/npm/@jsquash/webp@1.4.0/codec/enc/webp_enc.js';
  const CARPETA = CFG.carpeta + '/Imagenes WebP';
  let modulo = null, lista = [], modo = 'sinperdida';

  // libwebp en WebAssembly (se carga una sola vez)
  function codificador() {
    if (!modulo) modulo = import(COD).then((m) => m.default({ noInitialRun: true })).catch((e) => { modulo = null; throw new Error('No se pudo cargar el convertidor WebP. Revise la conexión.'); });
    return modulo;
  }
  const OPC = {
    sinperdida: { quality: 75, target_size: 0, target_PSNR: 0, method: 4, sns_strength: 50, filter_strength: 60, filter_sharpness: 0, filter_type: 1, partitions: 0, segments: 4, pass: 1, show_compressed: 0, preprocessing: 0, autofilter: 0, partition_limit: 0, alpha_compression: 1, alpha_filtering: 1, alpha_quality: 100, lossless: 1, exact: 1, image_hint: 0, emulate_jpeg_size: 0, thread_level: 0, low_memory: 0, near_lossless: 100, use_delta_palette: 0, use_sharp_yuv: 0 },
    alta: { quality: 92, target_size: 0, target_PSNR: 0, method: 4, sns_strength: 50, filter_strength: 60, filter_sharpness: 0, filter_type: 1, partitions: 0, segments: 4, pass: 1, show_compressed: 0, preprocessing: 0, autofilter: 0, partition_limit: 0, alpha_compression: 1, alpha_filtering: 1, alpha_quality: 100, lossless: 0, exact: 0, image_hint: 0, emulate_jpeg_size: 0, thread_level: 0, low_memory: 0, near_lossless: 100, use_delta_palette: 0, use_sharp_yuv: 1 }
  };
  async function pixeles(file) {
    const bmp = await createImageBitmap(file, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
    const cv = document.createElement('canvas'); cv.width = bmp.width; cv.height = bmp.height;
    const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(bmp, 0, 0); bmp.close && bmp.close();
    return g.getImageData(0, 0, cv.width, cv.height);
  }
  async function convertir(x) {
    const m = await codificador(), img = await pixeles(x.file);
    const r = m.encode(img.data, img.width, img.height, OPC[modo]);
    if (!r) throw new Error('No se pudo convertir');
    x.webp = new Blob([r.buffer || r], { type: 'image/webp' }); x.ancho = img.width; x.alto = img.height;
  }
  const kb = (n) => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const nombreWebp = (n) => n.replace(/\.png$/i, '') + '.webp';
  function bajar(blob, nombre) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 3000); }
  // Elegir carpeta del computador (File System Access API: Chrome y Edge en computador). Sin ella: descarga normal.
  const puedeCarpeta = typeof window.showDirectoryPicker === 'function';
  const cancelado = (e) => e && e.name === 'AbortError';
  async function guardarUna(x) {
    const nombre = nombreWebp(x.file.name);
    if (typeof window.showSaveFilePicker !== 'function') return bajar(x.webp, nombre);
    try {
      const h = await window.showSaveFilePicker({ id: 'ld-webp', startIn: 'pictures', suggestedName: nombre, types: [{ description: 'Imagen WebP', accept: { 'image/webp': ['.webp'] } }] });
      const w = await h.createWritable(); await w.write(x.webp); await w.close();
      U.aviso('Guardada: ' + h.name, 'ok');
    } catch (e) { if (!cancelado(e)) U.aviso('No se pudo guardar: ' + e.message, 'err'); }
  }
  async function libre(dir, nombre) {   // no reemplaza: si ya existe, agrega (2), (3)…
    const base = nombre.replace(/\.webp$/i, '');
    for (let k = 1; ; k++) {
      const n = k === 1 ? nombre : base + ' (' + k + ').webp';
      try { await dir.getFileHandle(n); } catch (e) { if (e.name === 'NotFoundError') return n; throw e; }
    }
  }
  async function guardarEnCarpeta(L) {
    let dir;
    try { dir = await window.showDirectoryPicker({ id: 'ld-webp', mode: 'readwrite', startIn: 'pictures' }); }
    catch (e) { if (!cancelado(e)) U.aviso('No se pudo abrir la carpeta: ' + e.message, 'err'); return; }
    let n = 0, renombradas = 0;
    try {
      for (const x of L) {
        const nombre = await libre(dir, nombreWebp(x.file.name)); if (nombre !== nombreWebp(x.file.name)) renombradas++;
        const w = await (await dir.getFileHandle(nombre, { create: true })).createWritable(); await w.write(x.webp); await w.close(); n++;
      }
      U.aviso(n + ' imagen' + (n === 1 ? '' : 'es') + ' guardada' + (n === 1 ? '' : 's') + ' en la carpeta «' + dir.name + '»' + (renombradas ? ' (' + renombradas + ' ya existían: se guardaron con (2), (3)… sin reemplazar)' : ''), 'ok', 7000);
    } catch (e) { U.aviso('Se guardaron ' + n + ' de ' + L.length + '. ' + e.message, 'err', 9000); }
  }
  const cargarZip = () => window.JSZip ? Promise.resolve(window.JSZip) : new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; s.onload = () => ok(window.JSZip); s.onerror = () => mal(new Error('No se pudo cargar la librería ZIP.')); document.head.appendChild(s); });

  function vista(raiz) {
    raiz.innerHTML = '<div class="ic-barra"><div><h1 class="ic-titulo">PNG → WebP</h1><p class="ic-subtitulo" style="margin:0">Convierta muchas imágenes PNG a la vez. Se convierten aquí mismo; no se suben a ningún lado hasta que usted lo pida.</p></div></div>' +
      '<section class="ic-bloque"><div class="cuerpo">' +
      '<div class="ic-chips" id="wModo" style="margin-bottom:12px"><button data-m="sinperdida">Sin pérdida (idéntica al PNG)</button><button data-m="alta">Alta calidad (más liviana)</button></div>' +
      '<label class="wp-zona" id="wZona"><input type="file" id="wArch" accept="image/png" multiple hidden><b>Arrastre aquí sus PNG</b><span>o haga clic para elegirlos (puede seleccionar muchos a la vez)</span></label>' +
      '<div class="ic-acciones" id="wAcc" hidden style="margin-top:12px">' + (puedeCarpeta ? '<button class="ic-btn" id="wCarp">📁 Guardar todas en una carpeta…</button><button class="ic-btn sec" id="wZip">⬇ Todas en ZIP</button>' : '<button class="ic-btn" id="wZip">⬇ Descargar todas (ZIP)</button>') + '<button class="ic-btn sec" id="wSP">Guardar en SharePoint</button><span class="espacio"></span><button class="ic-btn sec" id="wLimpiar">Limpiar</button></div>' +
      '</div></section><div id="wLista"></div>';
    const zona = raiz.querySelector('#wZona'), inp = raiz.querySelector('#wArch');
    const pintarModo = () => raiz.querySelectorAll('#wModo button').forEach((b) => b.classList.toggle('activo', b.dataset.m === modo));
    raiz.querySelectorAll('#wModo button').forEach((b) => { b.onclick = () => { if (modo === b.dataset.m) return; modo = b.dataset.m; pintarModo(); lista.forEach((x) => { x.webp = null; x.estado = 'cola'; }); procesar(); }; });
    pintarModo();
    function pintar() {
      const hechas = lista.filter((x) => x.webp), tO = hechas.reduce((s, x) => s + x.file.size, 0), tW = hechas.reduce((s, x) => s + x.webp.size, 0);
      raiz.querySelector('#wAcc').hidden = !hechas.length;
      raiz.querySelector('#wLista').innerHTML = !lista.length ? '' : '<p class="ic-conteo">' + hechas.length + ' de ' + lista.length + ' convertidas' + (hechas.length ? ' · ' + kb(tO) + ' → ' + kb(tW) + ' (' + (tW <= tO ? Math.round(100 - 100 * tW / tO) + ' % más liviano' : Math.round(100 * tW / tO - 100) + ' % más pesado') + ')' : '') + '</p>' +
        '<div class="ic-tabla-caja"><table class="ic-tabla"><thead><tr><th>Imagen</th><th>Tamaño</th><th>PNG</th><th>WebP</th><th></th></tr></thead><tbody>' +
        lista.map((x, i) => '<tr><td><b>' + esc(x.file.name) + '</b></td><td class="nw">' + (x.ancho ? x.ancho + ' × ' + x.alto : '') + '</td><td class="nw">' + kb(x.file.size) + '</td>' +
          '<td class="nw">' + (x.webp ? kb(x.webp.size) + ' <span class="sec">' + (x.webp.size <= x.file.size ? '−' + Math.round(100 - 100 * x.webp.size / x.file.size) + ' %' : '+' + Math.round(100 * x.webp.size / x.file.size - 100) + ' %') + '</span>' : x.estado === 'error' ? '<span style="color:#b3261e">' + esc(x.error) + '</span>' : '<span class="sec">' + (x.estado === 'conv' ? 'Convirtiendo…' : 'En cola') + '</span>') + '</td>' +
          '<td>' + (x.webp ? '<button class="ic-btn sec chico" data-b="' + i + '">' + (typeof window.showSaveFilePicker === 'function' ? '💾 Guardar…' : '⬇ WebP') + '</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>';
      raiz.querySelectorAll('[data-b]').forEach((b) => { b.onclick = () => guardarUna(lista[+b.dataset.b]); });
    }
    let corriendo = false;
    async function procesar() {
      pintar(); if (corriendo) return; corriendo = true;
      try {
        for (let x; (x = lista.find((y) => y.estado === 'cola'));) {
          x.estado = 'conv'; pintar();
          try { await convertir(x); x.estado = 'ok'; } catch (e) { console.error(e); x.estado = 'error'; x.error = e.message || 'No se pudo convertir'; if (/convertidor/.test(x.error)) lista.forEach((y) => { if (y.estado === 'cola') { y.estado = 'error'; y.error = x.error; } }); }
          pintar(); await new Promise((r) => setTimeout(r, 0));
        }
      } finally { corriendo = false; }
    }
    function agregar(files) {
      const png = Array.from(files).filter((f) => /\.png$/i.test(f.name) || f.type === 'image/png'), otros = files.length - png.length;
      png.forEach((file) => { if (!lista.some((x) => x.file.name === file.name && x.file.size === file.size)) lista.push({ file, estado: 'cola' }); });
      if (otros) U.aviso(otros + ' archivo' + (otros === 1 ? ' no es PNG y se omitió' : 's no son PNG y se omitieron'), 'warn');
      procesar();
    }
    inp.onchange = () => { agregar(inp.files); inp.value = ''; };
    ['dragenter', 'dragover'].forEach((ev) => zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.add('sobre'); }));
    ['dragleave', 'drop'].forEach((ev) => zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.remove('sobre'); }));
    zona.addEventListener('drop', (e) => agregar(e.dataTransfer.files));
    const bC = raiz.querySelector('#wCarp'); if (bC) bC.onclick = () => guardarEnCarpeta(lista.filter((x) => x.webp));
    if (!puedeCarpeta) raiz.querySelector('.cuerpo').insertAdjacentHTML('beforeend', '<p class="sec" style="margin:10px 0 0">Para elegir la carpeta donde se guardan, abra esta página en Chrome o Edge en el computador. En este navegador van a la carpeta de Descargas.</p>');
    raiz.querySelector('#wLimpiar').onclick = () => { lista = []; pintar(); };
    raiz.querySelector('#wZip').onclick = async (ev) => {
      const b = ev.currentTarget;
      await U.conCarga(b, async () => {
        const Z = await cargarZip(), z = new Z(), usados = {};
        lista.filter((x) => x.webp).forEach((x) => { let n = nombreWebp(x.file.name); if (usados[n]) n = n.replace(/\.webp$/, '_' + (++usados[n]) + '.webp'); else usados[n] = 1; z.file(n, x.webp); });
        const d = new Date(), p = (k) => String(k).padStart(2, '0');
        bajar(await z.generateAsync({ type: 'blob' }), 'Imagenes_WebP_' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '_' + p(d.getHours()) + p(d.getMinutes()) + '.zip');
      }).catch((e) => U.aviso(e.message, 'err'));
    };
    raiz.querySelector('#wSP').onclick = async (ev) => {
      const b = ev.currentTarget, L = lista.filter((x) => x.webp);
      if (!(await U.confirmar('Guardar en SharePoint', L.length + ' imagen' + (L.length === 1 ? '' : 'es') + ' WebP se guardarán en «' + CARPETA + '». Si ya existe una con el mismo nombre, se reemplaza.', 'Guardar'))) return;
      let n = 0;
      await U.conCarga(b, async () => { for (const x of L) { await IC.graph.subirArchivo(CARPETA + '/' + nombreWebp(x.file.name), x.webp); n++; } })
        .then(() => U.aviso(n + ' imagen' + (n === 1 ? '' : 'es') + ' guardada' + (n === 1 ? '' : 's') + ' en ' + CARPETA, 'ok'))
        .catch((e) => U.aviso('Se guardaron ' + n + ' de ' + L.length + '. ' + U.mensajeError(e), 'err', 9000));
    };
    pintar();
  }
  return { vista };
})();
