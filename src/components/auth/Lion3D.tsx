import { useEffect, useRef } from "react";
import * as THREE from "three";

// A real WebGL 3D "energy lion": the source art is sampled ONCE at load to build
// a volumetric point cloud (depth from luminance), then rendered/animated
// entirely on the GPU — additive glow, per-particle twinkle, breathing,
// pointer parallax and a cursor-repel field. No image is ever displayed.
const SRC = "/images/login/lion-left.png";

const VERT = `
  uniform float uTime;
  uniform vec2  uMouse;      // cursor in world XY (z=0 plane)
  uniform float uBreath;
  attribute vec3 aColor;
  attribute float aRnd;
  varying vec3 vColor;
  varying float vTw;
  void main() {
    vColor = aColor;
    vec3 p = position * uBreath;
    // slow living drift
    p.x += sin(uTime * 0.6 + aRnd * 6.2831) * 0.5;
    p.y += cos(uTime * 0.5 + aRnd * 6.2831) * 0.5;
    // cursor repel field
    vec2 d = p.xy - uMouse;
    float dist = length(d);
    float R = 18.0;
    if (dist < R) {
      float f = 1.0 - dist / R;
      p.xy += normalize(d + 0.0001) * f * f * 12.0;
      p.z  += f * f * 10.0;
    }
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float tw = 0.65 + 0.35 * sin(uTime * 2.0 + aRnd * 20.0);
    vTw = tw;
    gl_PointSize = (aRnd * 2.2 + 2.0) * tw * (420.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = `
  precision mediump float;
  varying vec3 vColor;
  varying float vTw;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float a = smoothstep(0.5, 0.0, d);
    a *= a;
    gl_FragColor = vec4(vColor * (1.15 + vTw * 0.6), a);
  }
`;

export default function Lion3D() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = host.clientWidth || 600;
    let H = host.clientHeight || 900;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const FOV = 45;
    const camera = new THREE.PerspectiveCamera(FOV, W / H, 1, 2000);
    camera.position.z = 150;

    const group = new THREE.Group();
    scene.add(group);

    // World-space size the cloud maps into (keeps the lion's aspect ratio).
    const WORLD_H = 120;
    const IMG_ASPECT = 686 / 1122;
    const WORLD_W = WORLD_H * IMG_ASPECT;

    const uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(9999, 9999) },
      uBreath: { value: 1 },
    };
    const material = new THREE.ShaderMaterial({
      uniforms, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
    });

    let points: THREE.Points | null = null;
    let raf = 0;
    let disposed = false;

    // Pointer → world XY on the z=0 plane.
    let targetRotY = 0, targetRotX = 0;
    const pointer = { nx: 0, ny: 0, inside: false };
    const worldFromPointer = () => {
      const vh = 2 * Math.tan((FOV * Math.PI) / 360) * camera.position.z;
      const vw = vh * (W / H);
      return { x: pointer.nx * vw * 0.5, y: pointer.ny * vh * 0.5 };
    };

    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      pointer.nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
      pointer.inside = true;
      targetRotY = pointer.nx * 0.28;
      targetRotX = pointer.ny * -0.18;
    };
    const onLeave = () => { pointer.inside = false; targetRotY = 0; targetRotX = 0; };
    // Listen on the whole panel so the lion reacts even when the cursor is over text.
    const surface = host.parentElement || host;
    surface.addEventListener("pointermove", onMove as EventListener);
    surface.addEventListener("pointerleave", onLeave);

    const buildFromImage = (img: HTMLImageElement) => {
      // Downsample to a manageable grid, then sample bright/opaque pixels.
      const SW = 240;
      const SH = Math.round(SW / IMG_ASPECT);
      const c = document.createElement("canvas");
      c.width = SW; c.height = SH;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, SW, SH);
      const data = ctx.getImageData(0, 0, SW, SH).data;

      const pos: number[] = [];
      const col: number[] = [];
      const rnd: number[] = [];
      // Neon ramp: dark→deep violet, mid→magenta, bright→cyan-white.
      const ramp = (lum: number): [number, number, number] => {
        if (lum < 0.5) {
          const k = lum / 0.5; // violet → magenta
          return [0.45 + 0.25 * k, 0.18 + 0.12 * k, 0.75 + 0.2 * k];
        }
        const k = (lum - 0.5) / 0.5; // magenta → cyan-white
        return [0.7 - 0.35 * k, 0.3 + 0.65 * k, 0.95 + 0.05 * k];
      };
      for (let y = 0; y < SH; y += 1) {
        for (let x = 0; x < SW; x += 1) {
          const i = (y * SW + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 30) continue;
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          if (lum < 0.10) continue;                        // drop near-black background
          if (Math.random() > 0.82) continue;              // light, even thinning
          const wx = (x / SW - 0.5) * WORLD_W;
          const wy = (0.5 - y / SH) * WORLD_H;
          const wz = (lum - 0.4) * 30 + (Math.random() - 0.5) * 6; // depth from brightness
          pos.push(wx, wy, wz);
          const [cr, cg, cb] = ramp(lum);
          const bright = 0.7 + lum * 0.9;                  // brighter where the art is bright
          col.push(Math.min(1, cr * bright), Math.min(1, cg * bright), Math.min(1, cb * bright));
          rnd.push(Math.random());
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute("aColor", new THREE.Float32BufferAttribute(col, 3));
      geo.setAttribute("aRnd", new THREE.Float32BufferAttribute(rnd, 1));
      points = new THREE.Points(geo, material);
      group.add(points);
      if (reduced) renderer.render(scene, camera);
    };

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { if (!disposed) buildFromImage(img); };
    img.src = SRC;

    const clock = new THREE.Clock();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();
      uniforms.uTime.value = t;
      uniforms.uBreath.value = 1 + Math.sin(t * 0.9) * 0.014;
      const m = pointer.inside ? worldFromPointer() : { x: 9999, y: 9999 };
      uniforms.uMouse.value.set(m.x, m.y);
      // parallax + gentle idle sway
      group.rotation.y += (targetRotY + Math.sin(t * 0.31) * 0.05 - group.rotation.y) * 0.05;
      group.rotation.x += (targetRotX + Math.cos(t * 0.37) * 0.03 - group.rotation.x) * 0.05;
      renderer.render(scene, camera);
    };
    if (!reduced) raf = requestAnimationFrame(tick);

    const ro = new ResizeObserver(() => {
      W = host.clientWidth || W; H = host.clientHeight || H;
      renderer.setSize(W, H);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
    });
    ro.observe(host);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      surface.removeEventListener("pointermove", onMove as EventListener);
      surface.removeEventListener("pointerleave", onLeave);
      points?.geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={hostRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
}
