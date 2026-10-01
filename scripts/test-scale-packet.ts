import { 
  Connection, 
  Keypair, 
  PublicKey, 
  TransactionInstruction, 
  TransactionMessage, 
  VersionedTransaction,
  AddressLookupTableAccount
} from "@solana/web3.js";
import * as dotenv from "dotenv";

dotenv.config();

const SOLANA_PACKET_LIMIT = 1232;

// Velocity Program ID on Devnet / Mainnet
const VELOCITY_PROGRAM_ID = new PublicKey("vELoC1audYbSYVRXn1vPaV8Axoa9oU6BYmNGZZBDZ1P");

function measureTxSize(
  payer: PublicKey, 
  recentBlockhash: string, 
  instructions: TransactionInstruction[],
  lookupTables: AddressLookupTableAccount[] = []
): number {
  const messageV0 = new TransactionMessage({
    payerKey: payer,
    recentBlockhash,
    instructions,
  }).compileToV0Message(lookupTables);

  const tx = new VersionedTransaction(messageV0);
  return tx.serialize().length;
}

async function main() {
  console.log("==========================================");
  console.log("   BYTE PACKET & LADDER CAPACITY SPIKE    ");
  console.log("==========================================\n");

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const secretKey = Uint8Array.from(JSON.parse(process.env.DEV_PRIVATE_KEY!));
  const payer = Keypair.fromSecretKey(secretKey);

  // Dummy recent blockhash for serialization measurement
  const fakeBlockhash = "11111111111111111111111111111111";

  // Mock accounts required by an order instruction
  const dummyAccounts = [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: new PublicKey("2etx5NvPNxeMZ7EfHE6GjJfW2imRYEUANehNS1WB4CVW"), isSigner: false, isWritable: true }, // State
    { pubkey: PublicKey.unique(), isSigner: false, isWritable: true }, // User PDA
    { pubkey: PublicKey.unique(), isSigner: false, isWritable: false }, // Perp Market
    { pubkey: PublicKey.unique(), isSigner: false, isWritable: false }, // Oracle
  ];

  // ----------------------------------------------------
  // TEST 1: Native place_scale_orders (Single instruction)
  // ----------------------------------------------------
  console.log("[+] Testing Native `place_scale_orders` (Uniform Ladder)...");
  // Scale order parameters: fixed struct size (~64 bytes of data)
  const scaleOrderData = Buffer.alloc(64); 
  const scaleIx = new TransactionInstruction({
    programId: VELOCITY_PROGRAM_ID,
    keys: dummyAccounts,
    data: scaleOrderData,
  });

  const scaleSize = measureTxSize(payer.publicKey, fakeBlockhash, [scaleIx]);
  console.log(`    -> Native Scale Order Tx Size: ${scaleSize} bytes`);
  console.log(`    -> Status: ${scaleSize <= SOLANA_PACKET_LIMIT ? "PASS (Fits easily!)" : "FAIL"}`);
  console.log(`    -> Headroom remaining: ${SOLANA_PACKET_LIMIT - scaleSize} bytes\n`);

  // ----------------------------------------------------
  // TEST 2: Batch place_orders (Custom spacing ladders)
  // ----------------------------------------------------
  console.log("[+] Testing Custom Batch `place_orders` by Rung Count...");
  const rungCounts = [12, 16, 20, 24, 28, 32];

  // 34 bytes per OrderParams struct without builder code
  const ORDER_PARAMS_SIZE = 34; 

  for (const rungs of rungCounts) {
    // 8 bytes discriminator + vector length (4 bytes) + rungs * 34 bytes
    const batchData = Buffer.alloc(8 + 4 + (rungs * ORDER_PARAMS_SIZE));
    
    const batchIx = new TransactionInstruction({
      programId: VELOCITY_PROGRAM_ID,
      keys: dummyAccounts,
      data: batchData,
    });

    // 1. Without Lookup Table
    const sizeNoAlt = measureTxSize(payer.publicKey, fakeBlockhash, [batchIx]);

    // 2. Mock Lookup Table containing the non-signer accounts
    const mockAlt = new AddressLookupTableAccount({
      key: PublicKey.unique(),
      state: {
        deactivationSlot: BigInt(0),
        lastExtendedSlot: 0,
        lastExtendedSlotStartIndex: 0,
        authority: PublicKey.default,
        addresses: dummyAccounts.filter(a => !a.isSigner).map(a => a.pubkey)
      }
    });

    const sizeWithAlt = measureTxSize(payer.publicKey, fakeBlockhash, [batchIx], [mockAlt]);

    const passesNoAlt = sizeNoAlt <= SOLANA_PACKET_LIMIT;
    const passesWithAlt = sizeWithAlt <= SOLANA_PACKET_LIMIT;

    console.log(`  [${rungs} Rungs]`);
    console.log(`    - Without ALT: ${sizeNoAlt} bytes | ${passesNoAlt ? "SAFE" : "OVERFLOW (" + (sizeNoAlt - SOLANA_PACKET_LIMIT) + " bytes over)"}`);
    console.log(`    - With ALT:    ${sizeWithAlt} bytes | ${passesWithAlt ? "SAFE" : "OVERFLOW (" + (sizeWithAlt - SOLANA_PACKET_LIMIT) + " bytes over)"}`);
  }

  console.log("\n==========================================");
  console.log("         LADDER CAPACITY VERIFIED         ");
  console.log("==========================================");
}

main().catch(console.error);
