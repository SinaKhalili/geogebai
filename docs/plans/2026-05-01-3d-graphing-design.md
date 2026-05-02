# 3D Graphing Design

Add 3D graphing as a parallel mode alongside the existing 2D pipeline. First slice: primitive shapes (`sphere`, `cylinder`) and explicit surfaces (`z = f(x, y)`). Implicit 3D and parametric 3D are out of scope here but the architecture leaves room.

## Decisions

- **Tech:** Three.js with imperative API (no react-three-fiber).
- **UI:** Mode toggle in the toolbar. 2D and 3D have separate canvases; switching the mode swaps them. Sidebar/expression list is shared.
- **Input syntax:** `sphere(r)`, `cylinder(r, h)` as named primitives. `z = f(x, y)` and bare expressions containing `z` for explicit surfaces.
- **Visual style:** Shaded solid (`MeshStandardMaterial`, ambient + directional light). Wireframe deferred.
- **Camera:** Orbit camera. Drag to orbit, scroll to zoom, right-drag (or shift-drag) to pan target. Stored as `{ theta, phi, distance, target }` in `viewport3DStore`.
- **Axes/grid:** Red x, green y, blue z axes. Grid in the xy plane.

## Architecture

```
src/
  store/
    appModeStore.ts          { mode: '2D' | '3D' }
    viewport3DStore.ts       orbit camera state
  renderer/
    RenderEngine3D.ts        Three.js scene/camera/renderer/lights/axes; updates per frame
    Surface3DRenderer.ts     height-field mesh from f(x, y) over a fixed bounded grid
    Primitive3DRenderer.ts   SphereGeometry / CylinderGeometry with per-expression color
  components/Canvas/
    GraphCanvas.tsx          switches 2D / 3D child by mode
    GraphCanvas3D.tsx        WebGL canvas + interaction + render loop
  hooks/
    useRenderLoop3D.ts       runs Three.js render only when stores dirty
```

The 2D `RenderEngine` is untouched. It already skips expression types it doesn't know, so adding `explicit3d` / `primitive3d` is a no-op for it.

## Parser changes

`ExpressionType` gains `'explicit3d' | 'primitive3d'`. `ParsedExpression` gains:

```ts
evaluator3D: ((scope: Record<string, number>) => number) | null;  // f(x, y)
primitive: { kind: 'sphere'; r: number }
         | { kind: 'cylinder'; r: number; h: number }
         | null;
```

Detection order in `parseExpression`:
1. `sphere(...)` / `cylinder(...)` regex → evaluate args with mathjs → `primitive3d`.
2. Existing parametric `(f(t), g(t))` check.
3. Inequality / equality. If LHS or RHS is `z`, parse the other side as `explicit3d` (compile against `{x, y, ...}` scope).
4. Bare expression containing `z` → `explicit3d` with `f = compile(raw)` (interpret as `z = f(x, y)`).

`detectVariables` learns about `z`. `extractFreeVariables` reserves `z`.

Primitive args are evaluated **at parse time** for the first slice; sliders inside `sphere(a)` won't update without a re-parse. That's fine for the milestone — fixing this is a clear follow-up (lazy primitive evaluators).

## Surface meshing

Height-field over a fixed `[-5, 5] × [-5, 5]` grid (configurable later) at `64 × 64` resolution. Build a `BufferGeometry` with positions, indices, and computed normals. Skip vertices where `f` returns `NaN` / `Infinity` — drop their adjacent triangles. Two-sided material so the underside is visible.

Camera default: position `(8, 6, 8)` looking at origin, perspective FOV 50°, near 0.1, far 1000.

## Render loop

Mirrors the 2D pattern: store-driven dirty flag. `useRenderLoop3D` ticks `requestAnimationFrame` and calls `renderEngine3D.render()` only when `viewport3DStore.dirty || expressionStore.dirty || sliderStore.dirty || appModeStore` flipped to 3D. Three.js renderer is created once on mount, disposed on unmount. Geometries are rebuilt only when their source expression changes (cache by `expression.id` + `expression.raw`).

## Out of scope (follow-ups)

- Implicit 3D `F(x, y, z) = 0` (marching cubes).
- Parametric 3D surfaces / curves.
- Wireframe toggle, lighting controls, axis-range controls.
- Slider re-evaluation for primitive args.
- Cursor / inspection in 3D.
- Auto-fit camera to scene bounds.
