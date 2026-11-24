/**
 * =====================================================================
 *  Contacto web · Ideas Control
 *  Recibe el formulario «Agenda tu asesoría» de la página web,
 *  guarda cada solicitud en la hoja "Contacto_Web" y envía un aviso
 *  a info@ideascontrol.com (responder el correo le llega al cliente).
 *
 *  Instalación (una sola vez):
 *   1. Crear una hoja de cálculo de Google: "Contacto Web Ideas Control".
 *   2. Extensiones › Apps Script › pegar este archivo completo como Code.gs.
 *   3. Ejecutar la función probarAviso() y autorizar los permisos.
 *      (Crea la hoja "Contacto_Web" y envía un correo de prueba.)
 *   4. Implementar › Nueva implementación › Tipo: Aplicación web
 *        Ejecutar como: Yo · Quién tiene acceso: Cualquier usuario.
 *   5. Copiar la URL que termina en /exec y enviarla para conectarla
 *      en la página (CONTACTO_URL en web-borrador/js/web.js).
 *
 *  Si cambia este código: Implementar › Gestionar implementaciones ›
 *  editar (lápiz) › Versión: Nueva versión. Así la URL no cambia.
 * =====================================================================
 */

const CONFIG = {
  DESTINO: 'info@ideascontrol.com',
  HOJA: 'Contacto_Web',
  ASUNTO: 'Nueva solicitud desde la página web',
  REMITENTE: 'Página web Ideas Control',
  ZONA: 'America/Bogota',
  VERSION: '1.0.0'
};

const COLUMNAS = [
  'fecha', 'id', 'nombre', 'correo', 'empresa', 'pais', 'codigo_pais', 'telefono', 'necesidad',
  'origen', 'acepto_politica', 'version_politica', 'texto_autorizacion', 'url_pagina',
  'utm_source', 'utm_medium', 'utm_campaign', 'aviso_enviado'
];

const LIMITES = { nombre: 120, correo: 160, empresa: 160, pais: 60, codigo_pais: 8, telefono: 40, necesidad: 2000, origen: 120, texto_autorizacion: 1000, url_pagina: 300 };

/** Permite comprobar que la implementación responde (abrir la URL /exec en el navegador). */
function doGet() {
  return json_({ ok: true, servicio: 'contacto-web-ideas-control', version: CONFIG.VERSION });
}

/** Recibe la solicitud enviada por la página (JSON en el cuerpo, Content-Type text/plain). */
function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (d.hp) return json_({ ok: true }); // trampa para robots: se ignora sin avisar

    const r = limpiar_(d);
    const error = validar_(r);
    if (error) return json_({ ok: false, error: error });

    r.fecha = new Date();
    r.id = 'WEB-' + Utilities.formatDate(r.fecha, CONFIG.ZONA, 'yyyyMMdd-HHmmss') + '-' + Math.floor(100 + Math.random() * 900);

    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    let fila;
    try {
      const hoja = hoja_();
      hoja.appendRow(COLUMNAS.map(function (c) { return c === 'fecha' ? r.fecha : seguro_(r[c]); }));
      fila = hoja.getLastRow();
    } finally {
      lock.releaseLock();
    }

    let aviso = 'SI';
    try { enviarAviso_(r); } catch (x) { aviso = 'ERROR: ' + x.message; }
    hoja_().getRange(fila, COLUMNAS.indexOf('aviso_enviado') + 1).setValue(aviso);

    return json_({ ok: true, id: r.id });
  } catch (x) {
    console.error(x);
    return json_({ ok: false, error: 'No fue posible registrar la solicitud.' });
  }
}

/** Ejecutar una vez desde el editor para autorizar permisos y probar el correo. */
function probarAviso() {
  hoja_();
  enviarAviso_({
    id: 'PRUEBA', fecha: new Date(), nombre: 'Prueba Ideas Control', correo: CONFIG.DESTINO, empresa: 'PRUEBA',
    pais: 'Colombia', codigo_pais: '+57', telefono: '3000000000', necesidad: 'Correo de prueba del formulario web.',
    origen: 'Prueba desde el editor', url_pagina: ''
  });
}

/* ---------------------------------------------------------------- */

function limpiar_(d) {
  const r = {};
  COLUMNAS.forEach(function (c) {
    let v = d[c] == null ? '' : String(d[c]).trim();
    if (LIMITES[c]) v = v.slice(0, LIMITES[c]);
    r[c] = v;
  });
  r.correo = r.correo.toLowerCase();
  r.empresa = r.empresa.toUpperCase();
  return r;
}

function validar_(r) {
  if (r.nombre.split(/\s+/).length < 2) return 'Escribe tu nombre y apellido.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.correo)) return 'Escribe un correo válido.';
  if (r.empresa.length < 2) return 'Escribe el nombre de tu empresa.';
  if (r.necesidad.length < 5) return 'Cuéntanos brevemente qué necesitas.';
  if (r.acepto_politica !== 'SI') return 'Debes aceptar la Política de Tratamiento de Datos.';
  return '';
}

function hoja_() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let h = libro.getSheetByName(CONFIG.HOJA);
  if (!h) {
    h = libro.insertSheet(CONFIG.HOJA);
    h.getRange(1, 1, 1, COLUMNAS.length).setValues([COLUMNAS]).setFontWeight('bold').setBackground('#0B2945').setFontColor('#ffffff');
    h.setFrozenRows(1);
    h.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm');
  }
  return h;
}

function enviarAviso_(r) {
  const filas = [
    ['Nombre', r.nombre], ['Correo', r.correo], ['Empresa', r.empresa],
    ['País', r.pais + (r.codigo_pais ? ' (' + r.codigo_pais + ')' : '')], ['Teléfono', r.telefono],
    ['Necesidad', r.necesidad], ['Origen', r.origen], ['Página', r.url_pagina], ['Registro', r.id]
  ];
  const html =
    '<div style="font-family:Arial,sans-serif;font-size:14px;color:#1C2B3A">' +
    '<p>Llegó una nueva solicitud desde la página web de Ideas Control:</p>' +
    '<table style="border-collapse:collapse">' +
    filas.map(function (f) {
      return '<tr><td style="padding:6px 12px;background:#F3F6FA;font-weight:bold;vertical-align:top">' + esc_(f[0]) +
        '</td><td style="padding:6px 12px;white-space:pre-wrap">' + esc_(f[1]) + '</td></tr>';
    }).join('') +
    '</table><p style="color:#5B6B7B;font-size:12px">Responde este correo para escribirle directamente al cliente.</p></div>';

  MailApp.sendEmail({
    to: CONFIG.DESTINO,
    replyTo: r.correo,
    name: CONFIG.REMITENTE,
    subject: CONFIG.ASUNTO + ' · ' + (r.empresa || r.nombre),
    htmlBody: html
  });
}

/** Evita que un texto que empiece por = + - @ se interprete como fórmula en la hoja. */
function seguro_(v) {
  v = v == null ? '' : String(v);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function esc_(v) {
  return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
