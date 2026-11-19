/* =====================================================================
   Reflexiones Estratégicas — datos (SharePoint IC Apps, listas RE_*)
   - Reflexiones: la lista se carga sin el texto completo (contenido); el texto se lee al abrir cada una.
   - Código RE-XXX-NNN: consecutivo por libro en SYS_Secuencias (clave RE-XXX), con control de concurrencia.
     Nunca se reutiliza (la secuencia no retrocede al archivar o eliminar).
   - Permisos: las listas RE_* tienen permisos únicos en SharePoint. Dar o quitar acceso cambia esos permisos
     (API REST de SharePoint): el control es real, no solo visual.
   ===================================================================== */
window.RE = (function () {
  const U = IC.ui, G = IC.graph;
  const D = { refl: [], libros: [], dims: [], comps: [], prompts: {}, accesos: [], aprob: [], usuario: null, rol: null };
  const pad = (n, l) => String(n).padStart(l || 3, '0');
  const hoy = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2); };
  const dia = (v) => (v ? String(v).slice(0, 10) : '');
  const ahora = () => new Date().toISOString();
  const lista = (s) => String(s || '').split(';').map((x) => x.trim()).filter(Boolean);
  const textoFecha = (d, corto) => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-CO', corto ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const nombreEstado = (e) => (CFG.estados.find((x) => x[0] === e) || [e, e || '—'])[1];

  // ---------- Carga ----------
  const CAMPOS_LISTA = ['Title', 'codigo', 'num', 'libro', 'capitulo', 'vers_ini', 'vers_fin', 'version_biblica', 'titulo', 'titulo_editorial', 'personajes', 'resumen', 'intro',
    'dimension', 'competencia', 'competencias_sec', 'areas', 'etiquetas_origen', 'estado', 'fecha_creacion', 'fecha_prevista', 'fecha_publicacion', 'autor', 'portada', 'principio', 'tiene_texto'];
  function normal(r) {
    ['fecha_creacion', 'fecha_prevista', 'fecha_publicacion'].forEach((k) => { r[k] = dia(r[k]); });
    r.num = Number(r.num) || 0;
    return r;
  }
  async function cargarReflexiones() {
    const id = await G.listaId('RE_Reflexiones');
    const q = '/sites/' + await G.sitio(CFG.sitio.host, CFG.sitio.ruta) + '/lists/' + id + '/items?$expand=fields($select=' + CAMPOS_LISTA.join(',') + ')&$top=999';
    const r = await G.todas(q, { Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly' });
    D.refl = r.map((it) => normal(Object.assign({}, it.fields, { _id: it.id, _etag: it['@odata.etag'] || it.eTag, _creado: it.createdDateTime, _modificado: it.lastModifiedDateTime, _editor: it.lastModifiedBy && it.lastModifiedBy.user ? it.lastModifiedBy.user.displayName : '' })))
      .sort((a, b) => ordenLibro(a.libro) - ordenLibro(b.libro) || a.num - b.num || String(a.codigo).localeCompare(b.codigo));
  }
  // Una reflexión completa (con el texto)
  async function leer(r) {
    const id = await G.listaId('RE_Reflexiones');
    const it = await G.llamar('GET', '/sites/' + await G.sitio(CFG.sitio.host, CFG.sitio.ruta) + '/lists/' + id + '/items/' + r._id + '?$expand=fields');
    const o = normal(Object.assign({}, it.fields, { _id: it.id, _etag: it['@odata.etag'] || it.eTag, _modificado: it.lastModifiedDateTime }));
    Object.assign(r, o);
    return r;
  }
  async function cargarCatalogos() {
    const [lib, comp] = await Promise.all([G.items('RE_Libros', { top: 200 }), G.items('RE_Competencias', { top: 500 })]);
    D.libros = lib.map((x) => ({ _id: x._id, codigo: x.Title, nombre: x.nombre, orden: Number(x.orden) || 0, testamento: x.testamento, activo: x.activo !== false })).sort((a, b) => a.orden - b.orden);
    D.dims = comp.filter((x) => x.tipo === 'DIMENSION').map((x) => ({ _id: x._id, id: x.Title, nombre: x.nombre, descripcion: x.descripcion || '', orden: Number(x.orden) || 0, activo: x.activo !== false })).sort((a, b) => a.orden - b.orden);
    D.comps = comp.filter((x) => x.tipo !== 'DIMENSION').map((x) => ({ _id: x._id, id: x.Title, dimension: x.dimension, nombre: x.nombre, descripcion: x.descripcion || '', orden: Number(x.orden) || 0, activo: x.activo !== false }))
      .sort((a, b) => ordenDim(a.dimension) - ordenDim(b.dimension) || a.orden - b.orden);
  }
  // Primera vez: crea los 66 libros y el modelo de dimensiones/competencias desde la configuración
  async function sembrarCatalogos(progreso) {
    let n = 0;
    if (!D.libros.length) for (const [cod, nom, ord, tes] of CFG.libros) { await G.crear('RE_Libros', { Title: cod, nombre: nom, orden: ord, testamento: tes, activo: true }); if (progreso) progreso(++n); }
    if (!D.dims.length) {
      for (let i = 0; i < CFG.dimensiones.length; i++) {
        const d = CFG.dimensiones[i];
        await G.crear('RE_Competencias', { Title: d.id, tipo: 'DIMENSION', dimension: d.id, nombre: d.nombre, descripcion: d.descripcion, orden: i + 1, activo: true });
        for (let j = 0; j < d.competencias.length; j++) {
          await G.crear('RE_Competencias', { Title: d.id + '-C' + pad(j + 1, 2), tipo: 'COMPETENCIA', dimension: d.id, nombre: d.competencias[j][0], descripcion: d.competencias[j][1], orden: j + 1, activo: true });
          if (progreso) progreso(++n);
        }
      }
    }
    await cargarCatalogos();
  }
  async function cargarPrompts() {
    const r = await G.items('RE_Config', { top: 999 });
    D.prompts = {};
    r.filter((x) => x.clave).forEach((x) => { (D.prompts[x.clave] = D.prompts[x.clave] || []).push(Object.assign(x, { version: Number(x.version) || 0 })); });
    Object.keys(D.prompts).forEach((k) => D.prompts[k].sort((a, b) => b.version - a.version));
  }
  const promptVigente = (clave) => { const v = D.prompts[clave] || []; return v.find((x) => x.vigente) || v[0] || null; };
  async function guardarPrompt(clave, texto, nota) {
    const v = D.prompts[clave] || [], n = (v[0] ? v[0].version : 0) + 1;
    for (const x of v.filter((y) => y.vigente)) await G.actualizar('RE_Config', x._id, { vigente: false });
    await G.crear('RE_Config', { Title: clave + '@v' + pad(n), clave, version: n, texto, nota: nota || '', autor: D.usuario.nombre, fecha_hora: ahora(), vigente: true });
    await cargarPrompts();
  }
  async function cargarAccesos() { D.accesos = await G.items('RE_Accesos', { top: 999 }); }
  async function cargarAprobaciones() { D.aprob = await G.items('RE_Aprobaciones', { top: 5000 }); }

  // ---------- Catálogos ----------
  const libro = (cod) => D.libros.find((l) => l.codigo === cod);
  const ordenLibro = (cod) => { const l = D.libros.find((x) => x.codigo === cod); return l ? l.orden : 999; };
  const ordenDim = (id) => { const d = D.dims.find((x) => x.id === id); return d ? d.orden : 99; };
  const dim = (id) => D.dims.find((d) => d.id === id);
  const nombreLibro = (cod) => (libro(cod) || {}).nombre || cod || '';
  const nombreDim = (id) => (dim(id) || {}).nombre || id || '';
  function referencia(r) {
    if (!r.libro) return '';
    let t = nombreLibro(r.libro) + (r.capitulo ? ' ' + r.capitulo : '');
    if (r.capitulo && r.vers_ini) t += ':' + r.vers_ini + (r.vers_fin && r.vers_fin !== r.vers_ini ? '–' + r.vers_fin : '');
    return t;
  }
  const referenciaCompleta = (r) => referencia(r) + (r.version_biblica ? ' (' + r.version_biblica + ')' : '');
  const slug = (r) => 'reflexion-' + String(r.codigo || '').toLowerCase();

  // ---------- Código RE-XXX-NNN ----------
  async function nuevoCodigo(cod) {
    const n = await G.siguiente('RE-' + cod);
    return { num: n, codigo: 'RE-' + cod + '-' + pad(n) };
  }

  // Deja la secuencia de un libro al menos en n (al importar códigos ya asignados en el plan)
  async function asegurarSecuencia(cod, n) {
    const clave = 'RE-' + cod;
    const r = await G.items('SYS_Secuencias', { filtro: "fields/Title eq '" + clave + "'" });
    if (!r.length) await G.crear('SYS_Secuencias', { Title: clave, ultimo_numero: n });
    else if (Number(r[0].ultimo_numero || 0) < n) await G.actualizar('SYS_Secuencias', r[0]._id, { ultimo_numero: n }, r[0]._etag);
  }

  // ---------- Historial ----------
  async function registrar(r, accion, detalle) {
    try { await G.crear('RE_Historial', { Title: r.codigo + '@' + Date.now(), reflexion_id: r.codigo, fecha_hora: ahora(), usuario: D.usuario.nombre, email: D.usuario.email, accion, detalle: detalle || '' }); }
    catch (e) { console.warn('No se registró el historial', e); }
  }
  async function historial(r) {
    return (await G.items('RE_Historial', { filtro: "fields/reflexion_id eq '" + r.codigo + "'", top: 999 })).sort((a, b) => String(b.fecha_hora).localeCompare(String(a.fecha_hora)));
  }
  // Versiones del texto guardadas por SharePoint (historial de versiones de la lista)
  async function versiones(r) {
    const id = await G.listaId('RE_Reflexiones'), s = await G.sitio(CFG.sitio.host, CFG.sitio.ruta);
    return (await G.todas('/sites/' + s + '/lists/' + id + '/items/' + r._id + '/versions?$top=100')).map((v) => ({ id: v.id, fecha: v.lastModifiedDateTime, por: v.lastModifiedBy && v.lastModifiedBy.user ? v.lastModifiedBy.user.displayName : '', campos: v.fields || {} }));
  }
  async function version(r, vid) {
    const id = await G.listaId('RE_Reflexiones'), s = await G.sitio(CFG.sitio.host, CFG.sitio.ruta);
    const v = await G.llamar('GET', '/sites/' + s + '/lists/' + id + '/items/' + r._id + '/versions/' + vid + '?$expand=fields');
    return v.fields || {};
  }

  // ---------- Crear / guardar ----------
  const LIMPIAR = (o) => { const x = {}; Object.keys(o).forEach((k) => { if (k[0] !== '_') x[k] = o[k]; }); return x; };
  async function crear(campos) {
    if (!campos.libro) throw new Error('Elija el libro bíblico para asignar el código.');
    let c = await nuevoCodigo(campos.libro);
    // Protección extra: si el número ya está ocupado (p. ej. códigos importados), toma el siguiente libre
    for (let i = 0; i < 50 && D.refl.some((r) => r.codigo === c.codigo); i++) c = await nuevoCodigo(campos.libro);
    const f = Object.assign({ estado: 'IDEA', fecha_creacion: hoy(), autor: D.usuario.nombre }, campos, { Title: c.codigo, codigo: c.codigo, num: c.num });
    Object.keys(f).forEach((k) => { if (f[k] === '' || f[k] === null || f[k] === undefined) delete f[k]; });
    if (f.fecha_creacion) f.fecha_creacion = f.fecha_creacion + 'T12:00:00Z';
    const it = await G.crear('RE_Reflexiones', f);
    const r = normal(Object.assign({}, it));
    D.refl.push(r);
    await registrar(r, 'Creada', 'Código ' + r.codigo + ' asignado' + (campos._origen ? ' · ' + campos._origen : ''));
    return r;
  }
  // Guarda campos con control de conflicto (si otro usuario la cambió, avisa)
  async function guardar(r, campos, accion, detalle) {
    const f = Object.assign({}, campos);
    ['fecha_creacion', 'fecha_prevista', 'fecha_publicacion'].forEach((k) => { if (k in f) f[k] = f[k] ? f[k] + 'T12:00:00Z' : null; });
    if ('contenido' in f) f.tiene_texto = !!String(f.contenido || '').replace(/<[^>]+>/g, '').trim();
    Object.keys(f).forEach((k) => { if (f[k] === '') f[k] = null; });
    await G.actualizar('RE_Reflexiones', r._id, f, r._etag);
    Object.assign(r, campos, 'contenido' in f ? { tiene_texto: f.tiene_texto } : {});
    await leerMeta(r);
    if (accion) await registrar(r, accion, detalle);
  }
  async function leerMeta(r) {
    const id = await G.listaId('RE_Reflexiones');
    const it = await G.llamar('GET', '/sites/' + await G.sitio(CFG.sitio.host, CFG.sitio.ruta) + '/lists/' + id + '/items/' + r._id + '?$select=id,lastModifiedDateTime');
    r._etag = it['@odata.etag'] || it.eTag; r._modificado = it.lastModifiedDateTime; r._editor = D.usuario.nombre;
  }
  async function eliminar(r) {
    await G.eliminar('RE_Reflexiones', r._id);
    D.refl = D.refl.filter((x) => x !== r);
    await registrar(r, 'Eliminada', 'Eliminada por ' + D.usuario.nombre + '. El código ' + r.codigo + ' no se reutiliza.');
  }

  // ---------- Aprobaciones ----------
  const aprobacionesDe = (r) => D.aprob.filter((a) => a.reflexion_id === r.codigo).sort((a, b) => String(b.fecha_hora).localeCompare(String(a.fecha_hora)));
  // Aprobación editorial vigente: la última decisión de la etapa EDITORIAL es «Aprobado»
  const aprobadaEditorial = (r) => { const a = aprobacionesDe(r).find((x) => x.etapa === 'EDITORIAL'); return a && a.decision === 'APROBADO' ? a : null; };
  async function aprobar(r, etapa, decision, comentarios) {
    const a = await G.crear('RE_Aprobaciones', { Title: r.codigo + '-' + etapa + '@' + Date.now(), reflexion_id: r.codigo, etapa, decision, aprobador: D.usuario.nombre, email: D.usuario.email, fecha_hora: ahora(), comentarios: comentarios || '' });
    D.aprob.push(a);
    return a;
  }

  // ---------- Distribución ----------
  async function distribucion(r) { return G.items('RE_Distribucion', { filtro: "fields/reflexion_id eq '" + r.codigo + "'", top: 100 }); }
  async function guardarDist(r, existentes, tipo, clave, campos) {
    const ex = existentes.find((x) => x.tipo === tipo && x.clave === clave);
    const f = Object.assign({ actualizado_por: D.usuario.nombre }, campos);
    if (f.fecha !== undefined) f.fecha = f.fecha ? f.fecha + 'T12:00:00Z' : null;
    if (ex) { await G.actualizar('RE_Distribucion', ex._id, f); Object.assign(ex, campos); return ex; }
    const n = await G.crear('RE_Distribucion', Object.assign({ Title: r.codigo + '|' + tipo + '|' + clave, reflexion_id: r.codigo, tipo, clave }, f));
    existentes.push(n); return n;
  }

  // ---------- Portadas (biblioteca Documentos del sitio) ----------
  async function subirPortada(r, archivo) {
    const ext = (/png/i.test(archivo.type) ? 'png' : /webp/i.test(archivo.type) ? 'webp' : 'jpg');
    const ruta = CFG.carpetaPortadas + '/' + slug(r) + '.' + ext;
    await G.subirArchivo(ruta, archivo);
    if (cacheImg[ruta]) { URL.revokeObjectURL(cacheImg[ruta]); delete cacheImg[ruta]; }
    return ruta;
  }
  const cacheImg = {};
  async function urlPortada(ruta) {
    if (!ruta) return '';
    if (cacheImg[ruta]) return cacheImg[ruta];
    const s = await G.sitio(CFG.sitio.host, CFG.sitio.ruta);
    const res = await fetch('https://graph.microsoft.com/v1.0/sites/' + s + '/drive/root:/' + ruta.split('/').map(encodeURIComponent).join('/') + ':/content', { headers: { Authorization: 'Bearer ' + await IC.auth.token() } });
    if (!res.ok) return '';
    cacheImg[ruta] = URL.createObjectURL(await res.blob());
    return cacheImg[ruta];
  }
  async function blobPortada(ruta) {
    const s = await G.sitio(CFG.sitio.host, CFG.sitio.ruta);
    const res = await fetch('https://graph.microsoft.com/v1.0/sites/' + s + '/drive/root:/' + ruta.split('/').map(encodeURIComponent).join('/') + ':/content', { headers: { Authorization: 'Bearer ' + await IC.auth.token() } });
    if (!res.ok) throw new Error('No se pudo descargar la portada');
    return res.blob();
  }

  // ---------- Colección en Desarrollo de Talento (visible para todo el personal, sin avisos) ----------
  // Copia de lo publicable en TAL_Coleccion (lista que lee todo el personal). Las listas RE_* siguen protegidas.
  async function itemTalento(r) { return (await G.items('TAL_Coleccion', { filtro: "fields/Title eq '" + r.codigo + "'" }))[0] || null; }
  async function publicarTalento(r) {
    await leer(r);
    let portada = '';
    if (r.portada) {
      try { const b = await blobPortada(r.portada); portada = CFG.carpetaTalento + '/' + slug(r) + '.' + (r.portada.split('.').pop() || 'jpg'); await G.subirArchivo(portada, b); }
      catch (e) { console.warn('portada', e); portada = ''; }
    }
    const f = { coleccion: CFG.coleccion.id, codigo: r.codigo, titulo: r.titulo_editorial || r.titulo || r.codigo, referencia: referenciaCompleta(r), libro: nombreLibro(r.libro), libro_orden: ordenLibro(r.libro),
      dimension: nombreDim(r.dimension), competencias: [r.competencia].concat(lista(r.competencias_sec)).filter(Boolean).join(';'), intro: r.intro || '', contenido: r.contenido || '', pregunta: r.pregunta || '',
      portada, fecha_publicacion: (r.fecha_publicacion || hoy()) + 'T12:00:00Z', estado: 'PUBLICADA', actualizado: ahora() };
    const ex = await itemTalento(r);
    if (ex) await G.actualizar('TAL_Coleccion', ex._id, f); else await G.crear('TAL_Coleccion', Object.assign({ Title: r.codigo }, f));
  }
  async function retirarTalento(r) {
    const ex = await itemTalento(r);
    if (ex && ex.estado !== 'RETIRADA') await G.actualizar('TAL_Coleccion', ex._id, { estado: 'RETIRADA', actualizado: ahora() });
  }

  // ---------- Permisos reales en SharePoint (API REST) ----------
  const lit = (t) => "'" + String(t).replace(/'/g, "''") + "'";
  async function sp(method, ruta, body, extra) {
    for (let i = 1; i <= 5; i++) {
      const h = Object.assign({ Authorization: 'Bearer ' + await IC.auth.tokenPara(CFG.spScopes), Accept: 'application/json;odata=nometadata' }, extra || {});
      if (body) h['Content-Type'] = 'application/json;odata=verbose';
      const res = await fetch(CFG.spWeb + '/_api/' + ruta, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
      if (res.status === 429 || res.status === 503) { await new Promise((ok) => setTimeout(ok, 1000 * i)); continue; }
      const txt = await res.text(); let data = {}; try { data = txt ? JSON.parse(txt) : {}; } catch (e) { data = {}; }
      if (!res.ok) { const m = data['odata.error'] && data['odata.error'].message && data['odata.error'].message.value; const err = new Error(m || ('SharePoint respondió ' + res.status)); err.status = res.status; throw err; }
      return data;
    }
    throw new Error('SharePoint no respondió a tiempo.');
  }
  const base = (l) => 'web/lists/getbytitle(' + lit(l) + ')';
  let rolesSP = null;
  async function roles() {
    if (!rolesSP) { rolesSP = {}; for (const t of [2, 3, 5]) rolesSP[t] = (await sp('GET', 'web/roledefinitions/getbytype(' + t + ')?$select=Id,Name')).Id; }
    return rolesSP;
  }
  // Estado de protección de las listas
  async function estadoProteccion() {
    const out = {};
    for (const l of CFG.listas) {
      try { out[l] = (await sp('GET', base(l) + '?$select=HasUniqueRoleAssignments')).HasUniqueRoleAssignments; } catch (e) { out[l] = null; }
    }
    return out;
  }
  // Deja las listas RE_* con permisos únicos: solo quien ejecuta (control total) + las personas con acceso activo
  async function proteger(log) {
    const R = await roles(), yo = await sp('GET', 'web/currentuser?$select=Id,Title');
    for (const l of CFG.listas) {
      const st = await sp('GET', base(l) + '?$select=HasUniqueRoleAssignments');
      if (!st.HasUniqueRoleAssignments) {
        await sp('POST', base(l) + '/breakroleinheritance(copyRoleAssignments=false,clearSubscopes=true)');
        const asig = ((await sp('GET', base(l) + '/roleassignments?$select=PrincipalId')).value || []).map((x) => x.PrincipalId);
        if (asig.indexOf(yo.Id) < 0) await sp('POST', base(l) + '/roleassignments/addroleassignment(principalid=' + yo.Id + ',roledefid=' + R[5] + ')');
        log(l + ': permisos únicos — solo ' + yo.Title + ' y las personas con acceso', 'ok');
      } else log(l + ': ya tenía permisos únicos', 'ok');
    }
    try { await sp('POST', base('RE_Reflexiones'), { __metadata: { type: 'SP.List' }, EnableVersioning: true, MajorVersionLimit: 100 }, { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' }); log('RE_Reflexiones: historial de versiones activado (100 versiones)', 'ok'); }
    catch (e) { log('RE_Reflexiones: no se pudo activar el historial de versiones (' + e.message + ')', 'warn'); }
    for (const a of D.accesos.filter((x) => x.estado === 'ACTIVO')) { await asignarSP(a.Title, a.rol); log(a.nombre + ': permisos de ' + nombreRol(a.rol) + ' aplicados', 'ok'); }
  }
  async function usuarioSP(email) {
    return sp('POST', 'web/ensureuser', { logonName: 'i:0#.f|membership|' + email });
  }
  async function quitarSP(principalId) {
    for (const l of CFG.listas) {
      try { await sp('POST', base(l) + '/roleassignments/getbyprincipalid(' + principalId + ')/deleteobject'); }
      catch (e) { if (e.status !== 404 && !/no se encuentra|not found|does not exist|no existe/i.test(e.message)) throw e; }
    }
  }
  async function asignarSP(email, rol) {
    const R = await roles(), u = await usuarioSP(email), mapa = CFG.permisos[rol];
    if (!mapa) throw new Error('Rol no válido');
    await quitarSP(u.Id);
    for (const l of CFG.listas) {
      const st = await sp('GET', base(l) + '?$select=HasUniqueRoleAssignments');
      if (!st.HasUniqueRoleAssignments) throw new Error('Las listas aún no están protegidas. Primero use «Proteger listas».');
      await sp('POST', base(l) + '/roleassignments/addroleassignment(principalid=' + u.Id + ',roledefid=' + R[mapa[l]] + ')');
    }
    return u;
  }
  const nombreRol = (r) => (CFG.roles.find((x) => x[0] === r) || [r, r])[1];
  async function darAcceso(email, nombre, rol) {
    email = String(email).trim().toLowerCase();
    if (email === D.usuario.email) throw new Error('No puede cambiar su propio acceso.');
    if (!email.endsWith(CFG.dominio)) throw new Error('Solo cuentas ' + CFG.dominio + '.');
    await asignarSP(email, rol);
    const ex = D.accesos.find((a) => a.Title === email);
    const linea = new Date().toLocaleString('es-CO') + ' · ' + nombreRol(rol) + ' · por ' + D.usuario.nombre;
    if (ex) await G.actualizar('RE_Accesos', ex._id, { nombre: nombre || ex.nombre, rol, estado: 'ACTIVO', otorgado_por: D.usuario.nombre, fecha_otorgado: ahora(), retirado_por: null, fecha_retiro: null, historial: (ex.historial ? ex.historial + '\n' : '') + linea });
    else await G.crear('RE_Accesos', { Title: email, nombre: nombre || email, rol, estado: 'ACTIVO', otorgado_por: D.usuario.nombre, fecha_otorgado: ahora(), historial: linea });
    await cargarAccesos();
  }
  async function quitarAcceso(email) {
    if (email === D.usuario.email) throw new Error('No puede retirarse el acceso a sí mismo.');
    const u = await usuarioSP(email);
    await quitarSP(u.Id);
    const ex = D.accesos.find((a) => a.Title === email);
    const linea = new Date().toLocaleString('es-CO') + ' · Acceso retirado · por ' + D.usuario.nombre;
    if (ex) await G.actualizar('RE_Accesos', ex._id, { estado: 'RETIRADO', retirado_por: D.usuario.nombre, fecha_retiro: ahora(), historial: (ex.historial ? ex.historial + '\n' : '') + linea });
    await cargarAccesos();
  }

  // ---------- Reglas del flujo ----------
  const puede = {
    editar: () => ['ADMIN', 'EDITOR', 'REVISOR'].indexOf(D.rol) >= 0,
    aprobar: () => ['ADMIN', 'REVISOR'].indexOf(D.rol) >= 0,
    admin: () => D.rol === 'ADMIN'
  };
  const editableTexto = (r) => ['IDEA', 'DESARROLLO', 'REV_BIBLICA', 'REV_EDITORIAL'].indexOf(r.estado) >= 0;
  // Qué le falta para pasar a revisión
  function faltantes(r) {
    const f = [];
    if (!r.titulo_editorial) f.push('título editorial');
    if (!r.tiene_texto) f.push('texto narrativo');
    if (!String(r.pregunta || '').trim()) f.push('pregunta final');
    if (!r.dimension) f.push('dimensión');
    if (!r.competencia) f.push('competencia principal');
    if (!r.capitulo) f.push('capítulo');
    return f;
  }
  // Visible al público: publicada, con aprobación editorial y fecha de publicación cumplida
  const publica = (r) => r.estado === 'PUBLICADA' && !!aprobadaEditorial(r) && !!r.fecha_publicacion && r.fecha_publicacion <= hoy();

  return { D, pad, hoy, dia, lista, textoFecha, nombreEstado, cargarReflexiones, leer, cargarCatalogos, sembrarCatalogos, cargarPrompts, promptVigente, guardarPrompt,
    cargarAccesos, cargarAprobaciones, asegurarSecuencia, normal, libro, nombreLibro, dim, nombreDim, referencia, referenciaCompleta, slug, nuevoCodigo, registrar, historial, versiones, version,
    crear, guardar, eliminar, LIMPIAR, aprobacionesDe, aprobadaEditorial, aprobar, distribucion, guardarDist, subirPortada, urlPortada, blobPortada,
    publicarTalento, retirarTalento, estadoProteccion, proteger, darAcceso, quitarAcceso, nombreRol, puede, editableTexto, faltantes, publica, ordenLibro };
})();
