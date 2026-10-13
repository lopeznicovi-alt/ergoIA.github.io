/* =========================================
   ERGOIA - ASISTENTE ERGONÓMICO
   TEACHABLE MACHINE - POSE
========================================= */

const MODEL_URL =
    "https://teachablemachine.withgoogle.com/models/809hYNK2O/";

let model;
let webcam;
let maxPredictions;
let animationId;
let cameraRunning = false;


/* =========================================
   TEMPORIZADORES
========================================= */

const WORK_TIME = 60 * 60; // 60 minutos
const BREAK_TIME = 5 * 60; // 5 minutos

let workSeconds = WORK_TIME;
let breakSeconds = BREAK_TIME;

let workInterval = null;
let breakInterval = null;


/* =========================================
   POSTURA
========================================= */

let lastAlertTime = 0;


/* =========================================
   EJERCICIOS
========================================= */

const exercises = [
    {
        name: "Cuello",
        description:
            "Gira lentamente la cabeza hacia la derecha y luego hacia la izquierda."
    },
    {
        name: "Hombros",
        description:
            "Sube los hombros hacia las orejas, mantén unos segundos y relaja."
    },
    {
        name: "Brazos",
        description:
            "Estira un brazo hacia adelante y después cambia al otro."
    },
    {
        name: "Espalda",
        description:
            "Levántate y estira suavemente la espalda llevando los brazos hacia arriba."
    },
    {
        name: "Piernas",
        description:
            "Levántate de la silla, camina unos pasos y mueve suavemente las piernas."
    }
];


/* =========================================
   ELEMENTOS
========================================= */

const consentScreen =
    document.getElementById("consentScreen");

const consentCheckbox =
    document.getElementById("consentCheckbox");

const acceptButton =
    document.getElementById("acceptButton");

const app =
    document.getElementById("app");

const video =
    document.getElementById("video");

const canvas =
    document.getElementById("canvas");

const ctx =
    canvas.getContext("2d");

const cameraMessage =
    document.getElementById("cameraMessage");

const cameraStatus =
    document.getElementById("cameraStatus");

const startCameraButton =
    document.getElementById("startCameraButton");

const stopCameraButton =
    document.getElementById("stopCameraButton");

const postureResult =
    document.getElementById("postureResult");

const resultIcon =
    document.getElementById("resultIcon");

const resultTitle =
    document.getElementById("resultTitle");

const resultMessage =
    document.getElementById("resultMessage");

const confidenceText =
    document.getElementById("confidenceText");

const confidenceBar =
    document.getElementById("confidenceBar");

const badPostureAlert =
    document.getElementById("badPostureAlert");

const workTimer =
    document.getElementById("workTimer");

const nextBreak =
    document.getElementById("nextBreak");

const breakModal =
    document.getElementById("breakModal");

const breakTimer =
    document.getElementById("breakTimer");

const exerciseName =
    document.getElementById("exerciseName");

const exerciseDescription =
    document.getElementById("exerciseDescription");

const exerciseProgressBar =
    document.getElementById("exerciseProgressBar");

const exerciseItems =
    document.querySelectorAll(
        ".exercise-list span"
    );


/* =========================================
   CONSENTIMIENTO
========================================= */

consentCheckbox.addEventListener(
    "change",
    () => {

        acceptButton.disabled =
            !consentCheckbox.checked;

    }
);


acceptButton.addEventListener(
    "click",
    () => {

        if (!consentCheckbox.checked) {
            return;
        }

        consentScreen.classList.add("hidden");

        app.classList.remove("hidden");

        loadModel();

    }
);


/* =========================================
   CARGAR MODELO
========================================= */

async function loadModel() {

    cameraMessage.textContent =
        "Cargando inteligencia artificial...";

    try {

        const modelURL =
            MODEL_URL + "model.json";

        const metadataURL =
            MODEL_URL + "metadata.json";

        model = await tmPose.load(
            modelURL,
            metadataURL
        );

        maxPredictions =
            model.getTotalClasses();

        cameraMessage.textContent =
            "IA lista. Inicia la cámara.";

        console.log(
            "Modelo cargado correctamente"
        );

        console.log(
            "Clases:",
            maxPredictions
        );

    } catch (error) {

        console.error(
            "Error cargando modelo:",
            error
        );

        cameraMessage.textContent =
            "Error cargando el modelo.";

    }

}


/* =========================================
   INICIAR CÁMARA
========================================= */

startCameraButton.addEventListener(
    "click",
    startCamera
);


async function startCamera() {

    if (!model) {

        alert(
            "Espera a que termine de cargar la inteligencia artificial."
        );

        return;
    }

    try {

        const size = 480;

        /*
         * Teachable Machine utilizará
         * su propio canvas.
         */

        webcam = new tmPose.Webcam(
            size,
            size,
            true
        );

        await webcam.setup();

        await webcam.play();

        cameraRunning = true;

        startCameraButton.disabled = true;

        stopCameraButton.disabled = false;

        cameraMessage.classList.add(
            "hidden"
        );

        cameraStatus.textContent =
            "● Cámara activa";

        cameraStatus.classList.remove(
            "offline"
        );

        cameraStatus.classList.add(
            "online"
        );

        /*
         * Nuestro canvas será ahora
         * el lugar donde mostramos
         * la cámara.
         */

        canvas.width = size;
        canvas.height = size;

        /*
         * Iniciar análisis.
         */

        loop();

        /*
         * Iniciar temporizador.
         */

        startWorkTimer();

    } catch (error) {

        console.error(
            "Error iniciando cámara:",
            error
        );

        alert(
            "No se pudo acceder a la cámara. Revisa los permisos del navegador."
        );

    }

}


/* =========================================
   BUCLE
========================================= */

async function loop() {

    if (!cameraRunning) {
        return;
    }

    webcam.update();

    await predict();

    animationId =
        window.requestAnimationFrame(
            loop
        );

}


/* =========================================
   PREDICCIÓN
========================================= */

async function predict() {

    if (!model || !webcam) {
        return;
    }

    const {
        pose,
        posenetOutput
    } =
        await model.estimatePose(
            webcam.canvas
        );


    /*
     * ======================================
     * AQUÍ ESTÁ LA CORRECCIÓN PRINCIPAL
     * ======================================
     *
     * Copiamos la imagen real de la cámara
     * desde el canvas de Teachable Machine
     * hacia nuestro canvas visible.
     */

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.drawImage(
        webcam.canvas,
        0,
        0,
        canvas.width,
        canvas.height
    );


    /*
     * Predicción de la IA.
     */

    const prediction =
        await model.predict(
            posenetOutput
        );


    /*
     * Dibujar esqueleto.
     */

    drawPose(pose);


    /*
     * Buscar la clase con mayor confianza.
     */

    let bestPrediction =
        prediction[0];

    for (
        let i = 1;
        i < prediction.length;
        i++
    ) {

        if (
            prediction[i].probability >
            bestPrediction.probability
        ) {

            bestPrediction =
                prediction[i];

        }

    }


    const probability =
        bestPrediction.probability;

    const className =
        bestPrediction.className;


    /*
     * Mostrar confianza.
     */

    const percentage =
        Math.round(
            probability * 100
        );

    confidenceText.textContent =
        percentage + "%";

    confidenceBar.style.width =
        percentage + "%";


    console.log(
        className,
        percentage + "%"
    );


    /*
     * Analizar postura.
     */

    analyzePosture(
        className,
        probability
    );

}


/* =========================================
   ANALIZAR POSTURA
========================================= */

function analyzePosture(
    className,
    probability
) {

    if (probability < 0.60) {

        showNeutral();

        return;
    }


    const normalizedName =
        className
            .toLowerCase()
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            );


    const isBad =
        normalizedName.includes("mala") ||
        normalizedName.includes("incorrecta") ||
        normalizedName.includes("incorrect") ||
        normalizedName.includes("bad");


    const isGood =
        normalizedName.includes("buena") ||
        normalizedName.includes("correcta") ||
        normalizedName.includes("correct") ||
        normalizedName.includes("good");


    if (isBad) {

        showBadPosture();

    } else if (isGood) {

        showGoodPosture();

    } else {

        resultTitle.textContent =
            className;

        resultMessage.textContent =
            "La IA está analizando tu postura.";

        postureResult.className =
            "posture-result neutral";

        resultIcon.textContent =
            "?";

    }

}


/* =========================================
   BUENA POSTURA
========================================= */

function showGoodPosture() {

    postureResult.className =
        "posture-result good";

    resultIcon.textContent =
        "✓";

    resultTitle.textContent =
        "Buena postura";

    resultMessage.textContent =
        "¡Excelente! Mantén esta posición.";

    badPostureAlert.classList.add(
        "hidden"
    );

}


/* =========================================
   MALA POSTURA
========================================= */

function showBadPosture() {

    postureResult.className =
        "posture-result bad";

    resultIcon.textContent =
        "!";

    resultTitle.textContent =
        "Mala postura";

    resultMessage.textContent =
        "Ajusta tu posición y endereza tu espalda.";

    badPostureAlert.classList.remove(
        "hidden"
    );


    /*
     * Sonido cada 10 segundos como máximo.
     */

    const now =
        Date.now();

    if (
        now - lastAlertTime >
        10000
    ) {

        playAlertSound();

        lastAlertTime =
            now;

    }

}


/* =========================================
   ESTADO NEUTRO
========================================= */

function showNeutral() {

    postureResult.className =
        "posture-result neutral";

    resultIcon.textContent =
        "?";

    resultTitle.textContent =
        "Analizando...";

    resultMessage.textContent =
        "Mantente frente a la cámara.";

}


/* =========================================
   DIBUJAR ESQUELETO
========================================= */

function drawPose(pose) {

    if (!pose) {
        return;
    }

    const minPartConfidence =
        0.5;


    /*
     * Dibujamos los puntos sobre
     * la imagen de la cámara.
     */

    tmPose.drawKeypoints(
        pose.keypoints,
        minPartConfidence,
        ctx
    );

    tmPose.drawSkeleton(
        pose.keypoints,
        minPartConfidence,
        ctx
    );

}


/* =========================================
   SONIDO MALA POSTURA
========================================= */

function playAlertSound() {

    try {

        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;

        const audioContext =
            new AudioContext();

        const oscillator =
            audioContext.createOscillator();

        const gain =
            audioContext.createGain();

        oscillator.type =
            "sine";

        oscillator.frequency.value =
            700;

        gain.gain.value =
            0.12;

        oscillator.connect(gain);

        gain.connect(
            audioContext.destination
        );

        oscillator.start();

        oscillator.stop(
            audioContext.currentTime + 0.25
        );

    } catch (error) {

        console.log(
            "Sonido no disponible"
        );

    }

}


/* =========================================
   TEMPORIZADOR 60 MINUTOS
========================================= */

function startWorkTimer() {

    if (workInterval) {

        clearInterval(
            workInterval
        );

    }

    workSeconds =
        WORK_TIME;

    updateWorkTimer();

    workInterval =
        setInterval(
            () => {

                workSeconds--;

                updateWorkTimer();

                if (
                    workSeconds <= 0
                ) {

                    startActiveBreak();

                }

            },
            1000
        );

}


/* =========================================
   ACTUALIZAR TEMPORIZADOR
========================================= */

function updateWorkTimer() {

    const minutes =
        Math.floor(
            workSeconds / 60
        );

    const seconds =
        workSeconds % 60;

    const time =
        formatTime(
            minutes,
            seconds
        );

    workTimer.textContent =
        time;

    nextBreak.textContent =
        time;

}


/* =========================================
   FORMATO
========================================= */

function formatTime(
    minutes,
    seconds
) {

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(seconds).padStart(2, "0")
    );

}


/* =========================================
   PAUSA ACTIVA
========================================= */

function startActiveBreak() {

    if (workInterval) {

        clearInterval(
            workInterval
        );

        workInterval =
            null;

    }


    cameraRunning = false;


    if (animationId) {

        cancelAnimationFrame(
            animationId
        );

    }


    breakModal.classList.remove(
        "hidden"
    );


    breakSeconds =
        BREAK_TIME;

    updateBreakTimer();

    updateExercise();

    playBreakSound();


    breakInterval =
        setInterval(
            () => {

                breakSeconds--;

                updateBreakTimer();

                updateExercise();

                if (
                    breakSeconds <= 0
                ) {

                    finishActiveBreak();

                }

            },
            1000
        );

}


/* =========================================
   TEMPORIZADOR PAUSA
========================================= */

function updateBreakTimer() {

    const minutes =
        Math.floor(
            breakSeconds / 60
        );

    const seconds =
        breakSeconds % 60;

    breakTimer.textContent =
        formatTime(
            minutes,
            seconds
        );

}


/* =========================================
   EJERCICIOS
========================================= */

function updateExercise() {

    const elapsed =
        BREAK_TIME -
        breakSeconds;

    let exerciseIndex =
        Math.floor(
            elapsed / 60
        );


    if (
        exerciseIndex >=
        exercises.length
    ) {

        exerciseIndex =
            exercises.length - 1;

    }


    const exercise =
        exercises[
            exerciseIndex
        ];


    exerciseName.textContent =
        exercise.name;

    exerciseDescription.textContent =
        exercise.description;


    const secondsInExercise =
        elapsed % 60;

    const progress =
        (secondsInExercise / 60) *
        100;

    exerciseProgressBar.style.width =
        progress + "%";


    exerciseItems.forEach(
        (item, index) => {

            item.classList.toggle(
                "active",
                index === exerciseIndex
            );

        }
    );

}


/* =========================================
   TERMINAR PAUSA
========================================= */

function finishActiveBreak() {

    clearInterval(
        breakInterval
    );

    breakInterval =
        null;


    breakModal.classList.add(
        "hidden"
    );


    workSeconds =
        WORK_TIME;

    updateWorkTimer();


    /*
     * Volver a analizar postura.
     */

    if (webcam) {

        cameraRunning = true;

        loop();

    }


    resultTitle.textContent =
        "¡Pausa completada!";

    resultMessage.textContent =
        "Excelente. Continuemos cuidando tu postura.";

}


/* =========================================
   SONIDO PAUSA
========================================= */

function playBreakSound() {

    try {

        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;

        const audioContext =
            new AudioContext();

        const oscillator =
            audioContext.createOscillator();

        const gain =
            audioContext.createGain();

        oscillator.frequency.value =
            520;

        gain.gain.value =
            0.15;

        oscillator.connect(gain);

        gain.connect(
            audioContext.destination
        );

        oscillator.start();

        oscillator.stop(
            audioContext.currentTime + 0.8
        );

    } catch (error) {

        console.log(
            "Sonido no disponible"
        );

    }

}


/* =========================================
   DETENER CÁMARA
========================================= */

stopCameraButton.addEventListener(
    "click",
    stopCamera
);


function stopCamera() {

    cameraRunning = false;


    if (animationId) {

        cancelAnimationFrame(
            animationId
        );

    }


    if (webcam) {

        try {

            webcam.stop();

        } catch (error) {

            console.log(error);

        }

    }


    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    startCameraButton.disabled =
        false;

    stopCameraButton.disabled =
        true;


    cameraMessage.textContent =
        "Cámara detenida";

    cameraMessage.classList.remove(
        "hidden"
    );


    cameraStatus.textContent =
        "● Cámara apagada";

    cameraStatus.classList.remove(
        "online"
    );

    cameraStatus.classList.add(
        "offline"
    );


    if (workInterval) {

        clearInterval(
            workInterval
        );

        workInterval = null;

    }

}