import * as VelocitySDK from "@velocity-exchange/sdk";

async function main() {
  console.log("==========================================");
  console.log("   INSPECTING BUILDER INSTRUCTION LOGIC   ");
  console.log("==========================================\n");

  const clientProto = (VelocitySDK.VelocityClient as any).prototype;

  const targetMethods = [
    "getInitializeRevenueShareIx",
    "getInitializeRevenueShareEscrowIx",
    "getChangeApprovedBuilderIx",
    "getSettleRevenueShareIx"
  ];

  for (const method of targetMethods) {
    console.log(`\n==================================================`);
    console.log(`[+] Method: ${method}()`);
    console.log(`==================================================`);
    if (clientProto[method]) {
      console.log(clientProto[method].toString());
    } else {
      console.log("[-] Method not found on prototype.");
    }
  }

  console.log("\n==========================================");
  console.log("         INSPECTION COMPLETE              ");
  console.log("==========================================");
}

main().catch(console.error);
