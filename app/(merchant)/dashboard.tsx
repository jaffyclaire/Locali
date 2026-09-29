import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Radius, Shadows } from "../../src/constants/theme";
import { useAuthRole } from "../../src/context/AuthRoleContext";
import {
  CheckIcon,
  LocationIcon,
  TagIcon,
  AlertTriangleIcon,
} from "../../src/components/icons/AppIcons";
import {
  fetchMerchantByOwner,
  fetchMerchantPerformanceMetrics,
  fetchMerchantRecentActivity,
  recordDailyCheckIn,
  updateMerchantDoc,
  getTodayDateStr,
  getLatestStreak,
  MerchantActivityItem,
} from "../../src/services/firestoreService";
import { Merchant } from "../../src/types";

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

        const [mMetrics, mActivities, mStreak] = await Promise.all([
          fetchMerchantPerformanceMetrics(String(currentMerchant.id)),
          fetchMerchantRecentActivity(String(currentMerchant.id)),
          getLatestStreak(String(currentMerchant.id)),
        ]);

        setMetrics(mMetrics);
        setActivities(mActivities);
        setStreak(mStreak || (isVerifiedToday ? 1 : 0));
      }
    } catch (err) {
      console.warn("loadDashboardData error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

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
            <View style={styles.businessAvatar}>
              <Text style={styles.businessAvatarText}>
                {getInitials(merchant?.name)}
              </Text>
            </View>
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
                Complete your merchant setup to see your dashboard, performance
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
                    Confirm Today's Hours
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
                {activities.length === 0 ? (
                  <View style={styles.activityItemCard}>
                    <CheckIcon size={18} color={Colors.emerald[600]} />
                    <View style={styles.activityTextGroup}>
                      <Text style={styles.activityText}>
                        Listing active and verified in local search
                      </Text>
                      <Text style={styles.activityTime}>Today</Text>
                    </View>
                  </View>
                ) : (
                  activities.map((a, i) => (
                    <View key={i} style={styles.activityItemCard}>
                      <View style={{ width: 24, alignItems: "center" }}>
                        {a.icon === "📍" ? (
                          <LocationIcon size={18} color={Colors.teal[700]} />
                        ) : a.icon === "🔴" ? (
                          <AlertTriangleIcon size={18} color={Colors.rose[500]} />
                        ) : a.icon === "🔖" ? (
                          <TagIcon size={18} color={Colors.teal[600]} />
                        ) : (
                          <CheckIcon size={18} color={Colors.emerald[600]} />
                        )}
                      </View>
                      <View style={styles.activityTextGroup}>
                        <Text style={styles.activityText}>{a.text}</Text>
                        <Text style={styles.activityTime}>{a.time}</Text>
                      </View>
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
});

