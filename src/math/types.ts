export type ExpressionType =
  | 'explicit'
  | 'implicit'
  | 'parametric'
  | 'inequality'
  | 'explicit3d'
  | 'primitive3d'
  | 'unknown'
  | 'invalid';

export type InequalityOp = '<' | '>' | '<=' | '>=';

export type Primitive3D =
  | { kind: 'sphere'; r: number }
  | { kind: 'cylinder'; r: number; h: number };

export interface ParsedExpression {
  type: ExpressionType;
  // For explicit: f(x) that returns y
  // For implicit: f(x,y) that should equal 0
  // For parametric: { fx: f(t), fy: f(t) }
  // For inequality: f(x,y) combined with inequalityOp
  // For explicit3d: f(x,y) that returns z
  evaluator: ((scope: Record<string, number>) => number) | null;
  parametricEvaluator: { fx: (scope: Record<string, number>) => number; fy: (scope: Record<string, number>) => number } | null;
  inequalityOp: InequalityOp | null;
  primitive: Primitive3D | null;
  freeVariables: string[]; // variables other than x, y, z, t (slider candidates)
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
