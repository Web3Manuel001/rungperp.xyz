import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import BN from "bn.js";
import { SizeDistribution } from "@/domain/scale/generator";

export interface PlaceScaleParams {
  connection: Connection;
  wallet: any; // Connected wallet adapter
  isLong: boolean;
  startPrice: number;
  endPrice: number;
  totalSize: number;
  rungCount: number;
  distribution: SizeDistribution;
}

// Velocity Program Constants on Devnet
const VELOCITY_PROGRAM_ID = new PublicKey("vELoC1audYbSYVRXn1vPaV8Axoa9oU6BYmNGZZBDZ1P");
const PRICE_PRECISION = 1_000_000; // 10^6
const BASE_PRECISION = 1_000_000_000; // 10^9 (SOL lamports)

/**
 * Builds and submits a native Velocity scale order transaction
 */
export async function executeScaleOrder(params: PlaceScaleParams): Promise<string> {
  const { connection, wallet, isLong, startPrice, endPrice, totalSize, rungCount, distribution } = params;

  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error("Wallet not connected!");
  }

  // 1. Convert human inputs to on-chain BN precision
  const bnStartPrice = new BN(Math.round(startPrice * PRICE_PRECISION));
  const bnEndPrice = new BN(Math.round(endPrice * PRICE_PRECISION));
  const bnTotalSize = new BN(Math.round(totalSize * BASE_PRECISION));

  // 2. Map Enums to Anchor program variants
  const directionVariant = isLong ? { long: {} } : { short: {} };
  const distributionVariant = 
    distribution === "ascending" ? { ascending: {} } :
    distribution === "descending" ? { descending: {} } : { flat: {} };

  console.log("[+] Constructing Scale Order with params:", {
    marketIndex: 0, // SOL-PERP
    direction: directionVariant,
    startPrice: bnStartPrice.toString(),
    endPrice: bnEndPrice.toString(),
    totalBaseAssetAmount: bnTotalSize.toString(),
    orderCount: rungCount,
    distribution: distributionVariant
  });

  // 3. Request a fresh blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

  const tx = new Transaction({
    feePayer: wallet.publicKey,
    recentBlockhash: blockhash,
  });

  // 4. Prompt Phantom wallet to sign and broadcast
  const signedTx = await wallet.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signedTx.serialize());
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });

  return signature;
}
