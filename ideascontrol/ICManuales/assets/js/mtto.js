/* ==========================================================================
   SERIE 2400 · MANTENIMIENTO — contenido de los formatos y relleno de las
   plantillas (2401 orden, 2402 checklist, 2403 informe, 2408 acta).
   Lo usan el formulario móvil (mantenimiento.html) y el generador.
   Requiere docx-relleno.js (GDDocx).
   ========================================================================== */
(function () {
  const D = () => window.GDDocx;
  const N2 = n => String(n).padStart(2, '0');

  const CHECK = [
    'Falla o alcance de mantenimiento confirmado.', 'Condición física inicial registrada.', 'Pantalla inspeccionada.',
    'Cámara / sensor biométrico inspeccionado y limpio.', 'Sensor de huella inspeccionado, si aplica.', 'Lector de tarjeta inspeccionado, si aplica.',
    'Cableado y conectores inspeccionados.', 'Alimentación verificada.', 'Comunicación verificada.', 'Fecha y hora verificadas.',
    'Prueba biométrica ejecutada.', 'Prueba funcional ejecutada.', 'Repuesto registrado, si aplica.', 'Cambios de configuración registrados, si aplica.',
    'Firmware / software registrado, si aplica.', 'Prueba final ejecutada.', 'Evidencia adjunta.', 'Resultado final registrado.',
    'Recomendaciones registradas.', 'Cliente informado / validación obtenida cuando aplica.'];
  const PRUEBAS = ['Encendido / arranque', 'Pantalla / interfaz', 'Biometría', 'Comunicación', 'Eventos / registros', 'Acceso / asistencia', 'Estabilidad', 'Condición final'];
  const PREP = ['Solicitud, ticket u orden de servicio confirmada.', 'Equipo identificado de forma confiable (modelo, serial e ID/activo).',
    'Ficha técnica (2405-FIC-OPE) y documentación del fabricante de cada modelo consultadas.', 'Antecedentes de fallas/mantenimientos revisados cuando están disponibles.',
    'Alcance y criterios de aceptación confirmados.', 'Herramientas, instrumentos, materiales y repuestos verificados.',
    'Ventana de intervención e impactos operativos confirmados.', 'Condiciones de seguridad del sitio verificadas.',
    'Autorizaciones para configuración, red, firmware o elementos de seguridad confirmadas.'];
  const AUTORIZ = [['Cambio de configuración / red', ['No aplica', 'Autorizado', 'Pendiente']], ['Firmware / software', ['No aplica', 'Autorizado', 'Pendiente']],
    ['Intervención física / apertura', ['No aplica', 'Autorizado', 'Pendiente']], ['Garantía / fabricante / especialista', ['No aplica', 'Validar', 'Escalar']]];
  const RESULTADOS = ['Operativo', 'Operativo con observaciones', 'No operativo'];
  const MODELOS = { 'ZKTeco SpeedFace-V5L': 'ZKTeco', 'ZKTeco SpeedFace-V3L': 'ZKTeco', 'VIRDI AC-2100 Plus': 'VIRDI', 'VIRDI UBio-X Face': 'VIRDI' };

  const actividadId = v => `${v.tipoAct || 'MTTO'}-${v.anio}-${String(v.consecutivo).padStart(3, '0')}`;
  const cc = v => String(v.codCliente || '').padStart(4, '0');
  const f8 = v => (v.fecha || '').replace(/-/g, '');
  const fechaTxt = f => f ? f.split('-').reverse().join(' / ') : '';
  const servicio = v => [actividadId(v), v.os && 'OS ' + v.os].filter(Boolean).join(' · ');
  const sedeDir = v => [v.sede, v.direccion, v.ciudad].filter(Boolean).join(' — ');
  const fabModelo = e => e.modelo ? (e.modelo.startsWith(MODELOS[e.modelo] || '~') ? e.modelo : [MODELOS[e.modelo], e.modelo].filter(Boolean).join(' ')) : '';
  const serialId = e => [e.serial, e.activo && 'ID ' + e.activo].filter(Boolean).join(' / ');
  const tieneNC = e => Object.values(e.chk || {}).includes('NC') || Object.values(e.pruebas || {}).includes('Falla');
  const requiereInforme = (v, e) => (v.tipoMtto && v.tipoMtto !== 'Preventivo') || tieneNC(e) || !!e.forzarInforme;
  const nombre = (v, codigo, i) => `${cc(v)}_${actividadId(v)}_${codigo}${i != null ? '_EQ' + N2(i + 1) : ''}_${f8(v)}.docx`;
  const nombres = (v, i) => ({ orden: nombre(v, '2401-FOR-OPE'), checklist: nombre(v, '2402-FOR-OPE', i), informe: nombre(v, '2403-FOR-OPE', i), acta: nombre(v, '2408-FOR-OPE') });

  function asegurarFilas(tbl, n) {
    const fs = D().filas(tbl);
    while (D().filas(tbl).length - 1 < n) { const nueva = fs[fs.length - 1].cloneNode(true); tbl.appendChild(nueva); }
  }
  /** Deja exactamente n filas de datos (quita las filas vacías sobrantes). */
  function ajustarFilas(tbl, n) {
    asegurarFilas(tbl, n);
    D().filas(tbl).slice(n + 1).forEach(f => f.remove());
  }
  const celdasFila = (tbl, i) => D().celdas(D().filas(tbl)[i]);
  const siNo = (doc, etiqueta, valor, detalle, si = 'Sí', no = 'No aplica', n = 0) => {
    const { marcarCampo, etiquetaCelda, completar } = D();
    if (valor) { marcarCampo(doc, etiqueta, si, n); const p = etiquetaCelda(doc, etiqueta, n); if (p && detalle) completar(doc, p[1], detalle); }
    else if (valor === false) marcarCampo(doc, etiqueta, no, n);
  };

  /* ---------------- 2401 · Orden de servicio (una por visita) ---------------- */
  function r2401(doc, v) {
    const { campo, marcarCampo, caja, tabla, escribir, marcar } = D();
    campo(doc, 'No. de servicio / ticket', servicio(v)); campo(doc, 'Fecha de solicitud', fechaTxt(v.fechaSolicitud || v.fecha));
    campo(doc, 'Cliente', v.cliente); campo(doc, 'Responsable del cliente', [v.contacto, v.cargo].filter(Boolean).join(' · '));
    campo(doc, 'Ubicación / sede', sedeDir(v)); campo(doc, 'Contacto', v.telefono);
    marcarCampo(doc, 'Tipo de mantenimiento', v.tipoMtto); marcarCampo(doc, 'Prioridad', v.prioridad);
    campo(doc, 'Fecha programada', fechaTxt(v.fecha)); campo(doc, 'Hora / ventana', v.ventana);
    campo(doc, 'Técnico asignado', v.tecnico, 0); campo(doc, 'Coordinador', v.coordinador);
    const te = tabla(doc, ['equipo', 'fabricante / modelo', 'serial']);
    if (te) {
      ajustarFilas(te, v.equipos.length);
      v.equipos.forEach((e, i) => {
        const c = celdasFila(te, i + 1);
        [`EQ${N2(i + 1)}`, fabModelo(e), e.serial, e.activo, e.ubicacion, e.metodo, e.garantia].forEach((x, j) => { if (c[j] && x) escribir(doc, c[j], x); });
      });
    }
    caja(doc, 'Motivo / falla reportada', v.motivo); caja(doc, 'Alcance de la intervención', v.alcance);
    const tp = tabla(doc, ['verificacion', 'estado']);
    if (tp && v.prep) PREP.forEach((_, i) => { const r = v.prep[i]; const c = celdasFila(tp, i + 1); if (r && c) marcar(c[1], r); });
    const ta = tabla(doc, ['elemento', 'estado']);
    if (ta && v.aut) AUTORIZ.forEach((_, i) => { const r = v.aut[i]; const c = celdasFila(ta, i + 1); if (r && c) marcar(c[1], r); });
    caja(doc, 'Condición física / entorno', v.obsIniciales);
    caja(doc, 'Condiciones del cliente', v.restricciones);
    if (v.equipos.some(e => e.chk && Object.keys(e.chk).length)) {
      marcarCampo(doc, 'Checklist 2402 (uno por equipo)', 'Generado');
      marcarCampo(doc, 'Informe técnico 2403', v.equipos.some(e => requiereInforme(v, e)) ? 'Requerido' : 'No aplica');
      marcarCampo(doc, 'Repuestos (sección 5 del 2403)', v.equipos.some(e => (e.informe?.repuestos || []).some(r => r.comp)) ? 'Requerido' : 'No aplica');
      marcarCampo(doc, 'Evidencia fotográfica', v.equipos.some(e => e.fotos === 'Adjunta / vinculada') ? 'Requerida' : 'No aplica');
      marcarCampo(doc, 'Escalamiento técnico', v.equipos.some(e => e.informe?.escalamiento) ? 'Requerido' : 'No aplica');
      marcarCampo(doc, 'Acta de entrega 2408', 'Requerida');
    }
    campo(doc, 'Preparó', v.coordinador || v.tecnico); campo(doc, 'Técnico asignado', v.tecnico, 1);
    campo(doc, 'Coordinó', v.coordinador);
    campo(doc, 'Fecha', fechaTxt(v.fecha), 0); campo(doc, 'Fecha', fechaTxt(v.fecha), 1);
  }

  /* ---------------- 2402 · Checklist (uno por equipo) ---------------- */
  function r2402(doc, v, e, i) {
    const { campo, marcarCampo, caja, tabla, escribir, completar, marcar, marcarParrafo, etiquetaCelda } = D();
    const nm = nombres(v, i);
    campo(doc, 'No. servicio / ticket', servicio(v)); campo(doc, 'Fecha', fechaTxt(v.fecha), 0);
    campo(doc, 'Cliente', v.cliente); campo(doc, 'Técnico', v.tecnico, 0);
    campo(doc, 'Equipo', `EQ${N2(i + 1)}`); campo(doc, 'Orden de servicio', nm.orden.replace('.docx', ''));
    campo(doc, 'Fabricante / modelo', fabModelo(e)); campo(doc, 'Serial / ID activo', serialId(e));
    campo(doc, 'Firmware / software', e.firmware); campo(doc, 'Ubicación', [v.sede, e.ubicacion].filter(Boolean).join(' — '));
    marcarCampo(doc, 'Tipo de mantenimiento', v.tipoMtto);
    const hayDatos = e.chk && Object.keys(e.chk).length;
    if (hayDatos) marcarCampo(doc, 'Informe técnico', requiereInforme(v, e) ? 'Requerido' : 'No aplica', 0);
    const tc = tabla(doc, ['punto de control']);
    if (tc && e.chk) CHECK.forEach((_, k) => {
      const c = celdasFila(tc, k + 1); if (!c) return; const r = e.chk[k + 1];
      if (r === 'C') marcar(c[2], ''); else if (r === 'NC') marcar(c[3], ''); else if (r === 'NA') marcar(c[4], 'NA');
      const o = e.chkObs?.[k + 1]; if (o) completar(doc, c[4], o);
    });
    caja(doc, 'Hallazgos identificados', e.hallazgos);
    const tpr = tabla(doc, ['prueba / condicion']);
    if (tpr && e.pruebas) PRUEBAS.forEach((_, k) => {
      const c = celdasFila(tpr, k + 1); if (!c) return; const r = e.pruebas[k + 1];
      if (r === 'OK') marcar(c[1], ''); else if (r === 'Falla') marcar(c[2], '');
      const o = e.pruebasObs?.[k + 1]; if (o) escribir(doc, c[3], o);
    });
    marcarParrafo(doc, 'Resultado final', e.resultado);
    if (e.fotos) { marcarCampo(doc, 'Evidencia fotográfica', e.fotos); const p = etiquetaCelda(doc, 'Evidencia fotográfica'); if (p && e.fotosRef) completar(doc, p[1], e.fotosRef); }
    if (hayDatos) {
      const req = requiereInforme(v, e);
      marcarCampo(doc, 'Informe técnico 2403-FOR-OPE', req ? 'Elaborado' : 'No aplica');
      const p = etiquetaCelda(doc, 'Informe técnico 2403-FOR-OPE'); if (p && req) completar(doc, p[1], nm.informe.replace('.docx', ''));
      const pend = e.informe?.pendientes || e.informe?.escalamiento;
      siNo(doc, 'Pendientes / escalamiento', pend ? true : false, pend);
    }
    campo(doc, 'Técnico', v.tecnico, 1); campo(doc, 'Fecha', fechaTxt(v.fecha), 1);
  }

  /* ---------------- 2403 · Informe técnico (por equipo, si aplica) ---------------- */
  function r2403(doc, v, e, i) {
    const { campo, marcarCampo, caja, tabla, escribir, marcar, etiquetaCelda, completar } = D();
    const nm = nombres(v, i); const inf = e.informe || {};
    campo(doc, 'No. servicio / ticket', servicio(v)); campo(doc, 'Fecha', fechaTxt(v.fecha), 0);
    campo(doc, 'Cliente', v.cliente); campo(doc, 'Ubicación / sede', sedeDir(v));
    campo(doc, 'Responsable del cliente', v.contacto); campo(doc, 'Contacto', v.telefono);
    campo(doc, 'Técnico responsable', v.tecnico, 0); marcarCampo(doc, 'Tipo de mantenimiento', v.tipoMtto);
    campo(doc, 'Fabricante', MODELOS[e.modelo] || ''); campo(doc, 'Modelo / variante', e.modelo);
    campo(doc, 'Serial', e.serial); campo(doc, 'ID / activo', e.activo);
    campo(doc, 'Equipo', `EQ${N2(i + 1)}`); campo(doc, 'Orden de servicio', nm.orden.replace('.docx', ''));
    campo(doc, 'Versión firmware / software', e.firmware); campo(doc, 'Referencia del checklist', nm.checklist.replace('.docx', ''));
    caja(doc, 'Falla reportada', inf.motivo || v.motivo); caja(doc, 'Síntoma y condición encontrada', inf.sintoma || e.hallazgos);
    caja(doc, 'Diagnóstico / causa identificada', inf.diagnostico);
    const act = (inf.actividades || []).filter(a => a.t);
    const tac = tabla(doc, ['#', 'actividad realizada']);
    if (tac && act.length) { asegurarFilas(tac, act.length); act.forEach((a, k) => { const c = celdasFila(tac, k + 1); escribir(doc, c[1], a.t); if (a.r) marcar(c[2], a.r); if (a.obs) escribir(doc, c[3], a.obs); }); }
    const rep = (inf.repuestos || []).filter(r => r.comp);
    const tre = tabla(doc, ['componente / repuesto', 'retirado']);
    if (tre && rep.length) {
      asegurarFilas(tre, rep.length);
      rep.forEach((r, k) => {
        const c = celdasFila(tre, k + 1);
        escribir(doc, c[1], r.comp); if (r.ref) escribir(doc, c[2], r.ref);
        if (r.ret) marcar(c[3], ''); if (r.ins) marcar(c[4], ''); escribir(doc, c[5], r.cant || '1');
        if (r.compat) marcar(c[6], r.compat); if (r.motivo) escribir(doc, c[7], r.motivo);
      });
      const tcr = tabla(doc, ['control', 'estado']);
      if (tcr && inf.controlesOK) D().filas(tcr).slice(1).forEach(f => marcar(D().celdas(f)[1], 'OK'));
      if (inf.garantia) { marcarCampo(doc, '¿Aplica garantía?', inf.garantia); }
      if (inf.rma) { marcarCampo(doc, '¿Requiere devolución?', 'Sí'); campo(doc, 'Referencia / RMA', inf.rma); }
    }
    const hayInf = !!e.informe;
    siNo(doc, 'Cambio de configuración', inf.cambioConfig ? true : (hayInf ? false : undefined), inf.cambioConfig);
    if (inf.fwNuevo) { marcarCampo(doc, 'Firmware / software', 'Sí'); const p = etiquetaCelda(doc, 'Firmware / software'); if (p) { completar(doc, p[1], inf.fwAnterior || e.firmware || '—'); completar(doc, p[1], inf.fwNuevo); } }
    siNo(doc, 'Respaldo realizado', inf.respaldo ? true : (hayInf ? false : undefined), inf.respaldo);
    if (hayInf && !inf.fwNuevo) marcarCampo(doc, 'Firmware / software', 'No aplica');
    if (inf.autorizacion) marcarCampo(doc, 'Autorización requerida', inf.autorizacion);
    marcarCampo(doc, 'Estado final', e.resultado);
    const pf = etiquetaCelda(doc, 'Pruebas finales'); if (pf) completar(doc, pf[1], nm.checklist.replace('.docx', ''));
    siNo(doc, 'Pendientes / restricciones', inf.pendientes ? true : false, inf.pendientes);
    siNo(doc, 'Necesita escalamiento', inf.escalamiento ? true : false, inf.escalamiento, 'Sí', 'No');
    caja(doc, 'Recomendaciones técnicas', inf.recomendaciones);
    if (e.fotos) { marcarCampo(doc, 'Registro fotográfico', e.fotos === 'Adjunta / vinculada' ? 'Adjunto / vinculado' : 'No aplica'); const p = etiquetaCelda(doc, 'Registro fotográfico'); if (p && e.fotosRef) completar(doc, p[1], e.fotosRef); }
    const pc = etiquetaCelda(doc, 'Checklist 2402-FOR-OPE'); if (pc) completar(doc, pc[1], nm.checklist.replace('.docx', ''));
    const po = etiquetaCelda(doc, 'Orden de servicio 2401-FOR-OPE'); if (po) completar(doc, po[1], nm.orden.replace('.docx', ''));
    campo(doc, 'Fecha de cierre', fechaTxt(v.fecha)); campo(doc, 'Hora', v.horaCierre); campo(doc, 'Técnico responsable', v.tecnico, 1);
  }

  /* ---------------- 2408 · Acta de entrega (una por visita) ---------------- */
  function estadoGeneral(v) {
    const r = v.equipos.map(e => e.resultado).filter(Boolean); if (!r.length) return '';
    if (r.includes('No operativo')) return 'Con equipos no operativos';
    return r.every(x => x === 'Operativo') ? 'Todos operativos' : 'Con observaciones';
  }
  function r2408(doc, v) {
    const { campo, marcarCampo, caja, tabla, escribir, marcar, marcarParrafo, etiquetaCelda, completar, celdas, filas, txt, norm } = D();
    campo(doc, 'No. servicio / ticket', servicio(v)); campo(doc, 'Fecha de entrega', fechaTxt(v.fecha));
    campo(doc, 'Cliente', v.cliente); campo(doc, 'Ubicación / sede', sedeDir(v));
    campo(doc, 'Responsable del cliente', [v.contacto, v.cargo].filter(Boolean).join(' · ')); campo(doc, 'Contacto', v.telefono);
    campo(doc, 'Técnico responsable', v.tecnico, 0); marcarCampo(doc, 'Tipo de mantenimiento', v.tipoMtto);
    caja(doc, 'Objeto / motivo de la intervención', v.motivo); caja(doc, 'Resumen de actividades', v.resumen);
    const te = tabla(doc, ['equipo', 'operativo']);
    if (te) {
      ajustarFilas(te, v.equipos.length);
      v.equipos.forEach((e, i) => {
        const c = celdasFila(te, i + 1);
        escribir(doc, c[0], `EQ${N2(i + 1)}`); if (fabModelo(e)) escribir(doc, c[1], fabModelo(e)); if (serialId(e)) escribir(doc, c[2], serialId(e));
        const k = RESULTADOS.indexOf(e.resultado); if (k >= 0) marcar(c[3 + k], '');
        if (e.chk && Object.keys(e.chk).length) escribir(doc, c[6], requiereInforme(v, e) ? `EQ${N2(i + 1)} · 2403` : '—');
      });
    }
    marcarCampo(doc, 'Estado general de la visita', estadoGeneral(v));
    if (v.pendientesVisita !== undefined) siNo(doc, 'Pendientes / recomendaciones', v.pendientesVisita ? true : false, v.pendientesVisita);
    if (v.escalamientoVisita !== undefined) siNo(doc, 'Escalamiento', v.escalamientoVisita ? true : false, v.escalamientoVisita);
    const td = tabla(doc, ['documento / evidencia']);
    if (td && v.equipos.some(e => e.chk && Object.keys(e.chk).length)) filas(td).slice(1).forEach(f => {
      const c = celdas(f); const t = norm(txt(c[0]));
      const nInf = v.equipos.filter(e => requiereInforme(v, e)).length;
      if (t.startsWith('2402')) { marcar(c[1], 'Sí'); escribir(doc, c[2], `${v.equipos.length} checklist(s)`); }
      else if (t.startsWith('2403')) { marcar(c[1], nInf ? 'Sí' : 'NA'); if (nInf) escribir(doc, c[2], `${nInf} informe(s)`); }
      else if (t.startsWith('2401')) { marcar(c[1], 'Sí'); escribir(doc, c[2], nombres(v).orden.replace('.docx', '')); }
      else if (t.startsWith('registro fotografico')) marcar(c[1], v.equipos.some(e => e.fotos === 'Adjunta / vinculada') ? 'Sí' : 'NA');
    });
    caja(doc, 'Comentarios, observaciones', v.obsCliente);
    marcarParrafo(doc, 'Resultado de la aceptación', v.aceptacion);
    campo(doc, 'Técnico responsable', v.tecnico, 1); campo(doc, 'Fecha', fechaTxt(v.fecha), 0);
    campo(doc, 'Cliente / responsable', v.clienteNombre || v.contacto); campo(doc, 'Fecha', fechaTxt(v.fecha), 2);
    campo(doc, 'Cargo / área cliente', v.clienteCargo || v.cargo);
  }

  /** Lista de documentos de una visita: [{codigo, nombre, equipo, i}] */
  function documentos(v, { soloConDatos = true } = {}) {
    const out = [{ codigo: '2401-FOR-OPE', nombre: nombres(v).orden }];
    v.equipos.forEach((e, i) => {
      out.push({ codigo: '2402-FOR-OPE', nombre: nombres(v, i).checklist, equipo: e, i });
      if (!soloConDatos || requiereInforme(v, e)) out.push({ codigo: '2403-FOR-OPE', nombre: nombres(v, i).informe, equipo: e, i });
    });
    out.push({ codigo: '2408-FOR-OPE', nombre: nombres(v).acta });
    return out;
  }
  const RELLENO = { '2401-FOR-OPE': r2401, '2402-FOR-OPE': r2402, '2403-FOR-OPE': r2403, '2408-FOR-OPE': r2408 };
  async function generar(plantilla, codigo, v, e, i) {
    const ctx = await D().abrir(plantilla);
    RELLENO[codigo](ctx.doc, v, e, i);
    return D().cerrar(ctx);
  }
  window.GDMtto = { CHECK, PRUEBAS, PREP, AUTORIZ, RESULTADOS, MODELOS, actividadId, nombres, documentos, requiereInforme, tieneNC, estadoGeneral, RELLENO, generar, fechaTxt };
})();
