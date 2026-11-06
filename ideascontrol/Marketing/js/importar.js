/* =====================================================================
   APP-112 · Marketing — Importar estadísticas  (#importar)
   Archivos exportados de Meta Business Suite (Facebook / Instagram), Administrador de anuncios de Meta,
   LinkedIn (análisis de la página) y TikTok Studio (.csv, .xlsx, .xls).
   1. Lee el archivo y reconoce de qué red es (por los encabezados y los enlaces de cada post).
   2. Propone a qué columna corresponde cada dato (se puede corregir).
   3. Asocia cada post con su publicación (PUB-…): por el enlace publicado, por el PUB en el nombre del anuncio,
      o por red + fecha + parecido del texto.
   4. Guarda en MKT_Metricas. Si el post ya tenía métricas, las ACTUALIZA (no duplica) y cambia la fecha de corte.
   Fechas: fecha_campana = lunes de la semana de la publicación (igual al UTM sem-AAAA-MM-DD);
           fecha_publicacion = día en que salió; fecha_corte = hasta cuándo van los números.
   ===================================================================== */
window.MKT_IMP = (function () {
  'use strict';
  const U = IC.ui, esc = U.esc, G = IC.graph, L = CFG.listas;
  const M = () => window.MKT;
  const ST = { archivo: '', filas: [], cab: [], fuente: '', mapa: {}, red: '', fmtFecha: 'auto', corte: '', items: [] };

  // ---------- campos del portal ----------
  const CAMPOS = [
    ['texto', 'Texto / título del post o anuncio'], ['enlace', 'Enlace del post'], ['post_id', 'Id del post'], ['fecha', 'Fecha de publicación'], ['tipo_post', 'Tipo de post'],
    ['alcance', 'Alcance'], ['impresiones', 'Impresiones / visualizaciones'], ['reacciones', 'Reacciones / me gusta'], ['comentarios', 'Comentarios'], ['compartidos', 'Compartidos'],
    ['guardados', 'Guardados'], ['clics', 'Clics'], ['nuevos_seguidores', 'Nuevos seguidores'], ['reproducciones', 'Reproducciones'], ['tiempo_prom', 'Tiempo promedio (s)'],
    ['video_completo', 'Vieron el video completo'], ['inversion', 'Inversión'], ['resultados', 'Resultados'], ['plataforma', 'Plataforma / red']
  ];
  const NUMERICOS = ['alcance', 'impresiones', 'reacciones', 'comentarios', 'compartidos', 'guardados', 'clics', 'nuevos_seguidores', 'reproducciones', 'tiempo_prom', 'video_completo', 'inversion', 'resultados'];
  // Encabezados conocidos por fuente (en minúsculas y sin tildes). Se compara exacto o «nombre (…)».
  const S = {
    meta: {
      post_id: ['identificador de la publicacion', 'id de la publicacion', 'post id'], enlace: ['enlace permanente', 'permalink'], fecha: ['hora de publicacion', 'publish time', 'fecha de publicacion'],
      texto: ['titulo', 'title', 'descripcion', 'description'], tipo_post: ['tipo de publicacion', 'post type'], alcance: ['alcance', 'reach', 'cuentas alcanzadas', 'espectadores', 'viewers'],
      impresiones: ['visualizaciones', 'views', 'impresiones', 'impressions'], reacciones: ['reacciones', 'reactions', 'me gusta', 'likes'], comentarios: ['comentarios', 'comments'],
      compartidos: ['veces que se compartio', 'compartidos', 'shares', 'veces compartido'], guardados: ['guardados', 'saves', 'veces que se guardo'],
      clics: ['clics en el enlace', 'link clicks', 'total de clics', 'clics totales', 'total clicks', 'clics'], nuevos_seguidores: ['seguimientos', 'follows', 'nuevos seguidores'],
      reproducciones: ['reproducciones', 'plays', 'reproducciones de video de 3 segundos', '3-second video views'], tiempo_prom: ['tiempo promedio de reproduccion', 'average watch time']
    },
    ads: {
      texto: ['nombre del anuncio', 'ad name', 'nombre de la campana', 'campaign name', 'nombre del conjunto de anuncios', 'ad set name'], fecha: ['inicio del informe', 'reporting starts', 'inicio'],
      alcance: ['alcance', 'reach'], impresiones: ['impresiones', 'impressions'], inversion: ['importe gastado', 'amount spent', 'importe gastado (cop)', 'amount spent (cop)'],
      resultados: ['resultados', 'results'], clics: ['clics en el enlace', 'link clicks', 'clics (todos)', 'clicks (all)'], reacciones: ['reacciones a la publicacion', 'post reactions'],
      comentarios: ['comentarios en la publicacion', 'post comments'], compartidos: ['veces que se compartio la publicacion', 'post shares'], guardados: ['guardados de la publicacion', 'post saves'],
      plataforma: ['plataforma', 'platform']
    },
    linkedin: {
      enlace: ['post link', 'enlace de la publicacion', 'enlace de la actualizacion', 'update link'], fecha: ['created date', 'fecha de creacion', 'fecha de publicacion', 'date'],
      texto: ['post title', 'titulo de la publicacion', 'titulo de la actualizacion', 'update title'], tipo_post: ['post type', 'tipo de publicacion', 'content type', 'tipo de contenido'],
      impresiones: ['impressions', 'impresiones'], clics: ['clicks', 'clics'], reacciones: ['likes', 'reactions', 'reacciones', 'recomendaciones'], comentarios: ['comments', 'comentarios'],
      compartidos: ['reposts', 'shares', 'veces compartido', 'compartidos', 'difusiones'], nuevos_seguidores: ['follows', 'seguimientos'], reproducciones: ['views', 'visualizaciones', 'video views']
    },
    tiktok: {
      enlace: ['video link', 'enlace del video', 'link', 'enlace'], fecha: ['post time', 'hora de publicacion', 'fecha de publicacion', 'date posted', 'publicado'],
      texto: ['video title', 'titulo del video', 'title', 'titulo', 'descripcion'], reproducciones: ['total views', 'video views', 'views', 'visualizaciones', 'visualizaciones de video', 'reproducciones'],
      reacciones: ['total likes', 'likes', 'me gusta'], comentarios: ['total comments', 'comments', 'comentarios'], compartidos: ['total shares', 'shares', 'compartidos', 'veces compartido'],
      guardados: ['add to favorites', 'favorites', 'favoritos', 'guardados'], alcance: ['reached audience', 'audiencia alcanzada', 'alcance', 'total reach'],
      tiempo_prom: ['average watch time', 'tiempo de visualizacion promedio', 'tiempo medio de reproduccion'], video_completo: ['watched full video', 'vieron el video completo', 'full video watched rate'],
      nuevos_seguidores: ['new followers', 'nuevos seguidores']
    }
  };
  const NOMBRE_FUENTE = { meta: 'Meta Business Suite (Facebook / Instagram)', ads: 'Administrador de anuncios de Meta (pauta)', linkedin: 'LinkedIn', tiktok: 'TikTok Studio' };
  const nz = (s) => U.norm(String(s == null ? '' : s)).replace(/\s+/g, ' ').trim();
  const iguala = (cab, sin) => { const c = nz(cab); return sin.some((x) => c === x || c.indexOf(x + ' (') === 0); };

  // ---------- lectura ----------
  function cargarXLSX() {
    if (window.XLSX) return Promise.resolve();
    return new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar la librería de Excel.')); document.head.appendChild(s); });
  }
  async function leerArchivo(file) {
    await cargarXLSX();
    const buf = await file.arrayBuffer();
    const esCsv = /\.csv$/i.test(file.name);
    const wb = XLSX.read(buf, esCsv ? { type: 'array', raw: true, codepage: 65001 } : { type: 'array', cellDates: true });
    // La hoja con más datos reconocibles (LinkedIn trae varias hojas)
    let mejor = null;
    wb.SheetNames.forEach((n) => {
      const a = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' });
      const d = detectar(a);
      if (d && (!mejor || d.puntos > mejor.puntos)) mejor = Object.assign({ hoja: n, a }, d);
    });
    if (!mejor) throw new Error('No reconocí columnas de estadísticas en el archivo. ¿Es la exportación de Meta, LinkedIn o TikTok?');
    return mejor;
  }
  // Busca la fila de encabezados (las primeras 12) y la fuente que más columnas reconoce
  function detectar(a) {
    let mejor = null;
    for (let i = 0; i < Math.min(12, a.length); i++) {
      const cab = (a[i] || []).map((x) => String(x || '').trim());
      if (cab.filter(Boolean).length < 3) continue;
      Object.keys(S).forEach((f) => {
        let p = 0; Object.keys(S[f]).forEach((k) => { if (cab.some((c) => iguala(c, S[f][k]))) p++; });
        if (f === 'ads' && !cab.some((c) => iguala(c, S.ads.inversion))) p = 0;   // sin inversión no es un informe de anuncios
        if (f === 'ads' && p) p += 3;
        if (!mejor || p > mejor.puntos) mejor = { fuente: f, fila: i, cab, puntos: p };
      });
    }
    return mejor && mejor.puntos >= 3 ? mejor : null;
  }
  // Para cada dato toma la primera columna conocida QUE TENGA DATOS (ej. Meta deja «Descripción» vacía y pone el texto en «Título»)
  function mapaInicial(fuente, cab, filas) {
    const m = {}, usados = {};
    const conDatos = (j) => (filas || []).some((r) => { const v = String((r || [])[j] == null ? '' : r[j]).trim(); return v !== '' && !/^n\/?a$/i.test(v); });
    CAMPOS.forEach(([k]) => {
      const sin = (S[fuente] || {})[k]; if (!sin) return;
      const cand = [];
      sin.forEach((x) => cab.forEach((c, j) => { if (!usados[j] && cand.indexOf(j) < 0 && (nz(c) === x || nz(c).indexOf(x + ' (') === 0)) cand.push(j); }));
      const j = cand.find(conDatos); const elegido = j !== undefined ? j : cand[0];
      if (elegido !== undefined) { m[k] = elegido; usados[elegido] = true; }
    });
    return m;
  }

  // ---------- conversión de valores ----------
  function numero(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    let s = String(v).replace(/[\s$%]|COP|USD/gi, '');
    if (!s || s === '-' || /^n\/?a$/i.test(s)) return null;
    if (/^\d+:\d{2}(:\d{2})?$/.test(s)) { const p = s.split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; }   // 0:12 -> 12 s
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');        // 1.234,5
    else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');                      // 1,234.5
    else s = s.replace(',', '.');
    const n = Number(s); return isFinite(n) ? n : null;
  }
  const MESES = { ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7, ago: 8, aug: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, dec: 12 };
  function fechaISO(v, fmt) {
    if (v === null || v === undefined || v === '') return '';
    const p2 = (n) => String(n).padStart(2, '0');
    if (v instanceof Date && !isNaN(v)) return v.getFullYear() + '-' + p2(v.getMonth() + 1) + '-' + p2(v.getDate());
    if (typeof v === 'number') { const d = new Date(Math.round((v - 25569) * 86400000)); return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()); }
    const s = String(v).trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return m[1] + '-' + p2(m[2]) + '-' + p2(m[3]);
    m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
    if (m) {
      let a = +m[1], b = +m[2], y = +m[3]; if (y < 100) y += 2000;
      const mesDia = fmt === 'md' || (fmt !== 'dm' && a <= 12 && b > 12);
      const d = mesDia ? b : a, mo = mesDia ? a : b;
      return y + '-' + p2(mo) + '-' + p2(d);
    }
    m = nz(s).match(/(\d{1,2})\s*(?:de\s+)?([a-z]{3})[a-z]*\.?\s*(?:de\s+)?(\d{4})/) || null;
    if (m && MESES[m[2]]) return m[3] + '-' + p2(MESES[m[2]]) + '-' + p2(m[1]);
    m = nz(s).match(/([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/);
    if (m && MESES[m[1]]) return m[3] + '-' + p2(MESES[m[1]]) + '-' + p2(m[2]);
    return '';
  }
  // ¿El archivo usa día/mes o mes/día? Se decide por las fechas que no dejan duda (un número > 12)
  function formatoFechas(filas, col) {
    let dm = 0, md = 0;
    filas.forEach((r) => { const m = String(r[col] || '').match(/^(\d{1,2})[/.-](\d{1,2})[/.-]\d{2,4}/); if (m) { if (+m[1] > 12) dm++; if (+m[2] > 12) md++; } });
    return md > dm ? 'md' : dm > md ? 'dm' : '';
  }
  function redDeFila(enlace, tipo, plataforma, fuente, redDef) {
    const e = String(enlace || '').toLowerCase(), t = nz(tipo) + ' ' + nz(plataforma);
    if (e.indexOf('instagram.com') >= 0 || /(^|\s)ig\s|instagram/.test(t)) return 'Instagram';
    if (e.indexOf('facebook.com') >= 0 || e.indexOf('fb.') >= 0 || /facebook/.test(t)) return 'Facebook';
    if (e.indexOf('linkedin.com') >= 0 || fuente === 'linkedin') return 'LinkedIn';
    if (e.indexOf('tiktok.com') >= 0 || fuente === 'tiktok') return 'TikTok';
    if (e.indexOf('youtube.com') >= 0 || e.indexOf('youtu.be') >= 0) return 'YouTube';
    return redDef || 'Facebook';
  }
  const normEnlace = (u) => String(u || '').trim().toLowerCase().replace(/^https?:\/\/(www\.|m\.|web\.)?/, '').replace(/[?#].*$/, '').replace(/\/+$/, '');
  function palabras(t) { return nz(String(t || '').replace(/\*\*/g, '')).replace(/[^a-z0-9ñ ]+/g, ' ').split(' ').filter((w) => w.length > 3).slice(0, 40); }
  function parecido(a, b) {
    const A = palabras(a), B = palabras(b); if (!A.length || !B.length) return 0;
    const sb = {}; B.forEach((w) => { sb[w] = 1; });
    return A.filter((w) => sb[w]).length / Math.min(A.length, B.length);
  }
  const redesDe = (canal) => { const n = U.norm(canal || ''), r = []; if (n.indexOf('facebook') >= 0) r.push('Facebook'); if (n.indexOf('instagram') >= 0) r.push('Instagram'); if (n.indexOf('linkedin') >= 0) r.push('LinkedIn'); if (n.indexOf('tiktok') >= 0) r.push('TikTok'); if (n.indexOf('youtube') >= 0) r.push('YouTube'); return r; };

  // ---------- asociar con publicaciones y métricas existentes ----------
  function asociar(it) {
    const pubs = App.pubs.filter((p) => p.estado !== 'Cancelada');
    let p = null, como = '';
    const ne = normEnlace(it.enlace);
    if (ne) { p = pubs.find((x) => x.link && normEnlace(x.link) === ne); if (p) como = 'enlace'; }
    if (!p) { const m = String(it.texto || '').match(/PUB-\d{5}/i); if (m) { p = pubs.find((x) => x.Title === m[0].toUpperCase()); if (p) como = 'PUB en el nombre'; } }
    if (!p && it.fecha) {
      const misma = pubs.filter((x) => redesDe(x.canal).indexOf(it.red) >= 0 && !/newsletter/i.test(x.canal) === !/newsletter|articulo|article/i.test(it.tipo_post || ''));
      const cand = (d) => misma.filter((x) => M().dia(x.fecha) === d);
      let c = cand(it.fecha);
      if (!c.length) c = cand(M().sumarDias(it.fecha, -1)).concat(cand(M().sumarDias(it.fecha, 1)));
      if (c.length) {
        const conPuntos = c.map((x) => ({ x, s: parecido(it.texto, (x.copy || '') + ' ' + (x.titulo || '')) })).sort((a, b) => b.s - a.s);
        if (c.length === 1 && (M().dia(c[0].fecha) === it.fecha || conPuntos[0].s >= 0.25)) { p = c[0]; como = 'red y fecha'; }
        else if (conPuntos[0].s >= 0.25) { p = conPuntos[0].x; como = 'red, fecha y texto'; }
      }
    }
    it.pubId = p ? p.Title : ''; it.como = como;
    buscarMetrica(it);
  }
  function buscarMetrica(it) {
    const ne = normEnlace(it.enlace);
    const m = App.mets.find((x) => (it.post_id && x.post_id && String(x.post_id) === String(it.post_id)) || (ne && x.enlace_post && normEnlace(x.enlace_post) === ne)) ||
      (it.pubId ? App.mets.find((x) => x.publicacion_id === it.pubId && x.red === it.red && (x.tipo || 'Orgánico') === it.tipo) : null);
    it.metId = m ? m.Title : '';
  }

  // Fecha ambigua (ej. 11/04/2026): si el formato no es seguro, se toma la lectura más cercana a la fecha de corte sin pasarla.
  function fechaElegida(v, fmt) {
    const a = fechaISO(v, fmt);
    if (ST.fmtFecha !== 'auto' || !/^\s*(\d{1,2})[/.-](\d{1,2})[/.-]/.test(String(v || ''))) return a;
    const m = String(v).match(/^\s*(\d{1,2})[/.-](\d{1,2})/); if (+m[1] > 12 || +m[2] > 12 || m[1] === m[2]) return a;
    const b = fechaISO(v, fmt === 'md' ? 'dm' : 'md'), corte = ST.corte || M().hoyISO();
    const dist = (x) => { const d = (new Date(corte) - new Date(x)) / 864e5; return d < -1 ? 1e6 - d : d; };
    return dist(b) < dist(a) ? b : a;
  }
  function construir() {
    const fmt = ST.fmtFecha === 'auto' ? (formatoFechas(ST.filas, ST.mapa.fecha) || (ST.fuente === 'meta' || ST.fuente === 'ads' ? 'md' : 'dm')) : ST.fmtFecha;
    ST.fmtUsado = fmt;
    const val = (r, k) => ST.mapa[k] === undefined ? '' : r[ST.mapa[k]];
    ST.ambiguo = !formatoFechas(ST.filas, ST.mapa.fecha);
    ST.items = ST.filas.map((r, i) => {
      const it = { i, incluir: true, texto: String(val(r, 'texto') || '').trim(), enlace: String(val(r, 'enlace') || '').trim(), post_id: String(val(r, 'post_id') || '').trim(),
        fecha: fechaElegida(val(r, 'fecha'), fmt), tipo_post: String(val(r, 'tipo_post') || ''), tipo: ST.fuente === 'ads' ? 'Pago' : (/patrocin|sponsor|promoc|anuncio/i.test(String(val(r, 'tipo_post') || '')) ? 'Pago' : 'Orgánico') };
      it.red = redDeFila(it.enlace, it.tipo_post, val(r, 'plataforma'), ST.fuente, ST.red);
      NUMERICOS.forEach((k) => { it[k] = numero(val(r, k)); });
      if (it.tiempo_prom !== null && ST.mapa.tiempo_prom !== undefined && /ms|milis/i.test(ST.cab[ST.mapa.tiempo_prom])) it.tiempo_prom = Math.round(it.tiempo_prom / 100) / 10;
      it.vacia = NUMERICOS.every((k) => it[k] === null || it[k] === 0) && !it.texto;
      asociar(it);
      return it;
    }).filter((it) => !it.vacia && (it.texto || it.enlace || it.fecha));
  }

  // ---------- guardar ----------
  async function guardar(progreso) {
    const sel = ST.items.filter((x) => x.incluir), hechos = { nuevas: 0, actualizadas: 0, links: 0, publicadas: 0 };
    const tiene = (c) => !App.colsMet || App.colsMet.indexOf(c) >= 0;
    let k = 0;
    for (const it of sel) {
      progreso('Guardando ' + (++k) + ' de ' + sel.length + '…');
      const p = it.pubId ? App.pubs.find((x) => x.Title === it.pubId) : null;
      const fPub = it.fecha || (p ? M().dia(p.fecha) : '');
      const campos = { red: it.red, tipo: it.tipo, nombre: M().nombreCorto(it.texto || (p && p.titulo) || it.enlace || 'Sin título') || 'Sin título',
        publicacion_id: it.pubId || '', tema_id: p ? (p.tema_id || '') : '', fecha_publicacion: fPub || null,
        fecha_campana: (p ? M().lunesDe(M().dia(p.fecha)) : fPub ? M().lunesDe(fPub) : null) };
      if (tiene('fecha_corte')) campos.fecha_corte = ST.corte;
      if (tiene('enlace_post') && it.enlace) campos.enlace_post = it.enlace.slice(0, 255);
      if (tiene('post_id') && it.post_id) campos.post_id = it.post_id.slice(0, 100);
      NUMERICOS.forEach((c) => { if (it[c] !== null && it[c] !== undefined) campos[c] = it[c]; });
      const m = it.metId ? App.mets.find((x) => x.Title === it.metId) : null;
      if (m) {
        if (m.notas && !/importad/i.test(m.notas)) delete campos.nombre;   // conserva el nombre escrito a mano
        await G.actualizar(L.mets, m._id, campos); Object.assign(m, campos); hechos.actualizadas++;
      } else {
        const id = 'MET-' + M().pad(await G.siguiente('MET'), 5);
        const nuevo = await G.crear(L.mets, Object.assign({ Title: id, registrado_por: App.usuario.nombre, notas: 'Importado de ' + NOMBRE_FUENTE[ST.fuente] + ' (' + ST.archivo + ')' }, campos));
        App.mets.unshift(nuevo); it.metId = id; hechos.nuevas++;
      }
      // La publicación: guarda el link publicado y la marca como Publicada (si ya estaba aprobada o programada)
      if (p) {
        const cp = {};
        if (it.enlace && !p.link && /^https?:/i.test(it.enlace)) { cp.link = it.enlace; hechos.links++; }
        if (['Aprobada', 'Programada'].indexOf(p.estado) >= 0) { cp.estado = 'Publicada'; hechos.publicadas++; }
        if (Object.keys(cp).length) { await G.actualizar(L.pubs, p._id, cp); Object.assign(p, cp); }
      }
    }
    return hechos;
  }

  // =====================================================================
  // VISTA
  // =====================================================================
  function vista(raiz) {
    if (!ST.corte) ST.corte = M().hoyISO();
    raiz.innerHTML = '<a class="ic-volver" href="#metricas">← Métricas</a><div class="ic-barra"><div><h1 class="ic-titulo">Importar estadísticas</h1><p class="ic-subtitulo" style="margin:0">Exportaciones de Meta Business Suite, Administrador de anuncios, LinkedIn y TikTok Studio (.csv o Excel).</p></div></div>' +
      (App.colsMet && App.colsMet.indexOf('fecha_corte') < 0 ? '<div class="gen-aviso">⚠️ La lista de métricas aún no tiene las columnas nuevas (fecha de corte, enlace e id del post). Abra el <a href="/ideascontrol/Programacion/Instalador/" target="_blank" rel="noopener">instalador</a> y haga clic en «Crear estructura». Mientras tanto se importa igual, pero sin poder actualizar por enlace del post.</div>' : '') +
      '<section class="ic-bloque gen-paso"><div class="cab"><h2><span class="gen-n">1</span> Archivo</h2></div><div class="cuerpo"><div class="ic-form"><div class="ic-campos">' +
        '<div class="ic-campo c6"><label for="iArch">Archivo exportado</label><input type="file" id="iArch" accept=".csv,.xlsx,.xls"><span class="ayuda">Puede importar varias veces el mismo post con otro rango: se actualizan sus números.</span></div>' +
        '<div class="ic-campo c3"><label for="iCorte">Números con corte al</label><input type="date" id="iCorte" value="' + esc(ST.corte) + '"><span class="ayuda">Facebook, Instagram, LinkedIn y TikTok: el día en que descargó el archivo (los números son acumulados de cada post). Anuncios: se toma el fin del informe.</span></div>' +
      '</div></div><details class="mkt-hist" style="margin-top:8px"><summary>¿Dónde descargo cada archivo?</summary><ul>' +
        '<li><b>Facebook e Instagram:</b> Meta Business Suite › Estadísticas › Contenido › elija la página o cuenta y el rango de fechas de publicación › ícono de exportar › CSV. Un archivo por red.</li>' +
        '<li><b>Pauta:</b> Administrador de anuncios › Anuncios › rango de fechas › Informes › Exportar datos de la tabla. Ponga el PUB-… en el nombre del anuncio para que se asocie solo.</li>' +
        '<li><b>LinkedIn:</b> página de Ideas Control › Análisis › Publicaciones › Exportar (XLS).</li>' +
        '<li><b>TikTok:</b> TikTok Studio › Análisis › Contenido › Descargar datos.</li></ul></details></div></section>' +
      '<div id="iPaso2"></div>';
    raiz.querySelector('#iCorte').onchange = (e) => { ST.corte = e.target.value || M().hoyISO(); if (ST.filas.length && raiz.querySelector('#iPaso2 .gen-paso')) { construir(); pintarPaso2(raiz); } };
    raiz.querySelector('#iArch').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const c = raiz.querySelector('#iPaso2'); c.innerHTML = '<p class="sec">Leyendo ' + esc(f.name) + '…</p>';
      try {
        const d = await leerArchivo(f);
        Object.assign(ST, { archivo: f.name, fuente: d.fuente, cab: d.cab, filas: d.a.slice(d.fila + 1).filter((r) => (r || []).some((x) => String(x).trim() !== '')), red: '', fmtFecha: 'auto' });
        ST.mapa = mapaInicial(ST.fuente, ST.cab, ST.filas);
        // Corte sugerido: el «fin del informe» del archivo de anuncios, si viene
        const iFin = ST.cab.findIndex((x) => iguala(x, ['fin del informe', 'reporting ends']));
        if (iFin >= 0 && ST.filas[0]) { const fin = fechaISO(ST.filas[0][iFin], 'md'); if (fin) { ST.corte = fin; raiz.querySelector('#iCorte').value = fin; } }
        construir(); pintarPaso2(raiz);
      } catch (err) { console.error(err); c.innerHTML = '<div class="gen-error">' + esc(err.message || String(err)) + '</div>'; }
    };
    if (ST.items.length) pintarPaso2(raiz);
  }

  function pintarPaso2(raiz) {
    const c = raiz.querySelector('#iPaso2');
    const opCab = (k) => '<option value="">— no viene —</option>' + ST.cab.map((h, i) => h ? '<option value="' + i + '"' + (ST.mapa[k] === i ? ' selected' : '') + '>' + esc(h) + '</option>' : '').join('');
    const asociadas = ST.items.filter((x) => x.pubId).length, actualiza = ST.items.filter((x) => x.metId).length;
    const opPubs = (it) => {
      const cand = App.pubs.filter((p) => p.estado !== 'Cancelada' && (redesDe(p.canal).indexOf(it.red) >= 0 || p.Title === it.pubId))
        .filter((p) => !it.fecha || Math.abs((new Date(M().dia(p.fecha)) - new Date(it.fecha)) / 864e5) <= 10 || p.Title === it.pubId)
        .sort((a, b) => M().dia(a.fecha).localeCompare(M().dia(b.fecha)));
      return '<option value="">— Sin vincular —</option>' + cand.map((p) => '<option value="' + esc(p.Title) + '"' + (p.Title === it.pubId ? ' selected' : '') + '>' + esc(p.Title + ' · ' + M().fCorta(p.fecha) + ' · ' + p.canal + ' · ' + String(p.titulo || '').slice(0, 40)) + '</option>').join('');
    };
    c.innerHTML = '<section class="ic-bloque gen-paso"><div class="cab"><h2><span class="gen-n">2</span> Columnas</h2></div><div class="cuerpo">' +
        '<p class="sec" style="margin-top:0">Archivo de <b>' + esc(NOMBRE_FUENTE[ST.fuente]) + '</b> · ' + ST.filas.length + ' filas. Revise que cada dato tome la columna correcta.</p>' +
        '<div class="ic-form"><div class="ic-campos">' +
        CAMPOS.filter(([k]) => k !== 'plataforma' || ST.fuente === 'ads').map(([k, l]) => '<div class="ic-campo c3"><label>' + esc(l) + '</label><select data-map="' + k + '">' + opCab(k) + '</select></div>').join('') +
        '<div class="ic-campo c3"><label for="iRed">Red si el archivo no la dice</label><select id="iRed">' + M().opciones(CFG.redes, ST.red, 'Detectar') + '</select></div>' +
        '<div class="ic-campo c3"><label for="iFmt">Formato de fecha</label><select id="iFmt"><option value="auto"' + (ST.fmtFecha === 'auto' ? ' selected' : '') + '>Detectar (' + (ST.ambiguo ? 'según la fecha de corte' : ST.fmtUsado === 'md' ? 'mes/día' : 'día/mes') + ')</option><option value="dm"' + (ST.fmtFecha === 'dm' ? ' selected' : '') + '>Día/mes/año</option><option value="md"' + (ST.fmtFecha === 'md' ? ' selected' : '') + '>Mes/día/año</option></select></div>' +
        '</div></div></div></section>' +
      '<section class="ic-bloque gen-paso"><div class="cab"><h2><span class="gen-n">3</span> Revisar y guardar</h2></div><div class="cuerpo">' +
        '<p class="sec" style="margin-top:0">' + ST.items.length + ' posts · ' + asociadas + ' asociados a una publicación · ' + actualiza + ' ya tenían métricas (se actualizan) · ' + (ST.items.length - actualiza) + ' nuevos.</p>' +
        '<div class="ic-tabla-caja mkt-scroll"><table class="ic-tabla gen-tabla"><thead><tr><th></th><th>Post</th><th>Red</th><th>Publicación del portal</th><th class="n">Alcance</th><th class="n">Impr. / vistas</th><th class="n">Interac.</th><th class="n">Clics</th><th class="n">Inversión</th><th>Métrica</th></tr></thead><tbody>' +
        ST.items.map((it, i) => {
          const inter = ['reacciones', 'comentarios', 'compartidos', 'guardados'].reduce((s, k) => s + (it[k] || 0), 0);
          return '<tr><td><input type="checkbox" data-inc="' + i + '"' + (it.incluir ? ' checked' : '') + ' aria-label="Incluir"></td>' +
            '<td class="mkt-nomcel"><b class="mkt-nom" title="' + esc(it.texto || '') + '">' + esc(M().nombreCorto(it.texto || it.enlace || '—')) + '</b><span class="sec">' + esc(it.fecha ? M().fLarga(it.fecha) : 'sin fecha') + (it.tipo === 'Pago' ? ' · Pago' : '') + '</span></td>' +
            '<td>' + esc(it.red) + '</td>' +
            '<td><select data-pub="' + i + '" style="max-width:260px">' + opPubs(it) + '</select>' + (it.como ? '<span class="sec">por ' + esc(it.como) + '</span>' : '') + '</td>' +
            '<td class="n">' + (it.alcance === null ? '—' : Math.round(it.alcance).toLocaleString('es-CO')) + '</td><td class="n">' + (it.impresiones !== null ? Math.round(it.impresiones).toLocaleString('es-CO') : it.reproducciones !== null ? Math.round(it.reproducciones).toLocaleString('es-CO') : '—') + '</td>' +
            '<td class="n">' + inter.toLocaleString('es-CO') + '</td><td class="n">' + (it.clics === null ? '—' : Math.round(it.clics).toLocaleString('es-CO')) + '</td><td class="n">' + (it.inversion ? U.fmt.cop(it.inversion) : '—') + '</td>' +
            '<td class="nw">' + (it.metId ? 'Actualiza ' + esc(it.metId) : 'Nueva') + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="ic-acciones" style="justify-content:flex-start;margin-top:12px"><button class="ic-btn" id="iGuardar">Guardar métricas</button></div><div id="iRes"></div></div></section>';

    c.querySelectorAll('[data-map]').forEach((s) => { s.onchange = () => { const v = s.value; if (v === '') delete ST.mapa[s.dataset.map]; else ST.mapa[s.dataset.map] = +v; construir(); pintarPaso2(raiz); }; });
    c.querySelector('#iRed').onchange = (e) => { ST.red = e.target.value; construir(); pintarPaso2(raiz); };
    c.querySelector('#iFmt').onchange = (e) => { ST.fmtFecha = e.target.value; construir(); pintarPaso2(raiz); };
    c.querySelectorAll('[data-inc]').forEach((ch) => { ch.onchange = () => { ST.items[+ch.dataset.inc].incluir = ch.checked; }; });
    c.querySelectorAll('[data-pub]').forEach((s) => { s.onchange = () => { const it = ST.items[+s.dataset.pub]; it.pubId = s.value; it.como = s.value ? 'a mano' : ''; buscarMetrica(it); pintarPaso2(raiz); }; });
    c.querySelector('#iGuardar').onclick = async () => {
      const n = ST.items.filter((x) => x.incluir).length;
      if (!n) { U.aviso('No hay posts marcados.', 'warn'); return; }
      if (!(await U.confirmar('Guardar métricas', 'Se guardarán ' + n + ' registros con corte al ' + M().fLarga(ST.corte) + '. Los que ya existían se actualizan con estos números.', 'Guardar'))) return;
      const res = c.querySelector('#iRes');
      await U.conCarga(c.querySelector('#iGuardar'), async () => {
        try {
          const h = await guardar((m) => { res.innerHTML = '<p class="sec">' + esc(m) + '</p>'; });
          res.innerHTML = '<div class="gen-ok"><b>✅ Listo.</b> ' + h.nuevas + ' nuevas · ' + h.actualizadas + ' actualizadas' + (h.links ? ' · ' + h.links + ' publicaciones con su link publicado' : '') + (h.publicadas ? ' · ' + h.publicadas + ' pasaron a «Publicada»' : '') +
            '. <a href="#metricas">Ver métricas</a> · <a href="#resumen">Ver resumen</a></div>';
          U.aviso('Métricas guardadas', 'ok');
          ST.items.forEach((it) => buscarMetrica(it));
        } catch (e) { console.error(e); res.innerHTML = '<div class="gen-error">' + esc(U.mensajeError(e)) + '</div>'; }
      });
    };
  }

  return { vista, _numero: numero, _fecha: fechaISO, _detectar: detectar };
})();
