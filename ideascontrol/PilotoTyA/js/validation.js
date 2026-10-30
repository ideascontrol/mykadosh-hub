/* Validaciones del formulario (cliente). El backend (apps-script/Code.gs)
   repite estas mismas reglas: la validación del navegador es solo ayuda al usuario. */
(function (root) {
  'use strict';

  var EMAIL_RE = /^[A-Za-z0-9._%+\-]+@(?:[A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/;

  function cleanText(v) {
    return String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function validateName(v) {
    var s = cleanText(v);
    if (!s) return { ok: false, value: s, msg: 'Escribe tu nombre completo.' };
    if (s.length < 3) return { ok: false, value: s, msg: 'El nombre es demasiado corto.' };
    if (s.length > 120) return { ok: false, value: s, msg: 'El nombre no puede superar 120 caracteres.' };
    if (!/[A-Za-zÀ-ÿ]/.test(s)) return { ok: false, value: s, msg: 'Escribe un nombre válido.' };
    return { ok: true, value: s };
  }

  /* Solo valida sintaxis y la lista explícita de dominios personales.
     NO verifica que el buzón exista. Los prefijos genéricos (info@, ventas@…) se aceptan. */
  function validateEmail(v, blocked) {
    var s = cleanText(v).toLowerCase();
    if (!s) return { ok: false, value: s, msg: 'Escribe tu correo electrónico empresarial.' };
    if (s.length > 160 || !EMAIL_RE.test(s) || s.indexOf('..') !== -1) {
      return { ok: false, value: s, msg: 'Revisa el formato del correo (ejemplo: nombre@tuempresa.com).' };
    }
    var domain = s.split('@')[1];
    var list = (blocked || []).map(function (d) { return String(d).trim().toLowerCase(); });
    if (list.indexOf(domain) !== -1) {
      return { ok: false, value: s, msg: 'Usa un correo de tu empresa. No aceptamos correos personales como @' + domain + '.' };
    }
    return { ok: true, value: s };
  }

  function validateDialCode(v) {
    var s = cleanText(v);
    if (!/^\+[1-9]\d{0,3}$/.test(s)) return { ok: false, value: s, msg: 'Selecciona el código de país.' };
    return { ok: true, value: s };
  }

  /* lengths: longitudes posibles del número nacional para el país del prefijo (si se conocen). */
  function validatePhone(v, dial, lengths) {
    var raw = cleanText(v);
    if (!raw) return { ok: false, value: '', msg: 'Escribe tu número de teléfono.' };
    if (raw.charAt(0) === '+') return { ok: false, value: raw, msg: 'Escribe el número sin el código de país; el código se elige en la lista.' };
    if (/[^\d\s().-]/.test(raw)) return { ok: false, value: raw, msg: 'El teléfono solo puede tener números.' };
    var digits = raw.replace(/\D/g, '');
    var dialDigits = String(dial || '').replace(/\D/g, '');
    if (dialDigits.length + digits.length > 15 || digits.length < 4) {
      return { ok: false, value: digits, msg: 'La cantidad de dígitos del teléfono no es válida.' };
    }
    if (lengths && lengths.length) {
      var okLen = lengths.indexOf(digits.length) !== -1 ||
        (digits.charAt(0) === '0' && lengths.indexOf(digits.length - 1) !== -1);
      if (!okLen) {
        return { ok: false, value: digits, msg: 'Para el código ' + dial + ' el número debe tener ' + lengths.join(' u ') + ' dígitos.' };
      }
    }
    return { ok: true, value: digits }; // se guarda como texto: conserva ceros iniciales
  }

  function validateCompany(v) {
    var s = cleanText(v);
    if (!s) return { ok: false, value: s, msg: 'Escribe el nombre de tu empresa.' };
    if (s.length < 2) return { ok: false, value: s, msg: 'El nombre de la empresa es demasiado corto.' };
    if (s.length > 150) return { ok: false, value: s, msg: 'El nombre de la empresa no puede superar 150 caracteres.' };
    return { ok: true, value: s };
  }

  function validateCountry(v, validNames) {
    var s = cleanText(v);
    if (!s) return { ok: false, value: s, msg: 'Selecciona el país.' };
    if (validNames && validNames.indexOf(s) === -1) return { ok: false, value: s, msg: 'Selecciona un país de la lista.' };
    return { ok: true, value: s };
  }

  var api = {
    cleanText: cleanText,
    validateName: validateName,
    validateEmail: validateEmail,
    validateDialCode: validateDialCode,
    validatePhone: validatePhone,
    validateCompany: validateCompany,
    validateCountry: validateCountry
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.IC_VALIDATION = api;
})(this);
