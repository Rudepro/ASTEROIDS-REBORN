# 🚀 Asteroids Reborn — Neon Edition

> Arcade espacial de acción inspirado en el clásico Asteroids, construido desde cero con HTML5 Canvas puro, JavaScript vanilla y un diseño estético neon premium.

![Game Preview](public/images/logo.png)

---

## 🎮 Descripción

**Asteroids Reborn** es un juego arcade 2D de alto rendimiento que moderniza la fórmula clásica del juego original de Atari (1979) con:

- Sistema de **múltiples armas** intercambiables en tiempo real
- Modo **Campaña** con niveles progresivos de dificultad
- Modo **Supervivencia** con oleadas infinitas y escalado dinámico
- Sistema de **Power-ups** con efectos temporales y permanentes
- HUD premium en estilo neon con barras animadas
- Arquitectura optimizada con **Object Pools** y **canvas offscreen**

---

## 🕹️ Controles

| Tecla | Acción |
|---|---|
| `W` / `↑` | Acelerar |
| `A` / `←` | Rotar izquierda |
| `D` / `→` | Rotar derecha |
| `S` / `↓` | Frenar |
| `SPACE` | Disparar |
| `P` / `ESC` | Pausar / Reanudar |

---

## 🏗️ Estructura del Proyecto

```
ASTEROIDS-REBORN/
├── index.html              # Punto de entrada — HTML semántico completo
├── css/
│   └── style.css           # Diseño neon premium, HUD animado, responsive
├── js/
│   ├── config.js           # Configuración central (velocidades, colores, balanceo)
│   ├── utils.js            # Pool de objetos, detección de colisión, utilidades
│   ├── entities.js         # Clase base Entity (x, y, vx, vy, radius, active)
│   ├── input.js            # Manejador de teclado con preventDefault en teclas de juego
│   ├── audio.js            # Controlador de audio (Web Audio / HTMLAudio)
│   ├── renderer.js         # Fondo parallax pre-renderizado en canvas offscreen
│   ├── player.js           # Nave del jugador con cache offscreen y multi-arma
│   ├── asteroids.js        # Asteroides con forma irregular y cache offscreen
│   ├── weapons.js          # 5 tipos de arma: Laser, Spread, Plasma, Rapid, Missile (guiado)
│   ├── particles.js        # Sistema de partículas con pool y fricción optimizada
│   ├── powerups.js         # 9 tipos de power-up (armas + stats + efectos temporales)
│   ├── enemies.js          # (Reservado: enemigos básicos con IA)
│   ├── bosses.js           # Lógica de jefe: IA, movimiento y patrones de disparo
│   ├── ui.js               # HUD: salud, escudo, puntaje, arma activa, notificaciones
│   ├── saveSystem.js       # Persistencia en localStorage (highscore, maxLevel)
│   ├── upgrades.js         # (Reservado: sistema de mejoras roguelite)
│   ├── achievements.js     # (Reservado: logros)
│   ├── game.js             # Motor principal — game loop, física, colisiones
│   └── main.js             # Inicialización y binding de botones
└── public/
    ├── images/             # Assets gráficos (logo.png)
    └── sounds/             # Efectos de audio (.mp3)
```

---

## ⚙️ Sistema de Armas

| Arma | Icóno | Cadencia | Daño | Velocidad | Municción | Especial |
|---|---|---|---|---|---|---|
| Láser | 🔵 | Alta | 10 | 20 | ∞ | Preciso, arma base infinita |
| Dispersor | 🌟 | Media | 7×3 | 17 | 18 disp. | 3 proyectiles en cono |
| Plasma | 💠 | Baja | 25 | 14 | 12 disp. | Esfera de energía con halo |
| Ráfaga | ⚡ | Muy alta | 5 | 22 | 40 disp. | Disparo rápido con dispersión |
| Misil | 🚀 | Muy baja | 999 | 12 | 5 misiles | Guiado hacia el asteroide más cercano, destrucción total |

### Munición Limitada
Todas las armas secundarias tienen un límite de disparos visible en el HUD. Al agotar la munición, el arma regresa automáticamente al **Láser** con una notificación en pantalla.

### Misil Dirigido
El **Misil** es el arma especial más poderosa:
- Se guia automáticamente hacia el asteroide más cercano (homing AI)
- Destruye **completamente** el asteroide en su forma más pequeña sin fragmentarlo
- Para asteroides grandes y medianos, también los elimina de un golpe con una explosión extra
- Solo 5 misiles disponibles por recarga de power-up

Las armas se obtienen recogiendo **power-ups hexagonales** que caen de los asteroides grandes.

---

## 📎 Power-Ups

| Power-Up | Color | Efecto |
|---|---|---|
| Arma: Láser | Cian | Cambia al arma Láser (∞ balas) |
| Arma: Dispersor | Magenta | 18 disparos en abanico, luego regresa al Láser |
| Arma: Plasma | Verde | 12 disparos potentes, luego regresa al Láser |
| Arma: Ráfaga | Amarillo | 40 disparos rápidos, luego regresa al Láser |
| Arma: Misil | Naranja | 5 misiles dirigidos que destruyen asteroides totalmente |
| Escudo | Azul | +30 de escudo |
| Vida | Rojo | +25 de vida |
| Velocidad | Naranja | ×1.7 velocidad por 5 seg |
| Invencible | Blanco | Invulnerabilidad por 3 seg |

---

## 🚀 Modos de Juego

### 🎯 Campaña
- Niveles progresivos (1 → N)
- Cada nivel añade más asteroides (`4 + nivel`)
- Los asteroides grandes se fragmentan en 2 medianos, los medianos en 2 pequeños
- Cada 3 niveles aparece un **Jefe** con un patrón de ataque tipo bullet-hell
- Al completar un nivel se guarda el progreso para selección de nivel

### ☠ Supervivencia
- Oleadas infinitas de asteroides con tasa de spawn que escala lentamente
- Máximo de 18 asteroides simultáneos para mantener el rendimiento
- Timer de supervivencia visible en el HUD
- Puntaje ×2 por cada asteroide destruido

---

## 🔧 Arquitectura Técnica

### Game Loop
```
requestAnimationFrame(loop)
  └── update(dt)          ← Física, IA, colisiones, spawn
  └── draw()              ← Render canvas en orden de capas
```

El `dt` (delta time) está normalizado a 60 FPS y clampeado a máximo 3× para evitar saltos si la pestaña pierde foco.

### Optimizaciones de Rendimiento

| Técnica | Aplicación | Ganancia |
|---|---|---|
| **Canvas Offscreen** | Fondo de estrellas, asteroides, nave, power-ups | Elimina paths + shadowBlur repetidos cada frame |
| **Object Pool** | Partículas (cap. 600) y proyectiles (cap. 200) | Sin GC pressure en explosiones |
| **Filtrado in-place** | Limpieza de arrays de entidades | Sin `Array.filter()` (evita allocaciones) |
| **Colisión x²-y²** | En lugar de `Math.hypot()` | ~30% más rápido en hot path O(n²) |
| **UI diff caching** | HUD solo actualiza DOM si hay cambio real | Elimina thrashing DOM cada frame |
| **Sin Math.pow en loop** | Fricción por multiplicación lineal | ~5× más rápido por entidad |
| **Sin window.innerWidth** | Dimensiones cacheadas en `game.W/H` | Evita reflow en hot path |
| **backdrop-filter eliminado del HUD** | Solo en menús estáticos | Elimina capa de composición GPU extra |
| **Partículas capeadas** | Máx 400 simultáneas | Evita acumulación en explosiones grandes |

### Sistema de Colisiones
Detección circular O(n²) con cálculo de distancia al cuadrado:
```js
const dx = a.x - b.x, dy = a.y - b.y;
const r = a.radius + b.radius;
if (dx*dx + dy*dy < r*r) { /* colisión */ }
```

### Object Pool
```js
class Pool {
    get()     { return this.items.pop() ?? this.createFn(); }
    release() { this.items.push(item); }
}
```

---

## 🎨 Sistema Visual

### Modo Neon (por defecto)
- Fondo oscuro `#050510` con nebulosas radiales y 250 estrellas
- Nave en cian `#00ffff` con glow neon
- Asteroides con borde de color y glow (grande=naranja, mediano=amarillo, pequeño=azul)
- Partículas de color según el tipo de impacto

### Modo Realista (toggle en Configuración)
- Paleta de tonos apagados, nave en azul suave
- Fondo más oscuro `#111118`

---

## 💾 Persistencia (localStorage)

| Clave | Tipo | Descripción |
|---|---|---|
| `highScore` | Number | Puntaje máximo histórico |
| `maxLevel` | Number | Nivel más alto desbloqueado en campaña |

---

## 🔊 Sistema de Audio

Archivos en `public/sounds/`:

| ID | Archivo | Evento |
|---|---|---|
| `Boss_Explosion` | Boss_Explosion.mp3 | Explocion del jefe |
| `Boss_Hit` | Boss_Hit.mp3 | El jefe recibe daño |
| `Boss` | Boss.mp3 | El jefe aparece |
| `Game_Win` | Game_Win.mp3 | El jugador gana |
| `music_boss` | music_boss.mp3 | Musica del jefe |
| `music_gameplay` | music_gameplay.mp3 | Musica del juego |
| `music_menu` | music_menu.mp3 | Musica del menu |
| `Player_Win_Life` | Player_Win_Life.mp3 | El jugador gana una vida |
| `Powerup_Health` | Powerup_Health.mp3 | El jugador obtiene vida |
| `Powerup_Weapon` | Powerup_Weapon.mp3 | El jugador obtiene un arma |
| `Powerup_Speed` | Powerup_Speed.mp3 | El jugador obtiene velocidad |
| `Shield_Activate` | Shield_Activate.mp3 | El jugador activa el escudo |
| `Shot` | Shot.mp3 | Disparo del jugador |
| `Enemy_Died` | Enemy_Died.mp3 | Destrucción de asteroide |
| `Player_Lost_Life` | Player_Lost_Life.mp3 | Jugador recibe daño |
| `Game_Over` | Game_Over.mp3 | Fin de partida |
| `Level_Win` | Level_Win.mp3 | Nivel completado |
---

## 🛠️ Instalación y Ejecución

### Sin dependencias (abrir directo)
```
Doble clic en index.html
```
> ⚠️ Algunos navegadores bloquean audio en archivos locales.

### Con servidor local (recomendado)
```bash
# Con VS Code Live Server (extensión)
# Clic derecho en index.html → "Open with Live Server"

# O con Node.js
npx serve .

# O con Python
python -m http.server 5500
```

Luego abrir: `http://localhost:5500`

---

## 📦 Dependencias

- **Cero dependencias** de npm/bundlers
- Google Fonts: `Orbitron` (HUD) + `Exo 2` (texto general)
- HTML5 Canvas API
- Web Audio API (para sonido)

---

## 🐛 Bugs Conocidos / Limitaciones

- Los enemigos básicos con IA avanzada están reservados para implementación futura (solo hay jefes actualmente)
- El sistema de mejoras permanentes (cristales) aún no persiste compras entre sesiones
- En pantallas muy pequeñas (<480px) el HUD puede solaparse

---

## 🗺️ Roadmap

- [ ] Enemigos con IA (patrullaje, persecución, evasión)
- [x] Jefes multi-fase con patrones de ataque únicos (Jefe implementado: IA de seguimiento + disparo en abanico, aparece cada 3 niveles)
- [ ] Sistema de mejoras permanentes con moneda del juego
- [ ] Logros desbloqueables
- [ ] Tabla de puntuaciones locales (top 5)
- [ ] Modo cooperativo local (2 jugadores, mismo teclado)
- [ ] Editor de niveles básico

---

## 👥 Créditos

Desarrollado como proyecto académico — PUCESA  
Motor de juego: HTML5 Canvas puro + JavaScript ES6+  
Diseño: Estética Neon arcade (inspirado en Asteroids, Geometry Wars)

---

*Versión actual: **REBORN · NEON EDITION***
