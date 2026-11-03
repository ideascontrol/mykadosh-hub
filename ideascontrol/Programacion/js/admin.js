/* =====================================================================
   APP-106 · Programación — Administración (solo Director de Operaciones)
   Técnicos y matriz de habilidades · Tipos de actividad · Accesos · Festivos
   ===================================================================== */
(function () {
  const U = IC.ui, esc = U.esc, G = IC.graph;
  let pestana = 'tecnicos';
  const PESTANAS = [['tecnicos', 'Técnicos y habilidades'], ['tipos', 'Tipos de actividad'], ['accesos', 'Accesos'], ['festivos', 'Festivos']];

  App.vistas.admin = function (c) {
    c.innerHTML = '<a class="ic-volver" href="#">← Menú principal</a><h1 class="ic-titulo">Administración</h1>' +
      '<p class="ic-subtitulo">Lo que antes estaba en la hoja «Listas» del Excel.</p>' +
      '<div class="ic-barra"><div class="ic-chips" id="tabs">' + PESTANAS.map((p) => '<button data-p="' + p[0] + '"' + (p[0] === pestana ? ' class="activo"' : '') + '>' + p[1] + '</button>').join('') + '</div>' +
      '<span style="flex:1"></span><button class="ic-btn" id="bNuevo"></button></div><div id="cuerpo"><div class="ic-vacio">Cargando…</div></div>';
    c.querySelectorAll('#tabs button').forEach((b) => { b.onclick = () => { pestana = b.dataset.p; App.vistas.admin(c); }; });
    const cuerpo = c.querySelector('#cuerpo'), bN = c.querySelector('#bNuevo');
    const recargar = async () => { await Ope.cargarCatalogos(); App.vistas.admin(c); };
    ({ tecnicos, tipos, accesos, festivos })[pestana](cuerpo, bN, recargar);
  };

  // ---------- Técnicos ----------
  function tecnicos(cuerpo, bN, recargar) {
    bN.textContent = '+ Nuevo técnico'; bN.onclick = () => formTecnico(null, recargar);
    const tipos = Ope.D.tipos.filter((t) => t.estado !== 'INACTIVO');
    cuerpo.innerHTML = '<div class="ic-tabla-caja ope-scroll"><table class="ic-tabla ope-matriz"><thead><tr><th>Técnico</th><th>Vinculación</th>' +
      tipos.map((t) => '<th class="num" title="' + esc(t.nombre) + '">' + App.chipTipo(t.Title) + '</th>').join('') + '<th>Correo (acceso como técnico)</th></tr></thead><tbody>' +
      Ope.D.tecnicos.map((t) => '<tr data-id="' + esc(t.Title) + '" class="' + (t.estado === 'INACTIVO' ? 'inactivo' : '') + '"><td><b>' + esc(t.nombre) + '</b><span class="sec">' + esc(t.Title + ' · ' + (t.iniciales || '')) + (t.estado === 'INACTIVO' ? ' · inactivo' : '') + '</span></td>' +
        '<td>' + esc(t.vinculacion === 'TECNICO_CAMPO' ? 'Técnico de campo' : 'Ideas Control') + '</td>' +
        tipos.map((tp) => '<td class="num">' + (Ope.puede(t, tp.Title) ? '<span class="ope-si">Sí</span>' : '<span class="ope-no">No</span>') + '</td>').join('') +
        '<td>' + esc(t.email || '—') + '</td></tr>').join('') + '</tbody></table></div>' +
      '<p class="ope-nota">Sí = puede programarse en ese tipo. Los técnicos de campo trabajan fuera de Bogotá, se programan bajo demanda y no rotan en oficina. Si registra el correo de un técnico, puede entrar a la app con su cuenta de Microsoft y ver su agenda.</p>';
    cuerpo.querySelectorAll('tr[data-id]').forEach((tr) => { tr.onclick = () => formTecnico(Ope.tec(tr.dataset.id), recargar); });
  }
  function formTecnico(t, recargar) {
    const nuevo = !t; t = t || { vinculacion: 'IDEAS_CONTROL', estado: 'ACTIVO', habilidades: '' };
    const tipos = Ope.D.tipos.filter((x) => x.estado !== 'INACTIVO');
    U.modal(nuevo ? 'Nuevo técnico' : t.nombre, '<form class="ic-form" id="fT"><div class="ic-campos">' +
      U.campo({ name: 'nombre', label: 'Nombre completo', valor: t.nombre, req: true, c: 'c8' }) +
      U.campo({ name: 'iniciales', label: 'Iniciales', valor: t.iniciales, req: true, c: 'c4', max: 3, ayuda: '2 o 3 letras, se ven en la agenda' }) +
      U.campo({ name: 'vinculacion', label: 'Vinculación', t: 'select', op: Ope.VINCULOS, valor: t.vinculacion, vacio: false, c: 'c4' }) +
      U.campo({ name: 'email', label: 'Correo de Microsoft (opcional)', t: 'email', valor: t.email, c: 'c8', ph: 'nombre@ideascontrol.com' }) +
      U.campo({ name: 'celular', label: 'Celular', valor: t.celular, c: 'c4' }) +
      U.campo({ name: 'orden', label: 'Orden', valor: t.orden, c: 'c4', modo: 'numeric' }) +
      U.campo({ name: 'estado', label: 'Estado', t: 'select', op: [['ACTIVO', 'Activo'], ['INACTIVO', 'Inactivo']], valor: t.estado, vacio: false, c: 'c4' }) +
      U.campo({ name: 'horario_especial', label: 'Horario especial acordado', t: 'textarea', valor: t.horario_especial, c: 'c12', filas: 2, ph: 'Ej.: entra 9:00 los martes. En esa franja la oficina queda sin técnico; no hay reemplazos por segmentos.' }) +
      '</div><fieldset style="margin-top:16px"><legend>Matriz de habilidades</legend><div class="ope-habs">' +
      tipos.map((tp) => '<label class="ic-check"><input type="checkbox" data-hab="' + esc(tp.Title) + '"' + (Ope.puede(t, tp.Title) ? ' checked' : '') + '> <span>' + App.chipTipo(tp.Title) + ' ' + esc(tp.nombre) + '</span></label>').join('') +
      '</div></fieldset><div class="ic-acciones"><button type="button" class="ic-btn sec" id="tNo">Cancelar</button><button class="ic-btn" id="tOk">Guardar</button></div></form>',
    (cu) => {
      const f = cu.querySelector('#fT');
      cu.querySelector('#tNo').onclick = U.cerrarModal;
      f.onsubmit = async (ev) => {
        ev.preventDefault();
        const v = U.leerForm(f);
        delete v.undefined;
        v.iniciales = v.iniciales.toUpperCase(); v.email = v.email.toLowerCase();
        v.orden = v.orden === '' ? '' : Number(v.orden);
        v.habilidades = Array.from(f.querySelectorAll('[data-hab]')).filter((x) => x.checked).map((x) => x.dataset.hab).join(';');
        const err = {};
        if (!v.nombre) err.nombre = 'Obligatorio';
        if (!/^[A-Z]{2,3}$/.test(v.iniciales)) err.iniciales = '2 o 3 letras';
        else if (Ope.D.tecnicos.some((x) => x.Title !== t.Title && String(x.iniciales).toUpperCase() === v.iniciales)) err.iniciales = 'Ya las usa otro técnico';
        if (v.email && Ope.D.tecnicos.some((x) => x.Title !== t.Title && String(x.email || '').toLowerCase() === v.email)) err.email = 'Ya está asociado a otro técnico';
        if (!U.marcarErrores(f, err)) return;
        const campos = { nombre: v.nombre, iniciales: v.iniciales, vinculacion: v.vinculacion, email: v.email, celular: v.celular, orden: v.orden, estado: v.estado, horario_especial: v.horario_especial, habilidades: v.habilidades };
        try {
          await U.conCarga(cu.querySelector('#tOk'), async () => {
            if (nuevo) { const n = await G.siguiente('TEC', 1); const id = 'TEC-' + Ope.pad(n, 2); await G.crear('OPE_Tecnicos', Object.assign({ Title: id }, campos)); await Ope.auditar('TECNICO', id, 'CREAR', null, campos); }
            else { await G.actualizar('OPE_Tecnicos', t._id, campos, t._etag); await Ope.auditar('TECNICO', t.Title, 'ACTUALIZAR', null, campos); }
          });
          U.aviso('Técnico guardado', 'ok'); U.cerrarModal(); recargar();
        } catch (e) { U.aviso(U.mensajeError(e), 'err', 7000); }
      };
    });
  }

  // ---------- Tipos ----------
  function tipos(cuerpo, bN, recargar) {
    bN.textContent = '+ Nuevo tipo'; bN.onclick = () => formTipo(null, recargar);
    cuerpo.innerHTML = '<div class="ic-tabla-caja ope-scroll"><table class="ic-tabla"><thead><tr><th>Tipo</th><th>Días preferentes</th><th class="num">Máx. equipos por técnico-día</th><th>Descripción</th></tr></thead><tbody>' +
      Ope.D.tipos.map((t) => '<tr data-id="' + esc(t.Title) + '" class="' + (t.estado === 'INACTIVO' ? 'inactivo' : '') + '"><td>' + App.chipTipo(t.Title) + ' <b>' + esc(t.nombre) + '</b></td>' +
        '<td>' + Ope.DIAS_CORTOS.map((d, i) => '<span class="ope-dia-pref' + (Ope.diasPref(t).indexOf(i + 1) >= 0 ? ' si' : '') + '">' + d + '</span>').join('') + '</td>' +
        '<td class="num">' + (Number(t.max_equipos) > 0 ? t.max_equipos : '—') + '</td><td>' + esc(t.descripcion || '') + '</td></tr>').join('') + '</tbody></table></div>' +
      '<p class="ope-nota">Un día fuera de los preferentes es posible, pero genera un aviso ℹ. El máximo de equipos define la carga del día (instalaciones/3 + mantenimientos/4 ≤ 100 %).</p>';
    cuerpo.querySelectorAll('tr[data-id]').forEach((tr) => { tr.onclick = () => formTipo(Ope.tipo(tr.dataset.id), recargar); });
  }
  function formTipo(t, recargar) {
    const nuevo = !t; t = t || { estado: 'ACTIVO', dias_preferentes: '1;2;3;4;5' };
    U.modal(nuevo ? 'Nuevo tipo de actividad' : t.nombre, '<form class="ic-form" id="fTp"><div class="ic-campos">' +
      U.campo({ name: 'Title', label: 'Código', valor: t.Title, req: true, c: 'c3', max: 3, readonly: !nuevo, ayuda: '3 letras' }) +
      U.campo({ name: 'nombre', label: 'Nombre', valor: t.nombre, req: true, c: 'c6' }) +
      '<div class="ic-campo c3"><label for="f_color">Color</label><input id="f_color" name="color" type="color" value="' + esc(t.color || App.colorTipo(t.Title)) + '"></div>' +
      U.campo({ name: 'max_equipos', label: 'Máx. equipos por técnico-día', valor: t.max_equipos, c: 'c6', modo: 'numeric', ayuda: 'Solo para tipos con equipos (instalación, mantenimiento). Vacío = no aplica.' }) +
      U.campo({ name: 'orden', label: 'Orden', valor: t.orden, c: 'c3', modo: 'numeric' }) +
      U.campo({ name: 'estado', label: 'Estado', t: 'select', op: [['ACTIVO', 'Activo'], ['INACTIVO', 'Inactivo']], valor: t.estado, vacio: false, c: 'c3' }) +
      U.campo({ name: 'descripcion', label: 'Descripción', t: 'textarea', valor: t.descripcion, c: 'c12', filas: 2 }) +
      '</div><fieldset style="margin-top:16px"><legend>Días preferentes</legend><div class="ope-habs">' +
      Ope.DIAS.map((d, i) => '<label class="ic-check"><input type="checkbox" data-dia="' + (i + 1) + '"' + (Ope.diasPref(t).indexOf(i + 1) >= 0 ? ' checked' : '') + '> <span>' + d + '</span></label>').join('') +
      '</div></fieldset><div class="ic-acciones"><button type="button" class="ic-btn sec" id="pNo">Cancelar</button><button class="ic-btn" id="pOk">Guardar</button></div></form>',
    (cu) => {
      const f = cu.querySelector('#fTp');
      cu.querySelector('#pNo').onclick = U.cerrarModal;
      f.onsubmit = async (ev) => {
        ev.preventDefault();
        const v = U.leerForm(f); v.Title = v.Title.toUpperCase();
        const err = {};
        if (!/^[A-Z]{3}$/.test(v.Title)) err.Title = '3 letras';
        else if (nuevo && Ope.tipo(v.Title)) err.Title = 'Ya existe';
        if (!v.nombre) err.nombre = 'Obligatorio';
        if (v.max_equipos && !(Number(v.max_equipos) > 0)) err.max_equipos = 'Número mayor que 0';
        if (!U.marcarErrores(f, err)) return;
        const campos = { nombre: v.nombre, color: v.color, max_equipos: v.max_equipos === '' ? null : Number(v.max_equipos), orden: v.orden === '' ? null : Number(v.orden), estado: v.estado, descripcion: v.descripcion,
          dias_preferentes: Array.from(f.querySelectorAll('[data-dia]')).filter((x) => x.checked).map((x) => x.dataset.dia).join(';') };
        try {
          await U.conCarga(cu.querySelector('#pOk'), async () => {
            if (nuevo) { Object.keys(campos).forEach((k) => { if (campos[k] === null) delete campos[k]; }); await G.crear('OPE_Tipos', Object.assign({ Title: v.Title }, campos)); await Ope.auditar('TIPO', v.Title, 'CREAR', null, campos); }
            else { await G.actualizar('OPE_Tipos', t._id, campos, t._etag); await Ope.auditar('TIPO', t.Title, 'ACTUALIZAR', null, campos); }
          });
          U.aviso('Tipo guardado' + (nuevo ? '. Habilítelo en la matriz de cada técnico.' : ''), 'ok'); U.cerrarModal(); recargar();
        } catch (e) { U.aviso(U.mensajeError(e), 'err', 7000); }
      };
    });
  }

  // ---------- Accesos ----------
  const ROLES_OP = [['ADMIN', 'Director de Operaciones (todo + administración)'], ['EDITOR', 'Programador (programa y edita)'], ['CONSULTA', 'Consulta (solo ver)']];
  async function accesos(cuerpo, bN, recargar) {
    bN.textContent = '+ Nuevo acceso'; bN.onclick = () => formAcceso(null, lista, recargar);
    let lista = [];
    try { lista = await G.items('SYS_Accesos', { filtro: "fields/app_id eq '" + CFG.app.id + "'" }); } catch (e) { cuerpo.innerHTML = '<div class="ic-alerta">' + esc(U.mensajeError(e)) + '</div>'; return; }
    const tecCorreo = Ope.D.tecnicos.filter((t) => t.email && t.estado !== 'INACTIVO');
    cuerpo.innerHTML = '<div class="ic-tabla-caja"><table class="ic-tabla"><thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th></tr></thead><tbody>' +
      (lista.length ? lista.map((a) => '<tr data-id="' + esc(a._id) + '" class="' + (a.estado === 'INACTIVO' ? 'inactivo' : '') + '"><td><b>' + esc(a.nombre || a.email) + '</b><span class="sec">' + esc(a.email) + '</span></td><td>' + esc((ROLES_OP.find((r) => r[0] === a.rol) || [a.rol, a.rol])[1]) + '</td><td>' + esc(a.estado === 'INACTIVO' ? 'Inactivo' : 'Activo') + '</td></tr>').join('') : '<tr><td colspan="3" class="ic-vacio">Sin accesos registrados.</td></tr>') +
      tecCorreo.map((t) => '<tr class="inactivo" style="cursor:default"><td><b>' + esc(t.nombre) + '</b><span class="sec">' + esc(t.email) + '</span></td><td>Técnico (por su correo en Técnicos)</td><td>Activo</td></tr>').join('') +
      '</tbody></table></div><p class="ope-nota">Los usuarios también deben ser miembros del sitio de SharePoint IC Apps. Los técnicos con correo registrado entran como Técnico: ven la agenda y marcan como ejecutadas sus actividades.</p>';
    cuerpo.querySelectorAll('tr[data-id]').forEach((tr) => { tr.onclick = () => formAcceso(lista.find((x) => x._id === tr.dataset.id), lista, recargar); });
  }
  function formAcceso(a, lista, recargar) {
    const nuevo = !a; a = a || { rol: 'EDITOR', estado: 'ACTIVO' };
    U.modal(nuevo ? 'Nuevo acceso' : (a.nombre || a.email), '<form class="ic-form" id="fA"><div class="ic-campos">' +
      U.campo({ name: 'email', label: 'Correo de Microsoft 365', t: 'email', valor: a.email, req: true, c: 'c12', readonly: !nuevo }) +
      U.campo({ name: 'nombre', label: 'Nombre', valor: a.nombre, c: 'c12' }) +
      U.campo({ name: 'rol', label: 'Rol', t: 'select', op: ROLES_OP, valor: a.rol, vacio: false, c: 'c8' }) +
      U.campo({ name: 'estado', label: 'Estado', t: 'select', op: [['ACTIVO', 'Activo'], ['INACTIVO', 'Inactivo']], valor: a.estado, vacio: false, c: 'c4' }) +
      '</div><div class="ic-acciones"><button type="button" class="ic-btn sec" id="aNo">Cancelar</button><button class="ic-btn" id="aOk">Guardar</button></div></form>',
    (cu) => {
      const f = cu.querySelector('#fA');
      cu.querySelector('#aNo').onclick = U.cerrarModal;
      f.onsubmit = async (ev) => {
        ev.preventDefault();
        const v = U.leerForm(f); v.email = v.email.toLowerCase();
        const err = {};
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) err.email = 'Correo no válido';
        else if (nuevo && lista.some((x) => String(x.email).toLowerCase() === v.email)) err.email = 'Ya tiene acceso';
        if (!nuevo && a.email.toLowerCase() === App.usuario.email && (v.rol !== 'ADMIN' || v.estado !== 'ACTIVO')) err.rol = 'No puede quitarse a sí mismo el rol de Director';
        if (!U.marcarErrores(f, err)) return;
        try {
          await U.conCarga(cu.querySelector('#aOk'), async () => {
            if (nuevo) { const n = await G.siguiente('ACC', 1); const id = 'ACC-' + Ope.pad(n, 4); await G.crear('SYS_Accesos', { Title: id, email: v.email, nombre: v.nombre, app_id: CFG.app.id, rol: v.rol, estado: v.estado }); await Ope.auditar('ACCESO', id, 'CREAR', null, v); }
            else { await G.actualizar('SYS_Accesos', a._id, { nombre: v.nombre, rol: v.rol, estado: v.estado }, a._etag); await Ope.auditar('ACCESO', a.Title, 'ACTUALIZAR', { rol: a.rol, estado: a.estado }, { rol: v.rol, estado: v.estado }); }
          });
          U.aviso('Acceso guardado', 'ok'); U.cerrarModal(); recargar();
        } catch (e) { U.aviso(U.mensajeError(e), 'err', 7000); }
      };
    });
  }

  // ---------- Festivos (fuente única: SYS_Festivos) ----------
  function festivos(cuerpo, bN) {
    bN.hidden = true;
    const h = Ope.hoy();
    const lista = Object.keys(Ope.D.festivos).sort().filter((d) => d >= Ope.sumar(h, -60));
    cuerpo.innerHTML = '<div class="ic-alerta chica">Los festivos se administran en un solo lugar para todas las microapps: lista <b>SYS_Festivos</b> (Microapp Comercial › Administración › Festivos). Aquí solo se consultan.</div>' +
      '<div class="ic-tabla-caja"><table class="ic-tabla"><thead><tr><th>Fecha</th><th>Festivo</th></tr></thead><tbody>' +
      lista.map((d) => '<tr style="cursor:default" class="' + (d < h ? 'inactivo' : '') + '"><td>' + esc(Ope.textoFecha(d, true)) + '</td><td>' + esc(Ope.D.festivos[d]) + '</td></tr>').join('') + '</tbody></table></div>';
  }
})();
