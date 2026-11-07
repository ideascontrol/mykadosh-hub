/* =====================================================================
   De Dios para el camino · Lectura diaria (uso personal, solo operaciones@)
   Vistas:  #            Día: elegir 1 de los 3 versículos, documentar en el Word, prompt de imagen, texto para Facebook
            #generar     3 versículos por día con Claude (prompt maestro) -> se agregan al Excel
            #dias        Estado de los días, de la semana elegida hacia atrás; semana a publicar y hashtags
            #archivos    Excel y Word en SharePoint, PDF, plantillas de los prompts
   Excel: se lee y escribe con la API de Excel de Microsoft 365 (conserva formato y fórmulas).
   Word:  se abre el .docx, se reemplaza la entrada de la fecha (o se crea en su lugar) y se vuelve a guardar.
          SharePoint guarda el historial de versiones de ambos archivos.
   ===================================================================== */
const App = { usuario: null, ex: null, plan: null, word: null, dia: '', lect: null };

(function () {
  const U = IC.ui, esc = U.esc, G = IC.graph, C = CFG.col, P = window.LD_PROMPTS;
  const BASE = 'https://graph.microsoft.com/v1.0';
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const COLS = 'BCDEFGHIJK';
  const pad = (n) => String(n).padStart(2, '0');
  const hoy = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const sumar = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const dmy = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);
  const largo = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const corto = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
  const serialAIso = (v) => { if (typeof v !== 'number' || !isFinite(v) || v < 20000) return ''; const d = new Date(Math.round((v - 25569) * 864e5)); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); };
  const isoASerial = (iso) => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5) + 25569;
  const ruta = (r) => r.split('/').map(encodeURIComponent).join('/');
  let sid = '';
  const item = (r) => '/sites/' + sid + '/drive/root:/' + ruta(r);
  const hoja = (n) => "/workbook/worksheets('" + encodeURIComponent(n) + "')";

  async function copiar(txt, msg) {
    try { await navigator.clipboard.writeText(txt); U.aviso(msg || 'Copiado', 'ok'); }
    catch (e) { U.modal('Copiar', '<div class="ic-form"><textarea rows="14" style="width:100%">' + esc(txt) + '</textarea><p class="sec">Selecciónelo y cópielo con Ctrl+C.</p></div>'); }
  }
  function errorArchivo(e) {
    if (e && (e.status === 423 || /locked|bloquead/i.test(e.message || ''))) return 'El archivo está abierto o bloqueado. Ciérrelo en Word/Excel (también en el navegador) y vuelva a intentar.';
    if (e && e.status === 404) return 'No encontré el archivo en SharePoint. Revise la pestaña «Archivos».';
    return U.mensajeError(e);
  }

  // =====================================================================
  // EXCEL (API de Excel de Microsoft 365)
  // =====================================================================
  async function leerExcel() {
    const base = item(CFG.excel) + ':';
    const [cont, plan] = await Promise.all([
      G.llamar('GET', base + hoja(CFG.hojas.contenido) + '/usedRange?$select=address,values,formulas'),
      G.llamar('GET', base + hoja(CFG.hojas.plan) + '/usedRange?$select=address,values')
    ]);
    // Plan de lectura: fecha -> capítulos
    App.plan = {};
    (plan.values || []).forEach((r) => { const f = serialAIso(r[0]); if (f && r[1]) App.plan[f] = String(r[1]).trim(); });
    // Contenido: una fila por versículo
    const m = String(cont.address || '').split('!')[1].match(/^\$?([A-Z]+)\$?(\d+)/);
    const col0 = m[1].charCodeAt(0) - 65, fila0 = +m[2];
    const idx = (L) => L.charCodeAt(0) - 65 - col0;
    const filas = (cont.values || []).map((v, i) => {
      const f = (cont.formulas || [])[i] || [];
      const g = (L) => { const k = idx(L); return k >= 0 ? v[k] : ''; };
      const gf = (L) => { const k = idx(L); return k >= 0 ? f[k] : ''; };
      return { fila: fila0 + i, publicado: String(g(C.publicado) || '').trim(), prompt: String(gf(C.prompt) || '').trim(), fecha: serialAIso(g(C.fecha)),
        ref: String(g(C.ref) || '').trim(), texto: String(g(C.texto) || '').trim(), categoria: String(g(C.categoria) || '').trim(), idea: String(g(C.idea) || '').trim(),
        recuerda: String(g(C.recuerda) || '').trim(), aplicacion: String(g(C.aplicacion) || '').trim(), imagen: String(g(C.imagen) || '').trim() };
    }).filter((r) => r.fila > 1);
    App.ex = { filas, ultima: fila0 + (cont.values || []).length - 1 };
    return App.ex;
  }
  const deDia = (f) => App.ex.filas.filter((r) => r.fecha === f && r.ref);
  const sinFecha = () => App.ex.filas.filter((r) => !r.fecha && r.ref && r.fila > (App.ex.filas.filter((x) => x.fecha).pop() || { fila: 0 }).fila);
  const elegida = (f) => deDia(f).find((r) => r.prompt) || null;
  async function escribir(rango, formulas, formatoFecha) {
    await G.llamar('PATCH', item(CFG.excel) + ':' + hoja(CFG.hojas.contenido) + "/range(address='" + rango + "')", { formulas });
    if (formatoFecha) await G.llamar('PATCH', item(CFG.excel) + ':' + hoja(CFG.hojas.contenido) + "/range(address='" + formatoFecha + "')", { numberFormat: [[CFG.formatoFecha]] });
  }
  // Texto de Excel seguro (que no empiece como fórmula)
  const tx = (s) => { s = String(s == null ? '' : s); return /^[=+\-@]/.test(s) ? "'" + s : s; };
  // Fórmula de la columna C (prompt de imagen) para la fila, a partir de la plantilla; literales de máximo 200 caracteres
  function formulaPrompt(fila) {
    const plantilla = (App.plantillas.imagen || P.imagen);
    const refs = { referencia: C.ref, texto: C.texto, aplicacion: C.aplicacion, sugerencia: C.imagen };
    const partes = [];
    plantilla.split(/(\{referencia\}|\{texto\}|\{aplicacion\}|\{sugerencia\})/).forEach((p) => {
      const k = (p.match(/^\{(\w+)\}$/) || [])[1];
      if (k && refs[k]) partes.push(refs[k] + fila);
      else if (p) p.replace(/\r/g, '').split('\n').forEach((l, j) => {
        if (j) partes.push('CHAR(10)');
        for (let i = 0; i < l.length; i += 200) partes.push('"' + l.slice(i, i + 200).replace(/"/g, '""') + '"');
      });
    });
    return '=' + partes.join('&');
  }
  function promptImagen(r) {
    return (App.plantillas.imagen || P.imagen).replace(/\{referencia\}/g, r.ref).replace(/\{texto\}/g, r.texto || '').replace(/\{aplicacion\}/g, r.aplicacion).replace(/\{sugerencia\}/g, r.imagen || '');
  }
  const tituloDia = (f) => dmy(f) + ' – ' + String(App.plan[f] || '').replace(/[–—]/g, '-');
  // Texto para Facebook: sin la cita ni el texto bíblico (van en la imagen); al final los hashtags de la semana
  function textoFacebook(r, f) {
    return [r.idea, r.recuerda, r.aplicacion, CFG.cierre, hashtagsDe(f || r.fecha)].filter(Boolean).join('\n\n');
  }

  // =====================================================================
  // CONFIGURACIÓN PERSONAL: semana a publicar y hashtags por semana (JSON junto al Excel y al Word)
  // =====================================================================
  const lunesDe = (iso) => { const d = new Date(iso + 'T12:00:00'); return sumar(iso, -((d.getDay() + 6) % 7)); };
  // Sábado y domingo ya se prepara la semana siguiente
  const semanaDefecto = () => { const d = new Date().getDay(); return lunesDe(d === 6 || d === 0 ? sumar(hoy(), 2) : hoy()); };
  App.conf = { semana: '', hashtags: {} };
  async function leerConf() {
    try {
      const m = await G.llamar('GET', item(CFG.config)); const r = await fetch(m['@microsoft.graph.downloadUrl']);
      if (r.ok) { const j = JSON.parse(await r.text()); App.conf = { semana: j.semana || '', hashtags: j.hashtags || {} }; }
    } catch (e) { /* todavía no existe */ }
  }
  async function guardarConf() { await G.subirArchivo(CFG.config, new Blob([JSON.stringify(App.conf, null, 2)], { type: 'application/json' })); }
  // Semana a publicar (lunes): la elegida, pero nunca anterior a la semana en curso
  const semanaPub = () => { const d = semanaDefecto(); return App.conf.semana && App.conf.semana > d ? App.conf.semana : d; };
  const domingoPub = () => sumar(semanaPub(), 6);
  const hashtagsDe = (f) => (f && App.conf.hashtags[lunesDe(f)]) || CFG.hashtags;
  const rangoSemana = (lun) => corto(lun) + ' – ' + corto(sumar(lun, 6));

  // =====================================================================
  // WORD (.docx con JSZip)
  // =====================================================================
  function cargarZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    return new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; s.onload = () => ok(window.JSZip); s.onerror = () => mal(new Error('No se pudo cargar la librería para abrir el Word.')); document.head.appendChild(s); });
  }
  async function leerWord() {
    const Z = await cargarZip();
    const meta = await G.llamar('GET', item(CFG.word));
    const r = await fetch(meta['@microsoft.graph.downloadUrl']); if (!r.ok) throw new Error('No se pudo descargar el Word (' + r.status + ').');
    const zip = await Z.loadAsync(await r.arrayBuffer());
    const xml = await zip.file('word/document.xml').async('string');
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('No se pudo leer el contenido del Word.');
    App.word = { zip, doc, meta };
    return App.word;
  }
  const hijosW = (el, n) => Array.from(el.childNodes).filter((x) => x.nodeType === 1 && x.namespaceURI === W && x.localName === n);
  const textoP = (p) => Array.from(p.getElementsByTagNameNS(W, 't')).map((t) => t.textContent).join('');
  const estiloP = (p) => { const pp = hijosW(p, 'pPr')[0], ps = pp && hijosW(pp, 'pStyle')[0]; return ps ? ps.getAttributeNS(W, 'val') : ''; };
  const RE_FECHA = /^\s*(\d{2})\/(\d{2})\/(\d{4})\s*[–—-]/;
  const RE_HASH = /^#[^\s#]+(\s+#[^\s#]+)*$/;
  const PENDIENTE = 'Pendiente';
  const MESES = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12 };
  const esSalto = (el) => Array.from(el.getElementsByTagNameNS(W, 'br')).some((b) => b.getAttributeNS(W, 'type') === 'page');
  // Secciones del Word: cada título (estilo de las entradas) con su contenido hasta el siguiente título.
  // fecha = la del título («DD/MM/AAAA – …», «Abr 19») o, si no tiene, la del título anterior.
  function entradas(doc) {
    const body = doc.getElementsByTagNameNS(W, 'body')[0];
    const todos = Array.from(body.childNodes).filter((x) => x.nodeType === 1);
    let estilo = '';
    for (const p of todos) { if (p.localName !== 'p') continue; const s = estiloP(p); if (RE_FECHA.test(textoP(p)) && s && !/^(TOC|TDC)/i.test(s)) { estilo = s; break; } }
    const lista = []; let fAnt = '';
    todos.forEach((el, i) => {
      if (el.localName !== 'p' || !estilo || estiloP(el) !== estilo) return;
      const t = textoP(el).trim(); if (!t) return;
      let fecha = '', propia = '';
      const m = t.match(RE_FECHA);
      if (m) fecha = propia = m[3] + '-' + m[2] + '-' + m[1];
      else { const a = t.match(/^(ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)[a-záéíóú]*\.?\s+(\d{1,2})\b/i); fecha = a ? (fAnt || hoy()).slice(0, 4) + '-' + pad(MESES[a[1].toLowerCase()]) + '-' + pad(+a[2]) : fAnt; }
      if (fecha) fAnt = fecha;
      const bm = hijosW(el, 'bookmarkStart').find((b) => /^_Toc/.test(b.getAttributeNS(W, 'name') || ''));
      lista.push({ p: el, i, titulo: t, fecha, propia, ancla: bm ? bm.getAttributeNS(W, 'name') : '' });
    });
    const fin = todos.findIndex((x) => x.localName === 'sectPr');
    lista.forEach((s, k) => { s.els = todos.slice(s.i + 1, k + 1 < lista.length ? lista[k + 1].i : (fin >= 0 ? fin : todos.length)); });
    return { body, todos, estilo, lista };
  }
  const contenido = (s) => s.els.filter((el) => el.localName !== 'p' || textoP(el).trim()).map((el) => el.localName === 'p' ? textoP(el).trim() : '[tabla]').filter((t) => t !== CFG.cierre && !RE_HASH.test(t));
  const esPendiente = (s) => { const c = contenido(s); return !c.length || c[0] === PENDIENTE || c[0].indexOf(CFG.relleno) === 0; };
  function estadoWord(f) {
    if (!App.word) return '';
    const es = entradas(App.word.doc).lista.filter((e) => e.propia === f);
    return es.some((e) => !esPendiente(e)) ? 'ok' : 'pendiente';
  }
  // Párrafo nuevo clonando el formato (pPr y rPr del primer run) de un párrafo modelo
  function parrafo(doc, modelo, texto) {
    const p = doc.createElementNS(W, 'w:p');
    const pPr = modelo && hijosW(modelo, 'pPr')[0];
    if (pPr) p.appendChild(pPr.cloneNode(true));
    const r = doc.createElementNS(W, 'w:r');
    const r0 = modelo && modelo.getElementsByTagNameNS(W, 'r')[0], rPr = r0 && hijosW(r0, 'rPr')[0];
    if (rPr) r.appendChild(rPr.cloneNode(true));
    const t = doc.createElementNS(W, 'w:t'); t.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve'); t.textContent = texto;
    r.appendChild(t); p.appendChild(r);
    return p;
  }
  // Quita el contenido de una entrada (hasta su último párrafo con texto; deja los espacios y saltos de página de después)
  function vaciar(s) {
    let k = -1; s.els.forEach((el, j) => { if (el.localName !== 'p' || textoP(el).trim()) k = j; });
    s.els.slice(0, k + 1).forEach((el) => { if (!(el.localName === 'p' && esSalto(el)) && el.parentNode) el.parentNode.removeChild(el); });
  }
  function quitarEntrada(s) { s.els.forEach((el) => el.parentNode && el.parentNode.removeChild(el)); if (s.p.parentNode) s.p.parentNode.removeChild(s.p); }
  // Crea o reemplaza la entrada de una fecha. r = versículo elegido, o null para dejarla «Pendiente».
  function documentar(f, r) {
    const doc = App.word.doc, E = entradas(doc);
    if (!E.estilo) throw new Error('No encontré en el Word las entradas por fecha («DD/MM/AAAA – Lectura»).');
    // Modelo de formato: la entrada documentada más reciente
    const modelo = E.lista.find((e) => e.propia && !esPendiente(e) && e.els.some((el) => textoP(el).trim() === CFG.cierre)) || E.lista.find((e) => e.propia) || E.lista[0];
    const mb = modelo.els.filter((el) => el.localName === 'p' && textoP(el).trim());
    const mTexto = mb[0] || null, mCierre = mb.find((el) => textoP(el).trim() === CFG.cierre) || mTexto;
    const nuevos = [parrafo(doc, modelo.p, tituloDia(f))].concat(r
      ? [parrafo(doc, mTexto, (r.ref + ' ' + (r.texto || '')).trim()), parrafo(doc, mTexto, r.idea), parrafo(doc, mTexto, r.recuerda), parrafo(doc, mTexto, r.aplicacion), parrafo(doc, mCierre, CFG.cierre)]
      : [parrafo(doc, mTexto, PENDIENTE)]);
    const mismas = E.lista.filter((e) => e.propia === f);
    if (mismas.length) {
      // la que está en orden (la siguiente entrada es de una fecha anterior); si no, la última
      const enOrden = mismas.find((e) => { const sig = E.lista[E.lista.indexOf(e) + 1]; return sig && sig.fecha < f; }) || mismas[mismas.length - 1];
      let ancla = enOrden.p;
      nuevos.forEach((n) => { ancla.parentNode.insertBefore(n, ancla); });
      // conserva el marcador del índice del título anterior
      const bm = hijosW(enOrden.p, 'bookmarkStart')[0]; if (bm) { const pPr = hijosW(nuevos[0], 'pPr')[0]; nuevos[0].insertBefore(bm, pPr ? pPr.nextSibling : nuevos[0].firstChild); const be = hijosW(enOrden.p, 'bookmarkEnd')[0]; if (be) nuevos[0].appendChild(be); }
      vaciar(enOrden); enOrden.p.parentNode.removeChild(enOrden.p);
      let borradas = 0;
      mismas.filter((e) => e !== enOrden).forEach((e) => { if (esPendiente(e)) { quitarEntrada(e); borradas++; } });
      return 'Se reemplazó la entrada del ' + dmy(f) + (borradas ? ' y se quitó ' + borradas + ' copia(s) pendientes de esa fecha' : '') + '.';
    }
    // nueva: antes de la primera entrada de fecha anterior (el Word va de la más reciente a la más antigua)
    const antes = E.lista.find((e) => e.fecha && e.fecha < f);
    const sectPr = hijosW(E.body, 'sectPr')[0] || null;
    const ref = antes ? antes.p : sectPr;
    nuevos.forEach((n) => E.body.insertBefore(n, ref));
    return 'Se creó la entrada del ' + dmy(f) + (antes ? ' antes de la del ' + dmy(antes.fecha) : '') + '.';
  }

  // ---------- Reglas del Word: hasta el domingo de la semana a publicar, sin hashtags, índice al día ----------
  function quitarHashtags(doc) {
    const E = entradas(doc); let n = 0;
    E.lista.forEach((s) => s.els.forEach((el) => { if (el.localName === 'p' && RE_HASH.test(textoP(el).trim())) { el.parentNode.removeChild(el); n++; } }));
    return n;
  }
  // Entradas después del domingo de la semana a publicar
  const posteriores = (doc, hasta) => entradas(doc).lista.filter((s) => s.fecha && s.fecha > hasta);
  // Días de la semana a publicar (y huecos desde la última entrada): el elegido del Excel o «Pendiente»
  function completarSemana(doc) {
    const lun = semanaPub(), dom = domingoPub(), E = entradas(doc);
    const ult = E.lista.map((s) => s.propia).filter((x) => x && x < lun).sort().pop();
    let desde = lun; if (ult && sumar(ult, 1) < lun) desde = sumar(ult, 1) > sumar(lun, -14) ? sumar(ult, 1) : sumar(lun, -14);
    const hechos = [];
    for (let f = desde; f <= dom; f = sumar(f, 1)) {
      const r = App.ex ? elegida(f) : null, st = estadoWord(f), hay = entradas(doc).lista.some((s) => s.propia === f);
      if (r && st !== 'ok') { documentar(f, r); hechos.push(dmy(f)); }
      else if (!hay) { documentar(f, null); hechos.push(dmy(f) + ' (pendiente)'); }
    }
    return hechos;
  }
  // Marcadores de los títulos (los usa el índice)
  function asegurarMarcadores(doc) {
    let id = 0; Array.from(doc.getElementsByTagNameNS(W, 'bookmarkStart')).forEach((b) => { id = Math.max(id, +b.getAttributeNS(W, 'id') || 0); });
    const usados = new Set(Array.from(doc.getElementsByTagNameNS(W, 'bookmarkStart')).map((b) => b.getAttributeNS(W, 'name')));
    entradas(doc).lista.forEach((s, j) => {
      if (s.ancla) return;
      let nom = '_TocLD' + (s.propia || s.fecha || 'x').replace(/-/g, '') + '_' + j; while (usados.has(nom)) nom += 'b'; usados.add(nom);
      id++;
      const bs = doc.createElementNS(W, 'w:bookmarkStart'); bs.setAttributeNS(W, 'w:id', String(id)); bs.setAttributeNS(W, 'w:name', nom);
      const be = doc.createElementNS(W, 'w:bookmarkEnd'); be.setAttributeNS(W, 'w:id', String(id));
      const pPr = hijosW(s.p, 'pPr')[0]; s.p.insertBefore(bs, pPr ? pPr.nextSibling : s.p.firstChild); s.p.appendChild(be);
    });
  }
  // Índice (tabla de contenido): se rehace con los títulos actuales, clonando el formato de sus filas
  function filasIndice(doc) {
    // el índice puede estar dentro de un control de contenido (w:sdt)
    const ini = Array.from(doc.getElementsByTagNameNS(W, 'p')).find((el) => Array.from(el.getElementsByTagNameNS(W, 'instrText')).some((t) => /^\s*TOC\b/.test(t.textContent)));
    if (!ini) return null;
    const filas = []; for (let el = ini; el; el = el.nextElementSibling) { if (el.localName === 'p' && /^(TOC|TDC)\s?\d/i.test(estiloP(el))) filas.push(el); else break; }
    return filas.length ? filas : null;
  }
  // Páginas estimadas (si no se pueden leer del PDF): índice de ~27 filas por página y ~44 líneas por página de contenido
  function estimarPaginas(doc) {
    const E = entradas(doc), out = {};
    let pag = 1 + Math.ceil((E.lista.length + 3) / 27), L = 0, k = 0;
    const desde = E.lista.length ? E.lista[0].i : 0;
    E.todos.slice(desde).forEach((el) => {
      const s = E.lista[k]; if (s && el === s.p) { out[s.ancla] = pag + Math.floor(L / 44); k++; }
      if (el.localName === 'p') { const t = textoP(el), h = el === (s && s.p); L += Math.max(1, Math.ceil(t.length / 80)) * (h ? 1.6 : 1) + 0.3 + (h ? 2 : 0); if (esSalto(el)) L = Math.ceil(L / 44) * 44; }
      else if (el.localName === 'tbl') L += 3 * el.getElementsByTagNameNS(W, 'tr').length;
    });
    return out;
  }
  function actualizarIndice(doc, paginas) {
    const filas = filasIndice(doc); if (!filas) return false;
    const plantilla = filas.find((p) => p.getElementsByTagNameNS(W, 'hyperlink').length === 1 && p.getElementsByTagNameNS(W, 't').length === 2);
    if (!plantilla) return false;
    const pags = Object.assign(estimarPaginas(doc), paginas || {});
    const primero = filas[0], h0 = primero.getElementsByTagNameNS(W, 'hyperlink')[0];
    const prefijo = Array.from(primero.childNodes).filter((n) => n.nodeType === 1 && n.localName !== 'pPr' && (!h0 || (n.compareDocumentPosition(h0) & 4)));   // inicio del campo TOC
    const nuevas = entradas(doc).lista.filter((s) => s.ancla).map((s) => {
      const p = plantilla.cloneNode(true);
      ['paraId', 'textId'].forEach((a) => p.removeAttributeNS('http://schemas.microsoft.com/office/word/2010/wordml', a));
      p.getElementsByTagNameNS(W, 'hyperlink')[0].setAttributeNS(W, 'w:anchor', s.ancla);
      const ts = p.getElementsByTagNameNS(W, 't'); ts[0].textContent = s.titulo; ts[ts.length - 1].textContent = String(pags[s.ancla] || 1);
      Array.from(p.getElementsByTagNameNS(W, 'instrText')).forEach((it) => { if (/PAGEREF/.test(it.textContent)) it.textContent = ' PAGEREF ' + s.ancla + ' \\h '; });
      return p;
    });
    if (!nuevas.length) return false;
    // el inicio del campo (begin, instrText, separate) va al comienzo de la primera fila
    const pPr = hijosW(nuevas[0], 'pPr')[0], ref = pPr ? pPr.nextSibling : nuevas[0].firstChild;
    prefijo.forEach((n) => nuevas[0].insertBefore(n, ref));
    nuevas.forEach((n) => primero.parentNode.insertBefore(n, primero));
    filas.forEach((p) => p.parentNode.removeChild(p));
    return true;
  }
  // Solo cambia los números de página del índice (por marcador)
  function ponerPaginas(doc, paginas) {
    let n = 0;
    (filasIndice(doc) || []).forEach((p) => {
      const h = p.getElementsByTagNameNS(W, 'hyperlink')[0], a = h && h.getAttributeNS(W, 'anchor'); if (!a || !paginas[a]) return;
      const ts = p.getElementsByTagNameNS(W, 't'), t = ts[ts.length - 1];
      if (t && t.textContent !== String(paginas[a])) { t.textContent = String(paginas[a]); n++; }
    });
    return n;
  }
  // Aplica las reglas antes de guardar. Pregunta antes de quitar entradas posteriores que no estén en el Excel.
  async function normalizar(doc) {
    const info = { hashtags: quitarHashtags(doc), quitadas: [], creadas: [] };
    const dom = domingoPub(), post = posteriores(doc, dom);
    const sinRespaldo = post.filter((s) => !esPendiente(s) && !(App.ex && s.propia && elegida(s.propia)));
    let quitar = post;
    if (sinRespaldo.length && !(await U.confirmar('Entradas después de la semana a publicar',
      'El Word tiene entradas después del ' + dmy(dom) + ' que no están elegidas en el Excel: ' + sinRespaldo.map((s) => s.titulo).join(' · ') + '. ¿Las quito del Word? (quedan en el historial de versiones de SharePoint)', 'Quitarlas'))) quitar = post.filter((s) => sinRespaldo.indexOf(s) < 0);
    quitar.forEach((s) => { quitarEntrada(s); info.quitadas.push(s.titulo); });
    info.creadas = completarSemana(doc);
    asegurarMarcadores(doc);
    actualizarIndice(doc, App.word && App.word.paginas);
    return info;
  }
  const xmlDe = (doc) => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' + new XMLSerializer().serializeToString(doc.documentElement);
  async function subirWord() {
    App.word.zip.file('word/document.xml', new TextEncoder().encode(xmlDe(App.word.doc)));
    const blob = await App.word.zip.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const r = await G.subirArchivo(CFG.word, blob);
    App.word.meta = Object.assign({}, App.word.meta, r || {});
    return r;
  }
  // Guarda el Word (con las reglas) y después corrige en segundo plano los números de página del índice con el PDF
  App.cola = Promise.resolve();
  function guardarWord() {
    const t = App.cola.then(async () => { const info = await normalizar(App.word.doc); await subirWord(); return info; });
    App.cola = t.then(() => paginar(), () => {}).catch((e) => console.warn('Índice:', e));
    return t;
  }

  // ---------- PDF ----------
  function cargarPdfjs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    const B = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
    return new Promise((ok, mal) => { const s = document.createElement('script'); s.src = B + 'pdf.min.js'; s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = B + 'pdf.worker.min.js'; ok(window.pdfjsLib); }; s.onerror = () => mal(new Error('pdf.js')); document.head.appendChild(s); });
  }
  async function pdfDe(rutaArchivo) {
    const res = await fetch(BASE + item(rutaArchivo) + ':/content?format=pdf', { headers: { Authorization: 'Bearer ' + await IC.auth.token() } });
    if (!res.ok) { const e = new Error('Error ' + res.status); e.status = res.status; throw e; }
    return res.arrayBuffer();
  }
  // Página real de cada título leyendo el PDF: primero se pasa por el índice, luego por el contenido
  async function paginasDelPdf(buf, lista) {
    const L = await cargarPdfjs(), pdf = await L.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
    const n = (s) => String(s).replace(/\s+/g, '').toLowerCase(), pags = [];
    for (let i = 1; i <= pdf.numPages; i++) { const tc = await (await pdf.getPage(i)).getTextContent(); pags.push(n(tc.items.map((x) => x.str).join(''))); }
    const titulos = lista.filter((s) => s.ancla);
    if (!titulos.length) return {};
    const ultimo = n(titulos[titulos.length - 1].titulo);
    const finIndice = pags.findIndex((t) => t.indexOf(ultimo) >= 0);
    if (finIndice < 0) return null;
    const out = {}; let p = finIndice + 1;
    titulos.forEach((s) => { const t = n(s.titulo); let k = p; while (k < pags.length && pags[k].indexOf(t) < 0) k++; if (k < pags.length) { out[s.ancla] = k + 1; p = k; } });
    return out;
  }
  async function paginar() {
    if (!App.word) return;
    const buf = await pdfDe(CFG.word);
    const pg = await paginasDelPdf(buf, entradas(App.word.doc).lista);
    if (!pg) return;
    App.word.paginas = pg;
    if (ponerPaginas(App.word.doc, pg)) await subirWord();
  }
  function bajar(buf, nombre) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buf], { type: 'application/pdf' })); a.download = nombre; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  async function descargarPDF(boton) {
    await U.conCarga(boton, async () => {
      try { await App.cola; bajar(await pdfDe(CFG.word), CFG.word.split('/').pop().replace(/\.docx$/i, '') + '.pdf'); }
      catch (e) { U.aviso('No se pudo convertir a PDF desde aquí. Abra el Word en SharePoint y use Archivo › Exportar › PDF.', 'warn', 9000); }
    });
  }
  // PDF de un rango de fechas: copia temporal del Word solo con esas entradas (sin las pendientes) y su índice
  async function pdfRango(desde, hasta, boton) {
    await U.conCarga(boton, async () => {
      const tmp = CFG.carpeta + '/_temporal/PDF_rango.docx';
      try {
        await App.cola;
        if (!App.word) await leerWord();
        const Z = await cargarZip();
        const zip = await Z.loadAsync(await App.word.zip.generateAsync({ type: 'arraybuffer' }));
        const doc = new DOMParser().parseFromString(xmlDe(App.word.doc), 'application/xml');
        const E = entradas(doc), quedan = E.lista.filter((s) => s.fecha && s.fecha >= desde && s.fecha <= hasta && !esPendiente(s));
        if (!quedan.length) { U.aviso('No hay entradas documentadas entre el ' + dmy(desde) + ' y el ' + dmy(hasta) + '.', 'warn', 7000); return; }
        E.lista.filter((s) => quedan.indexOf(s) < 0).forEach(quitarEntrada);
        quitarHashtags(doc); asegurarMarcadores(doc); actualizarIndice(doc, null);
        const subir = async () => { zip.file('word/document.xml', new TextEncoder().encode(xmlDe(doc))); await G.subirArchivo(tmp, await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })); };
        await subir();
        let buf = await pdfDe(tmp);
        try { const pg = await paginasDelPdf(buf, entradas(doc).lista); if (pg && ponerPaginas(doc, pg)) { await subir(); buf = await pdfDe(tmp); } } catch (e) { console.warn('Índice estimado', e); }
        bajar(buf, CFG.app.nombre + ' ' + dmy(desde).replace(/\//g, '-') + ' a ' + dmy(hasta).replace(/\//g, '-') + '.pdf');
        U.aviso('PDF listo: ' + quedan.length + ' entrada(s)', 'ok');
      } catch (e) { console.error(e); U.aviso('No se pudo crear el PDF: ' + errorArchivo(e), 'err', 9000); }
      finally { G.llamar('DELETE', item(tmp)).catch(() => { /* se reemplaza la próxima vez */ }); }
    });
  }

  // =====================================================================
  // PLANTILLAS (editables, guardadas junto a los archivos)
  // =====================================================================
  App.plantillas = {};
  const RUTA_PL = { versiculos: CFG.carpeta + '/Prompt_Versiculos.txt', imagen: CFG.carpeta + '/Prompt_Imagen.txt' };
  async function leerPlantillas() {
    await Promise.all(Object.keys(RUTA_PL).map(async (k) => {
      try { const m = await G.llamar('GET', item(RUTA_PL[k])); const r = await fetch(m['@microsoft.graph.downloadUrl']); if (r.ok) App.plantillas[k] = await r.text(); } catch (e) { /* se usa la original */ }
    }));
  }

  // =====================================================================
  // ENCABEZADO
  // =====================================================================
  function pintarEncabezado() {
    const u = App.usuario;
    document.getElementById('encabezado').innerHTML = '<a href="#"><img class="logo" src="' + CFG.logo + '" alt="Ideas Control"></a>' +
      '<div class="app-nombre"><b>' + esc(CFG.app.nombre) + '</b><span>Lectura diaria · v' + CFG.app.version + '</span></div><div class="espacio"></div>' +
      '<nav class="ld-nav"><a href="#" data-r="">Día</a><a href="#generar" data-r="generar">Generar versículos</a><a href="#dias" data-r="dias">Días</a><a href="#archivos" data-r="archivos">Archivos</a></nav>' +
      '<div class="ic-user">' + IC.portal.boton() + '<div class="datos"><b>' + esc(u.nombre) + '</b><span>Uso personal</span></div><div class="ic-avatar">' + esc(u.iniciales) + '</div><button class="ic-btn sec chico" id="btnSalir">Salir</button></div>';
    document.getElementById('encabezado').hidden = false;
    document.getElementById('btnSalir').onclick = () => IC.auth.salir();
  }
  const marcarNav = (r) => document.querySelectorAll('.ld-nav a').forEach((a) => a.classList.toggle('on', a.dataset.r === r));

  // =====================================================================
  // VISTA: DÍA
  // =====================================================================
  function diaPorDefecto() {
    // el primer día desde hoy que tiene versículos y aún no tiene elegido; si no, hoy
    const fechas = Array.from(new Set(App.ex.filas.map((r) => r.fecha).filter(Boolean))).sort();
    return fechas.find((f) => f >= hoy() && !elegida(f)) || hoy();
  }
  async function vistaDia(raiz) {
    if (!App.dia) App.dia = diaPorDefecto();
    const f = App.dia, vs = deDia(f), el = elegida(f), sf = !vs.length ? sinFecha() : [];
    const ew = estadoWord(f), dom = domingoPub(), fuera = f > dom;
    const pub = el && /^s[ií]/i.test(el.publicado);
    raiz.innerHTML = '<div class="ld-cab"><div><h1 class="ic-titulo">' + esc(largo(f).replace(/^./, (c) => c.toUpperCase())) + '</h1><p class="ic-subtitulo" style="margin:0">Lectura: <b>' + esc(App.plan[f] || 'sin lectura en el plan') + '</b></p></div>' +
      '<div class="ld-fechas"><button class="ic-btn sec chico" id="dAnt">‹</button><input type="date" id="dFecha" value="' + f + '"><button class="ic-btn sec chico" id="dSig">›</button><button class="ic-btn sec chico" id="dHoy">Hoy</button></div></div>' +
      '<div class="ld-estado">' + chip(vs.length ? vs.length + ' versículos' : 'Sin versículos', vs.length >= 3 ? 'ok' : vs.length ? 'med' : 'no') +
        '<span id="dChipEl">' + chip(el ? 'Elegido: ' + el.ref : 'Sin elegir', el ? 'ok' : 'no') + '</span>' + chip(ew === 'ok' && !fuera ? 'En el Word ✔' : ew ? 'Word: ' + PENDIENTE : 'Word…', ew === 'ok' && !fuera ? 'ok' : 'no') +
        chip(pub ? 'Publicado en Facebook ✔' : 'Sin publicar', pub ? 'ok' : 'no') + '</div>' +
      (!vs.length ? '<div class="ic-tabla-caja" style="padding:16px"><p style="margin:0 0 10px">Este día todavía no tiene versículos en el Excel.</p>' +
          (sf.length ? '<p class="sec">Al final del Excel hay ' + sf.length + ' versículo(s) sin fecha (' + esc(sf.map((r) => r.ref).join(', ')) + '). ¿Son de este día?</p><button class="ic-btn" id="dAsignar">Asignarles el ' + esc(dmy(f)) + '</button> ' : '') +
          '<a class="ic-btn' + (sf.length ? ' sec' : '') + '" href="#generar">Generar versículos con Claude</a></div>' :
        '<div class="ld-biblia"><span>Biblia para copiar el texto:</span><select id="dVer" aria-label="Versión de la Biblia">' + CFG.biblia.versiones.map((v) => '<option' + (v === version() ? ' selected' : '') + '>' + esc(v) + '</option>').join('') + '</select><span class="sec">' + esc(CFG.biblia.nombre) + ' · cada versículo tiene «Abrir en la Biblia» y «Pegar»</span></div>' +
        '<div class="ld-opciones">' + vs.map((r, i) => tarjeta(r, i, el)).join('') + '</div>' +
        '<div class="ld-acc"><button class="ic-btn sec" id="dTextos">Guardar textos en el Excel</button><button class="ic-btn" id="dDoc"></button><span class="sec" id="dNota"></span></div>' +
        (App.ultimaAccion && App.ultimaAccion.f === f ? '<div class="ld-ok">✅ ' + esc(App.ultimaAccion.t) + '</div>' : '') +
        salida(f));
    const ir = (n) => { App.dia = n; App.ultimaAccion = null; vistaDia(raiz); };
    raiz.querySelector('#dAnt').onclick = () => ir(sumar(f, -1));
    raiz.querySelector('#dSig').onclick = () => ir(sumar(f, 1));
    raiz.querySelector('#dHoy').onclick = () => ir(hoy());
    raiz.querySelector('#dFecha').onchange = (e) => { if (e.target.value) ir(e.target.value); };
    const ba = raiz.querySelector('#dAsignar');
    if (ba) ba.onclick = () => U.conCarga(ba, async () => {
      try { for (const r of sf) await escribir(C.fecha + r.fila, [[isoASerial(f)]], C.fecha + r.fila); sf.forEach((r) => { r.fecha = f; }); U.aviso('Fecha asignada', 'ok'); vistaDia(raiz); }
      catch (e) { U.aviso(errorArchivo(e), 'err', 9000); }
    });
    if (!vs.length) return;

    // ---------- Selección y vista previa en vivo ----------
    const selI = () => { const s = raiz.querySelector('input[name="ld_sel"]:checked'); return s ? +s.value : -1; };
    const actual = () => {   // la opción marcada, con lo que hay escrito en pantalla
      const i = selI(); if (i < 0) return null;
      const o = Object.assign({}, vs[i]); raiz.querySelectorAll('[data-campo][data-i="' + i + '"]').forEach((x) => { o[x.dataset.campo] = x.value.trim(); });
      return o;
    };
    const editado = (i) => Array.from(raiz.querySelectorAll('[data-campo][data-i="' + i + '"]')).some((x) => x.value.trim() !== (vs[i][x.dataset.campo] || ''));
    const refrescar = () => {
      const o = actual(); if (!o) return;
      const cambio = !el || o.fila !== el.fila, sinGuardar = cambio || editado(selI());
      raiz.querySelector('#oImg').textContent = promptImagen(o);
      raiz.querySelector('#oFb').textContent = textoFacebook(o, f);
      raiz.querySelector('#oRef').textContent = o.ref;
      raiz.querySelector('#dPrev').hidden = !sinGuardar;
      raiz.querySelector('#dChipEl').innerHTML = chip((el && !cambio ? 'Elegido: ' : 'Seleccionado: ') + o.ref, el && !cambio ? 'ok' : 'med');
      const bd = raiz.querySelector('#dDoc');
      bd.textContent = !el ? 'Elegir y documentar' : cambio ? 'Guardar el cambio: ' + o.ref : sinGuardar ? 'Guardar cambios' : 'Actualizar el Word';
      bd.classList.toggle('pulso', sinGuardar);
      raiz.querySelector('#dNota').textContent = fuera ? 'Se guarda en el Excel. Entra al Word cuando la semana del ' + dmy(lunesDe(f)) + ' sea la semana a publicar (hoy va hasta el ' + dmy(dom) + ').'
        : 'Se guarda en el Excel (columna C = elegido) y en el Word, en la entrada del ' + dmy(f) + '.';
      const bp = raiz.querySelector('#dPub'); if (bp) bp.hidden = !el || cambio;
    };
    raiz.querySelectorAll('.ld-op').forEach((op) => {
      op.addEventListener('click', () => { const r = op.querySelector('input[type=radio]'); if (r && !r.checked) r.checked = true; raiz.querySelectorAll('.ld-op').forEach((x) => x.classList.toggle('on', x === op)); refrescar(); });
    });
    raiz.querySelectorAll('textarea[data-campo]').forEach((t) => t.addEventListener('input', refrescar));
    refrescar();

    // ---------- Guardar: Excel + Word ----------
    const bd = raiz.querySelector('#dDoc');
    bd.onclick = () => U.conCarga(bd, async () => {
      const i = selI(); if (i < 0) { U.aviso('Elija uno de los versículos', 'warn'); return; }
      const r = vs[i];
      raiz.querySelectorAll('[data-campo]').forEach((x) => { const o = vs[+x.dataset.i]; o['_' + x.dataset.campo] = x.value.trim(); });
      if (!r._texto && !(await U.confirmar('Falta el texto del versículo', 'No ha pegado el texto de ' + r.ref + '. En el Word y en la imagen quedará solo la cita. ¿Guardar así?', 'Guardar así'))) return;
      try {
        // 1) Excel: textos editados de las 3 opciones + fórmula del prompt (C) solo en la elegida
        for (const o of vs) {
          const fila = o.fila, cambios = ['texto', 'idea', 'recuerda', 'aplicacion', 'imagen'].filter((k) => o['_' + k] !== undefined && o['_' + k] !== o[k]);
          if (cambios.length) { await escribir(C.texto + fila + ':' + C.imagen + fila, [[tx(o._texto), o.categoria, tx(o._idea), tx(o._recuerda), tx(o._aplicacion), tx(o._imagen)]]); ['texto', 'idea', 'recuerda', 'aplicacion', 'imagen'].forEach((k) => { o[k] = o['_' + k]; }); }
          const debe = o === r ? formulaPrompt(fila) : '';
          if ((o === r) !== !!o.prompt || (o === r && o.prompt !== debe)) { await escribir(C.prompt + fila, [[debe]]); o.prompt = debe; }
        }
        // 2) Word (solo hasta la semana a publicar)
        let t;
        if (fuera) t = 'Guardado en el Excel: ' + r.ref + '. Entra al Word cuando publique la semana del ' + dmy(lunesDe(f)) + '.';
        else {
          if (!App.word) await leerWord();
          t = documentar(f, r);
          const info = await guardarWord();
          if (info.creadas.length) t += ' También quedaron en el Word: ' + info.creadas.join(', ') + '.';
        }
        App.ultimaAccion = { f, t };
        U.aviso('Listo: ' + r.ref, 'ok', 5000);
        vistaDia(raiz);
      } catch (e) { console.error(e); App.word = null; U.aviso(errorArchivo(e), 'err', 10000); }
    });
    // Versión de la Biblia y enlaces
    const sv = raiz.querySelector('#dVer');
    if (sv) sv.onchange = () => { try { localStorage.setItem('ld_version', sv.value); } catch (e) { /* sin almacenamiento */ } raiz.querySelectorAll('[data-biblia]').forEach((a) => { a.href = urlBiblia(vs[+a.dataset.biblia].ref); }); };
    // Pegar desde el portapapeles en el campo del texto
    raiz.querySelectorAll('[data-pegar]').forEach((b) => {
      b.onclick = async (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        const ta = raiz.querySelector('textarea[data-campo="texto"][data-i="' + b.dataset.pegar + '"]');
        try {
          const t = (await navigator.clipboard.readText() || '').replace(/\s+\n/g, '\n').trim();
          if (!t) { U.aviso('No hay texto copiado. Copie el versículo en su Biblia digital.', 'warn'); return; }
          ta.value = limpiarVersiculo(t, vs[+b.dataset.pegar].ref); ta.dispatchEvent(new Event('input')); U.aviso('Texto pegado', 'ok', 1500);
        } catch (e) { ta.focus(); U.aviso('Su navegador no dejó leer el portapapeles. Haga clic en el campo y use Ctrl+V.', 'warn', 6000); }
      };
    });
    // Guardar solo los textos de las 3 opciones (sin elegir ni tocar el Word)
    const bt = raiz.querySelector('#dTextos');
    bt.onclick = () => U.conCarga(bt, async () => {
      try {
        let n = 0;
        for (const ta of raiz.querySelectorAll('textarea[data-campo="texto"]')) {
          const o = vs[+ta.dataset.i], t = ta.value.trim();
          if (t !== o.texto) { await escribir(C.texto + o.fila, [[tx(t)]]); o.texto = t; n++; }
        }
        U.aviso(n ? n + ' texto(s) guardados en el Excel' : 'No había textos nuevos', n ? 'ok' : 'warn'); refrescar();
      } catch (e) { U.aviso(errorArchivo(e), 'err', 9000); }
    });
    raiz.querySelectorAll('[data-copiar]').forEach((b) => { b.onclick = () => copiar(raiz.querySelector('#' + b.dataset.copiar).textContent, b.dataset.msg); });
    raiz.querySelector('#dHash').onclick = () => editarHashtags(lunesDe(f), refrescar);
    const bp = raiz.querySelector('#dPub');
    if (bp) bp.onclick = () => U.conCarga(bp, async () => {
      try { const p = !/^s[ií]/i.test(el.publicado); await escribir(C.publicado + el.fila, [[p ? 'Sí' : '']]); el.publicado = p ? 'Sí' : ''; U.aviso(p ? 'Marcado como publicado' : 'Desmarcado', 'ok'); vistaDia(raiz); }
      catch (e) { U.aviso(errorArchivo(e), 'err', 9000); }
    });
    const bpdf = raiz.querySelector('#dPdf'); if (bpdf) bpdf.onclick = () => pdfRango(lunesDe(f), sumar(lunesDe(f), 6), bpdf);
    if (!App.word) leerWord().then(() => { if (App.dia === f && location.hash.replace('#', '') === '') vistaDia(raiz); }).catch(() => { /* se informa en Archivos */ });
  }
  // Hashtags de una semana (van al final del texto de Facebook)
  function editarHashtags(lun, despues) {
    U.modal('Hashtags · semana ' + rangoSemana(lun), '<div class="ic-form"><textarea id="hT" rows="3" style="width:100%">' + esc(hashtagsDe(lun)) + '</textarea>' +
      '<p class="sec">Van al final del texto de Facebook de los días de esta semana (no van en el Word). Si lo deja vacío se usan los de siempre.</p>' +
      '<div class="ic-acciones"><button class="ic-btn sec" id="hO">Usar los de siempre</button><span class="espacio"></span><button class="ic-btn" id="hG">Guardar</button></div></div>', (m) => {
      m.querySelector('#hO').onclick = () => { m.querySelector('#hT').value = CFG.hashtags; };
      m.querySelector('#hG').onclick = () => U.conCarga(m.querySelector('#hG'), async () => {
        const t = m.querySelector('#hT').value.replace(/\s+/g, ' ').trim();
        const antes = App.conf.hashtags[lun];
        if (!t || t === CFG.hashtags) delete App.conf.hashtags[lun]; else App.conf.hashtags[lun] = t;
        try { await guardarConf(); U.cerrarModal(); U.aviso('Hashtags de la semana guardados', 'ok'); if (despues) despues(); }
        catch (e) { if (antes) App.conf.hashtags[lun] = antes; else delete App.conf.hashtags[lun]; U.aviso(errorArchivo(e), 'err', 8000); }
      });
    });
  }
  // Limpia lo pegado: números de versículo al inicio («17 Y él…»), saltos de línea y la cita que algunas Biblias agregan al final
  function limpiarVersiculo(t, ref) {
    let s = String(t).replace(/\r/g, '').replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    s = s.replace(/^\d{1,3}\s*(?=\D)/, '').replace(/\s\d{1,3}\s?(?=[A-ZÁÉÍÓÚÑ¿¡«"“])/g, ' ');
    s = s.replace(/\s*[-–—]?\s*\(?[1-3]?\s?[A-Za-zÁÉÍÓÚáéíóúñÑ]+\.?\s\d{1,3}:\d{1,3}(?:[-–]\d{1,3})?\s*(?:\(?[A-Z0-9-]{2,8}\)?)?\)?\s*$/, '');
    return s.trim();
  }
  const chip = (t, c) => '<span class="ld-chip ' + c + '">' + esc(t) + '</span>';
  // Versión de la Biblia elegida (se recuerda en este navegador)
  const version = () => { try { return localStorage.getItem('ld_version') || CFG.biblia.defecto; } catch (e) { return CFG.biblia.defecto; } };
  const urlBiblia = (ref) => CFG.biblia.url.replace('{ref}', encodeURIComponent(ref)).replace('{ver}', encodeURIComponent(version()));
  function tarjeta(r, i, el) {
    const marc = el ? el === r : i === 0;
    const campo = (k, l, filas, ph) => '<label class="ld-lbl">' + l + '</label><textarea data-campo="' + k + '" data-i="' + i + '" rows="' + filas + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '>' + esc(r[k]) + '</textarea>';
    const campoTexto = '<div class="ld-lbl-fila"><label class="ld-lbl">Texto del versículo</label><span class="ld-mini"><a href="' + esc(urlBiblia(r.ref)) + '" target="_blank" rel="noopener" data-biblia="' + i + '">Abrir en la Biblia ↗</a>' +
      '<button type="button" class="ld-pegar" data-pegar="' + i + '">Pegar</button></span></div><textarea data-campo="texto" data-i="' + i + '" rows="3" placeholder="Copie el texto en su Biblia digital y péguelo aquí">' + esc(r.texto) + '</textarea>';
    return '<label class="ld-op' + (marc ? ' on' : '') + '"><div class="ld-op-cab"><input type="radio" name="ld_sel" value="' + i + '"' + (marc ? ' checked' : '') + '><b>' + esc(r.ref) + '</b>' + (r.categoria ? '<span class="ld-cat">' + esc(r.categoria) + '</span>' : '') + (el === r ? '<span class="ld-chip ok">Elegido</span>' : '') + '</div>' +
      campoTexto + campo('idea', 'Idea central', 2) + campo('recuerda', 'Recuerda', 2) + campo('aplicacion', 'Aplicación', 2) + campo('imagen', 'Sugerencia para la imagen', 2) + '</label>';
  }
  // Prompt de la imagen y texto de Facebook de la opción marcada (se actualizan al cambiar la selección o los textos)
  function salida(f) {
    return '<div class="ld-prev" id="dPrev" hidden>👁️ Vista previa de <b id="oRef"></b>: todavía no está guardada. Use el botón de arriba para guardarla en el Excel y en el Word.</div>' +
      '<div class="ld-salida"><section class="ic-bloque"><div class="cab"><h2>🖼️ Prompt para la imagen</h2><button class="ic-btn chico" data-copiar="oImg" data-msg="Prompt de la imagen copiado">Copiar</button></div><div class="cuerpo"><pre class="ld-pre" id="oImg"></pre></div></section>' +
      '<section class="ic-bloque"><div class="cab"><h2>📣 Texto para Facebook</h2><button class="ic-btn chico" data-copiar="oFb" data-msg="Texto para Facebook copiado">Copiar</button></div><div class="cuerpo"><pre class="ld-pre" id="oFb"></pre>' +
        '<div class="gen-acc"><a class="ic-btn sec chico" href="' + esc(CFG.facebook) + '" target="_blank" rel="noopener">Abrir «De Dios para el camino» ↗</a><button class="ic-btn sec chico" id="dHash">Hashtags de la semana</button>' +
        '<button class="ic-btn sec chico" id="dPub">' + (/^s[ií]/i.test((elegida(f) || {}).publicado || '') ? 'Desmarcar publicado' : 'Marcar como publicado') + '</button></div></div></section></div>' +
      '<div class="gen-acc" style="margin-top:12px">' + (App.word && App.word.meta && App.word.meta.webUrl ? '<a class="ic-btn sec" href="' + esc(App.word.meta.webUrl) + '" target="_blank" rel="noopener">Abrir el Word ↗</a>' : '') +
        '<button class="ic-btn sec" id="dPdf">PDF de la semana (' + esc(rangoSemana(lunesDe(f))) + ')</button><a class="ic-btn sec" href="#archivos">PDF de otro rango</a></div>';
  }

  // =====================================================================
  // VISTA: GENERAR VERSÍCULOS (Claude)
  // =====================================================================
  function vistaGenerar(raiz) {
    const fechas = Object.keys(App.plan).sort();
    const primera = fechas.find((f) => f >= sumar(hoy(), -3) && !deDia(f).length) || hoy();
    const G0 = App.gen || (App.gen = { desde: primera, hasta: sumar(primera, 6) });
    raiz.innerHTML = '<h1 class="ic-titulo">Generar versículos con Claude</h1><p class="ic-subtitulo">3 versículos por día con su prompt maestro. Después se agregan al Excel y usted elige uno en «Día».</p>' +
      '<section class="ic-bloque"><div class="cab"><h2>1. Días</h2></div><div class="cuerpo"><div class="ld-fechas" style="justify-content:flex-start"><label>Desde <input type="date" id="gD" value="' + G0.desde + '"></label><label>Hasta <input type="date" id="gH" value="' + G0.hasta + '"></label></div>' +
        '<div id="gDias" class="ld-dias"></div></div></section>' +
      '<section class="ic-bloque"><div class="cab"><h2>2. Llevar el prompt a Claude</h2></div><div class="cuerpo"><p class="sec" style="margin-top:0">Lleva su prompt maestro, los capítulos de cada día y los versículos ya usados (para no repetir). Péguelo en un chat nuevo de Claude.</p>' +
        '<div class="gen-acc"><button class="ic-btn" id="gCop">Copiar prompt</button><a class="ic-btn sec" href="https://claude.ai/new" target="_blank" rel="noopener">Abrir Claude ↗</a><button class="ic-btn sec" id="gVer">Ver prompt</button></div></div></section>' +
      '<section class="ic-bloque"><div class="cab"><h2>3. Pegar la respuesta</h2></div><div class="cuerpo"><textarea id="gResp" rows="7" style="width:100%;font-family:ui-monospace,Consolas,monospace;font-size:12.5px" placeholder="Pegue aquí la respuesta de Claude (el bloque JSON)…"></textarea>' +
        '<div class="gen-acc" style="margin-top:8px"><button class="ic-btn" id="gLeer">Leer respuesta</button></div><div id="gPrev"></div></div></section>';
    const pintarDias = () => {
      const lista = []; for (let f = G0.desde; f <= G0.hasta && lista.length < 31; f = sumar(f, 1)) lista.push(f);
      raiz.querySelector('#gDias').innerHTML = lista.map((f) => { const n = deDia(f).length; return '<span class="ld-chip ' + (n ? 'ok' : 'no') + '">' + esc(corto(f)) + ' · ' + esc(App.plan[f] || '—') + (n ? ' · ya tiene ' + n : '') + '</span>'; }).join('');
    };
    pintarDias();
    raiz.querySelector('#gD').onchange = (e) => { G0.desde = e.target.value; if (G0.hasta < G0.desde) G0.hasta = G0.desde; raiz.querySelector('#gH').value = G0.hasta; pintarDias(); };
    raiz.querySelector('#gH').onchange = (e) => { G0.hasta = e.target.value; pintarDias(); };
    const prompt = () => {
      const dias = []; for (let f = G0.desde; f <= G0.hasta && dias.length < 31; f = sumar(f, 1)) if (!deDia(f).length) dias.push(f);
      const usados = App.ex.filas.filter((r) => r.ref && r.fecha && r.fecha < G0.desde).slice(-90);
      return (App.plantillas.versiculos || P.versiculos) + '\n\n═══════════════════════════════\nDÍAS A DESARROLLAR (3 versículos por día, de sus capítulos):\n' +
        dias.map((f) => '- ' + f + ': ' + (App.plan[f] || '(sin lectura en el plan)')).join('\n') +
        '\n\nVERSÍCULOS Y TEXTOS YA USADOS EN ESTA SECUENCIA (no repetir versículos, ideas, frases, comienzos ni imágenes):\n' +
        usados.map((r) => '- ' + r.ref + ' · idea: ' + r.idea.split(' ').slice(0, 10).join(' ') + '… · aplicación: ' + r.aplicacion.split(' ').slice(0, 8).join(' ') + '… · imagen: ' + r.imagen.split(' ').slice(0, 6).join(' ') + '…').join('\n') + '\n' + P.formato;
    };
    raiz.querySelector('#gCop').onclick = () => copiar(prompt(), 'Prompt copiado. Péguelo en Claude.');
    raiz.querySelector('#gVer').onclick = () => { const t = prompt(); U.modal('Prompt', '<div class="ic-form"><textarea rows="22" readonly style="width:100%;font-family:ui-monospace,Consolas,monospace;font-size:12px">' + esc(t) + '</textarea></div>'); };
    raiz.querySelector('#gLeer').onclick = () => {
      const c = raiz.querySelector('#gPrev');
      try {
        let s = raiz.querySelector('#gResp').value.trim(); const m = s.match(/```(?:json)?\s*([\s\S]*?)```/i); if (m) s = m[1];
        const a = s.indexOf('{'), b = s.lastIndexOf('}'); if (a < 0) throw new Error('No encontré el bloque JSON. Copie la respuesta completa de Claude.');
        let d; try { d = JSON.parse(s.slice(a, b + 1)); } catch (e) { d = JSON.parse(s.slice(a, b + 1).replace(/[“”]/g, '"').replace(/,\s*([}\]])/g, '$1')); }
        const dias = (d.dias || []).filter((x) => x && /^\d{4}-\d{2}-\d{2}$/.test(x.fecha) && (x.versiculos || []).length);
        if (!dias.length) throw new Error('La respuesta no trae "dias" con versículos.');
        App.genDatos = dias;
        const ya = dias.filter((x) => deDia(x.fecha).length);
        c.innerHTML = (ya.length ? '<div class="gen-aviso">⚠️ ' + ya.length + ' día(s) ya tienen versículos en el Excel (' + esc(ya.map((x) => dmy(x.fecha)).join(', ')) + '): se omiten.</div>' : '') +
          '<div class="ic-tabla-caja ld-scroll" style="margin-top:10px"><table class="ic-tabla"><thead><tr><th>Fecha</th><th>Versículo</th><th>Categoría</th><th>Idea central</th><th>Aplicación</th></tr></thead><tbody>' +
          dias.map((x) => x.versiculos.map((v, k) => '<tr' + (deDia(x.fecha).length ? ' class="ld-omitir"' : '') + '><td class="nw">' + (k ? '' : '<b>' + esc(corto(x.fecha)) + '</b>' + (x.nota ? '<br><span class="sec">' + esc(x.nota) + '</span>' : '')) + '</td><td class="nw">' + esc(v.referencia || '') + '</td><td>' + esc(v.categoria || '') + '</td><td>' + esc(v.idea_central || '') + '</td><td>' + esc(v.aplicacion || '') + '</td></tr>').join('')).join('') +
          '</tbody></table></div><div class="gen-acc" style="margin-top:10px"><button class="ic-btn" id="gAgregar">Agregar al Excel (' + dias.filter((x) => !deDia(x.fecha).length).length + ' días)</button><span class="sec">Se agregan al final de la hoja «Contenido», con una fila en blanco entre días, como en su Excel.</span></div><div id="gRes"></div>';
        c.querySelector('#gAgregar').onclick = () => U.conCarga(c.querySelector('#gAgregar'), async () => {
          try {
            await leerExcel();
            const nuevos = dias.filter((x) => !deDia(x.fecha).length).sort((p, q) => p.fecha.localeCompare(q.fecha));
            if (!nuevos.length) { U.aviso('No hay días nuevos para agregar', 'warn'); return; }
            const filas = [];
            const ult = App.ex.filas[App.ex.filas.length - 1];
            if (ult && (ult.ref || ult.fecha)) filas.push(null);   // fila en blanco de separación
            nuevos.forEach((x, k) => { if (k) filas.push(null); x.versiculos.slice(0, 5).forEach((v) => filas.push([ '', '', isoASerial(x.fecha), tx(v.referencia), '', tx(v.categoria), tx(v.idea_central), tx(v.recuerda), tx(v.aplicacion), tx(v.imagen) ])); });
            const ini = App.ex.ultima + 1, fin = ini + filas.length - 1;
            await escribir('B' + ini + ':K' + fin, filas.map((f) => f || ['', '', '', '', '', '', '', '', '', '']), 'D' + ini + ':D' + fin);
            await leerExcel();
            c.querySelector('#gRes').innerHTML = '<div class="ld-ok">✅ Se agregaron ' + nuevos.length + ' día(s) al Excel (filas ' + ini + ' a ' + fin + '). Ahora vaya a <a href="#">Día</a> para elegir el versículo de cada uno.</div>';
            App.dia = nuevos[0].fecha; U.aviso('Versículos agregados al Excel', 'ok');
          } catch (e) { console.error(e); U.aviso(errorArchivo(e), 'err', 10000); }
        });
      } catch (e) { c.innerHTML = '<div class="gen-error">' + esc(e.message) + '</div>'; }
    };
  }

  // =====================================================================
  // VISTA: DÍAS (estado)
  // =====================================================================
  function vistaDias(raiz) {
    const pubL = semanaPub();
    if (!App.verSem) App.verSem = pubL;
    const lun = App.verSem, n = App.semanasVer || 4;
    // de la semana elegida hacia atrás; solo los días con versículos
    let filas = '';
    for (let s = 0; s < n; s++) {
      const l = sumar(lun, -7 * s), dias = [];
      for (let i = 6; i >= 0; i--) { const f = sumar(l, i); if (deDia(f).length) dias.push(f); }
      if (!dias.length) continue;
      filas += '<tr class="ld-sem"><td colspan="5">Semana ' + esc(rangoSemana(l)) + (l === pubL ? ' <span class="ld-chip ok">Semana a publicar</span>' : l > pubL ? ' <span class="ld-chip no">Todavía no va en el Word</span>' : '') +
        '<span class="ld-hash" title="Hashtags de la semana">' + esc(hashtagsDe(l)) + '</span></td></tr>' +
        dias.map((f) => { const k = deDia(f).length, el = elegida(f), w = estadoWord(f);
          return '<tr data-f="' + f + '" class="ld-fila' + (f === hoy() ? ' hoy' : '') + '"><td class="nw"><b>' + esc(corto(f)) + '</b></td><td>' + esc(App.plan[f] || '—') + '</td><td>' + k + '</td><td>' + (el ? esc(el.ref) : '<span class="ld-no">—</span>') + '</td>' +
            '<td>' + (w === 'ok' && f <= domingoPub() ? '✔' : w ? '<span class="ld-no">' + PENDIENTE + '</span>' : '…') + '</td></tr>'; }).join('');
    }
    raiz.innerHTML = '<h1 class="ic-titulo">Días</h1><p class="ic-subtitulo">De la semana elegida hacia atrás. Solo aparecen los días que ya tienen versículos. Haga clic en un día para abrirlo.</p>' +
      '<div class="ld-semsel"><button class="ic-btn sec chico" id="sAnt">‹</button><b>' + esc(rangoSemana(lun)) + '</b><button class="ic-btn sec chico" id="sSig">›</button>' +
        (lun !== pubL ? '<button class="ic-btn sec chico" id="sPub">Ir a la semana a publicar</button>' : '') + '<span class="espacio"></span>' +
        '<button class="ic-btn sec chico" id="sHash">Hashtags de esta semana</button>' +
        (lun > pubL ? '<button class="ic-btn chico" id="sAvanzar">Publicar hasta esta semana</button>' : '<button class="ic-btn chico" id="sWord">Actualizar el Word (hasta el ' + esc(dmy(domingoPub())) + ')</button>') + '</div>' +
      '<div class="ic-tabla-caja ld-scroll"><table class="ic-tabla"><thead><tr><th>Fecha</th><th>Lectura</th><th>Versículos</th><th>Elegido</th><th>Word</th></tr></thead><tbody>' +
        (filas || '<tr><td colspan="5" class="sec">No hay días con versículos en estas semanas.</td></tr>') + '</tbody></table></div>' +
      '<div class="gen-acc" style="margin-top:10px"><button class="ic-btn sec chico" id="sMas">Ver 4 semanas más atrás</button></div>';
    const ir = (l) => { App.verSem = l; vistaDias(raiz); };
    raiz.querySelector('#sAnt').onclick = () => ir(sumar(lun, -7));
    raiz.querySelector('#sSig').onclick = () => ir(sumar(lun, 7));
    const sp = raiz.querySelector('#sPub'); if (sp) sp.onclick = () => ir(pubL);
    raiz.querySelector('#sMas').onclick = () => { App.semanasVer = n + 4; vistaDias(raiz); };
    raiz.querySelector('#sHash').onclick = () => editarHashtags(lun, () => vistaDias(raiz));
    const sw = raiz.querySelector('#sWord'); if (sw) sw.onclick = () => U.conCarga(sw, () => actualizarWord(() => vistaDias(raiz)));
    const sa = raiz.querySelector('#sAvanzar');
    if (sa) sa.onclick = () => U.conCarga(sa, async () => {
      if (!(await U.confirmar('Publicar hasta el ' + dmy(sumar(lun, 6)), 'El Word quedará con las entradas hasta el ' + dmy(sumar(lun, 6)) + ': los días elegidos de esa semana entran con su versículo y los demás como «' + PENDIENTE + '».', 'Actualizar el Word'))) return;
      const antes = App.conf.semana; App.conf.semana = lun;
      try { await guardarConf(); } catch (e) { App.conf.semana = antes; U.aviso(errorArchivo(e), 'err', 8000); return; }
      await actualizarWord(() => vistaDias(raiz));
    });
    raiz.querySelectorAll('tr[data-f]').forEach((tr) => { tr.onclick = () => { App.dia = tr.dataset.f; App.ultimaAccion = null; location.hash = ''; }; });
    if (!App.word) leerWord().then(() => { if (location.hash === '#dias') vistaDias(raiz); }).catch(() => { /* nada */ });
  }
  // Aplica las reglas al Word (semana a publicar, sin hashtags, índice) y lo guarda
  async function actualizarWord(despues) {
    try {
      await App.cola; await leerWord();
      const info = await guardarWord();
      U.aviso('Word actualizado hasta el ' + dmy(domingoPub()) + (info.quitadas.length ? ' · quitadas: ' + info.quitadas.length : '') + (info.creadas.length ? ' · agregadas: ' + info.creadas.join(', ') : '') + (info.hashtags ? ' · hashtags quitados: ' + info.hashtags : ''), 'ok', 9000);
      if (despues) despues();
      return info;
    } catch (e) { console.error(e); App.word = null; U.aviso(errorArchivo(e), 'err', 10000); return null; }
  }

  // =====================================================================
  // VISTA: ARCHIVOS
  // =====================================================================
  async function vistaArchivos(raiz) {
    raiz.innerHTML = '<h1 class="ic-titulo">Archivos</h1><p class="ic-subtitulo">Un solo Excel y un solo Word en SharePoint (sitio IC Apps › Documentos › ' + esc(CFG.carpeta) + '). SharePoint guarda el historial de versiones de cada uno.</p><div id="aCuerpo"><p class="sec">Revisando…</p></div>';
    const est = async (r) => { try { return await G.llamar('GET', item(r)); } catch (e) { return null; } };
    const [mx, mw] = await Promise.all([est(CFG.excel), est(CFG.word)]);
    const fila = (n, m, r, acc) => '<div class="ld-arch"><div><b>' + n + '</b><span class="sec">' + esc(r) + '</span>' + (m ? '<span class="sec">Modificado: ' + esc(new Date(m.lastModifiedDateTime).toLocaleString('es-CO')) + '</span>' : '<span class="ld-no">No está en SharePoint</span>') + '</div><div class="gen-acc">' +
      (m ? '<a class="ic-btn sec chico" href="' + esc(m.webUrl) + '" target="_blank" rel="noopener">Abrir ↗</a>' : '') + '<label class="ic-btn chico">' + (m ? 'Reemplazar' : 'Subir') + '<input type="file" hidden data-sub="' + r + '" accept="' + acc + '"></label></div></div>';
    raiz.querySelector('#aCuerpo').innerHTML = '<section class="ic-bloque"><div class="cab"><h2>Excel y Word</h2></div><div class="cuerpo">' + fila('Excel', mx, CFG.excel, '.xlsx') + fila('Word', mw, CFG.word, '.docx') +
      (mw ? '<div class="gen-acc" style="margin-top:10px"><button class="ic-btn sec" id="aWord">Actualizar el Word (hasta el ' + esc(dmy(domingoPub())) + ')</button></div>' : '') +
      '<p class="sec" style="margin-top:12px">🔒 Para que solo usted los vea: en SharePoint abra la carpeta «Personal» › ⋯ › Gestionar acceso › Dejar de heredar permisos, y quite a los demás.</p></div></section>' +
      (mw ? '<section class="ic-bloque" style="margin-top:14px"><div class="cab"><h2>PDF por rango de fechas</h2></div><div class="cuerpo"><div class="ld-fechas" style="justify-content:flex-start"><label>Desde <input type="date" id="aD" value="' + semanaPub() + '"></label><label>Hasta <input type="date" id="aH" value="' + domingoPub() + '"></label>' +
        '<button class="ic-btn" id="aRango">Descargar PDF</button><button class="ic-btn sec" id="aPdf">Word completo en PDF</button></div>' +
        '<p class="sec">Solo las entradas documentadas de esas fechas (sin las «' + PENDIENTE + '»), con su índice. El Word en SharePoint no cambia.</p></div></section>' : '') +
      '<section class="ic-bloque" style="margin-top:14px"><div class="cab"><h2>Plantillas de los prompts</h2></div><div class="cuerpo"><div class="gen-acc"><button class="ic-btn sec" data-pl="versiculos">Editar prompt maestro (versículos)</button><button class="ic-btn sec" data-pl="imagen">Editar prompt de la imagen</button></div>' +
        '<p class="sec">En el prompt de la imagen use {referencia}, {texto}, {aplicacion} y {sugerencia}; la app los cambia por los datos del día. El mismo prompt queda como fórmula en la columna C del Excel.</p></div></section>';
    raiz.querySelectorAll('[data-sub]').forEach((inp) => {
      inp.onchange = () => U.conCarga(inp.parentNode, async () => {
        const f = inp.files[0]; if (!f) return;
        try {
          await App.cola; await G.subirArchivo(inp.dataset.sub, f); U.aviso('Archivo guardado en SharePoint', 'ok'); App.word = null;
          try { await leerExcel(); } catch (e) { /* aún sin Excel */ }
          if (inp.dataset.sub === CFG.word) await actualizarWord();   // reglas: hasta la semana a publicar, sin hashtags, índice
          vistaArchivos(raiz);
        }
        catch (e) { U.aviso(errorArchivo(e), 'err', 9000); }
      });
    });
    const bp = raiz.querySelector('#aPdf'); if (bp) bp.onclick = () => descargarPDF(bp);
    const bw = raiz.querySelector('#aWord'); if (bw) bw.onclick = () => U.conCarga(bw, () => actualizarWord(() => vistaArchivos(raiz)));
    const br = raiz.querySelector('#aRango');
    if (br) br.onclick = () => { const d = raiz.querySelector('#aD').value, h = raiz.querySelector('#aH').value; if (!d || !h || h < d) { U.aviso('Revise las fechas', 'warn'); return; } pdfRango(d, h, br); };
    raiz.querySelectorAll('[data-pl]').forEach((b) => {
      b.onclick = () => {
        const k = b.dataset.pl, actual = App.plantillas[k] || P[k];
        U.modal(k === 'imagen' ? 'Prompt de la imagen' : 'Prompt maestro', '<div class="ic-form"><textarea id="plT" rows="18" style="width:100%;font-family:ui-monospace,Consolas,monospace;font-size:12.5px">' + esc(actual) + '</textarea>' +
          '<div class="ic-acciones"><button class="ic-btn sec" id="plO">Restaurar el original</button><span class="espacio"></span><button class="ic-btn" id="plG">Guardar</button></div></div>', (m) => {
          m.querySelector('#plO').onclick = () => { m.querySelector('#plT').value = P[k]; };
          m.querySelector('#plG').onclick = () => U.conCarga(m.querySelector('#plG'), async () => {
            const t = m.querySelector('#plT').value.trim();
            try { await G.subirArchivo(RUTA_PL[k], new Blob([t], { type: 'text/plain;charset=utf-8' })); App.plantillas[k] = t; U.cerrarModal(); U.aviso('Plantilla guardada', 'ok'); }
            catch (e) { U.aviso(errorArchivo(e), 'err', 8000); }
          });
        });
      };
    });
  }

  // =====================================================================
  // ARRANQUE
  // =====================================================================
  async function arrancar() {
    const raiz = document.getElementById('contenido');
    U.pantalla(raiz, { logo: CFG.logo, cargando: true, titulo: 'Cargando…', texto: 'Conectando con Microsoft 365' });
    try { sessionStorage.setItem('ic_volver_url', location.href); } catch (e) { /* sin almacenamiento */ }
    try {
      const cuenta = await IC.auth.iniciar(CFG.auth);
      if (!cuenta) { U.pantalla(raiz, { logo: CFG.logo, titulo: CFG.app.nombre, texto: 'Ingrese con su cuenta de Microsoft.', boton: 'Iniciar sesión', alClic: () => IC.auth.entrar() }); return; }
      try { sessionStorage.removeItem('ic_volver_url'); } catch (e) { /* sin almacenamiento */ }
      const email = String(cuenta.username || '').toLowerCase();
      if (CFG.usuarios.indexOf(email) < 0) { U.pantalla(raiz, { logo: CFG.logo, titulo: 'Sin acceso', texto: 'Esta es una app personal.', boton: 'Volver al portal', alClic: () => IC.portal.volver() }); return; }
      App.usuario = { nombre: cuenta.name || email, email, iniciales: U.fmt.iniciales(cuenta.name || email) };
      sid = await G.sitio(CFG.sitio.host, CFG.sitio.ruta);
      pintarEncabezado();
      let sinExcel = false;
      try { await leerExcel(); } catch (e) { console.error(e); sinExcel = true; }
      leerPlantillas().catch(() => { /* originales */ });
      await leerConf();
      if (sinExcel) { App.ex = { filas: [], ultima: 1 }; App.plan = App.plan || {}; location.hash = '#archivos'; }
      U.enrutar({ '': () => vistaDia(raiz), generar: () => vistaGenerar(raiz), dias: () => vistaDias(raiz), archivos: () => vistaArchivos(raiz) }, marcarNav);
      if (sinExcel) U.aviso('No pude abrir el Excel en SharePoint. Súbalo en «Archivos».', 'warn', 9000);
    } catch (e) {
      console.error(e);
      U.pantalla(raiz, { logo: CFG.logo, titulo: 'No se pudo cargar la app', texto: U.mensajeError(e), boton: 'Reintentar', alClic: () => location.reload() });
    }
  }
  window.addEventListener('DOMContentLoaded', arrancar);
  // para pruebas
  window.LD = { documentar: (f, r) => documentar(f, r), entradas: () => entradas(App.word.doc), formulaPrompt, promptImagen, textoFacebook, semanaPub, normalizar, actualizarIndice, estimarPaginas };
})();
