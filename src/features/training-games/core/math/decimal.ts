/**
 * Scaled decimal arithmetic to avoid IEEE-754 floating-point inaccuracies
 * e.g., 0.1 + 0.2 !== 0.3
 */

const DEFAULT_SCALE = 1000; // 3 decimal places precision

export interface ScaledDecimal {
  scaledValue: number; // integer value multiplied by scale
  scale: number;
}

export function parseDecimal(input: string | number, scale = DEFAULT_SCALE): ScaledDecimal | null {
  if (typeof input === 'number') {
    if (isNaN(input) || !isFinite(input)) return null;
    return {
      scaledValue: Math.round(input * scale),
      scale,
    };
  }

  const normalized = input.trim().replace(/,/g, '.');
  if (!normalized || isNaN(Number(normalized))) return null;

  const num = parseFloat(normalized);
  return {
    scaledValue: Math.round(num * scale),
    scale,
  };
}

export function addDecimals(d1: ScaledDecimal, d2: ScaledDecimal): ScaledDecimal {
  if (d1.scale !== d2.scale) {
    throw new Error('Scales must match for addition');
  }
  return {
    scaledValue: d1.scaledValue + d2.scaledValue,
    scale: d1.scale,
  };
}

export function subtractDecimals(d1: ScaledDecimal, d2: ScaledDecimal): ScaledDecimal {
  if (d1.scale !== d2.scale) {
    throw new Error('Scales must match for subtraction');
  }
  return {
    scaledValue: d1.scaledValue - d2.scaledValue,
    scale: d1.scale,
  };
}

export function areDecimalsEqual(d1: ScaledDecimal, d2: ScaledDecimal): boolean {
  if (d1.scale === d2.scale) {
    return d1.scaledValue === d2.scaledValue;
  }
  return d1.scaledValue * d2.scale === d2.scaledValue * d1.scale;
}

export function decimalToNumber(d: ScaledDecimal): number {
  return d.scaledValue / d.scale;
}

export function formatDecimal(d: ScaledDecimal | number, decimalPlaces = 2, useComma = true): string {
  const val = typeof d === 'number' ? d : decimalToNumber(d);
  const formatted = val.toFixed(decimalPlaces).replace(/\.?0+$/, '');
  return useComma ? formatted.replace('.', ',') : formatted;
}
