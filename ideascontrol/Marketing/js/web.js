/* =====================================================================
   Marketing IC — Artículo para el Centro de conocimiento (Recursos)
   Del JSON del newsletter (el mismo que crea el Word) a dos archivos para la web:
     · Recursos/<slug>/index.html   la página del artículo (formato de las páginas publicadas)
     · Recursos/articulos.js        la lista de artículos, ordenada del más reciente al más antiguo
   No escribe en GitHub: el usuario descarga los dos archivos y los sube.
   ===================================================================== */
window.MKT_WEB = (function () {
  'use strict';
  const U = IC.ui, esc = U.esc;
  const PLANTILLA = "<!doctype html>\n<html lang=\"es\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<title>__TITLE__ · Ideas Control</title>\n<meta name=\"description\" content=\"__DESC__\">\n<meta name=\"keywords\" content=\"__KW__\">\n<link rel=\"canonical\" href=\"__URL__\">\n<meta property=\"og:type\" content=\"article\">\n<meta property=\"og:title\" content=\"__TITLE__\">\n<meta property=\"og:description\" content=\"__DESC__\">\n<meta property=\"og:url\" content=\"__URL__\">\n<meta property=\"og:site_name\" content=\"Ideas Control\">\n<meta property=\"og:locale\" content=\"es_CO\">\n<meta property=\"og:image\" content=\"https://www.mykadosh.com/ideascontrol/assets/ideascontrol.webp\">\n<link rel=\"icon\" href=\"/ideascontrol/assets/ideascontrol.webp\">\n<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\"><link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n<link href=\"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap\" rel=\"stylesheet\">\n<link rel=\"stylesheet\" href=\"../kb.css?v=1.0.0\">\n<script type=\"application/ld+json\">__JSONLD__</script>\n</head>\n<body>\n<div class=\"kb-barra\"></div>\n<header class=\"kb-top\"><div class=\"w\">\n  <a href=\"/ideascontrol/Herramientas/\"><img src=\"/ideascontrol/assets/ideascontrol.webp\" alt=\"Ideas Control Equipos y Soluciones S.A.S.\"></a>\n  <nav><a href=\"/ideascontrol/Herramientas/\">Herramientas</a><a href=\"/ideascontrol/Recursos/\" class=\"on\">Artículos</a></nav>\n</div></header>\n<section class=\"kb-hero\"><div class=\"w\">\n  <a class=\"kb-volver\" href=\"/ideascontrol/Recursos/\">← Todos los artículos</a>\n  <span class=\"kb-chip\">__TEMA__</span>\n  __H1__\n  <p class=\"kb-meta\"><time datetime=\"__FECHA_ISO__\">__FECHA__</time> · __MIN__ min de lectura · Ideas Control</p>\n</div></section>\n<main class=\"kb-art\">\n  <article>\n    __LEAD__\n    __CUERPO__\n    __CTA__\n    __CIERRE__\n    <div class=\"kb-compartir\"><span>Compartir:</span>\n      <a data-red=\"wa\" href=\"#\" rel=\"noopener\">WhatsApp</a><a data-red=\"li\" href=\"#\" rel=\"noopener\">LinkedIn</a><button type=\"button\" id=\"kbCopiar\">Copiar enlace</button>\n    </div>\n  </article>\n  <section class=\"kb-mas\"><h2>Más artículos</h2><div id=\"kbMas\" class=\"kb-lista\"></div></section>\n</main>\n<footer class=\"kb-pie\">Ideas Control Equipos y Soluciones S.A.S. · Biometría, tiempo y asistencia · <a href=\"/ideascontrol/Privacidad/\">Política de Tratamiento de Datos Personales</a></footer>\n<script src=\"../articulos.js?v=1.0.0\"></script>\n<script>\n(function () {\n  var url = location.href.split('#')[0].split('?')[0], titulo = document.title.replace(/ · Ideas Control$/, '');\n  document.querySelector('[data-red=\"wa\"]').href = 'https://wa.me/?text=' + encodeURIComponent(titulo + ' ' + url);\n  document.querySelector('[data-red=\"li\"]').href = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url);\n  document.querySelectorAll('[data-red]').forEach(function (a) { a.target = '_blank'; });\n  var b = document.getElementById('kbCopiar');\n  b.onclick = function () { try { navigator.clipboard.writeText(url).then(function () { b.textContent = '¡Copiado!'; }); } catch (e) { prompt('Copie el enlace:', url); } };\n  /* UTM: si la persona llegó al artículo desde una publicación con etiquetas, el botón de la herramienta conserva ese origen */\n  try {\n    var qs = new URLSearchParams(location.search), hay = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].filter(function (k) { return qs.get(k); });\n    if (hay.length) document.querySelectorAll('.kb-btn').forEach(function (a) { var u = new URL(a.href); hay.forEach(function (k) { u.searchParams.set(k, qs.get(k).slice(0, 100)); }); a.href = u.toString(); });\n  } catch (e) { /* navegador antiguo */ }\n  var otros = (window.IC_ARTICULOS || []).filter(function (a) { return a.slug !== '__SLUG__'; }).slice(0, 3);\n  var esc = function (s) { return String(s || '').replace(/[&<>\"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[c]; }); };\n  document.getElementById('kbMas').innerHTML = otros.map(function (a) {\n    return '<a class=\"kb-item\" href=\"../' + a.slug + '/\"><span class=\"kb-chip\">' + esc(a.tema) + '</span><h3>' + esc(a.titulo1) + (a.titulo2 ? ' <span>' + esc(a.titulo2) + '</span>' : '') + '</h3><p>' + esc(a.resumen) + '</p><small>' + esc(a.fecha_txt) + ' · ' + a.minutos + ' min</small></a>';\n  }).join('');\n})();\n</script>\n</body>\n</html>\n";
  const H = 'https://www.mykadosh.com/ideascontrol/', BASE = H + 'Recursos/';
  // Herramientas que se ofrecen al final del artículo (se elige por el enlace del tema)
  const HERR = [
    { clave: 'DiagnosticoMadurezTyA', nombre: 'Diagnóstico de Madurez en Tiempo y Asistencia', texto: 'Evalúa en 10 preguntas qué tan madura es la gestión de tiempo y asistencia de tu empresa y dónde mejorar primero.', boton: 'Hacer el diagnóstico gratis' },
    { clave: 'CostoHoraAusente', nombre: 'Costo del Ausentismo', texto: 'Calcula cuánto le cuesta a tu empresa cada hora de ausencia y conviértelo en una cifra para decidir.', boton: 'Calcular el costo' },
    { clave: 'PilotoTyA', nombre: 'Piloto de Tiempo y Asistencia', texto: 'Prueba durante 15 días cómo se ve tu asistencia cuando el registro, las novedades y los reportes salen de una sola fuente.', boton: 'Solicitar el piloto' },
    { clave: 'TimeVision', nombre: 'TimeVision', texto: 'Convierte las marcaciones en tableros de costo, capacidad y cumplimiento, disponibles antes del cierre.', boton: 'Conocer TimeVision' }
  ];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const fechaTxt = (iso) => { const d = new Date(iso + 'T12:00:00'); return d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear(); };
  const slugDe = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  // Texto: sin marcas de enlace ni URLs; **negrita** -> <strong>
  const limpio = (t) => String(t || '').replace(/\{\{\s*ENLACE\s*\}\}|\[enlace[^\]]*\]|https?:\/\/\S+/gi, '').replace(/\s+([.,;:])/g, '$1').trim();
  const fmt = (t) => esc(limpio(t)).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  const plano = (t) => limpio(t).replace(/\*\*/g, '');

  function cuerpo(n) {
    const out = [];
    (n.bloques || []).forEach((b) => {
      if (!b) return;
      switch (b.tipo) {
        case 'parrafos': [].concat(b.texto || []).filter(Boolean).forEach((t) => out.push('<p>' + fmt(t) + '</p>')); break;
        case 'subtitulo': if (b.texto) out.push('<h2>' + esc(plano(b.texto)) + '</h2>'); break;
        case 'comparacion': {
          if (b.titulo) out.push('<p class="kb-eyebrow">' + esc(plano(b.titulo).toUpperCase()) + '</p>');
          const lado = (x) => '<div class="kb-card"><h4><strong>' + esc(plano((x || {}).titulo).toUpperCase()) + '</strong></h4><ul>' + ((x || {}).items || []).map((i) => '<li>' + fmt(i) + '</li>').join('') + '</ul></div>';
          out.push('<div class="kb-grid n2 comp">' + lado(b.izquierda) + lado(b.derecha) + '</div>'); break;
        }
        case 'cita': out.push('<blockquote class="kb-quote">' + String(b.texto || '').split(/\n/).filter(Boolean).map((l) => '<strong>' + fmt(l) + '</strong>').join('<br>') + '</blockquote>'); break;
        case 'tarjetas': {
          const it = b.items || [];
          out.push('<div class="kb-grid n' + Math.min(it.length, 3) + '">' + it.map((x, i) => '<div class="kb-card"><span class="num">' + (i + 1) + '</span><h4><strong>' + esc(plano(x.titulo).toUpperCase()) + '</strong></h4><p>' + fmt(x.texto) + '</p></div>').join('') + '</div>'); break;
        }
        case 'pasos': {
          const it = (b.items || []).slice(0, 6);
          out.push('<div class="kb-grid n' + Math.min(it.length, 5) + ' pasos">' + it.map((x, i) => '<div class="kb-card"><span class="num">' + String(i + 1).padStart(2, '0') + '</span><h4><strong>' + esc(plano(x.titulo).toUpperCase()) + '</strong></h4><p>' + fmt(x.texto) + '</p></div>').join('') + '</div>'); break;
        }
        case 'checklist':
          if (b.titulo) out.push('<h2>' + esc(plano(b.titulo)) + '</h2>');
          out.push('<div class="kb-check"><ul>' + (b.items || []).map((i) => '<li>' + fmt(i) + '</li>').join('') + '</ul></div>');
          if (b.cierre) out.push('<p>' + fmt(b.cierre) + '</p>');
          break;
        case 'frase': out.push('<div class="kb-destacado"><p><strong>' + fmt(b.linea1) + '</strong></p>' + (b.linea2 ? '<p><strong>' + fmt(b.linea2) + '</strong></p>' : '') + '</div>'); break;
        case 'pregunta':
          if (b.titulo) out.push('<h2>' + esc(plano(b.titulo)) + '</h2>');
          if (b.destacado) out.push('<p class="kb-fuerte"><strong>' + fmt(b.destacado) + '</strong></p>');
          if (b.texto) out.push('<p>' + fmt(b.texto) + '</p>');
          break;
        default: if (b.texto) [].concat(b.texto).forEach((t) => out.push('<p>' + fmt(t) + '</p>'));
      }
    });
    return out;
  }
  function herramientaDe(url) { return HERR.find((h) => String(url || '').indexOf('/' + h.clave + '/') >= 0) || HERR[0]; }

  // Arma los dos archivos. o = { slug, tema, fecha (ISO, lunes de la semana), herramienta (clave) }
  function armar(n, o, lista) {
    const her = HERR.find((h) => h.clave === o.herramienta) || HERR[0];
    const tit = plano(n.titulo), res = plano(n.titulo_resaltado);
    const corte = res && tit.endsWith(res) ? tit.length - res.length : -1;
    const t1 = corte > 0 ? tit.slice(0, corte).trim() : tit, t2 = corte > 0 ? res : '';
    const desc = plano(n.bajada) || tit, ft = fechaTxt(o.fecha), url = BASE + o.slug + '/';
    const C = cuerpo(n), palabras = C.join(' ').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length + desc.split(/\s+/).length;
    const minutos = Math.max(2, Math.round(palabras / 200));
    const f = n.ficha || {}, kw = [f.keyword, f.keywords_secundarias].filter(Boolean).join(', ');
    const utm = H + her.clave + '/?utm_source=recursos&utm_medium=articulo&utm_campaign=' + o.slug;
    const cta = '<aside class="kb-cta"><span class="kb-cta-eye">Herramienta gratuita</span><h3>' + esc(her.nombre) + '</h3><p>' + esc(her.texto) + '</p><a class="kb-btn" href="' + esc(utm) + '">' + esc(her.boton) + ' →</a></aside>';
    const cierre = n.cierre ? '<p class="kb-cierre"><strong>' + fmt(n.cierre) + '</strong></p>' : '';
    const jsonld = { '@context': 'https://schema.org', '@type': 'Article', headline: tit, description: desc, datePublished: o.fecha, inLanguage: 'es-CO',
      author: { '@type': 'Organization', name: 'Ideas Control Equipos y Soluciones S.A.S.' }, publisher: { '@type': 'Organization', name: 'Ideas Control Equipos y Soluciones S.A.S.' }, mainEntityOfPage: url };
    const rep = { __TITLE__: esc(tit), __DESC__: esc(desc), __KW__: esc(kw), __URL__: url, __TEMA__: esc(o.tema), __FECHA__: esc(ft), __FECHA_ISO__: o.fecha, __MIN__: String(minutos),
      __H1__: '<h1>' + esc(t1) + (t2 ? '<span>' + esc(t2) + '</span>' : '') + '</h1>', __LEAD__: '<p class="kb-lead">' + esc(desc) + '</p>', __CUERPO__: C.join('\n'), __CTA__: cta, __CIERRE__: cierre,
      __SLUG__: o.slug, __JSONLD__: JSON.stringify(jsonld) };
    const pagina = PLANTILLA.replace(/__[A-Z0-9_]+__/g, (k) => (k in rep ? rep[k] : k));
    const item = { slug: o.slug, titulo: tit, titulo1: t1, titulo2: t2, resumen: desc, tema: o.tema, fecha: o.fecha, fecha_txt: ft, minutos, herramienta: her.nombre, herramienta_url: H + her.clave + '/', url };
    const nueva = lista.filter((a) => a.slug !== o.slug).concat([item]).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    const js = '/* Centro de conocimiento de Ideas Control: lista de artículos (newsletters), del más reciente al más antiguo. Generado por Marketing (APP-112). */\nwindow.IC_ARTICULOS = ' + JSON.stringify(nueva, null, 1) + ';\n';
    return { pagina, js, item, reemplaza: lista.some((a) => a.slug === o.slug) };
  }
  // Lista publicada hoy en la web (mismo sitio)
  async function listaActual() {
    const r = await fetch('/ideascontrol/Recursos/articulos.js?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('No pude leer la lista de artículos publicada (' + r.status + ').');
    const w = {}; new Function('window', await r.text())(w);
    return w.IC_ARTICULOS || [];
  }
  function bajar(nombre, texto, tipo) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texto], { type: tipo + ';charset=utf-8' })); a.download = nombre;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }

  // Diálogo: n = JSON del newsletter, ctx = { lunes, destino (URL de la herramienta del tema), tema (categoría sugerida) }
  async function dialogo(n, ctx) {
    let lista; try { lista = await listaActual(); } catch (e) { U.aviso(e.message, 'err', 8000); return; }
    const temas = lista.map((a) => a.tema).filter((t, i, x) => t && x.indexOf(t) === i);
    const f = n.ficha || {}, slug0 = slugDe(f.keyword || n.titulo), her0 = herramientaDe(ctx.destino).clave;
    U.modal('Artículo para la web (Centro de conocimiento)', '<div class="ic-form"><p class="sec" style="margin-top:0">Se generan dos archivos con el formato de las páginas ya publicadas: la página del artículo y la lista de artículos, ordenada del más reciente al más antiguo.</p><div class="ic-campos">' +
      '<div class="ic-campo c12"><label for="wSlug">Dirección del artículo</label><input id="wSlug" value="' + esc(slug0) + '"><span class="ayuda" id="wUrl"></span></div>' +
      '<div class="ic-campo c6"><label for="wTema">Tema (filtro de la página)</label><input id="wTema" list="wTemas" value="' + esc(ctx.tema || '') + '"><datalist id="wTemas">' + temas.map((t) => '<option value="' + esc(t) + '">').join('') + '</datalist></div>' +
      '<div class="ic-campo c3"><label for="wFecha">Fecha</label><input type="date" id="wFecha" value="' + esc(ctx.lunes) + '"></div>' +
      '<div class="ic-campo c3"><label for="wHer">Herramienta del final</label><select id="wHer">' + HERR.map((h) => '<option value="' + h.clave + '"' + (h.clave === her0 ? ' selected' : '') + '>' + esc(h.nombre) + '</option>').join('') + '</select></div>' +
      '</div><div id="wAviso"></div><div class="ic-acciones" style="justify-content:flex-start;flex-wrap:wrap"><button class="ic-btn" id="wB1">1. Descargar index.html</button><button class="ic-btn" id="wB2">2. Descargar articulos.js</button><button class="ic-btn sec" id="wVer">Ver el artículo</button></div>' +
      '<div class="sec" id="wPasos" style="margin-top:10px"></div></div>', (m) => {
      const opts = () => ({ slug: slugDe(m.querySelector('#wSlug').value) || slug0, tema: m.querySelector('#wTema').value.trim() || 'Tiempo y asistencia', fecha: m.querySelector('#wFecha').value || ctx.lunes, herramienta: m.querySelector('#wHer').value });
      const pintar = () => {
        const o = opts(), r = armar(n, o, lista), repo = 'https://github.com/ideascontrol/mykadosh-hub';
        m.querySelector('#wUrl').textContent = BASE + o.slug + '/';
        m.querySelector('#wAviso').innerHTML = r.reemplaza ? '<p class="gen-aviso" style="margin:8px 0 0">Ya existe un artículo con esa dirección: se reemplaza.</p>' : '';
        m.querySelector('#wPasos').innerHTML = '<b>Para publicarlo en GitHub</b> (repositorio ideascontrol/mykadosh-hub, carpeta ideascontrol/Recursos):<ol style="margin:6px 0 0;padding-left:18px">' +
          '<li><a href="' + repo + '/new/main/ideascontrol/Recursos?filename=' + encodeURIComponent(o.slug + '/index.html') + '" target="_blank" rel="noopener">Crear la carpeta del artículo ↗</a>: abre «Create new file» con el nombre <code>' + esc(o.slug) + '/index.html</code>. Pegue el contenido de <b>index.html</b> (ábralo con el Bloc de notas) y pulse <b>Commit changes</b>.</li>' +
          '<li><a href="' + repo + '/upload/main/ideascontrol/Recursos" target="_blank" rel="noopener">Subir articulos.js ↗</a>: arrastre <b>articulos.js</b> (reemplaza el actual) y pulse <b>Commit changes</b>.</li></ol>La página queda en 1 o 2 minutos.';
        return r;
      };
      m.querySelectorAll('#wSlug,#wTema,#wFecha,#wHer').forEach((i) => { i.oninput = pintar; i.onchange = pintar; });
      pintar();
      m.querySelector('#wB1').onclick = () => bajar('index.html', pintar().pagina, 'text/html');
      m.querySelector('#wB2').onclick = () => bajar('articulos.js', pintar().js, 'text/javascript');
      m.querySelector('#wVer').onclick = () => { const w = window.open('', '_blank'); if (w) { w.document.open(); w.document.write(pintar().pagina.replace('<head>', '<head><base href="' + BASE + opts().slug + '/">')); w.document.close(); } };
    });
  }
  return { dialogo, armar, cuerpo };
})();
