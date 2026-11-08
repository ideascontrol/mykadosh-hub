/* =====================================================================
   Marketing GPA — acceso al Excel (API de Excel de Microsoft 365) y modelo de datos
   GPA_XL.cargar()         lee todas las hojas y arma App.pubs, App.estrategia, App.planMes, App.recursos…
   GPA_XL.guardarPub(p, campos)  escribe las columnas de una publicación (solo las que cambian)
   GPA_XL.agregar(hoja, fila)    agrega una fila al final de Métricas / Leads / Pauta (crea la hoja si falta)
   ===================================================================== */
window.GPA_XL = (function () {
  const G = IC.graph, U = IC.ui;
  const pad = (n) => String(n).padStart(2, '0');
  const ruta = (r) => r.split('/').map(encodeURIComponent).join('/');
  let sid = '';
  const item = (r) => '/sites/' + sid + '/drive/root:/' + ruta(r);
  const hoja = (n) => "/workbook/worksheets('" + encodeURIComponent(n) + "')";
  const libro = () => item(CFG.excel) + ':';
  const letra = (i) => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  const serialAIso = (v) => {
    if (v instanceof Date) return v.getFullYear() + '-' + pad(v.getMonth() + 1) + '-' + pad(v.getDate());
    if (typeof v === 'string') { const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/) || v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (!m) return ''; return m[1].length === 4 ? m[1] + '-' + m[2] + '-' + m[3] : m[3] + '-' + pad(m[2]) + '-' + pad(m[1]); }
    if (typeof v !== 'number' || !isFinite(v) || v < 20000) return '';
    const d = new Date(Math.round((v - 25569) * 864e5)); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  };
  const isoASerial = (iso) => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5) + 25569;
  const tx = (s) => { s = String(s == null ? '' : s); return /^[=+\-@]/.test(s) ? "'" + s : s; };   // texto seguro (no fórmula)
  const s = (v) => String(v == null ? '' : v).trim();

  async function rango(nombre) {
    try { return await G.llamar('GET', libro() + hoja(nombre) + '/usedRange?$select=address,values'); }
    catch (e) { if (e.status === 404) return null; throw e; }
  }
  // Inicio del rango usado: { col0, fila0 }
  function origen(r) { const m = String(r.address || '').split('!')[1].match(/^\$?([A-Z]+)\$?(\d+)/); let c = 0; for (const ch of m[1]) c = c * 26 + ch.charCodeAt(0) - 64; return { col0: c - 1, fila0: +m[2] }; }
  // Tabla simple (encabezado en la primera fila) -> objetos con la clave de cada encabezado
  function tabla(r) {
    if (!r || !r.values || !r.values.length) return [];
    const cab = r.values[0].map(s), o = origen(r);
    return r.values.slice(1).map((v, i) => { const x = { _fila: o.fila0 + 1 + i }; cab.forEach((c, j) => { if (c) x[c] = v[j]; }); return x; }).filter((x) => Object.keys(x).some((k) => k !== '_fila' && s(x[k])));
  }
  async function escribir(nombre, dir, valores) { await G.llamar('PATCH', libro() + hoja(nombre) + "/range(address='" + dir + "')", { values: valores }); }
  async function formato(nombre, dir, fmt) { await G.llamar('PATCH', libro() + hoja(nombre) + "/range(address='" + dir + "')", { numberFormat: fmt }); }

  // ---------- Calendario: columnas por nombre de encabezado ----------
  const C = {};   // clave -> índice (0 = columna del inicio del rango)
  let calO = { col0: 0, fila0: 1 };
  async function asegurarColumnas(r) {
    const cab = r.values[0].map(s), nuevos = [];
    Object.keys(CFG.colsPlan).forEach((k) => { C[k] = cab.findIndex((c) => U.norm(c) === U.norm(CFG.colsPlan[k])); });
    Object.keys(CFG.colsApp).forEach((k) => {
      let j = cab.findIndex((c) => U.norm(c) === U.norm(CFG.colsApp[k]));
      if (j < 0) { j = cab.length + nuevos.length; nuevos.push(CFG.colsApp[k]); }
      C[k] = j;
    });
    if (nuevos.length) {
      const j0 = cab.length;
      await escribir(CFG.hojas.calendario, letra(calO.col0 + j0) + calO.fila0 + ':' + letra(calO.col0 + j0 + nuevos.length - 1) + calO.fila0, [nuevos]);
      r.values.forEach((fila, i) => { while (fila.length < j0 + nuevos.length) fila.push(i === 0 ? nuevos[fila.length - j0] : ''); });
    }
    const faltan = Object.keys(CFG.colsPlan).filter((k) => C[k] < 0 && ['fecha', 'canal'].indexOf(k) >= 0);
    if (faltan.length) throw new Error('El Excel no tiene las columnas ' + faltan.map((k) => '«' + CFG.colsPlan[k] + '»').join(', ') + ' en la hoja «' + CFG.hojas.calendario + '».');
  }
  const col = (k) => letra(calO.col0 + C[k]);
  // IDs (GPA-0001…) y estado «Planeada» para las filas que no los tienen
  async function asegurarIds(r) {
    const n = r.values.length - 1; if (n < 1) return;
    let max = 0; r.values.slice(1).forEach((v) => { const m = s(v[C.id]).match(/(\d+)$/); if (m) max = Math.max(max, +m[1]); });
    let cambio = false;
    const ids = r.values.slice(1).map((v) => { if (s(v[C.id]) || !s(v[C.canal])) return [v[C.id]]; cambio = true; v[C.id] = CFG.prefijoId + String(++max).padStart(4, '0'); return [v[C.id]]; });
    const est = r.values.slice(1).map((v) => { if (s(v[C.estado]) || !s(v[C.canal])) return [v[C.estado]]; cambio = true; v[C.estado] = 'Planeada'; return [v[C.estado]]; });
    if (!cambio) return;
    const f1 = calO.fila0 + 1, f2 = calO.fila0 + n;
    await escribir(CFG.hojas.calendario, col('id') + f1 + ':' + col('id') + f2, ids);
    await escribir(CFG.hojas.calendario, col('estado') + f1 + ':' + col('estado') + f2, est);
  }
  function aPub(v, fila) {
    const g = (k) => (C[k] >= 0 ? v[C[k]] : '');
    let diseno = null; try { diseno = s(g('diseno')) ? JSON.parse(s(g('diseno'))) : null; } catch (e) { diseno = null; }
    return {
      fila, id: s(g('id')), semana: serialAIso(g('semana')), semanaPlan: s(g('semanaPlan')), fecha: serialAIso(g('fecha')), dia: s(g('dia')), canal: s(g('canal')), formato: s(g('formato')),
      etapa: s(g('etapa')), gancho: s(g('gancho')), texto: s(g('texto')), cta: s(g('cta')), direccion: s(g('direccion')), recurso: s(g('recurso')), enlaceRecurso: s(g('enlaceRecurso')),
      pagina: s(g('pagina')), enlacePagina: s(g('enlacePagina')), indicador: s(g('indicador')), estado: s(g('estado')) || 'Planeada', copyFinal: s(g('copyFinal')), diseno, link: s(g('link')), notas: s(g('notas'))
    };
  }

  async function cargar() {
    sid = sid || await G.sitio(CFG.sitio.host, CFG.sitio.ruta);
    const H = CFG.hojas;
    const [cal, est, pm, rec, lin, cam, met, lea, pau] = await Promise.all([H.calendario, H.estrategia, H.plan, H.recursos, H.lineas, H.campana, H.metricas, H.leads, H.pauta].map(rango));
    if (!cal || !cal.values || cal.values.length < 2) throw new Error('No encontré la hoja «' + H.calendario + '» con publicaciones en el Excel.');
    calO = origen(cal);
    await asegurarColumnas(cal);
    await asegurarIds(cal);
    App.pubs = cal.values.slice(1).map((v, i) => aPub(v, calO.fila0 + 1 + i)).filter((p) => p.canal && p.fecha);
    // Semana del plan = lunes de inicio (si falta, el lunes de la fecha)
    App.pubs.forEach((p) => { if (!p.semana) p.semana = lunesDe(p.fecha); });
    const semanas = Array.from(new Set(App.pubs.map((p) => p.semana))).sort();
    const estr = tabla(est);
    App.estrategia = {}; semanas.forEach((l, i) => { if (estr[i]) App.estrategia[l] = { ciclo: s(estr[i]['Ciclo']), semana: s(estr[i]['Semana']), tema: s(estr[i]['Tema de la semana']), objetivo: s(estr[i]['Objetivo de comunicación']), angulos: s(estr[i]['Preguntas / ángulos sugeridos']), cta: s(estr[i]['CTA recomendado']), n: i + 1 }; });
    App.planMes = tabla(pm).map((x) => ({ ciclo: s(x['Ciclo']), periodo: s(x['Periodo']), tema: s(x['Tema central']), objetivo: s(x['Objetivo estratégico']), oferta: s(x['Oferta / campaña prioritaria']), audiencia: s(x['Audiencia principal']), conversion: s(x['Enfoque de conversión']) }));
    App.recursos = tabla(rec).map((x) => ({ recurso: s(x['Recurso']), tipo: s(x['Tipo / uso correcto']), enlace: s(x['Enlace']), cuando: s(x['Cuándo utilizarlo']), precaucion: s(x['Precaución']) }));
    App.lineas = tabla(lin);
    App.campana = tabla(cam).map((x) => ({ k: s(x['Elemento']), v: s(x['Recomendación']) }));
    App.met = tabla(met); App.leads = tabla(lea); App.pauta = tabla(pau);
    App.semanas = semanas;
  }
  const lunesDe = (iso) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };

  // ---------- Escrituras ----------
  const FECHAS = ['fecha', 'semana'];
  async function guardarPub(p, campos) {
    for (const k of Object.keys(campos)) {
      if (C[k] === undefined || C[k] < 0) continue;
      let v = campos[k];
      if (k === 'diseno') v = v ? JSON.stringify(v) : '';
      const dir = col(k) + p.fila;
      if (FECHAS.indexOf(k) >= 0) { await escribir(CFG.hojas.calendario, dir, [[v ? isoASerial(v) : '']]); if (v) await formato(CFG.hojas.calendario, dir, [[CFG.formatoFecha]]); }
      else await escribir(CFG.hojas.calendario, dir, [[tx(v)]]);
      p[k] = campos[k];
    }
  }
  // Agrega una fila al final de una hoja de la app (la crea con sus encabezados si no existe)
  async function asegurarHoja(nombre, cab) {
    let r = await rango(nombre);
    if (!r) {
      await G.llamar('POST', libro() + '/workbook/worksheets/add', { name: nombre });
      await escribir(nombre, 'A1:' + letra(cab.length - 1) + '1', [cab]);
      try { await G.llamar('PATCH', libro() + hoja(nombre) + "/range(address='A1:" + letra(cab.length - 1) + "1')/format/font", { bold: true }); } catch (e) { /* formato opcional */ }
      r = { address: nombre + '!A1:' + letra(cab.length - 1) + '1', values: [cab] };
    }
    return r;
  }
  async function agregar(nombre, cab, obj) {
    const r = await asegurarHoja(nombre, cab), o = origen(r);
    let cols = r.values[0].map(s);
    const faltan = cab.filter((c) => cols.indexOf(c) < 0);
    if (faltan.length) { await escribir(nombre, letra(o.col0 + cols.length) + o.fila0 + ':' + letra(o.col0 + cols.length + faltan.length - 1) + o.fila0, [faltan]); cols = cols.concat(faltan); }
    const fila = o.fila0 + r.values.length;
    const v = cols.map((c) => { const x = obj[c]; return x instanceof Date || (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && /fecha|corte|semana|reuni/i.test(c)) ? isoASerial(serialAIso(x)) : (typeof x === 'number' ? x : tx(x == null ? '' : x)); });
    await escribir(nombre, letra(o.col0) + fila + ':' + letra(o.col0 + cols.length - 1) + fila, [v]);
    cols.forEach((c, j) => { if (/fecha|corte|semana|reuni/i.test(c) && obj[c]) formato(nombre, letra(o.col0 + j) + fila, [[CFG.formatoFecha]]).catch(() => {}); });
    return Object.assign({ _fila: fila }, obj);
  }
  // Varias filas de una vez (importación de métricas)
  async function agregarVarias(nombre, cab, objs) {
    if (!objs.length) return [];
    const r = await asegurarHoja(nombre, cab), o = origen(r);
    let cols = r.values[0].map(s);
    const faltan = cab.filter((c) => cols.indexOf(c) < 0);
    if (faltan.length) { await escribir(nombre, letra(o.col0 + cols.length) + o.fila0 + ':' + letra(o.col0 + cols.length + faltan.length - 1) + o.fila0, [faltan]); cols = cols.concat(faltan); }
    const f1 = o.fila0 + r.values.length, esF = (c) => /fecha|corte|semana|reuni/i.test(c);
    const vals = objs.map((obj) => cols.map((c) => { const x = obj[c]; return esF(c) && x && /^\d{4}-\d{2}-\d{2}$/.test(String(x)) ? isoASerial(x) : (typeof x === 'number' ? x : tx(x == null ? '' : x)); }));
    for (let i = 0; i < vals.length; i += 200) {
      const parte = vals.slice(i, i + 200), a = f1 + i, b = a + parte.length - 1;
      await escribir(nombre, letra(o.col0) + a + ':' + letra(o.col0 + cols.length - 1) + b, parte);
    }
    cols.forEach((c, j) => { if (esF(c)) formato(nombre, letra(o.col0 + j) + f1 + ':' + letra(o.col0 + j) + (f1 + vals.length - 1), vals.map(() => [CFG.formatoFecha])).catch(() => {}); });
    return objs.map((obj, i) => Object.assign({ _fila: f1 + i }, obj));
  }
  async function actualizarFila(nombre, cab, x, campos) {
    const r = await rango(nombre); if (!r) return; const o = origen(r), cols = r.values[0].map(s);
    for (const k of Object.keys(campos)) {
      const j = cols.indexOf(k); if (j < 0) continue; const v = campos[k];
      await escribir(nombre, letra(o.col0 + j) + x._fila, [[/fecha|corte|semana|reuni/i.test(k) && /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? isoASerial(v) : tx(v)]]);
      x[k] = v;
    }
  }
  async function borrarFila(nombre, x) {
    const r = await rango(nombre); if (!r) return; const o = origen(r), n = r.values[0].length;
    await G.llamar('POST', libro() + hoja(nombre) + "/range(address='" + letra(o.col0) + x._fila + ':' + letra(o.col0 + n - 1) + x._fila + "')/delete", { shift: 'Up' });
  }

  return { cargar, guardarPub, agregar, agregarVarias, actualizarFila, borrarFila, item: (r) => item(r), sitio: () => sid, serialAIso, isoASerial, lunesDe, letra };
})();
