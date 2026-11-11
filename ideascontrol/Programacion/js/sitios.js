/* =====================================================================
   APP-106 · Programación — Clientes y sitios  (#sitios)
   Listado de los sitios / clientes finales de un cliente principal (p. ej. los clientes de Casa Limpia),
   armado con las actividades programadas: estado de cada sitio, instalaciones, equipos, última y próxima actividad.
   Clic en un sitio: todas sus actividades. Descarga en Excel.
   ===================================================================== */
(function () {
  const U = IC.ui, esc = U.esc;
  const INICIO = '2026-10-26';
  const ST = { cliente: '', desde: '', hasta: '', q: '', estado: '' };
  const n = (s) => U.norm(String(s || '')).replace(/\s+/g, ' ').trim();
  const eq = (a) => Number(a.equipos) || 0;
  const ESTADOS_SITIO = [
    ['INSTALADO', 'Instalado', 'verde'], ['INS_PROG', 'Instalación programada', 'azul'], ['VISITA', 'En visita / costeo', 'dorado'],
    ['MANT', 'Con mantenimiento', 'teal'], ['OTRO', 'Con actividades', 'gris'], ['CANCELADO', 'Solo canceladas', 'rojo']
  ];
  const estNom = (k) => (ESTADOS_SITIO.find((x) => x[0] === k) || [k, k, 'gris']);

  // Agrupa las actividades del cliente por sitio
  function sitios(acts) {
    const m = {}, hoy = Ope.hoy();
    acts.forEach((a) => {
      const nombre = String(a.sitio || '').trim() || String(a.cliente || '').trim() || '(sin cliente)';
      const k = n(nombre);
      const s = m[k] || (m[k] = { sitio: nombre, ciudades: new Set(), acts: [], tickets: new Set() });
      s.acts.push(a); if (a.ciudad) s.ciudades.add(a.ciudad); if (a.ticket_os) s.tickets.add(String(a.ticket_os).trim());
    });
    return Object.values(m).map((s) => {
      const v = s.acts.filter(Ope.activa).sort((x, y) => x.fecha.localeCompare(y.fecha));
      const ins = v.filter((a) => a.tipo === 'INS'), insEj = ins.filter((a) => a.estado === 'EJECUTADO'), insPend = ins.filter((a) => a.estado !== 'EJECUTADO');
      const mto = v.filter((a) => a.tipo === 'MTO');
      const pasadas = v.filter((a) => a.fecha <= hoy), futuras = v.filter((a) => a.fecha > hoy || (a.fecha === hoy && a.estado !== 'EJECUTADO'));
      let estado = 'OTRO';
      if (!v.length) estado = 'CANCELADO';
      else if (insEj.length) estado = 'INSTALADO';
      else if (insPend.length) estado = 'INS_PROG';
      else if (v.some((a) => /VT|VIS/.test(a.tipo))) estado = 'VISITA';
      else if (mto.length) estado = 'MANT';
      return Object.assign(s, {
        estado, vigentes: v.length, insEj: insEj.length, insPend: insPend.length, mto: mto.length,
        equiposInst: insEj.reduce((t, a) => t + eq(a), 0), equiposProg: insPend.reduce((t, a) => t + eq(a), 0),
        ultima: pasadas[pasadas.length - 1] || null, proxima: futuras.find((a) => a.estado !== 'EJECUTADO') || null,
        ciudad: Array.from(s.ciudades).join(', '), ticket: Array.from(s.tickets).join(', ')
      });
    }).sort((a, b) => a.sitio.localeCompare(b.sitio));
  }
  const actTxt = (a) => a ? Ope.textoFecha(a.fecha) + ' · ' + a.tipo + ' · ' + Ope.nombreEstado(a.estado) + (a.tecnico_id ? ' · ' + Ope.nombreTec(a.tecnico_id) : '') : '—';

  // Clientes principales que tienen sitios (los que más sitios tienen primero)
  function clientes(acts) {
    const m = {};
    acts.forEach((a) => { if (!a.cliente || !a.sitio) return; const k = n(a.cliente); (m[k] = m[k] || { nombre: a.cliente, s: new Set() }).s.add(n(a.sitio)); });
    return Object.values(m).sort((a, b) => b.s.size - a.s.size || a.nombre.localeCompare(b.nombre));
  }

  App.vistas.sitios = async function (c) {
    if (App.usuario.rol === 'TECNICO') { location.hash = ''; return; }
    // Desde el inicio de la programación en la app (26 oct 2026)
    if (!ST.desde) { ST.desde = INICIO; ST.hasta = Ope.sumar(Ope.hoy(), 120); }
    c.innerHTML = '<a class="ic-volver" href="#">← Menú principal</a><h1 class="ic-titulo">Clientes y sitios</h1>' +
      '<p class="ic-subtitulo">Los sitios (clientes finales) de un cliente principal, por ejemplo los clientes de Casa Limpia, con su estado según la programación. Clic en un sitio para ver todas sus actividades.</p>' +
      '<div class="ic-filtros"><select id="sCli"><option value="">Cargando clientes…</option></select>' +
      '<label class="ope-lbl">Desde <input type="date" id="sD" value="' + ST.desde + '"></label><label class="ope-lbl">Hasta <input type="date" id="sH" value="' + ST.hasta + '"></label>' +
      '<select id="sEst"><option value="">Todos los estados</option>' + ESTADOS_SITIO.map((e) => '<option value="' + e[0] + '">' + esc(e[1]) + '</option>').join('') + '</select>' +
      '<input type="search" id="sQ" placeholder="Buscar sitio, ciudad, ticket…" value="' + esc(ST.q) + '"><button class="ic-btn sec" id="sXls">Descargar Excel</button></div>' +
      '<div id="sRes"><div class="ic-vacio">Cargando la programación…</div></div>';
    let todo = [];
    async function cargar() {
      try { await Ope.cargarRango(ST.desde, ST.hasta); } catch (e) { c.querySelector('#sRes').innerHTML = '<div class="ic-alerta">' + esc(U.mensajeError(e)) + '</div>'; return; }
      todo = Ope.delRango(ST.desde, ST.hasta).filter((a) => a.tipo !== 'OFI' && a.tipo !== 'AUS');
      const cl = clientes(todo);
      if (!ST.cliente) { const cas = cl.find((x) => /casa limpia/.test(n(x.nombre))); ST.cliente = cas ? n(cas.nombre) : (cl[0] ? n(cl[0].nombre) : ''); }
      const nDir = new Set(directas().map((a) => n(a.cliente))).size;
      c.querySelector('#sCli').innerHTML = cl.map((x) => '<option value="' + esc(n(x.nombre)) + '">' + esc(x.nombre) + ' (' + x.s.size + ' sitios)</option>').join('') +
        '<option value="__directos">Empresas sin cliente principal (' + nDir + ')</option>';
      if (!cl.length && ST.cliente !== '__directos') ST.cliente = '__directos';
      c.querySelector('#sCli').value = ST.cliente;
      dibujar();
    }
    // Actividades donde la empresa quedó como «Cliente» sin cliente principal (p. ej. importadas del Excel)
    const nomCli = () => (todo.find((a) => n(a.cliente) === ST.cliente) || {}).cliente || ST.cliente;
    const directas = () => todo.filter((a) => a.cliente && !a.sitio);
    const delCliente = () => ST.cliente === '__directos' ? directas() : todo.filter((a) => n(a.cliente) === ST.cliente);
    function lista() {
      const q = n(ST.q);
      return sitios(delCliente())
        .filter((s) => (!ST.estado || s.estado === ST.estado) && (!q || n(s.sitio + ' ' + s.ciudad + ' ' + s.ticket).indexOf(q) >= 0));
    }
    function dibujar() {
      const l = lista(), cont = {};
      const dir = ST.cliente === '__directos';
      sitios(delCliente()).forEach((s) => { cont[s.estado] = (cont[s.estado] || 0) + 1; });
      c.querySelector('#sRes').innerHTML =
        '<div class="ope-sit-resumen">' + ESTADOS_SITIO.filter((e) => cont[e[0]]).map((e) => '<button class="ope-sit-k ' + e[2] + (ST.estado === e[0] ? ' on' : '') + '" data-est="' + e[0] + '"><b>' + cont[e[0]] + '</b>' + esc(e[1]) + '</button>').join('') + '</div>' +
        (dir && l.length ? '<div class="ic-alerta chica" style="margin-bottom:10px"><b>Estas empresas están como «Cliente» sin cliente principal.</b> Si son clientes de Casa Limpia (u otro), márquelas y páselas: el cliente queda como cliente principal y la empresa pasa a «Sitio / cliente final» en todas sus actividades.' +
          '<div class="ic-barra" style="margin-top:8px;gap:8px;flex-wrap:wrap"><label class="ic-check"><input type="checkbox" id="sTodas"> <span>Marcar todas</span></label><span style="flex:1"></span>' +
          '<input id="sPrin" list="dlPrin" placeholder="Cliente principal (p. ej. CASA LIMPIA)" style="min-width:260px"><datalist id="dlPrin"></datalist><button class="ic-btn" id="sPasar">Pasar las marcadas</button></div></div>' : '') +
        (!dir && l.length ? '<div class="ic-alerta chica" style="margin-bottom:10px"><b>Quitar el cliente principal:</b> marque los sitios y la empresa vuelve a quedar como «Cliente» (sin cliente principal) en todas sus actividades. ' + esc(nomCli()) + ' no se borra de la base de Comercial.' +
          '<div class="ic-barra" style="margin-top:8px;gap:8px"><label class="ic-check"><input type="checkbox" id="sTodas"> <span>Marcar todas</span></label><span style="flex:1"></span><button class="ic-btn" id="sQuitar">Quitar cliente principal a las marcadas</button></div></div>' : '') +
        (l.length ? '<div class="ic-tabla-caja ope-scroll"><table class="ic-tabla"><thead><tr><th style="width:30px"></th><th>' + (dir ? 'Empresa' : 'Sitio / cliente final') + '</th><th>Estado</th><th>Ciudad</th><th style="text-align:center">Instalaciones</th><th style="text-align:center">Equipos instalados</th><th style="text-align:center">Mantenimientos</th><th>Última actividad</th><th>Próxima actividad</th><th>Ticket / OS</th></tr></thead><tbody>' +
          l.map((s, i) => { const e = estNom(s.estado);
            return '<tr data-i="' + i + '"><td><input type="checkbox" class="sMarca" data-i="' + i + '" aria-label="Marcar"></td>' + '<td><b>' + esc(s.sitio) + '</b></td><td><span class="ope-sit-tag ' + e[2] + '">' + esc(e[1]) + '</span></td><td>' + esc(s.ciudad) + '</td>' +
              '<td style="text-align:center">' + s.insEj + (s.insPend ? ' <span class="sec">+' + s.insPend + ' prog.</span>' : '') + '</td><td style="text-align:center">' + (s.equiposInst || '') + (s.equiposProg ? ' <span class="sec">+' + s.equiposProg + ' prog.</span>' : '') + '</td>' +
              '<td style="text-align:center">' + (s.mto || '') + '</td><td>' + esc(actTxt(s.ultima)) + '</td><td>' + esc(actTxt(s.proxima)) + '</td><td>' + esc(s.ticket) + '</td></tr>'; }).join('') +
          '</tbody></table></div><p class="ope-nota">' + l.length + ' sitio(s). El estado sale de la programación: «Instalado» = tiene al menos una instalación ejecutada; «Instalación programada» = tiene instalación pendiente; canceladas y reprogramadas no cuentan.</p>'
          : '<div class="ic-tabla-caja"><div class="ic-vacio">No hay sitios con estos filtros.</div></div>');
      c.querySelectorAll('[data-est]').forEach((b) => { b.onclick = () => { ST.estado = ST.estado === b.dataset.est ? '' : b.dataset.est; c.querySelector('#sEst').value = ST.estado; dibujar(); }; });
      c.querySelectorAll('tr[data-i]').forEach((tr) => { tr.onclick = (e) => { if (e.target.classList.contains('sMarca')) return; detalle(l[+tr.dataset.i]); }; });
      const marcadas = () => Array.from(c.querySelectorAll('.sMarca')).filter((x) => x.checked).map((x) => l[+x.dataset.i]);
      if (c.querySelector('#sTodas')) c.querySelector('#sTodas').onchange = (e) => c.querySelectorAll('.sMarca').forEach((x) => { x.checked = e.target.checked; });
      if (!dir && l.length) c.querySelector('#sQuitar').onclick = async (ev) => {
        const b = ev.currentTarget, m = marcadas(); if (!m.length) { U.aviso('Marque los sitios a los que se les quita el cliente principal.', 'warn'); return; }
        b.disabled = true; let k = 0;
        const emp = await Ope.empresas(), acts = [].concat.apply([], m.map((x) => x.acts)).filter((a) => a.sitio);
        try {
          for (const a of acts) {
            b.textContent = 'Actualizando ' + (++k) + ' de ' + acts.length + '…';
            const e = emp.find((x) => n(x.razon_social) === n(a.sitio));
            await Ope.actualizarActividad(a, { cliente: e ? e.razon_social : a.sitio, empresa_id: e ? e.Title : '', sitio: '' });
          }
          U.aviso(m.length + ' sitio(s) quedaron sin cliente principal (' + acts.length + ' actividades).', 'ok', 7000);
          ST.cliente = '__directos'; await cargar();
        } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); b.disabled = false; b.textContent = 'Reintentar'; await cargar(); }
      };
      if (dir && l.length) {
        Ope.empresas().then((emp) => { const dl = c.querySelector('#dlPrin'); if (dl) dl.innerHTML = emp.map((e) => '<option value="' + esc(e.razon_social) + '">').join(''); });
        const cas = clientes(todo).find((x) => /casa limpia/.test(n(x.nombre))); if (cas) c.querySelector('#sPrin').value = cas.nombre;
        c.querySelector('#sPasar').onclick = async (ev) => {
          const boton = ev.currentTarget, marcadas2 = marcadas();
          const prin = c.querySelector('#sPrin').value.trim().toUpperCase();
          if (!marcadas2.length) { U.aviso('Marque las empresas que pasan al cliente principal.', 'warn'); return; }
          if (!prin) { U.aviso('Escriba el cliente principal.', 'warn'); c.querySelector('#sPrin').focus(); return; }
          const emp = (await Ope.empresas()).find((x) => n(x.razon_social) === n(prin));
          const acts = [].concat.apply([], marcadas2.map((s) => s.acts));
          const b = boton; b.disabled = true; let k = 0;
          try {
            for (const a of acts) { b.textContent = 'Actualizando ' + (++k) + ' de ' + acts.length + '…'; await Ope.actualizarActividad(a, { sitio: a.cliente, cliente: emp ? emp.razon_social : prin, empresa_id: emp ? emp.Title : '' }); }
            U.aviso(marcadas2.length + ' empresa(s) pasadas a ' + prin + ' (' + acts.length + ' actividades).', 'ok', 7000);
            ST.cliente = n(emp ? emp.razon_social : prin); await cargar();
          } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); b.disabled = false; b.textContent = 'Reintentar'; await cargar(); }
        };
      }
    }
    function detalle(s) {
      const acts = s.acts.slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
      U.modal(s.sitio, '<div class="ic-form"><p style="margin-top:0">' + esc(estNom(s.estado)[1]) + (s.ciudad ? ' · ' + esc(s.ciudad) : '') + ' · ' + acts.length + ' actividad(es). Clic en una para abrirla.</p><div id="sDet"></div>' +
        '<div class="ic-acciones"><button type="button" class="ic-btn" id="sCerrar">Cerrar</button></div></div>', (cu) => {
        cu.querySelector('#sDet').innerHTML = App.tablaActividades(acts);
        App.conectarTabla(cu.querySelector('#sDet'), () => cargar());
        cu.querySelector('#sCerrar').onclick = U.cerrarModal;
      });
    }
    c.querySelector('#sCli').onchange = (e) => { ST.cliente = e.target.value; ST.estado = ''; c.querySelector('#sEst').value = ''; dibujar(); };
    c.querySelector('#sEst').onchange = (e) => { ST.estado = e.target.value; dibujar(); };
    c.querySelector('#sQ').oninput = (e) => { ST.q = e.target.value; dibujar(); };
    c.querySelector('#sD').onchange = (e) => { if (e.target.value) { ST.desde = e.target.value; cargar(); } };
    c.querySelector('#sH').onchange = (e) => { if (e.target.value) { ST.hasta = e.target.value; cargar(); } };
    c.querySelector('#sXls').onclick = async (ev) => {
      const l = lista(); if (!l.length) { U.aviso('No hay sitios para descargar', 'warn'); return; }
      const b = ev.currentTarget; b.disabled = true;
      try {
        if (!window.XLSX) await new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar la librería de Excel.')); document.head.appendChild(s); });
        const cliNom = ST.cliente === '__directos' ? 'Sin cliente principal' : (todo.find((a) => n(a.cliente) === ST.cliente) || {}).cliente || ST.cliente;
        const ws = XLSX.utils.json_to_sheet(l.map((s) => ({ 'Cliente principal': cliNom, 'Sitio / cliente final': s.sitio, 'Estado': estNom(s.estado)[1], 'Ciudad': s.ciudad,
          'Instalaciones ejecutadas': s.insEj, 'Instalaciones programadas': s.insPend, 'Equipos instalados': s.equiposInst, 'Equipos programados': s.equiposProg, 'Mantenimientos': s.mto,
          'Última actividad': actTxt(s.ultima), 'Próxima actividad': actTxt(s.proxima), 'Ticket / OS': s.ticket })));
        ws['!cols'] = [22, 40, 22, 16, 12, 12, 12, 12, 12, 46, 46, 16].map((w) => ({ wch: w })); ws['!autofilter'] = { ref: ws['!ref'] };
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Sitios');
        XLSX.writeFile(wb, 'Sitios_' + String(cliNom).replace(/[^\w]+/g, '_') + '_' + Ope.hoy() + '.xlsx');
      } catch (e) { U.aviso(U.mensajeError(e), 'err', 7000); } finally { b.disabled = false; }
    };
    cargar();
  };
})();
