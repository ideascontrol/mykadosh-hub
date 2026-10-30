/**
 * Backend - Landing Piloto biometrico 15 dias - Ideas Control
 * Google Apps Script desplegado como Aplicacion web.
 *
 * Escribe UNA fila por solicitud en la pestana LEADS del archivo
 * BD_Campana_Piloto_WFM. No expone lectura de registros: la unica respuesta
 * publica es {ok, saved, id} o un codigo de error.
 *
 * Configuracion: Proyecto > Configuracion > Propiedades del script
 *   SHEET_ID            (obligatorio) ID del archivo BD_Campana_Piloto_WFM
 *   POLICY_VERSION      (obligatorio) igual a POLICY_VERSION de js/config.js
 *   SHEET_NAME          (opcional)  por defecto LEADS
 *   BLOCKED_DOMAINS     (opcional)  dominios personales separados por coma
 *   RATE_GLOBAL_PER_MIN (opcional)  por defecto 20 registros nuevos por minuto
 *   RATE_EMAIL_PER_DAY  (opcional)  por defecto 3 registros nuevos por correo cada 24 h
 *   MIN_FILL_MS         (opcional)  por defecto 2500 ms (antibots)
 *   TIMEZONE            (opcional)  por defecto America/Bogota
 */

var HEADERS = [
  'id', 'fecha_registro', 'nombre_completo', 'correo_empresarial', 'codigo_pais',
  'telefono', 'empresa', 'pais', 'acepta_politicas', 'version_politicas', 'fecha_aceptacion'
];

var DEFAULT_BLOCKED = [
  'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.es', 'hotmail.co', 'outlook.com', 'outlook.es',
  'live.com', 'live.com.mx', 'msn.com', 'yahoo.com', 'yahoo.es', 'yahoo.com.co', 'yahoo.com.mx',
  'ymail.com', 'icloud.com', 'me.com', 'aol.com', 'protonmail.com', 'proton.me'
];

var EMAIL_RE = /^[A-Za-z0-9._%+\-]+@(?:[A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/;
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
var MAX_BODY = 10000;

/* ======================= Entradas HTTP ======================= */

function doPost(e) {
  var out;
  try {
    var body = e && e.postData && e.postData.contents;
    if (!body || body.length > MAX_BODY) {
      out = { ok: false, code: 'BAD_REQUEST' };
    } else {
      var payload;
      try { payload = JSON.parse(body); } catch (err) { payload = null; }
      out = payload && typeof payload === 'object' ? handleLead_(payload) : { ok: false, code: 'BAD_REQUEST' };
    }
  } catch (err) {
    logError_('UNHANDLED', err);
    out = { ok: false, code: 'SERVER_ERROR' };
  }
  return json_(out);
}

/* GET no expone datos: solo confirma que el servicio esta activo. */
function doGet() {
  return json_({ ok: true, service: 'piloto-biometrico-ic' });
}

/* ======================= Logica principal ======================= */

function handleLead_(p) {
  var cfg = getConfig_();
  if (!cfg.sheetId || !cfg.policyVersion) {
    logError_('CONFIG_MISSING', null);
    return { ok: false, code: 'SERVER_ERROR' };
  }

  // 1) Antiabuso: campo trampa y tiempo minimo de diligenciamiento.
  if (p.hp) return { ok: false, code: 'REJECTED' };
  if (typeof p.elapsed_ms !== 'number' || p.elapsed_ms < cfg.minFillMs) return { ok: false, code: 'REJECTED' };

  // 2) Identificador de la solicitud (tambien es el id de la fila -> idempotencia).
  var id = String(p.request_id || '').toLowerCase();
  if (!UUID_RE.test(id)) return { ok: false, code: 'BAD_REQUEST' };

  // 3) Validacion de campos (misma regla que el cliente).
  var v = validatePayload_(p, cfg);
  if (!v.ok) return { ok: false, code: 'VALIDATION', fields: v.fields };
  if (String(p.version_politicas || '') !== cfg.policyVersion) return { ok: false, code: 'POLICY_VERSION' };

  var now = new Date();
  var accepted = parseAcceptance_(p.fecha_aceptacion, now);

  // 4) Escritura con bloqueo para evitar condiciones de carrera.
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { ok: false, code: 'BUSY' };
  try {
    var cache = CacheService.getScriptCache();
    if (cache.get('rid:' + id)) return { ok: true, saved: true, id: id, duplicate: true };

    var sheet = getSheet_(cfg);
    if (!sheet) { logError_('SHEET_NOT_FOUND', null); return { ok: false, code: 'SERVER_ERROR' }; }
    if (idExists_(sheet, id)) {
      cache.put('rid:' + id, '1', 21600);
      return { ok: true, saved: true, id: id, duplicate: true };
    }

    // Limites de frecuencia (solo para registros nuevos; los reintentos no cuentan).
    var minuteKey = 'rl:g:' + Utilities.formatDate(now, 'UTC', 'yyyyMMddHHmm');
    var g = Number(cache.get(minuteKey) || 0);
    if (g >= cfg.rateGlobal) return { ok: false, code: 'RATE_LIMIT' };
    var emailKey = 'rl:e:' + sha256_(v.data.correo_empresarial);
    var ec = Number(cache.get(emailKey) || 0);
    if (ec >= cfg.rateEmail) return { ok: false, code: 'RATE_LIMIT' };

    var row = [
      id,
      now,
      safeCell_(v.data.nombre_completo),
      safeCell_(v.data.correo_empresarial),
      asText_(v.data.codigo_pais),
      asText_(v.data.telefono),
      safeCell_(v.data.empresa),
      safeCell_(v.data.pais),
      'SI',
      asText_(cfg.policyVersion),
      accepted
    ];
    var r = sheet.getLastRow() + 1;               // nunca sobrescribe: siempre la fila siguiente
    sheet.getRange(r, 1, 1, HEADERS.length).setValues([row]);
    SpreadsheetApp.flush();

    // Confirmacion: la fila escrita debe tener el id esperado.
    if (String(sheet.getRange(r, 1).getValue()) !== id) {
      logError_('WRITE_VERIFY_FAILED', null);
      return { ok: false, code: 'SERVER_ERROR' };
    }

    cache.put('rid:' + id, '1', 21600);
    cache.put(minuteKey, String(g + 1), 120);
    cache.put(emailKey, String(ec + 1), 86400);
    return { ok: true, saved: true, id: id };
  } catch (err) {
    logError_('WRITE_FAILED', err);
    return { ok: false, code: 'SERVER_ERROR' };
  } finally {
    lock.releaseLock();
  }
}

/* ======================= Validaciones ======================= */

function cleanText_(v) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
}

function validatePayload_(p, cfg) {
  var f = {}, d = {};

  var name = cleanText_(p.nombre_completo);
  if (name.length < 3 || name.length > 120 || !/[A-Za-z\u00C0-\u00FF]/.test(name)) f.nombre_completo = 'Escribe un nombre completo v\u00E1lido.';
  d.nombre_completo = name;

  var email = cleanText_(p.correo_empresarial).toLowerCase();
  if (!email || email.length > 160 || !EMAIL_RE.test(email) || email.indexOf('..') !== -1) {
    f.correo_empresarial = 'Revisa el formato del correo.';
  } else if (cfg.blocked.indexOf(email.split('@')[1]) !== -1) {
    f.correo_empresarial = 'Usa un correo de tu empresa. No aceptamos correos personales.';
  }
  d.correo_empresarial = email;

  var dial = cleanText_(p.codigo_pais);
  if (!/^\+[1-9]\d{0,3}$/.test(dial)) f.codigo_pais = 'Selecciona el c\u00F3digo de pa\u00EDs.';
  d.codigo_pais = dial;

  var phone = cleanText_(p.telefono);
  var dialDigits = dial.replace(/\D/g, '');
  if (!/^\d{4,15}$/.test(phone) || dialDigits.length + phone.length > 15) f.telefono = 'Revisa el n\u00FAmero de tel\u00E9fono.';
  d.telefono = phone;

  var company = cleanText_(p.empresa);
  if (company.length < 2 || company.length > 150) f.empresa = 'Escribe el nombre de tu empresa.';
  d.empresa = company;

  var country = cleanText_(p.pais);
  if (country.length < 2 || country.length > 80) f.pais = 'Selecciona el pa\u00EDs.';
  d.pais = country;

  if (p.acepta_politicas !== true) f.acepta_politicas = 'Debes autorizar el tratamiento de datos y aceptar los t\u00E9rminos.';

  return { ok: Object.keys(f).length === 0, fields: f, data: d };
}

/* Fecha de aceptacion enviada por el navegador; si es invalida o inverosimil se usa la hora del servidor. */
function parseAcceptance_(iso, now) {
  var t = new Date(String(iso || ''));
  if (isNaN(t.getTime())) return now;
  var diff = now.getTime() - t.getTime();
  if (diff < -5 * 60 * 1000 || diff > 24 * 3600 * 1000) return now;
  return t;
}

/* ======================= Hoja de calculo ======================= */

function getSheet_(cfg) {
  var ss = SpreadsheetApp.openById(cfg.sheetId);
  return ss.getSheetByName(cfg.sheetName);
}

function idExists_(sheet, id) {
  if (sheet.getLastRow() < 2) return false;
  var found = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
    .createTextFinder(id).matchEntireCell(true).findNext();
  return !!found;
}

/* Neutraliza formulas (=, +, -, @) e inyeccion en Sheets. */
function safeCell_(s) {
  s = String(s);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}
/* Fuerza texto (conserva ceros iniciales y el signo + del prefijo). */
function asText_(s) {
  return "'" + String(s);
}

/**
 * Ejecutar UNA VEZ desde el editor (cuenta propietaria del archivo):
 * crea/valida la pestana LEADS con las columnas exactas, formatos y proteccion.
 */
function setup() {
  var cfg = getConfig_();
  if (!cfg.sheetId) throw new Error('Falta la propiedad SHEET_ID.');
  var ss = SpreadsheetApp.openById(cfg.sheetId);
  ss.setSpreadsheetTimeZone(cfg.tz);
  var sh = ss.getSheetByName(cfg.sheetName) || ss.insertSheet(cfg.sheetName);

  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  } else {
    var current = sh.getRange(1, 1, 1, HEADERS.length).getValues()[0].map(String);
    if (current.join('|') !== HEADERS.join('|')) {
      throw new Error('Los encabezados de ' + cfg.sheetName + ' no coinciden con el esquema aprobado. No se modific\u00F3 nada.');
    }
  }
  sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#0E76BC').setFontColor('#FFFFFF');
  sh.setFrozenRows(1);
  sh.getRange('B2:B').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sh.getRange('K2:K').setNumberFormat('yyyy-mm-dd hh:mm:ss');

  // Proteccion: solo el propietario (y quien el agregue) puede editar.
  var prot = sh.protect().setDescription('LEADS - solo personal autorizado');
  prot.removeEditors(prot.getEditors());
  if (prot.canDomainEdit()) prot.setDomainEdit(false);
  console.log('LEADS listo. Columnas: ' + HEADERS.join(', '));
}

/**
 * Prueba manual desde el editor: inserta un registro marcado como PRUEBA.
 * Borre la fila despues de verificarla.
 */
function pruebaRegistro() {
  try {
    var cfg = getConfig_();
    console.log('Probando con SHEET_ID=' + cfg.sheetId + ' | POLICY_VERSION=' + cfg.policyVersion);
    var res = handleLead_({
      request_id: Utilities.getUuid(),
      nombre_completo: 'PRUEBA Registro Tecnico',
      correo_empresarial: 'info@empresa-de-prueba.com',
      codigo_pais: '+57',
      telefono: '3001234567',
      empresa: 'PRUEBA S.A.S.',
      pais: 'Colombia',
      acepta_politicas: true,
      version_politicas: cfg.policyVersion,
      fecha_aceptacion: new Date().toISOString(),
      hp: '',
      elapsed_ms: 10000
    });
    console.log('Resultado: ' + JSON.stringify(res));
  } catch (e) {
    console.log('FALLA en pruebaRegistro: ' + e.message);
  }
}

/**
 * Diagnostico paso a paso: ejecutar desde el editor si algo falla.
 * Indica en que paso esta el problema.
 */
function diagnostico() {
  var paso = '';
  try {
    paso = '1 propiedades';
    var cfg = getConfig_();
    console.log('SHEET_ID=' + cfg.sheetId + ' | POLICY_VERSION=' + cfg.policyVersion + ' | SHEET_NAME=' + cfg.sheetName);
    if (!cfg.sheetId) { console.log('FALTA la propiedad SHEET_ID'); return; }
    if (!cfg.policyVersion) { console.log('FALTA la propiedad POLICY_VERSION'); return; }

    paso = '2 abrir hoja';
    var ss = SpreadsheetApp.openById(cfg.sheetId);
    console.log('Archivo: ' + ss.getName());

    paso = '3 pestana LEADS';
    var sh = ss.getSheetByName(cfg.sheetName);
    console.log('Pestanas: ' + ss.getSheets().map(function (x) { return '[' + x.getName() + ']'; }).join(' '));
    if (!sh) { console.log('NO existe la pestana ' + cfg.sheetName + '. Ejecute setup.'); return; }
    console.log('Filas en ' + cfg.sheetName + ': ' + sh.getLastRow());
    console.log('Encabezados: ' + sh.getRange(1, 1, 1, HEADERS.length).getValues()[0].join(', '));

    paso = '4 bloqueo';
    var lock = LockService.getScriptLock();
    console.log('Bloqueo obtenido: ' + lock.tryLock(5000));
    lock.releaseLock();

    paso = '5 cache';
    CacheService.getScriptCache().put('diag', '1', 60);

    paso = '6 hash';
    sha256_('prueba@empresa.com');

    paso = '7 uuid';
    console.log('UUID: ' + Utilities.getUuid());

    console.log('TODO OK');
  } catch (e) {
    console.log('FALLA EN PASO ' + paso + ': ' + e.message);
  }
}

/* ======================= Utilidades ======================= */

function getConfig_() {
  var props = PropertiesService.getScriptProperties();
  var blocked = props.getProperty('BLOCKED_DOMAINS');
  return {
    sheetId: props.getProperty('SHEET_ID') || '',
    sheetName: props.getProperty('SHEET_NAME') || 'LEADS',
    policyVersion: props.getProperty('POLICY_VERSION') || '',
    blocked: (blocked ? blocked.split(',') : DEFAULT_BLOCKED).map(function (s) { return s.trim().toLowerCase(); }).filter(String),
    rateGlobal: Number(props.getProperty('RATE_GLOBAL_PER_MIN')) || 20,
    rateEmail: Number(props.getProperty('RATE_EMAIL_PER_DAY')) || 3,
    minFillMs: Number(props.getProperty('MIN_FILL_MS')) || 2500,
    tz: props.getProperty('TIMEZONE') || 'America/Bogota'
  };
}

function sha256_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}

/* Registro tecnico sin datos personales (visible en Ejecuciones de Apps Script). */
function logError_(code, err) {
  console.error(JSON.stringify({ code: code, type: err && err.name, at: new Date().toISOString() }));
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
