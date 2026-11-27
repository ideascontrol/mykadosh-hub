/* =====================================================================
   APP-118 · Administrativos — Matriz de permisos y accesos
   Un solo lugar para dar y quitar, con un clic, cada opción del portal a cada persona.
   - Datos: lista SYS_Permisos de IC Apps (shared/js/permisos.js).
   - Solo la Dirección de Operaciones (CFG.admins). Su columna siempre tiene todo.
   - Los cambios se acumulan y se guardan con «Guardar cambios».
   - «Activar matriz»: desde ese momento las apps conectadas leen sus accesos de aquí.
   ===================================================================== */
(function () {
  const U = IC.ui, G = IC.graph, esc = U.esc, P = IC.permisos;
  const OPS = P.OPCIONES;
  let yo = null, filas = [], config = null, personas = [], cambios = {}, filtro = { q: '', area: '' };

  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const setDe = (p) => new Set(String(p.permisos || '').split(',').map((s) => s.trim()).filter(Boolean));
  const esSiempre = (p) => String(p.email).toLowerCase() === P.SIEMPRE;
  // Valor mostrado: el guardado, salvo que haya un cambio pendiente
  function tiene(p, id) {
    if (esSiempre(p)) return true;
    const c = cambios[p.email]; if (c && id in c) return c[id];
    return p.set.has(id);
  }
  const nCambios = () => Object.values(cambios).reduce((n, c) => n + Object.keys(c).length, 0);

  function encabezado() {
    document.getElementById('encabezado').innerHTML = '<a href="/ideascontrol/Portal/"><img class="logo" src="' + CFG.logo + '" alt="Ideas Control"></a>' +
      '<div class="app-nombre"><b>Matriz de permisos y accesos</b><span>' + CFG.app.id + ' · Administrativos</span></div><div class="espacio"></div>' +
      '<div class="ic-user">' + IC.portal.boton() + '<div class="datos"><b>' + esc(yo.nombre) + '</b><span>Dirección de Operaciones</span></div>' +
      '<div class="ic-avatar" title="' + esc(yo.email) + '">' + esc(U.fmt.iniciales(yo.nombre)) + '</div><button class="ic-btn sec chico" id="btnSalir">Salir</button></div>';
    document.getElementById('encabezado').hidden = false;
    document.getElementById('btnSalir').onclick = () => IC.auth.salir();
  }

  async function cargar() {
    filas = await G.items(P.LISTA, { top: 999 });
    config = filas.find((f) => f.Title === P.CONFIG) || null;
    personas = filas.filter((f) => f.Title !== P.CONFIG && f.estado !== 'INACTIVO')
      .map((f) => ({ id: f._id, etag: f._etag, email: String(f.Title || '').toLowerCase(), nombre: f.nombre || f.Title, permisos: f.permisos, set: setDe(f) }))
      .sort((a, b) => (esSiempre(b) - esSiempre(a)) || a.nombre.localeCompare(b.nombre));
    cambios = {};
  }

  // ---------- Vista ----------
  function vista(c) {
    const activa = !!(config && String(config.permisos || '').trim() === 'ACTIVA');
    const areas = []; OPS.forEach((o) => { if (areas.indexOf(o.area) < 0) areas.push(o.area); });
    c.innerHTML = '<a class="ic-volver" href="../">← Administrativos</a><h1 class="ic-titulo">Matriz de permisos y accesos</h1>' +
      '<p class="ic-subtitulo">Cada fila es una opción del portal y cada columna una persona. Un clic da o quita el acceso; los cambios se aplican al guardar.</p>' +
      '<div class="mx-estado ' + (activa ? 'on' : 'off') + '"><b>' + (activa ? '● Matriz activa' : '○ Matriz sin activar') + '</b><span>' +
      (activa ? 'El portal, Novedades y Programación toman los accesos de esta matriz.' : 'Las apps siguen con sus reglas anteriores. Revise la matriz y actívela cuando esté lista.') +
      '</span><span class="esp"></span><button class="ic-btn ' + (activa ? 'sec' : '') + ' chico" id="bAct">' + (activa ? 'Desactivar' : 'Activar matriz') + '</button></div>' +
      '<div class="mx-barra"><input type="search" id="fQ" placeholder="Buscar opción o app…" value="' + esc(filtro.q) + '">' +
      '<select id="fA"><option value="">Todas las áreas</option>' + areas.map((a) => '<option' + (a === filtro.area ? ' selected' : '') + '>' + esc(a) + '</option>').join('') + '</select>' +
      '<span class="esp"></span><button class="ic-btn sec chico" id="bAdd">+ Agregar persona</button><button class="ic-btn sec chico" id="bXls">⬇ Excel</button>' +
      '<button class="ic-btn sec chico" id="bDesc" hidden>Descartar</button><button class="ic-btn chico" id="bGuardar" disabled>Guardar cambios</button></div>' +
      '<div class="mx-caja"><table class="mx-t" id="tM"></table></div>' +
      '<p class="mx-nota">✔ = tiene acceso · el borde dorado marca un cambio sin guardar. «Todo» en el encabezado de una app da o quita todas sus opciones a esa persona. ' +
      'La columna de la Dirección de Operaciones siempre tiene todo. Fase 1: leen esta matriz el portal, Novedades y Programación; las demás apps se conectan en la siguiente fase.</p>';
    tabla(c.querySelector('#tM'));
    c.querySelector('#fQ').oninput = (e) => { filtro.q = e.target.value; aplicarFiltro(c); };
    c.querySelector('#fA').onchange = (e) => { filtro.area = e.target.value; aplicarFiltro(c); };
    c.querySelector('#bGuardar').onclick = () => U.conCarga(c.querySelector('#bGuardar'), () => guardar(c));
    c.querySelector('#bDesc').onclick = () => { cambios = {}; vista(c); };
    c.querySelector('#bAdd').onclick = () => agregarPersona(c);
    c.querySelector('#bXls').onclick = excel;
    c.querySelector('#bAct').onclick = () => activar(c, !activa);
    aplicarFiltro(c); barra(c);
  }

  function tabla(t) {
    let h = '<thead><tr><th class="op">Opción</th>' + personas.map((p, i) => '<th>' + esc(p.nombre) + '<small>' + esc(p.email || 'sin correo') + '</small>' +
      (esSiempre(p) ? '<small>siempre todo</small>' : '<button class="mx-x" data-quitar="' + i + '">quitar</button>') + '</th>').join('') + '</tr></thead><tbody>';
    let area = null, app = null;
    OPS.forEach((o) => {
      if (o.area !== area) { area = o.area; app = null; h += '<tr class="area" data-area="' + esc(area) + '"><td colspan="' + (personas.length + 1) + '">' + esc(area) + '</td></tr>'; }
      if (o.cod !== app) {
        app = o.cod;
        h += '<tr class="app" data-area="' + esc(area) + '" data-app="' + esc(o.cod) + '" data-txt="' + esc(norm(o.app + ' ' + o.cod)) + '"><td class="op">' + esc(o.app) + '<small>' + esc(o.cod) + '</small></td>' +
          personas.map((p, i) => '<td class="mx-c">' + (esSiempre(p) ? '' : '<button class="mx-a" data-todo="' + i + '" data-cod="' + esc(o.cod) + '" title="Dar o quitar todas las opciones de ' + esc(o.app) + '">Todo</button>') + '</td>').join('') + '</tr>';
      }
      h += '<tr data-area="' + esc(area) + '" data-app="' + esc(o.cod) + '" data-txt="' + esc(norm(o.app + ' ' + o.cod + ' ' + o.op + ' ' + o.desc)) + '"><td class="op"><b>' + esc(o.op) + '</b><span>' + esc(o.tipo + ' · ' + o.desc) + '</span></td>' +
        personas.map((p, i) => '<td class="mx-c">' + celda(p, i, o.id) + '</td>').join('') + '</tr>';
    });
    t.innerHTML = h + '</tbody>';
    t.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.op) { const p = personas[+b.dataset.p]; marcar(p, b.dataset.op, !tiene(p, b.dataset.op)); refrescar(t.closest('main')); }
      else if (b.dataset.todo) {
        const p = personas[+b.dataset.todo], ids = OPS.filter((o) => o.cod === b.dataset.cod).map((o) => o.id);
        const valor = !ids.every((id) => tiene(p, id)); ids.forEach((id) => marcar(p, id, valor)); refrescar(t.closest('main'));
      } else if (b.dataset.quitar) quitarPersona(t.closest('main'), personas[+b.dataset.quitar]);
    };
  }
  function celda(p, i, id) {
    const si = tiene(p, id), cambio = cambios[p.email] && id in cambios[p.email];
    return '<button class="mx-b' + (si ? ' si' : '') + (cambio ? ' cambio' : '') + '" data-p="' + i + '" data-op="' + esc(id) + '"' + (esSiempre(p) ? ' disabled title="La Dirección de Operaciones siempre tiene todo"' : '') + '>' + (si ? '✔' : '—') + '</button>';
  }
  function marcar(p, id, valor) {
    if (esSiempre(p)) return;
    const c = cambios[p.email] = cambios[p.email] || {};
    if (p.set.has(id) === valor) delete c[id]; else c[id] = valor;
    if (!Object.keys(c).length) delete cambios[p.email];
  }
  function refrescar(c) {
    c.querySelectorAll('button[data-op]').forEach((b) => { const td = b.parentNode; td.innerHTML = celda(personas[+b.dataset.p], +b.dataset.p, b.dataset.op); });
    barra(c);
  }
  function barra(c) {
    const n = nCambios(), g = c.querySelector('#bGuardar');
    g.disabled = !n; g.innerHTML = 'Guardar cambios' + (n ? ' <span class="mx-pend">' + n + '</span>' : '');
    c.querySelector('#bDesc').hidden = !n;
  }
  function aplicarFiltro(c) {
    const q = norm(filtro.q);
    const visibles = new Set();
    c.querySelectorAll('#tM tbody tr:not(.area):not(.app)').forEach((tr) => {
      const ok = (!filtro.area || tr.dataset.area === filtro.area) && (!q || tr.dataset.txt.indexOf(q) >= 0);
      tr.classList.toggle('oculto', !ok); if (ok) { visibles.add(tr.dataset.app); visibles.add('A:' + tr.dataset.area); }
    });
    c.querySelectorAll('#tM tr.app').forEach((tr) => tr.classList.toggle('oculto', !visibles.has(tr.dataset.app)));
    c.querySelectorAll('#tM tr.area').forEach((tr) => tr.classList.toggle('oculto', !visibles.has('A:' + tr.dataset.area)));
  }

  // ---------- Guardar ----------
  async function guardar(c) {
    const lista = Object.keys(cambios);
    for (const email of lista) {
      const p = personas.find((x) => x.email === email); if (!p) continue;
      const set = new Set(p.set); Object.entries(cambios[email]).forEach(([id, v]) => { if (v) set.add(id); else set.delete(id); });
      const valor = OPS.map((o) => o.id).filter((id) => set.has(id)).join(',');
      await G.actualizar(P.LISTA, p.id, { permisos: valor }, p.etag);
    }
    await cargar(); vista(c);
    U.aviso('Matriz guardada (' + lista.length + ' persona' + (lista.length === 1 ? '' : 's') + '). Los cambios aplican la próxima vez que cada persona abra el portal o la app.', 'ok', 7000);
  }

  async function activar(c, on) {
    if (nCambios()) { U.aviso('Primero guarde o descarte los cambios pendientes.', 'warn'); return; }
    const ok = await U.confirmar(on ? 'Activar la matriz' : 'Desactivar la matriz', on
      ? 'Desde ahora el portal, Novedades y Programación mostrarán a cada persona solo lo que esta matriz le da.\n\nRevise que cada persona tenga lo que necesita antes de activar.'
      : 'Las apps volverán a sus reglas anteriores (roles de cada app). La matriz se conserva.', on ? 'Activar' : 'Desactivar', !on);
    if (!ok) return;
    const v = on ? 'ACTIVA' : 'INACTIVA';
    if (config) await G.actualizar(P.LISTA, config._id, { permisos: v }); else await G.crear(P.LISTA, { Title: P.CONFIG, nombre: 'Configuración de la matriz', permisos: v, estado: 'ACTIVO' });
    await cargar(); vista(c); U.aviso(on ? 'Matriz activa.' : 'Matriz desactivada.', 'ok');
  }

  // ---------- Personas ----------
  async function personalIC() {
    const [tec, usr] = await Promise.all([G.items('OPE_Tecnicos').catch(() => []), G.items('SYS_Usuarios').catch(() => [])]);
    const m = new Map();
    tec.filter((t) => t.email && t.estado !== 'INACTIVO').forEach((t) => m.set(t.email.toLowerCase(), t.nombre));
    usr.filter((u) => u.email && u.estado === 'ACTIVO').forEach((u) => { if (!m.has(u.email.toLowerCase())) m.set(u.email.toLowerCase(), u.nombre || u.email); });
    return Array.from(m, ([email, nombre]) => ({ email, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
  async function agregarPersona(c) {
    const ya = new Set(personas.map((p) => p.email));
    const lista = (await personalIC()).filter((x) => !ya.has(x.email));
    U.modal('Agregar persona', '<form class="ic-form" id="fP"><div class="ic-campos">' +
      (lista.length ? U.campo({ name: 'sel', label: 'Del personal de IC', t: 'select', op: [['', 'Escribir nombre y correo…']].concat(lista.map((x) => [x.email, x.nombre + ' · ' + x.email])), c: 'c12' }) : '') +
      U.campo({ name: 'nombre', label: 'Nombre', c: 'c6' }) + U.campo({ name: 'email', label: 'Correo de Microsoft de IC', t: 'email', c: 'c6' }) +
      '</div><p class="mx-nota">Entra sin ninguna opción marcada: después márquele lo que necesita.</p><div class="ic-acciones"><button type="button" class="ic-btn sec" id="pCan">Cancelar</button><button class="ic-btn" id="pOk">Agregar</button></div></form>', (m) => {
      const f = m.querySelector('#fP'), sel = f.querySelector('[name=sel]');
      if (sel) sel.onchange = () => { const x = lista.find((y) => y.email === sel.value); f.nombre.value = x ? x.nombre : ''; f.email.value = x ? x.email : ''; };
      m.querySelector('#pCan').onclick = U.cerrarModal || (() => document.getElementById('ic-modal').remove());
      f.onsubmit = async (e) => {
        e.preventDefault();
        const nombre = f.nombre.value.trim(), email = f.email.value.trim().toLowerCase();
        if (!nombre || !/^[^@\s]+@ideascontrol\.com$/.test(email)) { U.aviso('Escriba el nombre y un correo @ideascontrol.com.', 'warn'); return; }
        if (ya.has(email)) { U.aviso('Esa persona ya está en la matriz.', 'warn'); return; }
        await U.conCarga(m.querySelector('#pOk'), async () => {
          const prev = filas.find((x) => String(x.Title || '').toLowerCase() === email);
          if (prev) await G.actualizar(P.LISTA, prev._id, { nombre, estado: 'ACTIVO', permisos: '' });
          else await G.crear(P.LISTA, { Title: email, nombre, permisos: '', estado: 'ACTIVO' });
          document.getElementById('ic-modal').remove(); await cargar(); vista(c); U.aviso(nombre + ' agregado a la matriz.', 'ok');
        });
      };
    });
  }
  async function quitarPersona(c, p) {
    if (nCambios()) { U.aviso('Primero guarde o descarte los cambios pendientes.', 'warn'); return; }
    if (!await U.confirmar('Quitar de la matriz', 'Se quitan todos los accesos de ' + p.nombre + ' (' + p.email + ').\nPodrá volver a agregarlo después.', 'Quitar', true)) return;
    await G.actualizar(P.LISTA, p.id, { estado: 'INACTIVO', permisos: '' }, p.etag);
    await cargar(); vista(c); U.aviso(p.nombre + ' ya no tiene accesos.', 'ok');
  }

  // ---------- Estado inicial (una sola vez) ----------
  async function semilla(c) {
    const pers = await personalIC(), porNombre = new Map(pers.map((x) => [norm(x.nombre), x.email]));
    const rows = (window.MATRIZ_SEMILLA || []).map((s) => {
      let email = s.email;
      if (!email) { const k = norm(s.nombre), hit = pers.find((x) => norm(x.nombre) === k) || pers.find((x) => norm(x.nombre).indexOf(k.split(' ')[0]) === 0 && norm(x.nombre).indexOf(k.split(' ').slice(-1)[0]) >= 0); email = hit ? hit.email : (porNombre.get(k) || ''); }
      return Object.assign({}, s, { email });
    });
    U.modal('Cargar el estado inicial', '<form class="ic-form" id="fS"><p style="margin-top:0">Se crean ' + rows.length + ' personas con los accesos del Excel del 28 de noviembre («Por confirmar» = sin acceso). Revise los correos:</p><div class="ic-campos">' +
      rows.map((r, i) => U.campo({ name: 'e' + i, label: r.nombre + ' (' + r.permisos.length + ' opciones)', t: 'email', valor: r.email, c: 'c6' })).join('') +
      '</div><div class="ic-acciones"><button class="ic-btn" id="sOk">Crear matriz</button></div></form>', (m) => {
      const f = m.querySelector('#fS');
      f.onsubmit = async (e) => {
        e.preventDefault();
        const mal = rows.map((r, i) => [r, f['e' + i].value.trim().toLowerCase()]).filter(([, em]) => !/^[^@\s]+@ideascontrol\.com$/.test(em));
        if (mal.length) { U.aviso('Falta o no es válido el correo de: ' + mal.map(([r]) => r.nombre).join(', '), 'warn', 7000); return; }
        await U.conCarga(m.querySelector('#sOk'), async () => {
          for (let i = 0; i < rows.length; i++) {
            const em = f['e' + i].value.trim().toLowerCase();
            await G.crear(P.LISTA, { Title: em, nombre: rows[i].nombre, permisos: rows[i].permisos.join(','), estado: 'ACTIVO' });
          }
          if (!config) await G.crear(P.LISTA, { Title: P.CONFIG, nombre: 'Configuración de la matriz', permisos: 'INACTIVA', estado: 'ACTIVO' });
          document.getElementById('ic-modal').remove(); await cargar(); vista(c); U.aviso('Matriz creada. Revísela y actívela cuando esté lista.', 'ok', 7000);
        });
      };
    });
  }

  // ---------- Excel ----------
  function excel() {
    const enc = ['Área', 'App', 'Código', 'Opción', 'Tipo', 'Qué hace'].concat(personas.map((p) => p.nombre));
    const datos = OPS.map((o) => [o.area, o.app, o.cod, o.op, o.tipo, o.desc].concat(personas.map((p) => tiene(p, o.id) ? 'Sí' : 'No')));
    const ws = XLSX.utils.aoa_to_sheet([enc].concat(datos));
    ws['!cols'] = [{ wch: 22 }, { wch: 28 }, { wch: 12 }, { wch: 34 }, { wch: 14 }, { wch: 50 }].concat(personas.map(() => ({ wch: 14 })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Matriz');
    XLSX.writeFile(wb, 'Matriz_Permisos_Accesos_IC_' + new Date().toISOString().slice(0, 10) + '.xlsx');
  }

  async function arrancar() {
    const raiz = document.getElementById('contenido');
    U.pantalla(raiz, { logo: CFG.logo, cargando: true, titulo: 'Cargando…', texto: 'Conectando con Microsoft 365' });
    try {
      const cuenta = await IC.auth.iniciar(CFG.auth);
      if (!cuenta) { U.pantalla(raiz, { logo: CFG.logo, titulo: 'Matriz de permisos y accesos', texto: 'Ingrese con su cuenta de Microsoft de Ideas Control.', boton: 'Iniciar sesión', alClic: () => IC.auth.entrar() }); return; }
      const email = String(cuenta.username || '').toLowerCase();
      if (CFG.admins.indexOf(email) < 0) { U.pantalla(raiz, { logo: CFG.logo, titulo: 'Sin acceso', texto: 'La matriz de permisos es solo para la Dirección de Operaciones.', boton: 'Volver al portal', alClic: () => IC.portal.volver() }); return; }
      yo = { email, nombre: cuenta.name || email };
      await G.sitio(CFG.sitio.host, CFG.sitio.ruta);
      encabezado();
      try { await cargar(); } catch (e) {
        if (/No existe la lista/.test(e.message)) { U.pantalla(raiz, { logo: CFG.logo, titulo: 'Falta crear la lista de la matriz', texto: 'Abra Administrativos › Instalador IC Apps y haga clic en «Crear estructura» (crea SYS_Permisos). Luego vuelva aquí.', boton: 'Ir al instalador', alClic: () => { location.href = '/ideascontrol/Programacion/Instalador/'; } }); return; }
        throw e;
      }
      vista(raiz);
      if (!personas.length) semilla(raiz);
    } catch (e) { console.error(e); U.pantalla(raiz, { logo: CFG.logo, titulo: 'No se pudo cargar', texto: U.mensajeError(e), boton: 'Reintentar', alClic: () => location.reload() }); }
  }
  window.addEventListener('DOMContentLoaded', arrancar);
})();
