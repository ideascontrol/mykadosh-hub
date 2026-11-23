/* =====================================================================
   IDEAS CONTROL · Acceso a SharePoint con Microsoft Graph
   shared/js/graph.js — requiere shared/js/auth.js
   Las listas usan nombres internos sin tildes; Title guarda el ID de negocio.
   ===================================================================== */
window.IC = window.IC || {};

/* ---------- MODO PRUEBA (simulacro de restauración) ----------
   Lo activa la app Respaldo › Restaurar, solo en la pestaña que abre (sessionStorage 'ic_modo_prueba').
   En modo prueba: el sitio IC Apps se reemplaza por el sitio de prueba, y TODA escritura que no vaya al sitio de prueba
   se bloquea (Graph, SharePoint y bibliotecas de otros sitios). Así ninguna prueba toca los datos reales. */
IC.prueba = (function () {
  let P = null; try { P = JSON.parse(sessionStorage.getItem('ic_modo_prueba') || 'null'); } catch (e) { P = null; }
  if (!P || !P.ruta || !P.siteId || !P.web) return null;
  const leer = (m) => !m || /^(GET|HEAD|OPTIONS)$/i.test(m);
  const fetch0 = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = String(typeof input === 'string' ? input : (input && input.url) || ''), m = (init && init.method) || (input && input.method) || 'GET';
    const permitido = leer(m) || url.indexOf('login.microsoftonline.com') >= 0 ||
      (url.indexOf('graph.microsoft.com') >= 0 && (url.indexOf('/sites/' + P.siteId) >= 0 || url.indexOf('/sites/' + encodeURIComponent(P.siteId)) >= 0)) ||
      url.indexOf(P.web + '/_api/') === 0;
    if (!permitido && (url.indexOf('graph.microsoft.com') >= 0 || url.indexOf('.sharepoint.com') >= 0)) {
      return Promise.reject(Object.assign(new Error('Modo prueba: esta acción escribiría fuera del sitio de prueba y se bloqueó para proteger los datos reales.'), { status: 403 }));
    }
    return fetch0(input, init);
  };
  function aviso() {
    if (document.getElementById('icPrueba')) return;
    const b = document.createElement('div'); b.id = 'icPrueba';
    b.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:5000;background:#b3261e;color:#fff;font:600 14px/1.4 Inter,system-ui,sans-serif;padding:8px 14px;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap;box-shadow:0 -2px 10px rgba(0,0,0,.25)';
    b.innerHTML = '<span>MODO PRUEBA · Está viendo el sitio de prueba (' + P.ruta + '), no los datos reales. Lo que guarde aquí no afecta IC Apps.</span>';
    const x = document.createElement('button'); x.textContent = 'Salir del modo prueba';
    x.style.cssText = 'background:#fff;color:#b3261e;border:0;border-radius:8px;padding:5px 12px;font-weight:700;cursor:pointer';
    x.onclick = () => { try { sessionStorage.removeItem('ic_modo_prueba'); } catch (e) { /* */ } location.reload(); };
    b.appendChild(x); document.body.appendChild(b); document.body.style.paddingBottom = '44px';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aviso); else aviso();
  return P;
})();

IC.graph = (function () {
  const BASE = 'https://graph.microsoft.com/v1.0';
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));

  async function llamar(method, path, body, headers) {
    for (let intento = 1; intento <= 6; intento++) {
      const h = Object.assign({ Authorization: 'Bearer ' + await IC.auth.token(), 'Content-Type': 'application/json' }, headers || {});
      const res = await fetch(path.startsWith('http') ? path : BASE + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
      if (res.status === 429 || res.status === 503 || res.status === 504) {
        await espera(1000 * Number(res.headers.get('Retry-After') || intento * 2)); continue;
      }
      const txt = await res.text();
      const data = txt ? JSON.parse(txt) : {};
      if (!res.ok) {
        const err = new Error((data.error && data.error.message) || ('Error ' + res.status));
        err.status = res.status; err.code = data.error && data.error.code; throw err;
      }
      return data;
    }
    throw new Error('Microsoft no respondió a tiempo. Intente de nuevo.');
  }

  async function todas(path, headers) {
    let url = path, out = [];
    while (url) { const d = await llamar('GET', url, null, headers); out = out.concat(d.value || []); url = d['@odata.nextLink'] || null; }
    return out;
  }

  // ---------- Sitio y listas ----------
  let sitioId = null; const listas = {};
  async function sitio(host, ruta) {
    if (IC.prueba && ruta === IC.prueba.origen) { sitioId = IC.prueba.siteId; return sitioId; }   // modo prueba: el sitio IC Apps es el de prueba
    if (!sitioId) sitioId = (await llamar('GET', '/sites/' + host + ':' + ruta + '?$select=id')).id;
    return sitioId;
  }
  async function listaId(nombre) {
    if (!listas[nombre]) {
      const r = await llamar('GET', '/sites/' + sitioId + '/lists?$select=id,displayName&$filter=displayName eq \'' + nombre + '\'');
      if (!r.value || !r.value.length) throw new Error('No existe la lista ' + nombre + ' en el sitio.');
      listas[nombre] = r.value[0].id;
    }
    return listas[nombre];
  }

  // Convierte un item de Graph en un objeto plano: campos + metadatos (_id, _etag, _creado, _modificado, _autor, _editor)
  function plano(it) {
    const o = Object.assign({}, it.fields || {});
    o._id = it.id; o._etag = it['@odata.etag'] || it.eTag;
    o._creado = it.createdDateTime; o._modificado = it.lastModifiedDateTime;
    o._autor = it.createdBy && it.createdBy.user ? it.createdBy.user.displayName : '';
    o._autor_email = it.createdBy && it.createdBy.user ? String(it.createdBy.user.email || '').toLowerCase() : '';
    o._editor = it.lastModifiedBy && it.lastModifiedBy.user ? it.lastModifiedBy.user.displayName : '';
    return o;
  }

  /**
   * Lee items. opciones: { filtro: "fields/estado eq 'ACTIVO'", orden: 'fields/Title', top: 500 }
   * Los filtros sobre columnas no indexadas funcionan en listas pequeñas (encabezado Prefer).
   */
  async function items(lista, opciones) {
    const o = opciones || {};
    let q = '/sites/' + sitioId + '/lists/' + await listaId(lista) + '/items?$expand=fields&$top=' + (o.top || 500);
    if (o.filtro) q += '&$filter=' + encodeURIComponent(o.filtro);
    if (o.orden) q += '&$orderby=' + encodeURIComponent(o.orden);
    const r = await todas(q, { Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly' });
    return r.map(plano);
  }

  async function contar(lista) {
    const r = await todas('/sites/' + sitioId + '/lists/' + await listaId(lista) + '/items?$select=id&$top=5000');
    return r.length;
  }

  async function crear(lista, campos) {
    let it;
    try { it = await llamar('POST', '/sites/' + sitioId + '/lists/' + await listaId(lista) + '/items', { fields: limpiar(campos) }); }
    catch (e) { e.lista = e.lista || lista; throw e; }
    return plano(it);
  }

  // etag opcional: si se envía y otro usuario modificó el registro, falla con 412 (conflicto)
  async function actualizar(lista, itemId, campos, etag) {
    try { return await llamar('PATCH', '/sites/' + sitioId + '/lists/' + await listaId(lista) + '/items/' + itemId + '/fields', limpiar(campos, true), etag ? { 'If-Match': etag } : null); }
    catch (e) { e.lista = e.lista || lista; throw e; }
  }

  // Siguiente número de una secuencia (SYS_Secuencias) con control de concurrencia
  async function siguiente(clave, inicial) {
    for (let i = 0; i < 10; i++) {
      const r = await items('SYS_Secuencias', { filtro: "fields/Title eq '" + clave + "'" });
      if (!r.length) {
        const n0 = inicial || 1;
        await crear('SYS_Secuencias', { Title: clave, ultimo_numero: n0 });
        return n0;
      }
      const n = Number(r[0].ultimo_numero || 0) + 1;
      try { await actualizar('SYS_Secuencias', r[0]._id, { ultimo_numero: n }, r[0]._etag); return n; }
      catch (e) { if (e.status === 412) { await espera(200 + Math.random() * 600); continue; } throw e; }
    }
    throw new Error('No se pudo asignar el consecutivo ' + clave + '. Intente de nuevo.');
  }

  // Fechas "solo día" (yyyy-mm-dd) se envían a las 12:00 UTC para no cambiar de día por zona horaria
  function limpiar(campos, permitirVacios) {
    const out = {};
    Object.keys(campos || {}).forEach((k) => {
      let v = campos[k];
      if (k.startsWith('_')) return;
      if ((v === '' || v === undefined) && !permitirVacios) return;
      if (v === undefined) return;
      if (k !== 'Title' && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) v = v + 'T12:00:00Z';   // Title es texto (ej. festivos)
      out[k] = v === '' ? null : v;
    });
    return out;
  }


  // Reserva un bloque de números de una secuencia (para cargas masivas). Devuelve el primero del bloque.
  async function reservar(clave, cantidad) {
    if (cantidad <= 0) return 0;
    for (let i = 0; i < 10; i++) {
      const r = await items('SYS_Secuencias', { filtro: "fields/Title eq '" + clave + "'" });
      if (!r.length) { await crear('SYS_Secuencias', { Title: clave, ultimo_numero: cantidad }); return 1; }
      const actual = Number(r[0].ultimo_numero || 0);
      try { await actualizar('SYS_Secuencias', r[0]._id, { ultimo_numero: actual + cantidad }, r[0]._etag); return actual + 1; }
      catch (e) { if (e.status === 412) { await espera(200 + Math.random() * 600); continue; } throw e; }
    }
    throw new Error('No se pudo reservar la numeración ' + clave + '. Intente de nuevo.');
  }

  // Sube un archivo (hasta 4 MB) a la biblioteca "Documentos" del sitio, en la ruta indicada (crea las carpetas).
  async function subirArchivo(ruta, archivo) {
    const url = BASE + '/sites/' + sitioId + '/drive/root:/' + ruta.split('/').map(encodeURIComponent).join('/') + ':/content';
    const res = await fetch(url, { method: 'PUT', headers: { Authorization: 'Bearer ' + await IC.auth.token(), 'Content-Type': archivo.type || 'application/octet-stream' }, body: archivo });
    if (!res.ok) { const t = await res.text(); const err = new Error('No se pudo guardar el archivo: ' + t.slice(0, 200)); err.status = res.status; throw err; }
    return res.json();
  }

  async function yo() { return llamar('GET', '/me?$select=displayName,mail,userPrincipalName,jobTitle'); }

  // Borra un item (solo para correcciones puntuales, p. ej. un festivo mal registrado)
  async function eliminar(lista, itemId) {
    return llamar('DELETE', '/sites/' + sitioId + '/lists/' + await listaId(lista) + '/items/' + itemId);
  }

  return { llamar, todas, sitio, listaId, items, contar, crear, actualizar, eliminar, siguiente, reservar, subirArchivo, yo };
})();
