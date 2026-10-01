import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("==========================================");
  console.log("   AEGIS TERMINAL - DEVNET SPIKE TEST     ");
  console.log("==========================================\n");

  const rpcUrl = process.env.DEVNET_RPC_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");

  // 1. Load Developer Keypair
  const secretKey = Uint8Array.from(JSON.parse(process.env.DEV_PRIVATE_KEY!));
  const keypair = Keypair.fromSecretKey(secretKey);
  console.log(`[+] Connected Wallet: ${keypair.publicKey.toBase58()}`);

  // 2. Check Wallet Balance
  let balance = await connection.getBalance(keypair.publicKey);
  console.log(`[+] SOL Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

  if (balance === 0) {
    console.log("[!] Balance is 0. Requesting 1 SOL airdrop via RPC...");
    try {
      const sig = await connection.requestAirdrop(keypair.publicKey, 1 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig);
      balance = await connection.getBalance(keypair.publicKey);
      console.log(`[+] Airdrop Success! New Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    } catch (e: any) {
      console.log(`[!] RPC Airdrop rate-limited. Please use https://faucet.solana.com`);
    }
  }

  // 3. Inspect Velocity Protocol State PDA for BUILDER_CODES flag
  console.log("\n[+] Inspecting Velocity Protocol on Solana...");
  // Velocity State Account PDA
  const statePda = new PublicKey("2etx5NvPNxeMZ7EfHE6GjJfW2imRYEUANehNS1WB4CVW");

  try {
    const accountInfo = await connection.getAccountInfo(statePda);
    if (!accountInfo) {
      console.log("[-] State PDA not found on this cluster (Checking mainnet state next).");
    } else {
      console.log(`[+] Velocity State Account found! Size: ${accountInfo.data.length} bytes`);
      // Offset 1374 per SDK 0.26.0 IDL
      if (accountInfo.data.length > 1374) {
        const featureByte = accountInfo.data[1374];
        const isBuilderCodesActive = (featureByte & 4) !== 0;
        console.log(`[+] Raw Feature Byte: ${featureByte} (Binary: ${featureByte.toString(2).padStart(8, "0")})`);
        console.log(`[+] BUILDER_CODES flag (value 4) enabled: ${isBuilderCodesActive ? "YES" : "NO"}`);
      }
    }
  } catch (err: any) {
    console.error("[-] Error reading state PDA:", err.message);
  }

  console.log("\n==========================================");
  console.log("   STEP 1 COMPLETE: CONNECTION VERIFIED    ");
  console.log("==========================================");
}

main().catch(console.error);
