/* =====================================================================
   Web de Ideas Control — BORRADOR. Encabezado, pie, menú móvil, artículos y formulario.
   Las rutas se arman desde BASE para que el borrador funcione hoy en /ideascontrol/web-borrador/
   y luego en la raíz de www.ideascontrol.com cambiando solo BASE.
   ===================================================================== */
(function () {
  const BASE = '/ideascontrol/web-borrador/';
  // Aplicación web de Google Apps Script que guarda la solicitud en Google Sheets y avisa a info@ideascontrol.com
  // (código completo en web-borrador/apps-script/Code.gs). Pegar aquí la URL /exec de la implementación.
  const CONTACTO_URL = 'https://script.google.com/macros/s/AKfycbx_Y54_wDcVyotAzwM9YXRLIdYnS0zqOcLEUUk4mvwSjAxoUmOCrc9gSpuKGdOTuFuIjQ/exec';
  const VERSION_POLITICA = '1.1';
  const TEXTO_AUTORIZACION = 'Autorizo de manera previa, expresa e informada a Ideas Control Equipos y Soluciones S.A.S. para tratar mis datos personales con la finalidad de atender mi solicitud, contactarme y compartirme información sobre sus soluciones, conforme a su Política de Tratamiento de Datos Personales (Ley 1581 de 2012).';
  const L = {
    inicio: BASE, nosotros: BASE + 'nosotros/', politica: '/ideascontrol/Privacidad/',
    herramientas: '/ideascontrol/Herramientas/', diagnostico: '/ideascontrol/DiagnosticoMadurezTyA/', tya: '/ideascontrol/PilotoTyA/',
    conocimiento: '/ideascontrol/Recursos/', ayuda: 'https://mesadeayuda.timevisionbi.com/', pago: 'https://checkout.wompi.co/l/VPOS_AwaH2Y',
    timevision: '/ideascontrol/TimeVision/',
    wa: 'https://wa.me/573213184853?text=' + encodeURIComponent('Hola Ideas Control, vengo de la página web y quiero más información.'),
    facebook: 'https://www.facebook.com/BiometricosenColombia', instagram: 'https://www.instagram.com/ideascontrol.co', youtube: 'https://www.youtube.com/@ideascontrooficial'
  };
  window.IC_WEB = L;
  const enInicio = location.pathname.replace(/index\.html$/, '') === BASE;
  const ancla = (a) => (enInicio ? '' : BASE) + '#' + a;

  function encabezado() {
    const h = document.getElementById('cabecera'); if (!h) return;
    h.innerHTML =
      '<div class="top"><div class="cont"><span>🌎 Colombia · Panamá · Ecuador · Costa Rica</span><span class="esp"></span>' +
      '<a class="ocm" href="tel:+573228506363">PBX +57 322 850 6363</a><a href="' + L.wa + '" target="_blank" rel="noopener">WhatsApp +57 321 318 4853</a><a class="ocm" href="mailto:info@ideascontrol.com">info@ideascontrol.com</a></div></div>' +
      '<div class="menu" id="menu"><div class="cont"><a class="logo" href="' + L.inicio + '"><img src="/ideascontrol/assets/ideascontrol.webp" alt="Ideas Control Equipos y Soluciones S.A.S."></a>' +
      '<nav><a href="' + ancla('soluciones') + '">Soluciones</a><a href="' + ancla('productos') + '">Productos</a><a href="' + ancla('herramientas') + '">Herramientas</a><a href="' + ancla('alianza') + '">Alianza GPA</a><a href="' + ancla('conocimiento') + '">Conocimiento</a><a href="' + L.nosotros + '">Nosotros</a></nav>' +
      '<div class="acc"><a class="btn lin" href="' + L.ayuda + '" target="_blank" rel="noopener">🎧 Centro de ayuda</a><a class="btn teal" href="' + ancla('contacto') + '">Agenda tu asesoría</a></div>' +
      '<button class="burger" aria-label="Menú" id="burger">☰</button></div></div>';
    const m = document.getElementById('menu');
    document.getElementById('burger').onclick = () => m.classList.toggle('abierto');
    // Fijo al bajar: solo el menú; la franja de países y teléfonos sube y desaparece
    const ajustar = () => { h.style.top = -h.querySelector('.top').offsetHeight + 'px'; };
    ajustar(); window.addEventListener('resize', ajustar);
    m.querySelectorAll('nav a, .acc a').forEach((a) => a.addEventListener('click', () => m.classList.remove('abierto')));
  }
  function pie() {
    const p = document.getElementById('pie'); if (!p) return;
    p.className = 'pie';
    p.innerHTML = '<div class="cont"><div><span class="lg"><img src="/ideascontrol/assets/ideascontrol.webp" alt="Ideas Control"></span>' +
      '<p style="margin:0">Tecnología que conecta con las personas y transforma la gestión empresarial.<br>Colombia · Panamá · Ecuador · Costa Rica<br>Aliado estratégico: Growth Path Academy</p>' +
      '<p style="margin-top:12px">Calle 85 #16-28, Oficina 402, Bogotá D.C.</p></div>' +
      '<div><h4>Soluciones</h4><a href="' + ancla('soluciones') + '">Equipos biométricos</a><a href="' + ancla('soluciones') + '">Plataforma de tiempo y asistencia</a><a href="' + ancla('timevision') + '">TimeVision BI</a><a href="' + ancla('productos') + '">Control de acceso y torniquetes</a><a href="' + L.nosotros + '#alianza">Alianza IC + GPA</a></div>' +
      '<div><h4>Clientes</h4><a href="' + L.ayuda + '" target="_blank" rel="noopener">Centro de ayuda</a><a href="' + L.pago + '" target="_blank" rel="noopener">Paga aquí</a><a href="' + L.herramientas + '">Herramientas gratuitas</a><a href="' + L.conocimiento + '">Centro de conocimiento</a></div>' +
      '<div><h4>Síguenos</h4><a href="' + L.facebook + '" target="_blank" rel="noopener">Facebook</a><a href="' + L.instagram + '" target="_blank" rel="noopener">Instagram</a><a href="' + L.youtube + '" target="_blank" rel="noopener">YouTube</a><a href="#" class="ph">[ENLACE: LinkedIn]</a></div>' +
      '<div class="base"><span>© ' + new Date().getFullYear() + ' Ideas Control Equipos y Soluciones S.A.S.</span><span><a href="' + L.politica + '">Política de Tratamiento de Datos</a><a href="' + L.nosotros + '">Nosotros</a></span></div></div>';
    if (!document.querySelector('.borrador')) document.body.insertAdjacentHTML('beforeend', '<div class="borrador">BORRADOR · no publicado</div>');
  }

  // Centro de conocimiento: los 3 artículos más recientes (Recursos/articulos.js)
  function articulos() {
    const z = document.getElementById('arts'); if (!z) return;
    const s = document.createElement('script'); s.src = L.conocimiento + 'articulos.js';
    s.onload = () => {
      const A = (window.IC_ARTICULOS || []).slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).slice(0, 3), ico = ['⏱', '📅', '🛡'];
      if (!A.length) return;
      z.innerHTML = A.map((a, i) => '<a class="art" href="' + L.conocimiento + a.slug + '/"><div class="cab">' + ico[i] + '</div><div class="tx"><small>' + (a.tema || 'Newsletter') + '</small><h3>' + a.titulo.replace(/</g, '&lt;') + '</h3><p>' + String(a.resumen || '').replace(/</g, '&lt;') + '</p></div></a>').join('');
    };
    document.head.appendChild(s);
  }

  // Formulario estándar IC (como PilotoTyA): nombre y apellido, correo corporativo, EMPRESA en mayúsculas, país, consentimiento
  const PERSONALES = ['gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.es', 'hotmail.co', 'outlook.com', 'outlook.es', 'live.com', 'live.com.mx', 'msn.com', 'yahoo.com', 'yahoo.es', 'yahoo.com.co', 'yahoo.com.mx', 'ymail.com', 'icloud.com', 'me.com', 'aol.com', 'protonmail.com', 'proton.me'];
  const PAISES = [['CO', 'Colombia', '+57'], ['PA', 'Panamá', '+507'], ['EC', 'Ecuador', '+593'], ['CR', 'Costa Rica', '+506'], ['PE', 'Perú', '+51'], ['MX', 'México', '+52'], ['CL', 'Chile', '+56'], ['US', 'Estados Unidos', '+1'], ['XX', 'Otro país', '']];
  function formulario() {
    const f = document.getElementById('fContacto'); if (!f) return;
    f.pais.innerHTML = PAISES.map((p) => '<option value="' + p[0] + '">' + p[1] + (p[2] ? ' (' + p[2] + ')' : '') + '</option>').join('');
    f.empresa.addEventListener('input', () => { const p = f.empresa.selectionStart; f.empresa.value = f.empresa.value.toUpperCase(); f.empresa.setSelectionRange(p, p); });
    const marcar = (campo, msg) => { const c = f[campo].closest('.c'); c.classList.toggle('mal', !!msg); c.querySelector('.err').textContent = msg || ''; return !msg; };
    f.onsubmit = (e) => {
      e.preventDefault();
      const nom = f.nombre.value.trim(), mail = f.correo.value.trim().toLowerCase(), dom = mail.split('@')[1] || '';
      let ok = true;
      ok = marcar('nombre', nom.split(/\s+/).length < 2 ? 'Escribe tu nombre y apellido' : '') && ok;
      ok = marcar('correo', !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail) ? 'Escribe un correo válido' : PERSONALES.indexOf(dom) >= 0 ? 'Usa tu correo corporativo (no Gmail, Hotmail, Outlook…)' : '') && ok;
      ok = marcar('empresa', f.empresa.value.trim().length < 2 ? 'Escribe el nombre de tu empresa' : '') && ok;
      ok = marcar('necesidad', f.necesidad.value.trim().length < 5 ? 'Cuéntanos brevemente qué necesitas' : '') && ok;
      ok = marcar('acepto', !f.acepto.checked ? 'Debes aceptar la Política de Tratamiento de Datos' : '') && ok;
      if (!ok) return;
      if (f.hp.value) return; // trampa para robots
      const nota = document.getElementById('fNota'), btn = document.getElementById('fEnviar');
      if (!CONTACTO_URL) { nota.innerHTML = '<b>Envío pendiente de conexión:</b> falta pegar la URL de Apps Script en js/web.js.'; return; }
      const pais = PAISES.find((p) => p[0] === f.pais.value) || PAISES[0];
      const datos = {
        nombre: nom, correo: mail, empresa: f.empresa.value.trim().toUpperCase(), pais: pais[1], codigo_pais: pais[2],
        telefono: f.telefono.value.trim(), necesidad: f.necesidad.value.trim(), origen: 'Página web · Agenda tu asesoría',
        acepto_politica: 'SI', version_politica: VERSION_POLITICA, texto_autorizacion: TEXTO_AUTORIZACION,
        url_pagina: location.href.split('#')[0], hp: f.hp.value
      };
      const q = new URLSearchParams(location.search); ['utm_source', 'utm_medium', 'utm_campaign'].forEach((k) => { datos[k] = q.get(k) || ''; });
      btn.disabled = true; btn.textContent = 'Enviando…'; nota.textContent = '';
      fetch(CONTACTO_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(datos) })
        .then((r) => r.json())
        .then((d) => {
          if (!d || !d.ok) throw new Error((d && d.error) || 'Error');
          f.reset(); f.querySelectorAll('.c').forEach((c) => { c.classList.remove('mal'); const er = c.querySelector('.err'); if (er) er.textContent = ''; });
          nota.textContent = 'Usamos tus datos solo para responder tu solicitud.';
          window.scrollTo({ top: 0, behavior: 'smooth' });
          aviso('Gracias. Recibimos tu solicitud y un asesor de Ideas Control te contactará pronto.');
        })
        .catch(() => { nota.innerHTML = '<b>No pudimos enviar tu solicitud.</b> Inténtalo de nuevo o escríbenos a info@ideascontrol.com.'; })
        .finally(() => { btn.disabled = false; btn.textContent = 'Enviar solicitud'; });
    };
  }

  function aviso(txt) {
    const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = txt;
    document.body.appendChild(t); setTimeout(() => t.remove(), 7000);
  }

  // Enlaces a otras páginas o landings: se abren en una ventana nueva. La navegación dentro de la web (inicio, Nosotros, anclas) sigue en la misma.
  function ventanasNuevas() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[href]'); if (!a || a.target) return;
      const h = a.getAttribute('href'); if (!h || h[0] === '#' || /^(mailto|tel):/i.test(h)) return;
      const u = new URL(a.href, location.href);
      if (u.origin === location.origin && u.pathname.indexOf(BASE) === 0) return;
      e.preventDefault(); window.open(u.href, '_blank', 'noopener');
    });
  }

  document.addEventListener('DOMContentLoaded', () => { encabezado(); pie(); articulos(); formulario(); ventanasNuevas(); });
})();
