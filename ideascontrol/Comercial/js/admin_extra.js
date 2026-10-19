/* =====================================================================
   APP-101 · Comercial — Administración (2): delegaciones, distribuidores,
   festivos, consecutivos, registro de actividad y motivos de pérdida.
   Rutas: #admin/delegaciones · #admin/distribuidores · #admin/festivos · #admin/consecutivos · #admin/registro · #admin/motivos · #admin/tipificaciones
   Se registran en App.adminSecciones; el enrutador está en admin.js.
   ===================================================================== */
(function () {
  const U = IC.ui, G = IC.graph, esc = U.esc;
  const pad = (n, w) => String(n).padStart(w, '0');
  const A = () => App.admin;   // auditar, diferencias, cabecera (admin.js)
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2);
  const hoy = () => iso(new Date());
  const sumarDias = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
  const soloFecha = (v) => (v ? String(v).slice(0, 10) : '');
  const nombreUsuario = (id) => { const u = (App.usuarios || []).find((x) => x.Title === id); return u ? u.nombre : (id || '—'); };
  // Siguiente ID sin chocar con registros creados a mano en SharePoint
  async function nuevoId(clave, prefijo, ancho, existentes) {
    let n = await G.siguiente(clave);
    while (existentes.some((x) => x.Title === prefijo + pad(n, ancho))) n = await G.siguiente(clave);
    return prefijo + pad(n, ancho);
  }
  App.adminSecciones = App.adminSecciones || {};

  // =====================================================================
  // DELEGACIONES
  // =====================================================================
  let delegaciones = [];
  function estadoDeleg(d) {
    const i = soloFecha(d.fecha_inicio), f = soloFecha(d.fecha_fin), h = hoy();
    if (f < i) return ['Cancelada', 'inactivo'];
    if (h < i) return ['Programada', 'prospecto'];
    if (h > f) return ['Terminada', 'inactivo'];
    return ['Vigente', 'cliente'];
  }
  App.adminSecciones.delegaciones = async function vista(c) {
    const r = await Promise.all([G.items('SYS_Delegaciones'), G.items('SYS_Usuarios')]);
    App.usuarios = r[1];
    const orden = { Vigente: 0, Programada: 1, Terminada: 2, Cancelada: 3 };
    delegaciones = r[0].sort((a, b) => (orden[estadoDeleg(a)[0]] - orden[estadoDeleg(b)[0]]) || soloFecha(b.fecha_inicio).localeCompare(soloFecha(a.fecha_inicio)));
    c.innerHTML = A().cabecera('Delegaciones', 'Permisos de administrador por un período, por ejemplo durante sus vacaciones.', '<button class="ic-btn" id="btnNuevo">+ Nueva delegación</button>') +
      '<p class="ic-conteo">Durante el período, el comercial ve y hace todo lo de un administrador. Al terminar, vuelve a su rol solo, sin que nadie tenga que hacer nada. El cambio se aplica la próxima vez que entre a la app.</p>' +
      (!delegaciones.length ? '<div class="ic-vacio">No hay delegaciones registradas.</div>' :
      '<div class="ic-tabla-caja"><table class="ic-tabla"><thead><tr><th>Comercial</th><th>Período</th><th class="ocultar-movil">Motivo</th><th style="width:120px">Estado</th><th style="width:110px"></th></tr></thead><tbody>' +
      delegaciones.map((d) => { const e = estadoDeleg(d);
        return '<tr style="cursor:default"><td><b>' + esc(nombreUsuario(d.usuario_id)) + '</b><span class="sec">Otorgada por ' + esc(nombreUsuario(d.otorgado_por)) + ' · ' + esc(d.Title) + '</span></td>' +
          '<td>' + U.fmt.fecha(soloFecha(d.fecha_inicio) + 'T12:00:00') + ' → ' + U.fmt.fecha(soloFecha(d.fecha_fin) + 'T12:00:00') + '</td>' +
          '<td class="ocultar-movil" style="white-space:pre-line">' + esc(d.observaciones || '') + '</td><td><span class="ic-tag ' + e[1] + '">' + e[0] + '</span></td>' +
          '<td>' + (e[0] === 'Vigente' || e[0] === 'Programada' ? '<button class="ic-btn sec" data-fin="' + esc(d.Title) + '">' + (e[0] === 'Vigente' ? 'Terminar' : 'Cancelar') + '</button>' : '') + '</td></tr>'; }).join('') +
      '</tbody></table></div>');
    U.$('#btnNuevo', c).onclick = () => formDelegacion(c);
    c.querySelectorAll('[data-fin]').forEach((b) => { b.onclick = () => terminarDelegacion(c, delegaciones.find((d) => d.Title === b.dataset.fin)); });
  };
  function formDelegacion(c) {
    const comerciales = (App.usuarios || []).filter((u) => u.estado === 'ACTIVO' && u.rol !== 'ADMIN');
    if (!comerciales.length) { U.aviso('No hay comerciales activos para delegar.', 'warn'); return; }
    U.modal('Nueva delegación', '<form class="ic-form" id="fDlg" novalidate><div class="ic-campos">' +
      U.campo({ name: 'usuario_id', label: 'Comercial que recibe el permiso', t: 'select', op: comerciales.map((u) => [u.Title, u.nombre + ' (' + u.iniciales + ')']), req: true, c: 'c12' }) +
      U.campo({ name: 'fecha_inicio', label: 'Desde', t: 'date', valor: hoy(), req: true, c: 'c6' }) +
      U.campo({ name: 'fecha_fin', label: 'Hasta (incluido)', t: 'date', valor: sumarDias(hoy(), 7), req: true, c: 'c6', ayuda: 'Máximo 90 días' }) +
      U.campo({ name: 'observaciones', label: 'Motivo', t: 'textarea', filas: 2, req: true, c: 'c12', ph: 'Ej.: Vacaciones de Martín' }) +
      '</div><div class="ic-acciones"><button type="button" class="ic-btn sec" id="bC">Cancelar</button><button class="ic-btn" id="bG">Crear delegación</button></div></form>', (m) => {
      U.$('#bC', m).onclick = U.cerrarModal;
      U.$('#fDlg', m).onsubmit = async (ev) => {
        ev.preventDefault();
        const v = U.leerForm(ev.target), err = {};
        if (!v.usuario_id) err.usuario_id = 'Seleccione el comercial';
        if (!v.fecha_inicio) err.fecha_inicio = 'Obligatoria';
        else if (v.fecha_inicio < hoy()) err.fecha_inicio = 'No puede empezar en el pasado';
        if (!v.fecha_fin) err.fecha_fin = 'Obligatoria';
        else if (v.fecha_inicio && v.fecha_fin < v.fecha_inicio) err.fecha_fin = 'Debe ser igual o posterior a "Desde"';
        else if (v.fecha_inicio && v.fecha_fin > sumarDias(v.fecha_inicio, 89)) err.fecha_fin = 'Máximo 90 días';
        if (!v.observaciones) err.observaciones = 'Escriba el motivo';
        const cruce = delegaciones.find((d) => d.usuario_id === v.usuario_id && soloFecha(d.fecha_fin) >= soloFecha(d.fecha_inicio) &&
          !(v.fecha_fin < soloFecha(d.fecha_inicio) || v.fecha_inicio > soloFecha(d.fecha_fin)));
        if (cruce && !err.fecha_inicio) err.fecha_inicio = 'Se cruza con la delegación ' + cruce.Title;
        if (!U.marcarErrores(ev.target, err)) return;
        await U.conCarga(U.$('#bG', m), async () => {
          try {
            const id = await nuevoId('DLG', 'DLG-', 6, delegaciones);
            const campos = { usuario_id: v.usuario_id, fecha_inicio: v.fecha_inicio, fecha_fin: v.fecha_fin, otorgado_por: App.usuario.usuario_id, observaciones: v.observaciones };
            await G.crear('SYS_Delegaciones', Object.assign({ Title: id }, campos));
            await A().auditar('DELEGACION', id, 'CREAR', null, campos);
            U.cerrarModal(); await App.adminSecciones.delegaciones(c); U.aviso('Delegación creada', 'ok');
          } catch (e) { U.aviso(U.mensajeError(e), 'err', 7000); }
        });
      };
    });
  }
  async function terminarDelegacion(c, d) {
    const vigente = estadoDeleg(d)[0] === 'Vigente';
    const ok = await U.confirmar(vigente ? 'Terminar delegación' : 'Cancelar delegación',
      nombreUsuario(d.usuario_id) + (vigente ? ' deja de ser administrador desde hoy (al volver a entrar a la app).' : ' ya no recibirá el permiso programado.') + ' ¿Continuar?', vigente ? 'Terminar' : 'Cancelar delegación', true);
    if (!ok) return;
    try {
      // Fecha fin = ayer. Si aún no había empezado, queda con fin anterior al inicio (= cancelada)
      const fin = sumarDias(hoy(), -1);
      const obs = (d.observaciones ? d.observaciones + '\n' : '') + (vigente ? 'Terminada' : 'Cancelada') + ' el ' + hoy() + ' por ' + App.usuario.iniciales;
      await G.actualizar('SYS_Delegaciones', d._id, { fecha_fin: fin, observaciones: obs }, d._etag);
      await A().auditar('DELEGACION', d.Title, 'DESACTIVAR', { fecha_fin: soloFecha(d.fecha_fin) }, { fecha_fin: fin });
      await App.adminSecciones.delegaciones(c); U.aviso('Listo', 'ok');
    } catch (e) { U.aviso(U.mensajeError(e), 'err', 7000); }
  }

  // =====================================================================
  // DISTRIBUIDORES
  // =====================================================================
  let distribuidores = [], compras = [];
  const filtroDis = { texto: '', estado: 'ACTIVO' };
  App.adminSecciones.distribuidores = async function vista(c) {
    const r = await Promise.all([G.items('MAE_Distribuidores'), G.items('MAE_ProductoDistribuidor', { top: 5000 })]);
    distribuidores = r[0].sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es')); compras = r[1];
    c.innerHTML = A().cabecera('Distribuidores', 'Proveedores a los que IC compra los productos.', '<button class="ic-btn" id="btnNuevo">+ Nuevo distribuidor</button>') +
      '<div class="ic-filtros"><div class="ic-buscar"><input id="fTexto" type="search" placeholder="Buscar por nombre o NIT" value="' + esc(filtroDis.texto) + '"></div>' +
      '<select id="fEstado"><option value="ACTIVO">Activos</option><option value="INACTIVO">Inactivos</option><option value="">Activos e inactivos</option></select></div>' +
      '<p class="ic-conteo" id="conteo"></p><div class="ic-tabla-caja" id="tabla"></div>';
    U.$('#fEstado', c).value = filtroDis.estado;
    U.$('#fTexto', c).oninput = (e) => { filtroDis.texto = e.target.value; pintarDis(c); };
    U.$('#fEstado', c).onchange = (e) => { filtroDis.estado = e.target.value; pintarDis(c); };
    U.$('#btnNuevo', c).onclick = () => formDistribuidor(c, null);
    pintarDis(c);
  };
  function pintarDis(c) {
    const t = U.norm(filtroDis.texto);
    const lista = distribuidores.filter((d) => (!filtroDis.estado || (d.estado || 'ACTIVO') === filtroDis.estado) && (!t || U.norm(d.nombre + ' ' + (d.nit || '')).includes(t)));
    U.$('#conteo', c).textContent = lista.length + (lista.length === 1 ? ' distribuidor' : ' distribuidores');
    U.$('#tabla', c).innerHTML = !lista.length ? '<div class="ic-vacio">' + (distribuidores.length ? 'No hay distribuidores que coincidan.' : 'Aún no hay distribuidores. Se crean aquí, al registrar una compra en un producto o con la carga masiva de productos.') + '</div>' :
      '<table class="ic-tabla"><thead><tr><th>Distribuidor</th><th class="ocultar-movil">Contacto</th><th style="width:110px;text-align:right">Compras</th><th class="ocultar-movil" style="width:130px">Última compra</th><th style="width:100px">Estado</th></tr></thead><tbody>' +
      lista.map((d) => {
        const cs = compras.filter((x) => x.distribuidor_id === d.Title);
        const ult = cs.map((x) => soloFecha(x.fecha_compra)).sort().pop();
        return '<tr data-id="' + esc(d.Title) + '"><td><b>' + esc(d.nombre) + '</b><span class="sec">' + (d.nit ? 'NIT ' + esc(d.nit) : 'Sin NIT') + (d.pais && d.pais !== 'Colombia' ? ' · ' + esc(d.pais) : '') + ' · ' + esc(d.Title) + '</span></td>' +
          '<td class="ocultar-movil">' + esc(d.contacto || '') + '<span class="sec">' + esc([d.telefono, d.email].filter(Boolean).join(' · ')) + '</span></td>' +
          '<td style="text-align:right">' + cs.length + '</td><td class="ocultar-movil">' + (ult ? U.fmt.fecha(ult + 'T12:00:00') : '—') + '</td>' +
          '<td><span class="ic-tag ' + (d.estado === 'INACTIVO' ? 'inactivo' : 'cliente') + '">' + (d.estado === 'INACTIVO' ? 'Inactivo' : 'Activo') + '</span></td></tr>';
      }).join('') + '</tbody></table>';
    c.querySelectorAll('#tabla tr[data-id]').forEach((tr) => { tr.onclick = () => formDistribuidor(c, distribuidores.find((d) => d.Title === tr.dataset.id)); });
  }
  function formDistribuidor(c, d) {
    const nuevo = !d; d = d || { pais: 'Colombia', estado: 'ACTIVO' };
    U.modal(nuevo ? 'Nuevo distribuidor' : 'Editar distribuidor · ' + d.nombre, '<form class="ic-form" id="fDis" novalidate><div class="ic-campos">' +
      U.campo({ name: 'nombre', label: 'Razón social', valor: d.nombre, req: true, c: 'c8' }) +
      U.campo({ name: 'nit', label: 'NIT (sin DV)', valor: d.nit, c: 'c4', modo: 'numeric' }) +
      U.campo({ name: 'pais', label: 'País', valor: d.pais || 'Colombia', c: 'c4' }) +
      U.campo({ name: 'contacto', label: 'Persona de contacto', valor: d.contacto, c: 'c8' }) +
      U.campo({ name: 'telefono', label: 'Teléfono', t: 'tel', valor: d.telefono, c: 'c4', modo: 'tel' }) +
      U.campo({ name: 'email', label: 'Correo', t: 'email', valor: d.email, c: 'c8' }) +
      (nuevo ? '' : U.campo({ name: 'estado', label: 'Estado', t: 'select', op: [['ACTIVO', 'Activo'], ['INACTIVO', 'Inactivo (no aparece al registrar compras)']], valor: d.estado || 'ACTIVO', vacio: false, c: 'c12' })) +
      '</div>' + (nuevo ? '' : '<p class="ic-conteo">Las compras ya registradas conservan el distribuidor aunque lo desactive.</p>') +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="bC">Cancelar</button><button class="ic-btn" id="bG">' + (nuevo ? 'Crear distribuidor' : 'Guardar cambios') + '</button></div></form>', (m) => {
      U.$('#bC', m).onclick = U.cerrarModal;
      U.$('#fDis', m).onsubmit = async (ev) => {
        ev.preventDefault();
        const v = U.leerForm(ev.target), err = {};
        v.nit = v.nit.replace(/-\d$/, '').replace(/\D/g, ''); v.email = v.email.toLowerCase();
        if (!v.nombre) err.nombre = 'Obligatorio';
        else { const dup = distribuidores.find((x) => x.Title !== d.Title && U.norm(x.nombre) === U.norm(v.nombre)); if (dup) err.nombre = 'Ya existe: ' + dup.Title; }
        if (v.nit) { if (!/^\d{5,12}$/.test(v.nit)) err.nit = 'De 5 a 12 dígitos'; else { const dup = distribuidores.find((x) => x.Title !== d.Title && String(x.nit || '') === v.nit); if (dup) err.nit = 'Ya lo tiene ' + dup.nombre; } }
        if (v.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) err.email = 'Correo no válido';
        if (!U.marcarErrores(ev.target, err)) return;
        const campos = { nombre: v.nombre, nit: v.nit, pais: v.pais, contacto: v.contacto, telefono: v.telefono, email: v.email };
        if (!nuevo) campos.estado = v.estado;
        await U.conCarga(U.$('#bG', m), async () => {
          try {
            if (nuevo) {
              const id = await nuevoId('DIS', 'DIS-', 6, distribuidores);
              await G.crear('MAE_Distribuidores', Object.assign({ Title: id, estado: 'ACTIVO' }, campos));
              await A().auditar('DISTRIBUIDOR', id, 'CREAR', null, campos);
            } else {
              const df = A().diferencias(d, campos);
              if (!df.hay) { U.cerrarModal(); U.aviso('No hay cambios', 'ok'); return; }
              await G.actualizar('MAE_Distribuidores', d._id, campos, d._etag);
              await A().auditar('DISTRIBUIDOR', d.Title, campos.estado === 'INACTIVO' && d.estado !== 'INACTIVO' ? 'DESACTIVAR' : 'ACTUALIZAR', df.antes, df.despues);
            }
            U.cerrarModal(); await App.adminSecciones.distribuidores(c); U.aviso(nuevo ? 'Distribuidor creado' : 'Cambios guardados', 'ok');
          } catch (e) { U.aviso(U.mensajeError(e), 'err', 7000); }
        });
      };
    });
  }

  // =====================================================================
  // FESTIVOS DE COLOMBIA
  // =====================================================================
  // Pascua (algoritmo de Meeus/Butcher)
  function pascua(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
    return y + '-' + pad(mes, 2) + '-' + pad(dia, 2);
  }
  const lunesSiguiente = (s) => { const d = new Date(s + 'T12:00:00'); const w = d.getDay(); return w === 1 ? s : sumarDias(s, (8 - w) % 7); };
  // Ley 51 de 1983 (Ley Emiliani): algunos festivos se trasladan al lunes siguiente
  function festivosColombia(y) {
    const P = pascua(y), f = (m, d) => y + '-' + pad(m, 2) + '-' + pad(d, 2);
    return [
      [f(1, 1), 'Año Nuevo'], [lunesSiguiente(f(1, 6)), 'Día de los Reyes Magos'], [lunesSiguiente(f(3, 19)), 'Día de San José'],
      [sumarDias(P, -3), 'Jueves Santo'], [sumarDias(P, -2), 'Viernes Santo'], [f(5, 1), 'Día del Trabajo'],
      [sumarDias(P, 43), 'Ascensión del Señor'], [sumarDias(P, 64), 'Corpus Christi'], [sumarDias(P, 71), 'Sagrado Corazón de Jesús'],
      [lunesSiguiente(f(6, 29)), 'San Pedro y San Pablo'], [f(7, 20), 'Día de la Independencia'], [f(8, 7), 'Batalla de Boyacá'],
      [lunesSiguiente(f(8, 15)), 'Asunción de la Virgen'], [lunesSiguiente(f(10, 12)), 'Día de la Raza'], [lunesSiguiente(f(11, 1)), 'Todos los Santos'],
      [lunesSiguiente(f(11, 11)), 'Independencia de Cartagena'], [f(12, 8), 'Inmaculada Concepción'], [f(12, 25), 'Navidad']
    ].sort((a, b) => a[0].localeCompare(b[0]));
  }
  let festivos = [], anioFest = new Date().getFullYear();
  App.adminSecciones.festivos = async function vista(c) {
    festivos = await G.items('SYS_Festivos');
    const anios = Array.from(new Set(festivos.map((x) => soloFecha(x.fecha).slice(0, 4)).filter(Boolean).concat([String(new Date().getFullYear())]))).sort();
    const sig = Number(anios[anios.length - 1]) + 1;
    c.innerHTML = A().cabecera('Festivos', 'Festivos de Colombia. Se usan para contar los días hábiles de vigencia de las cotizaciones.',
      '<button class="ic-btn sec" id="btnUno">+ Agregar un día</button> <button class="ic-btn" id="btnAnio">+ Cargar festivos de ' + sig + '</button>') +
      '<div class="ic-chips" id="anios" style="margin-bottom:12px">' + anios.map((a) => '<button data-a="' + a + '" class="' + (String(anioFest) === a ? 'activo' : '') + '">' + a + '</button>').join('') + '</div>' +
      '<div id="tabla"></div><p class="ic-conteo" style="margin-top:12px">Sábados y domingos nunca cuentan como días hábiles; aquí solo van los festivos entre semana. La carga automática calcula los festivos de ley (incluida la Semana Santa y los que pasan al lunes). Revise cada año por si el Gobierno decreta un día adicional.</p>';
    c.querySelectorAll('#anios button').forEach((b) => { b.onclick = () => { anioFest = Number(b.dataset.a); App.adminSecciones.festivos(c); }; });
    U.$('#btnAnio', c).onclick = () => cargarAnio(c, sig);
    U.$('#btnUno', c).onclick = () => formFestivo(c);
    pintarFest(c);
  };
  function pintarFest(c) {
    const lista = festivos.filter((x) => soloFecha(x.fecha).startsWith(String(anioFest))).sort((a, b) => soloFecha(a.fecha).localeCompare(soloFecha(b.fecha)));
    const ley = festivosColombia(anioFest).map((x) => x[0]);
    const faltan = festivosColombia(anioFest).filter((x) => !lista.some((f) => soloFecha(f.fecha) === x[0]));
    U.$('#tabla', c).innerHTML = (faltan.length && lista.length ? '<div class="ic-alerta chica">Faltan ' + faltan.length + ' festivo(s) de ley en ' + anioFest + ': ' + esc(faltan.map((x) => x[1] + ' (' + x[0] + ')').join(', ')) +
        ' <button class="ic-btn sec" id="btnFaltan">Agregarlos</button></div>' : '') +
      (!lista.length ? '<div class="ic-vacio">No hay festivos registrados para ' + anioFest + '. <button class="ic-btn sec" id="btnFaltan">Cargar los de ley</button></div>' :
      '<div class="ic-tabla-caja"><table class="ic-tabla"><thead><tr><th style="width:200px">Fecha</th><th>Festivo</th><th style="width:100px"></th></tr></thead><tbody>' +
      lista.map((x) => { const f = soloFecha(x.fecha), d = new Date(f + 'T12:00:00');
        return '<tr style="cursor:default"><td><b>' + d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }) + '</b></td><td>' + esc(x.descripcion || '') +
          (ley.indexOf(f) < 0 ? ' <span class="ic-tag prospecto">Adicional</span>' : '') + '</td><td><button class="ic-btn sec" data-borrar="' + esc(x._id) + '">Quitar</button></td></tr>'; }).join('') +
      '</tbody></table></div>');
    const bf = U.$('#btnFaltan', c); if (bf) bf.onclick = () => cargarAnio(c, anioFest);
    c.querySelectorAll('[data-borrar]').forEach((b) => { b.onclick = async () => {
      const x = festivos.find((f) => f._id === b.dataset.borrar);
      if (!await U.confirmar('Quitar festivo', 'Se quita ' + soloFecha(x.fecha) + ' (' + (x.descripcion || '') + '). Ese día pasa a contar como hábil. ¿Continuar?', 'Quitar', true)) return;
      try { await G.eliminar('SYS_Festivos', x._id); await A().auditar('FESTIVO', 'Festivo ' + soloFecha(x.fecha), 'ANULAR', { fecha: soloFecha(x.fecha), descripcion: x.descripcion }, null); await App.adminSecciones.festivos(c); U.aviso('Festivo quitado', 'ok'); }
      catch (e) { U.aviso(U.mensajeError(e), 'err', 7000); }
    }; });
  }
  async function cargarAnio(c, y) {
    const nuevos = festivosColombia(y).filter((x) => !festivos.some((f) => soloFecha(f.fecha) === x[0]));
    if (!nuevos.length) { U.aviso('Los festivos de ley de ' + y + ' ya están todos', 'ok'); return; }
    const ok = await U.confirmar('Cargar festivos de ' + y, 'Se agregan ' + nuevos.length + ' festivos:\n\n' + nuevos.map((x) => '• ' + x[0] + ' · ' + x[1]).join('\n'), 'Agregar');
    if (!ok) return;
    try {
      for (const x of nuevos) await G.crear('SYS_Festivos', { Title: x[0], fecha: x[0], descripcion: x[1] });
      await A().auditar('FESTIVO', 'Festivos ' + y, 'CREAR', null, { cantidad: nuevos.length });
      anioFest = y; await App.adminSecciones.festivos(c); U.aviso(nuevos.length + ' festivos agregados', 'ok');
    } catch (e) { U.aviso(U.mensajeError(e), 'err', 7000); await App.adminSecciones.festivos(c); }
  }
  function formFestivo(c) {
    U.modal('Agregar un día festivo', '<form class="ic-form" id="fFes" novalidate><div class="ic-campos">' +
      U.campo({ name: 'fecha', label: 'Fecha', t: 'date', req: true, c: 'c6' }) +
      U.campo({ name: 'descripcion', label: 'Descripción', req: true, c: 'c12', ph: 'Ej.: Día cívico decretado' }) +
      '</div><div class="ic-acciones"><button type="button" class="ic-btn sec" id="bC">Cancelar</button><button class="ic-btn" id="bG">Agregar</button></div></form>', (m) => {
      U.$('#bC', m).onclick = U.cerrarModal;
      U.$('#fFes', m).onsubmit = async (ev) => {
        ev.preventDefault();
        const v = U.leerForm(ev.target), err = {};
        if (!v.fecha) err.fecha = 'Obligatoria';
        else if ([0, 6].indexOf(new Date(v.fecha + 'T12:00:00').getDay()) >= 0) err.fecha = 'Es sábado o domingo: no hace falta registrarlo';
        else if (festivos.some((f) => soloFecha(f.fecha) === v.fecha)) err.fecha = 'Ese día ya está registrado';
        if (!v.descripcion) err.descripcion = 'Obligatoria';
        if (!U.marcarErrores(ev.target, err)) return;
        await U.conCarga(U.$('#bG', m), async () => {
          try {
            await G.crear('SYS_Festivos', { Title: v.fecha, fecha: v.fecha, descripcion: v.descripcion });
            await A().auditar('FESTIVO', 'Festivo ' + v.fecha, 'CREAR', null, { fecha: v.fecha, descripcion: v.descripcion });
            anioFest = Number(v.fecha.slice(0, 4)); U.cerrarModal(); await App.adminSecciones.festivos(c); U.aviso('Festivo agregado', 'ok');
          } catch (e) { U.aviso(U.mensajeError(e), 'err', 7000); }
        });
      };
    });
  }

  // =====================================================================
  // CONSECUTIVOS
  // =====================================================================
  // clave → qué numera, lista donde se usa, prefijo y ancho del ID
  const SECUENCIAS = {
    EMP: ['Empresas', 'MAE_Empresas', 'EMP-', 6], CLI: ['Código de cliente', 'MAE_Empresas', '', 4, 'codigo_cliente'],
    SUC: ['Sedes', 'MAE_Sucursales', 'SUC-', 6], CON: ['Contactos', 'MAE_Contactos', 'CON-', 6],
    PRD: ['Productos', 'MAE_Productos', 'PRD-', 6], PRE: ['Precios', 'MAE_Precios', 'PRE-', 6], INV: ['Cortes de inventario', 'MAE_InventarioCortes', 'INV-', 6],
    DIS: ['Distribuidores', 'MAE_Distribuidores', 'DIS-', 6], PDI: ['Compras a distribuidores', 'MAE_ProductoDistribuidor', 'PDI-', 6],
    COT: ['Cotizaciones (registro interno)', 'COT_Cotizaciones', 'COT-', 6], DET: ['Líneas de cotización', 'COT_Detalle', 'DET-', 6],
    CCO: ['Condiciones de cada cotización', 'COT_CotizacionCondiciones', 'CCO-', 6],
    USR: ['Usuarios', 'SYS_Usuarios', 'USR-', 6], DLG: ['Delegaciones', 'SYS_Delegaciones', 'DLG-', 6], EVT: ['Registro de actividad', 'SYS_Auditoria', 'EVT-', 8]
  };
  let secuencias = [], revision = null;
  App.adminSecciones.consecutivos = async function vista(c) {
    secuencias = await G.items('SYS_Secuencias');
    const orden = Object.keys(SECUENCIAS);
    secuencias.sort((a, b) => ((orden.indexOf(a.Title) + 1) || 99) - ((orden.indexOf(b.Title) + 1) || 99));
    c.innerHTML = A().cabecera('Consecutivos', 'En qué número va cada numeración de la app.', '<button class="ic-btn sec" id="btnRevisar">Revisar contra los datos</button>') +
      '<p class="ic-conteo">La app toma el siguiente número sola cada vez que crea un registro. Aquí solo se consulta. Si la revisión encuentra un consecutivo atrasado (por registros creados a mano en SharePoint), se puede ajustar; nunca se puede bajar, para no repetir números.</p>' +
      '<div class="ic-tabla-caja"><table class="ic-tabla"><thead><tr><th>Numeración</th><th style="width:150px;text-align:right">Último usado</th><th style="width:170px">Siguiente</th><th style="width:230px">Revisión</th></tr></thead><tbody>' +
      secuencias.map((s) => { const d = SECUENCIAS[s.Title] || [s.Title, '', s.Title + '-', 6]; const n = Number(s.ultimo_numero || 0), rv = revision && revision[s.Title];
        return '<tr style="cursor:default"><td><b>' + esc(d[0]) + '</b><span class="sec">Clave ' + esc(s.Title) + '</span></td><td style="text-align:right">' + U.fmt.num(n) + '</td>' +
          '<td><code>' + esc(d[2] + pad(n + 1, d[3])) + '</code></td><td>' + (!rv ? '<span class="sec">—</span>' : rv.error ? '<span class="sec" style="color:var(--ic-err)">' + esc(rv.error) + '</span>'
            : rv.max > n ? '<span class="ic-res error">Atrasado</span><span class="sec">El dato más alto es ' + rv.max + '</span> <button class="ic-btn sec" data-ajustar="' + esc(s.Title) + '" data-max="' + rv.max + '">Ajustar a ' + rv.max + '</button>'
            : '<span class="ic-res ok">Correcto</span>') + '</td></tr>'; }).join('') +
      '</tbody></table></div><p class="ic-conteo" style="margin-top:12px">El número visible de las cotizaciones (por ejemplo MEM20260100) se configura en Parámetros › Primer consecutivo del año.</p>';
    U.$('#btnRevisar', c).onclick = () => revisar(c);
    c.querySelectorAll('[data-ajustar]').forEach((b) => { b.onclick = () => ajustar(c, secuencias.find((s) => s.Title === b.dataset.ajustar), Number(b.dataset.max)); });
  };
  async function revisar(c) {
    const b = U.$('#btnRevisar', c); b.disabled = true; b.textContent = 'Revisando…';
    revision = {};
    const porLista = {};
    await Promise.all(secuencias.filter((s) => SECUENCIAS[s.Title]).map(async (s) => {
      const d = SECUENCIAS[s.Title];
      try {
        porLista[d[1]] = porLista[d[1]] || G.items(d[1], { top: 5000 });
        const items = await porLista[d[1]];
        const max = items.reduce((mx, x) => { const v = d[4] ? String(x[d[4]] || '') : String(x.Title || ''); const m = d[4] ? v.match(/^(\d+)$/) : v.match(new RegExp('^' + d[2] + '(\\d+)$')); return m ? Math.max(mx, Number(m[1])) : mx; }, 0);
        revision[s.Title] = { max };
      } catch (e) { revision[s.Title] = { error: U.mensajeError(e) }; }
    }));
    await App.adminSecciones.consecutivos(c);
    const atrasados = Object.keys(revision).filter((k) => revision[k].max > Number((secuencias.find((s) => s.Title === k) || {}).ultimo_numero || 0));
    U.aviso(atrasados.length ? atrasados.length + ' consecutivo(s) atrasado(s)' : 'Todos los consecutivos están correctos', atrasados.length ? 'warn' : 'ok');
  }
  async function ajustar(c, s, max) {
    if (!await U.confirmar('Ajustar consecutivo', SECUENCIAS[s.Title][0] + ': pasa de ' + (s.ultimo_numero || 0) + ' a ' + max + '. El próximo registro será ' + SECUENCIAS[s.Title][2] + pad(max + 1, SECUENCIAS[s.Title][3]) + '. ¿Continuar?', 'Ajustar')) return;
    try {
      await G.actualizar('SYS_Secuencias', s._id, { ultimo_numero: max }, s._etag);
      await A().auditar('CONSECUTIVO', s.Title, 'ACTUALIZAR', { ultimo_numero: s.ultimo_numero || 0 }, { ultimo_numero: max });
      revision[s.Title] = { max }; await App.adminSecciones.consecutivos(c); U.aviso('Consecutivo ajustado', 'ok');
    } catch (e) { U.aviso(e.status === 412 ? 'Alguien acaba de usar ese consecutivo. Revise de nuevo.' : U.mensajeError(e), 'err', 7000); }
  }

  // =====================================================================
  // REGISTRO DE ACTIVIDAD
  // =====================================================================
  const ENTIDADES = { USUARIO: 'Usuarios', CONDICION: 'Condiciones comerciales', PARAMETRO: 'Parámetros', DELEGACION: 'Delegaciones', DISTRIBUIDOR: 'Distribuidores',
    FESTIVO: 'Festivos', CONSECUTIVO: 'Consecutivos', CARGA_MASIVA: 'Cargas masivas', COTIZACION: 'Cotizaciones', EMPRESA: 'Empresas', PRODUCTO: 'Productos' };
  const ACCIONES = { CREAR: ['Creó', 'ok'], ACTUALIZAR: ['Modificó', 'act'], DESACTIVAR: ['Desactivó', 'igual'], CAMBIO_ESTADO: ['Cambió estado', 'act'], APROBAR: ['Aprobó', 'ok'],
    REVISION: ['Revisión', 'act'], ANULAR: ['Quitó / anuló', 'error'], GENERAR_PDF: ['Generó PDF', 'ok'] };
  const CAMPOS = { nombre: 'Nombre', email: 'Correo', iniciales: 'Iniciales', cargo: 'Cargo', celular: 'Celular', rol: 'Rol', estado: 'Estado', valor: 'Valor', titulo: 'Título',
    texto: 'Texto', tipo: 'Tipo', linea_negocio: 'Línea', predeterminada: 'Predeterminada', orden: 'Orden', fecha_inicio: 'Desde', fecha_fin: 'Hasta', nit: 'NIT', pais: 'País',
    contacto: 'Contacto', telefono: 'Teléfono', ultimo_numero: 'Último número', fecha: 'Fecha', descripcion: 'Descripción', cantidad: 'Cantidad', observaciones: 'Motivo', usuario_id: 'Usuario', otorgado_por: 'Otorgada por', creados: 'Creados', actualizados: 'Actualizados' };
  const filtroReg = { dias: '30', entidad: '', usuario: '', texto: '' };
  let eventos = [], mostrar = 100;
  App.adminSecciones.registro = async function vista(c) {
    const r = await Promise.all([G.items('SYS_Auditoria', { top: 5000 }), App.usuarios ? Promise.resolve(App.usuarios) : G.items('SYS_Usuarios')]);
    App.usuarios = r[1];
    eventos = r[0].sort((a, b) => String(b.fecha_hora || '').localeCompare(String(a.fecha_hora || '')));
    mostrar = 100;
    const ents = Array.from(new Set(eventos.map((e) => e.entidad).filter(Boolean))).sort();
    const usrs = Array.from(new Set(eventos.map((e) => e.usuario_id).filter(Boolean)));
    c.innerHTML = A().cabecera('Registro de actividad', 'Cambios hechos en la app: quién, qué y cuándo. Solo consulta; nadie puede editarlo.') +
      '<div class="ic-filtros"><div class="ic-buscar"><input id="fTexto" type="search" placeholder="Buscar por registro (ej.: USR-000003, CND-GEN-01, nombre de archivo)" value="' + esc(filtroReg.texto) + '"></div>' +
      '<select id="fDias"><option value="1">Hoy</option><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option><option value="">Todo</option></select>' +
      '<select id="fEnt"><option value="">Todas las secciones</option>' + ents.map((e) => '<option value="' + esc(e) + '">' + esc(ENTIDADES[e] || e) + '</option>').join('') + '</select>' +
      '<select id="fUsr"><option value="">Todas las personas</option>' + usrs.map((u) => '<option value="' + esc(u) + '">' + esc(nombreUsuario(u)) + '</option>').join('') + '</select></div>' +
      '<p class="ic-conteo" id="conteo"></p><div id="tabla"></div>';
    U.$('#fDias', c).value = filtroReg.dias; U.$('#fEnt', c).value = filtroReg.entidad; U.$('#fUsr', c).value = filtroReg.usuario;
    U.$('#fTexto', c).oninput = (e) => { filtroReg.texto = e.target.value; mostrar = 100; pintarReg(c); };
    U.$('#fDias', c).onchange = (e) => { filtroReg.dias = e.target.value; mostrar = 100; pintarReg(c); };
    U.$('#fEnt', c).onchange = (e) => { filtroReg.entidad = e.target.value; mostrar = 100; pintarReg(c); };
    U.$('#fUsr', c).onchange = (e) => { filtroReg.usuario = e.target.value; mostrar = 100; pintarReg(c); };
    pintarReg(c);
  };
  function leerJSON(s) { if (!s) return null; try { return JSON.parse(s); } catch (e) { return { valor: s }; } }
  const corto = (v) => { const s = v === null || v === undefined || v === '' ? '(vacío)' : typeof v === 'boolean' ? (v ? 'Sí' : 'No') : String(v); return s.length > 70 ? s.slice(0, 70) + '…' : s; };
  function detalleEvento(e) {
    const a = leerJSON(e.antes), d = leerJSON(e.despues);
    if (e.entidad === 'CARGA_MASIVA' && d) return esc((d.creados || 0) + ' creados · ' + (d.actualizados || 0) + ' actualizados' + (d.fallidos ? ' · ' + d.fallidos + ' fallidos' : '')) + (d.archivo ? '<span class="sec">' + esc(d.archivo) + '</span>' : '');
    if (a && d) return Object.keys(d).map((k) => '<div><b>' + esc(CAMPOS[k] || k) + ':</b> <span style="text-decoration:line-through;color:var(--ic-gris)">' + esc(corto(a[k])) + '</span> → ' + esc(corto(d[k])) + '</div>').join('');
    const o = d || a;
    if (!o) return '';
    return '<span class="sec" style="margin:0">' + esc(Object.keys(o).filter((k) => o[k] !== '' && o[k] !== null).slice(0, 6).map((k) => (CAMPOS[k] || k) + ': ' + corto(o[k])).join(' · ')) + '</span>';
  }
  function pintarReg(c) {
    const limite = filtroReg.dias ? iso(new Date(Date.now() - (Number(filtroReg.dias) - 1) * 86400000)) : '';
    const t = U.norm(filtroReg.texto);
    const lista = eventos.filter((e) => (!limite || (e.fecha_hora && iso(new Date(e.fecha_hora)) >= limite)) &&
      (!filtroReg.entidad || e.entidad === filtroReg.entidad) && (!filtroReg.usuario || e.usuario_id === filtroReg.usuario) &&
      (!t || U.norm([e.registro_id, e.Title, e.despues, e.antes].join(' ')).includes(t)));
    U.$('#conteo', c).textContent = lista.length + (lista.length === 1 ? ' evento' : ' eventos') + (lista.length > mostrar ? ' · mostrando los ' + mostrar + ' más recientes' : '');
    U.$('#tabla', c).innerHTML = !lista.length ? '<div class="ic-vacio">No hay eventos con estos filtros.</div>' :
      '<div class="ic-tabla-caja"><table class="ic-tabla"><thead><tr><th style="width:150px">Fecha</th><th style="width:170px">Persona</th><th style="width:210px">Qué</th><th>Detalle</th></tr></thead><tbody>' +
      lista.slice(0, mostrar).map((e) => { const ac = ACCIONES[e.accion] || [e.accion, 'igual'];
        return '<tr style="cursor:default"><td>' + esc(U.fmt.fechaHora(e.fecha_hora)) + '</td><td>' + esc(nombreUsuario(e.usuario_id)) + '</td>' +
          '<td><span class="ic-res ' + ac[1] + '">' + esc(ac[0]) + '</span><span class="sec">' + esc(ENTIDADES[e.entidad] || e.entidad || '') + ' · ' + esc(e.registro_id || '') + '</span></td><td>' + detalleEvento(e) + '</td></tr>'; }).join('') +
      '</tbody></table></div>' + (lista.length > mostrar ? '<p style="text-align:center;margin-top:12px"><button class="ic-btn sec" id="btnMas">Ver más</button></p>' : '');
    const bm = U.$('#btnMas', c); if (bm) bm.onclick = () => { mostrar += 200; pintarReg(c); };
  }

  // =====================================================================
  // MOTIVOS DE PÉRDIDA (COT_MotivosPerdida)
  // Única fuente de las opciones que el comercial elige al marcar una cotización como perdida.
  // No se borran: se desactivan, para que los reportes de meses anteriores conserven el motivo.
  // =====================================================================
  let motivos = [], usoMotivos = {};
  App.adminSecciones.motivos = async function vista(c) {
    let r;
    try { r = await Promise.all([G.items('COT_MotivosPerdida'), G.items('COT_Cotizaciones', { top: 5000 })]); }
    catch (e) {
      c.innerHTML = A().cabecera('Motivos de pérdida', 'Opciones para registrar por qué se perdió una cotización.') +
        '<div class="ic-form"><b>Falta la lista COT_MotivosPerdida en IC Apps.</b><p>Abra el Instalador (mykadosh.com/ideascontrol/Comercial/Instalador/), inicie sesión y haga clic en «Crear estructura». No borra ni duplica nada: solo agrega lo nuevo.</p></div>';
      return;
    }
    motivos = r[0].sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99) || String(a.nombre).localeCompare(String(b.nombre), 'es'));
    usoMotivos = {}; r[1].forEach((x) => { if (x.motivo_perdida_id) usoMotivos[x.motivo_perdida_id] = (usoMotivos[x.motivo_perdida_id] || 0) + 1; });
    c.innerHTML = A().cabecera('Motivos de pérdida', 'Opciones que el comercial elige al marcar una cotización como perdida. Alimentan el reporte de motivos del Tablero.', '<button class="ic-btn" id="btnNuevo">+ Nuevo motivo</button>') +
      '<div class="ic-tabla-caja" id="tabla"></div><p class="ic-conteo" style="margin-top:12px">Los motivos no se borran: si ya no se usa, desactívelo. Las cotizaciones perdidas conservan su motivo y su comentario. «Pide comentario» obliga al comercial a explicar (útil en «Otro» o «Competencia»).</p>';
    U.$('#btnNuevo', c).onclick = () => formMotivo(c, null);
    U.$('#tabla', c).innerHTML = !motivos.length ? '<div class="ic-vacio">Aún no hay motivos.</div>' :
      '<table class="ic-tabla"><thead><tr><th style="width:60px">Orden</th><th>Motivo</th><th style="width:150px">Pide comentario</th><th style="width:120px;text-align:right">Usado en</th><th style="width:100px">Estado</th></tr></thead><tbody>' +
      motivos.map((m) => '<tr data-id="' + esc(m.Title) + '"><td>' + esc(m.orden || '') + '</td><td><b>' + esc(m.nombre) + '</b><span class="sec">' + esc([m.descripcion, m.Title].filter(Boolean).join(' · ')) + '</span></td>' +
        '<td>' + (m.pide_comentario ? 'Sí' : 'No') + '</td><td style="text-align:right">' + (usoMotivos[m.Title] || 0) + '</td>' +
        '<td><span class="ic-tag ' + (m.estado === 'INACTIVO' ? 'inactivo' : 'cliente') + '">' + (m.estado === 'INACTIVO' ? 'Inactivo' : 'Activo') + '</span></td></tr>').join('') + '</tbody></table>';
    c.querySelectorAll('#tabla tr[data-id]').forEach((tr) => { tr.onclick = () => formMotivo(c, motivos.find((m) => m.Title === tr.dataset.id)); });
  };
  function formMotivo(c, d) {
    const nuevo = !d; d = d || { estado: 'ACTIVO', orden: motivos.reduce((mx, m) => Math.max(mx, Number(m.orden) || 0), 0) + 1 };
    U.modal(nuevo ? 'Nuevo motivo de pérdida' : 'Editar motivo · ' + d.nombre, '<form class="ic-form" id="fMot" novalidate><div class="ic-campos">' +
      U.campo({ name: 'nombre', label: 'Motivo (lo que ve el comercial)', valor: d.nombre, req: true, c: 'c9', max: 60 }) +
      U.campo({ name: 'orden', label: 'Orden en la lista', valor: d.orden, c: 'c3', modo: 'numeric' }) +
      U.campo({ name: 'descripcion', label: 'Aclaración (opcional)', valor: d.descripcion, c: 'c12', ph: 'Ej.: el cliente compró a otro proveedor', max: 120 }) +
      U.campo({ name: 'pide_comentario', label: 'Pedir comentario obligatorio al elegir este motivo', t: 'checkbox', valor: !!d.pide_comentario, c: 'c12' }) +
      (nuevo ? '' : U.campo({ name: 'estado', label: 'Estado', t: 'select', op: [['ACTIVO', 'Activo'], ['INACTIVO', 'Inactivo (ya no aparece para elegir)']], valor: d.estado || 'ACTIVO', vacio: false, c: 'c12' })) +
      '</div>' + (!nuevo && usoMotivos[d.Title] ? '<p class="ic-conteo">Lo usan ' + usoMotivos[d.Title] + ' cotización(es). Si cambia el nombre, los reportes lo muestran con el nombre nuevo.</p>' : '') +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="bC">Cancelar</button><button class="ic-btn" id="bG">' + (nuevo ? 'Crear motivo' : 'Guardar cambios') + '</button></div></form>', (m) => {
      U.$('#bC', m).onclick = U.cerrarModal;
      U.$('#fMot', m).onsubmit = async (ev) => {
        ev.preventDefault();
        const v = U.leerForm(ev.target), err = {};
        if (!v.nombre) err.nombre = 'Obligatorio';
        else { const dup = motivos.find((x) => x.Title !== d.Title && U.norm(x.nombre) === U.norm(v.nombre)); if (dup) err.nombre = 'Ya existe (' + dup.Title + ')'; }
        if (v.orden && !/^\d{1,3}$/.test(v.orden)) err.orden = 'Número';
        if (!nuevo && v.estado === 'INACTIVO' && d.estado !== 'INACTIVO' && motivos.filter((x) => x.estado !== 'INACTIVO' && x.Title !== d.Title).length < 1) err.estado = 'Debe quedar al menos un motivo activo';
        if (!U.marcarErrores(ev.target, err)) return;
        const campos = { nombre: v.nombre, descripcion: v.descripcion, orden: v.orden ? Number(v.orden) : 99, pide_comentario: !!v.pide_comentario };
        if (!nuevo) campos.estado = v.estado;
        await U.conCarga(U.$('#bG', m), async () => {
          try {
            if (nuevo) {
              const id = await nuevoId('MOT', 'MOT-', 2, motivos);
              await G.crear('COT_MotivosPerdida', Object.assign({ Title: id, estado: 'ACTIVO' }, campos));
              await A().auditar('MOTIVO_PERDIDA', id, 'CREAR', null, campos);
            } else {
              const df = A().diferencias(d, campos);
              if (!df.hay) { U.cerrarModal(); U.aviso('No hay cambios', 'ok'); return; }
              await G.actualizar('COT_MotivosPerdida', d._id, campos, d._etag);
              await A().auditar('MOTIVO_PERDIDA', d.Title, campos.estado === 'INACTIVO' && d.estado !== 'INACTIVO' ? 'DESACTIVAR' : 'ACTUALIZAR', df.antes, df.despues);
            }
            U.cerrarModal(); await App.adminSecciones.motivos(c); U.aviso(nuevo ? 'Motivo creado' : 'Cambios guardados', 'ok');
          } catch (e) { U.aviso(U.mensajeError(e), 'err', 7000); }
        });
      };
    });
  }

  // =====================================================================
  // TIPIFICACIONES (COM_Tipificaciones)
  // Nivel 1 (¿hubo contacto?) es fijo. Aquí se manejan el nivel 2 (Resultado,
  // con su acción) y el nivel 3 (Detalle, opcional, dentro de un resultado).
  // No se borran: se desactivan, para conservar el historial de interacciones.
  // =====================================================================
  const ACC_TIP = [['AGENDAR', 'Exige próxima acción'], ['COTIZAR', 'Ofrece crear la cotización'], ['FINAL', 'Cierra el seguimiento'], ['NO_CONTACTAR', 'Marca «no volver a contactar»'], ['NINGUNA', 'Sin acción especial']];
  let tips = [], usoTips = {};
  App.adminSecciones.tipificaciones = async function vista(c) {
    let r;
    try { r = await Promise.all([G.items('COM_Tipificaciones'), G.items('COM_Interacciones', { top: 5000 })]); }
    catch (e) {
      c.innerHTML = A().cabecera('Tipificaciones', 'Resultados que se eligen al registrar una interacción.') +
        '<div class="ic-form"><b>Faltan las listas de interacciones en IC Apps.</b><p>Abra el Instalador (mykadosh.com/ideascontrol/Comercial/Instalador/), inicie sesión y haga clic en «Crear estructura». No borra ni duplica nada.</p></div>';
      return;
    }
    tips = r[0].sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99) || String(a.nombre).localeCompare(String(b.nombre), 'es'));
    usoTips = {}; r[1].forEach((x) => { [x.resultado_id, x.detalle_id].forEach((k) => { if (k) usoTips[k] = (usoTips[k] || 0) + 1; }); });
    const tabla = (aplica, titulo) => {
      const rs = tips.filter((t) => t.nivel === 'RESULTADO' && t.aplica === aplica);
      return '<h3 style="margin:18px 0 8px">' + titulo + '</h3><div class="ic-tabla-caja"><table class="ic-tabla"><thead><tr><th style="width:56px">Orden</th><th>Resultado y sus detalles</th><th style="width:200px">Qué pasa al elegirlo</th><th style="width:90px;text-align:right">Usos</th><th style="width:90px">Estado</th></tr></thead><tbody>' +
        rs.map((t) => {
          const ds = tips.filter((d) => d.nivel === 'DETALLE' && d.padre_id === t.Title);
          return '<tr data-id="' + esc(t.Title) + '"><td>' + esc(t.orden || '') + '</td><td><b>' + esc(t.nombre) + '</b><span class="sec">' + (ds.length ? 'Detalles: ' + ds.map((d) => '<a href="#" data-det="' + esc(d.Title) + '"' + (d.estado === 'INACTIVO' ? ' style="text-decoration:line-through"' : '') + '>' + esc(d.nombre) + '</a>').join(', ') + ' · ' : '') +
            '<a href="#" data-nuevo-det="' + esc(t.Title) + '">+ detalle</a></span></td><td>' + esc((ACC_TIP.find((a) => a[0] === t.accion) || ['', ''])[1]) + '</td><td style="text-align:right">' + (usoTips[t.Title] || 0) + '</td>' +
            '<td><span class="ic-tag ' + (t.estado === 'INACTIVO' ? 'inactivo' : 'cliente') + '">' + (t.estado === 'INACTIVO' ? 'Inactivo' : 'Activo') + '</span></td></tr>';
        }).join('') + '</tbody></table></div>';
    };
    c.innerHTML = A().cabecera('Tipificaciones', 'Lo que el comercial elige al registrar una llamada, correo o visita. Alimentan Mis pendientes y el tablero.', '<button class="ic-btn" id="btnNuevo">+ Nuevo resultado</button>') +
      '<div class="ic-form" style="margin-bottom:6px"><b>Nivel 1 · ¿Logró hablar o tener respuesta?</b> (fijo): Sí, con quien decide · Sí, con otra persona · No hubo contacto.<br><span class="ic-conteo">Según la respuesta, el comercial ve los resultados «con contacto» o «sin contacto».</span></div>' +
      tabla('CONTACTO', 'Resultados cuando hubo contacto') + tabla('NO_CONTACTO', 'Resultados cuando no hubo contacto') +
      '<p class="ic-conteo" style="margin-top:12px">No se borran: si ya no se usa, desactívelo. Las interacciones anteriores conservan su resultado. «Exige próxima acción» obliga a agendar el siguiente paso; «Marca no volver a contactar» bloquea al contacto y cancela sus pendientes.</p>';
    U.$('#btnNuevo', c).onclick = () => formTip(c, null, 'RESULTADO');
    c.querySelectorAll('tr[data-id]').forEach((tr) => { tr.onclick = (e) => { if (e.target.closest('a')) return; formTip(c, tips.find((t) => t.Title === tr.dataset.id)); }; });
    c.querySelectorAll('[data-det]').forEach((a) => { a.onclick = (e) => { e.preventDefault(); formTip(c, tips.find((t) => t.Title === a.dataset.det)); }; });
    c.querySelectorAll('[data-nuevo-det]').forEach((a) => { a.onclick = (e) => { e.preventDefault(); formTip(c, null, 'DETALLE', a.dataset.nuevoDet); }; });
  };
  function formTip(c, d, nivel, padre) {
    const nuevo = !d; nivel = d ? d.nivel : nivel;
    const hermanos = tips.filter((t) => t.nivel === nivel && (nivel === 'DETALLE' ? t.padre_id === (d ? d.padre_id : padre) : true));
    d = d || { estado: 'ACTIVO', nivel, padre_id: padre || '', aplica: 'CONTACTO', accion: 'AGENDAR', orden: hermanos.reduce((mx, t) => Math.max(mx, Number(t.orden) || 0), 0) + 1 };
    const padreT = tips.find((t) => t.Title === d.padre_id);
    const esRes = nivel === 'RESULTADO';
    U.modal((nuevo ? 'Nuevo ' : 'Editar ') + (esRes ? 'resultado' : 'detalle de «' + (padreT ? padreT.nombre : '') + '»'), '<form class="ic-form" id="fTip" novalidate><div class="ic-campos">' +
      U.campo({ name: 'nombre', label: esRes ? 'Resultado (lo que ve el comercial)' : 'Detalle', valor: d.nombre, req: true, c: 'c9', max: 60 }) +
      U.campo({ name: 'orden', label: 'Orden', valor: d.orden, c: 'c3', modo: 'numeric' }) +
      (esRes ? U.campo({ name: 'aplica', label: 'Se muestra cuando…', t: 'select', op: [['CONTACTO', 'Hubo contacto'], ['NO_CONTACTO', 'No hubo contacto']], valor: d.aplica, vacio: false, c: 'c6' }) +
        U.campo({ name: 'accion', label: 'Qué pasa al elegirlo', t: 'select', op: ACC_TIP, valor: d.accion, vacio: false, c: 'c6' }) : '') +
      (nuevo ? '' : U.campo({ name: 'estado', label: 'Estado', t: 'select', op: [['ACTIVO', 'Activo'], ['INACTIVO', 'Inactivo (ya no aparece para elegir)']], valor: d.estado || 'ACTIVO', vacio: false, c: 'c12' })) +
      '</div>' + (!nuevo && usoTips[d.Title] ? '<p class="ic-conteo">Lo usan ' + usoTips[d.Title] + ' interacción(es). Si cambia el nombre, se ve con el nombre nuevo en todas.</p>' : '') +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="bC">Cancelar</button><button class="ic-btn" id="bG">' + (nuevo ? 'Crear' : 'Guardar cambios') + '</button></div></form>', (m) => {
      U.$('#bC', m).onclick = U.cerrarModal;
      U.$('#fTip', m).onsubmit = async (ev) => {
        ev.preventDefault();
        const v = U.leerForm(ev.target), err = {};
        if (!v.nombre) err.nombre = 'Obligatorio';
        else { const dup = tips.find((x) => x.Title !== d.Title && x.nivel === nivel && (esRes ? x.aplica === v.aplica : x.padre_id === d.padre_id) && U.norm(x.nombre) === U.norm(v.nombre)); if (dup) err.nombre = 'Ya existe (' + dup.Title + ')'; }
        if (v.orden && !/^\d{1,3}$/.test(v.orden)) err.orden = 'Número';
        if (!U.marcarErrores(ev.target, err)) return;
        const campos = { nombre: v.nombre, orden: v.orden ? Number(v.orden) : 99 };
        if (esRes) Object.assign(campos, { aplica: v.aplica, accion: v.accion });
        if (!nuevo) campos.estado = v.estado;
        await U.conCarga(U.$('#bG', m), async () => {
          try {
            if (nuevo) {
              const id = await nuevoId('TIP', 'TIP-', 2, tips);
              Object.assign(campos, { nivel, padre_id: esRes ? '' : d.padre_id });
              await G.crear('COM_Tipificaciones', Object.assign({ Title: id, estado: 'ACTIVO' }, campos));
              await A().auditar('TIPIFICACION', id, 'CREAR', null, campos);
            } else {
              const df = A().diferencias(d, campos);
              if (!df.hay) { U.cerrarModal(); U.aviso('No hay cambios', 'ok'); return; }
              await G.actualizar('COM_Tipificaciones', d._id, campos, d._etag);
              await A().auditar('TIPIFICACION', d.Title, campos.estado === 'INACTIVO' && d.estado !== 'INACTIVO' ? 'DESACTIVAR' : 'ACTUALIZAR', df.antes, df.despues);
            }
            if (App.interacciones) App.interacciones.datos.cargado = 0;
            U.cerrarModal(); await App.adminSecciones.tipificaciones(c); U.aviso(nuevo ? 'Creado' : 'Cambios guardados', 'ok');
          } catch (e) { U.aviso(U.mensajeError(e), 'err', 7000); }
        });
      };
    });
  }

  App.festivos = { festivosColombia };   // para pruebas y para el cálculo de días hábiles
})();
