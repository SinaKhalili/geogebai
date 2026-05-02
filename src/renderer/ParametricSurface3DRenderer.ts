import * as THREE from 'three';
import type { Parametric3DEvaluator } from '../math/types';

const U_MIN = 0;
const U_MAX = 2 * Math.PI;
const V_MIN = 0;
const V_MAX = Math.PI;
const SEGMENTS = 64;

/**
 * Build a triangulated mesh for (fx(u, v), fy(u, v), fz(u, v)).
 * Math (x, y, z) -> world (x, z, y). NaN/Infinity vertices drop their triangles.
 */
export function buildParametricSurfaceMesh(
  evaluator: Parametric3DEvaluator,
  sliderScope: Record<string, number>,
  color: string,
): THREE.Mesh | null {
  const verts = SEGMENTS + 1;
  const positions = new Float32Array(verts * verts * 3);
  const valid = new Uint8Array(verts * verts);

  for (let j = 0; j < verts; j++) {
    const v = V_MIN + ((V_MAX - V_MIN) * j) / SEGMENTS;
    for (let i = 0; i < verts; i++) {
      const u = U_MIN + ((U_MAX - U_MIN) * i) / SEGMENTS;
      let x: number, y: number, z: number;
      try {
        const scope = { ...sliderScope, u, v };
        x = evaluator.fx(scope);
        y = evaluator.fy(scope);
        z = evaluator.fz(scope);
      } catch {
        x = NaN; y = NaN; z = NaN;
      }
      const ok = Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z);
      const idx = j * verts + i;
      // math (x, y, z) -> world (x, z, y)
      positions[idx * 3 + 0] = ok ? x : 0;
      positions[idx * 3 + 1] = ok ? z : 0;
      positions[idx * 3 + 2] = ok ? y : 0;
      valid[idx] = ok ? 1 : 0;
    }
  }

  const indices: number[] = [];
  for (let j = 0; j < SEGMENTS; j++) {
    for (let i = 0; i < SEGMENTS; i++) {
      const a = j * verts + i;
      const b = j * verts + i + 1;
      const c = (j + 1) * verts + i;
      const d = (j + 1) * verts + i + 1;
      if (valid[a] && valid[b] && valid[c]) indices.push(a, c, b);
      if (valid[b] && valid[c] && valid[d]) indices.push(b, c, d);
    }
  }

  if (indices.length === 0) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    side: THREE.DoubleSide,
    metalness: 0.1,
    roughness: 0.6,
    flatShading: false,
  });

  return new THREE.Mesh(geometry, material);
}
