// ============================================================
// ASTEROIDS.JS - Optimizado: cache offscreen, bounds por parámetro
// ============================================================

class Asteroid extends Entity {
    constructor(x, y, size, W, H) {
        const radiusMap = { 3: 42, 2: 26, 1: 14 };
        super(x, y, radiusMap[size] || size * 14);
        this.size = size;
        this.rotationSpeed = (Math.random() - 0.5) * 0.05;

        const diff = CONFIG.getDifficulty();
        const speed = ((0.8 + Math.random() * 1.4) / size) * diff.asteroidSpeedMult;
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        const colorMap = {
            3: CONFIG.Colors.asteroidLarge  || '#ff6644',
            2: CONFIG.Colors.asteroidMedium || '#ffcc44',
            1: CONFIG.Colors.asteroidSmall  || '#aaddff'
        };
        this.color = colorMap[size] || CONFIG.Colors.asteroid;

        // Forma irregular
        this.points = [];
        const numPoints = 7 + Math.floor(Math.random() * 5); // 7-11
        for (let i = 0; i < numPoints; i++) {
            const a = (i / numPoints) * Math.PI * 2;
            const r = this.radius * (0.72 + Math.random() * 0.28);
            this.points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
        }

        // Cráteres
        this.craters = [];
        const numCraters = Math.floor(Math.random() * (size + 1));
        for (let i = 0; i < numCraters; i++) {
            const ca = Math.random() * Math.PI * 2;
            const cr = (0.2 + Math.random() * 0.3) * this.radius;
            this.craters.push({
                cx: Math.cos(ca) * cr,
                cy: Math.sin(ca) * cr,
                s: 2 + Math.random() * 2
            });
        }

        this._buildCache();
    }

    _buildCache() {
        const d  = ((this.radius * 2 + 10) | 0);
        // Reusar OffscreenCanvas si está disponible (más rápido que createElement)
        let oc;
        if (typeof OffscreenCanvas !== 'undefined') {
            oc = new OffscreenCanvas(d, d);
        } else {
            oc = document.createElement('canvas');
            oc.width  = d;
            oc.height = d;
        }
        const c   = oc.getContext('2d');
        const cx  = d / 2;

        c.beginPath();
        c.moveTo(this.points[0].x + cx, this.points[0].y + cx);
        for (let i = 1; i < this.points.length; i++) {
            c.lineTo(this.points[i].x + cx, this.points[i].y + cx);
        }
        c.closePath();
        c.fillStyle = '#0a0a14';
        c.fill();

        // shadowBlur UNA sola vez (en cache, no en cada frame)
        c.shadowBlur  = 10;
        c.shadowColor = this.color;
        c.strokeStyle = this.color;
        c.lineWidth   = size3to2(this.size);
        c.stroke();
        c.shadowBlur  = 0;

        for (const cr of this.craters) {
            c.beginPath();
            c.arc(cr.cx + cx, cr.cy + cx, cr.s, 0, Math.PI * 2);
            c.fillStyle   = 'rgba(0,0,0,0.5)';
            c.strokeStyle = this.color + '77';
            c.lineWidth   = 0.8;
            c.fill();
            c.stroke();
        }

        this._cache   = oc;
        this._cacheHW = d / 2;
    }

    // W, H pasados como parámetros (sin window.innerWidth en hot path)
    update(dt, W, H) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.rotation += this.rotationSpeed * dt;

        // Wrap inline (más rápido que llamar Utils.wrapBounds)
        if (this.x < 0) this.x = W;
        else if (this.x > W) this.x = 0;
        if (this.y < 0) this.y = H;
        else if (this.y > H) this.y = 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x | 0, this.y | 0);
        ctx.rotate(this.rotation);
        ctx.drawImage(this._cache, -this._cacheHW, -this._cacheHW);
        ctx.restore();
    }
}

function size3to2(size) {
    if (size === 3) return 2.5;
    if (size === 2) return 2;
    return 1.5;
}
