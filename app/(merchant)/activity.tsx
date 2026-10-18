import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthRole } from "../../src/context/AuthRoleContext";
import { Colors, Radius, Shadows } from "../../src/constants/theme";
import { FlagReportItem } from "../../src/types";
import {
  BookmarkIcon,
  FireIcon,
  MegaphoneIcon,
  CheckIcon,
  StarIcon,
} from "../../src/components/icons/AppIcons";
import {
  fetchMerchantByOwner,
  getLatestStreak,
  fetchMerchantFlagReports,
  resolveMerchantFlagReport,
} from "../../src/services/firestoreService";
import {
  fetchMerchantCustomerActivity,
  MerchantCustomerActivity,
} from "../../src/services/merchantCommunityService";

const activityTimeAgo = (value: unknown): string => {
  let date: Date | null = null;
  if (value instanceof Date) {
    date = value;
  } else if (value && typeof value === "object" && "toDate" in value) {
    const toDate = value.toDate;
    if (typeof toDate === "function") {
      const result: unknown = toDate.call(value);
      if (result instanceof Date) date = result;
    }
  } else if (typeof value === "string" || typeof value === "number") {
    const result = new Date(value);
    if (!Number.isNaN(result.getTime())) date = result;
  }
  if (!date) return "Recently";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d ago` : date.toLocaleDateString();
};

export default function MerchantActivityScreen() {
  const { user } = useAuthRole();
  const [reports, setReports] = useState<FlagReportItem[]>([]);
  const [customerActivities, setCustomerActivities] = useState<
    MerchantCustomerActivity[]
  >([]);
  const [streakCount, setStreakCount] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [activityError, setActivityError] = useState(false);

  const loadActivityData = useCallback(async () => {
    try {
      const merchant = user?.uid ? await fetchMerchantByOwner(user.uid) : null;
      setActivityError(false);
      if (!merchant) {
        setReports([]);
        setCustomerActivities([]);
        setStreakCount(1);
        return;
      }

      const mId = String(merchant.id);
      const [streak, flagList, customerActivity] = await Promise.all([
        getLatestStreak(mId),
        fetchMerchantFlagReports(mId),
        fetchMerchantCustomerActivity(mId),
      ]);
      setStreakCount(streak || 1);
      setReports(flagList);
      setCustomerActivities(customerActivity);
    } catch (err) {
      setActivityError(true);
      console.warn("Error loading activity data:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadActivityData();
  }, [loadActivityData]);

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
      await resolveMerchantFlagReport(String(id), action);
    } catch (err) {
      console.error("Resolve report error:", err);
    }
  };

  const pendingCount = reports.filter((r) => !r.resolved).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Activity</Text>
          <Text style={styles.headerSubtitle}>
            Customer reports & system alerts
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Streak alert */}
          <View style={styles.alertCard}>
            <View style={styles.streakIconCircle}>
              <FireIcon size={20} color={Colors.amber[500]} />
            </View>
            <View style={styles.alertTextGroup}>
              <Text style={styles.alertTitle}>
                {streakCount}-day check-in streak!
              </Text>
              <Text style={styles.alertSub}>
                Keep verifying daily to boost your ranking in the For-You feed.
              </Text>
            </View>
          </View>

          {/* Promo push alert */}
          <View style={styles.alertCard}>
            <View style={styles.promoIconCircle}>
              <MegaphoneIcon size={20} color={Colors.teal[600]} />
            </View>
            <View style={styles.alertTextGroup}>
              <Text style={styles.alertTitle}>Promo push delivered</Text>
              <Text style={styles.alertSub}>
                Your sponsored alert reached 247 nearby users this morning.
              </Text>
            </View>
          </View>

          <View style={styles.customerActivitySection}>
            <Text style={styles.sectionTitle}>Shopper activity</Text>
            {loading ? (
              <ActivityIndicator color={Colors.teal[700]} />
            ) : activityError ? (
              <Text style={styles.customerActivityEmpty}>
                Shopper activity could not be loaded.
              </Text>
            ) : customerActivities.length === 0 ? (
              <Text style={styles.customerActivityEmpty}>
                No shoppers have saved or reviewed your shop yet.
              </Text>
            ) : (
              customerActivities.map((activity) => (
                <View key={activity.id} style={styles.customerActivityCard}>
                  <View style={styles.customerActivityIcon}>
                    {activity.type === "saved" ? (
                      <BookmarkIcon size={17} color={Colors.teal[700]} />
                    ) : (
                      <StarIcon size={17} color={Colors.amber[500]} />
                    )}
                  </View>
                  <View style={styles.customerActivityContent}>
                    <Text style={styles.customerActivityTitle}>
                      {activity.type === "saved"
                        ? `${activity.shopperName} saved your shop`
                        : `${activity.shopperName} left a ${activity.rating || 0}-star review`}
                    </Text>
                    {activity.type === "review" && activity.comment ? (
                      <Text style={styles.customerActivityComment}>
                        {activity.comment}
                      </Text>
                    ) : null}
                    <Text style={styles.customerActivityTime}>
                      {activityTimeAgo(activity.createdAt)}
                    </Text>
                  </View>
                </View>
              ))
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
              {reports.length === 0 ? (
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

                    <Text style={styles.reportDetailText}>{r.detail}</Text>
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
  promoIconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.teal[50],
    alignItems: "center",
    justifyContent: "center",
  },
  alertEmoji: {
    fontSize: 20,
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
  customerActivityComment: {
    color: Colors.slate[600],
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
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
