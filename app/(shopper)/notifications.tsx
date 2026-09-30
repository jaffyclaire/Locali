import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NotificationItem, MapMerchant, Merchant } from "../../src/types";
import { Colors, Radius, Shadows } from "../../src/constants/theme";
import {
  fetchUserNotifications,
  fetchSavedMerchantsWithDetails,
} from "../../src/services/firestoreService";
import { useAuthRole } from "../../src/context/AuthRoleContext";
import { StarIcon, BookmarkIcon } from "../../src/components/icons/AppIcons";
import { MerchantSheet } from "../../src/components/common/MerchantSheet";

export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState<"Updates" | "Saved Deals">("Updates");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [savedMerchants, setSavedMerchants] = useState<MapMerchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedLoading, setSavedLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const { user } = useAuthRole();

  const loadNotifications = useCallback(async () => {
    if (!user?.uid) {
      console.log("[NotificationsScreen] No user uid — skipping fetch");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchUserNotifications(user.uid);
      console.log("[NotificationsScreen] Fetched notifications:", data.length);
      setNotifications(data);
    } catch (error) {
      console.error("[NotificationsScreen] Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  const loadSavedMerchants = useCallback(async () => {
    if (!user?.uid) {
      setSavedLoading(false);
      return;
    }
    setSavedLoading(true);
    try {
      const data = await fetchSavedMerchantsWithDetails(user.uid);
      setSavedMerchants(data);
    } catch (error) {
      console.error("[NotificationsScreen] Error loading saved merchants:", error);
    } finally {
      setSavedLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (activeTab === "Saved Deals") {
      loadSavedMerchants();
    }
  }, [activeTab, loadSavedMerchants]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === "Saved Deals") {
      await loadSavedMerchants();
    } else {
      await loadNotifications();
    }
    setRefreshing(false);
  };

  const updateItems = notifications.filter((n) => n.tab === "Updates");

  console.log("[NotificationsScreen] loading:", loading, "notifications:", notifications.length, "filtered:", updateItems.length);

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

        {/* Content List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.teal[700]}
              colors={[Colors.teal[700]]}
            />
          }
        >
          {activeTab === "Updates" ? (
            /* ── UPDATES TAB ── */
            loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={Colors.teal[700]} />
                <Text style={styles.loadingText}>Loading updates…</Text>
              </View>
            ) : updateItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>🔔</Text>
                <Text style={styles.emptyTitle}>No updates yet</Text>
                <Text style={styles.emptySub}>
                  You're all caught up! Updates about local deals and community alerts will appear here.
                </Text>
              </View>
            ) : (
              updateItems.map((n) => (
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
              ))
            )
          ) : (
            /* ── SAVED DEALS (SAVED MERCHANTS) TAB ── */
            savedLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={Colors.teal[700]} />
                <Text style={styles.loadingText}>Loading saved businesses…</Text>
              </View>
            ) : savedMerchants.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>⭐</Text>
                <Text style={styles.emptyTitle}>No saved businesses yet</Text>
                <Text style={styles.emptySub}>
                  Tap the bookmark star icon on any business info card in Discover or Home to save it here for fast access!
                </Text>
              </View>
            ) : (
              savedMerchants.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={styles.savedCard}
                  onPress={() => setSelectedMerchant(m)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: m.img }}
                    style={styles.savedAvatar}
                    resizeMode="cover"
                  />
                  <View style={styles.savedBody}>
                    <View style={styles.savedTitleRow}>
                      <Text style={styles.savedName} numberOfLines={1}>
                        {m.name}
                      </Text>
                      <BookmarkIcon size={18} active={true} color={Colors.amber[500]} />
                    </View>

                    <Text style={styles.savedCategory}>
                      {m.category} · {m.distance || "Nearby"}
                    </Text>

                    <View style={styles.savedMetaRow}>
                      <View
                        style={[
                          styles.statusBadge,
                          m.isOpen ? styles.openBadge : styles.closedBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            m.isOpen ? styles.openText : styles.closedText,
                          ]}
                        >
                          {m.isOpen ? "Open" : "Closed"}
                        </Text>
                      </View>

                      <View style={styles.ratingBadge}>
                        <StarIcon size={12} color={Colors.amber[500]} />
                        <Text style={styles.ratingText}>
                          {m.rating > 0 ? `${m.rating} (${m.reviews})` : "No rating"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )
          )}
          <View style={{ height: 32 }} />
        </ScrollView>

        {/* Merchant info sheet when tapping saved business */}
        <MerchantSheet
          merchant={selectedMerchant}
          visible={!!selectedMerchant}
          onClose={() => {
            setSelectedMerchant(null);
            loadSavedMerchants();
          }}
        />
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
  loadingBox: {
    paddingVertical: 48,
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.slate[500],
  },
  emptyContainer: {
    paddingVertical: 50,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.slate[800],
  },
  emptySub: {
    fontSize: 13,
    color: Colors.slate[500],
    textAlign: "center",
    lineHeight: 18,
  },
  savedCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.slate[100],
    ...Shadows.sm,
  },
  savedAvatar: {
    width: 60,
    height: 60,
    borderRadius: Radius.lg,
    backgroundColor: Colors.slate[100],
  },
  savedBody: {
    flex: 1,
  },
  savedTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  savedName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.slate[900],
    flex: 1,
    paddingRight: 6,
  },
  savedCategory: {
    fontSize: 12,
    color: Colors.slate[500],
    marginBottom: 6,
  },
  savedMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  openBadge: {
    backgroundColor: Colors.emerald[50],
  },
  closedBadge: {
    backgroundColor: Colors.slate[100],
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  openText: {
    color: Colors.emerald[700],
  },
  closedText: {
    color: Colors.slate[500],
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    color: Colors.slate[500],
  },
});
