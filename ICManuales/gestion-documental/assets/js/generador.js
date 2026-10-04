/* ==========================================================================
   GENERADOR DE DOCUMENTOS DE TRABAJO — Ideas Control
   1. Prediligencia las plantillas con los datos de la actividad (cliente,
      fecha, técnico, equipo…).
   2. Las nombra según la regla:
        [CLIENTE]_[ACTIVIDAD]_[FORMATO]_[DETALLE]_[AAAAMMDD].docx
   3. Las guarda en la carpeta de trabajo del técnico con la misma estructura
      del servidor de IC (o las entrega en un ZIP con esa estructura):
        CCCC_CLIENTE/04_INSTALACIONES/AAAA/INS-AAAA-NNN/…   (instalación, serie 2100)
        CCCC_CLIENTE/06_MANTENIMIENTO/AAAA/MTTO-AAAA-NNN/…  (mantenimiento, serie 2400)
   ========================================================================== */
(function () {
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const W14 = 'http://schemas.microsoft.com/office/word/2010/wordml';
  const C = window.GD_CATALOGO;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').replace(/[:.]$/, '').trim();
  const slug = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/Ñ/g, 'N').replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  const guion = s => slug(s).replace(/_/g, '-');

  const MODELOS = {
    'ZKTeco SpeedFace-V5L': { fabricante: 'ZKTeco', ins: '2110-INS-OPE' },
    'ZKTeco SpeedFace-V3L': { fabricante: 'ZKTeco', ins: '2117-INS-OPE' },
    'VIRDI AC-2100 Plus': { fabricante: 'VIRDI', ins: '2115-INS-OPE' },
    'VIRDI UBio-X Face': { fabricante: 'VIRDI', ins: '2116-INS-OPE' }
  };

  /* ---------- Formatos disponibles (desde el catálogo) ---------- */
  const FORMATOS = [];
  C.areas.forEach(a => a.grupos.forEach(g => g.docs.forEach(d => {
    if (d.generador && d.plantilla) FORMATOS.push({ ...d, grupo: g, area: a });
  })));
  FORMATOS.sort((x, y) => x.codigo.localeCompare(y.codigo));
  // Tipos de actividad = grupos con formatos habilitados (INS instalación, MTTO mantenimiento…)
  const NOMBRE_ACT = { INS: 'Instalación', MTTO: 'Mantenimiento' };
  const GRUPOS = [];
  FORMATOS.forEach(f => { if (!GRUPOS.some(g => g.id === f.grupo.id)) GRUPOS.push(f.grupo); });
  const grupoDe = tipo => GRUPOS.find(g => g.actividad === tipo) || GRUPOS[0];

  /* ---------- Qué dato va en cada etiqueta de cada plantilla ---------- */
  // Las claves son las etiquetas tal como aparecen en el Word (se comparan normalizadas).
  const fechaTxt = v => v.fecha ? v.fecha.split('-').reverse().join(' / ') : '';
  const sedeDir = v => [v.sede, v.direccion].filter(Boolean).join(' — ');
  const osTxt = v => [v.proyecto, v.os && 'OS ' + v.os, v.actividad].filter(Boolean).join(' · ');
  const resumenEquipos = v => {
    const n = {}; v.equipos.forEach(e => { n[e.modelo] = (n[e.modelo] || 0) + 1; });
    return Object.entries(n).map(([m, k]) => `${k} × ${m}`).join(', ');
  };
  const DATOS_CONTROL = {
    'cliente': v => v.cliente, 'sede / direccion': sedeDir,
    'equipo (tipo)': (v, e) => e && 'Terminal biométrica', 'marca / modelo': (v, e) => e && e.modelo,
    'n.º de serie': (v, e) => e && e.serial, 'fecha de instalacion': fechaTxt,
    'orden de servicio n.º': osTxt, 'instalador (ideas control)': v => v.tecnico,
    'coordinador de proyecto (interno)': v => v.coordinador
  };
  const MAPA = {
    '2101-FOR-OPE': {
      'cliente': v => v.cliente, 'nit': v => v.nit, 'sede / direccion': sedeDir, 'ciudad': v => v.ciudad,
      'contacto en sitio': v => v.contacto, 'cargo / telefono': v => [v.cargo, v.telefono].filter(Boolean).join(' / '),
      'fecha de la visita': fechaTxt, 'orden de servicio / proyecto': osTxt, 'tecnico responsable': v => v.tecnico,
      'equipo(s) a instalar (modelo y cantidad)': resumenEquipos
    },
    '2102-FOR-OPE': DATOS_CONTROL,
    '2103-FOR-OPE': {
      ...DATOS_CONTROL, 'serial': (v, e) => e && e.serial, 'ubicacion / sede': (v, e) => [v.sede, e && e.ubicacion].filter(Boolean).join(' — '),
      'modelo del dispositivo': (v, e) => e && { marcar: e.modelo }, 'instructivo aplicado': (v, e) => e && MODELOS[e.modelo] && { marcar: MODELOS[e.modelo].ins }
    },
    '2104-FOR-OPE': {
      'cliente': v => v.cliente, 'nit': v => v.nit, 'sede': v => v.sede, 'ciudad': v => v.ciudad, 'direccion': v => v.direccion,
      'contacto en sitio': v => v.contacto, 'cargo': v => v.cargo, 'telefono / correo': v => v.telefono, 'fecha': fechaTxt,
      'orden de servicio / proyecto': osTxt, 'tecnico responsable': v => v.tecnico,
      'tipo de actividad (instalacion / reemplazo / traslado / otro)': () => 'Instalación',
      'fabricante': (v, e) => e && (MODELOS[e.modelo] || {}).fabricante, 'marca': (v, e) => e && (MODELOS[e.modelo] || {}).fabricante,
      'modelo': (v, e) => e && e.modelo, 'numero de serie': (v, e) => e && e.serial, 'cantidad': (v, e) => e && '1',
      'punto exacto de instalacion': (v, e) => e && e.ubicacion
    },
    '2105-FOR-OPE': {
      'razon social': v => v.cliente, 'nit': v => v.nit, 'sede': v => v.sede, 'ciudad': v => v.ciudad, 'direccion': v => v.direccion,
      'contacto del cliente': v => v.contacto, 'cargo': v => v.cargo, 'proyecto / orden de servicio': osTxt,
      'tecnico responsable de ideas control': v => v.tecnico, 'fecha de instalacion': fechaTxt, 'fecha de emision': fechaTxt,
      '#tabla-equipos': v => v.equipos
    }
  };

  /* ---------- Edición del Word ---------- */
  const el = (doc, tag) => doc.createElementNS(W, 'w:' + tag);
  const txt = n => Array.from(n.getElementsByTagNameNS(W, 't')).map(t => t.textContent).join('');
  const hijos = (n, tag) => Array.from(n.childNodes).filter(c => c.localName === tag && c.namespaceURI === W);
  const oscuro = tc => {
    const shd = tc.getElementsByTagNameNS(W, 'shd')[0]; const f = shd && shd.getAttributeNS(W, 'fill');
    if (!f || f.length !== 6) return false;
    const [r, g, b] = [0, 2, 4].map(i => parseInt(f.substr(i, 2), 16));
    return 0.299 * r + 0.587 * g + 0.114 * b < 150;
  };
  function run(doc, valor) {
    const r = el(doc, 'r'), rp = el(doc, 'rPr'), f = el(doc, 'rFonts'), c = el(doc, 'color'), sz = el(doc, 'sz'), t = el(doc, 't');
    ['ascii', 'hAnsi', 'cs'].forEach(a => f.setAttributeNS(W, 'w:' + a, 'Calibri'));
    c.setAttributeNS(W, 'w:val', '1B365D'); sz.setAttributeNS(W, 'w:val', '19');
    rp.append(f, c, sz); t.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve'); t.textContent = valor;
    r.append(rp, t); return r;
  }
  function escribirEnCelda(doc, tc, valor, reemplazar) {
    const ps = hijos(tc, 'p');
    if (reemplazar) {
      Array.from(tc.getElementsByTagNameNS(W, 't')).forEach(t => { t.textContent = ''; });
      (ps[0] || tc.appendChild(el(doc, 'p'))).appendChild(run(doc, valor));
    } else {
      const p = el(doc, 'p'); const ppr = el(doc, 'pPr'); const sp = el(doc, 'spacing');
      sp.setAttributeNS(W, 'w:before', '40'); sp.setAttributeNS(W, 'w:after', '0'); ppr.appendChild(sp);
      p.append(ppr, run(doc, valor));
      const ult = ps[ps.length - 1]; ult ? ult.after(p) : tc.appendChild(p);
    }
  }
  function marcarCasilla(tc, etiqueta) {
    // Las casillas son controles de contenido (w14:checkbox); la etiqueta es el texto que sigue.
    const sdts = Array.from(tc.getElementsByTagNameNS(W, 'sdt'));
    for (const sdt of sdts) {
      let sig = sdt.nextSibling, lbl = '';
      while (sig && !(sig.localName === 'sdt')) { lbl += txt(sig); sig = sig.nextSibling; }
      if (norm(lbl).startsWith(norm(etiqueta)) || norm(lbl).includes(norm(etiqueta))) {
        const ch = sdt.getElementsByTagNameNS(W14, 'checked')[0]; if (ch) ch.setAttributeNS(W14, 'w14:val', '1');
        const t = sdt.getElementsByTagNameNS(W, 't')[0]; if (t) t.textContent = '☒';
        return true;
      }
    }
    return false;
  }
  function prediligenciar(doc, codigo, v, equipo) {
    if (window.GDMtto && GDMtto.RELLENO[codigo]) {  // serie 2400: relleno compartido con el formulario móvil
      const cuenta = () => { const x = new XMLSerializer().serializeToString(doc); return x.split('☒').length + x.split('w:val="1B365D"').length; };
      const antes = cuenta();
      GDMtto.RELLENO[codigo](doc, { ...v, tipoAct: 'MTTO' }, equipo || {}, equipo ? v.equipos.indexOf(equipo) : undefined);
      return cuenta() - antes;
    }
    const mapa = MAPA[codigo] || {};
    const claves = Object.fromEntries(Object.entries(mapa).map(([k, fn]) => [norm(k), fn]));
    let n = 0;
    for (const tbl of Array.from(doc.getElementsByTagNameNS(W, 'tbl'))) {
      const filas = hijos(tbl, 'tr');
      // Tabla de equipos entregados (2105)
      if (mapa['#tabla-equipos'] && filas.length > 1) {
        const cab = hijos(filas[0], 'tc').map(c => norm(txt(c)));
        if (cab[0] === 'equipo' && cab.includes('serial')) {
          v.equipos.forEach((e, i) => {
            const f = filas[i + 1]; if (!f) return;
            const val = { 'equipo': `EQ${String(i + 1).padStart(2, '0')} · Terminal biométrica`, 'fabricante': (MODELOS[e.modelo] || {}).fabricante || '',
              'modelo': e.modelo, 'serial': e.serial || '', 'cantidad': '1', 'ubicacion': [v.sede, e.ubicacion].filter(Boolean).join(' — ') };
            hijos(f, 'tc').forEach((tc, j) => { if (val[cab[j]]) { escribirEnCelda(doc, tc, val[cab[j]], true); n++; } });
          });
          continue;
        }
      }
      for (const tr of filas) {
        const tcs = hijos(tr, 'tc');
        tcs.forEach((tc, j) => {
          if (oscuro(tc)) return;
          const fn = claves[norm(txt(tc))]; if (!fn) return;
          const valor = fn(v, equipo); if (!valor) return;
          const sig = tcs[j + 1];
          if (valor.marcar) { if (sig && marcarCasilla(sig, valor.marcar)) n++; return; }
          if (sig && !oscuro(sig) && /^(|dd \/ mm \/ aaaa)$/.test(norm(txt(sig)))) escribirEnCelda(doc, sig, valor, true);
          else escribirEnCelda(doc, tc, valor, false);
          n++;
        });
      }
    }
    return n;
  }
  async function generarDocx(f, v, equipo) {  // equipo: objeto de v.equipos
    const resp = await fetch(f.plantilla); if (!resp.ok) throw new Error('No se pudo leer la plantilla ' + f.plantilla);
    const zip = await JSZip.loadAsync(await resp.arrayBuffer());
    const xml = await zip.file('word/document.xml').async('string');
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const campos = prediligenciar(doc, f.codigo, v, equipo);
    zip.file('word/document.xml', new XMLSerializer().serializeToString(doc));
    const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    return { blob, campos };
  }

  /* ---------- Nombres y rutas ---------- */
  function actividadId(v) { return `${v.tipoAct}-${v.anio}-${String(v.consecutivo).padStart(3, '0')}`; }
  function rutaCarpeta(v) { return [`${String(v.codCliente).padStart(4, '0')}_${slug(v.cliente)}`, v.carpeta, String(v.anio), actividadId(v)]; }
  function lista(v, seleccion) {
    const cc = String(v.codCliente).padStart(4, '0'); const act = actividadId(v); const f8 = (v.fecha || '').replace(/-/g, '');
    const out = [];
    seleccion.forEach(f => {
      const base = `${cc}_${act}_${f.codigo}`;
      if (f.generador.detalle === 'equipo') v.equipos.forEach((e, i) => out.push({ f, i, equipo: e, nombre: `${base}_EQ${String(i + 1).padStart(2, '0')}_${f8}.docx` }));
      else if (f.generador.detalle === 'sede') out.push({ f, nombre: `${base}_SEDE-${guion(v.sede || 'PRINCIPAL').slice(0, 14)}_${f8}.docx` });
      else out.push({ f, nombre: `${base}_${f8}.docx` });
    });
    return out;
  }

  /* ---------- Carpeta de trabajo (File System Access API) ---------- */
  const IDB = 'gd-generador';
  function idb(modo, fn) {
    return new Promise((ok, mal) => {
      const r = indexedDB.open(IDB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => { const tx = r.result.transaction('kv', modo); const st = tx.objectStore('kv'); const q = fn(st); tx.oncomplete = () => ok(q && q.result); tx.onerror = () => mal(tx.error); };
      r.onerror = () => mal(r.error);
    });
  }
  const guardarHandle = h => idb('readwrite', st => st.put(h, 'carpeta')).catch(() => {});
  const leerHandle = () => idb('readonly', st => st.get('carpeta')).catch(() => null);
  async function carpetaTrabajo(pedir) {
    let h = await leerHandle();
    if (h && (await h.queryPermission({ mode: 'readwrite' })) === 'granted') return h;
    if (h && pedir && (await h.requestPermission({ mode: 'readwrite' })) === 'granted') return h;
    if (!pedir) return h || null;
    h = await window.showDirectoryPicker({ id: 'ic-trabajo', mode: 'readwrite', startIn: 'documents' });
    await guardarHandle(h); return h;
  }
  async function nombreLibre(dir, nombre) {
    const [b, ext] = [nombre.replace(/\.docx$/, ''), '.docx'];
    for (let k = 1; k < 50; k++) {
      const n = k === 1 ? nombre : `${b}_v${k}${ext}`;
      try { await dir.getFileHandle(n); } catch { return n; }
    }
    return `${b}_${Date.now()}${ext}`;
  }

  /* ---------- Datos recordados (solo en este navegador) ---------- */
  const LS = 'gd_actividades';
  const recientes = () => { try { return JSON.parse(localStorage.getItem(LS) || '[]'); } catch { return []; } };
  const recordar = v => { try { const r = recientes().filter(x => actividadId(x) !== actividadId(v) || x.codCliente !== v.codCliente); r.unshift(v); localStorage.setItem(LS, JSON.stringify(r.slice(0, 15))); } catch { } };

  /* ---------- Interfaz ---------- */
  function iniciar() {
    const u = GDAuth.proteger(); if (!u) return;
    GD.encabezadoSimple?.(u);
    const params = new URLSearchParams(location.search);
    const pre = params.get('f');
    const hoy = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const fsOK = 'showDirectoryPicker' in window;
    const fPre = FORMATOS.find(f => f.codigo === pre);
    const tipoUrl = params.get('t');
    const tipo0 = fPre ? fPre.grupo.actividad : (GRUPOS.some(g => g.actividad === tipoUrl) ? tipoUrl : GRUPOS[0]?.actividad);
    $('main').innerHTML = `<div class="wrap">
      <nav class="migas"><a href="index.html">Inicio</a><span>›</span><a href="gestion-operativa.html">Gestión Operativa</a><span>›</span>Generar documentos de trabajo</nav>
      <section class="hero" style="padding-top:18px">
        <div class="eyebrow">Plantillas de trabajo · Serie <span id="serieTxt">${esc(grupoDe(tipo0)?.serie || '')}</span></div>
        <h1>Generar documentos de trabajo</h1>
        <p>Diligencie los datos de la actividad una sola vez. El portal entrega las plantillas <b>prediligenciadas</b>, con el <b>nombre definido</b> y organizadas en la <b>estructura de carpetas del servidor de IC</b>, listas para completar en sitio.</p>
      </section>
      <div class="gen-layout">
        <form id="gen" class="gen-form" autocomplete="off">
          ${recientes().length ? `<div class="gen-card"><label class="gen-l">Retomar una actividad reciente<select id="recientes"><option value="">— Seleccione —</option>${recientes().map((r, i) => `<option value="${i}">${esc(String(r.codCliente).padStart(4, '0'))} ${esc(r.cliente)} · ${esc(actividadId(r))} · ${esc(r.fecha)}</option>`).join('')}</select></label></div>` : ''}
          <fieldset class="gen-card"><legend>1. Actividad</legend>
            <div class="gen-grid">
              <label class="gen-l">Tipo<select name="tipoAct">${GRUPOS.map(g => `<option value="${g.actividad}" ${g.actividad === tipo0 ? 'selected' : ''}>${g.actividad} · ${esc(NOMBRE_ACT[g.actividad] || g.nombre)}</option>`).join('')}</select></label>
              <label class="gen-l" id="lblTipoMtto" hidden>Tipo de mantenimiento<select name="tipoMtto"><option>Preventivo</option><option>Correctivo</option><option>Extraordinario</option></select></label>
              <label class="gen-l">Año<input name="anio" type="number" min="2024" max="2099" value="${hoy.slice(0, 4)}" required></label>
              <label class="gen-l">Consecutivo<input name="consecutivo" type="number" min="1" max="999" value="1" required></label>
              <label class="gen-l">Fecha<input name="fecha" type="date" value="${hoy}" required></label>
              <label class="gen-l">Proyecto<input name="proyecto" placeholder="PRO-2026-001"></label>
              <label class="gen-l">Orden de servicio<input name="os" placeholder="N.º OS (si aplica)"></label>
              <label class="gen-l">Técnico responsable<input name="tecnico" required></label>
              <label class="gen-l">Coordinador de proyecto<input name="coordinador"></label>
            </div></fieldset>
          <fieldset class="gen-card"><legend>2. Cliente</legend>
            <div class="gen-grid">
              <label class="gen-l">Código cliente<input name="codCliente" type="number" min="1" max="9999" required placeholder="0002"></label>
              <label class="gen-l ancho">Nombre / razón social<input name="cliente" required placeholder="YAMAHA"></label>
              <label class="gen-l">NIT<input name="nit"></label>
              <label class="gen-l">Sede<input name="sede" placeholder="Principal"></label>
              <label class="gen-l">Ciudad<input name="ciudad"></label>
              <label class="gen-l ancho">Dirección<input name="direccion"></label>
              <label class="gen-l">Contacto en sitio<input name="contacto"></label>
              <label class="gen-l">Cargo<input name="cargo"></label>
              <label class="gen-l">Teléfono / correo<input name="telefono"></label>
            </div></fieldset>
          <fieldset class="gen-card"><legend>3. Equipos</legend>
            <div id="equipos"></div>
            <button type="button" class="btn sec" id="masEq">+ Agregar equipo</button></fieldset>
          <fieldset class="gen-card"><legend>4. Documentos a generar</legend>
            <div class="gen-docs" id="docsBox"></div>
            <p class="gen-movil" id="movilTxt" hidden>¿Está en sitio con el celular? Use <a href="mantenimiento.html">Diligenciar mantenimiento</a>: registra el checklist, las pruebas y el cierre, y entrega los Word ya diligenciados.</p></fieldset>
        </form>
        <aside class="gen-panel">
          <h3>Resultado</h3>
          <div class="gen-ruta"><small>Carpeta</small><code id="ruta">—</code><button type="button" class="btn enlace" id="copiar">Copiar ruta</button></div>
          <ol id="archivos" class="gen-archivos"></ol>
          <div class="gen-acc">
            ${fsOK ? `<button class="btn pri" id="guardar" type="button">${'Guardar en mi carpeta de trabajo'}</button>
              <div class="gen-sub" id="carpetaTxt"></div>` : ''}
            <button class="btn sec" id="zip" type="button">Descargar en ZIP (con carpetas)</button>
          </div>
          <div id="estado" class="gen-estado" role="status"></div>
          <details class="gen-ayuda"><summary>¿Cómo se organiza al llegar a la oficina?</summary>
            <ol><li>Los archivos quedan en su carpeta de trabajo (o en el ZIP) con la estructura <code id="ayudaRuta">CLIENTE\\04_INSTALACIONES\\AÑO\\INS-…</code>.</li>
            <li>Abra cada Word, complete en sitio y guarde <b>sin cambiar el nombre</b>.</li>
            <li>Escanee o exporte la versión firmada como <code>…_FIRMADO.pdf</code> y deje las fotos en <code>EVIDENCIAS</code>.</li>
            <li>En la oficina, copie la carpeta del cliente dentro de <code>01_CLIENTES</code> del servidor: se fusiona con la estructura existente.</li></ol>
            <p style="margin:8px 0 0">Consulte también la <a href="ruta-tecnico.html">ruta del técnico</a> y la <a href="estructura-carpetas.html">estructura de carpetas</a>.</p></details>
        </aside>
      </div></div>`;

    const form = $('#gen');
    const pintarDocs = (tipo, seleccion) => {
      const g = grupoDe(tipo);
      $('#docsBox').innerHTML = FORMATOS.filter(f => f.grupo.id === g.id).map(f => {
        const marcado = seleccion ? seleccion.includes(f.codigo) : (pre ? pre === f.codigo : !f.generador.opcional);
        const det = f.generador.nota || (f.generador.detalle === 'equipo' ? 'Uno por equipo' : f.generador.detalle === 'sede' ? 'Uno por sede' : 'Uno por actividad');
        return `<label class="gen-chk"><input type="checkbox" name="fmt" value="${f.codigo}" ${marcado ? 'checked' : ''}>
              <span><b>${esc(f.codigo)}</b> ${esc(f.titulo)}<small>${esc(det)}</small></span></label>`;
      }).join('');
      $('#serieTxt').textContent = g.serie || '';
      $('#lblTipoMtto').hidden = tipo !== 'MTTO'; $('#movilTxt').hidden = tipo !== 'MTTO';
      $('#ayudaRuta').textContent = `CLIENTE\\${g.carpeta}\\AÑO\\${tipo}-…`;
    };
    pintarDocs(tipo0);
    form.elements.tipoAct.addEventListener('change', e => { pintarDocs(e.target.value); pintar(); });
    const eqBox = $('#equipos');
    const filaEq = (e = {}) => {
      const d = document.createElement('div'); d.className = 'gen-eq';
      d.innerHTML = `<b class="gen-eqn"></b>
        <label class="gen-l">Modelo<select class="eq-modelo">${Object.keys(MODELOS).map(m => `<option ${e.modelo === m ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
        <label class="gen-l">Serial (opcional)<input class="eq-serial" value="${esc(e.serial || '')}"></label>
        <label class="gen-l">Ubicación (opcional)<input class="eq-ubic" value="${esc(e.ubicacion || '')}" placeholder="Portería principal"></label>
        <button type="button" class="gen-x" title="Quitar equipo">×</button>`;
      d.querySelector('.gen-x').onclick = () => { if (eqBox.children.length > 1) { d.remove(); pintar(); } };
      d.addEventListener('input', pintar); eqBox.appendChild(d);
    };
    $('#masEq').onclick = () => { filaEq(); pintar(); };
    filaEq();

    const valores = () => {
      const fd = new FormData(form); const v = Object.fromEntries(fd.entries());
      v.carpeta = grupoDe(v.tipoAct)?.carpeta || '04_INSTALACIONES';
      v.equipos = Array.from(eqBox.children).map(d => ({ modelo: d.querySelector('.eq-modelo').value, serial: d.querySelector('.eq-serial').value.trim(), ubicacion: d.querySelector('.eq-ubic').value.trim() }));
      v.seleccion = fd.getAll('fmt');
      return v;
    };
    const cargar = v => {
      Object.entries(v).forEach(([k, val]) => { const i = form.elements[k]; if (i && typeof val !== 'object' && i.type !== 'checkbox') i.value = val; });
      eqBox.innerHTML = ''; (v.equipos?.length ? v.equipos : [{}]).forEach(filaEq);
      pintarDocs(form.elements.tipoAct.value, v.seleccion);
      pintar();
    };
    $('#recientes')?.addEventListener('change', e => { const r = recientes()[e.target.value]; if (r) { const sel = pre ? undefined : r.seleccion; cargar({ ...r, seleccion: sel }); } });

    let actual = [];
    function pintar() {
      Array.from(eqBox.children).forEach((d, i) => { d.querySelector('.gen-eqn').textContent = 'EQ' + String(i + 1).padStart(2, '0'); });
      const v = valores();
      const ok = v.codCliente && v.cliente && v.fecha;
      const sel = FORMATOS.filter(f => v.seleccion.includes(f.codigo));
      actual = ok ? lista(v, sel) : [];
      $('#ruta').textContent = ok ? rutaCarpeta(v).join('\\') + '\\' : 'Complete código y nombre del cliente';
      $('#archivos').innerHTML = actual.length ? actual.map(a => `<li><code>${esc(a.nombre)}</code></li>`).join('') + '<li class="dir"><code>EVIDENCIAS\\</code></li>'
        : '<li class="vacio-li">Los archivos aparecerán aquí.</li>';
      ['guardar', 'zip'].forEach(id => { const b = $('#' + id); if (b) b.disabled = !actual.length; });
    }
    form.addEventListener('input', pintar); form.addEventListener('change', pintar);
    $('#copiar').onclick = () => navigator.clipboard?.writeText($('#ruta').textContent).then(() => estado('Ruta copiada.'));
    const estado = (m, tipo = '') => { const e = $('#estado'); e.className = 'gen-estado ' + tipo; e.innerHTML = m; };

    async function generarTodos(fnGuardar) {
      if (!form.reportValidity()) return;
      const v = valores(); recordar(v);
      let n = 0, campos = 0;
      for (const a of actual) {
        estado(`Generando ${esc(a.nombre)}…`);
        const r = await generarDocx(a.f, v, a.i != null ? v.equipos[a.i] : undefined); campos += r.campos;
        await fnGuardar(a, r.blob, v); n++;
      }
      return { n, campos, v };
    }
    $('#zip').onclick = async () => {
      try {
        const zip = new JSZip(); let base;
        const r = await generarTodos(async (a, blob, v) => {
          base = rutaCarpeta(v).join('/');
          zip.file(`${base}/${a.nombre}`, blob); zip.folder(`${base}/EVIDENCIAS`);
        });
        if (!r) return;
        const out = await zip.generateAsync({ type: 'blob' });
        const nombre = `${String(r.v.codCliente).padStart(4, '0')}_${actividadId(r.v)}_documentos.zip`;
        const url = URL.createObjectURL(out); const lnk = document.createElement('a'); lnk.href = url; lnk.download = nombre; lnk.click();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        estado(`Listo: ${r.n} documentos (${r.campos} campos prediligenciados) en <code>${esc(nombre)}</code>. Descomprímalo en su carpeta de trabajo.`, 'ok');
      } catch (e) { estado('No fue posible generar los documentos: ' + esc(e.message), 'error'); }
    };
    if (fsOK) {
      const mostrarCarpeta = async () => { const h = await carpetaTrabajo(false); $('#carpetaTxt').innerHTML = h ? `Carpeta de trabajo: <b>${esc(h.name)}</b> · <a href="#" id="cambiar">cambiar</a>` : 'La primera vez se le pedirá elegir su carpeta de trabajo (p. ej. Documentos\\IC_Trabajo).';
        $('#cambiar')?.addEventListener('click', async ev => { ev.preventDefault(); try { const h2 = await window.showDirectoryPicker({ id: 'ic-trabajo', mode: 'readwrite' }); await guardarHandle(h2); mostrarCarpeta(); } catch { } }); };
      mostrarCarpeta();
      $('#guardar').onclick = async () => {
        try {
          const raiz = await carpetaTrabajo(true); if (!raiz) return;
          const r = await generarTodos(async (a, blob, v) => {
            let dir = raiz; for (const p of rutaCarpeta(v)) dir = await dir.getDirectoryHandle(p, { create: true });
            await dir.getDirectoryHandle('EVIDENCIAS', { create: true });
            const nombre = await nombreLibre(dir, a.nombre);
            const fh = await dir.getFileHandle(nombre, { create: true }); const w = await fh.createWritable(); await w.write(blob); await w.close();
          });
          if (!r) return;
          estado(`Listo: ${r.n} documentos guardados en <b>${esc(raiz.name)}\\${esc(rutaCarpeta(r.v).join('\\'))}</b> (${r.campos} campos prediligenciados). Si un archivo ya existía, se guardó como <code>_v2</code>.`, 'ok');
          mostrarCarpeta();
        } catch (e) { if (e.name !== 'AbortError') estado('No fue posible guardar: ' + esc(e.message), 'error'); }
      };
    }
    pintar();
  }
  window.GDGenerador = { iniciar, _prediligenciar: prediligenciar, _lista: lista };
})();
