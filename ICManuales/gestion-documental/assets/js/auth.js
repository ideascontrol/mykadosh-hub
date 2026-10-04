/* ==========================================================================
   CONTROL DE ACCESO — marcador de posición (fase posterior)
   Todas las páginas llaman a GDAuth.proteger() antes de mostrar contenido.
   Hoy deja pasar a todos (modo desarrollo). Cuando se implemente el control
   de acceso, solo hay que reemplazar la lógica de este archivo, p. ej.:
     - validar sesión contra Google Apps Script (token en sessionStorage)
     - redirigir a login.html si no hay sesión válida
     - devolver { nombre, rol, areasPermitidas } para filtrar el catálogo
   ========================================================================== */
window.GDAuth = (function () {
  const MODO_DESARROLLO = true;

  function usuarioActual() {
    if (MODO_DESARROLLO) return { nombre: 'Modo desarrollo', rol: 'admin', areas: '*' };
    return null; // TODO: leer sesión real
  }

  function proteger() {
    const u = usuarioActual();
    if (!u) { window.location.href = 'login.html'; return null; }
    document.documentElement.classList.add('gd-auth-ok');
    return u;
  }

  function puedeVerArea(areaId) {
    const u = usuarioActual();
    return !!u && (u.areas === '*' || (u.areas || []).includes(areaId));
  }

  return { proteger, usuarioActual, puedeVerArea, MODO_DESARROLLO };
})();
