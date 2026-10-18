/**
 * seed-firestore.js
 *
 * One-off seed script for the `locali-dca58` Firestore project.
 * Writes realistic sample data matching the document shapes that
 * `src/services/firestoreService.ts` -> `formatFirestoreMerchant()` expects.
 *
 * USAGE
 *   1. Download a Firebase service account key:
 *      Firebase Console > Project Settings > Service Accounts >
 *      "Generate New Private Key". It contains "type":"service_account" and a
 *      private_key. (google-services.json is NOT usable - it has no private_key.)
 *   2. Put the JSON OUTSIDE the repo (recommended) or at the path below, and
 *      set FIREBASE_SERVICE_ACCOUNT_PATH in .env
 *   3. npm install firebase-admin dotenv
 *   4. node seed-firestore.js            # seed
 *      node seed-firestore.js --verify   # read-only count report
 *
 * Idempotent: every document is written with a fixed ID, so re-running
 * overwrites rather than duplicating.
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

// ---------------------------------------------------------------- config
const PROJECT_ID =
  process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "locali-dca58";

const SA_PATH =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  path.join(__dirname, "serviceAccountKey.json");

const VERIFY_ONLY = process.argv.includes("--verify");

// ---------------------------------------------------------------- helpers
function die(msg, hint) {
  console.error(`\n[ABORT] ${msg}`);
  if (hint) console.error(`\n${hint}\n`);
  process.exit(1);
}

if (!fs.existsSync(SA_PATH)) {
  die(
    `Firebase service account JSON not found at:\n         ${SA_PATH}`,
    `How to fix:\n` +
      `  1. Firebase Console > Project Settings > Service Accounts\n` +
      `  2. "Generate New Private Key" -> downloads a .json file\n` +
      `  3. Move it OUTSIDE this repo, then set in .env:\n` +
      `       FIREBASE_SERVICE_ACCOUNT_PATH=C:/secure/path/key.json\n` +
      `  (A service account is required: it bypasses Security Rules, which is\n` +
      `   the only way to write seed data before rules are deployed.)`
  );
}

const cred = JSON.parse(fs.readFileSync(SA_PATH, "utf8"));
if (cred.type !== "service_account" || !cred.private_key) {
  die(
    `That JSON is not a Firebase Admin service account.\n` +
      `         type="${cred.type}"  private_key=${cred.private_key ? "present" : "ABSENT"}`,
    `A valid service account has "type": "service_account" and a private_key.\n` +
      `google-services.json (the Android client config) does NOT work here.`
  );
}

admin.initializeApp({
  credential: admin.credential.cert(cred),
  projectId: cred.project_id || PROJECT_ID,
});

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const SEED_OWNER = "seed_owner_locali";
const REVIEWERS = ["seed_user_alex", "seed_user_sam", "seed_user_riley"];
const SHOPPER = "seed_user_demo";

const hours = (o, c, closed = false) => ({ openTime: o, closeTime: c, isClosed: closed });

const weekly = (o, c, closedDays = []) =>
  Object.fromEntries(
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => [
      d,
      closedDays.includes(d)
        ? hours("", "", true)
        : d === "Sat" || d === "Sun"
        ? hours("09:00", "17:00")
        : hours(o, c),
    ])
  );

// ---------------------------------------------------------------- seed data
const INTERESTS = [
  { id: "coffee", name: "Coffee", icon: "coffee", category: "Food & Drink" },
  { id: "groceries", name: "Groceries", icon: "cart", category: "Shopping" },
  { id: "retail", name: "Retail", icon: "bag", category: "Shopping" },
  { id: "fastfood", name: "Fast Food", icon: "burger", category: "Food & Drink" },
  { id: "bakery", name: "Bakery", icon: "croissant", category: "Food & Drink" },
  { id: "pharmacy", name: "Pharmacy", icon: "pill", category: "Health" },
];

const MERCHANTS = [
  {
    id: "brew-and-co",
    name: "Brew & Co.",
    category: "Coffee",
    description: "Specialty coffee roasted on site in the Mission District.",
    address: "2011 Valencia St, San Francisco, CA",
    contact: "+1 (415) 555-0142",
    latitude: 37.7599,
    longitude: -122.4214,
    rating: 4.8,
    ratingCount: 214,
    isOpen: true,
    sponsored: true,
    isVerified: true,
    ownerId: SEED_OWNER,
    weeklyHours: weekly("07:00", "18:00"),
  },
  {
    id: "golden-fork-bakery",
    name: "Golden Fork Bakery",
    category: "Bakery",
    description: "Sourdough, laminated pastries and espresso since 2014.",
    address: "825 Valencia St, San Francisco, CA",
    contact: "+1 (415) 555-0198",
    latitude: 37.7573,
    longitude: -122.4209,
    rating: 4.7,
    ratingCount: 168,
    isOpen: true,
    isNew: true,
    isVerified: true,
    ownerId: SEED_OWNER,
    weeklyHours: weekly("06:30", "17:00", ["Sun"]),
  },
  {
    id: "mission-grocers",
    name: "Mission Grocers",
    category: "Groceries",
    description: "Neighbourhood produce, pantry staples and deli counter.",
    address: "1120 Guerrero St, San Francisco, CA",
    contact: "+1 (415) 555-0177",
    latitude: 37.7489,
    longitude: -122.4231,
    rating: 4.4,
    ratingCount: 96,
    isOpen: true,
    isVerified: false,
    ownerId: SEED_OWNER,
    weeklyHours: weekly("08:00", "21:00"),
  },
  {
    id: "telegraph-hillside-books",
    name: "Telegraph Hill Books",
    category: "Retail",
    description: "Independent bookshop with a curated local authors shelf.",
    address: "1201 Telegraph Ave, San Francisco, CA",
    contact: "+1 (415) 555-0121",
    latitude: 37.8013,
    longitude: -122.4089,
    rating: 4.9,
    ratingCount: 341,
    isOpen: false,
    isVerified: true,
    ownerId: SEED_OWNER,
    weeklyHours: weekly("10:00", "20:00", ["Mon"]),
  },
  {
    id: "alameda-quick-bite",
    name: "Alameda Quick Bite",
    category: "Fast Food",
    description: "Tacos, burritos and bowls made to order until late.",
    address: "2435 Mission St, San Francisco, CA",
    contact: "+1 (415) 555-0163",
    latitude: 37.7562,
    longitude: -122.4184,
    rating: 4.3,
    ratingCount: 512,
    isOpen: true,
    isVerified: false,
    ownerId: SEED_OWNER,
    weeklyHours: weekly("10:00", "23:00"),
  },
];

const HOLIDAY_CLOSURES = {
  "brew-and-co": [
    { id: "hc-thanksgiving", date: "2026-11-26", name: "Thanksgiving", reason: "Closed for the holiday" },
  ],
  "telegraph-hillside-books": [
    { id: "hc-christmas", date: "2026-12-25", name: "Christmas Day", reason: "Closed" },
    { id: "hc-newyear", date: "2027-01-01", name: "New Year's Day", reason: "Closed" },
  ],
};

const REVIEWS = {
  "brew-and-co": [
    { id: "rv-1", userId: REVIEWERS[0], rating: 5, comment: "The cortado here is genuinely excellent." },
    { id: "rv-2", userId: REVIEWERS[1], rating: 4, comment: "Great espresso, gets busy around 9am." },
  ],
  "golden-fork-bakery": [
    { id: "rv-1", userId: REVIEWERS[2], rating: 5, comment: "Best laminated pastry in the city." },
  ],
  "telegraph-hillside-books": [
    { id: "rv-1", userId: REVIEWERS[0], rating: 5, comment: "Perfectly curated local shelf." },
    { id: "rv-2", userId: REVIEWERS[1], rating: 5, comment: "Lovely staff, always finds something." },
    { id: "rv-3", userId: REVIEWERS[2], rating: 4, comment: "A bit cramped on weekends." },
  ],
};

const SPONSORED = [
  {
    id: "sc-brew-morning",
    merchantId: "brew-and-co",
    headline: "Free pastry with any latte",
    sub: "Before 11am, weekdays",
    discount: "20% off",
    tag: "Sponsored",
    active: true,
  },
];

const NOTIFICATIONS = [
  { id: "nt-1", title: "Brew & Co. is open", body: "Now serving until 6:00 PM.", unread: true },
  { id: "nt-2", title: "Price drop nearby", body: "Mission Grocers reduced prices on produce.", unread: false },
];

const SAVED = ["brew-and-co", "telegraph-hillside-books"];

// ---------------------------------------------------------------- counting
const COLLECTIONS = [
  "users", "interests", "merchants", "sponsoredCards",
  "savedMerchants/items", "notifications/items", "flagReports",
  "checkIns", "merchantViews", "directionTaps",
];

async function countAll() {
  const out = {};
  for (const path of COLLECTIONS) {
    const snap = await db.collection(path).get();
    let sub = 0;
    if (path.endsWith("/items")) sub = snap.size;
    out[path] = { docs: snap.size, subcollections: sub };
  }
  for (const m of MERCHANTS) {
    const [hc, rv] = await Promise.all([
      db.collection("merchants").doc(m.id).collection("holidayClosures").get(),
      db.collection("merchants").doc(m.id).collection("reviews").get(),
    ]);
    out[`merchants/${m.id}/holidayClosures`] = hc.size;
    out[`merchants/${m.id}/reviews`] = rv.size;
  }
  return out;
}

// ---------------------------------------------------------------- main
(async () => {
  console.log(`Project : ${admin.app().options.projectId}`);
  console.log(`Key file: ${SA_PATH}`);
  console.log(`Mode    : ${VERIFY_ONLY ? "VERIFY ONLY (read-only)" : "SEED"}`);

  if (VERIFY_ONLY) {
    const counts = await countAll();
    console.log("\n--- Firestore document counts ---");
    for (const [k, v] of Object.entries(counts)) {
      console.log(`  ${k.padEnd(46)} ${typeof v === "number" ? v : v.docs}`);
    }
    return process.exit(0);
  }

  const batch = db.batch();
  let pending = 0;
  const put = (ref, data) => {
    batch.set(ref, { ...data, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    pending++;
  };

  // interests
  for (const i of INTERESTS) put(db.collection("interests").doc(i.id), i);

  // users
  put(db.collection("users").doc(SHOPPER), {
    uid: SHOPPER, fullName: "Demo Shopper", email: "demo@locali.app",
    role: "shopper", interests: ["coffee", "bakery"],
    notificationPreferences: { proximityAlerts: true, merchantAlerts: true, dealAlerts: false },
    createdAt: FieldValue.serverTimestamp(),
  });
  put(db.collection("users").doc(SEED_OWNER), {
    uid: SEED_OWNER, fullName: "Locali Seed Owner", email: "owner@locali.app",
    role: "merchant_owner", interests: ["coffee", "groceries"],
    createdAt: FieldValue.serverTimestamp(),
  });
  for (const r of REVIEWERS)
    put(db.collection("users").doc(r), {
      uid: r, fullName: r.replace("seed_user_", "").replace(/^./, (c) => c.toUpperCase()),
      email: `${r}@locali.app`, role: "shopper", interests: ["coffee"],
      createdAt: FieldValue.serverTimestamp(),
    });

  // merchants + subcollections
  for (const m of MERCHANTS) {
    const ref = db.collection("merchants").doc(m.id);
    put(ref, m);
    for (const hc of HOLIDAY_CLOSURES[m.id] || [])
      batch.set(ref.collection("holidayClosures").doc(hc.id), hc);
    for (const rv of REVIEWS[m.id] || [])
      batch.set(ref.collection("reviews").doc(rv.id), {
        ...rv,
        merchantId: m.id,
        createdAt: FieldValue.serverTimestamp(),
      });
  }

  // sponsoredCards, notifications, savedMerchants
  for (const s of SPONSORED) put(db.collection("sponsoredCards").doc(s.id), s);
  for (const n of NOTIFICATIONS)
    put(db.collection("notifications").doc(SHOPPER).collection("items").doc(n.id), n);
  for (const id of SAVED)
    put(db.collection("savedMerchants").doc(SHOPPER).collection("items").doc(id), {
      merchantId: id, savedAt: FieldValue.serverTimestamp(),
    });

  await batch.commit();
  console.log(`\nBatch committed (${pending} top-level writes + subcollections).`);

  console.log("\n--- Firestore document counts (verified via Admin SDK read) ---");
  const counts = await countAll();
  let total = 0;
  for (const [k, v] of Object.entries(counts)) {
    const n = typeof v === "number" ? v : v.docs;
    total += n;
    console.log(`  ${k.padEnd(46)} ${n}`);
  }
  console.log(`\n  TOTAL documents: ${total}`);
  process.exit(0);
})().catch((e) => {
  console.error("\n[SEED FAILED]", e.code || e.message);
  console.error(e);
  process.exit(1);
});
