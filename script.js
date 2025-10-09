// Objeto para almacenar los votos de las 5 preguntas
const votes = {
    utensilios: { red: 0, yellow: 0, green: 0 },
    menu: { red: 0, yellow: 0, green: 0 },
    cantidad: { red: 0, yellow: 0, green: 0 },
    higiene: { red: 0, yellow: 0, green: 0 },
    atencion: { red: 0, yellow: 0, green: 0 },
};

const SECRET_KEY = "GG2024";

// Variables para el control de inactividad
const INACTIVITY_TIME_MS = 5000; // 5 segundos
let isManuallyUnlocked = false; 
let inactivityTimeout; // Para almacenar la referencia al temporizador de inactividad

// Horarios de disponibilidad 
const SCHEDULED_RANGES = [
    { start: "06:15", end: "07:50" }, 
    { start: "11:00", end: "13:30" }, 
    { start: "18:00", end: "20:00" }, 
    { start: "00:05", end: "01:30" }  
];

// --- FUNCIONES DE TIEMPO Y BLOQUEO ---

function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

function isTimeAvailable() {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const range of SCHEDULED_RANGES) {
        const startMinutes = timeToMinutes(range.start);
        const endMinutes = timeToMinutes(range.end);
        
        let isAvailable = false;

        if (startMinutes <= endMinutes) {
            if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
                isAvailable = true;
            }
        } else {
            if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
                isAvailable = true;
            }
        }
        
        if (isAvailable) {
            return true; 
        }
    }
    
    return false; 
}

function checkSchedule() {
    const overlay = document.getElementById('disabled-overlay');
    const panel = document.getElementById('satisfaction-panel');

    // Si el horario está disponible O está desbloqueado manualmente
    if (isTimeAvailable() || isManuallyUnlocked) {
        overlay.style.display = 'none';
        panel.classList.remove('disabled');
    } else {
        // Bloqueado
        overlay.style.display = 'flex';
        panel.classList.add('disabled');
    }
}

// --- LÓGICA DE INACTIVIDAD Y REINICIO ---

/**
 * Función que se ejecuta al expirar el tiempo de inactividad.
 */
function lockFormAutomatically() {
    if (isManuallyUnlocked) {
        isManuallyUnlocked = false; 
        checkSchedule(); 
        alert("El formulario se ha bloqueado automáticamente por 5 segundos de inactividad.");
    }
}

/**
 * Inicia el temporizador de 5 segundos.
 */
function startInactivityTimer() {
    clearTimeout(inactivityTimeout); // Limpia cualquier temporizador anterior
    
    // El temporizador solo debe estar activo si el formulario está manualmente desbloqueado 
    // Y NO está dentro del horario programado.
    if (isManuallyUnlocked && !isTimeAvailable()) { 
        inactivityTimeout = setTimeout(lockFormAutomatically, INACTIVITY_TIME_MS);
    }
}

/**
 * Reinicia el temporizador ante cualquier actividad del usuario.
 */
function resetInactivityTimer() {
    if (isManuallyUnlocked) {
         startInactivityTimer();
    }
}


/**
 * Pide la clave y desbloquea manualmente el formulario al pulsar el icono del reloj.
 */
function promptUnlockClock() {
    const key = prompt("Introduce la clave " + SECRET_KEY + " para desbloquear el formulario:");
    
    if (key === SECRET_KEY) {
        isManuallyUnlocked = true;
        checkSchedule(); 
        alert("¡Formulario desbloqueado! Podrás votar hasta la próxima recarga de página o 5 segundos de inactividad.");
        
        // Inicia el temporizador SOLO si estamos fuera del horario programado
        if (!isTimeAvailable()) { 
            startInactivityTimer();
        }
    } else if (key !== null) {
        alert("Clave incorrecta. El formulario permanece bloqueado.");
    }
}

// --- RESTO DE FUNCIONES (sin cambios lógicos) ---

function updateDateTime() {
    const now = new Date();
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    const formattedDate = now.toLocaleDateString('es-ES', dateOptions);
    const formattedTime = now.toLocaleTimeString('es-ES', timeOptions);
    document.getElementById('current-datetime').textContent = `Fecha: ${formattedDate} | Hora: ${formattedTime}`;
}

function updateProgress(questionName) {
    const questionVotes = votes[questionName];
    const totalVotes = questionVotes.red + questionVotes.yellow + questionVotes.green;
    const redPct = totalVotes > 0 ? (questionVotes.red / totalVotes) * 100 : 0;
    const yellowPct = totalVotes > 0 ? (questionVotes.yellow / totalVotes) * 100 : 0;
    const greenPct = totalVotes > 0 ? (questionVotes.green / totalVotes) * 100 : 0;

    document.getElementById(`${questionName}-red-count`).textContent = `${Math.round(redPct)}%`;
    document.getElementById(`${questionName}-yellow-count`).textContent = `${Math.round(yellowPct)}%`;
    document.getElementById(`${questionName}-green-count`).textContent = `${Math.round(greenPct)}%`;

    document.getElementById(`${questionName}-red-bar`).style.width = `${redPct}%`;
    document.getElementById(`${questionName}-yellow-bar`).style.width = `${yellowPct}%`;
    document.getElementById(`${questionName}-green-bar`).style.width = `${greenPct}%`;
    updateGeneralProgress();
}

function updateGeneralProgress() {
    let totalRed = 0;
    let totalYellow = 0;
    let totalGreen = 0;
    Object.values(votes).forEach(q => {
        totalRed += q.red;
        totalYellow += q.yellow;
        totalGreen += q.green;
    });
    const grandTotal = totalRed + totalYellow + totalGreen;
    const generalRedPct = grandTotal > 0 ? (totalRed / grandTotal) * 100 : 0;
    const generalYellowPct = grandTotal > 0 ? (totalYellow / grandTotal) * 100 : 0;
    const generalGreenPct = grandTotal > 0 ? (totalGreen / grandTotal) * 100 : 0;
    
    document.getElementById(`general-red-bar`).style.width = `${generalRedPct}%`;
    document.getElementById(`general-yellow-bar`).style.width = `${generalYellowPct}%`;
    document.getElementById(`general-green-bar`).style.width = `${generalGreenPct}%`;
}

function incrementVote(questionName, color) {
    if (!isTimeAvailable() && !isManuallyUnlocked) {
        return; 
    }
    
    // Cada voto cuenta como actividad, reiniciamos el temporizador
    resetInactivityTimer();
    
    if (votes[questionName] && votes[questionName].hasOwnProperty(color)) {
        votes[questionName][color] += 1;
        updateProgress(questionName);
    }
}

function promptReset() {
    const key = prompt("Por favor, introduce la clave de administrador para reiniciar el formulario:");
    
    if (key === SECRET_KEY) {
        resetAllData();
        alert("El formulario ha sido reiniciado con éxito.");
    } else if (key !== null) {
        alert("Clave incorrecta. El formulario no ha sido reiniciado.");
    }
}

function resetAllData() {
    Object.keys(votes).forEach(question => {
        votes[question].red = 0;
        votes[question].yellow = 0;
        votes[question].green = 0;
        updateProgress(question); 
    });
    updateGeneralProgress();
}

// Inicializa el progreso y la hora al cargar
document.addEventListener('DOMContentLoaded', () => {
    Object.keys(votes).forEach(updateProgress);
    updateGeneralProgress();
    
    updateDateTime();
    checkSchedule();
    
    // Sincroniza la hora y el horario de disponibilidad cada segundo
    setInterval(() => {
        updateDateTime();
        checkSchedule();
    }, 1000); 
    
    // Configura listeners para detectar inactividad en todo el documento
    ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'].forEach(eventType => {
        document.addEventListener(eventType, resetInactivityTimer, false);
    });
});