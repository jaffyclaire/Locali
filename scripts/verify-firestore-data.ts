/**
 * Runtime verification script for Firestore data fetching.
 * This script directly calls the firestoreService functions to verify
 * that real data is being fetched from Firestore (not mock data).
 *
 * Run with: npx tsx scripts/verify-firestore-data.ts
 */

import { fetchMerchants, fetchSponsoredCards, fetchCategories, fetchInterests } from "../src/services/firestoreService";
import { isFirebaseConfigured } from "../src/lib/firebase";

async function main() {
  console.log("=== Firestore Data Verification ===\n");

  // Check Firebase configuration
  const configured = isFirebaseConfigured();
  console.log(`isFirebaseConfigured(): ${configured}`);
  if (!configured) {
    console.error("ERROR: Firebase is not configured. Check your .env file.");
    process.exit(1);
  }
  console.log("");

  // Test fetchMerchants (used by home.tsx and discover.tsx)
  console.log("--- fetchMerchants() ---");
  try {
    const merchants = await fetchMerchants();
    console.log(`  Count: ${merchants.length}`);
    if (merchants.length > 0) {
      console.log(`  First merchant: ${merchants[0].name} (${merchants[0].category})`);
      console.log(`  Sample names: ${merchants.slice(0, 5).map((m: any) => m.name).join(", ")}`);
    } else {
      console.log("  WARNING: No merchants found in Firestore!");
    }
  } catch (err: any) {
    console.error(`  ERROR: ${err.message}`);
  }
  console.log("");

  // Test fetchSponsoredCards (used by home.tsx and HeroAdCarousel)
  console.log("--- fetchSponsoredCards() ---");
  try {
    const cards = await fetchSponsoredCards();
    console.log(`  Count: ${cards.length}`);
    if (cards.length > 0) {
      console.log(`  First card: ${cards[0].name} (${cards[0].category})`);
    } else {
      console.log("  WARNING: No sponsored cards found in Firestore!");
    }
  } catch (err: any) {
    console.error(`  ERROR: ${err.message}`);
  }
  console.log("");

  // Test fetchCategories (used by discover.tsx)
  console.log("--- fetchCategories() ---");
  try {
    const categories = await fetchCategories();
    console.log(`  Count: ${categories.length}`);
    console.log(`  Categories: ${categories.join(", ")}`);
  } catch (err: any) {
    console.error(`  ERROR: ${err.message}`);
  }
  console.log("");

  // Test fetchInterests (used by onboarding.tsx)
  console.log("--- fetchInterests() ---");
  try {
    const interests = await fetchInterests();
    console.log(`  Count: ${interests.length}`);
    if (interests.length > 0) {
      console.log(`  Interests: ${interests.map((i: any) => i.name).join(", ")}`);
    } else {
      console.log("  WARNING: No interests found in Firestore!");
    }
  } catch (err: any) {
    console.error(`  ERROR: ${err.message}`);
  }
  console.log("");

  console.log("=== Verification Complete ===");
}

main().catch((err) => {
  console.error("Script error:", err);
  process.exit(1);
});
