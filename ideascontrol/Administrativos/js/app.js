/* =====================================================================
   APP-118 · Administrativos — menú de administración (solo Dirección de Operaciones)
   ===================================================================== */
const App = { usuario: null };
(function () {
  const U = IC.ui, esc = U.esc;
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
    c.innerHTML = '<h1 class="ic-titulo">Administrativos</h1><p class="ic-subtitulo">Instaladores, respaldos, datos de las microapps, administración, accesos y tablas maestras, en un solo lugar.</p>' +
      CFG.secciones.map(([g, items]) => '<div class="ic-seccion">' + esc(g) + '</div><div class="ic-grid">' + items.map(([n, t, url, ico, color, ext]) =>
        '<a class="ic-card ' + (color || '') + '" href="' + esc(url) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + (url === '#matriz' ? ' id="bMatriz"' : '') + '>' +
        '<div class="ad-ico">' + esc(ico) + '</div><h3>' + esc(n) + (ext ? ' ↗' : '') + '</h3><p>' + esc(t) + '</p></a>').join('') + '</div>').join('');
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
