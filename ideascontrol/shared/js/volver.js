/* =====================================================================
   IDEAS CONTROL · Volver al portal
   shared/js/volver.js — las microapps se abren desde el Portal en una pestaña
   nueva (window.name = "ic_<APP>"). El botón «Portal» cierra esa pestaña y
   deja al usuario en el Portal. Si la página no se abrió desde el Portal (o el
   Portal ya se cerró), el botón abre el Portal en la misma pestaña.
   ===================================================================== */
window.IC = window.IC || {};
IC.portal = (function () {
  const URL_PORTAL = '/ideascontrol/Portal/';
  const desdePortal = () => /^ic_/.test(window.name || '');
  function portalAbierto() {
    try { return !!(window.opener && !window.opener.closed && window.opener.location.pathname.indexOf(URL_PORTAL) === 0); }
    catch (e) { return false; }
  }
  function volver() {
    if (desdePortal() && portalAbierto()) {
      try { window.opener.focus(); } catch (e) { /* algunos navegadores no lo permiten */ }
      window.close();
      setTimeout(() => { location.href = URL_PORTAL; }, 400);   // si el navegador no dejó cerrar la pestaña
    } else {
      location.href = URL_PORTAL;
    }
  }
  function boton(clase) {
    return '<button type="button" class="' + (clase || 'ic-btn sec chico') + '" onclick="IC.portal.volver()" title="Cerrar esta pestaña y volver al portal de microapps">← Portal</button>';
  }
  return { URL_PORTAL, desdePortal, volver, boton };
})();
