import {
  simplifyFraction,
  addFractions,
  multiplyFractions,
  areFractionsEqual,
  toMixedFraction,
  fromMixedFraction,
  parseFractionString,
  findCommonDenominator,
} from '../math/fraction';

import {
  parseDecimal,
  addDecimals,
  decimalToNumber,
  areDecimalsEqual,
} from '../math/decimal';

import {
  calculateGridArea,
  calculateGridPerimeter,
  shapeFormulas,
  GridPoint,
} from '../math/geometry';

import { convertMass, calculateFloatingMarketTrade } from '../math/units';

import { classifyAngle, calculateTrajectory } from '../math/angle';

describe('Math Engine Unit Tests', () => {
  describe('Fraction Arithmetic', () => {
    test('8/12 simplifies to 2/3', () => {
      const simplified = simplifyFraction({ num: 8, den: 12 });
      expect(simplified.num).toBe(2);
      expect(simplified.den).toBe(3);
    });

    test('0.5 + 1.0 = 1.5 in fractions', () => {
      const f1 = parseFractionString('0,5')!; // 1/2
      const f2 = parseFractionString('1,0')!; // 1/1
      const sum = addFractions(f1, f2);
      expect(sum.num).toBe(3);
      expect(sum.den).toBe(2);
      expect(areFractionsEqual(sum, { num: 3, den: 2 })).toBe(true);
    });

    test('5 × 1/2 = 2 1/2', () => {
      const five = { num: 5, den: 1 };
      const half = { num: 1, den: 2 };
      const product = multiplyFractions(five, half);
      expect(product.num).toBe(5);
      expect(product.den).toBe(2);

      const mixed = toMixedFraction(product);
      expect(mixed.whole).toBe(2);
      expect(mixed.num).toBe(1);
      expect(mixed.den).toBe(2);

      const improper = fromMixedFraction(mixed);
      expect(improper.num).toBe(5);
      expect(improper.den).toBe(2);
    });

    test('Throws on denominator = 0', () => {
      expect(() => simplifyFraction({ num: 5, den: 0 })).toThrow();
    });

    test('Common denominator for 1/3 and 1/4', () => {
      const res = findCommonDenominator({ num: 1, den: 3 }, { num: 1, den: 4 });
      expect(res.commonDen).toBe(12);
      expect(res.f1Scaled.num).toBe(4);
      expect(res.f2Scaled.num).toBe(3);
    });
  });

  describe('Scaled Decimal Arithmetic', () => {
    test('0.1 + 0.2 equals 0.3 without IEEE float error', () => {
      const d1 = parseDecimal('0.1')!;
      const d2 = parseDecimal('0.2')!;
      const sum = addDecimals(d1, d2);
      const d3 = parseDecimal('0.3')!;

      expect(areDecimalsEqual(sum, d3)).toBe(true);
      expect(decimalToNumber(sum)).toBeCloseTo(0.3, 5);
    });

    test('Accepts both comma and dot for decimals', () => {
      const commaDecimal = parseDecimal('1,5')!;
      const dotDecimal = parseDecimal('1.5')!;
      expect(areDecimalsEqual(commaDecimal, dotDecimal)).toBe(true);
    });
  });

  describe('Geometry Engine: Area and Perimeter', () => {
    test('Grid area counts unique occupied cells', () => {
      const cells: GridPoint[] = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ];
      expect(calculateGridArea(cells)).toBe(4);
    });

    test('Grid perimeter eliminates shared interior edges', () => {
      // 2x2 square: area = 4, perimeter = 8 (not 4 * 4 = 16!)
      const cells: GridPoint[] = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ];
      expect(calculateGridPerimeter(cells)).toBe(8);
    });

    test('Triangle area formula uses perpendicular height', () => {
      // base = 6, height = 4 -> S = (6 * 4) / 2 = 12
      const area = shapeFormulas.triangle.area(6, 4);
      expect(area).toBe(12);
    });

    test('Trapezoid area formula', () => {
      // a = 4, b = 6, h = 3 -> S = ((4 + 6) * 3) / 2 = 15
      const area = shapeFormulas.trapezoid.area(4, 6, 3);
      expect(area).toBe(15);
    });
  });

  describe('Mass Units & Floating Market', () => {
    test('1,5 tấn = 1500 kg', () => {
      const kg = convertMass(1.5, 'tan', 'kg');
      expect(kg).toBe(1500);
    });

    test('8 tạ = 800 kg', () => {
      const kg = convertMass(8, 'ta', 'kg');
      expect(kg).toBe(800);
    });

    test('Trade profit calculation: 1.5 tấn dưa hấu', () => {
      const trade = calculateFloatingMarketTrade({
        buyPricePerUnit: 10_000_000,
        quantityBought: 1.5,
        massUnit: 'tan',
        transportFee: 500_000,
        sellPricePerRetailUnit: 10_000,
        retailUnit: 'kg',
      });

      // Total Cost = 1.5 * 10,000,000 + 500,000 = 15,500,000
      expect(trade.totalCost).toBe(15_500_000);
      // Total Qty = 1,500 kg
      expect(trade.totalQuantityRetail).toBe(1500);
      // Total Revenue = 1,500 * 10,000 = 15,000,000
      expect(trade.totalRevenue).toBe(15_000_000);
      // Profit = 15,000,000 - 15,500,000 = -500,000
      expect(trade.profitOrLoss).toBe(-500_000);
      expect(trade.isProfit).toBe(false);
    });
  });

  describe('Angle & Projectile Physics', () => {
    test('Angle classification: Acute, Right, Obtuse', () => {
      expect(classifyAngle(45).type).toBe('acute');
      expect(classifyAngle(90).type).toBe('right');
      expect(classifyAngle(120).type).toBe('obtuse');
    });

    test('Angle 120° shoots in opposite direction (towards left) from 60° (towards right)', () => {
      const originX = 100;
      const originY = 100;

      // 60 degrees (acute): cos(60) = 0.5 > 0 -> x increases (moves right)
      const acutePoints = calculateTrajectory(originX, originY, 60, 15);
      expect(acutePoints[1].x).toBeGreaterThan(originX);

      // 120 degrees (obtuse): cos(120) = -0.5 < 0 -> x decreases (moves left)
      const obtusePoints = calculateTrajectory(originX, originY, 120, 15);
      expect(obtusePoints[1].x).toBeLessThan(originX);
    });
  });
});
