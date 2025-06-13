import { Player } from './player';

class GameEngine {
    private isRunning: boolean;
    private lastTime: number;
    private deltaTime: number;
    private player: Player;
    private input: Record<string, boolean>;
    private cam: { x: number; y: number };
    private map: { width: number; height: number; color: string; walls: { x: number; y: number; w: number; h: number }[] };
    private enemy: { x: number; y: number; size: number; color: string; speed: number; alive: boolean };
    constructor() {
        this.isRunning = false;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.player = new Player();
        this.input = {};
        this.cam = { x: 0, y: 0 };
        this.map = {
            width: 2000,
            height: 2000,
            color: '#181a2b',
            walls: [
                { x: 400, y: 400, w: 200, h: 40 },
                { x: 800, y: 600, w: 40, h: 200 },
                { x: 1200, y: 900, w: 300, h: 40 },
            ],
        };
        this.enemy = { x: 900, y: 400, size: 32, color: '#ff0055', speed: 2.5, alive: true };
        window.addEventListener('keydown', e => this.input[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', e => this.input[e.key.toLowerCase()] = false);
    }

    initialize() {
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
    }

    gameLoop() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.update();
        this.render();

        requestAnimationFrame(this.gameLoop.bind(this));
    }

    update() {
        this.player.update(this.input);
        this.updateEnemy();
        this.updateCamera();
    }

    render() {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        // Draw map
        ctx.fillStyle = this.map.color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#222';
        for (const wall of this.map.walls) {
            ctx.fillRect(wall.x - this.cam.x, wall.y - this.cam.y, wall.w, wall.h);
        }
        // Draw player
        this.player.render(ctx, this.cam);
        // Draw enemy
        if (this.enemy.alive) {
            ctx.save();
            ctx.translate(this.enemy.x - this.cam.x, this.enemy.y - this.cam.y);
            ctx.fillStyle = this.enemy.color;
            ctx.beginPath();
            ctx.arc(0, 0, this.enemy.size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    updateEnemy() {
        if (!this.enemy.alive) return;
        const dx = this.player.x - this.enemy.x;
        const dy = this.player.y - this.enemy.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1) {
            this.enemy.x += (dx / dist) * this.enemy.speed;
            this.enemy.y += (dy / dist) * this.enemy.speed;
        }
    }

    updateCamera() {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;
        this.cam.x = this.player.x - canvas.width / 2;
        this.cam.y = this.player.y - canvas.height / 2;
        this.cam.x = Math.max(0, Math.min(this.map.width - canvas.width, this.cam.x));
        this.cam.y = Math.max(0, Math.min(this.map.height - canvas.height, this.cam.y));
    }

    stop() {
        this.isRunning = false;
    }
}

export default GameEngine;