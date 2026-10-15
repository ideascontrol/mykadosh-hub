/* =====================================================================
   APP-101 · Comercial — Carga masiva (empresas/contactos y productos/precios)
   Ruta: #carga (solo administradores)
   Lee la plantilla de cada modo (carpeta plantillas/), valida fila por fila,
   muestra qué se crea / actualiza / falla y luego importa a SharePoint.
   ===================================================================== */
(function () {
  const U = IC.ui, G = IC.graph, esc = U.esc;
  const XLSX_CDN = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  const pad = (n, w) => String(n).padStart(w, '0');

  // Encabezado de la plantilla → campo interno
  const COLUMNAS = {
    EMPRESAS: { 'tipo identificacion': 'tipo_id_fiscal', 'nit / numero': 'nit', 'razon social': 'razon_social', 'pais': 'pais', 'ciudad': 'ciudad',
      'direccion': 'direccion', 'telefono': 'telefono', 'celular': 'celular', 'sitio web': 'web', 'tipo': 'estado_comercial', 'relacion': 'tipo_cliente',
      'comercial (iniciales)': 'comercial', 'codigo anterior': 'codigo_cliente_anterior' },
    SEDES: { 'nit empresa': 'nit_empresa', 'nombre sede': 'nombre', 'ciudad': 'ciudad', 'direccion': 'direccion', 'telefonos': 'telefonos' },
    CONTACTOS: { 'nit empresa': 'nit_empresa', 'nombres': 'nombres', 'apellidos': 'apellidos', 'cargo': 'cargo', 'area': 'area', 'celular': 'celular',
      'telefono': 'telefono', 'extension': 'extension', 'correo': 'email', 'sede': 'sede', 'autoriza datos': 'autoriza_datos', 'cumpleanos': 'cumpleanos' },
    PRODUCTOS: { 'codigo': 'codigo', 'codigo anterior': 'codigo_anterior', 'nombre': 'nombre', 'tipo': 'tipo', 'categoria': 'categoria',
      'descripcion corta': 'descripcion_corta', 'ficha tecnica': 'ficha_tecnica', 'unidad': 'unidad', 'maneja inventario': 'maneja_inventario',
      'aplica iva': 'aplica_iva', 'garantia (meses)': 'garantia_meses', 'descripcion editable': 'descripcion_editable', 'stock minimo': 'stock_minimo',
      'precio de venta': 'precio', 'moneda': 'moneda', 'vigente desde': 'vigente_desde' },
    COMPRAS: { 'codigo producto': 'codigo', 'distribuidor': 'distribuidor', 'nit distribuidor': 'nit_distribuidor', 'precio unitario de compra': 'precio', 'moneda': 'moneda', 'fecha de compra': 'fecha_compra' },
    INVENTARIO: { 'codigo producto': 'codigo', 'fecha de corte': 'fecha_corte', 'cantidad': 'cantidad', 'observaciones': 'observaciones' }
  };
  const FECHAS = ['cumpleanos', 'vigente_desde', 'fecha_compra', 'fecha_corte'];
  const ENCABEZADOS = {
    EMPRESAS: ['Tipo identificación', 'NIT / Número', 'Razón social', 'País', 'Ciudad', 'Dirección', 'Teléfono', 'Celular', 'Sitio web', 'Tipo', 'Relación', 'Comercial (iniciales)', 'Código anterior'],
    SEDES: ['NIT empresa', 'Nombre sede', 'Ciudad', 'Dirección', 'Teléfonos'],
    CONTACTOS: ['NIT empresa', 'Nombres', 'Apellidos', 'Cargo', 'Área', 'Celular', 'Teléfono', 'Extensión', 'Correo', 'Sede', 'Autoriza datos', 'Cumpleaños'],
    PRODUCTOS: ['Código', 'Código anterior', 'Nombre', 'Tipo', 'Categoría', 'Descripción corta', 'Ficha técnica', 'Unidad', 'Maneja inventario', 'Aplica IVA', 'Garantía (meses)', 'Descripción editable', 'Stock mínimo', 'Precio de venta', 'Moneda', 'Vigente desde'],
    COMPRAS: ['Código producto', 'Distribuidor', 'NIT distribuidor', 'Precio unitario de compra', 'Moneda', 'Fecha de compra'],
    INVENTARIO: ['Código producto', 'Fecha de corte', 'Cantidad', 'Observaciones']
  };
  const OBLIGATORIAS = {
    EMPRESAS: ['tipo_id_fiscal', 'nit', 'razon_social', 'ciudad', 'telefono', 'estado_comercial', 'tipo_cliente', 'comercial'],
    SEDES: ['nit_empresa', 'nombre', 'ciudad'],
    CONTACTOS: ['nit_empresa', 'nombres', 'apellidos', 'autoriza_datos'],
    PRODUCTOS: ['codigo', 'nombre', 'tipo', 'descripcion_corta', 'unidad', 'maneja_inventario', 'aplica_iva', 'descripcion_editable', 'precio', 'moneda'],
    COMPRAS: ['codigo', 'distribuidor', 'precio', 'moneda', 'fecha_compra'],
    INVENTARIO: ['codigo', 'fecha_corte', 'cantidad']
  };
  const NOMBRE_CAMPO = { tipo_id_fiscal: 'Tipo identificación', nit: 'NIT', razon_social: 'Razón social', ciudad: 'Ciudad', telefono: 'Teléfono',
    estado_comercial: 'Tipo', tipo_cliente: 'Relación', comercial: 'Comercial', nit_empresa: 'NIT empresa', nombre: 'Nombre sede', nombres: 'Nombres',
    apellidos: 'Apellidos', autoriza_datos: 'Autoriza datos', email: 'Correo', cumpleanos: 'Cumpleaños', sede: 'Sede', pais: 'País',
    codigo: 'Código', descripcion_corta: 'Descripción corta', unidad: 'Unidad', maneja_inventario: 'Maneja inventario', aplica_iva: 'Aplica IVA',
    descripcion_editable: 'Descripción editable', precio: 'Precio', moneda: 'Moneda', distribuidor: 'Distribuidor', fecha_compra: 'Fecha de compra',
    fecha_corte: 'Fecha de corte', cantidad: 'Cantidad', ficha_tecnica: 'Ficha técnica', garantia_meses: 'Garantía', stock_minimo: 'Stock mínimo',
    categoria: 'Categoría', codigo_anterior: 'Código anterior', vigente_desde: 'Vigente desde', tipo: 'Tipo', web: 'Sitio web', direccion: 'Dirección',
    celular: 'Celular', comercial_asignado: 'Comercial', codigo_cliente_anterior: 'Código anterior', cargo: 'Cargo', area: 'Área', extension: 'Extensión', telefonos: 'Teléfonos' };
  const EJEMPLOS = ['900123456', '901234567'];

  let estado = null;   // { archivo, filas: {HOJA:[]}, resumen }
  let modo = 'empresas';

  // ---------- Carga perezosa de la librería de Excel ----------
  function cargarXLSX() {
    if (window.XLSX) return Promise.resolve();
    return new Promise((ok, mal) => {
      const s = document.createElement('script'); s.src = XLSX_CDN; s.onload = ok;
      s.onerror = () => mal(new Error('No se pudo cargar el lector de Excel. Revise su conexión.'));
      document.head.appendChild(s);
    });
  }

  // =====================================================================
  // VISTA
  // =====================================================================
  App.vistas['carga'] = function (c) {
    if (!App.usuario.es_admin) {
      c.innerHTML = '<a class="ic-volver" href="#">← Menú principal</a><div class="ic-form">La carga masiva es solo para administradores.</div>';
      return;
    }
    estado = null;
    const M = MODOS[modo];
    c.innerHTML =
      '<a class="ic-volver" href="#">← Menú principal</a>' +
      '<h1 class="ic-titulo">Carga masiva</h1><p class="ic-subtitulo">Cargue información desde Excel. Nada se guarda hasta que usted confirme.</p>' +
      '<div class="ic-chips" id="modos" style="margin-bottom:14px">' + Object.keys(MODOS).map((k) => '<button data-m="' + k + '" class="' + (k === modo ? 'activo' : '') + '">' + MODOS[k].titulo + '</button>').join('') + '</div>' +
      '<div class="ic-pasos">' +
        paso(1, 'Descargue la plantilla', M.instruccion,
          '<a class="ic-btn sec" href="' + M.plantilla + '" download>⬇ Descargar plantilla</a>') +
        paso(2, 'Suba el archivo diligenciado', 'La app lo lee y valida cada fila. Todavía no se guarda nada.',
          '<label class="ic-btn" for="fArchivo">Seleccionar archivo .xlsx</label><input type="file" id="fArchivo" accept=".xlsx" hidden><span id="nombreArchivo" class="ic-conteo" style="margin:0 0 0 10px"></span>') +
        paso(3, 'Revise y confirme', 'Verde: se crea · Amarillo: se actualiza · Gris: sin cambios · Rojo: error (no se carga).', '<div id="zonaConfirmar"></div>') +
      '</div>' +
      '<div id="zonaResultado"></div>';
    U.$('#fArchivo', c).onchange = (e) => { const f = e.target.files[0]; if (f) leerArchivo(c, f); e.target.value = ''; };
    U.$('#modos', c).querySelectorAll('button').forEach((b) => { b.onclick = () => { modo = b.dataset.m; App.vistas['carga'](c); }; });
  };
  function paso(n, titulo, texto, extra) {
    return '<div class="ic-paso"><div class="num">' + n + '</div><div class="txt"><h3>' + titulo + '</h3><p>' + texto + '</p><div>' + extra + '</div></div></div>';
  }

  // =====================================================================
  // LECTURA Y VALIDACIÓN
  // =====================================================================
  async function leerArchivo(c, archivo) {
    const zona = U.$('#zonaResultado', c);
    U.$('#nombreArchivo', c).textContent = archivo.name;
    U.$('#zonaConfirmar', c).innerHTML = '';
    zona.innerHTML = '<div class="ic-form" style="text-align:center"><div class="ic-spinner"></div>Leyendo y validando el archivo…</div>';
    try {
      if (archivo.size > 4 * 1024 * 1024) throw new Error('El archivo pesa más de 4 MB. Divídalo en varios archivos.');
      await cargarXLSX();
      const wb = XLSX.read(await archivo.arrayBuffer(), { type: 'array', cellDates: true });
      const M = MODOS[modo];
      const faltan = M.hojas.filter((h) => !wb.Sheets[h]);
      if (faltan.length) throw new Error('El archivo no tiene la(s) hoja(s): ' + faltan.join(', ') + '. ¿Seleccionó la plantilla correcta? Esta opción es "' + M.titulo + '".');
      const crudo = {};
      for (const h of M.hojas) crudo[h] = leerHoja(wb.Sheets[h], h);
      await M.preparar();
      estado = { archivo, filas: M.validar(crudo) };
      pintarResultado(c);
    } catch (e) {
      console.error(e);
      zona.innerHTML = '<div class="ic-form" style="border-left:4px solid var(--ic-err)"><b>No se pudo leer el archivo.</b><p style="margin:6px 0 0">' + esc(U.mensajeError(e)) + '</p></div>';
    }
  }

  function texto(v) {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(v);
    return String(v).split(/\r?\n/).map((l) => l.replace(/[ \t]+/g, ' ').trim()).filter(Boolean).join('\n');
  }
  function fecha(v) {
    if (!v) return '';
    if (v instanceof Date) { const d = new Date(v.getTime() - v.getTimezoneOffset() * 60000); return d.toISOString().slice(0, 10); }
    const s = String(v).trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); if (m) return m[1] + '-' + pad(m[2], 2) + '-' + pad(m[3], 2);
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (m) return m[3] + '-' + pad(m[2], 2) + '-' + pad(m[1], 2);
    return 'INVALIDA';
  }

  // Convierte una hoja en objetos usando los encabezados de la fila 1
  function leerHoja(ws, hoja) {
    const filas = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
    if (!filas.length) return { filas: [], faltan: Object.values(COLUMNAS[hoja]) };
    const enc = filas[0].map((h) => U.norm(String(h || '').replace(/\*/g, '')).trim());
    const mapa = {}; enc.forEach((h, i) => { if (COLUMNAS[hoja][h]) mapa[i] = COLUMNAS[hoja][h]; });
    const presentes = Object.values(mapa);
    const faltan = OBLIGATORIAS[hoja].filter((k) => presentes.indexOf(k) < 0);
    const out = [];
    for (let r = 1; r < filas.length; r++) {
      const fila = filas[r] || [];
      if (fila.every((v) => v === null || String(v).trim() === '')) continue;
      const o = { _fila: r + 1 };
      Object.keys(mapa).forEach((i) => { o[mapa[i]] = FECHAS.indexOf(mapa[i]) >= 0 ? fecha(fila[i]) : texto(fila[i]); });
      out.push(o);
    }
    return { filas: out, faltan };
  }

  function validarEmpresas(crudo) {
    const D = App.empresas.datos;
    const usuarios = (App.usuarios || []).filter((u) => u.estado === 'ACTIVO');
    const res = { EMPRESAS: [], SEDES: [], CONTACTOS: [] };
    const err = (o, msg) => { o._errores.push(msg); };
    Object.keys(crudo).forEach((h) => { if (crudo[h].faltan.length) res[h + '_faltan'] = crudo[h].faltan.map((k) => NOMBRE_CAMPO[k] || k); });

    // ---------- EMPRESAS ----------
    const nitsArchivo = {};
    crudo.EMPRESAS.filas.forEach((o) => {
      o._errores = []; o._cambios = [];
      o.nit = String(o.nit || '').replace(/[.\s]/g, '');
      if (o.tipo_id_fiscal === 'NIT' || !o.tipo_id_fiscal) o.nit = o.nit.replace(/-\d$/, '').replace(/\D/g, '');
      o.tipo_id_fiscal = (o.tipo_id_fiscal || 'NIT').toUpperCase();
      o.pais = o.pais || 'Colombia';
      o.estado_comercial = String(o.estado_comercial || '').toUpperCase();
      o.tipo_cliente = String(o.tipo_cliente || '').toUpperCase();
      if (EJEMPLOS.indexOf(o.nit) >= 0) { err(o, 'Es una fila de ejemplo de la plantilla: bórrela'); o._accion = 'ERROR'; res.EMPRESAS.push(o); return; }
      OBLIGATORIAS.EMPRESAS.forEach((k) => { if (!o[k]) err(o, 'Falta ' + NOMBRE_CAMPO[k]); });
      if (['NIT', 'RUC', 'RFC', 'TAX ID', 'OTRO'].indexOf(o.tipo_id_fiscal) < 0) err(o, 'Tipo identificación no válido');
      if (o.tipo_id_fiscal === 'NIT' && o.nit && !/^\d{5,12}$/.test(o.nit)) err(o, 'NIT debe tener 5 a 12 dígitos sin DV');
      if (o.estado_comercial && ['PROSPECTO', 'CLIENTE'].indexOf(o.estado_comercial) < 0) err(o, 'Tipo debe ser PROSPECTO o CLIENTE');
      if (o.tipo_cliente && ['NUEVO', 'RECURRENTE'].indexOf(o.tipo_cliente) < 0) err(o, 'Relación debe ser NUEVO o RECURRENTE');
      if (o.comercial) {
        const u = usuarios.find((x) => String(x.iniciales).toUpperCase() === o.comercial.toUpperCase());
        if (!u) err(o, 'No hay un usuario activo con iniciales ' + o.comercial); else o._comercial_id = u.Title;
      }
      if (o.nit) {
        if (nitsArchivo[o.nit]) err(o, 'NIT repetido en el archivo (fila ' + nitsArchivo[o.nit] + ')'); else nitsArchivo[o.nit] = o._fila;
      }
      o.dv = o.tipo_id_fiscal === 'NIT' && o.nit ? App.empresas.calcularDV(o.nit) : '';
      const ex = D.empresas.find((e) => String(e.nit) === o.nit && e.tipo_id_fiscal === o.tipo_id_fiscal);
      if (ex) {
        o._existente = ex;
        const comp = { razon_social: o.razon_social, pais: o.pais, ciudad: o.ciudad, direccion: o.direccion, telefono: o.telefono, celular: o.celular, web: o.web,
          estado_comercial: o.estado_comercial, tipo_cliente: o.tipo_cliente, comercial_asignado: o._comercial_id, codigo_cliente_anterior: o.codigo_cliente_anterior };
        if (ex.estado_comercial === 'CLIENTE' && o.estado_comercial === 'PROSPECTO') { delete comp.estado_comercial; o._avisos = ['Ya es CLIENTE: no se devuelve a PROSPECTO']; }
        Object.keys(comp).forEach((k) => { if (comp[k] && String(comp[k]) !== String(ex[k] || '')) o._cambios.push(k); });
        o._accion = o._errores.length ? 'ERROR' : (o._cambios.length ? 'ACTUALIZAR' : 'SIN_CAMBIOS');
      } else o._accion = o._errores.length ? 'ERROR' : 'CREAR';
      res.EMPRESAS.push(o);
    });
    const empresaValida = (nit) => res.EMPRESAS.some((o) => o.nit === nit && o._accion !== 'ERROR') || D.empresas.some((e) => String(e.nit) === nit);
    const empresaSP = (nit) => D.empresas.find((e) => String(e.nit) === nit);

    // ---------- SEDES ----------
    const sedesArchivo = {};
    crudo.SEDES.filas.forEach((o) => {
      o._errores = []; o._cambios = [];
      o.nit_empresa = String(o.nit_empresa || '').replace(/\D/g, '');
      if (EJEMPLOS.indexOf(o.nit_empresa) >= 0) { err(o, 'Es una fila de ejemplo de la plantilla: bórrela'); o._accion = 'ERROR'; res.SEDES.push(o); return; }
      OBLIGATORIAS.SEDES.forEach((k) => { if (!o[k]) err(o, 'Falta ' + NOMBRE_CAMPO[k]); });
      if (o.nit_empresa && !empresaValida(o.nit_empresa)) err(o, 'La empresa con NIT ' + o.nit_empresa + ' no existe ni se crea en este archivo (o tiene errores)');
      const clave = o.nit_empresa + '|' + U.norm(o.nombre);
      if (o.nombre) { if (sedesArchivo[clave]) err(o, 'Sede repetida en el archivo (fila ' + sedesArchivo[clave] + ')'); else sedesArchivo[clave] = o._fila; }
      const emp = empresaSP(o.nit_empresa);
      const ex = emp && D.sucursales.find((s) => s.empresa_id === emp.Title && U.norm(s.nombre) === U.norm(o.nombre));
      if (ex) {
        o._existente = ex;
        ['ciudad', 'direccion', 'telefonos'].forEach((k) => { if (o[k] && String(o[k]) !== String(ex[k] || '')) o._cambios.push(k); });
        o._accion = o._errores.length ? 'ERROR' : (o._cambios.length ? 'ACTUALIZAR' : 'SIN_CAMBIOS');
      } else o._accion = o._errores.length ? 'ERROR' : 'CREAR';
      res.SEDES.push(o);
    });

    // ---------- CONTACTOS ----------
    const correosArchivo = {};
    crudo.CONTACTOS.filas.forEach((o) => {
      o._errores = []; o._cambios = [];
      o.nit_empresa = String(o.nit_empresa || '').replace(/\D/g, '');
      o.email = String(o.email || '').toLowerCase();
      o.autoriza_datos = String(o.autoriza_datos || '').toUpperCase();
      if (EJEMPLOS.indexOf(o.nit_empresa) >= 0) { err(o, 'Es una fila de ejemplo de la plantilla: bórrela'); o._accion = 'ERROR'; res.CONTACTOS.push(o); return; }
      OBLIGATORIAS.CONTACTOS.forEach((k) => { if (!o[k]) err(o, 'Falta ' + NOMBRE_CAMPO[k]); });
      if (o.nit_empresa && !empresaValida(o.nit_empresa)) err(o, 'La empresa con NIT ' + o.nit_empresa + ' no existe ni se crea en este archivo (o tiene errores)');
      if (o.autoriza_datos && ['SI', 'NO'].indexOf(o.autoriza_datos) < 0) err(o, 'Autoriza datos debe ser SI o NO');
      if (!o.celular && !o.telefono && !o.email) err(o, 'Registre al menos celular, teléfono o correo');
      if (o.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.email)) err(o, 'Correo no válido');
      if (o.cumpleanos === 'INVALIDA') err(o, 'Cumpleaños no es una fecha válida (AAAA-MM-DD)');
      if (o.cumpleanos && o.cumpleanos !== 'INVALIDA' && o.autoriza_datos !== 'SI') err(o, 'Cumpleaños requiere Autoriza datos = SI');
      if (o.email) { if (correosArchivo[o.email]) err(o, 'Correo repetido en el archivo (fila ' + correosArchivo[o.email] + ')'); else correosArchivo[o.email] = o._fila; }
      if (o.sede) {
        const enArchivo = res.SEDES.some((s) => s.nit_empresa === o.nit_empresa && U.norm(s.nombre) === U.norm(o.sede) && s._accion !== 'ERROR');
        const emp = empresaSP(o.nit_empresa);
        const enSP = emp && D.sucursales.some((s) => s.empresa_id === emp.Title && U.norm(s.nombre) === U.norm(o.sede));
        if (!enArchivo && !enSP) err(o, 'La sede "' + o.sede + '" no existe para esa empresa');
      }
      // Contacto existente: mismo correo, o misma empresa + nombres + apellidos
      const emp = empresaSP(o.nit_empresa);
      let ex = o.email && D.contactos.find((x) => String(x.email || '').toLowerCase() === o.email);
      if (ex && emp && ex.empresa_id !== emp.Title) { err(o, 'El correo ya pertenece a un contacto de otra empresa'); ex = null; }
      if (!ex && emp) ex = D.contactos.find((x) => x.empresa_id === emp.Title && U.norm(x.nombres) === U.norm(o.nombres) && U.norm(x.apellidos) === U.norm(o.apellidos));
      if (ex) {
        o._existente = ex;
        ['cargo', 'area', 'celular', 'telefono', 'extension', 'email'].forEach((k) => { if (o[k] && String(o[k]) !== String(ex[k] || '')) o._cambios.push(k); });
        if (o.autoriza_datos && (o.autoriza_datos === 'SI') !== !!ex.autoriza_datos) o._cambios.push('autoriza_datos');
        if (o.cumpleanos && o.cumpleanos !== String(ex.cumpleanos || '').slice(0, 10)) o._cambios.push('cumpleanos');
        if (o.sede) o._cambios.push('sede');
        o._accion = o._errores.length ? 'ERROR' : (o._cambios.length ? 'ACTUALIZAR' : 'SIN_CAMBIOS');
      } else o._accion = o._errores.length ? 'ERROR' : 'CREAR';
      res.CONTACTOS.push(o);
    });
    return res;
  }

  // =====================================================================
  // RESULTADO DE LA VALIDACIÓN
  // =====================================================================
  const ETQ = { CREAR: ['Se crea', 'ok'], ACTUALIZAR: ['Se actualiza', 'act'], SIN_CAMBIOS: ['Sin cambios', 'igual'], ERROR: ['Error', 'error'] };
  const contar = (lista, a) => lista.filter((o) => o._accion === a).length;

  function pintarResultado(c) {
    const F = estado.filas, zona = U.$('#zonaResultado', c);
    const H = MODOS[modo].hojas;
    const faltan = H.filter((h) => F[h + '_faltan']);
    const total = (a) => H.reduce((s, h) => s + contar(F[h], a), 0);
    const aplicables = total('CREAR') + total('ACTUALIZAR');
    let html = '';
    if (faltan.length) html += '<div class="ic-form" style="border-left:4px solid var(--ic-err);margin-bottom:14px"><b>Faltan columnas obligatorias</b>' +
      faltan.map((h) => '<p style="margin:6px 0 0">Hoja ' + h + ': ' + esc(F[h + '_faltan'].join(', ')) + '</p>').join('') + '<p style="margin:6px 0 0">Use la plantilla oficial sin modificar los encabezados.</p></div>';
    html += '<div class="ic-kpis" style="margin-bottom:14px">' +
      kpi(total('CREAR'), 'Se crean', 'var(--ic-ok)') + kpi(total('ACTUALIZAR'), 'Se actualizan', 'var(--ic-warn)') +
      kpi(total('SIN_CAMBIOS'), 'Sin cambios', 'var(--ic-gris)') + kpi(total('ERROR'), 'Con error', 'var(--ic-err)') + '</div>';
    html += '<div class="ic-chips" id="tabs" style="margin-bottom:10px">' + H.map((h, i) =>
      '<button data-h="' + h + '" class="' + (i === 0 ? 'activo' : '') + '">' + h.charAt(0) + h.slice(1).toLowerCase() + ' (' + F[h].length + ')</button>').join('') + '</div>' +
      '<div class="ic-tabla-caja" id="tablaRes"></div>';
    zona.innerHTML = html;
    U.$('#tabs', c).querySelectorAll('button').forEach((b) => { b.onclick = () => { U.$('#tabs', c).querySelectorAll('button').forEach((x) => x.classList.toggle('activo', x === b)); pintarHoja(c, b.dataset.h); }; });
    pintarHoja(c, H[0]);

    const zc = U.$('#zonaConfirmar', c);
    zc.innerHTML = (faltan.length || !aplicables)
      ? '<span class="ic-conteo" style="margin:0">' + (faltan.length ? 'Corrija las columnas faltantes y vuelva a subir el archivo.' : 'No hay filas para cargar.') + '</span>'
      : '<button class="ic-btn" id="btnImportar">Importar ' + aplicables + ' registro(s)</button>' +
        (total('ERROR') ? ' <button class="ic-btn sec" id="btnErrores">⬇ Descargar filas con error</button><span class="ic-conteo" style="margin:0 0 0 10px">Las filas con error no se cargan.</span>' : '');
    if (total('ERROR') && !U.$('#btnErrores', c) && !faltan.length) zc.innerHTML += ' <button class="ic-btn sec" id="btnErrores">⬇ Descargar filas con error</button>';
    const bi = U.$('#btnImportar', c); if (bi) bi.onclick = () => importar(c);
    const be = U.$('#btnErrores', c); if (be) be.onclick = descargarErrores;
  }
  function kpi(n, t, color) { return '<div class="ic-kpi"><div class="valor" style="color:' + color + '">' + n + '</div><div class="etiqueta">' + t + '</div></div>'; }

  function pintarHoja(c, h) {
    const filas = estado.filas[h];
    const ident = (o) => MODOS[modo].ident ? MODOS[modo].ident(h, o) : h === 'EMPRESAS' ? '<b>' + esc(o.razon_social) + '</b><span class="sec">' + esc(o.tipo_id_fiscal) + ' ' + esc(o.nit) + (o.dv ? '-' + o.dv : '') + '</span>'
      : h === 'SEDES' ? '<b>' + esc(o.nombre) + '</b><span class="sec">NIT ' + esc(o.nit_empresa) + ' · ' + esc(o.ciudad) + '</span>'
      : '<b>' + esc((o.nombres || '') + ' ' + (o.apellidos || '')) + '</b><span class="sec">NIT ' + esc(o.nit_empresa) + (o.email ? ' · ' + esc(o.email) : '') + '</span>';
    const detalle = (o) => o._errores.length ? '<span style="color:var(--ic-err)">' + o._errores.map(esc).join('<br>') + '</span>'
      : o._accion === 'ACTUALIZAR' ? 'Cambia: ' + esc(o._cambios.map((k) => NOMBRE_CAMPO[k] || k.replace(/_/g, ' ')).join(', ')) + (o._existente ? '<span class="sec">' + esc(o._existente.Title) + '</span>' : '')
      : o._accion === 'SIN_CAMBIOS' ? 'Ya existe con los mismos datos' + (o._existente ? '<span class="sec">' + esc(o._existente.Title) + '</span>' : '')
      : 'Registro nuevo';
    U.$('#tablaRes', c).innerHTML = !filas.length ? '<div class="ic-vacio">La hoja ' + h + ' no tiene filas.</div>' :
      '<table class="ic-tabla"><thead><tr><th style="width:60px">Fila</th><th style="width:130px">Resultado</th><th>Registro</th><th>Detalle</th></tr></thead><tbody>' +
      filas.map((o) => '<tr style="cursor:default"><td>' + o._fila + '</td><td><span class="ic-res ' + ETQ[o._accion][1] + '">' + ETQ[o._accion][0] + '</span>' +
        (o._avisos ? '<span class="sec" style="color:var(--ic-warn)">' + o._avisos.map(esc).join('<br>') + '</span>' : '') + '</td><td>' + ident(o) + '</td><td>' + detalle(o) + '</td></tr>').join('') +
      '</tbody></table>';
  }

  function descargarErrores() {
    const wb = XLSX.utils.book_new();
    MODOS[modo].hojas.forEach((h) => {
      const enc = Object.keys(COLUMNAS[h]);
      const nombres = ENCABEZADOS[h];
      const filas = estado.filas[h].filter((o) => o._accion === 'ERROR').map((o) => enc.map((k) => o[COLUMNAS[h][k]] || '').concat([o._fila, o._errores.join(' | ')]));
      const ws = XLSX.utils.aoa_to_sheet([nombres.concat(['Fila original', 'Error'])].concat(filas));
      XLSX.utils.book_append_sheet(wb, ws, h);
    });
    XLSX.writeFile(wb, 'Errores_' + estado.archivo.name.replace(/\.xlsx$/i, '') + '.xlsx');
  }

  // =====================================================================
  // IMPORTACIÓN
  // =====================================================================
  async function enParalelo(tareas, n, alAvanzar) {
    let i = 0; const errores = [];
    async function trabajador() {
      while (i < tareas.length) {
        const t = tareas[i++];
        try { await t(); } catch (e) { errores.push(e); console.error(e); }
        alAvanzar();
      }
    }
    await Promise.all(Array.from({ length: Math.min(n, tareas.length) }, trabajador));
    return errores;
  }

  async function importarEmpresas(F, ctx) {
    const { sel, avanzar, resumen, falla } = ctx;
    const E = sel('EMPRESAS'), S = sel('SEDES'), C = sel('CONTACTOS');
      // ---- Empresas ----
    const nuevasE = E.filter((o) => o._accion === 'CREAR');
    const clientesNuevos = E.filter((o) => o.estado_comercial === 'CLIENTE' && !(o._existente && o._existente.codigo_cliente));
    let nE = await G.reservar('EMP', nuevasE.length), nCli = await G.reservar('CLI', clientesNuevos.length);
    const idEmp = {}; App.empresas.datos.empresas.forEach((e) => { idEmp[String(e.nit)] = e.Title; });
    const tareasE = E.map((o) => async () => {
      const campos = { tipo_id_fiscal: o.tipo_id_fiscal, nit: o.nit, dv: o.dv, razon_social: o.razon_social, pais: o.pais, ciudad: o.ciudad,
        direccion: o.direccion, telefono: o.telefono, celular: o.celular, web: o.web, estado_comercial: o.estado_comercial, tipo_cliente: o.tipo_cliente,
        comercial_asignado: o._comercial_id, codigo_cliente_anterior: o.codigo_cliente_anterior };
      if (o._existente && o._existente.estado_comercial === 'CLIENTE') delete campos.estado_comercial;
      if (clientesNuevos.indexOf(o) >= 0) campos.codigo_cliente = pad(nCli++, 4);
      try {
        if (o._accion === 'CREAR') {
          const id = 'EMP-' + pad(nE++, 6);
          await G.crear('MAE_Empresas', Object.assign({ Title: id, estado: 'ACTIVO' }, campos));
          idEmp[o.nit] = id; resumen.creados++;
        } else {
          Object.keys(campos).forEach((k) => { if (campos[k] === '' || campos[k] === undefined) delete campos[k]; });   // celdas vacías no borran
          await G.actualizar('MAE_Empresas', o._existente._id, campos); resumen.actualizados++;
        }
      } catch (e) { falla('EMPRESAS', o, e); }
    });
    await enParalelo(tareasE, 4, avanzar('Empresas'));
    await App.empresas.cargar(true);
    App.empresas.datos.empresas.forEach((e) => { idEmp[String(e.nit)] = e.Title; });
    const empPorId = {}; App.empresas.datos.empresas.forEach((e) => { empPorId[e.Title] = e; });

    // ---- Sedes ---- (códigos NIT-NNN consecutivos por empresa)
    const nuevasS = S.filter((o) => o._accion === 'CREAR' && idEmp[o.nit_empresa]);
    let nS = await G.reservar('SUC', nuevasS.length);
    const maxSede = {};
    App.empresas.datos.sucursales.forEach((s) => { const m = String(s.codigo_sucursal || '').match(/-(\d{3})$/); if (m) maxSede[s.empresa_id] = Math.max(maxSede[s.empresa_id] || 0, Number(m[1])); });
    const tareasS = S.map((o) => async () => {
      const empId = idEmp[o.nit_empresa];
      try {
        if (!empId) throw new Error('La empresa no quedó creada');
        const campos = { nombre: o.nombre, ciudad: o.ciudad, direccion: o.direccion, telefonos: o.telefonos };
        if (o._accion === 'CREAR') {
          maxSede[empId] = (maxSede[empId] || 0) + 1;
          await G.crear('MAE_Sucursales', Object.assign({ Title: 'SUC-' + pad(nS++, 6), empresa_id: empId, codigo_sucursal: o.nit_empresa + '-' + pad(maxSede[empId], 3), estado: 'ACTIVO' }, campos));
          resumen.creados++;
        } else {
          Object.keys(campos).forEach((k) => { if (!campos[k]) delete campos[k]; });
          await G.actualizar('MAE_Sucursales', o._existente._id, campos); resumen.actualizados++;
        }
      } catch (e) { falla('SEDES', o, e); }
    });
    await enParalelo(tareasS, 1, avanzar('Sedes'));   // secuencial: los códigos por empresa dependen del orden
    await App.empresas.cargar(true);

    // ---- Contactos ----
    const nuevosC = C.filter((o) => o._accion === 'CREAR');
    let nC = await G.reservar('CON', nuevosC.length);
    const tareasC = C.map((o) => async () => {
      const empId = idEmp[o.nit_empresa];
      try {
        if (!empId) throw new Error('La empresa no quedó creada');
        const sede = o.sede ? App.empresas.datos.sucursales.find((s) => s.empresa_id === empId && U.norm(s.nombre) === U.norm(o.sede)) : null;
        const campos = { nombres: o.nombres, apellidos: o.apellidos, cargo: o.cargo, area: o.area, celular: o.celular, telefono: o.telefono,
          extension: o.extension, email: o.email, autoriza_datos: o.autoriza_datos === 'SI', cumpleanos: o.cumpleanos };
        if (sede) campos.sucursal_id = sede.Title;
        if (o._accion === 'CREAR') {
          await G.crear('MAE_Contactos', Object.assign({ Title: 'CON-' + pad(nC++, 6), empresa_id: empId, estado: 'ACTIVO' }, campos));
          resumen.creados++;
        } else {
          Object.keys(campos).forEach((k) => { if (campos[k] === '' || campos[k] === undefined) delete campos[k]; });
          if (!o.autoriza_datos) delete campos.autoriza_datos;
          await G.actualizar('MAE_Contactos', o._existente._id, campos); resumen.actualizados++;
        }
      } catch (e) { falla('CONTACTOS', o, e); }
    });
    await enParalelo(tareasC, 4, avanzar('Contactos'));
    await App.empresas.cargar(true);

  }

  // =====================================================================
  // PRODUCTOS · PRECIOS · COMPRAS · INVENTARIO
  // =====================================================================
  const TIPOS_PRD = ['EQUIPO', 'ACCESORIO', 'LICENCIA', 'SERVICIO', 'VIATICOS'];
  const UNIDADES_PRD = ['UND', 'SERVICIO', 'DIA', 'LICENCIA', 'PAQUETE'];
  const SIN_INV = ['LICENCIA', 'SERVICIO', 'VIATICOS'];
  const NIT_EJEMPLO_DIS = ['900000001'];
  const numero = (v) => { const s = String(v === undefined || v === null ? '' : v).trim().replace(/\s/g, ''); if (s === '') return null;
    const n = Number(s.indexOf(',') >= 0 && s.indexOf('.') < 0 ? s.replace(',', '.') : s.replace(/,/g, '')); return isNaN(n) ? NaN : n; };
  const sf = (v) => (v ? String(v).slice(0, 10) : '');

  function validarProductos(crudo) {
    const P = App.productos, D = P.datos;
    const res = { PRODUCTOS: [], COMPRAS: [], INVENTARIO: [] };
    const err = (o, msg) => { o._errores.push(msg); };
    const aviso = (o, msg) => { (o._avisos = o._avisos || []).push(msg); };
    Object.keys(crudo).forEach((h) => { if (crudo[h].faltan.length) res[h + '_faltan'] = crudo[h].faltan.map((k) => NOMBRE_CAMPO[k] || k); });
    const prdSP = (cod) => D.productos.find((x) => P.normCodigo(x.codigo) === cod);

    // ---------- PRODUCTOS ----------
    const codArchivo = {};
    crudo.PRODUCTOS.filas.forEach((o) => {
      o._errores = []; o._cambios = [];
      o.codigo = P.normCodigo(o.codigo);
      ['tipo', 'unidad', 'moneda', 'maneja_inventario', 'aplica_iva', 'descripcion_editable'].forEach((k) => { o[k] = String(o[k] || '').toUpperCase().trim(); });
      if (!o.moneda) o.moneda = 'COP';
      OBLIGATORIAS.PRODUCTOS.forEach((k) => { if (o[k] === '' || o[k] === undefined) err(o, 'Falta ' + (k === 'nombre' ? 'Nombre' : NOMBRE_CAMPO[k])); });
      if (o.tipo && TIPOS_PRD.indexOf(o.tipo) < 0) err(o, 'Tipo debe ser: ' + TIPOS_PRD.join(', '));
      if (o.unidad && UNIDADES_PRD.indexOf(o.unidad) < 0) err(o, 'Unidad debe ser: ' + UNIDADES_PRD.join(', '));
      if (['COP', 'USD'].indexOf(o.moneda) < 0) err(o, 'Moneda debe ser COP o USD');
      ['maneja_inventario', 'aplica_iva', 'descripcion_editable'].forEach((k) => { if (o[k] && ['SI', 'NO'].indexOf(o[k]) < 0) err(o, NOMBRE_CAMPO[k] + ' debe ser SI o NO'); });
      if (SIN_INV.indexOf(o.tipo) >= 0 && o.maneja_inventario === 'SI') { o.maneja_inventario = 'NO'; aviso(o, 'Tipo ' + o.tipo + ' no maneja inventario: se guarda como NO'); }
      if (o.precio !== '' && o.precio !== undefined) { o._precio = numero(o.precio); if (isNaN(o._precio) || o._precio < 0) err(o, 'Precio de venta no válido (solo números, sin $ ni puntos de miles)'); }
      ['garantia_meses', 'stock_minimo'].forEach((k) => { if (o[k] && !/^\d+$/.test(String(o[k]))) err(o, NOMBRE_CAMPO[k] + ' debe ser un número entero'); });
      if (o.vigente_desde === 'INVALIDA') err(o, 'Vigente desde no es una fecha válida (AAAA-MM-DD)');
      if (o.codigo) { if (codArchivo[o.codigo]) err(o, 'Código repetido en el archivo (fila ' + codArchivo[o.codigo] + ')'); else codArchivo[o.codigo] = o._fila; }
      const ex = o.codigo && prdSP(o.codigo);
      if (ex) {
        o._existente = ex;
        const comp = { codigo_anterior: o.codigo_anterior, nombre: o.nombre, tipo: o.tipo, categoria: o.categoria, descripcion_corta: o.descripcion_corta,
          ficha_tecnica: o.ficha_tecnica, unidad: o.unidad, garantia_meses: o.garantia_meses, stock_minimo: o.stock_minimo };
        Object.keys(comp).forEach((k) => { if (comp[k] !== '' && comp[k] !== undefined && String(comp[k]) !== String(ex[k] === null || ex[k] === undefined ? '' : ex[k])) o._cambios.push(k); });
        ['maneja_inventario', 'aplica_iva', 'descripcion_editable'].forEach((k) => { if (o[k] && (o[k] === 'SI') !== !!ex[k]) o._cambios.push(k); });
        const pv = P.precioVigente(ex.Title);
        if (o._precio !== undefined && !isNaN(o._precio) && (!pv || Number(pv.valor) !== o._precio || (pv.moneda || 'COP') !== o.moneda)) {
          o._cambios.push('precio'); o._precioAnterior = pv;
          if (o.vigente_desde && pv && o.vigente_desde < sf(pv.fecha_inicio)) err(o, 'Vigente desde es anterior al precio vigente (' + sf(pv.fecha_inicio) + ')');
        }
        if (ex.estado === 'INACTIVO') aviso(o, 'El producto está inactivo; se actualiza pero sigue inactivo');
        o._accion = o._errores.length ? 'ERROR' : (o._cambios.length ? 'ACTUALIZAR' : 'SIN_CAMBIOS');
      } else o._accion = o._errores.length ? 'ERROR' : 'CREAR';
      res.PRODUCTOS.push(o);
    });
    const enArchivo = (cod) => res.PRODUCTOS.find((o) => o.codigo === cod && o._accion !== 'ERROR');
    const maneja = (cod) => { const a = enArchivo(cod); if (a && a.maneja_inventario) return a.maneja_inventario === 'SI'; const s = prdSP(cod); return s ? !!s.maneja_inventario : (a ? a.maneja_inventario === 'SI' : false); };

    // ---------- COMPRAS ----------
    crudo.COMPRAS.filas.forEach((o) => {
      o._errores = []; o._cambios = [];
      o.codigo = P.normCodigo(o.codigo);
      o.nit_distribuidor = String(o.nit_distribuidor || '').replace(/-\d$/, '').replace(/\D/g, '');
      o.moneda = String(o.moneda || 'COP').toUpperCase().trim();
      if (NIT_EJEMPLO_DIS.indexOf(o.nit_distribuidor) >= 0) { err(o, 'Es una fila de ejemplo de la plantilla: bórrela'); o._accion = 'ERROR'; res.COMPRAS.push(o); return; }
      OBLIGATORIAS.COMPRAS.forEach((k) => { if (!o[k]) err(o, 'Falta ' + NOMBRE_CAMPO[k]); });
      if (o.codigo && !enArchivo(o.codigo) && !prdSP(o.codigo)) err(o, 'El producto ' + o.codigo + ' no existe ni se crea en este archivo (o tiene errores)');
      if (o.precio) { o._precio = numero(o.precio); if (isNaN(o._precio) || o._precio < 0) err(o, 'Precio de compra no válido'); }
      if (['COP', 'USD'].indexOf(o.moneda) < 0) err(o, 'Moneda debe ser COP o USD');
      if (o.fecha_compra === 'INVALIDA') err(o, 'Fecha de compra no válida (AAAA-MM-DD)');
      // Distribuidor: por NIT o por nombre
      const dis = D.distribuidores.find((d) => (o.nit_distribuidor && String(d.nit || '') === o.nit_distribuidor)) || D.distribuidores.find((d) => U.norm(d.nombre) === U.norm(o.distribuidor));
      if (dis) o._dis = dis; else if (o.distribuidor) aviso(o, 'Distribuidor nuevo: se crea "' + o.distribuidor + '"');
      const s = prdSP(o.codigo);
      const ex = dis && s && D.compras.find((x) => x.producto_id === s.Title && x.distribuidor_id === dis.Title && sf(x.fecha_compra) === o.fecha_compra && Number(x.precio_unitario_compra) === o._precio);
      if (ex) { o._existente = ex; o._accion = o._errores.length ? 'ERROR' : 'SIN_CAMBIOS'; }
      else o._accion = o._errores.length ? 'ERROR' : 'CREAR';
      res.COMPRAS.push(o);
    });

    // ---------- INVENTARIO ----------
    const cortesArchivo = {};
    crudo.INVENTARIO.filas.forEach((o) => {
      o._errores = []; o._cambios = [];
      o.codigo = P.normCodigo(o.codigo);
      OBLIGATORIAS.INVENTARIO.forEach((k) => { if (o[k] === '' || o[k] === undefined) err(o, 'Falta ' + NOMBRE_CAMPO[k]); });
      if (o.codigo && !enArchivo(o.codigo) && !prdSP(o.codigo)) err(o, 'El producto ' + o.codigo + ' no existe ni se crea en este archivo (o tiene errores)');
      else if (o.codigo && !maneja(o.codigo)) err(o, 'El producto no maneja inventario (Maneja inventario = NO)');
      if (o.fecha_corte === 'INVALIDA') err(o, 'Fecha de corte no válida (AAAA-MM-DD)');
      else if (o.fecha_corte && !/-(01|15)$/.test(o.fecha_corte)) err(o, 'La fecha de corte debe ser día 01 o 15');
      if (o.cantidad !== '' && !/^\d+$/.test(String(o.cantidad))) err(o, 'Cantidad debe ser un número entero');
      const clave = o.codigo + '|' + o.fecha_corte;
      if (o.codigo && o.fecha_corte) { if (cortesArchivo[clave]) err(o, 'Corte repetido en el archivo (fila ' + cortesArchivo[clave] + ')'); else cortesArchivo[clave] = o._fila; }
      const s = prdSP(o.codigo);
      const ex = s && D.cortes.find((x) => x.producto_id === s.Title && sf(x.fecha_corte) === o.fecha_corte);
      if (ex) {
        o._existente = ex;
        if (String(Number(ex.cantidad)) !== String(Number(o.cantidad))) o._cambios.push('cantidad');
        if (o.observaciones && o.observaciones !== String(ex.observaciones || '')) o._cambios.push('observaciones');
        o._accion = o._errores.length ? 'ERROR' : (o._cambios.length ? 'ACTUALIZAR' : 'SIN_CAMBIOS');
      } else o._accion = o._errores.length ? 'ERROR' : 'CREAR';
      res.INVENTARIO.push(o);
    });
    return res;
  }

  function identProductos(h, o) {
    if (h === 'PRODUCTOS') return '<b>' + esc(o.nombre) + '</b><span class="sec">' + esc(o.codigo) + (o.tipo ? ' · ' + esc(o.tipo) : '') +
      (o._precio !== undefined && !isNaN(o._precio) ? ' · ' + (o.moneda === 'USD' ? 'US$ ' + o._precio : U.fmt.cop(o._precio)) : '') + '</span>';
    if (h === 'COMPRAS') return '<b>' + esc(o.codigo) + '</b><span class="sec">' + esc(o.distribuidor) + (o.fecha_compra && o.fecha_compra !== 'INVALIDA' ? ' · ' + esc(o.fecha_compra) : '') + '</span>';
    return '<b>' + esc(o.codigo) + '</b><span class="sec">Corte ' + esc(o.fecha_corte) + ' · ' + esc(o.cantidad) + ' und</span>';
  }

  async function importarProductos(F, ctx) {
    const { sel, avanzar, resumen, falla } = ctx;
    const P = App.productos;
    const PR = sel('PRODUCTOS'), CM = sel('COMPRAS'), IV = sel('INVENTARIO');
    const hoy = P.hoy();
    const si = (v) => v === 'SI';

    // ---- Productos + precios ----
    const nuevos = PR.filter((o) => o._accion === 'CREAR');
    const conPrecio = PR.filter((o) => o._accion === 'CREAR' || o._cambios.indexOf('precio') >= 0);
    let nP = await G.reservar('PRD', nuevos.length), nPre = await G.reservar('PRE', conPrecio.length);
    const idPrd = {}; P.datos.productos.forEach((p) => { idPrd[P.normCodigo(p.codigo)] = p.Title; });
    const tareasP = PR.map((o) => async () => {
      const campos = { codigo: o.codigo, codigo_anterior: o.codigo_anterior, nombre: o.nombre, tipo: o.tipo, categoria: o.categoria,
        descripcion_corta: o.descripcion_corta, ficha_tecnica: o.ficha_tecnica, unidad: o.unidad,
        garantia_meses: o.garantia_meses ? Number(o.garantia_meses) : '', stock_minimo: o.stock_minimo ? Number(o.stock_minimo) : '' };
      ['maneja_inventario', 'aplica_iva', 'descripcion_editable'].forEach((k) => { if (o[k]) campos[k] = si(o[k]); });
      Object.keys(campos).forEach((k) => { if (campos[k] === '' || campos[k] === undefined) delete campos[k]; });   // celdas vacías no borran
      try {
        let id;
        if (o._accion === 'CREAR') {
          id = 'PRD-' + pad(nP++, 6);
          await G.crear('MAE_Productos', Object.assign({ Title: id, estado: 'ACTIVO' }, campos));
          idPrd[o.codigo] = id; resumen.creados++;
        } else {
          id = o._existente.Title;
          const cambia = Object.assign({}, campos); delete cambia.codigo;
          await G.actualizar('MAE_Productos', o._existente._id, cambia); resumen.actualizados++;
        }
        if (conPrecio.indexOf(o) >= 0) {
          const desde = o.vigente_desde || hoy;
          const vig = P.datos.precios.filter((x) => x.producto_id === id && x.activo);
          for (const x of vig) await G.actualizar('MAE_Precios', x._id, { activo: false, fecha_fin: desde > sf(x.fecha_inicio) ? P.diaAnterior(desde) : sf(x.fecha_inicio) });
          await G.crear('MAE_Precios', { Title: 'PRE-' + pad(nPre++, 6), producto_id: id, valor: o._precio, moneda: o.moneda, fecha_inicio: desde, activo: true });
        }
      } catch (e) { falla('PRODUCTOS', o, e); }
    });
    await enParalelo(tareasP, 4, avanzar('Productos'));
    await P.cargar(true);
    P.datos.productos.forEach((p) => { idPrd[P.normCodigo(p.codigo)] = p.Title; });

    // ---- Distribuidores nuevos (uno por NIT/nombre) y compras ----
    const disId = {};
    const claveDis = (o) => o.nit_distribuidor || 'N:' + U.norm(o.distribuidor);
    const porCrear = [];
    CM.forEach((o) => { if (o._dis) disId[claveDis(o)] = o._dis.Title; else if (!porCrear.some((x) => claveDis(x) === claveDis(o))) porCrear.push(o); });
    let nD = await G.reservar('DIS', porCrear.length);
    for (const o of porCrear) {
      const id = 'DIS-' + pad(nD++, 6);
      try { await G.crear('MAE_Distribuidores', { Title: id, nombre: o.distribuidor, nit: o.nit_distribuidor, estado: 'ACTIVO' }); disId[claveDis(o)] = id; }
      catch (e) { console.error(e); }
    }
    let nC = await G.reservar('PDI', CM.length);
    const tareasC = CM.map((o) => async () => {
      try {
        const pid = idPrd[o.codigo], did = disId[claveDis(o)];
        if (!pid) throw new Error('El producto no quedó creado');
        if (!did) throw new Error('No se pudo crear el distribuidor');
        await G.crear('MAE_ProductoDistribuidor', { Title: 'PDI-' + pad(nC++, 6), producto_id: pid, distribuidor_id: did, precio_unitario_compra: o._precio, moneda: o.moneda, fecha_compra: o.fecha_compra, estado: 'ACTIVO' });
        resumen.creados++;
      } catch (e) { falla('COMPRAS', o, e); }
    });
    await enParalelo(tareasC, 4, avanzar('Compras'));

    // ---- Cortes de inventario ----
    let nI = await G.reservar('INV', IV.filter((o) => o._accion === 'CREAR').length);
    const tareasI = IV.map((o) => async () => {
      try {
        const pid = idPrd[o.codigo];
        if (!pid) throw new Error('El producto no quedó creado');
        if (o._accion === 'CREAR') {
          await G.crear('MAE_InventarioCortes', { Title: 'INV-' + pad(nI++, 6), producto_id: pid, fecha_corte: o.fecha_corte, cantidad: Number(o.cantidad), observaciones: o.observaciones });
          resumen.creados++;
        } else {
          const campos = { cantidad: Number(o.cantidad) }; if (o.observaciones) campos.observaciones = o.observaciones;
          await G.actualizar('MAE_InventarioCortes', o._existente._id, campos); resumen.actualizados++;
        }
      } catch (e) { falla('INVENTARIO', o, e); }
    });
    await enParalelo(tareasI, 4, avanzar('Inventario'));
    await P.cargar(true);
  }

  // =====================================================================
  // MODOS DE CARGA
  // =====================================================================
  const MODOS = {
    empresas: { titulo: 'Empresas, sedes y contactos', plantilla: 'plantillas/Plantilla_Carga_Empresas_Contactos.xlsx',
      instruccion: 'Llene las hojas EMPRESAS, SEDES y CONTACTOS. Borre las filas de ejemplo (fondo amarillo).',
      hojas: ['EMPRESAS', 'SEDES', 'CONTACTOS'], preparar: () => App.empresas.cargar(true), validar: validarEmpresas, importar: importarEmpresas, ver: 'empresas', verTexto: 'Ver empresas' },
    productos: { titulo: 'Productos y precios', plantilla: 'plantillas/Plantilla_Carga_Productos.xlsx',
      instruccion: 'Llene PRODUCTOS (obligatoria); COMPRAS e INVENTARIO son opcionales. Borre las filas de ejemplo que no apliquen. Las fotos se cargan después en Productos → Cargar fotos.',
      hojas: ['PRODUCTOS', 'COMPRAS', 'INVENTARIO'], preparar: () => App.productos.cargar(true), validar: validarProductos, importar: importarProductos, ident: identProductos, ver: 'productos', verTexto: 'Ver productos' }
  };

  async function importar(c) {
    const F = estado.filas;
    const ok = await U.confirmar('Confirmar importación', 'Se van a crear y actualizar los registros marcados en verde y amarillo. Las filas con error no se cargan. ¿Continuar?', 'Importar');
    if (!ok) return;
    const zc = U.$('#zonaConfirmar', c);
    zc.innerHTML = '<div class="ic-barra-prog"><div id="prog"></div></div><div class="ic-conteo" id="progTxt" style="margin-top:6px">Preparando…</div>';
    U.$('#fArchivo', c).disabled = true;
    const sel = (h) => F[h].filter((o) => o._accion === 'CREAR' || o._accion === 'ACTUALIZAR');
    const total = MODOS[modo].hojas.reduce((n, h) => n + sel(h).length, 0); let hechos = 0;
    const avanzar = (fase) => () => { hechos++; U.$('#prog', c).style.width = Math.round(hechos * 100 / total) + '%'; U.$('#progTxt', c).textContent = fase + ' · ' + hechos + ' de ' + total; };
    const resumen = { creados: 0, actualizados: 0, fallidos: [] };
    const falla = (h, o, e) => { o._accion = 'ERROR'; o._errores = ['Falló al guardar: ' + U.mensajeError(e)]; resumen.fallidos.push(h + ' fila ' + o._fila); };
    try {
      await MODOS[modo].importar(F, { sel, avanzar, resumen, falla });

      // ---- Trazabilidad: archivo + auditoría ----
      let ruta = '';
      try {
        const ahora = new Date(), y = ahora.getFullYear();
        const sello = y + pad(ahora.getMonth() + 1, 2) + pad(ahora.getDate(), 2) + '_' + pad(ahora.getHours(), 2) + pad(ahora.getMinutes(), 2);
        ruta = 'Cargas_Masivas/' + y + '/' + sello + '_' + App.usuario.iniciales + '_' + estado.archivo.name.replace(/[^\w.\-]+/g, '_');
        await G.subirArchivo(ruta, estado.archivo);
      } catch (e) { console.warn(e); ruta = ''; }
      try {
        const n = await G.siguiente('EVT');
        await G.crear('SYS_Auditoria', { Title: 'EVT-' + pad(n, 8), fecha_hora: new Date().toISOString(), usuario_id: App.usuario.usuario_id, app_id: CFG.app.id,
          entidad: 'CARGA_MASIVA', registro_id: estado.archivo.name, accion: 'CREAR',
          despues: JSON.stringify({ creados: resumen.creados, actualizados: resumen.actualizados, fallidos: resumen.fallidos.length, archivo: ruta }) });
      } catch (e) { console.warn(e); }

      zc.innerHTML = '<div class="ic-form" style="border-left:4px solid var(--ic-ok)"><b>Importación terminada.</b>' +
        '<p style="margin:6px 0 0">' + resumen.creados + ' registro(s) creados · ' + resumen.actualizados + ' actualizados' +
        (resumen.fallidos.length ? ' · <span style="color:var(--ic-err)">' + resumen.fallidos.length + ' fallaron al guardar (' + esc(resumen.fallidos.join(', ')) + ')</span>' : '') + '.</p>' +
        (ruta ? '<p class="ic-conteo" style="margin:6px 0 0">Archivo guardado en SharePoint (IC Apps › Documentos › ' + esc(ruta) + ').</p>' : '') +
        '<p style="margin:10px 0 0"><a class="ic-btn" href="#' + MODOS[modo].ver + '">' + MODOS[modo].verTexto + '</a> <button class="ic-btn sec" onclick="location.reload()">Nueva carga</button></p></div>';
      pintarHoja(c, U.$('#tabs .activo', c) ? U.$('#tabs .activo', c).dataset.h : MODOS[modo].hojas[0]);
      U.aviso('Importación terminada', 'ok');
    } catch (e) {
      console.error(e);
      zc.innerHTML = '<div class="ic-form" style="border-left:4px solid var(--ic-err)"><b>La importación se detuvo.</b><p style="margin:6px 0 0">' + esc(U.mensajeError(e)) +
        '</p><p class="ic-conteo">Lo que alcanzó a guardarse quedó en SharePoint. Si vuelve a subir el mismo archivo, esas filas aparecerán como "Sin cambios".</p></div>';
    }
  }

  App.carga = { leerHoja, MODOS: () => MODOS };   // para pruebas
})();
