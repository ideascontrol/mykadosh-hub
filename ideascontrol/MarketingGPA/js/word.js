/* =====================================================================
   Marketing GPA — Word con la identidad GPA (docx.js)
   GPA_DOC.semana({ lunes, estrategia, piezas:[{pub, copy, enlace, partes, prompt}] }) -> Blob
   GPA_DOC.informe({ titulo, periodo, texto(markdown simple), kpis:[[k,v]] }) -> Blob
   ===================================================================== */
window.GPA_DOC = (function () {
  'use strict';
  const C = { navy: '1B3A6B', teal: '007A78', oro: 'C5A028', gris: '5B6770', linea: 'D5DCE1', claro: 'EEF3F8', tealClaro: 'E6F3F2' };
  const FUENTE = 'Calibri';
  let D = null;
  const cargarJs = (src, global) => window[global] ? Promise.resolve(window[global]) : new Promise((ok, mal) => {
    const s = document.createElement('script'); s.src = src; s.onload = () => ok(window[global]); s.onerror = () => mal(new Error('No se pudo cargar una librería. Revise la conexión.')); document.head.appendChild(s);
  });
  async function cargar() { D = await cargarJs('https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js', 'docx'); return D; }

  // Emojis partidos en el borde de un bloque (CESU-8) -> UTF-8 correcto (si no, Word no abre el archivo)
  function repararBytes(u8) {
    let malos = false;
    for (let i = 0; i + 5 < u8.length; i++) if (u8[i] === 0xED && (u8[i + 1] & 0xF0) === 0xA0 && u8[i + 3] === 0xED && (u8[i + 4] & 0xF0) === 0xB0) { malos = true; break; }
    if (!malos) return null;
    const out = new Uint8Array(u8.length); let j = 0;
    for (let i = 0; i < u8.length; i++) {
      if (u8[i] === 0xED && i + 5 < u8.length && (u8[i + 1] & 0xF0) === 0xA0 && u8[i + 3] === 0xED && (u8[i + 4] & 0xF0) === 0xB0) {
        const hi = 0xD000 | ((u8[i + 1] & 0x3F) << 6) | (u8[i + 2] & 0x3F), lo = 0xD000 | ((u8[i + 4] & 0x3F) << 6) | (u8[i + 5] & 0x3F);
        const cp = ((hi - 0xD800) << 10) + (lo - 0xDC00) + 0x10000;
        out[j++] = 0xF0 | (cp >> 18); out[j++] = 0x80 | ((cp >> 12) & 0x3F); out[j++] = 0x80 | ((cp >> 6) & 0x3F); out[j++] = 0x80 | (cp & 0x3F); i += 5;
      } else out[j++] = u8[i];
    }
    return out.slice(0, j);
  }
  async function empacar(doc) {
    const blob = await D.Packer.toBlob(doc);
    const Z = await cargarJs('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', 'JSZip'), zip = await Z.loadAsync(blob);
    let cambio = false;
    for (const n of Object.keys(zip.files)) { if (!/\.(xml|rels)$/i.test(n) || zip.files[n].dir) continue; const f = repararBytes(await zip.files[n].async('uint8array')); if (f) { zip.file(n, f); cambio = true; } }
    return cambio ? zip.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }) : blob;
  }
  const RE_EMOJI = /((?:\p{Extended_Pictographic}|\p{Regional_Indicator}{2}|[0-9#*]️?⃣)(?:️|‍\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}])*)/u;
  const RE_EMOJI_G = new RegExp(RE_EMOJI.source, 'gu');
  const EMO = { ascii: 'Segoe UI Emoji', hAnsi: 'Segoe UI Emoji', cs: 'Segoe UI Emoji', eastAsia: 'Segoe UI Emoji' };
  function emo(texto, props) {
    const t = String(texto == null ? '' : texto);
    if (!RE_EMOJI.test(t)) return [new D.TextRun(Object.assign({ text: t, font: FUENTE }, props))];
    return t.split(RE_EMOJI_G).filter((x) => x !== '').map((x) => RE_EMOJI.test(x) && /^\S+$/.test(x) && !/^[0-9#*]$/.test(x)
      ? new D.TextRun(Object.assign({}, props, { text: x, font: EMO })) : new D.TextRun(Object.assign({ text: x, font: FUENTE }, props)));
  }
  // **negrita** dentro del texto
  function runs(texto, o) {
    o = o || {};
    return String(texto == null ? '' : texto).split(/(\*\*[^*]+\*\*)/g).filter((x) => x !== '').map((p) => {
      const neg = /^\*\*[^*]+\*\*$/.test(p);
      return emo(neg ? p.slice(2, -2) : p, { bold: neg || !!o.bold, italics: !!o.italics, color: o.color, size: o.size });
    }).reduce((a, b) => a.concat(b), []);
  }
  const P = (t, o) => { o = o || {}; return new D.Paragraph({ children: runs(t, o), spacing: { before: o.antes || 0, after: o.despues == null ? 100 : o.despues }, keepNext: !!o.keepNext, alignment: o.align, indent: o.sangria ? { left: o.sangria } : undefined }); };
  const bloque = (t, o) => String(t || '').split(/\n/).map((l) => l.trim()).filter(Boolean).map((l) => P(l, o));
  const H = (n, t, o) => new D.Paragraph({ heading: D.HeadingLevel['HEADING_' + n], children: emo(t, { bold: true, size: { 1: 32, 2: 26, 3: 22 }[n], color: n === 1 ? C.navy : n === 2 ? C.teal : C.navy }), spacing: { before: n === 1 ? 300 : 220, after: 100 }, keepNext: true, pageBreakBefore: !!(o && o.salto) });
  const borde = (c) => { const b = { style: D.BorderStyle.SINGLE, size: 6, color: c }; return { top: b, bottom: b, left: b, right: b }; };
  function caja(titulo, hijos, color, fondo) {
    return new D.Table({ width: { size: 100, type: D.WidthType.PERCENTAGE }, rows: [new D.TableRow({ children: [new D.TableCell({ shading: { fill: fondo || C.claro, type: D.ShadingType.CLEAR, color: 'auto' }, borders: borde(color || C.linea),
      margins: { top: 100, bottom: 100, left: 160, right: 160 }, children: [P(titulo, { bold: true, color: color || C.navy, size: 18, despues: 60 })].concat(hijos) })] })] });
  }
  function doc(secciones, titulo) {
    return new D.Document({ creator: 'Growth Path Academy', title: titulo, styles: { default: { document: { run: { font: FUENTE, size: 21 } } } },
      sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1080, right: 1080 } } },
        headers: { default: new D.Header({ children: [new D.Paragraph({ alignment: D.AlignmentType.RIGHT, children: emo('Growth Path Academy · Menos teoría. Más piso.', { size: 16, color: C.gris }) })] }) },
        footers: { default: new D.Footer({ children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ children: [D.PageNumber.CURRENT], size: 16, color: C.gris })] })] }) },
        children: secciones }] });
  }

  // Logo de GPA (PNG 900×478) o, si no carga, el nombre
  const portada = (logo) => logo ? new D.Paragraph({ children: [new D.ImageRun({ data: logo, transformation: { width: 190, height: 101 } })], spacing: { after: 120 } })
    : new D.Paragraph({ children: emo('GROWTH PATH ACADEMY', { bold: true, size: 18, color: C.teal }), spacing: { after: 40 } });
  async function semana(d) {
    await cargar();
    const e = d.estrategia || {}, out = [];
    out.push(portada(d.logo));
    out.push(new D.Paragraph({ children: emo('Contenido de la semana del ' + d.fechaTxt, { bold: true, size: 40, color: C.navy }), spacing: { after: 120 } }));
    if (e.tema) out.push(caja('Estrategia de la semana', [P('**Tema:** ' + e.tema), e.objetivo ? P('**Objetivo:** ' + e.objetivo) : null, e.angulos ? P('**Ángulos:** ' + e.angulos) : null, e.cta ? P('**CTA recomendado:** ' + e.cta, { despues: 0 }) : null].filter(Boolean), C.teal, C.tealClaro));
    let diaAnt = '';
    d.piezas.forEach((x, i) => {
      const p = x.pub;
      if (x.diaTxt !== diaAnt) { out.push(H(1, x.diaTxt, { salto: i > 0 })); diaAnt = x.diaTxt; }
      out.push(H(2, p.canal + ' · ' + p.formato));
      out.push(P('🆔 ' + p.id + '   ·   Etapa: ' + (p.etapa || '—') + '   ·   Estado: ' + p.estado + (p.indicador ? '   ·   Indicador: ' + p.indicador : ''), { size: 17, color: C.gris }));
      out.push(H(3, 'Copy para publicar'));
      out.push.apply(out, bloque(x.copy));
      if (x.enlace) out.push(P('🔗 ' + x.enlace, { size: 17, color: C.teal }));
      if (x.guion) { out.push(H(3, 'Guion del video')); out.push.apply(out, bloque(x.guion, { size: 19 })); }
      const dis = [];
      if (x.diseno) dis.push(P('**Qué se ve:** ' + x.diseno));
      if (x.textoImg) dis.push(P('**Texto en la imagen:** ' + x.textoImg));
      (x.partes || []).forEach((l) => dis.push(P('• ' + l, { sangria: 200, despues: 40 })));
      if (dis.length) { out.push(new D.Paragraph({ spacing: { after: 60 } })); out.push(caja('🎨 Diseño de la pieza (' + x.medidas + ')', dis)); }
      if (p.recurso || p.pagina) out.push(P('**Recurso / destino:** ' + [p.recurso, p.pagina].filter(Boolean).join(' · '), { antes: 80, size: 18, color: C.gris }));
    });
    return empacar(doc(out, 'GPA · Semana del ' + d.fechaTxt));
  }

  async function informe(d) {
    await cargar();
    const out = [portada(d.logo),
      new D.Paragraph({ children: emo(d.titulo, { bold: true, size: 38, color: C.navy }), spacing: { after: 60 } }), P(d.periodo, { color: C.gris })];
    if (d.kpis && d.kpis.length) {
      out.push(new D.Table({ width: { size: 100, type: D.WidthType.PERCENTAGE }, rows: d.kpis.map((k) => new D.TableRow({ children: [
        new D.TableCell({ borders: borde(C.linea), shading: { fill: C.claro, type: D.ShadingType.CLEAR, color: 'auto' }, children: [P(k[0], { bold: true, despues: 0 })] }),
        new D.TableCell({ borders: borde(C.linea), children: [P(String(k[1]), { despues: 0 })] })] })) }));
    }
    String(d.texto || '').split(/\n/).forEach((l) => {
      const t = l.trim(); if (!t) return;
      if (/^###\s/.test(t)) out.push(H(3, t.replace(/^###\s*/, '')));
      else if (/^##\s/.test(t)) out.push(H(2, t.replace(/^##\s*/, '')));
      else if (/^#\s/.test(t)) out.push(H(1, t.replace(/^#\s*/, '')));
      else if (/^[-*•]\s/.test(t)) out.push(P('• ' + t.replace(/^[-*•]\s*/, ''), { sangria: 240, despues: 40 }));
      else out.push(P(t));
    });
    return empacar(doc(out, d.titulo));
  }
  return { semana, informe };
})();
