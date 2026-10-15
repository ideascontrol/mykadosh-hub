/* =====================================================================
   APP-101 · Comercial — Empresas (clientes y prospectos), sucursales y contactos
   Rutas: #empresas · #empresas/nueva · #empresas/EMP-000001 · #empresas/EMP-000001/editar
   Listas: MAE_Empresas · MAE_Sucursales · MAE_Contactos
   ===================================================================== */
(function () {
  const U = IC.ui, G = IC.graph, esc = U.esc;
  const datos = { empresas: [], sucursales: [], contactos: [], cargado: 0 };
  const filtro = { texto: '', tipo: 'TODOS', estado: 'ACTIVO', comercial: '' };

  const TIPOS_ID = [['NIT', 'NIT (Colombia)'], ['RUC', 'RUC'], ['RFC', 'RFC'], ['TAX ID', 'Tax ID'], ['OTRO', 'Otro']];
  const ICO_BUSCAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';

  // ---------- Utilidades ----------
  const pad = (n, w) => String(n).padStart(w, '0');
  const nombreUsuario = (id) => { const u = (App.usuarios || []).find((x) => x.Title === id); return u ? u.nombre : (id || '—'); };
  const opcionesComerciales = () => (App.usuarios || []).filter((u) => u.estado === 'ACTIVO').map((u) => [u.Title, u.nombre + ' (' + u.iniciales + ')']);
  const soloFecha = (v) => (v ? String(v).slice(0, 10) : '');
  const nitTexto = (e) => e.nit ? (e.tipo_id_fiscal === 'NIT' && e.dv !== undefined && e.dv !== '' && e.dv !== null ? e.nit + '-' + e.dv : e.nit) : '';
  const tagEmpresa = (e) => e.estado === 'INACTIVO' ? '<span class="ic-tag inactivo">Inactiva</span>'
    : e.estado_comercial === 'CLIENTE' ? '<span class="ic-tag cliente">Cliente' + (e.codigo_cliente ? ' · ' + esc(e.codigo_cliente) : '') + '</span>'
    : '<span class="ic-tag prospecto">Prospecto</span>';

  // Dígito de verificación del NIT (DIAN)
  function calcularDV(nit) {
    const n = String(nit || '').replace(/\D/g, '');
    if (!n) return '';
    const pesos = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
    let suma = 0;
    n.split('').reverse().forEach((d, i) => { suma += Number(d) * (pesos[i] || 0); });
    const r = suma % 11;
    return String(r > 1 ? 11 - r : r);
  }

  async function cargar(forzar) {
    if (!forzar && datos.cargado && Date.now() - datos.cargado < 60000) return;
    const [e, s, c] = await Promise.all([G.items('MAE_Empresas', { top: 5000 }), G.items('MAE_Sucursales', { top: 5000 }), G.items('MAE_Contactos', { top: 5000 })]);
    datos.empresas = e.sort((a, b) => String(a.razon_social || '').localeCompare(String(b.razon_social || ''), 'es'));
    datos.sucursales = s; datos.contactos = c; datos.cargado = Date.now();
  }
  const empresaPorId = (id) => datos.empresas.find((e) => e.Title === id);

  // ---------- Enrutador interno ----------
  App.vistas['empresas'] = async function (c) {
    const partes = (location.hash || '').replace(/^#/, '').split('/');
    c.innerHTML = '<div class="ic-centro" style="min-height:40vh"><div><div class="ic-spinner"></div></div></div>';
    try {
      await cargar();
      if (partes[1] === 'nueva') return vistaForm(c, null);
      if (partes[1] && partes[2] === 'editar') return vistaForm(c, empresaPorId(partes[1]));
      if (partes[1]) return vistaFicha(c, partes[1]);
      return vistaLista(c);
    } catch (e) {
      console.error(e);
      c.innerHTML = '<a class="ic-volver" href="#">← Menú principal</a><div class="ic-form"><b>No se pudo cargar la información.</b><p>' + esc(U.mensajeError(e)) + '</p><button class="ic-btn" onclick="location.reload()">Reintentar</button></div>';
    }
  };

  // =====================================================================
  // LISTA
  // =====================================================================
  function vistaLista(c) {
    c.innerHTML =
      '<a class="ic-volver" href="#">← Menú principal</a>' +
      '<div class="ic-barra"><div><h1 class="ic-titulo">Empresas y contactos</h1><p class="ic-subtitulo" style="margin:0">Prospectos y clientes de Ideas Control</p></div>' +
      '<div class="espacio"></div><a class="ic-btn" href="#empresas/nueva">+ Nueva empresa</a></div>' +
      '<div class="ic-filtros">' +
        '<div class="ic-buscar">' + ICO_BUSCAR + '<input id="fTexto" type="search" placeholder="Buscar por nombre, NIT, ciudad, contacto o teléfono" value="' + esc(filtro.texto) + '"></div>' +
        '<div class="ic-chips" id="fTipo">' + [['TODOS', 'Todas'], ['PROSPECTO', 'Prospectos'], ['CLIENTE', 'Clientes']].map((t) => '<button data-v="' + t[0] + '" class="' + (filtro.tipo === t[0] ? 'activo' : '') + '">' + t[1] + '</button>').join('') + '</div>' +
        '<select id="fEstado"><option value="ACTIVO">Activas</option><option value="INACTIVO">Inactivas</option><option value="">Activas e inactivas</option></select>' +
        '<select id="fComercial"><option value="">Todos los comerciales</option>' + opcionesComerciales().map((o) => '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>').join('') + '</select>' +
      '</div>' +
      '<p class="ic-conteo" id="conteo"></p><div class="ic-tabla-caja" id="tabla"></div>';
    U.$('#fEstado', c).value = filtro.estado;
    U.$('#fComercial', c).value = filtro.comercial;
    U.$('#fTexto', c).oninput = (e) => { filtro.texto = e.target.value; pintarTabla(c); };
    U.$('#fEstado', c).onchange = (e) => { filtro.estado = e.target.value; pintarTabla(c); };
    U.$('#fComercial', c).onchange = (e) => { filtro.comercial = e.target.value; pintarTabla(c); };
    U.$('#fTipo', c).querySelectorAll('button').forEach((b) => { b.onclick = () => { filtro.tipo = b.dataset.v; U.$('#fTipo', c).querySelectorAll('button').forEach((x) => x.classList.toggle('activo', x === b)); pintarTabla(c); }; });
    pintarTabla(c);
    U.$('#fTexto', c).focus();
  }

  function pintarTabla(c) {
    const t = U.norm(filtro.texto);
    const lista = datos.empresas.filter((e) => {
      if (filtro.estado && e.estado !== filtro.estado) return false;
      if (filtro.tipo !== 'TODOS' && e.estado_comercial !== filtro.tipo) return false;
      if (filtro.comercial && e.comercial_asignado !== filtro.comercial) return false;
      if (!t) return true;
      const contactos = datos.contactos.filter((x) => x.empresa_id === e.Title).map((x) => [x.nombres, x.apellidos, x.email, x.celular].join(' ')).join(' ');
      return U.norm([e.razon_social, e.nit, e.ciudad, e.telefono, e.celular, e.codigo_cliente, e.codigo_cliente_anterior, e.Title, contactos].join(' ')).includes(t);
    });
    U.$('#conteo', c).textContent = lista.length + (lista.length === 1 ? ' empresa' : ' empresas');
    if (!lista.length) {
      U.$('#tabla', c).innerHTML = '<div class="ic-vacio">' + (datos.empresas.length ? 'No hay empresas que coincidan con la búsqueda.' : 'Aún no hay empresas registradas. Cree la primera con <b>+ Nueva empresa</b>.') + '</div>';
      return;
    }
    U.$('#tabla', c).innerHTML = '<table class="ic-tabla"><thead><tr><th>Empresa</th><th>NIT</th><th class="ocultar-movil">Ciudad</th><th>Tipo</th><th class="ocultar-movil">Comercial</th><th class="ocultar-movil">Contactos</th></tr></thead><tbody>' +
      lista.map((e) => {
        const nc = datos.contactos.filter((x) => x.empresa_id === e.Title && x.estado !== 'INACTIVO').length;
        return '<tr data-id="' + esc(e.Title) + '" class="' + (e.estado === 'INACTIVO' ? 'inactivo' : '') + '">' +
          '<td><b>' + esc(e.razon_social) + '</b><span class="sec">' + esc(e.Title) + '</span></td>' +
          '<td>' + esc(nitTexto(e)) + '</td>' +
          '<td class="ocultar-movil">' + esc(e.ciudad) + '</td>' +
          '<td>' + tagEmpresa(e) + '</td>' +
          '<td class="ocultar-movil">' + esc(nombreUsuario(e.comercial_asignado)) + '</td>' +
          '<td class="ocultar-movil">' + nc + '</td></tr>';
      }).join('') + '</tbody></table>';
    U.$('#tabla', c).querySelectorAll('tbody tr').forEach((tr) => { tr.onclick = () => { location.hash = 'empresas/' + tr.dataset.id; }; });
  }

  // =====================================================================
  // FORMULARIO DE EMPRESA (nueva / editar)
  // =====================================================================
  function vistaForm(c, e) {
    const nueva = !e;
    e = e || { tipo_id_fiscal: 'NIT', pais: 'Colombia', estado_comercial: 'PROSPECTO', tipo_cliente: 'NUEVO', comercial_asignado: App.usuario.usuario_id, estado: 'ACTIVO' };
    const puedeCliente = App.usuario.es_admin;   // pasar a CLIENTE manualmente: solo admin (normalmente lo hace la cotización ganada)
    c.innerHTML =
      '<a class="ic-volver" href="#empresas' + (nueva ? '' : '/' + esc(e.Title)) + '">← ' + (nueva ? 'Empresas' : esc(e.razon_social)) + '</a>' +
      '<h1 class="ic-titulo">' + (nueva ? 'Nueva empresa' : 'Editar empresa') + '</h1>' +
      '<p class="ic-subtitulo">' + (nueva ? 'Los campos con <span style="color:var(--ic-err)">*</span> son obligatorios.' : esc(e.Title)) + '</p>' +
      '<form class="ic-form" id="fEmp" novalidate>' +
        '<fieldset><legend>Identificación</legend><div class="ic-campos">' +
          U.campo({ name: 'tipo_id_fiscal', label: 'Tipo de identificación', t: 'select', op: TIPOS_ID, valor: e.tipo_id_fiscal, vacio: false, req: true, c: 'c3' }) +
          U.campo({ name: 'nit', label: 'Número', valor: e.nit, req: true, c: 'c4', modo: 'numeric', ph: 'Sin puntos ni guiones', ayuda: 'Sin dígito de verificación' }) +
          U.campo({ name: 'dv', label: 'DV', valor: e.dv, readonly: true, c: 'c2', ayuda: 'Automático' }) +
          U.campo({ name: 'codigo_cliente_anterior', label: 'Código anterior', valor: e.codigo_cliente_anterior, c: 'c3', ph: 'Ej.: V1-1490', ayuda: 'Del Excel, si existía' }) +
          U.campo({ name: 'razon_social', label: 'Razón social', valor: e.razon_social, req: true, c: 'c12', ph: 'Nombre legal de la empresa' }) +
        '</div></fieldset>' +
        '<fieldset><legend>Ubicación y contacto</legend><div class="ic-campos">' +
          U.campo({ name: 'pais', label: 'País', valor: e.pais, req: true, c: 'c4' }) +
          U.campo({ name: 'ciudad', label: 'Ciudad', valor: e.ciudad, req: true, c: 'c4' }) +
          U.campo({ name: 'telefono', label: 'Teléfono', valor: e.telefono, req: true, t: 'tel', c: 'c4' }) +
          U.campo({ name: 'direccion', label: 'Dirección principal', valor: e.direccion, c: 'c8' }) +
          U.campo({ name: 'celular', label: 'Celular', valor: e.celular, t: 'tel', c: 'c4' }) +
          U.campo({ name: 'web', label: 'Sitio web', valor: e.web, c: 'c12', ph: 'www.empresa.com' }) +
        '</div></fieldset>' +
        '<fieldset><legend>Gestión comercial</legend><div class="ic-campos">' +
          U.campo({ name: 'estado_comercial', label: 'Tipo', t: 'select', vacio: false, op: puedeCliente || e.estado_comercial === 'CLIENTE' ? [['PROSPECTO', 'Prospecto'], ['CLIENTE', 'Cliente']] : [['PROSPECTO', 'Prospecto']], valor: e.estado_comercial, c: 'c4',
            ayuda: puedeCliente ? 'Al marcar Cliente se asigna su código (0001…)' : 'Pasa a Cliente al ganar una cotización' }) +
          U.campo({ name: 'tipo_cliente', label: 'Relación', t: 'select', vacio: false, op: [['NUEVO', 'Nuevo'], ['RECURRENTE', 'Recurrente']], valor: e.tipo_cliente, c: 'c4', ayuda: 'Define el saludo del PDF' }) +
          U.campo({ name: 'comercial_asignado', label: 'Comercial asignado', t: 'select', op: opcionesComerciales(), valor: e.comercial_asignado, c: 'c4' }) +
        '</div></fieldset>' +
        '<div class="ic-acciones"><a class="ic-btn sec" href="#empresas' + (nueva ? '' : '/' + esc(e.Title)) + '">Cancelar</a><button class="ic-btn" type="submit" id="btnGuardar">' + (nueva ? 'Crear empresa' : 'Guardar cambios') + '</button></div>' +
      '</form>';

    const f = U.$('#fEmp', c);
    const nit = f.querySelector('[name=nit]'), tipo = f.querySelector('[name=tipo_id_fiscal]'), dv = f.querySelector('[name=dv]');
    const actualizarDV = () => {
      if (tipo.value === 'NIT') { nit.value = nit.value.replace(/\D/g, ''); dv.value = calcularDV(nit.value); dv.closest('.ic-campo').style.visibility = 'visible'; }
      else { dv.value = ''; dv.closest('.ic-campo').style.visibility = 'hidden'; }
    };
    nit.oninput = actualizarDV; tipo.onchange = actualizarDV; actualizarDV();

    f.onsubmit = async (ev) => {
      ev.preventDefault();
      const v = U.leerForm(f);
      v.razon_social = v.razon_social.replace(/\s+/g, ' ');
      const err = {};
      ['nit', 'razon_social', 'pais', 'ciudad', 'telefono'].forEach((k) => { if (!v[k]) err[k] = 'Obligatorio'; });
      if (v.nit && v.tipo_id_fiscal === 'NIT' && !/^\d{5,12}$/.test(v.nit)) err.nit = 'El NIT debe tener entre 5 y 12 dígitos, sin DV';
      const dup = datos.empresas.find((x) => x.Title !== e.Title && String(x.nit) === v.nit && x.tipo_id_fiscal === v.tipo_id_fiscal);
      if (dup) err.nit = 'Ya existe: ' + dup.razon_social + ' (' + dup.Title + ')';
      if (!U.marcarErrores(f, err)) return;
      await U.conCarga(U.$('#btnGuardar', c), async () => {
        try {
          // Verificación en SharePoint por si otro usuario la creó hace un momento
          const enSP = await G.items('MAE_Empresas', { filtro: "fields/nit eq '" + v.nit.replace(/'/g, "''") + "'" });
          const dup2 = enSP.find((x) => x.Title !== e.Title && x.tipo_id_fiscal === v.tipo_id_fiscal);
          if (dup2) { U.marcarErrores(f, { nit: 'Ya existe: ' + dup2.razon_social + ' (' + dup2.Title + ')' }); return; }
          const campos = {
            tipo_id_fiscal: v.tipo_id_fiscal, nit: v.nit, dv: v.tipo_id_fiscal === 'NIT' ? v.dv : '', razon_social: v.razon_social,
            codigo_cliente_anterior: v.codigo_cliente_anterior, pais: v.pais, ciudad: v.ciudad, direccion: v.direccion,
            telefono: v.telefono, celular: v.celular, web: v.web, estado_comercial: v.estado_comercial, tipo_cliente: v.tipo_cliente,
            comercial_asignado: v.comercial_asignado
          };
          if (v.estado_comercial === 'CLIENTE' && !e.codigo_cliente) campos.codigo_cliente = pad(await G.siguiente('CLI'), 4);
          let id = e.Title;
          if (nueva) {
            id = 'EMP-' + pad(await G.siguiente('EMP'), 6);
            await G.crear('MAE_Empresas', Object.assign({ Title: id, estado: 'ACTIVO' }, campos));
            U.aviso('Empresa creada: ' + v.razon_social + ' (' + id + ')', 'ok');
          } else {
            await G.actualizar('MAE_Empresas', e._id, campos, e._etag);
            U.aviso('Cambios guardados', 'ok');
          }
          await cargar(true);
          location.hash = 'empresas/' + id;
        } catch (er) { console.error(er); U.aviso(U.mensajeError(er), 'err', 7000); }
      });
    };
  }

  // =====================================================================
  // FICHA DE EMPRESA (datos + sucursales + contactos)
  // =====================================================================
  function vistaFicha(c, id) {
    const e = empresaPorId(id);
    if (!e) { c.innerHTML = '<a class="ic-volver" href="#empresas">← Empresas</a><div class="ic-form">No se encontró la empresa ' + esc(id) + '.</div>'; return; }
    const sedes = datos.sucursales.filter((s) => s.empresa_id === id).sort((a, b) => String(a.codigo_sucursal).localeCompare(String(b.codigo_sucursal)));
    const contactos = datos.contactos.filter((x) => x.empresa_id === id).sort((a, b) => (a.estado === 'INACTIVO') - (b.estado === 'INACTIVO') || String(a.nombres).localeCompare(String(b.nombres), 'es'));
    const fila = (k, v) => v ? '<dt>' + k + '</dt><dd>' + v + '</dd>' : '';
    c.innerHTML =
      '<a class="ic-volver" href="#empresas">← Empresas</a>' +
      '<div class="ic-ficha-cab"><div class="principal">' + tagEmpresa(e) +
        '<h1>' + esc(e.razon_social) + '</h1>' +
        '<div class="meta"><span>' + esc(e.tipo_id_fiscal) + ' ' + esc(nitTexto(e)) + '</span><span>' + esc(e.ciudad) + (e.pais && e.pais !== 'Colombia' ? ', ' + esc(e.pais) : '') + '</span><span>' + esc(e.Title) + '</span></div></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><a class="ic-btn sec" href="#empresas/' + esc(id) + '/editar">Editar</a>' +
        (App.usuario.es_admin ? '<button class="ic-btn ' + (e.estado === 'INACTIVO' ? 'sec' : 'peligro') + '" id="btnEstado">' + (e.estado === 'INACTIVO' ? 'Reactivar' : 'Desactivar') + '</button>' : '') +
        '</div></div>' +
      '<div class="ic-ficha-grid">' +
        '<div class="ic-bloque"><div class="cab"><h2>Datos de la empresa</h2></div><div class="cuerpo"><dl class="ic-datos">' +
          fila('Teléfono', esc(e.telefono)) + fila('Celular', esc(e.celular)) + fila('Dirección', esc(e.direccion)) +
          fila('Sitio web', e.web ? '<a href="' + (/^https?:/i.test(e.web) ? '' : 'https://') + esc(e.web) + '" target="_blank" rel="noopener">' + esc(e.web) + '</a>' : '') +
          fila('Relación', e.tipo_cliente === 'RECURRENTE' ? 'Recurrente' : 'Nueva') + fila('Comercial', esc(nombreUsuario(e.comercial_asignado))) +
          fila('Código cliente', esc(e.codigo_cliente)) + fila('Código anterior', esc(e.codigo_cliente_anterior)) +
        '</dl><div class="ic-auditoria">Creada por ' + esc(e._autor || '—') + ' el ' + U.fmt.fechaHora(e._creado) + ' · Última modificación: ' + esc(e._editor || '—') + ', ' + U.fmt.fechaHora(e._modificado) + '</div></div></div>' +
        '<div style="display:flex;flex-direction:column;gap:16px">' +
          '<div class="ic-bloque"><div class="cab"><h2>Contactos (' + contactos.filter((x) => x.estado !== 'INACTIVO').length + ')</h2><button class="ic-btn chico" id="btnContacto">+ Contacto</button></div><div class="cuerpo" id="listaContactos">' +
            (contactos.length ? contactos.map((x) => '<div class="ic-item" data-id="' + esc(x.Title) + '" style="' + (x.estado === 'INACTIVO' ? 'opacity:.5' : '') + '"><div class="ic-avatar">' + esc(U.fmt.iniciales((x.nombres || '') + ' ' + (x.apellidos || ''))) + '</div><div>' +
              '<div class="titulo">' + esc((x.nombres || '') + ' ' + (x.apellidos || '')) + (x.estado === 'INACTIVO' ? ' · inactivo' : '') + '</div>' +
              '<div class="sec">' + esc([x.cargo, x.area].filter(Boolean).join(' · ')) + '</div>' +
              '<div class="sec">' + esc([x.celular, x.email].filter(Boolean).join(' · ')) + '</div>' +
              (x.sucursal_id ? '<div class="sec">Sede: ' + esc((sedes.find((s) => s.Title === x.sucursal_id) || {}).nombre || x.sucursal_id) + '</div>' : '') +
            '</div></div>').join('') : '<div class="ic-vacio" style="padding:18px">Sin contactos.</div>') +
          '</div></div>' +
          '<div class="ic-bloque"><div class="cab"><h2>Sedes (' + sedes.filter((s) => s.estado !== 'INACTIVO').length + ')</h2><button class="ic-btn chico sec" id="btnSede">+ Sede</button></div><div class="cuerpo" id="listaSedes">' +
            (sedes.length ? sedes.map((s) => '<div class="ic-item" data-id="' + esc(s.Title) + '" style="' + (s.estado === 'INACTIVO' ? 'opacity:.5' : '') + '"><div>' +
              '<div class="titulo">' + esc(s.nombre) + (s.estado === 'INACTIVO' ? ' · inactiva' : '') + '</div>' +
              '<div class="sec">' + esc(s.codigo_sucursal) + ' · ' + esc(s.ciudad) + '</div>' +
              '<div class="sec">' + esc([s.direccion, s.telefonos].filter(Boolean).join(' · ')) + '</div>' +
            '</div></div>').join('') : '<div class="ic-vacio" style="padding:18px">La sede principal es la dirección de la empresa. Agregue sedes adicionales si las tiene.</div>') +
          '</div></div>' +
        '</div>' +
      '</div>';

    U.$('#btnContacto', c).onclick = () => formContacto(e, null, sedes);
    U.$('#btnSede', c).onclick = () => formSede(e, null);
    U.$('#listaContactos', c).querySelectorAll('.ic-item').forEach((it) => { it.onclick = () => formContacto(e, contactos.find((x) => x.Title === it.dataset.id), sedes); });
    U.$('#listaSedes', c).querySelectorAll('.ic-item').forEach((it) => { it.onclick = () => formSede(e, sedes.find((x) => x.Title === it.dataset.id)); });
    const be = U.$('#btnEstado', c);
    if (be) be.onclick = async () => {
      const activar = e.estado === 'INACTIVO';
      const ok = await U.confirmar(activar ? 'Reactivar empresa' : 'Desactivar empresa',
        activar ? '¿Reactivar ' + e.razon_social + '?' : e.razon_social + ' dejará de aparecer en las búsquedas y al cotizar. Su información se conserva y se puede reactivar.', activar ? 'Reactivar' : 'Desactivar', !activar);
      if (!ok) return;
      try { await G.actualizar('MAE_Empresas', e._id, { estado: activar ? 'ACTIVO' : 'INACTIVO' }, e._etag); await cargar(true); U.aviso(activar ? 'Empresa reactivada' : 'Empresa desactivada', 'ok'); vistaFicha(c, id); }
      catch (er) { U.aviso(U.mensajeError(er), 'err', 7000); }
    };
  }

  async function refrescarFicha(id) {
    await cargar(true);
    vistaFicha(document.getElementById('contenido'), id);
  }

  // ---------- Contacto ----------
  function formContacto(emp, x, sedes) {
    const nuevo = !x;
    x = x || { estado: 'ACTIVO', autoriza_datos: false };
    const html = '<form class="ic-form" id="fCon" novalidate><div class="ic-campos">' +
      U.campo({ name: 'nombres', label: 'Nombres', valor: x.nombres, req: true }) +
      U.campo({ name: 'apellidos', label: 'Apellidos', valor: x.apellidos, req: true }) +
      U.campo({ name: 'cargo', label: 'Cargo', valor: x.cargo }) +
      U.campo({ name: 'area', label: 'Área', valor: x.area }) +
      U.campo({ name: 'celular', label: 'Celular', valor: x.celular, t: 'tel', c: 'c4' }) +
      U.campo({ name: 'telefono', label: 'Teléfono fijo', valor: x.telefono, t: 'tel', c: 'c4' }) +
      U.campo({ name: 'extension', label: 'Extensión', valor: x.extension, c: 'c4' }) +
      U.campo({ name: 'email', label: 'Correo electrónico', valor: x.email, t: 'email', c: 'c8' }) +
      U.campo({ name: 'sucursal_id', label: 'Sede', t: 'select', vacio: 'Sede principal', op: sedes.filter((s) => s.estado !== 'INACTIVO' || s.Title === x.sucursal_id).map((s) => [s.Title, s.nombre]), valor: x.sucursal_id, c: 'c4' }) +
      U.campo({ name: 'autoriza_datos', label: 'El contacto autorizó el tratamiento de sus datos personales (Ley 1581 de 2012)', t: 'checkbox', valor: x.autoriza_datos }) +
      U.campo({ name: 'cumpleanos', label: 'Cumpleaños', valor: soloFecha(x.cumpleanos), t: 'date', c: 'c4', ayuda: 'Opcional; solo con autorización' }) +
      '</div><div class="ic-acciones">' +
      (!nuevo ? '<button type="button" class="ic-btn peligro" id="btnEstadoCon" style="margin-right:auto">' + (x.estado === 'INACTIVO' ? 'Reactivar' : 'Desactivar') + '</button>' : '') +
      '<button type="button" class="ic-btn sec" id="btnCancelar">Cancelar</button><button class="ic-btn" type="submit" id="btnGuardarCon">' + (nuevo ? 'Agregar contacto' : 'Guardar') + '</button></div></form>';
    U.modal((nuevo ? 'Nuevo contacto · ' : 'Contacto · ') + emp.razon_social, html, (m) => {
      const f = U.$('#fCon', m);
      U.$('#btnCancelar', m).onclick = U.cerrarModal;
      f.onsubmit = async (ev) => {
        ev.preventDefault();
        const v = U.leerForm(f);
        const err = {};
        if (!v.nombres) err.nombres = 'Obligatorio';
        if (!v.apellidos) err.apellidos = 'Obligatorio';
        if (!v.celular && !v.email && !v.telefono) err.celular = 'Registre al menos un celular, teléfono o correo';
        if (v.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) err.email = 'Correo no válido';
        if (v.cumpleanos && !v.autoriza_datos) err.cumpleanos = 'Requiere la autorización de datos';
        const dup = v.email && datos.contactos.find((o) => o.Title !== x.Title && U.norm(o.email) === U.norm(v.email));
        if (dup) err.email = 'Este correo ya está registrado en ' + ((empresaPorId(dup.empresa_id) || {}).razon_social || dup.empresa_id);
        if (!U.marcarErrores(f, err)) return;
        await U.conCarga(U.$('#btnGuardarCon', m), async () => {
          try {
            const campos = { nombres: v.nombres, apellidos: v.apellidos, cargo: v.cargo, area: v.area, celular: v.celular, telefono: v.telefono,
              extension: v.extension, email: v.email.toLowerCase(), sucursal_id: v.sucursal_id, autoriza_datos: v.autoriza_datos, cumpleanos: v.cumpleanos };
            if (nuevo) {
              const id = 'CON-' + pad(await G.siguiente('CON'), 6);
              await G.crear('MAE_Contactos', Object.assign({ Title: id, empresa_id: emp.Title, estado: 'ACTIVO' }, campos));
            } else await G.actualizar('MAE_Contactos', x._id, campos, x._etag);
            U.cerrarModal(); U.aviso(nuevo ? 'Contacto agregado' : 'Contacto actualizado', 'ok');
            await refrescarFicha(emp.Title);
          } catch (er) { console.error(er); U.aviso(U.mensajeError(er), 'err', 7000); }
        });
      };
      const be = U.$('#btnEstadoCon', m);
      if (be) be.onclick = async () => {
        try { await G.actualizar('MAE_Contactos', x._id, { estado: x.estado === 'INACTIVO' ? 'ACTIVO' : 'INACTIVO' }, x._etag); U.cerrarModal(); U.aviso('Contacto ' + (x.estado === 'INACTIVO' ? 'reactivado' : 'desactivado'), 'ok'); await refrescarFicha(emp.Title); }
        catch (er) { U.aviso(U.mensajeError(er), 'err', 7000); }
      };
    });
  }

  // ---------- Sede (sucursal) ----------
  function formSede(emp, s) {
    const nueva = !s;
    s = s || { estado: 'ACTIVO', ciudad: emp.ciudad };
    const html = '<form class="ic-form" id="fSede" novalidate><div class="ic-campos">' +
      (nueva ? '' : U.campo({ name: 'codigo_sucursal', label: 'Código', valor: s.codigo_sucursal, readonly: true, c: 'c4' })) +
      U.campo({ name: 'nombre', label: 'Nombre de la sede', valor: s.nombre, req: true, c: nueva ? 'c12' : 'c8', ph: 'Ej.: Planta Los Mangos' }) +
      U.campo({ name: 'ciudad', label: 'Ciudad o municipio', valor: s.ciudad, req: true }) +
      U.campo({ name: 'telefonos', label: 'Teléfonos', valor: s.telefonos }) +
      U.campo({ name: 'direccion', label: 'Dirección', valor: s.direccion, c: 'c12' }) +
      '</div>' + (nueva ? '<p class="ayuda" style="font-size:12px;color:var(--ic-gris)">El código se asigna automáticamente: ' + esc(emp.nit) + '-001, -002…</p>' : '') +
      '<div class="ic-acciones">' +
      (!nueva ? '<button type="button" class="ic-btn peligro" id="btnEstadoSede" style="margin-right:auto">' + (s.estado === 'INACTIVO' ? 'Reactivar' : 'Desactivar') + '</button>' : '') +
      '<button type="button" class="ic-btn sec" id="btnCancelar">Cancelar</button><button class="ic-btn" type="submit" id="btnGuardarSede">' + (nueva ? 'Agregar sede' : 'Guardar') + '</button></div></form>';
    U.modal((nueva ? 'Nueva sede · ' : 'Sede · ') + emp.razon_social, html, (m) => {
      const f = U.$('#fSede', m);
      U.$('#btnCancelar', m).onclick = U.cerrarModal;
      f.onsubmit = async (ev) => {
        ev.preventDefault();
        const v = U.leerForm(f);
        const err = {};
        if (!v.nombre) err.nombre = 'Obligatorio';
        if (!v.ciudad) err.ciudad = 'Obligatorio';
        if (!U.marcarErrores(f, err)) return;
        await U.conCarga(U.$('#btnGuardarSede', m), async () => {
          try {
            const campos = { nombre: v.nombre, ciudad: v.ciudad, telefonos: v.telefonos, direccion: v.direccion };
            if (nueva) {
              // Código NIT-NNN: mayor existente de la empresa + 1 (nunca se reutiliza), leído fresco de SharePoint
              const actuales = await G.items('MAE_Sucursales', { filtro: "fields/empresa_id eq '" + emp.Title + "'" });
              const max = actuales.reduce((mx, o) => { const r = String(o.codigo_sucursal || '').match(/-(\d{3})$/); return r ? Math.max(mx, Number(r[1])) : mx; }, 0);
              const id = 'SUC-' + pad(await G.siguiente('SUC'), 6);
              await G.crear('MAE_Sucursales', Object.assign({ Title: id, empresa_id: emp.Title, codigo_sucursal: emp.nit + '-' + pad(max + 1, 3), estado: 'ACTIVO' }, campos));
            } else await G.actualizar('MAE_Sucursales', s._id, campos, s._etag);
            U.cerrarModal(); U.aviso(nueva ? 'Sede agregada' : 'Sede actualizada', 'ok');
            await refrescarFicha(emp.Title);
          } catch (er) { console.error(er); U.aviso(U.mensajeError(er), 'err', 7000); }
        });
      };
      const be = U.$('#btnEstadoSede', m);
      if (be) be.onclick = async () => {
        try { await G.actualizar('MAE_Sucursales', s._id, { estado: s.estado === 'INACTIVO' ? 'ACTIVO' : 'INACTIVO' }, s._etag); U.cerrarModal(); U.aviso('Sede ' + (s.estado === 'INACTIVO' ? 'reactivada' : 'desactivada'), 'ok'); await refrescarFicha(emp.Title); }
        catch (er) { U.aviso(U.mensajeError(er), 'err', 7000); }
      };
    });
  }

  // Expuesto para pruebas y para otros módulos (cotizaciones)
  App.empresas = { calcularDV, cargar, datos };
})();
