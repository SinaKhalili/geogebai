export type ExpressionType =
  | 'explicit'
  | 'implicit'
  | 'parametric'
  | 'inequality'
  | 'explicit3d'
  | 'implicit3d'
  | 'primitive3d'
  | 'parametric_curve3d'
  | 'parametric_surface3d'
  | 'unknown'
  | 'invalid';

export type InequalityOp = '<' | '>' | '<=' | '>=';

export type Primitive3D =
  | { kind: 'sphere'; r: number }
  | { kind: 'cylinder'; r: number; h: number };

export interface Parametric3DEvaluator {
  fx: (scope: Record<string, number>) => number;
  fy: (scope: Record<string, number>) => number;
  fz: (scope: Record<string, number>) => number;
}

export interface ParsedExpression {
  type: ExpressionType;
  // For explicit: f(x) that returns y
  // For implicit: f(x,y) that should equal 0
  // For parametric: { fx: f(t), fy: f(t) }
  // For inequality: f(x,y) combined with inequalityOp
  // For explicit3d: f(x,y) that returns z
  // For parametric_curve3d / parametric_surface3d: see parametric3DEvaluator
  evaluator: ((scope: Record<string, number>) => number) | null;
  parametricEvaluator: { fx: (scope: Record<string, number>) => number; fy: (scope: Record<string, number>) => number } | null;
  parametric3DEvaluator: Parametric3DEvaluator | null;
  inequalityOp: InequalityOp | null;
  primitive: Primitive3D | null;
  freeVariables: string[]; // variables other than x, y, z, t, u, v (slider candidates)
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
