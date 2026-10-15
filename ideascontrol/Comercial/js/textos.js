/* =====================================================================
   APP-101 · Comercial — Datos automáticos dentro de los textos
   Regla: cada dato vive en UN solo lugar (Parámetros o Productos).
   Las condiciones comerciales no repiten el dato: lo nombran entre llaves, ej. {vigencia}.
   Al crear la cotización, el texto se resuelve con los valores de ese momento y se guarda
   ya resuelto en COT_CotizacionCondiciones. Si después cambia el parámetro, las cotizaciones
   anteriores NO cambian; las nuevas (y las revisiones R1, R2…) toman el valor vigente.
   ===================================================================== */
(function () {
  const pct = (v) => (v === '' || v === null || v === undefined ? '' : (Math.round(Number(v) * 10000) / 100).toLocaleString('es-CO') + ' %');
  const fechaLarga = (iso) => { if (!iso) return ''; const d = new Date(String(iso).slice(0, 10) + 'T12:00:00'); return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }); };

  // Datos disponibles. fuente: de dónde sale (para mostrarlo al usuario)
  const VARIABLES = [
    { clave: 'vigencia', nombre: 'Vigencia', fuente: 'Parámetros › Vigencia de la cotización', param: 'VIGENCIA_DIAS_HABILES',
      valor: (P) => (P.VIGENCIA_DIAS_HABILES ? P.VIGENCIA_DIAS_HABILES + ' días hábiles' : '') },
    { clave: 'fecha de vencimiento', nombre: 'Fecha de vencimiento', fuente: 'Se calcula en cada cotización (fecha + vigencia en días hábiles)',
      valor: (P, ctx) => (ctx && ctx.fecha_vencimiento ? fechaLarga(ctx.fecha_vencimiento) : ''), ejemplo: '(fecha que calcula la cotización)' },
    { clave: 'datos bancarios', nombre: 'Datos bancarios', fuente: 'Parámetros › Datos bancarios', param: 'DATOS_BANCARIOS',
      valor: (P) => P.DATOS_BANCARIOS || '' },
    { clave: 'IVA', nombre: 'IVA', fuente: 'Parámetros › IVA', param: 'IVA_PORCENTAJE', valor: (P) => pct(P.IVA_PORCENTAJE) },
    { clave: 'sitio web', nombre: 'Sitio web', fuente: 'Parámetros › Sitio web', param: 'SITIO_WEB', valor: (P) => P.SITIO_WEB || '' },
    { clave: 'garantía de los productos', nombre: 'Garantía de los productos', fuente: 'Productos › Garantía (meses) de cada producto cotizado',
      valor: (P, ctx) => garantias(ctx), ejemplo: '• AC-2100 PLUS RF/SC – Terminal biométrica: 36 meses\n• ACC-EMCARD – Tarjeta EM PROX: 12 meses' }
  ];
  // ctx.lineas = [{ codigo, nombre, garantia_meses }] de la cotización
  function garantias(ctx) {
    const vistos = {};
    return ((ctx && ctx.lineas) || []).filter((l) => Number(l.garantia_meses) > 0 && !vistos[l.codigo] && (vistos[l.codigo] = 1))
      .map((l) => '• ' + l.codigo + ' – ' + l.nombre + ': ' + Number(l.garantia_meses) + (Number(l.garantia_meses) === 1 ? ' mes' : ' meses')).join('\n');
  }
  const RX = /\{([^{}]+)\}/g;
  const buscar = (k) => VARIABLES.find((v) => v.clave.toLowerCase() === String(k).trim().toLowerCase());

  // P = { CLAVE_PARAMETRO: valor } · ctx = datos de la cotización (opcional)
  // modo 'ejemplo' usa un texto de muestra para lo que solo existe dentro de una cotización
  function resolver(texto, P, ctx, modo) {
    return String(texto || '').replace(RX, (m, k) => {
      const v = buscar(k); if (!v) return m;
      const r = v.valor(P || {}, ctx);
      return r || (modo === 'ejemplo' && v.ejemplo ? v.ejemplo : r);
    }).replace(/\n{3,}/g, '\n\n').trim();
  }
  // Variables mal escritas: {vijencia}
  const desconocidas = (texto) => (String(texto || '').match(RX) || []).map((m) => m.slice(1, -1)).filter((k) => !buscar(k));
  const usadas = (texto) => (String(texto || '').match(RX) || []).map((m) => buscar(m.slice(1, -1))).filter(Boolean);

  // Datos de Parámetros escritos a mano dentro del texto → [{ variable, encontrado, corregir(texto) }]
  const escRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function repetidos(texto, P) {
    const t = String(texto || ''), out = [];
    const agregar = (variable, rx) => { const m = t.match(rx); if (m) out.push({ variable, encontrado: m[0], corregir: (s) => s.replace(rx, '{' + variable.clave + '}') }); };
    if (P.VIGENCIA_DIAS_HABILES) agregar(buscar('vigencia'), new RegExp('\\b' + Number(P.VIGENCIA_DIAS_HABILES) + '\\s*d[ií]as\\s*h[áa]biles', 'gi'));
    if (P.DATOS_BANCARIOS && String(P.DATOS_BANCARIOS).trim().length > 8)
      agregar(buscar('datos bancarios'), new RegExp(String(P.DATOS_BANCARIOS).trim().split(/\s+/).map(escRx).join('\\s+'), 'gi'));
    if (P.IVA_PORCENTAJE) { const n = escRx(String(Math.round(Number(P.IVA_PORCENTAJE) * 10000) / 100).replace('.', ',')).replace(',', '[.,]');
      agregar(buscar('IVA'), new RegExp('\\b' + n + '\\s*%', 'g')); }
    if (P.SITIO_WEB && String(P.SITIO_WEB).length > 4) agregar(buscar('sitio web'), new RegExp('(https?:\\/\\/)?' + escRx(String(P.SITIO_WEB).replace(/^https?:\/\//, '')), 'gi'));
    // Número de cuenta escrito sin el resto de los datos bancarios
    if (P.DATOS_BANCARIOS && !out.some((x) => x.variable.clave === 'datos bancarios')) {
      const dig = String(P.DATOS_BANCARIOS).replace(/\D/g, '');
      if (dig.length >= 8 && new RegExp(dig.split('').join('[\\s.-]*')).test(t))
        out.push({ variable: buscar('datos bancarios'), encontrado: 'el número de cuenta', corregir: null });
    }
    return out;
  }
  // Garantías escritas a mano en una condición de tipo GARANTIA (los meses ya están en cada producto)
  function garantiaManual(texto) { return /\b\d+\s*(meses|mes|años|año)\b/i.test(String(texto || '')) && !/\{garant[ií]a de los productos\}/i.test(String(texto || '')); }
  function propuestaGarantia(texto) {
    const t = String(texto || '');
    const m = t.match(/^[^.]*?\d+\s*meses[^.]*?por defectos de fabricaci[oó]n([^.]*)\.\s*/i);
    if (m) return 'Por defectos de fabricación' + m[1] + ':\n{garantía de los productos}\n' + t.slice(m[0].length).trim();
    return t + '\n{garantía de los productos}';
  }

  window.ICTextos = { VARIABLES, resolver, desconocidas, usadas, repetidos, garantiaManual, propuestaGarantia, buscar };
})();
