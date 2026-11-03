/* =====================================================================
   APP-106 · Programación — actividades: formulario, lista, conflictos, mi agenda
   ===================================================================== */
(function () {
  const U = IC.ui, esc = U.esc;

  // Colores por tipo (si la lista OPE_Tipos trae color, se usa ese)
  const COLORES = { INS: '#0E76BC', MTO: '#159090', SPR: '#7A4FB0', SVS: '#4F6D84', SVH: '#8A6D0F', IMP: '#C25A1C', DES: '#5B4B8A', OFI: '#1D2B36', CAP: '#2E8B57', INV: '#A0522D', OTR: '#6B7780', AUS: '#9AA5AE' };
  App.colorTipo = (cod) => { const t = Ope.tipo(cod); return (t && t.color) || COLORES[cod] || '#6B7780'; };
  App.chipTipo = (cod) => '<span class="ope-tipo" style="--c:' + App.colorTipo(cod) + '">' + esc(cod || '?') + '</span>';
  App.tagEstado = (e) => '<span class="ope-estado e-' + esc(String(e || '').toLowerCase()) + '">' + esc(Ope.nombreEstado(e)) + '</span>';

  App.textoValidacion = function (a) {
    if (!Ope.activa(a)) return '<span class="ope-val gris">— ' + esc(Ope.nombreEstado(a.estado)) + '</span>';
    const v = Ope.validar(a);
    if (v.errores.length) return '<span class="ope-val err">⚠ ' + esc(v.errores.join('; ')) + (v.avisos.length ? '; ' + esc(v.avisos.join('; ')) : '') + '</span>';
    if (v.avisos.length) return '<span class="ope-val warn">ℹ ' + esc(v.avisos.join('; ')) + '</span>';
    return '<span class="ope-val ok">✔ OK</span>';
  };

  // ---------- Tabla reutilizable ----------
  App.tablaActividades = function (lista, conDia) {
    if (!lista.length) return '<div class="ic-tabla-caja"><div class="ic-vacio">No hay actividades con estos filtros.</div></div>';
    return '<div class="ic-tabla-caja ope-scroll"><table class="ic-tabla"><thead><tr>' +
      '<th>Fecha</th><th>Técnico</th><th>Tipo</th><th>Cliente / ciudad</th><th class="ocultar-movil">Eq.</th><th class="ocultar-movil">Hora</th><th class="ocultar-movil">Ticket / OS</th><th>Estado</th><th>Validación</th></tr></thead><tbody>' +
      lista.map((a) => {
        const v = Ope.activa(a) ? Ope.validar(a) : { errores: [] };
        return '<tr data-id="' + esc(a.Title) + '" class="' + (v.errores.length ? 'ope-fila-err' : '') + (!Ope.activa(a) ? ' inactivo' : '') + '">' +
          '<td><b>' + esc(Ope.textoFecha(a.fecha)) + '</b><span class="sec">' + esc(Ope.DIAS[Ope.dow(a.fecha) - 1]) + (Ope.esFestivo(a.fecha) ? ' · festivo' : '') + '</span></td>' +
          '<td>' + esc(Ope.nombreTec(a.tecnico_id)) + '</td>' +
          '<td>' + App.chipTipo(a.tipo) + '<span class="sec">' + esc(Ope.nombreTipo(a.tipo)) + '</span></td>' +
          '<td>' + esc(a.cliente || '') + '<span class="sec">' + esc(a.ciudad || '') + '</span></td>' +
          '<td class="ocultar-movil">' + esc(a.equipos === '' ? '' : a.equipos) + '</td>' +
          '<td class="ocultar-movil">' + esc(a.hora_inicio || '') + '</td>' +
          '<td class="ocultar-movil">' + esc(a.ticket_os || '') + '</td>' +
          '<td>' + App.tagEstado(a.estado) + '</td>' +
          '<td class="ope-col-val">' + App.textoValidacion(a) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  };
  App.conectarTabla = function (c, alCambiar) {
    c.querySelectorAll('tr[data-id]').forEach((tr) => { tr.onclick = () => App.abrirActividad(Ope.buscar(tr.dataset.id), alCambiar); });
  };

  // =====================================================================
  // FORMULARIO (ventana)
  // =====================================================================
  App.nuevaActividad = function (prefijo, alCambiar) {
    App.abrirActividad(Object.assign({ fecha: Ope.hoy(), estado: 'PROGRAMADO', ciudad: 'Bogotá' }, prefijo || {}), alCambiar, true);
  };

  App.abrirActividad = async function (a, alCambiar, nueva) {
    if (!a) { U.aviso('No se encontró la actividad.', 'err'); return; }
    const u = App.usuario;
    const propia = u.tecnico && a.tecnico_id === u.tecnico.Title;
    const edita = App.puedeEditar();
    const soloEjecutar = !edita && u.rol === 'TECNICO' && propia && !nueva;
    const lectura = !edita && !soloEjecutar;
    const empresas = edita ? await Ope.empresas() : [];

    const tecOps = Ope.D.tecnicos.filter((t) => t.estado !== 'INACTIVO' || t.Title === a.tecnico_id)
      .map((t) => [t.Title, t.nombre + (t.vinculacion === 'TECNICO_CAMPO' ? ' (campo)' : '') + (t.estado === 'INACTIVO' ? ' — inactivo' : '')]);
    const tipoOps = Ope.D.tipos.filter((t) => t.estado !== 'INACTIVO' || t.Title === a.tipo).map((t) => [t.Title, t.nombre + ' (' + t.Title + ')']);
    const titulo = nueva ? 'Nueva actividad' : a.Title + ' · ' + Ope.nombreTipo(a.tipo);

    const html = '<form class="ic-form" id="fAct" autocomplete="off"><div class="ic-campos">' +
      U.campo({ name: 'fecha', label: 'Fecha', t: 'date', valor: a.fecha, req: true, c: 'c4' }) +
      U.campo({ name: 'tecnico_id', label: 'Técnico', t: 'select', op: tecOps, valor: a.tecnico_id, c: 'c4', vacio: '— sin técnico —' }) +
      U.campo({ name: 'tipo', label: 'Tipo', t: 'select', op: tipoOps, valor: a.tipo, req: true, c: 'c4' }) +
      '<div class="ic-campo c8"><label for="f_cliente">Cliente</label><input id="f_cliente" name="cliente" list="dlEmpresas" value="' + esc(a.cliente || '') + '" placeholder="Empresa (de la app Comercial) u «Oficina»">' +
        '<datalist id="dlEmpresas">' + empresas.map((e) => '<option value="' + esc(e.razon_social) + '">').join('') + '</datalist>' +
        '<span class="ayuda" id="ayEmpresa"></span></div>' +
      U.campo({ name: 'ciudad', label: 'Ciudad / sede', valor: a.ciudad, c: 'c4', ph: 'Siempre la ciudad', ayuda: 'Escriba siempre la ciudad.' }) +
      '<div class="ic-campo c3" id="cEquipos"><label for="f_equipos">Equipos</label><input id="f_equipos" name="equipos" type="number" min="0" step="1" value="' + esc(a.equipos === undefined ? '' : a.equipos) + '"><span class="ayuda" id="ayCarga"></span></div>' +
      U.campo({ name: 'hora_inicio', label: 'Hora inicio', t: 'time', valor: a.hora_inicio, c: 'c3' }) +
      U.campo({ name: 'ticket_os', label: 'Ticket / OS', valor: a.ticket_os, c: 'c3' }) +
      U.campo({ name: 'estado', label: 'Estado', t: 'select', op: Ope.ESTADOS.filter((e) => nueva ? e[0] === 'PROGRAMADO' || e[0] === 'CONFIRMADO' : true), valor: a.estado, c: 'c3', vacio: false }) +
      U.campo({ name: 'observaciones', label: 'Observaciones', t: 'textarea', valor: a.observaciones, c: 'c12', filas: 2 }) +
      '<div class="ic-campo c12" id="cAut"' + (App.esAdmin() ? '' : ' hidden') + '><label class="ic-check"><input type="checkbox" name="autorizado"' + (a.autorizado ? ' checked' : '') + '> <span>Autorizado por el Director de Operaciones (festivo o fin de semana)</span></label></div>' +
      '</div>' +
      (a.reprograma_de ? '<p class="ope-nota">Reprogramación de <b>' + esc(a.reprograma_de) + '</b>.</p>' : '') +
      (a.motivo_cambio ? '<p class="ope-nota">Motivo del cambio: ' + esc(a.motivo_cambio) + '</p>' : '') +
      '<div id="valPanel" class="ope-val-panel"></div>' +
      '<div id="diaPanel" class="ope-dia-panel"></div>' +
      '<div class="ic-acciones">' +
        (!nueva && edita && Ope.activa(a) ? '<button type="button" class="ic-btn sec" id="bRep">Reprogramar</button><button type="button" class="ic-btn sec peligro-txt" id="bCan">Cancelar actividad</button><span style="flex:1"></span>' : '') +
        '<button type="button" class="ic-btn sec" id="bCerrar">Cerrar</button>' +
        (soloEjecutar && Ope.activa(a) && a.estado !== 'EJECUTADO' ? '<button type="button" class="ic-btn" id="bEje">Marcar ejecutado</button>' : '') +
        (edita ? '<button type="submit" class="ic-btn" id="bGuardar">' + (nueva ? 'Programar' : 'Guardar cambios') + '</button>' : '') +
      '</div>' +
      (!nueva && a._modificado ? '<p class="ope-nota" style="text-align:right">Creado por ' + esc(a._autor) + ' · última modificación ' + esc(U.fmt.fechaHora(a._modificado)) + ' por ' + esc(a._editor) + '</p>' : '') +
      '</form>';

    U.modal(titulo, html, (cuerpo) => {
      const f = cuerpo.querySelector('#fAct');
      if (lectura || soloEjecutar) f.querySelectorAll('input,select,textarea').forEach((el) => { if (!(soloEjecutar && el.name === 'observaciones')) el.disabled = true; });
      f.querySelector('#bCerrar').onclick = U.cerrarModal;

      const leer = () => {
        const v = U.leerForm(f);
        const p = Object.assign({}, a, v, { equipos: v.equipos === '' ? '' : Number(v.equipos), autorizado: !!v.autorizado });
        if (!p.estado) p.estado = a.estado || 'PROGRAMADO';
        return p;
      };
      let turno = 0;
      const refrescar = async () => {
        const p = leer(), n = ++turno;
        cuerpo.querySelector('#cEquipos').hidden = !Ope.usaEquipos(p.tipo);
        const emp = empresas.find((e) => U.norm(e.razon_social) === U.norm(p.cliente));
        cuerpo.querySelector('#ayEmpresa').textContent = emp ? '✔ Empresa ' + emp.Title + ' de la app Comercial' : (p.cliente && empresas.length ? 'No coincide con una empresa de la app Comercial (se guarda como texto).' : '');
        if (!p.fecha) return;
        try { await Ope.cargarMes(Ope.ym(p.fecha)); } catch (e) { /* sin conexión: se valida con lo que hay */ }
        if (n !== turno) return;
        const v = Ope.validar(p);
        cuerpo.querySelector('#ayCarga').textContent = v.carga !== null ? 'Carga del día: ' + Math.round(v.carga * 100) + ' %' : '';
        const finde = Ope.dow(p.fecha) > 5 || Ope.esFestivo(p.fecha);
        cuerpo.querySelector('#cAut').hidden = !(App.esAdmin() && finde);
        cuerpo.querySelector('#valPanel').innerHTML = !Ope.activa(p) ? '' :
          (v.errores.length ? '<div class="ope-v err"><b>⚠ Conflictos</b><ul>' + v.errores.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : '<div class="ope-v ok">✔ Sin conflictos</div>') +
          (v.avisos.length ? '<div class="ope-v warn"><b>ℹ Para revisar</b><ul>' + v.avisos.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : '');
        const otras = Ope.delDia(p.fecha).filter((x) => x.Title !== a.Title && Ope.activa(x)).sort(Ope.orden);
        const r = Ope.resumenDia(p.fecha);
        cuerpo.querySelector('#diaPanel').innerHTML = '<b>' + esc(Ope.textoFecha(p.fecha, true)) + (Ope.esFestivo(p.fecha) ? ' · ' + esc(Ope.D.festivos[p.fecha]) : '') + '</b>' +
          (otras.length ? '<div class="ope-dia-items">' + otras.map((x) => '<span class="ope-chip" style="--c:' + App.colorTipo(x.tipo) + '">' + esc(Ope.etiqueta(x)) + '</span>').join('') + '</div>' : '<div class="ope-nota">No hay otras actividades ese día.</div>') +
          (Ope.esHabil(p.fecha) ? '<div class="ope-nota">Sin asignar (en oficina): ' + esc(r.sinAsignar.filter((t) => t.Title !== p.tecnico_id).map((t) => t.nombre).join(', ') || 'nadie') + '</div>' : '');
      };
      f.addEventListener('input', refrescar); f.addEventListener('change', refrescar);
      refrescar();

      f.onsubmit = async (ev) => {
        ev.preventDefault();
        if (!edita) return;
        const p = leer();
        const err = {};
        if (!p.fecha) err.fecha = 'Indique la fecha';
        if (!p.tipo) err.tipo = 'Elija el tipo';
        if (!U.marcarErrores(f, err)) return;
        await Ope.cargarMes(Ope.ym(p.fecha));
        const v = Ope.validar(p);
        if (v.errores.length && Ope.activa(p) && !(await U.confirmar('Guardar con conflictos', 'La actividad tiene conflictos:\n• ' + v.errores.join('\n• ') + '\n\n¿Guardarla de todas formas? Quedará marcada con ⚠ hasta que se corrija.', 'Guardar con conflictos'))) {
          App.abrirActividad(Object.assign({}, a, p), alCambiar, nueva); return;
        }
        const emp = empresas.find((e) => U.norm(e.razon_social) === U.norm(p.cliente));
        p.empresa_id = emp ? emp.Title : '';
        try {
          const btn = document.querySelector('#bGuardar');
          const guardar = async () => {
            if (nueva) { const n = await Ope.crearActividad(p); U.aviso('Actividad ' + n.Title + ' programada', 'ok'); }
            else { await Ope.actualizarActividad(a, p, p.estado !== a.estado ? 'CAMBIO_ESTADO' : 'ACTUALIZAR'); U.aviso('Cambios guardados', 'ok'); }
          };
          if (btn) await U.conCarga(btn, guardar); else { U.aviso('Guardando…'); await guardar(); }
          U.cerrarModal(); if (alCambiar) alCambiar();
        } catch (e) { U.aviso(U.mensajeError(e), 'err', 7000); }
      };

      const bEje = cuerpo.querySelector('#bEje');
      if (bEje) bEje.onclick = async () => {
        try {
          await U.conCarga(bEje, () => Ope.actualizarActividad(a, { estado: 'EJECUTADO', observaciones: f.querySelector('[name=observaciones]').value.trim() }, 'CAMBIO_ESTADO'));
          U.aviso('Marcada como ejecutada', 'ok'); U.cerrarModal(); if (alCambiar) alCambiar();
        } catch (e) { U.aviso(U.mensajeError(e), 'err', 7000); }
      };
      const bRep = cuerpo.querySelector('#bRep'); if (bRep) bRep.onclick = () => reprogramar(a, alCambiar);
      const bCan = cuerpo.querySelector('#bCan'); if (bCan) bCan.onclick = () => cancelar(a, alCambiar);
    });
  };

  // ---------- Reprogramar: la original queda «Reprogramado» y se crea una nueva (trazabilidad) ----------
  function reprogramar(a, alCambiar) {
    const tecOps = Ope.tecnicosActivos().map((t) => [t.Title, t.nombre]);
    U.modal('Reprogramar ' + a.Title, '<form class="ic-form" id="fRep"><p class="ope-nota" style="margin-top:0">' + esc(Ope.etiqueta(a)) + ' · ' + esc(Ope.textoFecha(a.fecha, true)) + '</p><div class="ic-campos">' +
      U.campo({ name: 'fecha', label: 'Nueva fecha', t: 'date', valor: a.fecha, req: true, c: 'c4' }) +
      U.campo({ name: 'tecnico_id', label: 'Técnico', t: 'select', op: tecOps, valor: a.tecnico_id, c: 'c8' }) +
      U.campo({ name: 'motivo', label: 'Motivo', req: true, c: 'c12', ph: 'Ej.: el cliente pidió cambio de fecha' }) +
      '</div><div id="repVal"></div><div class="ic-acciones"><button type="button" class="ic-btn sec" id="rCan">Volver</button><button class="ic-btn" id="rOk">Reprogramar</button></div></form>',
    (cu) => {
      const f = cu.querySelector('#fRep');
      const ver = async () => {
        const v0 = U.leerForm(f); if (!v0.fecha) return;
        await Ope.cargarMes(Ope.ym(v0.fecha)).catch(() => {});
        const p = Object.assign({}, a, { Title: '(nueva)', fecha: v0.fecha, tecnico_id: v0.tecnico_id, estado: 'PROGRAMADO' });
        const v = Ope.validar(p, Ope.delDia(v0.fecha).filter((x) => x.Title !== a.Title));
        cu.querySelector('#repVal').innerHTML = v.errores.length ? '<div class="ope-v err">⚠ ' + esc(v.errores.join('; ')) + '</div>' : '<div class="ope-v ok">✔ Sin conflictos en la nueva fecha</div>';
      };
      f.addEventListener('change', ver); ver();
      cu.querySelector('#rCan').onclick = () => App.abrirActividad(a, alCambiar);
      f.onsubmit = async (ev) => {
        ev.preventDefault();
        const v = U.leerForm(f);
        if (!U.marcarErrores(f, Object.assign({}, !v.fecha ? { fecha: 'Indique la fecha' } : {}, !v.motivo ? { motivo: 'Indique el motivo' } : {}))) return;
        try {
          await U.conCarga(cu.querySelector('#rOk'), async () => {
            await Ope.actualizarActividad(a, { estado: 'REPROGRAMADO', motivo_cambio: v.motivo }, 'CAMBIO_ESTADO');
            const n = await Ope.crearActividad(Object.assign({}, a, { fecha: v.fecha, tecnico_id: v.tecnico_id, estado: 'PROGRAMADO', reprograma_de: a.Title, motivo_cambio: '', autorizado: false }));
            U.aviso('Reprogramada: nueva actividad ' + n.Title, 'ok');
          });
          U.cerrarModal(); if (alCambiar) alCambiar();
        } catch (e) { U.aviso(U.mensajeError(e), 'err', 7000); }
      };
    });
  }

  function cancelar(a, alCambiar) {
    U.modal('Cancelar ' + a.Title, '<form class="ic-form" id="fCan"><p class="ope-nota" style="margin-top:0">' + esc(Ope.etiqueta(a)) + ' · ' + esc(Ope.textoFecha(a.fecha, true)) + '</p><div class="ic-campos">' +
      U.campo({ name: 'motivo', label: 'Motivo de la cancelación', req: true, c: 'c12' }) +
      '</div><div class="ic-acciones"><button type="button" class="ic-btn sec" id="cVol">Volver</button><button class="ic-btn peligro" id="cOk">Cancelar actividad</button></div></form>',
    (cu) => {
      const f = cu.querySelector('#fCan');
      cu.querySelector('#cVol').onclick = () => App.abrirActividad(a, alCambiar);
      f.onsubmit = async (ev) => {
        ev.preventDefault();
        const v = U.leerForm(f);
        if (!U.marcarErrores(f, !v.motivo ? { motivo: 'Indique el motivo' } : {})) return;
        try {
          await U.conCarga(cu.querySelector('#cOk'), () => Ope.actualizarActividad(a, { estado: 'CANCELADO', motivo_cambio: v.motivo }, 'CAMBIO_ESTADO'));
          U.aviso('Actividad cancelada', 'ok'); U.cerrarModal(); if (alCambiar) alCambiar();
        } catch (e) { U.aviso(U.mensajeError(e), 'err', 7000); }
      };
    });
  }

  // =====================================================================
  // LISTA DE ACTIVIDADES
  // =====================================================================
  const filtros = { desde: null, hasta: null, tec: '', tipo: '', estado: 'ACTIVAS', alertas: false, q: '' };
  App.vistas.actividades = async function (c) {
    if (!filtros.desde) { filtros.desde = Ope.lunesDe(Ope.hoy()); filtros.hasta = Ope.sumar(filtros.desde, 34); }
    const tecOps = Ope.D.tecnicos.map((t) => '<option value="' + esc(t.Title) + '"' + (filtros.tec === t.Title ? ' selected' : '') + '>' + esc(t.nombre) + '</option>').join('');
    const tipoOps = Ope.D.tipos.map((t) => '<option value="' + esc(t.Title) + '"' + (filtros.tipo === t.Title ? ' selected' : '') + '>' + esc(t.nombre) + '</option>').join('');
    const estOps = [['ACTIVAS', 'Vigentes (sin canceladas ni reprogramadas)'], ['', 'Todos los estados']].concat(Ope.ESTADOS)
      .map((e) => '<option value="' + e[0] + '"' + (filtros.estado === e[0] ? ' selected' : '') + '>' + esc(e[1]) + '</option>').join('');
    c.innerHTML = '<a class="ic-volver" href="#">← Menú principal</a>' +
      '<div class="ic-barra"><div style="flex:1"><h1 class="ic-titulo">Actividades</h1><p class="ic-subtitulo" style="margin:0">Único lugar para registrar actividades. La validación se calcula sola.</p></div>' +
      (App.puedeEditar() ? '<button class="ic-btn" id="bNueva">+ Nueva actividad</button>' : '') + '</div>' +
      '<div class="ic-filtros">' +
        '<label class="ope-lbl">Desde <input type="date" id="fDesde" value="' + filtros.desde + '"></label>' +
        '<label class="ope-lbl">Hasta <input type="date" id="fHasta" value="' + filtros.hasta + '"></label>' +
        '<select id="fTec"><option value="">Todos los técnicos</option>' + tecOps + '</select>' +
        '<select id="fTipo"><option value="">Todos los tipos</option>' + tipoOps + '</select>' +
        '<select id="fEst">' + estOps + '</select>' +
        '<input id="fQ" class="ic-buscar" placeholder="Buscar cliente, ciudad o ticket" value="' + esc(filtros.q) + '" style="flex:1 1 200px">' +
        '<label class="ic-check"><input type="checkbox" id="fAl"' + (filtros.alertas ? ' checked' : '') + '> <span>Solo con ⚠</span></label>' +
      '</div><p class="ic-conteo" id="conteo"></p><div id="tabla"><div class="ic-vacio">Cargando…</div></div>';
    const bN = c.querySelector('#bNueva'); if (bN) bN.onclick = () => App.nuevaActividad({}, pintar);
    const leer = () => {
      filtros.desde = c.querySelector('#fDesde').value || filtros.desde; filtros.hasta = c.querySelector('#fHasta').value || filtros.hasta;
      filtros.tec = c.querySelector('#fTec').value; filtros.tipo = c.querySelector('#fTipo').value; filtros.estado = c.querySelector('#fEst').value;
      filtros.q = c.querySelector('#fQ').value; filtros.alertas = c.querySelector('#fAl').checked;
    };
    async function pintar() {
      leer();
      if (filtros.hasta < filtros.desde) { c.querySelector('#tabla').innerHTML = '<div class="ic-alerta">La fecha final es anterior a la inicial.</div>'; return; }
      try { await Ope.cargarRango(filtros.desde, filtros.hasta); }
      catch (e) { c.querySelector('#tabla').innerHTML = '<div class="ic-alerta">' + esc(U.mensajeError(e)) + '</div>'; return; }
      const q = U.norm(filtros.q);
      const lista = Ope.delRango(filtros.desde, filtros.hasta).filter((a) =>
        (!filtros.tec || a.tecnico_id === filtros.tec) && (!filtros.tipo || a.tipo === filtros.tipo) &&
        (filtros.estado === '' || (filtros.estado === 'ACTIVAS' ? Ope.activa(a) : a.estado === filtros.estado)) &&
        (!q || U.norm([a.cliente, a.ciudad, a.ticket_os, a.observaciones, a.Title].join(' ')).indexOf(q) >= 0) &&
        (!filtros.alertas || Ope.validar(a).errores.length));
      const nErr = lista.filter((a) => Ope.validar(a).errores.length).length;
      c.querySelector('#conteo').innerHTML = lista.length + ' actividades' + (nErr ? ' · <b class="ope-rojo">' + nErr + ' con conflictos ⚠</b>' : '');
      c.querySelector('#tabla').innerHTML = App.tablaActividades(lista);
      App.conectarTabla(c.querySelector('#tabla'), pintar);
    }
    c.querySelectorAll('.ic-filtros input, .ic-filtros select').forEach((el) => { el.addEventListener(el.id === 'fQ' ? 'input' : 'change', pintar); });
    pintar();
  };

  // =====================================================================
  // CONFLICTOS
  // =====================================================================
  App.vistas.conflictos = async function (c) {
    const desde = Ope.sumar(Ope.hoy(), -7), hasta = Ope.sumar(Ope.hoy(), 60);
    c.innerHTML = '<a class="ic-volver" href="#">← Menú principal</a><h1 class="ic-titulo">Conflictos</h1>' +
      '<p class="ic-subtitulo">Actividades vigentes con ⚠ entre ' + esc(Ope.textoFecha(desde)) + ' y ' + esc(Ope.textoFecha(hasta)) + '. Ábralas para corregirlas.</p><div id="sinOfi"></div><div id="tabla"><div class="ic-vacio">Cargando…</div></div>';
    async function pintar() {
      try { await Ope.cargarRango(desde, hasta); } catch (e) { c.querySelector('#tabla').innerHTML = '<div class="ic-alerta">' + esc(U.mensajeError(e)) + '</div>'; return; }
      const lista = Ope.delRango(desde, hasta).filter((a) => Ope.activa(a) && Ope.validar(a).errores.length);
      const dias = []; let s = Ope.hoy(); while (s <= hasta) { if (Ope.esHabil(s) && Ope.resumenDia(s).estado === 'SIN') dias.push(s); s = Ope.sumar(s, 1); }
      c.querySelector('#sinOfi').innerHTML = dias.length ? '<div class="ic-alerta"><b>' + dias.length + ' días hábiles sin técnico de oficina:</b> ' + dias.map((d) => esc(Ope.textoFecha(d))).join(' · ') + ' <a class="ic-btn chico" href="#rotacion">Ir a rotación</a></div>' : '';
      c.querySelector('#tabla').innerHTML = lista.length ? App.tablaActividades(lista) : '<div class="ic-tabla-caja"><div class="ic-vacio">✔ No hay conflictos en este periodo.</div></div>';
      App.conectarTabla(c.querySelector('#tabla'), pintar);
    }
    pintar();
  };

  // =====================================================================
  // MI AGENDA (técnicos)
  // =====================================================================
  App.vistas.mia = async function (c) {
    const t = App.usuario.tecnico;
    if (!t) { c.innerHTML = '<a class="ic-volver" href="#">← Menú principal</a><div class="ic-alerta">Su correo no está asociado a un técnico en OPE_Tecnicos.</div>'; return; }
    const desde = Ope.sumar(Ope.hoy(), -7), hasta = Ope.sumar(Ope.hoy(), 21);
    c.innerHTML = '<a class="ic-volver" href="#">← Menú principal</a><h1 class="ic-titulo">Mi agenda</h1><p class="ic-subtitulo">' + esc(t.nombre) + ' · del ' + esc(Ope.textoFecha(desde)) + ' al ' + esc(Ope.textoFecha(hasta)) + '</p><div id="lista"><div class="ic-vacio">Cargando…</div></div>';
    async function pintar() {
      await Ope.cargarRango(desde, hasta);
      const mias = Ope.delRango(desde, hasta).filter((a) => a.tecnico_id === t.Title && Ope.activa(a));
      let html = '', s = desde;
      while (s <= hasta) {
        const del = mias.filter((a) => a.fecha === s);
        if (del.length || (Ope.esHabil(s) && s >= Ope.hoy())) {
          html += '<div class="ope-mia-dia' + (s === Ope.hoy() ? ' hoy' : '') + '"><div class="f"><b>' + esc(Ope.textoFecha(s, true)) + '</b>' + (s === Ope.hoy() ? ' <span class="ic-tag cliente">Hoy</span>' : '') + '</div>' +
            (del.length ? del.map((a) => '<div class="ope-mia-item" data-id="' + esc(a.Title) + '">' + App.chipTipo(a.tipo) + ' <b>' + esc(Ope.nombreTipo(a.tipo)) + '</b> ' + esc(a.cliente && a.tipo !== 'OFI' ? '· ' + a.cliente : '') +
              '<span class="sec">' + esc([a.ciudad, a.hora_inicio, a.equipos ? a.equipos + ' equipo(s)' : '', a.ticket_os].filter(Boolean).join(' · ')) + '</span> ' + App.tagEstado(a.estado) + '</div>').join('')
              : (Ope.esHabil(s) ? '<div class="ope-nota">Sin asignar: por política debe estar en la oficina apoyando al técnico de turno.</div>' : '')) + '</div>';
        }
        s = Ope.sumar(s, 1);
      }
      c.querySelector('#lista').innerHTML = html || '<div class="ic-vacio">Sin actividades.</div>';
      c.querySelectorAll('.ope-mia-item').forEach((el) => { el.onclick = () => App.abrirActividad(Ope.buscar(el.dataset.id), pintar); });
    }
    pintar().catch((e) => { c.querySelector('#lista').innerHTML = '<div class="ic-alerta">' + esc(U.mensajeError(e)) + '</div>'; });
  };
})();
