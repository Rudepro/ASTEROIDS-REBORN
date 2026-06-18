// ============================================================
// WEAPONS.JS - Proyectiles: SNIPER reemplazado por MISSILE guiado
// ============================================================

const WEAPON_TYPES = {
    LASER: {
        id: 'LASER',
        name: 'Láser',
        color: '#00ffff',
        icon: 'LASER_ICON',   // se renderiza en canvas
        shootDelay: 15,
        projectileLife: 220,
        speed: 20,
        spread: 0,
        count: 1,
        damage: 10,
        length: 22,
        width: 3,
        ammo: Infinity  // arma base: infinita
    },
    SPREAD: {
        id: 'SPREAD',
        name: 'Dispersor',
        color: '#ff44ff',
        icon: 'SPREAD_ICON',
        shootDelay: 20,
        projectileLife: 150,
        speed: 17,
        spread: 0.22,
        count: 3,
        damage: 7,
        length: 16,
        width: 2,
        ammo: 18        // 18 disparos (18 * 3 proyectiles = 54 proyectiles)
    },
    PLASMA: {
        id: 'PLASMA',
        name: 'Plasma',
        color: '#44ff88',
        icon: 'PLASMA_ICON',
        shootDelay: 35,
        projectileLife: 280,
        speed: 14,
        spread: 0,
        count: 1,
        damage: 25,
        length: 14,
        width: 5,
        ammo: 12        // 12 disparos potentes
    },
    RAPID: {
        id: 'RAPID',
        name: 'Ráfaga',
        color: '#ffdd00',
        icon: 'RAPID_ICON',
        shootDelay: 7,
        projectileLife: 160,
        speed: 22,
        spread: 0.06,
        count: 1,
        damage: 5,
        length: 18,
        width: 2,
        ammo: 40        // 40 disparos rápidos
    },
    MISSILE: {
        id: 'MISSILE',
        name: 'Misil',
        color: '#ff8800',
        icon: 'MISSILE_ICON',
        shootDelay: 60,
        projectileLife: 360,
        speed: 12,
        spread: 0,
        count: 1,
        damage: 999,    // destruye completamente el asteroide pequeño
        length: 20,
        width: 5,
        ammo: 5,        // 5 misiles dirigidos
        homing: true,   // bandera de seguimiento
        homingStrength: 0.08  // fuerza de giro por frame
    }
};

// ============================================================
// Clase Projectile — con soporte de homing para MISSILE
// ============================================================
class Projectile extends Entity {
    constructor(x, y, angle, type, weaponType) {
        super(x, y, 4);
        this.type = type;
        this.weaponDef = weaponType || WEAPON_TYPES.LASER;
        this.life = this.weaponDef.projectileLife;
        this.maxLife = this.life;
        const speed = this.weaponDef.speed;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.angle = angle;
        this.damage = this.weaponDef.damage;
        this.target = null;     // asteroide objetivo (homing)
        this._trailPoints = []; // cola visual del misil
    }

    // W, H pasados como parámetros (sin window.innerWidth en hot path)
    update(dt, W, H, asteroids) {
        // --- HOMING ---
        if (this.weaponDef.homing && this.type === 'player') {
            this._updateHoming(dt, asteroids);
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.angle = Math.atan2(this.vy, this.vx);
        this.life -= dt;
        if (this.life <= 0) { this.active = false; return; }

        // Guardar cola visual del misil (máximo 8 puntos)
        if (this.weaponDef.homing) {
            this._trailPoints.push({ x: this.x, y: this.y });
            if (this._trailPoints.length > 8) this._trailPoints.shift();
        }

        // Destruir al salir de pantalla
        if (this.x < -80 || this.x > W + 80 || this.y < -80 || this.y > H + 80) {
            this.active = false;
        }
    }

    _updateHoming(dt, asteroids) {
        // Buscar nuevo objetivo si el actual ya no está activo
        if (!this.target || !this.target.active) {
            this.target = this._findNearestAsteroid(asteroids);
        }
        if (!this.target) return;

        // Calcular ángulo hacia el objetivo
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const desiredAngle = Math.atan2(dy, dx);

        // Interpolar la velocidad suavemente (steering)
        const str = this.weaponDef.homingStrength;
        const speed = this.weaponDef.speed;
        const curAngle = Math.atan2(this.vy, this.vx);

        // Diferencia de ángulos con wrap
        let diff = desiredAngle - curAngle;
        while (diff > Math.PI)  diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        const newAngle = curAngle + diff * str * dt;
        this.vx = Math.cos(newAngle) * speed;
        this.vy = Math.sin(newAngle) * speed;
    }

    _findNearestAsteroid(asteroids) {
        if (!asteroids) return null;
        let best = null;
        let bestDist = Infinity;
        for (let i = 0; i < asteroids.length; i++) {
            const a = asteroids[i];
            if (!a.active) continue;
            const dx = a.x - this.x;
            const dy = a.y - this.y;
            const d = dx * dx + dy * dy;
            if (d < bestDist) {
                bestDist = d;
                best = a;
            }
        }
        return best;
    }

    draw(ctx) {
        if (!this.active) return;
        const wDef = this.weaponDef;
        const color = this.type === 'player' ? wDef.color : '#ff3333';
        const alpha = Math.min(1, this.life / (this.maxLife * 0.3));

        ctx.save();
        ctx.translate(this.x | 0, this.y | 0);
        ctx.rotate(this.angle);
        ctx.globalAlpha = alpha;

        if (wDef.id === 'PLASMA') {
            // ─── PLASMA: esfera con halo energético ───
            const r = wDef.length * 0.5;
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.35, color);
            grad.addColorStop(0.7, color + '88');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
            // Anillo exterior
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = alpha * 0.6;
            ctx.beginPath();
            ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2);
            ctx.stroke();
            // Cola
            ctx.strokeStyle = color;
            ctx.lineWidth = wDef.width * 0.5;
            ctx.globalAlpha = alpha * 0.4;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-wDef.length * 1.4, 0);
            ctx.stroke();

        } else if (wDef.id === 'MISSILE') {
            // ─── MISIL: cohete con llama de propulsión ───
            // Cuerpo del misil
            ctx.fillStyle = '#cccccc';
            ctx.strokeStyle = wDef.color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.lineTo(0, -3);
            ctx.lineTo(-10, -3);
            ctx.lineTo(-12, 0);
            ctx.lineTo(-10, 3);
            ctx.lineTo(0, 3);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Punta
            ctx.fillStyle = '#ff8800';
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.lineTo(16, -1.5);
            ctx.lineTo(16, 1.5);
            ctx.closePath();
            ctx.fill();

            // Aletas
            ctx.fillStyle = wDef.color;
            ctx.beginPath();
            ctx.moveTo(-8, -3);
            ctx.lineTo(-14, -8);
            ctx.lineTo(-12, -3);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-8, 3);
            ctx.lineTo(-14, 8);
            ctx.lineTo(-12, 3);
            ctx.closePath();
            ctx.fill();

            // Llama propulsora animada
            const flameLen = 8 + Math.random() * 6;
            const flameGrad = ctx.createLinearGradient(-12, 0, -12 - flameLen, 0);
            flameGrad.addColorStop(0, '#ffffff');
            flameGrad.addColorStop(0.3, '#ffaa00');
            flameGrad.addColorStop(1, 'rgba(255,50,0,0)');
            ctx.strokeStyle = flameGrad;
            ctx.lineWidth = 3 + Math.random() * 2;
            ctx.lineCap = 'round';
            ctx.globalAlpha = alpha * 0.9;
            ctx.beginPath();
            ctx.moveTo(-12, 0);
            ctx.lineTo(-12 - flameLen, 0);
            ctx.stroke();
            ctx.lineCap = 'butt';

            // Cola de humo (puntos anteriores)
            if (this._trailPoints.length > 1) {
                ctx.restore(); // restaurar para dibujar en coords globales
                ctx.save();
                ctx.globalAlpha = 0.3 * alpha;
                for (let i = 1; i < this._trailPoints.length; i++) {
                    const t = this._trailPoints[i];
                    const tAlpha = (i / this._trailPoints.length) * 0.4;
                    ctx.fillStyle = `rgba(255,136,0,${tAlpha})`;
                    ctx.beginPath();
                    ctx.arc(t.x | 0, t.y | 0, (i / this._trailPoints.length) * 3, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
                return; // ya hicimos restore manual
            }

        } else if (wDef.id === 'SPREAD') {
            // ─── DISPERSOR: proyectil en diamante con brillo ───
            ctx.shadowBlur = 5;
            ctx.shadowColor = color;
            ctx.strokeStyle = color;
            ctx.lineWidth = wDef.width;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-wDef.length, 0);
            ctx.stroke();
            ctx.shadowBlur = 0;
            // Núcleo brillante en diamante
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(2, 0);
            ctx.lineTo(0, -2.5);
            ctx.lineTo(-3, 0);
            ctx.lineTo(0, 2.5);
            ctx.closePath();
            ctx.fill();

        } else if (wDef.id === 'RAPID') {
            // ─── RÁFAGA: trazo doble rápido ───
            ctx.shadowBlur = 4;
            ctx.shadowColor = color;
            ctx.strokeStyle = color;
            ctx.lineWidth = wDef.width;
            ctx.beginPath();
            ctx.moveTo(0, -1);
            ctx.lineTo(-wDef.length, -1);
            ctx.stroke();
            ctx.strokeStyle = '#fffde0';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(0, 1);
            ctx.lineTo(-wDef.length * 0.7, 1);
            ctx.stroke();
            ctx.shadowBlur = 0;

        } else {
            // ─── LASER (default): trazo con núcleo blanco ───
            ctx.shadowBlur = 6;
            ctx.shadowColor = color;
            ctx.strokeStyle = color;
            ctx.lineWidth = wDef.width;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-wDef.length, 0);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.globalAlpha = alpha * 0.8;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-wDef.length * 0.55, 0);
            ctx.stroke();
        }

        ctx.restore();
    }
}
