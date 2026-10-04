/* ==========================================================================
   DILIGENCIAR MANTENIMIENTO — formulario para celular (serie 2400)
   El técnico registra la visita, el checklist y las pruebas de cada equipo,
   el informe técnico cuando aplica y el cierre. Al terminar, el portal
   entrega los Word aprobados ya diligenciados:
     2401 orden (1 por visita) · 2402 checklist (1 por equipo)
     2403 informe (por equipo con NC o en correctivo/extraordinario)
     2408 acta de entrega (1 por visita)
   con el nombre y la carpeta del servidor:
     CCCC_CLIENTE/06_MANTENIMIENTO/AAAA/MTTO-AAAA-NNN/
   El avance se guarda en el navegador del celular (borrador), sin conexión.
   ========================================================================== */
(function () {
  const C = window.GD_CATALOGO, M = window.GDMtto;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const slug = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  const N2 = n => String(n).padStart(2, '0');
  const hoyLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const PLANTILLA = {};
  C.areas.forEach(a => a.grupos.forEach(g => g.docs.forEach(d => { if (d.plantilla) PLANTILLA[d.codigo] = d.plantilla; })));
  const grupoMtto = C.areas.flatMap(a => a.grupos).find(g => g.actividad === 'MTTO') || { carpeta: '06_MANTENIMIENTO' };

  /* ---------------- Almacenamiento local (borradores) ---------------- */
  const LS = 'gd_mtto_visitas', LS_TEC = 'gd_mtto_tecnico';
  const leerTodas = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch { return {}; } };
  const escribirTodas = t => { try { localStorage.setItem(LS, JSON.stringify(t)); return true; } catch { return false; } };
  let v = null, vista = 'lista', guardadoEn = '';
  function guardar() {
    if (!v) return;
    v.actualizada = new Date().toISOString();
    const t = leerTodas(); t[v.id] = v;
    if (escribirTodas(t)) { guardadoEn = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }); const g = $('#guardado'); if (g) g.textContent = 'Guardado ' + guardadoEn; }
    try { if (v.tecnico) localStorage.setItem(LS_TEC, v.tecnico); } catch { }
  }
  let tGuardar; const guardarLuego = () => { clearTimeout(tGuardar); tGuardar = setTimeout(guardar, 400); };

  /* ---------------- Modelo ---------------- */
  const nuevoInforme = () => ({ sintoma: '', diagnostico: '', actividades: [{ t: '', r: 'OK', obs: '' }], repuestos: [], controlesOK: false, garantia: '', rma: '',
    cambioConfig: '', fwAnterior: '', fwNuevo: '', respaldo: '', autorizacion: '', pendientes: '', escalamiento: '', recomendaciones: '' });
  const nuevoEquipo = () => ({ modelo: Object.keys(M.MODELOS)[0], serial: '', activo: '', ubicacion: '', metodo: '', garantia: '', firmware: '',
    chk: {}, chkObs: {}, hallazgos: '', pruebas: {}, pruebasObs: {}, resultado: '', fotos: '', fotosRef: '', forzarInforme: false, informe: nuevoInforme() });
  const nuevaVisita = () => {
    const f = hoyLocal(); let tec = ''; try { tec = localStorage.getItem(LS_TEC) || ''; } catch { }
    return { id: 'v' + Date.now(), creada: new Date().toISOString(), tipoAct: 'MTTO', anio: f.slice(0, 4), consecutivo: '', fecha: f, os: '', tecnico: tec, coordinador: '',
      codCliente: '', cliente: '', nit: '', sede: '', ciudad: '', direccion: '', contacto: '', cargo: '', telefono: '',
      tipoMtto: 'Preventivo', prioridad: 'Normal', ventana: '', motivo: '', alcance: '', prep: {}, aut: {}, obsIniciales: '', restricciones: '',
      equipos: [nuevoEquipo()], resumen: '', pendientesVisita: '', escalamientoVisita: '', obsCliente: '', aceptacion: '', clienteNombre: '', clienteCargo: '', horaCierre: '' };
  };
  const get = k => k.split('.').reduce((o, p) => (o == null ? o : o[p]), v);
  const set = (k, val) => { const ps = k.split('.'); const last = ps.pop(); const o = ps.reduce((o, p) => (o[p] ??= {}), v); o[last] = val; };
  const avance = e => { const c = Object.values(e.chk || {}).filter(Boolean).length, p = Object.values(e.pruebas || {}).filter(Boolean).length; return { c, p, total: c + p, max: M.CHECK.length + M.PRUEBAS.length }; };
  const sugerido = e => { const a = avance(e); if (a.total < a.max) return ''; return M.tieneNC(e) ? 'Operativo con observaciones' : 'Operativo'; };
  const actId = () => v.consecutivo ? M.actividadId(v) : 'MTTO-' + v.anio + '-___';
  const ruta = () => [`${String(v.codCliente || '').padStart(4, '0')}_${slug(v.cliente)}`, grupoMtto.carpeta, String(v.anio), M.actividadId(v)];

  /* ---------------- Piezas de interfaz ---------------- */
  const inp = (k, label, o = {}) => {
    const val = get(k) ?? '';
    const ctrl = o.area ? `<textarea data-k="${k}" placeholder="${esc(o.ph || '')}">${esc(val)}</textarea>`
      : o.opts ? `<select data-k="${k}">${o.opts.map(x => `<option ${x === val ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`
      : `<input data-k="${k}" value="${esc(val)}" type="${o.type || 'text'}" ${o.type === 'number' ? 'inputmode="numeric"' : ''} placeholder="${esc(o.ph || '')}" ${o.list ? `list="${o.list}"` : ''}>`;
    return `<label class="mt-l ${o.full ? 'full' : ''}">${esc(label)}${o.req ? ' *' : ''}${ctrl}</label>`;
  };
  const seg = (k, opts, o = {}) => { const cur = get(k); return `<div class="seg ${o.ancho ? 'ancho' : ''}" data-k="${k}">${opts.map(x => `<button type="button" data-v="${esc(x)}" class="${cur === x ? 'on' : ''}">${esc(o.etq?.[x] || x)}</button>`).join('')}</div>`; };
  const campoSeg = (label, k, opts, o = {}) => `<div class="campo-seg ${o.full ? 'full' : ''}">${esc(label)}${seg(k, opts, { ancho: true, etq: o.etq })}</div>`;
  const card = (titulo, cuerpo, extra = '') => `<section class="mt-card"><h2>${titulo}${extra}</h2>${cuerpo}</section>`;
  const estadoEq = e => e.resultado === 'Operativo' ? '<span class="estado ok">Operativo</span>' : e.resultado === 'No operativo' ? '<span class="estado no">No operativo</span>'
    : e.resultado ? '<span class="estado obs">Con observaciones</span>' : '<span class="estado p">Pendiente</span>';

  /* ---------------- Vistas ---------------- */
  function vLista() {
    const todas = Object.values(leerTodas()).sort((a, b) => (b.actualizada || '').localeCompare(a.actualizada || ''));
    return `<h1>Diligenciar mantenimiento</h1>
      <p class="intro">Registre la visita desde el celular: datos del servicio, checklist y pruebas de cada equipo, informe técnico cuando aplique y cierre. Al final obtiene los Word aprobados (2401, 2402, 2403 y 2408) ya diligenciados y con su nombre.</p>
      <button class="btn pri" data-acc="nueva" style="width:100%;justify-content:center;padding:14px">+ Nueva visita de mantenimiento</button>
      ${todas.length ? `<h2 style="font-size:14px;color:var(--suave);margin:22px 0 10px;text-transform:uppercase;letter-spacing:.8px">Visitas guardadas en este celular</h2>
      <div class="visitas">${todas.map(x => `<div class="visita"><div><b>${esc(x.cliente || 'Sin cliente')} · ${esc(x.consecutivo ? M.actividadId(x) : 'MTTO sin consecutivo')}</b>
        <small>${esc(M.fechaTxt(x.fecha))} · ${x.equipos.length} equipo(s) · ${esc(x.tipoMtto)}</small></div>
        <button class="btn sec" data-acc="abrir" data-id="${x.id}">Continuar</button><button class="x" data-acc="borrar" data-id="${x.id}">Eliminar</button></div>`).join('')}</div>` : ''}
      <p class="aviso info" style="margin-top:20px">Las visitas se guardan solo en este navegador. Cuando genere los documentos, guárdelos o compártalos: ese es el registro oficial.</p>`;
  }
  function vVisita() {
    const prep = M.PREP.map((t, i) => `<div class="item"><span class="n">${i + 1}</span><span class="t">${esc(t)}</span>${seg('prep.' + i, ['OK', 'N/A'])}</div>`).join('');
    const aut = M.AUTORIZ.map(([t, o], i) => `<div class="campo-seg">${esc(t)}${seg('aut.' + i, o, { ancho: true })}</div>`).join('');
    return card('Actividad', `<div class="mt-grid">
        ${inp('anio', 'Año', { type: 'number', req: true })}${inp('consecutivo', 'Consecutivo (MTTO-AAAA-NNN)', { type: 'number', req: true, ph: '1' })}
        ${inp('fecha', 'Fecha de la visita', { type: 'date', req: true })}${inp('os', 'Orden de servicio / ticket', { ph: 'Si aplica' })}
        ${inp('tecnico', 'Técnico', { req: true })}${inp('coordinador', 'Coordinador')}</div>`, `<small>${esc(actId())}</small>`)
      + card('Cliente', `<div class="mt-grid">
        ${inp('codCliente', 'Código cliente', { type: 'number', req: true, ph: '0002' })}${inp('cliente', 'Nombre / razón social', { req: true, ph: 'YAMAHA' })}
        ${inp('nit', 'NIT')}${inp('sede', 'Sede')}${inp('ciudad', 'Ciudad')}${inp('direccion', 'Dirección')}
        ${inp('contacto', 'Responsable del cliente')}${inp('cargo', 'Cargo')}${inp('telefono', 'Teléfono / correo', { full: true, type: 'tel' })}</div>`)
      + card('Servicio', `<div class="mt-grid">
        ${campoSeg('Tipo de mantenimiento', 'tipoMtto', ['Preventivo', 'Correctivo', 'Extraordinario'], { full: true })}
        ${campoSeg('Prioridad', 'prioridad', ['Normal', 'Alta', 'Crítica'])}${inp('ventana', 'Hora / ventana', { ph: '8:00 a 12:00' })}
        ${inp('motivo', 'Motivo / falla reportada / necesidad', { area: true, full: true })}
        ${inp('alcance', 'Alcance y resultado esperado', { area: true, full: true })}</div>`)
      + card('Antes de intervenir', `<div class="acc-rapida"><button type="button" class="btn sec" data-acc="prepOK">Marcar todo OK</button></div><div class="items">${prep}</div>`, '<small>2401 · sección 4</small>')
      + card('Autorizaciones', `<div class="mt-grid" style="grid-template-columns:1fr">${aut}</div>`)
      + card('Observaciones iniciales', `<div class="mt-grid">${inp('obsIniciales', 'Condición física / entorno / riesgos', { area: true, full: true })}${inp('restricciones', 'Restricciones del cliente (acceso, ventanas)', { area: true, full: true })}</div>`);
  }
  function vEquipos() {
    return `<h1 style="font-size:20px">Equipos de la visita</h1><p class="intro">Toque un equipo para diligenciar su checklist, pruebas y resultado.</p>
      <div class="eqs">${v.equipos.map((e, i) => { const a = avance(e); return `<button type="button" class="eq" data-acc="equipo" data-i="${i}">
        <span class="id">EQ${N2(i + 1)}</span><span><b>${esc(e.modelo || 'Equipo')}</b><small>${esc([e.serial && 'Serie ' + e.serial, e.ubicacion].filter(Boolean).join(' · ') || 'Sin serial ni ubicación')}</small>
        <div class="prog"><i style="width:${Math.round(100 * a.total / a.max)}%"></i></div><small>${a.c}/20 puntos · ${a.p}/8 pruebas${M.requiereInforme(v, e) ? ' · requiere informe' : ''}</small></span>${estadoEq(e)}</button>`; }).join('')}</div>
      <button type="button" class="btn sec" data-acc="nuevoEq" style="margin-top:12px;width:100%;justify-content:center;padding:12px">+ Agregar equipo</button>`;
  }
  function vEquipo(i) {
    const e = v.equipos[i], b = `equipos.${i}`, inf = `${b}.informe`;
    const chk = M.CHECK.map((t, k) => { const r = e.chk[k + 1]; return `<div class="item ${r === 'NC' ? 'nc' : ''}"><span class="n">${k + 1}</span><span class="t">${esc(t)}</span>${seg(`${b}.chk.${k + 1}`, ['C', 'NC', 'NA'])}
      ${r === 'NC' || e.chkObs[k + 1] ? `<div class="obs"><input data-k="${b}.chkObs.${k + 1}" value="${esc(e.chkObs[k + 1] || '')}" placeholder="¿Qué se encontró?"></div>` : ''}</div>`; }).join('');
    const pr = M.PRUEBAS.map((t, k) => { const r = e.pruebas[k + 1]; return `<div class="item ${r === 'Falla' ? 'nc' : ''}"><span class="n">${k + 1}</span><span class="t">${esc(t)}</span>${seg(`${b}.pruebas.${k + 1}`, ['OK', 'Falla'])}
      ${r === 'Falla' || e.pruebasObs[k + 1] ? `<div class="obs"><input data-k="${b}.pruebasObs.${k + 1}" value="${esc(e.pruebasObs[k + 1] || '')}" placeholder="Resultado / observación"></div>` : ''}</div>`; }).join('');
    const req = M.requiereInforme(v, e), sug = sugerido(e);
    const acts = e.informe.actividades.map((a, k) => `<div class="fila-din"><button type="button" class="quitar" data-acc="delAct" data-i="${i}" data-j="${k}">×</button>
      ${inp(`${inf}.actividades.${k}.t`, `Actividad ${k + 1}`, { ph: 'Ej.: Cambio de patch cord' })}<div class="mt-grid">${campoSeg('Resultado', `${inf}.actividades.${k}.r`, ['OK', 'N/A'])}${inp(`${inf}.actividades.${k}.obs`, 'Observación')}</div></div>`).join('');
    const reps = e.informe.repuestos.map((r, k) => `<div class="fila-din"><button type="button" class="quitar" data-acc="delRep" data-i="${i}" data-j="${k}">×</button>
      <div class="mt-grid">${inp(`${inf}.repuestos.${k}.comp`, 'Componente / repuesto')}${inp(`${inf}.repuestos.${k}.ref`, 'Referencia / parte')}
      ${inp(`${inf}.repuestos.${k}.cant`, 'Cantidad', { type: 'number', ph: '1' })}${campoSeg('Compatibilidad', `${inf}.repuestos.${k}.compat`, ['Verificada', 'Pendiente'])}</div>
      <div class="chks"><label><input type="checkbox" data-k="${inf}.repuestos.${k}.ret" ${r.ret ? 'checked' : ''}> Retirado</label><label><input type="checkbox" data-k="${inf}.repuestos.${k}.ins" ${r.ins ? 'checked' : ''}> Instalado</label></div>
      ${inp(`${inf}.repuestos.${k}.motivo`, 'Motivo / observación')}</div>`).join('');
    return `<button type="button" class="volver" data-acc="paso" data-p="equipos">← Equipos</button>
      <h1 style="font-size:20px">EQ${N2(i + 1)} · ${esc(e.modelo || 'Equipo')}</h1>
      ${card('Datos del equipo', `<div class="mt-grid">${inp(`${b}.modelo`, 'Modelo', { list: 'modelos' })}${inp(`${b}.serial`, 'Serial')}
        ${inp(`${b}.activo`, 'ID / activo')}${inp(`${b}.ubicacion`, 'Ubicación física', { ph: 'Portería principal' })}
        ${campoSeg('Método biométrico', `${b}.metodo`, ['Facial', 'Huella', 'Tarjeta', 'Mixto'], { full: true })}
        ${campoSeg('Garantía', `${b}.garantia`, ['Sí', 'No', 'Por verificar'])}${inp(`${b}.firmware`, 'Firmware / software')}</div>`)}
      ${card('Lista de verificación', `<div class="acc-rapida"><button type="button" class="btn sec" data-acc="todosC" data-i="${i}">Pendientes → C (cumple)</button></div><div class="items">${chk}</div>`, `<small>${avance(e).c}/20</small>`)}
      ${card('Hallazgos y observaciones', inp(`${b}.hallazgos`, 'Hallazgos identificados durante la inspección o intervención', { area: true }))}
      ${card('Pruebas finales', `<div class="acc-rapida"><button type="button" class="btn sec" data-acc="todasOK" data-i="${i}">Pendientes → OK</button></div><div class="items">${pr}</div>`, `<small>${avance(e).p}/8</small>`)}
      ${card('Resultado final', `${sug && !e.resultado ? `<p class="aviso info">Sugerido según el checklist: <b>${esc(sug)}</b></p>` : ''}
        ${seg(`${b}.resultado`, M.RESULTADOS, { ancho: true, etq: { 'Operativo con observaciones': 'Con observaciones' } })}
        <div class="mt-grid" style="margin-top:12px">${campoSeg('Evidencia fotográfica', `${b}.fotos`, ['No aplica', 'Adjunta / vinculada'], { full: true, etq: { 'Adjunta / vinculada': 'Adjunta' } })}
        ${e.fotos === 'Adjunta / vinculada' ? inp(`${b}.fotosRef`, 'Referencia de las fotos', { full: true, ph: 'EVIDENCIAS/EQ' + N2(i + 1) }) : ''}</div>`)}
      ${req ? '' : `<label class="chks" style="margin:0 0 14px"><label><input type="checkbox" data-k="${b}.forzarInforme" ${e.forzarInforme ? 'checked' : ''}> Elaborar informe técnico (2403) aunque no sea obligatorio</label></label>`}
      ${req ? card('Informe técnico 2403', `<p class="aviso alerta">${v.tipoMtto !== 'Preventivo' ? `Obligatorio en mantenimiento ${esc(v.tipoMtto.toLowerCase())}.` : M.tieneNC(e) ? 'Obligatorio: el checklist o las pruebas tienen hallazgos.' : 'Informe solicitado por el técnico.'}</p>
        <div class="mt-grid">${inp(`${inf}.sintoma`, 'Síntoma y condición encontrada', { area: true, full: true, ph: e.hallazgos })}
        ${inp(`${inf}.diagnostico`, 'Diagnóstico / causa identificada', { area: true, full: true })}</div>
        <h2 style="margin-top:16px">Actividades realizadas</h2><div class="filas-din">${acts}</div>
        <button type="button" class="btn sec" data-acc="addAct" data-i="${i}" style="margin-top:8px">+ Actividad</button>
        <h2 style="margin-top:16px">Repuestos y componentes</h2><div class="filas-din">${reps || '<p class="intro" style="margin:0">Sin repuestos.</p>'}</div>
        <button type="button" class="btn sec" data-acc="addRep" data-i="${i}" style="margin-top:8px">+ Repuesto</button>
        ${e.informe.repuestos.length ? `<div class="chks" style="margin-top:12px"><label><input type="checkbox" data-k="${inf}.controlesOK" ${e.informe.controlesOK ? 'checked' : ''}> Diagnóstico, compatibilidad, aprobación, procedencia y garantía verificados</label></div>
          <div class="mt-grid" style="margin-top:10px">${campoSeg('¿Aplica garantía?', `${inf}.garantia`, ['No', 'Sí'])}${inp(`${inf}.rma`, 'Devolución: referencia / RMA')}</div>` : ''}
        <h2 style="margin-top:16px">Configuración y firmware</h2>
        <div class="mt-grid">${inp(`${inf}.cambioConfig`, 'Cambio de configuración (detalle)', { full: true, ph: 'Vacío si no aplica' })}
          ${inp(`${inf}.fwAnterior`, 'Firmware anterior', { ph: e.firmware })}${inp(`${inf}.fwNuevo`, 'Firmware nuevo', { ph: 'Vacío si no se actualizó' })}
          ${inp(`${inf}.respaldo`, 'Respaldo (referencia / ubicación)', { full: true, ph: 'Vacío si no aplica' })}
          ${campoSeg('Autorización requerida', `${inf}.autorizacion`, ['No aplica', 'Obtenida', 'Pendiente'], { full: true })}</div>
        <h2 style="margin-top:16px">Pendientes y recomendaciones</h2>
        <div class="mt-grid">${inp(`${inf}.pendientes`, 'Pendientes / restricciones', { full: true, ph: 'Vacío si no hay' })}
          ${inp(`${inf}.escalamiento`, 'Escalamiento (referencia / especialista)', { full: true, ph: 'Vacío si no se escala' })}
          ${inp(`${inf}.recomendaciones`, 'Recomendaciones técnicas', { area: true, full: true })}</div>`) : ''}`;
  }
  function vCierre() {
    return card('Resumen de la intervención', `<div class="acc-rapida"><button type="button" class="btn sec" data-acc="sugerirResumen">Redactar a partir de los equipos</button></div>
        ${inp('resumen', 'Resumen de actividades realizadas y resultado', { area: true })}`)
      + card('Resultado de la entrega', `<div class="mt-grid">${inp('pendientesVisita', 'Pendientes / recomendaciones', { full: true, ph: 'Vacío si no hay' })}
        ${inp('escalamientoVisita', 'Escalamiento', { full: true, ph: 'Vacío si no aplica' })}</div>`)
      + card('Cliente', `<div class="mt-grid">${inp('obsCliente', 'Comentarios u observaciones del cliente', { area: true, full: true })}
        ${campoSeg('Resultado de la aceptación', 'aceptacion', ['Aceptado', 'Aceptado con observaciones', 'No aceptado / pendiente de gestión'], { full: true, etq: { 'Aceptado con observaciones': 'Con observaciones', 'No aceptado / pendiente de gestión': 'No aceptado' } })}
        ${inp('clienteNombre', 'Nombre de quien recibe', { ph: v.contacto })}${inp('clienteCargo', 'Cargo / área', { ph: v.cargo })}
        ${inp('horaCierre', 'Hora de cierre', { type: 'time' })}</div>
        <p class="aviso info" style="margin:12px 0 0">La firma del cliente se toma sobre el acta 2408 impresa o en PDF (<code>…_FIRMADO.pdf</code>).</p>`);
  }
  function faltantes() {
    const duro = [], aviso = [];
    if (!v.codCliente) duro.push('Código del cliente'); if (!v.cliente) duro.push('Nombre del cliente');
    if (!v.consecutivo) duro.push('Consecutivo de la actividad'); if (!v.tecnico) duro.push('Técnico'); if (!v.fecha) duro.push('Fecha');
    if (!v.equipos.length) duro.push('Al menos un equipo');
    v.equipos.forEach((e, i) => {
      const a = avance(e), id = 'EQ' + N2(i + 1);
      if (a.c < 20) aviso.push(`${id}: faltan ${20 - a.c} puntos del checklist`); if (a.p < 8) aviso.push(`${id}: faltan ${8 - a.p} pruebas`);
      if (!e.resultado) aviso.push(`${id}: sin resultado final`);
      if (M.requiereInforme(v, e) && !e.informe.diagnostico) aviso.push(`${id}: informe técnico sin diagnóstico`);
    });
    if (!v.aceptacion) aviso.push('Cierre: resultado de la aceptación del cliente');
    return { duro, aviso };
  }
  function vDocs() {
    const f = faltantes();
    const docs = f.duro.length ? [] : M.documentos(v);
    return `${f.duro.length ? `<div class="aviso alerta"><b>Para generar los documentos falta:</b><ul class="faltan">${f.duro.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${f.aviso.length ? `<div class="aviso alerta"><b>Pendientes (puede generar igual y completar luego en el Word):</b><ul class="faltan">${f.aviso.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : (f.duro.length ? '' : '<p class="aviso ok">Visita completa.</p>')}
      ${docs.length ? card('Documentos', `<p class="intro" style="margin:0 0 10px">Carpeta: <code>${esc(ruta().join('\\'))}\\</code></p>
        <ul class="docs-lista">${docs.map(d => `<li>${esc(d.nombre)}</li>`).join('')}<li class="dir">EVIDENCIAS\\ (fotos)</li></ul>
        <div class="acciones-docs">
          ${navigator.canShare ? `<button class="btn pri" data-acc="compartir">Compartir los documentos</button>` : ''}
          <button class="btn ${navigator.canShare ? 'sec' : 'pri'}" data-acc="zip">Descargar ZIP con carpetas</button>
          ${'showDirectoryPicker' in window ? `<button class="btn sec" data-acc="carpeta">Guardar en mi carpeta de trabajo</button>` : ''}
        </div><div id="estado" class="aviso" hidden></div>
        <p class="intro" style="margin:12px 0 0">En la oficina: copie la carpeta del cliente dentro de <code>01_CLIENTES</code> del servidor, agregue las fotos en <code>EVIDENCIAS</code> y el acta firmada como <code>…_FIRMADO.pdf</code>.</p>`) : ''}`;
  }

  /* ---------------- Generación de documentos ---------------- */
  async function generar(fn) {
    const est = $('#estado'); const msg = (m, t = 'info') => { est.hidden = false; est.className = 'aviso ' + t; est.innerHTML = m; };
    try {
      guardar(); const out = [];
      for (const d of M.documentos(v)) {
        msg(`Generando ${esc(d.nombre)}…`);
        const blob = await M.generar(PLANTILLA[d.codigo], d.codigo, v, d.equipo, d.i);
        out.push({ nombre: d.nombre, blob });
      }
      await fn(out, msg);
    } catch (e) { if (e.name !== 'AbortError') msg('No fue posible generar los documentos: ' + esc(e.message), 'alerta'); else msg('Operación cancelada.'); }
  }
  const MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const acciones = {
    zip: () => generar(async (docs, msg) => {
      const zip = new JSZip(), base = ruta().join('/');
      docs.forEach(d => zip.file(`${base}/${d.nombre}`, d.blob)); zip.folder(`${base}/EVIDENCIAS`);
      const blob = await zip.generateAsync({ type: 'blob' }); const nombre = `${ruta()[0].slice(0, 4)}_${M.actividadId(v)}_documentos.zip`;
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = nombre; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
      msg(`Listo: ${docs.length} documentos en <code>${esc(nombre)}</code>.`, 'ok');
    }),
    compartir: () => generar(async (docs, msg) => {
      const files = docs.map(d => new File([d.blob], d.nombre, { type: MIME }));
      if (!navigator.canShare({ files })) throw new Error('este navegador no permite compartir archivos; use Descargar ZIP');
      await navigator.share({ files, title: `${v.cliente} · ${M.actividadId(v)}`, text: `Documentos de mantenimiento ${M.actividadId(v)} · ${v.cliente}` });
      msg(`Listo: ${docs.length} documentos compartidos.`, 'ok');
    }),
    carpeta: () => generar(async (docs, msg) => {
      const raiz = await window.showDirectoryPicker({ id: 'ic-trabajo', mode: 'readwrite' });
      let dir = raiz; for (const p of ruta()) dir = await dir.getDirectoryHandle(p, { create: true });
      await dir.getDirectoryHandle('EVIDENCIAS', { create: true });
      let renombrados = 0;
      for (const d of docs) {
        // Nunca sobrescribe: si el archivo ya existe en la carpeta, guarda la nueva versión como _v2, _v3…
        let nombre = d.nombre;
        for (let k = 2; k < 50; k++) { try { await dir.getFileHandle(nombre); nombre = d.nombre.replace(/\.docx$/, `_v${k}.docx`); } catch { break; } }
        if (nombre !== d.nombre) renombrados++;
        const fh = await dir.getFileHandle(nombre, { create: true }); const w = await fh.createWritable(); await w.write(d.blob); await w.close();
      }
      msg(`Listo: ${docs.length} documentos en <b>${esc(raiz.name)}\\${esc(ruta().join('\\'))}</b>.${renombrados ? ` ${renombrados} ya existían y se guardaron como <code>_v2</code> (no se sobrescribió nada).` : ''}`, 'ok');
    })
  };

  /* ---------------- Navegación y eventos ---------------- */
  const PASOS = [['visita', 'Visita'], ['equipos', 'Equipos'], ['cierre', 'Cierre'], ['docs', 'Documentos']];
  const pasoDe = () => vista.startsWith('equipo:') ? 'equipos' : vista;
  function pintar(mantenerScroll) {
    const y = window.scrollY; const raiz = $('#mt');
    if (vista === 'lista' || !v) { raiz.innerHTML = vLista(); $('#barra').hidden = true; window.scrollTo(0, 0); return; }
    const p = pasoDe(); const idx = PASOS.findIndex(x => x[0] === p);
    const ok = { visita: v.cliente && v.codCliente && v.consecutivo && v.tecnico, equipos: v.equipos.length && v.equipos.every(e => e.resultado), cierre: !!v.aceptacion, docs: false };
    const cuerpo = vista === 'visita' ? vVisita() : vista === 'equipos' ? vEquipos() : vista === 'cierre' ? vCierre() : vista === 'docs' ? vDocs() : vEquipo(+vista.split(':')[1]);
    raiz.innerHTML = `<nav class="migas"><a href="index.html">Inicio</a> › <a href="gestion-operativa.html">Gestión Operativa</a> › <a href="#" data-acc="inicio">Mantenimiento</a> › ${esc(v.cliente || 'Nueva visita')}</nav>
      <div class="mt-pasos">${PASOS.map(([k, t], i) => `<button type="button" data-acc="paso" data-p="${k}" class="${k === p ? 'on' : ''} ${ok[k] ? 'ok' : ''}"><b>${i + 1}</b>${t}</button>`).join('')}</div>
      ${cuerpo}<datalist id="modelos">${Object.keys(M.MODELOS).map(m => `<option value="${esc(m)}">`).join('')}</datalist>`;
    const barra = $('#barra'); barra.hidden = false;
    const enEq = vista.startsWith('equipo:'); const i = enEq ? +vista.split(':')[1] : -1;
    barra.querySelector('.in').innerHTML = enEq
      ? `<button class="btn sec" data-acc="paso" data-p="equipos">← Equipos</button><span class="grow mt-guardado" id="guardado">${guardadoEn ? 'Guardado ' + guardadoEn : ''}</span>
         ${i < v.equipos.length - 1 ? `<button class="btn pri" data-acc="equipo" data-i="${i + 1}">EQ${N2(i + 2)} →</button>` : `<button class="btn pri" data-acc="paso" data-p="cierre">Cierre →</button>`}`
      : `${idx > 0 ? `<button class="btn sec" data-acc="paso" data-p="${PASOS[idx - 1][0]}">←</button>` : ''}<span class="grow mt-guardado" id="guardado">${guardadoEn ? 'Guardado ' + guardadoEn : ''}</span>
         ${idx < PASOS.length - 1 ? `<button class="btn pri" data-acc="paso" data-p="${PASOS[idx + 1][0]}">${PASOS[idx + 1][1]} →</button>` : ''}`;
    window.scrollTo(0, mantenerScroll ? y : 0);
  }
  function ir(nueva) { vista = nueva; try { history.replaceState(null, '', '#' + (v ? v.id + '/' + vista : '')); } catch { } pintar(false); }

  function onInput(ev) {
    const t = ev.target; const k = t.dataset && t.dataset.k; if (!k || !v) return;
    if (t.type === 'checkbox') { if (ev.type !== 'change') return; set(k, t.checked); guardar(); pintar(true); return; }
    set(k, t.value); guardarLuego();
    if (/^(cliente|anio|consecutivo)$/.test(k)) { const s = document.querySelector('.mt-card h2 small'); if (s && vista === 'visita') s.textContent = actId(); }
  }
  function onClick(ev) {
    const b = ev.target.closest('button, a[data-acc]'); if (!b) return;
    const sg = b.closest('.seg');
    if (sg && b.dataset.v !== undefined) { const k = sg.dataset.k; set(k, get(k) === b.dataset.v ? '' : b.dataset.v); guardar(); pintar(true); return; }
    const acc = b.dataset.acc; if (!acc) return; ev.preventDefault();
    const i = +b.dataset.i, j = +b.dataset.j;
    switch (acc) {
      case 'nueva': v = nuevaVisita(); guardar(); ir('visita'); break;
      case 'abrir': v = leerTodas()[b.dataset.id]; if (v) ir('visita'); break;
      case 'borrar': if (confirmar('¿Eliminar esta visita guardada en el celular?')) { const t = leerTodas(); delete t[b.dataset.id]; escribirTodas(t); pintar(); } break;
      case 'inicio': guardar(); v = null; ir('lista'); break;
      case 'paso': ir(b.dataset.p); break;
      case 'equipo': ir('equipo:' + i); break;
      case 'nuevoEq': v.equipos.push(nuevoEquipo()); guardar(); ir('equipo:' + (v.equipos.length - 1)); break;
      case 'prepOK': M.PREP.forEach((_, k) => { if (!v.prep[k]) v.prep[k] = 'OK'; }); guardar(); pintar(true); break;
      case 'todosC': M.CHECK.forEach((_, k) => { if (!v.equipos[i].chk[k + 1]) v.equipos[i].chk[k + 1] = 'C'; }); guardar(); pintar(true); break;
      case 'todasOK': M.PRUEBAS.forEach((_, k) => { if (!v.equipos[i].pruebas[k + 1]) v.equipos[i].pruebas[k + 1] = 'OK'; }); guardar(); pintar(true); break;
      case 'addAct': v.equipos[i].informe.actividades.push({ t: '', r: 'OK', obs: '' }); guardar(); pintar(true); break;
      case 'delAct': v.equipos[i].informe.actividades.splice(j, 1); guardar(); pintar(true); break;
      case 'addRep': v.equipos[i].informe.repuestos.push({ comp: '', ref: '', cant: '1', ret: true, ins: true, compat: '', motivo: '' }); guardar(); pintar(true); break;
      case 'delRep': v.equipos[i].informe.repuestos.splice(j, 1); guardar(); pintar(true); break;
      case 'sugerirResumen': {
        const lineas = v.equipos.map((e, k) => {
          const nc = M.CHECK.map((t, x) => e.chk[x + 1] === 'NC' ? t.replace(/[.,]?\s*si aplica\.?$|\.$/i, '') + (e.chkObs[x + 1] ? ` (${e.chkObs[x + 1]})` : '') : null).filter(Boolean);
          const fa = M.PRUEBAS.map((t, x) => e.pruebas[x + 1] === 'Falla' ? t + (e.pruebasObs[x + 1] ? ` (${e.pruebasObs[x + 1]})` : '') : null).filter(Boolean);
          const det = [nc.length && 'no conforme: ' + nc.join('; '), fa.length && 'falla en prueba: ' + fa.join('; ')].filter(Boolean).join('; ');
          return `EQ${N2(k + 1)} ${e.modelo}${e.serial ? ' (' + e.serial + ')' : ''}: ${e.resultado || 'sin resultado'}${det ? ' — ' + det : ''}.`;
        });
        v.resumen = `Mantenimiento ${String(v.tipoMtto).toLowerCase()} a ${v.equipos.length} equipo(s).\n` + lineas.join('\n'); guardar(); pintar(true); break;
      }
      default: if (acciones[acc]) acciones[acc]();
    }
  }
  const confirmar = m => { try { return window.confirm(m); } catch { return true; } };

  function iniciar() {
    const u = GDAuth.proteger(); if (!u) return;
    GD.encabezadoSimple?.(u, 'Mantenimiento en sitio');
    document.querySelector('main').innerHTML = `<div class="mt" id="mt"></div><div class="mt-barra" id="barra" hidden><div class="in"></div></div>`;
    document.addEventListener('input', onInput); document.addEventListener('change', onInput); document.addEventListener('click', onClick);
    const [id, vis] = (location.hash.slice(1) || '').split('/');
    const t = leerTodas(); if (id && t[id]) { v = t[id]; vista = vis || 'visita'; }
    pintar();
    window.addEventListener('pagehide', guardar);
  }
  window.GDMantenimiento = { iniciar };
})();
