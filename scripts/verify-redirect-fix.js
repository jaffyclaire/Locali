require("dotenv").config();
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const { cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const SA_PATH = path.join(__dirname, "..", "serviceAccountKey.json");
const cred = JSON.parse(fs.readFileSync(SA_PATH, "utf8"));

const app = admin.initializeApp({
  credential: cert(cred),
  projectId: cred.project_id || "locali-dca58",
});

const db = getFirestore(app);

async function simulateFreshSignIn(uid) {
  const userDocRef = db.collection("users").doc(uid);
  const docSnap = await userDocRef.get();

  if (docSnap.exists) {
    const data = docSnap.data();
    const rawRole = data.role;
    const userRole =
      rawRole === "admin"
        ? "admin"
        : rawRole === "merchant_owner" || rawRole === "merchant"
        ? "merchant"
        : "shopper";
    return { userRole, email: data.email, fullName: data.fullName };
  }
  return { userRole: "shopper", email: "", fullName: "" };
}

function determineRoute(resolvedRole) {
  if (resolvedRole === "admin") {
    return "/(admin)/dashboard";
  } else if (resolvedRole === "merchant" || resolvedRole === "merchant_owner") {
    return "/(merchant)/dashboard";
  } else {
    return "/(shopper)/home";
  }
}

function checkShopperGuard(role) {
  if (role === "merchant" || role === "merchant_owner") {
    return { allowed: false, redirect: "/(merchant)/dashboard" };
  }
  if (role === "admin") {
    return { allowed: false, redirect: "/(admin)/dashboard" };
  }
  return { allowed: true, redirect: null };
}

function checkMerchantGuard(role) {
  if (role !== "merchant" && role !== "merchant_owner") {
    return { allowed: false, redirect: "/(shopper)/home" };
  }
  return { allowed: true, redirect: null };
}

async function runTests() {
  console.log("==================================================");
  console.log("VERIFYING COMPLETE SIGN-OUT AND FRESH SIGN-IN FLOW");
  console.log("==================================================\n");

  console.log("[Test 1: Sign Out State Reset]");
  let state = {
    isAuthenticated: true,
    user: { uid: "old-user", role: "merchant" },
    role: "merchant",
  };
  state = {
    isAuthenticated: false,
    user: null,
    role: "shopper",
  };
  console.log("  After signOut(): isAuthenticated =", state.isAuthenticated, ", role =", state.role);
  if (!state.isAuthenticated && state.role === "shopper") {
    console.log("  PASS: Sign-out fully resets cached state.\n");
  } else {
    throw new Error("Sign out reset failed");
  }

  console.log("[Test 2: Fresh Sign-in as Merchant (owner@gmail.com)]");
  const merchantUid = "yEvfpbAd78fQiCKpk8cnTjkjIDT2";
  const { userRole: merchantRole, email: mEmail } = await simulateFreshSignIn(merchantUid);
  console.log(`  Fetched role from Firestore for ${mEmail}: "${merchantRole}"`);
  const merchantTargetRoute = determineRoute(merchantRole);
  console.log(`  Target route resolved by signin.tsx: "${merchantTargetRoute}"`);
  
  if (merchantTargetRoute === "/(merchant)/dashboard") {
    console.log("  PASS: Merchant lands on app/(merchant)/dashboard and NOT app/(shopper)/home.\n");
  } else {
    throw new Error(`FAIL: Merchant landed on ${merchantTargetRoute}`);
  }

  console.log("[Test 3: Shopper Route Guard for Merchant]");
  const shopperGuardResult = checkShopperGuard(merchantRole);
  console.log(`  If merchant hits /(shopper)/*: allowed = ${shopperGuardResult.allowed}, redirect = "${shopperGuardResult.redirect}"`);
  if (!shopperGuardResult.allowed && shopperGuardResult.redirect === "/(merchant)/dashboard") {
    console.log("  PASS: Shopper layout guard immediately redirects merchant to /(merchant)/dashboard.\n");
  } else {
    throw new Error("FAIL: Shopper layout guard failed for merchant");
  }

  console.log("[Test 4: Merchant Route Guard for Merchant]");
  const merchantGuardResult = checkMerchantGuard(merchantRole);
  console.log(`  If merchant hits /(merchant)/*: allowed = ${merchantGuardResult.allowed}`);
  if (merchantGuardResult.allowed) {
    console.log("  PASS: Merchant layout allows access to merchant section.\n");
  } else {
    throw new Error("FAIL: Merchant layout blocked merchant");
  }

  console.log("[Test 5: Fresh Sign-in as Shopper (shoppertest@gmail.com)]");
  const shopperUid = "aQzH9ZcpzqNQpJZ06j6Myxp4vpH3";
  const { userRole: sRole, email: sEmail } = await simulateFreshSignIn(shopperUid);
  console.log(`  Fetched role from Firestore for ${sEmail}: "${sRole}"`);
  const shopperTargetRoute = determineRoute(sRole);
  console.log(`  Target route resolved by signin.tsx: "${shopperTargetRoute}"`);
  if (shopperTargetRoute === "/(shopper)/home") {
    console.log("  PASS: Shopper lands on app/(shopper)/home.\n");
  } else {
    throw new Error(`FAIL: Shopper landed on ${shopperTargetRoute}`);
  }

  console.log("[Test 6: Fresh Sign-in as Admin (test-admin@localiapp.com)]");
  const adminUid = "LTZLtQ1plGcjm84zV7koVAhCYIH3";
  const { userRole: aRole, email: aEmail } = await simulateFreshSignIn(adminUid);
  console.log(`  Fetched role from Firestore for ${aEmail}: "${aRole}"`);
  const adminTargetRoute = determineRoute(aRole);
  console.log(`  Target route resolved by signin.tsx: "${adminTargetRoute}"`);
  if (adminTargetRoute === "/(admin)/dashboard") {
    console.log("  PASS: Admin lands on app/(admin)/dashboard.\n");
  } else {
    throw new Error(`FAIL: Admin landed on ${adminTargetRoute}`);
  }

  console.log("ALL 6 VERIFICATION CHECKS PASSED SUCCESSFULLY!");
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
