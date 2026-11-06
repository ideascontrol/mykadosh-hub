/* =====================================================================
   APP-101 · Comercial — Contenido para compartir
   Artículos del Centro de conocimiento (Recursos/articulos.js) con enlace
   con UTM por comercial y canal, y un mensaje listo para WhatsApp o correo.
   ===================================================================== */
(function () {
  const U = IC.ui, esc = U.esc;
  const CANALES = [['whatsapp', 'WhatsApp'], ['correo', 'Correo'], ['linkedin', 'LinkedIn']];
  let canal = 'whatsapp';
  function enlace(a) {
    const u = new URL(a.url);
    u.searchParams.set('utm_source', 'comercial'); u.searchParams.set('utm_medium', canal);
    u.searchParams.set('utm_campaign', a.slug); u.searchParams.set('utm_content', String(App.usuario.email || '').split('@')[0]);
    return u.toString();
  }
  function mensaje(a) {
    const nombre = String(App.usuario.nombre || '').split(' ')[0];
    return 'Hola, ¿cómo estás? Te comparto este artículo de Ideas Control que creo que te puede servir: «' + a.titulo + '».\n' + a.resumen + '\n\n' + enlace(a) +
      '\n\nAl final trae una herramienta gratuita (' + a.herramienta + ') para aplicarlo en tu empresa. Si quieres, lo revisamos juntos.\n' + nombre;
  }
  async function copiar(txt, msg) {
    try { await navigator.clipboard.writeText(txt); U.aviso(msg, 'ok'); }
    catch (e) { U.modal('Copiar', '<div class="ic-form"><textarea rows="10" style="width:100%">' + esc(txt) + '</textarea><p>Selecciónelo y cópielo con Ctrl+C.</p></div>'); }
  }
  App.vistas['contenido'] = function (c) {
    const A = window.IC_ARTICULOS || [];
    c.innerHTML = '<div class="ic-barra"><div><h1 class="ic-titulo">Contenido para compartir</h1><p class="ic-subtitulo" style="margin:0">Artículos del Centro de conocimiento para hacer seguimiento con valor. El enlace lleva su nombre y el canal, así sabemos qué lead llegó por usted.</p></div></div>' +
      '<div class="ic-filtros"><div class="ic-chips" id="canales">' + CANALES.map((x) => '<button type="button" data-c="' + x[0] + '"' + (x[0] === canal ? ' class="activo"' : '') + '>' + x[1] + '</button>').join('') + '</div>' +
      '<a class="ic-btn sec chico" href="/ideascontrol/Recursos/" target="_blank" rel="noopener">Ver el Centro de conocimiento</a></div>' +
      '<div class="ic-tabla-caja"><table class="ic-tabla"><thead><tr><th>Artículo</th><th>Tema</th><th>Herramienta</th><th></th></tr></thead><tbody>' +
      (A.map((a, i) => '<tr><td><b>' + esc(a.titulo) + '</b><span class="sec">' + esc(a.resumen) + '</span></td><td>' + esc(a.tema) + '</td><td>' + esc(a.herramienta) + '</td>' +
        '<td style="white-space:nowrap"><button class="ic-btn chico" data-msg="' + i + '">Copiar mensaje</button> <button class="ic-btn sec chico" data-url="' + i + '">Copiar enlace</button> <a class="ic-btn sec chico" href="' + esc(a.url) + '" target="_blank" rel="noopener">Abrir</a></td></tr>').join('') ||
        '<tr><td colspan="4" class="ic-vacio">Aún no hay artículos publicados.</td></tr>') + '</tbody></table></div>';
    c.querySelectorAll('#canales button').forEach((b) => { b.onclick = () => { canal = b.dataset.c; c.querySelectorAll('#canales button').forEach((x) => x.classList.toggle('activo', x === b)); }; });
    c.querySelectorAll('[data-msg]').forEach((b) => { b.onclick = () => copiar(mensaje(A[b.dataset.msg]), 'Mensaje copiado: péguelo en ' + CANALES.find((x) => x[0] === canal)[1]); });
    c.querySelectorAll('[data-url]').forEach((b) => { b.onclick = () => copiar(enlace(A[b.dataset.url]), 'Enlace copiado'); });
  };
})();
