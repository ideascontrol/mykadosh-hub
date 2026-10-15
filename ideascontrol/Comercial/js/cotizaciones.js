/* =====================================================================
   APP-101 · Comercial — Cotizaciones (Etapa 2)
   Rutas: #cotizar (atajo a nueva) · #cotizaciones · #cotizaciones/nueva
          #cotizaciones/COT-000001 · #cotizaciones/COT-000001/editar
   Listas: COT_Cotizaciones · COT_Detalle · COT_CotizacionCondiciones
   Reglas:
   - Número visible: INICIALES + AAAA + NNNN, un solo consecutivo para toda IC por año
     (secuencia CV[AAAA], inicia en el parámetro CONSECUTIVO_INICIAL_[AAAA]). Revisiones: -R1, -R2…
   - Al guardar se copian (congelan) los datos del cliente, las líneas y las condiciones ya resueltas.
   - Descuento sobre el tope: solo se avisa y se marca requiere_aprobacion (la aprobación formal es Etapa 3).
   - BORRADOR se edita; al generar el PDF pasa a LISTA_PARA_ENVIO y ya no se edita (cambios = revisión).
   ===================================================================== */
(function () {
  const U = IC.ui, G = IC.graph, esc = U.esc;
  const pad = (n, w) => String(n).padStart(w, '0');
  const T = () => window.ICTextos;
  const ICO_BUSCAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';

  const ESTADOS = {
    BORRADOR: ['Borrador', 'e-borrador'], PENDIENTE_APROBACION: ['Pendiente de aprobación', 'e-negociacion'], LISTA_PARA_ENVIO: ['Lista para enviar', 'e-lista'],
    ENVIADA: ['Enviada', 'e-enviada'], EN_NEGOCIACION: ['En negociación', 'e-negociacion'], GANADA: ['Ganada', 'e-ganada'], PERDIDA: ['Perdida', 'e-perdida'],
    VENCIDA: ['Vencida', 'e-vencida'], REEMPLAZADA: ['Reemplazada', 'e-cerrada'], ANULADA: ['Anulada', 'e-cerrada']
  };
  const MOTIVOS = [['PRECIO', 'Precio'], ['COMPETENCIA', 'Eligió a la competencia'], ['SIN_PRESUPUESTO', 'Sin presupuesto'], ['SIN_RESPUESTA', 'Sin respuesta del cliente'], ['OTRO', 'Otro']];
  const LINEAS = [['TODAS', 'General'], ['VENTA_HW', 'Venta de equipos'], ['LICENCIA', 'Licencias'], ['SAAS', 'SaaS (suscripción)'], ['ALQUILER_HW', 'Alquiler de equipos'], ['SOPORTE', 'Contratos de soporte'], ['LATAM', 'Clientes de Latinoamérica']];

  const D = { cotizaciones: [], params: {}, condiciones: [], festivos: new Set(), cargado: 0 };
  const filtro = { texto: '', estado: 'ABIERTAS', comercial: '', anio: String(new Date().getFullYear()) };

  // ---------- Utilidades ----------
  const hoy = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2); };
  const sf = (v) => (v ? String(v).slice(0, 10) : '');
  const yo = () => App.usuario.usuario_id;
  const usuario = (id) => (App.usuarios || []).find((u) => u.Title === id) || {};
  const dinero = (v, m) => m === 'USD' ? 'US$ ' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : U.fmt.cop(v);
  const redondear = (x, m) => m === 'USD' ? Math.round(Number(x || 0) * 100) / 100 : Math.round(Number(x || 0));
  const num = (v) => { const s = String(v === undefined || v === null ? '' : v).trim().replace(/\s/g, ''); if (s === '') return NaN; return Number(s.indexOf(',') >= 0 && s.indexOf('.') < 0 ? s.replace(',', '.') : s.replace(/,/g, '')); };
  const param = (k) => D.params[k];
  const ivaPct = () => Math.round(Number(param('IVA_PORCENTAJE') || 0) * 10000) / 100;
  const topePct = () => Math.round(Number(param('DESCUENTO_TOPE') || 0) * 10000) / 100;
  const empresaDe = (id) => App.empresas.datos.empresas.find((e) => e.Title === id);
  const productoDe = (id) => App.productos.datos.productos.find((p) => p.Title === id);

  // Fecha + N días hábiles (sin sábados, domingos ni festivos de SYS_Festivos)
  function sumarHabiles(fecha, n) {
    const d = new Date(fecha + 'T12:00:00'); let c = 0;
    while (c < n) {
      d.setDate(d.getDate() + 1);
      const s = d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2);
      if (d.getDay() !== 0 && d.getDay() !== 6 && !D.festivos.has(s)) c++;
    }
    return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2);
  }
  // Estado que se muestra: las enviadas o listas cuya vigencia ya pasó se ven como Vencidas
  const estadoVisible = (c) => (['LISTA_PARA_ENVIO', 'ENVIADA', 'EN_NEGOCIACION'].indexOf(c.estado) >= 0 && sf(c.fecha_vencimiento) && sf(c.fecha_vencimiento) < hoy()) ? 'VENCIDA' : c.estado;
  const tagEstado = (c) => { const e = ESTADOS[estadoVisible(c)] || [c.estado, 'e-cerrada']; return '<span class="ic-tag ' + e[1] + '">' + e[0] + '</span>'; };
  const puedeEditar = (c) => c.estado === 'BORRADOR' && (App.usuario.es_admin || c.comercial_id === yo());
  const auditar = (registro, accion, antes, despues) => App.admin && App.admin.auditar ? App.admin.auditar('COTIZACION', registro, accion, antes, despues) : null;

  async function cargar(forzar) {
    if (!forzar && D.cargado && Date.now() - D.cargado < 60000) return;
    const r = await Promise.all([G.items('COT_Cotizaciones', { top: 5000 }), G.items('SYS_Parametros'), G.items('COT_Condiciones'), G.items('SYS_Festivos'),
      App.empresas.cargar(forzar), App.productos.cargar(forzar)]);
    D.cotizaciones = r[0].sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')) || String(b.numero_visible || '').localeCompare(String(a.numero_visible || '')));
    D.params = {}; r[1].filter((p) => !p.app_id || p.app_id === CFG.app.id).forEach((p) => { D.params[p.Title] = p.valor; });
    D.condiciones = r[2]; D.festivos = new Set(r[3].map((f) => sf(f.fecha)));
    D.cargado = Date.now();
  }
  const leerDetalle = (id) => G.items('COT_Detalle', { filtro: "fields/cotizacion_id eq '" + id + "'" }).then((x) => x.sort((a, b) => Number(a.linea) - Number(b.linea)));
  const leerConds = (id) => G.items('COT_CotizacionCondiciones', { filtro: "fields/cotizacion_id eq '" + id + "'" }).then((x) => x.sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99)));

  // =====================================================================
  // ENRUTADOR
  // =====================================================================
  App.vistas['cotizar'] = () => { location.hash = '#cotizaciones/nueva'; };
  App.vistas['cotizaciones'] = async function (c) {
    const partes = (location.hash || '').replace(/^#/, '').split('/');
    c.innerHTML = '<div class="ic-form" style="text-align:center"><div class="ic-spinner"></div>Cargando cotizaciones…</div>';
    try {
      await cargar();
      if (partes[1] === 'nueva') return vistaForm(c, null);
      if (partes[1] && partes[2] === 'editar') return await vistaForm(c, D.cotizaciones.find((x) => x.Title === partes[1]));
      if (partes[1]) return await vistaFicha(c, partes[1]);
      return vistaLista(c);
    } catch (e) {
      console.error(e);
      c.innerHTML = '<a class="ic-volver" href="#">← Menú principal</a><div class="ic-form"><b>No se pudieron cargar las cotizaciones.</b><p>' + esc(U.mensajeError(e)) + '</p><button class="ic-btn" onclick="location.reload()">Reintentar</button></div>';
    }
  };

  // =====================================================================
  // LISTA
  // =====================================================================
  function vistaLista(c) {
    const anios = Array.from(new Set(D.cotizaciones.map((x) => sf(x.fecha).slice(0, 4)).filter(Boolean).concat([String(new Date().getFullYear())]))).sort().reverse();
    const comerciales = (App.usuarios || []).filter((u) => D.cotizaciones.some((x) => x.comercial_id === u.Title));
    c.innerHTML = '<a class="ic-volver" href="#">← Menú principal</a>' +
      '<div class="ic-barra"><div><h1 class="ic-titulo">Cotizaciones</h1><p class="ic-subtitulo" style="margin:0">Todas las cotizaciones de Ideas Control</p></div><div class="espacio"></div>' +
      '<a class="ic-btn" href="#cotizaciones/nueva">+ Nueva cotización</a></div>' +
      '<div class="ic-filtros"><div class="ic-buscar">' + ICO_BUSCAR + '<input id="fTexto" type="search" placeholder="Buscar por número, cliente o NIT" value="' + esc(filtro.texto) + '"></div>' +
      '<select id="fEstado"><option value="ABIERTAS">Abiertas</option><option value="">Todos los estados</option>' + Object.keys(ESTADOS).map((k) => '<option value="' + k + '">' + ESTADOS[k][0] + '</option>').join('') + '</select>' +
      '<select id="fComercial"><option value="">Todos los comerciales</option>' + comerciales.map((u) => '<option value="' + esc(u.Title) + '">' + esc(u.nombre) + '</option>').join('') + '</select>' +
      '<select id="fAnio"><option value="">Todos los años</option>' + anios.map((a) => '<option value="' + a + '">' + a + '</option>').join('') + '</select></div>' +
      '<div class="ic-kpis" id="kpis" style="margin-bottom:14px"></div><p class="ic-conteo" id="conteo"></p><div class="ic-tabla-caja" id="tabla"></div>';
    U.$('#fEstado', c).value = filtro.estado; U.$('#fComercial', c).value = filtro.comercial; U.$('#fAnio', c).value = filtro.anio;
    U.$('#fTexto', c).oninput = (e) => { filtro.texto = e.target.value; pintarLista(c); };
    U.$('#fEstado', c).onchange = (e) => { filtro.estado = e.target.value; pintarLista(c); };
    U.$('#fComercial', c).onchange = (e) => { filtro.comercial = e.target.value; pintarLista(c); };
    U.$('#fAnio', c).onchange = (e) => { filtro.anio = e.target.value; pintarLista(c); };
    pintarLista(c);
  }
  function pintarLista(c) {
    const t = U.norm(filtro.texto);
    const base = D.cotizaciones.filter((x) => (!filtro.anio || sf(x.fecha).startsWith(filtro.anio)) && (!filtro.comercial || x.comercial_id === filtro.comercial));
    const abierta = (x) => ['BORRADOR', 'PENDIENTE_APROBACION', 'LISTA_PARA_ENVIO', 'ENVIADA', 'EN_NEGOCIACION'].indexOf(estadoVisible(x)) >= 0;
    const lista = base.filter((x) => (filtro.estado === 'ABIERTAS' ? abierta(x) : !filtro.estado || estadoVisible(x) === filtro.estado) &&
      (!t || U.norm([x.numero_visible, x.cliente_razon_social, x.cliente_nit, x.contacto_nombre].join(' ')).includes(t)));
    const sum = (arr) => arr.reduce((s, x) => s + (x.moneda === 'USD' ? Number(x.total || 0) * Number(x.trm_referencia || 0) : Number(x.total || 0)), 0);
    const ganadas = base.filter((x) => x.estado === 'GANADA'), cerradas = base.filter((x) => ['GANADA', 'PERDIDA'].indexOf(x.estado) >= 0);
    U.$('#kpis', c).innerHTML = kpi(base.filter(abierta).length, 'Abiertas') + kpi(U.fmt.cop(sum(base.filter(abierta))), 'Valor abierto (COP)') +
      kpi(ganadas.length, 'Ganadas') + kpi(cerradas.length ? Math.round(ganadas.length * 100 / cerradas.length) + ' %' : '—', 'Tasa de cierre');
    U.$('#conteo', c).textContent = lista.length + (lista.length === 1 ? ' cotización' : ' cotizaciones');
    U.$('#tabla', c).innerHTML = !lista.length ? '<div class="ic-vacio">' + (D.cotizaciones.length ? 'No hay cotizaciones con estos filtros.' : 'Aún no hay cotizaciones. Cree la primera con <b>+ Nueva cotización</b>.') + '</div>' :
      '<table class="ic-tabla"><thead><tr><th>Número</th><th>Cliente</th><th class="ocultar-movil">Comercial</th><th class="ocultar-movil">Fecha</th><th style="text-align:right">Total</th><th>Estado</th></tr></thead><tbody>' +
      lista.map((x) => '<tr data-id="' + esc(x.Title) + '"><td><b>' + esc(x.numero_visible) + '</b>' + (x.requiere_aprobacion ? '<span class="sec" style="color:var(--ic-warn)">Descuento sobre el tope</span>' : '') + '</td>' +
        '<td>' + esc(x.cliente_razon_social) + '<span class="sec">' + esc(x.contacto_nombre || '') + '</span></td>' +
        '<td class="ocultar-movil">' + esc(usuario(x.comercial_id).iniciales || '') + '</td>' +
        '<td class="ocultar-movil">' + U.fmt.fecha(sf(x.fecha) + 'T12:00:00') + '<span class="sec">Vence ' + U.fmt.fecha(sf(x.fecha_vencimiento) + 'T12:00:00') + '</span></td>' +
        '<td style="text-align:right"><b>' + dinero(x.total, x.moneda) + '</b></td><td>' + tagEstado(x) + '</td></tr>').join('') + '</tbody></table>';
    c.querySelectorAll('#tabla tr[data-id]').forEach((tr) => { tr.onclick = () => { location.hash = '#cotizaciones/' + tr.dataset.id; }; });
  }
  const kpi = (v, t) => '<div class="ic-kpi"><div class="valor">' + v + '</div><div class="etiqueta">' + t + '</div></div>';

  // =====================================================================
  // FORMULARIO (nueva o borrador)
  // =====================================================================
  let F = null;   // estado del formulario

  async function vistaForm(c, cot) {
    if (cot && !puedeEditar(cot)) { location.hash = '#cotizaciones/' + cot.Title; return; }
    const P = D.params;
    if (cot) {
      const [det, conds] = await Promise.all([leerDetalle(cot.Title), leerConds(cot.Title)]);
      F = { cot, empresa_id: cot.empresa_id, sucursal_id: cot.sucursal_id || '', contacto_id: cot.contacto_id || '', fecha: sf(cot.fecha) || hoy(), moneda: cot.moneda || 'COP',
        trm: cot.trm_referencia || '', linea: 'VENTA_HW', titulo_seccion: cot.titulo_seccion || '', texto_introduccion: cot.texto_introduccion || '', observaciones: cot.observaciones_internas || '',
        lineas: det.map((l) => { const p = productoDe(l.producto_id) || {};
          return { producto_id: l.producto_id, codigo: l.codigo, nombre: p.nombre || l.codigo, descripcion: l.descripcion, ficha_tecnica: l.ficha_tecnica, ciudad_sede: l.ciudad_sede || '',
            cantidad: Number(l.cantidad), precio_unitario: Number(l.precio_unitario), precio_base: Number(l.precio_unitario), moneda_base: cot.moneda || 'COP',
            precio_editable: !!(p.Title && !(App.productos.precioVigente(p.Title) || {}).valor), descripcion_editable: !!p.descripcion_editable,
            descuento_porcentaje: Number(l.descuento_porcentaje || 0), aplica_iva: !!l.aplica_iva, garantia_meses: p.garantia_meses }; }),
        conds: conds.map((x) => x.condicion_id).filter(Boolean), introTocada: true };
    } else {
      F = { cot: null, empresa_id: '', sucursal_id: '', contacto_id: '', fecha: hoy(), moneda: P.MONEDA_DEFECTO || 'COP', trm: '', linea: 'VENTA_HW',
        titulo_seccion: '', texto_introduccion: '', observaciones: '', lineas: [], conds: [], introTocada: false };
      F.conds = predeterminadas('VENTA_HW');
    }
    c.innerHTML = '<a class="ic-volver" href="' + (cot ? '#cotizaciones/' + esc(cot.Title) : '#cotizaciones') + '">← ' + (cot ? esc(cot.numero_visible) : 'Cotizaciones') + '</a>' +
      '<h1 class="ic-titulo">' + (cot ? 'Editar borrador ' + esc(cot.numero_visible) : 'Nueva cotización') + '</h1>' +
      '<p class="ic-subtitulo">Nada se envía al cliente hasta que genere el PDF. Puede guardar como borrador y seguir después.</p>' +
      '<div class="ic-cot">' +
        '<div class="ic-cot-main">' +
          '<div class="ic-form" style="margin-bottom:16px"><fieldset><legend>1 · Cliente</legend><div id="zCliente"></div></fieldset></div>' +
          '<div class="ic-form" style="margin-bottom:16px"><fieldset><legend>2 · Datos de la propuesta</legend><div id="zDatos"></div></fieldset></div>' +
          '<div class="ic-form" style="margin-bottom:16px"><fieldset><legend>3 · Productos y servicios</legend><div id="zLineas"></div></fieldset></div>' +
          '<div class="ic-form" style="margin-bottom:16px"><fieldset><legend>4 · Condiciones comerciales</legend><div id="zConds"></div></fieldset></div>' +
          '<div class="ic-form"><fieldset style="margin:0"><legend>5 · Notas internas (no salen en el PDF)</legend><textarea id="fObs" rows="3" placeholder="Ej.: el cliente pidió entrega antes de diciembre">' + esc(F.observaciones) + '</textarea></fieldset></div>' +
        '</div>' +
        '<aside class="ic-cot-lado"><div class="ic-bloque ic-totales"><div class="cab"><h2>Resumen</h2></div><div class="cuerpo" id="zTotales"></div>' +
          '<div class="ic-totales-acc"><button class="ic-btn sec" id="btnBorrador">Guardar borrador</button><button class="ic-btn" id="btnPdf">Guardar y generar PDF</button></div></div></aside>' +
      '</div>';
    U.$('#fObs', c).oninput = (e) => { F.observaciones = e.target.value; };
    U.$('#btnBorrador', c).onclick = () => guardar(c, false);
    U.$('#btnPdf', c).onclick = () => guardar(c, true);
    pintarCliente(c); pintarDatos(c); pintarLineas(c); pintarConds(c); totales(c);
  }

  // ---------- 1 · Cliente ----------
  function pintarCliente(c) {
    const z = U.$('#zCliente', c), e = empresaDe(F.empresa_id);
    if (!e) {
      z.innerHTML = '<div class="ic-buscar">' + ICO_BUSCAR + '<input id="bEmp" type="search" placeholder="Escriba el nombre, NIT o código de la empresa" autocomplete="off"></div>' +
        '<div class="ic-sugerencias" id="sEmp"></div><p class="ic-conteo" style="margin-top:8px">¿No aparece? Créela primero en <a href="#empresas/nueva">Empresas y contactos</a>.</p>';
      const inp = U.$('#bEmp', z);
      inp.oninput = () => {
        const t = U.norm(inp.value);
        const r = !t ? [] : App.empresas.datos.empresas.filter((x) => x.estado !== 'INACTIVO' && U.norm([x.razon_social, x.nit, x.codigo_cliente, x.ciudad].join(' ')).includes(t)).slice(0, 8);
        U.$('#sEmp', z).innerHTML = r.map((x) => '<button type="button" data-id="' + esc(x.Title) + '"><b>' + esc(x.razon_social) + '</b><span>' + esc(x.tipo_id_fiscal + ' ' + x.nit) + ' · ' + esc(x.ciudad || '') +
          ' · ' + (x.estado_comercial === 'CLIENTE' ? 'Cliente ' + esc(x.codigo_cliente || '') : 'Prospecto') + '</span></button>').join('') || (t ? '<div class="vacio">Sin resultados</div>' : '');
        U.$('#sEmp', z).querySelectorAll('button').forEach((b) => { b.onclick = () => elegirEmpresa(c, b.dataset.id); });
      };
      inp.focus();
      return;
    }
    const sedes = App.empresas.datos.sucursales.filter((s) => s.empresa_id === e.Title && s.estado !== 'INACTIVO');
    const contactos = App.empresas.datos.contactos.filter((x) => x.empresa_id === e.Title && x.estado !== 'INACTIVO');
    z.innerHTML = '<div class="ic-cliente-sel"><div><b>' + esc(e.razon_social) + '</b> <span class="ic-tag ' + (e.estado_comercial === 'CLIENTE' ? 'cliente">Cliente ' + esc(e.codigo_cliente || '') : 'prospecto">Prospecto') + '</span>' +
      '<span class="sec">' + esc(e.tipo_id_fiscal + ' ' + e.nit + (e.dv ? '-' + e.dv : '')) + ' · ' + esc(e.ciudad || '') + ' · Relación ' + esc((e.tipo_cliente || 'NUEVO').toLowerCase()) + '</span></div>' +
      (F.cot ? '' : '<button type="button" class="ic-btn sec chico" id="btnCambiar">Cambiar</button>') + '</div>' +
      '<div class="ic-campos" style="margin-top:12px">' +
      U.campo({ name: 'sucursal_id', label: 'Sede', t: 'select', op: sedes.map((s) => [s.Title, s.nombre + ' · ' + (s.ciudad || '')]), vacio: 'Principal (' + (e.ciudad || '—') + ')', valor: F.sucursal_id, c: 'c6' }) +
      U.campo({ name: 'contacto_id', label: 'Contacto (Att.)', t: 'select', op: contactos.map((x) => [x.Title, x.nombres + ' ' + x.apellidos + (x.cargo ? ' · ' + x.cargo : '')]), vacio: contactos.length ? 'Seleccione…' : 'La empresa no tiene contactos', valor: F.contacto_id, c: 'c6',
        ayuda: '<a href="#empresas/' + esc(e.Title) + '" target="_blank">Agregar sede o contacto</a> (se abre en otra pestaña; luego recargue)' }) + '</div>';
    const bc = U.$('#btnCambiar', z); if (bc) bc.onclick = () => { F.empresa_id = ''; F.sucursal_id = ''; F.contacto_id = ''; pintarCliente(c); };
    z.querySelector('[name=sucursal_id]').onchange = (ev) => { F.sucursal_id = ev.target.value; const s = sedes.find((x) => x.Title === F.sucursal_id); F.lineas.forEach((l) => { if (!l.ciudad_sede || l._sedeAuto) { l.ciudad_sede = s ? s.ciudad || '' : ''; l._sedeAuto = true; } }); pintarLineas(c); };
    z.querySelector('[name=contacto_id]').onchange = (ev) => { F.contacto_id = ev.target.value; };
  }
  function elegirEmpresa(c, id) {
    F.empresa_id = id; F.sucursal_id = ''; F.contacto_id = '';
    const contactos = App.empresas.datos.contactos.filter((x) => x.empresa_id === id && x.estado !== 'INACTIVO');
    if (contactos.length === 1) F.contacto_id = contactos[0].Title;
    if (!F.introTocada) F.texto_introduccion = introPara(empresaDe(id));
    pintarCliente(c); pintarDatos(c);
  }
  const introPara = (e) => [e && e.tipo_cliente === 'RECURRENTE' ? param('TEXTO_INTRO_RECURRENTE') : param('TEXTO_INTRO_NUEVO'), param('TEXTO_PROPUESTA')].filter(Boolean).join('\n');

  // ---------- 2 · Datos ----------
  function necesitaTrm() { return F.lineas.some((l) => l.moneda_base && l.moneda_base !== F.moneda); }
  function pintarDatos(c) {
    const z = U.$('#zDatos', c), vig = Number(param('VIGENCIA_DIAS_HABILES') || 10);
    z.innerHTML = '<div class="ic-campos">' +
      U.campo({ name: 'fecha', label: 'Fecha', t: 'date', valor: F.fecha, c: 'c3' }) +
      '<div class="ic-campo c3"><label>Válida hasta</label><input readonly value="' + esc(U.fmt.fecha(sumarHabiles(F.fecha, vig) + 'T12:00:00')) + '" id="fVence"><span class="ayuda">' + vig + ' días hábiles (Parámetros)</span></div>' +
      U.campo({ name: 'moneda', label: 'Moneda', t: 'select', op: [['COP', 'COP · pesos'], ['USD', 'USD · dólares']], valor: F.moneda, vacio: false, c: 'c3' }) +
      U.campo({ name: 'trm', label: 'TRM de referencia', valor: F.trm, modo: 'decimal', c: 'c3', ayuda: necesitaTrm() ? '<b style="color:var(--ic-warn)">Obligatoria: hay precios en otra moneda</b>' : 'Solo si hay precios en otra moneda' }) +
      U.campo({ name: 'linea', label: 'Línea de negocio', t: 'select', op: LINEAS, valor: F.linea, vacio: false, c: 'c4', ayuda: 'Define las condiciones predeterminadas' }) +
      U.campo({ name: 'titulo_seccion', label: 'Título de la propuesta', valor: F.titulo_seccion, c: 'c8', ph: 'Ej.: Componentes solución biométrica' }) +
      U.campo({ name: 'texto_introduccion', label: 'Introducción', t: 'textarea', filas: 3, valor: F.texto_introduccion, c: 'c12', ayuda: 'Se propone según la relación del cliente (nuevo o recurrente); puede ajustarla' }) + '</div>';
    z.querySelector('[name=fecha]').onchange = (e) => { F.fecha = e.target.value || hoy(); U.$('#fVence', z).value = U.fmt.fecha(sumarHabiles(F.fecha, vig) + 'T12:00:00'); pintarConds(c); };
    z.querySelector('[name=moneda]').onchange = (e) => { F.moneda = e.target.value; recalcularPrecios(); pintarDatos(c); pintarLineas(c); };
    z.querySelector('[name=trm]').oninput = (e) => { F.trm = e.target.value; recalcularPrecios(); pintarLineas(c, true); };
    z.querySelector('[name=linea]').onchange = (e) => { F.linea = e.target.value; F.conds = predeterminadas(F.linea); pintarConds(c); };
    z.querySelector('[name=titulo_seccion]').oninput = (e) => { F.titulo_seccion = e.target.value; };
    z.querySelector('[name=texto_introduccion]').oninput = (e) => { F.texto_introduccion = e.target.value; F.introTocada = true; };
  }
  // Precio en la moneda de la cotización (con TRM si el precio de catálogo está en otra moneda)
  function precioEn(valor, monedaBase) {
    if (!monedaBase || monedaBase === F.moneda) return Number(valor);
    const trm = num(F.trm); if (!(trm > 0)) return NaN;
    return F.moneda === 'COP' ? redondear(valor * trm, 'COP') : redondear(valor / trm, 'USD');
  }
  function recalcularPrecios() { F.lineas.forEach((l) => { if (!l.precio_editable) l.precio_unitario = precioEn(l.precio_base, l.moneda_base); }); }

  // ---------- 3 · Líneas ----------
  function pintarLineas(c, soloValores) {
    const z = U.$('#zLineas', c);
    if (soloValores) { F.lineas.forEach((l, i) => { const inp = z.querySelector('[data-i="' + i + '"][data-k="precio_unitario"]'); if (inp && !l.precio_editable) inp.value = isNaN(l.precio_unitario) ? '' : l.precio_unitario; }); totales(c); return; }
    const tope = topePct();
    z.innerHTML = '<div class="ic-buscar">' + ICO_BUSCAR + '<input id="bPrd" type="search" placeholder="Agregar producto: escriba código o nombre" autocomplete="off"></div><div class="ic-sugerencias" id="sPrd"></div>' +
      (!F.lineas.length ? '<div class="ic-vacio">Aún no hay productos en la cotización.</div>' :
      '<div class="ic-lineas">' + F.lineas.map((l, i) => {
        const r = calcLinea(l);
        return '<div class="ic-linea" data-fila="' + i + '"><div class="ic-linea-cab"><span class="n">' + (i + 1) + '</span><div class="t"><b>' + esc(l.codigo) + '</b> · ' + esc(l.nombre) + '</div>' +
          '<div class="acc"><button type="button" title="Subir" data-mov="-1" data-i="' + i + '"' + (i === 0 ? ' disabled' : '') + '>▲</button><button type="button" title="Bajar" data-mov="1" data-i="' + i + '"' + (i === F.lineas.length - 1 ? ' disabled' : '') + '>▼</button><button type="button" title="Quitar" class="quitar" data-quitar="' + i + '">✕</button></div></div>' +
          '<div class="ic-linea-cuerpo">' +
            '<div class="desc">' + (l.descripcion_editable ? '<textarea rows="2" data-i="' + i + '" data-k="descripcion">' + esc(l.descripcion) + '</textarea>' : '<div class="fija">' + esc(l.descripcion) + '</div>') +
              (l.ficha_tecnica ? '<div class="ficha">' + esc(String(l.ficha_tecnica).split(/\r?\n/).filter(Boolean).length) + ' características de la ficha técnica</div>' : '') + '</div>' +
            '<label>Ciudad / sede<input data-i="' + i + '" data-k="ciudad_sede" value="' + esc(l.ciudad_sede) + '"></label>' +
            '<label>Cantidad<input data-i="' + i + '" data-k="cantidad" inputmode="decimal" value="' + esc(l.cantidad) + '"></label>' +
            '<label>Unitario (' + F.moneda + ')<input data-i="' + i + '" data-k="precio_unitario" inputmode="decimal" value="' + (isNaN(l.precio_unitario) ? '' : esc(l.precio_unitario)) + '"' + (l.precio_editable ? ' placeholder="Escriba el precio"' : ' readonly title="Precio del catálogo"') + '></label>' +
            '<label>Descuento %<input data-i="' + i + '" data-k="descuento_porcentaje" inputmode="decimal" value="' + esc(l.descuento_porcentaje || '') + '" placeholder="0"></label>' +
            '<div class="tot"><span>Total línea</span><b data-tot="' + i + '">' + (isNaN(r.neto) ? '—' : dinero(r.neto, F.moneda)) + '</b><span class="aviso" data-av="' + i + '">' + avisoLinea(l, tope) + '</span></div>' +
          '</div></div>';
      }).join('') + '</div>');
    const inp = U.$('#bPrd', z);
    inp.oninput = () => {
      const t = U.norm(inp.value);
      const r = !t ? [] : App.productos.datos.productos.filter((p) => p.estado !== 'INACTIVO' && U.norm([p.codigo, p.nombre, p.categoria, p.codigo_anterior].join(' ')).includes(t)).slice(0, 10);
      U.$('#sPrd', z).innerHTML = r.map((p) => { const pv = App.productos.precioVigente(p.Title), co = App.productos.ultimoCorte(p.Title);
        return '<button type="button" data-id="' + esc(p.Title) + '"><b>' + esc(p.codigo) + ' · ' + esc(p.nombre) + '</b><span>' + (pv ? dinero(pv.valor, pv.moneda) + ' antes de IVA' : 'Sin precio') +
          (p.maneja_inventario ? ' · Inventario: ' + (co ? U.fmt.num(co.cantidad) : 'sin corte') : '') + '</span></button>'; }).join('') || (t ? '<div class="vacio">Sin resultados</div>' : '');
      U.$('#sPrd', z).querySelectorAll('button').forEach((b) => { b.onclick = () => agregarProducto(c, b.dataset.id); });
    };
    z.querySelectorAll('[data-k]').forEach((el) => { el.oninput = () => {
      const l = F.lineas[Number(el.dataset.i)], k = el.dataset.k;
      if (k === 'descripcion' || k === 'ciudad_sede') { l[k] = el.value; if (k === 'ciudad_sede') l._sedeAuto = false; }
      else l[k] = el.value === '' ? (k === 'descuento_porcentaje' ? 0 : NaN) : num(el.value);
      if (k === 'precio_unitario') l.precio_base = l.precio_unitario, l.moneda_base = F.moneda;
      const r = calcLinea(l); U.$('[data-tot="' + el.dataset.i + '"]', z).textContent = isNaN(r.neto) ? '—' : dinero(r.neto, F.moneda);
      U.$('[data-av="' + el.dataset.i + '"]', z).innerHTML = avisoLinea(l, topePct());
      totales(c);
      if (k === 'cantidad' || k === 'precio_unitario') pintarCondsPreview(c);
    }; });
    z.querySelectorAll('[data-mov]').forEach((b) => { b.onclick = () => { const i = Number(b.dataset.i), j = i + Number(b.dataset.mov); const t = F.lineas[i]; F.lineas[i] = F.lineas[j]; F.lineas[j] = t; pintarLineas(c); }; });
    z.querySelectorAll('[data-quitar]').forEach((b) => { b.onclick = () => { F.lineas.splice(Number(b.dataset.quitar), 1); pintarLineas(c); pintarDatos(c); pintarConds(c); }; });
    totales(c);
  }
  function avisoLinea(l, tope) {
    if (l.precio_editable && !(Number(l.precio_unitario) > 0)) return 'Escriba el precio (en el catálogo está en 0)';
    if (isNaN(l.precio_unitario)) return 'Falta la TRM para convertir el precio';
    if (Number(l.descuento_porcentaje) > tope) return 'Descuento sobre el tope (' + tope.toLocaleString('es-CO') + ' %)';
    return '';
  }
  function agregarProducto(c, id) {
    const p = productoDe(id); if (!p) return;
    const pv = App.productos.precioVigente(p.Title);
    const sede = App.empresas.datos.sucursales.find((s) => s.Title === F.sucursal_id), e = empresaDe(F.empresa_id);
    const base = pv ? Number(pv.valor) : 0, mb = pv ? pv.moneda || 'COP' : F.moneda;
    F.lineas.push({ producto_id: p.Title, codigo: p.codigo, nombre: p.nombre, descripcion: p.descripcion_corta || p.nombre, ficha_tecnica: p.ficha_tecnica || '',
      ciudad_sede: sede ? sede.ciudad || '' : '', _sedeAuto: true, cantidad: 1, precio_base: base, moneda_base: mb, precio_unitario: base > 0 ? precioEn(base, mb) : NaN,
      precio_editable: !(base > 0), descripcion_editable: !!p.descripcion_editable, descuento_porcentaje: 0, aplica_iva: p.aplica_iva !== false, garantia_meses: p.garantia_meses });
    if (base === 0) F.lineas[F.lineas.length - 1].moneda_base = F.moneda;
    pintarLineas(c); pintarDatos(c); pintarConds(c);
    const q = c.querySelector('[data-i="' + (F.lineas.length - 1) + '"][data-k="' + (base > 0 ? 'cantidad' : 'precio_unitario') + '"]'); if (q) q.focus();
    void e;
  }
  function calcLinea(l) {
    const m = F.moneda, cant = Number(l.cantidad), pu = Number(l.precio_unitario), pct = Number(l.descuento_porcentaje || 0);
    const subtotal = redondear(cant * pu, m), descuento = redondear(subtotal * pct / 100, m), neto = subtotal - descuento;
    const iva = l.aplica_iva ? ivaPct() : 0, ivaValor = redondear(neto * iva / 100, m);
    return { subtotal, descuento, neto, iva, ivaValor, total: neto + ivaValor };
  }
  function calcTotales() {
    const t = { bruto: 0, desc: 0, neto: 0, iva: 0, total: 0 };
    F.lineas.forEach((l) => { const r = calcLinea(l); if (isNaN(r.total)) return; t.bruto += r.subtotal; t.desc += r.descuento; t.neto += r.neto; t.iva += r.ivaValor; t.total += r.total; });
    Object.keys(t).forEach((k) => { t[k] = redondear(t[k], F.moneda); });
    return t;
  }
  function totales(c) {
    const t = calcTotales(), z = U.$('#zTotales', c); if (!z) return;
    const sobreTope = F.lineas.filter((l) => Number(l.descuento_porcentaje) > topePct());
    z.innerHTML = '<dl class="ic-datos"><dt>Subtotal</dt><dd>' + dinero(t.bruto, F.moneda) + '</dd>' + (t.desc ? '<dt>Descuentos</dt><dd>- ' + dinero(t.desc, F.moneda) + '</dd><dt>Subtotal neto</dt><dd>' + dinero(t.neto, F.moneda) + '</dd>' : '') +
      '<dt>IVA ' + ivaPct().toLocaleString('es-CO') + ' %</dt><dd>' + dinero(t.iva, F.moneda) + '</dd></dl><div class="ic-total-grande"><span>Total</span><b>' + dinero(t.total, F.moneda) + '</b></div>' +
      '<p class="ic-conteo" style="margin:8px 0 0">' + F.lineas.length + ' línea(s) · ' + F.conds.length + ' condición(es)</p>' +
      (sobreTope.length ? '<div class="ic-alerta chica">Descuento sobre el tope (' + topePct().toLocaleString('es-CO') + ' %) en ' + sobreTope.length + ' línea(s). Se puede generar el PDF; quedará marcada para revisión.</div>' : '');
  }

  // ---------- 4 · Condiciones ----------
  function predeterminadas(linea) {
    return D.condiciones.filter((x) => x.estado !== 'INACTIVO' && x.predeterminada && (x.linea_negocio === 'TODAS' || x.linea_negocio === linea)).map((x) => x.Title);
  }
  const ctxCot = () => ({ fecha_vencimiento: sumarHabiles(F.fecha, Number(param('VIGENCIA_DIAS_HABILES') || 10)), lineas: F.lineas.map((l) => ({ codigo: l.codigo, nombre: l.nombre, garantia_meses: l.garantia_meses })) });
  function pintarConds(c) {
    const z = U.$('#zConds', c);
    const activas = D.condiciones.filter((x) => x.estado !== 'INACTIVO' || F.conds.indexOf(x.Title) >= 0);
    const tipos = [['PAGO', 'Forma de pago'], ['GARANTIA', 'Garantía'], ['SOPORTE', 'Soporte'], ['GENERALES', 'Condiciones generales']];
    z.innerHTML = '<p class="ic-conteo">Marcadas: las que van en esta cotización. Las predeterminadas de la línea de negocio se marcan solas. El texto se completa con los datos de hoy y queda fijo en la cotización.</p>' +
      tipos.map((t) => { const g = activas.filter((x) => x.tipo === t[0]).sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99)); if (!g.length) return '';
        return '<div class="ic-seccion" style="margin-top:12px">' + t[1] + '</div>' + g.map((x) => '<label class="ic-cond"><input type="checkbox" data-cond="' + esc(x.Title) + '"' + (F.conds.indexOf(x.Title) >= 0 ? ' checked' : '') + '>' +
          '<div><b>' + esc(x.titulo) + '</b> <span class="sec">' + esc((LINEAS.find((l) => l[0] === x.linea_negocio) || [0, x.linea_negocio])[1]) + '</span><div class="txt" data-prev="' + esc(x.Title) + '"></div></div></label>').join(''); }).join('');
    z.querySelectorAll('[data-cond]').forEach((el) => { el.onchange = () => { const id = el.dataset.cond; F.conds = F.conds.filter((k) => k !== id); if (el.checked) F.conds.push(id); totales(c); }; });
    pintarCondsPreview(c); totales(c);
  }
  function pintarCondsPreview(c) {
    const ctx = ctxCot();
    c.querySelectorAll('[data-prev]').forEach((el) => { const x = D.condiciones.find((y) => y.Title === el.dataset.prev); if (x) el.textContent = T().resolver(x.texto, D.params, ctx, 'ejemplo'); });
  }

  // ---------- Guardar ----------
  async function guardar(c, conPdf) {
    const e = empresaDe(F.empresa_id), errores = [];
    if (!e) errores.push('Elija el cliente.');
    if (!F.lineas.length) errores.push('Agregue al menos un producto.');
    if (necesitaTrm() && !(num(F.trm) > 0)) errores.push('Escriba la TRM de referencia: hay precios en otra moneda.');
    F.lineas.forEach((l, i) => {
      if (!(Number(l.cantidad) > 0)) errores.push('Línea ' + (i + 1) + ': cantidad no válida.');
      if (isNaN(l.precio_unitario) || Number(l.precio_unitario) < 0 || (l.precio_editable && !(Number(l.precio_unitario) > 0))) errores.push('Línea ' + (i + 1) + ': escriba un precio válido.');
      const d = Number(l.descuento_porcentaje || 0); if (isNaN(d) || d < 0 || d > 100) errores.push('Línea ' + (i + 1) + ': el descuento debe estar entre 0 y 100.');
    });
    if (conPdf && !String(param('SITIO_DOCUMENTAL_URL') || '').trim()) errores.push('Falta configurar el sitio documental en Administración › Parámetros (Ubicación de los documentos). Puede guardar como borrador.');
    if (errores.length) { U.modal('Revise la cotización', '<div class="ic-form"><ul style="margin:0 0 12px;padding-left:18px">' + errores.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul><div class="ic-acciones"><button class="ic-btn" id="bOk">Entendido</button></div></div>', (m) => { U.$('#bOk', m).onclick = U.cerrarModal; }); return; }
    if (conPdf && !await U.confirmar('Generar el PDF', 'Se guarda la cotización, se genera el PDF y se archiva en SharePoint. Después ya no se puede editar: cualquier cambio se hace con una revisión (R1, R2…). ¿Continuar?', 'Generar PDF')) return;
    const b1 = U.$('#btnBorrador', c), b2 = U.$('#btnPdf', c); b1.disabled = b2.disabled = true;
    const btn = conPdf ? b2 : b1, txt = btn.textContent; btn.textContent = 'Guardando…';
    try {
      const id = await persistir(e);
      await cargar(true);
      const cot = D.cotizaciones.find((x) => x.Title === id);
      if (conPdf) { btn.textContent = 'Generando PDF…'; await emitirPdf(cot); await cargar(true); }
      U.aviso(conPdf ? 'Cotización ' + cot.numero_visible + ' generada' : 'Borrador guardado: ' + cot.numero_visible, 'ok');
      location.hash = '#cotizaciones/' + id;
    } catch (er) {
      console.error(er); U.aviso(U.mensajeError(er), 'err', 9000);
      b1.disabled = b2.disabled = false; btn.textContent = txt;
    }
  }

  // Escribe encabezado + líneas + condiciones (congelados). Devuelve el ID.
  async function persistir(e) {
    const P = D.params, t = calcTotales(), vig = Number(P.VIGENCIA_DIAS_HABILES || 10);
    const sede = App.empresas.datos.sucursales.find((s) => s.Title === F.sucursal_id);
    const ct = App.empresas.datos.contactos.find((x) => x.Title === F.contacto_id);
    const vence = sumarHabiles(F.fecha, vig);
    const campos = {
      empresa_id: e.Title, sucursal_id: F.sucursal_id, contacto_id: F.contacto_id,
      cliente_nit: e.nit + (e.dv ? '-' + e.dv : ''), cliente_razon_social: e.razon_social,
      cliente_ciudad: sede ? sede.ciudad : e.ciudad, cliente_direccion: sede ? (sede.direccion || '') : (e.direccion || ''),
      contacto_nombre: ct ? ct.nombres + ' ' + ct.apellidos : '', contacto_telefono: ct ? [ct.celular, ct.telefono ? ct.telefono + (ct.extension ? ' ext. ' + ct.extension : '') : ''].filter(Boolean).join(' · ') : '',
      contacto_email: ct ? ct.email || '' : '',
      fecha: F.fecha, fecha_vencimiento: vence, moneda: F.moneda, trm_referencia: num(F.trm) > 0 ? num(F.trm) : null,
      titulo_seccion: F.titulo_seccion, texto_introduccion: F.texto_introduccion,
      subtotal_bruto: t.bruto, descuento_total: t.desc, subtotal_neto: t.neto, iva_total: t.iva, total: t.total,
      requiere_aprobacion: F.lineas.some((l) => Number(l.descuento_porcentaje) > topePct()), observaciones_internas: F.observaciones
    };
    let id, cot = F.cot;
    if (!cot) {
      const anio = F.fecha.slice(0, 4);
      const n = await G.siguiente('CV' + anio, Number(P['CONSECUTIVO_INICIAL_' + anio]) || 1);
      const consecutivo = String(App.usuario.iniciales || 'IC').toUpperCase() + anio + pad(n, 4);
      id = 'COT-' + pad(await G.siguiente('COT'), 6);
      await G.crear('COT_Cotizaciones', Object.assign({ Title: id, consecutivo, revision: 0, numero_visible: consecutivo, comercial_id: yo(), estado: 'BORRADOR' }, campos));
      await auditar(id, 'CREAR', null, { numero: consecutivo, cliente: e.razon_social, total: t.total });
    } else {
      id = cot.Title;
      await G.actualizar('COT_Cotizaciones', cot._id, campos, cot._etag);
      // Un borrador se reescribe completo: se borran sus líneas y condiciones anteriores
      const [det, cnd] = await Promise.all([leerDetalle(id), leerConds(id)]);
      for (const x of det) await G.eliminar('COT_Detalle', x._id);
      for (const x of cnd) await G.eliminar('COT_CotizacionCondiciones', x._id);
      await auditar(id, 'ACTUALIZAR', { total: cot.total }, { total: t.total });
    }
    // Líneas
    let nD = await G.reservar('DET', F.lineas.length);
    for (let i = 0; i < F.lineas.length; i++) {
      const l = F.lineas[i], r = calcLinea(l);
      await G.crear('COT_Detalle', { Title: 'DET-' + pad(nD++, 6), cotizacion_id: id, linea: i + 1, producto_id: l.producto_id, codigo: l.codigo, descripcion: l.descripcion,
        ficha_tecnica: l.ficha_tecnica, ciudad_sede: l.ciudad_sede, cantidad: Number(l.cantidad), precio_unitario: Number(l.precio_unitario),
        descuento_porcentaje: Number(l.descuento_porcentaje || 0), descuento_valor: r.descuento, subtotal_linea: r.subtotal, neto_linea: r.neto,
        aplica_iva: !!l.aplica_iva, iva_porcentaje: r.iva, iva_valor: r.ivaValor, total_linea: r.total });
    }
    // Condiciones ya resueltas (sin llaves): quedan fijas aunque luego cambien los parámetros
    const ctx = { fecha_vencimiento: vence, lineas: F.lineas.map((l) => ({ codigo: l.codigo, nombre: l.nombre, garantia_meses: l.garantia_meses })) };
    const sel = D.condiciones.filter((x) => F.conds.indexOf(x.Title) >= 0).sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99));
    let nC = await G.reservar('CCO', sel.length);
    for (let i = 0; i < sel.length; i++) {
      const x = sel[i];
      await G.crear('COT_CotizacionCondiciones', { Title: 'CCO-' + pad(nC++, 6), cotizacion_id: id, condicion_id: x.Title, tipo: x.tipo, titulo: x.titulo, texto: T().resolver(x.texto, P, ctx), orden: i + 1 });
    }
    return id;
  }

  // ---------- PDF ----------
  async function armarPdf(cot) {
    const [det, conds] = await Promise.all([leerDetalle(cot.Title), leerConds(cot.Title)]);
    const e = empresaDe(cot.empresa_id) || {}, com = usuario(cot.comercial_id);
    const doc = await App.cotPdf.generar(cot, det, conds, { params: D.params, productos: App.productos.datos.productos, comercial: com,
      codigoCliente: e.codigo_cliente || e.codigo_cliente_anterior || '' });
    return { doc, empresa: e };
  }
  async function emitirPdf(cot) {
    const { doc, empresa } = await armarPdf(cot);
    let res;
    try { res = await App.cotPdf.subir(doc, cot, empresa, D.params); }
    catch (er) {
      // No se pudo archivar: se ofrece la descarga para no perder el trabajo; la cotización sigue en borrador
      doc.save(cot.numero_visible + '.pdf');
      throw new Error(U.mensajeError(er) + ' El PDF se descargó en su equipo, pero la cotización sigue en borrador hasta que se pueda archivar.');
    }
    await G.actualizar('COT_Cotizaciones', cot._id, { estado: cot.estado === 'BORRADOR' ? 'LISTA_PARA_ENVIO' : cot.estado, pdf_url: res.webUrl });
    await auditar(cot.Title, 'GENERAR_PDF', null, { archivo: res.ruta });
    return res;
  }

  // =====================================================================
  // FICHA
  // =====================================================================
  async function vistaFicha(c, id) {
    const cot = D.cotizaciones.find((x) => x.Title === id);
    if (!cot) { c.innerHTML = '<a class="ic-volver" href="#cotizaciones">← Cotizaciones</a><div class="ic-form">No se encontró la cotización ' + esc(id) + '.</div>'; return; }
    const [det, conds] = await Promise.all([leerDetalle(id), leerConds(id)]);
    const ev = estadoVisible(cot), m = cot.moneda || 'COP', com = usuario(cot.comercial_id), e = empresaDe(cot.empresa_id);
    const revisiones = D.cotizaciones.filter((x) => x.consecutivo === cot.consecutivo && x.Title !== cot.Title).sort((a, b) => Number(a.revision) - Number(b.revision));
    const abierta = ['LISTA_PARA_ENVIO', 'ENVIADA', 'EN_NEGOCIACION', 'VENCIDA', 'PENDIENTE_APROBACION'].indexOf(ev) >= 0;
    const esMia = App.usuario.es_admin || cot.comercial_id === yo();
    const acciones = [];
    if (puedeEditar(cot)) acciones.push('<a class="ic-btn sec" href="#cotizaciones/' + esc(id) + '/editar">Editar</a>', '<button class="ic-btn" data-acc="pdf">Generar PDF</button>');
    if (cot.pdf_url) acciones.push('<a class="ic-btn sec" href="' + esc(cot.pdf_url) + '" target="_blank" rel="noopener">Abrir PDF en SharePoint</a>');
    if (cot.estado !== 'BORRADOR') acciones.push('<button class="ic-btn sec" data-acc="descargar">Descargar PDF</button>');
    if (esMia && cot.estado === 'LISTA_PARA_ENVIO') acciones.push('<button class="ic-btn" data-acc="enviada">Marcar como enviada</button>');
    if (esMia && cot.estado === 'ENVIADA') acciones.push('<button class="ic-btn sec" data-acc="negociacion">En negociación</button>');
    if (esMia && ['ENVIADA', 'EN_NEGOCIACION', 'LISTA_PARA_ENVIO'].indexOf(cot.estado) >= 0) acciones.push('<button class="ic-btn" data-acc="ganada">Ganada</button>', '<button class="ic-btn sec" data-acc="perdida">Perdida</button>');
    if (esMia && (abierta || cot.estado === 'PERDIDA')) acciones.push('<button class="ic-btn sec" data-acc="revision">Nueva revisión</button>');
    if (esMia && ['BORRADOR', 'LISTA_PARA_ENVIO', 'ENVIADA', 'EN_NEGOCIACION'].indexOf(cot.estado) >= 0) acciones.push('<button class="ic-btn peligro" data-acc="anular">Anular</button>');

    c.innerHTML = '<a class="ic-volver" href="#cotizaciones">← Cotizaciones</a>' +
      '<div class="ic-ficha-cab"><div class="principal">' + tagEstado(cot) + (cot.requiere_aprobacion ? ' <span class="ic-tag e-negociacion">Descuento sobre el tope</span>' : '') +
        '<h1>' + esc(cot.numero_visible) + ' · ' + esc(cot.cliente_razon_social) + '</h1>' +
        '<div class="meta"><span>' + U.fmt.fecha(sf(cot.fecha) + 'T12:00:00') + '</span><span>Vence ' + U.fmt.fecha(sf(cot.fecha_vencimiento) + 'T12:00:00') + '</span><span>' + esc(com.nombre || cot.comercial_id) + '</span>' +
        (e ? '<span><a href="#empresas/' + esc(e.Title) + '">Ver empresa</a></span>' : '') + '<span>' + esc(cot.Title) + '</span></div>' +
        '<div class="ic-total-cab">' + dinero(cot.total, m) + ' <span>total con IVA</span></div></div>' +
        '<div class="ic-acciones-cab">' + acciones.join('') + '</div></div>' +
      '<div class="ic-ficha-grid">' +
        '<div class="ic-bloque" style="grid-column:1 / -1"><div class="cab"><h2>Productos y servicios</h2></div><div class="cuerpo" style="padding:0">' +
          '<table class="ic-tabla"><thead><tr><th>Código</th><th>Descripción</th><th style="text-align:right">Cant.</th><th style="text-align:right">Unitario</th><th style="text-align:right">Desc.</th><th style="text-align:right">Total</th></tr></thead><tbody>' +
          det.map((l) => '<tr style="cursor:default"><td><b>' + esc(l.codigo) + '</b>' + (l.ciudad_sede ? '<span class="sec">' + esc(l.ciudad_sede) + '</span>' : '') + '</td><td>' + esc(l.descripcion) +
            (l.ficha_tecnica ? '<span class="sec">' + esc(String(l.ficha_tecnica).split(/\r?\n/).filter(Boolean).join(' · ')) + '</span>' : '') + '</td><td style="text-align:right">' + U.fmt.num(l.cantidad) + '</td>' +
            '<td style="text-align:right;white-space:nowrap">' + dinero(l.precio_unitario, m) + '</td><td style="text-align:right;white-space:nowrap">' + (Number(l.descuento_porcentaje) ? U.fmt.num(l.descuento_porcentaje) + ' %' : '—') + '</td>' +
            '<td style="text-align:right;white-space:nowrap"><b>' + dinero(l.neto_linea, m) + '</b></td></tr>').join('') + '</tbody></table>' +
          '<dl class="ic-datos ic-totales-ficha"><dt>Subtotal</dt><dd>' + dinero(cot.subtotal_bruto, m) + '</dd>' + (Number(cot.descuento_total) ? '<dt>Descuentos</dt><dd>- ' + dinero(cot.descuento_total, m) + '</dd>' : '') +
          '<dt>IVA</dt><dd>' + dinero(cot.iva_total, m) + '</dd><dt><b>Total</b></dt><dd><b>' + dinero(cot.total, m) + '</b></dd></dl></div></div>' +
        '<div class="ic-bloque"><div class="cab"><h2>Cliente</h2></div><div class="cuerpo"><dl class="ic-datos">' +
          fila('Empresa', cot.cliente_razon_social) + fila('NIT', cot.cliente_nit) + fila('Contacto', cot.contacto_nombre) + fila('Teléfono', cot.contacto_telefono) + fila('Correo', cot.contacto_email) +
          fila('Dirección', [cot.cliente_direccion, cot.cliente_ciudad].filter(Boolean).join(' · ')) + fila('Moneda', m + (cot.trm_referencia ? ' · TRM ' + U.fmt.cop(cot.trm_referencia) : '')) + '</dl></div></div>' +
        '<div class="ic-bloque"><div class="cab"><h2>Seguimiento</h2></div><div class="cuerpo"><dl class="ic-datos">' +
          fila('Estado', ESTADOS[ev] ? ESTADOS[ev][0] : ev) + fila('Enviada', cot.fecha_envio ? U.fmt.fechaHora(cot.fecha_envio) : '') + fila('Cerrada', cot.fecha_cierre ? U.fmt.fechaHora(cot.fecha_cierre) : '') +
          fila('Motivo de pérdida', cot.motivo_perdida ? (MOTIVOS.find((x) => x[0] === cot.motivo_perdida) || [0, cot.motivo_perdida])[1] : '') +
          fila('Revisión de', cot.cotizacion_origen_id ? (D.cotizaciones.find((x) => x.Title === cot.cotizacion_origen_id) || {}).numero_visible : '') + '</dl>' +
          (revisiones.length ? '<p class="ic-conteo" style="margin-top:10px">Otras versiones: ' + revisiones.map((r) => '<a href="#cotizaciones/' + esc(r.Title) + '">' + esc(r.numero_visible) + '</a>').join(' · ') + '</p>' : '') +
          (cot.observaciones_internas ? '<p class="ic-conteo" style="margin-top:10px;white-space:pre-line"><b>Notas internas:</b> ' + esc(cot.observaciones_internas) + '</p>' : '') + '</div></div>' +
        '<div class="ic-bloque" style="grid-column:1 / -1"><div class="cab"><h2>Introducción y condiciones (como salen en el PDF)</h2></div><div class="cuerpo">' +
          (cot.titulo_seccion ? '<p><b>' + esc(cot.titulo_seccion) + '</b></p>' : '') + '<p style="white-space:pre-line">' + esc(cot.texto_introduccion || '') + '</p>' +
          conds.map((x) => '<p><b>' + esc(x.titulo) + ':</b> <span style="white-space:pre-line">' + esc(x.texto) + '</span></p>').join('') + '</div></div>' +
      '</div>';
    c.querySelectorAll('[data-acc]').forEach((b) => { b.onclick = () => accion(c, cot, b.dataset.acc, b); });
  }
  const fila = (k, v) => v ? '<dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd>' : '';

  async function accion(c, cot, acc, boton) {
    const recargar = async (msg) => { await cargar(true); await vistaFicha(c, cot.Title); if (msg) U.aviso(msg, 'ok'); };
    const cambiar = async (campos, accionAud, msg) => {
      try { await G.actualizar('COT_Cotizaciones', cot._id, campos, cot._etag); await auditar(cot.Title, accionAud, { estado: cot.estado }, campos); await recargar(msg); }
      catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); }
    };
    if (acc === 'pdf') {
      if (!String(param('SITIO_DOCUMENTAL_URL') || '').trim()) { U.aviso('Falta configurar el sitio documental en Administración › Parámetros.', 'warn', 7000); return; }
      if (!await U.confirmar('Generar el PDF', 'Se genera el PDF y se archiva en SharePoint. Después ya no se puede editar: los cambios se hacen con una revisión. ¿Continuar?', 'Generar PDF')) return;
      await U.conCarga(boton, async () => { try { await emitirPdf(cot); await recargar('PDF generado y archivado'); } catch (e) { U.aviso(U.mensajeError(e), 'err', 10000); } });
    } else if (acc === 'descargar') {
      await U.conCarga(boton, async () => { try { const { doc } = await armarPdf(cot); doc.save(cot.numero_visible + '.pdf'); } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); } });
    } else if (acc === 'enviada') {
      if (await U.confirmar('Marcar como enviada', '¿Ya envió el PDF al cliente?', 'Sí, enviada')) await cambiar({ estado: 'ENVIADA', fecha_envio: new Date().toISOString() }, 'CAMBIO_ESTADO', 'Cotización marcada como enviada');
    } else if (acc === 'negociacion') {
      await cambiar({ estado: 'EN_NEGOCIACION' }, 'CAMBIO_ESTADO', 'En negociación');
    } else if (acc === 'ganada') {
      const e = empresaDe(cot.empresa_id);
      const pasa = e && e.estado_comercial !== 'CLIENTE';
      if (!await U.confirmar('Cotización ganada', '¡Felicitaciones! Se marca ' + cot.numero_visible + ' como ganada.' + (pasa ? ' ' + e.razon_social + ' pasa de prospecto a CLIENTE y recibe su código de cliente.' : ''), 'Marcar ganada')) return;
      try {
        await G.actualizar('COT_Cotizaciones', cot._id, { estado: 'GANADA', fecha_cierre: new Date().toISOString() }, cot._etag);
        await auditar(cot.Title, 'CAMBIO_ESTADO', { estado: cot.estado }, { estado: 'GANADA' });
        if (pasa) {
          let cod = pad(await G.siguiente('CLI'), 4);
          while (App.empresas.datos.empresas.some((x) => x.codigo_cliente === cod)) cod = pad(await G.siguiente('CLI'), 4);   // por si hay códigos creados a mano
          await G.actualizar('MAE_Empresas', e._id, { estado_comercial: 'CLIENTE', codigo_cliente: cod });
          App.admin && App.admin.auditar && await App.admin.auditar('EMPRESA', e.Title, 'CAMBIO_ESTADO', { estado_comercial: 'PROSPECTO' }, { estado_comercial: 'CLIENTE', codigo_cliente: cod, por: cot.numero_visible });
        }
        await recargar('Cotización ganada' + (pasa ? ': ' + e.razon_social + ' ya es cliente' : ''));
      } catch (er) { U.aviso(U.mensajeError(er), 'err', 8000); }
    } else if (acc === 'perdida') {
      U.modal('Cotización perdida', '<form class="ic-form" id="fPer" novalidate><div class="ic-campos">' +
        U.campo({ name: 'motivo', label: 'Motivo', t: 'select', op: MOTIVOS, req: true, c: 'c12' }) + U.campo({ name: 'detalle', label: 'Detalle (opcional)', t: 'textarea', filas: 2, c: 'c12' }) +
        '</div><div class="ic-acciones"><button type="button" class="ic-btn sec" id="bC">Cancelar</button><button class="ic-btn peligro" id="bG">Marcar perdida</button></div></form>', (m) => {
        U.$('#bC', m).onclick = U.cerrarModal;
        U.$('#fPer', m).onsubmit = async (ev) => { ev.preventDefault(); const v = U.leerForm(ev.target); if (!U.marcarErrores(ev.target, v.motivo ? {} : { motivo: 'Elija el motivo' })) return;
          U.cerrarModal();
          await cambiar({ estado: 'PERDIDA', motivo_perdida: v.motivo, fecha_cierre: new Date().toISOString(), observaciones_internas: notas(cot, v.detalle ? 'Perdida: ' + v.detalle : '') }, 'CAMBIO_ESTADO', 'Cotización marcada como perdida'); };
      });
    } else if (acc === 'anular') {
      U.modal('Anular cotización', '<form class="ic-form" id="fAn" novalidate><p style="margin:0 0 10px">La cotización ' + esc(cot.numero_visible) + ' queda anulada y no se puede reactivar. Su número no se vuelve a usar.</p><div class="ic-campos">' +
        U.campo({ name: 'motivo', label: 'Motivo', t: 'textarea', filas: 2, req: true, c: 'c12' }) +
        '</div><div class="ic-acciones"><button type="button" class="ic-btn sec" id="bC">Cancelar</button><button class="ic-btn peligro" id="bG">Anular</button></div></form>', (m) => {
        U.$('#bC', m).onclick = U.cerrarModal;
        U.$('#fAn', m).onsubmit = async (ev) => { ev.preventDefault(); const v = U.leerForm(ev.target); if (!U.marcarErrores(ev.target, v.motivo ? {} : { motivo: 'Escriba el motivo' })) return;
          U.cerrarModal(); await cambiar({ estado: 'ANULADA', fecha_cierre: new Date().toISOString(), observaciones_internas: notas(cot, 'Anulada: ' + v.motivo) }, 'ANULAR', 'Cotización anulada'); };
      });
    } else if (acc === 'revision') {
      if (!await U.confirmar('Nueva revisión', 'Se crea un borrador ' + cot.consecutivo + '-R' + (siguienteRevision(cot)) + ' con las mismas líneas y condiciones, tomando los precios y parámetros vigentes hoy. ' + cot.numero_visible + ' queda como Reemplazada. ¿Continuar?', 'Crear revisión')) return;
      await U.conCarga(boton, async () => { try { const id = await crearRevision(cot); U.aviso('Revisión creada', 'ok'); location.hash = '#cotizaciones/' + id + '/editar'; } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); } });
    }
  }
  const notas = (cot, extra) => [cot.observaciones_internas, extra ? extra + ' (' + App.usuario.iniciales + ', ' + hoy() + ')' : ''].filter(Boolean).join('\n');
  const siguienteRevision = (cot) => D.cotizaciones.filter((x) => x.consecutivo === cot.consecutivo).reduce((mx, x) => Math.max(mx, Number(x.revision || 0)), 0) + 1;

  // Revisión: nueva cotización con el mismo consecutivo; precios y textos vigentes hoy
  async function crearRevision(cot) {
    const [det, conds] = await Promise.all([leerDetalle(cot.Title), leerConds(cot.Title)]);
    const rev = siguienteRevision(cot), id = 'COT-' + pad(await G.siguiente('COT'), 6);
    const campos = {}; ['empresa_id', 'sucursal_id', 'contacto_id', 'cliente_nit', 'cliente_razon_social', 'cliente_ciudad', 'cliente_direccion', 'contacto_nombre', 'contacto_telefono', 'contacto_email',
      'moneda', 'trm_referencia', 'titulo_seccion', 'texto_introduccion'].forEach((k) => { campos[k] = cot[k]; });
    await G.crear('COT_Cotizaciones', Object.assign(campos, { Title: id, consecutivo: cot.consecutivo, revision: rev, numero_visible: cot.consecutivo + '-R' + rev, cotizacion_origen_id: cot.Title,
      comercial_id: cot.comercial_id, fecha: hoy(), fecha_vencimiento: sumarHabiles(hoy(), Number(param('VIGENCIA_DIAS_HABILES') || 10)), estado: 'BORRADOR' }));
    // Líneas con el precio vigente del catálogo (si el producto sigue existiendo y tiene precio)
    let nD = await G.reservar('DET', det.length);
    const tot = { bruto: 0, desc: 0, neto: 0, iva: 0 };
    for (const l of det) {
      const pv = l.producto_id ? App.productos.precioVigente(l.producto_id) : null;
      const pu = pv && Number(pv.valor) > 0 && (pv.moneda || 'COP') === (cot.moneda || 'COP') ? Number(pv.valor) : Number(l.precio_unitario);
      const m = cot.moneda || 'COP', sub = redondear(Number(l.cantidad) * pu, m), dsc = redondear(sub * Number(l.descuento_porcentaje || 0) / 100, m), neto = sub - dsc;
      const iva = l.aplica_iva ? ivaPct() : 0, ivaV = redondear(neto * iva / 100, m);
      tot.bruto += sub; tot.desc += dsc; tot.neto += neto; tot.iva += ivaV;
      await G.crear('COT_Detalle', { Title: 'DET-' + pad(nD++, 6), cotizacion_id: id, linea: l.linea, producto_id: l.producto_id, codigo: l.codigo, descripcion: l.descripcion, ficha_tecnica: l.ficha_tecnica,
        ciudad_sede: l.ciudad_sede, cantidad: l.cantidad, precio_unitario: pu, descuento_porcentaje: l.descuento_porcentaje, descuento_valor: dsc, subtotal_linea: sub, neto_linea: neto,
        aplica_iva: l.aplica_iva, iva_porcentaje: iva, iva_valor: ivaV, total_linea: neto + ivaV });
    }
    await G.actualizar('COT_Cotizaciones', (await G.items('COT_Cotizaciones', { filtro: "fields/Title eq '" + id + "'" }))[0]._id,
      { subtotal_bruto: tot.bruto, descuento_total: tot.desc, subtotal_neto: tot.neto, iva_total: tot.iva, total: tot.bruto - tot.desc + tot.iva });
    let nC = await G.reservar('CCO', conds.length);
    for (const x of conds) await G.crear('COT_CotizacionCondiciones', { Title: 'CCO-' + pad(nC++, 6), cotizacion_id: id, condicion_id: x.condicion_id, tipo: x.tipo, titulo: x.titulo, texto: x.texto, orden: x.orden });
    await G.actualizar('COT_Cotizaciones', cot._id, { estado: 'REEMPLAZADA' });
    await auditar(id, 'REVISION', { origen: cot.numero_visible }, { numero: cot.consecutivo + '-R' + rev });
    await cargar(true);
    return id;   // se abre en edición: al guardar se recalculan totales y se re-resuelven las condiciones con los datos de hoy
  }

  App.cotizaciones = { cargar, datos: D, sumarHabiles };
})();
