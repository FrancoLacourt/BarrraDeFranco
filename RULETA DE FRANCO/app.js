const app = document.getElementById("app");

let equipos = [];
let currentTeamIndex = 0;
let perTeamPointer = [];
let rango = null;
let rangoVisible = true;
let arrastrando = false;
let turnoConfirmado = false;

// Variables para control de fin de juego
let juegoTerminado = false;
let equipoQueSuperoLimite = null;
let equipoQueSuperoLimiteIndex = null;

// **** Variable dinámica seleccionada por el usuario ****
let puntajeObjetivoSeleccionado = 30;

// ===== CONFIGURACIÓN DEL SEGMENTO =====
let TOTAL_SEGMENTO = 20; // valor por defecto (modo normal)
let PARTES = 5;
let W = TOTAL_SEGMENTO / PARTES;

// ------------------------------
function iniciar() {
  juegoTerminado = false;
  equipoQueSuperoLimite = null;
  equipoQueSuperoLimiteIndex = null;
  perTeamPointer = [];
  equipos = [];

  app.innerHTML = `
    <h2>La barra de Franco!</h2>

    <h3>Dificultad</h3>
<select id="dificultad" style="padding:6px; font-size:16px;">
  <option value="Pussy">Pussy</option>
  <option value="Normal" selected>Normal</option>
  <option value="Valiente">Valiente</option>
</select>

    <h3>Puntuación para ganar</h3>
    <input 
      id="puntaje-objetivo"
      type="number"
      min="5"
      max="100"
      value="30"
      style="width:120px; padding:6px; font-size:16px;"
    />


    <div id="equipos"></div>
    <button class="btn" onclick="agregarEquipo()">Agregar equipo</button>
    <button class="btn" onclick="comenzarJuego()">Comenzar</button>
  `;

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

// ------------------------------
// COMENZAR JUEGO
// ------------------------------
function comenzarJuego() {
  if (juegoTerminado) return;

  // Leer puntaje objetivo elegido
  const inputGoal = document.getElementById("puntaje-objetivo");
  puntajeObjetivoSeleccionado = parseInt(inputGoal.value);
  if (isNaN(puntajeObjetivoSeleccionado) || puntajeObjetivoSeleccionado < 5) {
    alert("Ingresá una puntuación válida (mínimo 5).");
    return;
  }

  // Leer dificultad
const dificultadSelect = document.getElementById("dificultad").value;

if (dificultadSelect === "Pussy") {
  TOTAL_SEGMENTO = 35;
} else if (dificultadSelect === "Valiente") {
  TOTAL_SEGMENTO = 10;
} else {
  TOTAL_SEGMENTO = 20; // normal
}

PARTES = 5;
W = TOTAL_SEGMENTO / PARTES;

  // Validar equipos
  if (equipos.length < 1) {
    alert("Necesitás al menos 1 equipo para jugar.");
    return;
  }

  for (let i = 0; i < equipos.length; i++) {
    if (equipos[i].jugadores.length < 2) {
      alert(`El ${equipos[i].nombre} debe tener al menos 2 jugadores.`);
      return;
    }
  }

  perTeamPointer = equipos.map(() => 0);
  equipos.forEach(e => e.puntos = 0);

  currentTeamIndex = 0;
  rango = null;
  rangoVisible = true;

  equipoQueSuperoLimite = null;
  equipoQueSuperoLimiteIndex = null;

  turnoConfirmado = false;
  juegoTerminado = false;

  generarRango(true);
  mostrarBarra();
}

// ------------------------------
// TURNOS
// ------------------------------
function obtenerTurnoActual() {
  const equipo = equipos[currentTeamIndex];
  const jugadorIndex = perTeamPointer[currentTeamIndex] % equipo.jugadores.length;
  const jugador = equipo.jugadores[jugadorIndex] || `Jugador ${jugadorIndex + 1}`;
  return { equipo, jugador, equipoIndex: currentTeamIndex, jugadorIndex };
}

function avanzarTurno() {
  perTeamPointer[currentTeamIndex] =
    (perTeamPointer[currentTeamIndex] + 1) %
    equipos[currentTeamIndex].jugadores.length;

  currentTeamIndex = (currentTeamIndex + 1) % equipos.length;
}

// ------------------------------
// BARRA Y RANGO
// ------------------------------
function generarRango(cubierta = true) {
  if (juegoTerminado) return;

  const minCentro = TOTAL_SEGMENTO / 2;
  const maxCentro = 100 - TOTAL_SEGMENTO / 2;
  const centro = Math.random() * (maxCentro - minCentro) + minCentro;
  const inicio = centro - TOTAL_SEGMENTO / 2;

  rango = [
    { val: 1, start: inicio },
    { val: 3, start: inicio + W },
    { val: 5, start: inicio + W * 2 },
    { val: 3, start: inicio + W * 3 },
    { val: 1, start: inicio + W * 4 }
  ];

  rangoVisible = cubierta;
}

function toggleTapa() {
  if (juegoTerminado || turnoConfirmado) return;
  rangoVisible = !rangoVisible;
  mostrarBarra();
}

// ------------------------------
// PUNTAJE
// ------------------------------
function registrarPuntaje() {
  if (turnoConfirmado || juegoTerminado) return;

  turnoConfirmado = true;

  const flecha = document.getElementById("arrow");
  if (!flecha) return;

  let x = parseFloat(flecha.dataset.pos) || 0;
  let puntos = 0;

  rango.forEach(seg => {
    if (x >= seg.start && x <= seg.start + W) puntos = seg.val;
  });

  const turno = obtenerTurnoActual();
  turno.equipo.puntos += puntos;

  // Si supera el límite
  if (turno.equipo.puntos >= puntajeObjetivoSeleccionado &&
      equipoQueSuperoLimiteIndex === null) {
    equipoQueSuperoLimite = turno.equipo;
    equipoQueSuperoLimiteIndex = turno.equipoIndex;
  }

  rangoVisible = false;
  const cover = document.getElementById("cover");
  if (cover) cover.classList.add("hidden");

  const btnConfirm = document.getElementById("btn-confirmar");
  if (btnConfirm) btnConfirm.disabled = true;

  const btnGenerar = document.querySelector('button[onclick="generarRango(true); mostrarBarra()"]');
  if (btnGenerar) btnGenerar.disabled = true;

  const btnTapa = document.querySelector('button[onclick="toggleTapa()"]');
  if (btnTapa) btnTapa.disabled = true;

  actualizarScoreList();

  const nextTeam = (currentTeamIndex + 1) % equipos.length;
  const nextPlayerIndex = perTeamPointer[nextTeam] % equipos[nextTeam].jugadores.length;
  const nextPlayer = equipos[nextTeam].jugadores[nextPlayerIndex];

  const resultadoDiv = document.getElementById("resultado-turno");
  if (resultadoDiv) {
    resultadoDiv.style.display = "block";
    resultadoDiv.innerHTML = `
      <p><strong>¡Sumaste ${puntos} puntos!</strong></p>
      <div>Próximo turno: <strong>${nextPlayer} (${equipos[nextTeam].nombre})</strong></div>
      <button class="btn" id="btn-siguiente-turno">Siguiente turno</button>
    `;

    document.getElementById("btn-siguiente-turno")
      .addEventListener("click", finalizarTurno);
  }
}

// ------------------------------
// FIN DEL JUEGO
// ------------------------------
function verificarFinDelJuego() {
  if (equipoQueSuperoLimiteIndex === null) return;
  if (juegoTerminado) return;

  if (currentTeamIndex === equipoQueSuperoLimiteIndex) {
    const max = Math.max(...equipos.map(e => e.puntos));
    const lideres = equipos.filter(e => e.puntos === max);

    if (lideres.length !== 1) {
      equipoQueSuperoLimiteIndex = null;
      equipoQueSuperoLimite = null;
      return;
    }

    juegoTerminado = true;
    const clasificacion = [...equipos].sort((a, b) => b.puntos - a.puntos);
    mostrarPantallaFinal(clasificacion[0], clasificacion);
  }
}

function mostrarPantallaFinal(ganador, clasificacion) {
  const tieneFranco = ganador.jugadores.some(
    j => j.trim().toLowerCase() === "franco"
  );

  const mensajeFranco = tieneFranco
    ? `<p style="background:#e8ffe8; padding:10px;">🌟 ¡Victoria! Para sorpresa de nadie, Franco ganó!</p>`
    : `<p style="background:#ffe8e8; padding:10px;">🤔 Interesante... Franco no ganó? Seguro le robaron...</p>`;

  app.innerHTML = `
    <h2>¡Juego Terminado!</h2>
    <h3>Ganador: <strong>${ganador.nombre}</strong></h3>

    ${mensajeFranco}

    <h3>Clasificación final</h3>
    ${clasificacion.map((e, i) =>
      `<p>${i + 1}. ${e.nombre} — ${e.puntos} puntos</p>`).join("")}

    <button class="btn" onclick="location.reload()">Reiniciar juego</button>
  `;
}

// ------------------------------
// ARRASTRE DE FLECHA
// ------------------------------
function iniciarArrastre(event) {
  event.preventDefault();
  arrastrando = true;
}

document.addEventListener("mousemove", e => { if (arrastrando) arrastrarFlecha(e); });
document.addEventListener("touchmove", e => { if (arrastrando) arrastrarFlecha(e); });
document.addEventListener("mouseup", () => arrastrando = false);
document.addEventListener("touchend", () => arrastrando = false);

function arrastrarFlecha(event) {
  const barra = document.querySelector(".bar-container");
  if (!barra) return;

  const rect = barra.getBoundingClientRect();
  let x = (event.touches ? event.touches[0].clientX : event.clientX) - rect.left;

  x = Math.max(0, Math.min(x, rect.width));
  const porc = (x / rect.width) * 100;

  const flecha = document.getElementById("arrow");
  if (!flecha) return;

  flecha.style.left = `${porc}%`;
  flecha.dataset.pos = porc;
}

// ------------------------------
// UI DINÁMICA
// ------------------------------
function actualizarScoreList() {
  const scoreList = document.getElementById("score-list");
  if (!scoreList) return;

  scoreList.innerHTML = equipos
    .map(e => `<p>${e.nombre}: ${e.puntos}</p>`)
    .join("");
}

function mostrarBarra() {
  if (juegoTerminado) return;
  if (!perTeamPointer.length) {
    iniciar();
    return;
  }

  const turno = obtenerTurnoActual();

  app.innerHTML = `
    <h2>Turno de ${turno.jugador} (${turno.equipo.nombre})</h2>

    <p>Puntuación objetivo: <strong>${puntajeObjetivoSeleccionado}</strong></p>

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

    <div id="resultado-turno"
         style="display:none; margin-top:16px; padding:10px; background:#fffbe6; border-radius:6px;">  
    </div>

    <h3>Puntaje</h3>
    <div id="score-list">
      ${equipos.map(e => `<p>${e.nombre}: ${e.puntos}</p>`).join("")}
    </div>
  `;

  const flecha = document.getElementById("arrow");
  if (flecha) {
    flecha.addEventListener("mousedown", iniciarArrastre);
    flecha.addEventListener("touchstart", iniciarArrastre);
    flecha.style.left = "0%";
    flecha.dataset.pos = 0;
  }

  const btnConfirm = document.getElementById("btn-confirmar");
  if (btnConfirm) btnConfirm.disabled = turnoConfirmado;
}

function generarHTMLRango() {
  const colores = ["#8ab6f9", "#5a8dee", "#1f5ad1", "#5a8dee", "#8ab6f9"];

  return rango.map((seg, i) => `
    <div class="segment"
         style="left:${seg.start}%; width:${W}%; background:${colores[i]}">
      ${seg.val}
    </div>
  `).join("");
}

function finalizarTurno() {
  if (juegoTerminado) return;

  avanzarTurno();
  verificarFinDelJuego();

  if (juegoTerminado) return;

  turnoConfirmado = false;

  generarRango(false);
  rangoVisible = false;

  setTimeout(() => {
    const btnTapa = document.querySelector('button[onclick="toggleTapa()"]');
    if (btnTapa) btnTapa.disabled = false;

    const btnGenerar = document.querySelector('button[onclick="generarRango(true); mostrarBarra()"]');
    if (btnGenerar) btnGenerar.disabled = false;

    const btnConfirm = document.getElementById("btn-confirmar");
    if (btnConfirm) btnConfirm.disabled = false;
  }, 0);

  const resultadoDiv = document.getElementById("resultado-turno");
  if (resultadoDiv) resultadoDiv.style.display = "none";

  mostrarBarra();
}

function siguienteTurno() {
  finalizarTurno();
}

iniciar();
