class Input {
    constructor() {
        // Usamos un Set para compatibilidad con controles táctiles (add/delete)
        // y también para teclado físico
        this.keys = new Set();

        window.addEventListener('keydown', e => {
            this.keys.add(e.code);
            // Evitar scroll de página con teclas del juego
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', e => {
            this.keys.delete(e.code);
        });
    }

    isDown(code) {
        return this.keys.has(code);
    }

    // Limpiar todas las teclas (útil al pausar/reanudar para evitar input pegado)
    clearAll() {
        this.keys.clear();
    }
}
