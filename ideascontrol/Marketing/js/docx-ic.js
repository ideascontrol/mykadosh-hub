/* =====================================================================
   APP-112 · Marketing — Word con el diseño de Ideas Control (docx.js)
   IC_DOCX.contenido(datos, ctx)  -> Blob  «Contenido Sem ddmmaaaa IC»
   IC_DOCX.newsletter(datos, ctx) -> Blob  «Newsletter Ideas Control»
   ctx: { tema, titulo, fechaTxt, logo (ArrayBuffer PNG|null), contacto }
   ===================================================================== */
window.IC_DOCX = (function () {
  'use strict';
  const C = { navy: '0B2945', azul: '0E76BC', teal: '159090', oro: 'C9A227', gris: '5B6770', suave: '8A96A0', linea: 'D5DCE1',
    tealClaro: 'E8F5F4', azulClaro: 'EAF3FB', rojoClaro: 'FDF1EF', rojo: 'B42318', verdeClaro: 'EDF8F2', verde: '1E7A4C', fondo: 'F4F7F9' };
  const ANCHO = 10080;   // ancho útil en DXA (carta, márgenes de 0,75")

  let D = null;
  function cargar() {
    if (window.docx) return Promise.resolve((D = window.docx));
    return new Promise((ok, mal) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js';
      s.onload = () => { D = window.docx; ok(D); };
      s.onerror = () => mal(new Error('No se pudo cargar la librería para crear el Word. Revise la conexión e intente de nuevo.'));
      document.head.appendChild(s);
    });
  }

  // ---------- Reparación de emojis partidos ----------
  // En el navegador, la librería escribe el XML por bloques: si un emoji (dos unidades UTF-16) cae justo en el borde
  // de un bloque, queda codificado como dos «medios caracteres» (CESU-8) y Word/LibreOffice no abren el archivo.
  // Se abre el .docx, se reescriben esos bytes como el emoji correcto (UTF-8 de 4 bytes) y se vuelve a empacar.
  function cargarZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    return new Promise((ok, mal) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.onload = () => ok(window.JSZip);
      s.onerror = () => mal(new Error('No se pudo cargar la librería para revisar el Word. Revise la conexión e intente de nuevo.'));
      document.head.appendChild(s);
    });
  }
  function repararBytes(u8) {
    let malos = false;
    for (let i = 0; i + 5 < u8.length; i++) if (u8[i] === 0xED && (u8[i + 1] & 0xF0) === 0xA0 && u8[i + 3] === 0xED && (u8[i + 4] & 0xF0) === 0xB0) { malos = true; break; }
    if (!malos) return null;
    const out = new Uint8Array(u8.length);
    let j = 0;
    for (let i = 0; i < u8.length; i++) {
      if (u8[i] === 0xED && i + 5 < u8.length && (u8[i + 1] & 0xF0) === 0xA0 && u8[i + 3] === 0xED && (u8[i + 4] & 0xF0) === 0xB0) {
        const hi = 0xD000 | ((u8[i + 1] & 0x3F) << 6) | (u8[i + 2] & 0x3F), lo = 0xD000 | ((u8[i + 4] & 0x3F) << 6) | (u8[i + 5] & 0x3F);
        const cp = ((hi - 0xD800) << 10) + (lo - 0xDC00) + 0x10000;
        out[j++] = 0xF0 | (cp >> 18); out[j++] = 0x80 | ((cp >> 12) & 0x3F); out[j++] = 0x80 | ((cp >> 6) & 0x3F); out[j++] = 0x80 | (cp & 0x3F);
        i += 5;
      } else out[j++] = u8[i];
    }
    return out.slice(0, j);
  }
  async function empacar(doc) {
    const blob = await D.Packer.toBlob(doc);
    const Z = await cargarZip(), zip = await Z.loadAsync(blob);
    let cambio = false;
    for (const nombre of Object.keys(zip.files)) {
      if (!/\.(xml|rels)$/i.test(nombre) || zip.files[nombre].dir) continue;
      const f = repararBytes(await zip.files[nombre].async('uint8array'));
      if (f) { zip.file(nombre, f); cambio = true; }
    }
    if (!cambio) return blob;
    return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  // ---------- Texto con **negritas** ----------
  // [[L|palabra clave|url]] -> hipervínculo resaltado (nunca se muestra la URL larga)
  function runs(texto, o) {
    o = o || {};
    // Si el enlace quedó dentro de una negrita (**… [[L|…]] …**), se cierra la negrita antes y se abre después.
    const t = String(texto == null ? '' : texto).replace(/\*\*([^*]*?)(\[\[L\|[^\]]+\]\])([^*]*?)\*\*/g, '**$1**$2**$3**').replace(/\*\*\*\*/g, '');
    const out = [];
    t.split(/(\[\[L\|[^|\]]*\|[^\]]+\]\])/g).forEach((seg) => {
      const m = seg.match(/^\[\[L\|([^|\]]*)\|([^\]]+)\]\]$/);
      if (m) { out.push(new D.ExternalHyperlink({ link: m[2], children: emo(m[1], { bold: true, color: C.azul, underline: {}, size: o.size, font: o.font }) })); return; }
      if (seg) out.push.apply(out, runsNeg(seg, o));
    });
    return out.length ? out : [new D.TextRun('')];
  }
  function runsNeg(texto, o) {
    const partes = String(texto).split(/(\*\*[^*]+\*\*)/g).filter((x) => x !== '');
    if (!partes.length) partes.push('');
    return partes.map((p) => {
      const neg = /^\*\*[^*]+\*\*$/.test(p);
      return emo(neg ? p.slice(2, -2) : p, { bold: neg || !!o.bold, italics: !!o.italics, color: o.color, size: o.size, font: o.font });
    }).reduce((a, b) => a.concat(b), []);
  }
  // Emojis a color: Word solo los pinta a color con la fuente «Segoe UI Emoji»; con Calibri/Arial salen planos (blanco y negro).
  const RE_EMOJI = /((?:\p{Extended_Pictographic}|\p{Regional_Indicator}{2}|[0-9#*]\uFE0F?\u20E3)(?:\uFE0F|\u200D\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}])*)/u;
  const RE_EMOJI_G = new RegExp(RE_EMOJI.source, 'gu');
  function emo(texto, props) {
    const t = String(texto == null ? '' : texto);
    if (!RE_EMOJI.test(t)) return [new D.TextRun(Object.assign({ text: t }, props))];
    return t.split(RE_EMOJI_G).filter((x) => x !== '').map((x) => RE_EMOJI.test(x) && /^\S+$/.test(x) && !/^[0-9#*]$/.test(x)
      ? new D.TextRun(Object.assign({}, props, { text: x, font: { ascii: 'Segoe UI Emoji', hAnsi: 'Segoe UI Emoji', cs: 'Segoe UI Emoji', eastAsia: 'Segoe UI Emoji' } }))
      : new D.TextRun(Object.assign({ text: x }, props)));
  }
  function P(texto, o) {
    o = o || {};
    return new D.Paragraph({ children: runs(texto, o), alignment: o.align, spacing: { before: o.antes || 0, after: o.despues == null ? 120 : o.despues, line: o.linea }, keepNext: !!o.keepNext,
      heading: o.heading, pageBreakBefore: !!o.saltoAntes, indent: o.sangria ? { left: o.sangria } : undefined });
  }
  // Varias líneas -> varios párrafos (cada \n es un párrafo; líneas vacías se omiten)
  function bloqueTexto(texto, o) {
    return String(texto || '').split(/\n/).map((l) => l.trim()).filter(Boolean).map((l) => P(l, o));
  }
  const sinBordes = () => { const n = { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' }; return { top: n, bottom: n, left: n, right: n, insideHorizontal: n, insideVertical: n }; };
  const borde = (color, size) => { const b = { style: D.BorderStyle.SINGLE, size: size || 6, color }; return { top: b, bottom: b, left: b, right: b }; };
  function celda(hijos, o) {
    o = o || {};
    return new D.TableCell({ children: hijos.length ? hijos : [P('')], width: { size: o.ancho, type: D.WidthType.DXA }, shading: o.fondo ? { type: D.ShadingType.CLEAR, color: 'auto', fill: o.fondo } : undefined,
      margins: { top: o.m == null ? 100 : o.m, bottom: o.m == null ? 100 : o.m, left: 140, right: 140 }, borders: o.bordes, verticalAlign: o.vAlign, columnSpan: o.span });
  }
  function tabla(filas, anchos, o) {
    o = o || {};
    return new D.Table({ rows: filas, width: { size: anchos.reduce((a, b) => a + b, 0), type: D.WidthType.DXA }, columnWidths: anchos, borders: o.bordes || sinBordes(), layout: D.TableLayoutType.FIXED });
  }
  // Caja de una celda (Versión B, diseño, etc.)
  function caja(hijos, fondo, color) {
    return tabla([new D.TableRow({ children: [celda(hijos, { ancho: ANCHO, fondo, m: 140 })] })], [ANCHO], { bordes: Object.assign(sinBordes(), borde(color || C.teal, 8)) });
  }
  const esp = (n) => new D.Paragraph({ children: [], spacing: { after: n == null ? 120 : n } });
  function tablaDatos(encabezados, filas, anchos, colorCab) {
    const cab = new D.TableRow({ tableHeader: true, children: encabezados.map((h, i) => celda([P(h, { bold: true, color: 'FFFFFF', size: 18, despues: 0 })], { ancho: anchos[i], fondo: colorCab || C.teal })) });
    const cuerpo = filas.map((f, k) => new D.TableRow({ children: f.map((v, i) => celda(bloqueTexto(v, { size: 18, despues: 40 }), { ancho: anchos[i], fondo: k % 2 ? C.fondo : undefined })) }));
    const b = { style: D.BorderStyle.SINGLE, size: 4, color: C.linea };
    return tabla([cab].concat(cuerpo), anchos, { bordes: { top: b, bottom: b, left: b, right: b, insideHorizontal: b, insideVertical: b } });
  }
  function encabezadoLogo(ctx, derecha) {
    const hijosIzq = ctx.logo ? [new D.Paragraph({ children: [new D.ImageRun({ data: ctx.logo.data, transformation: { width: 150, height: ctx.logo.alto || 42 } })] })] : [P('Ideas Control', { bold: true, color: C.navy })];
    const ab = { style: D.BorderStyle.SINGLE, size: 8, color: C.azul };
    return new D.Header({ children: [tabla([new D.TableRow({ children: [
      celda(hijosIzq, { ancho: 5040, m: 40, vAlign: D.VerticalAlign.BOTTOM }),
      celda([P(derecha, { bold: true, color: C.navy, size: 16, align: D.AlignmentType.RIGHT, despues: 0 })], { ancho: 5040, m: 40, vAlign: D.VerticalAlign.BOTTOM })] })], [5040, 5040],
      { bordes: Object.assign(sinBordes(), { bottom: ab }) })] });
  }
  function pie(texto) {
    return new D.Footer({ children: [P(texto, { size: 15, color: C.suave, align: D.AlignmentType.CENTER, despues: 0 })] });
  }
  const pagina = () => ({ page: { size: { width: 12240, height: 15840 }, margin: { top: 1300, bottom: 1000, left: 1080, right: 1080, header: 500, footer: 450 } } });

  // =====================================================================
  // CONTENIDO DE LA SEMANA
  // =====================================================================
  const CAMPOS_TEMA = [['tema', 'Tema / título de trabajo'], ['hook', 'Hook / Guion'], ['problema', 'Problema'], ['autoridad', 'Autoridad'], ['solucion', 'Solución'], ['cta', 'CTA'],
    ['valor', 'Valor Agregado'], ['seo', 'SEO'], ['objetivo', 'Objetivo'], ['enfoque', 'Enfoque'], ['proposito', 'Propósito'], ['promesa', 'Promesa']];

  function h(nivel, texto, o) {
    const tam = { 1: 30, 2: 26, 3: 22, 4: 20 }[nivel], col = nivel === 1 ? C.navy : nivel === 2 ? C.azul : C.teal;
    return new D.Paragraph({ heading: D.HeadingLevel['HEADING_' + nivel], children: emo(texto, { bold: true, size: tam, color: col, font: 'Calibri' }),
      spacing: { before: nivel === 1 ? 360 : nivel === 2 ? 280 : 200, after: 100 }, keepNext: true, pageBreakBefore: !!(o && o.salto) });
  }

  function pieza(p, ctx) {
    const out = [];
    out.push(h(3, p.seccion || p.titulo || p.id));
    const meta = [p.fechaTxt, p.formato ? 'Formato: ' + p.formato : '', p.herramienta ? 'Herramienta: ' + p.herramienta : '', p.pubId || ''].filter(Boolean).join('  ·  ');
    if (meta) out.push(P('📅 ' + meta, { size: 17, color: C.gris, despues: 60 }));
    if (p.por_que_formato) out.push(P('¿Por qué este formato? ' + p.por_que_formato, { italics: true, size: 17, color: C.gris, despues: 140 }));
    out.push.apply(out, bloqueTexto(p.copy));
    if (p.contacto) out.push.apply(out, bloqueTexto(p.contacto, { size: 20, despues: 40 }));
    if (p.hashtags) out.push(P(p.hashtags, { color: C.azul, size: 19, antes: 60 }));
    if (p.enlace) out.push(P(p.enlace, { size: 17, color: C.gris, antes: 40 }));
    if (p.copy_b) {
      out.push(esp(60));
      out.push(caja([P('🔁 VERSIÓN B (optimizada) – ' + (p.seccion || ''), { bold: true, color: C.navy, size: 20 })].concat(bloqueTexto(p.copy_b, { size: 20, despues: 80 }),
        p.nota_b ? [P('Notas: ' + p.nota_b, { italics: true, size: 17, color: C.gris, antes: 60, despues: 0 })] : []), C.tealClaro, C.teal));
      out.push(esp(120));
    }
    (p.variantes || []).forEach((v) => {
      if (!v || !v.copy) return;
      out.push(h(4, v.nombre || 'Variante'));
      out.push.apply(out, bloqueTexto(v.copy));
    });
    const d = p.diseno || {};
    if (d.descripcion || (d.laminas || []).length || d.texto_en_imagen) {
      const hijos = [P('🎨 Diseño de la pieza' + (d.medidas ? ' · ' + d.medidas : ''), { bold: true, color: C.navy, size: 20 })];
      if (d.descripcion) hijos.push.apply(hijos, bloqueTexto(d.descripcion, { size: 19, despues: 60 }));
      if (d.texto_en_imagen) hijos.push(P('**Texto en la imagen:** ' + d.texto_en_imagen, { size: 19, despues: 60 }));
      (d.laminas || []).forEach((l) => hijos.push(P('• ' + l, { size: 19, despues: 40, sangria: 200 })));
      out.push(esp(40)); out.push(caja(hijos, C.azulClaro, C.azul)); out.push(esp(120));
    }
    const v = p.video;
    if (v && (v.tramos || v.clips || v.heygen || v.solo_guion)) {
      out.push(h(4, '🎬 Video – ' + (v.herramienta || 'CapCut') + (v.duracion ? ' (' + v.duracion + ')' : '')));
      if (v.escena) out.push(P('**ESCENA:** ' + v.escena, { size: 20 }));
      const tr = (v.tramos || []).filter((t) => t && (t.en_pantalla || t.voz));
      if (tr.length) { out.push(tablaDatos(['Tramo', 'Tiempo', 'En pantalla', 'Voz'], tr.map((t) => [t.tramo || '', t.tiempo || '', t.en_pantalla || '', t.voz || '']), [1500, 1100, 3740, 3740])); out.push(esp()); }
      const cl = (v.clips || []).filter((c) => c && (c.muestra || c.buscar_canva));
      if (cl.length) {
        out.push(P('Clips para CapCut (descargar de Canva)', { bold: true, color: C.navy, size: 20, keepNext: true }));
        out.push(tablaDatos(['Segmento', 'Qué muestra', 'Qué buscar en Canva', 'Duración del clip'], cl.map((c) => [c.segmento || '', c.muestra || '', String(c.buscar_canva || '').split(/\s*;\s*/).join('\n'), c.duracion || '']), [1700, 2900, 3280, 2200]));
        out.push(esp());
      }
      const hg = v.heygen || {};
      if (hg.guion || hg.avatar) {
        out.push(caja([P('🧑‍💼 HeyGen – video con avatar', { bold: true, color: C.navy, size: 20 }),
          hg.avatar ? P('**Avatar:** ' + hg.avatar, { size: 19, despues: 40 }) : esp(0), hg.escenario ? P('**Escenario:** ' + hg.escenario, { size: 19, despues: 40 }) : esp(0),
          hg.tono ? P('**Tono:** ' + hg.tono, { size: 19, despues: 80 }) : esp(0)].concat(hg.guion ? [P('Guion:', { bold: true, size: 19, despues: 40 })].concat(bloqueTexto(hg.guion, { size: 19, despues: 60 })) : []), C.fondo, C.gris));
        out.push(esp());
      }
      if (v.solo_guion) { out.push(h(4, 'Solo guion')); out.push.apply(out, bloqueTexto(v.solo_guion, { italics: true })); }
    }
    return out;
  }

  async function contenido(datos, ctx) {
    await cargar();
    const t = ctx.tema || {}, hijos = [];
    hijos.push(P(ctx.titulo, { bold: true, size: 34, color: C.navy, align: D.AlignmentType.CENTER, despues: 200 }));
    hijos.push(h(1, '1  Tema'));
    hijos.push(tabla(CAMPOS_TEMA.filter((c) => t[c[0]]).map((c) => new D.TableRow({ children: [
      celda([P(c[1], { bold: true, color: 'FFFFFF', size: 18, align: D.AlignmentType.CENTER, despues: 0 })], { ancho: 2300, fondo: C.teal, vAlign: D.VerticalAlign.CENTER, m: 60 }),
      celda([P(t[c[0]], { size: 18, despues: 0 })], { ancho: 7780, m: 60, vAlign: D.VerticalAlign.CENTER })] })), [2300, 7780],
      { bordes: { top: { style: D.BorderStyle.SINGLE, size: 4, color: 'FFFFFF' }, bottom: { style: D.BorderStyle.SINGLE, size: 4, color: 'FFFFFF' }, left: { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, insideHorizontal: { style: D.BorderStyle.SINGLE, size: 4, color: 'FFFFFF' }, insideVertical: { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' } } }));
    hijos.push(h(1, '2  Contenido', { salto: true }));
    let grupo = null;
    (datos.piezas || []).forEach((p) => {
      if (p.grupo !== grupo) { grupo = p.grupo; hijos.push(h(2, grupo || 'Publicación')); }
      hijos.push.apply(hijos, pieza(p, ctx));
    });
    const e = datos.estrategia || {};
    const filasE = [['Objetivo', e.objetivo], ['Concepto', e.concepto], ['Posicionamiento', e.posicionamiento], ['Mecanismo', e.mecanismo], ['Oferta', e.oferta], ['Público', e.publico], ['Objetivo de campaña', e.objetivo_campana], ['Mensaje central', e.mensaje_central]].filter((x) => x[1]);
    if (filasE.length || (e.ajustes || []).length) {
      hijos.push(h(1, '3  Estrategia', { salto: true }));
      hijos.push(h(3, 'Estrategia de campaña — Ideas Control'));
      filasE.forEach((x) => hijos.push(P('**' + x[0] + ':** ' + x[1], { despues: 100 })));
      const aj = (e.ajustes || []).filter((a) => a && a.detalle);
      if (aj.length) { hijos.push(h(4, 'Ajustes recomendados')); hijos.push(tablaDatos(['Aspecto', 'Detalle'], aj.map((a) => [a.aspecto || '', a.detalle]), [2300, 7780], C.navy)); }
    }
    const doc = new D.Document({
      creator: 'Ideas Control · Marketing (APP-112)', title: ctx.titulo,
      styles: { default: { document: { run: { font: 'Calibri', size: 21, color: '1D2B36' } } } },
      sections: [{ properties: pagina(), headers: { default: encabezadoLogo(ctx, 'CONTENIDO DE LA SEMANA  |  ' + (ctx.fechaTxt || '')) }, footers: { default: pie('Ideas Control • Equipos y Soluciones S.A.S. • Marketing • ' + (t.Title || '')) }, children: hijos }]
    });
    return empacar(doc);
  }

  // =====================================================================
  // NEWSLETTER
  // =====================================================================
  async function newsletter(n, ctx) {
    await cargar();
    const F = 'Arial', hijos = [];
    const tit = String(n.titulo || ''), res = String(n.titulo_resaltado || '');
    const corte = res && tit.endsWith(res) ? tit.length - res.length : -1;
    const tituloRuns = corte > 0
      ? [new D.Paragraph({ children: emo(tit.slice(0, corte).trim(), { bold: true, size: 52, color: C.navy, font: F }), spacing: { after: 0 } }),
         new D.Paragraph({ children: emo(res, { bold: true, size: 52, color: C.azul, font: F }), spacing: { after: 160 } })]
      : [new D.Paragraph({ children: emo(tit, { bold: true, size: 52, color: C.navy, font: F }), spacing: { after: 160 } })];
    hijos.push.apply(hijos, tituloRuns);
    if (n.bajada) hijos.push(P(n.bajada, { bold: true, size: 22, color: C.navy, despues: 240 }));
    const pr = (t, o) => P(t, Object.assign({ size: 21, despues: 140, linea: 290 }, o || {}));
    (n.bloques || []).forEach((b) => {
      if (!b) return;
      switch (b.tipo) {
        case 'parrafos': [].concat(b.texto || []).forEach((t) => hijos.push(pr(t))); break;
        case 'subtitulo': hijos.push(new D.Paragraph({ children: emo(b.texto || '', { bold: true, size: 30, color: C.navy, font: F }), spacing: { before: 300, after: 120 }, keepNext: true })); break;
        case 'comparacion': {
          if (b.titulo) hijos.push(P(String(b.titulo).toUpperCase(), { bold: true, size: 16, color: C.gris, align: D.AlignmentType.CENTER, antes: 120, despues: 80 }));
          const lado = (x, color) => [P(String((x || {}).titulo || '').toUpperCase(), { bold: true, size: 18, color, align: D.AlignmentType.CENTER, despues: 80 })].concat(((x || {}).items || []).map((i) => P('• ' + i, { size: 18, despues: 40 })));
          hijos.push(tabla([new D.TableRow({ children: [celda(lado(b.izquierda, C.rojo), { ancho: 5040, fondo: C.rojoClaro, m: 140 }), celda(lado(b.derecha, C.verde), { ancho: 5040, fondo: C.verdeClaro, m: 140 })] })], [5040, 5040],
            { bordes: Object.assign(sinBordes(), { insideVertical: { style: D.BorderStyle.SINGLE, size: 12, color: 'FFFFFF' } }) }));
          hijos.push(esp(200)); break;
        }
        case 'cita': {
          const ls = String(b.texto || '').split(/\n/).filter(Boolean);
          hijos.push(esp(60));
          hijos.push(tabla([new D.TableRow({ children: [celda(ls.map((l, i) => P(l, { bold: true, size: 26, color: i ? C.azul : C.navy, align: D.AlignmentType.CENTER, despues: 0 })), { ancho: ANCHO, fondo: C.azulClaro, m: 260 })] })], [ANCHO],
            { bordes: Object.assign(sinBordes(), { left: { style: D.BorderStyle.SINGLE, size: 24, color: C.azul } }) }));
          hijos.push(esp(200)); break;
        }
        case 'tarjetas': {
          const b2 = { style: D.BorderStyle.SINGLE, size: 4, color: C.linea };
          hijos.push(tabla((b.items || []).map((it, i) => new D.TableRow({ children: [
            celda([P(String(i + 1), { bold: true, size: 32, color: 'FFFFFF', align: D.AlignmentType.CENTER, despues: 0 })], { ancho: 900, fondo: C.navy, vAlign: D.VerticalAlign.CENTER }),
            celda([P(String(it.titulo || '').toUpperCase(), { bold: true, size: 18, color: C.azul, despues: 40 }), P(it.texto || '', { size: 19, despues: 0 })], { ancho: 9180, fondo: C.fondo, m: 140 })] })), [900, 9180],
            { bordes: { top: b2, bottom: b2, left: b2, right: b2, insideHorizontal: { style: D.BorderStyle.SINGLE, size: 12, color: 'FFFFFF' }, insideVertical: { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' } } }));
          hijos.push(esp(200)); break;
        }
        case 'pasos': {
          const it = (b.items || []).slice(0, 6), w = Math.floor(ANCHO / Math.max(1, it.length)), anchos = it.map(() => w);
          const bb = { style: D.BorderStyle.SINGLE, size: 4, color: 'C9DCEB' };
          hijos.push(tabla([new D.TableRow({ children: it.map((x, i) => celda([
            P(String(i + 1).padStart(2, '0') + (i < it.length - 1 ? ' →' : ''), { bold: true, size: 18, color: C.azul, align: D.AlignmentType.CENTER, despues: 40 }),
            P(String(x.titulo || '').toUpperCase(), { bold: true, size: 17, color: C.navy, align: D.AlignmentType.CENTER, despues: 40 }),
            P(x.texto || '', { size: 15, color: C.gris, align: D.AlignmentType.CENTER, despues: 0 })], { ancho: w, fondo: C.azulClaro })) })], anchos,
            { bordes: { top: bb, bottom: bb, left: bb, right: bb, insideVertical: bb, insideHorizontal: bb } }));
          hijos.push(esp(200)); break;
        }
        case 'checklist': {
          if (b.titulo) hijos.push(new D.Paragraph({ children: emo(b.titulo, { bold: true, size: 30, color: C.navy, font: F }), spacing: { before: 300, after: 120 }, keepNext: true }));
          hijos.push(caja((b.items || []).map((i) => P('☐  ' + i, { size: 19, despues: 70 })).concat(b.cierre ? [P(b.cierre, { size: 18, color: C.gris, antes: 60, despues: 0 })] : []), 'FFFFFF', C.linea));
          hijos.push(esp(200)); break;
        }
        case 'frase':
          hijos.push(esp(60));
          hijos.push(tabla([new D.TableRow({ children: [celda([P(b.linea1 || '', { bold: true, size: 26, color: 'FFFFFF', align: D.AlignmentType.CENTER, despues: 40 }), P(b.linea2 || '', { bold: true, size: 26, color: '7CC4F2', align: D.AlignmentType.CENTER, despues: 0 })], { ancho: ANCHO, fondo: C.navy, m: 300 })] })], [ANCHO]));
          hijos.push(esp(200)); break;
        case 'pregunta':
          if (b.titulo) hijos.push(new D.Paragraph({ children: emo(b.titulo, { bold: true, size: 30, color: C.navy, font: F }), spacing: { before: 200, after: 100 }, keepNext: true }));
          if (b.destacado) hijos.push(pr(b.destacado, { bold: true }));
          if (b.texto) hijos.push(pr(b.texto));
          break;
        default:
          if (b.texto) [].concat(b.texto).forEach((t) => hijos.push(pr(t)));
      }
    });
    const cta = n.cta || {};
    hijos.push(esp(100));
    hijos.push(tabla([new D.TableRow({ children: [celda([
      P(String(cta.titulo || 'CONVERSEMOS').toUpperCase(), { bold: true, size: 20, color: C.navy, align: D.AlignmentType.CENTER, despues: 60 }),
      cta.texto ? P(cta.texto, { size: 19, color: C.gris, align: D.AlignmentType.CENTER, despues: 60 }) : esp(0),
      P(ctx.contactoLinea || '', { bold: true, size: 19, color: C.azul, align: D.AlignmentType.CENTER, despues: 0 })], { ancho: ANCHO, fondo: C.azulClaro, m: 220 })] })], [ANCHO],
      { bordes: Object.assign(sinBordes(), { top: { style: D.BorderStyle.SINGLE, size: 8, color: C.azul } }) }));
    hijos.push(esp(200));
    if (cta.enlace_texto) hijos.push(P(cta.enlace_texto, { bold: true, color: C.azul, size: 22, align: D.AlignmentType.CENTER, despues: 60 }));
    if (n.cierre) hijos.push(P(n.cierre, { bold: true, color: C.navy, size: 22, align: D.AlignmentType.CENTER, despues: 0 }));

    // Ficha editorial
    const f = n.ficha || {}, et = (t) => P(t, { bold: true, color: C.azul, size: 19, antes: 160, despues: 40 }), vt = (t) => P(t, { size: 20, despues: 40 });
    hijos.push(new D.Paragraph({ pageBreakBefore: true, children: emo('NEWSLETTER IDEAS CONTROL — Ficha editorial', { bold: true, size: 30, color: C.navy, font: F }), spacing: { after: 160 } }));
    hijos.push(et('Título'), vt(n.titulo || ''));
    if (n.bajada) hijos.push(et('Bajada / subtítulo'), vt(n.bajada));
    hijos.push(et('Fecha de publicación'), vt(ctx.fechaPublicacion || ''));
    if (f.cta) hijos.push(et('CTA'), vt(f.cta));
    hijos.push(et('SEO'), vt('**Keyword principal:** ' + (f.keyword || '')), vt('**Keywords secundarias:** ' + (f.keywords_secundarias || '')), vt('**Intención de búsqueda:** ' + (f.intencion || '')));
    if (f.frase_destacable) hijos.push(et('Frase destacable'), vt('**' + f.frase_destacable + '**'));
    const rec = [].concat(f.recomendacion || []).filter(Boolean);
    hijos.push(et('Recomendación estratégica'));
    (rec.length ? rec : ['La matriz está correctamente alineada con el contenido desarrollado.']).forEach((r, i) => hijos.push(vt(rec.length > 1 ? '**' + (i + 1) + '.** ' + r : r)));

    const doc = new D.Document({
      creator: 'Ideas Control · Marketing (APP-112)', title: n.titulo || 'Newsletter Ideas Control',
      styles: { default: { document: { run: { font: F, size: 21, color: '1D2B36' } } } },
      sections: [{ properties: pagina(), headers: { default: encabezadoLogo(ctx, 'NEWSLETTER  |  ' + (ctx.fechaTxt || '')) }, footers: { default: pie('Ideas Control • Equipos y Soluciones S.A.S. • Tiempo & Asistencia • WFM') }, children: hijos }]
    });
    return empacar(doc);
  }

  // =====================================================================
  // INFORME DE MARKETING (Resumen + análisis de Claude)
  // =====================================================================
  async function informe(d, a, ctx) {
    await cargar();
    const n = (v) => Math.round(Number(v) || 0).toLocaleString('es-CO');
    const p = (v) => (v === null || v === undefined || !isFinite(v)) ? '—' : (Math.round(v * 1000) / 10).toLocaleString('es-CO') + ' %';
    const cop = (v) => v ? '$ ' + n(v) : '—';
    const vari = (x, y) => y ? ((x - y) / y >= 0 ? '+' : '') + (Math.round((x - y) / y * 1000) / 10).toLocaleString('es-CO') + ' %' : '—';
    const t = d.total, an = d.anterior.t, hijos = [];
    hijos.push(P('Informe de marketing en redes sociales', { bold: true, size: 40, color: C.navy, despues: 40 }));
    hijos.push(P(ctx.periodo, { size: 22, color: C.azul, bold: true, despues: 200 }));
    if (a && a.titular) hijos.push(caja([P(a.titular, { bold: true, size: 24, color: C.navy, despues: 0 })], C.azulClaro, C.azul), esp(160));
    (a && a.resumen || []).forEach((x) => hijos.push(P(x, { despues: 120, linea: 290 })));

    hijos.push(h(2, 'Resultados del periodo'));
    const kpis = [['Alcance', n(t.alcance), n(an.alcance), vari(t.alcance, an.alcance), n(d.metas.alcance)], ['Impresiones', n(t.impresiones), n(an.impresiones), vari(t.impresiones, an.impresiones), '—'],
      ['Interacciones', n(t.interacciones), n(an.interacciones), vari(t.interacciones, an.interacciones), n(d.metas.interacciones)], ['Tasa de interacción', p(t.tasa), p(an.tasa), '—', '—'],
      ['Clics al enlace', n(t.clics), n(an.clics), vari(t.clics, an.clics), n(d.metas.clics)], ['Nuevos seguidores', n(t.nuevos_seguidores), n(an.nuevos_seguidores), vari(t.nuevos_seguidores, an.nuevos_seguidores), '—'],
      ['Reproducciones de video', n(t.reproducciones), n(an.reproducciones), vari(t.reproducciones, an.reproducciones), '—'], ['Inversión en pauta', cop(t.inversion), cop(an.inversion), vari(t.inversion, an.inversion), '—'],
      ['Resultados de pauta', n(t.resultados), n(an.resultados), vari(t.resultados, an.resultados), n(d.metas.leads)], ['Plan cumplido (publicadas / planeadas)', d.plan.publicadas + ' / ' + d.plan.planeadas, '—', '—', '—']];
    hijos.push(tablaDatos(['Indicador', 'Este periodo', 'Periodo anterior', 'Variación', 'Meta'], kpis, [3280, 1700, 1700, 1700, 1700], C.navy), esp());

    if (d.redes.length) {
      hijos.push(h(2, 'Por red'));
      hijos.push(tablaDatos(['Red', 'Registros', 'Alcance', 'Impresiones', 'Interacciones', 'Tasa', 'Clics', 'Inversión'],
        d.redes.map((r) => [r.red, String(r.t.registros), n(r.t.alcance), n(r.t.impresiones), n(r.t.interacciones), p(r.t.tasa), n(r.t.clics), cop(r.t.inversion)]), [1500, 1100, 1250, 1350, 1350, 1100, 1080, 1350]), esp());
      (a && a.por_red || []).forEach((r) => { if (!r || !(r.lectura || r.recomendacion)) return; hijos.push(P('**' + (r.red || '') + ':** ' + (r.lectura || ''), { despues: 40 })); if (r.recomendacion) hijos.push(P('→ ' + r.recomendacion, { color: C.teal, despues: 120, sangria: 200 })); });
    }
    if (d.semanas.length > 1) {
      hijos.push(h(2, 'Por semana de campaña'));
      hijos.push(tablaDatos(['Semana (lunes)', 'Tema', 'Alcance', 'Interacciones', 'Clics'], d.semanas.map((s) => [s.semana, s.tema || '—', n(s.t.alcance), n(s.t.interacciones), n(s.t.clics)]), [1700, 4280, 1400, 1400, 1300]), esp());
    }
    const conDatos = d.posts.filter((x) => x.alcance || x.impresiones || x.interacciones || x.clics || x.reproducciones);
    if (conDatos.length) {
      hijos.push(h(2, 'Contenido destacado'));
      hijos.push(tablaDatos(['Post', 'Red', 'Fecha', 'Alcance', 'Interac.', 'Clics'], conDatos.slice(0, 10).map((x) => [x.nombre || '—', x.red + (x.tipo === 'Pago' ? ' (pago)' : ''), x.fecha, n(x.alcance), n(x.interacciones), n(x.clics)]), [4380, 1500, 1300, 1000, 1000, 900]), esp());
    }
    if (a) {
      const dos = (a.destacados || []).length || (a.alertas || []).length;
      if (dos) {
        hijos.push(h(2, 'Lectura del periodo'));
        const col = (tit, arr, fondo, color) => [P(tit, { bold: true, color, size: 21, despues: 80 })].concat((arr || []).filter(Boolean).map((x) => P('**' + (x.titulo || '') + '.** ' + (x.detalle || ''), { size: 19, despues: 80 })));
        hijos.push(tabla([new D.TableRow({ children: [celda(col('✅ Lo que funcionó', a.destacados, C.verdeClaro, C.verde), { ancho: 5040, fondo: C.verdeClaro, m: 160 }), celda(col('⚠️ Para revisar', a.alertas, C.rojoClaro, C.rojo), { ancho: 5040, fondo: C.rojoClaro, m: 160 })] })], [5040, 5040],
          { bordes: Object.assign(sinBordes(), { insideVertical: { style: D.BorderStyle.SINGLE, size: 12, color: 'FFFFFF' } }) }), esp());
      }
      if ((a.recomendaciones || []).length) {
        hijos.push(h(2, 'Recomendaciones'));
        hijos.push(tablaDatos(['Prioridad', 'Acción', 'Por qué', 'Red'], a.recomendaciones.filter(Boolean).map((r) => [r.prioridad || '—', r.accion || '', r.por_que || '', r.red || '']), [1200, 3600, 3880, 1400], C.teal), esp());
      }
      if ((a.aprendizajes || []).length) { hijos.push(h(3, 'Aprendizajes')); a.aprendizajes.filter(Boolean).forEach((x) => hijos.push(P('• ' + x, { despues: 60, sangria: 200 }))); }
      const ps = a.proxima_semana || {};
      if (ps.enfoque || (ps.ideas || []).length) {
        hijos.push(h(3, 'Para la próxima semana'));
        if (ps.enfoque) hijos.push(P(ps.enfoque, { despues: 80 }));
        (ps.ideas || []).filter(Boolean).forEach((x) => hijos.push(P('• ' + x, { despues: 60, sangria: 200 })));
      }
      if (a.nota_datos) hijos.push(esp(80), P('Sobre los datos: ' + a.nota_datos, { italics: true, size: 17, color: C.gris }));
      if (a._meta) hijos.push(P('Análisis elaborado con Claude a partir de las métricas del portal' + (a._meta.por ? ' · ' + a._meta.por : '') + ' · ' + new Date(a._meta.fecha).toLocaleDateString('es-CO'), { size: 15, color: C.suave, antes: 200 }));
    }
    const doc = new D.Document({
      creator: 'Ideas Control · Marketing (APP-112)', title: 'Informe de marketing · ' + ctx.periodo,
      styles: { default: { document: { run: { font: 'Calibri', size: 21, color: '1D2B36' } } } },
      sections: [{ properties: pagina(), headers: { default: encabezadoLogo(ctx, 'INFORME DE MARKETING  |  ' + ctx.periodo) }, footers: { default: pie('Ideas Control • Equipos y Soluciones S.A.S. • Marketing') }, children: hijos }]
    });
    return empacar(doc);
  }

  return { cargar, contenido, newsletter, informe };
})();
