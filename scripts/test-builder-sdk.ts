import * as VelocitySDK from "@velocity-exchange/sdk";

async function main() {
  console.log("==========================================");
  console.log("   VELOCITY SDK BUILDER CODE INSPECTION   ");
  console.log("==========================================\n");

  console.log("[+] Inspecting top-level exports from @velocity-exchange/sdk...\n");

  // Find all classes, functions, and constants related to Builder, Revenue, or Escrow
  const allKeys = Object.keys(VelocitySDK);
  
  const builderMatches = allKeys.filter(k => 
    k.toLowerCase().includes("builder") || 
    k.toLowerCase().includes("revenue") || 
    k.toLowerCase().includes("escrow") ||
    k.toLowerCase().includes("client")
  );

  console.log("Key Classes & Methods Found:");
  builderMatches.forEach(match => {
    console.log(`  - ${match}`);
  });

  // Check if there are specific instruction helper functions
  console.log("\n[+] Inspecting Instruction Builders...");
  for (const key of builderMatches) {
    const item = (VelocitySDK as any)[key];
    if (typeof item === "function") {
      const proto = item.prototype ? Object.getOwnPropertyNames(item.prototype) : [];
      const relevantMethods = proto.filter(p => 
        p.toLowerCase().includes("builder") || 
        p.toLowerCase().includes("revenue") || 
        p.toLowerCase().includes("order") ||
        p.toLowerCase().includes("withdraw")
      );
      if (relevantMethods.length > 0) {
        console.log(`\n  Methods on [${key}]:`);
        relevantMethods.forEach(m => console.log(`     -> ${m}()`));
      }
    }
  }

  console.log("\n==========================================");
  console.log("          INSPECTION COMPLETE             ");
  console.log("==========================================");
}

main().catch(console.error);
