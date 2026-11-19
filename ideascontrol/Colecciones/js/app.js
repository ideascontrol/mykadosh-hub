/* =====================================================================
   APP-116 · Colecciones de lectura — arranque, acceso y encabezado
   Todo el personal de Ideas Control (cuenta de Microsoft de IC) entra y lee.
   Administrador: los correos de CFG.admins (control total: ver programadas y retiradas, retirar, volver a publicar).
   En SharePoint la lista TAL_Coleccion queda en solo lectura para todos (Instalador › «Aplicar permisos»).
   ===================================================================== */
const App = { usuario: null };
(function () {
  const U = IC.ui, esc = U.esc, G = IC.graph;
  const esAdmin = () => App.usuario && App.usuario.admin;

  function encabezado() {
    const u = App.usuario;
    document.getElementById('encabezado').innerHTML =
      '<a href="#"><img class="logo" src="' + CFG.logo + '" alt="Ideas Control"></a>' +
      '<div class="app-nombre"><b>' + esc(CFG.app.nombre) + '</b><span>' + CFG.app.id + ' · v' + CFG.app.version + '</span></div><div class="espacio"></div>' +
      '<div class="ic-user">' + IC.portal.boton() + '<div class="datos"><b>' + esc(u.nombre) + '</b><span>' + (esAdmin() ? 'Administrador' : 'Lectura') + '</span></div>' +
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
      await G.sitio(CFG.sitio.host, CFG.sitio.ruta);
      const email = String(cuenta.username || '').toLowerCase();
      App.usuario = { email, nombre: cuenta.name || email, admin: CFG.admins.indexOf(email) >= 0 };
      encabezado();
      const volver = IC.auth.volverA(); if (volver) location.hash = volver;
      let primera = true;
      const ir = () => { Coleccion.vista(raiz, primera ? { admin: esAdmin() } : null); primera = false; window.scrollTo(0, 0); };
      window.addEventListener('hashchange', ir); ir();
    } catch (e) {
      console.error(e);
      U.pantalla(raiz, { logo: CFG.logo, titulo: 'No se pudo cargar la app', texto: U.mensajeError(e), boton: 'Reintentar', alClic: () => location.reload() });
    }
  }
  window.addEventListener('DOMContentLoaded', arrancar);
})();
