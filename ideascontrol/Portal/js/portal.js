/* =====================================================================
   APP-100 · Portal de microapps — inicio de sesión único y menú principal
   Usa la misma app de Entra ID que Comercial y Programación: al entrar aquí,
   las demás microapps abren sin pedir de nuevo la cuenta (mismo dominio).
   ===================================================================== */
(function () {
  const U = IC.ui, esc = U.esc;
  const ICO = {
    agenda: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M7 14h2M11 14h2M15 14h2M7 18h2M11 18h2"/></svg>',
    ticket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/><path d="M13 6v12" stroke-dasharray="2 2"/></svg>',
    comercial: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M12 12v6M9 15h6"/></svg>',
    docs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5M8 7h8M8 11h6"/></svg>',
    encuesta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 6.5 7 .9-5.2 4.8 1.4 7L12 17.8 5.8 21.2l1.4-7L2 9.4l7-.9z"/></svg>',
    sitio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>'
  };
  const DATOS = { SHAREPOINT: ['SharePoint', 'sp'], GITHUB: ['GitHub · público', 'gh'], POWERAPPS: ['Power Apps', 'pa'] };

  let cuenta = null, acceso = {}, catalogo = {}, hoy = null;
  const ventanas = {};

  function encabezado() {
    const nombre = cuenta.name || cuenta.username;
    document.getElementById('encabezado').innerHTML =
      '<a href="#"><img class="logo" src="' + CFG.logo + '" alt="Ideas Control"></a>' +
      '<div class="app-nombre"><b>Portal de microapps</b><span>Ideas Control Equipos y Soluciones S.A.S.</span></div><div class="espacio"></div>' +
      '<div class="ic-user"><div class="datos"><b>' + esc(nombre) + '</b><span>' + esc(cuenta.username) + '</span></div>' +
      '<div class="ic-avatar">' + esc(U.fmt.iniciales(nombre)) + '</div><button class="ic-btn sec chico" id="btnSalir">Salir</button></div>';
    document.getElementById('encabezado').hidden = false;
    document.getElementById('btnSalir').onclick = () => IC.auth.salir();
  }
  function saludo() { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; }

  function pintar(raiz) {
    const oficina = esOficina();
    const apps = APPS.map((a) => {
      const c = catalogo[a.id] || {};
      const url = c.url || a.url;
      return Object.assign({}, a, { url, activa: !!url && !a.pronto });
    }).filter((a) => !(a.acceso && acceso[a.acceso] === false) && !(a.soloOficina && !oficina));
    const grupos = [];
    apps.forEach((a) => { if (grupos.indexOf(a.grupo) < 0) grupos.push(a.grupo); });
    let html = '<h1 class="ic-titulo">' + saludo() + ', ' + esc(String(cuenta.name || '').split(' ')[0]) + '</h1>' +
      '<p class="ic-subtitulo">Entrada única a las microapps de Ideas Control. Ya inició sesión: las apps internas abren sin pedir de nuevo su cuenta.</p>' +
      '<div id="hoy" class="pt-hoy">' + (hoy ? hoy : '') + '</div>';
    grupos.forEach((g) => {
      html += '<div class="ic-seccion">' + esc(g) + '</div><div class="ic-grid">';
      apps.filter((a) => a.grupo === g).forEach((a) => {
        const d = DATOS[a.datos] || ['', ''];
        const acc = a.acceso ? acceso[a.acceso] : null;     // undefined = verificando · false = sin acceso · texto = rol
        const externa = a.datos === 'POWERAPPS' || /^https?:/.test(a.url || '') && !/mykadosh\.com/.test(a.url);
        html += '<a class="ic-card ' + (a.color || '') + (a.activa ? '' : ' deshabilitada') + '" ' + (a.activa ? 'href="' + esc(a.url) + '"' + (externa ? ' target="_blank" rel="noopener"' : ' data-app="' + esc(a.id) + '"') : '') + '>' +
          (a.pronto ? '<span class="ic-badge">Próximamente</span>' : !a.activa ? '<span class="ic-badge">Sin dirección</span>' : '') +
          '<div class="icono">' + ICO[a.icono] + '</div><h3>' + esc(a.nombre) + '</h3><p>' + esc(a.texto) + '</p>' +
          '<div class="pt-meta"><span class="pt-datos ' + d[1] + '">' + esc(d[0]) + '</span>' + (typeof acc === 'string' ? '<span class="pt-rol">' + esc(acc) + '</span>' : '') + '<span class="pt-id">' + esc(a.id) + '</span></div>' +
          (a.nota && (!a.activa || a.datos === 'GITHUB') ? '<p class="pt-nota">' + esc(a.nota) + '</p>' : '') +
          '</a>';
      });
      html += '</div>';
    });
    if (oficina) html += '<div class="ic-seccion">Sitios de SharePoint</div><div class="ic-grid">' + CFG.sitios.map((s) =>
      '<a class="ic-card" href="' + esc(s.url) + '" target="_blank" rel="noopener"><div class="icono">' + ICO.sitio + '</div><h3>' + esc(s.nombre) + '</h3><p>' + esc(s.texto) + '</p></a>').join('') + '</div>';
    if (oficina) html += '<div class="ic-seccion">Herramientas para clientes (públicas)</div><div class="pt-publicas">' +
      PUBLICAS.map((p) => '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(p.nombre) + ' ↗</a>').join('') + '</div>';
    html += '<div class="ic-pie">' + CFG.app.id + ' · v' + CFG.app.version + ' · Las apps internas guardan sus datos en SharePoint (IC Apps) con la cuenta de Microsoft 365 de cada usuario.</div>';
    raiz.innerHTML = html;
    // Cada app interna se abre en su propia pestaña; si ya está abierta, se vuelve a ella
    raiz.querySelectorAll('a[data-app]').forEach((el) => {
      el.addEventListener('click', (ev) => {
        if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.button !== 0) return;
        ev.preventDefault();
        const id = el.dataset.app, v = ventanas[id];
        if (v && !v.closed) { try { v.focus(); return; } catch (e) { } }
        ventanas[id] = window.open(el.getAttribute('href'), 'ic_' + id);
        if (!ventanas[id]) location.href = el.getAttribute('href');   // bloqueador de ventanas: se abre aquí
      });
    });
  }
  // Personal de oficina = tiene acceso a Comercial o un rol distinto de Técnico en la Programación.
  // Mientras se verifican los accesos (undefined) se muestra todo.
  function esOficina() {
    if (acceso.APP101 === undefined && acceso.APP106 === undefined) return true;
    return !!acceso.APP101 || (!!acceso.APP106 && acceso.APP106 !== 'Técnico');
  }

  // Lecturas opcionales: si alguna falla, el portal igual muestra el menú
  async function complementar(raiz) {
    const email = String(cuenta.username || '').toLowerCase();
    try { await IC.graph.sitio(CFG.sitio.host, CFG.sitio.ruta); } catch (e) { U.aviso('No se pudo conectar con IC Apps: ' + U.mensajeError(e), 'warn', 7000); acceso = {}; return; }
    const tareas = [
      IC.graph.items('SYS_Microapps').then((r) => { r.forEach((x) => { catalogo[x.Title] = x; }); }).catch(() => {}),
      IC.graph.items('SYS_Usuarios').then((r) => {
        const u = r.find((x) => String(x.email || '').toLowerCase() === email && x.estado === 'ACTIVO');
        acceso.APP101 = u ? (u.rol === 'ADMIN' ? 'Administrador' : 'Comercial') : false;
      }).catch(() => { acceso.APP101 = false; }),   // sin permiso sobre la lista = sin acceso a Comercial
      Promise.all([
        IC.graph.items('SYS_Accesos', { filtro: "fields/app_id eq 'APP-106'" }).catch(() => []),
        IC.graph.items('OPE_Tecnicos').catch(() => [])
      ]).then(([acc, tec]) => {
        const a = acc.find((x) => String(x.email || '').toLowerCase() === email && x.estado !== 'INACTIVO');
        const t = tec.find((x) => String(x.email || '').toLowerCase() === email && x.estado !== 'INACTIVO');
        acceso.APP106 = a ? ({ ADMIN: 'Director de Operaciones', EDITOR: 'Programador', CONSULTA: 'Consulta' }[a.rol] || a.rol) : t ? 'Técnico' : false;
        if (acceso.APP106) return hoyEnOperacion(tec);
      }).catch(() => {})
    ];
    await Promise.all(tareas);
    pintar(raiz);
  }

  // Franja «Hoy en operación» (solo si el usuario tiene acceso a la Programación)
  async function hoyEnOperacion(tecnicos) {
    const d = new Date(), f = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const acts = (await IC.graph.items('OPE_Actividades', { filtro: "fields/fecha ge '" + f + "T00:00:00Z' and fields/fecha le '" + f + "T23:59:59Z'" }))
      .filter((a) => a.estado !== 'CANCELADO' && a.estado !== 'REPROGRAMADO');
    const nom = (id) => (tecnicos.find((t) => t.Title === id) || {}).nombre || id;
    const ofi = acts.filter((a) => a.tipo === 'OFI' && a.tecnico_id).map((a) => nom(a.tecnico_id));
    const vacio = acts.some((a) => a.tipo === 'OFI' && !a.tecnico_id);
    const campo = acts.filter((a) => a.tipo !== 'OFI' && a.tipo !== 'AUS');
    const habil = d.getDay() >= 1 && d.getDay() <= 5;
    hoy = '<div class="pt-hoy-caja"><b>Hoy en operación</b>' +
      '<span>Oficina: ' + (ofi.length ? esc(ofi.join(', ')) : vacio ? 'sin técnico (definido)' : habil ? '<em>⚠ sin técnico de turno</em>' : 'día no hábil') + '</span>' +
      '<span>En campo: ' + campo.length + ' actividad' + (campo.length === 1 ? '' : 'es') + '</span>' +
      '<a href="/ideascontrol/Programacion/#semana">Ver programación →</a></div>';
  }

  async function arrancar() {
    const raiz = document.getElementById('contenido');
    U.pantalla(raiz, { logo: CFG.logo, cargando: true, titulo: 'Cargando…', texto: 'Conectando con Microsoft 365' });
    try {
      cuenta = await IC.auth.iniciar(CFG.auth);
      if (!cuenta) {
        U.pantalla(raiz, { logo: CFG.logo, titulo: 'Portal de microapps', texto: 'Ingrese una sola vez con su cuenta de Microsoft de Ideas Control y abra desde aquí todas las microapps.', boton: 'Iniciar sesión', alClic: () => IC.auth.entrar() });
        return;
      }
      encabezado();
      pintar(raiz);
      complementar(raiz);
    } catch (e) {
      console.error(e);
      U.pantalla(raiz, { logo: CFG.logo, titulo: 'No se pudo cargar el portal', texto: U.mensajeError(e), boton: 'Reintentar', alClic: () => location.reload() });
    }
  }
  window.addEventListener('DOMContentLoaded', arrancar);
})();
