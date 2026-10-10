export interface Rational { n: number; d: number }

export function rational(n: number, d = 1): Rational {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || d === 0) throw new Error('Invalid rational');
  let a = Math.abs(n), b = Math.abs(d);
  while (b) [a, b] = [b, a % b];
  const divisor = a || 1;
  return { n: n / divisor * Math.sign(d), d: Math.abs(d) / divisor };
}
export function add(a: Rational, b: Rational): Rational { return rational(a.n * b.d + b.n * a.d, a.d * b.d); }
export function subtract(a: Rational, b: Rational): Rational { return rational(a.n * b.d - b.n * a.d, a.d * b.d); }
export function multiply(a: Rational, b: Rational): Rational { return rational(a.n * b.n, a.d * b.d); }
export function divide(a: Rational, b: Rational): Rational { return rational(a.n * b.d, a.d * b.n); }
export function equal(a: Rational, b: Rational): boolean { return a.n === b.n && a.d === b.d; }

// Parse the entire input. Never use parseFloat (which accepts trailing garbage).
export function parseExactAnswer(input: string): Rational | null {
  const text = input.trim().replace(/,/g, '.');
  const fraction = /^([+-]?\d{1,9})\s*\/\s*(\d{1,6})$/.exec(text);
  if (fraction) return Number(fraction[2]) === 0 ? null : rational(Number(fraction[1]), Number(fraction[2]));
  if (!/^[+-]?\d{1,9}(?:\.\d{1,6})?$/.test(text)) return null;
  const [whole, tail = ''] = text.split('.');
  const denominator = 10 ** tail.length;
  const numerator = Number(whole) * denominator + (text.startsWith('-') ? -1 : 1) * Number(tail);
  if (!Number.isSafeInteger(numerator)) return null;
  return rational(numerator, denominator);
}

export function formatAnswer(value: Rational): string {
  if (value.d === 1) return String(value.n);
  let denominator = value.d;
  while (denominator % 2 === 0) denominator /= 2;
  while (denominator % 5 === 0) denominator /= 5;
  return denominator === 1 ? String(value.n / value.d).replace('.', ',') : `${value.n}/${value.d}`;
}
