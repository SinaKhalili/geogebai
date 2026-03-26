import { create, all } from 'mathjs';
import type { MathNode } from 'mathjs';

const math = create(all);

const STANDARD_VARS = new Set(['x', 'y', 't']);

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
 * Extract free variables from a math expression string.
 * Returns unique sorted array of variable names that are not standard
 * variables (x, y, t), math functions, or constants.
 */
export function extractFreeVariables(expression: string): string[] {
  if (!expression.trim()) return [];

  // Strip inequality/equality operators to get parseable expressions
  const cleaned = expression
    .replace(/[<>]=?/g, '-')
    .replace(/(?<!=)=(?!=)/g, '-');

  try {
    const node = math.parse(cleaned);
    const variables = new Set<string>();

    node.traverse((node: MathNode) => {
      if (node.type === 'SymbolNode') {
        const name = (node as MathNode & { name: string }).name;
        if (!EXCLUDED.has(name)) {
          variables.add(name);
        }
      }
    });

    return Array.from(variables).sort();
  } catch {
    return [];
  }
}
