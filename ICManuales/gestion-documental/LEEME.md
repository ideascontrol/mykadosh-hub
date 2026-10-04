# Gestión Documental · Ideas Control

Portal estático (HTML/CSS/JS, sin frameworks) listo para GitHub Pages.

## Estructura
```
index.html                 Portal principal: buscador global + 7 áreas de gestión
gestion-operativa.html     Área Gestión Operativa (procesos, manuales y formatos)
documentos/CODIGO.html     Documento en página de lectura (estilo artículo, índice lateral)
tools/docx2html.py         Conversor Word -> página de lectura
plantillas/                Plantillas de trabajo descargables (sin portada, ficha ni control de cambios)
assets/js/catalogo.js      ÚNICA fuente de datos: áreas, procesos y documentos
assets/js/app.js           Lógica compartida (render, búsqueda, lector)
assets/js/auth.js          Control de acceso (marcador de posición, modo desarrollo)
assets/css/gd.css          Estilos con colores de marca (#0E76BC, #159090, #C9A227)
assets/css/documento.css   Estilo de las páginas de documento
ruta-tecnico.html          Herramienta de consulta: flujograma del proceso de instalación
estructura-carpetas.html   Herramienta de consulta: estructura de carpetas del servidor de IC
generador.html             Generador de documentos de trabajo (prediligencia, nombra y organiza) · series 2100 y 2400
evaluacion.html            Evaluación de conocimientos: nombre, 10 preguntas al azar (4 INS, 3 MTTO, 3 SEG), aprueba con 80 %
assets/js/evaluacion-banco.js  Banco de 30 preguntas (mismo contenido del Word del banco)
mantenimiento.html         Diligenciar mantenimiento desde el celular (serie 2400): entrega los Word diligenciados
assets/js/docx-relleno.js  Funciones para escribir en las plantillas Word (campos, casillas ☐→☒, recuadros, tablas)
assets/js/mtto.js          Serie 2400: puntos del checklist, pruebas y relleno de 2401, 2402, 2403 y 2408
assets/js/generador.js     Lógica del generador (mapa etiqueta→dato por formato, nombres, carpetas)
assets/vendor/jszip.min.js JSZip 3.10 (MIT) para editar los .docx en el navegador
```

## Publicar un documento (lectura en HTML, sin descarga)
1. Convertir: `python3 tools/docx2html.py "ARCHIVO.docx" 2400-MAN-OPE`
   (use `--codigos-ope` para unificar NNNN-XXX-TEC -> NNNN-XXX-OPE).
   La entrada debe existir antes en `assets/js/catalogo.js` (título, versión, fechas, resumen
   se toman de ahí para el encabezado). Luego agregue `"html": "documentos/2400-MAN-OPE.html"`.
2. `temas` alimenta el buscador (títulos de sección).
3. Las páginas de documento bloquean clic derecho, Ctrl+P / Ctrl+S e impresión.

## Plantillas de trabajo
Plantillas definitivas (`"plantillaDefinitiva": true` en el catálogo): 2101, 2102, 2103, 2104, 2105,
2401, 2402, 2403 y 2408. Se muestran con la etiqueta "Plantilla definitiva" y el botón
"Plantilla de trabajo · próximamente" hasta que se habilite la descarga.
Habilitadas: 2101, 2102, 2103, 2104, 2105, 2401, 2402, 2403, 2405 y 2408. Para habilitar otra: genere la plantilla a partir del formato
aprobado (se quitan portada, ficha de control y control de cambios), cópiela en `plantillas/` y agregue
`"plantilla": "plantillas/ARCHIVO.docx"` a la entrada del catálogo.
Códigos retirados (no reutilizar): 2111-FOR-OPE (integrado en 2102), 2112 a 2114-FOR-OPE (integrados en 2103)
2407-FOR-OPE (integrado en 2403) y 2409-FOR-OPE (Excel integral, reemplazado por mantenimiento.html). El diagrama de mantenimiento cambió de 2401-MAN-OPE a 2410-DIA-OPE.
Serie 2400 (mantenimiento): orden 2401 y acta 2408 se diligencian una por visita; checklist 2402 uno por equipo
(registro único de pruebas finales); informe 2403 por equipo en correctivos, extraordinarios o preventivos con NC.
2404 (guía) y 2406 (instructivo) son solo de consulta. Tipos de documento admitidos: MAN, FOR, INS, DIA, GUI, FIC.

## Generador de documentos de trabajo
El técnico diligencia una vez los datos de la actividad (cliente, fecha, técnico, equipos) y obtiene:
- Las plantillas prediligenciadas (cliente, NIT, sede, fecha, OS/proyecto, técnico, equipo, serial; en el 2103
  se marcan el modelo y el instructivo).
- Nombre según la regla `[CLIENTE]_[ACTIVIDAD]_[FORMATO]_[DETALLE]_[AAAAMMDD].docx`.
- La estructura del servidor: `CCCC_CLIENTE/04_INSTALACIONES/AAAA/INS-AAAA-NNN/` (+ `EVIDENCIAS/`).
Destino: "Guardar en mi carpeta de trabajo" (Chrome/Edge de escritorio; la carpeta se elige una vez) o
"Descargar en ZIP" (cualquier navegador). En la oficina se copia la carpeta del cliente dentro de `01_CLIENTES`.
Para sumar un formato: en el catálogo agregue `"generador": {"detalle": "equipo"|"sede"|null}` y en
`generador.js` (MAPA) las etiquetas del Word que deben prediligenciarse.

## Codificación (1100-MAN-GER)
`NNNN-TTT-AAA`: el millar es el bloque de área, la centena la familia y las dos últimas cifras el consecutivo
(NN00 = documento maestro). Bloques: 1000 Gerencia (GER) · 2000 Operaciones Técnicas (OPE) · 3000 Comercial (COM) ·
4000 Información y Tecnología (TEC) · 5000 Inventario (INV) · 6000 Talento Humano (TAH) · 7000 Financiera (FIN).
Cada área del catálogo tiene su `bloque`. Un área tiene página propia solo cuando tiene documentos vigentes.

## Habilitar una nueva área
1. Copie `gestion-operativa.html` como `gestion-<area>.html` y cambie `data-area="operativa"` por el id del área.
2. En `catalogo.js`, agregue `"pagina": "gestion-<area>.html"` al área. La tarjeta del portal se activa sola.

## Control de acceso (pendiente)
Todas las páginas llaman a `GDAuth.proteger()`. Hoy deja pasar a todos.
Importante: en GitHub Pages las páginas de `documentos/` son públicas por URL aunque haya login en JS.
Para restringirlos de verdad, los documentos deben servirse desde un backend con permisos
(p. ej. Google Drive + Apps Script que valide la sesión y entregue el archivo).

## Diligenciar mantenimiento (celular)
`mantenimiento.html` guía al técnico por 4 pasos: Visita (datos, antes de intervenir, autorizaciones), Equipos
(por EQ: datos, 20 puntos C/NC/NA, 8 pruebas OK/Falla, resultado, evidencia e informe técnico cuando hay NC o el
mantenimiento es correctivo/extraordinario), Cierre (resumen, pendientes, aceptación) y Documentos.
- El avance se guarda como borrador en el navegador del celular (localStorage); no se envía a ningún servidor.
- Entrega 2401 (1 por visita), 2402 (1 por equipo), 2403 (solo equipos que lo requieren) y 2408 (1 por visita),
  con el nombre `CCCC_MTTO-AAAA-NNN_FORMATO[_EQnn]_AAAAMMDD.docx` en `CCCC_CLIENTE/06_MANTENIMIENTO/AAAA/MTTO-AAAA-NNN/`.
- Salidas: Compartir (WhatsApp, correo, Drive… desde el celular), ZIP con carpetas o carpeta de trabajo (computador).
- Si cambia el texto de un formato, actualice las listas CHECK / PRUEBAS / PREP en `assets/js/mtto.js`
  y vuelva a generar la plantilla: el relleno ubica los campos por sus etiquetas.
