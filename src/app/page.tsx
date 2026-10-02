"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { generateScaleRungs, SizeDistribution } from "@/domain/scale/generator";
import { validateLadderMargin } from "@/domain/margin/preflight";
import { executeScaleOrder } from "@/adapters/live/VelocityTradingAdapter";
import BuilderOnboardingModal from "@/components/terminal/BuilderOnboardingModal";
import { ShieldCheck, Zap, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight, Layers, Clock, Wallet, ExternalLink, Loader2 } from "lucide-react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

const TradingChart = dynamic(() => import("@/components/terminal/TradingChart"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs">
      Loading TradingView Engine...
    </div>
  ),
});

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export default function TerminalPage() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { connected } = wallet;

  // Trading configuration
  const [isLong, setIsLong] = useState<boolean>(true);
  const [currentMarketPrice] = useState<number>(118.40);
  const [startPrice, setStartPrice] = useState<number>(114.00);
  const [endPrice, setEndPrice] = useState<number>(118.00);
  const [totalSize, setTotalSize] = useState<number>(10);
  const [rungCount, setRungCount] = useState<number>(8);
  const [distribution, setDistribution] = useState<SizeDistribution>("ascending");
  const [userEquity] = useState<number>(1000);

  // Execution state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"orders" | "positions" | "history">("orders");

  // 1. Generate Rungs using pure domain engine
  const rungs = useMemo(() => {
    try {
      return generateScaleRungs({
        startPrice,
        endPrice,
        totalSize,
        rungCount,
        distribution,
      });
    } catch (e) {
      return [];
    }
  }, [startPrice, endPrice, totalSize, rungCount, distribution]);

  // 2. Pre-flight margin simulation
  const sim = useMemo(() => {
    return validateLadderMargin(
      userEquity,
      0,
      0.05,
      0.03,
      isLong,
      rungs
    );
  }, [userEquity, isLong, rungs]);

  // 3. Handle Scale Submission
  const handleDeployScale = async () => {
    if (!connected || !sim.canExecute) return;

    setIsSubmitting(true);
    setTxError(null);
    setTxSignature(null);

    try {
      const signature = await executeScaleOrder({
        connection,
        wallet,
        isLong,
        startPrice,
        endPrice,
        totalSize,
        rungCount,
        distribution
      });

      setTxSignature(signature);
    } catch (err: any) {
      console.error("Scale Order Submission Error:", err);
      setTxError(err.message || "Transaction rejected by wallet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-neutral-200 flex flex-col items-center">
      <BuilderOnboardingModal />
      {/* ----------------- TOP APP BAR ----------------- */}
      <header className="w-full h-14 border-b border-border bg-surface/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center font-bold text-white text-sm shadow-md">
              R
            </div>
            <span className="font-extrabold text-white tracking-widest text-base">
              FLIP<span className="text-brand font-normal text-xs ml-1 px-1.5 py-0.5 rounded bg-brand/10 border border-brand/20">PERP</span>
            </span>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              VELOCITY DEVNET
            </span>
            <span className="text-neutral-500">|</span>
            <span className="text-neutral-400 font-mono">
              SOL-PERP: <span className="text-emerald-400 font-semibold">${currentMarketPrice}</span>
            </span>
          </div>
        </div>

        {/* Spot Margin Yield Counter & Wallet */}
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-3 bg-neutral-900/90 border border-neutral-800 px-3 py-1.5 rounded-lg text-xs">
            <TrendingUp className="w-3.5 h-3.5 text-brand" />
            <span className="text-neutral-400">Margin APY:</span>
            <span className="text-emerald-400 font-semibold font-mono">10.96%</span>
            <span className="text-neutral-600">|</span>
            <span className="text-neutral-400">Earned:</span>
            <span className="text-white font-mono font-medium">+$0.48 USDT</span>
          </div>

          <WalletMultiButton />
        </div>
      </header>

      {/* ----------------- BOXED TERMINAL CONTAINER ----------------- */}
      <main className="w-full max-w-[1540px] p-3 md:p-6 flex-1 flex flex-col">
        {/* Transaction Alerts */}
        {txSignature && (
          <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center justify-between shadow-lg">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Scale Order successfully broadcast to Solana Devnet!
            </span>
            <a
              href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 underline font-mono flex items-center gap-1 hover:text-white"
            >
              View on Explorer <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {txError && (
          <div className="mb-4 p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center justify-between shadow-lg">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              {txError}
            </span>
            <button onClick={() => setTxError(null)} className="text-rose-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Main Inset Cockpit Frame */}
        <div className="flex-1 flex flex-col lg:flex-row border border-border/80 rounded-2xl overflow-hidden bg-surface/30 shadow-2xl backdrop-blur-sm min-h-[720px]">
          
          {/* LEFT COLUMN: Chart + Bottom Tabs */}
          <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-border bg-background/50 relative">
            {/* Chart Toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface/60 shrink-0">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-bold text-white tracking-wide">SOL-PERP</span>
                <span className="text-[11px] text-neutral-400 bg-surface px-2 py-0.5 rounded border border-border">
                  Velocity DLOB
                </span>
                <div className="flex items-center space-x-1 text-xs">
                  {["1m", "5m", "15m", "1h", "4h", "1D"].map((tf) => (
                    <button
                      key={tf}
                      className={`px-2 py-0.5 rounded text-[11px] transition ${
                        tf === "15m" ? "bg-neutral-800 text-white font-medium" : "text-neutral-500 hover:text-neutral-300"
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-xs text-neutral-400 font-mono">
                Active Ladder: <span className="text-emerald-400 font-semibold">{rungs.length} Orders</span>
              </div>
            </div>

            {/* TradingView Canvas */}
            <div className="flex-1 w-full min-h-[460px] relative">
              <TradingChart rungs={rungs} />
            </div>

            {/* BOTTOM DOCK */}
            <div className="h-48 border-t border-border bg-surface/40 flex flex-col shrink-0">
              <div className="flex items-center space-x-6 px-4 border-b border-border bg-surface/80 text-xs">
                <button
                  onClick={() => setActiveTab("orders")}
                  className={`py-2.5 font-medium border-b-2 transition flex items-center gap-1.5 ${
                    activeTab === "orders" ? "border-brand text-white" : "border-transparent text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Staged Scale Ladder ({rungs.length})
                </button>
                <button
                  onClick={() => setActiveTab("positions")}
                  className={`py-2.5 font-medium border-b-2 transition flex items-center gap-1.5 ${
                    activeTab === "positions" ? "border-brand text-white" : "border-transparent text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  Positions (0)
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`py-2.5 font-medium border-b-2 transition flex items-center gap-1.5 ${
                    activeTab === "history" ? "border-brand text-white" : "border-transparent text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Trade History
                </button>
              </div>

              {/* Table */}
              <div className="flex-1 p-3 overflow-y-auto font-mono text-[11px]">
                {activeTab === "orders" && (
                  <div className="w-full">
                    <div className="grid grid-cols-5 text-neutral-500 pb-1.5 border-b border-border/40 text-[10px] uppercase">
                      <span>Rung #</span>
                      <span>Direction</span>
                      <span>Price ($)</span>
                      <span>Size (SOL)</span>
                      <span>Notional ($)</span>
                    </div>
                    {rungs.map((r, i) => (
                      <div key={i} className="grid grid-cols-5 py-1.5 border-b border-border/20 text-neutral-300">
                        <span className="text-neutral-500">#{i + 1}</span>
                        <span className={isLong ? "text-emerald-400 font-medium" : "text-rose-400 font-medium"}>
                          {isLong ? "BUY / LONG" : "SELL / SHORT"}
                        </span>
                        <span className="text-white">${r.price.toFixed(2)}</span>
                        <span>{r.size.toFixed(4)} SOL</span>
                        <span className="text-neutral-400">${r.notional.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === "positions" && (
                  <div className="h-full flex items-center justify-center text-neutral-500 text-xs">
                    No open positions on Velocity Devnet.
                  </div>
                )}
                {activeTab === "history" && (
                  <div className="h-full flex items-center justify-center text-neutral-500 text-xs">
                    No trade history found.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: The Scale Execution Panel */}
          <div className="w-full lg:w-[410px] bg-surface/70 flex flex-col border-t lg:border-t-0 border-border shrink-0">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-brand" />
                <h3 className="font-semibold text-sm text-white">Scale Order Engine</h3>
              </div>
              <span className="text-[10px] tracking-wide uppercase text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded font-mono">
                0% Maker Fee
              </span>
            </div>

            <div className="p-4 space-y-4 text-xs flex-1 overflow-y-auto">
              {/* Direction */}
              <div className="grid grid-cols-2 gap-2 bg-background p-1 rounded-lg border border-border">
                <button
                  onClick={() => setIsLong(true)}
                  className={`py-1.5 rounded-md font-semibold flex items-center justify-center gap-1.5 transition text-xs ${
                    isLong
                      ? "bg-long/20 text-emerald-400 border border-emerald-500/30 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Long (Bids)
                </button>
                <button
                  onClick={() => setIsLong(false)}
                  className={`py-1.5 rounded-md font-semibold flex items-center justify-center gap-1.5 transition text-xs ${
                    !isLong
                      ? "bg-short/20 text-rose-400 border border-rose-500/30 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  Short (Asks)
                </button>
              </div>

              {/* Price Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1 font-medium">Start Price ($)</label>
                  <input
                    type="number"
                    value={startPrice}
                    onChange={(e) => setStartPrice(Number(e.target.value))}
                    className="w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-white font-mono focus:border-brand outline-none transition"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1 font-medium">End Price ($)</label>
                  <input
                    type="number"
                    value={endPrice}
                    onChange={(e) => setEndPrice(Number(e.target.value))}
                    className="w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-white font-mono focus:border-brand outline-none transition"
                  />
                </div>
              </div>

              {/* Size & Rungs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1 font-medium">Total Size (SOL)</label>
                  <input
                    type="number"
                    value={totalSize}
                    onChange={(e) => setTotalSize(Number(e.target.value))}
                    className="w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-white font-mono focus:border-brand outline-none transition"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1 font-medium">
                    Rungs ({rungCount})
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="20"
                    value={rungCount}
                    onChange={(e) => setRungCount(Number(e.target.value))}
                    className="w-full accent-brand mt-2 cursor-pointer"
                  />
                </div>
              </div>

              {/* Distribution */}
              <div>
                <label className="text-neutral-400 block mb-1.5 font-medium">Size Distribution</label>
                <div className="grid grid-cols-3 gap-1.5 bg-background p-1 rounded-md border border-border">
                  {(["flat", "ascending", "descending"] as SizeDistribution[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDistribution(d)}
                      className={`py-1 text-[11px] rounded capitalize transition font-medium ${
                        distribution === d
                          ? "bg-surface text-brand font-semibold shadow-sm border border-border"
                          : "text-neutral-500 hover:text-neutral-300"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pre-Flight Simulation */}
              <div className="bg-background/90 border border-border rounded-xl p-3.5 space-y-2 mt-4 shadow-inner">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-brand" />
                    PRE-FLIGHT SIMULATION
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      sim.canExecute ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40" : "bg-rose-950/80 text-rose-400 border border-rose-800/40"
                    }`}
                  >
                    {sim.canExecute ? "SAFE" : "OVERLEVERAGED"}
                  </span>
                </div>

                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Total Notional:</span>
                    <span className="text-white">${sim.totalNotional}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Weighted Avg Entry:</span>
                    <span className="text-white">${sim.weightedAvgEntry}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Margin Required:</span>
                    <span className="text-white">${sim.requiredInitialMargin}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Margin Utilization:</span>
                    <span className={`${sim.marginUtilizationPct > 80 ? "text-rose-400" : "text-emerald-400"}`}>
                      {sim.marginUtilizationPct}%
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border/40 pt-1.5">
                    <span className="text-neutral-500">Estimated Liq Price:</span>
                    <span className="text-rose-400 font-semibold">${sim.estimatedLiqPrice}</span>
                  </div>
                </div>

                {!sim.canExecute && (
                  <div className="p-2 bg-rose-950/40 border border-rose-800/40 rounded-lg text-rose-300 text-[11px] flex items-start gap-1.5 mt-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{sim.rejectReason}</span>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                disabled={!sim.canExecute || !connected || isSubmitting}
                onClick={handleDeployScale}
                className={`w-full py-2.5 rounded-lg font-bold text-xs tracking-wider uppercase transition shadow-md flex items-center justify-center gap-2 ${
                  !connected
                    ? "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-border"
                    : isSubmitting
                    ? "bg-neutral-700 text-white cursor-wait"
                    : sim.canExecute
                    ? isLong
                      ? "bg-long hover:bg-emerald-600 text-black cursor-pointer shadow-emerald-950/50"
                      : "bg-short hover:bg-rose-600 text-white cursor-pointer shadow-rose-950/50"
                    : "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-border"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing Transaction...
                  </>
                ) : !connected ? (
                  "Connect Wallet to Trade"
                ) : sim.canExecute ? (
                  `Deploy ${rungCount}-Rung ${isLong ? "Long" : "Short"} Scale`
                ) : (
                  "Insufficient Collateral"
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
