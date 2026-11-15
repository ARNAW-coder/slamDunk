import * as THREE from 'three';
import type { BallEdition } from '../data/editions';
import {
  createBasketballTextures,
  createContactShadowTexture,
  saddleCurveY,
  type BasketballTextureSet,
} from './basketballTextures';

export interface CompositeBasketball {
  root: THREE.Group;
  shellMesh: THREE.Mesh;
  carcassMesh: THREE.Mesh;
  equatorSeam: THREE.Mesh;
  meridianSeam: THREE.Mesh;
  northSaddleSeam: THREE.Mesh;
  southSaddleSeam: THREE.Mesh;
  valveGroup: THREE.Group;
  applyEdition: (edition: BallEdition) => void;
  setExplodedFactor: (factor: number) => void;
  dispose: () => void;
}

class SaddleCurve extends THREE.Curve<THREE.Vector3> {
  private sign: number;
  private radius: number;

  constructor(sign: number, radius: number) {
    super();
    this.sign = sign;
    this.radius = radius;
  }

  getPoint(t: number, optionalTarget = new THREE.Vector3()): THREE.Vector3 {
    const phi = t * Math.PI * 2;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    const y = this.sign * saddleCurveY(cosPhi * cosPhi);
    const rXZ = Math.sqrt(Math.max(0, 1 - y * y));
    return optionalTarget.set(
      rXZ * cosPhi * this.radius,
      y * this.radius,
      rXZ * sinPhi * this.radius
    );
  }
}

export function createBasketballAssembly(
  initialEdition: BallEdition,
  maxAnisotropy: number
): CompositeBasketball {
  const root = new THREE.Group();
  const textureCache = new Map<string, BasketballTextureSet>();

  const getTextures = (edition: BallEdition): BasketballTextureSet => {
    const existing = textureCache.get(edition.id);
    if (existing) return existing;
    const created = createBasketballTextures(edition, maxAnisotropy);
    textureCache.set(edition.id, created);
    return created;
  };

  const initialTex = getTextures(initialEdition);

  // Part 1: Inner Butyl Rubber Carcass Core (visible inside seam channels & exploded mode)
  const carcassGeo = new THREE.SphereGeometry(0.986, 48, 48);
  const carcassMat = new THREE.MeshStandardMaterial({
    color: 0x0b0b0e,
    roughness: 0.92,
    metalness: 0.04,
  });
  const carcassMesh = new THREE.Mesh(carcassGeo, carcassMat);
  carcassMesh.castShadow = true;
  carcassMesh.receiveShadow = true;
  root.add(carcassMesh);

  // Part 2: 8-Panel Full-Grain Pebbled Leather Shell
  const shellGeo = new THREE.SphereGeometry(1.0, 128, 128);
  shellGeo.computeTangents();
  const shellMat = new THREE.MeshPhysicalMaterial({
    map: initialTex.albedoMap,
    normalMap: initialTex.normalMap,
    normalScale: new THREE.Vector2(initialEdition.normalScale, initialEdition.normalScale),
    bumpMap: initialTex.bumpMap,
    bumpScale: 0.008,
    roughnessMap: initialTex.roughnessMap,
    roughness: initialEdition.roughness,
    metalness: initialEdition.metalness,
    clearcoat: initialEdition.clearcoat,
    clearcoatRoughness: initialEdition.clearcoatRoughness,
    clearcoatNormalMap: initialTex.normalMap,
    clearcoatNormalScale: new THREE.Vector2(
      initialEdition.normalScale * 0.6,
      initialEdition.normalScale * 0.6
    ),
    reflectivity: 0.88,
    envMapIntensity: initialEdition.envMapIntensity,
    sheen: 0.28,
    sheenRoughness: 0.55,
    sheenColor: new THREE.Color(initialEdition.sheenColorHex),
    emissive: new THREE.Color(0xffffff),
    emissiveMap: initialTex.emissiveMap,
    emissiveIntensity:
      initialEdition.seamGlowMode === 'none' ? 0 : initialEdition.seamEmissiveIntensity,
  });
  const shellMesh = new THREE.Mesh(shellGeo, shellMat);
  shellMesh.castShadow = true;
  shellMesh.receiveShadow = false;
  shellMesh.layers.enable(1); // Raycastable layer
  root.add(shellMesh);

  // Shared vulcanized rubber seam material (matte rubber or neon glowing core channel)
  const seamMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialEdition.seamColorHex),
    roughness: initialEdition.seamGlowMode === 'core' ? 0.32 : 0.9,
    metalness: 0.05,
    emissive: new THREE.Color(
      initialEdition.seamGlowMode === 'core' ? initialEdition.seamEmissiveHex : 0x000000
    ),
    emissiveIntensity:
      initialEdition.seamGlowMode === 'core'
        ? initialEdition.seamEmissiveIntensity * 0.85
        : 0,
  });

  // Part 3: Equatorial Rubber Seam Rib
  const seamTubeRadius = 0.0128;
  const equatorGeo = new THREE.TorusGeometry(0.993, seamTubeRadius, 16, 160);
  equatorGeo.rotateX(Math.PI / 2);
  const equatorSeam = new THREE.Mesh(equatorGeo, seamMat);
  equatorSeam.castShadow = true;
  root.add(equatorSeam);

  // Part 4: Meridian Rubber Seam Rib
  const meridianGeo = new THREE.TorusGeometry(0.993, seamTubeRadius, 16, 160);
  meridianGeo.rotateY(Math.PI / 2);
  const meridianSeam = new THREE.Mesh(meridianGeo, seamMat);
  meridianSeam.castShadow = true;
  root.add(meridianSeam);

  // Part 5a & 5b: Symmetric North & South Curved Saddle Seam Tubes
  const northCurve = new SaddleCurve(1, 0.993);
  const northSaddleGeo = new THREE.TubeGeometry(northCurve, 192, seamTubeRadius, 16, true);
  const northSaddleSeam = new THREE.Mesh(northSaddleGeo, seamMat);
  northSaddleSeam.castShadow = true;
  root.add(northSaddleSeam);

  const southCurve = new SaddleCurve(-1, 0.993);
  const southSaddleGeo = new THREE.TubeGeometry(southCurve, 192, seamTubeRadius, 16, true);
  const southSaddleSeam = new THREE.Mesh(southSaddleGeo, seamMat);
  southSaddleSeam.castShadow = true;
  root.add(southSaddleSeam);

  // Part 6: Precision Anodized Brass Inflation Valve & Recessed Collar (seated on -Z panel)
  const valveGroup = new THREE.Group();
  const collarPoints = [
    new THREE.Vector2(0.014, 0.0),
    new THREE.Vector2(0.036, 0.0),
    new THREE.Vector2(0.036, 0.008),
    new THREE.Vector2(0.022, 0.012),
    new THREE.Vector2(0.014, 0.006),
  ];
  const collarGeo = new THREE.LatheGeometry(collarPoints, 24);
  const collarMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialEdition.valveColorHex),
    metalness: 0.92,
    roughness: 0.22,
  });
  const collarMesh = new THREE.Mesh(collarGeo, collarMat);

  const coreGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.012, 18);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x16161a,
    roughness: 0.8,
    metalness: 0.1,
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  coreMesh.position.y = 0.004;

  valveGroup.add(collarMesh, coreMesh);
  // Orient valve flush on lower-back panel (normal around [0.48, -0.32, -0.82])
  const valveDir = new THREE.Vector3(0.42, -0.22, -0.88).normalize();
  valveGroup.position.copy(valveDir).multiplyScalar(0.992);
  valveGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), valveDir);
  root.add(valveGroup);

  // Default hero presentation angle matching the reference photo
  // (meridian & curved ribs turned ~18° right and pitched gently forward)
  root.rotation.set(0.14, -0.34, 0.08);

  const applyEdition = (edition: BallEdition) => {
    const tex = getTextures(edition);
    shellMat.map = tex.albedoMap;
    shellMat.normalMap = tex.normalMap;
    shellMat.clearcoatNormalMap = tex.normalMap;
    shellMat.bumpMap = tex.bumpMap;
    shellMat.roughnessMap = tex.roughnessMap;
    shellMat.emissiveMap = tex.emissiveMap;
    shellMat.emissiveIntensity =
      edition.seamGlowMode === 'none' ? 0 : edition.seamEmissiveIntensity;
    shellMat.metalness = edition.metalness;
    shellMat.roughness = edition.roughness;
    shellMat.clearcoat = edition.clearcoat;
    shellMat.clearcoatRoughness = edition.clearcoatRoughness;
    shellMat.normalScale.set(edition.normalScale, edition.normalScale);
    shellMat.clearcoatNormalScale.set(
      edition.normalScale * 0.6,
      edition.normalScale * 0.6
    );
    shellMat.envMapIntensity = edition.envMapIntensity;
    shellMat.sheenColor.set(edition.sheenColorHex);
    shellMat.needsUpdate = true;

    seamMat.color.set(edition.seamColorHex);
    seamMat.roughness = edition.seamGlowMode === 'core' ? 0.32 : 0.9;
    if (edition.seamGlowMode === 'core') {
      seamMat.emissive.set(edition.seamEmissiveHex);
      seamMat.emissiveIntensity = edition.seamEmissiveIntensity * 0.85;
    } else {
      seamMat.emissive.setHex(0x000000);
      seamMat.emissiveIntensity = 0;
    }

    collarMat.color.set(edition.valveColorHex);
  };

  const setExplodedFactor = (factor: number) => {
    const t = THREE.MathUtils.clamp(factor, 0, 1);
    // Smoothly separate composite parts along their structural axes
    carcassMesh.scale.setScalar(1 - t * 0.26);
    shellMesh.scale.setScalar(1 + t * 0.14);
    equatorSeam.scale.setScalar(1 + t * 0.25);
    meridianSeam.scale.setScalar(1 + t * 0.28);
    northSaddleSeam.position.y = t * 0.24;
    northSaddleSeam.scale.setScalar(1 + t * 0.18);
    southSaddleSeam.position.y = -t * 0.24;
    southSaddleSeam.scale.setScalar(1 + t * 0.18);
    valveGroup.position.copy(valveDir).multiplyScalar(0.992 + t * 0.42);
  };

  const dispose = () => {
    carcassGeo.dispose();
    carcassMat.dispose();
    shellGeo.dispose();
    shellMat.dispose();
    equatorGeo.dispose();
    meridianGeo.dispose();
    northSaddleGeo.dispose();
    southSaddleGeo.dispose();
    seamMat.dispose();
    collarGeo.dispose();
    collarMat.dispose();
    coreGeo.dispose();
    coreMat.dispose();
    textureCache.forEach((set) => set.dispose());
    textureCache.clear();
  };

  return {
    root,
    shellMesh,
    carcassMesh,
    equatorSeam,
    meridianSeam,
    northSaddleSeam,
    southSaddleSeam,
    valveGroup,
    applyEdition,
    setExplodedFactor,
    dispose,
  };
}

export interface PodiumAssembly {
  root: THREE.Group;
  dispose: () => void;
}

/**
 * Builds the 4-part 3-Tier Stepped Champion Podium with brushed metallic rim
 * specular rings and soft radial contact shadow plane.
 */
export function createPodiumAssembly(): PodiumAssembly {
  const root = new THREE.Group();

  const tierMat1 = new THREE.MeshStandardMaterial({
    color: 0x09090c,
    roughness: 0.62,
    metalness: 0.28,
  });
  const tierMat2 = new THREE.MeshStandardMaterial({
    color: 0x0d0e13,
    roughness: 0.52,
    metalness: 0.36,
  });
  const tierMat3 = new THREE.MeshStandardMaterial({
    color: 0x121319,
    roughness: 0.42,
    metalness: 0.48,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    roughness: 0.2,
    metalness: 0.92,
  });

  // Part 1: Bottom Tier (Lathe profile with crisp bevel)
  const tier1Geo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0, -0.46),
      new THREE.Vector2(1.95, -0.46),
      new THREE.Vector2(1.98, -0.44),
      new THREE.Vector2(1.98, -0.3),
      new THREE.Vector2(1.94, -0.28),
      new THREE.Vector2(0, -0.28),
    ],
    64
  );
  const tier1 = new THREE.Mesh(tier1Geo, tierMat1);
  tier1.receiveShadow = true;

  // Part 2: Mid Tier
  const tier2Geo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0, -0.28),
      new THREE.Vector2(1.52, -0.28),
      new THREE.Vector2(1.55, -0.26),
      new THREE.Vector2(1.55, -0.14),
      new THREE.Vector2(1.51, -0.12),
      new THREE.Vector2(0, -0.12),
    ],
    64
  );
  const tier2 = new THREE.Mesh(tier2Geo, tierMat2);
  tier2.receiveShadow = true;

  // Part 3: Top Plinth
  const tier3Geo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0, -0.12),
      new THREE.Vector2(1.12, -0.12),
      new THREE.Vector2(1.15, -0.1),
      new THREE.Vector2(1.15, 0.0),
      new THREE.Vector2(1.11, 0.02),
      new THREE.Vector2(0, 0.02),
    ],
    64
  );
  const tier3 = new THREE.Mesh(tier3Geo, tierMat3);
  tier3.receiveShadow = true;

  // Part 4: Crisp Top-Edge Specular Rim Rings
  const rim1Geo = new THREE.TorusGeometry(1.94, 0.007, 8, 96);
  rim1Geo.rotateX(Math.PI / 2);
  const rim1 = new THREE.Mesh(rim1Geo, rimMat);
  rim1.position.y = -0.28;

  const rim2Geo = new THREE.TorusGeometry(1.51, 0.007, 8, 96);
  rim2Geo.rotateX(Math.PI / 2);
  const rim2 = new THREE.Mesh(rim2Geo, rimMat);
  rim2.position.y = -0.12;

  const rim3Geo = new THREE.TorusGeometry(1.11, 0.008, 8, 96);
  rim3Geo.rotateX(Math.PI / 2);
  const rim3 = new THREE.Mesh(rim3Geo, rimMat);
  rim3.position.y = 0.021;

  // Soft Radial Contact Shadow Plane directly atop the podium plinth (+0.023 Y to prevent Z-fighting)
  const shadowTex = createContactShadowTexture();
  const shadowGeo = new THREE.PlaneGeometry(1.85, 1.85);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.position.y = 0.024;

  root.add(tier1, tier2, tier3, rim1, rim2, rim3, shadowPlane);

  return {
    root,
    dispose: () => {
      tier1Geo.dispose();
      tier2Geo.dispose();
      tier3Geo.dispose();
      rim1Geo.dispose();
      rim2Geo.dispose();
      rim3Geo.dispose();
      shadowGeo.dispose();
      shadowTex.dispose();
      shadowMat.dispose();
      tierMat1.dispose();
      tierMat2.dispose();
      tierMat3.dispose();
      rimMat.dispose();
    },
  };
}

export interface ShardField {
  mesh: THREE.InstancedMesh;
  update: (elapsed: number, visibility: number) => void;
  dispose: () => void;
}

/**
 * InstancedMesh of 36 beveled low-poly triangular geometric shards for Section 06 (Defy Gravity).
 */
export function createShardField(): ShardField {
  const count = 36;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.16);
  shape.lineTo(-0.14, -0.11);
  shape.lineTo(0.15, -0.09);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.035,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
  });
  geo.center();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x17181d,
    roughness: 0.36,
    metalness: 0.72,
  });

  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;

  const basePositions: {
    x: number;
    y: number;
    z: number;
    rx: number;
    ry: number;
    rz: number;
    sx: number;
    speed: number;
    phase: number;
  }[] = [];

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.4;
    const radius = 1.6 + ((i * 37) % 24) * 0.13;
    const x = Math.cos(angle) * radius * 1.45;
    const y = (((i * 53) % 20) / 20 - 0.5) * 3.8;
    const z = (((i * 29) % 14) / 14 - 0.5) * 3.6 - 0.3;

    basePositions.push({
      x,
      y,
      z,
      rx: (i * 0.7) % Math.PI,
      ry: (i * 1.1) % Math.PI,
      rz: (i * 0.4) % Math.PI,
      sx: 0.55 + ((i * 19) % 10) * 0.095,
      speed: 0.35 + ((i * 13) % 7) * 0.09,
      phase: i * 0.62,
    });

    // Subtle monochrome obsidian & dark vermilion rim shard variation
    if (i % 7 === 0) {
      color.setHex(0xf13507);
    } else {
      const lum = 0.08 + ((i * 17) % 10) * 0.018;
      color.setRGB(lum, lum, lum * 1.08);
    }
    mesh.setColorAt(i, color);
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  const update = (elapsed: number, visibility: number) => {
    const v = THREE.MathUtils.clamp(visibility, 0, 1);
    mesh.visible = v > 0.01;
    if (!mesh.visible) return;

    for (let i = 0; i < count; i++) {
      const b = basePositions[i];
      const floatY = Math.sin(elapsed * b.speed + b.phase) * 0.18;
      const slideY = (1 - v) * -3.5;

      dummy.position.set(b.x, b.y + floatY + slideY, b.z);
      dummy.rotation.set(
        b.rx + elapsed * b.speed * 0.45,
        b.ry + elapsed * b.speed * 0.65,
        b.rz + elapsed * b.speed * 0.25
      );
      dummy.scale.setScalar(b.sx * v);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  return {
    mesh,
    update,
    dispose: () => {
      geo.dispose();
      mat.dispose();
    },
  };
}
