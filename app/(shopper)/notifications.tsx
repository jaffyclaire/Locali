import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NOTIFICATIONS } from "../../src/data/mockData";
import { Colors, Radius, Shadows } from "../../src/constants/theme";

export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState<"Updates" | "Saved Deals">("Updates");

  const items = NOTIFICATIONS.filter((n) => n.tab === activeTab);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* Header & Tabs */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.tabsRow}>
            {(["Updates", "Saved Deals"] as const).map((t) => {
              const isActive = activeTab === t;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => setActiveTab(t)}
                  style={[styles.tabButton, isActive && styles.tabButtonActive]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.tabText, isActive && styles.tabTextActive]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {items.map((n) => (
            <View
              key={n.id}
              style={[
                styles.notificationCard,
                n.unread && styles.unreadCard,
              ]}
            >
              <View
                style={[
                  styles.iconCircle,
                  n.unread ? styles.iconCircleUnread : styles.iconCircleRead,
                ]}
              >
                <Text style={styles.notificationEmoji}>{n.icon}</Text>
              </View>

              <View style={styles.cardContent}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>{n.title}</Text>
                  {n.unread && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.cardBody}>{n.body}</Text>
                <Text style={styles.cardTime}>{n.time}</Text>
              </View>
            </View>
          ))}
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
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate[100],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.slate[900],
    marginBottom: 12,
  },
  tabsRow: {
    flexDirection: "row",
  },
  tabButton: {
    flex: 1,
    paddingBottom: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: Colors.transparent,
  },
  tabButtonActive: {
    borderBottomColor: Colors.teal[700],
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.slate[500],
  },
  tabTextActive: {
    color: Colors.teal[700],
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  notificationCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    borderColor: Colors.slate[100],
    padding: 16,
    flexDirection: "row",
    gap: 14,
    ...Shadows.sm,
  },
  unreadCard: {
    borderColor: Colors.teal[100],
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleUnread: {
    backgroundColor: Colors.teal[50],
  },
  iconCircleRead: {
    backgroundColor: Colors.slate[50],
  },
  notificationEmoji: {
    fontSize: 18,
  },
  cardContent: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.slate[900],
    lineHeight: 18,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.teal[700],
    marginTop: 4,
  },
  cardBody: {
    fontSize: 12,
    color: Colors.slate[500],
    lineHeight: 16,
    marginTop: 3,
  },
  cardTime: {
    fontSize: 11,
    color: Colors.slate[400],
    marginTop: 6,
  },
});

