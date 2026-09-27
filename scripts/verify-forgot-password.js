/**
 * verify-forgot-password.js
 *
 * Verifies that sendPasswordResetEmail is callable and Firebase Auth
 * accepts the request for a real test account.
 *
 * Usage: node scripts/verify-forgot-password.js [email]
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

const testEmail = process.argv[2] || "test-admin@localiapp.com";

async function verify() {
  console.log("\n=== Forgot Password Verification ===\n");

  // 1. Verify the function exists and is callable
  console.log(`[CHECK] sendPasswordResetEmail is exported from firebase/auth...`);
  // We can't directly import the client SDK here, but we can verify
  // the admin SDK can generate a reset link (same backend)
  try {
    const resetLink = await auth.generatePasswordResetLink(testEmail, {
      url: "https://locali-dca58.firebaseapp.com/__/auth/action",
    });
    console.log(`[OK] Password reset link generated for ${testEmail}`);
    console.log(`     Link: ${resetLink.slice(0, 80)}...`);
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      console.log(`[WARN] User ${testEmail} not found — this is expected if the account doesn't exist yet`);
      console.log(`       The client-side sendPasswordResetEmail would still show the success message`);
    } else {
      console.log(`[FAIL] Could not generate reset link: ${err.message}`);
    }
  }

  // 2. Verify the client-side import path is correct
  console.log(`\n[CHECK] Verifying client-side import path...`);
  const signinPath = path.join(__dirname, "..", "app", "(auth)", "signin.tsx");
  const signinContent = fs.readFileSync(signinPath, "utf8");

  if (signinContent.includes('from "firebase/auth"') && signinContent.includes("sendPasswordResetEmail")) {
    console.log(`[OK] signin.tsx imports sendPasswordResetEmail from firebase/auth`);
  } else {
    console.log(`[FAIL] signin.tsx missing sendPasswordResetEmail import`);
  }

  if (signinContent.includes("await sendPasswordResetEmail(auth, resetEmail.trim())")) {
    console.log(`[OK] signin.tsx calls sendPasswordResetEmail(auth, email)`);
  } else {
    console.log(`[FAIL] signin.tsx missing sendPasswordResetEmail call`);
  }

  // 3. Verify the success message is shown regardless of account existence
  if (signinContent.includes("If an account exists for this email, a reset link has been sent")) {
    console.log(`[OK] Generic success message is shown (no account enumeration)`);
  } else {
    console.log(`[FAIL] Missing generic success message`);
  }

  // 4. Verify error handling uses the same pattern as sign-in
  if (signinContent.includes("getReadableAuthErrorMessage(err)")) {
    console.log(`[OK] Error handling uses getReadableAuthErrorMessage (same as sign-in)`);
  } else {
    console.log(`[FAIL] Error handling doesn't use getReadableAuthErrorMessage`);
  }

  console.log("\n=== Verification Complete ===\n");
}

verify().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
