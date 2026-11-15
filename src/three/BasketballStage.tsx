import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import type { BallEdition } from '../data/editions';
import {
  createBasketballAssembly,
  createPodiumAssembly,
  createShardField,
  type CompositeBasketball,
  type PodiumAssembly,
  type ShardField,
} from './basketballModel';

export interface DragState {
  isDragging: boolean;
  lastX: number;
  lastY: number;
  velX: number;
  velY: number;
}

interface BasketballStageProps {
  edition: BallEdition;
  scrollProgressRef: React.MutableRefObject<number>;
  explodedFactor: number;
  autoSpin: boolean;
  resetSignal: number;
  dragStateRef: React.MutableRefObject<DragState>;
  isHoveredRef: React.MutableRefObject<boolean>;
  pointerNdcRef: React.MutableRefObject<{ x: number; y: number }>;
}

interface KeyframePose {
  x: number;
  y: number;
  z: number;
  scale: number;
}

const SECTION_POSES: KeyframePose[] = [
  { x: 0.0, y: 0.06, z: 0.0, scale: 0.64 }, // 01 Hero (diameter ~31.8vh, just greater than background text height)
  { x: 1.85, y: -0.04, z: 0.2, scale: 1.52 }, // 02 About Us (overridden to exact right border in samplePose)
  { x: -1.85, y: -0.04, z: 0.2, scale: 1.52 }, // 03 Contact Us (overridden to exact left border in samplePose)
];

const HALF_FOV_TAN = Math.tan(THREE.MathUtils.degToRad(18));

function samplePose(progress: number, aspect: number, out: KeyframePose): void {
  const clamped = THREE.MathUtils.clamp(progress, 0, SECTION_POSES.length - 1);
  const idx = Math.min(SECTION_POSES.length - 2, Math.floor(clamped));
  const frac = clamped - idx;
  // Smoothstep interpolation between section keyframes
  const t = frac * frac * (3 - 2 * frac);

  const a = SECTION_POSES[idx];
  const b = SECTION_POSES[idx + 1];

  const xFactor = Math.min(1.0, Math.max(0.55, aspect / 1.45));
  const scaleFactor = aspect < 0.85 ? 0.82 : 1.0;

  // Exact right/left-border world X at z = 0.2 so About Us ball is 50% visible on right border and Contact Us ball is 50% visible on left border
  const borderEdgeX = (6.2 - 0.2) * HALF_FOV_TAN * aspect;
  const ax = idx === 1 ? borderEdgeX : idx === 2 ? -borderEdgeX : a.x * xFactor;
  const bx = idx + 1 === 1 ? borderEdgeX : idx + 1 === 2 ? -borderEdgeX : b.x * xFactor;

  out.x = THREE.MathUtils.lerp(ax, bx, t);
  out.y = THREE.MathUtils.lerp(a.y, b.y, t);
  out.z = THREE.MathUtils.lerp(a.z, b.z, t);
  out.scale = THREE.MathUtils.lerp(a.scale, b.scale, t) * scaleFactor;
}

export const BasketballStage: React.FC<BasketballStageProps> = ({
  edition,
  scrollProgressRef,
  explodedFactor,
  autoSpin,
  resetSignal,
  dragStateRef,
  isHoveredRef,
  pointerNdcRef,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);

  const basketballRef = useRef<CompositeBasketball | null>(null);
  const rimLightRef = useRef<THREE.DirectionalLight | null>(null);
  const bounceLightRef = useRef<THREE.PointLight | null>(null);
  const explodedTargetRef = useRef(explodedFactor);
  const autoSpinRef = useRef(autoSpin);
  const resetPendingRef = useRef(false);
  const initialEditionRef = useRef(edition);

  explodedTargetRef.current = explodedFactor;
  autoSpinRef.current = autoSpin;

  useEffect(() => {
    if (basketballRef.current) {
      basketballRef.current.applyEdition(edition);
    }
    if (rimLightRef.current) {
      rimLightRef.current.color.set(edition.rimLightHex);
      rimLightRef.current.intensity = edition.rimLightIntensity;
    }
    if (bounceLightRef.current) {
      bounceLightRef.current.color.set(edition.bounceLightHex);
    }
  }, [edition]);

  useEffect(() => {
    if (resetSignal > 0) {
      resetPendingRef.current = true;
      dragStateRef.current.velX = 0;
      dragStateRef.current.velY = 0;
    }
  }, [resetSignal, dragStateRef]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);

    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
    };
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.035);

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 40);
    camera.position.set(0, 0.08, 6.2);

    // Studio IBL with balanced dark gradient dome + clean overhead/side white studio strips
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const studioEnv = new THREE.Scene();
    studioEnv.background = new THREE.Color(0x161a24);
    const envDomeGeo = new THREE.SphereGeometry(12, 24, 16);
    const envDomeMat = new THREE.MeshStandardMaterial({
      color: 0x454e63,
      roughness: 1.0,
      metalness: 0.0,
      side: THREE.BackSide,
    });
    studioEnv.add(new THREE.Mesh(envDomeGeo, envDomeMat));
    const envHemi = new THREE.HemisphereLight(0x5c6882, 0x5c6478, 1.6);
    studioEnv.add(envHemi);

    // Additional white studio reflection spots (overhead-left + lower-right kick)
    const spotPanelGeo = new THREE.PlaneGeometry(1, 1);
    const spotMatTop = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1.45, 1.48, 1.55),
      side: THREE.DoubleSide,
    });
    const spotTop = new THREE.Mesh(spotPanelGeo, spotMatTop);
    spotTop.position.set(-3.2, 7.6, 3.2);
    spotTop.scale.set(2.2, 1.2, 1);
    spotTop.lookAt(0, 0, 0);
    studioEnv.add(spotTop);

    const spotMatSide = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1.05, 1.08, 1.15),
      side: THREE.DoubleSide,
    });
    const spotSide = new THREE.Mesh(spotPanelGeo, spotMatSide);
    spotSide.position.set(5.4, -2.2, 4.6);
    spotSide.scale.set(1.8, 1.0, 1);
    spotSide.lookAt(0, 0, 0);
    studioEnv.add(spotSide);

    const envTarget = pmremGenerator.fromScene(studioEnv, 0.04);
    scene.environment = envTarget.texture;
    envDomeGeo.dispose();
    envDomeMat.dispose();
    spotPanelGeo.dispose();
    spotMatTop.dispose();
    spotMatSide.dispose();
    pmremGenerator.dispose();

    // 3-Point Studio Lighting Rig + Strong Smooth Bottom-Bounce Fill
    const hemiLight = new THREE.HemisphereLight(0xaabbd4, 0xb2bccf, 1.15);
    scene.add(hemiLight);

    // White Spot #1: Primary Key Directional Light (co-aligned with softbox1)
    const keyLight = new THREE.DirectionalLight(0xfff5ec, 0.0); // Ramps in during intro sweep
    keyLight.position.set(2.8, 3.4, 3.8);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 16;
    const d = 3.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    // White Spot #2: Crisp upper-left rim highlight
    const rimLight = new THREE.DirectionalLight(
      new THREE.Color(initialEditionRef.current.rimLightHex),
      initialEditionRef.current.rimLightIntensity
    );
    rimLight.position.set(-1.8, 4.2, -3.0);
    scene.add(rimLight);
    rimLightRef.current = rimLight;

    // Smooth under-bounce accent fill to lift lower-hemisphere shadow depth
    const bounceLight = new THREE.PointLight(
      new THREE.Color(initialEditionRef.current.bounceLightHex),
      0.55,
      14,
      1.5
    );
    bounceLight.position.set(0.8, -3.4, 2.8);
    scene.add(bounceLight);
    bounceLightRef.current = bounceLight;

    // Dual Studio Softbox RectAreaLights (upper-right key + mid-left edge strip)
    let softbox1: THREE.RectAreaLight | null = null;
    let softbox2: THREE.RectAreaLight | null = null;
    if (!isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      softbox1 = new THREE.RectAreaLight(0xfff5ec, 1.85, 3.0, 1.4);
      softbox1.position.set(2.8, 3.4, 3.8);
      softbox1.lookAt(0, 0, 0);
      scene.add(softbox1);

      softbox2 = new THREE.RectAreaLight(0xe4ecff, 1.1, 2.4, 1.1);
      softbox2.position.set(-3.2, 2.2, -1.5);
      softbox2.lookAt(0, 0, 0);
      scene.add(softbox2);
    }

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const basketball: CompositeBasketball = createBasketballAssembly(
      initialEditionRef.current,
      maxAnisotropy
    );
    scene.add(basketball.root);
    basketballRef.current = basketball;

    const podium: PodiumAssembly = createPodiumAssembly();
    podium.root.position.set(0, -3.2, 0);
    podium.root.visible = false;
    scene.add(podium.root);

    const shardField: ShardField = createShardField();
    scene.add(shardField.mesh);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Pre-allocated scratch values for zero-GC animation loop
    const pose: KeyframePose = { x: 0, y: 0.06, z: 0, scale: 0.64 };
    let currentX = 0;
    let currentY = 0.06;
    let currentZ = 0;
    let currentScale = 0.64;
    let currentExploded = 0;
    let currentPodiumY = -3.2;
    let currentKeyIntensity = 0.25;
    let introClock = 0;

    let userRotX = 0.14;
    let userRotY = -0.34;
    let userRotZ = 0.08;
    let currentHoverTiltX = 0;
    let currentHoverTiltY = 0;

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    const handleResize = () => {
      if (!container || disposed) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;

      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();
      introClock = Math.min(2.2, introClock + delta);

      // Material/Lighting Intro Sweep (00:00 - 00:01.8)
      const introT = THREE.MathUtils.smoothstep(introClock, 0.0, 1.5);
      currentKeyIntensity = THREE.MathUtils.lerp(0.3, 2.05, introT);
      keyLight.intensity = currentKeyIntensity;

      const progress = scrollProgressRef.current;
      samplePose(progress, camera.aspect, pose);

      // Smooth exponential damping for scroll-choreographed basketball staging
      currentX = THREE.MathUtils.damp(currentX, pose.x, 7.5, delta);
      currentY = THREE.MathUtils.damp(currentY, pose.y, 7.5, delta);
      currentZ = THREE.MathUtils.damp(currentZ, pose.z, 7.5, delta);
      currentScale = THREE.MathUtils.damp(currentScale, pose.scale, 7.5, delta);

      // Subtle floating levitation on Hero & Champion podium
      const levitate =
        progress < 0.6 || (progress > 3.5 && progress < 4.5)
          ? Math.sin(elapsed * 1.45) * 0.025
          : 0;

      basketball.root.position.set(currentX, currentY + levitate, currentZ);
      basketball.root.scale.setScalar(currentScale);

      // Exploded-view layer separation damping
      currentExploded = THREE.MathUtils.damp(
        currentExploded,
        explodedTargetRef.current,
        8.0,
        delta
      );
      basketball.setExplodedFactor(currentExploded);

      // Interactive pointer drag inertia + subtle scroll rotation + auto-spin
      const drag = dragStateRef.current;
      if (resetPendingRef.current) {
        userRotX = THREE.MathUtils.damp(userRotX, 0.14, 7.0, delta);
        userRotY = THREE.MathUtils.damp(userRotY, -0.34, 7.0, delta);
        userRotZ = THREE.MathUtils.damp(userRotZ, 0.08, 7.0, delta);
        if (
          Math.abs(userRotX - 0.14) < 0.004 &&
          Math.abs(userRotY + 0.34) < 0.004
        ) {
          resetPendingRef.current = false;
        }
      } else if (!drag.isDragging) {
        userRotY += drag.velX;
        userRotX += drag.velY;
        const decay = Math.exp(-5.0 * delta);
        drag.velX *= decay;
        drag.velY *= decay;

        if (autoSpinRef.current) {
          userRotY += delta * 0.34;
        }
      } else {
        userRotY += drag.velX;
        userRotX += drag.velY;
      }

      // Clamp pitch so poles remain intuitive during drag
      userRotX = THREE.MathUtils.clamp(userRotX, -1.25, 1.25);

      const targetHoverY = isHoveredRef.current ? pointerNdcRef.current.x * 0.14 : 0;
      const targetHoverX = isHoveredRef.current ? -pointerNdcRef.current.y * 0.1 : 0;
      currentHoverTiltX = THREE.MathUtils.damp(currentHoverTiltX, targetHoverX, 6.0, delta);
      currentHoverTiltY = THREE.MathUtils.damp(currentHoverTiltY, targetHoverY, 6.0, delta);

      // Add organic rotational scroll choreography
      const scrollSpinY = progress * 0.85;
      const scrollSpinX = Math.sin(progress * 0.8) * 0.12;

      basketball.root.rotation.set(
        userRotX + currentHoverTiltX + scrollSpinX,
        userRotY + currentHoverTiltY + scrollSpinY,
        userRotZ
      );

      // Keep auxiliary podium & shard layers hidden so Contact Us remains completely unobstructed
      podium.root.visible = false;
      shardField.update(elapsed, 0);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      basketballRef.current = null;
      rimLightRef.current = null;
      bounceLightRef.current = null;
      basketball.dispose();
      podium.dispose();
      shardField.dispose();
      envTarget.dispose();
      renderer.dispose();
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
    };
  }, [dragStateRef, isHoveredRef, pointerNdcRef, scrollProgressRef]);

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />
      {contextLost && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-center px-6">
          <p className="font-condensed text-2xl uppercase tracking-wider text-white">
            WebGL Context Paused
          </p>
          <p className="mt-2 text-xs text-[#71717A] max-w-xs">
            Graphics context is restoring. Reload if the 3D stage does not resume automatically.
          </p>
        </div>
      )}
    </div>
  );
};
