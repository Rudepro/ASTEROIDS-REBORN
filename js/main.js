// ============================================================
// MAIN.JS - Inicialización y binding de botones
// ============================================================

let game;

window.onload = () => {
    game = new Game('game-canvas');

    // ── BOTONES PRINCIPALES ──────────────────────────────────
    document.getElementById('btn-start').addEventListener('click', () => {
        game.canvas.classList.remove('fade-in');
        void game.canvas.offsetWidth;
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
        game.input.clearAll();
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
        updateUpgradesUI();
    });

    document.getElementById('btn-settings').addEventListener('click', () => {
        UI.showScreen('settings-screen');
    });

    document.getElementById('btn-settings-back').addEventListener('click', () => {
        UI.showScreen('main-menu');
        updateMainMenuUI();
    });

    document.getElementById('btn-upgrades-back').addEventListener('click', () => {
        UI.showScreen('main-menu');
        updateMainMenuUI();
    });

    // ── DIFICULTAD ───────────────────────────────────────────
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

    // ── ESTILO VISUAL ────────────────────────────────────────
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
        Renderer.initialized = false;
    });

    // ── NIVEL COMPLETADO ─────────────────────────────────────
    document.getElementById('btn-next-level').addEventListener('click', () => {
        game.nextLevel();
    });

    document.getElementById('btn-level-complete-menu').addEventListener('click', () => {
        game.state = 'MENU';
        UI.showScreen('main-menu');
        updateMainMenuUI();
        AudioController.playBGM('music_menu');
    });

    // ── SELECCIÓN DE NIVEL ───────────────────────────────────
    document.getElementById('btn-select-level').addEventListener('click', () => {
        UI.showScreen('level-select-screen');
        populateLevelSelect();
    });

    document.getElementById('btn-select-level-back').addEventListener('click', () => {
        UI.showScreen('main-menu');
        updateMainMenuUI();
    });

    // ── CONTROLES TÁCTILES (MÓVIL) ───────────────────────────
    initTouchControls();

    // ── HELPERS ──────────────────────────────────────────────
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
        if (btnSelectLevel) btnSelectLevel.style.display = maxLevel > 1 ? 'flex' : 'none';

        // Leer récord actualizado desde localStorage (nunca estático)
        const hs = parseInt(localStorage.getItem('highScore') || '0');
        const menuHsDisplay = document.getElementById('menu-high-score');
        if (menuHsDisplay) {
            menuHsDisplay.innerText = `Récord: ${hs.toLocaleString()}`;
        }
    }

    function updateUpgradesUI() {
        const crystals = parseInt(localStorage.getItem('crystals') || '0');
        const el = document.getElementById('meta-crystals');
        if (el) el.innerText = crystals;

        // Leer niveles comprados
        const upgrades = JSON.parse(localStorage.getItem('upgrades') || '{}');
        const costs = { health: 10, speed: 15, shield: 20 };

        ['health', 'speed', 'shield'].forEach(key => {
            const lvl = upgrades[key] || 0;
            const lvlEl = document.getElementById(`lvl-${key}`);
            const costEl = document.getElementById(`cost-${key}`);
            const card   = document.getElementById(`upg-${key}`);
            if (lvlEl) lvlEl.innerText = lvl;
            const cost = costs[key] + lvl * costs[key];
            if (costEl) costEl.innerText = cost;

            // Comprar al hacer clic en la tarjeta
            if (card && !card._bound) {
                card._bound = true;
                card.addEventListener('click', () => {
                    const curCrystals = parseInt(localStorage.getItem('crystals') || '0');
                    const curUpgrades = JSON.parse(localStorage.getItem('upgrades') || '{}');
                    const curLvl = curUpgrades[key] || 0;
                    const curCost = costs[key] + curLvl * costs[key];
                    if (curCrystals >= curCost) {
                        curUpgrades[key] = curLvl + 1;
                        localStorage.setItem('crystals', curCrystals - curCost);
                        localStorage.setItem('upgrades', JSON.stringify(curUpgrades));
                        // Aplicar bonificación si hay una partida activa
                        if (game && game.player) applyUpgrades(game.player);
                        updateUpgradesUI();
                    } else {
                        // Efecto de "sin fondos"
                        card.classList.add('no-funds');
                        setTimeout(() => card.classList.remove('no-funds'), 500);
                    }
                });
            }
        });
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

    // ── INICIO ───────────────────────────────────────────────
    UI.showScreen('main-menu');
    updateMainMenuUI();
    // BGM se encola aquí; se reproducirá tras la primera interacción del usuario
    AudioController.playBGM('music_menu');
};

// ── Aplicar mejoras permanentes al jugador activo ───────────
function applyUpgrades(player) {
    const upgrades = JSON.parse(localStorage.getItem('upgrades') || '{}');
    const healthLvl = upgrades['health'] || 0;
    const speedLvl  = upgrades['speed']  || 0;
    const shieldLvl = upgrades['shield'] || 0;

    // Cada nivel de Health da +20 de vida máxima
    player.health = Math.min(CONFIG.Player.maxHealth + healthLvl * 20, player.health + healthLvl * 20);

    // Velocidad y escudo se aplican via CONFIG en tiempo de inicio (no retroactivo)
    // Se guardan para próximas partidas
}

// ── Controles táctiles para móvil ─────────────────────────
function initTouchControls() {
    const overlay = document.getElementById('touch-controls');
    if (!overlay) return;

    // Botones direccionales
    const bindTouch = (id, key, keyCode) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (game && game.input) game.input.keys.add(keyCode);
        }, { passive: false });
        el.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (game && game.input) game.input.keys.delete(keyCode);
        }, { passive: false });
        el.addEventListener('touchcancel', () => {
            if (game && game.input) game.input.keys.delete(keyCode);
        });
    };

    bindTouch('touch-up',    'up',    'ArrowUp');
    bindTouch('touch-left',  'left',  'ArrowLeft');
    bindTouch('touch-right', 'right', 'ArrowRight');
    bindTouch('touch-down',  'down',  'ArrowDown');
    bindTouch('touch-fire',  'fire',  'Space');
    bindTouch('touch-pause', 'pause', 'KeyP');
    bindTouch('touch-target', 'target', 'KeyG');
}
