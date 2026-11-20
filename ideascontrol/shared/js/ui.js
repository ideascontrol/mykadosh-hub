/* =====================================================================
   IDEAS CONTROL · Utilidades de interfaz compartidas
   shared/js/ui.js — avisos, pantallas de estado, enrutador, formatos.
   ===================================================================== */
window.IC = window.IC || {};
IC.ui = (function () {
  const $ = (sel, raiz) => (raiz || document).querySelector(sel);
  // Iniciales fijas por persona (nombre o correo, sin tildes, en minúscula)
  const INICIALES_FIJAS = { 'martin molina': 'MEM', 'martin eduardo molina': 'MEM', 'operaciones@ideascontrol.com': 'MEM', 'martin.molina@ideascontrol.com': 'MEM' };

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
    // Iniciales del avatar. Las personas con iniciales definidas (p. ej. Martín Molina = MEM) se respetan en todas las apps
    iniciales: (nombre) => {
      const k = String(nombre || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
      if (INICIALES_FIJAS[k]) return INICIALES_FIJAS[k];
      return String(nombre || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
    }
  };

  // Traduce errores técnicos a mensajes para el usuario
  function mensajeError(e) {
    const m = String(e && e.message || e);
    if (e && e.status === 403) return 'No tiene permiso para guardar' + (e.lista ? ' en la lista ' + e.lista : '') + ' de SharePoint. Avise a la Dirección de Operaciones: debe ejecutar «Aplicar permisos» en el Instalador de IC Apps.';
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
      modal(titulo, '<div class="ic-form"><p style="margin:0 0 16px;white-space:pre-line">' + esc(texto) + '</p><div class="ic-acciones">' +
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
  // Opciones de un <select>: [valor, texto] o [valor, texto, grupo] (el grupo arma <optgroup> en el orden en que aparece)
  function opcionesHTML(op, v) {
    let h = '', g = null;
    op.forEach((p) => {
      if ((p[2] || null) !== g) { if (g) h += '</optgroup>'; g = p[2] || null; if (g) h += '<optgroup label="' + esc(g) + '">'; }
      h += '<option value="' + esc(p[0]) + '"' + (String(p[0]) === String(v) ? ' selected' : '') + '>' + esc(p[1]) + '</option>';
    });
    return h + (g ? '</optgroup>' : '');
  }
  // Lista ÚNICA del personal de IC para elegir responsable o técnico en todas las apps (Tareas, Programación…).
  // Origen: lista OPE_Tecnicos (se mantiene en Programación › Administración › Técnicos). Agrupada por vinculación.
  // lista = filas de OPE_Tecnicos; actual = Title elegido (se muestra aunque esté inactivo)
  const VINCULACIONES = [['IDEAS_CONTROL', 'Ideas Control'], ['ADMINISTRATIVO', 'Administrativo'], ['TECNICO_CAMPO', 'Técnicos de campo']];
  function opcionesPersonal(lista, actual) {
    const vis = (lista || []).filter((t) => t.estado !== 'INACTIVO' || t.Title === actual)
      .sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99) || String(a.nombre).localeCompare(String(b.nombre)));
    const out = [];
    VINCULACIONES.forEach(([k, n]) => vis.filter((t) => (t.vinculacion || 'IDEAS_CONTROL') === k).forEach((t) => out.push([t.Title, t.nombre + (t.estado === 'INACTIVO' ? ' — inactivo' : ''), n])));
    vis.filter((t) => !VINCULACIONES.some((x) => x[0] === (t.vinculacion || 'IDEAS_CONTROL'))).forEach((t) => out.push([t.Title, t.nombre, 'Otros']));
    return out;
  }

  function campo(o) {
    const id = 'f_' + o.name, v = o.valor === undefined || o.valor === null ? '' : o.valor;
    let input;
    if (o.t === 'select') {
      input = '<select id="' + id + '" name="' + o.name + '"' + (o.disabled ? ' disabled' : '') + '>' +
        (o.vacio !== false ? '<option value="">' + esc(o.vacio || 'Seleccione…') + '</option>' : '') +
        opcionesHTML(o.op || [], v) + '</select>';
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

  // ---------- Listas de sugerencias (clientes, sitios, planes…) ----------
  // Reemplaza la lista nativa del navegador (<input list>) por una que busca por CUALQUIER parte del texto,
  // sin tildes ni mayúsculas y con varias palabras (p. ej. «guapa», «agri gua»). Se aplica sola a todo <input list>.
  function autocompletar(inp) {
    if (inp.dataset.lista) return;
    const idLista = inp.getAttribute('list'); if (!idLista) return;
    inp.dataset.lista = idLista; inp.removeAttribute('list'); inp.setAttribute('autocomplete', 'off');
    let caja = null, sel = -1, items = [];
    const opciones = () => { const dl = document.getElementById(inp.dataset.lista); return dl ? Array.from(dl.options).map((o) => o.value || o.textContent).filter(Boolean) : []; };
    const cerrar = () => { if (caja) { caja.remove(); caja = null; } sel = -1; };
    const elegir = (v) => { inp.value = v; cerrar(); inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); };
    const marcar = () => { if (!caja) return; Array.from(caja.children).forEach((d, i) => { d.style.background = i === sel ? '#e8f1fb' : ''; }); if (sel >= 0 && caja.children[sel]) caja.children[sel].scrollIntoView({ block: 'nearest' }); };
    function abrir() {
      const q = norm(inp.value).trim().split(/\s+/).filter(Boolean);
      items = opciones().filter((o) => { const n = norm(o); return q.every((t) => n.indexOf(t) >= 0); });
      if (q.length) { const t0 = q[0]; items.sort((a, b) => (norm(a).indexOf(t0) === 0 ? 0 : 1) - (norm(b).indexOf(t0) === 0 ? 0 : 1)); }
      items = items.slice(0, 60);
      if (!items.length || (items.length === 1 && items[0] === inp.value)) { cerrar(); return; }
      if (!caja) {
        caja = document.createElement('div');
        caja.style.cssText = 'position:fixed;z-index:3000;background:#fff;border:1px solid #cfd8e3;border-radius:10px;box-shadow:0 12px 28px rgba(15,40,70,.16);max-height:260px;overflow:auto;padding:4px 0;font-size:14px';
        document.body.appendChild(caja);
        caja.addEventListener('mousedown', (e) => { e.preventDefault(); const d = e.target.closest('[data-i]'); if (d) elegir(items[Number(d.dataset.i)]); });
      }
      const r = inp.getBoundingClientRect();
      caja.style.left = r.left + 'px'; caja.style.width = Math.max(r.width, 220) + 'px';
      const abajo = window.innerHeight - r.bottom;
      if (abajo < 200 && r.top > abajo) { caja.style.top = ''; caja.style.bottom = (window.innerHeight - r.top + 2) + 'px'; } else { caja.style.bottom = ''; caja.style.top = (r.bottom + 2) + 'px'; }
      caja.innerHTML = items.map((o, i) => '<div data-i="' + i + '" style="padding:7px 12px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(o) + '</div>').join('');
      sel = -1; marcar();
    }
    inp.addEventListener('input', (e) => { if (e.isTrusted !== false) abrir(); });
    inp.addEventListener('focus', abrir);
    inp.addEventListener('blur', () => setTimeout(cerrar, 120));
    inp.addEventListener('keydown', (e) => {
      if (!caja) { if (e.key === 'ArrowDown') abrir(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(items.length - 1, sel + 1); marcar(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); marcar(); }
      else if (e.key === 'Enter' && sel >= 0) { e.preventDefault(); elegir(items[sel]); }
      else if (e.key === 'Escape') cerrar();
    });
    window.addEventListener('scroll', (e) => { if (!caja || e.target === caja) return; if (document.activeElement === inp) { const k = sel; abrir(); sel = Math.min(k, items.length - 1); marcar(); } else cerrar(); }, true);
  }
  function mejorarListas(raiz) { (raiz || document).querySelectorAll && (raiz || document).querySelectorAll('input[list]').forEach(autocompletar); }
  if (typeof MutationObserver !== 'undefined') {
    const iniciar = () => { mejorarListas(document); new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) { if (n.matches && n.matches('input[list]')) autocompletar(n); else mejorarListas(n); } }))).observe(document.body, { childList: true, subtree: true }); };
    if (document.body) iniciar(); else document.addEventListener('DOMContentLoaded', iniciar);
  }

  return { autocompletar, mejorarListas, opcionesHTML, opcionesPersonal, VINCULACIONES, $, esc, aviso, pantalla, enrutar, fmt, mensajeError, modal, cerrarModal, confirmar, leerForm, marcarErrores, campo, conCarga, norm };
})();
