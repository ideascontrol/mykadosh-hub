/* Banco de preguntas de la evaluación (generado del Word del banco de 30 preguntas). */
window.GD_EVAL = {
 "temas": {
  "INS": "Instalación de equipos biométricos",
  "MTTO": "Mantenimiento de equipos biométricos",
  "SEG": "Seguridad y protección de la información"
 },
 "preguntas": [
  {
   "t": "INS",
   "q": "Antes de enrolar a un colaborador en el equipo biométrico, ¿qué debe estar garantizado?",
   "o": [
    "Que el técnico guarde en su portátil una copia de las plantillas biométricas como respaldo del proyecto.",
    "Que el cliente tenga la autorización individual firmada del colaborador, por ser un dato sensible.",
    "Que el jefe de Recursos Humanos autorice verbalmente el registro de todo el personal de la sede.",
    "Nada adicional: el enrolamiento es una actividad técnica que no involucra datos personales."
   ],
   "ok": 1,
   "j": "El dato biométrico es un dato personal sensible (Ley 1581 de 2012). Sin autorización individual firmada no se enrola a nadie, y el técnico no extrae ni copia bases biométricas."
  },
  {
   "t": "INS",
   "q": "¿Cuál es la altura de montaje recomendada para el terminal biométrico?",
   "o": [
    "Entre 1,00 y 1,20 m desde el piso, para que lo alcance cualquier persona sin esfuerzo.",
    "Entre 1,70 y 1,85 m desde el piso, para protegerlo de golpes y manipulación.",
    "Entre 1,40 y 1,55 m desde el piso, ajustable según la estatura promedio del personal.",
    "Cualquier altura que defina el cliente, siempre que la pantalla quede visible desde la entrada."
   ],
   "ok": 2,
   "j": "La altura recomendada es 1,40–1,55 m, con el equipo perpendicular a la pared y sin inclinación."
  },
  {
   "t": "INS",
   "q": "¿Por qué la configuración de fecha y hora del equipo es un paso crítico?",
   "o": [
    "Porque de ella dependen las marcaciones y el cálculo de recargos, horas extra y turnos en el software.",
    "Porque sin una fecha y hora configuradas el equipo no termina la secuencia de arranque.",
    "Porque el servidor DHCP del cliente no asigna dirección IP a equipos con la hora desfasada.",
    "No es crítica: el software de tiempos corrige automáticamente la hora de todas las marcaciones."
   ],
   "ok": 0,
   "j": "Una hora mal configurada altera todas las marcaciones y, con ellas, la liquidación de recargos, horas extra y turnos."
  },
  {
   "t": "INS",
   "q": "Al elegir el punto de instalación, ¿qué condición de iluminación se debe evitar?",
   "o": [
    "Que el área de marcación dependa de iluminación artificial durante toda la jornada.",
    "Que el equipo quede ubicado en un pasillo con buena iluminación general.",
    "Que exista cualquier ventana en el recinto, aunque no apunte hacia el equipo.",
    "Que la luz solar directa o una luminaria enfocada incidan sobre el sensor."
   ],
   "ok": 3,
   "j": "La luz directa sobre el sensor afecta la lectura facial, de huella o de palma; si es inevitable, se reubica el ángulo o se instala un parasol."
  },
  {
   "t": "INS",
   "q": "¿Cómo se debe canalizar el cableado de datos frente a los conductores de potencia?",
   "o": [
    "Por la misma canaleta, para ahorrar material y facilitar la identificación de las rutas.",
    "Por infraestructura independiente, para evitar interferencias y riesgos.",
    "Con el sobrante enrollado detrás del equipo, para que el cableado no quede a la vista.",
    "Es indiferente: si el cable de datos es categoría 6 no sufre interferencias de la red eléctrica."
   ],
   "ok": 1,
   "j": "Datos y potencia van por rutas separadas; además se deja holgura en los extremos para mantenimiento."
  },
  {
   "t": "INS",
   "q": "Respecto a las credenciales de administrador de fábrica del equipo, ¿qué es lo correcto?",
   "o": [
    "Conservarlas sin cambios para que soporte técnico pueda ingresar en futuras visitas.",
    "Anotarlas en el acta de entrega para que el cliente las tenga disponibles.",
    "Reemplazarlas siempre antes de cerrar la visita, sin excepción.",
    "Cambiarlas únicamente si el cliente lo solicita por escrito durante la entrega."
   ],
   "ok": 2,
   "j": "Dejar la contraseña de fábrica es uno de los mayores riesgos de seguridad en instalaciones biométricas. Se crean al menos tres administradores con acceso biométrico."
  },
  {
   "t": "INS",
   "q": "¿Qué se hace con los usuarios creados únicamente para las pruebas de instalación?",
   "o": [
    "Se eliminan al terminar, salvo que el cliente pida conservarlos.",
    "Se dejan activos en el equipo para que soporte técnico pueda hacer pruebas en futuras visitas.",
    "Se exportan al portátil del técnico como evidencia de las pruebas realizadas en la instalación.",
    "Se desactivan en el equipo, pero se conservan sus registros biométricos por trazabilidad."
   ],
   "ok": 0,
   "j": "Los usuarios temporales se eliminan para no conservar registros ni información innecesaria."
  },
  {
   "t": "INS",
   "q": "¿Qué confirma la prueba de transmisión de marcaciones?",
   "o": [
    "Que el equipo completa su arranque y muestra la pantalla de inicio sin mensajes de error.",
    "Que el cable de red está bien ponchado y los indicadores del puerto muestran actividad de enlace.",
    "Que el usuario de prueba quedó enrolado y el equipo lo reconoce al primer intento.",
    "Que la marcación llega a la plataforma con el empleado, la fecha, la hora y el equipo correctos."
   ],
   "ok": 3,
   "j": "Se hace al menos una marcación de prueba y se sigue su recorrido completo hasta la plataforma."
  },
  {
   "t": "INS",
   "q": "El equipo responde a ping desde un computador de la red del cliente. ¿Qué demuestra esa prueba?",
   "o": [
    "Que la integración con el software de tiempos quedó completa y lista para la entrega.",
    "Que hay comunicación de red con la IP asignada al equipo.",
    "Que las marcaciones se están transmitiendo correctamente a la plataforma del cliente.",
    "Que la hora del equipo quedó sincronizada con el servidor de tiempo de la red."
   ],
   "ok": 1,
   "j": "El ping solo valida conectividad de red; la integración y la transmisión de marcaciones se prueban por separado."
  },
  {
   "t": "INS",
   "q": "¿Qué información NO debe registrarse en los checklists de instalación?",
   "o": [
    "El resultado exitoso o fallido de cada una de las pruebas realizadas en el equipo.",
    "Las observaciones del técnico sobre pendientes o condiciones encontradas en el sitio.",
    "Contraseñas, PIN, plantillas biométricas o fotos que no se necesiten como evidencia.",
    "La fecha de la instalación, la sede y el nombre del técnico responsable."
   ],
   "ok": 2,
   "j": "Los registros demuestran el resultado de la prueba sin exponer información sensible."
  },
  {
   "t": "MTTO",
   "q": "¿Qué diferencia un mantenimiento preventivo de uno correctivo?",
   "o": [
    "El preventivo lo paga el cliente según contrato y el correctivo siempre lo cubre la garantía del fabricante.",
    "El preventivo consiste solo en limpieza del equipo y el correctivo consiste solo en el cambio de repuestos.",
    "El preventivo es programado para reducir la probabilidad de falla; el correctivo atiende una falla ya presentada.",
    "No hay diferencia técnica: son dos nombres comerciales para la misma visita de servicio."
   ],
   "ok": 2,
   "j": "Así los define el manual de mantenimiento en su clasificación del mantenimiento."
  },
  {
   "t": "MTTO",
   "q": "¿Cuál de estas intervenciones es un mantenimiento extraordinario?",
   "o": [
    "La limpieza e inspección programadas cada semestre según el plan de mantenimiento.",
    "La reubicación o migración de un equipo, o una actualización mayor autorizada.",
    "La atención de un equipo que dejó de comunicar con la plataforma de tiempos.",
    "La revisión del cableado y los conectores durante una visita preventiva."
   ],
   "ok": 1,
   "j": "El extraordinario es no recurrente y modifica las condiciones del equipo o de su instalación (reubicaciones, reinstalaciones, migraciones, cambios estructurales)."
  },
  {
   "t": "MTTO",
   "q": "Según la regla de control, ¿cuándo NO se debe iniciar una intervención?",
   "o": [
    "Cuando el equipo no se identifica con certeza o el alcance no está claro.",
    "Cuando el responsable del cliente no está presente en el sitio al llegar el técnico.",
    "Cuando el equipo tiene más de un año de instalado y ya salió de garantía.",
    "Cuando la visita se programa en domingo o día festivo."
   ],
   "ok": 0,
   "j": "Sin identificación confiable del equipo y sin alcance claro no hay trazabilidad ni criterio de aceptación."
  },
  {
   "t": "MTTO",
   "q": "Antes de desmontar, limpiar a fondo, reconfigurar o reemplazar componentes, ¿qué debe hacer el técnico?",
   "o": [
    "Restablecer el equipo a valores de fábrica para partir de una configuración limpia.",
    "Actualizar el firmware a la última versión publicada por el fabricante.",
    "Solicitar al cliente un equipo de reemplazo mientras dura la intervención.",
    "Registrar la condición inicial del equipo."
   ],
   "ok": 3,
   "j": "La inspección inicial deja evidencia del estado en que se recibió el equipo: identificación, estado físico, biometría, conectividad, alimentación, entorno y síntoma."
  },
  {
   "t": "MTTO",
   "q": "¿Cuál es la forma correcta de limpiar la pantalla y los sensores?",
   "o": [
    "Rociar el limpiador directamente sobre la pantalla y secar con papel.",
    "Usar alcohol y una esponja abrasiva suave para retirar la suciedad difícil del sensor.",
    "Con materiales apropiados, sin aplicar líquidos directamente ni usar abrasivos.",
    "Con aire comprimido a máxima presión directamente sobre el sensor y la cámara."
   ],
   "ok": 2,
   "j": "La limpieza se hace según el fabricante, sin líquidos aplicados directamente y sin productos abrasivos o no autorizados."
  },
  {
   "t": "MTTO",
   "q": "Durante un mantenimiento se encuentra una versión nueva de firmware. ¿Qué se debe hacer?",
   "o": [
    "Actualizar siempre durante la visita, porque toda versión nueva corrige fallas conocidas.",
    "Verificar compatibilidad con el modelo, respaldar, obtener autorización y registrar las versiones.",
    "Actualizarla al final de la visita, cuando el cliente ya no esté usando el equipo.",
    "Instalarla y, si el equipo falla, restablecerlo a valores de fábrica."
   ],
   "ok": 1,
   "j": "Un firmware no compatible puede inutilizar el equipo o hacer perder configuración y datos."
  },
  {
   "t": "MTTO",
   "q": "¿Cuándo se puede restablecer un equipo a valores de fábrica?",
   "o": [
    "Solo con autorización y después de evaluar el impacto.",
    "Siempre que el equipo esté lento o tarde en reconocer a los usuarios.",
    "Al final de cada mantenimiento preventivo, para dejarlo como nuevo.",
    "Cuando el técnico no tiene a mano la contraseña o el acceso de administrador."
   ],
   "ok": 0,
   "j": "Un restablecimiento borra configuración y registros; por eso requiere autorización y evaluación de impacto."
  },
  {
   "t": "MTTO",
   "q": "Un equipo queda \"Operativo con observaciones\". ¿Qué significa?",
   "o": [
    "Que el equipo no funciona y debe reemplazarse en la próxima visita.",
    "Que funciona perfectamente y las observaciones son solo comentarios del cliente.",
    "Que el cliente no aceptó el servicio y quedó pendiente una nueva visita.",
    "Que funciona, pero hay una condición que debe documentarse y gestionarse."
   ],
   "ok": 3,
   "j": "Es uno de los tres criterios de aceptación: Operativo, Operativo con observaciones y No operativo."
  },
  {
   "t": "MTTO",
   "q": "¿Cuál de estas situaciones obliga a escalar el caso?",
   "o": [
    "El equipo necesita limpieza de la pantalla y del sensor de huella.",
    "El equipo está en garantía y la intervención física podría afectarla.",
    "El cliente pide revisar la fecha y la hora porque hay marcaciones desfasadas.",
    "El cable de red del equipo está desconectado del punto de datos."
   ],
   "ok": 1,
   "j": "Se escala cuando la intervención excede la competencia o autorización del técnico o pone en riesgo el equipo, la información, la garantía o la operación."
  },
  {
   "t": "MTTO",
   "q": "En un mantenimiento, ¿cuándo se debe elaborar el informe técnico de un equipo?",
   "o": [
    "Siempre, para todos los equipos de todas las visitas, sin importar el resultado del checklist.",
    "Solo cuando el cliente lo solicita por escrito al recibir el servicio.",
    "En correctivos y extraordinarios, y en preventivos con no conformidades.",
    "Solo cuando se cambia un repuesto, para registrar la referencia instalada."
   ],
   "ok": 2,
   "j": "El checklist es el registro de cada equipo; el informe documenta el diagnóstico, las actividades y los repuestos cuando hay hallazgos o la intervención no es preventiva."
  },
  {
   "t": "SEG",
   "q": "¿Qué establece la regla 3-2-1 de copias de seguridad?",
   "o": [
    "Tres copias, en dos medios distintos, una de ellas fuera de la oficina.",
    "Tres copias diarias, dos semanales y una mensual, guardadas en el mismo servidor.",
    "Tres responsables de TI, dos aprobadores de Gerencia y un custodio de las copias.",
    "Conservar la información 3 años: 2 en la nube y 1 en archivo físico."
   ],
   "ok": 0,
   "j": "Así una sola falla, robo o desastre no destruye todas las copias."
  },
  {
   "t": "SEG",
   "q": "Según la política, ¿cuándo se considera confiable una copia de seguridad?",
   "o": [
    "Cuando el programa de respaldo muestra el mensaje de copia finalizada con éxito.",
    "Cuando se guarda en un disco externo nuevo y de buena marca.",
    "Cuando la copia está protegida con contraseña o cifrado.",
    "Cuando se ha comprobado que se puede restaurar."
   ],
   "ok": 3,
   "j": "El responsable de TI hace una prueba de restauración cada tres meses y deja registro."
  },
  {
   "t": "SEG",
   "q": "Para una cuenta personal de correo con verificación en dos pasos, ¿cada cuánto se debe cambiar la contraseña?",
   "o": [
    "Cada 30 días, para reducir el tiempo de exposición si alguien la descubre.",
    "Cada 90 días sin excepción, como exigen las buenas prácticas actuales.",
    "Sin fecha fija: solo cuando exista un motivo para hacerlo.",
    "Nunca, porque la verificación en dos pasos ya la protege aunque alguien la conozca."
   ],
   "ok": 2,
   "j": "Los cambios periódicos forzados llevan a claves previsibles; protege más una contraseña larga y única con verificación en dos pasos."
  },
  {
   "t": "SEG",
   "q": "Un compañero le envió su contraseña por WhatsApp para que usted revisara algo. ¿Qué debe pasar?",
   "o": [
    "Nada, siempre que el chat sea privado y entre compañeros de la empresa.",
    "Se debe cambiar de inmediato la contraseña.",
    "Basta con borrar el mensaje del chat en ambos teléfonos.",
    "Se cambia en la próxima fecha de cambio programada para esa cuenta."
   ],
   "ok": 1,
   "j": "Las contraseñas no se comparten ni se envían por WhatsApp o correo; si ocurre, se cambian de inmediato."
  },
  {
   "t": "SEG",
   "q": "¿Cómo se clasifican una base de clientes y las cotizaciones?",
   "o": [
    "Pública: puede compartirse libremente con clientes y aliados.",
    "Interna: solo para colaboradores, pero puede enviarse por cualquier canal.",
    "Confidencial: acceso restringido según el cargo.",
    "Libre, siempre que se trate de clientes que ya conocen a Ideas Control."
   ],
   "ok": 2,
   "j": "Contratos, bases de clientes, cotizaciones, nómina y credenciales son información confidencial."
  },
  {
   "t": "SEG",
   "q": "Llega un correo de un proveedor informando un cambio de cuenta bancaria para el próximo pago. ¿Qué se hace?",
   "o": [
    "Confirmarlo por un canal distinto al correo antes de pagar.",
    "Pagar a la cuenta nueva si el correo trae el logo y la firma habitual del proveedor.",
    "Responder ese mismo correo pidiendo que confirmen el cambio de cuenta.",
    "Reenviarlo a todos los compañeros y esperar a que alguien lo confirme."
   ],
   "ok": 0,
   "j": "Es una modalidad común de fraude; responder el mismo correo no sirve si la cuenta fue suplantada."
  },
  {
   "t": "SEG",
   "q": "¿Cómo se debe compartir un archivo confidencial en la nube?",
   "o": [
    "Con un enlace abierto a \"cualquiera que tenga el enlace\", enviado solo a quien lo necesita.",
    "Adjunto desde el correo personal, que tiene más capacidad de envío.",
    "En una memoria USB personal, previamente analizada con antivirus.",
    "Con enlace restringido a personas específicas."
   ],
   "ok": 3,
   "j": "Los archivos confidenciales nunca se comparten con enlaces abiertos ni por canales personales."
  },
  {
   "t": "SEG",
   "q": "Un técnico va a conectar su portátil a la red de un cliente para configurar los biométricos. ¿Qué debe garantizar?",
   "o": [
    "Que el portátil tenga el antivirus activo y al día.",
    "Que el portátil haya descargado el software del fabricante desde una red Wi-Fi pública.",
    "Que el firewall del portátil quede desactivado para facilitar la conexión con los equipos.",
    "Nada en particular, porque la red del cliente ya tiene su propia protección."
   ],
   "ok": 0,
   "j": "Un virus llevado a la red del cliente es un riesgo comercial y reputacional para Ideas Control."
  },
  {
   "t": "SEG",
   "q": "Ocurre un incidente (virus, pérdida de un equipo, envío de información a quien no corresponde). ¿Qué lo agrava?",
   "o": [
    "Reportarlo de inmediato al responsable de TI o a la Gerencia por teléfono o WhatsApp.",
    "Desconectar de la red el equipo afectado mientras se revisa.",
    "Ocultarlo o demorar el reporte.",
    "Cambiar las contraseñas de las cuentas que pudieron verse afectadas."
   ],
   "ok": 2,
   "j": "Regla clave de la política: reportar a tiempo. Lo que agrava un incidente es ocultarlo."
  },
  {
   "t": "SEG",
   "q": "Durante una instalación usted ve la lista de empleados y los registros de marcación del cliente. ¿Qué es correcto?",
   "o": [
    "Copiarla al portátil del técnico para agilizar futuros soportes al cliente.",
    "No copiarla ni extraerla, y usarla solo para el fin del servicio.",
    "Enviarla al correo personal para revisarla con calma después de la visita.",
    "Compartirla con el proveedor de software para que adelante la integración."
   ],
   "ok": 1,
   "j": "La información de clientes y aliados se protege: no se copia, no se extrae y no se usa para otro fin."
  }
 ]
};
