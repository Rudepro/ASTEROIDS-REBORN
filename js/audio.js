// ============================================================
// AUDIO.JS - Sistema de audio expandido con BGM y SFX categorizado
// ============================================================

const AudioController = {
    sounds: {},
    bgm: null,          // Pista de música de fondo actual
    bgmVolume: 0.35,    // Volumen de música de fondo
    sfxVolume: 0.55,    // Volumen de efectos de sonido
    muted: false,

    // Sonidos registrados (ID → archivo)
    _sfxFiles: [
        // === Existentes ===
        'Shot', 'Enemy_Died', 'Game_Over', 'Boss', 'Boss_Explosion', 'Boss_Hit',
        'Game_Win', 'Level_Win', 'Player_Lost_Life', 'Player_Win_Life', 'Shield_Activate',
        // === Disparos por tipo de arma ===
        'Shot_Plasma', 'Shot_Sniper', 'Shot_Rapid',
        // === Explosiones por tamaño ===
        'Asteroid_Break_Large', 'Asteroid_Break_Medium', 'Asteroid_Break_Small',
        // === Power-ups ===
        'Powerup_Weapon', 'Powerup_Health', 'Powerup_Shield',
        'Powerup_Speed', 'Powerup_Invincible',
        // === Combo ===
        'Combo_x2', 'Combo_x3', 'Combo_x4',
        // === UI ===
        'UI_Click', 'UI_Hover',
        // === Jugador ===
        'Player_Invincible',
        // === Nivel ===
        'Level_Start',
    ],

    // Música de fondo (ID → archivo)
    _bgmFiles: {
        'music_menu':     'music_menu',
        'music_gameplay': 'music_gameplay',
        'music_boss':     'music_boss',
    },

    init() {
        // Cargar SFX — usar fallback si el archivo no existe
        this._sfxFiles.forEach(f => {
            const a = new Audio(`public/sounds/${f}.mp3`);
            a.volume = this.sfxVolume;
            a.preload = 'auto';
            this.sounds[f] = a;
        });

        // Cargar BGM
        Object.entries(this._bgmFiles).forEach(([id, file]) => {
            const a = new Audio(`public/sounds/${file}.mp3`);
            a.volume = this.bgmVolume;
            a.loop = true;
            a.preload = 'auto';
            this.sounds[id] = a;
        });
    },

    play(soundName) {
        if (this.muted) return;
        const snd = this.sounds[soundName];
        if (!snd) return;
        // Clonar para disparos simultáneos (SFX cortos)
        const clone = snd.cloneNode();
        clone.volume = this.sfxVolume;
        clone.play().catch(() => {}); // Silenciar errores de política de autoplay
    },

    // Volumen del SFX según tipo de arma
    playWeaponShot(weaponId) {
        if (this.muted) return;
        const shotMap = {
            'PLASMA':  'Shot_Plasma',
            'MISSILE': 'Shot_Sniper',  // reutiliza el sonido largo (impacto de misil)
            'RAPID':   'Shot_Rapid',
            'SPREAD':  'Shot',
            'LASER':   'Shot',
        };
        // Intentar el sonido específico; si no existe, usar Shot genérico
        const id = shotMap[weaponId] || 'Shot';
        const snd = this.sounds[id];
        if (snd && snd.readyState >= 2) {
            this.play(id);
        } else {
            this.play('Shot');
        }
    },

    // Sonido de explosión según tamaño del asteroide
    playAsteroidBreak(size) {
        if (this.muted) return;
        const map = { 3: 'Asteroid_Break_Large', 2: 'Asteroid_Break_Medium', 1: 'Asteroid_Break_Small' };
        const id = map[size];
        const snd = this.sounds[id];
        if (snd && snd.readyState >= 2) {
            this.play(id);
        } else {
            this.play('Enemy_Died'); // fallback
        }
    },

    // Sonido de power-up según tipo
    playPowerup(type) {
        if (this.muted) return;
        const map = {
            'weapon':    'Powerup_Weapon',
            'health':    'Powerup_Health',
            'shield':    'Powerup_Shield',
            'speed':     'Powerup_Speed',
            'invincible':'Powerup_Invincible',
        };
        const id = map[type];
        const snd = this.sounds[id];
        if (snd && snd.readyState >= 2) {
            this.play(id);
        } else {
            this.play('Player_Win_Life'); // fallback
        }
    },

    // Sonido de combo
    playCombo(level) {
        if (this.muted) return;
        const map = { 2: 'Combo_x2', 3: 'Combo_x3', 4: 'Combo_x4' };
        const id = map[Math.min(level, 4)];
        if (!id) return;
        const snd = this.sounds[id];
        if (snd && snd.readyState >= 2) {
            this.play(id);
        }
    },

    // Reproducir música de fondo (con transición suave)
    playBGM(id) {
        if (this.muted) return;
        if (this.bgm === this.sounds[id]) return; // ya está sonando

        // Detener BGM anterior
        this.stopBGM();

        const snd = this.sounds[id];
        if (!snd) return;
        snd.currentTime = 0;
        snd.volume = 0;
        snd.play().catch(() => {});
        this.bgm = snd;

        // Fade in suave
        this._fadeIn(snd, this.bgmVolume, 60);
    },

    stopBGM() {
        if (!this.bgm) return;
        const snd = this.bgm;
        this._fadeOut(snd, 40, () => {
            snd.pause();
            snd.currentTime = 0;
        });
        this.bgm = null;
    },

    _fadeIn(audio, targetVol, frames) {
        const step = targetVol / frames;
        let f = 0;
        const tick = () => {
            if (f++ < frames) {
                audio.volume = Math.min(targetVol, audio.volume + step);
                requestAnimationFrame(tick);
            }
        };
        tick();
    },

    _fadeOut(audio, frames, onDone) {
        const startVol = audio.volume;
        const step = startVol / frames;
        let f = 0;
        const tick = () => {
            if (f++ < frames) {
                audio.volume = Math.max(0, audio.volume - step);
                requestAnimationFrame(tick);
            } else {
                if (onDone) onDone();
            }
        };
        tick();
    },

    toggleMute() {
        this.muted = !this.muted;
        if (this.muted && this.bgm) this.bgm.pause();
        else if (!this.muted && this.bgm) this.bgm.play().catch(() => {});
        return this.muted;
    }
};

window.addEventListener('DOMContentLoaded', () => AudioController.init());
