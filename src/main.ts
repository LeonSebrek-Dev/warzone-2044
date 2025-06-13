import Phaser from 'phaser';

// --- Multiplayer Client ---
class NetPlayer {
  id: string;
  sprite: Phaser.GameObjects.Arc;
  hp: number;
  alive: boolean;
  constructor(scene: Phaser.Scene, id: string, x: number, y: number) {
    this.id = id;
    this.sprite = scene.add.circle(x, y, 18, 0xff00ff).setDepth(1);
    this.hp = 100;
    this.alive = true;
  }
  update(x: number, y: number, hp: number, alive: boolean) {
    this.sprite.x = x;
    this.sprite.y = y;
    this.hp = hp;
    this.alive = alive;
    this.sprite.setVisible(alive);
  }
  destroy() { this.sprite.destroy(); }
}

class MultiplayerPhaserClient {
  ws: WebSocket;
  id: string = '';
  players: Record<string, NetPlayer> = {};
  scene: MainScene;
  constructor(scene: MainScene) {
    this.scene = scene;
    this.ws = new WebSocket('ws://localhost:8080');
    this.ws.onmessage = (event) => this.handleMsg(event.data);
  }
  handleMsg(data: string) {
    const msg = JSON.parse(data);
    if (msg.type === 'init') {
      this.id = msg.id;
      for (const pid in msg.players) {
        if (pid !== this.id) this.players[pid] = new NetPlayer(this.scene, pid, msg.players[pid].x, msg.players[pid].y);
      }
    }
    if (msg.type === 'join') {
      if (!this.players[msg.id]) this.players[msg.id] = new NetPlayer(this.scene, msg.id, msg.x, msg.y);
    }
    if (msg.type === 'move') {
      if (this.players[msg.id]) this.players[msg.id].update(msg.x, msg.y, msg.hp, msg.alive);
    }
    if (msg.type === 'shoot') {
      this.scene.spawnNetBullet(msg.x, msg.y, msg.angle);
    }
    if (msg.type === 'respawn') {
      if (this.players[msg.id]) this.players[msg.id].update(msg.x, msg.y, 100, true);
    }
    if (msg.type === 'leave') {
      if (this.players[msg.id]) { this.players[msg.id].destroy(); delete this.players[msg.id]; }
    }
  }
  sendMove(x: number, y: number, hp: number, alive: boolean) {
    this.ws.send(JSON.stringify({ type: 'move', x, y, hp, alive }));
  }
  sendShoot(x: number, y: number, angle: number) {
    this.ws.send(JSON.stringify({ type: 'shoot', x, y, angle }));
  }
  sendRespawn(x: number, y: number) {
    this.ws.send(JSON.stringify({ type: 'respawn', x, y }));
  }
}

class Soldier extends Phaser.GameObjects.Container {
  bodySprite: Phaser.GameObjects.Arc;
  weapon: Phaser.GameObjects.Rectangle;
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    // Body: neon circle
    this.bodySprite = scene.add.circle(0, 0, 24, 0x00fff7).setStrokeStyle(4, 0x222222);
    // Weapon: neon yellow rectangle
    this.weapon = scene.add.rectangle(20, 0, 24, 8, 0xffcc00).setOrigin(0, 0.5);
    this.add([this.bodySprite, this.weapon]);
    scene.add.existing(this);
  }
  setFacing(angle: number) {
    this.weapon.setRotation(angle);
  }
}

class Bullet extends Phaser.GameObjects.Arc {
  speed: number;
  dx: number;
  dy: number;
  constructor(scene: Phaser.Scene, x: number, y: number, angle: number) {
    super(scene, x, y, 6, 0, 360, false, 0x00fff7);
    scene.add.existing(this);
    this.speed = 500;
    this.dx = Math.cos(angle) * this.speed;
    this.dy = Math.sin(angle) * this.speed;
  }
  update(dt: number) {
    this.x += this.dx * (dt / 1000);
    this.y += this.dy * (dt / 1000);
  }
}

// --- Enemy Types ---
type EnemyRole = 'shapeshifter' | 'brute' | 'sniper' | 'hacker';

class CyborgEnemy extends Phaser.GameObjects.Arc {
  alive: boolean = true;
  speed: number;
  hp: number;
  dodgeCooldown: number = 0;
  role: EnemyRole;
  shapeshiftTimer: number = 0;
  color: number;
  constructor(scene: Phaser.Scene, x: number, y: number, role: EnemyRole = 'shapeshifter') {
    super(scene, x, y, 24, 0, 360, false, 0x00fff7);
    scene.add.existing(this);
    this.role = role;
    this.hp = role === 'brute' ? 200 : 100;
    this.speed = role === 'sniper' ? 140 : role === 'brute' ? 80 : 120;
    this.color = role === 'shapeshifter' ? 0x00fff7 : role === 'brute' ? 0xff2222 : role === 'sniper' ? 0x00ff99 : 0xff00ff;
    this.setFillStyle(this.color);
  }
  update(target: Phaser.GameObjects.Container, dt: number, bullets: Bullet[], scene: Phaser.Scene) {
    if (!this.alive) return;
    // Shapeshifter: morphs color/size every few seconds
    if (this.role === 'shapeshifter') {
      this.shapeshiftTimer += dt / 1000;
      if (this.shapeshiftTimer > 2) {
        this.radius = Phaser.Math.Between(16, 32);
        this.color = Phaser.Display.Color.RandomRGB().color;
        this.setFillStyle(this.color);
        this.shapeshiftTimer = 0;
      }
    }
    // Dodge logic
    let dodge = false;
    for (const bullet of bullets) {
      const dist = Phaser.Math.Distance.Between(bullet.x, bullet.y, this.x, this.y);
      if (dist < 80 && this.dodgeCooldown <= 0) {
        const angle = Math.atan2(this.y - bullet.y, this.x - bullet.x) + Math.PI/2 * (Math.random() > 0.5 ? 1 : -1);
        this.x += Math.cos(angle) * 60;
        this.y += Math.sin(angle) * 60;
        this.dodgeCooldown = 1.2;
        dodge = true;
        break;
      }
    }
    if (!dodge) {
      // Brute: charges player, Sniper: keeps distance, Hacker: random movement
      if (this.role === 'brute') {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1) {
          this.x += (dx / dist) * this.speed * (dt / 1000);
          this.y += (dy / dist) * this.speed * (dt / 1000);
        }
      } else if (this.role === 'sniper') {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 200) {
          this.x -= (dx / dist) * this.speed * (dt / 1000);
          this.y -= (dy / dist) * this.speed * (dt / 1000);
        } else if (dist > 300) {
          this.x += (dx / dist) * this.speed * (dt / 1000);
          this.y += (dy / dist) * this.speed * (dt / 1000);
        }
      } else if (this.role === 'hacker') {
        this.x += Phaser.Math.Between(-1, 1) * this.speed * 0.2 * (dt / 1000);
        this.y += Phaser.Math.Between(-1, 1) * this.speed * 0.2 * (dt / 1000);
      } else {
        // Default: chase player
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1) {
          this.x += (dx / dist) * this.speed * (dt / 1000);
          this.y += (dy / dist) * this.speed * (dt / 1000);
        }
      }
    }
    if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt / 1000;
  }
}

class BossEnemy extends Phaser.GameObjects.Arc {
  alive: boolean = true;
  speed: number = 120;
  hp: number = 1000;
  phase: number = 1;
  invulnerable: boolean = false;
  invulnTimer: number = 0;
  color: number = 0xffd700;
  attackCooldown: number = 0;
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 40, 0, 360, false, 0xffd700);
    scene.add.existing(this);
  }
  update(target: Phaser.GameObjects.Container, dt: number, bullets: Bullet[], scene: Phaser.Scene) {
    if (!this.alive) return;
    // Phase logic: gets harder as HP drops
    if (this.hp < 700 && this.phase === 1) { this.phase = 2; this.speed = 180; }
    if (this.hp < 400 && this.phase === 2) { this.phase = 3; this.speed = 240; }
    // Invulnerability logic
    if (this.invulnTimer > 0) {
      this.invulnTimer -= dt / 1000;
      if (this.invulnTimer <= 0) this.invulnerable = false;
    }
    // Unpredictable movement: random dashes
    if (Math.random() < 0.01 * this.phase) {
      const angle = Math.random() * Math.PI * 2;
      this.x += Math.cos(angle) * 120;
      this.y += Math.sin(angle) * 120;
      this.invulnerable = true;
      this.invulnTimer = 0.5;
    }
    // Chase player if not dashing
    if (!this.invulnerable) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1) {
        this.x += (dx / dist) * this.speed * (dt / 1000);
        this.y += (dy / dist) * this.speed * (dt / 1000);
      }
    }
    // Bullet collision
    for (const bullet of bullets) {
      if (this.alive && !this.invulnerable && Phaser.Math.Distance.Between(bullet.x, bullet.y, this.x, this.y) < this.radius) {
        this.hp -= 20;
        bullet.setVisible(false);
        if (this.hp <= 0) {
          this.alive = false;
          this.setVisible(false);
        }
      }
    }
    // Draw HP bar
    if (this.alive) {
      const ctx = scene.game.canvas.getContext('2d');
      if (!ctx) return;
      ctx.save();
      ctx.fillStyle = '#000';
      ctx.fillRect(this.x - 60, this.y - 60, 120, 12);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(this.x - 60, this.y - 60, 120 * (this.hp / 1000), 12);
      ctx.restore();
    }
  }
}

// --- Multiplayer Sync (Hardcoded Demo) ---
interface PlayerState {
  id: string;
  x: number;
  y: number;
  hp: number;
  alive: boolean;
  dead?: boolean;
}

// Deklaracije za globalne varijable koje nedostaju
let errorMsg: string | undefined;
let playerId: string | undefined;
let worldState: { players: any[]; bullets: any[] } = { players: [], bullets: [] };
let ws: WebSocket;

class MultiplayerManager {
  players: Record<string, PlayerState> = {};
  localId: string;
  scene: MainScene;
  constructor(scene: MainScene, localId: string) {
    this.scene = scene;
    this.localId = localId;
    // Add local player
    this.players[localId] = {
      id: localId,
      x: scene.soldier.x,
      y: scene.soldier.y,
      hp: 100,
      alive: true,
    };
    // Add a remote player for demo
    this.players['remote'] = {
      id: 'remote',
      x: scene.soldier.x + 100,
      y: scene.soldier.y + 100,
      hp: 100,
      alive: true,
    };
  }
  syncLocalPlayer() {
    const p = this.players[this.localId];
    p.x = this.scene.soldier.x;
    p.y = this.scene.soldier.y;
    p.hp = this.scene.soldierHp;
    p.alive = this.scene.soldierAlive;
  }
  updateRemoteDemo(dt: number) {
    // Demo: remote player moves randomly
    const p = this.players['remote'];
    if (!p.alive) return;
    p.x += (Math.random() - 0.5) * 80 * (dt / 1000);
    p.y += (Math.random() - 0.5) * 80 * (dt / 1000);
    // Remote can be killed by enemies or bullets
    for (const enemy of this.scene.enemies) {
      if (enemy.alive && Phaser.Math.Distance.Between(p.x, p.y, enemy.x, enemy.y) < 32) {
        p.hp -= 20;
        if (p.hp <= 0) p.alive = false;
      }
    }
    for (const boss of this.scene.bosses) {
      if (boss.alive && Phaser.Math.Distance.Between(p.x, p.y, boss.x, boss.y) < 48) {
        p.hp -= 40;
        if (p.hp <= 0) p.alive = false;
      }
    }
    for (const bullet of this.scene.bullets) {
      if (Phaser.Math.Distance.Between(p.x, p.y, bullet.x, bullet.y) < 16) {
        p.hp -= 34;
        bullet.setVisible(false);
        if (p.hp <= 0) p.alive = false;
      }
    }
  }
  renderPlayers(ctx: CanvasRenderingContext2D, cam: { x: number; y: number }) {
    for (const id in this.players) {
      const p = this.players[id];
      if (!p.alive) continue;
      ctx.save();
      ctx.translate(p.x - cam.x, p.y - cam.y);
      ctx.fillStyle = id === this.localId ? '#00fff7' : '#ff00ff';
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = 'bold 14px Orbitron, monospace';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(id === this.localId ? 'YOU' : 'ENEMY', 0, -24);
      ctx.restore();
    }
  }
}

class MainScene extends Phaser.Scene {
  soldier!: Soldier;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  speed: number = 200;
  bullets: Bullet[] = [];
  lastShot: number = 0;
  enemies: CyborgEnemy[] = [];
  bosses: BossEnemy[] = [];
  bossSpawnTimer: number = 0;
  multiplayer!: MultiplayerManager;
  soldierHp: number = 100;
  soldierAlive: boolean = true;
  net!: MultiplayerPhaserClient;
  netBullets: Phaser.GameObjects.Arc[] = [];
  keys!: any;
  constructor() {
    super('MainScene');
  }
  create() {
    this.cameras.main.setBackgroundColor('#181a2b');
    this.soldier = new Soldier(this, 400, 300);
    if (this.input && this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.input.keyboard.addKeys('W,S,A,D');
      this.input.keyboard.on('keydown-SPACE', () => this.shoot());
      this.keys = this.input.keyboard.addKeys('SPACE');
    }
    // Inicijalizacija multiplayer klijenta i povezivanje ws
    this.net = new MultiplayerPhaserClient(this);
    ws = this.net.ws;
    // Add a wall as cover
    this.add.rectangle(500, 350, 80, 40, 0x222222).setOrigin(0.5);
    // Spawn multiple enemies with different roles
    this.enemies.push(new CyborgEnemy(this, 600, 300, 'shapeshifter'));
    this.enemies.push(new CyborgEnemy(this, 700, 400, 'brute'));
    this.enemies.push(new CyborgEnemy(this, 650, 500, 'sniper'));
    this.enemies.push(new CyborgEnemy(this, 750, 350, 'hacker'));
    this.bosses = [];
    this.bossSpawnTimer = 10; // First boss spawns after 10 seconds
    this.multiplayer = new MultiplayerManager(this, 'local');
    this.net = new MultiplayerPhaserClient(this);

    // --- Networking ---
    const WS_URL = 'ws://localhost:8080';
    let playerId = '';
    let worldState: any = {};
    let errorMsg: string | null = null;

    ws = new WebSocket(WS_URL);
    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.type === 'init') {
        playerId = data.id;
      }
      if (data.type === 'state') {
        worldState = data;
      }
      if (data.type === 'error') {
        errorMsg = data.message;
      }
    };
    ws.onerror = (err) => {
      errorMsg = 'Network error. Please check your connection.';
    };
    ws.onclose = () => {
      errorMsg = 'Disconnected from server.';
    };
  }
  shoot() {
    const angle = this.soldier.weapon.rotation;
    const x = this.soldier.x + Math.cos(angle) * 32;
    const y = this.soldier.y + Math.sin(angle) * 32;
    this.bullets.push(new Bullet(this, x, y, angle));
    this.net.sendShoot(x, y, angle);
  }
  spawnNetBullet(x: number, y: number, angle: number) {
    const b = new Bullet(this, x, y, angle);
    b.setFillStyle(0xff00ff);
    this.netBullets.push(b);
  }
  update(time: number, dt: number) {
    if (errorMsg) {
      this.add.text(40, 40, errorMsg, { color: '#ff4444', fontSize: '32px' });
      return;
    }
    if (!playerId) return;
    const me = worldState.players.find((p: any) => p.id === playerId);
    if (!me) return;

    // Movement
    let dx = 0, dy = 0;
    if (this.cursors && this.input && this.input.keyboard && (this.cursors.left?.isDown || this.input.keyboard.addKey('A').isDown)) dx -= 1;
    if (this.cursors && this.input && this.input.keyboard && (this.cursors.right?.isDown || this.input.keyboard.addKey('D').isDown)) dx += 1;
    if (this.cursors && this.input && this.input.keyboard && (this.cursors.up?.isDown || this.input.keyboard.addKey('W').isDown)) dy -= 1;
    if (this.cursors && this.input && this.input.keyboard && (this.cursors.down?.isDown || this.input.keyboard.addKey('S').isDown)) dy += 1;
    if (!me.dead && (dx || dy)) {
      const speed = 6;
      const nx = me.x + dx * speed;
      const ny = me.y + dy * speed;
      if (ws) ws.send(JSON.stringify({ type: 'move', x: nx, y: ny }));
    }

    // Shooting
    if (!me.dead && this.keys && this.keys.SPACE.isDown && Date.now() - this.lastShot > 200) {
      const pointer = this.input.activePointer;
      const angle = Math.atan2(pointer.worldY - me.y, pointer.worldX - me.x);
      if (ws) ws.send(JSON.stringify({ type: 'shoot', angle }));
      this.lastShot = Date.now();
    }

    // Render players
    this.children.removeAll();
    worldState.players.forEach((p: any) => {
      const color = p.id === playerId ? 0x00ff00 : 0xff00ff;
      this.add.circle(p.x, p.y, 24, color, p.dead ? 0.3 : 1);
      this.add.text(p.x - 20, p.y - 40, `HP: ${p.hp}`, { color: '#fff' });
    });

    // Render bullets
    worldState.bullets.forEach((b: any) => {
      this.add.circle(b.x, b.y, 6, 0xffff00);
    });

    // Respawn message
    if (me.dead) {
      this.add.text(me.x - 40, me.y - 80, 'Respawning...', { color: '#ff4444' });
    }
  }
  spawn() {
    // ...existing code...
    const ctx = this.game.canvas.getContext('2d');
    if (ctx) {
      this.multiplayer.renderPlayers(ctx, { x: 0, y: 0 });
    }
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#181a2b',
  scene: MainScene,
  parent: 'game-root',
};

window.onload = () => {
  const root = document.createElement('div');
  root.id = 'game-root';
  document.body.appendChild(root);
  new Phaser.Game(config);
};