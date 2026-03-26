import { CoordinateSystem } from './CoordinateSystem';
import type { ExpressionEntry } from '../math/types';
import { ExplicitPlotRenderer } from './ExplicitPlotRenderer';
import { ImplicitPlotRenderer } from './ImplicitPlotRenderer';
import { ParametricPlotRenderer } from './ParametricPlotRenderer';
import { InequalityRenderer } from './InequalityRenderer';
import { adaptiveSample } from '../math/adaptiveSampler';
import { evaluateImplicitGrid, evaluateParametric } from '../math/evaluator';
import { marchingSquares } from '../math/marchingSquares';

export class PlotRenderer {
  private explicitRenderer = new ExplicitPlotRenderer();
  private implicitRenderer = new ImplicitPlotRenderer();
  private parametricRenderer = new ParametricPlotRenderer();
  private inequalityRenderer = new InequalityRenderer();

  render(
    ctx: CanvasRenderingContext2D,
    expression: ExpressionEntry,
    coordSystem: CoordinateSystem,
    sliderScope: Record<string, number>,
  ): void {
    const { parsed, color } = expression;

    switch (parsed.type) {
      case 'explicit':
        this.renderExplicit(ctx, parsed.evaluator!, coordSystem, sliderScope, color);
        break;

      case 'implicit':
        this.renderImplicit(ctx, parsed.evaluator!, coordSystem, sliderScope, color);
        break;

      case 'parametric':
        this.renderParametric(ctx, parsed.parametricEvaluator!, coordSystem, sliderScope, color);
        break;

      case 'inequality':
        this.inequalityRenderer.render(
          ctx,
          parsed.evaluator!,
          parsed.inequalityOp!,
          coordSystem,
          sliderScope,
          color,
        );
        break;

      case 'unknown':
      case 'invalid':
        // Nothing to render
        break;
    }
  }

  private renderExplicit(
    ctx: CanvasRenderingContext2D,
    evaluator: (scope: Record<string, number>) => number,
    coordSystem: CoordinateSystem,
    sliderScope: Record<string, number>,
    color: string,
  ): void {
    const bounds = coordSystem.getVisibleBounds();
    const points = adaptiveSample(
      evaluator,
      bounds.xMin,
      bounds.xMax,
      sliderScope,
    );
    this.explicitRenderer.render(ctx, points, coordSystem, color);
  }

  private renderImplicit(
    ctx: CanvasRenderingContext2D,
    evaluator: (scope: Record<string, number>) => number,
    coordSystem: CoordinateSystem,
    sliderScope: Record<string, number>,
    color: string,
  ): void {
    const bounds = coordSystem.getVisibleBounds();
    const gridWidth = Math.min(Math.floor(coordSystem.canvasWidth / 3), 400);
    const aspectRatio = (bounds.yMax - bounds.yMin) / (bounds.xMax - bounds.xMin);
    const gridHeight = Math.max(Math.round(gridWidth * aspectRatio), 1);

    const grid = evaluateImplicitGrid(
      evaluator,
      bounds.xMin, bounds.xMax,
      bounds.yMin, bounds.yMax,
      gridWidth, gridHeight,
      sliderScope,
    );

    const segments = marchingSquares(
      grid, gridWidth, gridHeight,
      bounds.xMin, bounds.xMax,
      bounds.yMin, bounds.yMax,
    );

    this.implicitRenderer.render(ctx, segments, coordSystem, color);
  }

  private renderParametric(
    ctx: CanvasRenderingContext2D,
    parametric: { fx: (scope: Record<string, number>) => number; fy: (scope: Record<string, number>) => number },
    coordSystem: CoordinateSystem,
    sliderScope: Record<string, number>,
    color: string,
  ): void {
    const tMin = -10;
    const tMax = 10;
    const numSamples = 2000;

    const points = evaluateParametric(
      parametric.fx,
      parametric.fy,
      tMin, tMax,
      numSamples,
      sliderScope,
    );

    this.parametricRenderer.render(ctx, points, coordSystem, color);
  }
}
