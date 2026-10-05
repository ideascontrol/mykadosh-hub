/* Gestión Documental · Ideas Control — lógica compartida (vanilla JS) */
(function () {
  const C = window.GD_CATALOGO;
  const B = window.GD_BASE || '';   // prefijo de ruta para páginas en subcarpetas (documentos/)
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const TIPOS = { MAN: 'Manual', FOR: 'Formato', INS: 'Instructivo', DIA: 'Diagrama', GUI: 'Guía', FIC: 'Ficha técnica', POL: 'Política', PRO: 'Procedimiento', CAT: 'Catálogo', ACU: 'Acuerdo de servicio' };

  const ICONOS = {
    comercial: '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
    gerencia: '<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/><path d="M9 12l2 2 4-4"/>',
    operativa: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
    financiera: '<rect x="2" y="6" width="20" height="13" rx="2"/><circle cx="12" cy="12.5" r="2.5"/><path d="M6 10v5M18 10v5"/>',
    inventario: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    talento: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14.5c2.4.2 4 1.8 4.5 4.5"/>',
    tecnologia: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    buscar: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    leer: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    bajar: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 21h16"/>',
    abrir: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h5"/>',
    volver: '<path d="M15 18l-6-6 6-6"/>',
    ruta: '<circle cx="6" cy="5" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.5 5H15a3.5 3.5 0 010 7H9a3.5 3.5 0 000 7h6.5"/>',
    carpeta: '<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M3 11h18"/>',
    generar: '<path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6M12 12v6M9 15h6"/>',
    evaluar: '<path d="M9 11l2 2 4-4"/><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 17h8"/>',
    movil: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10 18.5h4M9.5 8.5l2 2 3.5-3.5"/>'
  };
  const ico = (n, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS[n]}</svg>`;

  /* ---------- Índice plano de documentos ---------- */
  function todosLosDocs() {
    const out = [];
    C.areas.forEach(a => a.grupos.forEach(g => g.docs.forEach(d => out.push({ ...d, area: a, grupo: g }))));
    return out;
  }
  const publicados = () => todosLosDocs().filter(d => d.estado === 'publicado');
  const buscarPorCodigo = cod => todosLosDocs().find(d => d.codigo === cod);

  function buscar(q, lista) {
    const t = norm(q).split(/\s+/).filter(Boolean);
    if (!t.length) return [];
    return lista.map(d => {
      const campos = [d.codigo, d.titulo, d.resumen, TIPOS[d.tipo], d.area.nombre, d.grupo.nombre, ...(d.temas || [])];
      const heno = norm(campos.join(' · '));
      if (!t.every(x => heno.includes(x))) return null;
      let score = 0;
      t.forEach(x => {
        if (norm(d.codigo).includes(x)) score += 8;
        if (norm(d.titulo).includes(x)) score += 5;
        if (norm(d.grupo.nombre).includes(x)) score += 2;
      });
      if (d.estado === 'publicado') score += 3;
      const temas = (d.temas || []).filter(h => t.some(x => norm(h).includes(x))).slice(0, 4);
      return { d, score, temas };
    }).filter(Boolean).sort((a, b) => b.score - a.score);
  }

  function resaltar(texto, q) {
    const t = norm(q).split(/\s+/).filter(x => x.length > 1);
    if (!t.length) return esc(texto);
    const n = norm(texto); const marcas = new Array(texto.length).fill(false);
    t.forEach(x => { let i = n.indexOf(x); while (i > -1) { for (let k = i; k < i + x.length; k++) marcas[k] = true; i = n.indexOf(x, i + 1); } });
    let out = '', on = false;
    for (let i = 0; i < texto.length; i++) {
      if (marcas[i] && !on) { out += '<mark>'; on = true; }
      if (!marcas[i] && on) { out += '</mark>'; on = false; }
      out += esc(texto[i]);
    }
    return out + (on ? '</mark>' : '');
  }

  /* ---------- Piezas comunes ---------- */
  function encabezado(usuario, subtitulo) {
    const ini = (usuario?.nombre || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
    return `<header class="top"><div class="wrap">
      <a class="logo" href="${B}index.html" aria-label="Inicio"><img src="${B}assets/img/ideascontrol.webp" alt="Ideas Control Equipos y Soluciones S.A.S."></a>
      <div class="sistema"><b>Gestión Documental</b><span>${esc(subtitulo || 'Sistema de documentación interna')}</span></div>
      <div class="usuario"><span>${esc(usuario?.nombre || '')}</span><i>${esc(ini)}</i><button type="button" class="salir" onclick="GDAuth.cerrarSesion()" title="Cerrar sesión">Salir</button></div>
    </div></header>`;
  }
  function pie() {
    return `<footer class="pie-sitio"><div class="wrap">
      <span>${esc(C.empresa)} · Uso interno · Personal autorizado</span>
      <span>Catálogo actualizado: ${esc(C.actualizado)}</span></div></footer>`;
  }
  const chipEstado = d => d.estado === 'publicado' ? '<span class="chip ok">Vigente</span>'
    : d.estado === 'por-cargar' ? '<span class="chip pend">Aprobado · por cargar</span>'
    : '<span class="chip plan">En elaboración</span>';
  const urlVisor = d => B + d.html;
  const nombreDescarga = d => (d.plantilla || '').split('/').pop();
  // Plantillas de trabajo: solo formatos (FOR) y fichas (FIC) con "plantilla" habilitada en el catálogo
  const btnPlantilla = (d, cls = 'sec') => !['FOR', 'FIC'].includes(d.tipo) ? ''
    : d.plantilla && d.generador ? `<a class="btn ${cls}" href="${B}generador.html?f=${encodeURIComponent(d.codigo)}">${ico('bajar', 16)}Generar documento de trabajo</a>`
      + `<a class="btn enlace" href="${B}${d.plantilla}" download="${esc(nombreDescarga(d))}" title="Descargar la plantilla sin diligenciar">En blanco</a>`
    : d.plantilla ? `<a class="btn ${cls}" href="${B}${d.plantilla}" download="${esc(nombreDescarga(d))}">${ico('bajar', 16)}Descargar plantilla de trabajo</a>`
    : d.plantillaDefinitiva ? `<span class="btn off" title="Plantilla de trabajo definitiva; la descarga se habilitará próximamente">${ico('bajar', 16)}Plantilla de trabajo · próximamente</span>`
    : '';

  function montarBuscador(input, fn) {
    let t; input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => fn(input.value), 120); });
    document.addEventListener('keydown', e => {
      if (e.key === '/' && document.activeElement !== input) { e.preventDefault(); input.focus(); }
      if (e.key === 'Escape' && document.activeElement === input) { input.value = ''; fn(''); }
    });
  }

  const tarjetasHerr = lista => lista.map(h => `<a class="tool" href="${B}${h.pagina}"><span class="tool-ico">${ico(h.icono, 20)}</span>
      <span><b>${esc(h.titulo)}</b><small>${esc(h.resumen)}</small></span></a>`).join('');

  /* ---------- Portal principal ---------- */
  function iniciarPortal() {
    const u = GDAuth.proteger(); if (!u) return;
    document.body.insertAdjacentHTML('afterbegin', encabezado(u));
    const pubs = publicados();
    const forms = pubs.filter(d => d.plantilla).length;
    const main = $('main');
    main.innerHTML = `<div class="wrap">
      <section class="hero">
        <div class="eyebrow">Sistema de Gestión Documental</div>
        <h1>Manuales, procedimientos y formatos de Ideas Control</h1>
        <p>Consulte la documentación vigente de cada proceso, lea los manuales en línea y descargue las plantillas de los formatos para diligenciar.</p>
        <div class="buscador">${ico('buscar')}<input id="q" type="search" placeholder="Buscar por código, título o tema (p. ej. firmware, 2400, checklist)…" autocomplete="off" aria-label="Buscar documentos"><kbd>/</kbd></div>
        <div class="metricas"><div><b>${pubs.length}</b>documentos vigentes</div><div><b>${forms}</b>plantillas descargables</div><div><b>${C.areas.filter(a => a.pagina).length}/${C.areas.length}</b>áreas publicadas</div></div>
        <div class="resultados" id="res"></div>
      </section>
      ${C.areas.some(a => a.herramientas) ? `<div class="seccion-t">Herramientas de consulta</div>
      <section class="tools">${tarjetasHerr(C.areas.flatMap(a => a.herramientas || []))}</section>` : ''}
      <div class="seccion-t">Áreas de gestión</div>
      <section class="areas">${C.areas.map(tarjetaArea).join('')}</section>
    </div>`;
    const res = $('#res');
    montarBuscador($('#q'), q => {
      if (!q.trim()) { res.classList.remove('on'); res.innerHTML = ''; return; }
      const r = buscar(q, todosLosDocs().filter(d => d.estado !== 'planeado'));
      res.classList.add('on');
      res.innerHTML = `<div class="cab">${r.length} resultado${r.length === 1 ? '' : 's'} para “${esc(q)}”</div>` +
        (r.length ? r.map(x => filaResultado(x, q)).join('') : '<div class="vacio">No encontramos documentos con ese criterio. Pruebe con otra palabra o con el código.</div>');
    });
  }

  function tarjetaArea(a) {
    const docs = a.grupos.flatMap(g => g.docs);
    const vig = docs.filter(d => d.estado === 'publicado').length;
    const activa = !!a.pagina && GDAuth.puedeVerArea(a.id);
    const inner = `<div class="ico">${ico(a.icono, 22)}</div>
      <h3>${esc(a.nombre)}</h3><p>${esc(a.descripcion)}</p>
      <div class="pie">${activa ? `<span class="chip ok">${vig} vigente${vig === 1 ? '' : 's'}</span><span class="ir">Entrar →</span>`
        : `<span class="chip plan">En construcción</span><span>${a.grupos.length} proceso${a.grupos.length === 1 ? '' : 's'}</span>`}</div>`;
    return activa ? `<a class="area activa" href="${a.pagina}">${inner}</a>` : `<div class="area inactiva" aria-disabled="true">${inner}</div>`;
  }

  function filaResultado({ d, temas }, q) {
    const inner = `<span class="tipo ${d.tipo}">${TIPOS[d.tipo] || ''}</span>
      <div style="flex:1;min-width:0"><div class="cod">${d.codigoProvisional ? 'Código por confirmar' : resaltar(d.codigo, q)}</div>
      <h4>${resaltar(d.titulo, q)}</h4>
      <div class="ruta">${esc(d.area.nombre)} › ${esc(d.grupo.nombre)}</div>
      ${temas.length ? `<div class="coinc">En el contenido: ${temas.map(h => resaltar(h, q)).join(' · ')}</div>` : ''}</div>
      ${chipEstado(d)}`;
    return d.estado === 'publicado' ? `<a class="res" href="${urlVisor(d)}">${inner}</a>` : `<div class="res">${inner}</div>`;
  }

  /* ---------- Página de área ---------- */
  function iniciarArea() {
    const u = GDAuth.proteger(); if (!u) return;
    const area = C.areas.find(a => a.id === document.body.dataset.area);
    if (!area || !GDAuth.puedeVerArea(area.id)) { location.href = 'index.html'; return; }
    document.title = `${area.nombre} · Gestión Documental · Ideas Control`;
    document.body.insertAdjacentHTML('afterbegin', encabezado(u, area.nombre));
    const docsArea = area.grupos.flatMap(g => g.docs.map(d => ({ ...d, area, grupo: g })));
    const main = $('main');
    main.innerHTML = `<div class="wrap">
      <nav class="migas"><a href="index.html">Inicio</a><span>›</span>${esc(area.nombre)}</nav>
      <section class="hero" style="padding-top:18px">
        <div class="eyebrow">${area.serie ? 'Serie ' + esc(area.serie) : 'Área de gestión'}</div>
        <h1>${esc(area.nombre)}</h1><p>${esc(area.descripcion)}</p>
      </section>
      ${area.herramientas ? `<div class="seccion-t" style="margin-top:22px">Herramientas de consulta</div><section class="tools">${tarjetasHerr(area.herramientas)}</section>` : ''}
      <div class="area-layout">
        <nav class="lateral" aria-label="Procesos"><div class="tit">Procesos</div>
          ${area.grupos.map(g => `<a href="#${g.id}" data-g="${g.id}">${g.serie ? `<b class="serie-m">${esc(g.serie)}</b>` : ''}<span class="g-n">${esc(g.nombre)}</span><em>${g.docs.filter(d => d.estado === 'publicado').length || ''}</em></a>`).join('')}
        </nav>
        <div>
          <div class="herr">
            <div class="buscador">${ico('buscar', 18)}<input id="q" type="search" placeholder="Filtrar documentos de esta área…" autocomplete="off" aria-label="Filtrar"></div>
            <div class="filtros" role="group" aria-label="Tipo de documento">
              <button class="on" data-t="">Todos</button><button data-t="MAN">Manuales</button><button data-t="PRO">Procedimientos</button><button data-t="FOR">Formatos</button><button data-t="INS">Instructivos</button><button data-t="DIA">Diagramas</button><button data-t="GUI">Guías</button><button data-t="FIC">Fichas</button><button data-t="POL">Políticas</button><button data-t="CAT">Catálogos</button><button data-t="ACU">Acuerdos</button>
            </div>
          </div>
          <div id="lista"></div>
        </div>
      </div></div>`;

    let tipo = '', q = '';
    const pintar = () => {
      const coinc = q.trim() ? new Set(buscar(q, docsArea).map(r => r.d.codigo)) : null;
      const html = area.grupos.map(g => {
        const docs = g.docs.filter(d => (!tipo || d.tipo === tipo) && (!coinc || coinc.has(d.codigo))).slice()
          .sort((x, y) => (x.estado !== 'publicado') - (y.estado !== 'publicado') || (x.codigo || '').localeCompare(y.codigo || ''));
        if ((tipo || coinc) && !docs.length) return '';
        const tipoGen = g.actividad ? `?t=${encodeURIComponent(g.actividad)}` : '';
        const accG = (g.formularioMovil ? `<a class="btn sec" href="${g.formularioMovil}">${ico('movil', 16)}Diligenciar en el celular</a>` : '')
          + (g.docs.some(d => d.generador && d.plantilla) ? `<a class="btn pri" href="generador.html${tipoGen}">${ico('bajar', 16)}Generar documentos de trabajo</a>` : '');
        const gen = accG ? `<div class="gen-btn">${accG}</div>` : '';
        return `<section class="grupo" id="${g.id}"><header>${g.serie ? `<span class="serie">${esc(g.serie)}</span>` : ''}<h2>${esc(g.nombre)}</h2>${gen}${g.descripcion ? `<p>${esc(g.descripcion)}</p>` : ''}</header>
          ${docs.length ? `<div class="docs">${docs.map(d => tarjetaDoc({ ...d, area, grupo: g }, q)).join('')}</div>`
            : '<div class="grupo-vacio">Proceso en documentación. Los documentos aparecerán aquí una vez aprobados.</div>'}</section>`;
      }).join('');
      $('#lista').innerHTML = html || '<div class="vacio">Ningún documento coincide con el filtro.</div>';
    };
    montarBuscador($('#q'), v => { q = v; pintar(); });
    main.querySelectorAll('.filtros button').forEach(b => b.onclick = () => {
      main.querySelectorAll('.filtros button').forEach(x => x.classList.toggle('on', x === b)); tipo = b.dataset.t; pintar();
    });
    pintar();

    // Resaltar proceso activo en el menú lateral
    const links = [...main.querySelectorAll('.lateral a')];
    const obs = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) links.forEach(l => l.classList.toggle('on', l.dataset.g === e.target.id));
    }), { rootMargin: '-100px 0px -60% 0px' });
    const observar = () => main.querySelectorAll('.grupo').forEach(s => obs.observe(s));
    observar(); new MutationObserver(observar).observe($('#lista'), { childList: true });
  }

  function tarjetaDoc(d, q) {
    const pub = d.estado === 'publicado';
    const meta = [d.codigo && `<span class="cod">${d.codigoProvisional ? 'Código por confirmar' : resaltar(d.codigo, q)}</span>`, d.tipo && `<span class="tipo ${d.tipo}">${TIPOS[d.tipo]}</span>`,
      d.version && `<span>v${esc(d.version)}</span>`, d.paginas && `<span>${d.paginas} págs.</span>`, chipEstado(d),
      d.plantillaDefinitiva && '<span class="chip plt" title="Formato definido como plantilla de trabajo">Plantilla definitiva</span>'].filter(Boolean).join('');
    const acc = pub ? `<a class="btn pri" href="${urlVisor(d)}">${ico('leer', 16)}${d.tipo === 'FOR' ? 'Ver' : 'Leer'}</a>` +
      btnPlantilla(d) : '';
    return `<article class="doc ${pub ? '' : 'pendiente'}"><div>
        <div class="meta">${meta}</div>
        <h3>${resaltar(d.titulo, q)}</h3>${d.resumen ? `<p>${esc(d.resumen)}</p>` : ''}
      </div><div class="acc">${acc}</div></article>`;
  }

  /* ---------- Documento HTML de lectura (documentos/*.html) ---------- */
  function iniciarDocumento() {
    const u = GDAuth.proteger(); if (!u) return;
    const d = buscarPorCodigo(document.body.dataset.doc);
    if (!d || d.estado !== 'publicado' || !GDAuth.puedeVerArea(d.area.id)) { location.href = B + 'index.html'; return; }
    document.body.insertAdjacentHTML('afterbegin', encabezado(u, d.area.nombre));
    $('#acciones')?.insertAdjacentHTML('beforeend', btnPlantilla(d));

    // Anterior / siguiente dentro del mismo proceso
    const hermanos = d.grupo.docs.filter(x => x.estado === 'publicado' && x.html).slice().sort((x, y) => x.codigo.localeCompare(y.codigo));
    const k = hermanos.findIndex(x => x.codigo === d.codigo);
    const ant = hermanos[k - 1], sig = hermanos[k + 1];
    const nav = $('#dh-nav');
    if (nav && (ant || sig)) nav.innerHTML =
      (ant ? `<a href="${B}${ant.html}"><small>← Anterior</small>${esc(ant.codigo)} · ${esc(ant.titulo)}</a>` : '') +
      (sig ? `<a class="sig" href="${B}${sig.html}"><small>Siguiente →</small>${esc(sig.codigo)} · ${esc(sig.titulo)}</a>` : '') +
      (!ant || !sig ? `<a ${ant ? 'class="sig"' : ''} href="${B}${d.area.pagina}#${d.grupo.id}"><small>Proceso</small>Volver a ${esc(d.grupo.nombre)}</a>` : '');

    // Índice lateral con seguimiento de lectura
    const links = [...document.querySelectorAll('.dh-toc a')];
    const mapa = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
    let activo;
    const obs = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const a = mapa.get(e.target.id); if (!a || a === activo) return;
      activo?.classList.remove('on'); a.classList.add('on'); activo = a;
      const toc = $('.dh-toc'); const r = a.getBoundingClientRect(), t = toc.getBoundingClientRect();
      if (r.top < t.top || r.bottom > t.bottom) toc.scrollTop += r.top - t.top - t.height / 2;
    }), { rootMargin: '-90px 0px -70% 0px' });
    document.querySelectorAll('.dh-article [id]').forEach(h => obs.observe(h));
    document.querySelectorAll('.dh-toc-movil a').forEach(a => a.addEventListener('click', () => a.closest('details').open = false));

    const arriba = $('#arriba');
    addEventListener('scroll', () => arriba.classList.toggle('on', scrollY > 600), { passive: true });
    arriba.onclick = () => scrollTo({ top: 0, behavior: 'smooth' });

    // Ampliar diagramas / imágenes
    const zoom = $('#zoom');
    document.querySelectorAll('.dh-fig img').forEach(img => img.onclick = () => { zoom.firstElementChild.src = img.src; zoom.hidden = false; });
    zoom.onclick = () => { zoom.hidden = true; };
    document.addEventListener('keydown', e => { if (e.key === 'Escape') zoom.hidden = true; });

    // Solo lectura en línea: sin menú contextual, sin imprimir ni guardar, sin arrastrar imágenes
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('dragstart', e => { if (e.target.tagName === 'IMG') e.preventDefault(); });
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && ['p', 's'].includes(e.key.toLowerCase())) e.preventDefault();
    });
  }

  window.GD = { iniciarPortal, iniciarArea, iniciarDocumento, encabezadoSimple: (u, sub) => document.body.insertAdjacentHTML('afterbegin', encabezado(u, sub || 'Gestión Operativa')) };
  document.body.insertAdjacentHTML('beforeend', pie());
})();
