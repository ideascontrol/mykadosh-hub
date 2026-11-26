/* =====================================================================
   APP-114 · Proyectos — PDF de las actas (formatos controlados de 2600-MAN-OPE)
   - 2610-FOR-OPE Acta de comité e informe de estado semanal (desde una reunión)
   - 2609-FOR-OPE Acta de cierre y entrega (y su variante de terminación de contrato T&A)
   Mismas secciones y colores de los Word v1.0. No incluye las instrucciones internas del formato
   (texto en cursiva y la nota de archivo): el PDF es lo que se envía al cliente.
   Nombre del archivo: <código>_<Cliente>_<AAAA-MM-DD>.pdf
   ===================================================================== */
(function () {
  const LIBS = ['https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
    'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js'];
  const AZUL = [14, 118, 188], TEAL = [21, 144, 144], CLARO = [227, 239, 249], NOTA = [251, 245, 227], NOTAT = [90, 74, 18], TINTA = [34, 34, 34], GRIS = [127, 127, 127];
  const SEM = { Verde: [31, 138, 76], Amarillo: [201, 162, 39], Rojo: [192, 57, 43] };
  const PIE = 'Ideas Control Equipos y Soluciones S.A.S.';
  const SUB = 'Ideas Control Equipos y Soluciones S.A.S. · Proyectos de implementación de tiempos y asistencia (2600-MAN-OPE)';

  const cargarScript = (src) => new Promise((ok, mal) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar la librería de PDF. Revise la conexión.')); document.head.appendChild(s); });
  async function cargarLibs() {
    if (!(window.jspdf && window.jspdf.jsPDF)) await cargarScript(LIBS[0]);
    if (!window.jspdf.jsPDF.API.autoTable) await cargarScript(LIBS[1]);
  }
  let logoPng = null;
  async function logo() {
    if (logoPng) return logoPng;
    const img = new Image(); img.crossOrigin = 'anonymous'; img.src = CFG.logo;
    await new Promise((ok) => { img.onload = ok; img.onerror = ok; });
    if (!img.naturalWidth) return null;
    const h = Math.min(160, img.naturalHeight), w = Math.round(img.naturalWidth * h / img.naturalHeight);   // liviano: el logo va a 13 mm de alto
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    cv.getContext('2d').drawImage(img, 0, 0, w, h);
    logoPng = { url: cv.toDataURL('image/png'), r: img.naturalWidth / img.naturalHeight };
    return logoPng;
  }
  // Solo caracteres que la fuente del PDF puede dibujar
  const limpio = (v) => String(v == null ? '' : v).replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/[☐☒✔✓]/g, '').replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    .replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—•…€›‹]/g, '');
  const fechaLarga = (d) => (d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  const nombreArchivo = (codigo, cliente, fecha) => PRY_CARPETA.nombreCarpeta(codigo + '_' + cliente + '_' + String(fecha || PRY.hoy()).slice(0, 10)) + '.pdf';

  // ---------- Armado común ----------
  async function documento(fmt) {
    await cargarLibs();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'letter', compress: true });
    const W = doc.internal.pageSize.getWidth(), M = 16;
    const lg = await logo();
    let y = 14;
    if (lg) { doc.addImage(lg.url, 'PNG', M, y, 13 * lg.r, 13); y += 18; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...AZUL);
    doc.text(limpio(fmt.titulo), W / 2, y, { align: 'center' }); y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GRIS);
    doc.text(doc.splitTextToSize(limpio(SUB), W - 2 * M), W / 2, y, { align: 'center' }); y += 6;
    const A = {
      doc, W, M, y,
      tabla(opc) {
        doc.autoTable(Object.assign({ startY: A.y, margin: { left: M, right: M, top: 20, bottom: 18 }, theme: 'grid',
          styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.8, textColor: TINTA, lineColor: [200, 210, 220], lineWidth: 0.2, valign: 'middle' },
          headStyles: { fillColor: AZUL, textColor: 255, fontStyle: 'bold' } }, opc));
        A.y = doc.lastAutoTable.finalY + 4;
      },
      seccion(t) {
        if (A.y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); A.y = 22; }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...TEAL); doc.text(limpio(t), M, A.y + 4); A.y += 7;
      },
      // Pares etiqueta / valor en 4 columnas (como las tablas de datos del formato)
      pares(lista) {
        const filas = [];
        for (let i = 0; i < lista.length; i += 2) {
          const a = lista[i], b = lista[i + 1] || ['', ''];
          filas.push([a[0], limpio(a[1]), b[0], limpio(b[1])]);
        }
        A.tabla({ body: filas, columnStyles: { 0: { fillColor: CLARO, fontStyle: 'bold', cellWidth: 38 }, 2: { fillColor: CLARO, fontStyle: 'bold', cellWidth: 38 } } });
      },
      lista(cab, filas, anchos) {
        A.tabla({ head: [cab.map(limpio)], body: (filas.length ? filas : [cab.map(() => '')]).map((f) => f.map(limpio)),
          columnStyles: (anchos || []).reduce((o, w, i) => { if (w) o[i] = { cellWidth: w }; return o; }, {}) });
      },
      texto(t) {
        const filas = String(t || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
        A.tabla({ body: (filas.length ? filas : ['—']).map((x) => [limpio(x)]), styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.8, textColor: TINTA, lineColor: [200, 210, 220], lineWidth: 0.2 } });
      },
      nota(t) {
        doc.setFontSize(8); const L = doc.splitTextToSize(limpio(t), W - 2 * M - 6), h = L.length * 3.6 + 4;
        if (A.y + h > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); A.y = 22; }
        doc.setFillColor(...NOTA); doc.rect(M, A.y, W - 2 * M, h, 'F');
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...NOTAT); doc.text(L, M + 3, A.y + 4.5); A.y += h + 4;
      }
    };
    A.tabla({ head: [['Código', 'Nombre del formato', 'Versión', 'Fecha']], body: [[fmt.codigo, limpio(fmt.nombre), fmt.version || '1.0', fmt.fecha || 'Noviembre de 2026']],
      bodyStyles: { fontStyle: 'bold' } });
    A.y += 2;
    A.cerrar = () => {
      const n = doc.getNumberOfPages(), H = doc.internal.pageSize.getHeight();
      for (let i = 1; i <= n; i++) {
        doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRIS);
        doc.text(limpio(fmt.codigo + ' · ' + fmt.nombre), W - M, 9, { align: 'right' });
        doc.text(limpio(PIE + '  |  Versión ' + (fmt.version || '1.0') + '  |  Página ' + i + ' de ' + n), W / 2, H - 9, { align: 'center' });
      }
      return doc;
    };
    return A;
  }
  const aceptacion = (A, ac) => {
    ac = ac || {};
    A.pares([['Enviada por (IC)', ac.enviada_por], ['Fecha de envío', fechaLarga(ac.fecha_envio)], ['Aceptada por (cliente)', ac.aceptada_por], ['Cargo', ac.cargo],
      ['Correo de aceptación', ac.correo], ['Fecha de aceptación', fechaLarga(ac.fecha_aceptacion)]]);
  };

  // =====================================================================
  // 2610-FOR-OPE · Acta de comité e informe de estado semanal
  // r: reunión · est: foto del estado (avances, hito, desviación, tareas del cliente, cambios) · pend: compromisos y riesgos
  // =====================================================================
  async function acta2610(p, r, est, pend) {
    const A = await documento({ codigo: '2610-FOR-OPE', nombre: 'Acta de comité e informe de estado semanal', titulo: 'ACTA DE COMITÉ E INFORME DE ESTADO SEMANAL' });
    est = est || {};
    A.seccion('1. Datos del comité');
    A.pares([['Cliente', p.cliente], ['Proyecto', p.nombre + ' (' + p.Title + ')'], ['Comité N°', r.numero], ['Fecha', fechaLarga(r.fecha)],
      ['Asistentes IC', r.asistentes_ic], ['Asistentes cliente', r.asistentes_cliente]]);
    A.seccion('2. Estado general');
    A.pares([['Avance real', (est.real == null ? '' : est.real) + ' %'], ['Avance planeado', (est.plan == null ? '' : est.plan) + ' %'],
      ['Próximo hito', est.hito || 'Sin hitos pendientes'], ['Fecha del próximo hito', fechaLarga(est.hito_fecha)],
      ['Desviación vs. línea base', (est.desviacion == null ? '' : est.desviacion) + ' días hábiles' + (est.sinBase ? ' (sin línea base aprobada)' : '')], ['Estado', r.semaforo || '']]);
    // Color del semáforo en la celda «Estado»
    const ult = A.doc.lastAutoTable; if (ult && SEM[r.semaforo]) { /* se pinta con un recuadro pequeño junto al texto */
      const cel = ult.body[ult.body.length - 1].cells[3];
      if (cel) { A.doc.setFillColor(...SEM[r.semaforo]); A.doc.circle(cel.x + cel.width - 5, cel.y + cel.height / 2, 1.8, 'F'); }
    }
    A.nota('Verde: sin desviación o recuperable sin afectar hitos. Amarillo: hay riesgo de mover un hito. Rojo: un hito ya se movió o se movería más de una semana; se escala al Director de Operaciones.');
    A.seccion('3. Avances desde el último comité'); A.texto(r.avances);
    A.seccion('4. Tareas del cliente pendientes');
    A.lista(['Tarea', 'Responsable', 'Fecha compromiso', 'Días de atraso'], (est.cliente || []).map((t) => [t.tarea, t.responsable, fechaLarga(t.fecha), String(t.atraso || 0)]), [null, 42, 32, 24]);
    A.seccion('5. Riesgos y problemas');
    A.lista(['Descripción', 'Impacto', 'Acción', 'Responsable', 'Fecha'], pend.filter((x) => x.tipo === 'Riesgo' || x.tipo === 'Problema')
      .map((x) => [x.tipo + ': ' + x.descripcion, x.impacto, x.accion, x.responsable, fechaLarga(x.fecha_objetivo)]), [null, 34, 40, 30, 24]);
    A.seccion('6. Decisiones y acuerdos');
    A.lista(['N°', 'Decisión o acuerdo', 'Responsable', 'Fecha'], pend.filter((x) => ['Compromiso', 'Decisión', 'Visita técnica'].indexOf(x.tipo) >= 0)
      .map((x, i) => [String(i + 1), (x.tipo === 'Compromiso' ? '' : x.tipo + ': ') + x.descripcion, x.responsable, fechaLarga(x.fecha_objetivo)]), [10, null, 40, 28]);
    A.seccion('7. Controles de cambio');
    A.lista(['N° de solicitud', 'Descripción', 'Estado'], (est.cambios || []).map((x) => [x.id, x.descripcion, x.estado]), [30, null, 32]);
    A.seccion('8. Próximos pasos hasta el siguiente comité'); A.texto(r.proximos_pasos);
    A.seccion('9. Aceptación del cliente');
    A.nota('El envío del acta deja constancia de lo tratado. Solicitar confirmación del cliente cuando existan decisiones, aprobaciones o compromisos que requieran aceptación; no exigir una firma semanal para un informe meramente informativo.');
    aceptacion(A, (r._datos || {}).aceptacion);
    return { doc: A.cerrar(), nombre: nombreArchivo('2610-FOR-OPE', p.cliente, r.fecha) };
  }

  // =====================================================================
  // 2609-FOR-OPE · Acta de cierre y entrega (proyecto de implementación)
  // =====================================================================
  async function acta2609(p, d) {
    if (d.variante === 'TERMINACION') return terminacion(p, d);
    const A = await documento({ codigo: '2609-FOR-OPE', nombre: 'Acta de cierre y entrega', titulo: 'ACTA DE CIERRE Y ENTREGA' });
    A.seccion('1. Datos del proyecto');
    A.pares([['Cliente', p.cliente], ['Proyecto', p.nombre + ' (' + p.Title + ')'], ['Orden de Servicio N°', p.os_numero || d.os || ''], ['Tipo de proyecto', d.tipo_proyecto ? 'Tipo ' + d.tipo_proyecto : ''],
      ['Fecha de inicio', fechaLarga(p.inicio)], ['Fecha de salida en vivo', fechaLarga(d.salida_vivo)], ['Fecha de cierre', fechaLarga(d.fecha_cierre)], ['Líder de Implementaciones', d.lider || p.lider]]);
    A.seccion('2. Cumplimiento del alcance');
    A.lista(['Concepto', 'Contratado', 'Entregado', 'Observación'], (d.alcance || []).map((x) => [x.concepto, x.contratado, x.entregado, x.obs]), [52, 36, 36, null]);
    A.seccion('3. Entregables del proyecto');
    A.lista(['Entregable', 'Fecha', 'Entregado'], (d.entregables || []).map((x) => [x.nombre, fechaLarga(x.fecha), x.entregado || '']), [null, 36, 26]);
    A.seccion('4. Indicadores del proyecto');
    A.lista(['Indicador', 'Resultado', 'Meta', 'Cumple'], (d.indicadores || []).map((x) => [x.nombre, x.resultado, x.meta, x.cumple]), [null, 34, 28, 22]);
    A.seccion('5. Pendientes trasladados a soporte');
    A.lista(['N°', 'Descripción', 'Responsable', 'Fecha compromiso'], (d.pendientes || []).map((x, i) => [String(i + 1), x.descripcion, x.responsable, fechaLarga(x.fecha)]), [10, null, 40, 30]);
    A.seccion('6. Traspaso a soporte');
    A.pares([['Fecha de traspaso', fechaLarga(d.fecha_traspaso)], ['Recibe (soporte IC)', d.recibe], ['Canal de soporte', 'info@ideascontrol.com · +57 322 8506363'], ['Ficha de traspaso', '2608-FOR-OPE']]);
    A.seccion('7. Aceptación del cliente');
    A.nota('Con la aceptación de esta acta el cliente declara recibidos a satisfacción el alcance y los entregables del proyecto, y acepta que los pendientes registrados se atienden por el canal de soporte. La aceptación por correo electrónico tiene el mismo valor que la firma.');
    aceptacion(A, d.aceptacion);
    if (d.timevision) {
      A.seccion('Anexo – Cierre TimeVision');
      A.lista(['Dato / control', 'Registro'], (d.timevision || []).map((x) => [x.control, x.registro || 'No aplica']), [80, null]);
    }
    return { doc: A.cerrar(), nombre: nombreArchivo('2609-FOR-OPE', p.cliente, d.fecha_cierre) };
  }

  // Variante de 2609 para la terminación de contrato T&A (offboarding): controles del checklist de cierre
  async function terminacion(p, d) {
    const A = await documento({ codigo: '2609-FOR-OPE', nombre: 'Acta de cierre y entrega', titulo: 'ACTA DE CIERRE Y ENTREGA – TERMINACIÓN DE CONTRATO T&A' });
    A.seccion('1. Datos de la terminación');
    A.pares([['Cliente', p.cliente], ['Proceso', p.nombre + ' (' + p.Title + ')'], ['Contrato / Orden de Servicio', p.os_numero || d.os || ''], ['Fecha de notificación', fechaLarga(d.fecha_notificacion)],
      ['Fecha efectiva de terminación', fechaLarga(d.fecha_terminacion)], ['Fecha de cierre', fechaLarga(d.fecha_cierre)], ['Líder del proceso', d.lider || p.lider], ['', '']]);
    A.seccion('2. Controles de cierre');
    A.lista(['Categoría', 'Control', 'Cumplimiento', 'Observaciones / evidencia'], (d.controles || []).map((x) => [x.categoria, x.control, x.cumple || 'Pendiente', x.obs]), [34, 62, 24, null]);
    A.seccion('3. Pendientes y obligaciones posteriores');
    A.lista(['N°', 'Descripción', 'Responsable', 'Fecha compromiso'], (d.pendientes || []).map((x, i) => [String(i + 1), x.descripcion, x.responsable, fechaLarga(x.fecha)]), [10, null, 40, 30]);
    A.seccion('4. Aceptación del cliente');
    A.nota('Con la aceptación de esta acta el cliente declara recibidos la información, los equipos y los demás entregables acordados para la terminación del contrato, y acepta los pendientes registrados. La aceptación por correo electrónico tiene el mismo valor que la firma.');
    aceptacion(A, d.aceptacion);
    return { doc: A.cerrar(), nombre: nombreArchivo('2609-FOR-OPE', p.cliente, d.fecha_cierre) };
  }

  window.PRY_ACTAS = { acta2610, acta2609, fechaLarga };
})();
