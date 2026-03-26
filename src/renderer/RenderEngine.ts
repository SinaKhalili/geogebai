import type { CoordinateSystem } from './CoordinateSystem';
import type { ExpressionEntry } from '../math/types';
import { GridRenderer } from './GridRenderer';
import { CursorRenderer } from './CursorRenderer';
import { ExplicitPlotRenderer } from './ExplicitPlotRenderer';
import { ImplicitPlotRenderer } from './ImplicitPlotRenderer';
import { ParametricPlotRenderer } from './ParametricPlotRenderer';
import { adaptiveSample } from '../math/adaptiveSampler';
import { evaluateImplicitGrid, evaluateParametric } from '../math/evaluator';
import { marchingSquares } from '../math/marchingSquares';

export class RenderEngine {
  private gridRenderer = new GridRenderer();
  private cursorRenderer = new CursorRenderer();
  private explicitRenderer = new ExplicitPlotRenderer();
  private implicitRenderer = new ImplicitPlotRenderer();
  private parametricRenderer = new ParametricPlotRenderer();

  render(
    ctx: CanvasRenderingContext2D,
    coordSystem: CoordinateSystem,
    expressions: ExpressionEntry[],
    sliderScope: Record<string, number>,
    mouseX: number | null,
    mouseY: number | null,
  ): void {
    const { canvasWidth, canvasHeight } = coordSystem;

    // Clear
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Grid and axes
    this.gridRenderer.render(ctx, coordSystem);

    // Plot each visible expression
    const bounds = coordSystem.getVisibleBounds();

    for (const entry of expressions) {
      if (!entry.visible) continue;
      const { parsed, color } = entry;
      if (parsed.error || parsed.type === 'unknown' || parsed.type === 'invalid') continue;

      try {
        if (parsed.type === 'explicit' && parsed.evaluator) {
          const points = adaptiveSample(
            parsed.evaluator,
            bounds.xMin,
            bounds.xMax,
            sliderScope,
          );
          this.explicitRenderer.render(ctx, points, coordSystem, color);
        } else if (parsed.type === 'implicit' && parsed.evaluator) {
          const gridSize = 200;
          const grid = evaluateImplicitGrid(
            parsed.evaluator,
            bounds.xMin,
            bounds.xMax,
            bounds.yMin,
            bounds.yMax,
            gridSize,
            gridSize,
            sliderScope,
          );
          const segments = marchingSquares(
            grid,
            gridSize,
            gridSize,
            bounds.xMin,
            bounds.xMax,
            bounds.yMin,
            bounds.yMax,
          );
          this.implicitRenderer.render(ctx, segments, coordSystem, color);
        } else if (parsed.type === 'parametric' && parsed.parametricEvaluator) {
          const { fx, fy } = parsed.parametricEvaluator;
          const points = evaluateParametric(fx, fy, -10 * Math.PI, 10 * Math.PI, 2000, sliderScope);
          this.parametricRenderer.render(ctx, points, coordSystem, color);
        } else if (parsed.type === 'inequality' && parsed.evaluator) {
          // Render inequality as filled region
          const gridSize = 200;
          const grid = evaluateImplicitGrid(
            parsed.evaluator,
            bounds.xMin,
            bounds.xMax,
            bounds.yMin,
            bounds.yMax,
            gridSize,
            gridSize,
            sliderScope,
          );
          this.renderInequalityFill(ctx, grid, gridSize, gridSize, coordSystem, color, parsed.inequalityOp);
          // Also render the boundary
          const segments = marchingSquares(
            grid,
            gridSize,
            gridSize,
            bounds.xMin,
            bounds.xMax,
            bounds.yMin,
            bounds.yMax,
          );
          this.implicitRenderer.render(ctx, segments, coordSystem, color);
        }
      } catch {
        // Skip expressions that error during evaluation
      }
    }

    // Cursor crosshair and tooltip
    if (mouseX !== null && mouseY !== null) {
      this.cursorRenderer.render(ctx, coordSystem, mouseX, mouseY);
    }
  }

  private renderInequalityFill(
    ctx: CanvasRenderingContext2D,
    grid: Float64Array,
    gridWidth: number,
    gridHeight: number,
    coordSystem: CoordinateSystem,
    color: string,
    op: string | null,
  ): void {
    const cols = gridWidth + 1;
    const cellW = coordSystem.canvasWidth / gridWidth;
    const cellH = coordSystem.canvasHeight / gridHeight;

    ctx.fillStyle = color + '20'; // very transparent fill

    for (let j = 0; j < gridHeight; j++) {
      for (let i = 0; i < gridWidth; i++) {
        const val = grid[j * cols + i];
        if (isNaN(val)) continue;

        let fill = false;
        switch (op) {
          case '<':
          case '<=':
            fill = val < 0;
            break;
          case '>':
          case '>=':
            fill = val > 0;
            break;
        }

        if (fill) {
          ctx.fillRect(i * cellW, j * cellH, cellW + 0.5, cellH + 0.5);
        }
      }
    }
  }
}
