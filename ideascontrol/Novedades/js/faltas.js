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

  // ---------- Bitácora de la falta (confidencial: se guarda en la misma falta, columna «bitacora») ----------
  // Cada comentario: { fh: fecha-hora ISO, autor, tipo, texto }. No se editan ni se borran: se acumulan.
  const TIPOS_COM = ['Seguimiento', 'Descargos', 'Compromiso', 'Llamado de atención', 'Cierre'];
  function bitacoraDe(f) {
    let l = [];
    try { l = JSON.parse(f.bitacora || '[]'); if (!Array.isArray(l)) l = []; } catch (e) { l = []; }
    // Texto del campo anterior «Seguimiento» (antes de la bitácora): se muestra como primera nota
    if (f.seguimiento && String(f.seguimiento).trim()) l.push({ fh: f._creado || '', autor: f.registrado_por || '', tipo: 'Nota anterior', texto: String(f.seguimiento).trim(), antigua: true });
    return l.sort((a, b) => String(b.fh || '').localeCompare(String(a.fh || '')));
  }
  const comHtml = (x) => '<li class="seg-item"><span class="seg-punto ' + (x.tipo === 'Cierre' ? 'gris' : x.tipo === 'Descargos' ? 'dorado' : x.tipo === 'Compromiso' ? 'verde' : x.tipo === 'Llamado de atención' ? 'rojo' : 'azul') + '"></span>' +
    '<div class="seg-cab"><b>' + esc(x.autor || '—') + '</b><span>' + esc(x.fh ? U.fmt.fechaHora(x.fh) : '') + '</span><span class="seg-tag">' + esc(x.tipo || 'Seguimiento') + '</span></div>' +
    '<div class="seg-texto">' + esc(x.texto || '').replace(/\n/g, '<br>') + '</div></li>';
  const panelHtml = (nueva) => '<div class="seg-panel" id="segPanel"><div class="seg-titulo"><h3>Bitácora de la falta</h3><span class="seg-caso">Comentarios con fecha, hora y autor. No se editan ni se borran. Confidencial (solo Dirección).</span></div>' +
    '<div class="seg-nuevo"><select id="segTipo" aria-label="Tipo de comentario">' + TIPOS_COM.map((t) => '<option>' + esc(t) + '</option>').join('') + '</select>' +
    '<textarea id="segTexto" rows="2" placeholder="' + (nueva ? 'Comentario inicial (opcional): se guarda con la falta.' : 'Escriba el comentario: seguimiento, descargos, compromisos…') + '"></textarea>' +
    (nueva ? '<span></span>' : '<button type="button" class="ic-btn" id="segAgregar">Agregar comentario</button>') + '</div>' +
    '<ul class="seg-lista" id="segLista"></ul></div>';
  const nuevoCom = (cu) => ({ fh: new Date().toISOString(), autor: App.usuario.nombre, tipo: cu.querySelector('#segTipo').value, texto: cu.querySelector('#segTexto').value.trim() });
  const sinColumna = (e) => /bitacora/i.test(String((e && e.message) || ''));
  const MSJ_COL = 'Falta la columna «bitacora» en NOV_Faltas: abra el instalador de la Programación y dé clic en «Crear estructura».';

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
      U.campo({ name: 'estado', label: 'Estado', t: 'select', op: FALTAS.estados, valor: f.estado, vacio: false, c: 'c4' }) +
      '</div>' + (!nueva ? '<p class="ope-nota">Registrada por ' + esc(f.registrado_por || f._autor) + ' · ' + esc(U.fmt.fechaHora(f._creado)) + (f._modificado !== f._creado ? ' · modificada ' + esc(U.fmt.fechaHora(f._modificado)) : '') + '</p>' : '') +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="fNo">Cancelar</button><button class="ic-btn" id="fOk">Guardar</button></div></form>' + panelHtml(nueva),
    (cu) => {
      const fm = cu.querySelector('#fF');
      const pintarBit = () => { const l = bitacoraDe(f); cu.querySelector('#segLista').innerHTML = l.length ? l.map(comHtml).join('') : '<li class="ic-vacio">' + (nueva ? 'Al guardar la falta, el comentario inicial queda como primera nota.' : 'Aún no hay comentarios.') + '</li>'; };
      pintarBit();
      const bAg = cu.querySelector('#segAgregar');
      if (bAg) bAg.onclick = () => {
        const c = nuevoCom(cu); if (!c.texto) { U.aviso('Escriba el comentario.', 'warn'); cu.querySelector('#segTexto').focus(); return; }
        U.conCarga(bAg, async () => {
          try {
            // Se relee la falta para no perder comentarios que otro haya agregado
            const act = (await G.items('NOV_Faltas', { filtro: "fields/Title eq '" + f.Title + "'" }))[0] || f;
            let l = []; try { l = JSON.parse(act.bitacora || '[]'); if (!Array.isArray(l)) l = []; } catch (e) { l = []; }
            l.push(c);
            await G.actualizar('NOV_Faltas', act._id, { bitacora: JSON.stringify(l) }, act._etag);
            await Ope.auditar('FALTA', f.Title, 'COMENTARIO', null, { tipo: c.tipo });
            f.bitacora = JSON.stringify(l);
            cu.querySelector('#segTexto').value = ''; pintarBit(); U.aviso('Comentario agregado a la bitácora.', 'ok');
            const nuevaVersion = (await G.items('NOV_Faltas', { filtro: "fields/Title eq '" + f.Title + "'" }))[0]; if (nuevaVersion) Object.assign(f, nuevaVersion);
          } catch (e) { U.aviso(sinColumna(e) ? MSJ_COL : U.mensajeError(e), 'err', 9000); }
        });
      };
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
              const c0 = nuevoCom(cu);
              await G.crear('NOV_Faltas', Object.assign({ Title: id, registrado_por: App.usuario.nombre }, v, c0.texto ? { bitacora: JSON.stringify([c0]) } : {}));
              await Ope.auditar('FALTA', id, 'CREAR', null, { tecnico_id: v.tecnico_id, fecha: v.fecha });   // sin el detalle: queda solo en NOV_Faltas
            } else {
              await G.actualizar('NOV_Faltas', f._id, v, f._etag);
              await Ope.auditar('FALTA', f.Title, 'ACTUALIZAR', null, { estado: v.estado, accion: v.accion });
            }
          });
          U.aviso('Falta guardada', 'ok'); U.cerrarModal(); alCambiar();
        } catch (e) { U.aviso(sinColumna(e) ? MSJ_COL : U.mensajeError(e), 'err', 8000); }
      };
    });
  }
})();
