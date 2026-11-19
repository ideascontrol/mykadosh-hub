/* =====================================================================
   Reflexiones Estratégicas — biblioteca pública (web de Growth Path Academy)
   La web de GPA es estática (GitHub). La app genera los archivos y el usuario los sube (sin tokens):
     · reflexiones.html                         índice público con filtros (libro, dimensión, competencia)
     · reflexion-re-gen-001.html                página de cada reflexión (URL estable = código)
     · assets/img/reflexiones/reflexion-re-gen-001.jpg   imagen de portada
   Solo entran reflexiones PUBLICADAS, con aprobación editorial y fecha de publicación cumplida.
   Encabezado y pie se toman de la web publicada (newsletter.html) para que el menú quede igual al sitio.
   Sin botones de compartir (regla de las páginas públicas de GPA).
   ===================================================================== */
window.RE_WEB = (function () {
  const esc = IC.ui.esc;
  const RAW = 'https://raw.githubusercontent.com/growthpathacademy/bpo2bpo/main/';
  let marco = null;

  async function cargarMarco() {
    if (marco) return marco;
    let html = '';
    try { const r = await fetch(RAW + 'newsletter.html?t=' + Date.now(), { cache: 'no-store' }); if (r.ok) html = await r.text(); } catch (e) { /* sin conexión: marco mínimo */ }
    const corte = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); return i >= 0 && j > i ? html.slice(i, j + b.length) : ''; };
    let header = corte('<header class="site-header">', '</header>');
    const footer = corte('<footer class="site-footer">', '</footer>');
    const gi = html.indexOf('<!-- Google tag'), gc = gi >= 0 ? html.indexOf("gtag('config'", gi) : -1;
    const gtag = gc > 0 ? html.slice(gi, html.indexOf('</script>', gc) + 9) : '';
    if (header) {
      header = header.replace(/ active"/g, '"').replace('href="newsletter.html">Recursos', 'href="reflexiones.html">Recursos').replace(/class="nav-link" href="reflexiones.html">Recursos/, 'class="nav-link active" href="reflexiones.html">Recursos');
      if (header.indexOf('reflexiones.html"><') < 0 && header.indexOf('Newsletter GPA Insights') >= 0)
        header = header.replace(/(<a href="newsletter.html">Newsletter GPA Insights<small>[^<]*<\/small><\/a>)/, '$1\n          <a href="reflexiones.html">Reflexiones Estratégicas<small>Sabiduría bíblica para decidir mejor</small></a>');
    }
    marco = {
      header: header || '<header class="site-header"><div class="nav-wrap"><a href="index.html" class="brand"><img src="assets/img/logo-gpa-white.png" alt="Growth Path Academy"></a></div></header>',
      footer: footer || '<footer class="site-footer"><div class="container"><div class="footer-bottom"><span>© <span id="footYear"></span> Growth Path Academy</span></div></div></footer>',
      gtag
    };
    return marco;
  }

  const CSS = `
.rx-hero{background:linear-gradient(135deg,#1B3A6B 0%,#15305a 60%,#007A78 140%);color:#fff;padding:120px 20px 56px;text-align:center}
.rx-hero .eyebrow{letter-spacing:.18em;text-transform:uppercase;font-size:13px;color:#C5A028;font-weight:600;margin:0 0 10px}
.rx-hero h1{font:800 clamp(30px,5vw,48px)/1.1 Outfit,sans-serif;margin:0 0 14px;color:#fff;letter-spacing:.02em}
.rx-hero p.sub{max-width:640px;margin:0 auto;font-size:18px;line-height:1.55;color:rgba(255,255,255,.88)}
.rx-wrap{max-width:1120px;margin:0 auto;padding:36px 20px 64px}
.rx-filtros{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 26px}
.rx-filtros select{font:500 15px Outfit,sans-serif;padding:10px 12px;border:1px solid #d5dde7;border-radius:10px;background:#fff;color:#1B3A6B;min-width:180px;flex:1 1 180px}
.rx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:22px}
.rx-card{background:#fff;border:1px solid #e3e8ef;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;text-decoration:none;color:inherit;transition:transform .15s,box-shadow .15s}
.rx-card:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(27,58,107,.12)}
.rx-card .img{aspect-ratio:16/10;background:linear-gradient(135deg,#1B3A6B,#007A78);background-size:cover;background-position:center}
.rx-card .cuerpo{padding:18px 20px 20px;display:flex;flex-direction:column;gap:8px;flex:1}
.rx-card .ref{font:600 13px Outfit,sans-serif;color:#007A78;letter-spacing:.02em}
.rx-card h3{font:700 21px/1.25 Outfit,sans-serif;color:#1B3A6B;margin:0}
.rx-card p{margin:0;color:#4a5866;font-size:15.5px;line-height:1.55;flex:1}
.rx-card .pie{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#7a8794;margin-top:6px}
.rx-card .leer{color:#C5A028;font-weight:700}
.rx-vacio{text-align:center;color:#6b7785;padding:40px 0}
.rx-art{max-width:760px;margin:0 auto;padding:0 20px 70px}
.rx-art .portada{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:18px;margin:-40px 0 30px;box-shadow:0 18px 40px rgba(0,0,0,.18);background:#e8edf3}
.rx-art .texto{font-size:19px;line-height:1.8;color:#25313d}
.rx-art .texto p{margin:0 0 1.15em}
.rx-art .texto h2{font:700 26px/1.3 Outfit,sans-serif;color:#1B3A6B;margin:1.6em 0 .6em}
.rx-art .texto h3{font:600 21px/1.35 Outfit,sans-serif;color:#1B3A6B;margin:1.4em 0 .5em}
.rx-art .texto blockquote{margin:1.6em 0;padding:6px 0 6px 22px;border-left:4px solid #C5A028;font:500 22px/1.5 Outfit,sans-serif;color:#1B3A6B}
.rx-preg{margin:42px 0 0;background:#f4f7fb;border-radius:18px;padding:28px 30px;border-top:4px solid #007A78}
.rx-preg span{display:block;font:600 13px Outfit,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#007A78;margin-bottom:10px}
.rx-preg p{font:600 23px/1.45 Outfit,sans-serif;color:#1B3A6B;margin:0}
.rx-volver{display:inline-block;margin:34px 0 0;color:#007A78;font-weight:600;text-decoration:none}
.rx-mas{margin:50px 0 0}.rx-mas h4{font:700 18px Outfit,sans-serif;color:#1B3A6B;margin:0 0 12px}
.rx-mas a{display:block;padding:12px 0;border-top:1px solid #e3e8ef;text-decoration:none;color:#1B3A6B;font-weight:600}.rx-mas a small{display:block;color:#7a8794;font-weight:400}
@media (max-width:640px){.rx-hero{padding:104px 18px 44px}.rx-art .texto{font-size:17.5px}.rx-art .texto blockquote{font-size:19px}.rx-preg{padding:22px}.rx-preg p{font-size:20px}}`;

  const absoluta = (ruta) => CFG.web.base.replace(/\/$/, '') + '/' + ruta;
  const imgRuta = (r, ext) => 'assets/img/reflexiones/' + RE.slug(r) + '.' + (ext || extension(r));
  const extension = (r) => ((r.portada || '').split('.').pop() || 'jpg').toLowerCase();
  const textoPlano = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const intro = (r) => r.intro || (textoPlano(r.contenido).slice(0, 210).replace(/\s\S*$/, '') + '…');
  const fechaLarga = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  function cabeza(m, titulo, desc, canon, img, extra) {
    return '<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
      '<title>' + esc(titulo) + '</title>\n<meta name="description" content="' + esc(desc) + '">\n<link rel="canonical" href="' + esc(canon) + '">\n' +
      '<meta property="og:type" content="article">\n<meta property="og:title" content="' + esc(titulo) + '">\n<meta property="og:description" content="' + esc(desc) + '">\n<meta property="og:url" content="' + esc(canon) + '">\n' +
      (img ? '<meta property="og:image" content="' + esc(img) + '">\n' : '') + '<meta name="twitter:card" content="summary_large_image">\n' +
      '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
      '<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">\n<link rel="stylesheet" href="assets/css/style-v3.css">\n' +
      '<style>' + CSS + '</style>\n' + (extra || '') + (m.gtag ? m.gtag + '\n' : '') + '</head>\n<body>\n' + m.header + '\n';
  }
  const pie = (m, js) => m.footer + '\n<script src="assets/js/main.js"></script>\n' + (js || '') + '</body>\n</html>\n';

  // Página individual
  async function pagina(r, otras) {
    const m = await cargarMarco();
    const archivo = RE.slug(r) + '.html', canon = absoluta(archivo), img = r.portada ? absoluta(imgRuta(r)) : '';
    const titulo = (r.titulo_editorial || r.titulo) + ' | Reflexiones Estratégicas | Growth Path Academy';
    const desc = intro(r).slice(0, 300);
    const ld = { '@context': 'https://schema.org', '@type': 'Article', headline: r.titulo_editorial || r.titulo, description: desc, datePublished: r.fecha_publicacion, inLanguage: 'es',
      author: { '@type': 'Organization', name: CFG.web.marca }, publisher: { '@type': 'Organization', name: CFG.web.marca, logo: { '@type': 'ImageObject', url: absoluta('assets/img/logo-gpa-color.png') } },
      mainEntityOfPage: canon, image: img || undefined, about: RE.referenciaCompleta(r), isPartOf: { '@type': 'CreativeWorkSeries', name: 'Reflexiones Estratégicas' } };
    return cabeza(m, titulo, desc, canon, img, '<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, '\\u003c') + '</script>\n') +
      '<section class="rx-hero"><p class="eyebrow">Reflexiones Estratégicas</p><h1>' + esc(r.titulo_editorial || r.titulo) + '</h1><p class="sub">' + esc(RE.referenciaCompleta(r)) + '</p></section>\n' +
      '<article class="rx-art">' + (r.portada ? '<img class="portada" src="' + esc(imgRuta(r)) + '" alt="' + esc(r.titulo_editorial || r.titulo) + '">' : '<div style="height:36px"></div>') +
      '<div class="texto">' + RE_EDITOR.limpiar(r.contenido || '') + '</div>' +
      (r.pregunta ? '<div class="rx-preg"><span>Una pregunta para llevarse</span><p>' + esc(r.pregunta) + '</p></div>' : '') +
      (otras && otras.length ? '<div class="rx-mas"><h4>Otras reflexiones</h4>' + otras.map((o) => '<a href="' + RE.slug(o) + '.html">' + esc(o.titulo_editorial || o.titulo) + '<small>' + esc(RE.referencia(o)) + '</small></a>').join('') + '</div>' : '') +
      '<a class="rx-volver" href="reflexiones.html">← Todas las reflexiones</a>' +
      '<p style="color:#8a96a3;font-size:14px;margin-top:22px">Publicada el ' + esc(fechaLarga(r.fecha_publicacion)) + ' · ' + esc(r.codigo) + '</p></article>\n' + pie(m);
  }

  // Índice público con filtros (los datos van dentro de la página)
  async function indice(lista) {
    const m = await cargarMarco();
    const datos = lista.map((r) => ({ u: RE.slug(r) + '.html', t: r.titulo_editorial || r.titulo, ref: RE.referenciaCompleta(r), i: intro(r), f: r.fecha_publicacion, ff: fechaLarga(r.fecha_publicacion),
      img: r.portada ? imgRuta(r) : '', l: RE.nombreLibro(r.libro), lo: RE.ordenLibro(r.libro), d: RE.nombreDim(r.dimension), c: [r.competencia].concat(RE.lista(r.competencias_sec)).filter(Boolean) }))
      .sort((a, b) => String(b.f).localeCompare(String(a.f)));
    const js = '<script>(function(){var D=' + JSON.stringify(datos).replace(/</g, '\\u003c') + ';\n' +
      'var g=document.getElementById("rxGrid"),fl=document.getElementById("fL"),fd=document.getElementById("fD"),fc=document.getElementById("fC");\n' +
      'function e(s){return String(s||"").replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c]})}\n' +
      'function op(sel,vals,t){sel.innerHTML="<option value=\\"\\">"+t+"</option>"+vals.map(function(v){return"<option>"+e(v)+"</option>"}).join("")}\n' +
      'var L=[];D.slice().sort(function(a,b){return a.lo-b.lo}).forEach(function(x){if(L.indexOf(x.l)<0)L.push(x.l)});var Di=[],C=[];D.forEach(function(x){if(x.d&&Di.indexOf(x.d)<0)Di.push(x.d);x.c.forEach(function(c){if(C.indexOf(c)<0)C.push(c)})});\n' +
      'op(fl,L,"Todos los libros");op(fd,Di.sort(),"Todas las dimensiones");op(fc,C.sort(),"Todas las competencias");\n' +
      'function pintar(){var v=D.filter(function(x){return(!fl.value||x.l===fl.value)&&(!fd.value||x.d===fd.value)&&(!fc.value||x.c.indexOf(fc.value)>=0)});\n' +
      'g.innerHTML=v.length?v.map(function(x){return"<a class=\\"rx-card\\" href=\\""+x.u+"\\"><div class=\\"img\\""+(x.img?" style=\\"background-image:url(\'"+x.img+"\')\\"":"")+"></div><div class=\\"cuerpo\\"><span class=\\"ref\\">"+e(x.ref)+"</span><h3>"+e(x.t)+"</h3><p>"+e(x.i)+"</p><div class=\\"pie\\"><span>"+e(x.ff)+"</span><span class=\\"leer\\">Leer →</span></div></div></a>"}).join(""):"<p class=\\"rx-vacio\\">No hay reflexiones con ese filtro.</p>"}\n' +
      '[fl,fd,fc].forEach(function(s){s.onchange=pintar});pintar();})();</script>\n';
    return cabeza(m, 'Reflexiones Estratégicas | Sabiduría bíblica para decidir mejor | Growth Path Academy',
      'Historias que nos ayudan a comprender la vida, desarrollar nuestro carácter y tomar mejores decisiones. Una colección de Growth Path Academy.', absoluta(CFG.web.indice), absoluta('assets/img/logo-gpa-color.png')) +
      '<section class="rx-hero"><p class="eyebrow">Growth Path Academy</p><h1>REFLEXIONES ESTRATÉGICAS</h1><p class="sub">Historias que nos ayudan a comprender la vida, desarrollar nuestro carácter y tomar mejores decisiones.</p></section>\n' +
      '<main class="rx-wrap"><div class="rx-filtros"><select id="fL" aria-label="Libro bíblico"></select><select id="fD" aria-label="Dimensión"></select><select id="fC" aria-label="Competencia"></select></div><div class="rx-grid" id="rxGrid"></div>' +
      '<noscript>' + datos.map((x) => '<p><a href="' + x.u + '">' + esc(x.t) + '</a> — ' + esc(x.ref) + '</p>').join('') + '</noscript></main>\n' + pie(m, js);
  }

  function bajar(nombre, contenido, tipo) {
    const b = contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo || 'text/html;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nombre; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  return { pagina, indice, bajar, imgRuta, extension, intro, textoPlano };
})();
