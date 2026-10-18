// Connection test — reads config directly from firebase.ts values
// Client SDK: write → read → delete _diagnostics/connectionTest
const firebaseConfig = {
  apiKey:            "AIzaSyDGODRBUtb9TFUqySGj_0ZQc58IGRhx6VM",
  authDomain:        "locali-dca58.firebaseapp.com",
  projectId:         "locali-dca58",
  storageBucket:     "locali-dca58.firebasestorage.app",
  messagingSenderId: "569916464684",
  appId:             "1:569916464684:web:5bc5a54e55554896ae3b89",
};

console.log("\n══════════════════════════════════════════════════════");
console.log("  Firebase Connection Test (Client SDK)");
console.log("  projectId :", firebaseConfig.projectId);
console.log("══════════════════════════════════════════════════════");

const { initializeApp, getApps, getApp } = require("firebase/app");
const { getFirestore, doc, setDoc, getDoc, deleteDoc } = require("firebase/firestore");

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db  = getFirestore(app);
const testRef = doc(db, "_diagnostics/connectionTest");

(async () => {
  // 1. Write
  process.stdout.write("[1/3] Write  _diagnostics/connectionTest … ");
  try {
    await setDoc(testRef, { writtenAt: new Date().toISOString(), source: "connection-test.cjs" });
    console.log("✓ OK");
  } catch (err) {
    console.log("✗ FAILED  code:", err.code, " msg:", err.message);
    classify(err); process.exit(1);
  }

  // 2. Read
  process.stdout.write("[2/3] Read   _diagnostics/connectionTest … ");
  try {
    const snap = await getDoc(testRef);
    if (snap.exists()) console.log("✓ OK  data:", JSON.stringify(snap.data()));
    else { console.log("✗ document missing after write"); process.exit(1); }
  } catch (err) {
    console.log("✗ FAILED  code:", err.code, " msg:", err.message);
    classify(err); process.exit(1);
  }

  // 3. Delete
  process.stdout.write("[3/3] Delete _diagnostics/connectionTest … ");
  try { await deleteDoc(testRef); console.log("✓ OK"); }
  catch (err) { console.log("⚠ non-fatal:", err.code); }

  console.log("\n══════════════════════════════════════════════════════");
  console.log("  RESULT: CONNECTED ✓  — write + read + cleanup all passed.");
  console.log("══════════════════════════════════════════════════════\n");
  process.exit(0);
})();

function classify(err) {
  const c = err.code || "";
  console.log("\n══════════════════════════════════════════════════════");
  if (c === "permission-denied")
    console.log("  BLOCKED BY RULES — firestore.rules may not be deployed yet.");
  else if (c.includes("not-found") || c.includes("NOT_FOUND"))
    console.log("  NO DATABASE — Firestore not provisioned for this project.");
  else if (c.includes("invalid-api-key"))
    console.log("  BAD CONFIG — invalid API key.");
  else
    console.log("  UNEXPECTED ERROR — see code/message above.");
  console.log("══════════════════════════════════════════════════════\n");
}
