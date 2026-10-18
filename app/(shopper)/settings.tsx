import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthRole } from "../../src/context/AuthRoleContext";
import { Colors, Radius, Shadows } from "../../src/constants/theme";
import { ChevronRight } from "../../src/components/icons/AppIcons";
import { ProfileCard } from "../../src/components/common/ProfileCard";
import {
  getUserSavedCount,
  getUserNotificationPreferences,
  updateNotificationPreferences,
} from "../../src/services/firestoreService";
import { getUserReviewCount } from "../../src/services/merchantCommunityService";

const formatMemberSince = (createdAt?: unknown): string => {
  let date: Date | null = null;
  if (createdAt instanceof Date) {
    date = createdAt;
  } else if (
    createdAt &&
    typeof createdAt === "object" &&
    "toDate" in createdAt &&
    typeof createdAt.toDate === "function"
  ) {
    const result: unknown = createdAt.toDate();
    if (result instanceof Date) date = result;
  } else if (typeof createdAt === "string" || typeof createdAt === "number") {
    const result = new Date(createdAt);
    if (!Number.isNaN(result.getTime())) date = result;
  }
  return date
    ? date.toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : "Recently joined";
};

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthRole();

  const [proximityAlerts, setProximityAlerts] = useState(true);
  const [merchantAlerts, setMerchantAlerts] = useState(true);
  const [dealAlerts, setDealAlerts] = useState(false);
  const [accountStats, setAccountStats] = useState<{
    userId: string;
    saved: number;
    reviews: number;
    error: boolean;
  } | null>(null);
  const accountStatsLoading =
    Boolean(user?.uid) && accountStats?.userId !== user?.uid;
  const accountStatsError =
    Boolean(user?.uid) &&
    accountStats?.userId === user?.uid &&
    accountStats?.error === true;
  const savedCount =
    accountStats && accountStats.userId === user?.uid ? accountStats.saved : 0;
  const reviewCount =
    accountStats && accountStats.userId === user?.uid ? accountStats.reviews : 0;

  // Load saved preferences from Firestore
  useEffect(() => {
    if (!user?.uid) return;
    getUserNotificationPreferences(user.uid).then((prefs) => {
      if (prefs) {
        if (typeof prefs.proximityAlerts === "boolean") setProximityAlerts(prefs.proximityAlerts);
        if (typeof prefs.merchantAlerts === "boolean") setMerchantAlerts(prefs.merchantAlerts);
        if (typeof prefs.dealAlerts === "boolean") setDealAlerts(prefs.dealAlerts);
      }
    });
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    const loadAccountStats = async () => {
      try {
        const [saved, reviews] = await Promise.all([
          getUserSavedCount(user.uid),
          getUserReviewCount(user.uid),
        ]);
        setAccountStats({ userId: user.uid, saved, reviews, error: false });
      } catch (error) {
        console.warn("[SettingsScreen] Failed to load account stats:", error);
        setAccountStats({
          userId: user.uid,
          saved: 0,
          reviews: 0,
          error: true,
        });
      }
    };

    loadAccountStats();
  }, [user?.uid]);

  const handleToggle = useCallback(
    (key: "proximityAlerts" | "merchantAlerts" | "dealAlerts") => {
      const newValue = !(
        key === "proximityAlerts"
          ? proximityAlerts
          : key === "merchantAlerts"
          ? merchantAlerts
          : dealAlerts
      );
      if (key === "proximityAlerts") setProximityAlerts(newValue);
      else if (key === "merchantAlerts") setMerchantAlerts(newValue);
      else setDealAlerts(newValue);

      // Persist to Firestore
      if (user?.uid) {
        const prefs = {
          proximityAlerts: key === "proximityAlerts" ? newValue : proximityAlerts,
          merchantAlerts: key === "merchantAlerts" ? newValue : merchantAlerts,
          dealAlerts: key === "dealAlerts" ? newValue : dealAlerts,
        };
        updateNotificationPreferences(user.uid, prefs);
      }
    },
    [proximityAlerts, merchantAlerts, dealAlerts, user]
  );

  const handleSignOut = async () => {
    await signOut();
    router.replace("/(auth)/signin");
  };

  const Toggle = ({
    value,
    onToggle,
  }: {
    value: boolean;
    onToggle: () => void;
  }) => (
    <TouchableOpacity
      onPress={onToggle}
      style={[
        styles.toggleTrack,
        value ? styles.toggleTrackActive : styles.toggleTrackInactive,
      ]}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.toggleThumb,
          value ? styles.toggleThumbActive : styles.toggleThumbInactive,
        ]}
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Card */}
          <ProfileCard
            roleBadgeText="Shopper"
            themeColor={Colors.teal[700]}
          />

          {/* Push Notifications Section */}
          <View style={styles.cardSection}>
            <Text style={styles.sectionTitle}>PUSH NOTIFICATIONS</Text>
            {[
              {
                label: "Proximity alerts",
                sub: "Notify when saved shops are nearby",
                value: proximityAlerts,
                onToggle: () => handleToggle("proximityAlerts"),
              },
              {
                label: "Merchant alerts",
                sub: "Updates from merchants you follow",
                value: merchantAlerts,
                onToggle: () => handleToggle("merchantAlerts"),
              },
              {
                label: "Deals & promotions",
                sub: "Flash sales and limited offers",
                value: dealAlerts,
                onToggle: () => handleToggle("dealAlerts"),
              },
            ].map((row, idx, arr) => (
              <View
                key={row.label}
                style={[
                  styles.notificationRow,
                  idx === arr.length - 1 && styles.rowLast,
                ]}
              >
                <View style={styles.notificationTextContainer}>
                  <Text style={styles.notificationLabel}>{row.label}</Text>
                  <Text style={styles.notificationSub}>{row.sub}</Text>
                </View>
                <Toggle value={row.value} onToggle={row.onToggle} />
              </View>
            ))}
          </View>

          {/* Account Section */}
          <View style={styles.cardSection}>
            <Text style={styles.sectionTitle}>ACCOUNT</Text>
            {[
              { label: "Email", value: user?.email || "Not available" },
              {
                label: "Member since",
                value: formatMemberSince(user?.createdAt),
              },
              {
                label: "Saved shops",
                value: accountStatsLoading ? "Loading…" : String(savedCount),
              },
              {
                label: "Reviews written",
                value: accountStatsLoading ? "Loading…" : String(reviewCount),
              },
              {
                label: "Default location",
                value: user?.location?.label || "Not set",
              },
            ].map((item, idx, arr) => (
              <View
                key={item.label}
                style={[
                  styles.accountDataRow,
                  idx === arr.length - 1 && styles.rowLast,
                ]}
              >
                <Text style={styles.accountRowLabel}>{item.label}</Text>
                <Text style={styles.accountValue} numberOfLines={1}>
                  {item.value}
                </Text>
              </View>
            ))}
            {accountStatsError && (
              <Text style={styles.accountStatsError}>
                Some account totals could not be loaded.
              </Text>
            )}
            {["Privacy & Data", "Help & Support", "About Locali"].map(
              (item, idx, arr) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.accountRow,
                    idx === arr.length - 1 && styles.rowLast,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.accountRowLabel}>{item}</Text>
                  <ChevronRight size={18} color={Colors.slate[400]} />
                </TouchableOpacity>
              )
            )}
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

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
    color: Colors.slate[900],
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  profileCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    borderColor: Colors.slate[100],
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    ...Shadows.sm,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.teal[100],
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.teal[800],
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.slate[900],
  },
  profileEmail: {
    fontSize: 13,
    color: Colors.slate[500],
    marginTop: 2,
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.teal[700],
  },
  cardSection: {
    backgroundColor: Colors.white,
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    borderColor: Colors.slate[100],
    overflow: "hidden",
    ...Shadows.sm,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.slate[400],
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  notificationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate[100],
  },
  notificationTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  notificationLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.slate[800],
  },
  notificationSub: {
    fontSize: 12,
    color: Colors.slate[500],
    marginTop: 2,
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: Radius.full,
    padding: 2,
    justifyContent: "center",
  },
  toggleTrackActive: {
    backgroundColor: Colors.teal[700],
  },
  toggleTrackInactive: {
    backgroundColor: Colors.slate[200],
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    ...Shadows.sm,
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },
  toggleThumbInactive: {
    alignSelf: "flex-start",
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate[100],
  },
  accountDataRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate[100],
  },
  accountValue: {
    color: Colors.slate[500],
    fontSize: 12,
    marginTop: 3,
  },
  accountStatsError: {
    color: Colors.rose[600],
    fontSize: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  accountRowLabel: {
    fontSize: 14,
    color: Colors.slate[700],
    fontWeight: "500",
  },
  signOutButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.rose[100],
    borderRadius: Radius["2xl"],
    paddingVertical: 15,
    alignItems: "center",
    ...Shadows.sm,
  },
  signOutText: {
    color: Colors.rose[500],
    fontSize: 14,
    fontWeight: "600",
  },
});
