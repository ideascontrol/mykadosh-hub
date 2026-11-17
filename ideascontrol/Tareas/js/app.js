/* =====================================================================
   APP-109 · Seguimiento por cliente — tareas y pendientes por cliente
   Vistas: #  resumen · #tareas  listado con filtros · #reportes  reportes detallados · #importar  Excel
   Datos: TAR_Tareas (IC Apps) · clientes de MAE_Empresas (Comercial) · personal de OPE_Tecnicos
   Agenda: una tarea se puede agendar en la Programación de Operaciones (OPE_Actividades, origen TAREA, tar_id = ID de la tarea)
   Semáforo: Vencida · Próxima a vencer (≤ CFG.diasAviso) · A tiempo · Sin fecha · Cerrada
   ===================================================================== */
const App = { usuario: null, tareas: [], clientes: [], personal: [], acts: [], tipos: [], festivos: {}, filtro: { cliente: '', estado: 'ACTIVAS', prioridad: '', categoria: '', semaforo: '', responsable: '', q: '' } };

(function () {
  const U = IC.ui, esc = U.esc, G = IC.graph;
  const pad = (n, l) => String(n).padStart(l || 3, '0');
  const hoy = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2); };
  const dia = (v) => (v ? String(v).slice(0, 10) : '');
  const difDias = (a, b) => Math.round((new Date(a + 'T12:00:00') - new Date(b + 'T12:00:00')) / 864e5);
  const textoFecha = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const cerrada = (t) => CFG.cerrados.indexOf(t.estado) >= 0;
  const SEM = {
    VENCIDA: ['Vencida', 'rojo'], PROXIMA: ['Próxima a vencer', 'amarillo'], A_TIEMPO: ['A tiempo', 'verde'], SIN_FECHA: ['Sin fecha', 'gris'], CERRADA: ['Cerrada', 'azul']
  };
  function semaforo(t) {
    if (cerrada(t)) return 'CERRADA';
    if (!t.fecha_limite) return 'SIN_FECHA';
    const d = difDias(t.fecha_limite, hoy());
    return d < 0 ? 'VENCIDA' : d <= CFG.diasAviso ? 'PROXIMA' : 'A_TIEMPO';
  }
  const chipSem = (t) => { const s = SEM[semaforo(t)]; return '<span class="tar-sem ' + s[1] + '">' + s[0] + '</span>'; };
  const chipEstado = (e) => '<span class="tar-estado e-' + U.norm(e || '').replace(/[^a-z]/g, '') + '">' + esc(e || '—') + '</span>';
  function textoDias(t) {
    if (cerrada(t) || !t.fecha_limite) return '';
    const d = difDias(t.fecha_limite, hoy());
    return d < 0 ? Math.abs(d) + ' día' + (d === -1 ? '' : 's') + ' de atraso' : d === 0 ? 'Vence hoy' : 'Faltan ' + d + ' día' + (d === 1 ? '' : 's');
  }

  // ---------- Datos ----------
  function normal(t) {
    ['fecha_apertura', 'fecha_inicio', 'fecha_limite', 'fecha_cierre'].forEach((k) => { t[k] = dia(t[k]); });
    t.progreso = t.progreso === null || t.progreso === undefined || t.progreso === '' ? 0 : Number(t.progreso);
    return t;
  }
  async function cargar() {
    App.tareas = (await G.items('TAR_Tareas', { top: 5000 })).map(normal)
      .sort((a, b) => String(a.cliente_nombre).localeCompare(String(b.cliente_nombre)) || (Number(a.orden) || 0) - (Number(b.orden) || 0) || String(a.Title).localeCompare(b.Title));
  }
  // Pasa las categorías anteriores a la lista nueva (una sola vez por tarea)
  const equivalente = (c) => { if (!c) return c; const k = Object.keys(CFG.equivalencias || {}).find((x) => U.norm(x) === U.norm(c)); return k ? CFG.equivalencias[k] : c; };
  const estadoEquiv = (e) => { if (!e) return e; const k = Object.keys(CFG.equivEstados || {}).find((x) => U.norm(x) === U.norm(e)); return k ? CFG.equivEstados[k] : e; };
  async function convertirCategorias() {
    const viejas = App.tareas.filter((t) => (t.categoria && equivalente(t.categoria) !== t.categoria) || (t.estado && estadoEquiv(t.estado) !== t.estado));
    if (!viejas.length) return;
    for (const t of viejas) {
      const c = {}; if (t.categoria && equivalente(t.categoria) !== t.categoria) c.categoria = equivalente(t.categoria); if (t.estado && estadoEquiv(t.estado) !== t.estado) c.estado = estadoEquiv(t.estado);
      try { await G.actualizar('TAR_Tareas', t._id, c); } catch (e) { console.warn(e); }
    }
    await cargar();
    U.aviso(viejas.length + ' tareas pasaron a las categorías y estados nuevos', 'ok', 6000);
  }
  async function cargarClientes() {
    try { App.clientes = (await G.items('MAE_Empresas', { top: 5000 })).filter((e) => e.estado !== 'INACTIVO').map((e) => ({ id: e.Title, nombre: e.razon_social })); }
    catch (e) { App.clientes = []; }
    App.clientes.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));
  }
  // Personal de IC (OPE_Tecnicos: Ideas Control, administrativo y técnicos de campo)
  const VINC = [['IDEAS_CONTROL', 'Ideas Control'], ['ADMINISTRATIVO', 'Administrativo'], ['TECNICO_CAMPO', 'Técnicos de campo']];
  async function cargarPersonal() {
    try {
      const [tec, tip] = await Promise.all([G.items('OPE_Tecnicos', { top: 999 }), G.items('OPE_Tipos', { top: 999 }).catch(() => [])]);
      App.personal = tec.filter((t) => t.estado !== 'INACTIVO').sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99) || String(a.nombre).localeCompare(b.nombre));
      App.tipos = tip.filter((t) => t.estado !== 'INACTIVO').sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99));
    } catch (e) { App.personal = []; App.tipos = []; }
    try { (await G.items('SYS_Festivos', { top: 999 })).forEach((f) => { App.festivos[dia(f.fecha || f.Title)] = f.descripcion || 'Festivo'; }); } catch (e) { /* sin festivos */ }
  }
  const persona = (id) => App.personal.find((p) => p.Title === id);
  const personaPorNombre = (n) => App.personal.find((p) => U.norm(p.nombre) === U.norm(n));
  const esTecnico = (p) => p && p.vinculacion !== 'ADMINISTRATIVO';
  // Agenda: actividades de la Programación enlazadas a tareas (desde hace CFG.agendaDias días)
  const ESTADOS_AG = { PROGRAMADO: 'Programada', CONFIRMADO: 'Confirmada', EJECUTADO: 'Ejecutada', REPROGRAMADO: 'Reprogramada', CANCELADO: 'Cancelada', STANDBY: 'Stand By' };
  const activaAg = (a) => ['CANCELADO', 'REPROGRAMADO', 'STANDBY'].indexOf(a.estado) < 0;
  async function cargarAgenda() {
    const desde = new Date(Date.now() - (CFG.agendaDias || 120) * 864e5).toISOString().slice(0, 10);
    try { App.acts = (await G.items('OPE_Actividades', { filtro: "fields/fecha ge '" + desde + "T00:00:00Z'", top: 5000 })).map((a) => Object.assign(a, { fecha: dia(a.fecha) })); }
    catch (e) { App.acts = []; }
  }
  const agendaDe = (t) => App.acts.filter((a) => a.tar_id === t.Title || String(t.agenda || '').split(/[;,\s]+/).indexOf(a.Title) >= 0).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const agendaVigente = (t) => { const L = agendaDe(t); return L.filter(activaAg).pop() || L[L.length - 1] || null; };
  const chipAgenda = (t) => { const a = agendaVigente(t); if (!a) return ''; return '<span class="tar-ag ' + (a.estado === 'EJECUTADO' ? 'ok' : activaAg(a) ? '' : 'off') + '" title="Agenda (Programación): ' + esc(a.Title) + '">📅 ' + esc((ESTADOS_AG[a.estado] || a.estado) + ' ' + textoFecha(a.fecha)) + '</span>'; };
  const habil = (d) => { const w = new Date(d + 'T12:00:00').getDay(); return w !== 0 && w !== 6 && !App.festivos[d]; };
  const sigHabil = (d) => { let x = d; while (!habil(x)) x = new Date(new Date(x + 'T12:00:00').getTime() + 864e5).toISOString().slice(0, 10); return x; };
  const esAdmin = () => CFG.admins.indexOf(App.usuario.email) >= 0;
  // Lista de responsables: el personal agrupado por vinculación; el valor antiguo (p. ej. «Ideas Control») se conserva
  function selResponsable(v0) {
    const actual = v0.responsable_id ? persona(v0.responsable_id) : personaPorNombre(v0.responsable);
    let h = '<select id="f_responsable_id" name="responsable_id"><option value="">Seleccione…</option>';
    VINC.forEach(([k, n]) => { const L = App.personal.filter((p) => (p.vinculacion || 'IDEAS_CONTROL') === k); if (L.length) h += '<optgroup label="' + n + '">' + L.map((p) => '<option value="' + esc(p.Title) + '"' + (actual && actual.Title === p.Title ? ' selected' : '') + '>' + esc(p.nombre) + '</option>').join('') + '</optgroup>'; });
    if (!actual && v0.responsable) h += '<optgroup label="Valor anterior"><option value="__ANTES__" selected>' + esc(v0.responsable) + '</option></optgroup>';
    return h + '</select>';
  }

  // Clientes con tareas (incluye los que se escribieron a mano o el interno)
  function clientesConTareas() {
    const m = {}; App.tareas.forEach((t) => { if (!m[t.cliente_id]) m[t.cliente_id] = t.cliente_nombre || t.cliente_id; });
    return Object.keys(m).map((id) => ({ id, nombre: m[id] })).sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));
  }
  const opcionesClientes = (sel) => {
    const vistos = new Set(), op = [['INTERNO', 'Ideas Control (interno)']];
    clientesConTareas().concat(App.clientes).forEach((c) => { if (!vistos.has(c.id) && c.id !== 'INTERNO') { vistos.add(c.id); op.push([c.id, c.nombre]); } });
    if (sel && !op.some((o) => o[0] === sel)) op.push([sel, sel]);
    return op.sort((a, b) => a[0] === 'INTERNO' ? -1 : b[0] === 'INTERNO' ? 1 : String(a[1]).localeCompare(String(b[1])));
  };
  const nombreCliente = (id) => (opcionesClientes(id).find((o) => o[0] === id) || [id, id])[1];

  // ---------- Encabezado ----------
  function pintarEncabezado() {
    const u = App.usuario;
    document.getElementById('encabezado').innerHTML =
      '<a href="#"><img class="logo" src="' + CFG.logo + '" alt="Ideas Control"></a>' +
      '<div class="app-nombre"><b>' + esc(CFG.app.nombre) + '</b><span>' + CFG.app.id + ' · v' + CFG.app.version + '</span></div><div class="espacio"></div>' +
      '<nav class="tar-nav"><a href="#" data-r="">Resumen</a><a href="#tareas" data-r="tareas">Tareas</a><a href="#reportes" data-r="reportes">Reportes detallados</a>' + (esAdmin() ? '<a href="#importar" data-r="importar">Importar</a>' : '') + '</nav>' +
      '<div class="ic-user">' + IC.portal.boton() + '<div class="datos"><b>' + esc(u.nombre) + '</b><span>' + (esAdmin() ? 'Dirección de Operaciones' : 'Personal IC') + '</span></div>' +
      '<div class="ic-avatar" title="' + esc(u.email) + '">' + esc(u.iniciales) + '</div><button class="ic-btn sec chico" id="btnSalir">Salir</button></div>';
    document.getElementById('encabezado').hidden = false;
    document.getElementById('btnSalir').onclick = () => IC.auth.salir();
  }
  const marcarNav = (r) => document.querySelectorAll('.tar-nav a').forEach((a) => a.classList.toggle('on', a.dataset.r === r));

  // =====================================================================
  // RESUMEN
  // =====================================================================
  function vistaResumen(c) {
    const T = App.tareas, act = T.filter((t) => !cerrada(t));
    const n = (f) => T.filter(f).length;
    const venc = n((t) => semaforo(t) === 'VENCIDA'), prox = n((t) => semaforo(t) === 'PROXIMA');
    const resueltas = n((t) => t.estado === 'Finalizada');
    const avance = T.length ? Math.round(resueltas * 100 / T.length) : 0;
    const kpi = (v, e, cls, ir) => '<a class="ic-kpi tar-kpi ' + (cls || '') + '" href="#tareas" data-ir="' + (ir || '') + '"><div class="valor">' + v + '</div><div class="etiqueta">' + e + '</div></a>';
    const barra = (v, max, cls) => '<div class="tar-barra"><i class="' + (cls || '') + '" style="width:' + (max ? Math.round(v * 100 / max) : 0) + '%"></i></div>';
    const porCliente = clientesConTareas().map((cl) => {
      const ts = T.filter((t) => t.cliente_id === cl.id), a = ts.filter((t) => !cerrada(t));
      const r = ts.filter((t) => t.estado === 'Finalizada').length;
      return { cl, total: ts.length, activas: a.length, venc: ts.filter((t) => semaforo(t) === 'VENCIDA').length, prox: ts.filter((t) => semaforo(t) === 'PROXIMA').length, av: ts.length ? Math.round(r * 100 / ts.length) : 0 };
    }).sort((a, b) => b.venc - a.venc || b.activas - a.activas);
    const urgentes = act.filter((t) => ['VENCIDA', 'PROXIMA'].indexOf(semaforo(t)) >= 0).sort((a, b) => a.fecha_limite.localeCompare(b.fecha_limite)).slice(0, 12);
    c.innerHTML = '<div class="ic-barra"><div><h1 class="ic-titulo">Resumen</h1><p class="ic-subtitulo" style="margin:0">Tareas y pendientes de todos los clientes, al ' + esc(textoFecha(hoy())) + '.</p></div><span class="espacio"></span><button class="ic-btn" id="bNueva">+ Nueva tarea</button></div>' +
      '<div class="ic-kpis tar-kpis">' + kpi(T.length, 'Tareas registradas', '', 'TODAS') + kpi(act.length, 'Pendientes activas', '', 'ACTIVAS') + kpi(venc, 'Vencidas', 'rojo', 'VENCIDA') +
        kpi(prox, 'Vencen en ' + CFG.diasAviso + ' días o menos', 'amarillo', 'PROXIMA') + kpi(avance + ' %', 'Avance (finalizadas)', 'verde', 'CERRADAS') + '</div>' +
      '<div class="tar-dos"><section class="ic-bloque"><div class="cab"><h2>Por cliente</h2></div><div class="cuerpo">' +
        (porCliente.length ? '<table class="ic-tabla tar-tcli"><thead><tr><th>Cliente</th><th>Activas</th><th>Vencidas</th><th>Por vencer</th><th>Avance</th></tr></thead><tbody>' +
          porCliente.map((x) => '<tr data-cli="' + esc(x.cl.id) + '"><td><b>' + esc(x.cl.nombre) + '</b><span class="sec">' + x.total + ' tarea' + (x.total === 1 ? '' : 's') + '</span></td><td>' + x.activas + '</td><td>' + (x.venc ? '<span class="tar-num rojo">' + x.venc + '</span>' : '0') + '</td><td>' + (x.prox ? '<span class="tar-num amarillo">' + x.prox + '</span>' : '0') + '</td><td style="min-width:120px">' + barra(x.av, 100, 'verde') + '<small>' + x.av + ' %</small></td></tr>').join('') + '</tbody></table>'
          : '<p class="ic-conteo">Aún no hay tareas. Créelas con «+ Nueva tarea» o importe un plan de Excel.</p>') + '</div></section>' +
      '<section class="ic-bloque"><div class="cab"><h2>Vencidas y por vencer</h2></div><div class="cuerpo">' +
        (urgentes.length ? urgentes.map((t) => '<div class="tar-urg" data-id="' + esc(t.Title) + '">' + chipSem(t) + '<div><b>' + esc(resumir(t.item, 90)) + '</b><span class="sec">' + esc(t.cliente_nombre) + ' · ' + esc(textoFecha(t.fecha_limite)) + ' · ' + esc(textoDias(t)) + '</span></div></div>').join('') : '<p class="ic-conteo">✔ Nada vencido ni por vencer.</p>') + '</div></section></div>' +
      '<p class="ic-conteo"><a href="#reportes">Ver reportes detallados: tareas por estado, prioridad, categoría y persona →</a></p>';
    c.querySelector('#bNueva').onclick = () => formTarea(null, () => vistaResumen(c));
    c.querySelectorAll('[data-ir]').forEach((a) => { a.onclick = () => { const v = a.dataset.ir; Object.assign(App.filtro, { cliente: '', prioridad: '', categoria: '', responsable: '', q: '', estado: ['VENCIDA', 'PROXIMA'].indexOf(v) >= 0 ? 'ACTIVAS' : v, semaforo: ['VENCIDA', 'PROXIMA'].indexOf(v) >= 0 ? v : '' }); }; });
    c.querySelectorAll('tr[data-cli]').forEach((tr) => { tr.onclick = () => { Object.assign(App.filtro, { cliente: tr.dataset.cli, estado: 'ACTIVAS', semaforo: '', prioridad: '', categoria: '', responsable: '', q: '' }); location.hash = 'tareas'; }; });
    c.querySelectorAll('.tar-urg').forEach((d) => { d.onclick = () => formTarea(App.tareas.find((t) => t.Title === d.dataset.id), () => vistaResumen(c)); });
  }
  // =====================================================================
  // REPORTES DETALLADOS (tareas activas por estado, prioridad, categoría y persona)
  // =====================================================================
  const nombreResp = (t) => (t.responsable_id && persona(t.responsable_id) ? persona(t.responsable_id).nombre : t.responsable) || '';
  function vistaReportes(c) {
    const act = App.tareas.filter((t) => !cerrada(t));
    const barra = (v, max) => '<div class="tar-barra"><i style="width:' + (max ? Math.round(v * 100 / max) : 0) + '%"></i></div>';
    const grupo = (campo, valores, valorDe) => {
      const tot = act.length, de = valorDe || ((t) => t[campo] || '');
      const vals = valores.concat(Array.from(new Set(act.map(de))).filter((v) => v && valores.indexOf(v) < 0)).concat(['']);
      const filas = vals.map((v) => [v, act.filter((t) => de(t) === v)]).filter((x) => x[1].length);
      return filas.length ? filas.map(([v, L]) => {
        const venc = L.filter((t) => semaforo(t) === 'VENCIDA').length;
        return '<div class="tar-fila-b tar-rep" data-campo="' + campo + '" data-v="' + esc(v) + '"><span>' + esc(v || 'Sin definir') + (venc ? ' <span class="tar-num rojo" title="Vencidas">' + venc + '</span>' : '') + '</span>' + barra(L.length, tot) + '<b>' + L.length + '</b></div>';
      }).join('') : '<p class="ic-conteo">Sin datos.</p>';
    };
    const personas = App.personal.map((p) => p.nombre);
    c.innerHTML = '<div class="ic-barra"><div><h1 class="ic-titulo">Reportes detallados</h1><p class="ic-subtitulo" style="margin:0">Tareas activas (sin finalizadas ni canceladas): ' + act.length + '. En rojo, las vencidas. Haga clic en una fila para ver esas tareas.</p></div></div>' +
      '<div class="tar-dos"><section class="ic-bloque"><div class="cab"><h2>Tareas por persona</h2></div><div class="cuerpo">' + grupo('responsable', personas, nombreResp) + '</div></section>' +
      '<section class="ic-bloque"><div class="cab"><h2>Tareas por estado</h2></div><div class="cuerpo">' + grupo('estado', CFG.estados.filter((e) => CFG.cerrados.indexOf(e) < 0)) + '</div></section></div>' +
      '<div class="tar-dos"><section class="ic-bloque"><div class="cab"><h2>Tareas por categoría</h2></div><div class="cuerpo">' + grupo('categoria', categorias()) + '</div></section>' +
      '<section class="ic-bloque"><div class="cab"><h2>Tareas por prioridad</h2></div><div class="cuerpo">' + grupo('prioridad', CFG.prioridades) + '</div></section></div>';
    c.querySelectorAll('.tar-rep').forEach((d) => { d.onclick = () => {
      Object.assign(App.filtro, { cliente: '', estado: 'ACTIVAS', semaforo: '', prioridad: '', categoria: '', responsable: '', q: '' });
      const k = d.dataset.campo, v = d.dataset.v;
      if (k === 'estado') App.filtro.estado = v || 'ACTIVAS'; else App.filtro[k] = v || '__SIN__';
      location.hash = 'tareas';
    }; });
  }
  const resumir = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  const CAT = CFG.categorias.map((c) => c[0]);
  const ayudaCat = (n) => (CFG.categorias.find((c) => c[0] === n) || [n, ''])[1];
  // Las oficiales primero; luego las que ya traen tareas antiguas o importadas
  const categorias = () => { const s = new Set(CAT); App.tareas.forEach((t) => { if (t.categoria) s.add(t.categoria); }); return Array.from(s); };
  const otrasCategorias = () => categorias().filter((c) => CAT.indexOf(c) < 0);

  // =====================================================================
  // TAREAS (listado con filtros)
  // =====================================================================
  function filtradas() {
    const f = App.filtro, q = U.norm(f.q);
    return App.tareas.filter((t) => (!f.cliente || t.cliente_id === f.cliente) &&
      (f.estado === 'TODAS' || !f.estado ? true : f.estado === 'ACTIVAS' ? !cerrada(t) : f.estado === 'CERRADAS' ? cerrada(t) : t.estado === f.estado) &&
      (!f.prioridad || (f.prioridad === '__SIN__' ? !t.prioridad : t.prioridad === f.prioridad)) && (!f.categoria || (f.categoria === '__SIN__' ? !t.categoria : t.categoria === f.categoria)) && (!f.semaforo || semaforo(t) === f.semaforo) &&
      (!f.responsable || (f.responsable === '__SIN__' ? !nombreResp(t) : nombreResp(t) === f.responsable)) &&
      (!q || U.norm([t.Title, t.item, t.responsable, t.bitacora, t.cliente_nombre, t.plan].join(' ')).indexOf(q) >= 0));
  }
  function vistaTareas(c) {
    const f = App.filtro;
    const sel = (id, op, v) => '<select id="' + id + '">' + op.map((o) => '<option value="' + esc(o[0]) + '"' + (o[0] === v ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
    c.innerHTML = '<div class="ic-barra"><div><h1 class="ic-titulo">Tareas</h1><p class="ic-subtitulo" style="margin:0">Haga clic en una tarea para actualizarla o agregar una anotación a la bitácora.</p></div><span class="espacio"></span>' +
      '<button class="ic-btn sec" id="bExcel">⬇ Excel</button><button class="ic-btn" id="bNueva">+ Nueva tarea</button></div>' +
      '<div class="ic-filtros">' + sel('fCli', [['', 'Todos los clientes']].concat(clientesConTareas().map((x) => [x.id, x.nombre])), f.cliente) +
        sel('fEst', [['ACTIVAS', 'Pendientes activas'], ['TODAS', 'Todos los estados'], ['CERRADAS', 'Cerrada']].concat(CFG.estados.map((e) => [e, e])), f.estado) +
        sel('fSem', [['', 'Todo semáforo'], ['VENCIDA', 'Vencidas'], ['PROXIMA', 'Próximas a vencer'], ['A_TIEMPO', 'A tiempo'], ['SIN_FECHA', 'Sin fecha']], f.semaforo) +
        sel('fPri', [['', 'Toda prioridad']].concat(CFG.prioridades.map((p) => [p, p])), f.prioridad) +
        sel('fCat', [['', 'Toda categoría']].concat(categorias().map((p) => [p, p])), f.categoria) +
        sel('fRes', [['', 'Todas las personas']].concat(Array.from(new Set(App.personal.map((p) => p.nombre).concat(App.tareas.map(nombreResp)).filter(Boolean))).sort().map((p) => [p, p])).concat([['__SIN__', 'Sin responsable']]), f.responsable) +
        '<input type="search" id="fQ" placeholder="Buscar…" value="' + esc(f.q) + '" style="flex:1;min-width:160px"></div><div id="lista"></div>';
    const pintar = () => {
      const L = filtradas(), varios = !f.cliente;
      c.querySelector('#lista').innerHTML = '<p class="ic-conteo">' + L.length + ' tarea' + (L.length === 1 ? '' : 's') + '</p>' + (L.length ?
        '<div class="ic-tabla-caja tar-caja"><table class="ic-tabla tar-tabla"><thead><tr><th>ID</th>' + (varios ? '<th>Cliente</th>' : '') + '<th>Tarea</th><th>Categoría</th><th>Responsable</th><th>Prioridad</th><th>Estado</th><th>Límite y semáforo</th><th>Avance</th></tr></thead><tbody>' +
        L.map((t) => '<tr data-id="' + esc(t.Title) + '"><td class="nw">' + esc(t.Title) + '</td>' + (varios ? '<td class="tar-cli">' + esc(t.cliente_nombre) + '</td>' : '') +
          '<td><b>' + esc(resumir(t.item, 110)) + '</b>' + (t.bitacora ? '<span class="sec">' + esc(resumir(String(t.bitacora).split('\n')[0], 90)) + '</span>' : '') + '</td>' +
          '<td>' + esc(t.categoria || '') + '</td><td>' + esc(nombreResp(t)) + '</td><td>' + (t.prioridad ? '<span class="tar-pri p-' + U.norm(t.prioridad) + '">' + esc(t.prioridad) + '</span>' : '') + '</td>' +
          '<td>' + chipEstado(t.estado) + chipAgenda(t) + '</td><td class="nw">' + chipSem(t) + (t.fecha_limite ? '<span class="sec">' + esc(textoFecha(t.fecha_limite)) + (textoDias(t) ? ' · ' + esc(textoDias(t)) : '') + '</span>' : '') + '</td>' +
          '<td class="tar-av"><div class="tar-barra"><i class="verde" style="width:' + Math.min(100, t.progreso) + '%"></i></div><small>' + Math.round(t.progreso) + ' %</small></td></tr>').join('') +
        '</tbody></table></div>' : '<div class="ic-vacio">No hay tareas con estos filtros.</div>');
      c.querySelectorAll('tr[data-id]').forEach((tr) => { tr.onclick = () => formTarea(App.tareas.find((t) => t.Title === tr.dataset.id), pintar); });
    };
    [['fCli', 'cliente'], ['fEst', 'estado'], ['fSem', 'semaforo'], ['fPri', 'prioridad'], ['fCat', 'categoria'], ['fRes', 'responsable']].forEach(([id, k]) => { c.querySelector('#' + id).onchange = (e) => { f[k] = e.target.value; pintar(); }; });
    c.querySelector('#fQ').oninput = (e) => { f.q = e.target.value; pintar(); };
    c.querySelector('#bNueva').onclick = () => formTarea(null, pintar);
    c.querySelector('#bExcel').onclick = () => exportar(filtradas()).catch((e) => U.aviso(e.message, 'err'));
    pintar();
    // #tareas/T-0003 abre la tarea (enlace desde la Programación)
    const idUrl = decodeURIComponent((location.hash.split('/')[1] || ''));
    if (idUrl) { const t = App.tareas.find((x) => x.Title === idUrl); if (t) formTarea(t, pintar); history.replaceState(null, '', '#tareas'); }
  }

  // =====================================================================
  // FORMULARIO DE TAREA (crear / actualizar / bitácora)
  // =====================================================================
  function formTarea(t, alGuardar) {
    const nueva = !t, v0 = t || { cliente_id: App.filtro.cliente || '', estado: 'Abierta', prioridad: 'Media', fecha_apertura: hoy(), progreso: 0 };
    const planes = Array.from(new Set(App.tareas.map((x) => x.plan).filter(Boolean)));
    U.modal(nueva ? 'Nueva tarea' : v0.Title + ' · ' + resumir(v0.cliente_nombre, 40), '<form class="ic-form" id="fTar" autocomplete="off"><div class="ic-campos">' +
      U.campo({ name: 'cliente_id', label: 'Cliente', t: 'select', op: opcionesClientes(v0.cliente_id), valor: v0.cliente_id, req: true, c: 'c6' }) +
      '<div class="ic-campo c6"><label for="f_plan">Plan / proyecto</label><input id="f_plan" name="plan" list="dlPlan" value="' + esc(v0.plan || '') + '" placeholder="Ej.: Implementación software T&A"><datalist id="dlPlan">' + planes.map((p) => '<option value="' + esc(p) + '">').join('') + '</datalist></div>' +
      U.campo({ name: 'item', label: 'Tarea', t: 'textarea', valor: v0.item, req: true, filas: 3, c: 'c12' }) +
      '<div class="ic-campo c4"><label for="f_categoria">Categoría</label><select id="f_categoria" name="categoria"><option value="">Seleccione…</option>' +
        CFG.categorias.map((c) => '<option value="' + esc(c[0]) + '" title="' + esc(c[1]) + '"' + (c[0] === v0.categoria ? ' selected' : '') + '>' + esc(c[0]) + '</option>').join('') +
        (otrasCategorias().length ? '<optgroup label="Usadas antes">' + otrasCategorias().map((c) => '<option value="' + esc(c) + '"' + (c === v0.categoria ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</optgroup>' : '') +
        '</select><span class="ayuda" id="ayCat"></span></div>' +
      '<div class="ic-campo c4"><label for="f_responsable_id">Responsable</label>' + selResponsable(v0) + '</div>' +
      U.campo({ name: 'prioridad', label: 'Prioridad', t: 'select', op: CFG.prioridades.map((p) => [p, p]), valor: v0.prioridad, c: 'c4' }) +
      '<div class="ic-campo c4"><label for="f_estado">Estado</label><select id="f_estado" name="estado">' + CFG.estados.concat(CFG.estados.indexOf(v0.estado) < 0 && v0.estado ? [v0.estado] : [])
        .map((e) => '<option value="' + esc(e) + '" title="' + esc(CFG.ayudaEstados[e] || '') + '"' + (e === v0.estado ? ' selected' : '') + '>' + esc(e) + '</option>').join('') + '</select><span class="ayuda" id="ayEst"></span></div>' +
      U.campo({ name: 'progreso', label: '% de avance', t: 'number', valor: Math.round(v0.progreso || 0), c: 'c4' }) +
      '<div class="ic-campo c4"><label>&nbsp;</label><div class="tar-sem-form" id="semF"></div></div>' +
      U.campo({ name: 'fecha_apertura', label: 'Apertura', t: 'date', valor: v0.fecha_apertura, c: 'c3' }) +
      U.campo({ name: 'fecha_inicio', label: 'Inicio', t: 'date', valor: v0.fecha_inicio, c: 'c3' }) +
      U.campo({ name: 'fecha_limite', label: 'Fecha límite', t: 'date', valor: v0.fecha_limite, c: 'c3', ayuda: 'Para el semáforo y el correo diario' }) +
      U.campo({ name: 'fecha_cierre', label: 'Cierre', t: 'date', valor: v0.fecha_cierre, c: 'c3' }) +
      U.campo({ name: 'nota', label: 'Nueva anotación en la bitácora', t: 'textarea', filas: 2, c: 'c12', ph: 'Se agrega arriba con la fecha de hoy' }) +
      U.campo({ name: 'bitacora', label: 'Bitácora', t: 'textarea', valor: v0.bitacora, filas: 5, c: 'c12' }) +
      '</div>' + seccionAgenda(t) + '<div class="ic-acciones">' + (nueva || !esAdmin() ? '' : '<button type="button" class="ic-btn peligro" id="tDel" style="margin-right:auto">Eliminar</button>') +
      '<button type="button" class="ic-btn sec" id="tNo">Cancelar</button>' + (cerrada(v0) ? '' : '<button type="button" class="ic-btn sec" id="tAg">' + 'Guardar y agendar' + '</button>') + '<button class="ic-btn" id="tOk">Guardar</button></div></form>', (cu) => {
      const f = cu.querySelector('#fTar');
      const sem = () => { const v = U.leerForm(f); cu.querySelector('#semF').innerHTML = chipSem({ estado: v.estado, fecha_limite: v.fecha_limite }) + (textoDias({ estado: v.estado, fecha_limite: v.fecha_limite }) ? ' <small>' + esc(textoDias({ estado: v.estado, fecha_limite: v.fecha_limite })) + '</small>' : ''); };
      const verAyuda = () => { cu.querySelector('#ayCat').textContent = ayudaCat(f.categoria.value) || (f.categoria.value ? '' : 'Elija la categoría que mejor describe la tarea.'); };
      f.categoria.addEventListener('change', verAyuda); verAyuda();
      const verAyEst = () => { cu.querySelector('#ayEst').textContent = CFG.ayudaEstados[f.estado.value] || ''; };
      f.estado.addEventListener('change', verAyEst); verAyEst();
      f.addEventListener('input', sem); f.addEventListener('change', (e) => {
        if (e.target.name === 'estado' && CFG.cerrados.indexOf(e.target.value) >= 0) { if (!f.fecha_cierre.value) f.fecha_cierre.value = hoy(); if (e.target.value !== 'Cancelada') f.progreso.value = 100; }
        sem();
      });
      sem();
      cu.querySelector('#tNo').onclick = U.cerrarModal;
      const bDel = cu.querySelector('#tDel');
      if (bDel) bDel.onclick = async () => {
        U.cerrarModal();
        if (!(await U.confirmar('Eliminar tarea', '«' + resumir(t.item, 80) + '» se eliminará definitivamente. No se puede deshacer.', 'Eliminar', true))) { formTarea(t, alGuardar); return; }
        try { await G.eliminar('TAR_Tareas', t._id); U.aviso('Tarea eliminada', 'ok'); } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); }
        await cargar(); alGuardar();
      };
      let agendar = false;
      const bAg = cu.querySelector('#tAg'); if (bAg) bAg.onclick = () => { agendar = true; f.requestSubmit(); };
      f.onsubmit = async (e) => {
        e.preventDefault();
        const v = U.leerForm(f);
        const errores = {}; if (!v.cliente_id) errores.cliente_id = 'Elija el cliente'; if (!String(v.item || '').trim()) errores.item = 'Escriba la tarea';
        if (Object.keys(errores).length) { U.marcarErrores(f, errores); return; }
        let bit = String(v.bitacora || '').trim();
        if (String(v.nota || '').trim()) { const d = new Date(); bit = pad(d.getDate(), 2) + '/' + pad(d.getMonth() + 1, 2) + '/' + String(d.getFullYear()).slice(2) + '. ' + v.nota.trim() + (bit ? '\n' + bit : ''); }
        const resp = v.responsable_id === '__ANTES__' ? { nombre: v0.responsable, Title: '' } : persona(v.responsable_id);
        const campos = { cliente_id: v.cliente_id, cliente_nombre: nombreCliente(v.cliente_id), plan: v.plan, item: v.item.trim(), categoria: v.categoria, responsable: resp ? resp.nombre : '', responsable_id: resp ? resp.Title : '',
          prioridad: v.prioridad, estado: v.estado, progreso: Math.max(0, Math.min(100, Number(v.progreso) || 0)), fecha_apertura: v.fecha_apertura, fecha_inicio: v.fecha_inicio,
          fecha_limite: v.fecha_limite, fecha_cierre: v.fecha_cierre, bitacora: bit };
        try {
          let id = t ? t.Title : '';
          await U.conCarga(cu.querySelector(agendar ? '#tAg' : '#tOk'), async () => {
            if (nueva) {
              const n = await G.siguiente('TAR');
              campos.Title = id = 'T-' + pad(n, 4); campos.orden = n;
              Object.keys(campos).forEach((k) => { if (campos[k] === '' || campos[k] === null) delete campos[k]; });
              await guardarSeguro(() => G.crear('TAR_Tareas', campos), campos);
            } else await guardarSeguro(() => G.actualizar('TAR_Tareas', t._id, campos, t._etag), campos);
          });
          U.cerrarModal(); U.aviso(nueva ? 'Tarea creada' : 'Tarea actualizada', 'ok');
          await cargar();
          if (agendar) { const tt = App.tareas.find((x) => x.Title === id); if (tt) { formAgenda(tt, alGuardar); return; } }
          alGuardar();
        } catch (err) { agendar = false; U.aviso(U.mensajeError(err), 'err', 8000); }
      };
    });
  }

  // Si la lista aún no tiene las columnas nuevas (responsable_id, agenda), guarda sin ellas y avisa
  async function guardarSeguro(fn, campos) {
    try { return await fn(); }
    catch (e) {
      const col = ['responsable_id', 'agenda'].filter((k) => new RegExp(k, 'i').test(e.message) && k in campos);
      if (!col.length) throw e;
      col.forEach((k) => delete campos[k]);
      U.aviso('Falta actualizar la lista TAR_Tareas: abra el Instalador (Programacion/Instalador/) y haga clic en «Crear estructura». Se guardó sin ' + col.join(', ') + '.', 'warn', 9000);
      return await fn();
    }
  }

  // =====================================================================
  // AGENDA (Programación de Operaciones): de tarea a actividad y su estado
  // =====================================================================
  function seccionAgenda(t) {
    if (!t) return '';
    const L = agendaDe(t);
    return '<div class="tar-agenda"><b>Agenda (Programación de Operaciones)</b>' +
      (L.length ? '<table class="ic-tabla tar-mini"><tbody>' + L.map((a) => '<tr><td><a href="/ideascontrol/Programacion/" target="ic_programacion">' + esc(a.Title) + '</a></td><td>' + esc(textoFecha(a.fecha)) + (a.hora_inicio ? ' · ' + esc(a.hora_inicio) : '') + '</td><td>' + esc((persona(a.tecnico_id) || {}).nombre || a.tecnico_id || '') + '</td><td>' + esc(a.tipo || '') + '</td><td>' + esc(ESTADOS_AG[a.estado] || a.estado) + '</td></tr>').join('') + '</tbody></table>'
        : '<p class="sec" style="margin:4px 0 0">No está en la agenda. Solo se agenda lo que requiere una fecha y una persona en la Programación (visitas, instalaciones, soporte…): use «Guardar y agendar».</p>') + '</div>';
  }
  async function formAgenda(t, alGuardar) {
    const tecs = App.personal.filter(esTecnico), tipos = App.tipos;
    if (!tecs.length || !tipos.length) { U.aviso('No se pudo leer el personal o los tipos de actividad de la Programación.', 'err', 8000); alGuardar(); return; }
    const resp = persona(t.responsable_id) || personaPorNombre(t.responsable);
    const emp = await G.items('MAE_Empresas', { filtro: "fields/Title eq '" + String(t.cliente_id || '').replace(/'/g, "''") + "'" }).then((r) => r[0]).catch(() => null);
    const f0 = t.fecha_inicio && t.fecha_inicio >= hoy() ? t.fecha_inicio : sigHabil(hoy());
    U.modal('Agendar ' + t.Title + ' en la Programación', '<form class="ic-form" id="fAg"><p class="sec" style="margin-top:0">' + esc(t.cliente_nombre + ' · ' + resumir(t.item, 120)) + '</p><div class="ic-campos">' +
      U.campo({ name: 'tecnico_id', label: 'Persona', t: 'select', op: tecs.map((x) => [x.Title, x.nombre]), valor: esTecnico(resp) ? resp.Title : '', req: true, c: 'c6' }) +
      U.campo({ name: 'tipo', label: 'Tipo de actividad', t: 'select', op: tipos.map((x) => [x.Title, x.nombre + ' (' + x.Title + ')']), req: true, c: 'c6' }) +
      U.campo({ name: 'fecha', label: 'Fecha', t: 'date', valor: f0, req: true, c: 'c4' }) +
      U.campo({ name: 'hora_inicio', label: 'Hora inicio', t: 'time', c: 'c4' }) +
      U.campo({ name: 'ciudad', label: 'Ciudad', valor: emp && emp.ciudad ? emp.ciudad : '', req: true, c: 'c4' }) +
      U.campo({ name: 'observaciones', label: 'Observaciones para la persona', t: 'textarea', filas: 2, valor: 'Tarea ' + t.Title + ': ' + resumir(t.item, 300), c: 'c12' }) + '</div>' +
      '<div id="agDisp"></div><p class="sec">Queda en la Programación como «Programado» y enlazada con esta tarea. Desde allá se confirma, reprograma o marca ejecutada; su estado se ve en la tarea.</p>' +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="agNo">Ahora no</button><button class="ic-btn" id="agOk">Agendar</button></div></form>', (cu) => {
      const f = cu.querySelector('#fAg'); let avisos = [];
      cu.querySelector('#agNo').onclick = () => { U.cerrarModal(); alGuardar(); };
      // Disponibilidad: día hábil, habilidad, ausencias y lo que la persona ya tiene ese día
      const revisar = async () => {
        const v = U.leerForm(f), caja = cu.querySelector('#agDisp'); avisos = [];
        if (!v.fecha || !v.tecnico_id) { caja.innerHTML = ''; return; }
        const tc = persona(v.tecnico_id);
        if (!habil(v.fecha)) avisos.push('El ' + textoFecha(v.fecha) + ' no es día hábil' + (App.festivos[v.fecha] ? ' (' + App.festivos[v.fecha] + ')' : '') + ': requiere autorización del Director de Operaciones.');
        if (tc && v.tipo && String(tc.habilidades || '').toUpperCase().split(/[;,\s]+/).indexOf(v.tipo) < 0) avisos.push(tc.nombre + ' no tiene la habilidad ' + v.tipo + ' en la matriz.');
        let suyas = [];
        try {
          const d = await G.items('OPE_Actividades', { filtro: "fields/fecha ge '" + v.fecha + "T00:00:00Z' and fields/fecha le '" + v.fecha + "T23:59:59Z'", top: 999 });
          suyas = d.filter((a) => a.tecnico_id === v.tecnico_id && activaAg(a));
          if (suyas.some((a) => a.tipo === 'AUS')) avisos.push((tc ? tc.nombre : 'La persona') + ' tiene una ausencia ese día.');
          const otras = suyas.filter((a) => a.tipo !== 'AUS' && a.tipo !== 'OFI');
          if (otras.length) avisos.push((tc ? tc.nombre : 'La persona') + ' ya tiene ' + otras.length + ' actividad(es) ese día.');
        } catch (e) { avisos.push('No se pudo revisar la agenda de ese día: ' + U.mensajeError(e)); }
        caja.innerHTML = (avisos.length ? '<div class="ic-alerta chica">⚠ ' + avisos.map(esc).join('<br>⚠ ') + '</div>' : '<div class="tar-disp-ok">✓ Disponible: sin cruces en la agenda ese día.</div>') +
          (suyas.length ? '<div class="sec">Agenda de ' + esc(tc ? tc.nombre : '') + ' el ' + esc(textoFecha(v.fecha)) + ':</div><ul class="tar-dia">' + suyas.map((a) => '<li>' + esc((a.hora_inicio || '—') + ' · ' + a.tipo + ' · ' + (a.cliente || '') + ' (' + (ESTADOS_AG[a.estado] || a.estado) + ')') + '</li>').join('') + '</ul>' : '');
      };
      f.addEventListener('change', revisar); revisar();
      f.onsubmit = async (e) => {
        e.preventDefault();
        const v = U.leerForm(f), err = {};
        ['tecnico_id', 'tipo', 'fecha', 'ciudad'].forEach((k) => { if (!v[k]) err[k] = 'Obligatorio'; });
        if (v.fecha && v.fecha < hoy()) err.fecha = 'No puede ser una fecha pasada';
        if (!U.marcarErrores(f, err)) return;
        await revisar();
        if (avisos.length && !(await U.confirmar('Agendar con avisos', avisos.join('\n') + '\n\n¿Agendarla de todas formas?', 'Agendar'))) { formAgenda(t, alGuardar); return; }
        try {
          let fila;
          await U.conCarga(cu.querySelector('#agOk'), async () => {
            const n = await G.siguiente('PRG');
            fila = { Title: 'PRG-' + pad(n, 6), fecha: v.fecha, tecnico_id: v.tecnico_id, tipo: v.tipo, cliente: t.cliente_nombre, empresa_id: t.cliente_id === 'INTERNO' ? '' : t.cliente_id, ciudad: v.ciudad,
              hora_inicio: v.hora_inicio, estado: 'PROGRAMADO', observaciones: v.observaciones, origen: 'TAREA', tar_id: t.Title };
            Object.keys(fila).forEach((k) => { if (fila[k] === '' || fila[k] == null) delete fila[k]; });
            try { await G.crear('OPE_Actividades', fila); }
            catch (e2) { if (/tar_id/i.test(e2.message)) throw new Error('Falta actualizar las listas: abra el Instalador (Programacion/Instalador/) y haga clic en «Crear estructura».'); throw e2; }
            const d = new Date(), nota = pad(d.getDate(), 2) + '/' + pad(d.getMonth() + 1, 2) + '/' + String(d.getFullYear()).slice(2) + '. Agendada en la Programación: ' + fila.Title + ' · ' + v.tipo + ' · ' + persona(v.tecnico_id).nombre + ' · ' + textoFecha(v.fecha);
            const campos = { bitacora: nota + (t.bitacora ? '\n' + t.bitacora : ''), agenda: [t.agenda, fila.Title].filter(Boolean).join(';') };
            if (t.estado === 'Abierta') campos.estado = 'Programada';
            if (!t.fecha_inicio) campos.fecha_inicio = v.fecha;
            await guardarSeguro(() => G.actualizar('TAR_Tareas', t._id, campos), campos);
          });
          U.cerrarModal(); U.aviso(t.Title + ' agendada: ' + fila.Title + ' para ' + persona(v.tecnico_id).nombre + ' el ' + textoFecha(v.fecha), 'ok', 7000);
          await Promise.all([cargar(), cargarAgenda()]); alGuardar();
        } catch (err2) { U.aviso(U.mensajeError(err2), 'err', 9000); }
      };
    });
  }

  // =====================================================================
  // EXCEL: exportar e importar (formato del «Plan de Trabajo» por cliente)
  // =====================================================================
  function cargarXLSX() {
    if (window.XLSX) return Promise.resolve();
    return new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar la librería de Excel.')); document.head.appendChild(s); });
  }
  const serial = (d) => d ? Math.round((new Date(d + 'T00:00:00Z') - Date.UTC(1899, 11, 30)) / 864e5) : '';
  async function exportar(L) {
    await cargarXLSX();
    const filas = L.map((t) => ({ ID: t.Title, Cliente: t.cliente_nombre, Plan: t.plan || '', Item: t.item, 'Categoría': t.categoria || '', Responsable: nombreResp(t), Prioridad: t.prioridad || '', Estado: t.estado || '',
      'Fecha Apertura': serial(t.fecha_apertura), 'Fecha Inicio': serial(t.fecha_inicio), 'Fecha Limite': serial(t.fecha_limite), 'Fecha Cierre': serial(t.fecha_cierre),
      'Dias Restantes / Atraso': cerrada(t) || !t.fecha_limite ? '' : difDias(t.fecha_limite, hoy()), '% Progreso': (t.progreso || 0) / 100, Semaforo: SEM[semaforo(t)][0], 'Comentarios / Bitacora': t.bitacora || '' }));
    const ws = XLSX.utils.json_to_sheet(filas);
    const rango = XLSX.utils.decode_range(ws['!ref']);
    for (let r = 1; r <= rango.e.r; r++) {
      ['I', 'J', 'K', 'L'].forEach((col) => { const cel = ws[col + (r + 1)]; if (cel && cel.v !== '') { cel.t = 'n'; cel.z = 'dd/mm/yyyy'; } });
      const p = ws['N' + (r + 1)]; if (p) p.z = '0%';
    }
    ws['!cols'] = [8, 30, 24, 60, 14, 18, 9, 18, 12, 12, 12, 12, 10, 9, 16, 60].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Plan de Trabajo');
    const cli = App.filtro.cliente ? nombreCliente(App.filtro.cliente).replace(/[^\wÁÉÍÓÚÑáéíóúñ ]+/g, '').trim().replace(/\s+/g, '_') : 'Todos_los_clientes';
    XLSX.writeFile(wb, 'Plan_de_Trabajo_' + cli + '_' + hoy() + '.xlsx');
  }
  function fechaExcel(v) {
    if (v === '' || v === null || v === undefined) return '';
    if (typeof v === 'number') { const d = new Date(Math.round((v - 25569) * 864e5)); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1, 2) + '-' + pad(d.getUTCDate(), 2); }
    const s = String(v).trim(), m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/), m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m2) return m2[0]; if (m) return (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + pad(m[2], 2) + '-' + pad(m[1], 2);
    return '';
  }
  function vistaImportar(c) {
    c.innerHTML = '<h1 class="ic-titulo">Importar un plan de trabajo</h1><p class="ic-subtitulo">Suba un Excel con la hoja «Plan de Trabajo» (como el de Papeles Nacionales): una fila por tarea con Item, Categoría, Responsable, Prioridad, Estado, fechas, % de progreso y comentarios. Las columnas calculadas (ID, días, semáforo) se ignoran: la app las calcula.</p>' +
      '<form class="ic-form" id="fImp"><div class="ic-campos">' +
      U.campo({ name: 'cliente_id', label: 'Cliente al que pertenecen las tareas', t: 'select', op: opcionesClientes(''), req: true, c: 'c6' }) +
      U.campo({ name: 'plan', label: 'Plan / proyecto', c: 'c6', ph: 'Ej.: Implementación software T&A' }) +
      '<div class="ic-campo c12"><label for="fArch">Archivo de Excel</label><input type="file" id="fArch" accept=".xlsx,.xlsm,.xls"></div></div>' +
      '<div id="prev"></div><div class="ic-acciones"><button type="button" class="ic-btn" id="bImp" disabled>Importar tareas</button></div></form>';
    const f = c.querySelector('#fImp'); let filas = [];
    const leer = async () => {
      const file = c.querySelector('#fArch').files[0]; filas = []; c.querySelector('#bImp').disabled = true;
      if (!file) return;
      try {
        await cargarXLSX();
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        const ws = wb.Sheets['Plan de Trabajo'] || wb.Sheets[wb.SheetNames.find((n) => /plan/i.test(n)) || wb.SheetNames[0]];
        const m = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const iCab = m.findIndex((r) => r.some((x) => U.norm(x) === 'item'));
        if (iCab < 0) throw new Error('No se encontró la fila de encabezados (con la columna «Item»).');
        const cab = m[iCab].map((x) => U.norm(String(x)).replace(/[^a-z%]/g, ''));
        const col = (...n) => { for (const k of n) { const i = cab.findIndex((x) => x.indexOf(k) === 0); if (i >= 0) return i; } return -1; };
        const C = { item: col('item'), cat: col('categoria'), resp: col('responsable'), pri: col('prioridad'), est: col('estado'), ap: col('fechaapertura'), ini: col('fechainicio'), lim: col('fechalimite'), cie: col('fechacierre'), prog: col('%progreso', 'progreso', '%'), bit: col('comentarios', 'bitacora') };
        const val = (r, i) => (i >= 0 ? r[i] : '');
        const ya = new Set(App.tareas.filter((t) => t.cliente_id === f.cliente_id.value).map((t) => U.norm(t.item)));
        filas = m.slice(iCab + 1).filter((r) => String(val(r, C.item)).trim()).map((r) => {
          let est = String(val(r, C.est)).trim(); est = estadoEquiv(est); est = CFG.estados.find((e) => U.norm(e) === U.norm(est)) || (est ? est : 'Abierta');
          let pr = Number(val(r, C.prog)) || 0; if (pr > 0 && pr <= 1) pr = pr * 100;
          const pri = CFG.prioridades.find((p) => U.norm(p) === U.norm(val(r, C.pri))) || '';
          const o = { item: String(val(r, C.item)).trim(), categoria: equivalente(String(val(r, C.cat)).trim()), responsable: String(val(r, C.resp)).trim(), prioridad: pri, estado: est,
            fecha_apertura: fechaExcel(val(r, C.ap)), fecha_inicio: fechaExcel(val(r, C.ini)), fecha_limite: fechaExcel(val(r, C.lim)), fecha_cierre: fechaExcel(val(r, C.cie)), progreso: Math.round(pr), bitacora: String(val(r, C.bit)).trim() };
          o.repetida = ya.has(U.norm(o.item));
          return o;
        });
        const nuevas = filas.filter((x) => !x.repetida);
        c.querySelector('#prev').innerHTML = '<div class="ic-alerta chica">' + nuevas.length + ' tareas para importar' + (filas.length - nuevas.length ? ' · ' + (filas.length - nuevas.length) + ' ya existen para ese cliente y se omiten' : '') + '.</div>' +
          '<div class="ic-tabla-caja" style="max-height:320px;overflow:auto"><table class="ic-tabla"><thead><tr><th>Tarea</th><th>Categoría</th><th>Estado</th><th>Límite</th><th>Avance</th></tr></thead><tbody>' +
          filas.map((x) => '<tr' + (x.repetida ? ' style="opacity:.45"' : '') + '><td>' + esc(resumir(x.item, 90)) + (x.repetida ? ' <small>(ya existe)</small>' : '') + '</td><td>' + esc(x.categoria) + '</td><td>' + esc(x.estado) + '</td><td>' + esc(textoFecha(x.fecha_limite)) + '</td><td>' + x.progreso + ' %</td></tr>').join('') + '</tbody></table></div>';
        c.querySelector('#bImp').disabled = !nuevas.length || !f.cliente_id.value;
      } catch (e) { c.querySelector('#prev').innerHTML = '<p style="color:var(--ic-err)">No se pudo leer el archivo: ' + esc(e.message) + '</p>'; }
    };
    c.querySelector('#fArch').onchange = leer; f.cliente_id.onchange = leer;
    c.querySelector('#bImp').onclick = async () => {
      const nuevas = filas.filter((x) => !x.repetida), b = c.querySelector('#bImp');
      if (!f.cliente_id.value) { U.aviso('Elija el cliente', 'warn'); return; }
      try {
        await U.conCarga(b, async () => {
          let k = 0;
          for (const x of nuevas) {
            const n = await G.siguiente('TAR');
            const campos = Object.assign({ Title: 'T-' + pad(n, 4), orden: n, cliente_id: f.cliente_id.value, cliente_nombre: nombreCliente(f.cliente_id.value), plan: f.plan.value }, x);
            delete campos.repetida; Object.keys(campos).forEach((kk) => { if (campos[kk] === '' || campos[kk] === null) delete campos[kk]; });
            await G.crear('TAR_Tareas', campos); b.textContent = 'Importando ' + (++k) + ' de ' + nuevas.length + '…';
          }
        });
        U.aviso(nuevas.length + ' tareas importadas', 'ok', 6000);
        await cargar(); Object.assign(App.filtro, { cliente: f.cliente_id.value, estado: 'TODAS', semaforo: '', prioridad: '', categoria: '', q: '' }); location.hash = 'tareas';
      } catch (e) { U.aviso(U.mensajeError(e), 'err', 9000); }
    };
  }

  // =====================================================================
  // ARRANQUE
  // =====================================================================
  async function arrancar() {
    const raiz = document.getElementById('contenido');
    U.pantalla(raiz, { logo: CFG.logo, cargando: true, titulo: 'Cargando…', texto: 'Conectando con Microsoft 365' });
    try { sessionStorage.setItem('ic_volver_url', location.href); } catch (e) { /* sin almacenamiento */ }
    try {
      const cuenta = await IC.auth.iniciar(CFG.auth);
      if (!cuenta) { U.pantalla(raiz, { logo: CFG.logo, titulo: CFG.app.nombre, texto: 'Ingrese con su cuenta de Microsoft de Ideas Control.', boton: 'Iniciar sesión', alClic: () => IC.auth.entrar() }); return; }
      try { sessionStorage.removeItem('ic_volver_url'); } catch (e) { /* sin almacenamiento */ }
      const email = String(cuenta.username || '').toLowerCase();
      if (!email.endsWith(CFG.dominio)) { U.pantalla(raiz, { logo: CFG.logo, titulo: 'Sin acceso', texto: 'Esta app es para el personal de Ideas Control: ingrese con su cuenta ' + CFG.dominio + '.', boton: 'Volver al portal', alClic: () => IC.portal.volver() }); return; }
      App.usuario = { nombre: cuenta.name || email, email, iniciales: U.fmt.iniciales(cuenta.name || email) };
      await G.sitio(CFG.sitio.host, CFG.sitio.ruta);
      await Promise.all([cargar(), cargarClientes(), cargarPersonal(), cargarAgenda()]);
      if (esAdmin()) await convertirCategorias();
      pintarEncabezado();
      U.enrutar({ '': () => vistaResumen(raiz), tareas: () => vistaTareas(raiz), reportes: () => vistaReportes(raiz), importar: () => (esAdmin() ? vistaImportar(raiz) : vistaResumen(raiz)) }, marcarNav);
    } catch (e) {
      console.error(e);
      const falta = /No existe la lista TAR_/.test(e.message);
      U.pantalla(raiz, { logo: CFG.logo, titulo: falta ? 'Falta instalar la app' : 'No se pudo cargar la app',
        texto: falta ? 'La lista TAR_Tareas aún no existe en IC Apps. Abra el instalador (Programacion/Instalador/) y haga clic en «Crear estructura».' : U.mensajeError(e), boton: 'Reintentar', alClic: () => location.reload() });
    }
  }
  window.addEventListener('DOMContentLoaded', arrancar);
})();
