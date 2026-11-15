import * as THREE from 'three';
import type { BallEdition } from '../data/editions';

export interface BasketballTextureSet {
  albedoMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
  dispose: () => void;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function hash2(a: number, b: number): number {
  let n = Math.imul(a, 374761393) + Math.imul(b, 668265263);
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function hash3(x: number, y: number, z: number): number {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 2147483647);
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function smoothNoise3D(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;

  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);

  const c000 = hash3(ix, iy, iz);
  const c100 = hash3(ix + 1, iy, iz);
  const c010 = hash3(ix, iy + 1, iz);
  const c110 = hash3(ix + 1, iy + 1, iz);
  const c001 = hash3(ix, iy, iz + 1);
  const c101 = hash3(ix + 1, iy, iz + 1);
  const c011 = hash3(ix, iy + 1, iz + 1);
  const c111 = hash3(ix + 1, iy + 1, iz + 1);

  const x00 = c000 + (c100 - c000) * ux;
  const x10 = c010 + (c110 - c010) * ux;
  const x01 = c001 + (c101 - c001) * ux;
  const x11 = c011 + (c111 - c011) * ux;

  const y0 = x00 + (x10 - x00) * uy;
  const y1 = x01 + (x11 - x01) * uy;

  return y0 + (y1 - y0) * uz;
}

/**
 * Computes exact analytical distance on the unit sphere to the 4 regulation
 * basketball channels (equator, meridian, north saddle, south saddle).
 */
export function saddleCurveY(cosAzimuthSq: number): number {
  return 0.26 + 0.36 * cosAzimuthSq;
}

export function computeSeamDistance(nx: number, ny: number, nz: number): number {
  const dEquator = Math.abs(ny);
  const dMeridian = Math.abs(nx);
  const xzSq = nx * nx + nz * nz;
  const cosAzSq = xzSq > 1e-6 ? (nx * nx) / xzSq : 0;
  const yCurve = saddleCurveY(cosAzSq);
  const slopeFactor = Math.sqrt(1 + 0.52 * cosAzSq * (1 - cosAzSq));
  const dSaddle = Math.abs(Math.abs(ny) - yCurve) / slopeFactor;
  return Math.min(dEquator, dMeridian, dSaddle);
}

/**
 * Generates high-resolution 2048x1024 synchronized procedural albedo (sRGB),
 * tangent-space normalMap (linear), bumpMap (linear), roughnessMap (linear),
 * and emissiveMap (sRGB) tailored to each edition's surface & channel finish.
 */
export function createBasketballTextures(
  edition: BallEdition,
  maxAnisotropy: number
): BasketballTextureSet {
  const width = 2048;
  const height = 1024;
  const totalPixels = width * height;

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = width;
  albedoCanvas.height = height;
  const albedoCtx = albedoCanvas.getContext('2d')!;

  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = width;
  normalCanvas.height = height;
  const normalCtx = normalCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bumpCtx = bumpCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = width;
  roughCanvas.height = height;
  const roughCtx = roughCanvas.getContext('2d')!;

  const emissiveCanvas = document.createElement('canvas');
  emissiveCanvas.width = width;
  emissiveCanvas.height = height;
  const emissiveCtx = emissiveCanvas.getContext('2d')!;

  const albedoImg = albedoCtx.createImageData(width, height);
  const normalImg = normalCtx.createImageData(width, height);
  const bumpImg = bumpCtx.createImageData(width, height);
  const roughImg = roughCtx.createImageData(width, height);
  const emissiveImg = emissiveCtx.createImageData(width, height);

  const aData = albedoImg.data;
  const nData = normalImg.data;
  const bData = bumpImg.data;
  const rData = roughImg.data;
  const eData = emissiveImg.data;

  const heightBuffer = new Float32Array(totalPixels);

  const [baseR, baseG, baseB] = hexToRgb(edition.leatherBaseHex);
  const [hiR, hiG, hiB] = hexToRgb(edition.leatherHighlightHex);
  const [seamR, seamG, seamB] = hexToRgb(edition.seamColorHex);
  const [emR, emG, emB] = hexToRgb(edition.seamEmissiveHex);

  const pebbleIntensity = edition.pebbleIntensity;
  const isSmoothMetallic = edition.metalness > 0.45 || pebbleIntensity < 0.4;
  const isBrightOrange = edition.id === 'classic-orange';
  const glowMode = edition.seamGlowMode;

  const numRows = 160;
  const rowCols = new Int32Array(numRows + 2);
  for (let r = 0; r <= numRows + 1; r++) {
    const v = Math.min(1, Math.max(0, r / numRows));
    const lat = (0.5 - v) * Math.PI;
    rowCols[r] = Math.max(10, Math.round(320 * Math.max(0.08, Math.cos(lat))));
  }

  const pebbleRadius = (Math.PI / numRows) * 0.44;
  const invPebbleRadius = 1 / pebbleRadius;

  for (let py = 0; py < height; py++) {
    const v = 1 - (py + 0.5) / height;
    const lat = (v - 0.5) * Math.PI;
    const theta = (1 - v) * Math.PI;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);
    const cosLat = Math.max(0.06, Math.cos(lat));
    const rowFloat = v * numRows;
    const baseRow = Math.floor(rowFloat);

    for (let px = 0; px < width; px++) {
      const u = (px + 0.5) / width;
      const phi = u * Math.PI * 2;

      const nx = -Math.cos(phi) * sinTheta;
      const ny = cosTheta;
      const nz = Math.sin(phi) * sinTheta;

      // 1. Isotropic spherical pebble lookup (scaled by pebbleIntensity)
      let pebbleDome = 0.5;
      let cellVariation = 0.5;
      if (pebbleIntensity > 0.1) {
        let minDistSq = 100.0;

        for (let dr = -1; dr <= 1; dr++) {
          const rr = Math.min(numRows - 1, Math.max(0, baseRow + dr));
          const cols = rowCols[rr];
          const centerCol = Math.floor(u * cols);

          for (let dc = -1; dc <= 1; dc++) {
            const cc = ((centerCol + dc) % cols + cols) % cols;
            const h1 = hash2(rr * 997 + cc, 17);
            const h2 = hash2(rr * 997 + cc, 53);

            const cV = (rr + 0.2 + h1 * 0.6) / numRows;
            const cU = (cc + 0.2 + h2 * 0.6) / cols;

            let du = u - cU;
            if (du > 0.5) du -= 1;
            else if (du < -0.5) du += 1;

            const dv = v - cV;
            const dx = du * 2 * Math.PI * cosLat;
            const dy = dv * Math.PI;
            const distSq = dx * dx + dy * dy;

            if (distSq < minDistSq) {
              minDistSq = distSq;
              cellVariation = hash2(rr * 131 + cc, 91);
            }
          }
        }

        const distNorm = Math.min(1.0, Math.sqrt(minDistSq) * invPebbleRadius);
        const dome = Math.max(0, 1 - distNorm * distNorm);
        pebbleDome = dome * (0.58 + 0.42 * dome) * (0.84 + cellVariation * 0.16);
      }

      // 2. Multi-scale natural grain / metallic brushed patina noise
      const macroPatina = smoothNoise3D(nx * 5.2 + 11.3, ny * 5.2 - 4.7, nz * 5.2 + 8.1);
      const midGrain = smoothNoise3D(nx * 28.0 - 3.1, ny * 28.0 + 7.4, nz * 28.0 - 2.9);
      const microPore = hash2(px * 73856093 ^ py, py * 19349663) - 0.5;

      const rawHeight =
        0.5 * (1 - pebbleIntensity) +
        pebbleDome * pebbleIntensity +
        (midGrain - 0.5) * (0.14 * pebbleIntensity + 0.03) +
        microPore * (0.08 * pebbleIntensity + 0.02);
      const combinedHeight = Math.max(0, Math.min(1, rawHeight));

      // 3. Analytical seam channel mask
      const seamDist = computeSeamDistance(nx, ny, nz);
      let seamMask = 0;
      if (seamDist < 0.0145) {
        seamMask = 1;
      } else if (seamDist < 0.0255) {
        const t = (seamDist - 0.0145) / (0.0255 - 0.0145);
        seamMask = 1 - t * t * (3 - 2 * t);
      }

      const rimMask =
        seamDist >= 0.021 && seamDist < 0.036
          ? Math.sin(((seamDist - 0.021) / 0.015) * Math.PI) * 0.25
          : 0;

      // Albedo color blending
      const valleyAO = isBrightOrange
        ? 0.96 + macroPatina * 0.06
        : isSmoothMetallic
          ? 0.85 + macroPatina * 0.25
          : 0.65 + combinedHeight * 0.4;
      const patinaMod = isBrightOrange
        ? 0.97 + macroPatina * 0.05 + (midGrain - 0.5) * 0.02
        : 0.9 +
          macroPatina * 0.2 +
          (midGrain - 0.5) * (0.08 * pebbleIntensity + 0.03) +
          microPore * (0.05 * pebbleIntensity + 0.02);
      const totalShade = valleyAO * patinaMod;

      const crownMix = isSmoothMetallic ? macroPatina * 0.65 : combinedHeight * 0.45;
      const lr = Math.min(255, (baseR * (1 - crownMix) + hiR * crownMix) * totalShade);
      const lg = Math.min(255, (baseG * (1 - crownMix) + hiG * crownMix) * totalShade);
      const lb = Math.min(255, (baseB * (1 - crownMix) + hiB * crownMix) * totalShade);

      const seamNoise =
        glowMode === 'core' ? 1.0 : 0.88 + microPore * 0.16 + (midGrain - 0.5) * 0.1;
      const sr = Math.max(0, Math.min(255, seamR * seamNoise));
      const sg = Math.max(0, Math.min(255, seamG * seamNoise));
      const sb = Math.max(0, Math.min(255, seamB * seamNoise));

      const finalR = lr * (1 - seamMask) + sr * seamMask;
      const finalG = lg * (1 - seamMask) + sg * seamMask;
      const finalB = lb * (1 - seamMask) + sb * seamMask;

      const pIndex = py * width + px;
      const idx = pIndex * 4;

      aData[idx] = finalR;
      aData[idx + 1] = finalG;
      aData[idx + 2] = finalB;
      aData[idx + 3] = 255;

      // Emissive channel map
      let glowFactor = 0;
      if (glowMode === 'core') {
        // Intense neon line in seam center + soft halo bleed on groove edges
        if (seamDist < 0.014) {
          glowFactor = 1.0;
        } else if (seamDist < 0.034) {
          const gt = 1 - (seamDist - 0.014) / 0.02;
          glowFactor = gt * gt * 0.72;
        }
      } else if (glowMode === 'outline') {
        // Dark recessed center, outlined with subtle crimson lighting along groove lips
        if (seamDist >= 0.013 && seamDist < 0.027) {
          const ot = Math.sin(((seamDist - 0.013) / 0.014) * Math.PI);
          glowFactor = ot * 0.85;
        }
      }

      eData[idx] = Math.round(emR * glowFactor);
      eData[idx + 1] = Math.round(emG * glowFactor);
      eData[idx + 2] = Math.round(emB * glowFactor);
      eData[idx + 3] = 255;

      // Normalized height value [0..1]
      const hVal = Math.max(
        0,
        Math.min(
          1,
          (0.28 + combinedHeight * 0.64 + rimMask * 0.15) * (1 - seamMask) + 0.04 * seamMask
        )
      );
      heightBuffer[pIndex] = hVal;

      const finalBump = Math.round(hVal * 255);
      bData[idx] = finalBump;
      bData[idx + 1] = finalBump;
      bData[idx + 2] = finalBump;
      bData[idx + 3] = 255;

      // Roughness map: tailored to smooth metallic vs semi-matte/satin leather
      let finalRough = 200;
      if (isSmoothMetallic) {
        const smoothVar = 185 + (macroPatina - 0.5) * 45 + microPore * 18;
        finalRough = Math.max(110, Math.min(245, smoothVar * (1 - seamMask) + 70 * seamMask));
      } else {
        const leatherRough =
          228 - combinedHeight * 62 * pebbleIntensity + microPore * 14 + (macroPatina - 0.5) * 16;
        finalRough = Math.max(
          95,
          Math.min(255, leatherRough * (1 - seamMask) + 238 * seamMask)
        );
      }
      rData[idx] = finalRough;
      rData[idx + 1] = finalRough;
      rData[idx + 2] = finalRough;
      rData[idx + 3] = 255;
    }
  }

  // 4. Compute tangent-space normal map from heightBuffer
  const normalStrength = 4.6 * (0.25 + 0.75 * pebbleIntensity);
  for (let py = 0; py < height; py++) {
    const pyUp = py > 0 ? py - 1 : 0;
    const pyDn = py < height - 1 ? py + 1 : height - 1;
    const rowOff = py * width;
    const upOff = pyUp * width;
    const dnOff = pyDn * width;

    const theta = ((py + 0.5) / height) * Math.PI;
    const sinTheta = Math.max(0.18, Math.sin(theta));

    for (let px = 0; px < width; px++) {
      const pxL = px > 0 ? px - 1 : width - 1;
      const pxR = px < width - 1 ? px + 1 : 0;

      const dx =
        ((heightBuffer[rowOff + pxR] - heightBuffer[rowOff + pxL]) * normalStrength) / sinTheta;
      const dy = (heightBuffer[dnOff + px] - heightBuffer[upOff + px]) * normalStrength;

      const nx = -dx;
      const ny = dy;
      const nz = 1.0;
      const invLen = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);

      const idx = (rowOff + px) * 4;
      nData[idx] = Math.round((nx * invLen * 0.5 + 0.5) * 255);
      nData[idx + 1] = Math.round((ny * invLen * 0.5 + 0.5) * 255);
      nData[idx + 2] = Math.round((nz * invLen * 0.5 + 0.5) * 255);
      nData[idx + 3] = 255;
    }
  }

  albedoCtx.putImageData(albedoImg, 0, 0);
  normalCtx.putImageData(normalImg, 0, 0);
  bumpCtx.putImageData(bumpImg, 0, 0);
  roughCtx.putImageData(roughImg, 0, 0);
  emissiveCtx.putImageData(emissiveImg, 0, 0);

  // Crisp debossed foil micro-branding scaled to 2048x1024
  const drawStamp = (cx: number, cy: number, title: string, sub: string) => {
    albedoCtx.save();
    albedoCtx.translate(cx, cy);
    albedoCtx.fillStyle = edition.stampColorHex;
    albedoCtx.globalAlpha = glowMode === 'core' ? 0.9 : 0.78;
    albedoCtx.textAlign = 'center';
    albedoCtx.font = '700 36px "Barlow Condensed", sans-serif';
    albedoCtx.fillText(title, 0, 0);
    albedoCtx.font = '500 16px "JetBrains Mono", monospace';
    albedoCtx.globalAlpha = glowMode === 'core' ? 0.75 : 0.62;
    albedoCtx.fillText(sub, 0, 24);
    albedoCtx.restore();

    if (glowMode === 'core') {
      emissiveCtx.save();
      emissiveCtx.translate(cx, cy);
      emissiveCtx.fillStyle = edition.seamEmissiveHex;
      emissiveCtx.globalAlpha = 0.55;
      emissiveCtx.textAlign = 'center';
      emissiveCtx.font = '700 36px "Barlow Condensed", sans-serif';
      emissiveCtx.fillText(title, 0, 0);
      emissiveCtx.restore();
    }

    roughCtx.save();
    roughCtx.translate(cx, cy);
    roughCtx.fillStyle = 'rgb(88,88,88)';
    roughCtx.textAlign = 'center';
    roughCtx.font = '700 36px "Barlow Condensed", sans-serif';
    roughCtx.fillText(title, 0, 0);
    roughCtx.restore();
  };

  drawStamp(width * 0.33, height * 0.43, edition.watermark, '29.5" OFFICIAL');
  drawStamp(width * 0.17, height * 0.58, 'SLAM DUNK', '8.0 PSI · PRO');

  const albedoMap = new THREE.CanvasTexture(albedoCanvas);
  albedoMap.colorSpace = THREE.SRGBColorSpace;
  albedoMap.anisotropy = maxAnisotropy;
  albedoMap.wrapS = THREE.RepeatWrapping;
  albedoMap.wrapT = THREE.ClampToEdgeWrapping;
  albedoMap.needsUpdate = true;

  const normalMap = new THREE.CanvasTexture(normalCanvas);
  normalMap.anisotropy = maxAnisotropy;
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.ClampToEdgeWrapping;
  normalMap.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.anisotropy = maxAnisotropy;
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.ClampToEdgeWrapping;
  bumpMap.needsUpdate = true;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.anisotropy = maxAnisotropy;
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.ClampToEdgeWrapping;
  roughnessMap.needsUpdate = true;

  const emissiveMap = new THREE.CanvasTexture(emissiveCanvas);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.anisotropy = maxAnisotropy;
  emissiveMap.wrapS = THREE.RepeatWrapping;
  emissiveMap.wrapT = THREE.ClampToEdgeWrapping;
  emissiveMap.needsUpdate = true;

  return {
    albedoMap,
    normalMap,
    bumpMap,
    roughnessMap,
    emissiveMap,
    dispose: () => {
      albedoMap.dispose();
      normalMap.dispose();
      bumpMap.dispose();
      roughnessMap.dispose();
      emissiveMap.dispose();
    },
  };
}

/**
 * Generates a soft radial alpha shadow texture for grounding contact shadows.
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.04,
    size / 2,
    size / 2,
    size * 0.5
  );
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
  grad.addColorStop(0.45, 'rgba(0, 0, 0, 0.42)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
