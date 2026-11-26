/* =====================================================================
   APP-114 · Proyectos — carpeta del proyecto en SharePoint (sitio Ideas Control)
   Al crear un proyecto se crea: 01_CLIENTES › [carpeta del cliente] › 02_Proyectos › [PRY-0001 Nombre del proyecto]
   - La carpeta del cliente se busca entre las que ya existen (por código de cliente, NIT o razón social).
     Si no existe, se crea con el mismo nombre que usa Comercial para guardar las cotizaciones: «[código o NIT] [RAZÓN SOCIAL]».
   - Nunca borra ni renombra nada; si una carpeta ya existe, la usa.
   ===================================================================== */
(function () {
  const G = IC.graph, U = IC.ui;
  const clave = (s) => U.norm(String(s || '')).replace(/[^a-z0-9]/g, '');
  const nombreCarpeta = (s) => String(s || '').replace(/["*:<>?\/\\|#%{}~]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\.+$/, '').slice(0, 80);
  const ruta = (partes) => partes.map(encodeURIComponent).join('/');
  let drive = null;

  async function biblioteca() {
    if (drive) return drive;
    const d = CFG.docs;
    const sitio = await G.llamar('GET', '/sites/' + d.host + ':' + d.ruta + '?$select=id');
    const drives = (await G.llamar('GET', '/sites/' + sitio.id + '/drives?$select=id,name,webUrl')).value || [];
    drive = drives.find((x) => clave(x.name) === clave(d.biblioteca) || clave(decodeURIComponent(String(x.webUrl || '').split('/').pop())) === clave(d.biblioteca));
    if (!drive) throw new Error('No se encontró la biblioteca ' + d.biblioteca + ' en el sitio Ideas Control.');
    return drive;
  }
  async function hijos(itemPath) {
    const base = '/drives/' + drive.id + (itemPath ? '/root:/' + ruta(itemPath) + ':' : '/root') + '/children?$select=name,folder,webUrl&$top=999';
    return (await G.todas(base)).filter((x) => x.folder);
  }
  // Carpeta del cliente que ya existe: empieza con su código o NIT, o tiene su razón social
  function buscarCliente(carpetas, emp) {
    const cod = clave(emp.codigo_cliente), cod2 = clave(emp.codigo_cliente_anterior), nit = clave(String(emp.nit || '').split('-')[0]), raz = clave(emp.razon_social);
    const pista = (x) => { const k = clave(x.name); return (cod && k.indexOf(cod) === 0) || (cod2 && k.indexOf(cod2) === 0) || (nit && nit.length >= 6 && k.indexOf(nit) >= 0) || (raz && raz.length >= 4 && k.indexOf(raz) >= 0); };
    return carpetas.find(pista) || null;
  }
  async function asegurar(padre, nombre) {
    try {
      return await G.llamar('POST', '/drives/' + drive.id + (padre.length ? '/root:/' + ruta(padre) + ':' : '/root') + '/children',
        { name: nombre, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' });
    } catch (e) {
      if (e.status !== 409) throw e;   // ya existe: se usa
      return await G.llamar('GET', '/drives/' + drive.id + '/root:/' + ruta(padre.concat([nombre])) + '?$select=name,webUrl');
    }
  }
  // Crea (o reutiliza) la carpeta del proyecto y devuelve { webUrl, ruta }
  async function crear(p, emp) {
    await biblioteca();
    const existente = buscarCliente(await hijos(null), emp || {});
    const cliente = existente ? existente.name : nombreCarpeta(((emp && (emp.codigo_cliente || emp.nit)) || '') + ' ' + ((emp && emp.razon_social) || p.cliente));
    if (!existente) await asegurar([], cliente);
    await asegurar([cliente], CFG.docs.subcarpeta);
    const it = await asegurar([cliente, CFG.docs.subcarpeta], nombreCarpeta(p.Title + ' ' + p.nombre));
    return { webUrl: it.webUrl, ruta: [CFG.docs.biblioteca, cliente, CFG.docs.subcarpeta, it.name].join(' › ') };
  }
  const explicar = (e) => e.status === 403 || e.status === 401 ? 'no tiene permiso para crear carpetas en ' + CFG.docs.biblioteca + ' (sitio Ideas Control)' : U.mensajeError(e);
  window.PRY_CARPETA = { crear, explicar };
})();
