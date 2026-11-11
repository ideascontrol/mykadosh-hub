/* =====================================================================
   APP-106 · Programación — arranque, acceso, encabezado y menú
   Acceso: SYS_Accesos (app_id APP-106) con rol ADMIN | EDITOR | CONSULTA,
   o el correo registrado en OPE_Tecnicos (entra como TECNICO).
   ===================================================================== */
const App = {
  usuario: null,          // { nombre, email, iniciales, rol, usuario_id, tecnico }
  vistas: {},             // App.vistas['agenda'] = fn(contenedor, params)
  estado: { mes: null, tipo: '', tec: '' }   // filtros compartidos entre vistas
};
App.puedeEditar = () => App.usuario && (App.usuario.rol === 'ADMIN' || App.usuario.rol === 'EDITOR');
App.esAdmin = () => App.usuario && App.usuario.rol === 'ADMIN';
App.params = () => (location.hash || '#').slice(1).split('/').slice(1).map(decodeURIComponent);

const ROLES = { ADMIN: 'Director de Operaciones', EDITOR: 'Programador', TECNICO: 'Técnico', CONSULTA: 'Consulta' };

const ICO = {
  agenda: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M7 14h2M11 14h2M15 14h2M7 18h2M11 18h2"/></svg>',
  lista: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></svg>',
  semana: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 9v11M13 9v11M18 9v11"/></svg>',
  oficina: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M15 9h3a1 1 0 0 1 1 1v11"/><path d="M8 8h3M8 12h3M8 16h3"/></svg>',
  resumen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/><circle cx="19" cy="8" r="1.2"/></svg>',
  carga: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  alerta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
  politicas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg>',
  admin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M19 8v6M16 11h6"/></svg>',
  vendors: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 7h12v9H1z"/><path d="M13 10h4l3 3v3h-7"/><circle cx="5.5" cy="18" r="2"/><circle cx="17.5" cy="18" r="2"/></svg>',
  acta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 14l2.5 2.5L16 11"/></svg>',
  yo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>'
};

const MENU = [
  { grupo: 'Programación', items: [
    { ruta: 'mia', titulo: 'Mi agenda', texto: 'Sus actividades de los próximos días y el registro de lo ejecutado.', icono: 'yo', solo: 'TECNICO' },
    { ruta: 'agenda', titulo: 'Agenda', texto: 'Sábana-calendario del mes por técnico y tipo. Los días hábiles en rojo no tienen técnico de oficina.', icono: 'agenda' },
    { ruta: 'actividades', titulo: 'Actividades', texto: 'Registre, consulte, reprograme o cancele instalaciones, mantenimientos, soporte y turnos.', icono: 'lista' },
    { ruta: 'semana', titulo: 'Programación semanal', texto: 'La semana lista para publicar el viernes: imprimir o copiar el texto.', icono: 'semana' }
  ] },
  { grupo: 'Control', items: [
    { ruta: 'resumen', titulo: 'Resumen ejecutivo', texto: 'Instalaciones del periodo: cumplimiento, equipos, clientes, técnicos, reprogramaciones y análisis con Claude.', icono: 'resumen', color: 'teal', roles: ['ADMIN', 'EDITOR', 'CONSULTA'] },
    { ruta: 'rotacion', titulo: 'Rotación de oficina', texto: 'Quién cubre la oficina cada día y quién está sin asignar (y debe estar en la oficina).', icono: 'oficina', color: 'teal' },
    { ruta: 'carga', titulo: 'Carga por técnico', texto: 'Actividades de cada técnico en el mes, por tipo.', icono: 'carga', color: 'teal' },
    { ruta: 'acta', titulo: 'Acta de equipos instalados', texto: 'Listado tipo acta de las instalaciones de un periodo y cliente: quite las que no van, imprima o copie para el correo.', icono: 'acta', color: 'teal', roles: ['ADMIN', 'EDITOR', 'CONSULTA'] },
    { ruta: 'conflictos', titulo: 'Conflictos', texto: 'Actividades con alertas ⚠ que deben corregirse antes de publicar.', icono: 'alerta', color: 'teal' }
  ] },
  { grupo: 'Proveedores', items: [
    { ruta: 'vendors', titulo: 'Proveedores (Vendors)', texto: 'Instaladores y aliados de IC fuera de Bogotá: datos, servicios, cobertura, sedes y contactos.', icono: 'vendors', color: 'dorado', roles: ['ADMIN', 'EDITOR', 'CONSULTA'] }
  ] },
  { grupo: 'Herramientas', items: [
    { ruta: 'politicas', titulo: 'Políticas y ayuda', texto: 'Políticas de programación del manual ' + CFG.manual + ' y cómo usar la app.', icono: 'politicas', color: 'dorado' },
    { ruta: 'admin', titulo: 'Administración', texto: 'Técnicos y matriz de habilidades, tipos de actividad, accesos y festivos.', icono: 'admin', color: 'dorado', admin: true }
  ] }
];

// ---------- Encabezado ----------
function pintarEncabezado() {
  const u = App.usuario, esc = IC.ui.esc;
  document.getElementById('encabezado').innerHTML =
    '<a href="#"><img class="logo" src="' + CFG.logo + '" alt="Ideas Control"></a>' +
    '<div class="app-nombre"><b>' + esc(CFG.app.nombre) + '</b><span>' + CFG.app.id + ' · v' + CFG.app.version + '</span></div>' +
    '<div class="espacio"></div>' +
    '<div class="ic-user">' +
      IC.portal.boton() +
      '<div class="datos"><b>' + esc(u.nombre) + '</b><span>' + esc(ROLES[u.rol] || u.rol) + '</span></div>' +
      '<div class="ic-avatar" title="' + esc(u.email) + '">' + esc(u.iniciales) + '</div>' +
      '<button class="ic-btn sec chico" id="btnSalir">Salir</button>' +
    '</div>';
  document.getElementById('encabezado').hidden = false;
  document.getElementById('btnSalir').onclick = () => IC.auth.salir();
}

// ---------- Menú ----------
function saludo() { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; }
function kpi(id, etiqueta) { return '<div class="ic-kpi"><div class="valor" id="' + id + '">…</div><div class="etiqueta">' + etiqueta + '</div></div>'; }

function vistaMenu(c) {
  const u = App.usuario;
  let html = '<h1 class="ic-titulo">' + saludo() + ', ' + IC.ui.esc(String(u.nombre).split(' ')[0]) + '</h1>' +
    '<p class="ic-subtitulo">Programación de instalaciones, mantenimientos, soporte y rotación de oficina.</p>' +
    '<div class="ic-kpis">' + kpi('kOfi', 'Técnico de oficina hoy') + kpi('kCampo', 'Actividades en campo hoy') + kpi('kConf', 'Conflictos ⚠ próximos 30 días') + kpi('kSin', 'Días hábiles sin oficina este mes') + '</div>';
  MENU.forEach((g) => {
    const items = g.items.filter((i) => (!i.admin || App.esAdmin()) && (!i.solo || i.solo === u.rol) && (!i.roles || i.roles.indexOf(u.rol) >= 0));
    if (!items.length) return;
    html += '<div class="ic-seccion">' + g.grupo + '</div><div class="ic-grid">';
    items.forEach((i) => {
      html += '<a class="ic-card ' + (i.color || '') + '" href="#' + i.ruta + '">' + (i.admin ? '<span class="ic-badge admin">Admin</span>' : '') +
        '<div class="icono">' + ICO[i.icono] + '</div><h3>' + i.titulo + '</h3><p>' + i.texto + '</p></a>';
    });
    html += '</div>';
  });
  html += '<div class="ic-pie">Ideas Control Equipos y Soluciones S.A.S. · Dirección de Operaciones · Datos en SharePoint (IC Apps)</div>';
  c.innerHTML = html;
  indicadores();
}

async function indicadores() {
  const poner = (id, v) => { const el = document.getElementById(id); if (el) el.innerHTML = v; };
  try {
    const h = Ope.hoy(), fin = Ope.sumar(h, 30), y = Number(h.slice(0, 4)), m = Number(h.slice(5, 7));
    await Ope.cargarRango(h.slice(0, 7) + '-01', fin);
    const r = Ope.resumenDia(h);
    poner('kOfi', !Ope.esHabil(h) ? '<span style="font-size:16px">No hábil</span>' : r.oficina.length ? '<span style="font-size:18px">' + IC.ui.esc(r.oficina.map((x) => Ope.nombreTec(x.tecnico_id)).join(', ')) + '</span>' : r.estado === 'VACIO' ? '<span style="font-size:16px">Sin técnico (definido)</span>' : '<span class="ope-rojo">⚠ Sin asignar</span>');
    poner('kCampo', IC.ui.fmt.num(r.campo.length));
    const conf = Ope.delRango(h, fin).filter((a) => Ope.validar(a).errores.length).length;
    poner('kConf', conf ? '<span class="ope-rojo">' + conf + '</span>' : '0');
    const sin = Ope.diasHabilesMes(y, m).filter((d) => d >= h && Ope.resumenDia(d).estado === 'SIN').length;
    poner('kSin', sin ? '<span class="ope-rojo">' + sin + '</span>' : '0');
  } catch (e) {
    ['kOfi', 'kCampo', 'kConf', 'kSin'].forEach((id) => poner(id, '—'));
    IC.ui.aviso('No se pudieron leer los indicadores: ' + IC.ui.mensajeError(e), 'warn');
  }
}

// ---------- Acceso ----------
async function resolverAcceso(cuenta) {
  const email = String(cuenta.username || '').toLowerCase();
  const nombre = cuenta.name || email;
  let rol = null;
  try {
    const acc = await IC.graph.items('SYS_Accesos', { filtro: "fields/app_id eq '" + CFG.app.id + "'" });
    const a = acc.find((x) => String(x.email || '').toLowerCase() === email && x.estado !== 'INACTIVO');
    if (a) rol = a.rol;
  } catch (e) { if (e.status !== 404 && !/No existe la lista/.test(e.message)) throw e; }
  // Técnicos y personal administrativo registrado (Novedades › Personal): entran con el mismo acceso de los técnicos
  const t = Ope.D.personal.find((x) => String(x.email || '').toLowerCase() === email && x.estado !== 'INACTIVO') || null;
  if (!rol && t) rol = 'TECNICO';
  return { nombre, email, rol, usuario_id: email, iniciales: t ? t.iniciales : IC.ui.fmt.iniciales(nombre), tecnico: t };
}

// ---------- Arranque ----------
async function arrancar() {
  const raiz = document.getElementById('contenido');
  IC.ui.pantalla(raiz, { logo: CFG.logo, cargando: true, titulo: 'Cargando…', texto: 'Conectando con Microsoft 365' });
  try {
    const cuenta = await IC.auth.iniciar(CFG.auth);
    if (!cuenta) {
      IC.ui.pantalla(raiz, { logo: CFG.logo, titulo: CFG.app.nombre, texto: 'Ingrese con su cuenta de Microsoft de Ideas Control.', boton: 'Iniciar sesión', alClic: () => IC.auth.entrar() });
      return;
    }
    await IC.graph.sitio(CFG.sitio.host, CFG.sitio.ruta);
    await Ope.cargarCatalogos();
    App.usuario = await resolverAcceso(cuenta);
    if (!App.usuario.rol) {
      IC.ui.pantalla(raiz, { logo: CFG.logo, titulo: 'Usuario no habilitado',
        texto: 'Su cuenta (' + App.usuario.email + ') no tiene acceso a la Programación de Operaciones. Pida al Director de Operaciones que lo agregue en Administración › Accesos.',
        boton: 'Cerrar sesión', alClic: () => IC.auth.salir() });
      return;
    }
    pintarEncabezado();
    const rutas = { '': () => vistaMenu(raiz) };
    MENU.forEach((g) => g.items.forEach((i) => {
      rutas[i.ruta] = async () => {
        if ((i.admin && !App.esAdmin()) || (i.roles && i.roles.indexOf(App.usuario.rol) < 0)) { location.hash = ''; return; }
        if (i.ruta !== 'admin' && i.ruta !== 'vendors' && i.ruta !== 'acta') await Ope.catalogosFrescos(60);   // técnicos y habilidades al día (cambios desde otra pestaña)
        const fn = App.vistas[i.ruta];
        if (fn) fn(raiz, App.params()); else raiz.innerHTML = '<a class="ic-volver" href="#">← Menú principal</a><p>Módulo en construcción.</p>';
      };
    }));
    const volver = IC.auth.volverA(); if (volver) location.hash = volver;
    IC.ui.enrutar(rutas);
  } catch (e) {
    console.error(e);
    const faltan = /No existe la lista OPE_/.test(e.message);
    IC.ui.pantalla(raiz, { logo: CFG.logo, titulo: faltan ? 'Falta instalar la app' : 'No se pudo cargar la app',
      texto: faltan ? 'Las listas de la Programación aún no existen en IC Apps. Abra el instalador (Programacion/Instalador/) y haga clic en «Crear estructura».' : IC.ui.mensajeError(e),
      boton: 'Reintentar', alClic: () => location.reload() });
  }
}
window.addEventListener('DOMContentLoaded', arrancar);
