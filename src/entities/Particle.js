// ─── Particle System ──────────────────────────────────────────────────────────

export class Particle {
    constructor(x, y, vx, vy, color, life, size = 3) {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy;
        this.color = color; this.life = life; this.maxLife = life; this.size = size;
        this.dead = false;
    }
    update(dt) {
        this.x += this.vx * (dt / 1000); this.y += this.vy * (dt / 1000);
        this.vy += 120 * (dt / 1000); // gravity
        this.life -= dt;
        if (this.life <= 0) this.dead = true;
    }
    draw(ctx) {
        const a = this.life / this.maxLife;
        ctx.globalAlpha = a;
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size * a, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    }
}


export class FloatingText {
    constructor(x, y, text, color = '#ffffff', life = 900) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = life;
        this.maxLife = life;
        this.dead = false;
    }
    update(dt) {
        this.y -= 24 * (dt / 1000);
        this.life -= dt;
        if (this.life <= 0) this.dead = true;
    }
    draw(ctx) {
        const a = Math.max(0, this.life / this.maxLife);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.9)';
        ctx.fillStyle = this.color;
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

/** Standard death/hit effect */
export function spawnDeathParticles(x, y, color, count = 8) {
    const parts = [];
    for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 30 + Math.random() * 80;
        parts.push(new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s - 30, color, 350 + Math.random() * 250, 2 + Math.random() * 2));
    }
    return parts;
}

/** Pokéball capture effect — pokéball circles + sparkles */
export function spawnCaptureEffect(x, y, pokemonColor = '#ffdd00') {
    const parts = [];
    // Spinning ring particles (pokéball red)
    for (let i = 0; i < 12; i++) {
        const a = (Math.PI * 2 * i) / 12;
        const s = 60 + Math.random() * 40;
        parts.push(new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s - 20, '#f04040', 500, 3));
    }
    // Stars/sparkles (gold)
    for (let i = 0; i < 8; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 40 + Math.random() * 60;
        parts.push(new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s - 40, '#ffd700', 600 + Math.random() * 300, 2.5));
    }
    // Pokémon color dust
    for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 20 + Math.random() * 40;
        parts.push(new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s, pokemonColor, 400, 2));
    }
    return parts;
}

/** Legendary capture — bigger splash */
export function spawnLegendaryCaptureEffect(x, y) {
    const parts = [];
    for (let ring = 1; ring <= 3; ring++) {
        for (let i = 0; i < 16; i++) {
            const a = (Math.PI * 2 * i) / 16, s = 40 + ring * 40;
            const colors = ['#ffd700', '#ffffff', '#ff8800'];
            parts.push(new Particle(x, y + ring * 2, Math.cos(a) * s, Math.sin(a) * s - 30 * ring, colors[ring - 1], 700 + ring * 200, 3));
        }
    }
    return parts;
}
