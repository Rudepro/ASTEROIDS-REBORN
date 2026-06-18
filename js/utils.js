const Utils = {
    distance(x1, y1, x2, y2) {
        return Math.hypot(x2 - x1, y2 - y1);
    },

    randomRange(min, max) {
        return Math.random() * (max - min) + min;
    },

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    wrapBounds(entity, width, height) {
        if (entity.x < 0) entity.x = width;
        else if (entity.x > width) entity.x = 0;
        
        if (entity.y < 0) entity.y = height;
        else if (entity.y > height) entity.y = 0;
    },
    
    checkCollision(circle1, circle2) {
        const dist = this.distance(circle1.x, circle1.y, circle2.x, circle2.y);
        return dist < (circle1.radius + circle2.radius);
    }
};

// Object Pool simple
class Pool {
    constructor(createFn, initialSize = 100) {
        this.createFn = createFn;
        this.items = [];
        for (let i = 0; i < initialSize; i++) {
            this.items.push(this.createFn());
        }
    }

    get() {
        return this.items.length > 0 ? this.items.pop() : this.createFn();
    }

    release(item) {
        this.items.push(item);
    }
}
