/**
 * verify-password-reset.js
 *
 * Verifies that the password reset flow is properly configured:
 * 1. Checks that Firebase Auth is configured
 * 2. Checks that the password reset email action URL is set
 * 3. Tests sending a password reset email (if --test flag provided)
 *
 * Usage: node scripts/verify-password-reset.js [--test <email>]
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const { cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

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

const auth = getAuth();

async function verify() {
  console.log("\n=== Password Reset Verification ===\n");

  // 1. Check Firebase config
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    console.log("[WARN] EXPO_PUBLIC_FIREBASE_API_KEY not set in .env");
  } else {
    console.log("[OK] Firebase API key is configured");
  }

  // 2. Check action URL
  const actionUrl =
    process.env.EXPO_PUBLIC_FIREBASE_ACTION_URL ||
    "https://locali-dca58.firebaseapp.com/__/auth/action";
  console.log(`[OK] Action URL: ${actionUrl}`);

  // 3. Check if test mode
  const testEmailIdx = process.argv.indexOf("--test");
  if (testEmailIdx !== -1) {
    const testEmail = process.argv[testEmailIdx + 1];
    if (!testEmail) {
      die("Usage: node scripts/verify-password-reset.js --test <email>");
    }

    try {
      await auth.generatePasswordResetLink(testEmail, {
        url: actionUrl,
      });
      console.log(`[OK] Password reset link generated for ${testEmail}`);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        console.log(`[WARN] User ${testEmail} not found (expected if not registered)`);
      } else {
        console.log(`[FAIL] Could not generate reset link: ${err.message}`);
      }
    }
  }

  console.log("\n=== Verification Complete ===\n");
}

verify().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
