/* =====================================================================
   Reflexiones Estratégicas — editor narrativo
   Editor de texto enriquecido sencillo (contenteditable): subtítulos, párrafos, negrita, cursiva y citas.
   Al pegar (desde Word, Claude o ChatGPT) se limpia el formato y se conservan solo esas etiquetas.
   ===================================================================== */
window.RE_EDITOR = (function () {
  const PERMITIDAS = { P: 1, H2: 1, H3: 1, STRONG: 1, B: 1, EM: 1, I: 1, BLOCKQUOTE: 1, BR: 1, UL: 1, OL: 1, LI: 1 };
  const MAPA = { B: 'STRONG', I: 'EM', H1: 'H2', H4: 'H3', H5: 'H3', H6: 'H3', DIV: 'P' };

  // Limpia HTML: solo etiquetas permitidas, sin atributos ni estilos
  function limpiar(html) {
    const doc = new DOMParser().parseFromString('<div>' + (html || '') + '</div>', 'text/html');
    const raiz = doc.body.firstChild;
    function nodo(n) {
      if (n.nodeType === 3) return doc.createTextNode(n.nodeValue.replace(/ /g, ' '));
      if (n.nodeType !== 1) return null;
      let tag = n.tagName;
      if (/^(SCRIPT|STYLE|META|LINK|TITLE|XML|O:P|IMG|IFRAME|OBJECT)$/.test(tag)) return null;
      // Negrita/cursiva escritas como estilo (Word, Google Docs)
      const st = (n.getAttribute && n.getAttribute('style')) || '';
      tag = MAPA[tag] || tag;
      const frag = doc.createDocumentFragment();
      Array.from(n.childNodes).forEach((h) => { const x = nodo(h); if (x) frag.appendChild(x); });
      if (!PERMITIDAS[tag]) {
        let f = frag;
        if (/font-weight:\s*(bold|[6-9]00)/i.test(st)) { const b = doc.createElement('strong'); b.appendChild(f); f = b; }
        if (/font-style:\s*italic/i.test(st)) { const i = doc.createElement('em'); i.appendChild(f); f = i; }
        return f;
      }
      const el = doc.createElement(tag.toLowerCase());
      el.appendChild(frag);
      return el;
    }
    const out = doc.createElement('div');
    Array.from(raiz.childNodes).forEach((h) => { const x = nodo(h); if (x) out.appendChild(x); });
    // Texto suelto en la raíz → párrafos
    const fin = doc.createElement('div'); let p = null;
    Array.from(out.childNodes).forEach((h) => {
      const bloque = h.nodeType === 1 && /^(P|H2|H3|BLOCKQUOTE|UL|OL)$/.test(h.tagName);
      if (bloque) { p = null; fin.appendChild(h); return; }
      if (h.nodeType === 3 && !h.nodeValue.trim()) return;
      if (!p) { p = doc.createElement('p'); fin.appendChild(p); }
      p.appendChild(h);
    });
    fin.querySelectorAll('p,h2,h3,blockquote').forEach((e) => { if (!e.textContent.trim()) e.remove(); });
    return fin.innerHTML.replace(/(<br>\s*){3,}/g, '<br><br>');
  }
  // Texto plano (pegado sin formato o desde un .txt): párrafos por líneas en blanco; «## » subtítulo; «> » cita
  function desdeTexto(t) {
    const esc = IC.ui.esc;
    return String(t || '').replace(/\r/g, '').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean).map((b) => {
      if (/^#{1,2}\s/.test(b)) return '<h2>' + esc(b.replace(/^#+\s*/, '')) + '</h2>';
      if (/^#{3,}\s/.test(b)) return '<h3>' + esc(b.replace(/^#+\s*/, '')) + '</h3>';
      if (/^>\s?/.test(b)) return '<blockquote>' + esc(b.replace(/^>\s?/gm, '')) + '</blockquote>';
      return '<p>' + esc(b).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }
  const palabras = (html) => { const t = String(html || '').replace(/<[^>]+>/g, ' ').trim(); return t ? t.split(/\s+/).length : 0; };

  // Monta el editor en «caja». opciones: { html, soloLectura, alCambiar }
  function montar(caja, o) {
    const B = [['h2', 'Subtítulo', 'H2'], ['h3', 'Subtítulo menor', 'H3'], ['p', 'Párrafo', '¶'], ['bold', 'Negrita', '<b>N</b>'], ['italic', 'Cursiva', '<i>K</i>'], ['blockquote', 'Cita destacada', '❝'], ['undo', 'Deshacer', '↶'], ['redo', 'Rehacer', '↷']];
    caja.innerHTML = (o.soloLectura ? '' : '<div class="re-barra">' + B.map((b) => '<button type="button" data-c="' + b[0] + '" title="' + b[1] + '">' + b[2] + '</button>').join('') +
      '<span class="re-palabras" id="edPal"></span></div>') +
      '<div class="re-editor re-lectura" ' + (o.soloLectura ? '' : 'contenteditable="true" spellcheck="true"') + ' id="edArea" data-ph="Escriba o pegue aquí la historia narrada y la reflexión…"></div>';
    const area = caja.querySelector('#edArea'), pal = caja.querySelector('#edPal');
    area.innerHTML = limpiar(o.html || '');
    let sucio = false;
    const cuenta = () => { if (pal) { const n = palabras(area.innerHTML); pal.textContent = n.toLocaleString('es-CO') + ' palabras · ~' + Math.max(1, Math.round(n / 500)) + ' pág.'; } };
    const cambio = () => { sucio = true; cuenta(); if (o.alCambiar) o.alCambiar(); };
    cuenta();
    if (o.soloLectura) return { html: () => area.innerHTML, sucio: () => false, limpio: () => {} };
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* navegador antiguo */ }
    caja.querySelectorAll('[data-c]').forEach((b) => {
      b.onmousedown = (e) => e.preventDefault();
      b.onclick = () => {
        const c = b.dataset.c; area.focus();
        if (c === 'bold' || c === 'italic' || c === 'undo' || c === 'redo') document.execCommand(c);
        else document.execCommand('formatBlock', false, c === 'blockquote' ? 'blockquote' : c);
        cambio();
      };
    });
    area.addEventListener('input', cambio);
    area.addEventListener('paste', (e) => {
      e.preventDefault();
      const cd = e.clipboardData, h = cd.getData('text/html'), t = cd.getData('text/plain');
      const html = h ? limpiar(h) : desdeTexto(t);
      document.execCommand('insertHTML', false, html);
      cambio();
    });
    area.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); document.execCommand('bold'); cambio(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') { e.preventDefault(); document.execCommand('italic'); cambio(); }
    });
    return { html: () => limpiar(area.innerHTML), sucio: () => sucio, limpio: () => { sucio = false; }, poner: (html) => { area.innerHTML = limpiar(html); cambio(); } };
  }
  return { montar, limpiar, desdeTexto, palabras };
})();
