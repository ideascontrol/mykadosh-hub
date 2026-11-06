/* =====================================================================
   IDEAS CONTROL · Formulario estándar de captura de datos (landings)
   assets/js/ic-formulario.js — requiere ic-paises.js e ic-validacion.js.

   Mismos campos y reglas en todas las landings (modelo: PilotoTyA):
     Nombre y apellido · Correo empresarial · Código de país + Teléfono ·
     Empresa · País · [Número de empleados] · Autorización de datos ·
     campo trampa antispam (invisible).
   - El código de país actualiza el país, y el país sugiere el código
     (si la persona no cambió el código a mano).
   - Se rechazan correos personales (gmail, hotmail…). El Apps Script
     repite la regla.

   Uso:
     const f = IC_FORM.crear(contenedor, { empleados: [...], textoAutorizacion, politicaUrl });
     const r = f.validar();   // null si hay errores (ya se muestran), o los datos
   ===================================================================== */
window.IC_FORM = (function () {
  'use strict';
  var V = window.IC_VALIDATION, PAISES = window.IC_COUNTRIES || [];
  var PAIS_DEF = 'CO';
  /* Dominios de correo personal que no se aceptan. Mantener IGUAL a DOMINIOS_BLOQUEADOS del Apps Script. */
  var BLOQUEADOS = ['gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.es', 'hotmail.co', 'outlook.com', 'outlook.es',
    'live.com', 'live.com.mx', 'msn.com', 'yahoo.com', 'yahoo.es', 'yahoo.com.co', 'yahoo.com.mx', 'ymail.com',
    'icloud.com', 'me.com', 'aol.com', 'protonmail.com', 'proton.me'];
  var porIso = {}; PAISES.forEach(function (c) { porIso[c[0]] = c; });
  var nombres = PAISES.map(function (c) { return c[1]; });

  var CSS = '.icf-tel{display:grid;grid-template-columns:minmax(0,240px) minmax(0,1fr);gap:8px}' +
    '.icf-hp{position:absolute!important;left:-9999px!important;width:1px;height:1px;overflow:hidden}' +
    '.icf-consent{margin-top:18px}.icf-consent .consent-box{margin-top:0}.icf-consent .error-text{margin-top:6px;font-size:.8rem;color:var(--err,#B42318);min-height:1em}' +
    '.field .icf-ayuda{font-size:.78rem;color:var(--ink-2,#4E6072)}';
  function estilos() {
    if (document.getElementById('icf-css')) return;
    var st = document.createElement('style'); st.id = 'icf-css'; st.textContent = CSS; document.head.appendChild(st);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function crear(cont, o) {
    o = o || {};
    estilos();
    var p = o.prefijo || 'icf';
    var id = function (k) { return p + '_' + k; };
    var campo = function (k, label, control, full, ayuda) {
      return '<div class="field' + (full ? ' field-full' : '') + '"><label for="' + id(k) + '">' + label + ' <span class="req">*</span></label>' + control +
        (ayuda ? '<span class="icf-ayuda">' + ayuda + '</span>' : '') + '<div class="error-text" id="' + id(k) + '_err"></div></div>';
    };
    var opcCod = PAISES.map(function (c) { return '<option value="' + c[0] + '">' + esc(c[1] + ' (' + c[2] + ')') + '</option>'; }).join('');
    var opcPais = '<option value="" disabled>Selecciona…</option>' + PAISES.map(function (c) { return '<option>' + esc(c[1]) + '</option>'; }).join('');
    var texto = o.textoAutorizacion || '';
    var partes = texto.split('Política de Tratamiento de Datos Personales');
    var politica = o.politicaUrl ? '<a href="' + esc(o.politicaUrl) + '" target="_blank" rel="noopener">Política de Tratamiento de Datos Personales</a>' : 'Política de Tratamiento de Datos Personales';
    var html = '<div class="form-grid">' +
      campo('nombre', 'Nombre y apellido', '<input id="' + id('nombre') + '" type="text" autocomplete="name" maxlength="120">') +
      campo('email', 'Correo empresarial', '<input id="' + id('email') + '" type="email" autocomplete="email" inputmode="email" maxlength="160" placeholder="nombre@tuempresa.com">', false, 'No aceptamos correos personales (gmail, hotmail…).') +
      campo('telefono', 'Teléfono / WhatsApp', '<div class="icf-tel"><select id="' + id('codigo') + '" autocomplete="tel-country-code" aria-label="Código de país">' + opcCod + '</select>' +
        '<input id="' + id('telefono') + '" type="tel" autocomplete="tel-national" inputmode="tel" maxlength="20" placeholder="Número sin el código"></div>', true) +
      campo('empresa', 'Empresa', '<input id="' + id('empresa') + '" type="text" autocomplete="organization" maxlength="150">') +
      campo('pais', 'País', '<select id="' + id('pais') + '" autocomplete="country-name">' + opcPais + '</select>') +
      (o.empleados ? campo('empleados', 'Número de empleados', '<select id="' + id('empleados') + '"><option value="" selected disabled>Selecciona…</option>' +
        o.empleados.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select>', true) : '') +
      '</div>' +
      '<div class="icf-hp" aria-hidden="true"><label for="' + id('hp') + '">No completar</label><input id="' + id('hp') + '" type="text" tabindex="-1" autocomplete="off"></div>' +
      '<div class="icf-consent"><div class="consent-box"><input type="checkbox" id="' + id('acepta') + '"><label for="' + id('acepta') + '">' +
        esc(partes[0]) + politica + esc(partes[1] || '') + ' <span class="req">*</span></label></div><div class="error-text" id="' + id('acepta') + '_err"></div></div>';
    cont.innerHTML = html;

    var $ = function (k) { return cont.querySelector('#' + id(k)); };   // funciona aunque el formulario aún no esté en la página
    var cod = $('codigo'), pais = $('pais'), codTocado = false;
    if (porIso[PAIS_DEF]) { cod.value = PAIS_DEF; pais.value = porIso[PAIS_DEF][1]; }
    // El código actualiza el país; el país sugiere el código si la persona no lo cambió a mano.
    cod.addEventListener('change', function () {
      codTocado = true;
      var c = porIso[cod.value]; if (c) pais.value = c[1];
      limpiar('pais'); if ($('telefono').value) revisar('telefono');
    });
    pais.addEventListener('change', function () {
      if (codTocado) return;
      var c = PAISES.filter(function (x) { return x[1] === pais.value; })[0];
      if (c) cod.value = c[0];
    });

    var reglas = {
      nombre: function () { return V.validateName($('nombre').value); },
      email: function () { return V.validateEmail($('email').value, BLOQUEADOS); },
      telefono: function () { var c = porIso[cod.value]; return V.validatePhone($('telefono').value, c ? c[2] : '', c ? c[3] : null); },
      empresa: function () { return V.validateCompany($('empresa').value); },
      pais: function () { return V.validateCountry(pais.value, nombres); },
      empleados: function () { var v = $('empleados').value; return v ? { ok: true, value: v } : { ok: false, value: '', msg: 'Selecciona el número de empleados.' }; },
      acepta: function () { return $('acepta').checked ? { ok: true, value: true } : { ok: false, value: false, msg: 'Debes autorizar el tratamiento de tus datos para continuar.' }; }
    };
    if (!o.empleados) delete reglas.empleados;
    var control = function (k) { return k === 'telefono' ? $('telefono') : $(k); };
    function mostrar(k, r) {
      var el = control(k), err = $(k + '_err');
      if (el && el.classList) el.classList.toggle('invalid', !r.ok);
      if (err) err.textContent = r.ok ? '' : r.msg;
    }
    function limpiar(k) { mostrar(k, { ok: true }); }
    function revisar(k) { var r = reglas[k](); mostrar(k, r); return r; }
    Object.keys(reglas).forEach(function (k) {
      var el = control(k); if (!el) return;
      el.addEventListener(el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'blur', function () { if (k === 'acepta' || el.value) revisar(k); });
      el.addEventListener('input', function () { if (el.classList.contains('invalid')) revisar(k); });
    });

    function validar() {
      var res = {}, primero = null;
      Object.keys(reglas).forEach(function (k) { var r = revisar(k); res[k] = r; if (!r.ok && !primero) primero = control(k); });
      if (primero) { primero.focus(); return null; }
      var completo = res.nombre.value.replace(/\s+/g, ' ').trim(), partes = completo.split(' ');
      return {
        nombre_completo: completo,
        nombre: partes.shift(),
        apellido: partes.join(' '),
        email: res.email.value,
        codigo_pais: (porIso[cod.value] || [])[2] || '',
        telefono: res.telefono.value,
        empresa: res.empresa.value,
        pais: res.pais.value,
        empleados: res.empleados ? res.empleados.value : '',
        hp: $('hp').value
      };
    }
    return { validar: validar };
  }
  return { crear: crear, BLOQUEADOS: BLOQUEADOS };
})();
