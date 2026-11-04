/* =====================================================================
   APP-108 · Desarrollo de Talento — dibujo del post (1080 × 1350)
   Misma plantilla para todas las piezas: bloque azul con huella, etiqueta
   del programa, cápsula dorada, titular, idea clave (o lista del resumen)
   y pie con el logo. El PNG se genera en el navegador, sin guardar imágenes.
   ===================================================================== */
window.Post = (function () {
  const W = 1080, H = 1350, M = 84;
  const C = { azul: '#0E76BC', azulOsc: '#0A5A90', azulMas: '#08476F', teal: '#159090', dorado: '#C9A227', tinta: '#1D2B36', gris: '#5B6770', linea: '#E6ECF1' };
  let logo = null, listo = null;

  function preparar() {
    if (listo) return listo;
    listo = Promise.all([
      ...['400', '600', '700', '800'].map((w) => document.fonts.load(w + ' 40px Montserrat')),
      new Promise((ok) => { logo = new Image(); logo.onload = ok; logo.onerror = ok; logo.src = '/ideascontrol/assets/ideascontrol.webp'; })
    ]);
    return listo;
  }
  const fuente = (ctx, peso, tam) => { ctx.font = peso + ' ' + tam + 'px Montserrat, Arial, sans-serif'; };
  function espaciado(ctx, em, tam) { if ('letterSpacing' in ctx) ctx.letterSpacing = (em * tam) + 'px'; }
  function lineas(ctx, texto, ancho, primeraSangria) {
    const palabras = String(texto || '').split(/\s+/).filter(Boolean), out = [];
    let actual = '', sangria = primeraSangria || 0;
    palabras.forEach((p) => {
      const prueba = actual ? actual + ' ' + p : p;
      if (ctx.measureText(prueba).width + sangria > ancho && actual) { out.push(actual); actual = p; sangria = 0; }
      else actual = prueba;
    });
    if (actual) out.push(actual);
    return out;
  }
  function redondeado(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function huella(ctx, cx, cy) {
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.13)'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    const cortes = [[0.62, 0.70], [0.18, 0.24], [0.40, 0.46], [0.80, 0.86]];
    for (let i = 0; i < 15; i++) {
      const rx = 26 + i * 24, ry = 34 + i * 30, g = cortes[i % 4];
      const segs = i > 1 ? [[0.03, g[0]], [g[1], 0.97]] : [[0, 0.9]];
      segs.forEach(([a, b]) => {
        ctx.beginPath();
        for (let k = 0; k <= 40; k++) {
          const t = (a + (b - a) * k / 40) * 2 * Math.PI - Math.PI / 2;
          const x = cx + rx * Math.cos(t), y = cy + ry * Math.sin(t) * (Math.sin(t) > 0 ? 0.92 : 1);
          k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      });
    }
    ctx.restore();
  }

  /**
   * p = { tipo: 'TIP'|'RESUMEN', programa, etiqueta, titular, mensaje, items:[…], tam_titular }
   * Devuelve un <canvas> de 1080 × 1350.
   */
  async function dibujar(p, canvas) {
    await preparar();
    const cv = canvas || document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d'), resumen = p.tipo === 'RESUMEN', alto = resumen ? 800 : 820;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    // Bloque azul
    const g = ctx.createLinearGradient(0, 0, W * 0.75, alto * 1.25);
    g.addColorStop(0, C.azul); g.addColorStop(0.7, C.azulOsc); g.addColorStop(1, C.azulMas);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, alto);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, alto); ctx.clip(); huella(ctx, 870, 570); ctx.restore();
    // Etiqueta + cápsula
    ctx.textBaseline = 'middle';
    fuente(ctx, 700, 26); espaciado(ctx, 0.14, 26); ctx.fillStyle = '#fff';
    const prog = String(p.programa || 'Comunicaciones de servicio').toUpperCase();
    ctx.fillText(prog, M, 110);
    const xCap = M + ctx.measureText(prog).width + 22;
    fuente(ctx, 800, 26); espaciado(ctx, 0.08, 26);
    const et = String(p.etiqueta || '').toUpperCase(), wCap = ctx.measureText(et).width + 40;
    if (et) { ctx.fillStyle = C.dorado; redondeado(ctx, xCap, 85, wCap, 50, 25); ctx.fill(); ctx.fillStyle = C.tinta; ctx.fillText(et, xCap + 20, 111); }
    espaciado(ctx, 0, 10);
    // Titular (se reduce solo si no cabe en 4 líneas)
    let tam = Number(p.tam_titular) || (resumen ? 92 : 104), ls;
    do { fuente(ctx, 800, tam); ls = lineas(ctx, p.titular, W - M - 150); if (ls.length > 4) tam -= 6; } while (ls.length > 4 && tam > 50);
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'alphabetic';
    const yTit = resumen ? 230 : 250;
    ls.forEach((l, i) => ctx.fillText(l, M, yTit + tam * 0.86 + i * tam * 1.04));
    ctx.fillStyle = C.dorado; redondeado(ctx, M, resumen ? 720 : 730, 150, 12, 6); ctx.fill();
    // Cuerpo
    if (resumen) {
      const items = (p.items || []).filter(Boolean).slice(0, 5);
      items.forEach((t, i) => {
        const y = 870 + i * 80 + 29;
        ctx.fillStyle = C.teal; ctx.beginPath(); ctx.arc(M + 29 + 40, y, 29, 0, Math.PI * 2); ctx.fill();
        fuente(ctx, 700, 28); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String((Number(p.desde) || 0) + i + 1), M + 69, y + 1);
        ctx.textAlign = 'left'; let tt = 34; fuente(ctx, 700, tt);
        while (ctx.measureText(t).width > W - M - 150 - 60 && tt > 22) { tt -= 2; fuente(ctx, 700, tt); }
        ctx.fillStyle = C.tinta; ctx.fillText(t, M + 120, y + 1);
      });
    } else {
      ctx.textBaseline = 'alphabetic';
      fuente(ctx, 800, 24); espaciado(ctx, 0.16, 24); ctx.fillStyle = C.teal; ctx.fillText('IDEA CLAVE', M, 912); espaciado(ctx, 0, 10);
      fuente(ctx, 800, 80); const wq = ctx.measureText('“').width + 8;
      let tq = 50; fuente(ctx, 600, tq); let lq = lineas(ctx, p.mensaje, W - 2 * M, wq);
      while (lq.length > 4 && tq > 34) { tq -= 4; fuente(ctx, 600, tq); lq = lineas(ctx, p.mensaje, W - 2 * M, wq); }
      const lh = tq * 1.28, y0 = 935 + tq * 0.9;
      lq.forEach((l, i) => {
        let x = M;
        if (i === 0) { fuente(ctx, 800, 80); ctx.fillStyle = C.teal; ctx.fillText('“', M, y0 + 22); x += wq; }
        fuente(ctx, 600, tq); ctx.fillStyle = C.tinta; ctx.fillText(l, x, y0 + i * lh);
        if (i === lq.length - 1) { const w = ctx.measureText(l).width; fuente(ctx, 800, 80); ctx.fillStyle = C.teal; ctx.fillText('”', x + w + 6, y0 + i * lh + 22); }
      });
    }
    // Pie
    ctx.fillStyle = C.linea; ctx.fillRect(0, 1200, W, 2);
    if (logo && logo.naturalWidth) { const h = 86, w = logo.naturalWidth * h / logo.naturalHeight; ctx.drawImage(logo, M, 1232, w, h); }
    ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = C.gris;
    fuente(ctx, 600, 22); espaciado(ctx, 0.06, 22);
    ctx.fillText('DESARROLLO DE TALENTO', W - M, 1270); ctx.fillText('Cada contacto deja una huella', W - M, 1298);
    espaciado(ctx, 0, 10); ctx.textAlign = 'left';
    return cv;
  }

  async function descargar(p, nombre) {
    const cv = await dibujar(p);
    const blob = await new Promise((ok) => cv.toBlob(ok, 'image/png'));
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (nombre || 'pieza') + '.png';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  return { dibujar, descargar, preparar };
})();
