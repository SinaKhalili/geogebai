import * as THREE from 'three';
import type { ExpressionEntry } from '../math/types';
import { buildSurfaceMesh } from './Surface3DRenderer';
import { buildPrimitiveMesh } from './Primitive3DRenderer';
import {
  buildImplicitSurfaceMesh,
  DEFAULT_IMPLICIT_BOUNDS,
  DEFAULT_IMPLICIT_RESOLUTION,
} from './ImplicitSurface3DRenderer';
import { buildParametricCurveMesh } from './ParametricCurve3DRenderer';
import { buildParametricSurfaceMesh } from './ParametricSurface3DRenderer';
import { buildAxisLabels } from './AxisLabels3D';

interface CameraState {
  theta: number;
  phi: number;
  distance: number;
  target: { x: number; y: number; z: number };
}

export interface Appearance3DState {
  wireframe: boolean;
  opacity: number;
}

type PlotObject = THREE.Mesh | THREE.LineSegments;

const PLOT_TYPES = new Set([
  'explicit3d',
  'primitive3d',
  'implicit3d',
  'parametric_curve3d',
  'parametric_surface3d',
]);

/**
 * Three.js owns Y-up. Math convention here: x horizontal, y horizontal (depth),
 * z vertical. So we map math-(x, y, z) -> world-(x, z, y) when placing axes
 * and reading camera target. Surface meshes already encode this mapping in their
 * vertex layout.
 */
export class RenderEngine3D {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  private readonly plotGroup: THREE.Group;
  private readonly plotCache = new Map<string, { sig: string; obj: PlotObject }>();

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
    const tx = target.x;
    const ty = target.z;
    const tz = target.y;
    const sinPhi = Math.sin(phi);
    this.camera.position.set(
      tx + distance * sinPhi * Math.cos(theta),
      ty + distance * Math.cos(phi),
      tz + distance * sinPhi * Math.sin(theta),
    );
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(tx, ty, tz);
  }

  applyAppearance(state: Appearance3DState): void {
    const transparent = state.opacity < 1;
    for (const { obj } of this.plotCache.values()) {
      const mat = obj.material;
      const apply = (m: THREE.Material) => {
        m.transparent = transparent;
        m.opacity = state.opacity;
        if ('wireframe' in m) {
          (m as THREE.MeshStandardMaterial).wireframe = state.wireframe;
        }
        m.needsUpdate = true;
      };
      if (Array.isArray(mat)) mat.forEach(apply);
      else apply(mat);
    }
  }

  refresh(expressions: ExpressionEntry[], sliderScope: Record<string, number>): void {
    const seen = new Set<string>();

    for (const entry of expressions) {
      if (!entry.visible) continue;
      const { parsed } = entry;
      if (!PLOT_TYPES.has(parsed.type)) continue;

      const sig = this.signature(entry, sliderScope);
      const cached = this.plotCache.get(entry.id);
      seen.add(entry.id);

      if (cached && cached.sig === sig) continue;

      if (cached) {
        this.plotGroup.remove(cached.obj);
        this.disposeObject(cached.obj);
      }

      const obj = this.buildPlot(entry, sliderScope);
      if (!obj) continue;
      this.plotGroup.add(obj);
      this.plotCache.set(entry.id, { sig, obj });
    }

    for (const id of Array.from(this.plotCache.keys())) {
      if (!seen.has(id)) {
        const cached = this.plotCache.get(id)!;
        this.plotGroup.remove(cached.obj);
        this.disposeObject(cached.obj);
        this.plotCache.delete(id);
      }
    }
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  get plotMeshCount(): number {
    return this.plotCache.size;
  }

  computeFit(): { target: { x: number; y: number; z: number }; distance: number } | null {
    if (this.plotCache.size === 0) return null;
    const bbox = new THREE.Box3();
    for (const { obj } of this.plotCache.values()) {
      const objBox = new THREE.Box3().setFromObject(obj);
      if (!objBox.isEmpty()) bbox.union(objBox);
    }
    if (bbox.isEmpty()) return null;

    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());
    const radius = Math.max(size.length() / 2, 0.5);
    const fovRad = (this.camera.fov * Math.PI) / 180;
    const aspect = this.camera.aspect || 1;
    const minFovScale = Math.min(1, aspect);
    const distance = (radius / Math.sin(fovRad / 2)) / minFovScale * 1.4;

    return {
      target: { x: center.x, y: center.z, z: center.y },
      distance,
    };
  }

  dispose(): void {
    for (const { obj } of this.plotCache.values()) {
      this.disposeObject(obj);
    }
    this.plotCache.clear();
    this.renderer.dispose();
  }

  private signature(entry: ExpressionEntry, sliderScope: Record<string, number>): string {
    const { parsed } = entry;
    if (parsed.type === 'primitive3d') {
      return `prim:${entry.color}:${JSON.stringify(parsed.primitive)}`;
    }
    const sliderPart = parsed.freeVariables
      .map((name) => `${name}=${sliderScope[name] ?? 0}`)
      .join(',');
    return `${parsed.type}:${entry.color}:${entry.raw}:${sliderPart}`;
  }

  private buildPlot(entry: ExpressionEntry, sliderScope: Record<string, number>): PlotObject | null {
    const { parsed, color } = entry;
    try {
      if (parsed.type === 'primitive3d' && parsed.primitive) {
        return buildPrimitiveMesh(parsed.primitive, color);
      }
      if (parsed.type === 'explicit3d' && parsed.evaluator) {
        return buildSurfaceMesh(parsed.evaluator, sliderScope, color);
      }
      if (parsed.type === 'implicit3d' && parsed.evaluator) {
        return buildImplicitSurfaceMesh(
          parsed.evaluator,
          sliderScope,
          DEFAULT_IMPLICIT_BOUNDS,
          DEFAULT_IMPLICIT_RESOLUTION,
          color,
        );
      }
      if (parsed.type === 'parametric_curve3d' && parsed.parametric3DEvaluator) {
        return buildParametricCurveMesh(parsed.parametric3DEvaluator, sliderScope, color);
      }
      if (parsed.type === 'parametric_surface3d' && parsed.parametric3DEvaluator) {
        return buildParametricSurfaceMesh(parsed.parametric3DEvaluator, sliderScope, color);
      }
    } catch {
      return null;
    }
    return null;
  }

  private disposeObject(obj: PlotObject): void {
    obj.geometry.dispose();
    const m = obj.material;
    if (Array.isArray(m)) {
      for (const mat of m) mat.dispose();
    } else {
      m.dispose();
    }
  }

  private buildAxes(length: number): THREE.Group {
    const group = new THREE.Group();
    group.add(this.makeAxisLine(new THREE.Vector3(-length, 0, 0), new THREE.Vector3(length, 0, 0), 0xd11d2c));
    group.add(this.makeAxisLine(new THREE.Vector3(0, 0, -length), new THREE.Vector3(0, 0, length), 0x2a7d2a));
    group.add(this.makeAxisLine(new THREE.Vector3(0, -length, 0), new THREE.Vector3(0, length, 0), 0x1f5fcc));
    return group;
  }

  private makeAxisLine(from: THREE.Vector3, to: THREE.Vector3, color: number): THREE.Line {
    const geom = new THREE.BufferGeometry().setFromPoints([from, to]);
    const mat = new THREE.LineBasicMaterial({ color });
    return new THREE.Line(geom, mat);
  }
}
