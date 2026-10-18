import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../lib/firebase";
import { fetchMerchants } from "./firestoreService";
import { MerchantPost } from "../types";

export interface MerchantReviewWithProfile {
  id: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: unknown;
  reviewerName: string;
  avatarUrl?: string;
}

export interface MerchantCustomerActivity {
  id: string;
  type: "saved" | "review";
  shopperName: string;
  rating?: number;
  comment?: string;
  createdAt: unknown;
}

export const fetchMerchantPostsForCustomer = async (
  merchantId: string
): Promise<MerchantPost[]> => {
  if (!isFirebaseConfigured() || !merchantId) {
    throw new Error("Business posts are unavailable.");
  }

  const snapshot = await getDocs(
    collection(db, "merchants", merchantId, "posts")
  );
  return snapshot.docs
    .map((postDoc) => {
      const data = postDoc.data();
      const images = Array.isArray(data.images)
        ? data.images.filter(
            (image: unknown): image is string => typeof image === "string"
          )
        : undefined;
      return {
        id: postDoc.id,
        image:
          typeof data.image === "string"
            ? data.image
            : images?.[0] || "",
        images,
        caption: typeof data.caption === "string" ? data.caption : "",
        type: typeof data.type === "string" ? data.type : "update",
        createdAt: data.createdAt,
      };
    })
    .sort(
      (a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt)
    );
};

const timestampMillis = (value: unknown): number => {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === "object" && "toMillis" in value) {
    const toMillis = value.toMillis;
    if (typeof toMillis === "function") {
      const millis: unknown = toMillis.call(value);
      if (typeof millis === "number") return millis;
    }
  }
  if (value && typeof value === "object" && "toDate" in value) {
    const toDate = value.toDate;
    if (typeof toDate === "function") {
      const date: unknown = toDate.call(value);
      if (date instanceof Date) return date.getTime();
    }
  }
  return 0;
};

export const fetchMerchantReviews = async (
  merchantId: string | number
): Promise<MerchantReviewWithProfile[]> => {
  if (!isFirebaseConfigured() || !merchantId) {
    throw new Error("Merchant reviews are unavailable.");
  }

  const snapshot = await getDocs(
    collection(db, "merchants", String(merchantId), "reviews")
  );
  const reviews = await Promise.all(
    snapshot.docs.map(async (reviewDoc) => {
      const data = reviewDoc.data();
      const userId = typeof data.userId === "string" ? data.userId : "";
      const embeddedReviewerName =
        typeof data.reviewerName === "string" ? data.reviewerName : "";
      const embeddedAvatarUrl =
        typeof data.avatarUrl === "string" ? data.avatarUrl : undefined;
      let profile: Record<string, unknown> = {};

      if (userId && (!embeddedReviewerName || embeddedAvatarUrl === undefined)) {
        try {
          const profileSnapshot = await getDoc(doc(db, "users", userId));
          if (profileSnapshot.exists()) {
            profile = profileSnapshot.data();
          }
        } catch (error) {
          console.warn("fetchMerchantReviews profile error:", error);
        }
      }

      const reviewerName =
        embeddedReviewerName ||
        (typeof profile.fullName === "string" && profile.fullName) ||
        (typeof profile.name === "string" && profile.name) ||
        "Locali shopper";

      return {
        id: reviewDoc.id,
        userId,
        rating: Number(data.rating) || 0,
        comment: typeof data.comment === "string" ? data.comment : "",
        createdAt: data.updatedAt ?? data.createdAt,
        reviewerName,
        avatarUrl:
          embeddedAvatarUrl ??
          (typeof profile.avatarUrl === "string" ? profile.avatarUrl : undefined),
      };
    })
  );

  return reviews.sort(
    (a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt)
  );
};

export const saveMerchantReviewProfile = async (
  merchantId: string | number,
  userId: string,
  reviewerName: string,
  avatarUrl?: string
): Promise<void> => {
  if (!isFirebaseConfigured() || !merchantId || !userId) {
    throw new Error("Review profile details are unavailable.");
  }

  await setDoc(
    doc(db, "merchants", String(merchantId), "reviews", userId),
    {
      userId,
      reviewerName: reviewerName || "Locali shopper",
      avatarUrl: avatarUrl || "",
    },
    { merge: true }
  );
};

export const getUserReviewCount = async (userId: string): Promise<number> => {
  if (!isFirebaseConfigured() || !userId) return 0;

  const merchants = await fetchMerchants();
  const userReviewDocs = await Promise.all(
    merchants.map((merchant) =>
      getDoc(doc(db, "merchants", String(merchant.id), "reviews", userId))
    )
  );
  return userReviewDocs.filter((review) => review.exists()).length;
};

export const createMerchantCustomerActivity = async (
  merchantId: string | number,
  activity: Omit<MerchantCustomerActivity, "id" | "createdAt">
): Promise<void> => {
  if (!isFirebaseConfigured() || !merchantId) {
    throw new Error("Merchant activity is unavailable.");
  }

  await addDoc(collection(db, "merchants", String(merchantId), "activity"), {
    ...activity,
    createdAt: serverTimestamp(),
  });
};

export const fetchMerchantCustomerActivity = async (
  merchantId: string
): Promise<MerchantCustomerActivity[]> => {
  if (!isFirebaseConfigured() || !merchantId) {
    throw new Error("Merchant activity is unavailable.");
  }

  const snapshot = await getDocs(
    collection(db, "merchants", merchantId, "activity")
  );
  const activities = snapshot.docs.map((activityDoc) => {
    const data = activityDoc.data();
    return {
      id: activityDoc.id,
      type: data.type === "review" ? "review" : "saved",
      shopperName:
        typeof data.shopperName === "string" ? data.shopperName : "A shopper",
      rating: typeof data.rating === "number" ? data.rating : undefined,
      comment: typeof data.comment === "string" ? data.comment : undefined,
      createdAt: data.createdAt,
    } satisfies MerchantCustomerActivity;
  });

  return activities.sort(
    (a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt)
  );
};
