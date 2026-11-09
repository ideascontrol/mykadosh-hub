/* =====================================================================
   APP-105 · Gestión documental — Publicar un documento aprobado (solo editores)
   1. Se elige el Word aprobado (o el PDF). Del Word se leen código, título, versión, área y fecha (ficha de control).
   2. Si es Word, SharePoint lo convierte a PDF (misma presentación de Word) con un archivo temporal que luego se borra.
   3. Se sube el PDF a la biblioteca 00_Documentacion_Maestra con sus columnas (Codigo, Tipo_documento, Area, Grupo,
      Version_doc, Emision, Ultima_revision, Responsable, Resumen, Estado_documento).
   4. Si ya había un PDF del mismo código con otro nombre, queda como Obsoleto (deja de mostrarse).
   El Word solo se publica si se marca «plantilla descargable» (formatos FOR).
   ===================================================================== */
window.GD_PUB = (function () {
  const BASE = 'https://graph.microsoft.com/v1.0';
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const RE_COD = /^(\d{4})-([A-Z]{3})-([A-Z]{3})/;
  const puede = (u) => !!u && (CFG.editores || []).indexOf(String(u.email || '').toLowerCase()) >= 0;

  function boton(main) {
    const hero = $('.hero', main); if (!hero || $('#bPublicar', main)) return;
    hero.insertAdjacentHTML('beforeend', '<div style="margin-top:16px"><button type="button" class="btn pri" id="bPublicar">⬆ Publicar documento aprobado</button></div>');
    $('#bPublicar', main).onclick = abrir;
  }

  // ---------- Leer la ficha de control del Word ----------
  function cargarJs(src, global) {
    return window[global] ? Promise.resolve(window[global]) : new Promise((ok, mal) => { const s = document.createElement('script'); s.src = src; s.onload = () => ok(window[global]); s.onerror = () => mal(new Error('No se pudo cargar una librería.')); document.head.appendChild(s); });
  }
  async function leerWord(file) {
    const out = {};
    try {
      const Z = await cargarJs('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', 'JSZip');
      const zip = await Z.loadAsync(file);
      const xml = (await zip.file('word/document.xml').async('string')).replace(/^﻿/, '');
      const doc = new DOMParser().parseFromString(xml, 'application/xml'), W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
      const txt = (el) => Array.from(el.getElementsByTagNameNS(W, 't')).map((t) => t.textContent).join('').replace(/\s+/g, ' ').trim();
      const celdas = Array.from(doc.getElementsByTagNameNS(W, 'tc')).map(txt);
      const valor = (re) => { const i = celdas.findIndex((c) => re.test(c)); return i >= 0 && celdas[i + 1] ? celdas[i + 1] : ''; };
      out.codigo = valor(/^c[oó]digo( del documento)?$/i);
      out.titulo = valor(/^t[ií]tulo$/i);
      out.version = valor(/^versi[oó]n( vigente)?$/i);
      out.responsable = valor(/^[aá]rea responsable$/i);
      out.emision = valor(/^fecha de (elaboraci[oó]n|emisi[oó]n)$/i);
      out.aprobado = valor(/^aprobado por$/i);
      // Resumen: primer párrafo después de «Objetivo»
      const ps = Array.from(doc.getElementsByTagNameNS(W, 'p')).map(txt).filter(Boolean);
      let io = -1; ps.forEach((p, i) => { if (/^(\d+\.\s*)?objetivo$/i.test(p)) io = i; });   // la última: la primera es la tabla de contenido
      if (io >= 0 && ps[io + 1]) out.resumen = ps[io + 1].replace(/\s*\(en adelante[^)]*\)/i, '').replace(/\.\./g, '.').slice(0, 400);
    } catch (e) { console.warn('No se pudo leer la ficha del Word', e); }
    return out;
  }

  // ---------- Formulario ----------
  function areaDe(cod) { return GD_APP.areas.find((a) => a.bloque === String(cod || '')[0]) || null; }
  function carpetaSugerida(cod) {
    const c = GD_APP.ctx.carpetas || {}, nombres = Object.keys(c);
    // 1) carpeta con documentos de la misma serie (2 dígitos) · 2) del mismo bloque · 3) raíz
    const de = (pref) => nombres.filter((n) => c[n].some((x) => x.indexOf(pref) === 0)).sort((a, b) => c[b].length - c[a].length)[0];
    return de(String(cod).slice(0, 2)) || de(String(cod)[0]) || '';
  }
  function abrir() {
    const fondo = document.createElement('div');
    fondo.className = 'pub-fondo';
    fondo.innerHTML = '<div class="pub-caja" role="dialog" aria-modal="true"><div class="pub-cab"><b>Publicar documento aprobado</b><button type="button" class="pub-x" aria-label="Cerrar">×</button></div>' +
      '<div class="pub-cuerpo"><p class="pub-nota">Elija el <b>Word aprobado</b> (se publica como PDF, igual a como se ve en Word) o el PDF. Si ya existe una versión del mismo código, queda reemplazada.</p>' +
      '<label class="pub-archivo"><input type="file" id="pArch" accept=".docx,.pdf"><span id="pArchTxt">Seleccionar archivo (.docx o .pdf)</span></label><div id="pForm"></div></div></div>';
    document.body.appendChild(fondo);
    const cerrar = () => fondo.remove();
    $('.pub-x', fondo).onclick = cerrar;
    fondo.addEventListener('click', (e) => { if (e.target === fondo) cerrar(); });
    $('#pArch', fondo).onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      $('#pArchTxt', fondo).textContent = f.name;
      const esWord = /\.docx$/i.test(f.name);
      const leido = esWord ? await leerWord(f) : {};
      const m = (leido.codigo || f.name).match(RE_COD) || f.name.match(RE_COD);
      const cod = m ? m[0] : '';
      const area = areaDe(cod);
      const titulo = leido.titulo || f.name.replace(RE_COD, '').replace(/\.\w+$/, '').replace(/[_-]+/g, ' ').trim();
      const ex = GD_APP.docs.find((d) => d.codigo === cod);
      const carpetas = Object.keys(GD_APP.ctx.carpetas || {}).filter(Boolean).sort();
      const sug = ex && ex.pdf ? ex.pdf.carpeta : carpetaSugerida(cod);
      const campo = (id, label, valor, extra) => '<label class="pub-campo' + (extra && extra.ancho ? ' ancho' : '') + '"><span>' + label + '</span>' +
        (extra && extra.area ? '<textarea id="' + id + '" rows="3">' + esc(valor) + '</textarea>' : '<input id="' + id + '" value="' + esc(valor) + '">') + '</label>';
      $('#pForm', fondo).innerHTML = (ex ? '<div class="pub-aviso">Ya existe <b>' + esc(ex.codigo) + '</b> v' + esc(ex.version || '—') + ' «' + esc(ex.titulo) + '». Se reemplaza por esta versión.</div>' : '') +
        '<div class="pub-grid">' + campo('pCod', 'Código', cod) + campo('pVer', 'Versión', leido.version || (ex && ex.version) || '1.0') +
        campo('pTit', 'Título', titulo, { ancho: 1 }) +
        '<label class="pub-campo"><span>Tipo</span><select id="pTipo">' + Object.keys(GD_APP.TIPOS).map((t) => '<option value="' + t + '"' + (m && m[2] === t ? ' selected' : '') + '>' + t + ' · ' + esc(GD_APP.TIPOS[t]) + '</option>').join('') + '</select></label>' +
        '<label class="pub-campo"><span>Área</span><select id="pArea">' + GD_APP.areas.map((a) => '<option value="' + a.id + '"' + (area && area.id === a.id ? ' selected' : '') + '>' + esc(a.nombre) + '</option>').join('') + '</select></label>' +
        campo('pEmi', 'Emisión', leido.emision || (ex && ex.emision) || '') + campo('pRev', 'Última revisión', new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }).replace(' de ', ' ').replace(/^./, (c) => c.toUpperCase())) +
        campo('pResp', 'Responsable', leido.responsable || (ex && ex.responsable) || '', { ancho: 1 }) +
        campo('pRes', 'Resumen (para el buscador y la tarjeta)', leido.resumen || (ex && ex.resumen) || '', { ancho: 1, area: 1 }) +
        '<label class="pub-campo ancho"><span>Carpeta de la biblioteca</span><select id="pCarp"><option value="">(raíz de 00_Documentacion_Maestra)</option>' +
        carpetas.map((c) => '<option value="' + esc(c) + '"' + (c === sug ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '<option value="__nueva">+ Crear carpeta nueva…</option></select></label>' +
        '<label class="pub-campo ancho" id="pNuevaCaja" style="display:none"><span>Nombre de la carpeta nueva (puede ser una subcarpeta: Carpeta/Subcarpeta)</span><input id="pNueva" value="' + esc(cod ? cod.slice(0, 1) + '000_' + (area ? area.nombre : '') : '') + '"></label>' +
        (esWord ? '<label class="pub-check ancho"><input type="checkbox" id="pPlant"' + (m && m[2] === 'FOR' ? ' checked' : '') + '> <span>Publicar también el Word como <b>plantilla descargable</b> (solo formatos para diligenciar)</span></label>' : '') +
        '</div><div class="pub-acc"><span id="pEstado" class="pub-estado"></span><button type="button" class="btn sec" id="pNo">Cancelar</button><button type="button" class="btn pri" id="pOk">Publicar</button></div>';
      $('#pNo', fondo).onclick = cerrar;
      const verNueva = () => { $('#pNuevaCaja', fondo).style.display = $('#pCarp', fondo).value === '__nueva' ? '' : 'none'; };
      $('#pCarp', fondo).onchange = verNueva;
      $('#pArea', fondo).onchange = () => { const a = GD_APP.areas.find((x) => x.id === $('#pArea', fondo).value); if (a && /^\d000_/.test($('#pNueva', fondo).value)) $('#pNueva', fondo).value = a.bloque + '000_' + a.nombre; };
      $('#pOk', fondo).onclick = () => publicar(f, esWord, fondo, ex);
    };
  }

  // ---------- Publicar ----------
  const token = () => IC.auth.token();
  const ruta = (carp, nombre) => (carp ? carp.split('/').map(encodeURIComponent).join('/') + '/' : '') + encodeURIComponent(nombre);
  async function subir(carp, nombre, cuerpo, tipo) {
    const res = await fetch(BASE + '/drives/' + GD_APP.driveId + '/root:/' + ruta(carp, nombre) + ':/content', { method: 'PUT', headers: { Authorization: 'Bearer ' + await token(), 'Content-Type': tipo }, body: cuerpo });
    if (!res.ok) throw new Error('No se pudo subir ' + nombre + ' (' + res.status + '): ' + (await res.text()).slice(0, 180));
    return res.json();
  }
  async function aPdf(itemId) {
    for (let i = 0; i < 4; i++) {
      const res = await fetch(BASE + '/drives/' + GD_APP.driveId + '/items/' + itemId + '/content?format=pdf', { headers: { Authorization: 'Bearer ' + await token() } });
      if (res.ok) return res.blob();
      if (res.status !== 406 && res.status !== 503 && res.status !== 404) throw new Error('SharePoint no pudo convertir el Word a PDF (' + res.status + ').');
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
    throw new Error('SharePoint no pudo convertir el Word a PDF. Intente de nuevo o suba el PDF.');
  }
  // Columnas: se intentan todas; si alguna no acepta el valor, se guardan las demás
  async function ponerCampos(itemId, campos) {
    const real = GD_APP.ctx.real || {}, f = {};
    Object.keys(campos).forEach((k) => { if (campos[k] !== undefined && campos[k] !== '') f[real[k] || k] = campos[k]; });
    const url = '/drives/' + GD_APP.driveId + '/items/' + itemId + '/listItem/fields';
    try { await IC.graph.llamar('PATCH', url, f); return []; } catch (e) {
      const fallas = [];
      for (const k of Object.keys(f)) { try { await IC.graph.llamar('PATCH', url, { [k]: f[k] }); } catch (e2) { fallas.push(k); } }
      return fallas;
    }
  }
  async function publicar(file, esWord, fondo, ex) {
    const v = (id) => ($('#' + id, fondo) ? $('#' + id, fondo).value.trim() : '');
    const cod = v('pCod').toUpperCase(), tit = v('pTit'), carp = v('pCarp') === '__nueva' ? v('pNueva').replace(/[\\:*?"<>|#%]/g, '').replace(/^\/+|\/+$/g, '').trim() : v('pCarp'), plantilla = !!($('#pPlant', fondo) && $('#pPlant', fondo).checked);
    if (!RE_COD.test(cod)) { alert('El código debe tener la forma 0000-XXX-XXX.'); return; }
    if (!tit) { alert('Escriba el título.'); return; }
    if (v('pCarp') === '__nueva' && !carp) { alert('Escriba el nombre de la carpeta nueva.'); return; }
    const area = GD_APP.areas.find((a) => a.id === v('pArea')) || {};
    const grupo = (area.grupos || []).find((g) => g.serie && g.serie.slice(0, 2) === cod.slice(0, 2)) || (area.grupos || [])[0] || {};
    const base = cod + ' - ' + tit.replace(/[\\/:*?"<>|#%]/g, '').trim();
    const ok = $('#pOk', fondo), est = $('#pEstado', fondo), paso = (t) => { est.textContent = t; };
    ok.disabled = true; $('#pNo', fondo).disabled = true;
    let temp = null;
    try {
      let pdf = file;
      if (esWord) {
        paso('Convirtiendo el Word a PDF en SharePoint…');
        temp = await subir(carp, '_tmp_publicar_' + Date.now() + '.docx', file, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        pdf = await aPdf(temp.id);
      }
      paso('Subiendo el PDF…');
      const it = await subir(carp, base + '.pdf', pdf, 'application/pdf');
      paso('Guardando los datos del documento…');
      const campos = { Codigo: cod, Tipo_documento: v('pTipo'), Area: area.nombre, Grupo: grupo.nombre, Version_doc: v('pVer'), Emision: v('pEmi'), Ultima_revision: v('pRev'),
        Responsable: v('pResp'), Resumen: v('pRes'), Formato: 'PDF', Estado_documento: 'Vigente' };
      const fallas = await ponerCampos(it.id, Object.assign({ Title: tit }, campos));
      let w = null;
      if (plantilla) { paso('Subiendo la plantilla Word…'); w = await subir(carp, base + '.docx', file, file.type || 'application/octet-stream'); await ponerCampos(w.id, Object.assign({ Title: tit }, campos, { Formato: 'Plantilla Word' })); }
      // Versión anterior con otro nombre -> Obsoleta (deja de mostrarse)
      if (ex && ex.pdf && ex.pdf.id !== it.id) { paso('Retirando la versión anterior…'); fallas.push.apply(fallas, (await ponerCampos(ex.pdf.id, { Estado_documento: 'Obsoleto' })).map((k) => k + ' (versión anterior)')); }
      if (ex && ex.plantilla && w && ex.plantilla.id !== w.id) await ponerCampos(ex.plantilla.id, { Estado_documento: 'Obsoleto' });
      paso('Listo.');
      await GD_APP.recargar();
      fondo.remove();
      location.hash = '#/doc/' + encodeURIComponent(cod);
      if (fallas.length) setTimeout(() => alert('Documento publicado. Estas columnas de la biblioteca no aceptaron el valor y quedaron vacías: ' + fallas.join(', ') + '.'), 300);
    } catch (e) {
      console.error(e); paso(''); alert(e.message || String(e)); ok.disabled = false; $('#pNo', fondo).disabled = false;
    } finally {
      if (temp) { try { await IC.graph.llamar('DELETE', '/drives/' + GD_APP.driveId + '/items/' + temp.id); } catch (e) { /* queda en la papelera */ } }
    }
  }
  return { puede, boton };
})();
