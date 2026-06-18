// ============================================================
// UI.JS - HUD premium con indicador de arma y notificaciones
// ============================================================

const UI = {
    screens: {
        'main-menu':           document.getElementById('main-menu'),
        'settings-screen':     document.getElementById('settings-screen'),
        'upgrades-screen':     document.getElementById('upgrades-screen'),
        'level-complete-screen': document.getElementById('level-complete-screen'),
        'level-select-screen': document.getElementById('level-select-screen'),
        'hud':                 document.getElementById('hud'),
        'pause-screen':        document.getElementById('pause-screen'),
        'game-over-screen':    document.getElementById('game-over-screen'),
        'level-up-screen':     document.getElementById('level-up-screen')
    },

    elements: {
        score:           document.getElementById('score'),
        healthBar:       document.getElementById('health-bar'),
        shieldBar:       document.getElementById('shield-bar'),
        levelText:       document.getElementById('level-text'),
        finalScore:      document.getElementById('final-score'),
        weaponIcon:      document.getElementById('weapon-icon'),
        weaponName:      document.getElementById('weapon-name'),
        survivalTimer:   document.getElementById('survival-timer'),
        powerupNotif:    document.getElementById('powerup-notif'),
        highScoreDisplay:document.getElementById('high-score-display'),
        menuHighScoreDisplay: document.getElementById('menu-high-score'),
        comboMultiplier: document.getElementById('combo-multiplier'),
        statAsteroids:   document.getElementById('stat-asteroids'),
        statTime:        document.getElementById('stat-time'),
        statWeapon:      document.getElementById('stat-weapon')
    },

    showScreen(screenId) {
        Object.values(this.screens).forEach(screen => {
            if (screen) {
                screen.classList.remove('active');
                screen.classList.add('hidden');
            }
        });
        if (this.screens[screenId]) {
            this.screens[screenId].classList.remove('hidden');
            this.screens[screenId].classList.add('active');
        }
    },

    updateHUD(score, health, shield, comboMultiplier = 1) {
        if (this.elements.score) {
            this.elements.score.innerText = score.toString().padStart(7, '0');
        }

        if (this.elements.comboMultiplier) {
            if (comboMultiplier > 1) {
                this.elements.comboMultiplier.innerText = `x${comboMultiplier}`;
                this.elements.comboMultiplier.className = `combo-multiplier level-${comboMultiplier}`;
            } else {
                this.elements.comboMultiplier.innerText = '';
                this.elements.comboMultiplier.className = 'combo-multiplier';
            }
        }

        const healthPercent = Math.max(0, Math.min(1, health / CONFIG.Player.maxHealth));
        if (this.elements.healthBar) {
            this.elements.healthBar.style.setProperty('--scale', healthPercent);
            // Cambiar color según salud
            if (healthPercent < 0.25) {
                this.elements.healthBar.classList.add('critical');
            } else {
                this.elements.healthBar.classList.remove('critical');
            }
        }

        const shieldPercent = Math.max(0, Math.min(1, shield / CONFIG.Player.maxShield));
        if (this.elements.shieldBar) {
            this.elements.shieldBar.style.setProperty('--scale', shieldPercent);
        }
    },

    updateLevel(level) {
        if (this.elements.levelText) {
            this.elements.levelText.innerText = `NIVEL ${level}`;
        }
    },

    updateLevelText(text) {
        if (this.elements.levelText) {
            this.elements.levelText.innerText = text;
        }
    },

    updateSurvivalTime(seconds) {
        if (this.elements.survivalTimer) {
            const min = Math.floor(seconds / 60);
            const sec = seconds % 60;
            this.elements.survivalTimer.innerText = `${min}:${String(sec).padStart(2, '0')}`;
        }
    },

    updateWeapon(weaponDef, ammoLeft) {
        if (!weaponDef) return;
        if (this.elements.weaponIcon) this.elements.weaponIcon.innerText = weaponDef.icon || '⚡';
        if (this.elements.weaponName) {
            this.elements.weaponName.innerText = weaponDef.name || 'Láser';
            this.elements.weaponName.style.color = weaponDef.color || '#00ffff';
        }
        // Mostrar munición restante si el arma tiene límite
        const ammoEl = document.getElementById('weapon-ammo');
        if (ammoEl) {
            if (ammoLeft !== undefined && ammoLeft !== Infinity && ammoLeft !== null) {
                ammoEl.innerText = `✦ ${ammoLeft}`;
                ammoEl.style.color = ammoLeft <= 2 ? '#ff4444' : (weaponDef.color || '#aaa');
                ammoEl.classList.remove('hidden');
            } else {
                ammoEl.innerText = '∞';
                ammoEl.style.color = '#555';
                ammoEl.classList.remove('hidden');
            }
        }
    },

    showGameOver(score, stats) {
        this.showScreen('game-over-screen');
        if (this.elements.finalScore) this.elements.finalScore.innerText = score.toLocaleString();
        
        if (stats) {
            if (this.elements.statAsteroids) this.elements.statAsteroids.innerText = stats.asteroidsDestroyed || 0;
            if (this.elements.statTime) {
                const totalSec = Math.floor(stats.timePlayed);
                const min = Math.floor(totalSec / 60);
                const sec = totalSec % 60;
                this.elements.statTime.innerText = `${min}:${String(sec).padStart(2, '0')}`;
            }
            if (this.elements.statWeapon && stats.weaponShots) {
                let favWep = 'Ninguna';
                let maxShots = 0;
                for (const w in stats.weaponShots) {
                    if (stats.weaponShots[w] > maxShots) {
                        maxShots = stats.weaponShots[w];
                        favWep = w;
                    }
                }
                this.elements.statWeapon.innerText = favWep;
            }
        }

        // Guardar high score
        const prev = parseInt(localStorage.getItem('highScore') || '0');
        if (score > prev) localStorage.setItem('highScore', score);
        const hs = parseInt(localStorage.getItem('highScore') || '0');
        if (this.elements.highScoreDisplay) {
            this.elements.highScoreDisplay.innerText = `Récord: ${hs.toLocaleString()}`;
        }
        if (this.elements.menuHighScoreDisplay) {
            this.elements.menuHighScoreDisplay.innerText = `Récord: ${hs.toLocaleString()}`;
        }
    },

    showLevelComplete(level) {
        this.showScreen('level-complete-screen');
        const el = document.getElementById('completed-level-num');
        if (el) el.innerText = level;
    },

    showPowerUpNotification(text, color) {
        const el = this.elements.powerupNotif;
        if (!el) return;
        el.innerText = text;
        el.style.color = color || '#fff';
        el.style.borderColor = color || '#fff';
        el.style.boxShadow = `0 0 20px ${color || '#fff'}`;
        el.classList.remove('hidden');
        el.classList.add('show');
        clearTimeout(this._notifTimer);
        this._notifTimer = setTimeout(() => {
            el.classList.remove('show');
            el.classList.add('hidden');
        }, 2200);
    }
};
