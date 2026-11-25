/* =====================================================================
   APP-119 · Auditoría de registros
   Lee de SharePoint (sitio IC Apps), para un rango de fechas:
   - El historial de versiones de cada registro: quién lo creó, quién lo modificó y qué campos cambió (antes → después).
   - La papelera de reciclaje: quién eliminó qué.
   SharePoint lo anota solo con la cuenta de Microsoft de quien hace el cambio, en todas las apps, sin que la app pregunte.
   Si una lista no tiene activado el historial de versiones, se ve quién la creó y quién hizo la última modificación,
   pero no el detalle de campos: el botón «Activar historial» lo enciende (no borra ni cambia datos).
   Solo lee, salvo ese botón. Solo la Dirección de Operaciones.
   ===================================================================== */
const App = { usuario: null };
(function () {
  const U = IC.ui, esc = U.esc;
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const pad = (n) => String(n).padStart(2, '0');
  const hoyISO = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const S = { listas: [], eventos: [], filtrados: [], mostrar: 300, rango: null };

  // ---------- SharePoint REST ----------
  async function sp(ruta, cuerpo) {
    for (let intento = 1; intento <= 6; intento++) {
      const h = { Authorization: 'Bearer ' + await IC.auth.tokenPara(CFG.spScopes), Accept: 'application/json;odata=nometadata' };
      if (cuerpo) Object.assign(h, { 'Content-Type': 'application/json;odata=verbose', 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' });
      const ctl = new AbortController(), reloj = setTimeout(() => ctl.abort(), 45000);
      let r;
      try { r = await fetch(ruta.indexOf('http') === 0 ? ruta : CFG.spWeb + '/_api/' + ruta, { method: cuerpo ? 'POST' : 'GET', headers: h, body: cuerpo ? JSON.stringify(cuerpo) : undefined, signal: ctl.signal }); }
      catch (e) { clearTimeout(reloj); if (intento < 3 && e.name === 'AbortError') continue; throw e.name === 'AbortError' ? new Error('SharePoint tardó demasiado en responder.') : e; }
      clearTimeout(reloj);
      if (r.status === 429 || r.status === 503) { await espera(1000 * Number(r.headers.get('Retry-After') || intento * 2)); continue; }
      const txt = await r.text(); let d = {};
      try { d = txt ? JSON.parse(txt) : {}; } catch (e) { d = {}; }
      if (!r.ok) {
        const m = d['odata.error'] && d['odata.error'].message ? d['odata.error'].message.value : d.error && d.error.message ? (d.error.message.value || d.error.message) : '';
        const err = new Error(m || ('SharePoint respondió ' + r.status)); err.status = r.status; throw err;
      }
      return d;
    }
    throw new Error('SharePoint no respondió a tiempo. Intente de nuevo.');
  }
  async function spTodas(ruta) {
    let url = ruta, out = [];
    while (url) { const d = await sp(url); out = out.concat(d.value || []); url = d['odata.nextLink'] || d['@odata.nextLink'] || null; }
    return out;
  }
  async function enParalelo(arr, n, fn) {
    let i = 0;
    const trabajador = async () => { while (i < arr.length) { const k = i++; await fn(arr[k], k); } };
    await Promise.all(Array.from({ length: Math.min(n, arr.length) }, trabajador));
  }

  // ---------- Utilidades ----------
  const appDe = (lista) => { const m = CFG.apps.find((a) => lista.indexOf(a[0]) === 0); return m ? m[1] : 'Otras'; };
  const persona = (p) => p ? { nombre: p.LookupValue || p.Title || '', email: String(p.Email || p.EMail || '').toLowerCase() } : { nombre: '', email: '' };
  function valor(v) {
    if (v === null || v === undefined || v === '') return '';
    if (Array.isArray(v)) return v.map(valor).filter(Boolean).join('; ');
    if (typeof v === 'object') return v.LookupValue != null ? String(v.LookupValue) : v.Url ? String(v.Url) : v.Description ? String(v.Description) : '';
    if (typeof v === 'boolean') return v ? 'Sí' : 'No';
    if (typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/.test(v)) {
      const d = new Date(v); return d.getUTCHours() === 5 && d.getUTCMinutes() === 0 ? U.fmt.fecha(v) : U.fmt.fechaHora(v);
    }
    return String(v);
  }
  const corto = (t, n) => (t.length > (n || 140) ? t.slice(0, n || 140) + '…' : t);
  const fechaVersion = (v) => v.Modified || v.Created || '';

  // ---------- Lectura ----------
  async function leerListas() {
    const ls = await spTodas("web/lists?$select=Id,Title,EnableVersioning,MajorVersionLimit,ItemCount,LastItemModifiedDate,LastItemDeletedDate,Hidden,BaseTemplate,RootFolder/Name&$expand=RootFolder&$filter=Hidden eq false and BaseTemplate eq 100");
    S.listas = ls.map((l) => ({ id: l.Id, titulo: l.Title, carpeta: l.RootFolder && l.RootFolder.Name, versiones: !!l.EnableVersioning, limite: l.MajorVersionLimit, n: l.ItemCount, ultimo: l.LastItemModifiedDate, app: appDe(l.Title) }))
      .sort((a, b) => a.titulo.localeCompare(b.titulo));
  }
  async function campos(L) {
    if (L.campos) return L.campos;
    const fs = await spTodas("web/lists(guid'" + L.id + "')/fields?$select=InternalName,Title,Hidden,ReadOnlyField&$filter=Hidden eq false");
    L.campos = {};
    fs.forEach((f) => { if ((!f.ReadOnlyField || f.InternalName === 'Title') && ['ContentType', 'Attachments'].indexOf(f.InternalName) < 0) L.campos[f.InternalName] = f.Title; });
    return L.campos;
  }
  async function itemsModificados(L, desdeISO) {
    const base = "web/lists(guid'" + L.id + "')/items?$select=Id,Title,Created,Modified,Author/Title,Author/EMail,Editor/Title,Editor/EMail&$expand=Author,Editor&$top=5000";
    try { return await spTodas(base + "&$filter=Modified ge datetime'" + desdeISO + "'"); }
    catch (e) { if (e.status !== 500 && e.status !== 400) throw e; }   // lista grande sin índice: se lee todo y se filtra aquí
    return (await spTodas(base)).filter((x) => x.Modified >= desdeISO);
  }
  function evento(o) { return Object.assign({ cambios: [] }, o); }

  // Fase 1 (segundos): por cada lista, los registros creados o modificados en el rango → quién creó y quién hizo la última modificación.
  async function consultar(desde, hasta, prog) {
    const dISO = new Date(desde + 'T00:00:00').toISOString(), hISO = new Date(hasta + 'T23:59:59.999').toISOString();
    S.rango = { desde, hasta, dISO, hISO }; S.eventos = []; S.sinPapelera = false; S.porLista = {};
    prog(0, 'Leyendo las listas del sitio…');
    await leerListas();
    const activas = S.listas.filter((l) => l.ultimo && l.ultimo >= dISO && CFG.ignorar.indexOf(l.titulo) < 0);
    const pendientes = [];
    let k = 0;
    await enParalelo(activas, 6, async (L) => {
      const its = (await itemsModificados(L, dISO)).filter((x) => x.Created <= hISO);
      if (its.length) S.porLista[L.titulo] = its.length;
      its.forEach((x) => {
        const clave = L.id + ':' + x.Id, base = { clave, lista: L.titulo, app: L.app, registro: x.Title || ('#' + x.Id), itemId: x.Id };
        const conDetalle = L.versiones && CFG.sinDetalle.indexOf(L.titulo) < 0;
        rapido(x, base, conDetalle);
        if (conDetalle) pendientes.push({ L, x, base });
      });
      prog(Math.round(85 * ++k / activas.length), 'Buscando cambios: ' + k + ' de ' + activas.length + ' listas…');
    });
    prog(90, 'Revisando la papelera de reciclaje…');
    try {
      const porCarpeta = {}; S.listas.forEach((l) => { if (l.carpeta) porCarpeta[l.carpeta.toLowerCase()] = l; });
      const rb = await spTodas('web/RecycleBin?$select=Title,LeafName,DirName,DeletedDate,DeletedByName,DeletedByEmail,ItemType&$top=5000');
      rb.filter((r) => r.DeletedDate >= dISO && r.DeletedDate <= hISO).forEach((r) => {
        const nom = String(r.DirName || '').split('/').pop(), L = porCarpeta[nom.toLowerCase()];
        if (CFG.ignorar.indexOf(L ? L.titulo : nom) >= 0) return;
        S.eventos.push(evento({ fecha: r.DeletedDate, usuario: r.DeletedByName || '', email: String(r.DeletedByEmail || '').toLowerCase(), accion: 'Eliminó',
          lista: L ? L.titulo : nom, app: L ? L.app : appDe(nom), registro: r.Title || r.LeafName || '', version: '' }));
      });
    } catch (e) { console.warn('Papelera', e); S.sinPapelera = true; }
    prog(100, 'Listo');
    // Primero los más recientes: el detalle se completa en ese orden
    return pendientes.sort((a, b) => (a.x.Modified < b.x.Modified ? 1 : -1));
  }
  function rapido(x, base, pendiente) {
    const a = persona(x.Author), e = persona(x.Editor), { dISO, hISO } = S.rango;
    const marca = pendiente ? { pendiente: true } : { sinDetalle: true };
    if (x.Created >= dISO && x.Created <= hISO) S.eventos.push(evento(Object.assign({}, base, marca, { fecha: x.Created, usuario: a.nombre, email: a.email, accion: 'Creó', version: '' })));
    if (x.Modified >= dISO && x.Modified <= hISO && Math.abs(new Date(x.Modified) - new Date(x.Created)) > 3000)
      S.eventos.push(evento(Object.assign({}, base, marca, { fecha: x.Modified, usuario: e.nombre, email: e.email, accion: 'Modificó', version: '', ultima: true })));
  }
  // Fase 2 (en segundo plano): historial de versiones de cada registro → cada modificación con sus campos (antes → después).
  async function detallar(pend, avance, control) {
    const { dISO, hISO } = S.rango;
    let hechos = 0;
    await enParalelo(pend, 8, async ({ L, x, base }) => {
      if (control.parar) return;
      let nuevos = null;
      try {
        const mapa = await campos(L);
        const vs = ((await sp("web/lists(guid'" + L.id + "')/items(" + x.Id + ')/versions')).value || []).sort((a, b) => Number(a.VersionId) - Number(b.VersionId));
        if (vs.length) {
          nuevos = [];
          vs.forEach((v, k) => {
            const f = fechaVersion(v); if (!f || f < dISO || f > hISO) return;
            const p = persona(v.Editor), ant = k ? vs[k - 1] : null, cambios = [];
            Object.keys(mapa).forEach((c) => {
              const nv = valor(v[c]), av = ant ? valor(ant[c]) : '';
              if (ant ? nv !== av : nv !== '') cambios.push({ campo: mapa[c], antes: av, despues: nv });
            });
            const esCreacion = !ant && Math.abs(new Date(f) - new Date(x.Created)) < 5000;   // si el historial se activó después, la primera versión no es la creación
            if (ant && !cambios.length) return;   // versión sin cambios de datos
            nuevos.push(evento(Object.assign({}, base, { fecha: f, usuario: p.nombre, email: p.email, accion: esCreacion ? 'Creó' : 'Modificó', version: v.VersionLabel, cambios, sinAnterior: !ant && !esCreacion })));
          });
        }
      } catch (e) { console.warn(L.titulo, x.Id, e); }
      if (nuevos && nuevos.length) { S.eventos = S.eventos.filter((e) => e.clave !== base.clave); S.eventos.push(...nuevos); }
      else S.eventos.forEach((e) => { if (e.clave === base.clave) { e.pendiente = false; e.sinVersiones = true; } });
      avance(++hechos, pend.length);
    });
  }
  function evento(o) { return Object.assign({ cambios: [] }, o); }

  // ---------- Vista ----------
  function encabezado() {
    const u = App.usuario;
    document.getElementById('encabezado').innerHTML = '<a href="/ideascontrol/Portal/"><img class="logo" src="' + CFG.logo + '" alt="Ideas Control"></a>' +
      '<div class="app-nombre"><b>' + esc(CFG.app.nombre) + '</b><span>' + CFG.app.id + ' · v' + CFG.app.version + '</span></div><div class="espacio"></div>' +
      '<div class="ic-user">' + IC.portal.boton() + '<div class="datos"><b>' + esc(u.nombre) + '</b><span>Dirección de Operaciones</span></div>' +
      '<div class="ic-avatar" title="' + esc(u.email) + '">' + esc(U.fmt.iniciales(u.nombre)) + '</div><button class="ic-btn sec chico" id="btnSalir">Salir</button></div>';
    document.getElementById('encabezado').hidden = false;
    document.getElementById('btnSalir').onclick = () => IC.auth.salir();
  }

  function vista(c) {
    const hoy = new Date(), ini = new Date(Date.now() - CFG.diasPorDefecto * 864e5);
    c.innerHTML = '<div class="ic-barra"><div><h1 class="ic-titulo">Auditoría de registros</h1><p class="ic-subtitulo" style="margin:0">Quién creó, modificó o eliminó cada registro de las microapps. Lo anota SharePoint con la cuenta de cada persona.</p></div></div>' +
      '<div id="estadoHist"></div>' +
      '<div class="ic-form"><div class="au-filtros">' +
      '<label>Desde<input type="date" id="fDesde" value="' + hoyISO(ini) + '"></label><label>Hasta<input type="date" id="fHasta" value="' + hoyISO(hoy) + '"></label>' +
      '<label>App<select id="fApp"><option value="">Todas</option></select></label><label>Usuario<select id="fUsr"><option value="">Todos</option></select></label>' +
      '<label>Acción<select id="fAcc"><option value="">Todas</option><option>Creó</option><option>Modificó</option><option>Eliminó</option></select></label>' +
      '<button class="ic-btn" id="bConsultar">Consultar</button>' +
      '<label class="ancho">Buscar<input type="search" id="fTxt" placeholder="Registro, lista, campo o valor"></label>' +
      '<div class="ancho"></div><div class="ancho" style="text-align:right"><button class="ic-btn sec" id="bExcel" disabled>Descargar Excel</button></div>' +
      '</div><div class="au-prog" id="prog" hidden><div class="ic-barra-prog"><div id="progB"></div></div><p id="progT"></p></div></div>' +
      '<div id="resumen"></div><div id="tabla"></div>';
    estadoHistorial();
    U.$('#bConsultar', c).onclick = () => cargar(c);
    ['#fApp', '#fUsr', '#fAcc'].forEach((s) => { U.$(s, c).onchange = () => { S.mostrar = 300; filtrar(c); }; });
    let t; U.$('#fTxt', c).oninput = () => { clearTimeout(t); t = setTimeout(() => { S.mostrar = 300; filtrar(c); }, 250); };
    U.$('#bExcel', c).onclick = () => excel().catch((e) => U.aviso('No se pudo generar el Excel: ' + U.mensajeError(e), 'err', 7000));
    cargar(c);
  }

  async function estadoHistorial() {
    const z = document.getElementById('estadoHist');
    try {
      if (!S.listas.length) await leerListas();
      const sin = S.listas.filter((l) => !l.versiones);
      if (!sin.length) { z.innerHTML = '<div class="au-ok">✔ Las ' + S.listas.length + ' listas de IC Apps tienen activado el historial de cambios: se ve el detalle de cada campo modificado.</div>'; return; }
      z.innerHTML = '<div class="au-nota"><b>' + sin.length + ' de ' + S.listas.length + ' listas no tienen activado el historial de cambios.</b> En ellas se ve quién creó cada registro y quién hizo la última modificación, pero no el detalle de campos ni las modificaciones anteriores.' +
        '<details style="margin:6px 0"><summary>Ver listas</summary>' + sin.map((l) => esc(l.titulo) + ' <small>(' + esc(l.app) + ')</small>').join(' · ') + '</details>' +
        '<button class="ic-btn chico" id="bActivar">Activar historial en todas</button> <span style="font-size:13px">No borra ni cambia datos. El detalle empieza a guardarse desde que se activa.</span></div>';
      U.$('#bActivar', z).onclick = async () => {
        const ok = await U.confirmar('Activar historial de cambios', 'Se activará el historial de versiones en ' + sin.length + ' listas de IC Apps (hasta ' + CFG.versionesAGuardar + ' versiones por registro).\n\nNo borra ni cambia ningún dato. Desde ese momento SharePoint guarda cada modificación con quién la hizo y qué cambió.', 'Activar');
        if (!ok) return;
        const b = U.$('#bActivar', z); b.disabled = true; let n = 0, fallas = [];
        for (const l of sin) {
          b.textContent = 'Activando ' + (++n) + ' de ' + sin.length + '…';
          try { await sp("web/lists(guid'" + l.id + "')", { __metadata: { type: 'SP.List' }, EnableVersioning: true, MajorVersionLimit: CFG.versionesAGuardar }); l.versiones = true; }
          catch (e) { fallas.push(l.titulo + ': ' + U.mensajeError(e)); }
        }
        if (fallas.length) U.aviso('No se pudo activar en: ' + fallas.join(' · '), 'err', 12000); else U.aviso('Historial activado en ' + sin.length + ' listas', 'ok');
        S.listas = []; estadoHistorial();
      };
    } catch (e) { z.innerHTML = '<div class="au-nota">No se pudo revisar el historial de las listas: ' + esc(U.mensajeError(e)) + '</div>'; }
  }

  function opciones(c) {
    const opc = (sel, vals, todos) => { const v = sel.value; sel.innerHTML = '<option value="">' + todos + '</option>' + vals.map((x) => '<option value="' + esc(x[0]) + '">' + esc(x[1]) + '</option>').join(''); sel.value = vals.some((x) => x[0] === v) ? v : ''; };
    opc(U.$('#fApp', c), [...new Set(S.eventos.map((e) => e.app))].sort().map((a) => [a, a]), 'Todas');
    const us = {}; S.eventos.forEach((e) => { const k = e.email || e.usuario; if (k && !us[k]) us[k] = e.usuario || e.email; });
    opc(U.$('#fUsr', c), Object.keys(us).sort((a, x) => us[a].localeCompare(us[x])).map((k) => [k, us[k]]), 'Todos');
  }
  async function cargar(c) {
    const d = U.$('#fDesde', c).value, h = U.$('#fHasta', c).value;
    if (!d || !h || d > h) { U.aviso('Revise el rango de fechas', 'err'); return; }
    if (S.control) S.control.parar = true;
    const control = S.control = { parar: false };
    const b = U.$('#bConsultar', c), pr = U.$('#prog', c);
    b.disabled = true; U.$('#bExcel', c).disabled = true; pr.hidden = false; U.$('#tabla', c).innerHTML = ''; U.$('#resumen', c).innerHTML = '';
    const prog = (p, t) => { U.$('#progB', c).style.width = p + '%'; U.$('#progT', c).innerHTML = t; };
    try {
      const pend = await consultar(d, h, prog);
      if (control.parar) return;
      opciones(c); S.mostrar = 300; filtrar(c); U.$('#bExcel', c).disabled = !S.eventos.length; b.disabled = false;
      if (!pend.length) { setTimeout(() => { pr.hidden = true; }, 600); return; }
      // Detalle en segundo plano: la tabla ya se puede usar mientras tanto
      let ultimo = 0;
      const avance = (n, tot) => {
        if (control.parar) return;
        prog(Math.round(100 * n / tot), 'Completando el detalle de cambios: ' + n + ' de ' + tot + ' registros (los más recientes primero). Puede usar la tabla mientras tanto. <button class="ic-btn sec chico" id="bParar">Detener</button>');
        const bp = U.$('#bParar', c); if (bp) bp.onclick = () => { control.parar = true; S.eventos.forEach((e) => { if (e.pendiente) { e.pendiente = false; e.detenido = true; } }); filtrar(c); pr.hidden = true; };
        if (Date.now() - ultimo > 2000 || n === tot) { ultimo = Date.now(); opciones(c); filtrar(c); }
      };
      avance(0, pend.length);
      await detallar(pend, avance, control);
      if (!control.parar) { opciones(c); filtrar(c); setTimeout(() => { pr.hidden = true; }, 800); }
    } catch (e) { console.error(e); pr.hidden = true; U.$('#tabla', c).innerHTML = '<div class="ic-form">No se pudo consultar: ' + esc(U.mensajeError(e)) + '</div>'; }
    finally { b.disabled = false; }
  }

  function filtrar(c) {
    const app = U.$('#fApp', c).value, usr = U.$('#fUsr', c).value, acc = U.$('#fAcc', c).value, q = U.norm ? U.norm(U.$('#fTxt', c).value.trim()) : U.$('#fTxt', c).value.trim().toLowerCase();
    const n = (t) => (U.norm ? U.norm(String(t || '')) : String(t || '').toLowerCase());
    S.eventos.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
    S.filtrados = S.eventos.filter((e) => (!app || e.app === app) && (!usr || (e.email || e.usuario) === usr) && (!acc || e.accion === acc) &&
      (!q || n([e.registro, e.lista, e.app, e.usuario].concat(e.cambios.map((x) => x.campo + ' ' + x.antes + ' ' + x.despues)).join(' ')).indexOf(q) >= 0));
    const cuenta = (a) => S.filtrados.filter((e) => e.accion === a).length;
    U.$('#resumen', c).innerHTML = '<div class="au-res"><span><b>' + S.filtrados.length + '</b>eventos</span><span><b>' + cuenta('Creó') + '</b>creados</span><span><b>' + cuenta('Modificó') + '</b>modificados</span><span><b>' + cuenta('Eliminó') + '</b>eliminados</span>' +
      '<span><b>' + new Set(S.filtrados.map((e) => e.email || e.usuario)).size + '</b>personas</span></div>' +
      (Object.keys(S.porLista || {}).length ? '<details class="au-mas" style="margin:-4px 0 12px"><summary>Registros con cambios por lista</summary><p style="font-size:13px;margin:6px 0">' +
        Object.keys(S.porLista).sort((a, b) => S.porLista[b] - S.porLista[a]).map((l) => esc(l) + ': <b>' + S.porLista[l] + '</b>').join(' · ') + '</p></details>' : '') + (S.sinPapelera ? '<div class="au-nota">No se pudo leer la papelera de reciclaje: las eliminaciones no aparecen en esta consulta.</div>' : '');
    pintar(c);
  }

  function celdaCambios(e) {
    if (e.accion === 'Eliminó') return '<small>Enviado a la papelera de SharePoint (se puede restaurar desde ahí durante 93 días)</small>';
    if (e.pendiente) return '<small>' + (e.ultima ? 'Última modificación. ' : '') + 'Cargando el detalle…</small>';
    if (e.detenido) return '<small>' + (e.ultima ? 'Última modificación. ' : '') + 'Detalle no consultado (se detuvo la carga).</small>';
    if (e.sinVersiones) return '<small>' + (e.ultima ? 'Última modificación. ' : '') + 'SharePoint no tiene versiones guardadas de este registro.</small>';
    if (e.sinDetalle) return '<small>' + (e.ultima ? 'Última modificación. ' : '') + 'Sin detalle de campos: la lista no tiene historial de cambios activado.</small>';
    if (!e.cambios.length) return '';
    if (e.sinAnterior) e = Object.assign({}, e, { accion: 'Creó' });   // primera versión guardada: se muestran sus valores
    const li = (x) => '<li><i>' + esc(x.campo) + ':</i> ' + (e.accion === 'Creó' ? '<ins>' + esc(corto(x.despues)) + '</ins>' : (x.antes ? '<s>' + esc(corto(x.antes)) + '</s> → ' : '') + (x.despues ? '<ins>' + esc(corto(x.despues)) + '</ins>' : '<small style="display:inline">(vacío)</small>')) + '</li>';
    const tope = e.accion === 'Creó' ? 3 : 5;
    return '<ul class="au-cam">' + e.cambios.slice(0, tope).map(li).join('') + '</ul>' +
      (e.cambios.length > tope ? '<details class="au-mas"><summary>' + (e.cambios.length - tope) + ' campo(s) más</summary><ul class="au-cam">' + e.cambios.slice(tope).map(li).join('') + '</ul></details>' : '');
  }

  function pintar(c) {
    const z = U.$('#tabla', c), F = S.filtrados;
    if (!F.length) { z.innerHTML = '<div class="ic-form">' + (S.eventos.length ? 'Ningún evento coincide con los filtros.' : 'No hubo cambios en ese rango de fechas.') + '</div>'; return; }
    const acc = { 'Creó': 'c', 'Modificó': 'm', 'Eliminó': 'e' };
    z.innerHTML = '<div class="ic-tabla-caja"><table class="ic-tabla au-tabla"><colgroup><col class="c-f"><col class="c-u"><col class="c-a"><col class="c-r"><col class="c-l om"><col></colgroup><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Registro</th><th class="om">App · lista</th><th>Qué cambió</th></tr></thead><tbody>' +
      F.slice(0, S.mostrar).map((e) => { const d = new Date(e.fecha); return '<tr><td class="f">' + esc(d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })) +
        '<small>' + esc(d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })) + (e.version ? ' · v' + esc(e.version) : '') + '</small></td>' +
        '<td>' + esc(e.usuario || '—') + '<small>' + esc(e.email) + '</small></td><td><span class="au-acc ' + acc[e.accion] + '">' + e.accion + '</span></td>' +
        '<td><b>' + esc(e.registro) + '</b></td><td class="om">' + esc(e.app) + '<small>' + esc(e.lista) + '</small></td><td>' + celdaCambios(e) + '</td></tr>'; }).join('') +
      '</tbody></table></div>' + (F.length > S.mostrar ? '<p style="text-align:center"><button class="ic-btn sec" id="bMas">Ver ' + Math.min(300, F.length - S.mostrar) + ' más (de ' + (F.length - S.mostrar) + ')</button></p>' : '');
    const bm = U.$('#bMas', z); if (bm) bm.onclick = () => { S.mostrar += 300; pintar(c); };
  }

  // ---------- Excel: una fila por campo cambiado ----------
  function cargarXLSX() {
    if (window.XLSX) return Promise.resolve();
    return new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar la librería de Excel.')); document.head.appendChild(s); });
  }
  async function excel() {
    await cargarXLSX();
    const filas = [];
    S.filtrados.forEach((e) => {
      const base = { 'Fecha y hora': U.fmt.fechaHora(e.fecha), Usuario: e.usuario, Correo: e.email, Acción: e.accion, App: e.app, Lista: e.lista, Registro: e.registro, Versión: e.version || '' };
      if (!e.cambios.length) filas.push(Object.assign({}, base, { Campo: '', Antes: '', Después: '', Nota: e.sinDetalle ? 'Lista sin historial de cambios' : '' }));
      else e.cambios.forEach((x) => filas.push(Object.assign({}, base, { Campo: x.campo, Antes: x.antes, Después: x.despues, Nota: '' })));
    });
    const wb = XLSX.utils.book_new(), ws = XLSX.utils.json_to_sheet(filas);
    ws['!cols'] = [18, 24, 30, 10, 18, 22, 18, 8, 22, 40, 40, 26].map((w) => ({ wch: w }));
    ws['!autofilter'] = { ref: ws['!ref'] };
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoría');
    XLSX.writeFile(wb, 'Auditoria_ICApps_' + S.rango.desde + '_a_' + S.rango.hasta + '.xlsx');
  }

  async function arrancar() {
    const raiz = document.getElementById('contenido');
    U.pantalla(raiz, { logo: CFG.logo, cargando: true, titulo: 'Cargando…', texto: 'Conectando con Microsoft 365' });
    try {
      const cuenta = await IC.auth.iniciar(CFG.auth);
      if (!cuenta) { U.pantalla(raiz, { logo: CFG.logo, titulo: CFG.app.nombre, texto: 'Ingrese con su cuenta de Microsoft de Ideas Control.', boton: 'Iniciar sesión', alClic: () => IC.auth.entrar() }); return; }
      const email = String(cuenta.username || '').toLowerCase();
      if (CFG.admins.indexOf(email) < 0) { U.pantalla(raiz, { logo: CFG.logo, titulo: 'Sin acceso', texto: 'Esta sección es solo para la Dirección de Operaciones.', boton: 'Volver al portal', alClic: () => IC.portal.volver() }); return; }
      App.usuario = { email, nombre: cuenta.name || email };
      await IC.graph.sitio(CFG.sitio.host, CFG.sitio.ruta);
      encabezado(); vista(raiz);
    } catch (e) { console.error(e); U.pantalla(raiz, { logo: CFG.logo, titulo: 'No se pudo cargar', texto: U.mensajeError(e), boton: 'Reintentar', alClic: () => location.reload() }); }
  }
  window.addEventListener('DOMContentLoaded', arrancar);
})();
