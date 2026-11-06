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

  // ---------- Texto con **negritas** ----------
  function runs(texto, o) {
    o = o || {};
    const partes = String(texto == null ? '' : texto).split(/(\*\*[^*]+\*\*)/g).filter((x) => x !== '');
    if (!partes.length) partes.push('');
    return partes.map((p) => {
      const neg = /^\*\*[^*]+\*\*$/.test(p);
      return new D.TextRun({ text: neg ? p.slice(2, -2) : p, bold: neg || !!o.bold, italics: !!o.italics, color: o.color, size: o.size, font: o.font });
    });
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
    return new D.Paragraph({ heading: D.HeadingLevel['HEADING_' + nivel], children: [new D.TextRun({ text: texto, bold: true, size: tam, color: col, font: 'Calibri' })],
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
    return D.Packer.toBlob(doc);
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
      ? [new D.Paragraph({ children: [new D.TextRun({ text: tit.slice(0, corte).trim(), bold: true, size: 52, color: C.navy, font: F })], spacing: { after: 0 } }),
         new D.Paragraph({ children: [new D.TextRun({ text: res, bold: true, size: 52, color: C.azul, font: F })], spacing: { after: 160 } })]
      : [new D.Paragraph({ children: [new D.TextRun({ text: tit, bold: true, size: 52, color: C.navy, font: F })], spacing: { after: 160 } })];
    hijos.push.apply(hijos, tituloRuns);
    if (n.bajada) hijos.push(P('**' + n.bajada + '**', { size: 22, color: C.navy, despues: 240 }));
    const pr = (t, o) => P(t, Object.assign({ size: 21, despues: 140, linea: 290 }, o || {}));
    (n.bloques || []).forEach((b) => {
      if (!b) return;
      switch (b.tipo) {
        case 'parrafos': [].concat(b.texto || []).forEach((t) => hijos.push(pr(t))); break;
        case 'subtitulo': hijos.push(new D.Paragraph({ children: [new D.TextRun({ text: b.texto || '', bold: true, size: 30, color: C.navy, font: F })], spacing: { before: 300, after: 120 }, keepNext: true })); break;
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
          if (b.titulo) hijos.push(new D.Paragraph({ children: [new D.TextRun({ text: b.titulo, bold: true, size: 30, color: C.navy, font: F })], spacing: { before: 300, after: 120 }, keepNext: true }));
          hijos.push(caja((b.items || []).map((i) => P('☐  ' + i, { size: 19, despues: 70 })).concat(b.cierre ? [P(b.cierre, { size: 18, color: C.gris, antes: 60, despues: 0 })] : []), 'FFFFFF', C.linea));
          hijos.push(esp(200)); break;
        }
        case 'frase':
          hijos.push(esp(60));
          hijos.push(tabla([new D.TableRow({ children: [celda([P(b.linea1 || '', { bold: true, size: 26, color: 'FFFFFF', align: D.AlignmentType.CENTER, despues: 40 }), P(b.linea2 || '', { bold: true, size: 26, color: '7CC4F2', align: D.AlignmentType.CENTER, despues: 0 })], { ancho: ANCHO, fondo: C.navy, m: 300 })] })], [ANCHO]));
          hijos.push(esp(200)); break;
        case 'pregunta':
          if (b.titulo) hijos.push(new D.Paragraph({ children: [new D.TextRun({ text: b.titulo, bold: true, size: 30, color: C.navy, font: F })], spacing: { before: 200, after: 100 }, keepNext: true }));
          if (b.destacado) hijos.push(pr('**' + b.destacado + '**'));
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
    if (cta.enlace_texto) hijos.push(P('**' + cta.enlace_texto + '**', { color: C.azul, size: 22, align: D.AlignmentType.CENTER, despues: 60 }));
    if (n.cierre) hijos.push(P('**' + n.cierre + '**', { color: C.navy, size: 22, align: D.AlignmentType.CENTER, despues: 0 }));

    // Ficha editorial
    const f = n.ficha || {}, et = (t) => P(t, { bold: true, color: C.azul, size: 19, antes: 160, despues: 40 }), vt = (t) => P(t, { size: 20, despues: 40 });
    hijos.push(new D.Paragraph({ pageBreakBefore: true, children: [new D.TextRun({ text: 'NEWSLETTER IDEAS CONTROL — Ficha editorial', bold: true, size: 30, color: C.navy, font: F })], spacing: { after: 160 } }));
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
    return D.Packer.toBlob(doc);
  }

  return { cargar, contenido, newsletter };
})();
