# Landing — Soluciones de Time & Attendance · Ideas Control

Landing de captación de prospectos B2B. HTML/CSS/JS sin frameworks, sin cookies ni píxeles de seguimiento.
Backend: Google Apps Script (Aplicación web) → Google Sheets `BD_Campana_Piloto_WFM`, pestaña `LEADS`.

## Estructura

```
ideascontrol/
├── assets/ideascontrol.webp            ← logo compartido (ya existe en el repo)
└── PilotoTyA/
    ├── index.html                      ← landing
    ├── css/styles.css
    ├── js/config.js                    ← ÚNICO archivo a editar antes de publicar
    ├── js/countries.js                 ← 245 países: nombre, prefijo y longitudes de teléfono
    ├── js/validation.js                ← validaciones del cliente
    ├── js/app.js                       ← envío, estados, idempotencia, cierre
    ├── apps-script/Code.gs             ← backend
    ├── apps-script/appsscript.json     ← manifiesto
    └── tests/                          ← pruebas automáticas (no se publican necesariamente)
```

## 1. Crear la base de datos

1. Con la cuenta de Google **corporativa** que será propietaria de los datos, cree un archivo de Google Sheets llamado `BD_Campana_Piloto_WFM`.
2. Copie su **ID** (la parte de la URL entre `/d/` y `/edit`).
3. No comparta el archivo con nadie fuera del personal autorizado. La pestaña `LEADS` y sus 11 columnas las crea el script:
   `id, fecha_registro, nombre_completo, correo_empresarial, codigo_pais, telefono, empresa, pais, acepta_politicas, version_politicas, fecha_aceptacion`

## 2. Desplegar el backend (Apps Script)

1. En el archivo: **Extensiones → Apps Script**. Pegue el contenido de `apps-script/Code.gs`.
   En *Configuración del proyecto* active "Mostrar el archivo de manifiesto" y pegue `appsscript.json`.
2. **Configuración del proyecto → Propiedades del script**:

| Propiedad | Obligatoria | Valor |
|---|---|---|
| `SHEET_ID` | Sí | ID del archivo del paso 1 |
| `POLICY_VERSION` | Sí | `TYA-LEAD-2026-10-v2` (igual a `js/config.js`) |
| `SHEET_NAME` | No | `LEADS` (predeterminado) |
| `BLOCKED_DOMAINS` | No | lista separada por comas; si no se define se usa la lista por defecto |
| `RATE_GLOBAL_PER_MIN` | No | 20 |
| `RATE_EMAIL_PER_DAY` | No | 3 |
| `MIN_FILL_MS` | No | 2500 |
| `TIMEZONE` | No | `America/Bogota` |

3. Ejecute la función **`setup`** una vez desde el editor y autorice los permisos. Crea `LEADS`, encabezados, formatos de fecha y protege la hoja.
4. Ejecute **`pruebaRegistro`**: debe aparecer una fila "PRUEBA" en `LEADS`. Bórrela después.
5. **Implementar → Nueva implementación → Aplicación web**: *Ejecutar como*: **Yo**; *Quién tiene acceso*: **Cualquier usuario**. Copie la URL que termina en `/exec`.
   > "Cualquier usuario" solo permite **enviar** registros; el script no tiene ninguna ruta que lea o devuelva datos de la hoja.
6. Cada cambio en `Code.gs` requiere **Implementar → Gestionar implementaciones → Editar → Nueva versión** (la URL se mantiene).

## 3. Configurar y publicar la landing

En `js/config.js`:
- `ENDPOINT_URL`: la URL `/exec` del paso 2.5. Mientras esté vacía, el formulario muestra un error y **no simula éxito**.
- `POLICY_VERSION`: igual a la propiedad del backend. Si se cambia el texto de las políticas, suba la versión en **ambos** lados.
- `BLOCKED_EMAIL_DOMAINS`: mantener igual a `BLOCKED_DOMAINS` del backend.
- `CLOSE_AFTER_SECONDS` / `CLOSE_REDIRECT_URL`: cierre de la landing tras guardar.

Publicación: suba la carpeta `PilotoTyA/` al repositorio de Ideas Control (GitHub Pages, HTTPS). Quedará en `…/ideascontrol/PilotoTyA/`. El logo se toma de `/ideascontrol/assets/ideascontrol.webp`.

## Cómo funciona la seguridad

- **Sin secretos en el navegador**: la URL `/exec` es pública por diseño; toda la protección está en el servidor.
- **Doble validación**: los mismos controles en cliente (`validation.js`) y servidor (`Code.gs`).
- **Correos**: se valida sintaxis y una lista explícita y configurable de dominios personales. Los prefijos genéricos (`info@`, `ventas@`, `contacto@`, `soporte@`) se aceptan. No se afirma que el buzón exista.
- **Idempotencia**: cada intento de envío lleva un UUID (`request_id`) que se reutiliza en los reintentos y es el `id` de la fila. Si llega repetido, el servidor responde éxito sin escribir otra fila (verifica caché y la columna `id`).
- **Antiabuso**: campo trampa invisible, tiempo mínimo de diligenciamiento, límite global por minuto y límite por correo cada 24 h, cuerpo máximo de 10 KB, `LockService` para escrituras concurrentes.
- **Inyección de fórmulas**: los valores que empiezan con `= + - @` se guardan como texto; teléfono y prefijo siempre como texto (conservan `+` y ceros iniciales).
- **Confirmación real**: la página solo muestra "¡Gracias…!" si el servidor responde `{ok:true, saved:true, id}` después de escribir y releer la fila.
- **Registro técnico**: errores en *Ejecuciones* de Apps Script, solo con código de error; sin datos personales.
- **Fechas**: `fecha_registro` = hora del servidor. `fecha_aceptacion` = momento en que se marcó la casilla; si es inválida o inverosímil, se usa la hora del servidor.

## Cierre de la landing

Tras guardar se muestra la confirmación con cuenta regresiva. Los navegadores solo permiten `window.close()` en pestañas abiertas por un script (p. ej., si el anuncio abre la landing en ventana nueva); en los demás casos se redirige a `CLOSE_REDIRECT_URL` (ideascontrol.com). `CLOSE_AFTER_SECONDS: 0` desactiva el cierre automático.

## Parámetros UTM

`utm_source`, `utm_medium` y `utm_campaign` se capturan pero **no se envían ni se guardan**, porque `LEADS` no tiene columna `origen`. Para usarlos: aprobar la nueva columna, agregarla a `HEADERS` y a `row` en `Code.gs`, y poner `SEND_UTM: true`.

## Pruebas de aceptación

Automáticas (`node --test tests/backend.test.js` y `node --test --test-concurrency=1 tests/e2e.test.js`; las de navegador requieren Playwright). Ejecutan el `Code.gs` real contra una hoja simulada y la landing real en Chromium. **Resultado actual: 30/30 aprobadas.**

| # | Caso | Esperado |
|---|---|---|
| 1 | Registro válido (`info@empresa.com`) | Confirmación en la página, 1 fila con las 11 columnas |
| 2 | `ventas@`, `contacto@`, `soporte@` | Aceptados |
| 3 | gmail / hotmail / outlook / live / yahoo | Error en el campo, nada se envía |
| 4 | Formulario vacío | Error por campo, foco en el primero |
| 5 | Nombre solo espacios / teléfono con dígitos incorrectos para +57 | Rechazados con mensaje claro |
| 6 | Casilla sin marcar (desmarcada por defecto) | No se envía |
| 7 | Sin conexión | Mensaje, datos conservados; reintento guarda 1 sola fila |
| 8 | Se guarda pero se pierde la respuesta | Sin éxito falso; reintento no duplica |
| 9 | Error HTTP 500 | Sin éxito falso |
| 10 | Clics repetidos | 1 sola solicitud |
| 11 | Sin `ENDPOINT_URL` | Error de configuración, sin éxito falso |
| 12 | Después de guardar | Cuenta regresiva y cierre/redirección |
| 13 | 320, 390, 768, 1366 y 1920 px | Sin desbordamiento horizontal |
| 14 | Backend: versión de política distinta, campo trampa, envío rápido, límites, fórmulas, fallo de escritura, `doGet` | Rechazos correctos; `doGet` no expone datos |

**Prueba manual obligatoria antes de publicar** (con la URL real):
1. Enviar con `info@<dominio de prueba>.com` → aparece la fila en `LEADS`.
2. Enviar con `algo@gmail.com` → se rechaza.
3. Enviar sin marcar la casilla → no se envía.
4. Activar modo avión en el celular y enviar → error; desactivarlo y reintentar → 1 sola fila.
5. Borrar las filas de prueba.

## Lo que Ideas Control debe proporcionar o aprobar antes de publicar

1. Cuenta Google corporativa propietaria del archivo y el **ID** de `BD_Campana_Piloto_WFM`.
2. La **URL `/exec`** del despliegue → `ENDPOINT_URL`.
3. **Texto de autorización de datos** de la casilla aprobado por el área responsable (en `index.html`). Aceptar los términos del piloto **no** sustituye la autorización de tratamiento de datos; por eso la casilla incluye ambas de forma expresa.
4. **Política de Tratamiento de Datos Personales y Aviso de Privacidad** publicados en www.ideascontrol.com: la landing los menciona como texto (sin enlace), así que deben estar visibles en ese sitio.
5. **Condiciones del piloto**: la landing no enlaza a términos externos; las condiciones que se aceptan son las de la sección «Condiciones del piloto» de la página.
6. **Versión de las políticas** definitiva (`POLICY_VERSION` en ambos lados).
7. Datos corporativos para el pie de página (teléfono, correo, dirección) **verificados en el sitio oficial**; hoy el pie solo muestra razón social y enlaces.
8. Lista final de dominios personales bloqueados.
9. Personas autorizadas para consultar la hoja (compartir solo con ellas, como lectores).
10. Si se quiere atribución por campaña: aprobación de la columna `origen`.
