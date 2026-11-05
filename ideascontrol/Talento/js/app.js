/* =====================================================================
   APP-108 · Desarrollo de Talento — muro, editor de piezas y lecturas
   Listas: TAL_Programas, TAL_Piezas, TAL_Lecturas (sitio IC Apps).
   Una pieza se ve en el muro cuando está PROGRAMADA y ya pasó su fecha y hora.
   Editan: ADMIN de APP-108 en SYS_Accesos (o, si no existe, ADMIN de APP-106).
   ===================================================================== */
const App = { usuario: null, programas: [], piezas: [], lecturas: [], vista: 'muro', filtroProg: '', filtroMuro: '', filtroLect: '' };   // cada pestaña con su propio filtro
(function () {
  const U = IC.ui, esc = U.esc, G = IC.graph;
  const ESTADOS = { BORRADOR: 'Borrador', PROGRAMADA: 'Programada', ARCHIVADA: 'Archivada' };
  const esAdmin = () => App.usuario && App.usuario.rol === 'ADMIN';
  const pad = (n, l) => String(n).padStart(l || 2, '0');

  // ---------- Fechas (hora local del navegador = Colombia) ----------
  const ahora = () => new Date();
  const publicada = (p) => p.estado === 'PROGRAMADA' && p.fecha_publicacion && new Date(p.fecha_publicacion) <= ahora();
  const estadoVisible = (p) => p.estado === 'PROGRAMADA' ? (publicada(p) ? 'Publicada' : 'Programada') : ESTADOS[p.estado] || p.estado;
  function fechaTexto(iso, conHora) {
    if (!iso) return 'Sin fecha';
    const d = new Date(iso);
    return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) + (conHora ? ' · ' + d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' }) : '');
  }
  function partes(iso) { if (!iso) return { f: '', h: '' }; const d = new Date(iso); return { f: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()), h: pad(d.getHours()) + ':' + pad(d.getMinutes()) }; }
  const unir = (f, h) => f ? new Date(f + 'T' + (h || '08:10') + ':00').toISOString() : '';
  const prog = (id) => App.programas.find((x) => x.Title === id) || { nombre: id || '' };
  const items = (p) => String(p.items || '').split('\n').map((x) => x.trim()).filter(Boolean);
  const datosPost = (p) => ({ tipo: p.tipo, programa: prog(p.programa_id).nombre, etiqueta: p.etiqueta, titular: p.titular, mensaje: p.mensaje, items: items(p), tam_titular: p.tam_titular, desde: p.desde_numero });
  const nombreArchivo = (p) => (prog(p.programa_id).nombre || 'Pieza').replace(/[^\wáéíóúñ]+/gi, '_') + '_' + (p.etiqueta || p.Title).replace(/\s+/g, '_');

  // ---------- Datos ----------
  async function cargar() {
    const [pr, pz, le] = await Promise.all([
      G.items('TAL_Programas'), G.items('TAL_Piezas', { top: 999 }),
      G.items('TAL_Lecturas', esAdmin() ? { top: 4999 } : { filtro: "fields/email eq '" + App.usuario.email + "'", top: 999 }).catch(() => [])
    ]);
    App.programas = pr.filter((x) => x.estado !== 'INACTIVO').sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99));
    App.piezas = pz.sort((a, b) => String(a.fecha_publicacion || '9').localeCompare(String(b.fecha_publicacion || '9')) || (Number(a.orden) || 0) - (Number(b.orden) || 0));
    App.lecturas = le;
  }
  const leida = (p) => App.lecturas.some((l) => l.pieza_id === p.Title && String(l.email).toLowerCase() === App.usuario.email);

  async function marcarEntendido(p, boton) {
    if (leida(p)) return;
    try {
      await U.conCarga(boton, async () => {
        const it = await G.crear('TAL_Lecturas', { Title: p.Title + '|' + App.usuario.email, pieza_id: p.Title, programa_id: p.programa_id, email: App.usuario.email, nombre: App.usuario.nombre, fecha_hora: new Date().toISOString() });
        App.lecturas.push(it);
      });
      U.aviso('¡Gracias! Quedó registrado', 'ok');
    } catch (e) { U.aviso(U.mensajeError(e), 'err', 7000); }
  }
  async function copiar(texto) {
    try { await navigator.clipboard.writeText(texto); U.aviso('Copy copiado', 'ok'); }
    catch (e) { U.modal('Copy', '<textarea style="width:100%;height:220px">' + esc(texto) + '</textarea>'); }
  }

  // ---------- Encabezado ----------
  function encabezado() {
    const u = App.usuario;
    document.getElementById('encabezado').innerHTML =
      '<a href="#"><img class="logo" src="' + CFG.logo + '" alt="Ideas Control"></a>' +
      '<div class="app-nombre"><b>' + esc(CFG.app.nombre) + '</b><span>' + CFG.app.id + ' · v' + CFG.app.version + '</span></div><div class="espacio"></div>' +
      '<div class="ic-user">' + IC.portal.boton() + '<div class="datos"><b>' + esc(u.nombre) + '</b><span>' + (esAdmin() ? 'Administrador' : 'Personal IC') + '</span></div>' +
      '<div class="ic-avatar" title="' + esc(u.email) + '">' + esc(U.fmt.iniciales(u.nombre)) + '</div><button class="ic-btn sec chico" id="btnSalir">Salir</button></div>';
    document.getElementById('encabezado').hidden = false;
    document.getElementById('btnSalir').onclick = () => IC.auth.salir();
  }

  // Miniatura (JPEG pequeño) para no tener muchos lienzos grandes en pantalla
  const miniaturas = {};
  async function miniatura(p) {
    const clave = p.Title + '|' + p._modificado;
    if (miniaturas[clave]) return miniaturas[clave];
    const cv = await Post.dibujar(datosPost(p));
    const m = document.createElement('canvas'); m.width = 432; m.height = 540;
    m.getContext('2d').drawImage(cv, 0, 0, 432, 540);
    return (miniaturas[clave] = m.toDataURL('image/jpeg', 0.85));
  }
  async function pintarMiniaturas(raiz) {
    for (const img of raiz.querySelectorAll('img[data-mini]')) {
      const p = App.piezas.find((x) => x.Title === img.dataset.mini); if (p) img.src = await miniatura(p);
    }
  }

  // =====================================================================
  // MURO (todo el personal)
  // =====================================================================
  function vistaMuro(c) {
    const pubs = App.piezas.filter(publicada).filter((p) => !App.filtroMuro || p.programa_id === App.filtroMuro).reverse();
    const hoy = pubs[0];
    const pendientes = pubs.filter((p) => !leida(p)).length;
    let html = '<div class="ic-barra"><div style="flex:1"><h1 class="ic-titulo">' + saludo() + ', ' + esc(String(App.usuario.nombre).split(' ')[0]) + '</h1>' +
      '<p class="ic-subtitulo" style="margin:0">Una idea práctica para aplicar hoy. ' + (pendientes ? '<b>' + pendientes + ' pieza' + (pendientes === 1 ? '' : 's') + ' por leer.</b>' : '¡Vas al día!') + '</p></div>' +
      (App.programas.length > 1 ? '<select id="fProg"><option value="">Todos los programas</option>' + App.programas.map((p) => '<option value="' + esc(p.Title) + '"' + (p.Title === App.filtroMuro ? ' selected' : '') + '>' + esc(p.nombre) + '</option>').join('') + '</select>' : '') + '</div>';
    if (!hoy) html += '<div class="ic-tabla-caja"><div class="ic-vacio">Todavía no hay piezas publicadas. La primera sale pronto.</div></div>';
    else {
      html += '<div class="tal-hoy"><div class="tal-lienzo"><canvas id="cvHoy"></canvas></div><div class="tal-info">' + fichaPieza(hoy, true) + '</div></div>';
      if (pubs.length > 1) html += '<div class="ic-seccion">Anteriores</div><div class="tal-grid">' + pubs.slice(1).map((p) =>
        '<button class="tal-mini' + (leida(p) ? ' leida' : '') + '" data-id="' + esc(p.Title) + '"><img data-mini="' + esc(p.Title) + '" alt="' + esc(p.titular) + '"><span>' + esc(p.etiqueta || '') + ' · ' + esc(fechaTexto(p.fecha_publicacion)) + '</span>' + (leida(p) ? '<i>✔ Entendido</i>' : '<i class="no">Por leer</i>') + '</button>').join('') + '</div>';
    }
    c.innerHTML = html;
    const f = c.querySelector('#fProg'); if (f) f.onchange = () => { App.filtroMuro = f.value; vistaMuro(c); };
    if (hoy) { Post.dibujar(datosPost(hoy), c.querySelector('#cvHoy')); conectarFicha(c, hoy, () => vistaMuro(c)); }
    c.querySelectorAll('.tal-mini').forEach((b) => { b.onclick = () => abrirPieza(App.piezas.find((x) => x.Title === b.dataset.id), () => vistaMuro(c)); });
    pintarMiniaturas(c);
  }
  function saludo() { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; }
  function fichaPieza(p, grande) {
    return '<div class="tal-prog">' + esc(prog(p.programa_id).nombre) + ' · ' + esc(p.etiqueta || '') + '</div>' +
      '<h2>' + esc(p.titular) + '</h2><p class="ope-nota" style="margin:0 0 12px">' + esc(fechaTexto(p.fecha_publicacion, true)) + '</p>' +
      (p.copy ? '<div class="tal-copy">' + esc(p.copy) + '</div>' : '') +
      (p.accion ? '<div class="tal-accion"><b>Para aplicar hoy</b>' + esc(p.accion) + '</div>' : '') +
      '<div class="tal-botones">' + (leida(p) ? '<span class="tal-ok">✔ Entendido</span>' : '<button class="ic-btn" data-acc="ok">Entendido</button>') +
      '<button class="ic-btn sec" data-acc="png">Descargar imagen</button>' + (p.copy ? '<button class="ic-btn sec" data-acc="copy">Copiar texto</button>' : '') + '</div>';
  }
  function conectarFicha(raiz, p, alCambiar) {
    const b = (k) => raiz.querySelector('[data-acc="' + k + '"]');
    if (b('ok')) b('ok').onclick = async () => { await marcarEntendido(p, b('ok')); alCambiar(); };
    if (b('png')) b('png').onclick = () => Post.descargar(datosPost(p), nombreArchivo(p));
    if (b('copy')) b('copy').onclick = () => copiar(p.copy);
  }
  function abrirPieza(p, alCambiar) {
    U.modal(prog(p.programa_id).nombre + ' · ' + (p.etiqueta || ''), '<div class="tal-hoy modal"><div class="tal-lienzo"><canvas id="cvM"></canvas></div><div class="tal-info">' + fichaPieza(p) + '</div></div>', (cu) => {
      Post.dibujar(datosPost(p), cu.querySelector('#cvM'));
      conectarFicha(cu, p, () => { U.cerrarModal(); alCambiar(); });
    });
  }

  // =====================================================================
  // PIEZAS (administración)
  // =====================================================================
  function vistaPiezas(c) {
    const l = App.piezas.filter((p) => !App.filtroProg || p.programa_id === App.filtroProg);
    const gente = audiencia.length;
    c.innerHTML = '<div class="ic-barra"><div style="flex:1"><h1 class="ic-titulo">Piezas</h1><p class="ic-subtitulo" style="margin:0">Edite, programe y revise cada pieza antes de que se publique.</p></div>' +
      '<select id="fProg"><option value="">Todos los programas</option>' + App.programas.map((p) => '<option value="' + esc(p.Title) + '"' + (p.Title === App.filtroProg ? ' selected' : '') + '>' + esc(p.nombre) + '</option>').join('') + '</select>' +
      '<button class="ic-btn sec" id="bImportar" title="Cargar muchas piezas desde un Excel">Carga masiva</button><button class="ic-btn sec" id="bFechas" title="Repartir los borradores sin fecha en días y hora">Asignar fechas</button>' +
      '<button class="ic-btn sec" id="bProgTodas">Programar borradores</button><button class="ic-btn" id="bNueva">+ Nueva pieza</button></div>' +
      '<div class="ic-tabla-caja ope-scroll"><table class="ic-tabla"><thead><tr><th style="width:90px"></th><th>Pieza</th><th>Publicación</th><th>Estado</th><th class="num">Entendido</th></tr></thead><tbody>' +
      (l.length ? l.map((p) => {
        const n = App.lecturas.filter((x) => x.pieza_id === p.Title).length;
        return '<tr data-id="' + esc(p.Title) + '" class="' + (p.estado === 'ARCHIVADA' ? 'inactivo' : '') + '"><td><img class="tal-thumb" data-mini="' + esc(p.Title) + '" alt=""></td>' +
          '<td><b>' + esc(p.titular) + '</b><span class="sec">' + esc(prog(p.programa_id).nombre + ' · ' + (p.etiqueta || '')) + '</span></td>' +
          '<td>' + esc(fechaTexto(p.fecha_publicacion, true)) + '</td><td><span class="tal-est e-' + esc(estadoVisible(p).toLowerCase()) + '">' + esc(estadoVisible(p)) + '</span></td>' +
          '<td class="num">' + (publicada(p) ? n + (gente ? ' / ' + gente : '') : '—') + '</td></tr>';
      }).join('') : '<tr><td colspan="5" class="ic-vacio">No hay piezas.</td></tr>') + '</tbody></table></div>';
    c.querySelector('#fProg').onchange = (e) => { App.filtroProg = e.target.value; vistaPiezas(c); };
    c.querySelector('#bNueva').onclick = () => editor(null, () => vistaPiezas(c));
    const recargar = async () => { await cargar(); vistaPiezas(c); };
    c.querySelector('#bImportar').onclick = () => TalCarga.importar(recargar);
    c.querySelector('#bFechas').onclick = () => TalCarga.asignarFechas(App.filtroProg, recargar);
    c.querySelector('#bProgTodas').onclick = async () => {
      const bor = l.filter((p) => p.estado === 'BORRADOR' && p.fecha_publicacion && p.titular && (p.tipo === 'RESUMEN' || p.mensaje));
      if (!bor.length) { U.aviso('No hay borradores con fecha para programar en este filtro.', 'warn'); return; }
      if (!(await U.confirmar('Programar ' + bor.length + ' piezas', 'Se programarán todos los borradores con fecha' + (App.filtroProg ? ' de este programa' : '') + '. Cada uno se publica en su fecha y hora:\n\n' +
        bor.map((p) => '• ' + (p.etiqueta || '') + ' — ' + fechaTexto(p.fecha_publicacion, true)).join('\n') + '\n\nPuede editarlas o volverlas a borrador después.', 'Programar'))) return;
      try { for (const p of bor) await G.actualizar('TAL_Piezas', p._id, { estado: 'PROGRAMADA' }, p._etag); U.aviso(bor.length + ' piezas programadas', 'ok'); }
      catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); }
      await cargar(); vistaPiezas(c);
    };
    c.querySelectorAll('tr[data-id]').forEach((tr) => { tr.onclick = () => editor(App.piezas.find((x) => x.Title === tr.dataset.id), () => vistaPiezas(c)); });
    pintarMiniaturas(c);
  }

  function editor(p, alCambiar) {
    const nueva = !p;
    p = p || { programa_id: App.filtroProg || (App.programas[0] && App.programas[0].Title), tipo: 'TIP', estado: 'BORRADOR' };
    const fp = partes(p.fecha_publicacion);
    const html = '<div class="tal-editor"><form class="ic-form" id="fP" autocomplete="off">' +
      '<fieldset><legend>1 · El post</legend><div class="ic-campos">' +
      U.campo({ name: 'titular', label: 'Titular', valor: p.titular, req: true, c: 'c12' }) +
      '<div class="ic-campo c12" id="cMsj"><label for="f_mensaje">Idea clave</label><textarea id="f_mensaje" name="mensaje" rows="2">' + esc(p.mensaje || '') + '</textarea></div>' +
      '<div class="ic-campo c12" id="cItems"><label for="f_items">Ideas del resumen (una por línea)</label><textarea id="f_items" name="items" rows="3">' + esc(p.items || '') + '</textarea></div>' +
      U.campo({ name: 'etiqueta', label: 'Etiqueta de la cápsula', valor: p.etiqueta, c: 'c8', ph: 'TIP 01 · RESUMEN SEMANA 1' }) +
      U.campo({ name: 'tam_titular', label: 'Tamaño del titular', valor: p.tam_titular, c: 'c4', modo: 'numeric', ph: 'Automático' }) +
      '</div></fieldset>' +
      '<fieldset><legend>2 · El texto que lo acompaña</legend><div class="ic-campos">' +
      U.campo({ name: 'copy', label: 'Copy', t: 'textarea', valor: p.copy, c: 'c12', filas: 4 }) +
      U.campo({ name: 'accion', label: 'Para aplicar hoy', t: 'textarea', valor: p.accion, c: 'c12', filas: 2 }) +
      '</div></fieldset>' +
      '<fieldset><legend>3 · Publicación</legend><div class="ic-campos">' +
      U.campo({ name: 'programa_id', label: 'Programa', t: 'select', op: App.programas.map((x) => [x.Title, x.nombre]), valor: p.programa_id, req: true, c: 'c8' }) +
      U.campo({ name: 'tipo', label: 'Tipo', t: 'select', op: [['TIP', 'Pieza'], ['RESUMEN', 'Resumen']], valor: p.tipo, vacio: false, c: 'c4' }) +
      U.campo({ name: 'fecha', label: 'Fecha', t: 'date', valor: fp.f, c: 'c4' }) +
      U.campo({ name: 'hora', label: 'Hora', t: 'time', valor: fp.h || CFG.horaPieza, c: 'c4' }) +
      U.campo({ name: 'orden', label: 'N° de orden', valor: p.orden, c: 'c4', modo: 'numeric' }) +
      '</div></fieldset><p class="ope-nota">Estado: <b>' + esc(estadoVisible(p)) + '</b>' + (p.Title ? ' · ' + esc(p.Title) : '') + (p._modificado ? ' · modificada ' + esc(U.fmt.fechaHora(p._modificado)) + ' por ' + esc(p._editor) : '') + '</p>' +
      '<div class="ic-acciones">' +
      (!nueva && p.estado !== 'ARCHIVADA' ? '<button type="button" class="ic-btn sec peligro-txt" data-e="ARCHIVADA">Archivar</button>' : '') +
      '<span style="flex:1"></span><button type="button" class="ic-btn sec" id="pPng">Descargar PNG</button>' +
      (p.estado === 'PROGRAMADA' ? '<button type="button" class="ic-btn sec" data-e="BORRADOR">Volver a borrador</button><button class="ic-btn" data-e="PROGRAMADA">Guardar</button>'
        : '<button type="button" class="ic-btn sec" data-e="BORRADOR">Guardar borrador</button><button type="button" class="ic-btn" data-e="PROGRAMADA">Guardar y programar</button>') +
      '</div></form><div class="tal-prev"><canvas id="cvE"></canvas></div></div>';
    U.modal(nueva ? 'Nueva pieza' : 'Editar pieza', html, (cu) => {
      cu.closest('.ic-modal').classList.add('ancho');
      const f = cu.querySelector('#fP'), cv = cu.querySelector('#cvE');
      const leer = () => { const v = U.leerForm(f); return Object.assign({}, p, v, { tam_titular: v.tam_titular ? Number(v.tam_titular) : '' }); };
      let t = null;
      const refrescar = () => {
        const v = leer();
        cu.querySelector('#cMsj').hidden = v.tipo === 'RESUMEN'; cu.querySelector('#cItems').hidden = v.tipo !== 'RESUMEN';
        clearTimeout(t); t = setTimeout(() => Post.dibujar(datosPost(v), cv), 120);
      };
      f.addEventListener('input', refrescar); f.addEventListener('change', (e) => {
        if (e.target.name === 'tipo' && !f.hora.value) f.hora.value = e.target.value === 'RESUMEN' ? CFG.horaResumen : CFG.horaPieza;
        refrescar();
      });
      refrescar();
      cu.querySelector('#pPng').onclick = () => Post.descargar(datosPost(leer()), nombreArchivo(leer()));
      f.onsubmit = (ev) => ev.preventDefault();
      cu.querySelectorAll('[data-e]').forEach((b) => {
        b.onclick = async () => {
          const v = leer(), estado = b.dataset.e, err = {};
          if (!v.programa_id) err.programa_id = 'Elija el programa';
          if (!v.titular) err.titular = 'Escriba el titular';
          if (estado === 'PROGRAMADA' && !v.fecha) err.fecha = 'Para programar, indique la fecha';
          if (estado === 'PROGRAMADA' && v.tipo === 'TIP' && !v.mensaje) err.mensaje = 'Escriba la idea clave';
          if (!U.marcarErrores(f, err)) return;
          if (estado === 'ARCHIVADA' && !(await U.confirmar('Archivar pieza', 'La pieza deja de verse en el muro. Se puede volver a borrador después.', 'Archivar', true))) { editor(p, alCambiar); return; }
          const campos = { programa_id: v.programa_id, tipo: v.tipo, etiqueta: v.etiqueta, orden: v.orden === '' ? null : Number(v.orden), tam_titular: v.tam_titular === '' ? null : v.tam_titular,
            titular: v.titular, mensaje: v.tipo === 'RESUMEN' ? '' : v.mensaje, items: v.tipo === 'RESUMEN' ? v.items : '', copy: v.copy, accion: v.accion,
            fecha_publicacion: unir(v.fecha, v.hora) || null, estado };
          try {
            await U.conCarga(b, async () => {
              if (nueva) {
                const n = await G.siguiente('TAL'); campos.Title = 'PZ-' + pad(n, 5);
                Object.keys(campos).forEach((k) => { if (campos[k] === null || campos[k] === '') delete campos[k]; });
                await G.crear('TAL_Piezas', campos);
              } else await G.actualizar('TAL_Piezas', p._id, campos, p._etag);
            });
            U.aviso(estado === 'PROGRAMADA' ? 'Programada: se publica ' + fechaTexto(campos.fecha_publicacion, true) : estado === 'ARCHIVADA' ? 'Pieza archivada' : 'Borrador guardado', 'ok', 6000);
            U.cerrarModal(); await cargar(); alCambiar();
          } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); }
        };
      });
    });
  }

  // =====================================================================
  // LECTURAS (administración)
  // =====================================================================
  let audiencia = [];
  async function cargarAudiencia() {
    const mapa = {};
    const poner = (email, nombre, origen) => { const e = String(email || '').toLowerCase().trim(); if (!e) return; mapa[e] = mapa[e] || { email: e, nombre: nombre || e, origen }; };
    const [tec, us, acc] = await Promise.all([G.items('OPE_Tecnicos').catch(() => []), G.items('SYS_Usuarios').catch(() => []), G.items('SYS_Accesos').catch(() => [])]);
    tec.filter((t) => t.estado !== 'INACTIVO').forEach((t) => poner(t.email, t.nombre, 'Técnico'));
    us.filter((u) => u.estado === 'ACTIVO').forEach((u) => poner(u.email, u.nombre, 'Comercial'));
    acc.filter((a) => a.estado !== 'INACTIVO').forEach((a) => poner(a.email, a.nombre, 'Oficina'));
    audiencia = Object.values(mapa).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
  function vistaLecturas(c) {
    const pubs = App.piezas.filter(publicada).filter((p) => !App.filtroLect || p.programa_id === App.filtroLect);
    c.innerHTML = '<div class="ic-barra"><div style="flex:1"><h1 class="ic-titulo">Lecturas</h1><p class="ic-subtitulo" style="margin:0">Quién marcó «Entendido» en cada pieza publicada. El personal sale de Técnicos (con correo), usuarios de Comercial y accesos de las apps.</p></div>' +
      '<select id="fLect"><option value="">Todos los programas</option>' + App.programas.map((p) => '<option value="' + esc(p.Title) + '"' + (p.Title === App.filtroLect ? ' selected' : '') + '>' + esc(p.nombre) + '</option>').join('') + '</select></div>' +
      (!pubs.length ? '<div class="ic-tabla-caja"><div class="ic-vacio">Aún no hay piezas publicadas.</div></div>' :
      '<div class="ic-tabla-caja ope-scroll"><table class="ic-tabla tal-lect"><thead><tr><th>Persona</th>' + pubs.map((p) => '<th class="num" title="' + esc(p.titular) + '">' + esc((p.etiqueta || '').replace(/^TIP\s*/i, '')) + '</th>').join('') + '<th class="num">Total</th></tr></thead><tbody>' +
      audiencia.map((a) => {
        let n = 0;
        const celdas = pubs.map((p) => { const ok = App.lecturas.some((l) => l.pieza_id === p.Title && String(l.email).toLowerCase() === a.email); if (ok) n++; return '<td class="num">' + (ok ? '<span class="ope-si">✔</span>' : '<span class="ope-no">·</span>') + '</td>'; }).join('');
        return '<tr style="cursor:default"><td><b>' + esc(a.nombre) + '</b><span class="sec">' + esc(a.origen) + '</span></td>' + celdas + '<td class="num"><b>' + Math.round(n * 100 / pubs.length) + ' %</b></td></tr>';
      }).join('') + '<tr style="cursor:default" class="tal-tot"><td><b>Leída por</b></td>' + pubs.map((p) => { const n = new Set(App.lecturas.filter((l) => l.pieza_id === p.Title).map((l) => String(l.email).toLowerCase())).size; return '<td class="num"><b>' + (audiencia.length ? Math.round(n * 100 / audiencia.length) + ' %' : n) + '</b></td>'; }).join('') + '<td></td></tr>' +
      '</tbody></table></div>');
    c.querySelector('#fLect').onchange = (e) => { App.filtroLect = e.target.value; vistaLecturas(c); };
  }

  // =====================================================================
  // PROGRAMAS (administración)
  // =====================================================================
  // Elimina el programa con todas sus piezas (y sus «Entendido»). No se puede deshacer.
  async function eliminarPrograma(p, c) {
    const piezas = App.piezas.filter((x) => x.programa_id === p.Title);
    const publicadas = piezas.filter(publicada).length, ids = new Set(piezas.map((x) => x.Title));
    const lect = App.lecturas.filter((l) => ids.has(l.pieza_id));
    U.cerrarModal();
    const ok = await U.confirmar('Eliminar «' + p.nombre + '»', 'Se eliminarán el programa y sus ' + piezas.length + ' pieza' + (piezas.length === 1 ? '' : 's') + '.' +
      (publicadas ? '\n\n⚠ ' + publicadas + ' ya se publicaron en el muro y desaparecerán' + (lect.length ? ', junto con ' + lect.length + ' registro(s) de «Entendido»' : '') + '. Si solo quiere ocultarlo, cancele y cambie su estado a Inactivo.' : '') +
      '\n\nEsta acción no se puede deshacer.', 'Eliminar todo', true);
    if (!ok) return;
    U.aviso('Eliminando…', 'info', 2000);
    try {
      for (const l of lect) await G.eliminar('TAL_Lecturas', l._id);
      for (const x of piezas) await G.eliminar('TAL_Piezas', x._id);
      await G.eliminar('TAL_Programas', p._id);
      ['filtroProg', 'filtroMuro', 'filtroLect'].forEach((k) => { if (App[k] === p.Title) App[k] = ''; });
      U.aviso('Programa eliminado con ' + piezas.length + ' piezas', 'ok');
    } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); }
    await cargar(); vistaProgramas(c);
  }

  function vistaProgramas(c) {
    c.innerHTML = '<div class="ic-barra"><div style="flex:1"><h1 class="ic-titulo">Programas</h1></div><button class="ic-btn" id="bN">+ Nuevo programa</button></div>' +
      '<div class="ic-tabla-caja"><table class="ic-tabla"><thead><tr><th>Programa</th><th>Público</th><th class="num">Piezas</th></tr></thead><tbody>' +
      App.programas.map((p) => '<tr data-id="' + esc(p._id) + '"><td><b>' + esc(p.nombre) + '</b><span class="sec">' + esc(p.descripcion || '') + '</span></td><td>' + esc(p.audiencia === 'TECNICOS' ? 'Técnicos' : 'Todo el personal') + '</td><td class="num">' + App.piezas.filter((x) => x.programa_id === p.Title).length + '</td></tr>').join('') + '</tbody></table></div>';
    const form = (p) => {
      const nuevo = !p; p = p || { audiencia: 'TODOS', estado: 'ACTIVO' };
      U.modal(nuevo ? 'Nuevo programa' : p.nombre, '<form class="ic-form" id="fG"><div class="ic-campos">' +
        U.campo({ name: 'nombre', label: 'Nombre (sale en cada post)', valor: p.nombre, req: true, c: 'c12' }) +
        U.campo({ name: 'descripcion', label: 'Propósito', t: 'textarea', valor: p.descripcion, c: 'c12', filas: 2 }) +
        U.campo({ name: 'audiencia', label: 'Público', t: 'select', op: [['TODOS', 'Todo el personal'], ['TECNICOS', 'Técnicos']], valor: p.audiencia, vacio: false, c: 'c6' }) +
        U.campo({ name: 'estado', label: 'Estado', t: 'select', op: [['ACTIVO', 'Activo'], ['INACTIVO', 'Inactivo']], valor: p.estado, vacio: false, c: 'c6' }) +
        '</div><div class="ic-acciones">' + (nuevo ? '' : '<button type="button" class="ic-btn peligro" id="gDel" style="margin-right:auto">Eliminar programa</button>') +
        '<button type="button" class="ic-btn sec" id="gNo">Cancelar</button><button class="ic-btn" id="gOk">Guardar</button></div></form>', (cu) => {
        cu.querySelector('#gNo').onclick = U.cerrarModal;
        if (!nuevo) cu.querySelector('#gDel').onclick = () => eliminarPrograma(p, c);
        cu.querySelector('#fG').onsubmit = async (ev) => {
          ev.preventDefault(); const v = U.leerForm(cu.querySelector('#fG'));
          if (!U.marcarErrores(cu.querySelector('#fG'), !v.nombre ? { nombre: 'Obligatorio' } : {})) return;
          try {
            await U.conCarga(cu.querySelector('#gOk'), async () => {
              if (nuevo) { const n = await G.siguiente('TPR'); await G.crear('TAL_Programas', Object.assign({ Title: 'TP-' + pad(n, 2), orden: n }, v)); }
              else await G.actualizar('TAL_Programas', p._id, v, p._etag);
            });
            U.cerrarModal(); await cargar(); vistaProgramas(c);
          } catch (e) { U.aviso(U.mensajeError(e), 'err', 8000); }
        };
      });
    };
    c.querySelector('#bN').onclick = () => form(null);
    c.querySelectorAll('tr[data-id]').forEach((tr) => { tr.onclick = () => form(App.programas.find((x) => x._id === tr.dataset.id)); });
  }

  // ---------- Navegación ----------
  function pintar() {
    const c = document.getElementById('contenido');
    const tabs = esAdmin() ? '<div class="ic-chips tal-tabs">' + [['muro', 'Muro'], ['piezas', 'Piezas'], ['lecturas', 'Lecturas'], ['programas', 'Programas']]
      .map((t) => '<button data-v="' + t[0] + '"' + (App.vista === t[0] ? ' class="activo"' : '') + '>' + t[1] + '</button>').join('') + '</div>' : '';
    c.innerHTML = tabs + '<div id="vista"></div>';
    c.querySelectorAll('.tal-tabs button').forEach((b) => { b.onclick = () => { App.vista = b.dataset.v; history.replaceState(null, '', b.dataset.v === 'muro' ? location.pathname : '#' + b.dataset.v); pintar(); }; });
    const v = c.querySelector('#vista');
    ({ muro: vistaMuro, piezas: vistaPiezas, lecturas: vistaLecturas, programas: vistaProgramas })[esAdmin() ? App.vista : 'muro'](v);
  }

  async function resolverAcceso(cuenta) {
    const email = String(cuenta.username || '').toLowerCase();
    let rol = 'LECTOR';
    try {
      const acc = (await G.items('SYS_Accesos')).filter((x) => String(x.email || '').toLowerCase() === email && x.estado !== 'INACTIVO');
      const a = acc.find((x) => x.app_id === CFG.app.id) || acc.find((x) => x.app_id === 'APP-106');
      if (a && a.rol === 'ADMIN') rol = 'ADMIN';
    } catch (e) { /* sin lectura de accesos: lector */ }
    return { email, nombre: cuenta.name || email, rol, usuario_id: email };
  }

  async function arrancar() {
    const raiz = document.getElementById('contenido');
    U.pantalla(raiz, { logo: CFG.logo, cargando: true, titulo: 'Cargando…', texto: 'Conectando con Microsoft 365' });
    try {
      const cuenta = await IC.auth.iniciar(CFG.auth);
      if (!cuenta) { U.pantalla(raiz, { logo: CFG.logo, titulo: CFG.app.nombre, texto: 'Ingrese con su cuenta de Microsoft de Ideas Control.', boton: 'Iniciar sesión', alClic: () => IC.auth.entrar() }); return; }
      await G.sitio(CFG.sitio.host, CFG.sitio.ruta);
      App.usuario = await resolverAcceso(cuenta);
      await cargar();
      if (esAdmin()) await cargarAudiencia();
      encabezado();
      const volver = IC.auth.volverA(); if (volver) location.hash = volver;
      const ir = () => { const h = (location.hash || '#').slice(1); App.vista = ['piezas', 'lecturas', 'programas'].indexOf(h) >= 0 ? h : 'muro'; pintar(); window.scrollTo(0, 0); };
      window.addEventListener('hashchange', ir); ir();
      Post.preparar();
    } catch (e) {
      console.error(e);
      const faltan = /No existe la lista TAL_/.test(e.message);
      U.pantalla(raiz, { logo: CFG.logo, titulo: faltan ? 'Falta instalar la app' : 'No se pudo cargar la app',
        texto: faltan ? 'Las listas de Desarrollo de Talento aún no existen en IC Apps. Abra el instalador (Programacion/Instalador/) y haga clic en «Crear estructura».' : (e.status === 403 || e.status === 404 ? 'Su cuenta todavía no tiene permiso para ver los contenidos. Pida acceso a la Dirección de Operaciones.' : U.mensajeError(e)),
        boton: 'Reintentar', alClic: () => location.reload() });
    }
  }
  window.addEventListener('DOMContentLoaded', arrancar);
})();
