// Pinta una sola vez (por tamaño) el paisaje y las cuatro canchas con Canvas 2D.
// El shader después los anima, los funde y les aplica el tramado.
import { COURT, DEPTH, FAR_ROAD_Z, PAD, RAIL_Z, ROAD_Z, TRACK, WALK_PATHS, clamp, halfWidthAt, lerp, project, riverHalfWidth, riverX, seeded } from './world.js';

const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, t) => {
  const [ca, cb] = [rgb(a), rgb(b)];
  return `#${ca.map((v, i) => Math.round(lerp(v, cb[i], t)).toString(16).padStart(2, '0')).join('')}`;
};

function layer(cols, rows, options) {
  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = rows;
  return { canvas, g: canvas.getContext('2d', options) };
}

function ridgeNoise(seed) {
  const rand = seeded(seed);
  const table = Array.from({ length: 256 }, () => rand());
  const value = x => {
    const i = Math.floor(x);
    const f = x - i;
    const t = f * f * (3 - 2 * f);
    return lerp(table[i & 255], table[(i + 1) & 255], t);
  };
  return x => value(x) * 0.55 + value(x * 2.1 + 9) * 0.3 + value(x * 4.3 + 21) * 0.15;
}

function painter(cam) {
  const P = (x, z, y = 0) => project(cam, x, y, z);
  const trace = (g, pts) => {
    g.beginPath();
    pts.forEach(([x, z, y = 0], i) => {
      const p = P(x, z, y);
      if (i) g.lineTo(p.x, p.y);
      else g.moveTo(p.x, p.y);
    });
    g.closePath();
  };
  const ground = (g, pts, fill) => { trace(g, pts); g.fillStyle = fill; g.fill(); };
  const rect = (g, x1, z1, x2, z2, fill) => ground(g, [[x1, z1], [x2, z1], [x2, z2], [x1, z2]], fill);
  const wall = (g, x1, z1, x2, z2, y0, y1, fill) => ground(g, [[x1, z1, y0], [x2, z2, y0], [x2, z2, y1], [x1, z1, y1]], fill);
  const line = (g, pts, color, width = 0.26, closed = false) => {
    g.strokeStyle = color;
    g.lineCap = 'round';
    const list = closed ? [...pts, pts[0]] : pts;
    for (let i = 1; i < list.length; i++) {
      const [a, b] = [list[i - 1], list[i]];
      const [pa, pb] = [P(a[0], a[1], a[2] || 0), P(b[0], b[1], b[2] || 0)];
      g.lineWidth = Math.max(0.8, width * (pa.s + pb.s) * 0.5);
      g.beginPath();
      g.moveTo(pa.x, pa.y);
      g.lineTo(pb.x, pb.y);
      g.stroke();
    }
  };
  const ribbon = (g, pts, halfWidth, fill) => {
    const width = typeof halfWidth === 'function' ? halfWidth : () => halfWidth;
    const side = sign => pts.map((point, i) => {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(pts.length - 1, i + 1)];
      const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      const w = width(point) * sign;
      return [point.x - ((b.z - a.z) / len) * w, point.z + ((b.x - a.x) / len) * w];
    });
    ground(g, [...side(1), ...side(-1).reverse()], fill);
  };
  const circle = (cx, cz, r, from = 0, to = Math.PI * 2, n = 40) => Array.from({ length: n + 1 }, (_, i) => {
    const a = lerp(from, to, i / n);
    return [cx + Math.cos(a) * r, cz + Math.sin(a) * r];
  });
  return { P, trace, ground, rect, wall, line, ribbon, circle };
}

function paintBackdrop(cam, env, mask, anchors) {
  const { cols, rows, hy, cx, s0, peak } = cam;
  const sky = env.createLinearGradient(0, 0, 0, hy + 4);
  sky.addColorStop(0, '#eef2f7');
  sky.addColorStop(0.24, '#dbe8f4');
  sky.addColorStop(0.58, '#dcebf0');
  sky.addColorStop(0.84, '#f9ebd8');
  sky.addColorStop(1, '#fdd8ab');
  env.fillStyle = sky;
  env.fillRect(0, 0, cols, hy + 12);
  mask.fillStyle = '#000000';
  mask.fillRect(0, 0, cols, rows);
  mask.fillStyle = '#0000ff';
  mask.fillRect(0, 0, cols, hy + 12);

  const sunX = cx + cols * 0.24;
  const sunY = hy - peak * 0.42;
  const glow = env.createRadialGradient(sunX, sunY, 0, sunX, sunY, Math.max(cols * 0.36, rows * 0.45));
  glow.addColorStop(0, 'rgba(255,226,170,.95)');
  glow.addColorStop(0.28, 'rgba(255,206,150,.42)');
  glow.addColorStop(1, 'rgba(255,206,150,0)');
  env.fillStyle = glow;
  env.fillRect(0, 0, cols, hy + 12);
  env.fillStyle = '#fff6df';
  env.beginPath();
  env.arc(sunX, sunY, Math.max(3.5, rows * 0.03), 0, Math.PI * 2);
  env.fill();
  anchors.sun = { x: sunX, y: sunY };

  const ranges = [
    { seed: 11, freq: 0.036, amp: 1.12, top: '#9fb3cf', base: '#f1d8bd' },
    { seed: 23, freq: 0.058, amp: 0.8, top: '#7da3b5', base: '#e6d6ba' },
    { seed: 37, freq: 0.09, amp: 0.48, top: '#5f9a8b', base: '#b9cfa6' },
  ];
  ranges.forEach((range, index) => {
    const noise = ridgeNoise(range.seed);
    const crest = x => hy + 3 - peak * range.amp * clamp(0.12 + (noise(((x - cx) / s0) * range.freq + 40) - 0.22) * 1.75, 0.08, 1.15);
    const fill = env.createLinearGradient(0, hy - peak, 0, hy + 12);
    fill.addColorStop(0, range.top);
    fill.addColorStop(1, range.base);
    for (const [g, color] of [[env, fill], [mask, '#000000']]) {
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(0, hy + 14);
      for (let x = 0; x <= cols; x += 1) g.lineTo(x, crest(x));
      g.lineTo(cols, hy + 14);
      g.fill();
    }
    if (index === 1) {
      anchors.turbines = [-128, -82, -48, 58, 104, 142].map(u => {
        const x = cx + u * s0;
        const y = crest(x);
        const h = peak * 0.46;
        env.strokeStyle = '#eef3f4';
        env.lineWidth = 0.9;
        env.beginPath();
        env.moveTo(x, y + 1);
        env.lineTo(x, y - h);
        env.stroke();
        return { x, y: y - h, r: h * 0.62, phase: u };
      }).filter(t => t.x > -8 && t.x < cols + 8);
    }
  });
}

function paintGround(cam, tools, env, mask, rand, anchors) {
  const { cols, rows, hy, A } = cam;
  const { P, ground, rect, ribbon, line } = tools;
  const top = hy + (A * DEPTH) / (DEPTH + 430);
  const lawn = env.createLinearGradient(0, top, 0, rows);
  lawn.addColorStop(0, '#b3d2a5');
  lawn.addColorStop(0.3, '#86bf84');
  lawn.addColorStop(0.62, '#5fae70');
  lawn.addColorStop(1, '#3f9462');
  env.fillStyle = lawn;
  env.fillRect(0, top, cols, rows - top);
  mask.fillStyle = '#000040';
  mask.fillRect(0, top, cols, rows - top);

  const crops = ['#6fb574', '#86c07a', '#a9c96f', '#dccb7c', '#5fa76e', '#cdb96b', '#79b98a'];
  for (let z = 46; z < 430; z += z * 0.2 + 5) {
    const dz = z * 0.2 + 5;
    const w = 28 + z * 0.26;
    const span = halfWidthAt(cam, z) + w * 2;
    const haze = clamp(z / 430) * 0.72;
    for (let x = -span + rand() * w; x < span; x += w * (0.7 + rand() * 0.6)) {
      const base = crops[Math.floor(rand() * crops.length)];
      const fill = mix(base, '#d6e2cd', haze);
      const inset = dz * 0.05;
      rect(env, x, z + inset, x + w * 0.96, z + dz - inset, fill);
      if (rand() < 0.42 && z < 230) {
        for (let k = 1; k < 5; k++) {
          const xs = x + (w * 0.96 * k) / 5;
          line(env, [[xs, z + inset], [xs, z + dz - inset]], mix(fill, '#3f7f58', 0.22), 0.3);
        }
      }
    }
  }

  // Manchas de pasto y flores cerca del predio.
  for (let i = 0; i < 300; i++) {
    const z = lerp(-32, 46, rand());
    const x = (rand() - 0.5) * 2 * (halfWidthAt(cam, z) + 8);
    const p = P(x, z);
    env.fillStyle = rand() > 0.5 ? 'rgba(164,214,132,.16)' : 'rgba(26,104,78,.13)';
    env.beginPath();
    env.ellipse(p.x, p.y, (4 + rand() * 9) * p.s, (1 + rand() * 2.4) * p.s, 0, 0, Math.PI * 2);
    env.fill();
  }

  const river = [];
  for (let z = -42; z < 430; z += Math.max(1.5, (z + 44) * 0.06)) river.push({ x: riverX(z), z });
  ribbon(env, river, point => riverHalfWidth(point.z) + 1.5, '#d9cfa6');
  ribbon(env, river, point => riverHalfWidth(point.z), '#67c7c8');
  ribbon(env, river.filter(point => point.z > 140), point => riverHalfWidth(point.z), 'rgba(214,234,226,.55)');
  ribbon(mask, river, point => riverHalfWidth(point.z), '#000080');

  const road = (z, halfWidth, fill) => {
    const span = halfWidthAt(cam, z) + 20;
    rect(env, -span, z - halfWidth, span, z + halfWidth, fill);
    rect(mask, -span, z - halfWidth, span, z + halfWidth, '#000000');
  };
  road(RAIL_Z, 1.8, '#a9b3a4');
  road(FAR_ROAD_Z, 2.6, '#a2acaf');
  road(ROAD_Z + 0, 3.1, '#bdb9a4');
  road(ROAD_Z, 2.4, '#687080');
  const span = halfWidthAt(cam, ROAD_Z) + 20;
  for (let x = -span; x < span; x += 7) rect(env, x, ROAD_Z - 0.12, x + 3.2, ROAD_Z + 0.12, '#e9e3cd');

  // Puente sobre el río.
  const bridgeX = riverX(ROAD_Z);
  for (const z of [ROAD_Z - 2.6, ROAD_Z + 2.6]) line(env, [[bridgeX - 11, z, 0.9], [bridgeX + 11, z, 0.9]], '#f3eee0', 0.3);

  for (const path of WALK_PATHS) {
    ribbon(env, path.pts, 1.05, '#ecdfc1');
    ribbon(mask, path.pts, 1.05, '#000000');
  }

  for (let i = 0; i < 460; i++) {
    const z = lerp(-30, 28, rand());
    const x = (rand() - 0.5) * 2 * halfWidthAt(cam, z);
    if (Math.abs(x) < PAD.hw + 1 && z > -PAD.hd - 1) continue;
    const p = P(x, z);
    env.fillStyle = ['#fff3b0', '#ffd27a', '#ffffff', '#f7a8a0'][i % 4];
    env.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
  }

  // Explanada común a los cuatro deportes.
  ground(env, [[-PAD.hw, -PAD.hd], [PAD.hw, -PAD.hd], [PAD.hw, PAD.hd], [-PAD.hw, PAD.hd]], '#e6e8e2');
  ground(mask, [[-PAD.hw, -PAD.hd], [PAD.hw, -PAD.hd], [PAD.hw, PAD.hd], [-PAD.hw, PAD.hd]], '#000000');
  for (let x = -PAD.hw + 4; x < PAD.hw; x += 4) tools.line(env, [[x, -PAD.hd], [x, -COURT.hd - 1]], '#d4d8d2', 0.12);
  anchors.flags = [];
}

function makeTree(cam, tools, rand, x, z, h, kind) {
  const base = tools.P(x, z);
  const r = h * base.s;
  const haze = clamp((z + 8) / 190) * 0.62;
  const autumn = rand() < 0.1;
  const tone = rand();
  const pal = autumn
    ? ['#b0602f', '#d98a3e', '#f0b24f', '#ffdc8c']
    : [mix('#14503f', '#1b5c4b', tone), mix('#23755a', '#2f8a5f', tone), mix('#4fa56f', '#68b56c', tone), mix('#a4d68b', '#cde39a', tone)];
  const colors = pal.map(color => mix(color, '#bcd5c3', haze));
  const blobs = Array.from({ length: r < 8 ? 3 : 7 }, () => {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand());
    return { x: Math.cos(a) * d * 0.28, y: Math.sin(a) * d * 0.2, r: 0.17 + rand() * 0.12 };
  });
  const phase = rand();
  const sway = 0.5 + rand() * 0.5;
  const stretch = kind === 'poplar' ? { x: 0.52, y: 1.42 } : { x: 1, y: 1 };
  const center = base.y - r * (kind === 'poplar' ? 0.72 : 0.62);
  const dot = (g, blob, grow, dx, dy, color) => {
    g.fillStyle = color;
    g.beginPath();
    g.ellipse(base.x + (blob.x * stretch.x + dx) * r, center + (blob.y * stretch.y + dy) * r, Math.max(0.6, blob.r * grow * r * stretch.x), Math.max(0.6, blob.r * grow * r * stretch.y), 0, 0, Math.PI * 2);
    g.fill();
  };
  return {
    z,
    visible: base.x > -r && base.x < cam.cols + r,
    box: { left: base.x - r * 0.55, right: base.x + r * 0.55, top: base.y - r * 1.2, bottom: base.y },
    shadow(g) {
      g.fillStyle = `rgba(16,70,58,${0.3 * (1 - haze)})`;
      g.beginPath();
      g.ellipse(base.x - r * 0.34, base.y + r * 0.03, r * 0.44, Math.max(0.6, r * 0.09), 0, 0, Math.PI * 2);
      g.fill();
    },
    draw(g) {
      g.fillStyle = colors[0];
      g.fillRect(base.x - Math.max(0.5, r * 0.03), center, Math.max(1, r * 0.06), base.y - center);
      blobs.forEach(blob => dot(g, blob, 1, 0, 0, colors[0]));
      blobs.forEach(blob => dot(g, blob, 0.82, 0.025, -0.03, colors[1]));
      blobs.forEach(blob => dot(g, blob, 0.5, 0.075, -0.075, colors[2]));
      if (r > 10) blobs.slice(0, 4).forEach(blob => dot(g, blob, 0.2, 0.11, -0.12, colors[3]));
    },
    mask(g) {
      if (r < 5) return;
      const color = `rgb(${Math.round(sway * 255)},${Math.round(phase * 255)},0)`;
      const grow = 1 + 1.4 / Math.max(3, r * 0.22);
      blobs.forEach(blob => dot(g, blob, grow, 0, 0, color));
    },
  };
}

function plantTrees(cam, tools, rand) {
  const lanes = WALK_PATHS.flatMap(path => path.pts.filter((_, i) => i % 3 === 0).map(point => tools.P(point.x, point.z)));
  const trees = [];
  for (let i = 0; i < 620; i++) {
    const z = -27 + Math.pow(rand(), 1.55) * 165;
    const reach = 1.95 * (z + DEPTH);
    const x = (rand() - 0.5) * 2 * reach;
    const h = 7 + rand() * 6.5;
    const roll = rand();
    const kind = roll < 0.14 ? 'poplar' : 'round';
    if (Math.abs(x) < PAD.hw + 7 && z < ROAD_Z + 3.6) continue;
    if (Math.abs(z - ROAD_Z) < 5 || Math.abs(z - FAR_ROAD_Z) < 4) continue;
    if (Math.abs(x - riverX(z)) < riverHalfWidth(z) + 4.5) continue;
    const tree = makeTree(cam, tools, rand, x, z, h, kind);
    if (!tree.visible) continue;
    const { left, right, top, bottom } = tree.box;
    if (lanes.some(p => p.x > left && p.x < right && p.y > top && p.y < bottom + 2)) continue;
    trees.push(tree);
  }
  return trees;
}

function buildings(cam, tools, rand, anchors) {
  const { wall, line, ground, P } = tools;
  const items = [];
  const hedge = (x1, z1, x2, z2) => g => {
    wall(g, x1, z1, x2, z2, 0, 1, '#21694f');
    ground(g, [[x1, z1, 1], [x2, z2, 1], [x2, z2 + (z1 === z2 ? 0.8 : 0), 1], [x1, z1 + (z1 === z2 ? 0.8 : 0), 1]], '#3f9468');
  };
  items.push({ z: PAD.hd + 0.4, draw: hedge(-PAD.hw, PAD.hd, -8.5, PAD.hd) });
  items.push({ z: -PAD.hd + 0.1, draw: hedge(-PAD.hw, -PAD.hd, -3, -PAD.hd) });
  items.push({ z: -PAD.hd + 0.1, draw: hedge(3, -PAD.hd, PAD.hw, -PAD.hd) });

  items.push({
    z: 23,
    draw(g) {
      const [x1, x2, z1, z2, h] = [-33, -14, 20.5, 26.5, 4.8];
      wall(g, x2, z1, x2, z2, 0, h, '#c8ced1');
      wall(g, x1, z1, x2, z1, 0, h, '#f4f5f0');
      ground(g, [[x1 - 0.6, z1 - 0.6, h], [x2 + 0.6, z1 - 0.6, h], [x2 + 0.6, z2 + 0.6, h], [x1 - 0.6, z2 + 0.6, h]], '#0f8f69');
      wall(g, x1 - 0.6, z1 - 0.6, x2 + 0.6, z1 - 0.6, h - 0.45, h, '#0a7954');
      for (let x = x1 + 1.5; x < x2 - 2; x += 3.4) wall(g, x, z1, x + 2.1, z1, 1.3, 3.3, '#ffcf80');
      wall(g, -24.6, z1, -22.6, z1, 0, 3, '#35505a');
    },
  });
  anchors.flags.push(...[-31, -24, -16].map((x, i) => {
    const top = P(x, 22.6, 9);
    return { x: top.x, y: top.y, size: top.s, color: ['#66f1c2', '#ffffff', '#ffb45c'][i] };
  }));
  anchors.chimneys = [P(-18, 24, 6.4)];

  items.push({
    z: 22,
    draw(g) {
      for (let k = 3; k >= 0; k--) {
        const z = 20 + k * 1.55;
        const y = (k + 1) * 0.85;
        wall(g, -8, z + 1.55, 30, z + 1.55, 0, y, '#9aa6ae');
        ground(g, [[-8, z, y], [30, z, y], [30, z + 1.55, y], [-8, z + 1.55, y]], k % 2 ? '#d8dfe2' : '#bfe9d9');
        wall(g, -8, z, 30, z, y - 0.85, y, k % 2 ? '#7f8d97' : '#5fa791');
      }
      wall(g, 30, 20, 30, 26.2, 0, 3.4, '#aab4ba');
    },
  });
  anchors.tiers = [0, 1, 2, 3].map(k => ({ x1: -7.4, x2: 29.4, z: 20.75 + k * 1.55, y: (k + 1) * 0.85 }));

  const mast = (g, x, z) => {
    line(g, [[x, z, 0], [x, z, 13]], '#59646e', 0.34);
    wall(g, x - 1.5, z, x + 1.5, z, 12.6, 13.8, '#3c4650');
  };
  items.push({ z: 18, draw: g => { mast(g, -37, 18); mast(g, 37, 18); } });
  anchors.lamps = [[-37, 18], [37, 18], [-39, -17], [39, -17]].map(([x, z]) => P(x, z, 13.2));

  // Casas de campo lejanas con chimenea.
  for (let i = 0; i < 11; i++) {
    const z = 56 + rand() * 72;
    const x = (rand() - 0.5) * 2 * halfWidthAt(cam, z) * 0.95;
    if (Math.abs(x - riverX(z)) < riverHalfWidth(z) + 8) continue;
    const roof = rand() > 0.5 ? '#c96f4d' : '#b85b4e';
    items.push({
      z,
      draw(g) {
        wall(g, x - 3.4, z, x + 3.4, z, 0, 2.8, '#f6efe2');
        ground(g, [[x - 3.9, z, 2.8], [x + 3.9, z, 2.8], [x + 2.2, z + 2, 5.2], [x - 2.2, z + 2, 5.2]], roof);
        wall(g, x - 0.8, z, x + 0.8, z, 0, 1.7, '#7a6a55');
      },
    });
    if (anchors.chimneys.length < 4) anchors.chimneys.push(P(x + 1.8, z + 1, 6));
  }
  return items;
}

function paintFootball(tools, g, over, nearMasts) {
  const { rect, line, circle, wall } = tools;
  const { hw, hd } = COURT;
  rect(g, -hw - 2, -hd - 2, hw + 2, hd + 2, '#2d9a59');
  for (let i = 0; i < 12; i++) {
    const x = -hw + (i * hw * 2) / 12;
    rect(g, x, -hd, x + (hw * 2) / 12, hd, i % 2 ? '#35ad63' : '#2ca05a');
  }
  const white = 'rgba(255,255,255,.94)';
  const box = (x1, z1, x2, z2) => line(g, [[x1, z1], [x2, z1], [x2, z2], [x1, z2]], white, 0.28, true);
  box(-hw, -hd, hw, hd);
  line(g, [[0, -hd], [0, hd]], white);
  line(g, circle(0, 0, 5), white);
  for (const side of [-1, 1]) {
    box(side * hw, -8.2, side * 21.5, 8.2);
    box(side * hw, -4.2, side * 26.6, 4.2);
    line(g, circle(side * 24.5, 0, 4.2, side > 0 ? Math.PI * 0.76 : -Math.PI * 0.24, side > 0 ? Math.PI * 1.24 : Math.PI * 0.24, 14), white);
    for (let z = -4; z <= 4; z += 1) line(over, [[side * hw, z, 3.3], [side * (hw + 2), z, 0]], 'rgba(255,255,255,.34)', 0.08);
    for (let y = 0.8; y < 3.3; y += 0.8) line(over, [[side * (hw + 2 * (1 - y / 3.3)), -4, y], [side * (hw + 2 * (1 - y / 3.3)), 4, y]], 'rgba(255,255,255,.3)', 0.08);
    line(over, [[side * hw, -4, 0], [side * hw, -4, 3.3], [side * hw, 4, 3.3], [side * hw, 4, 0]], '#ffffff', 0.34);
  }
  wall(g, -hw - 2, hd + 2, hw + 2, hd + 2, 0, 0.8, '#f3f5ef');
  nearMasts(over);
}

function paintPadel(tools, g, over, nearMasts) {
  const { rect, line, wall } = tools;
  const [hw, hd, h] = [24, 12, 4.6];
  rect(g, -COURT.hw - 2, -COURT.hd - 2, COURT.hw + 2, COURT.hd + 2, '#0f9a78');
  rect(g, -hw, -hd, hw, hd, '#2a7cc8');
  for (const side of [-1, 1]) rect(g, side * 13, -hd, side * hw, hd, '#2f87d4');
  const white = 'rgba(255,255,255,.95)';
  line(g, [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]], white, 0.24, true);
  line(g, [[-13, -hd], [-13, hd]], white, 0.24);
  line(g, [[13, -hd], [13, hd]], white, 0.24);
  line(g, [[-13, 0], [13, 0]], white, 0.24);

  const glass = 'rgba(205,240,244,.3)';
  const frame = '#1e3a46';
  wall(g, -hw, hd, hw, hd, 0, h, glass);
  wall(g, -hw, -hd, -hw, hd, 0, h, glass);
  wall(g, hw, -hd, hw, hd, 0, h, glass);
  for (let x = -hw; x <= hw; x += 6) line(g, [[x, hd, 0], [x, hd, h]], frame, 0.2);
  for (let z = -hd; z <= hd; z += 6) for (const side of [-1, 1]) line(g, [[side * hw, z, 0], [side * hw, z, h]], frame, 0.2);
  line(g, [[-hw, -hd, h], [-hw, hd, h], [hw, hd, h], [hw, -hd, h]], frame, 0.24);
  for (let z = -hd + 1; z < hd; z += 1) line(g, [[0, z, 0], [0, z, 1.05]], 'rgba(255,255,255,.55)', 0.06);
  line(g, [[0, -hd, 1.1], [0, hd, 1.1]], '#ffffff', 0.2);
  line(g, [[0, -hd, 0], [0, -hd, 1.2]], frame, 0.2);
  line(g, [[0, hd, 0], [0, hd, 1.2]], frame, 0.2);

  wall(over, -hw, -hd, hw, -hd, 0, h, 'rgba(214,244,246,.17)');
  for (let x = -hw; x <= hw; x += 6) line(over, [[x, -hd, 0], [x, -hd, h]], frame, 0.2);
  line(over, [[-hw, -hd, h], [hw, -hd, h]], frame, 0.26);
  line(over, [[-hw, -hd, 0.1], [hw, -hd, 0.1]], frame, 0.2);
  for (let x = -hw + 2; x < hw; x += 12) line(over, [[x, -hd, 3.9], [x + 2.2, -hd, 1]], 'rgba(255,255,255,.34)', 0.32);
  nearMasts(over);
}

function paintBasket(tools, g, over, nearMasts) {
  const { rect, line, circle, wall, ground } = tools;
  const [hw, hd] = [26, 12.6];
  rect(g, -COURT.hw - 2, -COURT.hd - 2, COURT.hw + 2, COURT.hd + 2, '#1b8567');
  rect(g, -hw, -hd, hw, hd, '#cf6d41');
  ground(g, circle(0, 0, 4.2), '#1b8f6c');
  const white = 'rgba(255,255,255,.95)';
  line(g, [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]], white, 0.24, true);
  line(g, [[0, -hd], [0, hd]], white, 0.24);
  line(g, circle(0, 0, 4.2), white, 0.24);
  for (const side of [-1, 1]) {
    const hoop = side * 23.6;
    rect(g, side * hw, -4.4, side * 15.8, 4.4, '#1b8f6c');
    line(g, [[side * hw, -4.4], [side * 15.8, -4.4], [side * 15.8, 4.4], [side * hw, 4.4]], white, 0.24);
    line(g, circle(side * 15.8, 0, 4.2, side > 0 ? Math.PI / 2 : -Math.PI / 2, side > 0 ? Math.PI * 1.5 : Math.PI / 2, 18), white, 0.24);
    const limit = Math.asin(10.8 / 12.4);
    line(g, circle(hoop, 0, 12.4, side > 0 ? Math.PI - limit : -limit, side > 0 ? Math.PI + limit : limit, 26), white, 0.24);
    const arcX = hoop - side * Math.cos(limit) * 12.4;
    line(g, [[side * hw, -10.8], [arcX, -10.8]], white, 0.24);
    line(g, [[side * hw, 10.8], [arcX, 10.8]], white, 0.24);

    line(over, [[side * 27.4, 0, 0], [side * 27.4, 0, 5.6], [side * 25.2, 0, 5.2]], '#2b3a44', 0.38);
    wall(over, side * 25.1, -1.9, side * 25.1, 1.9, 4, 6, '#f8fbfb');
    wall(over, side * 25.1, -0.8, side * 25.1, 0.8, 4.3, 5.2, '#ef6b45');
    const rim = circle(hoop, 0, 0.82, 0, Math.PI * 2, 14).map(([x, z]) => [x, z, 4.2]);
    line(over, rim, '#ff6a2b', 0.2);
    for (let i = 0; i < 12; i += 3) line(over, [rim[i], [hoop + (rim[i][0] - hoop) * 0.5, rim[i][1] * 0.5, 3.2]], 'rgba(255,255,255,.8)', 0.08);
  }
  nearMasts(over);
}

function paintKarting(tools, g, over, nearMasts) {
  const { rect, line, ribbon, wall } = tools;
  const pts = TRACK.pts;
  const loop = [...pts, pts[0]];
  rect(g, -COURT.hw - 4, -COURT.hd - 3, COURT.hw + 4, COURT.hd + 3, '#58ad6d');
  for (let z = -16; z < 16; z += 4) rect(g, -COURT.hw - 4, z, COURT.hw + 4, z + 2, '#61b575');
  ribbon(g, loop, 3.6, '#d9d4c2');
  ribbon(g, loop, 2.75, '#f1f3ef');
  ribbon(g, loop, 2.45, '#3a414e');
  for (let i = 0; i < pts.length; i += 2) {
    const [a, b] = [pts[i], pts[(i + 2) % pts.length]];
    const hot = a.curve > 0.1;
    if (!hot) continue;
    ribbon(g, [a, b].map(p => ({ ...p, x: p.x - Math.sin(p.angle) * 2.65, z: p.z + Math.cos(p.angle) * 2.65 })), 0.42, i % 4 ? '#ffffff' : '#e8413a');
    ribbon(g, [a, b].map(p => ({ ...p, x: p.x + Math.sin(p.angle) * 2.65, z: p.z - Math.cos(p.angle) * 2.65 })), 0.42, i % 4 ? '#ffffff' : '#e8413a');
  }
  for (let i = 8; i < loop.length; i += 16) line(g, [[loop[i].x, loop[i].z], [loop[i + 3]?.x ?? loop[i].x, loop[i + 3]?.z ?? loop[i].z]], 'rgba(255,255,255,.38)', 0.12);

  // Línea de largada a cuadros y pórtico.
  const startX = -15;
  for (let i = 0; i < 2; i++) for (let k = 0; k < 6; k++) rect(g, startX + i * 0.8, -13.9 + k * 0.8, startX + (i + 1) * 0.8, -13.1 + k * 0.8, (i + k) % 2 ? '#ffffff' : '#141820');
  const tyres = ['#e8413a', '#f4f6f4', '#2a3039'];
  for (let i = 0; i < 40; i++) {
    const x = -33 + i * 1.7;
    rect(g, x, 15.2, x + 1.5, 16.2, tyres[i % 3]);
    wall(g, x, 15.2, x + 1.5, 15.2, 0, 0.6, tyres[i % 3]);
    rect(over, x, -16, x + 1.5, -15.3, tyres[(i + 1) % 3]);
    wall(over, x, -16, x + 1.5, -16, 0, 0.55, tyres[(i + 1) % 3]);
  }
  const gantryX = startX + 0.8;
  line(over, [[gantryX, -14.6, 0], [gantryX, -14.6, 5.1]], '#20262f', 0.3);
  line(over, [[gantryX, -8.6, 0], [gantryX, -8.6, 5.1]], '#20262f', 0.3);
  for (let i = 0; i < 8; i++) for (let k = 0; k < 2; k++) wall(over, gantryX, -14.6 + i * 0.75, gantryX, -13.85 + i * 0.75, 4.1 + k * 0.5, 4.6 + k * 0.5, (i + k) % 2 ? '#ffffff' : '#141820');
  nearMasts(over);
}

export function bakeWorld(cam) {
  const { cols, rows } = cam;
  const envLayer = layer(cols, rows, { alpha: false });
  const maskLayer = layer(cols, rows, { alpha: false });
  const frontLayer = layer(cols, rows);
  const env = envLayer.g;
  const mask = maskLayer.g;
  const front = frontLayer.g;
  const tools = painter(cam);
  const rand = seeded(20261118);
  const anchors = {};

  paintBackdrop(cam, env, mask, anchors);
  paintGround(cam, tools, env, mask, rand, anchors);
  const trees = plantTrees(cam, tools, rand);
  trees.forEach(tree => tree.shadow(env));

  const items = [...trees, ...buildings(cam, tools, rand, anchors)].sort((a, b) => b.z - a.z);
  for (const item of items) {
    item.draw(env);
    item.mask?.(mask);
    if (item.z < ROAD_Z - 2) item.draw(front);
  }

  const nearMasts = g => {
    for (const x of [-39, 39]) {
      tools.line(g, [[x, -17, 0], [x, -17, 13]], '#59646e', 0.34);
      tools.wall(g, x - 1.5, -17, x + 1.5, -17, 12.6, 13.8, '#3c4650');
    }
  };
  const courts = [];
  const overs = [];
  [paintFootball, paintPadel, paintBasket, paintKarting].forEach(paint => {
    const court = layer(cols, rows);
    const over = layer(cols, rows);
    paint(tools, court.g, over.g, nearMasts);
    courts.push(court.canvas);
    overs.push(over.canvas);
  });

  return { env: envLayer.canvas, mask: maskLayer.canvas, front: frontLayer.canvas, courts, overs, anchors };
}
