/* ==========================================================================
   CONTROL DE ACCESO — usuario y clave únicos (fase inicial)
   Todas las páginas llaman a GDAuth.proteger() antes de mostrar contenido.
   Sin sesión, se redirige a login.html y, al ingresar, se vuelve a la página
   pedida. La sesión dura 12 horas en ese navegador (todas las pestañas); con
   "Recordarme" se conserva 30 días en ese equipo.

   IMPORTANTE: es una barrera de acceso básica para un sitio estático. La clave
   no está escrita en claro, pero quien conozca la dirección de un archivo puede
   abrirlo directamente. Para un control real se requiere un servicio con
   autenticación (p. ej. Google Apps Script, Azure/Microsoft 365 o similar).

   Para cambiar el usuario o la clave: calcule la huella con
     GDAuth.huella('usuario', 'clave')   (en la consola del navegador)
   y reemplace el valor de HUELLA.
   ========================================================================== */
window.GDAuth = (function () {
  const HUELLA = 'be2b538b';                 // usuario y clave únicos del portal (el usuario no distingue mayúsculas)
  const NOMBRE = 'Personal IC';
  const CLAVE_SESION = 'gd_sesion';
  const DIAS_RECORDAR = 30, HORAS_SESION = 12;

  // Huella FNV-1a de 32 bits de "usuario|clave" (el usuario en minúsculas).
  function huella(usuario, clave) {
    const s = String(usuario || '').trim().toLowerCase() + '|' + String(clave || '');
    let h = 0x811c9dc5;
    for (const b of new TextEncoder().encode(s)) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
  }
  const leer = (st) => { try { return JSON.parse(st.getItem(CLAVE_SESION) || 'null'); } catch { return null; } };
  function sesion() {
    const s = leer(sessionStorage) || leer(localStorage);
    if (!s || s.h !== HUELLA) return null;
    if (s.vence && Date.now() > s.vence) { cerrarSesion(false); return null; }
    return s;
  }
  function iniciarSesion(usuario, clave, recordar) {
    if (huella(usuario, clave) !== HUELLA) return false;
    const s = { h: HUELLA, nombre: NOMBRE, inicio: Date.now() };
    const vence = Date.now() + (recordar ? DIAS_RECORDAR * 864e5 : HORAS_SESION * 36e5);
    try { localStorage.setItem(CLAVE_SESION, JSON.stringify({ ...s, vence })); }
    catch { try { sessionStorage.setItem(CLAVE_SESION, JSON.stringify(s)); } catch { } }
    return true;
  }
  // Ruta relativa a la raíz del portal (las páginas de documentos están en /documentos/)
  const base = () => (/\/documentos\/[^/]*$/.test(location.pathname) ? '../' : '');
  function cerrarSesion(redirigir = true) {
    try { sessionStorage.removeItem(CLAVE_SESION); localStorage.removeItem(CLAVE_SESION); } catch { }
    if (redirigir) location.href = base() + 'login.html';
  }
  function usuarioActual() {
    const s = sesion();
    return s ? { nombre: s.nombre || NOMBRE, rol: 'consulta', areas: '*' } : null;
  }
  function proteger() {
    const u = usuarioActual();
    if (!u) {
      const volver = location.pathname.split('/').slice(base() ? -2 : -1).join('/') + location.search + location.hash;
      location.replace(base() + 'login.html?volver=' + encodeURIComponent(volver));
      return null;
    }
    document.documentElement.classList.add('gd-auth-ok');
    return u;
  }
  function puedeVerArea(areaId) {
    const u = usuarioActual();
    return !!u && (u.areas === '*' || (u.areas || []).includes(areaId));
  }
  return { proteger, usuarioActual, puedeVerArea, iniciarSesion, cerrarSesion, huella, MODO_DESARROLLO: false };
})();
