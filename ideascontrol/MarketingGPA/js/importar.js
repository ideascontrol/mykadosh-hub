/* =====================================================================
   Marketing GPA — importar estadísticas exportadas (Meta Business Suite, LinkedIn, TikTok Studio)
   Lee .csv / .xlsx, reconoce las columnas, propone a qué publicación del plan corresponde cada fila
   (red + fecha + parecido del texto) y guarda en la hoja «Métricas» del Excel.
   ===================================================================== */
window.GPA_IMP = (function () {
  const U = IC.ui;
  const CAMPOS = ['texto', 'enlace', 'fecha', 'plataforma', 'alcance', 'impresiones', 'reacciones', 'comentarios', 'compartidos', 'guardados', 'clics', 'nuevos_seguidores', 'reproducciones'];
  const S = {
    meta: {
      enlace: ['enlace permanente', 'permalink'], fecha: ['hora de publicacion', 'publish time', 'fecha de publicacion'], texto: ['titulo', 'title', 'descripcion', 'description'],
      plataforma: ['plataforma', 'platform', 'tipo de cuenta'], alcance: ['alcance', 'reach', 'cuentas alcanzadas', 'espectadores', 'viewers'], impresiones: ['visualizaciones', 'views', 'impresiones', 'impressions'],
      reacciones: ['reacciones', 'reactions', 'me gusta', 'likes'], comentarios: ['comentarios', 'comments'], compartidos: ['veces que se compartio', 'compartidos', 'shares', 'veces compartido'],
      guardados: ['guardados', 'saves', 'veces que se guardo'], clics: ['clics en el enlace', 'link clicks', 'total de clics', 'clics totales', 'total clicks', 'clics'],
      nuevos_seguidores: ['seguimientos', 'follows', 'nuevos seguidores'], reproducciones: ['reproducciones', 'plays', 'reproducciones de video de 3 segundos', '3-second video views']
    },
    linkedin: {
      enlace: ['post link', 'enlace de la publicacion', 'enlace de la actualizacion', 'update link'], fecha: ['created date', 'fecha de creacion', 'fecha de publicacion', 'date'],
      texto: ['post title', 'titulo de la publicacion', 'titulo de la actualizacion', 'update title'], impresiones: ['impressions', 'impresiones'], clics: ['clicks', 'clics'],
      reacciones: ['likes', 'reactions', 'reacciones', 'recomendaciones'], comentarios: ['comments', 'comentarios'], compartidos: ['reposts', 'shares', 'veces compartido', 'compartidos', 'difusiones'],
      nuevos_seguidores: ['follows', 'seguimientos'], reproducciones: ['views', 'visualizaciones', 'video views']
    },
    tiktok: {
      enlace: ['video link', 'enlace del video', 'link', 'enlace'], fecha: ['post time', 'hora de publicacion', 'fecha de publicacion', 'date posted', 'publicado'],
      texto: ['video title', 'titulo del video', 'title', 'titulo', 'descripcion'], reproducciones: ['total views', 'video views', 'views', 'visualizaciones', 'visualizaciones de video', 'reproducciones'],
      reacciones: ['total likes', 'likes', 'me gusta'], comentarios: ['total comments', 'comments', 'comentarios'], compartidos: ['total shares', 'shares', 'compartidos', 'veces compartido'],
      guardados: ['add to favorites', 'favorites', 'favoritos', 'guardados'], alcance: ['reached audience', 'audiencia alcanzada', 'alcance', 'total reach'], nuevos_seguidores: ['new followers', 'nuevos seguidores']
    }
  };
  const NOMBRE = { meta: 'Meta Business Suite (Facebook / Instagram)', linkedin: 'LinkedIn', tiktok: 'TikTok Studio' };
  const nz = (s) => U.norm(String(s == null ? '' : s)).replace(/\s+/g, ' ').trim();
  const iguala = (c, sin) => { c = nz(c); return sin.some((x) => c === x || c.indexOf(x + ' (') === 0); };
  function cargarXLSX() {
    if (window.XLSX) return Promise.resolve();
    return new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar la librería de Excel.')); document.head.appendChild(s); });
  }
  function detectar(a) {
    let mejor = null;
    for (let i = 0; i < Math.min(12, a.length); i++) {
      const cab = (a[i] || []).map((x) => String(x || '').trim()); if (cab.filter(Boolean).length < 3) continue;
      Object.keys(S).forEach((f) => { let p = 0; Object.keys(S[f]).forEach((k) => { if (cab.some((c) => iguala(c, S[f][k]))) p++; }); if (!mejor || p > mejor.puntos) mejor = { fuente: f, fila: i, cab, puntos: p }; });
    }
    return mejor && mejor.puntos >= 3 ? mejor : null;
  }
  async function leerArchivo(file) {
    await cargarXLSX();
    const buf = await file.arrayBuffer(), csv = /\.csv$/i.test(file.name);
    const wb = XLSX.read(buf, csv ? { type: 'array', raw: true, codepage: 65001 } : { type: 'array', cellDates: true });
    let mejor = null;
    wb.SheetNames.forEach((n) => { const a = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' }); const d = detectar(a); if (d && (!mejor || d.puntos > mejor.puntos)) mejor = Object.assign({ a }, d); });
    if (!mejor) throw new Error('No reconocí columnas de estadísticas. ¿Es la exportación de Meta, LinkedIn o TikTok?');
    const filas = mejor.a.slice(mejor.fila + 1).filter((r) => r.some((x) => String(x).trim()));
    const m = {}, usados = {};
    const conDatos = (j) => filas.some((r) => String(r[j] == null ? '' : r[j]).trim() !== '');
    CAMPOS.forEach((k) => {
      const sin = S[mejor.fuente][k]; if (!sin) return;
      const cand = []; sin.forEach((x) => mejor.cab.forEach((c, j) => { if (!usados[j] && cand.indexOf(j) < 0 && (nz(c) === x || nz(c).indexOf(x + ' (') === 0)) cand.push(j); }));
      const j = cand.find(conDatos), e = j !== undefined ? j : cand[0]; if (e !== undefined) { m[k] = e; usados[e] = true; }
    });
    return { fuente: mejor.fuente, cab: mejor.cab, mapa: m, filas };
  }
  function numero(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    let s = String(v).replace(/[\s$%]|COP|USD/gi, ''); if (!s || s === '-' || /^n\/?a$/i.test(s)) return null;
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, ''); else s = s.replace(',', '.');
    const n = Number(s); return isFinite(n) ? n : null;
  }
  // Fecha; si es ambigua (03/11 vs 11/03) se elige la más cercana a la fecha de corte
  function fecha(v, corte) {
    const p2 = (n) => String(n).padStart(2, '0');
    if (v instanceof Date && !isNaN(v)) return v.getFullYear() + '-' + p2(v.getMonth() + 1) + '-' + p2(v.getDate());
    if (typeof v === 'number') return GPA_XL.serialAIso(v);
    const s = String(v || '').trim(); let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return m[1] + '-' + p2(m[2]) + '-' + p2(m[3]);
    m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
    if (m) {
      let a = +m[1], b = +m[2], y = +m[3]; if (y < 100) y += 2000;
      const dm = y + '-' + p2(b) + '-' + p2(a), md = y + '-' + p2(a) + '-' + p2(b);
      if (a > 12) return dm; if (b > 12) return md;
      const dist = (x) => Math.abs(new Date(x) - new Date(corte || x));
      return corte && dist(md) < dist(dm) ? md : dm;
    }
    return '';
  }
  const palabras = (t) => new Set(nz(t).replace(/[^a-z0-9ñ ]/g, ' ').split(' ').filter((w) => w.length > 3));
  function parecido(a, b) { const A = palabras(a), B = palabras(b); if (!A.size || !B.size) return 0; let n = 0; A.forEach((w) => { if (B.has(w)) n++; }); return n / Math.min(A.size, B.size); }
  // Red de la fila
  function redDe(fuente, r) {
    if (fuente === 'tiktok') return 'TikTok';
    if (fuente === 'linkedin') return 'LinkedIn';
    const t = nz((r.plataforma || '') + ' ' + (r.enlace || ''));
    return /instagram/.test(t) ? 'Instagram' : /facebook|fb\.com/.test(t) ? 'Facebook' : '';
  }
  // Propone la publicación del plan para cada fila
  function emparejar(d, corte) {
    const usadas = new Set();
    return d.filas.map((raw) => {
      const r = {}; Object.keys(d.mapa).forEach((k) => { r[k] = raw[d.mapa[k]]; });
      r.fecha = fecha(r.fecha, corte); r.red = redDe(d.fuente, r);
      const cands = App.pubs.filter((p) => (!r.red || p.canal.indexOf(r.red) === 0) && r.fecha && Math.abs(new Date(p.fecha) - new Date(r.fecha)) <= 864e5 * 1.5);
      let mejor = null, punt = -1;
      cands.forEach((p) => { const s = parecido(r.texto || '', (p.copyFinal || '') + ' ' + p.gancho + ' ' + p.texto) + (p.fecha === r.fecha ? 0.3 : 0) - (usadas.has(p.id) ? 1 : 0); if (s > punt) { punt = s; mejor = p; } });
      if (mejor && punt > 0.15) usadas.add(mejor.id); else mejor = null;
      const n = {}; ['alcance', 'impresiones', 'reacciones', 'comentarios', 'compartidos', 'guardados', 'clics', 'nuevos_seguidores', 'reproducciones'].forEach((k) => { n[k] = numero(r[k]); });
      return { r, n, pub: mejor ? mejor.id : '', cands: cands.map((p) => p.id) };
    }).filter((x) => x.r.fecha);
  }
  return { leerArchivo, emparejar, NOMBRE };
})();
