import * as THREE from 'three';
import type { Parametric3DEvaluator } from '../math/types';

const T_MIN = -4 * Math.PI;
const T_MAX = 4 * Math.PI;
const SAMPLES = 2000;

/**
 * Build a polyline for (fx(t), fy(t), fz(t)) sampled over t in [T_MIN, T_MAX].
 * Math (x, y, z) -> world (x, z, y). NaN/Infinity samples break the line.
 */
export function buildParametricCurveMesh(
  evaluator: Parametric3DEvaluator,
  sliderScope: Record<string, number>,
  color: string,
): THREE.LineSegments | null {
  const positions: number[] = [];
  let prev: { x: number; y: number; z: number } | null = null;

  for (let i = 0; i < SAMPLES; i++) {
    const t = T_MIN + ((T_MAX - T_MIN) * i) / (SAMPLES - 1);
    const scope = { ...sliderScope, t };
    let x: number, y: number, z: number;
    try {
      x = evaluator.fx(scope);
      y = evaluator.fy(scope);
      z = evaluator.fz(scope);
    } catch {
      prev = null;
      continue;
    }
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      prev = null;
      continue;
    }
    const cur = { x, y, z };
    if (prev) {
      // Emit segment as two endpoints (LineSegments uses pairs)
      positions.push(prev.x, prev.z, prev.y); // math y -> world Z, math z -> world Y
      positions.push(cur.x, cur.z, cur.y);
    }
    prev = cur;
  }

  if (positions.length === 0) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));

  const material = new THREE.LineBasicMaterial({ color: new THREE.Color(color), linewidth: 2 });
  return new THREE.LineSegments(geometry, material);
}
