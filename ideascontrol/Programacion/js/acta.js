/* =====================================================================
   APP-106 · Programación — Acta de equipos instalados  (#acta)
   Listado tipo acta de las instalaciones (tipo INS) de un rango de fechas, opcionalmente
   de un solo cliente. Cada fila se puede quitar del acta (casilla) antes de imprimir o copiar.
   Lo que se quita no se borra de la Programación: solo deja de salir en el acta.
   Para Dirección (ADMIN), programadores (EDITOR) y consulta (CONSULTA); los técnicos no lo ven.
   ===================================================================== */
(function () {
  const U = IC.ui, esc = U.esc;
  const INS = 'INS';
  const ST = { desde: '', hasta: '', cliente: '', todas: false, quitadas: {}, obs: '' };
  const num = (v) => Math.round(Number(v) || 0).toLocaleString('es-CO');
  const eq = (a) => Number(a.equipos) || 0;
  const cli = (a) => String(a.cliente || '').trim().toUpperCase();

  function presets() {
    const h = Ope.hoy(), [y, m] = h.split('-').map(Number), p = Ope.pad;
    const mesAnt = m === 1 ? [y - 1, 12] : [y, m - 1];
    return [
      ['Esta semana', Ope.lunesDe(h), Ope.sumar(Ope.lunesDe(h), 6)],
      ['Este mes', y + '-' + p(m) + '-01', Ope.finDeMes(y, m)],
      ['Mes anterior', mesAnt[0] + '-' + p(mesAnt[1]) + '-01', Ope.finDeMes(mesAnt[0], mesAnt[1])]
    ];
  }

  // Instalaciones del rango: ejecutadas (o también programadas/confirmadas si se pide); nunca canceladas ni reprogramadas
  function instalaciones() {
    return Ope.delRango(ST.desde, ST.hasta).filter((a) => a.tipo === INS && Ope.activa(a) && (ST.todas || a.estado === 'EJECUTADO'));
  }

  App.vistas.acta = async function (c) {
    if (App.usuario.rol === 'TECNICO') { location.hash = ''; return; }
    if (!ST.desde) { const p = presets()[1]; ST.desde = p[1]; ST.hasta = p[2]; }
    c.innerHTML = '<a class="ic-volver ope-noimp" href="#">← Menú principal</a>' +
      '<div class="ope-noimp"><h1 class="ic-titulo">Acta de equipos instalados</h1>' +
      '<p class="ic-subtitulo">Elija el periodo y el cliente. Quite con la casilla las instalaciones que no deben salir en el acta; luego imprímala (o guárdela en PDF) o copie el texto para el correo.</p>' +
      '<div class="ic-filtros"><div class="ope-res-pre">' + presets().map((p, i) => '<button class="ic-btn sec chico" data-pre="' + i + '">' + esc(p[0]) + '</button>').join('') + '</div>' +
        '<label class="ope-lbl">Desde <input type="date" id="acD" value="' + ST.desde + '"></label><label class="ope-lbl">Hasta <input type="date" id="acH" value="' + ST.hasta + '"></label>' +
        '<select id="acCli"></select>' +
        '<label class="ic-check"><input type="checkbox" id="acTodas"' + (ST.todas ? ' checked' : '') + '> <span>Incluir programadas y confirmadas</span></label></div>' +
      '<div class="ic-barra" style="margin:10px 0"><span class="ic-conteo" id="acConteo" style="margin:0"></span><span style="flex:1"></span>' +
        '<button class="ic-btn sec chico" id="acTodos">Incluir todas</button><button class="ic-btn sec chico" id="acNinguna">Quitar todas</button>' +
        '<button class="ic-btn sec chico" id="acCopiar">Copiar texto</button><button class="ic-btn chico" id="acImp">Imprimir / PDF</button></div></div>' +
      '<div id="acDoc"><div class="ic-vacio">Cargando…</div></div>';

    const cambiarRango = async () => { ST.quitadas = {}; await pintar(); };
    c.querySelectorAll('[data-pre]').forEach((b) => { b.onclick = () => { const p = presets()[+b.dataset.pre]; ST.desde = p[1]; ST.hasta = p[2]; c.querySelector('#acD').value = ST.desde; c.querySelector('#acH').value = ST.hasta; cambiarRango(); }; });
    c.querySelector('#acD').onchange = (e) => { if (e.target.value) { ST.desde = e.target.value; cambiarRango(); } };
    c.querySelector('#acH').onchange = (e) => { if (e.target.value) { ST.hasta = e.target.value; cambiarRango(); } };
    c.querySelector('#acCli').onchange = (e) => { ST.cliente = e.target.value; ST.quitadas = {}; dibujar(); };
    c.querySelector('#acTodas').onchange = (e) => { ST.todas = e.target.checked; dibujar(); };
    c.querySelector('#acTodos').onclick = () => { ST.quitadas = {}; dibujar(); };
    c.querySelector('#acNinguna').onclick = () => { filas().forEach((a) => { ST.quitadas[a.Title] = true; }); dibujar(); };
    c.querySelector('#acImp').onclick = () => {
      if (!incluidas().length) { U.aviso('No hay instalaciones incluidas en el acta', 'warn'); return; }
      window.print();
    };
    c.querySelector('#acCopiar').onclick = async () => {
      if (!incluidas().length) { U.aviso('No hay instalaciones incluidas en el acta', 'warn'); return; }
      try { await navigator.clipboard.writeText(texto()); U.aviso('Texto del acta copiado: péguelo en el correo', 'ok'); }
      catch (e) { U.aviso('No se pudo copiar: ' + U.mensajeError(e), 'err'); }
    };

    const filas = () => instalaciones().filter((a) => !ST.cliente || cli(a) === ST.cliente);
    const incluidas = () => filas().filter((a) => !ST.quitadas[a.Title]);

    async function pintar() {
      const doc = c.querySelector('#acDoc');
      if (ST.hasta < ST.desde) { doc.innerHTML = '<div class="ic-alerta">La fecha «Hasta» es anterior a «Desde».</div>'; return; }
      doc.innerHTML = '<div class="ic-vacio">Cargando…</div>';
      try { await Ope.cargarRango(ST.desde, ST.hasta, true); }
      catch (e) { doc.innerHTML = '<div class="ic-alerta">' + esc(U.mensajeError(e)) + '</div>'; return; }
      dibujar();
    }

    function dibujar() {
      // Clientes del periodo (con equipos instalados)
      const sel = c.querySelector('#acCli'), clientes = Array.from(new Set(instalaciones().map(cli).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es'));
      if (ST.cliente && clientes.indexOf(ST.cliente) < 0) ST.cliente = '';
      sel.innerHTML = '<option value="">Todos los clientes</option>' + clientes.map((x) => '<option value="' + esc(x) + '"' + (x === ST.cliente ? ' selected' : '') + '>' + esc(x) + '</option>').join('');

      const fs = filas(), inc = incluidas(), totEq = inc.reduce((s, a) => s + eq(a), 0);
      c.querySelector('#acConteo').textContent = inc.length + ' de ' + fs.length + ' instalaciones en el acta · ' + num(totEq) + ' equipos';
      const doc = c.querySelector('#acDoc');
      if (!fs.length) { doc.innerHTML = '<div class="ic-vacio">No hay instalaciones ' + (ST.todas ? '' : 'ejecutadas ') + 'en el periodo' + (ST.cliente ? ' para ' + esc(ST.cliente) : '') + '.' + (ST.todas ? '' : ' Marque «Incluir programadas y confirmadas» si aún no se han cerrado.') + '</div>'; return; }

      const variosClientes = new Set(inc.map(cli)).size !== 1;
      const clienteActa = ST.cliente || (!variosClientes && inc.length ? cli(inc[0]) : 'Varios clientes');
      const ciudades = Array.from(new Set(inc.map((a) => String(a.ciudad || '').trim()).filter(Boolean))).join(', ');
      doc.innerHTML =
        '<div class="ope-acta">' +
          '<div class="ope-acta-cab"><img src="' + CFG.logo + '" alt="Ideas Control"><div><b>ACTA DE EQUIPOS INSTALADOS</b><span>Ideas Control Equipos y Soluciones S.A.S. · Dirección de Operaciones</span></div></div>' +
          '<dl class="ope-acta-datos">' +
            '<dt>Cliente</dt><dd>' + esc(clienteActa) + '</dd>' +
            '<dt>Periodo</dt><dd>Del ' + esc(Ope.textoFecha(ST.desde)) + ' al ' + esc(Ope.textoFecha(ST.hasta)) + '</dd>' +
            (ciudades ? '<dt>Ciudad(es)</dt><dd>' + esc(ciudades) + '</dd>' : '') +
            '<dt>Fecha del acta</dt><dd>' + esc(Ope.textoFecha(Ope.hoy())) + '</dd>' +
          '</dl>' +
          '<table class="ic-tabla ope-acta-tabla"><thead><tr><th class="ope-noimp" title="Incluir en el acta">✔</th><th>#</th><th>Fecha</th>' + (variosClientes ? '<th>Cliente</th>' : '') +
            '<th>Sitio / sede</th><th>Ciudad</th><th>Técnico</th><th class="num">Equipos</th><th>Ticket / OS</th><th>Observaciones</th></tr></thead><tbody>' +
          (function () {
            let k = 0;
            return fs.map((a) => {
              const fuera = !!ST.quitadas[a.Title];
              return '<tr class="' + (fuera ? 'ope-acta-fuera' : '') + '" style="cursor:default"><td class="ope-noimp"><input type="checkbox" data-id="' + esc(a.Title) + '"' + (fuera ? '' : ' checked') + ' aria-label="Incluir en el acta"></td>' +
                '<td>' + (fuera ? '—' : ++k) + '</td><td style="white-space:nowrap">' + esc(Ope.textoFecha(a.fecha)) + '</td>' + (variosClientes ? '<td>' + esc(a.cliente) + '</td>' : '') +
                '<td>' + esc(a.sitio || '—') + '</td><td>' + esc(a.ciudad) + '</td><td>' + esc(Ope.nombreTec(a.tecnico_id)) + '</td>' +
                '<td class="num"><b>' + num(eq(a)) + '</b></td><td>' + esc(a.ticket_os || '') + '</td><td>' + esc(a.observaciones || '') +
                (a.estado !== 'EJECUTADO' ? ' <span class="ope-estado e-' + esc(String(a.estado).toLowerCase()) + '">' + esc(Ope.nombreEstado(a.estado)) + '</span>' : '') + '</td></tr>';
            }).join('');
          })() +
          '</tbody><tfoot><tr><td class="ope-noimp"></td><td colspan="' + (variosClientes ? 6 : 5) + '"><b>Total: ' + inc.length + ' instalaciones</b></td><td class="num"><b>' + num(totEq) + '</b></td><td colspan="2"></td></tr></tfoot></table>' +
          '<div class="ope-acta-obs"><label for="acObs"><b>Observaciones</b></label><textarea id="acObs" rows="2" placeholder="Opcional: se imprime en el acta">' + esc(ST.obs) + '</textarea><div class="ope-acta-obs-imp">' + esc(ST.obs).replace(/\n/g, '<br>') + '</div></div>' +
          '<div class="ope-acta-firmas">' +
            '<div><div class="linea"></div><b>Entregado por</b><span>Ideas Control Equipos y Soluciones S.A.S.</span><span>Nombre y cargo:</span></div>' +
            '<div><div class="linea"></div><b>Recibido a satisfacción por</b><span>' + esc(variosClientes ? 'Cliente' : clienteActa) + '</span><span>Nombre, cargo y fecha:</span></div>' +
          '</div>' +
        '</div>';
      doc.querySelectorAll('input[data-id]').forEach((x) => { x.onchange = () => { if (x.checked) delete ST.quitadas[x.dataset.id]; else ST.quitadas[x.dataset.id] = true; dibujar(); }; });
      const obs = doc.querySelector('#acObs');
      obs.oninput = () => { ST.obs = obs.value; doc.querySelector('.ope-acta-obs-imp').innerHTML = esc(ST.obs).replace(/\n/g, '<br>'); };
    }

    function texto() {
      const inc = incluidas(), totEq = inc.reduce((s, a) => s + eq(a), 0);
      const varios = new Set(inc.map(cli)).size !== 1, cliente = ST.cliente || (varios ? 'Varios clientes' : cli(inc[0]));
      const l = ['ACTA DE EQUIPOS INSTALADOS — Ideas Control Equipos y Soluciones S.A.S.', 'Cliente: ' + cliente,
        'Periodo: del ' + Ope.textoFecha(ST.desde) + ' al ' + Ope.textoFecha(ST.hasta), ''];
      inc.forEach((a, i) => l.push((i + 1) + '. ' + Ope.textoFecha(a.fecha) + (varios ? ' · ' + a.cliente : '') + (a.sitio ? ' · ' + a.sitio : '') + (a.ciudad ? ' · ' + a.ciudad : '') +
        ' · ' + num(eq(a)) + ' equipo' + (eq(a) === 1 ? '' : 's') + (a.ticket_os ? ' · ' + a.ticket_os : '') + ' · Técnico: ' + Ope.nombreTec(a.tecnico_id)));
      l.push('', 'Total: ' + inc.length + ' instalaciones, ' + num(totEq) + ' equipos.');
      if (ST.obs) l.push('', 'Observaciones: ' + ST.obs);
      return l.join('\n');
    }

    await pintar();
  };
})();
