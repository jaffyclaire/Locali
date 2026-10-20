import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { Colors, Radius, Shadows } from "../../src/constants/theme";
import {
  BackArrowIcon,
  StarIcon,
} from "../../src/components/icons/AppIcons";
import { ReviewCard } from "../../src/components/ReviewCard";
import { useAuthRole } from "../../src/context/AuthRoleContext";
import { MapMerchant } from "../../src/types";
import {
  deleteReviewReply,
  fetchMerchantReviewById,
  fetchMerchantReviewPage,
  MerchantReviewWithProfile,
  saveReviewReply,
} from "../../src/services/merchantCommunityService";
import { fetchMerchants } from "../../src/services/firestoreService";
import { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";

type RatingFilter = "All" | 1 | 2 | 3 | 4 | 5;

const RATING_FILTERS: RatingFilter[] = ["All", 5, 4, 3, 2, 1];
const PAGE_SIZE = 20;

export default function MerchantReviewsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthRole();
  const userId = user?.uid;
  const { merchantId: merchantIdParam } = useLocalSearchParams<{
    merchantId?: string | string[];
  }>();
  const merchantId = Array.isArray(merchantIdParam)
    ? merchantIdParam[0]
    : merchantIdParam;

  const [merchant, setMerchant] = useState<MapMerchant | null>(null);
  const [reviews, setReviews] = useState<MerchantReviewWithProfile[]>([]);
  const [ownReview, setOwnReview] = useState<MerchantReviewWithProfile | null>(
    null
  );
  const [cursor, setCursor] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [filter, setFilter] = useState<RatingFilter>("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [loadMoreError, setLoadMoreError] = useState("");

  const loadReviews = useCallback(
    async (pullToRefresh = false) => {
      if (!merchantId) {
        setError("This business could not be found.");
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (pullToRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      setLoadMoreError("");

      try {
        const [merchants, page, currentUserReview] = await Promise.all([
          fetchMerchants(),
          fetchMerchantReviewPage(merchantId, null, PAGE_SIZE),
          userId
            ? fetchMerchantReviewById(merchantId, userId)
            : Promise.resolve(null),
        ]);
        const foundMerchant =
          merchants.find((item) => String(item.id) === merchantId) || null;
        if (!foundMerchant) {
          throw new Error("This business could not be found.");
        }

        setMerchant(foundMerchant);
        setReviews(page.reviews);
        setOwnReview(currentUserReview);
        setCursor(page.lastDocument);
        setHasMore(page.hasMore);
        setTotalCount(page.totalCount);
      } catch (loadError) {
        console.warn("[MerchantReviewsPage] Could not load reviews:", loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Reviews could not be loaded. Please try again."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [merchantId, userId]
  );

  useFocusEffect(
    useCallback(() => {
      void loadReviews();
    }, [loadReviews])
  );

  const loadMoreReviews = async () => {
    if (!merchantId || !cursor || !hasMore || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError("");
    try {
      const page = await fetchMerchantReviewPage(
        merchantId,
        cursor,
        PAGE_SIZE
      );
      setReviews((current) => {
        const knownIds = new Set(current.map((review) => review.id));
        return [
          ...current,
          ...page.reviews.filter((review) => !knownIds.has(review.id)),
        ];
      });
      setCursor(page.lastDocument);
      setHasMore(page.hasMore);
      setTotalCount(page.totalCount);
      if (ownReview?.id === userId) {
        const updatedOwnReview = page.reviews.find(
          (review) => review.id === ownReview.id
        );
        if (updatedOwnReview) setOwnReview(updatedOwnReview);
      }
    } catch (loadError) {
      console.warn("[MerchantReviewsPage] Could not load more reviews:", loadError);
      setLoadMoreError("Could not load more reviews. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  };

  const loadedReviewsForSummary = useMemo(
    () =>
      ownReview && !reviews.some((review) => review.id === ownReview.id)
        ? [...reviews, ownReview]
        : reviews,
    [ownReview, reviews]
  );
  const loadedReviewCount = loadedReviewsForSummary.length;
  const ratingCounts = useMemo(() => {
    const counts = new Map<number, number>([
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
      [5, 0],
    ]);
    loadedReviewsForSummary.forEach((review) => {
      if (review.rating >= 1 && review.rating <= 5) {
        counts.set(review.rating, (counts.get(review.rating) || 0) + 1);
      }
    });
    return counts;
  }, [loadedReviewsForSummary]);

  const filteredReviews = useMemo(
    () =>
      reviews.filter(
        (review) =>
          review.id !== ownReview?.id &&
          (filter === "All" || review.rating === filter)
      ),
    [filter, ownReview?.id, reviews]
  );

  const ratedReviews = loadedReviewsForSummary.filter(
    (review) => review.rating >= 1 && review.rating <= 5
  );
  const averageRating =
    ratedReviews.length > 0
      ? ratedReviews.reduce((sum, review) => sum + review.rating, 0) /
        ratedReviews.length
      : 0;
  const showOwnReview =
    !!ownReview && (filter === "All" || ownReview.rating === filter);
  const isMerchantOwner = !!userId && merchant?.ownerId === userId;

  const updateReviewReply = async (
    reviewId: string,
    reply: string
  ): Promise<void> => {
    if (!merchant || !isMerchantOwner) return;
    await saveReviewReply(merchant.id, reviewId, reply);
    const updateReply = (review: MerchantReviewWithProfile) =>
      review.id === reviewId
        ? { ...review, reply: reply.trim(), repliedAt: new Date() }
        : review;
    setReviews((current) => current.map(updateReply));
    setOwnReview((current) => (current ? updateReply(current) : current));
  };

  const removeReviewReply = async (reviewId: string): Promise<void> => {
    if (!merchant || !isMerchantOwner) return;
    await deleteReviewReply(merchant.id, reviewId);
    const removeReply = (review: MerchantReviewWithProfile) =>
      review.id === reviewId
        ? { ...review, reply: undefined, repliedAt: undefined }
        : review;
    setReviews((current) => current.map(removeReply));
    setOwnReview((current) => (current ? removeReply(current) : current));
  };

  const listHeader = (
    <View style={styles.listHeader}>
      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View>
            <Text style={styles.averageRating}>{averageRating.toFixed(1)}</Text>
            <View style={styles.summaryStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <StarIcon
                  key={star}
                  size={18}
                  color={
                    star <= Math.round(averageRating)
                      ? Colors.amber[500]
                      : Colors.slate[200]
                  }
                />
              ))}
            </View>
          </View>
          <Text style={styles.totalReviews}>
            {totalCount} {totalCount === 1 ? "review" : "reviews"}
          </Text>
        </View>
        <View style={styles.breakdown}>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = ratingCounts.get(star) || 0;
            const percent =
              loadedReviewCount > 0 ? (count / loadedReviewCount) * 100 : 0;
            return (
              <View key={star} style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{star}</Text>
                <StarIcon size={13} color={Colors.amber[500]} />
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${percent}%` },
                    ]}
                  />
                </View>
                <Text style={styles.breakdownCount}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.filterRow}>
        {RATING_FILTERS.map((rating) => {
          const selected = filter === rating;
          return (
            <TouchableOpacity
              key={String(rating)}
              onPress={() => setFilter(rating)}
              style={[styles.filterChip, selected && styles.filterChipSelected]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text
                style={[
                  styles.filterText,
                  selected && styles.filterTextSelected,
                ]}
              >
                {rating === "All" ? "All" : `${rating} ★`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {showOwnReview && ownReview && (
        <View style={styles.ownReviewSection}>
          <Text style={styles.ownReviewLabel}>Your review</Text>
          <ReviewCard
            review={ownReview}
            businessName={merchant?.name || "Business"}
            onSaveReply={
              isMerchantOwner
                ? (reply) => updateReviewReply(ownReview.id, reply)
                : undefined
            }
            onDeleteReply={
              isMerchantOwner
                ? () => removeReviewReply(ownReview.id)
                : undefined
            }
          />
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(shopper)/discover");
          }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <BackArrowIcon size={20} color={Colors.teal[700]} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Reviews</Text>
          {!!merchant?.name && (
            <Text style={styles.merchantName} numberOfLines={1}>
              {merchant.name}
            </Text>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator size="large" color={Colors.teal[700]} />
          <Text style={styles.stateText}>Loading reviews...</Text>
        </View>
      ) : error ? (
        <View style={styles.state}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => void loadReviews()}
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredReviews}
          keyExtractor={(review) => review.id}
          renderItem={({ item }) => (
            <ReviewCard
              review={item}
              businessName={merchant?.name || "Business"}
              onSaveReply={
                isMerchantOwner
                  ? (reply) => updateReviewReply(item.id, reply)
                  : undefined
              }
              onDeleteReply={
                isMerchantOwner
                  ? () => removeReviewReply(item.id)
                  : undefined
              }
            />
          )}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            showOwnReview ? null : (
              <Text style={styles.emptyText}>
                {totalCount === 0
                  ? "No reviews yet"
                  : filter === "All"
                    ? "No reviews yet"
                    : "No reviews match this rating"}
              </Text>
            )
          }
          ListFooterComponent={
            <View style={styles.listFooter}>
              {loadMoreError ? (
                <TouchableOpacity
                  onPress={() => void loadMoreReviews()}
                  accessibilityRole="button"
                >
                  <Text style={styles.errorText}>{loadMoreError} Tap to retry.</Text>
                </TouchableOpacity>
              ) : loadingMore ? (
                <ActivityIndicator color={Colors.teal[700]} />
              ) : hasMore ? (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={() => void loadMoreReviews()}
                  accessibilityRole="button"
                >
                  <Text style={styles.loadMoreText}>Load more reviews</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadReviews(true)}
              tintColor={Colors.teal[700]}
              colors={[Colors.teal[700]]}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 24 + insets.bottom },
            filteredReviews.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.slate[50],
  },
  header: {
    minHeight: 58,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate[100],
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.teal[50],
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    color: Colors.slate[900],
    fontSize: 17,
    fontWeight: "700",
  },
  merchantName: {
    color: Colors.slate[500],
    fontSize: 12,
    marginTop: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 10,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  listHeader: {
    gap: 12,
    marginBottom: 2,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.slate[100],
    ...Shadows.sm,
  },
  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  averageRating: {
    color: Colors.slate[900],
    fontSize: 32,
    fontWeight: "800",
  },
  summaryStars: {
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
  },
  totalReviews: {
    color: Colors.slate[600],
    fontSize: 13,
    fontWeight: "600",
  },
  breakdown: {
    gap: 7,
    marginTop: 16,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  breakdownLabel: {
    width: 12,
    color: Colors.slate[600],
    fontSize: 11,
    textAlign: "right",
  },
  progressTrack: {
    flex: 1,
    height: 7,
    overflow: "hidden",
    borderRadius: Radius.full,
    backgroundColor: Colors.slate[100],
    marginHorizontal: 4,
  },
  progressFill: {
    height: "100%",
    borderRadius: Radius.full,
    backgroundColor: Colors.amber[500],
  },
  breakdownCount: {
    width: 24,
    color: Colors.slate[500],
    fontSize: 11,
    textAlign: "right",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate[200],
  },
  filterChipSelected: {
    backgroundColor: Colors.teal[700],
    borderColor: Colors.teal[700],
  },
  filterText: {
    color: Colors.slate[600],
    fontSize: 12,
    fontWeight: "600",
  },
  filterTextSelected: {
    color: Colors.white,
  },
  ownReviewSection: {
    gap: 7,
  },
  ownReviewLabel: {
    color: Colors.teal[700],
    fontSize: 13,
    fontWeight: "700",
  },
  state: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 12,
  },
  stateText: {
    color: Colors.slate[500],
    fontSize: 13,
  },
  errorText: {
    color: Colors.rose[700],
    fontSize: 13,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: Colors.teal[700],
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radius.lg,
  },
  retryText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  emptyText: {
    color: Colors.slate[500],
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 24,
  },
  listFooter: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  loadMoreButton: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  loadMoreText: {
    color: Colors.teal[700],
    fontSize: 13,
    fontWeight: "700",
  },
});
