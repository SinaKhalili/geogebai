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
  /** Primary-source citation: author, work, location, translation. */
  source: string;
  /** Verbatim or near-verbatim text from the cited source, in English. */
  quotation: string;
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
    source:
      'Euclid, Elements, Book I, Proposition 1 (c. 300 BCE) — translation by Sir Thomas L. Heath (1908)',
    quotation:
      'On a given finite straight line to construct an equilateral triangle.\n\n' +
      'Let AB be the given finite straight line. With centre A and distance AB let the circle BCD be described; again, with centre B and distance BA let the circle ACE be described; and from the point C, in which the circles cut one another, to the points A, B let the straight lines CA, CB be joined. Therefore the triangle ABC is equilateral; and it has been constructed on the given finite straight line AB.',
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
    source:
      'Euclid, Elements, Book I, Proposition 47 (c. 300 BCE) — translation by Sir Thomas L. Heath (1908)',
    quotation:
      'In right-angled triangles the square on the side subtending the right angle is equal to the squares on the sides containing the right angle.\n\n' +
      'Let ABC be a right-angled triangle having the angle BAC right; I say that the square on BC is equal to the squares on BA, AC. For let there be described on BC the square BDEC, and on BA, AC the squares GB, HC.',
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
    source:
      'Archimedes, On Spirals, Definition 1 (c. 225 BCE) — translation by Sir Thomas L. Heath, The Works of Archimedes (1897)',
    quotation:
      'If a straight line drawn in a plane revolve uniformly any number of times about a fixed extremity until it returns to its original position, and if, at the same time as the line revolves, a point move uniformly along the straight line beginning from the fixed extremity, the point will describe a spiral in the plane.',
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
    source:
      'Apollonius of Perga, Conics, Book I (c. 200 BCE)',
    quotation:
      'Apollonius’s Conics organized the systematic study of curves cut from a cone by a plane. In Book I he assigned the three sections the names by which they are still known: παραβολή (parabolē, "alongside"), ἔλλειψις (elleipsis, "falling short"), and ὑπερβολή (hyperbolē, "exceeding") — names that describe how the square on an ordinate compares to a fixed reference rectangle on the axis.',
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
    source:
      'Pappus of Alexandria, Synagoge (Mathematical Collection), Book IV (c. 320 CE), describing a curve attributed to Hippias of Elis (c. 420 BCE)',
    quotation:
      'For the squaring of the circle a certain curve was assumed by Dinostratus, Nicomedes, and certain other more recent geometers, which takes its name from this property; for it is called by them the quadratrix.\n\n' +
      'In the square ABCD let the side AB rotate uniformly about A, so as to come into the position of AD in the same time that BC moves uniformly parallel to itself until it coincides with AD. The locus of the intersection of the moving line and the rotating radius is the quadratrix.',
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
    source:
      'Diocles, On Burning Mirrors (c. 180 BCE), surviving in Arabic translation; ed. and trans. G. J. Toomer, Diocles On Burning Mirrors (1976)',
    quotation:
      'In On Burning Mirrors, Diocles introduced the curve later called the cissoid (Greek κισσοειδής, "ivy-shaped") to find two mean proportionals between two given lines — the construction by which the side of a cube of double volume can be obtained, solving the Delian problem of doubling the cube.\n\n' +
      'The cissoid is generated inside a circle of diameter 2a tangent to the y-axis at the origin: from a point on the circle, the curve takes its distance from the origin equal to the chord between the diametrically-opposite point and the vertical tangent.',
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
