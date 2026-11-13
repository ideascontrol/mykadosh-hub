/* =====================================================================
   APP-114 · Proyectos — enlace con la Programación de Operaciones (APP-106)
   - El líder del proyecto programa una tarea (visita, pruebas, instalación…) como actividad de Programación.
     La actividad queda en OPE_Actividades con origen PROYECTO, pry_id y pry_tarea (= clave de la tarea).
   - La tarea muestra sus actividades y el estado de cada una (programada, confirmada, reprogramada…).
   - Cuando la actividad queda EJECUTADA en Programación, la tarea se marca Completada con las notas de la visita.
     Programación lo hace al momento; si no pudo (permisos, conexión), Proyectos lo completa al abrir el proyecto.
   ===================================================================== */
(function () {
  const U = IC.ui, G = IC.graph, esc = U.esc;
  const P = { acts: [], porTarea: {}, error: '', cat: null };
  const ESTADOS = { PROGRAMADO: 'Programada', CONFIRMADO: 'Confirmada', EJECUTADO: 'Ejecutada', REPROGRAMADO: 'Reprogramada', CANCELADO: 'Cancelada', STANDBY: 'Stand By' };
  const activa = (a) => ['CANCELADO', 'REPROGRAMADO', 'STANDBY'].indexOf(a.estado) < 0;
  const cerrada = (t) => ['Completada', 'No aplica', 'Cancelada'].indexOf(t.estado) >= 0;
  const nombreTec = (id) => { const t = P.cat && P.cat.tec.find((x) => x.Title === id); return t ? t.nombre : (id || 'sin técnico'); };

  async function catalogos() {
    if (P.cat) return P.cat;
    const [tec, tip] = await Promise.all([G.items('OPE_Tecnicos'), G.items('OPE_Tipos')]);
    P.cat = {
      tec: tec.filter((t) => t.vinculacion !== 'ADMINISTRATIVO').sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99) || String(a.nombre).localeCompare(b.nombre)),
      tip: tip.sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99))
    };
    return P.cat;
  }

  // Actividades de Programación enlazadas al proyecto
  async function cargar(proyectoId) {
    P.acts = []; P.porTarea = {}; P.error = '';
    try {
      P.acts = (await G.items('OPE_Actividades', { filtro: "fields/pry_id eq '" + proyectoId + "'", top: 999 })).map((a) => Object.assign(a, { fecha: PRY.dia(a.fecha) }));
      await catalogos().catch(() => null);
    } catch (e) { P.error = U.mensajeError(e); }
    P.acts.sort((a, b) => String(a.fecha).localeCompare(b.fecha) || String(a.Title).localeCompare(b.Title));
    P.acts.forEach((a) => { const k = String(a.pry_tarea || '').split('#')[1]; if (k) (P.porTarea[k] = P.porTarea[k] || []).push(a); });
    return P.acts;
  }
  const deTarea = (tareaId) => P.porTarea[tareaId] || [];
  // La que manda: la activa más reciente; si no hay activa, la última
  const vigente = (tareaId) => { const L = deTarea(tareaId); return L.filter(activa).pop() || L[L.length - 1] || null; };

  // Etiqueta corta para la fila del cronograma
  function etiqueta(tareaId) {
    const a = vigente(tareaId); if (!a) return '';
    const cls = a.estado === 'EJECUTADO' ? 'verde' : activa(a) ? 'azul' : 'gris';
    return ' <span class="pry-tag ' + cls + '" title="Programación de Operaciones: ' + esc(a.Title) + '">' + esc((ESTADOS[a.estado] || a.estado) + ' ' + PRY.textoFecha(a.fecha) + (a.tecnico_id ? ' · ' + nombreTec(a.tecnico_id) : '')) + '</span>';
  }

  // ---------- Completar la tarea cuando la actividad ya está ejecutada ----------
  async function completar(t, a, proyectoId) {
    const f = a.fecha > PRY.hoy() ? PRY.hoy() : a.fecha;
    const nota = a.Title + ' · ' + PRY.textoFecha(a.fecha, true) + ' · ' + nombreTec(a.tecnico_id) + ': ejecutada en Programación' + (a.observaciones ? '. ' + a.observaciones : '');
    const campos = { estado: 'Completada', porcentaje: 100, fin_real: f, observaciones: (t.observaciones ? t.observaciones + '\n' : '') + nota };
    if (!t.inicio_real) campos.inicio_real = f;
    if (!t.evidencia) campos.evidencia = a.Title;
    await G.actualizar('PRY_Tareas', t._id, campos);
    await PRY.bitacora(proyectoId, t.tarea_id, [{ campo: 'Estado', antes: t.estado, despues: 'Completada' }, { campo: '% avance', antes: t.porcentaje, despues: 100 }, { campo: 'Fin real', antes: t.fin_real || '', despues: f }],
      'Sincronizado desde Programación · ' + nota, a.Title, App.usuario.nombre);
    Object.assign(t, campos);
  }
  // Al abrir el proyecto: completa las tareas cuya actividad ya está ejecutada y la Programación no alcanzó a actualizar
  async function reconciliar(tareas, proyectoId, puede) {
    let n = 0;
    for (const t of tareas) {
      const ej = deTarea(t.tarea_id).filter((a) => a.estado === 'EJECUTADO').pop();
      if (!ej || cerrada(t) || !puede(t)) continue;
      try { await completar(t, ej, proyectoId); n++; } catch (e) { console.warn('No se pudo completar ' + t.tarea_id, e); }
    }
    return n;
  }

  // ---------- Bloque dentro de la ficha de la tarea ----------
  function seccion(t, puedeProgramar) {
    const L = deTarea(t.tarea_id);
    if (!L.length && !puedeProgramar) return '';
    return '<div class="pry-prog"><div class="pry-prog-cab"><b>Programación de Operaciones</b>' +
      (puedeProgramar && !cerrada(t) ? '<button type="button" class="ic-btn sec chico" id="bProg">' + (L.some(activa) ? '+ Programar otra visita' : 'Programar en Operaciones') + '</button>' : '') + '</div>' +
      (P.error ? '<p class="pry-nota err">No se pudo leer la Programación: ' + esc(P.error) + '</p>' : '') +
      (L.length ? '<table class="ic-tabla pry-mini"><tbody>' + L.map((a) => '<tr><td><a href="/ideascontrol/Programacion/" target="ic_programacion">' + esc(a.Title) + '</a></td><td>' + esc(PRY.textoFecha(a.fecha, true)) + (a.hora_inicio ? ' · ' + esc(a.hora_inicio) : '') + '</td><td>' + esc(nombreTec(a.tecnico_id)) + '</td><td>' + esc(a.tipo || '') + '</td><td><span class="pry-tag ' + (a.estado === 'EJECUTADO' ? 'verde' : activa(a) ? 'azul' : 'gris') + '">' + esc(ESTADOS[a.estado] || a.estado) + '</span></td></tr>').join('') + '</tbody></table>'
        : '<p class="pry-nota">Sin actividades programadas. Al marcarla ejecutada en Programación, esta tarea queda completada.</p>') + '</div>';
  }
  function montar(cu, t, proyecto, alGuardar) {
    const b = cu.querySelector('#bProg');
    if (b) b.onclick = () => { U.cerrarModal(); formulario(t, proyecto, alGuardar); };
  }

  // ---------- Formulario «Programar en Operaciones» ----------
  async function formulario(t, p, alGuardar) {
    let cat, emp = null;
    try { cat = await catalogos(); emp = (await PRY.empresas()).find((e) => e.Title === p.empresa_id) || null; }
    catch (e) { U.aviso('No se pudo leer la Programación: ' + U.mensajeError(e), 'err', 8000); return; }
    const tecs = cat.tec.filter((x) => x.estado !== 'INACTIVO'), tipos = cat.tip.filter((x) => x.estado !== 'INACTIVO');
    const tecResp = tecs.find((x) => String(x.email || '').toLowerCase() === String(t.responsable_email || '').toLowerCase());
    let fecha = t.inicio_plan && t.inicio_plan > PRY.hoy() ? t.inicio_plan : PRY.sigHabil(PRY.hoy());
    U.modal('Programar ' + t.tarea_id + ' en Operaciones', '<form class="ic-form" id="fPg"><p class="pry-nota" style="margin-top:0">' + esc(p.Title + ' · ' + p.cliente + ' · ' + t.actividad) + '</p><div class="ic-campos">' +
      U.campo({ name: 'tipo', label: 'Tipo de actividad', t: 'select', op: tipos.map((x) => [x.Title, x.nombre + ' (' + x.Title + ')']), req: true, c: 'c6' }) +
      U.campo({ name: 'tecnico_id', label: 'Técnico', t: 'select', op: tecs.map((x) => [x.Title, x.nombre]), valor: tecResp ? tecResp.Title : '', req: true, c: 'c6' }) +
      U.campo({ name: 'fecha', label: 'Fecha', t: 'date', valor: fecha, req: true, c: 'c4' }) +
      U.campo({ name: 'hora_inicio', label: 'Hora inicio', t: 'time', c: 'c4' }) +
      U.campo({ name: 'equipos', label: 'Equipos', t: 'number', c: 'c4', ayuda: 'Solo instalaciones o mantenimientos' }) +
      U.campo({ name: 'ciudad', label: 'Ciudad', valor: emp && emp.ciudad ? emp.ciudad : '', req: true, c: 'c6' }) +
      U.campo({ name: 'ticket_os', label: 'Ticket / OS', valor: p.os_numero || '', c: 'c6' }) +
      U.campo({ name: 'observaciones', label: 'Observaciones para el técnico', t: 'textarea', filas: 2, valor: 'Proyecto ' + p.Title + ' · ' + t.tarea_id + ' ' + t.actividad + (t.criterio ? '. Criterio: ' + t.criterio : ''), c: 'c12' }) + '</div>' +
      '<div id="pgVal"></div><p class="pry-nota">Queda en la Programación como «Programado», con el cliente del proyecto. Desde allá se confirma, reprograma o marca ejecutada; al quedar ejecutada, esta tarea se completa sola.</p>' +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="pgNo">Cancelar</button><button class="ic-btn" id="pgOk">Programar</button></div></form>', (cu) => {
      const f = cu.querySelector('#fPg');
      cu.querySelector('#pgNo').onclick = U.cerrarModal;
      // Avisos de la agenda del técnico ese día (la validación completa sigue en Programación)
      let avisos = [];
      const revisar = async () => {
        const v = U.leerForm(f), caja = cu.querySelector('#pgVal'); avisos = [];
        if (!v.fecha || !v.tecnico_id) { caja.innerHTML = ''; return; }
        const tc = tecs.find((x) => x.Title === v.tecnico_id);
        if (!PRY.habil(v.fecha)) avisos.push('El ' + PRY.textoFecha(v.fecha, true) + ' no es día hábil: requiere autorización del Director de Operaciones.');
        if (tc && v.tipo && String(tc.habilidades || '').toUpperCase().split(/[;,\s]+/).indexOf(v.tipo) < 0) avisos.push(tc.nombre + ' no tiene la habilidad ' + v.tipo + ' en la matriz.');
        try {
          const dia = await G.items('OPE_Actividades', { filtro: "fields/fecha ge '" + v.fecha + "T00:00:00Z' and fields/fecha le '" + v.fecha + "T23:59:59Z'", top: 999 });
          const suyas = dia.filter((a) => a.tecnico_id === v.tecnico_id && activa(a));
          if (suyas.some((a) => a.tipo === 'AUS')) avisos.push((tc ? tc.nombre : 'El técnico') + ' tiene una ausencia ese día.');
          const otras = suyas.filter((a) => a.tipo !== 'AUS' && a.tipo !== 'OFI');
          if (otras.length) avisos.push((tc ? tc.nombre : 'El técnico') + ' ya tiene ' + otras.length + ' actividad(es) ese día: ' + otras.map((a) => a.tipo + ' ' + (a.cliente || '')).join(', ') + '.');
        } catch (e) { /* sin agenda: se programa igual */ }
        caja.innerHTML = avisos.length ? '<div class="ic-alerta chica">⚠ ' + avisos.map(esc).join('<br>⚠ ') + '</div>' : '<div class="pry-nota" style="color:var(--ic-ok)">✓ Sin cruces en la agenda del técnico ese día.</div>';
      };
      f.addEventListener('change', revisar); revisar();
      f.onsubmit = async (e) => {
        e.preventDefault();
        const v = U.leerForm(f), err = {};
        ['tipo', 'tecnico_id', 'fecha', 'ciudad'].forEach((k) => { if (!v[k]) err[k] = 'Obligatorio'; });
        if (v.fecha && v.fecha < PRY.hoy()) err.fecha = 'No puede ser una fecha pasada';
        if (!U.marcarErrores(f, err)) return;
        await revisar();
        if (avisos.length && !(await U.confirmar('Programar con avisos', avisos.join('\n') + '\n\n¿Programarla de todas formas?', 'Programar'))) { formulario(t, p, alGuardar); return; }
        try {
          let creada;
          await U.conCarga(cu.querySelector('#pgOk'), async () => {
            const n = await G.siguiente('PRG');
            const fila = { Title: 'PRG-' + PRY.pad(n, 6), fecha: v.fecha, tecnico_id: v.tecnico_id, tipo: v.tipo, cliente: p.cliente, empresa_id: p.empresa_id, ciudad: v.ciudad,
              hora_inicio: v.hora_inicio, ticket_os: v.ticket_os, estado: 'PROGRAMADO', observaciones: v.observaciones, origen: 'PROYECTO', pry_id: p.Title, pry_tarea: p.Title + '#' + t.tarea_id };
            if (v.equipos !== '') fila.equipos = Number(v.equipos);
            Object.keys(fila).forEach((k) => { if (fila[k] === '' || fila[k] == null) delete fila[k]; });
            try { creada = await G.crear('OPE_Actividades', fila); }
            catch (e2) { if (/pry_(id|tarea)/i.test(e2.message)) throw new Error('Falta actualizar las listas: abra el Instalador (Programacion/Instalador/) y haga clic en «Crear estructura».'); throw e2; }
            try {
              const ne = await G.siguiente('EVT');
              await G.crear('SYS_Auditoria', { Title: 'EVT-' + PRY.pad(ne, 8), fecha_hora: new Date().toISOString(), usuario_id: App.usuario.email, app_id: CFG.app.id, entidad: 'ACTIVIDAD', registro_id: fila.Title, accion: 'CREAR', antes: '', despues: JSON.stringify(fila) });
            } catch (e3) { console.warn('Auditoría no registrada', e3); }
            await PRY.bitacora(p.Title, t.tarea_id, [{ campo: 'Programada en Operaciones', antes: '', despues: fila.Title + ' · ' + v.tipo + ' · ' + nombreTec(v.tecnico_id) + ' · ' + PRY.textoFecha(v.fecha, true) }], v.observaciones, '', App.usuario.nombre);
          });
          U.cerrarModal(); U.aviso('Actividad ' + creada.Title + ' programada para ' + nombreTec(v.tecnico_id), 'ok', 6000); if (alGuardar) alGuardar();
        } catch (e2) { U.aviso(U.mensajeError(e2), 'err', 9000); }
      };
    });
  }

  App.prog = { cargar, deTarea, vigente, etiqueta, reconciliar, seccion, montar };
})();
