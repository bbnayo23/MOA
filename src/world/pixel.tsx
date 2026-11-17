import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/**
 * The pixel-art look: scenes render into a small picture (few, big pixels —
 * the canvas is upscaled without smoothing, see `canvas { image-rendering }`),
 * then every silhouette gets a dark one-pixel outline where it stands in front
 * of something farther away. Sprites (characters) bring their own outline and
 * are skipped: they render with alpha < 1.
 */
export function PixelPost({ threshold = 0.22 }: { threshold?: number }) {
  const { rt, scene, cam, mat } = useMemo(() => {
    const rt = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      // 8-bit sRGB storage (no banding in the dark; unlike half-float targets, every WebGL2 phone can draw into it)
      colorSpace: THREE.SRGBColorSpace,
      depthTexture: new THREE.DepthTexture(1, 1),
    });
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: rt.texture },
        tDepth: { value: rt.depthTexture },
        texel: { value: new THREE.Vector2() },
        cNear: { value: 1 },
        cFar: { value: 100 },
        ortho: { value: 1 },
        threshold: { value: threshold },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        #include <packing>
        uniform sampler2D tColor;
        uniform sampler2D tDepth;
        uniform vec2 texel;
        uniform float cNear, cFar, ortho, threshold;
        varying vec2 vUv;
        float dist(vec2 uv) {
          float d = texture2D(tDepth, uv).x;
          return ortho > 0.5 ? -orthographicDepthToViewZ(d, cNear, cFar) : -perspectiveDepthToViewZ(d, cNear, cFar);
        }
        void main() {
          vec4 c = texture2D(tColor, vUv);
          vec3 col = c.rgb;
          if (c.a > 0.95) {
            float z = dist(vUv);
            float behind = max(max(dist(vUv + vec2(texel.x, 0.0)), dist(vUv - vec2(texel.x, 0.0))),
                               max(dist(vUv + vec2(0.0, texel.y)), dist(vUv - vec2(0.0, texel.y)))) - z;
            // far off (perspective), small steps in depth are no edge
            if (behind > threshold * max(1.0, z * (1.0 - ortho) * 0.06)) col *= vec3(0.46, 0.4, 0.56);
          }
          // a touch more colour than the pastel source (in linear light)
          col = max(mix(vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), col, 1.15), 0.0);
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
      depthTest: false,
      depthWrite: false,
    });
    const scene = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    quad.frustumCulled = false;
    scene.add(quad);
    return { rt, scene, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), mat };
  }, [threshold]);
  useEffect(() => () => rt.dispose(), [rt]);

  const size = new THREE.Vector2();
  useFrame(({ gl, scene: world, camera }) => {
    gl.getDrawingBufferSize(size);
    if (rt.width !== size.x || rt.height !== size.y) rt.setSize(size.x, size.y);
    gl.setRenderTarget(rt);
    gl.render(world, camera);
    gl.setRenderTarget(null);
    const u = mat.uniforms, c = camera as THREE.PerspectiveCamera;
    u.texel.value.set(1 / size.x, 1 / size.y);
    u.cNear.value = c.near;
    u.cFar.value = c.far;
    u.ortho.value = (camera as THREE.OrthographicCamera).isOrthographicCamera ? 1 : 0;
    gl.render(scene, cam);
  }, 1);
  return null;
}

/**
 * A fixed pixel size for a scene with its own camera: the picture is `rows` pixels tall, whatever the
 * screen. It reports the pixel ratio for that; the canvas takes it as its `dpr` prop (so a re-render keeps it).
 */
export function PixelRows({ rows, onDpr }: { rows: number; onDpr: (dpr: number) => void }) {
  const h = useThree((s) => s.size.height);
  useEffect(() => onDpr(Math.min(window.devicePixelRatio, rows / Math.max(h, 1))), [h, rows, onDpr]);
  return null;
}

/** Canvas settings for the pixel look (no smoothing anywhere; shadows with hard, pixel edges). */
export const PIXEL_GL = { antialias: false, powerPreference: 'high-performance' } as const;
