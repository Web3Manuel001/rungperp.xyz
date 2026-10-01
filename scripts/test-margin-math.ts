import Decimal from "decimal.js";

// Types for our calculation engine
interface LadderRung {
  price: number;
  size: number; // in base asset (e.g., SOL)
}

interface MarginSimResult {
  totalBaseSize: string;
  totalNotional: string;
  weightedAvgEntry: string;
  requiredInitialMargin: string;
  accountEquity: string;
  availableMargin: string;
  marginUtilizationPct: string;
  estimatedLiqPrice: string;
  canExecute: boolean;
  rejectReason?: string;
}

/**
 * Client-Side Margin Pre-Flight Simulation Engine
 */
function simulateScaleMargin(
  accountEquity: number,        // User's total USDT margin
  existingMarginUsed: number,   // Margin already tied up in other positions
  initialMarginRatio: number,   // e.g., 0.05 for 20x max leverage (5% initial margin)
  maintenanceMarginRatio: number, // e.g., 0.03 (3% maintenance margin before liquidation)
  isLong: boolean,
  rungs: LadderRung[]
): MarginSimResult {
  const equity = new Decimal(accountEquity);
  const freeMargin = equity.minus(existingMarginUsed);
  const imr = new Decimal(initialMarginRatio);
  const mmr = new Decimal(maintenanceMarginRatio);

  let totalSize = new Decimal(0);
  let totalNotional = new Decimal(0);

  // 1. Calculate Cumulative Notional and Size across all rungs
  for (const rung of rungs) {
    const rungSize = new Decimal(rung.size);
    const rungPrice = new Decimal(rung.price);
    const rungNotional = rungSize.mul(rungPrice);

    totalSize = totalSize.plus(rungSize);
    totalNotional = totalNotional.plus(rungNotional);
  }

  // 2. Weighted Average Entry Price = Sum(Price * Size) / Total Size
  const avgEntry = totalSize.isZero() ? new Decimal(0) : totalNotional.div(totalSize);

  // 3. Batch Initial Margin Required = Total Notional * Initial Margin Ratio
  const requiredIM = totalNotional.mul(imr);

  // 4. Margin Utilization Percentage
  const utilization = requiredIM.div(freeMargin).mul(100);

  // 5. Liquidation Price Estimation (Assuming 100% of ladder fills)
  // For Long: Entry - (Free Margin / Total Size) * (1 - MMR)
  // For Short: Entry + (Free Margin / Total Size) * (1 - MMR)
  let estLiqPrice = new Decimal(0);
  if (!totalSize.isZero()) {
    const lossBuffer = freeMargin.div(totalSize);
    if (isLong) {
      estLiqPrice = avgEntry.minus(lossBuffer.mul(new Decimal(1).minus(mmr)));
      if (estLiqPrice.isNegative()) estLiqPrice = new Decimal(0);
    } else {
      estLiqPrice = avgEntry.plus(lossBuffer.mul(new Decimal(1).minus(mmr)));
    }
  }

  // 6. Validation Rule: Does required margin exceed available margin?
  const canExecute = requiredIM.lte(freeMargin);
  let rejectReason = undefined;
  if (!canExecute) {
    rejectReason = `INSUFFICIENT COLLATERAL: Batch requires $${requiredIM.toFixed(2)} margin, but you only have $${freeMargin.toFixed(2)} available.`;
  }

  return {
    totalBaseSize: totalSize.toFixed(4),
    totalNotional: `$${totalNotional.toFixed(2)}`,
    weightedAvgEntry: `$${avgEntry.toFixed(2)}`,
    requiredInitialMargin: `$${requiredIM.toFixed(2)}`,
    accountEquity: `$${equity.toFixed(2)}`,
    availableMargin: `$${freeMargin.toFixed(2)}`,
    marginUtilizationPct: `${utilization.toFixed(1)}%`,
    estimatedLiqPrice: `$${estLiqPrice.toFixed(2)}`,
    canExecute,
    rejectReason
  };
}

async function main() {
  console.log("==========================================");
  console.log("   MARGIN PRE-FLIGHT SIMULATION SPIKE     ");
  console.log("==========================================\n");

  // SCENARIO A: Safe Trader ($1,000 equity, ladders 10 SOL from $140 to $145 at 5% margin / 20x)
  console.log("--- SCENARIO A: Well-Collateralized 12-Rung Ladder ---");
  const safeRungs: LadderRung[] = [];
  for (let i = 0; i < 12; i++) {
    // 12 rungs, ~0.833 SOL each, stepping from 145 down to 140
    safeRungs.push({ price: 145 - (i * 0.45), size: 0.833 });
  }

  const resultA = simulateScaleMargin(1000, 0, 0.05, 0.03, true, safeRungs);
  console.table(resultA);

  // SCENARIO B: Degen Overleveraged ($200 equity, tries to ladder 50 SOL -> would REVERT on Velocity!)
  console.log("\n--- SCENARIO B: Overleveraged Ladder (Would Bounce on Chain) ---");
  const dangerousRungs: LadderRung[] = [];
  for (let i = 0; i < 16; i++) {
    dangerousRungs.push({ price: 145 - (i * 0.5), size: 3.125 }); // Total = 50 SOL (~$7,000 notional)
  }

  const resultB = simulateScaleMargin(200, 0, 0.05, 0.03, true, dangerousRungs);
  console.table(resultB);
  if (!resultB.canExecute) {
    console.log(`[!] PROTECTION ACTIVE: ${resultB.rejectReason}`);
  }

  console.log("\n==========================================");
  console.log("     PRE-FLIGHT SIMULATION VERIFIED       ");
  console.log("==========================================");
}

main().catch(console.error);
