/* =====================================================================
   Reflexiones Estratégicas — Administración (solo administradores)
   · Administrar accesos: dar / quitar / cambiar rol. Cambia los permisos reales de las listas RE_* en SharePoint.
   · Proteger listas: permisos únicos en RE_* (solo quien tiene acceso) + historial de versiones.
   · Catálogos: libros (códigos) y competencias.
   · Importar la hoja BD del Excel «Reflexiones Estratégicas» (plan inicial) como reflexiones en estado Idea.
   ===================================================================== */
(function () {
  const U = IC.ui, G = IC.graph, esc = U.esc, D = RE.D;
  const param = (i) => decodeURIComponent((location.hash.slice(1).split('/')[i] || ''));
  const TABS = [['', 'Administrar accesos'], ['catalogos', 'Catálogos'], ['importar', 'Importar plan (Excel)']];

  App.vistas.admin = function (c) {
    if (!RE.puede.admin()) { location.hash = ''; return; }
    const tab = param(1);
    c.innerHTML = '<h1 class="ic-titulo">Administración</h1><nav class="re-tabs">' + TABS.map((t) => '<a href="#admin' + (t[0] ? '/' + t[0] : '') + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + '</a>').join('') + '</nav><div id="admC"></div>';
    const z = c.querySelector('#admC');
    if (tab === 'catalogos') return catalogos(z);
    if (tab === 'importar') return importar(z);
    return accesos(z);
  };

  // =====================================================================
  // ACCESOS
  // =====================================================================
  let personas = null;
  async function cargarPersonas() {
    if (personas) return personas;
    personas = [];
    try { (await G.items('OPE_Tecnicos', { top: 999 })).filter((t) => t.email && t.estado !== 'INACTIVO').forEach((t) => personas.push({ email: String(t.email).toLowerCase(), nombre: t.nombre })); } catch (e) { /* sin lista del personal */ }
    return personas;
  }
  async function accesos(z) {
    z.innerHTML = '<div class="ic-vacio">Cargando…</div>';
    await Promise.all([RE.cargarAccesos(), cargarPersonas()]);
    let prot = null; try { prot = await RE.estadoProteccion(); } catch (e) { prot = { error: U.mensajeError(e) }; }
    const sinProt = prot && !prot.error ? CFG.listas.filter((l) => prot[l] === false) : [];
    const todas = {}; personas.forEach((p) => { todas[p.email] = { email: p.email, nombre: p.nombre }; });
    D.accesos.forEach((a) => { todas[a.Title] = Object.assign(todas[a.Title] || { email: a.Title, nombre: a.nombre }, { acc: a }); });
    CFG.admins.forEach((e) => { todas[e] = Object.assign(todas[e] || { email: e, nombre: e }, { dueno: true }); });
    const lista = Object.values(todas).sort((a, b) => (b.acc && b.acc.estado === 'ACTIVO' ? 1 : 0) - (a.acc && a.acc.estado === 'ACTIVO' ? 1 : 0) || String(a.nombre).localeCompare(b.nombre));
    z.innerHTML =
      (prot && prot.error ? '<div class="ic-alerta">No se pudo consultar los permisos de SharePoint: ' + esc(prot.error) + '</div>' :
        sinProt.length ? '<div class="ic-alerta"><b>Las listas aún no están protegidas.</b> Mientras tanto heredan los permisos del sitio IC Apps: cualquier miembro del sitio podría leerlas con otras herramientas. ' +
          '<button class="ic-btn chico" id="bProt">Proteger listas ahora</button><div class="re-log" id="logP"></div></div>' :
          '<div class="ic-alerta chica ok">✔ Listas protegidas: solo entran las personas con acceso. Dar o quitar acceso cambia los permisos en SharePoint de inmediato.</div>') +
      '<section class="ic-bloque"><div class="cab"><h2>Personas</h2><span class="espacio"></span><input id="aQ" placeholder="Buscar por nombre o correo" class="re-buscar"></div><div class="cuerpo">' +
      '<div class="ic-tabla-caja"><table class="ic-tabla"><thead><tr><th>Persona</th><th>Acceso</th><th>Concedido / retirado</th><th></th></tr></thead><tbody id="aT"></tbody></table></div>' +
      '<form class="re-agregar" id="fAg"><input name="email" placeholder="otra.persona@ideascontrol.com"><input name="nombre" placeholder="Nombre"><button class="ic-btn sec chico">Agregar a la lista</button></form>' +
      '<p class="re-nota">Roles: ' + CFG.roles.map((r) => '<b>' + r[1] + '</b> — ' + esc(r[2])).join(' · ') + '. Los cambios solo afectan las listas de Reflexiones (RE_*): no tocan otras apps ni el Portal. Nadie puede cambiar su propio acceso. Si a alguien le retiran el acceso, SharePoint le niega los datos desde la siguiente acción.</p></div></section>';
    const T = z.querySelector('#aT');
    function pintar() {
      const q = U.norm(z.querySelector('#aQ').value);
      T.innerHTML = lista.filter((p) => !q || U.norm(p.nombre + ' ' + p.email).indexOf(q) >= 0).map((p) => {
        const a = p.acc, act = a && a.estado === 'ACTIVO', yo = p.email === D.usuario.email;
        return '<tr><td><b>' + esc(p.nombre) + '</b><span class="sec">' + esc(p.email) + '</span></td>' +
          '<td>' + (p.dueno ? '<span class="re-est e-publicada">Administrador (dueño)</span>' : act ? '<span class="re-est e-aprobada">' + esc(RE.nombreRol(a.rol)) + '</span>' : a ? '<span class="re-est e-archivada">Retirado</span>' : '<span class="sec">Sin acceso</span>') + '</td>' +
          '<td class="sec">' + (a ? esc(act ? 'Por ' + (a.otorgado_por || '') + ' · ' + U.fmt.fechaHora(a.fecha_otorgado) : 'Retirado por ' + (a.retirado_por || '') + ' · ' + U.fmt.fechaHora(a.fecha_retiro)) : '') + (a && a.historial ? '<details><summary>Historial</summary><pre>' + esc(a.historial) + '</pre></details>' : '') + '</td>' +
          '<td style="white-space:nowrap">' + (p.dueno || yo ? '<span class="sec">' + (yo ? 'Usted' : 'Configurado en la app') + '</span>' :
            '<select data-rol="' + esc(p.email) + '">' + CFG.roles.map((r) => '<option value="' + r[0] + '"' + ((act ? a.rol : 'EDITOR') === r[0] ? ' selected' : '') + '>' + r[1] + '</option>').join('') + '</select> ' +
            '<button class="ic-btn chico" data-dar="' + esc(p.email) + '">' + (act ? 'Cambiar rol' : 'Dar acceso') + '</button>' + (act ? ' <button class="ic-btn peligro chico" data-quitar="' + esc(p.email) + '">Quitar acceso</button>' : '')) + '</td></tr>';
      }).join('') || '<tr><td colspan="4" class="ic-vacio">Sin resultados</td></tr>';
      T.querySelectorAll('[data-dar]').forEach((b) => { b.onclick = async () => {
        const em = b.dataset.dar, rol = T.querySelector('[data-rol="' + em + '"]').value, p = todas[em];
        if (sinProt.length) { U.aviso('Primero proteja las listas (botón de arriba).', 'warn', 7000); return; }
        if (!(await U.confirmar('Acceso a Reflexiones Estratégicas', p.nombre + ' (' + em + ') quedará como ' + RE.nombreRol(rol) + '.\n\nSe aplica en SharePoint solo sobre las listas de Reflexiones.', 'Confirmar'))) return;
        try { await U.conCarga(b, () => RE.darAcceso(em, p.nombre, rol)); U.aviso('Acceso actualizado', 'ok'); accesos(z); }
        catch (e) { U.aviso(U.mensajeError(e), 'err', 9000); }
      }; });
      T.querySelectorAll('[data-quitar]').forEach((b) => { b.onclick = async () => {
        const em = b.dataset.quitar;
        if (!(await U.confirmar('Quitar acceso', todas[em].nombre + ' ya no podrá entrar ni consultar los datos de Reflexiones. Su acceso a otras apps no cambia.', 'Quitar acceso', true))) return;
        try { await U.conCarga(b, () => RE.quitarAcceso(em)); U.aviso('Acceso retirado', 'ok'); accesos(z); }
        catch (e) { U.aviso(U.mensajeError(e), 'err', 9000); }
      }; });
    }
    z.querySelector('#aQ').oninput = pintar; pintar();
    z.querySelector('#fAg').onsubmit = (e) => {
      e.preventDefault(); const em = e.target.email.value.trim().toLowerCase(), nom = e.target.nombre.value.trim();
      if (!/^[^@\s]+@[^@\s]+$/.test(em) || !em.endsWith(CFG.dominio)) { U.aviso('Escriba un correo ' + CFG.dominio, 'warn'); return; }
      if (!todas[em]) { todas[em] = { email: em, nombre: nom || em }; lista.unshift(todas[em]); }
      e.target.reset(); z.querySelector('#aQ').value = em; pintar();
    };
    const bp = z.querySelector('#bProt');
    if (bp) bp.onclick = async () => {
      if (!(await U.confirmar('Proteger listas', 'Las listas RE_* dejarán de heredar los permisos del sitio. Solo quedarán usted (control total) y las personas a las que dé acceso aquí.\n\nOtros propietarios del sitio IC Apps dejarán de ver estas listas (los administradores de la colección de sitios conservan su acceso).', 'Proteger'))) return;
      const log = z.querySelector('#logP'); bp.disabled = true;
      const L = (t, k) => { log.insertAdjacentHTML('beforeend', '<div class="' + (k || '') + '">' + esc(t) + '</div>'); };
      try { await RE.proteger(L); U.aviso('Listas protegidas', 'ok'); setTimeout(() => accesos(z), 1200); }
      catch (e) { L('Error: ' + U.mensajeError(e), 'err'); bp.disabled = false; }
    };
  }

  // =====================================================================
  // CATÁLOGOS
  // =====================================================================
  function catalogos(z) {
    const usados = (cod) => D.refl.filter((r) => r.libro === cod).length;
    const usosComp = (n) => D.refl.filter((r) => r.competencia === n || RE.lista(r.competencias_sec).indexOf(n) >= 0).length;
    z.innerHTML = '<div class="re-cols"><section class="ic-bloque"><div class="cab"><h2>Libros bíblicos (' + D.libros.length + ')</h2></div><div class="cuerpo"><p class="re-nota">El código del libro forma el código de cada reflexión (RE-XXX-NNN). Solo se puede cambiar mientras el libro no tenga reflexiones.</p>' +
      '<div class="ic-tabla-caja" style="max-height:60vh;overflow:auto"><table class="ic-tabla"><thead><tr><th>#</th><th>Libro</th><th>Código</th><th class="num">Reflexiones</th><th></th></tr></thead><tbody>' +
      D.libros.map((l) => '<tr><td>' + l.orden + '</td><td>' + esc(l.nombre) + '</td><td class="re-cod">' + esc(l.codigo) + '</td><td class="num">' + usados(l.codigo) + '</td><td><button class="ic-btn sec chico" data-lib="' + esc(l.codigo) + '">Editar</button></td></tr>').join('') + '</tbody></table></div></div></section>' +
      '<section class="ic-bloque"><div class="cab"><h2>Dimensiones y competencias</h2><span class="espacio"></span><button class="ic-btn sec chico" id="bNC">+ Competencia</button></div><div class="cuerpo">' +
      D.dims.map((d) => '<h3 class="re-h3">' + esc(d.nombre) + '</h3><p class="re-nota">' + esc(d.descripcion) + '</p><div class="re-comps">' + D.comps.filter((x) => x.dimension === d.id).map((x) => '<button class="re-comp' + (x.activo ? '' : ' off') + '" data-comp="' + esc(x.id) + '" title="' + esc(x.descripcion) + '">' + esc(x.nombre) + ' <small>' + usosComp(x.nombre) + '</small></button>').join('') + '</div>').join('') +
      '<p class="re-nota">Regla: una dimensión principal, una competencia principal y hasta dos secundarias. Una competencia en uso no se renombra (las reflexiones la guardan por nombre); se puede desactivar.</p></div></section></div>';
    z.querySelectorAll('[data-lib]').forEach((b) => { b.onclick = () => {
      const l = D.libros.find((x) => x.codigo === b.dataset.lib), n = usados(l.codigo);
      U.modal('Libro · ' + l.nombre, '<form class="ic-form" id="fL"><div class="ic-campos">' + U.campo({ name: 'nombre', label: 'Nombre', valor: l.nombre, c: 'c6' }) +
        '<div class="ic-campo c3"><label>Código</label><input name="codigo" value="' + esc(l.codigo) + '" maxlength="3"' + (n ? ' readonly title="Tiene reflexiones: el código no cambia"' : '') + '></div>' + U.campo({ name: 'activo', label: 'Activo', t: 'checkbox', valor: l.activo, c: 'c3' }) + '</div>' +
        '<div class="ic-acciones"><button class="ic-btn" id="lOk">Guardar</button></div></form>', (m) => {
        m.querySelector('#fL').onsubmit = async (e) => {
          e.preventDefault(); const v = U.leerForm(e.target); v.codigo = v.codigo.toUpperCase();
          if (!/^[A-Z0-9]{3}$/.test(v.codigo)) { U.marcarErrores(e.target, { codigo: 'Tres letras o números' }); return; }
          if (v.codigo !== l.codigo && D.libros.some((x) => x.codigo === v.codigo)) { U.marcarErrores(e.target, { codigo: 'Ya lo usa otro libro' }); return; }
          try { await U.conCarga(m.querySelector('#lOk'), () => G.actualizar('RE_Libros', l._id, { Title: v.codigo, nombre: v.nombre, activo: v.activo })); await RE.cargarCatalogos(); U.cerrarModal(); U.aviso('Libro actualizado', 'ok'); catalogos(z); }
          catch (er) { U.aviso(U.mensajeError(er), 'err'); }
        };
      });
    }; });
    const formComp = (x) => {
      const nuevo = !x, uso = x ? usosComp(x.nombre) : 0;
      U.modal(nuevo ? 'Nueva competencia' : 'Competencia · ' + x.nombre, '<form class="ic-form" id="fCo"><div class="ic-campos">' +
        U.campo({ name: 'dimension', label: 'Dimensión', t: 'select', op: D.dims.map((d) => [d.id, d.nombre]), valor: x ? x.dimension : '', req: true, c: 'c6' }) +
        '<div class="ic-campo c6"><label>Nombre</label><input name="nombre" value="' + esc(x ? x.nombre : '') + '"' + (uso ? ' readonly title="En uso en ' + uso + ' reflexiones"' : '') + '></div>' +
        U.campo({ name: 'descripcion', label: 'Descripción', t: 'textarea', filas: 3, valor: x ? x.descripcion : '', c: 'c12' }) + (x ? U.campo({ name: 'activo', label: 'Activa', t: 'checkbox', valor: x.activo, c: 'c12' }) : '') + '</div>' +
        '<div class="ic-acciones"><button class="ic-btn" id="coOk">Guardar</button></div></form>', (m) => {
        m.querySelector('#fCo').onsubmit = async (e) => {
          e.preventDefault(); const v = U.leerForm(e.target);
          if (!v.dimension || !v.nombre) { U.marcarErrores(e.target, !v.dimension ? { dimension: 'Elija' } : { nombre: 'Escriba el nombre' }); return; }
          if (D.comps.some((y) => y !== x && U.norm(y.nombre) === U.norm(v.nombre))) { U.marcarErrores(e.target, { nombre: 'Ya existe' }); return; }
          try {
            await U.conCarga(m.querySelector('#coOk'), async () => {
              if (nuevo) { const n = D.comps.filter((y) => y.dimension === v.dimension).length + 1; await G.crear('RE_Competencias', { Title: v.dimension + '-C' + RE.pad(n, 2) + '-' + Date.now().toString(36), tipo: 'COMPETENCIA', dimension: v.dimension, nombre: v.nombre, descripcion: v.descripcion, orden: n, activo: true }); }
              else await G.actualizar('RE_Competencias', x._id, { dimension: v.dimension, nombre: v.nombre, descripcion: v.descripcion, activo: v.activo });
            });
            await RE.cargarCatalogos(); U.cerrarModal(); U.aviso('Guardado', 'ok'); catalogos(z);
          } catch (er) { U.aviso(U.mensajeError(er), 'err'); }
        };
      });
    };
    z.querySelectorAll('[data-comp]').forEach((b) => { b.onclick = () => formComp(D.comps.find((x) => x.id === b.dataset.comp)); });
    z.querySelector('#bNC').onclick = () => formComp(null);
  }

  // =====================================================================
  // IMPORTAR EL PLAN (hoja BD)
  // =====================================================================
  function cargarXLSX() {
    if (window.XLSX) return Promise.resolve();
    return new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar el lector de Excel.')); document.head.appendChild(s); });
  }
  function leerBD(wb) {
    const ws = wb.Sheets.BD; if (!ws) throw new Error('El archivo no tiene la hoja «BD».');
    const filas = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const iCab = filas.findIndex((r) => r.some((v) => String(v).trim() === 'ID')); if (iCab < 0) throw new Error('No encontré la fila de encabezados (con «ID»).');
    const cab = filas[iCab].map((v) => U.norm(String(v).trim()));
    const col = (n) => cab.indexOf(U.norm(n));
    const C = { id: col('ID'), libro: col('Libro'), cap: col('Cap.'), vers: col('Versículos'), hist: col('Historia'), pers: col('Personaje(s)'), dim: col('Dimensión'), comp: col('Competencia Principal'), sec: col('Competencias Secundarias'), res: col('Resumen') };
    const compN = {}; D.comps.forEach((x) => { compN[U.norm(x.nombre)] = x.nombre; });
    const dimDe = (t) => { const n = U.norm(t).trim(); if (!n) return ''; const d = D.dims.find((x) => U.norm(x.nombre) === n) || D.dims.find((x) => n.length >= 6 && U.norm(x.nombre).indexOf(n) === 0); return d ? d.id : ''; };
    const out = [];
    filas.slice(iCab + 1).forEach((r) => {
      const id = String(r[C.id] || '').trim(); const m = /^RE-([A-Z0-9]{3})-(\d{1,4})$/.exec(id); if (!m) return;
      const cap = (String(r[C.cap]).match(/\d+/) || [''])[0], vs = String(r[C.vers]).match(/(\d+)(?:\s*[-–]\s*(\d+))?/) || [];
      const compO = String(r[C.comp] || '').trim(), secO = String(r[C.sec] || '').split(/[,;]/).map((x) => x.trim()).filter(Boolean);
      const principal = compN[U.norm(compO)] || '', secs = secO.map((x) => compN[U.norm(x)]).filter((x) => x && x !== principal).slice(0, 2);
      const fuera = [compO && !principal ? compO : '', ...secO.filter((x) => !compN[U.norm(x)])].filter(Boolean);
      out.push({ codigo: id, libro: m[1], num: Number(m[2]), capitulo: cap, vers_ini: vs[1] || '', vers_fin: vs[2] || '', titulo: String(r[C.hist] || '').trim(), personajes: String(r[C.pers] || '').trim(),
        dimension: dimDe(r[C.dim]), dimO: String(r[C.dim] || '').trim(), competencia: principal, competencias_sec: secs.join(';'), resumen: String(r[C.res] || '').trim(),
        etiquetas_origen: 'Dimensión: ' + (String(r[C.dim] || '').trim() || '—') + ' · Principal: ' + (compO || '—') + ' · Secundarias: ' + (secO.join(', ') || '—'), fuera });
    });
    return out;
  }
  function importar(z) {
    z.innerHTML = '<section class="ic-bloque"><div class="cab"><h2>Importar el plan inicial (hoja BD)</h2></div><div class="cuerpo">' +
      '<p class="re-nota">Lee la hoja «BD» del Excel «Reflexiones Estratégicas» y crea cada historia como reflexión en estado <b>Idea</b>, conservando su código (RE-GEN-001…). Las nuevas reflexiones de cada libro siguen desde el último número. ' +
      '<b>Importe el plan antes de crear reflexiones nuevas en esos libros</b>, para que los códigos del plan queden con sus historias. ' +
      'La competencia del plan se asigna solo si existe en el catálogo oficial; si no, queda «por clasificar» y la clasificación original se guarda en la ficha para no perderla. Las que ya existen se omiten (se puede repetir sin duplicar).</p>' +
      '<input type="file" id="fBD" accept=".xlsx"><div id="prevBD"></div></div></section>';
    z.querySelector('#fBD').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return; const p = z.querySelector('#prevBD');
      p.innerHTML = '<div class="ic-vacio">Leyendo…</div>';
      let L; try { await cargarXLSX(); L = leerBD(XLSX.read(await f.arrayBuffer(), { type: 'array' })); } catch (er) { p.innerHTML = '<div class="ic-alerta">' + esc(er.message) + '</div>'; return; }
      const ya = new Set(D.refl.map((r) => r.codigo)), nuevas = L.filter((x) => !ya.has(x.codigo));
      const ocupados = L.filter((x) => { const r = D.refl.find((y) => y.codigo === x.codigo); return r && U.norm(r.titulo || '') !== U.norm(x.titulo); });
      const sinLibro = Array.from(new Set(L.filter((x) => !RE.libro(x.libro)).map((x) => x.libro)));
      const porLibro = {}; L.forEach((x) => { porLibro[x.libro] = (porLibro[x.libro] || 0) + 1; });
      const conComp = L.filter((x) => x.competencia).length, sinDim = L.filter((x) => !x.dimension);
      p.innerHTML = '<div class="re-kpis chico"><div><b>' + L.length + '</b><span>historias en BD</span></div><div><b>' + nuevas.length + '</b><span>por importar</span></div><div><b>' + (L.length - nuevas.length) + '</b><span>ya existen</span></div>' +
        '<div><b>' + conComp + '</b><span>con competencia del catálogo</span></div><div><b>' + (L.length - conComp) + '</b><span>por clasificar</span></div></div>' +
        (ocupados.length ? '<div class="ic-alerta">' + ocupados.length + ' códigos del plan ya los usa otra reflexión creada en la app (' + esc(ocupados.slice(0, 6).map((x) => x.codigo).join(', ')) + (ocupados.length > 6 ? '…' : '') + '). Esas historias no se importan: créelas a mano (tendrán otro código).</div>' : '') +
        (sinLibro.length ? '<div class="ic-alerta">Códigos de libro que no están en el catálogo: ' + esc(sinLibro.join(', ')) + '. Esas filas no se importan.</div>' : '') +
        (sinDim.length ? '<div class="ic-alerta chica">' + sinDim.length + ' filas con dimensión no reconocida (' + esc(Array.from(new Set(sinDim.map((x) => x.dimO))).join(', ')) + '): quedan sin dimensión.</div>' : '') +
        '<p class="re-nota">Por libro: ' + Object.keys(porLibro).map((k) => esc(RE.nombreLibro(k) + ' ' + porLibro[k])).join(' · ') + '</p>' +
        '<div class="ic-acciones" style="justify-content:flex-start"><button class="ic-btn" id="bImp"' + (nuevas.length ? '' : ' disabled') + '>Importar ' + nuevas.length + ' reflexiones</button><span class="re-nota" id="iEst"></span></div>';
      const b = p.querySelector('#bImp');
      if (b) b.onclick = async () => {
        const lista = nuevas.filter((x) => RE.libro(x.libro)); b.disabled = true; const est = p.querySelector('#iEst');
        let n = 0, fallos = 0; const hoy = RE.hoy();
        const crear = async (x) => {
          const f2 = { Title: x.codigo, codigo: x.codigo, num: x.num, libro: x.libro, capitulo: x.capitulo, vers_ini: String(x.vers_ini), vers_fin: String(x.vers_fin), titulo: x.titulo, personajes: x.personajes,
            dimension: x.dimension, competencia: x.competencia, competencias_sec: x.competencias_sec, resumen: x.resumen, etiquetas_origen: x.etiquetas_origen, estado: 'IDEA', fecha_creacion: hoy + 'T12:00:00Z', autor: 'Plan inicial (Excel)', version_biblica: 'RVR1960' };
          Object.keys(f2).forEach((k) => { if (f2[k] === '' || f2[k] === null) delete f2[k]; });
          try { const it = await G.crear('RE_Reflexiones', f2); D.refl.push(RE.normal(Object.assign({}, it))); } catch (er) { fallos++; console.warn(x.codigo, er); }
          n++; est.textContent = n + ' de ' + lista.length + '…' + (fallos ? ' (' + fallos + ' con error)' : '');
        };
        try {
          for (let i = 0; i < lista.length; i += 4) await Promise.all(lista.slice(i, i + 4).map(crear));
          const max = {}; L.forEach((x) => { max[x.libro] = Math.max(max[x.libro] || 0, x.num); });
          est.textContent = 'Ajustando los consecutivos por libro…';
          for (const k of Object.keys(max)) await RE.asegurarSecuencia(k, max[k]);
          await G.crear('RE_Historial', { Title: 'IMPORT@' + Date.now(), reflexion_id: 'PLAN', fecha_hora: new Date().toISOString(), usuario: D.usuario.nombre, email: D.usuario.email, accion: 'Importación del plan (BD)', detalle: (n - fallos) + ' reflexiones creadas' + (fallos ? ', ' + fallos + ' con error' : '') });
          U.aviso((n - fallos) + ' reflexiones importadas' + (fallos ? ' · ' + fallos + ' con error (vuelva a importar para reintentarlas)' : ''), fallos ? 'warn' : 'ok', 9000);
          await RE.cargarReflexiones(); importar(z);
        } catch (er) { U.aviso(U.mensajeError(er), 'err', 9000); b.disabled = false; }
      };
    };
  }
})();
