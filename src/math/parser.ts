import { create, all } from 'mathjs';
import type { EvalFunction } from 'mathjs';
import type { ParsedExpression, ExpressionType, InequalityOp } from './types';
import { extractFreeVariables } from './variableExtractor';

const math = create(all);

const EMPTY_RESULT: ParsedExpression = {
  type: 'unknown',
  evaluator: null,
  parametricEvaluator: null,
  parametric3DEvaluator: null,
  inequalityOp: null,
  primitive: null,
  freeVariables: [],
  error: null,
};

function makeInvalid(error: string): ParsedExpression {
  return {
    type: 'invalid',
    evaluator: null,
    parametricEvaluator: null,
    parametric3DEvaluator: null,
    inequalityOp: null,
    primitive: null,
    freeVariables: [],
    error,
  };
}

function makeEvaluator(compiled: EvalFunction): (scope: Record<string, number>) => number {
  return (scope: Record<string, number>) => compiled.evaluate(scope);
}

/**
 * Detect which standard variables (x, y, z, t, u, v) appear in an expression string.
 */
function detectVariables(expr: string): {
  hasX: boolean;
  hasY: boolean;
  hasZ: boolean;
  hasT: boolean;
  hasU: boolean;
  hasV: boolean;
} {
  try {
    const node = math.parse(expr);
    let hasX = false;
    let hasY = false;
    let hasZ = false;
    let hasT = false;
    let hasU = false;
    let hasV = false;

    node.traverse((n) => {
      if (n.type === 'SymbolNode') {
        const name = (n as unknown as { name: string }).name;
        if (name === 'x') hasX = true;
        else if (name === 'y') hasY = true;
        else if (name === 'z') hasZ = true;
        else if (name === 't') hasT = true;
        else if (name === 'u') hasU = true;
        else if (name === 'v') hasV = true;
      }
    });

    return { hasX, hasY, hasZ, hasT, hasU, hasV };
  } catch {
    return { hasX: false, hasY: false, hasZ: false, hasT: false, hasU: false, hasV: false };
  }
}

/**
 * Evaluate a literal numeric argument with mathjs.
 * Returns null if the arg references variables (would need lazy eval).
 */
function evalConstantArg(expr: string): number | null {
  try {
    const result = math.evaluate(expr);
    if (typeof result === 'number' && Number.isFinite(result)) return result;
    return null;
  } catch {
    return null;
  }
}

/**
 * Try to parse named 3D primitives: sphere(r), cylinder(r, h).
 * Returns null if the input doesn't start with a primitive name.
 */
function tryParsePrimitive3D(raw: string): ParsedExpression | null {
  const match = raw.match(/^\s*(sphere|cylinder)\s*\(\s*(.*)\s*\)\s*$/);
  if (!match) return null;

  const kind = match[1] as 'sphere' | 'cylinder';
  const argsStr = match[2];

  const args = argsStr.split(',').map((s) => s.trim()).filter((s) => s.length > 0);

  if (kind === 'sphere') {
    if (args.length !== 1) {
      return makeInvalid('sphere(r) takes exactly one argument');
    }
    const r = evalConstantArg(args[0]);
    if (r === null || r <= 0) {
      return makeInvalid('sphere(r): r must be a positive number');
    }
    return {
      type: 'primitive3d',
      evaluator: null,
      parametricEvaluator: null,
      parametric3DEvaluator: null,
      inequalityOp: null,
      primitive: { kind: 'sphere', r },
      freeVariables: [],
      error: null,
    };
  }

  // cylinder
  if (args.length !== 2) {
    return makeInvalid('cylinder(r, h) takes two arguments');
  }
  const r = evalConstantArg(args[0]);
  const h = evalConstantArg(args[1]);
  if (r === null || r <= 0) {
    return makeInvalid('cylinder(r, h): r must be a positive number');
  }
  if (h === null || h <= 0) {
    return makeInvalid('cylinder(r, h): h must be a positive number');
  }
  return {
    type: 'primitive3d',
    evaluator: null,
    parametricEvaluator: null,
    parametric3DEvaluator: null,
    inequalityOp: null,
    primitive: { kind: 'cylinder', r, h },
    freeVariables: [],
    error: null,
  };
}

/**
 * Split a parenthesized tuple "(a, b, c)" on top-level commas.
 * Respects nested parens / brackets / braces. Returns null if the input is
 * not parenthesized.
 */
function splitTuple(raw: string): string[] | null {
  const trimmed = raw.trim();
  if (trimmed[0] !== '(' || trimmed[trimmed.length - 1] !== ')') return null;
  const inner = trimmed.slice(1, -1);
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) {
      parts.push(inner.slice(start, i).trim());
      start = i + 1;
    }
  }
  if (depth !== 0) return null;
  parts.push(inner.slice(start).trim());
  return parts.every((p) => p.length > 0) ? parts : null;
}

/**
 * Try to parse a parametric expression. Supported forms:
 *   2-tuple, only t                     -> parametric (2D)
 *   3-tuple, only t (no u, v)           -> parametric_curve3d
 *   3-tuple, u and/or v (no t, x, y, z) -> parametric_surface3d
 * Returns null when the input is not a tuple at all (so other parsers can try).
 * Returns an `invalid` ParsedExpression when the tuple is malformed.
 */
function tryParseParametric(raw: string): ParsedExpression | null {
  const parts = splitTuple(raw);
  if (parts === null) return null;

  const partVars = parts.map(detectVariables);
  const anyXYZ = partVars.some((v) => v.hasX || v.hasY || v.hasZ);
  const anyT = partVars.some((v) => v.hasT);
  const anyUV = partVars.some((v) => v.hasU || v.hasV);

  // 2-tuple: must be 2D parametric of t.
  if (parts.length === 2) {
    if (anyXYZ || anyUV || !anyT) return null;
    try {
      const compiledFx = math.compile(parts[0]);
      const compiledFy = math.compile(parts[1]);
      const freeVariables = extractFreeVariables(raw);
      return {
        type: 'parametric',
        evaluator: null,
        parametricEvaluator: {
          fx: makeEvaluator(compiledFx),
          fy: makeEvaluator(compiledFy),
        },
        parametric3DEvaluator: null,
        inequalityOp: null,
        primitive: null,
        freeVariables,
        error: null,
      };
    } catch (e) {
      return makeInvalid(e instanceof Error ? e.message : 'Failed to parse parametric expression');
    }
  }

  // 3-tuple: parametric curve (t) or surface (u, v).
  if (parts.length === 3) {
    if (anyXYZ) return makeInvalid('3D parametric must use t (curve) or u, v (surface), not x/y/z');
    const isCurve = anyT && !anyUV;
    const isSurface = anyUV && !anyT;
    if (!isCurve && !isSurface) {
      return makeInvalid('3D parametric must use either t (curve) or u, v (surface)');
    }
    try {
      const fx = makeEvaluator(math.compile(parts[0]));
      const fy = makeEvaluator(math.compile(parts[1]));
      const fz = makeEvaluator(math.compile(parts[2]));
      const freeVariables = extractFreeVariables(raw);
      return {
        type: isCurve ? 'parametric_curve3d' : 'parametric_surface3d',
        evaluator: null,
        parametricEvaluator: null,
        parametric3DEvaluator: { fx, fy, fz },
        inequalityOp: null,
        primitive: null,
        freeVariables,
        error: null,
      };
    } catch (e) {
      return makeInvalid(e instanceof Error ? e.message : 'Failed to parse 3D parametric expression');
    }
  }

  return null;
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

  // Try named 3D primitives: sphere(r), cylinder(r, h)
  const primitive = tryParsePrimitive3D(trimmed);
  if (primitive) return primitive;

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
      parametric3DEvaluator: null,
      inequalityOp: op,
      primitive: null,
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

  // Case: z = f(x, y) (3D explicit)
  if (lhsTrimmed === 'z') {
    return parseExplicit3D(rhsTrimmed, raw);
  }
  if (rhsTrimmed === 'z') {
    return parseExplicit3D(lhsTrimmed, raw);
  }

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
  // If z is referenced, this is an implicit 3D surface F(x, y, z) = 0.
  try {
    const implicitExpr = `(${lhsTrimmed}) - (${rhsTrimmed})`;
    const compiled = math.compile(implicitExpr);
    const freeVariables = extractFreeVariables(raw);
    const vars = detectVariables(implicitExpr);
    const type: ExpressionType = vars.hasZ ? 'implicit3d' : 'implicit';

    return {
      type,
      evaluator: makeEvaluator(compiled),
      parametricEvaluator: null,
      parametric3DEvaluator: null,
      inequalityOp: null,
      primitive: null,
      freeVariables,
      error: null,
    };
  } catch (e) {
    return makeInvalid(e instanceof Error ? e.message : 'Failed to parse equation');
  }
}

function parseExplicit3D(expr: string, raw: string): ParsedExpression {
  try {
    const compiled = math.compile(expr);
    const freeVariables = extractFreeVariables(raw);

    return {
      type: 'explicit3d',
      evaluator: makeEvaluator(compiled),
      parametricEvaluator: null,
      parametric3DEvaluator: null,
      inequalityOp: null,
      primitive: null,
      freeVariables,
      error: null,
    };
  } catch (e) {
    return makeInvalid(e instanceof Error ? e.message : 'Failed to parse 3D expression');
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
      parametric3DEvaluator: null,
      inequalityOp: null,
      primitive: null,
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

    // Bare expression containing z -> treat as z = f(x, y)
    if (vars.hasZ) {
      return parseExplicit3D(raw, raw);
    }

    // If the expression contains both x and y, treat as implicit (= 0)
    if (vars.hasX && vars.hasY) {
      const compiled = math.compile(raw);
      const freeVariables = extractFreeVariables(raw);

      return {
        type: 'implicit',
        evaluator: makeEvaluator(compiled),
        parametricEvaluator: null,
        parametric3DEvaluator: null,
        inequalityOp: null,
        primitive: null,
        freeVariables,
        error: null,
      };
    }

    // Default: explicit y = f(x)
    const compiled = math.compile(raw);
    const freeVariables = extractFreeVariables(raw);

    return {
      type: 'explicit',
      evaluator: makeEvaluator(compiled),
      parametricEvaluator: null,
      parametric3DEvaluator: null,
      inequalityOp: null,
      primitive: null,
      freeVariables,
      error: null,
    };
  } catch (e) {
    return makeInvalid(e instanceof Error ? e.message : 'Failed to parse expression');
  }
}
