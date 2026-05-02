import * as THREE from 'three';
import { marchingCubes, type MarchingCubesBounds } from '../math/marchingCubes';

/**
 * In math convention: x horizontal, y horizontal (depth), z vertical.
 * In Three.js (Y-up) world: world Y = math z, world Z = math y.
 * marchingCubes returns vertices in math (x, y, z); we swap when copying
 * into the GPU buffer.
 */
export function buildImplicitSurfaceMesh(
  evaluate: (scope: Record<string, number>) => number,
  sliderScope: Record<string, number>,
  bounds: MarchingCubesBounds,
  resolution: number,
  color: string,
): THREE.Mesh | null {
  const { positions: mathPos, indices } = marchingCubes(evaluate, sliderScope, bounds, resolution);
  if (indices.length === 0) return null;

  const worldPos = new Float32Array(mathPos.length);
  for (let i = 0; i < mathPos.length; i += 3) {
    worldPos[i] = mathPos[i];           // x
    worldPos[i + 1] = mathPos[i + 2];   // math z -> world Y
    worldPos[i + 2] = mathPos[i + 1];   // math y -> world Z
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(worldPos, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
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

export const DEFAULT_IMPLICIT_BOUNDS: MarchingCubesBounds = {
  xMin: -5, xMax: 5,
  yMin: -5, yMax: 5,
  zMin: -5, zMax: 5,
};

export const DEFAULT_IMPLICIT_RESOLUTION = 48;
