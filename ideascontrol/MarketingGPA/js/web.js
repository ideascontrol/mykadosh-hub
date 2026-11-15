/* =====================================================================
   Marketing GPA — publicación del newsletter en la web de GPA (GitHub Pages)
   Repo: growthpathacademy/bpo2bpo (rama main). Actualiza en UN solo commit:
     · newsletter-0NN.html   la edición (encabezado y pie copiados de la edición anterior)
     · newsletter.html       última edición destacada, tarjeta nueva, filtros y conteos
     · newsletter-0(N-1).html enlace «Edición #0NN →» en la navegación
     · sitemap.xml           la URL nueva
   El token de GitHub NO va en el código: se guarda solo en este navegador (localStorage).
   ===================================================================== */
window.GPA_WEB = (function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const neg = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  const limpio = (s) => String(s || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  const lineas = (x) => (Array.isArray(x) ? x : String(x || '').split(/\n/)).map((l) => String(l).trim()).filter(Boolean);
  const n3 = (n) => String(n).padStart(3, '0');
  const archivo = (n) => 'newsletter-' + n3(n) + '.html';
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const cfg = () => (window.CFG && CFG.newsletter && CFG.newsletter.web) || {};

  // Colección: la de la configuración (por nombre o clave) o una nueva con clave automática
  function coleccion(nombre) {
    const lista = cfg().colecciones || [];
    const c = lista.find((x) => norm(x.nombre) === norm(nombre) || x.clave === nombre);
    if (c) return c;
    const clave = norm(nombre).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'general';
    return { clave, nombre: nombre || 'General', emoji: '📘' };
  }
  const titulo = (n) => lineas(n.titulo).join(' ').replace(/\s+/g, ' ');
  const resumen = (n) => limpio(n.resumen_web || (n.linkedin || {}).descripcion || lineas(n.subtitulo).join(' '));
  // Enlace del cierre en la web: sin las UTM de LinkedIn; no se enlaza si apunta a la misma página del newsletter
  function enlaceWeb(url, num) {
    if (!url) return '';
    try {
      const u = new URL(url); Array.from(u.searchParams.keys()).filter((k) => /^utm_/i.test(k)).forEach((k) => u.searchParams.delete(k));
      if (/\/newsletter(\.html)?$/i.test(u.pathname) && /growthpathacademy\.com\.co$/i.test(u.hostname)) return '';
      u.searchParams.set('utm_source', 'web'); u.searchParams.set('utm_medium', 'newsletter'); u.searchParams.set('utm_campaign', 'gpa-insights'); u.searchParams.set('utm_content', 'NL-' + n3(num));
      return u.toString();
    } catch (e) { return ''; }
  }

  // ---------- Página de la edición ----------
  function edicion(prev, d, n, extra) {
    extra = extra || {};
    const i = prev.indexOf('<section class="page-hero">'), j = prev.indexOf('<footer class="site-footer">');
    if (i < 0 || j < 0) throw new Error('La edición anterior no tiene la estructura esperada (page-hero / site-footer).');
    const col = coleccion(d.coleccion), t = titulo(n), num = n3(d.numero);
    let cab = prev.slice(0, i)
      .replace(/<title>[\s\S]*?<\/title>/, '<title>' + esc(t) + ' | GPA Insights</title>')
      .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + esc(resumen(n)) + '">');
    const firma = (prev.match(/<div class="card">[\s\S]*?<\/div>/) || [''])[0];
    const B = [];
    (n.cuerpo || []).forEach((b) => {
      const tx = typeof b === 'string' ? b : (b.texto || ''); if (!tx) return;
      B.push(b.tipo === 'cita' ? '      <div class="nl-pullquote">' + esc(limpio(tx).replace(/^[“"«]+|[”"»]+$/g, '')) + '</div>' : '      <p>' + neg(tx) + '</p>');
    });
    if ((n.pasos || []).length) {
      B.push('', '      <h2>' + esc(n.lista_titulo || 'Para aplicar esta semana') + '</h2>', '      <ul class="nl-qsteps">');
      n.pasos.forEach((p, k) => B.push('        <li><div class="n">' + String(k + 1).padStart(2, '0') + '</div><div class="txt"><b>' + esc(p.titulo) + '</b><span>' + neg(p.texto) + '</span></div></li>'));
      B.push('      </ul>');
    }
    if (n.cierre_parrafo) B.push('', '      <p>' + neg(n.cierre_parrafo) + '</p>');
    if (n.mensaje_clave) B.push('', '      <div class="nl-principle">', '        <span class="tag">Principio de esta edición</span>', '        <p>' + esc(n.mensaje_clave) + '</p>', '      </div>');
    if (n.frase_final) B.push('', '      <p style="font-style:italic; text-align:center;">' + esc(n.frase_final) + '</p>');
    if ((n.preguntas || []).length) {
      B.push('', '      <h2>Preguntas para reflexionar</h2>', '      <ul class="nl-reflect">');
      n.preguntas.forEach((q) => B.push('        <li><span class="dm">◆</span> ' + esc(q) + '</li>'));
      B.push('      </ul>');
    }
    const lnk = enlaceWeb(d.enlace, d.numero), cta = String(n.cta_texto || '').replace(/\s*→\s*$/, '');
    B.push('      <div class="nl-signoff">');
    if (cta) B.push('        <p class="closing">' + (lnk ? '<a href="' + esc(lnk) + '" style="color:inherit;">' : '') + '<b>' + esc(cta) + '</b> →' + (lnk ? '</a>' : '') + '</p>');
    B.push('        <p style="text-align:center; font-weight:700; color:var(--navy); margin-bottom:20px;">Hasta la próxima edición.</p>');
    if (firma) B.push('        ' + firma.trim());
    B.push('      </div>');
    if (col.ebookUrl) B.push('', '      <div class="nl-book-cta">', '        <div class="txt">', '          <p class="eyebrow" style="margin-bottom:6px;">Basado en el eBook</p>',
      '          <h5>' + esc(col.ebook || col.nombre) + '</h5>', '          <span>' + esc(col.ebookTexto || 'Los principios completos detrás de esta serie de newsletters.') + '</span>', '        </div>',
      '        <a class="btn btn-gold btn-sm" href="' + esc(col.ebookUrl) + '" target="_blank" rel="noopener">Consigue el eBook →</a>', '      </div>');
    B.push('', '      <div class="nl-nav">');
    if (extra.anterior) B.push('      <a href="' + archivo(extra.anterior) + '">← Edición #' + n3(extra.anterior) + '</a>');
    B.push('      <a href="newsletter.html">← Volver a todas las ediciones</a>');
    if (extra.siguiente) B.push('      <a href="' + archivo(extra.siguiente) + '">Edición #' + n3(extra.siguiente) + ' →</a>');
    B.push('      <a href="newsletter.html?col=' + esc(col.clave) + '">' + col.emoji + ' Más de «' + esc(col.nombre) + '» →</a>', '      </div>');
    const medio = ['<section class="page-hero">', '  <div class="container">',
      '    <p class="crumb"><a href="index.html">Inicio</a> / <a href="newsletter.html">Newsletter</a> / Edición #' + num + '</p>',
      '    <p class="eyebrow on-dark">GPA INSIGHTS · EDICIÓN #' + num + ' · ' + esc(d.fechaTxt) + '</p>',
      '    <h1>' + esc(t) + '</h1>', '    <p class="lead">' + esc(lineas(n.subtitulo).join(' ')) + '</p>', '  </div>', '</section>', '',
      '<section class="section">', '  <div class="container">', '    <div class="nl-article">'].concat(B, ['    </div>', '  </div>', '</section>', '']).join('\n');
    return cab + medio + prev.slice(j);
  }

  // ---------- Índice newsletter.html ----------
  function indice(html, d, n) {
    const col = coleccion(d.coleccion), t = titulo(n), num = n3(d.numero), href = archivo(d.numero), res = resumen(n);
    // Tarjeta (si ya existe la de esta edición, se reemplaza)
    const tarjeta = ['      <a class="nl-card" href="' + href + '" data-col="' + esc(col.clave) + '" style="text-decoration:none;">', '        <div class="nl-head">',
      '          <span class="nl-num">EDICIÓN #' + num + '</span>', '          <h4>' + esc(t) + '</h4>', '          <span class="nl-date">' + esc(d.fechaTxt) + '</span>', '        </div>', '        <div class="body">',
      '          <span class="nl-col">' + col.emoji + ' ' + esc(col.nombre) + '</span>', '          <p class="summary">' + esc(res) + '</p>', '          <span class="btn btn-teal btn-sm">Leer edición →</span>', '        </div>', '      </a>'].join('\n');
    const reCard = new RegExp('\\n\\s*<a class="nl-card" href="' + href.replace('.', '\\.') + '"[\\s\\S]*?</a>');
    html = html.replace(reCard, '');
    const g = html.indexOf('<div class="nl-grid">'); if (g < 0) throw new Error('newsletter.html no tiene la grilla de ediciones (nl-grid).');
    // Se ubica por número: antes de la primera tarjeta con número menor
    const gFin = html.indexOf('\n    </div>\n', g);
    const grilla = html.slice(g, gFin), re = /\n\s*<a class="nl-card" href="newsletter-(\d+)\.html"/g;
    let pos = -1, m; while ((m = re.exec(grilla))) { if (+m[1] < +d.numero) { pos = g + m.index; break; } }
    if (pos < 0) pos = gFin;
    html = html.slice(0, pos) + '\n' + tarjeta + html.slice(pos);
    // Destacada = la edición de mayor número
    const nums = Array.from(html.matchAll(/<a class="nl-card" href="newsletter-(\d+)\.html"/g)).map((x) => +x[1]);
    if (+d.numero >= Math.max.apply(null, nums)) {
      const f0 = html.indexOf('<div class="nl-featured">'), f1 = html.indexOf('\n  </div>\n</section>', f0);
      if (f0 >= 0 && f1 > f0) {
        const dest = ['<div class="nl-featured">', '      <div class="nl-featured-tag">✨ Última edición · #' + num + ' · ' + esc(d.fechaTxt) + '</div>', '      <h2><a href="' + href + '">' + esc(t) + '</a></h2>',
          '      <p>' + esc(res) + '</p>', '      <div class="nl-featured-actions">', '        <a class="btn btn-gold" href="' + href + '">Leer la edición →</a>',
          '        <span class="nl-col on-dark">' + col.emoji + ' Colección: ' + esc(col.nombre) + '</span>', '      </div>', '    </div>'].join('\n');
        html = html.slice(0, f0) + dest + html.slice(f1);
      }
    }
    // Filtro de la colección (si es nueva) y conteos
    if (html.indexOf('data-filter="' + col.clave + '"') < 0) {
      const c1 = html.indexOf('\n    </div>', html.indexOf('<div class="nl-chips"'));
      html = html.slice(0, c1) + '\n      <button class="nl-chip" data-filter="' + esc(col.clave) + '">' + col.emoji + ' ' + esc(col.nombre) + ' <b>0</b></button>' + html.slice(c1);
    }
    const cols = Array.from(html.matchAll(/<a class="nl-card" href="newsletter-\d+\.html" data-col="([^"]+)"/g)).map((x) => x[1]);
    html = html.replace(/(<button class="nl-chip[^"]*" data-filter="([^"]+)">[^<]*<b>)\d+(<\/b>)/g, (all, a, k, b) => a + (k === 'all' ? cols.length : cols.filter((c) => c === k).length) + b);
    return html;
  }
  // En la edición anterior: enlace «Edición #0NN →»
  function navAnterior(prev, num) {
    const href = archivo(num);
    const a = prev.indexOf('<div class="nl-nav">'); if (a < 0) return prev;
    const b = prev.indexOf('</div>', a), nav = prev.slice(a, b);
    if (nav.indexOf('href="' + href + '"') >= 0) return prev;
    // Si ya enlaza a una edición siguiente posterior a esta, se cambia por esta (queda en orden)
    const mSig = nav.match(/\n\s*<a href="newsletter-(\d+)\.html">Edición #\d+ →<\/a>/);
    if (mSig && +mSig[1] > num) return prev.slice(0, a) + nav.replace(mSig[0], '\n      <a href="' + href + '">Edición #' + n3(num) + ' →</a>') + prev.slice(b);
    const v = nav.indexOf('Volver a todas las ediciones</a>');
    const ins = v >= 0 ? a + v + 'Volver a todas las ediciones</a>'.length : b;
    return prev.slice(0, ins) + '\n      <a href="' + href + '">Edición #' + n3(num) + ' →</a>' + prev.slice(ins);
  }
  function sitemap(xml, num) {
    const loc = 'https://growthpathacademy.com.co/' + archivo(num);
    if (!xml || xml.indexOf(loc) >= 0) return xml;
    const ult = Array.from(xml.matchAll(/<loc>https:\/\/growthpathacademy\.com\.co\/newsletter-\d+\.html<\/loc>\s*(?:<[^>]+>[^<]*<\/[^>]+>\s*)*<\/url>/g)).pop();
    const bloque = '\n\n  <url>\n    <loc>' + loc + '</loc>\n    <priority>0.7</priority>\n  </url>';
    if (ult) { const p = ult.index + ult[0].length; return xml.slice(0, p) + bloque + xml.slice(p); }
    return xml.replace('</urlset>', bloque.trim() + '\n</urlset>');
  }

  // ---------- GitHub ----------
  const CLAVE = 'gpa_github_token';
  const token = () => { try { return localStorage.getItem(CLAVE) || ''; } catch (e) { return ''; } };
  const guardarToken = (t) => { try { if (t) localStorage.setItem(CLAVE, t); else localStorage.removeItem(CLAVE); } catch (e) { /* sin almacenamiento */ } };
  async function gh(metodo, ruta, cuerpo) {
    const r = await fetch('https://api.github.com/repos/' + (cfg().repo || 'growthpathacademy/bpo2bpo') + ruta, { method: metodo, headers: Object.assign({ Accept: 'application/vnd.github+json' }, token() ? { Authorization: 'Bearer ' + token() } : {}, cuerpo ? { 'Content-Type': 'application/json' } : {}), body: cuerpo ? JSON.stringify(cuerpo) : undefined });
    if (r.status === 404 && metodo === 'GET') return null;
    if (!r.ok) {
      let m = ''; try { m = (await r.json()).message || ''; } catch (e) { /* sin detalle */ }
      const e = new Error(r.status === 401 ? 'El token de GitHub no es válido o venció. Cámbielo.' : r.status === 403 || r.status === 404 ? 'El token no tiene permiso de escritura sobre el repositorio de la web (' + m + ').' : 'GitHub respondió ' + r.status + ': ' + m);
      e.status = r.status; throw e;
    }
    return r.status === 204 ? null : r.json();
  }
  const b64aTexto = (b) => new TextDecoder('utf-8').decode(Uint8Array.from(atob(b.replace(/\n/g, '')), (c) => c.charCodeAt(0)));
  // Sin token se lee el archivo público del repositorio (raw), que refleja el último cambio subido
  async function leer(ruta, rama) {
    if (token()) { const r = await gh('GET', '/contents/' + ruta + '?ref=' + rama); return r ? b64aTexto(r.content) : null; }
    const r = await fetch('https://raw.githubusercontent.com/' + (cfg().repo || 'growthpathacademy/bpo2bpo') + '/' + rama + '/' + ruta + '?t=' + Date.now(), { cache: 'no-store' });
    if (r.status === 404) return null; if (!r.ok) throw new Error('No pude leer ' + ruta + ' de la web (' + r.status + ').');
    return r.text();
  }

  // Prepara los cambios (sin escribir nada): devuelve { archivos:{ruta:texto}, resumen:[...] }
  async function preparar(d, n) {
    const rama = cfg().rama || 'main', N = +d.numero;
    // Ediciones que existen en la web (puede faltar alguna: se enlaza con la anterior y la siguiente que sí existan)
    const raiz = await gh('GET', '/contents/?ref=' + rama) || [];
    const hay = raiz.map((f) => (String(f.name).match(/^newsletter-(\d+)\.html$/) || [])[1]).filter(Boolean).map(Number).sort((x, y) => x - y);
    const ant = hay.filter((x) => x < N).pop() || 0, sigN = hay.find((x) => x > N) || 0;
    const [ind, prev, propio, sm] = await Promise.all(['newsletter.html', ant ? archivo(ant) : '', hay.indexOf(N) >= 0 ? archivo(N) : '', 'sitemap.xml'].map((r) => r ? leer(r, rama) : null));
    if (!ind) throw new Error('No encontré newsletter.html en el repositorio de la web.');
    const base = prev || propio; if (!base) throw new Error('No encontré ninguna edición anterior en la web para copiar el encabezado y el pie.');
    const A = {}, R = [];
    A[archivo(N)] = edicion(base, d, n, { anterior: ant, siguiente: sigN }); R.push((propio ? 'Reemplaza ' : 'Crea ') + archivo(N));
    A['newsletter.html'] = indice(ind, d, n); R.push('Actualiza newsletter.html (destacada, tarjeta y filtros)');
    if (prev) { const p2 = navAnterior(prev, N); if (p2 !== prev) { A[archivo(ant)] = p2; R.push('Agrega «Edición #' + n3(N) + ' →» en ' + archivo(ant)); } }
    if (ant && ant < N - 1) R.push('Aviso: en la web no hay ' + (N - ant - 1 === 1 ? 'la edición #' + n3(N - 1) : 'las ediciones #' + n3(ant + 1) + ' a #' + n3(N - 1)) + '; esta queda enlazada con la #' + n3(ant) + '.');
    if (sm) { const s2 = sitemap(sm, N); if (s2 !== sm) { A['sitemap.xml'] = s2; R.push('Agrega la URL al sitemap.xml'); } }
    return { archivos: A, resumen: R, rama };
  }
  // Un solo commit con todos los archivos
  async function escribir(p, mensaje) {
    const ref = await gh('GET', '/git/ref/heads/' + p.rama), com = await gh('GET', '/git/commits/' + ref.object.sha);
    const arbol = await gh('POST', '/git/trees', { base_tree: com.tree.sha, tree: Object.keys(p.archivos).map((r) => ({ path: r, mode: '100644', type: 'blob', content: p.archivos[r] })) });
    const nuevo = await gh('POST', '/git/commits', { message: mensaje, tree: arbol.sha, parents: [ref.object.sha] });
    await gh('PATCH', '/git/refs/heads/' + p.rama, { sha: nuevo.sha });
    return nuevo.sha;
  }
  const url = (n) => 'https://growthpathacademy.com.co/' + archivo(n);
  // ZIP con los archivos para subirlos a mano a la raíz del repositorio
  async function paquete(p) {
    const Z = window.JSZip || await new Promise((ok, mal) => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; sc.onload = () => ok(window.JSZip); sc.onerror = () => mal(new Error('No se pudo cargar el compresor ZIP.')); document.head.appendChild(sc); });
    const z = new Z(); Object.keys(p.archivos).forEach((r) => z.file(r, p.archivos[r]));
    return z.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  }
  return { paquete, edicion, indice, navAnterior, sitemap, preparar, escribir, token, guardarToken, url, archivo, coleccion };
})();
