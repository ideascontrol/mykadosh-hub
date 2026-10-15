/* =====================================================================
   IDEAS CONTROL · Utilidades de interfaz compartidas
   shared/js/ui.js — avisos, pantallas de estado, enrutador, formatos.
   ===================================================================== */
window.IC = window.IC || {};
IC.ui = (function () {
  const $ = (sel, raiz) => (raiz || document).querySelector(sel);

  // Al corregir un campo marcado con error, se quita la marca
  document.addEventListener('input', (e) => {
    const c = e.target.closest && e.target.closest('.ic-campo.error');
    if (c) { c.classList.remove('error'); const m = c.querySelector('.msg-error'); if (m) m.remove(); }
  });

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


  // ---------- Ventana modal ----------
  function modal(titulo, html, alAbrir) {
    cerrarModal();
    const f = document.createElement('div');
    f.className = 'ic-modal-fondo'; f.id = 'ic-modal';
    f.innerHTML = '<div class="ic-modal" role="dialog" aria-modal="true"><div class="cab"><h2>' + esc(titulo) + '</h2>' +
      '<button class="cerrar" aria-label="Cerrar">×</button></div><div class="cuerpo-modal">' + html + '</div></div>';
    document.body.appendChild(f);
    f.querySelector('.cerrar').onclick = cerrarModal;
    f.addEventListener('mousedown', (e) => { if (e.target === f) cerrarModal(); });
    document.addEventListener('keydown', escModal);
    if (alAbrir) alAbrir(f.querySelector('.cuerpo-modal'));
    const primero = f.querySelector('input:not([readonly]), select, textarea'); if (primero) primero.focus();
    return f;
  }
  function escModal(e) { if (e.key === 'Escape') cerrarModal(); }
  function cerrarModal() { const m = document.getElementById('ic-modal'); if (m) m.remove(); document.removeEventListener('keydown', escModal); }

  // Confirmación propia (no bloquea el navegador). Devuelve una promesa true/false.
  function confirmar(titulo, texto, botonSi, peligro) {
    return new Promise((res) => {
      modal(titulo, '<div class="ic-form"><p style="margin:0 0 16px">' + esc(texto) + '</p><div class="ic-acciones">' +
        '<button class="ic-btn sec" data-r="0">Cancelar</button><button class="ic-btn ' + (peligro ? 'peligro' : '') + '" data-r="1">' + esc(botonSi || 'Confirmar') + '</button></div></div>',
        (c) => c.querySelectorAll('[data-r]').forEach((b) => { b.onclick = () => { cerrarModal(); res(b.dataset.r === '1'); }; }));
    });
  }

  // ---------- Formularios ----------
  // Lee todos los [name] de un formulario. Casillas → true/false. Textos → recortados.
  function leerForm(form) {
    const o = {};
    form.querySelectorAll('[name]').forEach((el) => {
      if (el.type === 'checkbox') o[el.name] = el.checked;
      else o[el.name] = String(el.value || '').trim();
    });
    return o;
  }
  // errores = { campo: 'mensaje' }. Devuelve true si no hay errores.
  function marcarErrores(form, errores) {
    form.querySelectorAll('.ic-campo').forEach((c) => { c.classList.remove('error'); const m = c.querySelector('.msg-error'); if (m) m.remove(); });
    const claves = Object.keys(errores || {});
    claves.forEach((k) => {
      const el = form.querySelector('[name="' + k + '"]'); if (!el) return;
      const c = el.closest('.ic-campo'); if (!c) return;
      c.classList.add('error');
      const m = document.createElement('span'); m.className = 'msg-error'; m.textContent = errores[k]; c.appendChild(m);
    });
    if (claves.length) { const el = form.querySelector('[name="' + claves[0] + '"]'); if (el) el.focus(); }
    return !claves.length;
  }
  // Campo de formulario. t: text|email|tel|date|select|textarea|checkbox. op: opciones [[valor, texto]]
  function campo(o) {
    const id = 'f_' + o.name, v = o.valor === undefined || o.valor === null ? '' : o.valor;
    let input;
    if (o.t === 'select') {
      input = '<select id="' + id + '" name="' + o.name + '"' + (o.disabled ? ' disabled' : '') + '>' +
        (o.vacio !== false ? '<option value="">' + esc(o.vacio || 'Seleccione…') + '</option>' : '') +
        (o.op || []).map((p) => '<option value="' + esc(p[0]) + '"' + (String(p[0]) === String(v) ? ' selected' : '') + '>' + esc(p[1]) + '</option>').join('') + '</select>';
    } else if (o.t === 'textarea') {
      input = '<textarea id="' + id + '" name="' + o.name + '" rows="' + (o.filas || 3) + '" placeholder="' + esc(o.ph || '') + '">' + esc(v) + '</textarea>';
    } else if (o.t === 'checkbox') {
      return '<div class="ic-campo ' + (o.c || 'c12') + '"><label class="ic-check"><input type="checkbox" id="' + id + '" name="' + o.name + '"' + (v ? ' checked' : '') + '> <span>' + o.label + '</span></label>' + (o.ayuda ? '<span class="ayuda">' + o.ayuda + '</span>' : '') + '</div>';
    } else {
      input = '<input id="' + id + '" name="' + o.name + '" type="' + (o.t || 'text') + '" value="' + esc(v) + '"' +
        (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + (o.readonly ? ' readonly' : '') + (o.max ? ' maxlength="' + o.max + '"' : '') +
        (o.modo ? ' inputmode="' + o.modo + '"' : '') + ' autocomplete="off">';
    }
    return '<div class="ic-campo ' + (o.c || '') + '"><label for="' + id + '">' + esc(o.label) + (o.req ? ' <span class="req">*</span>' : '') + '</label>' + input +
      (o.ayuda ? '<span class="ayuda">' + o.ayuda + '</span>' : '') + '</div>';
  }

  // Botón con estado "guardando…"
  async function conCarga(boton, fn) {
    const txt = boton.textContent; boton.disabled = true; boton.textContent = 'Guardando…';
    try { return await fn(); } finally { boton.disabled = false; boton.textContent = txt; }
  }

  // Texto sin tildes y en minúsculas, para búsquedas
  function norm(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }

  return { $, esc, aviso, pantalla, enrutar, fmt, mensajeError, modal, cerrarModal, confirmar, leerForm, marcarErrores, campo, conCarga, norm };
})();
