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
    const ctx = cv.getContext('2d'), resumen = p.tipo === 'RESUMEN';
    const PIE = 1200;                                   // línea del pie
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);

    // 1. Medir el titular: ocupa todo el ancho, máximo 3 líneas (se reduce solo)
    let tam = Number(p.tam_titular) || (resumen ? 88 : 100), ls;
    do { fuente(ctx, 800, tam); ls = lineas(ctx, p.titular, W - 2 * M); if (ls.length > 3) tam -= 6; } while (ls.length > 3 && tam > 52);
    const yTit = 196, lhT = tam * 1.08;
    const yLinea = yTit + ls.length * lhT + 34;
    const alto = Math.max(500, Math.min(720, yLinea + 12 + 76));   // el bloque azul se ajusta al titular

    // 2. Bloque azul con la huella como detalle en la esquina
    const g = ctx.createLinearGradient(0, 0, W * 0.8, alto * 1.3);
    g.addColorStop(0, C.azul); g.addColorStop(0.7, C.azulOsc); g.addColorStop(1, C.azulMas);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, alto);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, alto); ctx.clip(); ctx.globalAlpha = 0.85; huella(ctx, W - 70, alto + 40); ctx.restore();

    // 3. Etiqueta del programa + cápsula dorada
    ctx.textBaseline = 'middle';
    fuente(ctx, 700, 26); espaciado(ctx, 0.14, 26); ctx.fillStyle = 'rgba(255,255,255,.92)';
    const prog = String(p.programa || 'Comunicaciones de servicio').toUpperCase();
    ctx.fillText(prog, M, 104);
    const xCap = M + ctx.measureText(prog).width + 22;
    fuente(ctx, 800, 26); espaciado(ctx, 0.08, 26);
    const et = String(p.etiqueta || '').toUpperCase(), wCap = ctx.measureText(et).width + 40;
    if (et) { ctx.fillStyle = C.dorado; redondeado(ctx, xCap, 79, wCap, 50, 25); ctx.fill(); ctx.fillStyle = C.tinta; ctx.fillText(et, xCap + 20, 105); }
    espaciado(ctx, 0, 10);

    // 4. Titular y línea dorada debajo
    fuente(ctx, 800, tam); ctx.fillStyle = '#fff'; ctx.textBaseline = 'alphabetic';
    ls.forEach((l, i) => ctx.fillText(l, M, yTit + tam * 0.86 + i * lhT));
    ctx.fillStyle = C.dorado; redondeado(ctx, M, yLinea, 150, 12, 6); ctx.fill();

    // 5. Cuerpo: una tarjeta centrada en el espacio blanco
    const zonaIni = alto, zonaFin = PIE, ancho = W - 2 * M, pad = 56;
    if (resumen) {
      const items = (p.items || []).filter(Boolean).slice(0, 5);
      let tt = 40, filas;
      const medir = () => { fuente(ctx, 700, tt); filas = items.map((t) => lineas(ctx, t, ancho - pad * 2 - 96)); };
      medir();
      const altoItems = () => filas.reduce((s, f) => s + Math.max(64, f.length * tt * 1.22), 0) + (items.length - 1) * 26;
      while (altoItems() + pad * 2 + 52 > zonaFin - zonaIni - 70 && tt > 26) { tt -= 2; medir(); }
      const hCard = altoItems() + pad * 2 + 52, yCard = zonaIni + (zonaFin - zonaIni - hCard) / 2;
      ctx.fillStyle = '#F1F7F7'; redondeado(ctx, M, yCard, ancho, hCard, 26); ctx.fill();
      ctx.fillStyle = C.teal; redondeado(ctx, M, yCard, 12, hCard, 6); ctx.fill();
      fuente(ctx, 800, 24); espaciado(ctx, 0.16, 24); ctx.fillStyle = C.teal; ctx.textBaseline = 'alphabetic';
      ctx.fillText('LAS IDEAS DE LA SEMANA', M + pad, yCard + pad + 18); espaciado(ctx, 0, 10);
      let y = yCard + pad + 52;
      items.forEach((t, i) => {
        const h = Math.max(64, filas[i].length * tt * 1.22);
        ctx.fillStyle = C.teal; ctx.beginPath(); ctx.arc(M + pad + 32, y + h / 2, 32, 0, Math.PI * 2); ctx.fill();
        fuente(ctx, 800, 30); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String((Number(p.desde) || 0) + i + 1), M + pad + 32, y + h / 2 + 1);
        ctx.textAlign = 'left'; fuente(ctx, 700, tt); ctx.fillStyle = C.tinta;
        const y0 = y + h / 2 - (filas[i].length - 1) * tt * 1.22 / 2;
        filas[i].forEach((l, k) => ctx.fillText(l, M + pad + 96, y0 + k * tt * 1.22 + 1));
        y += h + 26;
      });
    } else {
      fuente(ctx, 800, 90); const wq = ctx.measureText('“').width + 10;
      let tq = 58, lq;
      const medir = () => { fuente(ctx, 600, tq); lq = lineas(ctx, p.mensaje, ancho - pad * 2, wq); };
      medir();
      while ((lq.length > 5 || lq.length * tq * 1.3 + pad * 2 + 56 > zonaFin - zonaIni - 70) && tq > 34) { tq -= 3; medir(); }
      const lh = tq * 1.3, hCard = 56 + lq.length * lh + pad * 2 - 10, yCard = zonaIni + (zonaFin - zonaIni - hCard) / 2;
      ctx.fillStyle = '#F1F7F7'; redondeado(ctx, M, yCard, ancho, hCard, 26); ctx.fill();
      ctx.fillStyle = C.teal; redondeado(ctx, M, yCard, 12, hCard, 6); ctx.fill();
      ctx.textBaseline = 'alphabetic';
      fuente(ctx, 800, 24); espaciado(ctx, 0.16, 24); ctx.fillStyle = C.teal; ctx.fillText('IDEA CLAVE', M + pad, yCard + pad + 18); espaciado(ctx, 0, 10);
      const y0 = yCard + pad + 56 + tq * 0.82;
      lq.forEach((l, i) => {
        let x = M + pad;
        if (i === 0) { fuente(ctx, 800, 90); ctx.fillStyle = C.teal; ctx.fillText('“', x, y0 + 26); x += wq; }
        fuente(ctx, 600, tq); ctx.fillStyle = C.tinta; ctx.fillText(l, x, y0 + i * lh);
        if (i === lq.length - 1) { const w = ctx.measureText(l).width; fuente(ctx, 800, 90); ctx.fillStyle = C.teal; ctx.fillText('”', x + w + 8, y0 + i * lh + 26); }
      });
    }

    // 6. Pie
    ctx.fillStyle = C.linea; ctx.fillRect(0, PIE, W, 2);
    if (logo && logo.naturalWidth) { const h = 90, w = logo.naturalWidth * h / logo.naturalHeight; ctx.drawImage(logo, M, PIE + 30, w, h); }
    ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = C.gris;
    fuente(ctx, 700, 22); espaciado(ctx, 0.08, 22); ctx.fillText('DESARROLLO DE TALENTO', W - M, PIE + 68);
    fuente(ctx, 600, 22); espaciado(ctx, 0.02, 22); ctx.fillText('Cada contacto deja una huella', W - M, PIE + 98);
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
