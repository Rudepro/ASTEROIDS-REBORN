const CONFIG = {
    FPS: 60,
    VisualMode: 'NEON', // 'NEON' | 'REALISTIC'

    // === DIFICULTAD ===
    Difficulty: 'NORMAL', // 'EASY' | 'NORMAL' | 'HARD'
    DifficultyPresets: {
        EASY: {
            playerHealthMult: 1.5,
            playerSpeedMult:  1.1,
            asteroidSpeedMult:0.7,
            scoreMult:        0.8,
            label: 'Fácil',
            color: '#44ff88'
        },
        NORMAL: {
            playerHealthMult: 1.0,
            playerSpeedMult:  1.0,
            asteroidSpeedMult:1.0,
            scoreMult:        1.0,
            label: 'Normal',
            color: '#00ffff'
        },
        HARD: {
            playerHealthMult: 0.65,
            playerSpeedMult:  1.0,
            asteroidSpeedMult:1.5,
            scoreMult:        2.0,
            label: 'Difícil',
            color: '#ff3344'
        }
    },

    // Jugador
    Player: {
        maxSpeed: 6,
        acceleration: 0.22,
        friction: 0.96,
        rotationSpeed: 0.055,
        maxHealth: 100,
        maxShield: 50,
        baseDamage: 10,
        hitboxRadius: 13,
        invincibilityFrames: 60
    },

    // Proyectiles
    Projectile: {
        speed: 18,
        life: 200,
        length: 20
    },

    // Survival Mode
    Survival: {
        initialRate: 0.008,
        maxRate: 0.05,
        rateGrowthDivisor: 8000,
        maxAsteroids: 18,
        minSpawnDist: 250
    },

    // Combo
    Combo: {
        maxLevel: 4,
        timerFrames: 180,   // 3 segundos a 60fps para perder el combo
    },

    // Mundo
    World: {
        width: 1920,
        height: 1080,
        starCount: 250
    },

    // Colores Neon
    Colors: {
        player: '#00ffff',
        enemy: '#ff0055',
        asteroid: '#b0b8cc',
        asteroidLarge: '#ff6644',
        asteroidMedium: '#ffcc44',
        asteroidSmall: '#aaddff',
        laser: '#00ffff',
        spreadShot: '#ff44ff',
        plasma: '#44ff88',
        particle: '#ffffff',
        bg: '#050510',
        thruster: '#ff8800',
        thrusterCore: '#ffffff',
        shield: '#33ccff'
    },

    // Obtener preset de dificultad activo
    getDifficulty() {
        return this.DifficultyPresets[this.Difficulty] || this.DifficultyPresets.NORMAL;
    }
};
