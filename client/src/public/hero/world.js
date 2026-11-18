// Geometría compartida del paisaje: cámara fija, trazados y utilidades.
// Unidades del mundo: metros aproximados. X a la derecha, Z hacia el fondo, Y hacia arriba.

export const DEPTH = 50;
export const COURT = { hw: 30, hd: 14 };
export const PAD = { hw: 36, hd: 19 };
export const ROAD_Z = 30;
export const FAR_ROAD_Z = 130;
export const RAIL_Z = 215;
export const SCENE_COUNT = 4;

export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, value) => {
  const t = clamp((value - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Lente descentrada: las verticales quedan verticales y la perspectiva nunca cambia entre escenas.
export function makeCamera(cols, rows, copyCells) {
  const wide = smooth(0.8, 1.8, cols / rows);
  const s0 = cols * lerp(0.0108, 0.0062, wide);
  const peak = rows * 0.085;
  const hy = Math.min(copyCells + peak + 2, rows * 0.56);
  const nearEdge = rows * 0.885;
  const A = Math.max(rows * 0.16, (nearEdge - hy) / (DEPTH / (DEPTH - COURT.hd)));
  return { cols, rows, cx: cols / 2, hy, s0, A, H: A / s0, peak };
}

export function project(cam, x, y, z) {
  const depth = Math.max(4, z + DEPTH);
  const s = (cam.s0 * DEPTH) / depth;
  return { x: cam.cx + x * s, y: cam.hy + (cam.H - y) * s, s };
}

export const halfWidthAt = (cam, z) => cam.cx / ((cam.s0 * DEPTH) / Math.max(4, z + DEPTH));

export function padBox(cam) {
  const nearLeft = project(cam, -PAD.hw, 0, -PAD.hd);
  const nearRight = project(cam, PAD.hw, 0, -PAD.hd);
  const far = project(cam, 0, 5, PAD.hd);
  return { left: nearLeft.x, right: nearRight.x, top: far.y, bottom: nearLeft.y };
}

export function riverX(z) {
  return 62 + 26 * Math.sin(z * 0.02 + 0.4) - 0.62 * Math.max(0, z + 10);
}
export const riverHalfWidth = z => 6.5 + Math.max(0, z + 30) * 0.025;

export function makePath(points, { closed = false, steps = 14 } = {}) {
  const count = points.length;
  const at = i => (closed ? points[(i + count) % count] : points[clamp(i, 0, count - 1)]);
  const pts = [];
  const segments = closed ? count : count - 1;
  for (let i = 0; i < segments; i++) {
    const [a, b, c, d] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let j = 0; j < steps; j++) {
      const u = j / steps;
      const catmull = k => 0.5 * (2 * b[k] + (c[k] - a[k]) * u + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * u * u + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * u * u * u);
      pts.push({ x: catmull(0), z: catmull(1) });
    }
  }
  if (!closed) pts.push({ x: points[count - 1][0], z: points[count - 1][1] });

  let length = 0;
  pts.forEach((point, i) => {
    const prev = pts[closed ? (i - 1 + pts.length) % pts.length : Math.max(0, i - 1)];
    const next = pts[closed ? (i + 1) % pts.length : Math.min(pts.length - 1, i + 1)];
    if (i > 0) length += Math.hypot(point.x - pts[i - 1].x, point.z - pts[i - 1].z);
    point.d = length;
    point.angle = Math.atan2(next.z - prev.z, next.x - prev.x);
    let turn = point.angle - Math.atan2(point.z - prev.z, point.x - prev.x);
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    point.curve = clamp(Math.abs(turn) * 5);
  });
  if (closed) length += Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].z - pts[pts.length - 1].z);
  return { pts, length, closed };
}

export function pointAt(path, distance) {
  const { pts, length, closed } = path;
  const d = closed ? ((distance % length) + length) % length : clamp(distance, 0, length);
  let low = 0;
  let high = pts.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (pts[mid].d <= d) low = mid;
    else high = mid - 1;
  }
  const a = pts[low];
  const b = pts[closed ? (low + 1) % pts.length : Math.min(pts.length - 1, low + 1)];
  const span = (b.d > a.d ? b.d : length) - a.d;
  const t = span > 0 ? clamp((d - a.d) / span) : 0;
  return { x: lerp(a.x, b.x, t), z: lerp(a.z, b.z, t), angle: a.angle, curve: a.curve };
}

export const TRACK = makePath([
  [-24, -11], [0, -11.5], [22, -11], [30, -6], [27, 0], [15, 0.5], [8, -4.5], [-3, -4], [-9, 1],
  [-3, 6], [10, 6.5], [24, 6.5], [29, 10], [22, 12.5], [0, 12], [-22, 12], [-30, 7], [-28, 0], [-31, -6],
], { closed: true, steps: 16 });

export const WALK_PATHS = [
  makePath([[-104, -26], [-76, -17], [-56, -12], [-45, -4], [-37, 1]]),
  makePath([[-126, 25], [-88, 15], [-62, 10], [-47, 8], [-37, 8]]),
  makePath([[37, 10], [43, 15], [46, 22], [44, 27.4]]),
  makePath([[37, -5], [44, -10], [49, -19], [45, -31]]),
];
