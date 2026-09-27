import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  addDoc,
  updateDoc,
  query,
  where,
  limit,
  serverTimestamp,
  getCountFromServer,
  QueryConstraint,
  DocumentData,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../lib/firebase";
import {
  Merchant,
  MapMerchant,
  FlagReportItem,
  SponsoredCardItem,
  NotificationItem,
  UserProfile,
  Role,
} from "../types";
import {
  MERCHANTS,
  MAP_MERCHANTS,
  SPONSORED_CARDS,
  NOTIFICATIONS,
} from "../data/mockData";

export interface GetMerchantsOptions {
  isOpen?: boolean;
  category?: string;
  limitCount?: number;
}

export interface InterestItem {
  id: string;
  name: string;
  category: string;
  icon: string;
}

// Transform a Firestore document into the Merchant and MapMerchant format used by UI
export const formatFirestoreMerchant = (
  id: string,
  data: DocumentData
): MapMerchant => {
  const lat = typeof data.latitude === "number" ? data.latitude : 37.7749;
  const lng = typeof data.longitude === "number" ? data.longitude : -122.4194;
  const rating = typeof data.rating === "number" ? data.rating : 4.5;
  const reviews =
    typeof data.ratingCount === "number"
      ? data.ratingCount
      : typeof data.reviews === "number"
      ? data.reviews
      : 0;
  const coverUrl =
    data.coverPhotoUrl ||
    data.img ||
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=200&fit=crop&auto=format";

  // Derive weekly hours display string if hours is a map
  let hoursDisplay = data.hours || "9:00 AM – 6:00 PM";
  if (data.weeklyHours && typeof data.weeklyHours === "object") {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const today = days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
    const todayHours = data.weeklyHours[today];
    if (todayHours) {
      hoursDisplay = todayHours.isClosed
        ? "Closed Today"
        : `${todayHours.openTime} – ${todayHours.closeTime}`;
    }
  }

  let merchantType: "standard" | "new" | "sponsored" = "standard";
  if (data.sponsored || data.type === "sponsored") {
    merchantType = "sponsored";
  } else if (data.isNew || data.type === "new") {
    merchantType = "new";
  }

  return {
    id,
    ownerId: data.ownerId || "",
    name: data.name || "Local Business",
    category: data.category || "General",
    tag: data.tag || data.category || "Local",
    distance: data.distance || "0.5 mi",
    rating,
    reviews,
    isOpen: data.isOpen !== undefined ? Boolean(data.isOpen) : true,
    isNew: merchantType === "new",
    hours: hoursDisplay,
    img: coverUrl,
    coverPhotoUrl: coverUrl,
    address: data.address || "12 Market St, Downtown",
    description: data.description || "",
    contact: data.contact || "",
    lat,
    lng,
    latitude: lat,
    longitude: lng,
    type: merchantType,
    isVerified: Boolean(data.isVerified),
    verifiedTodayAt: data.verifiedTodayAt || null,
    weeklyHours: data.weeklyHours || undefined,
    photos: Array.isArray(data.photos) ? data.photos : [],
  };
};

/**
 * Fetch merchants from Cloud Firestore with query constraints.
 */
export const fetchMerchants = async (
  options: GetMerchantsOptions = {}
): Promise<MapMerchant[]> => {
  if (!isFirebaseConfigured()) {
    return filterMockMerchants(options);
  }

  try {
    const constraints: QueryConstraint[] = [];

    if (options.isOpen === true) {
      constraints.push(where("isOpen", "==", true));
    }

    if (options.category && options.category !== "All") {
      constraints.push(where("category", "==", options.category));
    }

    constraints.push(limit(options.limitCount || 50));

    const merchantsQuery = query(collection(db, "merchants"), ...constraints);
    const querySnapshot = await getDocs(merchantsQuery);

    if (querySnapshot.empty) {
      return filterMockMerchants(options);
    }

    const merchants: MapMerchant[] = [];
    querySnapshot.forEach((docSnap) => {
      merchants.push(formatFirestoreMerchant(docSnap.id, docSnap.data()));
    });

    return merchants;
  } catch (error) {
    console.warn("Firestore fetchMerchants warning, using fallback data:", error);
    return filterMockMerchants(options);
  }
};

export const fetchOpenMerchants = async (): Promise<MapMerchant[]> => {
  return fetchMerchants({ isOpen: true });
};

const filterMockMerchants = (options: GetMerchantsOptions): MapMerchant[] => {
  let list = [...MAP_MERCHANTS];
  if (options.isOpen === true) {
    list = list.filter((m) => m.isOpen);
  }
  if (options.category && options.category !== "All") {
    list = list.filter((m) => m.category === options.category);
  }
  return list;
};

/**
 * Fetch sponsored promotional cards from sponsoredCards collection
 */
export const fetchSponsoredCards = async (): Promise<SponsoredCardItem[]> => {
  if (!isFirebaseConfigured()) {
    return SPONSORED_CARDS;
  }
  try {
    const q = query(collection(db, "sponsoredCards"), where("active", "==", true), limit(10));
    const snap = await getDocs(q);
    if (snap.empty) {
      return SPONSORED_CARDS;
    }
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.headline || data.name || "Special Promotion",
        category: data.sub || data.category || "Deal",
        distance: data.distance || "Nearby",
        rating: typeof data.rating === "number" ? data.rating : 4.8,
        reviews: typeof data.reviews === "number" ? data.reviews : 120,
        isOpen: data.isOpen !== undefined ? Boolean(data.isOpen) : true,
        discount: data.discount || "Featured",
        img:
          data.img ||
          "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=200&fit=crop&auto=format",
        tag: data.tag || "Sponsored",
      };
    });
  } catch (err) {
    console.warn("fetchSponsoredCards error, using fallback:", err);
    return SPONSORED_CARDS;
  }
};

/**
 * Fetch interests taxonomy from Firestore `interests` collection
 */
export const fetchInterests = async (): Promise<InterestItem[]> => {
  if (!isFirebaseConfigured()) {
    return [
      { id: "coffee", name: "Coffee", category: "Food & Drink", icon: "coffee" },
      { id: "bakery", name: "Bakery", category: "Food & Drink", icon: "croissant" },
      { id: "groceries", name: "Groceries", category: "Shopping", icon: "cart" },
      { id: "fastfood", name: "Fast Food", category: "Food & Drink", icon: "burger" },
      { id: "pharmacy", name: "Pharmacy", category: "Health", icon: "pill" },
      { id: "retail", name: "Retail", category: "Shopping", icon: "bag" },
    ];
  }
  try {
    const snap = await getDocs(collection(db, "interests"));
    if (snap.empty) {
      return [];
    }
    const items: InterestItem[] = [];
    snap.forEach((d) => {
      const data = d.data();
      items.push({
        id: d.id,
        name: data.name || d.id,
        category: data.category || "General",
        icon: data.icon || "tag",
      });
    });
    items.sort((a, b) => a.name.localeCompare(b.name));
    return items;
  } catch (err) {
    console.warn("fetchInterests error:", err);
    return [];
  }
};

/**
 * Fetch category names list (for category pickers and filter chips)
 */
export const fetchCategories = async (): Promise<string[]> => {
  const interests = await fetchInterests();
  if (interests.length === 0) {
    return [
      "All",
      "Coffee",
      "Bakery",
      "Restaurant",
      "Groceries",
      "Retail",
      "Fast Food",
      "Pharmacy",
      "Salon & Barber",
      "Fitness & Gym",
      "Bookstore",
      "Clothing & Boutique",
      "Electronics",
      "Home Goods",
      "Auto Services",
      "Health & Wellness",
      "Pet Services",
      "Other",
    ];
  }
  const set = new Set<string>();
  interests.forEach((i) => set.add(i.name));
  return Array.from(set).sort();
};

/**
 * Saved Merchants (savedMerchants/{uid}/items/{merchantId})
 */
export const getSavedMerchantIds = async (uid: string): Promise<string[]> => {
  if (!isFirebaseConfigured() || !uid) return [];
  try {
    const snap = await getDocs(collection(db, "savedMerchants", uid, "items"));
    return snap.docs.map((d) => d.id);
  } catch (err) {
    console.warn("getSavedMerchantIds error:", err);
    return [];
  }
};

export const toggleSaveMerchant = async (
  uid: string,
  merchantId: string | number,
  isCurrentlySaved: boolean
): Promise<boolean> => {
  if (!isFirebaseConfigured() || !uid) return !isCurrentlySaved;
  try {
    const itemRef = doc(db, "savedMerchants", uid, "items", String(merchantId));
    if (isCurrentlySaved) {
      await deleteDoc(itemRef);
      return false;
    } else {
      await setDoc(itemRef, {
        merchantId: String(merchantId),
        savedAt: serverTimestamp(),
      });
      return true;
    }
  } catch (err) {
    console.error("toggleSaveMerchant error:", err);
    return isCurrentlySaved;
  }
};

export const fetchSavedMerchantsWithDetails = async (
  uid: string
): Promise<MapMerchant[]> => {
  if (!isFirebaseConfigured() || !uid) return [];
  try {
    const ids = await getSavedMerchantIds(uid);
    if (ids.length === 0) return [];

    const merchants: MapMerchant[] = [];
    for (const id of ids) {
      const snap = await getDoc(doc(db, "merchants", id));
      if (snap.exists()) {
        merchants.push(formatFirestoreMerchant(snap.id, snap.data()));
      }
    }
    return merchants;
  } catch (err) {
    console.warn("fetchSavedMerchantsWithDetails error:", err);
    return [];
  }
};

/**
 * Format relative timestamp helper
 */
export const formatRelativeTime = (timestampMs: number): string => {
  const diffSec = Math.floor((Date.now() - timestampMs) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hr ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
};

/**
 * Flag Reports (flagReports/{id})
 */
export const submitFlagReport = async (params: {
  merchantId: string | number;
  reporterId: string;
  reporterName: string;
  issueType: string;
  detail: string;
}): Promise<boolean> => {
  if (!isFirebaseConfigured()) return true;
  try {
    await addDoc(collection(db, "flagReports"), {
      merchantId: String(params.merchantId),
      reporterId: params.reporterId,
      reporterName: params.reporterName,
      issueType: params.issueType,
      detail: params.detail,
      status: "pending",
      resolutionAction: null,
      createdAt: serverTimestamp(),
      resolvedAt: null,
    });
    return true;
  } catch (err) {
    console.error("submitFlagReport error:", err);
    return false;
  }
};

export const fetchMerchantFlagReports = async (
  merchantId: string | number
): Promise<FlagReportItem[]> => {
  if (!isFirebaseConfigured()) return [];
  try {
    const q = query(
      collection(db, "flagReports"),
      where("merchantId", "==", String(merchantId))
    );
    const snap = await getDocs(q);
    const reports: FlagReportItem[] = snap.docs.map((d) => {
      const data = d.data();
      const ms = data.createdAt?.toMillis?.() ?? 0;
      return {
        id: d.id,
        merchantId: data.merchantId,
        reporter: data.reporterName || "Anonymous Shopper",
        reporterId: data.reporterId,
        issue: data.issueType || "Incorrect Information",
        detail: data.detail || "",
        time: ms > 0 ? formatRelativeTime(ms) : "Recently",
        resolved: data.status === "resolved",
        status: data.status || "pending",
        resolutionAction: data.resolutionAction,
      };
    });
    reports.sort((a, b) => Number(a.resolved) - Number(b.resolved));
    return reports;
  } catch (err) {
    console.warn("fetchMerchantFlagReports error:", err);
    return [];
  }
};

export const resolveMerchantFlagReport = async (
  reportId: string,
  resolutionAction: "confirmed_correct" | "updated_hours"
): Promise<boolean> => {
  if (!isFirebaseConfigured() || !reportId) return true;
  try {
    await updateDoc(doc(db, "flagReports", String(reportId)), {
      status: "resolved",
      resolutionAction,
      resolvedAt: serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.error("resolveMerchantFlagReport error:", err);
    return false;
  }
};

export const resolveFlagReport = async (reportId: string): Promise<boolean> => {
  return resolveMerchantFlagReport(reportId, "confirmed_correct");
};

/**
 * Telemetry: Merchant Views & Direction Taps
 */
export const recordMerchantView = async (
  merchantId: string | number,
  userId?: string | null
): Promise<void> => {
  if (!isFirebaseConfigured()) return;
  try {
    await addDoc(collection(db, "merchantViews"), {
      merchantId: String(merchantId),
      userId: userId || null,
      viewedAt: serverTimestamp(),
    });
  } catch (err) {
    // Silent fail for telemetry
  }
};

export const recordDirectionTap = async (
  merchantId: string | number,
  userId?: string | null
): Promise<void> => {
  if (!isFirebaseConfigured()) return;
  try {
    await addDoc(collection(db, "directionTaps"), {
      merchantId: String(merchantId),
      userId: userId || null,
      tappedAt: serverTimestamp(),
    });
  } catch (err) {
    // Silent fail for telemetry
  }
};

/**
 * User Profile & Notification Preferences
 */
export const updateUserProfile = async (
  uid: string,
  data: Partial<UserProfile>
): Promise<boolean> => {
  if (!isFirebaseConfigured() || !uid) return true;
  try {
    await setDoc(
      doc(db, "users", uid),
      {
        ...data,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error("updateUserProfile error:", err);
    return false;
  }
};

export const updateNotificationPreferences = async (
  uid: string,
  preferences: Record<string, boolean>
): Promise<boolean> => {
  if (!isFirebaseConfigured() || !uid) return true;
  try {
    await setDoc(
      doc(db, "users", uid),
      {
        notificationPreferences: preferences,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error("updateNotificationPreferences error:", err);
    return false;
  }
};

export const getUserNotificationPreferences = async (
  uid: string
): Promise<Record<string, boolean> | null> => {
  if (!isFirebaseConfigured() || !uid) return null;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      return snap.data()?.notificationPreferences || null;
    }
    return null;
  } catch (err) {
    console.warn("getUserNotificationPreferences error:", err);
    return null;
  }
};

/**
 * Merchant lookup by ownerId
 */
export const fetchMerchantByOwner = async (
  ownerId: string
): Promise<MapMerchant | null> => {
  if (!isFirebaseConfigured() || !ownerId) return null;
  try {
    const q = query(
      collection(db, "merchants"),
      where("ownerId", "==", ownerId),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    return formatFirestoreMerchant(docSnap.id, docSnap.data());
  } catch (err) {
    console.error("fetchMerchantByOwner error:", err);
    return null;
  }
};

/**
 * Create a new merchant document
 */
export const createMerchantDoc = async (
  data: Partial<DocumentData>
): Promise<string | null> => {
  if (!isFirebaseConfigured()) return "mock-merchant-id";
  try {
    const docRef = await addDoc(collection(db, "merchants"), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.error("createMerchantDoc error:", err);
    return null;
  }
};

/**
 * Update merchant document
 */
export const updateMerchantDoc = async (
  merchantId: string,
  data: Partial<DocumentData>
): Promise<boolean> => {
  if (!isFirebaseConfigured() || !merchantId) return true;
  try {
    await updateDoc(doc(db, "merchants", String(merchantId)), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.error("updateMerchantDoc error:", err);
    return false;
  }
};

/**
 * Daily Check-in & Streak Calculation:
 * - dateStr-based day comparison (YYYY-MM-DD)
 * - If last check-in was today (diffDays === 0): no double-increment, return existing streak
 * - If last check-in was yesterday (diffDays === 1): streak = prevStreak + 1
 * - If gap >= 2 days or no previous check-ins: streak = 1
 */
export const getTodayDateStr = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const recordDailyCheckIn = async (
  merchantId: string
): Promise<{ streakCount: number; alreadyCheckedInToday: boolean }> => {
  if (!isFirebaseConfigured() || !merchantId) {
    return { streakCount: 1, alreadyCheckedInToday: false };
  }
  try {
    const todayStr = getTodayDateStr();

    // Query checkIns for this merchant
    const q = query(
      collection(db, "checkIns"),
      where("merchantId", "==", String(merchantId))
    );
    const snap = await getDocs(q);

    let prevStreak = 0;
    let prevDateStr = "";

    if (!snap.empty) {
      const docs = snap.docs.map((d) => d.data());
      docs.sort((a, b) => {
        const timeA = a.checkedInAt?.toMillis
          ? a.checkedInAt.toMillis()
          : a.checkedInAt?.seconds
          ? a.checkedInAt.seconds * 1000
          : a.dateStr
          ? new Date(a.dateStr + "T00:00:00").getTime()
          : 0;
        const timeB = b.checkedInAt?.toMillis
          ? b.checkedInAt.toMillis()
          : b.checkedInAt?.seconds
          ? b.checkedInAt.seconds * 1000
          : b.dateStr
          ? new Date(b.dateStr + "T00:00:00").getTime()
          : 0;
        return timeB - timeA;
      });

      const latest = docs[0];
      prevStreak =
        typeof latest.streakCount === "number"
          ? latest.streakCount
          : typeof latest.streak_count === "number"
          ? latest.streak_count
          : 1;
      prevDateStr =
        latest.dateStr ||
        (latest.checkedInAt?.toDate
          ? latest.checkedInAt.toDate().toISOString().slice(0, 10)
          : "");
    }

    if (prevDateStr === todayStr) {
      return { streakCount: prevStreak || 1, alreadyCheckedInToday: true };
    }

    let newStreak = 1;
    if (prevDateStr) {
      const prevDate = new Date(prevDateStr + "T00:00:00");
      const todayDate = new Date(todayStr + "T00:00:00");
      const diffMs = todayDate.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        newStreak = prevStreak + 1;
      } else {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    // Write new checkIn doc
    await addDoc(collection(db, "checkIns"), {
      merchantId: String(merchantId),
      checkedInAt: serverTimestamp(),
      dateStr: todayStr,
      streakCount: newStreak,
      streak_count: newStreak,
    });

    // Update merchant's verifiedTodayAt
    await updateDoc(doc(db, "merchants", String(merchantId)), {
      verifiedTodayAt: todayStr,
      isVerified: true,
      updatedAt: serverTimestamp(),
    });

    return { streakCount: newStreak, alreadyCheckedInToday: false };
  } catch (err) {
    console.error("recordDailyCheckIn error:", err);
    return { streakCount: 1, alreadyCheckedInToday: false };
  }
};

export const getLatestStreak = async (merchantId: string): Promise<number> => {
  if (!isFirebaseConfigured() || !merchantId) return 0;
  try {
    const q = query(
      collection(db, "checkIns"),
      where("merchantId", "==", String(merchantId))
    );
    const snap = await getDocs(q);
    if (snap.empty) return 0;

    const docs = snap.docs.map((d) => d.data());
    docs.sort((a, b) => {
      const timeA = a.checkedInAt?.toMillis
        ? a.checkedInAt.toMillis()
        : a.dateStr
        ? new Date(a.dateStr + "T00:00:00").getTime()
        : 0;
      const timeB = b.checkedInAt?.toMillis
        ? b.checkedInAt.toMillis()
        : b.dateStr
        ? new Date(b.dateStr + "T00:00:00").getTime()
        : 0;
      return timeB - timeA;
    });

    const latest = docs[0];
    const streak =
      typeof latest.streakCount === "number"
        ? latest.streakCount
        : typeof latest.streak_count === "number"
        ? latest.streak_count
        : 0;
    return streak;
  } catch (err) {
    console.warn("getLatestStreak error:", err);
    return 0;
  }
};

/**
 * Holiday Closures Subcollection (merchants/{merchantId}/holidayClosures)
 */
export interface HolidayClosureItem {
  id: string;
  startDate?: string;
  endDate?: string;
  date?: string;
  name?: string;
  notice?: string;
  reason?: string;
}

export const fetchMerchantHolidayClosures = async (
  merchantId: string
): Promise<HolidayClosureItem[]> => {
  if (!isFirebaseConfigured() || !merchantId) return [];
  try {
    const snap = await getDocs(
      collection(db, "merchants", String(merchantId), "holidayClosures")
    );
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as HolidayClosureItem[];
  } catch (err) {
    console.warn("fetchMerchantHolidayClosures error:", err);
    return [];
  }
};

export const saveMerchantHolidayClosure = async (
  merchantId: string,
  closure: { startDate: string; endDate: string; notice?: string }
): Promise<boolean> => {
  if (!isFirebaseConfigured() || !merchantId) return true;
  try {
    await addDoc(
      collection(db, "merchants", String(merchantId), "holidayClosures"),
      {
        ...closure,
        name: closure.notice || "Temporary Closure",
        reason: closure.notice || "Closed",
        createdAt: serverTimestamp(),
      }
    );
    return true;
  } catch (err) {
    console.error("saveMerchantHolidayClosure error:", err);
    return false;
  }
};

export const deleteMerchantHolidayClosure = async (
  merchantId: string,
  closureId: string
): Promise<boolean> => {
  if (!isFirebaseConfigured() || !merchantId || !closureId) return true;
  try {
    await deleteDoc(
      doc(db, "merchants", String(merchantId), "holidayClosures", closureId)
    );
    return true;
  } catch (err) {
    console.error("deleteMerchantHolidayClosure error:", err);
    return false;
  }
};

/**
 * Performance metrics (Total counts for views and direction taps)
 */
export const fetchMerchantPerformanceMetrics = async (
  merchantId: string
): Promise<{ views: number; directionTaps: number; appearances: number }> => {
  if (!isFirebaseConfigured() || !merchantId) {
    return { views: 0, directionTaps: 0, appearances: 0 };
  }
  try {
    const [viewsSnap, tapsSnap] = await Promise.all([
      getDocs(
        query(
          collection(db, "merchantViews"),
          where("merchantId", "==", String(merchantId))
        )
      ),
      getDocs(
        query(
          collection(db, "directionTaps"),
          where("merchantId", "==", String(merchantId))
        )
      ),
    ]);

    const views = viewsSnap.size;
    const directionTaps = tapsSnap.size;
    const appearances = views > 0 ? Math.round(views * 1.5) : 0;

    return { views, directionTaps, appearances };
  } catch (err) {
    console.warn("fetchMerchantPerformanceMetrics error:", err);
    return { views: 0, directionTaps: 0, appearances: 0 };
  }
};

/**
 * Recent Activity feed for Merchant Dashboard
 */
export interface MerchantActivityItem {
  icon: string;
  text: string;
  time: string;
  timestamp: number;
}

export const fetchMerchantRecentActivity = async (
  merchantId: string
): Promise<MerchantActivityItem[]> => {
  if (!isFirebaseConfigured() || !merchantId) return [];
  try {
    const activities: MerchantActivityItem[] = [];

    // Query recent direction taps
    const tapsSnap = await getDocs(
      query(
        collection(db, "directionTaps"),
        where("merchantId", "==", String(merchantId)),
        limit(5)
      )
    );
    tapsSnap.docs.forEach((d) => {
      const data = d.data();
      const ms = data.tappedAt?.toMillis
        ? data.tappedAt.toMillis()
        : Date.now();
      activities.push({
        icon: "📍",
        text: "A shopper requested directions to your shop",
        time: formatRelativeTime(ms),
        timestamp: ms,
      });
    });

    // Query recent flag reports
    const flagsSnap = await getDocs(
      query(
        collection(db, "flagReports"),
        where("merchantId", "==", String(merchantId)),
        limit(5)
      )
    );
    flagsSnap.docs.forEach((d) => {
      const data = d.data();
      const ms = data.createdAt?.toMillis
        ? data.createdAt.toMillis()
        : Date.now();
      activities.push({
        icon: data.status === "resolved" ? "✓" : "🔴",
        text:
          data.status === "resolved"
            ? `Flag report resolved (${data.issueType || "Hours"})`
            : `New flag report: ${data.issueType || "Information"} reported`,
        time: formatRelativeTime(ms),
        timestamp: ms,
      });
    });

    // Sort descending by timestamp
    activities.sort((a, b) => b.timestamp - a.timestamp);

    if (activities.length === 0) {
      return [
        {
          icon: "✓",
          text: "Listing active and verified in local search",
          time: "Today",
          timestamp: Date.now(),
        },
      ];
    }

    return activities.slice(0, 6);
  } catch (err) {
    console.warn("fetchMerchantRecentActivity error:", err);
    return [];
  }
};

/**
 * Notifications (notifications/{uid}/items)
 */
export const fetchUserNotifications = async (
  uid: string
): Promise<NotificationItem[]> => {
  if (!isFirebaseConfigured() || !uid) return NOTIFICATIONS;
  try {
    const snap = await getDocs(
      collection(db, "notifications", uid, "items")
    );
    if (snap.empty) return [];
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        tab: "Updates",
        icon: data.icon || "🔔",
        title: data.title || "Notification",
        body: data.body || "",
        time: data.time || "Recently",
        unread: Boolean(data.unread),
      };
    });
  } catch (err) {
    console.warn("fetchUserNotifications error:", err);
    return NOTIFICATIONS;
  }
};

export const markNotificationAsRead = async (
  uid: string,
  notificationId: string
): Promise<boolean> => {
  if (!isFirebaseConfigured() || !uid || !notificationId) return true;
  try {
    await updateDoc(doc(db, "notifications", uid, "items", notificationId), {
      unread: false,
    });
    return true;
  } catch (err) {
    console.error("markNotificationAsRead error:", err);
    return false;
  }
};

// ============================================================
// Admin Functions
// ============================================================

/**
 * Fetch aggregate dashboard stats for the admin panel.
 * Uses getCountFromServer for real-time counts.
 */
export const fetchAdminDashboardStats = async (): Promise<{
  totalUsers: number;
  totalMerchants: number;
  totalFlagReports: number;
  pendingFlagReports: number;
  verifiedMerchants: number;
  suspendedUsers: number;
  newUsersToday: number;
  newMerchantsToday: number;
}> => {
  if (!isFirebaseConfigured()) {
    return {
      totalUsers: 0,
      totalMerchants: 0,
      totalFlagReports: 0,
      pendingFlagReports: 0,
      verifiedMerchants: 0,
      suspendedUsers: 0,
      newUsersToday: 0,
      newMerchantsToday: 0,
    };
  }

  try {
    const todayStr = getTodayDateStr();

    const [
      usersSnap,
      merchantsSnap,
      flagReportsSnap,
      pendingFlagsSnap,
      verifiedMerchantsSnap,
      suspendedUsersSnap,
    ] = await Promise.all([
      getCountFromServer(query(collection(db, "users"))),
      getCountFromServer(query(collection(db, "merchants"))),
      getCountFromServer(query(collection(db, "flagReports"))),
      getCountFromServer(
        query(collection(db, "flagReports"), where("status", "==", "pending"))
      ),
      getCountFromServer(
        query(collection(db, "merchants"), where("isVerified", "==", true))
      ),
      getCountFromServer(
        query(collection(db, "users"), where("disabled", "==", true))
      ),
    ]);

    // Count today's new users and merchants by fetching and filtering
    const [usersTodaySnap, merchantsTodaySnap] = await Promise.all([
      getDocs(query(collection(db, "users"), where("createdAt", ">=", todayStr))),
      getDocs(query(collection(db, "merchants"), where("createdAt", ">=", todayStr))),
    ]);

    return {
      totalUsers: usersSnap.data().count,
      totalMerchants: merchantsSnap.data().count,
      totalFlagReports: flagReportsSnap.data().count,
      pendingFlagReports: pendingFlagsSnap.data().count,
      verifiedMerchants: verifiedMerchantsSnap.data().count,
      suspendedUsers: suspendedUsersSnap.data().count,
      newUsersToday: usersTodaySnap.size,
      newMerchantsToday: merchantsTodaySnap.size,
    };
  } catch (err) {
    console.error("fetchAdminDashboardStats error:", err);
    return {
      totalUsers: 0,
      totalMerchants: 0,
      totalFlagReports: 0,
      pendingFlagReports: 0,
      verifiedMerchants: 0,
      suspendedUsers: 0,
      newUsersToday: 0,
      newMerchantsToday: 0,
    };
  }
};

/**
 * Fetch all merchants for admin management.
 */
export const fetchAllMerchantsAdmin = async (): Promise<
  Array<{
    id: string;
    name: string;
    category: string;
    ownerId: string;
    isVerified: boolean;
    suspended: boolean;
    createdAt: any;
    address?: string;
    description?: string;
    coverPhotoUrl?: string;
  }>
> => {
  if (!isFirebaseConfigured()) return [];
  try {
    const snap = await getDocs(collection(db, "merchants"));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name || "Unnamed",
        category: data.category || "General",
        ownerId: data.ownerId || "",
        isVerified: Boolean(data.isVerified),
        suspended: Boolean(data.suspended),
        createdAt: data.createdAt,
        address: data.address || "",
        description: data.description || "",
        coverPhotoUrl: data.coverPhotoUrl || data.img || "",
      };
    });
  } catch (err) {
    console.error("fetchAllMerchantsAdmin error:", err);
    return [];
  }
};

/**
 * Set merchant verified status (admin action).
 */
export const setMerchantVerifiedAdmin = async (
  merchantId: string,
  verified: boolean
): Promise<boolean> => {
  if (!isFirebaseConfigured() || !merchantId) return true;
  try {
    await updateDoc(doc(db, "merchants", String(merchantId)), {
      isVerified: verified,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.error("setMerchantVerifiedAdmin error:", err);
    return false;
  }
};

/**
 * Set merchant suspended status (admin action).
 */
export const setMerchantSuspendedAdmin = async (
  merchantId: string,
  suspended: boolean
): Promise<boolean> => {
  if (!isFirebaseConfigured() || !merchantId) return true;
  try {
    await updateDoc(doc(db, "merchants", String(merchantId)), {
      suspended,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.error("setMerchantSuspendedAdmin error:", err);
    return false;
  }
};

/**
 * Fetch all flag reports for admin moderation queue.
 */
export const fetchAllFlagReportsAdmin = async (): Promise<
  Array<{
    id: string;
    merchantId: string;
    reporter: string;
    reporterId: string;
    issue: string;
    detail: string;
    time: string;
    resolved: boolean;
    status: string;
    resolutionAction: string | null;
    createdAt: any;
  }>
> => {
  if (!isFirebaseConfigured()) return [];
  try {
    const snap = await getDocs(
      query(collection(db, "flagReports"), limit(100))
    );
    const reports = snap.docs.map((d) => {
      const data = d.data();
      const ms = data.createdAt?.toMillis?.() ?? 0;
      return {
        id: d.id,
        merchantId: data.merchantId || "",
        reporter: data.reporterName || "Anonymous",
        reporterId: data.reporterId || "",
        issue: data.issueType || "Unknown",
        detail: data.detail || "",
        time: ms > 0 ? formatRelativeTime(ms) : "Recently",
        resolved: data.status === "resolved",
        status: data.status || "pending",
        resolutionAction: data.resolutionAction || null,
        createdAt: data.createdAt,
      };
    });
    // Sort: pending first, then by most recent
    reports.sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      return 0;
    });
    return reports;
  } catch (err) {
    console.error("fetchAllFlagReportsAdmin error:", err);
    return [];
  }
};

/**
 * Resolve a flag report (admin action).
 */
export const resolveFlagReportAdmin = async (
  reportId: string,
  resolutionAction: "confirmed_correct" | "updated_hours" | "dismissed"
): Promise<boolean> => {
  if (!isFirebaseConfigured() || !reportId) return true;
  try {
    await updateDoc(doc(db, "flagReports", String(reportId)), {
      status: "resolved",
      resolutionAction,
      resolvedAt: serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.error("resolveFlagReportAdmin error:", err);
    return false;
  }
};

/**
 * Fetch all users for admin management.
 */
export const fetchAllUsersAdmin = async (): Promise<
  Array<{
    uid: string;
    fullName: string;
    email: string;
    role: Role;
    createdAt: any;
    disabled: boolean;
    interests?: string[];
  }>
> => {
  if (!isFirebaseConfigured()) return [];
  try {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        fullName: data.fullName || data.name || "Unnamed",
        email: data.email || "",
        role: (data.role || "shopper") as Role,
        createdAt: data.createdAt,
        disabled: Boolean(data.disabled),
        interests: data.interests || [],
      };
    });
  } catch (err) {
    console.error("fetchAllUsersAdmin error:", err);
    return [];
  }
};

/**
 * Update a user's role (admin action).
 */
export const updateUserRoleAdmin = async (
  uid: string,
  newRole: string
): Promise<boolean> => {
  if (!isFirebaseConfigured() || !uid) return true;
  try {
    await updateDoc(doc(db, "users", String(uid)), {
      role: newRole,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.error("updateUserRoleAdmin error:", err);
    return false;
  }
};

/**
 * Set user disabled/suspended status (admin action).
 */
export const setUserDisabledAdmin = async (
  uid: string,
  disabled: boolean
): Promise<boolean> => {
  if (!isFirebaseConfigured() || !uid) return true;
  try {
    await updateDoc(doc(db, "users", String(uid)), {
      disabled,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.error("setUserDisabledAdmin error:", err);
    return false;
  }
};

/**
 * Get the count of saved merchants for a user.
 */
export const getUserSavedCount = async (uid: string): Promise<number> => {
  if (!isFirebaseConfigured() || !uid) return 0;
  try {
    const snap = await getCountFromServer(
      collection(db, "savedMerchants", uid, "items")
    );
    return snap.data().count;
  } catch (err) {
    console.warn("getUserSavedCount error:", err);
    return 0;
  }
};

/**
 * Get the merchant listing owned by a user (if any).
 */
export const getUserMerchantListing = async (
  uid: string
): Promise<MapMerchant | null> => {
  return fetchMerchantByOwner(uid);
};
