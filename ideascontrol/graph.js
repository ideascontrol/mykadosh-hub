/* =====================================================================
   IDEAS CONTROL · Acceso a SharePoint con Microsoft Graph
   shared/js/graph.js — requiere shared/js/auth.js
   Las listas usan nombres internos sin tildes; Title guarda el ID de negocio.
   ===================================================================== */
window.IC = window.IC || {};
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
    const it = await llamar('POST', '/sites/' + sitioId + '/lists/' + await listaId(lista) + '/items', { fields: limpiar(campos) });
    return plano(it);
  }

  // etag opcional: si se envía y otro usuario modificó el registro, falla con 412 (conflicto)
  async function actualizar(lista, itemId, campos, etag) {
    return llamar('PATCH', '/sites/' + sitioId + '/lists/' + await listaId(lista) + '/items/' + itemId + '/fields', limpiar(campos, true), etag ? { 'If-Match': etag } : null);
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
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) v = v + 'T12:00:00Z';
      out[k] = v === '' ? null : v;
    });
    return out;
  }

  async function yo() { return llamar('GET', '/me?$select=displayName,mail,userPrincipalName,jobTitle'); }

  return { llamar, todas, sitio, listaId, items, contar, crear, actualizar, siguiente, yo };
})();
