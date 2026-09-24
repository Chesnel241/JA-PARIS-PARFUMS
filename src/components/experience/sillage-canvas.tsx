"use client";

import { useEffect, useRef } from "react";
import { hasFinePointer, prefersReducedMotion } from "@/components/experience/gsap";

/**
 * « Le sillage » : fumée dorée procédurale (WebGL, sans dépendance) qui suit le
 * pointeur comme la traînée d'un parfum, se dissipe et monte doucement.
 *
 * Performance : rendu en basse définition (la fumée est floue par nature,
 * l'agrandissement est invisible), pause hors écran et onglet caché, image fixe
 * si mouvement réduit ou rendu logiciel (pas de GPU), aucun rendu si WebGL est
 * indisponible (le fond CSS du conteneur prend le relais).
 */

const TRAIL = 24;

const VERTEX = `
attribute vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
`;

const FRAGMENT = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform float uIntensity;
uniform vec3 uTrail[${TRAIL}];
uniform vec3 uBg;
uniform vec3 uSmoke;
uniform vec3 uGlow;
uniform vec3 uSpark;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = uTime * 0.055;

  // Sillage du pointeur : densité locale + tourbillon qui déforme la fumée.
  float trail = 0.0;
  vec2 swirl = vec2(0.0);
  for (int i = 0; i < ${TRAIL}; i++) {
    vec3 point = uTrail[i];
    vec2 d = p - vec2(point.x * aspect, point.y);
    float fall = exp(-dot(d, d) * 26.0) * point.z;
    trail += fall;
    swirl += vec2(-d.y, d.x) * fall * 3.2;
  }

  vec2 q = vec2(fbm(p * 1.4 + vec2(0.0, -t * 2.2)), fbm(p * 1.4 + vec2(5.2, 1.3) - t));
  vec2 r = vec2(
    fbm(p * 1.9 + 3.2 * q + vec2(1.7, 9.2) + t * 1.2 + swirl),
    fbm(p * 1.9 + 3.2 * q + vec2(8.3, 2.8) - t * 0.8 - swirl)
  );
  float f = fbm(p * 1.7 + 2.6 * r + swirl * 1.6);

  float smoke = smoothstep(0.38, 1.02, f) * uIntensity;
  smoke += trail * f * 0.9;
  smoke *= mix(1.15, 0.6, uv.y);

  vec3 color = uBg;
  color = mix(color, uSmoke, clamp(smoke * 1.25, 0.0, 1.0));
  color = mix(color, uGlow, clamp(smoke * smoke * 1.5, 0.0, 1.0));
  color += uSpark * pow(clamp(f, 0.0, 1.0), 5.0) * (0.35 + trail * 1.6) * uIntensity;

  float vignette = smoothstep(1.3, 0.2, length((uv - vec2(0.5, 0.45)) * vec2(aspect * 0.75, 1.0)));
  color = mix(uBg, color, mix(0.55, 1.0, vignette));
  color += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) * 0.018;
  gl_FragColor = vec4(color, 1.0);
}
`;

type Palette = { bg: string; smoke: string; glow: string; spark: string };

const PALETTES: Record<"night" | "day", Palette> = {
  night: { bg: "#0e0c09", smoke: "#4a3721", glow: "#b48a4f", spark: "#f4dcae" },
  day: { bg: "#f3ece2", smoke: "#e3d3bb", glow: "#cfb183", spark: "#ffffff" },
};

function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function isSoftwareRenderer(gl: WebGLRenderingContext) {
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
  return /swiftshader|llvmpipe|software|basic render/i.test(renderer);
}

export function SillageCanvas({ tone = "night", intensity = 1, className = "" }: {
  tone?: "night" | "day";
  intensity?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "low-power", preserveDrawingBuffer: false });
    // Contexte absent ou perdu : le fond CSS du conteneur reste affiché.
    if (!gl || gl.isContextLost()) return;

    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uniform = (name: string) => gl.getUniformLocation(program, name);
    const uRes = uniform("uRes");
    const uTime = uniform("uTime");
    const uIntensity = uniform("uIntensity");
    const uTrail = uniform("uTrail");
    const palette = PALETTES[tone];
    gl.uniform3fv(uniform("uBg"), hexToRgb(palette.bg));
    gl.uniform3fv(uniform("uSmoke"), hexToRgb(palette.smoke));
    gl.uniform3fv(uniform("uGlow"), hexToRgb(palette.glow));
    gl.uniform3fv(uniform("uSpark"), hexToRgb(palette.spark));
    gl.uniform1f(uIntensity, intensity);

    const staticFrame = prefersReducedMotion() || isSoftwareRenderer(gl);
    const fine = hasFinePointer();
    // Définition de rendu : la fumée est douce, un tiers à la moitié des pixels suffit.
    const scale = staticFrame ? 0.35 : fine ? 0.5 : 0.38;

    const trail = new Float32Array(TRAIL * 3);
    let head = 0;
    let lastX = -1;
    let lastY = -1;
    let lastInput = 0;

    const pushPoint = (x: number, y: number, strength: number) => {
      trail[head * 3] = x;
      trail[head * 3 + 1] = y;
      trail[head * 3 + 2] = strength;
      head = (head + 1) % TRAIL;
    };

    // Les uniformes appartiennent au programme : on (ré)envoie toujours la
    // résolution, même si le canvas a déjà la bonne taille (remontage).
    const resize = () => {
      const width = Math.max(1, Math.round(canvas.clientWidth * scale));
      const height = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.uniform2f(uRes, width, height);
    };

    const draw = (time: number) => {
      gl.uniform1f(uTime, time);
      gl.uniform3fv(uTrail, trail);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    resize();
    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (staticFrame) draw(12);
    });
    resizeObserver.observe(canvas);

    // Libère les ressources GPU sans « perdre » le contexte : un remontage du
    // composant (navigation, mode strict de React) réutilise le même canvas.
    const release = () => {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };

    if (staticFrame) {
      draw(12);
      canvas.dataset.ready = "true";
      return () => {
        resizeObserver.disconnect();
        release();
      };
    }

    const onPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = 1 - (event.clientY - rect.top) / rect.height;
      if (x < -0.1 || x > 1.1 || y < -0.1 || y > 1.1) return;
      lastInput = performance.now();
      if (lastX >= 0 && Math.hypot(x - lastX, y - lastY) < 0.012) return;
      lastX = x;
      lastY = y;
      pushPoint(x, y, 1);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    let frame = 0;
    let running = false;
    let visible = true;
    let previous = performance.now();
    let elapsed = Math.random() * 40;
    let idleClock = 0;

    const loop = (now: number) => {
      const delta = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      elapsed += delta;

      // Le sillage se dissipe et monte.
      const decay = Math.pow(0.24, delta);
      for (let i = 0; i < TRAIL; i += 1) {
        trail[i * 3 + 1] += delta * 0.035;
        trail[i * 3 + 2] *= decay;
      }
      // Sans interaction (mobile, souris immobile), un sillage autonome dérive lentement.
      idleClock += delta;
      if (now - lastInput > 1600 && idleClock > 0.12) {
        idleClock = 0;
        pushPoint(0.5 + Math.sin(elapsed * 0.42) * 0.3, 0.42 + Math.sin(elapsed * 0.67 + 1.3) * 0.2, 0.55);
      }

      draw(elapsed);
      frame = window.requestAnimationFrame(loop);
    };

    const start = () => {
      if (running || !visible || document.hidden) return;
      running = true;
      previous = performance.now();
      frame = window.requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      window.cancelAnimationFrame(frame);
    };

    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    intersection.observe(canvas);
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);

    const onLost = (event: Event) => {
      event.preventDefault();
      stop();
      canvas.dataset.ready = "false";
    };
    canvas.addEventListener("webglcontextlost", onLost);

    draw(elapsed);
    canvas.dataset.ready = "true";
    start();

    return () => {
      stop();
      intersection.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("webglcontextlost", onLost);
      release();
    };
  }, [tone, intensity]);

  return <canvas ref={canvasRef} className={`sillage-canvas ${className}`.trim()} data-tone={tone} aria-hidden="true" />;
}
