/* =====================================================================
   APP-101 · Comercial — Centro de ayuda dentro de la app
   - Botón «? Ayuda» del encabezado (o tecla F1): panel lateral con el
     artículo de la pantalla en la que está la persona, buscador y temas.
     No navega: lo que la persona estaba haciendo no se pierde.
   - Ruta #ayuda y #ayuda/<id>: centro de ayuda completo (temas a la izquierda,
     artículo a la derecha). Cada artículo tiene su dirección para compartirla.
   - El contenido está en ayuda_contenido.js (window.IC_AYUDA).
   - Los artículos marcados admin solo los ven los administradores.
   ===================================================================== */
(function () {
  const U = IC.ui, esc = U.esc;
  const A = () => window.IC_AYUDA || { ARTICULOS: [], CATEGORIAS: [], CONTEXTO: [], DESTACADOS: [] };
  const puedeVer = (a) => a && (!a.admin || (App.usuario && App.usuario.es_admin));
  const articulos = () => A().ARTICULOS.filter(puedeVer);
  const porId = (id) => A().ARTICULOS.find((a) => a.id === id);
  const nombreCat = (c) => (A().CATEGORIAS.find((x) => x[0] === c) || [c, c])[1];
  const ICO = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>';
  const ICO_BUSCAR = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';

  // ---------- Artículo de la pantalla actual ----------
  function idDeContexto(ruta) {
    const seg = String(ruta === undefined ? (location.hash || '').replace(/^#/, '') : ruta).split('/').filter(Boolean);
    if (seg[0] === 'ayuda') return seg[1] && porId(seg[1]) ? seg[1] : 'ayuda';
    const coincide = (p) => { const ps = p.split('/').filter(Boolean); return ps.length === seg.length && ps.every((x, i) => x === '*' || x === seg[i]); };
    let r = A().CONTEXTO.find((c) => coincide(c[0]));
    if (!r && seg.length) r = A().CONTEXTO.find((c) => c[0] === seg[0]);
    const id = r ? r[1] : 'menu';
    return puedeVer(porId(id)) ? id : 'menu';
  }

  // ---------- Búsqueda (sin tildes; todas las palabras deben aparecer) ----------
  const texto = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ');
  function buscar(q) {
    const palabras = U.norm(q).split(/\s+/).filter((w) => w.length > 1);
    if (!palabras.length) return [];
    return articulos().map((a) => {
      const t = U.norm(a.titulo), k = U.norm(a.claves || '') + ' ' + U.norm(a.resumen || ''), b = U.norm(texto(a.html));
      let p = 0;
      for (const w of palabras) {
        const s = (t.includes(w) ? 6 : 0) + (k.includes(w) ? 3 : 0) + (b.includes(w) ? 1 : 0);
        if (!s) return null;
        p += s;
      }
      return { a, p };
    }).filter(Boolean).sort((x, y) => y.p - x.p).filter((x, i, arr) => {
      // Si hay coincidencias en títulos o palabras clave, de las que solo aparecen en el texto se muestran 3
      const fuertes = arr.filter((z) => z.p > palabras.length).length;
      return !fuertes || x.p > palabras.length || i < fuertes + 3;
    }).map((x) => x.a);
  }
  const resaltar = (s, q) => {
    let h = esc(s); const ws = U.norm(q).split(/\s+/).filter((w) => w.length > 1); if (!ws.length) return h;
    // resalta sin tildes: se compara contra la versión normalizada letra por letra
    const n = U.norm(s); const marcas = new Array(s.length).fill(false);
    ws.forEach((w) => { let i = n.indexOf(w); while (i >= 0) { for (let j = i; j < i + w.length; j++) marcas[j] = true; i = n.indexOf(w, i + 1); } });
    if (n.length !== s.length) return h;
    let out = '', abierto = false;
    for (let i = 0; i < s.length; i++) { if (marcas[i] && !abierto) { out += '<mark>'; abierto = true; } if (!marcas[i] && abierto) { out += '</mark>'; abierto = false; } out += esc(s[i]); }
    return out + (abierto ? '</mark>' : '');
  };

  // ---------- Piezas comunes ----------
  const itemLista = (a, q) => '<a class="ic-ay-item" href="#ayuda/' + a.id + '" data-art="' + a.id + '"><b>' + resaltar(a.titulo, q || '') + '</b><span>' + resaltar(a.resumen || '', q || '') + '</span></a>';
  function htmlArticulo(a, conTitulo) {
    const rel = articulos().filter((x) => x.cat === a.cat && x.id !== a.id).slice(0, 4);
    return '<article class="ic-ay-art">' +
      '<div class="ic-ay-ruta">' + esc(nombreCat(a.cat)) + (a.admin ? ' · <span class="ic-badge admin">Administradores</span>' : '') + '</div>' +
      (conTitulo ? '<h1>' + esc(a.titulo) + '</h1>' : '<h2>' + esc(a.titulo) + '</h2>') +
      '<div class="ic-ay-cuerpo">' + a.html + '</div>' +
      (rel.length ? '<div class="ic-ay-rel"><h3>Relacionados</h3>' + rel.map((x) => '<a href="#ayuda/' + x.id + '" data-art="' + x.id + '">' + esc(x.titulo) + '</a>').join('') + '</div>' : '') +
      '<p class="ic-ay-pie">¿No encontró lo que buscaba? Escriba al administrador de la app. · Ayuda v' + esc(A().version || '') + '</p>' +
      '</article>';
  }

  // =====================================================================
  // PANEL LATERAL (botón «? Ayuda»)
  // =====================================================================
  let panel = null, pila = [];
  function abrir(id) {
    if (!panel) crearPanel();
    pila = [];
    document.body.classList.add('ic-ay-abierta');
    panel.hidden = false; requestAnimationFrame(() => panel.classList.add('visible'));
    mostrarInicio(id || idDeContexto());
    // Si el navegador tiene una hoja de estilos vieja (sin los estilos de la ayuda), se avisa en vez de mostrarla desarmada
    if (getComputedStyle(panel).position !== 'fixed') {
      panel.hidden = true; document.body.classList.remove('ic-ay-abierta');
      U.aviso('La ayuda necesita la versión nueva de los estilos (shared/css/ic.css). Recargue con Ctrl + F5; si sigue igual, ese archivo no se actualizó en GitHub.', 'warn', 10000);
      return;
    }
    setTimeout(() => { const i = panel.querySelector('#ayQ'); if (i && window.innerWidth > 760) i.focus(); }, 60);
  }
  function cerrar() {
    if (!panel || panel.hidden) return;
    panel.classList.remove('visible'); document.body.classList.remove('ic-ay-abierta');
    setTimeout(() => { panel.hidden = true; }, 200);
  }
  function crearPanel() {
    panel = document.createElement('div');
    panel.className = 'ic-ay-fondo'; panel.hidden = true;
    panel.innerHTML = '<aside class="ic-ay-panel" role="dialog" aria-label="Ayuda">' +
      '<div class="ic-ay-cab"><button class="ic-ay-atras" id="ayAtras" aria-label="Atrás" hidden>←</button><h2>' + ICO + ' Ayuda</h2><button class="ic-ay-x" id="ayX" aria-label="Cerrar ayuda">×</button></div>' +
      '<div class="ic-ay-buscar">' + ICO_BUSCAR + '<input id="ayQ" type="search" placeholder="¿Qué necesita hacer?" autocomplete="off"></div>' +
      '<div class="ic-ay-contenido" id="ayCont"></div>' +
      '<div class="ic-ay-pie-panel"><a href="#ayuda" target="_blank" rel="noopener" id="ayTodo">Ver toda la ayuda ↗</a></div>' +
      '</aside>';
    document.body.appendChild(panel);
    panel.addEventListener('mousedown', (e) => { if (e.target === panel) cerrar(); });
    panel.querySelector('#ayX').onclick = cerrar;
    panel.querySelector('#ayAtras').onclick = () => { const prev = pila.pop(); if (prev) prev(true); };
    panel.querySelector('#ayQ').oninput = (e) => { const q = e.target.value.trim(); if (q) mostrarBusqueda(q); else mostrarInicio(idDeContexto(), true); };
    // Los enlaces a otros artículos se abren dentro del panel (no se sale de la pantalla actual)
    panel.querySelector('#ayCont').addEventListener('click', (e) => {
      const a = e.target.closest('a[data-art], a[href^="#ayuda/"]'); if (!a) return;
      e.preventDefault(); mostrarArticulo(a.dataset.art || a.getAttribute('href').split('/')[1]);
    });
  }
  function poner(html, conAtras) {
    const c = panel.querySelector('#ayCont'); c.innerHTML = html; c.scrollTop = 0;
    panel.querySelector('#ayAtras').hidden = !conAtras;
  }
  function mostrarInicio(idCtx, sinPila) {
    if (!sinPila) pila = [];
    const ctx = porId(idCtx);
    const dest = (A().DESTACADOS || []).map(porId).filter((a) => puedeVer(a) && a.id !== idCtx);
    poner(
      (ctx && puedeVer(ctx) ? '<div class="ic-ay-sec">En esta pantalla</div>' + htmlArticulo(ctx, false) : '') +
      '<div class="ic-ay-sec">Lo más consultado</div><div class="ic-ay-lista">' + dest.map((a) => itemLista(a)).join('') + '</div>' +
      '<div class="ic-ay-sec">Temas</div><div class="ic-ay-temas">' + A().CATEGORIAS.filter((c) => articulos().some((a) => a.cat === c[0]))
        .map((c) => '<button data-cat="' + c[0] + '">' + esc(c[1]) + ' <span>' + articulos().filter((a) => a.cat === c[0]).length + '</span></button>').join('') + '</div>', false);
    panel.querySelectorAll('[data-cat]').forEach((b) => { b.onclick = () => mostrarCategoria(b.dataset.cat); });
  }
  function mostrarCategoria(cat) {
    pila.push(() => mostrarInicio(idDeContexto(), true));
    poner('<div class="ic-ay-sec">' + esc(nombreCat(cat)) + '</div><div class="ic-ay-lista">' + articulos().filter((a) => a.cat === cat).map((a) => itemLista(a)).join('') + '</div>', true);
  }
  function mostrarBusqueda(q) {
    const r = buscar(q);
    pila = [];
    poner('<div class="ic-ay-sec">' + (r.length ? r.length + ' resultado' + (r.length === 1 ? '' : 's') : 'Sin resultados') + '</div>' +
      (r.length ? '<div class="ic-ay-lista">' + r.map((a) => itemLista(a, q)).join('') + '</div>'
        : '<p class="ic-ay-nada">No encontramos «' + esc(q) + '». Pruebe con otras palabras, por ejemplo: <i>precio</i>, <i>perdida</i>, <i>revisión</i>, <i>dólares</i>.</p>'), false);
  }
  function mostrarArticulo(id) {
    const a = porId(id);
    if (!puedeVer(a)) return;
    const q = panel.querySelector('#ayQ').value.trim();
    const actual = panel.querySelector('#ayCont').innerHTML;
    pila.push((volver) => { if (q) mostrarBusqueda(q); else poner(actual, pila.length > 0); reengancharTemas(); });
    poner(htmlArticulo(a, false), true);
  }
  function reengancharTemas() { panel.querySelectorAll('[data-cat]').forEach((b) => { b.onclick = () => mostrarCategoria(b.dataset.cat); }); }

  // Teclado: F1 abre la ayuda, Esc la cierra
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F1') { e.preventDefault(); if (App.usuario) abrir(); }
    else if (e.key === 'Escape' && panel && !panel.hidden && !document.getElementById('ic-modal')) cerrar();
  });
  window.addEventListener('hashchange', cerrar);

  // =====================================================================
  // CENTRO DE AYUDA (página completa: #ayuda y #ayuda/<id>)
  // =====================================================================
  let qPagina = '';
  App.vistas['ayuda'] = function (c) {
    const partes = (location.hash || '').replace(/^#/, '').split('/');
    const id = partes[1] || 'ayuda';
    const a = porId(id);
    const navCats = A().CATEGORIAS.map((cat) => { const xs = articulos().filter((x) => x.cat === cat[0]); if (!xs.length) return '';
      return '<div class="ic-ayp-cat"><h4>' + esc(cat[1]) + '</h4>' + xs.map((x) => '<a href="#ayuda/' + x.id + '"' + (x.id === id ? ' class="activo"' : '') + '>' + esc(x.titulo) + '</a>').join('') + '</div>'; }).join('');
    c.innerHTML = '<a href="#" class="ic-volver">← Menú principal</a>' +
      '<div class="ic-ayp-cab"><h1 class="ic-titulo">' + ICO.replace('width="18" height="18"', 'width="26" height="26"') + ' Centro de ayuda</h1>' +
        '<div class="ic-ay-buscar grande">' + ICO_BUSCAR + '<input id="aypQ" type="search" placeholder="Buscar en la ayuda: cambiar precio, perdida, revisión…" autocomplete="off" value="' + esc(qPagina) + '"></div></div>' +
      '<div class="ic-ayp">' +
        '<nav class="ic-ayp-nav"><details open><summary>Temas</summary>' + navCats + '</details></nav>' +
        '<div class="ic-ayp-main" id="aypMain"></div>' +
      '</div>';
    const main = U.$('#aypMain', c);
    const pintarArt = () => { main.innerHTML = puedeVer(a) ? htmlArticulo(a, true) : '<div class="ic-form">Este artículo es solo para administradores o no existe. <a href="#ayuda">Volver a la ayuda</a>.</div>'; };
    const pintarBusq = (q) => { const r = buscar(q);
      main.innerHTML = '<div class="ic-ay-sec">' + (r.length ? r.length + ' resultado' + (r.length === 1 ? '' : 's') + ' para «' + esc(q) + '»' : 'Sin resultados para «' + esc(q) + '»') + '</div>' +
        (r.length ? '<div class="ic-ay-lista">' + r.map((x) => itemLista(x, q)).join('') + '</div>' : '<p class="ic-ay-nada">Pruebe con otras palabras.</p>'); };
    U.$('#aypQ', c).oninput = (e) => { qPagina = e.target.value.trim(); if (qPagina) pintarBusq(qPagina); else pintarArt(); };
    if (qPagina && !partes[1]) pintarBusq(qPagina); else { qPagina = ''; U.$('#aypQ', c).value = ''; pintarArt(); }
    if (window.innerWidth <= 900) { const d = c.querySelector('.ic-ayp-nav details'); if (d && partes[1]) d.open = false; }
  };

  // Botón del encabezado (lo usa app.js)
  const boton = () => '<button class="ic-btn sec ic-btn-ayuda" id="btnAyuda" title="Ayuda (F1)">' + ICO + '<span>Ayuda</span></button>';
  App.ayuda = { abrir, cerrar, buscar, idDeContexto, boton };
})();
