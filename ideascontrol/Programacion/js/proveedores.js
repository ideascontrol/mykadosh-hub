/* =====================================================================
   APP-106 · Programación — Proveedores (Vendors) de IC fuera de Bogotá
   Instaladores y aliados locales: datos, sedes y contactos. Misma estructura
   que Empresas y contactos de la app Comercial, pero en listas separadas.
   Rutas: #vendors · #vendors/nuevo · #vendors/PRV-000001 · #vendors/PRV-000001/editar
   Listas: OPE_Proveedores · OPE_ProveedorSedes · OPE_ProveedorContactos
   Ver: Director, Programador y Consulta · Editar: Director y Programador · Desactivar: Director
   ===================================================================== */
(function () {
  const U = IC.ui, G = IC.graph, esc = U.esc;
  const datos = { proveedores: [], sedes: [], contactos: [], cargado: 0 };
  const filtro = { texto: '', servicio: '', depto: '', estado: 'ACTIVO' };

  const TIPOS_ID = [['NIT', 'NIT (empresa)'], ['CC', 'Cédula (persona natural)'], ['RUC', 'RUC'], ['TAX ID', 'Tax ID'], ['OTRO', 'Otro']];
  const SERVICIOS = [['INS', 'Instalación'], ['MTO', 'Mantenimiento'], ['SPR', 'Soporte presencial'], ['CAB', 'Cableado y obra civil'],
    ['SUM', 'Suministro de equipos y materiales'], ['OTR', 'Otro']];
  const ICO_BUSCAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';

  // ---------- Utilidades ----------
  const pad = (n, w) => String(n).padStart(w, '0');
  const servicios = (p) => String((p && p.servicios) || '').split(/[;,\s]+/).filter(Boolean);
  const nombreServicio = (cod) => (SERVICIOS.find((s) => s[0] === cod) || [cod, cod])[1];
  const idTexto = (p) => p.nit ? (p.tipo_id_fiscal === 'NIT' && p.dv !== undefined && p.dv !== '' && p.dv !== null ? p.nit + '-' + p.dv : p.nit) : '';
  const lugar = (o) => [o.ciudad, o.departamento].filter(Boolean).join(', ') + (o.pais && o.pais !== 'Colombia' ? ' · ' + o.pais : '');
  const tagEstado = (p) => p.estado === 'INACTIVO' ? '<span class="ic-tag inactivo">Inactivo</span>' : '<span class="ic-tag cliente">Proveedor</span>';
  const chipsServicios = (p) => servicios(p).map((s) => '<span class="ic-tag prospecto" style="margin:0 4px 4px 0">' + esc(nombreServicio(s)) + '</span>').join('');
  const mayus = (el) => el.addEventListener('input', function () {   // Regla IC: nombres de empresa en MAYÚSCULAS
    const a = el.selectionStart, b = el.selectionEnd, v = el.value.toLocaleUpperCase('es-CO');
    if (v !== el.value) { el.value = v; try { el.setSelectionRange(a, b); } catch (e) { /* sin cursor */ } }
  });

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
    const [p, s, c] = await Promise.all([G.items('OPE_Proveedores', { top: 5000 }), G.items('OPE_ProveedorSedes', { top: 5000 }), G.items('OPE_ProveedorContactos', { top: 5000 })]);
    datos.proveedores = p.sort((a, b) => String(a.razon_social || '').localeCompare(String(b.razon_social || ''), 'es'));
    datos.sedes = s; datos.contactos = c; datos.cargado = Date.now();
  }
  const porId = (id) => datos.proveedores.find((p) => p.Title === id);
  const auditar = (registro, accion, despues) => G.siguiente('EVT').then((n) => G.crear('SYS_Auditoria', {
    Title: 'EVT-' + pad(n, 6), fecha_hora: new Date().toISOString(), usuario_id: App.usuario.email, app_id: CFG.app.id,
    entidad: 'PROVEEDOR', registro_id: registro, accion, despues: JSON.stringify(despues || {}) })).catch(() => { /* la auditoría no detiene el trabajo */ });

  // ---------- Enrutador interno ----------
  App.vistas['vendors'] = async function (c) {
    const partes = (location.hash || '').replace(/^#/, '').split('/');
    c.innerHTML = '<div class="ic-centro" style="min-height:40vh"><div><div class="ic-spinner"></div></div></div>';
    try {
      await cargar();
      if (partes[1] === 'nuevo') return App.puedeEditar() ? vistaForm(c, null) : (location.hash = 'vendors');
      if (partes[1] && partes[2] === 'editar') return App.puedeEditar() ? vistaForm(c, porId(partes[1])) : (location.hash = 'vendors/' + partes[1]);
      if (partes[1]) return vistaFicha(c, partes[1]);
      return vistaLista(c);
    } catch (e) {
      console.error(e);
      const falta = /No existe la lista OPE_Proveedor/.test(e.message);
      c.innerHTML = '<a class="ic-volver" href="#">← Menú principal</a><div class="ic-form"><b>' + (falta ? 'Falta crear las listas de Proveedores' : 'No se pudo cargar la información.') + '</b><p>' +
        (falta ? 'Abra el instalador (<a href="Instalador/">Programacion/Instalador/</a>), inicie sesión y haga clic en «Crear estructura». Se crean OPE_Proveedores, OPE_ProveedorSedes y OPE_ProveedorContactos sin tocar lo demás.' : esc(U.mensajeError(e))) +
        '</p><button class="ic-btn" onclick="location.reload()">Reintentar</button></div>';
    }
  };

  // =====================================================================
  // LISTA
  // =====================================================================
  function vistaLista(c) {
    const deptos = Array.from(new Set(datos.proveedores.map((p) => p.departamento).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es'));
    c.innerHTML =
      '<a class="ic-volver" href="#">← Menú principal</a>' +
      '<div class="ic-barra"><div><h1 class="ic-titulo">Proveedores (Vendors)</h1><p class="ic-subtitulo" style="margin:0">Instaladores y aliados de Ideas Control fuera de Bogotá: datos, sedes y contactos</p></div>' +
      '<div class="espacio"></div>' + (App.puedeEditar() ? '<a class="ic-btn" href="#vendors/nuevo">+ Nuevo proveedor</a>' : '') + '</div>' +
      '<div class="ic-filtros">' +
        '<div class="ic-buscar">' + ICO_BUSCAR + '<input id="fTexto" type="search" placeholder="Buscar por nombre, NIT, ciudad, cobertura, contacto o teléfono" value="' + esc(filtro.texto) + '"></div>' +
        '<select id="fServicio"><option value="">Todos los servicios</option>' + SERVICIOS.map((s) => '<option value="' + s[0] + '">' + esc(s[1]) + '</option>').join('') + '</select>' +
        '<select id="fDepto"><option value="">Todos los departamentos</option>' + deptos.map((d) => '<option value="' + esc(d) + '">' + esc(d) + '</option>').join('') + '</select>' +
        '<select id="fEstado"><option value="ACTIVO">Activos</option><option value="INACTIVO">Inactivos</option><option value="">Activos e inactivos</option></select>' +
      '</div>' +
      '<p class="ic-conteo" id="conteo"></p><div class="ic-tabla-caja" id="tabla"></div>';
    U.$('#fServicio', c).value = filtro.servicio;
    U.$('#fDepto', c).value = deptos.indexOf(filtro.depto) >= 0 ? filtro.depto : (filtro.depto = '');
    U.$('#fEstado', c).value = filtro.estado;
    U.$('#fTexto', c).oninput = (e) => { filtro.texto = e.target.value; pintarTabla(c); };
    U.$('#fServicio', c).onchange = (e) => { filtro.servicio = e.target.value; pintarTabla(c); };
    U.$('#fDepto', c).onchange = (e) => { filtro.depto = e.target.value; pintarTabla(c); };
    U.$('#fEstado', c).onchange = (e) => { filtro.estado = e.target.value; pintarTabla(c); };
    pintarTabla(c);
    U.$('#fTexto', c).focus();
  }

  function pintarTabla(c) {
    const t = U.norm(filtro.texto);
    const lista = datos.proveedores.filter((p) => {
      if (filtro.estado && p.estado !== filtro.estado) return false;
      if (filtro.servicio && servicios(p).indexOf(filtro.servicio) < 0) return false;
      if (filtro.depto && p.departamento !== filtro.depto) return false;
      if (!t) return true;
      const contactos = datos.contactos.filter((x) => x.proveedor_id === p.Title).map((x) => [x.nombres, x.apellidos, x.email, x.celular].join(' ')).join(' ');
      const sedes = datos.sedes.filter((s) => s.proveedor_id === p.Title).map((s) => [s.nombre, s.ciudad, s.departamento].join(' ')).join(' ');
      return U.norm([p.razon_social, p.nit, p.ciudad, p.departamento, p.cobertura, p.telefono, p.celular, p.email, p.Title, contactos, sedes].join(' ')).includes(t);
    });
    U.$('#conteo', c).textContent = lista.length + (lista.length === 1 ? ' proveedor' : ' proveedores');
    if (!lista.length) {
      U.$('#tabla', c).innerHTML = '<div class="ic-vacio">' + (datos.proveedores.length ? 'No hay proveedores que coincidan con la búsqueda.' :
        'Aún no hay proveedores registrados.' + (App.puedeEditar() ? ' Cree el primero con <b>+ Nuevo proveedor</b>.' : '')) + '</div>';
      return;
    }
    U.$('#tabla', c).innerHTML = '<table class="ic-tabla"><thead><tr><th>Proveedor</th><th>NIT / Documento</th><th>Ciudad base</th><th class="ocultar-movil">Servicios</th><th class="ocultar-movil">Cobertura</th><th class="ocultar-movil">Contactos</th></tr></thead><tbody>' +
      lista.map((p) => {
        const nc = datos.contactos.filter((x) => x.proveedor_id === p.Title && x.estado !== 'INACTIVO').length;
        return '<tr data-id="' + esc(p.Title) + '" class="' + (p.estado === 'INACTIVO' ? 'inactivo' : '') + '">' +
          '<td><b>' + esc(p.razon_social) + '</b><span class="sec">' + esc(p.Title) + '</span></td>' +
          '<td>' + esc(idTexto(p)) + '</td>' +
          '<td>' + esc(lugar(p)) + '</td>' +
          '<td class="ocultar-movil">' + chipsServicios(p) + '</td>' +
          '<td class="ocultar-movil" style="max-width:260px">' + esc(String(p.cobertura || '').replace(/\s*\n\s*/g, ' · ')) + '</td>' +
          '<td class="ocultar-movil">' + nc + '</td></tr>';
      }).join('') + '</tbody></table>';
    U.$('#tabla', c).querySelectorAll('tbody tr').forEach((tr) => { tr.onclick = () => { location.hash = 'vendors/' + tr.dataset.id; }; });
  }

  // =====================================================================
  // FORMULARIO DE PROVEEDOR (nuevo / editar)
  // =====================================================================
  function vistaForm(c, p) {
    const nuevo = !p;
    p = p || { tipo_id_fiscal: 'NIT', pais: 'Colombia', estado: 'ACTIVO', servicios: 'INS;MTO' };
    const volver = '#vendors' + (nuevo ? '' : '/' + esc(p.Title));
    const marcados = servicios(p);
    c.innerHTML =
      '<a class="ic-volver" href="' + volver + '">← ' + (nuevo ? 'Proveedores' : esc(p.razon_social)) + '</a>' +
      '<h1 class="ic-titulo">' + (nuevo ? 'Nuevo proveedor' : 'Editar proveedor') + '</h1>' +
      '<p class="ic-subtitulo">' + (nuevo ? 'Los campos con <span style="color:var(--ic-err)">*</span> son obligatorios.' : esc(p.Title)) + '</p>' +
      '<form class="ic-form" id="fPrv" novalidate>' +
        '<fieldset><legend>Identificación</legend><div class="ic-campos">' +
          U.campo({ name: 'tipo_id_fiscal', label: 'Tipo de identificación', t: 'select', op: TIPOS_ID, valor: p.tipo_id_fiscal, vacio: false, req: true, c: 'c4' }) +
          U.campo({ name: 'nit', label: 'Número', valor: p.nit, req: true, c: 'c4', modo: 'numeric', ph: 'Sin puntos ni guiones', ayuda: 'Sin dígito de verificación' }) +
          U.campo({ name: 'dv', label: 'DV', valor: p.dv, readonly: true, c: 'c2', ayuda: 'Automático' }) +
          U.campo({ name: 'razon_social', label: 'Razón social o nombre', valor: p.razon_social, req: true, c: 'c12', ph: 'Nombre legal de la empresa o de la persona' }) +
        '</div></fieldset>' +
        '<fieldset><legend>Ubicación y contacto</legend><div class="ic-campos">' +
          U.campo({ name: 'pais', label: 'País', valor: p.pais, req: true, c: 'c4' }) +
          U.campo({ name: 'departamento', label: 'Departamento', valor: p.departamento, req: true, c: 'c4', ph: 'Ej.: Antioquia' }) +
          U.campo({ name: 'ciudad', label: 'Ciudad base', valor: p.ciudad, req: true, c: 'c4', ph: 'Ej.: Medellín' }) +
          U.campo({ name: 'direccion', label: 'Dirección principal', valor: p.direccion, c: 'c8' }) +
          U.campo({ name: 'telefono', label: 'Teléfono', valor: p.telefono, t: 'tel', c: 'c4' }) +
          U.campo({ name: 'celular', label: 'Celular / WhatsApp', valor: p.celular, req: true, t: 'tel', c: 'c4' }) +
          U.campo({ name: 'email', label: 'Correo', valor: p.email, t: 'email', c: 'c4' }) +
          U.campo({ name: 'web', label: 'Sitio web', valor: p.web, c: 'c4', ph: 'www.empresa.com' }) +
        '</div></fieldset>' +
        '<fieldset><legend>Servicios y cobertura</legend><div class="ic-campos">' +
          '<div class="ic-campo c12"><label>Servicios que presta <span class="req">*</span></label><div class="ope-habs" id="srv">' +
            SERVICIOS.map((s) => '<label class="ic-check"><input type="checkbox" data-srv="' + s[0] + '"' + (marcados.indexOf(s[0]) >= 0 ? ' checked' : '') + '> <span>' + esc(s[1]) + '</span></label>').join('') +
          '</div></div>' +
          U.campo({ name: 'cobertura', label: 'Cobertura (ciudades o zonas que atiende)', t: 'textarea', valor: p.cobertura, c: 'c12', filas: 2, ph: 'Ej.: Medellín, Valle de Aburrá, Rionegro, Oriente antioqueño' }) +
          U.campo({ name: 'condiciones_pago', label: 'Condiciones de pago', valor: p.condiciones_pago, c: 'c6', ph: 'Ej.: 50 % anticipo, 50 % contra acta' }) +
          U.campo({ name: 'tiempo_respuesta', label: 'Tiempo de respuesta', valor: p.tiempo_respuesta, c: 'c6', ph: 'Ej.: 48 horas hábiles' }) +
          U.campo({ name: 'observaciones', label: 'Observaciones', t: 'textarea', valor: p.observaciones, c: 'c12', filas: 3 }) +
        '</div></fieldset>' +
        '<div class="ic-acciones"><a class="ic-btn sec" href="' + volver + '">Cancelar</a><button class="ic-btn" type="submit" id="btnGuardar">' + (nuevo ? 'Crear proveedor' : 'Guardar cambios') + '</button></div>' +
      '</form>';

    const f = U.$('#fPrv', c);
    const nit = f.querySelector('[name=nit]'), tipo = f.querySelector('[name=tipo_id_fiscal]'), dv = f.querySelector('[name=dv]');
    const actualizarDV = () => {
      if (tipo.value === 'NIT' || tipo.value === 'CC') nit.value = nit.value.replace(/\D/g, '');
      if (tipo.value === 'NIT') { dv.value = calcularDV(nit.value); dv.closest('.ic-campo').style.visibility = 'visible'; }
      else { dv.value = ''; dv.closest('.ic-campo').style.visibility = 'hidden'; }
    };
    nit.oninput = actualizarDV; tipo.onchange = actualizarDV; actualizarDV();
    mayus(f.querySelector('[name=razon_social]'));

    f.onsubmit = async (ev) => {
      ev.preventDefault();
      const v = U.leerForm(f);
      Object.keys(v).forEach((k) => { if (k === 'undefined' || !/^[a-z_]+$/.test(k)) delete v[k]; });
      v.razon_social = v.razon_social.replace(/\s+/g, ' ').toLocaleUpperCase('es-CO');
      v.servicios = Array.from(f.querySelectorAll('[data-srv]')).filter((x) => x.checked).map((x) => x.dataset.srv).join(';');
      const err = {};
      ['nit', 'razon_social', 'pais', 'departamento', 'ciudad', 'celular'].forEach((k) => { if (!v[k]) err[k] = 'Obligatorio'; });
      if (v.nit && v.tipo_id_fiscal === 'NIT' && !/^\d{5,12}$/.test(v.nit)) err.nit = 'El NIT debe tener entre 5 y 12 dígitos, sin DV';
      if (v.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) err.email = 'Correo no válido';
      const dup = datos.proveedores.find((x) => x.Title !== p.Title && String(x.nit) === v.nit && x.tipo_id_fiscal === v.tipo_id_fiscal);
      if (dup) err.nit = 'Ya existe: ' + dup.razon_social + ' (' + dup.Title + ')';
      if (!v.servicios) { U.aviso('Marque al menos un servicio que presta el proveedor', 'warn'); if (!Object.keys(err).length) return; }
      if (!U.marcarErrores(f, err)) return;
      await U.conCarga(U.$('#btnGuardar', c), async () => {
        try {
          // Verificación en SharePoint por si otro usuario lo creó hace un momento
          const enSP = await G.items('OPE_Proveedores', { filtro: "fields/nit eq '" + v.nit.replace(/'/g, "''") + "'" });
          const dup2 = enSP.find((x) => x.Title !== p.Title && x.tipo_id_fiscal === v.tipo_id_fiscal);
          if (dup2) { U.marcarErrores(f, { nit: 'Ya existe: ' + dup2.razon_social + ' (' + dup2.Title + ')' }); return; }
          const campos = {
            tipo_id_fiscal: v.tipo_id_fiscal, nit: v.nit, dv: v.tipo_id_fiscal === 'NIT' ? v.dv : '', razon_social: v.razon_social,
            pais: v.pais, departamento: v.departamento, ciudad: v.ciudad, direccion: v.direccion, telefono: v.telefono, celular: v.celular,
            email: v.email.toLowerCase(), web: v.web, servicios: v.servicios, cobertura: v.cobertura, condiciones_pago: v.condiciones_pago,
            tiempo_respuesta: v.tiempo_respuesta, observaciones: v.observaciones
          };
          let id = p.Title;
          if (nuevo) {
            id = 'PRV-' + pad(await G.siguiente('PRV'), 6);
            await G.crear('OPE_Proveedores', Object.assign({ Title: id, estado: 'ACTIVO' }, campos));
            auditar(id, 'CREAR', campos);
            U.aviso('Proveedor creado: ' + v.razon_social + ' (' + id + ')', 'ok');
          } else {
            await G.actualizar('OPE_Proveedores', p._id, campos, p._etag);
            auditar(id, 'ACTUALIZAR', campos);
            U.aviso('Cambios guardados', 'ok');
          }
          await cargar(true);
          location.hash = 'vendors/' + id;
        } catch (er) { console.error(er); U.aviso(U.mensajeError(er), 'err', 7000); }
      });
    };
  }

  // =====================================================================
  // FICHA DEL PROVEEDOR (datos + contactos + sedes)
  // =====================================================================
  function vistaFicha(c, id) {
    const p = porId(id);
    if (!p) { c.innerHTML = '<a class="ic-volver" href="#vendors">← Proveedores</a><div class="ic-form">No se encontró el proveedor ' + esc(id) + '.</div>'; return; }
    const ed = App.puedeEditar();
    const sedes = datos.sedes.filter((s) => s.proveedor_id === id).sort((a, b) => String(a.codigo_sede).localeCompare(String(b.codigo_sede)));
    const contactos = datos.contactos.filter((x) => x.proveedor_id === id).sort((a, b) => (a.estado === 'INACTIVO') - (b.estado === 'INACTIVO') || String(a.nombres).localeCompare(String(b.nombres), 'es'));
    const fila = (k, v) => v ? '<dt>' + k + '</dt><dd>' + v + '</dd>' : '';
    const enlace = (tel) => tel ? '<a href="https://wa.me/' + String(tel).replace(/\D/g, '').replace(/^(3\d{9})$/, '57$1') + '" target="_blank" rel="noopener">' + esc(tel) + '</a>' : '';
    c.innerHTML =
      '<a class="ic-volver" href="#vendors">← Proveedores</a>' +
      '<div class="ic-ficha-cab"><div class="principal">' + tagEstado(p) +
        '<h1>' + esc(p.razon_social) + '</h1>' +
        '<div class="meta"><span>' + esc(p.tipo_id_fiscal) + ' ' + esc(idTexto(p)) + '</span><span>' + esc(lugar(p)) + '</span><span>' + esc(p.Title) + '</span></div></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' + (ed ? '<a class="ic-btn sec" href="#vendors/' + esc(id) + '/editar">Editar</a>' : '') +
        (App.esAdmin() ? '<button class="ic-btn ' + (p.estado === 'INACTIVO' ? 'sec' : 'peligro') + '" id="btnEstado">' + (p.estado === 'INACTIVO' ? 'Reactivar' : 'Desactivar') + '</button>' : '') +
        '</div></div>' +
      '<div class="ic-ficha-grid">' +
        '<div class="ic-bloque"><div class="cab"><h2>Datos del proveedor</h2></div><div class="cuerpo"><dl class="ic-datos">' +
          fila('Servicios', chipsServicios(p)) + fila('Cobertura', esc(p.cobertura).replace(/\n/g, '<br>')) +
          fila('Celular / WhatsApp', enlace(p.celular)) + fila('Teléfono', esc(p.telefono)) +
          fila('Correo', p.email ? '<a href="mailto:' + esc(p.email) + '">' + esc(p.email) + '</a>' : '') + fila('Dirección', esc(p.direccion)) +
          fila('Sitio web', p.web ? '<a href="' + (/^https?:/i.test(p.web) ? '' : 'https://') + esc(p.web) + '" target="_blank" rel="noopener">' + esc(p.web) + '</a>' : '') +
          fila('Condiciones de pago', esc(p.condiciones_pago)) + fila('Tiempo de respuesta', esc(p.tiempo_respuesta)) +
          fila('Observaciones', esc(p.observaciones).replace(/\n/g, '<br>')) +
        '</dl><div class="ic-auditoria">Creado por ' + esc(p._autor || '—') + ' el ' + U.fmt.fechaHora(p._creado) + ' · Última modificación: ' + esc(p._editor || '—') + ', ' + U.fmt.fechaHora(p._modificado) + '</div></div></div>' +
        '<div style="display:flex;flex-direction:column;gap:16px">' +
          '<div class="ic-bloque"><div class="cab"><h2>Contactos (' + contactos.filter((x) => x.estado !== 'INACTIVO').length + ')</h2>' + (ed ? '<button class="ic-btn chico" id="btnContacto">+ Contacto</button>' : '') + '</div><div class="cuerpo" id="listaContactos">' +
            (contactos.length ? contactos.map((x) => '<div class="ic-item" data-id="' + esc(x.Title) + '" style="' + (x.estado === 'INACTIVO' ? 'opacity:.5;' : '') + (ed ? '' : 'cursor:default') + '"><div class="ic-avatar">' + esc(U.fmt.iniciales((x.nombres || '') + ' ' + (x.apellidos || ''))) + '</div><div>' +
              '<div class="titulo">' + esc((x.nombres || '') + ' ' + (x.apellidos || '')) + (x.estado === 'INACTIVO' ? ' · inactivo' : '') + '</div>' +
              '<div class="sec">' + esc([x.cargo, x.area].filter(Boolean).join(' · ')) + '</div>' +
              '<div class="sec">' + esc([x.celular, x.telefono, x.email].filter(Boolean).join(' · ')) + '</div>' +
              (x.sede_id ? '<div class="sec">Sede: ' + esc((sedes.find((s) => s.Title === x.sede_id) || {}).nombre || x.sede_id) + '</div>' : '') +
            '</div></div>').join('') : '<div class="ic-vacio" style="padding:18px">Sin contactos.</div>') +
          '</div></div>' +
          '<div class="ic-bloque"><div class="cab"><h2>Sedes (' + sedes.filter((s) => s.estado !== 'INACTIVO').length + ')</h2>' + (ed ? '<button class="ic-btn chico sec" id="btnSede">+ Sede</button>' : '') + '</div><div class="cuerpo" id="listaSedes">' +
            (sedes.length ? sedes.map((s) => '<div class="ic-item" data-id="' + esc(s.Title) + '" style="' + (s.estado === 'INACTIVO' ? 'opacity:.5;' : '') + (ed ? '' : 'cursor:default') + '"><div>' +
              '<div class="titulo">' + esc(s.nombre) + (s.estado === 'INACTIVO' ? ' · inactiva' : '') + '</div>' +
              '<div class="sec">' + esc(s.codigo_sede) + ' · ' + esc(lugar(s)) + '</div>' +
              '<div class="sec">' + esc([s.direccion, s.telefonos].filter(Boolean).join(' · ')) + '</div>' +
            '</div></div>').join('') : '<div class="ic-vacio" style="padding:18px">La sede principal es la ciudad base del proveedor. Agregue sedes si opera desde otras ciudades.</div>') +
          '</div></div>' +
        '</div>' +
      '</div>';

    if (ed) {
      U.$('#btnContacto', c).onclick = () => formContacto(p, null, sedes);
      U.$('#btnSede', c).onclick = () => formSede(p, null);
      U.$('#listaContactos', c).querySelectorAll('.ic-item').forEach((it) => { it.onclick = () => formContacto(p, contactos.find((x) => x.Title === it.dataset.id), sedes); });
      U.$('#listaSedes', c).querySelectorAll('.ic-item').forEach((it) => { it.onclick = () => formSede(p, sedes.find((x) => x.Title === it.dataset.id)); });
    }
    const be = U.$('#btnEstado', c);
    if (be) be.onclick = async () => {
      const activar = p.estado === 'INACTIVO';
      const ok = await U.confirmar(activar ? 'Reactivar proveedor' : 'Desactivar proveedor',
        activar ? '¿Reactivar ' + p.razon_social + '?' : p.razon_social + ' dejará de aparecer en la lista de proveedores activos. Su información se conserva y se puede reactivar.', activar ? 'Reactivar' : 'Desactivar', !activar);
      if (!ok) return;
      try {
        await G.actualizar('OPE_Proveedores', p._id, { estado: activar ? 'ACTIVO' : 'INACTIVO' }, p._etag);
        auditar(id, activar ? 'CAMBIO_ESTADO' : 'DESACTIVAR', { estado: activar ? 'ACTIVO' : 'INACTIVO' });
        await cargar(true); U.aviso(activar ? 'Proveedor reactivado' : 'Proveedor desactivado', 'ok'); vistaFicha(c, id);
      } catch (er) { U.aviso(U.mensajeError(er), 'err', 7000); }
    };
  }

  async function refrescarFicha(id) {
    await cargar(true);
    vistaFicha(document.getElementById('contenido'), id);
  }

  // ---------- Contacto ----------
  function formContacto(prv, x, sedes) {
    const nuevo = !x;
    x = x || { estado: 'ACTIVO', autoriza_datos: false };
    const html = '<form class="ic-form" id="fCon" novalidate><div class="ic-campos">' +
      U.campo({ name: 'nombres', label: 'Nombres', valor: x.nombres, req: true }) +
      U.campo({ name: 'apellidos', label: 'Apellidos', valor: x.apellidos, req: true }) +
      U.campo({ name: 'cargo', label: 'Cargo', valor: x.cargo, ph: 'Ej.: Técnico instalador, Gerente' }) +
      U.campo({ name: 'area', label: 'Área', valor: x.area }) +
      U.campo({ name: 'celular', label: 'Celular / WhatsApp', valor: x.celular, t: 'tel', c: 'c4' }) +
      U.campo({ name: 'telefono', label: 'Teléfono fijo', valor: x.telefono, t: 'tel', c: 'c4' }) +
      U.campo({ name: 'extension', label: 'Extensión', valor: x.extension, c: 'c4' }) +
      U.campo({ name: 'email', label: 'Correo electrónico', valor: x.email, t: 'email', c: 'c8' }) +
      U.campo({ name: 'sede_id', label: 'Sede', t: 'select', vacio: 'Sede principal', op: sedes.filter((s) => s.estado !== 'INACTIVO' || s.Title === x.sede_id).map((s) => [s.Title, s.nombre]), valor: x.sede_id, c: 'c4' }) +
      U.campo({ name: 'autoriza_datos', label: 'El contacto autorizó el tratamiento de sus datos personales (Ley 1581 de 2012)', t: 'checkbox', valor: x.autoriza_datos }) +
      '</div><div class="ic-acciones">' +
      (!nuevo ? '<button type="button" class="ic-btn peligro" id="btnEstadoCon" style="margin-right:auto">' + (x.estado === 'INACTIVO' ? 'Reactivar' : 'Desactivar') + '</button>' : '') +
      '<button type="button" class="ic-btn sec" id="btnCancelar">Cancelar</button><button class="ic-btn" type="submit" id="btnGuardarCon">' + (nuevo ? 'Agregar contacto' : 'Guardar') + '</button></div></form>';
    U.modal((nuevo ? 'Nuevo contacto · ' : 'Contacto · ') + prv.razon_social, html, (m) => {
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
        const dup = v.email && datos.contactos.find((o) => o.Title !== x.Title && U.norm(o.email) === U.norm(v.email));
        if (dup) err.email = 'Este correo ya está registrado en ' + ((porId(dup.proveedor_id) || {}).razon_social || dup.proveedor_id);
        if (!U.marcarErrores(f, err)) return;
        await U.conCarga(U.$('#btnGuardarCon', m), async () => {
          try {
            const campos = { nombres: v.nombres, apellidos: v.apellidos, cargo: v.cargo, area: v.area, celular: v.celular, telefono: v.telefono,
              extension: v.extension, email: v.email.toLowerCase(), sede_id: v.sede_id, autoriza_datos: v.autoriza_datos };
            if (nuevo) {
              const cid = 'PVC-' + pad(await G.siguiente('PVC'), 6);
              await G.crear('OPE_ProveedorContactos', Object.assign({ Title: cid, proveedor_id: prv.Title, estado: 'ACTIVO' }, campos));
            } else await G.actualizar('OPE_ProveedorContactos', x._id, campos, x._etag);
            U.cerrarModal(); U.aviso(nuevo ? 'Contacto agregado' : 'Contacto actualizado', 'ok');
            await refrescarFicha(prv.Title);
          } catch (er) { console.error(er); U.aviso(U.mensajeError(er), 'err', 7000); }
        });
      };
      const be = U.$('#btnEstadoCon', m);
      if (be) be.onclick = async () => {
        try { await G.actualizar('OPE_ProveedorContactos', x._id, { estado: x.estado === 'INACTIVO' ? 'ACTIVO' : 'INACTIVO' }, x._etag); U.cerrarModal(); U.aviso('Contacto ' + (x.estado === 'INACTIVO' ? 'reactivado' : 'desactivado'), 'ok'); await refrescarFicha(prv.Title); }
        catch (er) { U.aviso(U.mensajeError(er), 'err', 7000); }
      };
    });
  }

  // ---------- Sede ----------
  function formSede(prv, s) {
    const nueva = !s;
    s = s || { estado: 'ACTIVO', departamento: prv.departamento, pais: prv.pais };
    const html = '<form class="ic-form" id="fSede" novalidate><div class="ic-campos">' +
      (nueva ? '' : U.campo({ name: 'codigo_sede', label: 'Código', valor: s.codigo_sede, readonly: true, c: 'c4' })) +
      U.campo({ name: 'nombre', label: 'Nombre de la sede', valor: s.nombre, req: true, c: nueva ? 'c12' : 'c8', ph: 'Ej.: Sede Cali' }) +
      U.campo({ name: 'departamento', label: 'Departamento', valor: s.departamento, req: true }) +
      U.campo({ name: 'ciudad', label: 'Ciudad o municipio', valor: s.ciudad, req: true }) +
      U.campo({ name: 'direccion', label: 'Dirección', valor: s.direccion, c: 'c8' }) +
      U.campo({ name: 'telefonos', label: 'Teléfonos', valor: s.telefonos, c: 'c4' }) +
      '</div>' + (nueva ? '<p class="ayuda" style="font-size:12px;color:var(--ic-gris)">El código se asigna automáticamente: ' + esc(prv.nit) + '-001, -002…</p>' : '') +
      '<div class="ic-acciones">' +
      (!nueva ? '<button type="button" class="ic-btn peligro" id="btnEstadoSede" style="margin-right:auto">' + (s.estado === 'INACTIVO' ? 'Reactivar' : 'Desactivar') + '</button>' : '') +
      '<button type="button" class="ic-btn sec" id="btnCancelar">Cancelar</button><button class="ic-btn" type="submit" id="btnGuardarSede">' + (nueva ? 'Agregar sede' : 'Guardar') + '</button></div></form>';
    U.modal((nueva ? 'Nueva sede · ' : 'Sede · ') + prv.razon_social, html, (m) => {
      const f = U.$('#fSede', m);
      U.$('#btnCancelar', m).onclick = U.cerrarModal;
      f.onsubmit = async (ev) => {
        ev.preventDefault();
        const v = U.leerForm(f);
        const err = {};
        if (!v.nombre) err.nombre = 'Obligatorio';
        if (!v.departamento) err.departamento = 'Obligatorio';
        if (!v.ciudad) err.ciudad = 'Obligatorio';
        if (!U.marcarErrores(f, err)) return;
        await U.conCarga(U.$('#btnGuardarSede', m), async () => {
          try {
            const campos = { nombre: v.nombre, departamento: v.departamento, ciudad: v.ciudad, telefonos: v.telefonos, direccion: v.direccion };
            if (nueva) {
              // Código NIT-NNN: mayor existente del proveedor + 1 (nunca se reutiliza), leído fresco de SharePoint
              const actuales = await G.items('OPE_ProveedorSedes', { filtro: "fields/proveedor_id eq '" + prv.Title + "'" });
              const max = actuales.reduce((mx, o) => { const r = String(o.codigo_sede || '').match(/-(\d{3})$/); return r ? Math.max(mx, Number(r[1])) : mx; }, 0);
              const sid = 'PVS-' + pad(await G.siguiente('PVS'), 6);
              await G.crear('OPE_ProveedorSedes', Object.assign({ Title: sid, proveedor_id: prv.Title, codigo_sede: prv.nit + '-' + pad(max + 1, 3), estado: 'ACTIVO' }, campos));
            } else await G.actualizar('OPE_ProveedorSedes', s._id, campos, s._etag);
            U.cerrarModal(); U.aviso(nueva ? 'Sede agregada' : 'Sede actualizada', 'ok');
            await refrescarFicha(prv.Title);
          } catch (er) { console.error(er); U.aviso(U.mensajeError(er), 'err', 7000); }
        });
      };
      const be = U.$('#btnEstadoSede', m);
      if (be) be.onclick = async () => {
        try { await G.actualizar('OPE_ProveedorSedes', s._id, { estado: s.estado === 'INACTIVO' ? 'ACTIVO' : 'INACTIVO' }, s._etag); U.cerrarModal(); U.aviso('Sede ' + (s.estado === 'INACTIVO' ? 'reactivada' : 'desactivada'), 'ok'); await refrescarFicha(prv.Title); }
        catch (er) { U.aviso(U.mensajeError(er), 'err', 7000); }
      };
    });
  }

  App.proveedores = { calcularDV, cargar, datos, SERVICIOS };
})();
