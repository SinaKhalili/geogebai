import { Store } from '@tanstack/store';
import type { ExpressionEntry } from '../math/types';
import { parseExpression } from '../math/parser';
import { getColor } from '../renderer/colors';

interface ExpressionState {
  expressions: ExpressionEntry[];
  dirty: boolean;
}

export const expressionStore = new Store<ExpressionState>({
  expressions: [],
  dirty: false,
});

/**
 * Add a new expression to the list.
 * Returns the generated unique ID.
 */
export function addExpression(raw: string = ''): string {
  const id = crypto.randomUUID();
  const colorIndex = expressionStore.state.expressions.length;
  const color = getColor(colorIndex);
  const parsed = parseExpression(raw);

  const entry: ExpressionEntry = {
    id,
    raw,
    parsed,
    color,
    visible: true,
  };

  expressionStore.setState((prev) => ({
    ...prev,
    expressions: [...prev.expressions, entry],
    dirty: true,
  }));

  return id;
}

/**
 * Remove an expression by its ID.
 */
export function removeExpression(id: string): void {
  expressionStore.setState((prev) => ({
    ...prev,
    expressions: prev.expressions.filter((e) => e.id !== id),
    dirty: true,
  }));
}

/**
 * Update the raw text of an expression, re-parsing it.
 */
export function updateExpressionText(id: string, raw: string): void {
  const parsed = parseExpression(raw);

  expressionStore.setState((prev) => ({
    ...prev,
    expressions: prev.expressions.map((e) =>
      e.id === id ? { ...e, raw, parsed } : e
    ),
    dirty: true,
  }));
}

/**
 * Toggle the visibility of an expression.
 */
export function toggleExpressionVisibility(id: string): void {
  expressionStore.setState((prev) => ({
    ...prev,
    expressions: prev.expressions.map((e) =>
      e.id === id ? { ...e, visible: !e.visible } : e
    ),
    dirty: true,
  }));
}

/**
 * Mark expressions as clean (rendered up to date).
 */
export function markExpressionsClean(): void {
  expressionStore.setState((prev) => ({
    ...prev,
    dirty: false,
  }));
}
