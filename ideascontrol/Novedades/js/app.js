/* =====================================================================
   APP-107 · Novedades del personal — arranque, acceso, menú y solicitudes
   Usa Programacion/js/datos.js (Ope): personal (técnicos y administrativos), festivos, fechas y ausencias.
   Es para todo el personal: los técnicos y el personal administrativo (vinculación ADMINISTRATIVO en OPE_Tecnicos).
   Roles: ADMIN (Dirección: aprueba y ve faltas) · CONSULTA (ve solicitudes y calendario)
          · TECNICO (solicita y ve las suyas). Se toman de SYS_Accesos (APP-107, o si no
          existe, del rol en la Programación APP-106) y del correo en OPE_Tecnicos.
   ===================================================================== */
const App = { usuario: null, vistas: {}, estado: {} };
App.esAdmin = () => App.usuario && App.usuario.rol === 'ADMIN';
App.esTecnico = () => App.usuario && App.usuario.rol === 'TECNICO';
const ROLES = { ADMIN: 'Dirección de Operaciones', CONSULTA: 'Consulta', TECNICO: 'Colaborador' };

(function () {
  const U = IC.ui, esc = U.esc, G = IC.graph;
  const tipoNov = (id) => TIPOS_NOV.find((t) => t.id === id) || { id, nombre: id, subtipos: [] };
  const nombreEstado = (e) => (ESTADOS_NOV.find((x) => x[0] === e) || [e, e])[1];
  App.tipoNov = tipoNov;
  App.tagEstado = (e) => '<span class="nov-estado e-' + esc(String(e || '').toLowerCase()) + '">' + esc(nombreEstado(e)) + '</span>';
  App.solicitudes = [];

  // ---------- Datos ----------
  function normal(s) { s.fecha_inicio = Ope.dia(s.fecha_inicio); s.fecha_fin = Ope.dia(s.fecha_fin || s.fecha_inicio); return s; }
  async function cargarSolicitudes() {
    const filtro = App.esTecnico() ? "fields/tecnico_id eq '" + App.usuario.tecnico.Title + "'" : null;
    App.solicitudes = (await G.items('NOV_Solicitudes', { filtro, top: 999 })).map(normal)
      .sort((a, b) => String(b.fecha_inicio).localeCompare(a.fecha_inicio) || String(b.Title).localeCompare(a.Title));
    return App.solicitudes;
  }
  App.cargarSolicitudes = cargarSolicitudes;
  function diasHabiles(desde, hasta) { const out = []; let s = desde; while (s && hasta && s <= hasta) { if (Ope.esHabil(s)) out.push(s); s = Ope.sumar(s, 1); } return out; }
  App.diasHabiles = diasHabiles;
  const porHoras = (s) => s.modalidad === 'HORAS';
  const esAdministrativo = (id) => { const t = Ope.tec(id); return !!t && t.vinculacion === Ope.ADMINISTRATIVO; };
  App.esAdministrativo = esAdministrativo;
  // Bloquea la Programación (Ausencia) solo para técnicos: el personal administrativo no se programa
  const bloquea = (s) => tipoNov(s.tipo).ausencia && !porHoras(s) && !esAdministrativo(s.tecnico_id);
  App.rango = (s) => s.fecha_inicio === s.fecha_fin || !s.fecha_fin ? Ope.textoFecha(s.fecha_inicio, true) : Ope.textoFecha(s.fecha_inicio) + ' → ' + Ope.textoFecha(s.fecha_fin);
  App.detalleTiempo = (s) => porHoras(s) ? (s.hora_inicio || '') + '–' + (s.hora_fin || '') : (s.dias_habiles ? s.dias_habiles + ' día' + (s.dias_habiles == 1 ? '' : 's') + ' hábil' + (s.dias_habiles == 1 ? '' : 'es') : '');

  // Impacto en la programación: actividades del técnico en esos días y turnos de oficina
  async function impacto(s) {
    const dias = diasHabiles(s.fecha_inicio, s.fecha_fin);
    if (!dias.length) return { dias, acts: [], turnos: [], otros: [] };
    await Ope.cargarRango(s.fecha_inicio, s.fecha_fin);
    const acts = Ope.delRango(s.fecha_inicio, s.fecha_fin).filter((a) => Ope.activa(a) && a.tecnico_id === s.tecnico_id && a.tipo !== 'AUS');
    const otros = App.solicitudes.filter((x) => x.Title !== s.Title && x.tecnico_id !== s.tecnico_id && (x.estado === 'APROBADA' || x.estado === 'SOLICITADA') && bloquea(x) &&
      x.fecha_inicio <= s.fecha_fin && x.fecha_fin >= s.fecha_inicio);
    return { dias, acts, turnos: acts.filter((a) => a.tipo === 'OFI'), otros };
  }
  App.impacto = impacto;
  function htmlImpacto(im) {
    if (!im.dias.length) return '<div class="ope-v ok">No hay días hábiles en el periodo.</div>';
    let h = im.acts.length
      ? '<div class="ope-v warn"><b>Tiene ' + im.acts.length + ' actividad' + (im.acts.length === 1 ? '' : 'es') + ' programada' + (im.acts.length === 1 ? '' : 's') + ' en esos días</b> — al aprobar quedan con ⚠ en la Programación para reprogramarlas:<ul>' +
        im.acts.map((a) => '<li>' + esc(Ope.textoFecha(a.fecha, true)) + ': ' + esc(Ope.nombreTipo(a.tipo)) + (a.cliente && a.tipo !== 'OFI' ? ' · ' + esc(a.cliente) : '') + '</li>').join('') + '</ul></div>'
      : '<div class="ope-v ok">✔ No tiene actividades programadas en esos días.</div>';
    if (im.otros.length) h += '<div class="ope-v warn"><b>Otras personas ausentes en el mismo periodo:</b> ' + esc(im.otros.map((x) => Ope.nombreTec(x.tecnico_id) + ' (' + App.rango(x) + ', ' + nombreEstado(x.estado).toLowerCase() + ')').join(' · ')) + '</div>';
    return h;
  }

  // ---------- Encabezado y menú ----------
  function pintarEncabezado() {
    const u = App.usuario;
    document.getElementById('encabezado').innerHTML =
      '<a href="#"><img class="logo" src="' + CFG.logo + '" alt="Ideas Control"></a>' +
      '<div class="app-nombre"><b>' + esc(CFG.app.nombre) + '</b><span>' + CFG.app.id + ' · v' + CFG.app.version + '</span></div><div class="espacio"></div>' +
      '<div class="ic-user">' + IC.portal.boton() + '<div class="datos"><b>' + esc(u.nombre) + '</b><span>' + esc(ROLES[u.rol]) + '</span></div>' +
      '<div class="ic-avatar" title="' + esc(u.email) + '">' + esc(u.iniciales) + '</div><button class="ic-btn sec chico" id="btnSalir">Salir</button></div>';
    document.getElementById('encabezado').hidden = false;
    document.getElementById('btnSalir').onclick = () => IC.auth.salir();
  }
  const ICO = {
    nueva: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M12 12v6M9 15h6"/></svg>',
    lista: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>',
    bandeja: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/></svg>',
    calendario: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 15h3v3H8z"/></svg>',
    reporte: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/><path d="M12 9v0"/></svg>',
    falta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>'
  };
  function menu() {
    const r = App.usuario.rol;
    const it = [];
    if (r === 'TECNICO') it.push(['nueva', 'Nueva solicitud', 'Solicite un permiso, vacaciones, licencia, reporte una incapacidad o pida un cambio de horario.', 'nueva', '']);
    if (r === 'TECNICO') it.push(['mias', 'Mis solicitudes', 'El estado de sus solicitudes y la respuesta de la Dirección.', 'lista', '']);
    if (r === 'ADMIN') it.push(['bandeja', 'Bandeja de aprobación', 'Solicitudes pendientes con su impacto en la programación. Aprobar o rechazar.', 'bandeja', '']);
    if (r !== 'TECNICO') it.push(['todas', 'Solicitudes', 'Todas las solicitudes y su estado, con filtros.', 'lista', '']);
    if (r !== 'TECNICO') it.push(['reporte', 'Reporte de novedades', 'Listado entre fechas para enviar por correo: Excel, PDF o copiar y pegar en el correo.', 'reporte', '']);
    if (r !== 'TECNICO') it.push(['calendario', 'Calendario de ausencias', 'Quién está ausente cada día del mes (aprobadas y pendientes).', 'calendario', 'teal']);
    if (r === 'ADMIN') it.push(['registrar', 'Registrar novedad', 'Registre una novedad a nombre de un colaborador (por ejemplo, una incapacidad reportada por teléfono).', 'nueva', 'teal']);
    if (r === 'ADMIN') it.push(['personal', 'Personal', 'Colaboradores que usan la app: agregue al personal administrativo (los técnicos se administran en la Programación).', 'lista', '']);
    if (r === 'ADMIN') it.push(['faltas', 'Faltas', 'Registro de faltas del personal y resumen por persona. Solo Dirección.', 'falta', 'dorado']);
    return it;
  }
  function vistaMenu(c) {
    const u = App.usuario, h = new Date().getHours();
    c.innerHTML = '<h1 class="ic-titulo">' + (h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches') + ', ' + esc(String(u.nombre).split(' ')[0]) + '</h1>' +
      '<p class="ic-subtitulo">Permisos, vacaciones, licencias, incapacidades y cambios de horario de todo el personal (técnicos y administrativos).</p>' +
      '<div class="nov-politica"><b>Política</b><p>' + esc(CFG.politica) + '</p></div>' +
      '<div id="resumen"></div><div class="ic-grid">' + menu().map((i) => '<a class="ic-card ' + i[4] + '" href="#' + i[0] + '">' + (i[0] === 'faltas' ? '<span class="ic-badge admin">Solo Dirección</span>' : '') +
        '<div class="icono">' + ICO[i[3]] + '</div><h3>' + i[1] + '</h3><p>' + i[2] + '</p>' + (i[0] === 'bandeja' ? '<span class="nov-contador" id="cPend"></span>' : '') + '</a>').join('') + '</div>' +
      '<div class="ic-pie">Ideas Control Equipos y Soluciones S.A.S. · Dirección de Operaciones · ' + esc(CFG.manual) + '</div>';
    cargarSolicitudes().then((l) => {
      const p = l.filter((s) => s.estado === 'SOLICITADA').length, el = document.getElementById('cPend');
      if (el) el.textContent = p ? p + ' pendiente' + (p === 1 ? '' : 's') : 'Sin pendientes';
      if (App.esTecnico()) {
        const prox = l.filter((s) => s.estado === 'APROBADA' && s.fecha_fin >= Ope.hoy()).slice(-3);
        if (prox.length) document.getElementById('resumen').innerHTML = '<div class="ic-alerta chica">Próximas ausencias aprobadas: ' + prox.map((s) => esc(tipoNov(s.tipo).nombre + ' ' + App.rango(s))).join(' · ') + '</div>';
      }
    }).catch((e) => U.aviso(U.mensajeError(e), 'warn'));
  }

  // =====================================================================
  // FORMULARIO DE SOLICITUD (colaborador, o Dirección a nombre de un colaborador)
  // =====================================================================
  function vistaForm(c, aNombre) {
    const u = App.usuario;
    const tecOps = Ope.D.personal.filter((t) => t.estado !== 'INACTIVO').map((t) => [t.Title, t.nombre + (t.vinculacion === Ope.ADMINISTRATIVO ? ' (administrativo)' : '')]);
    c.innerHTML = '<a class="ic-volver" href="#">← Menú principal</a><h1 class="ic-titulo">' + (aNombre ? 'Registrar novedad' : 'Nueva solicitud') + '</h1>' +
      '<p class="ic-subtitulo">' + (aNombre ? 'Registre la novedad a nombre del colaborador. Puede dejarla aprobada de una vez.' : 'La Dirección de Operaciones revisa el impacto en la programación y le responde aquí.') + '</p>' +
      '<form class="ic-form" id="fNov" autocomplete="off"><div class="ic-campos">' +
      (aNombre ? U.campo({ name: 'tecnico_id', label: 'Colaborador', t: 'select', op: tecOps, req: true, c: 'c6' }) : '') +
      U.campo({ name: 'tipo', label: 'Tipo de novedad', t: 'select', op: TIPOS_NOV.map((t) => [t.id, t.nombre]), req: true, c: aNombre ? 'c6' : 'c6' }) +
      '<div class="ic-campo c6" id="cSub"><label for="f_subtipo">Detalle</label><select id="f_subtipo" name="subtipo"></select></div>' +
      '<div class="ic-campo c6" id="cMod"><label>Modalidad</label><div class="ic-chips" id="chMod"><button type="button" data-m="DIAS" class="activo">Días completos</button><button type="button" data-m="HORAS">Por horas</button></div><input type="hidden" name="modalidad" value="DIAS"></div>' +
      U.campo({ name: 'fecha_inicio', label: 'Desde', t: 'date', req: true, c: 'c3', valor: Ope.hoy() }) +
      '<div class="ic-campo c3" id="cFin"><label for="f_fecha_fin">Hasta</label><input id="f_fecha_fin" name="fecha_fin" type="date" value="' + Ope.hoy() + '"></div>' +
      '<div class="ic-campo c3" id="cH1"><label for="f_hora_inicio">Hora inicio</label><input id="f_hora_inicio" name="hora_inicio" type="time"></div>' +
      '<div class="ic-campo c3" id="cH2"><label for="f_hora_fin">Hora fin</label><input id="f_hora_fin" name="hora_fin" type="time"></div>' +
      U.campo({ name: 'motivo', label: 'Motivo / observaciones', t: 'textarea', c: 'c12', filas: 3, req: true }) +
      (aNombre ? '<div class="ic-campo c12"><label class="ic-check"><input type="checkbox" name="aprobar"> <span>Dejarla aprobada (si es técnico, queda bloqueado en la Programación)</span></label></div>' : '') +
      '</div><div id="nota"></div><div id="resDias" class="ope-dia-panel"></div><div id="imp" class="ope-val-panel"></div>' +
      '<div class="ic-acciones"><a class="ic-btn sec" href="#">Cancelar</a><button class="ic-btn" id="bEnviar">' + (aNombre ? 'Registrar' : 'Enviar solicitud') + '</button></div></form>';
    const f = c.querySelector('#fNov');
    c.querySelectorAll('#chMod button').forEach((b) => { b.onclick = () => { c.querySelectorAll('#chMod button').forEach((x) => x.classList.toggle('activo', x === b)); f.modalidad.value = b.dataset.m; refrescar(); }; });
    const leer = () => {
      const v = U.leerForm(f);
      const t = tipoNov(v.tipo);
      if (!t.horas) v.modalidad = 'DIAS';
      if (v.modalidad === 'HORAS') v.fecha_fin = v.fecha_inicio;
      v.tecnico_id = aNombre ? v.tecnico_id : (u.tecnico && u.tecnico.Title);
      return v;
    };
    let turno = 0;
    async function refrescar(ev) {
      const v = leer(), t = tipoNov(v.tipo), n = ++turno;
      if (ev && ev.target && ev.target.name === 'tipo') {
        f.subtipo.innerHTML = t.subtipos.map((s) => '<option>' + esc(s) + '</option>').join('');
        if (!t.horas) { f.modalidad.value = 'DIAS'; c.querySelectorAll('#chMod button').forEach((x) => x.classList.toggle('activo', x.dataset.m === 'DIAS')); }
        refrescar(); return;
      }
      c.querySelector('#cSub').hidden = !t.subtipos.length;
      c.querySelector('#cMod').hidden = !t.horas;
      const horas = v.modalidad === 'HORAS';
      c.querySelector('#cFin').hidden = horas;
      c.querySelector('#cH1').hidden = c.querySelector('#cH2').hidden = !horas;
      c.querySelector('#cH1 label').textContent = v.tipo === 'CAMBIO_HORARIO' ? 'Nueva hora de entrada' : 'Hora inicio';
      c.querySelector('#cH2 label').textContent = v.tipo === 'CAMBIO_HORARIO' ? 'Nueva hora de salida' : 'Hora fin';
      c.querySelector('#nota').innerHTML = t.nota ? '<div class="ic-alerta chica">' + esc(t.nota) + '</div>' : '';
      if (!v.fecha_inicio || !v.tecnico_id) { c.querySelector('#resDias').innerHTML = ''; c.querySelector('#imp').innerHTML = ''; return; }
      const fin = v.fecha_fin && v.fecha_fin >= v.fecha_inicio ? v.fecha_fin : v.fecha_inicio;
      const dias = diasHabiles(v.fecha_inicio, fin);
      c.querySelector('#resDias').innerHTML = horas ? '<b>' + esc(Ope.textoFecha(v.fecha_inicio, true)) + '</b>' + (v.hora_inicio && v.hora_fin ? ' · de ' + esc(v.hora_inicio) + ' a ' + esc(v.hora_fin) : '') +
        (t.ausencia ? '<div class="ope-nota">Un permiso por horas no bloquea el día en la programación; la Dirección lo tiene en cuenta al asignar.</div>' : '')
        : '<b>' + dias.length + ' día' + (dias.length === 1 ? '' : 's') + ' hábil' + (dias.length === 1 ? '' : 'es') + '</b> (sin fines de semana ni festivos)' + (dias.length ? ': ' + esc(dias.map((d) => Ope.textoFecha(d)).join(', ')) : '');
      try {
        if (!App.solicitudes.length) await cargarSolicitudes();
        const im = await impacto({ Title: '', tecnico_id: v.tecnico_id, fecha_inicio: v.fecha_inicio, fecha_fin: fin });
        if (n === turno) c.querySelector('#imp').innerHTML = t.ausencia && !horas && !esAdministrativo(v.tecnico_id) ? htmlImpacto(im) : '';
      } catch (e) { /* la vista previa es opcional */ }
    }
    f.addEventListener('change', refrescar); f.addEventListener('input', (ev) => { if (ev.target.type === 'date' || ev.target.type === 'time') refrescar(ev); });
    f.tipo.dispatchEvent(new Event('change', { bubbles: true }));
    f.onsubmit = async (ev) => {
      ev.preventDefault();
      const v = leer(), err = {};
      if (aNombre && !v.tecnico_id) err.tecnico_id = 'Elija el colaborador';
      if (!v.tipo) err.tipo = 'Elija el tipo';
      if (!v.fecha_inicio) err.fecha_inicio = 'Indique la fecha';
      if (v.modalidad !== 'HORAS' && v.fecha_fin && v.fecha_fin < v.fecha_inicio) err.fecha_fin = 'Es anterior a la fecha inicial';
      if (v.modalidad === 'HORAS' && (!v.hora_inicio || !v.hora_fin)) err.hora_inicio = 'Indique las horas';
      if (!v.motivo) err.motivo = 'Cuéntele a la Dirección el motivo';
      if (!U.marcarErrores(f, err)) return;
      if (!v.tecnico_id) { U.aviso('Su correo no está registrado en el personal. Pida a la Dirección que lo registre.', 'err'); return; }
      const fin = v.modalidad === 'HORAS' ? v.fecha_inicio : (v.fecha_fin || v.fecha_inicio);
      const campos = { tecnico_id: v.tecnico_id, tipo: v.tipo, subtipo: tipoNov(v.tipo).subtipos.length ? v.subtipo : '', modalidad: v.modalidad, fecha_inicio: v.fecha_inicio, fecha_fin: fin,
        hora_inicio: v.modalidad === 'HORAS' ? v.hora_inicio : '', hora_fin: v.modalidad === 'HORAS' ? v.hora_fin : '', dias_habiles: v.modalidad === 'HORAS' ? 0 : diasHabiles(v.fecha_inicio, fin).length,
        motivo: v.motivo, estado: 'SOLICITADA', solicitante: u.email, registrado_por: aNombre ? u.nombre : '' };
      try {
        await U.conCarga(c.querySelector('#bEnviar'), async () => {
          const n = await G.siguiente('NOV');
          campos.Title = 'NOV-' + Ope.pad(n, 6);
          const it = await G.crear('NOV_Solicitudes', campos);
          await Ope.auditar('NOVEDAD', campos.Title, 'CREAR', null, campos);
          if (aNombre && v.aprobar) await resolver(normal(it), true, 'Registrada por la Dirección');
        });
        U.aviso((aNombre ? 'Novedad registrada: ' : 'Solicitud enviada: ') + campos.Title, 'ok', 6000);
        location.hash = aNombre ? 'todas' : 'mias';
      } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); }
    };
  }

  // ---------- Aprobar / rechazar / anular ----------
  async function resolver(s, aprobar, respuesta) {
    const cambios = { estado: aprobar ? 'APROBADA' : 'RECHAZADA', respuesta: respuesta || '', resuelto_por: App.usuario.nombre, fecha_respuesta: new Date().toISOString() };
    if (aprobar && bloquea(s)) {
      // Una Ausencia por cada día hábil del periodo, sin duplicar si ya existe
      await Ope.cargarRango(s.fecha_inicio, s.fecha_fin);
      const ids = [];
      for (const d of diasHabiles(s.fecha_inicio, s.fecha_fin)) {
        const ya = Ope.delDia(d).find((a) => Ope.activa(a) && a.tecnico_id === s.tecnico_id && a.tipo === 'AUS');
        if (ya) { ids.push(ya.Title); continue; }
        const a = await Ope.crearActividad({ fecha: d, tecnico_id: s.tecnico_id, tipo: 'AUS', cliente: '', ciudad: '', estado: 'PROGRAMADO',
          observaciones: tipoNov(s.tipo).nombre + (s.subtipo ? ' (' + s.subtipo + ')' : '') + ' · ' + s.Title, origen: s.Title });
        ids.push(a.Title);
      }
      cambios.actividades = ids.join(';');
    }
    await G.actualizar('NOV_Solicitudes', s._id, cambios, s._etag);
    await Ope.auditar('NOVEDAD', s.Title, 'CAMBIO_ESTADO', { estado: s.estado }, cambios);
  }
  async function anular(s, motivo) {
    if (s.actividades) {
      const ids = String(s.actividades).split(';').filter(Boolean);
      await Ope.cargarRango(s.fecha_inicio, s.fecha_fin, true);
      for (const id of ids) { const a = Ope.buscar(id); if (a && Ope.activa(a)) await Ope.actualizarActividad(a, { estado: 'CANCELADO', motivo_cambio: 'Novedad ' + s.Title + ' anulada' }, 'CAMBIO_ESTADO'); }
    }
    await G.actualizar('NOV_Solicitudes', s._id, { estado: 'ANULADA', respuesta: [s.respuesta, 'Anulada: ' + motivo].filter(Boolean).join(' · '), fecha_respuesta: new Date().toISOString(), resuelto_por: App.usuario.nombre }, s._etag);
    await Ope.auditar('NOVEDAD', s.Title, 'ANULAR', { estado: s.estado }, { estado: 'ANULADA', motivo });
  }

  // ---------- Ficha de una solicitud (ventana) ----------
  App.abrirSolicitud = async function (s, alCambiar) {
    const t = tipoNov(s.tipo), u = App.usuario;
    const propia = App.esTecnico() && u.tecnico && s.tecnico_id === u.tecnico.Title;
    let im = null; try { im = bloquea(s) && s.estado === 'SOLICITADA' ? await impacto(s) : null; } catch (e) { im = null; }
    const html = '<div class="ic-form"><div class="nov-ficha">' +
      '<div><span>Colaborador</span><b>' + esc(Ope.nombreTec(s.tecnico_id)) + '</b></div>' +
      '<div><span>Tipo</span><b>' + esc(t.nombre) + (s.subtipo ? ' · ' + esc(s.subtipo) : '') + '</b></div>' +
      '<div><span>Fechas</span><b>' + esc(App.rango(s)) + '</b><small>' + esc(App.detalleTiempo(s)) + '</small></div>' +
      '<div><span>Estado</span>' + App.tagEstado(s.estado) + '</div></div>' +
      '<p class="nov-motivo">' + esc(s.motivo || '') + '</p>' +
      (s.respuesta ? '<div class="ic-alerta chica"><b>Respuesta de la Dirección' + (s.resuelto_por ? ' (' + esc(s.resuelto_por) + ')' : '') + ':</b> ' + esc(s.respuesta) + '</div>' : '') +
      (s.actividades ? '<p class="ope-nota">Ausencias en la Programación: ' + esc(s.actividades.split(';').length) + ' día(s).</p>' : '') +
      (im ? '<div class="ope-val-panel">' + htmlImpacto(im) + '</div>' : '') +
      (App.esAdmin() && s.estado === 'SOLICITADA' ? U.campo({ name: 'resp', label: 'Respuesta al colaborador', t: 'textarea', c: 'c12', filas: 2, ph: 'Opcional al aprobar; obligatoria al rechazar' }) : '') +
      '<p class="ope-nota">' + esc(s.Title) + ' · solicitada ' + esc(U.fmt.fechaHora(s._creado)) + (s.registrado_por ? ' · registrada por ' + esc(s.registrado_por) : '') + '</p>' +
      '<div class="ic-acciones"><button class="ic-btn sec" id="sCerrar">Cerrar</button>' +
      ((propia && s.estado === 'SOLICITADA') || (App.esAdmin() && (s.estado === 'SOLICITADA' || s.estado === 'APROBADA')) ? '<button class="ic-btn sec peligro-txt" id="sAnular">Anular</button>' : '') +
      (App.esAdmin() && s.estado === 'SOLICITADA' ? '<button class="ic-btn peligro" id="sRech">Rechazar</button><button class="ic-btn" id="sAprob">Aprobar</button>' : '') + '</div></div>';
    U.modal(s.Title + ' · ' + t.nombre, html, (cu) => {
      cu.querySelector('#sCerrar').onclick = U.cerrarModal;
      const resp = () => { const el = cu.querySelector('[name=resp]'); return el ? el.value.trim() : ''; };
      const hecho = (txt) => { U.aviso(txt, 'ok'); U.cerrarModal(); if (alCambiar) alCambiar(); };
      const bA = cu.querySelector('#sAprob');
      if (bA) bA.onclick = async () => {
        try { await U.conCarga(bA, () => resolver(s, true, resp())); hecho('Aprobada' + (bloquea(s) ? ': quedó en Ausencia en la Programación' : '')); }
        catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); }
      };
      const bR = cu.querySelector('#sRech');
      if (bR) bR.onclick = async () => {
        if (!resp()) { U.marcarErrores(cu.querySelector('.ic-form'), { resp: 'Indique el motivo del rechazo' }); return; }
        try { await U.conCarga(bR, () => resolver(s, false, resp())); hecho('Rechazada'); } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); }
      };
      const bN = cu.querySelector('#sAnular');
      if (bN) bN.onclick = async () => {
        const ok = await U.confirmar('Anular ' + s.Title, s.estado === 'APROBADA' ? 'Se anula la novedad y se cancelan sus ausencias en la Programación.' : '¿Anular esta solicitud?', 'Anular', true);
        if (!ok) return;
        try { await anular(s, App.esTecnico() ? 'por el colaborador' : 'por la Dirección'); U.aviso('Anulada', 'ok'); if (alCambiar) alCambiar(); } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); }
      };
    });
  };

  // ---------- Tabla de solicitudes ----------
  App.tablaSolicitudes = function (l, conTec) {
    if (!l.length) return '<div class="ic-tabla-caja"><div class="ic-vacio">No hay solicitudes.</div></div>';
    return '<div class="ic-tabla-caja ope-scroll"><table class="ic-tabla"><thead><tr><th>N°</th>' + (conTec ? '<th>Colaborador</th>' : '') + '<th>Tipo</th><th>Fechas</th><th>Duración</th><th>Estado</th><th class="ocultar-movil">Respuesta</th></tr></thead><tbody>' +
      l.map((s) => '<tr data-id="' + esc(s.Title) + '" class="' + (s.estado === 'ANULADA' || s.estado === 'RECHAZADA' ? 'inactivo' : '') + '"><td><b>' + esc(s.Title) + '</b></td>' + (conTec ? '<td>' + esc(Ope.nombreTec(s.tecnico_id)) + '</td>' : '') +
        '<td>' + esc(tipoNov(s.tipo).nombre) + '<span class="sec">' + esc(s.subtipo || '') + '</span></td><td>' + esc(App.rango(s)) + '</td><td>' + esc(App.detalleTiempo(s)) + '</td><td>' + App.tagEstado(s.estado) + '</td>' +
        '<td class="ocultar-movil"><span class="sec">' + esc(s.respuesta || '') + '</span></td></tr>').join('') + '</tbody></table></div>';
  };
  App.conectarSolicitudes = (c, repintar) => c.querySelectorAll('tr[data-id]').forEach((tr) => { tr.onclick = () => App.abrirSolicitud(App.solicitudes.find((x) => x.Title === tr.dataset.id), repintar); });

  // ---------- Vistas de listas ----------
  async function vistaMias(c) {
    c.innerHTML = '<a class="ic-volver" href="#">← Menú principal</a><div class="ic-barra"><div style="flex:1"><h1 class="ic-titulo">Mis solicitudes</h1></div><a class="ic-btn" href="#nueva">+ Nueva solicitud</a></div><div id="t"><div class="ic-vacio">Cargando…</div></div>';
    const pintar = async () => { await cargarSolicitudes(); c.querySelector('#t').innerHTML = App.tablaSolicitudes(App.solicitudes, false); App.conectarSolicitudes(c, pintar); };
    pintar().catch((e) => { c.querySelector('#t').innerHTML = '<div class="ic-alerta">' + esc(U.mensajeError(e)) + '</div>'; });
  }
  async function vistaBandeja(c) {
    c.innerHTML = '<a class="ic-volver" href="#">← Menú principal</a><h1 class="ic-titulo">Bandeja de aprobación</h1><p class="ic-subtitulo">Revise el impacto en la programación antes de aprobar. Al aprobar, el técnico queda en Ausencia en esos días.</p><div id="t"><div class="ic-vacio">Cargando…</div></div>';
    const pintar = async () => {
      await cargarSolicitudes();
      const pend = App.solicitudes.filter((s) => s.estado === 'SOLICITADA').sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio));
      if (!pend.length) { c.querySelector('#t').innerHTML = '<div class="ic-tabla-caja"><div class="ic-vacio">✔ No hay solicitudes pendientes.</div></div>'; return; }
      let html = '';
      for (const s of pend) {
        let im = null; try { im = bloquea(s) ? await impacto(s) : null; } catch (e) { im = null; }
        html += '<div class="nov-card" data-id="' + esc(s.Title) + '"><div class="cab"><b>' + esc(Ope.nombreTec(s.tecnico_id)) + '</b> · ' + esc(tipoNov(s.tipo).nombre) + (s.subtipo ? ' (' + esc(s.subtipo) + ')' : '') +
          '<span class="esp"></span><span class="ope-nota">' + esc(s.Title) + ' · ' + esc(U.fmt.fecha(s._creado)) + '</span></div>' +
          '<div class="fechas">' + esc(App.rango(s)) + ' · ' + esc(App.detalleTiempo(s)) + '</div><p class="nov-motivo">' + esc(s.motivo || '') + '</p>' +
          (im ? (im.acts.length ? '<div class="ope-v warn">⚠ ' + im.acts.length + ' actividad(es) programada(s) en esos días</div>' : '<div class="ope-v ok">✔ Sin actividades programadas en esos días</div>') : '') +
          '<div class="ic-acciones" style="border:0;padding-top:8px"><button class="ic-btn" data-ver="' + esc(s.Title) + '">Revisar y responder</button></div></div>';
      }
      c.querySelector('#t').innerHTML = html;
      c.querySelectorAll('[data-ver]').forEach((b) => { b.onclick = () => App.abrirSolicitud(App.solicitudes.find((x) => x.Title === b.dataset.ver), pintar); });
    };
    pintar().catch((e) => { c.querySelector('#t').innerHTML = '<div class="ic-alerta">' + esc(U.mensajeError(e)) + '</div>'; });
  }
  const filtros = { tec: '', tipo: '', estado: '' };
  async function vistaTodas(c) {
    c.innerHTML = '<a class="ic-volver" href="#">← Menú principal</a><div class="ic-barra"><div style="flex:1"><h1 class="ic-titulo">Solicitudes</h1></div>' + (App.esAdmin() ? '<a class="ic-btn" href="#registrar">+ Registrar novedad</a>' : '') + '</div>' +
      '<div class="ic-filtros"><select id="fT"><option value="">Todo el personal</option>' + Ope.D.personal.map((t) => '<option value="' + esc(t.Title) + '">' + esc(t.nombre) + '</option>').join('') + '</select>' +
      '<select id="fTi"><option value="">Todos los tipos</option>' + TIPOS_NOV.map((t) => '<option value="' + t.id + '">' + esc(t.nombre) + '</option>').join('') + '</select>' +
      '<select id="fE"><option value="">Todos los estados</option>' + ESTADOS_NOV.map((e) => '<option value="' + e[0] + '">' + esc(e[1]) + '</option>').join('') + '</select></div><div id="t"><div class="ic-vacio">Cargando…</div></div>';
    c.querySelector('#fT').value = filtros.tec; c.querySelector('#fTi').value = filtros.tipo; c.querySelector('#fE').value = filtros.estado;
    const dibujar = () => {
      filtros.tec = c.querySelector('#fT').value; filtros.tipo = c.querySelector('#fTi').value; filtros.estado = c.querySelector('#fE').value;
      const l = App.solicitudes.filter((s) => (!filtros.tec || s.tecnico_id === filtros.tec) && (!filtros.tipo || s.tipo === filtros.tipo) && (!filtros.estado || s.estado === filtros.estado));
      c.querySelector('#t').innerHTML = App.tablaSolicitudes(l, true); App.conectarSolicitudes(c, pintar);
    };
    const pintar = async () => { await cargarSolicitudes(); dibujar(); };
    c.querySelectorAll('.ic-filtros select').forEach((s) => { s.onchange = dibujar; });
    pintar().catch((e) => { c.querySelector('#t').innerHTML = '<div class="ic-alerta">' + esc(U.mensajeError(e)) + '</div>'; });
  }

  // ---------- Calendario de ausencias (personal × días del mes) ----------
  async function vistaCalendario(c) {
    if (!App.estado.mes) App.estado.mes = Ope.ym(Ope.hoy());
    c.innerHTML = '<a class="ic-volver" href="#">← Menú principal</a><h1 class="ic-titulo">Calendario de ausencias</h1><p class="ic-subtitulo">A = aprobada · P = pendiente de aprobación · H = permiso o cambio de horario por horas.</p>' +
      '<div class="ic-filtros"><button class="ic-btn sec chico" data-m="-1">◀</button><b id="lblMes" style="min-width:150px;text-align:center"></b><button class="ic-btn sec chico" data-m="1">▶</button></div><div id="t"><div class="ic-vacio">Cargando…</div></div>';
    c.querySelectorAll('[data-m]').forEach((b) => { b.onclick = () => { let [y, m] = App.estado.mes.split('-').map(Number); m += Number(b.dataset.m); if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } App.estado.mes = y + '-' + Ope.pad(m); dibujar(); }; });
    function dibujar() {
      const k = App.estado.mes, [y, m] = k.split('-').map(Number), fin = Ope.finDeMes(y, m);
      c.querySelector('#lblMes').textContent = Ope.MESES[m - 1] + ' ' + y;
      const dias = []; let s = k + '-01'; while (s <= fin) { dias.push(s); s = Ope.sumar(s, 1); }
      const vig = App.solicitudes.filter((x) => (x.estado === 'APROBADA' || x.estado === 'SOLICITADA') && x.fecha_inicio <= fin && x.fecha_fin >= k + '-01');
      const tecs = Ope.D.personal.filter((t) => t.estado !== 'INACTIVO');
      c.querySelector('#t').innerHTML = '<div class="ic-tabla-caja ope-scroll"><table class="ic-tabla nov-cal"><thead><tr><th>Colaborador</th>' +
        dias.map((d) => '<th class="' + (Ope.esHabil(d) ? '' : 'nh') + '" title="' + esc(Ope.textoFecha(d, true)) + '">' + Ope.DIAS_CORTOS[Ope.dow(d) - 1].slice(0, 1) + '<br>' + Number(d.slice(8)) + '</th>').join('') + '</tr></thead><tbody>' +
        tecs.map((t) => '<tr><td><b>' + esc(t.nombre) + '</b></td>' + dias.map((d) => {
          const x = vig.find((v) => v.tecnico_id === t.Title && v.fecha_inicio <= d && v.fecha_fin >= d);
          if (!x) return '<td class="' + (Ope.esHabil(d) ? '' : 'nh') + '"></td>';
          const letra = porHoras(x) ? 'H' : x.estado === 'APROBADA' ? 'A' : 'P';
          return '<td class="c ' + letra + (Ope.esHabil(d) ? '' : ' nh') + '" data-id="' + esc(x.Title) + '" title="' + esc(tipoNov(x.tipo).nombre + ' · ' + nombreEstado(x.estado) + ' · ' + x.Title) + '">' + letra + '</td>';
        }).join('') + '</tr>').join('') + '</tbody></table></div>';
      c.querySelectorAll('td[data-id]').forEach((td) => { td.onclick = () => App.abrirSolicitud(App.solicitudes.find((x) => x.Title === td.dataset.id), pintar); });
    }
    const pintar = async () => { await cargarSolicitudes(); dibujar(); };
    pintar().catch((e) => { c.querySelector('#t').innerHTML = '<div class="ic-alerta">' + esc(U.mensajeError(e)) + '</div>'; });
  }

  // ---------- Acceso ----------
  async function resolverAcceso(cuenta) {
    const email = String(cuenta.username || '').toLowerCase(), nombre = cuenta.name || email;
    let rol = null;
    try {
      const acc = (await G.items('SYS_Accesos')).filter((x) => String(x.email || '').toLowerCase() === email && x.estado !== 'INACTIVO');
      const a107 = acc.find((x) => x.app_id === CFG.app.id), a106 = acc.find((x) => x.app_id === 'APP-106');
      if (a107) rol = a107.rol === 'ADMIN' ? 'ADMIN' : 'CONSULTA';
      else if (a106) rol = a106.rol === 'ADMIN' ? 'ADMIN' : 'CONSULTA';
    } catch (e) { /* sin lectura de accesos: se intenta como colaborador */ }
    const t = Ope.D.personal.find((x) => String(x.email || '').toLowerCase() === email && x.estado !== 'INACTIVO') || null;
    if (!rol && t) rol = 'TECNICO';
    return { nombre, email, rol, usuario_id: email, iniciales: t ? t.iniciales : U.fmt.iniciales(nombre), tecnico: t };
  }

  async function arrancar() {
    const raiz = document.getElementById('contenido');
    U.pantalla(raiz, { logo: CFG.logo, cargando: true, titulo: 'Cargando…', texto: 'Conectando con Microsoft 365' });
    try {
      const cuenta = await IC.auth.iniciar(CFG.auth);
      if (!cuenta) { U.pantalla(raiz, { logo: CFG.logo, titulo: CFG.app.nombre, texto: 'Ingrese con su cuenta de Microsoft de Ideas Control.', boton: 'Iniciar sesión', alClic: () => IC.auth.entrar() }); return; }
      await G.sitio(CFG.sitio.host, CFG.sitio.ruta);
      await Ope.cargarCatalogos();
      App.usuario = await resolverAcceso(cuenta);
      if (!App.usuario.rol) {
        U.pantalla(raiz, { logo: CFG.logo, titulo: 'Usuario no habilitado', texto: 'Su cuenta (' + App.usuario.email + ') no está registrada en el personal ni tiene acceso a esta app. Pida a la Dirección de Operaciones que lo registre.', boton: 'Cerrar sesión', alClic: () => IC.auth.salir() });
        return;
      }
      pintarEncabezado();
      const permitidas = ['', 'todas', 'calendario'].concat(menu().map((i) => i[0]));
      const rutas = {
        '': () => vistaMenu(raiz), nueva: () => vistaForm(raiz, false), registrar: () => vistaForm(raiz, true), mias: () => vistaMias(raiz),
        bandeja: () => vistaBandeja(raiz), todas: () => vistaTodas(raiz), calendario: () => vistaCalendario(raiz),
        faltas: () => App.vistas.faltas(raiz), personal: () => App.vistas.personal(raiz), reporte: () => App.vistas.reporte(raiz)
      };
      Object.keys(rutas).forEach((k) => { const fn = rutas[k]; rutas[k] = () => (permitidas.indexOf(k) >= 0 && (['todas', 'calendario', 'reporte'].indexOf(k) < 0 || !App.esTecnico()) ? fn() : (location.hash = '')); });
      const volver = IC.auth.volverA(); if (volver) location.hash = volver;
      U.enrutar(rutas);
    } catch (e) {
      console.error(e);
      const faltan = /No existe la lista (NOV_|OPE_)/.test(e.message);
      U.pantalla(raiz, { logo: CFG.logo, titulo: faltan ? 'Falta instalar la app' : 'No se pudo cargar la app',
        texto: faltan ? 'Las listas de Novedades aún no existen en IC Apps. Abra el instalador (Programacion/Instalador/) y haga clic en «Crear estructura».' : U.mensajeError(e), boton: 'Reintentar', alClic: () => location.reload() });
    }
  }
  window.addEventListener('DOMContentLoaded', arrancar);
})();
