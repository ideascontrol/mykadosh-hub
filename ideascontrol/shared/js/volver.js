/* =====================================================================
   IDEAS CONTROL · Volver al portal
   shared/js/volver.js — las microapps se abren desde el Portal en una pestaña
   nueva (window.name = "ic_<APP>"). El botón «Portal» cierra esa pestaña y
   deja al usuario en el Portal. Si el navegador no deja cerrarla (pestaña que no
   abrió el Portal), el botón abre el Portal en la misma pestaña.
   ===================================================================== */
window.IC = window.IC || {};
IC.portal = (function () {
  const URL_PORTAL = '/ideascontrol/Portal/';
  const desdePortal = () => /^ic_/.test(window.name || '');
  function portalAbierto() {
    try { return !!(window.opener && !window.opener.closed && window.opener.location.pathname.indexOf(URL_PORTAL) === 0); }
    catch (e) { return false; }
  }
  // Siempre intenta cerrar la pestaña (las apps se abren desde el Portal con window.open, así que el navegador lo permite
  // aunque el inicio de sesión de Microsoft haya borrado window.name). Si el navegador no la deja cerrar
  // (pestaña abierta a mano o desde un enlace), lleva al Portal en la misma pestaña.
  function volver() {
    try { if (portalAbierto()) window.opener.focus(); } catch (e) { /* algunos navegadores no lo permiten */ }
    window.close();
    setTimeout(() => { if (!window.closed) location.href = URL_PORTAL; }, 350);
  }
  function boton(clase) {
    return '<button type="button" class="' + (clase || 'ic-btn sec chico') + '" onclick="IC.portal.volver()" title="Cerrar esta pestaña y volver al portal de microapps">← Portal</button>';
  }
  return { URL_PORTAL, desdePortal, volver, boton };
})();
