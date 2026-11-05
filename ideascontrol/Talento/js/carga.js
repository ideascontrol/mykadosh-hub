/* =====================================================================
   APP-108 · Desarrollo de Talento — carga masiva y fechas en bloque
   · Importar Excel: crea el programa (si no existe) y sus piezas como BORRADOR.
   · Asignar fechas: reparte los borradores sin fecha de un programa en los
     días de la semana y la hora elegidos, en el orden de la campaña.
   ===================================================================== */
window.TalCarga = (function () {
  const G = IC.graph, U = IC.ui, esc = U.esc;
  const pad = (n, l) => String(n).padStart(l || 2, '0');
  const COLS = ['Programa', 'Tipo', 'Orden', 'Etiqueta', 'Titular', 'Idea clave', 'Ideas del resumen', 'Copy', 'Acción', 'Fecha', 'Hora'];
  const DIAS = [['1', 'Lun'], ['2', 'Mar'], ['3', 'Mié'], ['4', 'Jue'], ['5', 'Vie'], ['6', 'Sáb']];

  function cargarXLSX() {
    if (window.XLSX) return Promise.resolve();
    return new Promise((ok, mal) => {
      const sc = document.createElement('script');
      sc.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      sc.onload = ok; sc.onerror = () => mal(new Error('No se pudo cargar la librería de Excel. Revise la conexión.'));
      document.head.appendChild(sc);
    });
  }
  const clave = (s) => U.norm(String(s || '')).replace(/[^a-z0-9]/g, '');
  const texto = (v) => (v === undefined || v === null ? '' : String(v)).trim();

  // ---------- Plantilla ----------
  async function plantilla() {
    await cargarXLSX();
    const ej = [
      { Programa: 'Nombre de la campaña', Tipo: 'Pieza', Orden: 1, Etiqueta: 'Comunicación 01', Titular: 'Si recibiste un mensaje, responde', 'Idea clave': 'No dejes a tu compañero en visto', 'Ideas del resumen': '', Copy: 'Texto que acompaña el post…', 'Acción': 'Qué debe hacer la persona hoy', Fecha: '', Hora: '' },
      { Programa: 'Nombre de la campaña', Tipo: 'Resumen', Orden: 2, Etiqueta: 'Resumen semana 1', Titular: 'Lo que aprendimos esta semana', 'Idea clave': '', 'Ideas del resumen': 'Primera idea\nSegunda idea\nTercera idea', Copy: '', 'Acción': '', Fecha: '', Hora: '' }
    ];
    const wb = XLSX.utils.book_new(), ws = XLSX.utils.json_to_sheet(ej, { header: COLS });
    ws['!cols'] = [30, 10, 7, 18, 40, 40, 40, 60, 40, 12, 8].map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, 'Piezas');
    const ayuda = [
      ['Columna', 'Qué va'], ['Programa', 'Nombre de la campaña. Si no existe, se crea. Sale arriba en cada post.'],
      ['Tipo', '«Pieza» (post con idea clave) o «Resumen» (lista de ideas).'], ['Orden', 'Número para el orden de publicación (1, 2, 3…).'],
      ['Etiqueta', 'Texto corto de la cápsula dorada (p. ej. «Comunicación 01»).'], ['Titular', 'Frase principal del post (máximo 3 líneas).'],
      ['Idea clave', 'Solo para Pieza: la frase del recuadro.'], ['Ideas del resumen', 'Solo para Resumen: una idea por línea (Alt+Enter en Excel), máximo 5.'],
      ['Copy', 'Texto para acompañar el post al compartirlo (opcional).'], ['Acción', 'Qué se espera que haga la persona (opcional).'],
      ['Fecha / Hora', 'Opcionales. Sin fecha, la pieza queda en borrador; luego use «Asignar fechas».']
    ];
    const wa = XLSX.utils.aoa_to_sheet(ayuda); wa['!cols'] = [{ wch: 20 }, { wch: 90 }];
    XLSX.utils.book_append_sheet(wb, wa, 'Instrucciones');
    XLSX.writeFile(wb, 'Plantilla_carga_Desarrollo_de_Talento.xlsx');
  }

  // ---------- Leer el Excel ----------
  function fechaIso(f, h) {
    if (!f) return '';
    let y, m, d;
    if (typeof f === 'number') { const t = new Date(Math.round((f - 25569) * 864e5)); y = t.getUTCFullYear(); m = t.getUTCMonth() + 1; d = t.getUTCDate(); }
    else { const s = String(f).trim(), a = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/), b = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (a) [, y, m, d] = a.map(Number); else if (b) { d = +b[1]; m = +b[2]; y = +b[3]; } else return ''; }
    let hh = 8, mm = 10;
    if (typeof h === 'number') { const min = Math.round(h * 1440); hh = Math.floor(min / 60); mm = min % 60; }
    else if (h) { const x = String(h).match(/(\d{1,2}):(\d{2})/); if (x) { hh = +x[1]; mm = +x[2]; } }
    return new Date(y, m - 1, d, hh, mm).toISOString();
  }
  async function leer(archivo) {
    await cargarXLSX();
    const wb = XLSX.read(await archivo.arrayBuffer(), { type: 'array' });
    const ws = wb.Sheets['Piezas'] || wb.Sheets[wb.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(ws, { defval: '' });
    const col = (f, n) => { const k = Object.keys(f).find((x) => clave(x) === clave(n)); return k ? f[k] : ''; };
    return filas.map((f, i) => {
      const tipo = /resum/i.test(texto(col(f, 'Tipo'))) ? 'RESUMEN' : 'TIP';
      const p = {
        fila: i + 2, programa: texto(col(f, 'Programa')), tipo, orden: texto(col(f, 'Orden')) !== '' && isFinite(Number(col(f, 'Orden'))) ? Number(col(f, 'Orden')) : i + 1, etiqueta: texto(col(f, 'Etiqueta')),
        titular: texto(col(f, 'Titular')), mensaje: texto(col(f, 'Idea clave')),
        items: texto(col(f, 'Ideas del resumen')).split(/\r?\n|;/).map((x) => x.trim()).filter(Boolean).slice(0, 5).join('\n'),
        copy: texto(col(f, 'Copy')), accion: texto(col(f, 'Acción')), fecha_publicacion: fechaIso(col(f, 'Fecha'), col(f, 'Hora'))
      };
      p.error = !p.programa ? 'Falta el programa' : !p.titular ? 'Falta el titular' : tipo === 'TIP' && !p.mensaje ? 'Falta la idea clave' : tipo === 'RESUMEN' && !p.items ? 'Faltan las ideas del resumen' : '';
      return p;
    }).filter((p) => p.programa || p.titular || p.mensaje);
  }

  // ---------- Importar ----------
  function importar(alTerminar) {
    U.modal('Carga masiva de piezas', '<form class="ic-form" id="fImp"><p style="margin-top:0">Llene la plantilla de Excel (una fila por pieza) y súbala aquí. Las piezas quedan en <b>borrador</b>: puede revisarlas y editarlas antes de programarlas.</p>' +
      '<p><button type="button" class="ic-btn sec chico" id="iPlant">Descargar plantilla de Excel</button></p>' +
      '<div class="ic-campo c12"><label for="iArch">Archivo de Excel</label><input type="file" id="iArch" accept=".xlsx,.xls"></div>' +
      '<div id="iPrev" style="margin-top:12px"></div>' +
      '<div class="ic-acciones"><button type="button" class="ic-btn sec" id="iNo">Cancelar</button><button type="button" class="ic-btn" id="iOk" disabled>Cargar piezas</button></div></form>', (cu) => {
      let plan = null;
      cu.querySelector('#iNo').onclick = U.cerrarModal;
      cu.querySelector('#iPlant').onclick = () => plantilla().catch((e) => U.aviso(e.message, 'err'));
      cu.querySelector('#iArch').onchange = async (e) => {
        const f = e.target.files[0]; plan = null; cu.querySelector('#iOk').disabled = true;
        if (!f) return;
        try {
          const filas = await leer(f);
          const existentes = new Set(App.piezas.map((p) => p.programa_id + '|' + clave(p.titular)));
          const progs = {}; filas.forEach((p) => { const k = clave(p.programa); if (!progs[k]) progs[k] = { nombre: p.programa, existe: App.programas.find((x) => clave(x.nombre) === k) }; });
          filas.forEach((p) => { const g = progs[clave(p.programa)]; p.repetida = !!(g.existe && existentes.has(g.existe.Title + '|' + clave(p.titular))); });
          const validas = filas.filter((p) => !p.error && !p.repetida), malas = filas.filter((p) => p.error), rep = filas.filter((p) => p.repetida);
          plan = { filas: validas, progs };
          const nuevos = Object.values(progs).filter((g) => !g.existe);
          cu.querySelector('#iPrev').innerHTML =
            '<div style="background:#EEF6FB;border:1px solid #CFE3F1;border-radius:10px;padding:10px 12px"><b>' + validas.length + '</b> piezas listas para cargar' + (nuevos.length ? ' · se crea el programa <b>' + nuevos.map((g) => esc(g.nombre)).join('</b>, <b>') + '</b>' : '') +
            (rep.length ? '<br>' + rep.length + ' ya existen (mismo titular en el programa) y se omiten.' : '') + (malas.length ? '<br><span style="color:#B42318">' + malas.length + ' filas con errores no se cargan:</span>' : '') + '</div>' +
            (malas.length ? '<ul style="margin:6px 0 0;padding-left:18px;font-size:13px">' + malas.slice(0, 10).map((p) => '<li>Fila ' + p.fila + ': ' + esc(p.error) + '</li>').join('') + '</ul>' : '') +
            (validas.length ? '<div class="ic-tabla-caja" style="max-height:260px;overflow:auto;margin-top:10px"><table class="ic-tabla"><thead><tr><th>#</th><th>Etiqueta</th><th>Titular</th><th>Fecha</th></tr></thead><tbody>' +
              validas.map((p) => '<tr><td>' + p.orden + '</td><td>' + esc(p.etiqueta) + '</td><td>' + esc(p.titular) + '</td><td>' + (p.fecha_publicacion ? esc(new Date(p.fecha_publicacion).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })) : 'Sin fecha') + '</td></tr>').join('') + '</tbody></table></div>' : '');
          cu.querySelector('#iOk').disabled = !validas.length;
        } catch (err) { cu.querySelector('#iPrev').innerHTML = '<p style="color:#B42318">No se pudo leer el archivo: ' + esc(err.message) + '</p>'; }
      };
      cu.querySelector('#iOk').onclick = async () => {
        if (!plan) return;
        const b = cu.querySelector('#iOk');
        try {
          await U.conCarga(b, async () => {
            for (const g of Object.values(plan.progs)) {
              if (g.existe || !plan.filas.some((p) => clave(p.programa) === clave(g.nombre))) continue;
              const n = await G.siguiente('TPR');
              g.existe = await G.crear('TAL_Programas', { Title: 'TP-' + pad(n, 2), nombre: g.nombre, descripcion: '', audiencia: 'TODOS', orden: n, estado: 'ACTIVO' });
            }
            let k = 0;
            for (const p of plan.filas.sort((a, b2) => a.orden - b2.orden)) {
              const n = await G.siguiente('TAL');
              const campos = {
                Title: 'PZ-' + pad(n, 5), programa_id: plan.progs[clave(p.programa)].existe.Title, tipo: p.tipo, etiqueta: p.etiqueta, orden: p.orden,
                titular: p.titular, mensaje: p.tipo === 'TIP' ? p.mensaje : '', items: p.tipo === 'RESUMEN' ? p.items : '', copy: p.copy, accion: p.accion,
                estado: 'BORRADOR'
              };
              if (p.fecha_publicacion) campos.fecha_publicacion = p.fecha_publicacion;
              await G.crear('TAL_Piezas', campos);
              b.textContent = 'Cargando ' + (++k) + ' de ' + plan.filas.length + '…';
            }
          });
          U.cerrarModal(); U.aviso(plan.filas.length + ' piezas cargadas como borrador', 'ok', 6000);
          await alTerminar();
        } catch (e) { U.aviso(U.mensajeError(e), 'err', 9000); }
      };
    });
  }

  // ---------- Asignar fechas ----------
  function asignarFechas(programaId, alTerminar) {
    const progs = App.programas.filter((p) => App.piezas.some((x) => x.programa_id === p.Title && x.estado === 'BORRADOR' && !x.fecha_publicacion));
    if (!progs.length) { U.aviso('No hay borradores sin fecha.', 'warn'); return; }
    const sel = progs.find((p) => p.Title === programaId) ? programaId : progs[0].Title;
    const manana = new Date(Date.now() + 864e5), hoyIso = manana.getFullYear() + '-' + pad(manana.getMonth() + 1) + '-' + pad(manana.getDate());
    U.modal('Asignar fechas a borradores', '<form class="ic-form" id="fFe"><p style="margin-top:0">Se asignan fechas a los borradores <b>sin fecha</b> del programa, en su orden. Siguen en borrador: revíselos y luego use «Programar borradores».</p><div class="ic-campos">' +
      U.campo({ name: 'programa', label: 'Programa', t: 'select', op: progs.map((p) => [p.Title, p.nombre]), valor: sel, vacio: false, c: 'c12' }) +
      U.campo({ name: 'desde', label: 'Desde', t: 'date', valor: hoyIso, req: true, c: 'c6' }) +
      U.campo({ name: 'hora', label: 'Hora', t: 'time', valor: CFG.horaPieza || '08:10', req: true, c: 'c6' }) +
      '<div class="ic-campo c12"><label>Días</label><div style="display:flex;gap:12px;flex-wrap:wrap">' + DIAS.map(([v, t]) => '<label class="ic-check"><input type="checkbox" data-dia="' + v + '"' + ('135'.includes(v) ? ' checked' : '') + '> <span>' + t + '</span></label>').join('') + '</div></div>' +
      '</div><div id="fePrev" style="margin-top:10px;font-size:13px"></div><div class="ic-acciones"><button type="button" class="ic-btn sec" id="feNo">Cancelar</button><button type="button" class="ic-btn" id="feOk">Asignar fechas</button></div></form>', (cu) => {
      const f = cu.querySelector('#fFe');
      const calcular = () => {
        const v = U.leerForm(f), dias = Array.from(cu.querySelectorAll('[data-dia]')).filter((x) => x.checked).map((x) => Number(x.dataset.dia));
        const lista = App.piezas.filter((x) => x.programa_id === v.programa && x.estado === 'BORRADOR' && !x.fecha_publicacion).sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));
        if (!v.desde || !dias.length) return { lista: [], fechas: [] };
        const [hh, mm] = String(v.hora || '08:10').split(':').map(Number);
        const d = new Date(v.desde + 'T00:00:00'), fechas = [];
        while (fechas.length < lista.length) { if (dias.includes(d.getDay())) fechas.push(new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm)); d.setDate(d.getDate() + 1); }
        return { lista, fechas };
      };
      const vista = () => {
        const { lista, fechas } = calcular();
        cu.querySelector('#fePrev').innerHTML = lista.length ? '<b>' + lista.length + '</b> piezas: del ' + esc(fechas[0].toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })) + ' al ' + esc(fechas[fechas.length - 1].toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })) + '.' : 'Elija al menos un día.';
      };
      f.addEventListener('change', vista); f.addEventListener('input', vista); vista();
      cu.querySelector('#feNo').onclick = U.cerrarModal;
      cu.querySelector('#feOk').onclick = async () => {
        const { lista, fechas } = calcular(); if (!lista.length) return;
        try {
          await U.conCarga(cu.querySelector('#feOk'), async () => {
            for (let i = 0; i < lista.length; i++) await G.actualizar('TAL_Piezas', lista[i]._id, { fecha_publicacion: fechas[i].toISOString() }, lista[i]._etag);
          });
          U.cerrarModal(); U.aviso('Fechas asignadas a ' + lista.length + ' piezas', 'ok'); await alTerminar();
        } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); }
      };
    });
  }
  return { importar, asignarFechas, plantilla };
})();
