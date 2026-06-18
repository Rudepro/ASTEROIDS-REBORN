// ============================================================
// PARTICLES.JS - Optimizado: agrupado por color para reducir cambios de estado
// ============================================================

class Particle extends Entity {
    constructor(x, y, options) {
        super(x, y, options.size || 2);
        this.vx      = options.vx || 0;
        this.vy      = options.vy || 0;
        this.life    = options.life || 30;
        this.maxLife = this.life;
        this.color   = options.color || '#fff';
        this.friction= options.friction || 0.97;
        this.gravity = options.gravity  || 0;
        this._invMaxLife = 1 / this.maxLife; // precalcular inverso para división
    }

    reset(x, y, options) {
        this.x       = x;
        this.y       = y;
        this.vx      = options.vx || 0;
        this.vy      = options.vy || 0;
        this.life    = options.life || 30;
        this.maxLife = this.life;
        this._invMaxLife = 1 / this.maxLife;
        this.color   = options.color || '#fff';
        this.radius  = options.size || 2;
        this.friction= options.friction || 0.97;
        this.gravity = options.gravity  || 0;
        this.active  = true;
    }

    update(dt) {
        // Fricción lineal aproximada (sin Math.pow)
        const f = 1 - (1 - this.friction) * dt;
        this.vx *= f;
        this.vy *= f;
        this.vy += this.gravity * dt;
        this.x  += this.vx * dt;
        this.y  += this.vy * dt;
        this.life -= dt;
        if (this.life <= 0) this.active = false;
    }

    draw(ctx) {
        // Calcular alpha y radio sin llamadas costosas
        const alpha = this.life * this._invMaxLife;
        if (alpha <= 0) return;
        const r = this.radius * alpha;
        if (r < 0.3) return; // No dibujar partículas invisiblemente pequeñas

        ctx.globalAlpha = alpha;
        ctx.fillStyle   = this.color;
        ctx.beginPath();
        ctx.arc(this.x | 0, this.y | 0, r, 0, Math.PI * 2);
        ctx.fill();
    }
}
