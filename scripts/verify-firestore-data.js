/**
 * Runtime verification script for Firestore data fetching.
 * Uses the Firebase REST API with the API key to directly query Firestore
 * and confirm real data exists in the collections the app depends on.
 *
 * Run with: node scripts/verify-firestore-data.js
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

// Load .env file
const envPath = path.join(__dirname, "..", ".env");
const envContent = fs.readFileSync(envPath, "utf8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^\s*([^=]+)\s*=\s*(.*)\s*$/);
  if (match) {
    let value = match[2].trim();
    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[match[1].trim()] = value;
  }
});

const API_KEY = envVars["EXPO_PUBLIC_FIREBASE_API_KEY"];
const PROJECT_ID = envVars["EXPO_PUBLIC_FIREBASE_PROJECT_ID"];

console.log("=== Firestore Data Verification (via REST API) ===\n");
console.log(`Project ID: ${PROJECT_ID}`);
console.log(`API Key: ${API_KEY.substring(0, 15)}...\n`);

if (!API_KEY || !PROJECT_ID) {
  console.error("ERROR: Missing API key or project ID in .env");
  process.exit(1);
}

// Query a Firestore collection via REST API
function queryCollection(collectionName) {
  return new Promise((resolve, reject) => {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionName}?key=${API_KEY}&pageSize=50`;

    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              reject(new Error(parsed.error.message));
            } else {
              resolve(parsed.documents || []);
            }
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

// Extract fields from a Firestore document
function extractFields(doc) {
  const result = {};
  const fields = doc.fields || {};
  for (const [key, value] of Object.entries(fields)) {
    if (value.stringValue !== undefined) result[key] = value.stringValue;
    else if (value.integerValue !== undefined) result[key] = parseInt(value.integerValue);
    else if (value.doubleValue !== undefined) result[key] = parseFloat(value.doubleValue);
    else if (value.booleanValue !== undefined) result[key] = value.booleanValue;
    else if (value.timestampValue !== undefined) result[key] = value.timestampValue;
    else result[key] = null;
  }
  return result;
}

async function main() {
  // Verify merchants collection (used by home.tsx and discover.tsx)
  console.log("--- merchants collection ---");
  try {
    const merchants = await queryCollection("merchants");
    console.log(`  Document count: ${merchants.length}`);
    if (merchants.length > 0) {
      const names = merchants.map((d) => extractFields(d).name).filter(Boolean);
      console.log(`  Merchant names: ${names.join(", ")}`);
      const first = extractFields(merchants[0]);
      console.log(`  First merchant: ${first.name} (${first.category}) - isOpen: ${first.isOpen}, rating: ${first.rating}`);
    } else {
      console.log("  WARNING: No merchants found!");
    }
  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
  }
  console.log("");

  // Verify sponsoredCards collection (used by home.tsx and HeroAdCarousel)
  console.log("--- sponsoredCards collection ---");
  try {
    const cards = await queryCollection("sponsoredCards");
    console.log(`  Document count: ${cards.length}`);
    if (cards.length > 0) {
      const names = cards.map((d) => extractFields(d).name || extractFields(d).headline).filter(Boolean);
      console.log(`  Card names/headlines: ${names.join(", ")}`);
    } else {
      console.log("  WARNING: No sponsored cards found!");
    }
  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
  }
  console.log("");

  // Verify interests collection (used by onboarding.tsx and FilterSheet)
  console.log("--- interests collection ---");
  try {
    const interests = await queryCollection("interests");
    console.log(`  Document count: ${interests.length}`);
    if (interests.length > 0) {
      const names = interests.map((d) => extractFields(d).name).filter(Boolean);
      console.log(`  Interest names: ${names.join(", ")}`);
    } else {
      console.log("  WARNING: No interests found!");
    }
  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
  }
  console.log("");

  // Verify users collection (used by notifications.tsx)
  console.log("--- users collection ---");
  try {
    const users = await queryCollection("users");
    console.log(`  Document count: ${users.length}`);
    if (users.length > 0) {
      const names = users.map((d) => extractFields(d).fullName).filter(Boolean);
      console.log(`  User names: ${names.join(", ")}`);
    } else {
      console.log("  WARNING: No users found!");
    }
  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
  }
  console.log("");

  console.log("=== Verification Complete ===");
  console.log("");
  console.log("Expected console.log output when app screens load:");
  console.log("  [HomeScreen] loading: false, merchants: <count>, sponsoredCards: <count>");
  console.log("  [DiscoverScreen] loading: false, merchants: <count>, categories: <count>");
  console.log("  [OnboardingScreen] loading: false, interests: <count>");
  console.log("  [HeroAdCarousel] Fetched ads: <count>");
}

main().catch((err) => {
  console.error("Script error:", err);
  process.exit(1);
});
