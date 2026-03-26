import type { Point } from './types';

/**
 * Evaluate an explicit function y=f(x) over a uniform domain.
 */
export function evaluateExplicit(
  evaluator: (scope: Record<string, number>) => number,
  xMin: number,
  xMax: number,
  numSamples: number,
  sliderScope: Record<string, number>,
): (Point | null)[] {
  const points: (Point | null)[] = [];
  const step = (xMax - xMin) / (numSamples - 1);

  for (let i = 0; i < numSamples; i++) {
    const x = xMin + i * step;
    const y = evaluator({ x, ...sliderScope });

    if (!isFinite(y)) {
      points.push(null);
    } else {
      points.push({ x, y });
    }
  }

  return points;
}

/**
 * Evaluate an implicit equation f(x,y)=0 over a 2D grid.
 * Returns a Float64Array of size (gridWidth+1) * (gridHeight+1) in row-major order.
 */
export function evaluateImplicitGrid(
  evaluator: (scope: Record<string, number>) => number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  gridWidth: number,
  gridHeight: number,
  sliderScope: Record<string, number>,
): Float64Array {
  const cols = gridWidth + 1;
  const rows = gridHeight + 1;
  const grid = new Float64Array(cols * rows);

  const dx = (xMax - xMin) / gridWidth;
  const dy = (yMax - yMin) / gridHeight;

  for (let j = 0; j < rows; j++) {
    const y = yMax - j * dy; // top row = yMax
    const rowOffset = j * cols;
    for (let i = 0; i < cols; i++) {
      const x = xMin + i * dx;
      const val = evaluator({ x, y, ...sliderScope });
      grid[rowOffset + i] = isFinite(val) ? val : NaN;
    }
  }

  return grid;
}

/**
 * Evaluate parametric equations x=fx(t), y=fy(t) over a t domain.
 */
export function evaluateParametric(
  fx: (scope: Record<string, number>) => number,
  fy: (scope: Record<string, number>) => number,
  tMin: number,
  tMax: number,
  numSamples: number,
  sliderScope: Record<string, number>,
): (Point | null)[] {
  const points: (Point | null)[] = [];
  const step = (tMax - tMin) / (numSamples - 1);

  for (let i = 0; i < numSamples; i++) {
    const t = tMin + i * step;
    const scope = { t, ...sliderScope };
    const x = fx(scope);
    const y = fy(scope);

    if (!isFinite(x) || !isFinite(y)) {
      points.push(null);
    } else {
      points.push({ x, y });
    }
  }

  return points;
}
