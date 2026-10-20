import {
  addDoc,
  collection,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  getCountFromServer,
  limit,
  orderBy,
  query,
  QueryConstraint,
  QueryDocumentSnapshot,
  startAfter,
  updateDoc,
  deleteField,
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
  imageUrls?: string[];
  reply?: string;
  repliedAt?: unknown;
}

export interface MerchantReviewPage {
  reviews: MerchantReviewWithProfile[];
  lastDocument: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
  totalCount: number;
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
    snapshot.docs.map((reviewDoc) =>
      mapMerchantReview(reviewDoc.id, reviewDoc.data())
    )
  );

  return reviews.sort(
    (a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt)
  );
};

const mapMerchantReview = async (
  reviewId: string,
  data: DocumentData
): Promise<MerchantReviewWithProfile> => {
  const userId = typeof data.userId === "string" ? data.userId : "";
  const embeddedReviewerName =
    typeof data.reviewerName === "string" ? data.reviewerName : "";
  const embeddedAvatarUrl =
    typeof data.avatarUrl === "string" ? data.avatarUrl : undefined;
  let profile: Record<string, unknown> = {};

  if (userId && (!embeddedReviewerName || embeddedAvatarUrl === undefined)) {
    try {
      const profileSnapshot = await getDoc(doc(db, "users", userId));
      if (profileSnapshot.exists()) profile = profileSnapshot.data();
    } catch (error) {
      console.warn("fetchMerchantReviews profile error:", error);
    }
  }

  return {
    id: reviewId,
    userId,
    rating: Number(data.rating) || 0,
    comment: typeof data.comment === "string" ? data.comment : "",
    createdAt: data.createdAt,
    reviewerName:
      embeddedReviewerName ||
      (typeof profile.fullName === "string" && profile.fullName) ||
      (typeof profile.name === "string" && profile.name) ||
      "Locali shopper",
    avatarUrl:
      embeddedAvatarUrl ??
      (typeof profile.avatarUrl === "string" ? profile.avatarUrl : undefined),
    imageUrls: Array.isArray(data.imageUrls)
      ? data.imageUrls
          .filter((url: unknown): url is string => typeof url === "string")
          .slice(0, 3)
      : [],
    reply: typeof data.reply === "string" ? data.reply : undefined,
    repliedAt: data.repliedAt,
  };
};

export const fetchMerchantReviewPage = async (
  merchantId: string | number,
  cursor: QueryDocumentSnapshot<DocumentData> | null = null,
  pageSize = 20
): Promise<MerchantReviewPage> => {
  if (!isFirebaseConfigured() || !merchantId) {
    throw new Error("Merchant reviews are unavailable.");
  }

  const reviewsRef = collection(db, "merchants", String(merchantId), "reviews");
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(limit(pageSize + 1));

  const [snapshot, countSnapshot] = await Promise.all([
    getDocs(query(reviewsRef, ...constraints)),
    getCountFromServer(reviewsRef),
  ]);
  const pageDocuments = snapshot.docs.slice(0, pageSize);
  const reviews = await Promise.all(
    pageDocuments.map((reviewDoc) =>
      mapMerchantReview(reviewDoc.id, reviewDoc.data())
    )
  );

  return {
    reviews,
    lastDocument: pageDocuments[pageDocuments.length - 1] ?? null,
    hasMore: snapshot.size > pageSize,
    totalCount: countSnapshot.data().count,
  };
};

export const fetchMerchantReviewById = async (
  merchantId: string | number,
  reviewId: string
): Promise<MerchantReviewWithProfile | null> => {
  if (!isFirebaseConfigured() || !merchantId || !reviewId) return null;

  const reviewSnapshot = await getDoc(
    doc(db, "merchants", String(merchantId), "reviews", reviewId)
  );
  if (!reviewSnapshot.exists()) return null;
  return mapMerchantReview(reviewSnapshot.id, reviewSnapshot.data());
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

  try {
    await addDoc(collection(db, "merchants", String(merchantId), "activity"), {
      ...activity,
      shopperName: activity.shopperName.trim() || "A shopper",
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    const firebaseError = error as { code?: unknown; message?: unknown };
    console.warn(
      "createMerchantCustomerActivity Firestore error:",
      typeof firebaseError.code === "string" ? firebaseError.code : "unknown",
      typeof firebaseError.message === "string"
        ? firebaseError.message
        : "Unknown Firestore error"
    );
    throw error;
  }
};

export const saveReviewReply = async (
  merchantId: string | number,
  reviewId: string,
  reply: string
): Promise<void> => {
  const trimmedReply = reply.trim();
  if (!isFirebaseConfigured() || !merchantId || !reviewId || !trimmedReply) {
    throw new Error("A reply is required to update this review.");
  }
  if (trimmedReply.length > 500) {
    throw new Error("Replies can be up to 500 characters.");
  }

  await updateDoc(
    doc(db, "merchants", String(merchantId), "reviews", reviewId),
    {
      reply: trimmedReply,
      repliedAt: serverTimestamp(),
    }
  );
};

export const deleteReviewReply = async (
  merchantId: string | number,
  reviewId: string
): Promise<void> => {
  if (!isFirebaseConfigured() || !merchantId || !reviewId) {
    throw new Error("Review reply is unavailable.");
  }

  await updateDoc(
    doc(db, "merchants", String(merchantId), "reviews", reviewId),
    {
      reply: deleteField(),
      repliedAt: deleteField(),
    }
  );
};
