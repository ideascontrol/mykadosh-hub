#!/usr/bin/env python3
"""
docx2html.py — Convierte un manual/formato Word de Ideas Control en una página
HTML de lectura para el portal de Gestión Documental.

Uso:
  python3 tools/docx2html.py ENTRADA.docx CODIGO [--area operativa]
  -> genera documentos/CODIGO.html (+ documentos/img/ si hay imágenes)

Reconoce el sistema de diseño de los documentos IC:
  Heading 1 / Heading 2           -> secciones numeradas N. / N.N
  Párrafo en negrilla azul        -> título de sección (formatos FOR y fichas)
  Tabla 1x1 con fondo EAF0F6      -> recuadro destacado (Propósito, Regla…)
  Celda con fondo 1B365D          -> encabezado de tabla
  Celda F2F2F2 / texto en negrilla-> etiqueta de campo
  Celda vacía                     -> campo por diligenciar (solo lectura)
"""
import sys, re, os, html, base64, argparse, hashlib
from docx import Document
from docx.oxml.ns import qn

W = lambda t: qn('w:' + t)
NAVY, CALLOUT, LABEL = '1B365D', 'EAF0F6', 'F2F2F2'
TITULOS_ESPECIALES = {'ficha de control del documento', 'control de cambios', 'tabla de contenido'}


def slug(t):
    import unicodedata
    t = unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', t).strip('-')[:60] or 'sec'


def autolink(s):
    return re.sub(r'(https?://[^\s<]+[^\s<.,;:)])', r'<a href="\1" target="_blank" rel="noopener">\1</a>', s)


class Conversor:
    def __init__(self, path, codigo, imgdir):
        self.doc = Document(path)
        self.codigo = codigo
        self.imgdir = imgdir
        self.rels = self.doc.part.rels
        self.imgs = []
        self.toc = []          # (nivel, id, texto)
        self.n1 = self.n2 = 0
        self.ids = set()
        self.ficha = {}
        self.numfmt = self._cargar_numeracion()
        self.contador = {}

    # ---------- utilidades de runs ----------
    def run_props(self, r):
        rp = r.find(W('rPr'))
        b = i = False; color = None
        if rp is not None:
            bb = rp.find(W('b')); b = bb is not None and bb.get(W('val')) not in ('0', 'false')
            ii = rp.find(W('i')); i = ii is not None and ii.get(W('val')) not in ('0', 'false')
            c = rp.find(W('color')); color = c.get(W('val')) if c is not None else None
        return b, i, color

    def imagen(self, el):
        blip = el.find('.//' + qn('a:blip'))
        if blip is None: return ''
        rid = blip.get(qn('r:embed'))
        part = self.rels[rid].target_part
        data = part.blob
        ext = os.path.splitext(part.partname)[1].lower() or '.png'
        h = hashlib.md5(data).hexdigest()[:10]
        self.imgs.append((h, ext, data))
        return f'<figure class="dh-fig"><img src="img/{self.codigo}-{h}{ext}" alt="" loading="lazy"></figure>'

    def inline(self, p_el, estilo_p_negrilla=False):
        """Devuelve (html, texto_plano, todo_negrilla, color_dominante, tiene_imagen)"""
        partes, plano = [], []
        todo_b = True; colores = []; img = False
        for el in p_el.iter():
            tag = el.tag
            if tag == W('r'):
                b, i, c = self.run_props(el)
                for ch in el:
                    if ch.tag == W('t'):
                        t = ch.text or ''
                        if not t: continue
                        plano.append(t)
                        if t.strip():
                            todo_b = todo_b and (b or estilo_p_negrilla)
                            if c: colores.append(c)
                        s = html.escape(t)
                        if b: s = f'<strong>{s}</strong>'
                        if i: s = f'<em>{s}</em>'
                        partes.append(s)
                    elif ch.tag in (W('br'), W('cr')):
                        partes.append('<br>'); plano.append('\n')
                    elif ch.tag == W('tab'):
                        partes.append(' '); plano.append(' ')
                    elif ch.tag == W('drawing'):
                        partes.append(self.imagen(ch)); img = True
        h = ''.join(partes).replace('</strong><strong>', '').replace('</em><em>', '')
        txt = ''.join(plano)
        color = max(set(colores), key=colores.count) if colores else None
        return autolink(h.strip()), txt.strip(), (todo_b and bool(txt.strip())), color, img

    def estilo(self, p_el):
        ps = p_el.find(W('pPr'))
        if ps is None: return 'Normal'
        st = ps.find(W('pStyle'))
        if st is None: return 'Normal'
        sid = st.get(W('val'))
        try: return self.doc.styles.get_by_id(sid, 1).name  # 1 = PARAGRAPH
        except Exception: return sid

    def _cargar_numeracion(self):
        """numId -> {nivel: formato} a partir de numbering.xml (bullet, decimal, …)."""
        try: num = self.doc.part.numbering_part.element
        except Exception: return {}
        abst = {}
        for an in num.findall(W('abstractNum')):
            lv = {}
            for l in an.findall(W('lvl')):
                f = l.find(W('numFmt'))
                lv[l.get(W('ilvl'))] = f.get(W('val')) if f is not None else 'decimal'
            abst[an.get(W('abstractNumId'))] = lv
        out = {}
        for n in num.findall(W('num')):
            a = n.find(W('abstractNumId'))
            if a is not None: out[n.get(W('numId'))] = abst.get(a.get(W('val')), {})
        return out

    def formato_lista(self, ppr):
        """'ul' / 'ol' si el párrafo tiene numeración automática de Word, si no None."""
        if ppr is None: return None
        np_ = ppr.find(W('numPr'))
        if np_ is None: return None
        nid = np_.find(W('numId')); il = np_.find(W('ilvl'))
        nid = nid.get(W('val')) if nid is not None else None
        if nid in (None, '0'): return None
        fmt = self.numfmt.get(nid, {}).get(il.get(W('val')) if il is not None else '0', 'bullet')
        return 'ul' if fmt in ('bullet', 'none') else 'ol'

    def nuevo_id(self, t):
        base = slug(t); i = base; k = 2
        while i in self.ids: i = f'{base}-{k}'; k += 1
        self.ids.add(i); return i

    # ---------- celdas / tablas ----------
    def celda(self, tc):
        sh = tc.find('.//' + W('shd'))
        fill = (sh.get(W('fill')) or '').upper() if sh is not None else ''
        gs = tc.find('.//' + W('gridSpan'))
        span = int(gs.get(W('val'))) if gs is not None else 1
        vm = tc.find('.//' + W('vMerge'))
        vmerge = None if vm is None else (vm.get(W('val')) or 'continue')
        bloques, planos, negr = [], [], True
        for p in tc.findall(W('p')):
            h, t, b, c, img = self.inline(p)
            if h or img:
                bloques.append(h); planos.append(t); negr = negr and b
        texto = '\n'.join(planos).strip()
        # Opciones de casilla (☐ Sí ☐ No) sin cortes de línea internos
        bloques = [re.sub(r'([☐☑☒])\s*([^☐☑☒<]*[^☐☑☒<\s])', r'<span class="dh-ck">\1 \2</span>', b) for b in bloques]
        return dict(fill=fill, span=span, vmerge=vmerge, html='<br>'.join(bloques), texto=texto,
                    negrilla=negr and bool(texto), parrafos=bloques)

    def tabla(self, tbl):
        filas = []
        for tr in tbl.findall(W('tr')):
            f = [self.celda(tc) for tc in tr.findall(W('tc'))]
            if f and f[0]['texto'].strip().lower() == 'página': continue  # la paginación de Word no aplica en línea
            filas.append(f)
        if not filas: return ''
        # Ficha de control: guarda datos para el encabezado de la página
        for f in filas:
            if len(f) >= 2 and f[0]['texto'] and f[1]['texto']:
                k = f[0]['texto'].strip().lower()
                if k in ('aprobado por', 'elaborado por', 'revisado por', 'próxima revisión programada'):
                    v = re.sub(r'\s*\(.*$', '', f[1]['texto']).strip()
                    if v and not v.startswith('__'): self.ficha.setdefault(k, v)
        # 1x1: recuadro destacado o vacío
        if len(filas) == 1 and len(filas[0]) == 1:
            c = filas[0][0]
            if not c['texto']: return ''
            ps = c['parrafos']
            if c['texto'].startswith('['):  # espacio para fotografía / anexo
                return f'<figure class="dh-foto"><div class="dh-foto-ph">{html.escape(c["texto"].strip("[] "))}</div></figure>'
            if len(ps) == 1 and c['negrilla'] and len(c['texto']) < 70:  # etiqueta sola = campo de texto
                return f'<div class="dh-areabox"><div class="dh-area-t">{ps[0]}</div><div class="dh-area dh-vacio"></div></div>'
            m = re.match(r'^<strong>(.*?)</strong>(?:<br>)?(.*)$', ps[0], re.S)
            if m:
                titulo, resto = m.group(1).strip(), m.group(2).strip()
                cuerpo = ''.join(f'<p>{x}</p>' for x in ([resto] if resto else []) + ps[1:])
            else:
                titulo, cuerpo = '', ''.join(f'<p>{x}</p>' for x in ps)
            tag = f'<span class="dh-tag">{titulo}</span>' if titulo else ''
            return f'<aside class="dh-callout">{tag}{cuerpo}</aside>'
        ncols = max(sum(c['span'] for c in f) for f in filas)
        # Tabla "área de texto": encabezado navy + fila(s) vacías, 1 columna
        if ncols == 1:
            out = []
            for f in filas:
                c = f[0]
                if c['fill'] == NAVY: out.append(f'<div class="dh-area-t">{c["html"]}</div>')
                else: out.append(f'<div class="dh-area">{c["html"]}</div>' if c['texto'] else '<div class="dh-area dh-vacio" aria-label="Campo por diligenciar"></div>')
            return f'<div class="dh-areabox">{"".join(out)}</div>'
        r0 = filas[0]
        todo_b0 = all(c['negrilla'] or not c['texto'] for c in r0) and any(c['texto'] for c in r0)
        fills0 = {c['fill'] for c in r0}
        cab = todo_b0 and (
            (len(fills0) == 1 and oscuro(r0[0]['fill'])) or
            (len(filas) > 1 and any(c['texto'] and not c['negrilla'] for c in filas[1]) and len(fills0) == 1
             and r0[0]['fill'] not in (LABEL, 'FBFBFB')))
        es_form = not cab
        # Formato de "casillas": todas las celdas son etiquetas con espacio para escribir
        solo_etiquetas = es_form and all(c['negrilla'] for f in filas for c in f if c['vmerge'] != 'continue')
        rows = []
        # vMerge: calcula rowspans
        for ri, f in enumerate(filas):
            cells = []
            col = 0
            for c in f:
                if c['vmerge'] == 'continue':
                    col += c['span']; continue
                rs = 1
                if c['vmerge'] == 'restart':
                    k = ri + 1
                    while k < len(filas):
                        cc = self._celda_en_col(filas[k], col)
                        if cc and cc['vmerge'] == 'continue': rs += 1; k += 1
                        else: break
                attrs = (f' colspan="{c["span"]}"' if c['span'] > 1 else '') + (f' rowspan="{rs}"' if rs > 1 else '')
                if ri == 0 and cab:
                    cells.append(f'<th scope="col"{attrs}>{c["html"]}</th>')
                elif solo_etiquetas:
                    cells.append(f'<td class="dh-campo"{attrs}><span>{c["html"]}</span></td>')
                elif oscuro(c['fill']):
                    cells.append(f'<th class="dh-sub"{attrs}>{c["html"]}</th>')
                elif es_form and c['negrilla'] and (c['fill'] == LABEL or c['fill'] in ('', 'FFFFFF', 'AUTO')) :
                    cells.append(f'<th scope="row" class="dh-lbl"{attrs}>{c["html"]}</th>')
                elif not c['texto']:
                    cells.append(f'<td class="dh-vacio"{attrs}></td>')
                else:
                    cls = ' class="dh-ph"' if re.fullmatch(r'[dmaDMA /]+', c['texto']) else ''
                    cells.append(f'<td{cls}{attrs}>{c["html"]}</td>')
                col += c['span']
            rows.append('<tr>' + ''.join(cells) + '</tr>')
        head = f'<thead>{rows[0]}</thead>' if cab else ''
        body = ''.join(rows[1:] if cab else rows)
        cls = 'dh-tabla' + (' dh-form' if es_form else '') + (' dh-campos' if solo_etiquetas else '') + (' dh-2col' if ncols == 2 and not es_form else '')
        return f'<div class="dh-tscroll"><table class="{cls}">{head}<tbody>{body}</tbody></table></div>'

    @staticmethod
    def _celda_en_col(fila, col):
        x = 0
        for c in fila:
            if x == col: return c
            x += c['span']
        return None

    # ---------- documento ----------
    def convertir(self):
        body = self.doc.element.body
        out, portada, en_portada = [], [], True
        lista = None  # ('ul'|'ol', [items])

        def cerrar_lista():
            nonlocal lista
            if lista:
                if lista[0] == 'ol':
                    items = ''.join(f'<li><span class="dh-paso">{x[0] if isinstance(x, tuple) else k:02d}</span><div>{x[1] if isinstance(x, tuple) else x}</div></li>' for k, x in enumerate(lista[1], 1))
                    out.append(f'<ol class="dh-pasos">{items}</ol>')
                else:
                    out.append('<ul class="dh-lista">' + ''.join(f'<li>{x}</li>' for x in lista[1]) + '</ul>')
                lista = None

        for el in body:
            tag = el.tag
            if tag == W('sdt'):  # tabla de contenido de Word -> se genera automáticamente
                continue
            if tag == W('tbl'):
                txt = ''.join(x.text or '' for x in el.iter(W('t'))).strip()
                if en_portada and not portada and RE_COD.match(txt):
                    continue  # portada armada dentro de una tabla (p. ej. 2102)
                if en_portada: out.extend(self.intro(portada)); en_portada = False
                cerrar_lista(); out.append(self.tabla(el)); continue
            if tag != W('p'): continue
            st = self.estilo(el)
            h, t, allb, color, img = self.inline(el)
            if not t and not img: continue
            low = t.lower().strip()
            if en_portada:
                fin = st.startswith('Heading 2') or low in TITULOS_ESPECIALES or (allb and re.match(r'^\d+\.\s', t)) or (portada and st.startswith('Heading 1') and any(x[5].startswith('Heading 1') for x in portada))
                if not fin:
                    portada.append((h, t, allb, color, img, st)); continue
                en_portada = False
                out.extend(self.intro(portada))
            if low == 'tabla de contenido': continue
            tt = oracion(t)
            if st.startswith('Heading 1') or st == 'Título 1':
                cerrar_lista(); self.n1 += 1; self.n2 = 0
                i = self.nuevo_id(tt); self.toc.append((1, i, f'{self.n1}. {tt}'))
                out.append(f'<h2 id="{i}" class="dh-h1"><span class="dh-n">{self.n1:02d}</span>{html.escape(tt)}</h2>'); continue
            if st.startswith('Heading 2') or st == 'Título 2':
                cerrar_lista(); self.n2 += 1
                if self.n1:
                    num = f'{self.n1}.{self.n2}'
                    i = self.nuevo_id(tt); self.toc.append((2, i, f'{num}. {tt}'))
                    out.append(f'<h3 id="{i}" class="dh-h2"><span class="dh-n">{num}</span>{html.escape(tt)}</h3>')
                else:  # documento sin Heading 1: los Heading 2 son las secciones principales
                    i = self.nuevo_id(tt); self.toc.append((1, i, f'{self.n2}. {tt}'))
                    out.append(f'<h2 id="{i}" class="dh-h1"><span class="dh-n">{self.n2:02d}</span>{html.escape(tt)}</h2>')
                continue
            if st.startswith('Heading 3'):
                cerrar_lista(); out.append(f'<h4 class="dh-h3">{html.escape(tt)}</h4>'); continue
            # Títulos de sección en formatos / ficha: párrafo corto, todo en negrilla, color de marca
            ppr = el.find(W('pPr')); shd = ppr.find(W('shd')) if ppr is not None else None
            banda = shd is not None and (shd.get(W('fill')) or 'FFFFFF').upper() not in ('FFFFFF', 'AUTO')
            num_p = ppr is not None and ppr.find('.//' + W('numPr')) is not None
            # Pie de foto: párrafo numerado justo después de un espacio para fotografía
            if num_p and out and out[-1].startswith('<figure class="dh-foto"') and '<figcaption>' not in out[-1]:
                out[-1] = out[-1].replace('</figure>', f'<figcaption>{html.escape(t)}</figcaption></figure>'); continue
            m = re.match(r'^(\d+(?:\.\d+)*)\.?\s+(.*)$', t)
            if allb and len(t) < 90 and not img and not num_p and not (m or banda or low in TITULOS_ESPECIALES) \
                    and (color or '').upper() in (NAVY, '1F497D', '17365D', '007A78', '0E76BC', '159090'):
                cerrar_lista(); out.append(f'<h4 class="dh-h3">{html.escape(tt)}</h4>'); continue
            if allb and len(t) < 90 and not img and not num_p and ((color or '').upper() in (NAVY, '1F497D', '17365D', '007A78', '0E76BC', '159090') or banda or low in TITULOS_ESPECIALES):
                cerrar_lista()
                nom = oracion(m.group(2)) if m else tt
                i = self.nuevo_id(nom)
                self.toc.append((1, i, f'{m.group(1)}. {nom}' if m else nom))
                especial = ' dh-esp' if low in TITULOS_ESPECIALES else ''
                if m and not m.group(1).isdigit():  # 5.1 -> subsección
                    self.toc[-1] = (2, i, self.toc[-1][2])
                    out.append(f'<h3 id="{i}" class="dh-h2"><span class="dh-n">{m.group(1)}</span>{html.escape(nom)}</h3>')
                    continue
                num = f'<span class="dh-n">{int(m.group(1)):02d}</span>' if m else ''
                out.append(f'<h2 id="{i}" class="dh-h1{especial}">{num}{html.escape(nom)}</h2>')
                continue
            tipo_l = self.formato_lista(ppr)
            if t[:1] in '•·▪◦' and len(t) > 2:  # viñeta escrita a mano
                tipo_l = 'ul'; h = re.sub(r'^(<strong>)?\s*[•·▪◦]\s*(</strong>)?\s*', '', h)
            if tipo_l:
                if not lista or lista[0] != tipo_l: cerrar_lista(); lista = [tipo_l, []]
                if tipo_l == 'ol':  # la numeración continúa aunque haya viñetas en medio
                    np_ = ppr.find(W('numPr')); nid = np_.find(W('numId')).get(W('val')) if np_ is not None and np_.find(W('numId')) is not None else '_'
                    self.contador[nid] = self.contador.get(nid, 0) + 1
                    lista[1].append((self.contador[nid], h)); continue
                lista[1].append(h); continue
            if 'List Bullet' in st or 'List Paragraph' in st or 'Viñeta' in st:
                if not lista or lista[0] != 'ul': cerrar_lista(); lista = ['ul', []]
                lista[1].append(h); continue
            if 'List Number' in st:
                if not lista or lista[0] != 'ol': cerrar_lista(); lista = ['ol', []]
                lista[1].append(h); continue
            cerrar_lista()
            if img and not t: out.append(h); continue
            cls = ' class="dh-nota"' if h.startswith('<em>') and h.endswith('</em>') else ''
            out.append(f'<p{cls}>{h}</p>')
        cerrar_lista()
        if en_portada: out[:0] = self.intro(portada)
        return '\n'.join(x for x in out if x)

    def intro(self, items):
        """De la portada del Word solo se conservan los párrafos con contenido propio
        (descripciones, datos clave). Logo, código, título, empresa, contacto y metadatos
        ya los muestra el encabezado de la página."""
        out, kv = [], []
        emp = next((k for k, x in enumerate(items) if 'S.A.S' in x[1] and len(x[1]) < 60), -1)
        items = items[emp + 1:] if emp >= 0 else items  # lo anterior a la empresa es título/subtítulo
        for (h, t, allb, color, img, st) in items:
            if img and not t: continue
            if RE_COD.match(t) or st.startswith('Heading 1') or (t.isupper() and len(t) > 12): continue
            if 'S.A.S' in t and len(t) < 60: continue
            if 'www.' in t or '@' in t: continue
            if re.match(r'^(Área responsable|Versión|Fecha de elaboración|Fecha)\s*:', t, re.I): continue
            m = re.match(r'^<strong>(.*?)</strong>\s*(.+)$', h, re.S)
            if m and len(m.group(1)) < 40:
                kv.append((m.group(1).strip(), m.group(2).strip())); continue
            out.append(f'<p class="dh-intro">{h}</p>')
        if kv:
            out.append('<dl class="dh-kv">' + ''.join(f'<div><dt>{a}</dt><dd>{b}</dd></div>' for a, b in kv) + '</dl>')
        return out

    def guardar_imagenes(self):
        if not self.imgs: return
        os.makedirs(self.imgdir, exist_ok=True)
        for h, ext, data in self.imgs:
            with open(os.path.join(self.imgdir, f'{self.codigo}-{h}{ext}'), 'wb') as f: f.write(data)


def oscuro(fill):
    """True si el color de relleno es oscuro (encabezado de tabla)."""
    if not fill or len(fill) != 6 or fill in ('AUTO',): return False
    try: r, g, b = (int(fill[i:i + 2], 16) for i in (0, 2, 4))
    except ValueError: return False
    return (0.299 * r + 0.587 * g + 0.114 * b) < 150


RE_COD = re.compile(r'^\d{4}-[A-Z]{3}-[A-Z]{3}')


def oracion(t):
    """TÍTULOS EN MAYÚSCULAS -> Tipo oración (conserva siglas cortas como RFP, SLA)."""
    letras = [c for c in t if c.isalpha()]
    if not letras or sum(c.isupper() for c in letras) / len(letras) < .8: return t
    pal = t.lower().split(' ')
    return ' '.join(pal).capitalize()


TIPOS = {'MAN': 'Manual', 'FOR': 'Formato', 'DIA': 'Diagrama', 'INS': 'Instructivo', 'GUI': 'Guía', 'FIC': 'Ficha técnica', 'POL': 'Política'}

PLANTILLA = """<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>{codigo} · {titulo}</title>
<link rel="icon" href="../assets/img/ideascontrol.webp">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/css/gd.css?v=20261005b">
<link rel="stylesheet" href="../assets/css/documento.css?v=20261005b">
<script>window.GD_BASE = '../';</script>
</head>
<body data-doc="{codigo}" class="dh-body">
<main>
<section class="dh-hero">
  <div class="dh-cont">
    <p class="dh-crumb"><a href="../index.html">Inicio</a> / <a href="../{pagina}">{area}</a> / <a href="../{pagina}#{grupo_id}">{grupo}</a> / {codigo}</p>
    <p class="dh-eyebrow">{area_may} · {tipo_may} · {codigo}{version_eb}</p>
    <h1>{titulo}</h1>
    {lead}
    <div class="dh-hmeta">{hmeta}</div>
    <div class="dh-hacc" id="acciones"><span class="dh-vig">Vigente</span><span class="dh-ro">Documento controlado · solo lectura en línea</span></div>
  </div>
</section>
<section class="dh-seccion">
  <div class="dh-grid">
    <nav class="dh-toc" aria-label="Contenido del documento">
      <div class="dh-toc-t">Contenido</div>
      <ol>{toc}</ol>
    </nav>
    <article class="dh-article">
      <details class="dh-toc-movil"><summary>Contenido del documento</summary><ol>{toc}</ol></details>
{contenido}
      <div class="dh-nav" id="dh-nav"><a href="../{pagina}#{grupo_id}">← Volver a {grupo}</a></div>
    </article>
  </div>
</section>
</main>
<button class="dh-arriba" id="arriba" aria-label="Volver arriba">↑</button>
<div class="dh-zoom" id="zoom" hidden><img alt=""></div>
<script src="../assets/js/auth.js?v=20261005b"></script>
<script src="../assets/js/catalogo.js?v=20261005b"></script>
<script src="../assets/js/app.js?v=20261005b"></script>
<script>GD.iniciarDocumento();</script>
</body>
</html>
"""


def cargar_catalogo(codigo):
    import json
    ruta = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'js', 'catalogo.js')
    s = open(ruta, encoding='utf-8').read()
    data = json.loads(s[s.index('window.GD_CATALOGO = ') + 21:].rstrip().rstrip(';'))
    for a in data['areas']:
        for g in a['grupos']:
            for d in g['docs']:
                if d.get('codigo') == codigo: return a, g, d
    sys.exit(f'ERROR: el código {codigo} no está en assets/js/catalogo.js — agréguelo primero.')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('entrada'); ap.add_argument('codigo')
    ap.add_argument('--reemplazar', action='append', default=[], help='Sustituye texto en todo el documento: VIEJO=NUEVO')
    ap.add_argument('--codigos-ope', action='store_true', help='Unifica códigos NNNN-XXX-TEC -> NNNN-XXX-OPE en todo el documento')
    ap.add_argument('--salida', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'documentos'))
    a = ap.parse_args()
    area, grupo, doc = cargar_catalogo(a.codigo)
    os.makedirs(a.salida, exist_ok=True)
    c = Conversor(a.entrada, a.codigo, os.path.join(a.salida, 'img'))
    contenido = c.convertir()
    c.imgs = [x for x in c.imgs if f'{a.codigo}-{x[0]}' in contenido]  # descarta el logo de portada
    c.guardar_imagenes()
    toc = ''.join(f'<li class="n{n}"><a href="#{i}">{html.escape(t)}</a></li>' for n, i, t in c.toc)
    e = html.escape
    meta = [('Responsable', doc.get('responsable')), ('Emisión', doc.get('fecha')), ('Última revisión', doc.get('revision')),
            ('Aprobó', c.ficha.get('aprobado por')), ('Próxima revisión', c.ficha.get('próxima revisión programada'))]
    hmeta = ''.join(f'<span><b>{k}</b>{e(v)}</span>' for k, v in meta if v)
    out = PLANTILLA.format(
        codigo=e(a.codigo), titulo=e(doc['titulo']), area=e(area['nombre']), area_may=e(area['nombre'].upper()),
        pagina=area.get('pagina', 'index.html'), grupo=e(grupo['nombre']), grupo_id=grupo['id'],
        tipo_may=TIPOS.get(doc.get('tipo'), 'Documento').upper(),
        version_eb=f" · VERSIÓN {e(doc['version'])}" if doc.get('version') else '',
        lead=f'<p class="dh-lead">{e(doc["resumen"])}</p>' if doc.get('resumen') else '',
        hmeta=hmeta, toc=toc, contenido=contenido)
    if a.codigos_ope:
        out = re.sub(r'\b(\d{4})-(MAN|FOR|INS|DIA|GUI|PRO|REG)-TEC\b', r'\1-\2-OPE', out)
    for r in a.reemplazar:
        viejo, nuevo = r.split('=', 1); out = out.replace(viejo, nuevo)
    dest = os.path.join(a.salida, f'{a.codigo}.html')
    open(dest, 'w', encoding='utf-8').write(out)
    print(f'OK {os.path.normpath(dest)}  secciones={len(c.toc)}  imagenes={len(c.imgs)}  bytes={len(out)}')


if __name__ == '__main__':
    main()
