/* =====================================================================
   APP-107 · Novedades — Faltas del personal (solo Dirección de Operaciones)
   Lista NOV_Faltas. El instalador (paso 5) deja la lista con permisos únicos:
   solo quien la configura (Dirección) la puede abrir en SharePoint.
   ===================================================================== */
(function () {
  const U = IC.ui, esc = U.esc, G = IC.graph;
  const nom = (lista, v) => (lista.find((x) => x[0] === v) || [v, v || ''])[1];
  let faltas = [], filtroTec = '';

  App.vistas.faltas = async function (c) {
    if (!App.esAdmin()) { location.hash = ''; return; }
    c.innerHTML = '<a class="ic-volver" href="#">← Menú principal</a><div class="ic-barra"><div style="flex:1"><h1 class="ic-titulo">Faltas</h1>' +
      '<p class="ic-subtitulo" style="margin:0">Registro confidencial de la Dirección de Operaciones. El procedimiento disciplinario sigue el Reglamento Interno de Trabajo (' + esc(CFG.manual) + ').</p></div>' +
      '<button class="ic-btn" id="bNueva">+ Registrar falta</button></div><div id="res"></div>' +
      '<div class="ic-filtros"><select id="fT"><option value="">Todo el personal</option>' + Ope.D.personal.map((t) => '<option value="' + esc(t.Title) + '">' + esc(t.nombre) + '</option>').join('') + '</select></div><div id="t"><div class="ic-vacio">Cargando…</div></div>';
    c.querySelector('#fT').value = filtroTec;
    c.querySelector('#fT').onchange = (e) => { filtroTec = e.target.value; dibujar(); };
    c.querySelector('#bNueva').onclick = () => form(null, pintar);
    async function pintar() {
      try { faltas = (await G.items('NOV_Faltas', { top: 999 })).map((f) => Object.assign(f, { fecha: Ope.dia(f.fecha) })).sort((a, b) => b.fecha.localeCompare(a.fecha)); }
      catch (e) { c.querySelector('#t').innerHTML = '<div class="ic-alerta">' + esc(U.mensajeError(e)) + '</div>'; return; }
      dibujar();
    }
    function dibujar() {
      const desde = Ope.sumar(Ope.hoy(), -365);
      const ult = faltas.filter((f) => f.fecha >= desde);
      const tecs = Ope.D.personal.filter((t) => ult.some((f) => f.tecnico_id === t.Title));
      c.querySelector('#res').innerHTML = tecs.length ? '<div class="ic-tabla-caja" style="margin-bottom:14px"><table class="ic-tabla"><thead><tr><th>Últimos 12 meses</th><th class="num">Total</th><th class="num">Leves</th><th class="num">Graves</th><th class="num">Gravísimas</th><th class="num">Abiertas</th><th>Última</th></tr></thead><tbody>' +
        tecs.map((t) => { const m = ult.filter((f) => f.tecnico_id === t.Title); const n = (g) => m.filter((f) => f.gravedad === g).length;
          return '<tr data-tec="' + esc(t.Title) + '"><td><b>' + esc(t.nombre) + '</b></td><td class="num"><b>' + m.length + '</b></td><td class="num">' + n('LEVE') + '</td><td class="num">' + n('GRAVE') + '</td><td class="num">' + n('GRAVISIMA') + '</td><td class="num">' + m.filter((f) => f.estado !== 'CERRADA').length + '</td><td>' + esc(Ope.textoFecha(m[0].fecha)) + ' · ' + esc(nom(FALTAS.tipos, m[0].tipo_falta)) + '</td></tr>'; }).join('') +
        '</tbody></table></div>' : '';
      c.querySelectorAll('#res tr[data-tec]').forEach((tr) => { tr.onclick = () => { filtroTec = tr.dataset.tec; c.querySelector('#fT').value = filtroTec; dibujar(); }; });
      const l = faltas.filter((f) => !filtroTec || f.tecnico_id === filtroTec);
      c.querySelector('#t').innerHTML = !l.length ? '<div class="ic-tabla-caja"><div class="ic-vacio">No hay faltas registradas.</div></div>' :
        '<div class="ic-tabla-caja ope-scroll"><table class="ic-tabla"><thead><tr><th>Fecha</th><th>Colaborador</th><th>Falta</th><th>Gravedad</th><th>Acción</th><th>Estado</th></tr></thead><tbody>' +
        l.map((f) => '<tr data-id="' + esc(f._id) + '" class="' + (f.estado === 'CERRADA' ? 'inactivo' : '') + '"><td><b>' + esc(Ope.textoFecha(f.fecha)) + '</b><span class="sec">' + esc(f.Title) + '</span></td><td>' + esc(Ope.nombreTec(f.tecnico_id)) + '</td>' +
          '<td>' + esc(nom(FALTAS.tipos, f.tipo_falta)) + '<span class="sec">' + esc(String(f.descripcion || '').slice(0, 90)) + '</span></td><td><span class="nov-grav g-' + esc(String(f.gravedad || '').toLowerCase()) + '">' + esc(nom(FALTAS.gravedad, f.gravedad)) + '</span></td>' +
          '<td>' + esc(nom(FALTAS.acciones, f.accion)) + '</td><td>' + esc(nom(FALTAS.estados, f.estado)) + '</td></tr>').join('') + '</tbody></table></div>';
      c.querySelectorAll('#t tr[data-id]').forEach((tr) => { tr.onclick = () => form(faltas.find((x) => x._id === tr.dataset.id), pintar); });
    }
    pintar();
  };

  function form(f, alCambiar) {
    const nueva = !f; f = f || { fecha: Ope.hoy(), gravedad: 'LEVE', accion: 'REGISTRO', estado: 'ABIERTA', tecnico_id: filtroTec };
    const tecOps = Ope.D.personal.filter((t) => t.estado !== 'INACTIVO' || t.Title === f.tecnico_id).map((t) => [t.Title, t.nombre]);
    U.modal(nueva ? 'Registrar falta' : f.Title + ' · ' + Ope.nombreTec(f.tecnico_id), '<form class="ic-form" id="fF"><div class="ic-campos">' +
      U.campo({ name: 'tecnico_id', label: 'Colaborador', t: 'select', op: tecOps, valor: f.tecnico_id, req: true, c: 'c8' }) +
      U.campo({ name: 'fecha', label: 'Fecha de la falta', t: 'date', valor: f.fecha, req: true, c: 'c4' }) +
      U.campo({ name: 'tipo_falta', label: 'Tipo de falta', t: 'select', op: FALTAS.tipos, valor: f.tipo_falta, req: true, c: 'c8' }) +
      U.campo({ name: 'gravedad', label: 'Gravedad', t: 'select', op: FALTAS.gravedad, valor: f.gravedad, vacio: false, c: 'c4' }) +
      U.campo({ name: 'descripcion', label: 'Descripción de los hechos', t: 'textarea', valor: f.descripcion, req: true, c: 'c12', filas: 3 }) +
      U.campo({ name: 'referencia', label: 'Referencia (ticket, OS, actividad PRG-…)', valor: f.referencia, c: 'c6' }) +
      U.campo({ name: 'accion', label: 'Acción tomada', t: 'select', op: FALTAS.acciones, valor: f.accion, vacio: false, c: 'c6' }) +
      U.campo({ name: 'seguimiento', label: 'Seguimiento / descargos / compromisos', t: 'textarea', valor: f.seguimiento, c: 'c12', filas: 2 }) +
      U.campo({ name: 'estado', label: 'Estado', t: 'select', op: FALTAS.estados, valor: f.estado, vacio: false, c: 'c4' }) +
      '</div>' + (!nueva ? '<p class="ope-nota">Registrada por ' + esc(f.registrado_por || f._autor) + ' · ' + esc(U.fmt.fechaHora(f._creado)) + (f._modificado !== f._creado ? ' · modificada ' + esc(U.fmt.fechaHora(f._modificado)) : '') + '</p>' : '') +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="fNo">Cancelar</button><button class="ic-btn" id="fOk">Guardar</button></div></form>',
    (cu) => {
      const fm = cu.querySelector('#fF');
      cu.querySelector('#fNo').onclick = U.cerrarModal;
      fm.onsubmit = async (ev) => {
        ev.preventDefault();
        const v = U.leerForm(fm), err = {};
        if (!v.tecnico_id) err.tecnico_id = 'Elija el colaborador';
        if (!v.fecha) err.fecha = 'Indique la fecha';
        if (!v.tipo_falta) err.tipo_falta = 'Elija el tipo';
        if (!v.descripcion) err.descripcion = 'Describa los hechos';
        if (!U.marcarErrores(fm, err)) return;
        try {
          await U.conCarga(cu.querySelector('#fOk'), async () => {
            if (nueva) {
              const n = await G.siguiente('FAL'); const id = 'FAL-' + Ope.pad(n, 6);
              await G.crear('NOV_Faltas', Object.assign({ Title: id, registrado_por: App.usuario.nombre }, v));
              await Ope.auditar('FALTA', id, 'CREAR', null, { tecnico_id: v.tecnico_id, fecha: v.fecha });   // sin el detalle: queda solo en NOV_Faltas
            } else {
              await G.actualizar('NOV_Faltas', f._id, v, f._etag);
              await Ope.auditar('FALTA', f.Title, 'ACTUALIZAR', null, { estado: v.estado, accion: v.accion });
            }
          });
          U.aviso('Falta guardada', 'ok'); U.cerrarModal(); alCambiar();
        } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); }
      };
    });
  }
})();
