/* =====================================================================
   APP-106 · Programación — Seguimiento (bitácora) de cada caso
   Cada comentario es un registro nuevo en OPE_Seguimiento: fecha y hora, autor, tipo de nota y texto.
   No se editan ni se borran: se acumulan como histórico.
   El «caso» es el Ticket / OS de la actividad; si no tiene, el código de la actividad (PRG-…).
   Así, una visita, la instalación y el soporte posterior con el mismo Ticket / OS comparten un solo hilo.
   ===================================================================== */
(function () {
  const U = IC.ui, G = IC.graph, esc = U.esc;
  const LISTA = 'OPE_Seguimiento';
  const TIPOS_NOTA = ['Avance', 'Novedad', 'Contacto con el cliente', 'Pendiente', 'Solución', 'Cierre'];
  const COLOR = { 'Avance': 'azul', 'Novedad': 'dorado', 'Contacto con el cliente': 'teal', 'Pendiente': 'rojo', 'Solución': 'verde', 'Cierre': 'gris' };

  const claveCaso = (a) => { const t = String(a.ticket_os || '').trim().toUpperCase().replace(/\s+/g, ' '); return t || a.Title; };
  const lit = (s) => String(s).replace(/'/g, "''");

  async function leer(a) {
    const caso = claveCaso(a);
    const [porCaso, porAct] = await Promise.all([
      G.items(LISTA, { filtro: "fields/caso eq '" + lit(caso) + "'", top: 999 }),
      caso === a.Title ? Promise.resolve([]) : G.items(LISTA, { filtro: "fields/actividad_id eq '" + lit(a.Title) + "'", top: 999 })
    ]);
    const vistos = new Set(), out = [];
    porCaso.concat(porAct).forEach((x) => { if (!vistos.has(x.Title)) { vistos.add(x.Title); out.push(x); } });
    return out.sort((x, y) => String(y.fecha_hora || '').localeCompare(String(x.fecha_hora || '')));
  }
  const faltaLista = (e) => /OPE_Seguimiento|not found|no se encontr|itemNotFound|404/i.test(String((e && e.message) || e));

  function itemHtml(x, a) {
    const otra = x.actividad_id && x.actividad_id !== a.Title;
    return '<li class="seg-item"><span class="seg-punto ' + (COLOR[x.tipo_nota] || 'azul') + '"></span><div class="seg-cab">' +
      '<b>' + esc(x.autor || x.autor_email || '—') + '</b><span>' + esc(U.fmt.fechaHora(x.fecha_hora)) + '</span>' +
      (x.tipo_nota ? '<span class="seg-tag ' + (COLOR[x.tipo_nota] || 'azul') + '">' + esc(x.tipo_nota) + '</span>' : '') +
      (otra ? '<span class="seg-ref" title="Comentario hecho en otra actividad del mismo caso">' + esc(x.actividad_id) + '</span>' : '') + '</div>' +
      '<div class="seg-texto">' + esc(x.texto || '').replace(/\n/g, '<br>') + '</div></li>';
  }

  // Panel dentro de la ventana de la actividad
  App.seguimiento = {
    claveCaso, leer,
    html: () => '<div class="seg-panel" id="segPanel"><div class="seg-titulo"><h3>Seguimiento del caso</h3><span id="segCaso" class="seg-caso"></span></div>' +
      '<div class="seg-nuevo"><select id="segTipo" aria-label="Tipo de nota">' + TIPOS_NOTA.map((t) => '<option>' + esc(t) + '</option>').join('') + '</select>' +
      '<textarea id="segTexto" rows="2" placeholder="Escriba el comentario (avance, novedad, llamada, pendiente…). Queda con su nombre, la fecha y la hora."></textarea>' +
      '<button type="button" class="ic-btn" id="segAgregar">Agregar comentario</button></div>' +
      '<ul class="seg-lista" id="segLista"><li class="ic-vacio">Cargando el historial…</li></ul></div>',

    async montar(cuerpo, a) {
      const panel = cuerpo.querySelector('#segPanel'); if (!panel) return;
      const caso = claveCaso(a);
      panel.querySelector('#segCaso').innerHTML = caso === a.Title ? 'Caso: <b>' + esc(caso) + '</b> <span class="sec">(sin Ticket / OS: el historial es de esta actividad)</span>'
        : 'Ticket / OS: <b>' + esc(caso) + '</b> <span class="sec">(incluye las otras actividades con el mismo Ticket / OS)</span>';
      const lista = panel.querySelector('#segLista');
      async function pintar() {
        try {
          const l = await leer(a);
          lista.innerHTML = l.length ? l.map((x) => itemHtml(x, a)).join('') : '<li class="ic-vacio">Aún no hay comentarios en este caso.</li>';
        } catch (e) {
          lista.innerHTML = '<li class="ic-alerta chica">' + (faltaLista(e) ? 'Falta crear la lista del seguimiento: abra el instalador de la Programación y dé clic en «Crear estructura» y luego en «Aplicar permisos».' : esc(U.mensajeError(e))) + '</li>';
        }
      }
      const btn = panel.querySelector('#segAgregar'), txt = panel.querySelector('#segTexto');
      btn.onclick = () => {
        const texto = txt.value.trim();
        if (!texto) { U.aviso('Escriba el comentario.', 'warn'); txt.focus(); return; }
        U.conCarga(btn, async () => {
          try {
            const n = await G.siguiente('SEG', 1);
            const reg = { Title: 'SEG-' + Ope.pad(n, 6), caso, actividad_id: a.Title, fecha_hora: new Date().toISOString(), autor: App.usuario.nombre, autor_email: App.usuario.email,
              tipo_nota: panel.querySelector('#segTipo').value, texto, cliente: [a.cliente, a.sitio].filter(Boolean).join(' · ') };
            await G.crear(LISTA, reg);
            txt.value = '';
            U.aviso('Comentario agregado al seguimiento.', 'ok');
            await pintar();
          } catch (e) { U.aviso(faltaLista(e) ? 'Falta crear la lista del seguimiento (instalador › «Crear estructura»).' : U.mensajeError(e), 'err', 8000); }
        });
      };
      txt.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) btn.click(); });
      await pintar();
    }
  };
})();
