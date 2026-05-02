# Construction Library — Design

## Goal
Add a curated library of classical mathematical figures from Greek antiquity
that the user can load with a single click. Each entry produces a coherent
graphical scene built from the calculator's existing expression types.

## Scope (initial)
Six entries spanning the era and exercising every expression type:

1. **Euclid I.1** — equilateral triangle constructed on a segment (two arcs +
   three segments)
2. **Euclid I.47** — Pythagorean theorem with squares on each side of a right
   triangle (sliders for legs `a`, `b`)
3. **Archimedes' spiral** — `r = aθ` rendered parametrically
4. **Apollonius — conic sections** — parabola, ellipse, hyperbola together
5. **Quadratrix of Hippias** — used to square the circle and trisect angles
6. **Cissoid of Diocles** — used in attempts to double the cube

## Architecture
The app has no geometric primitives (Point/Segment/Circle objects). Adding
them is out of scope here; instead each construction is a **bundle of raw
expression strings** that load into the existing expression list. This works
because all four expression types — explicit, implicit, parametric,
inequality — are already supported.

```
type Construction = {
  id: string;
  name: string;
  era: string;          // "Euclid", "Archimedes", ...
  description: string;  // 1–2 sentences shown in the modal
  expressions: string[];
  sliders?: Record<string, { value: number; min: number; max: number; step?: number }>;
  viewport?: { centerX: number; centerY: number; pixelsPerUnit: number };
};
```

## Load semantics
Single action `loadConstruction(c)`:

1. Replace the expression list with the construction's expressions.
2. Manually compute free variables and call `syncSliderVariables` so that
   slider overrides apply against an existing variable in the store.
3. Apply slider overrides via `setSliderRange` / `setSliderValue` /
   `setSliderStep`.
4. Apply viewport override via a new `setViewport` action on `viewportStore`.

Replacing (not appending) is intentional: each construction is a self-contained
scene and stacking Pythagoras on top of a spiral is visual noise.

## The segment trick
Parametric expressions render over a fixed `t ∈ [-10, 10]`. To draw a true
**line segment** between two points (rather than the infinite line through
them), multiply both `x(t)` and `y(t)` by the mask
`(0 <= t and t <= 1)/(0 <= t and t <= 1)`:

- in range: `1/1 = 1` → identity
- out of range: `0/0 = NaN` → renderer treats as a gap

A `segmentExpr(ax, ay, bx, by)` helper produces these strings so the
construction definitions stay readable.

## UI
- **Library** button added to the existing right-side toolbar (icon: stack of
  books / open scroll).
- Click opens a centered modal: title, list of constructions grouped by era,
  each row showing name + 1-line description. Click a row → `loadConstruction`
  → close modal.
- ESC and backdrop click close the modal.

## Out of scope
- Persisting constructions to URL or storage
- Editing / saving custom constructions
- Real geometric primitives (intersection, midpoint, perpendicular)
- Animation of the construction steps
