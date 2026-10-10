export interface Fraction {
  num: number;
  den: number;
}

export interface MixedFraction {
  whole: number;
  num: number;
  den: number;
}

/**
 * Greatest Common Divisor (GCD / ƯCLN)
 */
export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x === 0 ? 1 : x;
}

/**
 * Least Common Multiple (LCM / BCNN)
 */
export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs(Math.round(a * b)) / gcd(a, b);
}

/**
 * Simplify a fraction to its lowest terms (Rút gọn phân số)
 */
export function simplifyFraction(fraction: Fraction): Fraction {
  if (fraction.den === 0) {
    throw new Error('Mẫu số không thể bằng 0');
  }
  const sign = (fraction.num < 0) !== (fraction.den < 0) ? -1 : 1;
  const absNum = Math.abs(Math.round(fraction.num));
  const absDen = Math.abs(Math.round(fraction.den));
  const divisor = gcd(absNum, absDen);

  return {
    num: sign * (absNum / divisor),
    den: absDen / divisor,
  };
}

/**
 * Check if two fractions are mathematically equivalent
 */
export function areFractionsEqual(f1: Fraction, f2: Fraction): boolean {
  if (f1.den === 0 || f2.den === 0) return false;
  const s1 = simplifyFraction(f1);
  const s2 = simplifyFraction(f2);
  return s1.num === s2.num && s1.den === s2.den;
}

/**
 * Add two fractions: f1 + f2
 */
export function addFractions(f1: Fraction, f2: Fraction): Fraction {
  if (f1.den === 0 || f2.den === 0) throw new Error('Mẫu số không thể bằng 0');
  const commonDen = lcm(f1.den, f2.den);
  const num = f1.num * (commonDen / f1.den) + f2.num * (commonDen / f2.den);
  return simplifyFraction({ num, den: commonDen });
}

/**
 * Subtract two fractions: f1 - f2
 */
export function subtractFractions(f1: Fraction, f2: Fraction): Fraction {
  if (f1.den === 0 || f2.den === 0) throw new Error('Mẫu số không thể bằng 0');
  const commonDen = lcm(f1.den, f2.den);
  const num = f1.num * (commonDen / f1.den) - f2.num * (commonDen / f2.den);
  return simplifyFraction({ num, den: commonDen });
}

/**
 * Multiply two fractions: f1 * f2
 */
export function multiplyFractions(f1: Fraction, f2: Fraction): Fraction {
  if (f1.den === 0 || f2.den === 0) throw new Error('Mẫu số không thể bằng 0');
  return simplifyFraction({
    num: f1.num * f2.num,
    den: f1.den * f2.den,
  });
}

/**
 * Divide two fractions: f1 / f2
 */
export function divideFractions(f1: Fraction, f2: Fraction): Fraction {
  if (f1.den === 0 || f2.den === 0 || f2.num === 0) {
    throw new Error('Không thể chia cho phân số bằng 0');
  }
  return simplifyFraction({
    num: f1.num * f2.den,
    den: f1.den * f2.num,
  });
}

/**
 * Convert an improper fraction to a mixed fraction (Hỗn số)
 * E.g. 5/2 -> 2 1/2
 */
export function toMixedFraction(fraction: Fraction): MixedFraction {
  const s = simplifyFraction(fraction);
  const whole = Math.floor(Math.abs(s.num) / s.den);
  const remainder = Math.abs(s.num) % s.den;
  const sign = s.num < 0 ? -1 : 1;

  return {
    whole: sign * whole,
    num: remainder,
    den: s.den,
  };
}

/**
 * Convert a mixed fraction to an improper fraction
 * E.g. 2 1/2 -> 5/2
 */
export function fromMixedFraction(mixed: MixedFraction): Fraction {
  if (mixed.den === 0) throw new Error('Mẫu số không thể bằng 0');
  const sign = mixed.whole < 0 ? -1 : 1;
  const absWhole = Math.abs(mixed.whole);
  const num = sign * (absWhole * mixed.den + mixed.num);
  return simplifyFraction({ num, den: mixed.den });
}

/**
 * Find Common Denominator (Quy đồng mẫu số hai phân số)
 */
export function findCommonDenominator(
  f1: Fraction,
  f2: Fraction
): {
  commonDen: number;
  f1Scaled: Fraction;
  f2Scaled: Fraction;
  factor1: number;
  factor2: number;
} {
  if (f1.den === 0 || f2.den === 0) throw new Error('Mẫu số không thể bằng 0');
  const commonDen = lcm(f1.den, f2.den);
  const factor1 = commonDen / f1.den;
  const factor2 = commonDen / f2.den;

  return {
    commonDen,
    f1Scaled: { num: f1.num * factor1, den: commonDen },
    f2Scaled: { num: f2.num * factor2, den: commonDen },
    factor1,
    factor2,
  };
}

/**
 * Convert fraction to string representation
 */
export function fractionToString(f: Fraction): string {
  if (f.den === 1) return `${f.num}`;
  return `${f.num}/${f.den}`;
}

/**
 * Convert mixed fraction to string
 */
export function mixedFractionToString(m: MixedFraction): string {
  if (m.num === 0) return `${m.whole}`;
  if (m.whole === 0) return `${m.num}/${m.den}`;
  return `${m.whole} ${m.num}/${m.den}`;
}

/**
 * Parse string into fraction (supports "2/3", "2 1/2", "1.5", "1,5", "4")
 */
export function parseFractionString(input: string): Fraction | null {
  const trimmed = input.trim().replace(/,/g, '.');
  if (!trimmed) return null;

  // Mixed number "2 1/2"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const num = parseInt(mixedMatch[2], 10);
    const den = parseInt(mixedMatch[3], 10);
    if (den === 0) return null;
    return fromMixedFraction({ whole, num, den });
  }

  // Fraction "8/12"
  const fracMatch = trimmed.match(/^(-?\d+)\/(\d+)$/);
  if (fracMatch) {
    const num = parseInt(fracMatch[1], 10);
    const den = parseInt(fracMatch[2], 10);
    if (den === 0) return null;
    return simplifyFraction({ num, den });
  }

  // Decimal "1.5"
  const decMatch = trimmed.match(/^(-?\d+)(?:\.(\d+))?$/);
  if (decMatch) {
    const wholeStr = decMatch[1];
    const fracStr = decMatch[2] || '';
    if (!fracStr) {
      return { num: parseInt(wholeStr, 10), den: 1 };
    }
    const den = Math.pow(10, fracStr.length);
    const num = parseInt(wholeStr, 10) * den + (parseInt(wholeStr, 10) < 0 ? -parseInt(fracStr, 10) : parseInt(fracStr, 10));
    return simplifyFraction({ num, den });
  }

  return null;
}
