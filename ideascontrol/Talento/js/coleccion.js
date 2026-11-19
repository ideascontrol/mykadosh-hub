/* =====================================================================
   APP-108 · Desarrollo de Talento — Colecciones de lectura
   Contenidos de lectura libre (p. ej. «Reflexiones Estratégicas» de Growth Path Academy).
   Fuente: lista TAL_Coleccion (la llena la app de cada colección al publicar). Solo estado PUBLICADA.
   Sin avisos: no cuentan como «por leer», no piden «Entendido» y no generan correos (el flujo de correos usa TAL_Piezas).
   Rutas: #colecciones · #colecciones/<código>
   ===================================================================== */
window.Coleccion = (function () {
  const U = IC.ui, esc = U.esc, G = IC.graph;
  const NOMBRES = { REFLEXIONES: { nombre: 'Reflexiones Estratégicas', marca: 'Growth Path Academy', lema: 'Historias que nos ayudan a comprender la vida, desarrollar nuestro carácter y tomar mejores decisiones.' } };
  let items = null, filtro = { col: '', libro: '', dim: '', q: '' };
  const imgs = {};
  async function cargar() {
    if (items) return items;
    try { items = (await G.items('TAL_Coleccion', { top: 2000 })).filter((x) => x.estado === 'PUBLICADA' && x.fecha_publicacion && String(x.fecha_publicacion).slice(0, 10) <= hoy()); }
    catch (e) { items = []; }
    items.sort((a, b) => String(b.fecha_publicacion).localeCompare(String(a.fecha_publicacion)));
    return items;
  }
  const hoy = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const fecha = (f) => f ? new Date(String(f).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const info = (id) => NOMBRES[id] || { nombre: id, marca: '', lema: '' };
  // Portada guardada en Documentos (si la persona no tiene acceso, se muestra el degradado)
  async function portada(ruta) {
    if (!ruta) return '';
    if (imgs[ruta] !== undefined) return imgs[ruta];
    try {
      const s = await G.sitio(CFG.sitio.host, CFG.sitio.ruta);
      const r = await fetch('https://graph.microsoft.com/v1.0/sites/' + s + '/drive/root:/' + ruta.split('/').map(encodeURIComponent).join('/') + ':/content', { headers: { Authorization: 'Bearer ' + await IC.auth.token() } });
      imgs[ruta] = r.ok ? URL.createObjectURL(await r.blob()) : '';
    } catch (e) { imgs[ruta] = ''; }
    return imgs[ruta];
  }
  // Texto ya limpio por la app de origen; se vuelve a limpiar por seguridad (solo etiquetas de texto)
  function limpio(html) {
    const doc = new DOMParser().parseFromString('<div>' + (html || '') + '</div>', 'text/html');
    const OK = { P: 1, H2: 1, H3: 1, STRONG: 1, EM: 1, B: 1, I: 1, BLOCKQUOTE: 1, BR: 1, UL: 1, OL: 1, LI: 1 };
    (function rec(n) { Array.from(n.children).forEach((h) => { if (!OK[h.tagName]) { rec(h); h.replaceWith(...h.childNodes); return; } Array.from(h.attributes).forEach((a) => h.removeAttribute(a.name)); rec(h); }); })(doc.body.firstChild);
    return doc.body.firstChild.innerHTML;
  }

  async function vista(c) {
    c.innerHTML = '<div class="ic-vacio">Cargando…</div>';
    const L = await cargar();
    const cod = decodeURIComponent((location.hash.slice(1).split('/')[1] || ''));
    if (cod) { const it = L.find((x) => x.codigo === cod); if (it) return lectura(c, it); }
    const cols = Array.from(new Set(L.map((x) => x.coleccion)));
    if (!L.length) { c.innerHTML = '<div class="ic-tabla-caja"><div class="ic-vacio">Todavía no hay colecciones publicadas.</div></div>'; return; }
    if (!filtro.col || cols.indexOf(filtro.col) < 0) filtro.col = cols[0];
    const C = L.filter((x) => x.coleccion === filtro.col), I = info(filtro.col);
    const libros = Array.from(new Set(C.slice().sort((a, b) => (Number(a.libro_orden) || 0) - (Number(b.libro_orden) || 0)).map((x) => x.libro).filter(Boolean)));
    const dims = Array.from(new Set(C.map((x) => x.dimension).filter(Boolean))).sort();
    c.innerHTML = (cols.length > 1 ? '<div class="ic-chips" style="margin-bottom:14px">' + cols.map((k) => '<button data-col="' + esc(k) + '" class="' + (k === filtro.col ? 'activo' : '') + '">' + esc(info(k).nombre) + '</button>').join('') + '</div>' : '') +
      '<div class="col-hero"><span>' + esc(I.marca || 'Colección') + '</span><h1>' + esc(I.nombre) + '</h1><p>' + esc(I.lema) + '</p><small>' + C.length + (C.length === 1 ? ' lectura disponible' : ' lecturas disponibles') + '</small></div>' +
      '<div class="col-filtros"><input id="cQ" placeholder="Buscar" value="' + esc(filtro.q) + '">' +
      (libros.length > 1 ? '<select id="cL"><option value="">Todos los libros</option>' + libros.map((l) => '<option' + (l === filtro.libro ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select>' : '') +
      (dims.length > 1 ? '<select id="cD"><option value="">Todas las dimensiones</option>' + dims.map((d) => '<option' + (d === filtro.dim ? ' selected' : '') + '>' + esc(d) + '</option>').join('') + '</select>' : '') + '</div><div class="col-grid" id="cG"></div>';
    const G2 = c.querySelector('#cG');
    function pintar() {
      const q = U.norm(filtro.q);
      const v = C.filter((x) => (!filtro.libro || x.libro === filtro.libro) && (!filtro.dim || x.dimension === filtro.dim) && (!q || U.norm([x.titulo, x.referencia, x.intro, x.competencias].join(' ')).indexOf(q) >= 0));
      G2.innerHTML = v.length ? v.map((x) => '<a class="col-card" href="#colecciones/' + encodeURIComponent(x.codigo) + '"><div class="img" data-port="' + esc(x.portada || '') + '"></div><div class="cuerpo"><span class="ref">' + esc(x.referencia) + '</span><h3>' + esc(x.titulo) + '</h3>' +
        (x.intro ? '<p>' + esc(x.intro) + '</p>' : '') + '<div class="pie"><span>' + esc(fecha(x.fecha_publicacion)) + '</span><b>Leer →</b></div></div></a>').join('') : '<div class="ic-vacio">Nada con ese filtro.</div>';
      G2.querySelectorAll('[data-port]').forEach(async (d) => { const u = await portada(d.dataset.port); if (u) d.style.backgroundImage = 'url("' + u + '")'; });
    }
    c.querySelectorAll('[data-col]').forEach((b) => { b.onclick = () => { filtro = { col: b.dataset.col, libro: '', dim: '', q: '' }; vista(c); }; });
    const sL = c.querySelector('#cL'), sD = c.querySelector('#cD');
    if (sL) sL.onchange = () => { filtro.libro = sL.value; pintar(); };
    if (sD) sD.onchange = () => { filtro.dim = sD.value; pintar(); };
    let t; c.querySelector('#cQ').oninput = (e) => { clearTimeout(t); t = setTimeout(() => { filtro.q = e.target.value.trim(); pintar(); }, 250); };
    pintar();
  }
  async function lectura(c, x) {
    const L = items.filter((y) => y.coleccion === x.coleccion), i = L.indexOf(x);
    const img = await portada(x.portada);
    c.innerHTML = '<a class="ic-volver" href="#colecciones">← ' + esc(info(x.coleccion).nombre) + '</a><article class="col-art">' +
      '<div class="col-cab"><span>' + esc(info(x.coleccion).nombre) + '</span><h1>' + esc(x.titulo) + '</h1><p>' + esc(x.referencia) + '</p></div>' +
      (img ? '<img class="col-port" src="' + img + '" alt="">' : '') + '<div class="col-texto">' + limpio(x.contenido) + '</div>' +
      (x.pregunta ? '<div class="col-preg"><span>Una pregunta para llevarse</span><p>' + esc(x.pregunta) + '</p></div>' : '') +
      '<p class="col-fecha">' + esc(fecha(x.fecha_publicacion)) + ' · ' + esc(x.codigo) + '</p>' +
      '<div class="col-nav">' + (L[i + 1] ? '<a href="#colecciones/' + encodeURIComponent(L[i + 1].codigo) + '">← ' + esc(L[i + 1].titulo) + '</a>' : '<span></span>') + (L[i - 1] ? '<a href="#colecciones/' + encodeURIComponent(L[i - 1].codigo) + '">' + esc(L[i - 1].titulo) + ' →</a>' : '') + '</div></article>';
  }
  return { vista };
})();
