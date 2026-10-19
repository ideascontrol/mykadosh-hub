/* =====================================================================
   APP-101 · Comercial — Gestión comercial · Fase 1: interacciones y agenda
   - Registrar interacción (llamada, correo, WhatsApp/chat, Teams, visita):
     desde la ficha de la empresa, la ficha de la cotización o Mis pendientes.
   - Tipificación en 3 niveles: ¿hubo contacto? (fijo) › resultado › detalle
     (COM_Tipificaciones, administrable). La acción del resultado decide qué sigue:
       AGENDAR (próxima acción obligatoria) · COTIZAR (abre la cotización)
       FINAL · NO_CONTACTAR (marca al contacto y cancela sus pendientes) · NINGUNA
   - La próxima acción vive en la misma interacción (proxima_*). Al registrar el
     resultado de un pendiente, el pendiente queda HECHA y apunta a la nueva interacción.
   - Ruta #agenda (Mis pendientes). Línea de tiempo en la ficha de la empresa.
   Listas: COM_Interacciones · COM_Tipificaciones · MAE_Contactos (no_contactar)
   ===================================================================== */
(function () {
  const U = IC.ui, G = IC.graph, esc = U.esc;
  const pad = (n, w) => String(n).padStart(w, '0');
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2);
  const hoy = () => iso(new Date());
  const fl = (v) => { if (!v) return ''; const s = String(v); return s.length > 10 ? iso(new Date(s)) : s.slice(0, 10); };   // fecha local
  const horaLocal = (v) => { if (!v) return ''; const d = new Date(v); return pad(d.getHours(), 2) + ':' + pad(d.getMinutes(), 2); };
  const aInputDT = (d) => iso(d) + 'T' + pad(d.getHours(), 2) + ':' + pad(d.getMinutes(), 2);
  const yo = () => App.usuario.usuario_id;
  const nombreUsuario = (id) => { const u = (App.usuarios || []).find((x) => x.Title === id); return u ? u.nombre : (id || '—'); };
  const inicialesUsuario = (id) => { const u = (App.usuarios || []).find((x) => x.Title === id); return u ? u.iniciales : (id || ''); };

  const CANALES = [['LLAMADA', 'Llamada'], ['CORREO', 'Correo'], ['WHATSAPP', 'WhatsApp / chat'], ['TEAMS', 'Teams / videollamada'], ['VISITA', 'Visita'], ['OTRO', 'Otro']];
  const CON_DURACION = ['LLAMADA', 'TEAMS', 'VISITA'];
  const LOGRO = [['DECISOR', 'Sí, con quien decide'], ['OTRO', 'Sí, con otra persona'], ['NO', 'No hubo contacto']];
  const ACCIONES = [['AGENDAR', 'Exige próxima acción'], ['COTIZAR', 'Ofrece crear la cotización'], ['FINAL', 'Cierra el seguimiento'], ['NO_CONTACTAR', 'Marca «no volver a contactar»'], ['NINGUNA', 'Sin acción especial']];
  const SUGERIDA = { 'Pide visita o demostración': 'Hacer la visita o demostración', 'Volver a llamar': 'Volver a llamar', 'Seguimiento a cotización enviada': 'Hacer seguimiento a la cotización',
    'No contesta': 'Intentar de nuevo', 'Buzón de voz / mensaje dejado': 'Intentar de nuevo', 'Línea ocupada': 'Intentar de nuevo', 'Interesado, quiere más información': 'Enviar información y hacer seguimiento' };
  const ICO = {
    LLAMADA: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    CORREO: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    WHATSAPP: '<path d="M21 11.5a8.4 8.4 0 0 1-12.6 7.3L3 20l1.3-5A8.4 8.4 0 1 1 21 11.5z"/>',
    TEAMS: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 8-6 4 6 4V8z"/>',
    VISITA: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    OTRO: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
    COT: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>'
  };
  const icono = (k) => '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + (ICO[k] || ICO.OTRO) + '</svg>';
  const nombreCanal = (k) => (CANALES.find((x) => x[0] === k) || [k, k])[1];

  // ---------- Datos ----------
  // D.listo = false mientras no existan las listas nuevas (falta ejecutar el Instalador)
  const D = { interacciones: [], tipos: [], listo: false, cargado: 0 };
  async function cargar(forzar) {
    if (!forzar && D.cargado && Date.now() - D.cargado < 60000) return;
    try {
      const r = await Promise.all([G.items('COM_Interacciones', { top: 5000 }), G.items('COM_Tipificaciones'), App.empresas.cargar(forzar)]);
      D.interacciones = r[0].sort((a, b) => String(b.fecha_hora || '').localeCompare(String(a.fecha_hora || '')));
      D.tipos = r[1].sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99) || String(a.nombre).localeCompare(String(b.nombre), 'es'));
      D.listo = true;
    } catch (e) {
      if (/no existe|not found|404|No se encontr/i.test(U.mensajeError(e) + (e.status || ''))) { D.listo = false; await App.empresas.cargar(forzar); }
      else throw e;
    }
    D.cargado = Date.now();
  }
  const tipo = (id) => D.tipos.find((t) => t.Title === id);
  const resultados = (aplica) => D.tipos.filter((t) => t.nivel === 'RESULTADO' && t.aplica === aplica && t.estado !== 'INACTIVO');
  const detalles = (padre) => D.tipos.filter((t) => t.nivel === 'DETALLE' && t.padre_id === padre && t.estado !== 'INACTIVO');
  const textoResultado = (x) => [tipo(x.resultado_id) ? tipo(x.resultado_id).nombre : '', tipo(x.detalle_id) ? tipo(x.detalle_id).nombre : ''].filter(Boolean).join(' › ');
  const empresaDe = (id) => App.empresas.datos.empresas.find((e) => e.Title === id);
  const contactoDe = (id) => App.empresas.datos.contactos.find((c) => c.Title === id);
  const nombreContacto = (c) => c ? ((c.nombres || '') + ' ' + (c.apellidos || '')).trim() : '';
  const avisoInstalador = '<div class="ic-alerta chica">Para usar las interacciones falta crear sus listas en SharePoint: el administrador debe abrir el Instalador (…/Comercial/Instalador/) y hacer clic en «Crear estructura».</div>';

  // Pendientes = interacciones con próxima acción abierta
  const pendientes = () => D.interacciones.filter((x) => x.proxima_estado === 'PENDIENTE' && x.proxima_fecha);
  const estadoPend = (x) => { const f = fl(x.proxima_fecha), h = hoy(); return f < h ? 'vencido' : f === h ? 'hoy' : 'proximo'; };

  // Enlaces rápidos para contactar
  const telLimpio = (t) => String(t || '').replace(/[^\d+]/g, '');
  const waNumero = (t) => { let d = String(t || '').replace(/\D/g, ''); if (d.length === 10 && d[0] === '3') d = '57' + d; return d; };
  function enlacesContacto(c) {
    if (!c) return '';
    const l = [];
    if (c.celular) l.push('<a href="tel:' + esc(telLimpio(c.celular)) + '" title="Llamar">' + icono('LLAMADA') + esc(c.celular) + '</a>', '<a href="https://wa.me/' + esc(waNumero(c.celular)) + '" target="_blank" rel="noopener" title="WhatsApp">' + icono('WHATSAPP') + 'WhatsApp</a>');
    if (c.telefono) l.push('<a href="tel:' + esc(telLimpio(c.telefono)) + '">' + icono('LLAMADA') + esc(c.telefono + (c.extension ? ' ext. ' + c.extension : '')) + '</a>');
    if (c.email) l.push('<a href="mailto:' + esc(c.email) + '">' + icono('CORREO') + esc(c.email) + '</a>');
    return '<span class="ic-int-enlaces">' + l.join('') + '</span>';
  }

  // =====================================================================
  // FORMULARIO: REGISTRAR INTERACCIÓN
  // o = { empresa_id?, contacto_id?, cotizacion_id?, pendiente?, alGuardar? }
  // =====================================================================
  async function registrar(o) {
    o = o || {};
    try { await cargar(); } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); return; }
    if (!D.listo) { U.modal('Registrar interacción', avisoInstalador); return; }
    const S = { empresa_id: o.empresa_id || (o.pendiente && o.pendiente.empresa_id) || '', contacto_id: o.contacto_id || (o.pendiente && o.pendiente.contacto_id) || '',
      cotizacion_id: o.cotizacion_id || (o.pendiente && o.pendiente.cotizacion_id) || '', canal: 'LLAMADA', direccion: 'SALIENTE', logro: '', resultado: '', detalle: '' };
    const ahora = new Date(); ahora.setSeconds(0, 0);
    const manana = new Date(); manana.setDate(manana.getDate() + 1); manana.setHours(9, 0, 0, 0);
    const usuariosAct = (App.usuarios || []).filter((u) => u.estado === 'ACTIVO');
    const titulo = o.pendiente ? 'Registrar resultado · ' + (o.pendiente.proxima_accion || 'pendiente') : 'Registrar interacción';
    U.modal(titulo, '<form class="ic-form ic-int-form" id="fInt" novalidate>' +
      (o.pendiente ? '<p class="ic-conteo" style="margin:0 0 10px">Pendiente del ' + U.fmt.fecha(fl(o.pendiente.proxima_fecha) + 'T12:00:00') + '. Al guardar queda como hecho.</p>' : '') +
      '<div id="iEmp"></div>' +
      '<div class="ic-campos">' +
        '<div class="ic-campo c12"><label>Canal</label><div class="ic-chips ic-int-chips" id="iCanal">' + CANALES.map((x) => '<button type="button" data-v="' + x[0] + '">' + icono(x[0]) + x[1] + '</button>').join('') + '</div></div>' +
        U.campo({ name: 'direccion', label: 'Quién inició', t: 'select', op: [['SALIENTE', 'Nosotros (saliente)'], ['ENTRANTE', 'El cliente (entrante)']], valor: 'SALIENTE', vacio: false, c: 'c4' }) +
        U.campo({ name: 'fecha_hora', label: 'Fecha y hora', t: 'datetime-local', valor: aInputDT(ahora), c: 'c5' }) +
        '<div id="iDur" class="ic-campo c3"><label for="f_duracion">Duración (min)</label><input id="f_duracion" name="duracion" inputmode="numeric" autocomplete="off"></div>' +
        '<div class="ic-campo c12"><label>¿Logró hablar o tener respuesta? <span class="req">*</span></label><div class="ic-chips ic-int-chips" id="iLogro">' + LOGRO.map((x) => '<button type="button" data-v="' + x[0] + '">' + x[1] + '</button>').join('') + '</div></div>' +
        '<div id="iRes" class="c12" style="display:contents"></div>' +
        U.campo({ name: 'notas', label: 'Notas', t: 'textarea', filas: 3, c: 'c12', ph: 'Qué se habló, qué pidió el cliente, compromisos…' }) +
      '</div>' +
      '<fieldset class="ic-int-prox" id="iProx"><legend>Próxima acción</legend><div class="ic-campos">' +
        U.campo({ name: 'proxima_accion', label: 'Qué hay que hacer', c: 'c12', ph: 'Ej.: llamar para confirmar la visita', max: 120 }) +
        U.campo({ name: 'proxima_fecha', label: 'Cuándo', t: 'datetime-local', valor: aInputDT(manana), c: 'c6' }) +
        U.campo({ name: 'proxima_responsable', label: 'Responsable', t: 'select', op: usuariosAct.map((u) => [u.Title, u.nombre]), valor: yo(), vacio: false, c: 'c6', disabled: !App.usuario.es_admin }) +
      '</div><p class="ic-conteo" id="iProxAyuda" style="margin:4px 0 0"></p></fieldset>' +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="bC">Cancelar</button><button class="ic-btn" id="bG">Guardar</button></div></form>', (m) => {
      const f = U.$('#fInt', m);
      U.$('#bC', m).onclick = U.cerrarModal;
      // Empresa y contacto
      const pintarEmpresa = () => {
        const z = U.$('#iEmp', m), e = empresaDe(S.empresa_id);
        if (!e) {
          z.innerHTML = '<div class="ic-campo"><label>Empresa <span class="req">*</span></label><div class="ic-buscar"><input id="iBEmp" type="search" placeholder="Escriba el nombre o NIT" autocomplete="off"></div><div class="ic-sugerencias" id="iSEmp"></div></div>';
          const inp = U.$('#iBEmp', z);
          inp.oninput = () => { const t = U.norm(inp.value);
            const r = !t ? [] : App.empresas.datos.empresas.filter((x) => x.estado !== 'INACTIVO' && U.norm([x.razon_social, x.nit, x.codigo_cliente, x.ciudad].join(' ')).includes(t)).slice(0, 8);
            U.$('#iSEmp', z).innerHTML = r.map((x) => '<button type="button" data-id="' + esc(x.Title) + '"><b>' + esc(x.razon_social) + '</b><span>' + esc((x.nit || '') + ' · ' + (x.ciudad || '')) + '</span></button>').join('') || (t ? '<div class="vacio">Sin resultados</div>' : '');
            U.$('#iSEmp', z).querySelectorAll('button').forEach((b) => { b.onclick = () => { S.empresa_id = b.dataset.id; S.contacto_id = ''; pintarEmpresa(); }; }); };
          setTimeout(() => inp.focus(), 30);
          return;
        }
        const cs = App.empresas.datos.contactos.filter((x) => x.empresa_id === e.Title && x.estado !== 'INACTIVO');
        if (!S.contacto_id && cs.length === 1) S.contacto_id = cs[0].Title;
        z.innerHTML = '<div class="ic-cliente-sel" style="margin-bottom:10px"><div><b>' + esc(e.razon_social) + '</b><span class="sec">' + esc((e.nit || '') + ' · ' + (e.ciudad || '')) + '</span></div>' +
          (o.empresa_id || o.pendiente ? '' : '<button type="button" class="ic-btn sec chico" id="iCambiar">Cambiar</button>') + '</div>' +
          '<div class="ic-campos">' + U.campo({ name: 'contacto_id', label: 'Contacto', t: 'select', op: cs.map((x) => [x.Title, nombreContacto(x) + (x.cargo ? ' · ' + x.cargo : '') + (x.no_contactar ? ' · NO CONTACTAR' : '')]), valor: S.contacto_id, vacio: cs.length ? 'Sin contacto específico' : 'La empresa no tiene contactos', c: 'c12' }) + '</div>' +
          '<div id="iCInfo"></div>';
        const bc = U.$('#iCambiar', z); if (bc) bc.onclick = () => { S.empresa_id = ''; S.contacto_id = ''; pintarEmpresa(); };
        const info = () => { const c = contactoDe(S.contacto_id);
          U.$('#iCInfo', z).innerHTML = c ? (c.no_contactar ? '<div class="ic-alerta chica">Este contacto pidió no volver a ser contactado' + (c.no_contactar_nota ? ': ' + esc(c.no_contactar_nota) : '') + '. Registre solo si fue él quien se comunicó.</div>' : '') + '<div style="margin:2px 0 8px">' + enlacesContacto(c) + '</div>' : ''; };
        z.querySelector('[name=contacto_id]').onchange = (ev) => { S.contacto_id = ev.target.value; info(); };
        info();
      };
      pintarEmpresa();
      // Canal
      const marcar = (sel, v) => m.querySelectorAll(sel + ' button').forEach((b) => b.classList.toggle('activo', b.dataset.v === v));
      const pintarCanal = () => { marcar('#iCanal', S.canal); U.$('#iDur', m).style.display = CON_DURACION.indexOf(S.canal) >= 0 ? '' : 'none'; };
      m.querySelectorAll('#iCanal button').forEach((b) => { b.onclick = () => { S.canal = b.dataset.v; pintarCanal(); }; });
      pintarCanal();
      // ¿Logró contacto? → resultados → detalle → próxima acción
      const pintarProx = () => {
        const r = tipo(S.resultado), acc = r ? r.accion : '';
        const fs = U.$('#iProx', m), ay = U.$('#iProxAyuda', m);
        fs.style.display = acc === 'NO_CONTACTAR' ? 'none' : '';
        fs.classList.toggle('opcional', acc !== 'AGENDAR');
        ay.textContent = acc === 'AGENDAR' ? 'Obligatoria para este resultado.' : acc === 'COTIZAR' ? 'Opcional. Al guardar podrá crear la cotización.' : acc === 'FINAL' ? 'Opcional: este resultado cierra el seguimiento.' : 'Opcional.';
        const pa = f.querySelector('[name=proxima_accion]');
        if (r && !pa.dataset.tocado) pa.value = acc === 'AGENDAR' ? (SUGERIDA[r.nombre] || '') : '';
        if (acc !== 'AGENDAR' && !pa.dataset.tocado) pa.value = '';
      };
      const pintarDetalle = () => {
        const z = U.$('#iDet', m); if (!z) return;
        const ds = S.resultado ? detalles(S.resultado) : [];
        z.innerHTML = ds.length ? U.campo({ name: 'detalle_id', label: 'Detalle (opcional)', t: 'select', op: ds.map((d) => [d.Title, d.nombre]), valor: S.detalle, vacio: 'Sin detalle', c: 'c12' }) : '';
        const s = z.querySelector('select'); if (s) s.onchange = (ev) => { S.detalle = ev.target.value; };
      };
      const pintarResultados = () => {
        const z = U.$('#iRes', m);
        if (!S.logro) { z.innerHTML = ''; return; }
        const rs = resultados(S.logro === 'NO' ? 'NO_CONTACTO' : 'CONTACTO');
        z.innerHTML = U.campo({ name: 'resultado_id', label: 'Resultado', t: 'select', op: rs.map((r) => [r.Title, r.nombre]), valor: S.resultado, req: true, c: 'c12' }) + '<div id="iDet" class="c12" style="display:contents"></div>';
        z.querySelector('[name=resultado_id]').onchange = (ev) => { S.resultado = ev.target.value; S.detalle = ''; pintarDetalle(); pintarProx(); };
        pintarDetalle();
      };
      m.querySelectorAll('#iLogro button').forEach((b) => { b.onclick = () => { S.logro = b.dataset.v; S.resultado = ''; S.detalle = ''; marcar('#iLogro', S.logro); pintarResultados(); pintarProx(); }; });
      f.querySelector('[name=proxima_accion]').oninput = (ev) => { ev.target.dataset.tocado = ev.target.value ? '1' : ''; };
      pintarProx();

      f.onsubmit = async (ev) => {
        ev.preventDefault();
        const v = U.leerForm(f), err = {}, r = tipo(S.resultado), acc = r ? r.accion : '';
        if (!S.empresa_id) { U.aviso('Elija la empresa', 'warn'); return; }
        if (!S.logro) { U.aviso('Indique si logró hablar o tener respuesta', 'warn'); return; }
        if (!S.resultado) err.resultado_id = 'Elija el resultado';
        if (!v.fecha_hora) err.fecha_hora = 'Obligatoria'; else if (new Date(v.fecha_hora) > new Date(Date.now() + 5 * 60000)) err.fecha_hora = 'No puede ser futura';
        if (v.duracion && !/^\d{1,3}$/.test(v.duracion)) err.duracion = 'Minutos';
        const conProx = acc !== 'NO_CONTACTAR' && (acc === 'AGENDAR' || v.proxima_accion);
        if (conProx) {
          if (!v.proxima_accion) err.proxima_accion = 'Escriba qué hay que hacer';
          if (!v.proxima_fecha) err.proxima_fecha = 'Elija la fecha';
          else if (new Date(v.proxima_fecha) < new Date(Date.now() - 60000)) err.proxima_fecha = 'Debe ser en el futuro';
        }
        if (acc === 'NO_CONTACTAR' && !S.contacto_id) err.contacto_id = 'Elija el contacto que no quiere ser contactado';
        if (!U.marcarErrores(f, err)) return;
        const campos = {
          empresa_id: S.empresa_id, contacto_id: S.contacto_id, cotizacion_id: S.cotizacion_id, comercial_id: yo(),
          fecha_hora: new Date(v.fecha_hora).toISOString(), canal: S.canal, direccion: v.direccion, contacto_logrado: S.logro,
          resultado_id: S.resultado, detalle_id: S.detalle, duracion_min: CON_DURACION.indexOf(S.canal) >= 0 && v.duracion ? Number(v.duracion) : null, notas: v.notas,
          proxima_estado: conProx ? 'PENDIENTE' : 'NINGUNA'
        };
        if (conProx) Object.assign(campos, { proxima_accion: v.proxima_accion, proxima_fecha: new Date(v.proxima_fecha).toISOString(), proxima_responsable: App.usuario.es_admin ? (v.proxima_responsable || yo()) : yo() });
        await U.conCarga(U.$('#bG', m), async () => {
          try {
            let n = await G.siguiente('INT'); while (D.interacciones.some((x) => x.Title === 'INT-' + pad(n, 6))) n = await G.siguiente('INT');
            const id = 'INT-' + pad(n, 6);
            const nuevo = await G.crear('COM_Interacciones', Object.assign({ Title: id }, campos));
            // El pendiente del que salió queda hecho
            if (o.pendiente) await G.actualizar('COM_Interacciones', o.pendiente._id, { proxima_estado: 'HECHA', cerrada_por: id, fecha_cierre: new Date().toISOString() });
            // No volver a contactar: marca al contacto y cancela sus pendientes
            if (acc === 'NO_CONTACTAR') {
              const c = contactoDe(S.contacto_id);
              if (c) await G.actualizar('MAE_Contactos', c._id, { no_contactar: true, no_contactar_nota: (v.notas || r.nombre).slice(0, 250) });
              for (const p of pendientes().filter((x) => x.contacto_id === S.contacto_id && (!o.pendiente || x.Title !== o.pendiente.Title)))
                await G.actualizar('COM_Interacciones', p._id, { proxima_estado: 'CANCELADA', cerrada_por: id, fecha_cierre: new Date().toISOString() });
              await App.empresas.cargar(true);
            }
            U.cerrarModal();
            await cargar(true);
            U.aviso('Interacción registrada' + (conProx ? ' · próxima acción agendada' : ''), 'ok');
            if (acc === 'COTIZAR' && !S.cotizacion_id && await U.confirmar('Crear la cotización', 'El cliente pidió cotización. ¿Crearla ahora? La cotización queda enlazada a esta interacción.', 'Crear cotización')) {
              App.cotizaciones.prellenar = { empresa_id: S.empresa_id, contacto_id: S.contacto_id, interaccion: nuevo };
              location.hash = '#cotizaciones/nueva';
              return;
            }
            if (o.alGuardar) o.alGuardar();
          } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); }
        });
      };
    });
  }

  // Enlaza la interacción con la cotización creada desde ella (lo llama cotizaciones.js)
  async function enlazarCotizacion(inter, cotId) {
    try { await G.actualizar('COM_Interacciones', inter._id, { cotizacion_id: cotId }); D.cargado = 0; } catch (e) { console.warn('No se enlazó la interacción', e); }
  }

  // =====================================================================
  // LÍNEA DE TIEMPO (ficha de la empresa) y lista corta (ficha de la cotización)
  // =====================================================================
  function itemInteraccion(x, conEmpresa) {
    const c = contactoDe(x.contacto_id), e = conEmpresa ? empresaDe(x.empresa_id) : null;
    const prox = x.proxima_estado === 'PENDIENTE' ? '<div class="ic-int-prox-tag ' + estadoPend(x) + '">Próxima: ' + esc(x.proxima_accion || '') + ' · ' + U.fmt.fecha(fl(x.proxima_fecha) + 'T12:00:00') + ' ' + horaLocal(x.proxima_fecha) + ' · ' + esc(inicialesUsuario(x.proxima_responsable)) + '</div>'
      : x.proxima_estado === 'HECHA' ? '<div class="ic-int-prox-tag hecha">✓ ' + esc(x.proxima_accion || 'Próxima acción') + ' (hecha)</div>'
      : x.proxima_estado === 'CANCELADA' ? '<div class="ic-int-prox-tag cancelada">Cancelada: ' + esc(x.proxima_accion || '') + '</div>' : '';
    return '<div class="ic-tl-item"><div class="ic-tl-ico ' + (x.contacto_logrado === 'NO' ? 'no' : 'si') + '">' + icono(x.canal) + '</div><div class="ic-tl-cuerpo">' +
      '<div class="ic-tl-cab"><b>' + esc(nombreCanal(x.canal)) + (x.direccion === 'ENTRANTE' ? ' entrante' : '') + '</b>' + (e ? ' · <a href="#empresas/' + esc(e.Title) + '">' + esc(e.razon_social) + '</a>' : '') +
        (c ? ' · ' + esc(nombreContacto(c)) : '') + '<span class="sec">' + U.fmt.fechaHora(x.fecha_hora) + ' · ' + esc(inicialesUsuario(x.comercial_id)) + (x.duracion_min ? ' · ' + x.duracion_min + ' min' : '') + '</span></div>' +
      '<div class="ic-tl-res">' + esc((LOGRO.find((l) => l[0] === x.contacto_logrado) || ['', ''])[1]) + (textoResultado(x) ? ' · <b>' + esc(textoResultado(x)) + '</b>' : '') +
        (x.cotizacion_id ? ' · <a href="#cotizaciones/' + esc(x.cotizacion_id) + '">' + esc(numeroCot(x.cotizacion_id)) + '</a>' : '') + '</div>' +
      (x.notas ? '<div class="ic-tl-notas">' + esc(x.notas) + '</div>' : '') + prox + '</div></div>';
  }
  const numeroCot = (id) => { const c = ((App.cotizaciones && App.cotizaciones.datos.cotizaciones) || []).find((x) => x.Title === id); return c ? c.numero_visible : id; };

  async function lineaEmpresa(z, emp) {
    z.innerHTML = '<div class="cab"><h2>Actividad</h2><button class="ic-btn chico" id="btnInt">+ Registrar interacción</button></div><div class="cuerpo"><div class="ic-spinner"></div></div>';
    U.$('#btnInt', z).onclick = () => registrar({ empresa_id: emp.Title, alGuardar: () => lineaEmpresa(z, emp) });
    try { await Promise.all([cargar(), App.cotizaciones ? App.cotizaciones.cargar() : null]); } catch (e) { z.querySelector('.cuerpo').innerHTML = esc(U.mensajeError(e)); return; }
    if (!D.listo) { z.querySelector('.cuerpo').innerHTML = avisoInstalador; return; }
    let filtroTl = 'TODO', mostrar = 15;
    const pintar = () => {
      const ints = D.interacciones.filter((x) => x.empresa_id === emp.Title).map((x) => ({ f: x.fecha_hora, h: itemInteraccion(x, false), t: 'INT' }));
      const cots = ((App.cotizaciones && App.cotizaciones.datos.cotizaciones) || []).filter((c) => c.empresa_id === emp.Title).flatMap((c) => {
        const ev = [{ f: c.fecha_creacion || c._creado || c.fecha, txt: 'Cotización ' + c.numero_visible + ' creada' }];
        if (c.fecha_envio) ev.push({ f: c.fecha_envio, txt: 'Cotización ' + c.numero_visible + ' enviada' });
        if (c.fecha_cierre && (c.estado === 'GANADA' || c.estado === 'PERDIDA')) ev.push({ f: c.fecha_cierre, txt: 'Cotización ' + c.numero_visible + (c.estado === 'GANADA' ? ' ganada' : ' perdida') });
        return ev.map((x) => ({ f: x.f, t: 'COT', h: '<div class="ic-tl-item cot"><div class="ic-tl-ico cot">' + icono('COT') + '</div><div class="ic-tl-cuerpo"><div class="ic-tl-cab"><a href="#cotizaciones/' + esc(c.Title) + '"><b>' + esc(x.txt) + '</b></a>' +
          '<span class="sec">' + U.fmt.fechaHora(x.f) + ' · ' + esc(inicialesUsuario(c.comercial_id)) + ' · ' + U.fmt.cop(c.subtotal_neto || c.total) + '</span></div></div></div>' }));
      });
      const todo = ints.concat(cots).filter((x) => filtroTl === 'TODO' || x.t === filtroTl).sort((a, b) => String(b.f || '').localeCompare(String(a.f || '')));
      const pend = pendientes().filter((x) => x.empresa_id === emp.Title).sort((a, b) => String(a.proxima_fecha).localeCompare(String(b.proxima_fecha)));
      z.querySelector('.cuerpo').innerHTML =
        (pend.length ? '<div class="ic-int-pend-emp">' + pend.map((p) => '<div class="ic-int-pend-fila ' + estadoPend(p) + '"><span>' + (estadoPend(p) === 'vencido' ? 'Vencido · ' : estadoPend(p) === 'hoy' ? 'Hoy · ' : '') + U.fmt.fecha(fl(p.proxima_fecha) + 'T12:00:00') + ' ' + horaLocal(p.proxima_fecha) + '</span><b>' + esc(p.proxima_accion) + '</b><span class="sec">' + esc(inicialesUsuario(p.proxima_responsable)) + '</span>' +
          (puedeGestionar(p) ? '<button class="ic-btn chico" data-hecho="' + esc(p.Title) + '">Registrar resultado</button>' : '') + '</div>').join('') + '</div>' : '') +
        '<div class="ic-chips" style="margin:6px 0 10px" id="tlFiltro">' + [['TODO', 'Todo'], ['INT', 'Interacciones'], ['COT', 'Cotizaciones']].map((x) => '<button data-f="' + x[0] + '" class="' + (x[0] === filtroTl ? 'activo' : '') + '">' + x[1] + '</button>').join('') + '</div>' +
        (todo.length ? '<div class="ic-tl">' + todo.slice(0, mostrar).map((x) => x.h).join('') + '</div>' + (todo.length > mostrar ? '<button class="ic-btn sec chico" id="tlMas">Ver más (' + (todo.length - mostrar) + ')</button>' : '')
          : '<div class="ic-vacio" style="padding:14px">Aún no hay actividad. Registre la primera llamada, correo o visita.</div>');
      z.querySelectorAll('#tlFiltro button').forEach((b) => { b.onclick = () => { filtroTl = b.dataset.f; pintar(); }; });
      const bm = z.querySelector('#tlMas'); if (bm) bm.onclick = () => { mostrar += 30; pintar(); };
      z.querySelectorAll('[data-hecho]').forEach((b) => { b.onclick = () => registrar({ pendiente: pend.find((p) => p.Title === b.dataset.hecho), alGuardar: () => lineaEmpresa(z, emp) }); });
    };
    pintar();
  }
  const puedeGestionar = (p) => App.usuario.es_admin || p.proxima_responsable === yo() || p.comercial_id === yo();

  async function bloqueCotizacion(z, cot) {
    z.innerHTML = '<div class="cab"><h2>Interacciones de esta cotización</h2><button class="ic-btn chico sec" id="btnIntCot">+ Registrar interacción</button></div><div class="cuerpo"><div class="ic-spinner"></div></div>';
    U.$('#btnIntCot', z).onclick = () => registrar({ empresa_id: cot.empresa_id, contacto_id: cot.contacto_id, cotizacion_id: cot.Title, alGuardar: () => bloqueCotizacion(z, cot) });
    try { await cargar(); } catch (e) { z.querySelector('.cuerpo').innerHTML = esc(U.mensajeError(e)); return; }
    if (!D.listo) { z.querySelector('.cuerpo').innerHTML = avisoInstalador; return; }
    const xs = D.interacciones.filter((x) => x.cotizacion_id === cot.Title || (cot.consecutivo && x.cotizacion_id && String(numeroCot(x.cotizacion_id)).indexOf(cot.consecutivo) === 0));
    z.querySelector('.cuerpo').innerHTML = xs.length ? '<div class="ic-tl">' + xs.map((x) => itemInteraccion(x, false)).join('') + '</div>' : '<div class="ic-vacio" style="padding:14px">Sin interacciones registradas. Use «+ Registrar interacción» para anotar el seguimiento de esta cotización.</div>';
  }

  // =====================================================================
  // MIS PENDIENTES (#agenda)
  // =====================================================================
  const filtroAg = { quien: '', grupo: 'hoy' };
  App.vistas['agenda'] = async function (c) {
    c.innerHTML = '<div class="ic-form" style="text-align:center"><div class="ic-spinner"></div>Cargando pendientes…</div>';
    try { await Promise.all([cargar(), App.cotizaciones ? App.cotizaciones.cargar() : null]); } catch (e) {
      c.innerHTML = '<a href="#" class="ic-volver">← Menú principal</a><div class="ic-form"><b>No se pudo cargar la información.</b><p>' + esc(U.mensajeError(e)) + '</p><button class="ic-btn" onclick="location.reload()">Reintentar</button></div>'; return;
    }
    const adm = App.usuario.es_admin;
    if (!filtroAg.quien) filtroAg.quien = yo();
    c.innerHTML = '<a href="#" class="ic-volver">← Menú principal</a>' +
      '<div class="ic-tab-cab"><div><h1 class="ic-titulo">Mis pendientes</h1><p class="ic-subtitulo">Las próximas acciones agendadas en cada interacción.</p></div>' +
      '<button class="ic-btn" id="btnNuevaInt">+ Registrar interacción</button></div>' +
      (D.listo ? '' : avisoInstalador) +
      (adm ? '<div class="ic-filtros"><select id="agQuien"><option value="*">Todo el equipo</option>' + (App.usuarios || []).filter((u) => u.estado === 'ACTIVO').map((u) => '<option value="' + esc(u.Title) + '">' + esc(u.nombre) + (u.Title === yo() ? ' (yo)' : '') + '</option>').join('') + '</select></div>' : '') +
      '<div id="agCuerpo"></div>';
    U.$('#btnNuevaInt', c).onclick = () => registrar({ alGuardar: () => pintarAgenda(c) });
    if (adm) { U.$('#agQuien', c).value = filtroAg.quien; U.$('#agQuien', c).onchange = (e) => { filtroAg.quien = e.target.value; pintarAgenda(c); }; }
    pintarAgenda(c);
  };
  function pintarAgenda(c) {
    const z = U.$('#agCuerpo', c); if (!z) return;
    const lista = pendientes().filter((x) => filtroAg.quien === '*' || x.proxima_responsable === filtroAg.quien).sort((a, b) => String(a.proxima_fecha).localeCompare(String(b.proxima_fecha)));
    const en7 = iso(new Date(Date.now() + 7 * 86400000));
    const G4 = { vencido: lista.filter((x) => estadoPend(x) === 'vencido'), hoy: lista.filter((x) => estadoPend(x) === 'hoy'),
      semana: lista.filter((x) => estadoPend(x) === 'proximo' && fl(x.proxima_fecha) <= en7), despues: lista.filter((x) => fl(x.proxima_fecha) > en7) };
    if (!G4[filtroAg.grupo].length && filtroAg.grupo === 'hoy' && G4.vencido.length) filtroAg.grupo = 'vencido';
    const NOMBRES = [['vencido', 'Vencidos'], ['hoy', 'Hoy'], ['semana', 'Próximos 7 días'], ['despues', 'Más adelante']];
    const filas = G4[filtroAg.grupo];
    z.innerHTML = '<div class="ic-chips ic-chips-seg" id="agGrupo" style="margin-bottom:14px">' + NOMBRES.map((n) => '<button data-g="' + n[0] + '" class="' + (n[0] === filtroAg.grupo ? 'activo' : '') + '">' + n[1] + ' <b class="ic-num' + (G4[n[0]].length ? (n[0] === 'vencido' ? ' rojo' : '') : ' cero') + '">' + G4[n[0]].length + '</b></button>').join('') + '</div>' +
      (!filas.length ? '<div class="ic-vacio">' + (filtroAg.grupo === 'vencido' ? 'No hay pendientes vencidos. ¡Bien!' : 'Nada pendiente aquí.') + '</div>' :
      '<div class="ic-agenda">' + filas.map((x) => {
        const e = empresaDe(x.empresa_id), ct = contactoDe(x.contacto_id), est = estadoPend(x);
        return '<div class="ic-ag-item ' + est + '"><div class="ic-ag-fecha"><b>' + (est === 'hoy' ? 'Hoy' : U.fmt.fecha(fl(x.proxima_fecha) + 'T12:00:00')) + '</b><span>' + horaLocal(x.proxima_fecha) + '</span>' + (est === 'vencido' ? '<em>Vencido</em>' : '') + '</div>' +
          '<div class="ic-ag-cuerpo"><div class="ic-ag-accion">' + esc(x.proxima_accion || 'Seguimiento') + '</div>' +
            '<div>' + (e ? '<a href="#empresas/' + esc(e.Title) + '"><b>' + esc(e.razon_social) + '</b></a>' : esc(x.empresa_id)) + (ct ? ' · ' + esc(nombreContacto(ct)) + (ct.cargo ? ', ' + esc(ct.cargo) : '') : '') +
              (x.cotizacion_id ? ' · <a href="#cotizaciones/' + esc(x.cotizacion_id) + '">' + esc(numeroCot(x.cotizacion_id)) + '</a>' : '') + (filtroAg.quien === '*' ? ' · <span class="ic-badge">' + esc(inicialesUsuario(x.proxima_responsable)) + '</span>' : '') + '</div>' +
            (ct ? enlacesContacto(ct) : '') +
            '<div class="ic-ag-origen">Última vez (' + U.fmt.fecha(x.fecha_hora) + ', ' + esc(nombreCanal(x.canal).toLowerCase()) + '): ' + esc(textoResultado(x)) + (x.notas ? ' — ' + esc(String(x.notas).slice(0, 160)) + (String(x.notas).length > 160 ? '…' : '') : '') + '</div></div>' +
          '<div class="ic-ag-btns">' + (puedeGestionar(x) ? '<button class="ic-btn chico" data-r="' + esc(x.Title) + '">Registrar resultado</button><button class="ic-btn chico sec" data-p="' + esc(x.Title) + '">Reprogramar</button><button class="ic-btn chico sec" data-x="' + esc(x.Title) + '">Cancelar</button>' : '') + '</div></div>';
      }).join('') + '</div>');
    z.querySelectorAll('#agGrupo button').forEach((b) => { b.onclick = () => { filtroAg.grupo = b.dataset.g; pintarAgenda(c); }; });
    const buscar = (id) => lista.find((x) => x.Title === id);
    z.querySelectorAll('[data-r]').forEach((b) => { b.onclick = () => registrar({ pendiente: buscar(b.dataset.r), alGuardar: () => pintarAgenda(c) }); });
    z.querySelectorAll('[data-p]').forEach((b) => { b.onclick = () => reprogramar(buscar(b.dataset.p), () => pintarAgenda(c)); });
    z.querySelectorAll('[data-x]').forEach((b) => { b.onclick = () => cancelar(buscar(b.dataset.x), () => pintarAgenda(c)); });
  }
  function reprogramar(p, alFin) {
    const d = new Date(p.proxima_fecha); const sug = new Date(Math.max(Date.now(), d.getTime())); sug.setDate(sug.getDate() + 1);
    U.modal('Reprogramar · ' + (p.proxima_accion || 'pendiente'), '<form class="ic-form" id="fRep" novalidate><div class="ic-campos">' +
      U.campo({ name: 'proxima_fecha', label: 'Nueva fecha y hora', t: 'datetime-local', valor: aInputDT(sug), c: 'c6' }) +
      U.campo({ name: 'proxima_accion', label: 'Qué hay que hacer', valor: p.proxima_accion, c: 'c12', max: 120 }) +
      U.campo({ name: 'motivo', label: 'Por qué se reprograma (opcional)', c: 'c12', ph: 'Ej.: el cliente pidió llamar la otra semana' }) +
      '</div><div class="ic-acciones"><button type="button" class="ic-btn sec" id="bC">Cancelar</button><button class="ic-btn" id="bG">Reprogramar</button></div></form>', (m) => {
      U.$('#bC', m).onclick = U.cerrarModal;
      U.$('#fRep', m).onsubmit = async (ev) => {
        ev.preventDefault(); const v = U.leerForm(ev.target), err = {};
        if (!v.proxima_fecha || new Date(v.proxima_fecha) < new Date(Date.now() - 60000)) err.proxima_fecha = 'Elija una fecha futura';
        if (!v.proxima_accion) err.proxima_accion = 'Obligatorio';
        if (!U.marcarErrores(ev.target, err)) return;
        await U.conCarga(U.$('#bG', m), async () => {
          try {
            const nota = 'Reprogramado de ' + U.fmt.fechaHora(p.proxima_fecha) + ' (' + App.usuario.iniciales + ')' + (v.motivo ? ': ' + v.motivo : '');
            await G.actualizar('COM_Interacciones', p._id, { proxima_fecha: new Date(v.proxima_fecha).toISOString(), proxima_accion: v.proxima_accion, notas: [p.notas, nota].filter(Boolean).join('\n') }, p._etag);
            U.cerrarModal(); await cargar(true); U.aviso('Pendiente reprogramado', 'ok'); alFin();
          } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); }
        });
      };
    });
  }
  async function cancelar(p, alFin) {
    U.modal('Cancelar pendiente', '<form class="ic-form" id="fCan" novalidate><p style="margin:0 0 10px">«' + esc(p.proxima_accion || '') + '» deja de aparecer en la agenda. Si sí lo hizo, mejor use «Registrar resultado».</p><div class="ic-campos">' +
      U.campo({ name: 'motivo', label: 'Motivo', req: true, c: 'c12', ph: 'Ej.: el cliente ya compró a otro proveedor' }) +
      '</div><div class="ic-acciones"><button type="button" class="ic-btn sec" id="bC">Volver</button><button class="ic-btn peligro" id="bG">Cancelar pendiente</button></div></form>', (m) => {
      U.$('#bC', m).onclick = U.cerrarModal;
      U.$('#fCan', m).onsubmit = async (ev) => {
        ev.preventDefault(); const v = U.leerForm(ev.target); if (!U.marcarErrores(ev.target, v.motivo ? {} : { motivo: 'Escriba el motivo' })) return;
        try {
          await G.actualizar('COM_Interacciones', p._id, { proxima_estado: 'CANCELADA', fecha_cierre: new Date().toISOString(), notas: [p.notas, 'Pendiente cancelado (' + App.usuario.iniciales + '): ' + v.motivo].filter(Boolean).join('\n') }, p._etag);
          U.cerrarModal(); await cargar(true); U.aviso('Pendiente cancelado', 'ok'); alFin();
        } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); }
      };
    });
  }

  // Número en la tarjeta del menú (vencidos + hoy)
  async function marcarMenu() {
    try {
      await cargar(); if (!D.listo) return;
      const n = pendientes().filter((x) => x.proxima_responsable === yo() && estadoPend(x) !== 'proximo').length;
      const card = document.querySelector('a.ic-card[href="#agenda"], [data-ruta="agenda"]');
      if (card && n) { const b = document.createElement('span'); b.className = 'ic-card-num'; b.textContent = n; b.title = n + ' pendiente(s) para hoy o vencidos'; card.appendChild(b); }
    } catch (e) { /* el menú funciona igual */ }
  }

  // =====================================================================
  // INDICADORES PARA EL TABLERO (los usa reportes.js)
  // =====================================================================
  function actividad(d, h, filtroCom) {
    const enP = (s) => s && s >= d && s <= h;
    const xs = D.interacciones.filter((x) => enP(fl(x.fecha_hora)) && filtroCom(x.comercial_id));
    const t = hoy(), hastaDue = h < t ? h : t;
    const due = D.interacciones.filter((x) => x.proxima_fecha && ['PENDIENTE', 'HECHA'].indexOf(x.proxima_estado) >= 0 && fl(x.proxima_fecha) >= d && fl(x.proxima_fecha) <= hastaDue && filtroCom(x.proxima_responsable));
    const aTiempo = due.filter((x) => x.proxima_estado === 'HECHA' && fl(x.fecha_cierre) <= fl(x.proxima_fecha)).length;
    const tarde = due.filter((x) => x.proxima_estado === 'HECHA' && fl(x.fecha_cierre) > fl(x.proxima_fecha)).length;
    const vencidos = due.filter((x) => x.proxima_estado === 'PENDIENTE').length;
    const porCanal = CANALES.map(([k, n]) => ({ canal: n, n: xs.filter((x) => x.canal === k).length })).filter((x) => x.n);
    const ids = Array.from(new Set(xs.map((x) => x.comercial_id).concat(due.map((x) => x.proxima_responsable))));
    const porComercial = ids.map((id) => {
      const a = xs.filter((x) => x.comercial_id === id), dd = due.filter((x) => x.proxima_responsable === id);
      const at = dd.filter((x) => x.proxima_estado === 'HECHA' && fl(x.fecha_cierre) <= fl(x.proxima_fecha)).length;
      const r = { id, nombre: nombreUsuario(id), ini: inicialesUsuario(id), total: a.length, logrados: a.filter((x) => x.contacto_logrado !== 'NO').length, due: dd.length, aTiempo: at, vencidos: dd.filter((x) => x.proxima_estado === 'PENDIENTE').length };
      CANALES.forEach(([k]) => { r[k] = a.filter((x) => x.canal === k).length; });
      return r;
    }).sort((a, b) => b.total - a.total);
    return { listo: D.listo, total: xs.length, logrados: xs.filter((x) => x.contacto_logrado !== 'NO').length, porCanal, porComercial, due: due.length, aTiempo, tarde, vencidos, CANALES };
  }

  App.interacciones = { cargar, datos: D, registrar, lineaEmpresa, bloqueCotizacion, enlazarCotizacion, marcarMenu, actividad, textoResultado, ACCIONES, CANALES };
})();
