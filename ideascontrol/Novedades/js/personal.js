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
      '<button class="ic-btn" id="bNueva">+ Agregar persona administrativa</button></div><div id="t"><div class="ic-vacio">Cargando…</div></div>' +
      '<div class="ic-alerta chica" style="margin-top:12px"><b>Para que una persona nueva pueda entrar:</b> registre su correo de Microsoft de Ideas Control y luego abra el instalador (Programacion/Instalador/) › paso de permisos › «Aplicar permisos». Eso la agrega al grupo de SharePoint del personal.</div>';
    c.querySelector('#bNueva').onclick = () => form(null, pintar);
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
