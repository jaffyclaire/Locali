import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Radius, Shadows } from "../../src/constants/theme";
import { useAuthRole } from "../../src/context/AuthRoleContext";
import { PostCard } from "../../src/components/PostCard";
import { ReviewCard } from "../../src/components/ReviewCard";
import {
  CheckIcon,
  StarIcon,
  LocationIcon,
  TagIcon,
  AlertTriangleIcon,
  MegaphoneIcon,
  PlusIcon,
  RightArrowIcon,
} from "../../src/components/icons/AppIcons";
import {
  fetchMerchantByOwner,
  fetchMerchantPerformanceMetrics,
  fetchMerchantRecentActivity,
  recordDailyCheckIn,
  updateMerchantDoc,
  getTodayDateStr,
  getLatestStreak,
  fetchMerchantPosts,
  deleteMerchantPost,
  MerchantActivityItem,
  MerchantPost,
} from "../../src/services/firestoreService";
import { Merchant } from "../../src/types";
import {
  deleteReviewReply,
  fetchMerchantReviews,
  MerchantReviewWithProfile,
  saveReviewReply,
} from "../../src/services/merchantCommunityService";

export default function MerchantDashboard() {
  const router = useRouter();
  const { user } = useAuthRole();

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [metrics, setMetrics] = useState({
    views: 0,
    appearances: 0,
    directionTaps: 0,
  });
  const [activities, setActivities] = useState<MerchantActivityItem[]>([]);
  const [posts, setPosts] = useState<MerchantPost[]>([]);
  const [reviews, setReviews] = useState<MerchantReviewWithProfile[]>([]);
  const [checkedIn, setCheckedIn] = useState(false);
  const [streak, setStreak] = useState(0);
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = useCallback(async (isPull = false) => {
    try {
      if (isPull) setRefreshing(true);
      else setLoading(true);

      let currentMerchant: Merchant | null = null;
      if (user?.uid) {
        currentMerchant = await fetchMerchantByOwner(user.uid);
      }

      // No merchant document means the owner never finished merchant-setup.
      // Skip all metric/activity queries — never query with an empty merchantId.
      if (currentMerchant) {
        setMerchant(currentMerchant);
        setIsOpen(Boolean(currentMerchant.isOpen));

        const todayStr = getTodayDateStr();
        const isVerifiedToday =
          currentMerchant.verifiedTodayAt === todayStr ||
          Boolean(currentMerchant.isVerified && currentMerchant.verifiedTodayAt);
        setCheckedIn(isVerifiedToday);

        const [
          metricsResult,
          activitiesResult,
          streakResult,
          postsResult,
          reviewsResult,
        ] =
          await Promise.allSettled([
          fetchMerchantPerformanceMetrics(String(currentMerchant.id)),
          fetchMerchantRecentActivity(String(currentMerchant.id)),
          getLatestStreak(String(currentMerchant.id)),
          fetchMerchantPosts(String(currentMerchant.id)),
          fetchMerchantReviews(String(currentMerchant.id)),
        ]);

        if (metricsResult.status === "fulfilled") setMetrics(metricsResult.value);
        if (activitiesResult.status === "fulfilled") {
          setActivities(activitiesResult.value);
        } else {
          console.warn(
            "loadDashboardData activity request failed:",
            activitiesResult.reason
          );
        }
        if (streakResult.status === "fulfilled") setStreak(streakResult.value);
        if (postsResult.status === "fulfilled") setPosts(postsResult.value);
        else {
          console.warn(
            "loadDashboardData post request failed:",
            postsResult.reason
          );
        }
        if (reviewsResult.status === "fulfilled") setReviews(reviewsResult.value);
        else {
          console.warn(
            "loadDashboardData review request failed:",
            reviewsResult.reason
          );
        }
      }
    } catch (err) {
      console.warn("loadDashboardData error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  const handleConfirmHours = async () => {
    if (!merchant) return;
    try {
      const res = await recordDailyCheckIn(String(merchant.id));
      setCheckedIn(true);
      setStreak(res.streakCount);
    } catch (err) {
      console.error("handleConfirmHours error:", err);
    }
  };

  const handleToggleOpen = async () => {
    if (!merchant) return;
    const nextState = !isOpen;
    setIsOpen(nextState);
    try {
      await updateMerchantDoc(String(merchant.id), { isOpen: nextState });
    } catch (err) {
      console.error("handleToggleOpen error:", err);
      setIsOpen(!nextState);
    }
  };

  const handleSaveReviewReply = async (
    reviewId: string,
    reply: string
  ): Promise<void> => {
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

  const handleDeleteReviewReply = async (reviewId: string): Promise<void> => {
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

  const ratedReviews = reviews.filter(
    (review) => review.rating >= 1 && review.rating <= 5
  );
  const averageReviewRating =
    ratedReviews.length > 0
      ? ratedReviews.reduce((sum, review) => sum + review.rating, 0) /
        ratedReviews.length
      : 0;

  const getInitials = (name?: string) => {
    if (!name) return "BC";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const metricsData = [
    {
      label: "Listing views",
      sub: "Total",
      value: String(metrics.views),
      delta: "All time",
    },
    {
      label: "Discovery appearances",
      sub: "For-You feed",
      value: String(metrics.appearances),
      delta: "Estimated",
    },
    {
      label: "Directions taps",
      sub: "Total",
      value: String(metrics.directionTaps),
      delta: "All time",
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* Header – Teal Accent */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>
              {merchant ? merchant.name : "Dashboard"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {merchant ? `${merchant.name} · ${merchant.category}` : "No business"}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {checkedIn && (
              <View style={styles.verifiedHeaderBadge}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <CheckIcon size={12} color={Colors.teal[700]} />
                  <Text style={styles.verifiedHeaderText}>Verified</Text>
                </View>
              </View>
            )}
            {user?.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                style={styles.businessAvatarImage}
              />
            ) : (
              <View style={styles.businessAvatar}>
                <Text style={styles.businessAvatarText}>
                  {getInitials(merchant?.name)}
                </Text>
              </View>
            )}
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadDashboardData(true)}
              tintColor={Colors.teal[600]}
              colors={[Colors.teal[600]]}
            />
          }
        >
          {loading ? (
            <View style={{ paddingVertical: 48, alignItems: "center" }}>
              <ActivityIndicator size="large" color={Colors.teal[600]} />
            </View>
          ) : !merchant ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIconCircle}>
                <TagIcon size={28} color={Colors.teal[700]} />
              </View>
              <Text style={styles.emptyStateTitle}>Finish setting up your business</Text>
              <Text style={styles.emptyStateSubtitle}>
                Complete your business setup to see your dashboard, performance
                metrics, and recent activity.
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => router.push("/(auth)/merchant-setup")}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyStateButtonText}>Set Up My Business</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Daily Verification Hero Card */}
              {!checkedIn ? (
                <View style={styles.verificationHero}>
                  <Text style={styles.verificationEyebrow}>Daily Verification</Text>
                  <Text style={styles.verificationHeroTitle}>
                    Confirm Today&apos;s Hours
                  </Text>
                  <Text style={styles.verificationHours}>
                    {merchant?.hours || "9:00 AM – 6:00 PM"}
                  </Text>
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={handleConfirmHours}
                    activeOpacity={0.85}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <CheckIcon size={16} color={Colors.white} />
                      <Text style={styles.confirmButtonText}>
                        Confirm Open Hours Today
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.verifiedSuccessCard}>
                  <View style={styles.verifiedIconCircle}>
                    <CheckIcon size={18} color={Colors.white} />
                  </View>
                  <View style={styles.verifiedTextGroup}>
                    <Text style={styles.verifiedTitle}>
                      {streak > 1 ? `Verified · ${streak}-day streak!` : "Verified for today"}
                    </Text>
                    <Text style={styles.verifiedSub}>
                      {merchant?.hours || "9:00 AM – 6:00 PM"} · Confirmed today
                    </Text>
                  </View>
                </View>
              )}

              {/* Store status toggle */}
              <View style={styles.statusToggleCard}>
                <View style={styles.statusTextContainer}>
                  <Text style={styles.statusHeading}>
                    {isOpen ? "Open for Business" : "Temporarily Closed"}
                  </Text>
                  <Text style={styles.statusSub}>
                    Syncs instantly to your public listing
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleToggleOpen}
                  style={[
                    styles.toggleTrack,
                    isOpen ? styles.toggleTrackOpen : styles.toggleTrackClosed,
                  ]}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      isOpen ? styles.toggleThumbOpen : styles.toggleThumbClosed,
                    ]}
                  />
                </TouchableOpacity>
              </View>

              {/* Metrics */}
              <View style={styles.metricsSection}>
                <Text style={styles.sectionTitle}>Performance Overview</Text>
                <View style={styles.metricsGrid}>
                  {metricsData.map((m) => (
                    <View key={m.label} style={styles.metricCard}>
                      <Text style={styles.metricValue}>{m.value}</Text>
                      <Text style={styles.metricLabel}>{m.label}</Text>
                      <Text style={styles.metricDelta}>{m.delta}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Listing Preview Card */}
              <View style={styles.listingCard}>
                <Image
                  source={{
                    uri:
                      merchant?.img ||
                      merchant?.coverPhotoUrl ||
                      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=140&fit=crop&auto=format",
                  }}
                  style={styles.listingCover}
                  resizeMode="cover"
                />
                <View style={styles.listingBody}>
                  <View style={styles.listingTitleRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listingName}>
                        {merchant?.name || "No business"}
                      </Text>
                      <Text style={styles.listingSub} numberOfLines={1}>
                        {merchant ? `${merchant.category} · ${merchant.address}` : "Complete setup to see your listing"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => router.push("/(merchant)/myshop")}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.editListingLink}>Edit</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.listingBadgesRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        isOpen ? styles.openBadge : styles.closedBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isOpen ? styles.openBadgeText : styles.closedBadgeText,
                        ]}
                      >
                        {isOpen ? "Open Now" : "Temporarily Closed"}
                      </Text>
                    </View>
                    {checkedIn && (
                      <View style={styles.checkedInBadge}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <CheckIcon size={12} color={Colors.teal[700]} />
                          <Text style={styles.checkedInBadgeText}>Verified</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Quick activity */}
              <View style={styles.activitySection}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                {activities.slice(0, 4).map((a) => (
                  <View key={a.id} style={styles.activityItemCard}>
                    <View style={{ width: 24, alignItems: "center" }}>
                      {a.icon === "location" ? (
                        <LocationIcon size={18} color={Colors.teal[700]} />
                      ) : a.icon === "alert" ? (
                        <AlertTriangleIcon size={18} color={Colors.rose[500]} />
                      ) : a.icon === "saved" ? (
                        <TagIcon size={18} color={Colors.teal[600]} />
                      ) : a.icon === "review" ? (
                        <StarIcon size={18} color={Colors.amber[500]} />
                      ) : (
                        <CheckIcon size={18} color={Colors.emerald[600]} />
                      )}
                    </View>
                    <View style={styles.activityTextGroup}>
                      <Text style={styles.activityText}>{a.text}</Text>
                      <Text style={styles.activityTime}>{a.time}</Text>
                    </View>
                  </View>
                ))}
                {activities.length > 4 && (
                  <TouchableOpacity
                    style={styles.activityItemCard}
                    onPress={() => router.push("/(merchant)/activity")}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel="See more activity"
                  >
                    <View style={{ width: 24, alignItems: "center" }} />
                    <View style={styles.activityTextGroup}>
                      <Text style={styles.seeMoreActivity}>See more</Text>
                    </View>
                    <RightArrowIcon size={18} color={Colors.teal[700]} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.reviewSection}>
                <View style={styles.reviewSectionHeader}>
                  <Text style={styles.sectionTitle}>Reviews</Text>
                  {reviews.length > 0 && (
                    <View style={styles.reviewSummaryRating}>
                      <StarIcon size={16} color={Colors.amber[500]} />
                      <Text style={styles.reviewSummaryValue}>
                        {averageReviewRating.toFixed(1)}
                      </Text>
                      <Text style={styles.reviewSummaryCount}>
                        ({reviews.length})
                      </Text>
                    </View>
                  )}
                </View>
                {reviews.length === 0 ? (
                  <View style={styles.reviewEmptyCard}>
                    <Text style={styles.reviewEmptyText}>No reviews yet</Text>
                  </View>
                ) : (
                  <>
                    {reviews.slice(0, 3).map((review) => (
                      <ReviewCard
                        key={review.id}
                        review={review}
                        businessName={merchant.name}
                        compact
                        onSaveReply={(reply) =>
                          handleSaveReviewReply(review.id, reply)
                        }
                        onDeleteReply={() =>
                          handleDeleteReviewReply(review.id)
                        }
                      />
                    ))}
                    {reviews.length > 3 && (
                      <TouchableOpacity
                        style={styles.seeAllReviews}
                        onPress={() => router.push("/(merchant)/reviews")}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.seeAllReviewsText}>See all reviews</Text>
                        <RightArrowIcon size={18} color={Colors.teal[700]} />
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>

              {/* Create a Post CTA Card */}
              <View style={styles.createPostCard}>
                <View style={styles.createPostHeader}>
                  <View style={styles.createPostIconWrap}>
                    <MegaphoneIcon size={22} color={Colors.teal[700]} />
                  </View>
                  <View style={styles.createPostTextGroup}>
                    <Text style={styles.createPostTitle}>Create a Post</Text>
                    <Text style={styles.createPostSub}>
                      Share deals, new arrivals, or updates directly with local shoppers.
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.createPostButton}
                  onPress={() => router.push("/(merchant)/create-post")}
                  activeOpacity={0.85}
                >
                  <View style={styles.createPostButtonContent}>
                    <PlusIcon size={16} color={Colors.white} />
                    <Text style={styles.createPostButtonText}>Create a Post</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Posts Feed */}
              <View style={styles.activitySection}>
                <View style={styles.postsSectionHeader}>
                  <Text style={styles.sectionTitle}>Your Posts</Text>
                </View>
                {posts.length === 0 ? (
                  <TouchableOpacity
                    style={styles.activityItemCard}
                    onPress={() => router.push("/(merchant)/create-post")}
                    activeOpacity={0.7}
                  >
                    <TagIcon size={18} color={Colors.teal[600]} />
                    <View style={styles.activityTextGroup}>
                      <Text style={styles.activityText}>
                        No posts yet. Tap here to create your first post.
                      </Text>
                    </View>
                    <RightArrowIcon size={16} color={Colors.slate[400]} />
                  </TouchableOpacity>
                ) : (
                  posts.map((post) => (
                    <View key={post.id} style={styles.dashboardPostItem}>
                      <PostCard
                        post={post}
                        businessName={merchant.name}
                        businessAvatarUrl={merchant.img}
                        onEdit={() =>
                          router.push({
                            pathname: "/(merchant)/create-post",
                            params: { postId: post.id },
                          })
                        }
                        onDelete={async () => {
                          try {
                            await deleteMerchantPost(String(merchant.id), post.id);
                            setPosts((prev) => prev.filter((item) => item.id !== post.id));
                          } catch (error) {
                            console.error(
                              "[MerchantDashboard] Failed to delete post:",
                              error
                            );
                            Alert.alert("Delete Failed", "Could not delete post.");
                          }
                        }}
                      />
                    </View>
                  ))
                )}
              </View>

              <View style={{ height: 24 }} />
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.slate[50],
  },
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate[100],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.slate[800],
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.slate[500],
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  verifiedHeaderBadge: {
    backgroundColor: Colors.emerald[50],
    borderWidth: 1,
    borderColor: Colors.emerald[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  verifiedHeaderText: {
    color: Colors.emerald[600],
    fontSize: 11,
    fontWeight: "700",
  },
  businessAvatar: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: "rgba(15, 118, 110, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  businessAvatarText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.teal[700],
  },
  businessAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  verificationHero: {
    backgroundColor: Colors.teal[700],
    borderRadius: Radius["2xl"],
    padding: 20,
    ...Shadows.md,
  },
  verificationEyebrow: {
    color: Colors.teal[200],
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  verificationHeroTitle: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
  },
  verificationHours: {
    color: Colors.teal[100],
    fontSize: 13,
    marginBottom: 16,
  },
  confirmButton: {
    backgroundColor: Colors.white,
    paddingVertical: 12,
    borderRadius: Radius.xl,
    alignItems: "center",
  },
  confirmButtonText: {
    color: Colors.teal[700],
    fontSize: 14,
    fontWeight: "700",
  },
  verifiedSuccessCard: {
    backgroundColor: Colors.emerald[50],
    borderWidth: 1,
    borderColor: Colors.emerald[100],
    borderRadius: Radius["2xl"],
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  verifiedIconCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.emerald[100],
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedIconText: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.emerald[700],
  },
  verifiedTextGroup: {
    flex: 1,
  },
  verifiedTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.emerald[800],
  },
  verifiedSub: {
    fontSize: 12,
    color: Colors.emerald[600],
    marginTop: 2,
  },
  statusToggleCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    borderColor: Colors.slate[100],
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...Shadows.sm,
  },
  statusTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  statusHeading: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.slate[800],
  },
  statusSub: {
    fontSize: 12,
    color: Colors.slate[500],
    marginTop: 2,
  },
  toggleTrack: {
    width: 52,
    height: 28,
    borderRadius: Radius.full,
    padding: 2,
    justifyContent: "center",
  },
  toggleTrackOpen: {
    backgroundColor: Colors.teal[700],
  },
  toggleTrackClosed: {
    backgroundColor: Colors.slate[200],
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    ...Shadows.sm,
  },
  toggleThumbOpen: {
    alignSelf: "flex-end",
  },
  toggleThumbClosed: {
    alignSelf: "flex-start",
  },
  metricsSection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.slate[800],
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.slate[200],
    padding: 12,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.slate[900],
  },
  metricLabel: {
    fontSize: 10,
    color: Colors.slate[500],
    marginVertical: 4,
    lineHeight: 13,
  },
  metricDelta: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.teal[700],
  },
  listingCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    borderColor: Colors.slate[100],
    overflow: "hidden",
    ...Shadows.sm,
  },
  listingCover: {
    width: "100%",
    height: 120,
    backgroundColor: Colors.slate[100],
  },
  listingBody: {
    padding: 16,
  },
  listingTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  listingName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.slate[800],
  },
  listingSub: {
    fontSize: 12,
    color: Colors.slate[500],
    marginTop: 2,
  },
  editListingLink: {
    color: Colors.teal[700],
    fontSize: 13,
    fontWeight: "600",
  },
  listingBadgesRow: {
    flexDirection: "row",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  openBadge: {
    backgroundColor: Colors.emerald[50],
  },
  closedBadge: {
    backgroundColor: Colors.slate[100],
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  openBadgeText: {
    color: Colors.emerald[700],
  },
  closedBadgeText: {
    color: Colors.slate[500],
  },
  checkedInBadge: {
    backgroundColor: Colors.teal[50],
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  checkedInBadgeText: {
    color: Colors.teal[700],
    fontSize: 11,
    fontWeight: "600",
  },
  emptyState: {
    backgroundColor: Colors.white,
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    borderColor: Colors.slate[100],
    padding: 32,
    alignItems: "center",
    gap: 8,
    ...Shadows.md,
  },
  emptyStateIconCircle: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.teal[50],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.slate[800],
    textAlign: "center",
  },
  emptyStateSubtitle: {
    fontSize: 13,
    color: Colors.slate[500],
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 12,
  },
  emptyStateButton: {
    backgroundColor: Colors.teal[700],
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: Radius.xl,
  },
  emptyStateButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  activitySection: {
    gap: 10,
  },
  reviewSection: {
    gap: 10,
  },
  reviewSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reviewSummaryRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reviewSummaryValue: {
    color: Colors.slate[800],
    fontSize: 14,
    fontWeight: "700",
  },
  reviewSummaryCount: {
    color: Colors.slate[500],
    fontSize: 12,
  },
  reviewEmptyCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.slate[100],
    padding: 16,
  },
  reviewEmptyText: {
    color: Colors.slate[500],
    fontSize: 13,
  },
  seeAllReviews: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  seeAllReviewsText: {
    color: Colors.teal[700],
    fontSize: 13,
    fontWeight: "700",
  },
  activityItemCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    borderColor: Colors.slate[100],
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...Shadows.sm,
  },
  activityIcon: {
    fontSize: 18,
  },
  activityTextGroup: {
    flex: 1,
  },
  activityText: {
    fontSize: 13,
    color: Colors.slate[800],
    lineHeight: 18,
  },
  activityTime: {
    fontSize: 11,
    color: Colors.slate[400],
    marginTop: 2,
  },
  seeMoreActivity: {
    color: Colors.teal[700],
    fontSize: 13,
    fontWeight: "700",
  },
  dashboardPostItem: {
    gap: 6,
  },
  createPostCard: {
    backgroundColor: Colors.teal[50],
    borderRadius: Radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.teal[100],
    ...Shadows.sm,
    marginBottom: 20,
  },
  createPostHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  createPostIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    backgroundColor: Colors.teal[100],
    alignItems: "center",
    justifyContent: "center",
  },
  createPostTextGroup: {
    flex: 1,
  },
  createPostTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.slate[900],
    marginBottom: 4,
  },
  createPostSub: {
    fontSize: 12,
    color: Colors.slate[600],
    lineHeight: 16,
  },
  createPostButton: {
    backgroundColor: Colors.teal[700],
    paddingVertical: 12,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    ...Shadows.sm,
  },
  createPostButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  createPostButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  postsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
});
