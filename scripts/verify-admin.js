/**
 * verify-admin.js
 *
 * Verifies that the admin setup is working end-to-end:
 * 1. Checks that the service account is valid
 * 2. Checks that the users collection is accessible
 * 3. Checks that the merchants collection is accessible
 * 4. Checks that the flagReports collection is accessible
 * 5. Lists any users with admin role
 *
 * Usage: node scripts/verify-admin.js
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const { cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const PROJECT_ID =
  process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "locali-dca58";

const SA_PATH =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  path.join(__dirname, "..", "serviceAccountKey.json");

function die(msg) {
  console.error(`\n[ABORT] ${msg}\n`);
  process.exit(1);
}

if (!fs.existsSync(SA_PATH)) {
  die(
    `Firebase service account JSON not found at:\n         ${SA_PATH}\n\n` +
      `Set FIREBASE_SERVICE_ACCOUNT_PATH in .env or place serviceAccountKey.json in the project root.`
  );
}

const cred = JSON.parse(fs.readFileSync(SA_PATH, "utf8"));
if (cred.type !== "service_account" || !cred.private_key) {
  die("That JSON is not a Firebase Admin service account.");
}

admin.initializeApp({
  credential: cert(cred),
  projectId: cred.project_id || PROJECT_ID,
});

const db = getFirestore();

async function verify() {
  console.log("\n=== Admin Setup Verification ===\n");

  // 1. Check users collection
  try {
    const usersSnap = await db.collection("users").limit(5).get();
    console.log(`[OK] users collection accessible (${usersSnap.size} docs in sample)`);

    // Find admin users
    const adminSnap = await db
      .collection("users")
      .where("role", "==", "admin")
      .get();
    if (adminSnap.size > 0) {
      console.log(`[OK] Found ${adminSnap.size} admin user(s):`);
      adminSnap.forEach((doc) => {
        const data = doc.data();
        console.log(`     - ${data.fullName || data.name || "Unnamed"} (${data.email || "no email"}) [${doc.id}]`);
      });
    } else {
      console.log(`[WARN] No admin users found. Run: node scripts/promote-admin.js <uid>`);
    }
  } catch (err) {
    console.log(`[FAIL] users collection: ${err.message}`);
  }

  // 2. Check merchants collection
  try {
    const merchantsSnap = await db.collection("merchants").limit(1).get();
    console.log(`[OK] merchants collection accessible (${merchantsSnap.size} docs in sample)`);
  } catch (err) {
    console.log(`[FAIL] merchants collection: ${err.message}`);
  }

  // 3. Check flagReports collection
  try {
    const reportsSnap = await db.collection("flagReports").limit(1).get();
    console.log(`[OK] flagReports collection accessible (${reportsSnap.size} docs in sample)`);
  } catch (err) {
    console.log(`[FAIL] flagReports collection: ${err.message}`);
  }

  // 4. Check firestore.rules has isAdmin()
  try {
    const rulesPath = path.join(__dirname, "..", "firestore.rules");
    const rulesContent = fs.readFileSync(rulesPath, "utf8");
    if (rulesContent.includes("isAdmin()")) {
      console.log(`[OK] firestore.rules contains isAdmin()`);
    } else {
      console.log(`[WARN] firestore.rules missing isAdmin() function`);
    }
    if (rulesContent.includes("isNotDisabled()")) {
      console.log(`[OK] firestore.rules contains isNotDisabled()`);
    } else {
      console.log(`[WARN] firestore.rules missing isNotDisabled() function`);
    }
  } catch (err) {
    console.log(`[WARN] Could not read firestore.rules: ${err.message}`);
  }

  console.log("\n=== Verification Complete ===\n");
}

verify().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
