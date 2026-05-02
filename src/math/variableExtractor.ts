import { create, all } from 'mathjs';
import type { MathNode } from 'mathjs';

const math = create(all);

const STANDARD_VARS = new Set(['x', 'y', 'z', 't', 'u', 'v']);

const MATH_FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
  'log', 'ln', 'exp', 'sqrt', 'abs', 'ceil', 'floor', 'round',
  'sign', 'min', 'max', 'pow',
  // Additional common mathjs functions
  'sec', 'csc', 'cot', 'sinh', 'cosh', 'tanh',
  'asinh', 'acosh', 'atanh',
  'log2', 'log10', 'mod', 'gcd', 'lcm',
  'factorial', 'gamma', 'cbrt', 'nthRoot',
]);

const CONSTANTS = new Set([
  'pi', 'e', 'i', 'Infinity', 'NaN', 'true', 'false', 'null',
  'PI', 'E', 'LN2', 'LN10', 'LOG2E', 'LOG10E', 'SQRT2', 'SQRT1_2',
  'phi', 'tau',
]);

const EXCLUDED = new Set([...STANDARD_VARS, ...MATH_FUNCTIONS, ...CONSTANTS]);

/**
 * Strip an outer wrapping pair of parentheses if they enclose the entire string.
 * Returns the original string when the outer paren closes before the end
 * (e.g. `(x-1)*y`).
 */
function stripOuterParens(s: string): string {
  const trimmed = s.trim();
  if (trimmed.length < 2 || trimmed[0] !== '(' || trimmed[trimmed.length - 1] !== ')') {
    return trimmed;
  }
  let depth = 0;
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === '(') depth++;
    else if (trimmed[i] === ')') {
      depth--;
      if (depth === 0 && i < trimmed.length - 1) return trimmed;
    }
  }
  return trimmed.slice(1, -1);
}

/**
 * Split a string on top-level commas, ignoring commas inside nested
 * parentheses or brackets.
 */
function splitTopLevelCommas(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === ',' && depth === 0) {
      parts.push(s.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(s.slice(start));
  return parts;
}

/**
 * Extract free variables from a math expression string.
 * Returns unique sorted array of variable names that are not standard
 * variables (x, y, t), math functions, or constants.
 */
export function extractFreeVariables(expression: string): string[] {
  if (!expression.trim()) return [];

  // Strip inequality/equality operators so each side becomes a plain expression
  const cleaned = expression
    .replace(/[<>]=?/g, '-')
    .replace(/(?<!=)=(?!=)/g, '-');

  // Parametric expressions take the form `(fx(t), fy(t))`. mathjs cannot
  // parse a top-level tuple, so strip the wrapping parens and split on the
  // top-level comma, then parse each piece independently.
  const pieces = splitTopLevelCommas(stripOuterParens(cleaned));
  const variables = new Set<string>();

  for (const piece of pieces) {
    const trimmed = piece.trim();
    if (!trimmed) continue;
    try {
      const node = math.parse(trimmed);
      node.traverse((n: MathNode) => {
        if (n.type === 'SymbolNode') {
          const name = (n as MathNode & { name: string }).name;
          if (!EXCLUDED.has(name)) variables.add(name);
        }
      });
    } catch {
      // partial extraction is better than none
    }
  }

  return Array.from(variables).sort();
}
