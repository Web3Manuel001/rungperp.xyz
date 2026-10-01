import Decimal from "decimal.js";

export type SizeDistribution = "flat" | "ascending" | "descending";

export interface GeneratedRung {
  price: number;
  size: number;
  notional: number;
}

export interface ScaleConfig {
  startPrice: number;
  endPrice: number;
  totalSize: number;
  rungCount: number;
  distribution: SizeDistribution;
}

/**
 * Generates deterministic scale ladder rungs
 * Hard-capped at 24 rungs to protect Solana MTU and leave subaccount slots for TP/SL
 */
export function generateScaleRungs(config: ScaleConfig): GeneratedRung[] {
  const { startPrice, endPrice, totalSize, rungCount, distribution } = config;

  if (rungCount < 2) throw new Error("Rung count must be at least 2");
  if (rungCount > 24) throw new Error("Rung count cannot exceed 24 (Solana MTU safety limit)");
  if (totalSize <= 0) throw new Error("Total size must be greater than 0");

  const start = new Decimal(startPrice);
  const end = new Decimal(endPrice);
  const total = new Decimal(totalSize);
  const n = rungCount;

  // 1. Calculate price step
  const priceStep = end.minus(start).div(n - 1);

  // 2. Calculate weight distribution for sizes
  const weights: Decimal[] = [];
  if (distribution === "flat") {
    const flatWeight = new Decimal(1).div(n);
    for (let i = 0; i < n; i++) weights.push(flatWeight);
  } else if (distribution === "ascending") {
    // Smaller orders near startPrice, larger orders near endPrice
    const sumWeights = new Decimal((n * (n + 1)) / 2);
    for (let i = 1; i <= n; i++) {
      weights.push(new Decimal(i).div(sumWeights));
    }
  } else if (distribution === "descending") {
    // Larger orders near startPrice, smaller orders near endPrice
    const sumWeights = new Decimal((n * (n + 1)) / 2);
    for (let i = n; i >= 1; i--) {
      weights.push(new Decimal(i).div(sumWeights));
    }
  }

  // 3. Construct rungs with rounded decimal precision
  const rungs: GeneratedRung[] = [];
  for (let i = 0; i < n; i++) {
    const rungPrice = start.plus(priceStep.mul(i)).toNumber();
    const rungSize = total.mul(weights[i]).toNumber();
    const rungNotional = new Decimal(rungPrice).mul(rungSize).toNumber();

    rungs.push({
      price: Number(rungPrice.toFixed(4)),
      size: Number(rungSize.toFixed(4)),
      notional: Number(rungNotional.toFixed(2))
    });
  }

  return rungs;
}
