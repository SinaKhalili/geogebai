import { create, all } from 'mathjs';
import type { EvalFunction } from 'mathjs';
import type { ParsedExpression, ExpressionType, InequalityOp } from './types';
import { extractFreeVariables } from './variableExtractor';

const math = create(all);

const EMPTY_RESULT: ParsedExpression = {
  type: 'unknown',
  evaluator: null,
  parametricEvaluator: null,
  inequalityOp: null,
  freeVariables: [],
  error: null,
};

function makeInvalid(error: string): ParsedExpression {
  return {
    type: 'invalid',
    evaluator: null,
    parametricEvaluator: null,
    inequalityOp: null,
    freeVariables: [],
    error,
  };
}

function makeEvaluator(compiled: EvalFunction): (scope: Record<string, number>) => number {
  return (scope: Record<string, number>) => compiled.evaluate(scope);
}

/**
 * Detect which standard variables (x, y, t) appear in an expression string.
 */
function detectVariables(expr: string): { hasX: boolean; hasY: boolean; hasT: boolean } {
  try {
    const node = math.parse(expr);
    let hasX = false;
    let hasY = false;
    let hasT = false;

    node.traverse((n) => {
      if (n.type === 'SymbolNode') {
        const name = (n as unknown as { name: string }).name;
        if (name === 'x') hasX = true;
        if (name === 'y') hasY = true;
        if (name === 't') hasT = true;
      }
    });

    return { hasX, hasY, hasT };
  } catch {
    return { hasX: false, hasY: false, hasT: false };
  }
}

/**
 * Try to parse a parametric expression of the form (f(t), g(t)).
 * Returns null if it doesn't match the parametric pattern.
 */
function tryParseParametric(raw: string): ParsedExpression | null {
  // Match (expr, expr) pattern
  const match = raw.match(/^\s*\(\s*(.+?)\s*,\s*(.+?)\s*\)\s*$/);
  if (!match) return null;

  const fxStr = match[1];
  const fyStr = match[2];

  // Check that expressions use t but not x or y
  const fxVars = detectVariables(fxStr);
  const fyVars = detectVariables(fyStr);

  const usesXorY = fxVars.hasX || fxVars.hasY || fyVars.hasX || fyVars.hasY;
  const usesT = fxVars.hasT || fyVars.hasT;

  if (usesXorY || !usesT) return null;

  try {
    const compiledFx = math.compile(fxStr);
    const compiledFy = math.compile(fyStr);
    const freeVariables = extractFreeVariables(raw);

    return {
      type: 'parametric',
      evaluator: null,
      parametricEvaluator: {
        fx: makeEvaluator(compiledFx),
        fy: makeEvaluator(compiledFy),
      },
      inequalityOp: null,
      freeVariables,
      error: null,
    };
  } catch (e) {
    return makeInvalid(e instanceof Error ? e.message : 'Failed to parse parametric expression');
  }
}

/**
 * Split an expression on the first inequality operator found.
 * Returns null if no inequality operator is present.
 */
function splitOnInequality(raw: string): { lhs: string; rhs: string; op: InequalityOp } | null {
  // Order matters: check two-char operators before one-char
  const operators: InequalityOp[] = ['<=', '>=', '<', '>'];
  for (const op of operators) {
    const idx = raw.indexOf(op);
    if (idx !== -1) {
      // Make sure we don't confuse <= with = or < separately
      // For <= and >=, we found the right thing. For < and >, make sure
      // the character after isn't '=' (which would have been caught above).
      const lhs = raw.substring(0, idx).trim();
      const rhs = raw.substring(idx + op.length).trim();
      if (lhs && rhs) {
        return { lhs, rhs, op };
      }
    }
  }
  return null;
}

/**
 * Split an expression on '=' (but not '<=' or '>=' or '==').
 */
function splitOnEquals(raw: string): { lhs: string; rhs: string } | null {
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '=') {
      // Make sure it's not <=, >=, or ==
      if (i > 0 && (raw[i - 1] === '<' || raw[i - 1] === '>')) continue;
      if (i + 1 < raw.length && raw[i + 1] === '=') continue;

      const lhs = raw.substring(0, i).trim();
      const rhs = raw.substring(i + 1).trim();
      if (lhs && rhs) {
        return { lhs, rhs };
      }
    }
  }
  return null;
}

/**
 * Parse a raw math expression string into a ParsedExpression.
 */
export function parseExpression(raw: string): ParsedExpression {
  const trimmed = raw.trim();
  if (!trimmed) return { ...EMPTY_RESULT };

  // Try parametric first: (f(t), g(t))
  const parametric = tryParseParametric(trimmed);
  if (parametric) return parametric;

  // Try inequality
  const ineq = splitOnInequality(trimmed);
  if (ineq) {
    return parseInequality(ineq.lhs, ineq.rhs, ineq.op, trimmed);
  }

  // Try equality
  const eq = splitOnEquals(trimmed);
  if (eq) {
    return parseEquality(eq.lhs, eq.rhs, trimmed);
  }

  // No operator — treat as explicit y = f(x)
  return parseBarExpression(trimmed);
}

function parseInequality(lhs: string, rhs: string, op: InequalityOp, raw: string): ParsedExpression {
  try {
    // Form LHS - RHS, then the inequality is: (LHS - RHS) op 0
    const implicitExpr = `(${lhs}) - (${rhs})`;
    const compiled = math.compile(implicitExpr);
    const freeVariables = extractFreeVariables(raw);

    return {
      type: 'inequality',
      evaluator: makeEvaluator(compiled),
      parametricEvaluator: null,
      inequalityOp: op,
      freeVariables,
      error: null,
    };
  } catch (e) {
    return makeInvalid(e instanceof Error ? e.message : 'Failed to parse inequality');
  }
}

function parseEquality(lhs: string, rhs: string, raw: string): ParsedExpression {
  const lhsTrimmed = lhs.trim();
  const rhsTrimmed = rhs.trim();

  // Case: y = f(x)
  if (lhsTrimmed === 'y') {
    return parseExplicit(rhsTrimmed, raw);
  }

  // Case: f(x) = y (reversed)
  if (rhsTrimmed === 'y') {
    return parseExplicit(lhsTrimmed, raw);
  }

  // Case: x = f(y) -> implicit: x - f(y) = 0
  // Or general: LHS = RHS -> implicit: LHS - RHS = 0
  try {
    const implicitExpr = `(${lhsTrimmed}) - (${rhsTrimmed})`;
    const compiled = math.compile(implicitExpr);
    const freeVariables = extractFreeVariables(raw);

    // All equation forms with = are treated as implicit (LHS - RHS = 0)
    return {
      type: 'implicit' as ExpressionType,
      evaluator: makeEvaluator(compiled),
      parametricEvaluator: null,
      inequalityOp: null,
      freeVariables,
      error: null,
    };
  } catch (e) {
    return makeInvalid(e instanceof Error ? e.message : 'Failed to parse equation');
  }
}

function parseExplicit(expr: string, raw: string): ParsedExpression {
  try {
    const compiled = math.compile(expr);
    const freeVariables = extractFreeVariables(raw);

    return {
      type: 'explicit',
      evaluator: makeEvaluator(compiled),
      parametricEvaluator: null,
      inequalityOp: null,
      freeVariables,
      error: null,
    };
  } catch (e) {
    return makeInvalid(e instanceof Error ? e.message : 'Failed to parse expression');
  }
}

function parseBarExpression(raw: string): ParsedExpression {
  try {
    const vars = detectVariables(raw);

    // If the expression contains both x and y, treat as implicit (= 0)
    if (vars.hasX && vars.hasY) {
      const compiled = math.compile(raw);
      const freeVariables = extractFreeVariables(raw);

      return {
        type: 'implicit',
        evaluator: makeEvaluator(compiled),
        parametricEvaluator: null,
        inequalityOp: null,
        freeVariables,
        error: null,
      };
    }

    // If it contains t but not x or y, try as parametric (edge case without parens)
    if (vars.hasT && !vars.hasX && !vars.hasY) {
      // Can't be parametric without (fx, fy) form — treat as explicit y = f(t)
      // Actually, for a bare expression with t, just treat as explicit with x = t
    }

    // Default: explicit y = f(x)
    const compiled = math.compile(raw);
    const freeVariables = extractFreeVariables(raw);

    return {
      type: 'explicit',
      evaluator: makeEvaluator(compiled),
      parametricEvaluator: null,
      inequalityOp: null,
      freeVariables,
      error: null,
    };
  } catch (e) {
    return makeInvalid(e instanceof Error ? e.message : 'Failed to parse expression');
  }
}
