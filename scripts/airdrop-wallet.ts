import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

async function airdrop() {
  const targetWallet = process.argv[2];
  if (!targetWallet) {
    console.error("Please provide your wallet address: npx tsx scripts/airdrop-wallet.ts <YOUR_WALLET_ADDRESS>");
    process.exit(1);
  }

  const pubkey = new PublicKey(targetWallet);
  console.log(`[+] Requesting Devnet SOL for: ${pubkey.toBase58()}`);

  const endpoints = [
    "https://api.devnet.solana.com",
    "https://devnet.helius-rpc.com/?api-key=11111111-1111-1111-1111-111111111111", // Public Helius endpoint
    "https://rpc.ankr.com/solana_devnet"
  ];

  for (const url of endpoints) {
    try {
      console.log(`[+] Trying endpoint: ${url}...`);
      const connection = new Connection(url, "confirmed");
      const sig = await connection.requestAirdrop(pubkey, 1 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig);
      const balance = await connection.getBalance(pubkey);
      console.log(`\n🎉 SUCCESS! Devnet Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
      return;
    } catch (e: any) {
      console.log(`[-] Failed on ${url}: ${e.message}`);
    }
  }

  console.log("\n[!] All RPCs rate limited. Please use https://faucet.quicknode.com/solana/devnet");
}

airdrop().catch(console.error);
