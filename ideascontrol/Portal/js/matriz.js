/* =====================================================================
   APP-100 · Portal — Matriz de accesos (Excel descargable)
   Lee en vivo SYS_Usuarios (Comercial), SYS_Accesos y OPE_Tecnicos y aplica
   las mismas reglas de acceso que usan las microapps. Solo Dirección.
   ===================================================================== */
window.MatrizAccesos = (function () {
  const G = IC.graph, U = IC.ui;
  const SI = '✔', NO = '—';
  // Personal de IC (para que aparezcan aunque aún no tengan accesos registrados)
  const PERSONAL = ['operaciones@ideascontrol.com', 'patricia@ideascontrol.com', 'margarita@ideascontrol.com', 'leonardo@ideascontrol.com', 'david@ideascontrol.com',
    'soporte@ideascontrol.com', 'juan.morales@ideascontrol.com', 'asistente.admin@ideascontrol.com'];

  // Módulos de cada app y quién los ve: (rol) => true/false. Los roles salen de reglas(): ver más abajo.
  const APPS = [
    { app: 'Comercial (APP-101)', rol: 'com', modulos: [
      ['Empresas y contactos', (r) => !!r], ['Productos y precios', (r) => !!r], ['Nueva cotización', (r) => !!r], ['Cotizaciones', (r) => !!r],
      ['Mis pendientes', (r) => !!r], ['Tablero comercial', (r) => !!r], ['Actividad reciente', (r) => !!r], ['Ayuda', (r) => !!r],
      ['Carga masiva', (r) => r === 'Administrador'], ['Administración', (r) => r === 'Administrador']] },
    { app: 'Programación (APP-106)', rol: 'prg', modulos: [
      ['Mi agenda', (r) => r === 'Técnico'], ['Agenda', (r) => !!r], ['Actividades', (r) => !!r], ['Programación semanal', (r) => !!r],
      ['Rotación de oficina', (r) => !!r], ['Carga por técnico', (r) => !!r], ['Conflictos', (r) => !!r], ['Políticas y ayuda', (r) => !!r],
      ['Puede programar (crear y editar)', (r) => r === 'Director de Operaciones' || r === 'Programador'], ['Administración', (r) => r === 'Director de Operaciones']] },
    { app: 'Novedades del personal (APP-107)', rol: 'nov', modulos: [
      ['Nueva solicitud', (r) => r === 'Técnico'], ['Mis solicitudes', (r) => r === 'Técnico'], ['Bandeja de aprobación', (r) => r === 'Dirección'],
      ['Solicitudes (todas)', (r) => r === 'Dirección' || r === 'Consulta'], ['Calendario de ausencias', (r) => r === 'Dirección' || r === 'Consulta'],
      ['Registrar novedad', (r) => r === 'Dirección'], ['Faltas', (r) => r === 'Dirección']] },
    { app: 'Desarrollo de Talento (APP-108)', rol: 'tal', modulos: [
      ['Muro (leer, Entendido, descargar)', (r) => !!r], ['Piezas (crear, editar, programar)', (r) => r === 'Administrador'], ['Lecturas', (r) => r === 'Administrador'], ['Programas', (r) => r === 'Administrador']] },
    { app: 'Soporte técnico (tickets) (APP-102)', rol: 'tik', modulos: [['Centro de tiquetes (mesadeayuda.timevisionbi.com)', (r) => !!r]] },
    { app: 'Gestión documental (APP-105)', rol: 'doc', modulos: [['Consultar documentos y plantillas', (r) => !!r]] },
    { app: 'Gestión de Clientes (APP-109)', rol: 'cli', modulos: [['Resumen, tareas e importar', (r) => !!r]] },
    { app: 'Calculadora de costos y precios (APP-110)', rol: 'cal', modulos: [['Nuevo cálculo e historial', (r) => !!r], ['Eliminar del historial', (r) => r === 'Dirección de Operaciones']] },
    { app: 'Portal', rol: 'por', modulos: [['Sitios de SharePoint', (r) => !!r], ['Matriz de accesos', (r) => !!r]] }
  ];

  function reglas(email, d) {
    const mios = d.acc.filter((x) => String(x.email || '').toLowerCase() === email && x.estado !== 'INACTIVO');
    const a6 = mios.find((x) => x.app_id === 'APP-106'), a7 = mios.find((x) => x.app_id === 'APP-107') || a6, a8 = mios.find((x) => x.app_id === 'APP-108') || a6;
    const tec = d.tec.find((x) => String(x.email || '').toLowerCase() === email && x.estado !== 'INACTIVO');
    const usr = d.usr.find((x) => String(x.email || '').toLowerCase() === email && x.estado === 'ACTIVO');
    const dueno = (CFG.verSitios || []).indexOf(email) >= 0;
    const oficina = !!usr || (a6 && !!a6.rol);
    return {
      com: usr ? (usr.rol === 'ADMIN' ? 'Administrador' : 'Comercial') : '',
      prg: a6 ? ({ ADMIN: 'Director de Operaciones', EDITOR: 'Programador', CONSULTA: 'Consulta' }[a6.rol] || a6.rol) : tec ? 'Técnico' : '',
      nov: a7 ? (a7.rol === 'ADMIN' ? 'Dirección' : 'Consulta') : tec ? 'Técnico' : '',
      tal: a8 && a8.rol === 'ADMIN' ? 'Administrador' : 'Personal IC',
      tik: 'Todo el personal',
      doc: oficina ? 'Consulta' : tec ? 'Pendiente (permiso SharePoint)' : 'Según permisos de SharePoint',
      cli: dueno ? 'Dirección' : '',
      cal: ({ 'operaciones@ideascontrol.com': 'Dirección de Operaciones', 'patricia@ideascontrol.com': 'Gerencia General', 'margarita@ideascontrol.com': 'Dirección Comercial' })[email] || '',
      por: dueno ? 'Dirección' : '',
      _nombre: (usr && usr.nombre) || (mios[0] && mios[0].nombre) || (tec && tec.nombre) || '',
      _tipo: tec && !oficina ? 'Técnico' : oficina ? 'Oficina' : 'Sin registrar'
    };
  }

  function cargarXLSX() {
    if (window.XLSX) return Promise.resolve();
    return new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar la librería de Excel.')); document.head.appendChild(s); });
  }

  async function descargar() {
    U.aviso('Armando la matriz de accesos…', 'info', 3000);
    await cargarXLSX();
    const [usr, acc, tec] = await Promise.all([
      G.items('SYS_Usuarios', { top: 999 }).catch(() => []), G.items('SYS_Accesos', { top: 999 }).catch(() => []), G.items('OPE_Tecnicos', { top: 999 }).catch(() => [])]);
    const d = { usr, acc, tec };
    const emails = new Set(PERSONAL);
    usr.forEach((x) => x.email && x.estado === 'ACTIVO' && emails.add(String(x.email).toLowerCase()));
    acc.forEach((x) => x.email && x.estado !== 'INACTIVO' && emails.add(String(x.email).toLowerCase()));
    tec.forEach((x) => x.email && x.estado !== 'INACTIVO' && emails.add(String(x.email).toLowerCase()));
    const filas = Array.from(emails).map((e) => ({ e, r: reglas(e, d) })).sort((a, b) => a.r._tipo.localeCompare(b.r._tipo) || (a.r._nombre || a.e).localeCompare(b.r._nombre || b.e));

    // Hoja 1: matriz por módulo (dos filas de encabezado: app y módulo)
    const h1 = ['Usuario', 'Correo', 'Tipo'], h2 = ['', '', ''], merges = [];
    APPS.forEach((ap) => { const ini = h1.length; h1.push(ap.app); h2.push('Rol'); ap.modulos.forEach(() => { h1.push(''); }); ap.modulos.forEach((m) => h2.push(m[0])); merges.push({ s: { r: 0, c: ini }, e: { r: 0, c: h1.length - 1 } }); });
    const aoa = [h1, h2].concat(filas.map(({ e, r }) => {
      const fila = [r._nombre || e.split('@')[0], e, r._tipo];
      APPS.forEach((ap) => { const rol = r[ap.rol]; fila.push(rol || 'Sin acceso'); ap.modulos.forEach((m) => fila.push(rol && !/^(Pendiente|Según)/.test(rol) && m[1](rol) ? SI : /^Según/.test(rol || '') ? '?' : NO)); });
      return fila;
    }));
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges'] = merges;
    ws['!cols'] = h2.map((x, i) => ({ wch: i === 0 ? 26 : i === 1 ? 32 : i === 2 ? 10 : x === 'Rol' ? 22 : Math.max(10, Math.min(24, x.length + 2)) }));
    ws['!freeze'] = { xSplit: 3, ySplit: 2 };

    // Hoja 2: resumen por app
    const ws2 = XLSX.utils.aoa_to_sheet([['Usuario', 'Correo', 'Tipo'].concat(APPS.map((a) => a.app))].concat(filas.map(({ e, r }) => [r._nombre || e.split('@')[0], e, r._tipo].concat(APPS.map((a) => r[a.rol] || 'Sin acceso')))));
    ws2['!cols'] = [{ wch: 26 }, { wch: 32 }, { wch: 10 }].concat(APPS.map(() => ({ wch: 26 })));

    // Hoja 3: de dónde sale cada rol
    const ws3 = XLSX.utils.aoa_to_sheet([
      ['App', 'Roles', 'Cómo se asigna'],
      ['Comercial (APP-101)', 'Administrador · Comercial', 'Comercial › Administración › Usuarios (lista SYS_Usuarios). Sin registro = sin acceso.'],
      ['Programación (APP-106)', 'Director de Operaciones · Programador · Consulta · Técnico', 'Programación › Administración › Accesos (SYS_Accesos). Técnico = su correo está en la ficha del técnico.'],
      ['Novedades (APP-107)', 'Dirección · Consulta · Técnico', 'SYS_Accesos de APP-107; si no tiene, toma el rol de la Programación. Técnico = correo en la ficha del técnico.'],
      ['Desarrollo de Talento (APP-108)', 'Administrador · Personal IC', 'Todo el personal ve el muro. Administrador = ADMIN en APP-108 o en la Programación.'],
      ['Soporte técnico (tickets) (APP-102)', 'Todo el personal', 'Activo para todos en el Portal. Abre el centro de tiquetes https://mesadeayuda.timevisionbi.com/ en una pestaña nueva; el inicio de sesión y los permisos internos los maneja la mesa de ayuda.'],
      ['Gestión documental (APP-105)', 'Consulta', 'Depende de los permisos de la biblioteca 00_Documentacion_Maestra en SharePoint. Los técnicos quedan pendientes del permiso del administrador.'],
      ['Gestión de Clientes (APP-109)', 'Dirección', 'Solo operaciones@ideascontrol.com (configuración de la app).'],
      ['Calculadora de costos y precios (APP-110)', 'Gerencia General · Dirección Comercial · Dirección de Operaciones', 'Solo patricia@, margarita@ y operaciones@ (configuración de la app). Eliminar registros del historial: solo operaciones@.'],
      ['Portal', 'Dirección', 'Sitios de SharePoint y esta matriz: solo operaciones@ideascontrol.com.'],
      [], ['Generada', new Date().toLocaleString('es-CO')], ['Nota', 'La matriz refleja lo que muestran las apps. Los permisos de SharePoint (quién puede abrir los sitios directamente) se administran aparte.']]);
    ws3['!cols'] = [{ wch: 30 }, { wch: 52 }, { wch: 110 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Matriz por módulo');
    XLSX.utils.book_append_sheet(wb, ws2, 'Resumen por app');
    XLSX.utils.book_append_sheet(wb, ws3, 'Roles y reglas');
    const h = new Date(), f = h.getFullYear() + '-' + String(h.getMonth() + 1).padStart(2, '0') + '-' + String(h.getDate()).padStart(2, '0');
    XLSX.writeFile(wb, 'Matriz_de_accesos_IC_' + f + '.xlsx');
    U.aviso('Matriz descargada: ' + filas.length + ' usuarios', 'ok');
  }
  return { descargar };
})();
