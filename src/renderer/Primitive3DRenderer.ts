import * as THREE from 'three';
import type { Primitive3D } from '../math/types';

export function buildPrimitiveMesh(primitive: Primitive3D, color: string): THREE.Mesh {
  let geometry: THREE.BufferGeometry;

  if (primitive.kind === 'sphere') {
    geometry = new THREE.SphereGeometry(primitive.r, 48, 32);
  } else {
    // cylinder: aligned with y axis, height h
    geometry = new THREE.CylinderGeometry(primitive.r, primitive.r, primitive.h, 48);
  }

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    metalness: 0.1,
    roughness: 0.6,
  });

  return new THREE.Mesh(geometry, material);
}
