/* ==========================================================================
   RELLENO DE PLANTILLAS WORD — Ideas Control
   Funciones para escribir en las plantillas de trabajo (.docx) desde el
   navegador, sin alterar su diseño:
     · campo(doc, 'Cliente', 'YAMAHA')            celda a la derecha de una etiqueta
     · marcarCampo(doc, 'Tipo de mantenimiento', 'Preventivo')   casilla ☐ → ☒
     · caja(doc, 'Hallazgos identificados', texto)  recuadro con encabezado oscuro
     · tabla(doc, ['punto de control'])           tabla por los textos del encabezado
     · marcarParrafo(doc, 'Resultado final', 'Operativo')
   Las casillas pueden ser texto (☐) o controles de contenido de Word (w14).
   Requiere JSZip.
   ========================================================================== */
(function () {
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const W14 = 'http://schemas.microsoft.com/office/word/2010/wordml';
  const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').replace(/[:.]$/, '').trim();
  const el = (doc, tag) => doc.createElementNS(W, 'w:' + tag);
  const ts = n => Array.from(n.getElementsByTagNameNS(W, 't'));
  const txt = n => ts(n).map(t => t.textContent).join('');
  const hijos = (n, tag) => Array.from(n.childNodes).filter(c => c.localName === tag && c.namespaceURI === W);
  const filas = tbl => hijos(tbl, 'tr');
  const celdas = tr => hijos(tr, 'tc');
  const oscuro = tc => {
    const shd = tc.getElementsByTagNameNS(W, 'shd')[0]; const f = shd && shd.getAttributeNS(W, 'fill');
    if (!f || f.length !== 6) return false;
    const [r, g, b] = [0, 2, 4].map(i => parseInt(f.substr(i, 2), 16));
    return 0.299 * r + 0.587 * g + 0.114 * b < 150;
  };
  const VACIO = /^(|eq|dd \/ mm \/ aaaa|_+)$/;

  function run(doc, valor, tam = 19) {
    const r = el(doc, 'r'), rp = el(doc, 'rPr'), f = el(doc, 'rFonts'), c = el(doc, 'color'), sz = el(doc, 'sz'), t = el(doc, 't');
    ['ascii', 'hAnsi', 'cs'].forEach(a => f.setAttributeNS(W, 'w:' + a, 'Calibri'));
    c.setAttributeNS(W, 'w:val', '1B365D'); sz.setAttributeNS(W, 'w:val', String(tam));
    rp.append(f, c, sz); t.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve'); t.textContent = valor;
    r.append(rp, t); return r;
  }
  /** Reemplaza el contenido de la celda (conserva el formato de párrafo). Admite varias líneas. */
  function escribir(doc, tc, valor) {
    if (valor == null || valor === '') return false;
    const ps = hijos(tc, 'p');
    const base = ps[0] || tc.appendChild(el(doc, 'p'));
    ps.slice(1).forEach(p => p.remove());
    Array.from(base.childNodes).forEach(n => { if (n.localName !== 'pPr') n.remove(); });
    String(valor).split('\n').forEach((linea, i) => {
      let p = base;
      if (i > 0) { p = base.cloneNode(false); const ppr = base.getElementsByTagNameNS(W, 'pPr')[0]; if (ppr) p.appendChild(ppr.cloneNode(true)); tc.appendChild(p); }
      p.appendChild(run(doc, linea));
    });
    return true;
  }
  /** Agrega texto al final de la celda (después de "Referencia:", "Detalle: ____", etc.). */
  function completar(doc, tc, valor) {
    if (!valor) return false;
    const conRaya = ts(tc).find(t => /_{3,}/.test(t.textContent));
    if (conRaya) { conRaya.textContent = conRaya.textContent.replace(/_{3,}/, ' ' + valor + ' '); return true; }
    const ps = hijos(tc, 'p'); const p = ps[ps.length - 1] || tc.appendChild(el(doc, 'p'));
    p.appendChild(run(doc, ' ' + valor)); return true;
  }
  /** Marca la casilla cuya opción coincide con la etiqueta ('' = la primera casilla). */
  function marcar(scope, etiqueta) {
    // Controles de contenido de Word
    const sdts = Array.from(scope.getElementsByTagNameNS(W, 'sdt')).filter(s => s.getElementsByTagNameNS(W14, 'checkbox').length);
    for (const sdt of sdts) {
      let sig = sdt.nextSibling, lbl = '';
      while (sig && sig.localName !== 'sdt') { lbl += txt(sig); sig = sig.nextSibling; }
      if (!etiqueta || norm(lbl).startsWith(norm(etiqueta))) {
        const ch = sdt.getElementsByTagNameNS(W14, 'checked')[0]; if (ch) ch.setAttributeNS(W14, 'w14:val', '1');
        const t = sdt.getElementsByTagNameNS(W, 't')[0]; if (t) t.textContent = '☒';
        return true;
      }
    }
    // Casillas de texto ☐
    const nodos = ts(scope); let full = ''; const mapa = [];
    nodos.forEach((t, i) => { for (let k = 0; k < t.textContent.length; k++) mapa.push([i, k]); full += t.textContent; });
    const pos = []; for (let i = 0; i < full.length; i++) if (full[i] === '☐' || full[i] === '☒') pos.push(i);
    const L = norm(etiqueta);
    for (let j = 0; j < pos.length; j++) {
      if (full[pos[j]] !== '☐') continue;
      let op = full.slice(pos[j] + 1, pos[j + 1] ?? full.length);
      op = op.split(/\s{2,}|:/)[0].replace(/\(.*?\)/g, '');
      if (norm(op) === L) {
        const [i, k] = mapa[pos[j]]; const t = nodos[i];
        t.textContent = t.textContent.slice(0, k) + '☒' + t.textContent.slice(k + 1);
        return true;
      }
    }
    return false;
  }
  const tablas = doc => Array.from(doc.getElementsByTagNameNS(W, 'tbl'));
  /** Celda de etiqueta (no oscura) cuyo texto coincide. */
  function etiquetaCelda(doc, etiqueta, n = 0) {
    const L = norm(etiqueta); let k = 0;
    for (const tbl of tablas(doc)) for (const tr of filas(tbl)) {
      const cs = celdas(tr);
      for (let j = 0; j < cs.length - 1; j++) if (!oscuro(cs[j]) && norm(txt(cs[j])) === L) { if (k++ === n) return [cs[j], cs[j + 1]]; }
    }
    return null;
  }
  /** Escribe el valor en la celda a la derecha de la etiqueta. */
  function campo(doc, etiqueta, valor, n = 0) {
    if (valor == null || valor === '') return false;
    const par = etiquetaCelda(doc, etiqueta, n); if (!par) return false;
    const [, v] = par;
    return VACIO.test(norm(txt(v))) ? escribir(doc, v, valor) : completar(doc, v, valor);
  }
  function marcarCampo(doc, etiqueta, opcion, n = 0) {
    if (!opcion) return false;
    const par = etiquetaCelda(doc, etiqueta, n); return !!(par && marcar(par[1], opcion));
  }
  /** Recuadro de texto: tabla de 1 columna cuyo encabezado empieza por 'encabezado'. */
  function caja(doc, encabezado, valor) {
    if (!valor) return false;
    const L = norm(encabezado);
    for (const tbl of tablas(doc)) {
      const fs = filas(tbl); if (fs.length < 2) continue;
      const c0 = celdas(fs[0]); if (c0.length !== 1 || !norm(txt(c0[0])).startsWith(L)) continue;
      return escribir(doc, celdas(fs[1])[0], valor);
    }
    return false;
  }
  /** Tabla cuyo encabezado (primera fila) contiene todos los textos indicados. */
  function tabla(doc, textos) {
    const req = textos.map(norm);
    return tablas(doc).find(tbl => { const f = filas(tbl)[0]; if (!f) return false; const cab = celdas(f).map(c => norm(txt(c))); return req.every(r => cab.some(c => c.startsWith(r))); }) || null;
  }
  function marcarParrafo(doc, inicio, opcion) {
    if (!opcion) return false;
    const L = norm(inicio);
    const p = Array.from(doc.getElementsByTagNameNS(W, 'p')).find(p => norm(txt(p)).startsWith(L) && txt(p).includes('☐'));
    return !!(p && marcar(p, opcion));
  }
  async function abrir(url) {
    const r = await fetch(url); if (!r.ok) throw new Error('No se pudo leer la plantilla ' + url);
    const zip = await JSZip.loadAsync(await r.arrayBuffer());
    const doc = new DOMParser().parseFromString(await zip.file('word/document.xml').async('string'), 'application/xml');
    return { zip, doc };
  }
  async function cerrar({ zip, doc }) {
    zip.file('word/document.xml', new XMLSerializer().serializeToString(doc));
    return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }
  window.GDDocx = { W, norm, txt, filas, celdas, oscuro, escribir, completar, marcar, campo, marcarCampo, caja, tabla, marcarParrafo, abrir, cerrar, etiquetaCelda };
})();
