import { bakeWorld } from './bake.js';
import { createLife } from './life.js';
import { FRAGMENT_SHADER, VERTEX_SHADER } from './shader.js';
import { SCENE_COUNT, clamp, makeCamera, padBox } from './world.js';

const SCENE_SECONDS = 4;
const WAVE_SECONDS = 1.55;
const SOFT_SECONDS = 0.45;
const FRAME_MS = 1000 / 30;
const TEXTURE_UNITS = ['uEnv', 'uMask', 'uCourtA', 'uCourtB', 'uOverA', 'uOverB', 'uActors'];

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'Shader inválido');
  return shader;
}

function createRenderer(canvas) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) return null;
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Programa inválido');
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  TEXTURE_UNITS.forEach((name, unit) => gl.uniform1i(gl.getUniformLocation(program, name), unit));
  const uniform = name => gl.getUniformLocation(program, name);
  const u = Object.fromEntries(['uRes', 'uSun', 'uCam', 'uWave', 'uWaveShape', 'uPad', 'uTime', 'uFade', 'uCopyHalf'].map(name => [name, uniform(name)]));

  const textures = new Map();
  const upload = (canvasSource, filter = gl.LINEAR) => {
    let texture = textures.get(canvasSource);
    if (!texture) {
      texture = gl.createTexture();
      textures.set(canvasSource, texture);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, texture);
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvasSource);
    return texture;
  };
  const clear = () => {
    textures.forEach(texture => gl.deleteTexture(texture));
    textures.clear();
  };
  return { gl, u, upload, clear };
}

export function createHeroWorld({ host, canvas, copy, reduced = false, paused = false, onScene, onProgress, onReady }) {
  let renderer = null;
  let flat = null;
  try {
    renderer = createRenderer(canvas);
  } catch {
    renderer = null;
  }
  if (!renderer) flat = canvas.getContext('2d');

  const actors = document.createElement('canvas');
  const actorContext = actors.getContext('2d', { willReadFrequently: true });
  let cam = null;
  let baked = null;
  let life = null;
  let box = null;
  let tex = null;
  let layoutKey = '';
  let copyHalf = 0;
  let scene = 0;
  let transition = null;
  let waveTurn = 0;
  let time = 0;
  let hold = 0;
  let raf = 0;
  let last = 0;
  let onScreen = true;
  let contextLost = false;
  let destroyed = false;
  let resizeTimer = 0;
  let isReduced = reduced;
  let isPaused = paused;

  const frozen = () => isReduced || isPaused;
  const shouldRun = () => !destroyed && !contextLost && cam && onScreen && !document.hidden && (!frozen() || transition);

  function buildTextures() {
    if (!renderer || !baked) return;
    renderer.clear();
    tex = {
      env: renderer.upload(baked.env),
      mask: renderer.upload(baked.mask),
      courts: baked.courts.map(item => renderer.upload(item, renderer.gl.NEAREST)),
      overs: baked.overs.map(item => renderer.upload(item, renderer.gl.NEAREST)),
      actors: renderer.upload(actors, renderer.gl.NEAREST),
    };
  }

  function layout() {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height || destroyed) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const cell = Math.max(Math.round(2 * dpr), Math.ceil((width * dpr) / 640));
    const cols = Math.ceil((width * dpr) / cell);
    const rows = Math.ceil((height * dpr) / cell);
    const hostTop = host.getBoundingClientRect().top;
    const copyCells = Math.round(((copy.getBoundingClientRect().bottom - hostTop) * dpr) / cell);
    const key = `${cols}:${rows}:${copyCells}:${cell}`;
    copyHalf = (copy.offsetWidth * dpr) / cell / 2;
    if (key === layoutKey) return;
    layoutKey = key;
    canvas.width = cols;
    canvas.height = rows;
    canvas.style.width = `${(cols * cell) / dpr}px`;
    canvas.style.height = `${(rows * cell) / dpr}px`;
    actors.width = cols;
    actors.height = rows;
    cam = makeCamera(cols, rows, copyCells);
    box = padBox(cam);
    baked = bakeWorld(cam);
    life = createLife(cam, baked.anchors);
    buildTextures();
    render();
    sync();
    onReady?.();
  }

  function waveState() {
    if (!transition) return { radius: 1e5, fade: -1, passed: null };
    const ease = transition.t * transition.t * (3 - 2 * transition.t);
    if (transition.soft) return { radius: 1e5, fade: ease, passed: () => ease > 0.5 };
    const { x, y, reach } = transition;
    const band = cam.cols * 0.06;
    const noise = cam.cols * 0.075;
    const radius = -band - noise + ease * (reach + 2 * (band + noise));
    return { radius, fade: -1, band, noise, passed: (px, py) => Math.hypot(px - x, py - y) < radius + band / 2 };
  }

  function render() {
    if (!cam || contextLost) return;
    const shown = transition ? transition.to : scene;
    if (!renderer) {
      flat.drawImage(baked.env, 0, 0);
      flat.drawImage(baked.courts[shown], 0, 0);
      flat.drawImage(baked.overs[shown], 0, 0);
      return;
    }
    const wave = waveState();
    life.draw(actorContext, {
      front: baked.front,
      scene,
      from: transition?.from,
      to: transition?.to,
      passed: wave.passed,
    });
    const { gl, u } = renderer;
    renderer.upload(actors, gl.NEAREST);
    const from = transition ? transition.from : scene;
    const to = transition ? transition.to : scene;
    [tex.env, tex.mask, tex.courts[from], tex.courts[to], tex.overs[from], tex.overs[to], tex.actors].forEach((texture, unit) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
    });
    gl.viewport(0, 0, cam.cols, cam.rows);
    gl.uniform2f(u.uRes, cam.cols, cam.rows);
    gl.uniform2f(u.uSun, baked.anchors.sun.x, baked.anchors.sun.y);
    gl.uniform4f(u.uCam, cam.cx, cam.hy, cam.A, cam.s0);
    gl.uniform3f(u.uWave, transition?.x || 0, transition?.y || 0, wave.radius);
    gl.uniform2f(u.uWaveShape, wave.band || 1, wave.noise || 0);
    gl.uniform4f(u.uPad, box.left, box.right, box.top, box.bottom);
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uFade, wave.fade);
    gl.uniform1f(u.uCopyHalf, copyHalf);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function startTransition(next) {
    if (transition?.to === next) return;
    if (transition) scene = transition.to;
    transition = null;
    if (next === scene) return;
    const soft = frozen();
    const middle = (box.top + box.bottom) / 2;
    const origin = [[box.left, middle], [box.right, middle], [cam.cx, box.top], [cam.cx, box.bottom]][waveTurn++ % 4];
    const reach = Math.max(...[[box.left, box.top], [box.right, box.top], [box.left, box.bottom], [box.right, box.bottom]].map(([x, y]) => Math.hypot(x - origin[0], y - origin[1])));
    transition = { from: scene, to: next, t: 0, soft, x: origin[0], y: origin[1], reach };
    life.enter(next);
    onScene?.(next);
    hold = 0;
    onProgress?.(0);
  }

  function frame(now) {
    raf = 0;
    if (!shouldRun()) return;
    raf = requestAnimationFrame(frame);
    if (now - last < FRAME_MS - 2) return;
    const dt = Math.min(0.08, (now - last) / 1000 || FRAME_MS / 1000);
    last = now;
    if (!frozen()) {
      time += dt;
      life.step(dt, time);
      hold += dt;
      onProgress?.(clamp(hold / SCENE_SECONDS));
      if (hold >= SCENE_SECONDS) startTransition(((transition ? transition.to : scene) + 1) % SCENE_COUNT);
    }
    if (transition) {
      transition.t = Math.min(1, transition.t + dt / (transition.soft ? SOFT_SECONDS : WAVE_SECONDS));
      if (transition.t >= 1) {
        scene = transition.to;
        transition = null;
      }
    }
    render();
  }

  function sync() {
    if (shouldRun() && !raf) {
      last = performance.now() - FRAME_MS;
      raf = requestAnimationFrame(frame);
    } else if (!shouldRun() && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  const resizeObserver = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, cam ? 140 : 0);
  });
  resizeObserver.observe(host);
  resizeObserver.observe(copy);
  const visibilityObserver = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; sync(); }, { threshold: 0.02 });
  visibilityObserver.observe(host);
  const onVisibility = () => sync();
  document.addEventListener('visibilitychange', onVisibility);
  const onLost = event => { event.preventDefault(); contextLost = true; sync(); };
  const onRestored = () => {
    try {
      renderer = createRenderer(canvas);
    } catch {
      renderer = null;
    }
    if (!renderer) return;
    contextLost = false;
    buildTextures();
    render();
    sync();
  };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);
  layout();

  return {
    goTo(index) {
      if (!cam) return;
      startTransition(index);
      sync();
    },
    setPaused(value) {
      isPaused = value;
      sync();
      render();
    },
    setReduced(value) {
      isReduced = value;
      sync();
      render();
    },
    destroy() {
      destroyed = true;
      clearTimeout(resizeTimer);
      if (raf) cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      renderer?.clear();
      renderer?.gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
