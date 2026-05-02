export interface SliderOverride {
  value: number;
  min: number;
  max: number;
  step?: number;
}

export interface ViewportOverride {
  centerX: number;
  centerY: number;
  pixelsPerUnit: number;
}

export interface Construction {
  id: string;
  name: string;
  era: string;
  description: string;
  expressions: string[];
  sliders?: Record<string, SliderOverride>;
  viewport?: ViewportOverride;
}

// Parametric expressions render over t ∈ [-10, 10]. To draw a true segment
// rather than the infinite line through two points, divide x(t) and y(t) by
// (0<=t)*(t<=1): when t is in range the divisor is 1 (identity), otherwise
// it's 0 and the result is ±Infinity, which the renderer treats as a gap.
const M = '((0<=t)*(t<=1))';

function seg(ax: string, ay: string, bx: string, by: string): string {
  return `(((1-t)*(${ax})+t*(${bx}))/${M},((1-t)*(${ay})+t*(${by}))/${M})`;
}

const SQRT3_2 = Math.sqrt(3) / 2;

export const CONSTRUCTIONS: Construction[] = [
  {
    id: 'euclid-i-1',
    name: 'Euclid I.1 — Equilateral triangle',
    era: 'Euclid (c. 300 BCE)',
    description:
      'On a given segment, construct an equilateral triangle. Two circles of equal radius meet at a point that completes the triangle.',
    expressions: [
      '(x + 0.5)^2 + y^2 = 1',
      '(x - 0.5)^2 + y^2 = 1',
      seg('-0.5', '0', '0.5', '0'),
      seg('-0.5', '0', '0', `${SQRT3_2}`),
      seg('0.5', '0', '0', `${SQRT3_2}`),
    ],
    viewport: { centerX: 0, centerY: 0.4, pixelsPerUnit: 220 },
  },

  {
    id: 'euclid-i-47',
    name: 'Euclid I.47 — Pythagorean theorem',
    era: 'Euclid (c. 300 BCE)',
    description:
      'A right triangle with squares on each side. The square on the hypotenuse equals the sum of the squares on the two legs.',
    expressions: [
      // Right triangle: O at origin, A on x-axis at (a,0), B on y-axis at (0,b)
      seg('0', '0', 'a', '0'),
      seg('0', '0', '0', 'b'),
      seg('a', '0', '0', 'b'),
      // Square on the horizontal leg (below the x-axis)
      seg('a', '0', 'a', '-a'),
      seg('a', '-a', '0', '-a'),
      seg('0', '-a', '0', '0'),
      // Square on the vertical leg (left of the y-axis)
      seg('0', 'b', '-b', 'b'),
      seg('-b', 'b', '-b', '0'),
      seg('-b', '0', '0', '0'),
      // Square on the hypotenuse (outward from the origin)
      seg('0', 'b', 'b', 'b+a'),
      seg('b', 'b+a', 'a+b', 'a'),
      seg('a+b', 'a', 'a', '0'),
    ],
    sliders: {
      a: { value: 3, min: 0.5, max: 5, step: 0.1 },
      b: { value: 4, min: 0.5, max: 5, step: 0.1 },
    },
    viewport: { centerX: 0.5, centerY: 0.5, pixelsPerUnit: 55 },
  },

  {
    id: 'archimedes-spiral',
    name: "Archimedes' spiral",
    era: 'Archimedes (c. 250 BCE)',
    description:
      'The locus of a point moving outward at constant speed along a ray that rotates at constant angular speed. In polar form, r = a·θ.',
    expressions: [
      // Render only t >= 0 so we get a true Archimedean spiral (not its mirror)
      `((a*t*cos(t))/(t>=0),(a*t*sin(t))/(t>=0))`,
    ],
    sliders: {
      a: { value: 0.4, min: 0.05, max: 1.5, step: 0.05 },
    },
    viewport: { centerX: 0, centerY: 0, pixelsPerUnit: 60 },
  },

  {
    id: 'apollonius-conics',
    name: 'Apollonius — Conic sections',
    era: 'Apollonius (c. 200 BCE)',
    description:
      'The three non-degenerate conics — parabola, ellipse, and hyperbola — arise from slicing a cone at different angles.',
    expressions: [
      // Parabola
      'y = x^2 / 4 - 3',
      // Ellipse
      'x^2/9 + y^2/4 = 1',
      // Hyperbola
      'x^2/4 - y^2/9 = 1',
    ],
    viewport: { centerX: 0, centerY: 0, pixelsPerUnit: 50 },
  },

  {
    id: 'quadratrix-hippias',
    name: 'Quadratrix of Hippias',
    era: 'Hippias (c. 420 BCE)',
    description:
      'A vertical line slides leftward at constant speed while a ray rotates from horizontal to vertical at constant speed; their intersection traces this curve. It can square the circle and trisect any angle.',
    expressions: [
      // x(t) = 1 - t, y(t) = (1 - t) * tan((π/2) t), t ∈ [0, 1)
      `((1-t)/((0<=t)*(t<1)), ((1-t)*tan((pi/2)*t))/((0<=t)*(t<1)))`,
      // Reference unit square outline
      seg('0', '0', '1', '0'),
      seg('1', '0', '1', '1'),
      seg('1', '1', '0', '1'),
      seg('0', '1', '0', '0'),
    ],
    viewport: { centerX: 0.5, centerY: 0.5, pixelsPerUnit: 280 },
  },

  {
    id: 'cissoid-diocles',
    name: 'Cissoid of Diocles',
    era: 'Diocles (c. 180 BCE)',
    description:
      'Defined as y²(2a − x) = x³. Diocles introduced it to construct the cube root of 2 and so duplicate the cube — one of the three classical problems.',
    expressions: [
      'y^2 * (2*a - x) - x^3 = 0',
      // Reference circle of diameter 2a tangent to the y-axis at the origin
      '(x - a)^2 + y^2 = a^2',
    ],
    sliders: {
      a: { value: 1, min: 0.2, max: 3, step: 0.1 },
    },
    viewport: { centerX: 1.2, centerY: 0, pixelsPerUnit: 150 },
  },
];
