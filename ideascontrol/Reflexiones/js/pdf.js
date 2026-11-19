/* =====================================================================
   Reflexiones Estratégicas — PDF de una reflexión (descarga directa, tamaño carta)
   Se arma en el navegador con pdfmake: portada con título y referencia, imagen, la historia
   (subtítulos, negritas, cursivas y citas), la pregunta para llevarse y pie con el código.
   ===================================================================== */
window.RE_PDF = (function () {
  const C = { navy: '#1B3A6B', teal: '#007A78', oro: '#C5A028', tinta: '#25313d', gris: '#7a8693', claro: '#F4F6FA' };
  let lib = null;
  function cargar(src) { return new Promise((ok, mal) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar el generador de PDF. Revise la conexión.')); document.head.appendChild(s); }); }
  function preparar() {
    if (!lib) lib = (window.pdfMake ? Promise.resolve() : cargar('https://cdn.jsdelivr.net/npm/pdfmake@0.2.10/build/pdfmake.min.js'))
      .then(() => (window.pdfMake.vfs && Object.keys(window.pdfMake.vfs).length ? null : cargar('https://cdn.jsdelivr.net/npm/pdfmake@0.2.10/build/vfs_fonts.js')))
      .catch((e) => { lib = null; throw e; });
    return lib;
  }
  // Imagen → dataURL JPEG/PNG (pdfmake no lee WebP)
  async function aDataURL(blob, maxAncho) {
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = url; });
      const k = Math.min(1, (maxAncho || 1400) / img.naturalWidth);
      const cv = document.createElement('canvas'); cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
      const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
      return { data: cv.toDataURL('image/jpeg', 0.88), ancho: cv.width, alto: cv.height };
    } finally { URL.revokeObjectURL(url); }
  }
  async function logo() {
    try { const r = await fetch(CFG.logo); if (!r.ok) return null; return (await aDataURL(await r.blob(), 500)).data; } catch (e) { return null; }
  }

  // HTML del editor → bloques de pdfmake
  function inlines(nodo, est) {
    const out = [];
    nodo.childNodes.forEach((n) => {
      if (n.nodeType === 3) { if (n.nodeValue) out.push(Object.assign({ text: n.nodeValue.replace(/\s+/g, ' ') }, est)); return; }
      if (n.nodeType !== 1) return;
      const t = n.tagName;
      if (t === 'BR') { out.push({ text: '\n' }); return; }
      const e = Object.assign({}, est); if (t === 'STRONG' || t === 'B') e.bold = true; if (t === 'EM' || t === 'I') e.italics = true;
      out.push(...inlines(n, e));
    });
    return out;
  }
  function bloques(html) {
    const raiz = new DOMParser().parseFromString('<div>' + RE_EDITOR.limpiar(html || '') + '</div>', 'text/html').body.firstChild;
    const out = [];
    raiz.childNodes.forEach((n) => {
      if (n.nodeType !== 1) return;
      const t = n.tagName, txt = inlines(n, {});
      if (t === 'H2') out.push({ text: txt, style: 'h2' });
      else if (t === 'H3') out.push({ text: txt, style: 'h3' });
      else if (t === 'BLOCKQUOTE') out.push({ table: { widths: [3, '*'], body: [[{ text: '', fillColor: C.oro }, { text: txt, style: 'cita' }]] }, layout: { defaultBorder: false, paddingLeft: (i) => (i ? 14 : 0), paddingRight: () => 0, paddingTop: () => 4, paddingBottom: () => 4 }, margin: [0, 6, 0, 14] });
      else if (t === 'UL' || t === 'OL') out.push({ [t === 'UL' ? 'ul' : 'ol']: Array.from(n.children).map((li) => ({ text: inlines(li, {}), style: 'p' })), margin: [0, 0, 0, 10] });
      else out.push({ text: txt, style: 'p' });
    });
    return out;
  }

  async function generar(r) {
    await preparar();
    const titulo = r.titulo_editorial || r.titulo || r.codigo;
    const [lg, port] = await Promise.all([logo(), r.portada ? RE.blobPortada(r.portada).then((b) => aDataURL(b, 1600)).catch(() => null) : null]);
    const ancho = 612 - 2 * 62;
    const cab = { table: { widths: ['*'], body: [[{ stack: [
      { text: 'REFLEXIONES ESTRATÉGICAS', style: 'eyebrow' },
      { text: titulo, style: 'titulo' },
      { text: RE.referenciaCompleta(r), style: 'ref' }
    ], fillColor: C.navy, margin: [22, 22, 22, 20] }], [{ text: '', fillColor: C.oro, margin: [0, 1.5, 0, 1.5] }]] }, layout: 'noBorders', margin: [0, 0, 0, 22] };
    const contenido = [];
    if (lg) contenido.push({ image: lg, width: 82, margin: [0, 0, 0, 14] });   // logo a color, sobre fondo blanco
    contenido.push(cab);
    // La portada se ajusta para caber en la primera página (no deja hojas en blanco)
    if (port) contenido.push({ image: port.data, fit: [ancho, 290], alignment: 'center', margin: [0, 0, 0, 22] });
    contenido.push(...bloques(r.contenido));
    if (r.pregunta) contenido.push({ unbreakable: true, table: { widths: ['*'], body: [[{ stack: [{ text: 'UNA PREGUNTA PARA LLEVARSE', style: 'eyebrowT' }, { text: r.pregunta, style: 'pregunta' }], fillColor: C.claro, margin: [18, 16, 18, 18] }]] },
      layout: { hLineWidth: (i) => (i === 0 ? 3 : 0), vLineWidth: () => 0, hLineColor: () => C.teal }, margin: [0, 18, 0, 0] });
    const clas = [RE.nombreDim(r.dimension), r.competencia].filter(Boolean).join(' · ');
    contenido.push({ text: [r.codigo, clas].filter(Boolean).join('  ·  '), style: 'colofon', margin: [0, 26, 0, 0] });
    const doc = {
      pageSize: 'LETTER', pageMargins: [62, 56, 62, 60],
      info: { title: titulo + ' · Reflexiones Estratégicas', author: 'Growth Path Academy', subject: RE.referenciaCompleta(r), keywords: [r.codigo, clas].join(', ') },
      content: contenido,
      footer: (p, n) => ({ columns: [{ text: 'Growth Path Academy · Reflexiones Estratégicas', color: C.gris, fontSize: 8 }, { text: r.codigo + '  ·  ' + p + ' / ' + n, alignment: 'right', color: C.gris, fontSize: 8 }], margin: [62, 20, 62, 0] }),
      defaultStyle: { font: 'Roboto', fontSize: 11, color: C.tinta, lineHeight: 1.45 },
      styles: {
        eyebrow: { fontSize: 8.5, bold: true, color: C.oro, characterSpacing: 2 },
        eyebrowT: { fontSize: 8.5, bold: true, color: C.teal, characterSpacing: 2, margin: [0, 0, 0, 6] },
        titulo: { fontSize: 24, bold: true, color: '#ffffff', lineHeight: 1.15, margin: [0, 8, 0, 6] },
        ref: { fontSize: 11.5, color: '#dfe6f0' },
        p: { alignment: 'justify', margin: [0, 0, 0, 9] },
        h2: { fontSize: 15, bold: true, color: C.navy, margin: [0, 12, 0, 6], lineHeight: 1.2 },
        h3: { fontSize: 12.5, bold: true, color: C.navy, margin: [0, 10, 0, 4], lineHeight: 1.2 },
        cita: { fontSize: 13, color: C.navy, italics: true, lineHeight: 1.35 },
        pregunta: { fontSize: 14, bold: true, color: C.navy, lineHeight: 1.35 },
        colofon: { fontSize: 8.5, color: C.gris, alignment: 'center' }
      }
    };
    const nombre = (r.codigo + '_' + titulo).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '_').replace(/_+/g, '_').slice(0, 90) + '.pdf';
    await new Promise((ok) => window.pdfMake.createPdf(doc).download(nombre, ok));
    return nombre;
  }
  return { generar, preparar };
})();
