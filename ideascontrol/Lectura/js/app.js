/* =====================================================================
   De Dios para el camino · Lectura diaria (uso personal, solo operaciones@)
   Vistas:  #            Día: elegir 1 de los 3 versículos, documentar en el Word, prompt de imagen, texto para Facebook
            #generar     3 versículos por día con Claude (prompt maestro) -> se agregan al Excel
            #dias        Estado de los días (versículos, elegido, Word, publicado)
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
      else if (p) for (let i = 0; i < p.length; i += 200) partes.push('"' + p.slice(i, i + 200).replace(/"/g, '""') + '"');
    });
    return '=' + partes.join('&');
  }
  function promptImagen(r) {
    return (App.plantillas.imagen || P.imagen).replace(/\{referencia\}/g, r.ref).replace(/\{texto\}/g, r.texto || '').replace(/\{aplicacion\}/g, r.aplicacion).replace(/\{sugerencia\}/g, r.imagen || '');
  }
  const tituloDia = (f) => dmy(f) + ' – ' + String(App.plan[f] || '').replace(/[–—]/g, '-');
  function textoFacebook(r) {
    return [(r.ref + ' ' + (r.texto || '')).trim(), r.idea, r.recuerda, r.aplicacion, CFG.cierre, CFG.hashtags].filter(Boolean).join('\n\n');
  }

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
  function entradas(doc) {
    const body = doc.getElementsByTagNameNS(W, 'body')[0];
    const ps = hijosW(body, 'p').concat([]);   // solo párrafos directos del cuerpo (no índice dentro de tablas)
    const todos = Array.from(body.childNodes).filter((x) => x.nodeType === 1);
    // estilo de título de las entradas (Heading1 / Ttulo1…): el del primer párrafo con fecha que no sea del índice
    let estilo = '';
    for (const p of ps) { const s = estiloP(p); if (RE_FECHA.test(textoP(p)) && s && !/^TOC|^TDC/i.test(s)) { estilo = s; break; } }
    const lista = [];
    todos.forEach((el, i) => {
      if (el.localName !== 'p' || estiloP(el) !== estilo) return;
      const m = textoP(el).match(RE_FECHA); if (!m) return;
      lista.push({ p: el, i, fecha: m[3] + '-' + m[2] + '-' + m[1] });
    });
    return { body, todos, estilo, lista };
  }
  // Bloque de una entrada: desde el título hasta los hashtags (o «Dios te bendiga»), sin pasar al siguiente título
  function bloque(E, e) {
    const sig = E.todos.slice(e.i + 1);
    const out = [];
    for (const el of sig) {
      if (el.localName === 'sectPr') break;
      if (el.localName === 'p' && estiloP(el) === E.estilo && RE_FECHA.test(textoP(el))) break;
      if (el.localName === 'p' && E.estilo && estiloP(el) === E.estilo) break;   // otro título
      out.push(el);
      const t = textoP(el).trim();
      if (t.indexOf('#Devocional') === 0) return { els: out, completo: true };
    }
    const k = out.findIndex((el) => textoP(el).trim() === CFG.cierre);
    return k >= 0 ? { els: out.slice(0, k + 1), completo: true } : { els: [], completo: false };
  }
  const esRelleno = (E, e) => { const b = bloque(E, e); const primero = b.els.find((el) => textoP(el).trim()); return !!primero && textoP(primero).trim().indexOf(CFG.relleno) === 0; };
  function estadoWord(f) {
    if (!App.word) return '';
    const E = entradas(App.word.doc), es = E.lista.filter((e) => e.fecha === f);
    if (!es.length) return 'falta';
    return es.some((e) => !esRelleno(E, e)) ? 'ok' : 'relleno';
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
  function documentar(f, r) {
    const doc = App.word.doc, E = entradas(doc);
    if (!E.estilo) throw new Error('No encontré en el Word las entradas por fecha («DD/MM/AAAA – Lectura»).');
    // Modelo: la entrada documentada más reciente (no de relleno)
    const modelo = E.lista.find((e) => !esRelleno(E, e) && bloque(E, e).completo) || E.lista[0];
    const mb = bloque(E, modelo).els.filter((el) => el.localName === 'p' && textoP(el).trim());
    const mTexto = mb[0] || null, mCierre = mb.find((el) => textoP(el).trim() === CFG.cierre) || mTexto, mHash = mb.find((el) => textoP(el).trim().indexOf('#') === 0) || mTexto;
    const nuevos = [parrafo(doc, modelo.p, tituloDia(f)), parrafo(doc, mTexto, (r.ref + ' ' + (r.texto || '')).trim()), parrafo(doc, mTexto, r.idea), parrafo(doc, mTexto, r.recuerda),
      parrafo(doc, mTexto, r.aplicacion), parrafo(doc, mCierre, CFG.cierre), parrafo(doc, mHash, CFG.hashtags)];
    const mismas = E.lista.filter((e) => e.fecha === f);
    let accion = '';
    if (mismas.length) {
      // La entrada de la fecha que está en orden (la siguiente fecha es anterior); si no, la última
      const pos = E.lista.indexOf.bind(E.lista);
      const enOrden = mismas.find((e) => { const sig = E.lista[pos(e) + 1]; return sig && sig.fecha < f; }) || mismas[mismas.length - 1];
      const b = bloque(E, enOrden);
      enOrden.p.parentNode.insertBefore(nuevos[0], enOrden.p);
      let ancla = nuevos[0];
      nuevos.slice(1).forEach((n) => { ancla.parentNode.insertBefore(n, ancla.nextSibling); ancla = n; });
      b.els.forEach((el) => el.parentNode.removeChild(el));
      enOrden.p.parentNode.removeChild(enOrden.p);
      // Las demás entradas de esa misma fecha que sean de relleno se borran (ej. la copia del 9/11 al inicio)
      let borradas = 0;
      mismas.filter((e) => e !== enOrden).forEach((e) => { if (esRelleno(E, e)) { bloque(E, e).els.forEach((el) => el.parentNode && el.parentNode.removeChild(el)); e.p.parentNode.removeChild(e.p); borradas++; } });
      accion = 'Se reemplazó la entrada del ' + dmy(f) + (borradas ? ' y se quitó ' + borradas + ' copia(s) de relleno de esa fecha' : '') + '.';
    } else {
      // Se crea en su lugar: antes de la primera entrada con fecha anterior (el Word va de la más reciente a la más antigua)
      const antes = E.lista.find((e) => e.fecha < f);
      const sectPr = hijosW(E.body, 'sectPr')[0] || null;
      let ref = antes ? antes.p : null;
      if (!ref) { const ult = E.lista[E.lista.length - 1]; const fin = ult ? (bloque(E, ult).els.slice(-1)[0] || ult.p) : null; ref = (fin && fin.nextSibling) || sectPr; }
      nuevos.forEach((n) => E.body.insertBefore(n, ref));
      accion = 'Se creó la entrada del ' + dmy(f) + (antes ? ' antes de la del ' + dmy(antes.fecha) : '') + '.';
    }
    return accion;
  }
  async function guardarWord() {
    const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' + new XMLSerializer().serializeToString(App.word.doc.documentElement);
    App.word.zip.file('word/document.xml', new TextEncoder().encode(xml));
    const blob = await App.word.zip.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const r = await G.subirArchivo(CFG.word, blob);
    App.word.meta = r || App.word.meta;
    return r;
  }
  async function descargarPDF(boton) {
    await U.conCarga(boton, async () => {
      try {
        const res = await fetch(BASE + item(CFG.word) + ':/content?format=pdf', { headers: { Authorization: 'Bearer ' + await IC.auth.token() } });
        if (!res.ok) throw new Error('Error ' + res.status);
        const blob = await res.blob(), a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = CFG.word.split('/').pop().replace(/\.docx$/i, '') + '.pdf'; document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      } catch (e) {
        U.aviso('No se pudo convertir a PDF desde aquí. Abra el Word en SharePoint y use Archivo › Exportar › PDF.', 'warn', 9000);
      }
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
    const ew = estadoWord(f);
    raiz.innerHTML = '<div class="ld-cab"><div><h1 class="ic-titulo">' + esc(largo(f).replace(/^./, (c) => c.toUpperCase())) + '</h1><p class="ic-subtitulo" style="margin:0">Lectura: <b>' + esc(App.plan[f] || 'sin lectura en el plan') + '</b></p></div>' +
      '<div class="ld-fechas"><button class="ic-btn sec chico" id="dAnt">‹</button><input type="date" id="dFecha" value="' + f + '"><button class="ic-btn sec chico" id="dSig">›</button><button class="ic-btn sec chico" id="dHoy">Hoy</button></div></div>' +
      '<div class="ld-estado">' + chip(vs.length ? vs.length + ' versículos' : 'Sin versículos', vs.length >= 3 ? 'ok' : vs.length ? 'med' : 'no') +
        chip(el ? 'Elegido: ' + el.ref : 'Sin elegir', el ? 'ok' : 'no') + chip(ew === 'ok' ? 'En el Word ✔' : ew === 'relleno' ? 'Word: relleno' : ew === 'falta' ? 'Word: no está' : 'Word…', ew === 'ok' ? 'ok' : 'no') +
        chip(el && /^s[ií]/i.test(el.publicado) ? 'Publicado en Facebook ✔' : 'Sin publicar', el && /^s[ií]/i.test(el.publicado) ? 'ok' : 'no') + '</div>' +
      (!vs.length ? '<div class="ic-tabla-caja" style="padding:16px"><p style="margin:0 0 10px">Este día todavía no tiene versículos en el Excel.</p>' +
          (sf.length ? '<p class="sec">Al final del Excel hay ' + sf.length + ' versículo(s) sin fecha (' + esc(sf.map((r) => r.ref).join(', ')) + '). ¿Son de este día?</p><button class="ic-btn" id="dAsignar">Asignarles el ' + esc(dmy(f)) + '</button> ' : '') +
          '<a class="ic-btn' + (sf.length ? ' sec' : '') + '" href="#generar">Generar versículos con Claude</a></div>' :
        '<div class="ld-opciones">' + vs.map((r, i) => tarjeta(r, i, el)).join('') + '</div>' +
        '<div class="ld-acc"><button class="ic-btn" id="dDoc">' + (el ? 'Guardar cambios y actualizar el Word' : 'Elegir y documentar en el Word') + '</button><span class="sec">Se guarda en el Excel (columna C = elegido) y en el Word, en la entrada del ' + esc(dmy(f)) + '.</span></div>' +
        (el ? salida(el) : ''));
    const ir = (n) => { App.dia = n; vistaDia(raiz); };
    raiz.querySelector('#dAnt').onclick = () => ir(sumar(f, -1));
    raiz.querySelector('#dSig').onclick = () => ir(sumar(f, 1));
    raiz.querySelector('#dHoy').onclick = () => ir(hoy());
    raiz.querySelector('#dFecha').onchange = (e) => { if (e.target.value) ir(e.target.value); };
    const ba = raiz.querySelector('#dAsignar');
    if (ba) ba.onclick = () => U.conCarga(ba, async () => {
      try { for (const r of sf) await escribir(C.fecha + r.fila, [[isoASerial(f)]], C.fecha + r.fila); await leerExcel(); U.aviso('Fecha asignada', 'ok'); vistaDia(raiz); }
      catch (e) { U.aviso(errorArchivo(e), 'err', 9000); }
    });
    const bd = raiz.querySelector('#dDoc');
    if (bd) bd.onclick = () => U.conCarga(bd, async () => {
      const sel = raiz.querySelector('input[name="ld_sel"]:checked');
      if (!sel) { U.aviso('Elija uno de los versículos', 'warn'); return; }
      const r = vs[+sel.value];
      // lo editado en pantalla
      raiz.querySelectorAll('[data-campo]').forEach((x) => { const o = vs[+x.dataset.i]; o['_' + x.dataset.campo] = x.value.trim(); });
      if (!r._texto && !(await U.confirmar('Falta el texto del versículo', 'No ha pegado el texto de ' + r.ref + '. En el Word y en Facebook quedará solo la cita. ¿Documentar así?', 'Documentar así'))) return;
      try {
        // 1) Excel: textos editados de las 3 opciones + fórmula del prompt (C) solo en la elegida
        for (const o of vs) {
          const fila = o.fila, cambios = ['texto', 'idea', 'recuerda', 'aplicacion', 'imagen'].filter((k) => o['_' + k] !== undefined && o['_' + k] !== o[k]);
          if (cambios.length) { await escribir(C.texto + fila + ':' + C.imagen + fila, [[tx(o._texto), o.categoria, tx(o._idea), tx(o._recuerda), tx(o._aplicacion), tx(o._imagen)]]); ['texto', 'idea', 'recuerda', 'aplicacion', 'imagen'].forEach((k) => { o[k] = o['_' + k]; }); }
          const debe = o === r ? formulaPrompt(fila) : '';
          if ((o === r) !== !!o.prompt || (o === r && o.prompt !== debe)) { await escribir(C.prompt + fila, [[debe]]); o.prompt = debe; }
        }
        // 2) Word
        if (!App.word) await leerWord();
        const accion = documentar(f, r);
        await guardarWord();
        await leerExcel();
        U.aviso('Listo: ' + r.ref + ' documentado', 'ok', 6000);
        App.ultimaAccion = accion;
        vistaDia(raiz);
      } catch (e) { console.error(e); App.word = null; U.aviso(errorArchivo(e), 'err', 10000); }
    });
    // Cualquier clic en la tarjeta (también en sus textos) elige esa opción
    raiz.querySelectorAll('.ld-op').forEach((op) => { op.addEventListener('click', () => { const r = op.querySelector('input[type=radio]'); if (r && !r.checked) { r.checked = true; raiz.querySelectorAll('.ld-op').forEach((x) => x.classList.toggle('on', x === op)); } }); });
    raiz.querySelectorAll('[data-copiar]').forEach((b) => { b.onclick = () => copiar(raiz.querySelector('#' + b.dataset.copiar).textContent, b.dataset.msg); });
    const bp = raiz.querySelector('#dPub');
    if (bp) bp.onclick = () => U.conCarga(bp, async () => {
      try { const pub = !/^s[ií]/i.test(el.publicado); await escribir(C.publicado + el.fila, [[pub ? 'Sí' : '']]); await leerExcel(); U.aviso(pub ? 'Marcado como publicado' : 'Desmarcado', 'ok'); vistaDia(raiz); }
      catch (e) { U.aviso(errorArchivo(e), 'err', 9000); }
    });
    const bpdf = raiz.querySelector('#dPdf'); if (bpdf) bpdf.onclick = () => descargarPDF(bpdf);
    if (!App.word) leerWord().then(() => { if (App.dia === f && location.hash.replace('#', '') === '') vistaDia(raiz); }).catch(() => { /* se informa en Archivos */ });
  }
  const chip = (t, c) => '<span class="ld-chip ' + c + '">' + esc(t) + '</span>';
  function tarjeta(r, i, el) {
    const marc = el ? el === r : i === 0;
    const campo = (k, l, filas, ph) => '<label class="ld-lbl">' + l + '</label><textarea data-campo="' + k + '" data-i="' + i + '" rows="' + filas + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '>' + esc(r[k]) + '</textarea>';
    return '<label class="ld-op' + (marc ? ' on' : '') + '"><div class="ld-op-cab"><input type="radio" name="ld_sel" value="' + i + '"' + (marc ? ' checked' : '') + '><b>' + esc(r.ref) + '</b>' + (r.categoria ? '<span class="ld-cat">' + esc(r.categoria) + '</span>' : '') + (el === r ? '<span class="ld-chip ok">Elegido</span>' : '') + '</div>' +
      campo('texto', 'Texto del versículo', 2, 'Pegue aquí el texto desde su Biblia') + campo('idea', 'Idea central', 2) + campo('recuerda', 'Recuerda', 2) + campo('aplicacion', 'Aplicación', 2) + campo('imagen', 'Sugerencia para la imagen', 2) + '</label>';
  }
  function salida(r) {
    return (App.ultimaAccion ? '<div class="ld-ok">✅ ' + esc(App.ultimaAccion) + '</div>' : '') +
      '<div class="ld-salida"><section class="ic-bloque"><div class="cab"><h2>🖼️ Prompt para la imagen</h2><button class="ic-btn chico" data-copiar="oImg" data-msg="Prompt de la imagen copiado">Copiar</button></div><div class="cuerpo"><pre class="ld-pre" id="oImg">' + esc(promptImagen(r)) + '</pre></div></section>' +
      '<section class="ic-bloque"><div class="cab"><h2>📣 Texto para Facebook</h2><button class="ic-btn chico" data-copiar="oFb" data-msg="Texto para Facebook copiado">Copiar</button></div><div class="cuerpo"><pre class="ld-pre" id="oFb">' + esc(textoFacebook(r)) + '</pre>' +
        '<div class="gen-acc"><a class="ic-btn sec chico" href="' + esc(CFG.facebook) + '" target="_blank" rel="noopener">Abrir «De Dios para el camino» ↗</a><button class="ic-btn sec chico" id="dPub">' + (/^s[ií]/i.test(r.publicado) ? 'Desmarcar publicado' : 'Marcar como publicado') + '</button></div></div></section></div>' +
      '<div class="gen-acc" style="margin-top:12px">' + (App.word && App.word.meta && App.word.meta.webUrl ? '<a class="ic-btn sec" href="' + esc(App.word.meta.webUrl) + '" target="_blank" rel="noopener">Abrir el Word ↗</a>' : '') + '<button class="ic-btn sec" id="dPdf">Descargar el Word completo en PDF</button></div>';
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
    const ini = sumar(hoy(), -10), dias = []; for (let i = 0; i < 25; i++) dias.push(sumar(ini, i));
    raiz.innerHTML = '<h1 class="ic-titulo">Días</h1><p class="ic-subtitulo">Los últimos 10 días y los próximos 14. Haga clic en un día para abrirlo.</p>' +
      '<div class="ic-tabla-caja ld-scroll"><table class="ic-tabla"><thead><tr><th>Fecha</th><th>Lectura</th><th>Versículos</th><th>Elegido</th><th>Word</th><th>Facebook</th></tr></thead><tbody>' +
      dias.map((f) => { const n = deDia(f).length, el = elegida(f), w = estadoWord(f);
        return '<tr data-f="' + f + '" class="ld-fila' + (f === hoy() ? ' hoy' : '') + '"><td class="nw"><b>' + esc(corto(f)) + '</b></td><td>' + esc(App.plan[f] || '—') + '</td><td>' + (n ? n : '<span class="ld-no">0</span>') + '</td><td>' + (el ? esc(el.ref) : '<span class="ld-no">—</span>') + '</td>' +
          '<td>' + (w === 'ok' ? '✔' : w === 'relleno' ? '<span class="ld-no">relleno</span>' : w === 'falta' ? '<span class="ld-no">no está</span>' : '…') + '</td><td>' + (el && /^s[ií]/i.test(el.publicado) ? '✔' : '—') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    raiz.querySelectorAll('tr[data-f]').forEach((tr) => { tr.onclick = () => { App.dia = tr.dataset.f; location.hash = ''; }; });
    if (!App.word) leerWord().then(() => { if (location.hash === '#dias') vistaDias(raiz); }).catch(() => { /* nada */ });
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
      (mw ? '<div class="gen-acc" style="margin-top:10px"><button class="ic-btn" id="aPdf">Descargar el Word completo en PDF</button></div>' : '') +
      '<p class="sec" style="margin-top:12px">🔒 Para que solo usted los vea: en SharePoint abra la carpeta «Personal» › ⋯ › Gestionar acceso › Dejar de heredar permisos, y quite a los demás.</p></div></section>' +
      '<section class="ic-bloque" style="margin-top:14px"><div class="cab"><h2>Plantillas de los prompts</h2></div><div class="cuerpo"><div class="gen-acc"><button class="ic-btn sec" data-pl="versiculos">Editar prompt maestro (versículos)</button><button class="ic-btn sec" data-pl="imagen">Editar prompt de la imagen</button></div>' +
        '<p class="sec">En el prompt de la imagen use {referencia}, {texto}, {aplicacion} y {sugerencia}; la app los cambia por los datos del día. El mismo prompt queda como fórmula en la columna C del Excel.</p></div></section>';
    raiz.querySelectorAll('[data-sub]').forEach((inp) => {
      inp.onchange = () => U.conCarga(inp.parentNode, async () => {
        const f = inp.files[0]; if (!f) return;
        try { await G.subirArchivo(inp.dataset.sub, f); U.aviso('Archivo guardado en SharePoint', 'ok'); App.word = null; try { await leerExcel(); } catch (e) { /* aún sin Excel */ } vistaArchivos(raiz); }
        catch (e) { U.aviso(errorArchivo(e), 'err', 9000); }
      });
    });
    const bp = raiz.querySelector('#aPdf'); if (bp) bp.onclick = () => descargarPDF(bp);
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
  window.LD = { documentar: (f, r) => documentar(f, r), entradas: () => entradas(App.word.doc), formulaPrompt, promptImagen, textoFacebook };
})();
