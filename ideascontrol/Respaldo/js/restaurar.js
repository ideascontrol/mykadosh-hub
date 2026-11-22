/* =====================================================================
   APP-117 · Respaldo de IC Apps — RESTAURAR / SIMULACRO
   Toma el JSON de un respaldo (y opcionalmente el ZIP de archivos) y lo devuelve a un sitio de SharePoint.

   Reglas de seguridad (nunca daña lo que existe):
   • Nunca borra ni modifica nada. Solo CREA listas que no existen y CARGA registros en listas que existen VACÍAS.
     Una lista que ya tiene registros se omite completa (no se mezclan datos).
   • Los archivos solo se suben si no existe uno con la misma ruta.
   • Por defecto el destino es el sitio de PRUEBA (CFG.prueba). Restaurar en el sitio real IC Apps exige escribir RESTAURAR,
     y aun así aplica las mismas reglas (solo listas inexistentes o vacías).
   • Autor y fechas de creación/modificación se devuelven con ValidateUpdateListItem (sin crear versiones),
     para que cada persona vuelva a ver «lo suyo» en las listas donde solo se ve lo propio (Novedades, Lecturas).
   Al final compara campo por campo lo restaurado con el respaldo y muestra el resultado.
   ===================================================================== */
window.RS_RESTAURAR = (function () {
  const U = IC.ui, esc = U.esc, G = IC.graph;
  const SIS = ['Title'];   // única columna del sistema que se restaura
  let R = null, zipArch = null, caja, plan = null;
  const log = (t, tipo) => { const p = document.createElement('div'); p.className = 'rs-log ' + (tipo || ''); p.textContent = t; caja.appendChild(p); caja.scrollTop = caja.scrollHeight; };
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const host = () => CFG.sitio.host;

  // ---------- SharePoint REST del sitio destino ----------
  async function sp(web, method, ruta, body, extra) {
    for (let i = 1; i <= 6; i++) {
      const h = Object.assign({ Authorization: 'Bearer ' + await IC.auth.tokenPara(CFG.spScopes), Accept: 'application/json;odata=nometadata' }, extra || {});
      if (body) h['Content-Type'] = 'application/json;odata=verbose';
      const res = await fetch(web + '/_api/' + ruta, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
      if (res.status === 429 || res.status === 503) { await espera(1000 * Number(res.headers.get('Retry-After') || 2 * i)); continue; }
      const t = await res.text(); let d = {}; try { d = t ? JSON.parse(t) : {}; } catch (e) { d = {}; }
      if (!res.ok) { const m = d['odata.error'] && d['odata.error'].message && d['odata.error'].message.value; throw Object.assign(new Error(m || ('SharePoint respondió ' + res.status)), { status: res.status }); }
      return d;
    }
    throw new Error('SharePoint no respondió a tiempo.');
  }

  // ---------- Sitio de prueba ----------
  async function idSitio(ruta) { try { return (await G.llamar('GET', '/sites/' + host() + ':' + ruta + '?$select=id,webUrl')); } catch (e) { if (e.status === 404) return null; throw e; } }
  async function crearSitioPrueba(b) {
    const url = CFG.spRaiz + CFG.prueba.ruta;
    await U.conCarga(b, async () => {
      const r = await sp(CFG.spRaiz, 'POST', 'SPSiteManager/create', { request: { __metadata: { type: 'Microsoft.SharePoint.Portal.SPSiteCreationRequest' }, Title: CFG.prueba.titulo, Url: url, Lcid: 3082, ShareByEmailEnabled: false,
        Description: 'Sitio SOLO para simulacros de restauración de IC Apps. No usar para trabajo real.', WebTemplate: 'SITEPAGEPUBLISHING#0', Owner: App.usuario.email } });
      let st = r.SiteStatus;
      for (let i = 0; i < 30 && st !== 2; i++) { await espera(4000); st = (await sp(CFG.spRaiz, 'GET', "SPSiteManager/status?url='" + encodeURIComponent(url) + "'")).SiteStatus; }
      if (st !== 2) throw new Error('El sitio se está creando todavía. Espere un minuto y vuelva a «Revisar».');
    });
  }

  // ---------- Columnas: definición de Graph a partir del respaldo ----------
  function columnaGraph(c) {
    const d = { name: c.nombre, displayName: c.titulo || c.nombre };
    if (c.descripcion) d.description = c.descripcion;
    const t = c.tipo;
    if (t === 'text') d.text = c.multilinea ? { allowMultipleLines: true, linesForEditing: 6, textType: 'plain' } : {};
    else if (t === 'number') d.number = { decimalPlaces: c.decimales || 'automatic' };
    else if (t === 'dateTime') d.dateTime = { format: c.formato_fecha || 'dateTime' };
    else if (t === 'boolean') d.boolean = {};
    else if (t === 'choice') d.choice = { choices: c.opciones || [], displayAs: 'dropDownMenu', allowTextEntry: !!c.texto_libre };
    else if (t === 'currency') d.currency = {};
    else if (t === 'hyperlinkOrPicture') d.hyperlinkOrPicture = {};
    else d.text = { allowMultipleLines: true, textType: 'plain' };   // tipos especiales: se guardan como texto
    if (c.indexada) d.indexed = true;
    return d;
  }
  const restaurables = (L) => L.columnas.filter((c) => !c.solo_lectura && SIS.indexOf(c.nombre) < 0);

  // ---------- Paso 1: revisar (no escribe nada) ----------
  async function revisar(destRuta) {
    const sitio = await idSitio(destRuta);
    if (!sitio) return { sitio: null };
    const ex = await G.todas('/sites/' + sitio.id + '/lists?$select=id,displayName,list&$top=500');
    const filas = [];
    for (const L of R.listas) {
      const l = ex.find((x) => x.displayName === L.nombre);
      let n = 0;
      if (l) { const it = await G.llamar('GET', '/sites/' + sitio.id + '/lists/' + l.id + '/items?$top=1&$select=id'); n = (it.value || []).length; }
      filas.push({ L, id: l ? l.id : null, accion: !l ? 'crear' : n ? 'omitir' : 'cargar' });
    }
    return { sitio, filas };
  }

  // ---------- Paso 2: restaurar ----------
  async function lote(siteId, listId, items) {   // POST de 20 en 20 con $batch; devuelve los ids nuevos en el mismo orden
    const ids = new Array(items.length);
    for (let i = 0; i < items.length; i += 20) {
      let pend = items.slice(i, i + 20).map((f, k) => ({ id: String(i + k), method: 'POST', url: '/sites/' + siteId + '/lists/' + listId + '/items', headers: { 'Content-Type': 'application/json' }, body: { fields: f } }));
      for (let intento = 1; pend.length && intento <= 6; intento++) {
        const r = await G.llamar('POST', '/$batch', { requests: pend });
        const otra = []; let esperar = 0;
        for (const x of r.responses || []) {
          if (x.status >= 200 && x.status < 300) ids[+x.id] = x.body && x.body.id;
          else if (x.status === 429 || x.status === 503) { otra.push(pend.find((p) => p.id === x.id)); esperar = Math.max(esperar, Number((x.headers || {})['Retry-After'] || 3)); }
          else throw new Error('Registro ' + (+x.id + 1) + ': ' + ((x.body && x.body.error && x.body.error.message) || ('error ' + x.status)));
        }
        pend = otra; if (pend.length) await espera(esperar * 1000);
      }
      if (pend.length) throw new Error('Microsoft no aceptó todos los registros a tiempo.');
    }
    return ids;
  }
  function valorCampo(c, v) {
    if (v === null || v === undefined || v === '') return undefined;
    if (c && c.tipo === 'number' && typeof v === 'string' && v.trim() !== '' && !isNaN(+v)) return +v;
    if (typeof v === 'object') return JSON.stringify(v);
    return v;
  }
  // Fechas para ValidateUpdateListItem según la configuración regional del sitio (en UTC)
  function fechaSP(iso, locale, h24) {
    const d = new Date(iso); if (isNaN(d)) return null;
    const D = d.getUTCDate(), M = d.getUTCMonth() + 1, Y = d.getUTCFullYear(), H = d.getUTCHours(), mi = String(d.getUTCMinutes()).padStart(2, '0');
    if (locale === 1033) return M + '/' + D + '/' + Y + ' ' + ((H % 12) || 12) + ':' + mi + ' ' + (H < 12 ? 'AM' : 'PM');
    return D + '/' + M + '/' + Y + ' ' + (h24 === false ? ((H % 12) || 12) + ':' + mi + ' ' + (H < 12 ? 'a. m.' : 'p. m.') : H + ':' + mi);
  }

  async function restaurar(destRuta, real) {
    const t0 = Date.now(), rev = await revisar(destRuta);
    if (!rev.sitio) throw new Error('No existe el sitio ' + destRuta + '.');
    const sid = rev.sitio.id, web = rev.sitio.webUrl;
    log('Destino: ' + web + (real ? ' (SITIO REAL)' : ' (sitio de prueba)'), 'tit');
    let reg = null; try { const rs = await sp(web, 'GET', 'web/RegionalSettings?$select=LocaleId,Time24'); reg = { locale: rs.LocaleId, h24: rs.Time24 }; } catch (e) { log('No se pudo leer la configuración regional del sitio: las fechas de creación quedarán con la fecha de hoy.', 'warn'); }
    const usuarios = {}, sinUsuario = new Set();
    async function persona(email) {
      if (!email) return null;
      if (usuarios[email] !== undefined) return usuarios[email];
      try { await sp(web, 'POST', 'web/ensureuser', { logonName: 'i:0#.f|membership|' + email }); usuarios[email] = '[{"Key":"i:0#.f|membership|' + email + '"}]'; }
      catch (e) { usuarios[email] = null; sinUsuario.add(email); }
      return usuarios[email];
    }
    let fechasOk = !!reg, resumen = [];
    for (const f of rev.filas) {
      const L = f.L;
      if (f.accion === 'omitir') { log(L.nombre + ': ya tiene registros en el destino → se omite (no se toca).', 'warn'); resumen.push({ L, estado: 'Omitida (ya tenía datos)' }); continue; }
      let listId = f.id;
      if (f.accion === 'crear') {
        const cols = restaurables(L).map(columnaGraph);
        const nueva = await G.llamar('POST', '/sites/' + sid + '/lists', { displayName: L.nombre, description: L.descripcion || '', columns: cols, list: { template: 'genericList' } });
        listId = nueva.id; log(L.nombre + ': lista creada con ' + cols.length + ' columnas');
      } else {   // existe vacía: agrega las columnas que falten
        const ya = (await G.todas('/sites/' + sid + '/lists/' + listId + '/columns?$select=name&$top=500')).map((c) => c.name);
        for (const c of restaurables(L).filter((c) => ya.indexOf(c.nombre) < 0)) await G.llamar('POST', '/sites/' + sid + '/lists/' + listId + '/columns', columnaGraph(c));
      }
      const porNombre = {}; L.columnas.forEach((c) => { porNombre[c.nombre] = c; });
      const validas = restaurables(L).map((c) => c.nombre).concat(SIS);
      const campos = L.items.map((x) => { const o = {}; validas.forEach((k) => { const v = valorCampo(porNombre[k], x[k]); if (v !== undefined) o[k] = v; }); return o; });
      const ids = campos.length ? await lote(sid, listId, campos) : [];
      // Autor, editor y fechas originales
      let autores = 0;
      for (let i = 0; i < ids.length; i++) {
        const x = L.items[i], fv = [];
        const a = await persona(x._creado_por), e = await persona(x._modificado_por || x._creado_por);
        if (a) fv.push({ FieldName: 'Author', FieldValue: a }); if (e) fv.push({ FieldName: 'Editor', FieldValue: e });
        if (fechasOk && x.Created) fv.push({ FieldName: 'Created', FieldValue: fechaSP(x.Created, reg.locale, reg.h24) });
        if (fechasOk && x.Modified) fv.push({ FieldName: 'Modified', FieldValue: fechaSP(x.Modified, reg.locale, reg.h24) });
        if (!fv.length) continue;
        try {
          const r = await sp(web, 'POST', "web/lists/getbytitle('" + L.nombre.replace(/'/g, "''") + "')/items(" + ids[i] + ')/ValidateUpdateListItem',
            { formValues: fv.map((v) => Object.assign({ __metadata: { type: 'SP.ListItemFormUpdateValue' } }, v)), bNewDocumentUpdate: true, datesInUTC: true });
          const malos = (r.value || []).filter((v) => v.HasException);
          if (malos.some((v) => v.FieldName === 'Created' || v.FieldName === 'Modified') && fechasOk) { fechasOk = false; log('Las fechas originales no se pudieron devolver en este sitio; quedan con la fecha de la restauración (los datos no cambian).', 'warn'); }
          if (!malos.some((v) => v.FieldName === 'Author')) autores++;
          // Verifica la primera fecha devuelta: si no coincide, deja de intentarlo
          if (fechasOk && i === 0 && x.Created) {
            const chk = await sp(web, 'GET', "web/lists/getbytitle('" + L.nombre.replace(/'/g, "''") + "')/items(" + ids[i] + ')?$select=Created');
            if (Math.abs(new Date(chk.Created) - new Date(x.Created)) > 120000) { fechasOk = false; log('Las fechas originales no coinciden con el formato del sitio; las siguientes quedan con la fecha de la restauración.', 'warn'); }
          }
        } catch (err) { if (i === 0) log(L.nombre + ': no se pudo devolver el autor original (' + err.message + ').', 'warn'); }
      }
      // Seguridad por elemento (p. ej. «cada quien ve lo suyo»)
      const P = L.permisos || {};
      if (P.lectura_items > 1 || P.escritura_items > 1) {
        try { await sp(web, 'POST', "web/lists/getbytitle('" + L.nombre.replace(/'/g, "''") + "')", { __metadata: { type: 'SP.List' }, ReadSecurity: P.lectura_items || 1, WriteSecurity: P.escritura_items || 1 }, { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' }); }
        catch (e) { log(L.nombre + ': no se pudo aplicar «cada quien ve lo suyo» (' + e.message + ').', 'warn'); }
      }
      log(L.nombre + ': ' + ids.length + ' registros cargados' + (ids.length ? ' · autor original en ' + autores : ''), 'ok');
      resumen.push({ L, listId, estado: f.accion === 'crear' ? 'Creada y cargada' : 'Cargada' });
    }
    if (sinUsuario.size) log('Personas que ya no existen en Microsoft 365 (sus registros quedan a nombre de quien restaura): ' + Array.from(sinUsuario).join(', '), 'warn');
    // Archivos
    let nArch = 0, omit = 0;
    if (zipArch) {
      const d = await G.llamar('GET', '/sites/' + sid + '/drive?$select=id');
      const ent = Object.values(zipArch.files).filter((z) => !z.dir);
      log('Archivos: ' + ent.length + ' en el ZIP…');
      for (const z of ent) {
        const ruta = z.name.split('/').slice(1).join('/');   // «Documentos/…» → ruta dentro de la biblioteca principal
        if (!ruta) continue;
        const url = 'https://graph.microsoft.com/v1.0/drives/' + d.id + '/root:/' + ruta.split('/').map(encodeURIComponent).join('/') + ':/content?@microsoft.graph.conflictBehavior=fail';
        const res = await fetch(url, { method: 'PUT', headers: { Authorization: 'Bearer ' + await IC.auth.token() }, body: await z.async('blob') });
        if (res.status === 409) omit++; else if (res.ok) nArch++; else log('No se pudo subir ' + ruta + ' (' + res.status + ')', 'warn');
      }
      log('Archivos: ' + nArch + ' subidos' + (omit ? ', ' + omit + ' ya existían (no se reemplazaron)' : ''), 'ok');
    }
    log('Restauración terminada en ' + Math.round((Date.now() - t0) / 1000) + ' s. Ahora se verifica…', 'ok');
    return { sid, web, resumen };
  }

  // ---------- Paso 3: verificar campo por campo ----------
  const normal = (c, v) => {
    if (v === null || v === undefined || v === '') return '';
    if (c && c.tipo === 'dateTime') { const d = new Date(v); return isNaN(d) ? String(v) : d.toISOString().slice(0, 16); }
    if (c && c.tipo === 'number') return String(+v);
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v).replace(/\r\n/g, '\n');
  };
  async function verificar(sid, resumen) {
    const out = [];
    for (const r of resumen) {
      if (!r.listId) { out.push({ lista: r.L.nombre, estado: r.estado, resp: r.L.items.length, dest: '—', ok: '—', dif: '' }); continue; }
      const its = await G.todas('/sites/' + sid + '/lists/' + r.listId + '/items?$expand=fields&$top=999');
      const porNombre = {}; r.L.columnas.forEach((c) => { porNombre[c.nombre] = c; });
      const cols = restaurables(r.L).map((c) => c.nombre).concat(SIS);
      const usados = new Set(); let ok = 0; const dif = [];
      r.L.items.forEach((x, i) => {
        const y = its.find((z, k) => !usados.has(k) && z.fields.Title === x.Title && cols.every((c) => normal(porNombre[c], z.fields[c]) === normal(porNombre[c], valorCampo(porNombre[c], x[c]))));
        if (y) { usados.add(its.indexOf(y)); ok++; return; }
        const z = its.find((w, k) => !usados.has(k) && w.fields.Title === x.Title);
        if (dif.length < 3) dif.push((x.Title || ('#' + (i + 1))) + (z ? ': ' + cols.filter((c) => normal(porNombre[c], z.fields[c]) !== normal(porNombre[c], valorCampo(porNombre[c], x[c]))).join(', ') : ': no está'));
      });
      out.push({ lista: r.L.nombre, estado: r.estado, resp: r.L.items.length, dest: its.length, ok, dif: dif.join(' · ') });
    }
    return out;
  }

  // ---------- Vista ----------
  function vista(c) {
    c.innerHTML = '<div class="ic-chips" style="margin-bottom:14px"><button onclick="location.hash=\'\'">Respaldar</button><button class="activo">Restaurar / simulacro</button></div>' +
      '<div class="ic-barra"><div><h1 class="ic-titulo">Restaurar desde un respaldo</h1><p class="ic-subtitulo" style="margin:0">Nunca borra ni cambia nada: solo crea listas que no existen y carga registros en listas vacías.</p></div></div>' +
      '<section class="ic-bloque"><div class="cab"><h2>1. Archivos del respaldo</h2></div><div class="cuerpo">' +
        '<label class="rs-chk">Respaldo (.json): <input type="file" id="fJson" accept=".json,application/json"></label>' +
        '<label class="rs-chk">Archivos (.zip, opcional): <input type="file" id="fZip" accept=".zip"></label><div id="infoR" class="sec"></div></div></section>' +
      '<section class="ic-bloque"><div class="cab"><h2>2. Dónde restaurar</h2></div><div class="cuerpo">' +
        '<label class="rs-chk"><input type="radio" name="dst" value="prueba" checked> <span><b>Sitio de prueba</b> (' + esc(CFG.prueba.ruta) + ') — para el simulacro. No toca nada real.</span></label>' +
        '<label class="rs-chk"><input type="radio" name="dst" value="real"> <span><b>Sitio real IC Apps</b> — solo en una emergencia, cuando se perdió una lista. Las listas que tengan datos no se tocan.</span></label>' +
        '<div class="ic-acciones" style="margin-top:10px"><button class="ic-btn sec" id="bRev">Revisar (no cambia nada)</button></div><div id="plan"></div></div></section>' +
      '<section class="ic-bloque"><div class="cab"><h2>Avance</h2></div><div class="cuerpo"><div id="rsLog" class="rs-caja"><div class="rs-log">Cargue el respaldo y dé clic en «Revisar».</div></div></div></section><div id="verif"></div>';
    caja = c.querySelector('#rsLog'); plan = null;
    const destino = () => c.querySelector('input[name=dst]:checked').value;
    const ruta = () => destino() === 'real' ? CFG.sitio.ruta : CFG.prueba.ruta;
    c.querySelectorAll('input[name=dst]').forEach((x) => { x.onchange = () => { plan = null; c.querySelector('#plan').innerHTML = ''; }; });
    c.querySelector('#fJson').onchange = async (e) => {
      R = null; plan = null; c.querySelector('#plan').innerHTML = '';
      try {
        R = JSON.parse(await e.target.files[0].text());
        if (!R || !R.respaldo || !Array.isArray(R.listas)) throw new Error('Este archivo no es un respaldo de IC Apps.');
        c.querySelector('#infoR').textContent = 'Respaldo del ' + new Date(R.respaldo.fecha).toLocaleString('es-CO') + ' por ' + R.respaldo.por + ': ' + R.listas.length + ' listas, ' + R.listas.reduce((s, l) => s + l.items.length, 0) + ' registros.';
      } catch (err) { R = null; c.querySelector('#infoR').textContent = ''; U.aviso(err.message || 'No se pudo leer el archivo', 'err'); }
    };
    c.querySelector('#fZip').onchange = async (e) => {
      zipArch = null; const f = e.target.files[0]; if (!f) return;
      try { if (!window.JSZip) await new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar la librería ZIP.')); document.head.appendChild(s); });
        zipArch = await JSZip.loadAsync(f); U.aviso('ZIP listo: ' + Object.values(zipArch.files).filter((z) => !z.dir).length + ' archivos', 'ok'); }
      catch (err) { U.aviso(err.message, 'err'); }
    };
    c.querySelector('#bRev').onclick = (ev) => {
      if (!R) return U.aviso('Primero cargue el archivo .json del respaldo.', 'warn');
      U.conCarga(ev.currentTarget, async () => {
        const rv = await revisar(ruta()), P = c.querySelector('#plan');
        if (!rv.sitio) {
          P.innerHTML = destino() === 'prueba' ? '<p class="rs-nota">Todavía no existe el sitio de prueba ' + esc(CFG.prueba.ruta) + '. Puedo crearlo ahora (queda solo a su nombre, no se comparte con nadie).</p><button class="ic-btn" id="bSitio">Crear sitio de prueba</button>' : '<p class="rs-nota">No se encontró el sitio real.</p>';
          const bs = P.querySelector('#bSitio'); if (bs) bs.onclick = () => crearSitioPrueba(bs).then(() => { U.aviso('Sitio de prueba creado', 'ok'); c.querySelector('#bRev').click(); }).catch((e) => U.aviso(U.mensajeError(e) + ' Si su cuenta no puede crear sitios, créelo a mano en SharePoint (sitio de comunicación «' + CFG.prueba.titulo + '», dirección ' + CFG.prueba.ruta + ').', 'err', 12000));
          return;
        }
        plan = rv;
        const N = (a) => rv.filas.filter((f) => f.accion === a).length, ET = { crear: 'Se crea y se carga', cargar: 'Existe vacía: se carga', omitir: 'Tiene datos: NO se toca' };
        P.innerHTML = '<p style="margin:12px 0 6px"><b>' + esc(rv.sitio.webUrl) + '</b> · ' + N('crear') + ' listas nuevas · ' + N('cargar') + ' vacías por cargar · ' + N('omitir') + ' con datos (se omiten)</p>' +
          '<div class="ic-tabla-caja" style="max-height:300px;overflow:auto"><table class="ic-tabla"><thead><tr><th>Lista</th><th>Registros en el respaldo</th><th>Qué se hará</th></tr></thead><tbody>' +
          rv.filas.map((f) => '<tr><td>' + esc(f.L.nombre) + '</td><td>' + f.L.items.length + '</td><td' + (f.accion === 'omitir' ? ' class="sec"' : '') + '>' + ET[f.accion] + '</td></tr>').join('') + '</tbody></table></div>' +
          (destino() === 'real' ? '<p class="rs-nota" style="margin-top:10px">Va a escribir en el <b>sitio real</b>. Para confirmar, escriba <b>RESTAURAR</b>: <input id="cReal" style="width:140px"></p>' : '') +
          '<div class="ic-acciones" style="margin-top:10px"><button class="ic-btn" id="bRest"' + (N('crear') + N('cargar') ? '' : ' disabled') + '>Restaurar ahora</button></div>';
        P.querySelector('#bRest').onclick = (e2) => {
          if (destino() === 'real' && (P.querySelector('#cReal').value || '').trim() !== 'RESTAURAR') return U.aviso('Escriba RESTAURAR para confirmar.', 'warn');
          const b = e2.currentTarget; b.disabled = true; c.querySelector('#bRev').disabled = true; caja.innerHTML = '';
          restaurar(ruta(), destino() === 'real').then(async (res) => {
            const v = await verificar(res.sid, res.resumen), bien = v.every((x) => x.ok === '—' || x.ok === x.resp);
            log(bien ? 'Verificación: todo lo restaurado es igual al respaldo, campo por campo.' : 'Verificación: hay diferencias; revise la tabla.', bien ? 'ok' : 'err');
            c.querySelector('#verif').innerHTML = '<section class="ic-bloque"><div class="cab"><h2>3. Verificación</h2></div><div class="cuerpo"><div class="ic-tabla-caja"><table class="ic-tabla"><thead><tr><th>Lista</th><th>Estado</th><th>Respaldo</th><th>En el destino</th><th>Iguales</th><th>Diferencias</th></tr></thead><tbody>' +
              v.map((x) => '<tr><td>' + esc(x.lista) + '</td><td>' + esc(x.estado) + '</td><td>' + x.resp + '</td><td>' + x.dest + '</td><td' + (x.ok !== '—' && x.ok !== x.resp ? ' style="color:#b3261e;font-weight:700"' : '') + '>' + x.ok + '</td><td class="sec">' + esc(x.dif) + '</td></tr>').join('') + '</tbody></table></div>' +
              (destino() === 'prueba' ? '<p style="margin:12px 0 6px">Para comprobar que las apps funcionan con lo restaurado, ábralas contra el sitio de prueba. Se abre en una pestaña nueva con una franja roja «MODO PRUEBA»; en esa pestaña nada puede escribir en los datos reales.</p><button class="ic-btn" id="bPrueba">Abrir el portal en modo prueba</button>'
                : '<p class="rs-nota" style="margin-top:12px">Ahora ejecute «Aplicar permisos» en el Instalador de IC Apps (y en el de Comercial) para devolver los permisos de cada lista.</p>') + '</div></section>';
            const bp = c.querySelector('#bPrueba');
            if (bp) bp.onclick = () => {
              sessionStorage.setItem('ic_modo_prueba', JSON.stringify({ ruta: CFG.prueba.ruta, origen: CFG.sitio.ruta, siteId: res.sid, web: res.web }));
              window.open('/ideascontrol/Portal/', '_blank');
              sessionStorage.removeItem('ic_modo_prueba');
            };
          }).catch((e) => { console.error(e); log('Se detuvo: ' + U.mensajeError(e) + '. Lo que ya se cargó queda; puede volver a «Revisar»: las listas con datos se omiten.', 'err'); })
            .finally(() => { c.querySelector('#bRev').disabled = false; });
        };
      }).catch((e) => U.aviso(U.mensajeError(e), 'err'));
    };
  }
  return { vista, _columnaGraph: columnaGraph, _fechaSP: fechaSP };
})();
