// ============================================================
// GAME.JS - Lógica central optimizada
// ============================================================

class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.input = new Input();
        this.state = 'MENU'; // MENU, PLAYING, PAUSED, GAMEOVER, LEVEL_COMPLETE

        this.lastTime = performance.now();
        this._rafId = null;       // ID del requestAnimationFrame activo
        this._running = false;    // Evitar loops dobles

        // Entidades
        this.player = null;
        this.asteroids = [];
        this.projectiles = [];
        this.particles = [];
        this.enemies = [];
        this.powerups = [];

        // Pools
        this.particlePool = new Pool(() => new Particle(0, 0, {}), 600);
        this.projectilePool = new Pool(() => new Projectile(0, 0, 0, 'player'), 200);

        this.score = 0;
        this.level = 1;
        this.survivalTime = 0;
        
        this.comboMultiplier = 1;
        this.comboTimer = 0;
        this.damageFlashTimer = 0;
        this.gameOverDelayTimer = 0;
        this.stats = { asteroidsDestroyed: 0, timePlayed: 0, weaponShots: {} };

        // Notificación de power-up
        this.powerUpNotification = null;
        this.powerUpNotificationTimer = 0;

        // Missile targeting manual
        this.missileTarget = null;       // asteroide seleccionado manualmente
        this._missileTargetIndex = -1;   // índice en this.asteroids
        this._gKeyWasDown = false;       // para detectar flanco de G

        // Cache de UI para evitar actualizaciones DOM innecesarias
        this._lastScore = -1;
        this._lastHealth = -1;
        this._lastShield = -1;
        this._lastWeaponKey = null;
        this._lastSurvivalSec = -1;

        // Dimensiones cacheadas para evitar window.innerWidth cada frame
        this.W = this.canvas.width;
        this.H = this.canvas.height;

        // Fricción precalculada (reemplaza Math.pow cada frame)
        this._frictionDt1 = Math.pow(CONFIG.Player.friction, 1);

        // Binding
        this.loop = this.loop.bind(this);
    }

    resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.canvas.style.width  = w + 'px';
        this.canvas.style.height = h + 'px';
        this.canvas.width  = w;
        this.canvas.height = h;
        // Actualizar dimensiones cacheadas
        this.W = w;
        this.H = h;
        if (this.ctx) {
            this.ctx.imageSmoothingEnabled = false;
        }
        if (typeof Renderer !== 'undefined') Renderer.initialized = false;
    }

    _startLoop() {
        // Cancelar cualquier loop previo y arrancar uno nuevo
        this._running = true;
        if (this._rafId) cancelAnimationFrame(this._rafId);
        this.lastTime = performance.now();
        this._rafId = requestAnimationFrame(this.loop);
    }

    _stopLoop() {
        this._running = false;
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
    }

    start(mode = 'campaign', startLevel = 1) {
        this.mode = mode;
        this.reset();

        if (mode === 'campaign' && startLevel > 1) {
            this.level = startLevel;
            this.asteroids = [];
            for (let i = 0; i < 4 + this.level; i++) {
                this.spawnAsteroid(3);
            }
        }

        this.state = 'PLAYING';
        UI.showScreen('hud');
        if (this.mode === 'survival') {
            UI.updateLevelText('☠ Supervivencia');
        } else {
            UI.updateLevel(this.level);
        }
        UI.updateWeapon(this.player.weaponDef);
        this._lastWeaponKey = this.player.currentWeaponKey;

        AudioController.playBGM('music_gameplay');
        this._startLoop();
    }

    nextLevel() {
        this.level++;
        this.state = 'PLAYING';
        UI.showScreen('hud');
        UI.updateLevel(this.level);
        // Ocultar timer de supervivencia en campaña
        const timerEl = document.getElementById('survival-timer');
        if (timerEl) timerEl.classList.add('hidden');

        this.asteroids = [];
        this.projectiles = [];
        this.powerups = [];
        this.enemies = [];
        this.bossSpawned = false; // resetear para que el jefe pueda reaparecer en nuevos niveles múltiplo de 3
        // Limpiar caché de UI para forzar refresco
        this._lastScore = -1;
        this._lastHealth = -1;
        this._lastShield = -1;

        for (let i = 0; i < 4 + this.level; i++) {
            this.spawnAsteroid(3);
        }

        this.lastTime = performance.now();
        this._startLoop();
    }

    reset() {
        this.player = new Player(this.W / 2, this.H / 2);
        this.asteroids = [];
        this.projectiles = [];
        this.particles = [];
        this.enemies = [];
        this.powerups = [];
        this.score = 0;
        this.level = 1;
        this.survivalTime = 0;
        
        this.comboMultiplier = 1;
        this.comboTimer = 0;
        this.damageFlashTimer = 0;
        this.gameOverDelayTimer = 0;
        this.stats = { asteroidsDestroyed: 0, timePlayed: 0, weaponShots: {} };
        
        this.powerUpNotification = null;
        this.powerUpNotificationTimer = 0;
        // Invalidar cache de UI
        this._lastScore = -1;
        this._lastHealth = -1;
        this._lastShield = -1;
        this._lastWeaponKey = null;
        this._lastSurvivalSec = -1;

        for (let i = 0; i < 4; i++) {
            this.spawnAsteroid(3);
        }
    }

    spawnAsteroid(size, x, y) {
        const W = this.W, H = this.H;
        let ax = x !== undefined ? x : Math.random() * W;
        let ay = y !== undefined ? y : Math.random() * H;

        if (x === undefined && y === undefined && this.player) {
            let tries = 0;
            const px = this.player.x, py = this.player.y;
            while (tries < 20) {
                const dx = ax - px, dy = ay - py;
                if (dx * dx + dy * dy >= 220 * 220) break;
                ax = Math.random() * W;
                ay = Math.random() * H;
                tries++;
            }
        }

        this.asteroids.push(new Asteroid(ax, ay, size, W, H));
    }

    spawnBoss() {
        const W = this.W, H = this.H;
        // Spawnear el jefe en el centro de la parte superior
        const boss = new Boss(W / 2, 100);
        this.enemies.push(boss);
        this.showPowerUpNotification('¡JEFE ACERCÁNDOSE!', '#ff3333');
    }

    spawnProjectile(x, y, angle, type, weaponDef) {
        const p = this.projectilePool.get();
        p.x = x;
        p.y = y;
        p.angle = angle;
        p.rotation = angle;
        p.type = type;
        p.weaponDef = weaponDef || WEAPON_TYPES.LASER;
        p.life = p.weaponDef.projectileLife;
        p.maxLife = p.life;
        p.damage = p.weaponDef.damage;
        p.active = true;
        const speed = p.weaponDef.speed;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p._trailPoints = [];
        // Asignar target si es misil y hay un objetivo seleccionado
        if (p.weaponDef.homing && type === 'player') {
            p.target = this.missileTarget || null;
        } else {
            p.target = null;
        }
        this.projectiles.push(p);
    }

    spawnParticle(x, y, options) {
        // Limitar partículas para mantener rendimiento
        if (this.particles.length >= 400) return;
        const p = this.particlePool.get();
        p.x = x;
        p.y = y;
        p.vx = options.vx || 0;
        p.vy = options.vy || 0;
        p.life = options.life || 30;
        p.maxLife = p.life;
        p.color = options.color || '#fff';
        p.radius = options.size || 2;
        p.friction = options.friction || 0.97;
        p.gravity = options.gravity || 0;
        p.active = true;
        this.particles.push(p);
    }

    createExplosion(x, y, count, color, bigExplosion) {
        // Reducir conteo de partículas para mantener rendimiento
        const maxCount = bigExplosion ? Math.min(count, 18) : Math.min(count, 12);
        for (let i = 0; i < maxCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * (bigExplosion ? 7 : 4);
            this.spawnParticle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: (bigExplosion ? 30 : 20) + Math.random() * (bigExplosion ? 30 : 20),
                color: color || '#fff',
                size: 1 + Math.random() * (bigExplosion ? 3 : 2),
                friction: 0.94
            });
        }
        // Destellos (reducidos)
        const flashCount = Math.floor(maxCount * 0.3);
        for (let i = 0; i < flashCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            this.spawnParticle(x, y, {
                vx: Math.cos(angle) * (3 + Math.random() * 7),
                vy: Math.sin(angle) * (3 + Math.random() * 7),
                life: 10 + Math.random() * 15,
                color: '#ffffff',
                size: 0.5 + Math.random(),
                friction: 0.91
            });
        }
    }

    spawnPowerUp(x, y) {
        if (Math.random() < 0.30) {
            this.powerups.push(new PowerUp(x, y));
        }
    }

    showPowerUpNotification(text, color) {
        this.powerUpNotification = { text, color };
        this.powerUpNotificationTimer = 150;
        UI.showPowerUpNotification(text, color);
    }

    update(dt) {
        if (this.state !== 'PLAYING') return;

        if (this.input.isDown('Escape') || this.input.isDown('KeyP')) {
            this.state = 'PAUSED';
            this.input.clearAll(); // Evitar teclas "pegadas" al reanudar
            UI.showScreen('pause-screen');
            return;
        }

        // Tecla G: ciclar objetivo del misil (solo cuando el arma activa es MISSILE)
        const gDown = this.input.isDown('KeyG');
        if (gDown && !this._gKeyWasDown && this.player && this.player.currentWeaponKey === 'MISSILE') {
            this._cycleMissileTarget();
        }
        this._gKeyWasDown = gDown;

        // Auto-seleccionar objetivo cuando se activa el arma MISSILE por primera vez
        if (this.player && this.player.currentWeaponKey === 'MISSILE' && this._lastWeaponKey !== 'MISSILE') {
            // Se acaba de cambiar al misil: seleccionar el asteroide más cercano automáticamente
            this._autoSelectMissileTarget();
        }

        // Si el objetivo actual ya no es activo, buscar el siguiente automáticamente
        if (this.missileTarget && !this.missileTarget.active) {
            this.missileTarget = null;
            this._missileTargetIndex = -1;
            if (this.player && this.player.currentWeaponKey === 'MISSILE') {
                this._autoSelectMissileTarget();
            }
        }

        this.stats.timePlayed += dt;

        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.comboMultiplier = 1;
            }
        }
        if (this.damageFlashTimer > 0) {
            this.damageFlashTimer -= dt;
        }

        if (this.gameOverDelayTimer > 0) {
            this.gameOverDelayTimer -= dt;
            if (this.gameOverDelayTimer <= 0) {
                this.state = 'GAMEOVER';
                UI.showGameOver(this.score, this.stats);
            }
        }

        const W = this.W, H = this.H;

        this.player.update(dt, this.input, this, W, H);

        const asteroids = this.asteroids;
        const projectiles = this.projectiles;
        const particles = this.particles;
        const powerups = this.powerups;

        for (let i = 0; i < asteroids.length; i++) asteroids[i].update(dt, W, H);
        for (let i = 0; i < projectiles.length; i++) projectiles[i].update(dt, W, H, asteroids);
        for (let i = 0; i < particles.length; i++) particles[i].update(dt);
        for (let i = 0; i < powerups.length; i++) powerups[i].update(dt, W, H);
        for (let i = 0; i < this.enemies.length; i++) this.enemies[i].update(dt, W, H, this);

        this.checkCollisions();

        // Limpieza en-lugar (sin crear nuevos arrays si es posible)
        this._filterActive(asteroids, null);
        this._filterActive(projectiles, this.projectilePool);
        this._filterActive(particles, this.particlePool);
        this._filterActive(powerups, null);
        this._filterActive(this.enemies, null);

        // --- LÓGICA DE OLEADAS ---
        if (this.mode === 'survival') {
            this.survivalTime += dt;

            const maxAsteroids = CONFIG.Survival.maxAsteroids;
            if (asteroids.length < maxAsteroids) {
                const timeFactor = this.survivalTime / 3600;
                const spawnRate = Math.min(
                    CONFIG.Survival.maxRate,
                    CONFIG.Survival.initialRate + timeFactor * 0.015
                );
                if (Math.random() < spawnRate * dt) {
                    const size = Math.random() < 0.6 ? 3 : (Math.random() < 0.6 ? 2 : 1);
                    this.spawnAsteroid(size);
                }
            }

            if (asteroids.length < 2) this.spawnAsteroid(3);

            // Actualizar timer solo cuando cambia el segundo
            const sec = Math.floor(this.survivalTime / 60);
            if (sec !== this._lastSurvivalSec) {
                this._lastSurvivalSec = sec;
                UI.updateSurvivalTime(sec);
            }

        } else {
            if (asteroids.length === 0) {
                if (this.level % 3 === 0 && this.enemies.length === 0 && !this.bossSpawned) {
                    this.spawnBoss();
                    this.bossSpawned = true;
                } else if (this.enemies.length === 0) {
                    this.state = 'LEVEL_COMPLETE';
                    AudioController.play('Level_Win');
                    UI.showLevelComplete(this.level);

                    let maxLevel = parseInt(localStorage.getItem('maxLevel') || '1');
                    if (this.level + 1 > maxLevel) {
                        localStorage.setItem('maxLevel', this.level + 1);
                    }
                }
            }
        }

        // Actualizar HUD solo si hay cambios (evitar thrashing del DOM)
        const h = this.player.health | 0;
        const s = this.player.shield | 0;
        if (this.score !== this._lastScore || h !== this._lastHealth || s !== this._lastShield || this.comboMultiplier !== this._lastComboMultiplier) {
            UI.updateHUD(this.score, h, s, this.comboMultiplier);
            this._lastScore = this.score;
            this._lastHealth = h;
            this._lastShield = s;
            this._lastComboMultiplier = this.comboMultiplier;
        }

        const wk = this.player.currentWeaponKey;
        const ammo = this.player.ammoLeft;
        if (wk !== this._lastWeaponKey || ammo !== this._lastAmmo) {
            UI.updateWeapon(this.player.weaponDef, ammo);
            this._lastAmmo = ammo;
        }

        // Limpiar missileTarget solo cuando se abandona el arma MISSILE
        if (wk !== 'MISSILE' && this._lastWeaponKey === 'MISSILE') {
            this.missileTarget = null;
            this._missileTargetIndex = -1;
        }

        // Siempre actualizar al final para que la comparación de "primer frame MISSILE" funcione
        this._lastWeaponKey = wk;
    }

    // Selecciona automáticamente el asteroide más cercano al jugador
    _autoSelectMissileTarget() {
        const asteroids = this.asteroids.filter(a => a.active);
        if (asteroids.length === 0 || !this.player) {
            this.missileTarget = null;
            this._missileTargetIndex = -1;
            return;
        }
        const px = this.player.x, py = this.player.y;
        let nearest = null, nearestDist = Infinity;
        for (let i = 0; i < asteroids.length; i++) {
            const a = asteroids[i];
            const dx = a.x - px, dy = a.y - py;
            const dist = dx * dx + dy * dy;
            if (dist < nearestDist) { nearestDist = dist; nearest = a; }
        }
        if (nearest) {
            this.missileTarget = nearest;
            this._missileTargetIndex = asteroids.indexOf(nearest);
        }
    }

    // Cicla el objetivo del misil al siguiente asteroide activo
    _cycleMissileTarget() {
        const asteroids = this.asteroids.filter(a => a.active);
        if (asteroids.length === 0) {
            this.missileTarget = null;
            this._missileTargetIndex = -1;
            return;
        }

        let currentIdx = -1;
        if (this.missileTarget) {
            currentIdx = asteroids.indexOf(this.missileTarget);
        }

        const nextIdx = (currentIdx + 1) % asteroids.length;
        this.missileTarget = asteroids[nextIdx];
        this._missileTargetIndex = nextIdx;

        this.showPowerUpNotification('🎯 Objetivo bloqueado', '#ff8800');
    }

    // Filtrado eficiente in-place sin crear arrays nuevos
    _filterActive(arr, pool) {
        let write = 0;
        for (let read = 0; read < arr.length; read++) {
            const item = arr[read];
            if (item.active) {
                arr[write++] = item;
            } else if (pool) {
                pool.release(item);
            }
        }
        arr.length = write;
    }

    checkCollisions() {
        const projectiles = this.projectiles;
        const asteroids = this.asteroids;
        const player = this.player;

        // Balas vs Asteroides
        for (let pi = 0; pi < projectiles.length; pi++) {
            const p = projectiles[pi];
            if (!p.active || p.type !== 'player') continue;

            for (let ai = 0; ai < asteroids.length; ai++) {
                const a = asteroids[ai];
                if (!a.active) continue;

                // Colisión círculo sin Math.hypot (más rápido: dx²+dy² vs r²)
                const dx = p.x - a.x;
                const dy = p.y - a.y;
                const r = p.radius + a.radius;
                if (dx * dx + dy * dy < r * r) {
                    p.active = false;
                    a.active = false;
                    this.stats.asteroidsDestroyed++;
                    const diff = CONFIG.getDifficulty();
                    this.score += Math.floor(100 * a.size * (this.mode === 'survival' ? 2 : 1) * this.comboMultiplier * diff.scoreMult);

                    // Ganar cristales: 1 por asteroide grande, ocasionalmente en medianos
                    if (a.size === 3 || (a.size === 2 && Math.random() < 0.25)) {
                        const gained = a.size === 3 ? 1 : 1;
                        const cur = parseInt(localStorage.getItem('crystals') || '0');
                        localStorage.setItem('crystals', cur + gained);
                    }

                    this.comboTimer = CONFIG.Combo.timerFrames;
                    if (this.comboMultiplier < CONFIG.Combo.maxLevel) {
                        this.comboMultiplier++;
                    }

                    this.createExplosion(a.x, a.y, 15 + a.size * 5, a.color, a.size === 3);
                    AudioController.play('Enemy_Died');

                    // Misil: destruye completamente el asteroide (también los pequeños)
                    const isMissile = p.weaponDef && p.weaponDef.id === 'MISSILE';
                    if (a.size > 1 && !isMissile) {
                        this.spawnAsteroid(a.size - 1, a.x, a.y);
                        this.spawnAsteroid(a.size - 1, a.x, a.y);
                    } else if (a.size > 1 && isMissile) {
                        // El misil también destruye los fragmentos hijos
                        // Mostrar efecto más grande
                        this.createExplosion(a.x, a.y, 25, '#ff8800', true);
                    }
                    if (a.size === 3) this.spawnPowerUp(a.x, a.y);
                    break;
                }
            }

            // Balas vs Enemigos (Jefe)
            if (p.active) {
                for (let ei = 0; ei < this.enemies.length; ei++) {
                    const e = this.enemies[ei];
                    if (!e.active) continue;

                    const dx = p.x - e.x;
                    const dy = p.y - e.y;
                    const r = p.radius + e.radius;
                    if (dx * dx + dy * dy < r * r) {
                        p.active = false;
                        e.health -= p.damage;
                        
                        // Pequeña explosión de impacto
                        this.createExplosion(p.x, p.y, 5, p.weaponDef.color, false);
                        
                        if (e.health <= 0) {
                            e.active = false;
                            this.createExplosion(e.x, e.y, 100, e.color, true);
                            AudioController.play('Enemy_Died');
                            this.score += 5000;
                        }
                        break;
                    }
                }
            }
        }

        // Jugador vs Asteroides
        if (player.active && player.invincibilityTimer <= 0) {
            const px = player.x, py = player.y, pr = player.radius;
            for (let ai = 0; ai < asteroids.length; ai++) {
                const a = asteroids[ai];
                if (!a.active) continue;
                const dx = px - a.x;
                const dy = py - a.y;
                const r = pr + a.radius;
                if (dx * dx + dy * dy < r * r) {
                    player.takeDamage(20);
                    a.active = false;
                    this.createExplosion(a.x, a.y, 15, a.color, false);
                    AudioController.play('Player_Lost_Life');

                    this.comboMultiplier = 1;
                    this.damageFlashTimer = 5;

                    if (player.health <= 0 && this.gameOverDelayTimer <= 0) {
                        player.active = false;
                        this.gameOverDelayTimer = 90; // ~1.5s a 60fps
                        this.createExplosion(px, py, 50, CONFIG.Colors.player, true);
                        AudioController.play('Game_Over');
                        AudioController.stopBGM();
                    }
                    break;
                }
            }

            // Jugador vs Balas Enemigas
            if (player.health > 0) {
                for (let pi = 0; pi < projectiles.length; pi++) {
                    const p = projectiles[pi];
                    if (!p.active || p.type !== 'enemy') continue;

                    const dx = px - p.x;
                    const dy = py - p.y;
                    const r = pr + p.radius;
                    if (dx * dx + dy * dy < r * r) {
                        player.takeDamage(p.damage);
                        p.active = false;
                        this.createExplosion(p.x, p.y, 5, p.weaponDef.color, false);
                        AudioController.play('Player_Lost_Life');
                        
                        this.comboMultiplier = 1;
                        this.damageFlashTimer = 5;

                        if (player.health <= 0 && this.gameOverDelayTimer <= 0) {
                            player.active = false;
                            this.gameOverDelayTimer = 90;
                            this.createExplosion(px, py, 50, CONFIG.Colors.player, true);
                            AudioController.play('Game_Over');
                            AudioController.stopBGM();
                        }
                        break;
                    }
                }
            }
        }

        // Jugador vs Power-Ups
        const powerups = this.powerups;
        const px = player.x, py = player.y, pr = player.radius;
        for (let i = 0; i < powerups.length; i++) {
            const pw = powerups[i];
            if (!pw.active) continue;
            const dx = px - pw.x;
            const dy = py - pw.y;
            const r = pr + pw.radius;
            if (dx * dx + dy * dy < r * r) {
                pw.active = false;
                pw.applyToPlayer(player, this);
                if (pw.def.type === 'weapon') {
                    AudioController.play('Powerup_Weapon');
                } else if (pw.def.type === 'stat') {
                    AudioController.play('Powerup_Health');
                } else {
                    AudioController.play('Powerup_Speed');
                }
            }
        }
    }

    draw() {
        const ctx = this.ctx;
        const W = this.W, H = this.H;

        ctx.fillStyle = CONFIG.Colors.bg || '#050510';
        ctx.fillRect(0, 0, W, H);

        Renderer.drawBackground(ctx, W, H);

        if (this.state === 'PLAYING' || this.state === 'PAUSED') {
            // Dibujar partículas con batch de globalAlpha
            const particles = this.particles;
            for (let i = 0; i < particles.length; i++) particles[i].draw(ctx);
            ctx.globalAlpha = 1;

            const powerups = this.powerups;
            for (let i = 0; i < powerups.length; i++) powerups[i].draw(ctx);
            ctx.globalAlpha = 1;

            const projectiles = this.projectiles;
            for (let i = 0; i < projectiles.length; i++) projectiles[i].draw(ctx);
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;

            const asteroids = this.asteroids;
            for (let i = 0; i < asteroids.length; i++) {
                asteroids[i].draw(ctx);
                
                // Draw offscreen indicators
                const a = asteroids[i];
                if (a.x < 0 || a.x > W || a.y < 0 || a.y > H) {
                    this._drawOffscreenIndicator(ctx, a, W, H);
                }
            }

            const enemies = this.enemies;
            for (let i = 0; i < enemies.length; i++) {
                enemies[i].draw(ctx);
                if (enemies[i].x < 0 || enemies[i].x > W || enemies[i].y < 0 || enemies[i].y > H) {
                    this._drawOffscreenIndicator(ctx, enemies[i], W, H);
                }
            }

            if (this.player && this.player.health > 0 && this.player.active) {
                this.player.draw(ctx);
            }

            // Dibujar cuadro de targeting del misil
            if (this.missileTarget && this.missileTarget.active && this.player && this.player.currentWeaponKey === 'MISSILE') {
                this._drawMissileTarget(ctx, this.missileTarget);
            }

            if (this.damageFlashTimer > 0) {
                ctx.fillStyle = `rgba(255, 0, 0, ${this.damageFlashTimer / 10})`;
                ctx.fillRect(0, 0, W, H);
            }

            // Asegurar limpieza de estado del canvas al final del frame
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;

            this._drawMinimap();
        }
    }

    _drawMinimap() {
        const miniCanvas = document.getElementById('minimap-canvas');
        if (!miniCanvas) return;
        const mctx = miniCanvas.getContext('2d');
        const W = this.W, H = this.H;
        const mw = miniCanvas.width, mh = miniCanvas.height;
        
        mctx.clearRect(0, 0, mw, mh);
        
        // Background
        mctx.fillStyle = 'rgba(0, 0, 10, 0.5)';
        mctx.fillRect(0, 0, mw, mh);

        // Draw asteroids
        mctx.fillStyle = '#ff3344';
        for (let i = 0; i < this.asteroids.length; i++) {
            const a = this.asteroids[i];
            const ax = (a.x / W) * mw;
            const ay = (a.y / H) * mh;
            mctx.beginPath();
            mctx.arc(ax, ay, a.size * 1.5, 0, Math.PI * 2);
            mctx.fill();
        }

        // Draw player
        if (this.player && this.player.health > 0) {
            const px = (this.player.x / W) * mw;
            const py = (this.player.y / H) * mh;
            mctx.fillStyle = '#00ffff';
            mctx.beginPath();
            mctx.arc(px, py, 3, 0, Math.PI * 2);
            mctx.fill();
        }
        
        // Draw enemies
        mctx.fillStyle = '#ff3333';
        for (let i = 0; i < this.enemies.length; i++) {
            const e = this.enemies[i];
            const ex = (e.x / W) * mw;
            const ey = (e.y / H) * mh;
            mctx.beginPath();
            mctx.arc(ex, ey, 4, 0, Math.PI * 2);
            mctx.fill();
        }
    }

    _drawOffscreenIndicator(ctx, asteroid, W, H) {
        if (!this.player) return;
        const dx = asteroid.x - this.player.x;
        const dy = asteroid.y - this.player.y;
        const angle = Math.atan2(dy, dx);
        
        let ix = asteroid.x;
        let iy = asteroid.y;
        
        if (ix < 0) ix = 20;
        else if (ix > W) ix = W - 20;
        if (iy < 0) iy = 20;
        else if (iy > H) iy = H - 20;

        ctx.save();
        ctx.translate(ix, iy);
        ctx.rotate(angle);
        ctx.fillStyle = 'rgba(255, 50, 50, 0.6)';
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-5, 5);
        ctx.lineTo(-5, -5);
        ctx.fill();
        ctx.restore();
    }

    // Dibuja un cuadro de targeting animado alrededor del asteroide objetivo del misil
    _drawMissileTarget(ctx, asteroid) {
        const t = Date.now() / 600; // animación de pulso
        const pulse = 0.6 + Math.abs(Math.sin(t)) * 0.4;
        const r = asteroid.radius + 10 + Math.sin(t * 2) * 3;
        const cornerSize = 10;

        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = '#ff8800';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff8800';

        const x = asteroid.x | 0;
        const y = asteroid.y | 0;

        // Cuatro esquinas del cuadro
        // Superior-izquierda
        ctx.beginPath();
        ctx.moveTo(x - r, y - r + cornerSize);
        ctx.lineTo(x - r, y - r);
        ctx.lineTo(x - r + cornerSize, y - r);
        ctx.stroke();
        // Superior-derecha
        ctx.beginPath();
        ctx.moveTo(x + r - cornerSize, y - r);
        ctx.lineTo(x + r, y - r);
        ctx.lineTo(x + r, y - r + cornerSize);
        ctx.stroke();
        // Inferior-derecha
        ctx.beginPath();
        ctx.moveTo(x + r, y + r - cornerSize);
        ctx.lineTo(x + r, y + r);
        ctx.lineTo(x + r - cornerSize, y + r);
        ctx.stroke();
        // Inferior-izquierda
        ctx.beginPath();
        ctx.moveTo(x - r + cornerSize, y + r);
        ctx.lineTo(x - r, y + r);
        ctx.lineTo(x - r, y + r - cornerSize);
        ctx.stroke();

        // Línea desde el jugador al objetivo
        if (this.player) {
            ctx.globalAlpha = pulse * 0.3;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.moveTo(this.player.x | 0, this.player.y | 0);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Etiqueta "TARGET"
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#ff8800';
        ctx.font = 'bold 10px Orbitron, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('TARGET', x, y - r - 6);

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    loop(currentTime) {
        const rawDt = (currentTime - this.lastTime) / (1000 / 60);
        const dt = Math.min(rawDt, 3);
        this.lastTime = currentTime;

        // Reanudar desde pausa con P o ESC (debe detectarse aquí porque update() retorna early en PAUSED)
        if (this.state === 'PAUSED') {
            if (this.input.isDown('KeyP') || this.input.isDown('Escape')) {
                this.state = 'PLAYING';
                this.input.clearAll();
                UI.showScreen('hud');
            }
        }

        this.update(dt);
        this.draw();

        this._rafId = requestAnimationFrame(this.loop);
    }
}
