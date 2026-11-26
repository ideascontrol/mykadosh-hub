/* =====================================================================
   APP-114 · Proyectos — seguimiento del proyecto
   Pestañas: Reuniones y compromisos · Riesgos y problemas · Documentos y actas · Cierre
   Listas: PRY_Reuniones (reuniones y comités) · PRY_Pendientes (compromisos, decisiones, visitas técnicas, riesgos, problemas)
           PRY_Documentos (actas generadas y documentos del proyecto) · PRY_Cambios (solo lectura, para el 2610)
   - Una reunión puede quedarse en notas y pendientes, o generar el acta 2610-FOR-OPE (PDF en la carpeta del proyecto).
   - Visita técnica: se crea como tarea propia del cronograma y se abre para programarla en la agenda de Operaciones;
     cuando la tarea queda Completada (visita ejecutada), el compromiso se cierra solo.
   - Cierre: acta 2609-FOR-OPE (o su variante de terminación de contrato T&A), borrador guardado y PDF en la carpeta.
   ===================================================================== */
(function () {
  const U = IC.ui, G = IC.graph, esc = U.esc;
  const Z = { id: '', reus: [], pend: [], docs: [], cambios: [], filtro: 'abiertos', filtroR: 'abiertos' };
  const S = () => App.pry.S, P = () => App.pry.S.p, ed = () => App.pry.editable();
  const f10 = (v) => (v ? String(v).slice(0, 10) : '');
  const fecha = (v) => (v ? PRY.textoFecha(f10(v), true) : '');
  const json = (v) => { try { return JSON.parse(v || '{}'); } catch (e) { return {}; } };
  const pad5 = (n) => PRY.pad(n, 5);
  const cerrado = (x) => x.estado === 'Cerrado';
  const esAcuerdo = (x) => ['Compromiso', 'Decisión', 'Visita técnica'].indexOf(x.tipo) >= 0;
  const esRiesgo = (x) => x.tipo === 'Riesgo' || x.tipo === 'Problema';
  const tag = (t, cl) => '<span class="pry-tag ' + (cl || '') + '">' + esc(t) + '</span>';
  const tagEstado = (e) => tag(e || 'Abierto', e === 'Cerrado' ? 'verde' : e === 'En seguimiento' ? 'azul' : 'dorado');
  function explicar(e) {
    const m = U.mensajeError(e);
    return /not recognized|no se reconoce|does not exist|no existe|field/i.test(String(e && e.message)) ? m + ' — Falta actualizar las listas de Proyectos: abra el Instalador IC Apps y haga clic en «Crear estructura».' : m;
  }

  // ---------- Datos ----------
  async function cargar(forzar) {
    const id = P().Title;
    if (!forzar && Z.id === id) return;
    const f = { filtro: "fields/proyecto_id eq '" + id + "'", top: 2000 };
    const [r, pe, d, ca] = await Promise.all([G.items('PRY_Reuniones', f), G.items('PRY_Pendientes', f), G.items('PRY_Documentos', f), G.items('PRY_Cambios', f).catch(() => [])]);
    Z.reus = r.map((x) => Object.assign(x, { fecha: f10(x.fecha), numero: Number(x.numero) || 0, _datos: json(x.datos) })).sort((a, b) => String(b.fecha).localeCompare(a.fecha) || b.numero - a.numero);
    Z.pend = pe.map((x) => Object.assign(x, { fecha_objetivo: f10(x.fecha_objetivo), estado: x.estado || 'Abierto' })).sort((a, b) => String(a.Title).localeCompare(b.Title));
    Z.docs = d.map((x) => Object.assign(x, { fecha: f10(x.fecha), _datos: json(x.datos) })).sort((a, b) => String(b.fecha).localeCompare(a.fecha));
    Z.cambios = ca;
    Z.id = id;
    await visitasEjecutadas();
  }
  // Visita técnica cuya tarea ya quedó Completada (ejecutada en Programación): el compromiso se cierra solo
  async function visitasEjecutadas() {
    if (!ed()) return;
    const L = Z.pend.filter((x) => x.tipo === 'Visita técnica' && x.tarea_id && !cerrado(x) && (App.pry.porId(x.tarea_id) || {}).estado === 'Completada');
    for (const x of L) {
      const t = App.pry.porId(x.tarea_id), ev = 'Visita ejecutada: tarea ' + t.tarea_id + ' completada' + (t.fin_real ? ' el ' + fecha(t.fin_real) : '');
      try { await G.actualizar('PRY_Pendientes', x._id, { estado: 'Cerrado', evidencia: ev }); Object.assign(x, { estado: 'Cerrado', evidencia: ev }); } catch (e) { console.warn(e); }
    }
    if (L.length) U.aviso(L.length + ' visita(s) técnica(s) ejecutada(s): compromiso(s) cerrado(s)', 'ok', 6000);
  }
  // Responsables sugeridos: personal de IC y contactos del cliente
  async function sugeridos() {
    const ic = PRY.D.personas.map((x) => x.nombre);
    let cl = [];
    try { cl = (await PRY.contactos(P().empresa_id)).map((c) => [c.nombres, c.apellidos].filter(Boolean).join(' ') + ' (cliente)'); } catch (e) { cl = []; }
    return ic.concat(cl);
  }
  const emailDe = (nombre) => { const x = PRY.D.personas.find((p) => p.nombre === nombre); return x ? x.email : ''; };
  const atraso = (x) => (!cerrado(x) && x.fecha_objetivo && x.fecha_objetivo < PRY.hoy() ? PRY.habilesEntre(x.fecha_objetivo, PRY.hoy()) : 0);

  // Foto del estado del proyecto para el acta 2610 (sección 2, 4 y 7)
  function fotoEstado(al) {
    const s = S(), T = s.tareas.filter((t) => !PRY.esFase(t) && !PRY.esNA(t)), base = s.base;
    const hito = T.filter((t) => t.tipo === 'Hito' && t.estado !== 'Completada').sort((a, b) => String(a.fin_plan).localeCompare(b.fin_plan))[0];
    const finBase = base ? Object.keys(base).map((k) => base[k].f).filter(Boolean).sort().pop() : '';
    const fin = P().cierre_estimado || '';
    const desv = finBase && fin && fin > finBase ? PRY.habilesEntre(finBase, fin) : 0;
    const cliente = T.filter((t) => /cliente/i.test(t.organizacion || '') && t.estado !== 'Completada' && t.inicio_plan && t.inicio_plan <= al)
      .map((t) => ({ tarea: t.tarea_id + ' · ' + t.actividad, responsable: t.responsable || t.organizacion, fecha: t.fin_plan, atraso: PRY.atraso(t, base) }))
      .sort((a, b) => b.atraso - a.atraso || String(a.fecha).localeCompare(b.fecha));
    return { al, real: PRY.avance(s.tareas), plan: PRY.avancePlaneado(s.tareas, base), hito: hito ? hito.tarea_id + ' · ' + hito.actividad : '', hito_fecha: hito ? hito.fin_plan : '',
      desviacion: desv, sinBase: !base, cliente, cambios: Z.cambios.filter((x) => !/cerrad|rechaz|anulad/i.test(x.estado || '')).map((x) => ({ id: x.Title, descripcion: x.descripcion, estado: x.estado })) };
  }
  const semaforoSugerido = (est) => (est.desviacion > 5 ? 'Rojo' : est.desviacion > 0 || est.cliente.some((x) => x.atraso > 0) ? 'Amarillo' : 'Verde');

  // =====================================================================
  // REUNIONES Y COMPROMISOS
  // =====================================================================
  async function reuniones(d, c) {
    d.innerHTML = '<div class="ic-vacio">Cargando reuniones…</div>';
    try { await cargar(); } catch (e) { d.innerHTML = '<div class="ic-alerta">' + esc(explicar(e)) + '</div>'; return; }
    const acuerdos = Z.pend.filter(esAcuerdo), V = acuerdos.filter((x) => Z.filtro === 'todos' || !cerrado(x));
    d.innerHTML =
      '<div class="ic-tabla-caja pry-caja"><div class="pry-caja-cab"><h3>Reuniones y comités</h3>' + (ed() ? '<button class="ic-btn chico" id="rNu">+ Registrar reunión</button>' : '') + '</div>' +
      (Z.reus.length ? '<table class="ic-tabla pry-mini"><thead><tr><th>N°</th><th>Fecha</th><th>Tipo</th><th>Objetivo / notas</th><th>Acuerdos</th><th>Acta 2610</th></tr></thead><tbody>' +
        Z.reus.map((r) => { const ps = Z.pend.filter((x) => x.reunion_id === r.Title), ab = ps.filter((x) => !cerrado(x)).length, doc = docDeReunion(r);
          return '<tr data-r="' + esc(r.Title) + '"><td>' + esc(r.numero || '') + '</td><td>' + esc(fecha(r.fecha)) + '</td><td>' + esc(r.tipo || '') + '</td><td>' + esc(String(r.objetivo || r.acuerdos || '').slice(0, 120)) + '</td>' +
            '<td>' + (ps.length ? ab + ' abierto(s) de ' + ps.length : '—') + '</td><td>' + (doc ? '<a href="' + esc(doc.enlace) + '" target="_blank" rel="noopener" data-no>PDF ↗</a> ' + tag(doc.estado, doc.estado === 'Aceptado' ? 'verde' : 'azul') : '<span class="sec">Sin acta</span>') + '</td></tr>'; }).join('') +
        '</tbody></table>' : '<div class="ic-vacio">Aún no hay reuniones registradas. ' + (ed() ? 'Registre la primera con «+ Registrar reunión».' : '') + '</div>') + '</div>' +
      '<div class="ic-tabla-caja pry-caja"><div class="pry-caja-cab"><h3>Compromisos, decisiones y visitas técnicas</h3><span class="espacio"></span>' +
        '<select id="rFil"><option value="abiertos">Abiertos</option><option value="todos"' + (Z.filtro === 'todos' ? ' selected' : '') + '>Todos</option></select>' + (ed() ? ' <button class="ic-btn sec chico" id="pNu">+ Compromiso</button>' : '') + '</div>' +
      (V.length ? tablaPend(V, true) : '<div class="ic-vacio">' + (acuerdos.length ? 'No hay compromisos abiertos.' : 'Sin compromisos registrados.') + '</div>') + '</div>';
    d.querySelectorAll('tr[data-r]').forEach((tr) => { tr.onclick = (e) => { if (e.target.closest('[data-no]')) return; formReunion(Z.reus.find((x) => x.Title === tr.dataset.r), c); }; });
    enlazarPend(d, c);
    const fl = d.querySelector('#rFil'); fl.onchange = () => { Z.filtro = fl.value; reuniones(d, c); };
    const nu = d.querySelector('#rNu'); if (nu) nu.onclick = () => formReunion(null, c);
    const pn = d.querySelector('#pNu'); if (pn) pn.onclick = () => formPendiente(null, c, 'Compromiso');
  }
  function tablaPend(L, acuerdos) {
    return '<table class="ic-tabla pry-mini"><thead><tr><th>ID</th><th>Tipo</th><th>Descripción</th>' + (acuerdos ? '' : '<th>Impacto</th><th>Acción</th>') + '<th>Responsable</th><th>Fecha</th><th>Estado</th><th>Origen</th><th></th></tr></thead><tbody>' +
      L.map((x) => { const at = atraso(x), t = x.tarea_id ? App.pry.porId(x.tarea_id) : null, ag = t ? App.prog.vigente(t.tarea_id) : null;
        return '<tr data-p="' + esc(x.Title) + '"><td>' + esc(x.Title) + '</td><td>' + esc(x.tipo) + '</td><td>' + esc(x.descripcion) + (x.evidencia ? '<span class="sec">' + esc(String(x.evidencia).slice(0, 140)) + '</span>' : '') + '</td>' +
          (acuerdos ? '' : '<td>' + esc(x.impacto || '') + '</td><td>' + esc(x.accion || '') + '</td>') +
          '<td>' + esc(x.responsable || '') + '</td><td>' + esc(fecha(x.fecha_objetivo)) + (at ? '<span class="sec err">' + at + ' día(s) de atraso</span>' : '') + '</td><td>' + tagEstado(x.estado) + '</td>' +
          '<td>' + esc(x.reunion_id || '') + '</td><td data-no>' + (x.tipo === 'Visita técnica' ? (t ? '<a href="#" data-tarea="' + esc(t.tarea_id) + '">' + esc(t.tarea_id) + '</a>' + (ag ? App.prog.etiqueta(t.tarea_id) : '<span class="sec">Sin programar</span>')
            : (ed() && !cerrado(x) ? '<button class="ic-btn chico" data-visita="' + esc(x.Title) + '">Programar visita</button>' : '')) : '') + '</td></tr>'; }).join('') + '</tbody></table>';
  }
  function enlazarPend(d, c) {
    d.querySelectorAll('tr[data-p]').forEach((tr) => { tr.onclick = (e) => { if (e.target.closest('[data-no]')) return; formPendiente(Z.pend.find((x) => x.Title === tr.dataset.p), c); }; });
    d.querySelectorAll('[data-visita]').forEach((b) => { b.onclick = () => programarVisita(Z.pend.find((x) => x.Title === b.dataset.visita), c); });
    d.querySelectorAll('[data-tarea]').forEach((a) => { a.onclick = (e) => { e.preventDefault(); App.pry.editarTarea(App.pry.porId(a.dataset.tarea), c); }; });
  }
  const docDeReunion = (r) => Z.docs.find((x) => x.formato === '2610-FOR-OPE' && x._datos.reunion_id === r.Title);

  // ---------- Formulario de reunión ----------
  async function formReunion(r, c) {
    const nueva = !r, puede = ed(), sug = await sugeridos();
    r = r || { fecha: PRY.hoy(), tipo: 'Comité de seguimiento', numero: Z.reus.reduce((m, x) => Math.max(m, x.numero), 0) + 1, asistentes_ic: (PRY.persona(App.usuario.email) || {}).nombre || '', _datos: {} };
    const est = r._datos.estado || fotoEstado(r.fecha), sem = r.semaforo || semaforoSugerido(est);
    const ps = nueva ? [] : Z.pend.filter((x) => x.reunion_id === r.Title);
    const filaNueva = (tipo) => '<div class="pry-fila-pend" data-fila>' +
      '<select data-k="tipo">' + CFG.tiposPendiente.map((t) => '<option' + (t === tipo ? ' selected' : '') + '>' + t + '</option>').join('') + '</select>' +
      '<input data-k="descripcion" placeholder="Descripción">' + '<input data-k="impacto" placeholder="Impacto (riesgo o problema)">' + '<input data-k="accion" placeholder="Acción">' +
      '<input data-k="responsable" list="dlResp" placeholder="Responsable">' + '<input data-k="fecha_objetivo" type="date">' + '<button type="button" class="ic-btn sec chico" data-quitar title="Quitar">×</button></div>';
    U.modal((nueva ? 'Registrar reunión' : 'Reunión ' + r.Title) + ' · ' + P().Title, '<form class="ic-form pry-form-reu" id="fR" autocomplete="off"><fieldset' + (puede ? '' : ' disabled') + '>' +
      '<datalist id="dlResp">' + sug.map((n) => '<option value="' + esc(n) + '">').join('') + '</datalist>' +
      '<div class="ic-campos">' +
      U.campo({ name: 'fecha', label: 'Fecha', t: 'date', valor: r.fecha, req: true, c: 'c3' }) +
      U.campo({ name: 'tipo', label: 'Tipo', t: 'select', op: CFG.tiposReunion.map((x) => [x, x]), valor: r.tipo, vacio: false, c: 'c4' }) +
      U.campo({ name: 'numero', label: 'Comité N°', t: 'number', valor: r.numero, c: 'c2' }) +
      U.campo({ name: 'semaforo', label: 'Estado (semáforo)', t: 'select', op: [['Verde', 'Verde'], ['Amarillo', 'Amarillo'], ['Rojo', 'Rojo']], valor: sem, vacio: false, c: 'c3' }) +
      U.campo({ name: 'asistentes_ic', label: 'Asistentes IC', t: 'textarea', filas: 2, valor: r.asistentes_ic, c: 'c6' }) +
      U.campo({ name: 'asistentes_cliente', label: 'Asistentes cliente', t: 'textarea', filas: 2, valor: r.asistentes_cliente, c: 'c6' }) +
      U.campo({ name: 'objetivo', label: 'Objetivo / agenda', t: 'textarea', filas: 2, valor: r.objetivo, c: 'c12' }) +
      '<div class="ic-campo c12"><label for="f_avances">Avances desde el último comité <a href="#" id="sAv" class="pry-sug">Sugerir desde el cronograma</a></label><textarea id="f_avances" name="avances" rows="3">' + esc(r.avances || '') + '</textarea></div>' +
      '<div class="ic-campo c12"><label for="f_proximos_pasos">Próximos pasos hasta el siguiente comité <a href="#" id="sPr" class="pry-sug">Sugerir desde el cronograma</a></label><textarea id="f_proximos_pasos" name="proximos_pasos" rows="3">' + esc(r.proximos_pasos || '') + '</textarea></div>' +
      U.campo({ name: 'acuerdos', label: 'Notas internas (no salen en el acta)', t: 'textarea', filas: 2, valor: r.acuerdos, c: 'c12' }) + '</div>' +
      '<div class="pry-est-mini"><b>Estado del proyecto para el acta</b> (foto del ' + esc(fecha(est.al)) + '): avance real ' + est.real + ' % · planeado ' + est.plan + ' % · próximo hito: ' + esc(est.hito || '—') + (est.hito_fecha ? ' (' + esc(fecha(est.hito_fecha)) + ')' : '') +
        ' · desviación ' + est.desviacion + ' día(s) hábiles · tareas del cliente pendientes: ' + est.cliente.length + (puede && !nueva ? ' <a href="#" id="sRe">Actualizar con los datos de hoy</a>' : '') + '</div>' +
      '<h4 class="pry-h4">Compromisos, decisiones, visitas técnicas, riesgos y problemas</h4>' +
      (ps.length ? '<p class="pry-nota" style="margin-top:0">Ya registrados: ' + ps.map((x) => esc(x.Title + ' (' + x.tipo + ', ' + x.estado + ')')).join(' · ') + '. Se editan en la lista de la pestaña.</p>' : '') +
      '<div id="filas"></div>' + (puede ? '<p><button type="button" class="ic-btn sec chico" id="aC">+ Compromiso</button> <button type="button" class="ic-btn sec chico" id="aV">+ Visita técnica</button> <button type="button" class="ic-btn sec chico" id="aR">+ Riesgo o problema</button></p>' : '') +
      '</fieldset><div class="ic-acciones">' + (!nueva ? '<button type="button" class="ic-btn sec" id="rAce">Registrar aceptación</button>' : '') + '<span style="flex:1"></span><button type="button" class="ic-btn sec" id="rNo">Cerrar</button>' +
      (puede ? '<button type="button" class="ic-btn sec" id="rGu">Guardar (notas y pendientes)</button><button type="button" class="ic-btn" id="rActa">Guardar y generar acta 2610</button>' : (!nueva && docDeReunion(r) ? '' : '')) + '</div></form>', (cu) => {
      const f = cu.querySelector('#fR'), filas = cu.querySelector('#filas');
      cu.querySelector('#rNo').onclick = U.cerrarModal;
      let foto = est;
      const agregar = (tipo) => { filas.insertAdjacentHTML('beforeend', filaNueva(tipo)); const fl = filas.lastElementChild; fl.querySelector('[data-quitar]').onclick = () => fl.remove(); ajustarFila(fl); fl.querySelector('[data-k=tipo]').onchange = () => ajustarFila(fl); fl.querySelector('[data-k=descripcion]').focus(); };
      const ajustarFila = (fl) => { const rg = /Riesgo|Problema/.test(fl.querySelector('[data-k=tipo]').value); fl.querySelector('[data-k=impacto]').hidden = !rg; fl.querySelector('[data-k=accion]').hidden = !rg; };
      if (puede) { cu.querySelector('#aC').onclick = () => agregar('Compromiso'); cu.querySelector('#aV').onclick = () => agregar('Visita técnica'); cu.querySelector('#aR').onclick = () => agregar('Riesgo'); }
      const sAv = cu.querySelector('#sAv'), sPr = cu.querySelector('#sPr'), sRe = cu.querySelector('#sRe');
      sAv.onclick = (e) => {
        e.preventDefault(); const ant = Z.reus.filter((x) => x.Title !== r.Title && x.fecha < f.fecha.value).map((x) => x.fecha).sort().pop() || P().inicio || '';
        const L = S().tareas.filter((t) => !PRY.esFase(t) && t.estado === 'Completada' && t.fin_real && t.fin_real > ant && t.fin_real <= f.fecha.value);
        const en = S().tareas.filter((t) => !PRY.esFase(t) && t.estado === 'En curso');
        f.avances.value = L.map((t) => 'Completada: ' + t.actividad + ' (' + t.tarea_id + ')').concat(en.map((t) => 'En curso (' + (Number(t.porcentaje) || 0) + ' %): ' + t.actividad + ' (' + t.tarea_id + ')')).join('\n') || 'Sin tareas completadas desde el último comité.';
      };
      sPr.onclick = (e) => {
        e.preventDefault(); const hasta = PRY.masHabiles ? PRY.masHabiles(f.fecha.value, 5) : f.fecha.value;
        f.proximos_pasos.value = S().tareas.filter((t) => !PRY.esFase(t) && !PRY.esNA(t) && t.estado !== 'Completada' && t.inicio_plan && t.inicio_plan <= hasta)
          .sort((a, b) => String(a.fin_plan).localeCompare(b.fin_plan)).slice(0, 15).map((t) => t.actividad + ' (' + t.tarea_id + ') · ' + (t.responsable || t.organizacion || 'sin responsable') + ' · hasta ' + fecha(t.fin_plan)).join('\n');
      };
      if (sRe) sRe.onclick = (e) => { e.preventDefault(); foto = fotoEstado(PRY.hoy()); U.aviso('Estado actualizado con los datos de hoy; se guarda al guardar la reunión.', 'ok'); sRe.remove(); };
      const ace = cu.querySelector('#rAce'); if (ace) ace.onclick = () => { U.cerrarModal(); formAceptacion('reunion', r, c); };
      async function guardar(conActa, boton) {
        const v = U.leerForm(f), err = {};
        if (!v.fecha) err.fecha = 'Obligatorio';
        const nuevos = Array.from(filas.querySelectorAll('[data-fila]')).map((fl) => { const o = {}; fl.querySelectorAll('[data-k]').forEach((i) => { o[i.dataset.k] = i.value.trim(); }); return o; }).filter((o) => o.descripcion);
        if (!U.marcarErrores(f, err)) return;
        await U.conCarga(boton, async () => {
          try {
            const datos = Object.assign({}, r._datos, { estado: nueva ? fotoEstado(v.fecha) : foto });
            const campos = { fecha: v.fecha, tipo: v.tipo, numero: Number(v.numero) || 0, semaforo: v.semaforo, asistentes_ic: v.asistentes_ic, asistentes_cliente: v.asistentes_cliente,
              objetivo: v.objetivo, avances: v.avances, proximos_pasos: v.proximos_pasos, acuerdos: v.acuerdos, datos: JSON.stringify(datos) };
            let id = r.Title;
            if (nueva) {
              id = 'REU-' + pad5(await G.reservar('REU', 1));
              await G.crear('PRY_Reuniones', Object.assign({ Title: id, proyecto_id: P().Title }, campos));
              await PRY.bitacora(P().Title, '', [{ campo: 'Reunión registrada', antes: '', despues: id + ' · ' + v.tipo + ' · ' + fecha(v.fecha) }], v.objetivo || '', '', App.usuario.nombre);
            } else await G.actualizar('PRY_Reuniones', r._id, campos);
            const creados = [];
            if (nuevos.length) {
              let n = await G.reservar('PEN', nuevos.length);
              for (const o of nuevos) {
                const x = { Title: 'PEN-' + pad5(n++), proyecto_id: P().Title, tipo: o.tipo, descripcion: o.descripcion, responsable: o.responsable, responsable_email: emailDe(o.responsable),
                  fecha_objetivo: o.fecha_objetivo || null, estado: 'Abierto', reunion_id: id };
                if (/Riesgo|Problema/.test(o.tipo)) Object.assign(x, { impacto: o.impacto, accion: o.accion });
                Object.keys(x).forEach((k) => { if (x[k] === '' || x[k] == null) delete x[k]; });
                await G.crear('PRY_Pendientes', x); creados.push(x);
              }
              await PRY.bitacora(P().Title, '', [{ campo: 'Pendientes de la reunión ' + id, antes: '', despues: creados.map((x) => x.Title + ' ' + x.tipo).join(', ') }], '', '', App.usuario.nombre);
            }
            await cargar(true);
            const reu = Z.reus.find((x) => x.Title === id);
            U.cerrarModal();
            if (conActa) await generarActa2610(reu);
            U.aviso('Reunión ' + id + ' guardada' + (creados.length ? ' con ' + creados.length + ' pendiente(s)' : ''), 'ok');
            const visita = creados.find((x) => x.tipo === 'Visita técnica');
            if (visita) {
              const vx = Z.pend.find((x) => x.Title === visita.Title);
              if (await U.confirmar('Programar la visita técnica', 'Se registró la visita técnica ' + vx.Title + ': «' + vx.descripcion + '».\n\n¿La agrega ahora al cronograma y la programa en la agenda de Operaciones?' +
                (creados.filter((x) => x.tipo === 'Visita técnica').length > 1 ? '\n\nLas demás visitas se programan después con el botón «Programar visita» de la lista.' : ''), 'Programar ahora')) return programarVisita(vx, c);
            }
            App.vistas.proyecto(c);
          } catch (e) { U.aviso(explicar(e), 'err', 10000); }
        });
      }
      if (puede) { cu.querySelector('#rGu').onclick = (e) => guardar(false, e.currentTarget); cu.querySelector('#rActa').onclick = (e) => guardar(true, e.currentTarget); }
    });
  }

  async function generarActa2610(r) {
    const pend = Z.pend.filter((x) => x.reunion_id === r.Title).concat(Z.pend.filter((x) => esRiesgo(x) && !cerrado(x) && x.reunion_id !== r.Title));   // riesgos abiertos del proyecto, además de los de la reunión
    const doc0 = docDeReunion(r);
    try {
      const { doc, nombre } = await PRY_ACTAS.acta2610(P(), r, r._datos.estado || fotoEstado(r.fecha), pend);
      const emp = (await PRY.empresas()).find((e) => e.Title === P().empresa_id);
      const up = await PRY_CARPETA.subir(P(), emp, nombre, doc.output('blob'), doc0 && doc0._datos.archivo);
      if (up.carpetaNueva && up.carpetaUrl && P().carpeta !== up.carpetaUrl) { await G.actualizar('PRY_Proyectos', P()._id, { carpeta: up.carpetaUrl }); P().carpeta = up.carpetaUrl; }
      await registrarDoc(doc0, { formato: '2610-FOR-OPE', nombre: 'Acta de comité N° ' + (r.numero || '') + ' · ' + fecha(r.fecha), fecha: r.fecha, estado: doc0 && doc0.estado === 'Aceptado' ? 'Aceptado' : 'Generado', enlace: up.webUrl,
        datos: Object.assign({}, doc0 ? doc0._datos : {}, { reunion_id: r.Title, archivo: up.nombre }) });
      await G.actualizar('PRY_Reuniones', r._id, { acta: up.webUrl });
      await cargar(true);
      U.aviso('Acta 2610 guardada en la carpeta del proyecto: ' + up.nombre, 'ok', 8000);
      window.open(up.webUrl, '_blank', 'noopener');
    } catch (e) {
      console.error(e);
      U.aviso('La reunión se guardó, pero no se pudo generar o guardar el acta: ' + PRY_CARPETA.explicar(e), 'err', 12000);
    }
  }
  async function registrarDoc(doc0, campos) {
    const f = { formato: campos.formato, nombre: campos.nombre, version: '1.0', fecha: campos.fecha, responsable: App.usuario.nombre, estado: campos.estado, enlace: campos.enlace, datos: JSON.stringify(campos.datos || {}) };
    Object.keys(f).forEach((k) => { if (f[k] === '' || f[k] == null) delete f[k]; });
    if (doc0) await G.actualizar('PRY_Documentos', doc0._id, f);
    else await G.crear('PRY_Documentos', Object.assign({ Title: 'DOC-' + pad5(await G.reservar('DOC', 1)), proyecto_id: P().Title }, f));
    await PRY.bitacora(P().Title, '', [{ campo: 'Documento ' + campos.formato, antes: doc0 ? doc0.estado || '' : '', despues: campos.nombre + ' · ' + campos.estado }], '', campos.enlace || '', App.usuario.nombre);
  }

  // Aceptación del cliente (sección 9 del 2610 / 7 del 2609): se guarda y, si se quiere, se regenera el PDF con ella
  function formAceptacion(tipo, obj, c) {
    const ac = (obj._datos || {}).aceptacion || { enviada_por: (PRY.persona(App.usuario.email) || {}).nombre || '' };
    U.modal('Aceptación del cliente', '<form class="ic-form" id="fA"><div class="ic-campos">' +
      U.campo({ name: 'enviada_por', label: 'Enviada por (IC)', valor: ac.enviada_por, c: 'c6' }) + U.campo({ name: 'fecha_envio', label: 'Fecha de envío', t: 'date', valor: ac.fecha_envio, c: 'c6' }) +
      U.campo({ name: 'aceptada_por', label: 'Aceptada por (cliente)', valor: ac.aceptada_por, c: 'c6' }) + U.campo({ name: 'cargo', label: 'Cargo', valor: ac.cargo, c: 'c6' }) +
      U.campo({ name: 'correo', label: 'Correo de aceptación', valor: ac.correo, c: 'c6' }) + U.campo({ name: 'fecha_aceptacion', label: 'Fecha de aceptación', t: 'date', valor: ac.fecha_aceptacion, c: 'c6' }) +
      U.campo({ name: 'regenerar', label: 'Volver a generar el PDF con estos datos (reemplaza el de la carpeta)', t: 'checkbox', valor: true, c: 'c12' }) + '</div>' +
      '<p class="pry-nota">Guarde también el correo de aceptación en la carpeta del proyecto.</p>' +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="aNo">Cancelar</button><button class="ic-btn" id="aOk">Guardar</button></div></form>', (cu) => {
      const f = cu.querySelector('#fA'); cu.querySelector('#aNo').onclick = U.cerrarModal;
      f.onsubmit = (e) => { e.preventDefault(); U.conCarga(cu.querySelector('#aOk'), async () => {
        const v = U.leerForm(f), a = { enviada_por: v.enviada_por, fecha_envio: v.fecha_envio, aceptada_por: v.aceptada_por, cargo: v.cargo, correo: v.correo, fecha_aceptacion: v.fecha_aceptacion };
        const estado = a.fecha_aceptacion && a.aceptada_por ? 'Aceptado' : a.fecha_envio ? 'Enviado al cliente' : null;
        try {
          if (tipo === 'reunion') {
            obj._datos = Object.assign({}, obj._datos, { aceptacion: a });
            await G.actualizar('PRY_Reuniones', obj._id, { datos: JSON.stringify(obj._datos) });
            const d0 = docDeReunion(obj);
            if (d0 && estado) await registrarDoc(d0, { formato: d0.formato, nombre: d0.nombre, fecha: d0.fecha, estado, enlace: d0.enlace, datos: d0._datos });
            U.cerrarModal();
            if (v.regenerar) { await cargar(true); await generarActa2610(Z.reus.find((x) => x.Title === obj.Title)); }
          } else {
            obj._datos.aceptacion = a; if (estado) obj.estado = estado;
            U.cerrarModal(); await guardarCierre(obj, !!v.regenerar);
          }
          U.aviso('Aceptación registrada', 'ok'); await cargar(true); App.vistas.proyecto(c);
        } catch (e2) { U.aviso(explicar(e2), 'err', 9000); }
      }); };
    });
  }

  // ---------- Visita técnica: tarea propia + programación ----------
  function programarVisita(x, c) {
    // Fase sugerida: la primera que tiene tareas sin completar (se puede cambiar)
    const fa = S().tareas.filter(PRY.esFase).find((f) => S().tareas.some((t) => t.id_padre === f.tarea_id && !PRY.esNA(t) && t.estado !== 'Completada'));
    App.pry.tareaPropia(c, { id_padre: fa ? fa.tarea_id : '',
      actividad: 'Visita técnica: ' + x.descripcion, descripcion: 'Compromiso ' + x.Title + (x.reunion_id ? ' de la reunión ' + x.reunion_id : '') + '.',
      responsable_email: x.responsable_email || '', organizacion: 'IC', criterio: 'Visita ejecutada y registrada en Programación',
      comentario: 'Visita técnica acordada' + (x.reunion_id ? ' en ' + x.reunion_id : '') + ' (' + x.Title + ')',
      nota: 'Al agregarla se abre la tarea para programarla en la agenda de Operaciones. Cuando la visita quede ejecutada, la tarea y el compromiso se cierran solos.',
      alCrear: async (t) => {
        try { await G.actualizar('PRY_Pendientes', x._id, { tarea_id: t.tarea_id, estado: 'En seguimiento' }); Object.assign(x, { tarea_id: t.tarea_id, estado: 'En seguimiento' }); } catch (e) { U.aviso(explicar(e), 'err', 9000); }
        App.vistas.proyecto(c);
        setTimeout(() => App.pry.editarTarea(App.pry.porId(t.tarea_id), c), 400);
      }
    });
  }

  // ---------- Formulario de un pendiente (compromiso, decisión, visita, riesgo o problema) ----------
  async function formPendiente(x, c, tipoDef) {
    const nuevo = !x, puede = ed(), sug = await sugeridos();
    x = x || { tipo: tipoDef || 'Compromiso', estado: 'Abierto' };
    U.modal(nuevo ? 'Nuevo ' + x.tipo.toLowerCase() : x.Title + ' · ' + x.tipo, '<form class="ic-form" id="fP" autocomplete="off"><fieldset' + (puede ? '' : ' disabled') + '><div class="ic-campos">' +
      '<datalist id="dlResp2">' + sug.map((n) => '<option value="' + esc(n) + '">').join('') + '</datalist>' +
      U.campo({ name: 'tipo', label: 'Tipo', t: 'select', op: CFG.tiposPendiente.map((t) => [t, t]), valor: x.tipo, vacio: false, c: 'c4' }) +
      U.campo({ name: 'estado', label: 'Estado', t: 'select', op: CFG.estadosPendiente.map((t) => [t, t]), valor: x.estado, vacio: false, c: 'c4' }) +
      U.campo({ name: 'fecha_objetivo', label: 'Fecha compromiso', t: 'date', valor: x.fecha_objetivo, c: 'c4' }) +
      U.campo({ name: 'descripcion', label: 'Descripción', t: 'textarea', filas: 2, valor: x.descripcion, req: true, c: 'c12' }) +
      U.campo({ name: 'impacto', label: 'Impacto', t: 'textarea', filas: 2, valor: x.impacto, c: 'c6' }) + U.campo({ name: 'accion', label: 'Acción', t: 'textarea', filas: 2, valor: x.accion, c: 'c6' }) +
      '<div class="ic-campo c6"><label for="f_responsable">Responsable</label><input id="f_responsable" name="responsable" list="dlResp2" value="' + esc(x.responsable || '') + '"></div>' +
      U.campo({ name: 'evidencia', label: 'Seguimiento / evidencia de cierre', t: 'textarea', filas: 2, valor: x.evidencia, c: 'c6' }) + '</div>' +
      (x.reunion_id ? '<p class="pry-nota">Registrado en la reunión ' + esc(x.reunion_id) + '.</p>' : '') + '</fieldset>' +
      '<div class="ic-acciones">' + (puede && !nuevo && x.tipo === 'Visita técnica' && !x.tarea_id ? '<button type="button" class="ic-btn sec" id="pVis">Programar visita</button>' : '') + '<span style="flex:1"></span><button type="button" class="ic-btn sec" id="pNo">Cerrar</button>' + (puede ? '<button class="ic-btn" id="pOk">Guardar</button>' : '') + '</div></form>', (cu) => {
      const f = cu.querySelector('#fP');
      cu.querySelector('#pNo').onclick = U.cerrarModal;
      const ver = () => { const rg = /Riesgo|Problema/.test(f.tipo.value); f.impacto.closest('.ic-campo').hidden = !rg; f.accion.closest('.ic-campo').hidden = !rg; };
      f.tipo.onchange = ver; ver();
      const pv = cu.querySelector('#pVis'); if (pv) pv.onclick = () => { U.cerrarModal(); programarVisita(x, c); };
      if (!puede) return;
      f.onsubmit = (e) => { e.preventDefault(); const v = U.leerForm(f);
        if (!v.descripcion) { U.marcarErrores(f, { descripcion: 'Obligatorio' }); return; }
        U.conCarga(cu.querySelector('#pOk'), async () => {
          const campos = { tipo: v.tipo, estado: v.estado, descripcion: v.descripcion, responsable: v.responsable, responsable_email: emailDe(v.responsable), fecha_objetivo: v.fecha_objetivo || null, evidencia: v.evidencia,
            impacto: /Riesgo|Problema/.test(v.tipo) ? v.impacto : '', accion: /Riesgo|Problema/.test(v.tipo) ? v.accion : '' };
          try {
            if (nuevo) {
              const id = 'PEN-' + pad5(await G.reservar('PEN', 1)), f2 = Object.assign({ Title: id, proyecto_id: P().Title }, campos);
              Object.keys(f2).forEach((k) => { if (f2[k] === '' || f2[k] == null) delete f2[k]; });
              await G.crear('PRY_Pendientes', f2);
              await PRY.bitacora(P().Title, '', [{ campo: v.tipo + ' registrado', antes: '', despues: id + ' · ' + v.descripcion }], '', '', App.usuario.nombre);
            } else {
              const cambios = Object.keys(campos).filter((k) => String(campos[k] || '') !== String(x[k] || '')).map((k) => ({ campo: x.Title + ' · ' + k, antes: x[k] || '', despues: campos[k] || '' }));
              const f2 = {}; Object.keys(campos).forEach((k) => { f2[k] = campos[k] === '' ? null : campos[k]; });
              await G.actualizar('PRY_Pendientes', x._id, f2);
              if (cambios.length) await PRY.bitacora(P().Title, '', cambios, '', v.evidencia || '', App.usuario.nombre);
            }
            await cargar(true); U.cerrarModal(); U.aviso('Guardado', 'ok'); App.vistas.proyecto(c);
          } catch (e2) { U.aviso(explicar(e2), 'err', 9000); }
        }); };
    });
  }

  // =====================================================================
  // RIESGOS Y PROBLEMAS
  // =====================================================================
  async function riesgos(d, c) {
    d.innerHTML = '<div class="ic-vacio">Cargando…</div>';
    try { await cargar(); } catch (e) { d.innerHTML = '<div class="ic-alerta">' + esc(explicar(e)) + '</div>'; return; }
    const L = Z.pend.filter(esRiesgo), V = L.filter((x) => Z.filtroR === 'todos' || !cerrado(x));
    d.innerHTML = '<div class="ic-tabla-caja pry-caja"><div class="pry-caja-cab"><h3>Riesgos y problemas</h3><span class="espacio"></span>' +
      '<select id="rgFil"><option value="abiertos">Abiertos</option><option value="todos"' + (Z.filtroR === 'todos' ? ' selected' : '') + '>Todos</option></select>' +
      (ed() ? ' <button class="ic-btn chico" id="rgNu">+ Riesgo o problema</button>' : '') + '</div>' +
      (V.length ? tablaPend(V, false) : '<div class="ic-vacio">' + (L.length ? 'No hay riesgos ni problemas abiertos.' : 'Sin riesgos ni problemas registrados. Se registran aquí o en una reunión.') + '</div>') +
      '<p class="pry-nota" style="padding:0 16px 12px">Riesgo: algo que podría pasar y afectar el proyecto. Problema: algo que ya está pasando. Los abiertos salen en la sección 5 del acta de comité (2610).</p></div>';
    enlazarPend(d, c);
    const fl = d.querySelector('#rgFil'); fl.onchange = () => { Z.filtroR = fl.value; riesgos(d, c); };
    const nu = d.querySelector('#rgNu'); if (nu) nu.onclick = () => formPendiente(null, c, 'Riesgo');
  }

  // =====================================================================
  // DOCUMENTOS Y ACTAS
  // =====================================================================
  async function documentos(d, c) {
    d.innerHTML = '<div class="ic-vacio">Cargando…</div>';
    try { await cargar(); } catch (e) { d.innerHTML = '<div class="ic-alerta">' + esc(explicar(e)) + '</div>'; return; }
    const nom = (cod) => (CFG.formatos.find((x) => x[0] === cod) || [cod, ''])[1];
    d.innerHTML = '<div class="ic-tabla-caja pry-caja"><div class="pry-caja-cab"><h3>Documentos y actas</h3><span class="espacio"></span>' +
      (P().carpeta && /^https?:/.test(P().carpeta) ? '<a class="ic-btn sec chico" href="' + esc(P().carpeta) + '" target="_blank" rel="noopener">Abrir carpeta ↗</a> ' : '') +
      (ed() ? '<button class="ic-btn chico" id="dNu">+ Registrar documento</button>' : '') + '</div>' +
      (Z.docs.length ? '<table class="ic-tabla pry-mini"><thead><tr><th>Formato</th><th>Documento</th><th>Fecha</th><th>Estado</th><th>Responsable</th><th></th></tr></thead><tbody>' +
        Z.docs.map((x) => '<tr data-d="' + esc(x.Title) + '"><td><b>' + esc(x.formato || '') + '</b><span class="sec">' + esc(nom(x.formato)) + '</span></td><td>' + esc(x.nombre || '') + '</td><td>' + esc(fecha(x.fecha)) + '</td><td>' + tag(x.estado || '', x.estado === 'Aceptado' ? 'verde' : 'azul') + '</td><td>' + esc(x.responsable || '') + '</td>' +
          '<td data-no>' + (x.enlace ? '<a href="' + esc(x.enlace) + '" target="_blank" rel="noopener">Abrir ↗</a>' : '') + '</td></tr>').join('') + '</tbody></table>'
        : '<div class="ic-vacio">Aún no hay documentos. Las actas que genera la app (2610 y 2609) aparecen aquí solas; otros documentos se registran con su enlace.</div>') + '</div>';
    d.querySelectorAll('tr[data-d]').forEach((tr) => { tr.onclick = (e) => { if (e.target.closest('[data-no]')) return; const x = Z.docs.find((y) => y.Title === tr.dataset.d); if (x._datos.reunion_id || x.formato === '2609-FOR-OPE') return; formDoc(x, c); }; });
    const nu = d.querySelector('#dNu'); if (nu) nu.onclick = () => formDoc(null, c);
  }
  function formDoc(x, c) {
    const nuevo = !x; x = x || { formato: '2602-FOR-OPE', fecha: PRY.hoy(), estado: 'Generado' };
    U.modal(nuevo ? 'Registrar documento' : x.Title, '<form class="ic-form" id="fD"><fieldset' + (ed() ? '' : ' disabled') + '><div class="ic-campos">' +
      U.campo({ name: 'formato', label: 'Formato', t: 'select', op: CFG.formatos.map((f) => [f[0], f[0] === 'OTRO' ? f[1] : f[0] + ' · ' + f[1]]), valor: x.formato, vacio: false, c: 'c6' }) +
      U.campo({ name: 'fecha', label: 'Fecha', t: 'date', valor: x.fecha, c: 'c3' }) + U.campo({ name: 'estado', label: 'Estado', t: 'select', op: CFG.estadosDocumento.map((t) => [t, t]), valor: x.estado, vacio: false, c: 'c3' }) +
      U.campo({ name: 'nombre', label: 'Nombre del documento', valor: x.nombre, req: true, c: 'c12' }) +
      U.campo({ name: 'enlace', label: 'Enlace (SharePoint)', valor: x.enlace, c: 'c12', ph: 'Pegue el enlace del archivo en la carpeta del proyecto' }) + '</div></fieldset>' +
      '<div class="ic-acciones"><span style="flex:1"></span><button type="button" class="ic-btn sec" id="dNo">Cerrar</button>' + (ed() ? '<button class="ic-btn" id="dOk">Guardar</button>' : '') + '</div></form>', (cu) => {
      const f = cu.querySelector('#fD'); cu.querySelector('#dNo').onclick = U.cerrarModal;
      if (nuevo) f.formato.onchange = () => { if (!f.nombre.value || f.nombre.dataset.auto) { f.nombre.value = (CFG.formatos.find((y) => y[0] === f.formato.value) || ['', ''])[1]; f.nombre.dataset.auto = '1'; } };
      if (nuevo) f.formato.onchange();
      if (!ed()) return;
      f.onsubmit = (e) => { e.preventDefault(); const v = U.leerForm(f); if (!v.nombre) { U.marcarErrores(f, { nombre: 'Obligatorio' }); return; }
        U.conCarga(cu.querySelector('#dOk'), async () => {
          try { await registrarDoc(nuevo ? null : x, { formato: v.formato, nombre: v.nombre, fecha: v.fecha, estado: v.estado, enlace: v.enlace, datos: nuevo ? {} : x._datos }); await cargar(true); U.cerrarModal(); App.vistas.proyecto(c); }
          catch (e2) { U.aviso(explicar(e2), 'err', 9000); }
        }); };
    });
  }

  // =====================================================================
  // CIERRE · acta 2609-FOR-OPE (o variante de terminación de contrato T&A)
  // =====================================================================
  const esTerminacion = () => /GNT-007/.test(P().plantillas || '') || /terminaci/i.test(P().escenario || '');
  const tieneTV = () => /GNT-002/.test(P().plantillas || '') || /timevision/i.test(P().escenario || '');
  function borradorCierre() {
    const s = S(), p = P(), T = s.tareas.filter((t) => !PRY.esFase(t) && !PRY.esNA(t)), base = s.base, M = CFG.cierre.metas;
    const hitos = T.filter((t) => t.tipo === 'Hito');
    const ok = hitos.filter((t) => t.estado === 'Completada' && t.fin_real && t.fin_real <= ((base && base[t.tarea_id] && base[t.tarea_id].f) || t.fin_plan)).length;
    const pctH = hitos.length ? Math.round(ok * 100 / hitos.length) : null;
    const finBase = base ? Object.keys(base).map((k) => base[k].f).filter(Boolean).sort().pop() : '';
    const hoy = PRY.hoy(), desv = finBase && hoy > finBase ? PRY.habilesEntre(finBase, hoy) : 0;
    const vivo = T.find((t) => /salida en vivo|go.?live/i.test(t.actividad || ''));
    const docF = (cod) => (cod ? Z.docs.filter((x) => x.formato === cod).sort((a, b) => String(b.fecha).localeCompare(a.fecha))[0] : null);
    const pend = Z.pend.filter((x) => !cerrado(x) && x.tipo !== 'Riesgo').map((x) => ({ descripcion: x.descripcion, responsable: x.responsable, fecha: x.fecha_objetivo }));
    const d = { variante: esTerminacion() ? 'TERMINACION' : 'IMPLEMENTACION', fecha_cierre: hoy, lider: p.lider, salida_vivo: vivo ? vivo.fin_real || vivo.fin_plan : '', tipo_proyecto: '',
      alcance: CFG.cierre.alcance.map((k) => ({ concepto: k, contratado: '', entregado: '', obs: '' })),
      entregables: CFG.cierre.entregables.map((e) => { const x = docF(e[1]); return { nombre: e[0], fecha: x ? x.fecha : '', entregado: x ? 'Sí' : '' }; }),
      indicadores: [
        { nombre: 'Cumplimiento de hitos', resultado: pctH == null ? 'Sin hitos' : pctH + ' %', meta: '>= ' + M.hitos + ' %', cumple: pctH == null ? '' : pctH >= M.hitos ? 'Sí' : 'No' },
        { nombre: 'Desviación del cierre (días hábiles)', resultado: base ? String(desv) : 'Sin línea base', meta: '<= ' + M.desviacion, cumple: base ? (desv <= M.desviacion ? 'Sí' : 'No') : '' },
        { nombre: 'Controles de cambio aprobados', resultado: String(Z.cambios.filter((x) => /aprob/i.test(x.estado || '')).length), meta: 'Seguimiento', cumple: '—' },
        { nombre: 'Casos en hypercare', resultado: '', meta: 'Seguimiento', cumple: '—' },
        { nombre: 'Satisfacción (CSAT)', resultado: '', meta: '>= ' + M.csat + ' %', cumple: '' }],
      pendientes: pend, fecha_traspaso: '', recibe: '', timevision: tieneTV() ? CFG.cierre.timevision.map((k) => ({ control: k, registro: '' })) : null,
      fecha_notificacion: '', fecha_terminacion: '', controles: CFG.cierre.controlesTerminacion.map((k) => ({ categoria: k[0], control: k[1], cumple: 'Pendiente', obs: '' })), aceptacion: {} };
    return d;
  }
  const docCierre = () => Z.docs.find((x) => x.formato === '2609-FOR-OPE');

  async function cierre(d, c) {
    d.innerHTML = '<div class="ic-vacio">Cargando…</div>';
    try { await cargar(); } catch (e) { d.innerHTML = '<div class="ic-alerta">' + esc(explicar(e)) + '</div>'; return; }
    const d0 = docCierre(), datos = d0 ? Object.assign(borradorCierre(), d0._datos) : borradorCierre(), term = datos.variante === 'TERMINACION', puede = ed();
    const obj = d0 || { _datos: datos, estado: 'Borrador' }; obj._datos = datos;
    const inp = (k, v, t) => '<input data-c="' + k + '" ' + (t ? 'type="' + t + '" ' : '') + 'value="' + esc(v == null ? '' : v) + '">';
    const selSN = (k, v, ops) => '<select data-c="' + k + '"><option value=""></option>' + (ops || ['Sí', 'No', 'N.A.']).map((o) => '<option' + (o === v ? ' selected' : '') + '>' + o + '</option>').join('') + '</select>';
    const filasPend = (L) => L.map((x, i) => '<tr><td>' + inp('pendientes.' + i + '.descripcion', x.descripcion) + '</td><td>' + inp('pendientes.' + i + '.responsable', x.responsable) + '</td><td>' + inp('pendientes.' + i + '.fecha', f10(x.fecha), 'date') + '</td></tr>').join('');
    const abiertas = S().tareas.filter((t) => !PRY.esFase(t) && !PRY.esNA(t) && t.estado !== 'Completada').length;
    d.innerHTML = '<div class="ic-tabla-caja pry-caja"><div class="pry-caja-cab"><h3>' + (term ? 'Acta de cierre – terminación de contrato T&A' : 'Acta de cierre y entrega') + ' · 2609-FOR-OPE</h3><span class="espacio"></span>' +
      (d0 && d0.enlace ? '<a class="ic-btn sec chico" href="' + esc(d0.enlace) + '" target="_blank" rel="noopener">Ver PDF ↗</a> ' : '') + (d0 ? tag(d0.estado, d0.estado === 'Aceptado' ? 'verde' : 'azul') : tag('Sin borrador')) + '</div>' +
      '<div class="pry-cierre"><fieldset' + (puede ? '' : ' disabled') + '>' +
      (abiertas ? '<div class="ic-alerta chica">Hay ' + abiertas + ' tarea(s) del cronograma sin completar. Puede trasladarlas como pendientes (sección ' + (term ? '3' : '5') + ').</div>' : '') +
      (term ?
        '<h4 class="pry-h4">1. Datos de la terminación</h4><div class="pry-g4"><label>Fecha de notificación' + inp('fecha_notificacion', f10(datos.fecha_notificacion), 'date') + '</label><label>Fecha efectiva de terminación' + inp('fecha_terminacion', f10(datos.fecha_terminacion), 'date') + '</label>' +
          '<label>Fecha de cierre' + inp('fecha_cierre', f10(datos.fecha_cierre), 'date') + '</label><label>Líder del proceso' + inp('lider', datos.lider) + '</label></div>' +
        '<h4 class="pry-h4">2. Controles de cierre <small>(checklist obligatorio de offboarding T&A)</small></h4><table class="ic-tabla pry-mini"><thead><tr><th>Categoría</th><th>Control</th><th style="width:130px">Cumplimiento</th><th>Observaciones / evidencia</th></tr></thead><tbody>' +
          datos.controles.map((x, i) => '<tr><td>' + esc(x.categoria) + '</td><td>' + esc(x.control) + '</td><td>' + selSN('controles.' + i + '.cumple', x.cumple, ['Pendiente', 'Completado', 'No aplica']) + '</td><td>' + inp('controles.' + i + '.obs', x.obs) + '</td></tr>').join('') + '</tbody></table>' +
        '<h4 class="pry-h4">3. Pendientes y obligaciones posteriores</h4>'
        :
        '<h4 class="pry-h4">1. Datos del proyecto</h4><div class="pry-g4"><label>Tipo de proyecto' + selSN('tipo_proyecto', datos.tipo_proyecto, ['A', 'B', 'C']) + '</label><label>Fecha de salida en vivo' + inp('salida_vivo', f10(datos.salida_vivo), 'date') + '</label>' +
          '<label>Fecha de cierre' + inp('fecha_cierre', f10(datos.fecha_cierre), 'date') + '</label><label>Líder de Implementaciones' + inp('lider', datos.lider) + '</label></div>' +
        '<h4 class="pry-h4">2. Cumplimiento del alcance</h4><table class="ic-tabla pry-mini"><thead><tr><th>Concepto</th><th>Contratado</th><th>Entregado</th><th>Observación</th></tr></thead><tbody>' +
          datos.alcance.map((x, i) => '<tr><td><b>' + esc(x.concepto) + '</b></td><td>' + inp('alcance.' + i + '.contratado', x.contratado) + '</td><td>' + inp('alcance.' + i + '.entregado', x.entregado) + '</td><td>' + inp('alcance.' + i + '.obs', x.obs) + '</td></tr>').join('') + '</tbody></table>' +
        '<h4 class="pry-h4">3. Entregables del proyecto</h4><table class="ic-tabla pry-mini"><thead><tr><th>Entregable</th><th style="width:150px">Fecha</th><th style="width:110px">Entregado</th></tr></thead><tbody>' +
          datos.entregables.map((x, i) => '<tr><td>' + esc(x.nombre) + '</td><td>' + inp('entregables.' + i + '.fecha', f10(x.fecha), 'date') + '</td><td>' + selSN('entregables.' + i + '.entregado', x.entregado) + '</td></tr>').join('') + '</tbody></table>' +
        '<h4 class="pry-h4">4. Indicadores del proyecto <small>(calculados con el registro del proyecto; complete hypercare y CSAT)</small></h4><table class="ic-tabla pry-mini"><thead><tr><th>Indicador</th><th>Resultado</th><th>Meta</th><th style="width:100px">Cumple</th></tr></thead><tbody>' +
          datos.indicadores.map((x, i) => '<tr><td>' + esc(x.nombre) + '</td><td>' + inp('indicadores.' + i + '.resultado', x.resultado) + '</td><td>' + esc(x.meta) + '</td><td>' + (x.cumple === '—' ? '—' : selSN('indicadores.' + i + '.cumple', x.cumple, ['Sí', 'No'])) + '</td></tr>').join('') + '</tbody></table>' +
        '<h4 class="pry-h4">5. Pendientes trasladados a soporte</h4>') +
      '<table class="ic-tabla pry-mini" id="tPend"><thead><tr><th>Descripción</th><th style="width:200px">Responsable</th><th style="width:150px">Fecha compromiso</th></tr></thead><tbody>' + filasPend(datos.pendientes.length ? datos.pendientes : [{}]) + '</tbody></table>' +
      (puede ? '<p><button type="button" class="ic-btn sec chico" id="cPend">+ Pendiente</button>' + (abiertas ? ' <button type="button" class="ic-btn sec chico" id="cTar">Agregar las tareas sin completar</button>' : '') + '</p>' : '') +
      (term ? '' : '<h4 class="pry-h4">6. Traspaso a soporte</h4><div class="pry-g4"><label>Fecha de traspaso' + inp('fecha_traspaso', f10(datos.fecha_traspaso), 'date') + '</label><label>Recibe (soporte IC)<select data-c="recibe"><option value=""></option>' +
          PRY.D.personas.map((x) => '<option' + (x.nombre === datos.recibe ? ' selected' : '') + '>' + esc(x.nombre) + '</option>').join('') + '</select></label><label>Canal de soporte<input value="info@ideascontrol.com · +57 322 8506363" disabled></label><label>Ficha de traspaso<input value="2608-FOR-OPE" disabled></label></div>' +
        (datos.timevision ? '<h4 class="pry-h4">Anexo – Cierre TimeVision</h4><table class="ic-tabla pry-mini"><tbody>' + datos.timevision.map((x, i) => '<tr><td>' + esc(x.control) + '</td><td>' + inp('timevision.' + i + '.registro', x.registro) + '</td></tr>').join('') + '</tbody></table>' : '')) +
      '<h4 class="pry-h4">' + (term ? '4' : '7') + '. Aceptación del cliente</h4><p class="pry-nota" style="margin-top:0">' + (datos.aceptacion && datos.aceptacion.fecha_aceptacion ? 'Aceptada por ' + esc(datos.aceptacion.aceptada_por || '') + ' el ' + esc(fecha(datos.aceptacion.fecha_aceptacion)) + '.' : 'Se registra cuando el cliente responda el correo (botón «Registrar aceptación»).') + '</p>' +
      '</fieldset>' +
      (puede ? '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="cBor">Guardar borrador</button><button type="button" class="ic-btn sec" id="cAce"' + (d0 && d0.enlace ? '' : ' disabled title="Genere primero el PDF"') + '>Registrar aceptación</button><span style="flex:1"></span>' +
        (d0 && d0.estado === 'Aceptado' && P().estado !== 'Cerrado' ? '<button type="button" class="ic-btn sec" id="cCer">Cerrar el proyecto</button>' : '') + '<button type="button" class="ic-btn" id="cGen">Guardar y generar PDF</button></div>' : '') +
      '</div></div>';
    const leer = () => {
      d.querySelectorAll('[data-c]').forEach((el) => {
        const k = el.dataset.c.split('.'); let o = datos;
        for (let i = 0; i < k.length - 1; i++) { if (o[k[i]] == null) o[k[i]] = /^\d+$/.test(k[i + 1]) ? [] : {}; o = o[k[i]]; }
        o[k[k.length - 1]] = el.value;
      });
      datos.pendientes = (datos.pendientes || []).filter((x) => x && String(x.descripcion || '').trim());
      return datos;
    };
    if (!puede) return;
    const tb = d.querySelector('#tPend tbody');
    d.querySelector('#cPend').onclick = () => { leer(); datos.pendientes.push({}); tb.innerHTML = filasPend(datos.pendientes); };
    const ct = d.querySelector('#cTar');
    if (ct) ct.onclick = () => { leer(); S().tareas.filter((t) => !PRY.esFase(t) && !PRY.esNA(t) && t.estado !== 'Completada').forEach((t) => { if (!datos.pendientes.some((x) => x.descripcion && x.descripcion.indexOf(t.tarea_id) >= 0)) datos.pendientes.push({ descripcion: t.tarea_id + ' · ' + t.actividad, responsable: t.responsable || t.organizacion || '', fecha: t.fin_plan }); }); tb.innerHTML = filasPend(datos.pendientes); ct.remove(); };
    d.querySelector('#cBor').onclick = (e) => U.conCarga(e.currentTarget, async () => { obj._datos = leer(); await guardarCierre(obj, false); App.vistas.proyecto(c); });
    d.querySelector('#cGen').onclick = (e) => U.conCarga(e.currentTarget, async () => { obj._datos = leer(); await guardarCierre(obj, true); App.vistas.proyecto(c); });
    const ca = d.querySelector('#cAce'); ca.onclick = () => { obj._datos = leer(); formAceptacion('cierre', obj, c); };
    const cc = d.querySelector('#cCer');
    if (cc) cc.onclick = async () => {
      if (!(await U.confirmar('Cerrar el proyecto', 'El acta de cierre está aceptada por el cliente. El proyecto pasará a «Cerrado» y ya no se podrá editar.\n\nQueda registrado en la bitácora.', 'Cerrar proyecto'))) return;
      try { await G.actualizar('PRY_Proyectos', P()._id, { estado: 'Cerrado' }); await PRY.bitacora(P().Title, '', [{ campo: 'Estado', antes: P().estado, despues: 'Cerrado' }], 'Acta de cierre 2609 aceptada', d0.enlace || '', App.usuario.nombre); P().estado = 'Cerrado'; U.aviso('Proyecto cerrado', 'ok'); App.vistas.proyecto(c); }
      catch (e) { U.aviso(explicar(e), 'err', 9000); }
    };
  }
  async function guardarCierre(obj, conPdf) {
    const d0 = docCierre(), datos = obj._datos;
    try {
      let enlace = d0 ? d0.enlace : '', estado = obj.estado && obj.estado !== 'Borrador' ? obj.estado : d0 ? d0.estado : 'Borrador';
      if (conPdf) {
        const { doc, nombre } = await PRY_ACTAS.acta2609(P(), datos);
        const emp = (await PRY.empresas()).find((e) => e.Title === P().empresa_id);
        const up = await PRY_CARPETA.subir(P(), emp, nombre, doc.output('blob'), datos.archivo);
        if (up.carpetaNueva && up.carpetaUrl && P().carpeta !== up.carpetaUrl) { await G.actualizar('PRY_Proyectos', P()._id, { carpeta: up.carpetaUrl }); P().carpeta = up.carpetaUrl; }
        enlace = up.webUrl; datos.archivo = up.nombre; if (estado === 'Borrador') estado = 'Generado';
        window.open(up.webUrl, '_blank', 'noopener');
      }
      await registrarDoc(d0, { formato: '2609-FOR-OPE', nombre: datos.variante === 'TERMINACION' ? 'Acta de cierre – terminación de contrato T&A' : 'Acta de cierre y entrega', fecha: f10(datos.fecha_cierre) || PRY.hoy(), estado, enlace, datos });
      await cargar(true);
      U.aviso(conPdf ? 'Acta 2609 guardada en la carpeta del proyecto' : 'Borrador guardado', 'ok', 7000);
    } catch (e) { console.error(e); U.aviso((conPdf ? 'No se pudo generar o guardar el acta: ' : '') + (conPdf ? PRY_CARPETA.explicar(e) : explicar(e)), 'err', 12000); }
  }

  App.seg = { reuniones, riesgos, documentos, cierre };
})();
