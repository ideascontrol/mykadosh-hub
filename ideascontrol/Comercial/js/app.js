/* =====================================================================
   APP-101 · Comercial — arranque, usuario y menú principal
   ===================================================================== */
const App = {
  usuario: null,   // registro de SYS_Usuarios + es_admin
  vistas: {}       // otras pantallas se registran aquí: App.vistas['empresas'] = fn(contenedor)
};

// Íconos (trazos simples, heredan el color de la tarjeta)
const ICONOS = {
  cotizar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M12 12v6M9 15h6"/></svg>',
  cotizaciones: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4h10a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H9"/><path d="M4 8h9M4 12h9M4 16h9"/></svg>',
  empresas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 21v-5h6v5M9 10h.01M15 10h.01M12 10h.01"/></svg>',
  productos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/></svg>',
  actividad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>',
  carga: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>',
  admin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>'
};

// Tarjetas del menú. etapa > etapaActual = "Próximamente". admin: solo administradores.
const ETAPA_ACTUAL = 1;
const MENU = [
  { grupo: 'Comercial', items: [
    { ruta: 'cotizar', titulo: 'Nueva cotización', texto: 'Arme una propuesta con productos, descuentos, condiciones y PDF.', icono: 'cotizar', etapa: 2 },
    { ruta: 'cotizaciones', titulo: 'Cotizaciones', texto: 'Consulte, edite, revise y cambie el estado de las cotizaciones.', icono: 'cotizaciones', etapa: 2 }
  ] },
  { grupo: 'Datos maestros', items: [
    { ruta: 'empresas', titulo: 'Empresas y contactos', texto: 'Prospectos y clientes, sus sedes y personas de contacto.', icono: 'empresas', etapa: 1, color: 'teal' },
    { ruta: 'productos', titulo: 'Productos y precios', texto: 'Catálogo con foto, ficha técnica, precios e inventario.', icono: 'productos', etapa: 1, color: 'teal' }
  ] },
  { grupo: 'Herramientas', items: [
    { ruta: 'actividad', titulo: 'Actividad reciente', texto: 'Quién creó o modificó información y cuándo.', icono: 'actividad', etapa: 1, color: 'dorado' },
    { ruta: 'carga', titulo: 'Carga masiva', texto: 'Plantillas de Excel para cargar empresas y productos.', icono: 'carga', etapa: 1, color: 'dorado', admin: true },
    { ruta: 'admin', titulo: 'Administración', texto: 'Usuarios, parámetros, condiciones comerciales y festivos.', icono: 'admin', etapa: 3, color: 'dorado', admin: true }
  ] }
];

// ---------- Encabezado ----------
function pintarEncabezado() {
  const u = App.usuario;
  document.getElementById('encabezado').innerHTML =
    '<a href="#"><img class="logo" src="' + CFG.logo + '" alt="Ideas Control"></a>' +
    '<div class="app-nombre"><b>Microapp ' + IC.ui.esc(CFG.app.nombre) + '</b><span>' + CFG.app.id + ' · v' + CFG.app.version + '</span></div>' +
    '<div class="espacio"></div>' +
    '<div class="ic-user">' +
      '<div class="datos"><b>' + IC.ui.esc(u.nombre) + '</b><span>' + (u.es_admin ? 'Administrador' : 'Comercial') + ' · ' + IC.ui.esc(u.iniciales) + '</span></div>' +
      '<div class="ic-avatar" title="' + IC.ui.esc(u.email) + '">' + IC.ui.esc(u.iniciales || IC.ui.fmt.iniciales(u.nombre)) + '</div>' +
      '<button class="ic-btn sec" id="btnSalir">Salir</button>' +
    '</div>';
  document.getElementById('encabezado').hidden = false;
  document.getElementById('btnSalir').onclick = () => IC.auth.salir();
}

// ---------- Menú principal ----------
function saludo() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

function vistaMenu(c) {
  const u = App.usuario;
  let html = '<h1 class="ic-titulo">' + saludo() + ', ' + IC.ui.esc(String(u.nombre).split(' ')[0]) + '</h1>' +
    '<p class="ic-subtitulo">¿Qué desea hacer hoy?</p>' +
    '<div class="ic-kpis">' +
      kpi('kEmp', 'Empresas registradas') + kpi('kCli', 'Clientes') + kpi('kPrd', 'Productos activos') + kpi('kCot', 'Cotizaciones') +
    '</div>';
  MENU.forEach((g) => {
    const items = g.items.filter((i) => !i.admin || u.es_admin);
    if (!items.length) return;
    html += '<div class="ic-seccion">' + g.grupo + '</div><div class="ic-grid">';
    items.forEach((i) => {
      const pronto = i.etapa > ETAPA_ACTUAL;
      html += '<a class="ic-card ' + (i.color || '') + (pronto ? ' deshabilitada' : '') + '" href="#' + i.ruta + '">' +
        (pronto ? '<span class="ic-badge">Próximamente</span>' : (i.admin ? '<span class="ic-badge admin">Admin</span>' : '')) +
        '<div class="icono">' + ICONOS[i.icono] + '</div>' +
        '<h3>' + i.titulo + '</h3><p>' + i.texto + '</p></a>';
    });
    html += '</div>';
  });
  html += '<div class="ic-pie">Ideas Control Equipos y Soluciones S.A.S. · Datos en SharePoint (IC Apps)</div>';
  c.innerHTML = html;
  cargarIndicadores();
}
function kpi(id, etiqueta) { return '<div class="ic-kpi"><div class="valor" id="' + id + '">…</div><div class="etiqueta">' + etiqueta + '</div></div>'; }

async function cargarIndicadores() {
  const poner = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  try {
    const [emp, prd, cot] = await Promise.all([
      IC.graph.items('MAE_Empresas', { top: 5000 }),
      IC.graph.items('MAE_Productos', { top: 5000 }),
      IC.graph.contar('COT_Cotizaciones')
    ]);
    poner('kEmp', IC.ui.fmt.num(emp.filter((e) => e.estado !== 'INACTIVO').length));
    poner('kCli', IC.ui.fmt.num(emp.filter((e) => e.estado_comercial === 'CLIENTE' && e.estado !== 'INACTIVO').length));
    poner('kPrd', IC.ui.fmt.num(prd.filter((p) => p.estado === 'ACTIVO').length));
    poner('kCot', IC.ui.fmt.num(cot));
  } catch (e) {
    ['kEmp', 'kCli', 'kPrd', 'kCot'].forEach((id) => poner(id, '—'));
    IC.ui.aviso('No se pudieron leer los indicadores: ' + IC.ui.mensajeError(e), 'warn');
  }
}

// Pantalla provisional para módulos que llegan en las siguientes entregas
function vistaPendiente(ruta) {
  const item = MENU.flatMap((g) => g.items).find((i) => i.ruta === ruta);
  return function (c) {
    c.innerHTML = '<a href="#" class="ic-btn sec">← Menú principal</a>' +
      '<h1 class="ic-titulo" style="margin-top:18px">' + IC.ui.esc(item ? item.titulo : ruta) + '</h1>' +
      '<p class="ic-subtitulo">Este módulo se publica en la siguiente entrega de la etapa ' + (item ? item.etapa : '') + '.</p>';
  };
}

// ---------- Arranque ----------
async function arrancar() {
  const raiz = document.getElementById('contenido');
  IC.ui.pantalla(raiz, { logo: CFG.logo, cargando: true, titulo: 'Cargando…', texto: 'Conectando con Microsoft 365' });
  try {
    const cuenta = await IC.auth.iniciar(CFG.auth);
    if (!cuenta) {
      IC.ui.pantalla(raiz, { logo: CFG.logo, titulo: 'Microapp Comercial', texto: 'Ingrese con su cuenta de Microsoft de Ideas Control.', boton: 'Iniciar sesión', alClic: () => IC.auth.entrar() });
      return;
    }
    await IC.graph.sitio(CFG.sitio.host, CFG.sitio.ruta);

    // El usuario debe estar ACTIVO en SYS_Usuarios
    const email = String(cuenta.username || '').toLowerCase();
    const us = await IC.graph.items('SYS_Usuarios');
    const u = us.find((x) => String(x.email || '').toLowerCase() === email);
    if (!u || u.estado !== 'ACTIVO') {
      IC.ui.pantalla(raiz, { logo: CFG.logo, titulo: 'Usuario no habilitado',
        texto: 'Su cuenta (' + email + ') no está registrada como usuario activo de la Microapp Comercial. Pida al administrador que lo agregue.',
        boton: 'Cerrar sesión', alClic: () => IC.auth.salir() });
      return;
    }
    const hoy = new Date().toISOString().slice(0, 10);
    const deleg = (await IC.graph.items('SYS_Delegaciones')).some((d) => d.usuario_id === u.Title && String(d.fecha_inicio).slice(0, 10) <= hoy && hoy <= String(d.fecha_fin).slice(0, 10));
    App.usuario = Object.assign({}, u, { usuario_id: u.Title, es_admin: u.rol === 'ADMIN' || deleg, es_delegado: deleg });

    pintarEncabezado();
    const rutas = { '': vistaMenu };
    MENU.forEach((g) => g.items.forEach((i) => { rutas[i.ruta] = (c) => (App.vistas[i.ruta] || vistaPendiente(i.ruta))(c); }));
    const volver = IC.auth.volverA(); if (volver) location.hash = volver;
    IC.ui.enrutar(Object.fromEntries(Object.entries(rutas).map(([k, fn]) => [k, () => fn(raiz)])));
  } catch (e) {
    console.error(e);
    IC.ui.pantalla(raiz, { logo: CFG.logo, titulo: 'No se pudo cargar la app', texto: IC.ui.mensajeError(e), boton: 'Reintentar', alClic: () => location.reload() });
  }
}
window.addEventListener('DOMContentLoaded', arrancar);
