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
      '<th>Fecha</th><th>Técnico</th><th>Tipo</th><th>Sitio / cliente</th><th class="ocultar-movil">Eq.</th><th class="ocultar-movil">Hora</th><th class="ocultar-movil">Ticket / OS</th><th>Estado</th><th>Validación</th></tr></thead><tbody>' +
      lista.map((a) => {
        const v = Ope.activa(a) ? Ope.validar(a) : { errores: [] };
        return '<tr data-id="' + esc(a.Title) + '" class="' + (v.errores.length ? 'ope-fila-err' : '') + (!Ope.activa(a) ? ' inactivo' : '') + '">' +
          '<td><b>' + esc(Ope.textoFecha(a.fecha)) + '</b><span class="sec">' + esc(Ope.DIAS[Ope.dow(a.fecha) - 1]) + (Ope.esFestivo(a.fecha) ? ' · festivo' : '') + '</span></td>' +
          '<td>' + esc(Ope.nombreTec(a.tecnico_id)) + '</td>' +
          '<td>' + App.chipTipo(a.tipo) + '<span class="sec">' + esc(Ope.nombreTipo(a.tipo)) + '</span></td>' +
          '<td>' + (a.sitio ? esc(a.sitio) + '<span class="sec">Cliente: ' + esc(a.cliente || '—') + (a.ciudad ? ' · ' + esc(a.ciudad) : '') + '</span>' : esc(a.cliente || '') + '<span class="sec">' + esc(a.ciudad || '') + '</span>') + '</td>' +
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
      '<div class="ic-campo c6"><label for="f_cliente">Cliente (contrata y paga)</label><input id="f_cliente" name="cliente" list="dlEmpresas" value="' + esc(a.cliente || '') + '" placeholder="Ej.: Casa Limpia · o «Oficina»">' +
        '<datalist id="dlEmpresas">' + empresas.map((e) => '<option value="' + esc(e.razon_social) + '">').join('') + '</datalist>' +
        '<span class="ayuda" id="ayEmpresa"></span></div>' +
      '<div class="ic-campo c6"><label for="f_sitio">Sitio / cliente final (dónde se instala)</label><input id="f_sitio" name="sitio" list="dlSitios" value="' + esc(a.sitio || '') + '" placeholder="Ej.: Clínica Los Nogales · vacío si es el mismo cliente">' +
        '<datalist id="dlSitios"></datalist><span class="ayuda">Si el servicio es para un cliente de su cliente (p. ej. los clientes de Casa Limpia).</span></div>' +
      U.campo({ name: 'ciudad', label: 'Ciudad', valor: a.ciudad, c: 'c3', ph: 'Siempre la ciudad' }) +
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
        cuerpo.querySelector('#ayEmpresa').textContent = emp ? '✔ Empresa ' + emp.Title + ' de la app Comercial' : (p.cliente && U.norm(p.cliente) !== 'oficina' ? 'No está registrada en la app Comercial (se guarda como texto). Regístrela en Comercial › Empresas para que aparezca en la lista.' : '');
        cuerpo.querySelector('#dlSitios').innerHTML = Ope.sitiosConocidos(p.cliente).map((x) => '<option value="' + esc(x) + '">').join('');
        if (!p.fecha) return;
        try { await Ope.cargarMes(Ope.ym(p.fecha)); } catch (e) { /* sin conexión: se valida con lo que hay */ }
        if (n !== turno) return;
        await Ope.catalogosFrescos(60);
        if (n !== turno) return;
        const v = Ope.validar(p);
        cuerpo.querySelector('#ayCarga').textContent = v.carga !== null ? 'Carga del día: ' + Math.round(v.carga * 100) + ' %' : '';
        const finde = Ope.dow(p.fecha) > 5 || Ope.esFestivo(p.fecha);
        cuerpo.querySelector('#cAut').hidden = !(App.esAdmin() && finde);
        cuerpo.querySelector('#valPanel').innerHTML = !Ope.activa(p) ? '' :
          (v.errores.length ? '<div class="ope-v err"><b>⚠ Conflictos</b><ul>' + v.errores.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
            (v.faltaHab && App.esAdmin() ? '<button type="button" class="ic-btn sec chico" id="bHab">Habilitar a ' + esc(Ope.nombreTec(v.faltaHab.tecnico)) + ' para ' + esc(Ope.nombreTipo(v.faltaHab.tipo)) + '</button>' : '') + '</div>' : '<div class="ope-v ok">✔ Sin conflictos</div>') +
          (v.avisos.length ? '<div class="ope-v warn"><b>ℹ Para revisar</b><ul>' + v.avisos.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : '');
        const bh = cuerpo.querySelector('#bHab');
        if (bh) bh.onclick = () => U.conCarga(bh, async () => {
          try {
            await Ope.cargarCatalogos();
            const t = Ope.tec(v.faltaHab.tecnico);
            if (t && !Ope.puede(t, v.faltaHab.tipo)) {
              const hab = Ope.habilidades(t).concat([v.faltaHab.tipo]).join(';');
              await IC.graph.actualizar('OPE_Tecnicos', t._id, { habilidades: hab }, t._etag);
              await Ope.auditar('TECNICO', t.Title, 'ACTUALIZAR', { habilidades: t.habilidades }, { habilidades: hab });
              await Ope.cargarCatalogos();
            }
            U.aviso('Habilidad agregada en la matriz', 'ok'); refrescar();
          } catch (e) { U.aviso(U.mensajeError(e), 'err', 7000); }
        });
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
        await Ope.catalogosFrescos(5);
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
  const filtros = { desde: null, hasta: null, tec: '', tipo: '', estado: 'ACTIVAS', alertas: false, q: '', cli: '' };
  let listaActual = [];
  App.vistas.actividades = async function (c) {
    if (!filtros.desde) { filtros.desde = Ope.lunesDe(Ope.hoy()); filtros.hasta = Ope.sumar(filtros.desde, 34); }
    const tecOps = Ope.D.tecnicos.map((t) => '<option value="' + esc(t.Title) + '"' + (filtros.tec === t.Title ? ' selected' : '') + '>' + esc(t.nombre) + '</option>').join('');
    const tipoOps = Ope.D.tipos.map((t) => '<option value="' + esc(t.Title) + '"' + (filtros.tipo === t.Title ? ' selected' : '') + '>' + esc(t.nombre) + '</option>').join('');
    const estOps = [['ACTIVAS', 'Vigentes (sin canceladas ni reprogramadas)'], ['', 'Todos los estados']].concat(Ope.ESTADOS)
      .map((e) => '<option value="' + e[0] + '"' + (filtros.estado === e[0] ? ' selected' : '') + '>' + esc(e[1]) + '</option>').join('');
    c.innerHTML = '<a class="ic-volver" href="#">← Menú principal</a>' +
      '<div class="ic-barra"><div style="flex:1"><h1 class="ic-titulo">Actividades</h1><p class="ic-subtitulo" style="margin:0">Único lugar para registrar actividades. La validación se calcula sola.</p></div>' +
      '<button class="ic-btn sec" id="bExportar" title="Excel o impresión / PDF de las actividades del rango, por cliente">Exportar / Imprimir</button>' +
      (App.puedeEditar() ? '<button class="ic-btn sec" id="bAsignar" title="Asigna el cliente que contrata a las actividades filtradas">Asignar cliente…</button><button class="ic-btn" id="bNueva">+ Nueva actividad</button>' : '') + '</div>' +
      '<div class="ic-filtros">' +
        '<label class="ope-lbl">Desde <input type="date" id="fDesde" value="' + filtros.desde + '"></label>' +
        '<label class="ope-lbl">Hasta <input type="date" id="fHasta" value="' + filtros.hasta + '"></label>' +
        '<select id="fTec"><option value="">Todos los técnicos</option>' + tecOps + '</select>' +
        '<select id="fTipo"><option value="">Todos los tipos</option>' + tipoOps + '</select>' +
        '<select id="fEst">' + estOps + '</select>' +
        '<select id="fCli"><option value="">Todos los clientes</option></select>' +
        '<input id="fQ" class="ic-buscar" placeholder="Buscar cliente, sitio, ciudad o ticket" value="' + esc(filtros.q) + '" style="flex:1 1 200px">' +
        '<label class="ic-check"><input type="checkbox" id="fAl"' + (filtros.alertas ? ' checked' : '') + '> <span>Solo con ⚠</span></label>' +
      '</div><p class="ic-conteo" id="conteo"></p><div id="tabla"><div class="ic-vacio">Cargando…</div></div>';
    const bN = c.querySelector('#bNueva'); if (bN) bN.onclick = () => App.nuevaActividad({}, pintar);
    c.querySelector('#bExportar').onclick = () => elegirSalida(listaActual, filtros);
    const bA = c.querySelector('#bAsignar'); if (bA) bA.onclick = () => asignarCliente(listaActual, pintar);
    const leer = () => {
      filtros.desde = c.querySelector('#fDesde').value || filtros.desde; filtros.hasta = c.querySelector('#fHasta').value || filtros.hasta;
      filtros.tec = c.querySelector('#fTec').value; filtros.tipo = c.querySelector('#fTipo').value; filtros.estado = c.querySelector('#fEst').value;
      filtros.q = c.querySelector('#fQ').value; filtros.alertas = c.querySelector('#fAl').checked; filtros.cli = c.querySelector('#fCli').value;
    };
    async function pintar() {
      leer();
      if (filtros.hasta < filtros.desde) { c.querySelector('#tabla').innerHTML = '<div class="ic-alerta">La fecha final es anterior a la inicial.</div>'; return; }
      try { await Ope.cargarRango(filtros.desde, filtros.hasta); }
      catch (e) { c.querySelector('#tabla').innerHTML = '<div class="ic-alerta">' + esc(U.mensajeError(e)) + '</div>'; return; }
      const q = U.norm(filtros.q);
      // clientes del rango para el filtro
      const sel = c.querySelector('#fCli'), clis = {};
      Ope.delRango(filtros.desde, filtros.hasta).forEach((a) => { if (a.cliente && a.tipo !== 'OFI' && a.tipo !== 'AUS') clis[U.norm(a.cliente)] = a.cliente; });
      sel.innerHTML = '<option value="">Todos los clientes</option>' + Object.keys(clis).sort().map((k) => '<option value="' + esc(k) + '"' + (k === filtros.cli ? ' selected' : '') + '>' + esc(clis[k]) + '</option>').join('');
      if (filtros.cli && !clis[filtros.cli]) filtros.cli = '';
      const lista = Ope.delRango(filtros.desde, filtros.hasta).filter((a) =>
        (!filtros.tec || a.tecnico_id === filtros.tec) && (!filtros.tipo || a.tipo === filtros.tipo) &&
        (filtros.estado === '' || (filtros.estado === 'ACTIVAS' ? Ope.activa(a) : a.estado === filtros.estado)) &&
        (!q || U.norm([a.cliente, a.sitio, a.ciudad, a.ticket_os, a.observaciones, a.Title].join(' ')).indexOf(q) >= 0) &&
        (!filtros.cli || U.norm(a.cliente) === filtros.cli) &&
        (!filtros.alertas || Ope.validar(a).errores.length));
      const nErr = lista.filter((a) => Ope.validar(a).errores.length).length;
      c.querySelector('#conteo').innerHTML = lista.length + ' actividades' + (nErr ? ' · <b class="ope-rojo">' + nErr + ' con conflictos ⚠</b>' : '');
      listaActual = lista;
      c.querySelector('#tabla').innerHTML = App.tablaActividades(lista);
      App.conectarTabla(c.querySelector('#tabla'), pintar);
    }
    c.querySelectorAll('.ic-filtros input, .ic-filtros select').forEach((el) => { el.addEventListener(el.id === 'fQ' ? 'input' : 'change', pintar); });
    pintar();
  };

  // =====================================================================
  // EXPORTAR A EXCEL (rango y filtros de la lista)
  // =====================================================================
  function cargarXLSX() {
    if (window.XLSX) return Promise.resolve();
    return new Promise((ok, mal) => {
      const sc = document.createElement('script');
      sc.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      sc.onload = ok; sc.onerror = () => mal(new Error('No se pudo cargar la librería de Excel. Revise la conexión e intente de nuevo.'));
      document.head.appendChild(sc);
    });
  }
  // ---------- Elegir clientes y formato (Excel o impresión) ----------
  const claveCli = (a) => U.norm(a.cliente || '') || '(sin cliente)';
  function elegirSalida(lista, f) {
    if (!lista.length) { U.aviso('No hay actividades con estos filtros.', 'warn'); return; }
    const clis = {};
    lista.forEach((a) => { const k = claveCli(a); if (!clis[k]) clis[k] = { nombre: a.cliente || '(sin cliente)', n: 0, interna: a.tipo === 'OFI' || a.tipo === 'AUS' }; clis[k].n++; if (a.tipo !== 'OFI' && a.tipo !== 'AUS') clis[k].interna = false; });
    const claves = Object.keys(clis).sort((a, b) => clis[a].interna - clis[b].interna || clis[a].nombre.localeCompare(clis[b].nombre));
    U.modal('Exportar o imprimir', '<form class="ic-form" id="fSal"><p style="margin-top:0">Actividades del <b>' + esc(Ope.textoFecha(f.desde)) + '</b> al <b>' + esc(Ope.textoFecha(f.hasta)) + '</b> con los filtros de la lista.</p>' +
      '<div class="ope-sal-cab"><b>Clientes</b><span><button type="button" class="ic-btn sec chico" data-t="1">Todos</button> <button type="button" class="ic-btn sec chico" data-t="0">Ninguno</button></span></div>' +
      '<div class="ope-sal-lista">' + claves.map((k) => '<label class="ic-check"><input type="checkbox" data-cli="' + esc(k) + '"' + (clis[k].interna ? '' : ' checked') + '> <span>' + esc(clis[k].nombre) + ' <small>(' + clis[k].n + ')</small></span></label>').join('') + '</div>' +
      '<div class="ic-campos" style="margin-top:12px">' +
      '<div class="ic-campo c12"><label class="ic-check"><input type="checkbox" name="pagina"> <span>Cada cliente en una página aparte (para enviarle su programación). Sin marcar: todo de corrido, en orden de fecha</span></label></div>' +
      '<div class="ic-campo c12"><label class="ic-check"><input type="checkbox" name="obs"> <span>Incluir observaciones</span></label></div>' +
      '</div>' +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="sNo">Cancelar</button><button type="button" class="ic-btn sec" id="sXls">Excel</button><button type="button" class="ic-btn" id="sImp">Imprimir / PDF</button></div></form>',
    (cu) => {
      const f2 = cu.querySelector('#fSal');
      cu.querySelectorAll('[data-t]').forEach((b) => { b.onclick = () => cu.querySelectorAll('[data-cli]').forEach((x) => { x.checked = b.dataset.t === '1'; }); });
      cu.querySelector('#sNo').onclick = U.cerrarModal;
      const elegidos = () => { const sel = new Set(Array.from(cu.querySelectorAll('[data-cli]')).filter((x) => x.checked).map((x) => x.dataset.cli)); return lista.filter((a) => sel.has(claveCli(a))); };
      const op = () => U.leerForm(f2);
      cu.querySelector('#sXls').onclick = () => { const l = elegidos(); if (!l.length) { U.aviso('Elija al menos un cliente.', 'warn'); return; } exportar(l, f, cu.querySelector('#sXls')); };
      cu.querySelector('#sImp').onclick = () => { const l = elegidos(); if (!l.length) { U.aviso('Elija al menos un cliente.', 'warn'); return; } imprimir(l, f, op()); };
    });
  }

  // ---------- Informe para imprimir o guardar como PDF ----------
  function imprimir(lista, f, op) {
    const grupos = {};
    lista.forEach((a) => { const k = claveCli(a); (grupos[k] = grupos[k] || { nombre: a.cliente || '(sin cliente)', acts: [] }).acts.push(a); });
    const claves = Object.keys(grupos).sort((a, b) => grupos[a].nombre.localeCompare(grupos[b].nombre));
    const logo = location.origin + CFG.logo;
    // Un solo informe en orden de fecha (con columna Cliente) o una página por cliente; siempre de la fecha más antigua a la más reciente
    const unaTabla = claves.length > 1 && !op.pagina;
    // Vertical, de corrido y sin desbordar: columnas con ancho fijo y texto que se ajusta
    const filaHtml = (a) => '<tr class="' + (Ope.activa(a) ? '' : 'anulada') + '">' +
      '<td><b>' + esc(Ope.DIAS[Ope.dow(a.fecha) - 1].slice(0, 3)) + '</b> ' + esc(Ope.textoFecha(a.fecha)) + '</td>' +
      '<td>' + esc(a.cliente || '(sin cliente)') + (a.sitio ? '<small>' + esc(a.sitio) + '</small>' : '') + '</td>' +
      '<td>' + esc(a.ciudad || '') + '</td><td>' + esc(Ope.nombreTipo(a.tipo)) + '</td><td>' + esc(Ope.nombreTec(a.tecnico_id)) + '</td>' +
      '<td class="n">' + esc(Ope.usaEquipos(a.tipo) && a.equipos !== '' ? a.equipos : '') + '</td><td>' + esc(a.hora_inicio || '') + '</td><td>' + esc(a.ticket_os || '') + '</td><td>' + esc(Ope.nombreEstado(a.estado)) + '</td>' +
      (op.obs ? '<td>' + esc(a.observaciones || '') + '</td>' : '') + '</tr>';
    const anchos = op.obs ? [13, 17, 8, 10, 12, 4, 6, 8, 9, 13] : [14, 21, 10, 11, 14, 4, 6, 10, 10];
    const cab = '<colgroup>' + anchos.map((w) => '<col style="width:' + w + '%">').join('') + '</colgroup><thead><tr><th>Fecha</th><th>Cliente / sitio</th><th>Ciudad</th><th>Tipo</th><th>Técnico</th><th class="n">Eq.</th><th>Hora</th><th>Ticket / OS</th><th>Estado</th>' + (op.obs ? '<th>Observaciones</th>' : '') + '</tr></thead>';
    const encabezado = (titulo) => '<div class="cab"><img src="' + logo + '" alt="Ideas Control"><div><h1>' + esc(titulo) + '</h1><p>Programación de servicios · ' + esc(Ope.textoFecha(f.desde)) + ' al ' + esc(Ope.textoFecha(f.hasta)) + '</p></div></div>';
    let cuerpo = '';
    if (claves.length > 1 && !op.pagina) {
      cuerpo += encabezado('Programación de servicios') + '<table class="res"><thead><tr><th>Cliente</th><th class="n">Actividades</th><th class="n">Ejecutadas</th><th class="n">Equipos</th></tr></thead><tbody>' +
        claves.map((k) => { const g = grupos[k].acts.filter(Ope.activa); return '<tr><td>' + esc(grupos[k].nombre) + '</td><td class="n">' + g.length + '</td><td class="n">' + g.filter((a) => a.estado === 'EJECUTADO').length + '</td><td class="n">' + g.filter((a) => Ope.usaEquipos(a.tipo)).reduce((s, a) => s + (Number(a.equipos) || 0), 0) + '</td></tr>'; }).join('') + '</tbody></table>';
    }
    if (unaTabla) {
      const vig = lista.filter(Ope.activa);
      cuerpo += '<h2>Detalle por fecha</h2><p class="tot">' + vig.length + ' actividades vigentes · ' + vig.filter((a) => a.estado === 'EJECUTADO').length + ' ejecutada(s)</p>' +
        '<table class="det">' + cab + '<tbody>' + lista.slice().sort(Ope.orden).map(filaHtml).join('') + '</tbody></table>';
    } else claves.forEach((k, i) => {
      const g = grupos[k], vig = g.acts.filter(Ope.activa);
      const eq = vig.filter((a) => Ope.usaEquipos(a.tipo)).reduce((s, a) => s + (Number(a.equipos) || 0), 0);
      cuerpo += '<section class="' + (op.pagina && i > 0 ? 'salto' : '') + '">' + (op.pagina || claves.length === 1 ? encabezado(g.nombre) : '<h2>' + esc(g.nombre) + '</h2>') +
        '<p class="tot">' + vig.length + ' actividad' + (vig.length === 1 ? '' : 'es') + ' vigente' + (vig.length === 1 ? '' : 's') + (eq ? ' · ' + eq + ' equipo' + (eq === 1 ? '' : 's') : '') + ' · ' + vig.filter((a) => a.estado === 'EJECUTADO').length + ' ejecutada(s)' +
        (g.acts.length > vig.length ? ' · ' + (g.acts.length - vig.length) + ' cancelada(s) o reprogramada(s)' : '') + '</p>' +
        '<table class="det">' + cab + '<tbody>' + g.acts.slice().sort(Ope.orden).map(filaHtml).join('') + '</tbody></table></section>';
    });
    const html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Programación ' + esc(f.desde) + ' a ' + esc(f.hasta) + '</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"><style>' +
      '@page{size:A4 portrait;margin:12mm 10mm}*{box-sizing:border-box}body{font-family:Inter,Arial,sans-serif;color:#1D2B36;margin:0;font-size:10px}' +
      '.cab{display:flex;align-items:center;gap:16px;border-bottom:3px solid #C9A227;padding-bottom:10px;margin-bottom:12px}.cab img{height:40px}.cab h1{font-size:18px;margin:0;color:#0E76BC}.cab p{margin:2px 0 0;color:#5B6770}' +
      'h2{font-size:15px;color:#0E76BC;margin:18px 0 4px}.tot{margin:0 0 6px;color:#5B6770}' +
      'table{width:100%;border-collapse:collapse;margin-bottom:10px}table.det{table-layout:fixed}th{background:#EEF4F9;text-align:left;font-size:8.5px;text-transform:uppercase;letter-spacing:.02em;color:#0A5A90;padding:5px 4px;border-bottom:1px solid #C9D6E2}' +
      'td{padding:4px;border-bottom:1px solid #E6ECF1;vertical-align:top;overflow-wrap:anywhere;word-break:normal}td:first-child{white-space:nowrap}td small{display:block;color:#5B6770;font-size:9px;margin-top:1px}.n{text-align:center}tr.anulada td{color:#9AA5AE;text-decoration:line-through}' +
      'table.res{max-width:640px}.salto{break-before:page}thead{display:table-header-group}tr{break-inside:avoid}' +
      '.pie{margin-top:14px;color:#8A96A0;font-size:10px}.barra{position:fixed;top:0;right:0;padding:10px}.barra button{font:inherit;font-weight:600;padding:8px 14px;border:0;border-radius:8px;background:#0E76BC;color:#fff;cursor:pointer}' +
      '@media print{.barra{display:none}}</style></head><body><div class="barra"><button onclick="window.print()">Imprimir / Guardar PDF</button></div>' + cuerpo +
      '<p class="pie">Ideas Control Equipos y Soluciones S.A.S. · Generado ' + esc(new Date().toLocaleString('es-CO')) + ' por ' + esc(App.usuario.nombre) + '</p>' +
      '<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},400)})<\/script></body></html>';
    const w = window.open('', '_blank');
    if (!w) { U.aviso('El navegador bloqueó la ventana de impresión. Permita ventanas emergentes para mykadosh.com.', 'warn', 8000); return; }
    w.document.open(); w.document.write(html); w.document.close();
    U.cerrarModal();
  }

  async function exportar(lista, f, boton) {
    if (!lista.length) { U.aviso('No hay actividades para exportar con estos filtros.', 'warn'); return; }
    const txt = boton.textContent; boton.disabled = true; boton.textContent = 'Generando…';
    try {
      await cargarXLSX();
      // Fecha como número de serie de Excel (sin zona horaria, para que no cambie de día)
      const fecha = (s) => { const [y, m, d] = s.split('-').map(Number); return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 864e5; };
      const filas = lista.map((a) => {
        const t = Ope.tec(a.tecnico_id);
        return {
          'N°': a.Title, 'Fecha': fecha(a.fecha), 'Día': Ope.DIAS[Ope.dow(a.fecha) - 1], 'Técnico': Ope.nombreTec(a.tecnico_id),
          'Vinculación': t ? (t.vinculacion === 'TECNICO_CAMPO' ? 'Técnico de campo' : 'Ideas Control') : '', 'Tipo': Ope.nombreTipo(a.tipo), 'Cód.': a.tipo,
          'Cliente (contrata)': a.cliente || '', 'Sitio / cliente final': a.sitio || '', 'Ciudad': a.ciudad || '',
          'Equipos': a.equipos === '' || a.equipos === undefined ? '' : Number(a.equipos), 'Hora inicio': a.hora_inicio || '', 'Ticket / OS': a.ticket_os || '',
          'Estado': Ope.nombreEstado(a.estado), 'Observaciones': a.observaciones || '', 'Reprograma de': a.reprograma_de || '', 'Motivo del cambio': a.motivo_cambio || ''
        };
      });
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(filas);
      ws['!cols'] = [10, 11, 10, 20, 14, 18, 6, 26, 30, 14, 8, 10, 14, 12, 40, 12, 24].map((w) => ({ wch: w }));
      Object.keys(ws).forEach((k) => { if (/^B\d+$/.test(k) && k !== 'B1') ws[k].z = 'dd/mm/yyyy'; });
      ws['!autofilter'] = { ref: ws['!ref'] };
      XLSX.utils.book_append_sheet(wb, ws, 'Actividades');
      // Resumen por cliente que contrata (base para la cuenta de cobro)
      const res = {};
      lista.filter((a) => Ope.activa(a) && a.tipo !== 'OFI' && a.tipo !== 'AUS').forEach((a) => {
        const k = (a.cliente || '(sin cliente)') + '|' + a.tipo;
        const r = res[k] || (res[k] = { 'Cliente (contrata)': a.cliente || '(sin cliente)', 'Tipo': Ope.nombreTipo(a.tipo), 'Actividades': 0, 'Ejecutadas': 0, 'Equipos programados': 0, 'Equipos ejecutados': 0, _s: new Set() });
        const eq = Ope.usaEquipos(a.tipo) ? (Number(a.equipos) || 0) : 0;
        r['Actividades']++; r['Equipos programados'] += eq;
        if (a.estado === 'EJECUTADO') { r['Ejecutadas']++; r['Equipos ejecutados'] += eq; }
        r._s.add(a.sitio || a.cliente || '');
      });
      const resumen = Object.values(res).sort((x, y) => x['Cliente (contrata)'].localeCompare(y['Cliente (contrata)']) || x['Tipo'].localeCompare(y['Tipo']))
        .map((r) => { const o = Object.assign({}, r, { 'Sitios distintos': r._s.size }); delete o._s; return o; });
      const ws2 = XLSX.utils.json_to_sheet(resumen.length ? resumen : [{ 'Cliente (contrata)': 'Sin actividades de campo en el rango' }]);
      ws2['!cols'] = [30, 20, 12, 12, 18, 18, 14].map((w) => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, ws2, 'Resumen por cliente');
      const ws3 = XLSX.utils.aoa_to_sheet([['Programación de Operaciones · Ideas Control Equipos y Soluciones S.A.S.'], ['Rango', Ope.textoFecha(f.desde) + ' a ' + Ope.textoFecha(f.hasta)],
        ['Técnico', f.tec ? Ope.nombreTec(f.tec) : 'Todos'], ['Tipo', f.tipo ? Ope.nombreTipo(f.tipo) : 'Todos'], ['Estado', f.estado === 'ACTIVAS' ? 'Vigentes (sin canceladas ni reprogramadas)' : f.estado ? Ope.nombreEstado(f.estado) : 'Todos'],
        ['Cliente', f.cli ? (lista[0] && lista[0].cliente) || f.cli : 'Todos'], ['Búsqueda', f.q || '—'], ['Actividades', lista.length], ['Generado', new Date().toLocaleString('es-CO') + ' por ' + App.usuario.nombre]]);
      ws3['!cols'] = [{ wch: 14 }, { wch: 60 }];
      XLSX.utils.book_append_sheet(wb, ws3, 'Filtros');
      XLSX.writeFile(wb, 'Programacion_IC_' + f.desde + '_a_' + f.hasta + '.xlsx');
      U.aviso('Archivo descargado (' + lista.length + ' actividades)', 'ok');
    } catch (e) { U.aviso(U.mensajeError(e), 'err', 7000); }
    finally { boton.disabled = false; boton.textContent = txt; }
  }

  // =====================================================================
  // ASIGNAR CLIENTE QUE CONTRATA A LAS ACTIVIDADES FILTRADAS
  // (p. ej. las instalaciones de los clientes de Casa Limpia)
  // =====================================================================
  async function asignarCliente(lista, alCambiar) {
    const objetivo = lista.filter((a) => Ope.activa(a) && a.tipo !== 'OFI' && a.tipo !== 'AUS');
    if (!objetivo.length) { U.aviso('Filtre primero las actividades (fechas, tipo, búsqueda…). No se incluyen oficina ni ausencias.', 'warn'); return; }
    const empresas = await Ope.empresas();
    U.modal('Asignar cliente que contrata', '<form class="ic-form" id="fAC"><p style="margin-top:0">Se actualizarán <b>' + objetivo.length + '</b> actividades de la lista filtrada (sin oficina ni ausencias).</p><div class="ic-campos">' +
      '<div class="ic-campo c12"><label for="f_cli">Cliente (contrata y paga)</label><input id="f_cli" name="cli" list="dlEmp2" placeholder="Ej.: Casa Limpia"><datalist id="dlEmp2">' + empresas.map((e) => '<option value="' + esc(e.razon_social) + '">').join('') + '</datalist><span class="ayuda" id="ayCli"></span></div>' +
      '<div class="ic-campo c12"><label class="ic-check"><input type="checkbox" name="mover" checked> <span>Pasar el cliente actual a «Sitio / cliente final» (cuando el sitio está vacío)</span></label>' +
      '<span class="ayuda">Úselo con las actividades importadas del Excel, donde la columna Cliente traía el sitio (Compensar, Colsanitas…).</span></div></div>' +
      '<div class="ic-tabla-caja" style="max-height:220px;overflow:auto;margin-top:10px"><table class="ic-tabla"><tbody>' +
      objetivo.slice(0, 60).map((a) => '<tr style="cursor:default"><td>' + esc(Ope.textoFecha(a.fecha)) + '</td><td>' + esc(Ope.nombreTec(a.tecnico_id)) + '</td><td>' + esc(a.cliente || '') + (a.sitio ? ' › ' + esc(a.sitio) : '') + '</td></tr>').join('') +
      (objetivo.length > 60 ? '<tr><td colspan="3" class="ope-nota">… y ' + (objetivo.length - 60) + ' más</td></tr>' : '') + '</tbody></table></div>' +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="acNo">Cancelar</button><button class="ic-btn" id="acOk">Actualizar ' + objetivo.length + ' actividades</button></div></form>',
    (cu) => {
      const f = cu.querySelector('#fAC');
      cu.querySelector('#acNo').onclick = U.cerrarModal;
      f.addEventListener('input', () => {
        const e = empresas.find((x) => U.norm(x.razon_social) === U.norm(f.cli.value));
        cu.querySelector('#ayCli').textContent = e ? '✔ Empresa ' + e.Title + ' de la app Comercial' : f.cli.value ? 'No está registrada en la app Comercial (se guarda como texto).' : '';
      });
      f.onsubmit = async (ev) => {
        ev.preventDefault();
        const v = U.leerForm(f);
        if (!U.marcarErrores(f, !v.cli ? { cli: 'Escriba el cliente' } : {})) return;
        const emp = empresas.find((x) => U.norm(x.razon_social) === U.norm(v.cli));
        const b = cu.querySelector('#acOk'); b.disabled = true;
        let n = 0;
        try {
          for (const a of objetivo) {
            b.textContent = 'Actualizando ' + (++n) + ' de ' + objetivo.length + '…';
            const cambios = { cliente: emp ? emp.razon_social : v.cli, empresa_id: emp ? emp.Title : '' };
            if (v.mover && !a.sitio && a.cliente && U.norm(a.cliente) !== U.norm(cambios.cliente)) cambios.sitio = a.cliente;
            if (U.norm(a.cliente) === U.norm(cambios.cliente) && a.empresa_id === cambios.empresa_id && !cambios.sitio) continue;
            await Ope.actualizarActividad(a, cambios);
          }
          U.aviso(objetivo.length + ' actividades actualizadas', 'ok'); U.cerrarModal(); alCambiar();
        } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); b.disabled = false; b.textContent = 'Reintentar'; alCambiar(); }
      };
    });
  }

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
            (del.length ? del.map((a) => '<div class="ope-mia-item" data-id="' + esc(a.Title) + '">' + App.chipTipo(a.tipo) + ' <b>' + esc(Ope.nombreTipo(a.tipo)) + '</b> ' + esc((a.sitio || a.cliente) && a.tipo !== 'OFI' ? '· ' + (a.sitio || a.cliente) + (a.sitio && a.cliente ? ' (' + a.cliente + ')' : '') : '') +
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
