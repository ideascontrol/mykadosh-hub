/* =====================================================================
   APP-101 · Comercial — PDF de la cotización y guardado en el sitio documental
   - Se arma SOLO con los datos congelados de la cotización (COT_Cotizaciones,
     COT_Detalle, COT_CotizacionCondiciones), nunca con las tablas maestras.
   - Librerías: jsPDF 2.5.1 + jsPDF-AutoTable 3.8.2 (se cargan al generar el primer PDF).
   - Se guarda en el sitio Ideas Control (Parámetros › Ubicación de los documentos):
       Clientes:   [BIBLIOTECA_CLIENTES]/[código cliente] [razón social]/Cotizaciones/[número].pdf
       Prospectos: [BIBLIOTECA_COMERCIAL]/[CARPETA_PROSPECTOS]/[NIT] [razón social]/[número].pdf
   ===================================================================== */
(function () {
  const U = IC.ui;
  const LIBS = ['https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
    'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js'];
  const AZUL = [14, 118, 188], TEAL = [21, 144, 144], DORADO = [201, 162, 39], TINTA = [29, 43, 54], GRIS = [91, 103, 112], BORDE = [220, 228, 234];
  const GRAPH = 'https://graph.microsoft.com/v1.0';

  function cargarScript(src) {
    return new Promise((ok, mal) => {
      if (document.querySelector('script[src="' + src + '"]')) return ok();
      const s = document.createElement('script'); s.src = src; s.onload = ok;
      s.onerror = () => mal(new Error('No se pudo cargar el generador de PDF. Revise su conexión.'));
      document.head.appendChild(s);
    });
  }
  async function cargarLibs() {
    if (!(window.jspdf && window.jspdf.jsPDF)) await cargarScript(LIBS[0]);
    if (!(window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API.autoTable)) await cargarScript(LIBS[1]);
  }

  // ---------- Imágenes: cualquier formato → JPEG/PNG en base64 (jsPDF no lee WebP) ----------
  async function aImagen(blob, maxLado, formato) {
    const bmp = await createImageBitmap(blob);
    const k = Math.min(1, maxLado / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    if (formato !== 'PNG') { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, w, h); }
    ctx.drawImage(bmp, 0, 0, w, h);
    return { data: cv.toDataURL(formato === 'PNG' ? 'image/png' : 'image/jpeg', 0.85), w, h, formato: formato === 'PNG' ? 'PNG' : 'JPEG' };
  }
  async function imagenDeUrl(url, maxLado, formato) {
    try { const r = await fetch(url); if (!r.ok) return null; return await aImagen(await r.blob(), maxLado, formato); }
    catch (e) { console.warn('Imagen no disponible', url, e); return null; }
  }

  // ---------- Formatos ----------
  const dinero = (v, m) => m === 'USD'
    ? 'US$ ' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '$ ' + Math.round(Number(v || 0)).toLocaleString('es-CO');
  const fechaLarga = (iso) => { if (!iso) return ''; const d = new Date(String(iso).slice(0, 10) + 'T12:00:00'); return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }); };
  // Las fuentes estándar del PDF solo traen caracteres latinos: se cambian los demás
  const limpio = (s) => String(s || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')
    .replace(/…/g, '...').replace(/[•●]/g, '-').replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');

  // =====================================================================
  // GENERAR
  // c = encabezado, det = líneas, conds = condiciones resueltas, extra = { comercial, params, productos }
  // =====================================================================
  async function generar(c, det, conds, extra) {
    await cargarLibs();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'letter' });
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 15;
    const P = extra.params || {}, mon = c.moneda || 'COP';
    doc.setProperties({ title: 'Cotización ' + c.numero_visible, author: 'Ideas Control Equipos y Soluciones S.A.S.', subject: limpio(c.cliente_razon_social) });

    // Imágenes: logo + fotos de los productos (si las hay)
    const logo = await imagenDeUrl(CFG.logo, 600, 'PNG');
    const fotos = {};
    if (extra.conFotos !== false) {
      await Promise.all(det.map(async (l) => {
        const p = (extra.productos || []).find((x) => x.Title === l.producto_id);
        if (!p || !p.imagen_webp_url || fotos[l.producto_id] !== undefined) return;
        fotos[l.producto_id] = null;
        const url = await App.productos.urlFoto(p.imagen_webp_url);
        if (url) fotos[l.producto_id] = await imagenDeUrl(url, 240, 'JPEG');
      }));
    }
    const hayFotos = Object.values(fotos).some(Boolean);

    // ---------- Encabezado ----------
    let y = M;
    if (logo) { const h = 16, w = Math.min(70, h * logo.w / logo.h); doc.addImage(logo.data, 'PNG', M, y, w, h); }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...AZUL);
    doc.text('COTIZACIÓN', W - M, y + 5, { align: 'right' });
    doc.setFontSize(11); doc.setTextColor(...TINTA);
    doc.text('N.º ' + c.numero_visible, W - M, y + 11, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GRIS);
    doc.text('Fecha: ' + fechaLarga(c.fecha), W - M, y + 16, { align: 'right' });
    doc.text('Válida hasta: ' + fechaLarga(c.fecha_vencimiento), W - M, y + 20.5, { align: 'right' });
    y += 25;
    doc.setDrawColor(...DORADO); doc.setLineWidth(0.8); doc.line(M, y, W - M, y); y += 6;

    // ---------- Cliente ----------
    const filasCli = [
      ['Señores:', c.cliente_razon_social, 'NIT / ID:', c.cliente_nit],
      ['Att.:', c.contacto_nombre, 'Cód. cliente:', extra.codigoCliente || ''],
      ['Tel. / Cel.:', c.contacto_telefono, 'Comercial:', extra.comercial ? extra.comercial.nombre : ''],
      ['E-mail:', c.contacto_email, 'Moneda:', mon === 'USD' ? 'Dólares (USD)' + (c.trm_referencia ? ' · TRM ref. ' + dinero(c.trm_referencia, 'COP') : '') : 'Pesos colombianos (COP)'],
      ['Dirección:', [c.cliente_direccion, c.cliente_ciudad].filter(Boolean).join(' · '), '', '']
    ];
    doc.autoTable({
      startY: y, margin: { left: M, right: M }, theme: 'plain', body: filasCli.map((f) => f.map(limpio)),
      styles: { fontSize: 9, cellPadding: { top: 0.8, bottom: 0.8, left: 0, right: 2 }, textColor: TINTA },
      columnStyles: { 0: { cellWidth: 22, fontStyle: 'bold', textColor: GRIS }, 1: { cellWidth: 82 }, 2: { cellWidth: 24, fontStyle: 'bold', textColor: GRIS }, 3: { cellWidth: 'auto' } },
      didParseCell: (d) => { if (d.row.index === 0 && d.column.index === 1) d.cell.styles.fontStyle = 'bold'; }
    });
    y = doc.lastAutoTable.finalY + 6;

    // ---------- Introducción ----------
    doc.setFontSize(10); doc.setTextColor(...TINTA); doc.setFont('helvetica', 'bold');
    doc.text('Estimados señores:', M, y); y += 5;
    doc.setFont('helvetica', 'normal');
    String(c.texto_introduccion || '').split(/\n+/).filter(Boolean).forEach((p) => {
      const lineas = doc.splitTextToSize(limpio(p), W - 2 * M);
      doc.text(lineas, M, y); y += lineas.length * 4.6 + 2;
    });
    y += 1;

    // ---------- Título de la sección ----------
    if (c.titulo_seccion) {
      doc.setFillColor(...TEAL); doc.rect(M, y, W - 2 * M, 7, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
      doc.text(limpio(c.titulo_seccion).toUpperCase(), M + 2.5, y + 4.8); y += 9;
    }

    // ---------- Líneas ----------
    const cuerpo = [];
    det.slice().sort((a, b) => Number(a.linea) - Number(b.linea)).forEach((l) => {
      const ficha = String(l.ficha_tecnica || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean).map((s) => '- ' + s).join('\n');
      const desc = limpio(l.descripcion || '') + (ficha ? '\n' + limpio(ficha) : '');
      const cod = limpio(l.codigo || '') + (l.ciudad_sede ? '\n' + limpio(l.ciudad_sede) : '');
      const fila = [cod, desc, Number(l.cantidad).toLocaleString('es-CO'), dinero(l.precio_unitario, mon), dinero(l.subtotal_linea, mon)];
      if (hayFotos) fila.unshift('');
      cuerpo.push({ fila, tipo: 'linea', foto: fotos[l.producto_id] || null });
      if (Number(l.descuento_valor) > 0) {
        const fd = ['', 'Descuento por volumen (' + Number(l.descuento_porcentaje).toLocaleString('es-CO') + ' %)', '', '', '- ' + dinero(l.descuento_valor, mon)];
        if (hayFotos) fd.unshift('');
        cuerpo.push({ fila: fd, tipo: 'desc' });
      }
    });
    const cab = ['Código', 'Descripción', 'Cant.', 'Unitario', 'Total'];
    if (hayFotos) cab.unshift('');
    const off = hayFotos ? 1 : 0;
    const colStyles = {};
    if (hayFotos) colStyles[0] = { cellWidth: 18 };
    colStyles[off] = { cellWidth: 28, fontStyle: 'bold' };
    colStyles[off + 1] = { cellWidth: 'auto' };
    colStyles[off + 2] = { cellWidth: 13, halign: 'center' };
    colStyles[off + 3] = { cellWidth: 27, halign: 'right' };
    colStyles[off + 4] = { cellWidth: 29, halign: 'right' };
    doc.autoTable({
      startY: y, margin: { left: M, right: M, bottom: 18 }, head: [cab], body: cuerpo.map((r) => r.fila), theme: 'grid',
      headStyles: { fillColor: AZUL, textColor: 255, fontSize: 9, fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 1.8, lineColor: BORDE, lineWidth: 0.2, textColor: TINTA, valign: 'top' },
      columnStyles: colStyles,
      didParseCell: (d) => {
        if (d.section !== 'body') return;
        const r = cuerpo[d.row.index];
        if (r.tipo === 'desc') { d.cell.styles.fontStyle = 'italic'; d.cell.styles.textColor = GRIS; d.cell.styles.fillColor = [248, 250, 252]; }
        if (hayFotos && d.column.index === 0 && r.foto) d.cell.styles.minCellHeight = 17;
      },
      didDrawCell: (d) => {
        if (d.section !== 'body' || !hayFotos || d.column.index !== 0) return;
        const f = cuerpo[d.row.index].foto; if (!f) return;
        const lado = 15, k = Math.min(lado / f.w, lado / f.h), w = f.w * k, h = f.h * k;
        doc.addImage(f.data, f.formato, d.cell.x + (d.cell.width - w) / 2, d.cell.y + 1.2, w, h);
      }
    });
    y = doc.lastAutoTable.finalY + 2;

    // ---------- Totales ----------
    const desc = Number(c.descuento_total || 0);
    const ivaPct = det.find((l) => Number(l.iva_porcentaje) > 0);
    const tot = [['Subtotal', dinero(c.subtotal_bruto, mon)]];
    if (desc > 0) { tot.push(['Descuentos', '- ' + dinero(desc, mon)]); tot.push(['Subtotal neto', dinero(c.subtotal_neto, mon)]); }
    tot.push(['IVA' + (ivaPct ? ' ' + Number(ivaPct.iva_porcentaje).toLocaleString('es-CO') + ' %' : ''), dinero(c.iva_total, mon)]);
    tot.push(['TOTAL', dinero(c.total, mon)]);
    doc.autoTable({
      startY: y, margin: { left: W - M - 80, right: M, bottom: 18 }, body: tot, theme: 'plain', tableWidth: 80, pageBreak: 'avoid',
      styles: { fontSize: 9.5, cellPadding: 1.4, textColor: TINTA },
      columnStyles: { 0: { fontStyle: 'bold', textColor: GRIS }, 1: { halign: 'right' } },
      didParseCell: (d) => { if (d.row.index === tot.length - 1) { d.cell.styles.fillColor = TEAL; d.cell.styles.textColor = 255; d.cell.styles.fontStyle = 'bold'; d.cell.styles.fontSize = 11; } }
    });
    y = doc.lastAutoTable.finalY + 3;
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(...GRIS);
    doc.text(mon === 'USD' ? 'Valores en dólares de los Estados Unidos.' : 'Valores en pesos colombianos.', W - M, y, { align: 'right' }); y += 7;

    // ---------- Condiciones comerciales ----------
    const espacio = (alto) => { if (y + alto > H - 20) { doc.addPage(); y = M + 4; } };
    if (conds.length) {
      espacio(14);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...AZUL);
      doc.text('Condiciones comerciales', M, y); y += 2;
      doc.setDrawColor(...BORDE); doc.setLineWidth(0.3); doc.line(M, y, W - M, y); y += 5;
      conds.slice().sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99)).forEach((x) => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        const lineas = doc.splitTextToSize(limpio(x.texto), W - 2 * M);
        espacio(6 + lineas.length * 4.2);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...TINTA);
        doc.text(limpio(x.titulo) + ':', M, y); y += 4.4;
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRIS);
        doc.text(lineas, M, y); y += lineas.length * 4.2 + 3;
      });
    }

    // ---------- Cierre y firma ----------
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    const cierre = doc.splitTextToSize(limpio(P.TEXTO_CIERRE || ''), W - 2 * M);
    const com = extra.comercial || {};
    espacio(14 + cierre.length * 4.6 + 22);
    y += 2; doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...TINTA);
    if (cierre.length) { doc.text(cierre, M, y); y += cierre.length * 4.6 + 6; }
    doc.text('Cordialmente,', M, y); y += 10;
    doc.setFont('helvetica', 'bold'); doc.text(limpio(com.nombre || ''), M, y); y += 4.6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GRIS);
    [com.cargo, com.celular ? 'Celular: ' + com.celular : '', com.email ? 'E-mail: ' + com.email : ''].filter(Boolean).forEach((t) => { doc.text(limpio(t), M, y); y += 4.3; });
    doc.text('Ideas Control Equipos y Soluciones S.A.S.', M, y);

    // ---------- Pie de página ----------
    const n = doc.internal.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setDrawColor(...BORDE); doc.setLineWidth(0.3); doc.line(M, H - 12, W - M, H - 12);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRIS);
      doc.text('Ideas Control Equipos y Soluciones S.A.S.' + (P.SITIO_WEB ? '  ·  ' + limpio(P.SITIO_WEB) : ''), M, H - 8);
      doc.text(c.numero_visible, W / 2, H - 8, { align: 'center' });
      doc.text('Página ' + i + ' de ' + n, W - M, H - 8, { align: 'right' });
    }
    return doc;
  }

  // =====================================================================
  // GUARDAR EN EL SITIO DOCUMENTAL
  // =====================================================================
  const claveLib = (s) => U.norm(s).replace(/[^a-z0-9]/g, '');
  const nombreCarpeta = (s) => String(s || '').replace(/["*:<>?\/\\|#%&{}~]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\.+$/, '').slice(0, 80);
  let cacheSitio = null;
  async function bibliotecas(P) {
    const url = String(P.SITIO_DOCUMENTAL_URL || '').trim();
    if (!url) throw new Error('Falta configurar el sitio documental: Administración › Parámetros › Ubicación de los documentos.');
    if (cacheSitio && cacheSitio.url === url) return cacheSitio;
    const u = new URL(url);
    const ruta = u.pathname.replace(/\/(SitePages|Shared Documents|Forms)\/.*$/i, '').replace(/\/$/, '');
    const sitio = await IC.graph.llamar('GET', '/sites/' + u.host + ':' + ruta + '?$select=id,webUrl');
    const drives = (await IC.graph.llamar('GET', '/sites/' + sitio.id + '/drives?$select=id,name,webUrl')).value || [];
    cacheSitio = { url, drives };
    return cacheSitio;
  }
  function buscarDrive(drives, nombre) {
    const k = claveLib(nombre);
    return drives.find((d) => claveLib(d.name) === k || claveLib(decodeURIComponent(String(d.webUrl || '').split('/').pop())) === k);
  }
  // empresa = registro de MAE_Empresas (para saber si es cliente y su código)
  function rutaPdf(c, empresa, P) {
    const archivo = nombreCarpeta(c.numero_visible) + '.pdf';
    const razon = nombreCarpeta(c.cliente_razon_social);
    if (empresa && empresa.estado_comercial === 'CLIENTE')
      return { biblioteca: P.BIBLIOTECA_CLIENTES || '01_CLIENTES', ruta: nombreCarpeta((empresa.codigo_cliente || empresa.nit) + ' ' + razon) + '/Cotizaciones/' + archivo };
    return { biblioteca: P.BIBLIOTECA_COMERCIAL || '02_COMERCIAL', ruta: (P.CARPETA_PROSPECTOS || '01_PROSPECTOS') + '/' + nombreCarpeta((empresa ? empresa.nit : '') + ' ' + razon) + '/' + archivo };
  }
  async function subir(doc, c, empresa, P) {
    const destino = rutaPdf(c, empresa, P);
    const { drives } = await bibliotecas(P);
    const drive = buscarDrive(drives, destino.biblioteca);
    if (!drive) throw new Error('No se encontró la biblioteca "' + destino.biblioteca + '" en el sitio documental. Revise Administración › Parámetros.');
    const url = GRAPH + '/drives/' + drive.id + '/root:/' + destino.ruta.split('/').map(encodeURIComponent).join('/') + ':/content';
    const res = await fetch(url, { method: 'PUT', headers: { Authorization: 'Bearer ' + await IC.auth.token(), 'Content-Type': 'application/pdf' }, body: doc.output('blob') });
    if (!res.ok) {
      const t = await res.text(); const e = new Error(res.status === 403 || res.status === 401
        ? 'No tiene permiso para guardar en el sitio documental. Pida que lo agreguen como Integrante del sitio Ideas Control.'
        : 'No se pudo guardar el PDF en SharePoint: ' + t.slice(0, 160));
      e.status = res.status; throw e;
    }
    const it = await res.json();
    return { webUrl: it.webUrl, ruta: destino.biblioteca + '/' + destino.ruta };
  }

  App.cotPdf = { generar, subir, rutaPdf, cargarLibs, _limpio: limpio };
})();
