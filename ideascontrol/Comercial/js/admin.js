/* =====================================================================
   APP-101 · Comercial — Administración (solo administradores)
   Rutas: #admin · #admin/usuarios · #admin/condiciones · #admin/parametros
   Listas: SYS_Usuarios · COT_Condiciones · SYS_Parametros · SYS_Auditoria
   Cada cambio queda en SYS_Auditoria con el valor anterior y el nuevo.
   ===================================================================== */
(function () {
  const U = IC.ui, G = IC.graph, esc = U.esc;
  const pad = (n, w) => String(n).padStart(w, '0');
  const SITIO_URL = 'https://' + CFG.sitio.host + CFG.sitio.ruta;

  // Secciones de Administración. activa:false = "Próximamente"
  const SECCIONES = [
    { ruta: 'usuarios', titulo: 'Usuarios', texto: 'Alta de comerciales, iniciales, rol y estado.', activa: true },
    { ruta: 'condiciones', titulo: 'Condiciones comerciales', texto: 'Textos de pago, garantía, soporte y generales que van en la cotización.', activa: true },
    { ruta: 'parametros', titulo: 'Parámetros', texto: 'IVA, descuento máximo, vigencia y textos del PDF.', activa: true },
    { ruta: 'delegaciones', titulo: 'Delegaciones', texto: 'Permisos de administrador por unos días.', activa: true },
    { ruta: 'tipificaciones', titulo: 'Tipificaciones', texto: 'Resultados y detalles que se eligen al registrar una interacción.', activa: true },
    { ruta: 'motivos', titulo: 'Motivos de pérdida', texto: 'Opciones para registrar por qué se perdió una cotización.', activa: true },
    { ruta: 'distribuidores', titulo: 'Distribuidores', texto: 'Proveedores y sus NIT.', activa: true },
    { ruta: 'festivos', titulo: 'Festivos', texto: 'Festivos de Colombia para contar días hábiles.', activa: true },
    { ruta: 'consecutivos', titulo: 'Consecutivos', texto: 'Numeración de empresas, productos y cotizaciones.', activa: true },
    { ruta: 'registro', titulo: 'Registro de actividad', texto: 'Quién cambió qué y cuándo.', activa: true }
  ];

  // ---------- Auditoría ----------
  async function auditar(entidad, registro, accion, antes, despues) {
    try {
      const n = await G.siguiente('EVT');
      await G.crear('SYS_Auditoria', { Title: 'EVT-' + pad(n, 8), fecha_hora: new Date().toISOString(), usuario_id: App.usuario.usuario_id, app_id: CFG.app.id,
        entidad, registro_id: registro, accion, antes: antes ? JSON.stringify(antes) : '', despues: despues ? JSON.stringify(despues) : '' });
    } catch (e) { console.warn('Auditoría no registrada', e); }
  }
  // Devuelve solo los campos que cambian: { antes, despues }
  function diferencias(actual, nuevo) {
    const antes = {}, despues = {};
    Object.keys(nuevo).forEach((k) => {
      const a = actual[k] === undefined || actual[k] === null ? '' : actual[k], b = nuevo[k] === undefined || nuevo[k] === null ? '' : nuevo[k];
      if (String(a) !== String(b)) { antes[k] = a; despues[k] = b; }
    });
    return { antes, despues, hay: Object.keys(despues).length > 0 };
  }

  // =====================================================================
  // ENRUTADOR
  // =====================================================================
  App.vistas['admin'] = async function (c) {
    if (!App.usuario.es_admin) {
      c.innerHTML = '<a class="ic-volver" href="#">← Menú principal</a><div class="ic-form">Administración es solo para administradores.</div>';
      return;
    }
    const sub = (location.hash || '').replace(/^#/, '').split('/')[1] || '';
    const s = SECCIONES.find((x) => x.ruta === sub && x.activa);
    c.innerHTML = '<div class="ic-form" style="text-align:center"><div class="ic-spinner"></div>Cargando…</div>';
    try {
      if (!s) return vistaInicio(c);
      const propias = { usuarios: vistaUsuarios, condiciones: vistaCondiciones, parametros: vistaParametros };
      const fn = propias[sub] || (App.adminSecciones || {})[sub];
      if (fn) return await fn(c);
      return vistaInicio(c);
    } catch (e) {
      console.error(e);
      c.innerHTML = '<a class="ic-volver" href="#admin">← Administración</a><div class="ic-form"><b>No se pudo cargar la información.</b><p>' + esc(U.mensajeError(e)) + '</p><button class="ic-btn" onclick="location.reload()">Reintentar</button></div>';
    }
  };
  const cabecera = (titulo, sub, boton) => '<a class="ic-volver" href="#admin">← Administración</a>' +
    '<div class="ic-barra"><div><h1 class="ic-titulo">' + titulo + '</h1><p class="ic-subtitulo" style="margin:0">' + sub + '</p></div><div class="espacio"></div>' + (boton || '') + '</div>';

  function vistaInicio(c) {
    c.innerHTML = '<a class="ic-volver" href="#">← Menú principal</a><h1 class="ic-titulo">Administración</h1>' +
      '<p class="ic-subtitulo">Configuración de la Microapp Comercial. Solo la ven los administradores.</p><div class="ic-grid">' +
      SECCIONES.map((s) => '<a class="ic-card dorado' + (s.activa ? '' : ' deshabilitada') + '" href="#admin/' + s.ruta + '">' +
        (s.activa ? '' : '<span class="ic-badge">Próximamente</span>') + '<h3 style="margin-top:22px">' + s.titulo + '</h3><p>' + s.texto + '</p></a>').join('') + '</div>';
  }

  // =====================================================================
  // USUARIOS
  // =====================================================================
  const ROLES = [['COMERCIAL', 'Comercial'], ['ADMIN', 'Administrador']];
  let usuarios = [];

  async function vistaUsuarios(c) {
    usuarios = (await G.items('SYS_Usuarios')).sort((a, b) => (a.estado === b.estado ? 0 : a.estado === 'ACTIVO' ? -1 : 1) || String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'));
    App.usuarios = usuarios;
    c.innerHTML = cabecera('Usuarios', 'Personas que pueden entrar a la Microapp Comercial.', '<button class="ic-btn" id="btnNuevo">+ Nuevo usuario</button>') +
      '<p class="ic-conteo">' + usuarios.filter((u) => u.estado === 'ACTIVO').length + ' activos de ' + usuarios.length + '. Haga clic en un usuario para editarlo.</p>' +
      '<div class="ic-tabla-caja"><table class="ic-tabla"><thead><tr><th>Nombre</th><th style="width:90px">Iniciales</th><th class="ocultar-movil">Cargo</th><th style="width:130px">Rol</th><th style="width:100px">Estado</th></tr></thead><tbody>' +
      usuarios.map((u) => '<tr data-id="' + esc(u.Title) + '"><td><b>' + esc(u.nombre) + '</b><span class="sec">' + esc(u.email) + '</span></td><td><b>' + esc(u.iniciales) + '</b></td>' +
        '<td class="ocultar-movil">' + esc(u.cargo || '') + '</td><td>' + (u.rol === 'ADMIN' ? 'Administrador' : 'Comercial') + '</td>' +
        '<td><span class="ic-tag ' + (u.estado === 'ACTIVO' ? 'cliente' : 'inactivo') + '">' + (u.estado === 'ACTIVO' ? 'Activo' : 'Inactivo') + '</span></td></tr>').join('') +
      '</tbody></table></div>' +
      '<p class="ic-conteo" style="margin-top:14px">Importante: además de registrarlo aquí, la persona debe tener acceso como <b>Miembro</b> al sitio de SharePoint <a href="' + SITIO_URL + '" target="_blank" rel="noopener">IC Apps</a>. Sin ese acceso no puede leer ni guardar datos.</p>';
    U.$('#btnNuevo', c).onclick = () => formUsuario(c, null);
    c.querySelectorAll('tr[data-id]').forEach((tr) => { tr.onclick = () => formUsuario(c, usuarios.find((u) => u.Title === tr.dataset.id)); });
  }

  function formUsuario(c, u) {
    const nuevo = !u; u = u || { rol: 'COMERCIAL', estado: 'ACTIVO' };
    const yo = !nuevo && u.Title === App.usuario.usuario_id;
    U.modal(nuevo ? 'Nuevo usuario' : 'Editar usuario · ' + u.nombre, '<form class="ic-form" id="fUsr" novalidate><div class="ic-campos">' +
      U.campo({ name: 'nombre', label: 'Nombre completo', valor: u.nombre, req: true, c: 'c8' }) +
      U.campo({ name: 'iniciales', label: 'Iniciales', valor: u.iniciales, req: true, c: 'c4', max: 4, ayuda: 'Van en el número de la cotización (ej.: MEM20260100)' }) +
      U.campo({ name: 'email', label: 'Correo de Microsoft (Ideas Control)', t: 'email', valor: u.email, req: true, c: 'c12', ayuda: 'El mismo con el que inicia sesión' }) +
      U.campo({ name: 'cargo', label: 'Cargo', valor: u.cargo, c: 'c6' }) +
      U.campo({ name: 'celular', label: 'Celular', t: 'tel', valor: u.celular, c: 'c6', modo: 'tel', ayuda: 'Aparece en el PDF de sus cotizaciones' }) +
      U.campo({ name: 'rol', label: 'Rol', t: 'select', op: ROLES, valor: u.rol, vacio: false, c: 'c6', ayuda: 'Administrador: carga masiva, precios, compras y esta sección' }) +
      U.campo({ name: 'estado', label: 'Estado', t: 'select', op: [['ACTIVO', 'Activo'], ['INACTIVO', 'Inactivo (no puede entrar)']], valor: u.estado, vacio: false, c: 'c6' }) +
      '</div>' + (yo ? '<p class="ic-conteo">Este es su propio usuario: no puede quitarse el rol de administrador ni desactivarse.</p>' : '') +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="bC">Cancelar</button><button class="ic-btn" id="bG">' + (nuevo ? 'Crear usuario' : 'Guardar cambios') + '</button></div></form>', (m) => {
      U.$('#bC', m).onclick = U.cerrarModal;
      const ini = m.querySelector('[name=iniciales]'); ini.oninput = () => { ini.value = ini.value.toUpperCase().replace(/[^A-ZÑ]/g, ''); };
      U.$('#fUsr', m).onsubmit = async (ev) => {
        ev.preventDefault();
        const v = U.leerForm(ev.target), err = {};
        v.email = v.email.toLowerCase(); v.iniciales = v.iniciales.toUpperCase();
        if (!v.nombre) err.nombre = 'Obligatorio';
        if (!/^[A-ZÑ]{2,4}$/.test(v.iniciales)) err.iniciales = 'De 2 a 4 letras';
        else { const d = usuarios.find((x) => x.Title !== u.Title && String(x.iniciales || '').toUpperCase() === v.iniciales); if (d) err.iniciales = 'Ya las usa ' + d.nombre + (d.estado !== 'ACTIVO' ? ' (inactivo)' : ''); }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) err.email = 'Correo no válido';
        else { const d = usuarios.find((x) => x.Title !== u.Title && String(x.email || '').toLowerCase() === v.email); if (d) err.email = 'Ya está registrado: ' + d.nombre; }
        if (yo && v.rol !== 'ADMIN') err.rol = 'No puede quitarse su propio rol de administrador';
        if (yo && v.estado !== 'ACTIVO') err.estado = 'No puede desactivarse a sí mismo';
        const adminsQuedan = usuarios.filter((x) => x.Title !== u.Title && x.rol === 'ADMIN' && x.estado === 'ACTIVO').length + (v.rol === 'ADMIN' && v.estado === 'ACTIVO' ? 1 : 0);
        if (!adminsQuedan && !err.rol) err.rol = 'Debe quedar al menos un administrador activo';
        if (!U.marcarErrores(ev.target, err)) return;
        if (!nuevo && u.iniciales && v.iniciales !== String(u.iniciales).toUpperCase()) {
          U.cerrarModal();
          const ok = await U.confirmar('Cambiar iniciales', 'Las cotizaciones ya emitidas conservan su número. Las nuevas cotizaciones de ' + u.nombre + ' usarán ' + v.iniciales + '. ¿Continuar?', 'Cambiar iniciales');
          if (!ok) return;
          return guardarUsuario(c, u, v, null);
        }
        await U.conCarga(U.$('#bG', m), () => guardarUsuario(c, u, v, nuevo));
      };
    });
  }

  async function guardarUsuario(c, u, v, nuevo) {
    const campos = { nombre: v.nombre, email: v.email, iniciales: v.iniciales, cargo: v.cargo, celular: v.celular, rol: v.rol, estado: v.estado };
    try {
      if (!u.Title) {
        // El consecutivo USR puede ir atrasado si hubo usuarios creados a mano en SharePoint
        let n = await G.siguiente('USR');
        while (usuarios.some((x) => x.Title === 'USR-' + pad(n, 6))) n = await G.siguiente('USR');
        const id = 'USR-' + pad(n, 6);
        await G.crear('SYS_Usuarios', Object.assign({ Title: id }, campos));
        await auditar('USUARIO', id, 'CREAR', null, campos);
        U.cerrarModal(); await vistaUsuarios(c);
        U.modal('Usuario creado', '<div class="ic-form"><p style="margin:0 0 10px"><b>' + esc(v.nombre) + '</b> quedó registrado en la app.</p>' +
          '<p style="margin:0 0 10px">Falta un paso: darle acceso como <b>Miembro</b> al sitio <b>IC Apps</b> de SharePoint, como hizo con Margarita y Patricia. Sin ese acceso, al entrar verá un error de permisos.</p>' +
          '<div class="ic-acciones"><a class="ic-btn sec" href="' + SITIO_URL + '" target="_blank" rel="noopener">Abrir IC Apps</a><button class="ic-btn" id="bOk">Entendido</button></div></div>', (m) => { U.$('#bOk', m).onclick = U.cerrarModal; });
        return;
      }
      const d = diferencias(u, campos);
      if (!d.hay) { U.cerrarModal(); U.aviso('No hay cambios', 'ok'); return; }
      await G.actualizar('SYS_Usuarios', u._id, campos, u._etag);
      await auditar('USUARIO', u.Title, campos.estado !== u.estado && campos.estado === 'INACTIVO' ? 'DESACTIVAR' : 'ACTUALIZAR', d.antes, d.despues);
      if (u.Title === App.usuario.usuario_id) { Object.assign(App.usuario, campos); if (typeof pintarEncabezado === 'function') pintarEncabezado(); }
      U.cerrarModal(); await vistaUsuarios(c); U.aviso('Usuario actualizado', 'ok');
    } catch (e) { U.aviso(U.mensajeError(e), 'err', 7000); }
  }

  // =====================================================================
  // CONDICIONES COMERCIALES
  // =====================================================================
  const TIPOS_CND = [['PAGO', 'Forma de pago', 'PAG'], ['GARANTIA', 'Garantía', 'GAR'], ['SOPORTE', 'Soporte', 'SOP'], ['GENERALES', 'Condiciones generales', 'GEN']];
  const LINEAS = [['TODAS', 'Todas las líneas'], ['VENTA_HW', 'Venta de equipos'], ['LICENCIA', 'Licencias'], ['SAAS', 'SaaS (suscripción)'], ['ALQUILER_HW', 'Alquiler de equipos'], ['SOPORTE', 'Contratos de soporte'], ['LATAM', 'Clientes de Latinoamérica']];
  const lineaTxt = (k) => (LINEAS.find((x) => x[0] === k) || [k, k || '—'])[1];
  let condiciones = [], P = {};
  const filtroCnd = { linea: '', estado: 'ACTIVO' };
  const T = window.ICTextos;
  const mapaParametros = (lista) => { const o = {}; lista.forEach((p) => { o[p.Title] = p.valor; }); return o; };

  // Texto con los datos automáticos resaltados
  const conVariables = (texto) => esc(texto).replace(/\{([^{}]+)\}/g, (m, k) => { const v = T.buscar(k); return '<span class="ic-var' + (v ? '' : ' mala') + '" title="' + esc(v ? 'Dato automático: ' + v.fuente : 'Dato desconocido: revise cómo está escrito') + '">' + esc(v ? v.nombre : k) + '</span>'; });
  // Problemas de una condición: datos repetidos a mano, datos mal escritos, garantía escrita a mano
  function problemas(x) {
    return { rep: T.repetidos(x.texto, P), malas: T.desconocidas(x.texto), garantia: x.tipo === 'GARANTIA' && T.garantiaManual(x.texto) };
  }
  const tieneProblemas = (pr) => pr.rep.length || pr.malas.length || pr.garantia;

  async function vistaCondiciones(c) {
    const r = await Promise.all([G.items('COT_Condiciones'), G.items('SYS_Parametros')]);
    condiciones = r[0]; P = mapaParametros(r[1]);
    const conProblema = condiciones.filter((x) => x.estado !== 'INACTIVO' && tieneProblemas(problemas(x))).length;
    c.innerHTML = cabecera('Condiciones comerciales', 'Textos estándar que se agregan al final de cada cotización.', '<button class="ic-btn" id="btnNuevo">+ Nueva condición</button>') +
      (conProblema ? '<div class="ic-alerta"><b>' + conProblema + ' condición(es) repiten datos que ya existen en otro lugar.</b> Corríjalas para que cada dato se actualice en un solo sitio (botón <b>Corregir</b> en cada una).</div>' : '') +
      '<div class="ic-filtros"><select id="fLinea"><option value="">Todas las líneas de negocio</option>' + LINEAS.map((l) => '<option value="' + l[0] + '">' + l[1] + '</option>').join('') + '</select>' +
      '<select id="fEstado"><option value="ACTIVO">Activas</option><option value="INACTIVO">Inactivas</option><option value="">Activas e inactivas</option></select></div>' +
      '<p class="ic-conteo">Las <b>predeterminadas</b> se agregan solas a cada cotización nueva de esa línea; el comercial puede quitarlas o elegir otras. ' +
      'Los recuadros de color (<span class="ic-var">Vigencia</span>) son <b>datos automáticos</b>: se toman de Parámetros o de Productos al crear la cotización y quedan fijos en ella.</p>' +
      '<div id="lista"></div>';
    U.$('#fLinea', c).value = filtroCnd.linea; U.$('#fEstado', c).value = filtroCnd.estado;
    U.$('#fLinea', c).onchange = (e) => { filtroCnd.linea = e.target.value; pintarCondiciones(c); };
    U.$('#fEstado', c).onchange = (e) => { filtroCnd.estado = e.target.value; pintarCondiciones(c); };
    U.$('#btnNuevo', c).onclick = () => formCondicion(c, null);
    pintarCondiciones(c);
  }

  function pintarCondiciones(c) {
    const lista = condiciones.filter((x) => (!filtroCnd.estado || (x.estado || 'ACTIVO') === filtroCnd.estado) &&
      (!filtroCnd.linea || x.linea_negocio === filtroCnd.linea || x.linea_negocio === 'TODAS'));
    U.$('#lista', c).innerHTML = TIPOS_CND.map((t) => {
      const grupo = lista.filter((x) => x.tipo === t[0]).sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99));
      return '<div class="ic-seccion">' + t[1] + ' (' + grupo.length + ')</div>' + (!grupo.length ? '<div class="ic-vacio" style="background:var(--ic-blanco);border:1px dashed var(--ic-borde);border-radius:var(--ic-radio)">Sin condiciones de este tipo.</div>' :
        '<div class="ic-tabla-caja"><table class="ic-tabla"><tbody>' + grupo.map((x) => {
          const pr = problemas(x), mal = tieneProblemas(pr);
          return '<tr data-id="' + esc(x.Title) + '">' +
            '<td><b>' + esc(x.titulo) + '</b> ' + (x.predeterminada ? '<span class="ic-tag cliente">Predeterminada</span> ' : '') + (x.estado === 'INACTIVO' ? '<span class="ic-tag inactivo">Inactiva</span>' : '') +
            '<div style="margin-top:4px;white-space:pre-line">' + conVariables(x.texto) + '</div>' +
            (mal ? '<div class="ic-alerta chica">' + avisosHtml(pr) + ' <button class="ic-btn sec" data-corregir="' + esc(x.Title) + '">Corregir</button></div>' : '') +
            '<span class="sec">' + esc(lineaTxt(x.linea_negocio)) + ' · Orden ' + esc(x.orden === undefined || x.orden === null ? '—' : x.orden) + ' · ' + esc(x.Title) + '</span></td></tr>';
        }).join('') + '</tbody></table></div>');
    }).join('');
    c.querySelectorAll('#lista tr[data-id]').forEach((tr) => { tr.onclick = (e) => {
      const x = condiciones.find((y) => y.Title === tr.dataset.id);
      formCondicion(c, x, e.target.closest('[data-corregir]') ? corregido(x) : null);
    }; });
  }
  function avisosHtml(pr) {
    return [].concat(
      pr.rep.map((r) => 'Repite ' + (r.encontrado === 'el número de cuenta' ? 'el número de cuenta' : '«' + esc(r.encontrado.length > 50 ? r.encontrado.slice(0, 50) + '…' : r.encontrado) + '»') + ', que ya está en ' + esc(r.variable.fuente) + '.'),
      pr.malas.map((k) => 'El dato {' + esc(k) + '} no existe; revise cómo está escrito.'),
      pr.garantia ? ['Escribe meses de garantía a mano; ya están en cada producto (Productos › Garantía).'] : []
    ).join('<br>');
  }
  // Propuesta de texto sin datos repetidos
  function corregido(x) {
    let t = String(x.texto || '');
    T.repetidos(t, P).forEach((r) => { if (r.corregir) t = r.corregir(t); });
    if (x.tipo === 'GARANTIA' && T.garantiaManual(t)) t = T.propuestaGarantia(t);
    return t;
  }

  function formCondicion(c, x, textoPropuesto) {
    const nuevo = !x; x = x || { tipo: 'GENERALES', linea_negocio: 'TODAS', predeterminada: false, estado: 'ACTIVO' };
    const propuesta = textoPropuesto !== null && textoPropuesto !== undefined && textoPropuesto !== x.texto;
    U.modal(nuevo ? 'Nueva condición comercial' : 'Editar condición · ' + x.Title, '<form class="ic-form" id="fCnd" novalidate>' +
      (propuesta ? '<div class="ic-alerta chica" style="margin-bottom:12px">Le propongo este texto: los datos que estaban escritos a mano ahora se toman de su única fuente. Revíselo y guarde.</div>' : '') +
      '<div class="ic-campos">' +
      U.campo({ name: 'tipo', label: 'Tipo', t: 'select', op: TIPOS_CND.map((t) => [t[0], t[1]]), valor: x.tipo, vacio: false, c: 'c6' }) +
      U.campo({ name: 'linea_negocio', label: 'Línea de negocio', t: 'select', op: LINEAS, valor: x.linea_negocio, vacio: false, c: 'c6' }) +
      U.campo({ name: 'titulo', label: 'Título', valor: x.titulo, req: true, c: 'c8', ph: 'Ej.: Forma de pago' }) +
      U.campo({ name: 'orden', label: 'Orden en el PDF', valor: x.orden, c: 'c4', modo: 'numeric', ayuda: '1 = primera' }) +
      '<div class="ic-campo c12"><label>Insertar un dato automático (clic para agregarlo donde está el cursor)</label><div class="ic-vars">' +
        T.VARIABLES.map((v) => '<button type="button" class="ic-var" data-var="' + esc(v.clave) + '" title="' + esc(v.fuente) + '">+ ' + esc(v.nombre) + '</button>').join('') + '</div></div>' +
      U.campo({ name: 'texto', label: 'Texto', t: 'textarea', filas: 7, valor: propuesta ? textoPropuesto : x.texto, req: true, c: 'c12', ayuda: 'No escriba a mano datos como la vigencia, los datos bancarios o los meses de garantía: use los botones de arriba.' }) +
      '<div class="ic-campo c12"><label>Así se verá en una cotización creada hoy</label><div class="ic-prev-texto" id="pvTexto"></div><div id="avTexto"></div></div>' +
      U.campo({ name: 'predeterminada', label: 'Predeterminada: agregarla sola a las cotizaciones nuevas de esta línea', t: 'checkbox', valor: x.predeterminada, c: 'c12' }) +
      (nuevo ? '' : U.campo({ name: 'estado', label: 'Estado', t: 'select', op: [['ACTIVO', 'Activa'], ['INACTIVO', 'Inactiva (ya no se ofrece)']], valor: x.estado || 'ACTIVO', vacio: false, c: 'c6' })) +
      '</div><div class="ic-acciones"><button type="button" class="ic-btn sec" id="bC">Cancelar</button><button class="ic-btn" id="bG">' + (nuevo ? 'Crear condición' : 'Guardar cambios') + '</button></div></form>', (m) => {
      const ta = m.querySelector('[name=texto]'), tipo = m.querySelector('[name=tipo]');
      const repintar = () => {
        U.$('#pvTexto', m).textContent = T.resolver(ta.value, P, null, 'ejemplo') || '—';
        const pr = problemas({ texto: ta.value, tipo: tipo.value });
        U.$('#avTexto', m).innerHTML = tieneProblemas(pr) ? '<div class="ic-alerta chica" style="margin-top:8px">' + avisosHtml(pr) +
          (pr.rep.some((r) => r.corregir) || pr.garantia ? ' <button type="button" class="ic-btn sec" id="bFix">Usar datos automáticos</button>' : '') + '</div>' : '';
        const bf = U.$('#bFix', m); if (bf) bf.onclick = () => { ta.value = corregido({ texto: ta.value, tipo: tipo.value }); repintar(); };
      };
      ta.oninput = repintar; tipo.onchange = repintar; repintar();
      m.querySelectorAll('[data-var]').forEach((b) => { b.onclick = () => {
        const ins = '{' + b.dataset.var + '}', i = ta.selectionStart ?? ta.value.length, j = ta.selectionEnd ?? i;
        ta.value = ta.value.slice(0, i) + ins + ta.value.slice(j); ta.focus(); ta.selectionStart = ta.selectionEnd = i + ins.length; repintar();
      }; });
      U.$('#bC', m).onclick = U.cerrarModal;
      U.$('#fCnd', m).onsubmit = async (ev) => {
        ev.preventDefault();
        const v = U.leerForm(ev.target), err = {};
        // El texto original del textarea conserva los saltos de línea
        const texto = ta.value.replace(/\r/g, '').split('\n').map((l) => l.trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
        const pr = problemas({ texto, tipo: v.tipo });
        if (!v.titulo) err.titulo = 'Obligatorio';
        if (!texto) err.texto = 'Obligatorio';
        else if (pr.malas.length) err.texto = 'Revise el dato {' + pr.malas[0] + '}: no existe';
        else if (pr.rep.length) err.texto = 'El texto repite datos de Parámetros. Use «Usar datos automáticos».';
        else if (pr.garantia) err.texto = 'Los meses de garantía se toman de cada producto. Use «Usar datos automáticos».';
        if (v.orden && !/^\d{1,3}$/.test(v.orden)) err.orden = 'Número entero';
        if (!U.marcarErrores(ev.target, err)) return;
        const campos = { tipo: v.tipo, linea_negocio: v.linea_negocio, titulo: v.titulo, texto, orden: v.orden === '' ? null : Number(v.orden), predeterminada: !!v.predeterminada };
        if (!nuevo) campos.estado = v.estado;
        await U.conCarga(U.$('#bG', m), async () => {
          try {
            if (nuevo) {
              const pre = TIPOS_CND.find((t) => t[0] === v.tipo)[2];
              const max = condiciones.reduce((mx, y) => { const r = String(y.Title).match(new RegExp('^CND-' + pre + '-(\\d+)$')); return r ? Math.max(mx, Number(r[1])) : mx; }, 0);
              const id = 'CND-' + pre + '-' + pad(max + 1, 2);
              await G.crear('COT_Condiciones', Object.assign({ Title: id, estado: 'ACTIVO' }, campos));
              await auditar('CONDICION', id, 'CREAR', null, campos);
              U.aviso('Condición creada', 'ok');
            } else {
              const d = diferencias(x, campos);
              if (!d.hay) { U.cerrarModal(); U.aviso('No hay cambios', 'ok'); return; }
              await G.actualizar('COT_Condiciones', x._id, campos, x._etag);
              await auditar('CONDICION', x.Title, campos.estado === 'INACTIVO' && x.estado !== 'INACTIVO' ? 'DESACTIVAR' : 'ACTUALIZAR', d.antes, d.despues);
              U.aviso('Cambios guardados', 'ok');
            }
            U.cerrarModal(); await vistaCondiciones(c);
          } catch (e) { U.aviso(U.mensajeError(e), 'err', 7000); }
        });
      };
    });
  }

  // =====================================================================
  // PARÁMETROS
  // =====================================================================
  // Cómo se edita cada parámetro conocido. t: pct (se ve 19, se guarda 0.19) | int | moneda | texto | largo | url
  const PARAMS = {
    IVA_PORCENTAJE: { g: 0, e: 'IVA', t: 'pct', min: 0, max: 100, ayuda: 'Se aplica a los productos marcados con "Aplica IVA".' },
    DESCUENTO_TOPE: { g: 0, e: 'Descuento máximo sin aprobación', t: 'pct', min: 0, max: 100, ayuda: 'Un descuento mayor en cualquier línea exige aprobación del administrador.' },
    VIGENCIA_DIAS_HABILES: { g: 0, e: 'Vigencia de la cotización', t: 'int', min: 1, max: 90, suf: 'días hábiles', ayuda: 'Única fuente de la vigencia: las condiciones la traen con el dato automático «Vigencia».' },
    DIAS_ALERTA_VENCIMIENTO: { g: 0, e: 'Alerta antes del vencimiento', t: 'int', min: 0, max: 30, suf: 'días hábiles', ayuda: 'El Tablero muestra las cotizaciones que vencen dentro de estos días.' },
    DIAS_SEGUIMIENTO: { g: 0, e: 'Seguimiento sin respuesta', t: 'int', min: 1, max: 60, suf: 'días hábiles', ayuda: 'El Tablero alerta las cotizaciones enviadas que llevan estos días sin respuesta del cliente.' },
    MONEDA_DEFECTO: { g: 0, e: 'Moneda por defecto', t: 'moneda' },
    CONSECUTIVO_INICIAL_2026: { g: 0, e: 'Primer consecutivo de cotización 2026', t: 'int', min: 1, max: 9999, ayuda: 'Solo tiene efecto antes de emitir la primera cotización del año.' },
    TEXTO_INTRO_RECURRENTE: { g: 1, e: 'Introducción · cliente recurrente', t: 'largo' },
    TEXTO_INTRO_NUEVO: { g: 1, e: 'Introducción · cliente nuevo', t: 'largo' },
    TEXTO_PROPUESTA: { g: 1, e: 'Párrafo de la propuesta', t: 'largo' },
    TEXTO_CIERRE: { g: 1, e: 'Texto de cierre (antes de la firma)', t: 'largo' },
    DATOS_BANCARIOS: { g: 1, e: 'Datos bancarios', t: 'largo', ayuda: 'Única fuente: las condiciones los traen con el dato automático «Datos bancarios».' },
    SITIO_WEB: { g: 1, e: 'Sitio web (pie del PDF)', t: 'texto' },
    SITIO_DOCUMENTAL_URL: { g: 2, e: 'Sitio documental (Ideas Control)', t: 'url', ayuda: 'Dirección del sitio de SharePoint donde se guardan los PDF. Ej.: https://ideascontrolsas.sharepoint.com/sites/IdeasControl' },
    BIBLIOTECA_CLIENTES: { g: 2, e: 'Biblioteca de clientes', t: 'texto' },
    BIBLIOTECA_COMERCIAL: { g: 2, e: 'Biblioteca comercial', t: 'texto' },
    CARPETA_PROSPECTOS: { g: 2, e: 'Carpeta de prospectos', t: 'texto' }
  };
  const GRUPOS = [
    ['Cotización', 'Reglas que aplican a todas las cotizaciones nuevas. Las cotizaciones ya emitidas no cambian.'],
    ['Textos del PDF', 'Lo que se imprime en cada cotización.'],
    ['Ubicación de los documentos', 'Dónde se guardan los PDF. Cámbielo solo si se mueve el sitio de SharePoint.'],
    ['Otros', 'Parámetros adicionales.']
  ];
  let parametros = [], usosParam = {};

  const aVista = (p, def) => def.t === 'pct' ? (p.valor === '' || p.valor === undefined || p.valor === null ? '' : String(Math.round(Number(p.valor) * 10000) / 100)) : (p.valor === null || p.valor === undefined ? '' : String(p.valor));

  async function vistaParametros(c) {
    const r = await Promise.all([G.items('SYS_Parametros'), G.items('COT_Condiciones')]);
    parametros = r[0].filter((p) => !p.app_id || p.app_id === CFG.app.id);
    // ¿Qué condiciones activas usan cada parámetro como dato automático?
    usosParam = {};
    r[1].filter((x) => x.estado !== 'INACTIVO').forEach((x) => T.usadas(x.texto).forEach((v) => { if (v.param) (usosParam[v.param] = usosParam[v.param] || []).indexOf(x.titulo) < 0 && usosParam[v.param].push(x.titulo); }));
    const def = (p) => PARAMS[p.Title] || { g: 3, e: p.Title, t: String(p.valor || '').length > 60 ? 'largo' : 'texto' };
    const orden = Object.keys(PARAMS);
    parametros.sort((a, b) => ((orden.indexOf(a.Title) + 1) || 999) - ((orden.indexOf(b.Title) + 1) || 999));
    c.innerHTML = cabecera('Parámetros', 'Valores que usa la app al armar las cotizaciones.') +
      GRUPOS.map((g, gi) => {
        const ps = parametros.filter((p) => def(p).g === gi);
        if (!ps.length) return '';
        return '<form class="ic-form" data-g="' + gi + '" novalidate style="margin-bottom:16px"><h3 style="margin:0 0 2px">' + g[0] + '</h3><p class="ic-conteo" style="margin:0 0 12px">' + g[1] + '</p><div class="ic-campos">' +
          ps.map((p) => campoParametro(p, def(p))).join('') +
          '</div><div class="ic-acciones"><button class="ic-btn" type="submit">Guardar cambios</button></div></form>';
      }).join('');
    c.querySelectorAll('form[data-g]').forEach((f) => { f.onsubmit = (ev) => { ev.preventDefault(); guardarParametros(c, f, def); }; });
  }

  function campoParametro(p, d) {
    const usos = usosParam[p.Title];
    const ayuda = [d.ayuda, p.descripcion && !PARAMS[p.Title] ? p.descripcion : '', usos ? '<b>Se usa en las condiciones:</b> ' + esc(usos.join(', ')) + '.' : ''].filter(Boolean).join(' ');
    const label = d.e + (d.t === 'pct' ? ' (%)' : d.suf ? ' (' + d.suf + ')' : '');
    if (d.t === 'largo') return U.campo({ name: p.Title, label, t: 'textarea', filas: 3, valor: aVista(p, d), c: 'c12', ayuda });
    if (d.t === 'moneda') return U.campo({ name: p.Title, label, t: 'select', op: [['COP', 'COP · Peso colombiano'], ['USD', 'USD · Dólar']], valor: p.valor || 'COP', vacio: false, c: 'c6', ayuda });
    return U.campo({ name: p.Title, label, valor: aVista(p, d), c: d.t === 'url' ? 'c12' : 'c6', modo: d.t === 'pct' ? 'decimal' : d.t === 'int' ? 'numeric' : undefined, ayuda, t: d.t === 'url' ? 'url' : 'text' });
  }

  async function guardarParametros(c, f, def) {
    const err = {}, cambios = [];
    f.querySelectorAll('[name]').forEach((el) => {
      const p = parametros.find((x) => x.Title === el.name), d = def(p);
      let v = el.tagName === 'TEXTAREA' ? el.value.replace(/\r/g, '').trim() : String(el.value || '').trim(), guardar = v;
      if (d.t === 'pct') {
        const n = Number(v.replace(',', '.'));
        if (v === '' || isNaN(n) || n < d.min || n > d.max) { err[el.name] = 'Escriba un porcentaje entre ' + d.min + ' y ' + d.max; return; }
        guardar = String(Math.round(n * 100) / 10000);
      } else if (d.t === 'int') {
        if (!/^\d+$/.test(v) || Number(v) < d.min || Number(v) > d.max) { err[el.name] = 'Número entero entre ' + d.min + ' y ' + d.max; return; }
        guardar = String(Number(v));
      } else if (d.t === 'url') {
        if (v && !/^https:\/\/[^\s]+$/.test(v)) { err[el.name] = 'Debe empezar por https://'; return; }
        guardar = v.replace(/\/+$/, '');
      }
      if (!String(guardar).trim() && usosParam[p.Title]) { err[el.name] = 'No puede quedar vacío: lo usan las condiciones ' + usosParam[p.Title].join(', '); return; }
      if (String(guardar) !== String(p.valor === null || p.valor === undefined ? '' : p.valor)) cambios.push({ p, valor: guardar });
    });
    // Reglas entre parámetros
    const val = (k) => { const el = f.querySelector('[name=' + k + ']'); return el ? Number(el.value) : null; };
    if (val('DIAS_ALERTA_VENCIMIENTO') !== null && val('VIGENCIA_DIAS_HABILES') !== null && val('DIAS_ALERTA_VENCIMIENTO') >= val('VIGENCIA_DIAS_HABILES') && !err.DIAS_ALERTA_VENCIMIENTO)
      err.DIAS_ALERTA_VENCIMIENTO = 'Debe ser menor que la vigencia';
    if (!U.marcarErrores(f, err)) return;
    if (!cambios.length) { U.aviso('No hay cambios', 'ok'); return; }
    const resumen = cambios.map((x) => '• ' + def(x.p).e + ': ' + mostrar(x.p.valor, def(x.p)) + ' → ' + mostrar(x.valor, def(x.p))).join('\n');
    const ok = await U.confirmar('Confirmar cambios', 'Se van a cambiar ' + cambios.length + ' parámetro(s). Aplica a las cotizaciones nuevas.\n\n' + resumen, 'Guardar');
    if (!ok) return;
    const boton = f.querySelector('button[type=submit]');
    await U.conCarga(boton, async () => {
      let hechos = 0;
      for (const x of cambios) {
        try {
          await G.actualizar('SYS_Parametros', x.p._id, { valor: x.valor }, x.p._etag);
          await auditar('PARAMETRO', x.p.Title, 'ACTUALIZAR', { valor: x.p.valor }, { valor: x.valor });
          hechos++;
        } catch (e) { U.aviso(def(x.p).e + ': ' + U.mensajeError(e), 'err', 8000); }
      }
      if (hechos) U.aviso(hechos + ' parámetro(s) actualizados', 'ok');
    });
    await vistaParametros(c);
  }
  function mostrar(v, d) {
    if (v === null || v === undefined || v === '') return '(vacío)';
    if (d.t === 'pct') return Math.round(Number(v) * 10000) / 100 + ' %';
    const s = String(v); return s.length > 40 ? s.slice(0, 40) + '…' : s;
  }

  // Para las demás secciones (admin_extra.js) y, más adelante, las cotizaciones
  App.admin = { auditar, diferencias, cabecera };
})();
