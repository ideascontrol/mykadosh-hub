/* =====================================================================
   APP-114 · Proyectos — ficha del proyecto (#p/PRY-0001[/pestaña])
   Pestañas: Resumen · Cronograma (fases plegables, filtros, Gantt, edición con bitácora) · Línea base y versiones · Bitácora
   Las pestañas de reuniones, compromisos, riesgos, cambios, documentos y cierre llegan en las etapas siguientes.
   ===================================================================== */
(function () {
  const U = IC.ui, G = IC.graph, esc = U.esc;
  const PESTANAS = [['resumen', 'Resumen'], ['cronograma', 'Cronograma'], ['linea', 'Línea base y versiones'], ['bitacora', 'Bitácora']];
  const PROXIMAS = ['Reuniones y compromisos', 'Riesgos y problemas', 'Control de cambios', 'Documentos y actas', 'Cierre'];
  const S = { id: '', p: null, tareas: [], planes: [], base: null, plegadas: {}, f: { q: '', ventana: '', resp: '', org: '', fase: '', estado: '', salud: '', ocultarNA: true } };

  // ---------- Carga ----------
  async function cargar(id) {
    if (!App.proyectos.length || !App.proyecto(id)) await App.cargarProyectos();
    S.p = App.proyecto(id);
    if (!S.p) return false;
    const [t, pl] = await Promise.all([
      G.items('PRY_Tareas', { filtro: "fields/proyecto_id eq '" + id + "'", top: 2000 }),
      G.items('PRY_Planes', { filtro: "fields/proyecto_id eq '" + id + "'", top: 200 })
    ]);
    S.tareas = t.map(PRY.normal).sort((a, b) => a.orden - b.orden);
    S.p = App.proyecto(id);
    // Enlace con la Programación: actividades de cada tarea y tareas ya ejecutadas en Operaciones
    await App.prog.cargar(id);
    const nSinc = await App.prog.reconciliar(S.tareas.filter((x) => !PRY.esFase(x)), id, puedeTarea);
    if (nSinc && editable()) { try { await sincronizarProyecto(); } catch (e) { /* se actualiza en el próximo cambio */ } }
    if (nSinc) U.aviso(nSinc + ' tarea(s) completada(s) desde la Programación de Operaciones', 'ok', 6000);
    S.planes = pl.map((x) => Object.assign(x, { version: Number(x.version) || 0 })).sort((a, b) => a.version - b.version);
    const v0 = S.planes.find((x) => x.version === 0);
    S.base = null; if (v0) { try { S.base = JSON.parse(v0.datos || '{}'); } catch (e) { S.base = {}; } }
    if (S.id !== id) { S.id = id; S.plegadas = {}; }
    return true;
  }
  const editable = () => App.puedeEditar(S.p) && ['Cerrado', 'Cancelado'].indexOf(S.p.estado) < 0;
  // El responsable de una tarea puede actualizar su avance aunque no sea líder del proyecto
  const puedeTarea = (t) => editable() || (['Cerrado', 'Cancelado'].indexOf(S.p.estado) < 0 && String(t.responsable_email || '').toLowerCase() === App.usuario.email);
  const hijos = (f) => S.tareas.filter((t) => t.id_padre === f.tarea_id);
  const porId = (id) => S.tareas.find((t) => t.tarea_id === id);

  // Guarda avance y cierre estimado del proyecto cuando cambian
  async function sincronizarProyecto() {
    const av = PRY.avance(S.tareas), fin = S.tareas.filter((t) => !PRY.esNA(t) && !PRY.esFase(t) && t.fin_plan).map((t) => t.fin_plan).sort().pop() || '';
    if (av !== S.p.avance || fin !== S.p.cierre_estimado) {
      await G.actualizar('PRY_Proyectos', S.p._id, { avance: av, cierre_estimado: fin });
      S.p.avance = av; S.p.cierre_estimado = fin;
    }
  }

  // =====================================================================
  App.vistas.proyecto = async function (c) {
    const partes = (location.hash || '').slice(1).split('/'), id = decodeURIComponent(partes[1] || ''), tab = PESTANAS.some((x) => x[0] === partes[2]) ? partes[2] : 'resumen';
    if (S.id !== id || !S.p) c.innerHTML = '<a class="ic-volver" href="#">← Portafolio</a><div class="ic-vacio">Cargando proyecto…</div>';
    try { if (!(await cargar(id))) { c.innerHTML = '<a class="ic-volver" href="#">← Portafolio</a><div class="ic-alerta">No se encontró el proyecto ' + esc(id) + ' o no tiene acceso a él.</div>'; return; } }
    catch (e) { c.innerHTML = '<a class="ic-volver" href="#">← Portafolio</a><div class="ic-alerta">' + esc(U.mensajeError(e)) + '</div>'; return; }
    pintar(c, tab);
  };

  function pintar(c, tab) {
    const p = S.p, real = PRY.avance(S.tareas), plan = PRY.avancePlaneado(S.tareas, S.base);
    c.innerHTML = '<a class="ic-volver" href="#">← Portafolio</a>' +
      '<div class="pry-cab"><div><h1 class="ic-titulo">' + esc(p.nombre) + '</h1><p class="ic-subtitulo">' + esc(p.Title + ' · ' + p.cliente + (p.os_numero ? ' · OS ' + p.os_numero : '') + ' · ' + (p.escenario || '')) + '</p></div>' +
      '<div class="pry-cab-der">' + App.tagEstado(p.estado) + ' ' + App.tagSalud(p.salud) + '<div class="pry-av-cab"><span>Real</span>' + App.barra(real) + '</div><div class="pry-av-cab plan"><span>Planeado</span>' + App.barra(plan) + '</div></div></div>' +
      (!S.base && p.estado !== 'Cancelado' ? '<div class="ic-alerta chica">Sin línea base aprobada: el atraso se mide contra el plan vigente. ' + (editable() ? 'Revise duraciones, responsables y dependencias y <a href="#p/' + esc(p.Title) + '/linea">apruebe la línea base</a>.' : '') + '</div>' : '') +
      '<div class="pry-tabs">' + PESTANAS.map((x) => '<a href="#p/' + esc(p.Title) + '/' + x[0] + '" class="' + (x[0] === tab ? 'on' : '') + '">' + x[1] + '</a>').join('') +
      PROXIMAS.map((x) => '<span class="pry-tab-off" title="Etapa siguiente">' + x + '</span>').join('') + '</div><div id="pTab"></div>';
    const d = c.querySelector('#pTab');
    ({ resumen, cronograma, linea, bitacora })[tab](d, c);
  }
  const recargar = async (c) => { await cargar(S.id); App.vistas.proyecto(c); };

  // =====================================================================
  // RESUMEN
  // =====================================================================
  function resumen(d, c) {
    const p = S.p, L = S.tareas.filter((t) => !PRY.esFase(t)), act = L.filter((t) => !PRY.esNA(t));
    const h = PRY.hoy(), en7 = PRY.sumar(h, 7);
    const venc = act.filter((t) => PRY.vencida(t, S.base)), prox = act.filter((t) => !PRY.cerrada(t) && t.fin_plan >= h && t.fin_plan <= en7);
    const finBase = S.base ? Object.values(S.base).map((x) => x.f).filter(Boolean).sort().pop() : '';
    const k = (v, e, cls, sub) => '<div class="ic-kpi pry-kpi ' + (cls || '') + '"><div class="valor">' + v + '</div><div class="etiqueta">' + e + '</div>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>';
    const dato = (e, v) => v ? '<div><dt>' + e + '</dt><dd>' + v + '</dd></div>' : '';
    const lista = (L2, vacio) => L2.length ? '<table class="ic-tabla pry-mini"><tbody>' + L2.slice(0, 12).map((t) => '<tr data-t="' + esc(t.tarea_id) + '"><td>' + esc(t.tarea_id) + '</td><td>' + esc(t.actividad) + '<span class="sec">' + esc(t.responsable || t.organizacion || 'Sin responsable') + '</span></td><td>' + esc(PRY.textoFecha(t.fin_plan)) + '</td><td>' + App.tagSalud(t.salud) + '</td></tr>').join('') + '</tbody></table>' : '<p class="pry-nota">' + vacio + '</p>';
    d.innerHTML = '<div class="ic-kpis pry-kpis6">' + k(act.filter((t) => t.estado === 'Completada').length + ' / ' + act.length, 'Tareas completadas') + k(venc.length, 'Vencidas', venc.length ? 'err' : '') +
      k(prox.length, 'Vencen en 7 días', prox.length ? 'warn' : '') + k(act.filter((t) => t.salud === 'Bloqueada').length, 'Bloqueadas', 'err') + k(act.filter((t) => t.salud === 'En riesgo').length, 'En riesgo', 'warn') +
      k(esc(PRY.textoFecha(p.cierre_estimado, true) || '—'), 'Cierre estimado', '', finBase ? 'Línea base: ' + esc(PRY.textoFecha(finBase, true)) : '') + '</div>' +
      '<div class="pry-2col"><div class="ic-tabla-caja pry-caja"><div class="pry-caja-cab"><h3>Datos del proyecto</h3>' + (editable() ? '<button class="ic-btn sec chico" id="bEd">Editar</button>' : '') + '</div><dl class="pry-dl">' +
        dato('Cliente', esc(p.cliente)) + dato('Contacto', esc(p.contacto)) + dato('Líder IC', esc(p.lider)) + dato('Orden de Servicio', esc([p.os_numero, PRY.textoFecha(PRY.dia(p.os_fecha), true)].filter(Boolean).join(' · '))) +
        dato('Escenario', esc(p.escenario)) + dato('Plantillas', esc(p.plantillas)) + dato('Inicio', esc(PRY.textoFecha(p.inicio, true))) + dato('Línea base', p.linea_base_fecha ? esc(PRY.textoFecha(PRY.dia(p.linea_base_fecha), true)) + (p.version_plan ? ' · plan v' + esc(p.version_plan) : '') : 'Sin aprobar') +
        dato('Salud', App.tagSalud(p.salud) + (p.explicacion_salud ? ' ' + esc(p.explicacion_salud) : '')) + dato('Carpeta', p.carpeta ? (/^https?:/.test(p.carpeta) ? '<a href="' + esc(p.carpeta) + '" target="_blank" rel="noopener">Abrir carpeta ↗</a>' : esc(p.carpeta)) : '') +
        dato('Alcance', esc(p.alcance || p.descripcion)) + dato('Exclusiones', esc(p.exclusiones)) + dato('Supuestos', esc(p.supuestos)) + dato('Entregables', esc(p.entregables)) + dato('Participantes', esc(p.participantes)) + '</dl></div>' +
      '<div><div class="ic-tabla-caja pry-caja"><h3>Vencidas</h3>' + lista(venc, 'No hay tareas vencidas.') + '</div><div class="ic-tabla-caja pry-caja"><h3>Vencen en los próximos 7 días</h3>' + lista(prox, 'Nada vence en los próximos 7 días.') + '</div></div></div>';
    d.querySelectorAll('tr[data-t]').forEach((tr) => { tr.onclick = () => editarTarea(porId(tr.dataset.t), c); });
    const b = d.querySelector('#bEd'); if (b) b.onclick = () => editarProyecto(c);
  }

  function editarProyecto(c) {
    const p = S.p;
    U.modal('Editar ' + p.Title, '<form class="ic-form" id="fE"><div class="ic-campos">' +
      U.campo({ name: 'nombre', label: 'Nombre', valor: p.nombre, req: true, c: 'c12' }) +
      U.campo({ name: 'estado', label: 'Estado', t: 'select', op: CFG.estadosProyecto.map((x) => [x, x]), valor: p.estado, vacio: false, c: 'c4' }) +
      U.campo({ name: 'salud', label: 'Salud', t: 'select', op: CFG.salud.map((x) => [x, x]), valor: p.salud || 'Normal', vacio: false, c: 'c4' }) +
      U.campo({ name: 'lider_email', label: 'Líder IC', t: 'select', op: PRY.D.personas.map((x) => [x.email, x.nombre]), valor: p.lider_email, vacio: false, c: 'c4' }) +
      U.campo({ name: 'explicacion_salud', label: 'Explicación de la salud', valor: p.explicacion_salud, c: 'c12' }) +
      U.campo({ name: 'os_numero', label: 'N° Orden de Servicio', valor: p.os_numero, c: 'c4' }) + U.campo({ name: 'os_fecha', label: 'Fecha OS', t: 'date', valor: PRY.dia(p.os_fecha), c: 'c4' }) +
      U.campo({ name: 'carpeta', label: 'Carpeta (enlace)', valor: p.carpeta, c: 'c4' }) +
      ['alcance', 'exclusiones', 'supuestos', 'entregables', 'participantes'].map((k) => U.campo({ name: k, label: k[0].toUpperCase() + k.slice(1), t: 'textarea', filas: 2, valor: p[k] || (k === 'alcance' ? p.descripcion : ''), c: 'c6' })).join('') +
      U.campo({ name: 'comentario', label: 'Comentario para la bitácora', c: 'c12' }) + '</div>' +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="eNo">Cancelar</button><button class="ic-btn" id="eOk">Guardar</button></div></form>', (cu) => {
      const f = cu.querySelector('#fE'); cu.querySelector('#eNo').onclick = U.cerrarModal;
      f.onsubmit = async (e) => {
        e.preventDefault(); const v = U.leerForm(f);
        if (!U.marcarErrores(f, v.nombre ? {} : { nombre: 'Obligatorio' })) return;
        const campos = {}, cambios = [];
        ['nombre', 'estado', 'salud', 'lider_email', 'explicacion_salud', 'os_numero', 'os_fecha', 'carpeta', 'alcance', 'exclusiones', 'supuestos', 'entregables', 'participantes'].forEach((k) => {
          const antes = k === 'os_fecha' ? PRY.dia(p[k]) : String(p[k] == null ? '' : p[k]);
          if (v[k] !== antes) { campos[k] = v[k]; cambios.push({ campo: k, antes, despues: v[k] }); }
        });
        if (campos.lider_email) { const l = PRY.persona(campos.lider_email); campos.lider = l ? l.nombre : campos.lider_email; }
        if (!cambios.length) { U.cerrarModal(); return; }
        try {
          await U.conCarga(cu.querySelector('#eOk'), async () => {
            await G.actualizar('PRY_Proyectos', p._id, campos);
            await PRY.bitacora(p.Title, '', cambios, v.comentario, '', App.usuario.nombre);
          });
          Object.assign(p, campos); U.cerrarModal(); U.aviso('Proyecto actualizado', 'ok'); recargar(c);
        } catch (e2) { U.aviso(U.mensajeError(e2), 'err', 8000); }
      };
    });
  }

  // =====================================================================
  // CRONOGRAMA
  // =====================================================================
  function enVentana(t, w) {
    if (!w) return true;
    if (PRY.esFase(t)) return false;
    if (w === 'vencidas') return PRY.vencida(t, S.base);
    if (PRY.cerrada(t)) return false;
    const h = PRY.hoy();
    if (w === 'hoy') return t.inicio_plan <= h && t.fin_plan >= h;
    const lim = PRY.sumar(h, Number(w));
    return t.fin_plan >= h && t.fin_plan <= lim || t.inicio_plan >= h && t.inicio_plan <= lim;
  }
  function cronograma(d, c) {
    const F = S.f, fases = S.tareas.filter(PRY.esFase);
    const resp = Array.from(new Set(S.tareas.map((t) => t.responsable).filter(Boolean))).sort();
    const sel = (id, todos, op, v) => '<select id="' + id + '"><option value="">' + todos + '</option>' + op.map((o) => '<option value="' + esc(o[0]) + '"' + (o[0] === v ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
    d.innerHTML = '<div class="pry-ventanas">' + [['', 'Todas']].concat(CFG.ventanas).map((w) => '<button class="pry-chip' + (F.ventana === w[0] ? ' on' : '') + '" data-w="' + w[0] + '">' + w[1] + '</button>').join('') + '</div>' +
      '<div class="ic-filtros"><div class="ic-buscar"><input type="search" id="cq" placeholder="Buscar tarea…" value="' + esc(F.q) + '"></div>' +
      sel('cR', 'Todo responsable', [['-', 'Sin responsable']].concat(resp.map((r) => [r, r])), F.resp) + sel('cO', 'Toda organización', CFG.organizaciones.map((x) => [x, x]), F.org) +
      sel('cF', 'Todas las fases', fases.map((x) => [x.tarea_id, x.actividad]), F.fase) + sel('cE', 'Todo estado', CFG.estadosTarea.map((x) => [x, x]), F.estado) + sel('cS', 'Toda salud', CFG.salud.map((x) => [x, x]), F.salud) +
      '<label class="ic-check"><input type="checkbox" id="cNA"' + (F.ocultarNA ? ' checked' : '') + '> <span>Ocultar «No aplica»</span></label>' +
      '<span class="espacio" style="flex:1"></span><button class="ic-btn sec chico" id="cPl">Plegar / desplegar fases</button>' +
      (editable() ? '<button class="ic-btn sec chico" id="cRec">Recalcular fechas</button><button class="ic-btn chico" id="cNu">+ Tarea propia</button>' : '') + '</div><div id="cT"></div>';
    const pintarT = () => { d.querySelector('#cT').innerHTML = tablaGantt(); enlazar(); };
    function enlazar() {
      d.querySelectorAll('tr[data-fase]').forEach((tr) => { tr.onclick = () => { S.plegadas[tr.dataset.fase] = !S.plegadas[tr.dataset.fase]; pintarT(); }; });
      d.querySelectorAll('tr[data-t]').forEach((tr) => { tr.onclick = () => editarTarea(porId(tr.dataset.t), c); });
    }
    d.querySelectorAll('[data-w]').forEach((b) => { b.onclick = () => { F.ventana = b.dataset.w; d.querySelectorAll('[data-w]').forEach((x) => x.classList.toggle('on', x === b)); pintarT(); }; });
    d.querySelector('#cq').oninput = (e) => { F.q = e.target.value; pintarT(); };
    [['cR', 'resp'], ['cO', 'org'], ['cF', 'fase'], ['cE', 'estado'], ['cS', 'salud']].forEach((x) => { d.querySelector('#' + x[0]).onchange = (e) => { F[x[1]] = e.target.value; pintarT(); }; });
    d.querySelector('#cNA').onchange = (e) => { F.ocultarNA = e.target.checked; pintarT(); };
    d.querySelector('#cPl').onclick = () => { const todas = fases.every((f) => S.plegadas[f.tarea_id]); fases.forEach((f) => { S.plegadas[f.tarea_id] = !todas; }); pintarT(); };
    if (editable()) { d.querySelector('#cRec').onclick = () => recalcular(c); d.querySelector('#cNu').onclick = () => tareaPropia(c); }
    pintarT();
  }

  function tablaGantt() {
    const F = S.f, q = U.norm(F.q);
    const filtra = F.q || F.ventana || F.resp || F.org || F.estado || F.salud;
    const pasa = (t) => (!F.ocultarNA || t.estado !== 'No aplica') && enVentana(t, F.ventana) &&
      (!F.resp || (F.resp === '-' ? !t.responsable : t.responsable === F.resp)) && (!F.org || t.organizacion === F.org) && (!F.estado || t.estado === F.estado) && (!F.salud || t.salud === F.salud) &&
      (!q || U.norm([t.tarea_id, t.actividad, t.responsable, t.descripcion].join(' ')).indexOf(q) >= 0);
    // Rango del Gantt
    const fechas = []; S.tareas.forEach((t) => { if (t.inicio_plan) fechas.push(t.inicio_plan, t.fin_plan); if (t.fin_real) fechas.push(t.fin_real); });
    if (S.base) Object.values(S.base).forEach((b) => { if (b.i) fechas.push(b.i, b.f); });
    fechas.sort(); const g0 = fechas[0], g1 = fechas[fechas.length - 1];
    const totalDias = g0 ? Math.max(1, (new Date(g1) - new Date(g0)) / 864e5 + 1) : 1;
    const pos = (s) => ((new Date(s) - new Date(g0)) / 864e5) / totalDias * 100;
    const barra = (t) => {
      if (!g0 || !t.inicio_plan) return '';
      const b = S.base && S.base[t.tarea_id], cls = PRY.esFase(t) ? 'fase' : t.estado === 'Completada' ? 'ok' : PRY.esNA(t) ? 'na' : PRY.vencida(t, S.base) ? 'err' : t.salud === 'Bloqueada' ? 'err' : t.salud === 'En riesgo' ? 'warn' : '';
      const ancho = (a, z) => Math.max(0.6, pos(z) - pos(a) + 100 / totalDias);
      return '<div class="pry-g">' + (b && b.i ? '<i class="base" style="left:' + pos(b.i) + '%;width:' + ancho(b.i, b.f) + '%"></i>' : '') +
        '<i class="plan ' + cls + '" style="left:' + pos(t.inicio_plan) + '%;width:' + ancho(t.inicio_plan, t.fin_plan) + '%">' + (!PRY.esFase(t) && t.porcentaje && t.estado !== 'Completada' ? '<b style="width:' + Math.min(100, t.porcentaje) + '%"></b>' : '') + '</i>' +
        (t.tipo === 'Hito' ? '<i class="hito" style="left:' + pos(t.fin_plan) + '%"></i>' : '') + '</div>';
    };
    const h = PRY.hoy(), lineaHoy = g0 && h >= g0 && h <= g1 ? '<i class="hoy" style="left:' + pos(h) + '%"></i>' : '';
    const fila = (t) => {
      const at = PRY.atraso(t, S.base);
      return '<tr data-t="' + esc(t.tarea_id) + '" class="' + (PRY.esNA(t) ? 'pry-na' : '') + '"><td class="id">' + esc(t.tarea_id) + '</td><td class="act">' + esc(t.actividad) + (t.tipo !== 'Tarea' ? ' <span class="pry-tag gris">' + esc(t.tipo) + '</span>' : '') + (t.propia === 'Sí' ? ' <span class="pry-tag azul">propia</span>' : '') + App.prog.etiqueta(t.tarea_id) +
        (t.estado === 'No aplica' ? '<span class="sec">No aplica: ' + esc(t.motivo_no_aplica || '') + '</span>' : '') + '</td><td>' + esc(t.responsable || '') + '<span class="sec">' + esc(t.organizacion || '') + '</span></td>' +
        '<td class="num">' + esc(t.duracion == null ? '—' : t.duracion) + (t.estimada === 'Sí' ? '<span class="sec">estimada</span>' : '') + '</td><td>' + esc(PRY.textoFecha(t.inicio_plan)) + '</td><td>' + esc(PRY.textoFecha(t.fin_plan)) + '</td>' +
        '<td class="num">' + (PRY.esNA(t) ? '' : t.estado === 'Completada' ? 100 : t.porcentaje) + '</td><td><span class="pry-est ' + U.norm(t.estado).replace(/\s+/g, '-') + '">' + esc(t.estado) + '</span>' + (t.salud !== 'Normal' ? ' ' + App.tagSalud(t.salud) : '') + '</td>' +
        '<td class="num">' + (at ? '<b class="err">' + at + '</b>' : '') + '</td><td class="gantt">' + lineaHoy + barra(t) + '</td></tr>';
    };
    let html = '', n = 0;
    const fases = S.tareas.filter(PRY.esFase), sueltas = S.tareas.filter((t) => !PRY.esFase(t) && !porId(t.id_padre));
    fases.forEach((f) => {
      if (F.fase && F.fase !== f.tarea_id) return;
      const hs = hijos(f).filter((t) => !PRY.esFase(t)), vis = hs.filter(pasa);
      if (filtra && !vis.length) return;
      const av = PRY.avance(hs), pleg = S.plegadas[f.tarea_id] && !filtra;
      html += '<tr class="pry-fase" data-fase="' + esc(f.tarea_id) + '"><td class="id">' + (pleg ? '▸' : '▾') + ' ' + esc(f.tarea_id) + '</td><td class="act" colspan="5"><b>' + esc(f.actividad) + '</b> <span class="sec-in">' + vis.length + ' tarea(s) · ' + esc(f.plantilla || '') + '</span></td>' +
        '<td class="num">' + av + '</td><td colspan="2"></td><td class="gantt">' + lineaHoy + barra(f) + '</td></tr>';
      if (!pleg) vis.forEach((t) => { html += fila(t); n++; });
    });
    if (!F.fase) sueltas.filter(pasa).forEach((t) => { html += fila(t); n++; });
    const esc0 = g0 ? '<div class="pry-escala"><span>' + esc(PRY.textoFecha(g0, true)) + '</span><span>Hoy ' + esc(PRY.textoFecha(h)) + '</span><span>' + esc(PRY.textoFecha(g1, true)) + '</span></div>' : '';
    return '<div class="ic-tabla-caja pry-scroll"><table class="ic-tabla pry-crono"><thead><tr><th>ID</th><th>Actividad</th><th>Responsable</th><th class="num">Días</th><th>Inicio</th><th>Fin</th><th class="num">%</th><th>Estado</th><th class="num" title="Días hábiles de atraso contra la línea base">Atraso</th><th class="gantt">' + esc0 + '</th></tr></thead><tbody>' +
      (html || '<tr><td colspan="10"><div class="ic-vacio">No hay tareas con estos filtros.</div></td></tr>') + '</tbody></table></div>' +
      '<p class="pry-nota">' + n + ' tarea(s) visibles. Barra gris claro = línea base · barra de color = plan vigente (rojo vencida o bloqueada, dorado en riesgo, verde completada) · línea azul = hoy. Clic en una fase para plegarla; clic en una tarea para actualizarla.</p>';
  }

  // ---------- Guardado de una tarea con bitácora ----------
  const ETIQ = { responsable: 'Responsable', organizacion: 'Organización', duracion: 'Duración', predecesoras: 'Predecesoras', inicio_plan: 'Inicio plan', fin_plan: 'Fin plan', inicio_real: 'Inicio real', fin_real: 'Fin real',
    porcentaje: '% avance', estado: 'Estado', salud: 'Salud', explicacion_salud: 'Explicación de salud', evidencia: 'Evidencia', observaciones: 'Observaciones', motivo_no_aplica: 'Motivo No aplica', actividad: 'Actividad', criterio: 'Criterio de cumplimiento' };
  async function guardarTareas(cambiosPorTarea, comentario, evidencia) {
    // cambiosPorTarea: [{ t, campos:{...} }]
    await PRY.enParalelo(cambiosPorTarea, 4, async (x) => {
      const f = {}; Object.keys(x.campos).forEach((k) => { const v = x.campos[k]; f[k] = v === '' || v == null ? null : v; });
      await G.actualizar('PRY_Tareas', x.t._id, f);
      if (x.registrar !== false) await PRY.bitacora(S.p.Title, x.t.tarea_id, Object.keys(x.campos).filter((k) => k !== 'responsable_email').map((k) => ({ campo: ETIQ[k] || k, antes: x.antes[k], despues: x.campos[k] })), comentario, evidencia, App.usuario.nombre);
      Object.assign(x.t, x.campos);
    });
  }

  function editarTarea(t, c) {
    if (!t || PRY.esFase(t)) return;
    const puede = puedeTarea(t), lider = editable(), opResp = PRY.D.personas.map((x) => [x.email, x.nombre]);
    const preds = PRY.listaPred(t).map((id) => { const p = porId(id); return esc(id) + (p ? ' · ' + esc(p.actividad) : ' · <b class="err">no existe</b>'); }).join('<br>');
    const b = S.base && S.base[t.tarea_id];
    U.modal(t.tarea_id + ' · ' + t.actividad, '<form class="ic-form" id="fT">' +
      '<div class="pry-ficha"><span>' + esc(t.plantilla ? t.plantilla + ' v' + t.plantilla_version : 'Tarea propia') + ' · ' + esc(t.tipo) + (t.obligatoria === 'Sí' ? ' · obligatoria' : '') + '</span>' +
        (t.descripcion ? '<p>' + esc(t.descripcion) + '</p>' : '') + (t.criterio ? '<p><b>Criterio de cumplimiento:</b> ' + esc(t.criterio) + '</p>' : '') +
        (preds ? '<p><b>Predecesoras:</b><br>' + preds + '</p>' : '') + (b ? '<p><b>Línea base:</b> ' + esc(PRY.textoFecha(b.i, true) + ' → ' + PRY.textoFecha(b.f, true) + ' · ' + (b.d == null ? '—' : b.d) + ' días') + '</p>' : '') + '</div>' +
      App.prog.seccion(t, editable()) +
      (!puede ? '<p class="pry-nota">Solo lectura: actualizan esta tarea el líder del proyecto, los administradores y su responsable.</p>' : '') +
      '<fieldset' + (puede ? '' : ' disabled') + '><div class="ic-campos">' +
      U.campo({ name: 'estado', label: 'Estado', t: 'select', op: CFG.estadosTarea.map((x) => [x, x]), valor: t.estado, vacio: false, c: 'c4' }) +
      U.campo({ name: 'porcentaje', label: '% avance', t: 'number', valor: t.porcentaje, c: 'c4' }) +
      U.campo({ name: 'salud', label: 'Salud', t: 'select', op: CFG.salud.map((x) => [x, x]), valor: t.salud, vacio: false, c: 'c4' }) +
      U.campo({ name: 'motivo_no_aplica', label: 'Motivo de «No aplica» o «Cancelada»', valor: t.motivo_no_aplica, c: 'c12' }) +
      U.campo({ name: 'explicacion_salud', label: 'Explicación (riesgo o bloqueo)', valor: t.explicacion_salud, c: 'c12' }) +
      U.campo({ name: 'inicio_real', label: 'Inicio real', t: 'date', valor: t.inicio_real, c: 'c3' }) + U.campo({ name: 'fin_real', label: 'Fin real', t: 'date', valor: t.fin_real, c: 'c3' }) +
      U.campo({ name: 'evidencia', label: 'Evidencia (enlace o referencia)', valor: t.evidencia, c: 'c6' }) +
      U.campo({ name: 'observaciones', label: 'Observaciones', t: 'textarea', filas: 2, valor: t.observaciones, c: 'c12' }) + '</div></fieldset>' +
      (lider ? '<fieldset><legend>Planeación (líder del proyecto)</legend><div class="ic-campos">' +
        U.campo({ name: 'responsable_email', label: 'Responsable', t: 'select', op: opResp, valor: t.responsable_email, vacio: 'Sin asignar', c: 'c6' }) +
        U.campo({ name: 'organizacion', label: 'Organización', t: 'select', op: CFG.organizaciones.map((x) => [x, x]), valor: t.organizacion, c: 'c6' }) +
        U.campo({ name: 'duracion', label: 'Duración (días hábiles)', t: 'number', valor: t.duracion == null ? '' : t.duracion, c: 'c3', ayuda: t.estimada === 'Sí' ? 'Duración estimada en la plantilla' : 'Referencia de la plantilla' }) +
        U.campo({ name: 'predecesoras', label: 'Predecesoras (IDs separados por ;)', valor: t.predecesoras, c: 'c6' }) +
        U.campo({ name: 'inicio_plan', label: 'Inicio plan', t: 'date', valor: t.inicio_plan, c: 'c3', ayuda: PRY.listaPred(t).length ? 'Lo fijan las predecesoras' : 'Sin predecesoras: puede fijarse' }) + '</div></fieldset>' : '') +
      (puede ? U.campo({ name: 'comentario', label: 'Comentario para la bitácora', c: 'c12' }) : '') +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="tHis">Historial</button><span style="flex:1"></span><button type="button" class="ic-btn sec" id="tNo">Cerrar</button>' + (puede ? '<button class="ic-btn" id="tOk">Guardar</button>' : '') + '</div></form>', (cu) => {
      const f = cu.querySelector('#fT');
      App.prog.montar(cu, t, S.p, () => recargar(c));
      cu.querySelector('#tNo').onclick = U.cerrarModal;
      cu.querySelector('#tHis').onclick = () => { U.cerrarModal(); S.filtroBit = t.tarea_id; location.hash = '#p/' + S.p.Title + '/bitacora'; };
      const est = f.querySelector('[name=estado]'), pct = f.querySelector('[name=porcentaje]');
      const motivo = f.querySelector('[name=motivo_no_aplica]').closest('.ic-campo'), expl = f.querySelector('[name=explicacion_salud]').closest('.ic-campo');
      const ver = () => { motivo.hidden = !PRY.esNA({ estado: est.value }); expl.hidden = f.querySelector('[name=salud]').value === 'Normal' && !t.explicacion_salud; };
      est.onchange = () => {
        if (est.value === 'Completada') { pct.value = 100; if (!f.querySelector('[name=fin_real]').value) f.querySelector('[name=fin_real]').value = PRY.hoy(); }
        if ((est.value === 'En curso' || est.value === 'Completada') && !f.querySelector('[name=inicio_real]').value) f.querySelector('[name=inicio_real]').value = PRY.hoy();
        ver();
      };
      f.querySelector('[name=salud]').onchange = ver; ver();
      if (!puede) return;
      f.onsubmit = async (e) => {
        e.preventDefault();
        const v = U.leerForm(f), err = {};
        if (PRY.esNA({ estado: v.estado }) && !v.motivo_no_aplica) err.motivo_no_aplica = 'Escriba el motivo';
        const n = Number(v.porcentaje);
        if (v.porcentaje !== '' && (isNaN(n) || n < 0 || n > 100)) err.porcentaje = 'Entre 0 y 100';
        if (v.fin_real && v.inicio_real && v.fin_real < v.inicio_real) err.fin_real = 'No puede ser antes del inicio real';
        if (v.fin_real && v.fin_real > PRY.hoy()) err.fin_real = 'No puede ser una fecha futura';
        if (lider && v.duracion !== '' && (isNaN(Number(v.duracion)) || Number(v.duracion) < 0)) err.duracion = 'Número de días ≥ 0';
        if (lider) {
          const pr = String(v.predecesoras || '').split(/[;,\s]+/).filter(Boolean).join(';');
          const prueba = S.tareas.map((x) => x === t ? Object.assign({}, x, { predecesoras: pr }) : x);
          const ed = PRY.validarDependencias(prueba).filter((m) => m.indexOf(t.tarea_id) >= 0 || /ciclo/.test(m));
          if (ed.length) err.predecesoras = ed[0];
          if (porId(pr.split(';').find((x) => porId(x) && PRY.esFase(porId(x))))) err.predecesoras = 'Las predecesoras deben ser tareas, no fases';
          v.predecesoras = pr;
        }
        if (!U.marcarErrores(f, err)) return;
        const campos = {}, antes = {};
        const poner = (k, nuevo) => { const a = t[k] == null ? '' : t[k]; if (String(nuevo) !== String(a)) { campos[k] = nuevo; antes[k] = a; } };
        poner('estado', v.estado); poner('porcentaje', v.estado === 'Completada' ? 100 : Number(v.porcentaje) || 0); poner('salud', v.salud);
        poner('motivo_no_aplica', PRY.esNA({ estado: v.estado }) ? v.motivo_no_aplica : t.motivo_no_aplica || '');
        ['explicacion_salud', 'inicio_real', 'fin_real', 'evidencia', 'observaciones'].forEach((k) => poner(k, v[k]));
        let replan = false;
        if (lider) {
          poner('responsable_email', v.responsable_email);
          if (campos.responsable_email !== undefined) { const pe = PRY.persona(v.responsable_email); poner('responsable', pe ? pe.nombre : ''); }
          poner('organizacion', v.organizacion);
          const dur = v.duracion === '' ? '' : Number(v.duracion);
          if (String(dur) !== String(t.duracion == null ? '' : t.duracion)) { campos.duracion = dur === '' ? null : dur; antes.duracion = t.duracion == null ? '' : t.duracion; replan = true; }
          if (v.predecesoras !== (t.predecesoras || '')) { campos.predecesoras = v.predecesoras; antes.predecesoras = t.predecesoras || ''; replan = true; }
          if (v.inicio_plan && v.inicio_plan !== t.inicio_plan) { campos.inicio_plan = PRY.sigHabil(v.inicio_plan); antes.inicio_plan = t.inicio_plan; replan = true; }
        }
        if (PRY.esNA({ estado: v.estado }) !== PRY.esNA(t)) replan = true;     // una tarea que deja de aplicar ya no ocupa el cronograma de su fase
        if (!Object.keys(campos).length) { U.cerrarModal(); return; }
        try {
          await U.conCarga(cu.querySelector('#tOk'), async () => {
            await guardarTareas([{ t, campos, antes }], v.comentario, v.evidencia);
            if (replan) await reprogramar('Reprogramación por cambio en ' + t.tarea_id);
            await sincronizarProyecto();
          });
          U.cerrarModal(); U.aviso(t.tarea_id + ' actualizada', 'ok'); App.vistas.proyecto(c);
        } catch (e2) { U.aviso(U.mensajeError(e2), 'err', 8000); }
      };
    });
  }

  // Recalcula fechas plan de todo el proyecto y guarda solo las que cambian (una línea de bitácora por tarea movida)
  async function reprogramar(motivo) {
    const copia = S.tareas.map((t) => Object.assign({}, t));
    const r = PRY.programar(copia, S.p.inicio);
    if (r.error) throw new Error('Hay dependencias inválidas: ' + PRY.validarDependencias(copia)[0]);
    const lote = r.cambios.map((x) => { const t = porId(x.t.tarea_id); return { t, campos: { inicio_plan: x.despues[0], fin_plan: x.despues[1] }, antes: { inicio_plan: t.inicio_plan, fin_plan: t.fin_plan } }; });
    if (!lote.length) return 0;
    await guardarTareas(lote.map((x) => Object.assign(x, { registrar: false })), motivo, '');
    await PRY.bitacora(S.p.Title, '', [{ campo: 'Fechas plan recalculadas', antes: '', despues: lote.length + ' tarea(s): ' + lote.slice(0, 20).map((x) => x.t.tarea_id).join(', ') + (lote.length > 20 ? '…' : '') }], motivo, '', App.usuario.nombre);
    return lote.length;
  }
  async function recalcular(c) {
    const err = PRY.validarDependencias(S.tareas);
    if (err.length) { U.aviso('Corrija primero: ' + err.slice(0, 2).join('; '), 'err', 9000); return; }
    try { const n = await reprogramar('Recálculo manual desde el inicio del proyecto'); await sincronizarProyecto(); U.aviso(n ? n + ' tarea(s) con fechas nuevas' : 'Las fechas ya estaban al día', 'ok'); App.vistas.proyecto(c); }
    catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); }
  }

  function tareaPropia(c) {
    const fases = S.tareas.filter(PRY.esFase);
    U.modal('Agregar tarea propia del proyecto', '<form class="ic-form" id="fN"><div class="ic-campos">' +
      U.campo({ name: 'id_padre', label: 'Fase', t: 'select', op: fases.map((x) => [x.tarea_id, x.tarea_id + ' · ' + x.actividad]), req: true, c: 'c6' }) +
      U.campo({ name: 'tipo', label: 'Tipo', t: 'select', op: CFG.tipos.filter((x) => x !== 'Fase').map((x) => [x, x]), valor: 'Tarea', vacio: false, c: 'c3' }) +
      U.campo({ name: 'duracion', label: 'Duración (días hábiles)', t: 'number', valor: 1, c: 'c3' }) +
      U.campo({ name: 'actividad', label: 'Actividad', req: true, c: 'c12' }) + U.campo({ name: 'descripcion', label: 'Descripción', t: 'textarea', filas: 2, c: 'c12' }) +
      U.campo({ name: 'responsable_email', label: 'Responsable', t: 'select', op: PRY.D.personas.map((x) => [x.email, x.nombre]), vacio: 'Sin asignar', c: 'c6' }) +
      U.campo({ name: 'organizacion', label: 'Organización', t: 'select', op: CFG.organizaciones.map((x) => [x, x]), valor: 'IC', c: 'c6' }) +
      U.campo({ name: 'predecesoras', label: 'Predecesoras (IDs separados por ;)', c: 'c6' }) + U.campo({ name: 'criterio', label: 'Criterio de cumplimiento', c: 'c6' }) +
      U.campo({ name: 'comentario', label: 'Motivo / comentario para la bitácora', req: true, c: 'c12' }) + '</div>' +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="nNo">Cancelar</button><button class="ic-btn" id="nOk">Agregar</button></div></form>', (cu) => {
      const f = cu.querySelector('#fN'); cu.querySelector('#nNo').onclick = U.cerrarModal;
      f.onsubmit = async (e) => {
        e.preventDefault(); const v = U.leerForm(f), err = {};
        if (!v.id_padre) err.id_padre = 'Elija la fase';
        if (!v.actividad) err.actividad = 'Obligatorio';
        if (!v.comentario) err.comentario = 'Explique por qué se agrega';
        const n = S.tareas.filter((x) => /^PRO-\d+$/.test(x.tarea_id)).map((x) => Number(x.tarea_id.slice(4))).reduce((a, b) => Math.max(a, b), 0) + 1;
        const t = { tarea_id: 'PRO-' + PRY.pad(n, 3), id_padre: v.id_padre, fase: (porId(v.id_padre) || {}).actividad || '', actividad: v.actividad, tipo: v.tipo, descripcion: v.descripcion,
          organizacion: v.organizacion, responsable_email: v.responsable_email, responsable: (PRY.persona(v.responsable_email) || {}).nombre || '', duracion: v.duracion === '' ? null : Number(v.duracion), estimada: 'Sí',
          predecesoras: String(v.predecesoras || '').split(/[;,\s]+/).filter(Boolean).join(';'), criterio: v.criterio, estado: 'No iniciada', salud: 'Normal', porcentaje: 0, propia: 'Sí', visibilidad: 'Compartida', obligatoria: 'No' };
        const ult = hijos(porId(v.id_padre) || {}).map((x) => x.orden).reduce((a, b) => Math.max(a, b), (porId(v.id_padre) || {}).orden || 0);
        t.orden = ult + 0.5;
        const ed = PRY.validarDependencias(S.tareas.concat([t]));
        if (ed.length) err.predecesoras = ed[0];
        if (!U.marcarErrores(f, err)) return;
        try {
          await U.conCarga(cu.querySelector('#nOk'), async () => {
            // Reordena la numeración para que la nueva quede al final de su fase
            const fila = App.filaTarea(S.p.Title, t); fila.orden = Math.round(t.orden * 10) / 10;
            await G.crear('PRY_Tareas', fila);
            await PRY.bitacora(S.p.Title, t.tarea_id, [{ campo: 'Tarea agregada', antes: '', despues: t.actividad }], v.comentario, '', App.usuario.nombre);
            await cargar(S.id);
            await reprogramar('Tarea propia ' + t.tarea_id + ' agregada');
            await sincronizarProyecto();
          });
          U.cerrarModal(); U.aviso(t.tarea_id + ' agregada', 'ok'); App.vistas.proyecto(c);
        } catch (e2) { U.aviso(U.mensajeError(e2), 'err', 8000); }
      };
    });
  }

  // =====================================================================
  // LÍNEA BASE Y VERSIONES DEL PLAN
  // =====================================================================
  const foto = () => { const o = {}; S.tareas.forEach((t) => { if (!PRY.esFase(t)) o[t.tarea_id] = { i: t.inicio_plan, f: t.fin_plan, d: t.duracion, e: t.estado === 'No aplica' ? 'NA' : undefined }; }); return o; };
  function linea(d, c) {
    const v0 = S.planes.find((x) => x.version === 0), ult = S.planes[S.planes.length - 1];
    const act = S.tareas.filter((t) => !PRY.esFase(t) && !PRY.esNA(t));
    const faltan = act.filter((t) => !t.inicio_plan || !t.fin_plan), sinResp = act.filter((t) => !t.responsable && t.organizacion !== 'Cliente' && t.organizacion !== 'Fabricante' && t.organizacion !== 'Tercero');
    const dep = PRY.validarDependencias(S.tareas);
    d.innerHTML = '<div class="ic-tabla-caja pry-caja"><h3>' + (v0 ? 'Línea base aprobada' : 'Aprobar la línea base') + '</h3>' +
      (v0 ? '<p>Versión 0 aprobada por <b>' + esc(v0.aprobador) + '</b> el ' + esc(U.fmt.fechaHora(v0.fecha)) + '. La línea base no se modifica: el atraso de cada tarea se mide contra ella. Los cambios aprobados del plan quedan como versiones nuevas.</p>'
        : '<p>La línea base congela las fechas y duraciones del plan (versión 0). Basta la aprobación de <b>uno</b> de: ' + CFG.aprobadores.map((a) => esc(a.nombre + ' (' + a.cargo + ')')).join(' o ') + '. Al aprobarla el proyecto pasa a «En ejecución».</p>' +
          '<ul class="pry-check">' + '<li class="' + (dep.length ? 'err' : 'ok') + '">' + (dep.length ? 'Dependencias con error: ' + esc(dep.slice(0, 3).join('; ')) : 'Dependencias válidas (sin ciclos)') + '</li>' +
          '<li class="' + (faltan.length ? 'err' : 'ok') + '">' + (faltan.length ? faltan.length + ' tarea(s) sin fechas: use «Recalcular fechas» en el cronograma' : 'Todas las tareas que aplican tienen fechas') + '</li>' +
          '<li class="' + (sinResp.length ? 'warn' : 'ok') + '">' + (sinResp.length ? sinResp.length + ' tarea(s) de IC sin responsable asignado (se puede aprobar, conviene asignarlos)' : 'Las tareas de IC tienen responsable') + '</li></ul>') +
      (editable() || (App.aprobador() && ['Cerrado', 'Cancelado'].indexOf(S.p.estado) < 0) ? '<div class="ic-acciones">' + (v0 ? '<button class="ic-btn" id="bVer">Registrar nueva versión del plan</button>' : '<button class="ic-btn" id="bBase"' + (dep.length || faltan.length ? ' disabled' : '') + '>Aprobar línea base</button>') + '</div>' : '') + '</div>' +
      (S.planes.length ? '<div class="ic-tabla-caja"><table class="ic-tabla pry-mini"><thead><tr><th>Versión</th><th>Fecha</th><th>Aprobó</th><th>Motivo</th><th class="num">Tareas</th><th>Fin del plan</th></tr></thead><tbody>' +
        S.planes.map((pl) => { let o = {}; try { o = JSON.parse(pl.datos || '{}'); } catch (e) { /* datos dañados */ } const fin = Object.values(o).map((x) => x.f).filter(Boolean).sort().pop();
          return '<tr><td><b>' + (pl.version === 0 ? 'Línea base (v0)' : 'v' + pl.version) + '</b></td><td>' + esc(U.fmt.fechaHora(pl.fecha)) + '</td><td>' + esc(pl.aprobador) + '</td><td>' + esc(pl.motivo || '') + '</td><td class="num">' + Object.keys(o).length + '</td><td>' + esc(PRY.textoFecha(fin, true)) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '');
    const b = d.querySelector('#bBase') || d.querySelector('#bVer');
    if (b) b.onclick = () => aprobarPlan(c, v0 ? (ult.version + 1) : 0);
  }

  function aprobarPlan(c, version) {
    const yo = CFG.aprobadores.find((a) => a.email === App.usuario.email);
    U.modal(version ? 'Nueva versión del plan (v' + version + ')' : 'Aprobar línea base', '<form class="ic-form" id="fA"><div class="ic-campos">' +
      U.campo({ name: 'aprobador', label: 'Aprobó', t: 'select', op: CFG.aprobadores.map((a) => [a.email, a.nombre + ' · ' + a.cargo]), valor: yo ? yo.email : '', req: true, c: 'c6' }) +
      U.campo({ name: 'evidencia', label: 'Evidencia (si aprobó otra persona: correo, acta…)', c: 'c6' }) +
      U.campo({ name: 'motivo', label: version ? 'Motivo del cambio de plan' : 'Comentarios', t: 'textarea', filas: 2, req: !!version, c: 'c12' }) + '</div>' +
      '<p class="pry-nota">Se guarda una foto de las fechas y duraciones de ' + S.tareas.filter((t) => !PRY.esFase(t)).length + ' tareas.' + (version ? ' La línea base (v0) no cambia.' : '') + '</p>' +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="aNo">Cancelar</button><button class="ic-btn" id="aOk">Aprobar</button></div></form>', (cu) => {
      const f = cu.querySelector('#fA'); cu.querySelector('#aNo').onclick = U.cerrarModal;
      f.onsubmit = async (e) => {
        e.preventDefault(); const v = U.leerForm(f), a = CFG.aprobadores.find((x) => x.email === v.aprobador), err = {};
        if (!a) err.aprobador = 'Elija quién aprobó';
        if (a && a.email !== App.usuario.email && !v.evidencia) err.evidencia = 'Registre la evidencia de la aprobación';
        if (version && !v.motivo) err.motivo = 'Explique el cambio';
        if (!U.marcarErrores(f, err)) return;
        if (S.planes.some((x) => x.version === version)) { U.aviso('Esa versión ya existe. Recargue la página.', 'warn'); return; }
        try {
          await U.conCarga(cu.querySelector('#aOk'), async () => {
            const ahora = new Date().toISOString(), n = await G.reservar('PRYA', 1), key = S.p.Title + '#v' + version;
            await G.crear('PRY_Aprobaciones', { Title: 'APR-' + PRY.pad(n, 5), proyecto_id: S.p.Title, objeto: version ? 'PLAN' : 'LINEA_BASE', objeto_id: key, aprobador: a.nombre, cargo: a.cargo, fecha_hora: ahora, decision: 'Aprobado', comentarios: v.motivo, evidencia: v.evidencia, registrado_por: App.usuario.nombre });
            await G.crear('PRY_Planes', { Title: key, proyecto_id: S.p.Title, version, fecha: ahora, aprobador: a.nombre, motivo: v.motivo, datos: JSON.stringify(foto()) });
            const campos = { version_plan: version };
            if (!version) { campos.linea_base_fecha = PRY.hoy(); if (S.p.estado === 'Planeación') campos.estado = 'En ejecución'; }
            await G.actualizar('PRY_Proyectos', S.p._id, campos);
            await PRY.bitacora(S.p.Title, '', [{ campo: version ? 'Versión del plan' : 'Línea base', antes: version ? 'v' + (version - 1) : '', despues: 'v' + version + ' aprobada por ' + a.nombre }].concat(campos.estado ? [{ campo: 'estado', antes: S.p.estado, despues: campos.estado }] : []), v.motivo, v.evidencia, App.usuario.nombre);
            Object.assign(S.p, campos);
          });
          U.cerrarModal(); U.aviso(version ? 'Versión v' + version + ' registrada' : 'Línea base aprobada. El proyecto está en ejecución.', 'ok', 7000); recargar(c);
        } catch (e2) { U.aviso(U.mensajeError(e2), 'err', 8000); }
      };
    });
  }

  // =====================================================================
  // BITÁCORA
  // =====================================================================
  async function bitacora(d) {
    d.innerHTML = '<div class="ic-vacio">Cargando bitácora…</div>';
    let L;
    try { L = await G.items('PRY_Bitacora', { filtro: "fields/proyecto_id eq '" + S.p.Title + "'", top: 5000 }); } catch (e) { d.innerHTML = '<div class="ic-alerta">' + esc(U.mensajeError(e)) + '</div>'; return; }
    L.sort((a, b) => String(b.fecha_hora).localeCompare(a.fecha_hora) || String(b.Title).localeCompare(a.Title));
    const ids = Array.from(new Set(L.map((x) => x.tarea_id).filter(Boolean))).sort();
    const fil = { t: S.filtroBit || '', q: '' }; S.filtroBit = '';
    d.innerHTML = '<div class="ic-filtros"><div class="ic-buscar"><input type="search" id="bq" placeholder="Buscar en la bitácora…"></div><select id="bt"><option value="">Todo el proyecto</option><option value="-">Solo cambios del proyecto</option>' +
      ids.map((i) => '<option' + (i === fil.t ? ' selected' : '') + '>' + esc(i) + '</option>').join('') + '</select></div><div id="bL"></div>';
    const pintarB = () => {
      const q = U.norm(fil.q), V = L.filter((x) => (!fil.t || (fil.t === '-' ? !x.tarea_id : x.tarea_id === fil.t)) && (!q || U.norm([x.campo, x.anterior, x.nuevo, x.comentario, x.usuario, x.tarea_id].join(' ')).indexOf(q) >= 0));
      d.querySelector('#bL').innerHTML = V.length ? '<div class="ic-tabla-caja pry-scroll"><table class="ic-tabla pry-mini"><thead><tr><th>Fecha y hora</th><th>Usuario</th><th>Tarea</th><th>Campo</th><th>Anterior</th><th>Nuevo</th><th>Comentario / evidencia</th></tr></thead><tbody>' +
        V.map((x) => '<tr><td>' + esc(U.fmt.fechaHora(x.fecha_hora)) + '</td><td>' + esc(x.usuario) + '</td><td>' + esc(x.tarea_id || '—') + '</td><td>' + esc(x.campo) + '</td><td>' + esc(x.anterior) + '</td><td>' + esc(x.nuevo) + '</td><td>' + esc(x.comentario || '') + (x.evidencia ? '<span class="sec">' + esc(x.evidencia) + '</span>' : '') + '</td></tr>').join('') +
        '</tbody></table></div><p class="pry-nota">' + V.length + ' registro(s). La bitácora no se edita ni se borra.</p>' : '<div class="ic-tabla-caja"><div class="ic-vacio">Sin registros.</div></div>';
    };
    d.querySelector('#bq').oninput = (e) => { fil.q = e.target.value; pintarB(); };
    d.querySelector('#bt').onchange = (e) => { fil.t = e.target.value; pintarB(); };
    pintarB();
  }
})();
