import React, { useState } from "react";
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

export default function MerchantAccountScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthRole();

  const [proximityAlerts, setProximityAlerts] = useState(true);
  const [merchantAlerts, setMerchantAlerts] = useState(true);
  const [dealAlerts, setDealAlerts] = useState(false);

  const handleSignOut = () => {
    signOut();
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
          <Text style={styles.headerTitle}>Account</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Card */}
          <ProfileCard
            roleBadgeText="Merchant Owner"
            themeColor={Colors.teal[700]}
          />

          {/* Push Notifications Section */}
          <View style={styles.cardSection}>
            <Text style={styles.sectionTitle}>PUSH NOTIFICATIONS</Text>
            {[
              {
                label: "Customer check-in alerts",
                sub: "Notify when shoppers visit your listing",
                value: proximityAlerts,
                onToggle: () => setProximityAlerts((v) => !v),
              },
              {
                label: "Customer flag reports",
                sub: "Alerts when shoppers report incorrect hours",
                value: merchantAlerts,
                onToggle: () => setMerchantAlerts((v) => !v),
              },
              {
                label: "Weekly performance recap",
                sub: "Views, discovery, and directions summaries",
                value: dealAlerts,
                onToggle: () => setDealAlerts((v) => !v),
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
            <Text style={styles.sectionTitle}>BUSINESS & ACCOUNT</Text>
            {[
              "Business Verification & KYC",
              "Payouts & Billing",
              "Privacy & Data",
              "Merchant Support",
              "Terms of Service",
            ].map((item, idx, arr) => (
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
            ))}
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
    color: Colors.slate[800],
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
    backgroundColor: Colors.teal[50],
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.teal[700],
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
    marginTop: 1,
  },
  merchantRoleBadge: {
    fontSize: 11,
    color: Colors.teal[700],
    fontWeight: "600",
    marginTop: 3,
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

