/* =====================================================================
   APP-114 · Proyectos — datos y reglas de cálculo
   - Días hábiles (sin fines de semana ni festivos de SYS_Festivos)
   - Programación de fechas por duración y predecesoras, con detección de ciclos
   - Avance ponderado por duración (sin fases ni «No aplica»), atraso contra la línea base
   - Bitácora de cambios (PRY_Bitacora)
   ===================================================================== */
window.PRY = (function () {
  const G = IC.graph, U = IC.ui;
  const pad = (n, l) => String(n).padStart(l || 2, '0');
  const D = { festivos: {}, personas: [], empresas: null, contactos: null, plantillas: [] };

  // ---------- Fechas (texto AAAA-MM-DD) ----------
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const aFecha = (s) => new Date(s + 'T12:00:00');
  const hoy = () => iso(new Date());
  const dia = (v) => (v ? String(v).slice(0, 10) : '');
  const sumar = (s, n) => { const d = aFecha(s); d.setDate(d.getDate() + n); return iso(d); };
  const habil = (s) => { const w = aFecha(s).getDay(); return w !== 0 && w !== 6 && !D.festivos[s]; };
  const sigHabil = (s) => { let x = s; while (!habil(x)) x = sumar(x, 1); return x; };
  // n días hábiles después (n ≥ 1) del día s
  function masHabiles(s, n) { let x = s, k = 0; while (k < n) { x = sumar(x, 1); if (habil(x)) k++; } return x; }
  // Fin de una tarea que empieza en ini y dura dur días hábiles (dur 0 = hito: mismo día)
  const finDe = (ini, dur) => (dur > 1 ? masHabiles(ini, dur - 1) : ini);
  // Días hábiles entre a (excl.) y b (incl.); negativo si b < a
  function habilesEntre(a, b) {
    if (!a || !b || a === b) return 0;
    const sg = a < b ? 1 : -1; let x = a, n = 0;
    while (x !== b) { x = sumar(x, sg); if (habil(x)) n += sg; }
    return n;
  }
  const textoFecha = (s, anio) => s ? aFecha(s).toLocaleDateString('es-CO', anio ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' }) : '';

  async function cargarFestivos() {
    try { (await G.items('SYS_Festivos', { top: 999 })).forEach((f) => { D.festivos[dia(f.fecha || f.Title)] = f.descripcion || 'Festivo'; }); } catch (e) { /* sin festivos */ }
  }

  // ---------- Personas y clientes (sin duplicar: se leen de las listas existentes) ----------
  async function cargarPersonas() {
    const [us, tec] = await Promise.all([G.items('SYS_Usuarios').catch(() => []), G.items('OPE_Tecnicos').catch(() => [])]);
    const m = {};
    tec.filter((t) => t.estado !== 'INACTIVO' && t.email).forEach((t) => { m[String(t.email).toLowerCase()] = { email: String(t.email).toLowerCase(), nombre: t.nombre, cargo: t.vinculacion === 'ADMINISTRATIVO' ? 'Administrativo' : 'Técnico', tecnico: t.vinculacion !== 'ADMINISTRATIVO' }; });
    us.filter((u) => u.estado !== 'INACTIVO' && u.email).forEach((u) => { const e = String(u.email).toLowerCase(); m[e] = Object.assign({ email: e, nombre: u.nombre, cargo: u.cargo || (u.rol === 'ADMIN' ? 'Administrador' : 'Comercial') }, m[e] || {}); });
    CFG.aprobadores.forEach((a) => { if (!m[a.email]) m[a.email] = { email: a.email, nombre: a.nombre, cargo: a.cargo }; });
    D.personas = Object.values(m).sort((a, b) => String(a.nombre).localeCompare(b.nombre));
    return D.personas;
  }
  const persona = (email) => D.personas.find((p) => p.email === String(email || '').toLowerCase()) || null;
  async function empresas() {
    if (!D.empresas) D.empresas = (await G.items('MAE_Empresas', { top: 5000 }).catch(() => [])).filter((e) => e.estado !== 'INACTIVO').sort((a, b) => String(a.razon_social).localeCompare(b.razon_social));
    return D.empresas;
  }
  async function contactos(empresaId) {
    if (!D.contactos) D.contactos = await G.items('MAE_Contactos', { top: 5000 }).catch(() => []);
    return D.contactos.filter((c) => c.empresa_id === empresaId && c.estado !== 'INACTIVO');
  }

  // ---------- Plantillas ----------
  async function cargarPlantillas() { D.plantillas = (await G.items('PRY_Plantillas').catch(() => [])).filter((p) => p.estado !== 'RETIRADA'); return D.plantillas; }
  // Versión vigente de cada código: la publicada más alta; si no hay, la más alta en validación
  function vigente(codigo) {
    const v = D.plantillas.filter((p) => p.codigo === codigo).sort((a, b) => Number(b.version) - Number(a.version));
    return v.find((p) => p.estado === 'PUBLICADA') || v[0] || null;
  }
  const registrosDe = (codigo, version) => G.items('PRY_PlantillaTareas', { filtro: "fields/plantilla eq '" + codigo + "' and fields/version eq '" + version + "'", top: 999 })
    .then((r) => r.sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0)));

  // ---------- Normalización de tareas ----------
  const listaPred = (t) => String(t.predecesoras || '').split(/[;,\s]+/).map((x) => x.trim()).filter(Boolean);
  function normal(t) {
    ['inicio_plan', 'fin_plan', 'inicio_real', 'fin_real'].forEach((k) => { t[k] = dia(t[k]); });
    t.duracion = t.duracion === '' || t.duracion == null ? null : Number(t.duracion);
    t.porcentaje = Number(t.porcentaje) || 0; t.orden = Number(t.orden) || 0;
    t.estado = t.estado || 'No iniciada'; t.salud = t.salud || 'Normal';
    return t;
  }
  const esFase = (t) => t.tipo === 'Fase';
  const esNA = (t) => t.estado === 'No aplica' || t.estado === 'Cancelada';
  const cerrada = (t) => t.estado === 'Completada' || esNA(t);

  // ---------- Dependencias: existencia y ciclos ----------
  function validarDependencias(tareas) {
    const ids = new Set(tareas.map((t) => t.tarea_id)), errores = [];
    tareas.forEach((t) => listaPred(t).forEach((p) => { if (!ids.has(p)) errores.push(t.tarea_id + ': la predecesora «' + p + '» no existe'); else if (p === t.tarea_id) errores.push(t.tarea_id + ' no puede depender de sí misma'); }));
    const por = {}; tareas.forEach((t) => { por[t.tarea_id] = t; });
    const estado = {}, ciclo = [];
    const visitar = (id, camino) => {
      if (estado[id] === 2) return false; if (estado[id] === 1) { ciclo.push(camino.slice(camino.indexOf(id)).concat(id).join(' → ')); return true; }
      estado[id] = 1; const t = por[id];
      for (const p of t ? listaPred(t).filter((x) => por[x]) : []) if (visitar(p, camino.concat(id))) return true;
      estado[id] = 2; return false;
    };
    for (const t of tareas) if (!estado[t.tarea_id] && visitar(t.tarea_id, [])) break;
    if (ciclo.length) errores.push('Hay un ciclo de dependencias: ' + ciclo[0]);
    return errores;
  }

  // ---------- Programación de fechas ----------
  // Calcula inicio/fin plan de cada tarea desde la fecha de inicio del proyecto, la duración y las predecesoras.
  // Tarea sin predecesoras: empieza el inicio del proyecto (o su inicio actual si es posterior: se respeta un ajuste manual).
  function programar(tareas, inicioProyecto) {
    if (validarDependencias(tareas).length) return { cambios: [], error: true };
    const por = {}; tareas.forEach((t) => { por[t.tarea_id] = t; });
    const ini0 = sigHabil(inicioProyecto || hoy()), hechos = {}, cambios = [];
    const calc = (t) => {
      if (hechos[t.tarea_id]) return; hechos[t.tarea_id] = true;
      if (esFase(t)) return;
      const preds = listaPred(t).map((p) => por[p]).filter((p) => p && !esFase(p));
      preds.forEach(calc);
      let ini = ini0;
      preds.forEach((p) => { if (p.fin_plan) { const s = masHabiles(p.fin_plan, 1); if (s > ini) ini = s; } });   // empieza el día hábil siguiente al fin de su predecesora
      if (!preds.length && t.inicio_plan && t.inicio_plan > ini) ini = sigHabil(t.inicio_plan);
      const dur = t.duracion == null ? 1 : Number(t.duracion), fin = finDe(ini, dur);
      if (t.inicio_plan !== ini || t.fin_plan !== fin) { cambios.push({ t, antes: [t.inicio_plan, t.fin_plan], despues: [ini, fin] }); t.inicio_plan = ini; t.fin_plan = fin; }
    };
    tareas.forEach(calc);
    // Fases: desde el primer inicio hasta el último fin de sus tareas
    tareas.filter(esFase).forEach((f) => {
      const hijos = tareas.filter((t) => t.id_padre === f.tarea_id && !esFase(t) && !esNA(t) && t.inicio_plan);
      if (!hijos.length) return;
      const ini = hijos.map((h) => h.inicio_plan).sort()[0], fin = hijos.map((h) => h.fin_plan).sort().pop();
      if (f.inicio_plan !== ini || f.fin_plan !== fin) { cambios.push({ t: f, antes: [f.inicio_plan, f.fin_plan], despues: [ini, fin] }); f.inicio_plan = ini; f.fin_plan = fin; }
    });
    return { cambios, error: false };
  }

  // ---------- Indicadores ----------
  const peso = (t) => Math.max(Number(t.duracion) || 0, 0);
  const trabajables = (tareas) => tareas.filter((t) => !esFase(t) && !esNA(t));
  // Avance real: ponderado por duración (hitos y tareas de duración 0 pesan 0; si todo pesa 0 se cuenta por tareas)
  function avance(tareas) {
    const L = trabajables(tareas), tot = L.reduce((s, t) => s + peso(t), 0);
    if (!L.length) return 0;
    if (!tot) return Math.round(L.reduce((s, t) => s + (t.estado === 'Completada' ? 100 : t.porcentaje), 0) / L.length);
    return Math.round(L.reduce((s, t) => s + peso(t) * (t.estado === 'Completada' ? 100 : Math.min(100, t.porcentaje)), 0) / tot);
  }
  // Avance planeado a hoy contra la línea base (o el plan vigente si no hay línea base)
  function avancePlaneado(tareas, base) {
    const L = trabajables(tareas), h = hoy(); let tot = 0, deb = 0;
    L.forEach((t) => {
      const b = (base && base[t.tarea_id]) || { i: t.inicio_plan, f: t.fin_plan, d: t.duracion };
      const w = Math.max(Number(b.d) || 0, 0); if (!w || !b.i) return; tot += w;
      if (h >= b.f) deb += w; else if (h >= b.i) deb += w * Math.min(1, (habilesEntre(b.i, h) + 1) / Math.max(1, w));
    });
    return tot ? Math.round(deb * 100 / tot) : 0;
  }
  // Días hábiles de atraso contra la fecha de referencia (línea base si existe)
  function atraso(t, base) {
    if (esFase(t) || esNA(t)) return 0;
    const ref = (base && base[t.tarea_id] && base[t.tarea_id].f) || t.fin_plan; if (!ref) return 0;
    if (t.estado === 'Completada') return t.fin_real && t.fin_real > ref ? habilesEntre(ref, t.fin_real) : 0;
    const h = hoy(); return h > ref ? habilesEntre(ref, h) : 0;
  }
  const vencida = (t, base) => !cerrada(t) && !esFase(t) && atraso(t, base) > 0;

  // ---------- Bitácora ----------
  async function bitacora(proyectoId, tareaId, cambios, comentario, evidencia, usuario) {
    if (!cambios.length) return;
    let n = await G.reservar('PRYB', cambios.length);
    const fh = new Date().toISOString();
    // Las fechas AAAA-MM-DD se guardan legibles (la librería común convierte ese formato a fecha-hora)
    const val = (v) => { const x = v == null ? '' : String(v); return /^\d{4}-\d{2}-\d{2}(T|$)/.test(x) ? textoFecha(x.slice(0, 10), true) : x; };
    for (const c of cambios) {
      await G.crear('PRY_Bitacora', { Title: 'BIT-' + String(n++).padStart(6, '0'), proyecto_id: proyectoId, tarea_id: tareaId || '', fecha_hora: fh, usuario,
        campo: c.campo, anterior: val(c.antes), nuevo: val(c.despues), comentario: comentario || '', evidencia: evidencia || '' });
    }
  }

  // Ejecuta tareas asíncronas de a «n» al tiempo (crear muchas filas sin esperar una por una)
  async function enParalelo(lista, n, fn, progreso) {
    let i = 0, hechas = 0; const errores = [];
    const trabajador = async () => { while (i < lista.length) { const k = i++; try { await fn(lista[k], k); } catch (e) { errores.push(e); } hechas++; if (progreso) progreso(hechas, lista.length); } };
    await Promise.all(Array.from({ length: Math.min(n, lista.length) }, trabajador));
    if (errores.length) throw errores[0];
  }

  return { D, pad, iso, hoy, dia, sumar, habil, sigHabil, masHabiles, finDe, habilesEntre, textoFecha, cargarFestivos, cargarPersonas, persona, empresas, contactos,
    cargarPlantillas, vigente, registrosDe, listaPred, normal, esFase, esNA, cerrada, validarDependencias, programar, avance, avancePlaneado, atraso, vencida, bitacora, enParalelo, peso };
})();
