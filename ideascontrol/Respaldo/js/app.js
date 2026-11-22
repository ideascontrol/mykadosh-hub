/* =====================================================================
   APP-117 · Respaldo de IC Apps
   1. Lee todas las listas visibles del sitio IC Apps (no hace falta mantener un listado: si mañana se crea una lista nueva, entra sola).
   2. Por cada lista guarda sus columnas (nombre, tipo, opciones, indexada) y todos sus ítems.
   3. Guarda los permisos: si la lista hereda o no, y qué grupo o persona tiene qué nivel; y los grupos del sitio con sus miembros.
   4. Opcional: copia los archivos de las bibliotecas de documentos del sitio (portadas, imágenes, adjuntos) en un ZIP.
   Resultado: un Excel para leer y un JSON completo (sirve para reconstruir), más el ZIP si se pidió.
   Solo lee: no cambia nada en SharePoint.
   ===================================================================== */
const App = { usuario: null };
(function () {
  const U = IC.ui, esc = U.esc, G = IC.graph;
  const pad = (n) => String(n).padStart(2, '0');
  const sello = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '_' + pad(d.getHours()) + pad(d.getMinutes()); };
  const cargar = (src) => new Promise((ok, mal) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar ' + src.split('/').pop() + '. Revise la conexión.')); document.head.appendChild(s); });
  let caja;
  const log = (t, tipo) => { const p = document.createElement('div'); p.className = 'rs-log ' + (tipo || ''); p.textContent = t; caja.appendChild(p); caja.scrollTop = caja.scrollHeight; };

  async function sp(ruta) {
    const r = await fetch(CFG.spWeb + '/_api/' + ruta, { headers: { Authorization: 'Bearer ' + await IC.auth.tokenPara(CFG.spScopes), Accept: 'application/json;odata=nometadata' } });
    if (!r.ok) throw new Error('SharePoint ' + r.status);
    return r.json();
  }
  const ROLES = { 1: 'Acceso limitado', 2: 'Leer', 3: 'Colaborar', 4: 'Diseñar', 5: 'Control total', 6: 'Editar' };

  async function permisos(titulo) {
    const base = "web/lists/getbytitle('" + titulo.replace(/'/g, "''") + "')";
    const l = await sp(base + '?$select=HasUniqueRoleAssignments');
    const a = (await sp(base + '/roleassignments?$expand=Member,RoleDefinitionBindings')).value || [];
    return { unicos: !!l.HasUniqueRoleAssignments, asignaciones: a.map((x) => ({ principal: x.Member && (x.Member.Title || x.Member.LoginName), tipo: x.Member && (x.Member.PrincipalType === 8 ? 'Grupo' : x.Member.PrincipalType === 1 ? 'Persona' : 'Otro'),
      correo: x.Member && x.Member.Email || '', niveles: (x.RoleDefinitionBindings || []).map((r) => r.Name || ROLES[r.RoleTypeKind] || r.RoleTypeKind) })) };
  }

  async function archivos(driveId, zip, carpeta, ruta, cuenta) {
    const hijos = await G.todas('/drives/' + driveId + (ruta ? '/root:/' + ruta.split('/').map(encodeURIComponent).join('/') + ':/children' : '/root/children') + '?$top=999');
    for (const h of hijos) {
      const r = (ruta ? ruta + '/' : '') + h.name;
      if (h.folder) { await archivos(driveId, zip, carpeta, r, cuenta); continue; }
      cuenta.inv.push({ biblioteca: carpeta, ruta: r, tamano_kb: Math.round((h.size || 0) / 1024), modificado: h.lastModifiedDateTime, por: h.lastModifiedBy && h.lastModifiedBy.user && h.lastModifiedBy.user.displayName || '' });
      if (!zip) continue;
      try {
        const res = await fetch('https://graph.microsoft.com/v1.0/drives/' + driveId + '/items/' + h.id + '/content', { headers: { Authorization: 'Bearer ' + await IC.auth.token() } });
        if (!res.ok) throw new Error(res.status);
        zip.file(carpeta + '/' + r, await res.blob()); cuenta.n++; cuenta.bytes += h.size || 0;
        if (cuenta.n % 20 === 0) log('  … ' + cuenta.n + ' archivos copiados');
      } catch (e) { log('  No se pudo copiar ' + carpeta + '/' + r + ' (' + e.message + ')', 'warn'); }
    }
  }

  const descargar = (blob, nombre) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); };
  const hoja = (wb, nombre, filas, anchos) => { const ws = XLSX.utils.json_to_sheet(filas.length ? filas : [{ '': 'Sin datos' }]); if (anchos) ws['!cols'] = anchos.map((w) => ({ wch: w })); XLSX.utils.book_append_sheet(wb, ws, nombre); };
  const valor = (v) => v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : (typeof v === 'string' && v.length > 32000 ? v.slice(0, 32000) + ' …[recortado en Excel; completo en el JSON]' : v);

  // Destino: carpeta elegida (disco interno, externo o USB; Chrome/Edge) o Descargas. Dentro se crea una subcarpeta por respaldo.
  const puedeCarpeta = typeof window.showDirectoryPicker === 'function';
  let destino = null;
  async function guardar(blob, nombre) {
    if (!destino) return descargar(blob, nombre);
    const w = await (await destino.getFileHandle(nombre, { create: true })).createWritable(); await w.write(blob); await w.close();
  }
  async function respaldar(b, conArchivos, raizDestino) {
    caja.innerHTML = ''; b.disabled = true;
    const t0 = Date.now(), st = sello();
    destino = null;
    if (raizDestino) { try { destino = await raizDestino.getDirectoryHandle('Respaldo_ICApps_' + st, { create: true }); } catch (e) { log('No se pudo crear la carpeta del respaldo (' + e.message + '). Se descarga en Descargas.', 'warn'); } }
    try {
      await Promise.all([window.XLSX ? null : cargar('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'), !conArchivos || window.JSZip ? null : cargar('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js')]);
      const sid = await G.sitio(CFG.sitio.host, CFG.sitio.ruta);
      const todas = await G.todas('/sites/' + sid + '/lists?$select=id,displayName,description,list,createdDateTime,lastModifiedDateTime&$top=200');
      const listas = todas.filter((l) => l.list && !l.list.hidden && l.list.template === 'genericList').sort((a, c) => a.displayName.localeCompare(c.displayName));
      const bibliotecas = todas.filter((l) => l.list && !l.list.hidden && l.list.template === 'documentLibrary');
      log('Sitio IC Apps: ' + listas.length + ' listas y ' + bibliotecas.length + ' biblioteca(s) de documentos.', 'tit');
      const R = { respaldo: { fecha: new Date().toISOString(), por: App.usuario.email, sitio: CFG.spWeb, version_app: CFG.app.version }, listas: [], grupos: [], archivos: [] };
      let permOk = true;
      for (const [i, l] of listas.entries()) {
        const cols = (await G.todas('/sites/' + sid + '/lists/' + l.id + '/columns?$top=500')).filter((c) => !c.readOnly || c.name === 'Title' || c.name === 'Created' || c.name === 'Modified');
        const items = await G.todas('/sites/' + sid + '/lists/' + l.id + '/items?$expand=fields&$top=999');
        const L = { nombre: l.displayName, descripcion: l.description || '', creada: l.createdDateTime, modificada: l.lastModifiedDateTime,
          columnas: cols.filter((c) => !c.hidden && CFG.omitir.indexOf(c.name) < 0).map((c) => ({ nombre: c.name, titulo: c.displayName, tipo: Object.keys(c).find((k) => ['text', 'number', 'dateTime', 'boolean', 'choice', 'lookup', 'personOrGroup', 'currency', 'calculated', 'hyperlinkOrPicture'].indexOf(k) >= 0) || '',
            multilinea: !!(c.text && c.text.allowMultipleLines), opciones: c.choice ? c.choice.choices : null, indexada: !!c.indexed, requerida: !!c.required, solo_lectura: !!c.readOnly })),
          items: items.map((x) => { const f = Object.assign({}, x.fields); CFG.omitir.forEach((k) => delete f[k]); return Object.assign({ _id: x.id }, f, { _creado_por: x.createdBy && x.createdBy.user && x.createdBy.user.email || '', _modificado_por: x.lastModifiedBy && x.lastModifiedBy.user && x.lastModifiedBy.user.email || '' }); }) };
        if (permOk) { try { L.permisos = await permisos(l.displayName); } catch (e) { permOk = false; log('No se pudieron leer los permisos (' + e.message + '). El respaldo sigue sin ellos.', 'warn'); } }
        R.listas.push(L);
        log((i + 1) + '/' + listas.length + ' · ' + l.displayName + ': ' + L.items.length + ' registros');
      }
      if (permOk) {
        try { R.grupos = ((await sp('web/sitegroups?$expand=Users')).value || []).map((g) => ({ grupo: g.Title, miembros: (g.Users || []).map((u) => u.Email || u.Title) })); }
        catch (e) { log('No se pudieron leer los grupos del sitio (' + e.message + ').', 'warn'); }
      }
      const zip = conArchivos ? new JSZip() : null, cuenta = { n: 0, bytes: 0, inv: R.archivos };
      for (const bl of bibliotecas) {
        try { const d = await G.llamar('GET', '/sites/' + sid + '/lists/' + bl.id + '/drive?$select=id'); log('Biblioteca «' + bl.displayName + '»' + (zip ? ': copiando archivos…' : ': inventario de archivos…')); await archivos(d.id, zip, bl.displayName, '', cuenta); }
        catch (e) { log('Biblioteca «' + bl.displayName + '»: ' + e.message, 'warn'); }
      }
      // Excel (para leer) — JSON (completo, para reconstruir) — ZIP (archivos)
      const wb = XLSX.utils.book_new();
      hoja(wb, 'Indice', [{ Lista: 'Respaldo del ' + new Date().toLocaleString('es-CO') + ' por ' + App.usuario.email, Descripcion: CFG.spWeb }].concat(R.listas.map((l) => ({ Lista: l.nombre, Descripcion: l.descripcion, Registros: l.items.length, Columnas: l.columnas.length,
        Permisos: l.permisos ? (l.permisos.unicos ? 'Propios' : 'Heredados del sitio') : '', 'Última modificación': l.modificada }))), [26, 70, 10, 10, 18, 22]);
      const cols = []; R.listas.forEach((l) => l.columnas.forEach((c) => cols.push({ Lista: l.nombre, Columna: c.nombre, Titulo: c.titulo, Tipo: c.tipo + (c.multilinea ? ' (multilínea)' : ''), Opciones: (c.opciones || []).join(' | '), Indexada: c.indexada ? 'Sí' : '', Requerida: c.requerida ? 'Sí' : '' })));
      hoja(wb, 'Columnas', cols, [24, 26, 26, 18, 60, 9, 9]);
      const per = []; R.listas.forEach((l) => (l.permisos ? l.permisos.asignaciones : []).forEach((a) => per.push({ Lista: l.nombre, Hereda: l.permisos.unicos ? 'No' : 'Sí', Quien: a.principal, Tipo: a.tipo, Correo: a.correo, Nivel: a.niveles.join(', ') })));
      hoja(wb, 'Permisos', per, [24, 8, 34, 9, 32, 24]);
      const gr = []; R.grupos.forEach((g) => (g.miembros.length ? g.miembros : ['(sin miembros)']).forEach((m) => gr.push({ Grupo: g.grupo, Miembro: m })));
      hoja(wb, 'Grupos', gr, [34, 40]);
      hoja(wb, 'Archivos', R.archivos.map((a) => ({ Biblioteca: a.biblioteca, Ruta: a.ruta, 'Tamaño KB': a.tamano_kb, Modificado: a.modificado, Por: a.por })), [20, 70, 10, 22, 26]);
      const usados = new Set(['Indice', 'Columnas', 'Permisos', 'Grupos', 'Archivos']);
      R.listas.forEach((l) => { let n = l.nombre.replace(/[\\/?*[\]:]/g, '_').slice(0, 31); let k = 2; while (usados.has(n)) n = n.slice(0, 28) + '_' + k++; usados.add(n); hoja(wb, n, l.items.map((x) => { const o = {}; Object.keys(x).forEach((c) => { o[c] = valor(x[c]); }); return o; })); });
      await guardar(new Blob([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'Respaldo_ICApps_' + st + '.xlsx');
      await guardar(new Blob([JSON.stringify(R, null, 1)], { type: 'application/json' }), 'Respaldo_ICApps_' + st + '.json');
      if (zip && cuenta.n) { log('Comprimiendo ' + cuenta.n + ' archivos…'); await guardar(await zip.generateAsync({ type: 'blob' }), 'Respaldo_ICApps_Archivos_' + st + '.zip'); }
      const tot = R.listas.reduce((s, l) => s + l.items.length, 0);
      log('Listo en ' + Math.round((Date.now() - t0) / 1000) + ' s: ' + R.listas.length + ' listas, ' + tot + ' registros' + (permOk ? ', permisos y grupos' : '') + ', ' + R.archivos.length + ' archivos' + (zip ? ' (' + Math.round(cuenta.bytes / 1048576) + ' MB copiados)' : ' (solo inventario)') + '.', 'ok');
      log(destino ? 'Guardado en la carpeta «' + (raizDestino.name || '') + '/' + destino.name + '».' : 'Quedó en Descargas. Muévalo a su OneDrive personal o a un disco externo, no al sitio IC Apps ni a GitHub.', 'ok');
    } catch (e) { console.error(e); log('Error: ' + U.mensajeError(e), 'err'); }
    b.disabled = false;
  }

  function vista(c) {
    c.innerHTML = '<div class="ic-barra"><div><h1 class="ic-titulo">Respaldo de IC Apps</h1><p class="ic-subtitulo" style="margin:0">Descarga a su computador una copia completa del sitio IC Apps. Solo lee: no cambia nada en SharePoint.</p></div></div>' +
      '<section class="ic-bloque"><div class="cuerpo"><p style="margin-top:0">Se descargan:</p><ul class="rs-ul">' +
      '<li><b>Excel</b> para leer: índice de listas, columnas de cada lista, permisos, grupos con sus miembros, inventario de archivos y una hoja con los datos de cada lista.</li>' +
      '<li><b>JSON</b> completo: el mismo contenido sin recortes. Es el que sirve para reconstruir el sitio si algo se pierde.</li>' +
      '<li><b>ZIP</b> con los archivos de las bibliotecas del sitio (portadas, imágenes, adjuntos), si marca la casilla.</li></ul>' +
      '<p class="rs-nota">El respaldo tiene información confidencial (faltas, novedades, precios). Guárdelo en su OneDrive personal o en un disco externo. No lo suba a GitHub ni a una carpeta compartida.</p>' +
      '<label class="rs-chk"><input type="checkbox" id="cArch" checked> Incluir los archivos de las bibliotecas (ZIP)</label>' +
      (puedeCarpeta ? '<div class="rs-dest"><b>Dónde guardar</b><label class="rs-chk"><input type="radio" name="dest" value="carpeta" checked> En la carpeta que yo elija: disco interno, disco externo o USB (se crea una subcarpeta con la fecha)</label><label class="rs-chk"><input type="radio" name="dest" value="descargas"> En Descargas</label></div>'
        : '<p class="sec" style="margin:10px 0 0">Se guarda en Descargas. Para elegir la carpeta o un disco externo, abra esta página en Chrome o Edge en el computador.</p>') +
      '<div style="margin-top:12px"><button class="ic-btn" id="bResp">Descargar respaldo</button></div></div></section>' +
      '<section class="ic-bloque"><div class="cab"><h2>Avance</h2></div><div class="cuerpo"><div id="rsLog" class="rs-caja"><div class="rs-log">Listo para empezar.</div></div></div></section>';
    caja = c.querySelector('#rsLog');
    const b = c.querySelector('#bResp');
    b.onclick = async () => {
      let dir = null;
      const r = c.querySelector('input[name=dest]:checked');
      if (puedeCarpeta && r && r.value === 'carpeta') {   // se elige antes de empezar (el navegador lo exige tras el clic)
        try { dir = await window.showDirectoryPicker({ id: 'ic-respaldo', mode: 'readwrite', startIn: 'documents' }); }
        catch (e) { if (e.name !== 'AbortError') U.aviso('No se pudo abrir la carpeta: ' + e.message, 'err'); return; }
      }
      respaldar(b, c.querySelector('#cArch').checked, dir);
    };
  }

  function encabezado() {
    const u = App.usuario;
    document.getElementById('encabezado').innerHTML = '<a href="#"><img class="logo" src="' + CFG.logo + '" alt="Ideas Control"></a>' +
      '<div class="app-nombre"><b>' + esc(CFG.app.nombre) + '</b><span>' + CFG.app.id + ' · v' + CFG.app.version + '</span></div><div class="espacio"></div>' +
      '<div class="ic-user">' + IC.portal.boton() + '<div class="datos"><b>' + esc(u.nombre) + '</b><span>Dirección de Operaciones</span></div>' +
      '<div class="ic-avatar" title="' + esc(u.email) + '">' + esc(U.fmt.iniciales(u.nombre)) + '</div><button class="ic-btn sec chico" id="btnSalir">Salir</button></div>';
    document.getElementById('encabezado').hidden = false;
    document.getElementById('btnSalir').onclick = () => IC.auth.salir();
  }
  async function arrancar() {
    const raiz = document.getElementById('contenido');
    U.pantalla(raiz, { logo: CFG.logo, cargando: true, titulo: 'Cargando…', texto: 'Conectando con Microsoft 365' });
    try {
      const cuenta = await IC.auth.iniciar(CFG.auth);
      if (!cuenta) { U.pantalla(raiz, { logo: CFG.logo, titulo: CFG.app.nombre, texto: 'Ingrese con su cuenta de Microsoft de Ideas Control.', boton: 'Iniciar sesión', alClic: () => IC.auth.entrar() }); return; }
      const email = String(cuenta.username || '').toLowerCase();
      if (CFG.admins.indexOf(email) < 0) { U.pantalla(raiz, { logo: CFG.logo, titulo: 'Sin acceso', texto: 'El respaldo es solo para la Dirección de Operaciones.', boton: 'Volver al portal', alClic: () => IC.portal.volver() }); return; }
      App.usuario = { email, nombre: cuenta.name || email };
      encabezado(); vista(raiz);
    } catch (e) { console.error(e); U.pantalla(raiz, { logo: CFG.logo, titulo: 'No se pudo cargar la app', texto: U.mensajeError(e), boton: 'Reintentar', alClic: () => location.reload() }); }
  }
  window.addEventListener('DOMContentLoaded', arrancar);
})();
