const app = document.getElementById("app");

let equipos = [];
let currentTeamIndex = 0;
let perTeamPointer = []; // puntero por equipo -> cuál jugador tocará next
let rango = null;
let rangoVisible = true; // true = tapa visible (barra cubierta). false = destapada
let arrastrando = false;
let turnoConfirmado = false;

// Variables para control de fin de juego
let juegoTerminado = false;
let equipoQueSupero30 = null;       // referencia al objeto equipo que superó 30 primero
let equipoQueSupero30Index = null;  // índice del equipo que superó 30 primero
const PUNTOS_OBJETIVO = 30;

function iniciar() {
  // reset de estado de juego si se vuelve a la pantalla de configuración
  juegoTerminado = false;
  equipoQueSupero30 = null;
  equipoQueSupero30Index = null;
  perTeamPointer = [];

  equipos = []; // reiniciar lista de equipos al volver a configuración

  app.innerHTML = `
    <h2>La barra de Franco!</h2>
    <div id="equipos"></div>
    <button class="btn" onclick="agregarEquipo()">Agregar equipo</button>
    <button class="btn" onclick="comenzarJuego()">Comenzar</button>
  `;
  // crear un equipo por defecto
  agregarEquipo();
}

function agregarEquipo() {
  const cont = document.getElementById("equipos");
  const idx = equipos.length;

  equipos.push({ nombre: `Equipo ${idx + 1}`, jugadores: [], puntos: 0 });

  const div = document.createElement("div");
  div.id = `equipo-${idx}`;
  div.innerHTML = `
    <h3>Nombre del equipo</h3>
    <input 
      type="text" 
      id="equipo-nombre-${idx}" 
      placeholder="Nombre del equipo"
      value="Equipo ${idx + 1}"
      oninput="equipos[${idx}].nombre = this.value"
      class="team-name-input"
    />

    <h4>Jugadores</h4>
    <div id="jugadores-${idx}"></div>
    <button class="btn" onclick="agregarJugador(${idx})">Agregar jugador</button>
  `;

  cont.appendChild(div);

  // crear mínimo 2 jugadores por equipo
  agregarJugador(idx);
  agregarJugador(idx);
}

function agregarJugador(idx) {
  const equipo = equipos[idx];
  const jugadoresDiv = document.getElementById(`jugadores-${idx}`);
  const num = equipo.jugadores.length;

  equipo.jugadores.push("");

  const input = document.createElement("input");
  input.placeholder = `Jugador ${num + 1}`;
  input.onchange = function () {
    equipo.jugadores[num] = this.value;
  };

  jugadoresDiv.appendChild(input);
}

// ------------------------------------
//  Turnos: alternar por equipo, puntero por equipo
// ------------------------------------
function comenzarJuego() {
  if (juegoTerminado) return;

  // Validar que haya al menos 2 equipos y que cada equipo tenga mínimo 2 jugadores
  if (equipos.length < 1) {
  alert("Necesitás al menos 1 equipo para jugar.");
  return;
  }
  for (let i = 0; i < equipos.length; i++) {
    if (!equipos[i].jugadores || equipos[i].jugadores.length < 2) {
      alert(`El ${equipos[i].nombre} debe tener al menos 2 jugadores.`);
      return;
    }
  }

  // inicializar punteros por equipo y resetear puntos
  perTeamPointer = equipos.map(() => 0);
  equipos.forEach(e => e.puntos = e.puntos || 0);
  currentTeamIndex = 0;
  rango = null;
  rangoVisible = true;
  equipoQueSupero30 = null;
  equipoQueSupero30Index = null;
  juegoTerminado = false;
  turnoConfirmado = false;

  // generar el primer rango cubierto para el primer turno y mostrar
  generarRango(true); // true -> cubierta
  mostrarBarra();
}

// devuelve el turno actual como { equipo, jugador, equipoIndex, jugadorIndex }
function obtenerTurnoActual() {
  const equipo = equipos[currentTeamIndex];
  const jugadorIndex = perTeamPointer[currentTeamIndex] % equipo.jugadores.length;
  const jugador = equipo.jugadores[jugadorIndex] || `Jugador ${jugadorIndex + 1}`;
  return { equipo, jugador, equipoIndex: currentTeamIndex, jugadorIndex };
}

// avanza el turno: mueve el puntero del equipo actual y salta al siguiente equipo
function avanzarTurno() {
  perTeamPointer[currentTeamIndex] = (perTeamPointer[currentTeamIndex] + 1) % equipos[currentTeamIndex].jugadores.length;
  currentTeamIndex = (currentTeamIndex + 1) % equipos.length;
}

/**
 * Genera un nuevo rango aleatorio.
 * @param {boolean} cubierta - si true la barra queda tapada (cover visible). Si false, queda destapada.
 * NOTA: no hace render por sí sola; los llamantes deben invocar mostrarBarra() si quieren re-render.
 */
function generarRango(cubierta = true) {
  if (juegoTerminado) return;

  const centro = Math.random() * 80 + 10;
  const inicio = centro - 5;
  rango = [
    { val: 1, start: inicio },
    { val: 3, start: inicio + 2 },
    { val: 5, start: inicio + 4 },
    { val: 3, start: inicio + 6 },
    { val: 1, start: inicio + 8 }
  ];
  rangoVisible = cubierta;
}

// toggle de tapa (desde botón)
function toggleTapa() {
  if (juegoTerminado) return;
  rangoVisible = !rangoVisible;
  // actualizar visual (mostrarBarra actualizará cover según rangoVisible)
  mostrarBarra();
}

/**
 * Al presionar "Confirmar posición":
 * - calcula puntos según la flecha
 * - suma al equipo
 * - destapa la barra (rangoVisible = false)
 * - muestra en la MISMA pantalla cuántos puntos sumó y quién será el próximo turno
 * - muestra botón "Siguiente turno"
 *
 * IMPORTANT: NO vuelve a llamar a mostrarBarra() al final para evitar re-render y doble clicks.
 */
function registrarPuntaje() {
  if (turnoConfirmado || juegoTerminado) return; // evita sumar puntos más de una vez o si ya terminó

  const flecha = document.getElementById("arrow");
  if (!flecha) return; // seguridad

  turnoConfirmado = true;

  let x = parseFloat(flecha.dataset.pos) || 0;
  let puntos = 0;

  if (rango) {
    rango.forEach(seg => {
      if (x >= seg.start && x <= seg.start + 2) puntos = seg.val;
    });
  }

  const turno = obtenerTurnoActual();
  turno.equipo.puntos = (turno.equipo.puntos || 0) + puntos;

  // Si es la primera vez que alguien pasa el objetivo
  if (turno.equipo.puntos >= PUNTOS_OBJETIVO && equipoQueSupero30Index === null) {
    equipoQueSupero30 = turno.equipo;
    equipoQueSupero30Index = turno.equipoIndex;
  }

  // destapar la barra: rangoVisible = false -> add 'hidden' class to cover
  rangoVisible = false;
  const cover = document.getElementById("cover");
  if (cover) cover.classList.add("hidden");

  // desactivar botón confirmar
  const btnConfirm = document.getElementById("btn-confirmar");
  if (btnConfirm) btnConfirm.disabled = true;

  const btnGenerar = document.querySelector('button[onclick="generarRango(true); mostrarBarra()"]');
  if (btnGenerar) btnGenerar.disabled = true;

  const btnTapa = document.querySelector('button[onclick="toggleTapa()"]');
  if (btnTapa) btnTapa.disabled = true;

  // actualizar el panel de scores en la UI
  actualizarScoreList();

  // calcular próximo jugador para mostrar en la misma pantalla
  const nextTeamIndex = (currentTeamIndex + 1) % equipos.length;
  const nextPlayerIndex = perTeamPointer[nextTeamIndex] % equipos[nextTeamIndex].jugadores.length;
  const nextPlayerName = equipos[nextTeamIndex].jugadores[nextPlayerIndex];

  // mostrar resultado en el mismo contenedor reservado
  const resultadoDiv = document.getElementById("resultado-turno");
  if (resultadoDiv) {
    resultadoDiv.style.display = "block";
    resultadoDiv.innerHTML = `
      <p><strong>¡Sumaste ${puntos} puntos!</strong></p>
      <div style="margin-top:8px;">Próximo turno: <strong>${nextPlayerName} (${equipos[nextTeamIndex].nombre})</strong></div>
      <div style="margin-top:10px;"><button class="btn" id="btn-siguiente-turno">Siguiente turno</button></div>
    `;

    // enlazar evento del botón (delegado aquí)
    const btnNext = document.getElementById("btn-siguiente-turno");
    if (btnNext) {
      btnNext.addEventListener("click", () => finalizarTurno());
    }
  }
}

/**
 * Verificar fin del juego:
 * - cuando el juego empezó a contar (alguien superó 30) y
 * - se completó la vuelta desde que se superó 30 (currentTeamIndex vuelve al equipo que superó 30)
 * - y además hay un líder único (no empate en el 1er puesto)
 * -> termina
 */
function verificarFinDelJuego() {
  // Si nadie pasó los 30, no puede terminar
  if (equipoQueSupero30Index === null) return;

  // Si ya está marcado como terminado, no hacemos nada
  if (juegoTerminado) return;

  // Cuando el currentTeamIndex vuelva a ser el índice del equipo que superó 30
  if (currentTeamIndex === equipoQueSupero30Index) {
    // Ver si hay un ganador único
    const maxPuntos = Math.max(...equipos.map(e => e.puntos));
    const equiposLideres = equipos.filter(e => e.puntos === maxPuntos);

    // ❌ Si hay empate en el primer puesto → NO termina, se sigue jugando
    if (equiposLideres.length !== 1) {
      // resetear marca de quien superó 30 para que la próxima vez que alguien supere 30 se vuelva a empezar la cuenta
      equipoQueSupero30Index = null;
      equipoQueSupero30 = null;
      return;
    }

    // ✔ Hay un líder único → Termina el juego
    juegoTerminado = true;

    const clasificacion = [...equipos].sort((a, b) => b.puntos - a.puntos);
    const ganador = clasificacion[0];

    mostrarPantallaFinal(ganador, clasificacion);
  }
}

function mostrarPantallaFinal(ganador, clasificacion) {

  // Detectar si hay un jugador llamado "Franco" (sin importar mayúsculas)
  const tieneFranco = ganador.jugadores.some(
    j => j.trim().toLowerCase() === "franco"
  );

  // Mensaje si Franco está en el equipo ganador
  const mensajeFranco = tieneFranco
    ? `<p style="margin-top:15px; padding:10px; background:#e8ffe8; border-radius:6px;">
         🌟 <strong>¡Victoria!</strong> Para sorpresa de nadie, Franco ganó!
       </p>`
    : `<p style="margin-top:15px; padding:10px; background:#ffe8e8; border-radius:6px;">
         🤔 <strong>Interesante...</strong> Franco no ganó? Seguro le robaron...
       </p>`;

  app.innerHTML = `
    <h2>¡Juego Terminado!</h2>
    <h3>Equipo ganador: <strong>${ganador.nombre}</strong></h3>

    ${mensajeFranco}

    <h3>Clasificación final</h3>
    ${clasificacion
      .map((e, i) => `<p>${i + 1}. ${e.nombre} — ${e.puntos} puntos</p>`)
      .join("")}

    <button class="btn" onclick="location.reload()">Reiniciar juego</button>
  `;
}


function iniciarArrastre(event) {
  event.preventDefault();
  arrastrando = true;
}

document.addEventListener("mousemove", e => { if(arrastrando) arrastrarFlecha(e); });
document.addEventListener("touchmove", e => { if(arrastrando) arrastrarFlecha(e); });
document.addEventListener("mouseup", () => arrastrando = false);
document.addEventListener("touchend", () => arrastrando = false);

function arrastrarFlecha(event) {
  const barra = document.querySelector(".bar-container");
  if (!barra) return;
  const rect = barra.getBoundingClientRect();
  let x = (event.touches ? event.touches[0].clientX : event.clientX) - rect.left;
  x = Math.max(0, Math.min(x, rect.width)); // limitar dentro de la barra
  const porc = (x / rect.width) * 100;

  const flecha = document.getElementById("arrow");
  if (!flecha) return;
  flecha.style.left = `${porc}%`; // ajustar por ancho de la flecha
  flecha.dataset.pos = porc;
}

/**
 * Actualiza la lista de puntajes sin re-renderizar toda la pantalla
 */
function actualizarScoreList() {
  const scoreList = document.getElementById("score-list");
  if (!scoreList) return;
  scoreList.innerHTML = equipos.map(e => `<p>${e.nombre}: ${e.puntos || 0}</p>`).join("");
}

/**
 * Muestra la interfaz principal del turno (misma pantalla reutilizable)
 */
function mostrarBarra() {

  // Si el juego terminó, no mostramos la interfaz de turno (ya se mostró pantalla final)
  if (juegoTerminado) return;

  // Si todavía no se comenzó el juego mostramos la pantalla de configuración
  if (!perTeamPointer.length) {
    iniciar();
    return;
  }

  const turno = obtenerTurnoActual();
  // nota: si rango es null, el HTML no mostrará segmentos (se puede generar con el botón)
  app.innerHTML = `
    <h2>Turno de ${turno.jugador} (${turno.equipo.nombre})</h2>
    <button class="btn" onclick="generarRango(true); mostrarBarra()">Generar rango</button>

    <div class="bar-container">
      ${rango ? generarHTMLRango() : ""}
      <div id="cover" class="cover ${rangoVisible ? "" : "hidden"}"></div>
      <div id="arrow" class="arrow" data-pos="0"></div>
    </div>

    <div class="range-labels"><span>0</span><span>100</span></div>

    <div style="margin-top:10px;">
      <button class="btn" onclick="toggleTapa()">Tapar / Destapar</button>
      <button id="btn-confirmar" class="btn" onclick="registrarPuntaje()">Confirmar posición</button>
    </div>

    <div id="resultado-turno" style="display:none; margin-top:16px; padding:10px; border-radius:6px; background: #fffbe6;"></div>

    <h3>Puntaje</h3>
    <div id="score-list">
      ${equipos.map(e => `<p>${e.nombre}: ${e.puntos || 0}</p>`).join("")}
    </div>
  `;

  const flecha = document.getElementById("arrow");
  if (flecha) {
    flecha.addEventListener("mousedown", iniciarArrastre);
    flecha.addEventListener("touchstart", iniciarArrastre);
    // inicializar posición
    flecha.style.left = "0px";
    flecha.dataset.pos = 0;
  }

  // asegurar estado del botón confirmar
  const btnConfirm = document.getElementById("btn-confirmar");
  if (btnConfirm) btnConfirm.disabled = turnoConfirmado;
}

/**
 * Genera el HTML de los segmentos del rango (valores y posición)
 */
function generarHTMLRango() {
  const colores = ["#8ab6f9", "#5a8dee", "#1f5ad1", "#5a8dee", "#8ab6f9"];
  return rango.map((seg, i) => `
    <div class="segment" style="left:${seg.start}%; width:2%; background:${colores[i]}">
      ${seg.val}
    </div>`).join("");
}

/**
 * Finaliza el turno cuando se presiona "Siguiente turno":
 * - avanza punteros y equipo
 * - chequea fin de juego
 * - si no terminó, genera nuevo rango CUBIERTO y muestra la misma pantalla
 */
function finalizarTurno() {
  if (juegoTerminado) return;

  // avanzar turno
  avanzarTurno();

  // chequear si una vuelta completa terminó luego de superar 30
  verificarFinDelJuego();

  if (juegoTerminado) return;

  // preparar para el siguiente turno
  turnoConfirmado = false;

  // generar automáticamente un nuevo rango DESTAPADO
  generarRango(false);
  rangoVisible = false;

  setTimeout(() => {
  const btnTapa = document.querySelector('button[onclick="toggleTapa()"]');
  if (btnTapa) btnTapa.disabled = false;
}, 0);

setTimeout(() => {
  const btnGenerar = document.querySelector('button[onclick="generarRango(true); mostrarBarra()"]');
  if (btnGenerar) btnGenerar.disabled = false;
}, 0);

  mostrarBarra();
}


/**
 * Compatibilidad: si algún código aún llama a 'siguienteTurno()', delegamos
 */
function siguienteTurno() {
  avanzarTurno();
  turnoConfirmado = false;

  // generar nuevo rango DESEMBARCADO (destapado)
  generarRango(false);  
  rangoVisible = false;  // asegurar tapa oculta

  // 🛠 Forzar que la tapa esté oculta antes del render
  const cover = document.getElementById("cover");
  if (cover) cover.classList.add("hidden");

  mostrarBarra();
}



iniciar();
