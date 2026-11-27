/**
 * Backend - Landing Piloto biometrico 15 dias - Ideas Control
 * Google Apps Script desplegado como Aplicacion web.
 *
 * Version 2026-11-27: escribe UNA fila por solicitud en la pestana Leads del
 * archivo Base_Maestra_Microapps_Ideas_Control. Escribe por NOMBRE de columna
 * (no por posicion): las columnas pueden estar en cualquier orden, puede haber
 * columnas que esta landing deja vacias, y las tildes o la enie en los
 * encabezados no importan (campaña = campana).
 * No expone lectura de registros: la unica respuesta publica es {ok, saved, id}
 * o un codigo de error.
 *
 * Configuracion: Proyecto > Configuracion > Propiedades del script
 *   SHEET_ID            (obligatorio) ID del archivo Base_Maestra_Microapps_Ideas_Control
 *   POLICY_VERSION      (obligatorio) igual a POLICY_VERSION de js/config.js
 *   SHEET_NAME          (opcional)  por defecto Leads
 *   LANDING_ID          (opcional)  por defecto LAN-001
 *   MICROAPP_ID         (opcional)  por defecto APP-001
 *   ESTADO_INICIAL      (opcional)  por defecto Nuevo
 *   BLOCKED_DOMAINS     (opcional)  dominios personales separados por coma
 *   RATE_GLOBAL_PER_MIN (opcional)  por defecto 20 registros nuevos por minuto
 *   RATE_EMAIL_PER_DAY  (opcional)  por defecto 3 registros nuevos por correo cada 24 h
 *   MIN_FILL_MS         (opcional)  por defecto 2500 ms (antibots)
 *   TIMEZONE            (opcional)  por defecto America/Bogota
 *
 * Despues de pegar este archivo: ejecute verificar() desde el editor. Indica si
 * la pestana Leads tiene todas las columnas que esta landing necesita.
 */

/* Columnas que esta landing llena. Las marcadas como obligatorias deben existir en Leads. */
var OBLIGATORIAS = [
  'lead_id', 'fecha_registro', 'nombre', 'apellido', 'email', 'codigo_pais', 'telefono',
  'empresa', 'pais', 'acepta_politicas', 'version_politicas', 'fecha_aceptacion'
];
var OPCIONALES = [
  'landing_id', 'microapp_id', 'estado_lead', 'fecha_ultima_interaccion',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'
];
var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
var COLS_FECHA = ['fecha_registro', 'fecha_aceptacion', 'fecha_ultima_interaccion'];

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

  // 2) Identificador de la solicitud (es el lead_id de la fila -> idempotencia).
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
    var cols = columnas_(sheet);
    var faltan = OBLIGATORIAS.filter(function (k) { return !(k in cols.idx); });
    if (faltan.length) { logError_('COLUMNS_MISSING: ' + faltan.join(','), null); return { ok: false, code: 'SERVER_ERROR' }; }

    if (idExists_(sheet, cols.idx.lead_id + 1, id)) {
      cache.put('rid:' + id, '1', 21600);
      return { ok: true, saved: true, id: id, duplicate: true };
    }

    // Limites de frecuencia (solo para registros nuevos; los reintentos no cuentan).
    var minuteKey = 'rl:g:' + Utilities.formatDate(now, 'UTC', 'yyyyMMddHHmm');
    var g = Number(cache.get(minuteKey) || 0);
    if (g >= cfg.rateGlobal) return { ok: false, code: 'RATE_LIMIT' };
    var emailKey = 'rl:e:' + sha256_(v.data.email);
    var ec = Number(cache.get(emailKey) || 0);
    if (ec >= cfg.rateEmail) return { ok: false, code: 'RATE_LIMIT' };

    // Valores por nombre de columna; las columnas que no estan aqui quedan vacias.
    var valores = {
      lead_id: id,
      fecha_registro: now,
      nombre: safeCell_(v.data.nombre),
      apellido: safeCell_(v.data.apellido),
      email: safeCell_(v.data.email),
      codigo_pais: asText_(v.data.codigo_pais),
      telefono: asText_(v.data.telefono),
      empresa: safeCell_(v.data.empresa),
      pais: safeCell_(v.data.pais),
      landing_id: cfg.landingId,
      microapp_id: cfg.microappId,
      estado_lead: cfg.estadoInicial,
      fecha_ultima_interaccion: now,
      acepta_politicas: 'SI',
      version_politicas: asText_(cfg.policyVersion),
      fecha_aceptacion: accepted
    };
    var utm = utmValues_(p.utm);
    UTM_KEYS.forEach(function (k) { valores[k] = utm[k]; });

    var fila = [];
    for (var c = 0; c < cols.ancho; c++) fila.push('');
    Object.keys(valores).forEach(function (k) { if (k in cols.idx) fila[cols.idx[k]] = valores[k]; });

    var r = sheet.getLastRow() + 1;               // nunca sobrescribe: siempre la fila siguiente
    sheet.getRange(r, 1, 1, cols.ancho).setValues([fila]);
    COLS_FECHA.forEach(function (k) { if (k in cols.idx) sheet.getRange(r, cols.idx[k] + 1).setNumberFormat('yyyy-mm-dd hh:mm:ss'); });
    SpreadsheetApp.flush();

    // Confirmacion: la fila escrita debe tener el lead_id esperado.
    if (String(sheet.getRange(r, cols.idx.lead_id + 1).getValue()) !== id) {
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

  var nombre = cleanText_(p.nombre);
  if (nombre.length < 2 || nombre.length > 60 || !/[A-Za-zÀ-ÿ]/.test(nombre)) f.nombre = 'Escribe un nombre válido.';
  d.nombre = nombre;

  var apellido = cleanText_(p.apellido);
  if (apellido.length < 2 || apellido.length > 60 || !/[A-Za-zÀ-ÿ]/.test(apellido)) f.apellido = 'Escribe un apellido válido.';
  d.apellido = apellido;

  var email = cleanText_(p.correo_empresarial).toLowerCase();
  if (!email || email.length > 160 || !EMAIL_RE.test(email) || email.indexOf('..') !== -1) {
    f.correo_empresarial = 'Revisa el formato del correo.';
  } else if (cfg.blocked.indexOf(email.split('@')[1]) !== -1) {
    f.correo_empresarial = 'Usa un correo de tu empresa. No aceptamos correos personales.';
  }
  d.email = email;

  var dial = cleanText_(p.codigo_pais);
  if (!/^\+[1-9]\d{0,3}$/.test(dial)) f.codigo_pais = 'Selecciona el código de país.';
  d.codigo_pais = dial;

  var phone = cleanText_(p.telefono);
  var dialDigits = dial.replace(/\D/g, '');
  if (!/^\d{4,15}$/.test(phone) || dialDigits.length + phone.length > 15) f.telefono = 'Revisa el número de teléfono.';
  d.telefono = phone;

  var company = cleanText_(p.empresa).toLocaleUpperCase('es-CO');   // regla IC: empresa en MAYUSCULAS
  if (company.length < 2 || company.length > 150) f.empresa = 'Escribe el nombre de tu empresa.';
  d.empresa = company;

  var country = cleanText_(p.pais);
  if (country.length < 2 || country.length > 80) f.pais = 'Selecciona el país.';
  d.pais = country;

  if (p.acepta_politicas !== true) f.acepta_politicas = 'Debes autorizar el tratamiento de datos y aceptar los términos.';

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

/* Encabezado normalizado: minusculas, sin tildes ni enie, espacios como guion bajo. */
function clave_(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim().replace(/\s+/g, '_');
}

/* Mapa columna -> posicion (base 0) leido de la fila 1. */
function columnas_(sheet) {
  var ancho = sheet.getLastColumn();
  var idx = {};
  if (ancho < 1) return { ancho: 0, idx: idx, encabezados: [] };
  var enc = sheet.getRange(1, 1, 1, ancho).getValues()[0];
  enc.forEach(function (h, i) { var k = clave_(h); if (k && !(k in idx)) idx[k] = i; });
  return { ancho: ancho, idx: idx, encabezados: enc };
}

function idExists_(sheet, col, id) {
  if (sheet.getLastRow() < 2) return false;
  var found = sheet.getRange(2, col, sheet.getLastRow() - 1, 1)
    .createTextFinder(id).matchEntireCell(true).findNext();
  return !!found;
}

/* Neutraliza formulas (=, +, -, @) e inyeccion en Sheets. */
function safeCell_(s) {
  s = String(s);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}
/* Etiquetas UTM: solo texto, sin caracteres de control, maximo 100 caracteres. */
function utmValues_(u) {
  u = (u && typeof u === 'object') ? u : {};
  var out = {};
  UTM_KEYS.forEach(function (k) {
    var v = u[k] == null ? '' : String(u[k]).replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, 100);
    out[k] = safeCell_(v);
  });
  return out;
}
/* Fuerza texto (conserva ceros iniciales y el signo + del prefijo). */
function asText_(s) {
  return "'" + String(s);
}

/**
 * Ejecutar desde el editor despues de pegar este archivo (no modifica la hoja):
 * revisa el archivo, la pestana Leads y que existan las columnas que usa esta landing.
 */
function verificar() {
  var cfg = getConfig_();
  if (!cfg.sheetId) { console.log('FALTA la propiedad SHEET_ID'); return; }
  if (!cfg.policyVersion) { console.log('FALTA la propiedad POLICY_VERSION'); return; }
  var ss = SpreadsheetApp.openById(cfg.sheetId);
  console.log('Archivo: ' + ss.getName());
  var sh = ss.getSheetByName(cfg.sheetName);
  if (!sh) {
    console.log('NO existe la pestana ' + cfg.sheetName + '. Pestanas: ' + ss.getSheets().map(function (x) { return '[' + x.getName() + ']'; }).join(' '));
    return;
  }
  var cols = columnas_(sh);
  console.log('Encabezados de ' + cfg.sheetName + ': ' + cols.encabezados.join(' | '));
  var faltan = OBLIGATORIAS.filter(function (k) { return !(k in cols.idx); });
  var faltanOp = OPCIONALES.filter(function (k) { return !(k in cols.idx); });
  if (faltan.length) console.log('FALTAN columnas obligatorias (la landing no podra guardar): ' + faltan.join(', '));
  if (faltanOp.length) console.log('Faltan columnas opcionales (se omiten): ' + faltanOp.join(', '));
  console.log('landing_id=' + cfg.landingId + ' | microapp_id=' + cfg.microappId + ' | estado_lead=' + cfg.estadoInicial + ' | POLICY_VERSION=' + cfg.policyVersion);
  if (!faltan.length) console.log('TODO OK: la landing puede guardar en ' + cfg.sheetName + '.');
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
      nombre: 'PRUEBA',
      apellido: 'Registro Tecnico',
      correo_empresarial: 'info@empresa-de-prueba.com',
      codigo_pais: '+57',
      telefono: '3001234567',
      empresa: 'PRUEBA S.A.S.',
      pais: 'Colombia',
      acepta_politicas: true,
      version_politicas: cfg.policyVersion,
      fecha_aceptacion: new Date().toISOString(),
      hp: '',
      elapsed_ms: 10000,
      utm: { utm_source: 'prueba', utm_medium: 'manual', utm_campaign: 'prueba-utm' }
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
    paso = '1 propiedades y hoja';
    verificar();

    paso = '2 bloqueo';
    var lock = LockService.getScriptLock();
    console.log('Bloqueo obtenido: ' + lock.tryLock(5000));
    lock.releaseLock();

    paso = '3 cache';
    CacheService.getScriptCache().put('diag', '1', 60);

    paso = '4 hash';
    sha256_('prueba@empresa.com');

    paso = '5 uuid';
    console.log('UUID: ' + Utilities.getUuid());

    console.log('Diagnostico terminado');
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
    sheetName: props.getProperty('SHEET_NAME') || 'Leads',
    policyVersion: props.getProperty('POLICY_VERSION') || '',
    landingId: props.getProperty('LANDING_ID') || 'LAN-001',
    microappId: props.getProperty('MICROAPP_ID') || 'APP-001',
    estadoInicial: props.getProperty('ESTADO_INICIAL') || 'Nuevo',
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
  console.error(JSON.stringify({ code: code, type: err && err.name, message: err && err.message, at: new Date().toISOString() }));
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
