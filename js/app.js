let allQuestions = [];
let currentQuiz = [];
let currentIndex = 0;
let score = 0;
let timerInterval;
let quizMode = ''; 
let resultsTracker = []; 

const ui = {
    home: document.getElementById('view-home'),
    quiz: document.getElementById('view-quiz'),
    results: document.getElementById('view-results'),
    options: document.getElementById('options-container'),
    feedback: document.getElementById('feedback-msg'),
    progress: document.getElementById('progress-text'),
    timer: document.getElementById('timer'),
    btnHome: document.getElementById('btn-home'),
    btnNext: document.getElementById('btn-next'),
    btnPrev: document.getElementById('btn-prev'),
    status: document.getElementById('quiz-status')
};

// 1. CARGA DE DATOS (Ruta corregida para js/preguntas.json)
async function init() {
    try {
        const response = await fetch('./js/preguntas.json');
        if (!response.ok) throw new Error("No se pudo cargar el JSON");
        allQuestions = await response.json();
        updateMaxQuestions();
    } catch (e) {
        console.error(e);
        alert("Error cargando preguntas. Asegúrate de usar Live Server y que el JSON no tenga errores de sintaxis.");
    }
}

// 2. MENÚS
function toggleSubmenu(id) {
    document.getElementById(id).classList.toggle('hidden');
}

function updateMaxQuestions() {
    const cat = document.getElementById('select-category').value;
    const count = allQuestions.filter(q => q.cat === cat).length;
    document.getElementById('max-label').innerText = `Disponibles en esta categoría: ${count}`;
    document.getElementById('num-questions').max = count;
    document.getElementById('num-questions').value = Math.min(10, count);
}

// 3. INICIO DE MODOS
function startMode(mode, param = null) {
    quizMode = mode;
    currentIndex = 0;
    score = 0;
    resultsTracker = [];
    clearInterval(timerInterval);

    if (mode === 'read') {
        currentQuiz = param === 'all' ? [...allQuestions] : allQuestions.filter(q => q.cat === param);
    } else if (mode === 'smart') {
        currentQuiz = generateQuotaQuiz({
            'Control of Vehicle': 1,
            'Legal Matters / Rules of the Road': 5,
            'Managing Risk': 2,
            'Safe and Socially Responsible Driving': 11,
            'Technical Matters': 1
        });
    } else if (mode === 'official') {
        currentQuiz = generateQuotaQuiz({
            'Control of Vehicle': 1,
            'Legal Matters / Rules of the Road': 11,
            'Managing Risk': 4,
            'Safe and Socially Responsible Driving': 23,
            'Technical Matters': 1
        });
        startTimer(45);
    }
    
    if (currentQuiz.length > 0) showQuiz();
}

function initCategoryPractice() {
    const cat = document.getElementById('select-category').value;
    const num = parseInt(document.getElementById('num-questions').value);
    const available = allQuestions.filter(q => q.cat === cat);
    
    quizMode = 'practice';
    currentIndex = 0;
    score = 0;
    resultsTracker = [];
    currentQuiz = available.sort(() => 0.5 - Math.random()).slice(0, num);
    showQuiz();
}

function generateQuotaQuiz(quota) {
    let quiz = [];
    for (let cat in quota) {
        const filtered = allQuestions.filter(q => q.cat === cat).sort(() => 0.5 - Math.random());
        quiz = quiz.concat(filtered.slice(0, quota[cat]));
    }
    return quiz.sort(() => 0.5 - Math.random());
}

// 4. VISUALIZACIÓN
function showQuiz() {
    ui.home.classList.add('hidden');
    ui.results.classList.add('hidden');
    ui.quiz.classList.remove('hidden');
    ui.btnHome.classList.remove('hidden');
    ui.status.classList.remove('hidden');
    ui.timer.classList.toggle('hidden', quizMode !== 'official');
    renderQuestion();
}

function renderQuestion() {
    const q = currentQuiz[currentIndex];
    ui.feedback.innerText = '';
    ui.progress.innerText = `Pregunta ${currentIndex + 1} de ${currentQuiz.length}`;
    
    document.getElementById('q-en').innerText = q.pregunta_en;
    document.getElementById('q-es').innerText = q.pregunta_es;

    const imgCont = document.getElementById('image-container');
    const imgElem = document.getElementById('question-image');
    if (q.imagen) {
        imgElem.src = q.imagen; 
        imgCont.classList.remove('hidden');
    } else {
        imgCont.classList.add('hidden');
    }

    ui.options.innerHTML = '';
    let opts = q.opciones_es.map((txt, i) => ({ txt, id: i }));
    
    if (quizMode !== 'read') opts.sort(() => 0.5 - Math.random());

    opts.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt.txt;
        btn.dataset.originalId = opt.id; // Guardamos el ID real para saber si es la correcta (0)

        if (quizMode === 'read') {
            if (opt.id === 0) btn.classList.add('correct');
        } else {
            btn.onclick = () => checkAnswer(opt.id, btn);
        }
        ui.options.appendChild(btn);
    });

    ui.btnPrev.classList.toggle('hidden', quizMode !== 'read' || currentIndex === 0);
    ui.btnNext.classList.toggle('hidden', quizMode !== 'read' && !ui.feedback.innerText);
    if (quizMode === 'read' && currentIndex === currentQuiz.length - 1) ui.btnNext.classList.add('hidden');
}

// 5. LÓGICA DE CORRECCIÓN (Aquí está tu ajuste solicitado)
function checkAnswer(selectedId, btn) {
    const q = currentQuiz[currentIndex];
    const isCorrect = (selectedId === 0);
    const allBtns = ui.options.querySelectorAll('.option-btn');
    
    // Bloqueamos clics extras
    allBtns.forEach(b => b.style.pointerEvents = 'none');

    if (quizMode === 'official') {
        if (isCorrect) score++;
        resultsTracker.push({ cat: q.cat, ok: isCorrect });
        setTimeout(handleNext, 400);
    } else {
        if (isCorrect) {
            score++;
            btn.classList.add('correct');
            ui.feedback.innerText = "✅ CORRECTO";
            ui.feedback.style.color = "var(--success)";
        } else {
            btn.classList.add('incorrect');
            ui.feedback.innerText = "❌ INCORRECTO";
            ui.feedback.style.color = "var(--error)";
            
            // REVELAR LA CORRECTA: Buscamos el botón que tiene el id 0
            allBtns.forEach(b => {
                if (parseInt(b.dataset.originalId) === 0) {
                    b.classList.add('correct');
                }
            });
        }
        resultsTracker.push({ cat: q.cat, ok: isCorrect });
        ui.btnNext.classList.remove('hidden');
    }
}

function handleNext() {
    currentIndex++;
    if (currentIndex < currentQuiz.length) renderQuestion();
    else finishQuiz();
}

function changeQuestion(dir) {
    currentIndex += dir;
    renderQuestion();
}

// 6. RESULTADOS FINALES
function finishQuiz() {
    clearInterval(timerInterval);
    ui.quiz.classList.add('hidden');
    ui.results.classList.remove('hidden');
    ui.status.classList.add('hidden');

    let pass = false;
    const total = currentQuiz.length;
    if (quizMode === 'official') pass = score >= 35;
    else if (quizMode === 'smart') pass = score >= 18;
    else pass = score >= (total * 0.9);

    document.getElementById('result-status').innerText = pass ? "¡PASASTE! 🎉" : "FALLASTE ❌";
    document.getElementById('result-status').style.color = pass ? "var(--success)" : "var(--error)";
    document.getElementById('result-score').innerText = `Resultado: ${score} / ${total}`;

    const stats = {};
    resultsTracker.forEach(r => {
        if (!stats[r.cat]) stats[r.cat] = { ok: 0, total: 0 };
        stats[r.cat].total++;
        if (r.ok) stats[r.cat].ok++;
    });

    let html = "<h4>Desglose por categoría:</h4><ul style='text-align:left; list-style:none; padding:0;'>";
    for (let c in stats) {
        html += `<li style='margin-bottom:8px; border-bottom:1px solid #eee;'><strong>${c}:</strong> ${stats[c].ok} / ${stats[c].total}</li>`;
    }
    html += "</ul>";
    document.getElementById('category-breakdown').innerHTML = html;
}

function startTimer(m) {
    let time = m * 60;
    ui.timer.classList.remove('hidden');
    timerInterval = setInterval(() => {
        let mins = Math.floor(time / 60);
        let secs = time % 60;
        ui.timer.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        if (time-- <= 0) { clearInterval(timerInterval); finishQuiz(); }
    }, 1000);
}

// BOTÓN INICIO SIEMPRE DISPONIBLE
ui.btnHome.onclick = () => {
    if(confirm("¿Seguro que quieres volver al inicio? Perderás el progreso actual.")) {
        location.reload();
    }
};

init();