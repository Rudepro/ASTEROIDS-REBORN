class Input {
    constructor() {
        this.keys = {};

        window.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            // Evitar scroll de página con teclas del juego
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', e => {
            this.keys[e.code] = false;
        });
    }

    isDown(code) {
        return !!this.keys[code];
    }

    // Limpiar todas las teclas (útil al pausar/reanudar para evitar input pegado)
    clearAll() {
        this.keys = {};
    }
}
