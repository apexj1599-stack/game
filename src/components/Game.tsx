import { useEffect, useRef, useState } from "react";

type Player = { x:number; y:number; hp:number; maxHp:number; speed:number; fire:number; dash:number; dashCd:number; color:string; dead:boolean; level:number; xp:number; nextXp:number; damage:number; shots:number; score:number };
type Enemy = { x:number; y:number; r:number; hp:number; maxHp:number; speed:number; damage:number; kind:"husk"|"shooter"|"charger"|"boss"; elite:boolean; phase:number };
type Bullet = { x:number; y:number; vx:number; vy:number; damage:number; life:number; enemy:boolean; r:number; owner:number };

type Mode = "menu" | "play" | "upgrade" | "pause" | "end";
const W = 1200;
const H = 675;
const MAX_WAVE = 30;
const COLORS = ["#ff9f43", "#65e6ff"];
const UPGRADE_NAMES = [
  ["HOT CORES", "Damage +20%", "damage"],
  ["LIGHT BOOTS", "Move speed +15%", "speed"],
  ["QUICK HANDS", "Fire rate +18%", "fire"],
  ["REINFORCED", "Max HP +25 and full heal", "hp"],
  ["DASH COILS", "Dash cooldown -20%", "dash"],
  ["TWIN BARREL", "Fire one extra projectile", "shots"],
] as const;

function readMeta(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem("emberfall.meta.v3") || "{}"); } catch { return {}; }
}
function writeMeta(meta: Record<string, number>) {
  try { localStorage.setItem("emberfall.meta.v3", JSON.stringify(meta)); } catch { /* storage can be blocked */ }
}

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keys = useRef<Record<string, boolean>>({});
  const frame = useRef(0);
  const last = useRef(0);
  const [, force] = useState(0);
  const [screen, setScreen] = useState<Mode>("menu");
  const state = useRef({
    players: [] as Player[], enemies: [] as Enemy[], bullets: [] as Bullet[],
    wave: 0, time: 0, spawn: 0, kills: 0, credits: 0, shake: 0,
    message: "", meta: readMeta(), bossDefeated: 0, victory: false,
  });
  const s = state.current;

  const redraw = () => force(v => v + 1);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
      if (e.code === "Escape") {
        if (screen === "play") { setScreen("pause"); }
        else if (screen === "pause") { setScreen("play"); }
      }
    };
    const up = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [screen]);

  const begin = (count: 1 | 2) => {
    const makePlayer = (i: number): Player => ({ x: W / 2 + (i ? 75 : -75), y: H - 100, hp: 100, maxHp: 100, speed: 215, fire: 0, dash: 0, dashCd: 0, color: COLORS[i], dead: false, level: 1, xp: 0, nextXp: 30, damage: 1, shots: 1, score: 0 });
    s.players = Array.from({ length: count }, (_, i) => makePlayer(i));
    for (const p of s.players) {
      p.damage *= 1 + (s.meta.damage || 0) * 0.08;
      p.speed *= 1 + (s.meta.speed || 0) * 0.05;
      p.maxHp += (s.meta.hp || 0) * 20;
      p.hp = p.maxHp;
    }
    s.enemies = []; s.bullets = []; s.wave = 0; s.time = 0; s.spawn = 0;
    s.kills = 0; s.credits = 0; s.shake = 0; s.bossDefeated = 0; s.victory = false;
    nextWave();
  };

  const nextWave = () => {
    s.wave += 1; s.time = 0; s.spawn = 0; s.enemies = []; s.bullets = [];
    if (s.wave > MAX_WAVE) { s.victory = true; setScreen("end"); return; }
    s.message = s.wave % 5 === 0 ? "⚠ BOSS WAVE" : `WAVE ${s.wave}`;
    setScreen("play");
    redraw();
  };

  const applyUpgrade = (kind: string) => {
    for (const p of s.players) {
      if (kind === "damage") p.damage *= 1.2;
      if (kind === "speed") p.speed *= 1.15;
      if (kind === "fire") p.fire = Math.max(0, p.fire - 0.18);
      if (kind === "hp") { p.maxHp += 25; p.hp = p.maxHp; }
      if (kind === "dash") p.dashCd = Math.max(0, p.dashCd - 0.2);
      if (kind === "shots") p.shots = Math.min(4, p.shots + 1);
    }
    nextWave();
  };

  const spawnEnemy = () => {
    const wave = s.wave;
    const angle = Math.random() * Math.PI * 2;
    const radius = 500;
    const boss = wave % 5 === 0 && s.enemies.every(e => e.kind !== "boss");
    const roll = Math.random();
    const kind: Enemy["kind"] = boss ? "boss" : roll < 0.18 ? "shooter" : roll < 0.34 ? "charger" : "husk";
    const scale = 1 + (wave - 1) * 0.075;
    const baseHp = kind === "boss" ? 850 + wave * 190 : kind === "charger" ? 55 + wave * 8 : kind === "shooter" ? 42 + wave * 7 : 28 + wave * 6;
    s.enemies.push({
      x: W / 2 + Math.cos(angle) * radius, y: H / 2 + Math.sin(angle) * radius,
      r: kind === "boss" ? 44 : kind === "charger" ? 20 : kind === "shooter" ? 16 : 14,
      hp: baseHp * scale, maxHp: baseHp * scale,
      speed: kind === "boss" ? 40 + wave : kind === "charger" ? 120 + wave * 2 : kind === "shooter" ? 58 + wave : 76 + wave * 1.5,
      damage: kind === "boss" ? 24 + wave : 7 + wave * 0.8,
      kind, elite: kind !== "boss" && wave >= 7 && Math.random() < Math.min(0.22, wave * 0.012), phase: 0,
    });
  };

  const update = (dt: number) => {
    s.time += dt; s.spawn -= dt; s.shake = Math.max(0, s.shake - dt * 25);
    const wave = s.wave;
    const cap = Math.min(70, 8 + wave * 2);
    if (s.spawn <= 0 && s.enemies.length < cap) { spawnEnemy(); s.spawn = Math.max(0.12, 0.72 - wave * 0.014); }

    s.players.forEach((p, i) => {
      if (p.dead) return;
      const k = keys.current;
      const left = !!k[i ? "ArrowLeft" : "KeyA"], right = !!k[i ? "ArrowRight" : "KeyD"];
      const up = !!k[i ? "ArrowUp" : "KeyW"], down = !!k[i ? "ArrowDown" : "KeyS"];
      let dx = Number(right) - Number(left), dy = Number(down) - Number(up);
      const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
      const dashKey = !!k[i ? "ShiftRight" : "Space"];
      if (dashKey && p.dashCd <= 0 && (dx !== 0 || dy !== 0)) { p.dash = 0.14; p.dashCd = 0.9; }
      p.dash = Math.max(0, p.dash - dt); p.dashCd = Math.max(0, p.dashCd - dt);
      const speed = p.speed * (p.dash > 0 ? 3.8 : 1);
      p.x = Math.max(22, Math.min(W - 22, p.x + dx * speed * dt));
      p.y = Math.max(22, Math.min(H - 22, p.y + dy * speed * dt));
      p.fire = Math.max(0, p.fire - dt);
      let target: Enemy | undefined; let best = Infinity;
      for (const e of s.enemies) { const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2; if (d < best) { best = d; target = e; } }
      if (target && p.fire <= 0) {
        const a = Math.atan2(target.y - p.y, target.x - p.x);
        for (let n = 0; n < p.shots; n++) {
          const spread = (n - (p.shots - 1) / 2) * 0.11;
          s.bullets.push({ x: p.x, y: p.y, vx: Math.cos(a + spread) * 570, vy: Math.sin(a + spread) * 570, damage: 15 * p.damage, life: 1.7, enemy: false, r: 4, owner: i });
        }
        p.fire = Math.max(0.07, 0.25 - (s.meta.fire || 0) * 0.02);
      }
    });

    for (let i = s.bullets.length - 1; i >= 0; i--) {
      const b = s.bullets[i]; b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) { s.bullets.splice(i, 1); continue; }
      if (b.enemy) {
        let removed = false;
        for (const p of s.players) if (!p.dead && Math.hypot(p.x - b.x, p.y - b.y) < 19) { p.hp -= b.damage; s.shake = 5; removed = true; if (p.hp <= 0) p.dead = true; break; }
        if (removed) s.bullets.splice(i, 1);
      } else {
        let hit = false;
        for (let ei = s.enemies.length - 1; ei >= 0; ei--) {
          const e = s.enemies[ei];
          if (Math.hypot(e.x - b.x, e.y - b.y) < e.r + b.r) {
            e.hp -= b.damage; hit = true;
            if (e.hp <= 0) {
              s.enemies.splice(ei, 1); s.kills += 1; s.credits += e.kind === "boss" ? 100 : 2 + Math.ceil(wave * 0.4);
              if (e.kind === "boss") s.bossDefeated += 1;
              const p = s.players[b.owner];
              p.score += e.kind === "boss" ? 1000 : e.elite ? 50 : 10;
              p.xp += e.kind === "boss" ? 35 : e.elite ? 10 : 5;
              if (p.xp >= p.nextXp) { p.xp -= p.nextXp; p.level += 1; p.nextXp = Math.ceil(p.nextXp * 1.3); setScreen("upgrade"); }
            }
            break;
          }
        }
        if (hit) s.bullets.splice(i, 1);
      }
    }

    for (const e of s.enemies) {
      const alive = s.players.filter(p => !p.dead);
      if (!alive.length) break;
      let target = alive[0]; let best = Infinity;
      for (const p of alive) { const d = (p.x - e.x) ** 2 + (p.y - e.y) ** 2; if (d < best) { best = d; target = p; } }
      const a = Math.atan2(target.y - e.y, target.x - e.x);
      const dist = Math.hypot(target.x - e.x, target.y - e.y);
      if (e.kind === "shooter" && dist < 380) { e.x -= Math.cos(a) * e.speed * dt * 0.45; e.y -= Math.sin(a) * e.speed * dt * 0.45; }
      else { e.x += Math.cos(a) * e.speed * dt; e.y += Math.sin(a) * e.speed * dt; }
      if ((e.kind === "shooter" || e.kind === "boss") && Math.random() < dt * (e.kind === "boss" ? 1.5 : 0.55)) {
        s.bullets.push({ x:e.x, y:e.y, vx:Math.cos(a)*270, vy:Math.sin(a)*270, damage:e.damage, life:3, enemy:true, r:e.kind === "boss" ? 8 : 6, owner:-1 });
      }
      for (const p of alive) if (Math.hypot(p.x - e.x, p.y - e.y) < e.r + 15) { p.hp -= e.damage * dt * (e.kind === "boss" ? 1.15 : 1); if (p.hp <= 0) p.dead = true; }
    }

    if (s.players.every(p => p.dead)) { s.victory = false; setScreen("end"); return; }
    if (s.enemies.length === 0 && s.time > 2) {
      if (wave >= MAX_WAVE) { s.victory = true; setScreen("end"); }
      else if (screen === "play") setScreen("upgrade");
    }
    redraw();
  };

  const draw = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const sx = (Math.random() - 0.5) * s.shake, sy = (Math.random() - 0.5) * s.shake;
    ctx.save(); ctx.translate(sx, sy);
    const bg = ctx.createRadialGradient(W/2, H/2, 20, W/2, H/2, 800);
    bg.addColorStop(0, "#28182d"); bg.addColorStop(1, "#070810"); ctx.fillStyle = bg; ctx.fillRect(-20,-20,W+40,H+40);
    ctx.strokeStyle = "rgba(255,180,100,.06)";
    for (let x=0;x<W;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for (let y=0;y<H;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    for (const b of s.bullets) { ctx.fillStyle=b.enemy?"#ff4f68":"#ffd18a"; ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=12;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill(); }
    ctx.shadowBlur=0;
    for (const e of s.enemies) {
      const color=e.kind==="boss"?"#ff3d6e":e.kind==="shooter"?"#7fe8ff":e.kind==="charger"?"#ff8fc7":"#ff795c";
      ctx.save();ctx.translate(e.x,e.y);ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=e.kind==="boss"?28:12;
      if(e.kind==="boss"){ctx.rotate(s.time);ctx.beginPath();for(let n=0;n<10;n++){const a=n*Math.PI/5,r=n%2?e.r*.62:e.r;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.fill();}
      else if(e.kind==="charger"){ctx.rotate(Math.PI/4);ctx.fillRect(-e.r*.72,-e.r*.72,e.r*1.44,e.r*1.44);}
      else{ctx.beginPath();ctx.arc(0,0,e.r,0,Math.PI*2);ctx.fill();}
      ctx.restore();
      ctx.fillStyle="rgba(0,0,0,.55)";ctx.fillRect(e.x-e.r,e.y-e.r-9,e.r*2,4);ctx.fillStyle=color;ctx.fillRect(e.x-e.r,e.y-e.r-9,e.r*2*Math.max(0,e.hp/e.maxHp),4);
    }
    for (const p of s.players) if (!p.dead) { ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=20;ctx.beginPath();ctx.moveTo(21,0);ctx.lineTo(-14,12);ctx.lineTo(-7,0);ctx.lineTo(-14,-12);ctx.closePath();ctx.fill();ctx.restore(); }
    ctx.restore();
  };

  useEffect(() => {
    const loop = (time: number) => {
      frame.current = requestAnimationFrame(loop);
      const dt = Math.min(0.033, last.current ? (time-last.current)/1000 : 0.016); last.current = time;
      if (screen === "play") { update(dt); draw(); }
    };
    frame.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame.current);
  }, [screen]);

  if (screen === "menu") return <main className="game-shell min-h-screen flex items-center justify-center p-5"><section className="glass w-full max-w-4xl rounded-[2rem] p-7 sm:p-12"><div className="text-center"><p className="text-xs font-black tracking-[.5em] text-primary">SURVIVE THE ASHES</p><h1 className="mt-2 text-6xl sm:text-8xl font-black tracking-[.12em] text-primary">EMBERFALL</h1><p className="mx-auto mt-4 max-w-2xl text-muted-foreground">A fast arena survival game where the enemies get smarter, the bosses get meaner, and your build gets ridiculous.</p></div><div className="mx-auto mt-8 grid max-w-xl gap-3"><button className="menu-button rounded-2xl p-5 text-left" onClick={()=>begin(1)}><b className="text-xl">PLAY SOLO</b><span className="block text-sm text-muted-foreground">WASD to move · SPACE to dash</span></button><button className="menu-button rounded-2xl p-5 text-left" onClick={()=>begin(2)}><b className="text-xl">LOCAL CO-OP</b><span className="block text-sm text-muted-foreground">P1 WASD + SPACE · P2 ARROWS + RIGHT SHIFT</span></button></div><div className="mt-7 grid grid-cols-3 gap-3 text-center text-xs text-muted-foreground"><div className="glass rounded-xl p-3"><b className="block text-xl text-foreground">30</b>WAVES</div><div className="glass rounded-xl p-3"><b className="block text-xl text-foreground">6</b>BOSSES</div><div className="glass rounded-xl p-3"><b className="block text-xl text-foreground">∞</b>BUILDS</div></div></section></main>;

  if (screen === "upgrade") return <main className="game-shell min-h-screen flex items-center justify-center p-5"><section className="glass w-full max-w-5xl rounded-[2rem] p-7 sm:p-10"><p className="text-center text-xs font-black tracking-[.4em] text-accent">POWER SPIKE</p><h2 className="mt-2 text-center text-4xl sm:text-5xl font-black">CHOOSE AN UPGRADE</h2><p className="mt-2 text-center text-muted-foreground">Wave {s.wave} cleared. Pick something unfair. The enemies won't.</p><div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{UPGRADE_NAMES.map(([name,desc,kind])=><button key={kind} onClick={()=>applyUpgrade(kind)} className="menu-button rounded-2xl p-5 text-left"><span className="text-xs font-bold tracking-widest text-primary">UPGRADE</span><h3 className="mt-2 text-xl font-black">{name}</h3><p className="mt-1 text-sm text-muted-foreground">{desc}</p></button>)}</div></section></main>;

  if (screen === "pause") return <main className="game-shell min-h-screen flex items-center justify-center p-5"><section className="glass w-full max-w-md rounded-[2rem] p-9 text-center"><p className="text-xs font-bold tracking-[.4em] text-primary">EMBERFALL</p><h2 className="mt-2 text-5xl font-black">PAUSED</h2><button className="menu-button mt-8 w-full rounded-2xl p-4 font-black" onClick={()=>setScreen("play")}>RESUME</button><button className="menu-button mt-3 w-full rounded-2xl p-4 font-black" onClick={()=>setScreen("menu")}>QUIT RUN</button></section></main>;

  if (screen === "end") return <main className="game-shell min-h-screen flex items-center justify-center p-5"><section className="glass w-full max-w-xl rounded-[2rem] p-9 text-center"><p className="text-xs font-black tracking-[.4em] text-primary">{s.victory?"CAMPAIGN COMPLETE":"RUN OVER"}</p><h2 className="mt-3 text-5xl font-black">{s.victory?"YOU SURVIVED":"THE ASHES WIN"}</h2><p className="mt-5 text-muted-foreground">Wave {Math.min(s.wave,MAX_WAVE)} · {s.kills} kills · {s.credits} credits · {s.bossDefeated} bosses</p><button className="menu-button mt-8 w-full rounded-2xl p-4 font-black" onClick={()=>begin(s.players.length===2?2:1)}>PLAY AGAIN</button><button className="menu-button mt-3 w-full rounded-2xl p-4 font-black" onClick={()=>setScreen("menu")}>MAIN MENU</button></section></main>;

  return <main className="game-shell min-h-screen flex items-center justify-center p-2 sm:p-4"><section className="relative w-full max-w-[1200px] overflow-hidden rounded-2xl border border-white/10 shadow-2xl"><div className="pointer-events-none absolute left-3 right-3 top-3 z-10 flex items-start justify-between gap-3"><div className="glass rounded-xl px-3 py-2 text-xs font-bold">WAVE <span className="text-primary">{s.wave}/{MAX_WAVE}</span><span className="mx-2 opacity-40">•</span>KILLS <span className="text-primary">{s.kills}</span></div><div className="glass rounded-xl px-3 py-2 text-xs font-bold text-primary">{s.message}</div><button className="pointer-events-auto glass rounded-xl px-3 py-2 text-xs font-black" onClick={()=>setScreen("pause")}>Ⅱ</button></div><canvas ref={canvasRef} width={W} height={H} className="block h-auto w-full" /></section></main>;
}
