/* Lógica de la landing: selects, validación en vivo, envío seguro e idempotente. */
(function () {
  'use strict';

  var CFG = window.IC_CONFIG || {};
  var V = window.IC_VALIDATION;
  var COUNTRIES = window.IC_COUNTRIES || [];
  var byIso = {};
  COUNTRIES.forEach(function (c) { byIso[c[0]] = c; });
  var countryNames = COUNTRIES.map(function (c) { return c[1]; });

  var $ = function (id) { return document.getElementById(id); };
  var form = $('lead-form');
  var btn = $('submit-btn');
  var alertBox = $('form-alert');
  var statusBox = $('form-status');

  var state = {
    requestId: newId(),          // se mantiene en los reintentos → sin duplicados
    startedAt: Date.now(),
    acceptedAt: '',
    inFlight: false,
    codeTouched: false,
    done: false,
    utm: readUtm()
  };

  /* ---------- Utilidades ---------- */
  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(b);
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }
  function readUtm() {
    var out = {};
    try {
      var p = new URLSearchParams(location.search);
      ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) {
        var v = p.get(k); if (v) out[k] = v.slice(0, 100);
      });
    } catch (e) { /* sin UTM */ }
    return out;
  }

  $('year').textContent = new Date().getFullYear();

  /* ---------- Selects ---------- */
  function fillSelects() {
    var code = $('codigo_pais'), pais = $('pais');
    var def = CFG.DEFAULT_COUNTRY || 'CO';
    var f1 = document.createDocumentFragment(), f2 = document.createDocumentFragment();
    var ph = new Option('Selecciona…', ''); ph.disabled = true;
    f2.appendChild(ph);
    COUNTRIES.forEach(function (c) {
      f1.appendChild(new Option(c[1] + ' (' + c[2] + ')', c[0]));
      f2.appendChild(new Option(c[1], c[1]));
    });
    code.appendChild(f1); pais.appendChild(f2);
    if (byIso[def]) { code.value = def; pais.value = byIso[def][1]; } else { pais.value = ''; }
    code.addEventListener('change', function () { state.codeTouched = true; });
    pais.addEventListener('change', function () {
      // Sugerir el prefijo del país elegido si el usuario no lo cambió a mano.
      if (state.codeTouched) return;
      var match = COUNTRIES.filter(function (c) { return c[1] === pais.value; })[0];
      if (match) code.value = match[0];
    });
  }
  fillSelects();

  /* ---------- Validación ---------- */
  function setError(id, msg) {
    var el = $(id), wrap = el.closest('.field');
    $(id + '-err').textContent = msg || '';
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    wrap.classList.toggle('is-invalid', !!msg);
  }

  function selectedDial() {
    var c = byIso[$('codigo_pais').value];
    return c ? c[2] : '';
  }

  var checks = {
    nombre: function () { return V.validateName($('nombre').value); },
    correo: function () { return V.validateEmail($('correo').value, CFG.BLOCKED_EMAIL_DOMAINS); },
    codigo_pais: function () { return V.validateDialCode(selectedDial()); },
    telefono: function () {
      var c = byIso[$('codigo_pais').value];
      return V.validatePhone($('telefono').value, c ? c[2] : '', c ? c[3] : null);
    },
    empresa: function () { return V.validateCompany($('empresa').value); },
    pais: function () { return V.validateCountry($('pais').value, countryNames); },
    acepta: function () {
      return $('acepta').checked ? { ok: true, value: true }
        : { ok: false, msg: 'Debes autorizar el tratamiento de tus datos para enviar la solicitud.' };
    }
  };

  function run(id) {
    var r = checks[id]();
    setError(id, r.ok ? '' : r.msg);
    return r;
  }

  Object.keys(checks).forEach(function (id) {
    var el = $(id);
    el.addEventListener('blur', function () { if (el.value || el.closest('.field').classList.contains('is-invalid')) run(id); });
    el.addEventListener('input', function () { if (el.closest('.field').classList.contains('is-invalid')) run(id); });
    el.addEventListener('change', function () { if (el.closest('.field').classList.contains('is-invalid')) run(id); });
  });
  $('codigo_pais').addEventListener('change', function () { if ($('telefono').value) run('telefono'); });
  $('acepta').addEventListener('change', function () {
    state.acceptedAt = this.checked ? new Date().toISOString() : '';
  });

  /* ---------- Estado visual ---------- */
  function setLoading(on) {
    state.inFlight = on;
    btn.disabled = on;
    btn.classList.toggle('is-loading', on);
    btn.setAttribute('aria-busy', on ? 'true' : 'false');
    btn.querySelector('.btn__txt').textContent = on ? 'Enviando…' : 'Quiero conocer la solución';
    statusBox.textContent = on ? 'Enviando tu solicitud…' : '';
  }
  function showAlert(msg) {
    alertBox.textContent = msg;
    alertBox.hidden = !msg;
    if (msg) alertBox.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  /* ---------- Envío ---------- */
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (state.inFlight || state.done) return;   // evita doble envío
    showAlert('');

    var results = {}, firstBad = null;
    Object.keys(checks).forEach(function (id) {
      results[id] = run(id);
      if (!results[id].ok && !firstBad) firstBad = id;
    });
    if (firstBad) {
      showAlert('Revisa los campos marcados para continuar.');
      $(firstBad).focus();
      return;
    }

    if (!CFG.ENDPOINT_URL) {
      showAlert('El formulario aún no está conectado a la base de datos (falta ENDPOINT_URL en js/config.js). Tus datos no se enviaron.');
      return;
    }

    var payload = {
      request_id: state.requestId,
      nombre_completo: results.nombre.value,
      correo_empresarial: results.correo.value,
      codigo_pais: results.codigo_pais.value,
      telefono: results.telefono.value,
      empresa: results.empresa.value,
      pais: results.pais.value,
      acepta_politicas: true,
      version_politicas: CFG.POLICY_VERSION,
      fecha_aceptacion: state.acceptedAt || new Date().toISOString(),
      hp: $('sitio_web').value,
      elapsed_ms: Date.now() - state.startedAt
    };
    if (CFG.SEND_UTM) payload.utm = state.utm;

    send(payload);
  });

  function send(payload) {
    setLoading(true);
    var ctrl = ('AbortController' in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, CFG.REQUEST_TIMEOUT_MS || 20000);

    // text/plain evita el preflight CORS, que Apps Script no responde.
    fetch(CFG.ENDPOINT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      credentials: 'omit',
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (res) {
        return res.text().then(function (t) {
          var data = null;
          try { data = JSON.parse(t); } catch (e) { /* respuesta no JSON */ }
          return { http: res.status, data: data };
        });
      })
      .then(function (r) {
        clearTimeout(timer);
        var d = r.data;
        // Éxito SOLO si el backend confirma que la fila quedó guardada.
        if (r.http === 200 && d && d.ok === true && d.saved === true && d.id) return success();
        failure(d);
      })
      .catch(function (err) {
        clearTimeout(timer);
        failure({ code: err && err.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK' });
      });
  }

  function failure(d) {
    setLoading(false);
    var code = d && d.code;
    if (code === 'VALIDATION' && d.fields) {
      var first = null;
      Object.keys(d.fields).forEach(function (k) {
        var map = { nombre_completo: 'nombre', correo_empresarial: 'correo', acepta_politicas: 'acepta' };
        var id = map[k] || k;
        if ($(id)) { setError(id, d.fields[k]); if (!first) first = id; }
      });
      showAlert('Revisa los campos marcados para continuar.');
      if (first) $(first).focus();
      return;
    }
    var msgs = {
      POLICY_VERSION: 'Las políticas se actualizaron. Recarga la página, revísalas y vuelve a enviar.',
      RATE_LIMIT: 'Recibimos demasiadas solicitudes en poco tiempo. Espera unos minutos e inténtalo de nuevo.',
      TIMEOUT: 'El servidor tardó demasiado en responder. Tus datos siguen aquí: vuelve a intentarlo.',
      NETWORK: 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo; tus datos siguen aquí.'
    };
    showAlert(msgs[code] || 'No pudimos guardar tu solicitud en este momento. Tus datos siguen aquí: inténtalo de nuevo en unos minutos.');
  }

  function success() {
    state.done = true;
    setLoading(false);
    form.hidden = true;
    var done = $('done');
    done.hidden = false;
    done.focus();
    statusBox.textContent = '';
    scheduleClose();
  }

  /* ---------- Cierre de la landing tras guardar ---------- */
  function closeLanding() {
    try { window.close(); } catch (e) { /* ignorado */ }
    // Si el navegador no permitió cerrar (pestaña no abierta por script):
    setTimeout(function () {
      if (!window.closed && CFG.CLOSE_REDIRECT_URL) location.replace(CFG.CLOSE_REDIRECT_URL);
    }, 300);
  }
  function scheduleClose() {
    var secs = Number(CFG.CLOSE_AFTER_SECONDS) || 0;
    if (secs <= 0) return;
    var cd = $('countdown');
    $('done-close').hidden = false;
    cd.textContent = secs;
    var t = setInterval(function () {
      secs -= 1;
      cd.textContent = Math.max(secs, 0);
      if (secs <= 0) { clearInterval(t); closeLanding(); }
    }, 1000);
  }
  $('close-now').addEventListener('click', closeLanding);

  /* ---------- Botones que llevan al formulario ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('a[data-scroll][href="#registro"]'), function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      $('registro').scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(function () { if (!state.done) $('nombre').focus({ preventScroll: true }); }, 450);
      if (history.replaceState) history.replaceState(null, '', '#registro');
    });
  });
})();
