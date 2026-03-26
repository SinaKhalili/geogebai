export type ExpressionType = 'explicit' | 'implicit' | 'parametric' | 'inequality' | 'unknown' | 'invalid';

export type InequalityOp = '<' | '>' | '<=' | '>=';

export interface ParsedExpression {
  type: ExpressionType;
  // For explicit: f(x) that returns y
  // For implicit: f(x,y) that should equal 0
  // For parametric: { fx: f(t), fy: f(t) }
  // For inequality: f(x,y) combined with inequalityOp
  evaluator: ((scope: Record<string, number>) => number) | null;
  parametricEvaluator: { fx: (scope: Record<string, number>) => number; fy: (scope: Record<string, number>) => number } | null;
  inequalityOp: InequalityOp | null;
  freeVariables: string[]; // variables other than x, y, t (slider candidates)
  error: string | null;
}

export interface ExpressionEntry {
  id: string;
  raw: string;
  parsed: ParsedExpression;
  color: string;
  visible: boolean;
}

export interface Point {
  x: number;
  y: number;
}

export interface SliderVariable {
  value: number;
  min: number;
  max: number;
  step: number;
}
