import { replaceExpressions } from '../store/expressionStore';
import {
  syncSliderVariables,
  setSliderRange,
  setSliderValue,
  setSliderStep,
} from '../store/sliderStore';
import { setViewport } from '../store/viewportStore';
import { extractFreeVariables } from '../math/variableExtractor';
import type { Construction } from './constructions';

export function loadConstruction(c: Construction): void {
  replaceExpressions(c.expressions);

  const allFreeVars: string[] = [];
  for (const raw of c.expressions) {
    for (const v of extractFreeVariables(raw)) {
      if (!allFreeVars.includes(v)) allFreeVars.push(v);
    }
  }
  syncSliderVariables(allFreeVars);

  if (c.sliders) {
    for (const [name, override] of Object.entries(c.sliders)) {
      setSliderValue(name, override.value);
      setSliderRange(name, override.min, override.max);
      if (override.step !== undefined) setSliderStep(name, override.step);
    }
  }

  if (c.viewport) {
    setViewport(c.viewport.centerX, c.viewport.centerY, c.viewport.pixelsPerUnit);
  }
}
