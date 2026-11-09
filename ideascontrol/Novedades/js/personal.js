/* =====================================================================
   APP-107 · Novedades — Personal (solo Dirección)
   La app es para todo el personal. Los técnicos se administran en la Programación (Administración › Técnicos);
   aquí se agrega el personal administrativo: queda en OPE_Tecnicos con vinculación ADMINISTRATIVO,
   no se programa ni aparece en la Programación. Para que pueda entrar: registre su correo y, una vez,
   ejecute «Aplicar permisos» en el instalador (lo agrega al grupo de SharePoint del personal).
   ===================================================================== */
(function () {
  const U = IC.ui, esc = U.esc, G = IC.graph;
  const VINC = { IDEAS_CONTROL: 'Técnico · Ideas Control', TECNICO_CAMPO: 'Técnico de campo', ADMINISTRATIVO: 'Administrativo' };

  // La columna «vinculacion» de OPE_Tecnicos es de opciones: se agrega ADMINISTRATIVO si aún no existe
  let opcionLista = false;
  async function asegurarOpcion() {
    if (opcionLista) return;
    const sid = await G.sitio(CFG.sitio.host, CFG.sitio.ruta), lid = await G.listaId('OPE_Tecnicos');
    const cols = (await G.llamar('GET', '/sites/' + sid + '/lists/' + lid + '/columns?$select=id,name,choice')).value || [];
    const col = cols.find((x) => x.name === 'vinculacion');
    if (col && col.choice && (col.choice.choices || []).indexOf(Ope.ADMINISTRATIVO) < 0) {
      await G.llamar('PATCH', '/sites/' + sid + '/lists/' + lid + '/columns/' + col.id, { choice: Object.assign({}, col.choice, { choices: col.choice.choices.concat([Ope.ADMINISTRATIVO]) }) });
    }
    opcionLista = true;
  }

  App.vistas.personal = async function (c) {
    if (!App.esAdmin()) { location.hash = ''; return; }
    c.innerHTML = '<a class="ic-volver" href="#">← Menú principal</a><div class="ic-barra"><div style="flex:1"><h1 class="ic-titulo">Personal</h1>' +
      '<p class="ic-subtitulo" style="margin:0">Todas las personas que pueden registrar novedades. Agregue aquí al personal administrativo; los técnicos se agregan en la Programación (Administración › Técnicos).</p></div>' +
      '<button class="ic-btn sec" id="bTraer">Traer de las otras apps</button><button class="ic-btn" id="bNueva">+ Agregar persona administrativa</button></div><div id="t"><div class="ic-vacio">Cargando…</div></div>' +
      '<div class="ic-alerta chica" style="margin-top:12px"><b>Para que una persona nueva pueda entrar:</b> registre su correo de Microsoft de Ideas Control y luego abra el instalador (Programacion/Instalador/) › paso de permisos › «Aplicar permisos». Eso la agrega al grupo de SharePoint del personal.</div>';
    c.querySelector('#bNueva').onclick = () => form(null, pintar);
    c.querySelector('#bTraer').onclick = (e) => traer(e.currentTarget, pintar);
    async function pintar() {
      try { await Ope.cargarCatalogos(); } catch (e) { c.querySelector('#t').innerHTML = '<div class="ic-alerta">' + esc(U.mensajeError(e)) + '</div>'; return; }
      const l = Ope.D.personal.slice().sort((a, b) => (a.vinculacion === Ope.ADMINISTRATIVO) - (b.vinculacion === Ope.ADMINISTRATIVO) || String(a.nombre).localeCompare(b.nombre));
      c.querySelector('#t').innerHTML = '<div class="ic-tabla-caja ope-scroll"><table class="ic-tabla"><thead><tr><th>Nombre</th><th>Tipo</th><th>Correo (para entrar)</th><th>Celular</th><th>Estado</th></tr></thead><tbody>' +
        l.map((t) => { const adm = t.vinculacion === Ope.ADMINISTRATIVO;
          return '<tr data-id="' + esc(t.Title) + '" class="' + (t.estado === 'INACTIVO' ? 'inactivo' : '') + '" style="' + (adm ? '' : 'cursor:default') + '"><td><b>' + esc(t.nombre) + '</b><span class="sec">' + esc(t.Title + ' · ' + (t.iniciales || '')) + '</span></td>' +
            '<td>' + esc(VINC[t.vinculacion] || t.vinculacion || '') + (adm ? '' : '<span class="sec">Se edita en la Programación</span>') + '</td><td>' + esc(t.email || '—') + '</td><td>' + esc(t.celular || '') + '</td><td>' + (t.estado === 'INACTIVO' ? 'Inactivo' : 'Activo') + '</td></tr>'; }).join('') +
        '</tbody></table></div>';
      c.querySelectorAll('tr[data-id]').forEach((tr) => { const t = Ope.tec(tr.dataset.id); if (t && t.vinculacion === Ope.ADMINISTRATIVO) tr.onclick = () => form(t, pintar); });
    }
    pintar();
  };

  // Personas que ya usan otras microapps (usuarios de Comercial y accesos) y aún no están en el personal
  function inicialesLibres(nombre, usadas) {
    const p = U.norm(nombre).replace(/[^a-z ]/g, '').split(' ').filter(Boolean);
    const cands = [p.map((x) => x[0]).join('').slice(0, 3), (p[0] || '').slice(0, 2) + (p[1] || '').slice(0, 1), (p[0] || '').slice(0, 3)].map((x) => x.toUpperCase()).filter((x) => /^[A-Z]{2,3}$/.test(x));
    for (const c of cands) if (!usadas.has(c)) return c;
    for (let i = 0; i < 26; i++) { const c = ((p[0] || 'X')[0] + (p[1] || 'X')[0]).toUpperCase() + String.fromCharCode(65 + i); if (!usadas.has(c)) return c; }
    return '';
  }
  async function traer(boton, alCambiar) {
    let cand = [];
    await U.conCarga(boton, async () => {
      const [us, acc] = await Promise.all([G.items('SYS_Usuarios', { top: 999 }).catch(() => []), G.items('SYS_Accesos', { top: 999 }).catch(() => [])]);
      const ya = new Set(Ope.D.personal.map((t) => String(t.email || '').toLowerCase()).filter(Boolean)), m = {};
      us.filter((u) => u.estado !== 'INACTIVO').forEach((u) => { const e = String(u.email || '').toLowerCase(); if (e && !ya.has(e)) m[e] = { email: e, nombre: u.nombre || e, iniciales: u.iniciales, celular: u.celular, de: 'Comercial' + (u.cargo ? ' · ' + u.cargo : '') }; });
      acc.filter((a) => a.estado !== 'INACTIVO').forEach((a) => { const e = String(a.email || '').toLowerCase(); if (e && !ya.has(e) && !m[e]) m[e] = { email: e, nombre: a.nombre || e, de: 'Acceso ' + (a.app_id || '') }; });
      cand = Object.values(m).sort((a, b) => a.nombre.localeCompare(b.nombre));
    });
    if (!cand.length) { U.aviso('Todas las personas de las otras apps ya están en el personal.', 'ok', 6000); return; }
    U.modal('Traer de las otras apps', '<div class="ic-form"><p style="margin-top:0">Estas personas usan otras microapps de IC Apps y aún no están en el personal. Marque las que deben poder registrar novedades; entran como <b>administrativas</b>.</p>' +
      '<div class="ope-sal-lista">' + cand.map((x, i) => '<label class="ic-check"><input type="checkbox" data-i="' + i + '" checked> <span><b>' + esc(x.nombre) + '</b> <small>' + esc(x.email + ' · ' + x.de) + '</small></span></label>').join('') + '</div>' +
      '<p class="ope-nota">Si alguna es técnico, no la marque: los técnicos se agregan en la Programación.</p>' +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="tNo">Cancelar</button><button type="button" class="ic-btn" id="tOk">Agregar</button></div></div>', (cu) => {
      cu.querySelector('#tNo').onclick = U.cerrarModal;
      const ok = cu.querySelector('#tOk');
      ok.onclick = async () => {
        const sel = Array.from(cu.querySelectorAll('[data-i]')).filter((x) => x.checked).map((x) => cand[+x.dataset.i]);
        if (!sel.length) { U.aviso('Marque al menos una persona.', 'warn'); return; }
        try {
          await U.conCarga(ok, async () => {
            await asegurarOpcion();
            const usadas = new Set(Ope.D.personal.map((t) => String(t.iniciales || '').toUpperCase()));
            for (const x of sel) {
              let ini = String(x.iniciales || '').toUpperCase(); if (!/^[A-Z]{2,3}$/.test(ini) || usadas.has(ini)) ini = inicialesLibres(x.nombre, usadas); usadas.add(ini);
              const n = await G.siguiente('TEC', 1), id = 'TEC-' + Ope.pad(n, 2);
              const campos = { Title: id, nombre: x.nombre, iniciales: ini, email: x.email, celular: x.celular || '', estado: 'ACTIVO', vinculacion: Ope.ADMINISTRATIVO, habilidades: '' };
              await G.crear('OPE_Tecnicos', campos); await Ope.auditar('PERSONAL', id, 'CREAR', null, campos);
            }
          });
          U.aviso(sel.length + ' persona(s) agregada(s). Recuerde «Aplicar permisos» en el instalador.', 'ok', 8000); U.cerrarModal(); alCambiar();
        } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); alCambiar(); }
      };
    });
  }

  function form(t, alCambiar) {
    const nuevo = !t; t = t || { estado: 'ACTIVO' };
    U.modal(nuevo ? 'Agregar persona administrativa' : t.nombre, '<form class="ic-form" id="fP"><div class="ic-campos">' +
      U.campo({ name: 'nombre', label: 'Nombre completo', valor: t.nombre, req: true, c: 'c8' }) +
      U.campo({ name: 'iniciales', label: 'Iniciales', valor: t.iniciales, req: true, c: 'c4', max: 3, ayuda: '2 o 3 letras' }) +
      U.campo({ name: 'email', label: 'Correo de Microsoft', t: 'email', valor: t.email, req: true, c: 'c8', ph: 'nombre@ideascontrol.com' }) +
      U.campo({ name: 'celular', label: 'Celular', valor: t.celular, c: 'c4' }) +
      U.campo({ name: 'estado', label: 'Estado', t: 'select', op: [['ACTIVO', 'Activo'], ['INACTIVO', 'Inactivo']], valor: t.estado, vacio: false, c: 'c12' }) +
      '</div><div class="ic-acciones"><button type="button" class="ic-btn sec" id="pNo">Cancelar</button><button class="ic-btn" id="pOk">Guardar</button></div></form>',
    (cu) => {
      const f = cu.querySelector('#fP');
      cu.querySelector('#pNo').onclick = U.cerrarModal;
      f.onsubmit = async (ev) => {
        ev.preventDefault();
        const v = U.leerForm(f), err = {};
        v.iniciales = String(v.iniciales || '').toUpperCase(); v.email = String(v.email || '').trim().toLowerCase();
        if (!v.nombre) err.nombre = 'Obligatorio';
        if (!/^[A-Z]{2,3}$/.test(v.iniciales)) err.iniciales = '2 o 3 letras';
        else if (Ope.D.personal.some((x) => x.Title !== t.Title && String(x.iniciales).toUpperCase() === v.iniciales)) err.iniciales = 'Ya las usa otra persona';
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) err.email = 'Correo no válido';
        else if (Ope.D.personal.some((x) => x.Title !== t.Title && String(x.email || '').toLowerCase() === v.email)) err.email = 'Ya está asociado a otra persona';
        if (!U.marcarErrores(f, err)) return;
        const campos = { nombre: v.nombre, iniciales: v.iniciales, email: v.email, celular: v.celular, estado: v.estado, vinculacion: Ope.ADMINISTRATIVO, habilidades: '' };
        try {
          await U.conCarga(cu.querySelector('#pOk'), async () => {
            await asegurarOpcion();
            if (nuevo) { const n = await G.siguiente('TEC', 1); const id = 'TEC-' + Ope.pad(n, 2); await G.crear('OPE_Tecnicos', Object.assign({ Title: id }, campos)); await Ope.auditar('PERSONAL', id, 'CREAR', null, campos); }
            else { await G.actualizar('OPE_Tecnicos', t._id, campos, t._etag); await Ope.auditar('PERSONAL', t.Title, 'ACTUALIZAR', null, campos); }
          });
          U.aviso('Guardado. Recuerde «Aplicar permisos» en el instalador para que pueda entrar.', 'ok', 7000); U.cerrarModal(); alCambiar();
        } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); }
      };
    });
  }
})();
