/* =====================================================================
   APP-106 · Programación — vistas: agenda (calendario), semana, rotación, carga
   ===================================================================== */
(function () {
  const U = IC.ui, esc = U.esc;
  const mesActual = () => App.estado.mes || (App.estado.mes = Ope.ym(Ope.hoy()));
  function moverMes(delta) {
    let [y, m] = mesActual().split('-').map(Number); m += delta;
    if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
    App.estado.mes = y + '-' + Ope.pad(m);
  }
  const nombreMes = (k) => Ope.MESES[Number(k.slice(5, 7)) - 1] + ' ' + k.slice(0, 4);
  function barraMes(extra) {
    return '<div class="ope-mes"><button class="ic-btn sec chico" data-mes="-1" aria-label="Mes anterior">◀</button><b>' + esc(nombreMes(mesActual())) + '</b>' +
      '<button class="ic-btn sec chico" data-mes="1" aria-label="Mes siguiente">▶</button><button class="ic-btn sec chico" data-mes="0">Hoy</button>' + (extra || '') + '</div>';
  }
  function conectarMes(c, repintar) {
    c.querySelectorAll('[data-mes]').forEach((b) => { b.onclick = () => { const d = Number(b.dataset.mes); if (d) moverMes(d); else App.estado.mes = Ope.ym(Ope.hoy()); repintar(); }; });
  }
  function semanaISO(s) { const d = Ope.aFecha(s); d.setDate(d.getDate() + 4 - (d.getDay() || 7)); const y0 = new Date(d.getFullYear(), 0, 1); return Math.ceil(((d - y0) / 86400000 + 1) / 7); }
  const errorCaja = (e) => '<div class="ic-alerta">No se pudo leer la programación: ' + esc(U.mensajeError(e)) + '</div>';

  // =====================================================================
  // AGENDA (sábana-calendario)
  // =====================================================================
  App.vistas.agenda = async function (c) {
    const tecOps = Ope.D.tecnicos.map((t) => '<option value="' + esc(t.Title) + '"' + (App.estado.tec === t.Title ? ' selected' : '') + '>' + esc(t.nombre) + '</option>').join('');
    const tipoOps = Ope.D.tipos.map((t) => '<option value="' + esc(t.Title) + '"' + (App.estado.tipo === t.Title ? ' selected' : '') + '>' + esc(t.nombre) + '</option>').join('');
    c.innerHTML = '<a class="ic-volver" href="#">← Menú principal</a>' +
      '<div class="ic-barra"><div style="flex:1"><h1 class="ic-titulo">Agenda</h1><p class="ic-subtitulo" style="margin:0">Los días hábiles en rojo no tienen técnico de oficina. Clic en una actividad para verla o editarla.</p></div>' +
      (App.puedeEditar() ? '<button class="ic-btn" id="bNueva">+ Nueva actividad</button>' : '') + '</div>' +
      '<div class="ic-filtros" id="barra"></div><div id="cal"><div class="ic-vacio">Cargando…</div></div>' +
      '<div class="ope-leyenda">' + Ope.D.tipos.filter((t) => t.estado !== 'INACTIVO').map((t) => App.chipTipo(t.Title) + ' ' + esc(t.nombre)).join(' &nbsp; ') +
      ' &nbsp; <span class="ope-dot"></span> con conflicto</div>';
    const bN = c.querySelector('#bNueva'); if (bN) bN.onclick = () => App.nuevaActividad({}, pintar);
    async function pintar() {
      c.querySelector('#barra').innerHTML = barraMes() +
        '<select id="fTipo"><option value="">Todos los tipos</option>' + tipoOps + '</select>' +
        '<select id="fTec"><option value="">Todos los técnicos</option>' + tecOps + '</select>';
      c.querySelector('#fTipo').value = App.estado.tipo; c.querySelector('#fTec').value = App.estado.tec;
      c.querySelector('#fTipo').onchange = (e) => { App.estado.tipo = e.target.value; dibujar(); };
      c.querySelector('#fTec').onchange = (e) => { App.estado.tec = e.target.value; dibujar(); };
      conectarMes(c, pintar);
      const k = mesActual(), ini = Ope.lunesDe(k + '-01'), [y, m] = k.split('-').map(Number), fin = Ope.sumar(Ope.lunesDe(Ope.finDeMes(y, m)), 6);
      try { await Ope.cargarRango(ini, fin); } catch (e) { c.querySelector('#cal').innerHTML = errorCaja(e); return; }
      dibujar();
    }
    function dibujar() {
      const k = mesActual(), ini = Ope.lunesDe(k + '-01'), [y, m] = k.split('-').map(Number), fin = Ope.sumar(Ope.lunesDe(Ope.finDeMes(y, m)), 6);
      let html = '<div class="ope-cal"><div class="cab sem">Sem.</div>' + Ope.DIAS.map((d, i) => '<div class="cab"><span class="l">' + d + '</span><span class="c">' + Ope.DIAS_CORTOS[i] + '</span></div>').join('');
      let s = ini;
      while (s <= fin) {
        if (Ope.dow(s) === 1) html += '<div class="sem">' + semanaISO(s) + '</div>';
        const fuera = Ope.ym(s) !== k, fest = Ope.esFestivo(s), habil = Ope.esHabil(s);
        const r = habil ? Ope.resumenDia(s) : null;
        const lista = Ope.delDia(s).filter(Ope.activa).filter((a) => (!App.estado.tipo || a.tipo === App.estado.tipo) && (!App.estado.tec || a.tecnico_id === App.estado.tec)).sort(Ope.orden);
        html += '<div class="dia' + (fuera ? ' fuera' : '') + (!habil ? ' nohabil' : '') + (r && r.estado === 'SIN' && !fuera ? ' sinofi' : '') + (s === Ope.hoy() ? ' hoy' : '') + '" data-fecha="' + s + '">' +
          '<div class="num"><span>' + Number(s.slice(8)) + '</span>' + (fest ? '<em>' + esc(Ope.D.festivos[s]) + '</em>' : '') +
          (App.puedeEditar() && !fuera ? '<button class="mas" data-nueva="' + s + '" title="Programar en esta fecha">+</button>' : '') + '</div>' +
          lista.map((a) => '<button class="ope-chip' + (Ope.validar(a).errores.length ? ' conf' : '') + (a.estado === 'EJECUTADO' ? ' hecho' : '') + '" style="--c:' + App.colorTipo(a.tipo) + '" data-id="' + esc(a.Title) + '" title="' + esc(Ope.nombreTec(a.tecnico_id) + ' · ' + Ope.nombreTipo(a.tipo) + (a.cliente ? ' · ' + a.cliente : '') + (a.ciudad ? ' · ' + a.ciudad : '') + ' · ' + Ope.nombreEstado(a.estado)) + '">' + esc(Ope.etiqueta(a)) + '</button>').join('') +
          (r && r.estado === 'SIN' && !fuera ? '<div class="sin">⚠ Sin técnico de oficina</div>' : '') +
          '</div>';
        s = Ope.sumar(s, 1);
      }
      html += '</div>';
      c.querySelector('#cal').innerHTML = html;
      c.querySelectorAll('.ope-chip[data-id]').forEach((b) => { b.onclick = (ev) => { ev.stopPropagation(); App.abrirActividad(Ope.buscar(b.dataset.id), pintar); }; });
      c.querySelectorAll('[data-nueva]').forEach((b) => { b.onclick = (ev) => { ev.stopPropagation(); App.nuevaActividad({ fecha: b.dataset.nueva, tipo: App.estado.tipo, tecnico_id: App.estado.tec }, pintar); }; });
    }
    pintar();
  };

  // =====================================================================
  // PROGRAMACIÓN SEMANAL (para publicar el viernes)
  // =====================================================================
  App.vistas.semana = async function (c) {
    if (!App.estado.semana) { const h = Ope.hoy(); App.estado.semana = Ope.lunesDe(Ope.dow(h) >= 5 ? Ope.sumar(h, 7) : h); }
    c.innerHTML = '<a class="ic-volver no-print" href="#">← Menú principal</a>' +
      '<div class="ic-barra no-print"><div style="flex:1"><h1 class="ic-titulo">Programación semanal</h1><p class="ic-subtitulo" style="margin:0">La programación de la semana siguiente se publica cada viernes.</p></div>' +
      '<button class="ic-btn sec" id="bCopiar">Copiar texto</button><button class="ic-btn" id="bImprimir">Imprimir / PDF</button></div>' +
      '<div class="ic-filtros no-print"><button class="ic-btn sec chico" data-s="-7">◀</button><b id="lblSem"></b><button class="ic-btn sec chico" data-s="7">▶</button>' +
      '<button class="ic-btn sec chico" data-s="hoy">Esta semana</button><button class="ic-btn sec chico" data-s="prox">Próxima semana</button></div>' +
      '<div id="sem"><div class="ic-vacio">Cargando…</div></div>';
    c.querySelectorAll('[data-s]').forEach((b) => {
      b.onclick = () => {
        const v = b.dataset.s, h = Ope.lunesDe(Ope.hoy());
        App.estado.semana = v === 'hoy' ? h : v === 'prox' ? Ope.sumar(h, 7) : Ope.sumar(App.estado.semana, Number(v));
        pintar();
      };
    });
    c.querySelector('#bImprimir').onclick = () => window.print();
    c.querySelector('#bCopiar').onclick = async () => {
      try { await navigator.clipboard.writeText(texto()); U.aviso('Texto copiado: péguelo en el correo o en el chat del equipo', 'ok'); }
      catch (e) { U.modal('Texto de la programación', '<textarea style="width:100%;height:360px">' + esc(texto()) + '</textarea>'); }
    };
    const dias = () => { const ini = App.estado.semana; const d = [0, 1, 2, 3, 4].map((i) => Ope.sumar(ini, i)); [5, 6].forEach((i) => { const s = Ope.sumar(ini, i); if (Ope.delDia(s).some(Ope.activa)) d.push(s); }); return d; };
    function texto() {
      const ini = App.estado.semana, fin = Ope.sumar(ini, 4);
      let t = 'PROGRAMACIÓN DE OPERACIONES · Ideas Control\nSemana del ' + Ope.textoFecha(ini) + ' al ' + Ope.textoFecha(fin) + '\n';
      dias().forEach((s) => {
        t += '\n' + Ope.textoFecha(s, true).toUpperCase() + (Ope.esFestivo(s) ? ' (festivo: ' + Ope.D.festivos[s] + ')' : '') + '\n';
        if (!Ope.esHabil(s) && !Ope.delDia(s).some(Ope.activa)) { t += '  No hábil\n'; return; }
        const r = Ope.resumenDia(s);
        t += '  Oficina (turno): ' + (r.oficina.map((x) => Ope.nombreTec(x.tecnico_id)).join(', ') || (r.estado === 'VACIO' ? 'sin técnico (definido)' : '⚠ SIN ASIGNAR')) + '\n';
        r.campo.sort(Ope.orden).forEach((a) => {
          t += '  • ' + Ope.nombreTec(a.tecnico_id) + ' — ' + Ope.nombreTipo(a.tipo) + (Ope.usaEquipos(a.tipo) && a.equipos ? ' (' + a.equipos + ' eq.)' : '') +
            (a.cliente ? ' · ' + a.cliente : '') + (a.ciudad ? ' · ' + a.ciudad : '') + (a.hora_inicio ? ' · ' + a.hora_inicio : '') + (a.ticket_os ? ' · ' + a.ticket_os : '') + '\n';
        });
        if (r.ausentes.length) t += '  Ausentes: ' + r.ausentes.map((x) => Ope.nombreTec(x.tecnico_id)).join(', ') + '\n';
        if (r.sinAsignar.length && Ope.esHabil(s)) t += '  Sin asignar (en oficina): ' + r.sinAsignar.map((x) => x.nombre).join(', ') + '\n';
      });
      return t;
    }
    async function pintar() {
      const ini = App.estado.semana, fin = Ope.sumar(ini, 6);
      c.querySelector('#lblSem').textContent = 'Semana ' + semanaISO(ini) + ' · ' + Ope.textoFecha(ini) + ' – ' + Ope.textoFecha(Ope.sumar(ini, 4));
      try { await Ope.cargarRango(ini, fin); } catch (e) { c.querySelector('#sem').innerHTML = errorCaja(e); return; }
      const ds = dias();
      const acts = Ope.delRango(ini, fin).filter(Ope.activa);
      const tecs = Ope.D.tecnicos.filter((t) => (t.estado !== 'INACTIVO' && t.vinculacion === 'IDEAS_CONTROL') || acts.some((a) => a.tecnico_id === t.Title));
      const sinTec = acts.filter((a) => !a.tecnico_id && a.tipo !== 'OFI');
      let html = '<div class="ope-print-cab"><img src="' + CFG.logo + '" alt=""><div><b>Programación de Operaciones</b><span>Semana del ' + esc(Ope.textoFecha(ini)) + ' al ' + esc(Ope.textoFecha(Ope.sumar(ini, 4))) + '</span></div></div>' +
        '<div class="ic-tabla-caja ope-scroll"><table class="ic-tabla ope-semana"><thead><tr><th>Técnico</th>' +
        ds.map((s) => '<th class="' + (Ope.esHabil(s) ? '' : 'nohabil') + '">' + esc(Ope.DIAS[Ope.dow(s) - 1]) + '<span class="sec">' + esc(Ope.textoFecha(s)) + (Ope.esFestivo(s) ? ' · festivo' : '') + '</span></th>').join('') + '</tr></thead><tbody>';
      html += '<tr class="ofi"><td><b>Oficina (turno)</b></td>' + ds.map((s) => {
        if (!Ope.esHabil(s)) return '<td class="nohabil"></td>';
        const r = Ope.resumenDia(s);
        return '<td class="' + (r.estado === 'SIN' ? 'sinofi' : '') + '">' + (r.oficina.length ? r.oficina.map((x) => '<b>' + esc(Ope.nombreTec(x.tecnico_id)) + '</b>').join(', ') : r.estado === 'VACIO' ? '— Sin técnico (definido)' : '⚠ Sin asignar') + '</td>';
      }).join('') + '</tr>';
      tecs.concat(sinTec.length ? [{ Title: '', nombre: '— Sin técnico —' }] : []).forEach((t) => {
        html += '<tr><td><b>' + esc(t.nombre) + '</b>' + (t.vinculacion === 'TECNICO_CAMPO' ? '<span class="sec">Técnico de campo</span>' : '') + '</td>' + ds.map((s) => {
          const del = acts.filter((a) => a.fecha === s && (a.tecnico_id || '') === t.Title && a.tipo !== 'OFI').sort(Ope.orden);
          const turno = acts.some((a) => a.fecha === s && a.tecnico_id === t.Title && a.tipo === 'OFI');
          let cel = del.map((a) => '<div class="ope-sem-item" data-id="' + esc(a.Title) + '">' + App.chipTipo(a.tipo) + ' ' + esc(a.tipo === 'AUS' ? 'Ausencia' : (a.cliente || Ope.nombreTipo(a.tipo))) +
            '<span class="sec">' + esc([a.ciudad, a.hora_inicio, Ope.usaEquipos(a.tipo) && a.equipos ? a.equipos + ' eq.' : ''].filter(Boolean).join(' · ')) + '</span>' + (Ope.validar(a).errores.length ? ' <span class="ope-rojo" title="' + esc(Ope.validar(a).errores.join('; ')) + '">⚠</span>' : '') + '</div>').join('');
          if (turno) cel = '<div class="ope-sem-item turno">Turno de oficina</div>' + cel;
          if (!cel && Ope.esHabil(s) && t.vinculacion === 'IDEAS_CONTROL' && t.estado !== 'INACTIVO') cel = '<span class="ope-nota">Sin asignar · oficina</span>';
          return '<td class="' + (Ope.esHabil(s) ? '' : 'nohabil') + '">' + cel + '</td>';
        }).join('') + '</tr>';
      });
      html += '</tbody></table></div><p class="ope-nota">Generado ' + esc(U.fmt.fechaHora(new Date().toISOString())) + ' por ' + esc(App.usuario.nombre) + ' · ' + esc(CFG.manual) + '</p>';
      c.querySelector('#sem').innerHTML = html;
      c.querySelectorAll('.ope-sem-item[data-id]').forEach((el) => { el.onclick = () => App.abrirActividad(Ope.buscar(el.dataset.id), pintar); });
    }
    pintar();
  };

  // =====================================================================
  // ROTACIÓN DE OFICINA
  // =====================================================================
  App.vistas.rotacion = async function (c) {
    c.innerHTML = '<a class="ic-volver" href="#">← Menú principal</a>' +
      '<div class="ic-barra"><div style="flex:1"><h1 class="ic-titulo">Rotación de oficina</h1><p class="ic-subtitulo" style="margin:0">Días hábiles del mes (sin festivos). Solo rotan técnicos de Ideas Control. Quien no tenga asignación debe estar en la oficina.</p></div>' +
      (App.puedeEditar() ? '<button class="ic-btn" id="bSugerir">Completar rotación del mes</button>' : '') + '</div>' +
      '<div class="ic-filtros" id="barra"></div><div id="resumen"></div><div id="tabla"><div class="ic-vacio">Cargando…</div></div>';
    const bS = c.querySelector('#bSugerir'); if (bS) bS.onclick = () => sugerir(pintar);
    async function pintar() {
      c.querySelector('#barra').innerHTML = barraMes(); conectarMes(c, pintar);
      const k = mesActual(), [y, m] = k.split('-').map(Number);
      try { await Ope.cargarRango(Ope.sumar(k + '-01', -31), Ope.finDeMes(y, m)); } catch (e) { c.querySelector('#tabla').innerHTML = errorCaja(e); return; }
      const dias = Ope.diasHabilesMes(y, m).map(Ope.resumenDia);
      const conteo = {}; Ope.tecnicosIC().forEach((t) => { conteo[t.Title] = 0; });
      dias.forEach((d) => d.oficina.forEach((x) => { conteo[x.tecnico_id] = (conteo[x.tecnico_id] || 0) + 1; }));
      c.querySelector('#resumen').innerHTML = '<div class="ope-turnos">' + Object.keys(conteo).map((id) => '<div><b>' + conteo[id] + '</b><span>' + esc(Ope.nombreTec(id)) + '</span></div>').join('') +
        '<div class="' + (dias.some((d) => d.estado === 'SIN') ? 'rojo' : '') + '"><b>' + dias.filter((d) => d.estado === 'SIN').length + '</b><span>Días sin técnico</span></div></div>';
      c.querySelector('#tabla').innerHTML = '<div class="ic-tabla-caja ope-scroll"><table class="ic-tabla"><thead><tr><th>Fecha</th><th>Técnico de oficina</th><th>Estado</th><th>Técnicos de IC sin asignar (en oficina)</th><th>Actividades en campo ese día</th></tr></thead><tbody>' +
        dias.map((d) => '<tr data-f="' + d.fecha + '" class="' + (d.estado === 'SIN' || d.estado === 'VARIOS' ? 'ope-fila-err' : '') + (d.fecha === Ope.hoy() ? ' ope-hoy' : '') + '">' +
          '<td><b>' + esc(Ope.textoFecha(d.fecha)) + '</b><span class="sec">' + esc(Ope.DIAS[Ope.dow(d.fecha) - 1]) + '</span></td>' +
          '<td>' + (d.oficina.map((x) => '<a href="javascript:void 0" data-id="' + esc(x.Title) + '">' + esc(Ope.nombreTec(x.tecnico_id)) + '</a>').join(', ') || '—') + '</td>' +
          '<td>' + (d.estado === 'SIN' ? '<span class="ope-val err">⚠ Sin asignar</span>' + (App.puedeEditar() ? ' <button class="ic-btn chico" data-asignar="' + d.fecha + '">Asignar</button>' : '') : d.estado === 'VARIOS' ? '<span class="ope-val err">⚠ Más de uno</span>' : d.estado === 'VACIO' ? '<span class="ope-val gris">— Sin técnico (definido)</span>' : '<span class="ope-val ok">✔ OK</span>') + '</td>' +
          '<td>' + esc(d.sinAsignar.map((t) => t.nombre).join(', ')) + (d.ausentes.length ? '<span class="sec">Ausentes: ' + esc(d.ausentes.map((x) => Ope.nombreTec(x.tecnico_id)).join(', ')) + '</span>' : '') + '</td>' +
          '<td>' + d.campo.sort(Ope.orden).map((a) => '<span class="ope-chip mini" style="--c:' + App.colorTipo(a.tipo) + '" data-id="' + esc(a.Title) + '">' + esc(Ope.etiqueta(a)) + '</span>').join(' ') + '</td></tr>').join('') +
        '</tbody></table></div>';
      c.querySelectorAll('#tabla [data-id]').forEach((el) => { el.onclick = (ev) => { ev.stopPropagation(); App.abrirActividad(Ope.buscar(el.dataset.id), pintar); }; });
      c.querySelectorAll('[data-asignar]').forEach((b) => { b.onclick = (ev) => { ev.stopPropagation(); asignar(b.dataset.asignar, pintar); }; });
    }
    pintar();
  };

  function candidatosOficina(s) {
    const dd = Ope.delDia(s).filter(Ope.activa);
    return Ope.tecnicosIC().filter((t) => Ope.puede(t, 'OFI') && !dd.some((x) => x.tecnico_id === t.Title));
  }
  function asignar(s, alCambiar) {
    const cand = candidatosOficina(s);
    if (!cand.length) { U.aviso('Ningún técnico de Ideas Control está libre ese día.', 'warn'); return; }
    U.modal('Turno de oficina · ' + Ope.textoFecha(s, true), '<form class="ic-form" id="fAs"><div class="ic-campos">' +
      U.campo({ name: 'tecnico_id', label: 'Técnico de turno', t: 'select', op: cand.map((t) => [t.Title, t.nombre]), c: 'c12', req: true }) +
      '</div><p class="ope-nota">Solo se listan técnicos de Ideas Control habilitados para Oficina y sin otra asignación ese día.</p>' +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="aNo">Cancelar</button><button class="ic-btn" id="aOk">Asignar turno</button></div></form>',
    (cu) => {
      cu.querySelector('#aNo').onclick = U.cerrarModal;
      cu.querySelector('#fAs').onsubmit = async (ev) => {
        ev.preventDefault();
        const v = U.leerForm(cu.querySelector('#fAs')); if (!v.tecnico_id) return;
        try {
          await U.conCarga(cu.querySelector('#aOk'), () => Ope.crearActividad({ fecha: s, tecnico_id: v.tecnico_id, tipo: 'OFI', cliente: 'Oficina', ciudad: 'Oficina principal', estado: 'PROGRAMADO' }));
          U.aviso('Turno asignado', 'ok'); U.cerrarModal(); alCambiar();
        } catch (e) { U.aviso(U.mensajeError(e), 'err', 7000); }
      };
    });
  }

  // Propuesta automática: reparte los días sin técnico entre quienes estén libres, equilibrando turnos del mes
  async function sugerir(alCambiar) {
    const k = mesActual(), [y, m] = k.split('-').map(Number), h = Ope.hoy();
    const dias = Ope.diasHabilesMes(y, m).filter((d) => d >= h);
    const turnos = {}, ultimo = {};
    Ope.tecnicosIC().forEach((t) => { turnos[t.Title] = 0; ultimo[t.Title] = ''; });
    Ope.delRango(Ope.sumar(k + '-01', -31), Ope.finDeMes(y, m)).filter((a) => Ope.activa(a) && a.tipo === 'OFI').forEach((a) => {
      if (Ope.ym(a.fecha) === k) turnos[a.tecnico_id] = (turnos[a.tecnico_id] || 0) + 1;
      if (a.fecha > (ultimo[a.tecnico_id] || '')) ultimo[a.tecnico_id] = a.fecha;
    });
    const propuesta = [], sinCand = [];
    dias.forEach((d) => {
      if (Ope.resumenDia(d).estado !== 'SIN') return;
      const cand = candidatosOficina(d);
      if (!cand.length) { sinCand.push(d); return; }
      cand.sort((a, b) => turnos[a.Title] - turnos[b.Title] || String(ultimo[a.Title]).localeCompare(String(ultimo[b.Title])));
      const t = cand[0]; turnos[t.Title]++; ultimo[t.Title] = d;
      propuesta.push({ fecha: d, tecnico_id: t.Title });
    });
    if (!propuesta.length) { U.aviso(sinCand.length ? 'Hay días sin técnico, pero nadie está libre: ' + sinCand.map((d) => Ope.textoFecha(d)).join(', ') : 'La rotación del mes ya está completa desde hoy.', sinCand.length ? 'warn' : 'ok', 7000); return; }
    U.modal('Completar rotación · ' + nombreMes(k), '<div class="ic-form"><p style="margin-top:0">Se propone asignar el turno de oficina en <b>' + propuesta.length + '</b> días hábiles sin técnico (desde hoy), repartiendo de forma equilibrada entre los técnicos libres:</p>' +
      '<div class="ic-tabla-caja"><table class="ic-tabla"><thead><tr><th>Fecha</th><th>Técnico de turno</th></tr></thead><tbody>' +
      propuesta.map((p) => '<tr><td>' + esc(Ope.textoFecha(p.fecha, true)) + '</td><td>' + esc(Ope.nombreTec(p.tecnico_id)) + '</td></tr>').join('') + '</tbody></table></div>' +
      (sinCand.length ? '<div class="ic-alerta chica">Sin técnico libre: ' + esc(sinCand.map((d) => Ope.textoFecha(d)).join(', ')) + '</div>' : '') +
      '<p class="ope-nota">Puede ajustar cualquier turno después desde la agenda.</p>' +
      '<div class="ic-acciones"><button class="ic-btn sec" id="sNo">Cancelar</button><button class="ic-btn" id="sOk">Crear ' + propuesta.length + ' turnos</button></div></div>',
    (cu) => {
      cu.querySelector('#sNo').onclick = U.cerrarModal;
      cu.querySelector('#sOk').onclick = async () => {
        const b = cu.querySelector('#sOk'); b.disabled = true;
        try {
          for (let i = 0; i < propuesta.length; i++) {
            b.textContent = 'Creando ' + (i + 1) + ' de ' + propuesta.length + '…';
            await Ope.crearActividad(Object.assign({ tipo: 'OFI', cliente: 'Oficina', ciudad: 'Oficina principal', estado: 'PROGRAMADO' }, propuesta[i]));
          }
          U.aviso(propuesta.length + ' turnos creados', 'ok'); U.cerrarModal(); alCambiar();
        } catch (e) { U.aviso(U.mensajeError(e), 'err', 7000); b.disabled = false; b.textContent = 'Reintentar'; alCambiar(); }
      };
    });
  }

  // =====================================================================
  // CARGA POR TÉCNICO
  // =====================================================================
  App.vistas.carga = async function (c) {
    c.innerHTML = '<a class="ic-volver" href="#">← Menú principal</a><h1 class="ic-titulo">Carga por técnico</h1>' +
      '<p class="ic-subtitulo">Actividades del mes, sin canceladas ni reprogramadas.</p><div class="ic-filtros" id="barra"></div><div id="tabla"><div class="ic-vacio">Cargando…</div></div>';
    async function pintar() {
      c.querySelector('#barra').innerHTML = barraMes(); conectarMes(c, pintar);
      const k = mesActual(), [y, m] = k.split('-').map(Number), ini = k + '-01', fin = Ope.finDeMes(y, m);
      try { await Ope.cargarRango(ini, fin); } catch (e) { c.querySelector('#tabla').innerHTML = errorCaja(e); return; }
      const acts = Ope.delRango(ini, fin).filter(Ope.activa);
      const tipos = Ope.D.tipos.filter((t) => acts.some((a) => a.tipo === t.Title));
      const tecs = Ope.D.tecnicos.filter((t) => t.estado !== 'INACTIVO' || acts.some((a) => a.tecnico_id === t.Title));
      const habiles = Ope.diasHabilesMes(y, m).length;
      const fila = (t) => {
        const mias = acts.filter((a) => a.tecnico_id === t.Title);
        const diasCon = new Set(mias.map((a) => a.fecha)).size;
        const eq = mias.filter((a) => Ope.usaEquipos(a.tipo)).reduce((s, a) => s + (Number(a.equipos) || 0), 0);
        return '<tr><td><b>' + esc(t.nombre) + '</b><span class="sec">' + esc(t.vinculacion === 'TECNICO_CAMPO' ? 'Técnico de campo' : 'Ideas Control') + '</span></td>' +
          tipos.map((tp) => { const n = mias.filter((a) => a.tipo === tp.Title).length; return '<td class="num' + (n ? '' : ' cero') + '">' + (n || '·') + '</td>'; }).join('') +
          '<td class="num"><b>' + mias.length + '</b></td><td class="num">' + eq + '</td><td class="num">' + diasCon + ' / ' + habiles + '</td></tr>';
      };
      c.querySelector('#tabla').innerHTML = !acts.length ? '<div class="ic-tabla-caja"><div class="ic-vacio">No hay actividades en ' + esc(nombreMes(k)) + '.</div></div>' :
        '<div class="ic-tabla-caja ope-scroll"><table class="ic-tabla ope-carga"><thead><tr><th>Técnico</th>' + tipos.map((t) => '<th class="num" title="' + esc(t.nombre) + '">' + App.chipTipo(t.Title) + '</th>').join('') +
        '<th class="num">Total</th><th class="num">Equipos INS/MTO</th><th class="num">Días con asignación</th></tr></thead><tbody>' + tecs.map(fila).join('') + '</tbody></table></div>' +
        '<p class="ope-nota">Columnas: ' + tipos.map((t) => esc(t.Title + ' = ' + t.nombre)).join(' · ') + '</p>';
    }
    pintar();
  };
})();
