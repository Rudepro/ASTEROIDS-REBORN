// ============================================================
// RENDERER.JS - Fondo pre-renderizado en offscreen canvas (OPTIMIZADO)
// ============================================================

const Renderer = {
    stars: [],
    offscreen: null,        // Canvas offscreen para estrellas estáticas
    offscreenCtx: null,
    initialized: false,
    lastWidth: 0,
    lastHeight: 0,

    // Nebulosas (también pre-renderizadas)
    nebulaePoints: [],

    init(width, height) {
        this.lastWidth  = width;
        this.lastHeight = height;

        // Crear canvas offscreen
        this.offscreen = document.createElement('canvas');
        this.offscreen.width  = width;
        this.offscreen.height = height;
        this.offscreenCtx = this.offscreen.getContext('2d');

        this._buildStars(width, height);
        this._buildNebulae(width, height);
        this._renderToOffscreen();
        this.initialized = true;
    },

    _buildStars(width, height) {
        this.stars = [];
        const count = CONFIG.World.starCount;
        for (let i = 0; i < count; i++) {
            const layer = Math.floor(Math.random() * 3);
            this.stars.push({
                x:      Math.random() * width,
                y:      Math.random() * height,
                r:      0.4 + layer * 0.4 + Math.random() * 0.6,
                alpha:  0.25 + Math.random() * 0.65,
                color:  this._starColor(),
                layer:  layer
            });
        }
    },

    _buildNebulae(width, height) {
        this.nebulaePoints = [];
        const colors = ['#1a003044', '#001a3044', '#0d002044', '#00152044', '#1a100044', '#10001844'];
        for (let i = 0; i < 6; i++) {
            this.nebulaePoints.push({
                x: Math.random() * width,
                y: Math.random() * height,
                r: 120 + Math.random() * 220,
                color: colors[i]
            });
        }
    },

    _starColor() {
        const c = ['#ffffff', '#ffe8e0', '#e0e8ff', '#fff8e0', '#e0ffe8'];
        return c[Math.floor(Math.random() * c.length)];
    },

    // Renderiza TODO el fondo al canvas offscreen UNA sola vez
    _renderToOffscreen() {
        const ctx = this.offscreenCtx;
        const w = this.offscreen.width;
        const h = this.offscreen.height;

        // Fondo negro
        ctx.fillStyle = CONFIG.Colors.bg || '#050510';
        ctx.fillRect(0, 0, w, h);

        // Nebulosas
        for (const neb of this.nebulaePoints) {
            const grad = ctx.createRadialGradient(neb.x, neb.y, 0, neb.x, neb.y, neb.r);
            grad.addColorStop(0, neb.color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(neb.x - neb.r, neb.y - neb.r, neb.r * 2, neb.r * 2);
        }

        // Estrellas sin shadowBlur (demasiado caro para 250 llamadas)
        for (const star of this.stars) {
            ctx.globalAlpha = star.alpha;
            ctx.fillStyle = star.color;
            ctx.beginPath();
            ctx.arc(star.x | 0, star.y | 0, star.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    },

    // Llamado cada frame: blit del offscreen + efecto de parpadeo mínimo
    drawBackground(ctx, width, height) {
        // Re-init si cambia el tamaño o el color de fondo cambió
        if (!this.initialized || this.lastWidth !== width || this.lastHeight !== height) {
            this.init(width, height);
        }

        // Blit: UNA SOLA operación drawImage en lugar de 250+ arcs
        ctx.drawImage(this.offscreen, 0, 0);
    },

    // Llamar esto cuando cambie el VisualMode para regenerar colores
    forceReinit() {
        this.initialized = false;
    }
};
