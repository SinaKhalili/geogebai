import type { Point } from './types';

/**
 * Adaptively sample an explicit function y=f(x) to capture detail
 * around rapid changes while using fewer points in smooth regions.
 */
export function adaptiveSample(
  evaluator: (scope: Record<string, number>) => number,
  xMin: number,
  xMax: number,
  sliderScope: Record<string, number>,
  baseSamples: number = 200,
  maxDepth: number = 5,
): (Point | null)[] {
  // Step 1: Generate base samples
  const step = (xMax - xMin) / (baseSamples - 1);
  const basePoints: { x: number; y: number | null }[] = [];

  for (let i = 0; i < baseSamples; i++) {
    const x = xMin + i * step;
    const y = evaluator({ x, ...sliderScope });
    basePoints.push({ x, y: isFinite(y) ? y : null });
  }

  // Step 2: Recursively subdivide where needed
  const result: { x: number; y: number | null }[] = [];

  for (let i = 0; i < basePoints.length - 1; i++) {
    const a = basePoints[i];
    const b = basePoints[i + 1];

    // Add point a
    result.push(a);

    // Subdivide between a and b if both are valid
    if (a.y !== null && b.y !== null) {
      subdivide(evaluator, sliderScope, a.x, a.y, b.x, b.y, maxDepth, result);
    }
  }

  // Add the last point
  if (basePoints.length > 0) {
    result.push(basePoints[basePoints.length - 1]);
  }

  // Step 3: Convert to (Point | null)[] with discontinuity gaps
  return insertGaps(result);
}

/**
 * Recursively subdivide between two valid points if the function
 * deviates significantly from linear interpolation.
 */
function subdivide(
  evaluator: (scope: Record<string, number>) => number,
  sliderScope: Record<string, number>,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  depth: number,
  result: { x: number; y: number | null }[],
): void {
  if (depth <= 0) return;

  const xMid = (x1 + x2) / 2;
  const yMid = evaluator({ x: xMid, ...sliderScope });

  if (!isFinite(yMid)) {
    // Insert a gap marker at the midpoint
    result.push({ x: xMid, y: null });
    return;
  }

  // Compare midpoint actual y with linear interpolation
  const yInterp = (y1 + y2) / 2;
  const diff = Math.abs(yMid - yInterp);

  // Threshold: relative to segment height or an absolute minimum
  const segmentHeight = Math.abs(y2 - y1);
  const threshold = Math.max(segmentHeight * 0.05, 0.001);

  if (diff > threshold) {
    // Subdivide left half
    subdivide(evaluator, sliderScope, x1, y1, xMid, yMid, depth - 1, result);
    // Add the midpoint
    result.push({ x: xMid, y: yMid });
    // Subdivide right half
    subdivide(evaluator, sliderScope, xMid, yMid, x2, y2, depth - 1, result);
  }
}

/**
 * Convert raw sampled points into a (Point | null)[] array,
 * inserting null gaps at discontinuities.
 */
function insertGaps(raw: { x: number; y: number | null }[]): (Point | null)[] {
  const output: (Point | null)[] = [];

  for (let i = 0; i < raw.length; i++) {
    const curr = raw[i];

    if (curr.y === null) {
      // Explicit gap
      output.push(null);
      continue;
    }

    // Check for discontinuity: large y-jump relative to x-step
    if (i > 0) {
      const prev = raw[i - 1];
      if (prev.y !== null) {
        const dx = Math.abs(curr.x - prev.x);
        const dy = Math.abs(curr.y - prev.y);

        // If the slope is extremely steep, it's likely an asymptote
        if (dx > 0 && dy / dx > 1e6) {
          output.push(null); // insert gap before this point
        }
      }
    }

    output.push({ x: curr.x, y: curr.y });
  }

  return output;
}
