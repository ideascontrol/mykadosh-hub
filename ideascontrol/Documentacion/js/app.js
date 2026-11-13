/* =====================================================================
   APP-105 · Gestión documental — portal de consulta sobre SharePoint
   Vistas: #/ (inicio) · #/area/<id> · #/doc/<código>
   Datos: biblioteca 00_Documentacion_Maestra (sitio Ideas Control), con
   sus columnas Codigo, Tipo_documento, Grupo, Version_doc, Resumen, Formato…
   Cada persona ve lo que SharePoint le permite ver con su cuenta.
   ===================================================================== */
(function () {
  const G = IC.graph;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const clave = (s) => norm(s).replace(/[^a-z0-9]/g, '');
  const TIPOS = { MAN: 'Manual', FOR: 'Formato', INS: 'Instructivo', DIA: 'Diagrama', GUI: 'Guía', FIC: 'Ficha técnica', POL: 'Política', PRO: 'Procedimiento', CAT: 'Catálogo', ACU: 'Acuerdo de servicio', REG: 'Registro', MAT: 'Matriz' };
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
    ruta: '<circle cx="6" cy="5" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.5 5H15a3.5 3.5 0 010 7H9a3.5 3.5 0 000 7h6.5"/>',
    carpeta: '<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M3 11h18"/>',
    generar: '<path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6M12 12v6M9 15h6"/>',
    evaluar: '<path d="M9 11l2 2 4-4"/><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 17h8"/>',
    mapa: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
    movil: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10 18.5h4M9.5 8.5l2 2 3.5-3.5"/>'
  };
  const ico = (n, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS[n] || ''}</svg>`;

  let usuario = null, DOCS = [], driveId = null, actualizado = '', CTX = {};
  const areas = CFG.areas;

  // ---------- Datos desde SharePoint ----------
  async function cargar() {
    const s = await G.llamar('GET', '/sites/' + CFG.docs.host + ':' + CFG.docs.ruta + '?$select=id');
    const objetivo = clave(CFG.docs.biblioteca);
    const drives = await G.todas('/sites/' + s.id + '/drives?$select=id,name,webUrl');
    const d = drives.find((x) => clave(x.name) === objetivo || clave(decodeURIComponent(String(x.webUrl || '').split('/').pop())) === objetivo);
    if (!d) { const e = new Error('No se encontró la biblioteca ' + CFG.docs.biblioteca); e.status = 404; throw e; }
    driveId = d.id;
    const lista = await G.llamar('GET', '/drives/' + d.id + '/list?$select=id');
    // Nombres internos reales de las columnas (por si alguna ya existía con otro nombre, p. ej. «Área»)
    const cols = await G.todas('/sites/' + s.id + '/lists/' + lista.id + '/columns?$select=name,displayName,readOnly,hidden');
    const propias = cols.filter((k) => !k.readOnly && !k.hidden && ['DocIcon', 'FileLeafRef', 'LinkFilename', 'ContentType'].indexOf(k.name) < 0);
    const real = {};
    ['Codigo', 'Tipo_documento', 'Area', 'Grupo', 'Version_doc', 'Emision', 'Ultima_revision', 'Responsable', 'Resumen', 'Formato', 'Estado_documento'].forEach((n) => {
      const x = cols.find((k) => k.name === n) || propias.find((k) => clave(k.displayName) === clave(n)); real[n] = x ? x.name : n;
    });
    CTX = { siteId: s.id, listaId: lista.id, real, carpetas: {} };
    const items = await G.todas('/sites/' + s.id + '/lists/' + lista.id + '/items?$expand=fields,driveItem($select=id,name,webUrl,size,file,folder,lastModifiedDateTime,parentReference)&$top=500');
    const porCodigo = {};
    let ultima = '';
    items.forEach((it) => {
      const f = it.fields || {}, di = it.driveItem || {};
      const padre = String((di.parentReference || {}).path || '').replace(/^.*?root:\/?/, '');
      if (di.folder) { CTX.carpetas[(padre ? padre + '/' : '') + di.name] = CTX.carpetas[(padre ? padre + '/' : '') + di.name] || []; return; }
      if (!di.file) return;                                     // carpetas
      const v = (n) => f[real[n]] ?? f[n] ?? '';
      const nombre = di.name || f.FileLeafRef || '';
      const codigo = String(v('Codigo') || (nombre.match(/^\d{4}-[A-Z]{3}-[A-Z]{3}/) || [''])[0]).trim();
      if (!codigo) return;
      if (/obsolet/i.test(v('Estado_documento'))) return;
      const esWord = /\.(docx?|xlsx?|xlsm)$/i.test(nombre) || /plantilla/i.test(v('Formato'));   // plantillas Word o Excel
      const doc = porCodigo[codigo] || (porCodigo[codigo] = { codigo });
      const dato = { id: di.id, nombre, webUrl: di.webUrl, size: di.size, carpeta: decodeURIComponent(padre), itemId: it.id };
      (CTX.carpetas[decodeURIComponent(padre)] = CTX.carpetas[decodeURIComponent(padre)] || []).push(codigo);
      if (esWord) doc.plantilla = dato; else doc.pdf = dato;
      if (!esWord || !doc.titulo) {
        Object.assign(doc, {
          titulo: f.Title || nombre.replace(/^\d{4}-[A-Z]{3}-[A-Z]{3}\s*-\s*/, '').replace(/\.\w+$/, ''),
          tipo: String(v('Tipo_documento') || codigo.split('-')[1] || '').toUpperCase(), version: v('Version_doc'), emision: v('Emision'),
          revision: v('Ultima_revision'), responsable: v('Responsable'), resumen: v('Resumen'), grupoNombre: v('Grupo'), areaNombre: v('Area')
        });
      }
      if ((di.lastModifiedDateTime || '') > ultima) ultima = di.lastModifiedDateTime;
    });
    DOCS = Object.values(porCodigo).filter((x) => x.pdf || x.plantilla).map((x) => Object.assign(x, ubicar(x))).sort((a, b) => a.codigo.localeCompare(b.codigo));
    actualizado = ultima ? new Date(ultima).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }).replace(/^./, (c) => c.toUpperCase()) : '';
  }
  // Área por el primer dígito del código (o por la columna Área); proceso por la serie (2 primeros dígitos) o por la columna Grupo
  function ubicar(d) {
    const area = areas.find((a) => a.bloque === d.codigo[0]) || areas.find((a) => clave(a.nombre) === clave(d.areaNombre)) || areas[0];
    const grupo = area.grupos.find((g) => g.serie && g.serie.slice(0, 2) === d.codigo.slice(0, 2)) || area.grupos.find((g) => clave(g.nombre) === clave(d.grupoNombre)) || area.grupos[area.grupos.length - 1];
    return { area, grupo };
  }
  const docsDe = (area, grupo) => DOCS.filter((d) => d.area === area && (!grupo || d.grupo === grupo));

  // ---------- Búsqueda ----------
  function buscar(q, lista) {
    const t = norm(q).split(/\s+/).filter(Boolean);
    if (!t.length) return [];
    return lista.map((d) => {
      const heno = norm([d.codigo, d.titulo, d.resumen, TIPOS[d.tipo], d.area.nombre, d.grupo.nombre, d.responsable].join(' · '));
      if (!t.every((x) => heno.includes(x))) return null;
      let score = 0;
      t.forEach((x) => { if (norm(d.codigo).includes(x)) score += 8; if (norm(d.titulo).includes(x)) score += 5; if (norm(d.grupo.nombre).includes(x)) score += 2; });
      return { d, score };
    }).filter(Boolean).sort((a, b) => b.score - a.score);
  }
  function resaltar(texto, q) {
    texto = String(texto || '');
    const t = norm(q).split(/\s+/).filter((x) => x.length > 1);
    if (!t.length) return esc(texto);
    const n = norm(texto), marcas = new Array(texto.length).fill(false);
    t.forEach((x) => { let i = n.indexOf(x); while (i > -1) { for (let k = i; k < i + x.length; k++) marcas[k] = true; i = n.indexOf(x, i + 1); } });
    let out = '', on = false;
    for (let i = 0; i < texto.length; i++) {
      if (marcas[i] && !on) { out += '<mark>'; on = true; }
      if (!marcas[i] && on) { out += '</mark>'; on = false; }
      out += esc(texto[i]);
    }
    return out + (on ? '</mark>' : '');
  }

  // ---------- Piezas comunes ----------
  function encabezado(subtitulo) {
    const ini = { martinmolina: 'MEM', martineduardomolina: 'MEM' }[clave(usuario.nombre || '')] || ({ 'operaciones@ideascontrol.com': 'MEM' })[String(usuario.email || '').toLowerCase()] ||
      (usuario.nombre || '?').split(' ').filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
    let h = $('header.top');
    if (!h) { document.body.insertAdjacentHTML('afterbegin', '<header class="top"></header>'); h = $('header.top'); }
    h.innerHTML = `<div class="wrap">
      <a class="logo" href="#/" aria-label="Inicio"><img src="${CFG.logo}" alt="Ideas Control Equipos y Soluciones S.A.S."></a>
      <div class="sistema"><b>Gestión Documental</b><span>${esc(subtitulo || 'Sistema de documentación interna')}</span></div>
      <div class="usuario">${IC.portal.desdePortal() ? '<button type="button" class="salir" id="bPortal" title="Cerrar esta pestaña y volver al portal de microapps">← Portal</button>' : '<a class="salir" href="' + IC.portal.URL_PORTAL + '">← Portal</a>'}
        <span class="datos"><b>${esc(usuario.nombre)}</b><small>${(CFG.editores || []).indexOf(String(usuario.email || '').toLowerCase()) >= 0 ? 'Administrador' : 'Consulta'}</small></span><i title="${esc(usuario.email)}">${esc(ini)}</i><button type="button" class="salir" id="bSalir" title="Cerrar sesión">Salir</button></div></div>`;
    const bp = $('#bPortal'); if (bp) bp.onclick = () => IC.portal.volver();
    $('#bSalir').onclick = () => { try { localStorage.removeItem('ic_doc_m365'); } catch (e) { /* sin almacenamiento */ } IC.auth.salir(); };
  }
  function pie() {
    if ($('footer.pie-sitio')) return;
    document.body.insertAdjacentHTML('beforeend', `<footer class="pie-sitio"><div class="wrap"><span>${esc(CFG.empresa)} · Uso interno · Personal autorizado</span><span>${actualizado ? 'Última actualización: ' + esc(actualizado) : ''}</span></div></footer>`);
  }
  const chipVig = '<span class="chip ok">Vigente</span>';
  const urlDoc = (d) => '#/doc/' + encodeURIComponent(d.codigo);
  const tipoPlt = (d) => d.plantilla && /\.xls/i.test(d.plantilla.nombre) ? 'Excel' : 'Word';
  const btnPlantilla = (d, cls = 'sec') => d.plantilla ? `<button type="button" class="btn ${cls}" data-bajar="${esc(d.codigo)}" title="Descargar la plantilla en ${tipoPlt(d)} para diligenciar">${ico('bajar', 16)}Descargar plantilla de trabajo</button>` : '';
  function montarBuscador(input, fn) {
    let t; input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => fn(input.value), 120); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { input.value = ''; fn(''); } });
  }
  document.addEventListener('keydown', (e) => { const q = $('#q'); if (e.key === '/' && q && document.activeElement !== q && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); q.focus(); } });
  const tarjetasHerr = (lista) => lista.map((h) => `<a class="tool" href="${CFG.herramientasBase + h.pagina}"><span class="tool-ico">${ico(h.icono, 20)}</span>
      <span><b>${esc(h.titulo)}</b><small>${esc(h.resumen)}</small></span></a>`).join('');

  // ---------- Inicio ----------
  function vistaInicio(main) {
    encabezado();
    if (window.GD_PUB && GD_PUB.puede(usuario)) setTimeout(() => GD_PUB.boton(main), 0);
    document.title = 'Gestión Documental · Ideas Control';
    const forms = DOCS.filter((d) => d.plantilla).length, activas = areas.filter((a) => docsDe(a).length).length;
    const herr = areas.flatMap((a) => a.herramientas || []);
    main.innerHTML = `<div class="wrap">
      <section class="hero">
        <div class="eyebrow">Sistema de Gestión Documental</div>
        <h1>Manuales, procedimientos y formatos de Ideas Control</h1>
        <p>Consulte la documentación vigente de cada proceso, lea los manuales en línea y descargue las plantillas de los formatos para diligenciar.</p>
        <div class="buscador">${ico('buscar')}<input id="q" type="search" placeholder="Buscar por código, título o tema (p. ej. firmware, 2400, checklist)…" autocomplete="off" aria-label="Buscar documentos"><kbd>/</kbd></div>
        <div class="metricas"><div><b>${DOCS.length}</b>documentos vigentes</div><div><b>${forms}</b>plantillas descargables</div><div><b>${activas}/${areas.length}</b>áreas publicadas</div></div>
        <div class="resultados" id="res"></div>
      </section>
      ${herr.length ? `<div class="seccion-t">Herramientas de consulta</div><section class="tools">${tarjetasHerr(herr)}</section>` : ''}
      ${(CFG.infografias || []).length ? `<div class="seccion-t">Infografías de procesos</div><section class="tools">${tarjetasHerr(CFG.infografias.map((i) => Object.assign({}, i, { titulo: (i.serie ? i.serie + ' · ' : '') + i.titulo })))}</section>` : ''}
      <div class="seccion-t">Áreas de gestión</div>
      <section class="areas">${areas.map(tarjetaArea).join('')}</section>
    </div>`;
    const res = $('#res');
    montarBuscador($('#q'), (q) => {
      if (!q.trim()) { res.classList.remove('on'); res.innerHTML = ''; return; }
      const r = buscar(q, DOCS);
      res.classList.add('on');
      res.innerHTML = `<div class="cab">${r.length} resultado${r.length === 1 ? '' : 's'} para “${esc(q)}”</div>` +
        (r.length ? r.map(({ d }) => `<a class="res" href="${urlDoc(d)}"><span class="tipo ${esc(d.tipo)}">${esc(TIPOS[d.tipo] || d.tipo)}</span>
          <div style="flex:1;min-width:0"><div class="cod">${resaltar(d.codigo, q)}</div><h4>${resaltar(d.titulo, q)}</h4>
          <div class="ruta">${esc(d.area.nombre)} › ${esc(d.grupo.nombre)}</div></div>${chipVig}</a>`).join('')
          : '<div class="vacio">No encontramos documentos con ese criterio. Pruebe con otra palabra o con el código.</div>');
    });
  }
  function tarjetaArea(a) {
    const vig = docsDe(a).length;
    const inner = `<div class="ico">${ico(a.icono, 22)}</div><h3>${esc(a.nombre)}</h3><p>${esc(a.descripcion)}</p>
      <div class="pie">${vig ? `<span class="chip ok">${vig} vigente${vig === 1 ? '' : 's'}</span><span class="ir">Entrar →</span>`
        : `<span class="chip plan">En construcción</span><span>${a.grupos.length} proceso${a.grupos.length === 1 ? '' : 's'}</span>`}</div>`;
    return vig ? `<a class="area activa" href="#/area/${a.id}">${inner}</a>` : `<div class="area inactiva" aria-disabled="true">${inner}</div>`;
  }

  // ---------- Área ----------
  function vistaArea(main, id) {
    const area = areas.find((a) => a.id === id);
    if (!area || !docsDe(area).length) { location.hash = '#/'; return; }
    encabezado(area.nombre);
    document.title = area.nombre + ' · Gestión Documental · Ideas Control';
    main.innerHTML = `<div class="wrap">
      <nav class="migas"><a href="#/">Inicio</a><span>›</span>${esc(area.nombre)}</nav>
      <section class="hero" style="padding-top:18px"><div class="eyebrow">${area.serie ? 'Serie ' + esc(area.serie) : 'Área de gestión'}</div>
        <h1>${esc(area.nombre)}</h1><p>${esc(area.descripcion)}</p></section>
      ${area.herramientas ? `<div class="seccion-t" style="margin-top:22px">Herramientas de consulta</div><section class="tools">${tarjetasHerr(area.herramientas)}</section>` : ''}
      ${(CFG.infografias || []).some((i) => i.area === area.id) ? `<div class="seccion-t" style="margin-top:22px">Infografías de procesos</div><section class="tools">${tarjetasHerr(CFG.infografias.filter((i) => i.area === area.id).map((i) => Object.assign({}, i, { titulo: (i.serie ? i.serie + ' · ' : '') + i.titulo })))}</section>` : ''}
      <div class="area-layout">
        <nav class="lateral" aria-label="Procesos"><div class="tit">Procesos</div>
          ${area.grupos.map((g) => `<a href="#/area/${area.id}" data-ir="${g.id}" data-g="${g.id}">${g.serie ? `<b class="serie-m">${esc(g.serie)}</b>` : ''}<span class="g-n">${esc(g.nombre)}</span><em>${docsDe(area, g).length || ''}</em></a>`).join('')}
        </nav>
        <div>
          <div class="herr">
            <div class="buscador">${ico('buscar', 18)}<input id="q" type="search" placeholder="Filtrar documentos de esta área…" autocomplete="off" aria-label="Filtrar"></div>
            <div class="filtros" role="group" aria-label="Tipo de documento"><button class="on" data-t="">Todos</button>
              ${[...new Set(docsDe(area).map((d) => d.tipo))].sort().map((t) => `<button data-t="${esc(t)}">${esc(TIPOS[t] || t)}</button>`).join('')}</div>
          </div>
          <div id="lista"></div>
        </div>
      </div></div>`;
    let tipo = '', q = '';
    const pintar = () => {
      const coinc = q.trim() ? new Set(buscar(q, docsDe(area)).map((r) => r.d.codigo)) : null;
      const html = area.grupos.map((g) => {
        const docs = docsDe(area, g).filter((d) => (!tipo || d.tipo === tipo) && (!coinc || coinc.has(d.codigo)));
        if ((tipo || coinc) && !docs.length) return '';
        return `<section class="grupo" id="g-${g.id}"><header>${g.serie ? `<span class="serie">${esc(g.serie)}</span>` : ''}<h2>${esc(g.nombre)}</h2>${g.descripcion ? `<p>${esc(g.descripcion)}</p>` : ''}</header>
          ${docs.length ? `<div class="docs">${docs.map((d) => tarjetaDoc(d, q)).join('')}</div>` : '<div class="grupo-vacio">Proceso en documentación. Los documentos aparecerán aquí una vez aprobados.</div>'}</section>`;
      }).join('');
      $('#lista').innerHTML = html || '<div class="vacio">Ningún documento coincide con el filtro.</div>';
    };
    montarBuscador($('#q'), (v) => { q = v; pintar(); });
    main.querySelectorAll('.filtros button').forEach((b) => { b.onclick = () => { main.querySelectorAll('.filtros button').forEach((x) => x.classList.toggle('on', x === b)); tipo = b.dataset.t; pintar(); }; });
    main.querySelectorAll('[data-ir]').forEach((a) => { a.onclick = (e) => { e.preventDefault(); const s = document.getElementById('g-' + a.dataset.ir); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); }; });
    pintar();
    const links = [...main.querySelectorAll('.lateral a')];
    const obs = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) links.forEach((l) => l.classList.toggle('on', 'g-' + l.dataset.g === e.target.id)); }), { rootMargin: '-100px 0px -60% 0px' });
    const observar = () => main.querySelectorAll('.grupo').forEach((s) => obs.observe(s));
    observar(); new MutationObserver(observar).observe($('#lista'), { childList: true });
  }
  function tarjetaDoc(d, q) {
    const meta = [`<span class="cod">${resaltar(d.codigo, q)}</span>`, d.tipo && `<span class="tipo ${esc(d.tipo)}">${esc(TIPOS[d.tipo] || d.tipo)}</span>`,
      d.version && `<span>v${esc(d.version)}</span>`, chipVig, d.plantilla && '<span class="chip plt" title="Tiene plantilla en ' + tipoPlt(d) + ' para diligenciar">Plantilla ' + tipoPlt(d) + '</span>'].filter(Boolean).join('');
    const acc = (d.pdf ? `<a class="btn pri" href="${urlDoc(d)}">${ico('leer', 16)}${d.tipo === 'FOR' ? 'Ver' : 'Leer'}</a>` : '') + btnPlantilla(d);
    return `<article class="doc"><div><div class="meta">${meta}</div><h3>${resaltar(d.titulo, q)}</h3>${d.resumen ? `<p>${esc(d.resumen)}</p>` : ''}</div><div class="acc">${acc}</div></article>`;
  }

  // ---------- Documento (visor PDF) ----------
    async function urlDescarga(item) {
    const r = await G.llamar('GET', '/drives/' + driveId + '/items/' + item.id);
    if (!r['@microsoft.graph.downloadUrl']) throw new Error('SharePoint no entregó el archivo; puede que esté desprotegido (sin publicar)');
    return r['@microsoft.graph.downloadUrl'];
  }

  function vistaDoc(main, codigo) {
    const d = DOCS.find((x) => x.codigo === codigo);
    if (!d) { location.hash = '#/'; return; }
    encabezado(d.area.nombre);
    document.title = d.codigo + ' · ' + d.titulo + ' · Ideas Control';
    const hermanos = docsDe(d.area, d.grupo).filter((x) => x.pdf), k = hermanos.indexOf(d), ant = hermanos[k - 1], sig = hermanos[k + 1];
    const ficha = [['Código', d.codigo], ['Tipo', TIPOS[d.tipo] || d.tipo], ['Versión', d.version], ['Emisión', d.emision], ['Última revisión', d.revision], ['Responsable', d.responsable]].filter((x) => x[1]);
    main.innerHTML = `<div class="wrap">
      <nav class="migas"><a href="#/">Inicio</a><span>›</span><a href="#/area/${d.area.id}">${esc(d.area.nombre)}</a><span>›</span>${esc(d.grupo.nombre)}</nav>
      <section class="dv-cab">
        <div><div class="meta"><span class="cod">${esc(d.codigo)}</span><span class="tipo ${esc(d.tipo)}">${esc(TIPOS[d.tipo] || d.tipo)}</span>${d.version ? `<span>v${esc(d.version)}</span>` : ''}${chipVig}</div>
          <h1>${esc(d.titulo)}</h1>${d.resumen ? `<p>${esc(d.resumen)}</p>` : ''}</div>
        <div class="dv-acc">${btnPlantilla(d, 'pri')}${d.pdf ? `<button type="button" class="btn sec" id="bCompleta" title="Ver el documento en pantalla completa">${ico('leer', 16)}Pantalla completa</button>` : ''}</div>
      </section>
      <dl class="dv-ficha">${ficha.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl>
      <div class="dv-visor" id="visor">${d.pdf ? '<div class="dv-cargando"><span></span>Cargando el documento…</div>' : '<div class="vacio">Este formato se consulta con su plantilla en ' + tipoPlt(d) + ': use «Descargar plantilla».</div>'}</div>
      <nav class="dv-nav">${ant ? `<a href="${urlDoc(ant)}"><small>← Anterior</small>${esc(ant.codigo)} · ${esc(ant.titulo)}</a>` : '<span></span>'}
        ${sig ? `<a class="sig" href="${urlDoc(sig)}"><small>Siguiente →</small>${esc(sig.codigo)} · ${esc(sig.titulo)}</a>` : `<a class="sig" href="#/area/${d.area.id}"><small>Proceso</small>Volver a ${esc(d.grupo.nombre)}</a>`}</nav>
    </div>`;
    if (!d.pdf) return;
    $('#bCompleta').onclick = pantallaCompleta;
    mostrarPdf(d);
  }
  // Solo lectura: el PDF se muestra con el visor de SharePoint incrustado; no se entrega el archivo
  async function mostrarPdf(d) {
    const visor = () => $('#visor'), sigue = () => location.hash === urlDoc(d);
    try {
      const p = await G.llamar('POST', '/drives/' + driveId + '/items/' + d.pdf.id + '/preview', { zoom: 1 });
      if (!p || !p.getUrl) throw new Error('SharePoint no entregó el visor');
      if (sigue()) visor().innerHTML = `<iframe title="${esc(d.titulo)}" src="${esc(p.getUrl)}" allowfullscreen></iframe>`;
    } catch (e) {
      console.warn(e);
      if (sigue()) visor().innerHTML = `<div class="vacio">No se pudo mostrar el documento (${esc(e.message)}). Intente de nuevo en unos minutos.</div>`;
    }
  }
  function pantallaCompleta() {
    const f = $('#visor iframe'); if (!f) return;
    (f.requestFullscreen || f.webkitRequestFullscreen || (() => {})).call(f);
  }

  // Descarga de plantillas (Word) con su nombre
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-bajar]'); if (!b) return;
    const d = DOCS.find((x) => x.codigo === b.dataset.bajar); if (!d || !d.plantilla) return;
    const txt = b.innerHTML; b.disabled = true; b.textContent = 'Descargando…';
    try {
      const url = await urlDescarga(d.plantilla);
      let href = url, blob = null;
      try { const r = await fetch(url); if (r.ok) blob = await r.blob(); } catch (e) { /* el navegador no dejó leerlo: se descarga directo */ }
      if (blob) href = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = href; a.download = d.plantilla.nombre;
      document.body.appendChild(a); a.click(); setTimeout(() => { if (blob) URL.revokeObjectURL(href); a.remove(); }, 800);
    } catch (err) { alert('No se pudo descargar la plantilla: ' + err.message); }
    b.disabled = false; b.innerHTML = txt;
  });

  // ---------- Arranque ----------
  function panel(titulo, texto, boton, alClic) {
    $('main').innerHTML = `<div class="wrap"><section class="dv-panel"><img src="${CFG.logo}" alt="Ideas Control"><h2>${esc(titulo)}</h2><p>${esc(texto)}</p>${boton ? `<button class="btn pri" id="bPanel">${esc(boton)}</button>` : ''}</section></div>`;
    if (boton) $('#bPanel').onclick = alClic;
  }
  function rutear() {
    const main = $('main'), h = decodeURIComponent((location.hash || '#/').slice(1));
    const m = h.match(/^\/(area|doc)\/(.+)$/);
    if (m && m[1] === 'area') vistaArea(main, m[2]); else if (m) vistaDoc(main, m[2]); else vistaInicio(main);
    scrollTo(0, 0);
  }
  async function arrancar() {
    document.documentElement.classList.add('gd-auth-ok');
    panel('Gestión Documental', 'Conectando con Microsoft 365…');
    // Si Microsoft pide iniciar sesión, la respuesta llega al Portal y este vuelve aquí
    try { sessionStorage.setItem('ic_volver_url', location.href); } catch (e) { /* sin almacenamiento */ }
    try {
      const cuenta = await IC.auth.iniciar(CFG.auth);
      if (!cuenta) {
        panel('Gestión Documental', 'Ingrese con su cuenta de Microsoft de Ideas Control.', 'Iniciar sesión', () => IC.auth.entrar());
        return;
      }
      usuario = { nombre: cuenta.name || cuenta.username, email: String(cuenta.username || '').toLowerCase() };
      await cargar();
      try { sessionStorage.removeItem('ic_volver_url'); } catch (e) { /* sin almacenamiento */ }
      // Las herramientas de consulta (generador, mantenimiento, evaluación…) usan esta sesión en lugar de la clave
      try { localStorage.setItem('ic_doc_m365', JSON.stringify({ nombre: usuario.nombre, email: usuario.email, vence: Date.now() + 12 * 36e5 })); } catch (e) { /* sin almacenamiento */ }
      let volverHerr = null; try { volverHerr = sessionStorage.getItem('ic_doc_volver'); sessionStorage.removeItem('ic_doc_volver'); } catch (e) { /* sin almacenamiento */ }
      if (volverHerr && volverHerr.indexOf(location.origin + CFG.herramientasBase) === 0) { location.replace(volverHerr); return; }
      pie();
      window.addEventListener('hashchange', rutear); rutear();
    } catch (e) {
      console.error(e);
      panel('No se pudo abrir Gestión documental', e.status === 403 || e.status === 404
        ? 'Su cuenta todavía no tiene acceso a la documentación de Ideas Control en SharePoint. Pida acceso a la Dirección de Operaciones.'
        : 'Detalle: ' + e.message, 'Reintentar', () => location.reload());
    }
  }
  // Para «Publicar documento» (publicar.js)
  window.GD_APP = { get driveId() { return driveId; }, get ctx() { return CTX; }, get docs() { return DOCS; }, get usuario() { return usuario; }, areas, TIPOS, clave,
    async recargar() { await cargar(); rutear(); } };
  window.addEventListener('DOMContentLoaded', arrancar);
})();
