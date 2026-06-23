// ============================================================
// AUDIO.JS - Sistema de audio con AudioContext (sin gaps entre SFX)
// ============================================================

const AudioController = {
    // ── Estado ──────────────────────────────────────────────
    _ctx: null,           // AudioContext compartido
    _buffers: {},         // AudioBuffer por ID
    _gainMaster: null,    // GainNode maestro
    _gainBGM: null,       // GainNode para música
    _gainSFX: null,       // GainNode para SFX

    bgmSource: null,      // BufferSourceNode actual de BGM
    bgmId: null,          // ID del BGM en reproducción
    bgmVolume: 0.35,
    sfxVolume: 0.55,
    muted: false,

    // Flag: el usuario ya interactuó (necesario para autoplay)
    _unlocked: false,

    // Cola de sonidos a reproducir cuando se desbloquee el contexto
    _pendingBGM: null,

    // ── Listas de archivos ────────────────────────────────
    _sfxFiles: [
        'Shot', 'Enemy_Died', 'Game_Over', 'Boss', 'Boss_Explosion', 'Boss_Hit',
        'Game_Win', 'Level_Win', 'Player_Lost_Life', 'Player_Win_Life', 'Shield_Activate',
        'Shot_Plasma', 'Shot_Sniper', 'Shot_Rapid',
        'Asteroid_Break_Large', 'Asteroid_Break_Medium', 'Asteroid_Break_Small',
        'Powerup_Weapon', 'Powerup_Health', 'Powerup_Shield',
        'Powerup_Speed', 'Powerup_Invincible',
        'Combo_x2', 'Combo_x3', 'Combo_x4',
        'UI_Click', 'UI_Hover',
        'Player_Invincible',
        'Level_Start',
    ],

    _bgmFiles: {
        'music_menu':     'music_menu',
        'music_gameplay': 'music_gameplay',
        'music_boss':     'music_boss',
    },

    // ── Inicialización ────────────────────────────────────
    init() {
        // Precarga mediante HTMLAudio para obtener los blobs de forma rápida;
        // Los convertiremos a AudioBuffer cuando el contexto esté disponible.
        // Por ahora guardamos las URLs para cargar bajo demanda.
        this._allIds = [...this._sfxFiles, ...Object.keys(this._bgmFiles)];
        this._loadedCount = 0;
        this._totalCount = this._allIds.length;

        // Escuchar la primera interacción del usuario para desbloquear audio
        const unlock = () => {
            if (this._unlocked) return;
            this._createContext();
            this._loadAllBuffers();
            this._unlocked = true;
            // Reproducir BGM pendiente si lo hay
            if (this._pendingBGM) {
                const id = this._pendingBGM;
                this._pendingBGM = null;
                setTimeout(() => this.playBGM(id), 200);
            }
            document.removeEventListener('pointerdown', unlock);
            document.removeEventListener('keydown', unlock);
        };
        document.addEventListener('pointerdown', unlock);
        document.addEventListener('keydown', unlock);

        // Silenciar cuando el usuario cambia de pestaña o minimiza
        document.addEventListener('visibilitychange', () => {
            if (!this._ctx) return;
            if (document.hidden) {
                if (this._gainMaster) this._gainMaster.gain.setValueAtTime(0, this._ctx.currentTime);
            } else {
                if (!this.muted && this._gainMaster) {
                    this._gainMaster.gain.setValueAtTime(1, this._ctx.currentTime);
                }
            }
        });

        // Pausar fuente al cerrar/navegar fuera de la página
        window.addEventListener('pagehide', () => this._suspendAll());
        window.addEventListener('beforeunload', () => this._suspendAll());
    },

    _suspendAll() {
        if (this.bgmSource) {
            try { this.bgmSource.stop(); } catch (_) {}
            this.bgmSource = null;
        }
        if (this._ctx && this._ctx.state === 'running') {
            this._ctx.suspend().catch(() => {});
        }
    },

    _createContext() {
        if (this._ctx) return;
        this._ctx = new (window.AudioContext || window.webkitAudioContext)();

        this._gainMaster = this._ctx.createGain();
        this._gainMaster.gain.value = 1;
        this._gainMaster.connect(this._ctx.destination);

        this._gainBGM = this._ctx.createGain();
        this._gainBGM.gain.value = this.bgmVolume;
        this._gainBGM.connect(this._gainMaster);

        this._gainSFX = this._ctx.createGain();
        this._gainSFX.gain.value = this.sfxVolume;
        this._gainSFX.connect(this._gainMaster);
    },

    _loadAllBuffers() {
        const all = [
            ...this._sfxFiles.map(f => ({ id: f, file: f })),
            ...Object.entries(this._bgmFiles).map(([id, file]) => ({ id, file }))
        ];
        all.forEach(({ id, file }) => {
            fetch(`public/sounds/${file}.mp3`)
                .then(r => r.arrayBuffer())
                .then(ab => this._ctx.decodeAudioData(ab))
                .then(buf => { this._buffers[id] = buf; })
                .catch(() => { /* archivo faltante: ignorar silenciosamente */ });
        });
    },

    // ── Reproducción SFX ─────────────────────────────────
    play(soundId) {
        if (this.muted || !this._ctx || !this._buffers[soundId]) return;
        if (document.hidden) return;
        try {
            const src = this._ctx.createBufferSource();
            src.buffer = this._buffers[soundId];
            src.connect(this._gainSFX);
            src.start(this._ctx.currentTime); // sin delay: sin gap
        } catch (_) {}
    },

    playWeaponShot(weaponId) {
        if (this.muted) return;
        const shotMap = {
            'PLASMA':  'Shot_Plasma',
            'MISSILE': 'Shot_Sniper',
            'RAPID':   'Shot_Rapid',
            'SPREAD':  'Shot',
            'LASER':   'Shot',
        };
        const id = shotMap[weaponId] || 'Shot';
        this.play(this._buffers[id] ? id : 'Shot');
    },

    playAsteroidBreak(size) {
        if (this.muted) return;
        const map = { 3: 'Asteroid_Break_Large', 2: 'Asteroid_Break_Medium', 1: 'Asteroid_Break_Small' };
        const id = map[size];
        this.play(this._buffers[id] ? id : 'Enemy_Died');
    },

    playPowerup(type) {
        if (this.muted) return;
        const map = {
            'weapon':     'Powerup_Weapon',
            'health':     'Powerup_Health',
            'shield':     'Powerup_Shield',
            'speed':      'Powerup_Speed',
            'invincible': 'Powerup_Invincible',
        };
        const id = map[type];
        this.play(this._buffers[id] ? id : 'Player_Win_Life');
    },

    playCombo(level) {
        if (this.muted) return;
        const map = { 2: 'Combo_x2', 3: 'Combo_x3', 4: 'Combo_x4' };
        const id = map[Math.min(level, 4)];
        if (id) this.play(id);
    },

    // ── Música de fondo ───────────────────────────────────
    playBGM(id) {
        if (this.muted) return;
        if (this.bgmId === id && this.bgmSource) return; // ya suena

        // Si el contexto aún no está desbloqueado, encolar
        if (!this._unlocked || !this._ctx) {
            this._pendingBGM = id;
            return;
        }

        this._stopBGMImmediate();

        const buf = this._buffers[id];
        if (!buf) {
            // Puede que todavía esté cargando; reintentar en 500 ms
            setTimeout(() => {
                if (this.bgmId !== id) this.playBGM(id);
            }, 500);
            return;
        }

        const src = this._ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;

        // Fade in via GainNode de BGM
        this._gainBGM.gain.cancelScheduledValues(this._ctx.currentTime);
        this._gainBGM.gain.setValueAtTime(0, this._ctx.currentTime);
        this._gainBGM.gain.linearRampToValueAtTime(this.bgmVolume, this._ctx.currentTime + 1.5);

        src.connect(this._gainBGM);
        src.start(this._ctx.currentTime);

        this.bgmSource = src;
        this.bgmId = id;
    },

    stopBGM() {
        if (!this._ctx || !this.bgmSource) return;
        const src = this.bgmSource;
        this._gainBGM.gain.cancelScheduledValues(this._ctx.currentTime);
        this._gainBGM.gain.setValueAtTime(this._gainBGM.gain.value, this._ctx.currentTime);
        this._gainBGM.gain.linearRampToValueAtTime(0, this._ctx.currentTime + 0.6);
        setTimeout(() => {
            try { src.stop(); } catch (_) {}
        }, 700);
        this.bgmSource = null;
        this.bgmId = null;
    },

    _stopBGMImmediate() {
        if (this.bgmSource) {
            try { this.bgmSource.stop(); } catch (_) {}
            this.bgmSource = null;
        }
        this.bgmId = null;
        if (this._gainBGM) {
            this._gainBGM.gain.cancelScheduledValues(this._ctx.currentTime);
            this._gainBGM.gain.setValueAtTime(0, this._ctx.currentTime);
        }
    },

    toggleMute() {
        this.muted = !this.muted;
        if (this._gainMaster) {
            this._gainMaster.gain.setValueAtTime(this.muted ? 0 : 1, this._ctx ? this._ctx.currentTime : 0);
        }
        return this.muted;
    },

    // Ajustar volumen BGM en tiempo real
    setBGMVolume(v) {
        this.bgmVolume = v;
        if (this._gainBGM) this._gainBGM.gain.setValueAtTime(v, this._ctx.currentTime);
    },

    setSFXVolume(v) {
        this.sfxVolume = v;
        if (this._gainSFX) this._gainSFX.gain.setValueAtTime(v, this._ctx.currentTime);
    }
};

window.addEventListener('DOMContentLoaded', () => AudioController.init());
