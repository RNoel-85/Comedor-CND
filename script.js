// =================================================================
// CONFIGURACIÓN CLAVE (¡No modificar!)
// =================================================================

// Clave para desbloqueo manual del formulario al hacer clic en el reloj.
const SECRET_KEY = "GG2024";

// URL de tu Google Apps Script (Web App URL) para registrar votos en Sheets.
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwHsZFnCPbR_cpA_SRiIVEOk0O4E0Rx7s92-YJqjiwd46SR6nlYq696E7sPe6BJG9I2Lg/exec'; 

// Tiempo de inactividad para el bloqueo automático (5000ms = 5 segundos).
const INACTIVITY_TIME_MS = 10000; 

// Horarios de disponibilidad (cambiar según sea necesario)
const SCHEDULED_RANGES = [
    { start: "06:15", end: "07:50" }, // Mañana
    { start: "11:00", end: "13:30" }, // Almuerzo
    { start: "18:00", end: "20:00" }, // Cena
    { start: "00:05", end: "01:30" }  // Noche/Madrugada
];

// =================================================================
// VARIABLES GLOBALES
// =================================================================

// Objeto para almacenar los votos locales
const votes = {
    utensilios: { red: 0, yellow: 0, green: 0 },
    menu: { red: 0, yellow: 0, green: 0 },
    cantidad: { red: 0, yellow: 0, green: 0 },
    higiene: { red: 0, yellow: 0, green: 0 },
    atencion: { red: 0, yellow: 0, green: 0 },
};

let isManuallyUnlocked = false; 
let inactivityTimeout;

// =================================================================
// FUNCIONES DE CONTROL DE ACCESO Y TIEMPO
// =================================================================

/** Convierte hora (HH:MM) a minutos. */
function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

/** Comprueba si la hora actual está dentro del horario programado. */
function isTimeAvailable() {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const range of SCHEDULED_RANGES) {
        const startMinutes = timeToMinutes(range.start);
        const endMinutes = timeToMinutes(range.end);
        
        let isAvailable = false;

        if (startMinutes <= endMinutes) {
            // Rango dentro del mismo día
            if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
                isAvailable = true;
            }
        } else {
            // Rango que cruza la medianoche
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

/** Actualiza la visibilidad del overlay de bloqueo. */
function checkSchedule() {
    const overlay = document.getElementById('disabled-overlay');
    const panel = document.getElementById('satisfaction-panel');

    // Habilitado si es horario disponible O si está desbloqueado manualmente
    if (isTimeAvailable() || isManuallyUnlocked) {
        overlay.style.display = 'none';
        panel.classList.remove('disabled');
    } else {
        // Deshabilitado
        overlay.style.display = 'flex';
        panel.classList.add('disabled');
    }
}

/** Actualiza la fecha y hora mostrada. */
function updateDateTime() {
    const now = new Date();
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    const formattedDate = now.toLocaleDateString('es-ES', dateOptions);
    const formattedTime = now.toLocaleTimeString('es-ES', timeOptions);
    document.getElementById('current-datetime').textContent = `Fecha: ${formattedDate} | Hora: ${formattedTime}`;
}

// =================================================================
// LÓGICA DE DESBLOQUEO MANUAL Y TEMPORIZADOR DE INACTIVIDAD
// =================================================================

/** Se ejecuta al expirar el tiempo de inactividad. */
function lockFormAutomatically() {
    if (isManuallyUnlocked) {
        isManuallyUnlocked = false; 
        checkSchedule(); 
        alert("El formulario se ha bloqueado automáticamente por 10 segundos de inactividad.");
    }
}

/** Inicia el temporizador de 5 segundos. */
function startInactivityTimer() {
    clearTimeout(inactivityTimeout);
    
    // Solo inicia el temporizador si estamos manualmente desbloqueados Y fuera de horario.
    if (isManuallyUnlocked && !isTimeAvailable()) { 
        inactivityTimeout = setTimeout(lockFormAutomatically, INACTIVITY_TIME_MS);
    }
}

/** Reinicia el temporizador ante cualquier actividad del usuario. */
function resetInactivityTimer() {
    if (isManuallyUnlocked) {
         startInactivityTimer();
    }
}

/** Pide la clave y desbloquea manualmente al pulsar el icono del reloj. */
function promptUnlockClock() {
    const key = prompt("Introduce la clave para desbloquear el formulario");
    
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

// =================================================================
// LÓGICA DE ENVÍO DE DATOS A GOOGLE SHEETS
// =================================================================

/** Envía los datos de la votación a Google Sheets a través de Apps Script. */
function sendDataToSheet(question, color) {
    if (!WEB_APP_URL || WEB_APP_URL.includes('PEGA_TU_URL_DE_APPS_SCRIPT_AQUI')) {
        console.error("WEB_APP_URL no está configurada o es inválida.");
        return;
    }
    
    const dataToSend = {
        question: question, 
        color: color        
    };

    fetch(WEB_APP_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8', 
        },
        body: JSON.stringify(dataToSend) 
    })
    .then(response => response.json())
    .then(data => {
        console.log('Registro en Sheets:', data.message);
    })
    .catch(error => {
        console.error('Error al registrar el voto en Sheets:', error);
    });
}

// =================================================================
// LÓGICA DE VOTACIÓN Y PROGRESO
// =================================================================

/** Calcula y actualiza las barras de progreso de una pregunta. */
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

/** Calcula y actualiza la barra de progreso general. */
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

/** Función principal llamada al votar. */
function incrementVote(questionName, color) {
    // Bloquea el voto si no hay disponibilidad (horario o desbloqueo manual)
    if (!isTimeAvailable() && !isManuallyUnlocked) {
        return; 
    }
    
    // Reinicia el temporizador si el voto es válido
    resetInactivityTimer();
    
    if (votes[questionName] && votes[questionName].hasOwnProperty(color)) {
        // 1. Suma el voto local y actualiza la UI
        votes[questionName][color] += 1;
        updateProgress(questionName);
        
        // 2. Envía el registro a Google Sheets
        sendDataToSheet(questionName, color); 
    }
}

/** Pide la clave de reinicio y borra todos los votos locales. */
function promptReset() {
    const key = prompt("Por favor, introduce la clave de administrador para reiniciar el formulario:");
    
    if (key === SECRET_KEY) {
        resetAllData();
        alert("El formulario ha sido reiniciado con éxito.");
    } else if (key !== null) {
        alert("Clave incorrecta. El formulario no ha sido reiniciado.");
    }
}

/** Resetea todos los contadores de votos a cero. */
function resetAllData() {
    Object.keys(votes).forEach(question => {
        votes[question].red = 0;
        votes[question].yellow = 0;
        votes[question].green = 0;
        updateProgress(question); 
    });
    updateGeneralProgress();
}

// =================================================================
// INICIALIZACIÓN
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Inicializa la UI
    Object.keys(votes).forEach(updateProgress);
    updateGeneralProgress();
    
    // Configura la verificación de tiempo y horario
    updateDateTime();
    checkSchedule();
    
    // Mantiene la hora y el estado de bloqueo sincronizados cada segundo
    setInterval(() => {
        updateDateTime();
        checkSchedule();
    }, 1000); 
    
    // Configura listeners para el reinicio del temporizador de inactividad
    ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'].forEach(eventType => {
        document.addEventListener(eventType, resetInactivityTimer, false);
    });
});


