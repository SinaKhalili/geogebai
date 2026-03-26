export interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Standard marching squares algorithm to extract the zero-level contour
 * from a scalar field evaluated on a grid.
 *
 * Grid layout (row-major, (gridWidth+1) x (gridHeight+1)):
 *   grid[j * (gridWidth+1) + i] = f(x, y) at column i, row j
 *   Row 0 is the top (yMax), row gridHeight is the bottom (yMin).
 */
export function marchingSquares(
  grid: Float64Array,
  gridWidth: number,
  gridHeight: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
): LineSegment[] {
  const segments: LineSegment[] = [];
  const cols = gridWidth + 1;
  const dx = (xMax - xMin) / gridWidth;
  const dy = (yMax - yMin) / gridHeight;

  // 16-case edge lookup table.
  // Each case maps to a list of edge pairs [edgeA, edgeB, ...].
  // Edges: 0=bottom (BL-BR), 1=right (BR-TR), 2=top (TL-TR), 3=left (TL-BL)
  const EDGE_TABLE: number[][] = [
    [],           // 0:  all negative
    [0, 3],       // 1:  BL+
    [0, 1],       // 2:  BR+
    [1, 3],       // 3:  BL+ BR+
    [1, 2],       // 4:  TR+
    [],           // 5:  BL+ TR+ (ambiguous, handled below)
    [0, 2],       // 6:  BR+ TR+
    [2, 3],       // 7:  BL+ BR+ TR+
    [2, 3],       // 8:  TL+
    [0, 2],       // 9:  BL+ TL+
    [],           // 10: BR+ TL+ (ambiguous, handled below)
    [1, 2],       // 11: BL+ BR+ TL+
    [1, 3],       // 12: TR+ TL+
    [0, 1],       // 13: BL+ TR+ TL+
    [0, 3],       // 14: BR+ TR+ TL+
    [],           // 15: all positive
  ];

  for (let j = 0; j < gridHeight; j++) {
    for (let i = 0; i < gridWidth; i++) {
      // Corner values: TL, TR, BR, BL
      const tl = grid[j * cols + i];
      const tr = grid[j * cols + i + 1];
      const br = grid[(j + 1) * cols + i + 1];
      const bl = grid[(j + 1) * cols + i];

      // Skip cells with NaN corners
      if (isNaN(tl) || isNaN(tr) || isNaN(br) || isNaN(bl)) continue;

      // Compute 4-bit case index
      const caseIndex =
        (bl > 0 ? 1 : 0) |
        (br > 0 ? 2 : 0) |
        (tr > 0 ? 4 : 0) |
        (tl > 0 ? 8 : 0);

      if (caseIndex === 0 || caseIndex === 15) continue;

      // World coordinates of the cell corners
      const cellXMin = xMin + i * dx;
      const cellXMax = xMin + (i + 1) * dx;
      const cellYMax = yMax - j * dy;       // top of cell
      const cellYMin = yMax - (j + 1) * dy; // bottom of cell

      // Handle ambiguous cases (5 and 10)
      if (caseIndex === 5 || caseIndex === 10) {
        const avg = (tl + tr + br + bl) / 4;
        const centerPositive = avg > 0;

        if (caseIndex === 5) {
          // BL+ TR+: saddle point
          if (centerPositive) {
            // Connect BL to TR through center: two segments (0-1) and (2-3)
            addSegment(segments, 0, 1, tl, tr, br, bl, cellXMin, cellXMax, cellYMin, cellYMax);
            addSegment(segments, 2, 3, tl, tr, br, bl, cellXMin, cellXMax, cellYMin, cellYMax);
          } else {
            // Separate: two segments (0-3) and (1-2)
            addSegment(segments, 0, 3, tl, tr, br, bl, cellXMin, cellXMax, cellYMin, cellYMax);
            addSegment(segments, 1, 2, tl, tr, br, bl, cellXMin, cellXMax, cellYMin, cellYMax);
          }
        } else {
          // case 10: BR+ TL+: saddle point
          if (centerPositive) {
            // Connect BR to TL through center: two segments (0-3) and (1-2)
            addSegment(segments, 0, 3, tl, tr, br, bl, cellXMin, cellXMax, cellYMin, cellYMax);
            addSegment(segments, 1, 2, tl, tr, br, bl, cellXMin, cellXMax, cellYMin, cellYMax);
          } else {
            // Separate: two segments (0-1) and (2-3)
            addSegment(segments, 0, 1, tl, tr, br, bl, cellXMin, cellXMax, cellYMin, cellYMax);
            addSegment(segments, 2, 3, tl, tr, br, bl, cellXMin, cellXMax, cellYMin, cellYMax);
          }
        }
        continue;
      }

      // Standard non-ambiguous cases
      const edges = EDGE_TABLE[caseIndex];
      for (let e = 0; e < edges.length; e += 2) {
        addSegment(segments, edges[e], edges[e + 1], tl, tr, br, bl, cellXMin, cellXMax, cellYMin, cellYMax);
      }
    }
  }

  return segments;
}

/**
 * Add a line segment between two edges of a cell.
 */
function addSegment(
  segments: LineSegment[],
  edgeA: number,
  edgeB: number,
  tl: number,
  tr: number,
  br: number,
  bl: number,
  cellXMin: number,
  cellXMax: number,
  cellYMin: number,
  cellYMax: number,
): void {
  const pA = interpolateEdge(edgeA, tl, tr, br, bl, cellXMin, cellXMax, cellYMin, cellYMax);
  const pB = interpolateEdge(edgeB, tl, tr, br, bl, cellXMin, cellXMax, cellYMin, cellYMax);
  segments.push({ x1: pA.x, y1: pA.y, x2: pB.x, y2: pB.y });
}

/**
 * Interpolate the zero crossing along a given edge.
 */
function interpolateEdge(
  edge: number,
  tl: number,
  tr: number,
  br: number,
  bl: number,
  cellXMin: number,
  cellXMax: number,
  cellYMin: number,
  cellYMax: number,
): { x: number; y: number } {
  let val1: number, val2: number;

  switch (edge) {
    case 0: // bottom edge: BL to BR
      val1 = bl;
      val2 = br;
      {
        const t = clamp01(val1 / (val1 - val2));
        return { x: cellXMin + t * (cellXMax - cellXMin), y: cellYMin };
      }
    case 1: // right edge: BR to TR
      val1 = br;
      val2 = tr;
      {
        const t = clamp01(val1 / (val1 - val2));
        return { x: cellXMax, y: cellYMin + t * (cellYMax - cellYMin) };
      }
    case 2: // top edge: TL to TR
      val1 = tl;
      val2 = tr;
      {
        const t = clamp01(val1 / (val1 - val2));
        return { x: cellXMin + t * (cellXMax - cellXMin), y: cellYMax };
      }
    case 3: // left edge: TL to BL
      val1 = tl;
      val2 = bl;
      {
        const t = clamp01(val1 / (val1 - val2));
        return { x: cellXMin, y: cellYMax - t * (cellYMax - cellYMin) };
      }
    default:
      return { x: cellXMin, y: cellYMin };
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
