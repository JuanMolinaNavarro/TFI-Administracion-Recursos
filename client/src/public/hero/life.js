// Todo lo que se mueve dentro del paisaje: partidos, karts, autos, gente, aves y humo.
import { COURT, FAR_ROAD_Z, RAIL_Z, ROAD_Z, TRACK, WALK_PATHS, clamp, halfWidthAt, lerp, pointAt, project, riverX, seeded } from './world.js';

const SHADOW = 'rgba(8,44,38,.36)';
const SKIN = ['#f2c7a5', '#d9a07a', '#a96f4d', '#f6d3b8'];

function createMatch(rand, config) {
  const { hw, hd, perSide, goal, kits, ball: ballStyle, onScore } = config;
  const players = [];
  [0, 1].forEach(team => {
    const dir = team ? 1 : -1;
    if (config.keepers) players.push({ team, keeper: true, hx: dir * (hw - 1.6), hz: 0 });
    for (let i = 0; i < perSide; i++) {
      players.push({ team, hx: dir * lerp(hw * 0.16, hw * 0.68, (i % 3) / 2 + rand() * 0.1), hz: lerp(-hd * 0.72, hd * 0.72, perSide > 1 ? i / (perSide - 1) : 0.5) });
    }
  });
  players.forEach(p => {
    p.x = p.hx;
    p.z = p.hz;
    p.phase = rand() * 6;
    p.speed = 0;
    p.skin = SKIN[Math.floor(rand() * SKIN.length)];
    p.pace = lerp(config.pace * 0.84, config.pace * 1.08, rand());
  });
  const outfield = players.filter(p => !p.keeper);
  const ball = { x: 0, y: 0, z: 0, holder: outfield[0], flight: null, dead: 0 };
  let clock = 0;
  let shotAt = 2.3;
  let hold = 0.5;
  let time = 0;

  const launch = (x, y, z, dur, arc, to, shot = false) => {
    ball.flight = { x0: ball.x, y0: ball.y, z0: ball.z, x1: x, y1: y, z1: z, u: 0, dur, arc, to, shot };
    ball.holder = null;
  };
  const release = holder => {
    const dir = holder.team ? -1 : 1;
    if (clock >= shotAt) {
      launch(dir * goal.x, goal.y, (rand() - 0.5) * goal.spread, goal.dur, goal.arc, null, true);
      return;
    }
    const steal = rand() < 0.24;
    const pool = outfield.filter(p => p !== holder && (steal ? p.team !== holder.team : p.team === holder.team));
    const to = pool.sort((a, b) => (dir * b.x - dir * a.x) + (rand() - 0.5) * hw * 0.8)[0];
    launch(to.x + dir * 1.2, 0.2, to.z, clamp(Math.hypot(to.x - ball.x, to.z - ball.z) / config.passSpeed, 0.28, 0.72), config.passArc, to);
  };

  return {
    enter() { clock = 0; shotAt = 2.15 + rand() * 0.45; },
    step(dt) {
      time += dt;
      clock += dt;
      const attack = (ball.holder || ball.flight?.to)?.team ? -1 : 1;
      let chaser = null;
      let best = Infinity;
      for (const p of outfield) {
        if (p === ball.holder || p.team === ball.holder?.team) continue;
        const dist = Math.hypot(p.x - ball.x, p.z - ball.z);
        if (dist < best) { best = dist; chaser = p; }
      }
      for (const p of players) {
        let tx = p.hx + ball.x * 0.42 + attack * 2.5;
        let tz = p.hz + ball.z * 0.24 + Math.sin(time * 0.8 + p.phase) * 1.6;
        if (p.keeper) { tx = p.hx; tz = clamp(ball.z * 0.45, -3.2, 3.2); }
        else if (p === ball.holder) { tx = p.x + (p.team ? -7 : 7); tz = p.z - p.z * 0.14 + Math.sin(time * 1.5 + p.phase) * 2; }
        else if (ball.flight?.to === p) { tx = ball.flight.x1; tz = ball.flight.z1; }
        else if (p === chaser) { tx = ball.x; tz = ball.z; }
        const [dx, dz] = [tx - p.x, tz - p.z];
        const dist = Math.hypot(dx, dz);
        const speed = Math.min(p.pace, dist * 3);
        if (dist > 0.05) { p.x += (dx / dist) * speed * dt; p.z += (dz / dist) * speed * dt; }
        p.x = clamp(p.x, -hw - 0.5, hw + 0.5);
        p.z = clamp(p.z, -hd, hd);
        p.speed = speed;
        p.phase += speed * dt * 1.75;
      }
      if (ball.dead > 0) {
        ball.dead -= dt;
        ball.y = Math.max(0.15, ball.y - dt * 5);
        if (ball.dead <= 0) {
          ball.holder = outfield[Math.floor(rand() * outfield.length)];
          clock = 0;
          shotAt = 3.1 + rand() * 0.8;
          hold = 0.5;
        }
        return;
      }
      if (ball.holder) {
        const p = ball.holder;
        ball.x = p.x + (p.team ? -0.8 : 0.8);
        ball.z = p.z - 0.25;
        ball.y = config.dribble ? Math.abs(Math.sin(time * 7.5)) * 1.15 : 0.15;
        hold -= dt;
        if (hold <= 0) { release(p); hold = 0.3 + rand() * 0.5; }
      } else if (ball.flight) {
        const f = ball.flight;
        f.u = Math.min(1, f.u + dt / f.dur);
        ball.x = lerp(f.x0, f.x1, f.u);
        ball.z = lerp(f.z0, f.z1, f.u);
        ball.y = lerp(f.y0, f.y1, f.u) + f.arc * 4 * f.u * (1 - f.u);
        if (f.u >= 1) {
          ball.flight = null;
          if (f.shot) { ball.dead = 0.85; onScore(); }
          else ball.holder = f.to;
        }
      }
    },
    draw(ctx) {
      const order = [...players].sort((a, b) => b.z - a.z);
      order.forEach(p => ctx.person(p.x, p.z, p, p.keeper ? kits.keeper : kits.teams[p.team]));
      ctx.ball(ball.x, ball.y, ball.z, ballStyle);
    },
  };
}

function createPadel(rand) {
  const players = [[-13, -5.5, 0], [-13, 5.5, 0], [13, -5.5, 1], [13, 5.5, 1]].map(([hx, hz, team]) => ({
    hx, hz, team, x: hx, z: hz, phase: rand() * 6, speed: 0, skin: SKIN[Math.floor(rand() * SKIN.length)],
  }));
  const ball = { x: -13, y: 1.2, z: -5, legs: [], hitter: players[0], target: null };
  let time = 0;
  const volley = from => {
    const rivals = players.filter(p => p.team !== from.team);
    const to = rivals[Math.floor(rand() * 2)];
    const side = to.team ? 1 : -1;
    const bounceX = side * (7 + rand() * 9);
    const bounceZ = clamp(to.z + (rand() - 0.5) * 5, -10, 10);
    const legs = [{ x: bounceX, y: 0.1, z: bounceZ, dur: 0.5, arc: 1.9 }];
    if (rand() < 0.42) {
      legs.push({ x: side * 23.6, y: 1.5, z: bounceZ + (rand() - 0.5) * 3, dur: 0.26, arc: 0.5, glass: true });
      legs.push({ x: side * 17, y: 1.1, z: bounceZ, dur: 0.28, arc: 0.3 });
    } else {
      legs.push({ x: bounceX + side * 3.5, y: 1.1, z: bounceZ, dur: 0.24, arc: 0.7 });
    }
    ball.legs = legs;
    ball.target = to;
    ball.u = 0;
    ball.sx = ball.x;
    ball.sy = ball.y;
    ball.sz = ball.z;
  };
  volley(players[0]);
  return {
    enter() {},
    step(dt, onGlass) {
      time += dt;
      const leg = ball.legs[0];
      ball.u += dt / leg.dur;
      const u = Math.min(1, ball.u);
      ball.x = lerp(ball.sx, leg.x, u);
      ball.z = lerp(ball.sz, leg.z, u);
      ball.y = lerp(ball.sy, leg.y, u) + leg.arc * 4 * u * (1 - u);
      if (u >= 1) {
        if (leg.glass) onGlass(ball.x, ball.y, ball.z);
        ball.legs.shift();
        ball.sx = ball.x; ball.sy = ball.y; ball.sz = ball.z; ball.u = 0;
        if (!ball.legs.length) volley(ball.target);
      }
      const last = ball.legs[ball.legs.length - 1] || leg;
      for (const p of players) {
        const chasing = p === ball.target;
        const tx = chasing ? last.x : p.hx + Math.sin(time + p.phase) * 1.1;
        const tz = chasing ? last.z : p.hz + ball.z * 0.14;
        const [dx, dz] = [tx - p.x, tz - p.z];
        const dist = Math.hypot(dx, dz);
        const speed = Math.min(9.5, dist * 4);
        if (dist > 0.05) { p.x += (dx / dist) * speed * dt; p.z += (dz / dist) * speed * dt; }
        p.speed = speed;
        p.phase += speed * dt * 1.8;
      }
    },
    draw(ctx) {
      const kits = [{ shirt: '#fff4d6', shorts: '#23303b' }, { shirt: '#ffd23f', shorts: '#16404f' }];
      [...players].sort((a, b) => b.z - a.z).forEach(p => ctx.person(p.x, p.z, p, kits[p.team]));
      ctx.ball(ball.x, ball.y, ball.z, { color: '#e9ff5a', size: 1 });
    },
  };
}

function createKarts(rand) {
  const colors = ['#ff5a3c', '#ffd23f', '#66f1c2', '#ffffff', '#4aa8ff', '#ff8ac2', '#a98bff'];
  const karts = colors.map((color, i) => ({ color, d: (i * TRACK.length) / colors.length + rand() * 3, pace: 15.5 + rand() * 3.5, lane: rand() * 6, point: null }));
  return {
    enter() {},
    step(dt, time, puff) {
      for (const kart of karts) {
        const here = pointAt(TRACK, kart.d);
        kart.d += kart.pace * (1 - here.curve * 0.42) * dt;
        const offset = Math.sin(time * 0.7 + kart.lane) * 0.85;
        kart.point = { x: here.x - Math.sin(here.angle) * offset, z: here.z + Math.cos(here.angle) * offset, angle: here.angle };
        if (here.curve > 0.34 && rand() < dt * 18) puff(kart.point.x - Math.cos(here.angle) * 1.6, 0.25, kart.point.z - Math.sin(here.angle) * 1.6);
      }
    },
    draw(ctx) {
      [...karts].sort((a, b) => b.point.z - a.point.z).forEach(kart => ctx.kart(kart));
    },
  };
}

export function createLife(cam, anchors) {
  const rand = seeded(7719);
  const { cols, rows, hy, peak } = cam;
  let g = null;
  let time = 0;
  let cheer = 0;
  let gate = null;
  const particles = [];
  const P = (x, y, z) => project(cam, x, y, z);

  const box = (x, y, w, h, color) => { g.fillStyle = color; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
  const puff = (x, y, vx, vy, life, color, size = 1) => { if (particles.length < 170) particles.push({ x, y, vx, vy, life, max: life, color, size }); };
  const worldPuff = (x, y, z) => { const p = P(x, y, z); puff(p.x, p.y, -2 - rand() * 3, -2 - rand() * 3, 0.45, 'rgba(232,236,236,.75)', 1); };
  const score = () => {
    cheer = 1;
    for (let i = 0; i < 44; i++) {
      const tier = anchors.tiers[i % 4];
      const p = P(lerp(tier.x1, tier.x2, rand()), tier.y + 1.5, tier.z);
      puff(p.x, p.y, (rand() - 0.5) * 16, -9 - rand() * 18, 1 + rand() * 0.8, ['#66f1c2', '#ffffff', '#ffd23f', '#ff7a59'][i % 4]);
    }
  };

  const sims = [
    createMatch(rand, {
      hw: COURT.hw, hd: COURT.hd, perSide: 5, keepers: true, pace: 8.6, passSpeed: 28, passArc: 0.45,
      goal: { x: COURT.hw + 1.6, y: 1.1, spread: 5.6, dur: 0.42, arc: 0.9 }, ball: { color: '#ffffff', size: 2 }, onScore: score,
      kits: { teams: [{ shirt: '#ff7a45', shorts: '#fff1e6' }, { shirt: '#f7fbff', shorts: '#23405c' }], keeper: { shirt: '#ffe14d', shorts: '#26323c' } },
    }),
    createPadel(rand),
    createMatch(rand, {
      hw: 24, hd: 11.6, perSide: 4, keepers: false, pace: 8.4, passSpeed: 24, passArc: 0.9, dribble: true,
      goal: { x: 23.6, y: 4.2, spread: 0, dur: 0.72, arc: 2.8 }, ball: { color: '#ff8a2a', size: 2 }, onScore: score,
      kits: { teams: [{ shirt: '#ffffff', shorts: '#ffffff' }, { shirt: '#1d3346', shorts: '#1d3346' }] },
    }),
    createKarts(rand),
  ];

  const carColors = ['#ff6b4a', '#f7f7f2', '#3f88d8', '#ffc640', '#2d3a46', '#66d9b5'];
  const roadSpan = halfWidthAt(cam, ROAD_Z) + 14;
  const cars = Array.from({ length: 7 }, (_, i) => ({ dir: i % 2 ? 1 : -1, x: (rand() - 0.5) * roadSpan * 2, v: 9 + rand() * 6, color: carColors[i % carColors.length] }));
  const farSpan = halfWidthAt(cam, FAR_ROAD_Z) + 10;
  const farCars = Array.from({ length: 6 }, (_, i) => ({ dir: i % 2 ? 1 : -1, x: (rand() - 0.5) * farSpan * 2, v: 12 + rand() * 9, color: carColors[(i + 2) % carColors.length] }));
  const walkers = Array.from({ length: 16 }, (_, i) => {
    const path = WALK_PATHS[i % WALK_PATHS.length];
    return {
      path, d: rand() * path.length, dir: rand() > 0.5 ? 1 : -1, v: 1.5 + rand() * 1.1, phase: rand() * 6, speed: 2,
      skin: SKIN[i % SKIN.length], dog: i % 7 === 3,
      kit: { shirt: ['#ff8f6b', '#f8f8ee', '#5bb4e8', '#ffd166', '#8f7cf7'][i % 5], shorts: ['#2d3f4f', '#476075', '#3a3f58'][i % 3] },
    };
  });
  const fans = anchors.tiers.flatMap((tier, t) => Array.from({ length: Math.round(34 + t * 3) }, () => ({
    tier, x: lerp(tier.x1, tier.x2, rand()), phase: rand() * 6, gain: 0.55 + rand() * 0.45,
    color: ['#ff7a59', '#ffffff', '#49c99e', '#ffd166', '#5ba9e6', '#31404f'][Math.floor(rand() * 6)],
  })));
  const flocks = [
    { x: rand() * cols, y: hy - peak * 0.74, v: 5.5, n: 9, s: 1 },
    { x: rand() * cols, y: hy - peak * 0.42, v: -3.8, n: 6, s: 0.8 },
  ];
  const motes = Array.from({ length: 30 }, () => ({ x: rand() * cols, y: hy + rand() * (rows - hy) * 0.92, v: 0.8 + rand() * 1.8, phase: rand() * 6 }));
  const smoke = (anchors.chimneys || []).map(c => ({ ...c, wait: rand() }));
  let boatZ = 16;
  let trainX = -halfWidthAt(cam, RAIL_Z) - 40;

  const ctx = {
    person(x, z, p, kit, jump = 0) {
      const foot = P(x, jump, z);
      if (gate && !gate(foot.x, foot.y)) return;
      const h = Math.max(4, 2.05 * foot.s);
      const ground = P(x, 0, z);
      box(ground.x - h * 0.42, ground.y - 0.3, h * 0.62, Math.max(1, h * 0.14), SHADOW);
      const legW = Math.max(1, h * 0.15);
      const legH = h * 0.36;
      const stride = p.speed > 0.6 ? Math.sin(p.phase * 2.2) * h * 0.13 : 0;
      box(foot.x - legW - stride * 0.5, foot.y - legH, legW, legH, p.skin);
      box(foot.x + stride * 0.5, foot.y - legH, legW, legH, p.skin);
      box(foot.x - h * 0.2, foot.y - h * 0.5, h * 0.4, h * 0.17, kit.shorts);
      box(foot.x - h * 0.21, foot.y - h * 0.82, h * 0.42, h * 0.34, kit.shirt);
      box(foot.x - h * 0.13, foot.y - h, h * 0.27, h * 0.2, p.skin);
    },
    ball(x, y, z, style) {
      const p = P(x, y, z);
      if (gate && !gate(p.x, p.y)) return;
      const ground = P(x, 0, z);
      box(ground.x - style.size * 0.8, ground.y, style.size + 1, 1, SHADOW);
      box(p.x - style.size / 2, p.y - style.size, style.size, style.size, style.color);
    },
    kart(kart) {
      const { x, z, angle } = kart.point;
      const center = P(x, 0, z);
      if (gate && !gate(center.x, center.y)) return;
      const [c, s] = [Math.cos(angle), Math.sin(angle)];
      const quad = (len, wide, y, color, ox = 0, oz = 0, back = len) => {
        g.fillStyle = color;
        g.beginPath();
        [[back * -1, -wide], [len, -wide], [len, wide], [back * -1, wide]].forEach(([a, b], i) => {
          const p = P(x + ox + a * c - b * s, y, z + oz + a * s + b * c);
          if (i) g.lineTo(p.x, p.y);
          else g.moveTo(p.x, p.y);
        });
        g.closePath();
        g.fill();
      };
      quad(1.8, 1, 0, SHADOW, -0.55, -0.25);
      quad(1.9, 1.02, 0.28, '#1b2029');
      quad(1.55, 0.62, 0.55, kart.color);
      const head = P(x - c * 0.25, 1.35, z - s * 0.25);
      const r = Math.max(1, 0.5 * head.s);
      box(head.x - r, head.y - r, r * 2, r * 2, kart.color === '#ffffff' ? '#ff5a3c' : '#ffffff');
    },
  };

  function drawCar(x, z, dir, color, scale = 1) {
    const p = P(x, 0, z);
    const len = 4.4 * p.s * scale;
    const h = 1.35 * p.s * scale;
    box(p.x - len / 2 - 1, p.y, len + 1, 1, SHADOW);
    box(p.x - len / 2, p.y - h, len, h, color);
    if (len > 5) {
      box(p.x - len * 0.25, p.y - h * 1.65, len * 0.5, h * 0.7, '#cfe8ee');
      box(dir > 0 ? p.x + len / 2 - 1 : p.x - len / 2, p.y - h * 0.8, 1, 1, '#fff2b8');
      box(dir > 0 ? p.x - len / 2 : p.x + len / 2 - 1, p.y - h * 0.8, 1, 1, '#ff4d3f');
    }
  }

  function drawFar(t) {
    for (const turbine of anchors.turbines || []) {
      g.strokeStyle = 'rgba(247,250,250,.95)';
      g.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const a = t * 1.1 + turbine.phase + (i * Math.PI * 2) / 3;
        g.beginPath();
        g.moveTo(turbine.x, turbine.y);
        g.lineTo(turbine.x + Math.cos(a) * turbine.r, turbine.y + Math.sin(a) * turbine.r);
        g.stroke();
      }
    }
    for (let i = 0; i < 7; i++) {
      const p = P(trainX - i * 15, 0, RAIL_Z);
      const w = 13.4 * p.s;
      const h = Math.max(2, 3.6 * p.s);
      box(p.x - w, p.y - h, w, h, i ? ['#e9ecef', '#f0a35c', '#e9ecef'][i % 3] : '#30495a');
      if (i) box(p.x - w + 1, p.y - h + 0.4, Math.max(1, w - 2), 1, '#7d97a5');
    }
    for (const car of farCars) drawCar(car.x, FAR_ROAD_Z + car.dir * 1.1, car.dir, car.color);
    for (const car of cars) drawCar(car.x, ROAD_Z + car.dir * -1.15, car.dir, car.color);

    const bz = boatZ;
    const boat = P(riverX(bz), 0, bz);
    const size = Math.max(3, 3.3 * boat.s);
    for (let i = 1; i < 5; i++) box(boat.x - i * 0.6 * (1 + i * 0.2), boat.y + i * 1.1, 1 + i * 0.5, 1, 'rgba(235,255,250,.55)');
    box(boat.x - size * 0.6, boat.y - size * 0.18, size * 1.2, size * 0.22, '#7c4f35');
    g.fillStyle = '#fff8e8';
    g.beginPath();
    g.moveTo(boat.x, boat.y - size * 1.2);
    g.lineTo(boat.x + size * 0.56, boat.y - size * 0.25);
    g.lineTo(boat.x, boat.y - size * 0.25);
    g.fill();
    g.fillStyle = '#ff8e61';
    g.beginPath();
    g.moveTo(boat.x - 1, boat.y - size * 0.95);
    g.lineTo(boat.x - size * 0.4, boat.y - size * 0.25);
    g.lineTo(boat.x - 1, boat.y - size * 0.25);
    g.fill();
  }

  function drawSky(t) {
    for (const flock of flocks) {
      for (let i = 0; i < flock.n; i++) {
        const row = Math.ceil(i / 2) * (i % 2 ? 1 : -1);
        const x = flock.x - Math.abs(row) * 4 * flock.s * Math.sign(flock.v) + Math.sin(t * 0.8 + i) * 0.8;
        const y = flock.y + row * 2.2 * flock.s + Math.sin(t * 0.55 + flock.x * 0.02) * 2;
        const flap = Math.sin(t * 8 + i * 1.3) > 0 ? -1 : 1;
        box(x, y, 1, 1, '#44546a');
        box(x - 1, y + flap, 1, 1, '#5a6a80');
        box(x + 1, y + flap, 1, 1, '#5a6a80');
      }
    }
    if (cols > 300) {
      const x = cols * 0.875 + Math.sin(t * 0.07) * cols * 0.035;
      const y = hy * 0.56 + Math.sin(t * 0.32) * 3;
      const r = Math.max(5, rows * 0.032);
      const stripes = ['#ff8a5c', '#fff1d6', '#10b981', '#fff1d6', '#ff8a5c'];
      for (let row = -r; row <= r * 0.8; row++) {
        const half = Math.sqrt(Math.max(0, 1 - (row / r) ** 2)) * r * (row > 0 ? 1 - (row / r) * 0.35 : 1);
        for (let k = 0; k < 5; k++) box(x - half + (k * half * 2) / 5, y + row, Math.ceil((half * 2) / 5) + 1, 1, stripes[k]);
      }
      box(x - r * 0.42, y + r * 0.8, 1, r * 0.55, '#6f5a49');
      box(x + r * 0.42, y + r * 0.8, 1, r * 0.55, '#6f5a49');
      box(x - r * 0.28, y + r * 1.32, r * 0.56, r * 0.3, '#8a5f3e');
    }
  }

  function drawFlags(t) {
    for (const flag of anchors.flags) {
      const size = Math.max(4, flag.size * 2.4);
      box(flag.x, flag.y, 1, size * 1.1, '#56636e');
      for (let i = 1; i <= size; i++) {
        const wave = Math.sin(i * 0.8 - t * 6.5 + flag.x) * Math.min(1.3, i * 0.2);
        box(flag.x + i, flag.y + wave, 1, Math.max(2, size * 0.48), flag.color);
      }
    }
    for (const [i, lamp] of (anchors.lamps || []).entries()) {
      box(lamp.x - 1, lamp.y, 3, 1, Math.sin(t * 3 + i * 2) > -0.7 ? '#fff4c8' : '#ffd98a');
    }
  }

  function drawCrowd(t) {
    for (const fan of fans) {
      const p = P(fan.x, fan.tier.y, fan.tier.z);
      const beat = Math.sin(t * 3 + fan.phase);
      const lift = cheer * fan.gain * (0.5 + 0.5 * Math.abs(Math.sin(t * 9 + fan.phase))) * 3 + (beat > 0.82 ? 1 : 0);
      box(p.x, p.y - 2 - lift, 1, 2, fan.color);
      box(p.x, p.y - 3 - lift, 1, 1, '#f1c8a9');
      if (cheer > 0.25) box(p.x + (fan.phase > 3 ? 1 : -1), p.y - 4 - lift, 1, 1, '#f1c8a9');
    }
  }

  const api = {
    enter(index) { sims[index].enter(); },
    step(dt, t) {
      time = t;
      cheer = Math.max(0, cheer - dt * 0.62);
      sims[0].step(dt);
      sims[1].step(dt, (x, y, z) => {
        const p = P(x, y, z);
        for (let i = 0; i < 5; i++) puff(p.x, p.y, (rand() - 0.5) * 18, (rand() - 0.5) * 18, 0.3, '#e9fbff');
      });
      sims[2].step(dt);
      sims[3].step(dt, t, worldPuff);
      for (const car of cars) {
        car.x += car.dir * car.v * dt;
        if (Math.abs(car.x) > roadSpan) car.x = -car.dir * roadSpan;
      }
      for (const car of farCars) {
        car.x += car.dir * car.v * dt;
        if (Math.abs(car.x) > farSpan) car.x = -car.dir * farSpan;
      }
      for (const w of walkers) {
        w.d += w.dir * w.v * dt;
        if (w.d <= 0 || w.d >= w.path.length) w.dir *= -1;
        w.phase += w.v * dt * 2.4;
      }
      for (const flock of flocks) {
        flock.x += flock.v * dt;
        if (flock.v > 0 && flock.x > cols + 34) flock.x = -34;
        if (flock.v < 0 && flock.x < -34) flock.x = cols + 34;
      }
      for (const mote of motes) {
        mote.x += mote.v * dt;
        mote.y += Math.sin(t * 0.7 + mote.phase) * dt * 1.4;
        if (mote.x > cols + 2) mote.x = -2;
      }
      for (const c of smoke) {
        c.wait -= dt;
        if (c.wait <= 0) {
          c.wait = 0.34 + rand() * 0.3;
          puff(c.x, c.y, -1.5 - rand(), -3.2 - rand() * 1.8, 2.4 + rand(), 'rgba(246,244,238,.8)', 1);
        }
      }
      boatZ -= dt * 1.5;
      if (boatZ < -24) boatZ = 24;
      trainX += dt * 25;
      if (trainX > halfWidthAt(cam, RAIL_Z) + 125) trainX = -halfWidthAt(cam, RAIL_Z) - 40;
      const head = P(trainX - 3, 4.2, RAIL_Z);
      if (rand() < dt * 8) puff(head.x, head.y, -2.4, -2.6, 2, 'rgba(244,244,240,.78)', 1);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += (p.color.startsWith('#') ? 15 : -0.1) * dt;
        if (p.life <= 0) particles.splice(i, 1);
      }
    },
    draw(target, { front, scene, from, to, passed }) {
      g = target;
      g.clearRect(0, 0, cols, rows);
      g.globalCompositeOperation = 'source-over';
      drawFar(time);
      g.globalCompositeOperation = 'destination-out';
      g.drawImage(front, 0, 0);
      g.globalCompositeOperation = 'source-over';
      drawSky(time);
      for (const w of walkers) {
        const p = pointAt(w.path, w.d);
        ctx.person(p.x, p.z, w, w.kit);
        if (w.dog) {
          const dog = P(p.x + 1.3 * w.dir, 0, p.z - 0.7);
          box(dog.x - 1, dog.y - 2, 3, 1, '#a76f45');
          box(dog.x + (w.dir > 0 ? 2 : -2), dog.y - 3 + Math.round(Math.sin(time * 8) * 0.5), 1, 1, '#8b5835');
          box(dog.x - 1 + (Math.sin(w.phase * 3) > 0 ? 1 : 0), dog.y - 1, 1, 1, '#8b5835');
        }
      }
      drawFlags(time);
      drawCrowd(time);
      if (passed) {
        gate = (x, y) => !passed(x, y);
        sims[from].draw(ctx);
        gate = passed;
        sims[to].draw(ctx);
        gate = null;
      } else {
        sims[scene].draw(ctx);
      }
      for (const p of particles) {
        g.globalAlpha = p.color.startsWith('#') ? 1 : clamp(p.life / p.max);
        box(p.x, p.y, p.size, p.size, p.color);
      }
      g.globalAlpha = 1;
      for (const mote of motes) {
        const glow = Math.sin(time * 1.8 + mote.phase);
        if (glow > 0.1) box(mote.x, mote.y, 1, 1, glow > 0.72 ? '#fff9d8' : 'rgba(255,241,184,.62)');
      }
    },
  };
  for (let i = 0; i < 90; i++) { time += 1 / 30; api.step(1 / 30, time); }
  return api;
}
