/* =====================================================================
   IC · Comprimir imágenes en el navegador (como TinyPNG, sin subirlas a ningún servicio)
   IC.comprimir(file, { formato: 'auto'|'jpg'|'png'|'webp', calidad: 0.82, maxAncho, maxAlto })
     → Promise<{ file, antes, despues, ancho, alto }>
   · JPG / WebP: se vuelve a codificar con la calidad indicada.
   · PNG: reducción de colores (cuantización a 256 colores con UPNG, como TinyPNG).
   · auto: PNG si la imagen tiene transparencia; si no, JPG (lo más liviano para fotos y piezas).
   · Si la imagen es más grande que maxAncho × maxAlto, se reduce manteniendo la proporción.
   ===================================================================== */
(function () {
  window.IC = window.IC || {};
  const cargar = (src) => new Promise((ok, mal) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar ' + src)); document.head.appendChild(s); });
  let libPng = null;
  function cargarPng() {
    if (!libPng) libPng = (window.pako ? Promise.resolve() : cargar('https://cdnjs.cloudflare.com/ajax/libs/pako/1.0.11/pako.min.js'))
      .then(() => window.UPNG ? null : cargar('https://cdn.jsdelivr.net/npm/upng-js@2.1.0/UPNG.js')).then(() => window.UPNG);
    return libPng;
  }
  function abrir(file) {
    return new Promise((ok, mal) => {
      const u = URL.createObjectURL(file), i = new Image();
      i.onload = () => { ok(i); setTimeout(() => URL.revokeObjectURL(u), 1000); };
      i.onerror = () => mal(new Error('No se pudo abrir ' + file.name + ' (¿es una imagen?)'));
      i.src = u;
    });
  }
  const aBlob = (c, tipo, q) => new Promise((ok) => c.toBlob(ok, tipo, q));
  function tieneTransparencia(g, w, h) {
    const d = g.getImageData(0, 0, w, h).data;
    for (let k = 3; k < d.length; k += 4 * 7) if (d[k] < 250) return true;
    return false;
  }
  async function comprimir(file, o) {
    o = Object.assign({ formato: 'auto', calidad: 0.82, maxAncho: 0, maxAlto: 0 }, o || {});
    const img = await abrir(file);
    let w = img.naturalWidth, h = img.naturalHeight;
    const r = Math.min(o.maxAncho ? o.maxAncho / w : 1, o.maxAlto ? o.maxAlto / h : 1, 1);
    w = Math.round(w * r); h = Math.round(h * r);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, w, h);
    let fmt = o.formato;
    if (fmt === 'auto') fmt = /png|webp|gif/i.test(file.type) && tieneTransparencia(g, w, h) ? 'png' : 'jpg';
    let blob;
    if (fmt === 'png') {
      const U = await cargarPng();
      const datos = g.getImageData(0, 0, w, h).data.buffer;
      blob = new Blob([U.encode([datos], w, h, 256)], { type: 'image/png' });
    } else {
      if (fmt === 'jpg') { // fondo blanco para lo transparente
        const b = document.createElement('canvas'); b.width = w; b.height = h; const bg = b.getContext('2d');
        bg.fillStyle = '#fff'; bg.fillRect(0, 0, w, h); bg.drawImage(c, 0, 0); blob = await aBlob(b, 'image/jpeg', o.calidad);
      } else blob = await aBlob(c, 'image/webp', o.calidad);
    }
    // Si no ganó nada y no hubo que cambiar el tamaño ni el formato, se deja el original
    const ext = fmt === 'jpg' ? 'jpg' : fmt;
    const mismoTipo = (file.type === 'image/jpeg' && fmt === 'jpg') || file.type === 'image/' + fmt;
    if (blob.size >= file.size && r === 1 && mismoTipo) return { file, antes: file.size, despues: file.size, ancho: w, alto: h, igual: true };
    const nombre = file.name.replace(/\.[^.]+$/, '') + '.' + ext;
    return { file: new File([blob], nombre, { type: blob.type, lastModified: Date.now() }), antes: file.size, despues: blob.size, ancho: w, alto: h };
  }
  const kb = (n) => n >= 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.round(n / 1024) + ' KB';
  IC.comprimir = comprimir;
  IC.comprimir.kb = kb;
})();
