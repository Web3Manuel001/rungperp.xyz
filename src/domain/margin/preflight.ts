import Decimal from "decimal.js";
import { GeneratedRung } from "../scale/generator";

export interface PreFlightCheckResult {
  totalBaseSize: number;
  totalNotional: number;
  weightedAvgEntry: number;
  requiredInitialMargin: number;
  availableMargin: number;
  marginUtilizationPct: number;
  estimatedLiqPrice: number;
  canExecute: boolean;
  rejectReason?: string;
}

export function validateLadderMargin(
  accountEquity: number,
  existingMarginUsed: number,
  initialMarginRatio: number,
  maintenanceMarginRatio: number,
  isLong: boolean,
  rungs: GeneratedRung[]
): PreFlightCheckResult {
  const equity = new Decimal(accountEquity);
  const freeMargin = equity.minus(existingMarginUsed);
  const imr = new Decimal(initialMarginRatio);
  const mmr = new Decimal(maintenanceMarginRatio);

  let totalSize = new Decimal(0);
  let totalNotional = new Decimal(0);

  for (const rung of rungs) {
    totalSize = totalSize.plus(rung.size);
    totalNotional = totalNotional.plus(rung.notional);
  }

  const avgEntry = totalSize.isZero() ? new Decimal(0) : totalNotional.div(totalSize);
  const requiredIM = totalNotional.mul(imr);
  const utilization = freeMargin.isZero() ? new Decimal(100) : requiredIM.div(freeMargin).mul(100);

  let estLiqPrice = new Decimal(0);
  if (!totalSize.isZero() && freeMargin.isPositive()) {
    const lossBuffer = freeMargin.div(totalSize);
    if (isLong) {
      estLiqPrice = avgEntry.minus(lossBuffer.mul(new Decimal(1).minus(mmr)));
      if (estLiqPrice.isNegative()) estLiqPrice = new Decimal(0);
    } else {
      estLiqPrice = avgEntry.plus(lossBuffer.mul(new Decimal(1).minus(mmr)));
    }
  }

  const canExecute = requiredIM.lte(freeMargin);

  return {
    totalBaseSize: Number(totalSize.toFixed(4)),
    totalNotional: Number(totalNotional.toFixed(2)),
    weightedAvgEntry: Number(avgEntry.toFixed(2)),
    requiredInitialMargin: Number(requiredIM.toFixed(2)),
    availableMargin: Number(freeMargin.toFixed(2)),
    marginUtilizationPct: Number(utilization.toFixed(1)),
    estimatedLiqPrice: Number(estLiqPrice.toFixed(2)),
    canExecute,
    rejectReason: canExecute 
      ? undefined 
      : `Insufficient Collateral: Batch requires $${requiredIM.toFixed(2)} margin, but only $${freeMargin.toFixed(2)} available.`
  };
}
