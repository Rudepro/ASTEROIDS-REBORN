// ============================================================
// POWERUPS.JS - Optimizado: shadowBlur solo en momentos clave
// ============================================================

const POWERUP_DEFS = {
    WEAPON_LASER:   { type: 'weapon', weapon: 'LASER',   color: '#00ffff', icon: '🔵', label: 'Láser',           duration: 0   },
    WEAPON_SPREAD:  { type: 'weapon', weapon: 'SPREAD',  color: '#ff44ff', icon: '🌟', label: 'Dispersor',        duration: 0   },
    WEAPON_PLASMA:  { type: 'weapon', weapon: 'PLASMA',  color: '#44ff88', icon: '💠', label: 'Plasma',            duration: 0   },
    WEAPON_RAPID:   { type: 'weapon', weapon: 'RAPID',   color: '#ffdd00', icon: '⚡', label: 'Ráfaga',            duration: 0   },
    WEAPON_MISSILE: { type: 'weapon', weapon: 'MISSILE', color: '#ff8800', icon: '🚀', label: 'Misil',             duration: 0   },
    SHIELD_RECHARGE:{ type: 'stat',   stat: 'shield',    color: '#33ccff', icon: '🛡', label: 'Escudo',            duration: 0   },
    HEALTH_PACK:    { type: 'stat',   stat: 'health',    color: '#ff4444', icon: '❤',  label: 'Vida',              duration: 0   },
    SPEED_BOOST:    { type: 'timed',  stat: 'speed',     color: '#ffaa00', icon: '🔵', label: 'Velocidad',          duration: 300 },
    INVINCIBLE:     { type: 'timed',  stat: 'invincible',color: '#ffffff', icon: '★', label: 'Invencible',        duration: 180 },
};

const POWERUP_POOL = [
    'WEAPON_LASER', 'WEAPON_SPREAD', 'WEAPON_PLASMA', 'WEAPON_RAPID', 'WEAPON_MISSILE',
    'SHIELD_RECHARGE', 'HEALTH_PACK', 'SPEED_BOOST', 'INVINCIBLE'
];

class PowerUp extends Entity {
    constructor(x, y, defKey) {
        super(x, y, 14);
        this.defKey = defKey || POWERUP_POOL[Math.floor(Math.random() * POWERUP_POOL.length)];
        this.def = POWERUP_DEFS[this.defKey];
        this.bobTimer = Math.random() * Math.PI * 2;
        this.rotationSpeed = 0.02;
        this.lifeTimer = 600;
        this.pulseTimer = 0;

        // Precalcular hexágono (no recalcular cada frame)
        this._hexPoints = [];
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
            this._hexPoints.push({ cos: Math.cos(a), sin: Math.sin(a) });
        }

        // Cache offscreen del powerup (sin shadowBlur dinámico)
        this._buildCache();
    }

    _buildCache() {
        const size = 40;
        let oc;
        if (typeof OffscreenCanvas !== 'undefined') {
            oc = new OffscreenCanvas(size, size);
        } else {
            oc = document.createElement('canvas');
            oc.width = size;
            oc.height = size;
        }
        const c = oc.getContext('2d');
        const cx = size / 2;
        const color = this.def.color;
        const r = this.radius;

        c.translate(cx, cx);
        // Glow estático en cache
        c.shadowBlur = 15;
        c.shadowColor = color;

        c.beginPath();
        for (let i = 0; i < 6; i++) {
            const hp = this._hexPoints[i];
            if (i === 0) c.moveTo(hp.cos * r, hp.sin * r);
            else c.lineTo(hp.cos * r, hp.sin * r);
        }
        c.closePath();
        c.strokeStyle = color;
        c.lineWidth = 2;
        c.stroke();
        c.fillStyle = color + '22';
        c.fill();
        c.shadowBlur = 0;

        this._cache = oc;
        this._cacheHW = size / 2;
    }

    update(dt, W, H) {
        this.bobTimer   += 0.05 * dt;
        this.rotation   += this.rotationSpeed * dt;
        this.pulseTimer += 0.1 * dt;
        this.lifeTimer  -= dt;
        if (this.lifeTimer <= 0) { this.active = false; return; }

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Wrap inline
        if (this.x < 0) this.x = W;
        else if (this.x > W) this.x = 0;
        if (this.y < 0) this.y = H;
        else if (this.y > H) this.y = 0;
    }

    draw(ctx) {
        if (!this.active) return;

        const alpha = Math.min(1, this.lifeTimer / 60);
        // Pulso de escala (reemplaza shadowBlur dinámico)
        const pulse = 0.9 + 0.1 * Math.sin(this.pulseTimer);
        const bobY = Math.sin(this.bobTimer) * 4;

        ctx.save();
        ctx.translate(this.x | 0, (this.y + bobY) | 0);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = alpha;
        ctx.scale(pulse, pulse);

        // Blit del cache (hexágono ya dibujado con glow estático)
        ctx.drawImage(this._cache, -this._cacheHW, -this._cacheHW);

        // Icono sobre el cache (texto, no necesita shadowBlur)
        ctx.scale(1 / pulse, 1 / pulse); // restaurar escala para el texto
        ctx.font = `bold ${this.radius}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = alpha;
        ctx.fillText(this.def.icon, 0, 0);

        ctx.restore();
    }

    applyToPlayer(player, game) {
        const def = this.def;
        if (def.type === 'weapon') {
            player.setWeapon(def.weapon);
            if (game && game.showPowerUpNotification) {
                game.showPowerUpNotification('Arma: ' + def.label, def.color);
            }
        } else if (def.type === 'stat') {
            if (def.stat === 'shield') {
                player.shield = Math.min(CONFIG.Player.maxShield, player.shield + 30);
            } else if (def.stat === 'health') {
                player.health = Math.min(CONFIG.Player.maxHealth, player.health + 25);
            }
            if (game && game.showPowerUpNotification) {
                game.showPowerUpNotification(def.label + ' +', def.color);
            }
        } else if (def.type === 'timed') {
            player.applyTimedEffect(def.stat, def.duration);
            if (game && game.showPowerUpNotification) {
                game.showPowerUpNotification(def.label + '!', def.color);
            }
        }
    }
}
