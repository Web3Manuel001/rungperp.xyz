import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as VelocitySDK from "@velocity-exchange/sdk";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("==========================================");
  console.log("   BUILDER PDA & ESCROW DERIVATION SPIKE  ");
  console.log("==========================================\n");

  const rpcUrl = process.env.DEVNET_RPC_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");

  // Load Developer Keypair
  const secretKey = Uint8Array.from(JSON.parse(process.env.DEV_PRIVATE_KEY!));
  const developerWallet = Keypair.fromSecretKey(secretKey);
  console.log(`[+] Developer Authority: ${developerWallet.publicKey.toBase58()}`);

  // Inspect the raw function signatures from the SDK to see exact parameters
  console.log("\n[+] Inspecting Function Source Code from SDK:");
  console.log("--------------------------------------------------");
  if (VelocitySDK.getRevenueShareAccountPublicKey) {
    console.log(VelocitySDK.getRevenueShareAccountPublicKey.toString());
  }
  console.log("--------------------------------------------------");

  // Ensure programId is strictly an instantiated PublicKey object
  const rawProgramId = (VelocitySDK as any).VELOCITY_PROGRAM_ID || "vELoC1audYbSYVRXn1vPaV8Axoa9oU6BYmNGZZBDZ1P";
  const programId = typeof rawProgramId === "string" ? new PublicKey(rawProgramId) : rawProgramId;
  
  console.log(`\n[+] Using Program ID: ${programId.toBase58()}`);

  try {
    // 1. Derive Builder Revenue Share Account PDA
    const revenueShareAccountPda = VelocitySDK.getRevenueShareAccountPublicKey(
      programId, 
      developerWallet.publicKey
    );
    console.log(`\n[+] Builder Revenue Share PDA: ${revenueShareAccountPda.toBase58()}`);

    const revShareInfo = await connection.getAccountInfo(revenueShareAccountPda);
    console.log(`    -> Status on Devnet: ${revShareInfo ? "ALREADY INITIALIZED (" + revShareInfo.data.length + " bytes)" : "NOT YET INITIALIZED (Ready to create)"}`);

    // 2. Derive Builder Escrow PDA
    const revenueShareEscrowPda = VelocitySDK.getRevenueShareEscrowAccountPublicKey(
      programId,
      developerWallet.publicKey
    );
    console.log(`\n[+] Builder Escrow PDA:        ${revenueShareEscrowPda.toBase58()}`);

    const escrowInfo = await connection.getAccountInfo(revenueShareEscrowPda);
    console.log(`    -> Status on Devnet: ${escrowInfo ? "ALREADY INITIALIZED (" + escrowInfo.data.length + " bytes)" : "NOT YET INITIALIZED (Ready to create)"}`);

  } catch (err: any) {
    console.error("[-] Error during derivation:", err);
  }

  console.log("\n==========================================");
  console.log("      BUILDER IDENTIFIERS DERIVED         ");
  console.log("==========================================");
}

main().catch(console.error);
