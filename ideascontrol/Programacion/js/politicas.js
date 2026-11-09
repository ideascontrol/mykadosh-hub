/* =====================================================================
   APP-106 · Programación — Políticas de programación y ayuda
   Texto tomado de la hoja «Instrucciones» del Excel 2506-MAN-OPE.
   ===================================================================== */
(function () {
  const POLITICAS = [
    'Hay un solo sitio para las entradas: el módulo Actividades de esta app (antes, la hoja Entradas del Excel).',
    'Días preferentes: instalaciones lunes, miércoles y viernes; mantenimientos martes y jueves. Otro día hábil es posible, pero genera un aviso.',
    'Un técnico puede instalar máximo 3 equipos biométricos por día y mantener máximo 4, según la distancia entre los sitios.',
    'Instalaciones y mantenimientos pueden combinarse el mismo día; la carga del día (instalaciones/3 + mantenimientos/4) nunca debe pasar del 100 %.',
    'Todos los días hábiles debe haber un técnico programado en la oficina (rotación diaria).',
    'Solo los técnicos de Ideas Control rotan en la oficina. El técnico de turno es el responsable de la oficina y de la bitácora.',
    'Todo técnico de Ideas Control que no tenga asignación ese día debe estar en la oficina, apoyando al técnico de turno.',
    'El técnico de turno cumple las funciones del rol según su perfil de habilidades; lo que no le corresponda queda en la bitácora para el siguiente turno.',
    'El turno de oficina es la única asignación del técnico ese día. Fuera de instalaciones y mantenimientos, un técnico de Ideas Control tiene una sola asignación por día, salvo que otro técnico de Ideas Control esté sin asignar ese día y pueda cubrir (oficina o trabajo): en ese caso la app solo muestra un aviso.',
    'Cada técnico solo se programa en los tipos de actividad habilitados para él en la matriz de habilidades (Administración › Técnicos).',
    'Andrés Bernal hace implementaciones de las apps, soporte virtual de software y desarrollos. No hace instalaciones, mantenimientos ni soporte presencial.',
    'Las implementaciones de las apps las hace Andrés Bernal.',
    'David Loaiza, Juan Pablo Morales y Leonardo Ramírez hacen soporte virtual y presencial, de software y hardware, instalaciones y mantenimientos.',
    'Los técnicos de campo hacen trabajos fuera de Bogotá y se les asignan responsabilidades bajo demanda.',
    'Los casos CRÍTICOS presenciales se atienden con el técnico de turno en la oficina.',
    'El técnico de oficina atiende casos remotos, incluso los asignados a otro técnico, y cumple las demás funciones del manual 2506-MAN-OPE.',
    'Los horarios especiales acordados se respetan: en esas franjas la oficina queda sin técnico y no hay reemplazos por segmentos.',
    'No se programan actividades en festivos ni fines de semana, salvo autorización del Director de Operaciones (casilla «Autorizado» en la actividad).',
    'El inventario no es tarea del técnico de turno: se programa como tipo Inventario, con más de 1 técnico de Ideas Control el mismo día.',
    'Las ausencias (vacaciones, incapacidad, permiso) se registran como tipo Ausencia para que el técnico no quede programado.',
    'La programación de la semana siguiente se publica cada viernes (módulo Programación semanal).'
  ];
  const USO = [
    ['Registrar', 'En Actividades (o con el botón + de un día en la Agenda) cree cada actividad: fecha, técnico, tipo, cliente, ciudad y, en instalaciones y mantenimientos, la cantidad de equipos.'],
    ['Oficina', 'Solo se registra el técnico de turno con el tipo Oficina. Los técnicos sin asignación no se registran: la app los muestra en Rotación de oficina. Un turno de Oficina guardado sin técnico significa que ese día la oficina queda sin técnico a propósito: no se marca como conflicto ni se rellena automáticamente. «Completar rotación del mes» propone los turnos que faltan.'],
    ['Validación', 'La app valida mientras escribe: ⚠ es un conflicto que debe corregirse (habilidad, carga del día, combinación no permitida, festivo…); ℹ es un aviso para revisar (día no preferente, visitas en ciudades distintas).'],
    ['Agenda', 'Elija mes, tipo y técnico para ver la sábana-calendario. Los días hábiles en rojo no tienen técnico de oficina.'],
    ['Mover', 'Para mover una actividad use «Reprogramar»: la original queda como Reprogramado y se crea una nueva con la nueva fecha. Así queda la trazabilidad.'],
    ['Técnicos', 'Si a un técnico se le registra el correo en Administración › Técnicos, entra con su cuenta de Microsoft, ve su agenda y marca como ejecutadas sus actividades.'],
    ['Catálogos', 'Técnicos, vinculación, matriz de habilidades, tipos, días preferentes y capacidad se administran en Administración. Los festivos son los de SYS_Festivos (compartidos con la app Comercial).']
  ];
  App.vistas.politicas = function (c) {
    const esc = IC.ui.esc;
    c.innerHTML = '<a class="ic-volver" href="#">← Menú principal</a><h1 class="ic-titulo">Políticas y ayuda</h1>' +
      '<p class="ic-subtitulo">Se apoya en el manual ' + esc(CFG.manual) + ' (Técnico de Oficina con Rotación Diaria).</p>' +
      '<div class="ope-dos"><div class="ic-bloque"><div class="cab"><h2>Políticas de programación</h2></div><div class="cuerpo"><ol class="ope-ol">' +
      POLITICAS.map((p) => '<li>' + esc(p) + '</li>').join('') + '</ol></div></div>' +
      '<div class="ic-bloque"><div class="cab"><h2>Cómo usar la app</h2></div><div class="cuerpo">' +
      USO.map((u) => '<p><b>' + esc(u[0]) + '.</b> ' + esc(u[1]) + '</p>').join('') +
      '<p><b>Colores.</b> Fila rosada = actividad con conflicto ⚠ · día rojo en la agenda = día hábil sin técnico de oficina · ' + App.chipTipo('INS') + ' cada tipo tiene su color.</p></div></div></div>';
  };
})();
