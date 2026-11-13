/* =====================================================================
   APP-114 · Proyectos — Administración (#admin)
   - Biblioteca de plantillas: importa la «Biblioteca Maestra Gantt» (Excel) a PRY_Plantillas / PRY_PlantillaTareas,
     corrigiendo al importar: predecesoras con la numeración vieja del Planeador 2601 (TA-n = fila n),
     filas de encabezado repetidas, fases sin registro propio, responsables escritos de varias formas
     y marca de tareas comunes (para no duplicarlas al combinar plantillas).
   - Publicar / retirar versiones (la publicación queda como aprobación).
   - Accesos a la app (SYS_Accesos, APP-114): Administrador, Líder de proyecto, Consulta.
   ===================================================================== */
(function () {
  const U = IC.ui, G = IC.graph, esc = U.esc;
  const ROLES = [['ADMIN', 'Administrador'], ['EDITOR', 'Líder de proyecto'], ['CONSULTA', 'Consulta']];

  function cargarXLSX() {
    if (window.XLSX) return Promise.resolve();
    return new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar la librería de Excel. Revise la conexión.')); document.head.appendChild(s); });
  }
  const txt = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  const si = (v) => /^s[ií]/i.test(txt(v)) ? 'Sí' : txt(v) ? 'No' : '';
  function organizacion(v) {
    const t = U.norm(txt(v));
    if (!t || /responsable org/.test(t)) return '';
    const ic = /\bic\b/.test(t), cl = /cliente/.test(t);
    if (ic && cl) return 'IC + Cliente';
    if (/fabricante/.test(t)) return 'Fabricante';
    if (cl) return 'Cliente';
    if (ic) return 'IC';
    if (/tercer|proveedor/.test(t)) return 'Tercero';
    return txt(v);
  }
  const comunDe = (r) => (r.tipo === 'Tarea' || r.tipo === 'Hito') ? ((CFG.comunes.find((c) => c.re.test(r.actividad)) || {}).clave || '') : '';

  // ---------- Lectura y corrección de la Biblioteca Maestra ----------
  function leerBiblioteca(wb) {
    const cat = {};
    if (wb.Sheets['01_Catalogo']) XLSX.utils.sheet_to_json(wb.Sheets['01_Catalogo'], { header: 1, defval: '' }).slice(1)
      .forEach((r) => { if (/^GNT-\d{3}$/.test(txt(r[0]))) cat[txt(r[0])] = { nombre: txt(r[1]), version: txt(r[2]) || '1.0', validacion: txt(r[3]) }; });
    const out = [];
    wb.SheetNames.filter((n) => /^GNT-\d{3}$/.test(n)).forEach((hoja) => {
      const filas = XLSX.utils.sheet_to_json(wb.Sheets[hoja], { header: 1, defval: '' }).slice(1);
      const notas = { descartadas: 0, predCorregidas: 0, predSinResolver: [], fasesCreadas: 0 };
      // Filas de datos en su orden original (la numeración vieja TA-n cuenta filas de datos desde 1)
      const datos = filas.filter((r) => txt(r[4]));
      let regs = [];
      datos.forEach((r) => {
        const id = txt(r[4]), tipo = txt(r[8]);
        if (/-ID$/.test(id) || /^tipo( registro)?$/i.test(tipo)) { notas.descartadas++; return; }    // encabezado repetido dentro de los datos
        const dur = txt(r[10]) === '' || isNaN(Number(r[10])) ? null : Number(r[10]);
        regs.push({ id_registro: id, id_padre: txt(r[5]), fase: txt(r[6]), actividad: txt(r[7]), tipo: CFG.tipos.indexOf(tipo) >= 0 ? tipo : (tipo ? 'Tarea' : 'Tarea'),
          descripcion: txt(r[9]), duracion: tipo === 'Fase' ? null : dur, predecesoras: txt(r[11]), organizacion: organizacion(r[12]), rol: txt(r[13]) || (/administrativo/i.test(txt(r[12])) ? 'IC Administrativo' : ''),
          criterio: txt(r[14]), aplica: si(r[15]) || 'Sí', condicion: txt(r[16]), obligatoria: si(r[17]) || 'No', fuente: txt(r[18]), validacion: txt(r[3]) });
      });
      const ids = new Set(regs.map((x) => x.id_registro));
      const pref = (regs.find((x) => x.tipo !== 'Fase') || regs[0] || { id_registro: '' }).id_registro.split('-')[0];
      // Predecesoras: TA-n (numeración del Planeador) → ID de la fila n de datos
      regs.forEach((x) => {
        x.predecesoras = x.predecesoras.split(/[;,\s]+/).filter(Boolean).map((p) => {
          if (ids.has(p)) return p;
          const m = p.match(/^([A-Z]+)-(\d+)$/);
          if (m && m[1] === pref) { const fila = datos[Number(m[2]) - 1]; if (fila && ids.has(txt(fila[4])) && txt(fila[4]) !== x.id_registro) { notas.predCorregidas++; return txt(fila[4]); } }
          notas.predSinResolver.push(x.id_registro + ' → ' + p); return null;
        }).filter(Boolean).join(';');
      });
      // Plantillas sin registros de fase: se crean las fases desde «Fase / grupo»
      if (!regs.some((x) => x.tipo === 'Fase')) {
        const fases = [];
        regs.forEach((x) => { if (x.fase && fases.indexOf(x.fase) < 0) fases.push(x.fase); });
        const nuevas = [];
        fases.forEach((f, i) => {
          const idf = pref + '-F' + (i + 1);
          nuevas.push({ id_registro: idf, id_padre: '', fase: f, actividad: f, tipo: 'Fase', descripcion: 'Agrupador de actividades', duracion: null, predecesoras: '', organizacion: '', rol: '', criterio: '', aplica: 'Sí', condicion: '', obligatoria: 'No', fuente: 'Fase creada al importar', validacion: '' });
          regs.filter((x) => x.fase === f).forEach((x) => { x.id_padre = idf; nuevas.push(x); });
          notas.fasesCreadas++;
        });
        regs = nuevas;
      }
      regs.forEach((x, i) => { x.orden = i + 1; x.comun = comunDe(x); x.estimada = /propuesta|estimar|pendiente|validar/i.test(x.validacion) || x.duracion == null ? 'Sí' : 'No'; });
      const errores = PRY.validarDependencias(regs.map((x) => ({ tarea_id: x.id_registro, predecesoras: x.predecesoras })));
      const c = cat[hoja] || {};
      out.push({ codigo: hoja, nombre: c.nombre || hoja, version: c.version || txt((filas[0] || [])[2]) || '1.0', validacion: c.validacion || '', regs, notas, errores });
    });
    return out;
  }

  // ---------- Vista ----------
  App.vistas.admin = async function (c) {
    if (!App.esAdmin()) { location.hash = ''; return; }
    c.innerHTML = '<a class="ic-volver" href="#">← Portafolio</a><h1 class="ic-titulo">Administración</h1>' +
      '<p class="ic-subtitulo">Biblioteca de plantillas GNT y accesos a la app. Los proyectos copian las tareas de la plantilla: cambiar la biblioteca no altera proyectos ya creados.</p>' +
      '<section class="ic-bloque"><div class="cab"><h2>Biblioteca de plantillas</h2><span class="espacio"></span><button class="ic-btn" id="bImp">Importar Biblioteca Maestra (Excel)</button><input type="file" id="fImp" accept=".xlsx" hidden></div><div class="cuerpo" id="pl"><div class="ic-vacio">Cargando…</div></div></section>' +
      '<section class="ic-bloque"><div class="cab"><h2>Accesos a Proyectos</h2><span class="espacio"></span><button class="ic-btn sec" id="bAcc">+ Dar acceso</button></div><div class="cuerpo" id="acc"><div class="ic-vacio">Cargando…</div></div>' +
      '<p class="pry-nota" style="padding:0 16px 14px">Los técnicos no necesitan acceso: ven los proyectos donde tienen tareas asignadas. Aprueban (basta uno): ' + CFG.aprobadores.map((a) => esc(a.nombre + ' (' + a.cargo + ')')).join(' o ') + '.</p></section>';
    c.querySelector('#bImp').onclick = () => c.querySelector('#fImp').click();
    c.querySelector('#fImp').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) importar(f, () => pintarPlantillas(c)); };
    c.querySelector('#bAcc').onclick = () => formAcceso(null, () => pintarAccesos(c));
    pintarPlantillas(c); pintarAccesos(c);
  };

  async function pintarPlantillas(c) {
    const caja = c.querySelector('#pl');
    try { await PRY.cargarPlantillas(); } catch (e) { caja.innerHTML = '<div class="ic-alerta">' + esc(U.mensajeError(e)) + '</div>'; return; }
    const L = PRY.D.plantillas.slice().sort((a, b) => a.codigo.localeCompare(b.codigo) || Number(b.version) - Number(a.version));
    caja.innerHTML = L.length ? '<table class="ic-tabla"><thead><tr><th>Código</th><th>Plantilla</th><th>Versión</th><th>Estado</th><th class="num">Registros</th><th>Aprobación</th><th></th></tr></thead><tbody>' +
      L.map((p) => '<tr><td><b>' + esc(p.codigo) + '</b></td><td>' + esc(p.nombre) + '</td><td>' + esc(p.version) + '</td><td>' + estadoPl(p.estado) + '</td><td class="num">' + esc(p.registros || '') + '</td>' +
        '<td class="sec">' + esc(p.aprobador ? p.aprobador + ' · ' + PRY.textoFecha(PRY.dia(p.fecha_aprobacion), true) : '—') + '</td>' +
        '<td style="white-space:nowrap"><button class="ic-btn sec chico" data-ver="' + esc(p.Title) + '">Ver</button> ' +
        (p.estado !== 'PUBLICADA' ? '<button class="ic-btn chico" data-pub="' + esc(p.Title) + '">Publicar</button> ' : '') +
        '<button class="ic-btn sec chico" data-ret="' + esc(p.Title) + '">Retirar</button></td></tr>').join('') + '</tbody></table>' +
      '<p class="pry-nota" style="padding:10px 16px">«En validación» se puede usar en proyectos; al aprobar la versión, publíquela (queda registrada la aprobación). Las duraciones son referencias, no compromisos.</p>'
      : '<div class="ic-vacio">La biblioteca está vacía. Importe el Excel «IC_Biblioteca_Maestra_Gantt».</div>';
    caja.querySelectorAll('[data-ver]').forEach((b) => { b.onclick = () => verPlantilla(PRY.D.plantillas.find((p) => p.Title === b.dataset.ver)); });
    caja.querySelectorAll('[data-pub]').forEach((b) => { b.onclick = () => publicar(PRY.D.plantillas.find((p) => p.Title === b.dataset.pub), () => pintarPlantillas(c)); });
    caja.querySelectorAll('[data-ret]').forEach((b) => { b.onclick = async () => {
      const p = PRY.D.plantillas.find((x) => x.Title === b.dataset.ret);
      if (!(await U.confirmar('Retirar ' + p.codigo + ' v' + p.version, 'Deja de ofrecerse al crear proyectos. Los proyectos que ya la usan no cambian.', 'Retirar', true))) return;
      try { await G.actualizar('PRY_Plantillas', p._id, { estado: 'RETIRADA' }); U.aviso('Plantilla retirada', 'ok'); pintarPlantillas(c); } catch (e) { U.aviso(U.mensajeError(e), 'err'); }
    }; });
  }
  const estadoPl = (e) => '<span class="pry-tag ' + ({ PUBLICADA: 'verde', EN_VALIDACION: 'dorado', BORRADOR: 'gris', RETIRADA: 'gris' }[e] || 'gris') + '">' + esc({ PUBLICADA: 'Publicada', EN_VALIDACION: 'En validación', BORRADOR: 'Borrador', RETIRADA: 'Retirada' }[e] || e || '—') + '</span>';

  async function verPlantilla(p) {
    U.modal(p.codigo + ' v' + p.version + ' · ' + p.nombre, '<div class="ic-form"><div id="vr"><div class="ic-vacio">Cargando…</div></div><div class="ic-acciones"><button class="ic-btn" id="vC">Cerrar</button></div></div>', async (cu) => {
      cu.querySelector('#vC').onclick = U.cerrarModal;
      const r = await PRY.registrosDe(p.codigo, p.version);
      cu.querySelector('#vr').innerHTML = '<div class="pry-scroll" style="max-height:60vh"><table class="ic-tabla pry-mini"><thead><tr><th>ID</th><th>Actividad</th><th>Tipo</th><th class="num">Días</th><th>Predecesoras</th><th>Organización</th><th>Común</th></tr></thead><tbody>' +
        r.map((x) => '<tr class="' + (x.tipo === 'Fase' ? 'pry-fase' : '') + '"><td>' + esc(x.id_registro) + '</td><td>' + esc(x.actividad) + '</td><td>' + esc(x.tipo) + '</td><td class="num">' + esc(x.duracion == null ? '' : x.duracion) + (x.estimada === 'Sí' && x.tipo !== 'Fase' ? '<span class="sec">ref.</span>' : '') + '</td><td>' + esc(x.predecesoras || '') + '</td><td>' + esc(x.organizacion || '') + '</td><td>' + esc(x.comun || '') + '</td></tr>').join('') + '</tbody></table></div>';
    });
  }

  async function publicar(p, alFin) {
    const yo = CFG.aprobadores.find((a) => a.email === App.usuario.email);
    U.modal('Publicar ' + p.codigo + ' v' + p.version, '<form class="ic-form" id="fP"><p style="margin-top:0">La versión publicada es la que se ofrece por defecto al crear proyectos. Basta la aprobación de una de estas personas.</p><div class="ic-campos">' +
      U.campo({ name: 'aprobador', label: 'Aprobó', t: 'select', op: CFG.aprobadores.map((a) => [a.email, a.nombre + ' · ' + a.cargo]), valor: yo ? yo.email : '', req: true, c: 'c6' }) +
      U.campo({ name: 'evidencia', label: 'Evidencia (si aprobó otra persona: correo, acta…)', valor: '', c: 'c6' }) +
      U.campo({ name: 'comentarios', label: 'Comentarios', t: 'textarea', filas: 2, c: 'c12' }) + '</div>' +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="pNo">Cancelar</button><button class="ic-btn" id="pOk">Publicar</button></div></form>', (cu) => {
      const f = cu.querySelector('#fP'); cu.querySelector('#pNo').onclick = U.cerrarModal;
      f.onsubmit = async (e) => {
        e.preventDefault(); const v = U.leerForm(f), a = CFG.aprobadores.find((x) => x.email === v.aprobador), err = {};
        if (!a) err.aprobador = 'Elija quién aprobó';
        if (a && a.email !== App.usuario.email && !v.evidencia) err.evidencia = 'Registre la evidencia de la aprobación';
        if (!U.marcarErrores(f, err)) return;
        try {
          await U.conCarga(cu.querySelector('#pOk'), async () => {
            const n = await G.reservar('PRYA', 1);
            await G.crear('PRY_Aprobaciones', { Title: 'APR-' + PRY.pad(n, 5), proyecto_id: '', objeto: 'PLANTILLA', objeto_id: p.Title, aprobador: a.nombre, cargo: a.cargo, fecha_hora: new Date().toISOString(), decision: 'Aprobado', comentarios: v.comentarios, evidencia: v.evidencia, registrado_por: App.usuario.nombre });
            // Solo una versión publicada por código: las demás publicadas vuelven a «en validación»
            for (const o of PRY.D.plantillas.filter((x) => x.codigo === p.codigo && x.Title !== p.Title && x.estado === 'PUBLICADA')) await G.actualizar('PRY_Plantillas', o._id, { estado: 'EN_VALIDACION' });
            await G.actualizar('PRY_Plantillas', p._id, { estado: 'PUBLICADA', aprobador: a.nombre, fecha_aprobacion: PRY.hoy() });
          });
          U.cerrarModal(); U.aviso('Plantilla publicada', 'ok'); alFin();
        } catch (e2) { U.aviso(U.mensajeError(e2), 'err', 8000); }
      };
    });
  }

  // ---------- Importar ----------
  async function importar(file, alFin) {
    let lib;
    try { await cargarXLSX(); lib = leerBiblioteca(XLSX.read(await file.arrayBuffer(), { type: 'array' })); }
    catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); return; }
    if (!lib.length) { U.aviso('El archivo no tiene hojas GNT-001…GNT-005.', 'warn'); return; }
    await PRY.cargarPlantillas();
    const existe = (p) => PRY.D.plantillas.find((x) => x.Title === p.codigo + '@' + p.version);
    U.modal('Importar Biblioteca Maestra', '<div class="ic-form"><p style="margin-top:0">Revise lo que se va a importar. Las correcciones se hacen solo en la app; el Excel no se modifica.</p>' +
      '<table class="ic-tabla pry-mini"><thead><tr><th></th><th>Plantilla</th><th>Versión</th><th class="num">Registros</th><th>Correcciones al importar</th><th>Validación</th></tr></thead><tbody>' +
      lib.map((p, i) => { const n = p.notas, ex = existe(p);
        const corr = [n.predCorregidas ? n.predCorregidas + ' predecesoras convertidas (numeración del Planeador)' : '', n.descartadas ? n.descartadas + ' fila(s) de encabezado repetida descartada(s)' : '', n.fasesCreadas ? n.fasesCreadas + ' fases creadas desde «Fase / grupo»' : '',
          n.predSinResolver.length ? '<span class="err">' + n.predSinResolver.length + ' predecesora(s) sin resolver: ' + esc(n.predSinResolver.slice(0, 4).join(', ')) + '</span>' : '', p.regs.filter((x) => x.comun).length ? p.regs.filter((x) => x.comun).length + ' tareas comunes marcadas' : ''].filter(Boolean).join('<br>') || 'Ninguna';
        return '<tr><td><input type="checkbox" data-i="' + i + '"' + (p.errores.length ? '' : ' checked') + '></td><td><b>' + esc(p.codigo) + '</b> ' + esc(p.nombre) + (ex ? '<span class="sec">Ya existe esta versión: se reemplaza</span>' : '') + '</td><td>' + esc(p.version) + '</td><td class="num">' + p.regs.length + '</td><td style="font-size:12.5px">' + corr + '</td><td>' +
          (p.errores.length ? '<span class="err">' + esc(p.errores.join('; ')) + '</span>' : '<span class="pry-tag verde">Dependencias OK</span>') + '</td></tr>'; }).join('') +
      '</tbody></table><p class="pry-nota">Se importan como «En validación»: se pueden usar en proyectos y se publican cuando estén aprobadas.</p>' +
      '<div class="ic-acciones"><span id="iEst" class="pry-nota" style="margin-right:auto"></span><button class="ic-btn sec" id="iNo">Cancelar</button><button class="ic-btn" id="iOk">Importar</button></div></div>', (cu) => {
      cu.querySelector('#iNo').onclick = U.cerrarModal;
      cu.querySelector('#iOk').onclick = async (ev) => {
        const b = ev.currentTarget, sel = Array.from(cu.querySelectorAll('[data-i]')).filter((x) => x.checked).map((x) => lib[+x.dataset.i]);
        if (!sel.length) { U.aviso('Marque al menos una plantilla.', 'warn'); return; }
        b.disabled = true; cu.querySelector('#iNo').disabled = true;
        const est = cu.querySelector('#iEst');
        try {
          for (const p of sel) {
            const key = p.codigo + '@' + p.version, ex = existe(p);
            if (ex) {
              est.textContent = p.codigo + ': quitando la versión anterior…';
              const viejos = await G.items('PRY_PlantillaTareas', { filtro: "fields/plantilla eq '" + p.codigo + "' and fields/version eq '" + p.version + "'", top: 999 });
              await PRY.enParalelo(viejos, 4, (x) => G.eliminar('PRY_PlantillaTareas', x._id));
              await G.actualizar('PRY_Plantillas', ex._id, { nombre: p.nombre, registros: p.regs.length, estado: ex.estado === 'PUBLICADA' ? 'EN_VALIDACION' : (ex.estado || 'EN_VALIDACION'), notas: p.validacion });
            } else {
              await G.crear('PRY_Plantillas', { Title: key, codigo: p.codigo, nombre: p.nombre, version: p.version, estado: 'EN_VALIDACION', registros: p.regs.length, notas: p.validacion });
            }
            await PRY.enParalelo(p.regs, 4, (x) => {
              const f = { Title: key + '#' + x.id_registro, plantilla: p.codigo, version: p.version };
              ['id_registro', 'id_padre', 'fase', 'actividad', 'tipo', 'descripcion', 'predecesoras', 'organizacion', 'rol', 'criterio', 'aplica', 'condicion', 'obligatoria', 'comun', 'estimada', 'fuente'].forEach((k) => { if (x[k] !== '' && x[k] != null) f[k] = String(x[k]).slice(0, k === 'descripcion' || k === 'criterio' || k === 'condicion' || k === 'fuente' ? 4000 : 255); });
              f.orden = x.orden; if (x.duracion != null) f.duracion = x.duracion;
              return G.crear('PRY_PlantillaTareas', f);
            }, (h, t) => { est.textContent = p.codigo + ': ' + h + ' de ' + t + ' registros…'; });
          }
          U.cerrarModal(); U.aviso(sel.length + ' plantilla(s) importada(s).', 'ok', 6000); alFin();
        } catch (e) { U.aviso(/PRY_/.test(e.message) && /existe/i.test(e.message) ? 'Faltan las listas de Proyectos: abra el instalador y dé clic en «Crear estructura».' : U.mensajeError(e), 'err', 9000); b.disabled = false; cu.querySelector('#iNo').disabled = false; }
      };
    });
  }

  // ---------- Accesos ----------
  async function pintarAccesos(c) {
    const caja = c.querySelector('#acc');
    let acc = [];
    try { acc = (await G.items('SYS_Accesos')).filter((a) => a.app_id === CFG.app.id); } catch (e) { caja.innerHTML = '<div class="ic-alerta">' + esc(U.mensajeError(e)) + '</div>'; return; }
    caja.innerHTML = acc.length ? '<table class="ic-tabla"><thead><tr><th>Persona</th><th>Correo</th><th>Rol</th><th>Estado</th></tr></thead><tbody>' +
      acc.map((a) => '<tr data-id="' + esc(a.Title) + '" class="' + (a.estado === 'INACTIVO' ? 'inactivo' : '') + '"><td><b>' + esc(a.nombre || '') + '</b></td><td>' + esc(a.email) + '</td><td>' + esc((ROLES.find((r) => r[0] === a.rol) || [0, a.rol])[1]) + '</td><td>' + (a.estado === 'INACTIVO' ? 'Inactivo' : 'Activo') + '</td></tr>').join('') + '</tbody></table>'
      : '<div class="ic-vacio">Nadie tiene acceso registrado todavía (usted entra como administrador).</div>';
    caja.querySelectorAll('tr[data-id]').forEach((tr) => { tr.onclick = () => formAcceso(acc.find((a) => a.Title === tr.dataset.id), () => pintarAccesos(c)); });
  }
  function formAcceso(a, alFin) {
    const nuevo = !a; a = a || { rol: 'EDITOR', estado: 'ACTIVO' };
    U.modal(nuevo ? 'Dar acceso a Proyectos' : 'Acceso de ' + a.nombre, '<form class="ic-form" id="fA"><div class="ic-campos">' +
      (nuevo ? U.campo({ name: 'email', label: 'Persona', t: 'select', op: PRY.D.personas.map((p) => [p.email, p.nombre + ' · ' + p.email]), req: true, c: 'c12' }) : '') +
      U.campo({ name: 'rol', label: 'Rol', t: 'select', op: ROLES, valor: a.rol, vacio: false, c: 'c6' }) +
      U.campo({ name: 'estado', label: 'Estado', t: 'select', op: [['ACTIVO', 'Activo'], ['INACTIVO', 'Inactivo']], valor: a.estado, vacio: false, c: 'c6' }) + '</div>' +
      '<p class="pry-nota">Líder de proyecto: crea proyectos y administra los suyos. Consulta: ve todos sin editar (p. ej. Gerencia o Comercial).</p>' +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="aNo">Cancelar</button><button class="ic-btn" id="aOk">Guardar</button></div></form>', (cu) => {
      const f = cu.querySelector('#fA'); cu.querySelector('#aNo').onclick = U.cerrarModal;
      f.onsubmit = async (e) => {
        e.preventDefault(); const v = U.leerForm(f);
        if (nuevo && !v.email) { U.marcarErrores(f, { email: 'Elija la persona' }); return; }
        try {
          await U.conCarga(cu.querySelector('#aOk'), async () => {
            if (nuevo) { const p = PRY.persona(v.email), n = await G.reservar('ACC', 1); await G.crear('SYS_Accesos', { Title: 'ACC-' + PRY.pad(n, 4), email: v.email, nombre: p ? p.nombre : v.email, app_id: CFG.app.id, rol: v.rol, estado: v.estado }); }
            else await G.actualizar('SYS_Accesos', a._id, { rol: v.rol, estado: v.estado });
          });
          U.cerrarModal(); U.aviso('Acceso guardado', 'ok'); alFin();
        } catch (e2) { U.aviso(U.mensajeError(e2), 'err', 8000); }
      };
    });
  }

  App.leerBiblioteca = leerBiblioteca;   // para pruebas
})();
