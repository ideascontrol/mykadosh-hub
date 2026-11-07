/* =====================================================================
   APP-112 · Marketing — Generador de contenido con Claude  (#generar)
   1. Semana -> tema del plan.   2. Contenido de la semana o Newsletter.
   3. Copiar el prompt (plantilla editable en SharePoint) y pegarlo en Claude.
   4. Pegar la respuesta (JSON) -> vista previa.
   5. Guardar: llena/crea las publicaciones del tema (copy, formato, diseño, UTM)
      y crea el Word con el diseño de IC en SharePoint.
   ===================================================================== */
window.MKT_GEN = (function () {
  'use strict';
  const U = IC.ui, esc = U.esc, G = IC.graph, L = CFG.listas, GC = CFG.generador, PR = window.MKT_PROMPTS;
  const M = () => window.MKT;
  const ST = { temaId: '', tipo: 'contenido', respuesta: '', datos: null, plantillas: {}, resultado: null };
  const EDITABLES = ['Planeada', 'En producción', 'En aprobación'];
  const MARCA_NOTAS = '── Generado con Claude ──';

  // ---------- utilidades ----------
  const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const fecha = (iso) => new Date(M().dia(iso) + 'T12:00:00');
  const ddmmaaaa = (iso) => { const d = fecha(iso); return M().pad(d.getDate(), 2) + M().pad(d.getMonth() + 1, 2) + d.getFullYear(); };
  const diaTitulo = (iso) => { const d = fecha(iso), w = (d.getDay() + 6) % 7; return DIAS[w].charAt(0).toUpperCase() + DIAS[w].slice(1) + ' ' + M().pad(d.getDate(), 2) + ' de ' + MESES[d.getMonth()]; };
  const fechaLarga = (iso) => { const d = fecha(iso); return d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear(); };
  const semanaTxt = (iso) => { const d = fecha(iso); return M().pad(d.getDate(), 2) + ' ' + MESES[d.getMonth()] + ' ' + d.getFullYear(); };
  const sinNegritas = (t) => String(t || '').replace(/\*\*([^*]+)\*\*/g, '$1');
  const limpiarArchivo = (n) => String(n || '').replace(/[\\/:*?"<>|#%]+/g, '_').replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  const conDocx = (n) => /\.docx$/i.test(n) ? n : n + '.docx';
  const lunesTema = (t) => M().lunesDe(M().dia(t.semana_inicio) || M().hoyISO());
  const tema = () => M().temaDe(ST.temaId);

  function redDe(canal) {
    const n = U.norm(canal);
    if (n.indexOf('linkedin') >= 0) return 'LinkedIn';
    if (n.indexOf('tiktok') >= 0 || n.indexOf('youtube') >= 0) return 'TikTok';
    if (n.indexOf('facebook') >= 0) return 'Facebook';
    if (n.indexOf('instagram') >= 0) return 'Instagram';
    return canal || 'Otra';
  }
  function mapFormato(f) {
    const n = U.norm(f);
    if (/carrus/.test(n)) return 'Carrusel';
    if (/reel|video corto|short|tiktok/.test(n)) return 'Reel / video corto';
    if (/video largo|youtube/.test(n)) return 'Video largo';
    if (/histori|story/.test(n)) return 'Historia';
    if (/articulo|newsletter/.test(n)) return 'Artículo / Newsletter';
    if (/texto/.test(n)) return 'Texto';
    if (/imagen|post|foto|infograf/.test(n)) return 'Imagen';
    return CFG.formatos.indexOf(f) >= 0 ? f : '';
  }
  function destinoFila(t) {
    const m = U.norm(t.microapp || '') + ' ' + U.norm(t.cta_microapp || '');
    const d = CFG.destinos.find((x) => { const k = U.norm(x[0]).split(' ').filter((w) => w.length > 4); return k.some((w) => m.indexOf(w) >= 0); });
    return d || CFG.destinos.find((x) => /diagn/i.test(x[0])) || CFG.destinos[0];
  }
  const destinoDe = (t) => destinoFila(t)[1];
  const etiquetaDe = (t) => { const d = destinoFila(t); return d[2] || d[0]; };   // palabra clave que se muestra en vez del enlace

  // ---------- piezas de la semana (salen del plan) ----------
  function slots(t) {
    const lunes = lunesTema(t), dd = (n) => M().sumarDias(lunes, n);
    const ps = App.pubs.filter((p) => p.tema_id === t.Title && p.estado !== 'Cancelada' && !/newsletter/i.test(p.canal || ''))
      .sort((a, b) => M().dia(a.fecha).localeCompare(M().dia(b.fecha)) || String(a.Title).localeCompare(String(b.Title)));
    // 1) Estructura estándar de la semana (CFG.generador.semana, igual al Word «Contenido Sem»)
    const out = GC.semana.map((x) => ({ grupo: x.grupo, canal: x.canal, red: redDe(x.canal), fecha: dd(x.dia), principal: !!x.principal,
      seccion: x.seccion || diaTitulo(dd(x.dia)), hashtags: GC.hashtags[x.hashtags] || '', nota: x.nota || '', formato_planeado: x.formato || '', pub: null }));
    // 2) Las publicaciones del plan ocupan su lugar: misma red y fecha; si no, la pieza principal de esa red; si no, se agregan.
    const redesPub = (c) => { const n = U.norm(c), r = []; if (n.indexOf('facebook') >= 0) r.push('Facebook'); if (n.indexOf('instagram') >= 0) r.push('Instagram');
      if (n.indexOf('linkedin') >= 0) r.push('LinkedIn'); if (n.indexOf('tiktok') >= 0 || n.indexOf('youtube') >= 0) r.push('TikTok'); return r.length ? r : [redDe(c)]; };
    const ocupar = (s, p) => { s.pub = p; s.canal = p.canal || s.canal; s.fecha = M().dia(p.fecha) || s.fecha; if (p.formato) s.formato_planeado = p.formato; if (!s.principal) s.seccion = diaTitulo(s.fecha); };
    ps.forEach((p) => {
      const rs = redesPub(p.canal), f = M().dia(p.fecha), libres = out.filter((s) => !s.pub && rs.indexOf(s.red) >= 0);
      const s = libres.find((x) => x.principal && x.fecha === f) || libres.find((x) => x.fecha === f) || libres.find((x) => x.principal);
      if (s) ocupar(s, p);
      else out.push({ grupo: p.canal || rs[0], canal: p.canal, red: rs[0], fecha: f, seccion: diaTitulo(f), hashtags: '', nota: '', formato_planeado: p.formato || '', pub: p });
    });
    let k = 0;
    out.forEach((s) => {
      s.id = s.pub ? s.pub.Title : 'NUEVA-' + (++k);
      const r = s.red;
      if (!s.hashtags) s.hashtags = r === 'Instagram' ? GC.hashtags.instagram : r === 'TikTok' ? GC.hashtags.tiktok : r === 'LinkedIn' ? GC.hashtags.linkedinPersonal : GC.hashtags.facebook;
      s.contacto = (r === 'Facebook' || r === 'TikTok') ? GC.contacto : '';
      const video = /reel|video/i.test(s.formato_planeado || '');   // TikTok decide Claude: video, imagen o carrusel
      if (video && !/video/.test(s.nota)) s.nota = (s.nota ? s.nota + ' ' : '') + 'Es video: incluye el objeto "video" (guion por tramos, clips de Canva para CapCut o avatar y guion para HeyGen) y "solo_guion".';
      s.editable = !s.pub || EDITABLES.indexOf(s.pub.estado || 'Planeada') >= 0;
    });
    const orden = {}; GC.semana.forEach((x, i) => { if (orden[x.grupo] === undefined) orden[x.grupo] = i; });
    return out.map((s, i) => Object.assign(s, { _i: i })).sort((a, b) => ((orden[a.grupo] === undefined ? 99 : orden[a.grupo]) - (orden[b.grupo] === undefined ? 99 : orden[b.grupo])) || a._i - b._i);
  }

  // ---------- prompt ----------
  function matriz(t) {
    const campos = [['tema', 'Tema / título de trabajo'], ['hook', 'Hook / Guion'], ['problema', 'Problema'], ['autoridad', 'Autoridad'], ['solucion', 'Solución'], ['cta', 'CTA'],
      ['valor', 'Valor Agregado'], ['seo', 'SEO'], ['objetivo', 'Objetivo'], ['enfoque', 'Enfoque'], ['proposito', 'Propósito'], ['promesa', 'Promesa'], ['microapp', 'Microapp sugerida'],
      ['cta_microapp', 'CTA sugerido con microapp'], ['palabras', 'Palabras clave'], ['categoria', 'Categoría']];
    return campos.filter((c) => t[c[0]]).map((c) => c[1] + ': ' + String(t[c[0]]).replace(/\s+/g, ' ').trim()).join('\n');
  }
  function armarPrompt(t, tipo) {
    const base = (ST.plantillas[tipo] || {}).texto || PR[tipo];
    const lunes = lunesTema(t), dest = destinoDe(t);
    let s = base + '\n\n═══════════════════════════════\nMATRIZ DEL TEMA DE LA SEMANA (semana del ' + fechaLarga(lunes) + ')\n' + matriz(t) + '\n';
    if (tipo === 'contenido') {
      const sl = slots(t).filter((x) => x.editable);
      s += '\nEl enlace {{ENLACE}} lleva a: ' + dest + ' y se mostrará como la palabra clave «' + etiquetaDe(t) + '» (no repitas esas palabras justo antes de {{ENLACE}}).\n\nPIEZAS A DESARROLLAR (' + sl.length + ')\n' + sl.map((x) => '- id: ' + x.id + ' | ' + x.grupo + ' | ' + diaTitulo(x.fecha) +
        (x.formato_planeado ? ' | formato planeado: ' + x.formato_planeado : '') + ' | sección sugerida: ' + x.seccion + (x.nota ? '\n  Nota: ' + x.nota : '')).join('\n') + '\n' + PR.formatoContenido;
    } else {
      const pn = pubNewsletter(t);
      s += '\nFecha de publicación: ' + fechaLarga(pn ? pn.fecha : M().sumarDias(lunes, 2)) + ' — LinkedIn Newsletter\nEl enlace del CTA ({{ENLACE}}) lleva a: ' + dest + ' y se mostrará como la palabra clave «' + etiquetaDe(t) + '» (no repitas esas palabras justo antes de {{ENLACE}}).\n' + PR.formatoNewsletter;
    }
    return s;
  }
  const pubNewsletter = (t) => App.pubs.filter((p) => p.tema_id === t.Title && /newsletter/i.test(p.canal || '') && p.estado !== 'Cancelada').sort((a, b) => M().dia(a.fecha).localeCompare(M().dia(b.fecha)))[0] || null;

  // ---------- plantillas en SharePoint ----------
  async function leerPlantilla(tipo) {
    try {
      const sid = await G.sitio(CFG.sitio.host, CFG.sitio.ruta);
      const meta = await G.llamar('GET', '/sites/' + sid + '/drive/root:/' + M().rutaUrl(PR.archivos[tipo]));
      const r = await fetch(meta['@microsoft.graph.downloadUrl']);
      if (!r.ok) throw new Error('descarga');
      const texto = await r.text();
      ST.plantillas[tipo] = { texto, origen: 'sharepoint', fecha: meta.lastModifiedDateTime, por: ((meta.lastModifiedBy || {}).user || {}).displayName || '' };
    } catch (e) {
      ST.plantillas[tipo] = { texto: PR[tipo], origen: 'original', error: e.status && e.status !== 404 ? U.mensajeError(e) : '' };
    }
    return ST.plantillas[tipo];
  }
  function editarPlantilla(tipo, alGuardar) {
    const p = ST.plantillas[tipo] || { texto: PR[tipo] };
    U.modal('Plantilla del prompt · ' + (tipo === 'contenido' ? 'Contenido de la semana' : 'Newsletter'), '<div class="ic-form"><p class="sec" style="margin-top:0">Esto es lo que se le pide a Claude. Se guarda en SharePoint (Documentos/' + esc(PR.archivos[tipo]) + ') y lo usan las tres personas de la app. ' +
      'La app agrega siempre al final la matriz del tema, la lista de piezas y el formato de respuesta.</p>' +
      '<textarea id="plTexto" rows="20" style="width:100%;font-family:ui-monospace,Consolas,monospace;font-size:12.5px">' + esc(p.texto) + '</textarea>' +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="plOrig">Restaurar el original</button><span class="espacio"></span><button type="button" class="ic-btn sec" id="plCancel">Cancelar</button><button type="button" class="ic-btn" id="plOk">Guardar en SharePoint</button></div></div>', (c) => {
      c.querySelector('#plCancel').onclick = U.cerrarModal;
      c.querySelector('#plOrig').onclick = () => { c.querySelector('#plTexto').value = PR[tipo]; };
      c.querySelector('#plOk').onclick = () => U.conCarga(c.querySelector('#plOk'), async () => {
        const texto = c.querySelector('#plTexto').value.trim();
        if (texto.length < 40) { U.aviso('La plantilla está casi vacía.', 'warn'); return; }
        try {
          await G.subirArchivo(PR.archivos[tipo], new Blob([texto], { type: 'text/plain;charset=utf-8' }));
          ST.plantillas[tipo] = { texto, origen: 'sharepoint', fecha: new Date().toISOString(), por: App.usuario.nombre };
          U.cerrarModal(); U.aviso('Plantilla guardada en SharePoint', 'ok'); if (alGuardar) alGuardar();
        } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); }
      });
    });
  }

  // ---------- leer la respuesta ----------
  function extraerJSON(txt) {
    let s = String(txt || '').trim();
    const f = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (f) s = f[1].trim();
    const a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a < 0 || b <= a) throw new Error('No encontré el bloque JSON. Copie la respuesta completa de Claude (el botón «Copiar» del bloque de código).');
    s = s.slice(a, b + 1);
    try { return JSON.parse(s); }
    catch (e) {
      try { return JSON.parse(s.replace(/[“”]/g, '"').replace(/,\s*([}\]])/g, '$1')); }
      catch (e2) { throw new Error('La respuesta no es un JSON válido (' + e.message + '). Pídale a Claude: «Devuélvelo de nuevo solo como JSON válido».'); }
    }
  }
  function leer(tipo, txt, t) {
    const d = extraerJSON(txt);
    ST.etiqueta = etiquetaDe(t);
    if (tipo === 'contenido') {
      if (!Array.isArray(d.piezas) || !d.piezas.length) throw new Error('La respuesta no trae "piezas". ¿Pegó la respuesta del newsletter en el contenido de la semana?');
      const sl = slots(t), porId = {};
      sl.forEach((s) => { porId[s.id] = s; });
      const usadas = {}, avisos = [], sueltas = [];
      d.piezas.forEach((p) => {
        const s = porId[String(p.pub_id || '').trim()] || porId[String(p.id || '').trim()];
        if (!s || usadas[s.id]) { sueltas.push(p); return; }
        usadas[s.id] = true; s.pieza = p; s.incluir = s.editable;
      });
      // Respuesta guardada antes de crear las publicaciones (ids NUEVA-n): se emparejan en el mismo orden de la estructura de la semana
      const libres = sl.filter((s) => !usadas[s.id]);
      let porOrden = 0;
      sueltas.forEach((p) => {
        const s = /^NUEVA-\d+$/i.test(String(p.id || '')) ? libres.shift() : null;
        if (!s) { avisos.push('Claude devolvió una pieza con id «' + (p.id || 'sin id') + '» que no está en la lista: se omite.'); return; }
        usadas[s.id] = true; s.pieza = p; s.incluir = s.editable; porOrden++;
      });
      if (porOrden) avisos.push(porOrden + ' pieza(s) se emparejaron con sus publicaciones por el orden de la semana. Revise en la vista previa que cada una esté en su red y día.');
      sl.filter((s) => s.editable && !usadas[s.id]).forEach((s) => avisos.push('Falta la pieza ' + s.id + ' (' + s.grupo + ' · ' + diaTitulo(s.fecha) + '). Puede pedírsela a Claude y volver a pegar.'));
      return { tipo, datos: d, slots: sl, avisos };
    }
    if (!d.titulo || !Array.isArray(d.bloques)) throw new Error('La respuesta no trae "titulo" y "bloques". ¿Pegó la respuesta del contenido de la semana en el newsletter?');
    return { tipo, datos: d, avisos: [] };
  }

  // ---------- armar textos ----------
  // Enlaces: nunca la URL larga en el texto. En el Word va una palabra clave con el enlace (marca [[L|texto|url]]);
  // en el copy para pegar en la red, la palabra clave + dónde está el enlace (primer comentario o bio).
  const RE_ENLACE = /\{\{\s*ENLACE\s*\}\}|\[enlace[^\]]*\]|https?:\/\/(?:www\.)?mykadosh\.com\/ideascontrol\/\S*/gi;
  const enlaceWord = (txt, url, etq) => String(txt || '').replace(RE_ENLACE, '[[L|' + etq + '|' + url + ']]');
  const sufijoRed = (red) => (red === 'Instagram' || red === 'TikTok') ? ' (enlace en la bio)' : ' 👇';
  const enlacePlano = (txt, etq, red) => String(txt || '').replace(RE_ENLACE, etq + (red === undefined ? '' : sufijoRed(red)));
  const cambiarEnlace = (txt, url) => enlacePlano(txt, ST.etiqueta || 'el enlace');
  function copyFinal(s, url) {
    return [sinNegritas(enlacePlano(s.pieza.copy, ST.etiqueta, s.red)).trim(), s.contacto, s.hashtags].filter(Boolean).join('\n\n');
  }
  function notasGeneradas(s, url) {
    const p = s.pieza, d = p.diseno || {}, v = p.video, L2 = [];
    L2.push(MARCA_NOTAS + ' ' + new Date().toLocaleDateString('es-CO'));
    if (p.formato || p.herramienta) L2.push('Formato recomendado: ' + [p.formato, p.herramienta].filter(Boolean).join(' · ') + (p.por_que_formato ? ' — ' + p.por_que_formato : ''));
    if (d.descripcion || d.texto_en_imagen || (d.laminas || []).length) {
      L2.push('', 'DISEÑO' + (d.medidas ? ' (' + d.medidas + ')' : '') + ': ' + (d.descripcion || ''));
      if (d.texto_en_imagen) L2.push('Texto en la imagen: ' + d.texto_en_imagen);
      (d.laminas || []).forEach((l) => L2.push('• ' + l));
    }
    if (v) {
      L2.push('', 'VIDEO (' + (v.herramienta || '') + (v.duracion ? ', ' + v.duracion : '') + ')' + (v.escena ? ': ' + v.escena : ''));
      (v.tramos || []).forEach((x) => L2.push('• ' + [x.tramo, x.tiempo].filter(Boolean).join(' ') + ': ' + [x.en_pantalla ? 'pantalla «' + x.en_pantalla + '»' : '', x.voz ? 'voz «' + x.voz + '»' : ''].filter(Boolean).join(' · ')));
      (v.clips || []).forEach((x) => L2.push('  Canva ' + (x.segmento || '') + ': ' + (x.buscar_canva || '') + (x.duracion ? ' (' + x.duracion + ')' : '')));
      if (v.heygen && v.heygen.guion) L2.push('HeyGen: ' + [v.heygen.avatar, v.heygen.escenario, v.heygen.tono].filter(Boolean).join(' · '), v.heygen.guion);
    }
    if (p.copy_b) L2.push('', 'VERSIÓN B:', sinNegritas(cambiarEnlace(p.copy_b, url)) + (p.nota_b ? '\n(' + p.nota_b + ')' : ''));
    (p.variantes || []).filter((x) => x && x.copy).forEach((x) => L2.push('', String(x.nombre || 'Variante').toUpperCase() + ':', sinNegritas(cambiarEnlace(x.copy, url))));
    L2.push('', '🔗 Enlace para el primer comentario' + ((s.red === 'Instagram' || s.red === 'TikTok') ? ' o la bio' : '') + ': está en «Enlace UTM» de esta publicación.', 'El Word de la semana tiene el detalle con formato.');
    return L2.join('\n');
  }
  function unirNotas(viejas, nuevas) {
    const v = String(viejas || ''), i = v.indexOf(MARCA_NOTAS);
    const previas = (i >= 0 ? v.slice(0, i) : v).trim();
    return (previas ? previas + '\n\n' : '') + nuevas;
  }
  function textoNewsletter(n, url) {
    const L2 = [n.titulo, n.bajada || ''];
    (n.bloques || []).forEach((b) => {
      if (!b) return;
      if (b.tipo === 'parrafos') [].concat(b.texto || []).forEach((x) => L2.push(x));
      else if (b.tipo === 'subtitulo') L2.push('', String(b.texto || '').toUpperCase());
      else if (b.tipo === 'comparacion') { L2.push((b.titulo || '').toUpperCase()); [b.izquierda, b.derecha].forEach((x) => { if (x) { L2.push(x.titulo || ''); (x.items || []).forEach((i) => L2.push('• ' + i)); } }); }
      else if (b.tipo === 'cita') L2.push(b.texto || '');
      else if (b.tipo === 'tarjetas' || b.tipo === 'pasos') (b.items || []).forEach((x, i) => L2.push((i + 1) + '. ' + (x.titulo || '') + (x.texto ? ': ' + x.texto : '')));
      else if (b.tipo === 'checklist') { L2.push('', b.titulo || ''); (b.items || []).forEach((i) => L2.push('☐ ' + i)); if (b.cierre) L2.push(b.cierre); }
      else if (b.tipo === 'frase') L2.push(b.linea1 || '', b.linea2 || '');
      else if (b.tipo === 'pregunta') L2.push('', b.titulo || '', b.destacado || '', b.texto || '');
    });
    const c = n.cta || {};
    L2.push('', c.titulo || '', c.texto || '', GC.contactoLinea, cambiarEnlace(c.enlace_texto || '', url), n.cierre || '');
    return sinNegritas(enlacePlano(L2.filter((x) => x !== undefined).join('\n\n').replace(/\n{3,}/g, '\n\n'), ST.etiqueta || 'el enlace')).trim();
  }

  // ---------- logo para el Word ----------
  let logoPNG;
  async function logo() {
    if (logoPNG !== undefined) return logoPNG;
    try {
      const b = await (await fetch(CFG.logo)).blob(), img = await createImageBitmap(b);
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; cv.getContext('2d').drawImage(img, 0, 0);
      const png = await new Promise((ok) => cv.toBlob(ok, 'image/png'));
      logoPNG = { data: await png.arrayBuffer(), w: img.width, h: img.height };
    } catch (e) { logoPNG = null; }
    return logoPNG;
  }
  async function subir(ruta, blob) {
    const r = await G.subirArchivo(ruta, blob);
    return r && r.webUrl;
  }
  function descargar(blob, nombre) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  // ---------- crear Word ----------
  async function wordContenido(t, lectura, titulo) {
    const piezas = lectura.slots.filter((s) => s.pieza && s.incluir !== false).map((s) => {
      const url = s.url || (s.pub ? M().utm(s.pub, destinoDe(t), 'organico') : destinoDe(t)), p = s.pieza, etq = etiquetaDe(t);
      return Object.assign({}, p, { grupo: s.grupo, seccion: p.seccion || s.seccion, fechaTxt: diaTitulo(s.fecha), pubId: s.pubId || (s.pub ? s.pub.Title : ''), formato: mapFormato(p.formato) || p.formato,
        copy: enlaceWord(p.copy, url, etq), copy_b: enlaceWord(p.copy_b, url, etq), variantes: (p.variantes || []).map((v) => Object.assign({}, v, { copy: enlaceWord(v.copy, url, etq) })),
        hashtags: s.hashtags, contacto: s.contacto,
        enlace: '🔗 Enlace para el ' + ((s.red === 'Instagram' || s.red === 'TikTok') ? 'primer comentario o la bio' : 'primer comentario') + ': [[L|' + etq + '|' + url + ']]' });
    });
    return IC_DOCX.contenido({ piezas, estrategia: lectura.datos.estrategia }, { tema: t, titulo, fechaTxt: fechaLarga(lunesTema(t)), logo: await logoDoc() });
  }
  async function logoDoc() { const l = await logo(); return l ? { data: l.data, alto: Math.round(150 * l.h / l.w) } : null; }
  async function wordNewsletter(t, n, url, fechaPub) {
    const etq = etiquetaDe(t), cw = (x) => enlaceWord(x, url, etq);
    const n2 = Object.assign({}, n, { cta: Object.assign({}, n.cta || {}, { enlace_texto: cw((n.cta || {}).enlace_texto || '') }),
      bloques: (n.bloques || []).map((b) => b && b.tipo === 'parrafos' ? Object.assign({}, b, { texto: [].concat(b.texto || []).map(cw) }) : b && b.texto && typeof b.texto === 'string' ? Object.assign({}, b, { texto: cw(b.texto) }) : b) });
    return IC_DOCX.newsletter(n2, { tema: t, fechaTxt: fechaLarga(fechaPub), fechaPublicacion: diaTitulo(fechaPub) + ' de ' + fecha(fechaPub).getFullYear() + ' — LinkedIn Newsletter', logo: await logoDoc(), contactoLinea: GC.contactoLinea });
  }

  // ---------- guardar ----------
  async function guardarContenido(t, lectura, titulo, archivo, progreso) {
    const dest = destinoDe(t), hechos = [];
    const sel = lectura.slots.filter((s) => s.pieza && s.incluir !== false && s.editable);
    let i = 0;
    for (const s of sel) {
      progreso('Guardando publicaciones ' + (++i) + ' de ' + sel.length + '…');
      let p = s.pub, nueva = false;
      const id = p ? p.Title : 'PUB-' + M().pad(await G.siguiente('PUB'), 5);
      const url = M().utm({ Title: id, canal: s.canal, fecha: s.fecha }, dest, 'organico');
      s.url = url; s.pubId = id;
      const campos = { copy: copyFinal(s, url), formato: mapFormato(s.pieza.formato) || (p && p.formato) || '', titulo: String(s.pieza.titulo || t.tema || '').slice(0, 250), utm_url: url };
      if (p) {
        campos.notas = unirNotas(p.notas, notasGeneradas(s, url));
        if (p.estado === 'Planeada') campos.estado = 'En producción';
        if (p.estado === 'En aprobación') {   // cambió el copy: vuelve a producción (misma regla de la ficha)
          campos.estado = 'En producción';
          let ev = []; try { ev = JSON.parse(p.aprobaciones || '[]'); } catch (e) { ev = []; }
          campos.aprobaciones = JSON.stringify(ev.concat([{ tipo: 'EDICION', email: App.usuario.email, nombre: App.usuario.nombre, fecha: new Date().toISOString(), comentario: 'Copy generado con Claude' }]));
        }
        await G.actualizar(L.pubs, p._id, campos); Object.assign(p, campos);
      } else {
        nueva = true;
        p = await G.crear(L.pubs, M().conSemana(Object.assign({ Title: id, tema_id: t.Title, fecha: s.fecha, canal: s.canal, estado: 'En producción', responsable: App.usuario.nombre, notas: notasGeneradas(s, url) }, campos), lunesTema(t)));
        App.pubs.push(p);
      }
      hechos.push({ id, nueva, canal: s.canal, fecha: s.fecha, grupo: s.grupo });
    }
    App.pubs.sort((a, b) => M().dia(a.fecha).localeCompare(M().dia(b.fecha)) || String(a.Title).localeCompare(String(b.Title)));
    progreso('Creando el Word…');
    const blob = await wordContenido(t, lectura, titulo);
    const carpeta = GC.carpetaSemanas + '/' + lunesTema(t);
    progreso('Guardando el Word en SharePoint…');
    const web = await subir(carpeta + '/' + archivo, blob);
    // Respaldo de la respuesta, con el número real de publicación de cada pieza (para «Usar la respuesta guardada»)
    lectura.slots.forEach((s) => { if (s.pieza && s.pubId) s.pieza.pub_id = s.pubId; });
    try { await G.subirArchivo(carpeta + '/' + archivo.replace(/\.docx$/i, '') + '.json', new Blob([JSON.stringify(lectura.datos, null, 2)], { type: 'application/json' })); } catch (e) { /* respaldo opcional */ }
    await fotoTema(t, 'contenido');
    return { hechos, web, blob, archivo, carpeta };
  }
  async function guardarNewsletter(t, lectura, archivo, progreso) {
    const n = lectura.datos, dest = destinoDe(t);
    let p = pubNewsletter(t), nueva = false;
    const fechaPub = p ? M().dia(p.fecha) : M().sumarDias(lunesTema(t), 2);
    const editable = !p || EDITABLES.indexOf(p.estado || 'Planeada') >= 0;
    progreso('Guardando la publicación…');
    const id = p ? p.Title : 'PUB-' + M().pad(await G.siguiente('PUB'), 5);
    const url = M().utm({ Title: id, canal: 'LinkedIn Newsletter', fecha: fechaPub }, dest, 'organico');
    const f = n.ficha || {};
    const notas = MARCA_NOTAS + ' ' + new Date().toLocaleDateString('es-CO') + '\nSEO · Keyword principal: ' + (f.keyword || '') + '\nKeywords secundarias: ' + (f.keywords_secundarias || '') +
      '\nIntención de búsqueda: ' + (f.intencion || '') + '\nFrase destacable (pieza gráfica): ' + (f.frase_destacable || '') +
      ([].concat(f.recomendacion || []).filter(Boolean).length ? '\n\nRecomendación estratégica:\n' + [].concat(f.recomendacion).filter(Boolean).map((r) => '• ' + r).join('\n') : '') + '\n\nEl Word con el diseño está en las piezas de esta publicación.';
    const campos = { copy: textoNewsletter(n, url), formato: 'Artículo / Newsletter', titulo: String(n.titulo || t.tema).slice(0, 250), utm_url: url, pieza_ruta: CFG.carpetaPiezas + '/' + id };
    if (p && editable) {
      campos.notas = unirNotas(p.notas, notas);
      if (p.estado !== 'En producción') {
        campos.estado = 'En producción';
        if (p.estado === 'En aprobación') { let ev = []; try { ev = JSON.parse(p.aprobaciones || '[]'); } catch (e) { ev = []; } campos.aprobaciones = JSON.stringify(ev.concat([{ tipo: 'EDICION', email: App.usuario.email, nombre: App.usuario.nombre, fecha: new Date().toISOString(), comentario: 'Newsletter generado con Claude' }])); }
      }
      await G.actualizar(L.pubs, p._id, campos); Object.assign(p, campos);
    } else if (!p) {
      nueva = true;
      p = await G.crear(L.pubs, M().conSemana(Object.assign({ Title: id, tema_id: t.Title, fecha: fechaPub, canal: 'LinkedIn Newsletter', estado: 'En producción', responsable: App.usuario.nombre, notas }, campos), lunesTema(t)));
      App.pubs.push(p);
    }
    progreso('Creando el Word…');
    const blob = await wordNewsletter(t, n, url, fechaPub);
    progreso('Guardando el Word en SharePoint…');
    const web = await subir(CFG.carpetaPiezas + '/' + id + '/' + archivo, blob);
    try { await G.subirArchivo(GC.carpetaNewsletters + '/' + lunesTema(t) + '/' + archivo.replace(/\.docx$/i, '') + '.json', new Blob([JSON.stringify(n, null, 2)], { type: 'application/json' })); } catch (e) { /* respaldo opcional */ }
    await fotoTema(t, 'newsletter');
    return { hechos: [{ id, nueva, canal: 'LinkedIn Newsletter', fecha: fechaPub, grupo: 'Newsletter', sinCambio: !editable }], web, blob, archivo, aviso: editable ? '' : 'La publicación ' + id + ' ya está ' + p.estado + ': no se cambió. El Word nuevo quedó en sus piezas.' };
  }

  // =====================================================================
  // VISTA
  // =====================================================================
  function vista(raiz) {
    const partes = location.hash.slice(1).split('/');
    if (partes[1]) ST.temaId = decodeURIComponent(partes[1]);
    if (partes[2] === 'newsletter' || partes[2] === 'contenido') ST.tipo = partes[2];
    if (!ST.temaId || !tema()) {
      const l = M().lunesDe(M().hoyISO()), t0 = App.temas.find((x) => M().dia(x.semana_inicio) && lunesTema(x) === l);
      ST.temaId = t0 ? t0.Title : '';
    }
    ST.lectura = null; ST.resultado = null; ST.respuesta = '';
    pintar(raiz);
  }
  function pintar(raiz) {
    const t = tema(), lunes = t ? lunesTema(t) : M().lunesDe(M().hoyISO());
    const temasSem = App.temas.filter((x) => M().dia(x.semana_inicio) && lunesTema(x) === lunes);
    raiz.innerHTML = '<div class="ic-barra"><div><h1 class="ic-titulo">Generar contenido con Claude</h1><p class="ic-subtitulo" style="margin:0">Del tema de la semana a las publicaciones y el Word, sin copiar a mano entre Excel y Word.</p></div></div>' +
      '<div class="gen-pasos">' +
      '<section class="ic-bloque gen-paso"><div class="cab"><h2><span class="gen-n">1</span> Semana y tema</h2></div><div class="cuerpo"><div class="ic-form"><div class="ic-campos">' +
        '<div class="ic-campo c4"><label for="gSem">Semana</label><input type="date" id="gSem" value="' + esc(lunes) + '"><span class="ayuda">Cualquier día: se toma el lunes.</span></div>' +
        '<div class="ic-campo c8"><label for="gTema">Tema</label><select id="gTema">' + (temasSem.length ? temasSem.map((x) => '<option value="' + esc(x.Title) + '"' + (t && x.Title === t.Title ? ' selected' : '') + '>' + esc(x.tema) + ' · ' + esc(x.Title) + '</option>').join('') : '<option value="">No hay tema para esa semana</option>') + '</select>' +
          '<span class="ayuda">' + (temasSem.length ? '<a href="#tema/' + esc(t ? t.Title : '') + '">Ver o editar la matriz del tema</a>' : 'Cree el tema en <a href="#temas">Temas</a> (o cárguelo del plan de Excel).') + '</span></div>' +
      '</div></div>' + (t ? resumenTema(t) : '') + '</div></section>' +
      (t ? '<section class="ic-bloque gen-paso"><div class="cab"><h2><span class="gen-n">2</span> ¿Qué vamos a generar?</h2></div><div class="cuerpo"><div class="gen-tipos">' +
        '<button class="gen-tipo' + (ST.tipo === 'contenido' ? ' on' : '') + '" data-tipo="contenido"><b>Contenido de la semana</b><span>Copies por red y día sin repetir, formato recomendado, diseño de cada pieza, guiones para CapCut o HeyGen y estrategia.</span></button>' +
        '<button class="gen-tipo' + (ST.tipo === 'newsletter' ? ' on' : '') + '" data-tipo="newsletter"><b>Newsletter de LinkedIn</b><span>Artículo con el diseño de IC, ficha editorial y SEO. Queda como publicación «LinkedIn Newsletter».</span></button>' +
      '</div>' + (ST.tipo === 'contenido' ? listaSlots(t) : infoNewsletter(t)) + '<div id="gCambio" style="margin-top:12px"></div><div id="gYa"></div></div></section>' +
      '<section class="ic-bloque gen-paso"><div class="cab"><h2><span class="gen-n">3</span> Llevar el prompt a Claude</h2></div><div class="cuerpo">' +
        '<p class="sec" style="margin-top:0">Copie el prompt, péguelo en un chat nuevo de Claude y espere la respuesta. Claude responde con un bloque de código: use su botón «Copiar».</p>' +
        '<div class="gen-acc"><button class="ic-btn" id="gCopiar">Copiar prompt</button><a class="ic-btn sec" href="https://claude.ai/new" target="_blank" rel="noopener">Abrir Claude ↗</a><button class="ic-btn sec" id="gVer">Ver prompt</button><button class="ic-btn sec" id="gEditar">Editar plantilla</button></div>' +
        '<p class="sec" id="gPlant">Cargando la plantilla…</p></div></section>' +
      '<section class="ic-bloque gen-paso"><div class="cab"><h2><span class="gen-n">4</span> Pegar la respuesta de Claude</h2></div><div class="cuerpo"><div class="ic-form">' +
        '<textarea id="gResp" rows="7" placeholder="Pegue aquí la respuesta completa de Claude (el bloque JSON)…" style="width:100%;font-family:ui-monospace,Consolas,monospace;font-size:12.5px">' + esc(ST.respuesta) + '</textarea>' +
        '<div class="ic-acciones" style="justify-content:flex-start"><button class="ic-btn" id="gLeer">Leer respuesta</button></div></div><div id="gPrev"></div></div></section>' : '') +
      '</div>';

    const sem = raiz.querySelector('#gSem');
    sem.onchange = () => {
      const l = M().lunesDe(sem.value || M().hoyISO()), t1 = App.temas.find((x) => M().dia(x.semana_inicio) && lunesTema(x) === l);
      ST.temaId = t1 ? t1.Title : ''; ST.lectura = null; ST.respuesta = '';
      if (!t1) { ST.temaId = ''; pintarSinTema(raiz, l); return; }
      history.replaceState(null, '', '#generar/' + ST.temaId + '/' + ST.tipo); pintar(raiz);
    };
    const sel = raiz.querySelector('#gTema');
    sel.onchange = () => { ST.temaId = sel.value; ST.lectura = null; history.replaceState(null, '', '#generar/' + ST.temaId + '/' + ST.tipo); pintar(raiz); };
    if (!t) return;
    raiz.querySelectorAll('[data-tipo]').forEach((b) => { b.onclick = () => { ST.tipo = b.dataset.tipo; ST.lectura = null; ST.respuesta = ''; history.replaceState(null, '', '#generar/' + t.Title + '/' + ST.tipo); pintar(raiz); }; });
    const pintarPlant = () => {
      const p = ST.plantillas[ST.tipo], el = raiz.querySelector('#gPlant');
      if (!el || !p) return;
      el.innerHTML = p.origen === 'sharepoint' ? 'Plantilla: la de SharePoint' + (p.por ? ', editada por ' + esc(p.por) : '') + (p.fecha ? ' el ' + esc(new Date(p.fecha).toLocaleDateString('es-CO')) : '') + '.'
        : 'Plantilla: la original (basada en su prompt). Puede ajustarla con «Editar plantilla».' + (p.error ? ' <span style="color:#B42318">No se pudo leer SharePoint: ' + esc(p.error) + '</span>' : '');
    };
    (ST.plantillas[ST.tipo] ? Promise.resolve() : leerPlantilla(ST.tipo)).then(pintarPlant);
    const conPlant = async () => { if (!ST.plantillas[ST.tipo]) await leerPlantilla(ST.tipo); return armarPrompt(t, ST.tipo); };
    raiz.querySelector('#gCopiar').onclick = async () => { M().copiar(await conPlant(), 'Prompt copiado. Péguelo en Claude.'); };
    raiz.querySelector('#gVer').onclick = async () => {
      const txt = await conPlant();
      U.modal('Prompt para Claude', '<div class="ic-form"><textarea rows="22" readonly style="width:100%;font-family:ui-monospace,Consolas,monospace;font-size:12px">' + esc(txt) + '</textarea>' +
        '<div class="ic-acciones"><span class="sec">' + txt.length.toLocaleString('es-CO') + ' caracteres</span><span class="espacio"></span><button class="ic-btn" id="vCop">Copiar</button></div></div>', (c) => {
        c.querySelector('#vCop').onclick = () => M().copiar(txt, 'Prompt copiado. Péguelo en Claude.');
      });
    };
    raiz.querySelector('#gEditar').onclick = async () => { if (!ST.plantillas[ST.tipo]) await leerPlantilla(ST.tipo); editarPlantilla(ST.tipo, pintarPlant); };
    const resp = raiz.querySelector('#gResp');
    resp.addEventListener('input', () => { ST.respuesta = resp.value; });
    raiz.querySelector('#gLeer').onclick = () => {
      try { ST.lectura = leer(ST.tipo, resp.value, t); ST.resultado = null; pintarPrevia(raiz, t); }
      catch (e) { raiz.querySelector('#gPrev').innerHTML = '<div class="gen-error">' + esc(e.message) + '</div>'; }
    };
    if (ST.lectura) pintarPrevia(raiz, t);
    pintarYa(raiz, t);
    avisoCambios(raiz.querySelector('#gCambio'), t);
  }
  function pintarSinTema(raiz, l) {
    pintar(raiz);
    const s = raiz.querySelector('#gSem'); if (s) s.value = l;
    const sel = raiz.querySelector('#gTema'); if (sel) sel.innerHTML = '<option value="">No hay tema para esa semana</option>';
  }
  function resumenTema(t) {
    const f = (k, l) => t[k] ? '<div><dt>' + l + '</dt><dd>' + esc(t[k]) + '</dd></div>' : '';
    return '<dl class="gen-tema">' + f('hook', 'Hook') + f('problema', 'Problema') + f('solucion', 'Solución') + f('cta', 'CTA') + f('microapp', 'Microapp') + '</dl>';
  }
  // ---------- Lo ya generado para esta semana (SharePoint) ----------
  async function hijos(carpeta) {
    try {
      const sid = await G.sitio(CFG.sitio.host, CFG.sitio.ruta);
      return (await G.llamar('GET', '/sites/' + sid + '/drive/root:/' + M().rutaUrl(carpeta) + ':/children?$top=100')).value || [];
    } catch (e) { return []; }
  }
  async function pintarYa(raiz, t) {
    const el = raiz.querySelector('#gYa'); if (!el) return;
    const tipo = ST.tipo, lunes = lunesTema(t);
    el.innerHTML = '<p class="sec" style="margin:10px 0 0">Buscando lo ya generado para esta semana…</p>';
    let words = [], jsons = [];
    if (tipo === 'contenido') {
      const h = await hijos(GC.carpetaSemanas + '/' + lunes);
      words = h.filter((x) => /\.docx$/i.test(x.name)); jsons = h.filter((x) => /\.json$/i.test(x.name));
    } else {
      const pn = pubNewsletter(t);
      const [hp, hj] = await Promise.all([pn ? hijos(CFG.carpetaPiezas + '/' + pn.Title) : Promise.resolve([]), hijos(GC.carpetaNewsletters + '/' + lunes)]);
      words = hp.filter((x) => /\.docx$/i.test(x.name)); jsons = hj.filter((x) => /\.json$/i.test(x.name));
    }
    if (!el.isConnected || ST.tipo !== tipo || ST.temaId !== t.Title) return;
    const pubs = tipo === 'contenido' ? App.pubs.filter((p) => p.tema_id === t.Title && !/newsletter/i.test(p.canal || '') && /Generado con Claude/.test(p.notas || '')) : [];
    if (!words.length && !jsons.length) { el.innerHTML = '<p class="sec" style="margin:10px 0 0">Todavía no hay ' + (tipo === 'contenido' ? 'contenido' : 'newsletter') + ' generado para esta semana en SharePoint.</p>'; return; }
    const f = (x) => new Date(x.lastModifiedDateTime).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    const reciente = (arr) => arr.slice().sort((a, b) => String(b.lastModifiedDateTime).localeCompare(String(a.lastModifiedDateTime)))[0];
    const j = reciente(jsons);
    el.innerHTML = '<div class="gen-ok" style="margin-top:12px"><b>✅ Ya se generó para esta semana.</b>' +
      (words.length ? '<ul>' + words.map((w) => '<li><a href="' + esc(w.webUrl) + '" target="_blank" rel="noopener">' + esc(w.name) + ' ↗</a> <span class="sec">(' + esc(f(w)) + ')</span></li>').join('') + '</ul>' : '') +
      (pubs.length ? '<p class="sec" style="margin:6px 0 0">' + pubs.length + ' publicaciones de esta semana tienen el copy generado: <a href="#lista">ver en Publicaciones</a>. <button class="ic-btn sec chico" id="gImgs">📅 Copys y prompts de imágenes por día</button></p>' : '') +
      (j ? '<div class="gen-acc" style="margin-top:8px"><button class="ic-btn sec chico" id="gUsar">Usar la respuesta guardada</button><span class="sec">Vuelve a mostrar la vista previa sin pedírsela otra vez a Claude (para revisar, cambiar el nombre o volver a crear el Word).</span></div>' : '') + '</div>';
    const bi = el.querySelector('#gImgs'); if (bi) bi.onclick = () => U.conCarga(bi, () => MKT_IMG.semana(lunes));
    const bu = el.querySelector('#gUsar');
    if (bu) bu.onclick = () => U.conCarga(bu, async () => {
      try {
        const r = await fetch(j['@microsoft.graph.downloadUrl']); if (!r.ok) throw new Error('No se pudo leer la respuesta guardada (' + r.status + ').');
        const txt = await r.text();
        ST.respuesta = txt; const ta = raiz.querySelector('#gResp'); if (ta) ta.value = txt;
        ST.lectura = leer(ST.tipo, txt, t); ST.resultado = null; pintarPrevia(raiz, t);
        raiz.querySelector('#gPrev').scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); }
    });
  }

  function listaSlots(t) {
    const sl = slots(t), pl = sl.filter((s) => s.pub).length;
    return '<p class="sec" style="margin:12px 0 6px">Piezas de la semana: ' + sl.length + ' — ' + pl + ' del plan (Publicaciones) y ' + (sl.length - pl) + ' nuevas de la estructura estándar. En la vista previa puede desmarcar las que no quiera crear.</p>' +
      '<div class="gen-slots">' + sl.map((s) => '<span class="gen-slot' + (s.editable ? '' : ' off') + '" title="' + esc(s.editable ? '' : 'Ya está ' + s.pub.estado + ': no se cambia') + '">' + M().chipCanal(s.grupo) + ' ' + esc(M().fCorta(s.fecha)) + (s.pub ? ' · ' + esc(s.pub.Title) : ' · nueva') + (s.editable ? '' : ' · ' + esc(s.pub.estado)) + '</span>').join('') + '</div>';
  }
  function infoNewsletter(t) {
    const p = pubNewsletter(t);
    return '<p class="sec" style="margin:12px 0 0">' + (p ? 'Se llenará la publicación ' + esc(p.Title) + ' (' + esc(M().fLarga(p.fecha)) + ', ' + esc(p.estado) + ').' + (EDITABLES.indexOf(p.estado) < 0 ? ' Ya está ' + esc(p.estado) + ': no se cambia su texto, solo se guarda el Word nuevo.' : '')
      : 'No hay publicación «LinkedIn Newsletter» para este tema: se creará para el miércoles ' + esc(M().fCorta(M().sumarDias(lunesTema(t), 2))) + '.') + '</p>';
  }

  function pintarPrevia(raiz, t) {
    const c = raiz.querySelector('#gPrev'), Lr = ST.lectura, lunes = lunesTema(t);
    const tituloDef = ST.tipo === 'contenido' ? 'Post semana ' + semanaTxt(lunes) : '';
    const archivoDef = ST.tipo === 'contenido' ? 'Contenido_Sem_' + ddmmaaaa(lunes) + '_IC.docx' : 'Newsletter_Ideas_Control_' + ddmmaaaa(lunes) + '.docx';
    let html = (Lr.avisos.length ? '<div class="gen-aviso">' + Lr.avisos.map((a) => '<div>⚠️ ' + esc(a) + '</div>').join('') + '</div>' : '');
    if (Lr.tipo === 'contenido') {
      const conPieza = Lr.slots.filter((s) => s.pieza);
      html += '<h3 class="gen-h3">Vista previa · ' + conPieza.length + ' piezas</h3><div class="ic-tabla-caja mkt-scroll"><table class="ic-tabla gen-tabla"><thead><tr><th></th><th>Pieza</th><th>Formato</th><th>Copy</th><th>Se guarda en</th></tr></thead><tbody>' +
        conPieza.map((s, i) => { const p = s.pieza;
          return '<tr><td><input type="checkbox" data-inc="' + i + '"' + (s.incluir && s.editable ? ' checked' : '') + (s.editable ? '' : ' disabled') + ' aria-label="Incluir"></td>' +
            '<td>' + M().chipCanal(s.grupo) + '<b style="display:block;margin-top:4px">' + esc(p.seccion || s.seccion) + '</b><span class="sec">' + esc(M().fLarga(s.fecha)) + '</span></td>' +
            '<td class="nw">' + esc(mapFormato(p.formato) || p.formato || '—') + '<span class="sec">' + esc(p.herramienta || '') + (p.video ? ' · 🎬' : '') + '</span></td>' +
            '<td><details><summary>' + esc(sinNegritas(p.titulo || String(p.copy || '').split('\n')[0]).slice(0, 90)) + '</summary><div class="gen-copy">' + esc(sinNegritas(p.copy || '')) + '</div>' +
              (p.copy_b ? '<div class="gen-copy b"><b>Versión B</b>\n' + esc(sinNegritas(p.copy_b)) + '</div>' : '') + ((p.diseno || {}).descripcion ? '<div class="gen-copy d"><b>Diseño</b>\n' + esc(p.diseno.descripcion) + '</div>' : '') + '</details></td>' +
            '<td class="nw">' + (s.pub ? esc(s.pub.Title) + '<span class="sec">' + esc(s.editable ? s.pub.estado : 'ya ' + s.pub.estado + ' · no se cambia') + '</span>' : 'Nueva publicación') + '</td></tr>'; }).join('') +
        '</tbody></table></div>';
    } else {
      const n = Lr.datos;
      html += '<h3 class="gen-h3">Vista previa</h3><div class="gen-news"><h4>' + esc(n.titulo) + '</h4>' + (n.bajada ? '<p><b>' + esc(n.bajada) + '</b></p>' : '') +
        '<p class="sec">' + (n.bloques || []).length + ' bloques: ' + esc((n.bloques || []).map((b) => b && b.tipo).filter(Boolean).join(', ')) + '</p>' +
        ((n.ficha || {}).keyword ? '<p class="sec">Keyword principal: <b>' + esc(n.ficha.keyword) + '</b>' + (n.ficha.frase_destacable ? ' · Frase destacable: «' + esc(n.ficha.frase_destacable) + '»' : '') + '</p>' : '') + '</div>';
    }
    html += '<div class="ic-form" style="margin-top:14px"><div class="ic-campos">' +
      (ST.tipo === 'contenido' ? '<div class="ic-campo c6"><label for="gTit">Título del documento</label><input id="gTit" maxlength="120" value="' + esc(tituloDef) + '"></div>' : '') +
      '<div class="ic-campo ' + (ST.tipo === 'contenido' ? 'c6' : 'c12') + '"><label for="gArch">Nombre del archivo</label><input id="gArch" maxlength="120" value="' + esc(archivoDef) + '"><span class="ayuda">Se guarda en SharePoint: Documentos/' +
        esc(ST.tipo === 'contenido' ? GC.carpetaSemanas + '/' + lunes : CFG.carpetaPiezas + '/<publicación>') + '/</span></div></div>' +
      '<div class="ic-acciones" style="justify-content:flex-start"><button class="ic-btn" id="gGuardar">Guardar en el portal y crear el Word</button><button class="ic-btn sec" id="gSolo">Solo descargar el Word</button></div></div><div id="gRes"></div>';
    c.innerHTML = html;
    c.querySelectorAll('[data-inc]').forEach((ch) => { ch.onchange = () => { Lr.slots.filter((s) => s.pieza)[+ch.dataset.inc].incluir = ch.checked; }; });
    const nombres = () => ({ titulo: (c.querySelector('#gTit') || {}).value || tituloDef, archivo: conDocx(limpiarArchivo(c.querySelector('#gArch').value) || archivoDef) });
    c.querySelector('#gSolo').onclick = () => U.conCarga(c.querySelector('#gSolo'), async () => {
      try {
        const nm = nombres(), pn = pubNewsletter(t);
        const blob = ST.tipo === 'contenido' ? await wordContenido(t, Lr, nm.titulo)
          : await wordNewsletter(t, Lr.datos, pn ? M().utm({ Title: pn.Title, canal: 'LinkedIn Newsletter', fecha: pn.fecha }, destinoDe(t), 'organico') : destinoDe(t), pn ? M().dia(pn.fecha) : M().sumarDias(lunes, 2));
        descargar(blob, nm.archivo);
      } catch (e) { console.error(e); U.aviso(U.mensajeError(e), 'err', 8000); }
    });
    c.querySelector('#gGuardar').onclick = async () => {
      const nm = nombres();
      const n = ST.tipo === 'contenido' ? Lr.slots.filter((s) => s.pieza && s.incluir !== false && s.editable).length : 1;
      if (!n) { U.aviso('No hay piezas marcadas para guardar.', 'warn'); return; }
      const ok = await U.confirmar('Guardar en el portal', ST.tipo === 'contenido'
        ? 'Se llenarán ' + n + ' publicaciones (copy, formato, diseño y enlace con UTM). Las que estaban «Planeada» pasan a «En producción». Después cada una se envía a aprobación como siempre.'
        : 'Se llenará la publicación del newsletter y su Word quedará en las piezas para aprobación.', 'Guardar');
      if (!ok) return;
      const btn = c.querySelector('#gGuardar'), res = c.querySelector('#gRes');
      await U.conCarga(btn, async () => {
        const progreso = (m) => { res.innerHTML = '<p class="sec">' + esc(m) + '</p>'; };
        try {
          const r = ST.tipo === 'contenido' ? await guardarContenido(t, Lr, nm.titulo, nm.archivo, progreso) : await guardarNewsletter(t, Lr, nm.archivo, progreso);
          ST.resultado = r;
          res.innerHTML = '<div class="gen-ok"><b>✅ Listo.</b> ' + (r.aviso ? esc(r.aviso) + ' ' : '') +
            (r.web ? '<a href="' + esc(r.web) + '" target="_blank" rel="noopener">Abrir el Word en SharePoint ↗</a> · ' : '') + '<a href="#" id="gBaj">Descargar copia</a>' +
            '<ul>' + r.hechos.map((h) => '<li><a href="#pub/' + esc(h.id) + '">' + esc(h.id) + '</a> · ' + esc(h.grupo) + ' · ' + esc(M().fLarga(h.fecha)) + ' · ' + (h.sinCambio ? 'sin cambios' : h.nueva ? 'nueva' : 'actualizada') + '</li>').join('') + '</ul>' +
            '<p class="sec" style="margin:6px 0 0">Siguiente paso: <a href="#revision/' + esc(t.Title) + '">envíe la semana a revisión de gerencia</a>. Cuando cada pieza esté aprobada, haga el diseño (Canva, CapCut o HeyGen) y súbalo en su publicación.</p></div>';
          res.querySelector('#gBaj').onclick = (ev) => { ev.preventDefault(); descargar(r.blob, r.archivo); };
          U.aviso('Contenido guardado en el portal', 'ok');
        } catch (e) { console.error(e); res.innerHTML = '<div class="gen-error">' + esc(U.mensajeError(e)) + '</div>'; }
      });
    };
  }


  // ---------- ¿cambió el tema después de generar? ----------
  // Al generar se guarda una «foto» de la matriz del tema; si después cambia, se avisa para volver a generar.
  const CAMPOS_MATRIZ = [['tema', 'Tema'], ['kpis', 'KPIs'], ['hook', 'Hook / guion'], ['problema', 'Problema'], ['autoridad', 'Autoridad'], ['solucion', 'Solución'], ['cta', 'CTA'],
    ['valor', 'Valor agregado'], ['seo', 'SEO'], ['objetivo', 'Objetivo'], ['enfoque', 'Enfoque'], ['proposito', 'Propósito'], ['promesa', 'Promesa'], ['microapp', 'Microapp sugerida'],
    ['cta_microapp', 'CTA con microapp'], ['palabras', 'Palabras clave'], ['categoria', 'Categoría'], ['hashtags', 'Hashtags'], ['semana_inicio', 'Semana']];
  const valorTema = (t, k) => k === 'semana_inicio' ? M().dia(t[k]) : String(t[k] || '').replace(/\s+/g, ' ').trim();
  const rutaFoto = (t, tipo) => (tipo === 'contenido' ? GC.carpetaSemanas : GC.carpetaNewsletters) + '/' + lunesTema(t) + '/Tema_generado_' + tipo + '.json';
  async function fotoTema(t, tipo) {
    const campos = {}; CAMPOS_MATRIZ.forEach((c) => { campos[c[0]] = valorTema(t, c[0]); });
    try { await G.subirArchivo(rutaFoto(t, tipo), new Blob([JSON.stringify({ tema_id: t.Title, fecha: new Date().toISOString(), por: App.usuario.nombre, campos }, null, 2)], { type: 'application/json' })); }
    catch (e) { console.warn('No se guardó la foto del tema', e); }
  }
  async function cambiosTema(t) {
    const out = [];
    for (const tipo of ['contenido', 'newsletter']) {
      try {
        const sid = await G.sitio(CFG.sitio.host, CFG.sitio.ruta);
        const meta = await G.llamar('GET', '/sites/' + sid + '/drive/root:/' + M().rutaUrl(rutaFoto(t, tipo)));
        const r = await fetch(meta['@microsoft.graph.downloadUrl']); if (!r.ok) continue;
        const f = JSON.parse(await r.text()), dif = CAMPOS_MATRIZ.filter((c) => (f.campos || {})[c[0]] !== undefined && f.campos[c[0]] !== valorTema(t, c[0])).map((c) => c[1]);
        if (dif.length) out.push({ tipo, fecha: f.fecha, por: f.por, campos: dif });
      } catch (e) { /* no se ha generado o no hay foto */ }
    }
    return out;
  }
  // Pinta el aviso en un contenedor (si hay cambios)
  async function avisoCambios(el, t) {
    if (!el || !t) return;
    const c = await cambiosTema(t); if (!el.isConnected) return;
    el.innerHTML = c.map((x) => '<div class="gen-aviso tema-cambio" style="margin:0 0 12px">⚠️ <b>El tema cambió después de generar ' + (x.tipo === 'contenido' ? 'el contenido de la semana' : 'el newsletter') + '</b> (' +
      esc(new Date(x.fecha).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })) + '). Cambió: ' + esc(x.campos.join(', ')) + '. ' +
      '<a class="ic-btn chico" href="#generar/' + esc(t.Title) + '/' + x.tipo + '">Volver a generar</a></div>').join('');
  }

  return { vista, avisoCambios, cambiosTema, _slots: slots, _leer: leer, _armarPrompt: armarPrompt };
})();
