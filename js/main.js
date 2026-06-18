// ============================================================
// MAIN.JS - Inicialización y binding de botones
// ============================================================

let game;

window.onload = () => {
    game = new Game('game-canvas');

    // --- BOTONES PRINCIPALES ---
    document.getElementById('btn-start').addEventListener('click', () => {
        game.canvas.classList.remove('fade-in');
        void game.canvas.offsetWidth; // trigger reflow
        game.canvas.classList.add('fade-in');
        game.start('campaign');
        hideTimer();
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
        const isLast = game.mode || 'campaign';
        game.start(isLast);
        if (isLast === 'survival') showTimer();
        else hideTimer();
    });

    document.getElementById('btn-menu').addEventListener('click', () => {
        game.state = 'MENU';
        UI.showScreen('main-menu');
        updateMainMenuUI();
        AudioController.playBGM('music_menu');
    });

    document.getElementById('btn-resume').addEventListener('click', () => {
        game.state = 'PLAYING';
        game.input.clearAll(); // Evitar teclas pegadas
        UI.showScreen('hud');
    });

    document.getElementById('btn-quit').addEventListener('click', () => {
        game.state = 'MENU';
        UI.showScreen('main-menu');
        updateMainMenuUI();
        AudioController.playBGM('music_menu');
    });

    document.getElementById('btn-survival').addEventListener('click', () => {
        game.canvas.classList.remove('fade-in');
        void game.canvas.offsetWidth;
        game.canvas.classList.add('fade-in');
        game.start('survival');
        showTimer();
    });

    document.getElementById('btn-upgrades').addEventListener('click', () => {
        UI.showScreen('upgrades-screen');
    });

    document.getElementById('btn-settings').addEventListener('click', () => {
        UI.showScreen('settings-screen');
    });

    document.getElementById('btn-settings-back').addEventListener('click', () => {
        UI.showScreen('main-menu');
    });

    document.getElementById('btn-upgrades-back').addEventListener('click', () => {
        UI.showScreen('main-menu');
    });

    // Alternancia de dificultad
    const diffBtn = document.getElementById('btn-toggle-difficulty');
    if (diffBtn) {
        diffBtn.addEventListener('click', (e) => {
            if (CONFIG.Difficulty === 'NORMAL') {
                CONFIG.Difficulty = 'HARD';
            } else if (CONFIG.Difficulty === 'HARD') {
                CONFIG.Difficulty = 'EASY';
            } else {
                CONFIG.Difficulty = 'NORMAL';
            }
            const preset = CONFIG.getDifficulty();
            e.target.innerHTML = `<span class="btn-icon">⚡</span> Dificultad: ${CONFIG.Difficulty}`;
            e.target.style.color = preset.color;
            e.target.style.borderColor = preset.color;
        });
    }

    // Alternancia de estilo visual
    document.getElementById('btn-toggle-visual').addEventListener('click', (e) => {
        if (CONFIG.VisualMode === 'NEON') {
            CONFIG.VisualMode = 'REALISTIC';
            e.target.innerHTML = '<span class="btn-icon">🎨</span> Estilo: REALISTA';
            CONFIG.Colors.bg = '#111118';
            CONFIG.Colors.player = '#88aaff';
            CONFIG.Colors.asteroid = '#888888';
        } else {
            CONFIG.VisualMode = 'NEON';
            e.target.innerHTML = '<span class="btn-icon">🎨</span> Estilo: NEON';
            CONFIG.Colors.bg = '#050510';
            CONFIG.Colors.player = '#00ffff';
            CONFIG.Colors.asteroid = '#b0b8cc';
        }
        Renderer.initialized = false; // Refrescar fondo
    });

    // --- NIVEL COMPLETADO ---
    document.getElementById('btn-next-level').addEventListener('click', () => {
        game.nextLevel();
    });

    document.getElementById('btn-level-complete-menu').addEventListener('click', () => {
        game.state = 'MENU';
        UI.showScreen('main-menu');
        updateMainMenuUI();
        AudioController.playBGM('music_menu');
    });

    // --- SELECCIÓN DE NIVEL ---
    document.getElementById('btn-select-level').addEventListener('click', () => {
        UI.showScreen('level-select-screen');
        populateLevelSelect();
    });

    document.getElementById('btn-select-level-back').addEventListener('click', () => {
        UI.showScreen('main-menu');
    });

    // --- HELPERS ---
    function showTimer() {
        const el = document.getElementById('survival-timer');
        if (el) el.classList.remove('hidden');
    }

    function hideTimer() {
        const el = document.getElementById('survival-timer');
        if (el) el.classList.add('hidden');
    }

    function updateMainMenuUI() {
        const maxLevel = parseInt(localStorage.getItem('maxLevel') || '1');
        const btnSelectLevel = document.getElementById('btn-select-level');
        btnSelectLevel.style.display = maxLevel > 1 ? 'flex' : 'none';
        
        const hs = parseInt(localStorage.getItem('highScore') || '0');
        const menuHsDisplay = document.getElementById('menu-high-score');
        if (menuHsDisplay) {
            menuHsDisplay.innerText = `Récord: ${hs.toLocaleString()}`;
        }
    }

    function populateLevelSelect() {
        const grid = document.getElementById('level-grid');
        grid.innerHTML = '';
        const maxLevel = parseInt(localStorage.getItem('maxLevel') || '1');

        for (let i = 1; i <= maxLevel; i++) {
            const btn = document.createElement('button');
            btn.className = 'btn';
            btn.setAttribute('aria-label', `Nivel ${i}`);
            btn.innerText = i;
            btn.addEventListener('click', () => {
                game.start('campaign', i);
                hideTimer();
            });
            grid.appendChild(btn);
        }
    }

    // --- INICIO ---
    UI.showScreen('main-menu');
    updateMainMenuUI();
    AudioController.playBGM('music_menu');
    // Nota: el loop comienza solo cuando el jugador inicia una partida (game.start())
};
