"use client";

import React, { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { approveRungBuilder } from "@/adapters/live/VelocityBuilderAdapter";
import { Zap, ShieldCheck, CheckCircle2, Loader2, ArrowRight } from "lucide-react";

export default function BuilderOnboardingModal() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { connected, publicKey } = wallet;

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isActivating, setIsActivating] = useState<boolean>(false);
  const [isActivated, setIsActivated] = useState<boolean>(false);

  // Check if wallet has already approved in this session
  useEffect(() => {
    if (connected && publicKey) {
      const approved = localStorage.getItem(`rung_builder_approved_${publicKey.toBase58()}`);
      if (!approved) {
        setIsOpen(true);
      } else {
        setIsActivated(true);
      }
    } else {
      setIsOpen(false);
      setIsActivated(false);
    }
  }, [connected, publicKey]);

  const handleActivate = async () => {
    if (!connected || !publicKey) return;

    setIsActivating(true);
    try {
      await approveRungBuilder({ connection, wallet });
      localStorage.setItem(`rung_builder_approved_${publicKey.toBase58()}`, "true");
      setIsActivated(true);
      setIsOpen(false);
    } catch (err: any) {
      console.error("Builder activation rejected:", err);
    } finally {
      setIsActivating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-surface border border-border/80 rounded-2xl p-6 shadow-2xl space-y-5 text-neutral-200">
        {/* Header Icon */}
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-xl bg-brand/20 border border-brand/40 flex items-center justify-center">
            <Zap className="w-5 h-5 text-brand" />
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/40">
            ONE-TIME SETUP
          </span>
        </div>

        {/* Value Proposition */}
        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-white tracking-wide">
            Activate Institutional Tier
          </h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Approve the Rung Execution Router to unlock institutional-grade scale order routing with 0% maker fees on all limit ladders.
          </p>
        </div>

        {/* Benefits Checklist */}
        <div className="space-y-2.5 bg-background/60 p-3.5 rounded-xl border border-border/60 text-xs font-medium">
          <div className="flex items-center gap-2 text-neutral-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>0% Builder Fees on all Scale Entries</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-300">
            <ShieldCheck className="w-4 h-4 text-brand shrink-0" />
            <span>Pre-Flight Margin Protection & Liquidation Guard</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Single-Transaction Native Solana Execution</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            disabled={isActivating}
            onClick={handleActivate}
            className="w-full py-3 rounded-xl font-bold text-xs tracking-wider uppercase bg-brand hover:bg-blue-600 text-white transition flex items-center justify-center gap-2 shadow-lg shadow-brand/20 cursor-pointer disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-wait"
          >
            {isActivating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Approving Router in Wallet...
              </>
            ) : (
              <>
                Activate 0% Maker Tier
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="w-full mt-2.5 py-1.5 text-center text-[11px] text-neutral-500 hover:text-neutral-400 transition cursor-pointer"
          >
            Continue in Standard Mode
          </button>
        </div>
      </div>
    </div>
  );
}
