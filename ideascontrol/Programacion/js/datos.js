/* =====================================================================
   APP-106 · Programación — datos y reglas de programación
   Listas: OPE_Tecnicos, OPE_Tipos, OPE_Actividades (+ SYS_Festivos, SYS_Accesos)
   Las reglas de validación son las mismas del Excel 2506-MAN-OPE (columna Validación).
   ===================================================================== */
window.Ope = (function () {
  const G = IC.graph;
  const D = {
    tecnicos: [], personal: [], tipos: [], festivos: {}, meses: {}, empresas: null
  };

  const ESTADOS = [['PROGRAMADO', 'Programado'], ['CONFIRMADO', 'Confirmado'], ['EJECUTADO', 'Ejecutado'], ['REPROGRAMADO', 'Reprogramado'], ['CANCELADO', 'Cancelado']];
  const VINCULOS = [['IDEAS_CONTROL', 'Ideas Control'], ['TECNICO_CAMPO', 'Técnico de campo']];
  // Personal administrativo: está en OPE_Tecnicos solo para Novedades del personal; no se programa ni aparece en la Programación
  const ADMINISTRATIVO = 'ADMINISTRATIVO';
  const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // ---------- Fechas (siempre texto yyyy-mm-dd, sin zona horaria) ----------
  const dia = (v) => String(v || '').slice(0, 10);
  const pad = (n, l) => String(n).padStart(l || 2, '0');
  function hoy() { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function aFecha(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); }
  function deFecha(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function sumar(s, n) { const d = aFecha(s); d.setDate(d.getDate() + n); return deFecha(d); }
  function dow(s) { const g = aFecha(s).getDay(); return g === 0 ? 7 : g; }          // 1 = lunes … 7 = domingo
  function lunesDe(s) { return sumar(s, 1 - dow(s)); }
  const ym = (s) => s.slice(0, 7);
  function finDeMes(y, m) { return y + '-' + pad(m) + '-' + pad(new Date(y, m, 0).getDate()); }
  function esFestivo(s) { return !!D.festivos[s]; }
  function esHabil(s) { return dow(s) <= 5 && !esFestivo(s); }
  function diasHabilesMes(y, m) {
    const out = []; let s = y + '-' + pad(m) + '-01'; const fin = finDeMes(y, m);
    while (s <= fin) { if (esHabil(s)) out.push(s); s = sumar(s, 1); }
    return out;
  }
  function textoFecha(s, conDia) {
    if (!s) return '';
    const d = aFecha(s);
    return (conDia ? DIAS[dow(s) - 1] + ' ' : '') + d.getDate() + ' ' + MESES[d.getMonth()].slice(0, 3).toLowerCase() + ' ' + d.getFullYear();
  }

  // ---------- Catálogos ----------
  // Los catálogos se vuelven a leer si tienen más de 1 minuto (cambios hechos en Administración desde otra pestaña o por otra persona)
  let catalogosEn = 0;
  async function catalogosFrescos(seg) { if (Date.now() - catalogosEn > (seg == null ? 60 : seg) * 1000) { try { await cargarCatalogos(); } catch (e) { /* se valida con lo que hay */ } } }
  async function cargarCatalogos() {
    catalogosEn = Date.now();
    const [tec, tip, fes] = await Promise.all([
      G.items('OPE_Tecnicos'), G.items('OPE_Tipos'), G.items('SYS_Festivos', { top: 999 }).catch(() => [])
    ]);
    D.personal = tec.sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99) || String(a.nombre).localeCompare(b.nombre));
    D.tecnicos = D.personal.filter((t) => t.vinculacion !== ADMINISTRATIVO);
    D.tipos = tip.sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99));
    D.festivos = {}; fes.forEach((f) => { D.festivos[dia(f.fecha || f.Title)] = f.descripcion || 'Festivo'; });
  }
  const tec = (id) => D.personal.find((t) => t.Title === id) || null;
  const tipo = (cod) => D.tipos.find((t) => t.Title === cod) || null;
  const habilidades = (t) => String((t && t.habilidades) || '').toUpperCase().split(/[;,\s]+/).filter(Boolean);
  const puede = (t, cod) => habilidades(t).indexOf(String(cod || '').trim().toUpperCase()) >= 0;
  const usaEquipos = (cod) => { const t = tipo(cod); return !!(t && Number(t.max_equipos) > 0); };
  const diasPref = (t) => String((t && t.dias_preferentes) || '').split(/[;,\s]+/).filter(Boolean).map(Number);
  const tecnicosActivos = () => D.tecnicos.filter((t) => t.estado !== 'INACTIVO');
  const tecnicosIC = () => tecnicosActivos().filter((t) => t.vinculacion === 'IDEAS_CONTROL');
  const nombreTec = (id) => { const t = tec(id); return t ? t.nombre : (id || '— sin técnico —'); };
  const nombreTipo = (cod) => { const t = tipo(cod); return t ? t.nombre : (cod || '—'); };
  const nombreEstado = (e) => (ESTADOS.find((x) => x[0] === e) || [e, e])[1];

  // ---------- Actividades (se cargan por mes y se guardan en memoria) ----------
  function normalizar(a) { a.fecha = dia(a.fecha); a.equipos = a.equipos === null || a.equipos === undefined || a.equipos === '' ? '' : Number(a.equipos); return a; }
  async function cargarMes(clave, forzar) {
    if (D.meses[clave] && !forzar) return D.meses[clave];
    const [y, m] = clave.split('-').map(Number);
    const desde = clave + '-01T00:00:00Z', hasta = finDeMes(y, m) + 'T23:59:59Z';
    const r = await G.items('OPE_Actividades', { filtro: "fields/fecha ge '" + desde + "' and fields/fecha le '" + hasta + "'", top: 999 });
    D.meses[clave] = r.map(normalizar);
    return D.meses[clave];
  }
  async function cargarRango(desde, hasta, forzar) {
    const claves = []; let s = desde.slice(0, 7) + '-01';
    while (ym(s) <= ym(hasta)) { claves.push(ym(s)); const [y, m] = ym(s).split('-').map(Number); s = (m === 12 ? (y + 1) + '-01' : y + '-' + pad(m + 1)) + '-01'; }
    await Promise.all(claves.map((c) => cargarMes(c, forzar)));
  }
  function delRango(desde, hasta) {
    const out = [];
    Object.keys(D.meses).forEach((k) => D.meses[k].forEach((a) => { if (a.fecha >= desde && a.fecha <= hasta) out.push(a); }));
    return out.sort(orden);
  }
  function orden(a, b) {
    return a.fecha.localeCompare(b.fecha) || (a.tipo === 'OFI' ? -1 : b.tipo === 'OFI' ? 1 : 0) ||
      String(a.hora_inicio || '99').localeCompare(String(b.hora_inicio || '99')) || nombreTec(a.tecnico_id).localeCompare(nombreTec(b.tecnico_id));
  }
  const delDia = (s) => (D.meses[ym(s)] || []).filter((a) => a.fecha === s);
  const activa = (a) => a.estado !== 'CANCELADO' && a.estado !== 'REPROGRAMADO';
  const buscar = (id) => { for (const k of Object.keys(D.meses)) { const a = D.meses[k].find((x) => x.Title === id); if (a) return a; } return null; };
  // Mantiene la memoria al día después de guardar
  function recordar(a) {
    normalizar(a);
    Object.keys(D.meses).forEach((k) => { D.meses[k] = D.meses[k].filter((x) => x.Title !== a.Title); });
    if (D.meses[ym(a.fecha)]) D.meses[ym(a.fecha)].push(a);
  }

  // ---------- Reglas de programación ----------
  // Carga del día de un técnico = Σ equipos / máximo del tipo (instalación 3, mantenimiento 4…). Nunca más de 100 %.
  function cargaDia(tecId, lista) {
    return lista.filter((x) => x.tecnico_id === tecId && activa(x) && usaEquipos(x.tipo))
      .reduce((s, x) => s + (Number(x.equipos) || 0) / Number(tipo(x.tipo).max_equipos), 0);
  }

  /**
   * Valida una actividad contra las demás del mismo día.
   * propuesta: actividad (guardada o en edición). otras: actividades del día (opcional).
   * Devuelve { errores: [], avisos: [], carga }
   */
  function validar(a, otras) {
    const out = { errores: [], avisos: [], carga: null };
    if (!a || !a.fecha || !activa(a)) return out;
    const E = (t) => out.errores.push(t), W = (t) => out.avisos.push(t);
    const base = (otras || delDia(a.fecha)).filter((x) => x.Title !== a.Title && activa(x));
    const dd = base.concat([a]);                                  // el día completo, con la propuesta
    const t = tec(a.tecnico_id), tp = tipo(a.tipo), wd = dow(a.fecha);
    const mismos = a.tecnico_id ? dd.filter((x) => x.tecnico_id === a.tecnico_id) : [a];

    // Un turno de oficina sin técnico se deja así a propósito (oficina sin técnico ese día): no es conflicto
    const ofiVacio = a.tipo === 'OFI' && !a.tecnico_id;
    if ((!a.tecnico_id && !ofiVacio) || !a.tipo) E('Faltan técnico o tipo');
    if (t && t.estado === 'INACTIVO') E('Técnico inactivo');
    if (tp && tp.estado === 'INACTIVO') E('Tipo de actividad inactivo');
    if (esFestivo(a.fecha) && !a.autorizado) E('Fecha festiva (' + D.festivos[a.fecha] + ')');
    if (a.tipo !== 'AUS' && wd > 5 && !a.autorizado) E('Fin de semana');
    if (a.tipo === 'OFI' && t && t.vinculacion !== 'IDEAS_CONTROL') E('Solo los técnicos de Ideas Control rotan en oficina');
    if (a.tipo === 'OFI' && a.tecnico_id && dd.filter((x) => x.tipo === 'OFI' && x.tecnico_id).length > 1) E('Más de un técnico de turno ese día (los técnicos sin asignación no se registran como Oficina)');
    if (a.tipo && a.tipo !== 'OFI' && t && !puede(t, a.tipo)) { E(t.nombre + ' no realiza ' + nombreTipo(a.tipo) + ' (' + a.tipo + ')'); out.faltaHab = { tecnico: t.Title, tipo: a.tipo }; }
    if (t && t.vinculacion === 'TECNICO_CAMPO' && /bogot/.test(IC.ui.norm(a.ciudad))) E('Técnico de campo solo para trabajos fuera de Bogotá');
    if (usaEquipos(a.tipo) && !(Number(a.equipos) >= 1)) E('Indique la cantidad de equipos');
    if (a.tipo === 'INV' && dd.filter((x) => x.tipo === 'INV').length < 2) E('El inventario debe programarse con más de 1 técnico ese día');
    if (usaEquipos(a.tipo) && a.tecnico_id) {
      out.carga = cargaDia(a.tecnico_id, dd);
      if (out.carga > 1.0001) E('Carga del día ' + Math.round(out.carga * 100) + ' % (máximo 100 %)');
    }
    if (t && t.vinculacion === 'IDEAS_CONTROL' && a.tipo !== 'AUS') {
      const noAus = mismos.filter((x) => x.tipo !== 'AUS');
      if (noAus.length > 1 && noAus.some((x) => !usaEquipos(x.tipo))) {
        // Se permite si otro técnico de Ideas Control está sin asignar ese día (capacidad libre para cubrir la oficina o el trabajo)
        const libres = tecnicosIC().filter((o) => o.Title !== a.tecnico_id && !dd.some((x) => x.tecnico_id === o.Title));
        const oficina = noAus.some((x) => x.tipo === 'OFI');
        if (libres.length) W('Varias asignaciones el mismo día para ' + t.nombre + '. ' + (oficina ? 'La oficina la puede cubrir: ' : 'Hay capacidad libre en: ') + libres.map((o) => o.nombre).join(', '));
        else E('Solo instalaciones y mantenimientos pueden combinarse el mismo día: no hay otro técnico de Ideas Control sin asignar ese día' + (oficina ? ' para cubrir la oficina' : ''));
      }
    }
    if (a.tecnico_id && a.tipo !== 'AUS' && mismos.some((x) => x.tipo === 'AUS')) E('El técnico tiene ausencia ese día');
    if (a.tecnico_id && a.tipo === 'AUS' && mismos.some((x) => x.tipo !== 'AUS')) E('Tiene asignaciones durante su ausencia');

    if (ofiVacio) W('Turno de oficina sin técnico (definido así)');
    if (tp && wd <= 5 && diasPref(tp).length && diasPref(tp).indexOf(wd) < 0) W('Día no preferente para ' + tp.nombre);
    if (usaEquipos(a.tipo) && a.tecnico_id) {
      const ciudades = new Set(mismos.filter((x) => usaEquipos(x.tipo)).map((x) => IC.ui.norm(x.ciudad).trim()));
      if (ciudades.size > 1) W('Revisar distancia: visitas en ciudades distintas este día');
    }
    return out;
  }

  // Etiqueta corta, igual a la del Excel: "LR · INS ×2 · CLIENTE"
  function etiqueta(a) {
    const t = tec(a.tecnico_id);
    if (a.tipo === 'OFI' && !a.tecnico_id) return 'OFI · sin técnico';
    return (t ? t.iniciales : '??') + ' · ' + (a.tipo || '?') + (usaEquipos(a.tipo) && Number(a.equipos) > 1 ? ' ×' + a.equipos : '') +
      ((a.sitio || a.cliente) && a.tipo !== 'OFI' && a.tipo !== 'AUS' ? ' · ' + String(a.sitio || a.cliente).slice(0, 18) : '');
  }

  // Resumen de un día hábil (rotación de oficina)
  function resumenDia(s) {
    const dd = delDia(s).filter(activa);
    const ofi = dd.filter((x) => x.tipo === 'OFI' && x.tecnico_id);     // un turno sin técnico no cubre la oficina
    const sinAsignar = tecnicosIC().filter((t) => !dd.some((x) => x.tecnico_id === t.Title));
    const campo = dd.filter((x) => x.tipo !== 'OFI' && x.tipo !== 'AUS');
    const ausentes = dd.filter((x) => x.tipo === 'AUS');
    return { fecha: s, oficina: ofi, sinAsignar, campo, ausentes, vacio: dd.some((x) => x.tipo === 'OFI' && !x.tecnico_id),
      estado: ofi.length > 1 ? 'VARIOS' : ofi.length === 1 ? 'OK' : dd.some((x) => x.tipo === 'OFI' && !x.tecnico_id) ? 'VACIO' : 'SIN' };
  }

  // ---------- Empresas de la app Comercial (fuente única de clientes) ----------
  async function empresas() {
    if (D.empresas) return D.empresas;
    try { D.empresas = (await G.items('MAE_Empresas', { top: 5000 })).filter((e) => e.estado !== 'INACTIVO'); }
    catch (e) { D.empresas = []; }
    return D.empresas;
  }

  // ---------- Guardar ----------
  async function auditar(entidad, registro, accion, antes, despues) {
    try {
      const n = await G.siguiente('EVT');
      await G.crear('SYS_Auditoria', { Title: 'EVT-' + pad(n, 8), fecha_hora: new Date().toISOString(), usuario_id: App.usuario.usuario_id, app_id: CFG.app.id,
        entidad, registro_id: registro, accion, antes: antes ? JSON.stringify(antes) : '', despues: despues ? JSON.stringify(despues) : '' });
    } catch (e) { console.warn('Auditoría no registrada', e); }
  }
  const CAMPOS_ACT = ['fecha', 'tecnico_id', 'tipo', 'cliente', 'empresa_id', 'ciudad', 'equipos', 'hora_inicio', 'ticket_os', 'estado', 'observaciones', 'reprograma_de', 'autorizado', 'motivo_cambio', 'origen', 'sitio'];
  function soloCampos(o) { const r = {}; CAMPOS_ACT.forEach((k) => { if (o[k] !== undefined) r[k] = o[k]; }); return r; }

  // Cliente principal = quien contrata y paga (p. ej. Casa Limpia) · sitio = cliente final donde se instala
  function sitiosConocidos(cliente) {
    const c = IC.ui.norm(cliente), propios = new Set(), otros = new Set();
    Object.keys(D.meses).forEach((k) => D.meses[k].forEach((a) => {
      if (!a.sitio) return;
      (c && IC.ui.norm(a.cliente) === c ? propios : otros).add(a.sitio);
    }));
    return Array.from(propios).sort().concat(Array.from(otros).filter((x) => !propios.has(x)).sort());
  }
  // Si falta la columna nueva en SharePoint, se explica qué hacer
  function explicarColumna(e) {
    if (/sitio/i.test(String(e && e.message)) && /recogni|reconoc|not found|no existe|does not exist/i.test(String(e.message)))
      return new Error('Falta actualizar las listas de SharePoint (columna «sitio»). Abra el Instalador (Programacion/Instalador/) y haga clic en «Crear estructura».');
    return e;
  }
  async function crearActividad(a) {
    const n = await G.siguiente('PRG');
    const campos = Object.assign(soloCampos(a), { Title: 'PRG-' + pad(n, 6) });
    if (campos.equipos === '') delete campos.equipos;
    let it; try { it = await G.crear('OPE_Actividades', campos); } catch (e) { throw explicarColumna(e); }
    recordar(it);
    await auditar('ACTIVIDAD', it.Title, 'CREAR', null, campos);
    return it;
  }
  async function actualizarActividad(actual, cambios, accion) {
    const campos = soloCampos(cambios);
    if (campos.equipos === '') campos.equipos = null;
    try { await G.actualizar('OPE_Actividades', actual._id, campos, actual._etag); } catch (e) { throw explicarColumna(e); }
    const nuevo = (await G.items('OPE_Actividades', { filtro: "fields/Title eq '" + actual.Title + "'" }))[0];
    if (actual.fecha !== nuevo.fecha) { /* cambió de mes */ }
    recordar(nuevo);
    const antes = {}; Object.keys(campos).forEach((k) => { antes[k] = actual[k]; });
    await auditar('ACTIVIDAD', actual.Title, accion || 'ACTUALIZAR', antes, campos);
    return nuevo;
  }

  return {
    D, ESTADOS, VINCULOS, ADMINISTRATIVO, DIAS, DIAS_CORTOS, MESES,
    dia, pad, hoy, aFecha, sumar, dow, lunesDe, ym, finDeMes, esFestivo, esHabil, diasHabilesMes, textoFecha,
    cargarCatalogos, catalogosFrescos, tec, tipo, habilidades, puede, usaEquipos, diasPref, tecnicosActivos, tecnicosIC, nombreTec, nombreTipo, nombreEstado,
    cargarMes, cargarRango, delRango, delDia, activa, buscar, recordar, orden,
    cargaDia, validar, etiqueta, resumenDia, empresas, sitiosConocidos, auditar, crearActividad, actualizarActividad
  };
})();
