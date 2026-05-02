import * as THREE from 'three';
import type { ExpressionEntry } from '../math/types';
import { buildSurfaceMesh } from './Surface3DRenderer';
import { buildPrimitiveMesh } from './Primitive3DRenderer';
import {
  buildImplicitSurfaceMesh,
  DEFAULT_IMPLICIT_BOUNDS,
  DEFAULT_IMPLICIT_RESOLUTION,
} from './ImplicitSurface3DRenderer';
import { buildAxisLabels } from './AxisLabels3D';

interface CameraState {
  theta: number;
  phi: number;
  distance: number;
  target: { x: number; y: number; z: number };
}

/**
 * Three.js owns Y-up. Math convention here: x horizontal, y horizontal (depth),
 * z vertical. So we map math-(x, y, z) -> world-(x, z, y) when placing axes
 * and reading camera target. Surface meshes already encode this mapping in their
 * vertex layout (see Surface3DRenderer).
 */
export class RenderEngine3D {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  private readonly plotGroup: THREE.Group;
  private readonly meshCache = new Map<string, { sig: string; mesh: THREE.Mesh }>();

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf7f7f9);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);

    // Lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 7);
    this.scene.add(dir);

    // Axes + ground grid + tick labels (math z = vertical)
    this.scene.add(this.buildAxes(6));
    this.scene.add(buildAxisLabels(5));
    const grid = new THREE.GridHelper(20, 20, 0xbbbbbb, 0xe4e4e4);
    grid.position.y = 0;
    this.scene.add(grid);

    this.plotGroup = new THREE.Group();
    this.scene.add(this.plotGroup);
  }

  setSize(widthCss: number, heightCss: number): void {
    this.renderer.setSize(widthCss, heightCss, false);
    this.camera.aspect = widthCss / Math.max(1, heightCss);
    this.camera.updateProjectionMatrix();
  }

  applyCamera(state: CameraState): void {
    const { theta, phi, distance, target } = state;
    // Spherical -> world (Y-up). phi is measured from +Y.
    const tx = target.x;
    const ty = target.z; // math z is vertical -> world Y
    const tz = target.y; // math y -> world Z
    const sinPhi = Math.sin(phi);
    this.camera.position.set(
      tx + distance * sinPhi * Math.cos(theta),
      ty + distance * Math.cos(phi),
      tz + distance * sinPhi * Math.sin(theta),
    );
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(tx, ty, tz);
  }

  refresh(expressions: ExpressionEntry[], sliderScope: Record<string, number>): void {
    this.refreshMeshes(expressions, sliderScope);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  get plotMeshCount(): number {
    return this.meshCache.size;
  }

  /**
   * Compute camera fit for the current plot meshes. Returns null if no meshes.
   * Returned target is in math coords; distance is the orbit radius such that
   * the bounding sphere fits within the camera frustum.
   */
  computeFit(): { target: { x: number; y: number; z: number }; distance: number } | null {
    if (this.meshCache.size === 0) return null;
    const bbox = new THREE.Box3();
    for (const { mesh } of this.meshCache.values()) {
      const meshBox = new THREE.Box3().setFromObject(mesh);
      if (!meshBox.isEmpty()) bbox.union(meshBox);
    }
    if (bbox.isEmpty()) return null;

    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());
    const radius = Math.max(size.length() / 2, 0.5);
    const fovRad = (this.camera.fov * Math.PI) / 180;
    const aspect = this.camera.aspect || 1;
    const minFovScale = Math.min(1, aspect);
    const distance = (radius / Math.sin(fovRad / 2)) / minFovScale * 1.4;

    // World -> math: math.x = world.x; math.y = world.z; math.z = world.y
    return {
      target: { x: center.x, y: center.z, z: center.y },
      distance,
    };
  }

  dispose(): void {
    for (const { mesh } of this.meshCache.values()) {
      this.disposeMesh(mesh);
    }
    this.meshCache.clear();
    this.renderer.dispose();
  }

  private refreshMeshes(expressions: ExpressionEntry[], sliderScope: Record<string, number>): void {
    const seen = new Set<string>();

    for (const entry of expressions) {
      if (!entry.visible) continue;
      const { parsed } = entry;
      if (
        parsed.type !== 'explicit3d' &&
        parsed.type !== 'primitive3d' &&
        parsed.type !== 'implicit3d'
      ) continue;

      const sig = this.signature(entry, sliderScope);
      const cached = this.meshCache.get(entry.id);
      seen.add(entry.id);

      if (cached && cached.sig === sig) continue;

      if (cached) {
        this.plotGroup.remove(cached.mesh);
        this.disposeMesh(cached.mesh);
      }

      const mesh = this.buildMesh(entry, sliderScope);
      if (!mesh) continue;
      this.plotGroup.add(mesh);
      this.meshCache.set(entry.id, { sig, mesh });
    }

    // Remove meshes for entries that are gone or no longer 3D
    for (const id of Array.from(this.meshCache.keys())) {
      if (!seen.has(id)) {
        const cached = this.meshCache.get(id)!;
        this.plotGroup.remove(cached.mesh);
        this.disposeMesh(cached.mesh);
        this.meshCache.delete(id);
      }
    }
  }

  private signature(entry: ExpressionEntry, sliderScope: Record<string, number>): string {
    const { parsed } = entry;
    if (parsed.type === 'primitive3d') {
      return `prim:${entry.color}:${JSON.stringify(parsed.primitive)}`;
    }
    // explicit3d / implicit3d depend on raw + color + slider values
    const sliderPart = parsed.freeVariables
      .map((name) => `${name}=${sliderScope[name] ?? 0}`)
      .join(',');
    return `${parsed.type}:${entry.color}:${entry.raw}:${sliderPart}`;
  }

  private buildMesh(entry: ExpressionEntry, sliderScope: Record<string, number>): THREE.Mesh | null {
    const { parsed, color } = entry;
    if (parsed.type === 'primitive3d' && parsed.primitive) {
      return buildPrimitiveMesh(parsed.primitive, color);
    }
    if (parsed.type === 'explicit3d' && parsed.evaluator) {
      try {
        return buildSurfaceMesh(parsed.evaluator, sliderScope, color);
      } catch {
        return null;
      }
    }
    if (parsed.type === 'implicit3d' && parsed.evaluator) {
      try {
        return buildImplicitSurfaceMesh(
          parsed.evaluator,
          sliderScope,
          DEFAULT_IMPLICIT_BOUNDS,
          DEFAULT_IMPLICIT_RESOLUTION,
          color,
        );
      } catch {
        return null;
      }
    }
    return null;
  }

  private disposeMesh(mesh: THREE.Mesh): void {
    mesh.geometry.dispose();
    const m = mesh.material;
    if (Array.isArray(m)) {
      for (const mat of m) mat.dispose();
    } else {
      m.dispose();
    }
  }

  private buildAxes(length: number): THREE.Group {
    const group = new THREE.Group();
    // World X (red) = math x
    group.add(this.makeAxisLine(new THREE.Vector3(-length, 0, 0), new THREE.Vector3(length, 0, 0), 0xd11d2c));
    // World Z (green) = math y
    group.add(this.makeAxisLine(new THREE.Vector3(0, 0, -length), new THREE.Vector3(0, 0, length), 0x2a7d2a));
    // World Y (blue) = math z (vertical)
    group.add(this.makeAxisLine(new THREE.Vector3(0, -length, 0), new THREE.Vector3(0, length, 0), 0x1f5fcc));
    return group;
  }

  private makeAxisLine(from: THREE.Vector3, to: THREE.Vector3, color: number): THREE.Line {
    const geom = new THREE.BufferGeometry().setFromPoints([from, to]);
    const mat = new THREE.LineBasicMaterial({ color });
    return new THREE.Line(geom, mat);
  }
}
