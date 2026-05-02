# 3D Graphing Wave 1 — Implicit Surfaces, Axis Labels, Auto-fit

Builds on the v0 (named primitives + explicit `z = f(x, y)` surfaces). Adds the load-bearing capability gap (implicit 3D) and the two polish items that turn the 3D mode from "tech demo" into "tool".

## In scope

1. **Implicit 3D surfaces**: `F(x, y, z) = 0` rendered via marching cubes.
2. **Axis ticks and numeric labels** in 3D, scaled with camera distance.
3. **Auto-fit camera**: triggered on the empty→non-empty transition, plus a manual fit button in the toolbar.

## Deferred to Wave 2

Parametric 3D curves and surfaces, wireframe toggle, surface opacity controls.

## Implicit 3D

### Parser

Adds `ExpressionType` value `'implicit3d'`. Detection happens inside `parseEquality`'s general branch: after the existing `y =` / `z =` shortcuts, the implicit form `(LHS) - (RHS)` is built. If `extractFreeVariables` (or `detectVariables`) reveals `z` is referenced, the result becomes `implicit3d` instead of `implicit`. Bare expressions still default to explicit3d when `z` appears.

### Marching cubes

`src/math/marchingCubes.ts` exports `marchingCubes(F, bounds, resolution)`:

- Samples `F: (x, y, z, slider) -> number` on a regular grid of `(resolution+1)^3` corners over the bounding box.
- For each cell of 8 corners, builds a 256-entry case index from sign-of-F, looks up the canonical edge intersections via `MC_EDGE_TABLE` / `MC_TRI_TABLE`, and linearly interpolates each crossed edge to find the surface point.
- Returns `{ positions: Float32Array, indices: Uint32Array }` ready for `BufferGeometry`.
- Skips cells where any corner is `NaN` / `Infinity`.

Default bounds: `[-5, 5]³`. Default resolution: `48`. (~110k cells — fast enough on commodity hardware; can be tuned later.)

### Renderer integration

`src/renderer/ImplicitSurface3DRenderer.ts` builds a `THREE.Mesh` from the marching-cubes output. It uses the same `MeshStandardMaterial` shading as the explicit-surface renderer, so styling is uniform. `RenderEngine3D` gets a third branch in `buildMesh` that calls into it.

The signature in `meshCache` for implicit3d depends on the raw expression, color, and slider values — same pattern as explicit3d.

## Axis ticks + labels

Adds an `AxisLabels3D` group inside the scene:

- **Ticks**: short orthogonal segments at each integer position on each axis from -5 to 5.
- **Labels**: a sprite per labeled tick (every 1 unit at the most zoomed-in level; could thin out with distance later — out of scope here). Labels are rendered to a small canvas with crisp text and used as `THREE.SpriteMaterial`. They face the camera automatically (sprite property).

## Auto-fit camera

`RenderEngine3D` exposes `fitToScene()`:

- Computes `Box3.setFromObject(plotGroup)`.
- If empty (no plot meshes), no-op.
- Otherwise computes bounding sphere radius and target. Sets `viewport3DStore.target` to bbox center, `distance` such that the bounding sphere fits the camera frustum (`r / sin(fov/2)`), then marks dirty.

Triggers:

- **Automatic**: when the active plot count in 3D goes from zero to non-zero. Tracked via a small ref in the render loop.
- **Manual**: a "fit" button in the toolbar (only enabled in 3D mode).

The existing reset button keeps its current semantics (back to defaults).

## Validation

`pnpm exec tsc --noEmit` clean. Visual smoke tests via expect MCP:

- `x^2 + y^2 + z^2 = 4` renders as a sphere from the equation form.
- A torus (`(sqrt(x^2 + y^2) - 2)^2 + z^2 = 1`) renders correctly with hole.
- Axis labels visible, readable.
- Adding the first 3D expression auto-fits; subsequent ones don't yank the camera.
- 2D regression: `y = sin(x)` still works after toggling back.
