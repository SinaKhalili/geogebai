# 3D Graphing Wave 2 — Parametrics, Wireframe, Opacity

Adds the deferred items from Wave 1's plan: parametric curves and surfaces, plus
two visual controls (wireframe and opacity) so overlapping plots are legible.

## In scope

1. Parametric 3D curves: `(f(t), g(t), h(t))`.
2. Parametric 3D surfaces: `(f(u, v), g(u, v), h(u, v))`.
3. Global wireframe toggle.
4. Global opacity slider.

## Parser

`tryParseParametric` is generalized to accept N-tuples. Detection logic:

- 2-tuple, only `t` → `parametric` (existing 2D).
- 3-tuple, only `t` (no `u`, `v`) → `parametric_curve3d`.
- 3-tuple, `u` and/or `v` (no `t`) → `parametric_surface3d`.
- Otherwise → `invalid` with a helpful message.

`u` and `v` join `x, y, z, t` as standard variables (excluded from slider candidates).

`ParsedExpression` gains a single `parametric3DEvaluator` field carrying the three
component evaluators. The two new types share that field.

## Curve renderer

`ParametricCurve3DRenderer` samples `t ∈ [-tau*pi, tau*pi]` (default `tau = 4`,
~25 cycles of `sin/cos`-style curves at common scales) at `2000` points,
producing world positions with the math→world axis swap. Uses
`THREE.BufferGeometry` + `THREE.Line` with `LineBasicMaterial`. NaN samples
break the line: emit a gap by ending one segment and starting another.

## Surface renderer

`ParametricSurface3DRenderer` samples `(u, v) ∈ [0, 2π] × [0, π]` at `64 × 64`
(matches the explicit-surface density). Default ranges are good enough for the
common sphere-via-parametric case `(cos(u)sin(v), sin(u)sin(v), cos(v))`. Builds
a triangulated `BufferGeometry`, drops triangles touching NaN samples, and
computes vertex normals. Same `MeshStandardMaterial` as the other surface
renderers so wireframe/opacity affect it uniformly.

Future Wave 3: per-expression u/v range overrides.

## Appearance store

```ts
interface Appearance3DState {
  wireframe: boolean;
  opacity: number; // 0..1
}
```

Defaults: `{ wireframe: false, opacity: 1 }`. Setters mark `viewport3DStore.dirty`
to drive a re-render.

## Renderer integration

`RenderEngine3D` keeps a `plotMaterials: Set<MeshStandardMaterial>` updated as
meshes are added/removed. Each frame, before `renderer.render`, the engine reads
`appearance3DStore.state` and pushes `wireframe` / `opacity` onto every material.
`opacity < 1` flips `transparent` on too. Lines/curves are unaffected (a line is
already a wireframe; alpha is meaningful but lower priority and skipped here).

## Toolbar

Two new 3D-only controls inserted before the fit button:

- **Wireframe toggle**: square button with a wire-grid icon. Active state shaded.
- **Opacity slider**: `<input type="range" min="0.1" max="1" step="0.05">` in a
  small chip. Labelled by tooltip.

## Validation

`pnpm exec tsc --noEmit` clean. expect MCP smoke tests:

- Helix `(cos(t), sin(t), t/3)` renders as a smooth blue curve climbing the z axis.
- Parametric sphere `(cos(u)*sin(v), sin(u)*sin(v), cos(v))` renders as a sphere.
- Wireframe toggle reveals mesh structure on the implicit sphere.
- Opacity 0.5 reveals an enclosed surface through an outer one.
- 2D regression: existing 2D parametric `(cos(t), sin(t))` still draws a circle.
