class Boss extends Entity {
    constructor(x, y) {
        super(x, y, 40); // Radio más grande para el jefe
        this.health = 500;
        this.maxHealth = 500;
        this.shootTimer = 0;
        this.angle = 0;
        this.color = '#ff3333';
        this.vx = 0;
        this.vy = 0;
        this.changeDirTimer = 0;
    }

    update(dt, W, H, game) {
        // Movimiento aleatorio lento
        this.changeDirTimer -= dt;
        if (this.changeDirTimer <= 0) {
            this.vx = (Math.random() - 0.5) * 4;
            this.vy = (Math.random() - 0.5) * 4;
            this.changeDirTimer = 60 + Math.random() * 60; // 1-2 segundos
        }
        
        // Rebote en bordes
        if (this.x < 50 || this.x > W - 50) this.vx *= -1;
        if (this.y < 50 || this.y > H - 50) this.vy *= -1;

        super.update(dt);
        this.x = Math.max(50, Math.min(W - 50, this.x));
        this.y = Math.max(50, Math.min(H - 50, this.y));

        // Apuntar al jugador
        if (game.player && game.player.active) {
            const dx = game.player.x - this.x;
            const dy = game.player.y - this.y;
            this.angle = Math.atan2(dy, dx);
            
            // Disparar
            this.shootTimer -= dt;
            if (this.shootTimer <= 0) {
                this.shoot(game);
                this.shootTimer = 90; // Cada ~1.5 segundos a 60FPS
            }
        }
    }

    shoot(game) {
        // Disparar 3 proyectiles en abanico
        for (let i = -1; i <= 1; i++) {
            const spread = i * 0.2;
            game.spawnProjectile(this.x, this.y, this.angle + spread, 'enemy', {
                id: 'ENEMY_SHOT',
                projectileLife: 200,
                speed: 8,
                damage: 15,
                color: '#ff3333',
                length: 15,
                width: 4
            });
        }
        if (typeof AudioController !== 'undefined') {
            AudioController.play('Shot');
        }
    }

    draw(ctx) {
        if (!this.active) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Dibujar Nave del Jefe
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.fillStyle = '#111';
        
        ctx.beginPath();
        // Diseño de nave tipo romboide/cangrejo
        ctx.moveTo(35, 0);
        ctx.lineTo(-20, 25);
        ctx.lineTo(-10, 0);
        ctx.lineTo(-20, -25);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Barra de vida
        ctx.rotate(-this.angle); // Des-rotar para dibujar la barra horizontalmente
        ctx.fillStyle = 'rgba(255, 51, 51, 0.3)';
        ctx.fillRect(-30, -50, 60, 6);
        ctx.fillStyle = this.color;
        ctx.fillRect(-30, -50, 60 * Math.max(0, this.health / this.maxHealth), 6);
        
        ctx.restore();
    }
}
