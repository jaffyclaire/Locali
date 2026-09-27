import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Radius, Shadows } from "../../src/constants/theme";
import {
  fetchAdminDashboardStats,
  fetchAllUsersAdmin,
  fetchAllFlagReportsAdmin,
} from "../../src/services/firestoreService";
import { AdminUser } from "../../src/types";
import {
  UsersIcon,
  ShopIcon,
  FlagIcon,
  CheckIcon,
  AlertTriangleIcon,
  ChevronRight,
} from "../../src/components/icons/AppIcons";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalMerchants: 0,
    totalFlagReports: 0,
    pendingFlagReports: 0,
    verifiedMerchants: 0,
    suspendedUsers: 0,
    newUsersToday: 0,
    newMerchantsToday: 0,
  });
  const [recentUsers, setRecentUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isPull = false) => {
    try {
      if (isPull) setRefreshing(true);
      else setLoading(true);

      const [dashboardStats, users] = await Promise.all([
        fetchAdminDashboardStats(),
        fetchAllUsersAdmin(),
      ]);

      setStats(dashboardStats);

      // Get 5 most recent users
      const sorted = [...users]
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() ?? 0;
          const bTime = b.createdAt?.toMillis?.() ?? 0;
          return bTime - aTime;
        })
        .slice(0, 5);
      setRecentUsers(sorted);
    } catch (err) {
      console.warn("Admin dashboard load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const statCards = [
    {
      label: "Total Users",
      value: stats.totalUsers,
      icon: <UsersIcon size={20} color={Colors.teal[700]} />,
      bg: Colors.teal[50],
    },
    {
      label: "Merchants",
      value: stats.totalMerchants,
      icon: <ShopIcon size={20} color={Colors.teal[700]} />,
      bg: Colors.teal[50],
    },
    {
      label: "Verified",
      value: stats.verifiedMerchants,
      icon: <CheckIcon size={20} color={Colors.emerald[600]} />,
      bg: Colors.emerald[50],
    },
    {
      label: "Pending Reports",
      value: stats.pendingFlagReports,
      icon: <FlagIcon size={20} color={Colors.rose[500]} />,
      bg: Colors.rose[50],
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>Platform overview & moderation</Text>
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>Admin</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              tintColor={Colors.teal[600]}
              colors={[Colors.teal[600]]}
            />
          }
        >
          {loading ? (
            <View style={{ paddingVertical: 48, alignItems: "center" }}>
              <ActivityIndicator size="large" color={Colors.teal[600]} />
            </View>
          ) : (
            <>
              {/* Pending Flag Reports Banner */}
              {stats.pendingFlagReports > 0 && (
                <TouchableOpacity
                  style={styles.alertBanner}
                  onPress={() => router.push("/(admin)/reports" as any)}
                  activeOpacity={0.85}
                >
                  <AlertTriangleIcon size={20} color={Colors.amber[700]} />
                  <View style={styles.alertTextGroup}>
                    <Text style={styles.alertTitle}>
                      {stats.pendingFlagReports} Pending Flag Report
                      {stats.pendingFlagReports !== 1 ? "s" : ""}
                    </Text>
                    <Text style={styles.alertSub}>Tap to review and resolve</Text>
                  </View>
                  <ChevronRight size={20} color={Colors.amber[700]} />
                </TouchableOpacity>
              )}

              {/* Stats Grid */}
              <View style={styles.statsGrid}>
                {statCards.map((card) => (
                  <View key={card.label} style={styles.statCard}>
                    <View style={[styles.statIcon, { backgroundColor: card.bg }]}>
                      {card.icon}
                    </View>
                    <Text style={styles.statValue}>{card.value}</Text>
                    <Text style={styles.statLabel}>{card.label}</Text>
                  </View>
                ))}
              </View>

              {/* Today's Activity */}
              <View style={styles.activityRow}>
                <View style={styles.activityCard}>
                  <Text style={styles.activityValue}>+{stats.newUsersToday}</Text>
                  <Text style={styles.activityLabel}>New Users Today</Text>
                </View>
                <View style={styles.activityCard}>
                  <Text style={styles.activityValue}>+{stats.newMerchantsToday}</Text>
                  <Text style={styles.activityLabel}>New Merchants Today</Text>
                </View>
                <View style={styles.activityCard}>
                  <Text style={styles.activityValue}>{stats.suspendedUsers}</Text>
                  <Text style={styles.activityLabel}>Suspended Users</Text>
                </View>
              </View>

              {/* Recent Signups */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Signups</Text>
                  <TouchableOpacity onPress={() => router.push("/(admin)/users" as any)}>
                    <Text style={styles.sectionLink}>View All</Text>
                  </TouchableOpacity>
                </View>
                {recentUsers.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>No users yet</Text>
                  </View>
                ) : (
                  recentUsers.map((user) => (
                    <View key={user.uid} style={styles.userRow}>
                      <View style={styles.userAvatar}>
                        <Text style={styles.userAvatarText}>
                          {user.fullName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user.fullName}</Text>
                        <Text style={styles.userEmail}>{user.email}</Text>
                      </View>
                      <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>
                          {user.role === "merchant_owner" ? "Merchant" : user.role}
                        </Text>
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
  headerBadge: {
    backgroundColor: Colors.teal[50],
    borderWidth: 1,
    borderColor: Colors.teal[200],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  headerBadgeText: {
    color: Colors.teal[700],
    fontSize: 11,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  alertBanner: {
    backgroundColor: Colors.amber[50],
    borderWidth: 1,
    borderColor: Colors.amber[200],
    borderRadius: Radius.xl,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...Shadows.sm,
  },
  alertTextGroup: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.amber[800],
  },
  alertSub: {
    fontSize: 12,
    color: Colors.amber[700],
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.slate[100],
    padding: 14,
    alignItems: "center",
    ...Shadows.sm,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.slate[900],
  },
  statLabel: {
    fontSize: 11,
    color: Colors.slate[500],
    marginTop: 2,
  },
  activityRow: {
    flexDirection: "row",
    gap: 10,
  },
  activityCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.slate[100],
    padding: 12,
    alignItems: "center",
    ...Shadows.sm,
  },
  activityValue: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.slate[900],
  },
  activityLabel: {
    fontSize: 10,
    color: Colors.slate[500],
    marginTop: 4,
    textAlign: "center",
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.slate[800],
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.teal[700],
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.slate[100],
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    color: Colors.slate[400],
  },
  userRow: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.slate[100],
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...Shadows.sm,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.teal[50],
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.teal[700],
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.slate[800],
  },
  userEmail: {
    fontSize: 11,
    color: Colors.slate[500],
    marginTop: 1,
  },
  roleBadge: {
    backgroundColor: Colors.slate[100],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.slate[600],
    textTransform: "capitalize",
  },
});
