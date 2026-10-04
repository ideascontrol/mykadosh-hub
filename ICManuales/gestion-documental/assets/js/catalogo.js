/* ==========================================================================
   CATÁLOGO DE GESTIÓN DOCUMENTAL — Ideas Control Equipos y Soluciones S.A.S.
   Fuente única de verdad del portal. Para publicar un documento nuevo:
     1. Convierta el Word a página de lectura:
          python3 tools/docx2html.py "ARCHIVO.docx" CODIGO
        (genera documentos/CODIGO.html) y agregue  "html": "documentos/CODIGO.html"
        La entrada del catálogo debe existir ANTES de convertir (el encabezado
        de la página toma de aquí título, versión, fechas y resumen).
     2. Plantillas de trabajo: SOLO formatos FOR autorizados llevan
          "plantilla": "plantillas/ARCHIVO.docx"
        Sin esa propiedad el formato muestra "Plantilla de trabajo · no habilitada".
     3. Para habilitar un área nueva, cree su HTML (copie gestion-operativa.html,
        cambie data-area) y agregue la propiedad "pagina" al área.
   estado: "publicado"  -> visible, se puede leer (y descargar si tiene plantilla)
           "por-cargar" -> aprobado, archivo aún no cargado al portal
           "planeado"   -> en la estructura, aún sin documentar
   tipo:   MAN = Manual · FOR = Formato · INS = Instructivo · DIA = Diagrama
   herramientas (en el área): páginas de consulta que se muestran como accesos directos
   generador: {detalle} -> el formato se puede generar prediligenciado en generador.html
                (detalle: 'equipo' = uno por equipo, 'sede' = uno por sede, null = uno por actividad)
   plantillaDefinitiva: true -> formato definido como plantilla de trabajo (descarga aún no habilitada)
   ========================================================================== */
window.GD_CATALOGO = {
 "empresa": "Ideas Control Equipos y Soluciones S.A.S.",
 "actualizado": "Octubre 2026",
 "areas": [
  {
   "id": "comercial",
   "nombre": "Gestión Comercial",
   "icono": "comercial",
   "descripcion": "Relación con clientes, experiencia, fidelización y marketing.",
   "grupos": [
    {
     "id": "comercial-clientes",
     "nombre": "Comercial y Relación con Clientes",
     "docs": []
    },
    {
     "id": "experiencia",
     "nombre": "Experiencia y Fidelización del Cliente",
     "docs": []
    },
    {
     "id": "marketing",
     "nombre": "Marketing",
     "docs": []
    }
   ],
   "bloque": "3000"
  },
  {
   "id": "gerencia",
   "nombre": "Gerencia",
   "icono": "gerencia",
   "descripcion": "Direccionamiento estratégico, sistema normativo interno y políticas corporativas.",
   "grupos": [
    {
     "id": "gestion-gerencial",
     "nombre": "Gestión Gerencial",
     "docs": [
      {
       "codigo": "1100-MAN-GER",
       "titulo": "Manual de Gestión Documental",
       "tipo": "MAN",
       "estado": "planeado"
      },
      {
       "codigo": "",
       "titulo": "Planeación Estratégica",
       "tipo": "",
       "estado": "planeado"
      },
      {
       "codigo": "",
       "titulo": "Definición de Objetivos y Metas",
       "tipo": "",
       "estado": "planeado"
      },
      {
       "codigo": "1103-MAN-GER",
       "titulo": "Reglamento Interno de Trabajo",
       "tipo": "MAN",
       "estado": "planeado"
      },
      {
       "codigo": "",
       "titulo": "Reglamento de Higiene y Seguridad Industrial",
       "tipo": "",
       "estado": "planeado"
      },
      {
       "codigo": "",
       "titulo": "Código de Ética",
       "tipo": "",
       "estado": "planeado"
      },
      {
       "codigo": "",
       "titulo": "Política de Tratamiento de Datos Personales",
       "tipo": "",
       "estado": "planeado"
      },
      {
       "codigo": "",
       "titulo": "Política de Uso de Recursos Tecnológicos",
       "tipo": "",
       "estado": "planeado"
      },
      {
       "codigo": "",
       "titulo": "Política de Teletrabajo y Trabajo Remoto",
       "tipo": "",
       "estado": "planeado"
      }
     ],
     "serie": "1100"
    }
   ],
   "bloque": "1000"
  },
  {
   "id": "operativa",
   "nombre": "Gestión Operativa",
   "icono": "operativa",
   "pagina": "gestion-operativa.html",
   "descripcion": "Instalación, configuración y mantenimiento de soluciones biométricas y de tiempos y asistencia.",
   "grupos": [
    {
     "id": "instalacion",
     "serie": "2100",
     "nombre": "Instalación Biométrico Hardware",
     "descripcion": "Instalación, configuración, integración y puesta en marcha de equipos biométricos: desde la validación del sitio hasta la entrega y aceptación.",
     "docs": [
      {
       "codigo": "2100-MAN-OPE",
       "titulo": "Manual de Instalación y Puesta en Marcha de Equipos Biométricos",
       "tipo": "MAN",
       "estado": "publicado",
       "responsable": "Operaciones Técnicas (Soporte e Implementación)",
       "resumen": "Lineamientos y actividades técnicas para instalar, configurar, integrar y poner en marcha equipos biométricos: preparación, instalación física, conexión eléctrica y de red, configuración inicial, usuarios de prueba, pruebas funcionales, entrega y cierre.",
       "html": "documentos/2100-MAN-OPE.html",
       "version": "1.0",
       "fecha": "Enero 2025",
       "revision": "Agosto 2026",
       "temas": [
        "Ficha de Control del Documento",
        "Control de Cambios",
        "Información General",
        "Objetivo del manual",
        "Alcance",
        "Aplicación",
        "Responsables",
        "Definiciones y siglas",
        "Referencias técnicas y normativas",
        "Descripción de la Solución Biométrica",
        "Tipos de dispositivos soportados",
        "Tecnologías biométricas utilizadas (palma, rostro, huella)",
        "Componentes del sistema",
        "Arquitectura general de instalación",
        "Requisitos mínimos del entorno",
        "Seguridad y Buenas Prácticas",
        "Seguridad eléctrica",
        "Seguridad física durante la instalación",
        "Protección de datos biométricos",
        "Manejo seguro de herramientas",
        "Uso de elementos de protección personal",
        "Buenas prácticas de cableado y montaje",
        "Preparación de la Instalación",
        "Revisión de la orden de servicio",
        "Verificación de equipos y accesorios",
        "Validación del sitio de instalación",
        "Requisitos de energía y red",
        "Herramientas requeridas",
        "Checklist previo a instalación",
        "Instalación Física del Equipo",
        "Selección del punto de instalación",
        "Altura y orientación recomendada",
        "Montaje en pared o soporte",
        "Instalación de fuentes y accesorios",
        "Organización y protección del cableado",
        "Verificación mecánica final",
        "Conexión Eléctrica y de Red",
        "Alimentación eléctrica",
        "Conexión Ethernet",
        "Configuración Wi-Fi (si aplica)",
        "Verificación de comunicación",
        "Pruebas básicas de conectividad",
        "Configuración Inicial del Dispositivo",
        "Encendido inicial",
        "Configuración de fecha y hora",
        "Configuración de red",
        "Configuración de idioma",
        "Creación de usuario administrador",
        "Cambio de credenciales por defecto",
        "Registro de usuarios de prueba",
        "Selección de usuarios",
        "Registro en el dispositivo",
        "Validación de identificación",
        "Usuarios temporales de prueba",
        "Criterios de aceptación",
        "Registro de resultados",
        "Pruebas funcionales",
        "Pruebas de comunicación",
        "Prueba de transmisión de marcaciones",
        "Pruebas de aceptación",
        "Capacitación",
        "Documentación de la instalación",
        "Acta de entrega y aceptación",
        "Cierre de instalación",
        "Archivos Relacionados"
       ]
      },
      {
       "codigo": "2101-FOR-OPE",
       "titulo": "Checklist de Preinstalación",
       "tipo": "FOR",
       "estado": "publicado",
       "responsable": "Operaciones Técnicas (Soporte e Implementación)",
       "resumen": "Verificación en sitio de condiciones físicas, energía, red y conectividad antes de la instalación, con firmas de conformidad del cliente.",
       "html": "documentos/2101-FOR-OPE.html",
       "version": "1.0",
       "relacionado": "2100-MAN-OPE",
       "temas": [
        "Validación del sitio de instalación",
        "Requisitos de energía y red",
        "Pruebas básicas de conectividad",
        "Validación y firmas de conformidad"
       ],
       "plantillaDefinitiva": true,
       "plantilla": "plantillas/2101-FOR-OPE_Checklist_Preinstalacion.docx",
       "generador": {
        "detalle": "sede"
       }
      },
      {
       "codigo": "2102-FOR-OPE",
       "titulo": "Checklist de Instalación, Puesta en Operación y Pruebas Funcionales",
       "tipo": "FOR",
       "estado": "publicado",
       "responsable": "Operaciones Técnicas (Soporte e Implementación)",
       "resumen": "Un formato por equipo: instalación y conectividad, usuarios de prueba, resultados por usuario, pruebas funcionales del dispositivo, transmisión de marcaciones, aceptación y capacitación, con validación interna y del cliente.",
       "html": "documentos/2102-FOR-OPE.html",
       "version": "2.0",
       "relacionado": "2100-MAN-OPE",
       "temas": [
        "Ficha de Control del Documento",
        "Control de Cambios",
        "Datos de Control",
        "Instalación y Conectividad",
        "Usuarios de Prueba",
        "Resultados por Usuario",
        "Pruebas Funcionales del Dispositivo",
        "Prueba de Transmisión de Marcaciones",
        "Pruebas de Aceptación y Capacitación",
        "Resultado",
        "Validación"
       ],
       "plantillaDefinitiva": true,
       "fecha": "Enero 2025",
       "revision": "Octubre 2026",
       "plantilla": "plantillas/2102-FOR-OPE_Checklist_Instalacion_Puesta_en_Operacion_y_Pruebas_Funcionales.docx",
       "generador": {
        "detalle": "equipo"
       }
      },
      {
       "codigo": "2103-FOR-OPE",
       "titulo": "Checklist de Enrolamiento de Empleado",
       "tipo": "FOR",
       "estado": "publicado",
       "responsable": "Operaciones Técnicas (Soporte e Implementación)",
       "resumen": "Formato único para todos los modelos (SpeedFace-V5L, SpeedFace-V3L, AC-2100 Plus, UBio-X Face): dispositivo e instructivo aplicado, registro de enrolamiento de varios empleados, cierre y validación.",
       "html": "documentos/2103-FOR-OPE.html",
       "version": "2.0",
       "fecha": "Enero 2025",
       "relacionado": "2100-MAN-OPE",
       "temas": [
        "Ficha de Control del Documento",
        "Control de Cambios",
        "Datos de Control",
        "Dispositivo e Instructivo Aplicado",
        "Registro de Enrolamiento",
        "Cierre del Enrolamiento",
        "Resultado",
        "Validación"
       ],
       "plantillaDefinitiva": true,
       "revision": "Octubre 2026",
       "plantilla": "plantillas/2103-FOR-OPE_Checklist_Enrolamiento_de_Empleado.docx",
       "generador": {
        "detalle": "equipo"
       }
      },
      {
       "codigo": "2104-FOR-OPE",
       "titulo": "Registro de Equipo Instalado",
       "tipo": "FOR",
       "estado": "publicado",
       "responsable": "Operaciones Técnicas (Soporte e Implementación)",
       "resumen": "Formato técnico de instalación y trazabilidad: identificación del equipo, ubicación física, conectividad, alimentación, accesorios, estado de instalación, evidencia fotográfica y validación.",
       "html": "documentos/2104-FOR-OPE.html",
       "version": "1.0",
       "fecha": "Enero 2025",
       "revision": "Agosto 2026",
       "relacionado": "2100-MAN-OPE",
       "temas": [
        "Ficha de Control del Documento",
        "Control de Cambios",
        "Datos de Control",
        "Identificación del Equipo",
        "Ubicación Física",
        "Conectividad",
        "Alimentación Eléctrica",
        "Accesorios Entregados / Instalados",
        "Estado de Instalación",
        "Observaciones / Hallazgos",
        "Evidencia Fotográfica",
        "Responsables y Validación"
       ],
       "plantillaDefinitiva": true,
       "plantilla": "plantillas/2104-FOR-OPE_Registro_de_Equipo_Instalado.docx",
       "generador": {
        "detalle": "equipo"
       }
      },
      {
       "codigo": "2105-FOR-OPE",
       "titulo": "Acta de Entrega y Aceptación",
       "tipo": "FOR",
       "estado": "publicado",
       "responsable": "Operaciones Técnicas (Soporte e Implementación)",
       "resumen": "Constancia de entrega, verificación y aceptación del servicio instalado: cliente, servicio, equipos entregados, actividades realizadas, resultado, observaciones y pendientes, documentación asociada y firmas.",
       "relacionado": "2100-MAN-OPE",
       "html": "documentos/2105-FOR-OPE.html",
       "version": "1.0",
       "fecha": "Enero 2025",
       "revision": "Agosto 2026",
       "temas": [
        "Ficha de Control del Documento",
        "Control de Cambios",
        "Identificación del Documento",
        "Información del Cliente",
        "Información del Servicio",
        "Equipos Entregados",
        "Actividades Realizadas",
        "Resultado de la Entrega",
        "Observaciones y Pendientes",
        "Declaración de Aceptación"
       ],
       "plantillaDefinitiva": true,
       "plantilla": "plantillas/2105-FOR-OPE_Acta_de_Entrega_y_Aceptacion.docx",
       "generador": {
        "detalle": null
       }
      },
      {
       "codigo": "2106-INS-OPE",
       "titulo": "Instructivo de Montaje del Dispositivo",
       "tipo": "INS",
       "estado": "publicado",
       "responsable": "Operaciones Técnicas (Soporte e Implementación)",
       "resumen": "Actividades y criterios técnicos para la instalación física del equipo biométrico: selección del punto, altura y orientación, montaje, fuente y accesorios, cableado, verificación mecánica y criterios de aceptación.",
       "relacionado": "2100-MAN-OPE",
       "html": "documentos/2106-INS-OPE.html",
       "version": "1.0",
       "fecha": "Enero 2025",
       "revision": "Agosto 2026",
       "temas": [
        "Ficha de Control del Documento",
        "Control de Cambios",
        "Objetivo",
        "Alcance",
        "Responsables",
        "Requisitos Previos",
        "Procedimiento",
        "Selección del punto de instalación",
        "Altura y orientación",
        "Montaje en pared o soporte",
        "Instalación de fuente de alimentación y accesorios",
        "Organización y protección del cableado",
        "Verificación mecánica final",
        "Gestión de Hallazgos",
        "Criterios de Aceptación de la Instalación Física",
        "Registros y Documentos Relacionados",
        "Seguridad"
       ]
      },
      {
       "codigo": "2107-INS-OPE",
       "titulo": "Instructivo de Prueba de Conectividad Ping",
       "tipo": "INS",
       "estado": "publicado",
       "responsable": "Operaciones Técnicas (Soporte e Implementación)",
       "resumen": "Verificación de la conectividad de red entre el dispositivo y la infraestructura del cliente mediante ping: procedimiento, interpretación de resultados, acciones cuando la prueba falla y criterio de aceptación.",
       "relacionado": "2100-MAN-OPE",
       "html": "documentos/2107-INS-OPE.html",
       "version": "1.0",
       "fecha": "Enero 2025",
       "revision": "Agosto 2026",
       "temas": [
        "Ficha de Control del Documento",
        "Control de Cambios",
        "Objetivo",
        "Alcance",
        "Responsabilidades",
        "Requisitos previos",
        "Procedimiento",
        "Interpretación de resultados",
        "Acciones de verificación cuando la prueba falla",
        "Evidencia y registro",
        "Criterio de aceptación",
        "Manejo de incidentes",
        "Seguridad y buenas prácticas"
       ]
      },
      {
       "codigo": "2108-INS-OPE",
       "titulo": "Instructivo de Verificación de Conexión Ethernet",
       "tipo": "INS",
       "estado": "publicado",
       "responsable": "Operaciones Técnicas (Soporte e Implementación)",
       "resumen": "Conexión física Ethernet del dispositivo y verificación de su comunicación con el servidor de integración o la plataforma de tiempos y asistencia.",
       "relacionado": "2100-MAN-OPE",
       "html": "documentos/2108-INS-OPE.html",
       "version": "1.0",
       "fecha": "Enero 2025",
       "revision": "Agosto 2026",
       "temas": [
        "Ficha de Control del Documento",
        "Control de Cambios",
        "Objetivo",
        "Alcance",
        "Responsabilidades",
        "Requisitos previos",
        "Materiales y herramientas",
        "Procedimiento",
        "Criterios de aceptación",
        "Manejo de fallas",
        "Evidencia y registro",
        "Seguridad y buenas prácticas"
       ]
      },
      {
       "codigo": "2109-INS-OPE",
       "titulo": "Instructivo de Configuración de Conexión Wi-Fi",
       "tipo": "INS",
       "estado": "publicado",
       "responsable": "Operaciones Técnicas (Soporte e Implementación)",
       "resumen": "Configuración y validación de la conexión Wi-Fi cuando no hay Ethernet: cobertura, menú de red, conexión, direccionamiento IP, verificación de comunicación y manejo de fallas.",
       "relacionado": "2100-MAN-OPE",
       "html": "documentos/2109-INS-OPE.html",
       "version": "1.0",
       "fecha": "Enero 2025",
       "revision": "Agosto 2026",
       "temas": [
        "Ficha de Control del Documento",
        "Control de Cambios",
        "Objetivo",
        "Alcance",
        "Responsabilidades",
        "Requisitos previos",
        "Consideraciones de seguridad",
        "Procedimiento",
        "Verificar cobertura inalámbrica",
        "Ingresar al menú de red del dispositivo",
        "Buscar redes disponibles",
        "Conectar a la red",
        "Configurar direccionamiento IP",
        "Verificar conexión",
        "Verificar comunicación de red",
        "Verificar comunicación con el servidor",
        "Criterios de aceptación",
        "Manejo de fallas communes",
        "Evidencia y registro",
        "Buenas prácticas"
       ]
      },
      {
       "codigo": "2110-INS-OPE",
       "titulo": "Instructivo de Enrolamiento de Empleado en Dispositivo ZKTeco SpeedFace-V5L",
       "tipo": "INS",
       "estado": "publicado",
       "responsable": "Operaciones Técnicas (Soporte e Implementación)",
       "resumen": "Paso a paso del enrolamiento en el SpeedFace-V5L: creación del usuario, enrolamiento facial, huella, tarjeta o PIN, prueba de marcación, validación en la plataforma WFM y eliminación de usuarios de prueba.",
       "relacionado": "2100-MAN-OPE",
       "html": "documentos/2110-INS-OPE.html",
       "version": "1.0",
       "fecha": "Enero 2025",
       "revision": "Agosto 2026",
       "temas": [
        "Ficha de Control del Documento",
        "Control de Cambios",
        "Objetivo",
        "Alcance",
        "Requisitos previos",
        "Información del empleado",
        "Consideraciones de seguridad y protección de datos",
        "Acceso al menú de usuarios",
        "Creación del usuario",
        "Enrolamiento facial",
        "Condiciones recomendadas",
        "Validación del reconocimiento facial",
        "Enrolamiento de huella digital",
        "Validación de huella",
        "Enrolamiento mediante tarjeta",
        "Enrolamiento mediante contraseña / PIN",
        "Validación del identificador del empleado",
        "Prueba de marcación",
        "Validación en la plataforma de WFM",
        "Prueba completa de extremo a extremo",
        "Errores y acciones correctivas",
        "Eliminación de usuarios de prueba",
        "Criterios de aceptación",
        "Registro de la actividad",
        "Responsabilidades"
       ]
      },
      {
       "codigo": "2115-INS-OPE",
       "titulo": "Instructivo de Enrolamiento de Empleado en Dispositivo VIRDI AC-2100 Plus",
       "tipo": "INS",
       "estado": "publicado",
       "responsable": "Operaciones Técnicas (Soporte e Implementación)",
       "resumen": "Paso a paso del enrolamiento de empleados en el dispositivo VIRDI AC-2100 Plus: creación del usuario, métodos de identificación, prueba de marcación, validación en la plataforma WFM y eliminación de usuarios de prueba.",
       "html": "documentos/2115-INS-OPE.html",
       "version": "1.0",
       "fecha": "Septiembre 2025",
       "revision": "Septiembre 2026",
       "relacionado": "2100-MAN-OPE",
       "temas": [
        "Ficha de Control del Documento",
        "Control de Cambios",
        "Objetivo",
        "Alcance",
        "Requisitos previos",
        "Información del empleado",
        "Consideraciones de seguridad y protección de datos",
        "Acceso al menú de usuarios",
        "Creación del usuario",
        "Enrolamiento de huella digital",
        "Validación de huella",
        "Enrolamiento mediante tarjeta",
        "Validación del identificador del empleado",
        "Prueba de marcación",
        "Validación en la plataforma de WFM",
        "Prueba completa de extremo a extremo",
        "Errores y acciones correctivas",
        "Eliminación de usuarios de prueba",
        "Criterios de aceptación",
        "Registro de la actividad",
        "Responsabilidades",
        "Anexo A. Especificaciones técnicas de referencia – VIRDI AC-2100 PLUS"
       ]
      },
      {
       "codigo": "2116-INS-OPE",
       "titulo": "Instructivo de Enrolamiento de Empleado en Dispositivo VIRDI UBio-X Face",
       "tipo": "INS",
       "estado": "publicado",
       "responsable": "Operaciones Técnicas (Soporte e Implementación)",
       "resumen": "Paso a paso del enrolamiento de empleados en el dispositivo VIRDI UBio-X Face: creación del usuario, métodos de identificación, prueba de marcación, validación en la plataforma WFM y eliminación de usuarios de prueba.",
       "html": "documentos/2116-INS-OPE.html",
       "version": "1.0",
       "fecha": "Septiembre 2025",
       "revision": "Septiembre 2026",
       "relacionado": "2100-MAN-OPE",
       "temas": [
        "Ficha de Control del Documento",
        "Control de Cambios",
        "Objetivo",
        "Alcance",
        "Requisitos previos",
        "Información del empleado",
        "Consideraciones de seguridad y protección de datos",
        "Acceso al menú de usuarios",
        "Creación del usuario",
        "Enrolamiento facial",
        "Condiciones recomendadas",
        "Validación del reconocimiento facial",
        "Enrolamiento mediante tarjeta",
        "Validación del identificador del empleado",
        "Prueba de marcación",
        "Validación en la plataforma de WFM",
        "Prueba completa de extremo a extremo",
        "Errores y acciones correctivas",
        "Eliminación de usuarios de prueba",
        "Criterios de aceptación",
        "Registro de la actividad",
        "Responsabilidades",
        "Anexo A. Especificaciones técnicas de referencia – UBIO-X FACE"
       ]
      },
      {
       "codigo": "2117-INS-OPE",
       "titulo": "Instructivo de Enrolamiento de Empleado en Dispositivo ZKTeco SpeedFace-V3L",
       "tipo": "INS",
       "estado": "publicado",
       "responsable": "Operaciones Técnicas (Soporte e Implementación)",
       "resumen": "Paso a paso del enrolamiento de empleados en el dispositivo ZKTeco SpeedFace-V3L: creación del usuario, métodos de identificación, prueba de marcación, validación en la plataforma WFM y eliminación de usuarios de prueba.",
       "html": "documentos/2117-INS-OPE.html",
       "version": "1.0",
       "fecha": "Septiembre 2025",
       "revision": "Septiembre 2026",
       "relacionado": "2100-MAN-OPE",
       "temas": [
        "Ficha de Control del Documento",
        "Control de Cambios",
        "Objetivo",
        "Alcance",
        "Requisitos previos",
        "Información del empleado",
        "Consideraciones de seguridad y protección de datos",
        "Acceso al menú de usuarios",
        "Creación del usuario",
        "Enrolamiento facial",
        "Condiciones recomendadas",
        "Validación del reconocimiento facial",
        "Enrolamiento de huella digital",
        "Validación de huella",
        "Enrolamiento mediante tarjeta",
        "Enrolamiento mediante contraseña / PIN",
        "Validación del identificador del empleado",
        "Prueba de marcación",
        "Validación en la plataforma de WFM",
        "Prueba completa de extremo a extremo",
        "Errores y acciones correctivas",
        "Eliminación de usuarios de prueba",
        "Criterios de aceptación",
        "Registro de la actividad",
        "Responsabilidades",
        "Anexo A. Especificaciones técnicas de referencia – ZKTECO SPEEDFACE-V3L"
       ]
      }
     ],
     "actividad": "INS",
     "carpeta": "04_INSTALACIONES"
    },
    {
     "id": "software-tya",
     "nombre": "Configuración Software Gestión de Tiempos y Asistencia",
     "descripcion": "Parametrización e integración del software de tiempos y asistencia.",
     "docs": []
    },
    {
     "id": "mantenimiento",
     "nombre": "Gestión de Mantenimiento de Equipos Biométricos",
     "descripcion": "Mantenimiento preventivo, correctivo y extraordinario con trazabilidad y evidencia.",
     "docs": [
      {
       "codigo": "2400-MAN-OPE",
       "titulo": "Manual de Gestión de Mantenimiento de Equipos Biométricos",
       "tipo": "MAN",
       "estado": "publicado",
       "version": "2.0",
       "fecha": "Enero 2025",
       "responsable": "Operaciones Técnicas (Soporte y Mantenimiento)",
       "resumen": "Metodología estandarizada para el mantenimiento preventivo, correctivo y extraordinario: preparación, inspección, diagnóstico, repuestos, pruebas, criterios de aceptación, escalamiento, niveles de servicio y particularidades por modelo.",
       "temas": [
        "Ficha de Control del Documento",
        "Control de Cambios",
        "Objetivo",
        "Objetivos específicos",
        "Alcance",
        "Principios del servicio",
        "Roles y responsabilidades",
        "Clasificación del mantenimiento",
        "Preventivo",
        "Correctivo",
        "Extraordinario",
        "Flujo general del procedimiento",
        "Inspección inicial",
        "Procedimiento de mantenimiento preventivo",
        "Limpieza",
        "Inspección física",
        "Verificación eléctrica",
        "Verificación de comunicación",
        "Verificación biométrica",
        "Verificación funcional",
        "Procedimiento de mantenimiento correctivo",
        "Guía general de diagnóstico",
        "Gestión de repuestos",
        "Configuración, firmware y software",
        "Seguridad y protección de la información",
        "Pruebas posteriores a la intervención",
        "Criterios de aceptación",
        "Informe técnico y cierre",
        "Escalamiento técnico",
        "Gestión de niveles de servicio",
        "Indicadores de desempeño",
        "Particularidades por modelo",
        "ZKTeco SpeedFace-V5L",
        "ZKTeco SpeedFace-V3L",
        "VIRDI UBio-X Face",
        "VIRDI AC-2100 Plus",
        "Checklist estándar de mantenimiento",
        "Información para presentación en RFP",
        "Información interna vs. información para clientes",
        "Registros y evidencias",
        "Fuentes técnicas de referencia",
        "Aprobación"
       ],
       "html": "documentos/2400-MAN-OPE.html",
       "revision": "Octubre 2027"
      },
      {
       "codigo": "2401-FOR-OPE",
       "titulo": "Orden de Servicio de Mantenimiento",
       "tipo": "FOR",
       "estado": "publicado",
       "version": "2.0",
       "fecha": "Enero 2025",
       "responsable": "Operaciones Técnicas (Soporte y Mantenimiento)",
       "relacionado": "2400-MAN-OPE",
       "resumen": "Una por visita: solicitud, planificación, equipos a intervenir (EQ01, EQ02…), alcance, condiciones previas y autorizaciones.",
       "temas": [
        "Control de cambios",
        "Identificación del servicio",
        "Equipos a intervenir",
        "Motivo y alcance de la intervención",
        "Preparación y condiciones previas",
        "Autorizaciones y consideraciones especiales",
        "Observaciones iniciales",
        "Relación con los registros de la intervención",
        "Observaciones / restricciones de servicio",
        "Control y autorización"
       ],
       "html": "documentos/2401-FOR-OPE.html",
       "plantillaDefinitiva": true,
       "plantilla": "plantillas/2401-FOR-OPE_Orden_de_Servicio_de_Mantenimiento.docx",
       "generador": {
        "detalle": null
       }
      },
      {
       "codigo": "2402-FOR-OPE",
       "titulo": "Checklist de Mantenimiento de Equipos Biométricos",
       "tipo": "FOR",
       "estado": "publicado",
       "version": "2.0",
       "fecha": "Febrero 2025",
       "responsable": "Operaciones Técnicas (Soporte y Mantenimiento)",
       "relacionado": "2400-MAN-OPE",
       "resumen": "Uno por equipo: 20 puntos de control, hallazgos, pruebas finales y resultado del equipo.",
       "temas": [
        "Control de cambios",
        "Identificación del servicio",
        "Criterio de diligenciamiento",
        "Lista de verificación",
        "Hallazgos y observaciones",
        "Pruebas finales y resultado",
        "Evidencia y cierre del checklist",
        "Responsables"
       ],
       "html": "documentos/2402-FOR-OPE.html",
       "plantillaDefinitiva": true,
       "plantilla": "plantillas/2402-FOR-OPE_Checklist_de_Mantenimiento.docx",
       "generador": {
        "detalle": "equipo"
       }
      },
      {
       "codigo": "2403-FOR-OPE",
       "titulo": "Informe Técnico de Mantenimiento",
       "tipo": "FOR",
       "estado": "publicado",
       "version": "2.0",
       "fecha": "Febrero 2025",
       "responsable": "Operaciones Técnicas (Soporte y Mantenimiento)",
       "relacionado": "2400-MAN-OPE",
       "resumen": "Por equipo en correctivos, extraordinarios y preventivos con hallazgos: diagnóstico, actividades, repuestos y garantía, firmware, estado final y recomendaciones.",
       "temas": [
        "Ficha de Control del Documento",
        "Control de Cambios",
        "Identificación del servicio y del equipo",
        "Motivo de la intervención",
        "Diagnóstico técnico",
        "Actividades realizadas",
        "Repuestos y componentes utilizados",
        "Control de repuestos y garantía",
        "Configuración, firmware o software",
        "Estado final del equipo",
        "Recomendaciones",
        "Evidencias y documentos relacionados",
        "Cierre"
       ],
       "html": "documentos/2403-FOR-OPE.html",
       "plantillaDefinitiva": true,
       "plantilla": "plantillas/2403-FOR-OPE_Informe_Tecnico_de_Mantenimiento.docx",
       "generador": {
        "detalle": "equipo",
        "opcional": true,
        "nota": "Uno por equipo, solo si hay hallazgos o es correctivo"
       }
      },
      {
       "codigo": "2404-GUI-OPE",
       "titulo": "Guía de Diagnóstico de Equipos Biométricos",
       "tipo": "GUI",
       "estado": "publicado",
       "version": "2.0",
       "fecha": "Febrero 2025",
       "responsable": "Operaciones Técnicas (Soporte y Mantenimiento)",
       "relacionado": "2400-MAN-OPE",
       "resumen": "Secuencia de diagnóstico, matriz por síntoma con la secuencia sugerida, criterios para resolver en sitio o escalar y controles de firmware y configuración.",
       "temas": [
        "Alcance y principios de diagnóstico",
        "Secuencia general de diagnóstico",
        "Matriz de diagnóstico por síntoma",
        "Criterios para solución o escalamiento",
        "Firmware, software y configuración",
        "Registro del diagnóstico",
        "Control de cambios"
       ],
       "html": "documentos/2404-GUI-OPE.html"
      },
      {
       "codigo": "2405-FIC-OPE",
       "titulo": "Ficha Técnica de Equipo Biométrico",
       "tipo": "FIC",
       "estado": "publicado",
       "version": "1.0",
       "fecha": "Febrero 2025",
       "responsable": "Operaciones Técnicas (Soporte y Mantenimiento)",
       "relacionado": "2400-MAN-OPE",
       "resumen": "Plantilla para documentar las particularidades técnicas de cada modelo: funciones, alimentación e interfaces, entorno, puntos de inspección, pruebas, firmware, repuestos y fallas frecuentes.",
       "temas": [
        "Control de cambios",
        "Identificación del equipo",
        "Funciones y capacidades",
        "Alimentación, conexiones e interfaces",
        "Condiciones de instalación y entorno",
        "Puntos críticos de inspección y mantenimiento",
        "Pruebas funcionales y criterios de aceptación",
        "Firmware, software y configuración",
        "Repuestos y componentes compatibles",
        "Fallas o síntomas frecuentes",
        "Precauciones y restricciones",
        "Fuentes y control de la ficha"
       ],
       "html": "documentos/2405-FIC-OPE.html",
       "plantilla": "plantillas/2405-FIC-OPE_Ficha_Tecnica_de_Equipo_Biometrico.docx",
       "plantillaDefinitiva": true
      },
      {
       "codigo": "2406-INS-OPE",
       "titulo": "Instructivo de Mantenimiento Preventivo",
       "tipo": "INS",
       "estado": "publicado",
       "version": "2.0",
       "fecha": "Febrero 2025",
       "responsable": "Operaciones Técnicas (Soporte y Mantenimiento)",
       "relacionado": "2400-MAN-OPE",
       "resumen": "Secuencia del preventivo paso a paso: preparar, inspeccionar, limpiar, verificar, probar y cerrar, con el registro que corresponde a cada paso.",
       "temas": [
        "Control de cambios",
        "Responsabilidades",
        "Requisitos previos",
        "Secuencia del mantenimiento preventivo",
        "Ejecución paso a paso",
        "Criterios de no conformidad y escalamiento",
        "Cierre documental",
        "Documentos y registros relacionados"
       ],
       "html": "documentos/2406-INS-OPE.html"
      },
      {
       "codigo": "2408-FOR-OPE",
       "titulo": "Acta de Entrega y Aceptación del Servicio de Mantenimiento",
       "tipo": "FOR",
       "estado": "publicado",
       "version": "2.0",
       "fecha": "Febrero 2025",
       "responsable": "Operaciones Técnicas (Soporte y Mantenimiento)",
       "relacionado": "2400-MAN-OPE",
       "resumen": "Una por visita: equipos entregados y su estado final, pendientes, documentos relacionados y aceptación del cliente.",
       "temas": [
        "Control de cambios",
        "Identificación del servicio",
        "Resumen de la intervención",
        "Equipos entregados",
        "Resultado de la entrega",
        "Documentos y evidencias entregados / relacionados",
        "Observaciones del cliente",
        "Aceptación"
       ],
       "html": "documentos/2408-FOR-OPE.html",
       "plantillaDefinitiva": true,
       "plantilla": "plantillas/2408-FOR-OPE_Acta_de_Entrega_y_Aceptacion_Mantenimiento.docx",
       "generador": {
        "detalle": null
       }
      },
      {
       "codigo": "2410-DIA-OPE",
       "titulo": "Diagrama de Gestión de Mantenimiento de Equipos Biométricos",
       "tipo": "DIA",
       "estado": "publicado",
       "version": "1.0",
       "fecha": "Enero 2025",
       "responsable": "Operaciones Técnicas (Soporte y Mantenimiento)",
       "relacionado": "2400-MAN-OPE",
       "resumen": "Flujo del procedimiento de mantenimiento desde la solicitud hasta la entrega y cierre, con criterios de resultado y motivos de escalamiento.",
       "temas": [
        "Resultado de la prueba final",
        "Motivos de escalamiento técnico",
        "Diagrama de flujo",
        "Registros y evidencia del servicio"
       ],
       "html": "documentos/2410-DIA-OPE.html"
      }
     ],
     "serie": "2400",
     "actividad": "MTTO",
     "carpeta": "06_MANTENIMIENTO",
     "retirados": [
      {
       "codigo": "2407-FOR-OPE",
       "titulo": "Registro de Repuestos y Componentes Utilizados",
       "integradoEn": "2403-FOR-OPE"
      },
      {
       "codigo": "2409-FOR-OPE",
       "titulo": "Formato Integral de Mantenimiento (Excel)",
       "integradoEn": "mantenimiento.html (formulario móvil que diligencia 2401, 2402, 2403 y 2408)"
      }
     ],
     "formularioMovil": "mantenimiento.html"
    },
    {
     "id": "operaciones",
     "nombre": "Operaciones y Procesos",
     "descripcion": "Procedimientos transversales de la operación.",
     "docs": []
    }
   ],
   "serie": "2000 · Operaciones Técnicas",
   "herramientas": [
    {
     "titulo": "Ruta del técnico en una instalación",
     "resumen": "Flujograma del proceso: qué consultar, qué documento generar, qué diligenciar en sitio y cómo archivarlo.",
     "pagina": "ruta-tecnico.html",
     "icono": "ruta"
    },
    {
     "titulo": "Estructura de carpetas del servidor",
     "resumen": "Las seis carpetas raíz de IC, su contenido y cómo se nombran clientes, actividades y archivos.",
     "pagina": "estructura-carpetas.html",
     "icono": "carpeta"
    },
    {
     "titulo": "Diligenciar mantenimiento",
     "resumen": "Desde el celular: checklist, pruebas e informe por equipo y acta; entrega los Word 2401, 2402, 2403 y 2408 diligenciados.",
     "pagina": "mantenimiento.html",
     "icono": "movil"
    },
    {
     "titulo": "Generar documentos de trabajo",
     "resumen": "Plantillas prediligenciadas de instalación (2100) y mantenimiento (2400), con nombre definido y organizadas en la estructura del servidor.",
     "pagina": "generador.html",
     "icono": "generar"
    },
    {
     "titulo": "Evaluación de conocimientos",
     "resumen": "10 preguntas de instalación, mantenimiento y seguridad de la información. Se aprueba con 80 %.",
     "pagina": "evaluacion.html",
     "icono": "evaluar"
    }
   ],
   "bloque": "2000"
  },
  {
   "id": "financiera",
   "nombre": "Gestión Financiera",
   "icono": "financiera",
   "descripcion": "Procesos financieros, contables y de control.",
   "grupos": [
    {
     "id": "financiera",
     "nombre": "Gestión Financiera",
     "docs": []
    }
   ],
   "bloque": "7000"
  },
  {
   "id": "inventario",
   "nombre": "Gestión de Inventario",
   "icono": "inventario",
   "descripcion": "Control de equipos, repuestos y accesorios.",
   "grupos": [
    {
     "id": "inventario",
     "nombre": "Gestión de Inventario",
     "docs": []
    }
   ],
   "bloque": "5000"
  },
  {
   "id": "talento",
   "nombre": "Gestión del Talento Humano",
   "icono": "talento",
   "descripcion": "Selección, vinculación, formación y bienestar del equipo.",
   "grupos": [
    {
     "id": "talento",
     "nombre": "Gestión del Talento Humano",
     "docs": []
    }
   ],
   "bloque": "6000"
  },
  {
   "id": "tecnologia",
   "nombre": "Gestión de la Información y Tecnología",
   "icono": "tecnologia",
   "descripcion": "Infraestructura, información y recursos tecnológicos.",
   "grupos": [
    {
     "id": "ti",
     "nombre": "Seguridad y Protección de la Información",
     "docs": [
      {
       "codigo": "4100-POL-TEC",
       "titulo": "Política de Seguridad y Protección de la Información",
       "tipo": "POL",
       "estado": "publicado",
       "version": "1.0",
       "fecha": "Septiembre 2026",
       "responsable": "Gerencia General",
       "resumen": "Reglas para proteger la información de Ideas Control: clasificación, copias de seguridad, antivirus, contraseñas, uso de equipos, correo y nube, información de clientes y aliados, y reporte de incidentes. Todo colaborador firma la constancia de lectura y aceptación (Anexo A).",
       "temas": [
        "Ficha de Control del Documento",
        "Control de Cambios",
        "Información General",
        "Objetivo",
        "Alcance",
        "Aplicación",
        "Responsables",
        "Clasificación de la Información",
        "Copias de Seguridad (Backups)",
        "Reglas generales",
        "Frecuencia",
        "Verificación",
        "Protección contra Virus y Software Malicioso",
        "Importante para técnicos de campo",
        "Control de Acceso y Contraseñas",
        "Cuentas",
        "Contraseñas",
        "Ingreso y retiro de personal",
        "Uso de Equipos y Dispositivos",
        "Correo, Internet y Herramientas en la Nube",
        "Información de Clientes y Aliados",
        "Datos personales",
        "Reporte y Atención de Incidentes",
        "Regla clave",
        "Cumplimiento y Vigencia",
        "Incumplimiento",
        "Divulgación",
        "Archivos relacionados"
       ],
       "html": "documentos/4100-POL-TEC.html"
      }
     ],
     "serie": "4100",
     "descripcion": "Políticas y reglas para proteger la información, los equipos y las cuentas de Ideas Control."
    }
   ],
   "pagina": "gestion-tecnologia.html",
   "bloque": "4000"
  }
 ]
};
