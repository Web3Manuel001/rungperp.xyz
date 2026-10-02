import { Connection, PublicKey, Transaction } from "@solana/web3.js";

// Your Developer Public Key that receives builder fees
export const RUNG_BUILDER_AUTHORITY = new PublicKey(
  process.env.NEXT_PUBLIC_BUILDER_AUTHORITY || "99y92TbnBAVKPGRAcqWhAx97purevmpuqRos2PbFMcVx"
);

export const VELOCITY_PROGRAM_ID = new PublicKey("vELoC1audYbSYVRXn1vPaV8Axoa9oU6BYmNGZZBDZ1P");

export interface ApproveBuilderParams {
  connection: Connection;
  wallet: any;
  maxFeeTenthBps?: number;
}

/**
 * Builds and submits the one-time on-chain builder approval transaction
 */
export async function approveRungBuilder(params: ApproveBuilderParams): Promise<string> {
  const { connection, wallet, maxFeeTenthBps = 25 } = params;

  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error("Wallet not connected!");
  }

  console.log(`[+] Approving Rung Builder: ${RUNG_BUILDER_AUTHORITY.toBase58()} at ${maxFeeTenthBps} tenth-bps`);

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

  const tx = new Transaction({
    feePayer: wallet.publicKey,
    recentBlockhash: blockhash,
  });

  const signedTx = await wallet.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signedTx.serialize());
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });

  console.log(`[+] Builder Approved! Tx Signature: ${signature}`);
  return signature;
}
