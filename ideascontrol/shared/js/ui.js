/* =====================================================================
   IDEAS CONTROL · Utilidades de interfaz compartidas
   shared/js/ui.js — avisos, pantallas de estado, enrutador, formatos.
   ===================================================================== */
window.IC = window.IC || {};
IC.ui = (function () {
  const $ = (sel, raiz) => (raiz || document).querySelector(sel);

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function aviso(texto, tipo, ms) {
    let zona = $('.ic-toast-zona');
    if (!zona) { zona = document.createElement('div'); zona.className = 'ic-toast-zona'; document.body.appendChild(zona); }
    const t = document.createElement('div');
    t.className = 'ic-toast ' + (tipo || '');
    t.textContent = texto;
    zona.appendChild(t);
    setTimeout(() => t.remove(), ms || 4500);
  }

  // Pantalla centrada: cargando, error, sin acceso, iniciar sesión
  function pantalla(destino, o) {
    destino.innerHTML =
      '<div class="ic-centro"><div class="ic-panel">' +
      '<img src="' + esc(o.logo || '') + '" alt="Ideas Control" onerror="this.style.display=\'none\'">' +
      (o.cargando ? '<div class="ic-spinner"></div>' : '') +
      '<h2>' + esc(o.titulo || '') + '</h2>' +
      '<p>' + esc(o.texto || '') + '</p>' +
      (o.boton ? '<button class="ic-btn" id="ic-panel-btn">' + esc(o.boton) + '</button>' : '') +
      '</div></div>';
    if (o.boton && o.alClic) $('#ic-panel-btn', destino).onclick = o.alClic;
  }

  // Enrutador por #hash: rutas = { '': fn, 'empresas': fn, ... }
  function enrutar(rutas, alCambiar) {
    function ir() {
      const ruta = (location.hash || '#').slice(1).split('/')[0];
      const fn = rutas[ruta] || rutas[''];
      if (alCambiar) alCambiar(ruta);
      fn(ruta);
      window.scrollTo(0, 0);
    }
    window.addEventListener('hashchange', ir);
    ir();
  }

  const fmt = {
    cop: (n) => '$ ' + Math.round(Number(n || 0)).toLocaleString('es-CO'),
    num: (n) => Number(n || 0).toLocaleString('es-CO'),
    fecha: (iso) => iso ? new Date(iso).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' }) : '',
    fechaHora: (iso) => iso ? new Date(iso).toLocaleString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
    iniciales: (nombre) => String(nombre || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
  };

  // Traduce errores técnicos a mensajes para el usuario
  function mensajeError(e) {
    const m = String(e && e.message || e);
    if (e && e.status === 403) return 'No tiene permiso para esta acción en SharePoint. Pida al administrador que lo agregue como miembro del sitio IC Apps.';
    if (e && e.status === 404) return 'No se encontró la información solicitada en SharePoint.';
    if (e && e.status === 412) return 'Otro usuario modificó este registro mientras usted lo editaba. Recargue e intente de nuevo.';
    if (/AADSTS65001|consent|admin approval/i.test(m)) return 'La app necesita la aprobación del administrador de Microsoft 365.';
    if (/Failed to fetch|NetworkError/i.test(m)) return 'Sin conexión a internet o Microsoft no respondió. Intente de nuevo.';
    return m;
  }

  return { $, esc, aviso, pantalla, enrutar, fmt, mensajeError };
})();
