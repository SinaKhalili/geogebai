import * as THREE from 'three';

const RANGE = 5;
const SEGMENTS = 64;

/**
 * Build a height-field mesh for z = f(x, y) over [-RANGE, RANGE]^2.
 * Vertices where f returns NaN/Infinity are flagged so adjacent triangles are dropped.
 */
export function buildSurfaceMesh(
  evaluate: (scope: Record<string, number>) => number,
  sliderScope: Record<string, number>,
  color: string,
): THREE.Mesh {
  const verts = SEGMENTS + 1;
  const positions = new Float32Array(verts * verts * 3);
  const valid = new Uint8Array(verts * verts);

  for (let j = 0; j < verts; j++) {
    const y = -RANGE + (2 * RANGE * j) / SEGMENTS;
    for (let i = 0; i < verts; i++) {
      const x = -RANGE + (2 * RANGE * i) / SEGMENTS;
      let z: number;
      try {
        z = evaluate({ ...sliderScope, x, y });
      } catch {
        z = NaN;
      }
      const ok = Number.isFinite(z);
      const idx = j * verts + i;
      positions[idx * 3 + 0] = x;
      positions[idx * 3 + 1] = ok ? z : 0;
      positions[idx * 3 + 2] = y;
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
