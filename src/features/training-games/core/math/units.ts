export type MassUnit = 'tan' | 'ta' | 'yen' | 'kg' | 'g';

export const MASS_UNIT_NAMES: Record<MassUnit, string> = {
  tan: 'tấn',
  ta: 'tạ',
  yen: 'yến',
  kg: 'kg',
  g: 'g',
};

// Base unit: gram (g)
export const MASS_IN_GRAMS: Record<MassUnit, number> = {
  tan: 1_000_000,
  ta: 100_000,
  yen: 10_000,
  kg: 1_000,
  g: 1,
};

/**
 * Convert quantity from one mass unit to another
 * e.g., 1.5 tấn to kg -> 1500 kg
 */
export function convertMass(amount: number, fromUnit: MassUnit, toUnit: MassUnit): number {
  const grams = amount * MASS_IN_GRAMS[fromUnit];
  return grams / MASS_IN_GRAMS[toUnit];
}

/**
 * Floating market financial calculations
 */
export interface TradeCalculation {
  buyPricePerUnit: number;
  quantityBought: number;
  massUnit: MassUnit;
  transportFee: number;
  sellPricePerRetailUnit: number;
  retailUnit: MassUnit;
}

export function calculateFloatingMarketTrade(trade: TradeCalculation): {
  totalCost: number;
  totalQuantityRetail: number;
  totalRevenue: number;
  profitOrLoss: number;
  isProfit: boolean;
} {
  const purchaseCost = trade.buyPricePerUnit * trade.quantityBought;
  const totalCost = purchaseCost + trade.transportFee;

  const totalQuantityRetail = convertMass(trade.quantityBought, trade.massUnit, trade.retailUnit);
  const totalRevenue = totalQuantityRetail * trade.sellPricePerRetailUnit;
  const profitOrLoss = totalRevenue - totalCost;

  return {
    totalCost,
    totalQuantityRetail,
    totalRevenue,
    profitOrLoss,
    isProfit: profitOrLoss >= 0,
  };
}

export function formatVND(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} đ`;
}
