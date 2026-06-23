// ============================================================
// PLAYER.JS - Optimizado: shadowBlur reducido, Math.pow eliminado
// ============================================================

class Player extends Entity {
    constructor(x, y) {
        super(x, y, CONFIG.Player.hitboxRadius);
        const diff = CONFIG.getDifficulty();
        this.health = CONFIG.Player.maxHealth * diff.playerHealthMult;
        this.shield = CONFIG.Player.maxShield;
        this.shootTimer = 0;
        this.invincibilityTimer = 0;

        this.currentWeaponKey = 'LASER';
        this.weaponDef = WEAPON_TYPES.LASER;
        this.ammoLeft = Infinity;  // Láser no tiene límite

        this.timedEffects = {};

        this.thrusterLevel = 0;
        this.thrusterParticleTimer = 0;

        // Pre-calcular fricción base (ahora se usa multiplicación en vez de Math.pow)
        this._baseFriction = CONFIG.Player.friction;

        this._buildShapePoints();

        // Offscreen canvas para la nave (re-build solo cuando cambia color/estado)
        this._shipCache = null;
        this._shipCacheState = '';  // key para invalidar el cache
        this._buildShipCache('#00ffff', false, false);
    }

    _buildShapePoints() {
        this.shapeMain = [
            { x: 24,  y: 0  },
            { x: 8,   y: -7 },
            { x: -4,  y: -12 },
            { x: -18, y: -16 },
            { x: -12, y: -5 },
            { x: -14, y: 0 },
            { x: -12, y: 5  },
            { x: -18, y: 16 },
            { x: -4,  y: 12 },
            { x: 8,   y: 7  }
        ];
        this.shapeCockpit = [
            { x: 18, y: 0 }, { x: 12, y: -4 }, { x: 8, y: -5 },
            { x: 6, y: 0 }, { x: 8, y: 5 }, { x: 12, y: 4 }
        ];
    }

    // Pre-renderiza la nave en un canvas offscreen para evitar shadowBlur cada frame
    _buildShipCache(color, isInvincible, isSpeedBoost) {
        const size = 60; // canvas offscreen de 60x60 centrado en 30,30
        const oc = document.createElement('canvas');
        oc.width = size;
        oc.height = size;
        const c = oc.getContext('2d');
        c.translate(30, 30); // centro

        const glowColor = isInvincible ? '#ffffff' : color;

        // Escudo (si corresponde, se dibuja en el draw() dinámico)
        // Cuerpo principal con glow
        c.shadowBlur = 15;
        c.shadowColor = glowColor;
        c.strokeStyle = color;
        c.lineWidth = 2;
        c.beginPath();
        const sm = this.shapeMain;
        c.moveTo(sm[0].x, sm[0].y);
        for (let i = 1; i < sm.length; i++) c.lineTo(sm[i].x, sm[i].y);
        c.closePath();
        c.stroke();
        c.fillStyle = color + '18';
        c.fill();

        // Cabina
        c.shadowBlur = 8;
        c.shadowColor = '#ffffff';
        c.strokeStyle = '#ffffff';
        c.lineWidth = 1;
        c.beginPath();
        const sc = this.shapeCockpit;
        c.moveTo(sc[0].x, sc[0].y);
        for (let i = 1; i < sc.length; i++) c.lineTo(sc[i].x, sc[i].y);
        c.closePath();
        c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.1)';
        c.fill();

        // Líneas de alas
        c.lineWidth = 1;
        c.shadowBlur = 5;
        c.shadowColor = glowColor;
        c.strokeStyle = color + 'aa';
        c.beginPath();
        c.moveTo(2, -8); c.lineTo(-10, -13);
        c.moveTo(2, 8);  c.lineTo(-10, 13);
        c.stroke();

        c.shadowBlur = 0;
        this._shipCache = oc;
    }

    setWeapon(weaponKey) {
        if (WEAPON_TYPES[weaponKey]) {
            this.currentWeaponKey = weaponKey;
            this.weaponDef = WEAPON_TYPES[weaponKey];
            this.shootTimer = 0;
            // Restaurar munición al cambiar de arma
            const ammo = this.weaponDef.ammo;
            this.ammoLeft = (ammo === Infinity || ammo === undefined) ? Infinity : ammo;
        }
    }

    applyTimedEffect(stat, duration) {
        this.timedEffects[stat] = duration;
    }

    update(dt, input, game, W, H) {
        if (this.invincibilityTimer > 0) this.invincibilityTimer -= dt;
        for (const key in this.timedEffects) {
            this.timedEffects[key] -= dt;
            if (this.timedEffects[key] <= 0) delete this.timedEffects[key];
        }

        const diff = CONFIG.getDifficulty();
        const speedMult = this.timedEffects['speed'] ? 1.7 : 1.0;
        const effectiveMaxSpeed = CONFIG.Player.maxSpeed * speedMult * diff.playerSpeedMult;
        const effectiveAccel = CONFIG.Player.acceleration * speedMult * diff.playerSpeedMult;

        // Rotación
        let rotDir = 0;
        if (input.isDown('ArrowLeft') || input.isDown('KeyA')) rotDir = -1;
        if (input.isDown('ArrowRight') || input.isDown('KeyD')) rotDir = 1;
        this.rotation += rotDir * CONFIG.Player.rotationSpeed * dt;

        // Aceleración
        const thrusting = input.isDown('ArrowUp') || input.isDown('KeyW');
        let braking = input.isDown('ArrowDown') || input.isDown('KeyS');
        
        // Solo permitir retroceder/frenar cuando aparezca el jefe
        const bossActive = game && game.enemies && game.enemies.length > 0;
        if (braking && !bossActive) {
            braking = false;
        }

        if (thrusting) {
            this.vx += Math.cos(this.rotation) * effectiveAccel * dt;
            this.vy += Math.sin(this.rotation) * effectiveAccel * dt;
            this.thrusterLevel = Math.min(1, this.thrusterLevel + 0.15);
        } else if (braking) {
            // Retroceder físicamente (la mitad de la aceleración normal)
            const backAccel = effectiveAccel * 0.5;
            this.vx -= Math.cos(this.rotation) * backAccel * dt;
            this.vy -= Math.sin(this.rotation) * backAccel * dt;
            this.thrusterLevel = 0.3;
        } else {
            this.thrusterLevel = Math.max(0, this.thrusterLevel - 0.08);
        }

        // Fricción: usar aproximación lineal (mucho más rápido que Math.pow)
        // Para dt≈1: f^1 ≈ f; para dt pequeño es suficientemente preciso
        const friction = 1 - (1 - this._baseFriction) * dt;
        this.vx *= friction;
        this.vy *= friction;

        // Limitar velocidad
        const vx = this.vx, vy = this.vy;
        const speedSq = vx * vx + vy * vy;
        const maxSq = effectiveMaxSpeed * effectiveMaxSpeed;
        if (speedSq > maxSq) {
            const ratio = effectiveMaxSpeed / Math.sqrt(speedSq);
            this.vx *= ratio;
            this.vy *= ratio;
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Wrap bounds usando dimensiones pasadas (sin window.innerWidth)
        if (this.x < 0) this.x = W;
        else if (this.x > W) this.x = 0;
        if (this.y < 0) this.y = H;
        else if (this.y > H) this.y = 0;

        // Partículas del propulsor
        if (this.thrusterLevel > 0.1 && game) {
            this.thrusterParticleTimer += this.thrusterLevel;
            if (this.thrusterParticleTimer > 1.5) {
                this.thrusterParticleTimer = 0;
                const cosR = Math.cos(this.rotation);
                const sinR = Math.sin(this.rotation);
                const baseX = this.x - cosR * 16;
                const baseY = this.y - sinR * 16;
                const spread = (Math.random() - 0.5) * 0.4;
                const pSpeed = (2 + Math.random() * 3) * this.thrusterLevel;
                const cosRS = Math.cos(this.rotation + spread);
                const sinRS = Math.sin(this.rotation + spread);
                game.spawnParticle(baseX, baseY, {
                    vx: -cosRS * pSpeed + this.vx * 0.3,
                    vy: -sinRS * pSpeed + this.vy * 0.3,
                    life: 20 + Math.random() * 15,
                    color: Math.random() > 0.4 ? CONFIG.Colors.thruster : CONFIG.Colors.thrusterCore,
                    size: 1.5 + Math.random() * 2
                });
            }
        }

        // Disparo
        if (this.shootTimer > 0) this.shootTimer -= dt;
        if (input.isDown('Space') && this.shootTimer <= 0) {
            this.shoot(game);
            this.shootTimer = this.weaponDef.shootDelay;
        }
    }

    shoot(game) {
        const wDef = this.weaponDef;
        const baseAngle = this.rotation;

        for (let i = 0; i < wDef.count; i++) {
            let angle = baseAngle;
            if (wDef.count > 1) {
                angle = baseAngle + (i - (wDef.count - 1) / 2) * wDef.spread;
            } else if (wDef.spread > 0) {
                angle = baseAngle + (Math.random() - 0.5) * wDef.spread;
            }
            game.spawnProjectile(
                this.x + Math.cos(angle) * 25,
                this.y + Math.sin(angle) * 25,
                angle, 'player', wDef
            );
        }
        if (game.stats) {
            game.stats.weaponShots[wDef.name] = (game.stats.weaponShots[wDef.name] || 0) + 1;
        }
        AudioController.play('Shot');

        // Descontar munición y regresar al Láser si se agotó
        if (this.ammoLeft !== Infinity) {
            this.ammoLeft--;
            if (this.ammoLeft <= 0) {
                this.setWeapon('LASER');
                if (game && game.showPowerUpNotification) {
                    game.showPowerUpNotification('Sin munición → Láser', '#00ffff');
                }
                if (game) game._lastWeaponKey = null; // forzar refresco HUD
            }
        }
    }

    takeDamage(amount) {
        if (this.invincibilityTimer > 0) return;
        if (this.timedEffects['invincible']) return;

        if (this.shield > 0) {
            this.shield -= amount;
            if (this.shield < 0) {
                this.health += this.shield;
                this.shield = 0;
            }
        } else {
            this.health -= amount;
        }
        this.invincibilityTimer = CONFIG.Player.invincibilityFrames;
    }

    draw(ctx) {
        const isInvincible = this.timedEffects['invincible'];
        const isSpeedBoost = this.timedEffects['speed'];
        const isBlinking = this.invincibilityTimer > 0 && (Math.floor(Date.now() / 60) % 2 === 0);

        if (isBlinking) return;

        const color = isInvincible ? '#ffffff' : (isSpeedBoost ? '#ffdd00' : CONFIG.Colors.player);

        // Invalidar cache si el color del jugador cambió
        const cacheKey = color;
        if (cacheKey !== this._shipCacheState) {
            this._shipCacheState = cacheKey;
            this._buildShipCache(color, !!isInvincible, !!isSpeedBoost);
        }

        ctx.save();
        ctx.translate(this.x | 0, this.y | 0);
        ctx.rotate(this.rotation);

        // Escudo (dinámico: depende del valor actual de shield)
        if (this.shield > 10) {
            const shieldAlpha = (this.shield / CONFIG.Player.maxShield) * 0.25 + 0.1;
            ctx.globalAlpha = shieldAlpha;
            ctx.shadowBlur = 15;
            ctx.shadowColor = CONFIG.Colors.shield;
            ctx.strokeStyle = CONFIG.Colors.shield;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
        }

        // Blit del cache de la nave (sin re-dibujar paths ni shadowBlur)
        ctx.drawImage(this._shipCache, -30, -30);

        // Propulsor (dinámico: varía cada frame)
        const thrLevel = this.thrusterLevel;
        if (thrLevel > 0.05) {
            const thrLength = 10 + thrLevel * 14;
            const thrWidth  = 4 + thrLevel * 3;
            const grad = ctx.createLinearGradient(-14, 0, -14 - thrLength, 0);
            grad.addColorStop(0, CONFIG.Colors.thrusterCore);
            grad.addColorStop(0.3, CONFIG.Colors.thruster);
            grad.addColorStop(1, 'rgba(255,50,0,0)');
            ctx.shadowBlur = 20 * thrLevel;
            ctx.shadowColor = CONFIG.Colors.thruster;
            ctx.strokeStyle = grad;
            ctx.lineWidth = thrWidth;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-14, 0);
            ctx.lineTo(-14 - thrLength, 0);
            ctx.stroke();
            ctx.lineCap = 'butt';
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }
}
