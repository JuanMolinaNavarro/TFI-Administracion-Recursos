export const VERTEX_SHADER = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * .5 + .5, .5 - aPos.y * .5);
  gl_Position = vec4(aPos, 0., 1.);
}`;

export const FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform sampler2D uEnv, uMask, uCourtA, uCourtB, uOverA, uOverB, uActors;
uniform vec2 uRes, uSun;
uniform vec4 uCam;   // cx, horizonte, A, s0
uniform vec3 uWave;  // origen x/y y radio actual
uniform vec2 uWaveShape; // ancho del frente y ruido
uniform vec4 uPad;   // izquierda, derecha, arriba, abajo
uniform float uTime, uCopyHalf;

const float DEPTH = 50.;
const float LEVELS = 11.;
const vec3 BG = vec3(.93333, .94902, .96863);
const vec3 MINT = vec3(.4, .945, .761);

float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2. + a.y * a.y * .75); }
float bayer4(vec2 a) { return bayer2(.5 * a) * .25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(.5 * a) * .25 + bayer2(a); }
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0., a = .5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= .5; }
  return v;
}
vec2 toUv(vec2 p) { return (floor(p) + .5) / uRes; }

void main() {
  vec2 px = vUv * uRes;
  vec2 cell = floor(px);
  float dither = bayer8(cell);
  float t = uTime;
  float hy = uCam.y;

  vec4 m = texture2D(uMask, vUv);
  float isGround = step(hy + 1., px.y);
  float depth = DEPTH * uCam.z / max(1., px.y - hy);
  float scale = uCam.w * DEPTH / depth;
  vec2 world = vec2((px.x - uCam.x) / scale, depth - DEPTH);

  // Viento: las copas se mecen y una ráfaga recorre el valle.
  float gust = .55 + .45 * sin(world.x * .035 + world.y * .02 - t * .8);
  float phase = m.g * 6.283;
  vec2 sway = m.r * gust * vec2(
    sin(t * 1.55 + phase) * 1.15 + sin(t * 3.4 + phase * 2.) * .45,
    cos(t * 1.9 + phase) * .38
  );
  vec3 col = texture2D(uEnv, (px + sway) / uRes).rgb;

  float grass = (1. - smoothstep(.04, .1, abs(m.b - .25))) * isGround;
  float water = (1. - smoothstep(.04, .1, abs(m.b - .5))) * isGround;
  float sky = smoothstep(.85, .97, m.b);
  float nearFade = 1. - smoothstep(90., 340., depth);

  if (grass > 0.) {
    float bend = fbm(vec2(world.x * .035 - t * .13, world.y * .08 + t * .04));
    float ripple = sin(world.x * .34 + world.y * .2 - t * 1.45 + bend * 8.);
    float sweep = smoothstep(.2, 1., ripple) * smoothstep(.34, .68, bend);
    col += grass * nearFade * (vec3(.1, .13, .035) * sweep - vec3(.018, .03, .012) * smoothstep(.1, 1., -ripple));
  }
  if (water > 0.) {
    vec2 flow = vec2(world.x * .42, world.y * .14 + t * .52);
    float a = fbm(flow), b = fbm(flow * 1.8 + vec2(4.2, -t * .24));
    col = mix(col, vec3(.27, .67, .72), water * smoothstep(.34, .72, a) * .55);
    col = mix(col, vec3(.72, .94, .9), water * smoothstep(.56, .72, b) * .7);
    float glint = step(.86, noise(vec2(world.x * 2.2, world.y * .8 + t * 1.6))) * step(.62, sin(t * 4. + cell.x * 1.7 + cell.y));
    col = mix(col, vec3(1., .96, .82), water * glint);
  }
  if (isGround > 0. && m.b < .9) {
    // Sombras de nubes que atraviesan todo el terreno.
    vec2 c = vec2(world.x * .0105 - t * .022, world.y * .019 + t * .006);
    float shade = smoothstep(.49, .67, fbm(c + 3.7));
    float sunlit = smoothstep(.54, .34, fbm(c * 1.25 + 9.));
    float amount = mix(.42, 1., nearFade);
    col *= 1. - shade * .24 * amount;
    col = mix(col, col * vec3(.92, .98, 1.08), shade * .55 * amount);
    col += vec3(.052, .04, .012) * sunlit * amount;
  }
  if (sky > 0.) {
    vec2 q = vec2(px.x / uRes.y * 1.55 - t * .017, px.y / uRes.y * 5.6 + t * .003);
    float n = fbm(q + fbm(q * 1.35 + t * .012) * .42);
    float lower = fbm(q + vec2(.05, -.13) + fbm(q * 1.35 + t * .012) * .42);
    float band = smoothstep(hy * .1, hy * .42, px.y);
    float cover = smoothstep(.45, .59, n) * band;
    vec3 lit = mix(vec3(1.), vec3(1., .9, .79), smoothstep(hy * .55, hy, px.y));
    vec3 under = mix(vec3(.82, .87, .93), vec3(.95, .76, .68), smoothstep(hy * .55, hy, px.y));
    col = mix(col, mix(lit, under, smoothstep(.02, .17, n - lower)), cover * sky * .96);
  }
  float sunGlow = exp(-length((px - uSun) / vec2(uRes.x * .22, uRes.y * .17)));
  col += vec3(1., .67, .36) * sunGlow * (.045 + .022 * sin(t * .42));
  // El cielo se disuelve en el fondo antes de llegar al texto.
  float peak = uRes.y * .085;
  float aside = smoothstep(uCopyHalf * .82, uCopyHalf * 1.12, abs(px.x - uCam.x));
  col = mix(BG, col, smoothstep(mix(hy - peak * 2.5, 0., aside), mix(hy - peak * .55, hy * .66, aside), px.y));

  // Onda de transformación: umbral Bayer más lluvia de micropuntos en el frente.
  float organic = (fbm(px * .032 + 3.) - .5) * uWaveShape.y;
  float wave = smoothstep(0., uWaveShape.x, uWave.z - distance(px, uWave.xy) + organic);
  float front = wave * (1. - wave) * 4.;
  float rain = hash(vec2(cell.x, 3.));
  vec2 scatter = px + vec2((hash(cell + floor(t * 12.)) - .5) * front * 5., -front * rain * 15.);
  bool nextScene = dither < wave;
  vec4 court = nextScene ? texture2D(uCourtB, toUv(scatter)) : texture2D(uCourtA, toUv(scatter));
  col = col * (1. - court.a) + court.rgb;
  vec4 actors = texture2D(uActors, vUv);
  col = col * (1. - actors.a) + actors.rgb;
  vec4 over = nextScene ? texture2D(uOverB, toUv(scatter)) : texture2D(uOverA, toUv(scatter));
  col = col * (1. - over.a) + over.rgb;

  if (front > .01) {
    float pad = smoothstep(uPad.x - 18., uPad.x + 6., px.x) * smoothstep(uPad.y + 18., uPad.y - 6., px.x)
      * smoothstep(uPad.z - 16., uPad.z + 8., px.y) * smoothstep(uPad.w + 12., uPad.w - 4., px.y);
    col += MINT * front * pad * .13;
    float spark = step(1. - .26 * front, hash(cell + floor(t * 18.) * .37));
    col = mix(col, mix(MINT, vec3(1.), hash(cell.yx)), spark * pad);
  }

  float edge = smoothstep(uRes.y * .895, uRes.y * .995, px.y + (noise(px * .09) - .5) * 10.);
  col = mix(col, BG, edge);

  // Cuantización ordenada relativa al fondo: el cielo termina exactamente en --bg-color.
  vec3 delta = col - BG;
  gl_FragColor = vec4(BG + floor(delta * LEVELS + dither) / LEVELS, 1.);
}`;
