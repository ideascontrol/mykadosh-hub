/* =====================================================================
   APP-101 · Comercial — Productos, precios, inventario, compras y fotos
   Rutas: #productos · #productos/nuevo · #productos/PRD-000001 · #productos/PRD-000001/editar
   Listas: MAE_Productos · MAE_Precios · MAE_InventarioCortes · MAE_Distribuidores · MAE_ProductoDistribuidor
   Fotos: biblioteca "Documentos" de IC Apps › Imagenes_Productos/[CODIGO].webp (una foto principal por producto)
   ===================================================================== */
(function () {
  const U = IC.ui, G = IC.graph, esc = U.esc;
  const pad = (n, w) => String(n).padStart(w, '0');
  const CARPETA_FOTOS = 'Imagenes_Productos';
  const TIPOS = [['EQUIPO', 'Equipo'], ['ACCESORIO', 'Accesorio'], ['LICENCIA', 'Licencia'], ['SERVICIO', 'Servicio'], ['VIATICOS', 'Viáticos']];
  const UNIDADES = [['UND', 'Unidad'], ['SERVICIO', 'Servicio'], ['DIA', 'Día'], ['LICENCIA', 'Licencia'], ['PAQUETE', 'Paquete']];
  const SIN_INVENTARIO = ['LICENCIA', 'SERVICIO', 'VIATICOS'];
  const ICO_BUSCAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
  const ICO_FOTO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M21 17l-5-5-8 7"/></svg>';

  const datos = { productos: [], precios: [], cortes: [], distribuidores: [], compras: [], cargado: 0 };
  const filtro = { texto: '', tipo: '', estado: 'ACTIVO' };

  // ---------- Utilidades ----------
  const hoy = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2); };
  const soloFecha = (v) => (v ? String(v).slice(0, 10) : '');
  const diaAnterior = (iso) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2); };
  const normCodigo = (c) => String(c || '').trim().replace(/\s+/g, ' ').toUpperCase();
  // Nombre de archivo de la foto: igual a la columna automática de la plantilla
  const nombreFoto = (c) => normCodigo(c).replace(/[ /\\]/g, '-');
  const precio = (v, moneda) => moneda === 'USD' ? 'US$ ' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : U.fmt.cop(v);
  const tipoTxt = (t) => (TIPOS.find((x) => x[0] === t) || [t, t])[1];
  const precioVigente = (pid) => datos.precios.filter((p) => p.producto_id === pid && p.activo).sort((a, b) => soloFecha(b.fecha_inicio).localeCompare(soloFecha(a.fecha_inicio)))[0] || null;
  const ultimoCorte = (pid) => datos.cortes.filter((c) => c.producto_id === pid).sort((a, b) => soloFecha(b.fecha_corte).localeCompare(soloFecha(a.fecha_corte)))[0] || null;
  const productoPorId = (id) => datos.productos.find((p) => p.Title === id);
  const vinetas = (txt) => String(txt || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  async function cargar(forzar) {
    if (!forzar && datos.cargado && Date.now() - datos.cargado < 60000) return;
    const listas = ['MAE_Productos', 'MAE_Precios', 'MAE_InventarioCortes'];
    if (App.usuario.es_admin) listas.push('MAE_Distribuidores', 'MAE_ProductoDistribuidor');
    const r = await Promise.all(listas.map((l) => G.items(l, { top: 5000 })));
    datos.productos = r[0].sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'));
    datos.precios = r[1]; datos.cortes = r[2];
    datos.distribuidores = r[3] || []; datos.compras = r[4] || [];
    datos.cargado = Date.now();
  }

  // ---------- Fotos ----------
  const cacheFotos = {};   // ruta → URL temporal de descarga (válida ~1 h)
  async function urlFoto(ruta) {
    if (!ruta) return '';
    const c = cacheFotos[ruta];
    if (c && Date.now() - c.t < 45 * 60000) return c.url;
    try {
      const it = await G.llamar('GET', '/sites/' + await G.sitio(CFG.sitio.host, CFG.sitio.ruta) + '/drive/root:/' + ruta.split('/').map(encodeURIComponent).join('/'));
      const url = it['@microsoft.graph.downloadUrl'] || '';
      cacheFotos[ruta] = { url, t: Date.now() };
      return url;
    } catch (e) { cacheFotos[ruta] = { url: '', t: Date.now() }; return ''; }
  }
  // Carga perezosa: <img data-foto="ruta"> se llena cuando se pinta
  function pintarFotos(raiz) {
    raiz.querySelectorAll('img[data-foto]').forEach(async (img) => {
      const url = await urlFoto(img.dataset.foto);
      if (url) { img.src = url; img.closest('.ic-foto').classList.add('con-foto'); }
    });
  }
  function htmlFoto(p, clase) {
    return '<div class="ic-foto ' + (clase || '') + '">' + (p.imagen_webp_url ? '<img data-foto="' + esc(p.imagen_webp_url) + '" alt="">' : '') + '<span class="vacia">' + ICO_FOTO + '</span></div>';
  }

  // Reduce a 800 px (lado mayor) y convierte a WebP (o JPEG si el navegador no soporta WebP)
  async function prepararImagen(archivo) {
    const bmp = await createImageBitmap(archivo);
    const escala = Math.min(1, 800 / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * escala), h = Math.round(bmp.height * escala);
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, w, h); ctx.drawImage(bmp, 0, 0, w, h);
    let blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', 0.85));
    if (!blob || blob.type !== 'image/webp') blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
    return blob;
  }
  async function subirFoto(producto, archivo) {
    const blob = await prepararImagen(archivo);
    const ruta = CARPETA_FOTOS + '/' + nombreFoto(producto.codigo) + (blob.type === 'image/webp' ? '.webp' : '.jpg');
    await G.subirArchivo(ruta, new File([blob], ruta.split('/').pop(), { type: blob.type }));
    await G.actualizar('MAE_Productos', producto._id, { imagen_webp_url: ruta });
    delete cacheFotos[ruta];
    return ruta;
  }

  // ---------- Enrutador interno ----------
  App.vistas['productos'] = async function (c) {
    const partes = (location.hash || '').replace(/^#/, '').split('/');
    c.innerHTML = '<div class="ic-centro" style="min-height:40vh"><div><div class="ic-spinner"></div></div></div>';
    try {
      await cargar();
      if (partes[1] === 'nuevo') return App.usuario.es_admin ? vistaForm(c, null) : vistaLista(c);
      if (partes[1] && partes[2] === 'editar') return App.usuario.es_admin ? vistaForm(c, productoPorId(partes[1])) : vistaFicha(c, partes[1]);
      if (partes[1]) return vistaFicha(c, partes[1]);
      return vistaLista(c);
    } catch (e) {
      console.error(e);
      c.innerHTML = '<a class="ic-volver" href="#">← Menú principal</a><div class="ic-form"><b>No se pudo cargar el catálogo.</b><p>' + esc(U.mensajeError(e)) + '</p><button class="ic-btn" onclick="location.reload()">Reintentar</button></div>';
    }
  };

  // =====================================================================
  // LISTA
  // =====================================================================
  function vistaLista(c) {
    const admin = App.usuario.es_admin;
    c.innerHTML =
      '<a class="ic-volver" href="#">← Menú principal</a>' +
      '<div class="ic-barra"><div><h1 class="ic-titulo">Productos y precios</h1><p class="ic-subtitulo" style="margin:0">Catálogo de Ideas Control' + (admin ? '' : ' (consulta)') + '</p></div><div class="espacio"></div>' +
      (admin ? '<button class="ic-btn sec" id="btnFotos">' + ICO_FOTO.replace('<svg', '<svg width="18" height="18"') + ' Cargar fotos</button><a class="ic-btn" href="#productos/nuevo">+ Nuevo producto</a>' : '') + '</div>' +
      '<div class="ic-filtros">' +
        '<div class="ic-buscar">' + ICO_BUSCAR + '<input id="fTexto" type="search" placeholder="Buscar por código, nombre, categoría o código anterior" value="' + esc(filtro.texto) + '"></div>' +
        '<select id="fTipo"><option value="">Todos los tipos</option>' + TIPOS.map((t) => '<option value="' + t[0] + '">' + t[1] + '</option>').join('') + '</select>' +
        '<select id="fEstado"><option value="ACTIVO">Activos</option><option value="INACTIVO">Inactivos</option><option value="">Activos e inactivos</option></select>' +
      '</div><p class="ic-conteo" id="conteo"></p><div class="ic-tabla-caja" id="tabla"></div>';
    U.$('#fTipo', c).value = filtro.tipo; U.$('#fEstado', c).value = filtro.estado;
    U.$('#fTexto', c).oninput = (e) => { filtro.texto = e.target.value; pintarTabla(c); };
    U.$('#fTipo', c).onchange = (e) => { filtro.tipo = e.target.value; pintarTabla(c); };
    U.$('#fEstado', c).onchange = (e) => { filtro.estado = e.target.value; pintarTabla(c); };
    if (admin) U.$('#btnFotos', c).onclick = () => cargaFotos(c);
    pintarTabla(c);
  }

  function pintarTabla(c) {
    const t = U.norm(filtro.texto);
    const lista = datos.productos.filter((p) => (!filtro.estado || p.estado === filtro.estado) && (!filtro.tipo || p.tipo === filtro.tipo) &&
      (!t || U.norm([p.codigo, p.nombre, p.categoria, p.codigo_anterior, p.descripcion_corta].join(' ')).includes(t)));
    U.$('#conteo', c).textContent = lista.length + (lista.length === 1 ? ' producto' : ' productos');
    if (!lista.length) {
      U.$('#tabla', c).innerHTML = '<div class="ic-vacio">' + (datos.productos.length ? 'No hay productos que coincidan.' : 'Aún no hay productos.' + (App.usuario.es_admin ? ' Créelos con <b>+ Nuevo producto</b> o con la <a href="#carga">Carga masiva</a>.' : '')) + '</div>';
      return;
    }
    U.$('#tabla', c).innerHTML = '<table class="ic-tabla"><thead><tr><th style="width:64px"></th><th>Producto</th><th class="ocultar-movil">Tipo</th><th style="text-align:right">Precio (antes de IVA)</th><th class="ocultar-movil" style="text-align:right">Inventario</th></tr></thead><tbody>' +
      lista.map((p) => {
        const pv = precioVigente(p.Title), co = ultimoCorte(p.Title);
        const bajo = co && p.stock_minimo !== undefined && p.stock_minimo !== null && p.stock_minimo !== '' && Number(co.cantidad) < Number(p.stock_minimo);
        return '<tr data-id="' + esc(p.Title) + '" class="' + (p.estado === 'INACTIVO' ? 'inactivo' : '') + '">' +
          '<td>' + htmlFoto(p, 'mini') + '</td>' +
          '<td><b>' + esc(p.nombre) + '</b><span class="sec">' + esc(p.codigo) + (p.codigo_anterior ? ' · antes ' + esc(p.codigo_anterior) : '') + '</span></td>' +
          '<td class="ocultar-movil">' + esc(tipoTxt(p.tipo)) + (p.categoria ? '<span class="sec">' + esc(p.categoria) + '</span>' : '') + '</td>' +
          '<td style="text-align:right;white-space:nowrap">' + (pv ? '<b>' + precio(pv.valor, pv.moneda) + '</b>' : '<span class="sec">Sin precio</span>') + '</td>' +
          '<td class="ocultar-movil" style="text-align:right">' + (p.maneja_inventario ? (co ? '<span style="' + (bajo ? 'color:var(--ic-err);font-weight:700' : '') + '">' + U.fmt.num(co.cantidad) + '</span><span class="sec">' + U.fmt.fecha(co.fecha_corte) + '</span>' : '<span class="sec">Sin corte</span>') : '<span class="sec">No aplica</span>') + '</td></tr>';
      }).join('') + '</tbody></table>';
    U.$('#tabla', c).querySelectorAll('tbody tr').forEach((tr) => { tr.onclick = () => { location.hash = 'productos/' + tr.dataset.id; }; });
    pintarFotos(U.$('#tabla', c));
  }

  // =====================================================================
  // FORMULARIO (solo administradores)
  // =====================================================================
  function vistaForm(c, p) {
    const nuevo = !p;
    p = p || { tipo: 'EQUIPO', unidad: 'UND', maneja_inventario: true, aplica_iva: true, descripcion_editable: false, estado: 'ACTIVO' };
    const volver = '#productos' + (nuevo ? '' : '/' + esc(p.Title));
    const si = (v) => (v ? 'SI' : 'NO');
    c.innerHTML =
      '<a class="ic-volver" href="' + volver + '">← ' + (nuevo ? 'Productos' : esc(p.nombre)) + '</a>' +
      '<h1 class="ic-titulo">' + (nuevo ? 'Nuevo producto' : 'Editar producto') + '</h1><p class="ic-subtitulo">' + (nuevo ? 'Los campos con <span style="color:var(--ic-err)">*</span> son obligatorios.' : esc(p.Title)) + '</p>' +
      '<form class="ic-form" id="fPrd" novalidate>' +
        '<fieldset><legend>Identificación</legend><div class="ic-campos">' +
          U.campo({ name: 'codigo', label: 'Código', valor: p.codigo, req: true, c: 'c4', ayuda: 'Referencia del fabricante o SRV-, VIA-, LIC-, ACC-…' }) +
          U.campo({ name: 'codigo_anterior', label: 'Código anterior', valor: p.codigo_anterior, c: 'c4' }) +
          U.campo({ name: 'categoria', label: 'Categoría', valor: p.categoria, c: 'c4', ph: 'Biometría, Accesorios…' }) +
          U.campo({ name: 'nombre', label: 'Nombre', valor: p.nombre, req: true, c: 'c8' }) +
          U.campo({ name: 'tipo', label: 'Tipo', t: 'select', op: TIPOS, valor: p.tipo, vacio: false, req: true, c: 'c4' }) +
        '</div></fieldset>' +
        '<fieldset><legend>Descripción para la cotización</legend><div class="ic-campos">' +
          U.campo({ name: 'descripcion_corta', label: 'Descripción corta', valor: p.descripcion_corta, req: true, t: 'textarea', filas: 2, c: 'c12', ayuda: 'Primera línea que aparece en el PDF' }) +
          U.campo({ name: 'ficha_tecnica', label: 'Ficha técnica', valor: p.ficha_tecnica, t: 'textarea', filas: 7, c: 'c12', ph: 'Una característica por línea', ayuda: 'Cada línea se muestra como una viñeta en el PDF' }) +
        '</div></fieldset>' +
        '<fieldset><legend>Condiciones</legend><div class="ic-campos">' +
          U.campo({ name: 'unidad', label: 'Unidad', t: 'select', op: UNIDADES, valor: p.unidad, vacio: false, c: 'c3' }) +
          U.campo({ name: 'maneja_inventario', label: 'Maneja inventario', t: 'select', op: [['SI', 'Sí'], ['NO', 'No']], valor: si(p.maneja_inventario), vacio: false, c: 'c3' }) +
          U.campo({ name: 'aplica_iva', label: 'Aplica IVA', t: 'select', op: [['SI', 'Sí'], ['NO', 'No']], valor: si(p.aplica_iva), vacio: false, c: 'c3' }) +
          U.campo({ name: 'descripcion_editable', label: 'Descripción editable al cotizar', t: 'select', op: [['SI', 'Sí'], ['NO', 'No']], valor: si(p.descripcion_editable), vacio: false, c: 'c3' }) +
          U.campo({ name: 'garantia_meses', label: 'Garantía (meses)', valor: p.garantia_meses, modo: 'numeric', c: 'c3' }) +
          U.campo({ name: 'stock_minimo', label: 'Stock mínimo', valor: p.stock_minimo, modo: 'numeric', c: 'c3', ayuda: 'Alerta de inventario bajo' }) +
        '</div></fieldset>' +
        (nuevo ? '<fieldset><legend>Precio de venta inicial</legend><div class="ic-campos">' +
          U.campo({ name: 'valor', label: 'Precio antes de IVA', req: true, modo: 'decimal', c: 'c4', ph: 'Ej.: 1580000' }) +
          U.campo({ name: 'moneda', label: 'Moneda', t: 'select', op: [['COP', 'COP'], ['USD', 'USD']], valor: 'COP', vacio: false, c: 'c4' }) +
          U.campo({ name: 'fecha_inicio', label: 'Vigente desde', t: 'date', valor: hoy(), c: 'c4' }) +
        '</div></fieldset>' : '') +
        '<div class="ic-acciones"><a class="ic-btn sec" href="' + volver + '">Cancelar</a><button class="ic-btn" type="submit" id="btnGuardar">' + (nuevo ? 'Crear producto' : 'Guardar cambios') + '</button></div>' +
      '</form>';
    const f = U.$('#fPrd', c);
    const tipo = f.querySelector('[name=tipo]');
    tipo.onchange = () => {   // valores por defecto según el tipo
      const sinInv = SIN_INVENTARIO.indexOf(tipo.value) >= 0;
      f.querySelector('[name=maneja_inventario]').value = sinInv ? 'NO' : 'SI';
      f.querySelector('[name=descripcion_editable]').value = ['SERVICIO', 'VIATICOS'].indexOf(tipo.value) >= 0 ? 'SI' : 'NO';
      f.querySelector('[name=unidad]').value = tipo.value === 'LICENCIA' ? 'LICENCIA' : sinInv ? 'SERVICIO' : 'UND';
    };
    f.onsubmit = async (ev) => {
      ev.preventDefault();
      const v = U.leerForm(f);
      v.codigo = normCodigo(v.codigo);
      const err = {};
      ['codigo', 'nombre', 'descripcion_corta'].forEach((k) => { if (!v[k]) err[k] = 'Obligatorio'; });
      const dup = datos.productos.find((x) => x.Title !== p.Title && normCodigo(x.codigo) === v.codigo);
      if (dup) err.codigo = 'Ya existe: ' + dup.nombre + ' (' + dup.Title + ')';
      ['garantia_meses', 'stock_minimo'].forEach((k) => { if (v[k] && !/^\d+$/.test(v[k])) err[k] = 'Solo números enteros'; });
      if (nuevo) { const n = Number(String(v.valor).replace(/,/g, '.')); if (v.valor === '' || isNaN(n) || n < 0) err.valor = 'Escriba un precio válido (solo números)'; }
      if (v.maneja_inventario === 'SI' && SIN_INVENTARIO.indexOf(v.tipo) >= 0) err.maneja_inventario = 'Servicios, viáticos y licencias no manejan inventario';
      if (!U.marcarErrores(f, err)) return;
      await U.conCarga(U.$('#btnGuardar', c), async () => {
        try {
          const campos = { codigo: v.codigo, codigo_anterior: v.codigo_anterior, nombre: v.nombre, tipo: v.tipo, categoria: v.categoria,
            descripcion_corta: v.descripcion_corta, ficha_tecnica: v.ficha_tecnica, unidad: v.unidad, maneja_inventario: v.maneja_inventario === 'SI',
            aplica_iva: v.aplica_iva === 'SI', descripcion_editable: v.descripcion_editable === 'SI',
            garantia_meses: v.garantia_meses === '' ? null : Number(v.garantia_meses), stock_minimo: v.stock_minimo === '' ? null : Number(v.stock_minimo) };
          let id = p.Title;
          if (nuevo) {
            id = 'PRD-' + pad(await G.siguiente('PRD'), 6);
            Object.keys(campos).forEach((k) => { if (campos[k] === null || campos[k] === '') delete campos[k]; });
            await G.crear('MAE_Productos', Object.assign({ Title: id, estado: 'ACTIVO' }, campos));
            await G.crear('MAE_Precios', { Title: 'PRE-' + pad(await G.siguiente('PRE'), 6), producto_id: id, valor: Number(String(v.valor).replace(/,/g, '.')), moneda: v.moneda, fecha_inicio: v.fecha_inicio || hoy(), activo: true });
            U.aviso('Producto creado: ' + v.nombre, 'ok');
          } else {
            await G.actualizar('MAE_Productos', p._id, campos, p._etag);
            U.aviso('Cambios guardados', 'ok');
          }
          await cargar(true);
          location.hash = 'productos/' + id;
        } catch (er) { console.error(er); U.aviso(U.mensajeError(er), 'err', 7000); }
      });
    };
  }

  // =====================================================================
  // FICHA
  // =====================================================================
  function vistaFicha(c, id) {
    const p = productoPorId(id), admin = App.usuario.es_admin;
    if (!p) { c.innerHTML = '<a class="ic-volver" href="#productos">← Productos</a><div class="ic-form">No se encontró el producto ' + esc(id) + '.</div>'; return; }
    const pv = precioVigente(id), co = ultimoCorte(id);
    const historial = datos.precios.filter((x) => x.producto_id === id).sort((a, b) => soloFecha(b.fecha_inicio).localeCompare(soloFecha(a.fecha_inicio)) || (b.activo ? 1 : 0) - (a.activo ? 1 : 0));
    const cortes = datos.cortes.filter((x) => x.producto_id === id).sort((a, b) => soloFecha(b.fecha_corte).localeCompare(soloFecha(a.fecha_corte)));
    const compras = datos.compras.filter((x) => x.producto_id === id).sort((a, b) => soloFecha(b.fecha_compra).localeCompare(soloFecha(a.fecha_compra)));
    const dist = (did) => (datos.distribuidores.find((d) => d.Title === did) || {}).nombre || did;
    const fila = (k, v) => v !== '' && v !== null && v !== undefined ? '<dt>' + k + '</dt><dd>' + v + '</dd>' : '';
    const vin = vinetas(p.ficha_tecnica);
    c.innerHTML =
      '<a class="ic-volver" href="#productos">← Productos</a>' +
      '<div class="ic-ficha-cab"><div style="display:flex;gap:18px;flex:1 1 420px;align-items:flex-start">' +
        '<div>' + htmlFoto(p, 'grande') + (admin ? '<label class="ic-btn chico sec" style="margin-top:8px;width:100%;justify-content:center" for="fFoto">' + (p.imagen_webp_url ? 'Cambiar foto' : 'Subir foto') + '</label><input type="file" id="fFoto" accept="image/*" hidden>' : '') + '</div>' +
        '<div class="principal">' + (p.estado === 'INACTIVO' ? '<span class="ic-tag inactivo">Inactivo</span>' : '<span class="ic-tag prospecto">' + esc(tipoTxt(p.tipo)) + '</span>') +
          '<h1>' + esc(p.nombre) + '</h1><div class="meta"><span>' + esc(p.codigo) + '</span>' + (p.codigo_anterior ? '<span>Antes: ' + esc(p.codigo_anterior) + '</span>' : '') + (p.categoria ? '<span>' + esc(p.categoria) + '</span>' : '') + '<span>' + esc(p.Title) + '</span></div>' +
          '<div style="margin-top:14px;font-size:26px;font-weight:700;color:var(--ic-azul)">' + (pv ? precio(pv.valor, pv.moneda) : '<span style="font-size:15px;color:var(--ic-gris)">Sin precio vigente</span>') + '</div>' +
          (pv ? '<div class="ic-conteo" style="margin:0">Antes de IVA · vigente desde ' + U.fmt.fecha(pv.fecha_inicio) + (p.aplica_iva ? '' : ' · <b>no aplica IVA</b>') + '</div>' : '') +
        '</div></div>' +
        (admin ? '<div style="display:flex;gap:8px;flex-wrap:wrap"><a class="ic-btn sec" href="#productos/' + esc(id) + '/editar">Editar</a><button class="ic-btn ' + (p.estado === 'INACTIVO' ? 'sec' : 'peligro') + '" id="btnEstado">' + (p.estado === 'INACTIVO' ? 'Reactivar' : 'Desactivar') + '</button></div>' : '') +
      '</div>' +
      '<div class="ic-ficha-grid">' +
        '<div style="display:flex;flex-direction:column;gap:16px">' +
          '<div class="ic-bloque"><div class="cab"><h2>Así se verá en la cotización</h2></div><div class="cuerpo">' +
            '<table class="ic-prev"><thead><tr><th>Código</th><th>Descripción</th><th>Cant.</th><th>Unitario</th></tr></thead><tbody><tr>' +
            '<td><b>' + esc(p.codigo) + '</b></td><td>' + esc(p.descripcion_corta) + (vin.length ? '<ul>' + vin.map((l) => '<li>' + esc(l) + '</li>').join('') + '</ul>' : '') + '</td>' +
            '<td>1</td><td style="white-space:nowrap">' + (pv ? precio(pv.valor, pv.moneda) : '—') + '</td></tr></tbody></table>' +
            (p.descripcion_editable ? '<p class="ic-conteo" style="margin:8px 0 0">El comercial puede ajustar esta descripción al cotizar.</p>' : '') +
          '</div></div>' +
          '<div class="ic-bloque"><div class="cab"><h2>Datos del producto</h2></div><div class="cuerpo"><dl class="ic-datos">' +
            fila('Unidad', esc((UNIDADES.find((u) => u[0] === p.unidad) || [0, p.unidad])[1])) + fila('Maneja inventario', p.maneja_inventario ? 'Sí' : 'No') +
            fila('Aplica IVA', p.aplica_iva ? 'Sí' : 'No') + fila('Garantía', p.garantia_meses ? p.garantia_meses + ' meses' : '') + fila('Stock mínimo', p.stock_minimo) +
          '</dl><div class="ic-auditoria">Creado por ' + esc(p._autor || '—') + ' el ' + U.fmt.fechaHora(p._creado) + ' · Última modificación: ' + esc(p._editor || '—') + ', ' + U.fmt.fechaHora(p._modificado) + '</div></div></div>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;gap:16px">' +
          '<div class="ic-bloque"><div class="cab"><h2>Historial de precios</h2>' + (admin ? '<button class="ic-btn chico" id="btnPrecio">+ Nuevo precio</button>' : '') + '</div><div class="cuerpo">' +
            (historial.length ? historial.map((h) => '<div class="ic-item" style="cursor:default"><div style="flex:1"><div class="titulo">' + precio(h.valor, h.moneda) + (h.activo ? ' <span class="ic-tag cliente">Vigente</span>' : '') + '</div>' +
              '<div class="sec">Desde ' + U.fmt.fecha(h.fecha_inicio) + (h.fecha_fin ? ' hasta ' + U.fmt.fecha(h.fecha_fin) : '') + (h._autor ? ' · ' + esc(h._autor) : '') + '</div></div></div>').join('') : '<div class="ic-vacio" style="padding:18px">Sin precios registrados.</div>') +
          '</div></div>' +
          (p.maneja_inventario ? '<div class="ic-bloque"><div class="cab"><h2>Inventario' + (co ? ': ' + U.fmt.num(co.cantidad) + ' und' : '') + '</h2>' + (admin ? '<button class="ic-btn chico sec" id="btnCorte">+ Registrar corte</button>' : '') + '</div><div class="cuerpo">' +
            (cortes.length ? cortes.slice(0, 6).map((x) => '<div class="ic-item" style="cursor:default"><div><div class="titulo">' + U.fmt.num(x.cantidad) + ' und</div><div class="sec">Corte ' + U.fmt.fecha(x.fecha_corte) + (x.observaciones ? ' · ' + esc(x.observaciones) : '') + '</div></div></div>').join('') : '<div class="ic-vacio" style="padding:18px">Sin cortes de inventario.</div>') +
          '</div></div>' : '') +
          (admin ? '<div class="ic-bloque"><div class="cab"><h2>Compras a distribuidores</h2><button class="ic-btn chico sec" id="btnCompra">+ Registrar compra</button></div><div class="cuerpo">' +
            (compras.length ? compras.map((x) => '<div class="ic-item" style="cursor:default"><div><div class="titulo">' + esc(dist(x.distribuidor_id)) + '</div><div class="sec">' + precio(x.precio_unitario_compra, x.moneda) + ' · ' + U.fmt.fecha(x.fecha_compra) +
              (pv && pv.moneda === x.moneda && Number(pv.valor) > 0 ? ' · margen ' + Math.round((1 - Number(x.precio_unitario_compra) / Number(pv.valor)) * 100) + ' %' : '') + '</div></div></div>').join('') : '<div class="ic-vacio" style="padding:18px">Sin compras registradas.</div>') +
            '<p class="ic-conteo" style="margin:8px 0 0">Solo visible para administradores.</p></div></div>' : '') +
        '</div>' +
      '</div>';
    pintarFotos(c);
    if (!admin) return;
    U.$('#fFoto', c).onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      U.aviso('Subiendo foto…');
      try { await subirFoto(p, f); await cargar(true); U.aviso('Foto actualizada', 'ok'); vistaFicha(c, id); }
      catch (er) { console.error(er); U.aviso(U.mensajeError(er), 'err', 7000); }
    };
    U.$('#btnPrecio', c).onclick = () => formPrecio(p, pv, c);
    const bc = U.$('#btnCorte', c); if (bc) bc.onclick = () => formCorte(p, c);
    U.$('#btnCompra', c).onclick = () => formCompra(p, c);
    U.$('#btnEstado', c).onclick = async () => {
      const activar = p.estado === 'INACTIVO';
      if (!await U.confirmar(activar ? 'Reactivar producto' : 'Desactivar producto', activar ? '¿Reactivar ' + p.nombre + '?' : p.nombre + ' dejará de aparecer al cotizar. Su historial se conserva.', activar ? 'Reactivar' : 'Desactivar', !activar)) return;
      try { await G.actualizar('MAE_Productos', p._id, { estado: activar ? 'ACTIVO' : 'INACTIVO' }, p._etag); await cargar(true); vistaFicha(c, id); U.aviso('Listo', 'ok'); }
      catch (er) { U.aviso(U.mensajeError(er), 'err', 7000); }
    };
  }

  // ---------- Nuevo precio (cierra el vigente) ----------
  async function registrarPrecio(p, valor, moneda, desde) {
    const vig = datos.precios.filter((x) => x.producto_id === p.Title && x.activo);
    for (const x of vig) await G.actualizar('MAE_Precios', x._id, { activo: false, fecha_fin: desde > soloFecha(x.fecha_inicio) ? diaAnterior(desde) : soloFecha(x.fecha_inicio) });
    await G.crear('MAE_Precios', { Title: 'PRE-' + pad(await G.siguiente('PRE'), 6), producto_id: p.Title, valor, moneda, fecha_inicio: desde, activo: true });
  }
  function formPrecio(p, pv, c) {
    U.modal('Nuevo precio · ' + p.nombre, '<form class="ic-form" id="fPre" novalidate>' +
      (pv ? '<p class="ic-conteo">Precio vigente: <b>' + precio(pv.valor, pv.moneda) + '</b> desde ' + U.fmt.fecha(pv.fecha_inicio) + '. Al guardar, queda en el historial.</p>' : '') +
      '<div class="ic-campos">' + U.campo({ name: 'valor', label: 'Precio antes de IVA', req: true, modo: 'decimal', c: 'c4' }) +
      U.campo({ name: 'moneda', label: 'Moneda', t: 'select', op: [['COP', 'COP'], ['USD', 'USD']], valor: pv ? pv.moneda : 'COP', vacio: false, c: 'c4' }) +
      U.campo({ name: 'fecha_inicio', label: 'Vigente desde', t: 'date', valor: hoy(), c: 'c4' }) + '</div>' +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="bC">Cancelar</button><button class="ic-btn" id="bG">Guardar precio</button></div></form>', (m) => {
      U.$('#bC', m).onclick = U.cerrarModal;
      U.$('#fPre', m).onsubmit = async (ev) => {
        ev.preventDefault();
        const v = U.leerForm(ev.target), n = Number(String(v.valor).replace(/,/g, '.'));
        if (!U.marcarErrores(ev.target, v.valor === '' || isNaN(n) || n < 0 ? { valor: 'Precio no válido' } : {})) return;
        await U.conCarga(U.$('#bG', m), async () => {
          try { await registrarPrecio(p, n, v.moneda, v.fecha_inicio || hoy()); U.cerrarModal(); await cargar(true); vistaFicha(c, p.Title); U.aviso('Precio actualizado', 'ok'); }
          catch (er) { U.aviso(U.mensajeError(er), 'err', 7000); }
        });
      };
    });
  }

  // ---------- Corte de inventario ----------
  function formCorte(p, c) {
    const d = new Date(), def = d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + (d.getDate() >= 15 ? '15' : '01');
    U.modal('Corte de inventario · ' + p.nombre, '<form class="ic-form" id="fCo" novalidate><div class="ic-campos">' +
      U.campo({ name: 'fecha_corte', label: 'Fecha de corte', t: 'date', valor: def, req: true, c: 'c4', ayuda: 'Día 01 o 15' }) +
      U.campo({ name: 'cantidad', label: 'Cantidad disponible', req: true, modo: 'numeric', c: 'c4' }) +
      U.campo({ name: 'observaciones', label: 'Observaciones', c: 'c12' }) + '</div>' +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="bC">Cancelar</button><button class="ic-btn" id="bG">Registrar</button></div></form>', (m) => {
      U.$('#bC', m).onclick = U.cerrarModal;
      U.$('#fCo', m).onsubmit = async (ev) => {
        ev.preventDefault();
        const v = U.leerForm(ev.target), err = {};
        if (!/^\d{4}-\d{2}-(01|15)$/.test(v.fecha_corte)) err.fecha_corte = 'Debe ser día 01 o 15';
        if (!/^\d+$/.test(v.cantidad)) err.cantidad = 'Número entero';
        if (!U.marcarErrores(ev.target, err)) return;
        await U.conCarga(U.$('#bG', m), async () => {
          try {
            const ex = datos.cortes.find((x) => x.producto_id === p.Title && soloFecha(x.fecha_corte) === v.fecha_corte);
            if (ex) await G.actualizar('MAE_InventarioCortes', ex._id, { cantidad: Number(v.cantidad), observaciones: v.observaciones });
            else await G.crear('MAE_InventarioCortes', { Title: 'INV-' + pad(await G.siguiente('INV'), 6), producto_id: p.Title, fecha_corte: v.fecha_corte, cantidad: Number(v.cantidad), observaciones: v.observaciones });
            U.cerrarModal(); await cargar(true); vistaFicha(c, p.Title); U.aviso('Corte registrado', 'ok');
          } catch (er) { U.aviso(U.mensajeError(er), 'err', 7000); }
        });
      };
    });
  }

  // ---------- Compra a distribuidor ----------
  function formCompra(p, c) {
    U.modal('Compra · ' + p.nombre, '<form class="ic-form" id="fCm" novalidate><div class="ic-campos">' +
      U.campo({ name: 'distribuidor_id', label: 'Distribuidor', t: 'select', op: datos.distribuidores.filter((d) => d.estado !== 'INACTIVO').map((d) => [d.Title, d.nombre]).concat([['__NUEVO__', '+ Nuevo distribuidor…']]), req: true, c: 'c12' }) +
      '<div class="ic-campo c8" id="cNuevo" hidden><label>Nombre del nuevo distribuidor</label><input name="nuevo_nombre"></div>' +
      '<div class="ic-campo c4" id="cNit" hidden><label>NIT</label><input name="nuevo_nit" inputmode="numeric"></div>' +
      U.campo({ name: 'precio', label: 'Precio unitario de compra', req: true, modo: 'decimal', c: 'c4' }) +
      U.campo({ name: 'moneda', label: 'Moneda', t: 'select', op: [['COP', 'COP'], ['USD', 'USD']], valor: 'COP', vacio: false, c: 'c4' }) +
      U.campo({ name: 'fecha_compra', label: 'Fecha de compra', t: 'date', valor: hoy(), req: true, c: 'c4' }) + '</div>' +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="bC">Cancelar</button><button class="ic-btn" id="bG">Registrar</button></div></form>', (m) => {
      const sel = m.querySelector('[name=distribuidor_id]');
      sel.onchange = () => { const n = sel.value === '__NUEVO__'; U.$('#cNuevo', m).hidden = !n; U.$('#cNit', m).hidden = !n; };
      U.$('#bC', m).onclick = U.cerrarModal;
      U.$('#fCm', m).onsubmit = async (ev) => {
        ev.preventDefault();
        const v = U.leerForm(ev.target), err = {}, n = Number(String(v.precio).replace(/,/g, '.'));
        if (!v.distribuidor_id) err.distribuidor_id = 'Seleccione el distribuidor';
        if (v.distribuidor_id === '__NUEVO__' && !v.nuevo_nombre) err.distribuidor_id = 'Escriba el nombre del nuevo distribuidor';
        if (v.precio === '' || isNaN(n) || n < 0) err.precio = 'Precio no válido';
        if (!v.fecha_compra) err.fecha_compra = 'Obligatoria';
        if (!U.marcarErrores(ev.target, err)) return;
        await U.conCarga(U.$('#bG', m), async () => {
          try {
            let did = v.distribuidor_id;
            if (did === '__NUEVO__') {
              did = 'DIS-' + pad(await G.siguiente('DIS'), 6);
              await G.crear('MAE_Distribuidores', { Title: did, nombre: v.nuevo_nombre, nit: v.nuevo_nit.replace(/\D/g, ''), estado: 'ACTIVO' });
            }
            await G.crear('MAE_ProductoDistribuidor', { Title: 'PDI-' + pad(await G.siguiente('PDI'), 6), producto_id: p.Title, distribuidor_id: did, precio_unitario_compra: n, moneda: v.moneda, fecha_compra: v.fecha_compra, estado: 'ACTIVO' });
            U.cerrarModal(); await cargar(true); vistaFicha(c, p.Title); U.aviso('Compra registrada', 'ok');
          } catch (er) { U.aviso(U.mensajeError(er), 'err', 7000); }
        });
      };
    });
  }

  // =====================================================================
  // CARGA MASIVA DE FOTOS
  // =====================================================================
  function cargaFotos(c) {
    let lista = [];
    U.modal('Cargar fotos de productos', '<div class="ic-form">' +
      '<p style="margin:0 0 8px">Seleccione varias fotos a la vez. Cada archivo debe llamarse como el código del producto, con espacios y "/" cambiados por guion. Ej.: <b>AC-2100-PLUS-RF-SC.jpg</b> para el código <b>AC-2100 PLUS RF/SC</b>. La plantilla de productos calcula ese nombre en la última columna.</p>' +
      '<p class="ic-conteo">Formatos: JPG, PNG o WebP. Se reducen a 800 px y se guardan como WebP. Si el producto ya tenía foto, se reemplaza.</p>' +
      '<label class="ic-btn sec" for="fFotos">Seleccionar fotos</label><input type="file" id="fFotos" accept="image/*" multiple hidden>' +
      '<div id="lFotos" style="margin-top:14px"></div>' +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="bC">Cerrar</button><button class="ic-btn" id="bS" disabled>Subir fotos</button></div></div>', (m) => {
      U.$('#bC', m).onclick = U.cerrarModal;
      U.$('#fFotos', m).onchange = (e) => {
        const porNombre = {}; datos.productos.forEach((p) => { porNombre[nombreFoto(p.codigo)] = p; });
        lista = Array.from(e.target.files).map((f) => {
          const base = f.name.replace(/\.[^.]+$/, '').trim().toUpperCase().replace(/[ /\\]/g, '-');
          return { f, p: porNombre[base] || null };
        });
        const ok = lista.filter((x) => x.p).length;
        U.$('#lFotos', m).innerHTML = '<p class="ic-conteo">' + ok + ' de ' + lista.length + ' fotos coinciden con un producto.</p><div class="ic-tabla-caja"><table class="ic-tabla"><tbody>' +
          lista.map((x, i) => '<tr style="cursor:default"><td style="width:56px"><div class="ic-foto mini con-foto"><img id="pv' + i + '"></div></td><td>' + esc(x.f.name) + '<span class="sec">' + Math.round(x.f.size / 1024) + ' KB</span></td><td id="st' + i + '">' +
            (x.p ? '<span class="ic-res ok">' + (x.p.imagen_webp_url ? 'Reemplaza' : 'Nueva') + '</span><span class="sec">' + esc(x.p.nombre) + '</span>' : '<span class="ic-res error">Sin producto</span><span class="sec">No hay un código que coincida</span>') + '</td></tr>').join('') + '</tbody></table></div>';
        lista.forEach((x, i) => { const img = U.$('#pv' + i, m); img.src = URL.createObjectURL(x.f); });
        U.$('#bS', m).disabled = !ok; U.$('#bS', m).textContent = 'Subir ' + ok + ' foto(s)';
      };
      U.$('#bS', m).onclick = async () => {
        U.$('#bS', m).disabled = true;
        let hechas = 0, fallas = 0;
        for (let i = 0; i < lista.length; i++) {
          const x = lista[i]; if (!x.p) continue;
          U.$('#st' + i, m).innerHTML = '<span class="ic-res igual">Subiendo…</span>';
          try { await subirFoto(x.p, x.f); hechas++; U.$('#st' + i, m).innerHTML = '<span class="ic-res ok">Subida</span><span class="sec">' + esc(x.p.nombre) + '</span>'; }
          catch (er) { fallas++; console.error(er); U.$('#st' + i, m).innerHTML = '<span class="ic-res error">Falló</span><span class="sec">' + esc(U.mensajeError(er)) + '</span>'; }
        }
        U.$('#bS', m).textContent = hechas + ' subida(s)' + (fallas ? ', ' + fallas + ' con error' : '');
        await cargar(true); pintarTabla(c);
        U.aviso(hechas + ' foto(s) cargadas', fallas ? 'warn' : 'ok');
      };
    });
  }

  // Expuesto para la carga masiva y, más adelante, para las cotizaciones
  App.productos = { cargar, datos, precioVigente, ultimoCorte, normCodigo, nombreFoto, urlFoto, registrarPrecio, diaAnterior, hoy };
})();
