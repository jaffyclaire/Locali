/**
 * promote-admin.js
 *
 * Promotes a user to admin role in Firestore.
 * Usage: node scripts/promote-admin.js <uid>
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
  die("Usage: node scripts/promote-admin.js <uid>");
}

async function promote() {
  const userRef = db.collection("users").doc(uid);
  const doc = await userRef.get();

  if (!doc.exists) {
    die(`User with UID "${uid}" not found.`);
  }

  const data = doc.data();
  console.log(`\nCurrent role: ${data.role || "shopper"}`);
  console.log(`Email: ${data.email || "N/A"}`);
  console.log(`Name: ${data.fullName || data.name || "N/A"}`);

  await userRef.update({
    role: "admin",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`\n[SUCCESS] User ${uid} promoted to admin.\n`);
}

promote().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
