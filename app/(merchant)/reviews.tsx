import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuthRole } from "../../src/context/AuthRoleContext";
import { Colors, Radius } from "../../src/constants/theme";
import { BackArrowIcon, StarIcon } from "../../src/components/icons/AppIcons";
import { ReviewCard } from "../../src/components/ReviewCard";
import { Merchant } from "../../src/types";
import {
  deleteReviewReply,
  fetchMerchantReviews,
  MerchantReviewWithProfile,
  saveReviewReply,
} from "../../src/services/merchantCommunityService";
import { fetchMerchantByOwner } from "../../src/services/firestoreService";

type ReviewFilter = "All" | "Needs reply" | "Replied" | "With photos";

const FILTERS: ReviewFilter[] = ["All", "Needs reply", "Replied", "With photos"];

export default function MerchantReviewsScreen() {
  const router = useRouter();
  const { user } = useAuthRole();
  const userId = user?.uid;
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [reviews, setReviews] = useState<MerchantReviewWithProfile[]>([]);
  const [filter, setFilter] = useState<ReviewFilter>("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadReviews = useCallback(
    async (pullToRefresh = false) => {
      if (pullToRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        const currentMerchant = userId
          ? await fetchMerchantByOwner(userId)
          : null;
        setMerchant(currentMerchant);
        if (!currentMerchant) {
          setReviews([]);
          return;
        }
        setReviews(await fetchMerchantReviews(currentMerchant.id));
      } catch (loadError) {
        console.warn("Merchant reviews load failed:", loadError);
        setError("Reviews could not be loaded. Please retry.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId]
  );

  useFocusEffect(
    useCallback(() => {
      void loadReviews();
    }, [loadReviews])
  );

  const filteredReviews = useMemo(
    () =>
      reviews.filter((review) => {
        if (filter === "Needs reply") return !review.reply;
        if (filter === "Replied") return !!review.reply;
        if (filter === "With photos") return !!review.imageUrls?.length;
        return true;
      }),
    [filter, reviews]
  );

  const ratedReviews = reviews.filter(
    (review) => review.rating >= 1 && review.rating <= 5
  );
  const averageRating =
    ratedReviews.length > 0
      ? ratedReviews.reduce((sum, review) => sum + review.rating, 0) /
        ratedReviews.length
      : 0;

  const handleSaveReply = async (reviewId: string, reply: string) => {
    if (!merchant) return;
    await saveReviewReply(merchant.id, reviewId, reply);
    setReviews((current) =>
      current.map((review) =>
        review.id === reviewId
          ? { ...review, reply: reply.trim(), repliedAt: new Date() }
          : review
      )
    );
  };

  const handleDeleteReply = async (reviewId: string) => {
    if (!merchant) return;
    await deleteReviewReply(merchant.id, reviewId);
    setReviews((current) =>
      current.map((review) =>
        review.id === reviewId
          ? { ...review, reply: undefined, repliedAt: undefined }
          : review
      )
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(merchant)/dashboard");
          }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <BackArrowIcon size={20} color={Colors.teal[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reviews</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadReviews(true)}
            tintColor={Colors.teal[700]}
            colors={[Colors.teal[700]]}
          />
        }
      >
        <View style={styles.summary}>
          <View style={styles.ratingLine}>
            <Text style={styles.ratingValue}>{averageRating.toFixed(1)}</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <StarIcon
                  key={star}
                  size={17}
                  color={
                    star <= Math.round(averageRating)
                      ? Colors.amber[500]
                      : Colors.slate[200]
                  }
                />
              ))}
            </View>
          </View>
          <Text style={styles.reviewCount}>
            {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => setFilter(item)}
              style={[styles.filterChip, filter === item && styles.filterChipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === item }}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === item && styles.filterTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.state}>
            <ActivityIndicator color={Colors.teal[700]} />
            <Text style={styles.stateText}>Loading reviews...</Text>
          </View>
        ) : error ? (
          <View style={styles.state}>
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => void loadReviews()}
              accessibilityRole="button"
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filteredReviews.length === 0 ? (
          <View style={styles.state}>
            <Text style={styles.stateText}>
              {reviews.length === 0
                ? "No reviews yet"
                : "No reviews match this filter"}
            </Text>
          </View>
        ) : (
          filteredReviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              businessName={merchant?.name || "Your business"}
              onSaveReply={(reply) => handleSaveReply(review.id, reply)}
              onDeleteReply={() => handleDeleteReply(review.id)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.slate[50] },
  header: {
    minHeight: 56,
    backgroundColor: Colors.white,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate[100],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.teal[50],
    marginRight: 10,
  },
  headerTitle: { color: Colors.slate[900], fontSize: 18, fontWeight: "700" },
  content: { padding: 16, gap: 12, paddingBottom: 30 },
  summary: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.slate[100],
  },
  ratingLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  ratingValue: { fontSize: 25, color: Colors.slate[900], fontWeight: "800" },
  stars: { flexDirection: "row", gap: 2 },
  reviewCount: { color: Colors.slate[500], fontSize: 12, marginTop: 3 },
  filters: { flexDirection: "row", gap: 8, paddingBottom: 2 },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate[200],
  },
  filterChipActive: {
    backgroundColor: Colors.teal[700],
    borderColor: Colors.teal[700],
  },
  filterText: { color: Colors.slate[600], fontSize: 12, fontWeight: "600" },
  filterTextActive: { color: Colors.white },
  state: {
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24,
  },
  stateText: { color: Colors.slate[500], fontSize: 13, textAlign: "center" },
  retryButton: {
    backgroundColor: Colors.teal[700],
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: Radius.md,
  },
  retryText: { color: Colors.white, fontSize: 12, fontWeight: "700" },
});
