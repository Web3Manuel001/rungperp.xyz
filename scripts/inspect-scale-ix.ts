import * as VelocitySDK from "@velocity-exchange/sdk";

async function main() {
  console.log("==========================================");
  console.log("   INSPECTING SCALE ORDER INSTRUCTION     ");
  console.log("==========================================\n");

  const clientProto = (VelocitySDK.VelocityClient as any).prototype;

  console.log("[+] Method: getPlaceScaleOrdersIx():");
  console.log("--------------------------------------------------");
  if (clientProto.getPlaceScaleOrdersIx) {
    console.log(clientProto.getPlaceScaleOrdersIx.toString());
  } else {
    console.log("[-] Not found directly on prototype.");
  }

  console.log("\n[+] Method: preparePlaceScaleOrdersTx():");
  console.log("--------------------------------------------------");
  if (clientProto.preparePlaceScaleOrdersTx) {
    console.log(clientProto.preparePlaceScaleOrdersTx.toString());
  }

  console.log("\n==========================================");
}

main().catch(console.error);
