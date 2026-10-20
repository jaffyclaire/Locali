import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { useAuthRole } from "../../src/context/AuthRoleContext";
import { Colors, Radius, Shadows } from "../../src/constants/theme";
import { FlagReportItem } from "../../src/types";
import {
  BookmarkIcon,
  FireIcon,
  CheckIcon,
  StarIcon,
  LocationIcon,
  AlertTriangleIcon,
  RightArrowIcon,
} from "../../src/components/icons/AppIcons";
import {
  fetchMerchantByOwner,
  getLatestStreak,
  fetchMerchantFlagReports,
  fetchMerchantRecentActivity,
  MerchantActivityItem,
  resolveMerchantFlagReport,
} from "../../src/services/firestoreService";

export default function MerchantActivityScreen() {
  const { user } = useAuthRole();
  const [reports, setReports] = useState<FlagReportItem[]>([]);
  const [customerActivities, setCustomerActivities] = useState<MerchantActivityItem[]>([]);
  const [streakCount, setStreakCount] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [activityError, setActivityError] = useState(false);
  const [reportsError, setReportsError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [visibleActivityCount, setVisibleActivityCount] = useState(20);

  const loadActivityData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const merchant = user?.uid ? await fetchMerchantByOwner(user.uid) : null;
      if (!merchant) {
        setReports([]);
        setCustomerActivities([]);
        setStreakCount(0);
        setActivityError(false);
        setReportsError(false);
        return;
      }

      const mId = String(merchant.id);
      const [streakResult, reportsResult, activityResult] = await Promise.allSettled([
        getLatestStreak(mId),
        fetchMerchantFlagReports(mId),
        fetchMerchantRecentActivity(mId),
      ]);
      setStreakCount(streakResult.status === "fulfilled" ? streakResult.value : 0);
      setReportsError(reportsResult.status === "rejected");
      setReports(reportsResult.status === "fulfilled" ? reportsResult.value : []);
      setActivityError(activityResult.status === "rejected");
      setCustomerActivities(
        activityResult.status === "fulfilled" ? activityResult.value : []
      );
      setVisibleActivityCount(20);
    } catch (error) {
      console.warn("Error loading merchant activity:", error);
      setActivityError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadActivityData();
    }, [loadActivityData])
  );

  const handleResolve = async (
    id: string | number,
    action: "confirmed_correct" | "updated_hours"
  ) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, resolved: true, status: "resolved", resolutionAction: action }
          : r
      )
    );
    try {
      const resolved = await resolveMerchantFlagReport(String(id), action);
      if (!resolved) {
        await loadActivityData(true);
        Alert.alert("Unable to update report", "Please try again.");
      }
    } catch (error) {
      console.error("Resolve report error:", error);
      await loadActivityData(true);
      Alert.alert("Unable to update report", "Please try again.");
    }
  };

  const pendingCount = reports.filter(
    (report) => !report.resolved && report.status !== "resolved"
  ).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Activity</Text>
          <Text style={styles.headerSubtitle}>
            Shopper events & customer reports
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadActivityData(true)}
              tintColor={Colors.teal[700]}
              colors={[Colors.teal[700]]}
            />
          }
        >
          {/* Streak alert */}
          <View style={styles.alertCard}>
            <View style={styles.streakIconCircle}>
              <FireIcon size={20} color={Colors.amber[500]} />
            </View>
            <View style={styles.alertTextGroup}>
              <Text style={styles.alertTitle}>
                {streakCount > 0
                  ? `${streakCount}-day check-in streak!`
                  : "Check in today to start your streak"}
              </Text>
              <Text style={styles.alertSub}>
                {streakCount > 0
                  ? "Keep verifying daily to boost your ranking in the For-You feed."
                  : "Confirm your business hours from the dashboard to begin."}
              </Text>
            </View>
          </View>

          <View style={styles.customerActivitySection}>
            <Text style={styles.sectionTitle}>Shopper activity</Text>
            {loading ? (
              <ActivityIndicator color={Colors.teal[700]} />
            ) : activityError ? (
              <View style={styles.customerActivityErrorBox}>
                <Text style={styles.errorText}>
                  Shopper activity could not be loaded. Check the Firestore
                  activity rule, then retry.
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => void loadActivityData(true)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : customerActivities.length === 0 ? (
              <Text style={styles.customerActivityEmpty}>
                No shopper activity yet
              </Text>
            ) : (
              customerActivities.slice(0, visibleActivityCount).map((activity) => (
                <View key={activity.id} style={styles.customerActivityCard}>
                  <View style={styles.customerActivityIcon}>
                    {activity.icon === "saved" ? (
                      <BookmarkIcon size={17} color={Colors.teal[700]} />
                    ) : activity.icon === "location" ? (
                      <LocationIcon size={17} color={Colors.teal[700]} />
                    ) : activity.icon === "alert" ? (
                      <AlertTriangleIcon size={17} color={Colors.rose[500]} />
                    ) : activity.icon === "review" ? (
                      <StarIcon size={17} color={Colors.amber[500]} />
                    ) : (
                      <CheckIcon size={17} color={Colors.teal[700]} />
                    )}
                  </View>
                  <View style={styles.customerActivityContent}>
                    <Text style={styles.customerActivityTitle}>
                      {activity.text}
                    </Text>
                    <Text style={styles.customerActivityTime}>
                      {activity.time}
                    </Text>
                  </View>
                </View>
              ))
            )}
            {!loading &&
              !activityError &&
              customerActivities.length > visibleActivityCount && (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={() =>
                    setVisibleActivityCount((count) => count + 20)
                  }
                  activeOpacity={0.75}
                >
                  <Text style={styles.retryButtonText}>Load more</Text>
                  <RightArrowIcon size={16} color={Colors.teal[700]} />
                </TouchableOpacity>
              )}
          </View>

          {/* Flag Reports */}
          <View style={styles.flagReportsSection}>
            <View style={styles.flagHeaderRow}>
              <Text style={styles.sectionTitle}>Customer Flag Reports</Text>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>
                  {pendingCount} pending
                </Text>
              </View>
            </View>

            <View style={styles.reportsList}>
              {loading ? (
                <View style={styles.emptyReportsBox}>
                  <ActivityIndicator color={Colors.teal[700]} />
                </View>
              ) : reportsError ? (
                <View style={styles.emptyReportsBox}>
                  <Text style={styles.errorText}>
                    Customer reports could not be loaded.
                  </Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => void loadActivityData(true)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : reports.length === 0 ? (
                <View style={styles.emptyReportsBox}>
                  <Text style={styles.emptyReportsText}>
                    No customer reports submitted yet.
                  </Text>
                </View>
              ) : (
                reports.map((r) => (
                  <View
                    key={r.id}
                    style={[
                      styles.reportCard,
                      r.resolved
                        ? styles.reportCardResolved
                        : styles.reportCardPending,
                    ]}
                  >
                    <View style={styles.reportTopRow}>
                      <View style={styles.reportIssueGroup}>
                        <Text style={styles.reportIssueText}>{r.issue}</Text>
                        <Text style={styles.reportReporterText}>
                          {r.reporter}
                        </Text>
                      </View>
                      {r.resolved ? (
                        <View style={styles.resolvedBadge}>
                          <Text style={styles.resolvedBadgeText}>Resolved</Text>
                        </View>
                      ) : (
                        <Text style={styles.pendingText}>Pending</Text>
                      )}
                    </View>

                    <Text style={styles.reportDetailText} numberOfLines={2}>
                      {r.detail}
                    </Text>
                    <Text style={styles.reportTimeText}>{r.time}</Text>

                    {!r.resolved && (
                      <View style={styles.reportActionsRow}>
                        <TouchableOpacity
                          style={styles.confirmCorrectButton}
                          onPress={() => handleResolve(r.id, "confirmed_correct")}
                          activeOpacity={0.8}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <CheckIcon size={14} color={Colors.emerald[700]} />
                            <Text style={styles.confirmCorrectText}>
                              Confirm Correct
                            </Text>
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.updateHoursButton}
                          onPress={() => handleResolve(r.id, "updated_hours")}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.updateHoursText}>
                            Update Hours
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          </View>

          <View style={{ height: 24 }} />
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 14,
  },
  alertCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    borderColor: Colors.slate[100],
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    ...Shadows.sm,
  },
  streakIconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.teal[50],
    alignItems: "center",
    justifyContent: "center",
  },
  alertTextGroup: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.slate[800],
    marginBottom: 2,
  },
  alertSub: {
    fontSize: 12,
    color: Colors.slate[500],
    lineHeight: 16,
  },
  flagReportsSection: {
    gap: 12,
    marginTop: 4,
  },
  flagHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.slate[800],
  },
  customerActivitySection: {
    gap: 10,
    marginTop: 4,
  },
  customerActivityEmpty: {
    color: Colors.slate[500],
    fontSize: 12,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.slate[100],
  },
  customerActivityErrorBox: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.slate[100],
    gap: 12,
  },
  customerActivityCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    borderColor: Colors.slate[100],
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    ...Shadows.sm,
  },
  customerActivityIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: Colors.teal[50],
    alignItems: "center",
    justifyContent: "center",
  },
  customerActivityContent: {
    flex: 1,
  },
  customerActivityTitle: {
    color: Colors.slate[800],
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  customerActivityTime: {
    color: Colors.slate[400],
    fontSize: 10,
    marginTop: 5,
  },
  pendingBadge: {
    backgroundColor: Colors.rose[50],
    borderWidth: 1,
    borderColor: Colors.rose[200],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  pendingBadgeText: {
    color: Colors.rose[600],
    fontSize: 11,
    fontWeight: "600",
  },
  reportsList: {
    gap: 12,
  },
  emptyReportsBox: {
    backgroundColor: Colors.white,
    padding: 24,
    borderRadius: Radius.xl,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.slate[100],
  },
  emptyReportsText: {
    fontSize: 13,
    color: Colors.slate[400],
  },
  errorText: {
    color: Colors.rose[600],
    fontSize: 12,
    lineHeight: 18,
  },
  retryButton: {
    minHeight: 40,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    backgroundColor: Colors.teal[50],
  },
  retryButtonText: {
    color: Colors.teal[700],
    fontSize: 13,
    fontWeight: "700",
  },
  loadMoreButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
  },
  reportCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    padding: 16,
    ...Shadows.sm,
  },
  reportCardPending: {
    borderColor: Colors.rose[100],
  },
  reportCardResolved: {
    borderColor: Colors.slate[100],
    opacity: 0.65,
  },
  reportTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  reportIssueGroup: {
    flex: 1,
  },
  reportIssueText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.rose[600],
    marginBottom: 2,
  },
  reportReporterText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.slate[800],
  },
  resolvedBadge: {
    backgroundColor: Colors.emerald[50],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  resolvedBadgeText: {
    color: Colors.emerald[600],
    fontSize: 11,
    fontWeight: "600",
  },
  pendingText: {
    color: Colors.rose[500],
    fontSize: 11,
    fontWeight: "600",
  },
  reportDetailText: {
    fontSize: 13,
    color: Colors.slate[600],
    lineHeight: 18,
    marginBottom: 6,
  },
  reportTimeText: {
    fontSize: 10,
    color: Colors.slate[400],
    marginBottom: 12,
  },
  reportActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  confirmCorrectButton: {
    flex: 1,
    backgroundColor: Colors.teal[50],
    borderWidth: 1,
    borderColor: Colors.teal[200],
    paddingVertical: 10,
    borderRadius: Radius.lg,
    alignItems: "center",
  },
  confirmCorrectText: {
    color: Colors.teal[700],
    fontSize: 12,
    fontWeight: "700",
  },
  updateHoursButton: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate[200],
    paddingVertical: 10,
    borderRadius: Radius.lg,
    alignItems: "center",
  },
  updateHoursText: {
    color: Colors.slate[700],
    fontSize: 12,
    fontWeight: "600",
  },
});
