/**
 * admin-manage-user.js
 *
 * Manage a user's role and disabled status.
 * Usage:
 *   node scripts/admin-manage-user.js <uid> --role <role>
 *   node scripts/admin-manage-user.js <uid> --disable
 *   node scripts/admin-manage-user.js <uid> --enable
 *   node scripts/admin-manage-user.js <uid> --info
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

const uid = process.argv[2];
if (!uid) {
  die("Usage: node scripts/admin-manage-user.js <uid> [--role <role>|--disable|--enable|--info]");
}

const args = process.argv.slice(3);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
};
const hasFlag = (flag) => args.includes(flag);

async function manage() {
  const userRef = db.collection("users").doc(uid);
  const doc = await userRef.get();

  if (!doc.exists) {
    die(`User with UID "${uid}" not found.`);
  }

  const data = doc.data();

  // Info mode
  if (hasFlag("--info")) {
    console.log(`\nUser: ${uid}`);
    console.log(`  Name:     ${data.fullName || data.name || "N/A"}`);
    console.log(`  Email:    ${data.email || "N/A"}`);
    console.log(`  Role:     ${data.role || "shopper"}`);
    console.log(`  Disabled: ${data.disabled ? "Yes" : "No"}`);
    console.log(`  Created:  ${data.createdAt?.toDate?.()?.toISOString() || "N/A"}`);
    console.log("");
    return;
  }

  // Role change
  const newRole = getArg("--role");
  if (newRole) {
    const validRoles = ["shopper", "merchant_owner", "admin"];
    if (!validRoles.includes(newRole)) {
      die(`Invalid role "${newRole}". Valid: ${validRoles.join(", ")}`);
    }
    await userRef.update({
      role: newRole,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`\n[SUCCESS] Role updated to "${newRole}" for user ${uid}\n`);
    return;
  }

  // Disable
  if (hasFlag("--disable")) {
    await userRef.update({
      disabled: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`\n[SUCCESS] User ${uid} has been disabled.\n`);
    return;
  }

  // Enable
  if (hasFlag("--enable")) {
    await userRef.update({
      disabled: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`\n[SUCCESS] User ${uid} has been enabled.\n`);
    return;
  }

  die("No action specified. Use --role, --disable, --enable, or --info");
}

manage().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
